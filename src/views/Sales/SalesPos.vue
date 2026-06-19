<template>
    <section class="pos-page">
        <div class="pos-shell">
            <div class="pos-content">
                <section class="pos-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span class="pos-eyebrow">Point of Sale</span>
                            <h2>Sellable catalog</h2>
                            <p>{{ currentStoreLabel }}</p>
                        </div>
                        <div class="panel-actions">
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                placeholder="Search name, SKU, category"
                            />
                            <details ref="displaySettingsRef" class="display-settings">
                                <summary>Display</summary>
                                <div class="display-panel">
                                    <div class="display-row">
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showSku" type="checkbox" />
                                            SKU
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showType" type="checkbox" />
                                            Type
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showCategory" type="checkbox" />
                                            Category
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showPrice" type="checkbox" />
                                            Price
                                        </label>
                                    </div>
                                    <label class="check-pill">
                                        <input v-model="displaySettings.groupByCategory" type="checkbox" />
                                        Group by category
                                    </label>
                                    <label class="check-pill">
                                        <input v-model="displaySettings.useCategoryColor" type="checkbox" />
                                        Color by category
                                    </label>
                                    <div v-if="displaySettings.useCategoryColor" class="color-grid">
                                        <div v-for="category in categoryList" :key="category" class="color-row">
                                            <span class="color-name">{{ category }}</span>
                                            <input v-model="displaySettings.categoryColors[category]" type="color" />
                                        </div>
                                        <div v-if="categoryList.length === 0" class="color-empty">
                                            No categories yet.
                                        </div>
                                    </div>
                                </div>
                            </details>
                            <button
                                class="ghost-button"
                                :class="{ 'ghost-button--active': isRearranging }"
                                @click="isRearranging = !isRearranging"
                            >
                                {{ isRearranging ? 'Done' : 'Rearrange' }}
                            </button>
                            <button class="ghost-button" @click="goToSalesHistory">Sales history</button>
                        </div>
                    </div>

                    <div
                        v-if="storeContext.currentStoreId && categoryList.length > 0"
                        class="category-filters"
                    >
                        <button
                            type="button"
                            class="category-pill category-pill--all"
                            :class="{ active: activeCategory === 'ALL' }"
                            @click="activeCategory = 'ALL'"
                        >
                            All
                        </button>
                        <button
                            v-for="category in categoryList"
                            :key="category"
                            type="button"
                            class="category-pill"
                            :class="{ active: activeCategory === category }"
                            :style="getCategoryPillStyle(category, activeCategory === category)"
                            @click="activeCategory = category"
                        >
                            {{ category }}
                        </button>
                    </div>

                    <div v-if="!storeContext.currentStoreId" class="panel-state">
                        Select or create a store to start selling.
                    </div>

                    <div v-else-if="isLoading" class="panel-state">Loading products...</div>

                    <template v-else>
                        <!-- Rearrange mode banner -->
                        <div v-if="isRearranging" class="rearrange-banner">
                            <span>Drag cards to reorder. Order is saved automatically.</span>
                            <div class="rearrange-banner-actions">
                                <button class="ghost-button ghost-button--sm" @click="resetOrder">Reset order</button>
                                <button class="ghost-button ghost-button--sm ghost-button--accent" @click="isRearranging = false">Done</button>
                            </div>
                        </div>

                        <!-- Grouped view -->
                        <div v-if="displaySettings.groupByCategory && !isRearranging" class="product-sections">
                            <div
                                v-for="[category, categoryProducts] in groupedFilteredProducts"
                                :key="category"
                                class="category-section"
                            >
                                <h4 class="category-section-title">{{ category }}</h4>
                                <div class="product-grid">
                                    <button
                                        v-for="product in categoryProducts"
                                        :key="product.id"
                                        type="button"
                                        class="product-card"
                                        :class="{ 'product-card--in-cart': cartQtyMap[product.id] }"
                                        :style="getCardStyle(product)"
                                        @click="addToCart(product)"
                                    >
                                        <span v-if="cartQtyMap[product.id]" class="in-cart-badge">×{{ cartQtyMap[product.id] }}</span>
                                        <div
                                            v-if="displaySettings.showType || (displaySettings.showCategory && product.category)"
                                            class="product-card-top"
                                        >
                                            <span v-if="displaySettings.showType" class="product-pill">{{ formatProductType(product.type) }}</span>
                                            <span v-if="displaySettings.showCategory && product.category" class="product-tag">
                                                {{ product.category }}
                                            </span>
                                        </div>
                                        <h3>{{ product.name }}</h3>
                                        <p v-if="displaySettings.showSku" class="product-sub">
                                            {{ product.sku ? `SKU ${product.sku}` : product.unit }}
                                        </p>
                                        <div v-if="displaySettings.showPrice" class="product-price-row">
                                            <span class="product-price">{{ formatMoney(product.price) }}</span>
                                            <span v-if="!displaySettings.showSku" class="product-unit">{{ product.unit }}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div v-if="filteredProducts.length === 0" class="panel-state">
                                No active products match your search.
                            </div>
                        </div>

                        <!-- Flat grid (default + rearrange mode) -->
                        <div v-else class="product-grid">
                            <button
                                v-for="product in filteredProducts"
                                :key="product.id"
                                type="button"
                                class="product-card"
                                :class="{
                                    'product-card--in-cart': cartQtyMap[product.id] && !isRearranging,
                                    'product-card--rearrange': isRearranging,
                                    'product-card--dragging': draggedId === product.id,
                                    'product-card--drag-over': dragOverId === product.id,
                                }"
                                :style="getCardStyle(product)"
                                :draggable="isRearranging"
                                @click="isRearranging ? undefined : addToCart(product)"
                                @dragstart="onDragStart($event, product.id)"
                                @dragover="onDragOver($event, product.id)"
                                @dragleave="onDragLeave"
                                @drop="onDrop($event, product.id)"
                                @dragend="onDragEnd"
                            >
                                <span v-if="cartQtyMap[product.id] && !isRearranging" class="in-cart-badge">×{{ cartQtyMap[product.id] }}</span>
                                <div
                                    v-if="displaySettings.showType || (displaySettings.showCategory && product.category)"
                                    class="product-card-top"
                                >
                                    <span v-if="displaySettings.showType" class="product-pill">{{ formatProductType(product.type) }}</span>
                                    <span v-if="displaySettings.showCategory && product.category" class="product-tag">
                                        {{ product.category }}
                                    </span>
                                </div>
                                <h3>{{ product.name }}</h3>
                                <p v-if="displaySettings.showSku" class="product-sub">
                                    {{ product.sku ? `SKU ${product.sku}` : product.unit }}
                                </p>
                                <div v-if="displaySettings.showPrice" class="product-price-row">
                                    <span class="product-price">{{ formatMoney(product.price) }}</span>
                                    <span v-if="!displaySettings.showSku" class="product-unit">{{ product.unit }}</span>
                                </div>
                            </button>
                            <div v-if="filteredProducts.length === 0" class="panel-state">
                                No active products match your search.
                            </div>
                        </div>
                    </template>
                </section>

                <aside class="cart-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Current ticket</h2>
                            <p v-if="cartItems.length > 0" class="cart-count-label">
                                {{ cartItems.length }} item{{ cartItems.length !== 1 ? 's' : '' }} &middot; {{ formatMoney(cartSubtotal) }}
                            </p>
                            <p v-else>Add a product to begin.</p>
                        </div>
                    </div>

                    <div v-if="cartItems.length === 0" class="cart-empty">
                        <mdicon name="cart-outline" size="28" />
                        <span>Add a product to begin a new ticket.</span>
                    </div>

                    <div v-else class="cart-list">
                        <article v-for="item in cartItems" :key="item.productId" class="cart-row" :style="getCartRowStyle(item)">
                            <div class="cart-row-top">
                                <span class="cart-item-name" :title="item.name">{{ item.name }}</span>
                                <button class="remove-btn" @click="removeItem(item.productId)" title="Remove">×</button>
                            </div>
                            <div class="cart-row-bottom">
                                <span class="cart-item-price">{{ formatMoney(item.unitPrice) }}</span>
                                <span class="cart-item-times">×</span>
                                <div class="cart-qty-stepper">
                                    <button class="qty-btn" @click="adjustQty(item.productId, -1)">−</button>
                                    <input
                                        v-model.number="item.qty"
                                        type="number"
                                        min="1"
                                        step="1"
                                        class="qty-input"
                                        @blur="sanitizeItem(item)"
                                    />
                                    <button class="qty-btn" @click="adjustQty(item.productId, 1)">+</button>
                                </div>
                                <span class="cart-item-total">{{ formatMoney(lineTotal(item)) }}</span>
                            </div>
                        </article>
                    </div>

                    <div class="cart-summary">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>{{ formatMoney(cartSubtotal) }}</span>
                        </div>
                        <div class="summary-row">
                            <label class="discount-toggle">
                                <input v-model="discountEnabled" type="checkbox" />
                                <span>Discount ({{ defaultDiscount }}%)</span>
                            </label>
                            <span :class="{ 'text-muted': !discountEnabled }">-{{ formatMoney(cartDiscount) }}</span>
                        </div>
                        <div class="summary-row net">
                            <span>Net</span>
                            <span>{{ formatMoney(cartNet) }}</span>
                        </div>
                        <div class="summary-row">
                            <span>Tax ({{ defaultTaxRate }}%)</span>
                            <span>{{ formatMoney(cartTax) }}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>{{ formatMoney(cartTotal) }}</span>
                        </div>
                    </div>

                    <div class="checkout-controls">
                        <div class="order-type-toggle" role="group" aria-label="Order type">
                            <button
                                type="button"
                                class="order-type-option"
                                :class="{ 'order-type-option--active': orderType === 'DINE_IN' }"
                                @click="orderType = 'DINE_IN'"
                            >Dine-in</button>
                            <button
                                type="button"
                                class="order-type-option"
                                :class="{ 'order-type-option--active': orderType === 'TAKEOUT' }"
                                @click="orderType = 'TAKEOUT'"
                            >Takeout</button>
                        </div>
                        <label class="select-field">
                            Payment method
                            <select v-model="paymentMethod">
                                <option v-for="method in paymentMethods" :key="method" :value="method">
                                    {{ formatPaymentMethod(method) }}
                                </option>
                            </select>
                        </label>
                        <button
                            class="primary-button"
                            :disabled="!canFinalize"
                            @click="finalizeTicket"
                        >
                            {{ isSubmitting ? 'Finalizing...' : 'Finalize sale' }}
                        </button>
                        <button class="secondary-button" :disabled="cartItems.length === 0" @click="clearCart">
                            Clear ticket
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listProducts } from '@/api/products';
import { finalizeSale } from '@/api/sales';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';

type Product = {
    id: string;
    name: string;
    type: string;
    sku?: string | null;
    price: number;
    unit: string;
    category?: string | null;
    active?: boolean;
};

type CartItem = {
    productId: string;
    name: string;
    type: string;
    unit: string;
    category?: string | null;
    unitPrice: number;
    qty: number;
};

type DisplaySettings = {
    showSku: boolean;
    showType: boolean;
    showCategory: boolean;
    showPrice: boolean;
    useCategoryColor: boolean;
    categoryColors: Record<string, string>;
    groupByCategory: boolean;
};

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const products = ref<Product[]>([]);
const cartItems = ref<CartItem[]>([]);
const searchQuery = ref('');
const activeCategory = ref('ALL');
const paymentMethod = computed({
    get: () => _paymentMethod.value,
    set: (v: string) => { _paymentMethod.value = v; },
});
const _paymentMethod = ref('CASH');
watch(() => storeContext.currentStore?.paymentMethods, (methods) => {
    if (methods?.length && !methods.includes(_paymentMethod.value)) {
        _paymentMethod.value = methods[0];
    }
}, { immediate: true });
const discountEnabled = ref(false);
const orderType = ref<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
const isLoading = ref(false);
const isSubmitting = ref(false);

const displaySettingsRef = ref<HTMLDetailsElement | null>(null);

const displaySettings = reactive<DisplaySettings>({
    showSku: false,
    showType: false,
    showCategory: false,
    showPrice: false,
    useCategoryColor: true,
    categoryColors: {} as Record<string, string>,
    groupByCategory: false,
});

const isRearranging = ref(false);
const productOrder = ref<string[]>([]);
const draggedId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);

const categoryPalette = [
    '#fef3c7',
    '#e0f2fe',
    '#dcfce7',
    '#fee2e2',
    '#f3e8ff',
    '#e2e8f0',
    '#fae8ff',
    '#cffafe',
    '#fce7f3',
    '#fff7ed',
];

const ALL_PAYMENT_METHODS = ['CASH', 'CARD', 'GCASH', 'MAYA', 'TRANSFER', 'OTHER'];
const paymentMethods = computed(() => {
    const configured = storeContext.currentStore?.paymentMethods;
    return configured?.length ? configured : ALL_PAYMENT_METHODS;
});

const loadProducts = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        products.value = [];
        return;
    }

    isLoading.value = true;
    try {
        const data = await listProducts(storeId);
        products.value = (data.products as Product[]).filter((product) => product.active);
    } finally {
        isLoading.value = false;
    }
};

const addToCart = (product: Product) => {
    const existing = cartItems.value.find((item) => item.productId === product.id);
    if (existing) {
        existing.qty += 1;
        return;
    }

    cartItems.value.push({
        productId: product.id,
        name: product.name,
        type: product.type,
        unit: product.unit,
        category: product.category,
        unitPrice: Number(product.price),
        qty: 1,
    });
};

const adjustQty = (productId: string, delta: number) => {
    const item = cartItems.value.find((entry) => entry.productId === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeItem(productId);
    }
};

const sanitizeItem = (item: CartItem) => {
    if (!Number.isFinite(item.qty) || item.qty <= 0) {
        removeItem(item.productId);
        return;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        item.unitPrice = 0;
    }
};

const removeItem = (productId: string) => {
    cartItems.value = cartItems.value.filter((item) => item.productId !== productId);
};

const clearCart = () => {
    cartItems.value = [];
    discountEnabled.value = true;
    orderType.value = 'DINE_IN';
};

const goToSalesHistory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/sales`);
};

const orderedProducts = computed(() => {
    if (productOrder.value.length === 0) return products.value;
    const orderMap = new Map(productOrder.value.map((id, i) => [id, i]));
    return [...products.value].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return ai - bi;
    });
});

const filteredProducts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return orderedProducts.value.filter((product) => {
        const matchesCategory =
            activeCategory.value === 'ALL' || product.category === activeCategory.value;
        const matchesQuery =
            !query ||
            product.name.toLowerCase().includes(query) ||
            (product.sku || '').toLowerCase().includes(query) ||
            (product.category || '').toLowerCase().includes(query)
        return matchesCategory && matchesQuery;
    });
});

const groupedFilteredProducts = computed(() => {
    const groups = new Map<string, Product[]>();
    for (const product of filteredProducts.value) {
        const key = product.category || 'Uncategorized';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(product);
    }
    return groups;
});

const categoryList = computed(() => {
    const set = new Set<string>();
    for (const product of products.value) {
        if (product.category) {
            set.add(product.category);
        }
    }
    return Array.from(set).sort();
});

const lineTotal = (item: CartItem) => {
    const qty = Number.isFinite(item.qty) ? item.qty : 0;
    const price = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
    return qty * price;
};

const cartSubtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + lineTotal(item), 0);
});

const defaultTaxRate = computed(() => storeContext.currentStore?.defaultTaxRate ?? 0);
const defaultDiscount = computed(() => storeContext.currentStore?.defaultDiscount ?? 0);

const cartDiscount = computed(() => {
    if (!discountEnabled.value) return 0;
    return (cartSubtotal.value * defaultDiscount.value) / 100;
});

const cartTotal = computed(() => {
    return cartSubtotal.value - cartDiscount.value;
});

const cartTax = computed(() => {
    return cartTotal.value > 0 ? (cartTotal.value * defaultTaxRate.value) / 100 : 0;
});

const cartNet = computed(() => {
    return cartTotal.value - cartTax.value;
});
const canFinalize = computed(() => {
    return !!storeContext.currentStoreId && cartItems.value.length > 0 && !isSubmitting.value;
});

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const cartQtyMap = computed(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems.value) {
        map[item.productId] = item.qty;
    }
    return map;
});

const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
        CASH: 'Cash',
        CARD: 'Card',
        GCASH: 'GCash',
        MAYA: 'Maya',
        TRANSFER: 'Bank transfer',
        OTHER: 'Other',
    };
    return labels[method] ?? method.replace('_', ' ');
};

const formatProductType = (type: string) => {
    if (type === 'READY_MADE') return 'Ready-made';
    if (type === 'RECIPE') return 'Recipe';
    return type;
};

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});

const getCardStyle = (product: Product) => {
    if (!displaySettings.useCategoryColor || !product.category) return undefined;
    const color = displaySettings.categoryColors[product.category];
    if (!color) return undefined;
    return {
        background: color,
        borderColor: 'rgba(148, 163, 184, 0.35)',
    };
};

const getCartRowStyle = (item: CartItem) => {
    if (!displaySettings.useCategoryColor || !item.category) return undefined;
    const color = displaySettings.categoryColors[item.category];
    if (!color) return undefined;
    return {
        background: color,
    };
};

const getCategoryPillStyle = (category: string, isActive: boolean) => {
    const color = displaySettings.categoryColors[category];
    if (!color || !color.startsWith('#')) return undefined;
    let hex = color.slice(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    if (hex.length !== 6) return undefined;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 0.7 ? 'var(--ink)' : '#ffffff';
    const alpha = isActive ? 0.28 : 0.18;
    const borderAlpha = isActive ? 0.6 : 0.4;
    return {
        '--pill-bg': `rgba(${r}, ${g}, ${b}, ${alpha})`,
        '--pill-border': `rgba(${r}, ${g}, ${b}, ${borderAlpha})`,
        '--pill-text': textColor,
    } as Record<string, string>;
};

const onDragStart = (e: DragEvent, productId: string) => {
    if (!isRearranging.value) return;
    draggedId.value = productId;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', productId);
    }
};

const onDragOver = (e: DragEvent, productId: string) => {
    if (!isRearranging.value) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (draggedId.value !== productId) dragOverId.value = productId;
};

const onDragLeave = () => {
    dragOverId.value = null;
};

const onDrop = (e: DragEvent, targetId: string) => {
    if (!isRearranging.value) return;
    e.preventDefault();
    if (!draggedId.value || draggedId.value === targetId) {
        draggedId.value = null;
        dragOverId.value = null;
        return;
    }
    const currentOrder = orderedProducts.value.map((p) => p.id);
    const fromIdx = currentOrder.indexOf(draggedId.value);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
        currentOrder.splice(fromIdx, 1);
        currentOrder.splice(toIdx, 0, draggedId.value);
        productOrder.value = currentOrder;
        saveProductOrder();
    }
    draggedId.value = null;
    dragOverId.value = null;
};

const onDragEnd = () => {
    draggedId.value = null;
    dragOverId.value = null;
};

const orderStorageKey = computed(() => {
    const storeId = storeContext.currentStoreId;
    return storeId ? `posProductOrder:${storeId}` : 'posProductOrder';
});

const saveProductOrder = () => {
    localStorage.setItem(orderStorageKey.value, JSON.stringify(productOrder.value));
};

const loadProductOrder = () => {
    const raw = localStorage.getItem(orderStorageKey.value);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) productOrder.value = parsed;
    } catch {}
};

const resetOrder = () => {
    productOrder.value = [];
    localStorage.removeItem(orderStorageKey.value);
};

const settingsStorageKey = computed(() => {
    const storeId = storeContext.currentStoreId;
    return storeId ? `posDisplaySettings:${storeId}` : 'posDisplaySettings';
});

const loadDisplaySettings = () => {
    const raw = localStorage.getItem(settingsStorageKey.value);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
        if (typeof parsed.showSku === 'boolean') displaySettings.showSku = parsed.showSku;
        if (typeof parsed.showType === 'boolean') displaySettings.showType = parsed.showType;
        if (typeof parsed.showCategory === 'boolean') displaySettings.showCategory = parsed.showCategory;
        if (typeof parsed.showPrice === 'boolean') displaySettings.showPrice = parsed.showPrice;
        if (typeof parsed.useCategoryColor === 'boolean') {
            displaySettings.useCategoryColor = parsed.useCategoryColor;
        }
        if (parsed.categoryColors && typeof parsed.categoryColors === 'object') {
            displaySettings.categoryColors = { ...parsed.categoryColors };
        }
        if (typeof parsed.groupByCategory === 'boolean') {
            displaySettings.groupByCategory = parsed.groupByCategory;
        }
    } catch (error) {
        // Ignore persisted settings errors.
    }
};

const seedCategoryColors = (categories: string[]) => {
    categories.forEach((category, index) => {
        if (!displaySettings.categoryColors[category]) {
            displaySettings.categoryColors[category] =
                categoryPalette[index % categoryPalette.length];
        }
    });
};

const finalizeTicket = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || cartItems.value.length === 0) return;
    isSubmitting.value = true;
    try {
        const taxRate = defaultTaxRate.value;
        const totalDiscount = cartDiscount.value;
        const subtotal = cartSubtotal.value;

        const payload = {
            items: cartItems.value.map((item) => {
                const itemTotal = lineTotal(item);
                const itemDiscountShare = subtotal > 0 ? (itemTotal / subtotal) * totalDiscount : 0;
                const taxableAmount = itemTotal - itemDiscountShare;
                const itemTax = taxableAmount > 0 ? (taxableAmount * taxRate) / 100 : 0;
                return {
                    productId: item.productId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    discount: itemDiscountShare,
                    tax: itemTax,
                };
            }),
            paymentMethod: paymentMethod.value,
            orderType: orderType.value,
        };
        const { sale } = await finalizeSale(storeId, payload);
        const receiptLabel = sale.receiptNumber ? `Receipt #${sale.receiptNumber}` : 'Sale finalized';
        showToast(`${receiptLabel} logged.`, 'success');
        clearCart();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to finalize sale.';
        showToast(message, 'error');
    } finally {
        isSubmitting.value = false;
    }
};

const handleDisplayClickOutside = (event: MouseEvent) => {
    if (displaySettingsRef.value?.open && !displaySettingsRef.value.contains(event.target as Node)) {
        displaySettingsRef.value.open = false;
    }
};

onBeforeUnmount(() => {
    document.removeEventListener('click', handleDisplayClickOutside);
});

onMounted(async () => {
    document.addEventListener('click', handleDisplayClickOutside);
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    loadDisplaySettings();
    loadProductOrder();
    await loadProducts();
});

watch(
    () => storeContext.currentStoreId,
    async () => {
        clearCart();
        searchQuery.value = '';
        activeCategory.value = 'ALL';
        discountEnabled.value = true;
        isRearranging.value = false;
        productOrder.value = [];
        loadDisplaySettings();
        loadProductOrder();
        await loadProducts();
    }
);

watch(
    () => categoryList.value,
    (categories) => {
        seedCategoryColors(categories);
        if (activeCategory.value !== 'ALL' && !categories.includes(activeCategory.value)) {
            activeCategory.value = 'ALL';
        }
    },
    { immediate: true }
);

watch(
    displaySettings,
    () => {
        localStorage.setItem(
            settingsStorageKey.value,
            JSON.stringify({
                showSku: displaySettings.showSku,
                showType: displaySettings.showType,
                showCategory: displaySettings.showCategory,
                useCategoryColor: displaySettings.useCategoryColor,
                categoryColors: displaySettings.categoryColors,
                groupByCategory: displaySettings.groupByCategory,
            })
        );
    },
    { deep: true }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.pos-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-accent-soft: rgba(13, 148, 136, 0.1);
    --c-border: #e2e8f0;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
    /* Kept for inline style compatibility (getCategoryPillStyle) */
    --ink: #0f172a;
    min-height: 100vh;
    padding: 1.5rem;
    background: #f8fafc;
    color: var(--c-text);
    font-family: var(--app-font-sans);
}

/* ============================================================
   SHELL
============================================================ */
.pos-shell {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: riseIn 0.35s ease-out both;
}

@keyframes riseIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   LAYOUT
============================================================ */
.pos-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 356px;
    gap: 1.25rem;
    align-items: start;
}

/* ============================================================
   PANELS
============================================================ */
.pos-panel,
.cart-panel {
    background: white;
    border-radius: 16px;
    border: 1px solid var(--c-border);
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cart-panel {
    position: sticky;
    top: 1.5rem;
    /* Cap to the viewport so the panel never grows past the screen; its inner
       item list (.cart-list) becomes the only scrollable region. */
    max-height: calc(100vh - 3rem);
    overflow: hidden;
}

/* Header, summary, and checkout stay pinned; only the item list scrolls. */
.cart-panel > .panel-header,
.cart-panel > .cart-summary,
.cart-panel > .checkout-controls,
.cart-panel > .cart-empty {
    flex-shrink: 0;
}

/* ============================================================
   PANEL HEADER
============================================================ */
.panel-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.panel-title {
    display: grid;
    gap: 0.2rem;
}

.pos-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: var(--c-accent-soft);
    color: var(--c-accent);
}

.panel-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--c-text);
}

.panel-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

.cart-count-label {
    color: var(--c-accent-dark);
    font-weight: 600;
}

/* ============================================================
   PANEL ACTIONS
============================================================ */
.panel-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.search-input {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.48rem 0.85rem;
    min-width: 200px;
    font-size: 0.85rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: white;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder {
    color: #94a3b8;
}

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* Ghost button (Sales history link) */
.ghost-button {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.46rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.ghost-button:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

/* ============================================================
   DISPLAY SETTINGS DROPDOWN
============================================================ */
.display-settings {
    position: relative;
}

.display-settings summary {
    list-style: none;
    cursor: pointer;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.46rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: white;
    transition: border-color 0.15s;
}

.display-settings summary::-webkit-details-marker {
    display: none;
}

.display-settings[open] summary {
    border-color: var(--c-accent);
}

.display-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    z-index: 30;
    min-width: 220px;
    padding: 0.85rem;
    border-radius: 12px;
    border: 1px solid var(--c-border);
    background: white;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 0.6rem;
}

.display-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.check-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-text);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}

.check-pill:has(input:checked) {
    background: var(--c-accent-soft);
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.check-pill input {
    width: 13px;
    height: 13px;
    accent-color: var(--c-accent);
}

.color-grid {
    display: grid;
    gap: 0.4rem;
    border-top: 1px solid var(--c-border);
    padding-top: 0.5rem;
}

.color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.color-name {
    font-size: 0.72rem;
    color: var(--c-muted);
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.color-row input[type='color'] {
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
}

.color-empty {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   CATEGORY FILTERS
============================================================ */
.category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.category-pill {
    border-radius: 999px;
    border: 1.5px solid var(--pill-border, var(--c-border));
    background: var(--pill-bg, white);
    color: var(--pill-text, var(--c-muted));
    padding: 0.3rem 0.8rem;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.12s;
}

.category-pill:hover {
    border-color: var(--c-accent);
}

.category-pill.active {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.category-pill--all {
    background: var(--c-accent-soft);
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.category-pill--all.active {
    background: var(--c-accent);
    border-color: var(--c-accent);
    color: white;
}

/* ============================================================
   PANEL STATE (empty / loading)
============================================================ */
.panel-state {
    padding: 1.5rem 1rem;
    text-align: center;
    color: var(--c-muted);
    background: #f8fafc;
    border-radius: 10px;
    font-size: 0.875rem;
    border: 1px dashed var(--c-border);
}

/* ============================================================
   CART EMPTY STATE
============================================================ */
.cart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 2rem 1rem;
    border-radius: 10px;
    border: 1.5px dashed var(--c-border);
    background: #f8fafc;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

/* ============================================================
   PRODUCT GRID & CARDS
============================================================ */
.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 0.7rem;
}

.product-card {
    position: relative;
    border: 1.5px solid var(--c-border);
    border-radius: 12px;
    padding: 0.85rem 0.9rem;
    text-align: left;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    overflow: hidden;
    min-height: 56px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    cursor: pointer;
}

.product-card--in-cart {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.03);
}

.in-cart-badge {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    background: var(--c-accent);
    color: white;
    border-radius: 999px;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.1rem 0.38rem;
    line-height: 1.4;
    letter-spacing: 0.02em;
    pointer-events: none;
}

.product-card:hover {
    border-color: var(--c-accent);
    box-shadow: 0 4px 16px rgba(13, 148, 136, 0.12);
    transform: translateY(-1px);
}

.product-card:active {
    transform: scale(0.98);
    box-shadow: none;
}

.product-card-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    min-height: 18px;
    overflow: hidden;
}

.product-pill {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-accent);
    background: var(--c-accent-soft);
    padding: 0.18rem 0.45rem;
    border-radius: 999px;
    flex-shrink: 0;
}

.product-tag {
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.18rem 0.45rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    flex-shrink: 0;
}

.product-card h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.product-sub {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.7rem;
}

.product-price-row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    margin-top: auto;
    padding-top: 0.25rem;
}

.product-price {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--c-text);
}

.product-unit {
    font-size: 0.68rem;
    color: var(--c-muted);
}

/* ============================================================
   CART LIST
============================================================ */
.cart-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    /* Take the leftover vertical space and scroll within it. min-height: 0 is
       required so this flex child is allowed to shrink below its content size. */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* Breathing room so rows don't sit under the scrollbar. */
    margin-right: -0.25rem;
    padding-right: 0.25rem;
}

.cart-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.6rem 0.5rem;
    border-radius: 8px;
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.cart-row:last-child {
    border-bottom: none;
}

.cart-row:hover {
    background: #f8fafc;
}

.cart-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
}

.cart-item-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cart-row-bottom {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.cart-item-price {
    font-size: 0.78rem;
    color: var(--c-muted);
    white-space: nowrap;
}

.cart-item-times {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.cart-qty-stepper {
    display: flex;
    align-items: center;
    gap: 0.2rem;
}

.qty-btn {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: white;
    font-weight: 700;
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--c-text);
    transition: border-color 0.12s, background 0.12s, color 0.12s;
}

.qty-btn:hover {
    border-color: var(--c-accent);
    background: var(--c-accent-soft);
    color: var(--c-accent-dark);
}

.qty-input {
    width: 30px;
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.1rem;
    text-align: center;
    font-size: 0.72rem;
    font-family: var(--app-font-sans);
    background: white;
    color: var(--c-text);
}

.qty-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

.cart-item-total {
    margin-left: auto;
    font-size: 0.875rem;
    font-weight: 700;
    white-space: nowrap;
    color: var(--c-text);
}

.remove-btn {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
    transition: background 0.12s;
}

.remove-btn:hover {
    background: #fecaca;
}

/* ============================================================
   CART SUMMARY
============================================================ */
.cart-summary {
    border-top: 1px solid var(--c-border);
    padding-top: 0.85rem;
    display: grid;
    gap: 0.55rem;
}

.cart-summary .summary-row:first-child {
    color: var(--c-muted);
    font-size: 0.875rem;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: var(--c-muted);
}

.summary-row.net {
    font-weight: 600;
    color: var(--c-accent-dark);
}

.summary-row.total {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--c-text);
    padding-top: 0.5rem;
    margin-top: 0.1rem;
    border-top: 1px solid var(--c-border);
}

.discount-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--c-muted);
}

.discount-toggle input {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--c-accent);
}

.text-muted {
    color: var(--c-muted);
    opacity: 0.5;
}

/* ============================================================
   CHECKOUT CONTROLS
============================================================ */
.checkout-controls {
    display: grid;
    gap: 0.6rem;
    padding-top: 0.25rem;
}

.order-type-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
    padding: 0.25rem;
    background: var(--c-border);
    border-radius: 10px;
}

.order-type-option {
    border: none;
    border-radius: 8px;
    padding: 0.55rem 0.5rem;
    background: transparent;
    color: var(--c-text);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.order-type-option--active {
    background: white;
    color: var(--c-accent);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.select-field {
    display: grid;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.select-field select {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.6rem 0.85rem;
    background: white;
    font-size: 0.875rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    transition: border-color 0.15s;
}

.select-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* Finalize sale — primary action */
.primary-button {
    border: none;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--app-font-sans);
    background: var(--c-accent);
    color: white;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
}

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
}

.primary-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

/* Clear ticket — secondary action */
.secondary-button {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    width: 100%;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.secondary-button:hover:not(:disabled) {
    border-color: #f87171;
    color: #b91c1c;
    background: #fef2f2;
}

.secondary-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ============================================================
   REARRANGE
============================================================ */
.rearrange-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.6rem 0.9rem;
    background: rgba(13, 148, 136, 0.07);
    border: 1px solid rgba(13, 148, 136, 0.25);
    border-radius: 10px;
    font-size: 0.8rem;
    color: var(--c-accent-dark);
    font-weight: 500;
}

.rearrange-banner-actions {
    display: flex;
    gap: 0.4rem;
}

.ghost-button--sm {
    padding: 0.28rem 0.7rem;
    font-size: 0.75rem;
}

.ghost-button--active {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

.ghost-button--accent {
    border-color: var(--c-accent);
    color: white;
    background: var(--c-accent);
}

.ghost-button--accent:hover {
    background: var(--c-accent-dark);
    border-color: var(--c-accent-dark);
    color: white;
}

.product-card--rearrange {
    cursor: grab;
    user-select: none;
}

.product-card--rearrange:hover {
    border-color: var(--c-accent);
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.12);
    transform: none;
}

.product-card--dragging {
    opacity: 0.35;
    cursor: grabbing;
}

.product-card--drag-over {
    border-color: var(--c-accent) !important;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2) !important;
    transform: scale(1.03);
}

/* ============================================================
   GROUPED VIEW
============================================================ */
.product-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.category-section {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.category-section-title {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-muted);
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--c-border);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .pos-content {
        grid-template-columns: 1fr;
    }

    .cart-panel {
        position: static;
        /* Stacked layout: let the whole page scroll instead of trapping the
           cart list in its own scroll region. */
        max-height: none;
        overflow: visible;
    }

    .cart-list {
        overflow-y: visible;
        flex: none;
        min-height: 0;
        margin-right: 0;
        padding-right: 0;
    }
}

@media (max-width: 720px) {
    .pos-page {
        padding: 1rem;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .panel-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .panel-actions {
        width: 100%;
    }

    .search-input {
        flex: 1;
        min-width: 0;
    }
}
</style>