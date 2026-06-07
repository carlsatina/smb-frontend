import { apiClient } from './client';
import type { PlanTier } from '@/utils/planAccess';

export type AdminUser = {
    id: string;
    email: string;
    fullName?: string | null;
    planTier: PlanTier;
    grantedPlan: PlanTier | null;
    grantedUntil: string | null;
    subscriptionActive: boolean;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    createdAt: string;
};

export type AdminStore = {
    id: string;
    name: string;
    storeType: 'RETAIL' | 'WAREHOUSE';
    currency: string;
    createdAt: string;
    totalSales: number;
    totalReceipts: number;
    salesThisMonth: number;
    owner: {
        id: string;
        email: string;
        planTier: PlanTier;
        grantedPlan: PlanTier | null;
        grantedUntil: string | null;
        subscriptionActive: boolean;
    } | null;
};

export type PaginatedResponse<T> = {
    total: number;
    page: number;
    pageSize: number;
    data: T[];
};

export const getAdminUsers = (page = 1) =>
    apiClient.request<{ users: AdminUser[]; total: number; page: number; pageSize: number }>(
        `/api/v1/admin/users?page=${page}`
    );

export const getAdminStores = (page = 1, month?: number, year?: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return apiClient.request<{ stores: AdminStore[]; total: number; page: number; pageSize: number; month: number; year: number }>(
        `/api/v1/admin/stores?${params}`
    );
};

export type PlatformStats = {
    totalUsers: number;
    totalStores: number;
    activeSubscriptions: number;
    grantedPlans: number;
    newUsersThisMonth: number;
    planBreakdown: Record<string, number>;
};

export const getAdminStats = () =>
    apiClient.request<{ stats: PlatformStats }>('/api/v1/admin/stats');

export const getAdminMetrics = () =>
    apiClient.request<{ metrics: unknown[] }>('/api/v1/admin/metrics');

export const updateUserPlan = (userId: string, planTier: PlanTier, subscriptionActive: boolean) =>
    apiClient.request<{ user: AdminUser }>(`/api/v1/admin/users/${userId}/plan`, {
        method: 'PATCH',
        body: { planTier, subscriptionActive },
    });

export const grantUserPlan = (userId: string, grantedPlan: PlanTier, grantedUntil?: string | null) =>
    apiClient.request<{ user: AdminUser }>(`/api/v1/admin/users/${userId}/grant`, {
        method: 'PATCH',
        body: { grantedPlan, grantedUntil: grantedUntil ?? null },
    });

export const revokeUserGrant = (userId: string) =>
    apiClient.request<{ user: AdminUser }>(`/api/v1/admin/users/${userId}/grant`, {
        method: 'DELETE',
    });

export const updateSuperAdmin = (userId: string, isSuperAdmin: boolean) =>
    apiClient.request<{ user: { id: string; email: string; isSuperAdmin: boolean } }>(
        `/api/v1/admin/users/${userId}/super-admin`,
        { method: 'PATCH', body: { isSuperAdmin } }
    );
