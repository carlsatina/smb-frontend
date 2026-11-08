import { apiClient } from './client';

export type McpTokenAccess = 'READ_ONLY' | 'READ_WRITE';

export type McpToken = {
    id: string;
    name: string;
    access: McpTokenAccess;
    tokenPrefix: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    stores: Array<{ id: string; name: string }>;
};

// Tokens belong to the signed-in owner and can cover several of their stores.
export const listMcpTokens = () => apiClient.request<{ tokens: McpToken[] }>('/api/v1/mcp-tokens');

/** `secret` is only ever returned here, once. */
export const createMcpToken = (payload: {
    name: string;
    access: McpTokenAccess;
    storeIds: string[];
    /** null = never expires. */
    expiresInDays: 30 | 90 | 365 | null;
    /** The owner's current password, required to mint a token. */
    password: string;
}) =>
    apiClient.request<{ token: McpToken; secret: string }>('/api/v1/mcp-tokens', {
        method: 'POST',
        body: payload,
    });

export const revokeMcpToken = (tokenId: string) =>
    apiClient.request<void>(`/api/v1/mcp-tokens/${tokenId}`, { method: 'DELETE' });

/** The MCP endpoint lives on the backend host, next to /api. */
export const mcpServerUrl = () => {
    const base = (import.meta.env.VITE_BACKEND_API || window.location.origin).replace(/\/+$/, '');
    return `${base}/mcp`;
};
