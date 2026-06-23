import { computed, ref } from 'vue';

// Global, reference-counted loading state shared across the app.
//
// Every backend API call brackets itself with startLoading()/stopLoading().
// The overlay is visible while one or more calls are in flight and only closes
// after the *last* one settles — concurrent calls are handled by the counter.
//
// A short show-delay keeps very fast requests from flashing the overlay, and a
// minimum on-screen time prevents it from blinking out the instant it appears.

const SHOW_DELAY_MS = 150; // ignore requests that finish faster than this
const MIN_VISIBLE_MS = 400; // once shown, stay up at least this long

const pending = ref(0);
const visible = ref(false);

let showTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const clearShowTimer = () => {
    if (showTimer !== null) {
        clearTimeout(showTimer);
        showTimer = null;
    }
};

const reveal = () => {
    showTimer = null;
    if (pending.value > 0) {
        visible.value = true;
        shownAt = Date.now();
    }
};

const hideNow = () => {
    hideTimer = null;
    if (pending.value === 0) {
        visible.value = false;
    }
};

// Scoped suppression: views with their own in-place loading UI (e.g. the
// Reports dashboard with skeletons + reveal animation) can wrap a batch of
// requests so the global overlay stays out of the way. Each request captures
// the suppression state when it starts, so it applies for the request's whole
// lifetime even though it resolves after the scope is resumed.
let suppressDepth = 0;
export const isLoadingSuppressed = () => suppressDepth > 0;
export function suppressLoading(): void {
    suppressDepth += 1;
}
export function resumeLoading(): void {
    if (suppressDepth > 0) suppressDepth -= 1;
}

export const isLoading = computed(() => visible.value);

export function startLoading(): void {
    pending.value += 1;
    if (pending.value === 1) {
        // First in-flight call: arm the delayed reveal (unless already visible).
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        if (!visible.value && showTimer === null) {
            showTimer = setTimeout(reveal, SHOW_DELAY_MS);
        }
    }
}

export function stopLoading(): void {
    if (pending.value > 0) {
        pending.value -= 1;
    }
    if (pending.value > 0) return;

    // Last call settled.
    clearShowTimer();

    if (!visible.value) {
        return; // never made it on screen — nothing to do
    }

    const elapsed = Date.now() - shownAt;
    const remaining = MIN_VISIBLE_MS - elapsed;
    if (remaining > 0) {
        if (hideTimer !== null) clearTimeout(hideTimer);
        hideTimer = setTimeout(hideNow, remaining);
    } else {
        hideNow();
    }
}
