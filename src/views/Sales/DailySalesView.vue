<template>
    <div class="ds-page">
        <div class="ds-header">
            <div>
                <h1 class="ds-title">Daily Sales</h1>
                <p class="ds-subtitle">Review per-day totals and staff cash entries</p>
            </div>
            <div class="ds-header-actions">
                <button v-if="!isCashierRole" class="secondary-button button-compact" @click="openGoalModal">
                    <mdicon name="target" size="16" />
                    Goal: {{ goal > 0 ? formatMoney(goal) : 'Not set' }}
                </button>
                <button class="primary-button button-compact" :disabled="isAdding" @click="startAdding">
                    <mdicon name="plus" size="16" /> Add Entry
                </button>
            </div>
        </div>

        <div class="ds-controls">
            <div class="ds-month-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="prevMonth">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="ds-month-label">{{ monthLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="nextMonth">
                    <mdicon name="chevron-right" size="16" />
                </button>
            </div>
            <span class="ds-record-count">{{ rows.length }} record{{ rows.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="ds-table-wrap">
            <table class="ds-table">
                <thead>
                    <tr>
                        <th class="col-date">Date</th>
                        <template v-for="m in cashierMembers" :key="m.userId">
                            <th>COH ({{ memberName(m) }})</th>
                            <th>GCash ({{ memberName(m) }})</th>
                        </template>
                        <th>Senior</th>
                        <th>Expense</th>
                        <th>Total GCash</th>
                        <th>Total COH</th>
                        <template v-if="!isCashierRole">
                            <th class="col-highlight">Total Sales</th>
                            <th class="col-highlight">POS</th>
                            <th>Actual COH</th>
                            <th>Kulang Remit</th>
                            <th>Short if (-)</th>
                            <th>Sales Needed</th>
                        </template>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- ── Inline add row ── -->
                    <tr v-if="isAdding" class="ds-add-row">
                        <td class="col-date">
                            <input
                                type="date"
                                v-model="addForm.date"
                                class="ds-input"
                                @change="onAddDateChange"
                            />
                        </td>
                        <template v-for="m in cashierMembers" :key="m.userId">
                            <td>
                                <div class="ds-coh-cell">
                                    <span class="ds-coh-amount">{{ formatMoney(addCashierCoh(m.userId)) }}</span>
                                    <button class="btn-denom-edit" @click="openEditDenomModal(m)">Denoms</button>
                                </div>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    v-model.number="addForm.cashiers[m.userId].gcashAmount"
                                    class="ds-input ds-input--num"
                                    min="0"
                                    step="0.01"
                                />
                            </td>
                        </template>
                        <td class="ds-computed">
                            <span v-if="addForm.posLoading" class="ds-loading-dot">…</span>
                            <span v-else>{{ formatMoney(addForm.seniorTotal) }}</span>
                        </td>
                        <td>
                            <input
                                type="number"
                                v-model.number="addForm.expense"
                                class="ds-input ds-input--num"
                                min="0"
                                step="0.01"
                            />
                        </td>
                        <td class="ds-computed">{{ formatMoney(addTotalGcash) }}</td>
                        <td class="ds-computed">{{ formatMoney(addTotalCoh) }}</td>
                        <template v-if="!isCashierRole">
                            <td class="ds-computed col-highlight fw-bold">{{ formatMoney(addTotalSales) }}</td>
                            <td class="ds-computed col-highlight">
                                <span v-if="addForm.posLoading" class="ds-loading-dot">…</span>
                                <span v-else>{{ formatMoney(addForm.posTotal) }}</span>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    v-model.number="addForm.actualCoh"
                                    class="ds-input ds-input--num"
                                    min="0"
                                    step="0.01"
                                    :placeholder="formatMoney(addTotalCoh)"
                                />
                            </td>
                            <td :class="addKulangRemit > 0 ? 'text-danger' : ''">
                                {{ formatMoney(addKulangRemit) }}
                            </td>
                            <td :class="addShortIf < 0 ? 'text-danger' : 'text-success'">
                                {{ formatMoney(addShortIf) }}
                            </td>
                            <td :class="addSalesNeeded < 0 ? 'text-success' : 'text-danger'">
                                {{ formatMoney(addSalesNeeded) }}
                            </td>
                        </template>
                        <td class="col-actions">
                            <button
                                class="btn btn-sm btn-success-solid"
                                :disabled="addForm.saving || !addForm.date"
                                @click="saveAddRow"
                            >
                                {{ addForm.saving ? '…' : 'Save' }}
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" @click="cancelAdding">
                                Cancel
                            </button>
                        </td>
                    </tr>

                    <!-- ── Loading / empty ── -->
                    <tr v-if="isLoading">
                        <td :colspan="headerCount" class="ds-empty">Loading…</td>
                    </tr>
                    <tr v-else-if="rows.length === 0 && !isAdding">
                        <td :colspan="headerCount" class="ds-empty">No entries for this month.</td>
                    </tr>

                    <!-- ── Existing rows ── -->
                    <template v-else>
                        <tr v-for="row in rows" :key="row.id" :class="{ 'ds-editing-row': inlineEdit.rowId === row.id }">
                            <td class="col-date">{{ formatDate(row.date) }}</td>

                            <!-- COH / GCash — editable inputs in edit mode -->
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <td v-if="inlineEdit.rowId === row.id">
                                    <div class="ds-coh-cell">
                                        <span class="ds-coh-amount">{{ formatMoney(inlineEditCoh(m.userId)) }}</span>
                                        <button class="btn-denom-edit" @click="openInlineEditDenomModal(m)">Denoms</button>
                                    </div>
                                </td>
                                <td v-else>
                                    <button class="denom-btn" @click="openReadDenomModal(row, m)">
                                        {{ formatMoney(getCashierCoh(row, m.userId)) }}
                                    </button>
                                </td>
                                <td v-if="inlineEdit.rowId === row.id">
                                    <input
                                        type="number"
                                        v-model.number="inlineEdit.cashiers[m.userId].gcashAmount"
                                        class="ds-input ds-input--num"
                                        min="0" step="0.01"
                                    />
                                </td>
                                <td v-else>{{ formatMoney(getCashierGcash(row, m.userId)) }}</td>
                            </template>

                            <!-- Senior — always readonly -->
                            <td>{{ formatMoney(row.totalSenior) }}</td>

                            <!-- Expense — input in edit mode (owner), plain text otherwise -->
                            <td v-if="inlineEdit.rowId === row.id && !isCashierRole">
                                <input type="number" v-model.number="inlineEdit.expense" class="ds-input ds-input--num" min="0" step="0.01" />
                            </td>
                            <td v-else>{{ formatMoney(row.expense) }}</td>

                            <!-- Computed totals -->
                            <td>{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalGcash) : formatMoney(row.totalGcash) }}</td>
                            <td>{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalCoh) : formatMoney(row.totalCoh) }}</td>

                            <!-- Owner-only columns -->
                            <template v-if="!isCashierRole">
                                <td class="col-highlight fw-bold">{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalSales) : formatMoney(row.totalSales) }}</td>
                                <td class="col-highlight">{{ formatMoney(row.pos) }}</td>
                                <td v-if="inlineEdit.rowId === row.id">
                                    <input
                                        type="number"
                                        v-model.number="inlineEdit.actualCoh"
                                        class="ds-input ds-input--num"
                                        min="0" step="0.01"
                                        :placeholder="formatMoney(inlineEditTotalCoh)"
                                    />
                                </td>
                                <td v-else>{{ formatMoney(row.actualCoh) }}</td>
                                <td :class="(inlineEdit.rowId === row.id ? inlineEditKulangRemit : row.kulangRemit) > 0 ? 'text-danger' : ''">
                                    {{ inlineEdit.rowId === row.id ? formatMoney(inlineEditKulangRemit) : formatMoney(row.kulangRemit) }}
                                </td>
                                <td :class="row.shortIf < 0 ? 'text-danger' : 'text-success'">{{ formatMoney(row.shortIf) }}</td>
                                <td :class="row.salesNeeded < 0 ? 'text-success' : 'text-danger'">{{ formatMoney(row.salesNeeded) }}</td>
                            </template>

                            <!-- Actions — always rendered to keep column count consistent -->
                            <td class="col-actions">
                                <template v-if="inlineEdit.rowId === row.id">
                                    <button
                                        class="btn btn-sm btn-success-solid"
                                        :disabled="inlineEdit.saving"
                                        @click="saveInlineEdit"
                                    >{{ inlineEdit.saving ? '…' : 'Save' }}</button>
                                    <button class="btn btn-sm btn-outline-secondary" @click="cancelInlineEdit">Cancel</button>
                                </template>
                                <template v-else-if="!isCashierRole">
                                    <button
                                        class="btn btn-icon btn-warning-soft"
                                        title="Edit entry"
                                        @click="openInlineEdit(row)"
                                    >
                                        <mdicon name="pencil" size="14" />
                                    </button>
                                    <button
                                        class="btn btn-icon btn-danger-soft"
                                        title="Delete entry"
                                        @click="confirmDelete(row)"
                                    >
                                        <mdicon name="close" size="14" />
                                    </button>
                                </template>
                            </td>
                        </tr>

                        <!-- Totals row -->
                        <tr class="ds-total-row">
                            <td class="fw-bold">Total</td>
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <td class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'cashAmount')) }}</td>
                                <td class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'gcashAmount')) }}</td>
                            </template>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalSenior')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('expense')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalGcash')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalCoh')) }}</td>
                            <template v-if="!isCashierRole">
                                <td class="col-highlight fw-bold">{{ formatMoney(sumAll('totalSales')) }}</td>
                                <td class="col-highlight fw-bold">{{ formatMoney(sumAll('pos')) }}</td>
                                <td class="fw-bold">{{ formatMoney(sumAll('actualCoh')) }}</td>
                                <td></td><td></td><td></td>
                            </template>
                            <td></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Denomination modal (editable for add row / inline edit, read-only for existing) -->
        <DenominationModal
            v-if="denomModal.open"
            :cashier-name="denomModal.cashierName"
            :editable="denomModal.editable"
            :model-value="denomModal.editable
                ? (denomModal.cashierUserId.startsWith('inline:')
                    ? inlineEdit.cashiers[denomModal.cashierUserId.slice(7)]
                    : addForm.cashiers[denomModal.cashierUserId])
                : undefined"
            :readonly-cashier="denomModal.editable ? undefined : denomModal.readonlyCashier"
            @update:model-value="onDenomUpdate"
            @confirm="denomModal.open = false"
            @close="denomModal.open = false"
        />

        <!-- Delete confirm modal -->
        <ConfirmModal
            :show="deleteModal.show"
            title="Delete Entry"
            :message="`Delete the entry for ${deleteModal.row ? formatDate(deleteModal.row.date) : ''}? This cannot be undone.`"
            confirm-text="Delete"
            variant="danger"
            :loading="deleteModal.loading"
            @confirm="onDeleteConfirm"
            @cancel="deleteModal.show = false"
            @update:show="deleteModal.show = $event"
        />

        <!-- Goal modal -->
        <div v-if="goalModal.open" class="ds-modal-backdrop" @click.self="goalModal.open = false">
            <div class="ds-modal">
                <h3>Set Daily Sales Goal</h3>
                <div class="ds-form-group">
                    <label>Daily Goal (₱)</label>
                    <input type="number" v-model.number="goalModal.value" class="form-control" min="0" step="0.01" />
                </div>
                <div class="ds-form-group">
                    <label>Effective From</label>
                    <input type="date" v-model="goalModal.date" class="form-control" />
                </div>
                <div class="ds-modal-actions">
                    <button class="btn btn-secondary" @click="goalModal.open = false">Cancel</button>
                    <button class="btn btn-primary" :disabled="goalModal.saving" @click="saveGoal">
                        {{ goalModal.saving ? 'Saving…' : 'Save Goal' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useStoreContextStore } from '@/stores/storeContext';
import {
    type CashierEntry,
    type DailySalesRow,
    createDailySalesEntry,
    deleteDailySalesEntry,
    getDailySalesGoal,
    getPosForDate,
    listDailySales,
    setDailySalesGoal,
    updateDailySalesEntry,
    upsertCashierEntry,
} from '@/api/dailySales';
import { listStoreMembers, type StoreMember } from '@/api/storeMembers';
import DenominationModal from '@/components/DenominationModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { useToast } from '@/composables/useToast';

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const rows = ref<DailySalesRow[]>([]);
const goal = ref(0);
const isLoading = ref(false);
const allMembers = ref<StoreMember[]>([]);

const storeTimezone = computed(() => storeContext.currentStore?.timezone || 'Asia/Manila');

const monthLabel = computed(() => {
    const d = new Date(Date.UTC(year.value, month.value - 1, 1));
    return d.toLocaleString('default', { timeZone: storeTimezone.value, month: 'long', year: 'numeric' });
});

const cashierMembers = computed(() => allMembers.value.filter(m => m.role === 'CASHIER'));

const isCashierRole = computed(() => storeContext.currentStore?.role === 'CASHIER');

// cashier: Date + COH/GCash pairs + Senior + Expense + Total GCash + Total COH + Actions = 1 + N*2 + 5
// owner: adds Total Sales, POS, Actual COH, Kulang Remit, Short if, Sales Needed = 1 + N*2 + 11
const headerCount = computed(() =>
    isCashierRole.value
        ? 1 + cashierMembers.value.length * 2 + 5
        : 1 + cashierMembers.value.length * 2 + 11
);

const memberName = (m: StoreMember) => m.fullName || m.email;

// ── Fetch ────────────────────────────────────────────────────
const loadData = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    isLoading.value = true;
    try {
        const [dataRes, goalRes] = await Promise.all([
            listDailySales(storeId, year.value, month.value),
            getDailySalesGoal(storeId),
        ]);
        rows.value = dataRes.rows;
        goal.value = goalRes.goal?.goal ?? 0;
    } finally {
        isLoading.value = false;
    }
};

const loadMembers = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const res = await listStoreMembers(storeId);
    allMembers.value = res.members;
};

onMounted(async () => {
    await Promise.all([loadData(), loadMembers()]);
});

const prevMonth = () => {
    if (month.value === 1) { month.value = 12; year.value--; }
    else month.value--;
    loadData();
};
const nextMonth = () => {
    if (month.value === 12) { month.value = 1; year.value++; }
    else month.value++;
    loadData();
};

// ── Formatters ───────────────────────────────────────────────
const formatMoney = (v: number) =>
    Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDate = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-PH', {
        timeZone: storeTimezone.value,
        month: 'numeric', day: 'numeric', year: 'numeric', weekday: 'short',
    });
};

// ── Row helpers ──────────────────────────────────────────────
const getCashierEntry = (row: DailySalesRow, userId: string) =>
    row.cashierEntries.find((c) => c.userId === userId);

const getCashierCoh = (row: DailySalesRow, userId: string) =>
    getCashierEntry(row, userId)?.cashAmount ?? 0;

const getCashierGcash = (row: DailySalesRow, userId: string) =>
    getCashierEntry(row, userId)?.gcashAmount ?? 0;

const sumAll = (field: keyof DailySalesRow) =>
    rows.value.reduce((s, r) => s + (r[field] as number), 0);

const sumCashierField = (userId: string, field: 'cashAmount' | 'gcashAmount') =>
    rows.value.reduce((s, r) => s + (getCashierEntry(r, userId)?.[field] ?? 0), 0);

// ── Denomination modal ───────────────────────────────────────
type DenomData = {
    denom1000: number; denom500: number; denom200: number;
    denom100: number; denom50: number; denom20: number; coins: number;
};

const denomModal = reactive({
    open: false,
    editable: false,
    cashierUserId: '',
    cashierName: '',
    readonlyCashier: null as CashierEntry | null,
});

const openReadDenomModal = (row: DailySalesRow, m: StoreMember) => {
    denomModal.editable = false;
    denomModal.cashierUserId = m.userId;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = getCashierEntry(row, m.userId) ?? null;
    denomModal.open = true;
};

const openEditDenomModal = (m: StoreMember) => {
    denomModal.editable = true;
    denomModal.cashierUserId = m.userId;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = null;
    denomModal.open = true;
};

const onDenomUpdate = (v: DenomData) => {
    const key = denomModal.cashierUserId;
    if (key.startsWith('inline:')) {
        const userId = key.slice(7);
        inlineEdit.cashiers[userId] = { ...inlineEdit.cashiers[userId], ...v };
    } else {
        addForm.cashiers[key] = { ...addForm.cashiers[key], ...v };
    }
};

// ── Inline add row ───────────────────────────────────────────
type CashierDraft = DenomData & { gcashAmount: number };

const defaultDraft = (): CashierDraft => ({
    denom1000: 0, denom500: 0, denom200: 0, denom100: 0, denom50: 0, denom20: 0, coins: 0, gcashAmount: 0,
});

const isAdding = ref(false);
const addForm = reactive({
    date: '',
    expense: 0 as number,
    seniorTotal: 0,
    actualCoh: null as number | null,
    cashiers: {} as Record<string, CashierDraft>,
    posTotal: 0,
    posLoading: false,
    saving: false,
});

const todayStr = () => {
    const tz = storeTimezone.value;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const p: Record<string, string> = {};
    parts.forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
};

const startAdding = () => {
    const draft: Record<string, CashierDraft> = {};
    cashierMembers.value.forEach((m) => { draft[m.userId] = defaultDraft(); });
    addForm.date = todayStr();
    addForm.expense = 0;
    addForm.seniorTotal = 0;
    addForm.actualCoh = null;
    addForm.cashiers = draft;
    addForm.posTotal = 0;
    addForm.saving = false;
    isAdding.value = true;
    fetchPos();
};

const cancelAdding = () => { isAdding.value = false; };

let posTimer: ReturnType<typeof setTimeout> | null = null;

const onAddDateChange = () => {
    // Reset all entered values for the new date
    addForm.expense = 0;
    addForm.actualCoh = null;
    addForm.posTotal = 0;
    addForm.seniorTotal = 0;
    cashierMembers.value.forEach((m) => {
        addForm.cashiers[m.userId] = defaultDraft();
    });

    if (posTimer) clearTimeout(posTimer);
    posTimer = setTimeout(fetchPos, 600);
};

const fetchPos = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !addForm.date) return;
    addForm.posLoading = true;
    try {
        const res = await getPosForDate(storeId, addForm.date);
        addForm.posTotal = res.pos;
        addForm.seniorTotal = res.seniorDiscount ?? 0;
    } catch {
        addForm.posTotal = 0;
        addForm.seniorTotal = 0;
    } finally {
        addForm.posLoading = false;
    }
};

const denomTotal = (d: CashierDraft) =>
    d.denom1000 * 1000 + d.denom500 * 500 + d.denom200 * 200 +
    d.denom100 * 100 + d.denom50 * 50 + d.denom20 * 20 + (d.coins || 0);

const addCashierCoh = (userId: string): number => {
    const d = addForm.cashiers[userId];
    return d ? denomTotal(d) : 0;
};

const addTotalCoh = computed(() =>
    cashierMembers.value.reduce((s, m) => s + addCashierCoh(m.userId), 0)
);

const addTotalGcash = computed(() =>
    cashierMembers.value.reduce((s, m) => s + (addForm.cashiers[m.userId]?.gcashAmount || 0), 0)
);

const addTotalSales = computed(() =>
    addTotalCoh.value + addTotalGcash.value + addForm.seniorTotal + (addForm.expense || 0)
);

const addActualCohVal = computed(() =>
    addForm.actualCoh != null ? addForm.actualCoh : addTotalCoh.value
);

const addKulangRemit = computed(() => addTotalCoh.value - addActualCohVal.value);
const addShortIf = computed(() => addTotalSales.value - addForm.posTotal);
const addSalesNeeded = computed(() => {
    const prevCumulative = rows.value[0]?.salesNeeded ?? 0;
    return prevCumulative + (goal.value - addTotalSales.value);
});

const saveAddRow = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !addForm.date) return;
    addForm.saving = true;
    try {
        const result = await createDailySalesEntry(storeId, {
            date: addForm.date,
            expense: addForm.expense || 0,
            actualCoh: addForm.actualCoh,
        });
        const entryId = (result as { entry: { id: string } }).entry.id;

        const cashierSaves = cashierMembers.value
            .filter((m) => {
                const d = addForm.cashiers[m.userId];
                return d && (denomTotal(d) > 0 || d.gcashAmount > 0);
            })
            .map((m) => {
                const d = addForm.cashiers[m.userId];
                return upsertCashierEntry(storeId, entryId, m.userId, {
                    denom1000: d.denom1000,
                    denom500: d.denom500,
                    denom200: d.denom200,
                    denom100: d.denom100,
                    denom50: d.denom50,
                    denom20: d.denom20,
                    coins: d.coins,
                    gcashAmount: d.gcashAmount,
                });
            });

        await Promise.all(cashierSaves);
        isAdding.value = false;
        await loadData();
        showToast('Entry saved', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save entry', 'error');
    } finally {
        addForm.saving = false;
    }
};

// ── Inline edit (existing rows) ──────────────────────────────
const inlineEdit = reactive({
    rowId: null as string | null,
    expense: 0 as number,
    actualCoh: null as number | null,
    cashiers: {} as Record<string, CashierDraft>,
    saving: false,
});

const openInlineEdit = (row: DailySalesRow) => {
    const draft: Record<string, CashierDraft> = {};
    cashierMembers.value.forEach((m) => {
        const existing = getCashierEntry(row, m.userId);
        draft[m.userId] = existing
            ? {
                denom1000: existing.denom1000,
                denom500: existing.denom500,
                denom200: existing.denom200,
                denom100: existing.denom100,
                denom50: existing.denom50,
                denom20: existing.denom20,
                coins: existing.coins,
                gcashAmount: existing.gcashAmount,
              }
            : defaultDraft();
    });
    inlineEdit.rowId = row.id;
    inlineEdit.expense = row.expense;
    inlineEdit.actualCoh = row.actualCoh;
    inlineEdit.cashiers = draft;
    inlineEdit.saving = false;
};

const cancelInlineEdit = () => { inlineEdit.rowId = null; };

const inlineEditCoh = (userId: string): number => {
    const d = inlineEdit.cashiers[userId];
    return d ? denomTotal(d) : 0;
};

const inlineEditTotalCoh = computed(() =>
    cashierMembers.value.reduce((s, m) => s + inlineEditCoh(m.userId), 0)
);

const inlineEditTotalGcash = computed(() =>
    cashierMembers.value.reduce((s, m) => s + (inlineEdit.cashiers[m.userId]?.gcashAmount || 0), 0)
);

const inlineEditActualCohVal = computed(() =>
    inlineEdit.actualCoh != null ? inlineEdit.actualCoh : inlineEditTotalCoh.value
);

const inlineEditKulangRemit = computed(() => inlineEditTotalCoh.value - inlineEditActualCohVal.value);

const inlineEditTotalSales = computed(() => {
    const row = rows.value.find(r => r.id === inlineEdit.rowId);
    return inlineEditTotalCoh.value + inlineEditTotalGcash.value + (row?.totalSenior ?? 0) + (inlineEdit.expense || 0);
});

const openInlineEditDenomModal = (m: StoreMember) => {
    denomModal.editable = true;
    denomModal.cashierUserId = `inline:${m.userId}`;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = null;
    denomModal.open = true;
};

const saveInlineEdit = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !inlineEdit.rowId) return;
    inlineEdit.saving = true;
    const entryId = inlineEdit.rowId;
    try {
        await updateDailySalesEntry(storeId, entryId, {
            expense: inlineEdit.expense || 0,
            actualCoh: inlineEdit.actualCoh,
        });
        const cashierSaves = cashierMembers.value.map((m) => {
            const d = inlineEdit.cashiers[m.userId];
            return upsertCashierEntry(storeId, entryId, m.userId, {
                denom1000: d.denom1000,
                denom500: d.denom500,
                denom200: d.denom200,
                denom100: d.denom100,
                denom50: d.denom50,
                denom20: d.denom20,
                coins: d.coins,
                gcashAmount: d.gcashAmount,
            });
        });
        await Promise.all(cashierSaves);
        inlineEdit.rowId = null;
        await loadData();
        showToast('Entry updated', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save', 'error');
    } finally {
        inlineEdit.saving = false;
    }
};

// ── Delete ───────────────────────────────────────────────────
const deleteModal = reactive({
    show: false,
    row: null as DailySalesRow | null,
    loading: false,
});

const confirmDelete = (row: DailySalesRow) => {
    deleteModal.row = row;
    deleteModal.show = true;
};

const onDeleteConfirm = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !deleteModal.row) return;
    deleteModal.loading = true;
    try {
        await deleteDailySalesEntry(storeId, deleteModal.row.id);
        deleteModal.show = false;
        deleteModal.row = null;
        await loadData();
        showToast('Entry deleted', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to delete', 'error');
    } finally {
        deleteModal.loading = false;
    }
};

// ── Goal modal ───────────────────────────────────────────────
const goalModal = reactive({ open: false, value: 0, date: todayStr(), saving: false });

const openGoalModal = () => {
    goalModal.value = goal.value;
    goalModal.date = todayStr();
    goalModal.open = true;
};

const saveGoal = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    goalModal.saving = true;
    try {
        await setDailySalesGoal(storeId, goalModal.value, goalModal.date);
        goal.value = goalModal.value;
        goalModal.open = false;
        await loadData();
        showToast('Goal updated', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save goal', 'error');
    } finally {
        goalModal.saving = false;
    }
};
</script>

<style scoped>
.ds-page { padding: 1.5rem; max-width: 100%; font-family: var(--app-font-sans); }
.ds-page input, .ds-page select, .ds-page button { font-family: inherit; }
.ds-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; gap: 1rem; flex-wrap: nowrap; }
.ds-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
.ds-subtitle { font-size: 0.82rem; color: #6b7280; margin: 0.2rem 0 0; }
.ds-header-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; white-space: nowrap; }

.ds-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.ds-month-nav { display: flex; align-items: center; gap: 0.5rem; }
.ds-month-label { font-weight: 600; min-width: 120px; text-align: center; }
.ds-record-count { font-size: 0.82rem; color: #6b7280; }

.ds-table-wrap { overflow: visible; border: 1px solid #e5e7eb; border-radius: 8px; }
.ds-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.ds-table th { background: #f0fdfa; border-bottom: 2px solid #99f6e4; padding: 0.5rem 0.4rem; text-align: left; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e; word-break: break-word; line-height: 1.3; }
.ds-table td { padding: 0.35rem 0.4rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; white-space: nowrap; }
.ds-table tbody tr:hover { background: #f9fafb; }
.col-date { min-width: 90px; white-space: normal; }
.col-highlight { background: #f0fdf4; }
.col-actions { display: flex; gap: 0.25rem; align-items: center; }
.ds-empty { text-align: center; color: #9ca3af; padding: 2rem; }
.ds-total-row td { background: #f9fafb; border-top: 2px solid #e5e7eb; }
.fw-bold { font-weight: 700; }
.text-danger { color: #dc2626; }
.text-success { color: #16a34a; }

/* Add row / inline edit row */
.ds-add-row td { background: #eff6ff; }
.ds-add-row td:hover { background: #eff6ff; }
.ds-editing-row td { background: #fefce8; }
.ds-editing-row td:hover { background: #fefce8; }
.ds-input { border: 1px solid #93c5fd; border-radius: 5px; padding: 0.25rem 0.35rem; font-size: 0.8rem; background: white; outline: none; }
.ds-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.ds-input--num { width: 65px; }
.ds-computed { color: #374151; font-weight: 500; }
.ds-loading-dot { color: #9ca3af; }
.ds-coh-cell { display: flex; flex-direction: row; align-items: center; gap: 0.35rem; white-space: nowrap; }
.ds-coh-amount { font-size: 0.8rem; font-weight: 500; }

.btn-denom-edit {
    padding: 0.2rem 0.5rem;
    font-size: 0.72rem;
    background: #dbeafe;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
}
.btn-denom-edit:hover { background: #bfdbfe; }

.btn-success-solid { background: #16a34a; color: white; border: none; padding: 0.3rem 0.75rem; border-radius: 5px; cursor: pointer; font-size: 0.82rem; }
.btn-success-solid:hover:not(:disabled) { background: #15803d; }
.btn-success-solid:disabled { opacity: 0.6; cursor: not-allowed; }

/* Existing row interactions */
.denom-btn { background: none; border: none; cursor: pointer; color: inherit; text-decoration: underline dotted #9ca3af; padding: 0; font-size: inherit; }
.denom-btn:hover { color: #2563eb; }
.cell-edit { background: none; border: none; cursor: pointer; color: inherit; padding: 0; font-size: inherit; width: 100%; text-align: left; }
.cell-edit:hover { color: #2563eb; text-decoration: underline; }

.btn-icon { padding: 0.25rem 0.4rem; border-radius: 4px; border: none; cursor: pointer; display: flex; align-items: center; }
.btn-warning-soft { background: #fef3c7; color: #92400e; }
.btn-warning-soft:hover { background: #fde68a; }
.btn-danger-soft { background: #fee2e2; color: #991b1b; }
.btn-danger-soft:hover { background: #fecaca; }

/* Modals */
.ds-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.ds-modal { background: white; border-radius: 10px; padding: 1.5rem; min-width: 320px; max-width: 480px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.ds-modal--wide { max-width: 600px; }
.ds-modal h3 { margin: 0 0 1.25rem; font-size: 1rem; font-weight: 700; }
.ds-form-group { margin-bottom: 0.75rem; }
.ds-form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.3rem; }
.ds-modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }

/* Cashier edit modal */
.ds-cashier-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; }
.ds-cashier-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem; }
.ds-cashier-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; }
.ds-cashier-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
</style>
