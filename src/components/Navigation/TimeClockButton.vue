<template>
    <div v-if="isVisible" class="tc">
        <button
            type="button"
            class="tc__btn"
            :class="{ 'tc__btn--in': isClockedIn, 'tc__btn--busy': isBusy }"
            :disabled="isBusy"
            :title="tooltip"
            @click="onClick"
        >
            <mdicon :name="isClockedIn ? 'timer-sand' : 'timer-play-outline'" size="16" />
            <span class="tc__label">
                <template v-if="isClockedIn">
                    <span class="tc__elapsed">{{ elapsedLabel }}</span>
                    <span class="tc__since">since {{ formatMinute(state!.openEntry!.inMinute) }}</span>
                </template>
                <template v-else>Time In</template>
            </span>
        </button>

        <!-- Timing out ends a shift and writes the payroll record, so it is
             confirmed rather than fired on a single tap. -->
        <ConfirmModal
            :show="isConfirmingOut"
            title="Time out?"
            :message="confirmMessage"
            confirm-text="Time out"
            @confirm="doClockOut"
            @cancel="isConfirmingOut = false"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { formatMinute } from '@/utils/shiftTime';
import { clockIn, clockOut, getMyAttendance, type MyAttendance } from '@/api/attendance';

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const state = ref<MyAttendance | null>(null);
const isBusy = ref(false);
const isConfirmingOut = ref(false);
const now = ref(Date.now());
// The store's clock minus this device's, so a phone with a skewed clock still
// shows the elapsed time the backend will record.
const clockSkewMs = ref(0);

let ticker: ReturnType<typeof setInterval> | null = null;

const storeId = computed(() => storeContext.currentStoreId ?? '');
const role = computed(() => storeContext.currentStore?.role ?? '');

// The owner runs the store rather than working a rostered shift — the same
// reason they're left out of the schedulable-staff list. Admins do work shifts.
const isVisible = computed(() => Boolean(storeId.value) && role.value !== '' && role.value !== 'OWNER' && state.value !== null);

const isClockedIn = computed(() => Boolean(state.value?.openEntry));

const elapsedMinutes = computed(() => {
    const entry = state.value?.openEntry;
    if (!entry) return 0;
    const started = new Date(entry.clockInAt).getTime();
    return Math.max(0, Math.floor((now.value + clockSkewMs.value - started) / 60000));
});

const elapsedLabel = computed(() => {
    const hours = Math.floor(elapsedMinutes.value / 60);
    const mins = elapsedMinutes.value % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
});

const shiftLabel = computed(() => {
    const shift = state.value?.shift;
    if (!shift || shift.isRestDay || shift.startMinute === null || shift.endMinute === null) return null;
    return `${formatMinute(shift.startMinute)} - ${formatMinute(shift.endMinute)}`;
});

const tooltip = computed(() => {
    if (isClockedIn.value) return `Timed in — tap to time out${shiftLabel.value ? ` (rostered ${shiftLabel.value})` : ''}`;
    if (state.value?.shift?.isRestDay) return 'Rest day — timing in will be flagged as unscheduled';
    return shiftLabel.value ? `Rostered ${shiftLabel.value} today` : 'No shift rostered today';
});

const confirmMessage = computed(() => {
    const worked = `You have been timed in for ${elapsedLabel.value}.`;
    if (!shiftLabel.value) return `${worked} This will close the entry.`;
    return `${worked} Your shift today is ${shiftLabel.value}. This will close the entry.`;
});

const load = async (silent = true) => {
    if (!storeId.value) {
        state.value = null;
        return;
    }
    try {
        const { attendance } = await getMyAttendance(storeId.value, silent);
        state.value = attendance;
        clockSkewMs.value = new Date(attendance.serverTime).getTime() - Date.now();
    } catch {
        // A viewer without a membership row, or an offline device — the button
        // simply stays hidden rather than shouting at someone mid-shift.
        state.value = null;
    }
};

const onClick = () => {
    if (isClockedIn.value) {
        isConfirmingOut.value = true;
        return;
    }
    doClockIn();
};

const doClockIn = async () => {
    if (isBusy.value || !storeId.value) return;
    isBusy.value = true;
    try {
        const { attendance } = await clockIn(storeId.value);
        state.value = attendance;
        const late = attendance.reconciliation.lateMinutes;
        showToast(late > 0 ? `Timed in — ${late} min late` : 'Timed in', late > 0 ? 'info' : 'success');
    } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not time in', 'error');
        await load();
    } finally {
        isBusy.value = false;
    }
};

const doClockOut = async () => {
    isConfirmingOut.value = false;
    if (isBusy.value || !storeId.value) return;
    isBusy.value = true;
    try {
        const { attendance } = await clockOut(storeId.value);
        const hours = (attendance.reconciliation.actualMinutes / 60).toFixed(2);
        state.value = attendance;
        showToast(`Timed out — ${hours}h recorded today`);
    } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not time out', 'error');
        await load();
    } finally {
        isBusy.value = false;
    }
};

// A minute is the finest granularity the label shows, so this is the slowest
// tick that keeps it honest.
const startTicker = () => {
    stopTicker();
    ticker = setInterval(() => {
        now.value = Date.now();
    }, 30000);
};

const stopTicker = () => {
    if (ticker) clearInterval(ticker);
    ticker = null;
};

// A shift left open overnight, or a punch made on another device, would
// otherwise show a stale label until a reload.
const onFocus = () => {
    now.value = Date.now();
    load();
};

onMounted(() => {
    load();
    startTicker();
    window.addEventListener('focus', onFocus);
});

onBeforeUnmount(() => {
    stopTicker();
    window.removeEventListener('focus', onFocus);
});

watch(storeId, () => load());
</script>

<style scoped>
.tc {
    display: inline-flex;
}

.tc__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.32rem 0.7rem;
    border-radius: 8px;
    border: 1px solid rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.12);
    color: #6ee7b7;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
}

.tc__btn:hover:not(:disabled) {
    background: rgba(52, 211, 153, 0.2);
}

/* Timed in reads as "running", not as an invitation to press again. */
.tc__btn--in {
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.12);
    color: #fcd34d;
}

.tc__btn--in:hover:not(:disabled) {
    background: rgba(251, 191, 36, 0.2);
}

.tc__btn--busy,
.tc__btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.tc__label {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
}

.tc__since {
    font-weight: 500;
    opacity: 0.75;
    font-size: 0.7rem;
}

/* On a phone the bar is tight: keep the running total, drop the start time. */
@media (max-width: 640px) {
    .tc__since {
        display: none;
    }
}
</style>
