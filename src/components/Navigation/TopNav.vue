<template>
    <nav class="topnav">
        <div class="topnav__container">

            <!-- Left: brand + nav links -->
            <div class="topnav__left">
                <RouterLink to="/stores" class="topnav__brand">
                    <img class="topnav__logo" src="@/assets/SmB-PoS.png" alt="SmB-PoS" />
                </RouterLink>

                <div v-if="isAuthenticated && currentStoreId" class="topnav__links">
                    <RouterLink
                        v-for="link in primaryLinks"
                        :key="link.key"
                        :to="`/stores/${currentStoreId}/${link.route}`"
                        class="topnav__item"
                        active-class="topnav__item--active"
                    >
                        <mdicon :name="link.icon" size="16" />
                        <span>{{ link.label }}</span>
                    </RouterLink>
                    <div v-if="showMoreMenu" ref="moreMenuRef" class="topnav__more">
                        <button
                            type="button"
                            class="topnav__item topnav__item--more"
                            :class="{ 'topnav__item--active': isMoreOpen }"
                            @click="toggleMore"
                        >
                            <mdicon name="dots-horizontal" size="16" />
                            <span>More</span>
                            <mdicon :name="isMoreOpen ? 'chevron-up' : 'chevron-down'" size="14" />
                        </button>
                        <Transition name="dropdown">
                            <div v-if="isMoreOpen" class="topnav__dropdown">
                                <template v-for="(grp, gi) in moreGroups" :key="grp.group">
                                    <div v-if="gi > 0" class="topnav__dropdown-divider"></div>
                                    <p class="topnav__dropdown-label">{{ grp.label }}</p>
                                    <template v-for="item in grp.items" :key="item.key">
                                        <RouterLink
                                            v-if="!item.locked"
                                            :to="`/stores/${currentStoreId}/${item.route}`"
                                            class="topnav__dropdown-item"
                                            @click="closeMore"
                                        >
                                            <mdicon :name="item.icon" size="18" />
                                            <span>{{ item.label }}</span>
                                        </RouterLink>
                                        <button
                                            v-else
                                            type="button"
                                            class="topnav__dropdown-item topnav__dropdown-item--locked"
                                            @click="openUpgradeFromMore(item.upgradeFeature!)"
                                        >
                                            <mdicon :name="item.icon" size="18" />
                                            <span>{{ item.label }}</span>
                                            <mdicon name="lock" size="14" class="lock-icon" />
                                        </button>
                                    </template>
                                </template>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>

            <!-- Right: verify badge + profile -->
            <div class="topnav__right">
                <RouterLink v-if="showVerifyEmail" class="topnav__verify" to="/verify-email">
                    <mdicon name="email-alert" size="16" />
                    <span>Verify email</span>
                </RouterLink>

                <!-- Unauthenticated -->
                <div v-if="!isAuthenticated" class="topnav__auth">
                    <RouterLink class="topnav__auth-link" to="/login">Login</RouterLink>
                    <RouterLink class="topnav__auth-cta" to="/register">
                        <mdicon name="account-plus" size="16" />
                        <span>Sign up</span>
                    </RouterLink>
                </div>

                <!-- Profile button -->
                <div v-if="isAuthenticated" ref="profileMenuRef" class="topnav__profile-wrap">
                    <button type="button" class="topnav__profile-btn" @click="toggleProfile">
                        <span class="topnav__avatar">{{ userInitials }}</span>
                        <span class="topnav__profile-meta">
                            <span class="topnav__profile-name">{{ displayName }}</span>
                            <span class="topnav__profile-store">
                                <mdicon name="store-outline" size="11" />
                                {{ currentStoreName }}
                            </span>
                        </span>
                        <mdicon
                            :name="isProfileOpen ? 'chevron-up' : 'chevron-down'"
                            size="14"
                            class="topnav__profile-chevron"
                        />
                    </button>

                    <Transition name="dropdown">
                        <div v-if="isProfileOpen" class="topnav__profile-dropdown">
                            <!-- User identity -->
                            <div class="topnav__pd-header">
                                <span class="topnav__pd-avatar">{{ userInitials }}</span>
                                <div class="topnav__pd-identity">
                                    <span class="topnav__pd-name">{{ displayName }}</span>
                                    <span class="topnav__pd-email">{{ userContext.profile?.email }}</span>
                                </div>
                            </div>

                            <div class="topnav__pd-divider"></div>

                            <!-- Switch store -->
                            <button
                                v-if="storeContext.stores.length > 0"
                                type="button"
                                class="topnav__pd-item"
                                @click="openStoreSwitcher"
                            >
                                <span class="topnav__pd-item-icon">
                                    <mdicon name="swap-horizontal" size="16" />
                                </span>
                                <span class="topnav__pd-item-label">Switch Store</span>
                                <span v-if="storeContext.stores.length > 1" class="topnav__pd-item-badge">
                                    {{ storeContext.stores.length }}
                                </span>
                            </button>

                            <!-- Manage / create stores -->
                            <RouterLink
                                to="/stores"
                                class="topnav__pd-item"
                                @click="closeProfile"
                            >
                                <span class="topnav__pd-item-icon">
                                    <mdicon name="store-plus-outline" size="16" />
                                </span>
                                <span class="topnav__pd-item-label">Manage Stores</span>
                            </RouterLink>

                            <RouterLink
                                to="/account/profile"
                                class="topnav__pd-item"
                                @click="closeProfile"
                            >
                                <span class="topnav__pd-item-icon">
                                    <mdicon name="account-circle-outline" size="16" />
                                </span>
                                <span class="topnav__pd-item-label">My Profile</span>
                            </RouterLink>

                            <RouterLink
                                to="/account/plan"
                                class="topnav__pd-item"
                                @click="closeProfile"
                            >
                                <span class="topnav__pd-item-icon">
                                    <mdicon name="credit-card-outline" size="16" />
                                </span>
                                <span class="topnav__pd-item-label">My Plan</span>
                                <span class="topnav__pd-item-tier">{{ effectivePlanLabel }}</span>
                            </RouterLink>

                            <div class="topnav__pd-divider"></div>

                            <button
                                type="button"
                                class="topnav__pd-item topnav__pd-item--danger"
                                :disabled="isLoggingOut"
                                @click="handleLogout"
                            >
                                <span class="topnav__pd-item-icon">
                                    <mdicon name="logout" size="16" />
                                </span>
                                <span class="topnav__pd-item-label">
                                    {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
                                </span>
                            </button>
                        </div>
                    </Transition>
                </div>

                <!-- Mobile hamburger -->
                <button
                    v-if="isAuthenticated && currentStoreId"
                    type="button"
                    class="topnav__hamburger"
                    :class="{ 'topnav__hamburger--open': isMobileMenuOpen }"
                    @click="toggleMobileMenu"
                >
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>
            </div>
        </div>

        <!-- Mobile menu -->
        <Transition name="mobile-menu">
            <div v-if="isMobileMenuOpen && isAuthenticated && currentStoreId" class="topnav__mobile">
                <div class="topnav__mobile-links">
                    <RouterLink
                        v-for="link in mobilePrimaryLinks"
                        :key="link.key"
                        :to="`/stores/${currentStoreId}/${link.route}`"
                        class="topnav__mobile-item"
                        @click="closeMobileMenu"
                    >
                        <mdicon :name="link.icon" size="20" /><span>{{ link.label }}</span>
                    </RouterLink>

                    <template v-for="grp in moreGroups" :key="grp.group">
                        <p class="topnav__mobile-label">{{ grp.label }}</p>
                        <template v-for="item in grp.items" :key="item.key">
                            <RouterLink
                                v-if="!item.locked"
                                :to="`/stores/${currentStoreId}/${item.route}`"
                                class="topnav__mobile-item"
                                @click="closeMobileMenu"
                            >
                                <mdicon :name="item.icon" size="20" /><span>{{ item.label }}</span>
                            </RouterLink>
                        </template>
                    </template>

                    <p class="topnav__mobile-label">Account</p>
                    <RouterLink to="/account/profile" class="topnav__mobile-item" @click="closeMobileMenu">
                        <mdicon name="account-circle-outline" size="20" /><span>My Profile</span>
                    </RouterLink>
                    <RouterLink to="/account/plan" class="topnav__mobile-item" @click="closeMobileMenu">
                        <mdicon name="credit-card-outline" size="20" /><span>My Plan</span>
                    </RouterLink>
                    <button type="button" class="topnav__mobile-item topnav__mobile-item--danger" @click="() => { closeMobileMenu(); handleLogout(); }">
                        <mdicon name="logout" size="20" /><span>Sign out</span>
                    </button>
                </div>
            </div>
        </Transition>
    </nav>

    <!-- Mobile bottom tab bar -->
    <nav v-if="showBottomNav" class="bottomnav">
        <RouterLink
            v-for="link in bottomNavLinks"
            :key="link.key"
            :to="`/stores/${currentStoreId}/${link.route}`"
            class="bottomnav__item"
            active-class="bottomnav__item--active"
        >
            <mdicon :name="link.icon" size="22" />
            <span class="bottomnav__label">{{ link.label }}</span>
        </RouterLink>
    </nav>

    <!-- Store switcher modal — teleported to body to avoid z-index issues -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isStoreSwitcherOpen" class="ss-backdrop" @click.self="closeStoreSwitcher">
                <div class="ss-modal" role="dialog" aria-modal="true" aria-label="Switch Store">
                    <div class="ss-header">
                        <div>
                            <h2 class="ss-title">Switch Store</h2>
                            <p class="ss-sub">Choose the store you want to work in.</p>
                        </div>
                        <button type="button" class="ss-close" @click="closeStoreSwitcher">
                            <mdicon name="close" size="20" />
                        </button>
                    </div>

                    <div class="ss-list">
                        <button
                            v-for="store in storeContext.stores"
                            :key="store.id"
                            type="button"
                            class="ss-store"
                            :class="{ 'ss-store--active': store.id === currentStoreId }"
                            @click="switchStore(store.id)"
                        >
                            <span class="ss-store-icon">
                                <mdicon name="store-outline" size="20" />
                            </span>
                            <span class="ss-store-info">
                                <span class="ss-store-name">
                                    {{ store.name }}
                                    <span v-if="store.storeType === 'WAREHOUSE'" class="ss-warehouse-tag">WH</span>
                                </span>
                                <span class="ss-store-meta">{{ store.currency }} &bull; {{ store.role }}</span>
                            </span>
                            <span v-if="store.id === currentStoreId" class="ss-store-check">
                                <mdicon name="check-circle" size="18" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logout } from '@/api/auth';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { canAccess, FeatureKey, getDefaultRouteForRole } from '@/utils/roleAccess';
import { hasPlanFeature, openPlanUpgradeModal, getPlanConfig } from '@/utils/planAccess';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

// ── Auth state ────────────────────────────────────────────
const hasToken = ref(false);
const isAuthenticated = computed(() => Boolean(userContext.profile) || hasToken.value);
const isEmailVerified = computed(() => userContext.profile?.emailVerified === true);
const showVerifyEmail = computed(() => Boolean(userContext.profile) && !isEmailVerified.value);

// ── Store / nav ───────────────────────────────────────────
const currentStoreId = computed(() => storeContext.currentStoreId);
const currentStoreName = computed(() => storeContext.currentStore?.name ?? 'No store');
const isWarehouse = computed(() => storeContext.currentStore?.storeType === 'WAREHOUSE');
const canViewProducts = computed(() => canAccess(storeContext.currentStore?.role, 'products'));
const canViewInventory = computed(() => canAccess(storeContext.currentStore?.role, 'inventory'));
const canViewPurchaseOrders = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrders'));
const canViewSuppliers = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrders'));
const canViewPos = computed(() => !isWarehouse.value && canAccess(storeContext.currentStore?.role, 'salesPos'));
const canViewReports = computed(() => canAccess(storeContext.currentStore?.role, 'reports'));
// AI Insights: owner/admin (summary + chat) or inventory manager (reorder), once AI is configured.
const canViewAi = computed(
    () =>
        ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'].includes(storeContext.currentStore?.role ?? '') &&
        !!storeContext.currentStore?.aiApiKeySet
);
const canViewSettings = computed(() => canAccess(storeContext.currentStore?.role, 'storeSettings'));
const canViewDailySales = computed(() =>
    userContext.features.includes('DAILY_SALES') &&
    ['OWNER', 'CASHIER'].includes(storeContext.currentStore?.role ?? '')
);
const canViewExpenses = computed(() => canAccess(storeContext.currentStore?.role, 'expenses'));
const planKnown = computed(() => userContext.planTier !== null);
const isPurchaseOrdersLocked = computed(() => planKnown.value && !hasPlanFeature(userContext.effectivePlan, 'purchaseOrders'));
const isExpensesLocked = computed(() => planKnown.value && !hasPlanFeature(userContext.effectivePlan, 'expenses'));

// ── Nav configuration ─────────────────────────────────────
// Single source of truth for the store nav. `primaryLinks` render inline;
// everything else collapses into the grouped "More" menu (and mobile menu).
type NavGroupKey = 'sell' | 'procurement' | 'insights' | 'settings';

interface NavLink {
    key: string;
    label: string;
    icon: string;
    route: string; // path suffix after /stores/:storeId/
    group: NavGroupKey;
    visible: boolean;
    locked?: boolean;
    upgradeFeature?: 'purchaseOrders' | 'expenses';
}

// Inline (primary) items per role. Owners/Admins get the focused set;
// other roles fall back to their full accessible primary set.
const primaryKeysByRole: Record<string, string[]> = {
    OWNER: ['reports', 'inventory', 'daily-sales', 'ai-insights'],
    ADMIN: ['reports', 'inventory', 'daily-sales', 'ai-insights'],
};
const defaultPrimaryKeys = ['pos', 'products', 'inventory', 'reports', 'daily-sales'];

const primaryKeys = computed(() => primaryKeysByRole[storeContext.currentStore?.role ?? ''] ?? defaultPrimaryKeys);

const allNavLinks = computed<NavLink[]>(() => [
    { key: 'pos', label: 'POS', icon: 'point-of-sale', route: 'pos', group: 'sell', visible: canViewPos.value },
    { key: 'products', label: 'Products', icon: 'package-variant', route: 'products', group: 'sell', visible: canViewProducts.value },
    { key: 'inventory', label: 'Inventory', icon: 'warehouse', route: 'inventory', group: 'sell', visible: canViewInventory.value },
    { key: 'reports', label: 'Reports', icon: 'chart-line', route: 'reports', group: 'insights', visible: canViewReports.value },
    { key: 'daily-sales', label: 'Daily Sales', icon: 'cash-register', route: 'daily-sales', group: 'insights', visible: canViewDailySales.value },
    { key: 'ai-insights', label: 'AI Insights', icon: 'robot-happy-outline', route: 'ai-insights', group: 'insights', visible: canViewAi.value },
    { key: 'purchase-orders', label: 'Purchase Orders', icon: 'truck-delivery', route: 'purchase-orders', group: 'procurement', visible: canViewPurchaseOrders.value, locked: isPurchaseOrdersLocked.value, upgradeFeature: 'purchaseOrders' },
    { key: 'suppliers', label: 'Suppliers', icon: 'account-group', route: 'suppliers', group: 'procurement', visible: canViewSuppliers.value, locked: isPurchaseOrdersLocked.value, upgradeFeature: 'purchaseOrders' },
    { key: 'expenses', label: 'Expenses', icon: 'cash-minus', route: 'expenses', group: 'procurement', visible: canViewExpenses.value, locked: isExpensesLocked.value, upgradeFeature: 'expenses' },
    { key: 'settings', label: 'Settings', icon: 'cog', route: 'settings', group: 'settings', visible: canViewSettings.value },
    { key: 'audit-logs', label: 'Audit Log', icon: 'history', route: 'audit-logs', group: 'settings', visible: canViewSettings.value },
]);

const primaryLinks = computed(() => {
    const keys = primaryKeys.value;
    return allNavLinks.value
        .filter((l) => l.visible && keys.includes(l.key))
        .sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
});

const groupOrder: NavGroupKey[] = ['sell', 'procurement', 'insights', 'settings'];
const groupLabels: Record<NavGroupKey, string> = {
    sell: 'Sell',
    procurement: 'Procurement',
    insights: 'Insights',
    settings: 'Settings',
};

const moreGroups = computed(() =>
    groupOrder
        .map((group) => ({
            group,
            label: groupLabels[group],
            items: allNavLinks.value.filter(
                (l) => l.visible && !primaryKeys.value.includes(l.key) && l.group === group
            ),
        }))
        .filter((g) => g.items.length > 0)
);

const showMoreMenu = computed(() => Boolean(currentStoreId.value) && moreGroups.value.length > 0);

// Mobile bottom tab bar — the important (primary) links, capped to fit the bar.
const bottomNavLinks = computed(() => primaryLinks.value.slice(0, 5));
const showBottomNav = computed(
    () => isAuthenticated.value && Boolean(currentStoreId.value) && bottomNavLinks.value.length > 0
);

// Hamburger menu: skip primary links already shown in the bottom tab bar to
// avoid duplication. Any primary links beyond the bar's cap still surface here.
const mobilePrimaryLinks = computed(() => {
    if (!showBottomNav.value) return primaryLinks.value;
    const bottomKeys = new Set(bottomNavLinks.value.map((l) => l.key));
    return primaryLinks.value.filter((l) => !bottomKeys.has(l.key));
});

// Reserve space at the bottom of the page so the fixed bar never covers content.
watch(
    showBottomNav,
    (val) => document.body.classList.toggle('has-bottom-nav', val),
    { immediate: true }
);

// ── Profile display ───────────────────────────────────────
const displayName = computed(() => {
    const name = userContext.profile?.fullName;
    if (name) return name.split(' ')[0];
    return userContext.profile?.email?.split('@')[0] ?? 'Account';
});

const userInitials = computed(() => {
    const name = userContext.profile?.fullName;
    if (name) {
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    return (userContext.profile?.email?.[0] ?? 'U').toUpperCase();
});

const effectivePlanLabel = computed(() => getPlanConfig(userContext.effectivePlan).label);

// ── Open/close state ──────────────────────────────────────
const isMoreOpen = ref(false);
const isProfileOpen = ref(false);
const isStoreSwitcherOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isLoggingOut = ref(false);

const moreMenuRef = ref<HTMLElement | null>(null);
const profileMenuRef = ref<HTMLElement | null>(null);

const toggleMore = () => { isMoreOpen.value = !isMoreOpen.value; };
const closeMore = () => { isMoreOpen.value = false; };
const toggleProfile = () => { isProfileOpen.value = !isProfileOpen.value; isMoreOpen.value = false; };
const closeProfile = () => { isProfileOpen.value = false; };
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value; };
const closeMobileMenu = () => { isMobileMenuOpen.value = false; };

const openStoreSwitcher = () => {
    isProfileOpen.value = false;
    isStoreSwitcherOpen.value = true;
};

const closeStoreSwitcher = () => {
    isStoreSwitcherOpen.value = false;
};

// ── Store switching ───────────────────────────────────────
const routeFallbacks: Partial<Record<string, string>> = {
    'product-edit': 'products',
    'product-create': 'products',
    'purchase-order-detail': 'purchase-orders',
    'purchase-receipt-detail': 'purchase-orders',
};

const switchStore = (storeId: string) => {
    closeStoreSwitcher();
    if (storeId === storeContext.currentStoreId) return;

    storeContext.setCurrentStore(storeId);
    const store = storeContext.stores.find((s) => s.id === storeId);
    const feature = route.meta.feature as FeatureKey | undefined;
    const fallbackRoute = getDefaultRouteForRole(store?.role);

    if (!route.params.storeId) {
        if (fallbackRoute) {
            router.push({ name: fallbackRoute, params: { storeId } });
            showToast('Store switched.', 'success');
        }
        return;
    }

    if (!feature || !store || !canAccess(store.role, feature)) {
        if (fallbackRoute) {
            showToast('Store switched. Redirected to an available page.', 'info');
            router.push({ name: fallbackRoute, params: { storeId } });
            return;
        }
        showToast('No access for this store.', 'info');
        router.push({ name: 'stores' });
        return;
    }

    const safeRouteName = routeFallbacks[String(route.name)] ?? (route.name as string | undefined);
    router.push({
        name: safeRouteName ?? 'stores',
        params: { ...route.params, storeId },
        query: route.query,
    });
    showToast('Store switched.', 'success');
};

// ── Auth ──────────────────────────────────────────────────
const updateTokenState = () => {
    hasToken.value = Boolean(localStorage.getItem('accessToken') || localStorage.getItem('token'));
};

const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('currentStoreId');
    if (typeof storeContext.$reset === 'function') storeContext.$reset();
    userContext.clear();
};

const handleLogout = async () => {
    if (isLoggingOut.value) return;
    isLoggingOut.value = true;
    closeProfile();
    try {
        await logout();
    } catch {
        // ignore — clear session regardless
    } finally {
        clearSession();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        isLoggingOut.value = false;
    }
};

const openUpgradeFromMore = (feature: 'purchaseOrders' | 'expenses') => {
    closeMore();
    openPlanUpgradeModal(feature);
};

// ── Click outside & keyboard ──────────────────────────────
const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target) return;
    if (isMoreOpen.value && moreMenuRef.value && !moreMenuRef.value.contains(target)) closeMore();
    if (isProfileOpen.value && profileMenuRef.value && !profileMenuRef.value.contains(target)) closeProfile();
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        closeMore();
        closeProfile();
        closeStoreSwitcher();
        closeMobileMenu();
    }
};

onMounted(() => {
    updateTokenState();
    window.addEventListener('auth:login', updateTokenState);
    window.addEventListener('auth:logout', updateTokenState);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:login', updateTokenState);
    window.removeEventListener('auth:logout', updateTokenState);
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
    document.body.classList.remove('has-bottom-nav');
});
</script>

<style scoped>
/* ── Base ── */
.topnav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    font-family: var(--app-font-sans);
}

.topnav__container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    height: 56px;
    max-width: 1400px;
    margin: 0 auto;
    gap: 1rem;
}

.topnav__left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-width: 0;
}

.topnav__brand {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    text-decoration: none;
}

.topnav__logo { height: 32px; width: auto; }

/* ── Nav links ── */
.topnav__links {
    display: flex;
    align-items: center;
    gap: 0.125rem;
}

.topnav__item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.65);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
    font-family: inherit;
}

.topnav__item:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

.topnav__item--active {
    color: #fff !important;
    background: rgba(13, 148, 136, 0.22) !important;
}

/* ── More dropdown ── */
.topnav__more { position: relative; }

.topnav__dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 196px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.375rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
    z-index: 200;
}

.topnav__dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.575rem 0.75rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 500;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.8);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    font-family: inherit;
}

.topnav__dropdown-item:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

.topnav__dropdown-label {
    margin: 0;
    padding: 0.5rem 0.75rem 0.25rem;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(255, 255, 255, 0.35);
}

.topnav__dropdown-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
    margin: 0.3rem 0.25rem;
}
.topnav__dropdown-item--locked { color: rgba(255, 255, 255, 0.35); cursor: default; }
.topnav__dropdown-item--locked:hover { background: transparent; }
.topnav__dropdown-item--locked .lock-icon { margin-left: auto; color: rgba(251, 191, 36, 0.7); }

/* ── Right side ── */
.topnav__right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.topnav__verify {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.3);
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    animation: pulse-glow 2.5s ease-in-out infinite;
}

@keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 6px rgba(251, 191, 36, 0.2); }
    50% { box-shadow: 0 0 14px rgba(251, 191, 36, 0.45); }
}

/* ── Auth buttons (unauthenticated) ── */
.topnav__auth { display: flex; align-items: center; gap: 0.75rem; }

.topnav__auth-link {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
}

.topnav__auth-link:hover { color: #fff; }

.topnav__auth-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
}

.topnav__auth-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.45);
}

/* ── Profile button ── */
.topnav__profile-wrap { position: relative; }

.topnav__profile-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.5rem 0.3rem 0.35rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    font-family: inherit;
    color: #fff;
}

.topnav__profile-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
}

.topnav__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    font-size: 0.72rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.02em;
    flex-shrink: 0;
}

.topnav__profile-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    line-height: 1;
}

.topnav__profile-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.topnav__profile-store {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.topnav__profile-chevron { color: rgba(255, 255, 255, 0.4); flex-shrink: 0; }

/* ── Profile dropdown ── */
.topnav__profile-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 240px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 0.375rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    z-index: 200;
}

.topnav__pd-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
}

.topnav__pd-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    font-size: 0.75rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
}

.topnav__pd-identity {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.topnav__pd-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.topnav__pd-email {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.topnav__pd-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
    margin: 0.25rem 0;
}

.topnav__pd-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.575rem 0.75rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.75);
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s, background 0.15s;
    font-family: inherit;
    text-align: left;
}

.topnav__pd-item:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
.topnav__pd-item:disabled { opacity: 0.5; cursor: not-allowed; }

.topnav__pd-item--danger { color: rgba(252, 165, 165, 0.85); }
.topnav__pd-item--danger:hover:not(:disabled) { color: #fca5a5; background: rgba(239, 68, 68, 0.1); }

.topnav__pd-item-icon {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
}

.topnav__pd-item-label { flex: 1; }

.topnav__pd-item-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.25);
    color: #2dd4bf;
    font-size: 0.65rem;
    font-weight: 700;
}

.topnav__pd-item-tier {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.3);
}

/* ── Hamburger ── */
.topnav__hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 36px;
    height: 36px;
    padding: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
}

.topnav__hamburger:hover { background: rgba(255, 255, 255, 0.14); }

.hamburger-line {
    width: 100%;
    height: 2px;
    background: #fff;
    border-radius: 2px;
    transition: all 0.25s ease;
}

.topnav__hamburger--open .hamburger-line:nth-child(1) { transform: rotate(45deg) translate(4px, 4px); }
.topnav__hamburger--open .hamburger-line:nth-child(2) { opacity: 0; }
.topnav__hamburger--open .hamburger-line:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

/* ── Mobile menu ── */
.topnav__mobile {
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    padding: 0.75rem 1rem 1rem;
}

.topnav__mobile-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
}

.topnav__mobile-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.875rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.75);
    background: rgba(255, 255, 255, 0.04);
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: color 0.15s, background 0.15s;
}

.topnav__mobile-item:hover,
.topnav__mobile-item.router-link-active {
    color: #fff;
    background: rgba(13, 148, 136, 0.18);
}

.topnav__mobile-label {
    grid-column: 1 / -1;
    margin: 0.5rem 0 0;
    padding: 0 0.25rem;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(255, 255, 255, 0.35);
}

.topnav__mobile-item--danger { color: rgba(252, 165, 165, 0.8); }
.topnav__mobile-item--danger:hover { color: #fca5a5; background: rgba(239, 68, 68, 0.1); }

/* ── Transitions ── */
.dropdown-enter-active,
.dropdown-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

.mobile-menu-enter-active,
.mobile-menu-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.mobile-menu-enter-from,
.mobile-menu-leave-to { opacity: 0; transform: translateY(-12px); }

.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .ss-modal,
.modal-leave-active .ss-modal { transition: transform 0.2s ease; }
.modal-enter-from .ss-modal,
.modal-leave-to .ss-modal { transform: translateY(12px) scale(0.98); }

/* ── Store switcher modal ── */
.ss-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 500;
}

.ss-modal {
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    overflow: hidden;
}

.ss-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.ss-title {
    font-size: 1rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 0.2rem;
    letter-spacing: -0.01em;
}

.ss-sub {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
}

.ss-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
}

.ss-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }

.ss-list {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 320px;
    overflow-y: auto;
}

.ss-store {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    border-radius: 12px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
    font-family: inherit;
    width: 100%;
}

.ss-store:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
}

.ss-store--active {
    background: rgba(13, 148, 136, 0.14);
    border-color: rgba(13, 148, 136, 0.3);
}

.ss-store-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}

.ss-store--active .ss-store-icon {
    background: rgba(13, 148, 136, 0.2);
    color: #2dd4bf;
}

.ss-store-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
}

.ss-store-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.ss-store--active .ss-store-name { color: #fff; }

.ss-warehouse-tag {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.25);
    color: #a5b4fc;
    flex-shrink: 0;
}

.ss-store-meta {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.38);
}

.ss-store-check {
    color: #0d9488;
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

/* ── Responsive ── */
@media (max-width: 900px) {
    .topnav__links { display: none; }
    .topnav__hamburger { display: flex; }
    .topnav__profile-meta { display: none; }
    .topnav__profile-chevron { display: none; }
    .topnav__profile-btn { padding: 0.25rem; border-color: transparent; background: transparent; }
    .topnav__profile-btn:hover { background: rgba(255, 255, 255, 0.08); }
}

@media (max-width: 600px) {
    .topnav__container { padding: 0 0.875rem; }
    .topnav__logo { height: 28px; }
    .topnav__mobile-links { grid-template-columns: 1fr; }
    .topnav__verify span { display: none; }
}

/* ── Mobile bottom tab bar ── */
.bottomnav { display: none; }

@media (max-width: 900px) {
    .bottomnav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: linear-gradient(0deg, #0f172a 0%, #1e293b 100%);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.25);
        padding-bottom: env(safe-area-inset-bottom);
    }

    .bottomnav__item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        min-height: 56px;
        padding: 0.45rem 0.25rem;
        color: rgba(255, 255, 255, 0.55);
        text-decoration: none;
        font-size: 0.62rem;
        font-weight: 600;
        transition: color 0.15s;
    }

    .bottomnav__item:active { color: #fff; }

    .bottomnav__item--active { color: #2dd4bf; }

    .bottomnav__label {
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>

<style>
/* Global: reserve space so the fixed mobile bottom bar never covers content. */
@media (max-width: 900px) {
    body.has-bottom-nav { padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
}
</style>
