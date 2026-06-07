export type PlanTier = 'STARTER' | 'STANDARD' | 'GROWTH';
export type PlanFeature = 'ingredients' | 'recipes' | 'purchaseOrders' | 'importExport';

export type PlanConfig = {
    tier: PlanTier;
    label: string;
    maxStores: number;
    maxUsersPerStore: number;
    features: Record<PlanFeature, boolean>;
};

const planConfigs: Record<PlanTier, PlanConfig> = {
    STARTER: {
        tier: 'STARTER',
        label: 'Starter',
        maxStores: 1,
        maxUsersPerStore: 2,
        features: {
            ingredients: false,
            recipes: false,
            purchaseOrders: false,
            importExport: false,
        },
    },
    STANDARD: {
        tier: 'STANDARD',
        label: 'Standard',
        maxStores: 1,
        maxUsersPerStore: 5,
        features: {
            ingredients: true,
            recipes: true,
            purchaseOrders: true,
            importExport: true,
        },
    },
    GROWTH: {
        tier: 'GROWTH',
        label: 'Growth',
        maxStores: 3,
        maxUsersPerStore: 10,
        features: {
            ingredients: true,
            recipes: true,
            purchaseOrders: true,
            importExport: true,
        },
    },
};

export const getPlanConfig = (tier?: PlanTier | null) => {
    if (!tier) return planConfigs.STARTER;
    return planConfigs[tier] ?? planConfigs.STARTER;
};

export const planTierOrder: PlanTier[] = ['STARTER', 'STANDARD', 'GROWTH'];

export const getNextPlanTier = (tier?: PlanTier | null) => {
    if (!tier) return planTierOrder[1] ?? null;
    const index = planTierOrder.indexOf(tier);
    if (index === -1) return null;
    return planTierOrder[index + 1] ?? null;
};

export const hasPlanFeature = (tier: PlanTier | null | undefined, feature: PlanFeature) => {
    if (!tier) return false;
    return planConfigs[tier]?.features[feature] ?? false;
};

export const openPlanUpgradeModal = (feature?: PlanFeature, message?: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('plan:upgrade', {
            detail: {
                feature: feature ?? null,
                message: message ?? null,
            },
        })
    );
};

export { planConfigs };
