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
                    <span class="adash-kpi-value">{{ stats.activeSubscriptions.toLocaleString() }}</span>
                    <span class="adash-kpi-label">Active subscriptions</span>
                </div>
                <div class="adash-kpi">
                    <span class="adash-kpi-value">+{{ stats.newUsersThisMonth.toLocaleString() }}</span>
                    <span class="adash-kpi-label">New users this month</span>
                </div>
            </div>

            <!-- Second row -->
            <div class="adash-row">
                <!-- Plan breakdown -->
                <div class="adash-card">
                    <h2 class="adash-card-title">Users by plan</h2>
                    <div class="adash-plan-list">
                        <div v-for="tier in planTiers" :key="tier.key" class="adash-plan-row">
                            <div class="adash-plan-info">
                                <span class="adash-plan-dot" :class="`adash-plan-dot--${tier.key.toLowerCase()}`"></span>
                                <span class="adash-plan-name">{{ tier.label }}</span>
                            </div>
                            <div class="adash-plan-bar-wrap">
                                <div
                                    class="adash-plan-bar"
                                    :class="`adash-plan-bar--${tier.key.toLowerCase()}`"
                                    :style="{ width: barWidth(tier.key) }"
                                ></div>
                            </div>
                            <span class="adash-plan-count">{{ (stats.planBreakdown[tier.key] ?? 0).toLocaleString() }}</span>
                        </div>
                    </div>
                </div>

                <!-- Grants & admin -->
                <div class="adash-card">
                    <h2 class="adash-card-title">Access overrides</h2>
                    <div class="adash-stat-list">
                        <div class="adash-stat-row">
                            <span class="adash-stat-label">Complimentary grants</span>
                            <span class="adash-stat-value">{{ stats.grantedPlans }}</span>
                        </div>
                        <div class="adash-stat-row">
                            <span class="adash-stat-label">Inactive subscriptions</span>
                            <span class="adash-stat-value adash-stat-value--warn">
                                {{ stats.totalUsers - stats.activeSubscriptions }}
                            </span>
                        </div>
                    </div>
                    <div class="adash-card-action">
                        <RouterLink :to="{ name: 'admin-users' }" class="adash-link">
                            Manage users →
                        </RouterLink>
                    </div>
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

const planTiers = [
    { key: 'STARTER', label: 'Starter' },
    { key: 'STANDARD', label: 'Standard' },
    { key: 'GROWTH', label: 'Growth' },
];

const maxPlanCount = computed(() => {
    if (!stats.value) return 1;
    return Math.max(1, ...planTiers.map((t) => stats.value!.planBreakdown[t.key] ?? 0));
});

const barWidth = (key: string) => {
    if (!stats.value) return '0%';
    const count = stats.value.planBreakdown[key] ?? 0;
    return `${Math.round((count / maxPlanCount.value) * 100)}%`;
};

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
.adash { max-width: 960px; display: flex; flex-direction: column; gap: 1.5rem; }

.adash-header { margin-bottom: 0.25rem; }

.adash-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.25rem;
    letter-spacing: -0.02em;
}

.adash-sub { color: #64748b; font-size: 0.875rem; margin: 0; }

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

/* Plan breakdown */
.adash-plan-list { display: flex; flex-direction: column; gap: 0.75rem; }

.adash-plan-row {
    display: grid;
    grid-template-columns: 100px 1fr 40px;
    align-items: center;
    gap: 0.75rem;
}

.adash-plan-info { display: flex; align-items: center; gap: 0.5rem; }

.adash-plan-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.adash-plan-dot--starter { background: #94a3b8; }
.adash-plan-dot--standard { background: #0d9488; }
.adash-plan-dot--growth { background: #6366f1; }

.adash-plan-name { font-size: 0.82rem; font-weight: 500; color: #334155; }

.adash-plan-bar-wrap {
    height: 8px;
    background: #f1f5f9;
    border-radius: 99px;
    overflow: hidden;
}

.adash-plan-bar {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
}

.adash-plan-bar--starter { background: #94a3b8; }
.adash-plan-bar--standard { background: #0d9488; }
.adash-plan-bar--growth { background: #6366f1; }

.adash-plan-count {
    font-size: 0.82rem;
    font-weight: 700;
    color: #0f172a;
    text-align: right;
}

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
