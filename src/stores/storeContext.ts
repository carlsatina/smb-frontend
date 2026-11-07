import type { SalesChannel } from '@/utils/salesChannels';
import { defineStore } from 'pinia';
import { listStores } from '@/api/stores';

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
    subcategoryOptions: Record<string, string[]>;
    salesChannels: SalesChannel[];
    expenseCategoryOptions: string[];
    defaultTaxRate: number;
    defaultDiscount: number;
    cashierSalesHistoryLimit: number | null;
    paymentMethods: string[];
    aiProvider: 'OPENAI' | 'ANTHROPIC' | null;
    aiModel: string | null;
    aiApiKeySet: boolean;
    aiApiKeyLast4: string | null;
    role: string;
    permissions: string[];
    // The account is read-only for non-payment (applies to every member).
    billingSuspended: boolean;
    // Sent, unpaid bills for months that have ended (owners/admins only).
    billingOverdue: { year: number; month: number; amount: number }[];
};

export const useStoreContextStore = defineStore('storeContext', {
    state: () => ({
        stores: [] as StoreSummary[],
        currentStoreId: localStorage.getItem('currentStoreId'),
        isLoading: false,
        hasLoaded: false,
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
                this.hasLoaded = true;
            }
        },
        // Re-reads the signed-in member's role and permissions without replacing the
        // store objects, so open forms (e.g. Store Settings) aren't reset.
        async refreshPermissions() {
            if (!this.hasLoaded) return;
            try {
                const data = await listStores();
                const fresh = new Map(data.stores.map((store) => [store.id, store]));
                this.stores.forEach((store) => {
                    const next = fresh.get(store.id);
                    if (!next) return;
                    if (store.role !== next.role) store.role = next.role;
                    if (JSON.stringify(store.permissions) !== JSON.stringify(next.permissions)) {
                        store.permissions = next.permissions;
                    }
                });
            } catch {
                // Best effort; the server still enforces access.
            }
        },
        setCurrentStore(storeId: string) {
            this.currentStoreId = storeId;
            localStorage.setItem('currentStoreId', storeId);
        },
    },
});
