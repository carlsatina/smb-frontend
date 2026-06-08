import { apiClient } from './client';

export type StoreMember = {
    id: string;
    userId: string;
    fullName?: string | null;
    email: string;
    role: string;
    createdAt: string;
};

export type StoreInvite = {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    acceptedAt?: string | null;
    createdAt: string;
    invitedBy?: {
        id: string;
        fullName?: string | null;
        email: string;
    } | null;
};

export const listStoreMembers = (storeId: string) => {
    return apiClient.request<{ members: StoreMember[] }>(`/api/v1/stores/${storeId}/members`);
};

export const updateStoreMemberRole = (storeId: string, memberId: string, role: string) => {
    return apiClient.request<{ member: StoreMember }>(`/api/v1/stores/${storeId}/members/${memberId}`, {
        method: 'PATCH',
        body: { role },
    });
};

export const removeStoreMember = (storeId: string, memberId: string) => {
    return apiClient.request<void>(`/api/v1/stores/${storeId}/members/${memberId}`, {
        method: 'DELETE',
    });
};

export const listStoreInvites = (storeId: string) => {
    return apiClient.request<{ invites: StoreInvite[] }>(`/api/v1/stores/${storeId}/invites`);
};

export const createStoreInvite = (
    storeId: string,
    payload: { email: string; role: string; expiresInDays?: number }
) => {
    return apiClient.request<{ invite: StoreInvite; token: string; emailSent?: boolean }>(
        `/api/v1/stores/${storeId}/invites`,
        {
            method: 'POST',
            body: payload,
        }
    );
};

export const revokeStoreInvite = (storeId: string, inviteId: string) => {
    return apiClient.request<void>(`/api/v1/stores/${storeId}/invites/${inviteId}`, {
        method: 'DELETE',
    });
};

export const previewStoreInvite = (storeId: string, token: string) => {
    return apiClient.request<{ preview: { email: string; role: string; invitedBy: string | null; expiresAt: string } }>(
        `/api/v1/stores/${storeId}/invites/preview?token=${encodeURIComponent(token)}`
    );
};

export const acceptStoreInvite = (storeId: string, token: string) => {
    return apiClient.request<{ membership: StoreMember }>(`/api/v1/stores/${storeId}/invites/accept`, {
        method: 'POST',
        body: { token },
    });
};
