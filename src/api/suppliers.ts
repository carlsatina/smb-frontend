import { apiClient } from './client';

export type Supplier = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    createdAt: string;
    updatedAt: string;
};

export const listSuppliers = (storeId: string) => {
    return apiClient.request<{ suppliers: Supplier[] }>(`/api/v1/stores/${storeId}/suppliers`);
};

export const getSupplier = (storeId: string, supplierId: string) => {
    return apiClient.request<{ supplier: Supplier }>(`/api/v1/stores/${storeId}/suppliers/${supplierId}`);
};

export const createSupplier = (
    storeId: string,
    payload: {
        name: string;
        email?: string | null;
        phone?: string | null;
    }
) => {
    return apiClient.request<{ supplier: Supplier }>(`/api/v1/stores/${storeId}/suppliers`, {
        method: 'POST',
        body: payload,
    });
};

export const updateSupplier = (
    storeId: string,
    supplierId: string,
    payload: {
        name?: string;
        email?: string | null;
        phone?: string | null;
    }
) => {
    return apiClient.request<{ supplier: Supplier }>(
        `/api/v1/stores/${storeId}/suppliers/${supplierId}`,
        {
            method: 'PATCH',
            body: payload,
        }
    );
};

export const deleteSupplier = (storeId: string, supplierId: string) => {
    return apiClient.request(`/api/v1/stores/${storeId}/suppliers/${supplierId}`, {
        method: 'DELETE',
    });
};
