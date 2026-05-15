import { apiClient } from './client';

export type SalesByDayRecord = {
    date: string;
    totalSales: number;
    orderCount: number;
};

export type SalesByDayResponse = {
    range: {
        from: string;
        to: string;
    };
    totals: {
        totalSales: number;
        orderCount: number;
        avgOrder: number;
    };
    days: SalesByDayRecord[];
};

export type SalesSummaryTotals = {
    grossSales: number;
    discounts: number;
    tax: number;
    netSales: number;
    orderCount: number;
    avgOrder: number;
    voidedSales: number;
    voidCount: number;
};

export type SalesSummaryResponse = {
    range: {
        from: string;
        to: string;
    };
    totals: SalesSummaryTotals;
};

export type SalesByHourRecord = {
    hour: number;
    totalSales: number;
    orderCount: number;
};

export type SalesByHourResponse = {
    range: {
        from: string;
        to: string;
    };
    hours: SalesByHourRecord[];
};

export type TopProductRecord = {
    productId: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
    qtySold: number;
    totalSales: number;
};

export type LowStockItem = {
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    name: string;
    unit: string;
    currentQty: number;
    lowStockThreshold: number;
    shortfall: number;
};

export type IngredientUsageRecord = {
    ingredientId: string;
    name: string;
    unit?: string;
    qtyUsed: number;
};

export type PurchaseSpendRecord = {
    supplierId?: string | null;
    supplierName: string;
    totalSpend: number;
    receiptCount: number;
};

export type PurchaseSpendSummary = {
    totalSpend: number;
    totalReceipts: number;
    avgReceipt: number;
};

export type ProductMarginRecord = {
    productId: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
    qtySold: number;
    revenue: number;
    cost: number | null;
    profit: number | null;
    marginPct: number | null;
    costKnown: boolean;
};

export type ProductMarginResponse = {
    range: {
        from: string;
        to: string;
    };
    summary: {
        costedItems: number;
        totalItems: number;
    };
    items: ProductMarginRecord[];
};

const buildRangeQuery = (params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    return search.toString();
};

export const getSalesSummary = (storeId: string, params?: { from?: string; to?: string }) => {
    const query = buildRangeQuery(params);
    return apiClient.request<SalesSummaryResponse>(
        `/api/v1/stores/${storeId}/reports/sales-summary${query ? `?${query}` : ''}`
    );
};

export const getSalesByDay = (storeId: string, params?: { from?: string; to?: string }) => {
    const query = buildRangeQuery(params);
    return apiClient.request<SalesByDayResponse>(
        `/api/v1/stores/${storeId}/reports/sales-by-day${query ? `?${query}` : ''}`
    );
};

export const getSalesByHour = (storeId: string, params?: { from?: string; to?: string }) => {
    const query = buildRangeQuery(params);
    return apiClient.request<SalesByHourResponse>(
        `/api/v1/stores/${storeId}/reports/sales-by-hour${query ? `?${query}` : ''}`
    );
};

export const getTopProducts = (
    storeId: string,
    params?: { from?: string; to?: string; limit?: number }
) => {
    const search = new URLSearchParams();
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    if (params?.limit) {
        search.set('limit', String(params.limit));
    }
    const query = search.toString();
    return apiClient.request<{ range: { from: string; to: string }; products: TopProductRecord[] }>(
        `/api/v1/stores/${storeId}/reports/top-products${query ? `?${query}` : ''}`
    );
};

export const getLowStock = (storeId: string, params?: { limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit) {
        search.set('limit', String(params.limit));
    }
    const query = search.toString();
    return apiClient.request<{ items: LowStockItem[] }>(
        `/api/v1/stores/${storeId}/reports/low-stock${query ? `?${query}` : ''}`
    );
};

export const getIngredientUsage = (
    storeId: string,
    params?: { from?: string; to?: string; limit?: number }
) => {
    const search = new URLSearchParams();
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    if (params?.limit) {
        search.set('limit', String(params.limit));
    }
    const query = search.toString();
    return apiClient.request<{ ingredients: IngredientUsageRecord[] }>(
        `/api/v1/stores/${storeId}/reports/ingredient-usage${query ? `?${query}` : ''}`
    );
};

export const getPurchaseSpend = (
    storeId: string,
    params?: { from?: string; to?: string; limit?: number }
) => {
    const search = new URLSearchParams();
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    if (params?.limit) {
        search.set('limit', String(params.limit));
    }
    const query = search.toString();
    return apiClient.request<{ summary: PurchaseSpendSummary; suppliers: PurchaseSpendRecord[] }>(
        `/api/v1/stores/${storeId}/reports/purchase-spend${query ? `?${query}` : ''}`
    );
};

export type PaymentMethodRecord = {
    method: string;
    total: number;
    orderCount: number;
    sharePct: number;
};

export type PaymentMethodBreakdownResponse = {
    range: { from: string; to: string };
    grandTotal: number;
    methods: PaymentMethodRecord[];
};

export const getPaymentMethodBreakdown = (storeId: string, params?: { from?: string; to?: string }) => {
    const query = buildRangeQuery(params);
    return apiClient.request<PaymentMethodBreakdownResponse>(
        `/api/v1/stores/${storeId}/reports/payment-methods${query ? `?${query}` : ''}`
    );
};

export type EmployeeMethodRecord = {
    method: string;
    total: number;
    orderCount: number;
};

export type EmployeeSalesRecord = {
    cashierId: string;
    name: string;
    email: string;
    role: string | null;
    totalSales: number;
    orderCount: number;
    methods: EmployeeMethodRecord[];
};

export type EmployeeSalesResponse = {
    range: { from: string; to: string };
    employees: EmployeeSalesRecord[];
};

export const getEmployeeSales = (storeId: string, params?: { from?: string; to?: string }) => {
    const query = buildRangeQuery(params);
    return apiClient.request<EmployeeSalesResponse>(
        `/api/v1/stores/${storeId}/reports/employee-sales${query ? `?${query}` : ''}`
    );
};

export const getProductMargins = (
    storeId: string,
    params?: { from?: string; to?: string; limit?: number }
) => {
    const search = new URLSearchParams();
    if (params?.from) {
        search.set('from', params.from);
    }
    if (params?.to) {
        search.set('to', params.to);
    }
    if (params?.limit) {
        search.set('limit', String(params.limit));
    }
    const query = search.toString();
    return apiClient.request<ProductMarginResponse>(
        `/api/v1/stores/${storeId}/reports/product-margins${query ? `?${query}` : ''}`
    );
};
