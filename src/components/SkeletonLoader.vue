<template>
    <div
        class="skeleton-wrap"
        :class="`skeleton-wrap--${variant}`"
        :aria-label="label"
        role="status"
    >
        <!-- KPI / STAT STRIP -->
        <template v-if="variant === 'kpi'">
            <div
                class="skeleton-kpi-grid"
                :style="{ '--kpi-cols': count || 3 }"
            >
                <div v-for="i in (count || 3)" :key="i" class="skeleton-kpi-card">
                    <div class="skeleton-cell skeleton-cell--kpi-val"></div>
                    <div class="skeleton-cell skeleton-cell--kpi-lbl"></div>
                </div>
            </div>
        </template>

        <!-- CARDS GRID (POS / Catalog tiles) -->
        <template v-else-if="variant === 'cards'">
            <div class="skeleton-card-grid">
                <div v-for="i in (count || rows || 12)" :key="i" class="skeleton-card">
                    <div class="skeleton-cell skeleton-cell--tag"></div>
                    <div class="skeleton-cell skeleton-cell--title"></div>
                    <div class="skeleton-cell skeleton-cell--title-short"></div>
                    <div class="skeleton-card-bottom">
                        <div class="skeleton-cell skeleton-cell--price"></div>
                        <div class="skeleton-cell skeleton-cell--unit"></div>
                    </div>
                </div>
            </div>
        </template>

        <!-- CHART VARIANT (Sales / Activity charts) -->
        <template v-else-if="variant === 'chart'">
            <div class="skeleton-chart-panel">
                <div class="skeleton-chart-header">
                    <div class="skeleton-cell skeleton-cell--chart-title"></div>
                    <div class="skeleton-cell skeleton-cell--chart-total"></div>
                </div>
                <div class="skeleton-chart-body">
                    <div class="skeleton-chart-axis">
                        <span class="skeleton-cell skeleton-cell--axis-tick"></span>
                        <span class="skeleton-cell skeleton-cell--axis-tick"></span>
                        <span class="skeleton-cell skeleton-cell--axis-tick"></span>
                    </div>
                    <div class="skeleton-chart-bars">
                        <span
                            v-for="(h, idx) in chartBarHeights"
                            :key="idx"
                            class="skeleton-chart-bar"
                            :style="{ height: `${h}%` }"
                        ></span>
                    </div>
                </div>
            </div>
        </template>

        <!-- PROGRESS / BREAKDOWN VARIANT (Payment mix / Daypart mix) -->
        <template v-else-if="variant === 'progress'">
            <div class="skeleton-progress-panel">
                <div class="skeleton-cell skeleton-progress-bar"></div>
                <div class="skeleton-progress-rows">
                    <div v-for="i in (count || 4)" :key="i" class="skeleton-progress-row">
                        <div class="skeleton-cell skeleton-dot"></div>
                        <div class="skeleton-cell skeleton-label"></div>
                        <div class="skeleton-cell skeleton-value"></div>
                    </div>
                </div>
            </div>
        </template>

        <!-- TABLE ROWS (Default) -->
        <template v-else>
            <div v-for="i in rows" :key="i" class="skeleton-row">
                <div v-if="showIcon" class="skeleton-cell skeleton-cell--icon"></div>
                <div class="skeleton-cell" :style="{ width: colWidths[0] }"></div>
                <div class="skeleton-cell" :style="{ width: colWidths[1] }"></div>
                <div class="skeleton-cell skeleton-cell--short" :style="{ width: colWidths[2] }"></div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        variant?: 'table' | 'cards' | 'kpi' | 'chart' | 'progress';
        rows?: number;
        columns?: number;
        count?: number;
        label?: string;
        showIcon?: boolean;
    }>(),
    {
        variant: 'table',
        rows: 6,
        columns: 3,
        label: 'Loading…',
        showIcon: false,
    }
);

const WIDTHS = [
    ['55%', '20%', '12%'],
    ['40%', '25%', '18%'],
    ['65%', '15%', '14%'],
    ['45%', '22%', '16%'],
    ['60%', '18%', '10%'],
    ['50%', '20%', '15%'],
];

const colWidths = computed(() => WIDTHS[props.rows % WIDTHS.length]);

const chartBarHeights = [35, 65, 40, 85, 55, 95, 70, 45, 90, 60, 75, 45];
</script>

<style scoped>
.skeleton-wrap {
    padding: 0.25rem 0;
    width: 100%;
}

.skeleton-wrap--table {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

/* ── Base Cell Shimmer ── */
.skeleton-cell {
    border-radius: 6px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    flex-shrink: 0;
}

@keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ── Table Variant ── */
.skeleton-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: #f8fafc;
}

.skeleton-row .skeleton-cell {
    height: 13px;
}

.skeleton-row .skeleton-cell:first-child {
    flex: 1;
}

.skeleton-cell--icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex: none;
}

.skeleton-cell--short {
    flex: none;
}

/* ── KPI / Stat Strip Variant ── */
.skeleton-kpi-grid {
    display: grid;
    grid-template-columns: repeat(var(--kpi-cols, 3), minmax(0, 1fr));
    background: #ffffff;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.skeleton-kpi-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 1rem 1.4rem;
    border-left: 1px solid var(--c-border, #e2e8f0);
    min-width: 0;
}

.skeleton-kpi-card:first-child {
    border-left: none;
}

.skeleton-cell--kpi-val {
    width: 60%;
    max-width: 140px;
    height: 24px;
    border-radius: 6px;
}

.skeleton-cell--kpi-lbl {
    width: 40%;
    max-width: 90px;
    height: 12px;
    border-radius: 4px;
}

@media (max-width: 640px) {
    .skeleton-kpi-grid {
        grid-template-columns: 1fr;
    }
    .skeleton-kpi-card {
        border-left: none;
        border-top: 1px solid var(--c-border, #e2e8f0);
    }
    .skeleton-kpi-card:first-child {
        border-top: none;
    }
}

/* ── Cards Grid Variant (POS / Product Tiles) ── */
.skeleton-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
    width: 100%;
}

.skeleton-card {
    position: relative;
    border: 1.5px solid var(--c-border, #e2e8f0);
    border-radius: 9px;
    padding: 0.5rem 0.6rem;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 52px;
    overflow: hidden;
}

.skeleton-cell--tag {
    width: 38px;
    height: 10px;
    border-radius: 999px;
    margin-bottom: 0.05rem;
}

.skeleton-cell--title {
    width: 90%;
    height: 11px;
    border-radius: 4px;
}

.skeleton-cell--title-short {
    width: 55%;
    height: 11px;
    border-radius: 4px;
}

.skeleton-card-bottom {
    margin-top: auto;
    padding-top: 0.25rem;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.25rem;
}

.skeleton-cell--price {
    width: 48px;
    height: 13px;
    border-radius: 4px;
}

.skeleton-cell--unit {
    width: 24px;
    height: 10px;
    border-radius: 3px;
}

/* ── Chart Variant ── */
.skeleton-chart-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
    padding: 0.5rem 0;
}

.skeleton-chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.skeleton-cell--chart-title {
    width: 110px;
    height: 16px;
    border-radius: 4px;
}

.skeleton-cell--chart-total {
    width: 80px;
    height: 16px;
    border-radius: 4px;
}

.skeleton-chart-body {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    height: 160px;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--c-border, #e2e8f0);
}

.skeleton-chart-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    padding: 0.25rem 0;
}

.skeleton-cell--axis-tick {
    width: 32px;
    height: 10px;
    border-radius: 3px;
}

.skeleton-chart-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    height: 100%;
}

.skeleton-chart-bar {
    flex: 1;
    border-radius: 4px 4px 0 0;
    background: linear-gradient(180deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 100% 200%;
    animation: shimmer-vertical 1.4s ease-in-out infinite;
}

@keyframes shimmer-vertical {
    0%   { background-position: 0 200%; }
    100% { background-position: 0 -200%; }
}

/* ── Progress / Breakdown Variant ── */
.skeleton-progress-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.skeleton-progress-bar {
    width: 100%;
    height: 16px;
    border-radius: 6px;
}

.skeleton-progress-rows {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.skeleton-progress-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.skeleton-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.skeleton-label {
    width: 35%;
    max-width: 120px;
    height: 13px;
    border-radius: 4px;
}

.skeleton-value {
    margin-left: auto;
    width: 25%;
    max-width: 80px;
    height: 13px;
    border-radius: 4px;
}
</style>