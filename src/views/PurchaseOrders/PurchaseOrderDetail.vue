<template>
    <section class="po-detail-page">
        <div class="po-detail-shell">
            <header class="po-detail-header">
                <div class="po-detail-title">
                    <span class="po-detail-eyebrow">Purchase order</span>
                    <h1>{{ titleLabel }}</h1>
                    <p>Receive stock and track inbound items for {{ currentStoreLabel }}.</p>
                </div>
                <div class="po-detail-actions">
                    <button
                        v-if="purchaseOrder && canReceive"
                        type="button"
                        class="po-btn-primary po-btn-primary--auto"
                        @click="openReceiveModal"
                    >
                        Receive items
                    </button>
                    <button class="po-btn-ghost" @click="goToList">Back to orders</button>
                    <button class="po-btn-secondary" @click="goToInventory">Inventory</button>
                </div>
            </header>

            <div class="po-detail-content">
                <PlanGate
                    v-if="isPlanLocked"
                    feature="purchaseOrders"
                    title="Purchase orders are available on Standard."
                    description="Upgrade to Standard to review order details, update suppliers, and receive inventory."
                />
                <template v-else>
                <section class="po-detail-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Order detail</h2>
                            <p>{{ purchaseOrder?.supplierName || 'Unassigned supplier' }}</p>
                        </div>
                        <div class="panel-meta" v-if="purchaseOrder">
                            <span class="status-pill" :class="statusClass(purchaseOrder.status)">
                                {{ formatStatus(purchaseOrder.status) }}
                            </span>
                        </div>
                    </div>

                    <div v-if="isLoading" class="panel-state">Loading purchase order...</div>

                    <div v-else-if="!purchaseOrder" class="panel-state">
                        Purchase order not found.
                    </div>

                    <div v-else class="detail-body">
                        <div class="detail-grid">
                            <div>
                                <span>Expected date</span>
                                <strong>{{ purchaseOrder.expectedDate ? formatDate(purchaseOrder.expectedDate) : 'Anytime' }}</strong>
                            </div>
                            <div>
                                <span>Created</span>
                                <strong>{{ formatDate(purchaseOrder.createdAt) }}</strong>
                            </div>
                            <div>
                                <span>Updated</span>
                                <strong>{{ formatDate(purchaseOrder.updatedAt) }}</strong>
                            </div>
                        </div>

                        <div class="status-flow">
                            <template v-if="purchaseOrder.status === 'CANCELLED'">
                                <span class="status-pill status-pill--inactive">Cancelled</span>
                                <span class="status-note">This order is closed and cannot be received.</span>
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
                                        {{ formatStatus(step) }}
                                    </span>
                                </div>
                                <span class="status-note">{{ statusMessage }}</span>
                                <div class="status-actions" v-if="canWrite">
                                    <button
                                        type="button"
                                        class="po-btn-primary po-btn-primary--auto"
                                        :disabled="!canReceive"
                                        @click="openReceiveModal"
                                    >
                                        Receive items
                                    </button>
                                    <button
                                        v-if="canMarkSent"
                                        type="button"
                                        class="po-btn-secondary"
                                        :disabled="isUpdatingStatus"
                                        @click="updateStatus('SENT')"
                                    >
                                        Mark sent
                                    </button>
                                    <button
                                        v-if="canCancel"
                                        type="button"
                                        class="po-btn-ghost po-btn-ghost--danger"
                                        :disabled="isUpdatingStatus"
                                        @click="updateStatus('CANCELLED')"
                                    >
                                        Cancel order
                                    </button>
                                </div>
                            </template>
                        </div>

                        <div v-if="purchaseOrder.receipts && purchaseOrder.receipts.length > 0" class="receipts-section">
                            <h3>Receipts</h3>
                            <div class="receipts-list">
                                <div v-for="receipt in purchaseOrder.receipts" :key="receipt.id" class="receipt-card">
                                    <div class="receipt-info">
                                        <span class="receipt-invoice" v-if="receipt.invoiceNumber">
                                            <mdicon name="file-document-outline" size="14" />
                                            {{ receipt.invoiceNumber }}
                                        </span>
                                        <span class="receipt-invoice receipt-invoice--none" v-else>No invoice #</span>
                                        <span class="receipt-date">{{ formatDate(receipt.receivedAt) }}</span>
                                    </div>
                                    <span class="receipt-cost">{{ formatMoney(receipt.totalCost) }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="canEditDetails" class="detail-edit">
                            <div class="detail-edit-header">
                                <div>
                                    <h3>Update details</h3>
                                    <p>Edit supplier or expected date while draft or sent.</p>
                                </div>
                                <button
                                    type="button"
                                    class="po-btn-ghost"
                                    :disabled="isUpdatingDetails"
                                    @click="resetDetails"
                                >
                                    Reset
                                </button>
                            </div>
                            <div class="detail-edit-grid">
                                <label class="form-field">
                                    Supplier
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
                                            class="po-btn-ghost"
                                            :disabled="!canEditDetails"
                                            @click="toggleSupplierForm"
                                        >
                                            {{ showSupplierForm ? 'Close' : 'Add supplier' }}
                                        </button>
                                    </div>
                                </label>
                                <label v-if="editSupplierSelection === 'CUSTOM'" class="form-field">
                                    Supplier name
                                    <input v-model="editForm.supplierName" type="text" placeholder="Supplier name" />
                                </label>
                                <label class="form-field">
                                    Expected date
                                    <input v-model="editForm.expectedDate" type="date" />
                                </label>
                            </div>
                            <div v-if="showSupplierForm" class="supplier-form">
                                <label class="form-field">
                                    Supplier name
                                    <input v-model="supplierForm.name" type="text" placeholder="Fresh Supplier Co" />
                                </label>
                                <label class="form-field">
                                    Email
                                    <input v-model="supplierForm.email" type="email" placeholder="ops@supplier.com" />
                                </label>
                                <label class="form-field">
                                    Phone
                                    <input v-model="supplierForm.phone" type="tel" placeholder="+1 555 000 0000" />
                                </label>
                                <div class="supplier-actions">
                                    <span v-if="supplierFormError" class="form-error">{{ supplierFormError }}</span>
                                    <button
                                        type="button"
                                        class="po-btn-secondary"
                                        :disabled="isCreatingSupplier"
                                        @click="createSupplierFromForm"
                                    >
                                        {{ isCreatingSupplier ? 'Saving...' : 'Save supplier' }}
                                    </button>
                                </div>
                            </div>
                            <div class="detail-edit-actions">
                                <button
                                    type="button"
                                    class="po-btn-secondary"
                                    :disabled="!isDetailsDirty || isUpdatingDetails"
                                    @click="saveDetails"
                                >
                                    {{ isUpdatingDetails ? 'Saving...' : 'Save details' }}
                                </button>
                            </div>
                        </div>

                        <div class="table-wrap">
                <table class="po-items table-compact table-compact--bordered">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Ordered</th>
                                        <th>Received</th>
                                        <th>Remaining</th>
                                        <th>Unit cost</th>
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
                                        <td>{{ formatQty(item.qtyOrdered) }}</td>
                                        <td>{{ formatQty(item.qtyReceived) }}</td>
                                        <td>{{ formatQty(item.qtyRemaining) }}</td>
                                        <td>{{ formatMoney(item.unitCost) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
                </template>
            </div>
        </div>

        <Teleport to="body">
            <Transition name="modal-fade">
                <div
                    v-if="showReceiveModal"
                    class="receive-modal-backdrop"
                    role="presentation"
                    @click.self="closeReceiveModal"
                >
                    <section
                        class="receive-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="receive-modal-title"
                        @keyup.esc="closeReceiveModal"
                    >
                        <div class="receive-modal-header">
                            <div>
                                <h2 id="receive-modal-title">Receive items</h2>
                                <p>Record incoming stock and invoice details.</p>
                            </div>
                            <button
                                type="button"
                                class="receive-modal-close"
                                aria-label="Close receive items modal"
                                @click="closeReceiveModal"
                            >
                                &times;
                            </button>
                        </div>

                        <form v-if="purchaseOrder" class="receive-form" @submit.prevent="submitReceive">
                            <div class="receive-form-grid">
                                <label class="form-field">
                                    Invoice number
                                    <input v-model="receiveForm.invoiceNumber" type="text" placeholder="INV-2024-001" />
                                </label>

                                <label class="form-field">
                                    Received date
                                    <input v-model="receiveForm.receivedAt" type="date" />
                                </label>
                            </div>

                            <div class="receive-lines">
                                <div class="line-header">
                                    <span>Items to receive</span>
                                    <span class="helper">Remaining quantities auto-filled</span>
                                </div>
                                <div class="receive-grid-header">
                                    <span>Item</span>
                                    <span>Remaining</span>
                                    <span>Qty received</span>
                                    <span>Unit cost</span>
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
                                            {{ line.itemType === 'INGREDIENT' ? 'Ingredient' : 'Product' }}
                                            <span v-if="line.unit">· {{ line.unit }}</span>
                                        </div>
                                    </div>
                                    <div class="line-remaining">
                                        <span class="remaining-qty">{{ formatQty(line.qtyRemaining) }}</span>
                                        <span class="remaining-unit" v-if="line.unit">{{ line.unit }}</span>
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
                                <div>
                                    <span>Receiving total</span>
                                    <strong>{{ formatMoney(receiveTotal) }}</strong>
                                </div>
                                <div>
                                    <span>Lines</span>
                                    <strong>{{ receiveLines.length }}</strong>
                                </div>
                            </div>

                            <div class="receive-modal-actions">
                                <button type="button" class="po-btn-ghost" @click="closeReceiveModal">Cancel</button>
                                <button class="po-btn-primary po-btn-primary--auto" type="submit" :disabled="!canSubmitReceive">
                                    {{ isSubmitting ? 'Saving receipt...' : 'Record receipt' }}
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
    if (status === 'CANCELLED') {
        const confirmed = window.confirm('Cancel this purchase order? This cannot be undone.');
        if (!confirmed) return;
    }
    isUpdatingStatus.value = true;
    try {
        const data = await updatePurchaseOrder(routeStoreId.value, routePurchaseOrderId.value, { status });
        purchaseOrder.value = data.purchaseOrder;
        buildReceiveLines();
        showToast(`Status updated to ${formatStatus(status)}.`, 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update status.';
        showToast(message, 'error');
    } finally {
        isUpdatingStatus.value = false;
    }
};

const goToList = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/purchase-orders`);
};

const goToInventory = () => {
    if (!routeStoreId.value) return;
    storeContext.setCurrentStore(routeStoreId.value);
    router.push(`/stores/${routeStoreId.value}/inventory`);
};

const titleLabel = computed(() => {
    if (!purchaseOrder.value) return 'Purchase order';
    return purchaseOrder.value.supplierName ? `PO - ${purchaseOrder.value.supplierName}` : 'Purchase order';
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'Select a store to get started.';
    return `${store.name} - ${store.currency}`;
});

const formatStatus = (status: string) => status.replace('_', ' ');

const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'status-pill--active';
    if (status === 'CANCELLED') return 'status-pill--inactive';
    if (status === 'PARTIALLY_RECEIVED') return 'status-pill--warning';
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.po-detail-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    min-height: 100vh;
    padding: 2.5rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
    font-family: 'Inter', sans-serif;
}

.po-detail-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.po-detail-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-start;
    justify-content: space-between;
}

.po-detail-title h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0.3rem 0 0.4rem;
    letter-spacing: -0.03em;
    color: var(--c-text);
}

.po-detail-title p {
    color: var(--c-muted);
    max-width: 460px;
    line-height: 1.55;
    margin: 0;
    font-size: 0.9rem;
}

.po-detail-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent);
    margin-bottom: 0.3rem;
}

.po-detail-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
    flex-shrink: 0;
    padding-top: 0.25rem;
}

.po-detail-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
}

.po-detail-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    flex-wrap: wrap;
}

.panel-header h2 {
    margin: 0 0 0.2rem;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--c-text);
}

.panel-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.85rem;
}

.panel-meta {
    display: flex;
    gap: 0.6rem;
}

.detail-body {
    display: grid;
    gap: 1.5rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.8rem;
    font-size: 0.9rem;
    color: var(--c-muted);
}

.detail-grid strong {
    display: block;
    color: var(--c-text);
    font-size: 1rem;
}

.status-flow {
    display: grid;
    gap: 0.5rem;
    padding: 0.9rem 1.1rem;
    border-radius: 16px;
    background: rgba(15, 118, 110, 0.06);
}

.status-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.status-step {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(148, 163, 184, 0.2);
    color: #475569;
}

.status-step.active {
    background: rgba(15, 118, 110, 0.14);
    color: var(--c-accent-dark);
}

.status-step.current {
    background: rgba(16, 185, 129, 0.2);
    color: #047857;
}

.status-note {
    font-size: 0.85rem;
    color: var(--c-muted);
}

.status-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
}

.receipts-section {
    display: grid;
    gap: 0.6rem;
}

.receipts-section h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
}

.receipts-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.receipt-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem 0.85rem;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
}

.receipt-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.receipt-invoice {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--c-accent);
}

.receipt-invoice--none {
    color: var(--c-muted);
    font-weight: 400;
    font-style: italic;
}

.receipt-date {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.receipt-cost {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--c-text);
}

.detail-edit {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem 1.1rem;
    border-radius: 12px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
}

.detail-edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.detail-edit-header h3 {
    margin: 0;
    font-size: 1rem;
}

.detail-edit-header p {
    margin: 0.2rem 0 0;
    color: var(--c-muted);
    font-size: 0.85rem;
}

.detail-edit-grid {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.detail-edit-actions {
    display: flex;
    justify-content: flex-end;
}

.po-items {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.item-name {
    font-weight: 600;
    overflow-wrap: anywhere;
}

.item-meta {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.panel-state {
    padding: 1.25rem 1.5rem;
    color: var(--c-muted);
    background: var(--c-bg);
    border-radius: 10px;
    font-size: 0.9rem;
}

.receive-form {
    display: grid;
    gap: 1.1rem;
}

.receive-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
}

.form-field {
    display: grid;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
}

.form-field input,
.form-field select {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.form-field input:focus,
.form-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.supplier-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.6rem;
    align-items: center;
}

.supplier-form {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem;
    border-radius: 10px;
    border: 1px solid rgba(13, 148, 136, 0.2);
    background: rgba(13, 148, 136, 0.04);
}

.supplier-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
}

.form-error {
    color: #b91c1c;
    font-size: 0.85rem;
    font-weight: 600;
}

.receive-lines {
    display: grid;
    gap: 0.85rem;
}

.line-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
}

.helper {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.receive-grid-header {
    display: none;
}

.receive-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    align-items: end;
    padding: 0.75rem 0.8rem;
    border-radius: 10px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
}

.receive-row .line-item {
    grid-column: 1 / -1;
}

.receive-row .line-remaining {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    font-size: 0.85rem;
    color: var(--c-muted);
}

.receive-row .line-remaining .remaining-qty {
    font-weight: 600;
    color: var(--c-text);
}

.receive-row.complete {
    opacity: 0.6;
}

.line-item {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
}

.line-remaining {
    display: grid;
    gap: 0.2rem;
    font-weight: 600;
}

.remaining-unit {
    font-size: 0.75rem;
    color: var(--c-muted);
}

.line-field {
    display: grid;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    min-width: 0;
    width: 100%;
}

.line-field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.line-action {
    border: none;
    background: rgba(15, 118, 110, 0.12);
    color: var(--c-accent-dark);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    cursor: pointer;
}

.line-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.line-label {
    font-size: 0.7rem;
}

.line-input {
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    width: 100%;
    min-width: 0;
    transition: border-color 0.15s;
}

.line-input:focus {
    outline: none;
    border-color: var(--c-accent);
}

.form-summary {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-top: 1px dashed #e2e8f0;
    font-size: 0.9rem;
}

.form-summary strong {
    display: block;
    font-size: 1rem;
}

/* ── Buttons ── */
.po-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.po-btn-ghost:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.po-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.po-btn-ghost--danger {
    color: #b91c1c;
    border-color: #fecaca;
}

.po-btn-ghost--danger:hover:not(:disabled) {
    background: #fff5f5;
    border-color: #fca5a5;
}

.po-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.po-btn-secondary:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.po-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.po-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
    width: 100%;
}

.po-btn-primary--auto {
    width: auto;
}

.po-btn-primary:hover:not(:disabled) { background: var(--c-accent-dark); }
.po-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.receive-modal-backdrop {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: rgba(15, 23, 42, 0.45);
    color: var(--c-text);
    font-family: 'Inter', sans-serif;
}

.receive-modal {
    width: min(920px, 100%);
    max-height: min(86vh, 820px);
    overflow: auto;
    background: var(--c-surface);
    border-radius: 16px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
    padding: 1.5rem;
    display: grid;
    gap: 1.25rem;
}

.receive-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--c-border);
}

.receive-modal-header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
}

.receive-modal-header p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
}

.receive-modal-close {
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 8px;
    background: #f1f5f9;
    color: #475569;
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;
}

.receive-modal-close:hover {
    background: #e2e8f0;
}

.receive-modal .receive-grid-header {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.75fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
    gap: 0.75rem;
    padding: 0 0.8rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.receive-modal .receive-row {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.75fr) minmax(0, 0.9fr) minmax(0, 0.9fr);
    align-items: center;
    gap: 0.75rem;
}

.receive-modal .receive-row .line-item,
.receive-modal .receive-row .line-remaining {
    grid-column: auto;
}

.receive-modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.25rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

@media (max-width: 960px) {
    .po-detail-content {
        grid-template-columns: 1fr;
    }

    .receive-modal .receive-grid-header {
        display: none;
    }

    .receive-modal .receive-row {
        grid-template-columns: 1fr;
    }

    .receive-modal .receive-row .line-item,
    .receive-modal .receive-row .line-remaining {
        grid-column: 1 / -1;
    }
}

@media (max-width: 640px) {
    .receive-modal-backdrop {
        align-items: stretch;
        padding: 0.75rem;
    }

    .receive-modal {
        max-height: 100%;
        padding: 1rem;
    }

    .receive-form-grid {
        grid-template-columns: 1fr;
    }

    .receive-modal-actions {
        flex-direction: column-reverse;
        align-items: stretch;
    }

    .receive-modal-actions .po-btn-primary,
    .receive-modal-actions .po-btn-ghost {
        width: 100%;
    }

    .receive-row {
        grid-template-columns: 1fr;
    }
}
</style>
