import { defineStore } from 'pinia';
import { listStores } from '@/api/stores';
import type { PlanTier } from '@/utils/planAccess';

export type StoreType = 'RETAIL' | 'WAREHOUSE';

export type StoreSummary = {
    id: string;
    name: string;
    storeType: StoreType;
    timezone: string;
    currency: string;
    allowNegativeStock: boolean;
    lowStockThreshold: number;
    unitOptions: string[];
    categoryOptions: string[];
    defaultTaxRate: number;
    defaultDiscount: number;
    role: string;
    ownerPlanTier: PlanTier;
    ownerSubscriptionActive: boolean;
};

export const useStoreContextStore = defineStore('storeContext', {
    state: () => ({
        stores: [] as StoreSummary[],
        currentStoreId: localStorage.getItem('currentStoreId'),
        isLoading: false,
    }),
    getters: {
        currentStore(state) {
            return state.stores.find((store) => store.id === state.currentStoreId) ?? null;
        },
    },
    actions: {
        async fetchStores() {
            this.isLoading = true;
            try {
                const data = await listStores();
                this.stores = data.stores;
                const hasCurrent =
                    this.currentStoreId !== null &&
                    this.currentStoreId !== undefined &&
                    this.stores.some((store) => store.id === this.currentStoreId);
                if (!hasCurrent) {
                    if (this.stores.length > 0) {
                        this.setCurrentStore(this.stores[0].id);
                    } else {
                        this.currentStoreId = null;
                        localStorage.removeItem('currentStoreId');
                    }
                }
            } catch (error) {
                this.stores = [];
            } finally {
                this.isLoading = false;
            }
        },
        setCurrentStore(storeId: string) {
            this.currentStoreId = storeId;
            localStorage.setItem('currentStoreId', storeId);
        },
    },
});
