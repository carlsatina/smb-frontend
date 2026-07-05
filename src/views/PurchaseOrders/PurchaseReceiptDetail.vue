<template>
    <section class="receipt-page">
        <div class="receipt-shell">
            <header class="detail-header">
                <button type="button" class="back-link no-print" @click="goToReceiptsList">
                    <mdicon name="arrow-left" size="15" />
                    Receipts
                </button>
                <div class="detail-header-row">
                    <div class="detail-title">
                        <h1>
                            Receipt
                            <span v-if="receipt" class="receipt-id-badge" :title="receipt.id">#{{ receipt.id.slice(0, 8) }}</span>
                        </h1>
                        <p v-if="receipt">
                            Received {{ formatDate(receipt.receivedAt) }} · {{ formatTime(receipt.receivedAt) }} · {{ currentStoreLabel }}
                        </p>
                        <p v-else>Review received items and costs.</p>
                    </div>
                    <div class="header-actions no-print" v-if="receipt">
                        <button class="ghost-button" @click="printReceipt">
                            <mdicon name="printer-outline" size="16" />
                            Print
                        </button>
                        <button
                            v-if="receipt.purchaseOrderId"
                            class="ghost-button"
                            @click="goToPurchaseOrder(receipt.purchaseOrderId)"
                        >
                            <mdicon name="clipboard-text-outline" size="16" />
                            View order
                        </button>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Receipt details are available on Standard."
                description="Upgrade to Standard to review receipts, suppliers, and receiving history."
            />

            <div v-else-if="isLoading" class="panel-state">Loading receipt…</div>

            <div v-else-if="!receipt" class="panel-state">Receipt not found.</div>

            <template v-else>
                <!-- ── Summary ── -->
                <section class="detail-card">
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span>Supplier</span>
                            <button
                                v-if="receipt.supplierName"
                                type="button"
                                class="meta-link"
                                @click="handleSupplierClick"
                            >
                                {{ receipt.supplierName }}
                            </button>
                            <strong v-else>—</strong>
                        </div>
                        <div class="meta-item">
                            <span>Invoice</span>
                            <strong>{{ receipt.invoiceNumber || '—' }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Received by</span>
                            <strong>{{ receipt.receivedBy?.fullName || receipt.receivedBy?.email || 'System' }}</strong>
                        </div>
                        <div class="meta-item meta-item--highlight">
                            <span>Total cost</span>
                            <strong>{{ formatMoney(receipt.totalCost) }}</strong>
                        </div>
                    </div>
                </section>

                <!-- ── Line items ── -->
                <section class="detail-card">
                    <div class="card-title card-title--row">
                        <div>
                            <h2>Items received</h2>
                            <p>{{ receipt.items.length }} line{{ receipt.items.length !== 1 ? 's' : '' }} in this shipment</p>
                        </div>
                    </div>

                    <div v-if="receipt.items.length === 0" class="panel-state">
                        No line items recorded for this receipt.
                    </div>
                    <div v-else class="table-wrap">
                        <table class="lines-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="num">Qty</th>
                                    <th class="num">Unit cost</th>
                                    <th class="num">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in receipt.items" :key="item.id">
                                    <td>
                                        <div class="item-name">{{ item.name }}</div>
                                        <div class="item-meta">
                                            <span>{{ item.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                            <span v-if="item.unit">{{ item.unit }}</span>
                                        </div>
                                    </td>
                                    <td class="num">{{ formatQty(item.qtyReceived) }}</td>
                                    <td class="num">{{ formatMoney(item.unitCost) }}</td>
                                    <td class="num num--strong">{{ formatMoney(item.qtyReceived * item.unitCost) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="tfoot-label">Total</td>
                                    <td class="num num--strong">{{ formatMoney(receipt.totalCost) }}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            </template>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPurchaseReceipt, PurchaseReceiptDetail } from '@/api/purchaseOrders';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { hasPlanFeature } from '@/utils/planAccess';
import PlanGate from '@/components/PlanGate.vue';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const receipt = ref<PurchaseReceiptDetail | null>(null);
const isLoading = ref(false);
// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);

const routeStoreId = computed(() => route.params.storeId as string | undefined);
const receiptId = computed(() => route.params.receiptId as string | undefined);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: storeContext.currentStore?.timezone || 'Asia/Manila' });
};

const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: storeContext.currentStore?.timezone || 'Asia/Manila' });
};

const loadReceipt = async () => {
    if (isPlanLocked.value) {
        receipt.value = null;
        return;
    }
    if (!routeStoreId.value || !receiptId.value) {
        receipt.value = null;
        return;
    }
    isLoading.value = true;
    try {
        const data = await getPurchaseReceipt(routeStoreId.value, receiptId.value);
        receipt.value = data.receipt;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load receipt.';
        showToast(message, 'error');
        receipt.value = null;
    } finally {
        isLoading.value = false;
    }
};

const goToReceiptsList = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders/receipts`);
};

const goToPurchaseOrder = (purchaseOrderId: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders/${purchaseOrderId}`);
};

const goToSupplier = (supplierId: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/suppliers/${supplierId}`);
};

const goToSupplierSearch = (supplierName: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/suppliers?q=${encodeURIComponent(supplierName)}`);
};

const handleSupplierClick = () => {
    if (!receipt.value) return;
    if (receipt.value.supplierId) {
        goToSupplier(receipt.value.supplierId);
        return;
    }
    if (receipt.value.supplierName) {
        goToSupplierSearch(receipt.value.supplierName);
    }
};

const printReceipt = () => {
    window.print();
};

onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    if (isPlanLocked.value) return;
    await loadReceipt();
});

watch(
    () => routeStoreId.value,
    (storeId) => {
        if (storeId && storeId !== storeContext.currentStoreId) {
            storeContext.setCurrentStore(storeId);
        }
    }
);

watch(
    () => receiptId.value,
    async () => {
        if (isPlanLocked.value) return;
        await loadReceipt();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.receipt-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f6f8f9;
    min-height: 100vh;
    padding: 2rem 1.5rem 3rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ============================================================
   SHELL & HEADER
============================================================ */
.receipt-shell {
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.detail-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 0.25rem;
}

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: none;
    background: none;
    padding: 0;
    margin-bottom: 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-muted);
    cursor: pointer;
    transition: color 0.15s;
    align-self: flex-start;
}

.back-link:hover { color: var(--c-accent-dark); }

.detail-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

.detail-title h1 {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.receipt-id-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    transform: translateY(2px);
}

.detail-title p {
    color: var(--c-muted);
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

.header-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
}

/* ============================================================
   CARDS
============================================================ */
.detail-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    min-width: 0;
}

.card-title h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.card-title p {
    margin: 0.2rem 0 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

.card-title--row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
}

.panel-state {
    padding: 2rem;
    border-radius: 12px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

/* ============================================================
   META GRID
============================================================ */
.meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1px;
    background: var(--c-border);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    overflow: hidden;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
    background: #fafbfc;
    min-width: 0;
}

.meta-item > span {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.meta-item > strong {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meta-item--highlight { background: rgba(13, 148, 136, 0.06); }
.meta-item--highlight > span { color: var(--c-accent-dark); }
.meta-item--highlight > strong { color: var(--c-accent-dark); font-size: 1rem; }

.meta-link {
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-accent-dark);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meta-link:hover { text-decoration: underline; }

/* ============================================================
   LINES TABLE
============================================================ */
.table-wrap { overflow-x: auto; min-width: 0; }

.lines-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    min-width: 480px;
}

.lines-table thead th {
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.lines-table thead th.num { text-align: right; }

.lines-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.lines-table tbody tr:hover { background: #f8fafc; }

.lines-table tbody td {
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
}

.lines-table td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.num--strong { font-weight: 700; color: var(--c-text); }

.lines-table tfoot td {
    padding: 0.8rem 0.9rem;
    border-top: 1.5px solid var(--c-border);
}

.tfoot-label {
    text-align: right;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
}

.item-name {
    font-weight: 600;
    color: var(--c-text);
}

.item-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.1rem;
}

.item-meta span + span::before {
    content: '·';
    margin-right: 0.35rem;
    color: #cbd5e1;
}

/* ============================================================
   BUTTONS
============================================================ */
.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.58rem 1rem;
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.ghost-button:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.ghost-button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .receipt-page { padding: 1rem 0.875rem 2.5rem; }
    .receipt-shell { gap: 0.875rem; }
    .detail-title h1 { font-size: 1.35rem; }

    .header-actions { width: 100%; }
    .header-actions .ghost-button { flex: 1; justify-content: center; }

    .detail-card { padding: 1.1rem; border-radius: 12px; }

    .meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ============================================================
   PRINT
============================================================ */
@media print {
    .receipt-page {
        padding: 0;
        background: #fff;
        min-height: auto;
    }

    .no-print { display: none !important; }

    .detail-card {
        border: none;
        border-radius: 0;
        padding: 0.75rem 0;
    }

    .detail-card + .detail-card { border-top: 1px solid #e2e8f0; }

    .meta-grid,
    .meta-item { background: #fff; }

    .lines-table tbody tr:hover { background: transparent; }
}
</style>
