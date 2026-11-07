<template>
    <div class="au">
        <header class="au-header">
            <h1 class="au-title">Users</h1>
            <p class="au-sub">Manage access for all users. Billing is per store — see the Billing page.</p>
        </header>

        <div v-if="loading" class="au-state">Loading users...</div>
        <div v-else-if="error" class="au-state au-state--error">{{ error }}</div>

        <template v-else>
            <div class="au-table-wrap">
                <table class="au-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Stores owned</th>
                            <th>Joined</th>
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
                                <span class="au-count" :class="{ 'au-count--zero': user.ownedStores === 0 }">{{ user.ownedStores }}</span>
                            </td>
                            <td><span class="au-name">{{ formatDate(user.createdAt) }}</span></td>
                            <td>
                                <div class="au-actions">
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

    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { getAdminUsers, updateSuperAdmin } from '@/api/admin';
import type { AdminUser } from '@/api/admin';
import { grantDailySalesFeature, revokeDailySalesFeature, getUserFeatures } from '@/api/dailySales';
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
.au { width: 100%; }

.au-header { margin-bottom: 0.85rem; }

.au-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.15rem;
    letter-spacing: -0.025em;
}

.au-sub { color: #64748b; font-size: 0.82rem; line-height: 1.4; margin: 0; }

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
    padding: 0.55rem 0.75rem;
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
.au-count {
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
}

.au-count--zero { color: #94a3b8; font-weight: 500; }

.au-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

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

</style>
