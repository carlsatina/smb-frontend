<template>
    <div class="dm-backdrop" @click.self="$emit('close')">
        <div class="dm-modal">
            <h3 class="dm-title">Cash Denominations ({{ cashierName }})</h3>

            <div class="dm-summary">
                <span class="dm-summary-label">COH Total</span>
                <span class="dm-summary-value">{{ fmt(cohTotal) }}</span>
            </div>
            <div class="dm-divider"></div>

            <div class="dm-denom-grid">
                <div v-for="d in denomRows" :key="d.label" class="dm-denom-row">
                    <span class="dm-denom-label">{{ d.label }}</span>
                    <input
                        v-if="editable"
                        type="number"
                        class="dm-denom-input dm-denom-input--edit"
                        :value="modelValue?.[d.key] ?? 0"
                        min="0"
                        @input="onInput(d.key, ($event.target as HTMLInputElement).value)"
                    />
                    <div v-else class="dm-denom-input">{{ readonlyCashier ? readonlyCashier[d.key] : 0 }}</div>
                </div>
                <div class="dm-denom-row">
                    <span class="dm-denom-label">Coins (₱)</span>
                    <input
                        v-if="editable"
                        type="number"
                        class="dm-denom-input dm-denom-input--edit"
                        :value="modelValue?.coins ?? 0"
                        min="0"
                        step="0.01"
                        @input="onInput('coins', ($event.target as HTMLInputElement).value)"
                    />
                    <div v-else class="dm-denom-input">{{ readonlyCashier ? fmt(readonlyCashier.coins) : 0 }}</div>
                </div>
            </div>

            <div class="dm-divider"></div>
            <div class="dm-summary">
                <span class="dm-summary-label">Denomination Total</span>
                <span class="dm-summary-value">{{ fmt(denomTotal) }}</span>
            </div>

            <div class="dm-actions">
                <button v-if="editable" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
                <button class="btn btn-primary" @click="onConfirm">{{ editable ? 'Apply' : 'Close' }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CashierEntry } from '@/api/dailySales';

type DenomData = {
    denom1000: number; denom500: number; denom200: number;
    denom100: number; denom50: number; denom20: number;
    coins: number;
};

const props = defineProps<{
    cashierName: string;
    editable?: boolean;
    modelValue?: DenomData;
    readonlyCashier?: CashierEntry | null;
}>();

const emit = defineEmits<{
    close: [];
    'update:modelValue': [DenomData];
    confirm: [];
}>();

const denomRows = [
    { label: '1000', key: 'denom1000' as const },
    { label: '500',  key: 'denom500'  as const },
    { label: '200',  key: 'denom200'  as const },
    { label: '100',  key: 'denom100'  as const },
    { label: '50',   key: 'denom50'   as const },
    { label: '20',   key: 'denom20'   as const },
];

const cohTotal = computed(() => {
    if (props.editable && props.modelValue) return denomTotal.value;
    if (props.readonlyCashier) return props.readonlyCashier.cashAmount;
    return 0;
});

const denomTotal = computed(() => {
    const d = props.editable ? props.modelValue : props.readonlyCashier;
    if (!d) return 0;
    return (d.denom1000 ?? 0) * 1000 + (d.denom500 ?? 0) * 500 + (d.denom200 ?? 0) * 200 +
           (d.denom100 ?? 0) * 100 + (d.denom50 ?? 0) * 50 + (d.denom20 ?? 0) * 20 + (d.coins ?? 0);
});

const onInput = (key: keyof DenomData, raw: string) => {
    if (!props.modelValue) return;
    const val = key === 'coins' ? parseFloat(raw) || 0 : parseInt(raw) || 0;
    emit('update:modelValue', { ...props.modelValue, [key]: val });
};

const onConfirm = () => {
    if (props.editable) emit('confirm');
    else emit('close');
};

const fmt = (v: number) => Number(v).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
</script>

<style scoped>
.dm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1100; display: flex; align-items: center; justify-content: center; }
.dm-modal { background: white; border-radius: 12px; padding: 1.75rem; width: 380px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
.dm-title { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; }
.dm-summary { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
.dm-summary-label { color: #6b7280; font-size: 0.88rem; }
.dm-summary-value { font-size: 1.1rem; font-weight: 700; }
.dm-divider { border-top: 1px solid #e5e7eb; margin: 0.75rem 0; }
.dm-denom-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.dm-denom-row { display: flex; flex-direction: column; gap: 0.3rem; }
.dm-denom-label { font-size: 0.8rem; color: #374151; font-weight: 500; }
.dm-denom-input { background: #f3f4f6; border-radius: 6px; padding: 0.45rem 0.6rem; font-size: 0.9rem; color: #111827; }
.dm-denom-input--edit { border: 1px solid #d1d5db; background: white; width: 100%; outline: none; }
.dm-denom-input--edit:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.dm-actions { margin-top: 1.25rem; display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
