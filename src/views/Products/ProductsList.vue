<template>
    <section class="product-page">
        <PullToRefresh :on-refresh="loadProducts" :disabled="isLoading" />

        <ConfirmModal
            v-model:show="showDeleteModal"
            title="Delete Product"
            :message="`Are you sure you want to delete '${productToDelete?.name}'? This action cannot be undone.`"
            confirm-text="Delete"
            cancel-text="Cancel"
            variant="danger"
            :loading="isDeleting"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />
        <CsvImportPreviewModal
            :show="showImportPreview"
            :file="pendingImportFile"
            title="Import Products"
            :confirming="isImporting"
            @confirm="confirmImport"
            @cancel="cancelImport"
            @update:show="showImportPreview = $event"
        />
        <div class="product-shell">

            <!-- HEADER -->
            <header class="product-header">
                <div class="product-title">
                    <span class="product-eyebrow">Catalog</span>
                    <h1>Products</h1>
                    <p>Pricing, stock rules, and recipes for {{ currentStoreLabel }}.</p>
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
                        @click="createProduct"
                    >
                        <mdicon name="plus" size="16" />
                        New product
                    </button>
                    <span v-else-if="storeContext.currentStoreId" class="readonly-chip">View-only access</span>
                </div>
            </header>

            <div v-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to view products.
            </div>

            <template v-else>
                <!-- STAT STRIP (doubles as catalog filter) -->
                <div class="stat-strip" role="group" aria-label="Filter by product type">
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': catalogFilter === 'ALL' }"
                        :aria-pressed="catalogFilter === 'ALL'"
                        @click="catalogFilter = 'ALL'"
                    >
                        <span class="stat-value">{{ totalProducts }}</span>
                        <span class="stat-label">Products</span>
                    </button>
                    <button
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': catalogFilter === 'READY_MADE' }"
                        :aria-pressed="catalogFilter === 'READY_MADE'"
                        @click="toggleCatalog('READY_MADE')"
                    >
                        <span class="stat-value">{{ readyMadeProducts }}</span>
                        <span class="stat-label">Ready-made</span>
                    </button>
                    <button
                        v-if="showRecipeStats"
                        type="button"
                        class="stat"
                        :class="{ 'stat--active': catalogFilter === 'RECIPE' }"
                        :aria-pressed="catalogFilter === 'RECIPE'"
                        @click="toggleCatalog('RECIPE')"
                    >
                        <span class="stat-value">{{ recipeProducts }}</span>
                        <span class="stat-label">Recipes</span>
                    </button>
                    <button
                        v-if="recipeMissingCount > 0"
                        type="button"
                        class="stat stat--warn stat--flagged"
                        :class="{ 'stat--active': catalogFilter === 'MISSING_RECIPE' }"
                        :aria-pressed="catalogFilter === 'MISSING_RECIPE'"
                        @click="toggleCatalog('MISSING_RECIPE')"
                    >
                        <span class="stat-value">{{ recipeMissingCount }}</span>
                        <span class="stat-label">No recipe</span>
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
                <section class="product-panel">
                    <div class="panel-toolbar">
                        <div class="search-wrap">
                            <mdicon name="magnify" size="17" class="search-icon" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search by name, SKU, barcode, or category…"
                            />
                        </div>
                        <label class="active-toggle">
                            <input v-model="activeOnly" type="checkbox" />
                            <span>Active only</span>
                        </label>
                    </div>

                    <SkeletonLoader v-if="isLoading" :rows="8" label="Loading products…" />
                    <template v-else>
                        <div class="table-wrap">
                            <table class="product-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th v-if="showSkuColumn">SKU</th>
                                        <th>Price</th>
                                        <th>Cost</th>
                                        <th>Status</th>
                                        <th v-if="canWrite" class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="product in paginatedProducts"
                                        :key="product.id"
                                        :class="{ 'row-clickable': canWrite }"
                                        @click="canWrite && editProduct(product.id)"
                                    >
                                        <td class="col-name">
                                            <div class="product-name">
                                                {{ product.name }}
                                                <span
                                                    v-if="product.type === 'RECIPE' && (product.recipeLineCount ?? 0) === 0"
                                                    class="recipe-missing-badge"
                                                >
                                                    No recipe
                                                </span>
                                            </div>
                                            <div class="product-meta">
                                                <span
                                                    class="type-chip"
                                                    :class="product.type === 'RECIPE' ? 'type-chip--recipe' : 'type-chip--ready'"
                                                >
                                                    {{ formatProductType(product.type) }}
                                                </span>
                                                <span>{{ product.category || 'Uncategorized' }}</span>
                                            </div>
                                        </td>
                                        <td v-if="showSkuColumn" class="col-sku">{{ product.sku || '—' }}</td>
                                        <td class="col-price">{{ formatMoney(product.price) }}</td>
                                        <td class="col-cost">
                                            <template v-if="product.cost != null">
                                                <span class="cost-value">{{ formatMoney(product.cost) }}</span>
                                                <span v-if="marginOf(product) !== null" class="cost-margin">{{ marginOf(product) }}% margin</span>
                                            </template>
                                            <span v-else class="cost-empty">—</span>
                                        </td>
                                        <td class="col-status">
                                            <span
                                                class="status-pill"
                                                :class="product.active ? 'status-pill--active' : 'status-pill--inactive'"
                                            >
                                                {{ product.active ? 'Active' : 'Inactive' }}
                                            </span>
                                        </td>
                                        <td v-if="canWrite" class="col-actions" @click.stop>
                                            <button class="icon-btn" title="Edit" :aria-label="`Edit ${product.name}`" @click="editProduct(product.id)">
                                                <mdicon name="pencil-outline" size="17" />
                                            </button>
                                            <button class="icon-btn icon-btn--danger" title="Delete" :aria-label="`Delete ${product.name}`" @click="removeProduct(product.id)">
                                                <mdicon name="trash-can-outline" size="17" />
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredProducts.length === 0">
                                        <td :colspan="columnCount" class="empty-state">
                                            {{ emptyMessage }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pagination" v-if="totalPages > 0">
                            <div class="pagination-info">
                                <span>
                                    Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredProducts.length }} product{{ filteredProducts.length !== 1 ? 's' : '' }}
                                    <template v-if="filteredProducts.length !== totalProducts"> (filtered from {{ totalProducts }})</template>
                                </span>
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteProduct, exportProducts, importProducts, ImportResult, listProducts } from '@/api/products';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import ConfirmModal from '@/components/ConfirmModal.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import CsvActionsMenu from '@/components/CsvActionsMenu.vue';
import CsvImportPreviewModal from '@/components/CsvImportPreviewModal.vue';

type ProductRow = {
    id: string;
    name: string;
    type: string;
    sku?: string | null;
    barcode?: string | null;
    category?: string | null;
    price: number;
    cost?: number | null;
    active?: boolean;
    recipeLineCount?: number;
};

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const products = ref<ProductRow[]>([]);
const isLoading = ref(false);
const searchQuery = ref('');
const catalogFilter = ref<'ALL' | 'READY_MADE' | 'RECIPE' | 'MISSING_RECIPE'>('ALL');
const activeOnly = ref(false);
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];
const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'productsWrite'));
const canImportExport = computed(() => hasPlanFeature(userContext.effectivePlan, 'importExport'));

const showDeleteModal = ref(false);
const productToDelete = ref<ProductRow | null>(null);
const isDeleting = ref(false);
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
        const { blob, filename } = await exportProducts(storeId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } finally {
        isExporting.value = false;
    }
};

const triggerImport = () => {
    importResult.value = null;
    importFileInput.value?.click();
};

const downloadTemplate = () => {
    // Columns match the importer; only Name and Price are required.
    // Recipe holds "Ingredient Name:qty | Ingredient Name:qty" for RECIPE products;
    // leave it blank for READY_MADE. Ingredient names must already exist in the store.
    const headers = 'Name,Type,SKU,Barcode,Price,Cost,Unit,Category,Active,Low Stock Threshold,Recipe';
    const example = [
        'Iced Coffee,READY_MADE,SKU-001,,120,60,pcs,Beverages,true,10,',
        'Latte,RECIPE,SKU-002,,150,,pcs,Beverages,true,,"Espresso Beans:18 | Milk:200 | Sugar:10"',
    ].join('\n');
    const csv = `${headers}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
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
        const result = await importProducts(storeContext.currentStoreId, file);
        await finishImportProgress();
        importResult.value = result;
        if (result.imported > 0) await loadProducts();
    } catch {
        await finishImportProgress();
        importResult.value = { imported: 0, updated: 0, failed: 1, errors: [{ row: 0, message: 'Upload failed. Check the file and try again.' }] };
    } finally {
        pendingImportFile.value = null;
    }
};

const loadProducts = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) { products.value = []; return; }
    isLoading.value = true;
    try {
        const data = await listProducts(storeId);
        products.value = data.products as ProductRow[];
    } finally {
        isLoading.value = false;
    }
};

const createProduct = () => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    router.push(`/stores/${storeContext.currentStoreId}/products/new`);
};

const editProduct = (productId: string) => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    router.push(`/stores/${storeContext.currentStoreId}/products/${productId}/edit`);
};

const removeProduct = (productId: string) => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    const product = products.value.find((p) => p.id === productId);
    if (!product) return;
    productToDelete.value = product;
    showDeleteModal.value = true;
};

const confirmDelete = async () => {
    if (!storeContext.currentStoreId || !productToDelete.value) return;
    isDeleting.value = true;
    try {
        await deleteProduct(storeContext.currentStoreId, productToDelete.value.id);
        showDeleteModal.value = false;
        productToDelete.value = null;
        await loadProducts();
    } finally {
        isDeleting.value = false;
    }
};

const cancelDelete = () => {
    showDeleteModal.value = false;
    productToDelete.value = null;
};

const toggleCatalog = (filter: 'READY_MADE' | 'RECIPE' | 'MISSING_RECIPE') => {
    catalogFilter.value = catalogFilter.value === filter ? 'ALL' : filter;
};

const isMissingRecipe = (product: ProductRow) =>
    product.type === 'RECIPE' && (product.recipeLineCount ?? 0) === 0;

const filteredProducts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return products.value.filter((product) => {
        if (catalogFilter.value === 'READY_MADE' && product.type !== 'READY_MADE') return false;
        if (catalogFilter.value === 'RECIPE' && product.type !== 'RECIPE') return false;
        if (catalogFilter.value === 'MISSING_RECIPE' && !isMissingRecipe(product)) return false;
        if (activeOnly.value && !product.active) return false;
        if (query && !product.name.toLowerCase().includes(query) && !(product.sku || '').toLowerCase().includes(query) && !(product.barcode || '').toLowerCase().includes(query) && !(product.category || '').toLowerCase().includes(query)) return false;
        return true;
    });
});

const emptyMessage = computed(() => {
    if (searchQuery.value.trim()) return 'No products match your search.';
    if (catalogFilter.value === 'MISSING_RECIPE') return 'Every recipe product has its recipe set up.';
    if (catalogFilter.value === 'RECIPE') return 'No recipe products yet.';
    if (catalogFilter.value === 'READY_MADE') return 'No ready-made products yet.';
    if (activeOnly.value) return 'No active products match your filters.';
    return 'No products yet. Create your first product to start selling.';
});

const totalPages = computed(() => {
    if (filteredProducts.value.length === 0) return 0;
    return Math.ceil(filteredProducts.value.length / pageSize.value);
});

const paginatedProducts = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
});

const rangeStart = computed(() =>
    filteredProducts.value.length === 0 ? 0 : (page.value - 1) * pageSize.value + 1
);
const rangeEnd = computed(() =>
    Math.min(page.value * pageSize.value, filteredProducts.value.length)
);

const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
};

const totalProducts = computed(() => products.value.length);
const recipeProducts = computed(() => products.value.filter((p) => p.type === 'RECIPE').length);
const readyMadeProducts = computed(() => products.value.filter((p) => p.type === 'READY_MADE').length);
const recipeMissingCount = computed(() => products.value.filter((p) => isMissingRecipe(p)).length);

// Hide the Recipes stat for stores that have no recipe products and whose plan
// doesn't include recipes — it would always read 0.
const canUseRecipes = computed(() => hasPlanFeature(storeContext.currentStore?.ownerPlanTier ?? null, 'recipes'));
const showRecipeStats = computed(() => recipeProducts.value > 0 || canUseRecipes.value);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const formatProductType = (type: string) => {
    if (type === 'READY_MADE') return 'Ready-made';
    if (type === 'RECIPE') return 'Recipe';
    return type;
};

// Hide the SKU column entirely for stores that don't track SKUs.
const showSkuColumn = computed(() => products.value.some((p) => !!p.sku));

// Product, Price, Cost, Status (+ SKU and Actions when shown).
const columnCount = computed(() => 4 + (showSkuColumn.value ? 1 : 0) + (canWrite.value ? 1 : 0));

// Gross margin % when the product has a known cost (recipe costs aren't stored
// on the product, so those show as no margin). price/cost arrive as Decimal
// strings over JSON, so coerce explicitly.
const marginOf = (product: ProductRow): number | null => {
    if (product.cost == null) return null;
    const price = Number(product.price);
    const cost = Number(product.cost);
    if (!(price > 0) || Number.isNaN(cost)) return null;
    return Math.round(((price - cost) / price) * 1000) / 10;
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
    // Show the skeleton from the first frame so the store fetch doesn't briefly
    // flash the empty-state table before the first load kicks in.
    isLoading.value = true;
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadProducts();
});

watch(() => route.params.storeId, (value) => {
    const storeId = value as string | undefined;
    if (storeId && storeId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(storeId);
    }
});

watch(() => searchQuery.value, () => { page.value = 1; });
watch(() => catalogFilter.value, () => { page.value = 1; });
watch(() => activeOnly.value, () => { page.value = 1; });
watch(() => pageSize.value, () => { page.value = 1; });

watch(() => filteredProducts.value.length, () => {
    if (page.value > totalPages.value && totalPages.value > 0) {
        page.value = totalPages.value;
    } else if (totalPages.value === 0) {
        page.value = 1;
    }
});

watch(() => storeContext.currentStoreId, async () => {
    page.value = 1;
    await loadProducts();
});
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.product-page {
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
.product-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.product-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.product-eyebrow {
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

.product-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.product-title p {
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
   STAT STRIP (clickable catalog filters)
============================================================ */
.stat-strip {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
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
.product-panel {
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

.active-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-muted);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
}

.active-toggle input {
    accent-color: var(--c-accent);
    width: 15px;
    height: 15px;
    cursor: pointer;
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

.product-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.product-table thead th {
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

.product-table thead th.align-right { text-align: right; }

.product-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.product-table tbody tr:last-child { border-bottom: none; }
.product-table tbody tr:hover { background: #f8fafc; }
.product-table tbody tr.row-clickable { cursor: pointer; }

.product-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.product-name {
    font-weight: 600;
    color: var(--c-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.recipe-missing-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #b45309;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
}

.product-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.2rem;
}

.type-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
}

.type-chip--ready { background: #ccfbf1; color: #0f766e; }
.type-chip--recipe { background: #ede9fe; color: #6d28d9; }

.col-sku {
    color: var(--c-muted);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.col-price {
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.col-cost { white-space: nowrap; }

.cost-value {
    display: block;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.cost-margin {
    display: block;
    font-size: 0.72rem;
    color: var(--c-muted);
}

.cost-empty { color: #cbd5e1; }

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

.icon-btn:hover { background: rgba(13, 148, 136, 0.08); color: var(--c-accent-dark); }
.icon-btn--danger:hover { background: #fef2f2; color: #dc2626; }

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
    flex-wrap: wrap;
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

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 768px) {
    .panel-toolbar { flex-direction: column; align-items: stretch; }
    .search-wrap { max-width: none; }
    .active-toggle { justify-content: flex-start; }
}

@media (max-width: 640px) {
    .product-page { padding: 1rem 0.875rem 2.5rem; }
    .product-shell { gap: 1rem; }
    .product-header { flex-direction: column; gap: 0.875rem; }
    .product-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .stat { padding: 0.75rem 0.9rem; }
    .stat-value { font-size: 1.2rem; }
    .stat-label { font-size: 0.62rem; }

    .product-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .product-table thead { display: none; }
    .product-table,
    .product-table tbody { display: block; }

    .product-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        padding: 0.875rem 1rem;
        gap: 0.15rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .product-table tbody tr:last-child { border-bottom: none; }

    .product-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    /* Name + meta */
    .product-table tbody td.col-name { grid-column: 1; grid-row: 1; }

    /* SKU — folded away on mobile */
    .product-table tbody td.col-sku { display: none; }

    /* Price · cost — one line below the name */
    .product-table tbody td.col-price {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.5rem;
        display: inline-flex;
        align-items: baseline;
        gap: 0.5rem;
    }
    .product-table tbody td.col-cost {
        grid-column: 2;
        grid-row: 2;
        padding-top: 0.5rem;
        text-align: right;
    }
    .product-table tbody td.col-cost .cost-value { display: inline; font-size: 0.8rem; color: var(--c-muted); }
    .product-table tbody td.col-cost .cost-margin { display: inline; margin-left: 0.35rem; }
    .product-table tbody td.col-cost .cost-empty { display: none; }

    /* Status — top right */
    .product-table tbody td.col-status {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }

    /* Actions — right-aligned row under the price line */
    .product-table tbody td.col-actions {
        grid-column: 1 / -1;
        grid-row: 3;
        display: flex;
        justify-content: flex-end;
        gap: 0.25rem;
        padding-top: 0.35rem;
    }

    .product-table tbody td.empty-state { grid-column: 1 / -1; padding: 2.5rem 1rem; }
}
</style>
