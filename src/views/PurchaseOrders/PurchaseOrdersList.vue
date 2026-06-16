<template>
    <section class="po-page">
        <div class="po-shell">

            <!-- HEADER -->
            <header class="po-header">
                <div class="po-title">
                    <span class="po-eyebrow">Purchasing</span>
                    <h1>Purchase orders</h1>
                    <p>Plan inbound stock and track receiving for {{ currentStoreLabel }}.</p>
                </div>
                <div class="po-kpis">
                    <div class="kpi-card">
                        <span class="kpi-label">Open POs</span>
                        <span class="kpi-value">{{ openCount }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Received</span>
                        <span class="kpi-value">{{ receivedCount }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Total orders</span>
                        <span class="kpi-value">{{ totalCount }}</span>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Purchase orders are available on Standard."
                description="Upgrade to Standard to manage suppliers, draft purchase orders, and receive inventory."
            />

            <template v-else>
                <!-- TOOLBAR -->
                <div class="po-toolbar">
                    <div class="toolbar-left">
                        <input
                            v-model="searchQuery"
                            type="text"
                            class="search-input"
                            placeholder="Search supplier or reference..."
                        />
                        <div class="filter-pills">
                            <button
                                v-for="opt in statusOptions"
                                :key="opt.value"
                                class="filter-pill"
                                :class="{ active: statusFilter === opt.value }"
                                type="button"
                                @click="statusFilter = opt.value"
                            >{{ opt.label }}</button>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <button class="ghost-button" @click="goToReceipts">Receipts</button>
                        <button class="ghost-button" @click="goToSuppliers">Suppliers</button>
                        <button class="primary-button" :disabled="!storeContext.currentStoreId" @click="createOrder">
                            + New purchase order
                        </button>
                    </div>
                </div>

                <!-- DATE RANGE -->
                <div class="date-row">
                    <label class="date-field">
                        <span>From</span>
                        <input v-model="fromDate" type="date" class="date-input" />
                    </label>
                    <label class="date-field">
                        <span>To</span>
                        <input v-model="toDate" type="date" class="date-input" />
                    </label>
                    <select v-model="supplierFilter" class="supplier-select">
                        <option value="">All suppliers</option>
                        <option value="UNASSIGNED">Unassigned</option>
                        <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                            {{ supplier.name }}
                        </option>
                    </select>
                </div>

                <!-- TABLE -->
                <div class="po-panel">
                    <div v-if="!storeContext.currentStoreId" class="panel-state">
                        Select or create a store to manage purchase orders.
                    </div>
                    <SkeletonLoader v-else-if="isLoading" :rows="6" label="Loading purchase orders…" />
                    <div v-else class="table-wrap">
                        <table class="po-table">
                            <thead>
                                <tr>
                                    <th>Supplier</th>
                                    <th>Status</th>
                                    <th>Receiving progress</th>
                                    <th>Expected</th>
                                    <th>Created</th>
                                    <th class="align-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="order in paginatedOrders"
                                    :key="order.id"
                                    :class="{ 'row-overdue': isOverdue(order) }"
                                >
                                    <td>
                                        <div class="supplier-name">{{ order.supplierName || 'Unassigned' }}</div>
                                        <div v-if="order.latestInvoiceNumber && (order.status === 'RECEIVED' || order.status === 'PARTIALLY_RECEIVED')" class="invoice-tag">
                                            <mdicon name="file-document-outline" size="11" />
                                            {{ order.latestInvoiceNumber }}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-pill" :class="statusClass(order.status)">
                                            {{ formatStatus(order.status) }}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-bar-wrap">
                                                <div
                                                    class="progress-bar-fill"
                                                    :style="{ width: receiveProgress(order) + '%' }"
                                                    :class="{ 'progress-bar-fill--done': receiveProgress(order) >= 100 }"
                                                ></div>
                                            </div>
                                            <span class="progress-label">{{ formatQty(order.qtyReceived) }} / {{ formatQty(order.qtyOrdered) }}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            v-if="order.expectedDate"
                                            :class="{ 'date-overdue': isOverdue(order), 'date-soon': isSoon(order) }"
                                        >
                                            {{ formatDate(order.expectedDate) }}
                                        </span>
                                        <span v-else class="date-anytime">Anytime</span>
                                    </td>
                                    <td class="date-muted">{{ formatDate(order.createdAt) }}</td>
                                    <td class="table-actions">
                                        <button class="ghost-button ghost-button--sm" @click="openOrder(order.id)">View</button>
                                    </td>
                                </tr>
                                <tr v-if="purchaseOrders.length === 0">
                                    <td colspan="6" class="empty-state">No purchase orders match your filters.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- PAGINATION -->
                    <div class="pagination">
                        <div class="pagination-info">
                            <span>{{ totalCount }} order{{ totalCount !== 1 ? 's' : '' }}</span>
                            <label class="pagination-size">
                                <span>Show</span>
                                <select v-model.number="pageSize">
                                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                                </select>
                            </label>
                        </div>
                        <div v-if="totalPages > 1" class="pagination-controls">
                            <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
                            <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </div>
                </div>
            </template>

        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { listPurchaseOrders, PurchaseOrderSummary } from '@/api/purchaseOrders';
import { listSuppliers, Supplier } from '@/api/suppliers';
import { useStoreContextStore } from '@/stores/storeContext';
import { hasPlanFeature } from '@/utils/planAccess';
import { zonedDayStartIso, zonedDayEndIso } from '@/utils/datetime';
import PlanGate from '@/components/PlanGate.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();

const purchaseOrders = ref<PurchaseOrderSummary[]>([]);
const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const statusFilter = ref('ALL');
const supplierFilter = ref('');
const fromDate = ref('');
const toDate = ref('');
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];
const totalCount = ref(0);
const openCountValue = ref(0);
const receivedCountValue = ref(0);
const isApplyingQuery = ref(false);

const statusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PARTIALLY_RECEIVED', label: 'Partial' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () => !ownerSubscriptionActive.value || (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);

const totalPages = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.ceil(totalCount.value / pageSize.value);
});

const paginatedOrders = computed(() => purchaseOrders.value);
const openCount = computed(() => openCountValue.value);
const receivedCount = computed(() => receivedCountValue.value);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'Select a store to get started.';
    return `${store.name} · ${store.currency}`;
});

const loadOrders = async () => {
    if (isPlanLocked.value) { purchaseOrders.value = []; totalCount.value = 0; openCountValue.value = 0; receivedCountValue.value = 0; return; }
    const storeId = storeContext.currentStoreId;
    if (!storeId) { purchaseOrders.value = []; totalCount.value = 0; openCountValue.value = 0; receivedCountValue.value = 0; return; }
    isLoading.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const data = await listPurchaseOrders(storeId, {
            status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
            supplierId: supplierFilter.value || undefined,
            q: searchQuery.value.trim() || undefined,
            from: fromValue,
            to: toValue,
            page: page.value,
            pageSize: pageSize.value,
        });
        purchaseOrders.value = data.purchaseOrders;
        totalCount.value = data.total;
        if (data.summary) {
            openCountValue.value = data.summary.openCount;
            receivedCountValue.value = data.summary.receivedCount;
        } else {
            openCountValue.value = data.purchaseOrders.filter((o) => !['RECEIVED', 'CANCELLED'].includes(o.status)).length;
            receivedCountValue.value = data.purchaseOrders.filter((o) => o.status === 'RECEIVED').length;
        }
    } finally {
        isLoading.value = false;
    }
};

const loadSuppliers = async () => {
    if (isPlanLocked.value) { suppliers.value = []; return; }
    const storeId = storeContext.currentStoreId;
    if (!storeId) { suppliers.value = []; return; }
    const data = await listSuppliers(storeId);
    suppliers.value = data.suppliers;
};

const changePage = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
    await loadOrders();
};

const createOrder = () => {
    const storeId = storeContext.currentStoreId;
    if (storeId) router.push(`/stores/${storeId}/purchase-orders/new`);
};

const openOrder = (purchaseOrderId: string) => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/purchase-orders/${purchaseOrderId}`);
};

const goToReceipts = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/purchase-orders/receipts`);
};

const goToSuppliers = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/suppliers`);
};

const formatStatus = (status: string) => status.replace(/_/g, ' ');

const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'status-pill--active';
    if (status === 'CANCELLED') return 'status-pill--inactive';
    if (status === 'PARTIALLY_RECEIVED') return 'status-pill--warning';
    if (status === 'DRAFT') return 'status-pill--draft';
    return '';
};

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const receiveProgress = (order: PurchaseOrderSummary) => {
    const ordered = Number(order.qtyOrdered) || 0;
    const received = Number(order.qtyReceived) || 0;
    if (ordered === 0) return 0;
    return Math.min(100, Math.round((received / ordered) * 100));
};

const isOverdue = (order: PurchaseOrderSummary) => {
    if (!order.expectedDate) return false;
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) return false;
    return new Date(order.expectedDate) < new Date();
};

const isSoon = (order: PurchaseOrderSummary) => {
    if (!order.expectedDate) return false;
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) return false;
    if (isOverdue(order)) return false;
    const diff = new Date(order.expectedDate).getTime() - Date.now();
    return diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
};

const applyQueryFilters = async () => {
    if (isPlanLocked.value) return false;
    const query = route.query;
    const hasQuery = ['status', 'supplierId', 'from', 'to', 'q'].some((key) => query[key] !== undefined);
    if (!hasQuery) return false;
    const normalizeDateParam = (value: unknown) => {
        if (typeof value !== 'string') return '';
        if (value.includes('T')) return value.slice(0, 10);
        return value;
    };
    isApplyingQuery.value = true;
    statusFilter.value = typeof query.status === 'string' ? query.status : 'ALL';
    supplierFilter.value = typeof query.supplierId === 'string' ? query.supplierId : '';
    fromDate.value = normalizeDateParam(query.from);
    toDate.value = normalizeDateParam(query.to);
    searchQuery.value = typeof query.q === 'string' ? query.q : '';
    await nextTick();
    isApplyingQuery.value = false;
    page.value = 1;
    await loadOrders();
    return true;
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) storeContext.setCurrentStore(routeStoreId);
    if (isPlanLocked.value) return;
    await loadSuppliers();
    const applied = await applyQueryFilters();
    if (!applied) await loadOrders();
});

watch(() => storeContext.currentStoreId, async () => {
    if (isPlanLocked.value) return;
    supplierFilter.value = '';
    page.value = 1;
    await loadSuppliers();
    const applied = await applyQueryFilters();
    if (!applied) await loadOrders();
});

watch(() => route.query, async () => { await applyQueryFilters(); });

watch(statusFilter, async () => { if (isPlanLocked.value || isApplyingQuery.value) return; page.value = 1; await loadOrders(); });
watch(supplierFilter, async () => { if (isPlanLocked.value || isApplyingQuery.value) return; page.value = 1; await loadOrders(); });
watch([fromDate, toDate], async () => { if (isPlanLocked.value || isApplyingQuery.value) return; page.value = 1; await loadOrders(); });

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(searchQuery, () => {
    if (isPlanLocked.value || isApplyingQuery.value) return;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { page.value = 1; loadOrders(); }, 300);
});

watch(() => pageSize.value, async () => { if (isPlanLocked.value) return; page.value = 1; await loadOrders(); });

watch(() => totalCount.value, async () => {
    if (page.value > totalPages.value && totalPages.value > 0) { page.value = totalPages.value; await loadOrders(); }
    else if (totalPages.value === 0) { page.value = 1; }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.po-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    min-height: 100vh;
    padding: 2rem 1.5rem 3rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.po-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* HEADER */
.po-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.po-eyebrow {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-accent);
    background: rgba(13, 148, 136, 0.08);
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    margin-bottom: 0.6rem;
}

.po-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
}

.po-title p {
    color: var(--c-muted);
    max-width: 460px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* KPI CARDS */
.po-kpis {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.kpi-card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.9rem 1.25rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    min-width: 120px;
}

.kpi-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.kpi-value {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1;
}

/* TOOLBAR */
.po-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
}

.toolbar-left {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-wrap: wrap;
    flex: 1;
}

.toolbar-right {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-shrink: 0;
}

.search-input {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.58rem 0.9rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    min-width: 220px;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* STATUS FILTER PILLS */
.filter-pills {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 8px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
}

.filter-pill {
    border: none;
    background: transparent;
    padding: 0.32rem 0.75rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-muted);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.filter-pill:hover { color: var(--c-text); }

.filter-pill.active {
    background: var(--c-surface);
    color: var(--c-accent-dark);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
}

/* DATE ROW */
.date-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    flex-wrap: wrap;
}

.date-field {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.date-input,
.supplier-select {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.date-input:focus,
.supplier-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.supplier-select {
    min-width: 180px;
    align-self: flex-end;
}

/* MAIN PANEL */
.po-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

/* TABLE */
.table-wrap { overflow-x: auto; }

.po-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.po-table thead th {
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    background: #f8fafc;
    white-space: nowrap;
}

.po-table thead th.align-right { text-align: right; }

.po-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.po-table tbody tr:last-child { border-bottom: none; }
.po-table tbody tr:hover { background: #f8fafc; }

.po-table tbody tr.row-overdue {
    background: #fff8f8;
}

.po-table tbody tr.row-overdue:hover { background: #fef2f2; }

.po-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.supplier-name {
    font-weight: 600;
    color: var(--c-text);
}

.invoice-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.08);
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    margin-top: 0.25rem;
}

/* STATUS PILLS */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    background: rgba(148, 163, 184, 0.15);
    color: var(--c-muted);
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }
.status-pill--warning { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.status-pill--draft { background: rgba(99, 102, 241, 0.1); color: #4338ca; }

/* PROGRESS BAR */
.progress-cell {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 140px;
}

.progress-bar-wrap {
    flex: 1;
    height: 6px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: var(--c-accent);
    border-radius: 999px;
    transition: width 0.3s ease;
}

.progress-bar-fill--done { background: #059669; }

.progress-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-muted);
    white-space: nowrap;
    min-width: 60px;
}

/* DATE CELLS */
.date-overdue {
    font-weight: 600;
    color: #dc2626;
}

.date-soon {
    font-weight: 600;
    color: #d97706;
}

.date-anytime { color: var(--c-muted); }
.date-muted { color: var(--c-muted); font-size: 0.82rem; }

.table-actions {
    display: flex;
    justify-content: flex-end;
}

.empty-state {
    text-align: center;
    padding: 2.5rem 1rem;
    color: var(--c-muted);
    font-size: 0.875rem;
}

/* PAGINATION */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--c-border);
    font-size: 0.85rem;
    color: var(--c-muted);
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.82rem;
}

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-size select {
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.page-indicator {
    font-size: 0.82rem;
    min-width: 50px;
    text-align: center;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* BUTTONS */
.primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.58rem 1.1rem;
    border-radius: 8px;
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

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: transparent;
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
    padding: 0.38rem 0.75rem;
    font-size: 0.8rem;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .po-toolbar { flex-direction: column; align-items: flex-start; }
    .toolbar-right { width: 100%; justify-content: flex-end; }
    .search-input { min-width: 0; width: 100%; }
    .progress-cell { min-width: 100px; }
}

@media (max-width: 640px) {
    .po-page { padding: 1.25rem 1rem 2.5rem; }
    .po-title h1 { font-size: 1.5rem; }
    .filter-pills { flex-wrap: wrap; }
}
</style>