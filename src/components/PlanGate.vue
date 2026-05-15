<template>
    <div v-if="isLocked" class="plan-gate">
        <div class="plan-gate-card">
            <div class="plan-gate-header">
                <span class="plan-gate-pill">{{ upgradeLabel }}</span>
                <span class="plan-gate-tag">Upgrade required</span>
            </div>
            <h2>{{ titleText }}</h2>
            <p>{{ descriptionText }}</p>
            <div class="plan-gate-actions">
                <button type="button" class="primary-button" @click="upgrade">Upgrade to {{ upgradeLabel }}</button>
                <button type="button" class="ghost-button" @click="goToSettings">View plan details</button>
            </div>
        </div>
    </div>
    <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { getNextPlanTier, getPlanConfig, hasPlanFeature, openPlanUpgradeModal, PlanFeature } from '@/utils/planAccess';

const props = defineProps<{
    feature: PlanFeature;
    title?: string;
    description?: string;
}>();

const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();

const planKnown = computed(() => userContext.planTier !== null);
const isPlanLocked = computed(() => planKnown.value && !hasPlanFeature(userContext.planTier, props.feature));
const isLocked = computed(() => userContext.subscriptionActive === false || isPlanLocked.value);
const upgradeLabel = computed(() => {
    const nextTier = getNextPlanTier(userContext.planTier);
    if (nextTier) {
        return getPlanConfig(nextTier).label;
    }
    return 'Standard';
});

const titleText = computed(() => props.title || 'Upgrade to unlock this workflow.');
const descriptionText = computed(
    () =>
        props.description ||
        `${upgradeLabel.value} plan unlocks ingredients, recipes, purchase orders, and data exports across your stores.`
);

const upgrade = () => {
    openPlanUpgradeModal(props.feature);
};

const goToSettings = () => {
    const storeId = storeContext.currentStoreId;
    if (storeId) {
        router.push({ path: `/stores/${storeId}/settings`, hash: '#plan-settings' });
    } else {
        router.push({ name: 'stores' });
    }
};
</script>

<style scoped>
.plan-gate {
    padding: 2.5rem 1.5rem;
    border-radius: 20px;
    border: 1px dashed rgba(15, 23, 42, 0.2);
    background: rgba(248, 250, 252, 0.9);
    display: flex;
    justify-content: center;
    grid-column: 1 / -1;
}

.plan-gate-card {
    max-width: 520px;
    text-align: center;
}

.plan-gate-header {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
}

.plan-gate-pill {
    background: rgba(15, 118, 110, 0.12);
    color: #0f766e;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.plan-gate-tag {
    font-size: 0.75rem;
    color: #64748b;
}

.plan-gate h2 {
    margin: 0 0 0.5rem;
    font-size: 1.4rem;
    color: #0f172a;
}

.plan-gate p {
    margin: 0;
    color: #475569;
}

.plan-gate-actions {
    margin-top: 1.25rem;
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}
</style>
