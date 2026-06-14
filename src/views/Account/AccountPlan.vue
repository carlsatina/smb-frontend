<template>
    <section class="ap-page">
        <div class="ap-shell">

            <header class="ap-header">
                <div class="ap-header-left">
                    <span class="ap-eyebrow">Account</span>
                    <h1 class="ap-title">My Plan</h1>
                    <p class="ap-subtitle">Compare plans and upgrade anytime.</p>
                </div>
                <div class="ap-header-right">
                    <button class="ap-btn-ghost" @click="goToStores">Back to stores</button>
                </div>
            </header>

            <div v-if="userContext.isLoading && !userContext.hasLoaded" class="ap-panel">
                <div class="ap-state">Loading plan details...</div>
            </div>

            <template v-else>

                <!-- Current plan summary -->
                <section class="ap-summary-bar">
                    <div class="ap-summary-item">
                        <span class="ap-summary-label">Current plan</span>
                        <span class="ap-summary-value">{{ planConfig.label }}</span>
                    </div>
                    <div class="ap-summary-divider"></div>
                    <div class="ap-summary-item">
                        <span class="ap-summary-label">Status</span>
                        <span class="ap-summary-value" :class="userContext.subscriptionActive ? 'ap-summary-value--active' : 'ap-summary-value--inactive'">
                            {{ userContext.subscriptionActive ? 'Active' : 'Inactive' }}
                        </span>
                    </div>
                    <div class="ap-summary-divider"></div>
                    <div class="ap-summary-item">
                        <span class="ap-summary-label">Stores</span>
                        <span class="ap-summary-value">{{ storeUsage }} / {{ planConfig.maxStores }}</span>
                    </div>
                    <div class="ap-summary-divider"></div>
                    <div class="ap-summary-item">
                        <span class="ap-summary-label">Members per store</span>
                        <span class="ap-summary-value">Up to {{ planConfig.maxUsersPerStore }}</span>
                    </div>
                </section>

                <!-- Plan comparison -->
                <section class="ap-plans-section">
                    <div class="ap-plans-header">
                        <h2>Choose your plan</h2>
                        <p>All plans include POS, inventory, products, and sales reports.</p>
                    </div>

                    <div class="ap-plans-grid">
                        <div
                            v-for="plan in allPlans"
                            :key="plan.tier"
                            class="ap-plan-card"
                            :class="{
                                'ap-plan-card--current': plan.tier === userContext.planTier,
                                'ap-plan-card--recommended': plan.tier === recommendedTier,
                            }"
                        >
                            <div class="ap-plan-card-top">
                                <div class="ap-plan-name-row">
                                    <h3 class="ap-plan-name">{{ plan.label }}</h3>
                                    <span v-if="plan.tier === userContext.planTier" class="ap-plan-pill ap-plan-pill--current">Current</span>
                                    <span v-else-if="plan.tier === recommendedTier" class="ap-plan-pill ap-plan-pill--recommended">Recommended</span>
                                </div>
                                <p class="ap-plan-tagline">{{ planTaglines[plan.tier] }}</p>
                                <p class="ap-plan-price">{{ planPrices[plan.tier] }}</p>
                            </div>

                            <div class="ap-plan-limits">
                                <div class="ap-plan-limit">
                                    <svg class="ap-limit-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
                                    <span>{{ plan.maxStores }} {{ plan.maxStores === 1 ? 'store' : 'stores' }}</span>
                                </div>
                                <div class="ap-plan-limit">
                                    <svg class="ap-limit-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                                    <span>{{ plan.maxUsersPerStore }} members per store</span>
                                </div>
                            </div>

                            <div class="ap-plan-features">
                                <div class="ap-feature-group-label">Always included</div>
                                <div v-for="feature in coreFeatures" :key="feature.key" class="ap-feature-row">
                                    <svg class="ap-check ap-check--yes" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    <span>{{ feature.label }}</span>
                                </div>

                                <div class="ap-feature-group-label ap-feature-group-label--mt">Advanced features</div>
                                <div v-for="feature in advancedFeatures" :key="feature.key" class="ap-feature-row" :class="{ 'ap-feature-row--locked': !plan.features[feature.key] }">
                                    <svg v-if="plan.features[feature.key]" class="ap-check ap-check--yes" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                    <svg v-else class="ap-check ap-check--no" viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                                    <span>{{ feature.label }}</span>
                                </div>
                            </div>

                            <div class="ap-plan-card-footer">
                                <button
                                    v-if="plan.tier === userContext.planTier"
                                    class="ap-plan-btn ap-plan-btn--current"
                                    disabled
                                >
                                    Current plan
                                </button>
                                <button
                                    v-else-if="isDowngrade(plan.tier)"
                                    class="ap-plan-btn ap-plan-btn--ghost"
                                    :disabled="isUpgrading"
                                    @click="handlePlanAction(plan)"
                                >
                                    {{ isUpgrading ? 'Updating...' : 'Downgrade' }}
                                </button>
                                <button
                                    v-else
                                    class="ap-plan-btn ap-plan-btn--upgrade"
                                    :disabled="isUpgrading"
                                    @click="handlePlanAction(plan)"
                                >
                                    {{ isUpgrading ? 'Updating...' : `Upgrade to ${plan.label}` }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <p class="ap-plans-note">
                        To change your plan, contact us at
                        <a href="mailto:support@arshii.app" class="ap-plans-link">support@arshii.app</a>
                        and we'll get you sorted within 24 hours.
                    </p>
                </section>

            </template>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { getPlanConfig, planTierOrder, planConfigs, PlanTier, type PlanFeature } from '@/utils/planAccess';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

const planConfig = computed(() => getPlanConfig(userContext.planTier));
const storeUsage = computed(() => storeContext.stores.length);

const allPlans = computed(() => planTierOrder.map((tier) => planConfigs[tier]));

const currentTierIndex = computed(() => planTierOrder.indexOf(userContext.planTier ?? 'STARTER'));
const recommendedTier = computed<PlanTier | null>(() => {
    const next = planTierOrder[currentTierIndex.value + 1];
    return next ?? null;
});

const isDowngrade = (tier: PlanTier) => planTierOrder.indexOf(tier) < currentTierIndex.value;

const planTaglines: Record<PlanTier, string> = {
    STARTER: 'Everything you need to get started — free forever.',
    STANDARD: 'Advanced workflows for growing operations.',
    GROWTH: 'Multi-store power for scaling businesses.',
};

const planPrices: Record<PlanTier, string> = {
    STARTER: 'Free',
    STANDARD: 'Contact us',
    GROWTH: 'Contact us',
};

const coreFeatures = [
    { key: 'pos', label: 'Point of sale (POS)' },
    { key: 'inventory', label: 'Inventory tracking' },
    { key: 'products', label: 'Product management' },
    { key: 'reports', label: 'Sales reports' },
];

const advancedFeatures: Array<{ key: PlanFeature; label: string }> = [
    { key: 'ingredients', label: 'Ingredients & raw materials' },
    { key: 'recipes', label: 'Recipes & product costing' },
    { key: 'purchaseOrders', label: 'Purchase orders & suppliers' },
    { key: 'importExport', label: 'Data exports (CSV)' },
];

const isUpgrading = ref(false);

const handlePlanAction = (plan: typeof allPlans.value[0]) => {
    showToast(`To switch to ${plan.label}, contact us at support@arshii.app.`, 'info');
};

const goToStores = () => router.push('/stores');

onMounted(async () => {
    await userContext.fetchMe();
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.ap-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    padding: 2.5rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
}

.ap-shell {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ── Header ── */
.ap-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
}

.ap-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.ap-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent);
    width: fit-content;
}

.ap-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    color: var(--c-text);
    letter-spacing: -0.03em;
    line-height: 1.15;
}

.ap-subtitle {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
}

.ap-header-right {
    display: flex;
    align-items: center;
    padding-top: 0.25rem;
}

/* ── Summary bar ── */
.ap-summary-bar {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 1.25rem 1.75rem;
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
}

.ap-summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.25rem 1.5rem 0.25rem 0;
    flex: 1;
    min-width: 120px;
}

.ap-summary-item:first-child {
    padding-left: 0;
}

.ap-summary-divider {
    width: 1px;
    height: 36px;
    background: var(--c-border);
    margin-right: 1.5rem;
    flex-shrink: 0;
}

.ap-summary-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.ap-summary-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
}

.ap-summary-value--active { color: var(--c-accent-dark); }
.ap-summary-value--inactive { color: #b91c1c; }

/* ── Plan comparison section ── */
.ap-plans-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.ap-plans-header h2 {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0 0 0.3rem;
    color: var(--c-text);
    letter-spacing: -0.02em;
}

.ap-plans-header p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--c-muted);
}

/* ── Plan cards grid ── */
.ap-plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    align-items: start;
}

.ap-plan-card {
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.15s, border-color 0.15s;
}

.ap-plan-card:hover {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.ap-plan-card--current {
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.ap-plan-card--recommended:not(.ap-plan-card--current) {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ── Card top ── */
.ap-plan-card-top {
    padding: 1.5rem 1.5rem 1.25rem;
    border-bottom: 1px solid var(--c-border);
}

.ap-plan-name-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.4rem;
}

.ap-plan-name {
    font-size: 1.15rem;
    font-weight: 800;
    margin: 0;
    color: var(--c-text);
    letter-spacing: -0.02em;
}

.ap-plan-pill {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.ap-plan-pill--current {
    background: rgba(13, 148, 136, 0.12);
    color: var(--c-accent-dark);
}

.ap-plan-pill--recommended {
    background: rgba(99, 102, 241, 0.12);
    color: #4f46e5;
}

.ap-plan-tagline {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin: 0 0 0.85rem;
    line-height: 1.5;
}

.ap-plan-price {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--c-text);
    margin: 0;
    letter-spacing: -0.03em;
}

/* ── Limits ── */
.ap-plan-limits {
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg);
}

.ap-plan-limit {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--c-text);
}

.ap-limit-icon {
    color: var(--c-muted);
    flex-shrink: 0;
}

/* ── Feature list ── */
.ap-plan-features {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    flex: 1;
}

.ap-feature-group-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--c-border);
    margin-bottom: 0.1rem;
}

.ap-feature-group-label--mt {
    margin-top: 0.5rem;
}

.ap-feature-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.83rem;
    color: var(--c-text);
}

.ap-feature-row--locked {
    color: var(--c-muted);
}

.ap-check--yes {
    color: var(--c-accent);
    flex-shrink: 0;
}

.ap-check--no {
    color: #cbd5e1;
    flex-shrink: 0;
}

/* ── Card footer ── */
.ap-plan-card-footer {
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--c-border);
}

.ap-plan-btn {
    width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 9px;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    white-space: nowrap;
}

.ap-plan-btn--current {
    background: rgba(13, 148, 136, 0.08);
    border: 1.5px solid rgba(13, 148, 136, 0.25);
    color: var(--c-accent-dark);
    cursor: default;
}

.ap-plan-btn--upgrade {
    background: var(--c-accent);
    border: none;
    color: white;
}

.ap-plan-btn--upgrade:hover {
    background: var(--c-accent-dark);
}

.ap-plan-btn--ghost {
    background: transparent;
    border: 1.5px solid var(--c-border);
    color: var(--c-muted);
}

.ap-plan-btn--ghost:hover {
    border-color: #cbd5e1;
    color: var(--c-text);
}

/* ── Note ── */
.ap-plans-note {
    font-size: 0.82rem;
    color: var(--c-muted);
    margin: 0;
    text-align: center;
}

.ap-plans-link {
    color: var(--c-accent-dark);
    font-weight: 500;
    text-decoration: none;
}

.ap-plans-link:hover {
    text-decoration: underline;
}

/* ── State / loading ── */
.ap-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
}

.ap-state {
    padding: 1.25rem 1.5rem;
    background: #f0fdf9;
    border-radius: 10px;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

/* ── Buttons ── */
.ap-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.ap-btn-ghost:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

/* ── Responsive ── */
@media (max-width: 860px) {
    .ap-plans-grid {
        grid-template-columns: 1fr;
        max-width: 480px;
    }

    .ap-summary-bar {
        gap: 1rem;
    }

    .ap-summary-divider {
        display: none;
    }

    .ap-summary-item {
        padding: 0;
        min-width: calc(50% - 0.5rem);
        flex: none;
    }
}

@media (max-width: 600px) {
    .ap-page {
        padding: 1.5rem 1rem 3rem;
    }

    .ap-summary-item {
        min-width: 100%;
    }
}
</style>
