<template>
    <teleport to="body">
        <transition name="modal-fade" appear>
            <div v-if="show" class="confirm-overlay" @keyup.esc="onCancel" tabindex="0">
                <div class="confirm-modal" ref="modalRef">
                    <div class="confirm-header">
                        <h3>{{ title }}</h3>
                    </div>
                    <div class="confirm-body">
                        <p>{{ message }}</p>
                    </div>
                    <div class="confirm-footer">
                        <button class="ghost-button" @click="onCancel" :disabled="loading">
                            {{ cancelText }}
                        </button>
                        <button
                            class="primary-button"
                            :class="{ 'primary-button--danger': variant === 'danger' }"
                            @click="onConfirm"
                            :disabled="loading"
                        >
                            {{ loading ? 'Please wait...' : confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

const props = withDefaults(
    defineProps<{
        show: boolean;
        title?: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'default' | 'danger';
        loading?: boolean;
    }>(),
    {
        title: 'Confirm',
        message: 'Are you sure you want to proceed?',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'default',
        loading: false,
    }
);

const emit = defineEmits<{
    (e: 'confirm'): void;
    (e: 'cancel'): void;
    (e: 'update:show', value: boolean): void;
}>();

const modalRef = ref<HTMLElement | null>(null);

onClickOutside(modalRef, () => {
    if (!props.loading) {
        onCancel();
    }
});

const onConfirm = () => {
    emit('confirm');
};

const onCancel = () => {
    emit('cancel');
    emit('update:show', false);
};

watch(
    () => props.show,
    (isVisible) => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
);
</script>

<style scoped>
.confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.confirm-modal {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    width: 100%;
    max-width: 400px;
    margin: 1rem;
    overflow: hidden;
}

.confirm-header {
    padding: 1.25rem 1.5rem 0.75rem;
}

.confirm-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
}

.confirm-body {
    padding: 0 1.5rem 1.25rem;
}

.confirm-body p {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.5;
}

.confirm-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

.ghost-button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.85rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
}

.ghost-button:hover:not(:disabled) {
    background: #f1f5f9;
    color: #0f172a;
}

.ghost-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.primary-button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    background: #0f766e;
    font-size: 0.85rem;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition: all 0.15s ease;
}

.primary-button:hover:not(:disabled) {
    background: #0d6d66;
}

.primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.primary-button--danger {
    background: #dc2626;
}

.primary-button--danger:hover:not(:disabled) {
    background: #b91c1c;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-active .confirm-modal,
.modal-fade-leave-active .confirm-modal {
    transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .confirm-modal,
.modal-fade-leave-to .confirm-modal {
    transform: scale(0.95);
}
</style>
