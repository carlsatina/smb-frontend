import { apiClient } from './client';

export const listStores = () => {
    return apiClient.request<{
        stores: Array<{
            id: string;
            name: string;
            timezone: string;
            currency: string;
            allowNegativeStock: boolean;
            lowStockThreshold: number;
            unitOptions: string[];
            categoryOptions: string[];
            defaultTaxRate: number;
            defaultDiscount: number;
            role: string;
            ownerPlanTier: string;
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
        timezone?: string;
        currency?: string;
        allowNegativeStock?: boolean;
        lowStockThreshold?: number;
        unitOptions?: string[];
        categoryOptions?: string[];
        defaultTaxRate?: number;
        defaultDiscount?: number;
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
