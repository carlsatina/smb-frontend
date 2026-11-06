<template>
    <Teleport to="body">
        <Transition name="edit-sale-fade">
            <div v-if="saleId" class="edit-sale-overlay" @click.self="requestClose" @keydown.esc="requestClose">
                <div class="edit-sale" role="dialog" aria-modal="true" aria-labelledby="edit-sale-title">
                    <header class="edit-sale__header">
                        <div>
                            <h3 id="edit-sale-title">
                                Edit sale{{ original?.receiptNumber ? ` #${original.receiptNumber}` : '' }}
                            </h3>
                            <p v-if="original" class="edit-sale__meta">
                                {{ formatDate(original.createdAt) }} ·
                                {{ original.cashier?.fullName || original.cashier?.email || '—' }}
                            </p>
                        </div>
                        <button type="button" class="edit-sale__close" aria-label="Close" @click="requestClose">
                            <mdicon name="close" size="20" />
                        </button>
                    </header>

                    <div v-if="isLoading" class="edit-sale__state">Loading sale…</div>
                    <div v-else-if="loadError" class="edit-sale__state edit-sale__state--error">{{ loadError }}</div>

                    <div v-else class="edit-sale__body">
                        <!-- LINE ITEMS -->
                        <section class="edit-sale__section">
                            <div class="edit-sale__lines-head">
                                <span>Item</span>
                                <span>Qty</span>
                                <span>Unit price</span>
                                <span class="align-right">Total</span>
                                <span></span>
                            </div>
                            <div v-for="line in lines" :key="line.key" class="edit-sale__line">
                                <span class="edit-sale__line-name">{{ line.name }}</span>
                                <label class="edit-sale__cell">
                                    <span class="edit-sale__cell-label">Qty</span>
                                    <input
                                        v-model.number="line.qty"
                                        type="number"
                                        min="0"
                                        step="any"
                                        inputmode="decimal"
                                        :class="{ invalid: !(line.qty > 0) }"
                                        :aria-label="`Quantity for ${line.name}`"
                                    />
                                </label>
                                <label class="edit-sale__cell">
                                    <span class="edit-sale__cell-label">Unit price</span>
                                    <input
                                        v-model.number="line.unitPrice"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputmode="decimal"
                                        :class="{ invalid: !(line.unitPrice >= 0) }"
                                        :aria-label="`Unit price for ${line.name}`"
                                    />
                                </label>
                                <span class="edit-sale__line-total">{{ formatMoney(lineSubtotal(line)) }}</span>
                                <button
                                    type="button"
                                    class="edit-sale__remove"
                                    :aria-label="`Remove ${line.name}`"
                                    :disabled="lines.length === 1"
                                    :title="lines.length === 1 ? 'A sale needs at least one item. Void it instead.' : 'Remove'"
                                    @click="removeLine(line.key)"
                                >
                                    <mdicon name="trash-can-outline" size="18" />
                                </button>
                            </div>
                            <div class="edit-sale__add">
                                <SearchableSelect
                                    v-model="addProductId"
                                    :options="addProductOptions"
                                    placeholder="+ Add item"
                                    search-placeholder="Search products…"
                                />
                            </div>
                        </section>

                        <!-- PAYMENT / ORDER TYPE / DISCOUNT -->
                        <section class="edit-sale__section edit-sale__fields">
                            <label class="edit-sale__field">
                                <span>Payment method</span>
                                <select v-model="paymentMethod">
                                    <option v-for="method in methodOptions" :key="method.value" :value="method.value">
                                        {{ method.label }}
                                    </option>
                                </select>
                            </label>
                            <div class="edit-sale__field">
                                <span>Order type</span>
                                <div class="edit-sale__toggle" role="group" aria-label="Order type">
                                    <button type="button" :class="{ active: orderType === 'DINE_IN' }" @click="orderType = 'DINE_IN'">Dine-in</button>
                                    <button type="button" :class="{ active: orderType === 'TAKEOUT' }" @click="orderType = 'TAKEOUT'">Takeout</button>
                                </div>
                            </div>
                            <div class="edit-sale__field">
                                <span>Discount</span>
                                <div class="edit-sale__discount">
                                    <input
                                        v-model.number="discountValue"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputmode="decimal"
                                        :class="{ invalid: discountInvalid }"
                                        aria-label="Discount"
                                    />
                                    <select v-model="discountMode" aria-label="Discount type">
                                        <option value="amount">{{ currencySymbol }}</option>
                                        <option value="percent">%</option>
                                    </select>
                                </div>
                                <button
                                    v-if="storeDiscountPercent > 0"
                                    type="button"
                                    class="edit-sale__link"
                                    @click="applyStoreDiscount"
                                >
                                    Apply store discount ({{ storeDiscountPercent }}%)
                                </button>
                            </div>
                        </section>

                        <!-- SUMMARY -->
                        <section class="edit-sale__summary">
                            <div class="edit-sale__summary-row"><span>Subtotal</span><span>{{ formatMoney(subtotal) }}</span></div>
                            <div v-if="discountAmount > 0" class="edit-sale__summary-row">
                                <span>Discount</span><span>−{{ formatMoney(discountAmount) }}</span>
                            </div>
                            <div v-if="taxRate > 0" class="edit-sale__summary-row">
                                <span>Tax ({{ formatRate(taxRate) }}%)</span><span>{{ formatMoney(taxAmount) }}</span>
                            </div>
                            <div class="edit-sale__summary-row edit-sale__summary-row--total">
                                <span>Total</span><span>{{ formatMoney(total) }}</span>
                            </div>
                            <div v-if="original && totalChanged" class="edit-sale__summary-diff">
                                Was {{ formatMoney(original.total) }}
                                ({{ total > original.total ? '+' : '−' }}{{ formatMoney(Math.abs(total - original.total)) }})
                            </div>
                        </section>

                        <p class="edit-sale__note">
                            <mdicon name="information-outline" size="16" />
                            Stock is adjusted for the difference only. The edit is recorded in the audit log.
                        </p>
                        <p v-if="saveError" class="edit-sale__error">{{ saveError }}</p>
                    </div>

                    <footer class="edit-sale__footer">
                        <button type="button" class="edit-sale__btn edit-sale__btn--ghost" :disabled="isSaving" @click="requestClose">
                            Cancel
                        </button>
                        <button
                            type="button"
                            class="edit-sale__btn edit-sale__btn--primary"
                            :disabled="!canSave"
                            @click="save"
                        >
                            {{ isSaving ? 'Saving…' : 'Save changes' }}
                        </button>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SearchableSelect from '@/components/SearchableSelect.vue';
import type { ProductResponse } from '@/api/products';
import { getSale, SaleDetail, updateSale } from '@/api/sales';
import { useStoreContextStore } from '@/stores/storeContext';

type EditLine = {
    key: string;
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
};

const props = defineProps<{
    saleId: string | null;
    products: ProductResponse[];
    paymentMethodOptions: Array<{ value: string; label: string }>;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'saved', sale: SaleDetail): void;
}>();

const storeContext = useStoreContextStore();

const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref('');
const saveError = ref('');
const original = ref<SaleDetail | null>(null);
const lines = ref<EditLine[]>([]);
const paymentMethod = ref('CASH');
const orderType = ref<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
const discountMode = ref<'amount' | 'percent'>('amount');
const discountValue = ref(0);
const taxRate = ref(0);
const addProductId = ref('');
let lineSeq = 0;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const lineSubtotal = (line: EditLine) => roundMoney(num(line.qty) * num(line.unitPrice));
const subtotal = computed(() => roundMoney(lines.value.reduce((sum, line) => sum + lineSubtotal(line), 0)));
const discountAmount = computed(() => {
    const value = Math.max(0, num(discountValue.value));
    return roundMoney(discountMode.value === 'percent' ? (subtotal.value * value) / 100 : value);
});
const discountInvalid = computed(
    () => num(discountValue.value) < 0 || discountAmount.value > subtotal.value || (discountMode.value === 'percent' && num(discountValue.value) > 100)
);
const taxAmount = computed(() => roundMoney(((subtotal.value - discountAmount.value) * taxRate.value) / 100));
const total = computed(() => roundMoney(subtotal.value - discountAmount.value + taxAmount.value));
const totalChanged = computed(() => original.value !== null && Math.abs(total.value - original.value.total) >= 0.005);

const storeDiscountPercent = computed(() => storeContext.currentStore?.defaultDiscount ?? 0);
const currencySymbol = computed(() => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return (
            new Intl.NumberFormat(undefined, { style: 'currency', currency })
                .formatToParts(0)
                .find((part) => part.type === 'currency')?.value ?? currency
        );
    } catch {
        return currency;
    }
});

// Keep the sale's current method selectable even if the store has since disabled it.
const methodOptions = computed(() => {
    const options = props.paymentMethodOptions;
    const current = original.value?.paymentMethod;
    if (!current || options.some((option) => option.value === current)) return options;
    return [...options, { value: current, label: current.charAt(0) + current.slice(1).toLowerCase() }];
});

const addProductOptions = computed(() =>
    props.products
        .filter((product) => product.active !== false)
        // A Grab sale can only gain items that are sold on Grab.
        .filter((product) => !original.value?.channel || !(product.unavailableChannels ?? []).includes(original.value.channel))
        .map((product) => ({ value: product.id, label: `${product.name} · ${formatMoney(product.price)}` }))
);

const snapshot = () =>
    JSON.stringify({
        lines: lines.value.map((line) => [line.productId, num(line.qty), num(line.unitPrice)]),
        paymentMethod: paymentMethod.value,
        orderType: orderType.value,
        discount: discountAmount.value,
    });
const initialSnapshot = ref('');
const isDirty = computed(() => initialSnapshot.value !== '' && snapshot() !== initialSnapshot.value);

const linesValid = computed(
    () => lines.value.length > 0 && lines.value.every((line) => num(line.qty) > 0 && num(line.unitPrice) >= 0 && line.unitPrice !== ('' as unknown))
);
const canSave = computed(
    () => !isLoading.value && !isSaving.value && !loadError.value && isDirty.value && linesValid.value && !discountInvalid.value
);

const load = async (saleId: string) => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';
    initialSnapshot.value = '';
    try {
        const { sale } = await getSale(storeId, saleId);
        if (props.saleId !== saleId) return;
        if (sale.status !== 'FINALIZED') {
            loadError.value = 'Only finalized sales can be edited.';
            return;
        }
        original.value = sale;
        lines.value = sale.items.map((item) => ({
            key: `l${lineSeq++}`,
            productId: item.productId,
            name: item.name,
            qty: item.qty,
            unitPrice: item.unitPrice,
        }));
        paymentMethod.value = sale.paymentMethod;
        orderType.value = sale.orderType === 'TAKEOUT' ? 'TAKEOUT' : 'DINE_IN';
        discountMode.value = 'amount';
        discountValue.value = sale.discount;
        // Preserve the tax treatment the sale was rung up with.
        const taxableBase = sale.subtotal - sale.discount;
        taxRate.value = taxableBase > 0 && sale.tax > 0 ? (sale.tax / taxableBase) * 100 : 0;
        initialSnapshot.value = snapshot();
    } catch (error: any) {
        loadError.value = error?.body?.error?.message || 'Unable to load sale.';
    } finally {
        isLoading.value = false;
    }
};

watch(
    () => props.saleId,
    (saleId) => {
        if (saleId) {
            load(saleId);
        } else {
            original.value = null;
            lines.value = [];
        }
    },
    { immediate: true }
);

watch(addProductId, (productId) => {
    if (!productId) return;
    const product = props.products.find((item) => item.id === productId);
    addProductId.value = '';
    if (!product) return;
    const existing = lines.value.find((line) => line.productId === productId);
    if (existing) {
        existing.qty = num(existing.qty) + 1;
        return;
    }
    lines.value.push({
        key: `l${lineSeq++}`,
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: product.price,
    });
});

const removeLine = (key: string) => {
    if (lines.value.length === 1) return;
    lines.value = lines.value.filter((line) => line.key !== key);
};

const applyStoreDiscount = () => {
    discountMode.value = 'percent';
    discountValue.value = storeDiscountPercent.value;
};

const requestClose = () => {
    if (isSaving.value) return;
    emit('close');
};

const save = async () => {
    const storeId = storeContext.currentStoreId;
    const saleId = props.saleId;
    if (!storeId || !saleId || !canSave.value) return;

    isSaving.value = true;
    saveError.value = '';
    try {
        const sub = subtotal.value;
        const discount = discountAmount.value;
        const items = lines.value.map((line) => {
            const lineTotal = lineSubtotal(line);
            const discountShare = sub > 0 ? roundMoney((lineTotal / sub) * discount) : 0;
            const lineDiscount = Math.min(discountShare, lineTotal);
            const lineTax = roundMoney(((lineTotal - lineDiscount) * taxRate.value) / 100);
            return {
                productId: line.productId,
                qty: num(line.qty),
                unitPrice: roundMoney(num(line.unitPrice)),
                discount: lineDiscount,
                tax: lineTax,
            };
        });
        const { sale } = await updateSale(storeId, saleId, {
            items,
            paymentMethod: paymentMethod.value,
            orderType: orderType.value,
        });
        emit('saved', sale);
    } catch (error: any) {
        const body = error?.body?.error;
        if (body?.code === 'NEGATIVE_STOCK' && body?.details?.name) {
            saveError.value = `Not enough stock for ${body.details.name}.`;
        } else {
            saveError.value = body?.message || 'Unable to save changes.';
        }
    } finally {
        isSaving.value = false;
    }
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatRate = (value: number) => Number(value.toFixed(2)).toString();

const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });
</script>

<style scoped>
.edit-sale-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    font-family: 'Inter', -apple-system, sans-serif;
}

.edit-sale {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 640px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.edit-sale__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid #e2e8f0;
}

.edit-sale__header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
}

.edit-sale__meta {
    margin: 0.2rem 0 0;
    font-size: 0.8rem;
    color: #64748b;
}

.edit-sale__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    flex-shrink: 0;
}

.edit-sale__close:hover { background: #f1f5f9; color: #0f172a; }

.edit-sale__state {
    padding: 2.5rem 1.4rem;
    text-align: center;
    color: #64748b;
    font-size: 0.9rem;
}

.edit-sale__state--error { color: #b91c1c; }

.edit-sale__body {
    overflow-y: auto;
    padding: 0.5rem 1.4rem 1rem;
}

.edit-sale__section {
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f5f9;
}

.edit-sale__lines-head,
.edit-sale__line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 76px 104px 92px 32px;
    gap: 0.6rem;
    align-items: center;
}

.edit-sale__lines-head {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    padding-bottom: 0.4rem;
}

.edit-sale__line { padding: 0.4rem 0; }

.edit-sale__line-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #0f172a;
    overflow-wrap: anywhere;
}

.edit-sale__cell { display: block; min-width: 0; }
.edit-sale__cell-label { display: none; }

.edit-sale__line input,
.edit-sale__discount input,
.edit-sale__discount select,
.edit-sale__field select {
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
    font-variant-numeric: tabular-nums;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.edit-sale__line input:focus,
.edit-sale__discount input:focus,
.edit-sale__discount select:focus,
.edit-sale__field select:focus {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.edit-sale input.invalid { border-color: #ef4444; }

.edit-sale__line-total,
.align-right {
    text-align: right;
}

.edit-sale__line-total {
    font-size: 0.875rem;
    font-weight: 600;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
}

.edit-sale__remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
}

.edit-sale__remove:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
.edit-sale__remove:disabled { opacity: 0.35; cursor: not-allowed; }

.edit-sale__add { margin-top: 0.5rem; }

.edit-sale__fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
}

.edit-sale__field {
    display: grid;
    gap: 0.35rem;
    align-content: start;
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f172a;
}

.edit-sale__toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.edit-sale__toggle button {
    border: none;
    background: #fff;
    padding: 0.45rem 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    color: #64748b;
    cursor: pointer;
}

.edit-sale__toggle button.active { background: rgba(13, 148, 136, 0.1); color: #0f766e; }

.edit-sale__discount {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 58px;
    gap: 0.35rem;
}

.edit-sale__link {
    justify-self: start;
    border: none;
    background: none;
    padding: 0;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    color: #0d9488;
    cursor: pointer;
}

.edit-sale__link:hover { text-decoration: underline; }

.edit-sale__summary {
    padding: 0.75rem 0;
    display: grid;
    gap: 0.35rem;
}

.edit-sale__summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #475569;
    font-variant-numeric: tabular-nums;
}

.edit-sale__summary-row--total {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0f172a;
    margin-top: 0.2rem;
}

.edit-sale__summary-diff {
    text-align: right;
    font-size: 0.78rem;
    color: #64748b;
    font-variant-numeric: tabular-nums;
}

.edit-sale__note {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.25rem 0 0;
    font-size: 0.78rem;
    color: #64748b;
}

.edit-sale__error {
    margin: 0.6rem 0 0;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 0.82rem;
}

.edit-sale__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.9rem 1.4rem;
    border-top: 1px solid #e2e8f0;
}

.edit-sale__btn {
    border-radius: 8px;
    padding: 0.6rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.edit-sale__btn--ghost {
    border: 1.5px solid #e2e8f0;
    background: #fff;
    color: #0f172a;
}

.edit-sale__btn--ghost:hover:not(:disabled) { background: #f8fafc; }

.edit-sale__btn--primary {
    border: none;
    background: #0d9488;
    color: #fff;
}

.edit-sale__btn--primary:hover:not(:disabled) { background: #0f766e; }
.edit-sale__btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
    .edit-sale-overlay { padding: 0; align-items: flex-end; }
    .edit-sale { max-height: 94vh; border-radius: 16px 16px 0 0; }
    .edit-sale__header, .edit-sale__footer { padding-left: 1rem; padding-right: 1rem; }
    .edit-sale__body { padding: 0.5rem 1rem 1rem; }

    .edit-sale__lines-head { display: none; }
    .edit-sale__line {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
        grid-template-areas:
            'name name remove'
            'qty price price'
            'total total total';
        row-gap: 0.4rem;
        padding: 0.65rem 0;
        border-bottom: 1px solid #f1f5f9;
    }
    .edit-sale__line-name { grid-area: name; }
    .edit-sale__remove { grid-area: remove; }
    .edit-sale__cell:nth-of-type(1) { grid-area: qty; }
    .edit-sale__cell:nth-of-type(2) { grid-area: price; }
    .edit-sale__line-total { grid-area: total; }
    .edit-sale__cell-label {
        display: block;
        font-size: 0.7rem;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 0.2rem;
    }

    .edit-sale__fields { grid-template-columns: 1fr; }
}

.edit-sale-fade-enter-active, .edit-sale-fade-leave-active { transition: opacity 0.2s ease; }
.edit-sale-fade-enter-from, .edit-sale-fade-leave-to { opacity: 0; }
</style>
