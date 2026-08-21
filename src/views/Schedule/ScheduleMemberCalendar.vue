<template>
    <div class="mc-root">
        <div class="mc-controls">
            <div class="mc-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(-1)">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="mc-label">{{ monthLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(1)">
                    <mdicon name="chevron-right" size="16" />
                </button>
            </div>
            <!-- Managers can look at anyone; staff only ever have themselves,
                 so the picker is hidden rather than showing a list of one. -->
            <select v-if="canPickMember" v-model="selectedMemberId" class="mc-select">
                <option v-for="m in members" :key="m.storeMemberId" :value="m.storeMemberId">
                    {{ m.name }}
                </option>
            </select>
        </div>

        <div v-if="loadError" class="load-error">
            <mdicon name="alert-circle-outline" size="28" />
            <p>{{ loadError }}</p>
            <button class="secondary-button button-compact" @click="load">
                <mdicon name="refresh" size="16" /> Retry
            </button>
        </div>

        <SkeletonLoader v-else-if="isLoading" :rows="4" label="Loading calendar…" />

        <div v-else-if="!calendar" class="mc-empty">
            <mdicon name="calendar-blank" size="32" />
            <p>Nothing scheduled in {{ monthLabel }}.</p>
        </div>

        <div v-else class="mc-calendar">
            <div class="mc-weekday" v-for="(label, i) in weekdayLabels" :key="label" :class="{ 'mc-weekday--end': i === 0 || i === 6 }">
                {{ label }}
            </div>

            <div v-for="blank in leadingBlanks" :key="`blank-${blank}`" class="mc-day mc-day--blank"></div>

            <div
                v-for="cell in cells"
                :key="cell.date"
                class="mc-day"
                :class="{
                    'mc-day--rd': cell.day?.isRestDay,
                    'mc-day--empty': !cell.day,
                    'mc-day--draft': cell.day?.isDraft,
                    'mc-day--today': cell.date === today,
                }"
                :title="cell.day?.isDraft ? 'Draft — not yet visible to staff' : cell.day?.presetLabel ?? ''"
            >
                <div class="mc-daynum">{{ cell.dayOfMonth }}</div>
                <div v-if="cell.day?.isRestDay" class="mc-rd">RD</div>
                <div v-else-if="cell.day" class="mc-shift">
                    <mdicon
                        v-for="glyph in glyphsFor(cell.day.icon)"
                        :key="glyph.name"
                        :name="glyph.name"
                        :style="{ color: glyph.color }"
                        size="13"
                        aria-hidden="true"
                    />
                    <span>{{ formatShiftRange(cell.day.startMinute, cell.day.endMinute) }}</span>
                </div>
            </div>
        </div>

        <div v-if="calendar" class="mc-legend">
            <span class="mc-legend-item"><span class="mc-swatch mc-swatch--rd"></span> Rest day</span>
            <span v-if="hasDrafts" class="mc-legend-item"><span class="mc-swatch mc-swatch--draft"></span> Draft (not yet published)</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { type MemberMonth, type ScheduleMember, getMemberMonth } from '@/api/schedule';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { glyphsFor } from '@/utils/shiftIcons';
import { formatShiftRange, todayLocal, toUtcDateString } from '@/utils/shiftTime';

const props = defineProps<{
    storeId: string;
    members: ScheduleMember[];
    ownMemberId: string | null;
    canPickMember: boolean;
}>();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const calendar = ref<MemberMonth | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const selectedMemberId = ref<string>('');

// Local, not UTC: this drives the today-highlight.
const today = todayLocal();
const weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const monthLabel = computed(() =>
    new Date(Date.UTC(year.value, month.value - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
);

// Blank cells so the 1st lands under its real weekday.
const leadingBlanks = computed(() => {
    const firstDay = new Date(Date.UTC(year.value, month.value - 1, 1)).getUTCDay();
    return Array.from({ length: firstDay }, (_, i) => i);
});

const cells = computed(() => {
    const daysInMonth = new Date(Date.UTC(year.value, month.value, 0)).getUTCDate();
    const byDate = new Map((calendar.value?.days ?? []).map((d) => [d.date, d]));
    return Array.from({ length: daysInMonth }, (_, i) => {
        const date = toUtcDateString(new Date(Date.UTC(year.value, month.value - 1, i + 1)));
        return { date, dayOfMonth: i + 1, day: byDate.get(date) ?? null };
    });
});

const hasDrafts = computed(() => (calendar.value?.days ?? []).some((d) => d.isDraft));

const load = async () => {
    if (!props.storeId || !selectedMemberId.value) return;
    isLoading.value = true;
    loadError.value = null;
    try {
        const { calendar: loaded } = await getMemberMonth(
            props.storeId,
            selectedMemberId.value,
            year.value,
            month.value
        );
        calendar.value = loaded;
    } catch (err) {
        const body = (err as { body?: { message?: string } } | null)?.body;
        loadError.value = body?.message || 'Could not load the calendar. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

const goMonth = (delta: number) => {
    const next = new Date(Date.UTC(year.value, month.value - 1 + delta, 1));
    year.value = next.getUTCFullYear();
    month.value = next.getUTCMonth() + 1;
};

// Default to the viewer's own row when they are schedulable staff. Owners are
// excluded from the staff list, so they fall through to the first staff member
// rather than selecting an id the dropdown doesn't contain.
const pickDefaultMember = () => {
    // The parent hands back a fresh `members` array on every fetch, so this
    // runs on any refresh. Keep the manager's current selection if it is still
    // in the list — otherwise a pull-to-refresh snaps them back to member[0]
    // and silently loads a different person's calendar.
    const current = selectedMemberId.value;
    if (current && props.members.some((m) => m.storeMemberId === current)) return;

    const own = props.ownMemberId;
    const ownIsListed = own !== null && props.members.some((m) => m.storeMemberId === own);
    selectedMemberId.value = (ownIsListed ? own : props.members[0]?.storeMemberId) ?? '';
};

watch(() => [props.ownMemberId, props.members], pickDefaultMember, { immediate: true });
// storeId is included so a store switch reloads even if the selected member id
// happens to carry over.
watch([year, month, selectedMemberId, () => props.storeId], load);
onMounted(load);
</script>

<style lang="scss" scoped>
.load-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1rem;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 0.5rem;
}

.mc-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}

.mc-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mc-label {
    font-weight: 600;
    min-width: 10rem;
    text-align: center;
}

.mc-select {
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    background: var(--surface, #fff);
    color: inherit;
    max-width: 16rem;
}

.mc-calendar {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 2px;
    background: var(--border-color, #e5e7eb);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
}

.mc-weekday {
    background: var(--surface-alt, #f9fafb);
    text-align: center;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.35rem 0.2rem;
    color: var(--text-muted, #6b7280);
}

.mc-weekday--end {
    color: #b91c1c;
}

.mc-day {
    background: var(--surface, #fff);
    min-height: 4.2rem;
    padding: 0.3rem 0.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.mc-day--blank {
    background: var(--surface-alt, #f9fafb);
}

.mc-day--today {
    box-shadow: inset 0 0 0 2px #3b82f6;
}

.mc-day--draft {
    background: repeating-linear-gradient(
        45deg,
        #fff,
        #fff 6px,
        rgba(0, 0, 0, 0.03) 6px,
        rgba(0, 0, 0, 0.03) 12px
    );
}

.mc-daynum {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted, #6b7280);
}

.mc-shift {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex-wrap: wrap;
    font-size: 0.72rem;
    line-height: 1.2;
}

.mc-rd {
    color: #dc2626;
    font-weight: 700;
    font-size: 0.78rem;
}

.mc-legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
    font-size: 0.75rem;
    color: var(--text-muted, #6b7280);
}

.mc-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
}

.mc-swatch {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 0.2rem;
    border: 1px solid var(--border-color, #e5e7eb);
    display: inline-block;
}

.mc-swatch--rd {
    background: #fee2e2;
}

.mc-swatch--draft {
    background: repeating-linear-gradient(45deg, #fff, #fff 3px, rgba(0, 0, 0, 0.12) 3px, rgba(0, 0, 0, 0.12) 6px);
}

@media (max-width: 640px) {
    .mc-day {
        min-height: 3.1rem;
        padding: 0.2rem 0.15rem;
    }

    .mc-shift {
        font-size: 0.58rem;
        line-height: 1.15;
        gap: 0.1rem;
        justify-content: center;
    }

    .mc-daynum {
        font-size: 0.62rem;
    }

    .mc-rd {
        font-size: 0.68rem;
        text-align: center;
    }

    .mc-weekday {
        font-size: 0.58rem;
        padding: 0.25rem 0.1rem;
    }

    .mc-controls {
        gap: 0.5rem;
    }

    .mc-label {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 0.9rem;
    }

    .mc-select {
        max-width: none;
        width: 100%;
    }
}

.mc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1rem;
    color: var(--text-muted, #6b7280);
    border: 1px dashed var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
}
</style>
