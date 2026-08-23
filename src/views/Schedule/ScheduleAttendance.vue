<template>
    <div class="at-root">
        <div class="at-controls">
            <div class="at-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="goWeek(-1)">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="at-label">{{ weekLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="goWeek(1)">
                    <mdicon name="chevron-right" size="16" />
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="goThisWeek">This week</button>
            </div>
            <p class="at-hint">
                Actual time in/out beside the roster.
                <template v-if="canEdit">Click a day to correct a punch.</template>
            </p>
        </div>

        <div v-if="loadError" class="load-error">
            <mdicon name="alert-circle-outline" size="28" />
            <p>{{ loadError }}</p>
            <button class="secondary-button button-compact" @click="load">
                <mdicon name="refresh" size="16" /> Retry
            </button>
        </div>

        <SkeletonLoader v-else-if="isLoading" :rows="4" label="Loading attendance…" />

        <div v-else-if="rows.length === 0" class="at-empty">
            <mdicon name="clock-outline" size="32" />
            <p>No staff to show for this week.</p>
        </div>

        <div v-else class="at-table-wrap">
            <table class="at-table">
                <thead>
                    <tr>
                        <th class="at-col-name">Staff</th>
                        <th v-for="(date, i) in dates" :key="date" :class="{ 'at-today': date === today }">
                            <span class="at-dow">{{ dayLabel(i).slice(0, 3) }}</span>
                            <span class="at-date">{{ shortDate(date) }}</span>
                        </th>
                        <th class="at-col-num">Sched</th>
                        <th class="at-col-num">Actual</th>
                        <th class="at-col-num">Diff</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in rows" :key="row.storeMemberId">
                        <td class="at-col-name">
                            <span class="at-name">{{ row.name }}</span>
                            <span v-if="row.totals.lateMinutes > 0" class="at-late-chip">
                                {{ row.totals.lateMinutes }}m late
                            </span>
                        </td>

                        <td
                            v-for="day in row.days"
                            :key="day.date"
                            class="at-cell"
                            :class="[`at-cell--${day.status.toLowerCase().replace('_', '-')}`, { 'at-cell--editable': canEdit }]"
                            :title="cellTitle(day)"
                            @click="canEdit && openEditor(row, day)"
                        >
                            <span class="at-planned">{{ plannedLabel(day) }}</span>
                            <span class="at-actual">{{ actualLabel(day) }}</span>
                            <span v-if="day.lateMinutes > 0" class="at-flag">+{{ day.lateMinutes }}m</span>
                        </td>

                        <td class="at-col-num">{{ hours(row.totals.scheduledMinutes) }}</td>
                        <td class="at-col-num at-strong">{{ hours(row.totals.actualMinutes) }}</td>
                        <td class="at-col-num" :class="varianceClass(row.totals.varianceMinutes)">
                            {{ signedHours(row.totals.varianceMinutes) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="rows.length > 0" class="at-legend">
            <span class="at-legend-item"><span class="at-swatch at-swatch--on-time"></span> On time</span>
            <span class="at-legend-item"><span class="at-swatch at-swatch--late"></span> Late</span>
            <span class="at-legend-item"><span class="at-swatch at-swatch--undertime"></span> Short of the roster</span>
            <span class="at-legend-item"><span class="at-swatch at-swatch--overtime"></span> Beyond the roster</span>
            <span class="at-legend-item"><span class="at-swatch at-swatch--absent"></span> Rostered, no punch</span>
        </div>

        <!-- Correction editor. Times are the store's local clock; an overnight
             punch-out is entered as the next-day time and stored past 1440. -->
        <Modal v-if="editor" width="34rem" @close="editor = null">
            <div class="at-modal">
                <h2 class="at-modal-title">{{ editor.rowName }} — {{ shortDate(editor.date) }}</h2>
                <p class="at-modal-sub">
                    <template v-if="editor.planned">Rostered {{ editor.planned }}</template>
                    <template v-else>No shift rostered this day</template>
                </p>

                <table class="at-mini-table">
                    <thead>
                        <tr>
                            <th>Time in</th>
                            <th>Time out</th>
                            <th>Note</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, index) in editor.entries" :key="entry.id ?? `new-${index}`">
                            <td><input v-model="entry.inValue" type="time" class="at-input" /></td>
                            <td>
                                <input v-model="entry.outValue" type="time" class="at-input" />
                                <label class="at-overnight" title="Time out falls on the next day">
                                    <input v-model="entry.nextDay" type="checkbox" /> +1d
                                </label>
                            </td>
                            <td><input v-model="entry.note" type="text" class="at-input" maxlength="500" /></td>
                            <td>
                                <button class="at-icon-btn" title="Remove" @click="removeEntry(index)">
                                    <mdicon name="trash-can-outline" size="16" />
                                </button>
                            </td>
                        </tr>
                        <tr v-if="editor.entries.length === 0">
                            <td colspan="4" class="at-modal-empty">Nothing recorded for this day.</td>
                        </tr>
                    </tbody>
                </table>

                <div class="at-modal-actions">
                    <button class="secondary-button button-compact" @click="addEntry">
                        <mdicon name="plus" size="16" /> Add entry
                    </button>
                    <div class="at-modal-right">
                        <button class="secondary-button button-compact" @click="editor = null">Cancel</button>
                        <button class="primary-button button-compact" :disabled="isSaving" @click="saveEditor">
                            {{ isSaving ? 'Saving…' : 'Save' }}
                        </button>
                    </div>
                </div>

                <p v-if="editorError" class="at-modal-error">{{ editorError }}</p>
            </div>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Modal from '@/components/Modal.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { useToast } from '@/composables/useToast';
import {
    createTimeEntry,
    deleteTimeEntry,
    listAttendance,
    updateTimeEntry,
    type AttendanceDay,
    type AttendanceRow,
} from '@/api/attendance';
import {
    addDays,
    currentWeekStart,
    dayLabel,
    formatMinute,
    formatShiftRange,
    formatWeekRange,
    parseTimeInput,
    shortDate,
    todayLocal,
    toTimeInput,
    weekStartOf,
    MINUTES_IN_DAY,
} from '@/utils/shiftTime';

const props = defineProps<{
    storeId: string;
    // Sunday the parent grid is showing, so switching tabs keeps the same week.
    weekStart: string;
}>();

const { showToast } = useToast();

const weekStart = ref(props.weekStart || currentWeekStart());
const rows = ref<AttendanceRow[]>([]);
const canEdit = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const editorError = ref<string | null>(null);

const today = todayLocal();

type EditorEntry = {
    id: string | null;
    inValue: string;
    outValue: string;
    nextDay: boolean;
    note: string;
};

const editor = ref<{
    storeMemberId: string;
    rowName: string;
    date: string;
    planned: string;
    entries: EditorEntry[];
    removedIds: string[];
} | null>(null);

const dates = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)));
const weekLabel = computed(() => formatWeekRange(weekStart.value));

const hours = (minutes: number) => (minutes / 60).toFixed(2);
const signedHours = (minutes: number) => `${minutes > 0 ? '+' : ''}${(minutes / 60).toFixed(2)}`;

const varianceClass = (minutes: number) => {
    if (minutes > 0) return 'at-pos';
    if (minutes < 0) return 'at-neg';
    return '';
};

const plannedLabel = (day: AttendanceDay) => {
    if (day.scheduleHidden) return '—';
    if (!day.shift) return '';
    if (day.shift.isRestDay) return 'RD';
    return formatShiftRange(day.shift.startMinute, day.shift.endMinute);
};

const actualLabel = (day: AttendanceDay) => {
    if (day.entries.length === 0) return day.status === 'ABSENT' ? 'no punch' : '';
    const first = day.entries[0];
    const last = day.entries[day.entries.length - 1];
    if (last.outMinute === null) return `${formatMinute(first.inMinute)} →`;
    return `${formatMinute(first.inMinute)} - ${formatMinute(last.outMinute)}`;
};

const STATUS_TEXT: Record<AttendanceDay['status'], string> = {
    OPEN: 'Still timed in',
    ABSENT: 'Rostered but never timed in',
    SCHEDULED: 'Rostered — not yet worked',
    UNSCHEDULED: 'Worked without a rostered shift',
    LATE: 'Timed in late',
    UNDERTIME: 'Short of the rostered hours',
    OVERTIME: 'Beyond the rostered hours',
    ON_TIME: 'Matches the roster',
    REST_DAY: 'Rest day',
};

const cellTitle = (day: AttendanceDay) => {
    if (day.scheduleHidden) return 'This week is still a draft';
    const parts = [STATUS_TEXT[day.status]];
    if (day.actualMinutes > 0) parts.push(`${hours(day.actualMinutes)}h worked`);
    if (day.lateMinutes > 0) parts.push(`${day.lateMinutes} min late`);
    if (day.earlyOutMinutes > 0) parts.push(`left ${day.earlyOutMinutes} min early`);
    return parts.join(' · ');
};

const load = async () => {
    if (!props.storeId) return;
    isLoading.value = true;
    loadError.value = null;
    try {
        const { attendance } = await listAttendance(props.storeId, weekStart.value, addDays(weekStart.value, 6));
        rows.value = attendance.rows;
        canEdit.value = attendance.canEdit;
    } catch (error) {
        loadError.value = error instanceof Error ? error.message : 'Could not load attendance';
    } finally {
        isLoading.value = false;
    }
};

const goWeek = (delta: number) => {
    weekStart.value = addDays(weekStart.value, delta * 7);
    load();
};

const goThisWeek = () => {
    weekStart.value = currentWeekStart();
    load();
};

const openEditor = (row: AttendanceRow, day: AttendanceDay) => {
    editorError.value = null;
    editor.value = {
        storeMemberId: row.storeMemberId,
        rowName: row.name,
        date: day.date,
        planned: day.shift && !day.shift.isRestDay
            ? formatShiftRange(day.shift.startMinute, day.shift.endMinute)
            : '',
        entries: day.entries.map((entry) => ({
            id: entry.id,
            inValue: toTimeInput(entry.inMinute),
            outValue: entry.outMinute === null ? '' : toTimeInput(entry.outMinute),
            // An out time past midnight was stored past 1440; show the checkbox
            // ticked so saving round-trips to the same minute.
            nextDay: entry.outMinute !== null && entry.outMinute >= MINUTES_IN_DAY,
            note: entry.note ?? '',
        })),
        removedIds: [],
    };
};

const addEntry = () => {
    if (!editor.value) return;
    editor.value.entries.push({ id: null, inValue: '', outValue: '', nextDay: false, note: '' });
};

const removeEntry = (index: number) => {
    if (!editor.value) return;
    const [removed] = editor.value.entries.splice(index, 1);
    if (removed?.id) editor.value.removedIds.push(removed.id);
};

const saveEditor = async () => {
    const current = editor.value;
    if (!current || isSaving.value) return;

    const payloads: { id: string | null; clockInMinute: number; clockOutMinute: number | null; note: string | null }[] = [];
    for (const entry of current.entries) {
        const inMinute = parseTimeInput(entry.inValue);
        if (inMinute === null) {
            editorError.value = 'Every entry needs a time in.';
            return;
        }
        const parsedOut = entry.outValue ? parseTimeInput(entry.outValue) : null;
        if (entry.outValue && parsedOut === null) {
            editorError.value = 'Time out is not a valid time.';
            return;
        }
        const outMinute = parsedOut === null ? null : parsedOut + (entry.nextDay ? MINUTES_IN_DAY : 0);
        if (outMinute !== null && outMinute <= inMinute) {
            editorError.value = 'Time out must be after time in — tick +1d for an overnight shift.';
            return;
        }
        payloads.push({ id: entry.id, clockInMinute: inMinute, clockOutMinute: outMinute, note: entry.note || null });
    }

    isSaving.value = true;
    editorError.value = null;
    try {
        for (const id of current.removedIds) {
            await deleteTimeEntry(props.storeId, id);
        }
        for (const payload of payloads) {
            const body = {
                storeMemberId: current.storeMemberId,
                workDate: current.date,
                clockInMinute: payload.clockInMinute,
                clockOutMinute: payload.clockOutMinute,
                note: payload.note,
            };
            if (payload.id) {
                await updateTimeEntry(props.storeId, payload.id, body);
            } else {
                await createTimeEntry(props.storeId, body);
            }
        }
        editor.value = null;
        showToast('Attendance updated');
        await load();
    } catch (error) {
        editorError.value = error instanceof Error ? error.message : 'Could not save the correction';
    } finally {
        isSaving.value = false;
    }
};

// Following the parent's week keeps "Week" and "Attendance" describing the same
// seven days when the owner switches tabs.
watch(
    () => props.weekStart,
    (value) => {
        if (!value) return;
        const snapped = weekStartOf(value);
        if (snapped === weekStart.value) return;
        weekStart.value = snapped;
        load();
    }
);

watch(() => props.storeId, load);

onMounted(load);
</script>

<style scoped>
.at-root {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.at-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.at-nav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.at-label {
    font-weight: 600;
    font-size: 0.9rem;
    min-width: 11rem;
    text-align: center;
}

.at-hint {
    margin: 0;
    font-size: 0.78rem;
    color: #6b7280;
}

.at-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    color: #6b7280;
}

/* The week is wider than a phone; scroll the table, never the page. */
.at-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
}

.at-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}

.at-table th,
.at-table td {
    border-bottom: 1px solid #f1f2f4;
    border-right: 1px solid #f1f2f4;
    padding: 0.4rem 0.5rem;
    text-align: center;
    vertical-align: middle;
}

.at-table thead th {
    background: #f9fafb;
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    color: #4b5563;
    text-transform: uppercase;
    white-space: nowrap;
}

.at-dow {
    display: block;
    font-weight: 700;
}

.at-date {
    display: block;
    font-weight: 500;
    opacity: 0.7;
}

.at-today {
    background: #eef2ff;
}

.at-col-name {
    text-align: left;
    white-space: nowrap;
    position: sticky;
    left: 0;
    background: #fff;
    z-index: 1;
}

thead .at-col-name {
    background: #f9fafb;
}

.at-name {
    font-weight: 600;
}

.at-late-chip {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0.05rem 0.35rem;
    border-radius: 6px;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.68rem;
    font-weight: 600;
}

.at-col-num {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.at-strong {
    font-weight: 700;
}

.at-pos {
    color: #047857;
}

.at-neg {
    color: #b91c1c;
}

.at-cell {
    min-width: 6.5rem;
    line-height: 1.25;
}

.at-cell--editable {
    cursor: pointer;
}

.at-cell--editable:hover {
    outline: 2px solid #c7d2fe;
    outline-offset: -2px;
}

.at-planned {
    display: block;
    font-size: 0.68rem;
    color: #6b7280;
}

.at-actual {
    display: block;
    font-weight: 600;
    font-size: 0.75rem;
}

.at-flag {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    color: #b45309;
}

/* Status tints. Colour is a second signal only — every cell also prints the
   planned and actual times, so nothing rests on hue alone. */
.at-cell--on-time { background: #f0fdf4; }
.at-cell--late { background: #fffbeb; }
.at-cell--undertime { background: #fef2f2; }
.at-cell--overtime { background: #eff6ff; }
.at-cell--absent { background: #fee2e2; }
.at-cell--unscheduled { background: #f5f3ff; }
.at-cell--open { background: #ecfeff; }

.at-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.72rem;
    color: #6b7280;
}

.at-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
}

.at-swatch {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
    border: 1px solid #e5e7eb;
}

.at-swatch--on-time { background: #f0fdf4; }
.at-swatch--late { background: #fffbeb; }
.at-swatch--undertime { background: #fef2f2; }
.at-swatch--overtime { background: #eff6ff; }
.at-swatch--absent { background: #fee2e2; }

/* ── Correction modal ── */
.at-modal {
    padding: 1.1rem 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.at-modal-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
}

.at-modal-sub {
    margin: 0;
    font-size: 0.78rem;
    color: #6b7280;
}

.at-mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}

.at-mini-table th {
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #6b7280;
    padding: 0.2rem 0.3rem;
}

.at-mini-table td {
    padding: 0.25rem 0.3rem;
    vertical-align: middle;
}

.at-modal-empty {
    color: #6b7280;
    font-style: italic;
    padding: 0.6rem 0.3rem;
}

/* Width is set here rather than inherited: a full-width input inside these
   inline cells collapses the layout. */
.at-input {
    width: auto;
    max-width: 9rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.8rem;
}

.at-overnight {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    margin-left: 0.3rem;
    font-size: 0.7rem;
    color: #6b7280;
}

.at-icon-btn {
    border: none;
    background: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 0.2rem;
}

.at-icon-btn:hover {
    color: #b91c1c;
}

.at-modal-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.3rem;
}

.at-modal-right {
    display: flex;
    gap: 0.4rem;
}

.at-modal-error {
    margin: 0;
    color: #b91c1c;
    font-size: 0.78rem;
}

@media (max-width: 640px) {
    .at-hint {
        display: none;
    }
}
</style>
