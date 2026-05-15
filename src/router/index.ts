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
import TeamSettings from '@/views/Stores/TeamSettings.vue'
import AccountPlan from '@/views/Account/AccountPlan.vue'
import { useStoreContextStore } from '@/stores/storeContext'
import { canAccess, FeatureKey, getDefaultRouteForRole } from '@/utils/roleAccess'

// Auth 
import Login from '@/views/LandingPage/Login.vue'
import Register from '@/views/LandingPage/Register.vue'
import ForgotPassword from '@/views/LandingPage/ForgotPassword.vue'
import ResetPassword from '@/views/LandingPage/ResetPassword.vue'
import VerifyEmail from '@/views/LandingPage/VerifyEmail.vue'


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
    meta: { requiresAuth: true }
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
    path: '/stores/:storeId/team',
    name: 'store-team',
    component: TeamSettings,
    meta: { requiresAuth: true, feature: 'storeSettings' }
  },
  {
    path: '/account/plan',
    name: 'account-plan',
    component: AccountPlan,
    meta: { requiresAuth: true }
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
const publicRoutes = ['home', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email', 'not-found']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const isPublicRoute = publicRoutes.includes(to.name as string)
  const isAuthRoute = ['login', 'register', 'forgot-password', 'reset-password'].includes(to.name as string)
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
  const feature = to.meta.feature as FeatureKey | undefined

  // Redirect to home if not logged in and trying to access a protected route
  if (!isPublicRoute && !token) {
    return { name: 'home', query: { redirect: to.fullPath } }
  }

  // Redirect to stores if already logged in and trying to access auth routes
  if (isAuthRoute && token) {
    return { name: 'stores' }
  }

  if (feature) {
    const storeId = to.params.storeId as string | undefined
    if (!storeId) {
      return { name: 'stores' }
    }
    const storeContext = useStoreContextStore()
    if (storeContext.stores.length === 0) {
      try {
        await storeContext.fetchStores()
      } catch (error) {
        return { name: 'stores' }
      }
    }
    const store = storeContext.stores.find((entry) => entry.id === storeId)
    if (!store || !canAccess(store.role, feature)) {
      const fallbackRoute = store ? getDefaultRouteForRole(store.role) : null
      if (fallbackRoute && storeId) {
        return { name: fallbackRoute, params: { storeId } }
      }
      return { name: 'stores' }
    }
  }

  return true
})

export default router
