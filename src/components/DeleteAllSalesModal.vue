<template>
    <Teleport to="body">
        <Transition name="ds-fade">
            <div v-if="show" class="ds-overlay" @click.self="requestClose" @keydown.esc="requestClose">
                <div class="ds" role="dialog" aria-modal="true" aria-labelledby="dsa-title">
                    <header class="ds-header">
                        <mdicon name="delete-alert-outline" size="22" class="ds-icon" />
                        <h3 id="dsa-title">Delete all sales{{ storeName ? ` in ${storeName}` : '' }}?</h3>
                    </header>
                    <div class="ds-body">
                        <ul class="ds-effects">
                            <li>Every sale is removed from sales history, reports and daily totals, not just the ones shown on screen.</li>
                            <li>Stock used by finalized sales goes back to inventory. Voided sales already returned theirs.</li>
                            <li>The deletion is recorded in the audit log.</li>
                        </ul>
                        <label class="ds-field">
                            <span>Reason <em>optional</em></span>
                            <textarea
                                v-model="reason"
                                rows="2"
                                maxlength="300"
                                placeholder="e.g. Clearing test data"
                                :disabled="isDeleting"
                            ></textarea>
                        </label>
                        <label class="ds-field">
                            <span>Type <code>{{ DELETE_ALL_SALES_PHRASE }}</code> to confirm</span>
                            <input
                                ref="confirmInput"
                                v-model="confirmText"
                                type="text"
                                autocomplete="off"
                                autocapitalize="characters"
                                spellcheck="false"
                                :placeholder="DELETE_ALL_SALES_PHRASE"
                                :disabled="isDeleting"
                                @keydown.enter.prevent="confirmDelete"
                            />
                        </label>
                        <p class="ds-warning">This can't be undone from the app.</p>
                    </div>
                    <footer class="ds-footer">
                        <button type="button" class="ds-btn ds-btn--ghost" :disabled="isDeleting" @click="requestClose">Cancel</button>
                        <button type="button" class="ds-btn ds-btn--danger" :disabled="!canConfirm" @click="confirmDelete">
                            {{ isDeleting ? 'Deleting…' : 'Delete all sales' }}
                        </button>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { deleteAllSales, DELETE_ALL_SALES_PHRASE } from '@/api/sales';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';

const props = defineProps<{ show: boolean; storeName?: string }>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'deleted', deletedCount: number): void;
}>();

const storeContext = useStoreContextStore();
const { showToast } = useToast();
const reason = ref('');
const confirmText = ref('');
const isDeleting = ref(false);
const confirmInput = ref<HTMLInputElement | null>(null);

const canConfirm = computed(() => !isDeleting.value && confirmText.value.trim() === DELETE_ALL_SALES_PHRASE);

watch(
    () => props.show,
    async (open) => {
        if (!open) return;
        reason.value = '';
        confirmText.value = '';
        await nextTick();
        confirmInput.value?.focus();
    }
);

const requestClose = () => {
    if (!isDeleting.value) emit('close');
};

const confirmDelete = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !canConfirm.value) return;
    isDeleting.value = true;
    try {
        const result = await deleteAllSales(storeId, reason.value.trim() || null);
        showToast(
            result.deletedCount === 0
                ? 'There were no sales to delete.'
                : `Deleted ${result.deletedCount} sale${result.deletedCount === 1 ? '' : 's'}.`,
            'success'
        );
        emit('deleted', result.deletedCount);
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to delete sales.', 'error');
    } finally {
        isDeleting.value = false;
    }
};
</script>

<style scoped>
.ds-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    font-family: 'Inter', -apple-system, sans-serif;
}

.ds {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 460px;
    overflow: hidden;
}

.ds-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 1.1rem 1.25rem 0.5rem;
}

.ds-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
}

.ds-icon {
    display: inline-flex;
    color: #dc2626;
}

.ds-body {
    padding: 0.25rem 1.25rem 1rem;
    display: grid;
    gap: 0.75rem;
}

.ds-effects {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #475569;
}

.ds-field {
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #0f172a;
}

.ds-field em {
    font-style: normal;
    font-weight: 400;
    color: #94a3b8;
}

.ds-field code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #fef2f2;
    color: #b91c1c;
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
}

.ds-field textarea,
.ds-field input {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem 0.65rem;
    font-family: inherit;
    font-size: 0.875rem;
    color: #0f172a;
}

.ds-field textarea {
    resize: vertical;
}

.ds-field textarea:focus,
.ds-field input:focus {
    outline: none;
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.ds-warning {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: #b91c1c;
}

.ds-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.85rem 1.25rem;
    border-top: 1px solid #e2e8f0;
}

.ds-btn {
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
}

.ds-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.ds-btn--ghost {
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #0f172a;
}

.ds-btn--danger {
    border: none;
    background: #dc2626;
    color: #fff;
}

.ds-btn--danger:hover:not(:disabled) {
    background: #b91c1c;
}

.ds-fade-enter-active,
.ds-fade-leave-active {
    transition: opacity 0.2s ease;
}

.ds-fade-enter-from,
.ds-fade-leave-to {
    opacity: 0;
}
</style>
