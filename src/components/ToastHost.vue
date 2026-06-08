<template>
    <transition name="snack-slide">
        <div v-if="toast.state.visible" class="snackbar" :class="`snackbar--${toast.state.variant}`">
            {{ toast.state.message }}
        </div>
    </transition>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const toast = useToast();
</script>

<style scoped>
.snackbar {
    position: fixed;
    right: 2rem;
    bottom: 2rem;
    padding: 0.85rem 1.2rem;
    border-radius: 14px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
    z-index: 1000;
}

.snackbar--success {
    background: #16a34a;
    color: #f0fdf4;
}

.snackbar--error {
    background: #dc2626;
    color: #fef2f2;
}

.snackbar--info {
    background: #0f766e;
    color: #ecfeff;
}

.snack-slide-enter-active,
.snack-slide-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.snack-slide-enter-from,
.snack-slide-leave-to {
    transform: translateY(12px);
    opacity: 0;
}

@media (max-width: 640px) {
    .snackbar {
        right: 1rem;
        left: 1rem;
        bottom: 1rem;
    }
}
</style>
