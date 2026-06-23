<template>
    <teleport to="body">
        <transition name="loading-fade" appear>
            <div class="loading-overlay" role="status" aria-live="polite" aria-busy="true">
                <div class="loading-card">
                    <div class="loading-spinner">
                        <span class="loading-spinner__ring"></span>
                        <span class="loading-spinner__core"></span>
                    </div>
                    <p class="loading-text">{{ label }}</p>
                    <span class="sr-only">Loading, please wait…</span>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading…' });
</script>

<script lang="ts">
export default { name: 'Loading' };
</script>

<style scoped>
.loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(
        120% 120% at 50% 40%,
        rgba(15, 23, 42, 0.55) 0%,
        rgba(15, 23, 42, 0.78) 100%
    );
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    font-family: var(--app-font-sans);
}

.loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
    padding: 2rem 2.5rem;
    border-radius: 20px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
    animation: loading-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── Spinner ── */
.loading-spinner {
    position: relative;
    width: 58px;
    height: 58px;
}

.loading-spinner__ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
        from 0deg,
        rgba(45, 212, 191, 0) 0%,
        rgba(45, 212, 191, 0.15) 35%,
        #2dd4bf 100%
    );
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px));
    animation: loading-spin 0.9s linear infinite;
}

.loading-spinner__core {
    position: absolute;
    inset: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: #2dd4bf;
    box-shadow: 0 0 12px rgba(45, 212, 191, 0.7);
    animation: loading-pulse 1.4s ease-in-out infinite;
}

.loading-text {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(241, 245, 249, 0.85);
    animation: loading-pulse 1.6s ease-in-out infinite;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* ── Animations ── */
@keyframes loading-spin {
    to { transform: rotate(360deg); }
}

@keyframes loading-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
}

@keyframes loading-pop {
    from { opacity: 0; transform: scale(0.92) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Enter/leave transition ── */
.loading-fade-enter-active,
.loading-fade-leave-active {
    transition: opacity 0.25s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
    .loading-spinner__ring { animation-duration: 1.6s; }
    .loading-spinner__core,
    .loading-text { animation: none; }
    .loading-card { animation: none; }
}
</style>
