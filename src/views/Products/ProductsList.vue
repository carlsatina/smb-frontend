<template>
    <section class="product-page">
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
                    <p>Keep pricing, stock rules, and recipes consistent across {{ currentStoreLabel }}.</p>
                </div>
                <div class="product-kpis">
                    <div class="kpi-card">
                        <span class="kpi-label">Total</span>
                        <span class="kpi-value">{{ totalProducts }}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Active</span>
                        <span class="kpi-value">{{ activeProducts }}</span>
                        <span class="kpi-sub">Live in POS</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Recipes</span>
                        <span class="kpi-value">{{ recipeProducts }}</span>
                        <span class="kpi-sub">Ingredient-based</span>
                    </div>
                    <div v-if="recipeMissingCount > 0" class="kpi-card kpi-card--warn">
                        <span class="kpi-label">
                            <span class="kpi-dot kpi-dot--warn"></span>
                            Incomplete
                        </span>
                        <span class="kpi-value">{{ recipeMissingCount }}</span>
                        <span class="kpi-sub">Recipe missing</span>
                    </div>
                </div>
            </header>

            <div class="product-content">

                <!-- MAIN COLUMN -->
                <div class="product-main">

                    <!-- TOOLBAR -->
                    <div class="prod-toolbar">
                        <div class="toolbar-row">
                            <div class="toolbar-left">
                                <div class="filter-group">
                                    <span class="filter-group__label">Type</span>
                                    <div class="filter-pills">
                                        <button class="pill" :class="{ active: filterType === 'ALL' }" @click="filterType = 'ALL'">All</button>
                                        <button class="pill" :class="{ active: filterType === 'READY_MADE' }" @click="filterType = 'READY_MADE'">Ready-made</button>
                                        <button class="pill" :class="{ active: filterType === 'RECIPE' }" @click="filterType = 'RECIPE'">Recipe</button>
                                    </div>
                                </div>
                                <label class="active-toggle">
                                    <input v-model="activeOnly" type="checkbox" />
                                    <span>Active only</span>
                                </label>
                            </div>
                            <div class="toolbar-right">
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
                                + New product
                            </button>
                            <span v-else-if="storeContext.currentStoreId && !canImportExport" class="panel-note">View-only access</span>
                            </div>
                        </div>
                        <input
                            v-model="searchQuery"
                            type="text"
                            class="search-input"
                            placeholder="Search name, SKU, barcode..."
                        />
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
                        <div v-if="!storeContext.currentStoreId" class="panel-state">
                            Select or create a store to view products.
                        </div>
                        <SkeletonLoader v-else-if="isLoading" :rows="8" label="Loading products…" />
                        <div v-else class="table-wrap">
                            <table class="product-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th v-if="showSkuColumn">SKU</th>
                                        <th>Price</th>
                                        <th>Cost</th>
                                        <th>Status</th>
                                        <th class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="product in paginatedProducts" :key="product.id">
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
                                            <div class="product-meta">{{ product.category || 'Uncategorized' }}</div>
                                        </td>
                                        <td class="product-type">
                                            <span
                                                class="type-chip"
                                                :class="product.type === 'RECIPE' ? 'type-chip--recipe' : 'type-chip--ready'"
                                            >
                                                {{ formatProductType(product.type) }}
                                            </span>
                                        </td>
                                        <td v-if="showSkuColumn" class="product-sku">{{ product.sku || '—' }}</td>
                                        <td class="product-price">{{ formatMoney(product.price) }}</td>
                                        <td class="product-cost">
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
                                        <td class="table-actions">
                                            <template v-if="canWrite">
                                                <button class="ghost-button ghost-button--sm" @click="editProduct(product.id)">Edit</button>
                                                <button class="ghost-button ghost-button--sm ghost-button--danger" @click="removeProduct(product.id)">Delete</button>
                                            </template>
                                            <span v-else class="table-note">View only</span>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredProducts.length === 0">
                                        <td :colspan="columnCount" class="empty-state">
                                            No products match your filters.
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
                    </section>
                </div>

                <!-- ASIDE -->
                <aside class="insight-panel">
                    <div class="insight-card">
                        <h3>Catalog breakdown</h3>
                        <ul class="breakdown-list">
                            <li class="breakdown-item">
                                <span class="breakdown-label">Ready-made</span>
                                <span class="breakdown-value">{{ readyMadeProducts }}</span>
                            </li>
                            <li class="breakdown-item">
                                <span class="breakdown-label">Recipe</span>
                                <span class="breakdown-value">{{ recipeProducts }}</span>
                            </li>
                            <li class="breakdown-item">
                                <span class="breakdown-label">Active</span>
                                <span class="breakdown-value breakdown-value--active">{{ activeProducts }}</span>
                            </li>
                            <li class="breakdown-item">
                                <span class="breakdown-label">Inactive</span>
                                <span class="breakdown-value breakdown-value--muted">{{ inactiveProducts }}</span>
                            </li>
                            <li v-if="recipeMissingCount > 0" class="breakdown-item breakdown-item--warn">
                                <span class="breakdown-label">Recipe missing</span>
                                <span class="breakdown-value breakdown-value--warn">{{ recipeMissingCount }}</span>
                            </li>
                        </ul>
                        <button v-if="recipeMissingCount > 0" class="aside-filter-link" @click="filterType = 'RECIPE'; activeOnly = false; searchQuery = ''">
                            View incomplete recipes →
                        </button>
                    </div>

                    <div class="insight-card insight-card--actions">
                        <h3>Quick actions</h3>
                        <button v-if="canWrite" class="secondary-button" :disabled="!storeContext.currentStoreId" @click="createProduct">
                            + New product
                        </button>
                        <span v-else class="panel-note">View-only access</span>
                        <button class="secondary-button" @click="goToInventory">View inventory</button>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
const filterType = ref<'ALL' | 'READY_MADE' | 'RECIPE'>('ALL');
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

const goToInventory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory`);
};

const filteredProducts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const type = filterType.value;
    return products.value.filter((product) => {
        if (type !== 'ALL' && product.type !== type) return false;
        if (activeOnly.value && !product.active) return false;
        if (query && !product.name.toLowerCase().includes(query) && !(product.sku || '').toLowerCase().includes(query) && !(product.barcode || '').toLowerCase().includes(query) && !(product.category || '').toLowerCase().includes(query)) return false;
        return true;
    });
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
const activeProducts = computed(() => products.value.filter((p) => p.active).length);
const inactiveProducts = computed(() => products.value.filter((p) => !p.active).length);
const recipeProducts = computed(() => products.value.filter((p) => p.type === 'RECIPE').length);
const readyMadeProducts = computed(() => products.value.filter((p) => p.type === 'READY_MADE').length);
const recipeMissingCount = computed(() => products.value.filter((p) => p.type === 'RECIPE' && (p.recipeLineCount ?? 0) === 0).length);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});

const formatProductType = (type: string) => {
    if (type === 'READY_MADE') return 'Ready-made';
    if (type === 'RECIPE') return 'Recipe';
    return type;
};

// Hide the SKU column entirely for stores that don't track SKUs.
const showSkuColumn = computed(() => products.value.some((p) => !!p.sku));

// Name, Type, Price, Cost, Status, Actions (+ SKU when shown).
const columnCount = computed(() => 6 + (showSkuColumn.value ? 1 : 0));

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
watch(() => filterType.value, () => { page.value = 1; });
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.import-progress {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.75rem 1rem;
    background: rgba(13, 148, 136, 0.06);
    border: 1px solid rgba(13, 148, 136, 0.22);
    border-radius: 8px;
    margin-bottom: 0.5rem;
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
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}
.import-result--ok { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
.import-result--warn { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
.import-result__summary { display: flex; justify-content: space-between; align-items: center; }
.import-result__close { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.6; }
.import-result__close:hover { opacity: 1; }
.import-result__errors { margin: 0.5rem 0 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.2rem; }

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
.product-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ============================================================
   HEADER
============================================================ */
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

/* ============================================================
   KPI CARDS
============================================================ */
.product-kpis {
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
    min-width: 110px;
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

.kpi-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.kpi-dot--warn { background: #f59e0b; }

.kpi-value {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1;
}

.kpi-card--warn .kpi-value { color: #92400e; }

.kpi-sub {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   LAYOUT
============================================================ */
.product-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1.5rem;
    align-items: start;
}

.product-main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.prod-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.toolbar-row {
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
.filter-group {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
}

.filter-group__label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.filter-pills {
    display: inline-flex;
    background: #f1f5f9;
    border-radius: 8px;
    padding: 0.2rem;
    gap: 0.15rem;
    border: 1px solid var(--c-border);
}

.pill {
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
    white-space: nowrap;
}

.pill:hover { color: var(--c-text); }

.pill.active {
    background: var(--c-surface);
    color: var(--c-accent-dark);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
}

/* ============================================================
   SEARCH
============================================================ */
.active-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
}

.active-toggle input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--c-accent);
    cursor: pointer;
}

.search-input {
    width: 100%;
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
   MAIN PANEL
============================================================ */
.product-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
}

.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

.panel-note {
    font-size: 0.8rem;
    color: var(--c-muted);
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
    background: #f8fafc;
    white-space: nowrap;
}

.product-table thead th.align-right { text-align: right; }

.product-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.product-table tbody tr:last-child { border-bottom: none; }
.product-table tbody tr:hover { background: #f8fafc; }

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
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(245, 158, 11, 0.12);
    color: #92400e;
    white-space: nowrap;
}

.product-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
}

.product-type { white-space: nowrap; }

.type-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    white-space: nowrap;
}

.type-chip--ready {
    background: rgba(100, 116, 139, 0.12);
    color: #475569;
}

.type-chip--recipe {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
}

.product-sku {
    font-size: 0.82rem;
    color: var(--c-muted);
    font-variant-numeric: tabular-nums;
}

.product-price {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.product-cost {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.cost-value {
    font-weight: 600;
    color: var(--c-text);
}

.cost-margin {
    display: block;
    font-size: 0.7rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
}

.cost-empty { color: var(--c-muted); }

.table-note {
    font-size: 0.78rem;
    color: var(--c-muted);
}

.table-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
}

.empty-state {
    text-align: center;
    padding: 2.5rem 1rem;
    color: var(--c-muted);
    font-size: 0.875rem;
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
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }

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
    padding: 0.55rem 1rem;
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

.ghost-button--sm {
    padding: 0.38rem 0.75rem;
    font-size: 0.8rem;
}


.ghost-button--danger:hover {
    border-color: #f87171 !important;
    color: #dc2626 !important;
    background: #fef2f2 !important;
}

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

.insight-card--actions {
    background: rgba(13, 148, 136, 0.04);
    border-color: rgba(13, 148, 136, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.insight-card h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.85rem;
}

/* BREAKDOWN LIST */
.breakdown-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.breakdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    font-size: 0.83rem;
}

.breakdown-item:last-child { border-bottom: none; }

.breakdown-item--warn {
    background: rgba(251, 191, 36, 0.06);
    border-radius: 6px;
    padding-left: 0.4rem;
    padding-right: 0.4rem;
}

.breakdown-label {
    color: var(--c-muted);
    font-weight: 500;
}

.breakdown-value {
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.breakdown-value--active { color: var(--c-accent-dark); }
.breakdown-value--muted { color: var(--c-muted); }
.breakdown-value--warn { color: #92400e; }

.aside-filter-link {
    margin-top: 0.75rem;
    background: none;
    border: none;
    padding: 0;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-accent-dark);
    cursor: pointer;
    transition: color 0.15s;
}

.aside-filter-link:hover { color: var(--c-accent); }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .product-content { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
    .toolbar-row { flex-direction: column; align-items: stretch; }
    .toolbar-left { flex-direction: column; align-items: stretch; }
    .toolbar-right { width: 100%; }
    .toolbar-right .primary-button { width: 100%; justify-content: center; }
    .search-input { min-width: 0; width: 100%; }
    .filter-group { width: 100%; }
    .filter-pills { flex: 1; }
}

@media (max-width: 640px) {
    .product-page { padding: 1rem 0.875rem 2.5rem; }
    .product-title h1 { font-size: 1.5rem; }
    .product-panel { padding: 0 0 1rem; border-radius: 12px; }

    /* ── Table → card view ── */
    .product-table thead { display: none; }
    .product-table,
    .product-table tbody { display: block; }

    .product-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.1rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .product-table tbody tr:last-child { border-bottom: none; }
    .product-table tbody tr:hover { background: #f8fafc; }

    .product-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    /* Name + category */
    .product-table tbody td.col-name { grid-column: 1; grid-row: 1; }

    /* Type chip — below name */
    .product-table tbody td.product-type {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.25rem;
    }

    /* SKU — hidden on mobile (searchable, shown on desktop) */
    .product-table tbody td.product-sku { display: none; }

    /* Price — top right */
    .product-table tbody td.product-price {
        grid-column: 2;
        grid-row: 1;
        text-align: right;
        font-weight: 700;
        font-size: 0.95rem;
        white-space: nowrap;
    }

    /* Cost — under price */
    .product-table tbody td.product-cost {
        grid-column: 2;
        grid-row: 2;
        text-align: right;
        padding-top: 0.25rem;
    }
    .product-table tbody td.product-cost .cost-margin { text-align: right; }

    /* Status */
    .product-table tbody td.col-status {
        grid-column: 1 / -1;
        grid-row: 3;
        display: flex;
        justify-content: flex-start;
        padding-top: 0.4rem;
    }

    /* Actions row */
    .product-table tbody td.table-actions {
        grid-column: 1 / -1;
        grid-row: 4;
        justify-content: flex-start;
        padding-top: 0.5rem;
        margin-top: 0.35rem;
        border-top: 1px solid rgba(226, 232, 240, 0.6);
    }

    /* Empty state */
    .product-table tbody td.empty-state { grid-column: 1 / -1; }

    /* Pagination tighter */
    .pagination { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
}
</style>
