<template>
    <section class="supplier-page">
        <div class="supplier-shell">
            <header class="supplier-header">
                <div class="supplier-title">
                    <span class="supplier-eyebrow">Purchasing</span>
                    <h1>Supplier detail</h1>
                    <p v-if="supplier">Manage orders and receipts for {{ supplier.name }}.</p>
                    <p v-else>Review supplier activity for {{ currentStoreLabel }}.</p>
                </div>
                <div class="supplier-actions">
                    <button class="ghost-button" @click="goToSuppliers">Back to suppliers</button>
                    <button class="ghost-button" @click="goToPurchaseOrders">Back to POs</button>
                    <button v-if="supplier && canWrite" class="primary-button" @click="createPurchaseOrder">
                        Create PO
                    </button>
                    <button
                        v-if="supplier && canWrite"
                        class="ghost-button"
                        @click="toggleEdit"
                    >
                        {{ isEditing ? 'Cancel edit' : 'Edit details' }}
                    </button>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Suppliers are available on Standard."
                description="Upgrade to Standard to manage supplier analytics and linked receipts."
            />
            <template v-else>
            <section class="supplier-card">
                <div v-if="isLoading" class="panel-state">Loading supplier...</div>
                <div v-else-if="!supplier" class="panel-state">Supplier not found.</div>
                <div v-else class="supplier-body">
                    <div class="supplier-summary">
                        <div>
                            <span>Name</span>
                            <strong>{{ supplier.name }}</strong>
                        </div>
                        <div>
                            <span>Email</span>
                            <strong>{{ supplier.email || '-' }}</strong>
                        </div>
                        <div>
                            <span>Phone</span>
                            <strong>{{ supplier.phone || '-' }}</strong>
                        </div>
                        <div>
                            <span>Last updated</span>
                            <strong>{{ formatDate(supplier.updatedAt) }}</strong>
                        </div>
                        <div>
                            <span>Total POs</span>
                            <strong>{{ ordersTotal }}</strong>
                        </div>
                        <div>
                            <span>Total receipts</span>
                            <strong>{{ receiptsTotal }}</strong>
                        </div>
                    </div>

                    <div class="supplier-analytics">
                        <div class="analytics-header">
                            <div>
                                <h2>Receipt analytics</h2>
                                <p>Totals for the selected receipt filters.</p>
                            </div>
                        </div>
                        <div v-if="isSummaryLoading" class="panel-state">Loading analytics...</div>
                        <div v-else class="analytics-grid">
                            <div class="analytics-card">
                                <span class="analytics-label">Total spend</span>
                                <strong class="analytics-value">{{ formatMoney(receiptTotalSpend) }}</strong>
                                <span class="analytics-meta">{{ formatNumber(receiptCount) }} receipts</span>
                            </div>
                            <div class="analytics-card">
                                <span class="analytics-label">Avg receipt</span>
                                <strong class="analytics-value">{{ formatMoney(receiptAverage) }}</strong>
                                <span class="analytics-meta">Across the range</span>
                            </div>
                            <div class="analytics-card">
                                <span class="analytics-label">Last receipt</span>
                                <strong class="analytics-value">
                                    {{ lastReceiptAt ? formatDate(lastReceiptAt) : '-' }}
                                </strong>
                                <span class="analytics-meta">Most recent receipt</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="supplier && !canWrite" class="panel-state">
                        You have view-only access. Ask an owner or manager to update supplier details.
                    </div>

                    <form v-else-if="supplier && isEditing" class="supplier-form" @submit.prevent="saveSupplier">
                        <div v-if="formError" class="form-error">{{ formError }}</div>
                        <div class="form-grid">
                            <label class="form-field">
                                Name
                                <input v-model="editForm.name" type="text" required />
                            </label>
                            <label class="form-field">
                                Email
                                <input v-model="editForm.email" type="email" />
                            </label>
                            <label class="form-field">
                                Phone
                                <input v-model="editForm.phone" type="tel" />
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-button" @click="cancelEdit">Cancel</button>
                            <button class="primary-button" type="submit" :disabled="isSaving">
                                {{ isSaving ? 'Saving...' : 'Save changes' }}
                            </button>
                        </div>
                    </form>

                    <div class="supplier-grid">
                        <div class="supplier-panel">
                            <div class="panel-header">
                                <div>
                                    <h2>Recent purchase orders</h2>
                                    <p>Latest orders tied to this supplier.</p>
                                </div>
                                <button class="ghost-button" @click="goToPurchaseOrders">View all</button>
                            </div>

                            <div class="filter-row">
                                <label class="filter-field">
                                    <span>Status</span>
                                    <select v-model="orderStatusFilter">
                                        <option value="ALL">All statuses</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="SENT">Sent</option>
                                        <option value="PARTIALLY_RECEIVED">Partial</option>
                                        <option value="RECEIVED">Received</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </label>
                                <label class="filter-field">
                                    <span>From</span>
                                    <input v-model="orderFromDate" type="date" />
                                </label>
                                <label class="filter-field">
                                    <span>To</span>
                                    <input v-model="orderToDate" type="date" />
                                </label>
                                <div class="filter-actions">
                                    <button class="secondary-button button-compact" @click="resetOrderFilters">Reset</button>
                                    <button class="primary-button button-compact" @click="applyOrderFilters">Apply</button>
                                </div>
                            </div>

                            <div v-if="isOrdersLoading" class="panel-state">Loading purchase orders...</div>
                            <div v-else-if="purchaseOrders.length === 0" class="panel-state">
                                No purchase orders yet.
                            </div>
                            <div v-else class="table-wrap">
                                <table class="data-table table-compact">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Ordered</th>
                                            <th>Expected</th>
                                            <th class="align-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="order in purchaseOrders" :key="order.id">
                                            <td>
                                                <div class="status-pill" :class="statusClass(order.status)">
                                                    {{ formatStatus(order.status) }}
                                                </div>
                                            </td>
                                            <td>{{ formatQty(order.qtyOrdered) }}</td>
                                            <td>{{ order.expectedDate ? formatDate(order.expectedDate) : 'Anytime' }}</td>
                                            <td class="align-right table-actions">
                                                <button class="ghost-button" @click="goToPurchaseOrder(order.id)">View</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div v-if="orderTotalPages > 1" class="pagination">
                                <label class="pagination-size">
                                    <span>Rows</span>
                                    <select v-model.number="orderPageSize">
                                        <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                            {{ size }}
                                        </option>
                                    </select>
                                </label>
                                <div class="pagination-controls">
                                    <button
                                        class="ghost-button"
                                        :disabled="orderPage === 1"
                                        @click="changeOrderPage(orderPage - 1)"
                                    >
                                        Previous
                                    </button>
                                    <span>Page {{ orderPage }} of {{ orderTotalPages }}</span>
                                    <button
                                        class="ghost-button"
                                        :disabled="orderPage === orderTotalPages"
                                        @click="changeOrderPage(orderPage + 1)"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="supplier-panel">
                            <div class="panel-header">
                                <div>
                                    <h2>Recent receipts</h2>
                                    <p>Latest inbound receipts for this supplier.</p>
                                </div>
                                <button class="ghost-button" @click="goToReceipts">View all</button>
                            </div>

                            <div class="filter-row">
                                <label class="filter-field">
                                    <span>From</span>
                                    <input v-model="receiptFromDate" type="date" />
                                </label>
                                <label class="filter-field">
                                    <span>To</span>
                                    <input v-model="receiptToDate" type="date" />
                                </label>
                                <div class="filter-actions">
                                    <button class="secondary-button button-compact" @click="resetReceiptFilters">Reset</button>
                                    <button class="primary-button button-compact" @click="applyReceiptFilters">Apply</button>
                                </div>
                            </div>

                            <div v-if="isReceiptsLoading" class="panel-state">Loading receipts...</div>
                            <div v-else-if="receipts.length === 0" class="panel-state">No receipts yet.</div>
                            <div v-else class="table-wrap">
                                <table class="data-table table-compact">
                                    <thead>
                                        <tr>
                                            <th>Receipt</th>
                                            <th>Invoice</th>
                                            <th>Total</th>
                                            <th class="align-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="receipt in receipts" :key="receipt.id">
                                            <td>
                                                <div class="receipt-id">#{{ receipt.id }}</div>
                                                <div class="receipt-meta">{{ formatDate(receipt.receivedAt) }}</div>
                                            </td>
                                            <td>{{ receipt.invoiceNumber || '-' }}</td>
                                            <td>{{ formatMoney(receipt.totalCost) }}</td>
                                            <td class="align-right table-actions">
                                                <button class="ghost-button" @click="goToReceipt(receipt.id)">View</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div v-if="receiptTotalPages > 1" class="pagination">
                                <label class="pagination-size">
                                    <span>Rows</span>
                                    <select v-model.number="receiptPageSize">
                                        <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                            {{ size }}
                                        </option>
                                    </select>
                                </label>
                                <div class="pagination-controls">
                                    <button
                                        class="ghost-button"
                                        :disabled="receiptPage === 1"
                                        @click="changeReceiptPage(receiptPage - 1)"
                                    >
                                        Previous
                                    </button>
                                    <span>Page {{ receiptPage }} of {{ receiptTotalPages }}</span>
                                    <button
                                        class="ghost-button"
                                        :disabled="receiptPage === receiptTotalPages"
                                        @click="changeReceiptPage(receiptPage + 1)"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
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
    return `${store.name} - ${store.currency}`;
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

const formatStatus = (status: string) => status.replace('_', ' ');

const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'status-pill--active';
    if (status === 'CANCELLED') return 'status-pill--inactive';
    if (status === 'PARTIALLY_RECEIVED') return 'status-pill--warning';
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

.supplier-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    min-height: 100vh;
    padding: 2.5rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', sans-serif;
}

.supplier-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.supplier-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.supplier-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent);
    margin-bottom: 0.3rem;
}

.supplier-title h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0.3rem 0 0.4rem;
    letter-spacing: -0.03em;
    color: var(--c-text);
}

.supplier-title p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
}

.supplier-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
    flex-shrink: 0;
    padding-top: 0.25rem;
}

.supplier-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.panel-state {
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    background: var(--c-bg);
    color: var(--c-muted);
    font-size: 0.9rem;
}

.supplier-body {
    display: grid;
    gap: 2rem;
}

.supplier-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--c-muted);
}

.supplier-summary strong {
    display: block;
    margin-top: 0.2rem;
    color: var(--c-text);
    font-size: 1rem;
}

.supplier-analytics {
    display: grid;
    gap: 1rem;
}

.analytics-header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.2rem;
}

.analytics-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
}

.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.supplier-form {
    display: grid;
    gap: 1rem;
    padding: 1rem 1.2rem;
    border-radius: 10px;
    border: 1px solid rgba(13, 148, 136, 0.2);
    background: rgba(13, 148, 136, 0.04);
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}

.form-field {
    display: grid;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--c-muted);
    font-weight: 600;
}

.form-field input {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    font-family: 'Inter', sans-serif;
    transition: border-color 0.15s;
}

.form-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.form-error {
    border-radius: 8px;
    background: #fff5f5;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 0.6rem 0.9rem;
    font-weight: 600;
    font-size: 0.85rem;
}

.supplier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.supplier-panel {
    background: var(--c-surface);
    border-radius: 14px;
    padding: 1.5rem;
    border: 1px solid var(--c-border);
    display: grid;
    gap: 1.2rem;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.panel-header h2 {
    margin: 0 0 0.2rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
}

.panel-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.85rem;
}

.filter-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    align-items: end;
    margin-top: 0.5rem;
}

.filter-field {
    display: grid;
    gap: 0.35rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    font-weight: 600;
}

.filter-field select,
.filter-field input {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.55rem 0.75rem;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    font-family: 'Inter', sans-serif;
    text-transform: none;
    letter-spacing: normal;
}

.filter-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; }

.secondary-button {
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
}

.secondary-button:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.secondary-button:disabled { opacity: 0.5; cursor: not-allowed; }

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
}

.data-table td {
    padding: 0.8rem 0.5rem;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: rgba(15, 118, 110, 0.12);
    color: var(--c-accent-dark);
}

.status-pill--inactive {
    background: rgba(148, 163, 184, 0.2);
    color: #475569;
}

.status-pill--active {
    background: rgba(16, 185, 129, 0.18);
    color: #047857;
}

.status-pill--warning {
    background: rgba(234, 179, 8, 0.2);
    color: #92400e;
}

.receipt-id {
    font-weight: 600;
}

.receipt-meta {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.pagination {
    justify-content: flex-end;
    color: var(--c-muted);
    font-size: 0.85rem;
    gap: 0.75rem;
}

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

@media (max-width: 720px) {
    .supplier-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
