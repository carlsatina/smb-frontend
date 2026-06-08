import { apiClient } from './client';

export type ProductPayload = {
    name: string;
    type: 'READY_MADE' | 'RECIPE';
    sku?: string | null;
    barcode?: string | null;
    price: number;
    cost?: number | null;
    unit: string;
    category?: string | null;
    active?: boolean;
    lowStockThreshold?: number | null;
    recipeLines?: {
        ingredientId: string;
        qtyPerProductUnit: number;
    }[];
};

export type ProductResponse = ProductPayload & {
    id: string;
    recipeLineCount?: number;
};

export const listProducts = (storeId: string) => {
    return apiClient.request<{ products: ProductResponse[] }>(`/api/v1/stores/${storeId}/products`);
};

export const getProduct = (storeId: string, productId: string) => {
    return apiClient.request<{ product: ProductResponse }>(
        `/api/v1/stores/${storeId}/products/${productId}`
    );
};

export const createProduct = (storeId: string, payload: ProductPayload) => {
    return apiClient.request<{ product: ProductResponse }>(
        `/api/v1/stores/${storeId}/products`,
        {
            method: 'POST',
            body: payload,
        }
    );
};

export const updateProduct = (storeId: string, productId: string, payload: Partial<ProductPayload>) => {
    return apiClient.request<{ product: ProductResponse }>(
        `/api/v1/stores/${storeId}/products/${productId}`,
        {
            method: 'PATCH',
            body: payload,
        }
    );
};

export const deleteProduct = (storeId: string, productId: string) => {
    return apiClient.request<void>(`/api/v1/stores/${storeId}/products/${productId}`, {
        method: 'DELETE',
    });
};

export const exportProducts = (storeId: string) => {
    return apiClient.download(`/api/v1/stores/${storeId}/products/export`);
};

export type ImportResult = {
    imported: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
};

export const importProducts = (storeId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<ImportResult>(`/api/v1/stores/${storeId}/products/import`, formData);
};
