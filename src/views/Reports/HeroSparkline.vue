<template>
    <svg class="hero-sparkline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
        <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.02" />
            </linearGradient>
        </defs>
        <path :d="areaPath" :fill="`url(#${gradientId})`" />
        <path
            :d="linePath"
            fill="none"
            stroke="#5eead4"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
        />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ values: number[] }>();

const gradientId = `hero-spark-${Math.random().toString(36).slice(2, 9)}`;

const TOP_PAD = 3;
const BASELINE = 31;

// Scale to the min–max band (with head-room below) rather than from zero, so
// the period's shape stays readable even when all values sit in a tight range.
const points = computed(() => {
    const vals = props.values.length >= 2 ? props.values : [0, 0];
    const low = Math.min(...vals);
    const high = Math.max(...vals);
    const span = high - low;
    const floor = low - span * 0.35;
    const stepX = 100 / (vals.length - 1);
    return vals.map((value, index) => {
        let y: number;
        if (span === 0) {
            y = high === 0 ? BASELINE : (BASELINE + TOP_PAD) / 2;
        } else {
            y = BASELINE - ((value - floor) / (high - floor)) * (BASELINE - TOP_PAD);
        }
        return { x: index * stepX, y };
    });
});

// Smooth the polyline by drawing quadratic curves through segment midpoints.
const linePath = computed(() => {
    const pts = points.value;
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length - 1; i += 1) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    return d;
});

const areaPath = computed(() => `${linePath.value} L 100 34 L 0 34 Z`);
</script>

<style scoped>
.hero-sparkline {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
