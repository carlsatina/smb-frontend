<template>
    <TopNav v-if="showTopNav" />
    <BillingBanner v-if="showTopNav" />
    <ToastHost />
    <OfflineOverlay />
    <router-view />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TopNav from '@/components/Navigation/TopNav.vue';
import ToastHost from '@/components/ToastHost.vue';
import BillingBanner from '@/components/BillingBanner.vue';
import OfflineOverlay from '@/components/OfflineOverlay.vue';
import { useUserContextStore } from '@/stores/userContext';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const userContext = useUserContextStore();
const storeContext = useStoreContextStore();
const { showToast } = useToast();
const hideTopNavRoutes = new Set(['home', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email']);
const showTopNav = computed(() => {
    const routeName = route.name?.toString();
    if (!routeName) return true;
    if (route.meta?.requiresSuperAdmin || routeName.startsWith('admin')) return false;
    return !hideTopNavRoutes.has(routeName);
});


const handleAuthLogout = () => {
    userContext.clear();
    if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' });
    }
};

const handleAuthLogin = () => {
    userContext.fetchMe(true);
};

const handleStoreSuspended = (event: Event) => {
    const detail = (event as CustomEvent<{ message?: string | null }>).detail;
    showToast(detail?.message || 'Your access to this store has been suspended.', 'error', 6000);
    // The suspended store has dropped out of the list, so this either lands them
    // on another store they still belong to or clears the selection entirely.
    storeContext.fetchStores();
    if (router.currentRoute.value.path !== '/stores') {
        router.push('/stores');
    }
};

// A write was refused because the account went read-only for non-payment:
// refresh stores so the billing banner reflects it.
const handleBillingSuspended = () => {
    storeContext.fetchStores();
};

// Keep the member's permissions current when the owner changes them mid-session:
// refresh after a refused request and when the window regains focus (throttled).
let lastPermissionRefresh = 0;
const refreshPermissions = () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token || Date.now() - lastPermissionRefresh < 15000) return;
    lastPermissionRefresh = Date.now();
    storeContext.refreshPermissions();
};

onMounted(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
        userContext.fetchMe();
    }
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth:login', handleAuthLogin);
    window.addEventListener('store:suspended', handleStoreSuspended);
    window.addEventListener('store:billing-suspended', handleBillingSuspended);
    window.addEventListener('permissions:stale', refreshPermissions);
    window.addEventListener('focus', refreshPermissions);
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:logout', handleAuthLogout);
    window.removeEventListener('auth:login', handleAuthLogin);
    window.removeEventListener('store:suspended', handleStoreSuspended);
    window.removeEventListener('store:billing-suspended', handleBillingSuspended);
    window.removeEventListener('permissions:stale', refreshPermissions);
    window.removeEventListener('focus', refreshPermissions);
});
</script>

<style>
#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #0f172a;
    min-height: 100vh;
}
</style>
