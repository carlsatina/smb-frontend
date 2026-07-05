<template>
    <section class="po-form-page">
        <div class="po-form-shell">
            <header class="form-header">
                <button type="button" class="back-link" @click="goBack">
                    <mdicon name="arrow-left" size="15" />
                    Purchase orders
                </button>
                <h1>New purchase order</h1>
                <p>Select a supplier, add line items, and set an expected delivery date for {{ currentStoreLabel }}.</p>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Purchase orders are available on Standard."
                description="Upgrade to Standard to create purchase orders and receive inventory."
            />

            <form v-else class="po-form" @submit.prevent="createOrder">
                <!-- ── Supplier & delivery ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Supplier &amp; delivery</h2>
                    </div>

                    <div class="form-grid">
                        <label class="field">
                            <span>Supplier</span>
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
                                    {{ showSupplierForm ? 'Cancel' : 'New supplier' }}
                                </button>
                            </div>
                        </label>
                        <label class="field">
                            <span>Expected delivery date</span>
                            <input v-model="formState.expectedDate" type="date" :disabled="!canWrite" />
                        </label>
                        <label v-if="supplierSelection === 'CUSTOM'" class="field">
                            <span>Supplier name</span>
                            <input
                                v-model="formState.supplierName"
                                type="text"
                                placeholder="Fresh Supplier Co"
                                :disabled="!canWrite"
                            />
                        </label>
                    </div>

                    <!-- Inline new supplier form -->
                    <div v-if="showSupplierForm" class="supplier-form">
                        <label class="field">
                            <span>Name</span>
                            <input v-model="supplierForm.name" type="text" placeholder="Supplier name" />
                        </label>
                        <label class="field">
                            <span>Email <em>optional</em></span>
                            <input v-model="supplierForm.email" type="email" placeholder="ops@supplier.com" />
                        </label>
                        <label class="field">
                            <span>Phone <em>optional</em></span>
                            <input v-model="supplierForm.phone" type="tel" placeholder="+63 900 000 0000" />
                        </label>
                        <div class="supplier-actions">
                            <span v-if="supplierFormError" class="form-error">{{ supplierFormError }}</span>
                            <button
                                type="button"
                                class="ghost-button"
                                :disabled="isCreatingSupplier"
                                @click="createSupplierFromForm"
                            >
                                {{ isCreatingSupplier ? 'Saving…' : 'Save supplier' }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ── Items ── -->
                <div class="form-card">
                    <div class="card-title">
                        <h2>Items</h2>
                        <p>Unit costs auto-fill from your product and ingredient records — override them per order.</p>
                    </div>

                    <div v-if="!canWrite" class="panel-state">You have view-only access.</div>
                    <div v-else-if="lineItems.length === 0" class="items-empty">
                        <p>No items yet.</p>
                        <button type="button" class="add-line-btn" @click="addLine">+ Add item</button>
                    </div>
                    <template v-else>
                        <div class="table-wrap">
                            <table class="line-items-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Item</th>
                                        <th class="num">Qty ordered</th>
                                        <th class="num">Cost / unit</th>
                                        <th class="num">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(line, index) in lineItems"
                                        :key="line.key"
                                        :class="{ 'row-incomplete': !line.itemType || !line.itemId }"
                                    >
                                        <td class="col-type">
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
                                        <td class="col-item">
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
                                        <td class="col-qty">
                                            <div class="line-unit-wrap">
                                                <input
                                                    :ref="(el) => setQtyRef(el, index)"
                                                    v-model.number="line.qtyOrdered"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    class="line-input"
                                                    :disabled="!canWrite"
                                                />
                                                <span v-if="line.purchaseUnit" class="line-unit-tag">{{ line.purchaseUnit }}</span>
                                            </div>
                                            <div v-if="line.purchaseUnit && line.qtyOrdered > 0" class="line-hint">
                                                = {{ formatQty(lineBaseQty(line)) }} {{ ingredientBaseUnit(line) }}
                                            </div>
                                        </td>
                                        <td class="col-cost">
                                            <input
                                                v-model.number="line.unitCost"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                class="line-input"
                                                :disabled="!canWrite"
                                            />
                                            <div v-if="line.purchaseUnit" class="line-hint">per {{ line.purchaseUnit }}</div>
                                        </td>
                                        <td class="col-total">{{ formatMoney(lineTotal(line)) }}</td>
                                        <td class="col-remove">
                                            <button
                                                type="button"
                                                class="remove-btn"
                                                :disabled="!canWrite"
                                                @click="removeLine(index)"
                                                title="Remove line"
                                            >
                                                <mdicon name="close" size="16" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="2" class="tfoot-add">
                                            <button
                                                type="button"
                                                class="add-line-btn"
                                                :disabled="!canWrite"
                                                @click="addLine"
                                            >
                                                + Add item
                                            </button>
                                        </td>
                                        <td colspan="2" class="tfoot-label">Order total</td>
                                        <td class="col-total tfoot-total">{{ formatMoney(orderTotal) }}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </template>
                </div>

                <!-- ── Sticky actions ── -->
                <div class="actions-bar">
                    <span v-if="formError" class="actions-error">{{ formError }}</span>
                    <div class="actions-buttons">
                        <button type="button" class="ghost-button" @click="goBack">Cancel</button>
                        <button class="primary-button" type="submit" :disabled="isCreateDisabled">
                            {{ isSubmitting ? 'Creating…' : 'Create purchase order' }}
                        </button>
                    </div>
                </div>
            </form>
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
    return store.name;
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

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) storeContext.setCurrentStore(routeStoreId);
    if (!isPlanLocked.value) await Promise.all([loadProducts(), loadIngredients(), loadSuppliers()]);
});

watch(() => supplierSelection.value, (v) => { if (v !== 'CUSTOM') formState.supplierName = ''; });
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.po-form-page {
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
.po-form-shell {
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
.po-form {
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

.panel-state {
    padding: 1.5rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
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

.field input {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.field input::placeholder { color: #94a3b8; }

.field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.field input:disabled { background: #f1f5f9; color: #94a3b8; }

.supplier-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.supplier-row > :first-child { flex: 1; min-width: 0; }

.supplier-form {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 12px;
}

.supplier-actions {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.form-error {
    font-size: 0.8rem;
    font-weight: 600;
    color: #b91c1c;
}

/* ============================================================
   LINE ITEMS
============================================================ */
.items-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.75rem 1rem;
    border: 1.5px dashed var(--c-border);
    border-radius: 12px;
}

.items-empty p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--c-muted);
}

.table-wrap { overflow-x: auto; min-width: 0; }

.line-items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    min-width: 620px;
}

.line-items-table thead th {
    padding: 0.5rem 0.6rem;
    text-align: left;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.line-items-table thead th.num { text-align: right; }

.line-items-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
}

.line-items-table tbody tr.row-incomplete { background: #fffdf5; }

.line-items-table tbody td {
    padding: 0.6rem 0.6rem;
    vertical-align: top;
}

.col-type { width: 132px; }

.line-select {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.5rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.line-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.col-item { min-width: 180px; }

.col-qty, .col-cost { width: 120px; }

.line-unit-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.line-input {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.5rem 0.55rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    text-align: right;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-variant-numeric: tabular-nums;
}

.line-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.line-input:disabled { background: #f1f5f9; color: #94a3b8; }

.line-unit-tag {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--c-muted);
    white-space: nowrap;
}

.line-hint {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    color: var(--c-muted);
    text-align: right;
    white-space: nowrap;
}

.col-total {
    text-align: right;
    font-weight: 700;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    width: 110px;
    padding-top: 1.1rem !important;
}

.col-remove { width: 34px; text-align: right; }

.remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    margin-top: 0.3rem;
}

.remove-btn:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
.remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.line-items-table tfoot td {
    padding: 0.75rem 0.6rem 0;
    border-top: 1.5px solid var(--c-border);
    vertical-align: middle;
}

.tfoot-label {
    text-align: right;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
    white-space: nowrap;
}

.tfoot-total { padding-top: 0.75rem !important; }

.add-line-btn {
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

.add-line-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.05);
}

.add-line-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
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
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .po-form-page { padding: 1rem 0.875rem 2.5rem; }
    .po-form-shell { gap: 1rem; }
    .form-header h1 { font-size: 1.5rem; }

    .form-card { padding: 1.1rem; border-radius: 12px; }
    .form-grid { grid-template-columns: 1fr; }
    .supplier-form { grid-template-columns: 1fr; }

    /* ── Line items table → card rows ── */
    .line-items-table { min-width: 0; }
    .line-items-table thead { display: none; }
    .line-items-table,
    .line-items-table tbody,
    .line-items-table tfoot { display: block; }

    .line-items-table tbody tr {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 0.5rem 0.625rem;
        padding: 0.85rem 0;
        border-bottom: 1px solid var(--c-border);
    }

    .line-items-table tbody td {
        padding: 0;
        border: none;
        width: auto;
    }

    .line-items-table tbody td.col-type { grid-column: 1; grid-row: 1; }
    .line-items-table tbody td.col-remove {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }
    .remove-btn { margin-top: 0; }
    .line-items-table tbody td.col-item { grid-column: 1 / -1; grid-row: 2; }
    .line-items-table tbody td.col-qty { grid-column: 1; grid-row: 3; }
    .line-items-table tbody td.col-cost { grid-column: 2; grid-row: 3; }
    .line-items-table tbody td.col-total {
        grid-column: 1 / -1;
        grid-row: 4;
        padding-top: 0 !important;
        text-align: right;
        font-size: 0.875rem;
    }
    .line-items-table tbody td.col-total::before {
        content: 'Total';
        margin-right: 0.5rem;
        font-size: 0.66rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--c-muted);
    }

    .line-items-table tfoot tr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding-top: 0.85rem;
    }
    .line-items-table tfoot td { padding: 0; border: none; }
    .line-items-table tfoot td:last-child { display: none; }
    .tfoot-total { padding-top: 0 !important; }

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
