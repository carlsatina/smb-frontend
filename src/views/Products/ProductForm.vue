<template>
    <section class="product-page">
        <div class="product-shell">
            <header class="product-header">
                <div class="product-title">
                    <span class="product-eyebrow">Catalog</span>
                    <h1>{{ isEdit ? 'Edit product' : 'New product' }}</h1>
                    <p>Define pricing, SKU, and stock behavior for {{ currentStoreLabel }}</p>
                </div>
                <div class="product-actions">
                    <button type="button" class="ghost-button" @click="goBack">Back to products</button>
                </div>
            </header>

            <div class="product-content">
                <form class="product-form" @submit.prevent="save">
                    <div v-if="formError" class="form-alert form-alert--error">{{ formError }}</div>
                    <div v-if="form.type === 'RECIPE' && isRecipePlanLocked" class="form-alert form-alert--warning">
                        Upgrade to Standard to build recipe products.
                    </div>
                    <div v-if="isRecipeMissing" class="form-alert form-alert--warning">
                        Recipe products need at least one ingredient line before they can be activated.
                    </div>
                    <div v-if="isSaveBlocked" class="form-alert form-alert--warning">
                        Finish or remove incomplete recipe lines before saving.
                    </div>
                    <div class="form-section">
                        <div class="section-title">
                            <h2>Basics</h2>
                            <p>Identity and classification for POS + inventory.</p>
                        </div>
                        <div class="form-grid two-col">
                            <label class="field">
                                <span>Name</span>
                                <input ref="productNameInputRef" v-model="form.name" type="text" required />
                            </label>
                            <label class="field">
                                <span>Type</span>
                                <select v-model="form.type">
                                    <option value="READY_MADE">Ready-made</option>
                                    <option :disabled="isRecipePlanLocked" value="RECIPE">Recipe</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="section-title">
                            <h2>Identifiers</h2>
                            <p>Scanning, classification, and unit metadata.</p>
                        </div>
                        <div class="form-grid two-col">
                            <label class="field">
                                <span>SKU</span>
                                <input v-model="form.sku" type="text" />
                            </label>
                            <label class="field">
                                <span>Barcode</span>
                                <input v-model="form.barcode" type="text" />
                            </label>
                            <label class="field">
                                <span>Unit</span>
                                <select v-model="form.unit" required>
                                    <option v-for="unit in unitOptions" :key="unit" :value="unit">
                                        {{ unit }}
                                    </option>
                                </select>
                            </label>
                            <label class="field">
                                <span>Category</span>
                                <select v-model="form.category">
                                    <option value="">Uncategorized</option>
                                    <option v-for="category in categoryOptions" :key="category" :value="category">
                                        {{ category }}
                                    </option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="section-title">
                            <h2>Pricing</h2>
                            <p>Define retail pricing and internal cost.</p>
                        </div>
                        <div class="form-grid two-col">
                            <label class="field">
                                <span>Price ({{ currencySymbol }})</span>
                                <input v-model.number="form.price" type="number" step="0.01" />
                            </label>
                            <label class="field">
                                <span>Cost ({{ currencySymbol }})</span>
                                <input v-model.number="form.cost" type="number" step="0.01" />
                            </label>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="section-title">
                            <h2>Stock controls</h2>
                            <p>Low stock alerts and availability for the POS.</p>
                        </div>
                        <div class="form-grid two-col">
                            <label class="field">
                                <span>Low stock threshold</span>
                                <input v-model.number="form.lowStockThreshold" type="number" step="0.01" />
                            </label>
                            <label class="toggle-field">
                                <span>Active</span>
                                <input v-model="form.active" type="checkbox" :disabled="isRecipeMissing" />
                                <span class="toggle-text">
                                    {{ isRecipeMissing ? 'Needs recipe lines' : form.active ? 'Enabled' : 'Disabled' }}
                                </span>
                                <span v-if="isRecipeMissing" class="toggle-hint">Add recipe lines to enable.</span>
                                <span v-if="hasLowStockIngredients" class="toggle-hint toggle-hint--warning">
                                    Low stock ingredients: {{ lowStockLabel }}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div v-if="form.type === 'RECIPE'" class="form-section">
                        <div class="section-title-row">
                            <div>
                                <h2>Recipe lines</h2>
                                <p>Map ingredients and usage per unit sold.</p>
                            </div>
                            <span v-if="recipeSummary.ingredientCount > 0" class="recipe-total-badge">
                                {{ formatMoney(recipeSummary.estimatedCost) }} / unit
                            </span>
                        </div>
                        <PlanGate
                            v-if="isRecipePlanLocked"
                            feature="recipes"
                            title="Recipes are available on Standard."
                            description="Upgrade to Standard to add ingredients and recipe lines."
                        />
                        <div v-else class="recipe-editor">
                            <div v-if="recipeLoading" class="panel-state">Loading recipe lines...</div>
                            <div v-else>
                                <div v-if="recipeError" class="form-alert form-alert--error">{{ recipeError }}</div>
                                <div v-if="recipeSuccess" class="form-alert form-alert--success">Recipe lines saved.</div>
                                <div v-if="ingredientsLoading" class="panel-state panel-state--muted">Loading ingredients...</div>

                                <div v-if="recipeLines.length === 0" class="recipe-empty">
                                    <p>No ingredients yet. Click <strong>Add ingredient</strong> to start building the recipe.</p>
                                </div>
                                <div v-else class="recipe-lines-list">
                                    <div
                                        v-for="(line, index) in recipeLines"
                                        :key="line.key"
                                        class="recipe-line-row"
                                        :class="{ 'recipe-line-row--error': lineError(line) }"
                                    >
                                        <select v-model="line.ingredientId" class="recipe-line-select">
                                            <option value="" disabled>Select ingredient…</option>
                                            <option
                                                v-for="ingredient in availableIngredients(line)"
                                                :key="ingredient.id"
                                                :value="ingredient.id"
                                            >
                                                {{ ingredient.name }} ({{ ingredient.unit }})
                                            </option>
                                        </select>
                                        <div class="recipe-line-qty">
                                            <input
                                                v-model.number="line.qtyPerProductUnit"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="recipe-line-input"
                                            />
                                            <span class="unit-badge">{{ ingredientMap.get(line.ingredientId)?.unit || 'unit' }}</span>
                                        </div>
                                        <span class="recipe-line-cost">{{ formatMoney(lineCost(line)) }}</span>
                                        <button
                                            type="button"
                                            class="recipe-line-remove"
                                            @click="removeRecipeLine(index)"
                                            title="Remove"
                                        >×</button>
                                    </div>
                                </div>

                                <div class="recipe-footer">
                                    <button
                                        type="button"
                                        class="add-ingredient-btn"
                                        :disabled="ingredients.length === 0"
                                        @click="addRecipeLine"
                                    >
                                        + Add ingredient
                                    </button>
                                    <button
                                        v-if="isEdit"
                                        type="button"
                                        class="primary-button"
                                        :disabled="recipeSaving || isSaveBlocked"
                                        @click="saveRecipeLines"
                                    >
                                        Save recipe lines
                                    </button>
                                </div>
                                <p v-if="!isEdit" class="recipe-hint">
                                    Recipe lines will be saved when you save the product.
                                </p>
                                <p v-else-if="ingredients.length === 0" class="recipe-hint">
                                    Add at least one ingredient to build a recipe.
                                </p>
                            </div>

                            <div class="ingredient-create-link">
                                <span>Ingredient not listed?</span>
                                <button type="button" class="link-button" @click="openIngredientModal">
                                    Create new ingredient
                                </button>
                                <span class="link-sep">·</span>
                                <button type="button" class="link-button" @click="goToIngredients">
                                    Manage ingredients
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="ghost-button" @click="goBack">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="saveDisabled">Save product</button>
                    </div>
                </form>

                <aside class="insight-panel">
                    <div class="insight-card">
                        <h3>Product preview</h3>
                        <div class="summary-grid">
                            <div>
                                <span class="summary-label">Name</span>
                                <span class="summary-value">{{ form.name || 'Untitled product' }}</span>
                            </div>
                            <div>
                                <span class="summary-label">Type</span>
                                <span class="summary-value">{{ formatProductType(form.type) }}</span>
                            </div>
                            <div>
                                <span class="summary-label">Price</span>
                                <span class="summary-value">{{ form.price ? formatMoney(form.price) : '—' }}</span>
                            </div>
                            <div>
                                <span class="summary-label">Status</span>
                                <span class="summary-value">{{ statusLabel }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="form.type === 'RECIPE'" class="insight-card recipe-preview">
                        <div class="preview-header">
                            <h3>Recipe</h3>
                            <span class="preview-total">{{ formatMoney(recipeSummary.estimatedCost) }}</span>
                        </div>
                        <div v-if="stockLoading" class="panel-state panel-state--muted">Loading...</div>
                        <div v-else-if="stockError" class="form-alert form-alert--error">{{ stockError }}</div>
                        <div v-else-if="recipePreviewLines.length === 0" class="panel-state panel-state--muted">
                            No ingredients yet.
                        </div>
                        <ul v-else class="preview-list">
                            <li
                                v-for="line in recipePreviewLines"
                                :key="line.key"
                                :class="{ 'low-stock': line.isLowStock }"
                            >
                                <span class="item-name">{{ line.name }}</span>
                                <span class="item-qty">{{ line.qtyLabel }}</span>
                                <span class="item-cost">{{ formatMoney(line.lineCost) }}</span>
                                <span v-if="line.isLowStock" class="item-badge low">Low</span>
                            </li>
                        </ul>
                    </div>
                    <div class="insight-card">
                        <h3>Margin calculator</h3>
                        <div class="margin-grid">
                            <div class="margin-row">
                                <span class="margin-label">Selling price</span>
                                <span class="margin-value">{{ form.price ? formatMoney(form.price) : '—' }}</span>
                            </div>
                            <div class="margin-row">
                                <span class="margin-label">Cost</span>
                                <span class="margin-value">{{ form.cost ? formatMoney(form.cost) : '—' }}</span>
                            </div>
                            <div v-if="form.type === 'RECIPE' && recipeSummary.ingredientCount > 0" class="margin-row">
                                <span class="margin-label">Recipe cost</span>
                                <span class="margin-value">{{ formatMoney(recipeSummary.estimatedCost) }}</span>
                            </div>
                            <div class="margin-row margin-row--total">
                                <span class="margin-label">Gross margin</span>
                                <span
                                    class="margin-value margin-pct"
                                    :class="{
                                        'margin-pct--good': marginPct !== null && marginPct >= 30,
                                        'margin-pct--warn': marginPct !== null && marginPct >= 0 && marginPct < 30,
                                        'margin-pct--bad': marginPct !== null && marginPct < 0,
                                    }"
                                >{{ marginPct !== null ? marginPct.toFixed(1) + '%' : '—' }}</span>
                            </div>
                        </div>
                        <p v-if="marginPct !== null && marginPct < 0" class="margin-hint margin-hint--bad">Cost exceeds selling price.</p>
                        <p v-else-if="marginPct !== null && marginPct < 30" class="margin-hint margin-hint--warn">Below 30% — consider adjusting pricing.</p>
                        <p v-else-if="marginPct === null" class="margin-hint">Enter a price and cost to see your margin.</p>
                    </div>
                </aside>
            </div>
        </div>

        <IngredientModal
            :open="showIngredientModal"
            @close="showIngredientModal = false"
            @created="onIngredientCreated"
        />
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listIngredients, IngredientCategory } from '@/api/ingredients';
import { listStock, StockItem } from '@/api/inventory';
import { createProduct, getProduct, updateProduct } from '@/api/products';
import { listRecipeLines, updateRecipeLines } from '@/api/recipes';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';
import { DEFAULT_CATEGORY_OPTIONS, DEFAULT_UNIT_OPTIONS } from '@/utils/catalogDefaults';
import PlanGate from '@/components/PlanGate.vue';
import IngredientModal from '@/components/IngredientModal.vue';

type IngredientOption = {
    id: string;
    name: string;
    unit: string;
    category: IngredientCategory;
    costPerUnit: number;
};

type RecipeLineDraft = {
    key: string;
    ingredientId: string;
    qtyPerProductUnit: number;
};

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();

const productId = computed(() => route.params.productId as string | undefined);
const isEdit = computed(() => Boolean(productId.value));
// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const canUseIngredients = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'ingredients'));
const canUseRecipes = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'recipes'));
const isRecipePlanLocked = computed(() => {
    // Don't lock if we haven't loaded store context yet
    if (!planKnown.value) return false;
    // Lock if owner's subscription is inactive AND on starter plan
    if (!ownerSubscriptionActive.value && ownerPlanTier.value === 'STARTER') return true;
    // Lock if owner's plan doesn't support ingredients or recipes
    return !canUseIngredients.value || !canUseRecipes.value;
});
const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});
const productNameInputRef = ref<HTMLInputElement | null>(null);
const formError = ref('');
const recipeLines = ref<RecipeLineDraft[]>([]);
const recipeLoading = ref(false);
const recipeSaving = ref(false);
const recipeError = ref('');
const recipeSuccess = ref(false);
const ingredients = ref<IngredientOption[]>([]);
const ingredientsLoading = ref(false);
const ingredientStock = ref<StockItem[]>([]);
const stockLoading = ref(false);
const stockError = ref('');
const isSaving = ref(false);
const showIngredientModal = ref(false);

const recipeLinesValid = computed(() => {
    if (form.value.type !== 'RECIPE') return true;
    if (recipeLines.value.length === 0) return false;
    return recipeLines.value.every(
        (line) => line.ingredientId && Number.isFinite(line.qtyPerProductUnit) && line.qtyPerProductUnit > 0
    );
});
const ingredientMap = computed(() => {
    const map = new Map<string, IngredientOption>();
    ingredients.value.forEach((ingredient) => {
        map.set(ingredient.id, ingredient);
    });
    return map;
});
const ingredientStockMap = computed(() => {
    const map = new Map<string, StockItem>();
    ingredientStock.value.forEach((item) => {
        if (item.itemType === 'INGREDIENT') {
            map.set(item.itemId, item);
        }
    });
    return map;
});
const recipePreviewLines = computed(() => {
    return recipeLines.value
        .filter((line) => line.ingredientId)
        .map((line) => {
            const ingredient = ingredientMap.value.get(line.ingredientId);
            const qty = Number.isFinite(line.qtyPerProductUnit) ? line.qtyPerProductUnit : 0;
            const costPerUnit = ingredient?.costPerUnit ?? 0;
            const lineCost = qty * costPerUnit;
            const stock = ingredientStockMap.value.get(line.ingredientId);
            const currentQty = stock ? Number(stock.currentQty) : null;
            const lowStockThreshold = stock ? Number(stock.lowStockThreshold) : null;
            const isLowStock =
                typeof currentQty === 'number' &&
                typeof lowStockThreshold === 'number' &&
                lowStockThreshold > 0 &&
                currentQty <= lowStockThreshold;
            const unitSuffix = ingredient?.unit ? ` ${ingredient.unit}` : '';
            const stockLabel =
                typeof currentQty === 'number' ? `${currentQty}${unitSuffix}` : '—';
            return {
                key: line.key,
                ingredientId: line.ingredientId,
                name: ingredient?.name ?? 'Unknown ingredient',
                qty,
                unit: ingredient?.unit ?? '',
                lineCost,
                isLowStock,
                stockLabel,
                qtyLabel: `${formatQty(qty)}${unitSuffix} per sale`,
            };
        });
});
const recipeSummary = computed(() => {
    const estimatedCost = recipePreviewLines.value.reduce((sum, line) => sum + line.lineCost, 0);
    return {
        lineCount: recipeLines.value.length,
        ingredientCount: recipePreviewLines.value.length,
        estimatedCost,
    };
});
const marginPct = computed(() => {
    const price = form.value.price;
    const effectiveCost =
        form.value.type === 'RECIPE' && recipeSummary.value.ingredientCount > 0
            ? recipeSummary.value.estimatedCost
            : form.value.cost;
    if (!price || !effectiveCost) return null;
    return ((price - effectiveCost) / price) * 100;
});

const isSaveBlocked = computed(() => {
    if (form.value.type !== 'RECIPE') return false;
    if (recipeLines.value.length === 0) return false;
    return !recipeLinesValid.value;
});
const isRecipeMissing = computed(() => form.value.type === 'RECIPE' && !recipeLinesValid.value);
const hasLowStockIngredients = computed(() =>
    recipePreviewLines.value.some((line) => line.isLowStock)
);
const lowStockLabel = computed(() => {
    const names = recipePreviewLines.value.filter((line) => line.isLowStock).map((line) => line.name);
    if (names.length === 0) return '';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
});
const statusLabel = computed(() => {
    if (isRecipeMissing.value) return 'Recipe missing';
    return form.value.active ? 'Active' : 'Inactive';
});
const saveDisabled = computed(() => {
    if (isSaving.value || isSaveBlocked.value) return true;
    if (form.value.type === 'RECIPE' && isRecipePlanLocked.value) return true;
    return false;
});

const buildLineKey = () => `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const { showToast } = useToast();

const getErrorMessage = (error: unknown) => {
    if (typeof error === 'object' && error && 'body' in error) {
        const body = (error as { body?: { error?: { message?: string } } }).body;
        return body?.error?.message ?? null;
    }
    return null;
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatProductType = (type: string) => {
    if (type === 'READY_MADE') return 'Ready-made';
    if (type === 'RECIPE') return 'Recipe';
    return type;
};

const currencySymbol = computed(() => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(0);
        return formatted.replace(/[\d.,\s]/g, '').trim();
    } catch {
        return '$';
    }
});

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
};

const normalizeOptions = (options: string[]) => {
    const normalized: string[] = [];
    options.forEach((option) => {
        const value = option.trim();
        if (!value) return;
        if (normalized.some((entry) => entry.toLowerCase() === value.toLowerCase())) return;
        normalized.push(value);
    });
    return normalized;
};

const form = ref({
    name: '',
    type: 'READY_MADE' as 'READY_MADE' | 'RECIPE',
    sku: '',
    barcode: '',
    price: 0,
    cost: 0,
    unit: DEFAULT_UNIT_OPTIONS[0],
    category: DEFAULT_CATEGORY_OPTIONS[0],
    active: true,
    lowStockThreshold: 0,
});

const storeUnitOptions = computed(() => {
    const storeOptions = storeContext.currentStore?.unitOptions ?? [];
    const base = storeOptions.length > 0 ? storeOptions : DEFAULT_UNIT_OPTIONS;
    return normalizeOptions(base);
});

const storeCategoryOptions = computed(() => {
    const storeOptions = storeContext.currentStore?.categoryOptions ?? [];
    const base = storeOptions.length > 0 ? storeOptions : DEFAULT_CATEGORY_OPTIONS;
    return normalizeOptions(base);
});

const unitOptions = computed(() => {
    const all = [...storeUnitOptions.value];
    const current = form.value.unit.trim();
    if (current && !all.some((unit) => unit.toLowerCase() === current.toLowerCase())) {
        return [current, ...all];
    }
    return all;
});

const categoryOptions = computed(() => {
    const all = [...storeCategoryOptions.value];
    const current = form.value.category.trim();
    if (current && !all.some((category) => category.toLowerCase() === current.toLowerCase())) {
        return [current, ...all];
    }
    return all;
});

const isNewProduct = computed(() => !productId.value);

watch(
    () => storeContext.currentStore,
    (store) => {
        if (!store || !isNewProduct.value) return;
        const units = store.unitOptions?.length ? store.unitOptions : DEFAULT_UNIT_OPTIONS;
        const categories = store.categoryOptions?.length ? store.categoryOptions : DEFAULT_CATEGORY_OPTIONS;
        form.value.unit = units[0] ?? DEFAULT_UNIT_OPTIONS[0];
        form.value.category = categories[0] ?? DEFAULT_CATEGORY_OPTIONS[0];
    },
    { immediate: true }
);

const loadProduct = async () => {
    if (!storeContext.currentStoreId || !productId.value) return;
    const data = await getProduct(storeContext.currentStoreId, productId.value);
    form.value = {
        name: data.product.name,
        type: data.product.type,
        sku: data.product.sku ?? '',
        barcode: data.product.barcode ?? '',
        price: Number(data.product.price),
        cost: data.product.cost ? Number(data.product.cost) : 0,
        unit: data.product.unit,
        category: data.product.category ?? '',
        active: data.product.active ?? true,
        lowStockThreshold: data.product.lowStockThreshold ? Number(data.product.lowStockThreshold) : 0,
    };
};

const loadIngredients = async () => {
    if (isRecipePlanLocked.value) {
        ingredients.value = [];
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        ingredients.value = [];
        return;
    }
    ingredientsLoading.value = true;
    try {
        const data = await listIngredients(storeId);
        ingredients.value = data.ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category,
            costPerUnit: Number(ingredient.costPerUnit),
        }));
        ingredients.value.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Unable to load ingredients:', error);
        ingredients.value = [];
    } finally {
        ingredientsLoading.value = false;
    }
};

const loadIngredientStock = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || form.value.type !== 'RECIPE' || isRecipePlanLocked.value) {
        ingredientStock.value = [];
        return;
    }
    stockLoading.value = true;
    stockError.value = '';
    try {
        const data = await listStock(storeId, { itemType: 'INGREDIENT' });
        ingredientStock.value = data.stock;
    } catch (error) {
        stockError.value = getErrorMessage(error) || 'Unable to load ingredient stock.';
        ingredientStock.value = [];
    } finally {
        stockLoading.value = false;
    }
};

const loadRecipeLines = async () => {
    if (!storeContext.currentStoreId || !productId.value || form.value.type !== 'RECIPE' || isRecipePlanLocked.value) {
        recipeLines.value = [];
        return;
    }
    recipeLoading.value = true;
    recipeError.value = '';
    recipeSuccess.value = false;
    try {
        const data = await listRecipeLines(storeContext.currentStoreId, productId.value);
        recipeLines.value = data.lines.map((line) => ({
            key: line.id || buildLineKey(),
            ingredientId: line.ingredientId,
            qtyPerProductUnit: Number(line.qtyPerProductUnit),
        }));
    } catch (error) {
        recipeError.value = getErrorMessage(error) || 'Unable to load recipe lines.';
    } finally {
        recipeLoading.value = false;
    }
};

const addRecipeLine = () => {
    recipeLines.value.push({
        key: buildLineKey(),
        ingredientId: '',
        qtyPerProductUnit: 1,
    });
};

const removeRecipeLine = (index: number) => {
    recipeLines.value.splice(index, 1);
};

const availableIngredients = (line: RecipeLineDraft) => {
    if (ingredients.value.length === 0) return [];
    const selectedIds = new Set(recipeLines.value.map((item) => item.ingredientId).filter(Boolean));
    return ingredients.value.filter((ingredient) => {
        if (ingredient.id === line.ingredientId) return true;
        return !selectedIds.has(ingredient.id);
    });
};

const lineError = (line: RecipeLineDraft) => {
    if (!line.ingredientId) return 'Select an ingredient.';
    if (!Number.isFinite(line.qtyPerProductUnit) || line.qtyPerProductUnit <= 0) {
        return 'Quantity must be greater than zero.';
    }
    return '';
};

const lineCost = (line: RecipeLineDraft) => {
    const ingredient = ingredientMap.value.get(line.ingredientId);
    const qty = Number.isFinite(line.qtyPerProductUnit) ? line.qtyPerProductUnit : 0;
    return qty * (ingredient?.costPerUnit ?? 0);
};

const saveRecipeLines = async () => {
    if (isRecipePlanLocked.value) {
        openPlanUpgradeModal('recipes');
        return;
    }
    if (!storeContext.currentStoreId || !productId.value) return;
    recipeError.value = '';
    recipeSuccess.value = false;

    const trimmed = recipeLines.value.map((line) => ({
        ingredientId: line.ingredientId,
        qtyPerProductUnit: Number(line.qtyPerProductUnit),
    }));

    for (const line of trimmed) {
        if (!line.ingredientId) {
            recipeError.value = 'Each line needs an ingredient.';
            return;
        }
        if (!Number.isFinite(line.qtyPerProductUnit) || line.qtyPerProductUnit <= 0) {
            recipeError.value = 'Each line needs a positive quantity.';
            return;
        }
    }

    const ingredientIds = trimmed.map((line) => line.ingredientId);
    const uniqueIngredientIds = new Set(ingredientIds);
    if (uniqueIngredientIds.size !== ingredientIds.length) {
        recipeError.value = 'Each ingredient can only appear once in a recipe.';
        return;
    }

    recipeSaving.value = true;
    try {
        const data = await updateRecipeLines(storeContext.currentStoreId, productId.value, trimmed);
        recipeLines.value = data.lines.map((line) => ({
            key: line.id || buildLineKey(),
            ingredientId: line.ingredientId,
            qtyPerProductUnit: Number(line.qtyPerProductUnit),
        }));
        recipeSuccess.value = true;
    } catch (error) {
        recipeError.value = getErrorMessage(error) || 'Unable to save recipe lines.';
    } finally {
        recipeSaving.value = false;
    }
};

const openIngredientModal = () => {
    if (isRecipePlanLocked.value) {
        openPlanUpgradeModal('ingredients');
        return;
    }
    showIngredientModal.value = true;
};

const onIngredientCreated = async (ingredient: { id: string; name: string; unit: string; category: IngredientCategory; costPerUnit: number }) => {
    ingredients.value = [
        ...ingredients.value,
        {
            id: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category,
            costPerUnit: Number(ingredient.costPerUnit),
        },
    ].sort((a, b) => a.name.localeCompare(b.name));
    await loadIngredientStock();
    showToast('Ingredient created.');
};

const save = async () => {
    if (!storeContext.currentStoreId) return;
    formError.value = '';
    if (form.value.type === 'RECIPE' && isRecipePlanLocked.value) {
        openPlanUpgradeModal('recipes');
        return;
    }
    if (isSaveBlocked.value) {
        formError.value = 'Finish or remove incomplete recipe lines before saving.';
        return;
    }
    const normalizeOptionalNumber = (value: number) => (Number.isFinite(value) ? value : null);
    const recipePayload =
        form.value.type === 'RECIPE'
            ? recipeLines.value.map((line) => ({
                  ingredientId: line.ingredientId,
                  qtyPerProductUnit: Number(line.qtyPerProductUnit),
              }))
            : undefined;
    const payload = {
        ...form.value,
        sku: form.value.sku || null,
        barcode: form.value.barcode || null,
        category: form.value.category || null,
        cost: normalizeOptionalNumber(form.value.cost),
        lowStockThreshold: normalizeOptionalNumber(form.value.lowStockThreshold),
        recipeLines: recipePayload,
    };
    if (form.value.type === 'RECIPE' && isRecipeMissing.value) {
        payload.active = false;
    }

    try {
        isSaving.value = true;
        if (productId.value) {
            await updateProduct(storeContext.currentStoreId, productId.value, payload);
        } else {
            await createProduct(storeContext.currentStoreId, payload);
        }
    } catch (error) {
        formError.value = getErrorMessage(error) || 'Unable to save product. Please try again.';
        return;
    } finally {
        isSaving.value = false;
    }

    router.push(`/stores/${storeContext.currentStoreId}/products`);
};

const goBack = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/products`);
};

const goToIngredients = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/ingredients`);
};

onMounted(async () => {
    // Ensure user context is loaded for plan feature checks
    await userContext.fetchMe();
    if (!storeContext.currentStoreId) {
        await storeContext.fetchStores();
    }
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadProduct();
    await loadIngredients();
    await loadIngredientStock();
    await loadRecipeLines();
    if (!isEdit.value) {
        nextTick(() => productNameInputRef.value?.focus());
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
    () => [form.value.type, recipeLines.value],
    () => {
        // Only force active=false for new products with missing recipes
        // For existing products, preserve the loaded active value
        if (isNewProduct.value && isRecipeMissing.value) {
            form.value.active = false;
        }
    },
    { deep: true }
);

watch(
    () => form.value.type,
    async (nextType) => {
        if (nextType === 'RECIPE') {
            await loadIngredients();
            await loadIngredientStock();
            await loadRecipeLines();
        } else {
            recipeLines.value = [];
            recipeError.value = '';
            recipeSuccess.value = false;
            ingredientStock.value = [];
        }
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        await loadIngredients();
        await loadIngredientStock();
        await loadRecipeLines();
    }
);

watch(
    () => productId.value,
    async () => {
        await loadProduct();
        await loadRecipeLines();
    }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

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
   SHELL & HEADER
============================================================ */
.product-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
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
    max-width: 520px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

.product-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
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

/* ============================================================
   FORM PANEL
============================================================ */
.product-form {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0;
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

.form-alert--success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
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

.form-section:first-of-type {
    padding-top: 0;
}

.form-section:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
}

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
    grid-template-columns: repeat(2, 1fr);
}

.form-grid.three-col {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.field input,
.field select {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.65rem 0.9rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.field input::placeholder {
    color: #94a3b8;
}

.field input:focus,
.field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.field.compact input,
.field.compact select {
    padding: 0.5rem 0.7rem;
    font-size: 0.84rem;
}

/* ============================================================
   TOGGLE FIELD (Active)
============================================================ */
.toggle-field {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
    padding-top: 1.4rem;
    flex-wrap: wrap;
}

.toggle-field input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--c-accent);
    cursor: pointer;
    flex-shrink: 0;
}

.toggle-field input[type="checkbox"]:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.toggle-text {
    font-weight: 600;
    color: var(--c-accent-dark);
}

.toggle-hint {
    font-size: 0.75rem;
    color: var(--c-muted);
    flex-basis: 100%;
    margin-left: 1.6rem;
}

.toggle-hint--warning {
    color: #b45309;
}

/* ============================================================
   PANEL STATE
============================================================ */
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

/* ============================================================
   RECIPE EDITOR
============================================================ */
.recipe-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.section-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

.section-title-row h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.section-title-row p {
    margin: 0.2rem 0 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

.recipe-total-badge {
    flex-shrink: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.08);
    border: 1px solid rgba(13, 148, 136, 0.2);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    white-space: nowrap;
}

.recipe-empty {
    padding: 1.5rem 1rem;
    text-align: center;
    color: var(--c-muted);
    font-size: 0.84rem;
    background: #f8fafc;
    border: 1.5px dashed var(--c-border);
    border-radius: 10px;
}

.recipe-empty p {
    margin: 0;
}

.recipe-lines-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recipe-line-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.6rem 0.75rem;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-surface);
    transition: border-color 0.15s;
}

.recipe-line-row--error {
    border-color: #fca5a5;
    background: #fef2f2;
}

.recipe-line-select {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
}

.recipe-line-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.recipe-line-qty {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.recipe-line-input {
    width: 70px;
    padding: 0.45rem 0.5rem;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    text-align: right;
    transition: border-color 0.15s;
}

.recipe-line-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.unit-badge {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    background: #f1f5f9;
    border: 1px solid var(--c-border);
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    white-space: nowrap;
}

.recipe-line-cost {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    white-space: nowrap;
    min-width: 4.5rem;
    text-align: right;
}

.recipe-line-remove {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    line-height: 1;
    transition: all 0.15s;
}

.recipe-line-remove:hover {
    color: #ef4444;
    background: #fef2f2;
}

.recipe-footer {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
}

.add-ingredient-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem 0.9rem;
    border-radius: 7px;
    border: 1.5px dashed var(--c-border);
    background: transparent;
    color: var(--c-accent-dark);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
}

.add-ingredient-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.05);
}

.add-ingredient-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.recipe-hint {
    margin: 0.5rem 0 0;
    color: var(--c-muted);
    font-size: 0.8rem;
}

.ingredient-create-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    font-size: 0.84rem;
    color: var(--c-muted);
    flex-wrap: wrap;
}

.link-sep {
    color: var(--c-border);
    font-weight: 400;
    user-select: none;
}

.link-button {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.84rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.15s, color 0.15s;
}

.link-button:hover {
    color: var(--c-accent-dark);
    text-decoration-color: var(--c-accent);
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

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

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
    background: rgba(13, 148, 136, 0.05);
}

.ghost-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
    white-space: nowrap;
    text-align: left;
}

.secondary-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.secondary-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ============================================================
   INSIGHT PANEL (ASIDE)
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

.insight-card p {
    font-size: 0.82rem;
    color: var(--c-muted);
    line-height: 1.55;
    margin: 0 0 0.75rem;
}

.insight-card.highlight {
    background: rgba(13, 148, 136, 0.04);
    border-color: rgba(13, 148, 136, 0.2);
}

.insight-card.highlight .secondary-button {
    width: 100%;
}

/* ============================================================
   SUMMARY GRID (product preview)
============================================================ */
.summary-grid {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.summary-grid > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
}

.summary-grid > div:last-child {
    border-bottom: none;
}

.summary-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.summary-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    text-align: right;
}

/* ============================================================
   RECIPE PREVIEW (aside card)
============================================================ */
.recipe-preview {
    padding: 1.25rem 1.4rem;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.preview-header h3 {
    margin: 0;
}

.preview-total {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--c-accent-dark);
}

.preview-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.preview-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    column-gap: 0.45rem;
    row-gap: 0.15rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.8rem;
    min-width: 0;
}

.preview-list li:last-child {
    border-bottom: none;
}

.preview-list li.low-stock .item-name {
    color: #dc2626;
}

.item-name {
    grid-column: 1;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--c-text);
    min-width: 0;
}

.item-qty {
    grid-column: 1;
    color: var(--c-muted);
    font-size: 0.72rem;
    min-width: 0;
    overflow-wrap: anywhere;
}

.item-cost {
    grid-column: 2;
    grid-row: 1 / span 2;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    align-self: center;
}

.item-badge {
    grid-column: 3;
    grid-row: 1 / span 2;
    align-self: center;
    font-size: 0.58rem;
    text-transform: uppercase;
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.06em;
}

.item-badge.low {
    background: #fef2f2;
    color: #b91c1c;
}

/* ============================================================
   MARGIN CALCULATOR
============================================================ */
.margin-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.margin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.82rem;
}

.margin-row:last-child {
    border-bottom: none;
}

.margin-row--total {
    padding-top: 0.6rem;
    margin-top: 0.1rem;
}

.margin-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.margin-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
}

.margin-pct {
    font-size: 1rem;
    font-weight: 700;
}

.margin-pct--good { color: #0d9488; }
.margin-pct--warn { color: #b45309; }
.margin-pct--bad  { color: #dc2626; }

.margin-hint {
    margin: 0.65rem 0 0;
    font-size: 0.78rem;
    color: var(--c-muted);
    line-height: 1.45;
}

.margin-hint--warn { color: #b45309; }
.margin-hint--bad  { color: #dc2626; }

/* ============================================================
   ACCESSIBILITY
============================================================ */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .product-content {
        grid-template-columns: 1fr;
    }

    .product-actions {
        width: 100%;
        justify-content: flex-start;
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

}

@media (max-width: 640px) {
    .product-page {
        padding: 1.25rem 1rem 2.5rem;
    }

    .product-title h1 {
        font-size: 1.5rem;
    }

    .form-grid.two-col {
        grid-template-columns: 1fr;
    }
}
</style>
