<template>
    <section class="movements-page">
        <PullToRefresh :on-refresh="loadMovements" :disabled="isLoading" />

        <div class="movements-shell">
            <header class="detail-header">
                <button type="button" class="back-link" @click="goToInventory">
                    <mdicon name="arrow-left" size="15" />
                    Inventory
                </button>
                <div class="detail-header-row">
                    <div class="detail-title">
                        <h1>Movement history</h1>
                        <p>Every stock change for {{ currentStoreLabel }}, with audit context.</p>
                    </div>
                    <div class="header-actions">
                        <button
                            class="ghost-button"
                            :disabled="isExporting || !canExport || !storeContext.currentStoreId"
                            @click="exportMovements"
                        >
                            <mdicon name="download-outline" size="16" />
                            {{ isExporting ? 'Exporting…' : 'Export CSV' }}
                        </button>
                        <button class="primary-button" :disabled="!canAdjust" @click="goToAdjustments">
                            <mdicon name="plus" size="16" />
                            New adjustment
                        </button>
                    </div>
                </div>
            </header>

            <div v-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to view movement history.
            </div>

            <section v-else class="movements-panel">
                <div class="panel-toolbar">
                    <div class="search-wrap">
                        <mdicon name="magnify" size="17" class="search-icon" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            class="search-input"
                            placeholder="Search item, note, or staff…"
                        />
                    </div>
                    <select v-model="filterMovementType" class="type-select" aria-label="Movement type">
                        <option value="ALL">All movements</option>
                        <option value="SALE">Sales</option>
                        <option value="STOCK_ADJUSTMENT">Adjustments</option>
                        <option value="PURCHASE_RECEIPT">Purchases</option>
                        <option value="VOID">Voids</option>
                        <option value="REFUND">Refunds</option>
                        <option value="WASTE">Waste</option>
                        <option value="TRANSFER_IN">Transfers in</option>
                        <option value="TRANSFER_OUT">Transfers out</option>
                    </select>
                    <div class="date-filter">
                        <button type="button" class="date-filter__btn" @click="showDateModal = true">
                            <mdicon name="calendar-outline" size="16" />
                            <span>{{ dateFilterLabel }}</span>
                            <mdicon name="chevron-down" size="14" />
                        </button>
                        <button
                            v-if="fromDate || toDate"
                            type="button"
                            class="date-filter__clear"
                            @click="clearDateFilter"
                            title="Clear date filter"
                        >
                            <mdicon name="close" size="14" />
                        </button>
                    </div>
                </div>

                <SkeletonLoader v-if="isLoading" :rows="8" label="Loading movements…" />
                <template v-else>
                    <div class="table-wrap">
                        <table class="movements-table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Item</th>
                                    <th>Movement</th>
                                    <th class="num">Qty change</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="movement in filteredMovements" :key="movement.id">
                                    <td class="col-when">
                                        <div class="date-cell">{{ formatDate(movement.createdAt) }}</div>
                                        <div class="item-meta" v-if="movement.createdBy?.fullName">
                                            {{ movement.createdBy.fullName }}
                                        </div>
                                    </td>
                                    <td class="col-item">
                                        <div class="item-name">{{ movement.itemName }}</div>
                                        <div class="item-meta">
                                            <span>{{ movement.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                            <span v-if="movement.itemSku">SKU {{ movement.itemSku }}</span>
                                            <span v-if="movement.itemCategory">{{ movement.itemCategory }}</span>
                                        </div>
                                        <div v-if="movement.note" class="item-note">{{ movement.note }}</div>
                                    </td>
                                    <td class="col-type">
                                        <span :class="['movement-pill', movementPillClass(movement.type)]">
                                            {{ formatMovementType(movement.type) }}
                                        </span>
                                    </td>
                                    <td class="col-qty num" :class="movement.qtyDelta >= 0 ? 'positive' : 'negative'">
                                        {{ movement.qtyDelta >= 0 ? '+' : '' }}{{ formatQty(movement.qtyDelta) }}
                                        <span v-if="movement.itemUnit" class="qty-unit">{{ movement.itemUnit }}</span>
                                    </td>
                                    <td class="col-ref">
                                        <RouterLink
                                            v-if="getReferenceRoute(movement)"
                                            class="reference-link"
                                            :to="getReferenceRoute(movement)!"
                                        >
                                            {{ getReferenceLabel(movement) }}
                                            <mdicon name="chevron-right" size="13" />
                                        </RouterLink>
                                        <span v-else class="cell-empty">—</span>
                                    </td>
                                </tr>
                                <tr v-if="filteredMovements.length === 0">
                                    <td colspan="5" class="empty-cell">
                                        <div class="empty-state">
                                            <mdicon name="swap-horizontal" size="32" class="empty-icon" />
                                            <p class="empty-heading">No movements found</p>
                                            <p class="empty-sub">{{ hasActiveFilters ? 'Try adjusting your filters or date range.' : 'Stock changes appear here as you sell, receive, and adjust inventory.' }}</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination">
                        <div class="pagination-info">
                            <span>{{ total }} record{{ total !== 1 ? 's' : '' }}</span>
                            <label class="pagination-size">
                                <span>Show</span>
                                <select v-model.number="pageSize">
                                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                                </select>
                            </label>
                        </div>
                        <div v-if="totalPages > 1" class="pagination-controls">
                            <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)" aria-label="Previous page">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
                            <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)" aria-label="Next page">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </div>
                </template>
            </section>
        </div>

        <Teleport to="body">
            <Transition name="modal-fade">
                <div v-if="showDateModal" class="modal-backdrop" @click.self="showDateModal = false">
                    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Filter by date">
                        <div class="modal-header">
                            <div>
                                <h2>Filter by date</h2>
                            </div>
                            <button class="modal-close" @click="showDateModal = false" aria-label="Close">
                                <mdicon name="close" size="20" />
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="date-options">
                                <button type="button" class="date-option" @click="setDatePreset('today')">
                                    <mdicon name="calendar-today" size="18" />
                                    <span>Today</span>
                                </button>
                                <button type="button" class="date-option" @click="setDatePreset('week')">
                                    <mdicon name="calendar-week" size="18" />
                                    <span>This week</span>
                                </button>
                                <button type="button" class="date-option" @click="setDatePreset('month')">
                                    <mdicon name="calendar-month" size="18" />
                                    <span>This month</span>
                                </button>
                                <button
                                    type="button"
                                    class="date-option"
                                    :class="{ 'date-option--active': showCustomDate }"
                                    @click="showCustomDate = !showCustomDate"
                                >
                                    <mdicon name="calendar-range" size="18" />
                                    <span>Custom range</span>
                                </button>
                            </div>
                            <div v-if="showCustomDate" class="date-custom">
                                <label class="date-field">
                                    <span>From</span>
                                    <input v-model="customFromDate" type="date" />
                                </label>
                                <label class="date-field">
                                    <span>To</span>
                                    <input v-model="customToDate" type="date" />
                                </label>
                                <button type="button" class="primary-button primary-button--sm" @click="applyCustomDateRange">
                                    Apply range
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useRoute, useRouter } from 'vue-router';
import { listMovements, MovementRecord } from '@/api/inventory';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';
import { zonedDayStartIso, zonedDayEndIso } from '@/utils/datetime';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const movements = ref<MovementRecord[]>([]);
const isLoading = ref(false);
const isExporting = ref(false);
const searchQuery = ref('');
const filterMovementType = ref<'ALL' | string>('ALL');
const fromDate = ref('');
const toDate = ref('');
const page = ref(1);
const pageSize = ref(20);
const pageSizeOptions = [10, 20, 50];
const total = ref(0);

// Date modal
const showDateModal = ref(false);
const showCustomDate = ref(false);
const customFromDate = ref('');
const customToDate = ref('');

const formatDateInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const dateFilterLabel = computed(() => {
    if (!fromDate.value && !toDate.value) return 'All time';
    if (fromDate.value === toDate.value) {
        const today = formatDateInput(new Date());
        if (fromDate.value === today) return 'Today';
        const [year, month, day] = fromDate.value.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    }
    const formatShort = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    };
    return `${formatShort(fromDate.value)} – ${formatShort(toDate.value)}`;
});

const setDatePreset = async (preset: 'today' | 'week' | 'month') => {
    const today = new Date();
    if (preset === 'today') {
        fromDate.value = formatDateInput(today);
        toDate.value = formatDateInput(today);
    } else if (preset === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        fromDate.value = formatDateInput(startOfWeek);
        toDate.value = formatDateInput(today);
    } else if (preset === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate.value = formatDateInput(startOfMonth);
        toDate.value = formatDateInput(today);
    }
    showDateModal.value = false;
    showCustomDate.value = false;
    page.value = 1;
    await loadMovements();
};

const applyCustomDateRange = async () => {
    if (customFromDate.value && customToDate.value) {
        if (customFromDate.value > customToDate.value) {
            const temp = customFromDate.value;
            customFromDate.value = customToDate.value;
            customToDate.value = temp;
        }
        fromDate.value = customFromDate.value;
        toDate.value = customToDate.value;
    }
    showDateModal.value = false;
    showCustomDate.value = false;
    page.value = 1;
    await loadMovements();
};

const clearDateFilter = async () => {
    fromDate.value = '';
    toDate.value = '';
    page.value = 1;
    await loadMovements();
};

// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const planKnown = computed(() => ownerPlanTier.value !== null);
const canExport = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'importExport'));

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const canAdjust = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value.trim() || filterMovementType.value !== 'ALL' || fromDate.value || toDate.value)
);

const loadMovements = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        movements.value = [];
        total.value = 0;
        return;
    }
    isLoading.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const data = await listMovements(storeId, {
            type: filterMovementType.value === 'ALL' ? undefined : filterMovementType.value,
            from: fromValue,
            to: toValue,
            page: page.value,
            pageSize: pageSize.value,
        });
        movements.value = data.movements;
        total.value = data.total;
    } finally {
        isLoading.value = false;
    }
};

const filteredMovements = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return movements.value;
    return movements.value.filter((movement) => {
        return (
            movement.itemName.toLowerCase().includes(query) ||
            (movement.note || '').toLowerCase().includes(query) ||
            (movement.itemSku || '').toLowerCase().includes(query) ||
            (movement.createdBy?.fullName || '').toLowerCase().includes(query) ||
            (movement.createdBy?.email || '').toLowerCase().includes(query)
        );
    });
});

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const changePage = async (nextPage: number) => {
    page.value = nextPage;
    await loadMovements();
};

const goToInventory = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory`);
};

const goToAdjustments = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/inventory/adjustments`);
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });
};

const getReferenceLabel = (movement: MovementRecord) => {
    if (movement.referenceType === 'SALE') return 'Sale';
    if (movement.referenceType === 'SALE_VOID') return 'Sale void';
    if (movement.referenceType === 'PURCHASE_RECEIPT') return 'PO receipt';
    return 'Reference';
};

const getReferenceRoute = (movement: MovementRecord) => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !movement.referenceType || !movement.referenceId) return null;
    if (movement.referenceType === 'SALE' || movement.referenceType === 'SALE_VOID') {
        return {
            name: 'sales',
            params: { storeId },
            query: { saleId: movement.referenceId },
        };
    }
    if (movement.referenceType === 'PURCHASE_RECEIPT') {
        return {
            name: 'purchase-receipt-detail',
            params: { storeId, receiptId: movement.referenceId },
        };
    }
    return null;
};

const escapeCsvValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
    const content = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const exportMovements = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    if (isExporting.value) return;
    if (!canExport.value) {
        openPlanUpgradeModal('importExport');
        return;
    }
    isExporting.value = true;
    try {
        const timeZone = storeContext.currentStore?.timezone || 'Asia/Manila';
        const fromValue = fromDate.value ? zonedDayStartIso(fromDate.value, timeZone) : undefined;
        const toValue = toDate.value ? zonedDayEndIso(toDate.value, timeZone) : undefined;
        const allMovements: MovementRecord[] = [];
        const exportPageSize = 100;
        let exportPage = 1;
        let totalCount = 0;
        do {
            const data = await listMovements(storeId, {
                type: filterMovementType.value === 'ALL' ? undefined : filterMovementType.value,
                from: fromValue,
                to: toValue,
                page: exportPage,
                pageSize: exportPageSize,
            });
            allMovements.push(...data.movements);
            totalCount = data.total;
            exportPage += 1;
        } while (allMovements.length < totalCount);

        const query = searchQuery.value.trim().toLowerCase();
        const filtered = query
            ? allMovements.filter((movement) => {
                  return (
                      movement.itemName.toLowerCase().includes(query) ||
                      (movement.note || '').toLowerCase().includes(query) ||
                      (movement.itemSku || '').toLowerCase().includes(query) ||
                      (movement.createdBy?.fullName || '').toLowerCase().includes(query) ||
                      (movement.createdBy?.email || '').toLowerCase().includes(query)
                  );
              })
            : allMovements;

        if (filtered.length === 0) {
            showToast('No movements to export for the selected filters.', 'info');
            return;
        }

        const rows: Array<Array<string | number | null | undefined>> = [
            [
                'Created At',
                'Item',
                'Item Type',
                'Movement Type',
                'Qty Delta',
                'Unit',
                'SKU',
                'Category',
                'Unit Cost',
                'Note',
                'Actor',
                'Actor Email',
                'Reference Type',
                'Reference ID',
            ],
        ];

        filtered.forEach((movement) => {
            rows.push([
                movement.createdAt,
                movement.itemName,
                movement.itemType,
                movement.type,
                movement.qtyDelta,
                movement.itemUnit,
                movement.itemSku,
                movement.itemCategory,
                movement.unitCost ?? '',
                movement.note ?? '',
                movement.createdBy?.fullName || movement.createdBy?.email || 'System',
                movement.createdBy?.email || '',
                movement.referenceType ?? '',
                movement.referenceId ?? '',
            ]);
        });

        const storeName = storeContext.currentStore?.name?.replace(/\s+/g, '-') || 'store';
        const dateStamp = new Date().toISOString().slice(0, 10);
        downloadCsv(`inventory-movements-${storeName}-${dateStamp}.csv`, rows);
        showToast('Inventory movements exported.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to export movements.';
        showToast(message, 'error');
    } finally {
        isExporting.value = false;
    }
};

const MOVEMENT_LABELS: Record<string, string> = {
    SALE: 'Sale',
    STOCK_ADJUSTMENT: 'Adjustment',
    PURCHASE_RECEIPT: 'Purchase',
    VOID: 'Void',
    REFUND: 'Refund',
    WASTE: 'Waste',
    TRANSFER_IN: 'Transfer in',
    TRANSFER_OUT: 'Transfer out',
};

const formatMovementType = (type: string) => MOVEMENT_LABELS[type] ?? type.replace(/_/g, ' ');

const MOVEMENT_PILL_CLASSES: Record<string, string> = {
    SALE: 'movement-pill--sale',
    STOCK_ADJUSTMENT: 'movement-pill--adjustment',
    PURCHASE_RECEIPT: 'movement-pill--purchase',
    VOID: 'movement-pill--void',
    REFUND: 'movement-pill--void',
    WASTE: 'movement-pill--waste',
    TRANSFER_IN: 'movement-pill--transfer',
    TRANSFER_OUT: 'movement-pill--transfer',
};

const movementPillClass = (type: string) => MOVEMENT_PILL_CLASSES[type] ?? 'movement-pill--default';

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    await loadMovements();
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
    () => filterMovementType.value,
    async () => {
        page.value = 1;
        await loadMovements();
    }
);

watch(
    () => pageSize.value,
    async () => {
        page.value = 1;
        await loadMovements();
    }
);

watch(
    () => storeContext.currentStoreId,
    async () => {
        filterMovementType.value = 'ALL';
        fromDate.value = '';
        toDate.value = '';
        await loadMovements();
    }
);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.movements-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f6f8f9;
    min-height: 100vh;
    padding: 2rem 1.5rem 3rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ============================================================
   SHELL & HEADER
============================================================ */
.movements-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.detail-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: none;
    background: none;
    padding: 0;
    margin-bottom: 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-muted);
    cursor: pointer;
    transition: color 0.15s;
    align-self: flex-start;
}

.back-link:hover { color: var(--c-accent-dark); }

.detail-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

.detail-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.detail-title p {
    color: var(--c-muted);
    max-width: 480px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

.header-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
}

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.movements-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.5rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
}

.panel-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
}

.search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
}

.search-icon {
    position: absolute;
    left: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
}

.search-input {
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    padding: 0.55rem 0.9rem 0.55rem 2.3rem;
    width: 100%;
    box-sizing: border-box;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.type-select {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 160px;
}

.type-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.date-filter {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.date-filter__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.9rem;
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.date-filter__btn:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.date-filter__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    border: none;
    background: #f1f5f9;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.date-filter__clear:hover { background: #e2e8f0; color: var(--c-text); }

.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap { overflow-x: auto; min-width: 0; }

.movements-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.movements-table thead th {
    padding: 0.6rem 0.9rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
    border-bottom: 1.5px solid var(--c-border);
    white-space: nowrap;
}

.movements-table thead th.num { text-align: right; }

.movements-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.movements-table tbody tr:last-child { border-bottom: none; }
.movements-table tbody tr:hover { background: #f8fafc; }

.movements-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: top;
}

.date-cell {
    font-size: 0.82rem;
    color: var(--c-text);
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.item-name {
    font-weight: 600;
    color: var(--c-text);
}

.item-meta {
    font-size: 0.75rem;
    color: var(--c-muted);
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.1rem;
}

.item-meta span + span::before {
    content: '·';
    margin-right: 0.35rem;
    color: #cbd5e1;
}

.item-note {
    font-size: 0.75rem;
    color: var(--c-muted);
    font-style: italic;
    margin-top: 0.2rem;
    max-width: 320px;
}

.movement-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
}

.movement-pill--sale { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.movement-pill--adjustment { background: rgba(99, 102, 241, 0.1); color: #4338ca; }
.movement-pill--purchase { background: rgba(37, 99, 235, 0.1); color: #1d4ed8; }
.movement-pill--void { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }
.movement-pill--waste { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.movement-pill--transfer { background: rgba(14, 165, 233, 0.1); color: #0369a1; }
.movement-pill--default { background: #f1f5f9; color: var(--c-muted); }

.col-qty {
    text-align: right;
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.col-qty.positive { color: #059669; }
.col-qty.negative { color: #dc2626; }

.qty-unit {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    margin-left: 0.2rem;
}

.reference-link {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    text-decoration: none;
}

.reference-link:hover { text-decoration: underline; }

.cell-empty { color: #cbd5e1; }

.empty-cell { padding: 0; }

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 2.5rem 1rem;
    text-align: center;
}

.empty-icon { color: #cbd5e1; margin-bottom: 0.35rem; }

.empty-heading {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.empty-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ============================================================
   PAGINATION
============================================================ */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--c-border);
    font-size: 0.85rem;
    color: var(--c-muted);
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.82rem;
}

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-size select {
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.pagination-size select:focus {
    outline: none;
    border-color: var(--c-accent);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.page-indicator {
    font-size: 0.82rem;
    min-width: 50px;
    text-align: center;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
    border-radius: 9px;
    border: none;
    background: var(--c-accent);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35); }
.primary-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.primary-button--sm {
    padding: 0.5rem 0.9rem;
    font-size: 0.82rem;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.58rem 1rem;
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.ghost-button:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.ghost-button:disabled { opacity: 0.4; cursor: not-allowed; }

/* ============================================================
   DATE MODAL
============================================================ */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
}

.modal-box {
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.5rem 1.75rem 0;
}

.modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: var(--c-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}

.modal-close:hover { background: #e2e8f0; color: var(--c-text); }

.modal-body {
    padding: 1.25rem 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.date-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
}

.date-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    border-radius: 10px;
    border: 1.5px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
}

.date-option:hover,
.date-option--active {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
    background: rgba(13, 148, 136, 0.05);
}

.date-custom {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
}

.date-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.date-field input {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.5rem 0.7rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.date-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.date-custom .primary-button--sm { align-self: flex-end; }

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }

.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 768px) {
    .panel-toolbar { flex-direction: column; align-items: stretch; }
    .search-wrap { min-width: 0; }
    .type-select { min-width: 0; width: 100%; }
    .date-filter { width: 100%; }
    .date-filter__btn { flex: 1; justify-content: center; }
}

@media (max-width: 640px) {
    .movements-page { padding: 1rem 0.875rem 2.5rem; }
    .movements-shell { gap: 1rem; }
    .detail-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .ghost-button,
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .movements-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .movements-table thead { display: none; }
    .movements-table,
    .movements-table tbody { display: block; }

    .movements-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.2rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .movements-table tbody tr:last-child { border-bottom: none; }

    .movements-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    .movements-table tbody td.col-item { grid-column: 1; grid-row: 1; }
    .movements-table tbody td.col-type {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }
    .movements-table tbody td.col-qty {
        grid-column: 2;
        grid-row: 2;
        padding-top: 0.35rem;
    }
    .movements-table tbody td.col-when {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.35rem;
    }
    .movements-table tbody td.col-when .date-cell { font-size: 0.75rem; font-weight: 500; color: var(--c-muted); }
    .movements-table tbody td.col-ref {
        grid-column: 1 / -1;
        grid-row: 3;
        padding-top: 0.2rem;
    }
    .movements-table tbody td.col-ref .cell-empty { display: none; }

    .movements-table tbody td.empty-cell { grid-column: 1 / -1; }
}
</style>
