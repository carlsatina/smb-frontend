<template>
    <section class="adjustment-page">
        <PullToRefresh :on-refresh="loadStock" :disabled="isLoading" />

        <div class="adjustment-shell">
            <header class="detail-header">
                <button type="button" class="back-link" @click="goToInventory">
                    <mdicon name="arrow-left" size="15" />
                    Inventory
                </button>
                <div class="detail-header-row">
                    <div class="detail-title">
                        <h1>Stock adjustment</h1>
                        <p>Record corrections, opening balances, and manual counts for {{ currentStoreLabel }}.</p>
                    </div>
                </div>
            </header>

            <div class="adjustment-content">
                <form class="form-card" @submit.prevent="submitAdjustment">
                    <div v-if="formError" class="form-alert form-alert--error">{{ formError }}</div>
                    <div v-if="!canEdit" class="form-alert form-alert--warning">
                        You have view-only access. Ask an owner or inventory manager to record adjustments.
                    </div>
                    <div v-else-if="isNegativeBlocked" class="form-alert form-alert--warning">
                        This adjustment would drop stock below zero and is blocked by store settings.
                    </div>

                    <div class="field">
                        <span>Item type</span>
                        <div class="segmented">
                            <button
                                type="button"
                                class="segmented-pill"
                                :class="{ active: form.itemType === 'INGREDIENT' }"
                                :disabled="!canEdit"
                                @click="form.itemType = 'INGREDIENT'; resetItem()"
                            >Ingredient</button>
                            <button
                                type="button"
                                class="segmented-pill"
                                :class="{ active: form.itemType === 'PRODUCT' }"
                                :disabled="!canEdit"
                                @click="form.itemType = 'PRODUCT'; resetItem()"
                            >Product</button>
                        </div>
                    </div>

                    <div class="field">
                        <span>Item</span>
                        <div class="search-select" :class="{ open: showItemDropdown, disabled: !canEdit }">
                            <div class="search-select__input-wrap">
                                <input
                                    ref="itemSearchInput"
                                    v-model="itemSearch"
                                    type="text"
                                    class="search-select__input"
                                    :placeholder="selectedItem ? selectedItem.name : 'Search item…'"
                                    :class="{ 'has-selection': selectedItem && !itemSearch }"
                                    :disabled="!canEdit"
                                    @focus="openItemDropdown"
                                    @input="openItemDropdown"
                                    @keydown.down.prevent="navigateDropdown(1)"
                                    @keydown.up.prevent="navigateDropdown(-1)"
                                    @keydown.enter.prevent="selectHighlightedItem"
                                    @keydown.escape="closeItemDropdown"
                                />
                                <button
                                    v-if="form.itemId"
                                    type="button"
                                    class="search-select__clear"
                                    :disabled="!canEdit"
                                    @click.stop="clearItemSelection"
                                >
                                    <mdicon name="close" size="16" />
                                </button>
                                <mdicon name="chevron-down" size="18" class="search-select__chevron" />
                            </div>
                            <div v-if="showItemDropdown" class="search-select__dropdown">
                                <div
                                    v-for="(item, index) in filteredItems"
                                    :key="item.itemId"
                                    class="search-select__option"
                                    :class="{
                                        selected: item.itemId === form.itemId,
                                        highlighted: index === highlightedIndex
                                    }"
                                    @click="selectItem(item)"
                                    @mouseenter="highlightedIndex = index"
                                >
                                    <span class="search-select__name">{{ item.name }}</span>
                                    <span class="search-select__meta">{{ formatQty(item.currentQty) }} {{ item.unit }}</span>
                                </div>
                                <div v-if="filteredItems.length === 0" class="search-select__empty">
                                    No items found
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="field">
                        <span>Adjustment mode</span>
                        <div class="segmented">
                            <button
                                type="button"
                                class="segmented-pill"
                                :class="{ active: form.adjustmentMode === 'DELTA' }"
                                :disabled="!canEdit"
                                @click="form.adjustmentMode = 'DELTA'"
                            >Adjust by</button>
                            <button
                                type="button"
                                class="segmented-pill"
                                :class="{ active: form.adjustmentMode === 'SET' }"
                                :disabled="!canEdit"
                                @click="form.adjustmentMode = 'SET'"
                            >Set stock to</button>
                        </div>
                    </div>

                    <div class="form-grid">
                        <label v-if="form.adjustmentMode === 'DELTA'" class="field">
                            <span>Adjustment amount <em>+/−</em></span>
                            <div class="unit-input">
                                <input v-model.number="form.qtyDelta" type="number" step="0.01" :disabled="!canEdit" />
                                <span v-if="selectedItem?.unit" class="unit-suffix">{{ selectedItem.unit }}</span>
                            </div>
                        </label>
                        <label v-else class="field">
                            <span class="field-head">
                                Target stock
                                <button
                                    type="button"
                                    class="field-action"
                                    :disabled="!canEdit || !selectedItem"
                                    @click="setTargetToCurrent"
                                >
                                    Use current
                                </button>
                            </span>
                            <div class="unit-input">
                                <input
                                    v-model.number="form.targetQty"
                                    type="number"
                                    step="0.01"
                                    :disabled="!canEdit"
                                    :placeholder="selectedItem ? String(selectedItem.currentQty) : '0'"
                                />
                                <span v-if="selectedItem?.unit" class="unit-suffix">{{ selectedItem.unit }}</span>
                            </div>
                        </label>
                        <label class="field">
                            <span>Unit cost <em>optional</em></span>
                            <input v-model.number="form.unitCost" type="number" step="0.01" min="0" :disabled="!canEdit" />
                        </label>
                    </div>

                    <label class="field">
                        <span>Note <em>optional</em></span>
                        <textarea
                            v-model="form.note"
                            rows="2"
                            placeholder="Reason for adjustment"
                            :disabled="!canEdit"
                        ></textarea>
                    </label>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span>Current stock</span>
                            <strong>
                                {{ selectedItem ? formatQty(selectedItem.currentQty) : '—' }}
                                <em v-if="selectedItem?.unit">{{ selectedItem.unit }}</em>
                            </strong>
                        </div>
                        <div class="meta-item">
                            <span>Adjustment</span>
                            <strong :class="projectedDeltaClass">{{ deltaLabel }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>{{ projectedLabel }}</span>
                            <strong :class="projectedQtyClass">
                                {{ projectedQty !== null ? formatQty(projectedQty) : '—' }}
                                <em v-if="selectedItem?.unit && projectedQty !== null">{{ selectedItem.unit }}</em>
                            </strong>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="ghost-button" @click="goToInventory">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="isSubmitDisabled">
                            {{ isSaving ? 'Saving…' : 'Save adjustment' }}
                        </button>
                    </div>
                </form>

                <aside class="history-card">
                    <div class="card-title card-title--row">
                        <div>
                            <h2>Recent adjustments</h2>
                            <p>Latest corrections for this store</p>
                        </div>
                        <button
                            v-if="movements.length > 0"
                            class="card-link"
                            type="button"
                            @click="goToMovements"
                        >
                            View all
                            <mdicon name="chevron-right" size="14" />
                        </button>
                    </div>

                    <SkeletonLoader v-if="historyLoading" :rows="4" label="Loading adjustments…" />
                    <div v-else-if="movements.length === 0" class="panel-state panel-state--small">
                        Adjustments appear here as you record them.
                    </div>
                    <div v-else class="history-scroll">
                        <div v-for="movement in movements" :key="movement.id" class="history-row">
                            <div class="history-top">
                                <span class="history-item">{{ movement.itemName }}</span>
                                <span class="history-delta" :class="movement.qtyDelta >= 0 ? 'positive' : 'negative'">
                                    {{ movement.qtyDelta >= 0 ? '+' : '' }}{{ formatQty(movement.qtyDelta) }}
                                    <em v-if="movement.itemUnit">{{ movement.itemUnit }}</em>
                                </span>
                            </div>
                            <div class="history-meta">
                                <span>{{ movement.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                <span>{{ formatDate(movement.createdAt) }}</span>
                                <span v-if="movement.createdBy?.fullName">{{ movement.createdBy.fullName }}</span>
                            </div>
                            <p v-if="movement.note" class="history-note">{{ movement.note }}</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useRoute, useRouter } from 'vue-router';
import { createStockAdjustment, listMovements, listStock, MovementRecord, StockItem } from '@/api/inventory';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const stockItems = ref<StockItem[]>([]);
const movements = ref<MovementRecord[]>([]);
const isLoading = ref(false);
const historyLoading = ref(false);
const isSaving = ref(false);
const formError = ref('');

// Searchable item dropdown
const itemSearch = ref('');
const showItemDropdown = ref(false);
const highlightedIndex = ref(0);
const itemSearchInput = ref<HTMLInputElement | null>(null);

const form = reactive({
    itemType: 'INGREDIENT' as 'PRODUCT' | 'INGREDIENT',
    itemId: '',
    adjustmentMode: 'DELTA' as 'DELTA' | 'SET',
    qtyDelta: 0,
    targetQty: null as number | null,
    unitCost: null as number | null,
    note: '',
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const canEdit = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const availableItems = computed(() => {
    return stockItems.value.filter((item) => item.itemType === form.itemType);
});

const filteredItems = computed(() => {
    const query = itemSearch.value.trim().toLowerCase();
    if (!query) return availableItems.value;
    return availableItems.value.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query))
    );
});

const openItemDropdown = () => {
    showItemDropdown.value = true;
    highlightedIndex.value = 0;
};

const closeItemDropdown = () => {
    showItemDropdown.value = false;
    itemSearch.value = '';
};

const selectItem = (item: StockItem) => {
    form.itemId = item.itemId;
    itemSearch.value = '';
    showItemDropdown.value = false;
    formError.value = '';
};

const clearItemSelection = () => {
    form.itemId = '';
    form.qtyDelta = 0;
    form.targetQty = null;
    itemSearch.value = '';
    formError.value = '';
};

const navigateDropdown = (direction: number) => {
    if (!showItemDropdown.value) {
        openItemDropdown();
        return;
    }
    const maxIndex = filteredItems.value.length - 1;
    highlightedIndex.value = Math.max(0, Math.min(maxIndex, highlightedIndex.value + direction));
};

const selectHighlightedItem = () => {
    if (filteredItems.value.length > 0 && highlightedIndex.value < filteredItems.value.length) {
        selectItem(filteredItems.value[highlightedIndex.value]);
    }
};

const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-select')) {
        closeItemDropdown();
    }
};

const selectedItem = computed(() => {
    return stockItems.value.find((item) => item.itemId === form.itemId) || null;
});

const resolvedDelta = computed(() => {
    if (!selectedItem.value) return null;
    if (form.adjustmentMode === 'SET') {
        if (!Number.isFinite(form.targetQty)) return null;
        return Number(form.targetQty) - selectedItem.value.currentQty;
    }
    if (!Number.isFinite(form.qtyDelta)) return null;
    return Number(form.qtyDelta);
});

const projectedQty = computed(() => {
    if (!selectedItem.value) return null;
    if (resolvedDelta.value === null) return null;
    return selectedItem.value.currentQty + resolvedDelta.value;
});

const isNegativeBlocked = computed(() => {
    if (storeContext.currentStore?.allowNegativeStock) return false;
    if (projectedQty.value === null) return false;
    return projectedQty.value < 0;
});

const deltaLabel = computed(() => {
    if (resolvedDelta.value === null) return '—';
    if (resolvedDelta.value === 0) return '0';
    return `${resolvedDelta.value > 0 ? '+' : ''}${formatQty(resolvedDelta.value)}`;
});

const projectedLabel = computed(() => (form.adjustmentMode === 'SET' ? 'Target stock' : 'Projected stock'));

const projectedDeltaClass = computed(() => {
    if (resolvedDelta.value === null || resolvedDelta.value === 0) return '';
    return resolvedDelta.value > 0 ? 'positive' : 'warn';
});

const projectedQtyClass = computed(() => {
    if (isNegativeBlocked.value) return 'negative';
    if (projectedQty.value === null || resolvedDelta.value === null || resolvedDelta.value === 0) return '';
    if (resolvedDelta.value > 0) return 'positive';
    return 'warn';
});

const isSubmitDisabled = computed(() => {
    if (isSaving.value || !canEdit.value) return true;
    if (!form.itemId) return true;
    if (resolvedDelta.value === null || resolvedDelta.value === 0) return true;
    if (isNegativeBlocked.value) return true;
    return false;
});

const resetItem = () => {
    form.itemId = '';
    form.qtyDelta = 0;
    form.targetQty = null;
    itemSearch.value = '';
    showItemDropdown.value = false;
    formError.value = '';
};

const setTargetToCurrent = () => {
    if (!selectedItem.value) return;
    form.targetQty = Number(selectedItem.value.currentQty);
    formError.value = '';
};

watch(
    () => form.adjustmentMode,
    () => {
        formError.value = '';
    }
);

const loadStock = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        stockItems.value = [];
        return;
    }
    isLoading.value = true;
    try {
        const data = await listStock(storeId);
        stockItems.value = data.stock;
    } finally {
        isLoading.value = false;
    }
};

const loadMovements = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        movements.value = [];
        return;
    }
    historyLoading.value = true;
    try {
        const data = await listMovements(storeId, { type: 'STOCK_ADJUSTMENT', pageSize: 25 });
        movements.value = data.movements;
    } finally {
        historyLoading.value = false;
    }
};

const submitAdjustment = async () => {
    if (!storeContext.currentStoreId) return;
    if (!canEdit.value) {
        formError.value = 'You do not have permission to record adjustments.';
        return;
    }
    if (!form.itemId) {
        formError.value = 'Select an item before saving.';
        return;
    }
    if (resolvedDelta.value === null || resolvedDelta.value === 0) {
        formError.value =
            form.adjustmentMode === 'SET'
                ? 'Target stock must be different from current.'
                : 'Quantity delta must be non-zero.';
        return;
    }
    if (isNegativeBlocked.value) {
        formError.value = 'Adjustment would result in negative stock.';
        return;
    }
    formError.value = '';
    isSaving.value = true;
    try {
        const payload = {
            itemType: form.itemType,
            itemId: form.itemId,
            adjustmentMode: form.adjustmentMode,
            unitCost: form.unitCost === null ? null : Number(form.unitCost),
            note: form.note || null,
        } as const;

        if (form.adjustmentMode === 'SET') {
            await createStockAdjustment(storeContext.currentStoreId, {
                ...payload,
                targetQty: Number(form.targetQty),
            });
        } else {
            await createStockAdjustment(storeContext.currentStoreId, {
                ...payload,
                qtyDelta: Number(resolvedDelta.value),
            });
        }
        showToast('Stock adjustment recorded.');
        form.qtyDelta = 0;
        form.targetQty = null;
        form.unitCost = null;
        form.note = '';
        await loadStock();
        await loadMovements();
    } catch (error) {
        const message =
            typeof error === 'object' && error && 'body' in error
                ? (error as { body?: { error?: { message?: string } } }).body?.error?.message
                : null;
        formError.value = message || 'Unable to save adjustment.';
    } finally {
        isSaving.value = false;
    }
};

const goToInventory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory`);
};

const goToMovements = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/movements`);
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });
};

onMounted(async () => {
    document.addEventListener('click', handleClickOutside);
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadStock();
    // Land focus on the item search so the user can start typing immediately.
    await nextTick();
    if (canEdit.value) itemSearchInput.value?.focus();
    await loadMovements();
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
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
        await loadStock();
        await loadMovements();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.adjustment-page {
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
.adjustment-shell {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.detail-header {
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

.detail-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

.detail-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.detail-title p {
    color: var(--c-muted);
    max-width: 520px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   LAYOUT
============================================================ */
.adjustment-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 1.25rem;
    align-items: start;
}

/* ============================================================
   FORM CARD
============================================================ */
.form-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
}

.form-alert {
    border-radius: 10px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
    line-height: 1.5;
}

.form-alert--error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #b91c1c;
}

.form-alert--warning {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    color: #92400e;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}

.field > span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.field > span em {
    font-style: normal;
    font-weight: 400;
    color: var(--c-muted);
}

.field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.field-action {
    border: none;
    background: none;
    padding: 0;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: inherit;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.field-action:hover:not(:disabled) { text-decoration: underline; }
.field-action:disabled { opacity: 0.4; cursor: not-allowed; }

.field input,
.field textarea {
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

.field input::placeholder,
.field textarea::placeholder { color: #94a3b8; }

.field input:focus,
.field textarea:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.field input:disabled,
.field textarea:disabled { background: #f1f5f9; color: #94a3b8; }

.field textarea { resize: vertical; }

.unit-input {
    position: relative;
}

.unit-input input { padding-right: 3rem; }

.unit-suffix {
    position: absolute;
    right: 0.85rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-muted);
    pointer-events: none;
}

/* ── Segmented pills ── */
.segmented {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 9px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
    width: fit-content;
}

.segmented-pill {
    border: none;
    background: transparent;
    padding: 0.4rem 1rem;
    border-radius: 7px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-muted);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.segmented-pill:hover:not(:disabled) { color: var(--c-text); }

.segmented-pill.active {
    background: var(--c-surface);
    color: var(--c-accent-dark);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
}

.segmented-pill:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Searchable select ── */
.search-select { position: relative; }

.search-select__input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.search-select__input {
    padding-right: 4.2rem !important;
}

.search-select__input.has-selection::placeholder { color: var(--c-text); font-weight: 600; }

.search-select.disabled .search-select__input { background: #f1f5f9; }

.search-select__clear {
    position: absolute;
    right: 2.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: none;
    background: #f1f5f9;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.search-select__clear:hover { background: #e2e8f0; color: var(--c-text); }

.search-select__chevron {
    position: absolute;
    right: 0.7rem;
    color: #94a3b8;
    pointer-events: none;
}

.search-select__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    z-index: 20;
    max-height: 240px;
    overflow-y: auto;
    padding: 0.35rem;
}

.search-select__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.1s;
}

.search-select__option.highlighted,
.search-select__option:hover { background: #f1f5f9; }

.search-select__option.selected { background: rgba(13, 148, 136, 0.08); }

.search-select__name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.search-select__meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    white-space: nowrap;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
}

.search-select__empty {
    padding: 0.75rem;
    font-size: 0.82rem;
    color: var(--c-muted);
    text-align: center;
}

/* ── Live summary ── */
.meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
    white-space: nowrap;
}

.meta-item > strong {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.meta-item > strong em {
    font-style: normal;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
}

.meta-item > strong.positive { color: #059669; }
.meta-item > strong.warn { color: #b45309; }
.meta-item > strong.negative { color: #dc2626; }

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding-top: 0.25rem;
}

/* ============================================================
   HISTORY CARD
============================================================ */
.history-card {
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
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

.panel-state--small {
    padding: 1.5rem 1rem;
    font-size: 0.82rem;
}

.history-scroll {
    max-height: 520px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0 -0.25rem;
    padding: 0 0.25rem;
}

.history-row {
    padding: 0.7rem 0.85rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 10px;
}

.history-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
}

.history-item {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.history-delta {
    font-size: 0.85rem;
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.history-delta em {
    font-style: normal;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--c-muted);
}

.history-delta.positive { color: #059669; }
.history-delta.negative { color: #dc2626; }

.history-meta {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    font-size: 0.72rem;
    color: var(--c-muted);
    margin-top: 0.2rem;
}

.history-meta span + span::before {
    content: '·';
    margin-right: 0.35rem;
    color: #cbd5e1;
}

.history-note {
    margin: 0.3rem 0 0;
    font-size: 0.75rem;
    font-style: italic;
    color: var(--c-muted);
}

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.2rem;
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
@media (max-width: 900px) {
    .adjustment-content { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
    .adjustment-page { padding: 1rem 0.875rem 2.5rem; }
    .adjustment-shell { gap: 1rem; }
    .detail-title h1 { font-size: 1.5rem; }

    .form-card,
    .history-card { padding: 1.1rem; border-radius: 12px; }
    .form-grid { grid-template-columns: 1fr; }
    .meta-grid { grid-template-columns: 1fr; }
    .segmented { width: 100%; }
    .segmented-pill { flex: 1; }

    .form-actions { flex-direction: row; }
    .form-actions .ghost-button,
    .form-actions .primary-button { flex: 1; justify-content: center; }
}
</style>
