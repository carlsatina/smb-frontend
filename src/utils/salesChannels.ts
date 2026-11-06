// Mirrors backend src/shared/salesChannels.ts so the POS shows the same price the
// server will charge. The server re-prices channel sales; this is display only.
export type ChannelRounding = 'NONE' | 'NEAREST_1' | 'NEAREST_5' | 'UP_5' | 'NEAREST_10';

export type SalesChannel = {
    key: string;
    name: string;
    markupPercent: number;
    rounding: ChannelRounding;
    alwaysTakeout: boolean;
    active: boolean;
};

export const ROUNDING_OPTIONS: Array<{ value: ChannelRounding; label: string }> = [
    { value: 'NEAREST_1', label: 'Nearest whole peso' },
    { value: 'NEAREST_5', label: 'Nearest 5' },
    { value: 'UP_5', label: 'Up to the next 5' },
    { value: 'NEAREST_10', label: 'Nearest 10' },
    { value: 'NONE', label: 'No rounding' },
];

const roundMoney = (value: number) => Number(value.toFixed(2));

export const applyRounding = (value: number, rounding: ChannelRounding) => {
    const eps = 1e-9;
    switch (rounding) {
        case 'NEAREST_1':
            return Math.round(value + eps);
        case 'NEAREST_5':
            return Math.round(value / 5 + eps) * 5;
        case 'UP_5':
            return Math.ceil(value / 5 - eps) * 5;
        case 'NEAREST_10':
            return Math.round(value / 10 + eps) * 10;
        default:
            return roundMoney(value);
    }
};

export const computeChannelPrice = (basePrice: number, channel: SalesChannel, override?: number | null) => {
    if (override !== null && override !== undefined && Number.isFinite(override) && override >= 0) {
        return roundMoney(override);
    }
    return applyRounding(basePrice * (1 + channel.markupPercent / 100), channel.rounding);
};

export const activeChannels = (channels: SalesChannel[] | null | undefined) =>
    (channels ?? []).filter((channel) => channel.active);
