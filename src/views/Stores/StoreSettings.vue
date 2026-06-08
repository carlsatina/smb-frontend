<template>
    <section class="st-page">
        <div class="st-shell">

            <!-- Page header -->
            <header class="st-header">
                <div class="st-header-left">
                    <span class="st-eyebrow">Store Settings</span>
                    <h1 class="st-title">{{ storeTitle }}</h1>
                    <p class="st-subtitle">Manage timezone, currency, and inventory defaults for {{ storeDescriptionName }}.</p>
                </div>
                <div class="st-header-right">
                    <button class="st-btn-ghost" @click="goToStores">Back to stores</button>
                </div>
            </header>

            <!-- Panel 1: Store profile -->
            <section class="st-panel">
                <div class="st-panel-header">
                    <div>
                        <h2 class="st-panel-title">Store profile</h2>
                        <p class="st-panel-sub">{{ currentStoreLabel }}</p>
                    </div>
                    <span v-if="currentStore" class="st-role-badge">{{ currentStore.role }}</span>
                </div>

                <div v-if="storeContext.isLoading && !currentStore" class="st-state">Loading store settings...</div>

                <div v-else-if="!currentStore" class="st-state">
                    Store not found. Return to the store list to select another store.
                </div>

                <form v-else class="st-form" @submit.prevent="saveSettings">
                    <div class="st-form-grid">
                        <label class="st-field">
                            Store name
                            <input
                                v-model="storeForm.name"
                                type="text"
                                placeholder="Cafe Downtown"
                                :disabled="!canEdit"
                                required
                            />
                        </label>

                        <label class="st-field">
                            Store type
                            <select v-model="storeForm.storeType" :disabled="!canEdit">
                                <option value="RETAIL">Retail (point of sale)</option>
                                <option value="WAREHOUSE">Warehouse (stock holding)</option>
                            </select>
                        </label>

                        <label class="st-field">
                            Timezone
                            <select v-model="storeForm.timezone" :disabled="!canEdit">
                                <option v-for="timezone in timezoneOptions" :key="timezone" :value="timezone">
                                    {{ timezone }}
                                </option>
                            </select>
                        </label>

                        <label class="st-field">
                            Currency
                            <select v-model="storeForm.currency" :disabled="!canEdit">
                                <option v-for="currency in currencyOptions" :key="currency" :value="currency">
                                    {{ currency }}
                                </option>
                            </select>
                        </label>

                        <label class="st-field">
                            Low stock threshold
                            <input
                                v-model.number="storeForm.lowStockThreshold"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                :disabled="!canEdit"
                            />
                        </label>

                        <label class="st-field">
                            Tax rate (%)
                            <input
                                v-model.number="storeForm.defaultTaxRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0"
                                :disabled="!canEdit"
                            />
                        </label>

                        <label class="st-field">
                            Discount (%)
                            <input
                                v-model.number="storeForm.defaultDiscount"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0"
                                :disabled="!canEdit"
                            />
                        </label>
                    </div>

                    <label class="st-toggle-field">
                        <input v-model="storeForm.allowNegativeStock" type="checkbox" :disabled="!canEdit" />
                        <span class="st-toggle-track"></span>
                        <span class="st-toggle-label">Allow negative stock</span>
                    </label>

                    <div class="st-catalog-box">
                        <div class="st-catalog-header">
                            <h3 class="st-catalog-title">Catalog defaults</h3>
                            <p class="st-catalog-sub">Define the unit and category dropdowns used in products.</p>
                        </div>
                        <div class="st-catalog-grid">
                            <div class="st-catalog-group">
                                <span class="st-catalog-label">Units</span>
                                <div class="st-catalog-input">
                                    <input
                                        v-model="newUnit"
                                        type="text"
                                        placeholder="Add unit"
                                        :disabled="!canEdit"
                                    />
                                    <button
                                        class="st-btn-ghost"
                                        type="button"
                                        :disabled="!canEdit || !newUnit.trim()"
                                        @click="addUnitOption"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div v-if="storeForm.unitOptions.length" class="st-catalog-tags">
                                    <span v-for="unit in storeForm.unitOptions" :key="unit" class="st-catalog-tag">
                                        {{ unit }}
                                        <button
                                            type="button"
                                            class="st-catalog-remove"
                                            :disabled="!canEdit"
                                            @click="removeUnitOption(unit)"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                </div>
                                <div v-else class="st-catalog-empty">No units configured.</div>
                            </div>
                            <div class="st-catalog-group">
                                <span class="st-catalog-label">Categories</span>
                                <div class="st-catalog-input">
                                    <input
                                        v-model="newCategory"
                                        type="text"
                                        placeholder="Add category"
                                        :disabled="!canEdit"
                                    />
                                    <button
                                        class="st-btn-ghost"
                                        type="button"
                                        :disabled="!canEdit || !newCategory.trim()"
                                        @click="addCategoryOption"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div v-if="storeForm.categoryOptions.length" class="st-catalog-tags">
                                    <span
                                        v-for="category in storeForm.categoryOptions"
                                        :key="category"
                                        class="st-catalog-tag"
                                    >
                                        {{ category }}
                                        <button
                                            type="button"
                                            class="st-catalog-remove"
                                            :disabled="!canEdit"
                                            @click="removeCategoryOption(category)"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                </div>
                                <div v-else class="st-catalog-empty">No categories configured.</div>
                            </div>
                        </div>
                    </div>

                    <p v-if="!canEdit" class="st-permission-note">
                        Your role is {{ currentStore?.role }}. You can view settings but only owners or admins can edit.
                    </p>

                    <div class="st-form-footer">
                        <button class="st-btn-ghost" type="button" :disabled="!currentStore" @click="resetForm">
                            Reset changes
                        </button>
                        <button class="st-btn-primary" type="submit" :disabled="!canEdit || !storeForm.name || isSaving">
                            {{ isSaving ? 'Saving...' : 'Save changes' }}
                        </button>
                    </div>
                </form>
            </section>

            <!-- Quick nav to related pages -->
            <div class="st-nav-links">
                <button class="st-nav-card" @click="goToTeam" :disabled="!currentStore">
                    <div class="st-nav-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="st-nav-card-body">
                        <span class="st-nav-card-title">Team &amp; roles</span>
                        <span class="st-nav-card-sub">Manage members and invitations</span>
                    </div>
                    <svg class="st-nav-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="st-nav-card" @click="goToPlan">
                    <div class="st-nav-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                    </div>
                    <div class="st-nav-card-body">
                        <span class="st-nav-card-title">Plan &amp; subscription</span>
                        <span class="st-nav-card-sub">View your plan, limits, and feature access</span>
                    </div>
                    <svg class="st-nav-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>

            <!-- Archive store -->
            <section class="st-panel st-danger-panel">
                <div class="st-panel-header">
                    <div>
                        <h2 class="st-panel-title">Archive store</h2>
                        <p class="st-panel-sub">Remove this store from active use. Data stays in the database.</p>
                    </div>
                </div>

                <div v-if="!currentStore" class="st-state">
                    Select a store to manage archive settings.
                </div>

                <div v-else class="st-danger-body">
                    <p class="st-danger-text">
                        Archiving hides the store from all members and disables new activity. This action can be reversed only with database access.
                    </p>
                    <div class="st-danger-actions">
                        <button
                            class="st-btn-danger"
                            type="button"
                            :disabled="!canArchive || isArchiving"
                            @click="archiveStore"
                        >
                            {{ isArchiving ? 'Archiving...' : 'Archive store' }}
                        </button>
                        <p v-if="!canArchive" class="st-permission-note">Only owners can archive a store.</p>
                    </div>
                </div>
            </section>

        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteStore, updateStore } from '@/api/stores';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { DEFAULT_CATEGORY_OPTIONS, DEFAULT_UNIT_OPTIONS } from '@/utils/catalogDefaults';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const storeForm = reactive({
    name: '',
    storeType: 'RETAIL' as 'RETAIL' | 'WAREHOUSE',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    allowNegativeStock: false,
    lowStockThreshold: 0,
    defaultTaxRate: 0,
    defaultDiscount: 0,
    unitOptions: [...DEFAULT_UNIT_OPTIONS],
    categoryOptions: [...DEFAULT_CATEGORY_OPTIONS],
});

const baseTimezoneOptions = [
    'Asia/Manila',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'UTC',
];

const baseCurrencyOptions = [
    'PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD',
    'SGD', 'HKD', 'JPY', 'CNY', 'KRW', 'THB', 'IDR', 'MYR', 'VND',
];

const isSaving = ref(false);
const isArchiving = ref(false);
const newUnit = ref('');
const newCategory = ref('');

const routeStoreId = computed(() => route.params.storeId as string | undefined);

const currentStore = computed(() => {
    const storeId = routeStoreId.value;
    if (!storeId) return null;
    return storeContext.stores.find((store) => store.id === storeId) ?? null;
});

const canEdit = computed(() => {
    const role = currentStore.value?.role;
    return role === 'OWNER' || role === 'ADMIN';
});
const canArchive = computed(() => currentStore.value?.role === 'OWNER');

const timezoneOptions = computed(() => {
    if (storeForm.timezone && !baseTimezoneOptions.includes(storeForm.timezone)) {
        return [storeForm.timezone, ...baseTimezoneOptions];
    }
    return baseTimezoneOptions;
});
const currencyOptions = computed(() => {
    if (storeForm.currency && !baseCurrencyOptions.includes(storeForm.currency)) {
        return [storeForm.currency, ...baseCurrencyOptions];
    }
    return baseCurrencyOptions;
});

const storeTitle = computed(() => currentStore.value?.name || 'Store settings');
const storeDescriptionName = computed(() => currentStore.value?.name || 'this store');
const currentStoreLabel = computed(() => {
    if (!currentStore.value) return 'Select a store to get started.';
    return `${currentStore.value.name} — ${currentStore.value.currency}`;
});

const normalizeOptions = (options: string[], fallback: string[]) => {
    const normalized: string[] = [];
    options.forEach((option) => {
        const value = option.trim();
        if (!value) return;
        if (normalized.some((entry) => entry.toLowerCase() === value.toLowerCase())) return;
        normalized.push(value);
    });
    return normalized.length > 0 ? normalized : [...fallback];
};

const resetForm = () => {
    if (!currentStore.value) return;
    storeForm.name = currentStore.value.name;
    storeForm.storeType = currentStore.value.storeType ?? 'RETAIL';
    storeForm.timezone = currentStore.value.timezone;
    storeForm.currency = currentStore.value.currency;
    storeForm.allowNegativeStock = currentStore.value.allowNegativeStock;
    storeForm.lowStockThreshold = currentStore.value.lowStockThreshold ?? 0;
    storeForm.defaultTaxRate = currentStore.value.defaultTaxRate ?? 0;
    storeForm.defaultDiscount = currentStore.value.defaultDiscount ?? 0;
    storeForm.unitOptions = normalizeOptions(currentStore.value.unitOptions ?? [], DEFAULT_UNIT_OPTIONS);
    storeForm.categoryOptions = normalizeOptions(currentStore.value.categoryOptions ?? [], DEFAULT_CATEGORY_OPTIONS);
    newUnit.value = '';
    newCategory.value = '';
};

const addUnitOption = () => {
    if (!canEdit.value) return;
    const value = newUnit.value.trim();
    if (!value) return;
    if (storeForm.unitOptions.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        showToast('Unit already added.', 'info');
        newUnit.value = '';
        return;
    }
    storeForm.unitOptions = normalizeOptions([...storeForm.unitOptions, value], DEFAULT_UNIT_OPTIONS);
    newUnit.value = '';
    showToast('Unit added.', 'success');
};

const removeUnitOption = (unit: string) => {
    if (!canEdit.value) return;
    if (storeForm.unitOptions.length <= 1) {
        showToast('Keep at least one unit.', 'info');
        return;
    }
    storeForm.unitOptions = storeForm.unitOptions.filter((entry) => entry !== unit);
};

const addCategoryOption = () => {
    if (!canEdit.value) return;
    const value = newCategory.value.trim();
    if (!value) return;
    if (storeForm.categoryOptions.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        showToast('Category already added.', 'info');
        newCategory.value = '';
        return;
    }
    storeForm.categoryOptions = normalizeOptions([...storeForm.categoryOptions, value], DEFAULT_CATEGORY_OPTIONS);
    newCategory.value = '';
    showToast('Category added.', 'success');
};

const removeCategoryOption = (category: string) => {
    if (!canEdit.value) return;
    if (storeForm.categoryOptions.length <= 1) {
        showToast('Keep at least one category.', 'info');
        return;
    }
    storeForm.categoryOptions = storeForm.categoryOptions.filter((entry) => entry !== category);
};

const saveSettings = async () => {
    if (!currentStore.value || !canEdit.value) return;
    isSaving.value = true;
    try {
        const payload = {
            ...storeForm,
            unitOptions: normalizeOptions(storeForm.unitOptions, DEFAULT_UNIT_OPTIONS),
            categoryOptions: normalizeOptions(storeForm.categoryOptions, DEFAULT_CATEGORY_OPTIONS),
        };
        await updateStore(currentStore.value.id, payload);
        await storeContext.fetchStores();
        showToast('Store settings updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update store settings.';
        showToast(message, 'error');
    } finally {
        isSaving.value = false;
    }
};

const archiveStore = async () => {
    if (!currentStore.value || !canArchive.value) return;
    const confirmed = window.confirm(
        `Archive ${currentStore.value.name}? This will remove it from active use for all members.`,
    );
    if (!confirmed) return;
    isArchiving.value = true;
    try {
        await deleteStore(currentStore.value.id);
        showToast('Store archived.', 'success');
        await storeContext.fetchStores();
        if (storeContext.stores.length > 0) {
            storeContext.setCurrentStore(storeContext.stores[0].id);
        } else {
            storeContext.currentStoreId = null;
            localStorage.removeItem('currentStoreId');
        }
        router.push('/stores');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to archive store.';
        showToast(message, 'error');
    } finally {
        isArchiving.value = false;
    }
};

const goToStores = () => router.push('/stores');
const goToTeam = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/team`);
};
const goToPlan = () => router.push('/account/plan');

onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    resetForm();
});

watch(
    () => currentStore.value,
    (store) => {
        if (store) resetForm();
    }
);
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
}

/* ── Page shell ── */
.st-page {
    min-height: 100vh;
    background: var(--c-bg);
    padding: 2.5rem 1.5rem 4rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
}

.st-shell {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ── Page header ── */
.st-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
}

.st-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.st-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent);
    width: fit-content;
}

.st-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    color: var(--c-text);
    letter-spacing: -0.03em;
    line-height: 1.15;
}

.st-subtitle {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
    line-height: 1.5;
}

.st-header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    padding-top: 0.25rem;
}

/* ── Panels ── */
.st-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.st-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.st-panel-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.st-panel-sub {
    margin: 0;
    font-size: 0.85rem;
    color: var(--c-muted);
}

.st-role-badge {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    flex-shrink: 0;
}

.st-state {
    padding: 1.25rem 1.5rem;
    background: #f0fdf9;
    border-radius: 10px;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

/* ── Buttons ── */
.st-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.st-btn-ghost:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.st-btn-ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.st-btn-ghost--danger {
    color: #b91c1c;
    border-color: #fecaca;
}

.st-btn-ghost--danger:hover:not(:disabled) {
    background: #fff5f5;
    border-color: #fca5a5;
}

.st-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
    white-space: nowrap;
}

.st-btn-primary:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.st-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.st-btn-danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #b91c1c;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
}

.st-btn-danger:hover:not(:disabled) {
    background: #991b1b;
}

.st-btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ── Form ── */
.st-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.st-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.85rem 1.25rem;
}

.st-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.st-field input,
.st-field select {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    text-transform: none;
    letter-spacing: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.st-field input:focus,
.st-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.st-field input:disabled,
.st-field select:disabled {
    background: var(--c-bg);
    color: #94a3b8;
    cursor: not-allowed;
}

/* ── Toggle ── */
.st-toggle-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
}

.st-toggle-field input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
}

.st-toggle-track {
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: var(--c-border);
    position: relative;
    transition: background 0.2s ease;
    flex-shrink: 0;
}

.st-toggle-track::after {
    content: '';
    width: 18px;
    height: 18px;
    background: #ffffff;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s ease;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.st-toggle-field input:checked + .st-toggle-track {
    background: var(--c-accent);
}

.st-toggle-field input:checked + .st-toggle-track::after {
    transform: translateX(20px);
}

.st-toggle-field input:disabled + .st-toggle-track {
    background: var(--c-border);
    opacity: 0.6;
}

.st-toggle-label {
    user-select: none;
}

/* ── Catalog defaults box ── */
.st-catalog-box {
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.st-catalog-title {
    margin: 0 0 0.2rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-catalog-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.st-catalog-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem 1.5rem;
}

.st-catalog-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.st-catalog-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-muted);
}

.st-catalog-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
}

.st-catalog-input input {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.st-catalog-input input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.st-catalog-input input:disabled {
    background: var(--c-bg);
    color: #94a3b8;
}

.st-catalog-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.st-catalog-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f0fdf9;
    border: 1px solid #ccfbf1;
    color: #0f766e;
    border-radius: 6px;
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
}

.st-catalog-remove {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0;
    display: inline-flex;
    align-items: center;
}

.st-catalog-remove:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.st-catalog-empty {
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ── Form footer ── */
.st-form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
}

.st-permission-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ── Plan panel ── */
.st-plan-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.st-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

.st-plan-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.st-plan-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.st-plan-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--c-text);
    line-height: 1.2;
}

.st-plan-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
}

/* ── Feature access list ── */
.st-plan-features-title {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-feature-list {
    border: 1px solid var(--c-border);
    border-radius: 10px;
    overflow: hidden;
}

.st-feature-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    color: var(--c-text);
}

.st-feature-row + .st-feature-row {
    border-top: 1px solid var(--c-border);
}

.st-feature-row.locked .st-feature-name {
    color: var(--c-muted);
}

.st-feature-name {
    font-weight: 500;
}

.st-feature-badge {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
}

.st-feature-badge--included {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
}

.st-feature-badge--locked {
    background: #f1f5f9;
    color: var(--c-muted);
}

/* ── Plan CTA ── */
.st-plan-cta {
    background: rgba(13, 148, 136, 0.06);
    border: 1px solid rgba(13, 148, 136, 0.2);
    border-radius: 10px;
    padding: 1rem 1.25rem;
}

.st-plan-cta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.st-plan-cta-note {
    font-size: 0.85rem;
    color: var(--c-muted);
    flex: 1;
}

/* ── Team panel ── */
.st-team-body {
    display: flex;
    flex-direction: column;
}

.st-team-section {
    padding: 1.25rem 0;
}

.st-team-section + .st-team-section {
    border-top: 1px solid var(--c-border);
}

.st-team-section-title {
    margin: 0 0 0.2rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-team-section-sub {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin: 0 0 1rem;
}

/* ── Member rows ── */
.st-member-list {
    display: flex;
    flex-direction: column;
}

.st-member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}

.st-member-row:last-child {
    border-bottom: none;
}

.st-member-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.st-member-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--c-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.st-member-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.st-member-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ── Role select ── */
.st-role-select {
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.st-role-select:disabled {
    background: var(--c-bg);
    color: #94a3b8;
    cursor: not-allowed;
}

/* ── Invite form ── */
.st-invite-form {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.85rem 1rem;
    align-items: end;
}

.st-invite-form-action {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
}

/* ── Invite link card ── */
.st-invite-link-card {
    margin-top: 1rem;
    background: rgba(13, 148, 136, 0.05);
    border: 1px solid rgba(13, 148, 136, 0.18);
    border-radius: 10px;
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.st-invite-link-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.st-invite-link {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.st-invite-link input {
    flex: 1;
    min-width: 200px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    font-family: 'Inter', sans-serif;
    background: var(--c-surface);
    color: var(--c-muted);
}

/* ── Invite rows ── */
.st-invite-list {
    display: flex;
    flex-direction: column;
}

.st-invite-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}

.st-invite-row:last-child {
    border-bottom: none;
}

.st-invite-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ── Status pills ── */
.st-status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.st-status-pill.status-pill--warning {
    background: rgba(234, 179, 8, 0.15);
    color: #92400e;
}

.st-status-pill.status-pill--active {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
}

.st-status-pill.status-pill--inactive {
    background: #f1f5f9;
    color: #64748b;
}

/* ── Nav link cards ── */
.st-nav-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.st-nav-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    text-align: left;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
}

.st-nav-card:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.st-nav-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.st-nav-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent);
    flex-shrink: 0;
}

.st-nav-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
}

.st-nav-card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-nav-card-sub {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.st-nav-card-arrow {
    color: #94a3b8;
    flex-shrink: 0;
}

/* ── Danger panel ── */
.st-danger-panel {
    border-color: #fecaca;
    background: #fff5f5;
}

.st-danger-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.st-danger-text {
    margin: 0;
    color: #991b1b;
    font-size: 0.9rem;
    line-height: 1.6;
}

.st-danger-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

/* ── Responsive ── */
@media (max-width: 768px) {
    .st-form-grid {
        grid-template-columns: 1fr;
    }

    .st-catalog-grid {
        grid-template-columns: 1fr;
    }

    .st-plan-grid {
        grid-template-columns: 1fr;
    }

    .st-invite-form {
        grid-template-columns: 1fr;
    }

    .st-nav-links {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .st-page {
        padding: 1.5rem 1rem 3rem;
    }

    .st-panel {
        padding: 1.25rem;
    }
}
</style>
