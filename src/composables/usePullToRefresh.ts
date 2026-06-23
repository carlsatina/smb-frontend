import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

interface Options {
    threshold?: number; // px the user must pull before a release triggers a refresh
    maxPull?: number; // max visual pull distance (resistance cap)
    isEnabled?: () => boolean; // gate (e.g. mobile-only)
}

/**
 * Touch-based pull-to-refresh for window-scrolled pages.
 *
 * Activates only when the page is scrolled to the very top and the user drags
 * down. Releasing past `threshold` runs `onRefresh`. Returns reactive state for
 * driving a pull indicator.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void, options: Options = {}) {
    const threshold = options.threshold ?? 70;
    const maxPull = options.maxPull ?? 120;
    const isEnabled = options.isEnabled ?? (() => true);

    const pullDistance = ref(0);
    const isRefreshing = ref(false);

    let startY = 0;
    let tracking = false;

    const scrollTop = () =>
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const reset = () => {
        tracking = false;
        pullDistance.value = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
        if (!isEnabled() || isRefreshing.value || e.touches.length !== 1 || scrollTop() > 0) {
            tracking = false;
            return;
        }
        startY = e.touches[0].clientY;
        tracking = true;
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!tracking || isRefreshing.value) return;
        const delta = e.touches[0].clientY - startY;
        // Bail if the user scrolled up or the page moved off the top.
        if (delta <= 0 || scrollTop() > 0) {
            pullDistance.value = 0;
            return;
        }
        // Rubber-band resistance, capped.
        pullDistance.value = Math.min(maxPull, delta * 0.5);
        // Prevent native overscroll/scroll while we own the gesture.
        if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
        if (!tracking) return;
        tracking = false;
        if (pullDistance.value >= threshold && !isRefreshing.value) {
            isRefreshing.value = true;
            pullDistance.value = threshold; // snap to the spinner's resting position
            try {
                await onRefresh();
            } finally {
                isRefreshing.value = false;
                pullDistance.value = 0;
            }
        } else {
            pullDistance.value = 0;
        }
    };

    onMounted(() => {
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', reset, { passive: true });
    });

    onBeforeUnmount(() => {
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', reset);
    });

    // 0 → 1 progress toward the trigger threshold (for spinner rotation/opacity).
    const progress = computed(() => Math.min(1, pullDistance.value / threshold));

    return { pullDistance, isRefreshing, progress };
}
