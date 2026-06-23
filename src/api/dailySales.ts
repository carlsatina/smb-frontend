import { apiClient } from './client';

export type CashierEntry = {
    id: string;
    userId: string;
    userName: string;
    cashAmount: number;
    gcashAmount: number;
    denom1000: number;
    denom500: number;
    denom200: number;
    denom100: number;
    denom50: number;
    denom20: number;
    coins: number;
};

export type DailySalesRow = {
    id: string;
    date: string;
    expense: number;
    actualCoh: number;
    cashierEntries: CashierEntry[];
    totalCoh: number;
    totalGcash: number;
    totalSenior: number;
    totalSales: number;
    pos: number;
    kulangRemit: number;
    shortIf: number;
    salesNeeded: number;
};

export type DailySalesGoal = {
    goal: number;
    effectiveDate: string;
} | null;

export const listDailySales = (storeId: string, year: number, month: number) =>
    apiClient.request<{ rows: DailySalesRow[]; goal: number }>(`/api/v1/stores/${storeId}/daily-sales?year=${year}&month=${month}`);

export const createDailySalesEntry = (storeId: string, data: { date: string; expense?: number | null; actualCoh?: number | null }) =>
    apiClient.request<{ entry: object }>(`/api/v1/stores/${storeId}/daily-sales`, { method: 'POST', body: data });

export const updateDailySalesEntry = (storeId: string, entryId: string, data: { expense?: number | null; actualCoh?: number | null }) =>
    apiClient.request<{ entry: object }>(`/api/v1/stores/${storeId}/daily-sales/${entryId}`, { method: 'PATCH', body: data });

export const getPosForDate = (storeId: string, date: string) =>
    // silent: this is a debounced auto-calc with its own inline indicator —
    // it shouldn't trigger the global loading overlay.
    apiClient.request<{ pos: number; seniorDiscount: number }>(`/api/v1/stores/${storeId}/daily-sales/pos?date=${date}`, { silent: true });

export const deleteDailySalesEntry = (storeId: string, entryId: string) =>
    apiClient.request<void>(`/api/v1/stores/${storeId}/daily-sales/${entryId}`, { method: 'DELETE' });

export const upsertCashierEntry = (
    storeId: string,
    entryId: string,
    userId: string,
    data: {
        gcashAmount: number;
        denom1000: number; denom500: number; denom200: number;
        denom100: number; denom50: number; denom20: number;
        coins: number;
    }
) => apiClient.request<{ cashierEntry: CashierEntry }>(`/api/v1/stores/${storeId}/daily-sales/${entryId}/cashier-entry/${userId}`, { method: 'PUT', body: data });

export const getDailySalesGoal = (storeId: string) =>
    apiClient.request<{ goal: DailySalesGoal }>(`/api/v1/stores/${storeId}/daily-sales/goal`);

export const setDailySalesGoal = (storeId: string, goal: number, effectiveDate: string) =>
    apiClient.request<{ goal: object }>(`/api/v1/stores/${storeId}/daily-sales/goal`, { method: 'PUT', body: { goal, effectiveDate } });

export const grantDailySalesFeature = (userId: string, expiresAt?: string) =>
    apiClient.request<{ grant: object }>(`/api/v1/admin/users/${userId}/features`, {
        method: 'POST',
        body: { feature: 'DAILY_SALES', expiresAt },
    });

export const revokeDailySalesFeature = (userId: string) =>
    apiClient.request<void>(`/api/v1/admin/users/${userId}/features/DAILY_SALES`, { method: 'DELETE' });

export const getUserFeatures = (userId: string) =>
    apiClient.request<{ features: Array<{ feature: string; grantedAt: string; expiresAt: string | null }> }>(`/api/v1/admin/users/${userId}/features`);
