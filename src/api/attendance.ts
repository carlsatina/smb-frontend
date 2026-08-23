import { apiClient } from './client';

// Actual time in/out, beside what the roster planned. Minute fields are minutes
// from local midnight of the entry's work day, the same axis shifts use, so an
// overnight punch-out is a value past 1440.

export type TimeEntrySource = 'SELF' | 'MANAGER';

export type TimeEntry = {
    id: string;
    storeMemberId: string;
    workDate: string;
    clockInAt: string;
    clockOutAt: string | null;
    inMinute: number;
    outMinute: number | null;
    source: TimeEntrySource;
    note: string | null;
    editedBy: string | null;
    editedAt: string | null;
};

export type DayStatus =
    | 'OPEN'
    | 'ABSENT'
    | 'SCHEDULED'
    | 'UNSCHEDULED'
    | 'LATE'
    | 'UNDERTIME'
    | 'OVERTIME'
    | 'ON_TIME'
    | 'REST_DAY';

export type DayReconciliation = {
    scheduledMinutes: number;
    actualMinutes: number;
    lateMinutes: number;
    earlyOutMinutes: number;
    overtimeMinutes: number;
    varianceMinutes: number;
    isOpen: boolean;
    status: DayStatus;
};

export type AttendanceShift = {
    isRestDay: boolean;
    startMinute: number | null;
    endMinute: number | null;
    icon: string;
    presetLabel: string | null;
};

export type AttendanceDay = DayReconciliation & {
    date: string;
    shift: AttendanceShift | null;
    // The day has a rostered shift the viewer isn't allowed to see yet (draft
    // week), so "unscheduled" would be the wrong thing to say.
    scheduleHidden: boolean;
    entries: TimeEntry[];
};

export type AttendanceRow = {
    storeMemberId: string;
    userId: string;
    name: string;
    role: string;
    isSelf: boolean;
    days: AttendanceDay[];
    totals: {
        scheduledMinutes: number;
        actualMinutes: number;
        lateMinutes: number;
        varianceMinutes: number;
        daysWorked: number;
        daysAbsent: number;
        openDays: number;
        scheduledHours: number;
        actualHours: number;
        varianceHours: number;
    };
};

export type AttendanceRange = {
    from: string;
    to: string;
    timeZone: string;
    canEdit: boolean;
    viewerMemberId: string | null;
    rows: AttendanceRow[];
};

// What the Time In/Out button renders.
export type MyAttendance = {
    storeMemberId: string;
    timeZone: string;
    workDate: string;
    // The store's clock, not the device's — the elapsed counter is anchored to
    // this so a phone with a skewed clock doesn't drift the display.
    serverTime: string;
    openEntry: TimeEntry | null;
    shift: (AttendanceShift & { isDraft: boolean }) | null;
    entries: TimeEntry[];
    reconciliation: DayReconciliation;
};

const base = (storeId: string) => `/api/v1/stores/${storeId}/schedule/attendance`;

export const getMyAttendance = (storeId: string, silent = false) =>
    apiClient.request<{ attendance: MyAttendance }>(`${base(storeId)}/me`, { silent });

export const clockIn = (storeId: string, note?: string | null) =>
    apiClient.request<{ attendance: MyAttendance }>(`${base(storeId)}/clock-in`, {
        method: 'POST',
        body: { note: note ?? null },
    });

export const clockOut = (storeId: string, note?: string | null) =>
    apiClient.request<{ attendance: MyAttendance }>(`${base(storeId)}/clock-out`, {
        method: 'POST',
        body: { note: note ?? null },
    });

export const listAttendance = (storeId: string, from: string, to: string, storeMemberId?: string) =>
    apiClient.request<{ attendance: AttendanceRange }>(
        `${base(storeId)}?from=${from}&to=${to}${storeMemberId ? `&storeMemberId=${storeMemberId}` : ''}`
    );

export type TimeEntryPayload = {
    storeMemberId: string;
    workDate: string;
    clockInMinute: number;
    clockOutMinute: number | null;
    note?: string | null;
};

export const createTimeEntry = (storeId: string, payload: TimeEntryPayload) =>
    apiClient.request<{ entry: { id: string } }>(base(storeId), { method: 'POST', body: payload });

export const updateTimeEntry = (storeId: string, entryId: string, payload: TimeEntryPayload) =>
    apiClient.request<{ entry: { id: string } }>(`${base(storeId)}/${entryId}`, { method: 'PUT', body: payload });

export const deleteTimeEntry = (storeId: string, entryId: string) =>
    apiClient.request<void>(`${base(storeId)}/${entryId}`, { method: 'DELETE' });
