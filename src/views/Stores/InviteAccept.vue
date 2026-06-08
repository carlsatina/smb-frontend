<template>
    <section class="invite-page">
        <div class="invite-card">
            <span class="invite-eyebrow">Store Invite</span>
            <h1>{{ title }}</h1>
            <p>{{ description }}</p>
            <div v-if="status === 'error'" class="invite-error">
                {{ errorMessage }}
            </div>
            <button v-if="status === 'error'" class="secondary-button" type="button" @click="goToStores">
                Back to stores
            </button>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { acceptStoreInvite, previewStoreInvite } from '@/api/storeMembers';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { getDefaultRouteForRole } from '@/utils/roleAccess';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();

const status = ref<'idle' | 'accepting' | 'success' | 'error'>('idle');
const errorMessage = ref('');
const invitedEmail = ref('');

const storeId = computed<string | undefined>(() => {
    const fromRoute = route.params.storeId as string | undefined;
    if (fromRoute) return fromRoute;
    const m = window.location.pathname.match(/\/stores\/([^/]+)\/invites\/accept/);
    return m?.[1] || undefined;
});

const token = computed<string | undefined>(() => {
    const fromRoute = route.query.token as string | undefined;
    if (fromRoute) return fromRoute;
    return new URLSearchParams(window.location.search).get('token') || undefined;
});

const isAuthenticated = computed(() =>
    !!(localStorage.getItem('accessToken') || localStorage.getItem('token'))
);


const title = computed(() => {
    if (status.value === 'accepting' || status.value === 'idle') return 'Accepting invite…';
    if (status.value === 'success') return 'Invite accepted!';
    return 'Invite failed';
});

const description = computed(() => {
    if (status.value === 'accepting' || status.value === 'idle') return 'Please wait while we add you to the store.';
    if (status.value === 'success') return 'You now have access to this store.';
    return 'We could not accept this invite.';
});

const goToStores = () => router.push('/stores');

const acceptInvite = async () => {
    if (!storeId.value || !token.value) {
        status.value = 'error';
        errorMessage.value = 'Invite link is missing required details.';
        return;
    }
    status.value = 'accepting';
    try {
        await acceptStoreInvite(storeId.value, token.value);
        sessionStorage.removeItem('pendingInvite');
        await Promise.all([storeContext.fetchStores(), userContext.fetchMe()]);
        storeContext.setCurrentStore(storeId.value);
        status.value = 'success';
        const joinedStore = storeContext.stores.find(s => s.id === storeId.value);
        const defaultRoute = joinedStore ? getDefaultRouteForRole(joinedStore.role) : null;
        if (defaultRoute) {
            router.push({ name: defaultRoute, params: { storeId: storeId.value } });
        } else {
            router.push('/stores');
        }
    } catch (error: any) {
        sessionStorage.removeItem('pendingInvite');
        status.value = 'error';
        errorMessage.value = error?.body?.error?.message || 'Unable to accept this invite.';
    }
};

onMounted(async () => {
    if (isAuthenticated.value) {
        acceptInvite();
        return;
    }

    // Fetch the invited email so register can pre-fill it
    if (storeId.value && token.value) {
        try {
            const res = await previewStoreInvite(storeId.value, token.value);
            invitedEmail.value = res.preview.email;
        } catch {
            // Non-fatal — redirect without email pre-fill
        }
    }

    // Persist invite (+ email) so it survives the register/login redirect chain
    sessionStorage.setItem('pendingInvite', JSON.stringify({ storeId: storeId.value, token: token.value, email: invitedEmail.value || null }));

    // Redirect straight to register; user can switch to login from there
    const redirectPath = `/stores/${storeId.value}/invites/accept?token=${encodeURIComponent(token.value ?? '')}`;
    const params = new URLSearchParams({ redirect: redirectPath });
    if (invitedEmail.value) params.set('email', invitedEmail.value);
    router.replace(`/register?${params.toString()}`);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.invite-page {
    min-height: 100vh;
    padding: 3rem 1.5rem;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0f172a;
    font-family: 'Inter', sans-serif;
}

.invite-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 2.5rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    display: grid;
    gap: 0.85rem;
}

.invite-eyebrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: #0d9488;
    margin: 0 auto;
}

.invite-card h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #0f172a;
}

.invite-card p {
    margin: 0;
    color: #64748b;
    line-height: 1.6;
    font-size: 0.9rem;
}

.invite-actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.25rem;
}

.invite-error {
    background: #fff5f5;
    border: 1px solid #fecaca;
    color: #b91c1c;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    text-align: left;
}

.primary-button, .secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    padding: 0.6rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    text-decoration: none;
}

.primary-button {
    background: #0d9488;
    border: none;
    color: #ffffff;
}
.primary-button:hover { background: #0f766e; }

.secondary-button {
    background: transparent;
    border: 1px solid #e2e8f0;
    color: #475569;
}
.secondary-button:hover { background: #f1f5f9; border-color: #cbd5e1; }
</style>
