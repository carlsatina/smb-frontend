<template>
    <div class="auth-shell">
        <div class="auth-grid">
            <aside class="auth-aside">
                <div class="auth-badge">POS Shift Mode</div>
                <h1>Welcome back</h1>
                <p>Keep every store in sync with fast checkouts, live inventory, and clear margins.</p>
                <div class="auth-highlights">
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Today</span>
                        <span class="auth-metric">145 orders</span>
                        <span class="auth-sub">Avg ticket $18.40</span>
                    </div>
                    <div class="auth-card-lite">
                        <span class="auth-kicker">Live stock</span>
                        <span class="auth-metric">98% on-shelf</span>
                        <span class="auth-sub">2 alerts need review</span>
                    </div>
                </div>
                <div class="auth-footer">
                    <div class="auth-chip">
                        <mdicon name="lightning-bolt-outline" size="18" />
                        <span>Fast lane POS workflows</span>
                    </div>
                    <div class="auth-chip">
                        <mdicon name="shield-check-outline" size="18" />
                        <span>Role-based access</span>
                    </div>
                </div>
            </aside>

            <div class="auth-panel">
                <div class="auth-card">
                    <div class="auth-title">Sign in</div>
                    <p class="auth-copy">Use your account credentials to open the register.</p>

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
                            <mdicon name="alert-circle-outline" size="16" />
                            <span>{{ errorMsg }}</span>
                        </div>

                        <button type="submit" class="auth-button">Log in</button>

                        <div class="auth-links">
                            <span class="auth-link" @click="router.push('/forgot-password')">Forgot password?</span>
                            <span class="auth-link accent" @click="router.push('/register')">Create account</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <Loading v-if="loadingModal" />
    </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import login from '@/composables/auth/login'
import store from '@/store'
import getProfile from '@/composables/getProfile'
import Loading from '@/components/Loading.vue'

export default {
    name: "LoginMobile",
    components: {
        Loading,
    },
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
                    const redirectPath = route.query.redirect || '/stores'
                    router.push(redirectPath)
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
            rememberMe
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

.password-field {
    position: relative;
    display: flex;
    align-items: center;
}

.password-field .auth-input {
    width: 100%;
    padding-right: 3rem;
}

.password-toggle {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
}

.password-toggle:hover {
    color: var(--ink);
}

.auth-remember {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
}

.auth-remember input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: pointer;
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
