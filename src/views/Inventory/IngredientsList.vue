<template>
    <section class="ingredients-page">
        <PullToRefresh :on-refresh="loadIngredients" :disabled="isLoading" />

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
        <CsvImportPreviewModal
            :show="showImportPreview"
            :file="pendingImportFile"
            title="Import Ingredients"
            :confirming="isImporting"
            @confirm="confirmImport"
            @cancel="cancelImport"
            @update:show="showImportPreview = $event"
        />

        <div class="ingredients-shell">
            <header class="ingredients-header">
                <div class="ingredients-title">
                    <span class="ingredients-eyebrow">Inventory</span>
                    <h1>Ingredients</h1>
                    <p>Raw materials and packaging for {{ currentStoreLabel }}.</p>
                </div>
                <div class="header-actions">
                    <template v-if="canImportExport && storeContext.currentStoreId">
                        <CsvActionsMenu
                            :can-import="canWrite"
                            :is-importing="isImporting"
                            :is-exporting="isExporting"
                            @export="handleExport"
                            @import="triggerImport"
                            @template="downloadTemplate"
                        />
                        <input
                            ref="importFileInput"
                            type="file"
                            accept=".csv,text/csv"
                            style="display:none"
                            @change="handleImportFileSelected"
                        />
                    </template>
                    <button
                        v-if="canWrite"
                        class="primary-button"
                        :disabled="!storeContext.currentStoreId"
                        @click="openCreateModal"
                    >
                        <mdicon name="plus" size="16" />
                        New ingredient
                    </button>
                    <span v-else-if="storeContext.currentStoreId" class="readonly-chip">View-only access</span>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="ingredients"
                title="Ingredients require Standard plan"
                description="Upgrade to Standard to manage ingredients and create recipe-based products."
            />

            <div v-else-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to view ingredients.
            </div>

            <template v-else>
                <!-- STAT STRIP (doubles as filters) -->
                <div class="stat-strip" role="group" aria-label="Filter ingredients">
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': categoryFilter === 'ALL' && statusFilter === 'ALL' }"
                        :aria-pressed="categoryFilter === 'ALL' && statusFilter === 'ALL'"
                        @click="clearFilters"
                    >
                        <span class="stat-value">{{ totalIngredients }}</span>
                        <span class="stat-label">Ingredients</span>
                    </button>
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': categoryFilter === 'RAW_MATERIAL' }"
                        :aria-pressed="categoryFilter === 'RAW_MATERIAL'"
                        @click="toggleCategory('RAW_MATERIAL')"
                    >
                        <span class="stat-value">{{ rawMaterialCount }}</span>
                        <span class="stat-label">Raw materials</span>
                    </button>
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': categoryFilter === 'PACKAGING' }"
                        :aria-pressed="categoryFilter === 'PACKAGING'"
                        @click="toggleCategory('PACKAGING')"
                    >
                        <span class="stat-value">{{ packagingCount }}</span>
                        <span class="stat-label">Packaging</span>
                    </button>
                    <button
                        type="button"
                        class="stat stat--warn"
                        :class="{ 'stat--active': statusFilter === 'INACTIVE', 'stat--flagged': inactiveCount > 0 }"
                        :aria-pressed="statusFilter === 'INACTIVE'"
                        @click="toggleInactive"
                    >
                        <span class="stat-value">{{ inactiveCount }}</span>
                        <span class="stat-label">Inactive</span>
                    </button>
                </div>

                <!-- IMPORT PROGRESS -->
                <div v-if="isImporting" class="import-progress">
                    <div class="import-progress__label">Importing… {{ Math.round(importProgress) }}%</div>
                    <div class="import-progress__track">
                        <div class="import-progress__fill" :style="{ width: importProgress + '%' }"></div>
                    </div>
                </div>

                <!-- IMPORT RESULT -->
                <div v-if="importResult" class="import-result" :class="importResult.failed > 0 ? 'import-result--warn' : 'import-result--ok'">
                    <div class="import-result__summary">
                        <span>Import complete: <strong>{{ importResult.imported }}</strong> added, <strong>{{ importResult.updated }}</strong> updated{{ importResult.failed > 0 ? `, ${importResult.failed} failed` : '' }}.</span>
                        <button class="import-result__close" @click="importResult = null">✕</button>
                    </div>
                    <ul v-if="importResult.errors.length > 0" class="import-result__errors">
                        <li v-for="err in importResult.errors" :key="err.row">Row {{ err.row }}: {{ err.message }}</li>
                    </ul>
                </div>

                <!-- TABLE PANEL -->
                <section class="ingredients-panel">
                    <div class="panel-toolbar">
                        <div class="search-wrap">
                            <mdicon name="magnify" size="17" class="search-icon" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search by name, unit, or category…"
                            />
                        </div>
                    </div>

                    <SkeletonLoader v-if="isLoading" :rows="8" label="Loading ingredients…" />
                    <template v-else>
                        <div class="table-wrap">
                            <table class="ingredients-table">
                                <thead>
                                    <tr>
                                        <th>Ingredient</th>
                                        <th class="num">Cost per unit</th>
                                        <th>Purchase unit</th>
                                        <th>Status</th>
                                        <th v-if="canWrite" class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="ingredient in paginatedIngredients"
                                        :key="ingredient.id"
                                        :class="{ 'row-clickable': canWrite }"
                                        @click="canWrite && openEditModal(ingredient)"
                                    >
                                        <td class="col-name">
                                            <div class="ingredient-name">{{ ingredient.name }}</div>
                                            <div class="ingredient-meta">
                                                <span
                                                    class="category-chip"
                                                    :class="ingredient.category === 'PACKAGING' ? 'category-chip--packaging' : 'category-chip--raw'"
                                                >
                                                    {{ formatCategory(ingredient.category) }}
                                                </span>
                                                <span>{{ ingredient.unit }}</span>
                                            </div>
                                        </td>
                                        <td class="col-cost num">
                                            {{ formatMoney(ingredient.costPerUnit) }}
                                            <span class="cost-unit">/ {{ ingredient.unit }}</span>
                                        </td>
                                        <td class="col-purchase">
                                            <template v-if="ingredient.purchaseUnit">
                                                <span class="purchase-unit-badge">{{ ingredient.purchaseUnit }}</span>
                                                <span v-if="ingredient.purchaseUnitSize" class="purchase-unit-size">
                                                    {{ formatQty(ingredient.purchaseUnitSize) }} {{ ingredient.unit }} each
                                                </span>
                                            </template>
                                            <span v-else class="cell-empty">—</span>
                                        </td>
                                        <td class="col-status">
                                            <span
                                                class="status-pill"
                                                :class="ingredient.active ? 'status-pill--active' : 'status-pill--inactive'"
                                            >
                                                {{ ingredient.active ? 'Active' : 'Inactive' }}
                                            </span>
                                        </td>
                                        <td v-if="canWrite" class="col-actions" @click.stop>
                                            <button class="icon-btn" title="Edit" :aria-label="`Edit ${ingredient.name}`" @click="openEditModal(ingredient)">
                                                <mdicon name="pencil-outline" size="17" />
                                            </button>
                                            <button class="icon-btn icon-btn--danger" title="Delete" :aria-label="`Delete ${ingredient.name}`" @click="openDeleteModal(ingredient)">
                                                <mdicon name="trash-can-outline" size="17" />
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredIngredients.length === 0">
                                        <td :colspan="canWrite ? 5 : 4" class="empty-cell">
                                            <div class="empty-state">
                                                <mdicon name="flask-outline" size="32" class="empty-icon" />
                                                <p class="empty-heading">No ingredients found</p>
                                                <p class="empty-sub">{{ emptyMessage }}</p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="filteredIngredients.length > 0" class="pagination">
                            <div class="pagination-info">
                                <span>{{ filteredIngredients.length }} ingredient{{ filteredIngredients.length !== 1 ? 's' : '' }}</span>
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
                                <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)" aria-label="Next page">
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
import { computed, onMounted, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useRoute } from 'vue-router';
import {
    deleteIngredient,
    exportIngredients,
    importIngredients,
    ImportResult,
    IngredientResponse,
    listIngredients,
} from '@/api/ingredients';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import ConfirmModal from '@/components/ConfirmModal.vue';
import IngredientModal from '@/components/IngredientModal.vue';
import PlanGate from '@/components/PlanGate.vue';
import CsvActionsMenu from '@/components/CsvActionsMenu.vue';
import CsvImportPreviewModal from '@/components/CsvImportPreviewModal.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const ingredients = ref<IngredientResponse[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'INACTIVE'>('ALL');
const categoryFilter = ref<'ALL' | 'RAW_MATERIAL' | 'PACKAGING'>('ALL');
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

const canAdmin = computed(() => canAccess(storeContext.currentStore?.role, 'storeSettings'));
const canImportExport = computed(
    () => canAdmin.value && ownerSubscriptionActive.value && hasPlanFeature(ownerPlanTier.value, 'importExport')
);

const showDeleteModal = ref(false);
const ingredientToDelete = ref<IngredientResponse | null>(null);
const isDeleting = ref(false);

const showIngredientModal = ref(false);
const ingredientToEdit = ref<IngredientResponse | null>(null);

const isExporting = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const pendingImportFile = ref<File | null>(null);
const showImportPreview = ref(false);
const importResult = ref<ImportResult | null>(null);
const isImporting = ref(false);
const importProgress = ref(0);
let progressTimer: ReturnType<typeof setInterval> | null = null;

const startImportProgress = () => {
    importProgress.value = 0;
    isImporting.value = true;
    progressTimer = setInterval(() => {
        if (importProgress.value < 85) {
            const remaining = 85 - importProgress.value;
            importProgress.value = Math.min(85, importProgress.value + Math.max(0.8, remaining * 0.06));
        }
    }, 120);
};

const finishImportProgress = () =>
    new Promise<void>((resolve) => {
        if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
        importProgress.value = 100;
        setTimeout(() => {
            isImporting.value = false;
            importProgress.value = 0;
            resolve();
        }, 500);
    });

const handleExport = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    isExporting.value = true;
    try {
        const { blob, filename } = await exportIngredients(storeId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        showToast('Unable to export ingredients.', 'error');
    } finally {
        isExporting.value = false;
    }
};

const triggerImport = () => {
    importResult.value = null;
    importFileInput.value?.click();
};

const downloadTemplate = () => {
    // Columns match the importer; only Name, Unit and Cost Per Unit are required.
    const headers = 'Name,Unit,Category,Cost Per Unit,Purchase Unit,Purchase Unit Size,Active,Low Stock Threshold';
    const example = 'Sugar,g,RAW_MATERIAL,0.50,sack,25000,true,1000';
    const csv = `${headers}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ingredients-template.csv';
    a.click();
    URL.revokeObjectURL(url);
};

const handleImportFileSelected = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !storeContext.currentStoreId) return;
    (event.target as HTMLInputElement).value = '';
    importResult.value = null;
    pendingImportFile.value = file;
    showImportPreview.value = true;
};

const cancelImport = () => {
    showImportPreview.value = false;
    pendingImportFile.value = null;
};

const confirmImport = async () => {
    const file = pendingImportFile.value;
    if (!file || !storeContext.currentStoreId) return;
    // Close the preview so the import progress is visible on the page.
    showImportPreview.value = false;
    startImportProgress();
    try {
        const result = await importIngredients(storeContext.currentStoreId, file);
        await finishImportProgress();
        importResult.value = result;
        if (result.imported > 0 || result.updated > 0) await loadIngredients();
    } catch {
        await finishImportProgress();
        importResult.value = { imported: 0, updated: 0, failed: 1, errors: [{ row: 0, message: 'Upload failed. Check the file and try again.' }] };
    } finally {
        pendingImportFile.value = null;
    }
};

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

const toggleCategory = (category: 'RAW_MATERIAL' | 'PACKAGING') => {
    categoryFilter.value = categoryFilter.value === category ? 'ALL' : category;
};

const toggleInactive = () => {
    statusFilter.value = statusFilter.value === 'INACTIVE' ? 'ALL' : 'INACTIVE';
};

const clearFilters = () => {
    categoryFilter.value = 'ALL';
    statusFilter.value = 'ALL';
};

const filteredIngredients = computed(() => {
    let result = ingredients.value;
    if (categoryFilter.value !== 'ALL') result = result.filter((i) => i.category === categoryFilter.value);
    if (statusFilter.value === 'INACTIVE') result = result.filter((i) => !i.active);
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return result;
    return result.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.unit.toLowerCase().includes(query) ||
        ingredient.category.toLowerCase().includes(query)
    );
});

const emptyMessage = computed(() => {
    if (searchQuery.value.trim()) return 'No ingredients match your search.';
    if (statusFilter.value === 'INACTIVE') return 'No inactive ingredients.';
    if (categoryFilter.value === 'PACKAGING') return 'No packaging items yet.';
    if (categoryFilter.value === 'RAW_MATERIAL') return 'No raw materials yet.';
    return 'Add your first ingredient to start building recipes.';
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
const inactiveCount = computed(() => ingredients.value.filter((i) => !i.active).length);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const formatCategory = (category: string) => {
    if (category === 'RAW_MATERIAL') return 'Raw material';
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

watch(() => searchQuery.value, () => { page.value = 1; });
watch(() => pageSize.value, () => { page.value = 1; });
watch(() => statusFilter.value, () => { page.value = 1; });
watch(() => categoryFilter.value, () => { page.value = 1; });

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
        if (isPlanLocked.value) return;
        await loadIngredients();
    }
);
</script>

<style scoped>
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
.ingredients-shell {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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

.readonly-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid var(--c-border);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-muted);
    white-space: nowrap;
}

/* ============================================================
   STAT STRIP (clickable filters)
============================================================ */
.stat-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

/* ============================================================
   IMPORT PROGRESS & RESULT
============================================================ */
.import-progress {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.75rem 1rem;
    background: rgba(13, 148, 136, 0.06);
    border: 1px solid rgba(13, 148, 136, 0.22);
    border-radius: 10px;
}

.import-progress__label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f766e;
}

.import-progress__track {
    height: 6px;
    background: rgba(13, 148, 136, 0.15);
    border-radius: 999px;
    overflow: hidden;
}

.import-progress__fill {
    height: 100%;
    background: #0d9488;
    border-radius: 999px;
    transition: width 0.15s ease;
}

.import-result {
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
}
.import-result--ok { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
.import-result--warn { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
.import-result__summary { display: flex; justify-content: space-between; align-items: center; }
.import-result__close { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.6; }
.import-result__close:hover { opacity: 1; }
.import-result__errors { margin: 0.5rem 0 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.2rem; }

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.ingredients-panel {
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
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.ingredients-table thead th.num { text-align: right; }
.ingredients-table thead th.align-right { text-align: right; }

.ingredients-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.ingredients-table tbody tr:last-child { border-bottom: none; }
.ingredients-table tbody tr:hover { background: #f8fafc; }
.ingredients-table tbody tr.row-clickable { cursor: pointer; }

.ingredients-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.ingredient-name {
    font-weight: 600;
    color: var(--c-text);
}

.ingredient-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.2rem;
}

.category-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
}

.category-chip--raw { background: #ede9fe; color: #6d28d9; }
.category-chip--packaging { background: #e0f2fe; color: #0369a1; }

.col-cost {
    white-space: nowrap;
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.ingredients-table td.num { text-align: right; }

.cost-unit {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
}

.purchase-unit-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
}

.purchase-unit-size {
    display: block;
    font-size: 0.72rem;
    color: var(--c-muted);
    margin-top: 0.2rem;
    white-space: nowrap;
}

.cell-empty { color: #cbd5e1; }

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
.status-pill--inactive { background: #f1f5f9; color: var(--c-muted); }

.col-actions {
    text-align: right;
    white-space: nowrap;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.icon-btn:hover:not(:disabled) { background: rgba(13, 148, 136, 0.08); color: var(--c-accent-dark); }
.icon-btn--danger:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }

.empty-cell { padding: 0; }

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
.primary-button {
    display: inline-flex;
    align-items: center;
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

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .ingredients-page { padding: 1rem 0.875rem 2.5rem; }
    .ingredients-shell { gap: 1rem; }
    .ingredients-header { flex-direction: column; gap: 0.875rem; }
    .ingredients-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .stat { padding: 0.75rem 0.7rem; }
    .stat-value { font-size: 1.2rem; }
    .stat-label { font-size: 0.6rem; }

    .ingredients-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .search-wrap { max-width: none; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .ingredients-table thead { display: none; }
    .ingredients-table,
    .ingredients-table tbody { display: block; }

    .ingredients-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.2rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .ingredients-table tbody tr:last-child { border-bottom: none; }

    .ingredients-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    .ingredients-table tbody td.col-name { grid-column: 1; grid-row: 1; }
    .ingredients-table tbody td.col-status {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }
    .ingredients-table tbody td.col-cost {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.35rem;
        text-align: left;
    }
    .ingredients-table tbody td.col-purchase {
        grid-column: 2;
        grid-row: 2;
        padding-top: 0.35rem;
        text-align: right;
    }
    .ingredients-table tbody td.col-actions {
        grid-column: 1 / -1;
        grid-row: 3;
        display: flex;
        justify-content: flex-end;
        gap: 0.25rem;
        padding-top: 0.35rem;
    }

    .ingredients-table tbody td.empty-cell { grid-column: 1 / -1; }
}
</style>
