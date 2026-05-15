import { apiClient } from './client';

export type RecipeLinePayload = {
    ingredientId: string;
    qtyPerProductUnit: number;
};

export type RecipeLineResponse = RecipeLinePayload & {
    id: string;
    ingredient?: {
        id: string;
        name: string;
        unit: string;
        costPerUnit: number;
        active: boolean;
        deletedAt?: string | null;
    } | null;
};

export const listRecipeLines = (storeId: string, productId: string) => {
    return apiClient.request<{ lines: RecipeLineResponse[] }>(
        `/api/v1/stores/${storeId}/products/${productId}/recipe-lines`
    );
};

export const updateRecipeLines = (storeId: string, productId: string, lines: RecipeLinePayload[]) => {
    return apiClient.request<{ lines: RecipeLineResponse[] }>(
        `/api/v1/stores/${storeId}/products/${productId}/recipe-lines`,
        {
            method: 'PUT',
            body: { lines },
        }
    );
};
