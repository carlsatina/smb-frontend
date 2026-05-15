import { apiClient } from './client';

export type AuditLogRecord = {
    id: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Record<string, unknown> | null;
    createdAt: string;
    actor?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
};

type AuditLogListResponse = {
    logs: AuditLogRecord[];
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

export const listAuditLogs = (
    storeId: string,
    params: {
        action?: string;
        actorId?: string;
        entityType?: string;
        q?: string;
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.request<AuditLogListResponse>(`/api/v1/stores/${storeId}/audit-logs${query}`);
};

export const exportAuditLogs = (
    storeId: string,
    params: {
        action?: string;
        actorId?: string;
        entityType?: string;
        from?: string;
        to?: string;
    } = {}
) => {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.download(`/api/v1/stores/${storeId}/audit-logs/export${query}`);
};
