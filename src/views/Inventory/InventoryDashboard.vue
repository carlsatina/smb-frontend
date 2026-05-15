<template>
    <section class="inventory-page">
        <div class="inventory-shell">

            <!-- HEADER -->
            <header class="inventory-header">
                <div class="inventory-title">
                    <span class="inventory-eyebrow">Inventory</span>
                    <h1>Stock overview</h1>
                    <p>Monitor current stock for products and ingredients across {{ currentStoreLabel }}.</p>
                </div>
                <div class="inventory-kpis">
                    <div class="kpi-card">
                        <span class="kpi-label">Tracked items</span>
                        <span class="kpi-value">{{ totalItems }}</span>
                    </div>
                    <div class="kpi-card" :class="{ 'kpi-card--warn': lowStockCount > 0 }">
                        <span class="kpi-label">
                            <span v-if="lowStockCount > 0" class="kpi-dot kpi-dot--warn"></span>
                            Low stock
                        </span>
                        <span class="kpi-value">{{ lowStockCount }}</span>
                        <span class="kpi-sub">Needs attention</span>
                    </div>
                    <div class="kpi-card" :class="{ 'kpi-card--danger': outOfStockCount > 0 }">
                        <span class="kpi-label">
                            <span v-if="outOfStockCount > 0" class="kpi-dot kpi-dot--danger"></span>
                            Out of stock
                        </span>
                        <span class="kpi-value">{{ outOfStockCount }}</span>
                        <span class="kpi-sub">Needs restocking</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Active</span>
                        <span class="kpi-value">{{ activeCount }}</span>
                        <span class="kpi-sub">Ready for sale</span>
                    </div>
                </div>
            </header>

            <div class="inventory-content">

                <!-- MAIN COLUMN -->
                <div class="inventory-main">

                    <!-- TOOLBAR -->
                    <div class="inv-toolbar">
                        <div class="toolbar-left">
                            <div class="filter-pills">
                                <button class="pill" :class="{ active: filterType === 'ALL' }" @click="filterType = 'ALL'">All</button>
                                <button class="pill" :class="{ active: filterType === 'LOW_STOCK' }" @click="filterType = 'LOW_STOCK'">
                                    <span v-if="lowStockCount + outOfStockCount > 0" class="pill-alert-dot"></span>
                                    Low stock
                                </button>
                                <button class="pill" :class="{ active: filterType === 'PRODUCT' }" @click="filterType = 'PRODUCT'">Products</button>
                                <button
                                    v-if="showIngredients"
                                    class="pill"
                                    :class="{ active: filterType === 'INGREDIENT' }"
                                    @click="filterType = 'INGREDIENT'"
                                >
                                    Ingredients
                                </button>
                            </div>
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search items..."
                            />
                        </div>
                        <div class="toolbar-right">
                            <button class="ghost-button" :disabled="!storeContext.currentStoreId" @click="goToMovements">
                                Movement history
                            </button>
                            <button class="primary-button" :disabled="!storeContext.currentStoreId || !canAdjust" @click="goToAdjustments">
                                Stock adjustment
                            </button>
                        </div>
                    </div>

                    <!-- TABLE PANEL -->
                    <section class="inventory-panel">
                        <div v-if="!storeContext.currentStoreId" class="panel-state">
                            Select or create a store to view inventory.
                        </div>
                        <div v-else-if="isLoading" class="panel-state">Loading inventory...</div>
                        <div v-else class="table-wrap">
                            <table class="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th>Unit</th>
                                        <th>Stock level</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="item in paginatedStock"
                                        :key="`${item.itemType}-${item.itemId}`"
                                        :class="{
                                            'row-out-of-stock': isOutOfStock(item),
                                            'row-low-stock': !isOutOfStock(item) && isLowStock(item),
                                        }"
                                    >
                                        <td>
                                            <div class="item-name">{{ item.name }}</div>
                                            <div class="item-meta">
                                                <span v-if="item.sku">SKU {{ item.sku }}</span>
                                                <span v-if="item.category">{{ item.category }}</span>
                                            </div>
                                        </td>
                                        <td class="item-type">{{ formatSubType(item.subType) }}</td>
                                        <td class="item-unit">{{ item.unit }}</td>
                                        <td>
                                            <div class="stock-bar-cell">
                                                <div class="stock-bar-wrap">
                                                    <div
                                                        class="stock-bar-fill"
                                                        :class="stockBarClass(item)"
                                                        :style="{ width: stockBarWidth(item) + '%' }"
                                                    ></div>
                                                </div>
                                                <span class="stock-bar-label">{{ formatQty(item.currentQty) }}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span v-if="isOutOfStock(item)" class="status-pill status-pill--danger">Out of stock</span>
                                            <span v-else-if="isLowStock(item)" class="status-pill status-pill--warning">Low stock</span>
                                            <span v-else class="status-pill status-pill--active">Healthy</span>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredStock.length === 0">
                                        <td colspan="5" class="empty-state">
                                            No inventory items match your filters.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pagination" v-if="totalPages > 0">
                            <div class="pagination-info">
                                <span>{{ filteredStock.length }} item{{ filteredStock.length !== 1 ? 's' : '' }}</span>
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

                <!-- ASIDE -->
                <aside class="insight-panel">
                    <div class="insight-card" :class="{ 'insight-card--alert': lowStockItems.length > 0 }">
                        <h3>
                            <span v-if="lowStockItems.length > 0" class="alert-dot"></span>
                            Low stock alerts
                        </h3>
                        <div v-if="lowStockItems.length === 0" class="insight-empty">
                            All items are sufficiently stocked.
                        </div>
                        <ul v-else class="low-stock-list">
                            <li
                                v-for="item in lowStockItems.slice(0, 8)"
                                :key="`${item.itemType}-${item.itemId}`"
                                class="low-stock-item"
                            >
                                <div class="low-stock-name">{{ item.name }}</div>
                                <div class="low-stock-qty" :class="{ 'qty-zero': isOutOfStock(item) }">
                                    {{ isOutOfStock(item) ? 'Out' : formatQty(item.currentQty) + ' ' + item.unit }}
                                </div>
                            </li>
                        </ul>
                        <div v-if="lowStockItems.length > 8" class="insight-more">
                            +{{ lowStockItems.length - 8 }} more items
                        </div>
                    </div>

                    <div class="insight-card insight-card--actions">
                        <h3>Quick actions</h3>
                        <button class="secondary-button" :disabled="!canAdjust" @click="goToAdjustments">New adjustment</button>
                        <button class="secondary-button" @click="goToMovements">Movement history</button>
                        <button class="secondary-button" @click="goToProducts">Manage products</button>
                        <button v-if="showIngredients" class="secondary-button" @click="goToIngredients">Manage ingredients</button>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listStock, StockItem } from '@/api/inventory';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();

const stockItems = ref<StockItem[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const filterType = ref<'ALL' | 'PRODUCT' | 'INGREDIENT' | 'LOW_STOCK'>('ALL');
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];

const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const planKnown = computed(() => ownerPlanTier.value !== null);
const canUseIngredients = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'ingredients'));
const showIngredients = computed(() => !planKnown.value || canUseIngredients.value);

const loadStock = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) { stockItems.value = []; return; }
    isLoading.value = true;
    try {
        const data = await listStock(storeId);
        stockItems.value = data.stock;
    } finally {
        isLoading.value = false;
    }
};

const isOutOfStock = (item: StockItem) => item.currentQty === 0;

const isLowStock = (item: StockItem) => {
    if (!item.lowStockThreshold) return false;
    return item.currentQty > 0 && item.currentQty <= item.lowStockThreshold;
};

const stockBarWidth = (item: StockItem) => {
    if (item.currentQty === 0) return 0;
    if (!item.lowStockThreshold || item.lowStockThreshold === 0) return 100;
    const max = item.lowStockThreshold * 2;
    return Math.min(100, Math.round((item.currentQty / max) * 100));
};

const stockBarClass = (item: StockItem) => {
    if (isOutOfStock(item)) return 'stock-bar-fill--danger';
    if (isLowStock(item)) return 'stock-bar-fill--warn';
    return 'stock-bar-fill--healthy';
};

const filteredStock = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const type = filterType.value;
    return stockItems.value.filter((item) => {
        if (type === 'LOW_STOCK' && !isLowStock(item) && !isOutOfStock(item)) return false;
        if (type === 'PRODUCT' && item.itemType !== 'PRODUCT') return false;
        if (type === 'INGREDIENT' && item.itemType !== 'INGREDIENT') return false;
        if (query && !item.name.toLowerCase().includes(query) && !(item.sku || '').toLowerCase().includes(query) && !(item.category || '').toLowerCase().includes(query)) return false;
        return true;
    });
});

const totalPages = computed(() => {
    if (filteredStock.value.length === 0) return 0;
    return Math.ceil(filteredStock.value.length / pageSize.value);
});

const paginatedStock = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredStock.value.slice(start, start + pageSize.value);
});

const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
};

const totalItems = computed(() => stockItems.value.length);
const activeCount = computed(() => stockItems.value.filter((item) => item.active).length);
const lowStockCount = computed(() => stockItems.value.filter((item) => isLowStock(item)).length);
const outOfStockCount = computed(() => stockItems.value.filter((item) => isOutOfStock(item)).length);
const lowStockItems = computed(() => stockItems.value.filter((item) => isOutOfStock(item) || isLowStock(item)));

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'Select a store to get started.';
    return `${store.name} · ${store.currency}`;
});

const canAdjust = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatSubType = (subType: string) => {
    switch (subType) {
        case 'READY_MADE': return 'Ready-made';
        case 'RAW_MATERIAL': return 'Raw Material';
        case 'PACKAGING': return 'Packaging';
        default: return subType;
    }
};

const goToAdjustments = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/adjustments`);
};

const goToProducts = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/products`);
};

const goToIngredients = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/ingredients`);
};

const goToMovements = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/movements`);
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadStock();
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

watch(() => searchQuery.value, () => { page.value = 1; });
watch(() => filterType.value, () => { page.value = 1; });

watch(
    () => canUseIngredients.value,
    (allowed) => {
        if (!allowed && filterType.value === 'INGREDIENT') {
            filterType.value = 'PRODUCT';
        }
    }
);

watch(() => pageSize.value, () => { page.value = 1; });

watch(
    () => filteredStock.value.length,
    () => {
        if (page.value > totalPages.value && totalPages.value > 0) {
            page.value = totalPages.value;
        } else if (totalPages.value === 0) {
            page.value = 1;
        }
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        page.value = 1;
        await loadStock();
    }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.inventory-page {
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
.inventory-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ============================================================
   HEADER
============================================================ */
.inventory-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.inventory-eyebrow {
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

.inventory-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.inventory-title p {
    color: var(--c-muted);
    max-width: 480px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   KPI CARDS
============================================================ */
.inventory-kpis {
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

.kpi-card--danger {
    border-color: #fca5a5;
    background: #fef2f2;
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

.kpi-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.kpi-dot--warn { background: #f59e0b; }
.kpi-dot--danger { background: #ef4444; }

.kpi-value {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1;
}

.kpi-card--warn .kpi-value { color: #92400e; }
.kpi-card--danger .kpi-value { color: #b91c1c; }

.kpi-sub {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   LAYOUT
============================================================ */
.inventory-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1.5rem;
    align-items: start;
}

.inventory-main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.inv-toolbar {
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
   SEARCH INPUT
============================================================ */
.search-input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.6rem 0.9rem;
    min-width: 200px;
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
   MAIN PANEL
============================================================ */
.inventory-panel {
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
   TABLE
============================================================ */
.table-wrap { overflow-x: auto; }

.inventory-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.inventory-table thead th {
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

.inventory-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.inventory-table tbody tr:last-child { border-bottom: none; }
.inventory-table tbody tr:hover { background: #f8fafc; }

.inventory-table tbody tr.row-out-of-stock { background: #fff8f8; }
.inventory-table tbody tr.row-out-of-stock:hover { background: #fef2f2; }
.inventory-table tbody tr.row-low-stock { background: #fffdf0; }
.inventory-table tbody tr.row-low-stock:hover { background: #fefce8; }

.inventory-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.item-name {
    font-weight: 600;
    color: var(--c-text);
}

.item-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.1rem;
}

.item-type {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-accent-dark);
}

.item-unit {
    color: var(--c-muted);
    font-size: 0.85rem;
}

/* ============================================================
   STOCK BAR
============================================================ */
.stock-bar-cell {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 130px;
}

.stock-bar-wrap {
    flex: 1;
    height: 6px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
}

.stock-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
}

.stock-bar-fill--healthy { background: var(--c-accent); }
.stock-bar-fill--warn { background: #f59e0b; }
.stock-bar-fill--danger { background: #ef4444; width: 0 !important; }

.stock-bar-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    min-width: 32px;
    text-align: right;
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
.status-pill--warning { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.status-pill--danger { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }

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
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    border-radius: 8px;
    border: none;
    background: var(--c-accent);
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.primary-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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

.ghost-button:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.ghost-button:disabled { opacity: 0.4; cursor: not-allowed; }

.secondary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
    text-align: left;
}

.secondary-button:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.secondary-button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============================================================
   INSIGHT ASIDE
============================================================ */
.insight-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.insight-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
}

.insight-card--alert {
    border-color: #fbbf24;
    background: #fffbeb;
}

.insight-card--actions {
    background: rgba(13, 148, 136, 0.04);
    border-color: rgba(13, 148, 136, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.insight-card h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.85rem;
}

.alert-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f59e0b;
    flex-shrink: 0;
}

/* LOW STOCK LIST */
.low-stock-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.low-stock-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    font-size: 0.82rem;
}

.low-stock-item:last-child { border-bottom: none; }

.low-stock-name {
    font-weight: 600;
    color: var(--c-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.low-stock-qty {
    font-size: 0.78rem;
    font-weight: 600;
    color: #92400e;
    white-space: nowrap;
    flex-shrink: 0;
}

.low-stock-qty.qty-zero {
    color: #b91c1c;
}

.insight-empty {
    font-size: 0.82rem;
    color: var(--c-muted);
    line-height: 1.5;
}

.insight-more {
    margin-top: 0.6rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    cursor: pointer;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .inventory-content {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .inv-toolbar { flex-direction: column; align-items: flex-start; }
    .toolbar-right { width: 100%; justify-content: flex-end; }
    .search-input { min-width: 0; width: 100%; }
}

@media (max-width: 640px) {
    .inventory-page { padding: 1.25rem 1rem 2.5rem; }
    .inventory-title h1 { font-size: 1.5rem; }
    .filter-pills { flex-wrap: wrap; }
}
</style>
