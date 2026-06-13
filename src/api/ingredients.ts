import { apiClient } from './client';

export type IngredientCategory = 'RAW_MATERIAL' | 'PACKAGING';

export type IngredientPayload = {
    name: string;
    unit: string;
    category?: IngredientCategory;
    costPerUnit: number;
    active?: boolean;
    lowStockThreshold?: number | null;
    purchaseUnit?: string | null;
    purchaseUnitSize?: number | null;
};

export type IngredientResponse = IngredientPayload & {
    id: string;
    category: IngredientCategory;
};

export const listIngredients = (storeId: string) => {
    return apiClient.request<{ ingredients: IngredientResponse[] }>(`/api/v1/stores/${storeId}/ingredients`);
};

export const createIngredient = (storeId: string, payload: IngredientPayload) => {
    return apiClient.request<{ ingredient: IngredientResponse }>(`/api/v1/stores/${storeId}/ingredients`, {
        method: 'POST',
        body: payload,
    });
};

export const updateIngredient = (storeId: string, ingredientId: string, payload: Partial<IngredientPayload>) => {
    return apiClient.request<{ ingredient: IngredientResponse }>(
        `/api/v1/stores/${storeId}/ingredients/${ingredientId}`,
        {
            method: 'PATCH',
            body: payload,
        }
    );
};

export const deleteIngredient = (storeId: string, ingredientId: string) => {
    return apiClient.request<void>(`/api/v1/stores/${storeId}/ingredients/${ingredientId}`, {
        method: 'DELETE',
    });
};

export const exportIngredients = (storeId: string) => {
    return apiClient.download(`/api/v1/stores/${storeId}/ingredients/export`);
};

export type ImportResult = {
    imported: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
};

export const importIngredients = (storeId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<ImportResult>(`/api/v1/stores/${storeId}/ingredients/import`, formData);
};
