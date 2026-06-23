<template>
    <Teleport to="body">
        <Transition name="offline-fade">
            <div v-if="!isOnline" class="offline-overlay" role="alertdialog" aria-modal="true">
                <div class="offline-card">
                    <div class="offline-icon">
                        <mdicon name="wifi-off" size="40" />
                    </div>
                    <h2 class="offline-title">No internet connection</h2>
                    <p class="offline-text">
                        You appear to be offline. Check your Wi-Fi or mobile data —
                        we'll reconnect automatically once you're back.
                    </p>
                    <button
                        type="button"
                        class="offline-retry"
                        :disabled="isChecking"
                        @click="recheck"
                    >
                        <span v-if="isChecking" class="offline-spinner" aria-hidden="true"></span>
                        {{ isChecking ? 'Checking…' : 'Try again' }}
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { useNetwork } from '@/composables/useNetwork';

const { isOnline, isChecking, recheck } = useNetwork();
</script>

<style scoped>
.offline-overlay {
    position: fixed;
    inset: 0;
    /* Above everything: loading overlay (1000), dropdowns (2000), modals. */
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: radial-gradient(
        120% 120% at 50% 35%,
        rgba(15, 23, 42, 0.92) 0%,
        rgba(15, 23, 42, 0.97) 100%
    );
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    font-family: var(--app-font-sans, 'Inter', sans-serif);
}

.offline-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.85rem;
    max-width: 360px;
    padding: 2.25rem 2rem;
    border-radius: 20px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}

.offline-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(45, 212, 191, 0.1);
    color: #2dd4bf;
    margin-bottom: 0.25rem;
}

.offline-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.01em;
}

.offline-text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.55;
    color: rgba(241, 245, 249, 0.6);
}

.offline-retry {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.6rem;
    padding: 0.65rem 1.5rem;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
}

.offline-retry:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.45);
}

.offline-retry:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.offline-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    animation: offline-spin 0.7s linear infinite;
}

@keyframes offline-spin {
    to { transform: rotate(360deg); }
}

.offline-fade-enter-active,
.offline-fade-leave-active {
    transition: opacity 0.25s ease;
}

.offline-fade-enter-from,
.offline-fade-leave-to {
    opacity: 0;
}
</style>
