<template>
    <section class="receipt-page">
        <div class="receipt-shell">
            <header class="receipt-header">
                <div class="receipt-title">
                    <span class="receipt-eyebrow">Purchase Orders</span>
                    <h1>Receipt detail</h1>
                    <p v-if="receipt">
                        <span class="receipt-id-badge" :title="receipt.id">#{{ receipt.id.slice(0, 8) }}…</span>
                        · {{ currentStoreLabel }}
                    </p>
                    <p v-else>Review received items and costs.</p>
                </div>
                <div class="receipt-actions no-print">
                    <button class="ghost-button" @click="goToReceiptsList">Back to receipts</button>
                    <button class="ghost-button" @click="printReceipt">Print</button>
                    <button
                        v-if="receipt?.purchaseOrderId"
                        class="secondary-button"
                        @click="goToPurchaseOrder(receipt.purchaseOrderId)"
                    >
                        View PO
                    </button>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Receipt details are available on Standard."
                description="Upgrade to Standard to review receipts, suppliers, and receiving history."
            />
            <template v-else>
                <div v-if="isLoading" class="panel-state">Loading receipt...</div>
                <div v-else-if="!receipt" class="panel-state">Receipt not found.</div>
                <template v-else>

                    <div class="meta-strip">
                        <div class="meta-item">
                            <span class="meta-label">Supplier</span>
                            <button
                                v-if="receipt.supplierName"
                                type="button"
                                class="link-button"
                                @click="handleSupplierClick"
                            >
                                {{ receipt.supplierName }}
                            </button>
                            <span v-else class="meta-value">—</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Invoice</span>
                            <span class="meta-value">{{ receipt.invoiceNumber || '—' }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Received by</span>
                            <span class="meta-value">{{ receipt.receivedBy?.fullName || receipt.receivedBy?.email || 'System' }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Received at</span>
                            <span class="meta-value">{{ formatDate(receipt.receivedAt) }}</span>
                            <span class="meta-sub">{{ formatTime(receipt.receivedAt) }}</span>
                        </div>
                        <div class="meta-item meta-item--highlight">
                            <span class="meta-label">Total cost</span>
                            <span class="meta-value meta-value--large">{{ formatMoney(receipt.totalCost) }}</span>
                        </div>
                    </div>

                    <section class="receipt-card">
                        <div class="card-header">
                            <div>
                                <h2>Line items</h2>
                                <p>Items received in this shipment</p>
                            </div>
                            <span class="item-count-pill">{{ receipt.items.length }} item{{ receipt.items.length !== 1 ? 's' : '' }}</span>
                        </div>

                        <div v-if="receipt.items.length === 0" class="empty-state">
                            <p>No line items recorded for this receipt.</p>
                        </div>
                        <div v-else class="table-wrap">
                            <table class="lines-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th class="col-num">Qty</th>
                                        <th class="col-num">Unit cost</th>
                                        <th class="col-num">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in receipt.items" :key="item.id">
                                        <td>
                                            <div class="item-name">{{ item.name }}</div>
                                            <div v-if="item.unit" class="item-unit">{{ item.unit }}</div>
                                        </td>
                                        <td>
                                            <span
                                                :class="['type-chip', item.itemType === 'INGREDIENT' ? 'type-chip--ingredient' : 'type-chip--product']"
                                            >
                                                {{ item.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}
                                            </span>
                                        </td>
                                        <td class="col-num">{{ formatQty(item.qtyReceived) }}</td>
                                        <td class="col-num">{{ formatMoney(item.unitCost) }}</td>
                                        <td class="col-num line-total">{{ formatMoney(item.qtyReceived * item.unitCost) }}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="4" class="total-label">Total</td>
                                        <td class="col-num total-amount">{{ formatMoney(receipt.totalCost) }}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>

                </template>
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
    return `${store.name} · ${store.currency}`;
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

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
    --c-bg: #f8fafc;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    padding: 3rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
}

/* ============================================================
   SHELL / HEADER
============================================================ */
.receipt-shell {
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.receipt-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-end;
    justify-content: space-between;
}

.receipt-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: #ccfbf1;
    color: var(--c-accent-dark);
    margin-bottom: 0.4rem;
}

.receipt-title h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.receipt-title p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.receipt-id-badge {
    font-family: 'SF Mono', ui-monospace, monospace;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.15rem 0.5rem;
}

.receipt-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex-shrink: 0;
}

/* ============================================================
   PANEL STATE
============================================================ */
.panel-state {
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    background: #f0fdf9;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
    text-align: center;
}

/* ============================================================
   METADATA STRIP
============================================================ */
.meta-strip {
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
    gap: 0.2rem;
    padding: 1rem 1.25rem;
    background: var(--c-surface);
}

.meta-item--highlight {
    background: #f0fdf9;
}

.meta-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.meta-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--c-text);
}

.meta-value--large {
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--c-accent-dark);
}

.meta-sub {
    font-size: 0.78rem;
    color: var(--c-muted);
}

/* ============================================================
   RECEIPT CARD
============================================================ */
.receipt-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem 2rem;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
}

.card-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.15rem;
    color: var(--c-text);
}

.card-header p {
    font-size: 0.85rem;
    color: var(--c-muted);
    margin: 0;
}

.item-count-pill {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    background: #ccfbf1;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    white-space: nowrap;
}

/* ============================================================
   LINE ITEMS TABLE
============================================================ */
.table-wrap {
    overflow-x: auto;
}

.lines-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
}

.lines-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    border-bottom: 2px solid var(--c-border);
    white-space: nowrap;
}

.lines-table td {
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid var(--c-border);
    color: var(--c-text);
    vertical-align: middle;
}

.lines-table tbody tr:hover td {
    background: var(--c-bg);
}

.col-num {
    text-align: right;
}

.item-name {
    font-weight: 600;
    color: var(--c-text);
}

.item-unit {
    font-size: 0.78rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
}

.type-chip {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.type-chip--product {
    background: #ccfbf1;
    color: #0f766e;
}

.type-chip--ingredient {
    background: #ede9fe;
    color: #6d28d9;
}

.line-total {
    font-weight: 700;
}

/* ============================================================
   TABLE FOOTER (TOTAL)
============================================================ */
.lines-table tfoot td {
    border-bottom: none;
    border-top: 2px solid var(--c-border);
    padding: 0.9rem 0.75rem;
    background: var(--c-bg);
}

.total-label {
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.total-amount {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--c-accent-dark);
}

/* ============================================================
   LINK BUTTON
============================================================ */
.link-button {
    border: none;
    padding: 0;
    background: none;
    color: var(--c-accent-dark);
    font-weight: 600;
    font-size: 0.95rem;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    text-align: left;
    transition: color 0.15s;
}

.link-button:hover {
    text-decoration: underline;
}

/* ============================================================
   EMPTY STATE
============================================================ */
.empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--c-muted);
    font-size: 0.9rem;
    border: 1px dashed var(--c-border);
    border-radius: 10px;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 600px) {
    .meta-strip {
        grid-template-columns: 1fr 1fr;
    }

    .receipt-header {
        flex-direction: column;
        align-items: flex-start;
    }
}

/* ── Buttons ── */
.ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    backdrop-filter: none;
}

.ghost-button:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.ghost-button:disabled { opacity: 0.5; cursor: not-allowed; }

/* ============================================================
   PRINT
============================================================ */
@media print {
    :global(body) {
        background: #ffffff;
    }

    :global(nav) {
        display: none !important;
    }

    .receipt-page {
        padding: 0;
        background: #ffffff;
    }

    .receipt-shell {
        max-width: none;
        margin: 0;
    }

    .meta-strip {
        border: 1px solid #e2e8f0;
    }

    .receipt-card {
        border: 1px solid #e2e8f0;
        box-shadow: none;
    }

    .no-print {
        display: none !important;
    }
}
</style>
