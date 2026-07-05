<template>
    <section class="po-detail-page">
        <div class="po-detail-shell">
            <ConfirmModal
                v-model:show="showCancelModal"
                title="Cancel purchase order"
                :message="`Cancel the order${purchaseOrder?.supplierName ? ` for '${purchaseOrder.supplierName}'` : ''}? Receiving will be disabled and this cannot be undone.`"
                confirm-text="Cancel order"
                cancel-text="Keep order"
                variant="danger"
                :loading="isUpdatingStatus"
                @confirm="confirmCancelOrder"
                @cancel="showCancelModal = false"
            />

            <header class="detail-header">
                <button type="button" class="back-link" @click="goToList">
                    <mdicon name="arrow-left" size="15" />
                    Purchase orders
                </button>
                <div class="detail-header-row">
                    <div class="detail-title">
                        <h1>
                            {{ titleLabel }}
                            <span
                                v-if="purchaseOrder"
                                class="status-pill status-pill--title"
                                :class="statusClass(purchaseOrder.status)"
                            >
                                {{ prettyStatus(purchaseOrder.status) }}
                            </span>
                        </h1>
                        <p>Receive stock and track inbound items for {{ currentStoreLabel }}.</p>
                    </div>
                    <div class="header-actions" v-if="purchaseOrder && canWrite">
                        <button
                            v-if="canCancel"
                            type="button"
                            class="ghost-button ghost-button--danger"
                            :disabled="isUpdatingStatus"
                            @click="showCancelModal = true"
                        >
                            Cancel order
                        </button>
                        <button
                            v-if="canMarkSent"
                            type="button"
                            class="ghost-button"
                            :disabled="isUpdatingStatus"
                            @click="updateStatus('SENT')"
                        >
                            <mdicon name="send-outline" size="15" />
                            Mark sent
                        </button>
                        <button
                            v-if="canReceive"
                            type="button"
                            class="primary-button"
                            @click="openReceiveModal"
                        >
                            <mdicon name="package-down" size="16" />
                            Receive items
                        </button>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Purchase orders are available on Standard."
                description="Upgrade to Standard to review order details, update suppliers, and receive inventory."
            />

            <div v-else-if="isLoading" class="panel-state">Loading purchase order…</div>

            <div v-else-if="!purchaseOrder" class="panel-state">Purchase order not found.</div>

            <template v-else>
                <!-- ── Summary ── -->
                <section class="detail-card">
                    <template v-if="purchaseOrder.status === 'CANCELLED'">
                        <div class="cancelled-note">
                            <mdicon name="cancel" size="16" />
                            This order is cancelled and cannot be received.
                        </div>
                    </template>
                    <template v-else>
                        <div class="status-steps">
                            <span
                                v-for="(step, index) in statusSteps"
                                :key="step"
                                class="status-step"
                                :class="{
                                    active: statusIndex >= index,
                                    current: purchaseOrder.status === step,
                                }"
                            >
                                {{ stepLabel(step) }}
                            </span>
                        </div>
                        <p class="status-note">{{ statusMessage }}</p>
                    </template>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span>Supplier</span>
                            <strong>{{ purchaseOrder.supplierName || 'Unassigned' }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Expected</span>
                            <strong>{{ purchaseOrder.expectedDate ? formatDate(purchaseOrder.expectedDate) : 'Anytime' }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Order total</span>
                            <strong>{{ formatMoney(orderTotal) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Received</span>
                            <strong>{{ formatQty(receivedQty) }} / {{ formatQty(orderedQty) }}</strong>
                            <div class="meta-progress">
                                <span
                                    class="meta-progress-fill"
                                    :class="{ 'meta-progress-fill--done': receiveProgressPct >= 100 }"
                                    :style="{ width: receiveProgressPct + '%' }"
                                ></span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <span>Created</span>
                            <strong>{{ formatDate(purchaseOrder.createdAt) }}</strong>
                        </div>
                        <div class="meta-item">
                            <span>Updated</span>
                            <strong>{{ formatDate(purchaseOrder.updatedAt) }}</strong>
                        </div>
                    </div>
                </section>

                <!-- ── Items ── -->
                <section class="detail-card">
                    <div class="card-title card-title--row">
                        <div>
                            <h2>Items</h2>
                            <p>{{ purchaseOrder.items.length }} line{{ purchaseOrder.items.length !== 1 ? 's' : '' }} on this order</p>
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table class="po-items">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="num">Ordered</th>
                                    <th class="num">Received</th>
                                    <th class="num">Remaining</th>
                                    <th class="num">Unit cost</th>
                                    <th class="num">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in purchaseOrder.items" :key="item.id">
                                    <td>
                                        <div class="item-name">{{ item.product?.name || item.ingredient?.name || 'Unknown' }}</div>
                                        <div class="item-meta">
                                            <span>{{ item.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                            <span v-if="item.product?.sku">SKU {{ item.product?.sku }}</span>
                                            <span v-if="item.product?.unit || item.ingredient?.unit">
                                                {{ item.product?.unit || item.ingredient?.unit }}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="num">{{ formatQty(item.qtyOrdered) }}</td>
                                    <td class="num" :class="{ 'num--muted': item.qtyReceived === 0 }">{{ formatQty(item.qtyReceived) }}</td>
                                    <td class="num" :class="{ 'num--done': item.qtyRemaining === 0 }">{{ formatQty(item.qtyRemaining) }}</td>
                                    <td class="num">{{ formatMoney(item.unitCost) }}</td>
                                    <td class="num num--strong">{{ formatMoney(item.qtyOrdered * item.unitCost) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5" class="tfoot-label">Order total</td>
                                    <td class="num num--strong">{{ formatMoney(orderTotal) }}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <!-- ── Receipts ── -->
                <section v-if="purchaseOrder.receipts && purchaseOrder.receipts.length > 0" class="detail-card">
                    <div class="card-title">
                        <h2>Receipts</h2>
                        <p>Deliveries recorded against this order</p>
                    </div>
                    <div class="receipts-list">
                        <button
                            v-for="receipt in purchaseOrder.receipts"
                            :key="receipt.id"
                            type="button"
                            class="receipt-row"
                            @click="openReceipt(receipt.id)"
                        >
                            <span class="receipt-invoice" v-if="receipt.invoiceNumber">
                                <mdicon name="file-document-outline" size="14" />
                                {{ receipt.invoiceNumber }}
                            </span>
                            <span class="receipt-invoice receipt-invoice--none" v-else>No invoice #</span>
                            <span class="receipt-date">{{ formatDate(receipt.receivedAt) }}</span>
                            <span class="receipt-cost">{{ formatMoney(receipt.totalCost) }}</span>
                            <mdicon name="chevron-right" size="16" class="receipt-chevron" />
                        </button>
                    </div>
                </section>

                <!-- ── Edit details ── -->
                <section v-if="canEditDetails" class="detail-card">
                    <div class="card-title card-title--row">
                        <div>
                            <h2>Details</h2>
                            <p>Supplier and expected date can change while the order is draft or sent.</p>
                        </div>
                        <button
                            type="button"
                            class="ghost-button ghost-button--sm"
                            :disabled="isUpdatingDetails || !isDetailsDirty"
                            @click="resetDetails"
                        >
                            Reset
                        </button>
                    </div>

                    <div class="edit-grid">
                        <label class="form-field">
                            <span>Supplier</span>
                            <div class="supplier-row">
                                <select v-model="editSupplierSelection">
                                    <option value="" disabled>Select supplier</option>
                                    <option value="CUSTOM">Custom entry</option>
                                    <option
                                        v-for="supplier in supplierOptions"
                                        :key="supplier.id"
                                        :value="supplier.id"
                                    >
                                        {{ supplier.name }}
                                    </option>
                                </select>
                                <button
                                    type="button"
                                    class="ghost-button"
                                    :disabled="!canEditDetails"
                                    @click="toggleSupplierForm"
                                >
                                    {{ showSupplierForm ? 'Close' : 'Add supplier' }}
                                </button>
                            </div>
                        </label>
                        <label v-if="editSupplierSelection === 'CUSTOM'" class="form-field">
                            <span>Supplier name</span>
                            <input v-model="editForm.supplierName" type="text" placeholder="Supplier name" />
                        </label>
                        <label class="form-field">
                            <span>Expected date</span>
                            <input v-model="editForm.expectedDate" type="date" />
                        </label>
                    </div>

                    <div v-if="showSupplierForm" class="supplier-form">
                        <label class="form-field">
                            <span>Supplier name</span>
                            <input v-model="supplierForm.name" type="text" placeholder="Fresh Supplier Co" />
                        </label>
                        <label class="form-field">
                            <span>Email <em>optional</em></span>
                            <input v-model="supplierForm.email" type="email" placeholder="ops@supplier.com" />
                        </label>
                        <label class="form-field">
                            <span>Phone <em>optional</em></span>
                            <input v-model="supplierForm.phone" type="tel" placeholder="+63 900 000 0000" />
                        </label>
                        <div class="supplier-actions">
                            <span v-if="supplierFormError" class="form-error">{{ supplierFormError }}</span>
                            <button
                                type="button"
                                class="ghost-button"
                                :disabled="isCreatingSupplier"
                                @click="createSupplierFromForm"
                            >
                                {{ isCreatingSupplier ? 'Saving…' : 'Save supplier' }}
                            </button>
                        </div>
                    </div>

                    <div class="edit-actions">
                        <button
                            type="button"
                            class="primary-button primary-button--sm"
                            :disabled="!isDetailsDirty || isUpdatingDetails"
                            @click="saveDetails"
                        >
                            {{ isUpdatingDetails ? 'Saving…' : 'Save details' }}
                        </button>
                    </div>
                </section>
            </template>
        </div>

        <Teleport to="body">
            <Transition name="modal-fade">
                <div
                    v-if="showReceiveModal"
                    class="modal-backdrop"
                    role="presentation"
                    @click.self="closeReceiveModal"
                >
                    <section
                        class="modal-box"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="receive-modal-title"
                        @keyup.esc="closeReceiveModal"
                    >
                        <div class="modal-header">
                            <div>
                                <h2 id="receive-modal-title">Receive items</h2>
                                <p>Record incoming stock and invoice details.</p>
                            </div>
                            <button
                                type="button"
                                class="modal-close"
                                aria-label="Close receive items modal"
                                @click="closeReceiveModal"
                            >
                                <mdicon name="close" size="20" />
                            </button>
                        </div>

                        <form v-if="purchaseOrder" class="receive-form" @submit.prevent="submitReceive">
                            <div class="receive-form-grid">
                                <label class="form-field">
                                    <span>Invoice number <em>optional</em></span>
                                    <input v-model="receiveForm.invoiceNumber" type="text" placeholder="INV-2024-001" />
                                </label>

                                <label class="form-field">
                                    <span>Received date</span>
                                    <input v-model="receiveForm.receivedAt" type="date" />
                                </label>
                            </div>

                            <div class="receive-lines">
                                <div class="line-header">
                                    <span>Items to receive</span>
                                    <span class="helper">Remaining quantities auto-filled</span>
                                </div>
                                <div
                                    v-for="line in receiveLines"
                                    :key="`${line.itemType}-${line.itemId}`"
                                    class="receive-row"
                                    :class="{ complete: line.qtyRemaining === 0 }"
                                >
                                    <div class="line-item">
                                        <div class="item-name">{{ line.name }}</div>
                                        <div class="item-meta">
                                            <span>{{ line.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}</span>
                                            <span v-if="line.unit">{{ line.unit }}</span>
                                            <span class="line-remaining-note">{{ formatQty(line.qtyRemaining) }} remaining</span>
                                        </div>
                                    </div>
                                    <label class="line-field">
                                        <div class="line-field-head">
                                            <span class="line-label">Qty received</span>
                                            <button
                                                type="button"
                                                class="line-action"
                                                :disabled="line.qtyRemaining === 0 || !canReceive"
                                                @click="setReceiveAll(line)"
                                            >
                                                All
                                            </button>
                                        </div>
                                        <input
                                            v-model.number="line.qtyReceived"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            class="line-input"
                                            aria-label="Quantity received"
                                            :disabled="line.qtyRemaining === 0 || !canReceive"
                                        />
                                    </label>
                                    <label class="line-field">
                                        <span class="line-label">Unit cost</span>
                                        <input
                                            v-model.number="line.unitCost"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            class="line-input"
                                            aria-label="Unit cost"
                                            :disabled="line.qtyRemaining === 0 || !canReceive"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div class="form-summary">
                                <span>Receiving total</span>
                                <strong>{{ formatMoney(receiveTotal) }}</strong>
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="ghost-button" @click="closeReceiveModal">Cancel</button>
                                <button class="primary-button" type="submit" :disabled="!canSubmitReceive">
                                    {{ isSubmitting ? 'Saving receipt…' : 'Record receipt' }}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </Transition>
        </Teleport>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPurchaseOrder, PurchaseOrderDetail, receivePurchaseOrder, updatePurchaseOrder } from '@/api/purchaseOrders';
import { createSupplier, listSuppliers, Supplier } from '@/api/suppliers';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { canAccess } from '@/utils/roleAccess';
import { hasPlanFeature } from '@/utils/planAccess';
import PlanGate from '@/components/PlanGate.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const purchaseOrder = ref<PurchaseOrderDetail | null>(null);
const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
// Use the store owner's plan tier for feature access (not the logged-in user's)
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);
const isSubmitting = ref(false);
const isUpdatingStatus = ref(false);
const isUpdatingDetails = ref(false);
const isCreatingSupplier = ref(false);
const showSupplierForm = ref(false);
const showReceiveModal = ref(false);
const showCancelModal = ref(false);
const supplierFormError = ref('');

const receiveForm = reactive({
    invoiceNumber: '',
    receivedAt: '',
});

const editForm = reactive({
    supplierName: '',
    expectedDate: '',
});
const editSupplierSelection = ref('');

const supplierForm = reactive({
    name: '',
    email: '',
    phone: '',
});

const receiveLines = ref<
    Array<{
        itemType: 'PRODUCT' | 'INGREDIENT';
        itemId: string;
        name: string;
        unit: string;
        qtyRemaining: number;
        qtyReceived: number;
        unitCost: number;
    }>
>([]);

const routeStoreId = computed(() => route.params.storeId as string | undefined);
const routePurchaseOrderId = computed(() => route.params.purchaseOrderId as string | undefined);

const statusSteps = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const;

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    PARTIALLY_RECEIVED: 'Partially received',
    RECEIVED: 'Received',
    CANCELLED: 'Cancelled',
};

const STEP_LABELS: Record<string, string> = {
    ...STATUS_LABELS,
    PARTIALLY_RECEIVED: 'Partial',
};

const prettyStatus = (status: string) => STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
const stepLabel = (status: string) => STEP_LABELS[status] ?? status.replace(/_/g, ' ');

const loadPurchaseOrder = async () => {
    if (isPlanLocked.value) {
        purchaseOrder.value = null;
        return;
    }
    if (!routeStoreId.value || !routePurchaseOrderId.value) return;
    isLoading.value = true;
    try {
        const data = await getPurchaseOrder(routeStoreId.value, routePurchaseOrderId.value);
        purchaseOrder.value = data.purchaseOrder;
        buildReceiveLines();
    } finally {
        isLoading.value = false;
    }
};

const loadSuppliers = async () => {
    if (isPlanLocked.value) {
        suppliers.value = [];
        return;
    }
    if (!routeStoreId.value) {
        suppliers.value = [];
        return;
    }
    try {
        const data = await listSuppliers(routeStoreId.value);
        suppliers.value = data.suppliers;
    } catch (error) {
        suppliers.value = [];
    }
};

const buildReceiveLines = () => {
    if (!purchaseOrder.value) return;
    receiveLines.value = purchaseOrder.value.items.map((item) => ({
        itemType: item.itemType as 'PRODUCT' | 'INGREDIENT',
        itemId: item.itemId,
        name: item.product?.name || item.ingredient?.name || 'Unknown',
        unit: item.product?.unit || item.ingredient?.unit || '',
        qtyRemaining: item.qtyRemaining,
        qtyReceived: item.qtyRemaining > 0 ? item.qtyRemaining : 0,
        unitCost: item.unitCost,
    }));
};

const syncEditForm = () => {
    if (!purchaseOrder.value) return;
    if (purchaseOrder.value.supplierId) {
        editSupplierSelection.value = purchaseOrder.value.supplierId;
        editForm.supplierName = '';
    } else if (purchaseOrder.value.supplierName) {
        editSupplierSelection.value = 'CUSTOM';
        editForm.supplierName = purchaseOrder.value.supplierName;
    } else {
        editSupplierSelection.value = '';
        editForm.supplierName = '';
    }
    editForm.expectedDate = purchaseOrder.value.expectedDate ? purchaseOrder.value.expectedDate.slice(0, 10) : '';
};

const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrdersWrite'));

const canEditDetails = computed(() => {
    const status = purchaseOrder.value?.status;
    return canWrite.value && (status === 'DRAFT' || status === 'SENT');
});

const canReceive = computed(() => {
    const status = purchaseOrder.value?.status;
    return canWrite.value && status !== 'CANCELLED' && status !== 'RECEIVED';
});

const statusIndex = computed(() => {
    const status = purchaseOrder.value?.status || 'DRAFT';
    return statusSteps.indexOf(status as (typeof statusSteps)[number]);
});

const hasReceipts = computed(() => {
    return purchaseOrder.value?.items?.some((item) => item.qtyReceived > 0) ?? false;
});

const canMarkSent = computed(() => {
    return canWrite.value && purchaseOrder.value?.status === 'DRAFT';
});

const canCancel = computed(() => {
    const status = purchaseOrder.value?.status;
    if (!canWrite.value) return false;
    if (!status || status === 'RECEIVED' || status === 'CANCELLED') return false;
    if (hasReceipts.value) return false;
    return true;
});

const statusMessage = computed(() => {
    const status = purchaseOrder.value?.status;
    if (!status) return '';
    if (status === 'DRAFT') return 'Mark as sent when you forward to your supplier.';
    if (status === 'SENT') return 'Receive items as they arrive to update inventory.';
    if (status === 'PARTIALLY_RECEIVED') return 'Continue receiving until all items are complete.';
    if (status === 'RECEIVED') return 'All items received. This order is complete.';
    if (status === 'CANCELLED') return 'Order cancelled. Receiving is disabled.';
    return '';
});

const isDetailsDirty = computed(() => {
    if (!purchaseOrder.value) return false;
    const currentSupplierName = purchaseOrder.value.supplierName ?? '';
    const currentSupplierId = purchaseOrder.value.supplierId ?? '';
    const currentExpected = purchaseOrder.value.expectedDate ? purchaseOrder.value.expectedDate.slice(0, 10) : '';
    const selection = editSupplierSelection.value;
    let supplierDirty = false;
    if (selection === 'CUSTOM') {
        const name = editForm.supplierName.trim();
        supplierDirty = name !== currentSupplierName || Boolean(currentSupplierId);
    } else if (selection) {
        supplierDirty = selection !== currentSupplierId;
    }
    return supplierDirty || editForm.expectedDate !== currentExpected;
});

const orderedQty = computed(() =>
    purchaseOrder.value?.items.reduce((sum, item) => sum + (Number(item.qtyOrdered) || 0), 0) ?? 0
);

const receivedQty = computed(() =>
    purchaseOrder.value?.items.reduce((sum, item) => sum + (Number(item.qtyReceived) || 0), 0) ?? 0
);

const receiveProgressPct = computed(() => {
    if (orderedQty.value === 0) return 0;
    return Math.min(100, Math.round((receivedQty.value / orderedQty.value) * 100));
});

const orderTotal = computed(() =>
    purchaseOrder.value?.items.reduce(
        (sum, item) => sum + (Number(item.qtyOrdered) || 0) * (Number(item.unitCost) || 0),
        0
    ) ?? 0
);

const receiveTotal = computed(() => {
    return receiveLines.value.reduce((sum, line) => {
        const qty = Number.isFinite(line.qtyReceived) ? line.qtyReceived : 0;
        const cost = Number.isFinite(line.unitCost) ? line.unitCost : 0;
        return sum + qty * cost;
    }, 0);
});

const canSubmitReceive = computed(() => {
    if (!canReceive.value) return false;
    if (isSubmitting.value) return false;
    const hasQty = receiveLines.value.some((line) => line.qtyReceived > 0);
    return hasQty;
});

const resetReceiveForm = () => {
    receiveForm.invoiceNumber = '';
    receiveForm.receivedAt = '';
    buildReceiveLines();
};

const openReceiveModal = () => {
    if (!purchaseOrder.value || !canReceive.value) return;
    resetReceiveForm();
    showReceiveModal.value = true;
};

const closeReceiveModal = () => {
    if (isSubmitting.value) return;
    showReceiveModal.value = false;
};

const submitReceive = async () => {
    if (!routeStoreId.value || !routePurchaseOrderId.value) return;
    if (!canReceive.value) return;
    const items = receiveLines.value
        .filter((line) => line.qtyReceived > 0)
        .map((line) => ({
            itemType: line.itemType,
            itemId: line.itemId,
            qtyReceived: Math.min(line.qtyReceived, line.qtyRemaining),
            unitCost: line.unitCost,
        }));

    if (items.length === 0) {
        showToast('Add at least one received quantity.', 'error');
        return;
    }

    isSubmitting.value = true;
    try {
        const payload = {
            invoiceNumber: receiveForm.invoiceNumber || undefined,
            receivedAt: receiveForm.receivedAt || undefined,
            items,
        };
        const data = await receivePurchaseOrder(routeStoreId.value, routePurchaseOrderId.value, payload);
        purchaseOrder.value = data.purchaseOrder;
        buildReceiveLines();
        receiveForm.invoiceNumber = '';
        receiveForm.receivedAt = '';
        showReceiveModal.value = false;
        showToast('Receipt saved and inventory updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to receive this order.';
        showToast(message, 'error');
    } finally {
        isSubmitting.value = false;
    }
};

const saveDetails = async () => {
    if (!routeStoreId.value || !routePurchaseOrderId.value) return;
    if (!canEditDetails.value || !purchaseOrder.value) return;
    if (!isDetailsDirty.value) return;
    isUpdatingDetails.value = true;
    const payload: { supplierId?: string; supplierName?: string; expectedDate?: string | null } = {};
    const supplierName = editForm.supplierName.trim();
    const expectedDate = editForm.expectedDate.trim();
    if (editSupplierSelection.value === 'CUSTOM') {
        if (!supplierName) {
            showToast('Supplier name is required for custom entry.', 'error');
            isUpdatingDetails.value = false;
            return;
        }
        if (supplierName !== (purchaseOrder.value.supplierName ?? '') || purchaseOrder.value.supplierId) {
            payload.supplierName = supplierName;
        }
    } else if (editSupplierSelection.value && editSupplierSelection.value !== purchaseOrder.value.supplierId) {
        payload.supplierId = editSupplierSelection.value;
    }
    const currentExpected = purchaseOrder.value.expectedDate ? purchaseOrder.value.expectedDate.slice(0, 10) : '';
    if (!expectedDate && currentExpected) {
        payload.expectedDate = null;
    } else if (expectedDate && expectedDate !== currentExpected) {
        payload.expectedDate = expectedDate;
    }
    if (Object.keys(payload).length === 0) {
        syncEditForm();
        isUpdatingDetails.value = false;
        return;
    }
    try {
        const data = await updatePurchaseOrder(routeStoreId.value, routePurchaseOrderId.value, payload);
        purchaseOrder.value = data.purchaseOrder;
        syncEditForm();
        showToast('Purchase order updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update purchase order.';
        showToast(message, 'error');
    } finally {
        isUpdatingDetails.value = false;
    }
};

const resetDetails = () => {
    syncEditForm();
};

const toggleSupplierForm = () => {
    showSupplierForm.value = !showSupplierForm.value;
    supplierFormError.value = '';
    if (!showSupplierForm.value) {
        supplierForm.name = '';
        supplierForm.email = '';
        supplierForm.phone = '';
    }
};

const createSupplierFromForm = async () => {
    if (!routeStoreId.value || !canEditDetails.value) return;
    const name = supplierForm.name.trim();
    if (!name) {
        supplierFormError.value = 'Supplier name is required.';
        return;
    }
    isCreatingSupplier.value = true;
    supplierFormError.value = '';
    try {
        const payload = {
            name,
            email: supplierForm.email.trim() ? supplierForm.email.trim() : null,
            phone: supplierForm.phone.trim() ? supplierForm.phone.trim() : null,
        };
        const data = await createSupplier(routeStoreId.value, payload);
        await loadSuppliers();
        editSupplierSelection.value = data.supplier.id;
        showSupplierForm.value = false;
        supplierForm.name = '';
        supplierForm.email = '';
        supplierForm.phone = '';
        showToast('Supplier added.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to save supplier.';
        supplierFormError.value = message;
    } finally {
        isCreatingSupplier.value = false;
    }
};

const supplierOptions = computed(() => {
    if (!purchaseOrder.value?.supplierId) return suppliers.value;
    const currentId = purchaseOrder.value.supplierId;
    if (suppliers.value.some((supplier) => supplier.id === currentId)) {
        return suppliers.value;
    }
    return [
        {
            id: currentId,
            name: purchaseOrder.value.supplierName || 'Current supplier',
            email: null,
            phone: null,
            createdAt: purchaseOrder.value.createdAt,
            updatedAt: purchaseOrder.value.updatedAt,
        },
        ...suppliers.value,
    ];
});

const setReceiveAll = (line: {
    qtyRemaining: number;
    qtyReceived: number;
}) => {
    if (!canReceive.value) return;
    line.qtyReceived = line.qtyRemaining;
};

const updateStatus = async (status: string) => {
    if (!routeStoreId.value || !routePurchaseOrderId.value) return;
    if (!canWrite.value) return;
    isUpdatingStatus.value = true;
    try {
        const data = await updatePurchaseOrder(routeStoreId.value, routePurchaseOrderId.value, { status });
        purchaseOrder.value = data.purchaseOrder;
        buildReceiveLines();
        showToast(`Status updated to ${prettyStatus(status)}.`, 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update status.';
        showToast(message, 'error');
    } finally {
        isUpdatingStatus.value = false;
    }
};

const confirmCancelOrder = async () => {
    await updateStatus('CANCELLED');
    showCancelModal.value = false;
};

const goToList = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders`);
};

const openReceipt = (receiptId: string) => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders/receipts/${receiptId}`);
};

const titleLabel = computed(() => {
    if (!purchaseOrder.value) return 'Purchase order';
    return purchaseOrder.value.supplierName || 'Purchase order';
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return store.name;
});

const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'status-pill--active';
    if (status === 'CANCELLED') return 'status-pill--inactive';
    if (status === 'PARTIALLY_RECEIVED') return 'status-pill--warning';
    if (status === 'DRAFT') return 'status-pill--draft';
    return '';
};

const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString(undefined, {
        timeZone: storeContext.currentStore?.timezone || 'Asia/Manila',
    });
};

const formatQty = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch (error) {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
    }
};

onMounted(async () => {
    await storeContext.fetchStores();
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    if (isPlanLocked.value) return;
    await Promise.all([loadPurchaseOrder(), loadSuppliers()]);
});

watch(
    () => route.params.purchaseOrderId,
    async () => {
        if (isPlanLocked.value) return;
        await loadPurchaseOrder();
    }
);

watch(
    () => routeStoreId.value,
    async (storeId) => {
        if (!storeId) return;
        storeContext.setCurrentStore(storeId);
        showSupplierForm.value = false;
        if (isPlanLocked.value) return;
        await loadSuppliers();
    }
);

watch(
    () => purchaseOrder.value,
    () => {
        syncEditForm();
    }
);

watch(editSupplierSelection, (value) => {
    if (value !== 'CUSTOM') {
        editForm.supplierName = '';
    }
});
</script>

<style scoped>
/* ============================================================
   TOKENS
============================================================ */
.po-detail-page {
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
.po-detail-shell {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.detail-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 0.25rem;
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
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.detail-title p {
    color: var(--c-muted);
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
   CARDS
============================================================ */
.detail-card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    min-width: 0;
}

.card-title h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
}

.card-title p {
    margin: 0.2rem 0 0;
    color: var(--c-muted);
    font-size: 0.82rem;
}

.card-title--row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
}

.panel-state {
    padding: 2rem;
    border-radius: 12px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.9rem;
    text-align: center;
}

/* ============================================================
   STATUS STEPPER
============================================================ */
.status-steps {
    display: flex;
    padding-top: 0.25rem;
}

.status-step {
    flex: 1;
    position: relative;
    text-align: center;
    padding-top: 20px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    min-width: 0;
}

/* Connector from the previous step's dot to this one. */
.status-step:not(:first-child)::before {
    content: '';
    position: absolute;
    top: 9px;
    left: -50%;
    right: 50%;
    height: 2px;
    background: #e2e8f0;
}

.status-step::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--c-surface);
    border: 2px solid #cbd5e1;
    box-sizing: border-box;
}

.status-step.active { color: var(--c-accent-dark); }
.status-step.active:not(:first-child)::before { background: var(--c-accent); }
.status-step.active::after {
    border-color: var(--c-accent);
    background: var(--c-accent);
}

.status-step.current { font-weight: 700; }
.status-step.current::after {
    box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.18);
}

.status-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
    text-align: center;
}

.cancelled-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--c-muted);
    font-size: 0.85rem;
    font-weight: 600;
}

/* ============================================================
   META GRID
============================================================ */
.meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 1px;
    background: var(--c-border);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    overflow: hidden;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
    background: #fafbfc;
    min-width: 0;
}

.meta-item > span {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.meta-item > strong {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-text);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meta-progress {
    height: 5px;
    border-radius: 999px;
    background: #e6ebef;
    overflow: hidden;
    margin-top: 0.2rem;
}

.meta-progress-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--c-accent);
    min-width: 2px;
    transition: width 0.3s ease;
}

.meta-progress-fill--done { background: #059669; }

/* ============================================================
   STATUS PILLS
============================================================ */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    background: rgba(148, 163, 184, 0.15);
    color: var(--c-muted);
    white-space: nowrap;
}

.status-pill--title {
    font-size: 0.62rem;
    transform: translateY(2px);
}

.status-pill--active { background: rgba(13, 148, 136, 0.1); color: var(--c-accent-dark); }
.status-pill--inactive { background: rgba(148, 163, 184, 0.15); color: #64748b; }
.status-pill--warning { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.status-pill--draft { background: rgba(99, 102, 241, 0.1); color: #4338ca; }

/* ============================================================
   ITEMS TABLE
============================================================ */
.table-wrap { overflow-x: auto; min-width: 0; }

.po-items {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    min-width: 560px;
}

.po-items thead th {
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

.po-items thead th.num { text-align: right; }

.po-items tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.po-items tbody tr:hover { background: #f8fafc; }

.po-items tbody td {
    padding: 0.8rem 0.9rem;
    vertical-align: middle;
}

.po-items td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.num--muted { color: #cbd5e1; }
.num--done { color: #059669; font-weight: 600; }
.num--strong { font-weight: 700; color: var(--c-text); }

.po-items tfoot td {
    padding: 0.8rem 0.9rem;
    border-top: 1.5px solid var(--c-border);
}

.tfoot-label {
    text-align: right;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
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

/* ============================================================
   RECEIPTS
============================================================ */
.receipts-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.receipt-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--c-border);
    border-radius: 10px;
    background: #f8fafc;
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: left;
}

.receipt-row:hover {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.04);
}

.receipt-invoice {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    flex: 1;
    min-width: 0;
}

.receipt-invoice--none {
    color: var(--c-muted);
    font-weight: 500;
}

.receipt-date {
    color: var(--c-muted);
    font-size: 0.8rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.receipt-cost {
    font-weight: 700;
    color: var(--c-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.receipt-chevron { color: #cbd5e1; flex-shrink: 0; }
.receipt-row:hover .receipt-chevron { color: var(--c-accent-dark); }

/* ============================================================
   EDIT DETAILS
============================================================ */
.edit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
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
.form-field select {
    border: 1.5px solid var(--c-border);
    border-radius: 9px;
    padding: 0.55rem 0.85rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
}

.form-field input:focus,
.form-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.supplier-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.supplier-row select { flex: 1; }

.supplier-form {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 12px;
}

.supplier-actions {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.form-error {
    font-size: 0.8rem;
    font-weight: 600;
    color: #b91c1c;
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
}

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
    max-width: 640px;
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

.receive-form {
    padding: 1.25rem 1.75rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
}

.receive-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.receive-lines {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.line-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.line-header > span:first-child {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--c-text);
}

.helper {
    font-size: 0.72rem;
    color: var(--c-muted);
}

.receive-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 130px 130px;
    gap: 0.75rem;
    align-items: end;
    padding: 0.75rem 0.85rem;
    background: #f8fafc;
    border: 1px solid var(--c-border);
    border-radius: 10px;
}

.receive-row.complete { opacity: 0.55; }

.line-item { min-width: 0; align-self: center; }

.line-remaining-note {
    font-weight: 600;
    color: #b45309;
}

.receive-row.complete .line-remaining-note { color: #059669; }

.line-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.line-field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
}

.line-label {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-muted);
}

.line-action {
    border: none;
    background: none;
    padding: 0;
    font-size: 0.68rem;
    font-weight: 700;
    font-family: inherit;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.line-action:hover:not(:disabled) { text-decoration: underline; }
.line-action:disabled { opacity: 0.4; cursor: not-allowed; }

.line-input {
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    text-align: right;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-variant-numeric: tabular-nums;
}

.line-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.line-input:disabled { background: #f1f5f9; color: #94a3b8; }

.form-summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(13, 148, 136, 0.06);
    border: 1px solid rgba(13, 148, 136, 0.2);
    border-radius: 10px;
}

.form-summary span {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-accent-dark);
}

.form-summary strong {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--c-accent-dark);
    font-variant-numeric: tabular-nums;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }

.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

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
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
    white-space: nowrap;
}

.primary-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

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

.ghost-button--sm {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
}

.ghost-button--danger { color: #b91c1c; }
.ghost-button--danger:hover:not(:disabled) {
    border-color: #fca5a5;
    color: #b91c1c;
    background: #fef2f2;
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .po-detail-page { padding: 1rem 0.875rem 2.5rem; }
    .po-detail-shell { gap: 0.875rem; }
    .detail-title h1 { font-size: 1.35rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }
    .header-actions .ghost-button { flex: 1; justify-content: center; }

    .detail-card { padding: 1.1rem; border-radius: 12px; }

    .status-step { font-size: 0.62rem; }

    .meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .edit-grid { grid-template-columns: 1fr; }
    .supplier-form { grid-template-columns: 1fr; }

    .receive-form-grid { grid-template-columns: 1fr; }
    .receive-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .receive-row .line-item { grid-column: 1 / -1; }

    .receipt-row { flex-wrap: wrap; }
    .receipt-invoice { flex-basis: 100%; }
}
</style>
