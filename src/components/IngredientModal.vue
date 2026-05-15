<template>
    <Teleport to="body">
        <div v-if="open" class="ingr-backdrop" @click.self="close">
            <div class="ingr-panel" role="dialog" aria-modal="true">

                <div class="ingr-header">
                    <h2 class="ingr-title">{{ isEditMode ? 'Edit ingredient' : 'Add ingredient' }}</h2>
                    <button type="button" class="ingr-close" @click="close" aria-label="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <form class="ingr-form" @submit.prevent="submit">
                    <div v-if="error" class="ingr-alert">{{ error }}</div>

                    <div class="ingr-grid">
                        <label class="ingr-field">
                            <span>Name</span>
                            <input ref="nameInput" v-model="form.name" type="text" placeholder="e.g. Coconut, Straw, Cup" required />
                        </label>
                        <label class="ingr-field">
                            <span>Unit</span>
                            <select v-model="form.unit" required>
                                <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
                            </select>
                        </label>
                        <label class="ingr-field">
                            <span>Category</span>
                            <select v-model="form.category">
                                <option value="RAW_MATERIAL">Raw material</option>
                                <option value="PACKAGING">Packaging</option>
                            </select>
                        </label>
                        <label class="ingr-field">
                            <span>Cost per {{ form.unit }}</span>
                            <div class="ingr-prefix-wrap">
                                <span class="ingr-prefix">{{ currencySymbol }}</span>
                                <input class="ingr-has-prefix" v-model.number="form.costPerUnit" type="number" step="0.01" min="0" placeholder="0.00" />
                            </div>
                        </label>
                    </div>

                    <div class="ingr-divider">
                        <span>Purchase unit <span class="ingr-optional">optional</span></span>
                    </div>
                    <p class="ingr-help">
                        Set a purchase unit if you buy this ingredient in bulk (e.g. Gallon) but use it in smaller amounts (e.g. L) per recipe.
                    </p>
                    <div class="ingr-grid">
                        <label class="ingr-field">
                            <span>Purchase unit</span>
                            <input
                                v-model="form.purchaseUnit"
                                type="text"
                                placeholder="e.g. Gallon, Box, Carton"
                            />
                        </label>
                        <label class="ingr-field">
                            <span>{{ form.unit }} per {{ form.purchaseUnit || 'purchase unit' }}</span>
                            <input
                                v-model.number="form.purchaseUnitSize"
                                type="number"
                                step="0.0001"
                                min="0"
                                :placeholder="form.purchaseUnit ? 'e.g. 3.785' : '—'"
                                :disabled="!form.purchaseUnit"
                            />
                        </label>
                    </div>

                    <div class="ingr-footer">
                        <button type="button" class="ingr-btn-ghost" @click="close">Cancel</button>
                        <button type="submit" class="ingr-btn-primary" :disabled="saving || !form.name">
                            {{ saving ? (isEditMode ? 'Updating…' : 'Creating…') : (isEditMode ? 'Update ingredient' : 'Create ingredient') }}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { createIngredient, updateIngredient, IngredientCategory, IngredientResponse } from '@/api/ingredients';
import { useStoreContextStore } from '@/stores/storeContext';
import { DEFAULT_UNIT_OPTIONS } from '@/utils/catalogDefaults';

const props = defineProps<{
    open: boolean;
    ingredient?: IngredientResponse | null;
}>();

const emit = defineEmits<{
    (event: 'close'): void;
    (event: 'created', ingredient: IngredientResponse): void;
    (event: 'updated', ingredient: IngredientResponse): void;
}>();

const storeContext = useStoreContextStore();

const isEditMode = computed(() => !!props.ingredient);

const unitOptions = computed(() => {
    const storeUnits = storeContext.currentStore?.unitOptions;
    return storeUnits?.length ? storeUnits : DEFAULT_UNIT_OPTIONS;
});

const defaultUnit = computed(() => unitOptions.value[0] || 'pc');

const form = ref({
    name: '',
    unit: 'pc',
    category: 'RAW_MATERIAL' as IngredientCategory,
    costPerUnit: 0,
    purchaseUnit: '',
    purchaseUnitSize: null as number | null,
});

const saving = ref(false);
const error = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

const currencySymbol = computed(() => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency })
            .formatToParts(0)
            .find((p) => p.type === 'currency')?.value ?? currency;
    } catch {
        return currency;
    }
});

const resetForm = () => {
    if (props.ingredient) {
        form.value = {
            name: props.ingredient.name,
            unit: props.ingredient.unit,
            category: props.ingredient.category,
            costPerUnit: Number(props.ingredient.costPerUnit) || 0,
            purchaseUnit: props.ingredient.purchaseUnit || '',
            purchaseUnitSize: props.ingredient.purchaseUnitSize != null ? Number(props.ingredient.purchaseUnitSize) : null,
        };
    } else {
        form.value = {
            name: '',
            unit: defaultUnit.value,
            category: 'RAW_MATERIAL',
            costPerUnit: 0,
            purchaseUnit: '',
            purchaseUnitSize: null,
        };
    }
    error.value = '';
};

watch(() => props.open, async (isOpen) => {
    if (isOpen) {
        resetForm();
        await nextTick();
        nameInput.value?.focus();
    }
});

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) close();
};

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));

const close = () => emit('close');

const submit = async () => {
    if (!storeContext.currentStoreId || !form.value.name) return;

    saving.value = true;
    error.value = '';

    const purchaseUnit = form.value.purchaseUnit.trim() || null;
    const payload = {
        name: form.value.name,
        unit: form.value.unit || defaultUnit.value,
        category: form.value.category,
        costPerUnit: Number(form.value.costPerUnit) || 0,
        purchaseUnit,
        purchaseUnitSize: purchaseUnit && form.value.purchaseUnitSize ? Number(form.value.purchaseUnitSize) : null,
    };

    try {
        if (isEditMode.value && props.ingredient) {
            const data = await updateIngredient(storeContext.currentStoreId, props.ingredient.id, payload);
            emit('updated', data.ingredient);
        } else {
            const data = await createIngredient(storeContext.currentStoreId, {
                ...payload,
                active: true,
            });
            emit('created', data.ingredient);
        }
        close();
    } catch (err) {
        if (typeof err === 'object' && err && 'body' in err) {
            const body = (err as { body?: { error?: { message?: string } } }).body;
            error.value = body?.error?.message ?? (isEditMode.value ? 'Unable to update ingredient.' : 'Unable to create ingredient.');
        } else {
            error.value = isEditMode.value ? 'Unable to update ingredient.' : 'Unable to create ingredient.';
        }
    } finally {
        saving.value = false;
    }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   BACKDROP
============================================================ */
.ingr-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
}

/* ============================================================
   MODAL PANEL
============================================================ */
.ingr-panel {
    font-family: 'Inter', sans-serif;
    width: 100%;
    max-width: 520px;
    margin: 1.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.16);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* ============================================================
   HEADER
============================================================ */
.ingr-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.75rem;
    border-bottom: 1px solid #e2e8f0;
}

.ingr-title {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #0f172a;
    margin: 0;
}

.ingr-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ingr-close:hover {
    background: #f8fafc;
    color: #0f172a;
    border-color: #cbd5e1;
}

/* ============================================================
   FORM
============================================================ */
.ingr-form {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.ingr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.ingr-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
}

.ingr-field input,
.ingr-field select {
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    color: #0f172a;
    background: #ffffff;
    text-transform: none;
    letter-spacing: 0;
    transition: border-color 0.15s;
}

.ingr-field input:focus,
.ingr-field select:focus {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   PURCHASE UNIT SECTION
============================================================ */
.ingr-divider {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-top: 0.25rem;
}

.ingr-divider::before,
.ingr-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
}

.ingr-optional {
    font-size: 0.68rem;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: #94a3b8;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
}

.ingr-help {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.5;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
}

/* ============================================================
   ALERT
============================================================ */
.ingr-alert {
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 0.65rem 0.9rem;
    font-weight: 500;
    font-size: 0.875rem;
}

/* ============================================================
   FOOTER
============================================================ */
.ingr-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.25rem;
}

/* ============================================================
   BUTTONS
============================================================ */
.ingr-btn-ghost {
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.6rem 1.1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.ingr-btn-ghost:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #0f172a;
}

.ingr-btn-primary {
    background: #0d9488;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.25rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s;
}

.ingr-btn-primary:hover:not(:disabled) {
    background: #0f766e;
}

.ingr-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

/* ============================================================
   CURRENCY PREFIX INPUT
============================================================ */
.ingr-prefix-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.ingr-prefix {
    position: absolute;
    left: 0.75rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    pointer-events: none;
    user-select: none;
}

.ingr-field input.ingr-has-prefix {
    padding-left: 2.75rem;
    width: 100%;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 480px) {
    .ingr-footer {
        flex-direction: column-reverse;
    }

    .ingr-btn-ghost,
    .ingr-btn-primary {
        width: 100%;
        justify-content: center;
        text-align: center;
    }
}
</style>
