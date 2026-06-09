<template>
    <section class="st-page">
        <div class="st-shell">

            <!-- Page header -->
            <header class="st-header">
                <div class="st-header-left">
                    <span class="st-eyebrow">Store Settings</span>
                    <h1 class="st-title">{{ storeTitle }}</h1>
                    <p class="st-subtitle">{{ currentStoreLabel }}</p>
                </div>
                <div class="st-header-right">
                    <span v-if="currentStore" class="st-role-badge">{{ currentStore.role }}</span>
                    <button class="st-btn-ghost" @click="goToStores">Back to stores</button>
                </div>
            </header>

            <!-- Body: sidebar + content -->
            <div class="st-body">

                <!-- Left sidebar nav -->
                <nav class="st-sidebar">
                    <div class="st-sidebar-group">
                        <span class="st-sidebar-group-label">Settings</span>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'profile' }" @click="activeSection = 'profile'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
                            Store profile
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'payment' }" @click="activeSection = 'payment'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                            Payment methods
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'catalog' }" @click="activeSection = 'catalog'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 10h16M4 14h10"/></svg>
                            Catalog defaults
                        </button>
                    </div>

                    <div class="st-sidebar-group">
                        <span class="st-sidebar-group-label">Navigate</span>
                        <button class="st-sidebar-item" :disabled="!currentStore" @click="goToTeam">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Team &amp; roles
                            <svg class="st-sidebar-external" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button class="st-sidebar-item" @click="goToPlan">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                            Plan &amp; subscription
                            <svg class="st-sidebar-external" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>

                    <div class="st-sidebar-group">
                        <button class="st-sidebar-item st-sidebar-item--danger" :class="{ 'is-active': activeSection === 'danger' }" @click="activeSection = 'danger'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Danger zone
                        </button>
                    </div>
                </nav>

                <!-- Right content area -->
                <div class="st-content">

                    <div v-if="storeContext.isLoading && !currentStore" class="st-state">Loading store settings…</div>
                    <div v-else-if="!currentStore" class="st-state">Store not found. Return to the store list to select another.</div>

                    <template v-else>

                        <!-- ── Store profile ── -->
                        <section v-if="activeSection === 'profile'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Store profile</h2>
                                <p class="st-section-sub">Basic identity, locale, and inventory defaults for this store.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveSettings">
                                <div class="st-form-grid">
                                    <label class="st-field">
                                        Store name
                                        <input v-model="storeForm.name" type="text" placeholder="Cafe Downtown" :disabled="!canEdit" required />
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
                                            <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Currency
                                        <select v-model="storeForm.currency" :disabled="!canEdit">
                                            <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Low stock threshold
                                        <input v-model.number="storeForm.lowStockThreshold" type="number" min="0" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Tax rate (%)
                                        <input v-model.number="storeForm.defaultTaxRate" type="number" min="0" max="100" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Discount (%)
                                        <input v-model.number="storeForm.defaultDiscount" type="number" min="0" max="100" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Cashier sales history limit
                                        <input v-model.number="storeForm.cashierSalesHistoryLimit" type="number" min="1" step="1" placeholder="No limit" :disabled="!canEdit" />
                                        <span class="st-field-hint">Max recent sales shown to cashier role. Leave blank for no limit.</span>
                                    </label>
                                </div>
                                <label class="st-toggle-field">
                                    <input v-model="storeForm.allowNegativeStock" type="checkbox" :disabled="!canEdit" />
                                    <span class="st-toggle-track"></span>
                                    <span class="st-toggle-label">Allow negative stock</span>
                                </label>
                                <p v-if="!canEdit" class="st-permission-note">Your role is {{ currentStore?.role }}. Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="resetForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || !storeForm.name || isSaving">
                                        {{ isSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Payment methods ── -->
                        <section v-if="activeSection === 'payment'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Payment methods</h2>
                                <p class="st-section-sub">Choose which payment methods are available at the POS.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveSettings">
                                <div class="st-pm-grid">
                                    <label v-for="pm in allPaymentMethods" :key="pm.value" class="st-pm-option" :class="{ 'st-pm-option--disabled': !canEdit }">
                                        <input type="checkbox" :value="pm.value" v-model="storeForm.paymentMethods" :disabled="!canEdit" />
                                        {{ pm.label }}
                                    </label>
                                </div>
                                <p v-if="!canEdit" class="st-permission-note">Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="resetForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || isSaving">
                                        {{ isSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Catalog defaults ── -->
                        <section v-if="activeSection === 'catalog'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Catalog defaults</h2>
                                <p class="st-section-sub">Define the unit and category dropdowns used when creating products.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveSettings">
                                <div class="st-catalog-box">
                                    <div class="st-catalog-group">
                                        <span class="st-catalog-label">Units</span>
                                        <div class="st-catalog-input">
                                            <input v-model="newUnit" type="text" placeholder="Add unit" :disabled="!canEdit" />
                                            <button class="st-btn-ghost" type="button" :disabled="!canEdit || !newUnit.trim()" @click="addUnitOption">Add</button>
                                        </div>
                                        <div v-if="storeForm.unitOptions.length" class="st-catalog-tags">
                                            <span v-for="unit in storeForm.unitOptions" :key="unit" class="st-catalog-tag">
                                                {{ unit }}
                                                <button type="button" class="st-catalog-remove" :disabled="!canEdit" @click="removeUnitOption(unit)">&times;</button>
                                            </span>
                                        </div>
                                        <div v-else class="st-catalog-empty">No units configured.</div>
                                    </div>
                                    <div class="st-catalog-group">
                                        <span class="st-catalog-label">Categories</span>
                                        <div class="st-catalog-input">
                                            <input v-model="newCategory" type="text" placeholder="Add category" :disabled="!canEdit" />
                                            <button class="st-btn-ghost" type="button" :disabled="!canEdit || !newCategory.trim()" @click="addCategoryOption">Add</button>
                                        </div>
                                        <div v-if="storeForm.categoryOptions.length" class="st-catalog-tags">
                                            <span v-for="category in storeForm.categoryOptions" :key="category" class="st-catalog-tag">
                                                {{ category }}
                                                <button type="button" class="st-catalog-remove" :disabled="!canEdit" @click="removeCategoryOption(category)">&times;</button>
                                            </span>
                                        </div>
                                        <div v-else class="st-catalog-empty">No categories configured.</div>
                                    </div>
                                </div>
                                <p v-if="!canEdit" class="st-permission-note">Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="resetForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || isSaving">
                                        {{ isSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Danger zone ── -->
                        <section v-if="activeSection === 'danger'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title st-section-title--danger">Danger zone</h2>
                                <p class="st-section-sub">Irreversible actions for this store. Proceed with caution.</p>
                            </div>
                            <div class="st-danger-card">
                                <div>
                                    <p class="st-danger-card-title">Archive store</p>
                                    <p class="st-danger-card-sub">Hides this store from all members and disables new activity. Data is retained but cannot be reversed without database access.</p>
                                </div>
                                <button class="st-btn-danger" type="button" :disabled="!canArchive || isArchiving" @click="archiveStore">
                                    {{ isArchiving ? 'Archiving…' : 'Archive store' }}
                                </button>
                            </div>
                            <p v-if="!canArchive" class="st-permission-note">Only owners can archive a store.</p>
                        </section>

                    </template>
                </div>
            </div>

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
    cashierSalesHistoryLimit: null as number | null,
    paymentMethods: ['CASH', 'CARD', 'TRANSFER', 'GCASH', 'MAYA', 'OTHER'] as string[],
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

const allPaymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'GCASH', label: 'GCash' },
    { value: 'MAYA', label: 'Maya' },
    { value: 'TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

const activeSection = ref<'profile' | 'payment' | 'catalog' | 'danger'>('profile');

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
    storeForm.cashierSalesHistoryLimit = currentStore.value.cashierSalesHistoryLimit ?? null;
    storeForm.paymentMethods = currentStore.value.paymentMethods?.length
        ? [...currentStore.value.paymentMethods]
        : ['CASH', 'CARD', 'TRANSFER', 'GCASH', 'MAYA', 'OTHER'];
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
    font-family: var(--app-font-sans);
    color: var(--c-text);
}

.st-shell {
    max-width: 1280px;
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

/* ── Sidebar + content body ── */
.st-body {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 2rem;
    align-items: start;
}

/* ── Left sidebar ── */
.st-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 0.75rem 0.5rem;
    position: sticky;
    top: 1.5rem;
}

.st-sidebar-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.25rem 0;
}

.st-sidebar-group + .st-sidebar-group {
    border-top: 1px solid var(--c-border);
    margin-top: 0.25rem;
    padding-top: 0.5rem;
}

.st-sidebar-group-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    padding: 0.2rem 0.75rem 0.4rem;
}

.st-sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    text-align: left;
    font-family: var(--app-font-sans);
    transition: background 0.12s, color 0.12s;
}

.st-sidebar-item:hover:not(:disabled) {
    background: #f1f5f9;
    color: var(--c-text);
}

.st-sidebar-item.is-active {
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-weight: 600;
}

.st-sidebar-item.is-active svg {
    color: var(--c-accent);
}

.st-sidebar-item--danger {
    color: #b91c1c;
}

.st-sidebar-item--danger:hover:not(:disabled) {
    background: #fef2f2;
    color: #991b1b;
}

.st-sidebar-item--danger.is-active {
    background: #fef2f2;
    color: #991b1b;
}

.st-sidebar-item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.st-sidebar-external {
    margin-left: auto;
    color: #cbd5e1;
    flex-shrink: 0;
}

/* ── Right content area ── */
.st-content {
    min-width: 0;
}

.st-section {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.st-section-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--c-border);
}

.st-section-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-section-title--danger {
    color: #b91c1c;
}

.st-section-sub {
    margin: 0;
    font-size: 0.85rem;
    color: var(--c-muted);
}

/* ── Danger card ── */
.st-danger-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    background: #fff5f5;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 1.1rem 1.25rem;
}

.st-danger-card-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #991b1b;
    margin: 0 0 0.2rem;
}

.st-danger-card-sub {
    font-size: 0.82rem;
    color: #b91c1c;
    margin: 0;
    max-width: 480px;
    line-height: 1.5;
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
    font-family: var(--app-font-sans);
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

.st-field-hint {
    font-size: 0.72rem;
    font-weight: 400;
    color: #94a3b8;
    text-transform: none;
    letter-spacing: 0;
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
.st-payment-methods {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.st-pm-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.st-pm-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    transition: background 0.12s, border-color 0.12s;
}

.st-pm-option:has(input:checked) {
    background: #f0fdf4;
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.st-pm-option input[type="checkbox"] {
    accent-color: var(--c-accent);
}

.st-pm-option--disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.st-catalog-box {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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

/* ── Responsive ── */

/* Tablet: sidebar collapses to horizontal tab strip */
@media (max-width: 900px) {
    .st-body {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .st-sidebar {
        position: static;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
        padding: 0.4rem 0.5rem;
        gap: 0;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .st-sidebar::-webkit-scrollbar {
        display: none;
    }

    .st-sidebar-group {
        flex-direction: row;
        flex-wrap: nowrap;
        padding: 0;
        gap: 0.15rem;
    }

    .st-sidebar-group + .st-sidebar-group {
        border-top: none;
        border-left: 1px solid var(--c-border);
        margin-top: 0;
        padding-top: 0;
        margin-left: 0.5rem;
        padding-left: 0.5rem;
    }

    .st-sidebar-group-label {
        display: none;
    }

    .st-sidebar-item {
        white-space: nowrap;
        font-size: 0.82rem;
        padding: 0.45rem 0.7rem;
    }

    .st-sidebar-external {
        display: none;
    }

    .st-form-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Mobile */
@media (max-width: 600px) {
    .st-page {
        padding: 1.25rem 0.75rem 3rem;
    }

    .st-shell {
        gap: 1.25rem;
    }

    .st-section {
        padding: 1.25rem 1rem;
    }

    .st-form-grid {
        grid-template-columns: 1fr;
    }

    .st-danger-card {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
