<template>
    <transition name="toast-slide">
        <div v-if="toast.state.visible" class="toast" :class="`toast--${toast.state.variant}`">
            {{ toast.state.message }}
        </div>
    </transition>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const toast = useToast();
</script>

<style scoped>
.toast {
    position: fixed;
    right: 2rem;
    top: 5.5rem;
    padding: 0.85rem 1.2rem;
    border-radius: 14px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
    z-index: 1000;
}

.toast--success {
    background: #16a34a;
    color: #f0fdf4;
}

.toast--error {
    background: #dc2626;
    color: #fef2f2;
}

.toast--info {
    background: #0f766e;
    color: #ecfeff;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
    transform: translateY(-12px);
    opacity: 0;
}

@media (max-width: 640px) {
    .toast {
        right: 1rem;
        left: 1rem;
        top: 5rem;
    }
}
</style>
