import { apiClient } from './client';

export type SaleItemInput = {
    productId: string;
    qty: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
};

export type SaleSummaryItem = {
    id: string;
    name: string;
    qty: number;
};

export type SaleSummary = {
    id: string;
    receiptNumber: number | null;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    createdAt: string;
    finalizedAt: string | null;
    voidedAt: string | null;
    itemCount: number;
    cashier?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
    items: SaleSummaryItem[];
};

export type SaleDetailItem = {
    id: string;
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
    product?: {
        id: string;
        name: string;
        sku?: string | null;
        unit?: string | null;
        type?: string | null;
    } | null;
};

export type SaleDetail = {
    id: string;
    receiptNumber: number | null;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    createdAt: string;
    finalizedAt: string | null;
    voidedAt: string | null;
    cashier?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
    items: SaleDetailItem[];
};

type ListSalesResponse = {
    sales: SaleSummary[];
    total: number;
    page: number;
    pageSize: number;
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

export const listSales = async (
    storeId: string,
    params: {
        status?: string;
        from?: string;
        to?: string;
        cashierId?: string;
        paymentMethod?: string;
        productId?: string;
        page?: number;
        pageSize?: number;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.request<ListSalesResponse>(`/api/v1/stores/${storeId}/sales${query}`);
};

export const getSale = async (storeId: string, saleId: string) => {
    return apiClient.request<{ sale: SaleDetail }>(`/api/v1/stores/${storeId}/sales/${saleId}`);
};

export const finalizeSale = async (
    storeId: string,
    payload: { items: SaleItemInput[]; paymentMethod: string }
) => {
    return apiClient.request<{ sale: SaleDetail }>(`/api/v1/stores/${storeId}/sales/finalize`, {
        method: 'POST',
        body: payload,
    });
};

export const voidSale = async (storeId: string, saleId: string) => {
    return apiClient.request<{ sale: SaleDetail }>(`/api/v1/stores/${storeId}/sales/${saleId}/void`, {
        method: 'POST',
    });
};

export const exportSales = (
    storeId: string,
    params: {
        status?: string;
        from?: string;
        to?: string;
        cashierId?: string;
        paymentMethod?: string;
        productId?: string;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.download(`/api/v1/stores/${storeId}/sales/export${query}`);
};
