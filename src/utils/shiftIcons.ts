// Shift preset icons: glyph + colour.
//
// Two encodings, deliberately separate:
//   • colour  = time of day — warm amber for shifts that open, cool violet for
//               shifts that close. Fixed, semantic, not owner-chosen.
//   • glyph   = the owner's preferred metaphor (sun/moon, sunrise/sunset,
//               doors). Chosen per preset.
//
// The owner assigns the token rather than the system deriving it: a 9AM-9PM
// shift both opens and closes, which no automatic open/close rule expresses.
//
// Palette validated with the dataviz validator (light surface, all-pairs)
// against the red used for "RD":
//   amber #c98500 · violet #4a3aa7 · RD red #dc2626
//   worst normal-vision ΔE 18.0, worst CVD ΔE 8.9 (deutan) — both above floor.
// Amber sits at 2.99:1 contrast, just under the 3:1 relief line; that is
// covered because the shift time is always printed beside the icon in text
// ink, so identity never rests on colour. Do not add opacity to these — it
// would push the amber below what was validated.
const DAY = '#c98500'; // opens — warm
const NIGHT = '#4a3aa7'; // closes — cool
const NEUTRAL = '#52514e'; // neither / split

export type ShiftIconToken =
    | 'none'
    | 'opening'
    | 'closing'
    | 'full-day'
    | 'sunrise'
    | 'sunset'
    | 'clock'
    | 'door-open'
    | 'door-closed';

export type ShiftGlyph = { name: string; color: string };

type ShiftIconDef = {
    token: ShiftIconToken;
    label: string;
    // More than one glyph renders side by side — full-day is sun + moon, each
    // keeping its own time-of-day colour.
    glyphs: ShiftGlyph[];
};

export const SHIFT_ICON_OPTIONS: ShiftIconDef[] = [
    { token: 'none', label: 'No icon', glyphs: [] },
    { token: 'opening', label: 'Opening', glyphs: [{ name: 'white-balance-sunny', color: DAY }] },
    { token: 'closing', label: 'Closing', glyphs: [{ name: 'weather-night', color: NIGHT }] },
    {
        token: 'full-day',
        label: 'Opens & closes',
        glyphs: [
            { name: 'white-balance-sunny', color: DAY },
            { name: 'weather-night', color: NIGHT },
        ],
    },
    { token: 'sunrise', label: 'Early', glyphs: [{ name: 'weather-sunset-up', color: DAY }] },
    { token: 'sunset', label: 'Late', glyphs: [{ name: 'weather-sunset-down', color: NIGHT }] },
    { token: 'clock', label: 'Split / other', glyphs: [{ name: 'clock-outline', color: NEUTRAL }] },
    { token: 'door-open', label: 'Open store', glyphs: [{ name: 'door-open', color: DAY }] },
    { token: 'door-closed', label: 'Close store', glyphs: [{ name: 'door-closed', color: NIGHT }] },
];

const byToken = new Map(SHIFT_ICON_OPTIONS.map((o) => [o.token, o]));

export const glyphsFor = (token: string | null | undefined): ShiftGlyph[] =>
    byToken.get((token ?? 'none') as ShiftIconToken)?.glyphs ?? [];

export const iconLabelFor = (token: string | null | undefined): string =>
    byToken.get((token ?? 'none') as ShiftIconToken)?.label ?? '';

// Pre-selects a token from the shift's position in the day, used only as a
// default in the preset picker. Always overridable.
export const suggestIcon = (startMinute: number, endMinute: number): ShiftIconToken => {
    const opensEarly = startMinute <= 10 * 60; // starts by 10am
    const closesLate = endMinute >= 20 * 60; // ends 8pm or later
    if (opensEarly && closesLate) return 'full-day';
    if (opensEarly) return 'opening';
    if (closesLate) return 'closing';
    return 'clock';
};
