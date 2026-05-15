<template>
    <div class="auth-shell">
        <div class="auth-grid">
            <aside class="auth-aside">
                <div class="auth-badge">Secure update</div>
                <h1>Create a new password</h1>
                <p>Choose a strong password so your team can keep selling without interruptions.</p>
                <div class="auth-highlights">
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Tip</span>
                        <span class="auth-metric">Use 8+ characters</span>
                        <span class="auth-sub">Mix letters, numbers, and symbols</span>
                    </div>
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Reminder</span>
                        <span class="auth-metric">Keep it unique</span>
                        <span class="auth-sub">Avoid reused passwords</span>
                    </div>
                </div>
                <div class="auth-footer">
                    <div class="auth-chip">
                        <mdicon name="shield-check-outline" size="18" />
                        <span>Protected reset flow</span>
                    </div>
                    <div class="auth-chip">
                        <mdicon name="lock-outline" size="18" />
                        <span>One-time reset link</span>
                    </div>
                </div>
            </aside>

            <div class="auth-panel">
                <div class="auth-card">
                    <div class="auth-title">Set new password</div>
                    <p class="auth-copy">Enter and confirm your new password to finish the reset.</p>

                    <form class="auth-form" @submit.prevent="handleSubmit">
                        <label class="auth-label">
                            New password
                            <input
                                type="password"
                                class="auth-input"
                                placeholder="Create a secure password"
                                v-model="password"
                                autocomplete="new-password"
                            />
                        </label>

                        <label class="auth-label">
                            Confirm password
                            <input
                                type="password"
                                class="auth-input"
                                placeholder="Re-enter your password"
                                v-model="confirmPassword"
                                autocomplete="new-password"
                            />
                        </label>

                        <div v-if="missingToken" class="auth-error">
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>Reset link is missing or invalid.</span>
                        </div>

                        <div v-if="hasError" class="auth-error">
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>{{ errorMsg }}</span>
                        </div>

                        <div v-if="successMsg" class="auth-success">
                            <mdicon name="check-circle-outline" size="16" />
                            <span>{{ successMsg }}</span>
                        </div>

                        <button type="submit" class="auth-button" :disabled="!canSubmit">
                            {{ isSubmitting ? 'Saving...' : 'Update password' }}
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
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '@/api/auth'

export default {
    name: 'ResetPasswordWeb',
    setup() {
        const router = useRouter()
        const route = useRoute()
        const password = ref('')
        const confirmPassword = ref('')
        const isSubmitting = ref(false)
        const hasError = ref(false)
        const errorMsg = ref('')
        const successMsg = ref('')

        const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
        const missingToken = computed(() => !token.value)

        const canSubmit = computed(() => {
            if (missingToken.value || isSubmitting.value) return false
            if (password.value.length < 8) return false
            if (password.value !== confirmPassword.value) return false
            return true
        })

        const handleSubmit = async () => {
            hasError.value = false
            errorMsg.value = ''
            successMsg.value = ''
            if (missingToken.value) {
                return
            }
            if (password.value.length < 8) {
                hasError.value = true
                errorMsg.value = 'Password must be at least 8 characters.'
                return
            }
            if (password.value !== confirmPassword.value) {
                hasError.value = true
                errorMsg.value = 'Passwords do not match.'
                return
            }
            isSubmitting.value = true
            try {
                await resetPassword(token.value, password.value)
                successMsg.value = 'Password updated. Redirecting to sign in...'
                password.value = ''
                confirmPassword.value = ''
                await new Promise((resolve) => setTimeout(resolve, 800))
                await router.push('/login')
            } catch (error) {
                errorMsg.value = 'Unable to reset password. Please request a new link.'
                hasError.value = true
            } finally {
                isSubmitting.value = false
            }
        }

        return {
            router,
            password,
            confirmPassword,
            isSubmitting,
            hasError,
            errorMsg,
            successMsg,
            missingToken,
            canSubmit,
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
    padding: 3rem 1.5rem;
    background: radial-gradient(80% 120% at 10% 10%, #fef3c7 0%, transparent 55%),
        radial-gradient(70% 90% at 90% 20%, #e0f2fe 0%, transparent 55%),
        linear-gradient(130deg, #f8fafc 0%, #f2f5f3 40%, #fef7ed 100%);
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-grid {
    width: min(1100px, 100%);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
    align-items: stretch;
}

.auth-aside {
    background: rgba(15, 23, 42, 0.9);
    color: #f8fafc;
    padding: 3rem;
    border-radius: 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
}

.auth-aside h1 {
    font-size: 2.5rem;
    margin: 1rem 0 0.75rem;
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
    margin-top: 2rem;
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
    font-size: 1.1rem;
    font-weight: 600;
}

.auth-sub {
    font-size: 0.85rem;
    color: rgba(248, 250, 252, 0.7);
}

.auth-footer {
    display: flex;
    gap: 0.75rem;
    margin-top: 2rem;
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
    padding: 2.5rem;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.auth-title {
    font-size: 1.8rem;
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

@media (max-width: 960px) {
    .auth-grid {
        grid-template-columns: 1fr;
    }

    .auth-panel {
        justify-content: center;
    }
}
</style>
