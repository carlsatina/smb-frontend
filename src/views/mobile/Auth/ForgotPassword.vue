<template>
    <div class="auth-shell">
        <div class="auth-grid">
            <aside class="auth-aside">
                <div class="auth-badge">Account recovery</div>
                <h1>Reset your password</h1>
                <p>We will email you a secure reset link so you can get back to selling fast.</p>
                <div class="auth-highlights">
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 1</span>
                        <span class="auth-metric">Request link</span>
                        <span class="auth-sub">Enter your account email</span>
                    </div>
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 2</span>
                        <span class="auth-metric">Set new password</span>
                        <span class="auth-sub">Return to POS in minutes</span>
                    </div>
                </div>
                <div class="auth-footer">
                    <div class="auth-chip">
                        <mdicon name="shield-check-outline" size="18" />
                        <span>Secure, time-limited link</span>
                    </div>
                    <div class="auth-chip">
                        <mdicon name="clock-outline" size="18" />
                        <span>Quick reset flow</span>
                    </div>
                </div>
            </aside>

            <div class="auth-panel">
                <div class="auth-card">
                    <div class="auth-title">Forgot password</div>
                    <p class="auth-copy">Enter your account email and we will send a reset link.</p>

                    <form class="auth-form" @submit.prevent="handleSubmit">
                        <label class="auth-label">
                            Email address
                            <input
                                type="email"
                                class="auth-input"
                                placeholder="you@shop.com"
                                v-model="email"
                                autocomplete="email"
                            />
                        </label>

                        <div v-if="hasError" class="auth-error">
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>{{ errorMsg }}</span>
                        </div>

                        <div v-if="successMsg" class="auth-success">
                            <mdicon name="check-circle-outline" size="16" />
                            <span>{{ successMsg }}</span>
                        </div>

                        <button type="submit" class="auth-button" :disabled="isSending || !email">
                            {{ buttonLabel }}
                        </button>

                        <div class="auth-links">
                            <span class="auth-link accent" @click="router.push('/login')">Back to sign in</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { forgotPassword } from '@/api/auth'

export default {
    name: 'ForgotPasswordMobile',
    setup() {
        const router = useRouter()
        const email = ref('')
        const isSending = ref(false)
        const hasError = ref(false)
        const errorMsg = ref('')
        const successMsg = ref('')

        const buttonLabel = computed(() => {
            if (isSending.value) return 'Sending...'
            if (successMsg.value) return 'Resend link'
            return 'Send reset link'
        })

        const handleSubmit = async () => {
            hasError.value = false
            errorMsg.value = ''
            successMsg.value = ''
            if (!email.value) {
                return
            }
            isSending.value = true
            try {
                await forgotPassword(email.value)
                successMsg.value = 'If an account exists, a reset link has been sent.'
            } catch (error) {
                errorMsg.value = 'Unable to send reset link. Please try again.'
            } finally {
                isSending.value = false
            }
        }

        return {
            router,
            email,
            isSending,
            hasError,
            errorMsg,
            successMsg,
            buttonLabel,
            handleSubmit,
        }
    }
}
</script>

<style scoped>
.auth-shell {
    --ink: #0f172a;
    --muted: #64748b;
    --accent: #0f766e;
    --accent-strong: #115e59;
    --surface: rgba(255, 255, 255, 0.9);
    --surface-strong: #ffffff;
    min-height: 100vh;
    padding: 2.5rem 1.25rem;
    background: radial-gradient(80% 120% at 10% 10%, #fef3c7 0%, transparent 55%),
        radial-gradient(70% 90% at 90% 20%, #e0f2fe 0%, transparent 55%),
        linear-gradient(130deg, #f8fafc 0%, #f2f5f3 40%, #fef7ed 100%);
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-grid {
    width: min(900px, 100%);
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
}

.auth-aside {
    background: rgba(15, 23, 42, 0.9);
    color: #f8fafc;
    padding: 2.25rem;
    border-radius: 24px;
    display: grid;
    gap: 1.5rem;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
}

.auth-aside h1 {
    font-size: 2rem;
    margin: 0.75rem 0 0.5rem;
    letter-spacing: -0.02em;
}

.auth-aside p {
    color: rgba(248, 250, 252, 0.78);
    line-height: 1.6;
}

.auth-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.15);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
}

.auth-highlights {
    display: grid;
    gap: 0.85rem;
}

.auth-card-lite {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.9rem 1rem;
    border-radius: 18px;
    display: grid;
    gap: 0.25rem;
}

.auth-kicker {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(248, 250, 252, 0.6);
}

.auth-metric {
    font-size: 1.05rem;
    font-weight: 600;
}

.auth-sub {
    font-size: 0.85rem;
    color: rgba(248, 250, 252, 0.7);
}

.auth-footer {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.auth-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 0.8rem;
}

.auth-panel {
    display: flex;
    align-items: center;
}

.auth-card {
    width: 100%;
    background: var(--surface);
    border-radius: 24px;
    padding: 2.25rem;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.auth-title {
    font-size: 1.6rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
}

.auth-copy {
    color: var(--muted);
    margin-bottom: 2rem;
}

.auth-form {
    display: grid;
    gap: 1.2rem;
}

.auth-label {
    display: grid;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
}

.auth-input {
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
}

.auth-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.15);
}

.auth-button {
    border: none;
    border-radius: 14px;
    padding: 0.85rem 1.1rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
}

.auth-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.auth-error,
.auth-success {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
    border-radius: 12px;
}

.auth-error {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
}

.auth-success {
    background: rgba(16, 185, 129, 0.12);
    color: #047857;
}

.auth-links {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    font-size: 0.85rem;
}

.auth-link {
    color: var(--muted);
}

.auth-link.accent {
    color: var(--accent);
    cursor: pointer;
    font-weight: 600;
}
</style>
