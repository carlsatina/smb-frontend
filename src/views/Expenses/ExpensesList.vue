<template>
    <section class="ex-page">
        <PullToRefresh :on-refresh="loadExpenses" :disabled="isLoading" />

        <div class="ex-shell">
            <header class="ex-header">
                <div class="ex-title">
                    <span class="ex-eyebrow">Procurement</span>
                    <h1>Expenses</h1>
                    <p>Itemized business expenses for {{ currentStoreLabel }}.</p>
                </div>
                <div class="header-actions">
                    <button v-if="canWrite" class="primary-button" :disabled="!storeId" @click="openCreate">
                        <mdicon name="plus" size="16" />
                        Add expense
                    </button>
                    <span v-else-if="storeId" class="readonly-chip">View-only access</span>
                </div>
            </header>

            <div v-if="!storeId && !isLoading" class="panel-state">
                Select or create a store to track expenses.
            </div>

            <template v-else>
                <!-- STAT STRIP -->
                <div class="stat-strip">
                    <div class="stat">
                        <span class="stat-value">{{ formatMoney(filteredTotal) }}</span>
                        <span class="stat-label">{{ monthLabel }}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">{{ expenses.length }}</span>
                        <span class="stat-label">Entries</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value stat-value--text">{{ topCategory ? topCategory.category : '—' }}</span>
                        <span class="stat-label">{{ topCategory ? `Top · ${formatMoney(topCategory.total)}` : 'Top category' }}</span>
                    </div>
                </div>

                <!-- PANEL -->
                <section class="ex-panel">
                    <div class="panel-toolbar">
                        <div class="month-nav">
                            <button class="month-nav-btn" title="Previous month" @click="prevMonth">
                                <mdicon name="chevron-left" size="16" />
                            </button>
                            <span class="month-label">
                                <mdicon name="calendar-range-outline" size="15" />
                                {{ monthLabel }}
                            </span>
                            <button class="month-nav-btn" title="Next month" @click="nextMonth">
                                <mdicon name="chevron-right" size="16" />
                            </button>
                        </div>
                        <select v-model="selectedCategory" class="category-select" @change="loadExpenses">
                            <option value="">All categories</option>
                            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                        </select>
                    </div>

                    <SkeletonLoader v-if="isLoading" :rows="6" label="Loading expenses…" />

                    <div v-else-if="expenses.length === 0" class="empty-state">
                        <mdicon name="cash-minus" size="34" class="empty-icon" />
                        <p class="empty-heading">No expenses for {{ monthLabel }}</p>
                        <p class="empty-sub">{{ selectedCategory ? 'Try a different category or month.' : 'Record rent, utilities, supplies, and other costs here.' }}</p>
                    </div>

                    <div v-else class="table-wrap">
                        <table class="ex-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Note</th>
                                    <th class="num">Amount</th>
                                    <th>Added by</th>
                                    <th v-if="canWrite" class="align-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="ex in expenses"
                                    :key="ex.id"
                                    :class="{ 'row-clickable': canWrite }"
                                    @click="canWrite && openEdit(ex)"
                                >
                                    <td class="col-date">{{ formatDate(ex.date) }}</td>
                                    <td class="col-cat"><span class="cat-chip">{{ ex.category }}</span></td>
                                    <td class="col-note">{{ ex.note || '—' }}</td>
                                    <td class="col-amount num">{{ formatMoney(ex.amount) }}</td>
                                    <td class="col-by">{{ ex.createdBy?.fullName || ex.createdBy?.email || '—' }}</td>
                                    <td v-if="canWrite" class="col-actions" @click.stop>
                                        <button class="icon-btn" title="Edit" :aria-label="`Edit expense`" @click="openEdit(ex)">
                                            <mdicon name="pencil-outline" size="17" />
                                        </button>
                                        <button class="icon-btn icon-btn--danger" title="Delete" :aria-label="`Delete expense`" @click="confirmDelete(ex)">
                                            <mdicon name="trash-can-outline" size="17" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td :colspan="canWrite ? 3 : 3" class="tfoot-label">{{ monthLabel }} total</td>
                                    <td class="col-amount num num--strong">{{ formatMoney(filteredTotal) }}</td>
                                    <td :colspan="canWrite ? 2 : 1"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            </template>
        </div>

        <!-- Add / edit modal -->
        <teleport to="body">
            <transition name="modal-fade">
                <div v-if="formModal.show" class="modal-backdrop" @click.self="closeForm">
                    <div class="modal-box" role="dialog" aria-modal="true">
                        <div class="modal-header">
                            <div>
                                <h2>{{ formModal.editId ? 'Edit expense' : 'Add expense' }}</h2>
                                <p>Expenses count against profit in reports.</p>
                            </div>
                            <button class="modal-close" @click="closeForm" aria-label="Close">
                                <mdicon name="close" size="20" />
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="modal-grid">
                                <label class="form-field">
                                    <span>Date</span>
                                    <input type="date" v-model="formModal.date" />
                                </label>
                                <label class="form-field">
                                    <span>Amount</span>
                                    <input ref="amountInput" type="number" v-model.number="formModal.amount" min="0" step="0.01" placeholder="0.00" />
                                </label>
                            </div>
                            <label class="form-field">
                                <span>Category</span>
                                <select v-model="formModal.category">
                                    <option value="" disabled>Select a category</option>
                                    <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                                </select>
                                <p v-if="categoryOptions.length === 0" class="field-hint">
                                    No categories yet — add some in Store Settings.
                                </p>
                            </label>
                            <label class="form-field">
                                <span>Note <em>optional</em></span>
                                <textarea v-model="formModal.note" rows="2" maxlength="500"></textarea>
                            </label>
                            <div class="modal-footer">
                                <button class="ghost-button" :disabled="formModal.saving" @click="closeForm">Cancel</button>
                                <button class="primary-button" :disabled="!canSave || formModal.saving" @click="saveExpense">
                                    {{ formModal.saving ? 'Saving…' : formModal.editId ? 'Save changes' : 'Add expense' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </teleport>

        <ConfirmModal
            :show="deleteModal.show"
            title="Delete expense"
            :message="deleteMessage"
            confirm-text="Delete"
            variant="danger"
            :loading="deleteModal.loading"
            @confirm="onDeleteConfirm"
            @cancel="deleteModal.show = false"
            @update:show="deleteModal.show = $event"
        />
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { useToast } from '@/composables/useToast';
import { canAccess } from '@/utils/roleAccess';
import {
    type Expense,
    createExpense,
    deleteExpense,
    listExpenses,
    updateExpense,
} from '@/api/expenses';
import ConfirmModal from '@/components/ConfirmModal.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const expenses = ref<Expense[]>([]);
const isLoading = ref(false);

const storeId = computed(() => storeContext.currentStoreId);
const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'expensesWrite'));
const categoryOptions = computed(() => storeContext.currentStore?.expenseCategoryOptions ?? []);
const currency = computed(() => storeContext.currentStore?.currency || 'PHP');

const storeTimezone = computed(() => storeContext.currentStore?.timezone || 'Asia/Manila');

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

// Month being viewed (1-based month). Defaults to the current month.
const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const selectedCategory = ref('');

const monthLabel = computed(() => {
    const d = new Date(Date.UTC(year.value, month.value - 1, 1));
    return d.toLocaleString('default', { timeZone: storeTimezone.value, month: 'long', year: 'numeric' });
});

// First/last calendar day of the selected month as YYYY-MM-DD (expenses are
// stored as date-only, so a plain month range is what the API expects).
const pad = (n: number) => String(n).padStart(2, '0');
const monthRange = computed(() => {
    const lastDay = new Date(year.value, month.value, 0).getDate();
    return {
        from: `${year.value}-${pad(month.value)}-01`,
        to: `${year.value}-${pad(month.value)}-${pad(lastDay)}`,
    };
});

const filteredTotal = computed(() => expenses.value.reduce((sum, e) => sum + Number(e.amount || 0), 0));

const topCategory = computed(() => {
    if (expenses.value.length === 0) return null;
    const totals = new Map<string, number>();
    expenses.value.forEach((e) => {
        totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount || 0));
    });
    let best: { category: string; total: number } | null = null;
    totals.forEach((total, category) => {
        if (!best || total > best.total) best = { category, total };
    });
    return best;
});

const formatMoney = (v: number) =>
    Number(v || 0).toLocaleString('en-PH', {
        style: 'currency',
        currency: currency.value,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDate = (d: string) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
    }).format(date);
};

const loadExpenses = async () => {
    if (!storeId.value) {
        expenses.value = [];
        return;
    }
    isLoading.value = true;
    try {
        const res = await listExpenses(storeId.value, {
            from: monthRange.value.from,
            to: monthRange.value.to,
            category: selectedCategory.value || undefined,
        });
        expenses.value = res.expenses;
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Unable to load expenses.', 'error');
    } finally {
        isLoading.value = false;
    }
};

const prevMonth = () => {
    if (month.value === 1) { month.value = 12; year.value--; }
    else month.value--;
    loadExpenses();
};

const nextMonth = () => {
    if (month.value === 12) { month.value = 1; year.value++; }
    else month.value++;
    loadExpenses();
};

// ── Add / edit ──
// Today's date (YYYY-MM-DD) in the store's timezone, so the default date doesn't
// land on the wrong day near midnight across a timezone offset.
const todayStr = () => {
    const tz = storeContext.currentStore?.timezone || 'Asia/Manila';
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const p: Record<string, string> = {};
    parts.forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
};

const formModal = reactive<{
    show: boolean;
    editId: string | null;
    date: string;
    amount: number | null;
    category: string;
    note: string;
    saving: boolean;
}>({
    show: false,
    editId: null,
    date: todayStr(),
    amount: null,
    category: '',
    note: '',
    saving: false,
});

const canSave = computed(
    () => !!formModal.date && !!formModal.category && !!formModal.amount && formModal.amount > 0
);

const amountInput = ref<HTMLInputElement | null>(null);
const focusAmount = () => nextTick(() => amountInput.value?.focus());

const openCreate = () => {
    formModal.editId = null;
    formModal.date = todayStr();
    formModal.amount = null;
    formModal.category = categoryOptions.value[0] ?? '';
    formModal.note = '';
    formModal.saving = false;
    formModal.show = true;
    focusAmount();
};

const openEdit = (ex: Expense) => {
    formModal.editId = ex.id;
    formModal.date = ex.date.slice(0, 10);
    formModal.amount = Number(ex.amount);
    formModal.category = ex.category;
    formModal.note = ex.note ?? '';
    formModal.saving = false;
    formModal.show = true;
    focusAmount();
};

const closeForm = () => {
    if (formModal.saving) return;
    formModal.show = false;
};

const saveExpense = async () => {
    if (!storeId.value || !canSave.value) return;
    formModal.saving = true;
    const payload = {
        date: formModal.date,
        amount: Number(formModal.amount),
        category: formModal.category,
        note: formModal.note.trim() || null,
    };
    try {
        if (formModal.editId) {
            await updateExpense(storeId.value, formModal.editId, payload);
            showToast('Expense updated.', 'success');
        } else {
            await createExpense(storeId.value, payload);
            showToast('Expense added.', 'success');
        }
        formModal.show = false;
        await loadExpenses();
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Unable to save expense.', 'error');
    } finally {
        formModal.saving = false;
    }
};

// ── Delete ──
const deleteModal = reactive<{ show: boolean; loading: boolean; target: Expense | null }>({
    show: false,
    loading: false,
    target: null,
});

const deleteMessage = computed(() => {
    const t = deleteModal.target;
    if (!t) return '';
    return `Delete the ${formatMoney(Number(t.amount))} ${t.category} expense from ${formatDate(t.date)}? This cannot be undone.`;
});

const confirmDelete = (ex: Expense) => {
    deleteModal.target = ex;
    deleteModal.show = true;
};

const onDeleteConfirm = async () => {
    if (!storeId.value || !deleteModal.target) return;
    deleteModal.loading = true;
    try {
        await deleteExpense(storeId.value, deleteModal.target.id);
        deleteModal.show = false;
        deleteModal.target = null;
        await loadExpenses();
        showToast('Expense deleted.', 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Unable to delete expense.', 'error');
    } finally {
        deleteModal.loading = false;
    }
};

onMounted(loadExpenses);
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.ex-page {
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
.ex-shell {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.ex-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.ex-eyebrow {
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

.ex-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.ex-title p {
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

.readonly-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: #f1f5f9;
    border: 1px solid var(--c-border);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-muted);
    white-space: nowrap;
}

/* ============================================================
   STAT STRIP
============================================================ */
.stat-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    overflow: hidden;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem 1.4rem;
    border-left: 1px solid var(--c-border);
    min-width: 0;
}

.stat:first-child { border-left: none; }

.stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stat-value--text { font-size: 1.15rem; padding-top: 0.2rem; }

.stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ============================================================
   PANEL & TOOLBAR
============================================================ */
.ex-panel {
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
    justify-content: space-between;
    flex-wrap: wrap;
}

.month-nav {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 10px;
    padding: 0.25rem;
}

.month-nav-btn {
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

.month-nav-btn:hover { background: #f1f5f9; color: var(--c-text); }

.month-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    white-space: nowrap;
    min-width: 150px;
    justify-content: center;
}

.category-select {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 170px;
}

.category-select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

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

.ex-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.ex-table thead th {
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

.ex-table thead th.num { text-align: right; }
.ex-table thead th.align-right { text-align: right; }

.ex-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.ex-table tbody tr:last-child { border-bottom: none; }
.ex-table tbody tr:hover { background: #f8fafc; }
.ex-table tbody tr.row-clickable { cursor: pointer; }

.ex-table tbody td {
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
}

.col-date {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.cat-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
}

.col-note {
    color: var(--c-muted);
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ex-table td.num {
    text-align: right;
    font-weight: 700;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.num--strong { font-weight: 800; color: var(--c-accent-dark); }

.col-by { color: var(--c-muted); font-size: 0.82rem; }

.col-actions {
    text-align: right;
    white-space: nowrap;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}

.icon-btn:hover { background: rgba(13, 148, 136, 0.08); color: var(--c-accent-dark); }
.icon-btn--danger:hover { background: #fef2f2; color: #dc2626; }

.ex-table tfoot td {
    padding: 0.8rem 0.9rem;
    border-top: 1.5px solid var(--c-border);
}

.tfoot-label {
    text-align: right;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
    white-space: nowrap;
}

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
   MODAL
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
    max-width: 440px;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
}

.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.5rem 1.75rem 0;
}

.modal-header h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0 0 0.2rem;
}

.modal-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.82rem;
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

.modal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.25rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}

.form-field > span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text);
}

.form-field > span em {
    font-style: normal;
    font-weight: 400;
    color: var(--c-muted);
}

.form-field input,
.form-field select,
.form-field textarea {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.6rem 0.875rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.form-field input::placeholder,
.form-field textarea::placeholder { color: #94a3b8; }

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-field textarea { resize: vertical; }

.field-hint {
    font-size: 0.75rem;
    color: #b45309;
    margin: 0.1rem 0 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }

.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .ex-page { padding: 1rem 0.875rem 2.5rem; }
    .ex-shell { gap: 1rem; }
    .ex-header { flex-direction: column; gap: 0.875rem; }
    .ex-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .stat { padding: 0.75rem 0.7rem; }
    .stat-value { font-size: 1rem; }
    .stat-value--text { font-size: 0.9rem; }
    .stat-label { font-size: 0.6rem; }

    .ex-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; flex-direction: column; align-items: stretch; }
    .month-nav { justify-content: space-between; }
    .month-label { flex: 1; }
    .category-select { min-width: 0; width: 100%; }

    .modal-grid { grid-template-columns: 1fr; }

    /* ── Table → card view ── */
    .ex-table thead { display: none; }
    .ex-table,
    .ex-table tbody { display: block; }
    .ex-table tfoot { display: block; }
    .ex-table tfoot tr {
        display: flex;
        justify-content: flex-end;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.85rem 1rem 0;
    }
    .ex-table tfoot td { padding: 0; border: none; }
    .ex-table tfoot td:last-child { display: none; }
    .ex-table tfoot .tfoot-label + td { border: none; }

    .ex-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 0.875rem 1rem;
        gap: 0.2rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .ex-table tbody tr:last-child { border-bottom: none; }

    .ex-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    .ex-table tbody td.col-cat { grid-column: 1; grid-row: 1; }
    .ex-table tbody td.col-amount {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }
    .ex-table tbody td.col-note {
        grid-column: 1 / -1;
        grid-row: 2;
        padding-top: 0.25rem;
        white-space: normal;
        max-width: none;
        font-size: 0.8rem;
    }
    .ex-table tbody td.col-date {
        grid-column: 1;
        grid-row: 3;
        padding-top: 0.2rem;
        font-size: 0.75rem;
        color: var(--c-muted);
    }
    .ex-table tbody td.col-by {
        grid-column: 2;
        grid-row: 3;
        padding-top: 0.2rem;
        text-align: right;
        font-size: 0.75rem;
    }
    .ex-table tbody td.col-actions {
        grid-column: 1 / -1;
        grid-row: 4;
        display: flex;
        justify-content: flex-end;
        gap: 0.25rem;
        padding-top: 0.35rem;
    }
}
</style>
