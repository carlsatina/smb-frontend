import { apiClient, clearAdminSession, setAdminSession } from './client';

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
        features?: string[];
    };
};

export const getMe = () => {
    return apiClient.request<MeResponse>('/api/v1/auth/me');
};

export type AdminLoginResponse = {
    user: { id: string; email: string; fullName?: string | null; isSuperAdmin?: boolean; emailVerified?: boolean };
    accessToken: string;
    csrfToken?: string;
};

export const adminLogin = async (email: string, password: string) => {
    const data = await apiClient.request<AdminLoginResponse>('/api/v1/auth/admin/login', {
        method: 'POST',
        body: { email, password },
    });
    setAdminSession(data.accessToken, data.csrfToken);
    return data;
};

export const getAdminMe = () => {
    return apiClient.request<MeResponse>('/api/v1/auth/admin/me');
};

export const adminLogout = async () => {
    try {
        await apiClient.request<void>('/api/v1/auth/admin/logout', { method: 'POST' });
    } finally {
        clearAdminSession();
    }
};

export const updateProfile = (fullName: string) => {
    return apiClient.request<{ user: { id: string; email: string; fullName: string | null } }>(
        '/api/v1/auth/me',
        {
            method: 'PATCH',
            body: { fullName },
        }
    );
};

export const changePassword = (currentPassword: string, newPassword: string) => {
    return apiClient.request<{ ok: true }>('/api/v1/auth/password/change', {
        method: 'POST',
        body: { currentPassword, newPassword },
    });
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

