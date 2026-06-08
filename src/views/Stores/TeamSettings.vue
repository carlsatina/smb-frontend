<template>
    <section class="tm-page">
        <div class="tm-shell">

            <header class="tm-header">
                <div class="tm-header-left">
                    <span class="tm-eyebrow">Team Management</span>
                    <h1 class="tm-title">{{ pageTitle }}</h1>
                    <p class="tm-subtitle">Manage members and invitations for {{ storeDescriptionName }}.</p>
                </div>
                <div class="tm-header-right">
                    <button class="tm-btn-ghost" @click="goToSettings">Back to settings</button>
                </div>
            </header>

            <!-- Tabs -->
            <div class="tm-tabs">
                <button
                    class="tm-tab"
                    :class="{ 'tm-tab--active': activeTab === 'members' }"
                    @click="activeTab = 'members'"
                >
                    Members
                    <span class="tm-tab-count">{{ members.length }}</span>
                </button>
                <button
                    class="tm-tab"
                    :class="{ 'tm-tab--active': activeTab === 'invites' }"
                    @click="activeTab = 'invites'"
                >
                    Invites
                    <span v-if="pendingInvites.length" class="tm-tab-count tm-tab-count--pending">
                        {{ pendingInvites.length }}
                    </span>
                </button>
            </div>

            <!-- Members tab -->
            <template v-if="activeTab === 'members'">
                <section class="tm-panel">
                    <div class="tm-panel-header">
                        <div>
                            <h2 class="tm-panel-title">Members</h2>
                            <p class="tm-panel-sub">Roles update immediately upon change.</p>
                        </div>
                    </div>

                    <SkeletonLoader v-if="isTeamLoading" :rows="4" label="Loading team…" />
                    <div v-else-if="!currentStore" class="tm-state">Select a store to view members.</div>
                    <div v-else-if="members.length === 0" class="tm-empty">No members yet.</div>
                    <div v-else class="tm-member-list">
                        <div v-for="member in members" :key="member.id" class="tm-member-row">
                            <div class="tm-member-info">
                                <div class="tm-member-name">{{ member.fullName || member.email }}</div>
                                <div class="tm-member-meta">{{ member.email }}</div>
                            </div>
                            <div class="tm-member-actions">
                                <select
                                    class="tm-role-select"
                                    :value="member.role"
                                    :disabled="!canManageMembers || isOwnerLocked(member) || isUpdatingMember(member.id)"
                                    @change="changeMemberRole(member, $event)"
                                >
                                    <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                                </select>
                                <button
                                    class="tm-btn-ghost tm-btn-ghost--danger"
                                    type="button"
                                    :disabled="!canManageMembers || isOwnerLocked(member) || isRemovingMember(member.id) || member.userId === currentUserId"
                                    @click="removeMember(member)"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </template>

            <!-- Invites tab -->
            <template v-if="activeTab === 'invites'">

                <!-- Invite form -->
                <section class="tm-panel">
                    <div class="tm-panel-header">
                        <div>
                            <h2 class="tm-panel-title">Invite member</h2>
                            <p class="tm-panel-sub">Share the generated link to onboard a new teammate.</p>
                        </div>
                    </div>

                    <form v-if="canManageMembers" class="tm-invite-form" @submit.prevent="createInvite">
                        <label class="tm-field">
                            Email
                            <input v-model="inviteForm.email" type="email" placeholder="teammate@shop.com" required />
                        </label>
                        <label class="tm-field">
                            Role
                            <select v-model="inviteForm.role">
                                <option v-for="role in inviteRoleOptions" :key="role" :value="role">{{ role }}</option>
                            </select>
                        </label>
                        <label class="tm-field">
                            Expires (days)
                            <input v-model.number="inviteForm.expiresInDays" type="number" min="1" max="30" />
                        </label>
                        <div class="tm-invite-action">
                            <button class="tm-btn-primary" type="submit" :disabled="isInviting || !inviteForm.email">
                                {{ isInviting ? 'Creating...' : 'Create invite' }}
                            </button>
                        </div>
                    </form>
                    <p v-else class="tm-permission-note">Only owners or admins can invite new members.</p>

                    <div v-if="recentInviteLink" class="tm-invite-link-card">
                        <span class="tm-invite-link-label">Invite link</span>
                        <div class="tm-invite-link">
                            <input type="text" readonly :value="recentInviteLink" />
                            <button class="tm-btn-ghost" type="button" @click="copyInviteLink">Copy</button>
                        </div>
                    </div>
                </section>

                <!-- Pending invites -->
                <section class="tm-panel">
                    <div class="tm-panel-header">
                        <div>
                            <h2 class="tm-panel-title">Pending invites</h2>
                            <p class="tm-panel-sub">Track and revoke outstanding invitations.</p>
                        </div>
                        <span v-if="pendingInvites.length" class="tm-badge">{{ pendingInvites.length }} pending</span>
                    </div>

                    <SkeletonLoader v-if="isTeamLoading" :rows="3" label="Loading invites…" />
                    <div v-else-if="pendingInvites.length === 0" class="tm-empty">No pending invites.</div>
                    <div v-else class="tm-invite-list">
                        <div v-for="invite in pendingInvites" :key="invite.id" class="tm-invite-row">
                            <div>
                                <div class="tm-member-name">{{ invite.email }}</div>
                                <div class="tm-member-meta">
                                    {{ invite.role }}
                                    <span v-if="invite.status === 'EXPIRED'"> &ndash; expired {{ formatDate(invite.expiresAt) }}</span>
                                    <span v-else> &ndash; expires {{ formatDate(invite.expiresAt) }}</span>
                                </div>
                            </div>
                            <div class="tm-invite-actions">
                                <span class="tm-status-pill" :class="statusClass(invite.status)">{{ invite.status }}</span>
                                <button
                                    v-if="canManageMembers && invite.status === 'PENDING'"
                                    class="tm-btn-ghost tm-btn-ghost--danger"
                                    type="button"
                                    :disabled="isRevokingInvite(invite.id)"
                                    @click="revokeInvite(invite)"
                                >
                                    Revoke
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

            </template>

        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { getMe } from '@/api/auth';
import {
    createStoreInvite,
    listStoreInvites,
    listStoreMembers,
    removeStoreMember,
    revokeStoreInvite,
    StoreInvite,
    StoreMember,
    updateStoreMemberRole,
} from '@/api/storeMembers';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const { showToast } = useToast();

const activeTab = ref<'members' | 'invites'>('members');

const isTeamLoading = ref(false);
const isInviting = ref(false);
const updatingMemberId = ref<string | null>(null);
const removingMemberId = ref<string | null>(null);
const revokingInviteId = ref<string | null>(null);
const currentUserId = ref<string | null>(null);
const members = ref<StoreMember[]>([]);
const invites = ref<StoreInvite[]>([]);
const recentInviteLink = ref('');
const roleOptions = ['OWNER', 'ADMIN', 'CASHIER', 'INVENTORY_MANAGER', 'VIEWER'];

const inviteForm = reactive({
    email: '',
    role: 'CASHIER',
    expiresInDays: 7,
});

const routeStoreId = computed(() => route.params.storeId as string | undefined);

const currentStore = computed(() => {
    const storeId = routeStoreId.value;
    if (!storeId) return null;
    return storeContext.stores.find((store) => store.id === storeId) ?? null;
});

const canEdit = computed(() => {
    const role = currentStore.value?.role;
    return role === 'OWNER' || role === 'ADMIN';
});
const canManageMembers = computed(() => canEdit.value);
const canManageOwners = computed(() => currentStore.value?.role === 'OWNER');
const inviteRoleOptions = computed(() =>
    canManageOwners.value ? roleOptions : roleOptions.filter((role) => role !== 'OWNER')
);

// Only show non-accepted invites — accepted ones are already team members
const pendingInvites = computed(() =>
    invites.value.filter((invite) => invite.status !== 'ACCEPTED')
);

const pageTitle = computed(() => currentStore.value?.name ? `${currentStore.value.name} — Team` : 'Team');
const storeDescriptionName = computed(() => currentStore.value?.name || 'this store');

const isOwnerLocked = (member: StoreMember) => member.role === 'OWNER' && !canManageOwners.value;
const isUpdatingMember = (memberId: string) => updatingMemberId.value === memberId;
const isRemovingMember = (memberId: string) => removingMemberId.value === memberId;
const isRevokingInvite = (inviteId: string) => revokingInviteId.value === inviteId;

const loadTeam = async () => {
    if (!currentStore.value) {
        members.value = [];
        invites.value = [];
        return;
    }
    isTeamLoading.value = true;
    try {
        const [memberData, inviteData] = await Promise.all([
            listStoreMembers(currentStore.value.id),
            listStoreInvites(currentStore.value.id),
        ]);
        members.value = memberData.members;
        invites.value = inviteData.invites;
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to load team members.';
        showToast(message, 'error');
    } finally {
        isTeamLoading.value = false;
    }
};

const loadCurrentUser = async () => {
    try {
        const data = await getMe();
        currentUserId.value = data.user.id;
    } catch {
        currentUserId.value = null;
    }
};

const changeMemberRole = async (member: StoreMember, event: Event) => {
    if (!currentStore.value || !canManageMembers.value) return;
    if (!(event.target instanceof HTMLSelectElement)) return;
    const nextRole = event.target.value;
    const previousRole = member.role;
    if (nextRole === previousRole) return;
    updatingMemberId.value = member.id;
    try {
        const data = await updateStoreMemberRole(currentStore.value.id, member.id, nextRole);
        member.role = data.member.role;
        showToast('Member role updated.', 'success');
    } catch (error: any) {
        event.target.value = previousRole;
        const message = error?.body?.error?.message || 'Unable to update role.';
        showToast(message, 'error');
    } finally {
        updatingMemberId.value = null;
    }
};

const removeMember = async (member: StoreMember) => {
    if (!currentStore.value || !canManageMembers.value) return;
    if (member.userId === currentUserId.value) {
        showToast('You cannot remove yourself from the store.', 'error');
        return;
    }
    const confirmed = window.confirm(`Remove ${member.email} from this store?`);
    if (!confirmed) return;
    removingMemberId.value = member.id;
    try {
        await removeStoreMember(currentStore.value.id, member.id);
        members.value = members.value.filter((entry) => entry.id !== member.id);
        showToast('Member removed.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to remove member.';
        showToast(message, 'error');
    } finally {
        removingMemberId.value = null;
    }
};

const createInvite = async () => {
    if (!currentStore.value || !canManageMembers.value) return;
    isInviting.value = true;
    try {
        const data = await createStoreInvite(currentStore.value.id, {
            email: inviteForm.email,
            role: inviteForm.role,
            expiresInDays: inviteForm.expiresInDays,
        });
        invites.value = [data.invite, ...invites.value];
        recentInviteLink.value = buildInviteLink(currentStore.value.id, data.token);
        inviteForm.email = '';
        inviteForm.role = 'CASHIER';
        inviteForm.expiresInDays = 7;
        if (data.emailSent === false) {
            showToast('Invite created. Email not sent; share the link instead.', 'info');
        } else {
            showToast('Invite created.', 'success');
        }
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to create invite.';
        showToast(message, 'error');
    } finally {
        isInviting.value = false;
    }
};

const revokeInvite = async (invite: StoreInvite) => {
    if (!currentStore.value || !canManageMembers.value) return;
    const confirmed = window.confirm(`Revoke invite for ${invite.email}?`);
    if (!confirmed) return;
    revokingInviteId.value = invite.id;
    try {
        await revokeStoreInvite(currentStore.value.id, invite.id);
        invites.value = invites.value.filter((entry) => entry.id !== invite.id);
        showToast('Invite revoked.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to revoke invite.';
        showToast(message, 'error');
    } finally {
        revokingInviteId.value = null;
    }
};

const buildInviteLink = (storeId: string, token: string) => {
    if (typeof window === 'undefined') return token;
    return `${window.location.origin}/stores/${storeId}/invites/accept?token=${token}`;
};

const copyInviteLink = async () => {
    if (!recentInviteLink.value) return;
    try {
        await navigator.clipboard.writeText(recentInviteLink.value);
        showToast('Invite link copied.', 'success');
    } catch {
        showToast('Unable to copy invite link.', 'error');
    }
};

const goToSettings = () => {
    if (!routeStoreId.value) return;
    router.push(`/stores/${routeStoreId.value}/settings`);
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusClass = (status: string) => {
    if (status === 'PENDING') return 'tm-status-pill--pending';
    if (status === 'ACCEPTED') return 'tm-status-pill--accepted';
    return 'tm-status-pill--expired';
};

onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    await loadCurrentUser();
    await loadTeam();
});

watch(
    () => currentStore.value,
    async (store) => {
        if (store) await loadTeam();
    }
);

watch(
    () => canManageOwners.value,
    (canManage) => {
        if (!canManage && inviteForm.role === 'OWNER') {
            inviteForm.role = 'CASHIER';
        }
    }
);
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.tm-page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    padding: 2.5rem 1.5rem 4rem;
    background: var(--c-bg);
    color: var(--c-text);
}

.tm-shell {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ── Header ── */
.tm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
}

.tm-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.tm-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent);
    width: fit-content;
}

.tm-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    color: var(--c-text);
    letter-spacing: -0.03em;
    line-height: 1.15;
}

.tm-subtitle {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
}

.tm-header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    padding-top: 0.25rem;
}

/* ── Tabs ── */
.tm-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--c-border);
    margin-bottom: -0.75rem;
}

.tm-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    color: var(--c-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.tm-tab:hover {
    color: var(--c-text);
}

.tm-tab--active {
    color: var(--c-accent-dark);
    border-bottom-color: var(--c-accent);
}

.tm-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    background: #e2e8f0;
    color: #475569;
}

.tm-tab-count--pending {
    background: rgba(234, 179, 8, 0.15);
    color: #92400e;
}

/* ── Panels ── */
.tm-panel {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 16px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.tm-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.tm-panel-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.2rem;
    color: var(--c-text);
}

.tm-panel-sub {
    margin: 0;
    font-size: 0.85rem;
    color: var(--c-muted);
}

.tm-badge {
    background: rgba(13, 148, 136, 0.1);
    color: var(--c-accent-dark);
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    flex-shrink: 0;
}

.tm-state {
    padding: 1.25rem 1.5rem;
    background: #f0fdf9;
    border-radius: 10px;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

.tm-empty {
    font-size: 0.875rem;
    color: var(--c-muted);
    padding: 0.5rem 0;
}

/* ── Buttons ── */
.tm-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.tm-btn-ghost:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.tm-btn-ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.tm-btn-ghost--danger {
    color: #b91c1c;
    border-color: #fecaca;
}

.tm-btn-ghost--danger:hover:not(:disabled) {
    background: #fff5f5;
    border-color: #fca5a5;
}

.tm-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--c-accent);
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
    white-space: nowrap;
}

.tm-btn-primary:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.tm-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ── Member list ── */
.tm-member-list {
    display: flex;
    flex-direction: column;
}

.tm-member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}

.tm-member-row:last-child {
    border-bottom: none;
}

.tm-member-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.tm-member-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--c-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tm-member-meta {
    font-size: 0.78rem;
    color: var(--c-muted);
}

.tm-member-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ── Role select ── */
.tm-role-select {
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}

.tm-role-select:disabled {
    background: var(--c-bg);
    color: #94a3b8;
    cursor: not-allowed;
}

/* ── Invite form ── */
.tm-invite-form {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.85rem 1rem;
}

.tm-invite-action {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
}

.tm-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.tm-field input,
.tm-field select {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    text-transform: none;
    letter-spacing: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.tm-field input:focus,
.tm-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

/* ── Invite link card ── */
.tm-invite-link-card {
    background: rgba(13, 148, 136, 0.05);
    border: 1px solid rgba(13, 148, 136, 0.18);
    border-radius: 10px;
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tm-invite-link-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-accent-dark);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.tm-invite-link {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.tm-invite-link input {
    flex: 1;
    min-width: 200px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    font-family: 'Inter', sans-serif;
    background: var(--c-surface);
    color: var(--c-muted);
}

/* ── Invite list ── */
.tm-invite-list {
    display: flex;
    flex-direction: column;
}

.tm-invite-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}

.tm-invite-row:last-child {
    border-bottom: none;
}

.tm-invite-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ── Status pills ── */
.tm-status-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.tm-status-pill--pending {
    background: rgba(234, 179, 8, 0.15);
    color: #92400e;
}

.tm-status-pill--accepted {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
}

.tm-status-pill--expired {
    background: #f1f5f9;
    color: #64748b;
}

.tm-permission-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ── Responsive ── */
@media (max-width: 768px) {
    .tm-invite-form {
        grid-template-columns: 1fr;
    }

    .tm-member-row {
        flex-wrap: wrap;
    }
}

@media (max-width: 600px) {
    .tm-page {
        padding: 1.5rem 1rem 3rem;
    }

    .tm-panel {
        padding: 1.25rem;
    }
}
</style>
