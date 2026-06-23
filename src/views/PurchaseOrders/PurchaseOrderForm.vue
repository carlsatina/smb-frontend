<template>
    <section class="po-form-page">
        <div class="po-form-shell">
            <header class="po-form-header">
                <div class="po-form-title">
                    <span class="po-form-eyebrow">Purchasing</span>
                    <h1>New purchase order</h1>
                    <p>Select a supplier, add line items, and set an expected delivery date for {{ currentStoreLabel }}.</p>
                </div>
                <div class="po-form-actions">
                    <button type="button" class="ghost-button" @click="goBack">Back to orders</button>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Purchase orders are available on Standard."
                description="Upgrade to Standard to create purchase orders and receive inventory."
            />

            <div v-else class="po-form-content">
                <form class="po-form" @submit.prevent="createOrder">
                    <!-- ALERTS -->
                    <div v-if="formError" class="form-alert form-alert--error">{{ formError }}</div>

                    <!-- SUPPLIER SECTION -->
                    <div class="form-section">
                        <div class="section-title">
                            <h2>Supplier</h2>
                            <p>Who are you ordering from?</p>
                        </div>
                        <div class="form-grid two-col">
                            <label class="field">
                                Supplier
                                <div class="supplier-row">
                                    <SearchableSelect
                                        v-model="supplierSelection"
                                        :options="supplierOptions"
                                        :disabled="!canWrite"
                                        placeholder="No supplier"
                                        search-placeholder="Search suppliers…"
                                    />
                                    <button
                                        type="button"
                                        class="ghost-button"
                                        :disabled="!canWrite"
                                        @click="toggleSupplierForm"
                                    >
                                        {{ showSupplierForm ? 'Cancel' : '+ New supplier' }}
                                    </button>
                                </div>
                            </label>
                            <label v-if="supplierSelection === 'CUSTOM'" class="field">
                                Supplier name
                                <input
                                    v-model="formState.supplierName"
                                    type="text"
                                    placeholder="Fresh Supplier Co"
                                    :disabled="!canWrite"
                                />
                            </label>
                            <label class="field">
                                Expected delivery date
                                <input v-model="formState.expectedDate" type="date" :disabled="!canWrite" />
                            </label>
                        </div>

                        <!-- Inline new supplier form -->
                        <div v-if="showSupplierForm" class="supplier-inline-form">
                            <div class="supplier-inline-title">New supplier</div>
                            <div class="form-grid three-col">
                                <label class="field">
                                    Name <span class="required">*</span>
                                    <input v-model="supplierForm.name" type="text" placeholder="Supplier name" />
                                </label>
                                <label class="field">
                                    Email
                                    <input v-model="supplierForm.email" type="email" placeholder="ops@supplier.com" />
                                </label>
                                <label class="field">
                                    Phone
                                    <input v-model="supplierForm.phone" type="tel" placeholder="+1 555 000 0000" />
                                </label>
                            </div>
                            <div class="supplier-inline-actions">
                                <span v-if="supplierFormError" class="form-error">{{ supplierFormError }}</span>
                                <button
                                    type="button"
                                    class="primary-button primary-button--sm"
                                    :disabled="isCreatingSupplier"
                                    @click="createSupplierFromForm"
                                >
                                    {{ isCreatingSupplier ? 'Saving...' : 'Save supplier' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- LINE ITEMS SECTION -->
                    <div class="form-section">
                        <div class="section-title-row">
                            <div class="section-title">
                                <h2>Line items</h2>
                                <p>Add products or ingredients to this order.</p>
                            </div>
                            <button
                                type="button"
                                class="ghost-button"
                                :disabled="!canWrite"
                                @click="addLine"
                            >
                                + Add item
                            </button>
                        </div>

                        <div v-if="!canWrite" class="panel-state">You have view-only access.</div>
                        <div v-else-if="lineItems.length === 0" class="panel-state">
                            No items yet. Click <strong>+ Add item</strong> to begin.
                        </div>
                        <div v-else class="line-items-table-wrap">
                            <table class="line-items-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Item</th>
                                        <th class="align-right">Qty ordered</th>
                                        <th class="align-right">Cost / unit</th>
                                        <th class="align-right">Line total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(line, index) in lineItems"
                                        :key="line.key"
                                        :class="{ 'row-incomplete': !line.itemType || !line.itemId }"
                                    >
                                        <td>
                                            <select
                                                v-model="line.itemType"
                                                class="line-select"
                                                :disabled="!canWrite"
                                                @change="resetLineItem(line)"
                                            >
                                                <option value="" disabled>Type</option>
                                                <option value="PRODUCT">Product</option>
                                                <option value="INGREDIENT">Ingredient</option>
                                            </select>
                                        </td>
                                        <td>
                                            <SearchableSelect
                                                :ref="(el) => setItemRef(el, index)"
                                                :model-value="line.itemId"
                                                :options="lineItemOptions(line)"
                                                :disabled="!line.itemType || !canWrite"
                                                :placeholder="line.itemType ? 'Select item' : '—'"
                                                search-placeholder="Search items…"
                                                @update:model-value="(val) => onLineItemSelected(line, index, val)"
                                            />
                                        </td>
                                        <td class="td-qty">
                                            <div class="line-unit-wrap">
                                                <input
                                                    :ref="(el) => setQtyRef(el, index)"
                                                    v-model.number="line.qtyOrdered"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    class="line-input line-input--num"
                                                    :disabled="!canWrite"
                                                />
                                                <span v-if="line.purchaseUnit" class="line-unit-tag">{{ line.purchaseUnit }}</span>
                                            </div>
                                            <div v-if="line.purchaseUnit && line.qtyOrdered > 0" class="line-conversion-hint">
                                                = {{ formatQty(lineBaseQty(line)) }} {{ ingredientBaseUnit(line) }}
                                            </div>
                                        </td>
                                        <td class="td-cost">
                                            <div class="line-unit-wrap">
                                                <input
                                                    v-model.number="line.unitCost"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    class="line-input line-input--num"
                                                    :disabled="!canWrite"
                                                />
                                            </div>
                                            <div v-if="line.purchaseUnit" class="line-conversion-hint">per {{ line.purchaseUnit }}</div>
                                        </td>
                                        <td class="line-total">
                                            {{ formatMoney(lineTotal(line)) }}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                class="remove-btn"
                                                :disabled="!canWrite"
                                                @click="removeLine(index)"
                                                title="Remove line"
                                            >&times;</button>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="6">
                                            <button
                                                type="button"
                                                class="line-add-row-button"
                                                :disabled="!canWrite"
                                                @click="addLine"
                                            >
                                                + Add item
                                            </button>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <!-- Order total summary -->
                        <div v-if="lineItems.length > 0" class="order-summary">
                            <div class="order-summary-row">
                                <span>{{ lineItems.length }} item{{ lineItems.length !== 1 ? 's' : '' }}</span>
                                <div class="order-total">
                                    <span class="order-total-label">Order total</span>
                                    <span class="order-total-value">{{ formatMoney(orderTotal) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- FORM ACTIONS -->
                    <div class="form-actions">
                        <button type="button" class="ghost-button" @click="goBack">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="isCreateDisabled">
                            {{ isSubmitting ? 'Creating...' : 'Create purchase order' }}
                        </button>
                    </div>
                </form>

                <!-- ASIDE: tips + supplier quick view -->
                <aside class="po-form-aside">
                    <div class="aside-card">
                        <h3>Order checklist</h3>
                        <ul class="checklist">
                            <li :class="{ done: supplierSelection || formState.supplierName }">
                                <span class="check-icon">{{ (supplierSelection || formState.supplierName) ? '✓' : '○' }}</span>
                                Supplier selected
                            </li>
                            <li :class="{ done: formState.expectedDate }">
                                <span class="check-icon">{{ formState.expectedDate ? '✓' : '○' }}</span>
                                Expected date set
                            </li>
                            <li :class="{ done: lineItems.length > 0 }">
                                <span class="check-icon">{{ lineItems.length > 0 ? '✓' : '○' }}</span>
                                At least one item
                            </li>
                            <li :class="{ done: lineItems.length > 0 && !hasIncompleteLines }">
                                <span class="check-icon">{{ (lineItems.length > 0 && !hasIncompleteLines) ? '✓' : '○' }}</span>
                                All lines complete
                            </li>
                        </ul>
                    </div>
                    <div class="aside-card">
                        <h3>Supplier list</h3>
                        <div v-if="suppliers.length === 0" class="aside-empty">No suppliers yet.</div>
                        <ul v-else class="supplier-list">
                            <li v-for="s in suppliers.slice(0, 5)" :key="s.id">
                                <span class="supplier-dot"></span>
                                {{ s.name }}
                            </li>
                            <li v-if="suppliers.length > 5" class="supplier-more">
                                +{{ suppliers.length - 5 }} more
                            </li>
                        </ul>
                        <button type="button" class="aside-link" @click="goToSuppliers">
                            Manage suppliers →
                        </button>
                    </div>
                    <div class="aside-card aside-card--teal">
                        <h3>Tip</h3>
                        <p>Unit costs auto-fill from product/ingredient records. You can override them here per order.</p>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listIngredients, IngredientResponse } from '@/api/ingredients';
import { listProducts, ProductResponse } from '@/api/products';
import { createPurchaseOrder, PurchaseOrderItemInput } from '@/api/purchaseOrders';
import { createSupplier, listSuppliers, Supplier } from '@/api/suppliers';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import PlanGate from '@/components/PlanGate.vue';
import SearchableSelect from '@/components/SearchableSelect.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const products = ref<ProductResponse[]>([]);
const ingredients = ref<IngredientResponse[]>([]);
const suppliers = ref<Supplier[]>([]);
const isSubmitting = ref(false);
const isCreatingSupplier = ref(false);
const formError = ref('');
const supplierFormError = ref('');
const showSupplierForm = ref(false);
const supplierSelection = ref('');

// Default the expected delivery date to today (local).
const todayStr = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

const formState = reactive({ supplierName: '', expectedDate: todayStr() });
const supplierForm = reactive({ name: '', email: '', phone: '' });

const lineItems = ref<Array<{
    key: string;
    itemType: '' | 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    qtyOrdered: number;
    unitCost: number;
    purchaseUnit: string;
    purchaseUnitSize: number;
}>>([]);

const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrdersWrite'));
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () => !ownerSubscriptionActive.value || (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});

// Options for the searchable supplier dropdown (keeps the "No supplier" and
// "Custom entry" choices, then the store's suppliers).
const supplierOptions = computed(() => [
    { value: '', label: 'No supplier' },
    { value: 'CUSTOM', label: 'Custom entry' },
    ...suppliers.value.map((s) => ({ value: s.id, label: s.name })),
]);

const hasIncompleteLines = computed(() =>
    lineItems.value.some((l) => !l.itemType || !l.itemId || l.qtyOrdered <= 0)
);

const orderTotal = computed(() =>
    lineItems.value.reduce((sum, l) => {
        const qty = Number.isFinite(l.qtyOrdered) ? l.qtyOrdered : 0;
        const cost = Number.isFinite(l.unitCost) ? l.unitCost : 0;
        return sum + qty * cost;
    }, 0)
);

const isCreateDisabled = computed(() => {
    if (!storeContext.currentStoreId || !canWrite.value || isSubmitting.value) return true;
    if (lineItems.value.length === 0) return true;
    if (supplierSelection.value === 'CUSTOM' && !formState.supplierName.trim()) return true;
    return hasIncompleteLines.value;
});

// Refs to each line's item dropdown so a new line can open it for searching.
type ItemSelectInstance = { open: () => void };
const itemSelectRefs = ref<ItemSelectInstance[]>([]);
const setItemRef = (el: unknown, index: number) => {
    if (el) itemSelectRefs.value[index] = el as ItemSelectInstance;
};

const addLine = () => {
    if (!canWrite.value) return;
    lineItems.value.push({ key: `${Date.now()}-${Math.random()}`, itemType: 'INGREDIENT', itemId: '', qtyOrdered: 1, unitCost: 0, purchaseUnit: '', purchaseUnitSize: 1 });
    // Open the new line's item dropdown so the user can search immediately.
    const newIndex = lineItems.value.length - 1;
    nextTick(() => itemSelectRefs.value[newIndex]?.open());
};

const removeLine = (index: number) => { lineItems.value.splice(index, 1); };

// Refs to each line's qty input so we can jump focus there after item selection.
const qtyRefs = ref<HTMLInputElement[]>([]);
const setQtyRef = (el: unknown, index: number) => {
    if (el) qtyRefs.value[index] = el as HTMLInputElement;
};

// Options for a line's searchable item dropdown — excludes items already chosen
// on other lines so the same item can't be added twice.
const lineItemOptions = (line: { itemType: '' | 'PRODUCT' | 'INGREDIENT'; itemId: string; key: string }) =>
    availableItems(line.itemType)
        .filter((item) => !isItemSelected(line.itemType, item.id, line.key))
        .map((item) => ({ value: item.id, label: item.name }));

const onLineItemSelected = (
    line: { itemType: '' | 'PRODUCT' | 'INGREDIENT'; itemId: string; unitCost: number; purchaseUnit: string; purchaseUnitSize: number },
    index: number,
    value: string
) => {
    line.itemId = value;
    syncLineCost(line);
    // Move focus to this line's "Qty ordered" field once it has rendered.
    nextTick(() => qtyRefs.value[index]?.focus());
};

const resetLineItem = (line: { itemId: string; unitCost: number; purchaseUnit: string; purchaseUnitSize: number }) => {
    line.itemId = '';
    line.unitCost = 0;
    line.purchaseUnit = '';
    line.purchaseUnitSize = 1;
};

const syncLineCost = (line: { itemType: '' | 'PRODUCT' | 'INGREDIENT'; itemId: string; unitCost: number; purchaseUnit: string; purchaseUnitSize: number }) => {
    if (!line.itemType || !line.itemId) return;
    if (line.itemType === 'PRODUCT') {
        const p = products.value.find((e) => e.id === line.itemId);
        if (p && !line.unitCost && p.cost) line.unitCost = Number(p.cost);
        line.purchaseUnit = '';
        line.purchaseUnitSize = 1;
    } else {
        const i = ingredients.value.find((e) => e.id === line.itemId);
        if (i) {
            const hasPurchaseUnit = i.purchaseUnit && i.purchaseUnitSize && Number(i.purchaseUnitSize) > 0;
            if (hasPurchaseUnit) {
                line.purchaseUnit = i.purchaseUnit!;
                line.purchaseUnitSize = Number(i.purchaseUnitSize);
                if (!line.unitCost) line.unitCost = Number(i.costPerUnit) * Number(i.purchaseUnitSize);
            } else {
                line.purchaseUnit = '';
                line.purchaseUnitSize = 1;
                if (!line.unitCost && i.costPerUnit) line.unitCost = Number(i.costPerUnit);
            }
        }
    }
};

const lineBaseQty = (line: { qtyOrdered: number; purchaseUnitSize: number }) => {
    const qty = Number.isFinite(line.qtyOrdered) ? line.qtyOrdered : 0;
    return qty * line.purchaseUnitSize;
};

const lineTotal = (line: { qtyOrdered: number; unitCost: number }) => {
    const qty = Number.isFinite(line.qtyOrdered) ? line.qtyOrdered : 0;
    const cost = Number.isFinite(line.unitCost) ? line.unitCost : 0;
    return qty * cost;
};

const isItemSelected = (itemType: '' | 'PRODUCT' | 'INGREDIENT', itemId: string, currentKey: string) => {
    if (!itemId || !itemType) return false;
    return lineItems.value.some((l) => l.key !== currentKey && l.itemType === itemType && l.itemId === itemId);
};

const availableItems = (itemType: '' | 'PRODUCT' | 'INGREDIENT') => {
    if (itemType === 'PRODUCT') return products.value;
    if (itemType === 'INGREDIENT') return ingredients.value;
    return [];
};

const ingredientBaseUnit = (line: { itemType: '' | 'PRODUCT' | 'INGREDIENT'; itemId: string }) => {
    if (line.itemType !== 'INGREDIENT') return '';
    return ingredients.value.find((i) => i.id === line.itemId)?.unit || '';
};

const formatQty = (value: number) =>
    Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value) : '0';

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0); }
    catch { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0); }
};

const toggleSupplierForm = () => {
    showSupplierForm.value = !showSupplierForm.value;
    supplierFormError.value = '';
    if (!showSupplierForm.value) { supplierForm.name = ''; supplierForm.email = ''; supplierForm.phone = ''; }
};

const createSupplierFromForm = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !canWrite.value) return;
    const name = supplierForm.name.trim();
    if (!name) { supplierFormError.value = 'Supplier name is required.'; return; }
    isCreatingSupplier.value = true;
    supplierFormError.value = '';
    try {
        const data = await createSupplier(storeId, {
            name,
            email: supplierForm.email.trim() || null,
            phone: supplierForm.phone.trim() || null,
        });
        await loadSuppliers();
        supplierSelection.value = data.supplier.id;
        showSupplierForm.value = false;
        supplierForm.name = ''; supplierForm.email = ''; supplierForm.phone = '';
        showToast('Supplier added.', 'success');
    } catch (error: any) {
        supplierFormError.value = error?.body?.error?.message || 'Unable to save supplier.';
    } finally {
        isCreatingSupplier.value = false;
    }
};

const createOrder = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !canWrite.value || lineItems.value.length === 0) return;
    formError.value = '';
    isSubmitting.value = true;
    try {
        const payload: {
            supplierId?: string;
            supplierName?: string;
            expectedDate?: string;
            items: PurchaseOrderItemInput[];
        } = {
            expectedDate: formState.expectedDate || undefined,
            // Lines are guaranteed complete here (guarded by hasIncompleteLines),
            // so itemType is always 'PRODUCT' | 'INGREDIENT', never ''.
            items: lineItems.value.map((l) => ({
                itemType: l.itemType as Exclude<typeof l.itemType, ''>,
                itemId: l.itemId,
                qtyOrdered: l.purchaseUnit ? l.qtyOrdered * l.purchaseUnitSize : l.qtyOrdered,
                unitCost: l.purchaseUnit && l.purchaseUnitSize > 0 ? l.unitCost / l.purchaseUnitSize : l.unitCost,
            })),
        };
        if (supplierSelection.value === 'CUSTOM') {
            if (formState.supplierName.trim()) payload.supplierName = formState.supplierName.trim();
        } else if (supplierSelection.value) {
            payload.supplierId = supplierSelection.value;
        }
        const data = await createPurchaseOrder(storeId, payload);
        showToast('Purchase order created.', 'success');
        if (data.purchaseOrder?.id) {
            router.push(`/stores/${storeId}/purchase-orders/${data.purchaseOrder.id}`);
        } else {
            router.push(`/stores/${storeId}/purchase-orders`);
        }
    } catch (error: any) {
        formError.value = error?.body?.error?.message || 'Unable to create purchase order.';
    } finally {
        isSubmitting.value = false;
    }
};

const loadProducts = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const data = await listProducts(storeId);
    products.value = (data.products || []).filter((p) => p.type === 'READY_MADE');
};

const loadIngredients = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const data = await listIngredients(storeId);
    ingredients.value = (data.ingredients || []).filter((i) => i.active !== false);
};

const loadSuppliers = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const data = await listSuppliers(storeId);
    suppliers.value = data.suppliers;
};

const goBack = () => {
    const storeId = storeContext.currentStoreId;
    if (storeId) router.push(`/stores/${storeId}/purchase-orders`);
};

const goToSuppliers = () => {
    const storeId = storeContext.currentStoreId;
    if (storeId) router.push(`/stores/${storeId}/suppliers`);
};

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) storeContext.setCurrentStore(routeStoreId);
    if (!isPlanLocked.value) await Promise.all([loadProducts(), loadIngredients(), loadSuppliers()]);
});

watch(() => supplierSelection.value, (v) => { if (v !== 'CUSTOM') formState.supplierName = ''; });
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.po-form-page {
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

.po-form-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* HEADER */
.po-form-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.po-form-eyebrow {
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

.po-form-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
}

.po-form-title p {
    color: var(--c-muted);
    font-size: 0.92rem;
    margin: 0;
    line-height: 1.55;
}

.po-form-actions {
    flex-shrink: 0;
}

/* LAYOUT */
.po-form-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1.5rem;
    align-items: start;
}

/* MAIN FORM */
.po-form {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.form-alert {
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.84rem;
    font-weight: 500;
    margin-bottom: 1.25rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
}

.form-alert--error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }

/* SECTIONS */
.form-section {
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--c-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

.section-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

/* GRID */
.form-grid { display: grid; gap: 1rem; }
.form-grid.two-col { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.form-grid.three-col { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }

/* FIELDS */
.field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.required { color: #ef4444; }

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

.field input:focus,
.field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.field input:disabled,
.field select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f8fafc;
}

.supplier-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.6rem;
    align-items: center;
}

/* SUPPLIER INLINE FORM */
.supplier-inline-form {
    padding: 1rem 1.25rem;
    border-radius: 10px;
    border: 1.5px dashed rgba(13, 148, 136, 0.3);
    background: rgba(13, 148, 136, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.supplier-inline-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--c-accent-dark);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.supplier-inline-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
}

.form-error { font-size: 0.8rem; color: #b91c1c; font-weight: 600; }

/* PANEL STATE */
.panel-state {
    padding: 1.5rem;
    border-radius: 8px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

/* LINE ITEMS TABLE */
.line-items-table-wrap {
    border-radius: 10px;
    border: 1px solid var(--c-border);
    overflow: hidden;
    overflow-x: auto;
}

.line-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.line-items-table thead th {
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

.line-items-table thead th.align-right { text-align: right; }
.line-items-table thead th:last-child { width: 36px; }

.line-items-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.1s;
}

.line-items-table tbody tr:last-child { border-bottom: none; }
.line-items-table tbody tr:hover { background: #f8fafc; }
.line-items-table tbody tr.row-incomplete { background: #fffbeb; }

.line-items-table tbody td {
    padding: 0.65rem 0.9rem;
    vertical-align: middle;
}

.line-items-table tfoot td {
    padding: 0.7rem 0.9rem;
    background: #f8fafc;
    border-top: 1.5px solid var(--c-border);
}

.line-add-row-button {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.4rem;
    border: 1.5px dashed var(--c-border);
    border-radius: 7px;
    background: var(--c-surface);
    color: var(--c-accent-dark);
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.line-add-row-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.05);
}

.line-add-row-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.line-select {
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    min-width: 90px;
    transition: border-color 0.15s;
}

.line-select--wide { min-width: 160px; }

.line-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

.line-select:disabled { opacity: 0.5; cursor: not-allowed; }

.line-input {
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
    display: block;
    margin-left: auto;
}

.line-input--num {
    width: 90px;
    text-align: right;
}

.line-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

.line-input:disabled { opacity: 0.5; cursor: not-allowed; }

.line-total {
    font-weight: 700;
    text-align: right;
    color: var(--c-text);
    white-space: nowrap;
}

.remove-btn {
    background: none;
    border: none;
    font-size: 1rem;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem 0.35rem;
    border-radius: 4px;
    line-height: 1;
    transition: all 0.15s;
}

.remove-btn:hover:not(:disabled) { color: #ef4444; background: #fef2f2; }
.remove-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* PURCHASE UNIT INPUTS */
.td-qty,
.td-cost {
    vertical-align: top;
    padding-top: 0.55rem;
}

.line-unit-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.line-unit-tag {
    font-size: 0.72rem;
    font-weight: 600;
    color: #0f766e;
    background: rgba(13, 148, 136, 0.08);
    border: 1px solid rgba(13, 148, 136, 0.2);
    border-radius: 4px;
    padding: 0.18rem 0.45rem;
    white-space: nowrap;
    flex-shrink: 0;
}

.line-conversion-hint {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    color: #94a3b8;
    white-space: nowrap;
    text-align: right;
}

/* ORDER SUMMARY */
.order-summary {
    padding: 0.85rem 1rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 8px;
}

.order-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--c-muted);
}

.order-total {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.order-total-label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.order-total-value {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--c-text);
    letter-spacing: -0.02em;
}

/* FORM ACTIONS */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1.5rem;
    margin-top: 0.25rem;
    border-top: 1px solid var(--c-border);
}

/* BUTTONS */
.primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.65rem 1.5rem;
    border-radius: 8px;
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

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.primary-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.primary-button--sm {
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
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

.ghost-button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ASIDE */
.po-form-aside {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.aside-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
}

.aside-card h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.75rem;
}

.aside-card p {
    font-size: 0.82rem;
    color: var(--c-muted);
    line-height: 1.55;
    margin: 0;
}

.aside-card--teal {
    background: rgba(13, 148, 136, 0.04);
    border-color: rgba(13, 148, 136, 0.2);
}

/* CHECKLIST */
.checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.checklist li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.checklist li.done { color: var(--c-accent-dark); }

.check-icon {
    font-size: 0.75rem;
    font-weight: 700;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    color: var(--c-muted);
    flex-shrink: 0;
}

.checklist li.done .check-icon {
    background: rgba(13, 148, 136, 0.12);
    color: var(--c-accent-dark);
}

/* SUPPLIER LIST */
.supplier-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.supplier-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--c-text);
}

.supplier-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-accent);
    flex-shrink: 0;
}

.supplier-more {
    font-size: 0.78rem;
    color: var(--c-muted);
}

.aside-empty {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin-bottom: 0.75rem;
}

.aside-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-accent);
    cursor: pointer;
    transition: color 0.15s;
}

.aside-link:hover { color: var(--c-accent-dark); }

/* RESPONSIVE */
@media (max-width: 960px) {
    .po-form-content { grid-template-columns: 1fr; }
    .form-actions { flex-direction: column-reverse; }
    .form-actions .primary-button,
    .form-actions .ghost-button { width: 100%; justify-content: center; }
    .line-items-table { font-size: 0.8rem; }
}

@media (max-width: 640px) {
    .po-form-page { padding: 1.25rem 1rem 2.5rem; }
    .po-form-title h1 { font-size: 1.5rem; }
    .form-grid.three-col { grid-template-columns: 1fr; }
    .section-title-row { flex-direction: column; align-items: flex-start; }
}
</style>
