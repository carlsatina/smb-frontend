<template>
    <div class="ex-page">
        <div class="ex-header">
            <div>
                <h1 class="ex-title">Expenses</h1>
                <p class="ex-subtitle">Track itemized business expenses for this store.</p>
            </div>
            <button v-if="canWrite" class="primary-button" :disabled="!storeId" @click="openCreate">
                <mdicon name="plus" size="16" /> Add expense
            </button>
            <span v-else-if="storeId" class="ex-note">View-only access</span>
        </div>

        <div class="ex-controls">
            <div class="ex-month-nav">
                <button class="ghost-button ex-nav-btn" title="Previous month" @click="prevMonth">
                    <mdicon name="chevron-left" size="18" />
                </button>
                <span class="ex-month-label">{{ monthLabel }}</span>
                <button class="ghost-button ex-nav-btn" title="Next month" @click="nextMonth">
                    <mdicon name="chevron-right" size="18" />
                </button>
            </div>
            <label class="ex-filter">
                <span>Category</span>
                <select v-model="selectedCategory" class="ex-input" @change="loadExpenses">
                    <option value="">All categories</option>
                    <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                </select>
            </label>
            <div class="ex-total">
                <span class="ex-total-label">Total</span>
                <span class="ex-total-value">{{ formatMoney(filteredTotal) }}</span>
            </div>
        </div>

        <div class="ex-table-wrap">
            <table class="ex-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Note</th>
                        <th class="ex-num">Amount</th>
                        <th>Added by</th>
                        <th v-if="canWrite" class="ex-actions-col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="isLoading">
                        <td :colspan="canWrite ? 6 : 5" class="ex-empty">Loading…</td>
                    </tr>
                    <tr v-else-if="expenses.length === 0">
                        <td :colspan="canWrite ? 6 : 5" class="ex-empty">No expenses for {{ monthLabel }}.</td>
                    </tr>
                    <template v-else>
                        <tr v-for="ex in expenses" :key="ex.id">
                            <td>{{ formatDate(ex.date) }}</td>
                            <td><span class="ex-cat-chip">{{ ex.category }}</span></td>
                            <td class="ex-note-cell">{{ ex.note || '—' }}</td>
                            <td class="ex-num fw-bold">{{ formatMoney(ex.amount) }}</td>
                            <td class="ex-muted">{{ ex.createdBy?.fullName || ex.createdBy?.email || '—' }}</td>
                            <td v-if="canWrite" class="ex-actions-col">
                                <button class="btn-icon btn-warning-soft" title="Edit" @click="openEdit(ex)">
                                    <mdicon name="pencil" size="14" />
                                </button>
                                <button class="btn-icon btn-danger-soft" title="Delete" @click="confirmDelete(ex)">
                                    <mdicon name="close" size="14" />
                                </button>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Add / edit modal -->
        <div v-if="formModal.show" class="ex-modal-backdrop" @click.self="closeForm">
            <div class="ex-modal">
                <h3>{{ formModal.editId ? 'Edit expense' : 'Add expense' }}</h3>
                <div class="ex-form-group">
                    <label>Date</label>
                    <input type="date" v-model="formModal.date" class="form-control" />
                </div>
                <div class="ex-form-group">
                    <label>Amount</label>
                    <input type="number" v-model.number="formModal.amount" class="form-control" min="0" step="0.01" />
                </div>
                <div class="ex-form-group">
                    <label>Category</label>
                    <select v-model="formModal.category" class="form-control">
                        <option value="" disabled>Select a category</option>
                        <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
                    </select>
                    <p v-if="categoryOptions.length === 0" class="ex-hint">
                        No categories yet — add some in Store Settings.
                    </p>
                </div>
                <div class="ex-form-group">
                    <label>Note <span class="ex-optional">(optional)</span></label>
                    <textarea v-model="formModal.note" class="form-control" rows="2" maxlength="500"></textarea>
                </div>
                <div class="ex-modal-actions">
                    <button class="ghost-button" :disabled="formModal.saving" @click="closeForm">Cancel</button>
                    <button class="primary-button" :disabled="!canSave || formModal.saving" @click="saveExpense">
                        {{ formModal.saving ? 'Saving…' : 'Save' }}
                    </button>
                </div>
            </div>
        </div>

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
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
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

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const expenses = ref<Expense[]>([]);
const isLoading = ref(false);

const storeId = computed(() => storeContext.currentStoreId);
const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'expensesWrite'));
const categoryOptions = computed(() => storeContext.currentStore?.expenseCategoryOptions ?? []);
const currency = computed(() => storeContext.currentStore?.currency || 'PHP');

const storeTimezone = computed(() => storeContext.currentStore?.timezone || 'Asia/Manila');

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

const openCreate = () => {
    formModal.editId = null;
    formModal.date = todayStr();
    formModal.amount = null;
    formModal.category = categoryOptions.value[0] ?? '';
    formModal.note = '';
    formModal.saving = false;
    formModal.show = true;
};

const openEdit = (ex: Expense) => {
    formModal.editId = ex.id;
    formModal.date = ex.date.slice(0, 10);
    formModal.amount = Number(ex.amount);
    formModal.category = ex.category;
    formModal.note = ex.note ?? '';
    formModal.saving = false;
    formModal.show = true;
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
.ex-page { padding: 1.5rem; max-width: 1100px; margin: 0 auto; font-family: var(--app-font-sans, 'Inter', sans-serif); }
.ex-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.ex-title { font-size: 1.4rem; font-weight: 700; margin: 0; }
.ex-subtitle { font-size: 0.85rem; color: #6b7280; margin: 0.2rem 0 0; }
.ex-note { font-size: 0.8rem; color: #6b7280; }

.ex-controls { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.ex-month-nav { display: flex; align-items: center; gap: 0.5rem; }
.ex-nav-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.4rem 0.5rem; }
.ex-month-label { font-weight: 600; min-width: 130px; text-align: center; font-size: 0.95rem; }
.ex-filter { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
.ex-input { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.45rem 0.6rem; font-size: 0.875rem; background: #fff; }
.ex-input:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
.ex-total { margin-left: auto; text-align: right; }
.ex-total-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
.ex-total-value { font-size: 1.25rem; font-weight: 700; color: #0f766e; }

.ex-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 10px; }
.ex-table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 0.85rem; }
.ex-table th { background: #f0fdfa; border-bottom: 2px solid #99f6e4; padding: 0.6rem 0.75rem; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #0f766e; }
.ex-table td { padding: 0.55rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.ex-table tbody tr:hover { background: #f9fafb; }
.ex-num { text-align: right; }
.ex-muted { color: #6b7280; }
.ex-note-cell { color: #374151; max-width: 280px; }
.ex-actions-col { text-align: right; white-space: nowrap; }
.ex-empty { text-align: center; color: #9ca3af; padding: 2rem; }
.fw-bold { font-weight: 700; }

.ex-cat-chip { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 0.75rem; font-weight: 600; }

.btn-icon { padding: 0.25rem 0.4rem; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; margin-left: 0.25rem; }
.btn-warning-soft { background: #fef3c7; color: #92400e; }
.btn-warning-soft:hover { background: #fde68a; }
.btn-danger-soft { background: #fee2e2; color: #991b1b; }
.btn-danger-soft:hover { background: #fecaca; }

.primary-button { display: inline-flex; align-items: center; gap: 0.35rem; background: #0d9488; color: #fff; border: none; border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
.primary-button:hover:not(:disabled) { background: #0f766e; }
.primary-button:disabled { opacity: 0.6; cursor: not-allowed; }
.ghost-button { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 500; color: #475569; cursor: pointer; }
.ghost-button:hover:not(:disabled) { background: #f1f5f9; }
.ghost-button:disabled { opacity: 0.6; cursor: not-allowed; }

.ex-modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.ex-modal { background: #fff; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 440px; box-shadow: 0 24px 48px rgba(15,23,42,0.2); }
.ex-modal h3 { margin: 0 0 1.1rem; font-size: 1.1rem; font-weight: 700; }
.ex-form-group { margin-bottom: 0.85rem; }
.ex-form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.3rem; }
.ex-optional { color: #9ca3af; font-weight: 400; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 0.55rem 0.7rem; font-size: 0.9rem; font-family: inherit; background: #fff; }
.form-control:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
.ex-hint { font-size: 0.75rem; color: #b45309; margin: 0.35rem 0 0; }
.ex-modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.25rem; }

@media (max-width: 640px) {
    .ex-page { padding: 0.85rem; }
    .ex-total { margin-left: 0; width: 100%; text-align: left; }
}
</style>
