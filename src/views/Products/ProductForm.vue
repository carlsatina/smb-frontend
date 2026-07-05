<template>
    <section class="product-page">
        <div class="product-shell">
            <header class="form-header">
                <button type="button" class="back-link" @click="goBack">
                    <mdicon name="arrow-left" size="15" />
                    Products
                </button>
                <h1>{{ isEdit ? 'Edit product' : 'New product' }}</h1>
                <p>Pricing, stock behavior, and recipes for {{ currentStoreLabel }}.</p>
            </header>

            <form class="product-form" @submit.prevent="save">
                <div v-if="form.type === 'RECIPE' && isRecipePlanLocked" class="form-alert form-alert--warning">
                    Upgrade to Standard to build recipe products.
                </div>
                <div v-if="isRecipeMissing" class="form-alert form-alert--warning">
                    Recipe products need at least one ingredient line before they can be activated.
                </div>
                <div v-if="isSaveBlocked" class="form-alert form-alert--warning">
                    Finish or remove incomplete recipe lines before saving.
                </div>

                <!-- ── Details ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Details</h2>
                    </div>

                    <label class="field">
                        <span>Name</span>
                        <input ref="productNameInputRef" v-model="form.name" type="text" required placeholder="e.g. Spanish Latte" />
                    </label>

                    <div class="field">
                        <span>Type</span>
                        <div class="type-cards" role="group" aria-label="Product type">
                            <button
                                type="button"
                                class="type-card"
                                :class="{ 'type-card--selected': form.type === 'READY_MADE' }"
                                :aria-pressed="form.type === 'READY_MADE'"
                                @click="form.type = 'READY_MADE'"
                            >
                                <mdicon name="package-variant-closed" size="18" class="type-card-icon" />
                                <span class="type-card-title">Ready-made</span>
                                <span class="type-card-sub">Bought or premade, sold as-is</span>
                            </button>
                            <button
                                type="button"
                                class="type-card"
                                :class="{ 'type-card--selected': form.type === 'RECIPE' }"
                                :aria-pressed="form.type === 'RECIPE'"
                                :disabled="isRecipePlanLocked"
                                @click="form.type = 'RECIPE'"
                            >
                                <mdicon name="chef-hat" size="18" class="type-card-icon" />
                                <span class="type-card-title">
                                    Recipe
                                    <mdicon v-if="isRecipePlanLocked" name="lock-outline" size="13" class="type-card-lock" />
                                </span>
                                <span class="type-card-sub">Made from ingredients, deducted per sale</span>
                            </button>
                        </div>
                    </div>

                    <div class="form-grid">
                        <label class="field">
                            <span>Category</span>
                            <select v-model="form.category">
                                <option value="">Uncategorized</option>
                                <option v-for="category in categoryOptions" :key="category" :value="category">
                                    {{ category }}
                                </option>
                            </select>
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
                            <span>SKU <em>optional</em></span>
                            <input v-model="form.sku" type="text" />
                        </label>
                        <label class="field">
                            <span>Barcode <em>optional</em></span>
                            <input v-model="form.barcode" type="text" />
                        </label>
                    </div>
                </div>

                <!-- ── Pricing ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Pricing</h2>
                    </div>

                    <div class="form-grid">
                        <label class="field">
                            <span>Selling price</span>
                            <div class="money-input">
                                <span class="money-prefix">{{ currencySymbol }}</span>
                                <input v-model.number="form.price" type="number" step="0.01" min="0" />
                            </div>
                        </label>
                        <label class="field">
                            <span>Cost <em>optional</em></span>
                            <div class="money-input">
                                <span class="money-prefix">{{ currencySymbol }}</span>
                                <input v-model.number="form.cost" type="number" step="0.01" min="0" />
                            </div>
                        </label>
                    </div>

                    <div class="margin-readout" :class="marginToneClass">
                        <template v-if="marginPct !== null">
                            <mdicon :name="marginPct < 0 ? 'trending-down' : 'trending-up'" size="15" />
                            <span>
                                <strong>{{ marginPct.toFixed(1) }}% gross margin</strong>
                                · {{ formatMoney(profitPerUnit ?? 0) }} profit per unit
                                <template v-if="usesRecipeCost"> · based on recipe cost {{ formatMoney(recipeSummary.estimatedCost) }}</template>
                            </span>
                        </template>
                        <template v-else>
                            <mdicon name="information-outline" size="15" />
                            <span>Enter a price and cost to see your margin.</span>
                        </template>
                    </div>
                    <p v-if="marginPct !== null && marginPct < 0" class="margin-note margin-note--bad">Cost exceeds selling price.</p>
                    <p v-else-if="marginPct !== null && marginPct < 30" class="margin-note margin-note--warn">Below 30% — consider adjusting pricing.</p>
                </div>

                <!-- ── Recipe ── -->
                <div v-if="form.type === 'RECIPE'" class="form-card">
                    <div class="card-title card-title--row">
                        <div>
                            <h2>Recipe</h2>
                            <p>Ingredients deducted each time one unit is sold.</p>
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
                        <div v-if="recipeLoading" class="panel-state">Loading recipe lines…</div>
                        <div v-else>
                            <div v-if="recipeError" class="form-alert form-alert--error">{{ recipeError }}</div>
                            <div v-if="stockError" class="form-alert form-alert--error">{{ stockError }}</div>
                            <div v-if="recipeSuccess" class="form-alert form-alert--success">Recipe lines saved.</div>
                            <div v-if="ingredientsLoading" class="panel-state panel-state--muted">Loading ingredients…</div>

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
                                    <SearchableSelect
                                        :ref="setSelectRef(line.key)"
                                        v-model="line.ingredientId"
                                        class="recipe-line-select"
                                        :options="ingredientOptions(line)"
                                        placeholder="Select ingredient…"
                                        search-placeholder="Search ingredients…"
                                    />
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
                                    <span class="recipe-line-cost">
                                        {{ formatMoney(lineCost(line)) }}
                                        <span v-if="isLineLowStock(line.key)" class="line-low-chip">Low stock</span>
                                    </span>
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
                                    class="primary-button primary-button--sm"
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
                </div>

                <!-- ── Takeout packaging ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Takeout packaging</h2>
                        <p>Deducted from inventory only when this product is sold as takeout.</p>
                    </div>
                    <PlanGate
                        v-if="!canEditPackaging"
                        feature="ingredients"
                        title="Packaging tracking needs ingredients."
                        description="Upgrade to track packaging items as ingredients deducted on takeout."
                    />
                    <div v-else-if="!isEdit" class="recipe-empty">
                        <p>Save the product first, then add its takeout packaging here.</p>
                    </div>
                    <div v-else class="recipe-editor">
                        <div v-if="packagingLoading" class="panel-state">Loading packaging lines…</div>
                        <div v-else>
                            <div v-if="packagingError" class="form-alert form-alert--error">{{ packagingError }}</div>
                            <div v-if="packagingSuccess" class="form-alert form-alert--success">Packaging saved.</div>

                            <div v-if="packagingIngredients.length === 0" class="recipe-empty">
                                <p>No packaging ingredients yet. Create an ingredient in the <strong>Packaging</strong> category first.</p>
                            </div>
                            <template v-else>
                                <div v-if="packagingLines.length === 0" class="recipe-empty">
                                    <p>No packaging yet. Click <strong>Add packaging</strong> to deduct items on takeout.</p>
                                </div>
                                <div v-else class="recipe-lines-list">
                                    <div
                                        v-for="(line, index) in packagingLines"
                                        :key="line.key"
                                        class="recipe-line-row"
                                        :class="{ 'recipe-line-row--error': packagingLineError(line) }"
                                    >
                                        <SearchableSelect
                                            :ref="setSelectRef(line.key)"
                                            v-model="line.ingredientId"
                                            class="recipe-line-select"
                                            :options="packagingIngredientOptions(line)"
                                            placeholder="Select packaging…"
                                            search-placeholder="Search packaging…"
                                        />
                                        <div class="recipe-line-qty">
                                            <input
                                                v-model.number="line.qtyPerUnit"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                class="recipe-line-input"
                                            />
                                            <span class="unit-badge">{{ ingredientMap.get(line.ingredientId)?.unit || 'unit' }} / item</span>
                                        </div>
                                        <button
                                            type="button"
                                            class="recipe-line-remove"
                                            @click="removePackagingLine(index)"
                                            title="Remove"
                                        >×</button>
                                    </div>
                                </div>

                                <div class="recipe-footer">
                                    <button
                                        type="button"
                                        class="add-ingredient-btn"
                                        @click="addPackagingLine"
                                    >
                                        + Add packaging
                                    </button>
                                    <button
                                        type="button"
                                        class="primary-button primary-button--sm"
                                        :disabled="packagingSaving"
                                        @click="savePackagingLines"
                                    >
                                        Save packaging
                                    </button>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- ── Availability ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Availability</h2>
                    </div>

                    <div class="switch-field">
                        <div class="switch-copy">
                            <span class="switch-title">Active</span>
                            <span class="switch-sub">
                                {{ isRecipeMissing ? 'Add recipe lines to enable selling.' : 'Available for sale in the POS.' }}
                            </span>
                            <span v-if="hasLowStockIngredients" class="switch-warn">
                                Low stock ingredients: {{ lowStockLabel }}
                            </span>
                        </div>
                        <label class="switch" :class="{ 'switch--disabled': isRecipeMissing }">
                            <input v-model="form.active" type="checkbox" :disabled="isRecipeMissing" />
                            <span class="switch-track"><span class="switch-thumb"></span></span>
                        </label>
                    </div>

                    <label class="field field--narrow">
                        <span>Low stock threshold <em>alerts when stock falls to this level</em></span>
                        <input v-model.number="form.lowStockThreshold" type="number" step="0.01" min="0" />
                    </label>
                </div>

                <!-- ── Sticky actions ── -->
                <div class="actions-bar">
                    <span v-if="formError" class="actions-error">{{ formError }}</span>
                    <div class="actions-buttons">
                        <button type="button" class="ghost-button" @click="goBack">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="saveDisabled">
                            {{ isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product' }}
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <IngredientModal
            :open="showIngredientModal"
            @close="showIngredientModal = false"
            @created="onIngredientCreated"
        />

        <teleport to="body">
            <div v-if="showTypeChangeModal" class="type-modal-overlay" @click.self="cancelTypeChange">
                <div class="type-modal" role="dialog" aria-modal="true">
                    <h3 class="type-modal__title">Switch to Ready-made?</h3>
                    <p class="type-modal__body">
                        This product's recipe ingredients will be removed. If you switch back to
                        Recipe later, you'll need to add them again manually.
                    </p>
                    <div class="type-modal__actions">
                        <button type="button" class="type-modal__cancel" @click="cancelTypeChange">Keep recipe</button>
                        <button type="button" class="type-modal__confirm" @click="confirmTypeChange">
                            Switch &amp; remove ingredients
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listIngredients, IngredientCategory } from '@/api/ingredients';
import { listStock, StockItem } from '@/api/inventory';
import { createProduct, getProduct, updateProduct } from '@/api/products';
import { listRecipeLines, updateRecipeLines } from '@/api/recipes';
import { listPackagingLines, updatePackagingLines } from '@/api/productPackaging';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';
import { DEFAULT_CATEGORY_OPTIONS, DEFAULT_UNIT_OPTIONS } from '@/utils/catalogDefaults';
import PlanGate from '@/components/PlanGate.vue';
import IngredientModal from '@/components/IngredientModal.vue';
import SearchableSelect from '@/components/SearchableSelect.vue';

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

type PackagingLineDraft = {
    key: string;
    ingredientId: string;
    qtyPerUnit: number;
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
    return store.name;
});
const productNameInputRef = ref<HTMLInputElement | null>(null);
const formError = ref('');
const recipeLines = ref<RecipeLineDraft[]>([]);
const recipeLoading = ref(false);
const recipeSaving = ref(false);
const recipeError = ref('');
const recipeSuccess = ref(false);
const packagingLines = ref<PackagingLineDraft[]>([]);
const packagingLoading = ref(false);
const packagingSaving = ref(false);
const packagingError = ref('');
const packagingSuccess = ref(false);
const ingredients = ref<IngredientOption[]>([]);
const ingredientsLoading = ref(false);
const ingredientStock = ref<StockItem[]>([]);
const stockLoading = ref(false);
const stockError = ref('');
const isSaving = ref(false);
const showIngredientModal = ref(false);
const showTypeChangeModal = ref(false);
// Set while we programmatically revert form.type so the type watcher ignores it.
let typeChangeGuard = false;

const clearRecipeState = () => {
    recipeLines.value = [];
    recipeError.value = '';
    recipeSuccess.value = false;
    ingredientStock.value = [];
};

const confirmTypeChange = () => {
    showTypeChangeModal.value = false;
    clearRecipeState();
    typeChangeGuard = true;
    form.value.type = 'READY_MADE';
};

const cancelTypeChange = () => {
    // form.type was already reverted to RECIPE when the modal opened.
    showTypeChangeModal.value = false;
};

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
            return {
                key: line.key,
                ingredientId: line.ingredientId,
                name: ingredient?.name ?? 'Unknown ingredient',
                lineCost,
                isLowStock,
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
// Recipes with lines are costed from ingredients; everything else uses the cost field.
const usesRecipeCost = computed(
    () => form.value.type === 'RECIPE' && recipeSummary.value.ingredientCount > 0
);
const effectiveCost = computed(() =>
    usesRecipeCost.value ? recipeSummary.value.estimatedCost : form.value.cost
);
const marginPct = computed(() => {
    const price = form.value.price;
    if (!price || !effectiveCost.value) return null;
    return ((price - effectiveCost.value) / price) * 100;
});
const profitPerUnit = computed(() => {
    if (marginPct.value === null) return null;
    return form.value.price - (effectiveCost.value || 0);
});
const marginToneClass = computed(() => {
    if (marginPct.value === null) return 'margin-readout--empty';
    if (marginPct.value < 0) return 'margin-readout--bad';
    if (marginPct.value < 30) return 'margin-readout--warn';
    return 'margin-readout--good';
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
const isLineLowStock = (key: string) =>
    recipePreviewLines.value.find((line) => line.key === key)?.isLowStock ?? false;
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

const currencySymbol = computed(() => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(0);
        return formatted.replace(/[\d.,\s]/g, '').trim();
    } catch {
        return '$';
    }
});

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

const selectInstances = new Map<string, { open: () => void }>();
const setSelectRef = (key: string) => (el: unknown) => {
    if (el) {
        selectInstances.set(key, el as { open: () => void });
    } else {
        selectInstances.delete(key);
    }
};

const addRecipeLine = () => {
    const key = buildLineKey();
    recipeLines.value.push({
        key,
        ingredientId: '',
        qtyPerProductUnit: 1,
    });
    nextTick(() => selectInstances.get(key)?.open());
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

const ingredientOptions = (line: RecipeLineDraft) =>
    availableIngredients(line).map((ingredient) => ({
        value: ingredient.id,
        label: `${ingredient.name} (${ingredient.unit})`,
    }));

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

const packagingIngredients = computed(() =>
    ingredients.value.filter((ingredient) => ingredient.category === 'PACKAGING')
);

const canEditPackaging = computed(() => planKnown.value && canUseIngredients.value);

const packagingIngredientOptions = (line: PackagingLineDraft) => {
    const selectedIds = new Set(packagingLines.value.map((item) => item.ingredientId).filter(Boolean));
    return packagingIngredients.value
        .filter((ingredient) => ingredient.id === line.ingredientId || !selectedIds.has(ingredient.id))
        .map((ingredient) => ({
            value: ingredient.id,
            label: `${ingredient.name} (${ingredient.unit})`,
        }));
};

const packagingLineError = (line: PackagingLineDraft) => {
    if (!line.ingredientId) return 'Select a packaging item.';
    if (!Number.isFinite(line.qtyPerUnit) || line.qtyPerUnit <= 0) {
        return 'Quantity must be greater than zero.';
    }
    return '';
};

const loadPackagingLines = async () => {
    if (!storeContext.currentStoreId || !productId.value || !canEditPackaging.value) {
        packagingLines.value = [];
        return;
    }
    packagingLoading.value = true;
    packagingError.value = '';
    packagingSuccess.value = false;
    try {
        const data = await listPackagingLines(storeContext.currentStoreId, productId.value);
        packagingLines.value = data.lines.map((line) => ({
            key: line.id || buildLineKey(),
            ingredientId: line.ingredientId,
            qtyPerUnit: Number(line.qtyPerUnit),
        }));
    } catch (error) {
        packagingError.value = getErrorMessage(error) || 'Unable to load packaging lines.';
    } finally {
        packagingLoading.value = false;
    }
};

const addPackagingLine = () => {
    const key = buildLineKey();
    packagingLines.value.push({
        key,
        ingredientId: '',
        qtyPerUnit: 1,
    });
    nextTick(() => selectInstances.get(key)?.open());
};

const removePackagingLine = (index: number) => {
    packagingLines.value.splice(index, 1);
};

const savePackagingLines = async () => {
    if (!canEditPackaging.value) {
        openPlanUpgradeModal('ingredients');
        return;
    }
    if (!storeContext.currentStoreId || !productId.value) return;
    packagingError.value = '';
    packagingSuccess.value = false;

    const trimmed = packagingLines.value.map((line) => ({
        ingredientId: line.ingredientId,
        qtyPerUnit: Number(line.qtyPerUnit),
    }));

    for (const line of trimmed) {
        if (!line.ingredientId) {
            packagingError.value = 'Each line needs a packaging item.';
            return;
        }
        if (!Number.isFinite(line.qtyPerUnit) || line.qtyPerUnit <= 0) {
            packagingError.value = 'Each line needs a positive quantity.';
            return;
        }
    }

    const ingredientIds = trimmed.map((line) => line.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
        packagingError.value = 'Each packaging item can only appear once.';
        return;
    }

    packagingSaving.value = true;
    try {
        const data = await updatePackagingLines(storeContext.currentStoreId, productId.value, trimmed);
        packagingLines.value = data.lines.map((line) => ({
            key: line.id || buildLineKey(),
            ingredientId: line.ingredientId,
            qtyPerUnit: Number(line.qtyPerUnit),
        }));
        packagingSuccess.value = true;
    } catch (error) {
        packagingError.value = getErrorMessage(error) || 'Unable to save packaging lines.';
    } finally {
        packagingSaving.value = false;
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
    if (!storeContext.stores.length) {
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
    await loadPackagingLines();
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
    async (nextType, prevType) => {
        // Ignore the programmatic revert/commit we trigger ourselves.
        if (typeChangeGuard) {
            typeChangeGuard = false;
            return;
        }
        if (nextType === 'RECIPE') {
            await loadIngredients();
            await loadIngredientStock();
            await loadRecipeLines();
            return;
        }
        // Switching a recipe to ready-made discards its recipe lines, so confirm
        // first when there's something to lose (lines in the editor or a saved recipe).
        if (prevType === 'RECIPE' && (recipeLines.value.length > 0 || isEdit.value)) {
            typeChangeGuard = true;
            form.value.type = 'RECIPE'; // revert until the user confirms
            showTypeChangeModal.value = true;
            return;
        }
        clearRecipeState();
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        await loadIngredients();
        await loadIngredientStock();
        await loadRecipeLines();
        await loadPackagingLines();
    }
);
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
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.form-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
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
}

.back-link:hover { color: var(--c-accent-dark); }

.form-header h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.form-header p {
    color: var(--c-muted);
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   FORM & CARDS
============================================================ */
.product-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

.recipe-total-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

/* ============================================================
   FIELDS
============================================================ */
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

.field--narrow { max-width: 320px; }

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

.field input,
.field select {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.6rem 0.875rem;
    font-size: 0.9rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.field input::placeholder { color: #94a3b8; }

.field input:focus,
.field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ── Money inputs ── */
.money-input {
    position: relative;
}

.money-prefix {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--c-muted);
    font-size: 0.9rem;
    pointer-events: none;
}

.money-input input {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.6rem 0.875rem 0.6rem 2rem;
    font-size: 0.9rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
}

.money-input input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   TYPE CARDS
============================================================ */
.type-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
}

.type-card {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid var(--c-border);
    border-radius: 12px;
    background: var(--c-surface);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    min-width: 0;
}

.type-card:hover:not(:disabled) { border-color: #cbd5e1; }

.type-card--selected,
.type-card--selected:hover:not(:disabled) {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.05);
    box-shadow: 0 0 0 1px var(--c-accent);
}

.type-card:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.type-card-icon {
    color: var(--c-muted);
    margin-bottom: 0.25rem;
}

.type-card--selected .type-card-icon { color: var(--c-accent-dark); }

.type-card-title {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
}

.type-card-lock { color: var(--c-muted); }

.type-card-sub {
    font-size: 0.75rem;
    color: var(--c-muted);
    line-height: 1.4;
}

/* ============================================================
   MARGIN READOUT
============================================================ */
.margin-readout {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.9rem;
    border-radius: 10px;
    font-size: 0.84rem;
    line-height: 1.45;
    font-variant-numeric: tabular-nums;
}

.margin-readout--empty { background: #f1f5f9; color: var(--c-muted); }
.margin-readout--good { background: #ecfdf5; color: #047857; }
.margin-readout--warn { background: #fffbeb; color: #b45309; }
.margin-readout--bad { background: #fef2f2; color: #be123c; }

.margin-note {
    margin: -0.4rem 0 0;
    font-size: 0.78rem;
}

.margin-note--warn { color: #b45309; }
.margin-note--bad { color: #be123c; }

/* ============================================================
   ALERTS
============================================================ */
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

.form-alert--success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #15803d;
}

.recipe-editor .form-alert { margin-bottom: 0.75rem; }

/* ============================================================
   RECIPE / PACKAGING EDITOR
============================================================ */
.panel-state {
    padding: 1.5rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

.panel-state--muted {
    background: transparent;
    padding: 0.75rem 0;
    text-align: left;
    font-size: 0.82rem;
}

.recipe-empty {
    padding: 1.25rem 1rem;
    border: 1.5px dashed var(--c-border);
    border-radius: 10px;
    text-align: center;
}

.recipe-empty p {
    margin: 0;
    font-size: 0.84rem;
    color: var(--c-muted);
    line-height: 1.5;
}

.recipe-lines-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recipe-line-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 150px auto 28px;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.6rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 10px;
}

.recipe-line-row--error {
    border-color: #fca5a5;
    background: #fef7f7;
}

.recipe-line-select { min-width: 0; }

.recipe-line-qty {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.recipe-line-input {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    text-align: right;
    width: 80px;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-variant-numeric: tabular-nums;
}

.recipe-line-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.unit-badge {
    font-size: 0.72rem;
    color: var(--c-muted);
    white-space: nowrap;
}

.recipe-line-cost {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    text-align: right;
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    justify-content: flex-end;
}

.line-low-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.45rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #b45309;
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.recipe-line-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.recipe-line-remove:hover { background: #fef2f2; color: #dc2626; }

.recipe-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
}

.add-ingredient-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem 0.9rem;
    border-radius: 9px;
    border: 1.5px dashed var(--c-border);
    background: transparent;
    color: var(--c-accent-dark);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}

.add-ingredient-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.05);
}

.add-ingredient-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.recipe-hint {
    margin: 0.6rem 0 0;
    font-size: 0.78rem;
    color: var(--c-muted);
}

.ingredient-create-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    padding-top: 0.85rem;
    border-top: 1px solid #f1f5f9;
    font-size: 0.8rem;
    color: var(--c-muted);
}

.link-button {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.link-button:hover { text-decoration: underline; }

.link-sep { color: #cbd5e1; }

/* ============================================================
   AVAILABILITY
============================================================ */
.switch-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 12px;
}

.switch-copy {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.switch-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
}

.switch-sub {
    font-size: 0.78rem;
    color: var(--c-muted);
}

.switch-warn {
    font-size: 0.75rem;
    font-weight: 600;
    color: #b45309;
}

.switch {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    cursor: pointer;
}

.switch--disabled { cursor: not-allowed; opacity: 0.55; }

.switch input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: inherit;
}

.switch-track {
    display: inline-flex;
    align-items: center;
    width: 42px;
    height: 24px;
    border-radius: 999px;
    background: #cbd5e1;
    padding: 3px;
    box-sizing: border-box;
    transition: background 0.18s;
}

.switch input:checked + .switch-track { background: var(--c-accent); }

.switch input:focus-visible + .switch-track {
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
}

.switch-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    transition: transform 0.18s;
}

.switch input:checked + .switch-track .switch-thumb { transform: translateX(18px); }

/* ============================================================
   ACTIONS BAR
============================================================ */
.actions-bar {
    position: sticky;
    bottom: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.85rem 0;
    margin-top: 0.25rem;
    background: color-mix(in srgb, var(--c-bg) 90%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid var(--c-border);
}

.actions-error {
    flex: 1;
    min-width: 200px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #b91c1c;
}

.actions-buttons {
    display: flex;
    gap: 0.6rem;
    align-items: center;
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

.primary-button--sm {
    padding: 0.5rem 0.9rem;
    font-size: 0.82rem;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.58rem 1.1rem;
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
   TYPE CHANGE MODAL
============================================================ */
.type-modal-overlay {
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

.type-modal {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 420px;
    padding: 1.5rem 1.75rem;
}

.type-modal__title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.6rem;
}

.type-modal__body {
    font-size: 0.875rem;
    color: var(--c-muted);
    line-height: 1.55;
    margin: 0 0 1.25rem;
}

.type-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.type-modal__cancel {
    display: inline-flex;
    align-items: center;
    padding: 0.55rem 1rem;
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
}

.type-modal__cancel:hover { border-color: var(--c-accent); color: var(--c-accent-dark); }

.type-modal__confirm {
    display: inline-flex;
    align-items: center;
    padding: 0.55rem 1rem;
    border-radius: 9px;
    border: none;
    background: #dc2626;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
}

.type-modal__confirm:hover { background: #b91c1c; }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .product-page { padding: 1rem 0.875rem 2.5rem; }
    .product-shell { gap: 1rem; }
    .form-header h1 { font-size: 1.5rem; }

    .form-card { padding: 1.1rem; border-radius: 12px; }
    .form-grid { grid-template-columns: 1fr; }
    .type-cards { grid-template-columns: 1fr; }
    .field--narrow { max-width: none; }

    .recipe-line-row {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: auto auto;
        row-gap: 0.5rem;
    }
    .recipe-line-select { grid-column: 1; grid-row: 1; }
    .recipe-line-remove { grid-column: 2; grid-row: 1; justify-self: end; }
    .recipe-line-qty { grid-column: 1; grid-row: 2; }
    .recipe-line-cost { grid-column: 2; grid-row: 2; }

    /* The app's fixed bottom nav sits over a sticky bar on mobile,
       so let the actions flow at the end of the form instead. */
    .actions-bar {
        position: static;
        backdrop-filter: none;
        background: transparent;
    }
    .actions-buttons { width: 100%; }
    .actions-buttons .ghost-button,
    .actions-buttons .primary-button { flex: 1; justify-content: center; }
}
</style>
