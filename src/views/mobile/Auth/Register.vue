<template>
    <div class="auth-shell">
        <div class="auth-grid">
            <aside class="auth-aside">
                <div class="auth-badge">Launch Your Store</div>
                <h1>Register your crew</h1>
                <p>Set up your first store, invite the team, and start selling in minutes.</p>
                <div class="auth-highlights">
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 1</span>
                        <span class="auth-metric">Create store</span>
                        <span class="auth-sub">Timezone, currency, inventory rules</span>
                    </div>
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Step 2</span>
                        <span class="auth-metric">Add catalog</span>
                        <span class="auth-sub">Products, recipes, ingredients</span>
                    </div>
                </div>
                <div class="auth-footer">
                    <div class="auth-chip">
                        <mdicon name="clipboard-check-outline" size="18" />
                        <span>Guided onboarding</span>
                    </div>
                    <div class="auth-chip">
                        <mdicon name="account-multiple-outline" size="18" />
                        <span>Invite your team</span>
                    </div>
                </div>
            </aside>

            <div class="auth-panel">
                <div class="auth-card">
                    <div class="auth-title">Create account</div>
                    <p class="auth-copy">Use a business email to get started.</p>

                    <form class="auth-form" @submit.prevent="handleRegister">
                        <label class="auth-label">
                            Full name
                            <input
                                type="text"
                                class="auth-input"
                                placeholder="Enter full name"
                                v-model="userInfo.full_name"
                                required
                            />
                        </label>

                        <label class="auth-label">
                            Email
                            <input
                                type="text"
                                class="auth-input"
                                :class="isValidEmailFormat ? '' : 'auth-input--error'"
                                placeholder="you@shop.com"
                                v-model="userInfo.email"
                                required
                            />
                        </label>

                        <div v-if="hasError && errorMsg.email" class="auth-error">
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>{{ errorMsg.email }}</span>
                        </div>

                        <label class="auth-label">
                            Password
                            <input
                                type="password"
                                class="auth-input"
                                placeholder="Create a secure password"
                                v-model="userInfo.password"
                                required
                            />
                        </label>

                        <label class="auth-label">
                            Confirm password
                            <input
                                type="password"
                                class="auth-input"
                                placeholder="Repeat password"
                                v-model="userInfo.verifyPassword"
                                required
                            />
                        </label>

                        <div v-if="hasError && errorMsg.password" class="auth-error">
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>{{ errorMsg.password }}</span>
                        </div>

                        <div class="auth-rules">
                            <div class="auth-rule" :class="{ 'auth-rule--ok': hasMinimumChar }">
                                <mdicon name="check-circle-outline" size="16" />
                                <span>8 to 20 characters</span>
                            </div>
                            <div class="auth-rule" :class="{ 'auth-rule--ok': isStrongPassword }">
                                <mdicon name="check-circle-outline" size="16" />
                                <span>Mix uppercase, lowercase, number, and symbol</span>
                            </div>
                        </div>

                        <button type="submit" class="auth-button">Create account</button>

                        <div class="auth-links">
                            <span>Already have an account?</span>
                            <span class="auth-link accent" @click="router.push('/login')">Sign in</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import register from '@/composables/auth/register'
import store from '@/store'
import getProfile from '@/composables/getProfile'

export default {
    name: "RegisterMobile",
    setup() {
        const router = useRouter()
        const validated = ref(null)
        const userInfo = ref({
            full_name: '',
            contact_number: '',
            email: '',
            password: '',
            verifyPassword: ''
        })
        const errorMsg = ref({email: '', password: ''})
        const hasError = ref(false)

        const handleRegister = async() => {
            hasError.value = false
            errorMsg.value.email = ''
            errorMsg.value.password = ''

            if (!validated.value) {
                hasError.value = true
                errorMsg.value.email = "Invalid Email Format!"
                return
            }

            if (userInfo.value.password !== userInfo.value.verifyPassword) {
                hasError.value = true
                errorMsg.value.password = "Passwords do not match"
                return
            }

            if (!isStrongPassword.value) {
                hasError.value = true
                errorMsg.value.password = "Password does not meet security requirements"
                return
            }

            { 
                const { response, error } = await register(userInfo.value)
                if (error.value === null) {
                    if (response.value?.error) {
                        hasError.value = true
                        errorMsg.value.password = response.value.error.message || 'Registration failed'
                    } else if (response.value?.accessToken) {
                        store.methods.loginUser(response.value.accessToken, response.value.csrfToken)
                        getProfile(response.value.accessToken)
                            .then((data) => {
                                if (data.error.value === null && data.response.value?.userInfo) {
                                    store.methods.setUserAdmin(data.response.value.userInfo.is_admin)
                                }
                            })
                        const isVerified = response.value?.user?.emailVerified === true
                        const nextRoute = isVerified ? '/stores' : `/verify-email?email=${encodeURIComponent(userInfo.value.email)}`
                        router.push(nextRoute)
                    } else {
                        hasError.value = true
                        errorMsg.value.password = 'Registration failed'
                    }
                }
            }
        }

        const isStrongPassword = computed(() => {
            return store.methods.isStrongPassword(userInfo.value.password)
        })

        const hasMinimumChar = computed(() => {
            return store.methods.hasMinimumChar(userInfo.value.password)
        })
        const isValidEmailFormat = computed(() => {
            hasError.value = false
            validated.value = store.methods.isValidEmailFormat(userInfo.value.email)
            return validated.value
        })
        return {
            router,
            userInfo,
            handleRegister,
            isStrongPassword,
            hasMinimumChar,
            isValidEmailFormat,
            errorMsg,
            hasError
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
    gap: 1rem;
}

.auth-card-lite {
    background: rgba(248, 250, 252, 0.12);
    border-radius: 18px;
    padding: 1.1rem;
    display: grid;
    gap: 0.4rem;
}

.auth-kicker {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(248, 250, 252, 0.6);
}

.auth-metric {
    font-size: 1.4rem;
    font-weight: 700;
}

.auth-sub {
    font-size: 0.85rem;
    color: rgba(248, 250, 252, 0.7);
}

.auth-footer {
    display: grid;
    gap: 0.75rem;
}

.auth-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    color: rgba(248, 250, 252, 0.85);
}

.auth-panel {
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-card {
    width: 100%;
    padding: 2rem;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: 0 25px 70px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(10px);
}

.auth-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.auth-copy {
    color: var(--muted);
    margin-bottom: 1.75rem;
}

.auth-form {
    display: grid;
    gap: 1.1rem;
}

.auth-label {
    display: grid;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink);
}

.auth-input {
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    padding: 0.85rem 1rem;
    font-size: 0.95rem;
    font-family: 'Manrope', sans-serif;
    transition: border 0.2s ease, box-shadow 0.2s ease;
}

.auth-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.15);
}

.auth-input--error {
    border-color: #f87171;
}

.auth-error {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 0.85rem;
}

.auth-rules {
    display: grid;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
}

.auth-rule {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.auth-rule--ok {
    color: #047857;
}

.auth-button {
    border: none;
    border-radius: 14px;
    padding: 0.9rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    background: var(--accent);
    color: #f8fafc;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.auth-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(15, 118, 110, 0.25);
}

.auth-links {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--muted);
}

.auth-link {
    cursor: pointer;
}

.auth-link.accent {
    color: var(--accent-strong);
    font-weight: 600;
}
</style>
