import type { PlanTier } from '@/utils/planAccess';
import { apiClient } from './client';

export const listStores = () => {
    return apiClient.request<{
        stores: Array<{
            id: string;
            name: string;
            storeType: 'RETAIL' | 'WAREHOUSE';
            timezone: string;
            currency: string;
            allowNegativeStock: boolean;
            lowStockThreshold: number;
            unitOptions: string[];
            categoryOptions: string[];
            defaultTaxRate: number;
            defaultDiscount: number;
            cashierSalesHistoryLimit: number | null;
            paymentMethods: string[];
            role: string;
            ownerPlanTier: PlanTier;
            ownerSubscriptionActive: boolean;
        }>;
    }>('/api/v1/stores');
};

export const createStore = (payload: {
    name: string;
    timezone?: string;
    currency?: string;
    allowNegativeStock?: boolean;
    lowStockThreshold?: number;
    unitOptions?: string[];
    categoryOptions?: string[];
}) => {
    return apiClient.request<{ store: { id: string; name: string } }>('/api/v1/stores', {
        method: 'POST',
        body: payload,
    });
};

export const updateStore = (
    storeId: string,
    payload: {
        name?: string;
        storeType?: 'RETAIL' | 'WAREHOUSE';
        timezone?: string;
        currency?: string;
        allowNegativeStock?: boolean;
        lowStockThreshold?: number;
        unitOptions?: string[];
        categoryOptions?: string[];
        defaultTaxRate?: number;
        defaultDiscount?: number;
        cashierSalesHistoryLimit?: number | null;
        paymentMethods?: string[];
    }
) => {
    return apiClient.request<{ store: { id: string; name: string } }>(`/api/v1/stores/${storeId}`, {
        method: 'PATCH',
        body: payload,
    });
};

export const deleteStore = (storeId: string) => {
    return apiClient.request<{ storeId: string }>(`/api/v1/stores/${storeId}`, {
        method: 'DELETE',
    });
};
