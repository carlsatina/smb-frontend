<template>
    <div class="sw-root">
        <div class="sw-controls">
            <div class="sw-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(-1)">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="sw-label">{{ monthLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(1)">
                    <mdicon name="chevron-right" size="16" />
                </button>
            </div>
            <span class="sw-meta">Read-only — use Edit on a week to make changes</span>
        </div>

        <div v-if="loadError" class="load-error">
            <mdicon name="alert-circle-outline" size="28" />
            <p>{{ loadError }}</p>
            <button class="secondary-button button-compact" @click="load">
                <mdicon name="refresh" size="16" /> Retry
            </button>
        </div>

        <SkeletonLoader v-else-if="isLoading" :rows="6" label="Loading weeks…" />

        <div v-else-if="!stacked || stacked.weeks.length === 0" class="sw-empty">
            <mdicon name="calendar-blank" size="32" />
            <p>Nothing scheduled in {{ monthLabel }}.</p>
        </div>

        <!-- One table for the whole month so every week block shares the same
             column widths, exactly like the source spreadsheet. -->
        <div v-else class="sw-table-wrap">
            <table class="sw-table">
                <thead>
                    <tr>
                        <th class="sw-col-staff">Staff</th>
                        <th
                            v-for="(label, i) in weekdayLabels"
                            :key="label"
                            class="sw-col-day"
                            :class="{ 'sw-col-first-day': i === 0 }"
                        >
                            <span :class="{ 'sw-weekend': i === 0 || i === 6 }">{{ label }}</span>
                        </th>
                        <th class="sw-col-num sw-col-seam">Days</th>
                        <th class="sw-col-num">OT</th>
                        <th class="sw-col-num">less CA</th>
                        <th class="sw-col-num sw-col-payout">Payout</th>
                        <th class="sw-col-remarks">Remarks</th>
                    </tr>
                </thead>

                <tbody v-for="block in stacked.weeks" :key="block.weekStart" class="sw-block">
                    <!-- Date band, as on the sheet -->
                    <tr class="sw-band">
                        <td class="sw-col-staff sw-band-label">{{ formatWeekRange(block.weekStart) }}</td>
                        <td
                            v-for="(date, i) in block.dates"
                            :key="date"
                            class="sw-col-day sw-band-date"
                            :class="{ 'sw-col-first-day': i === 0 }"
                        >
                            {{ shortDate(date) }}
                        </td>
                        <td colspan="5" class="sw-band-actions">
                            <div class="sw-band-actions-inner">
                                <span v-if="block.status === 'DRAFT' && !block.isUnscheduled" class="sw-chip sw-chip--draft">Draft</span>
                                <button v-if="stacked.canEdit" class="sw-edit" @click="$emit('edit-week', block.weekStart)">
                                    <mdicon name="pencil-outline" size="14" /> Edit
                                </button>
                            </div>
                        </td>
                    </tr>

                    <tr v-if="block.rows.length === 0" class="sw-blank-row">
                        <td :colspan="13">
                            {{ blockEmptyLabel(block) }}
                        </td>
                    </tr>

                    <tr v-for="row in block.rows" :key="row.storeMemberId" :class="{ 'sw-row--self': row.isSelf }">
                        <td class="sw-col-staff">
                            <span class="sw-staff-name">{{ row.name }}</span>
                            <span v-if="row.isSelf" class="sw-you">you</span>
                        </td>
                        <td
                            v-for="(date, i) in block.dates"
                            :key="date"
                            class="sw-col-day"
                            :class="{ 'sw-col-first-day': i === 0 }"
                        >
                            <span class="sw-cell" :class="{ 'sw-cell--rd': shiftFor(row, date)?.isRestDay }">
                                <mdicon
                                    v-for="glyph in shiftGlyphs(row, date)"
                                    :key="glyph.name"
                                    :name="glyph.name"
                                    :style="{ color: glyph.color }"
                                    size="13"
                                    aria-hidden="true"
                                />
                                <span>{{ cellLabel(row, date) }}</span>
                            </span>
                        </td>

                        <template v-if="row.pay">
                            <td class="sw-col-num sw-col-seam">{{ row.pay.daysWorked }}</td>
                            <td class="sw-col-num">{{ formatNumber(row.pay.otHours) }}</td>
                            <td class="sw-col-num">{{ formatMoney(row.pay.lessCa) }}</td>
                            <td class="sw-col-num sw-col-payout">{{ formatMoney(row.pay.payout) }}</td>
                            <td class="sw-col-remarks">{{ row.pay.remarks || '—' }}</td>
                        </template>
                        <template v-else>
                            <td colspan="4" class="sw-col-num sw-col-seam sw-hidden" title="Only managers and the staff member can see pay">
                                <mdicon name="lock-outline" size="14" />
                            </td>
                            <td class="sw-col-remarks sw-hidden"></td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { type ScheduleRow, type StackedMonth, type StackedWeek, getStackedMonth } from '@/api/schedule';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { glyphsFor } from '@/utils/shiftIcons';
import { formatShiftRange, formatWeekRange, shortDate } from '@/utils/shiftTime';

const props = defineProps<{ storeId: string; currency: string }>();
defineEmits<{ (e: 'edit-week', weekStart: string): void }>();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const stacked = ref<StackedMonth | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const monthLabel = computed(() =>
    new Date(Date.UTC(year.value, month.value - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    })
);

const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: props.currency || 'PHP',
        minimumFractionDigits: 2,
    }).format(value ?? 0);

const formatNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

const shiftFor = (row: ScheduleRow, date: string) => row.shifts.find((s) => s.date === date) ?? null;

const shiftGlyphs = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    if (!shift || shift.isRestDay) return [];
    return glyphsFor(shift.icon);
};

const cellLabel = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    if (!shift) return '—';
    if (shift.isRestDay) return 'RD';
    return formatShiftRange(shift.startMinute, shift.endMinute);
};

const blockEmptyLabel = (block: StackedWeek) => {
    if (block.isUnscheduled) return 'Not scheduled yet.';
    // Reached when a staff member looks at a week the owner is still drafting.
    return 'Not published yet.';
};

const load = async () => {
    if (!props.storeId) return;
    isLoading.value = true;
    loadError.value = null;
    try {
        const { stacked: loaded } = await getStackedMonth(props.storeId, year.value, month.value);
        stacked.value = loaded;
    } catch (err) {
        const body = (err as { body?: { message?: string } } | null)?.body;
        loadError.value = body?.message || 'Could not load the weeks. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

const goMonth = (delta: number) => {
    const next = new Date(Date.UTC(year.value, month.value - 1 + delta, 1));
    year.value = next.getUTCFullYear();
    month.value = next.getUTCMonth() + 1;
};

onMounted(load);
watch([year, month, () => props.storeId], load);
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

.sw-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}

.sw-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sw-label {
    font-weight: 600;
    min-width: 10rem;
    text-align: center;
}

.sw-meta {
    color: var(--text-muted, #6b7280);
    font-size: 0.78rem;
}

.sw-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
}

.sw-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    white-space: nowrap;

    th,
    td {
        padding: 0.35rem 0.5rem;
        text-align: center;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--surface-alt, #f9fafb);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
    }
}

// A visible gap between week blocks, as on the sheet.
.sw-block + .sw-block .sw-band td {
    border-top: 3px solid var(--border-color, #e5e7eb);
}

.sw-band td {
    background: #eaf5ea;
    font-size: 0.72rem;
    font-weight: 600;
    color: #2f5233;
}

.sw-band-label {
    text-align: left !important;
    white-space: nowrap;
}

.sw-band-actions {
    // Flex goes on an inner wrapper, not the cell: `display: flex` on a
    // colspan'd <td> drops its table-cell behaviour and breaks the layout.
    text-align: right !important;
}

.sw-band-actions-inner {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
    align-items: center;
}

.sw-chip--draft {
    background: #fef3c7;
    color: #92400e;
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
}

.sw-edit {
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--surface, #fff);
    border-radius: 0.3rem;
    padding: 0.1rem 0.4rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #1d4ed8;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;

    &:hover {
        background: rgba(59, 130, 246, 0.08);
    }
}

// Matches the Week tab: faint day-to-day rules, a heavier one at the seam
// between the schedule and the payroll block.
.sw-col-day + .sw-col-day,
.sw-col-first-day {
    border-left: 1px solid rgba(0, 0, 0, 0.07);
}

.sw-col-seam {
    border-left: 2px solid var(--border-color, #e5e7eb);
}

.sw-col-staff {
    text-align: left !important;
    font-weight: 600;
    position: sticky;
    left: 0;
    background: var(--surface, #fff);
    z-index: 1;
}

thead .sw-col-staff {
    z-index: 3;
}

.sw-band .sw-col-staff {
    background: #eaf5ea;
}

.sw-col-num {
    text-align: right !important;
    min-width: 4.2rem;
}

.sw-col-payout {
    font-weight: 700;
    background: rgba(16, 185, 129, 0.06);
}

.sw-col-remarks {
    text-align: left !important;
    min-width: 10rem;
    white-space: normal;
}

.sw-row--self {
    background: rgba(59, 130, 246, 0.04);
}

.sw-staff-name {
    text-transform: uppercase;
}

.sw-you {
    margin-left: 0.35rem;
    font-size: 0.62rem;
    font-weight: 700;
    color: #1d4ed8;
    background: #dbeafe;
    border-radius: 999px;
    padding: 0.05rem 0.3rem;
}

.sw-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    white-space: nowrap;
}

.sw-cell--rd {
    color: #dc2626;
    font-weight: 700;
}

.sw-weekend {
    color: #b91c1c;
}

.sw-hidden {
    color: var(--text-muted, #9ca3af);
    background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 6px,
        rgba(0, 0, 0, 0.025) 6px,
        rgba(0, 0, 0, 0.025) 12px
    );
}

.sw-blank-row td {
    color: var(--text-muted, #9ca3af);
    font-style: italic;
    text-align: left !important;
    padding-left: 0.75rem;
}

@media (max-width: 640px) {
    .sw-table {
        font-size: 0.76rem;
    }

    .sw-table th,
    .sw-table td {
        padding: 0.3rem 0.4rem;
    }

    .sw-label {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 0.9rem;
    }

    // The month grid is a dense sheet — horizontal scrolling is inherent to it,
    // so make that obvious rather than pretending it fits.
    .sw-table-wrap {
        -webkit-overflow-scrolling: touch;
    }

    .sw-meta::after {
        content: ' · scroll sideways for the rest of the week';
    }
}

.sw-empty {
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
