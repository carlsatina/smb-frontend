<template>
    <section class="inventory-page">
        <PullToRefresh :on-refresh="loadStock" :disabled="isLoading" />

        <div class="inventory-shell">

            <!-- HEADER -->
            <header class="inventory-header">
                <div class="inventory-title">
                    <span class="inventory-eyebrow">Inventory</span>
                    <h1>Stock overview</h1>
                    <p>Current stock for products and ingredients at {{ currentStoreLabel }}.</p>
                </div>
                <div class="header-actions">
                    <button class="ghost-button" :disabled="!storeContext.currentStoreId" @click="goToMovements">
                        <mdicon name="history" size="16" />
                        History
                    </button>
                    <button
                        v-if="otherStores.length > 0 && canAdjust"
                        class="ghost-button"
                        :disabled="!storeContext.currentStoreId"
                        @click="openTransferModal"
                    >
                        <mdicon name="swap-horizontal" size="16" />
                        Transfer
                    </button>
                    <button class="primary-button" :disabled="!storeContext.currentStoreId || !canAdjust" @click="goToAdjustments">
                        <mdicon name="plus" size="16" />
                        Stock adjustment
                    </button>
                </div>
            </header>

            <div v-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to view inventory.
            </div>

            <template v-else>
                <!-- STAT STRIP (doubles as status filter) -->
                <div class="stat-strip" role="group" aria-label="Filter by stock status">
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': statusFilter === 'ALL' }"
                        :aria-pressed="statusFilter === 'ALL'"
                        @click="statusFilter = 'ALL'"
                    >
                        <span class="stat-value">{{ totalItems }}</span>
                        <span class="stat-label">Tracked items</span>
                    </button>
                    <button
                        type="button"
                        class="stat stat--warn"
                        :class="{ 'stat--active': statusFilter === 'LOW', 'stat--flagged': lowStockCount > 0 }"
                        :aria-pressed="statusFilter === 'LOW'"
                        @click="toggleStatus('LOW')"
                    >
                        <span class="stat-value">{{ lowStockCount }}</span>
                        <span class="stat-label">Low stock</span>
                    </button>
                    <button
                        type="button"
                        class="stat stat--danger"
                        :class="{ 'stat--active': statusFilter === 'OUT', 'stat--flagged': outOfStockCount > 0 }"
                        :aria-pressed="statusFilter === 'OUT'"
                        @click="toggleStatus('OUT')"
                    >
                        <span class="stat-value">{{ outOfStockCount }}</span>
                        <span class="stat-label">Out of stock</span>
                    </button>
                </div>

                <!-- TABLE PANEL -->
                <section class="inventory-panel">
                    <div class="panel-toolbar">
                        <div class="search-wrap">
                            <mdicon name="magnify" size="17" class="search-icon" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search by name, SKU, or category…"
                            />
                        </div>
                        <div class="filter-pills">
                            <button class="pill" :class="{ active: typeFilter === 'ALL' }" @click="typeFilter = 'ALL'">All</button>
                            <button class="pill" :class="{ active: typeFilter === 'PRODUCT' }" @click="typeFilter = 'PRODUCT'">Products</button>
                            <button
                                v-if="showIngredients"
                                class="pill"
                                :class="{ active: typeFilter === 'INGREDIENT' }"
                                @click="typeFilter = 'INGREDIENT'"
                            >
                                Ingredients
                            </button>
                        </div>
                    </div>

                    <SkeletonLoader v-if="isLoading" :rows="8" label="Loading inventory…" />
                    <template v-else>
                        <div class="table-wrap">
                            <table class="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Stock level</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in paginatedStock" :key="`${item.itemType}-${item.itemId}`">
                                        <td>
                                            <div class="item-name">{{ item.name }}</div>
                                            <div class="item-meta">
                                                <span v-if="item.sku">SKU {{ item.sku }}</span>
                                                <span v-if="item.category">{{ item.category }}</span>
                                                <span>{{ formatSubType(item.subType) }}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="stock-bar-cell">
                                                <div class="stock-bar-wrap">
                                                    <div
                                                        class="stock-bar-fill"
                                                        :class="stockBarClass(item)"
                                                        :style="{ width: stockBarWidth(item) + '%' }"
                                                    ></div>
                                                </div>
                                                <span class="stock-bar-label">{{ formatQty(item.currentQty) }} {{ item.unit }}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span v-if="isOutOfStock(item)" class="status-pill status-pill--danger">Out of stock</span>
                                            <span v-else-if="isLowStock(item)" class="status-pill status-pill--warning">Low stock</span>
                                            <span v-else class="status-pill status-pill--active">Healthy</span>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredStock.length === 0">
                                        <td colspan="3" class="empty-state">
                                            {{ emptyMessage }}
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
                    </template>
                </section>
            </template>
        </div>
    </section>

    <!-- TRANSFER MODAL -->
    <Teleport to="body">
        <div v-if="showTransferModal" class="modal-backdrop" @click.self="closeTransferModal">
            <div class="modal-box modal-box--wide" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>Transfer stock</h2>
                    <button class="modal-close" @click="closeTransferModal" aria-label="Close">
                        <mdicon name="close" size="20" />
                    </button>
                </div>

                <div class="modal-body">
                    <!-- Destination -->
                    <div class="form-field">
                        <label>Destination store</label>
                        <select v-model="transferDestStoreId" class="form-select">
                            <option value="" disabled>Select destination…</option>
                            <option v-for="s in otherStores" :key="s.id" :value="s.id">
                                {{ s.name }}{{ s.storeType === 'WAREHOUSE' ? ' (Warehouse)' : '' }}
                            </option>
                        </select>
                    </div>

                    <!-- Item cart -->
                    <div class="form-field">
                        <div class="cart-header">
                            <label>Items to transfer</label>
                            <span class="cart-count" v-if="transferCart.length > 0">{{ transferCart.length }} item{{ transferCart.length !== 1 ? 's' : '' }}</span>
                        </div>

                        <!-- Cart rows -->
                        <div v-if="transferCart.length > 0" class="cart-list">
                            <div
                                v-for="(row, idx) in transferCart"
                                :key="`${row.item.itemType}-${row.item.itemId}`"
                                class="cart-row"
                            >
                                <div class="cart-row-info">
                                    <span class="cart-row-name">{{ row.item.name }}</span>
                                    <span class="cart-row-avail">{{ formatQty(row.item.currentQty) }} {{ row.item.unit }} available</span>
                                </div>
                                <input
                                    :ref="(el) => setQtyInput(el, idx)"
                                    v-model.number="row.qty"
                                    type="number"
                                    class="cart-qty-input"
                                    min="0.001"
                                    step="any"
                                    placeholder="Qty"
                                    :class="{ 'cart-qty-input--error': cartRowError(row) }"
                                />
                                <button class="cart-remove" @click="removeCartRow(idx)" title="Remove">
                                    <mdicon name="close" size="16" />
                                </button>
                            </div>
                        </div>

                        <!-- Add item search -->
                        <div class="search-select-wrap">
                            <input
                                v-model="transferItemSearch"
                                type="text"
                                class="form-input"
                                :placeholder="transferCart.length === 0 ? 'Search items to add…' : 'Add another item…'"
                                @focus="transferItemDropdown = true"
                                @blur="onTransferItemBlur"
                                @keydown.down.prevent="moveTransferHighlight(1)"
                                @keydown.up.prevent="moveTransferHighlight(-1)"
                                @keydown.enter.prevent="selectHighlightedTransferItem"
                                @keydown.esc="transferItemDropdown = false"
                            />
                            <ul v-if="transferItemDropdown && visibleTransferItems.length > 0" class="dropdown-list">
                                <li
                                    v-for="(item, i) in visibleTransferItems"
                                    :key="`${item.itemType}-${item.itemId}`"
                                    @mousedown.prevent="addToCart(item)"
                                    @mouseenter="transferHighlight = i"
                                    class="dropdown-item"
                                    :class="{ 'dropdown-item--active': i === transferHighlight }"
                                >
                                    <span class="di-name">{{ item.name }}</span>
                                    <span class="di-meta">{{ formatQty(item.currentQty) }} {{ item.unit }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Note -->
                    <div class="form-field">
                        <label>Note <span class="label-opt">(optional)</span></label>
                        <textarea
                            v-model="transferNote"
                            class="form-textarea"
                            rows="2"
                            placeholder="Reason or reference…"
                        ></textarea>
                    </div>

                    <p v-if="transferError" class="modal-error">{{ transferError }}</p>
                </div>

                <div class="modal-footer">
                    <button class="ghost-button" @click="closeTransferModal">Cancel</button>
                    <button
                        class="primary-button"
                        :disabled="!canSubmitTransfer || isTransferring"
                        @click="submitTransfer"
                    >
                        {{ isTransferring ? 'Transferring…' : `Transfer ${transferCart.length > 0 ? transferCart.length + ' item' + (transferCart.length !== 1 ? 's' : '') : ''}` }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useRoute, useRouter } from 'vue-router';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { batchTransferStock, listStock, StockItem } from '@/api/inventory';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();

const stockItems = ref<StockItem[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'LOW' | 'OUT'>('ALL');
const typeFilter = ref<'ALL' | 'PRODUCT' | 'INGREDIENT'>('ALL');
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

const isOutOfStock = (item: StockItem) => item.currentQty <= 0;

const isLowStock = (item: StockItem) => {
    if (!item.lowStockThreshold) return false;
    return item.currentQty > 0 && item.currentQty <= item.lowStockThreshold;
};

const stockBarWidth = (item: StockItem) => {
    if (item.currentQty <= 0) return 0;
    if (!item.lowStockThreshold || item.lowStockThreshold === 0) return 100;
    const max = item.lowStockThreshold * 2;
    return Math.min(100, Math.round((item.currentQty / max) * 100));
};

const stockBarClass = (item: StockItem) => {
    if (isOutOfStock(item)) return 'stock-bar-fill--danger';
    if (isLowStock(item)) return 'stock-bar-fill--warn';
    return 'stock-bar-fill--healthy';
};

const toggleStatus = (status: 'LOW' | 'OUT') => {
    statusFilter.value = statusFilter.value === status ? 'ALL' : status;
};

const filteredStock = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return stockItems.value.filter((item) => {
        if (statusFilter.value === 'LOW' && !isLowStock(item)) return false;
        if (statusFilter.value === 'OUT' && !isOutOfStock(item)) return false;
        if (typeFilter.value === 'PRODUCT' && item.itemType !== 'PRODUCT') return false;
        if (typeFilter.value === 'INGREDIENT' && item.itemType !== 'INGREDIENT') return false;
        if (query && !item.name.toLowerCase().includes(query) && !(item.sku || '').toLowerCase().includes(query) && !(item.category || '').toLowerCase().includes(query)) return false;
        return true;
    });
});

const emptyMessage = computed(() => {
    if (searchQuery.value.trim()) return 'No items match your search.';
    if (statusFilter.value === 'LOW') return 'No items are running low right now.';
    if (statusFilter.value === 'OUT') return 'Nothing is out of stock right now.';
    if (typeFilter.value === 'PRODUCT') return 'No products tracked yet. Add products to start tracking stock.';
    if (typeFilter.value === 'INGREDIENT') return 'No ingredients tracked yet. Add ingredients to start tracking stock.';
    return 'No inventory items yet. Add products or ingredients to start tracking stock.';
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
const lowStockCount = computed(() => stockItems.value.filter((item) => isLowStock(item)).length);
const outOfStockCount = computed(() => stockItems.value.filter((item) => isOutOfStock(item)).length);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const canAdjust = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const otherStores = computed(() =>
    storeContext.stores.filter((s) => s.id !== storeContext.currentStoreId)
);

// ── Transfer modal ──────────────────────────────────────────
type CartRow = { item: StockItem; qty: number | null };

const showTransferModal = ref(false);
const transferItemSearch = ref('');
const transferItemDropdown = ref(false);
const transferDestStoreId = ref('');
const transferCart = ref<CartRow[]>([]);
const transferNote = ref('');
const isTransferring = ref(false);
const transferError = ref('');

const cartItemIds = computed(() => new Set(transferCart.value.map((r) => `${r.item.itemType}-${r.item.itemId}`)));

const availableTransferItems = computed(() => {
    const q = transferItemSearch.value.trim().toLowerCase();
    return stockItems.value.filter((item) => {
        if (cartItemIds.value.has(`${item.itemType}-${item.itemId}`)) return false;
        if (!q) return true;
        return item.name.toLowerCase().includes(q) || (item.sku || '').toLowerCase().includes(q);
    });
});

// The dropdown only renders the first 12 matches; keyboard navigation operates
// over this same visible slice so the highlighted index always maps correctly.
const visibleTransferItems = computed(() => availableTransferItems.value.slice(0, 12));

// Keyboard navigation state for the add-item search dropdown.
const transferHighlight = ref(0);

// Refs to each cart row's qty input so we can focus the one just added.
const qtyInputs = ref<HTMLInputElement[]>([]);
const setQtyInput = (el: unknown, idx: number) => {
    if (el) qtyInputs.value[idx] = el as HTMLInputElement;
};

// Reset/clamp the highlight whenever the visible result set changes.
watch(visibleTransferItems, (items) => {
    if (transferHighlight.value > items.length - 1) {
        transferHighlight.value = Math.max(0, items.length - 1);
    }
});

const moveTransferHighlight = (delta: number) => {
    const count = visibleTransferItems.value.length;
    if (count === 0) return;
    transferItemDropdown.value = true;
    transferHighlight.value = (transferHighlight.value + delta + count) % count;
};

const selectHighlightedTransferItem = () => {
    if (!transferItemDropdown.value) return;
    const item = visibleTransferItems.value[transferHighlight.value];
    if (item) addToCart(item);
};

const cartRowError = (row: CartRow) => {
    if (row.qty === null || row.qty === undefined) return false;
    const store = storeContext.currentStore;
    if (store?.allowNegativeStock) return false;
    return row.qty > row.item.currentQty;
};

const canSubmitTransfer = computed(() => {
    if (!transferDestStoreId.value || transferCart.value.length === 0) return false;
    return transferCart.value.every(
        (r) => typeof r.qty === 'number' && r.qty > 0 && !cartRowError(r)
    );
});

const openTransferModal = () => {
    transferItemSearch.value = '';
    transferItemDropdown.value = false;
    transferHighlight.value = 0;
    qtyInputs.value = [];
    transferDestStoreId.value = '';
    transferCart.value = [];
    transferNote.value = '';
    transferError.value = '';
    showTransferModal.value = true;
};

const closeTransferModal = () => {
    showTransferModal.value = false;
};

const addToCart = (item: StockItem) => {
    transferCart.value.push({ item, qty: null });
    transferItemSearch.value = '';
    transferItemDropdown.value = false;
    transferHighlight.value = 0;
    // Move focus to the newly added row's qty input once it has rendered.
    const newRowIdx = transferCart.value.length - 1;
    nextTick(() => qtyInputs.value[newRowIdx]?.focus());
};

const removeCartRow = (idx: number) => {
    transferCart.value.splice(idx, 1);
};

const onTransferItemBlur = () => {
    setTimeout(() => { transferItemDropdown.value = false; }, 150);
};

const submitTransfer = async () => {
    if (!canSubmitTransfer.value || !storeContext.currentStoreId) return;
    transferError.value = '';
    isTransferring.value = true;
    try {
        await batchTransferStock(storeContext.currentStoreId, {
            destinationStoreId: transferDestStoreId.value,
            items: transferCart.value.map((r) => ({
                itemType: r.item.itemType,
                itemId: r.item.itemId,
                qty: r.qty!,
            })),
            note: transferNote.value || null,
        });
        showTransferModal.value = false;
        await loadStock();
    } catch (err: unknown) {
        const e = err as { message?: string };
        transferError.value = e?.message ?? 'Transfer failed. Please try again.';
    } finally {
        isTransferring.value = false;
    }
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatSubType = (subType: string) => {
    switch (subType) {
        case 'READY_MADE': return 'Ready-made';
        case 'RAW_MATERIAL': return 'Raw material';
        case 'PACKAGING': return 'Packaging';
        default: return subType;
    }
};

const goToAdjustments = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/adjustments`);
};

const goToMovements = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/movements`);
};

onMounted(async () => {
    // Show the skeleton from the first frame so the store fetch doesn't briefly
    // flash the empty-state table before the first load kicks in.
    isLoading.value = true;
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
watch(() => statusFilter.value, () => { page.value = 1; });
watch(() => typeFilter.value, () => { page.value = 1; });
watch(() => pageSize.value, () => { page.value = 1; });

watch(
    () => canUseIngredients.value,
    (allowed) => {
        if (!allowed && typeFilter.value === 'INGREDIENT') {
            typeFilter.value = 'PRODUCT';
        }
    }
);

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
.inventory-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

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

.header-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
}

/* ============================================================
   STAT STRIP (clickable status filters)
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
    border: none;
    border-left: 1px solid var(--c-border);
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
    min-width: 0;
}

.stat:first-child { border-left: none; }

.stat:hover { background: #f8fafc; }

.stat--active {
    background: rgba(13, 148, 136, 0.06);
    box-shadow: inset 0 -2px 0 var(--c-accent);
}

.stat--active:hover { background: rgba(13, 148, 136, 0.08); }

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

.stat--warn.stat--flagged .stat-value { color: #b45309; }
.stat--warn.stat--active { box-shadow: inset 0 -2px 0 #f59e0b; background: #fffbeb; }
.stat--warn.stat--active:hover { background: #fef3c7; }

.stat--danger.stat--flagged .stat-value { color: #b91c1c; }
.stat--danger.stat--active { box-shadow: inset 0 -2px 0 #ef4444; background: #fef2f2; }
.stat--danger.stat--active:hover { background: #fee2e2; }

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.inventory-panel {
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
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
}

.search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 380px;
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

.filter-pills {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 9px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
    flex-shrink: 0;
}

.pill {
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

.pill:hover { color: var(--c-text); }

.pill.active {
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
    white-space: nowrap;
}

.inventory-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.inventory-table tbody tr:last-child { border-bottom: none; }
.inventory-table tbody tr:hover { background: #f8fafc; }

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
   STOCK BAR
============================================================ */
.stock-bar-cell {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 170px;
}

.stock-bar-wrap {
    flex: 1;
    max-width: 140px;
    height: 6px;
    background: #eef2f5;
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
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
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
    border-radius: 9px;
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
    .search-wrap { max-width: none; }
    .filter-pills { width: 100%; }
    .filter-pills .pill { flex: 1; text-align: center; justify-content: center; }
}

@media (max-width: 640px) {
    .inventory-page { padding: 1rem 0.875rem 2.5rem; }
    .inventory-shell { gap: 1rem; }
    .inventory-header { flex-direction: column; gap: 0.875rem; }
    .inventory-title h1 { font-size: 1.5rem; }

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
    /* Primary action spans the full row beneath the two ghosts. */
    .header-actions .primary-button { grid-column: 1 / -1; }

    .stat { padding: 0.75rem 0.9rem; }
    .stat-value { font-size: 1.2rem; }
    .stat-label { font-size: 0.62rem; }

    .inventory-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .inventory-table thead { display: none; }
    .inventory-table,
    .inventory-table tbody { display: block; }

    .inventory-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        padding: 0.875rem 1rem;
        gap: 0.15rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .inventory-table tbody tr:last-child { border-bottom: none; }

    .inventory-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    /* Item name + meta */
    .inventory-table tbody td:nth-child(1) { grid-column: 1; grid-row: 1; }

    /* Stock bar — full width below name */
    .inventory-table tbody td:nth-child(2) {
        grid-column: 1 / -1;
        grid-row: 2;
        padding-top: 0.5rem;
    }
    .inventory-table tbody td:nth-child(2) .stock-bar-wrap { max-width: none; }

    /* Status — top right */
    .inventory-table tbody td:nth-child(3) {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }

    .inventory-table tbody td.empty-state { grid-column: 1 / -1; padding: 2.5rem 1rem; }
}

/* ============================================================
   TRANSFER MODAL
============================================================ */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
}

.modal-box {
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
}

.modal-box--wide {
    max-width: 600px;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.75rem 0;
}

.modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: var(--c-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}
.modal-close:hover { background: #e2e8f0; color: var(--c-text); }

.modal-body {
    padding: 1.25rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.modal-footer {
    padding: 0 1.75rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.form-field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.label-opt {
    font-weight: 400;
    color: var(--c-muted);
}

.form-input,
.form-select,
.form-textarea {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.6rem 0.875rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-textarea { resize: vertical; }

.search-select-wrap {
    position: relative;
}

.dropdown-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    list-style: none;
    margin: 0;
    padding: 0.35rem;
    z-index: 10;
    max-height: 220px;
    overflow-y: auto;
}

.dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 7px;
    cursor: pointer;
    font-size: 0.85rem;
    gap: 0.5rem;
    transition: background 0.1s;
}
.dropdown-item:hover,
.dropdown-item--active { background: #f1f5f9; }

.di-name {
    font-weight: 600;
    color: var(--c-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.di-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    white-space: nowrap;
    flex-shrink: 0;
}

.modal-error {
    font-size: 0.82rem;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 0.6rem 0.875rem;
    margin: 0;
}

/* ============================================================
   TRANSFER CART
============================================================ */
.cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
}

.cart-count {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.1);
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
}

.cart-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    overflow: hidden;
}

.cart-row {
    display: grid;
    grid-template-columns: 1fr 90px 32px;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--c-border);
}

.cart-row:last-child { border-bottom: none; }

.cart-row-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}

.cart-row-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cart-row-avail {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.cart-qty-input {
    border: 1.5px solid var(--c-border);
    border-radius: 7px;
    padding: 0.4rem 0.5rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: #fff;
    text-align: right;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
}

.cart-qty-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.cart-qty-input--error {
    border-color: #ef4444;
    background: #fef2f2;
}
.cart-qty-input--error:focus {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.cart-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    flex-shrink: 0;
}
.cart-remove:hover { background: #fef2f2; color: #ef4444; }
</style>
