// Shared timezone helpers for converting a store-local wall-clock day into the
// UTC instants used by the backend's date-range filters. Mirrors the backend
// `parseImportDate` logic so list filters bucket by the store's timezone rather
// than the viewer's browser timezone.

const DEFAULT_TIMEZONE = 'Asia/Manila';

/**
 * Offset (in ms) of `timeZone` from UTC at the given instant.
 * Positive means the zone is ahead of UTC (e.g. Asia/Manila = +8h).
 */
const getTimezoneOffsetMs = (instant: Date, timeZone: string): number => {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const map: Record<string, number> = {};
    for (const part of dtf.formatToParts(instant)) {
        if (part.type !== 'literal') map[part.type] = Number(part.value);
    }
    const hour = map.hour === 24 ? 0 : map.hour;
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
    // The formatter resolves only to whole seconds, so subtracting an instant
    // that carries milliseconds would skew the result. Zone offsets are always
    // whole minutes, so round to the nearest minute to stay exact.
    return Math.round((asUTC - instant.getTime()) / 60000) * 60000;
};

/**
 * Interprets the given wall-clock components as a time in `timeZone` and returns
 * the corresponding UTC ISO string. Two-pass refinement keeps it correct across
 * DST boundaries (no-op for fixed-offset zones like Asia/Manila).
 */
const zonedWallTimeToUtcIso = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    ms: number,
    timeZone: string
): string => {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const offset = getTimezoneOffsetMs(new Date(utcGuess), timeZone);
    const refined = getTimezoneOffsetMs(new Date(utcGuess - offset), timeZone);
    return new Date(utcGuess - refined).toISOString();
};

const parseDateInput = (dateStr: string): [number, number, number] | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/**
 * Start of the given calendar day (00:00:00.000) in `timeZone`, as a UTC ISO
 * string suitable for a `from` filter. Returns undefined for empty/invalid input.
 */
export const zonedDayStartIso = (dateStr: string, timeZone = DEFAULT_TIMEZONE): string | undefined => {
    const parts = parseDateInput(dateStr);
    if (!parts) return undefined;
    return zonedWallTimeToUtcIso(parts[0], parts[1], parts[2], 0, 0, 0, 0, timeZone);
};

/**
 * End of the given calendar day (23:59:59.999) in `timeZone`, as a UTC ISO
 * string suitable for a `to` filter. Returns undefined for empty/invalid input.
 */
export const zonedDayEndIso = (dateStr: string, timeZone = DEFAULT_TIMEZONE): string | undefined => {
    const parts = parseDateInput(dateStr);
    if (!parts) return undefined;
    return zonedWallTimeToUtcIso(parts[0], parts[1], parts[2], 23, 59, 59, 999, timeZone);
};
