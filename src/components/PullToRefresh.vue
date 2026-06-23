<template>
    <!-- Pull-to-refresh indicator (mobile) — slides down from under the top bar. -->
    <div
        v-if="pullDistance > 0 || isRefreshing"
        class="ptr-indicator"
        :style="{
            transform: `translateX(-50%) translateY(${pullDistance}px)`,
            opacity: isRefreshing ? 1 : progress,
        }"
        aria-hidden="true"
    >
        <span
            class="ptr-ring"
            :class="{ 'ptr-ring--spinning': isRefreshing }"
            :style="isRefreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }"
        ></span>
    </div>
</template>

<script setup lang="ts">
import { usePullToRefresh } from '@/composables/usePullToRefresh';

const props = withDefaults(
    defineProps<{
        // Called when the user pulls past the threshold and releases.
        onRefresh: () => Promise<void> | void;
        // Pages pass their own loading flag so a pull can't fire mid-load.
        disabled?: boolean;
        threshold?: number;
        maxPull?: number;
    }>(),
    { disabled: false, threshold: 70, maxPull: 120 }
);

// Mobile only: the gesture is inert (and the indicator never renders) elsewhere.
const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

const { pullDistance, isRefreshing, progress } = usePullToRefresh(
    () => props.onRefresh(),
    {
        threshold: props.threshold,
        maxPull: props.maxPull,
        isEnabled: () => isMobileViewport() && !props.disabled,
    }
);
</script>

<style scoped>
.ptr-indicator {
    position: fixed;
    top: 0;
    left: 50%;
    /* Below the sticky top bar (z-index 100) so it appears to emerge from under it. */
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.18);
    will-change: transform;
}

.ptr-ring {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid rgba(13, 148, 136, 0.25);
    border-top-color: #0d9488;
}

.ptr-ring--spinning {
    animation: ptr-spin 0.7s linear infinite;
}

@keyframes ptr-spin {
    to { transform: rotate(360deg); }
}
</style>
