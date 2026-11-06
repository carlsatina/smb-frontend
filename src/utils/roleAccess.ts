export type StoreRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'INVENTORY_MANAGER' | 'VIEWER';

export type PermissionKey =
    | 'pos.use'
    | 'sales.void'
    | 'sales.edit'
    | 'inventory.view'
    | 'inventory.manage'
    | 'reports.view'
    | 'ai.use'
    | 'expenses.manage'
    | 'schedule.manage'
    | 'store.manage';

/** The bits of a store summary that access checks need. */
export type StoreAccess = {
    role?: string | null;
    // Effective permissions for the signed-in member, computed by the backend
    // from the role defaults plus the store's Roles & permissions settings.
    permissions?: string[] | null;
};

// Fallback only, for a store summary that arrived without `permissions`.
// Mirrors backend DEFAULT_ROLE_PERMISSIONS; the backend stays the real gate.
const DEFAULT_PERMISSIONS: Record<Exclude<StoreRole, 'OWNER'>, PermissionKey[]> = {
    ADMIN: [
        'pos.use',
        'sales.void',
        'sales.edit',
        'inventory.view',
        'inventory.manage',
        'reports.view',
        'ai.use',
        'expenses.manage',
        'schedule.manage',
        'store.manage',
    ],
    INVENTORY_MANAGER: ['inventory.view', 'inventory.manage', 'reports.view', 'expenses.manage'],
    CASHIER: ['pos.use', 'expenses.manage'],
    VIEWER: ['inventory.view', 'reports.view'],
};

export const hasPermission = (store: StoreAccess | null | undefined, permission: PermissionKey) => {
    if (!store?.role) return false;
    if (store.role === 'OWNER') return true;
    const permissions =
        store.permissions ?? DEFAULT_PERMISSIONS[store.role as Exclude<StoreRole, 'OWNER'>] ?? [];
    return permissions.includes(permission);
};

type Rule = { anyOf: PermissionKey[] } | { member: true } | { roles: StoreRole[] };

// Page/feature → who may use it. Mirrors the backend route guards for UX; the
// backend enforces the same rules.
const accessRules = {
    storeSettings: { anyOf: ['store.manage'] },
    products: { anyOf: ['inventory.view'] },
    productsWrite: { anyOf: ['inventory.manage'] },
    inventory: { anyOf: ['inventory.view'] },
    inventoryAdjustments: { anyOf: ['inventory.manage'] },
    salesPos: { anyOf: ['pos.use'] },
    salesHistory: { member: true },
    salesVoid: { anyOf: ['sales.void'] },
    salesEdit: { anyOf: ['sales.edit'] },
    purchaseOrders: { anyOf: ['inventory.view'] },
    purchaseOrdersWrite: { anyOf: ['inventory.manage'] },
    reports: { anyOf: ['reports.view'] },
    expenses: { member: true },
    expensesWrite: { anyOf: ['expenses.manage'] },
    // The page holds the AI summary/chat (ai.use) and the reorder plan (inventory.manage).
    aiInsights: { anyOf: ['ai.use', 'inventory.manage'] },
    // Daily sales is a per-user feature (DAILY_SALES) for owners and cashiers, outside the matrix.
    dailySales: { roles: ['OWNER', 'CASHIER'] },
    // Everyone can open the schedule; managing it needs schedule.manage.
    schedule: { member: true },
} satisfies Record<string, Rule>;

export type FeatureKey = keyof typeof accessRules;

export const canAccess = (store: StoreAccess | null | undefined, feature: FeatureKey) => {
    if (!store?.role) return false;
    const rule: Rule = accessRules[feature];
    if ('member' in rule) return true;
    if ('roles' in rule) return rule.roles.includes(store.role as StoreRole);
    return rule.anyOf.some((permission) => hasPermission(store, permission));
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
    salesEdit: 'sales',
    purchaseOrders: 'purchase-orders',
    purchaseOrdersWrite: 'purchase-orders',
    reports: 'reports',
    expenses: 'expenses',
    expensesWrite: 'expenses',
    aiInsights: 'ai-insights',
    dailySales: 'daily-sales',
    schedule: 'schedule',
};

// Landing page order; sales history and schedule are open to every member, so
// any role always lands somewhere.
const defaultFeatureOrder: FeatureKey[] = ['products', 'inventory', 'purchaseOrders', 'reports', 'salesPos', 'salesHistory'];

export const getDefaultRouteForStore = (store: StoreAccess | null | undefined) => {
    const feature = defaultFeatureOrder.find((key) => canAccess(store, key));
    return feature ? featureRouteMap[feature] : null;
};
