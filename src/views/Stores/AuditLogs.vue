<template>
    <section class="audit-page">
        <div class="audit-shell">
            <header class="audit-header">
                <div class="audit-header__left">
                    <button class="back-btn" type="button" @click="goBack">
                        <mdicon name="arrow-left" size="18" />
                    </button>
                    <div>
                        <h1>Audit Log</h1>
                        <p>{{ currentStoreLabel }}</p>
                    </div>
                </div>
                <button
                    class="export-btn"
                    type="button"
                    :disabled="auditExporting || !canExport"
                    @click="exportAuditLog"
                >
                    <mdicon name="download-outline" size="18" />
                    {{ auditExporting ? 'Exporting...' : 'Export' }}
                </button>
            </header>

            <div class="audit-filters">
                <div class="filter-row">
                    <div class="filter-pills">
                        <button
                            class="filter-pill"
                            :class="{ active: auditAction === '' }"
                            type="button"
                            @click="applyAuditPreset()"
                        >
                            All
                        </button>
                        <button
                            class="filter-pill"
                            :class="{ active: auditAction === 'INVENTORY_ADJUSTMENT' }"
                            type="button"
                            @click="applyAuditPreset('INVENTORY_ADJUSTMENT')"
                        >
                            Adjustments
                        </button>
                        <button
                            class="filter-pill"
                            :class="{ active: auditAction === 'PURCHASE_RECEIPT' }"
                            type="button"
                            @click="applyAuditPreset('PURCHASE_RECEIPT')"
                        >
                            Receipts
                        </button>
                        <button
                            class="filter-pill"
                            :class="{ active: auditAction === 'PURCHASE_ORDER_STATUS' }"
                            type="button"
                            @click="applyAuditPreset('PURCHASE_ORDER_STATUS')"
                        >
                            PO Status
                        </button>
                        <button
                            class="filter-pill"
                            :class="{ active: auditAction === 'SUPPLIER_UPDATED' }"
                            type="button"
                            @click="applyAuditPreset('SUPPLIER_UPDATED')"
                        >
                            Suppliers
                        </button>
                    </div>
                    <div class="search-wrap">
                        <mdicon name="magnify" size="18" class="search-icon" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            class="search-input"
                            placeholder="Search by actor, item, or entity..."
                            @input="onSearchChange"
                        />
                        <button v-if="searchQuery" class="search-clear" type="button" @click="clearSearch">
                            <mdicon name="close" size="16" />
                        </button>
                    </div>
                </div>
                <div class="filter-row">
                    <div class="date-pills">
                        <button
                            class="date-pill"
                            :class="{ active: !auditFromDate && !auditToDate }"
                            type="button"
                            @click="clearDateRange"
                        >
                            All
                        </button>
                        <button
                            class="date-pill"
                            :class="{ active: datePreset === '7d' }"
                            type="button"
                            @click="applyAuditRange('7d')"
                        >
                            7d
                        </button>
                        <button
                            class="date-pill"
                            :class="{ active: datePreset === '30d' }"
                            type="button"
                            @click="applyAuditRange('30d')"
                        >
                            30d
                        </button>
                        <button
                            class="date-pill"
                            :class="{ active: datePreset === 'month' }"
                            type="button"
                            @click="applyAuditRange('month')"
                        >
                            Month
                        </button>
                    </div>
                </div>
            </div>

            <div class="audit-content">
                <SkeletonLoader v-if="auditLoading" :rows="8" label="Loading audit logs…" />

                <div v-else-if="!currentStore" class="audit-empty">
                    <mdicon name="store-outline" size="40" />
                    <span>Select a store to view audit events</span>
                </div>

                <div v-else-if="auditLogs.length === 0" class="audit-empty">
                    <mdicon name="clipboard-text-clock-outline" size="40" />
                    <span>No audit events found</span>
                </div>

                <div v-else class="audit-grid">
                    <div class="audit-list">
                        <div
                            v-for="log in auditLogs"
                            :key="log.id"
                            class="log-item"
                            :class="{ selected: selectedAuditLog?.id === log.id }"
                            @click="selectAuditLog(log)"
                        >
                            <div class="log-icon" :class="getActionClass(log.action)">
                                <mdicon :name="getActionIcon(log.action)" size="18" />
                            </div>
                            <div class="log-content">
                                <div class="log-title">
                                    <span class="log-action">{{ formatActionLabel(log.action) }}</span>
                                    <span class="log-entity">{{ log.entityType }}</span>
                                </div>
                                <div class="log-summary" v-if="formatAuditSummary(log)">
                                    {{ formatAuditSummary(log) }}
                                </div>
                                <div class="log-meta">
                                    <span>{{ log.actor?.fullName || log.actor?.email || 'System' }}</span>
                                    <span>{{ formatRelativeTime(log.createdAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="audit-detail">
                        <template v-if="selectedAuditLog">
                            <div class="detail-header">
                                <h3>{{ formatActionLabel(selectedAuditLog.action) }}</h3>
                                <button class="copy-btn" type="button" @click="copyAuditMeta" title="Copy metadata">
                                    <mdicon name="content-copy" size="16" />
                                </button>
                            </div>
                            <div class="detail-info">
                                <div class="info-row" v-if="getAuditItemName(selectedAuditLog)">
                                    <span class="info-label">Item</span>
                                    <span class="info-value info-value--highlight">{{ getAuditItemName(selectedAuditLog) }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Actor</span>
                                    <span class="info-value">{{ selectedAuditLog.actor?.fullName || selectedAuditLog.actor?.email || 'System' }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Entity</span>
                                    <span class="info-value">{{ selectedAuditLog.entityType }} {{ selectedAuditLog.entityId ? `#${selectedAuditLog.entityId.slice(-8)}` : '' }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Time</span>
                                    <span class="info-value">{{ formatDateTime(selectedAuditLog.createdAt) }}</span>
                                </div>
                            </div>
                            <div class="detail-items" v-if="selectedAuditLog.action === 'PURCHASE_RECEIPT' && getAuditReceiptItems(selectedAuditLog).length > 0">
                                <span class="items-label">Items Received</span>
                                <div class="items-list">
                                    <div v-for="(item, idx) in getAuditReceiptItems(selectedAuditLog)" :key="idx" class="item-row">
                                        <span class="item-name">{{ item.name }}</span>
                                        <span class="item-qty">×{{ item.qty }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-meta" v-if="selectedAuditMeta">
                                <span class="meta-label">Metadata</span>
                                <pre class="meta-json">{{ selectedAuditMeta }}</pre>
                            </div>
                        </template>
                        <div v-else class="detail-empty">
                            <mdicon name="gesture-tap" size="32" />
                            <span>Select an event to view details</span>
                        </div>
                    </div>
                </div>

                <div class="pagination">
                    <div class="pagination-info">
                        <span class="pagination-count">{{ auditTotal }} event{{ auditTotal !== 1 ? 's' : '' }}</span>
                        <label class="pagination-size">
                            <span>Show</span>
                            <select v-model.number="auditPageSize" @change="onPageSizeChange">
                                <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                    {{ size }}
                                </option>
                            </select>
                        </label>
                    </div>
                    <div v-if="auditTotalPages > 1" class="pagination-controls">
                        <button class="page-btn" :disabled="auditPage === 1" @click="changeAuditPage(auditPage - 1)">
                            <mdicon name="chevron-left" size="18" />
                        </button>
                        <span class="page-indicator">{{ auditPage }} / {{ auditTotalPages }}</span>
                        <button class="page-btn" :disabled="auditPage === auditTotalPages" @click="changeAuditPage(auditPage + 1)">
                            <mdicon name="chevron-right" size="18" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { useRoute, useRouter } from 'vue-router';
import { AuditLogRecord, exportAuditLogs, listAuditLogs } from '@/api/auditLogs';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { hasPlanFeature, openPlanUpgradeModal } from '@/utils/planAccess';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

const auditLogs = ref<AuditLogRecord[]>([]);
const auditLoading = ref(false);
const auditExporting = ref(false);
const auditAction = ref('');
const auditFromDate = ref('');
const auditToDate = ref('');
const auditPage = ref(1);
const auditPageSize = ref(10);
const pageSizeOptions = [10, 20, 50];
const auditTotal = ref(0);
const selectedAuditLog = ref<AuditLogRecord | null>(null);
const isApplyingQuery = ref(false);
const isSyncingQuery = ref(false);
const datePreset = ref<string>('');
const searchQuery = ref('');
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

const routeStoreId = computed(() => route.params.storeId as string | undefined);
const currentStore = computed(() => {
    const storeId = routeStoreId.value;
    if (!storeId) return null;
    return storeContext.stores.find((store) => store.id === storeId) ?? null;
});
const currentStoreLabel = computed(() => {
    if (!currentStore.value) return 'Select a store to get started.';
    return `${currentStore.value.name} - ${currentStore.value.currency}`;
});

const planKnown = computed(() => userContext.planTier !== null);
const canExport = computed(() => planKnown.value && hasPlanFeature(userContext.planTier, 'importExport'));

const normalizeDateParam = (value: unknown) => {
    if (typeof value !== 'string') return '';
    if (value.includes('T')) return value.slice(0, 10);
    return value;
};

const buildAuditQuery = () => {
    const query: Record<string, string> = {};
    if (auditAction.value) query.action = auditAction.value;
    if (auditFromDate.value) query.from = auditFromDate.value;
    if (auditToDate.value) query.to = auditToDate.value;
    if (auditPage.value > 1) query.page = String(auditPage.value);
    if (datePreset.value) query.datePreset = datePreset.value;
    return query;
};

const syncAuditQuery = async () => {
    isSyncingQuery.value = true;
    await router.replace({ query: buildAuditQuery() });
    isSyncingQuery.value = false;
};

const applyQueryFilters = async () => {
    const query = route.query;
    const hasQuery = ['action', 'from', 'to', 'page', 'datePreset'].some(
        (key) => query[key] !== undefined
    );
    if (!hasQuery) return false;
    isApplyingQuery.value = true;
    auditAction.value = typeof query.action === 'string' ? query.action : '';
    auditFromDate.value = normalizeDateParam(query.from);
    auditToDate.value = normalizeDateParam(query.to);
    datePreset.value = typeof query.datePreset === 'string' ? query.datePreset : '';
    const parsedPage = typeof query.page === 'string' ? Number.parseInt(query.page, 10) : Number.NaN;
    auditPage.value = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    await nextTick();
    isApplyingQuery.value = false;
    selectedAuditLog.value = null;
    await loadAuditLogs();
    return true;
};

const loadAuditLogs = async () => {
    if (!currentStore.value) {
        auditLogs.value = [];
        auditTotal.value = 0;
        selectedAuditLog.value = null;
        return;
    }
    auditLoading.value = true;
    try {
        const fromValue = auditFromDate.value ? new Date(`${auditFromDate.value}T00:00:00`).toISOString() : undefined;
        const toValue = auditToDate.value ? new Date(`${auditToDate.value}T23:59:59.999`).toISOString() : undefined;
        const data = await listAuditLogs(currentStore.value.id, {
            action: auditAction.value.trim() || undefined,
            q: searchQuery.value.trim() || undefined,
            from: fromValue,
            to: toValue,
            page: auditPage.value,
            pageSize: auditPageSize.value,
        });
        auditLogs.value = data.logs;
        auditTotal.value = data.total;
        if (selectedAuditLog.value) {
            const match = data.logs.find((log) => log.id === selectedAuditLog.value?.id) || null;
            selectedAuditLog.value = match;
        } else if (data.logs.length > 0) {
            selectedAuditLog.value = data.logs[0];
        }
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load audit log.';
        showToast(message, 'error');
    } finally {
        auditLoading.value = false;
    }
};

const selectAuditLog = (log: AuditLogRecord) => {
    selectedAuditLog.value = log;
};

const copyAuditMeta = async () => {
    if (!selectedAuditLog.value) return;
    if (!selectedAuditMeta.value) {
        showToast('No metadata available for this event.', 'info');
        return;
    }
    try {
        await navigator.clipboard.writeText(selectedAuditMeta.value);
        showToast('Audit metadata copied.', 'success');
    } catch (error) {
        showToast('Unable to copy metadata.', 'error');
    }
};

const applyAuditPreset = async (action?: string) => {
    auditAction.value = action ?? '';
    await applyAuditFilters();
};

const applyAuditRange = async (range: '7d' | '30d' | 'month' | 'last-month') => {
    datePreset.value = range;
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    if (range === '7d') {
        start.setDate(start.getDate() - 6);
    } else if (range === '30d') {
        start.setDate(start.getDate() - 29);
    } else if (range === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end.setMonth(today.getMonth() + 1, 0);
    } else {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end.setMonth(today.getMonth(), 0);
    }

    auditFromDate.value = formatDateInput(start);
    auditToDate.value = formatDateInput(end);
    await applyAuditFilters();
};

const clearDateRange = async () => {
    datePreset.value = '';
    auditFromDate.value = '';
    auditToDate.value = '';
    await applyAuditFilters();
};

const exportAuditLog = async () => {
    if (!currentStore.value || auditExporting.value) return;
    if (!canExport.value) {
        openPlanUpgradeModal('importExport');
        return;
    }
    auditExporting.value = true;
    try {
        const fromValue = auditFromDate.value ? new Date(`${auditFromDate.value}T00:00:00`).toISOString() : undefined;
        const toValue = auditToDate.value ? new Date(`${auditToDate.value}T23:59:59.999`).toISOString() : undefined;
        const { blob, filename } = await exportAuditLogs(currentStore.value.id, {
            action: auditAction.value.trim() || undefined,
            from: fromValue,
            to: toValue,
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'audit-log.csv';
        link.click();
        URL.revokeObjectURL(url);
        showToast('Audit log exported.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to export audit log.';
        showToast(message, 'error');
    } finally {
        auditExporting.value = false;
    }
};

const applyAuditFilters = async () => {
    auditPage.value = 1;
    selectedAuditLog.value = null;
    await syncAuditQuery();
    await loadAuditLogs();
};

const changeAuditPage = async (nextPage: number) => {
    auditPage.value = nextPage;
    await syncAuditQuery();
    await loadAuditLogs();
};

const onSearchChange = () => {
    if (searchDebounce) {
        clearTimeout(searchDebounce);
    }
    searchDebounce = setTimeout(async () => {
        auditPage.value = 1;
        selectedAuditLog.value = null;
        await loadAuditLogs();
    }, 300);
};

const clearSearch = async () => {
    searchQuery.value = '';
    if (searchDebounce) {
        clearTimeout(searchDebounce);
        searchDebounce = null;
    }
    auditPage.value = 1;
    selectedAuditLog.value = null;
    await loadAuditLogs();
};

const onPageSizeChange = async () => {
    auditPage.value = 1;
    selectedAuditLog.value = null;
    await loadAuditLogs();
};

const auditTotalPages = computed(() => Math.max(1, Math.ceil(auditTotal.value / auditPageSize.value)));
const selectedAuditMeta = computed(() => {
    if (!selectedAuditLog.value?.meta) return '';
    return JSON.stringify(selectedAuditLog.value.meta, null, 2);
});

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatMoney = (value: number) => {
    const currency = currentStore.value?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: storeContext.currentStore?.timezone || 'Asia/Manila' });
};

const formatActionLabel = (action: string) => {
    const labels: Record<string, string> = {
        INVENTORY_ADJUSTMENT: 'Inventory Adjustment',
        PURCHASE_RECEIPT: 'Purchase Receipt',
        PURCHASE_ORDER_STATUS: 'PO Status Change',
        SUPPLIER_UPDATED: 'Supplier Updated',
    };
    return labels[action] || action.replace(/_/g, ' ');
};

const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
        INVENTORY_ADJUSTMENT: 'swap-vertical',
        PURCHASE_RECEIPT: 'package-variant-closed',
        PURCHASE_ORDER_STATUS: 'clipboard-check-outline',
        SUPPLIER_UPDATED: 'account-edit-outline',
    };
    return icons[action] || 'circle-outline';
};

const getActionClass = (action: string) => {
    const classes: Record<string, string> = {
        INVENTORY_ADJUSTMENT: 'adjustment',
        PURCHASE_RECEIPT: 'receipt',
        PURCHASE_ORDER_STATUS: 'status',
        SUPPLIER_UPDATED: 'supplier',
    };
    return classes[action] || '';
};

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

const getAuditItemName = (log: AuditLogRecord) => {
    if (!log.meta || typeof log.meta !== 'object') return '';
    const meta = log.meta as Record<string, unknown>;
    if (typeof meta.itemName === 'string') return meta.itemName;
    return '';
};

const getAuditReceiptItems = (log: AuditLogRecord) => {
    if (!log.meta || typeof log.meta !== 'object') return [];
    const meta = log.meta as Record<string, unknown>;
    if (!Array.isArray(meta.items)) return [];
    return meta.items.map((item: any) => ({
        name: item.itemName || 'Unknown item',
        qty: item.qtyReceived || 0,
        cost: item.unitCost || 0,
    }));
};

const formatAuditSummary = (log: AuditLogRecord) => {
    if (!log.meta || typeof log.meta !== 'object') return '';
    const meta = log.meta as Record<string, unknown>;

    if (log.action === 'INVENTORY_ADJUSTMENT') {
        const itemName = typeof meta.itemName === 'string' ? meta.itemName : '';
        const delta = Number(meta.qtyDelta);
        const parts: string[] = [];
        if (itemName) {
            parts.push(itemName);
        }
        if (Number.isFinite(delta)) {
            parts.push(`${delta >= 0 ? '+' : ''}${formatQty(delta)}`);
        }
        return parts.join(' · ');
    }

    if (log.action === 'PURCHASE_RECEIPT') {
        const items = Array.isArray(meta.items) ? meta.items : [];
        const itemNames = items
            .map((item: any) => item.itemName)
            .filter((name: string) => name)
            .slice(0, 3);
        if (itemNames.length > 0) {
            const suffix = items.length > 3 ? ` +${items.length - 3} more` : '';
            return itemNames.join(', ') + suffix;
        }
        const totalCost = Number(meta.totalCost);
        const invoiceNumber = typeof meta.invoiceNumber === 'string' ? meta.invoiceNumber : '';
        const parts: string[] = [];
        if (items.length > 0) {
            parts.push(`${items.length} item${items.length !== 1 ? 's' : ''}`);
        }
        if (Number.isFinite(totalCost)) {
            parts.push(formatMoney(totalCost));
        }
        if (invoiceNumber) {
            parts.push(`#${invoiceNumber}`);
        }
        return parts.join(' · ');
    }

    if (log.action === 'SUPPLIER_UPDATED') {
        const changes =
            meta.changes && typeof meta.changes === 'object'
                ? (meta.changes as Record<string, unknown>)
                : null;
        if (!changes) return 'Supplier updated';
        const labels = Object.keys(changes).map((field) => {
            if (field === 'name') return 'Name';
            if (field === 'email') return 'Email';
            if (field === 'phone') return 'Phone';
            return field;
        });
        if (labels.length === 0) return 'Supplier updated';
        return `Updated ${labels.join(', ')}`;
    }

    return '';
};

const goBack = () => {
    if (!routeStoreId.value) {
        router.push('/stores');
        return;
    }
    router.push(`/stores/${routeStoreId.value}/settings`);
};

onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    await userContext.fetchMe();
    const applied = await applyQueryFilters();
    if (!applied) {
        await loadAuditLogs();
    }
});

watch(
    () => route.params.storeId,
    async (value) => {
        const storeId = value as string | undefined;
        if (storeId) {
            storeContext.setCurrentStore(storeId);
        }
    }
);

watch(
    () => route.query,
    async () => {
        if (isSyncingQuery.value) return;
        await applyQueryFilters();
    }
);

watch(
    () => currentStore.value,
    async (store) => {
        if (store) {
            auditAction.value = '';
            auditFromDate.value = '';
            auditToDate.value = '';
            datePreset.value = '';
            auditPage.value = 1;
            selectedAuditLog.value = null;
            const applied = await applyQueryFilters();
            if (!applied) {
                await loadAuditLogs();
            }
        } else {
            auditLogs.value = [];
            auditTotal.value = 0;
            selectedAuditLog.value = null;
        }
    }
);
</script>

<style scoped>
.audit-page {
    --ink: #0f172a;
    --muted: #64748b;
    --accent: #0f766e;
    --accent-strong: #0f4c5c;
    min-height: 100vh;
    padding: 1.5rem;
    background: #f8fafc;
    color: var(--ink);
}

.audit-shell {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* Header */
.audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.audit-header__left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.audit-header h1 {
    font-size: 1.5rem;
    margin: 0;
    letter-spacing: -0.02em;
}

.audit-header p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--muted);
}

.back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s ease;
}

.back-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.export-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.85rem;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: var(--ink);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
}

.export-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
}

.export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Filters */
.audit-filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.filter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.filter-pills {
    display: flex;
    gap: 0.25rem;
}

.filter-pill {
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
}

.filter-pill:hover {
    color: var(--ink);
    background: #f1f5f9;
}

.filter-pill.active {
    background: var(--accent);
    color: #fff;
}

.filter-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.date-pills {
    display: flex;
    gap: 0.2rem;
    padding: 0.2rem;
    background: #f1f5f9;
    border-radius: 8px;
}

.date-pill {
    padding: 0.3rem 0.6rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
}

.date-pill:hover {
    color: var(--ink);
}

.date-pill.active {
    background: #fff;
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.event-count {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 500;
}

/* Search Bar */
.search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    max-width: 280px;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--muted);
    pointer-events: none;
}

.search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 2.25rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.8rem;
    background: #fff;
    transition: border-color 0.15s ease;
}

.search-input::placeholder {
    color: var(--muted);
}

.search-input:focus {
    outline: none;
    border-color: var(--accent);
}

.search-clear {
    position: absolute;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: #e2e8f0;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s ease;
}

.search-clear:hover {
    background: var(--accent);
    color: #fff;
}

/* Content */
.audit-content {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    overflow: hidden;
}

.audit-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 2rem;
    color: var(--muted);
}

.audit-empty span {
    font-size: 0.9rem;
}

.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Grid Layout */
.audit-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 38%);
}

/* Log List */
.audit-list {
    border-right: 1px solid #f1f5f9;
    min-width: 0;
}

.log-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #f8fafc;
    cursor: pointer;
    transition: background 0.15s ease;
}

.log-item:hover {
    background: #fafbfc;
}

.log-item.selected {
    background: rgba(15, 118, 110, 0.06);
    border-left: 3px solid var(--accent);
}

.log-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex-shrink: 0;
}

.log-icon.adjustment {
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
}

.log-icon.receipt {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
}

.log-icon.status {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
}

.log-icon.supplier {
    background: rgba(139, 92, 246, 0.12);
    color: #8b5cf6;
}

.log-content {
    flex: 1;
    min-width: 0;
}

.log-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
}

.log-action {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink);
}

.log-entity {
    font-size: 0.7rem;
    color: var(--muted);
    background: #f1f5f9;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
}

.log-summary {
    font-size: 0.75rem;
    color: var(--muted);
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.log-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--muted);
}

.log-meta span:not(:last-child)::after {
    content: '·';
    margin-left: 0.5rem;
}

/* Detail Panel */
.audit-detail {
    padding: 1.25rem;
    background: #fafbfc;
    min-width: 0;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.detail-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s ease;
}

.copy-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.detail-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.info-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.8rem;
}

.info-label {
    color: var(--muted);
}

.info-value {
    font-weight: 500;
    color: var(--ink);
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
}

.info-value--highlight {
    color: var(--accent);
    font-weight: 600;
}

.detail-items {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
}

.items-label {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.6rem;
    background: #fff;
    border-radius: 6px;
    font-size: 0.8rem;
}

.item-name {
    color: var(--ink);
    font-weight: 500;
}

.item-qty {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.75rem;
}

.detail-meta {
    margin-top: 0.5rem;
}

.meta-label {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
}

.meta-json {
    margin: 0;
    padding: 0.75rem;
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 8px;
    font-size: 0.7rem;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 200px;
}

.detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 100%;
    min-height: 200px;
    color: var(--muted);
}

.detail-empty span {
    font-size: 0.85rem;
}

/* Pagination */
.audit-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-top: 1px solid #f1f5f9;
}

.page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
}

.page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.page-info {
    font-size: 0.8rem;
    color: var(--muted);
}

/* Responsive */
@media (max-width: 768px) {
    .filter-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .filter-pills {
        overflow-x: auto;
        padding-bottom: 0.25rem;
    }

    .search-wrap {
        max-width: none;
    }

    .audit-grid {
        grid-template-columns: 1fr;
    }

    .audit-list {
        border-right: none;
        border-bottom: 1px solid #f1f5f9;
    }
}
</style>
