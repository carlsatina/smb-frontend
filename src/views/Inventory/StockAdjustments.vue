<template>
    <section class="adjustment-page">
        <div class="adjustment-shell">
            <header class="adjustment-header">
                <div class="adjustment-title">
                    <span class="adjustment-eyebrow">Inventory</span>
                    <h1>Stock adjustments</h1>
                    <p>Record corrections, opening balances, and manual counts for {{ currentStoreLabel }}.</p>
                </div>
                <div class="adjustment-actions">
                    <button class="ghost-button" @click="goToInventory">Back to inventory</button>
                </div>
            </header>

            <div class="adjustment-content">
                <form class="adjustment-form" @submit.prevent="submitAdjustment">
                    <div v-if="formError" class="form-alert form-alert--error">{{ formError }}</div>
                    <div v-if="!canEdit" class="form-alert form-alert--warning">
                        You have view-only access. Ask an owner or inventory manager to record adjustments.
                    </div>
                    <div v-else-if="isNegativeBlocked" class="form-alert form-alert--warning">
                        This adjustment would drop stock below zero and is blocked by store settings.
                    </div>
                    <div class="form-section">
                        <div class="section-title">
                            <h2>Adjustment details</h2>
                            <p>Adjust by delta or set a target stock level.</p>
                        </div>

                        <div class="form-grid two-col">
                            <label class="field">
                                <span>Item type</span>
                                <select v-model="form.itemType" @change="resetItem" :disabled="!canEdit">
                                    <option value="PRODUCT">Product</option>
                                    <option value="INGREDIENT">Ingredient</option>
                                </select>
                            </label>
                            <div class="field">
                                <span>Item</span>
                                <div class="search-select" :class="{ open: showItemDropdown, disabled: !canEdit }">
                                    <div class="search-select__input-wrap">
                                        <input
                                            ref="itemSearchInput"
                                            v-model="itemSearch"
                                            type="text"
                                            class="search-select__input"
                                            :placeholder="selectedItem ? selectedItem.name : 'Search item...'"
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
                                            <span class="search-select__meta">{{ item.unit }} · Qty: {{ formatQty(item.currentQty) }}</span>
                                        </div>
                                        <div v-if="filteredItems.length === 0" class="search-select__empty">
                                            No items found
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mode-toggle">
                            <span class="mode-label">Adjustment mode</span>
                            <div class="mode-group">
                                <button
                                    type="button"
                                    class="mode-pill"
                                    :class="{ active: form.adjustmentMode === 'DELTA' }"
                                    :disabled="!canEdit"
                                    @click="form.adjustmentMode = 'DELTA'"
                                >
                                    Adjust by
                                </button>
                                <button
                                    type="button"
                                    class="mode-pill"
                                    :class="{ active: form.adjustmentMode === 'SET' }"
                                    :disabled="!canEdit"
                                    @click="form.adjustmentMode = 'SET'"
                                >
                                    Set stock to
                                </button>
                            </div>
                        </div>

                        <div class="form-grid two-col">
                            <label v-if="form.adjustmentMode === 'DELTA'" class="field">
                                <span>Adjustment amount <span class="field-hint">(+/−)</span></span>
                                <input v-model.number="form.qtyDelta" type="number" step="0.01" :disabled="!canEdit" />
                            </label>
                            <label v-else class="field">
                                <div class="field-head">
                                    <span>Target stock</span>
                                    <button
                                        type="button"
                                        class="field-action"
                                        :disabled="!canEdit || !selectedItem"
                                        @click="setTargetToCurrent"
                                    >
                                        Use current
                                    </button>
                                </div>
                                <input
                                    v-model.number="form.targetQty"
                                    type="number"
                                    step="0.01"
                                    :disabled="!canEdit"
                                    :placeholder="selectedItem ? String(selectedItem.currentQty) : '0'"
                                />
                            </label>
                            <label class="field">
                                <span>Unit cost (optional)</span>
                                <input v-model.number="form.unitCost" type="number" step="0.01" :disabled="!canEdit" />
                            </label>
                        </div>

                        <label class="field">
                            <span>Note</span>
                            <textarea
                                v-model="form.note"
                                rows="3"
                                placeholder="Reason for adjustment"
                                :disabled="!canEdit"
                            ></textarea>
                        </label>

                        <div class="form-summary">
                            <div>
                                <span class="summary-label">Current stock</span>
                                <span class="summary-value">
                                    {{ selectedItem ? formatQty(selectedItem.currentQty) : '—' }}
                                    <span v-if="selectedItem?.unit" class="summary-unit">{{ selectedItem.unit }}</span>
                                </span>
                            </div>
                            <div>
                                <span class="summary-label">Adjustment</span>
                                <span class="summary-value" :class="projectedDeltaClass">{{ deltaLabel }}</span>
                            </div>
                            <div>
                                <span class="summary-label">{{ projectedLabel }}</span>
                                <span class="summary-value" :class="projectedQtyClass">
                                    {{ projectedQty !== null ? formatQty(projectedQty) : '—' }}
                                    <span v-if="selectedItem?.unit && projectedQty !== null" class="summary-unit">{{ selectedItem.unit }}</span>
                                </span>
                            </div>
                            <div>
                                <span class="summary-label">Unit</span>
                                <span class="summary-value">{{ selectedItem?.unit || '—' }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="ghost-button" @click="goToInventory">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="isSubmitDisabled">
                            Save adjustment
                        </button>
                    </div>
                </form>

                <aside class="history-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Recent adjustments</h2>
                            <p>Latest stock corrections for this store.</p>
                        </div>
                        <span v-if="movements.length > 0" class="panel-count">{{ movements.length }} shown</span>
                    </div>
                    <div v-if="historyLoading" class="panel-state">Loading adjustments...</div>
                    <div v-else class="history-scroll">
                        <div class="history-list">
                            <div v-for="movement in movements" :key="movement.id" class="history-card">
                                <div class="history-top">
                                    <span class="history-item">{{ movement.itemName }}</span>
                                    <span class="history-delta" :class="movement.qtyDelta >= 0 ? 'positive' : 'negative'">
                                        {{ movement.qtyDelta >= 0 ? '+' : '' }}{{ formatQty(movement.qtyDelta) }}
                                    </span>
                                </div>
                                <div class="history-meta">
                                    <span>{{ movement.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                    <span>{{ formatDate(movement.createdAt) }}</span>
                                    <span v-if="movement.createdBy?.fullName">{{ movement.createdBy.fullName }}</span>
                                </div>
                                <p v-if="movement.note" class="history-note">{{ movement.note }}</p>
                            </div>
                            <div v-if="movements.length === 0" class="panel-state panel-state--muted">
                                No adjustments recorded yet.
                            </div>
                        </div>
                    </div>
                    <button
                        v-if="movements.length > 0"
                        class="view-all-btn"
                        @click="goToMovements"
                    >
                        View all movements
                        <mdicon name="arrow-right" size="16" />
                    </button>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createStockAdjustment, listMovements, listStock, MovementRecord, StockItem } from '@/api/inventory';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';

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
    return `${store.name} · ${store.currency}`;
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
    return date.toLocaleString();
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

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
    --c-bg: #f8fafc;
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
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.adjustment-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.adjustment-eyebrow {
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

.adjustment-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.adjustment-title p {
    color: var(--c-muted);
    max-width: 520px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

.adjustment-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}

/* ============================================================
   LAYOUT
============================================================ */
.adjustment-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 1.5rem;
    align-items: start;
}

/* ============================================================
   PANELS
============================================================ */
.adjustment-form {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.history-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-self: start;
}

/* ============================================================
   ALERTS
============================================================ */
.form-alert {
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.84rem;
    font-weight: 500;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.form-alert--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
}

.form-alert--warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
}

/* ============================================================
   FORM SECTIONS
============================================================ */
.form-section {
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-section:first-of-type { padding-top: 0; }
.form-section:last-of-type { border-bottom: none; padding-bottom: 0; }

.section-title h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.section-title p {
    margin: 0.2rem 0 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

/* ============================================================
   FORM GRID & FIELDS
============================================================ */
.form-grid {
    display: grid;
    gap: 1rem;
}

.form-grid.two-col {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.field-hint {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    text-transform: none;
    letter-spacing: 0;
}

.field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.field-action {
    border: none;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
    font-size: 0.7rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s;
}

.field-action:hover:not(:disabled) {
    background: rgba(13, 148, 136, 0.18);
}

.field-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.field input,
.field select,
.field textarea {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.65rem 0.9rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    resize: vertical;
}

.field input::placeholder,
.field textarea::placeholder {
    color: #94a3b8;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

/* ============================================================
   ADJUSTMENT MODE TOGGLE
============================================================ */
.mode-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 0.85rem;
    border-radius: 10px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
}

.mode-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-muted);
}

.mode-group {
    display: inline-flex;
    gap: 0.3rem;
    background: #f1f5f9;
    padding: 0.2rem;
    border-radius: 8px;
}

.mode-pill {
    border: none;
    background: transparent;
    color: var(--c-muted);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 0.35rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.mode-pill:hover:not(:disabled) { color: var(--c-text); }

.mode-pill.active {
    background: #ffffff;
    color: var(--c-text);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.mode-pill:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

/* ============================================================
   FORM SUMMARY PREVIEW
============================================================ */
.form-summary {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--c-border);
    border-radius: 10px;
    overflow: hidden;
}

.form-summary > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid var(--c-border);
    gap: 0.75rem;
}

.form-summary > div:last-child { border-bottom: none; }

.summary-label {
    font-size: 0.73rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.summary-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
}

.summary-value.positive { color: #059669; }
.summary-value.warn     { color: #b45309; }
.summary-value.negative { color: #dc2626; }

.summary-unit {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
}

/* ============================================================
   SEARCHABLE SELECT
============================================================ */
.search-select {
    position: relative;
}

.search-select.disabled {
    opacity: 0.55;
    pointer-events: none;
}

.search-select__input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.search-select__input {
    width: 100%;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.65rem 2.75rem 0.65rem 0.9rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-select__input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.search-select__input::placeholder {
    color: var(--c-text);
    opacity: 0.75;
}

.search-select__chevron {
    position: absolute;
    right: 0.75rem;
    color: var(--c-muted);
    pointer-events: none;
    transition: transform 0.2s;
}

.search-select.open .search-select__chevron {
    transform: rotate(180deg);
}

.search-select__clear {
    position: absolute;
    right: 2.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: #e2e8f0;
    color: var(--c-muted);
    cursor: pointer;
    transition: all 0.15s;
}

.search-select__clear:hover {
    background: #cbd5e1;
    color: var(--c-text);
}

.search-select__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
    max-height: 240px;
    overflow-y: auto;
    z-index: 100;
}

.search-select__option {
    padding: 0.6rem 0.9rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    transition: background 0.1s;
    border-bottom: 1px solid var(--c-border);
}

.search-select__option:last-child { border-bottom: none; }

.search-select__option:hover,
.search-select__option.highlighted {
    background: rgba(13, 148, 136, 0.06);
}

.search-select__option.selected {
    background: rgba(13, 148, 136, 0.1);
}

.search-select__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--c-text);
}

.search-select__meta {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.search-select__empty {
    padding: 1rem;
    text-align: center;
    color: var(--c-muted);
    font-size: 0.84rem;
}

/* ============================================================
   FORM ACTIONS
============================================================ */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--c-border);
}

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    border: none;
    background: var(--c-accent);
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); }

.primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 1rem;
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

.ghost-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.ghost-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ============================================================
   HISTORY PANEL (ASIDE)
============================================================ */
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    flex-shrink: 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--c-border);
}

.panel-header h2 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.15rem;
}

.panel-header p {
    color: var(--c-muted);
    font-size: 0.78rem;
    margin: 0;
}

.panel-count {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--c-muted);
    background: #f1f5f9;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
}

.panel-state {
    padding: 1.25rem;
    border-radius: 8px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

.panel-state--muted {
    background: #f8fafc;
    color: var(--c-muted);
}

.history-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.history-card {
    background: var(--c-surface);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.history-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
}

.history-item {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--c-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-delta {
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
}

.history-delta.positive { color: #059669; }
.history-delta.negative { color: #dc2626; }

.history-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.7rem;
    color: var(--c-muted);
}

.history-meta span:not(:last-child)::after {
    content: '·';
    margin-left: 0.5rem;
    color: #cbd5e1;
}

.history-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--c-muted);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.view-all-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-surface);
    color: var(--c-accent);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s;
}

.view-all-btn:hover {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.04);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .adjustment-content {
        grid-template-columns: 1fr;
    }

    .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
    }

    .form-actions .primary-button,
    .form-actions .ghost-button {
        width: 100%;
        justify-content: center;
    }

    .history-panel {
        max-height: 400px;
    }
}

@media (max-width: 640px) {
    .adjustment-page {
        padding: 1.25rem 1rem 2.5rem;
    }

    .adjustment-title h1 {
        font-size: 1.5rem;
    }
}
</style>