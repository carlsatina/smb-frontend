<template>
    <section class="supplies-page">
        <PullToRefresh :on-refresh="loadAll" :disabled="isLoading" />

        <div class="supplies-shell">
            <header class="detail-header">
                <button type="button" class="back-link" @click="goToInventory">
                    <mdicon name="arrow-left" size="15" />
                    Inventory
                </button>
                <div class="detail-title">
                    <h1>Supplies</h1>
                    <p>Count and record gloves, alcohol, trash bags and other store supplies for {{ currentStoreLabel }}.</p>
                </div>
            </header>

            <div class="segmented" role="tablist" aria-label="Supplies mode">
                <button
                    type="button"
                    role="tab"
                    class="segmented-pill"
                    :class="{ active: mode === 'COUNT' }"
                    :aria-selected="mode === 'COUNT'"
                    @click="setMode('COUNT')"
                >
                    <mdicon name="clipboard-check-outline" size="16" />
                    Count
                </button>
                <button
                    type="button"
                    role="tab"
                    class="segmented-pill"
                    :class="{ active: mode === 'USAGE' }"
                    :aria-selected="mode === 'USAGE'"
                    @click="setMode('USAGE')"
                >
                    <mdicon name="minus-circle-outline" size="16" />
                    Record usage
                </button>
            </div>

            <div class="supplies-content">
                <form class="panel" @submit.prevent="submit">
                    <p class="mode-hint">
                        <template v-if="mode === 'COUNT'">
                            Enter what's on the shelf. The difference from expected stock is recorded as usage.
                            Leave an item blank to skip it.
                        </template>
                        <template v-else>
                            Enter how much was just used, for example when a new box is opened.
                        </template>
                    </p>

                    <div v-if="formError" class="form-alert form-alert--error">{{ formError }}</div>
                    <div v-if="!canEdit" class="form-alert form-alert--warning">
                        You have view-only access. Ask an owner or inventory manager to record supplies.
                    </div>

                    <SkeletonLoader v-if="isLoading" variant="table" :count="4" />

                    <div v-else-if="supplies.length === 0" class="empty-state">
                        <mdicon name="spray-bottle" size="32" />
                        <p>No supplies yet.</p>
                        <span>Add gloves, alcohol, trash bags and similar items with the <strong>Supply</strong> category.</span>
                        <button type="button" class="ghost-button" @click="goToItems">Go to Items &amp; Supplies</button>
                    </div>

                    <template v-else>
                        <div class="search-wrap">
                            <mdicon name="magnify" size="16" class="search-icon" />
                            <input v-model="search" type="search" placeholder="Search supplies…" aria-label="Search supplies" />
                        </div>

                        <div class="table-wrap">
                            <table class="supplies-table">
                                <thead>
                                    <tr>
                                        <th>Supply</th>
                                        <th class="num">Expected</th>
                                        <th class="num">{{ mode === 'COUNT' ? 'Counted' : 'Used' }}</th>
                                        <th class="num">{{ mode === 'COUNT' ? 'Used since last count' : 'Stock after' }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="supply in visibleSupplies" :key="supply.itemId" :class="{ 'row-entered': hasEntry(supply.itemId) }">
                                        <td class="col-name" data-label="Supply">
                                            <div class="supply-name">{{ supply.name }}</div>
                                            <div v-if="supply.isLow" class="low-chip">Low stock</div>
                                        </td>
                                        <td class="num" data-label="Expected">{{ formatQty(supply.currentQty) }} {{ supply.unit }}</td>
                                        <td class="num col-input" :data-label="mode === 'COUNT' ? 'Counted' : 'Used'">
                                            <div class="unit-input">
                                                <input
                                                    v-model="entries[supply.itemId]"
                                                    type="number"
                                                    inputmode="decimal"
                                                    min="0"
                                                    step="any"
                                                    :placeholder="mode === 'COUNT' ? '—' : '0'"
                                                    :disabled="!canEdit || isSaving"
                                                    :aria-label="`${mode === 'COUNT' ? 'Counted' : 'Used'} ${supply.name}`"
                                                />
                                                <span class="unit-suffix">{{ supply.unit }}</span>
                                            </div>
                                        </td>
                                        <td class="num" :data-label="mode === 'COUNT' ? 'Used' : 'Stock after'">
                                            <div v-if="previewFor(supply)" class="preview">
                                                <span :class="previewFor(supply)!.tone">{{ previewFor(supply)!.label }}</span>
                                                <span v-if="previewFor(supply)!.cost" class="cost-note">{{ previewFor(supply)!.cost }}</span>
                                            </div>
                                            <span v-else class="muted">—</span>
                                        </td>
                                    </tr>
                                    <tr v-if="visibleSupplies.length === 0">
                                        <td colspan="4" class="muted center">No supplies match your search.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="hasBlockedRow" class="form-alert form-alert--warning">
                            Some items would drop below zero, which this store doesn't allow. Record the delivery first or lower the amount.
                        </div>

                        <label class="field">
                            <span>Note <em>(optional)</em></span>
                            <input v-model="note" type="text" maxlength="500" :placeholder="mode === 'COUNT' ? 'e.g. Weekly count' : 'e.g. Opened new box'" :disabled="!canEdit" />
                        </label>

                        <div class="submit-bar">
                            <div class="summary">
                                <strong>{{ enteredCount }}</strong> {{ enteredCount === 1 ? 'item' : 'items' }}
                                <template v-if="summaryCost > 0"> · usage {{ formatMoney(summaryCost) }}</template>
                            </div>
                            <button type="submit" class="primary-button" :disabled="isSubmitDisabled">
                                {{ isSaving ? 'Saving…' : mode === 'COUNT' ? 'Save count' : 'Record usage' }}
                            </button>
                        </div>
                    </template>
                </form>

                <aside class="panel history">
                    <div class="history-head">
                        <h2>Recent usage</h2>
                        <button type="button" class="link-button" @click="goToMovements">All movements</button>
                    </div>
                    <SkeletonLoader v-if="historyLoading" variant="table" :count="3" />
                    <p v-else-if="history.length === 0" class="muted">No supply usage recorded yet.</p>
                    <ul v-else class="history-list">
                        <li v-for="movement in history" :key="movement.id">
                            <div class="history-row">
                                <span class="history-name">{{ movement.itemName }}</span>
                                <span class="history-qty">{{ formatQty(movement.qtyDelta) }} {{ movement.itemUnit || '' }}</span>
                            </div>
                            <div class="history-meta">
                                <span>{{ movement.referenceType === 'SUPPLY_COUNT' ? 'Count' : 'Usage' }}</span>
                                <span>{{ formatDate(movement.createdAt) }}</span>
                                <span v-if="movement.createdBy?.fullName">{{ movement.createdBy.fullName }}</span>
                            </div>
                            <p v-if="movement.note" class="history-note">{{ movement.note }}</p>
                        </li>
                    </ul>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PullToRefresh from '@/components/PullToRefresh.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { listIngredients } from '@/api/ingredients';
import { listMovements, listStock, MovementRecord, recordSupplyCount, recordSupplyUsage } from '@/api/inventory';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';

type Mode = 'COUNT' | 'USAGE';
type Supply = {
    itemId: string;
    name: string;
    unit: string;
    currentQty: number;
    costPerUnit: number;
    isLow: boolean;
};
type Preview = { label: string; tone: string; cost: string | null; usageCost: number };

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const mode = ref<Mode>(route.query.mode === 'usage' ? 'USAGE' : 'COUNT');
const supplies = ref<Supply[]>([]);
const history = ref<MovementRecord[]>([]);
const entries = reactive<Record<string, string | number>>({});
const note = ref('');
const search = ref('');
const isLoading = ref(false);
const historyLoading = ref(false);
const isSaving = ref(false);
const formError = ref('');

const canEdit = computed(() => canAccess(storeContext.currentStore, 'inventoryAdjustments'));
const currentStoreLabel = computed(() => storeContext.currentStore?.name || 'your store');

const visibleSupplies = computed(() => {
    const query = search.value.trim().toLowerCase();
    if (!query) return supplies.value;
    return supplies.value.filter((supply) => supply.name.toLowerCase().includes(query));
});

/** Parsed entry for an item, or null when blank/invalid. */
const entryValue = (itemId: string): number | null => {
    const raw = entries[itemId];
    if (raw === '' || raw === undefined || raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
};

const hasEntry = (itemId: string) => {
    const value = entryValue(itemId);
    if (value === null) return false;
    return mode.value === 'COUNT' || value > 0;
};

const round = (value: number) => Math.round(value * 10000) / 10000;

const previewFor = (supply: Supply): Preview | null => {
    const value = entryValue(supply.itemId);
    if (value === null) return null;
    if (mode.value === 'COUNT') {
        const diff = round(value - supply.currentQty);
        if (diff === 0) return { label: 'No change', tone: 'muted', cost: null, usageCost: 0 };
        if (diff > 0) return { label: `+${formatQty(diff)} ${supply.unit} extra`, tone: 'positive', cost: null, usageCost: 0 };
        const usageCost = -diff * supply.costPerUnit;
        return { label: `${formatQty(-diff)} ${supply.unit}`, tone: 'warn', cost: formatMoney(usageCost), usageCost };
    }
    if (value === 0) return null;
    const after = round(supply.currentQty - value);
    const blocked = after < 0 && !storeContext.currentStore?.allowNegativeStock;
    return {
        label: `${formatQty(after)} ${supply.unit}`,
        tone: blocked ? 'negative' : after < 0 ? 'warn' : '',
        cost: formatMoney(value * supply.costPerUnit),
        usageCost: value * supply.costPerUnit,
    };
};

const enteredSupplies = computed(() => supplies.value.filter((supply) => hasEntry(supply.itemId)));
const enteredCount = computed(() => enteredSupplies.value.length);
const summaryCost = computed(() =>
    enteredSupplies.value.reduce((total, supply) => total + (previewFor(supply)?.usageCost ?? 0), 0)
);
const hasBlockedRow = computed(() => enteredSupplies.value.some((supply) => previewFor(supply)?.tone === 'negative'));
const isSubmitDisabled = computed(
    () => !canEdit.value || isSaving.value || enteredCount.value === 0 || hasBlockedRow.value
);

const clearEntries = () => {
    Object.keys(entries).forEach((key) => delete entries[key]);
};

const setMode = (next: Mode) => {
    if (mode.value === next) return;
    mode.value = next;
    clearEntries();
    formError.value = '';
    router.replace({ query: { ...route.query, mode: next === 'USAGE' ? 'usage' : undefined } });
};

const loadSupplies = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        supplies.value = [];
        return;
    }
    isLoading.value = true;
    try {
        const [stockData, ingredientData] = await Promise.all([
            listStock(storeId, { itemType: 'INGREDIENT' }),
            listIngredients(storeId),
        ]);
        const costs = new Map(ingredientData.ingredients.map((item) => [item.id, Number(item.costPerUnit) || 0]));
        supplies.value = stockData.stock
            .filter((item) => item.subType === 'SUPPLY' && item.active)
            .map((item) => ({
                itemId: item.itemId,
                name: item.name,
                unit: item.unit,
                currentQty: Number(item.currentQty),
                costPerUnit: costs.get(item.itemId) ?? 0,
                isLow: item.lowStockThreshold > 0 && Number(item.currentQty) <= item.lowStockThreshold,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Unable to load supplies:', error);
        formError.value = 'Unable to load supplies.';
    } finally {
        isLoading.value = false;
    }
};

const loadHistory = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        history.value = [];
        return;
    }
    historyLoading.value = true;
    try {
        const data = await listMovements(storeId, { type: 'USAGE', pageSize: 20 });
        history.value = data.movements;
    } catch (error) {
        console.error('Unable to load supply usage:', error);
    } finally {
        historyLoading.value = false;
    }
};

const loadAll = async () => {
    await Promise.all([loadSupplies(), loadHistory()]);
};

const submit = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || isSubmitDisabled.value) return;
    formError.value = '';
    isSaving.value = true;
    try {
        const trimmedNote = note.value.trim() || null;
        if (mode.value === 'COUNT') {
            const result = await recordSupplyCount(storeId, {
                counts: enteredSupplies.value.map((supply) => ({
                    itemId: supply.itemId,
                    countedQty: entryValue(supply.itemId)!,
                })),
                note: trimmedNote,
            });
            const parts = [`${result.counted} counted`];
            if (result.usedItems) parts.push(`${result.usedItems} used (${formatMoney(result.usageCost)})`);
            if (result.surplusItems) parts.push(`${result.surplusItems} corrected up`);
            showToast(`Count saved: ${parts.join(', ')}.`);
        } else {
            const result = await recordSupplyUsage(storeId, {
                items: enteredSupplies.value.map((supply) => ({
                    itemId: supply.itemId,
                    qty: entryValue(supply.itemId)!,
                })),
                note: trimmedNote,
            });
            showToast(`Usage recorded for ${result.movements.length} ${result.movements.length === 1 ? 'supply' : 'supplies'}.`);
        }
        clearEntries();
        note.value = '';
        await loadAll();
    } catch (error) {
        const message =
            typeof error === 'object' && error && 'body' in error
                ? (error as { body?: { error?: { message?: string } } }).body?.error?.message
                : null;
        formError.value = message || 'Unable to save.';
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

const goToItems = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/ingredients`);
};

const formatQty = (value: number) => {
    if (!Number.isFinite(Number(value))) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'PHP';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PHP' }).format(value || 0);
    }
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
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadAll();
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
        clearEntries();
        await loadAll();
    }
);
</script>

<style scoped>
.supplies-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f6f8f9;
    --c-warn: #b45309;
    --c-danger: #dc2626;
    --c-positive: #15803d;
    min-height: 100vh;
    padding: 1rem 1.5rem 2rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.supplies-shell {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.detail-header { display: flex; flex-direction: column; }

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: none;
    background: none;
    padding: 0;
    margin-bottom: 0.2rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-muted);
    cursor: pointer;
    align-self: flex-start;
}
.back-link:hover { color: var(--c-accent-dark); }

.detail-title h1 { margin: 0; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; }
.detail-title p { margin: 0.25rem 0 0; color: var(--c-muted); font-size: 0.9rem; }

.segmented {
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    align-self: flex-start;
}
.segmented-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: none;
    background: transparent;
    padding: 0.5rem 0.95rem;
    border-radius: 9px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-muted);
    cursor: pointer;
}
.segmented-pill.active { background: var(--c-accent); color: #fff; }

.supplies-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 0.85rem;
    align-items: start;
}

.panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    min-width: 0;
}

.mode-hint { margin: 0; color: var(--c-muted); font-size: 0.85rem; }

.form-alert { padding: 0.65rem 0.85rem; border-radius: 10px; font-size: 0.85rem; }
.form-alert--error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-alert--warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--c-muted);
}
.empty-state p { margin: 0; font-weight: 600; color: var(--c-text); }
.empty-state span { font-size: 0.85rem; }

.search-wrap { position: relative; max-width: 320px; }
.search-wrap input {
    width: 100%;
    padding: 0.55rem 0.75rem 0.55rem 2rem;
    border: 1px solid var(--c-border);
    border-radius: 10px;
    font: inherit;
    font-size: 0.875rem;
    box-sizing: border-box;
}
.search-icon { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--c-muted); }

.table-wrap { overflow-x: auto; }
.supplies-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.supplies-table th {
    text-align: left;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--c-muted);
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--c-border);
    white-space: nowrap;
}
.supplies-table td { padding: 0.55rem 0.6rem; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
.supplies-table .num { text-align: right; white-space: nowrap; }
.row-entered { background: rgba(13, 148, 136, 0.05); }

.supply-name { font-weight: 600; }
.low-chip {
    display: inline-block;
    margin-top: 0.15rem;
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    background: #fef3c7;
    color: var(--c-warn);
    font-size: 0.7rem;
    font-weight: 600;
}

.col-input { width: 150px; }
.unit-input { display: flex; align-items: center; gap: 0.35rem; justify-content: flex-end; }
.unit-input input {
    width: 90px;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    font: inherit;
    text-align: right;
}
.unit-input input:focus { outline: 2px solid rgba(13, 148, 136, 0.35); border-color: var(--c-accent); }
.unit-suffix { color: var(--c-muted); font-size: 0.8rem; min-width: 1.5rem; text-align: left; }

.preview { display: flex; flex-direction: column; align-items: flex-end; }
.cost-note { color: var(--c-muted); font-size: 0.75rem; }
.muted { color: var(--c-muted); }
.center { text-align: center; }
.warn { color: var(--c-warn); font-weight: 600; }
.positive { color: var(--c-positive); font-weight: 600; }
.negative { color: var(--c-danger); font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; font-weight: 600; }
.field em { font-style: normal; font-weight: 400; color: var(--c-muted); }
.field input {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--c-border);
    border-radius: 10px;
    font: inherit;
    font-weight: 400;
    font-size: 0.875rem;
}

.submit-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.summary { font-size: 0.85rem; color: var(--c-muted); }
.summary strong { color: var(--c-text); }

.primary-button {
    border: none;
    background: var(--c-accent);
    color: #fff;
    padding: 0.65rem 1.25rem;
    border-radius: 10px;
    font: inherit;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
}
.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; }

.ghost-button {
    margin-top: 0.5rem;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
}

.history-head { display: flex; align-items: center; justify-content: space-between; }
.history-head h2 { margin: 0; font-size: 1rem; }
.link-button {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    cursor: pointer;
}
.history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.history-list li { padding: 0.6rem 0; border-bottom: 1px solid var(--c-border); }
.history-list li:last-child { border-bottom: none; }
.history-row { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.875rem; }
.history-name { font-weight: 600; }
.history-qty { color: var(--c-warn); font-weight: 600; white-space: nowrap; }
.history-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.15rem; font-size: 0.75rem; color: var(--c-muted); }
.history-note { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--c-muted); }

@media (max-width: 960px) {
    .supplies-content { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 640px) {
    .supplies-page { padding: 1rem 1rem 2.5rem; }
    .detail-title h1 { font-size: 1.4rem; }
    .segmented { align-self: stretch; }
    .segmented-pill { flex: 1; justify-content: center; }
    .panel { padding: 1rem; }
    .search-wrap { max-width: none; }

    /* Table → cards */
    .supplies-table thead { display: none; }
    .supplies-table, .supplies-table tbody, .supplies-table tr, .supplies-table td { display: block; width: 100%; box-sizing: border-box; }
    .supplies-table tr { padding: 0.6rem 0; border-bottom: 1px solid var(--c-border); }
    .supplies-table td { border: none; padding: 0.2rem 0; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
    .supplies-table td.num { text-align: right; }
    .supplies-table td[data-label]::before {
        content: attr(data-label);
        font-size: 0.75rem;
        color: var(--c-muted);
        font-weight: 600;
    }
    .supplies-table td.col-name { display: block; }
    .supplies-table td.col-name::before { content: none; }
    .supplies-table td.center { display: block; }
    .col-input { width: auto; }
    .submit-bar .primary-button { width: 100%; }
}
</style>
