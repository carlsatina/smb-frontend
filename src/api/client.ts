const baseUrl = import.meta.env.VITE_BACKEND_API || '';
const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrfToken';
const adminCsrfCookieName = `${csrfCookieName}.admin`;

// Admin and normal sessions are kept fully independent: separate localStorage
// keys, separate refresh cookies (named on the backend), and separate refresh
// endpoints. The audience for a request is derived from its path.
const ADMIN_TOKEN_KEY = 'adminAccessToken';
const ADMIN_CSRF_KEY = 'adminCsrfToken';

type RequestOptions = {
    method?: string;
    body?: unknown;
};

const getCookieValue = (name: string) => {
    if (typeof document === 'undefined') {
        return null;
    }
    const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
    const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
    if (!match) {
        return null;
    }
    return decodeURIComponent(match.substring(name.length + 1));
};

const isAdminPath = (path: string) =>
    path.startsWith('/api/v1/admin') || path.startsWith('/api/v1/auth/admin');

const buildHeaders = (admin: boolean) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = admin
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : localStorage.getItem('accessToken') ?? localStorage.getItem('token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const csrfToken = admin
        ? localStorage.getItem(ADMIN_CSRF_KEY) || getCookieValue(adminCsrfCookieName)
        : localStorage.getItem('csrfToken') || getCookieValue(csrfCookieName);
    if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
    }
    return headers;
};

const storeSession = (admin: boolean, accessToken: string, csrfToken?: string) => {
    if (admin) {
        localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
        if (csrfToken) localStorage.setItem(ADMIN_CSRF_KEY, csrfToken);
    } else {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        if (csrfToken) localStorage.setItem('csrfToken', csrfToken);
    }
};

const clearSession = (admin: boolean) => {
    if (admin) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_CSRF_KEY);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:logout'));
        }
    } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    }
};

const refreshSession = async (admin: boolean) => {
    const endpoint = admin ? '/api/v1/auth/admin/refresh' : '/api/v1/auth/refresh';
    const headers = buildHeaders(admin);
    delete headers.Authorization;
    const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
    });
    if (!response.ok) {
        clearSession(admin);
        return false;
    }
    const data = await response.json();
    if (data?.accessToken) {
        storeSession(admin, data.accessToken, data.csrfToken);
        return true;
    }
    clearSession(admin);
    return false;
};

const maybeDispatchPlanUpgrade = (errorBody: any) => {
    const errorCode = errorBody?.error?.code;
    if (typeof window !== 'undefined' && (errorCode === 'PLAN_LIMIT' || errorCode === 'SUBSCRIPTION_REQUIRED')) {
        window.dispatchEvent(
            new CustomEvent('plan:upgrade', {
                detail: {
                    message: errorBody?.error?.message || 'Upgrade required to access this feature.',
                },
            })
        );
    }
};

export const apiClient = {
    async request<T>(path: string, options: RequestOptions = {}) {
        const admin = isAdminPath(path);
        const makeRequest = async () =>
            fetch(`${baseUrl}${path}`, {
                method: options.method ?? 'GET',
                headers: buildHeaders(admin),
                body: options.body ? JSON.stringify(options.body) : undefined,
                credentials: 'include',
            });

        let response = await makeRequest();

        const isRefreshRequest = path.includes('/auth/refresh');
        if (response.status === 401 && !isRefreshRequest) {
            const refreshed = await refreshSession(admin);
            if (refreshed) {
                response = await makeRequest();
            }
        }

        if (!response.ok) {
            let errorBody: any = null;
            try {
                errorBody = await response.json();
            } catch (error) {
                errorBody = null;
            }
            maybeDispatchPlanUpgrade(errorBody);
            throw { status: response.status, body: errorBody };
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json() as Promise<T>;
    },
    async download(path: string, options: RequestOptions = {}) {
        const admin = isAdminPath(path);
        const makeRequest = async () =>
            fetch(`${baseUrl}${path}`, {
                method: options.method ?? 'GET',
                headers: buildHeaders(admin),
                body: options.body ? JSON.stringify(options.body) : undefined,
                credentials: 'include',
            });

        let response = await makeRequest();

        const isRefreshRequest = path.includes('/auth/refresh');
        if (response.status === 401 && !isRefreshRequest) {
            const refreshed = await refreshSession(admin);
            if (refreshed) {
                response = await makeRequest();
            }
        }

        if (!response.ok) {
            let errorBody: any = null;
            try {
                errorBody = await response.json();
            } catch (error) {
                errorBody = null;
            }
            maybeDispatchPlanUpgrade(errorBody);
            throw { status: response.status, body: errorBody };
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition') ?? '';
        const filenameMatch =
            contentDisposition.match(/filename\*=UTF-8''([^;]+)/i) ||
            contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
        const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'export.csv';

        return { blob, filename };
    },
    async upload<T>(path: string, body: FormData): Promise<T> {
        const admin = isAdminPath(path);
        const headers = buildHeaders(admin);
        delete headers['Content-Type'];

        const response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers,
            body,
            credentials: 'include',
        });

        if (!response.ok) {
            let errorBody: any = null;
            try { errorBody = await response.json(); } catch { errorBody = null; }
            maybeDispatchPlanUpgrade(errorBody);
            throw { status: response.status, body: errorBody };
        }

        return response.json() as Promise<T>;
    },
};

export const setAdminSession = (accessToken: string, csrfToken?: string) => storeSession(true, accessToken, csrfToken);
export const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_CSRF_KEY);
};
export const getAdminAccessToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
