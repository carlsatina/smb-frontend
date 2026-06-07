<template>
    <div class="as-page">
        <header class="as-header">
            <div>
                <h1 class="as-title">Stores</h1>
                <p class="as-sub">Sales activity per store — use the month filter for billing.</p>
            </div>
            <div class="as-header-kpis">
                <div class="as-kpi">
                    <span class="as-kpi-value">{{ total }}</span>
                    <span class="as-kpi-label">Total stores</span>
                </div>
                <div class="as-kpi">
                    <span class="as-kpi-value">{{ totalSalesAllTime.toLocaleString() }}</span>
                    <span class="as-kpi-label">Sales all time</span>
                </div>
                <div class="as-kpi as-kpi--accent">
                    <span class="as-kpi-value">{{ totalSalesMonth.toLocaleString() }}</span>
                    <span class="as-kpi-label">Sales in {{ monthLabel }}</span>
                </div>
            </div>
        </header>

        <!-- Toolbar: month nav + search + sort -->
        <div class="as-toolbar">
            <!-- Month navigator -->
            <div class="as-month-nav">
                <button class="as-month-btn" @click="shiftMonth(-1)" title="Previous month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <span class="as-month-label">{{ monthLabel }}</span>
                <button class="as-month-btn" @click="shiftMonth(1)" :disabled="isCurrentMonth" title="Next month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <button v-if="!isCurrentMonth" class="as-today-btn" @click="goToCurrentMonth">This month</button>
            </div>

            <input v-model="search" class="as-search" type="text" placeholder="Search store or owner email…" />

            <div class="as-sort-wrap">
                <label class="as-sort-label">Sort</label>
                <select v-model="sortBy" class="as-sort-select">
                    <option value="salesThisMonth">{{ monthLabel }} sales ↓</option>
                    <option value="totalSales">All-time sales ↓</option>
                    <option value="totalReceipts">Receipts ↓</option>
                    <option value="createdAt">Newest first</option>
                </select>
            </div>
        </div>

        <div v-if="loading" class="as-state">Loading stores...</div>
        <div v-else-if="error" class="as-state as-state--error">{{ error }}</div>

        <template v-else>
            <div class="as-table-wrap">
                <table class="as-table">
                    <thead>
                        <tr>
                            <th>Store</th>
                            <th>Owner</th>
                            <th>Plan</th>
                            <th class="as-th-num">{{ monthLabel }} sales</th>
                            <th class="as-th-num">All-time sales</th>
                            <th class="as-th-num">Receipts</th>
                            <th>Since</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="store in sortedStores" :key="store.id">
                            <td>
                                <div class="as-store-name">{{ store.name }}</div>
                                <div class="as-store-meta">
                                    <span class="as-type-badge" :class="store.storeType === 'WAREHOUSE' ? 'as-type-badge--wh' : 'as-type-badge--retail'">
                                        {{ store.storeType === 'WAREHOUSE' ? 'Warehouse' : 'Retail' }}
                                    </span>
                                    <span class="as-currency">{{ store.currency }}</span>
                                </div>
                            </td>
                            <td>
                                <div v-if="store.owner" class="as-owner-email">{{ store.owner.email }}</div>
                                <div v-else class="as-muted">No owner</div>
                            </td>
                            <td>
                                <span v-if="store.owner" class="as-plan-badge" :class="`as-plan-badge--${(store.owner.grantedPlan || store.owner.planTier).toLowerCase()}`">
                                    {{ store.owner.grantedPlan || store.owner.planTier }}
                                    <span v-if="store.owner.grantedPlan" class="as-grant-tag">granted</span>
                                </span>
                                <span v-else class="as-muted">—</span>
                            </td>
                            <td class="as-td-num">
                                <span class="as-num" :class="store.salesThisMonth > 0 ? 'as-num--active' : 'as-num--zero'">
                                    {{ store.salesThisMonth.toLocaleString() }}
                                </span>
                            </td>
                            <td class="as-td-num">
                                <span class="as-num">{{ store.totalSales.toLocaleString() }}</span>
                            </td>
                            <td class="as-td-num">
                                <span class="as-num as-num--muted">{{ store.totalReceipts.toLocaleString() }}</span>
                            </td>
                            <td class="as-date">{{ formatDate(store.createdAt) }}</td>
                        </tr>
                        <tr v-if="sortedStores.length === 0">
                            <td colspan="7" class="as-empty">No stores match your search.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="as-footer">
                <!-- Pagination -->
                <div v-if="totalPages > 1" class="as-pagination">
                    <button class="as-page-btn" :disabled="page === 1" @click="loadPage(page - 1)">←</button>
                    <span class="as-page-info">Page {{ page }} of {{ totalPages }}</span>
                    <button class="as-page-btn" :disabled="page === totalPages" @click="loadPage(page + 1)">→</button>
                </div>
                <!-- Active-store billing summary -->
                <div v-if="activeStoresThisMonth > 0" class="as-billing-hint">
                    <span class="as-billing-dot"></span>
                    {{ activeStoresThisMonth }} store{{ activeStoresThisMonth !== 1 ? 's' : '' }} had sales in {{ monthLabel }}
                    — {{ totalSalesMonth.toLocaleString() }} total transactions
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getAdminStores, type AdminStore } from '@/api/admin';
import { useToast } from '@/composables/useToast';

const { showToast } = useToast();

const loading = ref(false);
const error = ref<string | null>(null);
const stores = ref<AdminStore[]>([]);
const page = ref(1);
const total = ref(0);
const pageSize = ref(50);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const now = new Date();
const selectedMonth = ref(now.getMonth() + 1); // 1–12
const selectedYear = ref(now.getFullYear());

const search = ref('');
const sortBy = ref<'salesThisMonth' | 'totalSales' | 'totalReceipts' | 'createdAt'>('salesThisMonth');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const monthLabel = computed(() => `${MONTH_NAMES[selectedMonth.value - 1]} ${selectedYear.value}`);

const isCurrentMonth = computed(() =>
    selectedMonth.value === now.getMonth() + 1 && selectedYear.value === now.getFullYear()
);

const shiftMonth = (dir: 1 | -1) => {
    let m = selectedMonth.value + dir;
    let y = selectedYear.value;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    selectedMonth.value = m;
    selectedYear.value = y;
};

const goToCurrentMonth = () => {
    selectedMonth.value = now.getMonth() + 1;
    selectedYear.value = now.getFullYear();
};

const filteredStores = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return stores.value;
    return stores.value.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.owner?.email ?? '').toLowerCase().includes(q)
    );
});

const sortedStores = computed(() => {
    const list = [...filteredStores.value];
    if (sortBy.value === 'salesThisMonth') return list.sort((a, b) => b.salesThisMonth - a.salesThisMonth);
    if (sortBy.value === 'totalSales') return list.sort((a, b) => b.totalSales - a.totalSales);
    if (sortBy.value === 'totalReceipts') return list.sort((a, b) => b.totalReceipts - a.totalReceipts);
    return list;
});

const totalSalesAllTime = computed(() => stores.value.reduce((acc, s) => acc + s.totalSales, 0));
const totalSalesMonth = computed(() => stores.value.reduce((acc, s) => acc + s.salesThisMonth, 0));
const activeStoresThisMonth = computed(() => stores.value.filter((s) => s.salesThisMonth > 0).length);

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const loadPage = async (p: number) => {
    loading.value = true;
    error.value = null;
    try {
        const data = await getAdminStores(p, selectedMonth.value, selectedYear.value);
        stores.value = data.stores;
        total.value = data.total;
        pageSize.value = data.pageSize;
        page.value = data.page;
    } catch (e: unknown) {
        const err = e as { body?: { error?: { message?: string } } };
        error.value = err?.body?.error?.message || 'Failed to load stores.';
        showToast(error.value ?? 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

watch([selectedMonth, selectedYear], () => loadPage(1));

onMounted(() => loadPage(1));
</script>

<style scoped>
.as-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Inter', sans-serif;
}

/* ── Header ── */
.as-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.as-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.2rem;
}

.as-sub {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
}

.as-header-kpis {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.as-kpi {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.65rem 1rem;
    min-width: 110px;
}

.as-kpi--accent {
    border-color: rgba(13, 148, 136, 0.3);
    background: rgba(13, 148, 136, 0.04);
}

.as-kpi-value {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
}

.as-kpi--accent .as-kpi-value { color: #0f766e; }

.as-kpi-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    text-align: right;
}

/* ── Toolbar ── */
.as-toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
}

/* Month navigator */
.as-month-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.3rem 0.4rem;
}

.as-month-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.as-month-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.as-month-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.as-month-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: #0f172a;
    min-width: 130px;
    text-align: center;
    padding: 0 0.25rem;
}

.as-today-btn {
    font-size: 0.72rem;
    font-weight: 600;
    color: #0d9488;
    background: rgba(13, 148, 136, 0.08);
    border: none;
    border-radius: 6px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    transition: background 0.12s;
    white-space: nowrap;
}

.as-today-btn:hover { background: rgba(13, 148, 136, 0.15); }

/* Search */
.as-search {
    flex: 1;
    min-width: 200px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.55rem 0.875rem;
    font-size: 0.875rem;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border-color 0.15s;
}

.as-search:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }

/* Sort */
.as-sort-wrap { display: flex; align-items: center; gap: 0.5rem; }
.as-sort-label { font-size: 0.8rem; color: #64748b; white-space: nowrap; }
.as-sort-select {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #0f172a;
    background: #fff;
    cursor: pointer;
    outline: none;
}

/* ── Table ── */
.as-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    overflow-x: auto;
}

.as-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.as-table thead th {
    padding: 0.65rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
}

.as-th-num { text-align: right; }

.as-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.1s;
}

.as-table tbody tr:last-child { border-bottom: none; }
.as-table tbody tr:hover { background: #f8fafc; }
.as-table tbody td { padding: 0.8rem 1rem; vertical-align: middle; }
.as-td-num { text-align: right; }

/* Cell contents */
.as-store-name { font-weight: 600; color: #0f172a; }

.as-store-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.2rem;
}

.as-type-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 0.12rem 0.45rem;
    border-radius: 4px;
}

.as-type-badge--retail { background: rgba(13,148,136,0.1); color: #0f766e; }
.as-type-badge--wh { background: rgba(99,102,241,0.1); color: #4338ca; }

.as-currency { font-size: 0.75rem; color: #94a3b8; }

.as-owner-email { font-size: 0.85rem; color: #334155; word-break: break-all; }

.as-plan-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
}

.as-plan-badge--starter { background: #f1f5f9; color: #64748b; }
.as-plan-badge--standard { background: #eff6ff; color: #1d4ed8; }
.as-plan-badge--growth { background: #f0fdf4; color: #166534; }

.as-grant-tag {
    font-size: 0.58rem;
    background: rgba(234,179,8,0.15);
    color: #92400e;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-weight: 700;
    text-transform: uppercase;
}

.as-num { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
.as-num--active { color: #0d9488; }
.as-num--zero { color: #cbd5e1; font-weight: 600; }
.as-num--muted { color: #64748b; font-weight: 600; }

.as-date { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; }
.as-muted { color: #94a3b8; font-size: 0.82rem; }

.as-empty { text-align: center; padding: 2.5rem; color: #94a3b8; }

/* ── Footer ── */
.as-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.as-pagination {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.as-page-btn {
    padding: 0.4rem 0.9rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.12s;
}

.as-page-btn:hover:not(:disabled) { border-color: #0d9488; color: #0d9488; }
.as-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.as-page-info { font-size: 0.82rem; color: #64748b; }

/* Billing summary hint */
.as-billing-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem 0.875rem;
}

.as-billing-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #0d9488;
    flex-shrink: 0;
}

/* States */
.as-state { padding: 2rem; text-align: center; color: #64748b; background: #f8fafc; border-radius: 10px; }
.as-state--error { color: #b91c1c; background: #fef2f2; }
</style>
