<template>
    <div class="flex items-center gap-3">
        <span class="switcher-label">Store</span>
        <select
            v-model="selectedStoreId"
            class="switcher-select"
        >
            <option v-for="store in storeContext.stores" :key="store.id" :value="store.id">
                {{ store.name }} ({{ store.role }})
            </option>
        </select>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess, FeatureKey, getDefaultRouteForRole } from '@/utils/roleAccess';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();
onMounted(async () => {
    if (storeContext.stores.length === 0) {
        await storeContext.fetchStores();
    }
});

const routeFallbacks: Partial<Record<string, string>> = {
    'product-edit': 'products',
    'product-create': 'products',
    'purchase-order-detail': 'purchase-orders',
    'purchase-receipt-detail': 'purchase-orders',
};

const selectedStoreId = computed({
    get: () => storeContext.currentStoreId ?? '',
    set: (value: string) => {
        storeContext.setCurrentStore(value);
        const feature = route.meta.feature as FeatureKey | undefined;
        const store = storeContext.stores.find((entry) => entry.id === value);
        const fallbackRoute = getDefaultRouteForRole(store?.role);

        if (!route.params.storeId) {
            if (fallbackRoute) {
                router.push({ name: fallbackRoute, params: { storeId: value } });
                showToast('Store switched.', 'success');
            }
            return;
        }

        if (!feature) {
            return;
        }
        if (!store || !canAccess(store.role, feature)) {
            if (fallbackRoute) {
                showToast('Store switched. Redirected to an available page.', 'info');
                router.push({ name: fallbackRoute, params: { storeId: value } });
                return;
            }
            showToast('No access for this store. Redirected to Stores.', 'info');
            router.push({ name: 'stores' });
            return;
        }
        if (route.params.storeId) {
            const safeRouteName = routeFallbacks[String(route.name)] || (route.name as string | undefined);
            if (safeRouteName && safeRouteName !== route.name) {
                router.push({
                    name: safeRouteName,
                    params: { storeId: value },
                    query: route.query,
                });
                showToast('Store switched. Showing list for this store.', 'info');
                return;
            }
            router.push({
                name: safeRouteName ?? 'stores',
                params: {
                    ...route.params,
                    storeId: value,
                },
                query: route.query,
            });
        }
    },
});
</script>

<style scoped>
.switcher-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #0f766e;
}

.switcher-select {
    border-radius: 999px;
    border: 1px solid rgba(15, 118, 110, 0.25);
    background: rgba(255, 255, 255, 0.9);
    padding: 0.35rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f172a;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
    transition: all 0.2s ease;
}

.switcher-select:focus {
    outline: none;
    border-color: rgba(15, 118, 110, 0.5);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
}
</style>
