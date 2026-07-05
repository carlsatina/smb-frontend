<template>
    <section class="receipts-page">
        <div class="receipts-shell">
            <header class="list-header">
                <button type="button" class="back-link" @click="goToPurchaseOrders">
                    <mdicon name="arrow-left" size="15" />
                    Purchase orders
                </button>
                <div class="list-header-row">
                    <div class="list-title">
                        <h1>Receipts</h1>
                        <p>Received inventory and supplier invoices for {{ currentStoreLabel }}.</p>
                    </div>
                    <div class="header-actions">
                        <button
                            class="ghost-button"
                            :disabled="isExporting || !storeContext.currentStoreId || !canExport"
                            @click="exportReceipts"
                        >
                            <mdicon name="download-outline" size="16" />
                            {{ isExporting ? 'Exporting…' : 'Export CSV' }}
                        </button>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Receipts are available on Standard."
                description="Upgrade to Standard to review receiving analytics and export receipts."
            />

            <div v-else-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to view receipts.
            </div>

            <template v-else>
                <!-- STAT STRIP -->
                <div class="stat-strip">
                    <div class="stat">
                        <span class="stat-value">{{ summary ? formatNumber(summary.totalReceipts) : '—' }}</span>
                        <span class="stat-label">Receipts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">{{ summary ? formatMoney(summary.totalSpend) : '—' }}</span>
                        <span class="stat-label">Total spend</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">{{ summary ? formatMoney(summary.avgReceipt) : '—' }}</span>
                        <span class="stat-label">Avg receipt</span>
                    </div>
                </div>

                <!-- ANALYTICS -->
                <div v-if="summary" class="analytics-grid">
                    <section class="analytics-card">
                        <div class="card-title">
                            <h2>Top suppliers</h2>
                            <p>Click a supplier to filter the log</p>
                        </div>
                        <div v-if="summary.suppliers.length === 0" class="analytics-empty">
                            No supplier receipts in this range.
                        </div>
                        <div v-else class="analytics-rows">
                            <button
                                v-for="supplier in summary.suppliers"
                                :key="supplier.supplierId || supplier.supplierName"
                                type="button"
                                class="analytics-row analytics-row--clickable"
                                :class="{ active: isSupplierActive(supplier) }"
                                @click="applySupplierDrilldown(supplier)"
                            >
                                <div class="analytics-info">
                                    <span class="analytics-name">{{ supplier.supplierName }}</span>
                                    <span class="analytics-meta">{{ formatNumber(supplier.receiptCount) }} receipt{{ supplier.receiptCount !== 1 ? 's' : '' }}</span>
                                </div>
                                <span class="analytics-value">{{ formatMoney(supplier.totalSpend) }}</span>
                            </button>
                        </div>
                    </section>

                    <section class="analytics-card">
                        <div class="card-title">
                            <h2>Category spend</h2>
                            <p>Received items by category</p>
                        </div>
                        <div v-if="summary.categories.length === 0" class="analytics-empty">
                            No received items in this range.
                        </div>
                        <div v-else class="analytics-rows">
                            <div
                                v-for="category in summary.categories"
                                :key="category.category"
                                class="analytics-row"
                            >
                                <div class="analytics-info">
                                    <span class="analytics-name">{{ category.category }}</span>
                                    <span class="analytics-meta">{{ formatQty(category.qtyReceived) }} received</span>
                                </div>
                                <span class="analytics-value">{{ formatMoney(category.totalSpend) }}</span>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- RECEIPT LOG -->
                <section class="receipts-panel">
                    <div class="panel-toolbar">
                        <div class="search-wrap">
                            <mdicon name="magnify" size="17" class="search-icon" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search supplier or invoice…"
                            />
                        </div>
                        <select v-model="supplierFilter" class="supplier-select" @change="applyFilters">
                            <option value="">All suppliers</option>
                            <option value="UNASSIGNED">Unassigned</option>
                            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                                {{ supplier.name }}
                            </option>
                        </select>
                        <div class="date-range">
                            <label class="date-field">
                                <span>From</span>
                                <input v-model="fromDate" type="date" class="date-input" @change="applyFilters" />
                            </label>
                            <label class="date-field">
                                <span>To</span>
                                <input v-model="toDate" type="date" class="date-input" @change="applyFilters" />
                            </label>
                        </div>
                        <button class="ghost-button ghost-button--sm" @click="resetFilters">Reset</button>
                    </div>

                    <div v-if="supplierNameFilter" class="drill-chip">
                        <span>Supplier: {{ supplierNameFilter }}</span>
                        <button type="button" class="drill-chip-clear" aria-label="Clear supplier filter" @click="clearSupplierNameFilter">
                            <mdicon name="close" size="14" />
                        </button>
                    </div>

                    <SkeletonLoader v-if="isLoading" :rows="6" label="Loading receipts…" />

                    <div v-else-if="receipts.length === 0" class="empty-state">
                        <mdicon name="receipt-text-outline" size="34" class="empty-icon" />
                        <p class="empty-heading">No receipts found</p>
                        <p class="empty-sub">{{ hasActiveFilters ? 'Try adjusting your filters or date range.' : 'Receipts appear here as purchase orders are received.' }}</p>
                    </div>

                    <template v-else>
                        <div class="table-wrap">
                            <table class="receipts-table">
                                <thead>
                                    <tr>
                                        <th>Receipt</th>
                                        <th>Supplier</th>
                                        <th>Invoice</th>
                                        <th class="num">Total</th>
                                        <th>Received by</th>
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
                                        <td class="col-receipt">
                                            <div class="receipt-id" :title="receipt.id">#{{ receipt.id.slice(0, 8) }}</div>
                                            <div class="receipt-meta">{{ formatDate(receipt.receivedAt) }} · {{ formatTime(receipt.receivedAt) }}</div>
                                        </td>
                                        <td class="col-supplier">{{ receipt.supplierName || '—' }}</td>
                                        <td class="col-invoice">{{ receipt.invoiceNumber || '—' }}</td>
                                        <td class="col-total num">{{ formatMoney(receipt.totalCost) }}</td>
                                        <td class="col-by">{{ receipt.receivedBy?.fullName || receipt.receivedBy?.email || 'System' }}</td>
                                        <td class="col-open">
                                            <mdicon name="chevron-right" size="18" class="row-chevron" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pagination">
                            <div class="pagination-info">
                                <span>{{ total }} receipt{{ total !== 1 ? 's' : '' }}</span>
                                <label class="pagination-size">
                                    <span>Show</span>
                                    <select v-model.number="pageSize">
                                        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                                    </select>
                                </label>
                            </div>
                            <div v-if="totalPages > 1" class="pagination-controls">
                                <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)" aria-label="Previous page">
                                    <mdicon name="chevron-left" size="18" />
                                </button>
                                <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
                                <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)" aria-label="Next page">
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
import { useRoute, useRouter } from 'vue-router';
import {
    getPurchaseReceiptSummary,
    listPurchaseReceipts,
    PurchaseReceiptAnalytics,
    PurchaseReceiptSummary,
} from '@/api/purchaseOrders';
import { listSuppliers, Supplier } from '@/api/suppliers';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';
import { zonedDayStartIso, zonedDayEndIso } from '@/utils/datetime';
import PlanGate from '@/components/PlanGate.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const receipts = ref<PurchaseReceiptSummary[]>([]);
const suppliers = ref<Supplier[]>([]);
const summary = ref<PurchaseReceiptAnalytics | null>(null);
const isLoading = ref(false);
const isSummaryLoading = ref(false);
const isExporting = ref(false);
const searchQuery = ref('');
const fromDate = ref('');
const toDate = ref('');
const supplierFilter = ref('');
const supplierNameFilter = ref('');
const page = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50];
const total = ref(0);
const isApplyingQuery = ref(false);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);
const canExport = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'importExport'));

const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value.trim() || supplierFilter.value || supplierNameFilter.value || fromDate.value || toDate.value)
);

const loadReceipts = async () => {
    if (isPlanLocked.value) {
        receipts.value = [];
        total.value = 0;
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        receipts.value = [];
        total.value = 0;
        return;
    }
    isLoading.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const supplierIdParam =
            supplierNameFilter.value ? undefined : supplierFilter.value || undefined;
        const supplierNameParam = supplierNameFilter.value || undefined;
        const data = await listPurchaseReceipts(storeId, {
            q: searchQuery.value.trim() || undefined,
            from: fromValue,
            to: toValue,
            supplierId: supplierIdParam,
            supplierName: supplierNameParam,
            page: page.value,
            pageSize: pageSize.value,
        });
        receipts.value = data.receipts;
        total.value = data.total;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load receipts.';
        showToast(message, 'error');
    } finally {
        isLoading.value = false;
    }
};

const loadSummary = async () => {
    if (isPlanLocked.value) {
        summary.value = null;
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        summary.value = null;
        return;
    }
    isSummaryLoading.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const supplierIdParam =
            supplierNameFilter.value ? undefined : supplierFilter.value || undefined;
        const supplierNameParam = supplierNameFilter.value || undefined;
        const data = await getPurchaseReceiptSummary(storeId, {
            from: fromValue,
            to: toValue,
            supplierId: supplierIdParam,
            supplierName: supplierNameParam,
        });
        summary.value = data.summary;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load receipt analytics.';
        showToast(message, 'error');
        summary.value = null;
    } finally {
        isSummaryLoading.value = false;
    }
};

const loadSuppliers = async () => {
    if (isPlanLocked.value) {
        suppliers.value = [];
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        suppliers.value = [];
        return;
    }
    try {
        const data = await listSuppliers(storeId);
        suppliers.value = data.suppliers;
    } catch (error) {
        suppliers.value = [];
    }
};

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const applyFilters = async () => {
    page.value = 1;
    await Promise.all([loadReceipts(), loadSummary()]);
};

const resetFilters = async () => {
    searchQuery.value = '';
    fromDate.value = '';
    toDate.value = '';
    supplierFilter.value = '';
    supplierNameFilter.value = '';
    page.value = 1;
    await Promise.all([loadReceipts(), loadSummary()]);
};

const changePage = async (nextPage: number) => {
    page.value = nextPage;
    await loadReceipts();
};

const applySupplierDrilldown = async (supplier: { supplierId?: string | null; supplierName: string }) => {
    page.value = 1;
    if (supplier.supplierId) {
        supplierFilter.value = supplier.supplierId;
        supplierNameFilter.value = '';
    } else if (supplier.supplierName === 'Unassigned') {
        supplierFilter.value = 'UNASSIGNED';
        supplierNameFilter.value = '';
    } else {
        supplierFilter.value = '';
        supplierNameFilter.value = supplier.supplierName;
    }
    await Promise.all([loadReceipts(), loadSummary()]);
};

const clearSupplierNameFilter = async () => {
    supplierNameFilter.value = '';
    page.value = 1;
    await Promise.all([loadReceipts(), loadSummary()]);
};

const isSupplierActive = (supplier: { supplierId?: string | null; supplierName: string }) => {
    if (supplier.supplierId) {
        return supplierFilter.value === supplier.supplierId;
    }
    if (supplier.supplierName === 'Unassigned') {
        return supplierFilter.value === 'UNASSIGNED';
    }
    return supplierNameFilter.value === supplier.supplierName;
};

const goToReceipt = (receiptId: string) => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/purchase-orders/receipts/${receiptId}`);
};

const goToPurchaseOrders = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/purchase-orders`);
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString();
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

const escapeCsvValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
    const content = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const exportReceipts = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || isExporting.value) return;
    if (!canExport.value) {
        openPlanUpgradeModal('importExport');
        return;
    }
    isExporting.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const supplierIdParam =
            supplierNameFilter.value ? undefined : supplierFilter.value || undefined;
        const supplierNameParam = supplierNameFilter.value || undefined;
        const allReceipts: PurchaseReceiptSummary[] = [];
        const exportPageSize = 100;
        let exportPage = 1;
        let totalCount = 0;

        do {
            const data = await listPurchaseReceipts(storeId, {
                q: searchQuery.value.trim() || undefined,
                from: fromValue,
                to: toValue,
                supplierId: supplierIdParam,
                supplierName: supplierNameParam,
                page: exportPage,
                pageSize: exportPageSize,
            });
            allReceipts.push(...data.receipts);
            totalCount = data.total;
            exportPage += 1;
        } while (allReceipts.length < totalCount);

        if (allReceipts.length === 0) {
            showToast('No receipts to export for the selected filters.', 'info');
            return;
        }

        const rows: Array<Array<string | number | null | undefined>> = [
            ['Received At', 'Supplier', 'Invoice', 'Total Cost', 'Received By', 'Receipt ID', 'PO ID'],
        ];

        allReceipts.forEach((receipt) => {
            rows.push([
                receipt.receivedAt,
                receipt.supplierName || '',
                receipt.invoiceNumber || '',
                receipt.totalCost,
                receipt.receivedBy?.fullName || receipt.receivedBy?.email || 'System',
                receipt.id,
                receipt.purchaseOrderId || '',
            ]);
        });

        const storeName = storeContext.currentStore?.name?.replace(/\\s+/g, '-') || 'store';
        const dateStamp = new Date().toISOString().slice(0, 10);
        downloadCsv(`purchase-receipts-${storeName}-${dateStamp}.csv`, rows);
        showToast('Receipts exported.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to export receipts.';
        showToast(message, 'error');
    } finally {
        isExporting.value = false;
    }
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    if (isPlanLocked.value) return;
    const applied = await applyQueryFilters();
    await Promise.all([loadSuppliers()]);
    if (!applied) {
        await Promise.all([loadReceipts(), loadSummary()]);
    }
});

watch(
    () => route.params.storeId,
    (value) => {
        const storeId = value as string | undefined;
        if (storeId && storeId !== storeContext.currentStoreId) {
            storeContext.setCurrentStore(storeId);
        }
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        if (isPlanLocked.value) return;
        supplierFilter.value = '';
        supplierNameFilter.value = '';
        const applied = await applyQueryFilters();
        await Promise.all([loadSuppliers()]);
        if (!applied) {
            await Promise.all([loadReceipts(), loadSummary()]);
        }
    }
);

watch(
    () => pageSize.value,
    async () => {
        if (isPlanLocked.value) return;
        page.value = 1;
        await loadReceipts();
    }
);

watch(supplierFilter, (value) => {
    if (isApplyingQuery.value) return;
    if (value) {
        supplierNameFilter.value = '';
    }
});

let searchDebounce: ReturnType<typeof setTimeout> | undefined;

watch(searchQuery, () => {
    if (isPlanLocked.value) return;
    if (isApplyingQuery.value) return;
    if (searchDebounce) {
        clearTimeout(searchDebounce);
    }
    searchDebounce = setTimeout(() => {
        page.value = 1;
        loadReceipts();
    }, 300);
});

const applyQueryFilters = async () => {
    if (isPlanLocked.value) return false;
    const query = route.query;
    const hasQuery = ['supplierId', 'supplierName', 'from', 'to', 'q'].some((key) => query[key] !== undefined);
    if (!hasQuery) return false;
    const normalizeDateParam = (value: unknown) => {
        if (typeof value !== 'string') return '';
        if (value.includes('T')) return value.slice(0, 10);
        return value;
    };
    isApplyingQuery.value = true;
    supplierFilter.value = typeof query.supplierId === 'string' ? query.supplierId : '';
    supplierNameFilter.value = typeof query.supplierName === 'string' ? query.supplierName : '';
    fromDate.value = normalizeDateParam(query.from);
    toDate.value = normalizeDateParam(query.to);
    searchQuery.value = typeof query.q === 'string' ? query.q : '';
    page.value = 1;
    await nextTick();
    isApplyingQuery.value = false;
    await Promise.all([loadReceipts(), loadSummary()]);
    return true;
};

watch(
    () => route.query,
    async () => {
        await applyQueryFilters();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.receipts-page {
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
.receipts-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.list-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
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

.list-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

.list-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.list-title p {
    color: var(--c-muted);
    max-width: 480px;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    white-space: nowrap;
}

/* ============================================================
   ANALYTICS
============================================================ */
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
}

.analytics-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
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

.analytics-rows {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.analytics-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    font-family: inherit;
    text-align: left;
    width: 100%;
}

.analytics-row--clickable {
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
}

.analytics-row--clickable:hover { background: #f8fafc; }

.analytics-row.active {
    background: rgba(13, 148, 136, 0.06);
    border-color: rgba(13, 148, 136, 0.35);
}

.analytics-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}

.analytics-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.analytics-meta {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.analytics-value {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.analytics-empty {
    font-size: 0.82rem;
    color: var(--c-muted);
    padding: 0.5rem 0;
}

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.receipts-panel {
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

.drill-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    align-self: flex-start;
    padding: 0.35rem 0.5rem 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.08);
    border: 1px solid rgba(13, 148, 136, 0.25);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-accent-dark);
}

.drill-chip-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: none;
    background: rgba(13, 148, 136, 0.12);
    color: var(--c-accent-dark);
    cursor: pointer;
    transition: background 0.12s;
}

.drill-chip-clear:hover { background: rgba(13, 148, 136, 0.22); }

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

.receipts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.receipts-table thead th {
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

.receipts-table thead th.num { text-align: right; }

.receipts-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.receipts-table tbody tr:last-child { border-bottom: none; }
.receipts-table tbody tr:hover { background: #f8fafc; }
.receipts-table tbody tr.row-clickable { cursor: pointer; }

.receipts-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.receipts-table td.num {
    text-align: right;
    font-weight: 700;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.receipt-id {
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.receipt-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
    white-space: nowrap;
}

.col-supplier { font-weight: 600; }
.col-invoice, .col-by { color: var(--c-muted); font-size: 0.84rem; }

.col-open { text-align: right; width: 34px; }
.row-chevron { color: #cbd5e1; }
.receipts-table tbody tr:hover .row-chevron { color: var(--c-accent-dark); }

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 2.5rem 1rem;
    text-align: center;
}

.empty-icon { color: #cbd5e1; margin-bottom: 0.35rem; }

.empty-heading {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.empty-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
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
    padding: 0.5rem 0.85rem;
    font-size: 0.8rem;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 900px) {
    .analytics-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
    .panel-toolbar { flex-direction: column; align-items: stretch; }
    .search-wrap { min-width: 0; }
    .supplier-select { min-width: 0; width: 100%; }
    .date-range { width: 100%; }
    .date-field { flex: 1; }
    .date-input { width: 100%; box-sizing: border-box; }
    .panel-toolbar .ghost-button--sm { align-self: flex-start; }
}

@media (max-width: 640px) {
    .receipts-page { padding: 1rem 0.875rem 2.5rem; }
    .receipts-shell { gap: 1rem; }
    .list-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .ghost-button { flex: 1; justify-content: center; }

    .stat { padding: 0.75rem 0.7rem; }
    .stat-value { font-size: 0.95rem; }
    .stat-label { font-size: 0.6rem; }

    .receipts-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .drill-chip { margin: 0 1rem; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .receipts-table thead { display: none; }
    .receipts-table,
    .receipts-table tbody { display: block; }

    .receipts-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.15rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .receipts-table tbody tr:last-child { border-bottom: none; }

    .receipts-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    .receipts-table tbody td.col-receipt { grid-column: 1; grid-row: 1; }
    .receipts-table tbody td.col-total {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }
    .receipts-table tbody td.col-supplier {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.35rem;
        font-size: 0.82rem;
    }
    .receipts-table tbody td.col-invoice {
        grid-column: 2;
        grid-row: 2;
        padding-top: 0.35rem;
        text-align: right;
        font-size: 0.78rem;
    }
    .receipts-table tbody td.col-by {
        grid-column: 1 / -1;
        grid-row: 3;
        padding-top: 0.15rem;
        font-size: 0.75rem;
    }
    .receipts-table tbody td.col-open { display: none; }
}
</style>
