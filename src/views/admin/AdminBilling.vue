<template>
    <div class="ab-page">
        <header class="ab-header">
            <div>
                <h1 class="ab-title">Billing</h1>
                <p class="ab-sub">
                    Monthly per-store fees, billed to each owner.
                    <span v-if="pricingText">{{ pricingText }}</span>
                </p>
            </div>
            <div class="ab-header-kpis">
                <div class="ab-kpi">
                    <span class="ab-kpi-value">{{ billableOwners.length }}</span>
                    <span class="ab-kpi-label">Billable owners</span>
                </div>
                <div class="ab-kpi">
                    <span class="ab-kpi-value">{{ formatPeso(totalDue) }}</span>
                    <span class="ab-kpi-label">Billable in {{ monthLabel }}</span>
                </div>
                <div class="ab-kpi ab-kpi--accent">
                    <span class="ab-kpi-value">{{ formatPeso(totalCollected) }}</span>
                    <span class="ab-kpi-label">Collected</span>
                </div>
            </div>
        </header>

        <!-- Tabs -->
        <div class="ab-tabs">
            <button class="ab-tab" :class="{ 'ab-tab--active': view === 'statements' }" @click="view = 'statements'">Statements</button>
            <button class="ab-tab" :class="{ 'ab-tab--active': view === 'history' }" @click="view = 'history'">History</button>
        </div>

        <!-- Toolbar -->
        <div class="ab-toolbar">
            <button
                v-if="view === 'history'"
                class="ab-month-toggle"
                :class="{ 'ab-month-toggle--active': historyFilterByMonth }"
                @click="historyFilterByMonth = !historyFilterByMonth"
            >
                {{ historyFilterByMonth ? `Showing ${monthLabel}` : 'All months' }}
            </button>
            <div class="ab-month-nav">
                <button class="ab-month-btn" @click="shiftMonth(-1)" title="Previous month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <span class="ab-month-label">{{ monthLabel }}</span>
                <button class="ab-month-btn" @click="shiftMonth(1)" :disabled="isCurrentMonth" title="Next month">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <button v-if="!isCurrentMonth" class="ab-today-btn" @click="goToCurrentMonth">This month</button>
            </div>

            <template v-if="view === 'statements'">
                <input v-model="search" class="ab-search" type="search" placeholder="Search owner or store…" />
                <div class="ab-segment" role="group" aria-label="Payment status">
                    <button
                        v-for="option in statusOptions"
                        :key="option.value"
                        class="ab-segment-btn"
                        :class="{ 'ab-segment-btn--active': statusFilter === option.value }"
                        @click="statusFilter = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </template>
        </div>

        <!-- Statements view -->
        <template v-if="view === 'statements'">
            <div v-if="loading" class="ab-state">Loading billing...</div>
            <div v-else-if="error" class="ab-state ab-state--error">{{ error }}</div>

            <div v-else class="ab-table-wrap">
                <table class="ab-table">
                    <thead>
                        <tr>
                            <th>Owner</th>
                            <th>Stores</th>
                            <th class="ab-th-num">Amount</th>
                            <th>Status</th>
                            <th class="ab-th-action">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in visibleOwners" :key="row.owner.id">
                            <td>
                                <div class="ab-owner-email">{{ row.owner.email }}</div>
                                <div v-if="row.owner.fullName" class="ab-muted">{{ row.owner.fullName }}</div>
                                <span v-if="row.owner.suspension" class="ab-suspended-tag" :title="row.owner.suspension.reason ?? ''">
                                    Read-only since {{ formatDate(row.owner.suspension.suspendedAt) }}
                                </span>
                                <span v-else-if="row.overdueMonths.length > 0" class="ab-overdue-tag">
                                    {{ row.overdueMonths.length }} overdue · {{ formatPeso(overdueTotal(row)) }}
                                </span>
                                <span
                                    v-if="row.owner.discount"
                                    class="ab-discount-tag"
                                    :class="{ 'ab-discount-tag--inactive': !discountAppliesThisMonth(row) }"
                                    :title="row.owner.discount.note ?? ''"
                                >
                                    {{ discountLabel(row.owner.discount) }}<template v-if="row.owner.discount.endsAt"> · through {{ throughLabel(row.owner.discount.endsAt) }}</template>
                                </span>
                            </td>
                            <td>
                                <ol class="ab-lines">
                                    <li v-for="line in displayLines(row)" :key="line.storeId" class="ab-line" :class="{ 'ab-line--free': line.exempt }">
                                        <span class="ab-line-name">
                                            <span class="ab-line-pos">{{ line.position ? `${line.position}.` : '–' }}</span>
                                            {{ line.storeName }}
                                            <span v-if="line.storeType === 'WAREHOUSE'" class="ab-line-tag">Warehouse</span>
                                        </span>
                                        <span v-if="line.exempt" class="ab-line-free">Free</span>
                                        <span v-else class="ab-line-fee">{{ formatPeso(line.fee) }}</span>
                                    </li>
                                    <li v-if="displayLines(row).length === 0" class="ab-muted">No stores this month</li>
                                </ol>
                            </td>
                            <td class="ab-td-num">
                                <div v-if="display(row).discountAmount > 0" class="ab-subtotal">
                                    {{ formatPeso(display(row).subtotal) }}
                                </div>
                                <span class="ab-num" :class="displayAmount(row) > 0 ? 'ab-num--active' : 'ab-num--zero'">
                                    {{ formatPeso(displayAmount(row)) }}
                                </span>
                                <div v-if="display(row).discountAmount > 0" class="ab-discount-line">
                                    −{{ formatPeso(display(row).discountAmount) }} discount
                                </div>
                                <div v-if="hasChangedSinceSent(row)" class="ab-changed" :title="`Sent as ${formatPeso(row.statement!.amount)}`">
                                    Changed since sent
                                </div>
                            </td>
                            <td>
                                <div class="ab-status">
                                    <span v-if="row.statement?.paidAt" class="ab-pill ab-pill--paid">Paid</span>
                                    <span v-else-if="row.overdue" class="ab-pill ab-pill--overdue">Overdue</span>
                                    <span v-else-if="row.statement?.sentAt" class="ab-pill ab-pill--sent">Sent</span>
                                    <span v-else class="ab-pill ab-pill--draft">Not sent</span>
                                    <span v-if="row.statement?.paidAt" class="ab-muted">
                                        {{ formatDate(row.statement.paidAt) }}<template v-if="row.statement.paymentNote"> · {{ row.statement.paymentNote }}</template>
                                    </span>
                                    <span v-else-if="row.statement?.sentAt" class="ab-muted">
                                        {{ formatDateTime(row.statement.sentAt) }}<template v-if="row.statement.sendCount > 1"> · sent {{ row.statement.sendCount }}×</template>
                                    </span>
                                </div>
                            </td>
                            <td class="ab-td-action">
                                <div class="ab-actions">
                                    <button
                                        class="ab-btn ab-btn--plain"
                                        :disabled="busyOwnerId === row.owner.id"
                                        @click="openAdjust(row)"
                                    >
                                        Adjust
                                    </button>
                                    <button
                                        class="ab-btn ab-btn--ghost"
                                        :disabled="displayAmount(row) <= 0 || busyOwnerId === row.owner.id"
                                        @click="openSendConfirm(row)"
                                    >
                                        {{ row.statement?.sentAt ? 'Resend' : 'Send bill' }}
                                    </button>
                                    <button
                                        v-if="!row.statement?.paidAt"
                                        class="ab-btn"
                                        :disabled="displayAmount(row) <= 0 || busyOwnerId === row.owner.id"
                                        @click="openPaidConfirm(row)"
                                    >
                                        Mark paid
                                    </button>
                                    <button
                                        v-else
                                        class="ab-btn ab-btn--ghost ab-btn--danger"
                                        :disabled="busyOwnerId === row.owner.id"
                                        @click="markUnpaid(row)"
                                    >
                                        Mark unpaid
                                    </button>
                                    <button
                                        v-if="row.owner.suspension"
                                        class="ab-btn ab-btn--ghost"
                                        :disabled="busyOwnerId === row.owner.id"
                                        @click="reinstate(row)"
                                    >
                                        Reinstate
                                    </button>
                                    <button
                                        v-else-if="row.overdueMonths.length > 0"
                                        class="ab-btn ab-btn--ghost ab-btn--danger"
                                        :disabled="busyOwnerId === row.owner.id"
                                        @click="openSuspend(row)"
                                    >
                                        Suspend
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="visibleOwners.length === 0">
                            <td colspan="5" class="ab-empty">
                                {{ owners.length === 0 ? `No store owners to bill for ${monthLabel}.` : 'No owners match these filters.' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <!-- History view -->
        <template v-else>
            <div v-if="historyLoading" class="ab-state">Loading history...</div>
            <div v-else class="ab-table-wrap">
                <table class="ab-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Owner</th>
                            <th class="ab-th-num">Stores</th>
                            <th class="ab-th-num">Amount</th>
                            <th>Sent</th>
                            <th>Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="entry in history" :key="entry.id">
                            <td class="ab-date-cell">{{ periodLabel(entry.month, entry.year) }}</td>
                            <td><span class="ab-owner-email">{{ entry.ownerEmail }}</span></td>
                            <td class="ab-td-num"><span class="ab-num">{{ entry.storeCount }}</span></td>
                            <td class="ab-td-num"><span class="ab-num ab-num--active">{{ formatPeso(entry.amount) }}</span></td>
                            <td>
                                <span v-if="entry.sentAt" class="ab-date-cell">{{ formatDateTime(entry.sentAt) }}</span>
                                <span v-else class="ab-muted">—</span>
                                <div v-if="entry.sentByEmail" class="ab-muted">by {{ entry.sentByEmail }}</div>
                            </td>
                            <td>
                                <span v-if="entry.paidAt" class="ab-pill ab-pill--paid">{{ formatDate(entry.paidAt) }}</span>
                                <span v-else class="ab-pill ab-pill--sent">Unpaid</span>
                                <div v-if="entry.paymentNote" class="ab-muted">{{ entry.paymentNote }}</div>
                            </td>
                        </tr>
                        <tr v-if="history.length === 0">
                            <td colspan="6" class="ab-empty">No statements have been sent or paid yet.</td>
                        </tr>
                    </tbody>
                    <tfoot v-if="history.length > 0">
                        <tr class="ab-history-total">
                            <td colspan="3">{{ history.length }} statement{{ history.length !== 1 ? 's' : '' }}</td>
                            <td class="ab-td-num"><span class="ab-num">{{ formatPeso(totalHistoryAmount) }}</span></td>
                            <td colspan="2">{{ formatPeso(totalHistoryPaid) }} paid</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </template>

        <!-- Send / mark-paid confirm modal -->
        <div v-if="confirm.row" class="ab-modal-backdrop" @click.self="closeConfirm">
            <div class="ab-modal">
                <h2 class="ab-modal-title">{{ confirm.mode === 'send' ? 'Send bill' : 'Mark as paid' }}</h2>
                <p class="ab-modal-sub">
                    <template v-if="confirm.mode === 'send'">
                        Email the {{ monthLabel }} statement to <strong>{{ confirm.row.owner.email }}</strong>?
                    </template>
                    <template v-else>
                        Record payment from <strong>{{ confirm.row.owner.email }}</strong> for {{ monthLabel }}.
                    </template>
                </p>

                <div class="ab-modal-summary">
                    <div v-for="line in displayLines(confirm.row)" :key="line.storeId" class="ab-summary-row">
                        <span class="ab-summary-label">{{ line.position ? `${line.position}. ` : '' }}{{ line.storeName }}</span>
                        <span class="ab-summary-value">{{ line.exempt ? 'Free' : formatPeso(line.fee) }}</span>
                    </div>
                    <div v-if="display(confirm.row).discountAmount > 0" class="ab-summary-row">
                        <span class="ab-summary-label">Discount<template v-if="display(confirm.row).discountNote"> — {{ display(confirm.row).discountNote }}</template></span>
                        <span class="ab-summary-value">−{{ formatPeso(display(confirm.row).discountAmount) }}</span>
                    </div>
                    <div class="ab-summary-row ab-summary-row--total">
                        <span class="ab-summary-label">Total due</span>
                        <span class="ab-summary-value">{{ formatPeso(displayAmount(confirm.row)) }}</span>
                    </div>
                </div>

                <label v-if="confirm.mode === 'paid'" class="ab-field">
                    <span class="ab-field-label">Payment note (optional)</span>
                    <input v-model="confirm.note" class="ab-input" type="text" maxlength="500" placeholder="e.g. GCash ref 1234567" />
                </label>

                <p v-if="confirm.mode === 'send' && confirm.row.statement?.sentAt" class="ab-modal-note">
                    Already sent on {{ formatDateTime(confirm.row.statement.sentAt) }}. Sending again emails the current breakdown.
                </p>
                <p v-if="confirm.mode === 'send' && confirm.row.statement?.paidAt" class="ab-modal-note">
                    This month is already paid, so the email repeats the amount that was paid.
                </p>

                <div class="ab-modal-footer">
                    <button class="ab-btn ab-btn--ghost" :disabled="Boolean(busyOwnerId)" @click="closeConfirm">Cancel</button>
                    <button class="ab-btn" :disabled="Boolean(busyOwnerId)" @click="submitConfirm">
                        <template v-if="busyOwnerId">{{ confirm.mode === 'send' ? 'Sending…' : 'Saving…' }}</template>
                        <template v-else>{{ confirm.mode === 'send' ? 'Send bill' : 'Mark paid' }}</template>
                    </button>
                </div>
            </div>
        </div>

        <!-- Suspend for non-payment modal -->
        <div v-if="suspend.row" class="ab-modal-backdrop" @click.self="closeSuspend">
            <div class="ab-modal">
                <h2 class="ab-modal-title">Suspend for non-payment</h2>
                <p class="ab-modal-sub">
                    Make every store owned by <strong>{{ suspend.row.owner.email }}</strong> read-only.
                    Staff and the owner can still view and export data, but can't make sales or change anything.
                </p>
                <div class="ab-modal-summary">
                    <div v-for="m in suspend.row.overdueMonths" :key="`${m.year}-${m.month}`" class="ab-summary-row">
                        <span class="ab-summary-label">{{ periodLabel(m.month, m.year) }}</span>
                        <span class="ab-summary-value">{{ formatPeso(m.amount) }}</span>
                    </div>
                    <div class="ab-summary-row ab-summary-row--total">
                        <span class="ab-summary-label">Overdue</span>
                        <span class="ab-summary-value">{{ formatPeso(overdueTotal(suspend.row)) }}</span>
                    </div>
                </div>
                <label class="ab-field">
                    <span class="ab-field-label">Reason (optional, admin-only)</span>
                    <input v-model="suspend.reason" class="ab-input" type="text" maxlength="200" placeholder="e.g. No reply to October reminder" />
                </label>
                <p class="ab-modal-note">Access comes back automatically once every overdue bill is marked paid, or you can reinstate manually.</p>
                <div class="ab-modal-footer">
                    <button class="ab-btn ab-btn--ghost" :disabled="Boolean(busyOwnerId)" @click="closeSuspend">Cancel</button>
                    <button class="ab-btn ab-btn--danger-solid" :disabled="Boolean(busyOwnerId)" @click="submitSuspend">
                        {{ busyOwnerId ? 'Suspending…' : 'Suspend' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Adjust (discount + free stores) modal -->
        <div v-if="adjust.row" class="ab-modal-backdrop" @click.self="closeAdjust">
            <div class="ab-modal ab-modal--wide">
                <h2 class="ab-modal-title">Billing adjustments</h2>
                <p class="ab-modal-sub">
                    For <strong>{{ adjust.row.owner.email }}</strong>. Changes apply to unpaid months, including {{ monthLabel }}.
                </p>

                <section class="ab-adjust-section">
                    <h3 class="ab-adjust-heading">Discount</h3>
                    <div class="ab-segment" role="group" aria-label="Discount type">
                        <button
                            v-for="option in discountOptions"
                            :key="option.value"
                            class="ab-segment-btn"
                            :class="{ 'ab-segment-btn--active': adjust.discountType === option.value }"
                            @click="adjust.discountType = option.value"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                    <div v-if="adjust.discountType !== 'NONE'" class="ab-adjust-grid">
                        <label class="ab-field">
                            <span class="ab-field-label">{{ adjust.discountType === 'PERCENT' ? 'Percent off' : 'Amount off (₱)' }}</span>
                            <input
                                v-model.number="adjust.discountValue"
                                class="ab-input"
                                type="number"
                                min="0"
                                :max="adjust.discountType === 'PERCENT' ? 100 : undefined"
                                step="0.01"
                            />
                        </label>
                        <label class="ab-field">
                            <span class="ab-field-label">Applies through</span>
                            <input v-model="adjust.discountThrough" class="ab-input" type="month" />
                            <span class="ab-field-hint">Leave empty for no end date.</span>
                        </label>
                        <label class="ab-field ab-field--full">
                            <span class="ab-field-label">Note (optional)</span>
                            <input v-model="adjust.discountNote" class="ab-input" type="text" maxlength="200" placeholder="e.g. Launch promo" />
                        </label>
                    </div>
                    <p v-if="discountError" class="ab-field-error">{{ discountError }}</p>
                </section>

                <section class="ab-adjust-section">
                    <h3 class="ab-adjust-heading">Free stores</h3>
                    <p class="ab-field-hint">A free store is billed ₱0 and doesn't take a price slot, so the owner's other stores are priced without it.</p>
                    <div v-if="adjust.stores.length === 0" class="ab-muted">This owner has no stores in {{ monthLabel }}.</div>
                    <div v-for="store in adjust.stores" :key="store.id" class="ab-free-row">
                        <label class="ab-check">
                            <input v-model="store.exempt" type="checkbox" />
                            <span>{{ store.name }}</span>
                            <span v-if="store.storeType === 'WAREHOUSE'" class="ab-line-tag">Warehouse</span>
                        </label>
                        <div v-if="store.exempt" class="ab-free-fields">
                            <label class="ab-free-field">
                                <span class="ab-field-hint">Free through (empty = no end)</span>
                                <input v-model="store.through" class="ab-input ab-input--sm" type="month" />
                            </label>
                            <label class="ab-free-field">
                                <span class="ab-field-hint">Note (optional)</span>
                                <input v-model="store.note" class="ab-input ab-input--sm" type="text" maxlength="200" placeholder="e.g. Pilot store" />
                            </label>
                        </div>
                    </div>
                </section>

                <div class="ab-modal-footer">
                    <button class="ab-btn ab-btn--ghost" :disabled="adjust.saving" @click="closeAdjust">Cancel</button>
                    <button class="ab-btn" :disabled="adjust.saving || Boolean(discountError)" @click="saveAdjust">
                        {{ adjust.saving ? 'Saving…' : 'Save adjustments' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
    getBillingHistory,
    getBillingOwners,
    sendBillingNotice,
    setBillingPayment,
    setOwnerDiscount,
    setOwnerSuspension,
    setStoreExemption,
    type BillingDiscountType,
    type BillingHistoryEntry,
    type BillingLine,
    type BillingOwner,
    type BillingPricing,
    type OwnerDiscount,
    type ThroughMonth,
} from '@/api/admin';
import { useToast } from '@/composables/useToast';

const { showToast } = useToast();

type StatusFilter = 'all' | 'unpaid' | 'paid' | 'overdue' | 'suspended';

const view = ref<'statements' | 'history'>('statements');

const loading = ref(false);
const error = ref<string | null>(null);
const owners = ref<BillingOwner[]>([]);
const pricing = ref<BillingPricing | null>(null);
const busyOwnerId = ref<string | null>(null);
const search = ref('');
const statusFilter = ref<StatusFilter>('all');
const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'suspended', label: 'Read-only' },
];

const confirm = reactive<{ row: BillingOwner | null; mode: 'send' | 'paid'; note: string }>({
    row: null,
    mode: 'send',
    note: '',
});

const history = ref<BillingHistoryEntry[]>([]);
const historyLoading = ref(false);
const historyFilterByMonth = ref(false);

// Billing months are in Philippine time, matching the backend.
const manilaToday = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
        .formatToParts(new Date());
    return {
        year: Number(parts.find((p) => p.type === 'year')?.value),
        month: Number(parts.find((p) => p.type === 'month')?.value),
    };
};
const today = manilaToday();
const selectedMonth = ref(today.month);
const selectedYear = ref(today.year);

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const periodLabel = (month: number, year: number) => `${MONTH_NAMES[month - 1]} ${year}`;
const monthLabel = computed(() => periodLabel(selectedMonth.value, selectedYear.value));
const isCurrentMonth = computed(() => selectedMonth.value === today.month && selectedYear.value === today.year);

const formatPeso = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const pricingText = computed(() => {
    if (!pricing.value) return '';
    const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
    const tiers = pricing.value.storeFees.map((fee, i) => `${ordinal(i + 1)} store ${formatPeso(fee)}`);
    tiers.push(`${ordinal(pricing.value.storeFees.length + 1)}+ ${formatPeso(pricing.value.additionalStoreFee)} each`);
    return `${tiers.join(', ')}.`;
});

// A paid statement is frozen at what was paid; otherwise show live pricing.
const display = (row: BillingOwner) => (row.statement?.paidAt ? row.statement : row);
const displayLines = (row: BillingOwner): BillingLine[] => display(row).lines;
const displayAmount = (row: BillingOwner) => display(row).amount;
const hasChangedSinceSent = (row: BillingOwner) =>
    Boolean(row.statement?.sentAt && !row.statement.paidAt && row.statement.amount !== row.amount);

const billableOwners = computed(() => owners.value.filter((row) => displayAmount(row) > 0));
const totalDue = computed(() => billableOwners.value.reduce((acc, row) => acc + displayAmount(row), 0));
const totalCollected = computed(() =>
    billableOwners.value.filter((row) => row.statement?.paidAt).reduce((acc, row) => acc + displayAmount(row), 0)
);

const visibleOwners = computed(() => {
    const q = search.value.trim().toLowerCase();
    return owners.value.filter((row) => {
        const paid = Boolean(row.statement?.paidAt);
        if (statusFilter.value === 'paid' && !paid) return false;
        if (statusFilter.value === 'unpaid' && (paid || displayAmount(row) <= 0)) return false;
        if (statusFilter.value === 'overdue' && row.overdueMonths.length === 0) return false;
        if (statusFilter.value === 'suspended' && !row.owner.suspension) return false;
        if (!q) return true;
        return (
            row.owner.email.toLowerCase().includes(q) ||
            (row.owner.fullName ?? '').toLowerCase().includes(q) ||
            displayLines(row).some((line) => line.storeName.toLowerCase().includes(q))
        );
    });
});

const totalHistoryAmount = computed(() => history.value.reduce((acc, e) => acc + e.amount, 0));
const totalHistoryPaid = computed(() =>
    history.value.filter((e) => e.paidAt).reduce((acc, e) => acc + e.amount, 0)
);

const shiftMonth = (dir: 1 | -1) => {
    let m = selectedMonth.value + dir;
    let y = selectedYear.value;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    if (y > today.year || (y === today.year && m > today.month)) return;
    selectedMonth.value = m;
    selectedYear.value = y;
};

const goToCurrentMonth = () => {
    selectedMonth.value = today.month;
    selectedYear.value = today.year;
};

const errorMessage = (e: unknown, fallback: string) =>
    (e as { body?: { error?: { message?: string } } })?.body?.error?.message || fallback;

const loadOwners = async () => {
    loading.value = true;
    error.value = null;
    try {
        const data = await getBillingOwners(selectedMonth.value, selectedYear.value);
        owners.value = data.owners;
        pricing.value = data.pricing;
    } catch (e) {
        error.value = errorMessage(e, 'Failed to load billing.');
        showToast(error.value, 'error');
    } finally {
        loading.value = false;
    }
};

const loadHistory = async () => {
    historyLoading.value = true;
    try {
        const data = historyFilterByMonth.value
            ? await getBillingHistory(selectedMonth.value, selectedYear.value)
            : await getBillingHistory();
        history.value = data.entries;
    } catch (e) {
        showToast(errorMessage(e, 'Failed to load history.'), 'error');
    } finally {
        historyLoading.value = false;
    }
};

const openSendConfirm = (row: BillingOwner) => {
    if (displayAmount(row) <= 0) return;
    confirm.row = row;
    confirm.mode = 'send';
};

const openPaidConfirm = (row: BillingOwner) => {
    if (displayAmount(row) <= 0) return;
    confirm.row = row;
    confirm.mode = 'paid';
    confirm.note = '';
};

const closeConfirm = () => {
    if (busyOwnerId.value) return;
    confirm.row = null;
};

const submitConfirm = async () => {
    const row = confirm.row;
    if (!row) return;
    busyOwnerId.value = row.owner.id;
    try {
        if (confirm.mode === 'send') {
            const result = await sendBillingNotice(row.owner.id, selectedMonth.value, selectedYear.value);
            if (!result.sent || !result.statement) {
                showToast(result.message || 'Email could not be sent.', 'error');
                return;
            }
            row.statement = result.statement;
            showToast(`Bill sent to ${row.owner.email}.`, 'success');
        } else {
            const result = await setBillingPayment(
                row.owner.id,
                selectedMonth.value,
                selectedYear.value,
                true,
                confirm.note.trim() || null
            );
            row.statement = result.statement;
            showToast(
                result.reinstated
                    ? `Marked paid — ${row.owner.email}'s stores are fully active again.`
                    : `Marked ${row.owner.email} as paid for ${monthLabel.value}.`,
                'success'
            );
            await loadOwners();
        }
        confirm.row = null;
    } catch (e) {
        showToast(errorMessage(e, 'Something went wrong.'), 'error');
    } finally {
        busyOwnerId.value = null;
    }
};

const markUnpaid = async (row: BillingOwner) => {
    busyOwnerId.value = row.owner.id;
    try {
        const result = await setBillingPayment(row.owner.id, selectedMonth.value, selectedYear.value, false);
        row.statement = result.statement;
        showToast(`Marked ${row.owner.email} as unpaid.`, 'success');
        await loadOwners();
    } catch (e) {
        showToast(errorMessage(e, 'Failed to update payment.'), 'error');
    } finally {
        busyOwnerId.value = null;
    }
};

// ── Suspension for non-payment ───────────────────────────────
const overdueTotal = (row: BillingOwner) => row.overdueMonths.reduce((sum, m) => sum + m.amount, 0);

const suspend = reactive<{ row: BillingOwner | null; reason: string }>({ row: null, reason: '' });

const openSuspend = (row: BillingOwner) => {
    suspend.row = row;
    suspend.reason = '';
};

const closeSuspend = () => {
    if (busyOwnerId.value) return;
    suspend.row = null;
};

const submitSuspend = async () => {
    const row = suspend.row;
    if (!row) return;
    busyOwnerId.value = row.owner.id;
    try {
        const result = await setOwnerSuspension(row.owner.id, true, suspend.reason.trim() || null);
        row.owner = result.owner;
        showToast(`${row.owner.email}'s stores are now read-only.`, 'success');
        suspend.row = null;
    } catch (e) {
        showToast(errorMessage(e, 'Failed to suspend.'), 'error');
    } finally {
        busyOwnerId.value = null;
    }
};

const reinstate = async (row: BillingOwner) => {
    busyOwnerId.value = row.owner.id;
    try {
        const result = await setOwnerSuspension(row.owner.id, false);
        row.owner = result.owner;
        showToast(`${row.owner.email}'s stores are fully active again.`, 'success');
    } catch (e) {
        showToast(errorMessage(e, 'Failed to reinstate.'), 'error');
    } finally {
        busyOwnerId.value = null;
    }
};

// ── Discounts & free stores ──────────────────────────────────
// The API stores an end as the start of the first month it no longer covers;
// the UI talks in "through <month>" (an <input type="month"> value, YYYY-MM).
const manilaYearMonth = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' })
        .formatToParts(date);
    return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
};
const throughValue = (endsAt: string | null) =>
    endsAt ? manilaYearMonth(new Date(new Date(endsAt).getTime() - 1)) : '';
const throughLabel = (endsAt: string) => {
    const [y, m] = throughValue(endsAt).split('-').map(Number);
    return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
};
const toThrough = (value: string): ThroughMonth => {
    if (!value) return null;
    const [y, m] = value.split('-').map(Number);
    return y && m ? { throughYear: y, throughMonth: m } : null;
};

const discountLabel = (discount: OwnerDiscount) =>
    discount.type === 'PERCENT' ? `${discount.value}% off` : `${formatPeso(discount.value)} off`;

const selectedMonthKey = computed(() => `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`);
const discountAppliesThisMonth = (row: BillingOwner) => {
    const endsAt = row.owner.discount?.endsAt ?? null;
    return !endsAt || throughValue(endsAt) >= selectedMonthKey.value;
};

type DiscountChoice = BillingDiscountType | 'NONE';
const discountOptions: { value: DiscountChoice; label: string }[] = [
    { value: 'NONE', label: 'None' },
    { value: 'PERCENT', label: 'Percent' },
    { value: 'FIXED', label: 'Fixed ₱' },
];

type StoreDraft = { id: string; name: string; storeType: string; exempt: boolean; through: string; note: string; original: string };
const storeKey = (exempt: boolean, through: string, note: string) => JSON.stringify([exempt, exempt ? through : '', exempt ? note.trim() : '']);

const adjust = reactive<{
    row: BillingOwner | null;
    discountType: DiscountChoice;
    discountValue: number | null;
    discountThrough: string;
    discountNote: string;
    discountOriginal: string;
    stores: StoreDraft[];
    saving: boolean;
}>({
    row: null,
    discountType: 'NONE',
    discountValue: null,
    discountThrough: '',
    discountNote: '',
    discountOriginal: '',
    stores: [],
    saving: false,
});

const discountKey = () =>
    adjust.discountType === 'NONE'
        ? 'NONE'
        : JSON.stringify([adjust.discountType, Number(adjust.discountValue), adjust.discountThrough, adjust.discountNote.trim()]);

const discountError = computed(() => {
    if (!adjust.row || adjust.discountType === 'NONE') return '';
    const value = Number(adjust.discountValue);
    if (!Number.isFinite(value) || value <= 0) return 'Enter a discount greater than zero.';
    if (adjust.discountType === 'PERCENT' && value > 100) return 'A percentage discount cannot exceed 100.';
    return '';
});

const openAdjust = (row: BillingOwner) => {
    const discount = row.owner.discount;
    adjust.row = row;
    adjust.discountType = discount?.type ?? 'NONE';
    adjust.discountValue = discount?.value ?? null;
    adjust.discountThrough = throughValue(discount?.endsAt ?? null);
    adjust.discountNote = discount?.note ?? '';
    adjust.discountOriginal = discountKey();
    adjust.stores = row.stores.map((store) => {
        const through = throughValue(store.billingExemptEndsAt);
        const note = store.billingExemptNote ?? '';
        return {
            id: store.id,
            name: store.name,
            storeType: store.storeType,
            exempt: store.billingExempt,
            through,
            note,
            original: storeKey(store.billingExempt, through, note),
        };
    });
    adjust.saving = false;
};

const closeAdjust = () => {
    if (adjust.saving) return;
    adjust.row = null;
};

const saveAdjust = async () => {
    const row = adjust.row;
    if (!row || discountError.value) return;
    adjust.saving = true;
    try {
        const calls: Promise<unknown>[] = [];
        if (discountKey() !== adjust.discountOriginal) {
            calls.push(
                setOwnerDiscount(
                    row.owner.id,
                    adjust.discountType === 'NONE'
                        ? null
                        : {
                              type: adjust.discountType,
                              value: Number(adjust.discountValue),
                              note: adjust.discountNote.trim() || null,
                              through: toThrough(adjust.discountThrough),
                          }
                )
            );
        }
        for (const store of adjust.stores) {
            if (storeKey(store.exempt, store.through, store.note) === store.original) continue;
            calls.push(
                setStoreExemption(
                    store.id,
                    store.exempt ? { note: store.note.trim() || null, through: toThrough(store.through) } : null
                )
            );
        }
        if (calls.length === 0) {
            adjust.row = null;
            return;
        }
        await Promise.all(calls);
        showToast(`Billing adjustments saved for ${row.owner.email}.`, 'success');
        adjust.row = null;
        await loadOwners();
    } catch (e) {
        showToast(errorMessage(e, 'Failed to save adjustments.'), 'error');
    } finally {
        adjust.saving = false;
    }
};

watch([selectedMonth, selectedYear], () => {
    loadOwners();
    if (view.value === 'history' && historyFilterByMonth.value) loadHistory();
});

watch(view, (v) => {
    if (v === 'history') loadHistory();
});

watch(historyFilterByMonth, () => {
    if (view.value === 'history') loadHistory();
});

onMounted(loadOwners);
</script>

<style scoped>
.ab-page { display: flex; flex-direction: column; gap: 0.85rem; font-family: 'Inter', sans-serif; }

/* Header */
.ab-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.ab-title { font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0 0 0.15rem; letter-spacing: -0.025em; }
.ab-sub { font-size: 0.82rem; line-height: 1.4; color: #64748b; margin: 0; }
.ab-header-kpis { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.ab-kpi {
    display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.45rem 0.8rem; min-width: 100px;
}
.ab-kpi--accent { border-color: rgba(13, 148, 136, 0.3); background: rgba(13, 148, 136, 0.04); }
.ab-kpi-value { font-size: 1.15rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.ab-kpi--accent .ab-kpi-value { color: #0f766e; }
.ab-kpi-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; text-align: right; }

/* Toolbar */
.ab-toolbar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
.ab-month-nav { display: inline-flex; align-items: center; gap: 0.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.3rem 0.4rem; }
.ab-month-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: #64748b; cursor: pointer; transition: background 0.12s, color 0.12s; }
.ab-month-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.ab-month-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ab-month-label { font-size: 0.875rem; font-weight: 700; color: #0f172a; min-width: 130px; text-align: center; padding: 0 0.25rem; }
.ab-today-btn { font-size: 0.72rem; font-weight: 600; color: #0d9488; background: rgba(13, 148, 136, 0.08); border: none; border-radius: 6px; padding: 0.25rem 0.6rem; cursor: pointer; white-space: nowrap; }
.ab-today-btn:hover { background: rgba(13, 148, 136, 0.15); }

/* Tabs */
.ab-tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid #e2e8f0; }
.ab-tab {
    border: none;
    background: none;
    padding: 0.55rem 0.9rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.12s, border-color 0.12s;
}
.ab-tab:hover { color: #0f172a; }
.ab-tab--active { color: #0f766e; border-bottom-color: #0d9488; }

.ab-month-toggle {
    border: 1px solid #e2e8f0;
    background: #fff;
    border-radius: 8px;
    padding: 0.5rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.ab-month-toggle--active { border-color: #0d9488; color: #0f766e; background: rgba(13, 148, 136, 0.06); }

/* Table */
.ab-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; overflow-x: auto; }
.ab-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.ab-table thead th { padding: 0.65rem 1rem; text-align: left; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.ab-table thead th.ab-th-num { text-align: right; }
.ab-table thead th.ab-th-action { text-align: right; }
.ab-table tbody tr { border-bottom: 1px solid #f1f5f9; }
.ab-table tbody tr:last-child { border-bottom: none; }
.ab-table tbody tr:hover { background: #f8fafc; }
.ab-table tbody td { padding: 0.55rem 0.75rem; vertical-align: middle; }
.ab-td-num { text-align: right; }
.ab-td-action { text-align: right; }

.ab-store-name { font-weight: 600; color: #0f172a; }
.ab-owner-email { font-size: 0.85rem; color: #334155; word-break: break-all; }
.ab-muted { color: #94a3b8; font-size: 0.82rem; }
.ab-date-cell { font-size: 0.8rem; color: #475569; white-space: nowrap; }

.ab-history-total td { padding: 0.7rem 1rem; border-top: 1px solid #e2e8f0; background: #f8fafc; font-weight: 700; color: #0f172a; font-size: 0.8rem; }
.ab-num { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
.ab-num--active { color: #0d9488; }
.ab-num--zero { color: #cbd5e1; font-weight: 600; }


.ab-btn { border: none; border-radius: 8px; padding: 0.45rem 0.85rem; font-size: 0.8rem; font-weight: 600; background: #0d9488; color: #fff; cursor: pointer; white-space: nowrap; transition: background 0.12s; }
.ab-btn:hover:not(:disabled) { background: #0f766e; }
.ab-btn--ghost { background: #fff; color: #0f766e; border: 1px solid #99f6e4; }
.ab-btn--ghost:hover:not(:disabled) { background: #f0fdfa; }
.ab-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ab-empty { text-align: center; padding: 2.5rem; color: #94a3b8; }
.ab-state { padding: 2rem; text-align: center; color: #64748b; background: #f8fafc; border-radius: 10px; }
.ab-state--error { color: #b91c1c; background: #fef2f2; }

/* Confirm modal */
.ab-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
}
.ab-modal {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border-radius: 14px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
.ab-modal-title { margin: 0 0 0.25rem; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
.ab-modal-sub { margin: 0 0 1rem; font-size: 0.85rem; color: #64748b; word-break: break-word; }
.ab-modal-sub strong { color: #0f172a; }

.ab-modal-summary {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.5rem 0.875rem;
    background: #f8fafc;
}
.ab-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0;
}
.ab-summary-row + .ab-summary-row { border-top: 1px solid #eef2f7; }
.ab-summary-label { font-size: 0.8rem; color: #64748b; }
.ab-summary-value { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
.ab-summary-row--total .ab-summary-label { font-weight: 700; color: #0f172a; }
.ab-summary-row--total .ab-summary-value { font-size: 1rem; font-weight: 800; color: #0f766e; }

.ab-modal-note {
    margin: 0.875rem 0 0;
    font-size: 0.75rem;
    color: #92400e;
    background: #fef3c7;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
}

.ab-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.25rem;
}
/* Statements */
.ab-search { min-width: 220px; flex: 1; max-width: 320px; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; color: #0f172a; background: #fff; }
.ab-search:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
.ab-segment { display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 0.2rem; gap: 0.15rem; }
.ab-segment-btn { border: none; background: transparent; border-radius: 6px; padding: 0.3rem 0.7rem; font-size: 0.78rem; font-weight: 600; color: #64748b; cursor: pointer; }
.ab-segment-btn--active { background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(15,23,42,0.08); }
.ab-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; min-width: 200px; }
.ab-line { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.8rem; color: #334155; }
.ab-line--free { color: #64748b; }
.ab-line-pos { color: #94a3b8; display: inline-block; min-width: 1rem; }
.ab-line-free { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; background: #ecfdf5; border-radius: 4px; padding: 0.05rem 0.35rem; align-self: center; }
.ab-subtotal { font-size: 0.72rem; color: #94a3b8; text-decoration: line-through; }
.ab-discount-line { font-size: 0.68rem; color: #047857; margin-top: 0.1rem; white-space: nowrap; }
.ab-discount-tag { display: inline-block; margin-top: 0.3rem; font-size: 0.65rem; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 0.08rem 0.5rem; }
.ab-discount-tag--inactive { color: #64748b; background: #f8fafc; border-color: #e2e8f0; text-decoration: line-through; }
.ab-pill--overdue { background: #fee2e2; color: #b91c1c; }
.ab-suspended-tag { display: inline-block; margin-top: 0.3rem; font-size: 0.65rem; font-weight: 700; color: #fff; background: #b91c1c; border-radius: 999px; padding: 0.1rem 0.5rem; }
.ab-overdue-tag { display: inline-block; margin-top: 0.3rem; font-size: 0.65rem; font-weight: 700; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 999px; padding: 0.08rem 0.5rem; }
.ab-btn--danger-solid { background: #b91c1c; }
.ab-btn--danger-solid:hover:not(:disabled) { background: #991b1b; }
.ab-btn--plain { background: transparent; color: #475569; border: 1px solid #e2e8f0; }
.ab-btn--plain:hover:not(:disabled) { background: #f1f5f9; }
.ab-modal--wide { max-width: 560px; max-height: calc(100vh - 2rem); overflow-y: auto; }
.ab-adjust-section { border-top: 1px solid #eef2f7; padding-top: 0.9rem; margin-top: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }
.ab-adjust-heading { margin: 0; font-size: 0.85rem; font-weight: 700; color: #0f172a; }
.ab-adjust-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; width: 100%; }
.ab-adjust-grid .ab-field { margin-top: 0.25rem; }
.ab-field--full { grid-column: 1 / -1; }
.ab-field-hint { font-size: 0.72rem; color: #94a3b8; margin: 0; }
.ab-field-error { font-size: 0.75rem; color: #b91c1c; margin: 0; }
.ab-free-row { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.ab-free-row:last-child { border-bottom: none; }
.ab-check { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #0f172a; cursor: pointer; }
.ab-check input { width: 16px; height: 16px; accent-color: #0d9488; }
.ab-free-fields { display: flex; gap: 0.5rem; padding-left: 1.5rem; flex-wrap: wrap; }
.ab-free-field { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 160px; }
.ab-input--sm { padding: 0.4rem 0.6rem; font-size: 0.8rem; }
.ab-line-fee { font-variant-numeric: tabular-nums; color: #64748b; white-space: nowrap; }
.ab-line-tag { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7c3aed; background: #f5f3ff; border-radius: 4px; padding: 0.05rem 0.3rem; margin-left: 0.25rem; }
.ab-changed { font-size: 0.68rem; color: #b45309; margin-top: 0.15rem; }
.ab-status { display: flex; flex-direction: column; gap: 0.2rem; align-items: flex-start; }
.ab-pill { display: inline-flex; padding: 0.12rem 0.5rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.ab-pill--paid { background: #d1fae5; color: #065f46; }
.ab-pill--sent { background: #fef3c7; color: #92400e; }
.ab-pill--draft { background: #f1f5f9; color: #64748b; }
.ab-actions { display: inline-flex; gap: 0.4rem; justify-content: flex-end; flex-wrap: wrap; }
.ab-btn--danger { color: #b91c1c; border-color: #fecaca; }
.ab-btn--danger:hover:not(:disabled) { background: #fef2f2; }
.ab-field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 1rem; }
.ab-field-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; }
.ab-input { padding: 0.55rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; color: #0f172a; background: #f8fafc; }
.ab-input:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }

@media (max-width: 640px) {
    .ab-search { max-width: none; min-width: 0; width: 100%; }
    .ab-adjust-grid { grid-template-columns: 1fr; }
}
</style>

