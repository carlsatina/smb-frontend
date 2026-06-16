<template>
    <section class="receipts-page">
        <div class="receipts-shell">
            <header class="receipts-header">
                <div class="receipts-title">
                    <span class="receipts-eyebrow">Purchase Orders</span>
                    <h1>Receipts</h1>
                    <p>Browse received inventory and supplier invoices for {{ currentStoreLabel }}.</p>
                </div>
                <div class="receipts-actions">
                    <button class="ghost-button" @click="goToPurchaseOrders">Back to POs</button>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Receipts are available on Standard."
                description="Upgrade to Standard to review receiving analytics and export receipts."
            />
            <template v-else>
            <section class="receipts-summary">
                <div class="panel-header">
                    <div>
                        <h2>Receipt analytics</h2>
                        <p>Totals for the selected date range.</p>
                    </div>
                </div>

                <div v-if="!storeContext.currentStoreId" class="panel-state">
                    Select or create a store to view receipt analytics.
                </div>

                <div v-else-if="isSummaryLoading" class="panel-state">Loading analytics...</div>

                <div v-else-if="!summary" class="panel-state">No receipt data available for this range.</div>

                <div v-else>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <span class="summary-label">Total receipts</span>
                            <strong class="summary-value">{{ formatNumber(summary.totalReceipts) }}</strong>
                            <span class="summary-sub">Transactions received</span>
                        </div>
                        <div class="summary-card">
                            <span class="summary-label">Total spend</span>
                            <strong class="summary-value">{{ formatMoney(summary.totalSpend) }}</strong>
                            <span class="summary-sub">Across suppliers</span>
                        </div>
                        <div class="summary-card">
                            <span class="summary-label">Avg receipt</span>
                            <strong class="summary-value">{{ formatMoney(summary.avgReceipt) }}</strong>
                            <span class="summary-sub">Per receipt</span>
                        </div>
                    </div>

                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <div class="analytics-header">Top suppliers</div>
                            <div v-if="summary.suppliers.length === 0" class="analytics-empty">
                                No supplier receipts yet.
                            </div>
                            <div v-else>
                                <button
                                    v-for="supplier in summary.suppliers"
                                    :key="supplier.supplierId || supplier.supplierName"
                                    type="button"
                                    class="analytics-row analytics-row--clickable"
                                    :class="{ active: isSupplierActive(supplier) }"
                                    @click="applySupplierDrilldown(supplier)"
                                >
                                    <div>
                                        <span class="analytics-name">{{ supplier.supplierName }}</span>
                                        <span class="analytics-meta">
                                            {{ formatNumber(supplier.receiptCount) }} receipts
                                        </span>
                                    </div>
                                    <span class="analytics-value">{{ formatMoney(supplier.totalSpend) }}</span>
                                </button>
                            </div>
                        </div>

                        <div class="analytics-card">
                            <div class="analytics-header">Category spend</div>
                            <div v-if="summary.categories.length === 0" class="analytics-empty">
                                No received items yet.
                            </div>
                            <div v-else>
                                <div
                                    v-for="category in summary.categories"
                                    :key="category.category"
                                    class="analytics-row"
                                >
                                    <div>
                                        <span class="analytics-name">{{ category.category }}</span>
                                        <span class="analytics-meta">
                                            {{ formatQty(category.qtyReceived) }} received
                                        </span>
                                    </div>
                                    <span class="analytics-value">{{ formatMoney(category.totalSpend) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="receipts-card">
                <div class="panel-header">
                    <div>
                        <h2>Receipt log</h2>
                        <p>Filter by date and drill into receipt detail.</p>
                    </div>
                </div>

                <div class="log-toolbar">
                    <div class="toolbar-left">
                        <input v-model="searchQuery" class="search-input" placeholder="Search supplier or invoice" />
                        <label class="filter-field">
                            <span>Supplier</span>
                            <select v-model="supplierFilter" @change="applyFilters">
                                <option value="">All suppliers</option>
                                <option value="UNASSIGNED">Unassigned</option>
                                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                                    {{ supplier.name }}
                                </option>
                            </select>
                        </label>
                        <label class="filter-field">
                            <span>From</span>
                            <input v-model="fromDate" type="date" @change="applyFilters" />
                        </label>
                        <label class="filter-field">
                            <span>To</span>
                            <input v-model="toDate" type="date" @change="applyFilters" />
                        </label>
                    </div>
                    <div class="toolbar-right">
                        <button
                            class="secondary-button button-compact"
                            :disabled="isExporting || !storeContext.currentStoreId || !canExport"
                            @click="exportReceipts"
                        >
                            {{ isExporting ? 'Exporting...' : 'Export CSV' }}
                        </button>
                        <button class="ghost-button button-compact" @click="resetFilters">Reset</button>
                    </div>
                </div>

                <div v-if="supplierNameFilter" class="supplier-pill">
                    <span>Custom supplier: {{ supplierNameFilter }}</span>
                    <button type="button" class="ghost-button" @click="clearSupplierNameFilter">Clear</button>
                </div>

                <div v-if="!storeContext.currentStoreId" class="panel-state">
                    Select or create a store to view receipts.
                </div>

                <div v-else-if="isLoading" class="panel-state">Loading receipts...</div>

                <div v-else-if="receipts.length === 0" class="empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <p class="empty-heading">No receipts found</p>
                    <p class="empty-sub">Try adjusting your filters or date range.</p>
                </div>
                <div v-else class="table-wrap">
                    <table class="receipts-table table-compact">
                        <thead>
                            <tr>
                                <th>Receipt</th>
                                <th>Supplier</th>
                                <th>Invoice</th>
                                <th>Total</th>
                                <th>Received by</th>
                                <th class="align-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="receipt in receipts" :key="receipt.id">
                                <td>
                                    <div class="receipt-id" :title="receipt.id">#{{ receipt.id.slice(0, 8) }}…</div>
                                    <div class="receipt-meta">{{ formatDate(receipt.receivedAt) }} · {{ formatTime(receipt.receivedAt) }}</div>
                                </td>
                                <td>{{ receipt.supplierName || '—' }}</td>
                                <td>{{ receipt.invoiceNumber || '—' }}</td>
                                <td class="receipt-total">{{ formatMoney(receipt.totalCost) }}</td>
                                <td>{{ receipt.receivedBy?.fullName || receipt.receivedBy?.email || 'System' }}</td>
                                <td class="table-actions">
                                    <button class="ghost-button" @click="goToReceipt(receipt.id)">View</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="!isLoading && receipts.length > 0" class="pagination">
                    <span class="pagination-info">{{ total }} receipt{{ total !== 1 ? 's' : '' }}</span>
                    <div class="pagination-controls">
                        <label class="pagination-size">
                            <select v-model.number="pageSize">
                                <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                    {{ size }} / page
                                </option>
                            </select>
                        </label>
                        <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)" aria-label="Previous page">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <span class="page-count">{{ page }} / {{ totalPages }}</span>
                        <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)" aria-label="Next page">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </div>
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
    return `${store.name} · ${store.currency}`;
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

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
.receipts-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.receipts-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-end;
    justify-content: space-between;
}

.receipts-eyebrow {
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

.receipts-title h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.receipts-title p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.95rem;
}

.receipts-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
}

/* ============================================================
   PANELS
============================================================ */
.receipts-summary,
.receipts-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem 2rem;
}

/* ============================================================
   PANEL HEADER
============================================================ */
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.panel-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.panel-header p {
    color: var(--c-muted);
    margin: 0;
    font-size: 0.875rem;
}

.panel-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
}

/* ============================================================
   SUMMARY KPI GRID
============================================================ */
.summary-grid {
    margin-top: 1.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.summary-card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1.1rem 1.25rem;
    border: 1px solid var(--c-border);
    border-radius: 12px;
    background: var(--c-bg);
}

.summary-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.summary-value {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1.1;
}

.summary-sub {
    font-size: 0.78rem;
    color: var(--c-muted);
}

/* ============================================================
   ANALYTICS GRID
============================================================ */
.analytics-grid {
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
}

.analytics-card {
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    background: var(--c-bg);
}

.analytics-header {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
    margin-bottom: 0.75rem;
}

.analytics-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.55rem 0;
    border-top: 1px solid var(--c-border);
    gap: 1rem;
}

.analytics-row--clickable {
    background: transparent;
    border: none;
    border-top: 1px solid var(--c-border);
    width: 100%;
    text-align: left;
    cursor: pointer;
    padding: 0.55rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    color: var(--c-text);
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    transition: color 0.15s;
}

.analytics-row--clickable:hover {
    color: var(--c-accent-dark);
}

.analytics-row--clickable.active {
    color: var(--c-accent-dark);
    font-weight: 600;
}

.analytics-row:first-of-type,
.analytics-row--clickable:first-of-type {
    border-top: none;
}

.analytics-name {
    font-weight: 600;
    font-size: 0.9rem;
    display: block;
}

.analytics-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: block;
    margin-top: 0.1rem;
}

.analytics-value {
    font-weight: 700;
    font-size: 0.9rem;
    white-space: nowrap;
}

.analytics-empty {
    color: var(--c-muted);
    font-size: 0.875rem;
    padding: 0.25rem 0;
}

/* ============================================================
   SUPPLIER DRILLDOWN PILL
============================================================ */
.supplier-pill {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    border-radius: 8px;
    border: 1px solid #99f6e4;
    background: #f0fdf9;
    color: var(--c-accent-dark);
    font-size: 0.875rem;
    font-weight: 600;
    flex-wrap: wrap;
}

/* ============================================================
   LOG TOOLBAR
============================================================ */
.log-toolbar {
    margin-top: 1.25rem;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.toolbar-left {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ============================================================
   FILTERS
============================================================ */
.filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
    color: var(--c-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.filter-field input,
.filter-field select {
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
}

.filter-field input:focus,
.filter-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.search-input {
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.85rem;
    min-width: 200px;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
}

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   PANEL STATE
============================================================ */
.panel-state {
    margin-top: 1.5rem;
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    background: #f0fdf9;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

/* ============================================================
   EMPTY STATE
============================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 3rem 1rem;
    color: var(--c-muted);
    margin-top: 1.25rem;
    border: 1px dashed var(--c-border);
    border-radius: 12px;
}

.empty-heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--c-text);
    margin: 0.25rem 0 0;
}

.empty-sub {
    font-size: 0.875rem;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap {
    margin-top: 1.25rem;
    overflow-x: auto;
}

.receipts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
}

.receipts-table th {
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

.receipts-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--c-border);
    color: var(--c-text);
    vertical-align: middle;
}

.receipts-table tbody tr:last-child td {
    border-bottom: none;
}

.receipts-table tbody tr:hover td {
    background: var(--c-bg);
}

.receipt-id {
    font-weight: 600;
    font-size: 0.88rem;
}

.receipt-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
}

.receipt-total {
    font-weight: 700;
    color: var(--c-text);
}

.align-right {
    text-align: right;
}

.table-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}

/* ============================================================
   PAGINATION
============================================================ */
.pagination {
    margin-top: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.pagination-info {
    font-size: 0.85rem;
    color: var(--c-muted);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-size select {
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.35rem 0.6rem;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    padding: 0;
}

.page-btn:hover:not(:disabled) {
    background: var(--c-bg);
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.page-count {
    font-size: 0.85rem;
    color: var(--c-muted);
    min-width: 48px;
    text-align: center;
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

.ghost-button.button-compact {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 720px) {
    .receipts-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .receipts-page {
        padding: 2rem 1rem 3rem;
    }
}
</style>
