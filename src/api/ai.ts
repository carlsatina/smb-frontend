import { apiClient } from './client';

export interface DailySummaryData {
    store: { name: string; currency: string; timezone: string };
    targetDate: string;
    sales: {
        netSales: number;
        orderCount: number;
        avgOrder: number;
        discounts: number;
        voidedSales: number;
        voidCount: number;
    };
    baseline: { days: number; avgDailyNetSales: number; deltaVsAvgPct: number | null };
    profit: {
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        marginPct: number;
        itemsWithCost: number;
        totalItems: number;
    };
    topProducts: Array<{ name: string; qty: number; revenue: number }>;
    paymentMix: Array<{ method: string; total: number; sharePct: number }>;
    lowStock: Array<{ name: string; unit: string | null; currentQty: number; threshold: number }>;
}

export interface DailySummaryResponse {
    summary: string;
    model: string;
    data: DailySummaryData;
}

// Generates an AI daily business summary for the store's last complete day.
// Owner/admin only; requires AI to be configured in Store Settings.
export const generateDailySummary = (storeId: string) => {
    return apiClient.request<DailySummaryResponse>(`/api/v1/stores/${storeId}/ai/daily-summary`, {
        method: 'POST',
    });
};

export interface ReorderSuggestion {
    itemType: 'PRODUCT' | 'INGREDIENT';
    itemId: string;
    name: string;
    unit: string;
    currentQty: number;
    dailyUsage: number;
    daysOfCover: number | null;
    suggestedQty: number;
    supplier: string | null;
    reason: 'low_days_of_cover' | 'below_threshold';
}

export interface ReorderPlanResponse {
    plan: {
        window: { from: string; to: string; days: number };
        leadTimeDays: number;
        reviewDays: number;
        targetDaysOfCover: number;
        currency: string;
        totalFlagged: number;
        suggestions: ReorderSuggestion[];
    };
    narrative: string | null;
    narrativeError: string | null;
    model: string | null;
}

// Computes a deterministic reorder plan (usage, days-of-cover, suggested qty) and
// an optional AI narrative. Owner/admin/inventory-manager; requires AI configured.
export const generateReorderPlan = (storeId: string) => {
    return apiClient.request<ReorderPlanResponse>(`/api/v1/stores/${storeId}/ai/reorder`, {
        method: 'POST',
    });
};

export interface AiChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// "Ask your data" chat. The server runs a tool-calling loop over read-only report
// tools and returns the assistant's reply. Send the running transcript (last
// message must be the user's). Owner/admin only.
export const aiChat = (storeId: string, messages: AiChatMessage[]) => {
    return apiClient.request<{ reply: string; model: string }>(`/api/v1/stores/${storeId}/ai/chat`, {
        method: 'POST',
        body: { messages },
    });
};
