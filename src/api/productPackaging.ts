import { apiClient } from './client';

export type PackagingLinePayload = {
    ingredientId: string;
    qtyPerUnit: number;
};

export type PackagingLineResponse = PackagingLinePayload & {
    id: string;
    ingredient?: {
        id: string;
        name: string;
        unit: string;
        category: string;
        costPerUnit: number;
        active: boolean;
        deletedAt?: string | null;
    } | null;
};

export const listPackagingLines = (storeId: string, productId: string) => {
    return apiClient.request<{ lines: PackagingLineResponse[] }>(
        `/api/v1/stores/${storeId}/products/${productId}/packaging`
    );
};

export const updatePackagingLines = (storeId: string, productId: string, lines: PackagingLinePayload[]) => {
    return apiClient.request<{ lines: PackagingLineResponse[] }>(
        `/api/v1/stores/${storeId}/products/${productId}/packaging`,
        {
            method: 'PUT',
            body: { lines },
        }
    );
};
