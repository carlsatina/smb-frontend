<template>
    <section class="sales-page">
        <div class="sales-shell">

            <!-- HEADER -->
            <header class="sales-header">
                <div class="sales-title">
                    <span class="sales-eyebrow">Sales</span>
                    <h1>Sales history</h1>
                    <p>Track finalized tickets, receipts, and cashier performance for {{ currentStoreLabel }}.</p>
                </div>
                <div class="sales-kpis">
                    <div class="kpi-card">
                        <span class="kpi-label">Transactions</span>
                        <span class="kpi-value">{{ salesCount }}</span>
                        <span class="kpi-sub">This period</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Total sales</span>
                        <span class="kpi-value">{{ formatMoney(totalSales) }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Avg ticket</span>
                        <span class="kpi-value">{{ formatMoney(avgTicket) }}</span>
                    </div>
                    <div class="kpi-card" :class="{ 'kpi-card--warn': voidedCount > 0 }">
                        <span class="kpi-label">
                            <span v-if="voidedCount > 0" class="kpi-dot kpi-dot--warn"></span>
                            Voided
                        </span>
                        <span class="kpi-value">{{ voidedCount }}</span>
                    </div>
                </div>
            </header>

            <div class="sales-main">

                    <!-- TOOLBAR -->
                    <div class="sales-toolbar">
                        <div class="toolbar-left">
                            <div class="filter-pills">
                                <button class="pill" :class="{ active: statusFilter === 'ALL' }" @click="statusFilter = 'ALL'">All</button>
                                <button class="pill" :class="{ active: statusFilter === 'FINALIZED' }" @click="statusFilter = 'FINALIZED'">Finalized</button>
                                <button class="pill" :class="{ active: statusFilter === 'VOIDED' }" @click="statusFilter = 'VOIDED'">
                                    <span v-if="voidedCount > 0" class="pill-alert-dot"></span>
                                    Voided
                                </button>
                            </div>
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search receipt or cashier on this page..."
                            />
                        </div>
                        <div class="toolbar-right">
                            <button class="ghost-button" @click="goToPos">Back to POS</button>
                        </div>
                    </div>

                    <div class="advanced-filters">
                        <label class="filter-field">
                            <span>Cashier</span>
                            <select v-model="cashierFilter" :disabled="isFilterOptionsLoading">
                                <option value="">All cashiers</option>
                                <option v-for="member in cashierOptions" :key="member.userId" :value="member.userId">
                                    {{ member.fullName || member.email }}
                                </option>
                            </select>
                        </label>
                        <label class="filter-field">
                            <span>Payment method</span>
                            <select v-model="paymentMethodFilter" :disabled="isFilterOptionsLoading">
                                <option value="">All methods</option>
                                <option v-for="method in paymentMethodOptions" :key="method.value" :value="method.value">
                                    {{ method.label }}
                                </option>
                            </select>
                        </label>
                        <label class="filter-field">
                            <span>Item</span>
                            <select v-model="productFilter" :disabled="isFilterOptionsLoading">
                                <option value="">All items</option>
                                <option v-for="product in productOptions" :key="product.id" :value="product.id">
                                    {{ product.name }}
                                </option>
                            </select>
                        </label>
                        <button
                            class="clear-filters-button"
                            type="button"
                            :disabled="!hasAdvancedFilters || isFilterOptionsLoading"
                            @click="clearAdvancedFilters"
                        >
                            Clear filters
                        </button>
                    </div>

                    <!-- TABLE PANEL -->
                    <section class="sales-panel">
                        <!-- DATE NAVIGATOR -->
                        <div class="daily-nav-wrapper">
                            <div class="daily-nav">
                                <button class="daily-nav__arrow" type="button" @click="goToPrevious" title="Previous">
                                    <mdicon name="chevron-left" size="18" />
                                </button>
                                <button class="daily-nav__date" type="button" @click="showDateModal = true">
                                    <mdicon name="calendar-outline" size="16" />
                                    <span>{{ dateRangeLabel }}</span>
                                </button>
                                <button class="daily-nav__arrow" type="button" :disabled="!canGoNext" @click="goToNext" title="Next">
                                    <mdicon name="chevron-right" size="18" />
                                </button>
                            </div>
                        </div>

                        <Teleport to="body">
                            <Transition name="modal">
                                <div v-if="showDateModal" class="date-modal-overlay" @click.self="showDateModal = false">
                                    <div class="date-modal">
                                        <div class="date-modal__header">
                                            <h3>Select Date Range</h3>
                                            <button class="date-modal__close" @click="showDateModal = false">
                                                <mdicon name="close" size="20" />
                                            </button>
                                        </div>
                                        <div class="date-modal__options">
                                            <button class="date-modal__option" :class="{ active: dateMode === 'today' }" @click="selectDateMode('today')">
                                                <mdicon name="calendar-today" size="20" />
                                                <span>Today</span>
                                            </button>
                                            <button class="date-modal__option" :class="{ active: dateMode === 'weekly' }" @click="selectDateMode('weekly')">
                                                <mdicon name="calendar-week" size="20" />
                                                <span>This Week</span>
                                            </button>
                                            <button class="date-modal__option" :class="{ active: dateMode === 'monthly' }" @click="selectDateMode('monthly')">
                                                <mdicon name="calendar-month" size="20" />
                                                <span>This Month</span>
                                            </button>
                                            <button class="date-modal__option" :class="{ active: dateMode === 'custom' }" @click="dateMode = 'custom'">
                                                <mdicon name="calendar-range" size="20" />
                                                <span>Custom Range</span>
                                            </button>
                                        </div>
                                        <div v-if="dateMode === 'custom'" class="date-modal__custom">
                                            <label class="date-modal__field">
                                                <span>From</span>
                                                <input v-model="customFromDate" type="date" />
                                            </label>
                                            <label class="date-modal__field">
                                                <span>To</span>
                                                <input v-model="customToDate" type="date" />
                                            </label>
                                            <button class="date-modal__apply" @click="applyCustomRange">Apply Range</button>
                                        </div>
                                    </div>
                                </div>
                            </Transition>
                        </Teleport>

                        <div v-if="!storeContext.currentStoreId" class="panel-state">
                            Select or create a store to view sales history.
                        </div>
                        <div v-else-if="isLoading" class="panel-state">Loading sales...</div>
                        <div v-else class="table-wrap">
                            <table class="sales-table">
                                <thead>
                                    <tr>
                                        <th>Receipt</th>
                                        <th>Cashier</th>
                                        <th>Payment</th>
                                        <th>Items</th>
                                        <th class="align-right">Total</th>
                                        <th>Status</th>
                                        <th class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="sale in filteredSales"
                                        :key="sale.id"
                                        class="sales-row"
                                        :class="{ 'row-voided': sale.status === 'VOIDED' }"
                                    >
                                        <td>
                                            <div class="receipt-number">{{ sale.receiptNumber ? `#${sale.receiptNumber}` : '—' }}</div>
                                            <div class="sale-meta">{{ formatDate(sale.createdAt) }}</div>
                                        </td>
                                        <td class="sale-meta">{{ sale.cashier?.fullName || sale.cashier?.email || '—' }}</td>
                                        <td class="sale-payment">{{ formatPaymentMethod(sale.paymentMethod) }}</td>
                                        <td>
                                            <div class="item-list">
                                                <div v-for="item in sale.items.slice(0, 2)" :key="item.id" class="item-line">
                                                    <span class="item-qty">{{ item.qty }}×</span>
                                                    <span class="item-name">{{ item.name }}</span>
                                                </div>
                                                <div v-if="sale.items.length > 2" class="item-more">+{{ sale.items.length - 2 }} more</div>
                                            </div>
                                        </td>
                                        <td class="sale-total">{{ formatMoney(sale.total) }}</td>
                                        <td>
                                            <span class="status-pill" :class="statusClass(sale.status)">
                                                {{ formatStatus(sale.status) }}
                                            </span>
                                        </td>
                                        <td class="actions-cell">
                                            <div class="row-actions">
                                                <button
                                                    type="button"
                                                    class="table-action-button"
                                                    :disabled="printingSaleId === sale.id"
                                                    @click="printSale(sale.id)"
                                                >
                                                    {{ printingSaleId === sale.id ? 'Printing...' : 'Print' }}
                                                </button>
                                                <button
                                                    v-if="sale.status === 'FINALIZED' && canVoid"
                                                    type="button"
                                                    class="table-action-button table-action-button--danger"
                                                    :disabled="voidingSaleId === sale.id"
                                                    @click="voidSaleRow(sale.id)"
                                                >
                                                    {{ voidingSaleId === sale.id ? 'Voiding...' : 'Void' }}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredSales.length === 0">
                                        <td colspan="7" class="empty-state">No sales match your filters.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pagination" v-if="totalPages > 0">
                            <div class="pagination-info">
                                <span>{{ total }} sale{{ total !== 1 ? 's' : '' }}</span>
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
                    </section>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listProducts, ProductResponse } from '@/api/products';
import { getSale, listSales, SaleDetail, SaleSummary, voidSale } from '@/api/sales';
import { listStoreMembers, StoreMember } from '@/api/storeMembers';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const sales = ref<SaleSummary[]>([]);
const isLoading = ref(false);
const isFilterOptionsLoading = ref(false);
const isResettingFilters = ref(false);
const printingSaleId = ref<string | null>(null);
const voidingSaleId = ref<string | null>(null);

const searchQuery = ref('');
const showDateModal = ref(false);
const dateMode = ref<'today' | 'weekly' | 'monthly' | 'custom'>('today');
const fromDate = ref(formatDateInput(new Date()));
const toDate = ref(formatDateInput(new Date()));
const customFromDate = ref(formatDateInput(new Date()));
const customToDate = ref(formatDateInput(new Date()));
const page = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50];
const total = ref(0);
const cashierFilter = ref('');
const paymentMethodFilter = ref('');
const productFilter = ref('');
const cashierOptions = ref<StoreMember[]>([]);
const productOptions = ref<ProductResponse[]>([]);
const paymentMethodOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'GCASH', label: 'GCash' },
    { value: 'MAYA', label: 'Maya' },
    { value: 'TRANSFER', label: 'Bank transfer' },
    { value: 'OTHER', label: 'Other' },
] as const;

function formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const dateRangeLabel = computed(() => {
    const today = formatDateInput(new Date());
    const from = fromDate.value;
    const to = toDate.value;

    // Check if it's a full month (monthly mode)
    if (dateMode.value === 'monthly') {
        const [year, month] = from.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        });
    }

    if (from === to) {
        if (from === today) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (from === formatDateInput(yesterday)) return 'Yesterday';
        const [year, month, day] = from.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

    const formatShort = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    };

    return `${formatShort(from)} – ${formatShort(to)}`;
});

const canGoNext = computed(() => {
    const today = new Date();
    if (dateMode.value === 'monthly') {
        // Can't go next if we're in the current month
        const [year, month] = fromDate.value.split('-').map(Number);
        return year < today.getFullYear() || (year === today.getFullYear() && month - 1 < today.getMonth());
    }
    return toDate.value < formatDateInput(today);
});

const selectDateMode = (mode: 'today' | 'weekly' | 'monthly') => {
    dateMode.value = mode;
    const today = new Date();

    if (mode === 'today') {
        fromDate.value = formatDateInput(today);
        toDate.value = formatDateInput(today);
    } else if (mode === 'weekly') {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        fromDate.value = formatDateInput(startOfWeek);
        toDate.value = formatDateInput(today);
    } else if (mode === 'monthly') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        fromDate.value = formatDateInput(startOfMonth);
        toDate.value = formatDateInput(endOfMonth);
    }

    showDateModal.value = false;
    page.value = 1;
    loadSales();
};

const applyCustomRange = () => {
    if (customFromDate.value > customToDate.value) {
        const temp = customFromDate.value;
        customFromDate.value = customToDate.value;
        customToDate.value = temp;
    }
    fromDate.value = customFromDate.value;
    toDate.value = customToDate.value;
    showDateModal.value = false;
    page.value = 1;
    loadSales();
};

const goToPrevious = () => {
    if (dateMode.value === 'monthly') {
        // Navigate to previous month
        const [year, month] = fromDate.value.split('-').map(Number);
        const prevMonth = new Date(year, month - 2, 1); // month - 2 because month is 1-indexed
        const endOfPrevMonth = new Date(year, month - 1, 0);
        fromDate.value = formatDateInput(prevMonth);
        toDate.value = formatDateInput(endOfPrevMonth);
    } else {
        const from = new Date(fromDate.value + 'T00:00:00');
        const to = new Date(toDate.value + 'T00:00:00');
        const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

        from.setDate(from.getDate() - diff - 1);
        to.setDate(to.getDate() - diff - 1);

        fromDate.value = formatDateInput(from);
        toDate.value = formatDateInput(to);
        dateMode.value = 'custom';
    }
    page.value = 1;
    loadSales();
};

const goToNext = () => {
    if (!canGoNext.value) return;

    if (dateMode.value === 'monthly') {
        // Navigate to next month
        const [year, month] = fromDate.value.split('-').map(Number);
        const nextMonth = new Date(year, month, 1); // month is already correct for next month
        const endOfNextMonth = new Date(year, month + 1, 0);
        const today = new Date();

        // Don't go beyond current month
        if (nextMonth > today) return;

        fromDate.value = formatDateInput(nextMonth);
        toDate.value = formatDateInput(endOfNextMonth);
    } else {
        const from = new Date(fromDate.value + 'T00:00:00');
        const to = new Date(toDate.value + 'T00:00:00');
        const today = new Date();
        const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

        from.setDate(from.getDate() + diff + 1);
        to.setDate(to.getDate() + diff + 1);

        if (to > today) {
            to.setTime(today.getTime());
        }

        fromDate.value = formatDateInput(from);
        toDate.value = formatDateInput(to);
        dateMode.value = 'custom';
    }
    page.value = 1;
    loadSales();
};

const statusFilter = ref<'ALL' | 'FINALIZED' | 'VOIDED'>('ALL');
const canVoid = computed(() => canAccess(storeContext.currentStore?.role, 'salesVoid'));
const hasAdvancedFilters = computed(() =>
    Boolean(cashierFilter.value || paymentMethodFilter.value || productFilter.value)
);

const loadFilterOptions = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        cashierOptions.value = [];
        productOptions.value = [];
        return;
    }

    isFilterOptionsLoading.value = true;
    try {
        const [memberData, productData] = await Promise.all([
            listStoreMembers(storeId),
            listProducts(storeId),
        ]);
        cashierOptions.value = memberData.members
            .slice()
            .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
        productOptions.value = productData.products
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error: any) {
        cashierOptions.value = [];
        productOptions.value = [];
        const message = error?.body?.error?.message || 'Unable to load sales filters.';
        showToast(message, 'error');
    } finally {
        isFilterOptionsLoading.value = false;
    }
};

const loadSales = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        sales.value = [];
        total.value = 0;
        return;
    }

    isLoading.value = true;
    try {
        const fromValue = new Date(`${fromDate.value}T00:00:00`).toISOString();
        const toValue = new Date(`${toDate.value}T23:59:59.999`).toISOString();
        const data = await listSales(storeId, {
            status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
            from: fromValue,
            to: toValue,
            cashierId: cashierFilter.value || undefined,
            paymentMethod: paymentMethodFilter.value || undefined,
            productId: productFilter.value || undefined,
            page: page.value,
            pageSize: pageSize.value,
        });
        sales.value = data.sales;
        total.value = data.total;
    } finally {
        isLoading.value = false;
    }
};

const clearAdvancedFilters = () => {
    cashierFilter.value = '';
    paymentMethodFilter.value = '';
    productFilter.value = '';
};

const resetAdvancedFilters = () => {
    isResettingFilters.value = true;
    clearAdvancedFilters();
    isResettingFilters.value = false;
};

const escapeHtml = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const buildReceiptMarkup = (sale: SaleDetail) => {
    const receiptNumber = sale.receiptNumber ? `#${sale.receiptNumber}` : '—';
    const cashier = sale.cashier?.fullName || sale.cashier?.email || '—';
    const itemRows = sale.items
        .map(
            (item) => `
                <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${item.qty}x</td>
                    <td>${formatMoney(item.unitPrice)}</td>
                    <td style="text-align:right;">${formatMoney(item.total)}</td>
                </tr>
            `
        )
        .join('');
    const discountRow =
        sale.discount > 0
            ? `<div class="summary-row"><span>Discount</span><span>-${formatMoney(sale.discount)}</span></div>`
            : '';
    const taxRow =
        sale.tax > 0
            ? `<div class="summary-row"><span>Tax</span><span>${formatMoney(sale.tax)}</span></div>`
            : '';

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(receiptNumber)}</title>
    <style>
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 24px; }
        .receipt { max-width: 420px; margin: 0 auto; }
        .head { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .title { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
        .meta { color: #64748b; font-size: 13px; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: left; vertical-align: top; }
        th { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
        .summary { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        .summary-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .summary-row.total { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 12px; }
        @media print { body { margin: 0; } .receipt { max-width: none; } }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="head">
            <h1 class="title">${escapeHtml(receiptNumber)}</h1>
            <div class="meta">${escapeHtml(formatDate(sale.createdAt))}</div>
            <div class="meta">${escapeHtml(formatPaymentMethod(sale.paymentMethod))}</div>
            <div class="meta">${escapeHtml(cashier)}</div>
            <div class="meta">${escapeHtml(formatStatus(sale.status))}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th style="text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>
        <div class="summary">
            <div class="summary-row"><span>Subtotal</span><span>${formatMoney(sale.subtotal)}</span></div>
            ${discountRow}
            ${taxRow}
            <div class="summary-row total"><span>Total</span><span>${formatMoney(sale.total)}</span></div>
        </div>
    </div>
</body>
</html>`;
};

const printSale = async (saleId: string) => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;

    printingSaleId.value = saleId;
    try {
        const data = await getSale(storeId, saleId);
        const printWindow = window.open('', '_blank', 'width=520,height=720');
        if (!printWindow) {
            showToast('Unable to open print window. Check your popup blocker.', 'error');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(buildReceiptMarkup(data.sale));
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load sale for printing.';
        showToast(message, 'error');
    } finally {
        if (printingSaleId.value === saleId) {
            printingSaleId.value = null;
        }
    }
};

const voidSaleRow = async (saleId: string) => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const confirmed = window.confirm('Void this sale? This will return stock to inventory.');
    if (!confirmed) return;

    voidingSaleId.value = saleId;
    try {
        await voidSale(storeId, saleId);
        await loadSales();
        showToast('Sale voided and inventory updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to void sale.';
        showToast(message, 'error');
    } finally {
        if (voidingSaleId.value === saleId) {
            voidingSaleId.value = null;
        }
    }
};

const changePage = async (nextPage: number) => {
    page.value = nextPage;
    await loadSales();
};

const filteredSales = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return sales.value.filter((sale) => {
        if (query) {
            const receipt = sale.receiptNumber ? String(sale.receiptNumber) : '';
            const cashier = sale.cashier?.fullName || sale.cashier?.email || '';
            if (!receipt.includes(query) && !cashier.toLowerCase().includes(query)) return false;
        }
        return true;
    });
});

const totalSales = computed(() => sales.value.reduce((sum, sale) => sum + sale.total, 0));
const salesCount = computed(() => sales.value.length);
const avgTicket = computed(() => (sales.value.length ? totalSales.value / sales.value.length : 0));
const voidedCount = computed(() => sales.value.filter((sale) => sale.status === 'VOIDED').length);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

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

const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString();
};

const formatStatus = (status: string) => {
    if (status === 'FINALIZED') return 'Finalized';
    if (status === 'VOIDED') return 'Voided';
    if (status === 'PENDING') return 'Pending';
    return status.charAt(0) + status.slice(1).toLowerCase();
};

const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
        CASH: 'Cash',
        CARD: 'Card',
        GCASH: 'GCash',
        MAYA: 'Maya',
        TRANSFER: 'Bank transfer',
        OTHER: 'Other',
    };
    return labels[method] ?? (method || '—');
};

const statusClass = (status: string) => {
    if (status === 'VOIDED') return 'status-pill--inactive';
    if (status === 'FINALIZED') return 'status-pill--active';
    return 'status-pill--pending';
};

const goToPos = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/pos`);
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    let storeChangedFromRoute = false;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeChangedFromRoute = true;
        storeContext.setCurrentStore(routeStoreId);
    }
    if (storeChangedFromRoute) return;
    await loadFilterOptions();
    await loadSales();
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
    () => pageSize.value,
    async () => {
        page.value = 1;
        await loadSales();
    }
);

watch(
    [statusFilter, cashierFilter, paymentMethodFilter, productFilter],
    async () => {
        if (isResettingFilters.value) return;
        page.value = 1;
        await loadSales();
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        resetAdvancedFilters();
        await loadFilterOptions();
        await loadSales();
    }
);
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.sales-page {
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

/* ============================================================
   SHELL
============================================================ */
.sales-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ============================================================
   HEADER
============================================================ */
.sales-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.sales-eyebrow {
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

.sales-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.sales-title p {
    color: var(--c-muted);
    max-width: 480px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   KPI CARDS
============================================================ */
.sales-kpis {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: flex-start;
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
    transition: border-color 0.15s;
}

.kpi-card--warn {
    border-color: #fbbf24;
    background: #fffbeb;
}

.kpi-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.kpi-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.kpi-dot--warn { background: #f59e0b; }

.kpi-value {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1;
}

.kpi-card--warn .kpi-value { color: #92400e; }
.kpi-sub { font-size: 0.72rem; color: var(--c-muted); }

/* ============================================================
   LAYOUT
============================================================ */
.sales-main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.sales-toolbar {
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

/* ============================================================
   FILTER PILLS
============================================================ */
.filter-pills {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 8px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
}

.pill {
    position: relative;
    border: none;
    background: transparent;
    padding: 0.35rem 0.8rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-muted);
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.pill:hover { color: var(--c-text); }

.pill.active {
    background: var(--c-surface);
    color: var(--c-accent-dark);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
}

.pill-alert-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f59e0b;
    flex-shrink: 0;
}

/* ============================================================
   SEARCH
============================================================ */
.search-input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.6rem 0.9rem;
    min-width: 220px;
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

/* ============================================================
   ADVANCED FILTERS
============================================================ */
.advanced-filters {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: end;
}

.filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.filter-field span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--c-muted);
}

.filter-field select {
    border-radius: 10px;
    border: 1.5px solid var(--c-border);
    padding: 0.7rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.filter-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.filter-field select:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
}

.clear-filters-button {
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 0.7rem 1rem;
    background: #f8fafc;
    color: var(--c-text);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
}

.clear-filters-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.clear-filters-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

/* ============================================================
   MAIN PANEL
============================================================ */
.sales-panel {
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

/* ============================================================
   DATE NAVIGATOR
============================================================ */
.daily-nav-wrapper {
    display: flex;
    justify-content: center;
}

.daily-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem;
    background: #f1f5f9;
    border-radius: 10px;
    border: 1px solid var(--c-border);
}

.daily-nav__arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: all 0.15s;
}

.daily-nav__arrow:hover:not(:disabled) {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
}

.daily-nav__arrow:disabled { opacity: 0.3; cursor: not-allowed; }

.daily-nav__date {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    border: none;
    border-radius: 7px;
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07);
}

.daily-nav__date:hover { box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1); }

/* ============================================================
   TABLE
============================================================ */
.table-wrap { overflow-x: auto; }

.sales-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.sales-table thead th {
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

.sales-table thead th.align-right { text-align: right; }

.sales-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.sales-table tbody tr:last-child { border-bottom: none; }

.sales-table tbody tr.sales-row:hover { background: #f8fafc; }
.sales-table tbody tr.row-voided { opacity: 0.65; }

.sales-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.receipt-number {
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.sale-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
}

.sale-payment {
    font-size: 0.82rem;
    color: var(--c-muted);
}

.item-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.item-line {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
}

.item-qty {
    font-weight: 700;
    color: var(--c-accent-dark);
    min-width: 1.5rem;
    flex-shrink: 0;
}

.item-name {
    color: var(--c-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
}

.item-more {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.sale-total {
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.actions-cell {
    text-align: right;
    white-space: nowrap;
}

.row-actions {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    justify-content: flex-end;
}

.table-action-button {
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.45rem 0.7rem;
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
}

.table-action-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.table-action-button--danger {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.table-action-button--danger:hover:not(:disabled) {
    border-color: #f87171;
    background: #fee2e2;
    color: #b91c1c;
}

.table-action-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

/* ============================================================
   STATUS PILLS
============================================================ */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }
.status-pill--pending { background: rgba(245, 158, 11, 0.12); color: #92400e; }

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

.pagination-size select:focus { outline: none; border-color: var(--c-accent); }

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
    gap: 0.3rem;
    padding: 0.58rem 1rem;
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

.ghost-button:hover { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 768px) {
    .sales-toolbar { flex-direction: column; align-items: flex-start; }
    .toolbar-right { width: 100%; justify-content: flex-end; }
    .search-input { min-width: 0; width: 100%; }
    .advanced-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
    .sales-page { padding: 1.25rem 1rem 2.5rem; }
    .sales-title h1 { font-size: 1.5rem; }
    .filter-pills { flex-wrap: wrap; }
    .advanced-filters { grid-template-columns: 1fr; }
}

/* ============================================================
   DATE MODAL (global — Teleport moves outside scoped DOM)
============================================================ */
:global(.date-modal-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

:global(.date-modal) {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 340px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
    overflow: hidden;
}

:global(.date-modal__header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid #e2e8f0;
}

:global(.date-modal__header h3) {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    font-family: 'Inter', -apple-system, sans-serif;
}

:global(.date-modal__close) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
}

:global(.date-modal__close:hover) { background: #f1f5f9; color: #0f172a; }

:global(.date-modal__options) {
    display: grid;
    gap: 0.45rem;
    padding: 1rem 1.4rem;
}

:global(.date-modal__option) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
}

:global(.date-modal__option:hover) { border-color: #0d9488; background: rgba(13, 148, 136, 0.05); color: #0f766e; }

:global(.date-modal__option.active) {
    border-color: #0d9488;
    background: rgba(13, 148, 136, 0.08);
    color: #0f766e;
    font-weight: 600;
}

:global(.date-modal__custom) {
    display: grid;
    gap: 0.75rem;
    padding: 0 1.4rem 1.4rem;
}

:global(.date-modal__field) {
    display: grid;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f172a;
    font-family: 'Inter', -apple-system, sans-serif;
}

:global(.date-modal__field input) {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #0f172a;
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s;
}

:global(.date-modal__field input:focus) {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

:global(.date-modal__apply) {
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    background: #0d9488;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s;
}

:global(.date-modal__apply:hover) { background: #0f766e; }

/* Modal transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
