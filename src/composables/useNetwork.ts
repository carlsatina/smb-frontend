import { ref } from 'vue';

// Global online/offline detection shared across the app.
//
// We combine two signals:
//   1. The browser's `online`/`offline` events + `navigator.onLine` — instant,
//      works inside the Capacitor webview, reliable for "the device lost its
//      network interface".
//   2. An active reachability ping to the backend `/health` — confirms there is
//      *actual* internet (navigator.onLine can be a false positive on captive
//      portals / "connected but no internet"), and drives auto-recovery.

const baseUrl = import.meta.env.VITE_BACKEND_API || '';
const PING_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 5000;

const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const isChecking = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Resolves true if the backend is reachable. `no-cors` keeps this a pure
// network-reachability probe (we only care that the request completes, not its
// body), so it never trips CORS.
const reachable = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
        await fetch(`${baseUrl}/health`, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
        });
        clearTimeout(timer);
        return true;
    } catch {
        return false;
    }
};

const stopPolling = () => {
    if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

const startPolling = () => {
    if (pollTimer !== null) return;
    pollTimer = setInterval(async () => {
        if (navigator.onLine && (await reachable())) {
            isOnline.value = true;
            stopPolling();
        }
    }, POLL_INTERVAL_MS);
};

// Manual re-check (e.g. a "Try again" button). Returns the resulting state.
export const recheckConnection = async (): Promise<boolean> => {
    if (isChecking.value) return isOnline.value;
    isChecking.value = true;
    const ok = (typeof navigator === 'undefined' || navigator.onLine) && (await reachable());
    isOnline.value = ok;
    isChecking.value = false;
    if (ok) stopPolling();
    else startPolling();
    return ok;
};

const handleOffline = () => {
    isOnline.value = false;
    startPolling();
};

const handleOnline = async () => {
    // The OS says we're back; confirm real reachability before clearing.
    if (await reachable()) {
        isOnline.value = true;
        stopPolling();
    } else {
        handleOffline();
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    // Coming back to the app (tab focus / Capacitor resume) is a good moment to
    // re-probe if we currently think we're offline.
    window.addEventListener('focus', () => {
        if (!isOnline.value) void recheckConnection();
    });
}

export const useNetwork = () => ({ isOnline, isChecking, recheck: recheckConnection });
export { isOnline };
