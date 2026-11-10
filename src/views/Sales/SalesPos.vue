<template>
    <section ref="posPageRef" class="pos-page" :class="{ 'pos-page--fullscreen': isFullscreen }">
        <div class="pos-shell">
            <div class="pos-content">
                <section class="pos-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <span class="pos-eyebrow">Point of Sale</span>
                            <h2>Sellable catalog</h2>
                            <p>{{ currentStoreLabel }}</p>
                        </div>
                        <div class="panel-actions">
                            <!-- View Mode Switcher: Cards vs Table List -->
                            <div class="view-mode-tabs" role="group" aria-label="Catalog view mode">
                                <button
                                    type="button"
                                    class="view-mode-tab"
                                    :class="{ 'view-mode-tab--active': activeViewMode === 'cards' }"
                                    title="Cards grid view"
                                    @click="setViewMode('cards')"
                                >
                                    <mdicon name="view-grid-outline" size="16" />
                                    <span>Cards</span>
                                </button>
                                <button
                                    type="button"
                                    class="view-mode-tab"
                                    :class="{ 'view-mode-tab--active': activeViewMode === 'table' }"
                                    title="Table list view (optimized for 2,000+ items)"
                                    @click="setViewMode('table')"
                                >
                                    <mdicon name="table-large" size="16" />
                                    <span>Table List</span>
                                    <span v-if="filteredProducts.length > 0" class="tab-badge">
                                        {{ filteredProducts.length }}
                                    </span>
                                </button>
                            </div>

                            <div class="search-wrapper">
                                <mdicon name="magnify" size="17" class="search-icon" />
                                <input
                                    ref="searchInputRef"
                                    v-model="searchQuery"
                                    type="text"
                                    class="search-input"
                                    placeholder="Search name, SKU, or scan barcode..."
                                    @focus="isSearchFocused = true"
                                    @blur="isSearchFocused = false"
                                    @keydown="onSearchKeydown"
                                />
                                <button
                                    v-if="searchQuery"
                                    type="button"
                                    class="search-clear-btn"
                                    title="Clear search"
                                    @click="clearSearch"
                                >
                                    <mdicon name="close-circle" size="15" />
                                </button>
                            </div>
                            <details ref="displaySettingsRef" class="display-settings">
                                <summary>Display</summary>
                                <div class="display-panel">
                                    <div class="display-row">
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showSku" type="checkbox" />
                                            SKU
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showType" type="checkbox" />
                                            Type
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showCategory" type="checkbox" />
                                            Category
                                        </label>
                                        <label class="check-pill">
                                            <input v-model="displaySettings.showPrice" type="checkbox" />
                                            Price
                                        </label>
                                    </div>
                                    <label class="check-pill">
                                        <input v-model="displaySettings.groupByCategory" type="checkbox" />
                                        Group by category
                                    </label>
                                    <label class="check-pill">
                                        <input v-model="displaySettings.useCategoryColor" type="checkbox" />
                                        Color by category
                                    </label>
                                    <div v-if="displaySettings.useCategoryColor" class="color-grid">
                                        <div v-for="category in categoryList" :key="category" class="color-row">
                                            <span class="color-name">{{ category }}</span>
                                            <input v-model="displaySettings.categoryColors[category]" type="color" />
                                        </div>
                                        <div v-if="categoryList.length === 0" class="color-empty">
                                            No categories yet.
                                        </div>
                                    </div>
                                </div>
                            </details>
                            <button
                                v-if="activeViewMode === 'cards'"
                                class="ghost-button"
                                :class="{ 'ghost-button--active': isRearranging }"
                                @click="isRearranging = !isRearranging"
                            >
                                {{ isRearranging ? 'Done' : 'Rearrange' }}
                            </button>
                            <button class="ghost-button" @click="goToSalesHistory">Sales history</button>
                            <button
                                class="ghost-button ghost-button--icon"
                                :class="{ 'ghost-button--active': isFullscreen }"
                                :title="isFullscreen ? 'Exit fullscreen' : 'Super fullscreen'"
                                @click="toggleFullscreen"
                            >
                                <mdicon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" size="18" />
                                <span>{{ isFullscreen ? 'Exit' : 'Fullscreen' }}</span>
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="storeContext.currentStoreId"
                        class="category-filters"
                    >
                        <button
                            type="button"
                            class="category-pill category-pill--all"
                            :class="{ active: activeCategory === 'ALL' }"
                            @click="activeCategory = 'ALL'"
                        >
                            All
                        </button>
                        <button
                            type="button"
                            class="category-pill category-pill--recent"
                            :class="{ active: activeCategory === 'RECENT' }"
                            title="Show up to 10 recently ordered products"
                            @click="activeCategory = 'RECENT'"
                        >
                            <mdicon name="history" size="13" class="recent-icon" />
                            <span>Recent</span>
                            <span v-if="recentProducts.length > 0" class="recent-count-badge">{{ recentProducts.length }}</span>
                        </button>
                        <button
                            v-for="category in categoryList"
                            :key="category"
                            type="button"
                            class="category-pill"
                            :class="{ active: activeCategory === category }"
                            :style="getCategoryPillStyle(category, activeCategory === category)"
                            @click="activeCategory = category"
                        >
                            {{ category }}
                        </button>
                    </div>

                    <div
                        v-if="storeContext.currentStoreId && subcategoryList.length > 0"
                        class="category-filters subcategory-filters"
                        role="group"
                        :aria-label="`${activeCategory} subcategories`"
                    >
                        <mdicon name="subdirectory-arrow-right" size="14" class="subcategory-icon" />
                        <button
                            type="button"
                            class="category-pill subcategory-pill"
                            :class="{ active: activeSubcategory === 'ALL' }"
                            @click="activeSubcategory = 'ALL'"
                        >
                            All {{ activeCategory }}
                        </button>
                        <button
                            v-for="sub in subcategoryList"
                            :key="sub.value"
                            type="button"
                            class="category-pill subcategory-pill"
                            :class="{ active: activeSubcategory === sub.value }"
                            @click="activeSubcategory = sub.value"
                        >
                            {{ sub.label }}
                        </button>
                    </div>

                    <div class="catalog-scroll">
                    <div v-if="!storeContext.currentStoreId" class="panel-state">
                        Select or create a store to start selling.
                    </div>

                    <SkeletonLoader
                        v-else-if="isLoading"
                        :variant="activeViewMode === 'cards' ? 'cards' : 'table'"
                        :count="12"
                        :rows="8"
                        label="Loading products…"
                    />

                    <template v-else>
                        <!-- ==========================================
                             TABLE LIST VIEW (Optimized for 2,000+ items)
                             ========================================== -->
                        <div v-if="activeViewMode === 'table'" class="pos-table-view">
                            <!-- Table Toolbar -->
                            <div class="pos-table-toolbar">
                                <div class="table-toolbar-left">
                                    <span class="table-count-text">
                                        Showing <strong>{{ tableRangeStart }}–{{ tableRangeEnd }}</strong> of <strong>{{ sortedTableProducts.length }}</strong> products
                                        <span v-if="sortedTableProducts.length !== products.length" class="table-filter-note">
                                            (filtered from {{ products.length }})
                                        </span>
                                    </span>
                                </div>
                                <div class="table-toolbar-right">
                                    <label class="table-page-size-label">
                                        <span>Show:</span>
                                        <select v-model="tablePageSize" class="table-page-size-select">
                                            <option :value="25">25</option>
                                            <option :value="50">50</option>
                                            <option :value="100">100</option>
                                            <option :value="250">250</option>
                                            <option value="all">All</option>
                                        </select>
                                    </label>
                                    <div
                                        v-if="isSearchFocused || isTableFocused"
                                        class="table-keyboard-guide"
                                        :class="{ 'table-keyboard-guide--active': isSearchFocused || isTableFocused }"
                                    >
                                        <template v-if="isSearchFocused">
                                            <kbd class="kbd-key">↓</kbd>
                                            <span>enter table</span>
                                            <kbd class="kbd-key">↵ Enter</kbd>
                                            <span>add top match</span>
                                        </template>
                                        <template v-else-if="isTableFocused">
                                            <kbd class="kbd-key">↓</kbd>
                                            <kbd class="kbd-key">↑</kbd>
                                            <span>navigate</span>
                                            <kbd class="kbd-key">↵ Enter</kbd>
                                            <span>add</span>
                                            <kbd class="kbd-key">Esc</kbd>
                                            <span>search</span>
                                        </template>
                                    </div>
                                </div>
                            </div>

                            <!-- Table Scroll Container -->
                            <div
                                class="pos-table-container"
                                @focusin="isTableFocused = true"
                                @focusout="isTableFocused = false"
                            >
                                <table class="pos-table">
                                    <thead>
                                        <tr>
                                            <th class="th-sortable th-name" @click="handleSort('name')">
                                                <div class="th-content">
                                                    <span>Product</span>
                                                    <mdicon
                                                        :name="tableSortColumn === 'name' ? (tableSortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'"
                                                        size="14"
                                                        :class="{ 'th-sort-icon--active': tableSortColumn === 'name' }"
                                                    />
                                                </div>
                                            </th>
                                            <th v-if="displaySettings.showSku" class="th-sortable th-sku" @click="handleSort('sku')">
                                                <div class="th-content">
                                                    <span>SKU</span>
                                                    <mdicon
                                                        :name="tableSortColumn === 'sku' ? (tableSortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'"
                                                        size="14"
                                                        :class="{ 'th-sort-icon--active': tableSortColumn === 'sku' }"
                                                    />
                                                </div>
                                            </th>
                                            <th v-if="displaySettings.showCategory" class="th-sortable th-category" @click="handleSort('category')">
                                                <div class="th-content">
                                                    <span>Category</span>
                                                    <mdicon
                                                        :name="tableSortColumn === 'category' ? (tableSortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'"
                                                        size="14"
                                                        :class="{ 'th-sort-icon--active': tableSortColumn === 'category' }"
                                                    />
                                                </div>
                                            </th>
                                            <th v-if="displaySettings.showPrice" class="th-sortable th-price align-right" @click="handleSort('price')">
                                                <div class="th-content align-right">
                                                    <span>Price</span>
                                                    <mdicon
                                                        :name="tableSortColumn === 'price' ? (tableSortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'"
                                                        size="14"
                                                        :class="{ 'th-sort-icon--active': tableSortColumn === 'price' }"
                                                    />
                                                </div>
                                            </th>
                                            <th class="th-action align-right">
                                                <span>Ticket</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <template v-for="(product, index) in paginatedTableProducts" :key="product.id">
                                            <tr
                                                v-if="shouldShowTableCategoryHeader(index)"
                                                class="pos-table-category-row"
                                            >
                                                <td :colspan="tableColumnCount">
                                                    <div class="pos-table-category-label">
                                                        <span
                                                            v-if="displaySettings.useCategoryColor && product.category"
                                                            class="td-cat-dot"
                                                            :style="{ background: displaySettings.categoryColors[product.category] || '#cbd5e1' }"
                                                        />
                                                        <span>{{ product.category || 'Uncategorized' }}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr
                                                :ref="(el) => setRowRef(el, index)"
                                                tabindex="0"
                                                class="pos-table-row"
                                                :class="{
                                                    'pos-table-row--in-cart': cartQtyMap[product.id],
                                                    'pos-table-row--selected': selectedRowIndex === index,
                                                }"
                                                @click="onRowClick(product, index)"
                                                @focus="selectedRowIndex = index"
                                                @keydown="onRowKeydown($event, product, index)"
                                            >
                                                <!-- Product Name & Meta -->
                                                <td class="td-product">
                                                    <div class="td-product-cell">
                                                        <span
                                                            v-if="displaySettings.useCategoryColor && product.category && !displaySettings.groupByCategory"
                                                            class="td-cat-dot"
                                                            :style="{ background: displaySettings.categoryColors[product.category] || '#cbd5e1' }"
                                                            :title="product.category"
                                                        />
                                                        <span
                                                            v-if="selectedRowIndex === index"
                                                            class="td-selected-indicator"
                                                            title="Currently selected (Press Enter to add)"
                                                        >
                                                            ↵
                                                        </span>
                                                        <div class="td-product-info">
                                                            <span class="td-product-title" :title="product.name">{{ product.name }}</span>
                                                            <div class="td-product-sub">
                                                                <span v-if="displaySettings.showType" class="td-type-badge">
                                                                    {{ formatProductType(product.type) }}
                                                                </span>
                                                                <span class="td-unit-badge">{{ product.unit }}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <!-- SKU -->
                                                <td v-if="displaySettings.showSku" class="td-sku">
                                                    <code v-if="product.sku" class="td-sku-code">{{ product.sku }}</code>
                                                    <span v-else class="td-empty-dash">—</span>
                                                </td>

                                                <!-- Category -->
                                                <td v-if="displaySettings.showCategory" class="td-category">
                                                    <span
                                                        v-if="product.category"
                                                        class="td-category-tag"
                                                        :style="getCategoryPillStyle(product.category, false)"
                                                    >
                                                        {{ categoryLabel(product) }}
                                                    </span>
                                                    <span v-else class="td-empty-dash">—</span>
                                                </td>

                                                <!-- Price -->
                                                <td v-if="displaySettings.showPrice" class="td-price align-right">
                                                    <span class="td-price-amount">{{ formatMoney(displayPrice(product)) }}</span>
                                                </td>

                                            <!-- Action / In-Cart Stepper -->
                                            <td class="td-action align-right" @click.stop>
                                                <div v-if="cartQtyMap[product.id]" class="table-qty-stepper">
                                                    <button
                                                        type="button"
                                                        class="table-qty-btn table-qty-btn--minus"
                                                        title="Decrease quantity"
                                                        @click.stop="adjustQty(product.id, -1)"
                                                    >
                                                        <mdicon name="minus" size="14" />
                                                    </button>
                                                    <span class="table-qty-value">{{ cartQtyMap[product.id] }}</span>
                                                    <button
                                                        type="button"
                                                        class="table-qty-btn table-qty-btn--plus"
                                                        title="Increase quantity"
                                                        @click.stop="adjustQty(product.id, 1)"
                                                    >
                                                        <mdicon name="plus" size="14" />
                                                    </button>
                                                </div>
                                                <button
                                                    v-else
                                                    type="button"
                                                    class="table-add-btn"
                                                    title="Add to ticket"
                                                    @click.stop="addToCart(product)"
                                                >
                                                    <mdicon name="plus" size="15" />
                                                    <span>Add</span>
                                                </button>
                                            </td>
                                        </tr>
                                    </template>

                                        <!-- Empty Search State -->
                                        <tr v-if="sortedTableProducts.length === 0">
                                            <td :colspan="tableColumnCount" class="pos-table-empty">
                                                <mdicon :name="activeCategory === 'RECENT' ? 'history' : 'magnify'" size="32" class="empty-icon" />
                                                <p v-if="activeCategory === 'RECENT'">No recently ordered products yet. Products from finalized sales will appear here.</p>
                                                <p v-else>No products match your search or filter.</p>
                                                <button
                                                    v-if="searchQuery || activeCategory !== 'ALL'"
                                                    type="button"
                                                    class="ghost-button ghost-button--sm"
                                                    @click="clearFilters"
                                                >
                                                    Clear filters
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Table Pagination Controls -->
                            <div v-if="totalTablePages > 1" class="pos-table-pagination">
                                <div class="table-pagination-nav">
                                    <button
                                        type="button"
                                        class="page-nav-btn"
                                        :disabled="tablePage <= 1"
                                        title="First page"
                                        @click="tablePage = 1"
                                    >
                                        <mdicon name="chevron-double-left" size="16" />
                                    </button>
                                    <button
                                        type="button"
                                        class="page-nav-btn"
                                        :disabled="tablePage <= 1"
                                        title="Previous page"
                                        @click="tablePage = Math.max(1, tablePage - 1)"
                                    >
                                        <mdicon name="chevron-left" size="16" />
                                    </button>

                                    <div class="page-numbers">
                                        <button
                                            v-for="p in visibleTablePages"
                                            :key="p"
                                            type="button"
                                            class="page-num-btn"
                                            :class="{ 'page-num-btn--active': p === tablePage, 'page-num-btn--ellipsis': p === -1 }"
                                            :disabled="p === -1"
                                            @click="p !== -1 && (tablePage = p)"
                                        >
                                            {{ p === -1 ? '…' : p }}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        class="page-nav-btn"
                                        :disabled="tablePage >= totalTablePages"
                                        title="Next page"
                                        @click="tablePage = Math.min(totalTablePages, tablePage + 1)"
                                    >
                                        <mdicon name="chevron-right" size="16" />
                                    </button>
                                    <button
                                        type="button"
                                        class="page-nav-btn"
                                        :disabled="tablePage >= totalTablePages"
                                        title="Last page"
                                        @click="tablePage = totalTablePages"
                                    >
                                        <mdicon name="chevron-double-right" size="16" />
                                    </button>
                                </div>
                                <span class="page-indicator-text">Page {{ tablePage }} of {{ totalTablePages }}</span>
                            </div>
                        </div>

                        <!-- ==========================================
                             CARD GRID VIEW (Visual Tiles)
                             ========================================== -->
                        <template v-else-if="activeViewMode === 'cards'">
                            <!-- Rearrange mode banner -->
                            <div v-if="isRearranging" class="rearrange-banner">
                                <span>Drag cards to reorder. Order is saved automatically.</span>
                                <div class="rearrange-banner-actions">
                                    <button class="ghost-button ghost-button--sm" @click="resetOrder">Reset order</button>
                                    <button class="ghost-button ghost-button--sm ghost-button--accent" @click="isRearranging = false">Done</button>
                                </div>
                            </div>

                            <!-- Grouped view -->
                            <div v-if="displaySettings.groupByCategory && !isRearranging" class="product-sections">
                                <div
                                    v-for="[category, categoryProducts] in groupedFilteredProducts"
                                    :key="category"
                                    class="category-section"
                                >
                                    <h4 class="category-section-title">{{ category }}</h4>
                                    <div class="product-grid">
                                        <button
                                            v-for="product in categoryProducts"
                                            :key="product.id"
                                            type="button"
                                            class="product-card"
                                            :class="{ 'product-card--in-cart': cartQtyMap[product.id] }"
                                            :style="getCardStyle(product)"
                                            :title="product.name"
                                            @click="addToCart(product)"
                                        >
                                            <span v-if="cartQtyMap[product.id]" class="in-cart-badge">×{{ cartQtyMap[product.id] }}</span>
                                            <div
                                                v-if="displaySettings.showType || (displaySettings.showCategory && product.category)"
                                                class="product-card-top"
                                            >
                                                <span v-if="displaySettings.showType" class="product-pill">{{ formatProductType(product.type) }}</span>
                                                <span v-if="displaySettings.showCategory && product.category" class="product-tag">
                                                    {{ categoryLabel(product) }}
                                                </span>
                                            </div>
                                            <h3 :title="product.name">{{ product.name }}</h3>
                                            <p v-if="displaySettings.showSku" class="product-sub">
                                                {{ product.sku ? `SKU ${product.sku}` : product.unit }}
                                            </p>
                                            <div v-if="displaySettings.showPrice" class="product-price-row">
                                                <span class="product-price">{{ formatMoney(displayPrice(product)) }}</span>
                                                <span v-if="!displaySettings.showSku" class="product-unit">{{ product.unit }}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div v-if="filteredProducts.length === 0" class="panel-state">
                                    <template v-if="activeCategory === 'RECENT'">
                                        No recently ordered products yet. Products from finalized sales will appear here.
                                    </template>
                                    <template v-else>
                                        No active products match your search.
                                    </template>
                                </div>
                            </div>

                            <!-- Flat grid (default + rearrange mode) -->
                            <div v-else class="product-grid">
                                <button
                                    v-for="product in filteredProducts"
                                    :key="product.id"
                                    type="button"
                                    class="product-card"
                                    :class="{
                                        'product-card--in-cart': cartQtyMap[product.id] && !isRearranging,
                                        'product-card--rearrange': isRearranging,
                                        'product-card--dragging': draggedId === product.id,
                                        'product-card--drag-over': dragOverId === product.id,
                                    }"
                                    :style="getCardStyle(product)"
                                    :title="product.name"
                                    :draggable="isRearranging"
                                    @click="isRearranging ? undefined : addToCart(product)"
                                    @dragstart="onDragStart($event, product.id)"
                                    @dragover="onDragOver($event, product.id)"
                                    @dragleave="onDragLeave"
                                    @drop="onDrop($event, product.id)"
                                    @dragend="onDragEnd"
                                >
                                    <span v-if="cartQtyMap[product.id] && !isRearranging" class="in-cart-badge">×{{ cartQtyMap[product.id] }}</span>
                                    <div
                                        v-if="displaySettings.showType || (displaySettings.showCategory && product.category)"
                                        class="product-card-top"
                                    >
                                        <span v-if="displaySettings.showType" class="product-pill">{{ formatProductType(product.type) }}</span>
                                        <span v-if="displaySettings.showCategory && product.category" class="product-tag">
                                            {{ categoryLabel(product) }}
                                        </span>
                                    </div>
                                    <h3 :title="product.name">{{ product.name }}</h3>
                                    <p v-if="displaySettings.showSku" class="product-sub">
                                        {{ product.sku ? `SKU ${product.sku}` : product.unit }}
                                    </p>
                                    <div v-if="displaySettings.showPrice" class="product-price-row">
                                        <span class="product-price">{{ formatMoney(displayPrice(product)) }}</span>
                                        <span v-if="!displaySettings.showSku" class="product-unit">{{ product.unit }}</span>
                                    </div>
                                </button>
                                <div v-if="filteredProducts.length === 0" class="panel-state">
                                    <template v-if="activeCategory === 'RECENT'">
                                        No recently ordered products yet. Products from finalized sales will appear here.
                                    </template>
                                    <template v-else>
                                        No active products match your search.
                                    </template>
                                </div>
                            </div>
                        </template>
                    </template>
                    </div>
                </section>

                <aside class="cart-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Current ticket</h2>
                            <p v-if="cartItems.length > 0" class="cart-count-label">
                                {{ cartItems.length }} item{{ cartItems.length !== 1 ? 's' : '' }} &middot; {{ formatMoney(cartSubtotal) }}
                            </p>
                            <p v-else>Add a product to begin.</p>
                        </div>
                    </div>

                    <div v-if="cartItems.length === 0" class="cart-empty">
                        <mdicon name="cart-outline" size="28" />
                        <span>Add a product to begin a new ticket.</span>
                    </div>

                    <div v-else class="cart-list">
                        <article v-for="item in cartItems" :key="item.productId" class="cart-row" :style="getCartRowStyle(item)">
                            <div class="cart-row-top">
                                <span class="cart-item-name" :title="item.name">{{ item.name }}</span>
                                <button class="remove-btn" @click="removeItem(item.productId)" title="Remove">×</button>
                            </div>
                            <div class="cart-row-bottom">
                                <span class="cart-item-price">{{ formatMoney(item.unitPrice) }}</span>
                                <span class="cart-item-times">×</span>
                                <div class="cart-qty-stepper">
                                    <button class="qty-btn" @click="adjustQty(item.productId, -1)">−</button>
                                    <input
                                        v-model.number="item.qty"
                                        type="number"
                                        min="1"
                                        step="1"
                                        class="qty-input"
                                        @blur="sanitizeItem(item)"
                                    />
                                    <button class="qty-btn" @click="adjustQty(item.productId, 1)">+</button>
                                </div>
                                <span class="cart-item-total">{{ formatMoney(lineTotal(item)) }}</span>
                            </div>
                        </article>
                    </div>

                    <div class="cart-summary">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>{{ formatMoney(cartSubtotal) }}</span>
                        </div>
                        <div class="summary-row">
                            <label class="discount-toggle">
                                <input v-model="discountEnabled" type="checkbox" />
                                <span>Discount ({{ defaultDiscount }}%)</span>
                            </label>
                            <span :class="{ 'text-muted': !discountEnabled }">-{{ formatMoney(cartDiscount) }}</span>
                        </div>
                        <template v-if="discountEnabled">
                            <div v-if="defaultTaxRate > 0" class="summary-row">
                                <span>Less VAT ({{ defaultTaxRate }}%)</span>
                                <span>-{{ formatMoney(cartVatExemption) }}</span>
                            </div>
                        </template>
                        <template v-else>
                            <div class="summary-row net">
                                <span>Net</span>
                                <span>{{ formatMoney(cartNet) }}</span>
                            </div>
                            <div class="summary-row">
                                <span>Tax ({{ defaultTaxRate }}%)</span>
                                <span>{{ formatMoney(cartTax) }}</span>
                            </div>
                        </template>
                        <div class="summary-row total">
                            <span>Total</span>
                            <span>{{ formatMoney(cartTotal) }}</span>
                        </div>
                    </div>

                    <div class="checkout-controls">
                        <div
                            v-if="ticketChannels.length"
                            class="order-type-toggle channel-toggle"
                            :style="{ gridTemplateColumns: `repeat(${ticketChannels.length + 1}, 1fr)` }"
                            role="group"
                            aria-label="Sales channel"
                        >
                            <button
                                type="button"
                                class="order-type-option"
                                :class="{ 'order-type-option--active': !selectedChannelKey }"
                                @click="selectedChannelKey = null"
                            >Walk-in</button>
                            <button
                                v-for="channel in ticketChannels"
                                :key="channel.key"
                                type="button"
                                class="order-type-option channel-option"
                                :class="{ 'order-type-option--active channel-option--active': selectedChannelKey === channel.key }"
                                :title="`${channel.name} prices (+${channel.markupPercent}%)`"
                                @click="selectedChannelKey = channel.key"
                            >{{ channel.name }}</button>
                        </div>
                        <div class="order-type-toggle" role="group" aria-label="Order type">
                            <button
                                type="button"
                                class="order-type-option"
                                :class="{ 'order-type-option--active': orderType === 'DINE_IN' }"
                                :disabled="channelForcesTakeout"
                                :title="channelForcesTakeout ? `${selectedChannel?.name} orders are always takeout` : undefined"
                                @click="orderType = 'DINE_IN'"
                            >Dine-in</button>
                            <button
                                type="button"
                                class="order-type-option"
                                :class="{ 'order-type-option--active': orderType === 'TAKEOUT' }"
                                @click="orderType = 'TAKEOUT'"
                            >Takeout</button>
                        </div>
                        <label class="select-field">
                            Payment method
                            <select v-model="paymentMethod">
                                <option v-for="method in paymentMethods" :key="method" :value="method">
                                    {{ formatPaymentMethod(method) }}
                                </option>
                            </select>
                        </label>
                        <div v-if="isOwner" class="pos-date-panel">
                            <div class="pos-date-toggle">
                                <label class="pos-date-checkbox">
                                    <input v-model="useCustomDate" type="checkbox" />
                                    <span>Manual sale date</span>
                                </label>
                                <button
                                    v-if="useCustomDate"
                                    type="button"
                                    class="pos-date-now-btn"
                                    title="Set to current date and time"
                                    @click="resetCustomDateToNow"
                                >
                                    Now
                                </button>
                            </div>
                            <div v-if="useCustomDate" class="pos-date-inputs">
                                <input
                                    v-model="customSaleDate"
                                    type="date"
                                    class="pos-date-input"
                                    aria-label="Sale date"
                                />
                                <input
                                    v-model="customSaleTime"
                                    type="time"
                                    class="pos-time-input"
                                    aria-label="Sale time"
                                />
                            </div>
                        </div>
                        <button
                            class="primary-button"
                            :disabled="!canFinalize"
                            @click="finalizeTicket"
                        >
                            {{ isSubmitting ? 'Finalizing...' : 'Finalize sale' }}
                        </button>
                        <button class="secondary-button" :disabled="cartItems.length === 0" @click="clearCart">
                            Clear ticket
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { getSubcategoriesFor } from '@/utils/subcategories';
import { activeChannels, computeChannelPrice } from '@/utils/salesChannels';
import { useRoute, useRouter } from 'vue-router';
import { listProducts } from '@/api/products';
import { finalizeSale } from '@/api/sales';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { todayStr, currentTimeStr, zonedDateTimeIso } from '@/utils/datetime';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

type Product = {
    id: string;
    name: string;
    type: string;
    sku?: string | null;
    price: number;
    unit: string;
    category?: string | null;
    subcategory?: string | null;
    channelPrices?: Record<string, number>;
    unavailableChannels?: string[];
    active?: boolean;
};

type CartItem = {
    productId: string;
    name: string;
    type: string;
    unit: string;
    category?: string | null;
    unitPrice: number;
    qty: number;
};

type DisplaySettings = {
    showSku: boolean;
    showType: boolean;
    showCategory: boolean;
    showPrice: boolean;
    useCategoryColor: boolean;
    categoryColors: Record<string, string>;
    groupByCategory: boolean;
};

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

const storeTimezone = computed(() => storeContext.currentStore?.timezone || 'Asia/Manila');
const isOwner = computed(
    () => storeContext.currentStore?.role === 'OWNER' || userContext.profile?.isSuperAdmin === true
);

const useCustomDate = ref(false);
const customSaleDate = ref(todayStr(storeTimezone.value));
const customSaleTime = ref(currentTimeStr(storeTimezone.value));

const resetCustomDateToNow = () => {
    customSaleDate.value = todayStr(storeTimezone.value);
    customSaleTime.value = currentTimeStr(storeTimezone.value);
};

watch(storeTimezone, (newTz) => {
    if (!useCustomDate.value) {
        customSaleDate.value = todayStr(newTz);
        customSaleTime.value = currentTimeStr(newTz);
    }
});

type PosViewMode = 'cards' | 'table';

const getInitialViewMode = (): PosViewMode => {
    if (route.path.endsWith('/table') || route.query.view === 'table') {
        return 'table';
    }
    if (route.path.endsWith('/cards') || route.query.view === 'cards') {
        return 'cards';
    }
    const saved = localStorage.getItem('pos_catalog_view_mode');
    if (saved === 'table' || saved === 'cards') {
        return saved;
    }
    return 'cards';
};

const activeViewMode = ref<PosViewMode>(getInitialViewMode());

const setViewMode = (mode: PosViewMode) => {
    activeViewMode.value = mode;
    localStorage.setItem('pos_catalog_view_mode', mode);
    router.replace({
        query: {
            ...route.query,
            view: mode === 'table' ? 'table' : undefined,
        },
    });
};

watch(
    () => [route.query.view, route.path],
    ([queryView, path]) => {
        if (typeof path === 'string' && path.endsWith('/table')) {
            activeViewMode.value = 'table';
        } else if (queryView === 'table' || queryView === 'cards') {
            activeViewMode.value = queryView;
        }
    }
);

const searchInputRef = ref<HTMLInputElement | null>(null);

const products = ref<Product[]>([]);
const cartItems = ref<CartItem[]>([]);
const searchQuery = ref('');
const activeCategory = ref('ALL');
const NO_SUBCATEGORY = '__NONE__';
const activeSubcategory = ref('ALL');

const recentProductIds = ref<string[]>([]);

const recentStorageKey = computed(() => {
    const storeId = storeContext.currentStoreId;
    return storeId ? `posRecentProducts:${storeId}` : 'posRecentProducts';
});

const loadRecentProducts = () => {
    const raw = localStorage.getItem(recentStorageKey.value);
    if (!raw) {
        recentProductIds.value = [];
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            recentProductIds.value = parsed.filter((id) => typeof id === 'string').slice(0, 10);
        }
    } catch {
        recentProductIds.value = [];
    }
};

const recordRecentProducts = (newProductIds: string[]) => {
    if (!newProductIds.length) return;
    const seen = new Set<string>();
    const orderedIncoming: string[] = [];
    for (const id of newProductIds) {
        if (!seen.has(id)) {
            seen.add(id);
            orderedIncoming.push(id);
        }
    }
    const filteredExisting = recentProductIds.value.filter((id) => !seen.has(id));
    const combined = [...orderedIncoming, ...filteredExisting].slice(0, 10);
    recentProductIds.value = combined;
    try {
        localStorage.setItem(recentStorageKey.value, JSON.stringify(combined));
    } catch {
        // Ignore localStorage quota errors
    }
};

const recentProducts = computed(() => {
    if (recentProductIds.value.length === 0) return [];
    const productMap = new Map(sellableProducts.value.map((p) => [p.id, p]));
    return recentProductIds.value
        .map((id) => productMap.get(id))
        .filter((p): p is Product => Boolean(p && p.active !== false));
});
const paymentMethod = computed({
    get: () => _paymentMethod.value,
    set: (v: string) => { _paymentMethod.value = v; },
});
const _paymentMethod = ref('CASH');
watch(() => storeContext.currentStore?.paymentMethods, (methods) => {
    if (methods?.length && !methods.includes(_paymentMethod.value)) {
        _paymentMethod.value = methods[0];
    }
}, { immediate: true });
const discountEnabled = ref(false);
const orderType = ref<'DINE_IN' | 'TAKEOUT'>('DINE_IN');

// ── Sales channel (e.g. Grab): channel prices for the whole ticket ──
const posChannels = computed(() => activeChannels(storeContext.currentStore?.salesChannels));
const selectedChannelKey = ref<string | null>(null);
const selectedChannel = computed(() => posChannels.value.find((channel) => channel.key === selectedChannelKey.value) ?? null);
const channelForcesTakeout = computed(() => Boolean(selectedChannel.value?.alwaysTakeout));
const isSoldOn = (product: { unavailableChannels?: string[] }, channelKey: string | null) =>
    !channelKey || !(product.unavailableChannels ?? []).includes(channelKey);
// Products offered on the selected channel; everything for walk-in.
const sellableProducts = computed(() => products.value.filter((product) => isSoldOn(product, selectedChannelKey.value)));

// Channels the current ticket can go to. Hidden on an empty ticket (walk-in is the
// default) and for any channel that doesn't sell an item already on the ticket.
// (While on a channel, its off-menu products are hidden, so this stays consistent.)
const ticketChannels = computed(() => {
    if (cartItems.value.length === 0) return [];
    const byId = new Map(products.value.map((product) => [product.id, product]));
    return posChannels.value.filter((channel) =>
        cartItems.value.every((item) => {
            const product = byId.get(item.productId);
            return !product || isSoldOn(product, channel.key);
        })
    );
});

const displayPrice = (product: { price: number | string; channelPrices?: Record<string, number> }) => {
    const base = Number(product.price) || 0;
    const channel = selectedChannel.value;
    return channel ? computeChannelPrice(base, channel, product.channelPrices?.[channel.key]) : base;
};
const isLoading = ref(false);
const isSubmitting = ref(false);

const displaySettingsRef = ref<HTMLDetailsElement | null>(null);

const posPageRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const toggleFullscreen = async () => {
    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else if (posPageRef.value) {
            await posPageRef.value.requestFullscreen();
        }
    } catch (error) {
        showToast('Fullscreen is not available in this browser.', 'error');
    }
};

const handleFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === posPageRef.value;
};

const displaySettings = reactive<DisplaySettings>({
    showSku: true,
    showType: false,
    showCategory: false,
    showPrice: true,
    useCategoryColor: true,
    categoryColors: {} as Record<string, string>,
    groupByCategory: false,
});

const isRearranging = ref(false);
const productOrder = ref<string[]>([]);
const draggedId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);

const categoryPalette = [
    '#fef3c7',
    '#e0f2fe',
    '#dcfce7',
    '#fee2e2',
    '#f3e8ff',
    '#e2e8f0',
    '#fae8ff',
    '#cffafe',
    '#fce7f3',
    '#fff7ed',
];

const ALL_PAYMENT_METHODS = ['CASH', 'CARD', 'GCASH', 'MAYA', 'TRANSFER', 'OTHER'];
const paymentMethods = computed(() => {
    const configured = storeContext.currentStore?.paymentMethods;
    return configured?.length ? configured : ALL_PAYMENT_METHODS;
});

const loadProducts = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        products.value = [];
        return;
    }

    isLoading.value = true;
    try {
        const data = await listProducts(storeId);
        products.value = (data.products as Product[]).filter((product) => product.active);
    } finally {
        isLoading.value = false;
    }
};

const addToCart = (product: Product) => {
    const existing = cartItems.value.find((item) => item.productId === product.id);
    if (existing) {
        existing.qty += 1;
        return;
    }

    cartItems.value.push({
        productId: product.id,
        name: product.name,
        type: product.type,
        unit: product.unit,
        category: product.category,
        unitPrice: displayPrice(product),
        qty: 1,
    });
};

const adjustQty = (productId: string, delta: number) => {
    const item = cartItems.value.find((entry) => entry.productId === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeItem(productId);
    }
};

const sanitizeItem = (item: CartItem) => {
    if (!Number.isFinite(item.qty) || item.qty <= 0) {
        removeItem(item.productId);
        return;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        item.unitPrice = 0;
    }
};

const removeItem = (productId: string) => {
    cartItems.value = cartItems.value.filter((item) => item.productId !== productId);
};

const clearCart = () => {
    cartItems.value = [];
    discountEnabled.value = false;
    selectedChannelKey.value = null;
    orderType.value = 'DINE_IN';
    _paymentMethod.value = paymentMethods.value.includes('CASH') ? 'CASH' : paymentMethods.value[0];
};

const goToSalesHistory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/sales`);
};

const orderedProducts = computed(() => {
    if (productOrder.value.length === 0) return sellableProducts.value;
    const orderMap = new Map(productOrder.value.map((id, i) => [id, i]));
    return [...sellableProducts.value].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return ai - bi;
    });
});

const filteredProducts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const baseList = activeCategory.value === 'RECENT' ? recentProducts.value : orderedProducts.value;
    return baseList.filter((product) => {
        const matchesCategory =
            activeCategory.value === 'ALL' ||
            activeCategory.value === 'RECENT' ||
            product.category === activeCategory.value;
        const matchesSubcategory =
            activeSubcategory.value === 'ALL' ||
            (activeSubcategory.value === NO_SUBCATEGORY
                ? !product.subcategory
                : product.subcategory === activeSubcategory.value);
        const matchesQuery =
            !query ||
            product.name.toLowerCase().includes(query) ||
            (product.sku || '').toLowerCase().includes(query) ||
            (product.category || '').toLowerCase().includes(query) ||
            (product.subcategory || '').toLowerCase().includes(query);
        return matchesCategory && matchesSubcategory && matchesQuery;
    });
});

const groupedFilteredProducts = computed(() => {
    const groups = new Map<string, Product[]>();
    for (const product of filteredProducts.value) {
        // With a single category selected, grouping by category is one heading; group by subcategory instead.
        const key =
            activeCategory.value === 'RECENT'
                ? 'Recently Ordered'
                : isSpecificCategory.value && subcategoryList.value.length > 0
                  ? (product.subcategory || 'Other')
                  : (product.category || 'Uncategorized');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(product);
    }
    if (isSpecificCategory.value && subcategoryList.value.length > 0) {
        // Section order follows the subcategory pills ("Other" last).
        const order = subcategoryList.value.map((sub) => (sub.value === NO_SUBCATEGORY ? 'Other' : sub.value));
        return new Map(
            [...groups.entries()].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
        );
    }
    return groups;
});

const categoryList = computed(() => {
    const set = new Set<string>();
    for (const product of sellableProducts.value) {
        if (product.category) {
            set.add(product.category);
        }
    }
    return Array.from(set).sort();
});

const isSpecificCategory = computed(
    () => activeCategory.value !== 'ALL' && activeCategory.value !== 'RECENT'
);

// Subcategory pills for the selected category; "Other" covers its products without one.
const subcategoryList = computed(() => {
    if (!isSpecificCategory.value) return [] as Array<{ value: string; label: string }>;
    const subs = new Set<string>();
    let hasUnassigned = false;
    for (const product of sellableProducts.value) {
        if (product.category !== activeCategory.value) continue;
        if (product.subcategory) subs.add(product.subcategory);
        else hasUnassigned = true;
    }
    if (subs.size === 0) return [];
    // Configured order from Store Settings first (only those with products), then any unlisted ones.
    const configured = getSubcategoriesFor(storeContext.currentStore?.subcategoryOptions, activeCategory.value);
    const ordered = configured.filter((sub) => subs.has(sub));
    const unlisted = Array.from(subs)
        .filter((sub) => !configured.includes(sub))
        .sort((a, b) => a.localeCompare(b));
    const list = [...ordered, ...unlisted].map((sub) => ({ value: sub, label: sub }));
    if (hasUnassigned) list.push({ value: NO_SUBCATEGORY, label: 'Other' });
    return list;
});

const categoryLabel = (product: Product) =>
    product.subcategory && product.category ? `${product.category} · ${product.subcategory}` : product.category;

watch(activeCategory, () => {
    activeSubcategory.value = 'ALL';
});

watch(subcategoryList, (list) => {
    if (activeSubcategory.value !== 'ALL' && !list.some((sub) => sub.value === activeSubcategory.value)) {
        activeSubcategory.value = 'ALL';
    }
});

const productsHaveSku = computed(() => products.value.some((p) => !!p.sku));

const tableColumnCount = computed(() => {
    let count = 2; // Product + Ticket
    if (displaySettings.showSku) count++;
    if (displaySettings.showCategory) count++;
    if (displaySettings.showPrice) count++;
    return count;
});

const tableSortColumn = ref<'name' | 'sku' | 'category' | 'price'>('name');
const tableSortDirection = ref<'asc' | 'desc'>('asc');
const tablePage = ref(1);
const tablePageSize = ref<number | 'all'>(50);

const isTableExplicitlySorted = ref(false);

const handleSort = (column: 'name' | 'sku' | 'category' | 'price') => {
    isTableExplicitlySorted.value = true;
    if (tableSortColumn.value === column) {
        tableSortDirection.value = tableSortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
        tableSortColumn.value = column;
        tableSortDirection.value = column === 'price' ? 'desc' : 'asc';
    }
    tablePage.value = 1;
};

const sortedTableProducts = computed(() => {
    const list = [...filteredProducts.value];
    if (activeCategory.value === 'RECENT' && !isTableExplicitlySorted.value) {
        return list;
    }
    const col = tableSortColumn.value;
    const isAsc = tableSortDirection.value === 'asc';
    const mult = isAsc ? 1 : -1;

    return list.sort((a, b) => {
        if (displaySettings.groupByCategory && (!isTableExplicitlySorted.value || tableSortColumn.value === 'category')) {
            const catA = a.category || 'Uncategorized';
            const catB = b.category || 'Uncategorized';
            const catDiff = catA.localeCompare(catB, undefined, { sensitivity: 'base' });
            if (catDiff !== 0) return catDiff;
        }
        if (col === 'name') {
            return mult * a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        }
        if (col === 'sku') {
            const skuA = a.sku || '';
            const skuB = b.sku || '';
            return mult * skuA.localeCompare(skuB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (col === 'category') {
            const catA = a.category || '';
            const catB = b.category || '';
            return mult * catA.localeCompare(catB, undefined, { sensitivity: 'base' });
        }
        if (col === 'price') {
            const pA = displayPrice(a);
            const pB = displayPrice(b);
            return mult * (pA - pB);
        }
        return 0;
    });
});

const shouldShowTableCategoryHeader = (index: number) => {
    if (!displaySettings.groupByCategory) return false;
    if (index === 0) return true;
    const prev = paginatedTableProducts.value[index - 1];
    const curr = paginatedTableProducts.value[index];
    return (prev?.category || 'Uncategorized') !== (curr?.category || 'Uncategorized');
};

const totalTablePages = computed(() => {
    if (tablePageSize.value === 'all') return 1;
    const size = Number(tablePageSize.value) || 50;
    return Math.max(1, Math.ceil(sortedTableProducts.value.length / size));
});

const paginatedTableProducts = computed(() => {
    if (tablePageSize.value === 'all') return sortedTableProducts.value;
    const size = Number(tablePageSize.value) || 50;
    const start = (tablePage.value - 1) * size;
    return sortedTableProducts.value.slice(start, start + size);
});

const tableRangeStart = computed(() => {
    if (sortedTableProducts.value.length === 0) return 0;
    if (tablePageSize.value === 'all') return 1;
    const size = Number(tablePageSize.value) || 50;
    return (tablePage.value - 1) * size + 1;
});

const tableRangeEnd = computed(() => {
    if (sortedTableProducts.value.length === 0) return 0;
    if (tablePageSize.value === 'all') return sortedTableProducts.value.length;
    const size = Number(tablePageSize.value) || 50;
    return Math.min(tablePage.value * size, sortedTableProducts.value.length);
});

const visibleTablePages = computed(() => {
    const total = totalTablePages.value;
    const current = tablePage.value;
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [];
    pages.push(1);
    if (current > 4) {
        pages.push(-1);
    }
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    if (current < total - 3) {
        pages.push(-1);
    }
    pages.push(total);
    return pages;
});

const selectedRowIndex = ref<number>(-1);
const rowRefs = ref<(HTMLElement | null)[]>([]);
const isSearchFocused = ref(false);
const isTableFocused = ref(false);

const setRowRef = (el: any, index: number) => {
    rowRefs.value[index] = (el as HTMLElement) || null;
};

const focusRow = (index: number) => {
    if (index < 0 || index >= paginatedTableProducts.value.length) return;
    selectedRowIndex.value = index;
    const el = rowRefs.value[index];
    if (el) {
        el.focus();
        el.scrollIntoView({ block: 'nearest' });
    }
};

const navigateRow = (newIndex: number) => {
    if (newIndex < 0) {
        selectedRowIndex.value = -1;
        if (searchInputRef.value) {
            searchInputRef.value.focus();
            const len = searchInputRef.value.value.length;
            searchInputRef.value.setSelectionRange(len, len);
        }
        return;
    }
    if (newIndex >= paginatedTableProducts.value.length) return;
    focusRow(newIndex);
};

const onRowClick = (product: Product, index: number) => {
    selectedRowIndex.value = index;
    focusRow(index);
    addToCart(product);
};

const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (activeViewMode.value !== 'table') return;

    // Check if user is typing in another input / modal / textarea
    const activeEl = document.activeElement;
    const isInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

    // If typing in another input (e.g. payment modal, customer details), do not intercept
    if (isInput && activeEl !== searchInputRef.value) return;

    // Slash shortcut: '/' quickly focuses the search bar from anywhere in table mode
    if (e.key === '/' && activeEl !== searchInputRef.value) {
        e.preventDefault();
        searchInputRef.value?.focus();
        searchInputRef.value?.select();
        return;
    }

    // If neither search nor a specific table row has focus (e.g. user clicked background/table header)
    if (!isInput && selectedRowIndex.value === -1) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusRow(0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusRow(paginatedTableProducts.value.length - 1);
        }
    }
};

const onSearchKeydown = (e: KeyboardEvent) => {
    if (activeViewMode.value !== 'table') {
        if (e.key === 'Enter') handleSearchEnter();
        return;
    }
    if (e.key === 'ArrowDown') {
        if (paginatedTableProducts.value.length > 0) {
            e.preventDefault();
            focusRow(0);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedRowIndex.value >= 0 && selectedRowIndex.value < paginatedTableProducts.value.length) {
            const product = paginatedTableProducts.value[selectedRowIndex.value];
            addToCart(product);
            showToast(`Added 1× ${product.name} to ticket`, 'success');
        } else {
            handleSearchEnter();
        }
    } else if (e.key === 'Escape') {
        clearSearch();
    }
};

const onRowKeydown = (e: KeyboardEvent, product: Product, index: number) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateRow(index + 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateRow(index - 1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        addToCart(product);
        showToast(`Added 1× ${product.name} to ticket`, 'success');
    } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustQty(product.id, 1);
    } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        adjustQty(product.id, -1);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        selectedRowIndex.value = -1;
        searchInputRef.value?.focus();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If cashier types regular letters, jump focus back to search input
        searchInputRef.value?.focus();
        searchQuery.value += e.key;
    }
};

const handleSearchEnter = () => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return;

    const list = activeViewMode.value === 'table' ? sortedTableProducts.value : filteredProducts.value;
    if (list.length === 0) {
        showToast(`No product found for "${searchQuery.value.trim()}"`, 'error');
        return;
    }

    const exactMatch = list.find(
        (p) => (p.sku && p.sku.toLowerCase() === query) || p.name.toLowerCase() === query
    );
    const target = exactMatch || list[0];
    addToCart(target);
    showToast(`Added 1× ${target.name} to ticket`, 'success');

    if (searchInputRef.value) {
        searchInputRef.value.select();
    }
};

const clearSearch = () => {
    searchQuery.value = '';
    tablePage.value = 1;
    selectedRowIndex.value = -1;
    searchInputRef.value?.focus();
};

const clearFilters = () => {
    searchQuery.value = '';
    activeCategory.value = 'ALL';
    isTableExplicitlySorted.value = false;
    tablePage.value = 1;
    selectedRowIndex.value = -1;
    searchInputRef.value?.focus();
};

watch(
    () => activeCategory.value,
    (cat) => {
        if (cat === 'RECENT') {
            isTableExplicitlySorted.value = false;
        }
    }
);

watch(
    () => [searchQuery.value, activeCategory.value, activeSubcategory.value, tablePageSize.value, activeViewMode.value],
    () => {
        tablePage.value = 1;
        selectedRowIndex.value = -1;
        rowRefs.value = [];
    }
);

watch(
    () => tablePage.value,
    () => {
        selectedRowIndex.value = -1;
        rowRefs.value = [];
    }
);

const lineTotal = (item: CartItem) => {
    const qty = Number.isFinite(item.qty) ? item.qty : 0;
    const price = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
    return qty * price;
};

const cartSubtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + lineTotal(item), 0);
});

const defaultTaxRate = computed(() => storeContext.currentStore?.defaultTaxRate ?? 0);
const defaultDiscount = computed(() => storeContext.currentStore?.defaultDiscount ?? 0);

const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Senior/PWD discount: prices are VAT-inclusive, so remove VAT first and take the
// discount off the VAT-exclusive price, e.g. 90 / 1.12 = 80.36, less 20% = 64.29.
// Computed per line so the receipt matches what gets saved.
const seniorLineBreakdown = (item: CartItem) => {
    const gross = lineTotal(item);
    const vatExclusive = roundCents(gross / (1 + defaultTaxRate.value / 100));
    const discount = roundCents((vatExclusive * defaultDiscount.value) / 100);
    return { gross, vatExemption: roundCents(gross - vatExclusive), discount };
};

// The discounted ticket total is rounded to the nearest whole peso (64.29 -> 64);
// the centavo difference is folded into the discount of the largest line.
const seniorBreakdowns = computed(() => {
    if (!discountEnabled.value) return [];
    const lines = cartItems.value.map(seniorLineBreakdown);
    if (!lines.length) return lines;
    const exactTotal = roundCents(
        lines.reduce((sum, line) => sum + line.gross - line.vatExemption - line.discount, 0)
    );
    const adjustment = roundCents(exactTotal - Math.round(exactTotal));
    if (adjustment !== 0) {
        const largest = lines.reduce((best, line) => (line.gross > best.gross ? line : best), lines[0]);
        largest.discount = roundCents(
            Math.min(Math.max(largest.discount + adjustment, 0), largest.gross - largest.vatExemption)
        );
    }
    return lines;
});

const cartVatExemption = computed(() =>
    roundCents(seniorBreakdowns.value.reduce((sum, line) => sum + line.vatExemption, 0))
);

const cartDiscount = computed(() => {
    if (!discountEnabled.value) return 0;
    return roundCents(seniorBreakdowns.value.reduce((sum, line) => sum + line.discount, 0));
});

const cartTotal = computed(() => {
    if (discountEnabled.value) {
        return roundCents(cartSubtotal.value - cartVatExemption.value - cartDiscount.value);
    }
    return cartSubtotal.value;
});

const cartTax = computed(() => {
    if (discountEnabled.value) return 0;
    return cartTotal.value > 0 ? (cartTotal.value * defaultTaxRate.value) / 100 : 0;
});

const cartNet = computed(() => {
    return cartTotal.value - cartTax.value;
});
const canFinalize = computed(() => {
    return !!storeContext.currentStoreId && cartItems.value.length > 0 && !isSubmitting.value;
});

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const cartQtyMap = computed(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems.value) {
        map[item.productId] = item.qty;
    }
    return map;
});

const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
        CASH: 'Cash',
        CARD: 'Card',
        GCASH: 'GCash',
        MAYA: 'Maya',
        TRANSFER: 'Bank transfer',
        OTHER: 'Other',
    };
    return labels[method] ?? method.replace('_', ' ');
};

const formatProductType = (type: string) => {
    if (type === 'READY_MADE') return 'Ready-made';
    if (type === 'RECIPE') return 'Recipe';
    return type;
};

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});

const getCardStyle = (product: Product) => {
    if (!displaySettings.useCategoryColor || !product.category) return undefined;
    const color = displaySettings.categoryColors[product.category];
    if (!color) return undefined;
    return {
        background: color,
        borderColor: 'rgba(148, 163, 184, 0.35)',
    };
};

const getCartRowStyle = (item: CartItem) => {
    if (!displaySettings.useCategoryColor || !item.category) return undefined;
    const color = displaySettings.categoryColors[item.category];
    if (!color) return undefined;
    return {
        background: color,
    };
};

const getCategoryPillStyle = (category: string, isActive: boolean) => {
    const color = displaySettings.categoryColors[category];
    if (!color || !color.startsWith('#')) return undefined;
    let hex = color.slice(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((char) => char + char)
            .join('');
    }
    if (hex.length !== 6) return undefined;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 0.7 ? 'var(--ink)' : '#ffffff';
    const alpha = isActive ? 0.28 : 0.18;
    const borderAlpha = isActive ? 0.6 : 0.4;
    return {
        '--pill-bg': `rgba(${r}, ${g}, ${b}, ${alpha})`,
        '--pill-border': `rgba(${r}, ${g}, ${b}, ${borderAlpha})`,
        '--pill-text': textColor,
    } as Record<string, string>;
};

const onDragStart = (e: DragEvent, productId: string) => {
    if (!isRearranging.value) return;
    draggedId.value = productId;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', productId);
    }
};

const onDragOver = (e: DragEvent, productId: string) => {
    if (!isRearranging.value) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (draggedId.value !== productId) dragOverId.value = productId;
};

const onDragLeave = () => {
    dragOverId.value = null;
};

const onDrop = (e: DragEvent, targetId: string) => {
    if (!isRearranging.value) return;
    e.preventDefault();
    if (!draggedId.value || draggedId.value === targetId) {
        draggedId.value = null;
        dragOverId.value = null;
        return;
    }
    const currentOrder = orderedProducts.value.map((p) => p.id);
    const fromIdx = currentOrder.indexOf(draggedId.value);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
        currentOrder.splice(fromIdx, 1);
        currentOrder.splice(toIdx, 0, draggedId.value);
        productOrder.value = currentOrder;
        saveProductOrder();
    }
    draggedId.value = null;
    dragOverId.value = null;
};

const onDragEnd = () => {
    draggedId.value = null;
    dragOverId.value = null;
};

const orderStorageKey = computed(() => {
    const storeId = storeContext.currentStoreId;
    return storeId ? `posProductOrder:${storeId}` : 'posProductOrder';
});

const saveProductOrder = () => {
    localStorage.setItem(orderStorageKey.value, JSON.stringify(productOrder.value));
};

const loadProductOrder = () => {
    const raw = localStorage.getItem(orderStorageKey.value);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) productOrder.value = parsed;
    } catch {}
};

const resetOrder = () => {
    productOrder.value = [];
    localStorage.removeItem(orderStorageKey.value);
};

const settingsStorageKey = computed(() => {
    const storeId = storeContext.currentStoreId;
    return storeId ? `posDisplaySettings:${storeId}` : 'posDisplaySettings';
});

const loadDisplaySettings = () => {
    const raw = localStorage.getItem(settingsStorageKey.value);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
        if (typeof parsed.showSku === 'boolean') displaySettings.showSku = parsed.showSku;
        if (typeof parsed.showType === 'boolean') displaySettings.showType = parsed.showType;
        if (typeof parsed.showCategory === 'boolean') displaySettings.showCategory = parsed.showCategory;
        if (typeof parsed.showPrice === 'boolean') displaySettings.showPrice = parsed.showPrice;
        if (typeof parsed.useCategoryColor === 'boolean') {
            displaySettings.useCategoryColor = parsed.useCategoryColor;
        }
        if (parsed.categoryColors && typeof parsed.categoryColors === 'object') {
            displaySettings.categoryColors = { ...parsed.categoryColors };
        }
        if (typeof parsed.groupByCategory === 'boolean') {
            displaySettings.groupByCategory = parsed.groupByCategory;
        }
    } catch (error) {
        // Ignore persisted settings errors.
    }
};

const seedCategoryColors = (categories: string[]) => {
    categories.forEach((category, index) => {
        if (!displaySettings.categoryColors[category]) {
            displaySettings.categoryColors[category] =
                categoryPalette[index % categoryPalette.length];
        }
    });
};

const finalizeTicket = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || cartItems.value.length === 0) return;
    isSubmitting.value = true;
    try {
        const taxRate = defaultTaxRate.value;
        const seniorDiscount = discountEnabled.value;

        const customDateIso =
            isOwner.value && useCustomDate.value && customSaleDate.value
                ? zonedDateTimeIso(
                      customSaleDate.value,
                      customSaleTime.value || '12:00',
                      storeTimezone.value
                  )
                : undefined;

        const payload = {
            items: cartItems.value.map((item, index) => {
                const itemTotal = lineTotal(item);
                if (seniorDiscount) {
                    // VAT-exempt: the removed VAT is recorded as part of the discount, no tax.
                    const line = seniorBreakdowns.value[index];
                    return {
                        productId: item.productId,
                        qty: item.qty,
                        unitPrice: item.unitPrice,
                        discount: roundCents(line.vatExemption + line.discount),
                        tax: 0,
                    };
                }
                const itemTax = itemTotal > 0 ? (itemTotal * taxRate) / 100 : 0;
                return {
                    productId: item.productId,
                    qty: item.qty,
                    unitPrice: item.unitPrice,
                    discount: 0,
                    tax: itemTax,
                };
            }),
            paymentMethod: paymentMethod.value,
            orderType: orderType.value,
            channel: selectedChannel.value?.key ?? null,
            ...(customDateIso ? { customDate: customDateIso } : {}),
        };
        const purchasedIds = cartItems.value.map((item) => item.productId);
        const { sale } = await finalizeSale(storeId, payload);
        recordRecentProducts(purchasedIds);
        const receiptLabel = sale.receiptNumber ? `Receipt #${sale.receiptNumber}` : 'Sale finalized';
        showToast(`${receiptLabel} logged.`, 'success');
        clearCart();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to finalize sale.';
        showToast(message, 'error');
    } finally {
        isSubmitting.value = false;
    }
};

// Switching channel re-prices what's already on the ticket.
watch(selectedChannel, (channel) => {
    const byId = new Map(products.value.map((product) => [product.id, product]));
    cartItems.value.forEach((item) => {
        const product = byId.get(item.productId);
        if (product) item.unitPrice = displayPrice(product);
    });
    if (channel?.alwaysTakeout) orderType.value = 'TAKEOUT';
});

// An empty ticket is a walk-in ticket; otherwise a ticket emptied item by item
// could be stuck on a channel with the selector hidden.
watch(
    () => cartItems.value.length,
    (count) => {
        if (count === 0) selectedChannelKey.value = null;
    }
);

// A channel turned off in settings can't stay selected.
watch(posChannels, (channels) => {
    if (selectedChannelKey.value && !channels.some((channel) => channel.key === selectedChannelKey.value)) {
        selectedChannelKey.value = null;
    }
});

const handleDisplayClickOutside = (event: MouseEvent) => {
    if (displaySettingsRef.value?.open && !displaySettingsRef.value.contains(event.target as Node)) {
        displaySettingsRef.value.open = false;
    }
};

onBeforeUnmount(() => {
    document.removeEventListener('click', handleDisplayClickOutside);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    window.removeEventListener('keydown', handleGlobalKeydown);
    if (document.fullscreenElement === posPageRef.value) {
        document.exitFullscreen().catch(() => {});
    }
});

onMounted(async () => {
    document.addEventListener('click', handleDisplayClickOutside);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleGlobalKeydown);
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    loadDisplaySettings();
    loadProductOrder();
    loadRecentProducts();
    await loadProducts();
});

watch(
    () => storeContext.currentStoreId,
    async () => {
        clearCart();
        searchQuery.value = '';
        activeCategory.value = 'ALL';
        discountEnabled.value = false;
        isRearranging.value = false;
        productOrder.value = [];
        loadDisplaySettings();
        loadProductOrder();
        loadRecentProducts();
        await loadProducts();
    }
);

watch(
    () => categoryList.value,
    (categories) => {
        seedCategoryColors(categories);
        if (activeCategory.value !== 'ALL' && activeCategory.value !== 'RECENT' && !categories.includes(activeCategory.value)) {
            activeCategory.value = 'ALL';
        }
    },
    { immediate: true }
);

watch(
    displaySettings,
    () => {
        localStorage.setItem(
            settingsStorageKey.value,
            JSON.stringify({
                showSku: displaySettings.showSku,
                showType: displaySettings.showType,
                showCategory: displaySettings.showCategory,
                showPrice: displaySettings.showPrice,
                useCategoryColor: displaySettings.useCategoryColor,
                categoryColors: displaySettings.categoryColors,
                groupByCategory: displaySettings.groupByCategory,
            })
        );
    },
    { deep: true }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.pos-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-accent-soft: rgba(13, 148, 136, 0.1);
    --c-border: #e2e8f0;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
    /* Kept for inline style compatibility (getCategoryPillStyle) */
    --ink: #0f172a;
    /* Height of the sticky TopNav (56px + 1px border) sitting above this page.
       Subtracted everywhere so the page fits the viewport exactly and no global
       page scrollbar appears alongside the panels' own scrollbars. Reset to 0
       in fullscreen, where the nav isn't rendered. */
    --nav-h: 57px;
    min-height: calc(100vh - var(--nav-h));
    padding: 0.85rem 1.25rem 1.25rem;
    background: #f8fafc;
    color: var(--c-text);
    font-family: var(--app-font-sans);
}

/* ============================================================
   SHELL
============================================================ */
.pos-shell {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: riseIn 0.35s ease-out both;
}

@keyframes riseIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   LAYOUT
============================================================ */
.pos-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 356px;
    gap: 0.85rem;
    align-items: start;
}

/* ============================================================
   PANELS
============================================================ */
.pos-panel,
.cart-panel {
    background: white;
    border-radius: 14px;
    border: 1px solid var(--c-border);
    padding: 0.85rem 1rem;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.pos-panel,
.cart-panel {
    position: sticky;
    top: calc(var(--nav-h) + 0.85rem);
    /* Cap each column to the space below the nav so neither grows past the
       screen and the page itself never scrolls. */
    max-height: calc(100vh - var(--nav-h) - 1.7rem);
}

/* Catalog: header + filters stay pinned, only the products (.catalog-scroll)
   scroll. The panel itself is clipped so the pinned parts never move. */
.pos-panel {
    overflow: hidden;
}

.pos-panel > .panel-header,
.pos-panel > .category-filters {
    flex-shrink: 0;
}

/* Ticket: the whole panel scrolls as one unit when it overflows the viewport
   (header, item list, summary and checkout all move together). When it fits,
   no scrollbar appears. */
.cart-panel {
    overflow-y: auto;
    /* Stop scroll from chaining to the page when the panel hits its end, so the
       two columns never get dragged together. */
    overscroll-behavior: contain;
}

/* Keep every section at its natural height so the panel scrolls instead of
   compressing the rows. */
.cart-panel > .panel-header,
.cart-panel > .cart-list,
.cart-panel > .cart-summary,
.cart-panel > .checkout-controls,
.cart-panel > .cart-empty {
    flex-shrink: 0;
}

.catalog-scroll {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    /* Take the leftover vertical space and scroll within it. min-height: 0 lets
       this flex child shrink below its content size so the scroll engages. */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* Stop scroll from chaining to the page when the list hits its end. */
    overscroll-behavior: contain;
    /* Breathing room so cards don't sit under the scrollbar. */
    margin-right: -0.25rem;
    padding-right: 0.25rem;
}

/* ============================================================
   PANEL HEADER
============================================================ */
.panel-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.panel-title {
    display: grid;
    gap: 0.15rem;
}

.pos-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--c-accent-soft);
    color: var(--c-accent);
    width: fit-content;
}

.panel-header h2 {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--c-text);
}

.panel-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.76rem;
}

.cart-count-label {
    color: var(--c-accent-dark);
    font-weight: 600;
}

/* ============================================================
   PANEL ACTIONS & VIEW MODE TABS
============================================================ */
.panel-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.view-mode-tabs {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    background: #f1f5f9;
    border-radius: 9px;
    border: 1px solid var(--c-border);
}

.view-mode-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    border-radius: 7px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.view-mode-tab:hover {
    color: var(--c-text);
    background: rgba(255, 255, 255, 0.6);
}

.view-mode-tab--active {
    background: white;
    color: var(--c-accent-dark);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    font-weight: 700;
}

.tab-badge {
    padding: 0.08rem 0.45rem;
    border-radius: 999px;
    background: var(--c-accent-soft);
    color: var(--c-accent-dark);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 240px;
    flex: 1;
    max-width: 380px;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    pointer-events: none;
}

.search-clear-btn {
    position: absolute;
    right: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 50%;
    transition: color 0.12s;
}

.search-clear-btn:hover {
    color: #475569;
}

.search-input {
    width: 100%;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.48rem 2rem 0.48rem 2.25rem;
    font-size: 0.85rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: white;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder {
    color: #94a3b8;
}

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.ghost-button--sm {
    padding: 0.28rem 0.65rem;
    font-size: 0.76rem;
}

/* Ghost button (Sales history link) */
.ghost-button {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.46rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.ghost-button:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

.ghost-button--icon {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

/* ============================================================
   FULLSCREEN
============================================================ */
.pos-page:fullscreen {
    /* No TopNav in fullscreen — reclaim its height. */
    --nav-h: 0px;
    overflow-y: auto;
}

.pos-page--fullscreen {
    --nav-h: 0px;
    overflow-y: auto;
}

/* ============================================================
   DISPLAY SETTINGS DROPDOWN
============================================================ */
.display-settings {
    position: relative;
}

.display-settings summary {
    list-style: none;
    cursor: pointer;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.46rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: white;
    transition: border-color 0.15s;
}

.display-settings summary::-webkit-details-marker {
    display: none;
}

.display-settings[open] summary {
    border-color: var(--c-accent);
}

.display-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    z-index: 30;
    min-width: 220px;
    padding: 0.85rem;
    border-radius: 12px;
    border: 1px solid var(--c-border);
    background: white;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 0.6rem;
}

.display-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.check-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-text);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}

.check-pill:has(input:checked) {
    background: var(--c-accent-soft);
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.check-pill input {
    width: 13px;
    height: 13px;
    accent-color: var(--c-accent);
}

.color-grid {
    display: grid;
    gap: 0.4rem;
    border-top: 1px solid var(--c-border);
    padding-top: 0.5rem;
}

.color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.color-name {
    font-size: 0.72rem;
    color: var(--c-muted);
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.color-row input[type='color'] {
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
}

.color-empty {
    font-size: 0.72rem;
    color: var(--c-muted);
}

/* ============================================================
   CATEGORY FILTERS
============================================================ */
.category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}

.category-pill {
    border-radius: 999px;
    border: 1.5px solid var(--pill-border, var(--c-border));
    background: var(--pill-bg, white);
    color: var(--pill-text, var(--c-muted));
    padding: 0.22rem 0.6rem;
    font-size: 0.7rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.12s;
}

.category-pill:hover {
    border-color: var(--c-accent);
}

.category-pill.active {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.subcategory-filters {
    align-items: center;
    margin-top: 0.35rem;
}

.subcategory-icon {
    display: inline-flex;
    color: var(--c-muted);
    margin-right: 0.1rem;
}

.subcategory-pill {
    font-weight: 500;
}

.subcategory-pill.active {
    background: var(--c-accent-soft);
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    font-weight: 600;
}

.category-pill--all {
    background: var(--c-accent-soft);
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.category-pill--all.active {
    background: var(--c-accent);
    border-color: var(--c-accent);
    color: white;
}

.category-pill--recent {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #475569;
}

.category-pill--recent:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.category-pill--recent.active {
    background: #0f172a;
    border-color: #0f172a;
    color: #ffffff;
}

.category-pill--recent .recent-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.recent-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 14px;
    height: 14px;
    padding: 0 0.25rem;
    border-radius: 999px;
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1;
    background: rgba(15, 23, 42, 0.08);
    color: inherit;
}

.category-pill--recent.active .recent-count-badge {
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
}

/* ============================================================
   PANEL STATE (empty / loading)
============================================================ */
.panel-state {
    padding: 1.25rem 1rem;
    text-align: center;
    color: var(--c-muted);
    background: #f8fafc;
    border-radius: 10px;
    font-size: 0.85rem;
    border: 1px dashed var(--c-border);
}

/* ============================================================
   CART EMPTY STATE
============================================================ */
.cart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 1.25rem 0.75rem;
    border-radius: 8px;
    border: 1.5px dashed var(--c-border);
    background: #f8fafc;
    color: var(--c-muted);
    font-size: 0.8rem;
    text-align: center;
}

/* ============================================================
   PRODUCT GRID & CARDS
============================================================ */
.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
}

.product-card {
    position: relative;
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.5rem 0.6rem;
    text-align: left;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 0.22rem;
    overflow: hidden;
    min-height: 48px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    cursor: pointer;
}

.product-card--in-cart {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.03);
}

.product-card--in-cart .product-card-top,
.product-card--in-cart h3 {
    padding-right: 1.35rem;
}

.product-card--in-cart .product-card-top + h3 {
    padding-right: 0;
}

.in-cart-badge {
    position: absolute;
    top: 0.32rem;
    right: 0.32rem;
    background: var(--c-accent);
    color: white;
    border-radius: 999px;
    font-size: 0.58rem;
    font-weight: 700;
    padding: 0.08rem 0.32rem;
    line-height: 1.35;
    letter-spacing: 0.02em;
    pointer-events: none;
}

.product-card:hover {
    border-color: var(--c-accent);
    box-shadow: 0 3px 12px rgba(13, 148, 136, 0.12);
    transform: translateY(-1px);
}

.product-card:active {
    transform: scale(0.98);
    box-shadow: none;
}

.product-card-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-height: 15px;
    overflow: hidden;
}

.product-pill {
    font-size: 0.56rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-accent);
    background: var(--c-accent-soft);
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    flex-shrink: 0;
}

.product-tag {
    font-size: 0.56rem;
    font-weight: 600;
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    flex-shrink: 0;
}

.product-card h3 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-text);
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
}

.product-sub {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.65rem;
    line-height: 1.2;
}

.product-price-row {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    margin-top: auto;
    padding-top: 0.15rem;
}

.product-price {
    font-weight: 700;
    font-size: 0.86rem;
    color: var(--c-text);
}

.product-unit {
    font-size: 0.64rem;
    color: var(--c-muted);
}

/* ============================================================
   CART LIST
============================================================ */
.cart-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    /* Natural height — the whole .cart-panel scrolls, not this list on its own. */
    flex: 0 0 auto;
}

.cart-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.35rem 0.45rem;
    border-radius: 7px;
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.cart-row:last-child {
    border-bottom: none;
}

.cart-row:hover {
    background: #f8fafc;
}

.cart-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    min-width: 0;
}

.cart-item-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
}

.cart-row-bottom {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.cart-item-price {
    font-size: 0.74rem;
    color: var(--c-muted);
    white-space: nowrap;
}

.cart-item-times {
    font-size: 0.68rem;
    color: var(--c-muted);
}

.cart-qty-stepper {
    display: flex;
    align-items: center;
    gap: 0.15rem;
}

.qty-btn {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    border: 1px solid var(--c-border);
    background: white;
    font-weight: 700;
    font-size: 0.72rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--c-text);
    transition: border-color 0.12s, background 0.12s, color 0.12s;
}

.qty-btn:hover {
    border-color: var(--c-accent);
    background: var(--c-accent-soft);
    color: var(--c-accent-dark);
}

.qty-input {
    width: 26px;
    height: 20px;
    border: 1px solid var(--c-border);
    border-radius: 5px;
    padding: 0;
    text-align: center;
    font-size: 0.74rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    background: white;
    color: var(--c-text);
}

.qty-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

.cart-item-total {
    margin-left: auto;
    font-size: 0.82rem;
    font-weight: 700;
    white-space: nowrap;
    color: var(--c-text);
}

.remove-btn {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.75;
    transition: background 0.12s, opacity 0.12s;
}

.remove-btn:hover {
    background: #fecaca;
    opacity: 1;
}

/* ============================================================
   CART SUMMARY
============================================================ */
.cart-summary {
    border-top: 1px solid var(--c-border);
    padding-top: 0.5rem;
    display: grid;
    gap: 0.28rem;
}

.cart-summary .summary-row:first-child {
    color: var(--c-muted);
    font-size: 0.8rem;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--c-muted);
}

.summary-row.net {
    font-weight: 600;
    color: var(--c-accent-dark);
}

.summary-row.total {
    font-size: 0.98rem;
    font-weight: 800;
    color: var(--c-text);
    padding-top: 0.35rem;
    margin-top: 0.05rem;
    border-top: 1px solid var(--c-border);
}

.discount-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--c-muted);
}

.discount-toggle input {
    width: 13px;
    height: 13px;
    cursor: pointer;
    accent-color: var(--c-accent);
}

.text-muted {
    color: var(--c-muted);
    opacity: 0.5;
}

/* ============================================================
   CHECKOUT CONTROLS
============================================================ */
.checkout-controls {
    display: grid;
    gap: 0.35rem;
    padding-top: 0.15rem;
}

.order-type-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    padding: 0.18rem;
    background: var(--c-border);
    border-radius: 8px;
}

.order-type-option {
    border: none;
    border-radius: 6px;
    padding: 0.32rem 0.45rem;
    background: transparent;
    color: var(--c-text);
    font-size: 0.78rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.order-type-option--active {
    background: white;
    color: var(--c-accent);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.order-type-option:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.channel-toggle {
    margin-bottom: 0.4rem;
}

/* Channel tickets get a distinct colour so a cashier notices the higher prices. */
.channel-option--active {
    background: #16a34a;
    color: white;
}

.select-field {
    display: grid;
    gap: 0.2rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-text);
}

.select-field select {
    border: 1px solid var(--c-border);
    border-radius: 7px;
    padding: 0.38rem 0.65rem;
    background: white;
    font-size: 0.8rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    transition: border-color 0.15s;
}

.select-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

.pos-date-panel {
    background: #f8fafc;
    border: 1px dashed var(--c-border);
    border-radius: 8px;
    padding: 0.35rem 0.5rem;
    display: grid;
    gap: 0.3rem;
}

.pos-date-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.pos-date-checkbox {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.73rem;
    font-weight: 600;
    color: var(--c-text);
    cursor: pointer;
    user-select: none;
}

.pos-date-checkbox input[type="checkbox"] {
    accent-color: var(--c-accent);
    cursor: pointer;
}

.pos-date-now-btn {
    border: 1px solid var(--c-border);
    background: white;
    color: var(--c-text);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
}

.pos-date-now-btn:hover {
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.pos-date-inputs {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.3rem;
}

.pos-date-input,
.pos-time-input {
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.28rem 0.45rem;
    background: white;
    font-size: 0.74rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
}

.pos-date-input:focus,
.pos-time-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.12);
}

/* Finalize sale — primary action */
.primary-button {
    border: none;
    border-radius: 7px;
    padding: 0.55rem 0.9rem;
    font-size: 0.88rem;
    font-weight: 700;
    font-family: var(--app-font-sans);
    background: var(--c-accent);
    color: white;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
}

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
}

.primary-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

/* Clear ticket — secondary action */
.secondary-button {
    border: 1px solid var(--c-border);
    border-radius: 7px;
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    width: 100%;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.secondary-button:hover:not(:disabled) {
    border-color: #f87171;
    color: #b91c1c;
    background: #fef2f2;
}

.secondary-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ============================================================
   REARRANGE
============================================================ */
.rearrange-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.45rem 0.75rem;
    background: rgba(13, 148, 136, 0.07);
    border: 1px solid rgba(13, 148, 136, 0.25);
    border-radius: 8px;
    font-size: 0.76rem;
    color: var(--c-accent-dark);
    font-weight: 500;
}

.rearrange-banner-actions {
    display: flex;
    gap: 0.4rem;
}

.ghost-button--sm {
    padding: 0.28rem 0.7rem;
    font-size: 0.75rem;
}

.ghost-button--active {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

.ghost-button--accent {
    border-color: var(--c-accent);
    color: white;
    background: var(--c-accent);
}

.ghost-button--accent:hover {
    background: var(--c-accent-dark);
    border-color: var(--c-accent-dark);
    color: white;
}

.product-card--rearrange {
    cursor: grab;
    user-select: none;
}

.product-card--rearrange:hover {
    border-color: var(--c-accent);
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.12);
    transform: none;
}

.product-card--dragging {
    opacity: 0.35;
    cursor: grabbing;
}

.product-card--drag-over {
    border-color: var(--c-accent) !important;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2) !important;
    transform: scale(1.03);
}

/* ============================================================
   GROUPED VIEW
============================================================ */
.product-sections {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.category-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.category-section-title {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--c-muted);
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--c-border);
}

/* ============================================================
   TABLE LIST VIEW (Optimized for 2,000+ items)
============================================================ */
.pos-table-view {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
}

.pos-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.15rem 0.25rem;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.table-toolbar-left,
.table-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.table-count-text strong {
    color: var(--c-text);
    font-weight: 700;
}

.table-filter-note {
    font-size: 0.78rem;
    color: #94a3b8;
    margin-left: 0.25rem;
}

.table-page-size-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--c-muted);
}

.table-page-size-select {
    padding: 0.22rem 0.5rem;
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
    background: white;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
}

.table-page-size-select:focus {
    border-color: var(--c-accent);
}

.table-keyboard-guide {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.73rem;
    font-weight: 500;
    color: var(--c-muted);
    background: #f8fafc;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    border: 1px solid var(--c-border);
    animation: fadeIn 0.15s ease;
}

.table-keyboard-guide--active {
    background: #f0fdfa;
    border-color: rgba(13, 148, 136, 0.35);
    color: var(--c-accent-dark);
}

.kbd-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 17px;
    height: 17px;
    padding: 0 0.25rem;
    font-family: inherit;
    font-size: 0.66rem;
    font-weight: 700;
    line-height: 1;
    color: var(--c-text);
    background: white;
    border: 1px solid #cbd5e1;
    border-bottom: 2px solid #94a3b8;
    border-radius: 3px;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.pos-table-container {
    border: 1px solid var(--c-border);
    border-radius: 12px;
    background: white;
    overflow-x: auto;
    overflow-y: auto;
    /* Allows internal scrolling when product count is high */
    max-height: calc(100vh - 280px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.pos-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.84rem;
    text-align: left;
}

.pos-table thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8fafc;
    border-bottom: 1.5px solid var(--c-border);
    padding: 0.7rem 0.85rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
    white-space: nowrap;
    user-select: none;
}

.th-sortable {
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.th-sortable:hover {
    background: #f1f5f9;
    color: var(--c-text);
}

.th-content {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
}

.th-content.align-right {
    display: flex;
    justify-content: flex-end;
}

.th-sort-icon--active {
    color: var(--c-accent);
}

.pos-table-row {
    border-bottom: 1px solid var(--c-border);
    cursor: pointer;
    transition: background 0.12s, box-shadow 0.12s;
    outline: none;
}

.pos-table-row:hover {
    background: #f8fafc;
}

.pos-table-row--in-cart {
    background: rgba(13, 148, 136, 0.04);
}

.pos-table-row--in-cart:hover {
    background: rgba(13, 148, 136, 0.08);
}

.pos-table-row:focus-visible,
.pos-table-row--selected {
    background: #f0fdfa !important;
    box-shadow: inset 3px 0 0 var(--c-accent), 0 0 0 1.5px rgba(13, 148, 136, 0.4);
}

.pos-table-row--selected .td-product-title {
    color: var(--c-accent-dark);
}

.td-selected-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: var(--c-accent);
    color: white;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
    animation: popIn 0.15s ease-out;
}

@keyframes popIn {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.pos-table tbody td {
    padding: 0.65rem 0.85rem;
    vertical-align: middle;
    border-bottom: 1px solid #f1f5f9;
}

.pos-table-row:last-child td {
    border-bottom: none;
}

/* Table cells */
.td-product-cell {
    display: flex;
    align-items: center;
    gap: 0.65rem;
}

.td-cat-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}

.td-product-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.td-product-title {
    font-weight: 600;
    color: var(--c-text);
    line-height: 1.25;
    word-break: break-word;
    overflow-wrap: break-word;
}

.td-product-sub {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
}

.td-type-badge {
    display: inline-block;
    padding: 0.06rem 0.4rem;
    border-radius: 999px;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 0.66rem;
    font-weight: 600;
}

.td-unit-badge {
    display: inline-block;
    padding: 0.06rem 0.35rem;
    border-radius: 4px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.68rem;
    font-weight: 500;
}

.td-sku-hint {
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.td-sku {
    white-space: nowrap;
}

.td-sku-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.76rem;
    padding: 0.15rem 0.45rem;
    border-radius: 5px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: var(--c-text);
    font-weight: 500;
}

.td-empty-dash {
    color: #cbd5e1;
    font-size: 0.85rem;
}

.td-category {
    white-space: nowrap;
}

.td-category-tag {
    display: inline-block;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    border: 1px solid var(--pill-border, var(--c-border));
    background: var(--pill-bg, #f8fafc);
    color: var(--pill-text, var(--c-text));
}

.td-price {
    white-space: nowrap;
}

.td-price-amount {
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    font-size: 0.88rem;
}

.td-action {
    white-space: nowrap;
}

.align-right {
    text-align: right;
}

/* Stepper inside table row */
.table-qty-stepper {
    display: inline-flex;
    align-items: center;
    background: var(--c-accent-soft);
    border: 1.5px solid var(--c-accent);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(13, 148, 136, 0.12);
}

.table-qty-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    color: var(--c-accent-dark);
    cursor: pointer;
    transition: background 0.1s;
}

.table-qty-btn:hover {
    background: rgba(13, 148, 136, 0.2);
}

.table-qty-value {
    min-width: 24px;
    text-align: center;
    font-weight: 700;
    font-size: 0.82rem;
    color: var(--c-accent-dark);
    font-variant-numeric: tabular-nums;
}

.table-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.28rem 0.65rem;
    border-radius: 7px;
    border: 1.5px solid var(--c-border);
    background: white;
    color: var(--c-text);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
}

.table-add-btn:hover {
    border-color: var(--c-accent);
    background: var(--c-accent-soft);
    color: var(--c-accent-dark);
}

/* Category section header row in table view */
.pos-table-category-row td {
    background: #f8fafc;
    padding: 0.45rem 0.85rem !important;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
}

.pos-table-category-label {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
}

/* Empty search state */
.pos-table-empty {
    text-align: center;
    padding: 3rem 1.5rem !important;
    color: var(--c-muted);
}

.pos-table-empty .empty-icon {
    color: #cbd5e1;
    margin-bottom: 0.5rem;
}

.pos-table-empty p {
    margin: 0 0 0.75rem 0;
    font-size: 0.88rem;
}

/* Pagination */
.pos-table-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.4rem 0.25rem 0.2rem 0.25rem;
}

.table-pagination-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

.page-nav-btn,
.page-num-btn {
    min-width: 28px;
    height: 28px;
    padding: 0 0.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: white;
    color: var(--c-text);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
}

.page-nav-btn:hover:not(:disabled),
.page-num-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
}

.page-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.page-num-btn--active {
    background: var(--c-accent) !important;
    border-color: var(--c-accent) !important;
    color: white !important;
    font-weight: 700;
}

.page-num-btn--ellipsis {
    border: none;
    background: transparent;
    cursor: default;
    color: #94a3b8;
}

.page-numbers {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

.page-indicator-text {
    font-size: 0.78rem;
    color: var(--c-muted);
    font-weight: 500;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .pos-content {
        grid-template-columns: 1fr;
    }

    .pos-panel,
    .cart-panel {
        position: static;
        /* Stacked layout: let the whole page scroll instead of trapping each
           panel's body in its own scroll region. */
        max-height: none;
        overflow: visible;
    }

    .catalog-scroll,
    .cart-list {
        overflow-y: visible;
        flex: none;
        min-height: 0;
        margin-right: 0;
        padding-right: 0;
    }
}

@media (max-width: 720px) {
    .pos-page {
        padding: 0.75rem;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }

    .panel-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .panel-actions {
        width: 100%;
    }

    .search-input {
        flex: 1;
        min-width: 0;
    }
}
</style>