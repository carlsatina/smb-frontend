<template>
    <div class="auth-shell">
        <div class="auth-grid">
            <aside class="auth-aside">
                <div class="auth-badge">Email verification</div>
                <h1>Confirm your email</h1>
                <p>Verify your address to unlock store creation and invitations.</p>
                <div class="auth-highlights">
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 1</span>
                        <span class="auth-metric">Check inbox</span>
                        <span class="auth-sub">Open the verification link</span>
                    </div>
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 2</span>
                        <span class="auth-metric">Start setup</span>
                        <span class="auth-sub">Activate subscription</span>
                    </div>
                </div>
                <div class="auth-footer">
                    <div class="auth-chip">
                        <mdicon name="email-check-outline" size="18" />
                        <span>Secure verification</span>
                    </div>
                    <div class="auth-chip">
                        <mdicon name="shield-check-outline" size="18" />
                        <span>Account protection</span>
                    </div>
                </div>
            </aside>

            <div class="auth-panel">
                <div class="auth-card">
                    <div class="auth-title">Verify your email</div>
                    <p class="auth-copy">
                        {{ token ? 'We are confirming your email now.' : 'Enter your email to resend the link.' }}
                    </p>

                    <div v-if="isVerifying" class="auth-info">
                        <mdicon name="progress-clock" size="16" />
                        <span>Checking verification link...</span>
                    </div>

                    <div v-if="hasError" class="auth-error">
                        <mdicon name="alert-circle-outline" size="16" />
                        <span>{{ errorMsg }}</span>
                    </div>

                    <div v-if="successMsg" class="auth-success">
                        <mdicon name="check-circle-outline" size="16" />
                        <span>{{ successMsg }}</span>
                    </div>

                    <form class="auth-form" @submit.prevent="handleResend" v-if="showResend">
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

                        <button type="submit" class="auth-button" :disabled="!email || isSubmitting">
                            {{ isSubmitting ? 'Sending...' : resendLabel }}
                        </button>
                    </form>

                    <div class="auth-links">
                        <span class="auth-link accent" @click="router.push('/login')">Back to sign in</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resendVerification, verifyEmail } from '@/api/auth'
import { useUserContextStore } from '@/stores/userContext'

export default {
    name: 'VerifyEmailMobile',
    setup() {
        const router = useRouter()
        const route = useRoute()
        const email = ref('')
        const isSubmitting = ref(false)
        const isVerifying = ref(false)
        const hasError = ref(false)
        const errorMsg = ref('')
        const successMsg = ref('')
        const userContext = useUserContextStore()

        const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
        const showResend = computed(() => !token.value || hasError.value)
        const prefillEmail = computed(() => typeof route.query.email === 'string' ? route.query.email : '')
        const resendLabel = computed(() => (successMsg.value ? 'Resend link' : 'Send verification link'))

        const runVerify = async () => {
            if (!token.value) return
            isVerifying.value = true
            hasError.value = false
            errorMsg.value = ''
            successMsg.value = ''
            try {
                await verifyEmail(token.value)
                successMsg.value = 'Email verified. You can continue to sign in.'
                await userContext.fetchMe(true)
            } catch (error) {
                hasError.value = true
                errorMsg.value = 'Verification link is invalid or expired.'
            } finally {
                isVerifying.value = false
            }
        }

        const handleResend = async () => {
            if (!email.value) return
            hasError.value = false
            errorMsg.value = ''
            successMsg.value = ''
            isSubmitting.value = true
            try {
                await resendVerification(email.value)
                successMsg.value = 'If an account exists, a new verification link has been sent.'
            } catch (error) {
                hasError.value = true
                errorMsg.value = 'Unable to send verification email. Please try again.'
            } finally {
                isSubmitting.value = false
            }
        }

        onMounted(() => {
            if (prefillEmail.value && !email.value) {
                email.value = prefillEmail.value
            }
            runVerify()
        })

        return {
            router,
            email,
            token,
            isSubmitting,
            isVerifying,
            hasError,
            errorMsg,
            successMsg,
            showResend,
            prefillEmail,
            resendLabel,
            handleResend,
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
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 0.75rem;
}

.auth-panel {
    display: flex;
    align-items: center;
}

.auth-card {
    background: var(--surface-strong);
    border-radius: 24px;
    padding: 2.2rem;
    width: 100%;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.auth-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.auth-copy {
    color: var(--muted);
    margin-bottom: 1.5rem;
    line-height: 1.5;
}

.auth-form {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
}

.auth-label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--muted);
}

.auth-input {
    padding: 0.7rem 0.9rem;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    font-size: 0.95rem;
}

.auth-button {
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
}

.auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.auth-links {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
}

.auth-link {
    cursor: pointer;
    text-decoration: none;
}

.auth-link.accent {
    color: var(--accent-strong);
    font-weight: 600;
}

.auth-error,
.auth-success,
.auth-info {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.65rem 0.8rem;
    border-radius: 12px;
    font-size: 0.85rem;
    margin-bottom: 0.6rem;
}

.auth-error {
    background: rgba(248, 113, 113, 0.12);
    color: #b91c1c;
}

.auth-success {
    background: rgba(34, 197, 94, 0.12);
    color: #15803d;
}

.auth-info {
    background: rgba(148, 163, 184, 0.2);
    color: #475569;
}
</style>
