<template>
    <section class="reports-page">
        <div class="reports-shell">
            <header class="reports-header">
                <div class="reports-title">
                    <span class="reports-eyebrow">Insights</span>
                    <h1>Reports</h1>
                    <p>Track sales momentum, top performers, and inventory risks for {{ currentStoreLabel }}.</p>
                </div>
                <div class="reports-controls">
                    <!-- Date range nav -->
                    <div class="range-nav">
                        <button
                            type="button"
                            class="range-nav-btn"
                            title="Previous period"
                            :disabled="isLoading"
                            @click="traverseRange(-1)"
                        >
                            <mdicon name="chevron-left" size="16" />
                        </button>

                        <div ref="datePopoverRef" class="range-trigger-wrap">
                            <button
                                type="button"
                                class="range-trigger"
                                :class="{ 'range-trigger--open': showDatePopover }"
                                @click="toggleDatePopover"
                            >
                                <mdicon name="calendar-range-outline" size="15" />
                                <span>{{ rangeLabel }}</span>
                                <mdicon :name="showDatePopover ? 'chevron-up' : 'chevron-down'" size="13" class="range-trigger-chevron" />
                            </button>

                            <Transition name="dropdown">
                                <div v-if="showDatePopover" class="date-popover">
                                    <div class="date-popover-section">
                                        <div class="date-popover-label">Quick range</div>
                                        <div class="date-popover-quick">
                                            <button
                                                type="button"
                                                class="date-popover-quick-btn"
                                                :class="{ active: activeRange === 'TODAY' }"
                                                @click="applyQuickRange('TODAY')"
                                            >Today</button>
                                            <button
                                                type="button"
                                                class="date-popover-quick-btn"
                                                :class="{ active: activeRange === 'LAST_7' }"
                                                @click="applyQuickRange('LAST_7')"
                                            >Last 7 days</button>
                                            <button
                                                type="button"
                                                class="date-popover-quick-btn"
                                                :class="{ active: activeRange === 'LAST_30' }"
                                                @click="applyQuickRange('LAST_30')"
                                            >Last 30 days</button>
                                        </div>
                                    </div>
                                    <div class="date-popover-divider"></div>
                                    <div class="date-popover-section">
                                        <div class="date-popover-label">Custom range</div>
                                        <div class="date-popover-inputs">
                                            <label class="date-popover-field">
                                                <span>From</span>
                                                <input v-model="draftFrom" type="date" />
                                            </label>
                                            <label class="date-popover-field">
                                                <span>To</span>
                                                <input v-model="draftTo" type="date" />
                                            </label>
                                        </div>
                                        <button type="button" class="date-popover-apply" @click="applyCustomRange">
                                            Apply range
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        </div>

                        <button
                            type="button"
                            class="range-nav-btn"
                            title="Next period"
                            :disabled="isLoading"
                            @click="traverseRange(1)"
                        >
                            <mdicon name="chevron-right" size="16" />
                        </button>
                    </div>

                    <div ref="cardSettingsRef" class="card-settings-wrap">
                        <button
                            class="icon-button"
                            :class="{ active: showCardSettings }"
                            type="button"
                            title="Customize cards"
                            @click="showCardSettings = !showCardSettings"
                        >
                            <mdicon name="cog-outline" size="18" />
                        </button>
                        <div v-if="showCardSettings" class="card-settings-dropdown">
                            <div class="card-settings-header">Visible cards</div>
                            <label
                                v-for="card in availableCards"
                                :key="card.id"
                                class="card-settings-row"
                            >
                                <input type="checkbox" v-model="visibleCards[card.id]" />
                                <span>{{ card.label }}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            <div v-if="storeContext.currentStoreId && canViewReports" class="reports-kpis">
                <div class="kpi-card">
                    <span class="kpi-label">Net sales</span>
                    <span class="kpi-value">{{ formatMoney(salesSummary.netSales) }}</span>
                    <span class="kpi-sub">{{ rangeLabel }}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Orders</span>
                    <span class="kpi-value">{{ salesSummary.orderCount }}</span>
                    <span class="kpi-sub">Finalized sales</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Avg order</span>
                    <span class="kpi-value">{{ formatMoney(salesSummary.avgOrder) }}</span>
                    <span class="kpi-sub">Across range</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Discounts</span>
                    <span class="kpi-value">{{ formatMoney(salesSummary.discounts) }}</span>
                    <span class="kpi-sub">Gross {{ formatMoney(salesSummary.grossSales) }}</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Voids</span>
                    <span class="kpi-value">{{ salesSummary.voidCount }}</span>
                    <span class="kpi-sub">{{ formatMoney(salesSummary.voidedSales) }}</span>
                </div>
                <div class="kpi-card kpi-card--profit">
                    <span class="kpi-label">Net profit</span>
                    <span class="kpi-value" :class="{ 'kpi-value--negative': profitSummary.totalProfit < 0 }">
                        {{ formatMoney(profitSummary.totalProfit) }}
                    </span>
                    <span class="kpi-sub">
                        {{ profitSummary.marginPct }}% margin
                        <span v-if="profitSummary.itemsWithCost < profitSummary.totalItems" class="kpi-warn">
                            ({{ profitSummary.itemsWithCost }}/{{ profitSummary.totalItems }} costed)
                        </span>
                    </span>
                </div>
            </div>

            <div v-if="!storeContext.currentStoreId" class="panel-state">
                Select or create a store to view reports.
            </div>

            <div v-else-if="!canViewReports" class="panel-state">
                Your role does not have access to reports for this store.
            </div>

            <div v-else-if="errorMessage" class="panel-state panel-state--error">
                {{ errorMessage }}
            </div>

            <div v-else class="reports-grid">
                <section v-if="visibleCards['sales-charts']" class="report-card report-card--wide charts-row" :class="{ 'charts-row--single': isSingleDay }">
                    <div v-if="!isSingleDay" class="chart-panel">
                        <div class="chart-panel-header">
                            <h3>Sales by day</h3>
                            <span class="chart-total">{{ formatMoney(salesSummary.netSales) }}</span>
                        </div>
                        <div v-if="isLoading" class="panel-state panel-state--small">Loading...</div>
                        <div v-else class="chart-with-axis">
                            <div class="y-axis">
                                <span>{{ formatCompactMoney(chartMax) }}</span>
                                <span>{{ formatCompactMoney(chartMax / 2) }}</span>
                                <span>0</span>
                            </div>
                            <div class="chart-area">
                                <div class="grid-lines">
                                    <span class="grid-line"></span>
                                    <span class="grid-line"></span>
                                    <span class="grid-line"></span>
                                </div>
                                <div class="mini-chart daily-chart">
                                    <div
                                        v-for="day in salesDays"
                                        :key="day.date"
                                        class="mini-bar"
                                        :class="{
                                            'bar-peak': day.totalSales === chartMax && chartMax > 0,
                                            'bar-weekend': isWeekend(day.date)
                                        }"
                                        :title="`${formatDayLabel(day.date)}: ${formatMoney(day.totalSales)} (${day.orderCount} orders)`"
                                    >
                                        <span class="bar-fill" :style="{ height: miniBarHeight(day.totalSales, chartMax) }"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="chart-labels chart-labels--daily">
                            <span v-for="(label, index) in dailyChartLabels" :key="index">{{ label }}</span>
                        </div>
                    </div>
                    <div class="chart-panel">
                        <div class="chart-panel-header">
                            <h3>Sales by hour</h3>
                            <span class="chart-total">{{ salesSummary.orderCount }} orders</span>
                        </div>
                        <div v-if="isLoading" class="panel-state panel-state--small">Loading...</div>
                        <div v-else class="chart-with-axis">
                            <div class="y-axis">
                                <span>{{ formatCompactMoney(hourlyMax) }}</span>
                                <span>{{ formatCompactMoney(hourlyMax / 2) }}</span>
                                <span>0</span>
                            </div>
                            <div class="chart-area">
                                <div class="grid-lines">
                                    <span class="grid-line"></span>
                                    <span class="grid-line"></span>
                                    <span class="grid-line"></span>
                                </div>
                                <div class="mini-chart hourly-chart">
                                    <div
                                        v-for="hour in hourlySales"
                                        :key="hour.hour"
                                        class="mini-bar"
                                        :class="{ 'bar-peak': hour.totalSales === hourlyMax && hourlyMax > 0 }"
                                        :title="`${formatHourLabel(hour.hour)}: ${formatMoney(hour.totalSales)} (${hour.orderCount} orders)`"
                                    >
                                        <span class="bar-fill" :style="{ height: miniBarHeight(hour.totalSales, hourlyMax) }"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="chart-labels chart-labels--hourly">
                            <span>12a</span>
                            <span>6a</span>
                            <span>12p</span>
                            <span>6p</span>
                            <span>11p</span>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['daypart-mix']" class="report-card">
                    <div class="card-header">
                        <div>
                            <h2>Daypart mix</h2>
                            <p>Sales share by time of day</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Breakdown</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading daypart mix...</div>
                    <div v-else-if="daypartSummary.length === 0" class="panel-state">
                        No sales data yet.
                    </div>
                    <div v-else class="daypart-list">
                        <div v-for="part in daypartSummary" :key="part.label" class="daypart-row">
                            <div>
                                <div class="item-name">{{ part.label }}</div>
                                <div class="item-meta">{{ part.orderCount }} orders · {{ part.sharePct }}% of sales</div>
                            </div>
                            <div class="item-metrics">
                                <strong>{{ formatMoney(part.totalSales) }}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['payment-methods']" class="report-card">
                    <div class="card-header">
                        <div>
                            <h2>Payment methods</h2>
                            <p>Sales split by payment type</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Breakdown</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading payment methods...</div>
                    <div v-else-if="paymentMethods.length === 0" class="panel-state">
                        No sales data yet.
                    </div>
                    <div v-else class="daypart-list">
                        <div v-for="pm in paymentMethods" :key="pm.method" class="daypart-row">
                            <div>
                                <div class="item-name">{{ formatPaymentMethod(pm.method) }}</div>
                                <div class="item-meta">{{ pm.orderCount }} orders · {{ pm.sharePct }}% of sales</div>
                            </div>
                            <div class="item-metrics">
                                <strong>{{ formatMoney(pm.total) }}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['top-products']" class="report-card">
                    <div class="card-header">
                        <div>
                            <h2>Top products</h2>
                            <p>By sales value</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Top {{ topProducts.length }}</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading top products...</div>
                    <div v-else-if="topProducts.length === 0" class="panel-state">
                        No sales data yet.
                    </div>
                    <div v-else class="top-list">
                        <div v-for="product in topProducts" :key="product.productId" class="top-item">
                            <div>
                                <div class="item-name">{{ product.name }}</div>
                                <div class="item-meta">
                                    <span v-if="product.sku">SKU {{ product.sku }}</span>
                                    <span v-if="product.unit">{{ product.unit }}</span>
                                </div>
                            </div>
                            <div class="item-metrics">
                                <span class="metric">{{ formatQty(product.qtySold) }} sold</span>
                                <strong>{{ formatMoney(product.totalSales) }}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['item-margins']" class="report-card report-card--wide">
                    <div class="card-header">
                        <div>
                            <h2>Item margins</h2>
                            <p>Gross profit for top sellers</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Profit</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading margins...</div>
                    <div v-else-if="productMargins.length === 0" class="panel-state">
                        No margin data yet.
                    </div>
                    <div v-else class="table-wrap">
                        <table class="low-stock-table table-compact table-compact--bordered">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty sold</th>
                                    <th>Revenue</th>
                                    <th>Cost</th>
                                    <th>Profit</th>
                                    <th>Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in productMargins" :key="item.productId">
                                    <td>
                                        <div class="item-name">{{ item.name }}</div>
                                        <div class="item-meta">
                                            <span v-if="item.sku">SKU {{ item.sku }}</span>
                                            <span v-if="item.unit">{{ item.unit }}</span>
                                            <span v-if="!item.costKnown" class="warn-text">Missing cost</span>
                                        </div>
                                    </td>
                                    <td>{{ formatQty(item.qtySold) }}</td>
                                    <td>{{ formatMoney(item.revenue) }}</td>
                                    <td>{{ item.cost === null ? '—' : formatMoney(item.cost) }}</td>
                                    <td>{{ item.profit === null ? '—' : formatMoney(item.profit) }}</td>
                                    <td :class="item.marginPct === null ? '' : item.marginPct >= 30 ? 'margin-good' : item.marginPct >= 0 ? 'margin-warn' : 'margin-bad'">
                                        {{ item.marginPct === null ? '—' : `${item.marginPct}%` }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="chart-footnote">
                            Costs known for {{ marginSummary.costedItems }} of {{ marginSummary.totalItems }} items.
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['ingredient-usage'] && canUseIngredients" class="report-card">
                    <div class="card-header">
                        <div>
                            <h2>Ingredient usage</h2>
                            <p>Based on recipe sales</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Top {{ ingredientUsage.length }}</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading ingredient usage...</div>
                    <div v-else-if="ingredientUsage.length === 0" class="panel-state">
                        No recipe usage tracked yet.
                    </div>
                    <div v-else class="top-list">
                        <div v-for="item in ingredientUsage" :key="item.ingredientId" class="top-item">
                            <div>
                                <div class="item-name">{{ item.name }}</div>
                                <div class="item-meta">
                                    <span v-if="item.unit">{{ item.unit }}</span>
                                </div>
                            </div>
                            <div class="item-metrics">
                                <span class="metric">Used</span>
                                <strong>{{ formatQty(item.qtyUsed) }}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['supplier-analytics'] && canUsePurchaseOrders" class="report-card">
                    <div class="card-header">
                        <div>
                            <h2>Supplier analytics</h2>
                            <p>Purchase receipts snapshot</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Purchasing</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading supplier analytics...</div>
                    <div v-else class="supplier-metrics">
                        <div class="metric-card">
                            <span class="metric-label">Total spend</span>
                            <strong>{{ formatMoney(purchaseSpendSummary.totalSpend) }}</strong>
                            <span class="metric-sub">{{ purchaseSpendSummary.totalReceipts }} receipts</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Avg receipt</span>
                            <strong>{{ formatMoney(purchaseSpendSummary.avgReceipt) }}</strong>
                            <span class="metric-sub">Across range</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Top supplier</span>
                            <strong>{{ topSupplier?.supplierName || '-' }}</strong>
                            <span class="metric-sub">
                                {{ topSupplier ? formatMoney(topSupplier.totalSpend) : 'No receipts yet' }}
                            </span>
                        </div>
                    </div>
                </section>

                <section v-if="visibleCards['low-stock']" class="report-card report-card--wide">
                    <div class="card-header">
                        <div>
                            <h2>Low stock watch</h2>
                            <p>Items at or below threshold</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Needs attention</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading low stock...</div>
                    <div v-else-if="lowStockItems.length === 0" class="panel-state">
                        All tracked items are above their thresholds.
                    </div>
                    <div v-else class="table-wrap">
                        <table class="low-stock-table table-compact table-compact--bordered">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th>On hand</th>
                                    <th>Threshold</th>
                                    <th>Shortfall</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in lowStockItems" :key="`${item.itemType}-${item.itemId}`">
                                    <td>
                                        <div class="item-name">{{ item.name }}</div>
                                        <div class="item-meta">{{ item.unit }}</div>
                                    </td>
                                    <td>
                                        <span :class="['item-type-chip', item.itemType === 'INGREDIENT' ? 'item-type-chip--ingredient' : 'item-type-chip--product']">
                                            {{ item.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}
                                        </span>
                                    </td>
                                    <td>{{ formatQty(item.currentQty) }}</td>
                                    <td>{{ formatQty(item.lowStockThreshold) }}</td>
                                    <td class="shortfall">{{ formatQty(item.shortfall) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section v-if="visibleCards['purchase-spend'] && canUsePurchaseOrders" class="report-card report-card--wide">
                    <div class="card-header">
                        <div>
                            <h2>Purchase spend by supplier</h2>
                            <p>Receipts logged in the selected range</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Spend</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading purchase spend...</div>
                    <div v-else-if="purchaseSpend.length === 0" class="panel-state">
                        No receipts recorded in this range.
                    </div>
                    <div v-else class="table-wrap">
                        <table class="low-stock-table table-compact table-compact--bordered">
                            <thead>
                                <tr>
                                    <th>Supplier</th>
                                    <th>Receipts</th>
                                    <th>Total spend</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="supplier in purchaseSpend" :key="supplier.supplierId || supplier.supplierName">
                                    <td>
                                        <button class="supplier-link" type="button" @click="openSupplierSpend(supplier)">
                                            {{ supplier.supplierName }}
                                        </button>
                                    </td>
                                    <td>{{ supplier.receiptCount }}</td>
                                    <td>{{ formatMoney(supplier.totalSpend) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                <section v-if="visibleCards['employee-sales']" class="report-card report-card--wide">
                    <div class="card-header">
                        <div>
                            <h2>Employee sales</h2>
                            <p>Sales per staff member with payment breakdown</p>
                        </div>
                        <div class="card-meta">
                            <span class="pill">Staff</span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading employee sales...</div>
                    <div v-else-if="employeeSales.length === 0" class="panel-state">
                        No sales data yet.
                    </div>
                    <div v-else class="table-wrap">
                        <table class="low-stock-table table-compact table-compact--bordered table--employee">
                            <thead>
                                <tr>
                                    <th>Staff</th>
                                    <th>Role</th>
                                    <th>Orders</th>
                                    <th>Cash</th>
                                    <th>Card</th>
                                    <th>GCash</th>
                                    <th>Maya</th>
                                    <th>Transfer</th>
                                    <th>Other</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="emp in employeeSales" :key="emp.cashierId">
                                    <td>
                                        <div class="item-name">{{ emp.name }}</div>
                                        <div class="item-meta">{{ emp.email }}</div>
                                    </td>
                                    <td>
                                        <span v-if="emp.role" class="item-type-chip">{{ emp.role }}</span>
                                        <span v-else class="item-meta">—</span>
                                    </td>
                                    <td>{{ emp.orderCount }}</td>
                                    <td v-for="method in ['CASH','CARD','GCASH','MAYA','TRANSFER','OTHER']" :key="method">
                                        {{ formatMoney(emp.methods.find(m => m.method === method)?.total ?? 0) }}
                                    </td>
                                    <td><strong>{{ formatMoney(emp.totalSales) }}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    getEmployeeSales,
    getIngredientUsage,
    getLowStock,
    getPaymentMethodBreakdown,
    getProductMargins,
    getPurchaseSpend,
    getSalesByDay,
    getSalesByHour,
    getSalesSummary,
    getTopProducts,
    EmployeeSalesRecord,
    IngredientUsageRecord,
    LowStockItem,
    PaymentMethodRecord,
    PurchaseSpendRecord,
    PurchaseSpendSummary,
    ProductMarginRecord,
    SalesByHourRecord,
    SalesByDayRecord,
    SalesSummaryTotals,
    TopProductRecord,
} from '@/api/reports';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import type { PlanFeature } from '@/utils/planAccess';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();

const padDateValue = (value: number) => String(value).padStart(2, '0');
const buildDateInput = (value: Date) =>
    `${value.getFullYear()}-${padDateValue(value.getMonth() + 1)}-${padDateValue(value.getDate())}`;

const today = new Date();
const defaultTo = buildDateInput(today);
const defaultFrom = buildDateInput(today);

const filters = reactive({
    from: defaultFrom,
    to: defaultTo,
});

const activeRange = ref<'TODAY' | 'LAST_7' | 'LAST_30' | null>('TODAY');
const isSettingRange = ref(false);

const isLoading = ref(false);
const errorMessage = ref('');
const salesDays = ref<SalesByDayRecord[]>([]);
const salesSummary = ref<SalesSummaryTotals>({
    grossSales: 0,
    discounts: 0,
    tax: 0,
    netSales: 0,
    orderCount: 0,
    avgOrder: 0,
    voidedSales: 0,
    voidCount: 0,
});
const hourlySales = ref<SalesByHourRecord[]>([]);
const topProducts = ref<TopProductRecord[]>([]);
const lowStockItems = ref<LowStockItem[]>([]);
const ingredientUsage = ref<IngredientUsageRecord[]>([]);
const purchaseSpend = ref<PurchaseSpendRecord[]>([]);
const productMargins = ref<ProductMarginRecord[]>([]);
const paymentMethods = ref<PaymentMethodRecord[]>([]);
const employeeSales = ref<EmployeeSalesRecord[]>([]);
const marginSummary = ref({ costedItems: 0, totalItems: 0 });
const purchaseSpendSummary = ref<PurchaseSpendSummary>({
    totalSpend: 0,
    totalReceipts: 0,
    avgReceipt: 0,
});
const canViewReports = computed(() => canAccess(storeContext.currentStore?.role, 'reports'));
const isSingleDay = computed(() => filters.from === filters.to);
const canUseIngredients = computed(() => hasPlanFeature(userContext.planTier, 'ingredients'));
const canUsePurchaseOrders = computed(() => hasPlanFeature(userContext.planTier, 'purchaseOrders'));

const REPORT_CARDS: { id: string; label: string; planFeature?: PlanFeature }[] = [
    { id: 'sales-charts',       label: 'Sales by day / hour' },
    { id: 'daypart-mix',        label: 'Daypart mix' },
    { id: 'payment-methods',    label: 'Payment methods' },
    { id: 'top-products',       label: 'Top products' },
    { id: 'item-margins',       label: 'Item margins' },
    { id: 'ingredient-usage',   label: 'Ingredient usage',   planFeature: 'ingredients' },
    { id: 'supplier-analytics', label: 'Supplier analytics', planFeature: 'purchaseOrders' },
    { id: 'low-stock',          label: 'Low stock watch' },
    { id: 'purchase-spend',     label: 'Purchase spend',     planFeature: 'purchaseOrders' },
    { id: 'employee-sales',     label: 'Employee sales' },
];

const STORAGE_KEY = 'reports_card_visibility';

const loadVisibility = (): Record<string, boolean> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return {};
};

const savedVisibility = loadVisibility();
const visibleCards = reactive<Record<string, boolean>>(
    Object.fromEntries(REPORT_CARDS.map(({ id }) => [id, savedVisibility[id] ?? true]))
);

const availableCards = computed(() =>
    REPORT_CARDS.filter(c => !c.planFeature || hasPlanFeature(userContext.planTier, c.planFeature))
);

watch(visibleCards, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

const showCardSettings = ref(false);
const cardSettingsRef = ref<HTMLElement | null>(null);

const showDatePopover = ref(false);
const datePopoverRef = ref<HTMLElement | null>(null);
const draftFrom = ref(filters.from);
const draftTo = ref(filters.to);

const toggleDatePopover = () => {
    if (!showDatePopover.value) {
        draftFrom.value = filters.from;
        draftTo.value = filters.to;
    }
    showDatePopover.value = !showDatePopover.value;
    showCardSettings.value = false;
};

const closeDatePopover = () => { showDatePopover.value = false; };

const applyQuickRange = async (range: 'TODAY' | 'LAST_7' | 'LAST_30') => {
    closeDatePopover();
    await setQuickRange(range);
};

const applyCustomRange = () => {
    if (!draftFrom.value || !draftTo.value) return;
    if (draftTo.value < draftFrom.value) return;
    closeDatePopover();
    isSettingRange.value = true;
    activeRange.value = null;
    filters.from = draftFrom.value;
    filters.to = draftTo.value;
    nextTick(() => { isSettingRange.value = false; });
};

const traverseRange = (direction: 1 | -1) => {
    const MS_PER_DAY = 86400000;
    const fromDate = new Date(filters.from + 'T00:00:00');
    const toDate = new Date(filters.to + 'T00:00:00');
    const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY) + 1;
    const shift = direction * daysInRange * MS_PER_DAY;
    isSettingRange.value = true;
    activeRange.value = null;
    filters.from = buildDateInput(new Date(fromDate.getTime() + shift));
    filters.to = buildDateInput(new Date(toDate.getTime() + shift));
    nextTick(() => { isSettingRange.value = false; });
};

const onClickOutsideSettings = (e: MouseEvent) => {
    const target = e.target as Node;
    if (showCardSettings.value && cardSettingsRef.value && !cardSettingsRef.value.contains(target)) {
        showCardSettings.value = false;
    }
    if (showDatePopover.value && datePopoverRef.value && !datePopoverRef.value.contains(target)) {
        showDatePopover.value = false;
    }
};

const profitSummary = computed(() => {
    const items = productMargins.value;
    let totalRevenue = 0;
    let totalCost = 0;
    let itemsWithCost = 0;

    for (const item of items) {
        totalRevenue += item.revenue || 0;
        if (item.cost !== null) {
            totalCost += item.cost;
            itemsWithCost++;
        }
    }

    const totalProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
        totalRevenue,
        totalCost,
        totalProfit,
        marginPct: Math.round(marginPct * 10) / 10,
        itemsWithCost,
        totalItems: items.length,
    };
});

const loadReports = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !canViewReports.value) {
        salesDays.value = [];
        salesSummary.value = {
            grossSales: 0,
            discounts: 0,
            tax: 0,
            netSales: 0,
            orderCount: 0,
            avgOrder: 0,
            voidedSales: 0,
            voidCount: 0,
        };
        topProducts.value = [];
        lowStockItems.value = [];
        ingredientUsage.value = [];
        purchaseSpend.value = [];
        hourlySales.value = [];
        productMargins.value = [];
        marginSummary.value = { costedItems: 0, totalItems: 0 };
        purchaseSpendSummary.value = { totalSpend: 0, totalReceipts: 0, avgReceipt: 0 };
        paymentMethods.value = [];
        employeeSales.value = [];
        return;
    }
    isLoading.value = true;
    errorMessage.value = '';
    try {
        const [summary, sales, hourly, top, lowStock, usage, spend, margins, paymentBreakdown, empSales] =
            await Promise.allSettled([
                getSalesSummary(storeId, { from: filters.from, to: filters.to }),
                getSalesByDay(storeId, { from: filters.from, to: filters.to }),
                getSalesByHour(storeId, { from: filters.from, to: filters.to }),
                getTopProducts(storeId, { from: filters.from, to: filters.to, limit: 8 }),
                getLowStock(storeId, { limit: 8 }),
                canUseIngredients.value
                    ? getIngredientUsage(storeId, { from: filters.from, to: filters.to, limit: 8 })
                    : Promise.resolve({ ingredients: [] as IngredientUsageRecord[] }),
                canUsePurchaseOrders.value
                    ? getPurchaseSpend(storeId, { from: filters.from, to: filters.to, limit: 8 })
                    : Promise.resolve({ suppliers: [] as PurchaseSpendRecord[], summary: { totalSpend: 0, totalReceipts: 0, avgReceipt: 0 } as PurchaseSpendSummary }),
                getProductMargins(storeId, { from: filters.from, to: filters.to, limit: 8 }),
                getPaymentMethodBreakdown(storeId, { from: filters.from, to: filters.to }),
                getEmployeeSales(storeId, { from: filters.from, to: filters.to }),
            ]);
        if (summary.status === 'fulfilled') salesSummary.value = summary.value.totals;
        if (sales.status === 'fulfilled') salesDays.value = sales.value.days;
        if (hourly.status === 'fulfilled') hourlySales.value = hourly.value.hours;
        if (top.status === 'fulfilled') topProducts.value = top.value.products;
        if (lowStock.status === 'fulfilled') lowStockItems.value = lowStock.value.items;
        if (usage.status === 'fulfilled') ingredientUsage.value = usage.value.ingredients;
        if (spend.status === 'fulfilled') {
            purchaseSpend.value = spend.value.suppliers;
            purchaseSpendSummary.value = spend.value.summary;
        }
        if (margins.status === 'fulfilled') {
            productMargins.value = margins.value.items;
            marginSummary.value = margins.value.summary;
        }
        if (paymentBreakdown.status === 'fulfilled') paymentMethods.value = paymentBreakdown.value.methods;
        if (empSales.status === 'fulfilled') employeeSales.value = empSales.value.employees;
        if (summary.status === 'rejected') {
            errorMessage.value = (summary.reason as any)?.body?.error?.message || 'Unable to load reports.';
        }
    } catch (error: any) {
        errorMessage.value = error?.body?.error?.message || 'Unable to load reports.';
    } finally {
        isLoading.value = false;
    }
};

const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
        CASH: 'Cash',
        CARD: 'Card',
        GCASH: 'GCash',
        MAYA: 'Maya',
        TRANSFER: 'Bank transfer',
        OTHER: 'Other',
    };
    return labels[method] ?? method;
};

const formatDateShort = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', timeZone: 'UTC',
    });
};

const rangeLabel = computed(() => {
    if (activeRange.value === 'TODAY') return 'Today';
    if (activeRange.value === 'LAST_7') return 'Last 7 days';
    if (activeRange.value === 'LAST_30') return 'Last 30 days';
    if (filters.from === filters.to) return formatDateShort(filters.from);
    return `${formatDateShort(filters.from)} – ${formatDateShort(filters.to)}`;
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your stores';
    return `${store.name} - ${store.currency}`;
});

const chartMax = computed(() => {
    const values = salesDays.value.map((day) => day.totalSales);
    return Math.max(1, ...values);
});

const hourlyMax = computed(() => {
    const values = hourlySales.value.map((hour) => hour.totalSales);
    return Math.max(1, ...values);
});

const topSupplier = computed(() => purchaseSpend.value[0] ?? null);

const miniBarHeight = (value: number, maxValue: number) => {
    const pct = Math.round((value / Math.max(1, maxValue)) * 100);
    return `${pct}%`;
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDayLabel = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatHourLabel = (hour: number) => {
    const normalized = hour % 24;
    const suffix = normalized >= 12 ? 'p' : 'a';
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display}${suffix}`;
};

const formatCompactMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    if (value >= 1000000) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
    }
    if (value >= 1000) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
};

const isWeekend = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
};

const dailyChartLabels = computed(() => {
    const days = salesDays.value;
    if (days.length === 0) return [];
    if (days.length <= 3) {
        return days.map((d) => formatDayLabel(d.date));
    }
    if (days.length <= 7) {
        return [
            formatDayLabel(days[0].date),
            formatDayLabel(days[Math.floor(days.length / 2)].date),
            formatDayLabel(days[days.length - 1].date),
        ];
    }
    const step = Math.ceil(days.length / 5);
    const labels = [];
    for (let i = 0; i < days.length; i += step) {
        labels.push(formatDayLabel(days[i].date));
    }
    if (labels.length > 0 && labels[labels.length - 1] !== formatDayLabel(days[days.length - 1].date)) {
        labels.push(formatDayLabel(days[days.length - 1].date));
    }
    return labels;
});

const daypartSummary = computed(() => {
    if (hourlySales.value.length === 0) return [];
    const totalSales = hourlySales.value.reduce((sum, hour) => sum + hour.totalSales, 0);
    const parts = [
        { label: 'Breakfast', hours: [6, 7, 8, 9, 10] },
        { label: 'Lunch', hours: [11, 12, 13, 14] },
        { label: 'Afternoon', hours: [15, 16, 17] },
        { label: 'Dinner', hours: [18, 19, 20, 21] },
        { label: 'Late', hours: [22, 23, 0, 1, 2, 3, 4, 5] },
    ];

    return parts.map((part) => {
        const totals = hourlySales.value.filter((hour) => part.hours.includes(hour.hour));
        const partSales = totals.reduce((sum, hour) => sum + hour.totalSales, 0);
        const partOrders = totals.reduce((sum, hour) => sum + hour.orderCount, 0);
        const sharePct = totalSales > 0 ? Math.round((partSales / totalSales) * 100) : 0;
        return {
            label: part.label,
            totalSales: partSales,
            orderCount: partOrders,
            sharePct,
        };
    });
});

const setQuickRange = async (range: 'TODAY' | 'LAST_7' | 'LAST_30') => {
    const now = new Date();
    const to = buildDateInput(now);
    let from = to;
    if (range === 'LAST_7') {
        from = buildDateInput(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    }
    if (range === 'LAST_30') {
        from = buildDateInput(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    }
    isSettingRange.value = true;
    activeRange.value = range;
    filters.from = from;
    filters.to = to;
    await nextTick();
    isSettingRange.value = false;
};

const openSupplierSpend = (supplier: PurchaseSpendRecord) => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    if (supplier.supplierId) {
        router.push(`/stores/${storeId}/suppliers/${supplier.supplierId}`);
        return;
    }
    const query =
        supplier.supplierName && supplier.supplierName !== 'Unassigned' ? { q: supplier.supplierName } : {};
    router.push({ path: `/stores/${storeId}/suppliers`, query });
};

onMounted(async () => {
    document.addEventListener('click', onClickOutsideSettings, true);
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadReports();
});

onUnmounted(() => {
    document.removeEventListener('click', onClickOutsideSettings, true);
    if (filterDebounceTimer !== null) clearTimeout(filterDebounceTimer);
});

watch(
    () => route.params.storeId,
    (value) => {
        const storeId = value as string | undefined;
        if (storeId && storeId !== storeContext.currentStoreId) {
            storeContext.setCurrentStore(storeId);
        }
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        await loadReports();
    }
);

let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => [filters.from, filters.to],
    () => {
        if (isSettingRange.value) {
            loadReports();
        } else {
            activeRange.value = null;
            if (filterDebounceTimer !== null) clearTimeout(filterDebounceTimer);
            filterDebounceTimer = setTimeout(() => loadReports(), 400);
        }
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.reports-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    min-height: 100vh;
    padding: 2rem 1.5rem 3rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ============================================================
   SHELL & HEADER
============================================================ */
.reports-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.reports-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.reports-eyebrow {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-accent);
    background: rgba(13, 148, 136, 0.08);
    padding: 0.28rem 0.75rem;
    border-radius: 999px;
    margin-bottom: 0.6rem;
}

.reports-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.reports-title p {
    color: var(--c-muted);
    max-width: 480px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

/* ============================================================
   CONTROLS (date range)
============================================================ */
.reports-controls {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    align-items: flex-end;
}

/* ── Range nav ── */
.range-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    padding: 0.25rem;
}

.range-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
}

.range-nav-btn:hover:not(:disabled) {
    background: #f1f5f9;
    color: var(--c-text);
}

.range-nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.range-trigger-wrap {
    position: relative;
}

.range-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--c-text);
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
    min-width: 140px;
    justify-content: center;
}

.range-trigger:hover,
.range-trigger--open {
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
}

.range-trigger-chevron {
    color: var(--c-muted);
    flex-shrink: 0;
}

/* ── Date popover ── */
.date-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
    z-index: 200;
    overflow: hidden;
}

.date-popover-section {
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.date-popover-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.date-popover-quick {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.date-popover-quick-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    font-size: 0.84rem;
    font-weight: 500;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    text-align: left;
}

.date-popover-quick-btn:hover {
    background: #f1f5f9;
}

.date-popover-quick-btn.active {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
    font-weight: 600;
}

.date-popover-divider {
    height: 1px;
    background: var(--c-border);
    margin: 0;
}

.date-popover-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.date-popover-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.date-popover-field input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.45rem 0.65rem;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: #f8fafc;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.date-popover-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
    background: var(--c-surface);
}

.date-popover-apply {
    width: 100%;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    border: none;
    background: var(--c-accent);
    color: #fff;
    font-size: 0.84rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 0.15rem;
}

.date-popover-apply:hover {
    background: var(--c-accent-dark);
}

.card-settings-wrap {
    position: relative;
}

.icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.icon-button:hover,
.icon-button.active {
    color: var(--c-accent-dark);
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.06);
}

.card-settings-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 100;
    min-width: 220px;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
    padding: 0.5rem 0;
}

.card-settings-header {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
    padding: 0.4rem 1rem 0.5rem;
}

.card-settings-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.45rem 1rem;
    font-size: 0.875rem;
    color: var(--c-text);
    cursor: pointer;
    transition: background 0.1s;
}

.card-settings-row:hover {
    background: var(--c-bg);
}

.card-settings-row input[type="checkbox"] {
    accent-color: var(--c-accent);
    width: 15px;
    height: 15px;
    cursor: pointer;
    flex-shrink: 0;
}

/* ============================================================
   KPI STRIP
============================================================ */
.reports-kpis {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.kpi-card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem 1.25rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    min-width: 130px;
    flex: 1;
}

.kpi-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    line-height: 1.1;
}

.kpi-sub {
    font-size: 0.72rem;
    color: var(--c-muted);
    line-height: 1.4;
}

.kpi-card--profit {
    background: rgba(13, 148, 136, 0.04);
    border-color: rgba(13, 148, 136, 0.25);
}

.kpi-card--profit .kpi-value {
    color: var(--c-accent-dark);
}

.kpi-value--negative {
    color: #dc2626 !important;
}

.kpi-warn {
    color: #b45309;
    font-size: 0.65rem;
}

/* ============================================================
   PANEL STATES
============================================================ */
.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

.panel-state--error {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.panel-state--small {
    font-size: 0.82rem;
    padding: 1.5rem 1rem;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ============================================================
   REPORTS GRID
============================================================ */
.reports-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr);
    gap: 1.25rem;
}

.report-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0; /* grid item must opt out of min-width:auto so overflow-x:auto works */
}

.report-card--wide {
    grid-column: span 2;
}

/* ============================================================
   CARD HEADER
============================================================ */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
}

.card-header h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.2rem;
}

.card-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

.card-meta {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
}

.pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
}

/* ============================================================
   CHARTS ROW
============================================================ */
.charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: stretch;
}

.charts-row--single {
    grid-template-columns: 1fr;
}

.charts-row.report-card {
    padding: 1.25rem 1.5rem;
}

.chart-panel {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-height: 160px;
}

.chart-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-panel-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
}

.chart-total {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--c-accent-dark);
}

.chart-with-axis {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    min-height: 100px;
}

.y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 0.6rem;
    color: var(--c-muted);
    text-align: right;
    padding: 0.25rem 0;
    min-width: 36px;
}

.chart-area {
    flex: 1;
    position: relative;
}

.grid-lines {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
    padding: 0.25rem 0;
}

.grid-line {
    border-top: 1px solid var(--c-border);
}

.mini-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 100%;
    min-height: 100px;
    padding: 0.25rem 0;
    position: relative;
    z-index: 1;
}

.daily-chart { gap: 3px; }
.hourly-chart { gap: 1px; }

.mini-bar {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
}

.bar-fill {
    width: 100%;
    background: var(--c-accent);
    border-radius: 2px 2px 0 0;
    min-height: 2px;
    opacity: 0.75;
    transition: height 0.2s ease;
}

.mini-bar:hover .bar-fill {
    opacity: 1;
}

.mini-bar.bar-peak .bar-fill {
    background: #f59e0b;
    opacity: 1;
}

.mini-bar.bar-weekend .bar-fill {
    opacity: 0.5;
}

.mini-bar.bar-weekend.bar-peak .bar-fill {
    background: #f59e0b;
    opacity: 1;
}

.chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.62rem;
    color: var(--c-muted);
    padding-left: 42px;
}

.chart-footnote {
    font-size: 0.78rem;
    color: var(--c-muted);
    padding-top: 0.5rem;
    border-top: 1px solid var(--c-border);
}

/* ============================================================
   TOP LIST & DAYPART
============================================================ */
.top-list,
.daypart-list {
    display: grid;
    gap: 0.5rem;
}

.top-item,
.daypart-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    transition: background 0.12s;
}

.top-item:hover,
.daypart-row:hover {
    background: #f1f5f9;
}

.item-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
}

.item-meta {
    font-size: 0.72rem;
    color: var(--c-muted);
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.1rem;
}

.item-metrics {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex-shrink: 0;
}

.item-metrics strong {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-text);
}

.metric {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.warn-text {
    color: #b45309;
    font-weight: 600;
}

/* ============================================================
   SUPPLIER METRICS
============================================================ */
.supplier-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
}

.metric-card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 10px;
}

.metric-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.metric-card strong {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-text);
}

.metric-sub {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap {
    overflow-x: auto;
    min-width: 0; /* flex item must opt out of min-width:auto so overflow-x:auto fires */
}

.low-stock-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.low-stock-table thead th {
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.low-stock-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.low-stock-table tbody tr:last-child {
    border-bottom: none;
}

.low-stock-table tbody tr:hover {
    background: #f8fafc;
}

.low-stock-table tbody td {
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
}

.item-type-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.item-type-chip--product {
    background: #ccfbf1;
    color: #0f766e;
}

.item-type-chip--ingredient {
    background: #ede9fe;
    color: #6d28d9;
}

.margin-good {
    font-weight: 600;
    color: #16a34a;
}

.margin-warn {
    font-weight: 600;
    color: #d97706;
}

.margin-bad {
    font-weight: 600;
    color: #dc2626;
}

.shortfall {
    font-weight: 700;
    color: #dc2626;
}

/* ============================================================
   SUPPLIER LINK
============================================================ */
.supplier-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    cursor: pointer;
    text-align: left;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.15s;
}

.supplier-link:hover {
    text-decoration-color: var(--c-accent);
}

/* ============================================================
   BUTTONS
============================================================ */
.button-compact {
    font-size: 0.82rem;
    padding: 0.5rem 0.9rem;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.45rem 0.9rem;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.ghost-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.ghost-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.secondary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.secondary-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.secondary-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .reports-grid { grid-template-columns: 1fr; }
    .report-card--wide { grid-column: span 1; }
    .charts-row { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
    /* ── Page & shell ── */
    .reports-page { padding: 1rem 0.875rem 2.5rem; }
    .reports-shell { gap: 1.25rem; }

    /* ── Header ── */
    .reports-header { flex-direction: column; gap: 0.875rem; }
    .reports-title h1 { font-size: 1.4rem; }
    .reports-title p { font-size: 0.84rem; }

    /* ── Controls ── */
    .reports-controls { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .date-popover {
        left: 0;
        transform: none;
        width: min(260px, calc(100vw - 1.75rem));
    }

    /* ── KPI strip → 2-column grid ── */
    .reports-kpis {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }
    .kpi-card { min-width: 0; padding: 0.75rem 0.875rem; }
    .kpi-value { font-size: 1.25rem; }

    /* ── Cards ── */
    .report-card { padding: 1rem; gap: 1rem; border-radius: 12px; }
    .charts-row.report-card { padding: 0.875rem; }
    .card-header h2 { font-size: 0.9rem; }
    .card-header p { font-size: 0.78rem; }

    /* ── Supplier metrics → 2 columns ── */
    .supplier-metrics { grid-template-columns: 1fr 1fr; }
    .metric-card strong { font-size: 0.95rem; }

    /* ── Charts ── */
    .chart-panel { min-height: 120px; }
    .y-axis { min-width: 30px; font-size: 0.55rem; }
    .chart-labels { padding-left: 36px; font-size: 0.6rem; }

    /* ── Tables: min-width so overflow-x actually scrolls ── */
    .low-stock-table { min-width: 360px; }
    .low-stock-table.table-compact--bordered { min-width: 440px; }
    .low-stock-table.table--employee { min-width: 640px; }

    /* ── List items ── */
    .top-item, .daypart-row { padding: 0.55rem 0.7rem; }
    .item-name { font-size: 0.82rem; }
    .item-metrics strong { font-size: 0.85rem; }
}
</style>
