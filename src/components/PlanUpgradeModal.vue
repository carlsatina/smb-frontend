<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="open" class="pum-backdrop" @click.self="close">
                <div class="pum-modal">

                    <div class="pum-header">
                        <div>
                            <p class="pum-eyebrow">Upgrade required</p>
                            <h2 class="pum-title">{{ headerText }}</h2>
                            <p class="pum-copy">{{ messageText }}</p>
                        </div>
                        <button type="button" class="pum-close" @click="close" aria-label="Close">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div class="pum-plans">
                        <div
                            v-for="plan in allPlans"
                            :key="plan.tier"
                            class="pum-plan-card"
                            :class="{
                                'pum-plan-card--current': plan.tier === currentPlan.tier,
                                'pum-plan-card--target': nextPlan && plan.tier === nextPlan.tier,
                            }"
                        >
                            <div class="pum-plan-top">
                                <div class="pum-plan-name-row">
                                    <span class="pum-plan-name">{{ plan.label }}</span>
                                    <span v-if="plan.tier === currentPlan.tier" class="pum-pill pum-pill--current">Current</span>
                                    <span v-else-if="nextPlan && plan.tier === nextPlan.tier" class="pum-pill pum-pill--upgrade">Recommended</span>
                                </div>
                                <p class="pum-plan-tagline">{{ planTaglines[plan.tier] }}</p>
                            </div>

                            <ul class="pum-plan-list">
                                <li>
                                    <svg class="pum-check" viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    {{ plan.maxStores }} {{ plan.maxStores === 1 ? 'store' : 'stores' }}
                                </li>
                                <li>
                                    <svg class="pum-check" viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    {{ plan.maxUsersPerStore }} members per store
                                </li>
                                <li v-for="f in advancedFeatures" :key="f.key" :class="{ 'pum-list-locked': !plan.features[f.key] }">
                                    <svg v-if="plan.features[f.key]" class="pum-check" viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    <svg v-else class="pum-cross" viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                                    {{ f.label }}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="pum-footer">
                        <p class="pum-footer-note">
                            To upgrade, email us at
                            <a href="mailto:support@arshii.app" class="pum-footer-link">support@arshii.app</a>
                        </p>
                        <div class="pum-actions">
                            <button type="button" class="pum-btn-primary" @click="goToSettings">View all plan details</button>
                            <button type="button" class="pum-btn-ghost" @click="close">Not now</button>
                        </div>
                    </div>

                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserContextStore } from '@/stores/userContext';
import { getNextPlanTier, getPlanConfig, planTierOrder, planConfigs, PlanFeature, PlanTier } from '@/utils/planAccess';

const props = defineProps<{ open: boolean; feature?: PlanFeature | null; message?: string | null }>();
const emit = defineEmits<{ (event: 'close'): void }>();

const router = useRouter();
const userContext = useUserContextStore();

const featureLabels: Record<PlanFeature, string> = {
    ingredients: 'ingredients and recipes',
    recipes: 'recipe workflows',
    purchaseOrders: 'purchase orders and suppliers',
    importExport: 'data exports',
    expenses: 'expense tracking',
};

const planTaglines: Record<PlanTier, string> = {
    STARTER: 'POS, inventory, and products — free.',
    STANDARD: 'Recipes, purchase orders, and exports.',
    GROWTH: 'Multi-store with higher team limits.',
};

const advancedFeatures = [
    { key: 'ingredients' as PlanFeature, label: 'Ingredients & raw materials' },
    { key: 'recipes' as PlanFeature, label: 'Recipes & product costing' },
    { key: 'purchaseOrders' as PlanFeature, label: 'Purchase orders & suppliers' },
    { key: 'importExport' as PlanFeature, label: 'Data exports (CSV)' },
];

const allPlans = computed(() => planTierOrder.map((tier) => planConfigs[tier]));
const currentPlan = computed(() => getPlanConfig(userContext.planTier));
const nextPlan = computed(() => {
    const nextTier = getNextPlanTier(userContext.planTier);
    return nextTier ? getPlanConfig(nextTier) : null;
});

const headerText = computed(() => {
    if (!nextPlan.value) return 'You are on the highest plan';
    return `Unlock ${nextPlan.value.label}`;
});

const messageText = computed(() => {
    if (props.message) return props.message;
    if (props.feature) {
        const label = nextPlan.value?.label ?? 'the next plan';
        return `${label} is required to use ${featureLabels[props.feature]}.`;
    }
    return nextPlan.value
        ? `Upgrade to ${nextPlan.value.label} to unlock advanced features and higher limits.`
        : 'Contact us to discuss a custom plan.';
});

const close = () => emit('close');

const goToSettings = () => {
    router.push('/account/plan');
    close();
};
</script>

<style scoped>
.pum-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
    padding: 1.5rem;
    backdrop-filter: blur(2px);
}

.pum-modal {
    width: min(900px, 100%);
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.25);
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    font-family: 'Inter', -apple-system, sans-serif;
}

/* ── Header ── */
.pum-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.75rem 2rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.pum-eyebrow {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #64748b;
    margin: 0 0 0.3rem;
    font-weight: 600;
}

.pum-title {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 0 0 0.35rem;
    color: #0f172a;
    letter-spacing: -0.02em;
}

.pum-copy {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
}

.pum-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
}

.pum-close:hover {
    background: #f1f5f9;
    color: #0f172a;
}

/* ── Plans grid ── */
.pum-plans {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    border-bottom: 1px solid #e2e8f0;
}

.pum-plan-card {
    padding: 1.5rem;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.pum-plan-card:last-child {
    border-right: none;
}

.pum-plan-card--current {
    background: #f8fafc;
}

.pum-plan-card--target {
    background: #0f172a;
    color: #f8fafc;
}

.pum-plan-top {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.pum-plan-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.pum-plan-name {
    font-size: 1rem;
    font-weight: 800;
    color: inherit;
    letter-spacing: -0.02em;
}

.pum-plan-tagline {
    font-size: 0.78rem;
    margin: 0;
    color: #64748b;
    line-height: 1.5;
}

.pum-plan-card--target .pum-plan-tagline {
    color: #94a3b8;
}

.pum-pill {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.pum-pill--current {
    background: rgba(13, 148, 136, 0.12);
    color: #0f766e;
}

.pum-pill--upgrade {
    background: rgba(255, 255, 255, 0.15);
    color: #f8fafc;
}

/* ── Feature list ── */
.pum-plan-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.pum-plan-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: inherit;
}

.pum-list-locked {
    opacity: 0.4;
}

.pum-check {
    color: #0d9488;
    flex-shrink: 0;
}

.pum-plan-card--target .pum-check {
    color: #5eead4;
}

.pum-cross {
    color: #cbd5e1;
    flex-shrink: 0;
}

/* ── Footer ── */
.pum-footer {
    padding: 1.25rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.pum-footer-note {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0;
}

.pum-footer-link {
    color: #0f766e;
    font-weight: 500;
    text-decoration: none;
}

.pum-footer-link:hover {
    text-decoration: underline;
}

.pum-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
}

.pum-btn-primary {
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    border: none;
    background: #0d9488;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.pum-btn-primary:hover {
    background: #0f766e;
}

.pum-btn-ghost {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: transparent;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}

.pum-btn-ghost:hover {
    background: #f1f5f9;
    color: #0f172a;
}

/* ── Transition ── */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-active .pum-modal,
.modal-fade-leave-active .pum-modal {
    transition: transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .pum-modal,
.modal-fade-leave-to .pum-modal {
    transform: scale(0.96);
}

/* ── Responsive ── */
@media (max-width: 720px) {
    .pum-plans {
        grid-template-columns: 1fr;
    }

    .pum-plan-card {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
    }

    .pum-plan-card:last-child {
        border-bottom: none;
    }

    .pum-footer {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 480px) {
    .pum-header {
        padding: 1.25rem;
    }

    .pum-footer {
        padding: 1rem 1.25rem;
    }
}
</style>
