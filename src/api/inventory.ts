import { apiClient } from './client';

export type StockItem = {
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    name: string;
    sku?: string | null;
    category?: string | null;
    unit: string;
    currentQty: number;
    lowStockThreshold: number;
    active: boolean;
    subType: 'READY_MADE' | 'RAW_MATERIAL' | 'PACKAGING';
};

export type MovementRecord = {
    id: string;
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    itemName: string;
    itemSku?: string | null;
    itemUnit?: string | null;
    itemCategory?: string | null;
    qtyDelta: number;
    unitCost?: number | null;
    type: string;
    referenceType?: string | null;
    referenceId?: string | null;
    note?: string | null;
    createdAt: string;
    createdBy?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
    counterpartStoreId?: string | null;
    counterpartStoreName?: string | null;
    counterpartStoreType?: string | null;
    counterpartMovementId?: string | null;
};

export type TransferStockPayload = {
    destinationStoreId: string;
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    qty: number;
    note?: string | null;
};

export type StockAdjustmentPayload = {
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    adjustmentMode?: 'DELTA' | 'SET';
    qtyDelta?: number;
    targetQty?: number | null;
    unitCost?: number | null;
    note?: string | null;
};

export const listStock = (storeId: string, params?: { itemType?: string; itemId?: string }) => {
    const search = new URLSearchParams();
    if (params?.itemType) {
        search.set('itemType', params.itemType);
    }
    if (params?.itemId) {
        search.set('itemId', params.itemId);
    }
    const query = search.toString();
    return apiClient.request<{ stock: StockItem[] }>(
        `/api/v1/stores/${storeId}/inventory/stock${query ? `?${query}` : ''}`
    );
};

export const listMovements = (
    storeId: string,
    params?: {
        itemType?: string;
        itemId?: string;
        type?: string;
        createdById?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
    }
) => {
    const search = new URLSearchParams();
    if (params?.itemType) {
        search.set('itemType', params.itemType);
    }
    if (params?.itemId) {
        search.set('itemId', params.itemId);
    }
    if (params?.type) {
        search.set('type', params.type);
    }
    if (params?.createdById) {
        search.set('createdById', params.createdById);
    }
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    if (params?.page) {
        search.set('page', String(params.page));
    }
    if (params?.pageSize) {
        search.set('pageSize', String(params.pageSize));
    }
    const query = search.toString();
    return apiClient.request<{ movements: MovementRecord[]; total: number; page: number; pageSize: number }>(
        `/api/v1/stores/${storeId}/inventory/movements${query ? `?${query}` : ''}`
    );
};

export const createStockAdjustment = (storeId: string, payload: StockAdjustmentPayload) => {
    return apiClient.request<{ movement: MovementRecord }>(
        `/api/v1/stores/${storeId}/inventory/adjustments`,
        {
            method: 'POST',
            body: payload,
        }
    );
};

export const transferStock = (storeId: string, payload: TransferStockPayload) => {
    return apiClient.request<{
        out: MovementRecord;
        inMovementId: string;
        destinationStoreName: string;
    }>(`/api/v1/stores/${storeId}/inventory/transfers`, {
        method: 'POST',
        body: payload,
    });
};

export type BatchTransferPayload = {
    destinationStoreId: string;
    items: Array<{ itemType: 'PRODUCT' | 'INGREDIENT'; itemId: string; qty: number }>;
    note?: string | null;
};

export const batchTransferStock = (storeId: string, payload: BatchTransferPayload) => {
    return apiClient.request<{
        transferred: number;
        destinationStoreName: string;
        movements: MovementRecord[];
    }>(`/api/v1/stores/${storeId}/inventory/transfers/batch`, {
        method: 'POST',
        body: payload,
    });
};
