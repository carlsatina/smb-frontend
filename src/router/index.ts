import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '@/views/LandingPage/Home.vue'
import StoreList from '@/views/Stores/StoreList.vue'
import StoreSettings from '@/views/Stores/StoreSettings.vue'
import AuditLogs from '@/views/Stores/AuditLogs.vue'
import InviteAccept from '@/views/Stores/InviteAccept.vue'
import ProductsList from '@/views/Products/ProductsList.vue'
import ProductForm from '@/views/Products/ProductForm.vue'
import InventoryDashboard from '@/views/Inventory/InventoryDashboard.vue'
import StockAdjustments from '@/views/Inventory/StockAdjustments.vue'
import InventoryMovements from '@/views/Inventory/InventoryMovements.vue'
import IngredientsList from '@/views/Inventory/IngredientsList.vue'
import SalesPos from '@/views/Sales/SalesPos.vue'
import SalesHistory from '@/views/Sales/SalesHistory.vue'
import PurchaseOrdersList from '@/views/PurchaseOrders/PurchaseOrdersList.vue'
import PurchaseOrderForm from '@/views/PurchaseOrders/PurchaseOrderForm.vue'
import PurchaseOrderDetail from '@/views/PurchaseOrders/PurchaseOrderDetail.vue'
import PurchaseReceiptDetail from '@/views/PurchaseOrders/PurchaseReceiptDetail.vue'
import PurchaseReceiptsList from '@/views/PurchaseOrders/PurchaseReceiptsList.vue'
import SupplierDetail from '@/views/PurchaseOrders/SupplierDetail.vue'
import SuppliersList from '@/views/PurchaseOrders/SuppliersList.vue'
import ReportsDashboard from '@/views/Reports/ReportsDashboard.vue'
import AiInsights from '@/views/AI/AiInsights.vue'
import ExpensesList from '@/views/Expenses/ExpensesList.vue'
import DailySalesView from '@/views/Sales/DailySalesView.vue'
import { useStoreContextStore } from '@/stores/storeContext'
import { useAdminContextStore } from '@/stores/adminContext'
import { getAdminAccessToken } from '@/api/client'
import { canAccess, FeatureKey, getDefaultRouteForRole } from '@/utils/roleAccess'
import AdminLayout from '@/views/admin/AdminLayout.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminStores from '@/views/admin/AdminStores.vue'
import AdminBilling from '@/views/admin/AdminBilling.vue'
import AdminLogin from '@/views/admin/AdminLogin.vue'

// Auth 
import Login from '@/views/LandingPage/Login.vue'
import Register from '@/views/LandingPage/Register.vue'
import ForgotPassword from '@/views/LandingPage/ForgotPassword.vue'
import ResetPassword from '@/views/LandingPage/ResetPassword.vue'
import VerifyEmail from '@/views/LandingPage/VerifyEmail.vue'
import AccountProfile from '@/views/Account/AccountProfile.vue'


const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/stores',
    name: 'stores',
    component: StoreList,
    meta: { requiresAuth: true }
  },
  {
    path: '/stores/:storeId/settings',
    name: 'store-settings',
    component: StoreSettings,
    meta: { requiresAuth: true, feature: 'storeSettings' }
  },
  {
    path: '/stores/:storeId/audit-logs',
    name: 'audit-logs',
    component: AuditLogs,
    meta: { requiresAuth: true, feature: 'storeSettings' }
  },
  {
    path: '/stores/:storeId/invites/accept',
    name: 'invite-accept',
    component: InviteAccept,
  },
  {
    path: '/stores/:storeId/products',
    name: 'products',
    component: ProductsList,
    meta: { requiresAuth: true, feature: 'products' }
  },
  {
    path: '/stores/:storeId/products/new',
    name: 'product-create',
    component: ProductForm,
    meta: { requiresAuth: true, feature: 'productsWrite' }
  },
  {
    path: '/stores/:storeId/products/:productId/edit',
    name: 'product-edit',
    component: ProductForm,
    meta: { requiresAuth: true, feature: 'productsWrite' }
  },
  {
    path: '/stores/:storeId/inventory',
    name: 'inventory',
    component: InventoryDashboard,
    meta: { requiresAuth: true, feature: 'inventory' }
  },
  {
    path: '/stores/:storeId/inventory/adjustments',
    name: 'inventory-adjustments',
    component: StockAdjustments,
    meta: { requiresAuth: true, feature: 'inventoryAdjustments' }
  },
  {
    path: '/stores/:storeId/inventory/movements',
    name: 'inventory-movements',
    component: InventoryMovements,
    meta: { requiresAuth: true, feature: 'inventory' }
  },
  {
    path: '/stores/:storeId/ingredients',
    name: 'ingredients',
    component: IngredientsList,
    meta: { requiresAuth: true, feature: 'inventory' }
  },
  {
    path: '/stores/:storeId/pos',
    name: 'pos',
    component: SalesPos,
    meta: { requiresAuth: true, feature: 'salesPos' }
  },
  {
    path: '/stores/:storeId/sales',
    name: 'sales',
    component: SalesHistory,
    meta: { requiresAuth: true, feature: 'salesHistory' }
  },
  {
    path: '/stores/:storeId/purchase-orders',
    name: 'purchase-orders',
    component: PurchaseOrdersList,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/purchase-orders/new',
    name: 'purchase-order-new',
    component: PurchaseOrderForm,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/purchase-orders/:purchaseOrderId',
    name: 'purchase-order-detail',
    component: PurchaseOrderDetail,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/purchase-orders/receipts/:receiptId',
    name: 'purchase-receipt-detail',
    component: PurchaseReceiptDetail,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/purchase-orders/receipts',
    name: 'purchase-receipts',
    component: PurchaseReceiptsList,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/suppliers/:supplierId',
    name: 'supplier-detail',
    component: SupplierDetail,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/suppliers',
    name: 'suppliers',
    component: SuppliersList,
    meta: { requiresAuth: true, feature: 'purchaseOrders' }
  },
  {
    path: '/stores/:storeId/reports',
    name: 'reports',
    component: ReportsDashboard,
    meta: { requiresAuth: true, feature: 'reports' }
  },
  {
    path: '/stores/:storeId/ai-insights',
    name: 'ai-insights',
    component: AiInsights,
    meta: { requiresAuth: true, feature: 'aiInsights' }
  },
  {
    path: '/stores/:storeId/expenses',
    name: 'expenses',
    component: ExpensesList,
    meta: { requiresAuth: true, feature: 'expenses' }
  },
  {
    path: '/stores/:storeId/daily-sales',
    name: 'daily-sales',
    component: DailySalesView,
    meta: { requiresAuth: true, feature: 'dailySales' }
  },
  {
    path: '/stores/:storeId/team',
    redirect: (to) => ({ path: `/stores/${to.params.storeId}/settings`, query: { section: 'team' } }),
  },
  {
    path: '/account/plan',
    redirect: '/stores',
  },
  {
    path: '/account/profile',
    name: 'account-profile',
    component: AccountProfile,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLogin,
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresSuperAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: AdminDashboard,
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminUsers,
      },
      {
        path: 'stores',
        name: 'admin-stores',
        component: AdminStores,
      },
      {
        path: 'billing',
        name: 'admin-billing',
        component: AdminBilling,
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/register',
    name: 'register',
    component: Register
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPassword
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPassword
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmail
  },
  // Catch-all route for undefined paths
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: { name: 'home' }
  },
]

// Public routes that don't require authentication
const publicRoutes = ['home', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email', 'not-found', 'admin-login', 'invite-accept']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const isPublicRoute = publicRoutes.includes(to.name as string)
  const isAuthRoute = ['login', 'register', 'forgot-password', 'reset-password'].includes(to.name as string)
  const isAdminRoute = Boolean(to.meta.requiresSuperAdmin)
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
  const adminToken = getAdminAccessToken()
  const feature = to.meta.feature as FeatureKey | undefined

  // --- Platform admin portal: separate, audience-scoped session ---
  if (to.name === 'admin-login') {
    if (adminToken) {
      const adminContext = useAdminContextStore()
      if (!adminContext.hasLoaded) await adminContext.fetchMe()
      if (adminContext.profile?.isSuperAdmin) {
        return { name: 'admin-dashboard' }
      }
    }
    return true
  }

  if (isAdminRoute) {
    if (!adminToken) {
      return { name: 'admin-login' }
    }
    const adminContext = useAdminContextStore()
    if (!adminContext.hasLoaded) await adminContext.fetchMe()
    if (!adminContext.profile?.isSuperAdmin) {
      return { name: 'admin-login' }
    }
    return true
  }

  // --- Normal app session ---
  // Redirect to home if not logged in and trying to access a protected route
  if (!isPublicRoute && !token) {
    return { name: 'home', query: { redirect: to.fullPath } }
  }

  // Redirect into the app if already logged in and landing on an auth route or
  // the marketing/landing page. This is what lets the mobile app skip the login
  // screen on relaunch when a valid session is still stored.
  if ((isAuthRoute || to.name === 'home') && token) {
    const redirectTo = to.query.redirect as string | undefined
    if (redirectTo) {
      return { path: redirectTo }
    }
    // Land on the reports page for the last-used store when relaunching with a
    // valid session. If no store is remembered (or it turns out to be invalid),
    // fall back to the store picker — the feature guard below handles the rest.
    const lastStoreId = localStorage.getItem('currentStoreId')
    return lastStoreId
      ? { name: 'reports', params: { storeId: lastStoreId } }
      : { name: 'stores' }
  }

  // For any authenticated store-scoped route, ensure stores are loaded and current store is synced
  const storeIdParam = to.params.storeId as string | undefined
  if (token && storeIdParam && to.meta.requiresAuth) {
    const storeContext = useStoreContextStore()
    if (storeContext.stores.length === 0) {
      try {
        await storeContext.fetchStores()
      } catch {
        // ignore — feature block below will handle redirect if needed
      }
    }
    // Sync currentStoreId to match the URL so TopNav and components show the right store
    if (storeContext.stores.some(s => s.id === storeIdParam)) {
      storeContext.setCurrentStore(storeIdParam)
    }
  }

  if (feature) {
    const storeId = storeIdParam
    if (!storeId) {
      return { name: 'stores' }
    }
    const storeContext = useStoreContextStore()
    const store = storeContext.stores.find((entry) => entry.id === storeId)
    if (!store || !canAccess(store.role, feature)) {
      const fallbackRoute = store ? getDefaultRouteForRole(store.role) : null
      if (fallbackRoute && storeId) {
        return { name: fallbackRoute, params: { storeId } }
      }
      return { name: 'stores' }
    }
    const warehouseBlockedFeatures: string[] = ['salesPos', 'salesHistory']
    if (store.storeType === 'WAREHOUSE' && warehouseBlockedFeatures.includes(feature as string)) {
      return { name: 'inventory', params: { storeId } }
    }
  }

  return true
})

export default router
