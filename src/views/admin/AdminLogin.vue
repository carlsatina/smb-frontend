<template>
    <div class="al-page">
        <div class="al-card">
            <div class="al-brand">
                <span class="al-brand-icon">⬡</span>
                <span class="al-brand-label">Platform Admin</span>
            </div>

            <h1 class="al-title">Sign in</h1>
            <p class="al-sub">Restricted access. Authorised personnel only.</p>

            <form class="al-form" @submit.prevent="handleLogin">
                <div class="al-field">
                    <label class="al-label" for="email">Email</label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        class="al-input"
                        autocomplete="email"
                        placeholder="admin@example.com"
                        :disabled="loading"
                        required
                    />
                </div>

                <div class="al-field">
                    <label class="al-label" for="password">Password</label>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        class="al-input"
                        autocomplete="current-password"
                        placeholder="••••••••"
                        :disabled="loading"
                        required
                    />
                </div>

                <div v-if="error" class="al-error">{{ error }}</div>

                <button type="submit" class="al-btn" :disabled="loading">
                    {{ loading ? 'Signing in…' : 'Sign in' }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserContextStore } from '@/stores/userContext';

const router = useRouter();
const userContext = useUserContextStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleLogin = async () => {
    error.value = null;
    loading.value = true;

    try {
        const res = await fetch(
            (import.meta.env.VITE_BACKEND_API || '') + '/api/v1/auth/login',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.value, password: password.value }),
            }
        );

        const data = await res.json();

        if (!res.ok) {
            error.value = data?.error?.message || 'Invalid email or password.';
            return;
        }

        if (!data.user?.isSuperAdmin) {
            error.value = 'Access denied. This account is not a platform admin.';
            return;
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('token', data.accessToken);
        if (data.csrfToken) {
            localStorage.setItem('csrfToken', data.csrfToken);
        }

        await userContext.fetchMe(true);
        router.push({ name: 'admin-dashboard' });
    } catch {
        error.value = 'Unable to connect. Please try again.';
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.al-page {
    min-height: 100vh;
    background: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    font-family: 'Inter', system-ui, sans-serif;
}

.al-card {
    width: 100%;
    max-width: 380px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    padding: 2.25rem 2rem;
}

.al-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.75rem;
}

.al-brand-icon {
    font-size: 1.1rem;
    color: #0d9488;
}

.al-brand-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #64748b;
}

.al-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #f1f5f9;
    margin: 0 0 0.3rem;
    letter-spacing: -0.02em;
}

.al-sub {
    font-size: 0.82rem;
    color: #475569;
    margin: 0 0 1.75rem;
}

.al-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.al-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.al-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
}

.al-input {
    padding: 0.65rem 0.875rem;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.875rem;
    color: #f1f5f9;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
}

.al-input::placeholder { color: #334155; }

.al-input:focus { border-color: #0d9488; }

.al-input:disabled { opacity: 0.5; cursor: not-allowed; }

.al-error {
    padding: 0.65rem 0.875rem;
    background: rgba(185, 28, 28, 0.15);
    border: 1px solid rgba(185, 28, 28, 0.3);
    border-radius: 8px;
    font-size: 0.82rem;
    color: #fca5a5;
}

.al-btn {
    margin-top: 0.25rem;
    padding: 0.7rem 1rem;
    background: #0d9488;
    border: none;
    border-radius: 9px;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, opacity 0.15s;
}

.al-btn:hover:not(:disabled) { background: #0f766e; }

.al-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
