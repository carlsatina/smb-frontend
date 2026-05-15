<template>
    <div class="auth-shell">

        <!-- LEFT ASIDE -->
        <aside class="auth-aside">
            <div class="aside-top">
                <img :src="brandLogo" alt="Arshii" class="aside-logo" />
                <router-link to="/login" class="back-link">← Back to sign in</router-link>
            </div>

            <div class="aside-body">
                <div class="aside-eyebrow">Account recovery</div>
                <h1>Forgot your password?</h1>
                <p>No worries — enter your email and we'll send a secure link so you can get back to selling in minutes.</p>

                <div class="aside-steps">
                    <div class="aside-step">
                        <div class="step-num">01</div>
                        <div>
                            <span class="step-title">Enter your email</span>
                            <span class="step-sub">Use the address tied to your account</span>
                        </div>
                    </div>
                    <div class="aside-step">
                        <div class="step-num">02</div>
                        <div>
                            <span class="step-title">Check your inbox</span>
                            <span class="step-sub">A time-limited reset link will be sent</span>
                        </div>
                    </div>
                    <div class="aside-step">
                        <div class="step-num">03</div>
                        <div>
                            <span class="step-title">Set a new password</span>
                            <span class="step-sub">Back to your POS in moments</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="aside-foot">
                <span class="aside-foot-text">Remember your password?</span>
                <router-link to="/login" class="aside-foot-link">Sign in →</router-link>
            </div>
        </aside>

        <!-- RIGHT FORM PANEL -->
        <div class="auth-panel">
            <div class="auth-form-wrap">
                <div class="auth-title">Reset password</div>
                <p class="auth-copy">Enter your account email and we'll send a reset link.</p>

                <form class="auth-form" @submit.prevent="handleSubmit">
                    <label class="auth-label">
                        Email address
                        <input
                            type="email"
                            class="auth-input"
                            placeholder="you@shop.com"
                            v-model="email"
                            autocomplete="email"
                            autofocus
                        />
                    </label>

                    <div v-if="errorMsg" class="auth-error">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ errorMsg }}</span>
                    </div>

                    <div v-if="successMsg" class="auth-success">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ successMsg }}</span>
                    </div>

                    <button type="submit" class="auth-button" :disabled="isSending || !email">
                        {{ isSending ? 'Sending…' : successMsg ? 'Resend link' : 'Send reset link' }}
                    </button>

                    <div class="auth-links">
                        <span>Remember your password?</span>
                        <router-link to="/login" class="auth-link-accent">Sign in</router-link>
                    </div>
                </form>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { forgotPassword } from '@/api/auth';
import brandLogo from '@/assets/SmB-PoS.png';

const email = ref('');
const isSending = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const handleSubmit = async () => {
    if (!email.value) return;
    isSending.value = true;
    errorMsg.value = '';
    successMsg.value = '';
    try {
        await forgotPassword(email.value);
        successMsg.value = 'If an account exists, a reset link has been sent.';
    } catch {
        errorMsg.value = 'Unable to send reset link. Please try again.';
    } finally {
        isSending.value = false;
    }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   TOKENS
============================================================ */
.auth-shell {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ============================================================
   ASIDE
============================================================ */
.auth-aside {
    background: linear-gradient(150deg, #0f766e 0%, #0d9488 55%, #0891b2 100%);
    color: white;
    padding: 2.5rem 3rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100vh;
    position: sticky;
    top: 0;
    align-self: start;
}

.aside-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.aside-logo {
    height: 32px;
    width: auto;
    filter: brightness(0) invert(1);
    opacity: 0.9;
}

.back-link {
    text-decoration: none;
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.82rem;
    font-weight: 500;
    transition: color 0.15s;
}

.back-link:hover {
    color: white;
}

.aside-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3rem 0;
}

.aside-eyebrow {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.65);
    background: rgba(255, 255, 255, 0.15);
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    margin-bottom: 1.25rem;
    align-self: flex-start;
}

.auth-aside h1 {
    font-size: clamp(2rem, 3vw, 3rem);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.03em;
    margin: 0 0 1rem;
    color: white;
}

.aside-body > p {
    font-size: 1rem;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.72);
    max-width: 340px;
    margin: 0 0 2.5rem;
}

.aside-steps {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.aside-step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.step-num {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.18);
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    flex-shrink: 0;
    margin-top: 0.1rem;
}

.step-title {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.15rem;
}

.step-sub {
    display: block;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.58);
    line-height: 1.4;
}

.aside-foot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.aside-foot-text {
    font-size: 0.84rem;
    color: rgba(255, 255, 255, 0.6);
}

.aside-foot-link {
    font-size: 0.84rem;
    color: white;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.15s;
}

.aside-foot-link:hover {
    opacity: 0.8;
}

/* ============================================================
   PANEL
============================================================ */
.auth-panel {
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    min-height: 100vh;
}

.auth-form-wrap {
    width: 100%;
    max-width: 420px;
}

.auth-title {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--c-text);
    margin-bottom: 0.35rem;
}

.auth-copy {
    color: var(--c-muted);
    font-size: 0.9rem;
    margin: 0 0 2rem;
    line-height: 1.5;
}

.auth-form {
    display: grid;
    gap: 1rem;
}

.auth-label {
    display: grid;
    gap: 0.45rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--c-text);
}

.auth-input {
    border-radius: 8px;
    border: 1.5px solid var(--c-border);
    padding: 0.75rem 1rem;
    font-size: 0.92rem;
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--c-text);
    background: #ffffff;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-input::placeholder {
    color: #94a3b8;
}

.auth-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.auth-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    font-size: 0.84rem;
}

.auth-success {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    font-size: 0.84rem;
}

.auth-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.8rem 1rem;
    border-radius: 8px;
    border: none;
    background: var(--c-accent);
    color: #ffffff;
    font-size: 0.92rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
}

.auth-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.auth-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.auth-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--c-muted);
}

.auth-link-accent {
    color: var(--c-accent);
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;
}

.auth-link-accent:hover {
    color: var(--c-accent-dark);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 768px) {
    .auth-shell {
        grid-template-columns: 1fr;
    }

    .auth-aside {
        min-height: auto;
        position: static;
        padding: 2rem 1.5rem;
    }

    .aside-body {
        padding: 2rem 0 1.5rem;
    }

    .auth-panel {
        min-height: auto;
        padding: 2rem 1.5rem 3rem;
        align-items: flex-start;
    }
}
</style>
