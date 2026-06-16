import type { PlanTier } from '@/utils/planAccess';
import { apiClient } from './client';

export type AiProvider = 'OPENAI' | 'ANTHROPIC';

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
            expenseCategoryOptions: string[];
            defaultTaxRate: number;
            defaultDiscount: number;
            cashierSalesHistoryLimit: number | null;
            paymentMethods: string[];
            aiProvider: AiProvider | null;
            aiModel: string | null;
            aiApiKeySet: boolean;
            aiApiKeyLast4: string | null;
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
        expenseCategoryOptions?: string[];
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

// Update AI integration settings. `aiApiKey` is write-only: pass a non-empty
// string to set/replace it, an empty string or null to clear it, or omit it to
// leave the stored key unchanged. The key is never returned by the API.
export const updateStoreAiSettings = (
    storeId: string,
    payload: {
        aiProvider?: AiProvider | null;
        aiModel?: string | null;
        aiApiKey?: string | null;
    }
) => {
    return apiClient.request<{
        store: { id: string; aiProvider: AiProvider | null; aiModel: string | null; aiApiKeySet: boolean; aiApiKeyLast4: string | null };
    }>(`/api/v1/stores/${storeId}/ai-settings`, {
        method: 'PATCH',
        body: payload,
    });
};

export type AiConnectionTestResult =
    | { ok: true; provider: AiProvider; model: string | null; latencyMs: number }
    | { ok: false; provider: AiProvider; message: string };

// Validates the store's saved AI provider key against the provider's Models API
// (no tokens are consumed). Requires a provider and saved key.
export const testStoreAiConnection = (storeId: string) => {
    return apiClient.request<AiConnectionTestResult>(`/api/v1/stores/${storeId}/ai-settings/test`, {
        method: 'POST',
    });
};

export type AiModelsResult = { ok: true; models: string[] } | { ok: false; message: string };

// Lists model IDs available to the store's saved AI provider key (no tokens used).
export const listStoreAiModels = (storeId: string) => {
    return apiClient.request<AiModelsResult>(`/api/v1/stores/${storeId}/ai-settings/models`);
};
