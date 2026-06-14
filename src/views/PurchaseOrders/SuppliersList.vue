<template>
    <section class="suppliers-page">
        <ConfirmModal
            v-model:show="showDeleteModal"
            title="Delete Supplier"
            :message="`Are you sure you want to delete '${supplierToDelete?.name}'? This action cannot be undone.`"
            confirm-text="Delete"
            cancel-text="Cancel"
            variant="danger"
            :loading="isDeleting !== null"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />

        <teleport to="body">
            <transition name="modal-fade" appear>
                <div v-if="showFormModal" class="sup-modal-overlay" @keyup.esc="closeFormModal" tabindex="0">
                    <div class="sup-modal" ref="formModalRef">
                        <div class="sup-modal-header">
                            <div>
                                <h2>{{ editingId ? 'Edit supplier' : 'Add supplier' }}</h2>
                                <p>Save trusted supplier details for purchase orders.</p>
                            </div>
                            <button class="sup-modal-close" @click="closeFormModal" aria-label="Close">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <div v-if="!canWrite" class="panel-state sup-modal-body">
                            You have view-only access. Ask an owner or manager to manage suppliers.
                        </div>

                        <form v-else class="sup-modal-body" @submit.prevent="submitForm">
                            <div v-if="formError" class="form-alert">{{ formError }}</div>

                            <label class="form-field">
                                Supplier name
                                <input ref="supplierNameInputRef" v-model="form.name" type="text" placeholder="Fresh Supplier Co" required />
                            </label>

                            <label class="form-field">
                                Email
                                <input v-model="form.email" type="email" placeholder="ops@supplier.com" />
                            </label>

                            <label class="form-field">
                                Phone
                                <input v-model="form.phone" type="tel" placeholder="+1 555 000 0000" />
                            </label>

                            <div class="sup-modal-footer">
                                <button type="button" class="sup-btn-ghost" @click="closeFormModal">Cancel</button>
                                <button class="sup-btn-primary" type="submit" :disabled="isSaving">
                                    {{ isSaving ? 'Saving...' : editingId ? 'Update supplier' : 'Create supplier' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </transition>
        </teleport>

        <div class="suppliers-shell">
            <header class="suppliers-header">
                <div class="suppliers-title">
                    <span class="suppliers-eyebrow">Purchasing</span>
                    <h1>Suppliers</h1>
                    <p>Manage supplier contacts for {{ currentStoreLabel }}.</p>
                </div>
                <div class="suppliers-actions">
                    <button class="sup-btn-ghost" @click="goToPurchaseOrders">Back to purchase orders</button>
                </div>
            </header>

            <div class="suppliers-content">
                <PlanGate
                    v-if="isPlanLocked"
                    feature="purchaseOrders"
                    title="Suppliers are available on Standard."
                    description="Upgrade to Standard to manage suppliers and connect them to purchase orders."
                />
                <template v-else>
                    <section class="suppliers-panel">
                        <div class="panel-header">
                            <div>
                                <h2>Supplier directory</h2>
                                <p>Manage supplier contacts and details.</p>
                            </div>
                            <button class="sup-btn-primary" :disabled="!canWrite" @click="openAddModal">Add supplier</button>
                        </div>

                        <div class="list-toolbar">
                            <input v-model="searchQuery" class="search-input" placeholder="Search suppliers…" />
                        </div>

                        <div v-if="!storeContext.currentStoreId" class="panel-state">
                            Select or create a store to manage suppliers.
                        </div>

                        <div v-else-if="isLoading" class="panel-state">Loading suppliers...</div>

                        <div v-else-if="filteredSuppliers.length === 0" class="empty-state">
                            <p class="empty-heading">No suppliers found</p>
                            <p class="empty-sub">{{ searchQuery ? 'Try a different search term.' : 'Add your first supplier using the button above.' }}</p>
                        </div>

                        <div v-else class="table-wrap">
                            <table class="suppliers-table table-compact">
                                <thead>
                                    <tr>
                                        <th>Supplier</th>
                                        <th>Contact</th>
                                        <th>Updated</th>
                                        <th class="align-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="supplier in paginatedSuppliers"
                                        :key="supplier.id"
                                    >
                                        <td>
                                            <div class="supplier-name">{{ supplier.name }}</div>
                                        </td>
                                        <td>
                                            <div>{{ supplier.email || '—' }}</div>
                                            <div class="supplier-meta">{{ supplier.phone || '—' }}</div>
                                        </td>
                                        <td>{{ formatDate(supplier.updatedAt) }}</td>
                                        <td class="table-actions">
                                            <button
                                                class="sup-btn-ghost"
                                                @click="goToSupplierDetail(supplier.id)"
                                            >
                                                View
                                            </button>
                                            <button
                                                class="sup-btn-ghost"
                                                :disabled="!canWrite"
                                                @click="selectSupplier(supplier)"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                class="sup-btn-ghost sup-btn-danger"
                                                :disabled="!canWrite || isDeleting === supplier.id"
                                                @click="removeSupplier(supplier)"
                                            >
                                                {{ isDeleting === supplier.id ? 'Deleting…' : 'Delete' }}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="pagination">
                            <div class="pagination-info">
                                <span class="pagination-count">{{ filteredSuppliers.length }} supplier{{ filteredSuppliers.length !== 1 ? 's' : '' }}</span>
                                <label class="pagination-size">
                                    <select v-model.number="pageSize">
                                        <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                            {{ size }} / page
                                        </option>
                                    </select>
                                </label>
                            </div>
                            <div v-if="totalPages > 1" class="pagination-controls">
                                <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                </button>
                                <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
                                <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </button>
                            </div>
                        </div>
                    </section>
                </template>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { onClickOutside } from '@vueuse/core';
import { createSupplier, deleteSupplier, listSuppliers, Supplier, updateSupplier } from '@/api/suppliers';
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

const suppliers = ref<Supplier[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref<string | null>(null);
const searchQuery = ref('');
const page = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 20, 50];
const supplierNameInputRef = ref<HTMLInputElement | null>(null);
const formError = ref('');
const editingId = ref<string | null>(null);

const showDeleteModal = ref(false);
const showFormModal = ref(false);
const formModalRef = ref<HTMLElement | null>(null);
const supplierToDelete = ref<Supplier | null>(null);
const routeSupplierId = computed(() => route.query.supplierId as string | undefined);
const routeSupplierQuery = computed(() => {
    const value = route.query.q;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
});

const form = reactive({
    name: '',
    email: '',
    phone: '',
});

const currentStoreLabel = computed(() => {
    const store = storeContext.currentStore;
    if (!store) return 'your store';
    return `${store.name} - ${store.currency}`;
});

const canWrite = computed(() => canAccess(storeContext.currentStore?.role, 'purchaseOrdersWrite'));
const ownerPlanTier = computed(() => storeContext.currentStore?.ownerPlanTier ?? null);
const ownerSubscriptionActive = computed(() => storeContext.currentStore?.ownerSubscriptionActive ?? false);
const planKnown = computed(() => ownerPlanTier.value !== null);
const isPlanLocked = computed(
    () =>
        !ownerSubscriptionActive.value ||
        (planKnown.value && !hasPlanFeature(ownerPlanTier.value, 'purchaseOrders'))
);

const filteredSuppliers = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return suppliers.value;
    return suppliers.value.filter((supplier) => {
        return (
            supplier.name.toLowerCase().includes(query) ||
            (supplier.email || '').toLowerCase().includes(query) ||
            (supplier.phone || '').toLowerCase().includes(query)
        );
    });
});

const totalPages = computed(() => {
    if (filteredSuppliers.value.length === 0) return 0;
    return Math.ceil(filteredSuppliers.value.length / pageSize.value);
});

const paginatedSuppliers = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filteredSuppliers.value.slice(start, start + pageSize.value);
});

const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages.value) return;
    page.value = nextPage;
};

const loadSuppliers = async () => {
    if (isPlanLocked.value) {
        suppliers.value = [];
        return;
    }
    const storeId = storeContext.currentStoreId;
    if (!storeId) {
        suppliers.value = [];
        return;
    }
    isLoading.value = true;
    try {
        const data = await listSuppliers(storeId);
        suppliers.value = data.suppliers;
        applySupplierFromQuery();
        applySearchFromQuery();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load suppliers.';
        showToast(message, 'error');
    } finally {
        isLoading.value = false;
    }
};

const openAddModal = () => {
    editingId.value = null;
    form.name = '';
    form.email = '';
    form.phone = '';
    formError.value = '';
    showFormModal.value = true;
    nextTick(() => supplierNameInputRef.value?.focus());
};

const closeFormModal = () => {
    showFormModal.value = false;
    editingId.value = null;
    form.name = '';
    form.email = '';
    form.phone = '';
    formError.value = '';
};


const applySupplierFromQuery = () => {
    if (!routeSupplierId.value) return;
    const match = suppliers.value.find((supplier) => supplier.id === routeSupplierId.value);
    if (match) {
        selectSupplier(match);
    }
};

const applySearchFromQuery = () => {
    if (!routeSupplierQuery.value) return;
    searchQuery.value = routeSupplierQuery.value;
};

const selectSupplier = (supplier: Supplier) => {
    editingId.value = supplier.id;
    form.name = supplier.name;
    form.email = supplier.email || '';
    form.phone = supplier.phone || '';
    formError.value = '';
    showFormModal.value = true;
};

const submitForm = async () => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    if (!form.name.trim()) {
        formError.value = 'Supplier name is required.';
        return;
    }
    isSaving.value = true;
    formError.value = '';
    const payload = {
        name: form.name.trim(),
        email: form.email.trim() ? form.email.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
    };

    try {
        if (editingId.value) {
            await updateSupplier(storeContext.currentStoreId, editingId.value, payload);
            showToast('Supplier updated.', 'success');
        } else {
            await createSupplier(storeContext.currentStoreId, payload);
            showToast('Supplier added.', 'success');
        }
        closeFormModal();
        await loadSuppliers();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to save supplier.';
        formError.value = message;
    } finally {
        isSaving.value = false;
    }
};

const removeSupplier = (supplier: Supplier) => {
    if (!storeContext.currentStoreId || !canWrite.value) return;
    supplierToDelete.value = supplier;
    showDeleteModal.value = true;
};

const confirmDelete = async () => {
    if (!storeContext.currentStoreId || !supplierToDelete.value) return;
    isDeleting.value = supplierToDelete.value.id;
    try {
        await deleteSupplier(storeContext.currentStoreId, supplierToDelete.value.id);
        showToast('Supplier deleted.', 'success');
        showDeleteModal.value = false;
        supplierToDelete.value = null;
        await loadSuppliers();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to delete supplier.';
        showToast(message, 'error');
    } finally {
        isDeleting.value = null;
    }
};

const cancelDelete = () => {
    showDeleteModal.value = false;
    supplierToDelete.value = null;
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: storeContext.currentStore?.timezone || 'Asia/Manila' });
};

const goToPurchaseOrders = () => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/purchase-orders`);
};

const goToSupplierDetail = (supplierId: string) => {
    if (!storeContext.currentStoreId) return;
    router.push(`/stores/${storeContext.currentStoreId}/suppliers/${supplierId}`);
};

onClickOutside(formModalRef, () => {
    if (!isSaving.value) {
        closeFormModal();
    }
});

watch(
    () => showFormModal.value,
    (isVisible) => {
        document.body.style.overflow = isVisible ? 'hidden' : '';
    }
);

onMounted(async () => {
    await storeContext.fetchStores();
    const routeStoreId = route.params.storeId as string | undefined;
    if (routeStoreId && routeStoreId !== storeContext.currentStoreId) {
        storeContext.setCurrentStore(routeStoreId);
    }
    if (isPlanLocked.value) return;
    await loadSuppliers();
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
    () => storeContext.currentStoreId,
    async () => {
        page.value = 1;
        if (isPlanLocked.value) return;
        await loadSuppliers();
    }
);

watch(
    () => routeSupplierId.value,
    () => {
        applySupplierFromQuery();
    }
);

watch(
    () => routeSupplierQuery.value,
    () => {
        applySearchFromQuery();
    }
);

watch(
    () => searchQuery.value,
    () => {
        page.value = 1;
    }
);

watch(
    () => pageSize.value,
    () => {
        page.value = 1;
    }
);

watch(
    () => filteredSuppliers.value.length,
    () => {
        if (page.value > totalPages.value && totalPages.value > 0) {
            page.value = totalPages.value;
        } else if (totalPages.value === 0) {
            page.value = 1;
        }
    }
);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.suppliers-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    padding: 2.5rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
}

/* ============================================================
   SHELL / HEADER
============================================================ */
.suppliers-shell {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.suppliers-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-end;
    justify-content: space-between;
}

.suppliers-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: #ccfbf1;
    color: var(--c-accent-dark);
    margin-bottom: 0.4rem;
}

.suppliers-title h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.suppliers-title p {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.95rem;
}

.suppliers-actions {
    display: flex;
    gap: 0.75rem;
}

/* ============================================================
   CONTENT LAYOUT
============================================================ */
.suppliers-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ============================================================
   PANEL
============================================================ */
.suppliers-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem 2rem;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.panel-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.panel-header p {
    color: var(--c-muted);
    margin: 0;
    font-size: 0.875rem;
}

/* ============================================================
   TOOLBAR
============================================================ */
.list-toolbar {
    margin-top: 1.25rem;
}

/* ============================================================
   PANEL STATE
============================================================ */
.panel-state {
    margin-top: 1.25rem;
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    background: #f0fdf9;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

/* ============================================================
   EMPTY STATE
============================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 2.5rem 1rem;
    margin-top: 1.25rem;
    border: 1px dashed var(--c-border);
    border-radius: 12px;
    color: var(--c-muted);
    text-align: center;
}

.empty-heading {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--c-text);
    margin: 0;
}

.empty-sub {
    font-size: 0.85rem;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   TABLE
============================================================ */
.table-wrap {
    margin-top: 1.25rem;
    overflow-x: auto;
}

.suppliers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
}

.suppliers-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
    border-bottom: 2px solid var(--c-border);
    white-space: nowrap;
}

.suppliers-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--c-border);
    color: var(--c-text);
    vertical-align: middle;
}

.suppliers-table tbody tr:last-child td {
    border-bottom: none;
}

.suppliers-table tbody tr:hover td {
    background: var(--c-bg);
}

.supplier-name {
    font-weight: 600;
    font-size: 0.9rem;
}

.supplier-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
    margin-top: 0.1rem;
    font-family: 'SF Mono', ui-monospace, monospace;
}

.align-right {
    text-align: right;
}

.table-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
}

.table-actions .sup-btn-ghost {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
}

/* ============================================================
   PAGINATION
============================================================ */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--c-border);
    gap: 1rem;
    flex-wrap: wrap;
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.pagination-count {
    font-size: 0.82rem;
    color: var(--c-muted);
}

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.pagination-size select {
    font-family: 'Inter', sans-serif;
    font-size: 0.82rem;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    color: var(--c-text);
    background: var(--c-surface);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.page-indicator {
    font-size: 0.82rem;
    color: var(--c-muted);
    min-width: 48px;
    text-align: center;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    padding: 0;
}

.page-btn:hover:not(:disabled) {
    background: var(--c-bg);
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

/* ============================================================
   FORM MODAL
============================================================ */
.sup-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    padding: 1rem;
}

.sup-modal {
    background: var(--c-surface);
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    width: 100%;
    max-width: 480px;
    overflow: hidden;
}

.sup-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--c-border);
}

.sup-modal-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.sup-modal-header p {
    font-size: 0.875rem;
    color: var(--c-muted);
    margin: 0;
}

.sup-modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}

.sup-modal-close:hover {
    background: var(--c-bg);
    color: var(--c-text);
}

.sup-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
}

.sup-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.5rem;
}

/* ============================================================
   FORM FIELDS
============================================================ */
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-muted);
}

.form-field input {
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
    text-transform: none;
    letter-spacing: 0;
}

.form-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   LOCAL BUTTONS
============================================================ */
.sup-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    white-space: nowrap;
}

.sup-btn-ghost:hover:not(:disabled) {
    background: var(--c-bg);
    border-color: #cbd5e1;
    color: var(--c-text);
}

.sup-btn-ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.sup-btn-ghost.sup-btn-danger {
    color: #b91c1c;
    border-color: rgba(185, 28, 28, 0.35);
}

.sup-btn-ghost.sup-btn-danger:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #fca5a5;
}

.sup-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.sup-btn-primary:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.sup-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.form-alert {
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 0.65rem 0.9rem;
    font-weight: 500;
    font-size: 0.875rem;
}

/* ============================================================
   SEARCH INPUT
============================================================ */
.search-input {
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.85rem;
    min-width: 180px;
    font-size: 0.9rem;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s;
    width: 100%;
    max-width: 260px;
}

.search-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ============================================================
   MODAL TRANSITION
============================================================ */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-active .sup-modal,
.modal-fade-leave-active .sup-modal {
    transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .sup-modal,
.modal-fade-leave-to .sup-modal {
    transform: scale(0.95);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 600px) {
    .suppliers-page {
        padding: 2rem 1rem 3rem;
    }
}
</style>
