const baseUrl = import.meta.env.VITE_BACKEND_API || '';
const csrfCookieName = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrfToken';

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

const buildHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('accessToken') ?? localStorage.getItem('token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const csrfToken = localStorage.getItem('csrfToken') || getCookieValue(csrfCookieName);
    if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
    }
    return headers;
};

export const apiClient = {
    async request<T>(path: string, options: RequestOptions = {}) {
        const makeRequest = async () =>
            fetch(`${baseUrl}${path}`, {
                method: options.method ?? 'GET',
                headers: buildHeaders(),
                body: options.body ? JSON.stringify(options.body) : undefined,
                credentials: 'include',
            });

        const refreshTokens = async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            const headers = buildHeaders();
            delete headers.Authorization;
            const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                headers,
                body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
                credentials: 'include',
            });
            if (!response.ok) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('token');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }
                return false;
            }
            const data = await response.json();
            if (data?.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('token', data.accessToken);
                if (data?.csrfToken) {
                    localStorage.setItem('csrfToken', data.csrfToken);
                }
                return true;
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            return false;
        };

        let response = await makeRequest();

        const isRefreshRequest = path.includes('/auth/refresh');
        if (response.status === 401 && !isRefreshRequest) {
            const refreshed = await refreshTokens();
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
            throw { status: response.status, body: errorBody };
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json() as Promise<T>;
    },
    async download(path: string, options: RequestOptions = {}) {
        const makeRequest = async () =>
            fetch(`${baseUrl}${path}`, {
                method: options.method ?? 'GET',
                headers: buildHeaders(),
                body: options.body ? JSON.stringify(options.body) : undefined,
                credentials: 'include',
            });

        const refreshTokens = async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            const headers = buildHeaders();
            delete headers.Authorization;
            const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                headers,
                body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
                credentials: 'include',
            });
            if (!response.ok) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('token');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }
                return false;
            }
            const data = await response.json();
            if (data?.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('token', data.accessToken);
                if (data?.csrfToken) {
                    localStorage.setItem('csrfToken', data.csrfToken);
                }
                return true;
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            return false;
        };

        let response = await makeRequest();

        const isRefreshRequest = path.includes('/auth/refresh');
        if (response.status === 401 && !isRefreshRequest) {
            const refreshed = await refreshTokens();
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
            throw { status: response.status, body: errorBody };
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition') ?? '';
        const filenameMatch =
            contentDisposition.match(/filename\\*=UTF-8''([^;]+)/i) ||
            contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
        const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'export.csv';

        return { blob, filename };
    },
};
