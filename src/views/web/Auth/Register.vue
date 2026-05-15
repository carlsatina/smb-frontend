<template>
    <div class="auth-shell">

        <!-- LEFT ASIDE -->
        <aside class="auth-aside">
            <div class="aside-top">
                <img :src="brandLogo" alt="SmB-PoS" class="aside-logo" />
                <router-link to="/" class="back-link">← Back to home</router-link>
            </div>

            <div class="aside-body">
                <div class="aside-eyebrow">Get started</div>
                <h1>Start in minutes.</h1>
                <p>Set up your store, add your catalog, and process your first sale — all without touching a spreadsheet.</p>

                <div class="aside-steps">
                    <div class="aside-step">
                        <div class="step-num">01</div>
                        <div>
                            <span class="step-title">Create your store</span>
                            <span class="step-sub">Set currency, tax rules, and invite your team</span>
                        </div>
                    </div>
                    <div class="aside-step">
                        <div class="step-num">02</div>
                        <div>
                            <span class="step-title">Build your catalog</span>
                            <span class="step-sub">Add products, ingredients, and recipes</span>
                        </div>
                    </div>
                    <div class="aside-step">
                        <div class="step-num">03</div>
                        <div>
                            <span class="step-title">Sell and grow</span>
                            <span class="step-sub">POS, inventory, and reports in one place</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="aside-foot">
                <span class="aside-foot-text">Already have an account?</span>
                <router-link to="/login" class="aside-foot-link">Sign in →</router-link>
            </div>
        </aside>

        <!-- RIGHT FORM PANEL -->
        <div class="auth-panel">
            <div class="auth-form-wrap">
                <div class="auth-title">Create account</div>
                <p class="auth-copy">Use a business email to get started. Free for 14 days.</p>

                <form class="auth-form" @submit.prevent="handleRegister">
                    <label class="auth-label">
                        Full name
                        <input
                            type="text"
                            class="auth-input"
                            placeholder="Enter your full name"
                            v-model="userInfo.full_name"
                            required
                        />
                    </label>

                    <label class="auth-label">
                        Email address
                        <input
                            type="text"
                            class="auth-input"
                            :class="userInfo.email && !isValidEmailFormat ? 'auth-input--error' : ''"
                            placeholder="you@shop.com"
                            v-model="userInfo.email"
                            required
                        />
                    </label>

                    <div v-if="hasError && errorMsg.email" class="auth-error">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ errorMsg.email }}</span>
                    </div>

                    <div class="field-row">
                        <label class="auth-label">
                            Password
                            <input
                                type="password"
                                class="auth-input"
                                placeholder="Create a password"
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
                    </div>

                    <div class="auth-rules">
                        <div class="auth-rule" :class="{ 'auth-rule--ok': hasMinimumChar }">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style="flex-shrink:0">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <span>8 to 20 characters</span>
                        </div>
                        <div class="auth-rule" :class="{ 'auth-rule--ok': isStrongPassword }">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style="flex-shrink:0">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <span>Uppercase, lowercase, number, and symbol</span>
                        </div>
                    </div>

                    <div v-if="hasError && errorMsg.password" class="auth-error">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ errorMsg.password }}</span>
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
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import register from '@/composables/auth/register'
import store from '@/store'
import getProfile from '@/composables/getProfile'
import brandLogo from '@/assets/SmB-PoS.png'

export default {
    name: "RegisterWeb",
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
                        const code = response.value.error.code
                        const message = response.value.error.message || 'Registration failed'
                        if (code === 'EMAIL_IN_USE') {
                            errorMsg.value.email = message
                        } else {
                            errorMsg.value.password = message
                        }
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
            hasError,
            brandLogo,
        }
    }
}
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
    height: 48px;
    width: auto;
    background: white;
    border-radius: 10px;
    padding: 4px 8px;
    display: block;
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

.auth-aside > .aside-body > p {
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
    align-items: flex-start;
    justify-content: center;
    padding: 3rem 2rem;
    min-height: 100vh;
}

.auth-form-wrap {
    width: 100%;
    max-width: 420px;
    padding-top: 1.5rem;
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

.field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
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

.auth-input--error {
    border-color: #f87171;
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

.auth-rules {
    display: grid;
    gap: 0.45rem;
}

.auth-rule {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    color: #94a3b8;
    transition: color 0.2s;
}

.auth-rule--ok {
    color: #059669;
}

.auth-button {
    border: none;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--c-accent);
    color: white;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
    margin-top: 0.25rem;
}

.auth-button:hover {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.38);
}

.auth-links {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.84rem;
    color: var(--c-muted);
}

.auth-link {
    cursor: pointer;
    transition: color 0.15s;
}

.auth-link:hover {
    color: var(--c-text);
}

.auth-link.accent {
    color: var(--c-accent-dark);
    font-weight: 600;
}

.auth-link.accent:hover {
    color: var(--c-accent);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 768px) {
    .auth-shell {
        grid-template-columns: 1fr;
    }

    .auth-aside {
        position: static;
        min-height: auto;
        padding: 2rem 1.5rem;
    }

    .aside-body {
        padding: 2rem 0;
    }

    .auth-panel {
        min-height: auto;
        padding: 2.5rem 1.5rem;
    }

    .auth-form-wrap {
        padding-top: 0;
    }

    .field-row {
        grid-template-columns: 1fr;
    }
}
</style>
