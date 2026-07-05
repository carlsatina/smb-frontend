<template>
    <section class="supplier-page">
        <div class="supplier-shell">
            <header class="detail-header">
                <button type="button" class="back-link" @click="goToSuppliers">
                    <mdicon name="arrow-left" size="15" />
                    Suppliers
                </button>
                <div class="detail-header-row">
                    <div class="detail-title">
                        <h1>{{ supplier?.name || 'Supplier' }}</h1>
                        <p>Orders, receipts, and contact details for {{ currentStoreLabel }}.</p>
                    </div>
                    <div class="header-actions" v-if="supplier && canWrite">
                        <button class="ghost-button" @click="toggleEdit">
                            <mdicon :name="isEditing ? 'close' : 'pencil-outline'" size="15" />
                            {{ isEditing ? 'Cancel edit' : 'Edit details' }}
                        </button>
                        <button class="primary-button" @click="createPurchaseOrder">
                            <mdicon name="plus" size="16" />
                            New purchase order
                        </button>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Suppliers are available on Standard."
                description="Upgrade to Standard to manage supplier analytics and linked receipts."
            />

            <div v-else-if="isLoading" class="panel-state">Loading supplier…</div>

            <div v-else-if="!supplier" class="panel-state">Supplier not found.</div>

            <template v-else>
                <!-- ── Summary ── -->
                <section class="detail-card">
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span>Email</span>
                            <strong>{{ supplier.email || '—' }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Phone</span>
                            <strong>{{ supplier.phone || '—' }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Updated</span>
                            <strong>{{ formatDate(supplier.updatedAt) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Orders</span>
                            <strong>{{ formatNumber(ordersTotal) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Receipts</span>
                            <strong>{{ formatNumber(receiptCount) }}</strong>
                        </div>
                        <div class="meta-item meta-item--highlight">
                            <span>Total spend</span>
                            <strong>{{ formatMoney(receiptTotalSpend) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Avg receipt</span>
                            <strong>{{ formatMoney(receiptAverage) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Last receipt</span>
                            <strong>{{ lastReceiptAt ? formatDate(lastReceiptAt) : '—' }}</strong>
                        </div>
                    </div>
                </section>

                <!-- ── Edit details ── -->
                <section v-if="isEditing && canWrite" class="detail-card">
                    <div class="card-title">
                        <h2>Edit details</h2>
                    </div>
                    <form class="edit-form" @submit.prevent="saveSupplier">
                        <div v-if="formError" class="form-alert">{{ formError }}</div>
                        <div class="form-grid">
                            <label class="form-field">
                                <span>Name</span>
                                <input v-model="editForm.name" type="text" required />
                            </label>
                            <label class="form-field">
                                <span>Email <em>optional</em></span>
                                <input v-model="editForm.email" type="email" />
                            </label>
                            <label class="form-field">
                                <span>Phone <em>optional</em></span>
                                <input v-model="editForm.phone" type="tel" />
                            </label>
                        </div>
                        <div class="edit-actions">
                            <button type="button" class="ghost-button" @click="cancelEdit">Cancel</button>
                            <button class="primary-button primary-button--sm" type="submit" :disabled="isSaving">
                                {{ isSaving ? 'Saving…' : 'Save changes' }}
                            </button>
                        </div>
                    </form>
                </section>

                <!-- ── Orders & receipts ── -->
                <div class="panels-grid">
                    <section class="detail-card">
                        <div class="card-title card-title--row">
                            <div>
                                <h2>Purchase orders</h2>
                                <p>Orders tied to this supplier</p>
                            </div>
                            <button class="card-link" type="button" @click="goToPurchaseOrders">
                                View all
                                <mdicon name="chevron-right" size="14" />
                            </button>
                        </div>

                        <div class="filter-row">
                            <select v-model="orderStatusFilter" class="filter-select">
                                <option value="ALL">All statuses</option>
                                <option value="DRAFT">Draft</option>
                                <option value="SENT">Sent</option>
                                <option value="PARTIALLY_RECEIVED">Partial</option>
                                <option value="RECEIVED">Received</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <input v-model="orderFromDate" type="date" class="filter-date" aria-label="Orders from date" />
                            <input v-model="orderToDate" type="date" class="filter-date" aria-label="Orders to date" />
                            <button class="ghost-button ghost-button--sm" @click="resetOrderFilters">Reset</button>
                            <button class="ghost-button ghost-button--sm ghost-button--apply" @click="applyOrderFilters">Apply</button>
                        </div>

                        <SkeletonLoader v-if="isOrdersLoading" :rows="4" label="Loading purchase orders…" />
                        <div v-else-if="purchaseOrders.length === 0" class="panel-state panel-state--small">
                            No purchase orders for this supplier yet.
                        </div>
                        <div v-else class="mini-table-wrap">
                            <table class="mini-table">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th class="num">Ordered</th>
                                        <th>Expected</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="order in purchaseOrders"
                                        :key="order.id"
                                        class="row-clickable"
                                        @click="goToPurchaseOrder(order.id)"
                                    >
                                        <td>
                                            <span class="status-pill" :class="statusClass(order.status)">
                                                {{ formatStatus(order.status) }}
                                            </span>
                                        </td>
                                        <td class="num">{{ formatQty(order.qtyOrdered) }}</td>
                                        <td class="date-cell">{{ order.expectedDate ? formatDate(order.expectedDate) : 'Anytime' }}</td>
                                        <td class="col-open">
                                            <mdicon name="chevron-right" size="16" class="row-chevron" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="orderTotalPages > 1" class="mini-pagination">
                            <button class="page-btn" :disabled="orderPage === 1" @click="changeOrderPage(orderPage - 1)" aria-label="Previous page">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="page-indicator">{{ orderPage }} / {{ orderTotalPages }}</span>
                            <button class="page-btn" :disabled="orderPage === orderTotalPages" @click="changeOrderPage(orderPage + 1)" aria-label="Next page">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </section>

                    <section class="detail-card">
                        <div class="card-title card-title--row">
                            <div>
                                <h2>Receipts</h2>
                                <p>Inbound deliveries from this supplier</p>
                            </div>
                            <button class="card-link" type="button" @click="goToReceipts">
                                View all
                                <mdicon name="chevron-right" size="14" />
                            </button>
                        </div>

                        <div class="filter-row">
                            <input v-model="receiptFromDate" type="date" class="filter-date" aria-label="Receipts from date" />
                            <input v-model="receiptToDate" type="date" class="filter-date" aria-label="Receipts to date" />
                            <button class="ghost-button ghost-button--sm" @click="resetReceiptFilters">Reset</button>
                            <button class="ghost-button ghost-button--sm ghost-button--apply" @click="applyReceiptFilters">Apply</button>
                        </div>

                        <SkeletonLoader v-if="isReceiptsLoading" :rows="4" label="Loading receipts…" />
                        <div v-else-if="receipts.length === 0" class="panel-state panel-state--small">
                            No receipts from this supplier yet.
                        </div>
                        <div v-else class="mini-table-wrap">
                            <table class="mini-table">
                                <thead>
                                    <tr>
                                        <th>Receipt</th>
                                        <th>Invoice</th>
                                        <th class="num">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="receipt in receipts"
                                        :key="receipt.id"
                                        class="row-clickable"
                                        @click="goToReceipt(receipt.id)"
                                    >
                                        <td>
                                            <div class="receipt-id" :title="receipt.id">#{{ receipt.id.slice(0, 8) }}</div>
                                            <div class="receipt-meta">{{ formatDate(receipt.receivedAt) }}</div>
                                        </td>
                                        <td class="date-cell">{{ receipt.invoiceNumber || '—' }}</td>
                                        <td class="num">{{ formatMoney(receipt.totalCost) }}</td>
                                        <td class="col-open">
                                            <mdicon name="chevron-right" size="16" class="row-chevron" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="receiptTotalPages > 1" class="mini-pagination">
                            <button class="page-btn" :disabled="receiptPage === 1" @click="changeReceiptPage(receiptPage - 1)" aria-label="Previous page">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="page-indicator">{{ receiptPage }} / {{ receiptTotalPages }}</span>
                            <button class="page-btn" :disabled="receiptPage === receiptTotalPages" @click="changeReceiptPage(receiptPage + 1)" aria-label="Next page">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </section>
                </div>
            </template>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getSupplier, Supplier, updateSupplier } from '@/api/suppliers';
import {
    getPurchaseReceiptSummary,
    listPurchaseOrders,
    listPurchaseReceipts,
    PurchaseOrderSummary,
    PurchaseReceiptAnalytics,
    PurchaseReceiptSummary,
} from '@/api/purchaseOrders';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import { zonedDayStartIso, zonedDayEndIso } from '@/utils/datetime';
import PlanGate from '@/components/PlanGate.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const supplier = ref<Supplier | null>(null);
const isLoading = ref(false);
const isOrdersLoading = ref(false);
const isReceiptsLoading = ref(false);
const isSummaryLoading = ref(false);
const purchaseOrders = ref<PurchaseOrderSummary[]>([]);
const receipts = ref<PurchaseReceiptSummary[]>([]);
const receiptSummary = ref<PurchaseReceiptAnalytics | null>(null);
const orderStatusFilter = ref('ALL');
const orderFromDate = ref('');
const orderToDate = ref('');
const receiptFromDate = ref('');
const receiptToDate = ref('');
const orderPage = ref(1);
const orderPageSize = ref(5);
const receiptPage = ref(1);
const receiptPageSize = ref(5);
const pageSizeOptions = [5, 10, 20];
const ordersTotal = ref(0);
const receiptsTotal = ref(0);
const isEditing = ref(false);
const isSaving = ref(false);
const formError = ref('');

const editForm = reactive({
    name: '',
    email: '',
    phone: '',
});

const routeStoreId = computed(() => route.params.storeId as string | undefined);
const supplierId = computed(() => route.params.supplierId as string | undefined);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrdersWrite'));
// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);
const orderTotalPages = computed(() => Math.max(1, Math.ceil(ordersTotal.value / orderPageSize.value)));
const receiptTotalPages = computed(() => Math.max(1, Math.ceil(receiptsTotal.value / receiptPageSize.value)));
const receiptTotalSpend = computed(() => receiptSummary.value?.totalSpend ?? 0);
const receiptAverage = computed(() => receiptSummary.value?.avgReceipt ?? 0);
const receiptCount = computed(() => receiptSummary.value?.totalReceipts ?? 0);
const lastReceiptAt = computed(() => receipts.value[0]?.receivedAt ?? null);

const toIsoRange = (value: string, endOfDay: boolean) => {
    if (!value) return undefined;
    const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
    return endOfDay ? zonedDayEndIso(value, timeZone) : zonedDayStartIso(value, timeZone);
};

const loadSupplier = async () => {
    if (isPlanLocked.value) {
        supplier.value = null;
        return;
    }
    if (!routeStoreId.value || !supplierId.value) {
        supplier.value = null;
        return;
    }
    isLoading.value = true;
    try {
        const data = await getSupplier(routeStoreId.value, supplierId.value);
        supplier.value = data.supplier;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load supplier.';
        showToast(message, 'error');
        supplier.value = null;
    } finally {
        isLoading.value = false;
    }
};

const loadReceiptSummary = async () => {
    if (isPlanLocked.value) {
        receiptSummary.value = null;
        return;
    }
    if (!routeStoreId.value || !supplierId.value) {
        receiptSummary.value = null;
        return;
    }
    isSummaryLoading.value = true;
    try {
        const fromValue = toIsoRange(receiptFromDate.value, false);
        const toValue = toIsoRange(receiptToDate.value, true);
        const data = await getPurchaseReceiptSummary(routeStoreId.value, {
            supplierId: supplierId.value,
            from: fromValue,
            to: toValue,
        });
        receiptSummary.value = data.summary;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load receipt analytics.';
        showToast(message, 'error');
        receiptSummary.value = null;
    } finally {
        isSummaryLoading.value = false;
    }
};

const loadOrders = async () => {
    if (isPlanLocked.value) {
        purchaseOrders.value = [];
        ordersTotal.value = 0;
        return;
    }
    if (!routeStoreId.value || !supplierId.value) {
        purchaseOrders.value = [];
        ordersTotal.value = 0;
        return;
    }
    isOrdersLoading.value = true;
    try {
        const fromValue = toIsoRange(orderFromDate.value, false);
        const toValue = toIsoRange(orderToDate.value, true);
        const data = await listPurchaseOrders(routeStoreId.value, {
            supplierId: supplierId.value,
            status: orderStatusFilter.value === 'ALL' ? undefined : orderStatusFilter.value,
            from: fromValue,
            to: toValue,
            page: orderPage.value,
            pageSize: orderPageSize.value,
        });
        purchaseOrders.value = data.purchaseOrders;
        ordersTotal.value = data.total;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load purchase orders.';
        showToast(message, 'error');
    } finally {
        isOrdersLoading.value = false;
    }
};

const loadReceipts = async () => {
    if (isPlanLocked.value) {
        receipts.value = [];
        receiptsTotal.value = 0;
        return;
    }
    if (!routeStoreId.value || !supplierId.value) {
        receipts.value = [];
        receiptsTotal.value = 0;
        return;
    }
    isReceiptsLoading.value = true;
    try {
        const fromValue = toIsoRange(receiptFromDate.value, false);
        const toValue = toIsoRange(receiptToDate.value, true);
        const data = await listPurchaseReceipts(routeStoreId.value, {
            supplierId: supplierId.value,
            from: fromValue,
            to: toValue,
            page: receiptPage.value,
            pageSize: receiptPageSize.value,
        });
        receipts.value = data.receipts;
        receiptsTotal.value = data.total;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load receipts.';
        showToast(message, 'error');
    } finally {
        isReceiptsLoading.value = false;
    }
};

const goToSuppliers = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/suppliers`);
};

const goToPurchaseOrders = () => {
    if (!routeStoreId.value) return;
    const query: Record<string, string> = {};
    if (supplierId.value) {
        query.supplierId = supplierId.value;
    }
    if (orderStatusFilter.value !== 'ALL') {
        query.status = orderStatusFilter.value;
    }
    if (orderFromDate.value) {
        query.from = orderFromDate.value;
    }
    if (orderToDate.value) {
        query.to = orderToDate.value;
    }
    router.push({ path: `/stores/${routeStoreId.value}/purchase-orders`, query });
};

const createPurchaseOrder = () => {
    if (!routeStoreId.value || !supplierId.value) return;
    router.push({
        path: `/stores/${routeStoreId.value}/purchase-orders`,
        query: { supplierId: supplierId.value, createSupplierId: supplierId.value },
    });
};

const goToReceipts = () => {
    if (!routeStoreId.value) return;
    const query: Record<string, string> = {};
    if (supplierId.value) {
        query.supplierId = supplierId.value;
    }
    if (receiptFromDate.value) {
        query.from = receiptFromDate.value;
    }
    if (receiptToDate.value) {
        query.to = receiptToDate.value;
    }
    router.push({ path: `/stores/${routeStoreId.value}/purchase-orders/receipts`, query });
};

const goToPurchaseOrder = (purchaseOrderId: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders/${purchaseOrderId}`);
};

const goToReceipt = (receiptId: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders/receipts/${receiptId}`);
};

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    PARTIALLY_RECEIVED: 'Partial',
    RECEIVED: 'Received',
    CANCELLED: 'Cancelled',
};

const formatStatus = (status: string) => STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'status-pill--active';
    if (status === 'CANCELLED') return 'status-pill--inactive';
    if (status === 'PARTIALLY_RECEIVED') return 'status-pill--warning';
    if (status === 'DRAFT') return 'status-pill--draft';
    return '';
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const applyOrderFilters = async () => {
    orderPage.value = 1;
    await loadOrders();
};

const resetOrderFilters = async () => {
    orderStatusFilter.value = 'ALL';
    orderFromDate.value = '';
    orderToDate.value = '';
    orderPage.value = 1;
    await loadOrders();
};

const changeOrderPage = async (nextPage: number) => {
    orderPage.value = nextPage;
    await loadOrders();
};

const applyReceiptFilters = async () => {
    receiptPage.value = 1;
    await Promise.all([loadReceipts(), loadReceiptSummary()]);
};

const resetReceiptFilters = async () => {
    receiptFromDate.value = '';
    receiptToDate.value = '';
    receiptPage.value = 1;
    await Promise.all([loadReceipts(), loadReceiptSummary()]);
};

const changeReceiptPage = async (nextPage: number) => {
    receiptPage.value = nextPage;
    await loadReceipts();
};

const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString();
};

const loadAll = async () => {
    if (isPlanLocked.value) {
        supplier.value = null;
        purchaseOrders.value = [];
        receipts.value = [];
        receiptSummary.value = null;
        return;
    }
    await Promise.all([loadSupplier(), loadOrders(), loadReceipts(), loadReceiptSummary()]);
};

const syncEditForm = () => {
    if (!supplier.value) return;
    editForm.name = supplier.value.name;
    editForm.email = supplier.value.email || '';
    editForm.phone = supplier.value.phone || '';
};

const toggleEdit = () => {
    if (!canWrite.value || !supplier.value) return;
    if (isEditing.value) {
        cancelEdit();
        return;
    }
    syncEditForm();
    formError.value = '';
    isEditing.value = true;
};

const cancelEdit = () => {
    isEditing.value = false;
    formError.value = '';
    syncEditForm();
};

const saveSupplier = async () => {
    if (!routeStoreId.value || !supplier.value || !canWrite.value) return;
    if (!editForm.name.trim()) {
        formError.value = 'Supplier name is required.';
        return;
    }
    isSaving.value = true;
    formError.value = '';
    try {
        const payload = {
            name: editForm.name.trim(),
            email: editForm.email.trim() ? editForm.email.trim() : null,
            phone: editForm.phone.trim() ? editForm.phone.trim() : null,
        };
        const data = await updateSupplier(routeStoreId.value, supplier.value.id, payload);
        supplier.value = data.supplier;
        syncEditForm();
        isEditing.value = false;
        showToast('Supplier updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update supplier.';
        formError.value = message;
    } finally {
        isSaving.value = false;
    }
};

watch(
    () => supplier.value?.id,
    () => {
        if (!isEditing.value) {
            syncEditForm();
        }
    }
);

watch(
    () => orderPageSize.value,
    async () => {
        orderPage.value = 1;
        await loadOrders();
    }
);

watch(
    () => receiptPageSize.value,
    async () => {
        receiptPage.value = 1;
        await loadReceipts();
    }
);

onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    await loadAll();
});

watch(
    () => routeStoreId.value,
    async (storeId) => {
        if (storeId && storeId !== storeContext.currentStoreId) {
            storeContext.setCurrentStore(storeId);
        }
        await loadAll();
    }
);

watch(
    () => supplierId.value,
    async () => {
        orderPage.value = 1;
        receiptPage.value = 1;
        isEditing.value = false;
        formError.value = '';
        await loadAll();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.supplier-page {
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
.supplier-shell {
    max-width: 1000px;
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
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
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
    gap: 1rem;
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

.card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    border: none;
    background: none;
    padding: 0;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.card-link:hover { text-decoration: underline; }

.panel-state {
    padding: 2rem;
    border-radius: 12px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

.panel-state--small {
    padding: 1.5rem 1rem;
    font-size: 0.82rem;
}

/* ============================================================
   META GRID
============================================================ */
.meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
.meta-item--highlight > strong { color: var(--c-accent-dark); }

/* ============================================================
   EDIT FORM
============================================================ */
.edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}

.form-field > span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.form-field > span em {
    font-style: normal;
    font-weight: 400;
    color: var(--c-muted);
}

.form-field input {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.form-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-alert {
    border-radius: 10px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #b91c1c;
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
}

/* ============================================================
   PANELS GRID
============================================================ */
.panels-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    align-items: start;
}

.filter-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.filter-select,
.filter-date {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.8rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 0;
}

.filter-select { flex: 1; min-width: 96px; }
.filter-date { flex: 1; min-width: 96px; max-width: 150px; }

.filter-select:focus,
.filter-date:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   MINI TABLES
============================================================ */
.mini-table-wrap { overflow-x: auto; min-width: 0; }

.mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
}

.mini-table thead th {
    padding: 0.5rem 0.6rem;
    text-align: left;
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.mini-table thead th.num { text-align: right; }

.mini-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.12s;
}

.mini-table tbody tr:last-child { border-bottom: none; }
.mini-table tbody tr:hover { background: #f8fafc; }
.mini-table tbody tr.row-clickable { cursor: pointer; }

.mini-table tbody td {
    padding: 0.65rem 0.6rem;
    vertical-align: middle;
}

.mini-table td.num {
    text-align: right;
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.date-cell {
    color: var(--c-muted);
    font-size: 0.8rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.receipt-id {
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.receipt-meta {
    font-size: 0.72rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
    white-space: nowrap;
}

.col-open { text-align: right; width: 26px; }
.row-chevron { color: #cbd5e1; }
.mini-table tbody tr:hover .row-chevron { color: var(--c-accent-dark); }

/* ── Status pills ── */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.64rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(148, 163, 184, 0.15);
    color: var(--c-muted);
    white-space: nowrap;
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }
.status-pill--warning { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.status-pill--draft { background: rgba(99, 102, 241, 0.1); color: #4338ca; }

.mini-pagination {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
}

.page-indicator {
    font-size: 0.8rem;
    color: var(--c-muted);
    min-width: 44px;
    text-align: center;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    border-radius: 9px;
    border: none;
    background: var(--c-accent);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.primary-button--sm {
    padding: 0.5rem 0.9rem;
    font-size: 0.82rem;
}

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

.ghost-button--sm {
    padding: 0.45rem 0.75rem;
    font-size: 0.78rem;
}

.ghost-button--apply {
    color: var(--c-accent-dark);
    border-color: rgba(13, 148, 136, 0.4);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 900px) {
    .panels-grid { grid-template-columns: 1fr; }
    .meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
    .supplier-page { padding: 1rem 0.875rem 2.5rem; }
    .supplier-shell { gap: 0.875rem; }
    .detail-title h1 { font-size: 1.35rem; }

    .header-actions { width: 100%; }
    .header-actions .ghost-button,
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .detail-card { padding: 1.1rem; border-radius: 12px; }
    .form-grid { grid-template-columns: 1fr; }
}
</style>
