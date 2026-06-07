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
                                    </div>
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

                    <div v-else class="product-grid">
                        <button
                            v-for="product in filteredProducts"
                            :key="product.id"
                            type="button"
                            class="product-card"
                            :class="{ 'product-card--in-cart': cartQtyMap[product.id] }"
                            :style="getCardStyle(product)"
                            @click="addToCart(product)"
                        >
                            <span v-if="cartQtyMap[product.id]" class="in-cart-badge">×{{ cartQtyMap[product.id] }}</span>
                            <div class="product-card-top">
                                <span v-if="displaySettings.showType" class="product-pill">{{ formatProductType(product.type) }}</span>
                                <span
                                    v-if="displaySettings.showCategory && product.category"
                                    class="product-tag"
                                >
                                    {{ product.category }}
                                </span>
                            </div>
                            <h3>{{ product.name }}</h3>
                            <p v-if="displaySettings.showSku" class="product-sub">
                                {{ product.sku ? `SKU ${product.sku}` : product.unit }}
                            </p>
                            <div class="product-price-row">
                                <span class="product-price">{{ formatMoney(product.price) }}</span>
                                <span v-if="!displaySettings.showSku" class="product-unit">
                                    {{ product.unit }}
                                </span>
                            </div>
                        </button>
                        <div v-if="filteredProducts.length === 0" class="panel-state">
                            No active products match your search.
                        </div>
                    </div>
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
    useCategoryColor: boolean;
    categoryColors: Record<string, string>;
};

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const products = ref<Product[]>([]);
const cartItems = ref<CartItem[]>([]);
const searchQuery = ref('');
const activeCategory = ref('ALL');
const paymentMethod = ref('CASH');
const discountEnabled = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);

const displaySettingsRef = ref<HTMLDetailsElement | null>(null);

const displaySettings = reactive<DisplaySettings>({
    showSku: false,
    showType: false,
    showCategory: true,
    useCategoryColor: true,
    categoryColors: {} as Record<string, string>,
});

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

const paymentMethods = ['CASH', 'CARD', 'GCASH', 'MAYA', 'TRANSFER', 'OTHER'];

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
};

const goToSalesHistory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/sales`);
};

const filteredProducts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    return products.value.filter((product) => {
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
        if (typeof parsed.useCategoryColor === 'boolean') {
            displaySettings.useCategoryColor = parsed.useCategoryColor;
        }
        if (parsed.categoryColors && typeof parsed.categoryColors === 'object') {
            displaySettings.categoryColors = { ...parsed.categoryColors };
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
    await loadProducts();
});

watch(
    () => storeContext.currentStoreId,
    async () => {
        clearCart();
        searchQuery.value = '';
        activeCategory.value = 'ALL';
        discountEnabled.value = true;
        loadDisplaySettings();
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
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .pos-content {
        grid-template-columns: 1fr;
    }

    .cart-panel {
        position: static;
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