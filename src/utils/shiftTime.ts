// Shift times are stored as minutes from local midnight in the store's
// timezone. endMinute may exceed 1440 for overnight shifts (22:00 → 06:00 is
// 1320 → 1800).

export const MINUTES_IN_DAY = 1440;

// Matches the shorthand used on the payroll sheet: 9AM, 12NN, 6PM, 12MN.
export const formatMinute = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) return '';
    const wrapped = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const hour24 = Math.floor(wrapped / 60);
    const mins = wrapped % 60;
    const suffix = mins > 0 ? `:${String(mins).padStart(2, '0')}` : '';

    if (hour24 === 12 && mins === 0) return '12NN';
    if (hour24 === 0 && mins === 0) return '12MN';

    const meridiem = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}${suffix}${meridiem}`;
};

export const formatShiftRange = (start: number | null, end: number | null): string => {
    if (start === null || end === null) return '';
    const overnight = end >= MINUTES_IN_DAY;
    return `${formatMinute(start)} - ${formatMinute(end)}${overnight ? ' (+1)' : ''}`;
};

// Parses the value of an <input type="time"> ("09:00") into minutes.
export const parseTimeInput = (value: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (hours > 23 || mins > 59) return null;
    return hours * 60 + mins;
};

// Renders minutes back into an <input type="time"> value, folding overnight
// end times back into the 24h clock.
export const toTimeInput = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) return '';
    const wrapped = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

// ── Week helpers (Sunday-start, matching the backend) ────────────────────────

// Two different kinds of date flow through here, and conflating them is a real
// bug source:
//
//   • Calendar dates from the API are UTC-midnight instants. Week arithmetic
//     runs on those, so it must read UTC parts — `toUtcDateString`.
//   • "Now" is a local instant. Reading UTC parts off it shifts the answer by a
//     day for any local time before the UTC offset (00:00–07:59 in Manila),
//     which used to open last week's schedule on a Sunday morning.
//
// Hence two explicitly named helpers rather than one ambiguous `toDateString`.

// For dates constructed at UTC midnight (API values, `Date.UTC(...)`, and the
// arithmetic below).
export const toUtcDateString = (date: Date): string => date.toISOString().slice(0, 10);

// The calendar date it is *right now* where the user is.
export const todayLocal = (): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
};

export const parseDateString = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const addDays = (value: string, days: number): string =>
    toUtcDateString(new Date(parseDateString(value).getTime() + days * 86400000));

// Snaps a YYYY-MM-DD date back to the Sunday that starts its week.
export const weekStartOf = (value: string): string => {
    const base = parseDateString(value);
    return toUtcDateString(new Date(base.getTime() - base.getUTCDay() * 86400000));
};

export const currentWeekStart = (): string => weekStartOf(todayLocal());

const DAY_LABELS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const dayLabel = (index: number): string => DAY_LABELS[index] ?? '';

// Short "6/1" form used in the date band above each week.
export const shortDate = (value: string): string => {
    const date = parseDateString(value);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

export const formatWeekRange = (weekStart: string): string => {
    const end = addDays(weekStart, 6);
    const start = parseDateString(weekStart);
    const finish = parseDateString(end);
    const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const sameMonth = start.getUTCMonth() === finish.getUTCMonth();
    return sameMonth
        ? `${month(start)} ${start.getUTCDate()}–${finish.getUTCDate()}, ${finish.getUTCFullYear()}`
        : `${month(start)} ${start.getUTCDate()} – ${month(finish)} ${finish.getUTCDate()}, ${finish.getUTCFullYear()}`;
};
