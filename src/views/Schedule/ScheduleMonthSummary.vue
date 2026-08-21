<template>
    <div class="ms-root">
        <div class="ms-controls">
            <div class="ms-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(-1)">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="ms-label">{{ monthLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="goMonth(1)">
                    <mdicon name="chevron-right" size="16" />
                </button>
            </div>
            <span v-if="summary" class="ms-meta">
                {{ summary.weekCount }} published week{{ summary.weekCount === 1 ? '' : 's' }}
            </span>
        </div>

        <!-- Draft weeks are excluded from the totals; saying so beats quietly
             under-reporting the payroll number. -->
        <div v-if="summary && summary.draftWeeks > 0" class="ms-notice">
            <mdicon name="alert-outline" size="16" />
            <span>
                {{ summary.draftWeeks }} draft week{{ summary.draftWeeks === 1 ? '' : 's' }}
                not included — publish {{ summary.draftWeeks === 1 ? 'it' : 'them' }} to count toward these totals.
            </span>
        </div>

        <div v-if="loadError" class="load-error">
            <mdicon name="alert-circle-outline" size="28" />
            <p>{{ loadError }}</p>
            <button class="secondary-button button-compact" @click="load">
                <mdicon name="refresh" size="16" /> Retry
            </button>
        </div>

        <SkeletonLoader v-else-if="isLoading" :rows="3" label="Loading totals…" />

        <div v-else-if="!summary || summary.rows.length === 0" class="ms-empty">
            <mdicon name="calendar-blank" size="32" />
            <p>No published weeks in {{ monthLabel }}.</p>
        </div>

        <div v-else class="ms-table-wrap">
            <table class="ms-table">
                <thead>
                    <tr>
                        <th class="ms-col-staff">Staff</th>
                        <th class="ms-col-num">Days</th>
                        <th class="ms-col-num">OT</th>
                        <th class="ms-col-num">less CA</th>
                        <th class="ms-col-num ms-col-payout">Payout</th>
                        <th class="ms-col-num">CA balance</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="row in summary.rows" :key="row.storeMemberId">
                        <tr class="ms-row" :class="{ 'ms-row--self': row.isSelf }" @click="toggle(row.storeMemberId)">
                            <td class="ms-col-staff">
                                <mdicon
                                    :name="expanded.has(row.storeMemberId) ? 'chevron-down' : 'chevron-right'"
                                    size="16"
                                    class="ms-chevron"
                                />
                                <span class="ms-staff-name">{{ row.name }}</span>
                                <span v-if="row.isSelf" class="ms-you">you</span>
                            </td>
                            <td class="ms-col-num">{{ row.daysWorked }}</td>
                            <td class="ms-col-num">{{ formatNumber(row.otHours) }}</td>
                            <td class="ms-col-num">{{ formatMoney(row.lessCa) }}</td>
                            <td class="ms-col-num ms-col-payout">{{ formatMoney(row.payout) }}</td>
                            <td class="ms-col-num ms-muted">{{ formatMoney(row.caBalance) }}</td>
                        </tr>
                        <tr v-if="expanded.has(row.storeMemberId)" class="ms-breakdown">
                            <td colspan="6">
                                <table class="ms-sub-table">
                                    <tbody>
                                        <tr v-for="wk in row.weeks" :key="wk.weekStart">
                                            <td class="ms-sub-week">{{ formatWeekRange(wk.weekStart) }}</td>
                                            <td class="ms-col-num">{{ wk.daysWorked }} days</td>
                                            <td class="ms-col-num">{{ formatNumber(wk.otHours) }} OT</td>
                                            <td class="ms-col-num">− {{ formatMoney(wk.lessCa) }}</td>
                                            <td class="ms-col-num ms-col-payout">{{ formatMoney(wk.payout) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </template>
                </tbody>
                <tfoot v-if="summary.rows.length > 1">
                    <tr>
                        <td class="ms-col-staff">Total</td>
                        <td class="ms-col-num">{{ summary.grandTotal.daysWorked }}</td>
                        <td class="ms-col-num">{{ formatNumber(summary.grandTotal.otHours) }}</td>
                        <td class="ms-col-num">{{ formatMoney(summary.grandTotal.lessCa) }}</td>
                        <td class="ms-col-num ms-col-payout">{{ formatMoney(summary.grandTotal.payout) }}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { type MonthSummary, getMonthSummary } from '@/api/schedule';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { formatWeekRange } from '@/utils/shiftTime';

const props = defineProps<{ storeId: string; currency: string }>();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const summary = ref<MonthSummary | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const expanded = ref(new Set<string>());

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

const load = async () => {
    if (!props.storeId) return;
    isLoading.value = true;
    loadError.value = null;
    try {
        const { summary: loaded } = await getMonthSummary(props.storeId, year.value, month.value);
        summary.value = loaded;
    } catch (err) {
        const body = (err as { body?: { message?: string } } | null)?.body;
        loadError.value = body?.message || 'Could not load the totals. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

const goMonth = (delta: number) => {
    const next = new Date(Date.UTC(year.value, month.value - 1 + delta, 1));
    year.value = next.getUTCFullYear();
    month.value = next.getUTCMonth() + 1;
};

const toggle = (storeMemberId: string) => {
    const next = new Set(expanded.value);
    next.has(storeMemberId) ? next.delete(storeMemberId) : next.add(storeMemberId);
    expanded.value = next;
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

.ms-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}

.ms-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ms-label {
    font-weight: 600;
    min-width: 10rem;
    text-align: center;
}

.ms-meta,
.ms-muted {
    color: var(--text-muted, #6b7280);
    font-size: 0.8rem;
}

.ms-notice {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #fef3c7;
    color: #92400e;
    border-radius: 0.4rem;
    padding: 0.45rem 0.65rem;
    font-size: 0.82rem;
    margin-bottom: 0.75rem;
}

.ms-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
}

.ms-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;

    th,
    td {
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        padding: 0.45rem 0.6rem;
        text-align: right;
        white-space: nowrap;
    }

    thead th {
        background: var(--surface-alt, #f9fafb);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
    }

    tfoot td {
        font-weight: 700;
        background: var(--surface-alt, #f9fafb);
    }
}

.ms-col-staff {
    text-align: left !important;
    font-weight: 600;
}

.ms-col-payout {
    font-weight: 700;
    background: rgba(16, 185, 129, 0.06);
}

.ms-row {
    cursor: pointer;

    &:hover {
        background: rgba(59, 130, 246, 0.05);
    }
}

.ms-row--self {
    background: rgba(59, 130, 246, 0.04);
}

.ms-chevron {
    color: var(--text-muted, #9ca3af);
    margin-right: 0.2rem;
    vertical-align: -0.2em;
}

.ms-staff-name {
    text-transform: uppercase;
}

.ms-you {
    margin-left: 0.35rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #1d4ed8;
    background: #dbeafe;
    border-radius: 999px;
    padding: 0.05rem 0.35rem;
}

.ms-breakdown > td {
    padding: 0 0 0 1.6rem;
    background: var(--surface-alt, #f9fafb);
}

.ms-sub-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    color: var(--text-muted, #6b7280);

    td {
        padding: 0.3rem 0.6rem;
        text-align: right;
        border-bottom: none;
        white-space: nowrap;
    }
}

.ms-sub-week {
    text-align: left !important;
}

@media (max-width: 640px) {
    .ms-table {
        font-size: 0.78rem;
    }

    .ms-table th,
    .ms-table td {
        padding: 0.35rem 0.4rem;
    }

    .ms-label {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 0.9rem;
    }

    .ms-breakdown > td {
        padding-left: 0.6rem;
    }
}

.ms-empty {
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
