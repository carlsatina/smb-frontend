<template>
    <section class="store-page">
        <PullToRefresh :on-refresh="refreshStores" :disabled="storeContext.isLoading" />

        <teleport to="body">
            <transition name="modal-fade" appear>
                <div v-if="showCreateModal" class="st-modal-overlay" @keyup.esc="closeCreateModal" tabindex="0">
                    <div class="st-modal" ref="createModalRef">
                        <div class="st-modal-header">
                            <div>
                                <h2>Create new store</h2>
                                <p>Set the defaults that drive pricing and inventory controls.</p>
                            </div>
                            <button class="st-modal-close" @click="closeCreateModal" aria-label="Close">
                                <mdicon name="close" size="18" />
                            </button>
                        </div>

                        <div v-if="!isEmailVerified" class="st-modal-body">
                            <div class="st-modal-gate">
                                <p>Verify your email before creating a store. Check your inbox or resend the link below.</p>
                                <button
                                    type="button"
                                    class="st-btn-primary"
                                    :disabled="isResendingVerification"
                                    @click="resendVerificationEmail"
                                >
                                    {{ isResendingVerification ? 'Sending...' : 'Resend verification email' }}
                                </button>
                            </div>
                        </div>

                        <div v-else-if="isRoleRestricted" class="st-modal-body">
                            <div class="st-modal-gate">
                                <p>Only store owners can create additional stores. Ask the current owner to grant you ownership.</p>
                            </div>
                        </div>

                        <div v-else-if="showSubscribeCta" class="st-modal-body">
                            <div class="st-modal-gate">
                                <p>An active subscription is required to create stores.</p>
                                <button type="button" class="st-btn-primary" @click="goToAccountPlan">
                                    View subscription plans →
                                </button>
                            </div>
                        </div>

                        <form v-else class="st-modal-body" @submit.prevent="createNewStore">
                            <label class="form-field">
                                Store name
                                <input ref="storeNameInputRef" v-model="storeForm.name" type="text" placeholder="Cafe Downtown" required />
                            </label>

                            <label class="form-field">
                                Timezone
                                <select v-model="storeForm.timezone">
                                    <option v-for="timezone in timezoneOptions" :key="timezone" :value="timezone">
                                        {{ timezone }}
                                    </option>
                                </select>
                            </label>

                            <label class="form-field">
                                Currency
                                <select v-model="storeForm.currency">
                                    <option v-for="currency in currencyOptions" :key="currency" :value="currency">
                                        {{ currency }}
                                    </option>
                                </select>
                            </label>

                            <label class="form-field">
                                Low stock threshold
                                <input
                                    v-model.number="storeForm.lowStockThreshold"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                />
                            </label>

                            <label class="toggle-field">
                                <input v-model="storeForm.allowNegativeStock" type="checkbox" />
                                <span class="toggle-track"></span>
                                <span class="toggle-label">Allow negative stock</span>
                            </label>

                            <div class="st-modal-footer">
                                <button type="button" class="st-btn-ghost" @click="closeCreateModal">Cancel</button>
                                <button class="st-btn-primary" type="submit" :disabled="!storeForm.name || isCreating">
                                    {{ isCreating ? 'Creating...' : 'Create store' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </transition>
        </teleport>

        <div class="store-shell">
            <header class="store-header">
                <div class="store-title">
                    <span class="store-eyebrow">Control Center</span>
                    <h1>Stores</h1>
                    <p>Switch between storefronts, tune inventory rules, and keep teams aligned.</p>
                </div>
                <div class="header-actions">
                    <button class="primary-button" @click="openCreateModal">
                        <mdicon name="plus" size="16" />
                        Create store
                    </button>
                </div>
            </header>

            <div class="stat-strip">
                <div class="stat">
                    <span class="stat-value">{{ storeCount }}</span>
                    <span class="stat-label">Total stores</span>
                </div>
                <div class="stat">
                    <span class="stat-value stat-value--text">{{ currentStoreName }}</span>
                    <span class="stat-label">Active store</span>
                </div>
                <div class="stat">
                    <span class="stat-value stat-value--text">{{ currentStoreRole }}</span>
                    <span class="stat-label">Your role</span>
                </div>
            </div>

            <div class="store-content">
                <section class="store-list-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Your stores</h2>
                            <p>Tap a card to switch context instantly.</p>
                        </div>
                    </div>

                    <SkeletonLoader v-if="storeContext.isLoading" :rows="4" label="Loading stores…" />
                    <div v-else-if="storeContext.stores.length === 0" class="empty-state">
                        <mdicon name="storefront-outline" size="34" class="empty-icon" />
                        <p class="empty-heading">No stores yet</p>
                        <p class="empty-sub">{{ emptyMessage }}</p>
                    </div>
                    <div v-else class="store-grid">
                        <article
                            v-for="store in storeContext.stores"
                            :key="store.id"
                            class="store-card"
                            :class="{
                                'store-card--active': store.id === storeContext.currentStoreId,
                                'store-card--menu-open': openMenuId === store.id,
                            }"
                        >
                            <div class="store-card-header">
                                <div class="store-title-row">
                                    <h3>{{ store.name }}</h3>
                                    <span v-if="store.storeType === 'WAREHOUSE'" class="store-warehouse-badge">Warehouse</span>
                                </div>
                                <div class="store-meta-row">
                                    <span class="store-pill">{{ store.role }}</span>
                                    <span class="store-chip">{{ store.timezone }}</span>
                                    <span class="store-chip">{{ store.currency }}</span>
                                </div>
                            </div>
                            <div class="store-actions" :ref="(el) => setActionContainerRef(store.id, el)">
                                <div class="store-actions-row">
                                    <button
                                        v-for="action in getInlineStoreActions(store)"
                                        :key="action.key"
                                        type="button"
                                        class="store-action"
                                        :class="{
                                            'store-action--active': action.active,
                                            'store-action--primary': action.primary,
                                            'store-action--pill': action.pill,
                                            'store-action--locked': action.lockedFeature,
                                        }"
                                        @click="handleStoreAction(action)"
                                    >
                                        {{ action.label }}
                                    </button>
                                    <button
                                        v-if="getOverflowStoreActions(store).length"
                                        type="button"
                                        class="store-action store-action--pill"
                                        @click.stop="toggleMenu(store.id)"
                                    >
                                        More
                                    </button>
                                </div>
                                <div
                                    v-if="openMenuId === store.id && getOverflowStoreActions(store).length"
                                    class="store-actions-menu"
                                >
                                    <button
                                        v-for="action in getOverflowStoreActions(store)"
                                        :key="action.key"
                                        type="button"
                                        class="store-action store-action--menu-item"
                                        :class="{
                                            'store-action--active': action.active,
                                            'store-action--primary': action.primary,
                                            'store-action--pill': action.pill,
                                            'store-action--locked': action.lockedFeature,
                                        }"
                                        @click="handleStoreAction(action)"
                                    >
                                        {{ action.label }}
                                    </button>
                                </div>
                            </div>
                            <div class="store-actions-mobile">
                                <button type="button" class="store-action store-action--pill" @click.stop="toggleMenu(store.id)">
                                    More
                                </button>
                                <div v-if="openMenuId === store.id" class="store-actions-menu">
                                    <button
                                        v-for="action in getVisibleStoreActions(store)"
                                        :key="action.key"
                                        type="button"
                                        class="store-action store-action--menu-item"
                                        :class="{
                                            'store-action--active': action.active,
                                            'store-action--primary': action.primary,
                                            'store-action--pill': action.pill,
                                            'store-action--locked': action.lockedFeature,
                                        }"
                                        @click="handleStoreAction(action)"
                                    >
                                        {{ action.label }}
                                    </button>
                                </div>
                            </div>
                            <div class="store-actions-measure" :ref="(el) => setActionMeasureRef(store.id, el)" aria-hidden="true">
                                <button
                                    v-for="action in getVisibleStoreActions(store)"
                                    :key="`${store.id}-${action.key}-measure`"
                                    type="button"
                                    class="store-action"
                                        :class="{
                                            'store-action--active': action.active,
                                            'store-action--primary': action.primary,
                                            'store-action--pill': action.pill,
                                            'store-action--locked': action.lockedFeature,
                                        }"
                                        tabindex="-1"
                                        :data-action-key="action.key"
                                    >
                                        {{ action.label }}
                                    </button>
                                <button
                                    type="button"
                                    class="store-action store-action--pill"
                                    tabindex="-1"
                                    data-action-key="__more__"
                                >
                                    More
                                </button>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { onClickOutside } from '@vueuse/core';
import { resendVerification } from '@/api/auth';
import { createStore } from '@/api/stores';
import PullToRefresh from '@/components/PullToRefresh.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { useStoreContextStore } from '@/stores/storeContext';
import type { StoreSummary } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess, FeatureKey } from '@/utils/roleAccess';
import { useUserContextStore } from '@/stores/userContext';
import { hasPlanFeature, openPlanUpgradeModal, PlanFeature } from '@/utils/planAccess';

const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

const canAccessFeature = (role: string | undefined, feature: FeatureKey) => {
    return canAccess(role, feature);
};

const storeForm = reactive({
    name: '',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    allowNegativeStock: true,
    lowStockThreshold: 0,
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
    'PHP',
    'USD',
    'EUR',
    'GBP',
    'AUD',
    'CAD',
    'SGD',
    'HKD',
    'JPY',
    'CNY',
    'KRW',
    'THB',
    'IDR',
    'MYR',
    'VND',
];

const subscriptionActive = computed(() => userContext.subscriptionActive);
const isSubscriptionLoading = computed(() => userContext.isLoading && !userContext.hasLoaded);
const isEmailVerified = computed(() => userContext.profile?.emailVerified === true);
const storeNameInputRef = ref<HTMLInputElement | null>(null);
const isResendingVerification = ref(false);
const isCreating = ref(false);
const showCreateModal = ref(false);
const createModalRef = ref<HTMLElement | null>(null);

const storeCount = computed(() => storeContext.stores.length);
const currentStoreName = computed(() => storeContext.currentStore?.name || 'None');
const currentStoreRole = computed(() => storeContext.currentStore?.role || 'N/A');
const hasOwnerRole = computed(() => storeContext.stores.some((store) => store.role === 'OWNER'));
const canCreateStore = computed(() => {
    if (!isEmailVerified.value) return false;
    if (subscriptionActive.value !== true) return false;
    if (storeContext.stores.length === 0) return true;
    return hasOwnerRole.value;
});
const isRoleRestricted = computed(
    () => subscriptionActive.value === true && storeContext.stores.length > 0 && !hasOwnerRole.value
);
const showSubscribeCta = computed(
    () => !isSubscriptionLoading.value && isEmailVerified.value && subscriptionActive.value !== true && !isRoleRestricted.value
);
type StoreAction = {
    key: string;
    label: string;
    visible: boolean;
    onClick: () => void;
    active?: boolean;
    primary?: boolean;
    pill?: boolean;
    lockedFeature?: PlanFeature;
};

const openMenuId = ref<string | null>(null);
const actionLayouts = ref<Record<string, { inline: string[]; overflow: string[] }>>({});
const actionContainerRefs = new Map<string, HTMLElement>();
const actionMeasureRefs = new Map<string, HTMLElement>();

const planKnown = computed(() => userContext.planTier !== null);
const isPurchaseOrdersLocked = computed(() => planKnown.value && !hasPlanFeature(userContext.planTier, 'purchaseOrders'));
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

const getStoreActions = (store: StoreSummary): StoreAction[] => [
    {
        key: 'use-store',
        label: store.id === storeContext.currentStoreId ? 'Current store' : 'Use store',
        visible: true,
        onClick: () => storeContext.setCurrentStore(store.id),
        active: store.id === storeContext.currentStoreId,
        pill: true,
    },
    {
        key: 'store-settings',
        label: 'Store settings',
        visible: canAccessFeature(store.role, 'storeSettings'),
        onClick: () => goToSettings(store.id),
    },
    {
        key: 'pos',
        label: 'Open POS',
        visible: canAccessFeature(store.role, 'salesPos'),
        onClick: () => goToPos(store.id),
    },
    {
        key: 'inventory',
        label: 'Open inventory',
        visible: canAccessFeature(store.role, 'inventory'),
        onClick: () => goToInventory(store.id),
    },
    {
        key: 'purchase-orders',
        label: 'Purchase orders',
        visible: canAccessFeature(store.role, 'purchaseOrders'),
        onClick: () => goToPurchaseOrders(store.id),
        lockedFeature: isPurchaseOrdersLocked.value ? 'purchaseOrders' : undefined,
    },
    {
        key: 'reports',
        label: 'Reports',
        visible: canAccessFeature(store.role, 'reports'),
        onClick: () => goToReports(store.id),
    },
    {
        key: 'products',
        label: 'Open products',
        visible: canAccessFeature(store.role, 'products'),
        onClick: () => goToProducts(store.id),
        primary: true,
    },
];

const getVisibleStoreActions = (store: StoreSummary) => getStoreActions(store).filter((action) => action.visible);

const getInlineStoreActions = (store: StoreSummary) => {
    const layout = actionLayouts.value[store.id];
    const actions = getVisibleStoreActions(store);
    if (!layout) return actions;
    return actions.filter((action) => layout.inline.includes(action.key));
};

const getOverflowStoreActions = (store: StoreSummary) => {
    const layout = actionLayouts.value[store.id];
    if (!layout) return [];
    const actions = getVisibleStoreActions(store);
    return actions.filter((action) => layout.overflow.includes(action.key));
};

const handleStoreAction = (action: StoreAction) => {
    if (action.lockedFeature) {
        openPlanUpgradeModal(action.lockedFeature);
        openMenuId.value = null;
        return;
    }
    action.onClick();
    openMenuId.value = null;
};

const toggleMenu = (storeId: string) => {
    openMenuId.value = openMenuId.value === storeId ? null : storeId;
};

const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.store-actions') && !target?.closest('.store-actions-mobile')) {
        openMenuId.value = null;
    }
};

const setActionContainerRef = (storeId: string, el: unknown) => {
    if (el instanceof HTMLElement) {
        actionContainerRefs.set(storeId, el);
        return;
    }
    actionContainerRefs.delete(storeId);
};

const setActionMeasureRef = (storeId: string, el: unknown) => {
    if (el instanceof HTMLElement) {
        actionMeasureRefs.set(storeId, el);
        return;
    }
    actionMeasureRefs.delete(storeId);
};

const computeActionLayout = (store: StoreSummary) => {
    const container = actionContainerRefs.get(store.id);
    const measure = actionMeasureRefs.get(store.id);
    if (!container || !measure) return;
    const actions = getVisibleStoreActions(store);
    if (actions.length === 0) return;
    const row = container.querySelector<HTMLElement>('.store-actions-row');
    const gapValue = getComputedStyle(row ?? container).gap || getComputedStyle(row ?? container).columnGap;
    const gap = Number.parseFloat(gapValue || '0') || 0;
    const containerWidth = (row ?? container).clientWidth;
    const widthByKey = new Map<string, number>();

    actions.forEach((action) => {
        const button = measure.querySelector<HTMLElement>(`[data-action-key="${action.key}"]`);
        if (button) {
            widthByKey.set(action.key, button.offsetWidth);
        }
    });

    const totalWidth = actions.reduce((sum, action, index) => {
        const width = widthByKey.get(action.key) ?? 0;
        return sum + width + (index > 0 ? gap : 0);
    }, 0);

    if (totalWidth <= containerWidth) {
        actionLayouts.value = {
            ...actionLayouts.value,
            [store.id]: { inline: actions.map((action) => action.key), overflow: [] },
        };
        return;
    }

    const moreButton = measure.querySelector<HTMLElement>('[data-action-key="__more__"]');
    const moreWidth = moreButton?.offsetWidth ?? 0;
    const available = Math.max(containerWidth - moreWidth - gap, 0);
    const inline: string[] = [];
    let used = 0;

    actions.forEach((action) => {
        const width = widthByKey.get(action.key) ?? 0;
        const nextWidth = inline.length === 0 ? width : used + gap + width;
        if (nextWidth <= available) {
            inline.push(action.key);
            used = nextWidth;
        }
    });

    const overflow = actions.filter((action) => !inline.includes(action.key)).map((action) => action.key);
    actionLayouts.value = {
        ...actionLayouts.value,
        [store.id]: { inline, overflow },
    };
};

const computeAllLayouts = () => {
    storeContext.stores.forEach((store) => computeActionLayout(store));
};

const emptyMessage = computed(() => {
    if (isSubscriptionLoading.value) return 'Checking subscription status...';
    if (!isEmailVerified.value) return 'Verify your email to create a store or accept invites.';
    if (subscriptionActive.value) return 'Create your first store to unlock inventory and POS flows.';
    return 'Subscribe to create a store, or ask an owner to invite you to an existing one.';
});
const createStoreSubtitle = computed(() => {
    if (isSubscriptionLoading.value) return 'Checking subscription status...';
    if (!isEmailVerified.value) return 'Verify your email to unlock store creation.';
    if (isRoleRestricted.value) return 'Only owners can create additional stores.';
    if (subscriptionActive.value) return 'Set the defaults that drive pricing and inventory controls.';
    return 'An active subscription is required to create stores.';
});
const createStoreHint = computed(() => {
    if (isSubscriptionLoading.value) return 'Please wait while we verify your subscription.';
    if (!isEmailVerified.value) return 'Check your inbox for a verification link, or resend it from the verify page.';
    if (isRoleRestricted.value) {
        return 'Ask an owner to create a new store or request an ownership role.';
    }
    if (subscriptionActive.value) return 'Set the defaults that drive pricing and inventory controls.';
    return 'Activate your subscription to unlock store creation or request an invite to join an existing store.';
});

const resetForm = () => {
    storeForm.name = '';
    storeForm.timezone = 'Asia/Manila';
    storeForm.currency = 'PHP';
    storeForm.allowNegativeStock = true;
    storeForm.lowStockThreshold = 0;
};

const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
    nextTick(() => storeNameInputRef.value?.focus());
};

const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
};

const resendVerificationEmail = async () => {
    if (isResendingVerification.value) return;
    const email = userContext.profile?.email;
    if (!email) {
        showToast('Add an email address to resend verification.', 'error');
        return;
    }
    try {
        isResendingVerification.value = true;
        await resendVerification(email);
        showToast('Verification email sent.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to resend verification email.';
        showToast(message, 'error');
    } finally {
        isResendingVerification.value = false;
    }
};

const createNewStore = async () => {
    if (!storeForm.name || !canCreateStore.value || isCreating.value) return;
    isCreating.value = true;
    try {
        const result = await createStore(storeForm);
        closeCreateModal();
        await storeContext.fetchStores();
        if (result.store?.id) {
            storeContext.setCurrentStore(result.store.id);
            router.push(`/stores/${result.store.id}/products`);
        }
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to create store.';
        showToast(message, 'error');
    } finally {
        isCreating.value = false;
    }
};

const goToProducts = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/products`);
};

const goToInventory = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/inventory`);
};

const goToPos = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/pos`);
};

const goToSettings = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/settings`);
};

const goToPurchaseOrders = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/purchase-orders`);
};

const goToReports = (storeId: string) => {
    storeContext.setCurrentStore(storeId);
    router.push(`/stores/${storeId}/reports`);
};

const goToAccountPlan = () => {
    router.push('/account/plan');
};

const refreshStores = async () => {
    await Promise.all([
        storeContext.fetchStores(),
        userContext.fetchMe(true),
    ]);
};

onClickOutside(createModalRef, () => {
    if (!isCreating.value) closeCreateModal();
});

watch(
    () => showCreateModal.value,
    (visible) => { document.body.style.overflow = visible ? 'hidden' : ''; }
);

onMounted(async () => {
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('resize', computeAllLayouts);
    await Promise.all([
        storeContext.fetchStores(),
        userContext.fetchMe(),
    ]);

    const pendingRaw = sessionStorage.getItem('pendingInvite');
    if (pendingRaw) {
        try {
            const { storeId, token } = JSON.parse(pendingRaw);
            if (storeId && token) {
                router.push(`/stores/${storeId}/invites/accept?token=${encodeURIComponent(token)}`);
                return;
            }
        } catch {
            sessionStorage.removeItem('pendingInvite');
        }
    }

    await nextTick();
    computeAllLayouts();
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('resize', computeAllLayouts);
});

watch(
    () => storeContext.stores,
    async () => {
        await nextTick();
        computeAllLayouts();
    },
    { deep: true }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        await nextTick();
        computeAllLayouts();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.store-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-accent-soft: rgba(13, 148, 136, 0.1);
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f6f8f9;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
    min-height: 100vh;
    padding: 2rem 1.5rem 3rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ============================================================
   SHELL / LAYOUT
============================================================ */
.store-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ============================================================
   HEADER
============================================================ */
.store-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.store-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: var(--c-accent-soft);
    color: var(--c-accent);
    margin-bottom: 0.5rem;
}

.store-title h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.4rem;
    color: var(--c-text);
}

.store-title p {
    color: var(--c-muted);
    max-width: 460px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.9rem;
}

.header-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
}

.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    border-radius: 9px;
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

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ============================================================
   STAT STRIP
============================================================ */
.stat-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    overflow: hidden;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem 1.4rem;
    border-left: 1px solid var(--c-border);
    min-width: 0;
}

.stat:first-child { border-left: none; }

.stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stat-value--text { font-size: 1.15rem; padding-top: 0.2rem; }

.stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ============================================================
   CONTENT GRID
============================================================ */
.store-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.store-list-panel {
    background: white;
    border-radius: 16px;
    padding: 1.75rem;
    border: 1px solid var(--c-border);
    box-shadow: var(--shadow-sm);
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
}

.panel-header h2 {
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.25rem;
    color: var(--c-text);
}

.panel-header p {
    color: var(--c-muted);
    margin: 0;
    font-size: 0.875rem;
}

/* ============================================================
   EMPTY / STATE
============================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 2.5rem 1rem;
    text-align: center;
}

.empty-icon { color: #cbd5e1; margin-bottom: 0.35rem; }

.empty-heading {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.empty-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
    max-width: 420px;
}

/* ============================================================
   STORE GRID & CARDS
============================================================ */
.store-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
}

.store-card {
    background: white;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    border: 1.5px solid var(--c-border);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 440px;
    gap: 0.8rem;
    align-items: center;
    position: relative;
    z-index: 1;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.store-card:hover {
    border-color: #cbd5e1;
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
}

.store-card--active {
    border-color: var(--c-accent);
    box-shadow: 0 4px 16px rgba(13, 148, 136, 0.15);
}

.store-card--active:hover {
    box-shadow: 0 6px 20px rgba(13, 148, 136, 0.22);
}

.store-card--menu-open {
    z-index: 20;
}

.store-card-header {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
    overflow: hidden;
}

.store-title-row {
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
}

.store-meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-width: 0;
}

.store-card h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--c-text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.store-pill {
    background: var(--c-accent-soft);
    color: var(--c-accent);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    flex-shrink: 0;
}

.store-chip {
    font-size: 0.72rem;
    color: var(--c-muted);
    flex-shrink: 0;
}

.store-warehouse-badge {
    margin-left: 0.5rem;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    background: rgba(99, 102, 241, 0.1);
    color: #4338ca;
    flex-shrink: 0;
}

/* ============================================================
   STORE ACTIONS
============================================================ */
.store-action {
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-weight: 500;
    font-size: 0.78rem;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    line-height: 1;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.store-action:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

.store-action--pill {
    border-radius: 999px;
    position: relative;
    z-index: 1;
}

.store-action--active {
    background: var(--c-accent);
    color: white;
    border-color: var(--c-accent);
    font-weight: 600;
}

.store-action--active:hover {
    background: var(--c-accent-dark);
    border-color: var(--c-accent-dark);
    color: white;
}

.store-action--primary {
    background: var(--c-accent);
    color: white;
    border-color: var(--c-accent);
    font-weight: 600;
}

.store-action--primary:hover {
    background: var(--c-accent-dark);
    border-color: var(--c-accent-dark);
}

.store-action--locked {
    opacity: 0.55;
    border-style: dashed;
    color: var(--c-muted);
}

.store-action--locked:hover {
    background: transparent;
    color: var(--c-muted);
    border-color: var(--c-border);
    border-style: dashed;
}

.store-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.store-actions {
    display: block;
    width: 100%;
    position: relative;
    align-self: center;
}

.store-actions-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    justify-content: flex-end;
    width: 100%;
    overflow: hidden;
}

.store-actions-measure {
    position: absolute;
    top: 0;
    left: -9999px;
    display: flex;
    gap: 0.5rem;
    pointer-events: none;
    visibility: hidden;
    height: 0;
    overflow: hidden;
}

.store-actions-mobile {
    display: none;
    position: relative;
    justify-content: flex-end;
    align-self: center;
}

.store-actions-menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    background: white;
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 0.4rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 0.25rem;
    min-width: 200px;
    z-index: 40;
}

.store-action--menu-item {
    width: 100%;
    justify-content: flex-start;
    border-radius: 8px;
    padding: 0.5rem 0.85rem;
    border-color: transparent;
}

.store-action--menu-item:hover {
    border-color: transparent;
    background: var(--c-accent-soft);
}

/* ============================================================
   CREATE STORE MODAL
============================================================ */
.st-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    padding: 1rem;
}

.st-modal {
    background: white;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    width: 100%;
    max-width: 480px;
    overflow: hidden;
}

.st-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--c-border);
}

.st-modal-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.st-modal-header p {
    font-size: 0.875rem;
    color: var(--c-muted);
    margin: 0;
}

.st-modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}

.st-modal-close:hover {
    background: var(--c-accent-soft);
    color: var(--c-text);
}

.st-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
}

.st-modal-gate {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem 0;
}

.st-modal-gate p {
    font-size: 0.9rem;
    color: var(--c-muted);
    margin: 0;
    line-height: 1.55;
}

.st-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.25rem;
}

.st-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.st-btn-ghost:hover:not(:disabled) {
    background: var(--c-accent-soft);
    border-color: #cbd5e1;
}

.st-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.st-btn-primary:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.st-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-active .st-modal,
.modal-fade-leave-active .st-modal {
    transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .st-modal,
.modal-fade-leave-to .st-modal {
    transform: scale(0.95);
}

.form-field {
    display: grid;
    gap: 0.45rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
}

.form-field input,
.form-field select {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.72rem 1rem;
    font-size: 0.92rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: white;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.form-field input::placeholder {
    color: #94a3b8;
}

.form-field input:focus,
.form-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* Toggle */
.toggle-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
    cursor: pointer;
}

.toggle-field input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.toggle-track {
    width: 40px;
    height: 22px;
    border-radius: 999px;
    background: #e2e8f0;
    position: relative;
    transition: background 0.2s ease;
    flex-shrink: 0;
}

.toggle-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    transition: transform 0.2s ease;
}

.toggle-field input:checked + .toggle-track {
    background: var(--c-accent);
}

.toggle-field input:checked + .toggle-track::after {
    transform: translateX(18px);
}

.toggle-label {
    color: var(--c-muted);
    font-weight: 500;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .store-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .store-card {
        grid-template-columns: 1fr;
        align-items: flex-start;
    }

    .store-actions {
        display: none;
    }

    .store-actions-mobile {
        display: flex;
        margin-top: 0.5rem;
        justify-content: flex-start;
    }
}

@media (max-width: 640px) {
    .store-page { padding: 1rem 0.875rem 2.5rem; }
    .store-shell { gap: 1rem; }
    .store-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .stat { padding: 0.75rem 0.7rem; }
    .stat-value { font-size: 1rem; }
    .stat-value--text { font-size: 0.9rem; }
    .stat-label { font-size: 0.6rem; }

    .store-list-panel { padding: 1.25rem 1rem; }
}
</style>
