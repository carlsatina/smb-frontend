<template>
    <section class="ingredients-page">
        <ConfirmModal
            v-model:show="showDeleteModal"
            title="Delete ingredient"
            :message="`Are you sure you want to delete '${ingredientToDelete?.name}'? This action cannot be undone.`"
            confirm-text="Delete"
            cancel-text="Cancel"
            variant="danger"
            :loading="isDeleting"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />
        <IngredientModal
            :open="showIngredientModal"
            :ingredient="ingredientToEdit"
            @close="closeIngredientModal"
            @created="onIngredientCreated"
            @updated="onIngredientUpdated"
        />
        <div class="ingredients-shell">
            <header class="ingredients-header">
                <div class="ingredients-title">
                    <span class="ingredients-eyebrow">Inventory</span>
                    <h1>Ingredients</h1>
                    <p>Manage raw materials and packaging items for {{ currentStoreLabel }}.</p>
                </div>
                <div class="ingredients-kpis">
                    <div class="kpi-card">
                        <span class="kpi-label">Total</span>
                        <span class="kpi-value">{{ totalIngredients }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Raw materials</span>
                        <span class="kpi-value">{{ rawMaterialCount }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Packaging</span>
                        <span class="kpi-value">{{ packagingCount }}</span>
                    </div>
                    <div class="kpi-card" :class="{ 'kpi-card--warn': inactiveCount > 0 }">
                        <span class="kpi-label">Inactive</span>
                        <span class="kpi-value">{{ inactiveCount }}</span>
                    </div>
                </div>
            </header>

            <div class="ingredients-content">
                <PlanGate
                    v-if="isPlanLocked"
                    feature="ingredients"
                    title="Ingredients require Standard plan"
                    description="Upgrade to Standard to manage ingredients and create recipe-based products."
                />
                <template v-else>
                    <section class="ingredients-panel">
                        <div class="toolbar">
                            <div class="toolbar-left">
                                <div class="filter-pills">
                                    <button
                                        class="pill"
                                        :class="{ active: filterStatus === 'ALL' }"
                                        @click="filterStatus = 'ALL'"
                                    >All</button>
                                    <button
                                        class="pill"
                                        :class="{ active: filterStatus === 'ACTIVE' }"
                                        @click="filterStatus = 'ACTIVE'"
                                    >Active</button>
                                    <button
                                        class="pill"
                                        :class="{ active: filterStatus === 'INACTIVE' }"
                                        @click="filterStatus = 'INACTIVE'"
                                    >
                                        <span v-if="inactiveCount > 0" class="pill-dot pill-dot--warn"></span>
                                        Inactive
                                    </button>
                                </div>
                                <div class="search-wrap">
                                    <mdicon name="magnify" size="16" class="search-icon" />
                                    <input
                                        v-model="searchQuery"
                                        class="search-input"
                                        placeholder="Search ingredients..."
                                    />
                                </div>
                            </div>
                            <div class="toolbar-right">
                                <button
                                    v-if="canWrite"
                                    class="primary-button"
                                    :disabled="!storeContext.currentStoreId"
                                    @click="openCreateModal"
                                >
                                    New ingredient
                                </button>
                                <span v-else-if="storeContext.currentStoreId" class="panel-note">View-only access</span>
                            </div>
                        </div>

                        <div v-if="!storeContext.currentStoreId" class="panel-state">
                            Select or create a store to view ingredients.
                        </div>

                        <div v-else-if="isLoading" class="panel-state">Loading ingredients...</div>

                        <div v-else class="table-wrap">
                            <table class="ingredients-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Unit</th>
                                        <th>Cost per unit</th>
                                        <th>Purchase unit</th>
                                        <th>Status</th>
                                        <th class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="ingredient in paginatedIngredients" :key="ingredient.id">
                                        <td>
                                            <div class="ingredient-name">{{ ingredient.name }}</div>
                                        </td>
                                        <td>
                                            <span class="category-chip" :class="'category-chip--' + ingredient.category.toLowerCase()">
                                                {{ formatCategory(ingredient.category) }}
                                            </span>
                                        </td>
                                        <td class="cell-muted">{{ ingredient.unit }}</td>
                                        <td class="cell-num">
                                            {{ formatMoney(ingredient.costPerUnit) }}
                                            <span class="cost-unit">/ {{ ingredient.unit }}</span>
                                        </td>
                                        <td>
                                            <template v-if="ingredient.purchaseUnit">
                                                <span class="purchase-unit-badge">{{ ingredient.purchaseUnit }}</span>
                                                <span v-if="ingredient.purchaseUnitSize" class="purchase-unit-size">
                                                    {{ formatQty(ingredient.purchaseUnitSize) }} {{ ingredient.unit }} each
                                                </span>
                                            </template>
                                            <span v-else class="cell-muted">—</span>
                                        </td>
                                        <td>
                                            <span
                                                class="status-pill"
                                                :class="ingredient.active ? 'status-pill--active' : 'status-pill--inactive'"
                                            >
                                                {{ ingredient.active ? 'Active' : 'Inactive' }}
                                            </span>
                                        </td>
                                        <td class="table-actions">
                                            <template v-if="canWrite">
                                                <button class="action-btn" @click="openEditModal(ingredient)">Edit</button>
                                                <button class="action-btn action-btn--danger" @click="openDeleteModal(ingredient)">Delete</button>
                                            </template>
                                            <span v-else class="cell-muted">View only</span>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredIngredients.length === 0">
                                        <td colspan="7">
                                            <div class="empty-state">
                                                <mdicon name="flask-outline" size="32" class="empty-icon" />
                                                <p class="empty-heading">No ingredients found</p>
                                                <p class="empty-sub">
                                                    {{ searchQuery || filterStatus !== 'ALL' ? 'Try adjusting your search or filter.' : 'Add your first ingredient to get started.' }}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="!isLoading && filteredIngredients.length > 0" class="pagination">
                            <div class="pagination-left">
                                <label class="pagination-size">
                                    <span>Rows</span>
                                    <select v-model.number="pageSize">
                                        <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                            {{ size }}
                                        </option>
                                    </select>
                                </label>
                                <span class="pagination-info">{{ filteredIngredients.length }} ingredient{{ filteredIngredients.length !== 1 ? 's' : '' }}</span>
                            </div>
                            <div class="pagination-controls">
                                <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)">
                                    <mdicon name="chevron-left" size="18" />
                                </button>
                                <span class="pagination-info">{{ page }} / {{ Math.max(1, totalPages) }}</span>
                                <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">
                                    <mdicon name="chevron-right" size="18" />
                                </button>
                            </div>
                        </div>
                    </section>

                    <aside class="insight-panel">
                        <div class="insight-card">
                            <h3>Breakdown</h3>
                            <div class="breakdown-list">
                                <div class="breakdown-item">
                                    <span class="breakdown-dot breakdown-dot--raw"></span>
                                    <span class="breakdown-label">Raw materials</span>
                                    <span class="breakdown-count">{{ rawMaterialCount }}</span>
                                </div>
                                <div class="breakdown-item">
                                    <span class="breakdown-dot breakdown-dot--packaging"></span>
                                    <span class="breakdown-label">Packaging</span>
                                    <span class="breakdown-count">{{ packagingCount }}</span>
                                </div>
                                <div class="breakdown-item">
                                    <span class="breakdown-dot breakdown-dot--active"></span>
                                    <span class="breakdown-label">Active</span>
                                    <span class="breakdown-count">{{ activeCount }}</span>
                                </div>
                                <div class="breakdown-item" :class="{ 'breakdown-item--warn': inactiveCount > 0 }">
                                    <span class="breakdown-dot breakdown-dot--inactive"></span>
                                    <span class="breakdown-label">Inactive</span>
                                    <span class="breakdown-count">{{ inactiveCount }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="insight-card">
                            <h3>Navigate</h3>
                            <div class="action-list">
                                <button class="secondary-button" @click="goToInventory">
                                    <mdicon name="arrow-left" size="15" />
                                    Back to inventory
                                </button>
                                <button class="secondary-button" @click="goToMovements">
                                    <mdicon name="swap-horizontal" size="15" />
                                    Movement history
                                </button>
                            </div>
                        </div>
                    </aside>
                </template>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteIngredient, IngredientResponse, listIngredients } from '@/api/ingredients';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import ConfirmModal from '@/components/ConfirmModal.vue';
import IngredientModal from '@/components/IngredientModal.vue';
import PlanGate from '@/components/PlanGate.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const ingredients = ref<IngredientResponse[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const filterStatus = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];

const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'ingredients'))
);

const showDeleteModal = ref(false);
const ingredientToDelete = ref<IngredientResponse | null>(null);
const isDeleting = ref(false);

const showIngredientModal = ref(false);
const ingredientToEdit = ref<IngredientResponse | null>(null);

const loadIngredients = async () => {
    if (isPlanLocked.value) {
        ingredients.value = [];
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        ingredients.value = [];
        return;
    }

    isLoading.value = true;
    try {
        const data = await listIngredients(storeId);
        ingredients.value = data.ingredients;
    } finally {
        isLoading.value = false;
    }
};

const openCreateModal = () => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    ingredientToEdit.value = null;
    showIngredientModal.value = true;
};

const openEditModal = (ingredient: IngredientResponse) => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    ingredientToEdit.value = ingredient;
    showIngredientModal.value = true;
};

const closeIngredientModal = () => {
    showIngredientModal.value = false;
    ingredientToEdit.value = null;
};

const onIngredientCreated = () => {
    showToast('Ingredient created.', 'success');
    loadIngredients();
};

const onIngredientUpdated = () => {
    showToast('Ingredient updated.', 'success');
    loadIngredients();
};

const openDeleteModal = (ingredient: IngredientResponse) => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    ingredientToDelete.value = ingredient;
    showDeleteModal.value = true;
};

const confirmDelete = async () => {
    if (!storeContext.currentStoreId || !ingredientToDelete.value) return;
    isDeleting.value = true;
    try {
        await deleteIngredient(storeContext.currentStoreId, ingredientToDelete.value.id);
        showToast('Ingredient deleted.', 'success');
        showDeleteModal.value = false;
        ingredientToDelete.value = null;
        await loadIngredients();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to delete ingredient.';
        showToast(message, 'error');
    } finally {
        isDeleting.value = false;
    }
};

const cancelDelete = () => {
    showDeleteModal.value = false;
    ingredientToDelete.value = null;
};

const goToInventory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory`);
};

const goToMovements = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/movements`);
};

const filteredIngredients = computed(() => {
    let result = ingredients.value;
    if (filterStatus.value === 'ACTIVE') result = result.filter((i) => i.active);
    if (filterStatus.value === 'INACTIVE') result = result.filter((i) => !i.active);
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return result;
    return result.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.unit.toLowerCase().includes(query) ||
        ingredient.category.toLowerCase().includes(query)
    );
});

const totalPages = computed(() => {
    if (filteredIngredients.value.length === 0) return 0;
    return Math.ceil(filteredIngredients.value.length / pageSize.value);
});

const paginatedIngredients = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredIngredients.value.slice(start, start + pageSize.value);
});

const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
};

const totalIngredients = computed(() => ingredients.value.length);
const rawMaterialCount = computed(() => ingredients.value.filter((i) => i.category === 'RAW_MATERIAL').length);
const packagingCount = computed(() => ingredients.value.filter((i) => i.category === 'PACKAGING').length);
const activeCount = computed(() => ingredients.value.filter((i) => i.active).length);
const inactiveCount = computed(() => ingredients.value.filter((i) => !i.active).length);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'Select a store to get started.';
    return `${store.name} · ${store.currency}`;
});

const formatCategory = (category: string) => {
    if (category === 'RAW_MATERIAL') return 'Raw Material';
    if (category === 'PACKAGING') return 'Packaging';
    return category;
};

const formatQty = (value: number | string | null | undefined) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    if (!isPlanLocked.value) {
        await loadIngredients();
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
    () => searchQuery.value,
    () => {
        page.value = 1;
    }
);

watch(
    () => pageSize.value,
    () => {
        page.value = 1;
    }
);

watch(
    () => filterStatus.value,
    () => {
        page.value = 1;
    }
);

watch(
    () => filteredIngredients.value.length,
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
        if (!isPlanLocked.value) {
            await loadIngredients();
        }
    }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.ingredients-page {
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
.ingredients-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.ingredients-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.ingredients-eyebrow {
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

.ingredients-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.ingredients-title p {
    color: var(--c-muted);
    max-width: 520px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   KPI CARDS (header row)
============================================================ */
.ingredients-kpis {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: flex-start;
}

.kpi-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 0.6rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 100px;
}

.kpi-card--warn {
    background: #fffbeb;
    border-color: #fde68a;
}

.kpi-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--c-muted);
}

.kpi-value {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--c-text);
    letter-spacing: -0.02em;
    line-height: 1;
}

.kpi-card--warn .kpi-value { color: #b45309; }

/* ============================================================
   LAYOUT
============================================================ */
.ingredients-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 1.5rem;
    align-items: start;
}

/* ============================================================
   PANEL
============================================================ */
.ingredients-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
}

.filter-pills {
    display: flex;
    gap: 0.25rem;
    padding: 0.2rem;
    background: #f1f5f9;
    border-radius: 10px;
}

.pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--c-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', -apple-system, sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
}

.pill:hover { color: var(--c-text); }

.pill.active {
    background: #ffffff;
    color: var(--c-text);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
}

.pill-dot--warn { background: #f59e0b; }

.search-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--c-muted);
    pointer-events: none;
}

.search-input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.5rem 0.9rem 0.5rem 2.25rem;
    min-width: 180px;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--c-surface);
    color: var(--c-text);
    transition: border-color 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap {
    border: 1px solid var(--c-border);
    border-radius: 12px;
    overflow: hidden;
}

.ingredients-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.ingredients-table thead th {
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    background: #f8fafc;
    border-bottom: 1.5px solid var(--c-border);
}

.ingredients-table thead th.align-right { text-align: right; }

.ingredients-table tbody td {
    padding: 0.65rem 0.9rem;
    border-bottom: 1px solid var(--c-border);
    vertical-align: middle;
}

.ingredients-table tbody tr:last-child td { border-bottom: none; }
.ingredients-table tbody tr:hover { background: #f8fafc; }

.ingredient-name {
    font-weight: 600;
    color: var(--c-text);
}

.category-chip {
    display: inline-flex;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    white-space: nowrap;
}

.category-chip--raw_material {
    background: rgba(13, 148, 136, 0.08);
    color: #0f766e;
}

.category-chip--packaging {
    background: rgba(139, 92, 246, 0.08);
    color: #6d28d9;
}

.status-pill {
    display: inline-flex;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.status-pill--active {
    background: rgba(5, 150, 105, 0.1);
    color: #047857;
}

.status-pill--inactive {
    background: rgba(148, 163, 184, 0.15);
    color: #64748b;
}

.cell-muted {
    font-size: 0.84rem;
    color: var(--c-muted);
}

.cell-num {
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
}

.cost-unit {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    margin-left: 0.2rem;
}

.purchase-unit-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    color: #0f766e;
    background: rgba(13, 148, 136, 0.08);
    border: 1px solid rgba(13, 148, 136, 0.2);
    border-radius: 4px;
    padding: 0.15rem 0.45rem;
}

.purchase-unit-size {
    display: block;
    font-size: 0.7rem;
    color: var(--c-muted);
    margin-top: 0.15rem;
}

.table-actions {
    text-align: right;
    white-space: nowrap;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    margin-left: 0.35rem;
}

.action-btn:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.action-btn--danger:hover {
    border-color: #fca5a5;
    color: #dc2626;
    background: #fef2f2;
}

.panel-note {
    font-size: 0.8rem;
    color: var(--c-muted);
}

/* ============================================================
   EMPTY STATE
============================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1.5rem;
    text-align: center;
}

.empty-icon { color: #cbd5e1; margin-bottom: 0.75rem; }

.empty-heading {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.3rem;
}

.empty-sub {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   PANEL STATE
============================================================ */
.panel-state {
    padding: 1.5rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

/* ============================================================
   PAGINATION
============================================================ */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--c-border);
}

.pagination-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.pagination-info {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-surface);
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--c-muted);
    font-weight: 500;
}

.pagination-size select {
    padding: 0.25rem 0.5rem;
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    font-size: 0.78rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
}

/* ============================================================
   ASIDE
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

.insight-card h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.75rem;
}

.breakdown-list {
    display: flex;
    flex-direction: column;
}

.breakdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.82rem;
}

.breakdown-item:last-child { border-bottom: none; }

.breakdown-item--warn .breakdown-label { color: #b45309; }
.breakdown-item--warn .breakdown-count { color: #b45309; }

.breakdown-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.breakdown-dot--raw       { background: #0d9488; }
.breakdown-dot--packaging { background: #8b5cf6; }
.breakdown-dot--active    { background: #059669; }
.breakdown-dot--inactive  { background: #f59e0b; }

.breakdown-label {
    flex: 1;
    color: var(--c-text);
    font-weight: 500;
}

.breakdown-count {
    font-weight: 700;
    color: var(--c-text);
    font-size: 0.875rem;
}

.action-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.secondary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    width: 100%;
}

.secondary-button:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
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

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .ingredients-content {
        grid-template-columns: 1fr;
    }

    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-left { flex-wrap: wrap; }

    .filter-pills { overflow-x: auto; }
}

@media (max-width: 640px) {
    .ingredients-page {
        padding: 1.25rem 1rem 2.5rem;
    }

    .ingredients-title h1 {
        font-size: 1.5rem;
    }

    .ingredients-kpis {
        width: 100%;
    }

    .kpi-card {
        flex: 1;
        min-width: 80px;
    }
}
</style>