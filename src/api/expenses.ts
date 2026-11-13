import { apiClient } from './client';

export type ExpenseSource = 'MANUAL' | 'DAILY_SALES';

export type Expense = {
    id: string;
    date: string;
    amount: number;
    category: string;
    note: string | null;
    source: ExpenseSource;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; fullName: string | null; email: string } | null;
};

export type ExpenseListFilters = {
    from?: string;
    to?: string;
    category?: string;
    source?: ExpenseSource;
};

export type ExpenseInput = {
    date: string;
    amount: number;
    category: string;
    note?: string | null;
    source?: ExpenseSource;
};

const buildQuery = (filters: ExpenseListFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
    if (filters.source) params.set('source', filters.source);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

export const listExpenses = (storeId: string, filters: ExpenseListFilters = {}) => {
    return apiClient.request<{ expenses: Expense[] }>(
        `/api/v1/stores/${storeId}/expenses${buildQuery(filters)}`
    );
};

export const getExpense = (storeId: string, expenseId: string) => {
    return apiClient.request<{ expense: Expense }>(`/api/v1/stores/${storeId}/expenses/${expenseId}`);
};

export const createExpense = (storeId: string, payload: ExpenseInput) => {
    return apiClient.request<{ expense: Expense }>(`/api/v1/stores/${storeId}/expenses`, {
        method: 'POST',
        body: payload,
    });
};

export const updateExpense = (storeId: string, expenseId: string, payload: Partial<ExpenseInput>) => {
    return apiClient.request<{ expense: Expense }>(`/api/v1/stores/${storeId}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: payload,
    });
};

export const deleteExpense = (storeId: string, expenseId: string) => {
    return apiClient.request<void>(`/api/v1/stores/${storeId}/expenses/${expenseId}`, {
        method: 'DELETE',
    });
};

export const exportExpenses = (storeId: string, filters: ExpenseListFilters = {}) => {
    return apiClient.download(`/api/v1/stores/${storeId}/expenses/export${buildQuery(filters)}`);
};

export type ExpenseImportResult = {
    imported: number;
    skipped: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
};

export const importExpenses = (storeId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<ExpenseImportResult>(`/api/v1/stores/${storeId}/expenses/import`, formData);
};

export type ExpenseSummary = {
    range: { from: string; to: string };
    total: number;
    byCategory: Array<{ category: string; total: number }>;
    /** What net profit subtracts: all expenses, or (on a usage basis) expenses with "Supplies" swapped for supplies used. */
    profitDeduction: number;
    supplies: { basis: SupplyCostBasis; purchased: number; used: number };
};

export type SupplyCostBasis = 'PURCHASE' | 'USAGE';

export const getExpenseSummary = (storeId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiClient.request<ExpenseSummary>(
        `/api/v1/stores/${storeId}/reports/expense-summary${qs ? `?${qs}` : ''}`
    );
};
