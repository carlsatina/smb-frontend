<template>
    <section class="reports-page">
        <PullToRefresh :on-refresh="loadReports" :disabled="isLoading" />

        <div class="reports-shell">
            <header class="reports-header">
                <div class="reports-title">
                    <span class="reports-eyebrow">Insights</span>
                    <h1>Reports</h1>
                    <p>How {{ currentStoreLabel }} is performing — sales, profit, and stock at a glance.</p>
                </div>
                <div class="reports-controls">
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
                                            <button
                                                type="button"
                                                class="date-popover-quick-btn"
                                                :class="{ active: activeRange === 'THIS_MONTH' }"
                                                @click="applyQuickRange('THIS_MONTH')"
                                            >This month</button>
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
                </div>
            </header>

            <div v-if="!storeContext.currentStoreId" class="panel-state">
                Select or create a store to view reports.
            </div>

            <div v-else-if="!canViewReports" class="panel-state">
                Your role does not have access to reports for this store.
            </div>

            <div v-else-if="errorMessage" class="panel-state panel-state--error">
                {{ errorMessage }}
            </div>

            <template v-else>
                <!-- ── Business pulse hero ── -->
                <div v-if="!hasLoaded" class="pulse pulse--skeleton" aria-hidden="true">
                    <SkeletonLoader :rows="3" label="Loading summary…" />
                </div>

                <section v-else :key="`pulse-${revealKey}`" class="pulse reveal-item">
                    <div class="pulse-top">
                        <div class="pulse-headline">
                            <span class="pulse-eyebrow">Net sales · {{ rangeLabel }}</span>
                            <span class="pulse-value">{{ formatMoney(salesSummary.netSales) }}</span>
                            <div class="pulse-compare">
                                <span
                                    v-if="netSalesDelta.pct !== null"
                                    class="delta-chip"
                                    :class="`delta-chip--${netSalesDelta.tone}`"
                                >
                                    <mdicon :name="deltaIcon(netSalesDelta)" size="13" />
                                    {{ formatDeltaPct(netSalesDelta.pct) }}
                                </span>
                                <span v-else class="delta-chip delta-chip--neutral">No prior data</span>
                                <span class="pulse-compare-caption">vs {{ prevRangeLabel }}</span>
                            </div>
                        </div>
                        <div class="pulse-spark">
                            <HeroSparkline :values="sparklineValues" />
                            <span class="pulse-spark-caption">
                                {{ isSingleDay ? 'Sales by hour' : 'Net sales by day' }}
                            </span>
                        </div>
                    </div>
                    <div class="pulse-kpis">
                        <div v-for="kpi in heroKpis" :key="kpi.id" class="pulse-kpi">
                            <span class="pulse-kpi-label">{{ kpi.label }}</span>
                            <span class="pulse-kpi-value" :class="{ 'pulse-kpi-value--negative': kpi.negative }">
                                {{ kpi.value }}
                            </span>
                            <span class="pulse-kpi-foot">
                                <span
                                    v-if="kpi.delta && kpi.delta.pct !== null"
                                    class="delta-chip delta-chip--small"
                                    :class="`delta-chip--${kpi.delta.tone}`"
                                >
                                    <mdicon :name="deltaIcon(kpi.delta)" size="11" />
                                    {{ formatDeltaPct(kpi.delta.pct) }}
                                </span>
                                <span v-if="kpi.sub" class="pulse-kpi-sub">{{ kpi.sub }}</span>
                            </span>
                        </div>
                    </div>
                </section>

                <!-- ── Insight chips ── -->
                <div v-if="hasLoaded && insights.length" :key="`insights-${revealKey}`" class="insight-strip reveal-item">
                    <template v-for="chip in insights" :key="chip.id">
                        <button
                            v-if="chip.tab"
                            type="button"
                            class="insight-chip insight-chip--link"
                            :class="{ 'insight-chip--warn': chip.tone === 'warn' }"
                            @click="activeTab = chip.tab"
                        >
                            <mdicon :name="chip.icon" size="15" class="insight-icon" />
                            <span>{{ chip.text }}</span>
                            <mdicon name="chevron-right" size="13" class="insight-go" />
                        </button>
                        <span
                            v-else
                            class="insight-chip"
                            :class="{ 'insight-chip--warn': chip.tone === 'warn' }"
                        >
                            <mdicon :name="chip.icon" size="15" class="insight-icon" />
                            <span>{{ chip.text }}</span>
                        </span>
                    </template>
                </div>

                <!-- ── Report tabs ── -->
                <nav class="report-tabs" role="tablist" aria-label="Report sections">
                    <button
                        v-for="tab in TABS"
                        :key="tab.id"
                        type="button"
                        role="tab"
                        class="report-tab"
                        :class="{ 'report-tab--active': activeTab === tab.id }"
                        :aria-selected="activeTab === tab.id"
                        @click="activeTab = tab.id"
                    >
                        <mdicon :name="tab.icon" size="16" class="report-tab-icon" />
                        <span>{{ tab.label }}</span>
                        <span v-if="tab.id === 'inventory' && lowStockItems.length" class="report-tab-badge">
                            {{ lowStockItems.length }}
                        </span>
                    </button>
                </nav>

                <div v-if="!hasLoaded" class="reports-grid" aria-hidden="true">
                    <section v-for="n in 4" :key="`grid-skel-${n}`" class="report-card">
                        <SkeletonLoader :rows="4" label="Loading reports…" />
                    </section>
                </div>

                <!-- ═══════════ OVERVIEW ═══════════ -->
                <div v-else-if="activeTab === 'overview'" :key="`overview-${revealKey}`" class="reports-grid reports-reveal">
                    <section class="report-card report-card--wide charts-row" :class="{ 'charts-row--single': isSingleDay }">
                        <div v-if="!isSingleDay" class="chart-panel">
                            <div class="chart-panel-header">
                                <h3>Sales by day</h3>
                                <span class="chart-total">{{ formatMoney(salesSummary.netSales) }}</span>
                            </div>
                            <SkeletonLoader v-if="isLoading" :rows="3" />
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
                            <SkeletonLoader v-if="isLoading" :rows="3" />
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

                    <section class="report-card">
                        <div class="card-header">
                            <div>
                                <h2>Payment mix</h2>
                                <p>Where the money came in</p>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading payment mix…" />
                        <div v-else-if="paymentMethods.length === 0" class="panel-state panel-state--small">
                            Payments appear here once sales are finalized in this range.
                        </div>
                        <div v-else class="payment-mix">
                            <div class="stack-bar">
                                <span
                                    v-for="pm in paymentMethods"
                                    :key="pm.method"
                                    class="stack-seg"
                                    :style="{ width: `${pm.sharePct}%`, background: paymentColor(pm.method) }"
                                    :title="`${formatPaymentMethod(pm.method)}: ${formatMoney(pm.total)} (${pm.sharePct}%)`"
                                ></span>
                            </div>
                            <div class="legend-list">
                                <div v-for="pm in paymentMethods" :key="pm.method" class="legend-row">
                                    <span class="legend-dot" :style="{ background: paymentColor(pm.method) }"></span>
                                    <div class="legend-name">
                                        {{ formatPaymentMethod(pm.method) }}
                                        <span class="legend-meta">{{ pm.orderCount }} orders</span>
                                    </div>
                                    <div class="legend-value">
                                        <strong>{{ formatMoney(pm.total) }}</strong>
                                        <span class="legend-share">{{ pm.sharePct }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="report-card">
                        <div class="card-header">
                            <div>
                                <h2>Daypart mix</h2>
                                <p>Sales share by time of day</p>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading daypart mix…" />
                        <div v-else-if="daypartSummary.length === 0" class="panel-state panel-state--small">
                            Sales by time of day appear here once orders come in.
                        </div>
                        <div v-else class="share-list">
                            <div v-for="part in daypartSummary" :key="part.label" class="share-row">
                                <div class="share-head">
                                    <span class="share-name">{{ part.label }}</span>
                                    <strong class="share-amount">{{ formatMoney(part.totalSales) }}</strong>
                                </div>
                                <div class="share-track">
                                    <span class="share-fill" :style="{ width: `${part.sharePct}%` }"></span>
                                </div>
                                <div class="share-meta">{{ part.orderCount }} orders · {{ part.sharePct }}% of sales</div>
                            </div>
                        </div>
                    </section>

                    <section class="report-card">
                        <div class="card-header">
                            <div>
                                <h2>Best sellers</h2>
                                <p>Top products by sales value</p>
                            </div>
                            <div class="card-meta">
                                <button type="button" class="card-link" @click="activeTab = 'products'">
                                    All products
                                    <mdicon name="chevron-right" size="14" />
                                </button>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="5" label="Loading best sellers…" />
                        <div v-else-if="topProducts.length === 0" class="panel-state panel-state--small">
                            Best sellers appear here once products are sold in this range.
                        </div>
                        <div v-else class="rank-list">
                            <div v-for="(product, index) in topProducts" :key="product.productId" class="rank-item">
                                <span class="rank-num">{{ index + 1 }}</span>
                                <div class="rank-body">
                                    <div class="rank-head">
                                        <span class="item-name">{{ product.name }}</span>
                                        <strong class="rank-amount">{{ formatMoney(product.totalSales) }}</strong>
                                    </div>
                                    <div class="share-track">
                                        <span class="share-fill" :style="{ width: rankBarWidth(product.totalSales) }"></span>
                                    </div>
                                    <div class="item-meta">
                                        <span>{{ formatQty(product.qtySold) }} sold</span>
                                        <span v-if="product.sku">SKU {{ product.sku }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="report-card">
                        <div class="card-header">
                            <div>
                                <h2>Sales breakdown</h2>
                                <p>From gross to net for this range</p>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading breakdown…" />
                        <dl v-else class="breakdown-list">
                            <div class="breakdown-row">
                                <dt>Gross sales</dt>
                                <dd>{{ formatMoney(salesSummary.grossSales) }}</dd>
                            </div>
                            <div class="breakdown-row">
                                <dt>Discounts</dt>
                                <dd class="breakdown-neg">−{{ formatMoney(salesSummary.discounts) }}</dd>
                            </div>
                            <div class="breakdown-row">
                                <dt>Tax</dt>
                                <dd>{{ formatMoney(salesSummary.tax) }}</dd>
                            </div>
                            <div class="breakdown-row breakdown-row--total">
                                <dt>Net sales</dt>
                                <dd>{{ formatMoney(salesSummary.netSales) }}</dd>
                            </div>
                            <div class="breakdown-row breakdown-row--muted">
                                <dt>Voided sales ({{ salesSummary.voidCount }})</dt>
                                <dd>{{ formatMoney(salesSummary.voidedSales) }}</dd>
                            </div>
                            <div v-if="canUseExpenses" class="breakdown-row breakdown-row--muted">
                                <dt>Expenses</dt>
                                <dd>−{{ formatMoney(expenseSummary.total) }}</dd>
                            </div>
                        </dl>
                    </section>
                </div>

                <!-- ═══════════ PRODUCTS ═══════════ -->
                <div v-else-if="activeTab === 'products'" :key="`products-${revealKey}`" class="reports-grid reports-reveal">
                    <section class="report-card report-card--wide">
                        <div class="card-header">
                            <div>
                                <h2>Items sold per product</h2>
                                <p>Units sold for each product, most sold first</p>
                            </div>
                            <div class="card-meta">
                                <span class="pill">{{ formatQty(productsSoldSummary.totalQty) }} units</span>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="5" label="Loading items sold…" />
                        <div v-else-if="productsSold.length === 0" class="panel-state panel-state--small">
                            No products sold in this range yet.
                        </div>
                        <div v-else class="table-wrap">
                            <table class="report-table table-compact table-compact--bordered">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Qty sold</th>
                                        <th>Orders</th>
                                        <th>Sales</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in productsSold" :key="item.productId">
                                        <td>
                                            <div class="item-name">{{ item.name }}</div>
                                            <div class="item-meta">
                                                <span v-if="item.sku">SKU {{ item.sku }}</span>
                                                <span v-if="item.unit">{{ item.unit }}</span>
                                            </div>
                                        </td>
                                        <td><strong>{{ formatQty(item.qtySold) }}</strong></td>
                                        <td>{{ item.orderCount }}</td>
                                        <td>{{ formatMoney(item.totalSales) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="chart-footnote">
                                <template v-if="productsSoldSummary.limited">
                                    Showing top {{ productsSoldSummary.shown }} of {{ productsSoldSummary.productCount }} products by quantity.
                                </template>
                                <template v-else>
                                    {{ productsSoldSummary.productCount }} products with sales in this range.
                                </template>
                            </div>
                        </div>
                    </section>

                    <section class="report-card report-card--wide">
                        <div class="card-header">
                            <div>
                                <h2>Item margins</h2>
                                <p>Gross profit for top sellers</p>
                            </div>
                            <div class="card-meta">
                                <span class="pill">Profit</span>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="5" label="Loading margins…" />
                        <div v-else-if="productMargins.length === 0" class="panel-state panel-state--small">
                            Margins appear here once products with costs are sold.
                        </div>
                        <div v-else class="table-wrap">
                            <table class="report-table table-compact table-compact--bordered">
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
                                <template v-if="marginSummary.costedItems < marginSummary.totalItems">
                                    Add costs to products (or ingredient costs to recipes) to complete this report.
                                </template>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- ═══════════ INVENTORY ═══════════ -->
                <div v-else-if="activeTab === 'inventory'" :key="`inventory-${revealKey}`" class="reports-grid reports-reveal">
                    <section class="report-card report-card--wide">
                        <div class="card-header">
                            <div>
                                <h2>Low stock watch</h2>
                                <p>Items at or below their reorder threshold</p>
                            </div>
                            <div class="card-meta">
                                <span v-if="lowStockItems.length" class="pill pill--warn">{{ lowStockItems.length }} to restock</span>
                                <span v-else class="pill">All clear</span>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="5" label="Loading low stock…" />
                        <div v-else-if="lowStockItems.length === 0" class="panel-state panel-state--small">
                            All tracked items are above their thresholds.
                        </div>
                        <div v-else class="table-wrap">
                            <table class="report-table table-compact table-compact--bordered">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Stock level</th>
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
                                        <td>
                                            <span class="stock-chip" :class="`stock-chip--${stockSeverity(item).cls}`">
                                                {{ stockSeverity(item).label }}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="stock-level">
                                                <span class="stock-nums">{{ formatQty(item.currentQty) }} / {{ formatQty(item.lowStockThreshold) }}</span>
                                                <div class="stock-track">
                                                    <span
                                                        class="stock-fill"
                                                        :class="`stock-fill--${stockSeverity(item).cls}`"
                                                        :style="{ width: `${stockCoverage(item)}%` }"
                                                    ></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="shortfall">{{ formatQty(item.shortfall) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section v-if="canUseIngredients" class="report-card" :class="{ 'report-card--wide': !canUsePurchaseOrders }">
                        <div class="card-header">
                            <div>
                                <h2>Ingredient usage</h2>
                                <p>Consumed by recipe sales in this range</p>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="5" label="Loading ingredient usage…" />
                        <div v-else-if="ingredientUsage.length === 0" class="panel-state panel-state--small">
                            Usage appears here once recipe products are sold.
                        </div>
                        <div v-else class="share-list">
                            <div v-for="item in ingredientUsage" :key="item.ingredientId" class="share-row">
                                <div class="share-head">
                                    <span class="share-name">{{ item.name }}</span>
                                    <strong class="share-amount">{{ formatQty(item.qtyUsed) }} {{ item.unit }}</strong>
                                </div>
                                <div class="share-track">
                                    <span class="share-fill" :style="{ width: usageBarWidth(item.qtyUsed) }"></span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section v-if="canUsePurchaseOrders" class="report-card" :class="{ 'report-card--wide': !canUseIngredients }">
                        <div class="card-header">
                            <div>
                                <h2>Purchasing</h2>
                                <p>Receipts logged in the selected range</p>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading purchasing…" />
                        <template v-else>
                            <div class="supplier-metrics">
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
                            </div>
                            <div v-if="purchaseSpend.length === 0" class="panel-state panel-state--small">
                                No receipts recorded in this range.
                            </div>
                            <div v-else class="table-wrap">
                                <table class="report-table table-compact table-compact--bordered">
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
                        </template>
                    </section>
                </div>

                <!-- ═══════════ TEAM ═══════════ -->
                <div v-else-if="activeTab === 'team'" :key="`team-${revealKey}`" class="reports-grid reports-reveal">
                    <section class="report-card report-card--wide">
                        <div class="card-header">
                            <div>
                                <h2>Sales by staff member</h2>
                                <p>Orders and takings per cashier, with payment breakdown</p>
                            </div>
                            <div class="card-meta">
                                <span class="pill">{{ employeeSales.length }} staff</span>
                            </div>
                        </div>

                        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading staff sales…" />
                        <div v-else-if="employeeSales.length === 0" class="panel-state panel-state--small">
                            Staff sales appear here once orders are finalized in this range.
                        </div>
                        <div v-else class="table-wrap">
                            <table class="report-table table-compact table-compact--bordered table--employee">
                                <thead>
                                    <tr>
                                        <th>Staff</th>
                                        <th>Role</th>
                                        <th>Orders</th>
                                        <th v-for="method in employeePaymentMethods" :key="method">
                                            {{ formatPaymentMethod(method) }}
                                        </th>
                                        <th>Total</th>
                                        <th>Share</th>
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
                                        <td v-for="method in employeePaymentMethods" :key="method">
                                            {{ formatMoney(emp.methods.find(m => m.method === method)?.total ?? 0) }}
                                        </td>
                                        <td><strong>{{ formatMoney(emp.totalSales) }}</strong></td>
                                        <td>
                                            <div class="emp-share">
                                                <div class="share-track share-track--table">
                                                    <span class="share-fill" :style="{ width: `${employeeShare(emp)}%` }"></span>
                                                </div>
                                                <span class="emp-share-pct">{{ employeeShare(emp) }}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </template>
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
    getProductsSold,
    getProfitSummary,
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
    ProductsSoldRecord,
    SalesByHourRecord,
    SalesByDayRecord,
    SalesSummaryTotals,
    TopProductRecord,
} from '@/api/reports';
import { getExpenseSummary } from '@/api/expenses';
import { suppressLoading, resumeLoading } from '@/composables/useLoading';
import PullToRefresh from '@/components/PullToRefresh.vue';
import HeroSparkline from './HeroSparkline.vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

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

const activeRange = ref<'TODAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | null>('TODAY');
const isSettingRange = ref(false);

type TabId = 'overview' | 'products' | 'inventory' | 'team';

const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
    { id: 'products', label: 'Products', icon: 'tag-outline' },
    { id: 'inventory', label: 'Inventory', icon: 'archive-outline' },
    { id: 'team', label: 'Team', icon: 'account-group-outline' },
];

const activeTab = ref<TabId>('overview');

const isLoading = ref(false);
// Bumped after every load so the hero and report cards re-trigger their
// staggered entrance animation each time fresh data arrives.
const revealKey = ref(0);
// False until the first load settles. Gates the reveal sections so they mount
// (and animate) exactly once — with real data — instead of animating first on
// the empty initial render and then again after data arrives.
const hasLoaded = ref(false);
const errorMessage = ref('');
const emptySalesSummary = (): SalesSummaryTotals => ({
    grossSales: 0,
    discounts: 0,
    tax: 0,
    netSales: 0,
    orderCount: 0,
    avgOrder: 0,
    voidedSales: 0,
    voidCount: 0,
});
const salesDays = ref<SalesByDayRecord[]>([]);
const salesSummary = ref<SalesSummaryTotals>(emptySalesSummary());
const hourlySales = ref<SalesByHourRecord[]>([]);
const topProducts = ref<TopProductRecord[]>([]);
const productsSold = ref<ProductsSoldRecord[]>([]);
const productsSoldSummary = ref({ totalQty: 0, productCount: 0, shown: 0, limited: false });
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

// Previous-period figures used for the hero delta chips.
const prevSalesSummary = ref<SalesSummaryTotals | null>(null);
const prevProfitTotal = ref<number | null>(null);
const prevExpenseTotal = ref<number | null>(null);

const PAYMENT_METHOD_ORDER = ['CASH', 'CARD', 'GCASH', 'MAYA', 'TRANSFER', 'OTHER'];
const employeePaymentMethods = computed(() => {
    const enabled = storeContext.currentStore?.paymentMethods;
    if (!enabled || enabled.length === 0) return PAYMENT_METHOD_ORDER;
    return PAYMENT_METHOD_ORDER.filter((method) => enabled.includes(method));
});
const canViewReports = computed(() => canAccess(storeContext.currentStore?.role, 'reports'));
const isSingleDay = computed(() => filters.from === filters.to);

const canUseIngredients = computed(() => hasPlanFeature(userContext.planTier, 'ingredients'));
const canUsePurchaseOrders = computed(() => hasPlanFeature(userContext.planTier, 'purchaseOrders'));
const canUseExpenses = computed(() => hasPlanFeature(userContext.planTier, 'expenses'));

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
};

const closeDatePopover = () => { showDatePopover.value = false; };

const applyQuickRange = async (range: 'TODAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH') => {
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
    // In month mode, navigate whole calendar months instead of shifting by day count.
    if (activeRange.value === 'THIS_MONTH') {
        const fromDate = new Date(filters.from + 'T00:00:00');
        const now = new Date();
        const target = new Date(fromDate.getFullYear(), fromDate.getMonth() + direction, 1);
        // Don't navigate into future months.
        if (target.getFullYear() > now.getFullYear() ||
            (target.getFullYear() === now.getFullYear() && target.getMonth() > now.getMonth())) {
            return;
        }
        const isCurrentMonth =
            target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
        const end = isCurrentMonth ? now : new Date(target.getFullYear(), target.getMonth() + 1, 0);
        isSettingRange.value = true;
        filters.from = buildDateInput(target);
        filters.to = buildDateInput(end);
        nextTick(() => { isSettingRange.value = false; });
        return;
    }
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

const onClickOutsidePopover = (e: MouseEvent) => {
    const target = e.target as Node;
    if (showDatePopover.value && datePopoverRef.value && !datePopoverRef.value.contains(target)) {
        showDatePopover.value = false;
    }
};

const profitSummary = ref({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    marginPct: 0,
    itemsWithCost: 0,
    totalItems: 0,
});

const expenseSummary = ref<{ total: number; byCategory: Array<{ category: string; total: number }> }>({
    total: 0,
    byCategory: [],
});

const netAfterExpenses = computed(() => profitSummary.value.totalProfit - expenseSummary.value.total);

// The same-length window immediately before the selected range, used for
// period-over-period comparison in the hero.
const prevRange = computed(() => {
    const MS_PER_DAY = 86400000;
    const fromDate = new Date(filters.from + 'T00:00:00');
    const toDate = new Date(filters.to + 'T00:00:00');
    const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY) + 1;
    const prevTo = new Date(fromDate.getTime() - MS_PER_DAY);
    const prevFrom = new Date(prevTo.getTime() - (daysInRange - 1) * MS_PER_DAY);
    return { from: buildDateInput(prevFrom), to: buildDateInput(prevTo) };
});

const loadReports = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !canViewReports.value) {
        salesDays.value = [];
        salesSummary.value = emptySalesSummary();
        topProducts.value = [];
        productsSold.value = [];
        productsSoldSummary.value = { totalQty: 0, productCount: 0, shown: 0, limited: false };
        lowStockItems.value = [];
        ingredientUsage.value = [];
        purchaseSpend.value = [];
        hourlySales.value = [];
        productMargins.value = [];
        marginSummary.value = { costedItems: 0, totalItems: 0 };
        profitSummary.value = { totalRevenue: 0, totalCost: 0, totalProfit: 0, marginPct: 0, itemsWithCost: 0, totalItems: 0 };
        expenseSummary.value = { total: 0, byCategory: [] };
        purchaseSpendSummary.value = { totalSpend: 0, totalReceipts: 0, avgReceipt: 0 };
        paymentMethods.value = [];
        employeeSales.value = [];
        prevSalesSummary.value = null;
        prevProfitTotal.value = null;
        prevExpenseTotal.value = null;
        hasLoaded.value = true;
        return;
    }
    isLoading.value = true;
    errorMessage.value = '';
    const prev = prevRange.value;
    try {
        // Build all requests under suppression so the page's own skeletons +
        // staggered reveal handle the loading UI instead of the global overlay.
        suppressLoading();
        const reportRequests = [
            getSalesSummary(storeId, { from: filters.from, to: filters.to }),
            getSalesByDay(storeId, { from: filters.from, to: filters.to }),
            getSalesByHour(storeId, { from: filters.from, to: filters.to }),
            getTopProducts(storeId, { from: filters.from, to: filters.to, limit: 5 }),
            getProductsSold(storeId, { from: filters.from, to: filters.to, limit: 100 }),
            getProfitSummary(storeId, { from: filters.from, to: filters.to }),
            getLowStock(storeId, { limit: 8 }),
            canUseIngredients.value
                ? getIngredientUsage(storeId, { from: filters.from, to: filters.to, limit: 8 })
                : Promise.resolve({ ingredients: [] as IngredientUsageRecord[] }),
            canUsePurchaseOrders.value
                ? getPurchaseSpend(storeId, { from: filters.from, to: filters.to, limit: 8 })
                : Promise.resolve({ suppliers: [] as PurchaseSpendRecord[], summary: { totalSpend: 0, totalReceipts: 0, avgReceipt: 0 } as PurchaseSpendSummary }),
            getProductMargins(storeId, { from: filters.from, to: filters.to, limit: 10 }),
            getPaymentMethodBreakdown(storeId, { from: filters.from, to: filters.to }),
            getEmployeeSales(storeId, { from: filters.from, to: filters.to }),
            canUseExpenses.value
                ? getExpenseSummary(storeId, filters.from, filters.to)
                : Promise.resolve({ range: { from: filters.from, to: filters.to }, total: 0, byCategory: [] }),
            getSalesSummary(storeId, { from: prev.from, to: prev.to }),
            getProfitSummary(storeId, { from: prev.from, to: prev.to }),
            canUseExpenses.value
                ? getExpenseSummary(storeId, prev.from, prev.to)
                : Promise.resolve({ range: { from: prev.from, to: prev.to }, total: 0, byCategory: [] }),
        ] as const;
        resumeLoading();
        const [
            summary, sales, hourly, top, soldPerProduct, profit, lowStock, usage, spend,
            margins, paymentBreakdown, empSales, expense, prevSummary, prevProfit, prevExpense,
        ] = await Promise.allSettled(reportRequests);
        if (summary.status === 'fulfilled') salesSummary.value = summary.value.totals;
        if (sales.status === 'fulfilled') salesDays.value = sales.value.days;
        if (hourly.status === 'fulfilled') hourlySales.value = hourly.value.hours;
        if (top.status === 'fulfilled') topProducts.value = top.value.products;
        if (soldPerProduct.status === 'fulfilled') {
            productsSold.value = soldPerProduct.value.products;
            productsSoldSummary.value = soldPerProduct.value.summary;
        }
        if (profit.status === 'fulfilled') profitSummary.value = profit.value.summary;
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
        if (expense.status === 'fulfilled') expenseSummary.value = { total: expense.value.total, byCategory: expense.value.byCategory };
        prevSalesSummary.value = prevSummary.status === 'fulfilled' ? prevSummary.value.totals : null;
        prevProfitTotal.value = prevProfit.status === 'fulfilled' ? prevProfit.value.summary.totalProfit : null;
        prevExpenseTotal.value = prevExpense.status === 'fulfilled' ? prevExpense.value.total : null;
        if (summary.status === 'rejected') {
            errorMessage.value = (summary.reason as any)?.body?.error?.message || 'Unable to load reports.';
        }
    } catch (error: any) {
        errorMessage.value = error?.body?.error?.message || 'Unable to load reports.';
    } finally {
        isLoading.value = false;
        hasLoaded.value = true;
        revealKey.value += 1;
    }
};

/* ── Deltas vs previous period ── */

type Delta = { pct: number | null; dir: 'up' | 'down' | 'flat'; tone: 'good' | 'bad' | 'neutral' };

const computeDelta = (current: number, prev: number | null | undefined, invert = false): Delta => {
    if (prev === null || prev === undefined || prev === 0) {
        return { pct: null, dir: 'flat', tone: 'neutral' };
    }
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    if (Math.abs(pct) < 0.05) {
        return { pct: 0, dir: 'flat', tone: 'neutral' };
    }
    const dir = pct > 0 ? 'up' : 'down';
    const good = invert ? pct < 0 : pct > 0;
    return { pct: Math.round(pct * 10) / 10, dir, tone: good ? 'good' : 'bad' };
};

const deltaIcon = (delta: Delta) => {
    if (delta.dir === 'up') return 'trending-up';
    if (delta.dir === 'down') return 'trending-down';
    return 'trending-neutral';
};

const formatDeltaPct = (pct: number) => {
    const abs = Math.abs(pct);
    const text = abs >= 100 ? Math.round(abs).toLocaleString() : abs.toFixed(1).replace(/\.0$/, '');
    return `${text}%`;
};

const netSalesDelta = computed(() =>
    computeDelta(salesSummary.value.netSales, prevSalesSummary.value?.netSales ?? null)
);

type HeroKpi = {
    id: string;
    label: string;
    value: string;
    delta: Delta | null;
    sub?: string;
    negative?: boolean;
};

const heroKpis = computed<HeroKpi[]>(() => {
    const prev = prevSalesSummary.value;
    const profit = profitSummary.value;
    const kpis: HeroKpi[] = [
        {
            id: 'orders',
            label: 'Orders',
            value: salesSummary.value.orderCount.toLocaleString(),
            delta: computeDelta(salesSummary.value.orderCount, prev?.orderCount ?? null),
        },
        {
            id: 'avg-order',
            label: 'Avg order',
            value: formatMoney(salesSummary.value.avgOrder),
            delta: computeDelta(salesSummary.value.avgOrder, prev?.avgOrder ?? null),
        },
        {
            id: 'profit',
            label: 'Gross profit',
            value: formatMoney(profit.totalProfit),
            delta: computeDelta(profit.totalProfit, prevProfitTotal.value),
            sub: profit.itemsWithCost < profit.totalItems
                ? `${profit.marginPct}% margin · ${profit.itemsWithCost}/${profit.totalItems} costed`
                : `${profit.marginPct}% margin`,
            negative: profit.totalProfit < 0,
        },
    ];
    if (canUseExpenses.value) {
        kpis.push({
            id: 'expenses',
            label: 'Expenses',
            value: formatMoney(expenseSummary.value.total),
            delta: computeDelta(expenseSummary.value.total, prevExpenseTotal.value, true),
        });
        const prevNet = prevProfitTotal.value !== null && prevExpenseTotal.value !== null
            ? prevProfitTotal.value - prevExpenseTotal.value
            : null;
        kpis.push({
            id: 'net-after',
            label: 'Net after expenses',
            value: formatMoney(netAfterExpenses.value),
            delta: computeDelta(netAfterExpenses.value, prevNet),
            negative: netAfterExpenses.value < 0,
        });
    }
    return kpis;
});

/* ── Insight chips ── */

const peakHour = computed<SalesByHourRecord | null>(() =>
    hourlySales.value.reduce<SalesByHourRecord | null>((best, hour) => {
        if (hour.totalSales <= 0) return best;
        if (!best || hour.totalSales > best.totalSales) return hour;
        return best;
    }, null)
);

const bestDay = computed<SalesByDayRecord | null>(() =>
    salesDays.value.reduce<SalesByDayRecord | null>((best, day) => {
        if (day.totalSales <= 0) return best;
        if (!best || day.totalSales > best.totalSales) return day;
        return best;
    }, null)
);

type InsightChip = { id: string; icon: string; text: string; tab?: TabId; tone: 'default' | 'warn' };

const insights = computed<InsightChip[]>(() => {
    const chips: InsightChip[] = [];
    if (peakHour.value) {
        chips.push({
            id: 'peak-hour',
            icon: 'clock-outline',
            text: `Peak hour ${formatHourFull(peakHour.value.hour)}–${formatHourFull(peakHour.value.hour + 1)}`,
            tone: 'default',
        });
    }
    if (!isSingleDay.value && bestDay.value) {
        chips.push({
            id: 'best-day',
            icon: 'calendar-star',
            text: `Best day ${formatDayFull(bestDay.value.date)}`,
            tone: 'default',
        });
    }
    if (topProducts.value[0]) {
        chips.push({
            id: 'top-seller',
            icon: 'trophy-outline',
            text: `Top seller · ${topProducts.value[0].name}`,
            tab: 'products',
            tone: 'default',
        });
    }
    if (lowStockItems.value.length) {
        chips.push({
            id: 'low-stock',
            icon: 'alert-circle-outline',
            text: `${lowStockItems.value.length} ${lowStockItems.value.length === 1 ? 'item' : 'items'} low on stock`,
            tab: 'inventory',
            tone: 'warn',
        });
    }
    return chips;
});

/* ── Formatting helpers ── */

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

const PAYMENT_COLORS: Record<string, string> = {
    CASH: '#0d9488',
    CARD: '#6366f1',
    GCASH: '#2563eb',
    MAYA: '#16a34a',
    TRANSFER: '#d97706',
    OTHER: '#94a3b8',
};

const paymentColor = (method: string) => PAYMENT_COLORS[method] ?? '#94a3b8';

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
    if (activeRange.value === 'THIS_MONTH') {
        const d = new Date(filters.from + 'T00:00:00');
        const now = new Date();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'This month';
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (filters.from === filters.to) return formatDateShort(filters.from);
    return `${formatDateShort(filters.from)} – ${formatDateShort(filters.to)}`;
});

const prevRangeLabel = computed(() => {
    const prev = prevRange.value;
    if (prev.from === prev.to) return formatDateShort(prev.from);
    return `${formatDateShort(prev.from)} – ${formatDateShort(prev.to)}`;
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const chartMax = computed(() => {
    const values = salesDays.value.map((day) => day.totalSales);
    return Math.max(1, ...values);
});

const hourlyMax = computed(() => {
    const values = hourlySales.value.map((hour) => hour.totalSales);
    return Math.max(1, ...values);
});

const sparklineValues = computed(() =>
    isSingleDay.value
        ? hourlySales.value.map((hour) => hour.totalSales)
        : salesDays.value.map((day) => day.totalSales)
);

const miniBarHeight = (value: number, maxValue: number) => {
    const pct = Math.round((value / Math.max(1, maxValue)) * 100);
    return `${pct}%`;
};

const topProductMax = computed(() => Math.max(1, ...topProducts.value.map((p) => p.totalSales)));
const rankBarWidth = (value: number) => `${Math.round((value / topProductMax.value) * 100)}%`;

const usageMax = computed(() => Math.max(1, ...ingredientUsage.value.map((i) => i.qtyUsed)));
const usageBarWidth = (value: number) => `${Math.round((value / usageMax.value) * 100)}%`;

const employeeSalesTotal = computed(() =>
    employeeSales.value.reduce((sum, emp) => sum + emp.totalSales, 0)
);
const employeeShare = (emp: EmployeeSalesRecord) =>
    employeeSalesTotal.value > 0
        ? Math.round((emp.totalSales / employeeSalesTotal.value) * 1000) / 10
        : 0;

const stockSeverity = (item: LowStockItem): { label: string; cls: string } => {
    if (item.currentQty <= 0) return { label: 'Out of stock', cls: 'out' };
    if (item.currentQty <= item.lowStockThreshold / 2) return { label: 'Critical', cls: 'critical' };
    return { label: 'Low', cls: 'low' };
};

const stockCoverage = (item: LowStockItem) => {
    if (item.lowStockThreshold <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((item.currentQty / item.lowStockThreshold) * 100)));
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

const formatDayFull = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
};

const formatHourLabel = (hour: number) => {
    const normalized = hour % 24;
    const suffix = normalized >= 12 ? 'p' : 'a';
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display}${suffix}`;
};

const formatHourFull = (hour: number) => {
    const normalized = ((hour % 24) + 24) % 24;
    const suffix = normalized >= 12 ? 'PM' : 'AM';
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display} ${suffix}`;
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

const setQuickRange = async (range: 'TODAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH') => {
    const now = new Date();
    const to = buildDateInput(now);
    let from = to;
    if (range === 'LAST_7') {
        from = buildDateInput(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    }
    if (range === 'LAST_30') {
        from = buildDateInput(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    }
    if (range === 'THIS_MONTH') {
        from = buildDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
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
    document.addEventListener('click', onClickOutsidePopover, true);
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadReports();
});

onUnmounted(() => {
    document.removeEventListener('click', onClickOutsidePopover, true);
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
    --c-bg: #f6f8f9;
    --c-good: #059669;
    --c-bad: #e11d48;
    --c-warn: #d97706;
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
    gap: 1.25rem;
}

.reports-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.25rem;
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

/* ============================================================
   ENTRANCE ANIMATION
============================================================ */
@keyframes report-rise {
    from { opacity: 0; transform: translateY(12px) scale(0.99); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}

.reveal-item {
    animation: report-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

/* `backwards` holds the hidden state during the stagger delay, then hands
   styling back so hover transitions on the cards keep working. */
.reports-reveal > * {
    animation: report-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
.reports-reveal > *:nth-child(1) { animation-delay: 0.03s; }
.reports-reveal > *:nth-child(2) { animation-delay: 0.07s; }
.reports-reveal > *:nth-child(3) { animation-delay: 0.11s; }
.reports-reveal > *:nth-child(4) { animation-delay: 0.15s; }
.reports-reveal > *:nth-child(5) { animation-delay: 0.19s; }
.reports-reveal > *:nth-child(n+6) { animation-delay: 0.23s; }

@media (prefers-reduced-motion: reduce) {
    .reveal-item,
    .reports-reveal > * { animation: none; }
}

/* ============================================================
   BUSINESS PULSE HERO
============================================================ */
.pulse {
    position: relative;
    border-radius: 20px;
    padding: 1.75rem 1.75rem 1.5rem;
    background:
        radial-gradient(120% 150% at 85% -10%, rgba(45, 212, 191, 0.18), transparent 55%),
        linear-gradient(140deg, #0b302d, #123f3a 62%, #0d3330);
    border: 1px solid rgba(45, 212, 191, 0.2);
    color: #f0fdfa;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    overflow: hidden;
}

.pulse--skeleton {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    min-height: 220px;
    justify-content: center;
}

.pulse-top {
    display: flex;
    gap: 2rem;
    align-items: stretch;
    justify-content: space-between;
    flex-wrap: wrap;
}

.pulse-headline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 220px;
}

.pulse-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #5eead4;
}

.pulse-value {
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
}

.pulse-compare {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
}

.pulse-compare-caption {
    font-size: 0.75rem;
    color: rgba(240, 253, 250, 0.6);
}

.pulse-spark {
    flex: 1;
    min-width: 240px;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    justify-content: flex-end;
}

.pulse-spark :deep(.hero-sparkline) {
    height: 96px;
}

.pulse-spark-caption {
    font-size: 0.68rem;
    color: rgba(240, 253, 250, 0.5);
    text-align: right;
}

.pulse-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1px;
    background: rgba(94, 234, 212, 0.14);
    border: 1px solid rgba(94, 234, 212, 0.14);
    border-radius: 12px;
    overflow: hidden;
}

.pulse-kpi {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.85rem 1rem;
    background: rgba(7, 34, 31, 0.55);
    min-width: 0;
}

.pulse-kpi-label {
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(153, 246, 228, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.pulse-kpi-value {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #f0fdfa;
    font-variant-numeric: tabular-nums;
}

.pulse-kpi-value--negative {
    color: #fda4af;
}

.pulse-kpi-foot {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    min-height: 18px;
}

.pulse-kpi-sub {
    font-size: 0.68rem;
    color: rgba(240, 253, 250, 0.55);
}

/* ── Delta chips (used on the dark hero) ── */
.delta-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.74rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.delta-chip--small {
    font-size: 0.66rem;
    padding: 0.1rem 0.45rem;
}

.delta-chip--good {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
}

.delta-chip--bad {
    background: rgba(244, 63, 94, 0.2);
    color: #fda4af;
}

.delta-chip--neutral {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
}

/* ============================================================
   INSIGHT CHIPS
============================================================ */
.insight-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.insight-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-text);
}

.insight-icon {
    color: var(--c-accent-dark);
    flex-shrink: 0;
}

.insight-chip--warn {
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
}

.insight-chip--warn .insight-icon {
    color: #d97706;
}

.insight-chip--link {
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.insight-chip--link:hover {
    border-color: var(--c-accent);
    box-shadow: 0 3px 10px rgba(13, 148, 136, 0.12);
    transform: translateY(-1px);
}

.insight-chip--warn.insight-chip--link:hover {
    border-color: #d97706;
    box-shadow: 0 3px 10px rgba(217, 119, 6, 0.15);
}

.insight-go {
    color: var(--c-muted);
    margin-right: -0.2rem;
}

/* ============================================================
   TABS
============================================================ */
.report-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 12px;
    padding: 0.3rem;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.report-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 1rem;
    border-radius: 9px;
    border: none;
    background: transparent;
    font-size: 0.84rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-muted);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s;
}

.report-tab:hover {
    background: #f1f5f9;
    color: var(--c-text);
}

.report-tab--active,
.report-tab--active:hover {
    background: var(--c-accent);
    color: #fff;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.report-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #b45309;
    font-size: 0.66rem;
    font-weight: 800;
}

.report-tab--active .report-tab-badge {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
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
   REPORTS GRID & CARDS
============================================================ */
.reports-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    align-items: center;
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

.pill--warn {
    background: #fef3c7;
    color: #b45309;
}

.card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    border: none;
    background: none;
    padding: 0;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.card-link:hover {
    text-decoration: underline;
}

/* ============================================================
   CHARTS
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
    font-variant-numeric: tabular-nums;
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
   PAYMENT MIX
============================================================ */
.payment-mix {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.stack-bar {
    display: flex;
    height: 14px;
    border-radius: 999px;
    overflow: hidden;
    background: #f1f5f9;
}

.stack-seg {
    display: block;
    min-width: 3px;
    height: 100%;
}

.stack-seg + .stack-seg {
    border-left: 2px solid var(--c-surface);
}

.legend-list {
    display: grid;
    gap: 0.35rem;
}

.legend-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    transition: background 0.12s;
}

.legend-row:hover {
    background: #f8fafc;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex-shrink: 0;
}

.legend-name {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.legend-meta {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--c-muted);
}

.legend-value {
    text-align: right;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.legend-value strong {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.legend-share {
    font-size: 0.7rem;
    color: var(--c-muted);
    font-variant-numeric: tabular-nums;
}

/* ============================================================
   SHARE ROWS (daypart, ingredient usage)
============================================================ */
.share-list {
    display: grid;
    gap: 0.85rem;
}

.share-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.share-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
}

.share-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
}

.share-amount {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.share-track {
    height: 6px;
    border-radius: 999px;
    background: #eef2f5;
    overflow: hidden;
}

.share-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #0d9488, #2dd4bf);
    min-width: 2px;
    transition: width 0.3s ease;
}

.share-meta {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   RANKED LIST (best sellers)
============================================================ */
.rank-list {
    display: grid;
    gap: 0.85rem;
}

.rank-item {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
}

.rank-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
    font-size: 0.72rem;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 0.1rem;
    font-variant-numeric: tabular-nums;
}

.rank-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
}

.rank-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
}

.rank-amount {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--c-text);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
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

.warn-text {
    color: #b45309;
    font-weight: 600;
}

/* ============================================================
   SALES BREAKDOWN
============================================================ */
.breakdown-list {
    display: grid;
    gap: 0;
    margin: 0;
}

.breakdown-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.65rem 0.25rem;
    border-bottom: 1px solid #f1f5f9;
}

.breakdown-row:last-child {
    border-bottom: none;
}

.breakdown-row dt {
    font-size: 0.85rem;
    color: var(--c-muted);
    font-weight: 500;
}

.breakdown-row dd {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.breakdown-neg {
    color: var(--c-warn) !important;
}

.breakdown-row--total {
    border-top: 1.5px solid var(--c-border);
    border-bottom: 1.5px solid var(--c-border);
}

.breakdown-row--total dt {
    color: var(--c-text);
    font-weight: 700;
}

.breakdown-row--total dd {
    font-weight: 800;
    color: var(--c-accent-dark);
}

.breakdown-row--muted dt,
.breakdown-row--muted dd {
    font-size: 0.78rem;
    color: var(--c-muted);
    font-weight: 500;
}

/* ============================================================
   SUPPLIER METRICS
============================================================ */
.supplier-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
    font-variant-numeric: tabular-nums;
}

.metric-sub {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   TABLES
============================================================ */
.table-wrap {
    overflow-x: auto;
    min-width: 0; /* flex item must opt out of min-width:auto so overflow-x:auto fires */
}

.report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.report-table thead th {
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

.report-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.report-table tbody tr:last-child {
    border-bottom: none;
}

.report-table tbody tr:hover {
    background: #f8fafc;
}

.report-table tbody td {
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
    font-variant-numeric: tabular-nums;
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

/* ── Low stock status ── */
.stock-chip {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
}

.stock-chip--out {
    background: #ffe4e6;
    color: #be123c;
}

.stock-chip--critical {
    background: #ffedd5;
    color: #c2410c;
}

.stock-chip--low {
    background: #fef9c3;
    color: #a16207;
}

.stock-level {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 120px;
}

.stock-nums {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
}

.stock-track {
    height: 5px;
    border-radius: 999px;
    background: #eef2f5;
    overflow: hidden;
    max-width: 140px;
}

.stock-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    min-width: 2px;
}

.stock-fill--out { background: #e11d48; }
.stock-fill--critical { background: #ea580c; }
.stock-fill--low { background: #ca8a04; }

/* ── Employee share ── */
.emp-share {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 110px;
}

.share-track--table {
    flex: 1;
    max-width: 90px;
}

.emp-share-pct {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
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
    .reports-shell { gap: 1rem; }

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

    /* ── Hero ── */
    .pulse { padding: 1.25rem 1.1rem 1.1rem; border-radius: 16px; gap: 1.1rem; }
    .pulse-top { gap: 1rem; }
    .pulse-spark { min-width: 100%; max-width: none; }
    .pulse-spark :deep(.hero-sparkline) { height: 64px; }
    .pulse-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pulse-kpi { padding: 0.7rem 0.8rem; }
    .pulse-kpi-value { font-size: 1rem; }
    /* Odd KPI count: stretch the last one so no empty cell shows. */
    .pulse-kpi:last-child:nth-child(odd) { grid-column: span 2; }

    /* ── Tabs: drop icons so all four fit without scrolling ── */
    .report-tabs { width: 100%; }
    .report-tab { padding: 0.5rem 0.6rem; font-size: 0.8rem; flex: 1; justify-content: center; }
    .report-tab :deep(.report-tab-icon) { display: none; }

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
    .report-table { min-width: 440px; }
    .report-table.table--employee { min-width: 720px; }

    /* ── List items ── */
    .item-name { font-size: 0.82rem; }
}
</style>
