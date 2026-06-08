<template>
    <div class="skeleton-wrap" :aria-label="label" role="status">
        <div v-for="i in rows" :key="i" class="skeleton-row">
            <div class="skeleton-cell skeleton-cell--icon" v-if="showIcon"></div>
            <div class="skeleton-cell" :style="{ width: colWidths[0] }"></div>
            <div class="skeleton-cell" :style="{ width: colWidths[1] }"></div>
            <div class="skeleton-cell skeleton-cell--short" :style="{ width: colWidths[2] }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    rows?: number;
    columns?: number;
    label?: string;
    showIcon?: boolean;
}>(), {
    rows: 6,
    columns: 3,
    label: 'Loading…',
    showIcon: false,
});

const WIDTHS = [
    ['55%', '20%', '12%'],
    ['40%', '25%', '18%'],
    ['65%', '15%', '14%'],
    ['45%', '22%', '16%'],
    ['60%', '18%', '10%'],
    ['50%', '20%', '15%'],
];

const colWidths = computed(() => WIDTHS[props.rows % WIDTHS.length]);
</script>

<style scoped>
.skeleton-wrap {
    padding: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.skeleton-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: #f8fafc;
}

.skeleton-cell {
    height: 13px;
    border-radius: 6px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    flex-shrink: 0;
}

.skeleton-cell:first-child {
    flex: 1;
}

.skeleton-cell--icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex: none;
}

.skeleton-cell--short {
    flex: none;
}

@keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
