<template>
    <div class="auth-shell">

        <!-- LEFT ASIDE -->
        <aside class="auth-aside">
            <div class="aside-top">
                <img :src="brandLogo" alt="SmB-PoS" class="aside-logo" />
                <router-link to="/" class="back-link">← Back to home</router-link>
            </div>

            <div class="aside-body">
                <div class="aside-eyebrow">SmB-PoS</div>
                <h1>Welcome back.</h1>
                <p>Every store in sync. Every peso tracked. Every shift ready to go.</p>

                <div class="aside-features">
                    <div class="aside-feat">
                        <span class="feat-check">✓</span>
                        <div>
                            <span class="feat-title">Real-time inventory</span>
                            <span class="feat-sub">Every movement is logged instantly</span>
                        </div>
                    </div>
                    <div class="aside-feat">
                        <span class="feat-check">✓</span>
                        <div>
                            <span class="feat-title">Role-based access</span>
                            <span class="feat-sub">Each staff sees only what they need</span>
                        </div>
                    </div>
                    <div class="aside-feat">
                        <span class="feat-check">✓</span>
                        <div>
                            <span class="feat-title">Recipe costing</span>
                            <span class="feat-sub">Ingredients auto-deduct on every sale</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="aside-foot">
                <span class="aside-foot-text">Don't have an account?</span>
                <router-link to="/register" class="aside-foot-link">Create one free →</router-link>
            </div>
        </aside>

        <!-- RIGHT FORM PANEL -->
        <div class="auth-panel">
            <div class="auth-form-wrap">
                <div class="auth-title">Sign in</div>
                <p class="auth-copy">Enter your credentials to access your store.</p>

                <form class="auth-form" @submit.prevent="handleLogin">
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

                    <label class="auth-label">
                        Password
                        <div class="password-field">
                            <input
                                :type="showPassword ? 'text' : 'password'"
                                class="auth-input"
                                placeholder="Enter your password"
                                v-model="password"
                                autocomplete="current-password"
                                @keypress.enter="handleLogin"
                            />
                            <button
                                type="button"
                                class="password-toggle"
                                @click="showPassword = !showPassword"
                                tabindex="-1"
                            >
                                <mdicon :name="showPassword ? 'eye-off-outline' : 'eye-outline'" size="20" />
                            </button>
                        </div>
                    </label>

                    <label class="auth-remember">
                        <input type="checkbox" v-model="rememberMe" />
                        <span>Remember me</span>
                    </label>

                    <div v-if="hasError" class="auth-error">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style="flex-shrink:0">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ errorMsg }}</span>
                    </div>

                    <button type="submit" class="auth-button" :disabled="loadingModal">
                        <span v-if="loadingModal" class="auth-spinner" aria-hidden="true"></span>
                        {{ loadingModal ? 'Signing in…' : 'Log in' }}
                    </button>

                    <div class="auth-links">
                        <span class="auth-link" @click="router.push('/forgot-password')">Forgot password?</span>
                        <span class="auth-link accent" @click="router.push('/register')">Create account</span>
                    </div>
                </form>
            </div>
        </div>

    </div>
</template>


<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import login from '@/composables/auth/login'
import store from '@/store'
import getProfile from '@/composables/getProfile'
import brandLogo from '@/assets/SmB-PoS.png'
import { useStoreContextStore } from '@/stores/storeContext'

export default {
    name: "LoginWeb",
    setup() {
        const router = useRouter()
        const route = useRoute()
        const email = ref('')
        const password = ref('')
        const showPassword = ref(false)
        const hasError = ref(false)
        const errorMsg = ref('')
        const loadingModal = ref(false)
        const rememberMe = ref(false)

        onMounted(() => {
            const rememberedEmail = localStorage.getItem('rememberedEmail')
            if (rememberedEmail) {
                email.value = rememberedEmail
                rememberMe.value = true
            }
            if (typeof route.query.email === 'string' && route.query.email) {
                email.value = route.query.email
            }
        })

        const handleLogin = async() => {
            hasError.value = false
            if (email.value === '' && password.value === '') {
                return
            }
            loadingModal.value = true
            const { response, error } = await login(email.value, password.value)
            loadingModal.value = false

            if (error.value === null) {
                if (response.value?.error) {
                    hasError.value = true
                    errorMsg.value = response.value.error.message || 'Login failed'
                } else if (response.value?.accessToken) {
                    if (rememberMe.value) {
                        localStorage.setItem('rememberedEmail', email.value)
                    } else {
                        localStorage.removeItem('rememberedEmail')
                    }
                    store.methods.loginUser(response.value.accessToken, response.value.csrfToken)
                    getProfile(response.value.accessToken)
                        .then((data) => {
                            if (data.error.value === null && data.response.value?.userInfo) {
                                store.methods.setUserAdmin(data.response.value.userInfo.is_admin)
                            }
                        })
                    if (route.query.redirect) {
                        router.push(String(route.query.redirect))
                    } else {
                        try {
                            const storeContext = useStoreContextStore()
                            await storeContext.fetchStores()
                            const ownerStore = storeContext.stores.find(s => s.role === 'OWNER')
                            if (ownerStore) {
                                router.push({ name: 'reports', params: { storeId: ownerStore.id } })
                            } else {
                                router.push('/stores')
                            }
                        } catch {
                            router.push('/stores')
                        }
                    }
                } else {
                    hasError.value = true
                    errorMsg.value = 'Login failed'
                }
            }
        }

        return {
            router,
            email,
            password,
            showPassword,
            handleLogin,
            hasError,
            errorMsg,
            loadingModal,
            brandLogo,
            rememberMe,
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

.aside-features {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.aside-feat {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
}

.feat-check {
    font-size: 0.75rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.18);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.1rem;
}

.feat-title {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.15rem;
}

.feat-sub {
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
    max-width: 400px;
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
    gap: 1.1rem;
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

.password-field {
    position: relative;
    display: flex;
    align-items: center;
}

.password-field .auth-input {
    padding-right: 3rem;
}

.password-toggle {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    padding: 0.2rem;
    cursor: pointer;
    color: var(--c-muted);
    display: flex;
    align-items: center;
    transition: color 0.15s;
}

.password-toggle:hover {
    color: var(--c-text);
}

.auth-remember {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.84rem;
    font-weight: 500;
    color: var(--c-muted);
    cursor: pointer;
    user-select: none;
}

.auth-remember input {
    width: 16px;
    height: 16px;
    accent-color: var(--c-accent);
    cursor: pointer;
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
}

.auth-button:hover:not(:disabled) {
    background: var(--c-accent-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.38);
}

.auth-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.auth-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.auth-links {
    display: flex;
    justify-content: space-between;
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
        align-items: flex-start;
    }
}
</style>
