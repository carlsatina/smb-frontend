export type StoreRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'INVENTORY_MANAGER' | 'VIEWER';

const accessMap = {
    storeSettings: ['OWNER', 'ADMIN'],
    products: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'],
    productsWrite: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'],
    inventory: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'],
    inventoryAdjustments: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'],
    salesPos: ['OWNER', 'ADMIN', 'CASHIER'],
    salesHistory: ['OWNER', 'ADMIN', 'CASHIER', 'INVENTORY_MANAGER', 'VIEWER'],
    salesVoid: ['OWNER', 'ADMIN'],
    purchaseOrders: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'],
    purchaseOrdersWrite: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'],
    reports: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'],
    expenses: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER', 'CASHIER'],
    expensesWrite: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'CASHIER'],
    // Mirrors backend role enforcement. Finer gates (AI key configured, the
    // DAILY_SALES user-feature) stay on the backend + component; this is the
    // router-level role check for defense-in-depth and UX.
    aiInsights: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'],
    dailySales: ['OWNER', 'CASHIER'],
} as const;

export type FeatureKey = keyof typeof accessMap;

export const canAccess = (role: string | null | undefined, feature: FeatureKey) => {
    if (!role) return false;
    return (accessMap[feature] as readonly StoreRole[]).includes(role as StoreRole);
};

const featureRouteMap: Record<FeatureKey, string> = {
    storeSettings: 'store-settings',
    products: 'products',
    productsWrite: 'products',
    inventory: 'inventory',
    inventoryAdjustments: 'inventory-adjustments',
    salesPos: 'pos',
    salesHistory: 'sales',
    salesVoid: 'sales',
    purchaseOrders: 'purchase-orders',
    purchaseOrdersWrite: 'purchase-orders',
    reports: 'reports',
    expenses: 'expenses',
    expensesWrite: 'expenses',
    aiInsights: 'ai-insights',
    dailySales: 'daily-sales',
};

const defaultFeatureOrder: FeatureKey[] = ['products', 'inventory', 'purchaseOrders', 'reports', 'salesPos'];

export const getDefaultRouteForRole = (role: StoreRole | string | null | undefined) => {
    const feature = defaultFeatureOrder.find((key) => canAccess(role, key));
    return feature ? featureRouteMap[feature] : null;
};
