<template>
    <nav class="topnav">
        <div class="topnav__container">
            <div class="topnav__left">
                <RouterLink to="/stores" class="topnav__brand">
                    <img class="topnav__logo" src="@/assets/SmB-PoS.png" alt="SmB-PoS" />
                </RouterLink>

                <div v-if="isAuthenticated && currentStoreId" class="topnav__links">
                    <RouterLink
                        v-if="canViewPos"
                        :to="`/stores/${currentStoreId}/pos`"
                        class="topnav__item topnav__item--pos"
                        active-class="topnav__item--active"
                    >
                        <mdicon name="point-of-sale" size="16" />
                        <span>POS</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewProducts"
                        :to="`/stores/${currentStoreId}/products`"
                        class="topnav__item topnav__item--products"
                        active-class="topnav__item--active"
                    >
                        <mdicon name="package-variant" size="16" />
                        <span>Products</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewInventory"
                        :to="`/stores/${currentStoreId}/inventory`"
                        class="topnav__item topnav__item--inventory"
                        active-class="topnav__item--active"
                    >
                        <mdicon name="warehouse" size="16" />
                        <span>Inventory</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewReports"
                        :to="`/stores/${currentStoreId}/reports`"
                        class="topnav__item topnav__item--reports"
                        active-class="topnav__item--active"
                    >
                        <mdicon name="chart-line" size="16" />
                        <span>Reports</span>
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
                                <RouterLink
                                    v-if="canViewPurchaseOrders && !isPurchaseOrdersLocked"
                                    :to="`/stores/${currentStoreId}/purchase-orders`"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="truck-delivery" size="18" />
                                    <span>Purchase Orders</span>
                                </RouterLink>
                                <button
                                    v-else-if="canViewPurchaseOrders && isPurchaseOrdersLocked"
                                    type="button"
                                    class="topnav__dropdown-item topnav__dropdown-item--locked"
                                    @click="openUpgradeFromMore('purchaseOrders')"
                                >
                                    <mdicon name="truck-delivery" size="18" />
                                    <span>Purchase Orders</span>
                                    <mdicon name="lock" size="14" class="lock-icon" />
                                </button>
                                <RouterLink
                                    v-if="canViewSuppliers && !isPurchaseOrdersLocked"
                                    :to="`/stores/${currentStoreId}/suppliers`"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="account-group" size="18" />
                                    <span>Suppliers</span>
                                </RouterLink>
                                <button
                                    v-else-if="canViewSuppliers && isPurchaseOrdersLocked"
                                    type="button"
                                    class="topnav__dropdown-item topnav__dropdown-item--locked"
                                    @click="openUpgradeFromMore('purchaseOrders')"
                                >
                                    <mdicon name="account-group" size="18" />
                                    <span>Suppliers</span>
                                    <mdicon name="lock" size="14" class="lock-icon" />
                                </button>
                                <RouterLink
                                    v-if="canViewSettings"
                                    :to="`/stores/${currentStoreId}/team`"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="account-group" size="18" />
                                    <span>Team</span>
                                </RouterLink>
                                <RouterLink
                                    v-if="canViewSettings"
                                    :to="`/stores/${currentStoreId}/settings`"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="cog" size="18" />
                                    <span>Settings</span>
                                </RouterLink>
                                <RouterLink
                                    v-if="canViewSettings"
                                    :to="`/stores/${currentStoreId}/audit-logs`"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="history" size="18" />
                                    <span>Audit Log</span>
                                </RouterLink>
                                <div class="topnav__dropdown-divider"></div>
                                <RouterLink
                                    to="/account/plan"
                                    class="topnav__dropdown-item"
                                    @click="closeMore"
                                >
                                    <mdicon name="credit-card-outline" size="18" />
                                    <span>My Plan</span>
                                </RouterLink>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>

            <div class="topnav__right">
                <RouterLink
                    v-if="showVerifyEmail"
                    class="topnav__verify"
                    to="/verify-email"
                >
                    <mdicon name="email-alert" size="16" />
                    <span>Verify email</span>
                </RouterLink>

                <StoreSwitcher v-if="showStoreSwitcher && isAuthenticated" />

                <RouterLink
                    v-if="isAuthenticated"
                    to="/stores"
                    class="topnav__stores-btn"
                    title="All stores"
                >
                    <mdicon name="store" size="18" />
                </RouterLink>

                <button
                    v-if="isAuthenticated"
                    type="button"
                    class="topnav__logout"
                    :disabled="isLoggingOut"
                    @click="handleLogout"
                >
                    <mdicon name="logout" size="16" />
                    <span class="topnav__logout-text">{{ isLoggingOut ? 'Logging out...' : 'Logout' }}</span>
                </button>

                <div v-if="!isAuthenticated" class="topnav__auth">
                    <RouterLink class="topnav__auth-link" to="/login">Login</RouterLink>
                    <RouterLink class="topnav__auth-cta" to="/register">
                        <mdicon name="account-plus" size="16" />
                        <span>Sign up</span>
                    </RouterLink>
                </div>

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

        <Transition name="mobile-menu">
            <div v-if="isMobileMenuOpen && isAuthenticated && currentStoreId" class="topnav__mobile">
                <div class="topnav__mobile-links">
                    <RouterLink
                        v-if="canViewPos"
                        :to="`/stores/${currentStoreId}/pos`"
                        class="topnav__mobile-item topnav__mobile-item--pos"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="point-of-sale" size="20" />
                        <span>Point of Sale</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewProducts"
                        :to="`/stores/${currentStoreId}/products`"
                        class="topnav__mobile-item topnav__mobile-item--products"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="package-variant" size="20" />
                        <span>Products</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewInventory"
                        :to="`/stores/${currentStoreId}/inventory`"
                        class="topnav__mobile-item topnav__mobile-item--inventory"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="warehouse" size="20" />
                        <span>Inventory</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewReports"
                        :to="`/stores/${currentStoreId}/reports`"
                        class="topnav__mobile-item topnav__mobile-item--reports"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="chart-line" size="20" />
                        <span>Reports</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewPurchaseOrders && !isPurchaseOrdersLocked"
                        :to="`/stores/${currentStoreId}/purchase-orders`"
                        class="topnav__mobile-item topnav__mobile-item--orders"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="truck-delivery" size="20" />
                        <span>Purchase Orders</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewSuppliers && !isPurchaseOrdersLocked"
                        :to="`/stores/${currentStoreId}/suppliers`"
                        class="topnav__mobile-item topnav__mobile-item--suppliers"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="account-group" size="20" />
                        <span>Suppliers</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewSettings"
                        :to="`/stores/${currentStoreId}/team`"
                        class="topnav__mobile-item topnav__mobile-item--team"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="account-group" size="20" />
                        <span>Team</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewSettings"
                        :to="`/stores/${currentStoreId}/settings`"
                        class="topnav__mobile-item topnav__mobile-item--settings"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="cog" size="20" />
                        <span>Settings</span>
                    </RouterLink>
                    <RouterLink
                        v-if="canViewSettings"
                        :to="`/stores/${currentStoreId}/audit-logs`"
                        class="topnav__mobile-item topnav__mobile-item--audit"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="history" size="20" />
                        <span>Audit Log</span>
                    </RouterLink>
                    <RouterLink
                        to="/account/plan"
                        class="topnav__mobile-item topnav__mobile-item--plan"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="credit-card-outline" size="20" />
                        <span>My Plan</span>
                    </RouterLink>
                    <RouterLink
                        to="/stores"
                        class="topnav__mobile-item topnav__mobile-item--stores"
                        @click="closeMobileMenu"
                    >
                        <mdicon name="store" size="20" />
                        <span>All Stores</span>
                    </RouterLink>
                </div>
            </div>
        </Transition>
    </nav>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { logout } from '@/api/auth';
import StoreSwitcher from '@/components/StoreSwitcher.vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { useUserContextStore } from '@/stores/userContext';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';

const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const currentStoreId = computed(() => storeContext.currentStoreId);
const showStoreSwitcher = computed(() => storeContext.stores.length > 1);
const canViewProducts = computed(() => canAccess(storeContext.currentStore?.role, 'products'));
const canViewInventory = computed(() => canAccess(storeContext.currentStore?.role, 'inventory'));
const canViewPurchaseOrders = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrders'));
const canViewSuppliers = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrders'));
const canViewPos = computed(() => canAccess(storeContext.currentStore?.role, 'salesPos'));
const canViewReports = computed(() => canAccess(storeContext.currentStore?.role, 'reports'));
const canViewSettings = computed(() => canAccess(storeContext.currentStore?.role, 'storeSettings'));
const isLoggingOut = ref(false);
const planKnown = computed(() => userContext.planTier !== null);
const isPurchaseOrdersLocked = computed(() => planKnown.value && !hasPlanFeature(userContext.planTier, 'purchaseOrders'));
const hasToken = ref(false);
const isAuthenticated = computed(() => Boolean(userContext.profile) || hasToken.value);
const isEmailVerified = computed(() => userContext.profile?.emailVerified === true);
const showVerifyEmail = computed(() => Boolean(userContext.profile) && !isEmailVerified.value);
const isMoreOpen = ref(false);
const isMobileMenuOpen = ref(false);
const moreMenuRef = ref<HTMLElement | null>(null);
const showMoreMenu = computed(() => {
    if (!currentStoreId.value) return false;
    return (
        canViewPurchaseOrders.value ||
        canViewSuppliers.value ||
        canViewSettings.value
    );
});

const updateTokenState = () => {
    hasToken.value = Boolean(localStorage.getItem('accessToken') || localStorage.getItem('token'));
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
});

const openUpgrade = (feature: 'purchaseOrders') => {
    openPlanUpgradeModal(feature);
};

const openUpgradeFromMore = (feature: 'purchaseOrders') => {
    closeMore();
    openUpgrade(feature);
};

const toggleMore = () => {
    isMoreOpen.value = !isMoreOpen.value;
};

const closeMore = () => {
    isMoreOpen.value = false;
};

const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
};

const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (isMoreOpen.value && moreMenuRef.value && target && !moreMenuRef.value.contains(target)) {
        closeMore();
    }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        closeMore();
        closeMobileMenu();
    }
};

const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('currentStoreId');
    if (typeof storeContext.$reset === 'function') {
        storeContext.$reset();
    }
};

const handleLogout = async () => {
    if (isLoggingOut.value) return;
    isLoggingOut.value = true;
    try {
        await logout();
    } catch (error) {
        // Ignore logout failures; still clear local state.
    } finally {
        clearSession();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        } else {
            router.push({ name: 'login' });
        }
        isLoggingOut.value = false;
    }
};
</script>

<style scoped>
.topnav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.topnav__container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    max-width: 1400px;
    margin: 0 auto;
    gap: 1rem;
}

.topnav__left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.topnav__brand {
    display: flex;
    align-items: center;
    text-decoration: none;
}

.topnav__logo {
    height: 32px;
    width: auto;
}

.topnav__links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.topnav__item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.7);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.topnav__item:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.topnav__item--active {
    color: #fff !important;
    background: rgba(13, 148, 136, 0.25) !important;
    box-shadow: 0 0 12px rgba(13, 148, 136, 0.2);
}

.topnav__more {
    position: relative;
}

.topnav__dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    min-width: 200px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.5rem;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    z-index: 50;
}

.topnav__dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.8);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.topnav__dropdown-item:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.topnav__dropdown-item--locked {
    color: rgba(255, 255, 255, 0.4);
}

.topnav__dropdown-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0.25rem 0.5rem;
}

.topnav__dropdown-item--locked .lock-icon {
    margin-left: auto;
    color: rgba(245, 158, 11, 0.8);
}

.topnav__right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.topnav__verify {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
    border: 1px solid rgba(251, 191, 36, 0.4);
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.3); }
    50% { box-shadow: 0 0 16px rgba(251, 191, 36, 0.5); }
}

.topnav__stores-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.05);
    text-decoration: none;
    transition: all 0.2s ease;
}

.topnav__stores-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
}

.topnav__logout {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    cursor: pointer;
    transition: all 0.2s ease;
}

.topnav__logout:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
}

.topnav__auth {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.topnav__auth-link {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s ease;
}

.topnav__auth-link:hover {
    color: #fff;
}

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
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
    transition: all 0.2s ease;
}

.topnav__auth-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
}

.topnav__hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 36px;
    height: 36px;
    padding: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.topnav__hamburger:hover {
    background: rgba(255, 255, 255, 0.15);
}

.hamburger-line {
    width: 100%;
    height: 2px;
    background: #fff;
    border-radius: 2px;
    transition: all 0.3s ease;
}

.topnav__hamburger--open .hamburger-line:nth-child(1) {
    transform: rotate(45deg) translate(4px, 4px);
}

.topnav__hamburger--open .hamburger-line:nth-child(2) {
    opacity: 0;
}

.topnav__hamburger--open .hamburger-line:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
}

.topnav__mobile {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem;
}

.topnav__mobile-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
}

.topnav__mobile-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
}

.topnav__mobile-item:hover,
.topnav__mobile-item.router-link-active {
    color: #fff;
    background: rgba(13, 148, 136, 0.2);
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
    transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
    opacity: 0;
    transform: translateY(-16px);
}

/* Responsive */
@media (max-width: 900px) {
    .topnav__links {
        display: none;
    }

    .topnav__hamburger {
        display: flex;
    }

    .topnav__logout-text {
        display: none;
    }

    .topnav__logout {
        padding: 0.5rem;
    }
}

@media (max-width: 600px) {
    .topnav__container {
        padding: 0.5rem 0.75rem;
    }

    .topnav__logo {
        height: 28px;
    }

    .topnav__mobile-links {
        grid-template-columns: 1fr;
    }

    .topnav__stores-btn {
        display: none;
    }

    .topnav__verify span {
        display: none;
    }
}
</style>
