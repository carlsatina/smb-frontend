import { apiClient } from './client';

export type PurchaseOrderItemInput = {
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    qtyOrdered: number;
    unitCost?: number;
};

export type PurchaseOrderSummary = {
    id: string;
    supplierName: string | null;
    supplierId: string | null;
    status: string;
    expectedDate: string | null;
    createdAt: string;
    updatedAt: string;
    itemCount: number;
    qtyOrdered: number;
    qtyReceived: number;
    latestInvoiceNumber: string | null;
};

export type PurchaseOrderSummaryMetrics = {
    openCount: number;
    receivedCount: number;
    totalCount: number;
};

export type PurchaseOrderDetailItem = {
    id: string;
    itemType: string;
    itemId: string;
    product?: {
        id: string;
        name: string;
        sku?: string | null;
        unit?: string | null;
        type?: string | null;
    } | null;
    ingredient?: {
        id: string;
        name: string;
        unit?: string | null;
    } | null;
    qtyOrdered: number;
    qtyReceived: number;
    qtyRemaining: number;
    unitCost: number;
};

export type PurchaseOrderReceipt = {
    id: string;
    invoiceNumber: string | null;
    receivedAt: string;
    totalCost: number;
};

export type PurchaseOrderDetail = {
    id: string;
    supplierName: string | null;
    supplierId: string | null;
    status: string;
    expectedDate: string | null;
    createdAt: string;
    updatedAt: string;
    items: PurchaseOrderDetailItem[];
    receipts: PurchaseOrderReceipt[];
};

export type PurchaseReceiptItem = {
    id: string;
    itemType: string;
    itemId: string;
    name: string;
    unit?: string | null;
    qtyReceived: number;
    unitCost: number;
};

export type PurchaseReceiptDetail = {
    id: string;
    purchaseOrderId?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    invoiceNumber?: string | null;
    receivedAt: string;
    totalCost: number;
    receivedBy?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
    items: PurchaseReceiptItem[];
};

export type PurchaseReceiptSummary = {
    id: string;
    purchaseOrderId?: string | null;
    supplierName?: string | null;
    invoiceNumber?: string | null;
    receivedAt: string;
    totalCost: number;
    receivedBy?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
};

type ListPurchaseReceiptsResponse = {
    receipts: PurchaseReceiptSummary[];
    total: number;
    page: number;
    pageSize: number;
};

export type PurchaseReceiptAnalytics = {
    totalReceipts: number;
    totalSpend: number;
    avgReceipt: number;
    suppliers: Array<{
        supplierId?: string | null;
        supplierName: string;
        totalSpend: number;
        receiptCount: number;
    }>;
    categories: Array<{
        category: string;
        totalSpend: number;
        qtyReceived: number;
    }>;
};

type ListPurchaseOrdersResponse = {
    purchaseOrders: PurchaseOrderSummary[];
    total: number;
    page: number;
    pageSize: number;
    summary?: PurchaseOrderSummaryMetrics;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        search.append(key, String(value));
    });
    const query = search.toString();
    return query ? `?${query}` : '';
};

export const listPurchaseOrders = async (
    storeId: string,
    params: {
        status?: string;
        q?: string;
        supplierId?: string;
        supplierName?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.request<ListPurchaseOrdersResponse>(
        `/api/v1/stores/${storeId}/purchase-orders${query}`
    );
};

export const getPurchaseOrder = async (storeId: string, purchaseOrderId: string) => {
    return apiClient.request<{ purchaseOrder: PurchaseOrderDetail }>(
        `/api/v1/stores/${storeId}/purchase-orders/${purchaseOrderId}`
    );
};

export const getPurchaseReceipt = async (storeId: string, receiptId: string) => {
    return apiClient.request<{ receipt: PurchaseReceiptDetail }>(
        `/api/v1/stores/${storeId}/purchase-orders/receipts/${receiptId}`
    );
};

export const listPurchaseReceipts = async (
    storeId: string,
    params: {
        q?: string;
        from?: string;
        to?: string;
        supplierId?: string;
        supplierName?: string;
        page?: number;
        pageSize?: number;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.request<ListPurchaseReceiptsResponse>(
        `/api/v1/stores/${storeId}/purchase-orders/receipts${query}`
    );
};

export const getPurchaseReceiptSummary = async (
    storeId: string,
    params: { from?: string; to?: string; supplierId?: string; supplierName?: string } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.request<{ summary: PurchaseReceiptAnalytics }>(
        `/api/v1/stores/${storeId}/purchase-orders/receipts/summary${query}`
    );
};

export const createPurchaseOrder = async (
    storeId: string,
    payload: {
        supplierName?: string;
        supplierId?: string;
        expectedDate?: string;
        status?: string;
        items: PurchaseOrderItemInput[];
    }
) => {
    return apiClient.request<{ purchaseOrder: PurchaseOrderDetail }>(
        `/api/v1/stores/${storeId}/purchase-orders`,
        {
            method: 'POST',
            body: payload,
        }
    );
};

export const updatePurchaseOrder = async (
    storeId: string,
    purchaseOrderId: string,
    payload: {
        supplierName?: string;
        supplierId?: string;
        expectedDate?: string | null;
        status?: string;
    }
) => {
    return apiClient.request<{ purchaseOrder: PurchaseOrderDetail }>(
        `/api/v1/stores/${storeId}/purchase-orders/${purchaseOrderId}`,
        {
            method: 'PATCH',
            body: payload,
        }
    );
};

export const receivePurchaseOrder = async (
    storeId: string,
    purchaseOrderId: string,
    payload: {
        invoiceNumber?: string;
        receivedAt?: string;
        items: { itemType: 'PRODUCT' | 'INGREDIENT'; itemId: string; qtyReceived: number; unitCost?: number }[];
    }
) => {
    return apiClient.request<{ receiptId: string; purchaseOrder: PurchaseOrderDetail }>(
        `/api/v1/stores/${storeId}/purchase-orders/${purchaseOrderId}/receive`,
        {
            method: 'POST',
            body: payload,
        }
    );
};
