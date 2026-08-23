import { apiClient } from './client';

export type ScheduleWeekStatus = 'DRAFT' | 'PUBLISHED';

export type ScheduleShift = {
    id?: string;
    date: string;
    isRestDay: boolean;
    startMinute: number | null;
    endMinute: number | null;
    presetId: string | null;
    // Resolved server-side (soft-deleted presets included), so icons don't
    // depend on the presets request or disappear when a preset is retired.
    icon?: string;
    presetLabel?: string | null;
};

export type ScheduleDeduction = {
    id: string;
    cashAdvanceId: string;
    amount: number;
    skipped: boolean;
    reason: string | null;
};

// Null for rows the viewer is not allowed to see pay for. The backend omits the
// fields entirely — this is not a client-side toggle.
export type ScheduleRowPay = {
    daysWorked: number;
    otHours: number;
    dailyRate: number;
    otHourlyRate: number;
    lessCa: number;
    payout: number;
    // OT is derived from the roster unless the owner overrode it for this week.
    otAuto: boolean;
    computedOtHours: number;
    hoursPerDay: number;
    breakMinutes: number;
    remarks: string | null;
    caBalance: number;
    // From the time clock, for reconciliation against the roster figures above.
    // Suggestions only — the stored Days/OT columns are never auto-rewritten.
    actualDaysWorked: number;
    actualHours: number;
    actualOtHours: number;
    // False when the clock recorded nothing that week, so the UI can stay quiet
    // for stores that don't punch in.
    hasAttendance: boolean;
    deductions: ScheduleDeduction[];
} | null;

export type ScheduleRow = {
    id: string;
    storeMemberId: string;
    userId: string;
    name: string;
    role: string;
    sortOrder: number;
    isSelf: boolean;
    shifts: ScheduleShift[];
    pay: ScheduleRowPay;
};

export type ScheduleWeek = {
    id: string | null;
    weekStart: string;
    dates: string[];
    status: ScheduleWeekStatus;
    publishedAt: string | null;
    canEdit: boolean;
    // The viewer's own membership id — always present, even when the week is a
    // draft they cannot see, so per-member views don't depend on the grid.
    viewerMemberId: string | null;
    rows: ScheduleRow[];
};

export type ShiftPreset = {
    id: string;
    label: string;
    // Presentation token — see @/utils/shiftIcons.
    icon: string;
    startMinute: number;
    endMinute: number;
    sortOrder: number;
};

export type ScheduleMember = {
    storeMemberId: string;
    userId: string;
    name: string;
    role: string;
};

export type StaffRate = {
    storeMemberId: string;
    userId: string;
    name: string;
    role: string;
    current: {
        dailyRate: number;
        hoursPerDay: number;
        breakMinutes: number;
        otMultiplier: number;
        otHourlyRate: number;
        effectiveFrom: string;
    } | null;
};

export type CashAdvance = {
    id: string;
    storeMemberId: string;
    amount: number;
    deducted: number;
    balance: number;
    takenOn: string;
    note: string | null;
};

export type SaveWeekPayload = {
    weekStart: string;
    rows: {
        storeMemberId: string;
        otHours: number;
        otAuto: boolean;
        remarks?: string | null;
        sortOrder: number;
        shifts: Omit<ScheduleShift, 'id'>[];
    }[];
};

export type MonthWeekRow = {
    weekStart: string;
    daysWorked: number;
    otHours: number;
    lessCa: number;
    payout: number;
};

export type MonthSummaryRow = {
    storeMemberId: string;
    userId: string;
    name: string;
    role: string;
    isSelf: boolean;
    daysWorked: number;
    otHours: number;
    lessCa: number;
    payout: number;
    caBalance: number;
    weeks: MonthWeekRow[];
};

export type MonthSummary = {
    year: number;
    month: number;
    weekCount: number;
    // Drafts are excluded from the totals; surfaced so the UI can say so.
    draftWeeks: number;
    rows: MonthSummaryRow[];
    grandTotal: { daysWorked: number; otHours: number; lessCa: number; payout: number };
};

export type StackedWeek = ScheduleWeek & {
    // Separates "no schedule created" from "created but still a draft", so the
    // empty state can be worded correctly.
    isUnscheduled: boolean;
};

export type StackedMonth = {
    year: number;
    month: number;
    viewerMemberId: string | null;
    canEdit: boolean;
    weeks: StackedWeek[];
};

export type MemberMonthDay = {
    date: string;
    isRestDay: boolean;
    startMinute: number | null;
    endMinute: number | null;
    icon: string;
    presetLabel: string | null;
    isDraft: boolean;
};

export type MemberMonth = {
    year: number;
    month: number;
    storeMemberId: string;
    name: string;
    days: MemberMonthDay[];
};

const base = (storeId: string) => `/api/v1/stores/${storeId}/schedule`;

export const getScheduleWeek = (storeId: string, weekStart: string) =>
    apiClient.request<{ week: ScheduleWeek }>(`${base(storeId)}/week?weekStart=${weekStart}`);

export const listScheduleWeeks = (storeId: string, limit = 12) =>
    apiClient.request<{ weeks: { id: string; weekStart: string; status: ScheduleWeekStatus; publishedAt: string | null }[] }>(
        `${base(storeId)}/weeks?limit=${limit}`
    );

export const saveScheduleWeek = (storeId: string, payload: SaveWeekPayload) =>
    apiClient.request<{ week: ScheduleWeek }>(`${base(storeId)}/week`, { method: 'PUT', body: payload });

export const publishScheduleWeek = (storeId: string, weekStart: string, publish: boolean) =>
    apiClient.request<{ week: ScheduleWeek }>(`${base(storeId)}/week/publish?weekStart=${weekStart}`, {
        method: 'POST',
        body: { publish },
    });

export const copyScheduleWeek = (storeId: string, fromWeekStart: string, toWeekStart: string, overwrite = false) =>
    apiClient.request<{ week: ScheduleWeek }>(`${base(storeId)}/week/copy`, {
        method: 'POST',
        body: { fromWeekStart, toWeekStart, overwrite },
    });

export const listScheduleMembers = (storeId: string) =>
    apiClient.request<{ members: ScheduleMember[] }>(`${base(storeId)}/members`);

export const listShiftPresets = (storeId: string) =>
    apiClient.request<{ presets: ShiftPreset[] }>(`${base(storeId)}/presets`);

export const createShiftPreset = (storeId: string, data: Omit<ShiftPreset, 'id'>) =>
    apiClient.request<{ preset: ShiftPreset }>(`${base(storeId)}/presets`, { method: 'POST', body: data });

export const updateShiftPreset = (storeId: string, presetId: string, data: Omit<ShiftPreset, 'id'>) =>
    apiClient.request<void>(`${base(storeId)}/presets/${presetId}`, { method: 'PUT', body: data });

export const deleteShiftPreset = (storeId: string, presetId: string) =>
    apiClient.request<void>(`${base(storeId)}/presets/${presetId}`, { method: 'DELETE' });

export const listStaffRates = (storeId: string) =>
    apiClient.request<{ rates: StaffRate[] }>(`${base(storeId)}/rates`);

export const setStaffRate = (
    storeId: string,
    storeMemberId: string,
    data: { dailyRate: number; hoursPerDay: number; otMultiplier: number; breakMinutes: number; effectiveFrom: string }
) => apiClient.request<{ rate: object }>(`${base(storeId)}/rates/${storeMemberId}`, { method: 'PUT', body: data });

export const listCashAdvances = (storeId: string) =>
    apiClient.request<{ advances: CashAdvance[] }>(`${base(storeId)}/cash-advances`);

export const createCashAdvance = (
    storeId: string,
    data: { storeMemberId: string; amount: number; takenOn: string; note?: string | null }
) => apiClient.request<{ advance: CashAdvance }>(`${base(storeId)}/cash-advances`, { method: 'POST', body: data });

export const deleteCashAdvance = (storeId: string, cashAdvanceId: string) =>
    apiClient.request<void>(`${base(storeId)}/cash-advances/${cashAdvanceId}`, { method: 'DELETE' });

export const setRowDeduction = (
    storeId: string,
    rowId: string,
    data: { cashAdvanceId: string; amount: number; skipped: boolean; reason?: string | null }
) => apiClient.request<{ deduction: ScheduleDeduction }>(`${base(storeId)}/rows/${rowId}/deduction`, { method: 'PUT', body: data });

export const removeRowDeduction = (storeId: string, rowId: string, deductionId: string) =>
    apiClient.request<void>(`${base(storeId)}/rows/${rowId}/deduction/${deductionId}`, { method: 'DELETE' });

export const getMonthSummary = (storeId: string, year: number, month: number) =>
    apiClient.request<{ summary: MonthSummary }>(`${base(storeId)}/month-summary?year=${year}&month=${month}`);

export const getMemberMonth = (storeId: string, storeMemberId: string, year: number, month: number) =>
    apiClient.request<{ calendar: MemberMonth }>(
        `${base(storeId)}/member-month?storeMemberId=${storeMemberId}&year=${year}&month=${month}`
    );

export const getStackedMonth = (storeId: string, year: number, month: number) =>
    apiClient.request<{ stacked: StackedMonth }>(`${base(storeId)}/stacked-month?year=${year}&month=${month}`);

export const deleteScheduleWeek = (storeId: string, weekStart: string) =>
    apiClient.request<void>(`${base(storeId)}/week?weekStart=${weekStart}`, { method: 'DELETE' });
