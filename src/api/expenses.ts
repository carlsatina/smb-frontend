import { apiClient } from './client';

export type Expense = {
    id: string;
    date: string;
    amount: number;
    category: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; fullName: string | null; email: string } | null;
};

export type ExpenseListFilters = {
    from?: string;
    to?: string;
    category?: string;
};

export type ExpenseInput = {
    date: string;
    amount: number;
    category: string;
    note?: string | null;
};

const buildQuery = (filters: ExpenseListFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
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

export type ExpenseSummary = {
    range: { from: string; to: string };
    total: number;
    byCategory: Array<{ category: string; total: number }>;
};

export const getExpenseSummary = (storeId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiClient.request<ExpenseSummary>(
        `/api/v1/stores/${storeId}/reports/expense-summary${qs ? `?${qs}` : ''}`
    );
};
