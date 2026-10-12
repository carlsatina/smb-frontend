<template>
    <!-- Sits on the host header's bottom border, so the active underline reads as
         the selected tab rather than as decoration. -->
    <div class="ds-tabs" role="tablist" aria-label="Daily Sales Sections">
        <button
            type="button"
            role="tab"
            class="ds-tab"
            :class="{ 'ds-tab--active': active === 'sales' }"
            :aria-selected="active === 'sales'"
            @click="emit('select', 'sales')"
        >
            <mdicon name="cash-register" size="17" />
            <span>Sales & Cash Remittance</span>
        </button>
        <button
            type="button"
            role="tab"
            class="ds-tab"
            :class="{ 'ds-tab--active': active === 'inventory' }"
            :aria-selected="active === 'inventory'"
            @click="emit('select', 'inventory')"
        >
            <mdicon name="clipboard-text-clock-outline" size="17" />
            <span>Daily Inventory Sheet</span>
        </button>
    </div>
</template>

<script setup lang="ts">
export type DailySalesTab = 'sales' | 'inventory';

defineProps<{ active: DailySalesTab }>();

const emit = defineEmits<{ select: [tab: DailySalesTab] }>();
</script>

<style scoped>
.ds-tabs {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
    align-self: stretch;
}

.ds-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border: none;
    border-bottom: 3px solid transparent;
    border-radius: 8px 8px 0 0;
    background: transparent;
    font-family: inherit;
    font-size: 0.86rem;
    font-weight: 600;
    color: #64748b;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.ds-tab:hover {
    color: #0f172a;
    background: #f1f5f9;
}

.ds-tab--active,
.ds-tab--active:hover {
    color: #0f766e;
    background: #f0fdfa;
    border-bottom-color: #0f766e;
    font-weight: 700;
}

.ds-tab:focus-visible {
    outline: 2px solid #0f766e;
    outline-offset: -2px;
}

@media (max-width: 640px) {
    .ds-tabs {
        width: 100%;
    }

    .ds-tab {
        flex: 1 1 0;
        justify-content: center;
        padding: 0.45rem 0.4rem;
        font-size: 0.8rem;
        white-space: normal;
        text-align: center;
    }
}
</style>
