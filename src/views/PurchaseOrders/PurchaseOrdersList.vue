<template>
    <section class="po-page">
        <PullToRefresh :on-refresh="loadOrders" :disabled="isLoading" />

        <div class="po-shell">

            <!-- HEADER -->
            <header class="po-header">
                <div class="po-title">
                    <span class="po-eyebrow">Purchasing</span>
                    <h1>Purchase orders</h1>
                    <p>Plan inbound stock and track receiving for {{ currentStoreLabel }}.</p>
                </div>
                <div class="header-actions">
                    <button class="ghost-button" :disabled="!storeContext.currentStoreId" @click="goToReceipts">
                        <mdicon name="receipt-text-outline" size="16" />
                        Receipts
                    </button>
                    <button class="ghost-button" :disabled="!storeContext.currentStoreId" @click="goToSuppliers">
                        <mdicon name="truck-outline" size="16" />
                        Suppliers
                    </button>
                    <button class="primary-button" :disabled="!storeContext.currentStoreId" @click="createOrder">
                        <mdicon name="plus" size="16" />
                        New purchase order
                    </button>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Purchase orders are available on Standard."
                description="Upgrade to Standard to manage suppliers, draft purchase orders, and receive inventory."
            />

            <div v-else-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to manage purchase orders.
            </div>

            <template v-else>
                <!-- STAT STRIP -->
                <div class="stat-strip">
                    <div class="stat">
                        <span class="stat-value">{{ totalCount }}</span>
                        <span class="stat-label">Orders</span>
                    </div>
                    <div class="stat" :class="{ 'stat--flagged': openCount > 0 }">
                        <span class="stat-value">{{ openCount }}</span>
                        <span class="stat-label">Open</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">{{ receivedCount }}</span>
                        <span class="stat-label">Received</span>
                    </div>
                </div>

                <!-- TABLE PANEL -->
                <section class="po-panel">
                    <div class="panel-toolbar">
                        <div class="search-wrap">
                            <mdicon name="magnify" size="17" class="search-icon" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search supplier or reference…"
                            />
                        </div>
                        <select v-model="supplierFilter" class="supplier-select">
                            <option value="">All suppliers</option>
                            <option value="UNASSIGNED">Unassigned</option>
                            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                                {{ supplier.name }}
                            </option>
                        </select>
                        <div class="date-range">
                            <label class="date-field">
                                <span>From</span>
                                <input v-model="fromDate" type="date" class="date-input" />
                            </label>
                            <label class="date-field">
                                <span>To</span>
                                <input v-model="toDate" type="date" class="date-input" />
                            </label>
                        </div>
                    </div>

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

                    <SkeletonLoader v-if="isLoading" :rows="6" label="Loading purchase orders…" />
                    <template v-else>
                        <div class="table-wrap">
                            <table class="po-table">
                                <thead>
                                    <tr>
                                        <th>Supplier</th>
                                        <th>Status</th>
                                        <th>Receiving progress</th>
                                        <th>Expected</th>
                                        <th>Created</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="order in paginatedOrders"
                                        :key="order.id"
                                        class="row-clickable"
                                        @click="openOrder(order.id)"
                                    >
                                        <td class="col-supplier">
                                            <div class="supplier-name">{{ order.supplierName || 'Unassigned' }}</div>
                                            <div v-if="order.latestInvoiceNumber && (order.status === 'RECEIVED' || order.status === 'PARTIALLY_RECEIVED')" class="invoice-tag">
                                                <mdicon name="file-document-outline" size="11" />
                                                {{ order.latestInvoiceNumber }}
                                            </div>
                                        </td>
                                        <td class="col-status">
                                            <span class="status-pill" :class="statusClass(order.status)">
                                                {{ formatStatus(order.status) }}
                                            </span>
                                        </td>
                                        <td class="col-progress">
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
                                        <td class="col-expected">
                                            <template v-if="order.expectedDate">
                                                <span class="expected-date">{{ formatDate(order.expectedDate) }}</span>
                                                <span v-if="isOverdue(order)" class="due-chip due-chip--overdue">Overdue</span>
                                                <span v-else-if="isSoon(order)" class="due-chip due-chip--soon">Due soon</span>
                                            </template>
                                            <span v-else class="date-anytime">Anytime</span>
                                        </td>
                                        <td class="col-created date-muted">{{ formatDate(order.createdAt) }}</td>
                                        <td class="col-open">
                                            <mdicon name="chevron-right" size="18" class="row-chevron" />
                                        </td>
                                    </tr>
                                    <tr v-if="purchaseOrders.length === 0">
                                        <td colspan="6" class="empty-state">{{ emptyMessage }}</td>
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
                    </template>
                </section>
            </template>

        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
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
    if (!store) return 'your store';
    return store.name;
});

const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value.trim() || statusFilter.value !== 'ALL' || supplierFilter.value || fromDate.value || toDate.value)
);

const emptyMessage = computed(() =>
    hasActiveFilters.value
        ? 'No purchase orders match your filters.'
        : 'No purchase orders yet. Create one to plan inbound stock.'
);

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
/* ============================================================
   TOKENS
============================================================ */
.po-page {
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
.po-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

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

.header-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
}

/* ============================================================
   STAT STRIP
============================================================ */
.stat-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    overflow: hidden;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem 1.4rem;
    border-left: 1px solid var(--c-border);
    min-width: 0;
}

.stat:first-child { border-left: none; }

.stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    white-space: nowrap;
}

.stat--flagged .stat-value { color: #b45309; }

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.po-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.5rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
}

.panel-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    flex-wrap: wrap;
}

.search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
}

.search-icon {
    position: absolute;
    left: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
}

.search-input {
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    padding: 0.55rem 0.9rem 0.55rem 2.3rem;
    width: 100%;
    box-sizing: border-box;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.supplier-select {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 170px;
}

.supplier-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.date-range {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
}

.date-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.date-input {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.5rem 0.7rem;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.date-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ── Status pills ── */
.filter-pills {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 9px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.filter-pill {
    border: none;
    background: transparent;
    padding: 0.35rem 0.85rem;
    border-radius: 7px;
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

.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap { overflow-x: auto; min-width: 0; }

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
    white-space: nowrap;
}

.po-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.po-table tbody tr:last-child { border-bottom: none; }
.po-table tbody tr:hover { background: #f8fafc; }
.po-table tbody tr.row-clickable { cursor: pointer; }

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

/* ── Status pills ── */
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
    white-space: nowrap;
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }
.status-pill--warning { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.status-pill--draft { background: rgba(99, 102, 241, 0.1); color: #4338ca; }

/* ── Progress ── */
.progress-cell {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 150px;
}

.progress-bar-wrap {
    flex: 1;
    max-width: 130px;
    height: 6px;
    background: #eef2f5;
    border-radius: 999px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: var(--c-accent);
    border-radius: 999px;
    transition: width 0.3s ease;
    min-width: 2px;
}

.progress-bar-fill--done { background: #059669; }

.progress-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

/* ── Dates ── */
.col-expected { white-space: nowrap; }

.expected-date {
    font-variant-numeric: tabular-nums;
}

.due-chip {
    display: inline-flex;
    align-items: center;
    margin-left: 0.45rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
}

.due-chip--overdue { background: #ffe4e6; color: #be123c; }
.due-chip--soon { background: #fef3c7; color: #b45309; }

.date-anytime { color: var(--c-muted); }
.date-muted { color: var(--c-muted); font-size: 0.82rem; font-variant-numeric: tabular-nums; }

.col-open { text-align: right; width: 34px; }

.row-chevron { color: #cbd5e1; }

.po-table tbody tr:hover .row-chevron { color: var(--c-accent-dark); }

.empty-state {
    text-align: center;
    padding: 2.5rem 1rem;
    color: var(--c-muted);
    font-size: 0.875rem;
}

/* ============================================================
   PAGINATION
============================================================ */
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

.pagination-size select:focus {
    outline: none;
    border-color: var(--c-accent);
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

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
@media (max-width: 768px) {
    .panel-toolbar { flex-direction: column; align-items: stretch; }
    .search-wrap { min-width: 0; }
    .supplier-select { min-width: 0; width: 100%; }
    .date-range { width: 100%; }
    .date-field { flex: 1; }
    .date-input { width: 100%; box-sizing: border-box; }
    .filter-pills { width: 100%; }
    .filter-pill { flex: 1; text-align: center; }
}

@media (max-width: 640px) {
    .po-page { padding: 1rem 0.875rem 2.5rem; }
    .po-shell { gap: 1rem; }
    .po-header { flex-direction: column; gap: 0.875rem; }
    .po-title h1 { font-size: 1.5rem; }

    .header-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }
    .header-actions .ghost-button,
    .header-actions .primary-button {
        width: 100%;
        justify-content: center;
    }
    .header-actions .primary-button { grid-column: 1 / -1; }

    .stat { padding: 0.75rem 0.9rem; }
    .stat-value { font-size: 1.2rem; }
    .stat-label { font-size: 0.62rem; }

    .po-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .filter-pills { margin: 0 1rem; width: calc(100% - 2rem); }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .po-table thead { display: none; }
    .po-table,
    .po-table tbody { display: block; }

    .po-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.15rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .po-table tbody tr:last-child { border-bottom: none; }

    .po-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    /* Supplier + invoice */
    .po-table tbody td.col-supplier { grid-column: 1; grid-row: 1; }

    /* Status — top right */
    .po-table tbody td.col-status {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }

    /* Progress — full width */
    .po-table tbody td.col-progress {
        grid-column: 1 / -1;
        grid-row: 2;
        padding-top: 0.5rem;
    }
    .po-table tbody td.col-progress .progress-bar-wrap { max-width: none; }

    /* Expected + created on one line */
    .po-table tbody td.col-expected {
        grid-column: 1;
        grid-row: 3;
        padding-top: 0.35rem;
        font-size: 0.78rem;
        white-space: normal;
    }
    .po-table tbody td.col-created {
        grid-column: 2;
        grid-row: 3;
        padding-top: 0.35rem;
        text-align: right;
        font-size: 0.75rem;
    }

    /* Chevron hidden — tap the row */
    .po-table tbody td.col-open { display: none; }

    .po-table tbody td.empty-state { grid-column: 1 / -1; padding: 2.5rem 1rem; }
}
</style>
