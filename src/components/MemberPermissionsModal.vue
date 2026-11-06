<template>
    <Teleport to="body">
        <Transition name="mp-fade">
            <div v-if="memberId" class="mp-overlay" @click.self="requestClose" @keydown.esc="requestClose">
                <div class="mp" role="dialog" aria-modal="true" aria-labelledby="mp-title">
                    <header class="mp-header">
                        <div class="mp-header-text">
                            <h3 id="mp-title">{{ data ? data.member.fullName || data.member.email : 'Permissions' }}</h3>
                            <p v-if="data" class="mp-meta">
                                {{ roleLabel(data.member.role) }}
                                <template v-if="customCount > 0"> · {{ customCount }} custom</template>
                            </p>
                        </div>
                        <button type="button" class="mp-close" aria-label="Close" @click="requestClose">
                            <mdicon name="close" size="20" />
                        </button>
                    </header>

                    <div v-if="isLoading" class="mp-state">Loading permissions…</div>
                    <div v-else-if="loadError" class="mp-state mp-state--error">{{ loadError }}</div>

                    <div v-else-if="data" class="mp-body">
                        <p v-if="!data.editable" class="mp-notice">Owners always have every permission.</p>
                        <p v-else-if="!data.canEdit" class="mp-notice">
                            <mdicon name="lock-outline" size="15" />
                            Only the store owner can change a member's permissions.
                        </p>
                        <p v-else class="mp-hint">
                            Starts from the {{ roleLabel(data.member.role) }} role. Anything you change here applies to this
                            person only, and is cleared if their role changes.
                        </p>

                        <div v-for="group in groups" :key="group.name" class="mp-group">
                            <div class="mp-group-title">{{ group.name }}</div>
                            <label
                                v-for="permission in group.items"
                                :key="permission.key"
                                class="mp-row"
                                :class="{ 'mp-row--changed': isDirtyKey(permission.key) }"
                            >
                                <span class="mp-text">
                                    <span class="mp-label">
                                        {{ permission.label }}
                                        <span v-if="isCustom(permission.key)" class="mp-badge">
                                            Custom · role {{ roleHas(permission.key) ? 'has' : "doesn't have" }} it
                                        </span>
                                    </span>
                                    <span class="mp-desc">{{ impliedTitle(permission.key) || permission.description }}</span>
                                </span>
                                <input
                                    type="checkbox"
                                    :checked="isGranted(permission.key)"
                                    :disabled="!data.canEdit || isSaving || isImpliedOnly(permission.key)"
                                    @change="toggle(permission.key, ($event.target as HTMLInputElement).checked)"
                                />
                            </label>
                        </div>
                    </div>

                    <footer v-if="data?.canEdit" class="mp-footer">
                        <button
                            type="button"
                            class="mp-btn mp-btn--ghost"
                            :disabled="isSaving || customCount === 0"
                            @click="resetToRole"
                        >
                            Reset to role
                        </button>
                        <span class="mp-spacer"></span>
                        <button type="button" class="mp-btn mp-btn--ghost" :disabled="isSaving" @click="requestClose">
                            Cancel
                        </button>
                        <button type="button" class="mp-btn mp-btn--primary" :disabled="isSaving || !isDirty" @click="save">
                            {{ isSaving ? 'Saving…' : 'Save' }}
                        </button>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
    getMemberPermissions,
    updateMemberPermissions,
    type MemberPermissionsResponse,
} from '@/api/storeMembers';
import type { PermissionDefinition } from '@/api/stores';
import { useToast } from '@/composables/useToast';

const props = defineProps<{ storeId: string; memberId: string | null }>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'saved', customCount: number): void;
}>();

const { showToast } = useToast();

const data = ref<MemberPermissionsResponse | null>(null);
const draft = ref<Set<string>>(new Set());
const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref('');

const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    INVENTORY_MANAGER: 'Inventory manager',
    CASHIER: 'Cashier',
    VIEWER: 'Viewer',
};
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

const groups = computed(() => {
    const result: Array<{ name: string; items: PermissionDefinition[] }> = [];
    (data.value?.permissions ?? []).forEach((permission) => {
        let group = result.find((entry) => entry.name === permission.group);
        if (!group) {
            group = { name: permission.group, items: [] };
            result.push(group);
        }
        group.items.push(permission);
    });
    return result;
});

const impliedBy = (key: string) =>
    (data.value?.permissions ?? []).filter((permission) => permission.implies?.includes(key) && draft.value.has(permission.key));
const isImpliedOnly = (key: string) => impliedBy(key).length > 0;
const isGranted = (key: string) => draft.value.has(key) || isImpliedOnly(key);
const impliedTitle = (key: string) => {
    const sources = impliedBy(key);
    return sources.length ? `Included with "${sources.map((source) => source.label).join('", "')}"` : '';
};

const roleHas = (key: string) => Boolean(data.value?.rolePermissions.includes(key));
const isCustom = (key: string) => Boolean(data.value?.editable) && isGranted(key) !== roleHas(key);
const isDirtyKey = (key: string) => isGranted(key) !== Boolean(data.value?.effective.includes(key));

const customCount = computed(() => (data.value?.permissions ?? []).filter((p) => isCustom(p.key)).length);
const isDirty = computed(() => (data.value?.permissions ?? []).some((p) => isDirtyKey(p.key)));

const toggle = (key: string, checked: boolean) => {
    const next = new Set(draft.value);
    if (checked) {
        next.add(key);
        data.value?.permissions.find((p) => p.key === key)?.implies?.forEach((implied) => next.add(implied));
    } else {
        next.delete(key);
    }
    draft.value = next;
};

const resetToRole = () => {
    if (data.value) draft.value = new Set(data.value.rolePermissions);
};

const load = async (memberId: string) => {
    isLoading.value = true;
    loadError.value = '';
    data.value = null;
    try {
        const response = await getMemberPermissions(props.storeId, memberId);
        if (props.memberId !== memberId) return;
        data.value = response;
        draft.value = new Set(response.effective);
    } catch (error: any) {
        loadError.value = error?.body?.error?.message || 'Unable to load permissions.';
    } finally {
        isLoading.value = false;
    }
};

const requestClose = () => {
    if (!isSaving.value) emit('close');
};

const save = async () => {
    if (!data.value || !props.memberId || !isDirty.value) return;
    isSaving.value = true;
    try {
        const response = await updateMemberPermissions(props.storeId, props.memberId, [...draft.value]);
        data.value = response;
        draft.value = new Set(response.effective);
        const count = Object.keys(response.overrides).length;
        showToast(count ? 'Permissions saved for this person.' : 'Permissions reset to the role.', 'success');
        emit('saved', count);
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to save permissions.', 'error');
    } finally {
        isSaving.value = false;
    }
};

watch(
    () => props.memberId,
    (memberId) => {
        if (memberId) load(memberId);
    },
    { immediate: true }
);
</script>

<style scoped>
.mp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    font-family: 'Inter', -apple-system, sans-serif;
}

.mp {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
    width: 100%;
    max-width: 560px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.mp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e2e8f0;
}

.mp-header-text {
    min-width: 0;
}

.mp-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    overflow-wrap: anywhere;
}

.mp-meta {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: #64748b;
}

.mp-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    flex-shrink: 0;
}

.mp-close:hover {
    background: #f1f5f9;
    color: #0f172a;
}

.mp-state {
    padding: 2.5rem 1.25rem;
    text-align: center;
    color: #64748b;
    font-size: 0.9rem;
}

.mp-state--error {
    color: #b91c1c;
}

.mp-body {
    overflow-y: auto;
    padding: 0.85rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mp-notice,
.mp-hint {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.4;
}

.mp-notice {
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
}

.mp-group {
    /* The body scrolls; groups keep their full height instead of shrinking to fit. */
    flex-shrink: 0;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
}

.mp-group-title {
    padding: 0.45rem 0.85rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #0f766e;
    background: #f8fafc;
}

.mp-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.85rem;
    border-top: 1px solid #f1f5f9;
    cursor: pointer;
}

.mp-row--changed {
    background: rgba(245, 158, 11, 0.1);
}

.mp-text {
    flex: 1;
    min-width: 0;
}

.mp-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
}

.mp-badge {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.1);
    color: #0f766e;
    font-size: 0.68rem;
    font-weight: 600;
    vertical-align: 1px;
    white-space: nowrap;
}

.mp-desc {
    display: block;
    margin-top: 0.1rem;
    font-size: 0.75rem;
    line-height: 1.35;
    color: #64748b;
}

.mp-row input {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: #0d9488;
}

.mp-row input:disabled {
    cursor: not-allowed;
}

.mp-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.25rem;
    border-top: 1px solid #e2e8f0;
}

.mp-spacer {
    flex: 1;
}

.mp-btn {
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
}

.mp-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.mp-btn--ghost {
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #0f172a;
}

.mp-btn--ghost:hover:not(:disabled) {
    background: #f8fafc;
}

.mp-btn--primary {
    border: none;
    background: #0d9488;
    color: #fff;
}

.mp-btn--primary:hover:not(:disabled) {
    background: #0f766e;
}

@media (max-width: 640px) {
    .mp-overlay {
        padding: 0;
        align-items: flex-end;
    }

    .mp {
        max-height: 94vh;
        border-radius: 16px 16px 0 0;
    }
}

.mp-fade-enter-active,
.mp-fade-leave-active {
    transition: opacity 0.2s ease;
}

.mp-fade-enter-from,
.mp-fade-leave-to {
    opacity: 0;
}
</style>
