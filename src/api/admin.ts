import { apiClient } from './client';

export type AdminUser = {
    id: string;
    email: string;
    fullName?: string | null;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    ownedStores: number;
    createdAt: string;
};

export type AdminStore = {
    id: string;
    name: string;
    storeType: 'RETAIL' | 'WAREHOUSE';
    currency: string;
    createdAt: string;
    totalSales: number;
    salesThisMonth: number;
    owner: { id: string; email: string } | null;
};

export type BillingPricing = {
    currency: string;
    storeFees: number[];
    additionalStoreFee: number;
};

export type BillingLine = {
    storeId: string;
    storeName: string;
    storeType: string;
    // null for a free (complimentary) store
    position: number | null;
    fee: number;
    exempt?: boolean;
};

export type BillingDiscountType = 'PERCENT' | 'FIXED';

export type OwnerDiscount = {
    type: BillingDiscountType;
    value: number;
    // Start of the first billing month it no longer applies to; null = no end.
    endsAt: string | null;
    note: string | null;
};

export type StoreBillingSettings = {
    id: string;
    name: string;
    storeType: string;
    billingExempt: boolean;
    billingExemptEndsAt: string | null;
    billingExemptNote: string | null;
};

export type BillingOwnerProfile = {
    id: string;
    email: string;
    fullName: string | null;
    discount: OwnerDiscount | null;
    // Read-only lock for non-payment.
    suspension: { suspendedAt: string; reason: string | null } | null;
};

export type OverdueMonth = { year: number; month: number; amount: number };

export type BillingStatement = {
    id: string;
    storeCount: number;
    lines: BillingLine[];
    subtotal: number;
    discountAmount: number;
    discountNote: string | null;
    amount: number;
    sentAt: string | null;
    sentToEmail: string | null;
    sentByEmail: string | null;
    sendCount: number;
    paidAt: string | null;
    paymentNote: string | null;
};

export type BillingOwner = {
    owner: BillingOwnerProfile;
    lines: BillingLine[];
    subtotal: number;
    discountAmount: number;
    discountNote: string | null;
    amount: number;
    stores: StoreBillingSettings[];
    statement: BillingStatement | null;
    // This month's bill was sent, the month has ended, and it's unpaid.
    overdue: boolean;
    // Every overdue month for this owner.
    overdueMonths: OverdueMonth[];
};

export type BillingHistoryEntry = BillingStatement & {
    year: number;
    month: number;
    ownerEmail: string;
    ownerName: string | null;
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
    newUsersThisMonth: number;
    billing: {
        month: number;
        year: number;
        billableOwners: number;
        billableStores: number;
        freeStores: number;
        expectedRevenue: number;
        collectedRevenue: number;
        paidOwners: number;
        suspendedOwners: number;
        pricing: BillingPricing;
    };
};

export const getAdminStats = () =>
    apiClient.request<{ stats: PlatformStats }>('/api/v1/admin/stats');

export const getAdminMetrics = () =>
    apiClient.request<{ metrics: unknown[] }>('/api/v1/admin/metrics');

export const updateSuperAdmin = (userId: string, isSuperAdmin: boolean) =>
    apiClient.request<{ user: { id: string; email: string; isSuperAdmin: boolean } }>(
        `/api/v1/admin/users/${userId}/super-admin`,
        { method: 'PATCH', body: { isSuperAdmin } }
    );

export const getBillingOwners = (month: number, year: number) =>
    apiClient.request<{ owners: BillingOwner[]; month: number; year: number; pricing: BillingPricing }>(
        `/api/v1/admin/billing?month=${month}&year=${year}`
    );

export type SendBillingResult = {
    sent: boolean;
    message?: string;
    statement?: BillingStatement;
};

export const sendBillingNotice = (ownerId: string, month: number, year: number) =>
    apiClient.request<SendBillingResult>(`/api/v1/admin/billing/${ownerId}/send`, {
        method: 'POST',
        body: { month, year },
    });

export const setBillingPayment = (
    ownerId: string,
    month: number,
    year: number,
    paid: boolean,
    note?: string | null
) =>
    apiClient.request<{ statement: BillingStatement | null; reinstated?: boolean }>(`/api/v1/admin/billing/${ownerId}/payment`, {
        method: 'PATCH',
        body: { month, year, paid, note: note ?? null },
    });

export const getBillingHistory = (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month && year) {
        params.set('month', String(month));
        params.set('year', String(year));
    }
    const qs = params.toString();
    return apiClient.request<{ entries: BillingHistoryEntry[] }>(
        `/api/v1/admin/billing/history${qs ? `?${qs}` : ''}`
    );
};

// "Through" month: the setting applies up to and including that billing month.
export type ThroughMonth = { throughYear: number; throughMonth: number } | null;

export const setOwnerDiscount = (
    ownerId: string,
    discount: { type: BillingDiscountType; value: number; note: string | null; through: ThroughMonth } | null
) =>
    apiClient.request<{ owner: BillingOwnerProfile }>(`/api/v1/admin/billing/owners/${ownerId}/discount`, {
        method: 'PATCH',
        body: {
            discount: discount
                ? {
                      type: discount.type,
                      value: discount.value,
                      note: discount.note,
                      throughYear: discount.through?.throughYear ?? null,
                      throughMonth: discount.through?.throughMonth ?? null,
                  }
                : null,
        },
    });

export const setStoreExemption = (
    storeId: string,
    exemption: { note: string | null; through: ThroughMonth } | null
) =>
    apiClient.request<{ store: StoreBillingSettings }>(`/api/v1/admin/billing/stores/${storeId}/exemption`, {
        method: 'PATCH',
        body: exemption
            ? {
                  exempt: true,
                  note: exemption.note,
                  throughYear: exemption.through?.throughYear ?? null,
                  throughMonth: exemption.through?.throughMonth ?? null,
              }
            : { exempt: false },
    });

export const setOwnerSuspension = (ownerId: string, suspended: boolean, reason?: string | null) =>
    apiClient.request<{ owner: BillingOwnerProfile }>(`/api/v1/admin/billing/owners/${ownerId}/suspension`, {
        method: 'PATCH',
        body: { suspended, reason: reason ?? null },
    });
