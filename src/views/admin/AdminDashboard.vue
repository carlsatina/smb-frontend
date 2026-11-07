<template>
    <div class="adash">
        <header class="adash-header">
            <h1 class="adash-title">Dashboard</h1>
            <p class="adash-sub">Platform overview — {{ today }}</p>
        </header>

        <div v-if="loading" class="adash-state">Loading...</div>
        <div v-else-if="error" class="adash-state adash-state--error">{{ error }}</div>

        <template v-else-if="stats">
            <!-- KPI row -->
            <div class="adash-kpis">
                <div class="adash-kpi">
                    <span class="adash-kpi-value">{{ stats.totalUsers.toLocaleString() }}</span>
                    <span class="adash-kpi-label">Total users</span>
                </div>
                <div class="adash-kpi">
                    <span class="adash-kpi-value">{{ stats.totalStores.toLocaleString() }}</span>
                    <span class="adash-kpi-label">Active stores</span>
                </div>
                <div class="adash-kpi">
                    <span class="adash-kpi-value">{{ formatPeso(stats.billing.expectedRevenue) }}</span>
                    <span class="adash-kpi-label">Billable in {{ billingMonthLabel }}</span>
                </div>
                <div class="adash-kpi">
                    <span class="adash-kpi-value">+{{ stats.newUsersThisMonth.toLocaleString() }}</span>
                    <span class="adash-kpi-label">New users this month</span>
                </div>
            </div>

            <!-- Second row -->
            <div class="adash-row">
                <!-- Collection progress -->
                <div class="adash-card">
                    <h2 class="adash-card-title">{{ billingMonthLabel }} collections</h2>
                    <div class="adash-progress-head">
                        <span class="adash-progress-amount">{{ formatPeso(stats.billing.collectedRevenue) }}</span>
                        <span class="adash-progress-of">of {{ formatPeso(stats.billing.expectedRevenue) }} collected</span>
                    </div>
                    <div class="adash-progress-track">
                        <div class="adash-progress-bar" :style="{ width: collectedWidth }"></div>
                    </div>
                    <div class="adash-stat-list">
                        <div class="adash-stat-row">
                            <span class="adash-stat-label">Paying owners</span>
                            <span class="adash-stat-value">{{ stats.billing.paidOwners }} / {{ stats.billing.billableOwners }}</span>
                        </div>
                        <div class="adash-stat-row">
                            <span class="adash-stat-label">Billable stores</span>
                            <span class="adash-stat-value">{{ stats.billing.billableStores }}</span>
                        </div>
                        <div class="adash-stat-row">
                            <span class="adash-stat-label">Outstanding</span>
                            <span class="adash-stat-value" :class="{ 'adash-stat-value--warn': outstanding > 0 }">
                                {{ formatPeso(outstanding) }}
                            </span>
                        </div>
                    </div>
                    <div class="adash-card-action">
                        <RouterLink :to="{ name: 'admin-billing' }" class="adash-link">
                            Open billing →
                        </RouterLink>
                    </div>
                </div>

                <!-- Pricing -->
                <div class="adash-card">
                    <h2 class="adash-card-title">Per-store pricing</h2>
                    <div class="adash-stat-list">
                        <div v-for="tier in pricingTiers" :key="tier.label" class="adash-stat-row">
                            <span class="adash-stat-label">{{ tier.label }}</span>
                            <span class="adash-stat-value">{{ formatPeso(tier.fee) }}<span class="adash-per">/mo</span></span>
                        </div>
                    </div>
                    <p class="adash-note">
                        Each owner's stores are ranked oldest first. Warehouses count as stores. All features are included.
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { getAdminStats, type PlatformStats } from '@/api/admin';

const loading = ref(false);
const error = ref<string | null>(null);
const stats = ref<PlatformStats | null>(null);

const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const billingMonthLabel = computed(() =>
    stats.value ? `${MONTH_NAMES[stats.value.billing.month - 1]} ${stats.value.billing.year}` : ''
);

const outstanding = computed(() =>
    stats.value ? Math.max(0, stats.value.billing.expectedRevenue - stats.value.billing.collectedRevenue) : 0
);

const collectedWidth = computed(() => {
    if (!stats.value || stats.value.billing.expectedRevenue <= 0) return '0%';
    const ratio = stats.value.billing.collectedRevenue / stats.value.billing.expectedRevenue;
    return `${Math.min(100, Math.round(ratio * 100))}%`;
});

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

const pricingTiers = computed(() => {
    if (!stats.value) return [];
    const { storeFees, additionalStoreFee } = stats.value.billing.pricing;
    return [
        ...storeFees.map((fee, i) => ({ label: `${ordinal(i + 1)} store`, fee })),
        { label: `${ordinal(storeFees.length + 1)} store onward`, fee: additionalStoreFee },
    ];
});

const formatPeso = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

onMounted(async () => {
    loading.value = true;
    try {
        const data = await getAdminStats();
        stats.value = data.stats;
    } catch (e: any) {
        error.value = e?.body?.error?.message || 'Failed to load stats.';
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.adash { max-width: 1280px; display: flex; flex-direction: column; gap: 0.85rem; }

.adash-header { margin-bottom: 0.15rem; }

.adash-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.15rem;
    letter-spacing: -0.025em;
}

.adash-sub { color: #64748b; font-size: 0.82rem; line-height: 1.4; margin: 0; }

.adash-state {
    padding: 1rem 1.25rem;
    background: #f1f5f9;
    border-radius: 10px;
    color: #475569;
    font-size: 0.9rem;
}

.adash-state--error { background: #fef2f2; color: #b91c1c; }

/* KPI row */
.adash-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.adash-kpi {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.adash-kpi-value {
    font-size: 2rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.04em;
    line-height: 1;
}

.adash-kpi-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
}

/* Second row */
.adash-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.adash-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.adash-card-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.01em;
}

/* Collection progress */
.adash-progress-head { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }

.adash-progress-amount {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.03em;
}

.adash-progress-of { font-size: 0.82rem; color: #64748b; }

.adash-progress-track {
    height: 8px;
    background: #f1f5f9;
    border-radius: 99px;
    overflow: hidden;
    margin-top: -0.5rem;
}

.adash-progress-bar {
    height: 100%;
    border-radius: 99px;
    background: #0d9488;
    transition: width 0.4s ease;
}

.adash-per { font-size: 0.75rem; font-weight: 500; color: #64748b; margin-left: 0.1rem; }

.adash-note { font-size: 0.8rem; color: #64748b; line-height: 1.5; margin: 0; }

/* Stat list */
.adash-stat-list { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }

.adash-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f1f5f9;
}

.adash-stat-row:last-child { border-bottom: none; padding-bottom: 0; }

.adash-stat-label { font-size: 0.85rem; color: #475569; }

.adash-stat-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
}

.adash-stat-value--warn { color: #b45309; }

.adash-card-action { margin-top: auto; }

.adash-link {
    font-size: 0.82rem;
    font-weight: 600;
    color: #0d9488;
    text-decoration: none;
}

.adash-link:hover { color: #0f766e; text-decoration: underline; }

@media (max-width: 720px) {
    .adash-kpis { grid-template-columns: repeat(2, 1fr); }
    .adash-row { grid-template-columns: 1fr; }
}
</style>
