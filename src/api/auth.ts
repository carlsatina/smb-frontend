import { apiClient } from './client';

export type MeResponse = {
    user: {
        id: string;
        email: string;
        fullName?: string | null;
        emailVerified?: boolean;
        subscriptionActive?: boolean;
        planTier?: 'STARTER' | 'STANDARD' | 'GROWTH';
        grantedPlan?: 'STARTER' | 'STANDARD' | 'GROWTH' | null;
        grantedUntil?: string | null;
        isSuperAdmin?: boolean;
    };
};

export const getMe = () => {
    return apiClient.request<MeResponse>('/api/v1/auth/me');
};

export const logout = (refreshToken?: string) => {
    return apiClient.request<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : undefined,
    });
};

export const forgotPassword = (email: string) => {
    return apiClient.request<{ ok: true }>('/api/v1/auth/password/forgot', {
        method: 'POST',
        body: { email },
    });
};

export const resetPassword = (token: string, password: string) => {
    return apiClient.request<{ ok: true }>('/api/v1/auth/password/reset', {
        method: 'POST',
        body: { token, password },
    });
};

export const verifyEmail = (token: string) => {
    return apiClient.request<{ ok: true }>('/api/v1/auth/verify', {
        method: 'POST',
        body: { token },
    });
};

export const resendVerification = (email: string) => {
    return apiClient.request<{ ok: true }>('/api/v1/auth/verify/resend', {
        method: 'POST',
        body: { email },
    });
};

