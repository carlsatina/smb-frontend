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
} as const;

export type FeatureKey = keyof typeof accessMap;

export const canAccess = (role: string | null | undefined, feature: FeatureKey) => {
    if (!role) return false;
    return accessMap[feature].includes(role as StoreRole);
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
};

const defaultFeatureOrder: FeatureKey[] = ['products', 'inventory', 'purchaseOrders', 'reports', 'salesPos'];

export const getDefaultRouteForRole = (role: StoreRole | string | null | undefined) => {
    const feature = defaultFeatureOrder.find((key) => canAccess(role, key));
    return feature ? featureRouteMap[feature] : null;
};
