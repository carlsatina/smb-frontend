<template>
    <section class="movements-page">
        <div class="movements-shell">
            <header class="movements-header">
                <div class="movements-title">
                    <span class="movements-eyebrow">Inventory</span>
                    <h1>Movement history</h1>
                    <p>Track every stock change for {{ currentStoreLabel }} with filters and audit context.</p>
                </div>
                <div class="movements-actions">
                    <button class="ghost-button" @click="goToInventory">Back to inventory</button>
                    <button class="primary-button" :disabled="!canAdjust" @click="goToAdjustments">
                        New adjustment
                    </button>
                </div>
            </header>

            <div class="movements-content">
                <section class="movements-panel">
                    <div class="toolbar-row">
                        <div class="toolbar-left">
                            <div class="filter-pills">
                                <button class="pill" :class="{ active: filterMovementType === 'ALL' }" @click="setMovementType('ALL')">All</button>
                                <button class="pill" :class="{ active: filterMovementType === 'SALE' }" @click="setMovementType('SALE')">Sales</button>
                                <button class="pill" :class="{ active: filterMovementType === 'STOCK_ADJUSTMENT' }" @click="setMovementType('STOCK_ADJUSTMENT')">Adjustments</button>
                                <button class="pill" :class="{ active: filterMovementType === 'PURCHASE_RECEIPT' }" @click="setMovementType('PURCHASE_RECEIPT')">Purchases</button>
                                <button class="pill" :class="{ active: filterMovementType === 'VOID' }" @click="setMovementType('VOID')">Voids</button>
                            </div>
                        </div>
                        <div class="toolbar-right">
                            <div class="date-filter">
                                <button class="date-filter__btn" @click="showDateModal = true">
                                    <mdicon name="calendar-outline" size="16" />
                                    <span>{{ dateFilterLabel }}</span>
                                    <mdicon name="chevron-down" size="14" />
                                </button>
                                <button
                                    v-if="fromDate || toDate"
                                    class="date-filter__clear"
                                    @click="clearDateFilter"
                                    title="Clear date filter"
                                >
                                    <mdicon name="close" size="14" />
                                </button>
                            </div>
                            <div class="search-wrap">
                                <mdicon name="magnify" size="16" class="search-icon" />
                                <input
                                    v-model="searchQuery"
                                    class="search-input"
                                    placeholder="Search item or note..."
                                />
                            </div>
                            <button
                                class="ghost-button ghost-button--compact"
                                :disabled="isExporting || !canExport"
                                @click="exportMovements"
                            >
                                <mdicon name="download-outline" size="16" />
                                <span>{{ isExporting ? 'Exporting...' : 'Export' }}</span>
                            </button>
                        </div>
                    </div>

                    <Teleport to="body">
                        <Transition name="modal">
                            <div v-if="showDateModal" class="date-modal-overlay" @click.self="showDateModal = false">
                                <div class="date-modal">
                                    <div class="date-modal__header">
                                        <h3>Filter by date</h3>
                                        <button class="date-modal__close" @click="showDateModal = false">
                                            <mdicon name="close" size="18" />
                                        </button>
                                    </div>
                                    <div class="date-modal__options">
                                        <button class="date-modal__option" @click="setDatePreset('today')">
                                            <mdicon name="calendar-today" size="18" />
                                            <span>Today</span>
                                        </button>
                                        <button class="date-modal__option" @click="setDatePreset('week')">
                                            <mdicon name="calendar-week" size="18" />
                                            <span>This week</span>
                                        </button>
                                        <button class="date-modal__option" @click="setDatePreset('month')">
                                            <mdicon name="calendar-month" size="18" />
                                            <span>This month</span>
                                        </button>
                                        <button class="date-modal__option" @click="showCustomDate = true">
                                            <mdicon name="calendar-range" size="18" />
                                            <span>Custom range</span>
                                        </button>
                                    </div>
                                    <div v-if="showCustomDate" class="date-modal__custom">
                                        <label class="date-modal__field">
                                            <span>From</span>
                                            <input v-model="customFromDate" type="date" />
                                        </label>
                                        <label class="date-modal__field">
                                            <span>To</span>
                                            <input v-model="customToDate" type="date" />
                                        </label>
                                        <button class="date-modal__apply" @click="applyCustomDateRange">
                                            Apply range
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Transition>
                    </Teleport>

                    <div v-if="!storeContext.currentStoreId" class="panel-state">
                        Select or create a store to view movement history.
                    </div>

                    <div v-else-if="isLoading" class="panel-state">Loading movements...</div>

                    <div v-else class="table-wrap">
                        <table class="movements-table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Item</th>
                                    <th>Item type</th>
                                    <th>Movement</th>
                                    <th>Qty change</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="movement in filteredMovements" :key="movement.id">
                                    <td>
                                        <div class="date-cell">{{ formatDate(movement.createdAt) }}</div>
                                        <div class="item-meta" v-if="movement.createdBy?.fullName">
                                            {{ movement.createdBy.fullName }}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="item-name">{{ movement.itemName }}</div>
                                        <div class="item-meta">
                                            <span v-if="movement.itemSku">SKU {{ movement.itemSku }}</span>
                                            <span v-if="movement.itemCategory">{{ movement.itemCategory }}</span>
                                            <span v-if="movement.note" class="note">{{ movement.note }}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span :class="['item-type-chip', `item-type-chip--${movement.itemType.toLowerCase()}`]">
                                            {{ movement.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}
                                        </span>
                                    </td>
                                    <td>
                                        <span :class="['movement-pill', `movement-pill--${movement.type.toLowerCase()}`]">
                                            {{ formatMovementType(movement.type) }}
                                        </span>
                                    </td>
                                    <td class="item-qty" :class="movement.qtyDelta >= 0 ? 'positive' : 'negative'">
                                        {{ movement.qtyDelta >= 0 ? '+' : '' }}{{ formatQty(movement.qtyDelta) }}
                                    </td>
                                    <td>
                                        <RouterLink
                                            v-if="getReferenceRoute(movement)"
                                            class="reference-link"
                                            :to="getReferenceRoute(movement)!"
                                        >
                                            {{ getReferenceLabel(movement) }}
                                        </RouterLink>
                                        <span v-else class="muted-text">—</span>
                                    </td>
                                </tr>
                                <tr v-if="filteredMovements.length === 0">
                                    <td colspan="6">
                                        <div class="empty-state">
                                            <mdicon name="swap-horizontal" size="32" class="empty-icon" />
                                            <p class="empty-heading">No movements found</p>
                                            <p class="empty-sub">Try adjusting your filters or date range.</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination">
                        <div class="pagination-left">
                            <label class="pagination-size">
                                <span>Rows</span>
                                <select v-model.number="pageSize">
                                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                                </select>
                            </label>
                            <span class="pagination-info">{{ total }} records</span>
                        </div>
                        <div class="pagination-controls">
                            <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
                            <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </div>
                </section>

                <aside class="insight-panel">
                    <div class="insight-card">
                        <h3>Summary</h3>
                        <div class="summary-grid">
                            <div class="summary-row">
                                <span class="summary-label">Total records</span>
                                <span class="summary-value">{{ total }}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Net change</span>
                                <span class="summary-value" :class="netDelta >= 0 ? 'positive' : 'negative'">
                                    {{ netDelta >= 0 ? '+' : '' }}{{ formatQty(netDelta) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="insight-card">
                        <h3>Breakdown</h3>
                        <div class="breakdown-list">
                            <div class="breakdown-item">
                                <span class="breakdown-dot breakdown-dot--sale"></span>
                                <span class="breakdown-label">Sales</span>
                                <span class="breakdown-count">{{ movementTypeCounts.SALE }}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot breakdown-dot--adjustment"></span>
                                <span class="breakdown-label">Adjustments</span>
                                <span class="breakdown-count">{{ movementTypeCounts.STOCK_ADJUSTMENT }}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot breakdown-dot--purchase"></span>
                                <span class="breakdown-label">Purchases</span>
                                <span class="breakdown-count">{{ movementTypeCounts.PURCHASE_RECEIPT }}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-dot breakdown-dot--void"></span>
                                <span class="breakdown-label">Voids</span>
                                <span class="breakdown-count">{{ movementTypeCounts.VOID }}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listMovements, MovementRecord } from '@/api/inventory';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';

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

const setMovementType = async (type: string) => {
    filterMovementType.value = type;
    page.value = 1;
    await loadMovements();
};

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
const canUseIngredients = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'ingredients'));
const showIngredients = computed(() => !planKnown.value || canUseIngredients.value);
const canExport = computed(() => planKnown.value && hasPlanFeature(ownerPlanTier.value, 'exports'));

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} · ${store.currency}`;
});

const canAdjust = computed(() => canAccess(storeContext.currentStore?.role, 'inventoryAdjustments'));

const loadMovements = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        movements.value = [];
        total.value = 0;
        return;
    }
    isLoading.value = true;
    try {
        const fromValue = fromDate.value ? new Date(`${fromDate.value}T00:00:00`).toISOString() : undefined;
        const toValue = toDate.value ? new Date(`${toDate.value}T23:59:59.999`).toISOString() : undefined;
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
const netDelta = computed(() => movements.value.reduce((sum, movement) => sum + movement.qtyDelta, 0));

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
    return date.toLocaleString();
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
        openPlanUpgradeModal('exports');
        return;
    }
    isExporting.value = true;
    try {
        const fromValue = fromDate.value ? new Date(`${fromDate.value}T00:00:00`).toISOString() : undefined;
        const toValue = toDate.value ? new Date(`${toDate.value}T23:59:59.999`).toISOString() : undefined;
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

const formatMovementType = (type: string) => {
    const labels: Record<string, string> = {
        SALE: 'Sale',
        STOCK_ADJUSTMENT: 'Adjustment',
        PURCHASE_RECEIPT: 'Purchase',
        VOID: 'Void',
    };
    return labels[type] ?? type.replace(/_/g, ' ');
};

const movementTypeCounts = computed(() => {
    const counts: Record<string, number> = { SALE: 0, STOCK_ADJUSTMENT: 0, PURCHASE_RECEIPT: 0, VOID: 0 };
    movements.value.forEach((m) => {
        if (m.type in counts) counts[m.type]++;
    });
    return counts;
});

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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

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
.movements-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.movements-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.movements-eyebrow {
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

.movements-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.movements-title p {
    color: var(--c-muted);
    max-width: 520px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.92rem;
}

.movements-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}

/* ============================================================
   LAYOUT
============================================================ */
.movements-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 1.5rem;
    align-items: start;
}

/* ============================================================
   PANEL
============================================================ */
.movements-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.filter-pills {
    display: flex;
    gap: 0.25rem;
    padding: 0.2rem;
    background: #f1f5f9;
    border-radius: 10px;
}

.pill {
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--c-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', -apple-system, sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
}

.pill:hover { color: var(--c-text); }

.pill.active {
    background: #ffffff;
    color: var(--c-text);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.date-filter {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.date-filter__btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-surface);
    color: var(--c-text);
    font-size: 0.8rem;
    font-weight: 500;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: border-color 0.15s;
    white-space: nowrap;
}

.date-filter__btn:hover { border-color: var(--c-accent); }

.date-filter__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 6px;
    background: #fee2e2;
    color: #b91c1c;
    cursor: pointer;
    transition: background 0.15s;
}

.date-filter__clear:hover { background: #fecaca; }

.search-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--c-muted);
    pointer-events: none;
}

.search-input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.5rem 0.9rem 0.5rem 2.25rem;
    min-width: 180px;
    font-size: 0.84rem;
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--c-surface);
    color: var(--c-text);
    transition: border-color 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap {
    border: 1px solid var(--c-border);
    border-radius: 12px;
    overflow: hidden;
}

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
    background: #f8fafc;
    border-bottom: 1.5px solid var(--c-border);
}

.movements-table tbody td {
    padding: 0.65rem 0.9rem;
    border-bottom: 1px solid var(--c-border);
    vertical-align: middle;
}

.movements-table tbody tr:last-child td { border-bottom: none; }
.movements-table tbody tr:hover { background: #f8fafc; }

.item-name {
    font-weight: 600;
    color: var(--c-text);
}

.item-meta {
    font-size: 0.72rem;
    color: var(--c-muted);
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.15rem;
}

.item-meta .note {
    color: var(--c-accent-dark);
    font-style: italic;
}

.item-type-chip {
    display: inline-flex;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    white-space: nowrap;
}

.item-type-chip--product {
    background: rgba(13, 148, 136, 0.08);
    color: #0f766e;
}

.item-type-chip--ingredient {
    background: rgba(139, 92, 246, 0.08);
    color: #6d28d9;
}

.item-qty {
    font-weight: 700;
    white-space: nowrap;
}

.item-qty.positive { color: #059669; }
.item-qty.negative { color: #dc2626; }

/* Movement type pills */
.movement-pill {
    display: inline-flex;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
}

.movement-pill--sale {
    background: rgba(13, 148, 136, 0.1);
    color: #0f766e;
}

.movement-pill--stock_adjustment {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
}

.movement-pill--purchase_receipt {
    background: rgba(139, 92, 246, 0.1);
    color: #6d28d9;
}

.movement-pill--void {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
}

.reference-link {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-accent);
    text-decoration: none;
}

.reference-link:hover {
    color: var(--c-accent-dark);
    text-decoration: underline;
}

.muted-text { color: var(--c-muted); }

.date-cell {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--c-text);
    white-space: nowrap;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1.5rem;
    text-align: center;
}

.empty-icon {
    color: #cbd5e1;
    margin-bottom: 0.75rem;
}

.empty-heading {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.3rem;
}

.empty-sub {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   PANEL STATE
============================================================ */
.panel-state {
    padding: 2rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.875rem;
    text-align: center;
}

/* ============================================================
   PAGINATION
============================================================ */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--c-border);
}

.pagination-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.pagination-info {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    background: var(--c-surface);
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--c-muted);
    font-weight: 500;
}

.pagination-size select {
    padding: 0.25rem 0.5rem;
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    font-size: 0.78rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
}

/* ============================================================
   ASIDE
============================================================ */
.insight-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.insight-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
}

.insight-card h3 {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.75rem;
}

.summary-grid {
    display: flex;
    flex-direction: column;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.82rem;
}

.summary-row:last-child { border-bottom: none; }

.summary-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--c-muted);
}

.summary-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
}

.summary-value.positive { color: #059669; }
.summary-value.negative { color: #dc2626; }

.breakdown-list {
    display: flex;
    flex-direction: column;
}

.breakdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.82rem;
}

.breakdown-item:last-child { border-bottom: none; }

.breakdown-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.breakdown-dot--sale       { background: #0d9488; }
.breakdown-dot--adjustment { background: #3b82f6; }
.breakdown-dot--purchase   { background: #8b5cf6; }
.breakdown-dot--void       { background: #ef4444; }

.breakdown-label {
    flex: 1;
    color: var(--c-text);
    font-weight: 500;
}

.breakdown-count {
    font-weight: 700;
    color: var(--c-text);
    font-size: 0.875rem;
}

/* ============================================================
   BUTTONS
============================================================ */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    border: none;
    background: var(--c-accent);
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) { background: var(--c-accent-dark); }

.primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.ghost-button:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.ghost-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.ghost-button--compact {
    padding: 0.5rem 0.85rem;
    font-size: 0.84rem;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 960px) {
    .movements-content {
        grid-template-columns: 1fr;
    }

    .toolbar-row {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-right {
        flex-wrap: wrap;
    }

    .filter-pills {
        overflow-x: auto;
    }
}

@media (max-width: 640px) {
    .movements-page {
        padding: 1.25rem 1rem 2.5rem;
    }

    .movements-title h1 {
        font-size: 1.5rem;
    }
}

/* ============================================================
   DATE MODAL (via Teleport)
============================================================ */
:global(.date-modal-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

:global(.date-modal) {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 340px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

:global(.date-modal__header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

:global(.date-modal__header h3) {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
}

:global(.date-modal__close) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background 0.15s;
}

:global(.date-modal__close:hover) {
    background: #f1f5f9;
    color: #0f172a;
}

:global(.date-modal__options) {
    display: grid;
    gap: 0.4rem;
    padding: 1rem 1.25rem;
}

:global(.date-modal__option) {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.7rem 0.9rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: border-color 0.15s;
}

:global(.date-modal__option:hover) {
    border-color: #0d9488;
}

:global(.date-modal__custom) {
    display: grid;
    gap: 0.65rem;
    padding: 0 1.25rem 1.25rem;
}

:global(.date-modal__field) {
    display: grid;
    gap: 0.3rem;
}

:global(.date-modal__field span) {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
}

:global(.date-modal__field input) {
    padding: 0.6rem 0.85rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #0f172a;
    transition: border-color 0.15s;
}

:global(.date-modal__field input:focus) {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

:global(.date-modal__apply) {
    padding: 0.65rem 1rem;
    border: none;
    border-radius: 8px;
    background: #0d9488;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
}

:global(.date-modal__apply:hover) { background: #0f766e; }

:global(.modal-enter-active),
:global(.modal-leave-active) {
    transition: opacity 0.2s ease;
}

:global(.modal-enter-active .date-modal),
:global(.modal-leave-active .date-modal) {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

:global(.modal-enter-from),
:global(.modal-leave-to) {
    opacity: 0;
}

:global(.modal-enter-from .date-modal),
:global(.modal-leave-to .date-modal) {
    transform: scale(0.95);
    opacity: 0;
}
</style>
