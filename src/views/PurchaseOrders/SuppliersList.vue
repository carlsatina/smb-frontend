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
                <div v-if="showFormModal" class="modal-backdrop" @keyup.esc="closeFormModal" tabindex="0">
                    <div class="modal-box" ref="formModalRef">
                        <div class="modal-header">
                            <div>
                                <h2>{{ editingId ? 'Edit supplier' : 'Add supplier' }}</h2>
                                <p>Save trusted supplier details for purchase orders.</p>
                            </div>
                            <button class="modal-close" @click="closeFormModal" aria-label="Close">
                                <mdicon name="close" size="20" />
                            </button>
                        </div>

                        <div v-if="!canWrite" class="panel-state modal-body">
                            You have view-only access. Ask an owner or manager to manage suppliers.
                        </div>

                        <form v-else class="modal-body" @submit.prevent="submitForm">
                            <div v-if="formError" class="form-alert">{{ formError }}</div>

                            <label class="form-field">
                                <span>Supplier name</span>
                                <input ref="supplierNameInputRef" v-model="form.name" type="text" placeholder="Fresh Supplier Co" required />
                            </label>

                            <label class="form-field">
                                <span>Email <em>optional</em></span>
                                <input v-model="form.email" type="email" placeholder="ops@supplier.com" />
                            </label>

                            <label class="form-field">
                                <span>Phone <em>optional</em></span>
                                <input v-model="form.phone" type="tel" placeholder="+63 900 000 0000" />
                            </label>

                            <div class="modal-footer">
                                <button type="button" class="ghost-button" @click="closeFormModal">Cancel</button>
                                <button class="primary-button" type="submit" :disabled="isSaving">
                                    {{ isSaving ? 'Saving…' : editingId ? 'Update supplier' : 'Create supplier' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </transition>
        </teleport>

        <div class="suppliers-shell">
            <header class="list-header">
                <button type="button" class="back-link" @click="goToPurchaseOrders">
                    <mdicon name="arrow-left" size="15" />
                    Purchase orders
                </button>
                <div class="list-header-row">
                    <div class="list-title">
                        <h1>Suppliers</h1>
                        <p>Supplier contacts for {{ currentStoreLabel }}.</p>
                    </div>
                    <div class="header-actions">
                        <button v-if="canWrite" class="primary-button" :disabled="!storeContext.currentStoreId" @click="openAddModal">
                            <mdicon name="plus" size="16" />
                            Add supplier
                        </button>
                        <span v-else-if="storeContext.currentStoreId" class="readonly-chip">View-only access</span>
                    </div>
                </div>
            </header>

            <PlanGate
                v-if="isPlanLocked"
                feature="purchaseOrders"
                title="Suppliers are available on Standard."
                description="Upgrade to Standard to manage suppliers and connect them to purchase orders."
            />

            <div v-else-if="!storeContext.currentStoreId && !isLoading" class="panel-state">
                Select or create a store to manage suppliers.
            </div>

            <section v-else class="suppliers-panel">
                <div class="panel-toolbar">
                    <div class="search-wrap">
                        <mdicon name="magnify" size="17" class="search-icon" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            class="search-input"
                            placeholder="Search by name, email, or phone…"
                        />
                    </div>
                </div>

                <SkeletonLoader v-if="isLoading" :rows="6" label="Loading suppliers…" />

                <div v-else-if="filteredSuppliers.length === 0" class="empty-state">
                    <mdicon name="truck-outline" size="34" class="empty-icon" />
                    <p class="empty-heading">No suppliers found</p>
                    <p class="empty-sub">{{ searchQuery ? 'Try a different search term.' : 'Add your first supplier to start creating purchase orders.' }}</p>
                </div>

                <template v-else>
                    <div class="table-wrap">
                        <table class="suppliers-table">
                            <thead>
                                <tr>
                                    <th>Supplier</th>
                                    <th>Contact</th>
                                    <th>Updated</th>
                                    <th v-if="canWrite" class="align-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="supplier in paginatedSuppliers"
                                    :key="supplier.id"
                                    class="row-clickable"
                                    @click="goToSupplierDetail(supplier.id)"
                                >
                                    <td class="col-name">
                                        <div class="supplier-name">{{ supplier.name }}</div>
                                    </td>
                                    <td class="col-contact">
                                        <div v-if="supplier.email" class="contact-line">
                                            <mdicon name="email-outline" size="13" />
                                            {{ supplier.email }}
                                        </div>
                                        <div v-if="supplier.phone" class="contact-line">
                                            <mdicon name="phone-outline" size="13" />
                                            {{ supplier.phone }}
                                        </div>
                                        <span v-if="!supplier.email && !supplier.phone" class="contact-empty">No contact details</span>
                                    </td>
                                    <td class="col-updated">{{ formatDate(supplier.updatedAt) }}</td>
                                    <td v-if="canWrite" class="col-actions" @click.stop>
                                        <button class="icon-btn" title="Edit" :aria-label="`Edit ${supplier.name}`" @click="selectSupplier(supplier)">
                                            <mdicon name="pencil-outline" size="17" />
                                        </button>
                                        <button
                                            class="icon-btn icon-btn--danger"
                                            title="Delete"
                                            :aria-label="`Delete ${supplier.name}`"
                                            :disabled="isDeleting === supplier.id"
                                            @click="removeSupplier(supplier)"
                                        >
                                            <mdicon name="trash-can-outline" size="17" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination">
                        <div class="pagination-info">
                            <span>{{ filteredSuppliers.length }} supplier{{ filteredSuppliers.length !== 1 ? 's' : '' }}</span>
                            <label class="pagination-size">
                                <span>Show</span>
                                <select v-model.number="pageSize">
                                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                                </select>
                            </label>
                        </div>
                        <div v-if="totalPages > 1" class="pagination-controls">
                            <button class="page-btn" :disabled="page === 1" @click="changePage(page - 1)" aria-label="Previous page">
                                <mdicon name="chevron-left" size="18" />
                            </button>
                            <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
                            <button class="page-btn" :disabled="page === totalPages" @click="changePage(page + 1)" aria-label="Next page">
                                <mdicon name="chevron-right" size="18" />
                            </button>
                        </div>
                    </div>
                </template>
            </section>
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
import SkeletonLoader from '@/components/SkeletonLoader.vue';

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
    return store.name;
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
.suppliers-shell {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.list-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
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

.list-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}

.list-title h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.35rem;
    color: var(--c-text);
}

.list-title p {
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
   PANEL & TOOLBAR
============================================================ */
.suppliers-panel {
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
    flex-wrap: wrap;
}

.search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 380px;
}

.search-icon {
    position: absolute;
    left: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
}

.search-input {
    border-radius: 9px;
    border: 1.5px solid var(--c-border);
    padding: 0.55rem 0.9rem 0.55rem 2.3rem;
    width: 100%;
    box-sizing: border-box;
    font-size: 0.875rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder { color: #94a3b8; }

.search-input:focus {
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

.suppliers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.suppliers-table thead th {
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

.suppliers-table thead th.align-right { text-align: right; }

.suppliers-table tbody tr {
    border-bottom: 1px solid var(--c-border);
    transition: background 0.12s;
}

.suppliers-table tbody tr:last-child { border-bottom: none; }
.suppliers-table tbody tr:hover { background: #f8fafc; }
.suppliers-table tbody tr.row-clickable { cursor: pointer; }

.suppliers-table tbody td {
    padding: 0.85rem 0.9rem;
    vertical-align: middle;
}

.supplier-name {
    font-weight: 600;
    color: var(--c-text);
}

.contact-line {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.contact-line + .contact-line { margin-top: 0.2rem; }

.contact-empty {
    font-size: 0.8rem;
    color: #cbd5e1;
}

.col-updated {
    color: var(--c-muted);
    font-size: 0.82rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

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

.icon-btn:hover:not(:disabled) { background: rgba(13, 148, 136, 0.08); color: var(--c-accent-dark); }
.icon-btn--danger:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

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
   PAGINATION
============================================================ */
.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--c-border);
    font-size: 0.85rem;
    color: var(--c-muted);
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.82rem;
}

.pagination-size {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-size select {
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.pagination-size select:focus {
    outline: none;
    border-color: var(--c-accent);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.page-indicator {
    font-size: 0.82rem;
    min-width: 50px;
    text-align: center;
}

.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    border: 1.5px solid var(--c-border);
    background: transparent;
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
}

.page-btn:hover:not(:disabled) { border-color: var(--c-accent); color: var(--c-accent-dark); background: rgba(13, 148, 136, 0.05); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

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

.form-field input {
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

.form-field input::placeholder { color: #94a3b8; }

.form-field input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-alert {
    border-radius: 10px;
    padding: 0.7rem 1rem;
    font-size: 0.85rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #b91c1c;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }

.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 640px) {
    .suppliers-page { padding: 1rem 0.875rem 2.5rem; }
    .suppliers-shell { gap: 1rem; }
    .list-title h1 { font-size: 1.5rem; }

    .header-actions { width: 100%; }
    .header-actions .primary-button { flex: 1; justify-content: center; }

    .suppliers-panel { padding: 1rem 0 0.75rem; border-radius: 12px; }
    .panel-toolbar { padding: 0 1rem; }
    .search-wrap { max-width: none; }
    .pagination { padding: 1rem 1rem 0; flex-direction: column; align-items: flex-start; gap: 0.5rem; }

    /* ── Table → card view ── */
    .suppliers-table thead { display: none; }
    .suppliers-table,
    .suppliers-table tbody { display: block; }

    .suppliers-table tbody tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        padding: 0.875rem 1rem;
        gap: 0.2rem 0.625rem;
        border-bottom: 1px solid var(--c-border);
    }
    .suppliers-table tbody tr:last-child { border-bottom: none; }

    .suppliers-table tbody td {
        padding: 0;
        border: none;
        vertical-align: top;
    }

    .suppliers-table tbody td.col-name { grid-column: 1; grid-row: 1; }
    .suppliers-table tbody td.col-updated {
        grid-column: 2;
        grid-row: 1;
        text-align: right;
        font-size: 0.75rem;
    }
    .suppliers-table tbody td.col-contact {
        grid-column: 1;
        grid-row: 2;
        padding-top: 0.2rem;
    }
    .suppliers-table tbody td.col-actions {
        grid-column: 2;
        grid-row: 2;
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        gap: 0.25rem;
    }
}
</style>
