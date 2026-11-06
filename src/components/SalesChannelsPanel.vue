<template>
    <div class="sc">
        <div v-if="draft.length === 0" class="sc-empty">
            <p>No sales channels yet. Add one for delivery apps that charge more than your store prices.</p>
            <div class="sc-empty-actions">
                <button type="button" class="sc-btn sc-btn--primary" :disabled="!canEdit" @click="addGrab">Add Grab (+25%)</button>
                <button type="button" class="sc-btn sc-btn--ghost" :disabled="!canEdit" @click="addBlank">Add another channel</button>
            </div>
        </div>

        <div v-for="(channel, index) in draft" :key="channel.uid" class="sc-card" :class="{ 'sc-card--off': !channel.active }">
            <div class="sc-card-head">
                <input
                    v-model="channel.name"
                    class="sc-name"
                    type="text"
                    maxlength="40"
                    placeholder="Channel name"
                    :disabled="!canEdit"
                    aria-label="Channel name"
                />
                <label class="sc-switch">
                    <input v-model="channel.active" type="checkbox" :disabled="!canEdit" />
                    <span>{{ channel.active ? 'On in POS' : 'Off' }}</span>
                </label>
            </div>

            <div class="sc-fields">
                <label class="sc-field">
                    <span>Markup</span>
                    <div class="sc-suffix">
                        <input
                            v-model.number="channel.markupPercent"
                            type="number"
                            min="0"
                            max="500"
                            step="0.5"
                            inputmode="decimal"
                            :disabled="!canEdit"
                        />
                        <span>%</span>
                    </div>
                </label>
                <label class="sc-field">
                    <span>Rounding</span>
                    <select v-model="channel.rounding" :disabled="!canEdit">
                        <option v-for="option in ROUNDING_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                </label>
                <label class="sc-check">
                    <input v-model="channel.alwaysTakeout" type="checkbox" :disabled="!canEdit" />
                    Always takeout (deducts cups, lids and other packaging)
                </label>
            </div>

            <div class="sc-preview">
                <span>Example:</span>
                <strong v-for="base in PREVIEW_PRICES" :key="base">
                    {{ formatMoney(base) }} → {{ formatMoney(previewPrice(base, channel)) }}
                </strong>
                <span class="sc-preview-note">Set different prices per product in the product form.</span>
            </div>

            <button
                v-if="!channel.key && canEdit"
                type="button"
                class="sc-remove"
                @click="removeUnsaved(index)"
            >
                Remove
            </button>
        </div>

        <div v-if="canEdit && draft.length > 0" class="sc-actions">
            <button type="button" class="sc-btn sc-btn--ghost" :disabled="isSaving" @click="addBlank">Add channel</button>
            <span class="sc-spacer"></span>
            <button type="button" class="sc-btn sc-btn--ghost" :disabled="isSaving || !isDirty" @click="reset">Discard</button>
            <button type="button" class="sc-btn sc-btn--primary" :disabled="isSaving || !isDirty || !isValid" @click="save">
                {{ isSaving ? 'Saving…' : 'Save channels' }}
            </button>
        </div>
        <p v-if="!canEdit" class="sc-note">Only owners and admins with “Manage store & team” can change sales channels.</p>
        <p v-else-if="hasSavedChannels" class="sc-note">
            Channels already used on sales can be turned off but not removed, so past sales keep their channel.
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { updateStore } from '@/api/stores';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { computeChannelPrice, ROUNDING_OPTIONS, type SalesChannel } from '@/utils/salesChannels';

defineProps<{ canEdit: boolean }>();

type DraftChannel = Omit<SalesChannel, 'key'> & { key: string | null; uid: number };

const PREVIEW_PRICES = [90, 125];

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const draft = ref<DraftChannel[]>([]);
const isSaving = ref(false);
let uid = 0;

const saved = computed<SalesChannel[]>(() => storeContext.currentStore?.salesChannels ?? []);
const hasSavedChannels = computed(() => saved.value.length > 0);

const reset = () => {
    draft.value = saved.value.map((channel) => ({ ...channel, uid: uid++ }));
};

watch(saved, reset, { immediate: true });

const serialize = (channels: Array<Omit<DraftChannel, 'uid'> | SalesChannel>) =>
    JSON.stringify(
        channels.map(({ key, name, markupPercent, rounding, alwaysTakeout, active }) => ({
            key,
            name: name.trim(),
            markupPercent: Number(markupPercent),
            rounding,
            alwaysTakeout,
            active,
        }))
    );

const isDirty = computed(() => serialize(draft.value) !== serialize(saved.value));
const isValid = computed(() =>
    draft.value.every(
        (channel) =>
            channel.name.trim().length > 0 &&
            Number.isFinite(Number(channel.markupPercent)) &&
            Number(channel.markupPercent) >= 0 &&
            Number(channel.markupPercent) <= 500
    )
);

const addGrab = () => {
    draft.value.push({
        key: null,
        uid: uid++,
        name: 'Grab',
        markupPercent: 25,
        rounding: 'NEAREST_1',
        alwaysTakeout: true,
        active: true,
    });
};

const addBlank = () => {
    draft.value.push({
        key: null,
        uid: uid++,
        name: '',
        markupPercent: 0,
        rounding: 'NEAREST_1',
        alwaysTakeout: true,
        active: true,
    });
};

const removeUnsaved = (index: number) => {
    draft.value.splice(index, 1);
};

const previewPrice = (base: number, channel: DraftChannel) =>
    computeChannelPrice(base, { ...channel, key: channel.key ?? '', markupPercent: Number(channel.markupPercent) || 0 });

const save = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !isValid.value) return;
    isSaving.value = true;
    try {
        await updateStore(storeId, {
            salesChannels: draft.value.map(({ key, name, markupPercent, rounding, alwaysTakeout, active }) => ({
                key,
                name: name.trim(),
                markupPercent: Number(markupPercent),
                rounding,
                alwaysTakeout,
                active,
            })),
        });
        await storeContext.fetchStores();
        showToast('Sales channels saved.', 'success');
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to save sales channels.', 'error');
    } finally {
        isSaving.value = false;
    }
};

const formatMoney = (value: number) => {
    const currency = storeContext.currentStore?.currency || 'PHP';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value || 0);
    } catch {
        return value.toFixed(2);
    }
};

</script>

<style scoped>
.sc {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
}

.sc-empty {
    border: 1px dashed var(--c-border, #e2e8f0);
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
    color: var(--c-muted, #64748b);
    font-size: 0.88rem;
}

.sc-empty p {
    margin: 0 0 0.9rem;
}

.sc-empty-actions {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.sc-card {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.sc-card--off {
    background: #f8fafc;
}

.sc-card-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.sc-name {
    flex: 1;
    min-width: 0;
    font-size: 0.95rem;
    font-weight: 700;
}

.sc-card input[type='text'],
.sc-card input[type='number'],
.sc-card select {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 8px;
    padding: 0.5rem 0.65rem;
    font-family: inherit;
    font-size: 0.88rem;
    color: var(--c-text, #0f172a);
    background: #fff;
}

.sc-card input:focus,
.sc-card select:focus {
    outline: none;
    border-color: var(--c-accent, #0d9488);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.sc-switch,
.sc-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text, #0f172a);
    cursor: pointer;
}

.sc-switch input,
.sc-check input {
    width: 16px;
    height: 16px;
    accent-color: var(--c-accent, #0d9488);
}

.sc-fields {
    display: grid;
    grid-template-columns: 140px minmax(0, 220px) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: end;
}

.sc-field {
    display: grid;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-muted, #64748b);
}

.sc-suffix {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.sc-suffix input {
    width: 100%;
    min-width: 0;
}

.sc-suffix span {
    color: var(--c-muted, #64748b);
    font-weight: 600;
}

.sc-check {
    font-weight: 500;
    padding-bottom: 0.55rem;
}

.sc-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.9rem;
    align-items: baseline;
    font-size: 0.82rem;
    color: var(--c-muted, #64748b);
}

.sc-preview strong {
    color: var(--c-text, #0f172a);
    font-variant-numeric: tabular-nums;
}

.sc-preview-note {
    flex-basis: 100%;
    font-size: 0.76rem;
}

.sc-remove {
    align-self: flex-start;
    border: none;
    background: none;
    padding: 0;
    color: #dc2626;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
}

.sc-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.sc-spacer {
    flex: 1;
}

.sc-btn {
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
}

.sc-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.sc-btn--ghost {
    border: 1px solid var(--c-border, #e2e8f0);
    background: #fff;
    color: var(--c-text, #0f172a);
}

.sc-btn--primary {
    border: none;
    background: var(--c-accent, #0d9488);
    color: #fff;
}

.sc-note {
    margin: 0;
    font-size: 0.78rem;
    color: var(--c-muted, #64748b);
}

@media (max-width: 720px) {
    .sc-fields {
        grid-template-columns: 1fr 1fr;
    }

    .sc-check {
        grid-column: 1 / -1;
        padding-bottom: 0;
    }
}
</style>
