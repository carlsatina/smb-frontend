<template>
    <div class="ab-page">
        <header class="ab-header">
            <div>
                <h1 class="ab-title">Billing</h1>
                <p class="ab-sub">Per-receipt convenience-fee billing for stores not on a subscription.</p>
            </div>
            <div class="ab-header-kpis">
                <div class="ab-kpi">
                    <span class="ab-kpi-value">{{ stores.length }}</span>
                    <span class="ab-kpi-label">Per-receipt stores</span>
                </div>
                <div class="ab-kpi">
                    <span class="ab-kpi-value">{{ totalReceipts.toLocaleString() }}</span>
                    <span class="ab-kpi-label">Receipts in {{ monthLabel }}</span>
                </div>
                <div class="ab-kpi ab-kpi--accent">
                    <span class="ab-kpi-value">{{ formatPeso(totalDue) }}</span>
                    <span class="ab-kpi-label">Billable in {{ monthLabel }}</span>
                </div>
            </div>
        </header>

        <!-- Toolbar -->
        <div class="ab-toolbar">
            <div class="ab-month-nav">
                <button class="ab-month-btn" @click="shiftMonth(-1)" title="Previous month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <span class="ab-month-label">{{ monthLabel }}</span>
                <button class="ab-month-btn" @click="shiftMonth(1)" :disabled="isCurrentMonth" title="Next month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <button v-if="!isCurrentMonth" class="ab-today-btn" @click="goToCurrentMonth">This month</button>
            </div>

            <label class="ab-fee-wrap">
                <span class="ab-fee-label">Fee / receipt</span>
                <span class="ab-fee-input-wrap">
                    <span class="ab-fee-currency">₱</span>
                    <input v-model.number="feeRate" class="ab-fee-input" type="number" min="0" step="0.01" />
                </span>
            </label>
        </div>

        <div v-if="loading" class="ab-state">Loading billing...</div>
        <div v-else-if="error" class="ab-state ab-state--error">{{ error }}</div>

        <template v-else>
            <div class="ab-table-wrap">
                <table class="ab-table">
                    <thead>
                        <tr>
                            <th>Store</th>
                            <th>Owner</th>
                            <th class="ab-th-num">Receipts ({{ monthLabel }})</th>
                            <th class="ab-th-num">Amount due</th>
                            <th>Last billed</th>
                            <th class="ab-th-action">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="store in stores" :key="store.id">
                            <td><div class="ab-store-name">{{ store.name }}</div></td>
                            <td>
                                <span v-if="store.owner" class="ab-owner-email">{{ store.owner.email }}</span>
                                <span v-else class="ab-muted">No owner</span>
                            </td>
                            <td class="ab-td-num">
                                <span class="ab-num" :class="store.receiptCount > 0 ? 'ab-num--active' : 'ab-num--zero'">
                                    {{ store.receiptCount.toLocaleString() }}
                                </span>
                            </td>
                            <td class="ab-td-num">
                                <span class="ab-num" :class="store.receiptCount > 0 ? 'ab-num--active' : 'ab-num--zero'">
                                    {{ formatPeso(amountDue(store)) }}
                                </span>
                            </td>
                            <td>
                                <div v-if="store.lastBilledAt" class="ab-last-billed">
                                    <span class="ab-last-date">{{ formatDateTime(store.lastBilledAt) }}</span>
                                    <span class="ab-last-amount">{{ formatPeso(store.lastBilledAmount ?? 0) }}</span>
                                </div>
                                <span v-else class="ab-muted">Not billed</span>
                            </td>
                            <td class="ab-td-action">
                                <button
                                    class="ab-btn"
                                    :class="store.lastBilledAt ? 'ab-btn--ghost' : ''"
                                    :disabled="!store.owner || store.receiptCount === 0"
                                    :title="!store.owner ? 'No owner email' : store.receiptCount === 0 ? 'No receipts to bill' : ''"
                                    @click="openConfirm(store)"
                                >
                                    {{ store.lastBilledAt ? 'Resend bill' : 'Send bill' }}
                                </button>
                            </td>
                        </tr>
                        <tr v-if="stores.length === 0">
                            <td colspan="6" class="ab-empty">
                                No per-receipt stores. Mark a user as “Bill per receipt” in the Users page first.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <!-- Confirm send modal -->
        <div v-if="confirm.store" class="ab-modal-backdrop" @click.self="closeConfirm">
            <div class="ab-modal">
                <h2 class="ab-modal-title">Send bill</h2>
                <p class="ab-modal-sub">
                    Send a billing email to <strong>{{ confirm.store.owner?.email }}</strong>?
                </p>

                <div class="ab-modal-summary">
                    <div class="ab-summary-row">
                        <span class="ab-summary-label">Store</span>
                        <span class="ab-summary-value">{{ confirm.store.name }}</span>
                    </div>
                    <div class="ab-summary-row">
                        <span class="ab-summary-label">Period</span>
                        <span class="ab-summary-value">{{ monthLabel }}</span>
                    </div>
                    <div class="ab-summary-row">
                        <span class="ab-summary-label">Receipts</span>
                        <span class="ab-summary-value">{{ confirm.store.receiptCount.toLocaleString() }}</span>
                    </div>
                    <div class="ab-summary-row">
                        <span class="ab-summary-label">Fee / receipt</span>
                        <span class="ab-summary-value">{{ formatPeso(safeFeeRate) }}</span>
                    </div>
                    <div class="ab-summary-row ab-summary-row--total">
                        <span class="ab-summary-label">Total due</span>
                        <span class="ab-summary-value">{{ formatPeso(amountDue(confirm.store)) }}</span>
                    </div>
                </div>

                <p v-if="confirm.store.lastBilledAt" class="ab-modal-note">
                    This store was already billed for {{ monthLabel }} on {{ formatDateTime(confirm.store.lastBilledAt) }}. Sending again will replace that record.
                </p>

                <div class="ab-modal-footer">
                    <button class="ab-btn ab-btn--ghost" :disabled="sending" @click="closeConfirm">Cancel</button>
                    <button class="ab-btn" :disabled="sending" @click="confirmSend">
                        {{ sending ? 'Sending…' : 'Send bill' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { getBillingStores, sendBillingNotice, type BillingStore } from '@/api/admin';
import { useToast } from '@/composables/useToast';

const { showToast } = useToast();

const loading = ref(false);
const error = ref<string | null>(null);
const stores = ref<BillingStore[]>([]);
const confirm = reactive<{ store: BillingStore | null }>({ store: null });
const sending = ref(false);

const now = new Date();
const selectedMonth = ref(now.getMonth() + 1);
const selectedYear = ref(now.getFullYear());
const feeRate = ref(1);

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthLabel = computed(() => `${MONTH_NAMES[selectedMonth.value - 1]} ${selectedYear.value}`);
const isCurrentMonth = computed(() =>
    selectedMonth.value === now.getMonth() + 1 && selectedYear.value === now.getFullYear()
);

const safeFeeRate = computed(() => (Number.isFinite(feeRate.value) && feeRate.value >= 0 ? feeRate.value : 0));
const amountDue = (store: BillingStore) => store.receiptCount * safeFeeRate.value;

const totalReceipts = computed(() => stores.value.reduce((acc, s) => acc + s.receiptCount, 0));
const totalDue = computed(() => totalReceipts.value * safeFeeRate.value);

const formatPeso = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const shiftMonth = (dir: 1 | -1) => {
    let m = selectedMonth.value + dir;
    let y = selectedYear.value;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    selectedMonth.value = m;
    selectedYear.value = y;
};

const goToCurrentMonth = () => {
    selectedMonth.value = now.getMonth() + 1;
    selectedYear.value = now.getFullYear();
};

const loadStores = async () => {
    loading.value = true;
    error.value = null;
    try {
        const data = await getBillingStores(selectedMonth.value, selectedYear.value);
        stores.value = data.stores;
    } catch (e: any) {
        error.value = e?.body?.error?.message || 'Failed to load billing.';
        showToast(error.value ?? 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

const openConfirm = (store: BillingStore) => {
    if (!store.owner || store.receiptCount === 0) return;
    confirm.store = store;
};

const closeConfirm = () => {
    if (sending.value) return;
    confirm.store = null;
};

const confirmSend = async () => {
    const store = confirm.store;
    if (!store || !store.owner || store.receiptCount === 0) return;

    sending.value = true;
    try {
        const result = await sendBillingNotice(store.id, selectedMonth.value, selectedYear.value, safeFeeRate.value);
        if (result.sent && result.notice) {
            store.lastBilledAt = result.notice.sentAt;
            store.lastBilledAmount = result.notice.amount;
            store.lastBilledReceipts = result.notice.receiptCount;
            showToast(`Bill sent to ${store.owner.email}.`, 'success');
            confirm.store = null;
        } else {
            showToast(result.message || 'Email could not be sent.', 'error');
        }
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to send bill.', 'error');
    } finally {
        sending.value = false;
    }
};

watch([selectedMonth, selectedYear], loadStores);
onMounted(loadStores);
</script>

<style scoped>
.ab-page { display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif; }

/* Header */
.ab-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.ab-title { font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 0.2rem; }
.ab-sub { font-size: 0.875rem; color: #64748b; margin: 0; }
.ab-header-kpis { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.ab-kpi {
    display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 1rem; min-width: 120px;
}
.ab-kpi--accent { border-color: rgba(13, 148, 136, 0.3); background: rgba(13, 148, 136, 0.04); }
.ab-kpi-value { font-size: 1.35rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.ab-kpi--accent .ab-kpi-value { color: #0f766e; }
.ab-kpi-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; text-align: right; }

/* Toolbar */
.ab-toolbar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.ab-month-nav { display: inline-flex; align-items: center; gap: 0.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.3rem 0.4rem; }
.ab-month-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: #64748b; cursor: pointer; transition: background 0.12s, color 0.12s; }
.ab-month-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.ab-month-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ab-month-label { font-size: 0.875rem; font-weight: 700; color: #0f172a; min-width: 130px; text-align: center; padding: 0 0.25rem; }
.ab-today-btn { font-size: 0.72rem; font-weight: 600; color: #0d9488; background: rgba(13, 148, 136, 0.08); border: none; border-radius: 6px; padding: 0.25rem 0.6rem; cursor: pointer; white-space: nowrap; }
.ab-today-btn:hover { background: rgba(13, 148, 136, 0.15); }
.ab-fee-wrap { display: flex; align-items: center; gap: 0.5rem; }
.ab-fee-label { font-size: 0.8rem; color: #64748b; white-space: nowrap; }
.ab-fee-input-wrap { display: inline-flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding: 0 0.5rem; }
.ab-fee-input-wrap:focus-within { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
.ab-fee-currency { font-size: 0.875rem; color: #64748b; }
.ab-fee-input { width: 64px; border: none; outline: none; padding: 0.5rem 0.25rem; font-size: 0.875rem; color: #0f172a; background: transparent; }

/* Table */
.ab-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; overflow-x: auto; }
.ab-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.ab-table thead th { padding: 0.65rem 1rem; text-align: left; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.ab-table thead th.ab-th-num { text-align: right; }
.ab-table thead th.ab-th-action { text-align: right; }
.ab-table tbody tr { border-bottom: 1px solid #f1f5f9; }
.ab-table tbody tr:last-child { border-bottom: none; }
.ab-table tbody tr:hover { background: #f8fafc; }
.ab-table tbody td { padding: 0.8rem 1rem; vertical-align: middle; }
.ab-td-num { text-align: right; }
.ab-td-action { text-align: right; }

.ab-store-name { font-weight: 600; color: #0f172a; }
.ab-owner-email { font-size: 0.85rem; color: #334155; word-break: break-all; }
.ab-muted { color: #94a3b8; font-size: 0.82rem; }
.ab-num { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
.ab-num--active { color: #0d9488; }
.ab-num--zero { color: #cbd5e1; font-weight: 600; }

.ab-last-billed { display: flex; flex-direction: column; gap: 0.1rem; }
.ab-last-date { font-size: 0.8rem; color: #334155; }
.ab-last-amount { font-size: 0.72rem; color: #94a3b8; }

.ab-btn { border: none; border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.8rem; font-weight: 600; background: #0d9488; color: #fff; cursor: pointer; white-space: nowrap; transition: background 0.12s; }
.ab-btn:hover:not(:disabled) { background: #0f766e; }
.ab-btn--ghost { background: #fff; color: #0f766e; border: 1px solid #99f6e4; }
.ab-btn--ghost:hover:not(:disabled) { background: #f0fdfa; }
.ab-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ab-empty { text-align: center; padding: 2.5rem; color: #94a3b8; }
.ab-state { padding: 2rem; text-align: center; color: #64748b; background: #f8fafc; border-radius: 10px; }
.ab-state--error { color: #b91c1c; background: #fef2f2; }

/* Confirm modal */
.ab-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
}
.ab-modal {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border-radius: 14px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
.ab-modal-title { margin: 0 0 0.25rem; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
.ab-modal-sub { margin: 0 0 1rem; font-size: 0.85rem; color: #64748b; word-break: break-word; }
.ab-modal-sub strong { color: #0f172a; }

.ab-modal-summary {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.5rem 0.875rem;
    background: #f8fafc;
}
.ab-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0;
}
.ab-summary-row + .ab-summary-row { border-top: 1px solid #eef2f7; }
.ab-summary-label { font-size: 0.8rem; color: #64748b; }
.ab-summary-value { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
.ab-summary-row--total .ab-summary-label { font-weight: 700; color: #0f172a; }
.ab-summary-row--total .ab-summary-value { font-size: 1rem; font-weight: 800; color: #0f766e; }

.ab-modal-note {
    margin: 0.875rem 0 0;
    font-size: 0.75rem;
    color: #92400e;
    background: #fef3c7;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
}

.ab-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.25rem;
}
</style>
