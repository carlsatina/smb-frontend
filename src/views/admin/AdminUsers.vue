<template>
    <div class="au">
        <header class="au-header">
            <h1 class="au-title">Users</h1>
            <p class="au-sub">Manage plans and access for all users.</p>
        </header>

        <div v-if="loading" class="au-state">Loading users...</div>
        <div v-else-if="error" class="au-state au-state--error">{{ error }}</div>

        <template v-else>
            <div class="au-table-wrap">
                <table class="au-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Plan</th>
                            <th>Grant</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in users" :key="user.id">
                            <td>
                                <div class="au-user-cell">
                                    <span class="au-email">{{ user.email }}</span>
                                    <span v-if="user.fullName" class="au-name">{{ user.fullName }}</span>
                                    <span v-if="user.isSuperAdmin" class="au-badge au-badge--admin">Admin</span>
                                </div>
                            </td>
                            <td>
                                <select class="au-select" :value="user.planTier" @change="onPlanChange(user, ($event.target as HTMLSelectElement).value)">
                                    <option value="STARTER">Starter</option>
                                    <option value="STANDARD">Standard</option>
                                    <option value="GROWTH">Growth</option>
                                </select>
                            </td>
                            <td>
                                <div v-if="user.grantedPlan" class="au-grant-cell">
                                    <span class="au-badge au-badge--grant">{{ user.grantedPlan }}</span>
                                    <span v-if="user.grantedUntil" class="au-grant-until">until {{ formatDate(user.grantedUntil) }}</span>
                                    <span v-else class="au-grant-until">forever</span>
                                    <button class="au-btn-sm au-btn-sm--ghost" @click="onRevokeGrant(user)">Revoke</button>
                                </div>
                                <button v-else class="au-btn-sm" @click="openGrantModal(user)">Grant plan</button>
                            </td>
                            <td>
                                <span class="au-badge" :class="user.subscriptionActive ? 'au-badge--active' : 'au-badge--inactive'">
                                    {{ user.subscriptionActive ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td>
                                <div class="au-actions">
                                    <button
                                        class="au-btn-sm au-btn-sm--ghost"
                                        @click="onToggleSub(user)"
                                        :title="user.subscriptionActive ? 'Deactivate subscription' : 'Activate subscription'"
                                    >
                                        {{ user.subscriptionActive ? 'Deactivate' : 'Activate' }}
                                    </button>
                                    <button
                                        v-if="!user.isSuperAdmin"
                                        class="au-btn-sm au-btn-sm--ghost"
                                        @click="onMakeAdmin(user)"
                                    >Make admin</button>
                                    <button
                                        v-else
                                        class="au-btn-sm au-btn-sm--ghost au-btn-sm--danger"
                                        @click="onRemoveAdmin(user)"
                                    >Remove admin</button>
                                    <button
                                        v-if="!hasDailySales(user)"
                                        class="au-btn-sm"
                                        @click="onGrantDailySales(user)"
                                    >Grant Daily Sales</button>
                                    <button
                                        v-else
                                        class="au-btn-sm au-btn-sm--danger"
                                        @click="onRevokeDailySales(user)"
                                    >Revoke Daily Sales</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="au-pagination">
                <button class="au-btn-sm au-btn-sm--ghost" :disabled="page <= 1" @click="loadPage(page - 1)">Prev</button>
                <span>Page {{ page }} of {{ totalPages }}</span>
                <button class="au-btn-sm au-btn-sm--ghost" :disabled="page >= totalPages" @click="loadPage(page + 1)">Next</button>
            </div>
        </template>

        <!-- Grant Modal -->
        <div v-if="grantModal.open" class="au-modal-backdrop" @click.self="grantModal.open = false">
            <div class="au-modal">
                <h2 class="au-modal-title">Grant complimentary plan</h2>
                <p class="au-modal-sub">{{ grantModal.user?.email }}</p>

                <label class="au-label">Plan tier</label>
                <select v-model="grantModal.plan" class="au-select au-select--full">
                    <option value="STARTER">Starter</option>
                    <option value="STANDARD">Standard</option>
                    <option value="GROWTH">Growth</option>
                </select>

                <label class="au-label au-label--mt">Expiry</label>
                <label class="au-forever-toggle">
                    <input type="checkbox" v-model="grantModal.forever" />
                    <span class="au-forever-track"></span>
                    <span class="au-forever-label">No expiry — grant forever</span>
                </label>
                <input
                    v-if="!grantModal.forever"
                    v-model="grantModal.until"
                    type="date"
                    class="au-input au-input--mt"
                />

                <div class="au-modal-footer">
                    <button class="au-btn au-btn--ghost" @click="grantModal.open = false">Cancel</button>
                    <button class="au-btn" :disabled="grantModal.saving" @click="submitGrant">
                        {{ grantModal.saving ? 'Saving...' : 'Grant access' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, reactive } from 'vue';
import { getAdminUsers, updateUserPlan, grantUserPlan, revokeUserGrant, updateSuperAdmin } from '@/api/admin';
import type { AdminUser } from '@/api/admin';
import { grantDailySalesFeature, revokeDailySalesFeature, getUserFeatures } from '@/api/dailySales';
import type { PlanTier } from '@/utils/planAccess';
import { useToast } from '@/composables/useToast';

const { showToast } = useToast();

const loading = ref(false);
const error = ref<string | null>(null);
const users = ref<AdminUser[]>([]);
const userDailySalesFeatures = ref<Set<string>>(new Set());
const page = ref(1);
const total = ref(0);
const pageSize = ref(50);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

const grantModal = reactive({
    open: false,
    user: null as AdminUser | null,
    plan: 'GROWTH' as PlanTier,
    until: '',
    forever: true,
    saving: false,
});

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

const hasDailySales = (user: AdminUser) => userDailySalesFeatures.value.has(user.id);

const loadPage = async (p: number) => {
    loading.value = true;
    error.value = null;
    try {
        const data = await getAdminUsers(p);
        users.value = data.users;
        total.value = data.total;
        pageSize.value = data.pageSize;
        page.value = data.page;

        // Load Daily Sales feature grants for all users in parallel
        const featureResults = await Promise.allSettled(
            data.users.map((u) => getUserFeatures(u.id))
        );
        const granted = new Set<string>();
        featureResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.features.some((f: { feature: string }) => f.feature === 'DAILY_SALES')) {
                granted.add(data.users[i].id);
            }
        });
        userDailySalesFeatures.value = granted;
    } catch (e: any) {
        error.value = e?.body?.error?.message || 'Failed to load users.';
    } finally {
        loading.value = false;
    }
};

const onGrantDailySales = async (user: AdminUser) => {
    try {
        await grantDailySalesFeature(user.id);
        userDailySalesFeatures.value = new Set([...userDailySalesFeatures.value, user.id]);
        showToast(`Daily Sales granted to ${user.email}.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to grant feature.', 'error');
    }
};

const onRevokeDailySales = async (user: AdminUser) => {
    try {
        await revokeDailySalesFeature(user.id);
        const next = new Set(userDailySalesFeatures.value);
        next.delete(user.id);
        userDailySalesFeatures.value = next;
        showToast(`Daily Sales revoked from ${user.email}.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to revoke feature.', 'error');
    }
};

const onPlanChange = async (user: AdminUser, planTier: string) => {
    try {
        const updated = await updateUserPlan(user.id, planTier as PlanTier, user.subscriptionActive);
        Object.assign(user, updated.user);
        showToast(`Plan updated to ${planTier}.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to update plan.', 'error');
    }
};

const onToggleSub = async (user: AdminUser) => {
    try {
        const updated = await updateUserPlan(user.id, user.planTier, !user.subscriptionActive);
        Object.assign(user, updated.user);
        showToast(`Subscription ${user.subscriptionActive ? 'activated' : 'deactivated'}.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to update subscription.', 'error');
    }
};

const openGrantModal = (user: AdminUser) => {
    grantModal.user = user;
    grantModal.plan = 'GROWTH';
    grantModal.until = '';
    grantModal.forever = true;
    grantModal.open = true;
};

const submitGrant = async () => {
    if (!grantModal.user) return;
    grantModal.saving = true;
    try {
        const grantedUntil = grantModal.forever || !grantModal.until
            ? null
            : new Date(grantModal.until).toISOString();
        const updated = await grantUserPlan(grantModal.user.id, grantModal.plan, grantedUntil);
        const idx = users.value.findIndex((u) => u.id === grantModal.user!.id);
        if (idx !== -1) Object.assign(users.value[idx], updated.user);
        showToast(`Granted ${grantModal.plan} to ${grantModal.user.email}.`, 'success');
        grantModal.open = false;
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to grant plan.', 'error');
    } finally {
        grantModal.saving = false;
    }
};

const onRevokeGrant = async (user: AdminUser) => {
    try {
        const updated = await revokeUserGrant(user.id);
        Object.assign(user, updated.user);
        showToast('Grant revoked.', 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed to revoke grant.', 'error');
    }
};

const onMakeAdmin = async (user: AdminUser) => {
    try {
        await updateSuperAdmin(user.id, true);
        user.isSuperAdmin = true;
        showToast(`${user.email} is now a platform admin.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed.', 'error');
    }
};

const onRemoveAdmin = async (user: AdminUser) => {
    try {
        await updateSuperAdmin(user.id, false);
        user.isSuperAdmin = false;
        showToast(`${user.email} is no longer a platform admin.`, 'success');
    } catch (e: any) {
        showToast(e?.body?.error?.message || 'Failed.', 'error');
    }
};

onMounted(() => loadPage(1));
</script>

<style scoped>
.au { max-width: 1100px; }

.au-header { margin-bottom: 1.75rem; }

.au-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.25rem;
    letter-spacing: -0.02em;
}

.au-sub { color: #64748b; font-size: 0.875rem; margin: 0; }

.au-state {
    padding: 1rem 1.25rem;
    background: #f1f5f9;
    border-radius: 10px;
    color: #475569;
    font-size: 0.9rem;
}

.au-state--error { background: #fef2f2; color: #b91c1c; }

.au-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: auto;
}

.au-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.au-table th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
}

.au-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.au-table tr:last-child td { border-bottom: none; }

.au-user-cell { display: flex; flex-direction: column; gap: 0.15rem; }

.au-email { font-weight: 600; color: #0f172a; }

.au-name { font-size: 0.78rem; color: #64748b; }

.au-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    width: fit-content;
}

.au-badge--admin { background: #dbeafe; color: #1d4ed8; }
.au-badge--grant { background: #d1fae5; color: #065f46; }
.au-badge--active { background: #d1fae5; color: #065f46; }
.au-badge--inactive { background: #fee2e2; color: #b91c1c; }

.au-grant-cell { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.au-grant-until { font-size: 0.75rem; color: #64748b; }

.au-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.au-select {
    padding: 0.35rem 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 0.8rem;
    background: #f8fafc;
    color: #0f172a;
    cursor: pointer;
}

.au-select--full { width: 100%; }

.au-btn-sm {
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    background: #0d9488;
    border: none;
    color: white;
    white-space: nowrap;
    transition: background 0.12s;
}

.au-btn-sm:disabled { opacity: 0.5; cursor: default; }

.au-btn-sm:hover:not(:disabled) { background: #0f766e; }

.au-btn-sm--ghost {
    background: transparent;
    border: 1px solid #e2e8f0;
    color: #475569;
}

.au-btn-sm--ghost:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }

.au-btn-sm--danger { border-color: #fecaca; color: #b91c1c; }
.au-btn-sm--danger:hover:not(:disabled) { background: #fef2f2; }

.au-pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #475569;
}

/* Modal */
.au-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.au-modal {
    background: #fff;
    border-radius: 16px;
    padding: 1.75rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
}

.au-modal-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.25rem;
}

.au-modal-sub { font-size: 0.85rem; color: #64748b; margin: 0 0 1.25rem; }

.au-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 0.4rem;
}

.au-label--mt { margin-top: 1rem; }

.au-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #0f172a;
    background: #f8fafc;
    box-sizing: border-box;
}

.au-input--mt { margin-top: 0.5rem; }

.au-forever-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    margin-top: 0.4rem;
    user-select: none;
}

.au-forever-toggle input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.au-forever-track {
    position: relative;
    width: 36px;
    height: 20px;
    background: #e2e8f0;
    border-radius: 999px;
    flex-shrink: 0;
    transition: background 0.15s;
}

.au-forever-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.au-forever-toggle input:checked ~ .au-forever-track {
    background: #0d9488;
}

.au-forever-toggle input:checked ~ .au-forever-track::after {
    transform: translateX(16px);
}

.au-forever-label {
    font-size: 0.875rem;
    color: #0f172a;
    font-weight: 500;
}

.au-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

.au-btn {
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    background: #0d9488;
    border: none;
    color: white;
    transition: background 0.12s;
}

.au-btn:disabled { opacity: 0.5; cursor: default; }
.au-btn:hover:not(:disabled) { background: #0f766e; }

.au-btn--ghost {
    background: transparent;
    border: 1px solid #e2e8f0;
    color: #475569;
}

.au-btn--ghost:hover:not(:disabled) { background: #f1f5f9; }
</style>
