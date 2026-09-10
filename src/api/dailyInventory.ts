import { apiClient } from './client';

export type DailyInventoryReportType = 'TAKOYAKI' | 'BUKO' | 'CUSTOM';

export interface DailyInventoryReportItem {
    id?: string;
    section: string | null;
    particulars: string;
    unit: string;
    openingInventory: number;
    delivery: number;
    total: number;
    endingInventory: number | null;
    reminders: string | null;
    sortOrder: number;
    totalUsed: number | null;
    itemType?: 'PRODUCT' | 'INGREDIENT' | null;
    itemId?: string | null;
}

export interface DailyInventoryReport {
    id?: string;
    storeId: string;
    reportType: DailyInventoryReportType;
    date: string;
    isNew: boolean;
    carriedOverFromDate: string | null;
    items: DailyInventoryReportItem[];
    createdAt?: string;
    updatedAt?: string;
}

export interface SaveDailyInventoryItemPayload {
    id?: string;
    section?: string | null;
    particulars: string;
    unit: string;
    openingInventory: number;
    delivery: number;
    endingInventory?: number | null;
    reminders?: string | null;
    sortOrder?: number;
    itemType?: 'PRODUCT' | 'INGREDIENT' | null;
    itemId?: string | null;
}

export interface SaveDailyInventoryPayload {
    reportType: DailyInventoryReportType;
    date: string;
    items: SaveDailyInventoryItemPayload[];
}

export const getDailyInventoryReport = (
    storeId: string,
    reportType: DailyInventoryReportType,
    date: string
) => {
    return apiClient.request<{ report: DailyInventoryReport }>(
        `/api/v1/stores/${storeId}/inventory/daily-reports?reportType=${reportType}&date=${date}`
    );
};

export const saveDailyInventoryReport = (
    storeId: string,
    payload: SaveDailyInventoryPayload
) => {
    return apiClient.request<{ report: DailyInventoryReport }>(
        `/api/v1/stores/${storeId}/inventory/daily-reports`,
        {
            method: 'POST',
            body: payload,
        }
    );
};
