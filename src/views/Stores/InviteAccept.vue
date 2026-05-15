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
import { acceptStoreInvite } from '@/api/storeMembers';
import { useStoreContextStore } from '@/stores/storeContext';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();

const status = ref<'idle' | 'success' | 'error'>('idle');
const errorMessage = ref('');

const storeId = computed(() => route.params.storeId as string | undefined);
const token = computed(() => route.query.token as string | undefined);

const title = computed(() => {
    if (status.value === 'success') return 'Invite accepted';
    if (status.value === 'error') return 'Invite failed';
    return 'Accepting invite...';
});

const description = computed(() => {
    if (status.value === 'success') return 'You now have access to this store.';
    if (status.value === 'error') return 'We could not accept this invite.';
    return 'Please wait while we add you to the store.';
});

const goToStores = () => {
    router.push('/stores');
};

onMounted(async () => {
    if (!storeId.value || !token.value) {
        status.value = 'error';
        errorMessage.value = 'Invite link is missing required details.';
        return;
    }
    try {
        await acceptStoreInvite(storeId.value, token.value);
        await storeContext.fetchStores();
        storeContext.setCurrentStore(storeId.value);
        status.value = 'success';
        router.push(`/stores/${storeId.value}/settings`);
    } catch (error: any) {
        status.value = 'error';
        errorMessage.value = error?.body?.error?.message || 'Unable to accept this invite.';
    }
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

.invite-error {
    background: #fff5f5;
    border: 1px solid #fecaca;
    color: #b91c1c;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
}

.secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.55rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    margin: 0 auto;
}

.secondary-button:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
}
</style>
