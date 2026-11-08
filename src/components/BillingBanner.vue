<template>
    <div v-if="suspended" class="billing-banner billing-banner--suspended" role="alert">
        <mdicon name="lock-outline" size="18" class="billing-banner__icon" />
        <p class="billing-banner__text">
            <strong>This store is read-only.</strong>
            The account has an unpaid bill, so sales and changes are paused. You can still view and export your data.
            <template v-if="canSeeBilling">
                Settle {{ overdueText || 'the outstanding bill' }} by contacting
                <a :href="`mailto:${supportContact.email}`">{{ supportContact.email }}</a> to restore full access.
            </template>
            <template v-else>Ask the store owner to settle the bill.</template>
        </p>
    </div>
    <div v-else-if="overdue.length > 0" class="billing-banner billing-banner--overdue" role="status">
        <mdicon name="alert-circle-outline" size="18" class="billing-banner__icon" />
        <p class="billing-banner__text">
            <strong>Your bill is overdue.</strong>
            {{ overdueText }} is unpaid. Please settle it to avoid your stores becoming read-only.
            Questions? <a :href="`mailto:${supportContact.email}`">{{ supportContact.email }}</a>
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { supportContact } from '@/config/support';

const storeContext = useStoreContextStore();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const store = computed(() => storeContext.currentStore);
const suspended = computed(() => Boolean(store.value?.billingSuspended));
const overdue = computed(() => store.value?.billingOverdue ?? []);
const canSeeBilling = computed(() => ['OWNER', 'ADMIN'].includes(store.value?.role ?? ''));

const formatPeso = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const overdueText = computed(() => {
    if (overdue.value.length === 0) return '';
    const total = overdue.value.reduce((sum, m) => sum + m.amount, 0);
    const months = overdue.value.map((m) => `${MONTHS[m.month - 1]} ${m.year}`).join(', ');
    return `${formatPeso(total)} for ${months}`;
});
</script>

<style scoped>
.billing-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.65rem 1rem;
    font-size: 0.85rem;
    line-height: 1.45;
    border-bottom: 1px solid transparent;
}

.billing-banner--suspended { background: #fef2f2; color: #7f1d1d; border-color: #fecaca; }
.billing-banner--overdue { background: #fffbeb; color: #78350f; border-color: #fde68a; }

.billing-banner__icon { flex-shrink: 0; margin-top: 0.1rem; }
.billing-banner__text { margin: 0; }
.billing-banner__text a { color: inherit; font-weight: 600; }
</style>
