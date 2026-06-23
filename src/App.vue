<template>
    <TopNav v-if="showTopNav" />
    <ToastHost />
    <PlanUpgradeModal :open="planModalOpen" :feature="planModalFeature" :message="planModalMessage" @close="closePlanModal" />
    <Loading v-if="isLoading" />
    <OfflineOverlay />
    <router-view />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TopNav from '@/components/Navigation/TopNav.vue';
import ToastHost from '@/components/ToastHost.vue';
import PlanUpgradeModal from '@/components/PlanUpgradeModal.vue';
import Loading from '@/components/Loading.vue';
import OfflineOverlay from '@/components/OfflineOverlay.vue';
import { useUserContextStore } from '@/stores/userContext';
import { isLoading } from '@/composables/useLoading';
import type { PlanFeature } from '@/utils/planAccess';

const route = useRoute();
const router = useRouter();
const userContext = useUserContextStore();
const hideTopNavRoutes = new Set(['home', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email']);
const showTopNav = computed(() => {
    const routeName = route.name?.toString();
    if (!routeName) return true;
    if (route.meta?.requiresSuperAdmin || routeName.startsWith('admin')) return false;
    return !hideTopNavRoutes.has(routeName);
});

const planModalOpen = ref(false);
const planModalFeature = ref<PlanFeature | null>(null);
const planModalMessage = ref<string | null>(null);

const handleAuthLogout = () => {
    userContext.clear();
    if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' });
    }
};

const handleAuthLogin = () => {
    userContext.fetchMe(true);
};

const handlePlanUpgrade = (event: Event) => {
    const detail = (event as CustomEvent<{ feature?: PlanFeature | null; message?: string | null }>).detail;
    planModalFeature.value = detail?.feature ?? null;
    planModalMessage.value = detail?.message ?? null;
    planModalOpen.value = true;
};

const closePlanModal = () => {
    planModalOpen.value = false;
    planModalFeature.value = null;
    planModalMessage.value = null;
};

onMounted(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
        userContext.fetchMe();
    }
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth:login', handleAuthLogin);
    window.addEventListener('plan:upgrade', handlePlanUpgrade);
});

onBeforeUnmount(() => {
    window.removeEventListener('auth:logout', handleAuthLogout);
    window.removeEventListener('auth:login', handleAuthLogin);
    window.removeEventListener('plan:upgrade', handlePlanUpgrade);
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
