<template>
    <div class="rp">
        <div v-if="isLoading" class="rp-state">Loading permissions…</div>
        <div v-else-if="loadError" class="rp-state rp-state--error">
            {{ loadError }}
            <button type="button" class="rp-link" @click="load">Try again</button>
        </div>

        <template v-else-if="data">
            <p v-if="!data.canEdit" class="rp-notice">
                <mdicon name="lock-outline" size="15" />
                Only the store owner can change permissions.
            </p>

            <div class="rp-toolbar">
                <span class="rp-toolbar-note">
                    Owners always have every permission.
                    <template v-if="(data.customMemberCount ?? 0) > 0">
                        {{ data.customMemberCount }} member{{ data.customMemberCount === 1 ? ' has' : 's have' }}
                        custom permissions on top of their role (see Team).
                    </template>
                </span>
                <label class="rp-toggle">
                    <input v-model="showDescriptions" type="checkbox" />
                    Show descriptions
                </label>
            </div>

            <div class="rp-table-wrap" :class="{ 'rp-compact': !showDescriptions }" :style="{ '--rp-sticky-top': `${stickyTop}px` }">
                <table class="rp-table">
                    <thead>
                        <tr>
                            <th class="rp-col-perm" scope="col">Permission</th>
                            <th v-for="role in data.roles" :key="role" scope="col" class="rp-col-role">
                                {{ roleLabel(role) }}
                            </th>
                        </tr>
                    </thead>
                    <tbody v-for="group in groups" :key="group.name">
                        <tr class="rp-group-row">
                            <th :colspan="data.roles.length + 1" scope="colgroup">{{ group.name }}</th>
                        </tr>
                        <tr v-for="permission in group.items" :key="permission.key">
                            <th scope="row" class="rp-col-perm">
                                <span class="rp-perm-label">
                                    {{ permission.label }}
                                    <mdicon
                                        v-if="!showDescriptions"
                                        name="information-outline"
                                        size="14"
                                        class="rp-info"
                                        :title="permission.description"
                                    />
                                </span>
                                <span v-if="showDescriptions" class="rp-perm-desc">{{ permission.description }}</span>
                            </th>
                            <td v-for="role in data.roles" :key="role" class="rp-cell" :class="{ 'rp-cell--changed': isChanged(role, permission.key) }">
                                <input
                                    type="checkbox"
                                    :checked="isGranted(role, permission.key)"
                                    :disabled="!data.canEdit || isSaving || isImpliedOnly(role, permission.key)"
                                    :title="impliedTitle(role, permission.key)"
                                    :aria-label="`${roleLabel(role)}: ${permission.label}`"
                                    @change="toggle(role, permission.key, ($event.target as HTMLInputElement).checked)"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Phone layout: pick a role, then one list of checkboxes -->
            <div class="rp-mobile">
                <div class="rp-role-tabs" role="tablist" aria-label="Role">
                    <button
                        v-for="role in data.roles"
                        :key="role"
                        type="button"
                        role="tab"
                        class="rp-role-tab"
                        :class="{ 'is-active': mobileRole === role }"
                        :aria-selected="mobileRole === role"
                        @click="mobileRole = role"
                    >
                        {{ roleLabel(role) }}
                    </button>
                </div>
                <div v-for="group in groups" :key="group.name" class="rp-mobile-group">
                    <div class="rp-mobile-group-title">{{ group.name }}</div>
                    <label
                        v-for="permission in group.items"
                        :key="permission.key"
                        class="rp-mobile-row"
                        :class="{ 'rp-cell--changed': isChanged(mobileRole, permission.key) }"
                    >
                        <span class="rp-mobile-text">
                            <span class="rp-perm-label">{{ permission.label }}</span>
                            <span v-if="showDescriptions || isImpliedOnly(mobileRole, permission.key)" class="rp-perm-desc">
                                {{ impliedTitle(mobileRole, permission.key) || permission.description }}
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            :checked="isGranted(mobileRole, permission.key)"
                            :disabled="!data.canEdit || isSaving || isImpliedOnly(mobileRole, permission.key)"
                            @change="toggle(mobileRole, permission.key, ($event.target as HTMLInputElement).checked)"
                        />
                    </label>
                </div>
            </div>

            <p class="rp-footnote">
                Every member can always view sales history, expenses, the schedule and the team list. Deleting the store,
                changing sale dates and editing this page stay with the owner.
            </p>

            <div v-if="data.canEdit" class="rp-actions">
                <button
                    type="button"
                    class="rp-btn rp-btn--ghost rp-btn--reset"
                    :disabled="isSaving || isDefaultDraft"
                    @click="resetToDefaults"
                >
                    Reset to defaults
                </button>
                <span class="rp-actions-spacer"></span>
                <span v-if="isDirty" class="rp-dirty">{{ changeCount }} unsaved change{{ changeCount === 1 ? '' : 's' }}</span>
                <button type="button" class="rp-btn rp-btn--ghost" :disabled="isSaving || !isDirty" @click="discard">
                    Discard
                </button>
                <button type="button" class="rp-btn rp-btn--primary" :disabled="isSaving || !isDirty" @click="save">
                    {{ isSaving ? 'Saving…' : 'Save changes' }}
                </button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    getRolePermissions,
    updateRolePermissions,
    type EditableRole,
    type PermissionDefinition,
    type RolePermissionsResponse,
} from '@/api/stores';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';

const props = defineProps<{ storeId: string }>();

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const data = ref<RolePermissionsResponse | null>(null);
const draft = ref<Record<EditableRole, string[]>>({ ADMIN: [], INVENTORY_MANAGER: [], CASHIER: [], VIEWER: [] });
const isLoading = ref(false);
const mobileRole = ref<EditableRole>('ADMIN');

// Compact by default; the choice is remembered per browser.
const DESCRIPTIONS_KEY = 'rolePermissions.showDescriptions';
const readShowDescriptions = () => {
    try {
        return localStorage.getItem(DESCRIPTIONS_KEY) === '1';
    } catch {
        return false;
    }
};
const showDescriptions = ref(readShowDescriptions());
watch(showDescriptions, (value) => {
    try {
        localStorage.setItem(DESCRIPTIONS_KEY, value ? '1' : '0');
    } catch {
        // Storage unavailable (private mode); the toggle still works for this visit.
    }
});

// The window scrolls under a sticky top nav, so the table header locks just below it.
const stickyTop = ref(0);
const measureStickyTop = () => {
    const nav = document.querySelector('.topnav');
    stickyTop.value = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
};
onMounted(() => {
    measureStickyTop();
    window.addEventListener('resize', measureStickyTop);
});
onBeforeUnmount(() => window.removeEventListener('resize', measureStickyTop));
const isSaving = ref(false);
const loadError = ref('');

const ROLE_LABELS: Record<EditableRole, string> = {
    ADMIN: 'Admin',
    INVENTORY_MANAGER: 'Inventory manager',
    CASHIER: 'Cashier',
    VIEWER: 'Viewer',
};
const roleLabel = (role: EditableRole) => ROLE_LABELS[role] ?? role;

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

const cloneMatrix = (matrix: Record<EditableRole, string[]>) =>
    Object.fromEntries(Object.entries(matrix).map(([role, keys]) => [role, [...keys]])) as Record<EditableRole, string[]>;

// Permissions switched on because another checked permission includes them.
const impliedBy = (role: EditableRole, key: string) =>
    (data.value?.permissions ?? []).filter(
        (permission) => permission.implies?.includes(key) && draft.value[role]?.includes(permission.key)
    );

const isImpliedOnly = (role: EditableRole, key: string) => impliedBy(role, key).length > 0;
const isGranted = (role: EditableRole, key: string) => draft.value[role]?.includes(key) || isImpliedOnly(role, key);
const impliedTitle = (role: EditableRole, key: string) => {
    const sources = impliedBy(role, key);
    return sources.length ? `Included with "${sources.map((source) => source.label).join('", "')}"` : undefined;
};

const savedGranted = (role: EditableRole, key: string) => Boolean(data.value?.matrix[role]?.includes(key));
const isChanged = (role: EditableRole, key: string) => isGranted(role, key) !== savedGranted(role, key);

const changeCount = computed(() => {
    if (!data.value) return 0;
    let count = 0;
    data.value.roles.forEach((role) => {
        data.value!.permissions.forEach((permission) => {
            if (isChanged(role, permission.key)) count += 1;
        });
    });
    return count;
});
const isDirty = computed(() => changeCount.value > 0);

const isDefaultDraft = computed(() => {
    if (!data.value) return true;
    return data.value.roles.every((role) =>
        data.value!.permissions.every(
            (permission) => isGranted(role, permission.key) === data.value!.defaults[role].includes(permission.key)
        )
    );
});

const toggle = (role: EditableRole, key: string, checked: boolean) => {
    const current = new Set(draft.value[role] ?? []);
    if (checked) current.add(key);
    else current.delete(key);
    // Implied permissions are stored explicitly so unchecking "manage" keeps "view".
    if (checked) {
        data.value?.permissions.find((permission) => permission.key === key)?.implies?.forEach((implied) => current.add(implied));
    }
    draft.value = { ...draft.value, [role]: [...current] };
};

const load = async () => {
    isLoading.value = true;
    loadError.value = '';
    try {
        const response = await getRolePermissions(props.storeId);
        data.value = response;
        draft.value = cloneMatrix(response.matrix);
    } catch (error: any) {
        loadError.value = error?.body?.error?.message || 'Unable to load permissions.';
    } finally {
        isLoading.value = false;
    }
};

const discard = () => {
    if (data.value) draft.value = cloneMatrix(data.value.matrix);
};

const resetToDefaults = () => {
    if (data.value) draft.value = cloneMatrix(data.value.defaults);
};

const save = async () => {
    if (!data.value || !isDirty.value) return;
    isSaving.value = true;
    try {
        const response = await updateRolePermissions(props.storeId, draft.value);
        data.value = response;
        draft.value = cloneMatrix(response.matrix);
        // Refresh the signed-in user's own permissions (nav, page guards).
        await storeContext.fetchStores();
        showToast('Permissions saved.', 'success');
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to save permissions.', 'error');
    } finally {
        isSaving.value = false;
    }
};

watch(() => props.storeId, () => load(), { immediate: true });

defineExpose({ isDirty });
</script>

<style scoped>
.rp {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.rp-state {
    padding: 2rem 0;
    text-align: center;
    color: var(--c-muted, #64748b);
    font-size: 0.9rem;
}

.rp-state--error {
    color: #b91c1c;
}

.rp-link {
    border: none;
    background: none;
    color: var(--c-accent, #0d9488);
    font-weight: 600;
    cursor: pointer;
    margin-left: 0.4rem;
    font-family: inherit;
}

.rp-notice {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid var(--c-border, #e2e8f0);
    color: var(--c-muted, #64748b);
    font-size: 0.85rem;
}

.rp-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.rp-toolbar-note {
    font-size: 0.8rem;
    color: var(--c-muted, #64748b);
}

.rp-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text, #0f172a);
    cursor: pointer;
    user-select: none;
}

.rp-toggle input {
    width: 15px;
    height: 15px;
    accent-color: var(--c-accent, #0d9488);
}

/* clip (not auto/hidden) keeps the rounded corners without creating a scroll
   container, so the sticky header can track the window scroll. */
.rp-table-wrap {
    overflow: clip;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 10px;
}

.rp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    color: var(--c-text, #0f172a);
}

.rp-table thead th {
    position: sticky;
    top: var(--rp-sticky-top, 0px);
    z-index: 3;
    background: #f8fafc;
    /* Collapsed borders don't travel with sticky cells; draw the rule as a shadow. */
    box-shadow: inset 0 -1px 0 var(--c-border, #e2e8f0);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-muted, #64748b);
    padding: 0.55rem 0.4rem;
    text-align: center;
    white-space: nowrap;
}

.rp-table thead th.rp-col-perm {
    text-align: left;
    padding-left: 0.9rem;
}

.rp-col-role {
    width: 88px;
}

.rp-group-row th {
    text-align: left;
    padding: 0.45rem 0.9rem 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--c-accent-dark, #0f766e);
    background: #fff;
    border-top: 1px solid var(--c-border, #e2e8f0);
}

tbody:first-of-type .rp-group-row th {
    border-top: none;
}

tbody tr:not(.rp-group-row) th,
tbody tr:not(.rp-group-row) td {
    border-top: 1px solid #f1f5f9;
}

.rp-col-perm {
    text-align: left;
    font-weight: 400;
    padding: 0.55rem 0.75rem 0.55rem 0.9rem;
    min-width: 220px;
}

.rp-compact .rp-col-perm {
    padding-top: 0.35rem;
    padding-bottom: 0.35rem;
}

.rp-compact .rp-cell {
    padding-top: 0.3rem;
    padding-bottom: 0.3rem;
}

.rp-info {
    display: inline-flex;
    vertical-align: -2px;
    margin-left: 0.15rem;
    color: #94a3b8;
    cursor: help;
}

.rp-perm-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text, #0f172a);
}

.rp-perm-desc {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.78rem;
    line-height: 1.35;
    color: var(--c-muted, #64748b);
}

.rp-cell {
    text-align: center;
    vertical-align: middle;
    padding: 0.5rem;
}

.rp-cell--changed {
    background: rgba(245, 158, 11, 0.1);
}

.rp-cell input {
    width: 17px;
    height: 17px;
    accent-color: var(--c-accent, #0d9488);
    cursor: pointer;
}

.rp-cell input:disabled {
    cursor: not-allowed;
}

.rp-footnote {
    margin: 0;
    font-size: 0.78rem;
    color: var(--c-muted, #64748b);
    line-height: 1.45;
}

.rp-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.rp-actions-spacer {
    flex: 1;
}

.rp-dirty {
    font-size: 0.8rem;
    font-weight: 600;
    color: #b45309;
}

.rp-btn {
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}

.rp-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.rp-btn--ghost {
    border: 1px solid var(--c-border, #e2e8f0);
    background: #fff;
    color: var(--c-text, #0f172a);
}

.rp-btn--ghost:hover:not(:disabled) {
    background: #f8fafc;
}

.rp-btn--primary {
    border: none;
    background: var(--c-accent, #0d9488);
    color: #fff;
}

.rp-btn--primary:hover:not(:disabled) {
    background: var(--c-accent-dark, #0f766e);
}

/* Phone layout */
.rp-mobile {
    display: none;
}

.rp-role-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
    margin-bottom: 0.25rem;
}

.rp-role-tab {
    border: 1px solid var(--c-border, #e2e8f0);
    background: #fff;
    border-radius: 8px;
    padding: 0.55rem 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--c-muted, #64748b);
    cursor: pointer;
}

.rp-role-tab.is-active {
    border-color: var(--c-accent, #0d9488);
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark, #0f766e);
}

.rp-mobile-group {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 10px;
    overflow: hidden;
    margin-top: 0.75rem;
}

.rp-mobile-group-title {
    padding: 0.55rem 0.85rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--c-accent-dark, #0f766e);
    background: #f8fafc;
}

.rp-mobile-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.85rem;
    border-top: 1px solid #f1f5f9;
    cursor: pointer;
}

.rp-mobile-text {
    flex: 1;
    min-width: 0;
}

.rp-mobile-row input {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    accent-color: var(--c-accent, #0d9488);
}

@media (max-width: 640px) {
    .rp-table-wrap {
        display: none;
    }

    .rp-mobile {
        display: block;
    }

    .rp-actions-spacer {
        display: none;
    }

    .rp-btn--reset {
        width: 100%;
    }
}
</style>
