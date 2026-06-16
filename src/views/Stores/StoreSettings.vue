<template>
    <section class="st-page">
        <div class="st-shell">

            <!-- Page header -->
            <header class="st-header">
                <div class="st-header-left">
                    <span class="st-eyebrow">Store Settings</span>
                    <h1 class="st-title">{{ storeTitle }}</h1>
                    <p class="st-subtitle">{{ currentStoreLabel }}</p>
                </div>
                <div class="st-header-right">
                    <span v-if="currentStore" class="st-role-badge">{{ currentStore.role }}</span>
                    <button class="st-btn-ghost" @click="goToStores">Back to stores</button>
                </div>
            </header>

            <!-- Body: sidebar + content -->
            <div class="st-body">

                <!-- Left sidebar nav -->
                <nav class="st-sidebar">
                    <div class="st-sidebar-group">
                        <span class="st-sidebar-group-label">Store</span>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'profile' }" @click="activeSection = 'profile'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
                            Store profile
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'payment' }" @click="activeSection = 'payment'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                            Payment methods
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'catalog' }" @click="activeSection = 'catalog'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 10h16M4 14h10"/></svg>
                            Catalog defaults
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'team' }" @click="activeSection = 'team'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Team &amp; roles
                            <span v-if="pendingInvites.length" class="st-sidebar-badge">{{ pendingInvites.length }}</span>
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'plan' }" @click="activeSection = 'plan'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                            Plan &amp; subscription
                        </button>
                        <button class="st-sidebar-item" :class="{ 'is-active': activeSection === 'ai' }" @click="activeSection = 'ai'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2v1a3 3 0 0 1 3 3 3 3 0 0 1 0 6 3 3 0 0 1-3 3v1a2 2 0 0 1-4 0v-1a3 3 0 0 1-3-3 3 3 0 0 1 0-6 3 3 0 0 1 3-3V4a2 2 0 0 1 2-2z"/><path d="M9 12h6"/></svg>
                            AI integration
                        </button>
                    </div>

                    <div class="st-sidebar-group">
                        <button class="st-sidebar-item st-sidebar-item--danger" :class="{ 'is-active': activeSection === 'danger' }" @click="activeSection = 'danger'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Danger zone
                        </button>
                    </div>
                </nav>

                <!-- Right content area -->
                <div class="st-content">

                    <div v-if="storeContext.isLoading && !currentStore" class="st-state">Loading store settings…</div>
                    <div v-else-if="!currentStore" class="st-state">Store not found. Return to the store list to select another.</div>

                    <template v-else>

                        <!-- ── Store profile ── -->
                        <section v-if="activeSection === 'profile'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Store profile</h2>
                                <p class="st-section-sub">Basic identity, locale, and inventory defaults for this store.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveSettings">
                                <div class="st-form-grid">
                                    <label class="st-field">
                                        Store name
                                        <input v-model="storeForm.name" type="text" placeholder="Cafe Downtown" :disabled="!canEdit" required />
                                    </label>
                                    <label class="st-field">
                                        Store type
                                        <select v-model="storeForm.storeType" :disabled="!canEdit">
                                            <option value="RETAIL">Retail (point of sale)</option>
                                            <option value="WAREHOUSE">Warehouse (stock holding)</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Timezone
                                        <select v-model="storeForm.timezone" :disabled="!canEdit">
                                            <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Currency
                                        <select v-model="storeForm.currency" :disabled="!canEdit">
                                            <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Low stock threshold
                                        <input v-model.number="storeForm.lowStockThreshold" type="number" min="0" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Tax rate (%)
                                        <input v-model.number="storeForm.defaultTaxRate" type="number" min="0" max="100" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Discount (%)
                                        <input v-model.number="storeForm.defaultDiscount" type="number" min="0" max="100" step="0.01" placeholder="0" :disabled="!canEdit" />
                                    </label>
                                    <label class="st-field">
                                        Cashier sales history limit
                                        <input v-model.number="storeForm.cashierSalesHistoryLimit" type="number" min="1" step="1" placeholder="No limit" :disabled="!canEdit" />
                                        <span class="st-field-hint">Max recent sales shown to cashier role. Leave blank for no limit.</span>
                                    </label>
                                </div>
                                <label class="st-toggle-field">
                                    <input v-model="storeForm.allowNegativeStock" type="checkbox" :disabled="!canEdit" />
                                    <span class="st-toggle-track"></span>
                                    <span class="st-toggle-label">Allow negative stock</span>
                                </label>
                                <p v-if="!canEdit" class="st-permission-note">Your role is {{ currentStore?.role }}. Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="resetForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || !storeForm.name || isSaving">
                                        {{ isSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Payment methods ── -->
                        <section v-if="activeSection === 'payment'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Payment methods</h2>
                                <p class="st-section-sub">Choose which payment methods are available at the POS.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveSettings">
                                <div class="st-pm-grid">
                                    <label v-for="pm in allPaymentMethods" :key="pm.value" class="st-pm-option" :class="{ 'st-pm-option--disabled': !canEdit }">
                                        <input type="checkbox" :value="pm.value" v-model="storeForm.paymentMethods" :disabled="!canEdit" />
                                        {{ pm.label }}
                                    </label>
                                </div>
                                <p v-if="!canEdit" class="st-permission-note">Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="resetForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || isSaving">
                                        {{ isSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Catalog defaults ── -->
                        <section v-if="activeSection === 'catalog'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Catalog defaults</h2>
                                <p class="st-section-sub">Define the unit and category dropdowns used when creating products.</p>
                            </div>
                            <div class="st-form">
                                <div class="st-catalog-box">
                                    <div class="st-catalog-group">
                                        <span class="st-catalog-label">Units</span>
                                        <div class="st-catalog-input">
                                            <input v-model="newUnit" type="text" placeholder="Add unit" :disabled="!canEdit || isCatalogSaving" @keydown.enter.prevent="addUnitOption" />
                                            <button class="st-btn-ghost" type="button" :disabled="!canEdit || isCatalogSaving || !newUnit.trim()" @click="addUnitOption">Add</button>
                                        </div>
                                        <div v-if="storeForm.unitOptions.length" class="st-catalog-tags">
                                            <span v-for="unit in storeForm.unitOptions" :key="unit" class="st-catalog-tag">
                                                {{ unit }}
                                                <button type="button" class="st-catalog-remove" :disabled="!canEdit || isCatalogSaving" @click="removeUnitOption(unit)">&times;</button>
                                            </span>
                                        </div>
                                        <div v-else class="st-catalog-empty">No units configured.</div>
                                    </div>
                                    <div class="st-catalog-group">
                                        <span class="st-catalog-label">Categories</span>
                                        <div class="st-catalog-input">
                                            <input v-model="newCategory" type="text" placeholder="Add category" :disabled="!canEdit || isCatalogSaving" @keydown.enter.prevent="addCategoryOption" />
                                            <button class="st-btn-ghost" type="button" :disabled="!canEdit || isCatalogSaving || !newCategory.trim()" @click="addCategoryOption">Add</button>
                                        </div>
                                        <div v-if="storeForm.categoryOptions.length" class="st-catalog-tags">
                                            <span v-for="category in storeForm.categoryOptions" :key="category" class="st-catalog-tag">
                                                {{ category }}
                                                <button type="button" class="st-catalog-remove" :disabled="!canEdit || isCatalogSaving" @click="removeCategoryOption(category)">&times;</button>
                                            </span>
                                        </div>
                                        <div v-else class="st-catalog-empty">No categories configured.</div>
                                    </div>
                                    <div class="st-catalog-group">
                                        <span class="st-catalog-label">Expense categories</span>
                                        <div class="st-catalog-input">
                                            <input v-model="newExpenseCategory" type="text" placeholder="Add expense category" :disabled="!canEdit || isCatalogSaving" @keydown.enter.prevent="addExpenseCategoryOption" />
                                            <button class="st-btn-ghost" type="button" :disabled="!canEdit || isCatalogSaving || !newExpenseCategory.trim()" @click="addExpenseCategoryOption">Add</button>
                                        </div>
                                        <div v-if="storeForm.expenseCategoryOptions.length" class="st-catalog-tags">
                                            <span v-for="category in storeForm.expenseCategoryOptions" :key="category" class="st-catalog-tag">
                                                {{ category }}
                                                <button type="button" class="st-catalog-remove" :disabled="!canEdit || isCatalogSaving" @click="removeExpenseCategoryOption(category)">&times;</button>
                                            </span>
                                        </div>
                                        <div v-else class="st-catalog-empty">No expense categories configured.</div>
                                    </div>
                                </div>
                                <p v-if="!canEdit" class="st-permission-note">Only owners or admins can edit settings.</p>
                                <span v-else class="st-field-hint">Units and categories are saved automatically.</span>
                            </div>
                        </section>

                        <!-- ── Team & roles ── -->
                        <section v-if="activeSection === 'team'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Team &amp; roles</h2>
                                <p class="st-section-sub">Manage members and invitations for this store.</p>
                            </div>

                            <!-- Tabs -->
                            <div class="st-team-tabs">
                                <button class="st-team-tab" :class="{ 'is-active': activeTeamTab === 'members' }" @click="activeTeamTab = 'members'">
                                    Members
                                    <span class="st-team-tab-count">{{ members.length }}</span>
                                </button>
                                <button class="st-team-tab" :class="{ 'is-active': activeTeamTab === 'invites' }" @click="activeTeamTab = 'invites'">
                                    Invites
                                    <span v-if="pendingInvites.length" class="st-team-tab-count st-team-tab-count--pending">{{ pendingInvites.length }}</span>
                                </button>
                            </div>

                            <!-- Members tab -->
                            <template v-if="activeTeamTab === 'members'">
                                <SkeletonLoader v-if="isTeamLoading" :rows="4" label="Loading team…" />
                                <div v-else-if="!currentStore" class="st-state">Select a store to view members.</div>
                                <div v-else-if="members.length === 0" class="st-team-empty">No members yet.</div>
                                <div v-else class="st-member-list">
                                    <div v-for="member in members" :key="member.id" class="st-member-row">
                                        <div class="st-member-info">
                                            <div class="st-member-name">{{ member.fullName || member.email }}</div>
                                            <div class="st-member-meta">{{ member.email }}</div>
                                        </div>
                                        <div class="st-member-actions">
                                            <select
                                                class="st-role-select"
                                                :value="member.role"
                                                :disabled="!canManageMembers || isOwnerLocked(member) || isUpdatingMember(member.id)"
                                                @change="changeMemberRole(member, $event)"
                                            >
                                                <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
                                            </select>
                                            <button
                                                class="st-btn-ghost st-btn-ghost--danger"
                                                type="button"
                                                :disabled="!canManageMembers || isOwnerLocked(member) || isRemovingMember(member.id) || member.userId === currentUserId"
                                                @click="removeMember(member)"
                                            >
                                                {{ isRemovingMember(member.id) ? '…' : 'Remove' }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <!-- Invites tab -->
                            <template v-if="activeTeamTab === 'invites'">
                                <div class="st-invite-block">
                                    <p class="st-section-sub">Share a generated link to onboard a new teammate.</p>
                                    <form v-if="canManageMembers" class="st-invite-form" @submit.prevent="createInvite">
                                        <label class="st-field">
                                            Email
                                            <input v-model="inviteForm.email" type="email" placeholder="teammate@shop.com" required />
                                        </label>
                                        <label class="st-field">
                                            Role
                                            <select v-model="inviteForm.role">
                                                <option v-for="role in inviteRoleOptions" :key="role" :value="role">{{ role }}</option>
                                            </select>
                                        </label>
                                        <label class="st-field">
                                            Expires (days)
                                            <input v-model.number="inviteForm.expiresInDays" type="number" min="1" max="30" />
                                        </label>
                                        <div class="st-invite-form-action">
                                            <button class="st-btn-primary" type="submit" :disabled="isInviting || !inviteForm.email">
                                                {{ isInviting ? 'Creating…' : 'Create invite' }}
                                            </button>
                                        </div>
                                    </form>
                                    <p v-else class="st-permission-note">Only owners or admins can invite new members.</p>

                                    <div v-if="recentInviteLink" class="st-invite-link-card">
                                        <span class="st-invite-link-label">Invite link</span>
                                        <div class="st-invite-link-row">
                                            <input type="text" readonly :value="recentInviteLink" />
                                            <button class="st-btn-ghost" type="button" @click="copyInviteLink">Copy</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="st-section-sub-header">
                                    <span>Pending invites</span>
                                    <span v-if="pendingInvites.length" class="st-role-badge">{{ pendingInvites.length }} pending</span>
                                </div>
                                <SkeletonLoader v-if="isTeamLoading" :rows="3" label="Loading invites…" />
                                <div v-else-if="pendingInvites.length === 0" class="st-team-empty">No pending invites.</div>
                                <div v-else class="st-invite-list">
                                    <div v-for="invite in pendingInvites" :key="invite.id" class="st-invite-row">
                                        <div>
                                            <div class="st-member-name">{{ invite.email }}</div>
                                            <div class="st-member-meta">
                                                {{ invite.role }}
                                                <span v-if="invite.status === 'EXPIRED'"> &ndash; expired {{ formatInviteDate(invite.expiresAt) }}</span>
                                                <span v-else> &ndash; expires {{ formatInviteDate(invite.expiresAt) }}</span>
                                            </div>
                                        </div>
                                        <div class="st-invite-actions">
                                            <span class="st-invite-status" :class="inviteStatusClass(invite.status)">{{ invite.status }}</span>
                                            <button
                                                v-if="canManageMembers && invite.status === 'PENDING'"
                                                class="st-btn-ghost st-btn-ghost--danger"
                                                type="button"
                                                :disabled="isRevokingInvite(invite.id)"
                                                @click="revokeInvite(invite)"
                                            >
                                                {{ isRevokingInvite(invite.id) ? '…' : 'Revoke' }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </section>

                        <!-- ── Plan & subscription ── -->
                        <section v-if="activeSection === 'plan'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">Plan &amp; subscription</h2>
                                <p class="st-section-sub">Compare plans and upgrade anytime. Plan is account-wide and applies to all your stores.</p>
                            </div>

                            <div v-if="userContext.isLoading && !userContext.hasLoaded" class="st-state">Loading plan details…</div>

                            <template v-else>
                                <!-- Summary bar -->
                                <div class="st-plan-summary">
                                    <div class="st-plan-summary-item">
                                        <span class="st-plan-summary-label">Current plan</span>
                                        <span class="st-plan-summary-value">{{ planConfig.label }}</span>
                                    </div>
                                    <div class="st-plan-summary-divider"></div>
                                    <div class="st-plan-summary-item">
                                        <span class="st-plan-summary-label">Status</span>
                                        <span class="st-plan-summary-value" :class="userContext.subscriptionActive ? 'st-plan-active' : 'st-plan-inactive'">
                                            {{ userContext.subscriptionActive ? 'Active' : 'Inactive' }}
                                        </span>
                                    </div>
                                    <div class="st-plan-summary-divider"></div>
                                    <div class="st-plan-summary-item">
                                        <span class="st-plan-summary-label">Stores</span>
                                        <span class="st-plan-summary-value">{{ storeUsage }} / {{ planConfig.maxStores }}</span>
                                    </div>
                                    <div class="st-plan-summary-divider"></div>
                                    <div class="st-plan-summary-item">
                                        <span class="st-plan-summary-label">Members per store</span>
                                        <span class="st-plan-summary-value">Up to {{ planConfig.maxUsersPerStore }}</span>
                                    </div>
                                </div>

                                <!-- Plan cards -->
                                <div class="st-plan-header">
                                    <h3 class="st-plan-heading">Choose your plan</h3>
                                    <p class="st-section-sub">All plans include POS, inventory, products, and sales reports.</p>
                                </div>

                                <div class="st-plan-grid">
                                    <div
                                        v-for="plan in allPlans"
                                        :key="plan.tier"
                                        class="st-plan-card"
                                        :class="{
                                            'st-plan-card--current': plan.tier === userContext.planTier,
                                            'st-plan-card--recommended': plan.tier === recommendedTier,
                                        }"
                                    >
                                        <div class="st-plan-card-top">
                                            <div class="st-plan-name-row">
                                                <h4 class="st-plan-name">{{ plan.label }}</h4>
                                                <span v-if="plan.tier === userContext.planTier" class="st-plan-pill st-plan-pill--current">Current</span>
                                                <span v-else-if="plan.tier === recommendedTier" class="st-plan-pill st-plan-pill--recommended">Recommended</span>
                                            </div>
                                            <p class="st-plan-tagline">{{ planTaglines[plan.tier] }}</p>
                                            <p class="st-plan-price">{{ planPrices[plan.tier] }}</p>
                                        </div>
                                        <div class="st-plan-limits">
                                            <div class="st-plan-limit">
                                                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
                                                {{ plan.maxStores }} {{ plan.maxStores === 1 ? 'store' : 'stores' }}
                                            </div>
                                            <div class="st-plan-limit">
                                                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                                                {{ plan.maxUsersPerStore }} members per store
                                            </div>
                                        </div>
                                        <div class="st-plan-features">
                                            <div class="st-plan-feature-group-label">Always included</div>
                                            <div v-for="f in coreFeatures" :key="f.key" class="st-plan-feature-row">
                                                <svg class="st-plan-check st-plan-check--yes" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                                {{ f.label }}
                                            </div>
                                            <div class="st-plan-feature-group-label" style="margin-top:0.5rem">Advanced features</div>
                                            <div v-for="f in advancedFeatures" :key="f.key" class="st-plan-feature-row" :class="{ 'st-plan-feature-row--locked': !plan.features[f.key] }">
                                                <svg v-if="plan.features[f.key]" class="st-plan-check st-plan-check--yes" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                                <svg v-else class="st-plan-check st-plan-check--no" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                                                {{ f.label }}
                                            </div>
                                        </div>
                                        <div class="st-plan-card-footer">
                                            <button v-if="plan.tier === userContext.planTier" class="st-plan-btn st-plan-btn--current" disabled>Current plan</button>
                                            <button v-else-if="isDowngrade(plan.tier)" class="st-plan-btn st-plan-btn--ghost" :disabled="isUpgrading" @click="handlePlanAction(plan)">
                                                {{ isUpgrading ? 'Updating…' : 'Downgrade' }}
                                            </button>
                                            <button v-else class="st-plan-btn st-plan-btn--upgrade" :disabled="isUpgrading" @click="handlePlanAction(plan)">
                                                {{ isUpgrading ? 'Updating…' : `Upgrade to ${plan.label}` }}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <p class="st-plan-note">
                                    To change your plan, contact us at
                                    <a href="mailto:support@arshii.app" class="st-plan-link">support@arshii.app</a>
                                    and we'll get you sorted within 24 hours.
                                </p>
                            </template>
                        </section>

                        <!-- ── AI integration ── -->
                        <section v-if="activeSection === 'ai'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title">AI integration</h2>
                                <p class="st-section-sub">Connect an AI provider for this store. Your API key is encrypted and never shown again after saving.</p>
                            </div>
                            <form class="st-form" @submit.prevent="saveAiSettings">
                                <div class="st-form-grid">
                                    <label class="st-field">
                                        Provider
                                        <select v-model="aiForm.aiProvider" :disabled="!canEdit" @change="onProviderChange">
                                            <option :value="null">None (disabled)</option>
                                            <option value="OPENAI">OpenAI</option>
                                            <option value="ANTHROPIC">Anthropic (Claude)</option>
                                        </select>
                                    </label>
                                    <label class="st-field">
                                        Model
                                        <input
                                            v-if="customModelMode || !showModelDropdown"
                                            v-model="aiForm.aiModel"
                                            type="text"
                                            :placeholder="aiModelPlaceholder"
                                            :disabled="!canEdit || !aiForm.aiProvider"
                                        />
                                        <select v-else :value="aiForm.aiModel" :disabled="!canEdit || !aiForm.aiProvider" @change="onModelSelect">
                                            <option value="">Provider default</option>
                                            <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
                                            <option value="__custom__">Other (enter manually)…</option>
                                        </select>
                                        <span class="st-field-hint">
                                            <template v-if="!aiForm.aiProvider">Select a provider first.</template>
                                            <template v-else-if="customModelMode">
                                                Enter a model ID.
                                                <button v-if="canEdit" class="st-link-btn st-link-btn--muted" type="button" @click="customModelMode = false">Choose from list</button>
                                            </template>
                                            <template v-else-if="isLoadingModels">Loading available models…</template>
                                            <template v-else-if="liveModelsApply">
                                                Live list from your provider.
                                                <button v-if="canEdit" class="st-link-btn st-link-btn--muted" type="button" @click="loadAiModels">Refresh</button>
                                            </template>
                                            <template v-else-if="hasCuratedModels">Common models. Save an API key to load the live list for your account.</template>
                                            <template v-else>Optional. Save an API key to load the live model list.</template>
                                        </span>
                                    </label>
                                </div>
                                <label class="st-field">
                                    API key
                                    <input
                                        v-model="aiForm.aiApiKey"
                                        type="password"
                                        autocomplete="new-password"
                                        spellcheck="false"
                                        :placeholder="currentStore?.aiApiKeySet ? 'Enter a new key to replace the saved one' : 'Paste your API key'"
                                        :disabled="!canEdit || !aiForm.aiProvider"
                                    />
                                    <span v-if="currentStore?.aiApiKeySet" class="st-field-hint">
                                        A key is saved (••••{{ currentStore.aiApiKeyLast4 }}). Leave blank to keep it.
                                        <button v-if="canEdit" class="st-link-btn" type="button" @click="removeAiKey">Remove key</button>
                                    </span>
                                    <span v-else class="st-field-hint">No key saved yet.</span>
                                </label>
                                <div v-if="currentStore?.aiApiKeySet" class="st-ai-test">
                                    <button class="st-btn-ghost" type="button" :disabled="isTesting || isAiSaving" @click="testAiConnection">
                                        {{ isTesting ? 'Testing…' : 'Test connection' }}
                                    </button>
                                    <span v-if="aiTestResult?.ok" class="st-ai-test-result st-ai-test-result--ok">
                                        ✓ Connected{{ aiTestResult.model ? ` to ${aiTestResult.model}` : '' }} ({{ aiTestResult.latencyMs }} ms)
                                    </span>
                                    <span v-else-if="aiTestResult" class="st-ai-test-result st-ai-test-result--fail">
                                        ✕ {{ aiTestResult.message }}
                                    </span>
                                    <span v-else class="st-field-hint">Validates the saved key with the provider. No tokens are used.</span>
                                </div>
                                <p v-if="!canEdit" class="st-permission-note">Your role is {{ currentStore?.role }}. Only owners or admins can edit settings.</p>
                                <div class="st-form-footer">
                                    <button class="st-btn-ghost" type="button" @click="syncAiForm">Reset changes</button>
                                    <button class="st-btn-primary" type="submit" :disabled="!canEdit || isAiSaving">
                                        {{ isAiSaving ? 'Saving…' : 'Save changes' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <!-- ── Danger zone ── -->
                        <section v-if="activeSection === 'danger'" class="st-section">
                            <div class="st-section-header">
                                <h2 class="st-section-title st-section-title--danger">Danger zone</h2>
                                <p class="st-section-sub">Irreversible actions for this store. Proceed with caution.</p>
                            </div>
                            <div class="st-danger-card">
                                <div>
                                    <p class="st-danger-card-title">Archive store</p>
                                    <p class="st-danger-card-sub">Hides this store from all members and disables new activity. Data is retained but cannot be reversed without database access.</p>
                                </div>
                                <button class="st-btn-danger" type="button" :disabled="!canArchive || isArchiving" @click="archiveStore">
                                    {{ isArchiving ? 'Archiving…' : 'Archive store' }}
                                </button>
                            </div>
                            <p v-if="!canArchive" class="st-permission-note">Only owners can archive a store.</p>
                        </section>

                    </template>
                </div>
            </div>

        </div>

        <!-- ── Archive store: type-to-confirm modal ── -->
        <div v-if="archiveModal.show" class="st-archive-overlay" @click.self="closeArchiveModal">
            <div class="st-archive-modal" role="dialog" aria-modal="true">
                <h3 class="st-archive-title">Archive store</h3>
                <p class="st-archive-text">
                    This hides <strong>{{ currentStore?.name }}</strong> from all members and disables new
                    activity. Data is retained but this cannot be reversed without database access.
                </p>
                <p class="st-archive-label">
                    To confirm, type the store name
                    <span class="st-archive-name-text">{{ currentStore?.name }}</span>
                    <button
                        class="st-archive-copy"
                        type="button"
                        title="Copy store name"
                        aria-label="Copy store name"
                        @click="copyStoreName"
                    >
                        <mdicon name="content-copy" size="15" />
                    </button>
                    below:
                </p>
                <input
                    v-model="archiveModal.confirmName"
                    type="text"
                    class="st-archive-input"
                    :placeholder="currentStore?.name"
                    autocomplete="off"
                    @keyup.enter="archiveNameMatches && confirmArchiveStore()"
                />
                <div class="st-archive-actions">
                    <button class="st-btn-ghost" type="button" :disabled="isArchiving" @click="closeArchiveModal">
                        Cancel
                    </button>
                    <button
                        class="st-btn-danger"
                        type="button"
                        :disabled="!archiveNameMatches || isArchiving"
                        @click="confirmArchiveStore"
                    >
                        {{ isArchiving ? 'Archiving…' : 'Archive store' }}
                    </button>
                </div>
            </div>
        </div>

        <ConfirmModal
            :show="confirmModal.show"
            :title="confirmModal.title"
            :message="confirmModal.message"
            :confirm-text="confirmModal.confirmText"
            cancel-text="Cancel"
            variant="danger"
            :loading="confirmModal.loading"
            @confirm="onConfirmModalConfirm"
            @cancel="onConfirmModalCancel"
            @update:show="confirmModal.show = $event"
        />
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteStore, updateStore, updateStoreAiSettings, testStoreAiConnection, listStoreAiModels, type AiProvider, type AiConnectionTestResult } from '@/api/stores';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import { useUserContextStore } from '@/stores/userContext';
import { DEFAULT_CATEGORY_OPTIONS, DEFAULT_EXPENSE_CATEGORY_OPTIONS, DEFAULT_UNIT_OPTIONS } from '@/utils/catalogDefaults';
import { getPlanConfig, planTierOrder, planConfigs, type PlanTier, type PlanFeature } from '@/utils/planAccess';
import { getMe } from '@/api/auth';
import ConfirmModal from '@/components/ConfirmModal.vue';
import {
    createStoreInvite,
    listStoreInvites,
    listStoreMembers,
    removeStoreMember,
    revokeStoreInvite,
    updateStoreMemberRole,
    type StoreInvite,
    type StoreMember,
} from '@/api/storeMembers';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

const router = useRouter();
const route = useRoute();
const storeContext = useStoreContextStore();
const userContext = useUserContextStore();
const { showToast } = useToast();

const storeForm = reactive({
    name: '',
    storeType: 'RETAIL' as 'RETAIL' | 'WAREHOUSE',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    allowNegativeStock: false,
    lowStockThreshold: 0,
    defaultTaxRate: 0,
    defaultDiscount: 0,
    cashierSalesHistoryLimit: null as number | null,
    paymentMethods: ['CASH', 'CARD', 'TRANSFER', 'GCASH', 'MAYA', 'OTHER'] as string[],
    unitOptions: [...DEFAULT_UNIT_OPTIONS],
    categoryOptions: [...DEFAULT_CATEGORY_OPTIONS],
    expenseCategoryOptions: [...DEFAULT_EXPENSE_CATEGORY_OPTIONS],
});

const baseTimezoneOptions = [
    'Asia/Manila',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'UTC',
];

const baseCurrencyOptions = [
    'PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD',
    'SGD', 'HKD', 'JPY', 'CNY', 'KRW', 'THB', 'IDR', 'MYR', 'VND',
];

const allPaymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'GCASH', label: 'GCash' },
    { value: 'MAYA', label: 'Maya' },
    { value: 'TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

const activeSection = ref<'profile' | 'payment' | 'catalog' | 'team' | 'plan' | 'ai' | 'danger'>('profile');

const isSaving = ref(false);
const isCatalogSaving = ref(false);
const isAiSaving = ref(false);

// AI integration form. The API key is write-only: it is never populated from the
// server (only a "key set" flag + last 4 are returned), so this field stays blank
// unless the user is entering a new key.
const aiForm = reactive({
    aiProvider: null as AiProvider | null,
    aiModel: '' as string,
    aiApiKey: '' as string,
});
const isTesting = ref(false);
const aiTestResult = ref<AiConnectionTestResult | null>(null);
const aiModels = ref<string[]>([]);
const isLoadingModels = ref(false);

const aiModelPlaceholder = computed(() => {
    if (aiForm.aiProvider === 'ANTHROPIC') return 'e.g. claude-opus-4-8';
    if (aiForm.aiProvider === 'OPENAI') return 'e.g. gpt-4o';
    return 'Select a provider first';
});

// Curated fallback so the model field is a dropdown as soon as a provider is
// picked — before any key is saved. The live list (below) supersedes this once a
// key exists. Only Anthropic has a curated set (current, stable IDs); OpenAI is
// live-only — its lineup changes too often to hardcode, so it falls back to a
// free-text input until a key is saved and the live list loads.
const CURATED_MODELS: Partial<Record<AiProvider, string[]>> = {
    ANTHROPIC: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-7', 'claude-opus-4-6'],
};

const customModelMode = ref(false);

// True when the live list (which reflects the SAVED provider/key) applies to the
// provider currently selected in the form.
const liveModelsApply = computed(
    () => aiModels.value.length > 0 && aiForm.aiProvider === (currentStore.value?.aiProvider ?? null)
);

const hasCuratedModels = computed(() => !!(aiForm.aiProvider && CURATED_MODELS[aiForm.aiProvider]?.length));

// Show a dropdown when we have models to offer (live or curated); otherwise fall
// back to free-text (e.g. OpenAI before a key is saved).
const showModelDropdown = computed(() => liveModelsApply.value || hasCuratedModels.value);

const modelOptions = computed(() => {
    if (!aiForm.aiProvider) return [];
    const base = liveModelsApply.value ? aiModels.value : (CURATED_MODELS[aiForm.aiProvider] ?? []);
    const options = [...base];
    // Keep a saved/custom model selectable even if it isn't in the list.
    if (aiForm.aiModel && !options.includes(aiForm.aiModel)) options.unshift(aiForm.aiModel);
    return options;
});
const isArchiving = ref(false);
const newUnit = ref('');
const newCategory = ref('');
const newExpenseCategory = ref('');

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
const canArchive = computed(() => currentStore.value?.role === 'OWNER');

const timezoneOptions = computed(() => {
    if (storeForm.timezone && !baseTimezoneOptions.includes(storeForm.timezone)) {
        return [storeForm.timezone, ...baseTimezoneOptions];
    }
    return baseTimezoneOptions;
});
const currencyOptions = computed(() => {
    if (storeForm.currency && !baseCurrencyOptions.includes(storeForm.currency)) {
        return [storeForm.currency, ...baseCurrencyOptions];
    }
    return baseCurrencyOptions;
});

const storeTitle = computed(() => currentStore.value?.name || 'Store settings');
const storeDescriptionName = computed(() => currentStore.value?.name || 'this store');
const currentStoreLabel = computed(() => {
    if (!currentStore.value) return 'Select a store to get started.';
    return `${currentStore.value.name} — ${currentStore.value.currency}`;
});

const normalizeOptions = (options: string[], fallback: string[]) => {
    const normalized: string[] = [];
    options.forEach((option) => {
        const value = option.trim();
        if (!value) return;
        if (normalized.some((entry) => entry.toLowerCase() === value.toLowerCase())) return;
        normalized.push(value);
    });
    return normalized.length > 0 ? normalized : [...fallback];
};

const resetForm = () => {
    if (!currentStore.value) return;
    storeForm.name = currentStore.value.name;
    storeForm.storeType = currentStore.value.storeType ?? 'RETAIL';
    storeForm.timezone = currentStore.value.timezone;
    storeForm.currency = currentStore.value.currency;
    storeForm.allowNegativeStock = currentStore.value.allowNegativeStock;
    storeForm.lowStockThreshold = currentStore.value.lowStockThreshold ?? 0;
    storeForm.defaultTaxRate = currentStore.value.defaultTaxRate ?? 0;
    storeForm.defaultDiscount = currentStore.value.defaultDiscount ?? 0;
    storeForm.cashierSalesHistoryLimit = currentStore.value.cashierSalesHistoryLimit ?? null;
    storeForm.paymentMethods = currentStore.value.paymentMethods?.length
        ? [...currentStore.value.paymentMethods]
        : ['CASH', 'CARD', 'TRANSFER', 'GCASH', 'MAYA', 'OTHER'];
    storeForm.unitOptions = normalizeOptions(currentStore.value.unitOptions ?? [], DEFAULT_UNIT_OPTIONS);
    storeForm.categoryOptions = normalizeOptions(currentStore.value.categoryOptions ?? [], DEFAULT_CATEGORY_OPTIONS);
    storeForm.expenseCategoryOptions = normalizeOptions(currentStore.value.expenseCategoryOptions ?? [], DEFAULT_EXPENSE_CATEGORY_OPTIONS);
    newUnit.value = '';
    newCategory.value = '';
    newExpenseCategory.value = '';
    syncAiForm();
};

// Reloads the AI form from the current store. The API key field is always cleared
// since the server never returns the stored key.
const syncAiForm = () => {
    aiForm.aiProvider = currentStore.value?.aiProvider ?? null;
    aiForm.aiModel = currentStore.value?.aiModel ?? '';
    aiForm.aiApiKey = '';
    aiTestResult.value = null;
    customModelMode.value = false;
};

// User picked an option in the model dropdown. The sentinel "__custom__" switches
// to a free-text input for entering an arbitrary model ID.
const onModelSelect = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '__custom__') {
        customModelMode.value = true;
        aiForm.aiModel = '';
    } else {
        aiForm.aiModel = value;
    }
};

// Switching provider invalidates the previously selected model and any test result.
const onProviderChange = () => {
    aiForm.aiModel = '';
    customModelMode.value = false;
    aiTestResult.value = null;
};

const saveAiSettings = async () => {
    if (!currentStore.value || !canEdit.value) return;
    isAiSaving.value = true;
    try {
        const payload: { aiProvider: AiProvider | null; aiModel: string | null; aiApiKey?: string } = {
            aiProvider: aiForm.aiProvider,
            aiModel: aiForm.aiModel.trim() || null,
        };
        // Only send the key when the user actually typed one, so saving other
        // changes never wipes the stored key.
        if (aiForm.aiApiKey.trim()) {
            payload.aiApiKey = aiForm.aiApiKey.trim();
        }
        await updateStoreAiSettings(currentStore.value.id, payload);
        await storeContext.fetchStores();
        aiForm.aiApiKey = '';
        showToast('AI settings updated.', 'success');
        await loadAiModels();
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update AI settings.';
        showToast(message, 'error');
    } finally {
        isAiSaving.value = false;
    }
};

const removeAiKey = async () => {
    if (!currentStore.value || !canEdit.value) return;
    isAiSaving.value = true;
    try {
        await updateStoreAiSettings(currentStore.value.id, { aiApiKey: null });
        await storeContext.fetchStores();
        aiForm.aiApiKey = '';
        aiTestResult.value = null;
        aiModels.value = [];
        showToast('API key removed.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to remove API key.';
        showToast(message, 'error');
    } finally {
        isAiSaving.value = false;
    }
};

const testAiConnection = async () => {
    if (!currentStore.value) return;
    isTesting.value = true;
    aiTestResult.value = null;
    try {
        aiTestResult.value = await testStoreAiConnection(currentStore.value.id);
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to test the connection.';
        showToast(message, 'error');
    } finally {
        isTesting.value = false;
    }
};

// Fetches the live model list for the saved provider/key. Silent on failure —
// the UI just falls back to the free-text model input.
const loadAiModels = async () => {
    const store = currentStore.value;
    if (!store?.aiApiKeySet || !store.aiProvider) {
        aiModels.value = [];
        return;
    }
    isLoadingModels.value = true;
    try {
        const result = await listStoreAiModels(store.id);
        aiModels.value = result.ok ? result.models : [];
    } catch {
        aiModels.value = [];
    } finally {
        isLoadingModels.value = false;
    }
};

// Catalog defaults persist immediately on add/remove (no separate save step).
const persistCatalog = async (
    previousUnits: string[],
    previousCategories: string[],
    previousExpenseCategories: string[] = [...storeForm.expenseCategoryOptions]
) => {
    if (!currentStore.value) return false;
    isCatalogSaving.value = true;
    try {
        await updateStore(currentStore.value.id, {
            unitOptions: normalizeOptions(storeForm.unitOptions, DEFAULT_UNIT_OPTIONS),
            categoryOptions: normalizeOptions(storeForm.categoryOptions, DEFAULT_CATEGORY_OPTIONS),
            expenseCategoryOptions: normalizeOptions(storeForm.expenseCategoryOptions, DEFAULT_EXPENSE_CATEGORY_OPTIONS),
        });
        await storeContext.fetchStores();
        return true;
    } catch (error: any) {
        // Revert the optimistic change so the UI matches the saved state.
        storeForm.unitOptions = previousUnits;
        storeForm.categoryOptions = previousCategories;
        storeForm.expenseCategoryOptions = previousExpenseCategories;
        const message = error?.body?.error?.message || 'Unable to update catalog defaults.';
        showToast(message, 'error');
        return false;
    } finally {
        isCatalogSaving.value = false;
    }
};

const addUnitOption = async () => {
    if (!canEdit.value || isCatalogSaving.value) return;
    const value = newUnit.value.trim();
    if (!value) return;
    if (storeForm.unitOptions.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        showToast('Unit already added.', 'info');
        newUnit.value = '';
        return;
    }
    const previousUnits = [...storeForm.unitOptions];
    const previousCategories = [...storeForm.categoryOptions];
    storeForm.unitOptions = normalizeOptions([...storeForm.unitOptions, value], DEFAULT_UNIT_OPTIONS);
    newUnit.value = '';
    if (await persistCatalog(previousUnits, previousCategories)) {
        showToast('Unit added.', 'success');
    }
};

const removeUnitOption = async (unit: string) => {
    if (!canEdit.value || isCatalogSaving.value) return;
    if (storeForm.unitOptions.length <= 1) {
        showToast('Keep at least one unit.', 'info');
        return;
    }
    const previousUnits = [...storeForm.unitOptions];
    const previousCategories = [...storeForm.categoryOptions];
    storeForm.unitOptions = storeForm.unitOptions.filter((entry) => entry !== unit);
    if (await persistCatalog(previousUnits, previousCategories)) {
        showToast('Unit removed.', 'success');
    }
};

const addCategoryOption = async () => {
    if (!canEdit.value || isCatalogSaving.value) return;
    const value = newCategory.value.trim();
    if (!value) return;
    if (storeForm.categoryOptions.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        showToast('Category already added.', 'info');
        newCategory.value = '';
        return;
    }
    const previousUnits = [...storeForm.unitOptions];
    const previousCategories = [...storeForm.categoryOptions];
    storeForm.categoryOptions = normalizeOptions([...storeForm.categoryOptions, value], DEFAULT_CATEGORY_OPTIONS);
    newCategory.value = '';
    if (await persistCatalog(previousUnits, previousCategories)) {
        showToast('Category added.', 'success');
    }
};

const removeCategoryOption = async (category: string) => {
    if (!canEdit.value || isCatalogSaving.value) return;
    if (storeForm.categoryOptions.length <= 1) {
        showToast('Keep at least one category.', 'info');
        return;
    }
    const previousUnits = [...storeForm.unitOptions];
    const previousCategories = [...storeForm.categoryOptions];
    storeForm.categoryOptions = storeForm.categoryOptions.filter((entry) => entry !== category);
    if (await persistCatalog(previousUnits, previousCategories)) {
        showToast('Category removed.', 'success');
    }
};

const addExpenseCategoryOption = async () => {
    if (!canEdit.value || isCatalogSaving.value) return;
    const value = newExpenseCategory.value.trim();
    if (!value) return;
    if (storeForm.expenseCategoryOptions.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
        showToast('Expense category already added.', 'info');
        newExpenseCategory.value = '';
        return;
    }
    const previous = [...storeForm.expenseCategoryOptions];
    storeForm.expenseCategoryOptions = normalizeOptions([...storeForm.expenseCategoryOptions, value], DEFAULT_EXPENSE_CATEGORY_OPTIONS);
    newExpenseCategory.value = '';
    if (await persistCatalog([...storeForm.unitOptions], [...storeForm.categoryOptions], previous)) {
        showToast('Expense category added.', 'success');
    }
};

const removeExpenseCategoryOption = async (category: string) => {
    if (!canEdit.value || isCatalogSaving.value) return;
    if (storeForm.expenseCategoryOptions.length <= 1) {
        showToast('Keep at least one expense category.', 'info');
        return;
    }
    const previous = [...storeForm.expenseCategoryOptions];
    storeForm.expenseCategoryOptions = storeForm.expenseCategoryOptions.filter((entry) => entry !== category);
    if (await persistCatalog([...storeForm.unitOptions], [...storeForm.categoryOptions], previous)) {
        showToast('Expense category removed.', 'success');
    }
};

const saveSettings = async () => {
    if (!currentStore.value || !canEdit.value) return;
    isSaving.value = true;
    try {
        const payload = {
            ...storeForm,
            unitOptions: normalizeOptions(storeForm.unitOptions, DEFAULT_UNIT_OPTIONS),
            categoryOptions: normalizeOptions(storeForm.categoryOptions, DEFAULT_CATEGORY_OPTIONS),
            expenseCategoryOptions: normalizeOptions(storeForm.expenseCategoryOptions, DEFAULT_EXPENSE_CATEGORY_OPTIONS),
        };
        await updateStore(currentStore.value.id, payload);
        await storeContext.fetchStores();
        showToast('Store settings updated.', 'success');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to update store settings.';
        showToast(message, 'error');
    } finally {
        isSaving.value = false;
    }
};

// ── Archive store (type-to-confirm) ──────────────────────────
const archiveModal = reactive({ show: false, confirmName: '' });

const archiveNameMatches = computed(
    () => archiveModal.confirmName.trim() === (currentStore.value?.name ?? '').trim()
);

const archiveStore = () => {
    if (!currentStore.value || !canArchive.value) return;
    archiveModal.confirmName = '';
    archiveModal.show = true;
};

const closeArchiveModal = () => {
    if (isArchiving.value) return;
    archiveModal.show = false;
};

const copyStoreName = async () => {
    if (!currentStore.value) return;
    try {
        await navigator.clipboard.writeText(currentStore.value.name);
        showToast('Store name copied.', 'success');
    } catch {
        showToast('Unable to copy store name.', 'error');
    }
};

const confirmArchiveStore = async () => {
    if (!currentStore.value || !canArchive.value || !archiveNameMatches.value) return;
    isArchiving.value = true;
    try {
        await deleteStore(currentStore.value.id);
        showToast('Store archived.', 'success');
        archiveModal.show = false;
        await storeContext.fetchStores();
        if (storeContext.stores.length > 0) {
            storeContext.setCurrentStore(storeContext.stores[0].id);
        } else {
            storeContext.currentStoreId = null;
            localStorage.removeItem('currentStoreId');
        }
        router.push('/stores');
    } catch (error: any) {
        const message = error?.body?.error?.message || 'Unable to archive store.';
        showToast(message, 'error');
    } finally {
        isArchiving.value = false;
    }
};

const goToStores = () => router.push('/stores');

// ── Team & Roles ─────────────────────────────────────────────
const activeTeamTab = ref<'members' | 'invites'>('members');
const isTeamLoaded = ref(false);
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
const inviteForm = reactive({ email: '', role: 'CASHIER', expiresInDays: 7 });

const canManageMembers = computed(() => canEdit.value);
const canManageOwners = computed(() => currentStore.value?.role === 'OWNER');
const inviteRoleOptions = computed(() =>
    canManageOwners.value ? roleOptions : roleOptions.filter((r) => r !== 'OWNER')
);
const pendingInvites = computed(() => invites.value.filter((i) => i.status !== 'ACCEPTED'));
const isOwnerLocked = (member: StoreMember) => member.role === 'OWNER' && !canManageOwners.value;
const isUpdatingMember = (id: string) => updatingMemberId.value === id;
const isRemovingMember = (id: string) => removingMemberId.value === id;
const isRevokingInvite = (id: string) => revokingInviteId.value === id;

const loadTeam = async () => {
    if (!currentStore.value) return;
    isTeamLoading.value = true;
    try {
        const [memberData, inviteData] = await Promise.all([
            listStoreMembers(currentStore.value.id),
            listStoreInvites(currentStore.value.id),
        ]);
        members.value = memberData.members;
        invites.value = inviteData.invites;
        isTeamLoaded.value = true;
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to load team.', 'error');
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
        (event.target as HTMLSelectElement).value = previousRole;
        showToast(error?.body?.error?.message || 'Unable to update role.', 'error');
    } finally {
        updatingMemberId.value = null;
    }
};

// Shared confirmation modal — drives both member removal and invite revocation.
const confirmModal = reactive<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    loading: boolean;
    onConfirm: (() => Promise<void>) | null;
}>({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    loading: false,
    onConfirm: null,
});

const onConfirmModalConfirm = async () => {
    if (!confirmModal.onConfirm) return;
    confirmModal.loading = true;
    try {
        await confirmModal.onConfirm();
        confirmModal.show = false;
    } finally {
        confirmModal.loading = false;
    }
};

const onConfirmModalCancel = () => {
    if (confirmModal.loading) return;
    confirmModal.show = false;
};

const removeMember = (member: StoreMember) => {
    if (!currentStore.value || !canManageMembers.value) return;
    if (member.userId === currentUserId.value) {
        showToast('You cannot remove yourself from the store.', 'error');
        return;
    }
    confirmModal.title = 'Remove member';
    confirmModal.message = `Remove ${member.email} from this store? They will immediately lose access.`;
    confirmModal.confirmText = 'Remove';
    confirmModal.onConfirm = () => performRemoveMember(member);
    confirmModal.show = true;
};

const performRemoveMember = async (member: StoreMember) => {
    if (!currentStore.value) return;
    removingMemberId.value = member.id;
    try {
        await removeStoreMember(currentStore.value.id, member.id);
        members.value = members.value.filter((e) => e.id !== member.id);
        showToast('Member removed.', 'success');
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to remove member.', 'error');
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
        showToast(data.emailSent === false ? 'Invite created. Share the link below.' : 'Invite created.', 'success');
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to create invite.', 'error');
    } finally {
        isInviting.value = false;
    }
};

const revokeInvite = (invite: StoreInvite) => {
    if (!currentStore.value || !canManageMembers.value) return;
    confirmModal.title = 'Revoke invite';
    confirmModal.message = `Revoke the invite for ${invite.email}? The invite link will stop working.`;
    confirmModal.confirmText = 'Revoke';
    confirmModal.onConfirm = () => performRevokeInvite(invite);
    confirmModal.show = true;
};

const performRevokeInvite = async (invite: StoreInvite) => {
    if (!currentStore.value) return;
    revokingInviteId.value = invite.id;
    try {
        await revokeStoreInvite(currentStore.value.id, invite.id);
        invites.value = invites.value.filter((e) => e.id !== invite.id);
        showToast('Invite revoked.', 'success');
    } catch (error: any) {
        showToast(error?.body?.error?.message || 'Unable to revoke invite.', 'error');
    } finally {
        revokingInviteId.value = null;
    }
};

const buildInviteLink = (storeId: string, token: string) =>
    typeof window !== 'undefined'
        ? `${window.location.origin}/stores/${storeId}/invites/accept?token=${token}`
        : token;

const copyInviteLink = async () => {
    if (!recentInviteLink.value) return;
    try {
        await navigator.clipboard.writeText(recentInviteLink.value);
        showToast('Invite link copied.', 'success');
    } catch {
        showToast('Unable to copy link.', 'error');
    }
};

const formatInviteDate = (value: string) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: currentStore.value?.timezone || 'Asia/Manila' });
};

const inviteStatusClass = (status: string) => {
    if (status === 'PENDING') return 'st-invite-status--pending';
    if (status === 'ACCEPTED') return 'st-invite-status--accepted';
    return 'st-invite-status--expired';
};

// ── Plan & Subscription ───────────────────────────────────────
const planConfig = computed(() => getPlanConfig(userContext.planTier));
const storeUsage = computed(() => storeContext.stores.length);
const allPlans = computed(() => planTierOrder.map((tier) => planConfigs[tier]));
const currentTierIndex = computed(() => planTierOrder.indexOf(userContext.planTier ?? 'STARTER'));
const recommendedTier = computed<PlanTier | null>(() => planTierOrder[currentTierIndex.value + 1] ?? null);
const isDowngrade = (tier: PlanTier) => planTierOrder.indexOf(tier) < currentTierIndex.value;
const isUpgrading = ref(false);

const planTaglines: Record<PlanTier, string> = {
    STARTER: 'Everything you need to get started — free forever.',
    STANDARD: 'Advanced workflows for growing operations.',
    GROWTH: 'Multi-store power for scaling businesses.',
};
const planPrices: Record<PlanTier, string> = {
    STARTER: 'Free',
    STANDARD: 'Contact us',
    GROWTH: 'Contact us',
};
const coreFeatures = [
    { key: 'pos' as const, label: 'Point of sale (POS)' },
    { key: 'inventory' as const, label: 'Inventory tracking' },
    { key: 'products' as const, label: 'Product management' },
    { key: 'reports' as const, label: 'Sales reports' },
];
const advancedFeatures: { key: PlanFeature; label: string }[] = [
    { key: 'ingredients', label: 'Ingredients & raw materials' },
    { key: 'recipes', label: 'Recipes & product costing' },
    { key: 'purchaseOrders', label: 'Purchase orders & suppliers' },
    { key: 'importExport', label: 'Data exports (CSV)' },
];
const handlePlanAction = (plan: typeof allPlans.value[0]) => {
    showToast(`To switch to ${plan.label}, contact us at support@arshii.app.`, 'info');
};

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(async () => {
    if (!storeContext.stores.length) {
        await storeContext.fetchStores();
    }
    if (routeStoreId.value) {
        storeContext.setCurrentStore(routeStoreId.value);
    }
    resetForm();

    // Support deep-linking via ?section=team etc.
    const qs = route.query.section as string | undefined;
    if (qs && ['profile', 'payment', 'catalog', 'team', 'plan', 'ai', 'danger'].includes(qs)) {
        activeSection.value = qs as typeof activeSection.value;
    }

    await Promise.all([loadCurrentUser(), userContext.fetchMe()]);

    if (activeSection.value === 'team') await loadTeam();
    if (activeSection.value === 'ai') await loadAiModels();
});

watch(
    () => currentStore.value,
    async (store) => {
        if (!store) return;
        resetForm();
        if (activeSection.value === 'team') {
            isTeamLoaded.value = false;
            await loadTeam();
        }
    },
);

watch(activeSection, async (section) => {
    if (section === 'team' && !isTeamLoaded.value) await loadTeam();
    if (section === 'ai' && !aiModels.value.length) await loadAiModels();
});

watch(
    () => canManageOwners.value,
    (canManage) => {
        if (!canManage && inviteForm.role === 'OWNER') inviteForm.role = 'CASHIER';
    },
);
</script>

<style>
:root {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-bg: #f8fafc;
}

/* ── Page shell ── */
.st-page {
    min-height: 100vh;
    background: var(--c-bg);
    padding: 2.5rem 1.5rem 4rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
}

.st-shell {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ── Page header ── */
.st-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
}

.st-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.st-eyebrow {
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

.st-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    color: var(--c-text);
    letter-spacing: -0.03em;
    line-height: 1.15;
}

.st-subtitle {
    margin: 0;
    color: var(--c-muted);
    font-size: 0.9rem;
    line-height: 1.5;
}

.st-header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    padding-top: 0.25rem;
}

/* ── Sidebar + content body ── */
.st-body {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 2rem;
    align-items: start;
}

/* ── Left sidebar ── */
.st-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 0.75rem 0.5rem;
    position: sticky;
    top: 1.5rem;
}

.st-sidebar-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.25rem 0;
}

.st-sidebar-group + .st-sidebar-group {
    border-top: 1px solid var(--c-border);
    margin-top: 0.25rem;
    padding-top: 0.5rem;
}

.st-sidebar-group-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    padding: 0.2rem 0.75rem 0.4rem;
}

.st-sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    text-align: left;
    font-family: var(--app-font-sans);
    transition: background 0.12s, color 0.12s;
}

.st-sidebar-item:hover:not(:disabled) {
    background: #f1f5f9;
    color: var(--c-text);
}

.st-sidebar-item.is-active {
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-weight: 600;
}

.st-sidebar-item.is-active svg {
    color: var(--c-accent);
}

.st-sidebar-item--danger {
    color: #b91c1c;
}

.st-sidebar-item--danger:hover:not(:disabled) {
    background: #fef2f2;
    color: #991b1b;
}

.st-sidebar-item--danger.is-active {
    background: #fef2f2;
    color: #991b1b;
}

.st-sidebar-item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.st-sidebar-external {
    margin-left: auto;
    color: #cbd5e1;
    flex-shrink: 0;
}

/* ── Right content area ── */
.st-content {
    min-width: 0;
}

.st-section {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.st-section-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--c-border);
}

.st-section-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-section-title--danger {
    color: #b91c1c;
}

.st-section-sub {
    margin: 0;
    font-size: 0.85rem;
    color: var(--c-muted);
}

/* ── Danger card ── */
.st-danger-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    background: #fff5f5;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 1.1rem 1.25rem;
}

.st-danger-card-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #991b1b;
    margin: 0 0 0.2rem;
}

.st-danger-card-sub {
    font-size: 0.82rem;
    color: #b91c1c;
    margin: 0;
    max-width: 480px;
    line-height: 1.5;
}

.st-role-badge {
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

.st-state {
    padding: 1.25rem 1.5rem;
    background: #f0fdf9;
    border-radius: 10px;
    color: var(--c-accent-dark);
    font-size: 0.9rem;
}

/* ── Buttons ── */
.st-btn-ghost {
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

.st-btn-ghost:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
}

.st-btn-ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.st-btn-ghost--danger {
    color: #b91c1c;
    border-color: #fecaca;
}

.st-btn-ghost--danger:hover:not(:disabled) {
    background: #fff5f5;
    border-color: #fca5a5;
}

.st-btn-primary {
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

.st-btn-primary:hover:not(:disabled) {
    background: var(--c-accent-dark);
}

.st-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.st-btn-danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #b91c1c;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
}

.st-btn-danger:hover:not(:disabled) {
    background: #991b1b;
}

.st-btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ── Form ── */
.st-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}


.st-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.85rem 1.25rem;
}

.st-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.st-field input,
.st-field select {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: var(--c-surface);
    text-transform: none;
    letter-spacing: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.st-field input:focus,
.st-field select:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.st-field input:disabled,
.st-field select:disabled {
    background: var(--c-bg);
    color: #94a3b8;
    cursor: not-allowed;
}

.st-field-hint {
    font-size: 0.72rem;
    font-weight: 400;
    color: #94a3b8;
    text-transform: none;
    letter-spacing: 0;
}

.st-link-btn {
    background: none;
    border: none;
    padding: 0;
    margin-left: 0.4rem;
    font: inherit;
    font-size: 0.72rem;
    color: #ef4444;
    cursor: pointer;
    text-decoration: underline;
}

.st-link-btn:hover {
    color: #dc2626;
}

.st-link-btn--muted {
    color: var(--c-accent);
}

.st-link-btn--muted:hover {
    color: var(--c-accent-dark);
}

.st-ai-test {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
}

.st-ai-test-result {
    font-size: 0.8rem;
    font-weight: 500;
}

.st-ai-test-result--ok {
    color: #16a34a;
}

.st-ai-test-result--fail {
    color: #dc2626;
}

/* ── Toggle ── */
.st-toggle-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
}

.st-toggle-field input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
}

.st-toggle-track {
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background: var(--c-border);
    position: relative;
    transition: background 0.2s ease;
    flex-shrink: 0;
}

.st-toggle-track::after {
    content: '';
    width: 18px;
    height: 18px;
    background: #ffffff;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s ease;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.st-toggle-field input:checked + .st-toggle-track {
    background: var(--c-accent);
}

.st-toggle-field input:checked + .st-toggle-track::after {
    transform: translateX(20px);
}

.st-toggle-field input:disabled + .st-toggle-track {
    background: var(--c-border);
    opacity: 0.6;
}

.st-toggle-label {
    user-select: none;
}

/* ── Catalog defaults box ── */
.st-payment-methods {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.st-pm-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.st-pm-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    transition: background 0.12s, border-color 0.12s;
}

.st-pm-option:has(input:checked) {
    background: #f0fdf4;
    border-color: var(--c-accent);
    color: var(--c-accent);
}

.st-pm-option input[type="checkbox"] {
    accent-color: var(--c-accent);
}

.st-pm-option--disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.st-catalog-box {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.st-catalog-title {
    margin: 0 0 0.2rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--c-text);
}

.st-catalog-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

.st-catalog-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem 1.5rem;
}

.st-catalog-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.st-catalog-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-muted);
}

.st-catalog-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
}

.st-catalog-input input {
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.st-catalog-input input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.st-catalog-input input:disabled {
    background: var(--c-bg);
    color: #94a3b8;
}

.st-catalog-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.st-catalog-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: #f0fdf9;
    border: 1px solid #ccfbf1;
    color: #0f766e;
    border-radius: 6px;
    padding: 0.2rem 0.6rem;
    font-size: 0.8rem;
}

.st-catalog-remove {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0;
    display: inline-flex;
    align-items: center;
}

.st-catalog-remove:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.st-catalog-empty {
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ── Form footer ── */
.st-form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
}

.st-permission-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* ── Sidebar badge (pending invite count) ── */
.st-sidebar-badge {
    margin-left: auto;
    background: rgba(234, 179, 8, 0.18);
    color: #92400e;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    flex-shrink: 0;
}

/* ── Team section ── */
.st-team-tabs {
    display: flex;
    border-bottom: 2px solid var(--c-border);
    gap: 0;
    margin-bottom: 0.25rem;
}

.st-team-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    color: var(--c-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.st-team-tab:hover { color: var(--c-text); }
.st-team-tab.is-active { color: var(--c-accent-dark); border-bottom-color: var(--c-accent); }

.st-team-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    background: #e2e8f0;
    color: #475569;
}
.st-team-tab-count--pending { background: rgba(234, 179, 8, 0.15); color: #92400e; }

.st-team-empty { font-size: 0.875rem; color: var(--c-muted); padding: 0.5rem 0; }

.st-member-list { display: flex; flex-direction: column; }
.st-member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}
.st-member-row:last-child { border-bottom: none; }
.st-member-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.st-member-name { font-weight: 600; font-size: 0.9rem; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-member-meta { font-size: 0.78rem; color: var(--c-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-member-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.st-role-select {
    border: 1px solid var(--c-border);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: var(--c-surface);
    cursor: pointer;
}
.st-role-select:disabled { background: var(--c-bg); color: #94a3b8; cursor: not-allowed; }

.st-invite-block { display: flex; flex-direction: column; gap: 1rem; }

.st-invite-form {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.85rem 1rem;
}
.st-invite-form-action { grid-column: 1 / -1; display: flex; justify-content: flex-end; }

.st-invite-link-card {
    background: rgba(13, 148, 136, 0.05);
    border: 1px solid rgba(13, 148, 136, 0.18);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}
.st-invite-link-label { font-size: 0.7rem; font-weight: 600; color: var(--c-accent-dark); text-transform: uppercase; letter-spacing: 0.08em; }
.st-invite-link-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.st-invite-link-row input {
    flex: 1;
    min-width: 180px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    font-family: var(--app-font-sans);
    background: var(--c-surface);
    color: var(--c-muted);
}

.st-section-sub-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--c-text);
    padding-top: 0.5rem;
    border-top: 1px solid var(--c-border);
    margin-top: 0.25rem;
}

.st-invite-list { display: flex; flex-direction: column; }
.st-invite-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 0;
    border-bottom: 1px solid var(--c-border);
    gap: 1rem;
}
.st-invite-row:last-child { border-bottom: none; }
.st-invite-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.st-invite-status {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.st-invite-status--pending { background: rgba(234, 179, 8, 0.15); color: #92400e; }
.st-invite-status--accepted { background: rgba(16, 185, 129, 0.15); color: #047857; }
.st-invite-status--expired { background: #f1f5f9; color: #64748b; }

/* ── Plan section ── */
.st-plan-summary {
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
}
.st-plan-summary-item { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.2rem 1.25rem 0.2rem 0; flex: 1; min-width: 110px; }
.st-plan-summary-item:first-child { padding-left: 0; }
.st-plan-summary-divider { width: 1px; height: 32px; background: var(--c-border); margin-right: 1.25rem; flex-shrink: 0; }
.st-plan-summary-label { font-size: 0.66rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted); }
.st-plan-summary-value { font-size: 0.95rem; font-weight: 700; color: var(--c-text); }
.st-plan-active { color: var(--c-accent-dark); }
.st-plan-inactive { color: #b91c1c; }

.st-plan-header { display: flex; flex-direction: column; gap: 0.2rem; }
.st-plan-heading { font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--c-text); }

.st-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    align-items: start;
}

.st-plan-card {
    background: var(--c-surface);
    border: 1.5px solid var(--c-border);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.15s, border-color 0.15s;
}
.st-plan-card:hover { box-shadow: 0 6px 20px rgba(15,23,42,0.07); }
.st-plan-card--current { border-color: var(--c-accent); box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
.st-plan-card--recommended:not(.st-plan-card--current) { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.09); }

.st-plan-card-top { padding: 1.25rem 1.25rem 1rem; border-bottom: 1px solid var(--c-border); }
.st-plan-name-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
.st-plan-name { font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--c-text); letter-spacing: -0.02em; }
.st-plan-pill { padding: 0.12rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.st-plan-pill--current { background: rgba(13,148,136,0.12); color: var(--c-accent-dark); }
.st-plan-pill--recommended { background: rgba(99,102,241,0.12); color: #4f46e5; }
.st-plan-tagline { font-size: 0.8rem; color: var(--c-muted); margin: 0 0 0.75rem; line-height: 1.5; }
.st-plan-price { font-size: 1.35rem; font-weight: 800; color: var(--c-text); margin: 0; letter-spacing: -0.03em; }

.st-plan-limits {
    padding: 0.85rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    border-bottom: 1px solid var(--c-border);
    background: var(--c-bg);
}
.st-plan-limit { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; font-weight: 500; color: var(--c-text); }
.st-plan-limit svg { color: var(--c-muted); flex-shrink: 0; }

.st-plan-features { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.st-plan-feature-group-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c-muted); padding-bottom: 0.2rem; border-bottom: 1px solid var(--c-border); }
.st-plan-feature-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--c-text); }
.st-plan-feature-row--locked { color: var(--c-muted); }
.st-plan-check--yes { color: var(--c-accent); flex-shrink: 0; }
.st-plan-check--no { color: #cbd5e1; flex-shrink: 0; }

.st-plan-card-footer { padding: 1rem 1.25rem; border-top: 1px solid var(--c-border); }
.st-plan-btn {
    width: 100%;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--app-font-sans);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.st-plan-btn--current { background: rgba(13,148,136,0.08); border: 1.5px solid rgba(13,148,136,0.22); color: var(--c-accent-dark); cursor: default; }
.st-plan-btn--upgrade { background: var(--c-accent); border: none; color: white; }
.st-plan-btn--upgrade:hover { background: var(--c-accent-dark); }
.st-plan-btn--ghost { background: transparent; border: 1.5px solid var(--c-border); color: var(--c-muted); }
.st-plan-btn--ghost:hover { border-color: #cbd5e1; color: var(--c-text); }
.st-plan-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.st-plan-note { font-size: 0.82rem; color: var(--c-muted); margin: 0; text-align: center; }
.st-plan-link { color: var(--c-accent-dark); font-weight: 500; text-decoration: none; }
.st-plan-link:hover { text-decoration: underline; }

/* ── Responsive ── */

/* Tablet: sidebar collapses to horizontal tab strip */
@media (max-width: 900px) {
    .st-body {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .st-sidebar {
        position: static;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
        padding: 0.4rem 0.5rem;
        gap: 0;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .st-sidebar::-webkit-scrollbar {
        display: none;
    }

    .st-sidebar-group {
        flex-direction: row;
        flex-wrap: nowrap;
        padding: 0;
        gap: 0.15rem;
    }

    .st-sidebar-group + .st-sidebar-group {
        border-top: none;
        border-left: 1px solid var(--c-border);
        margin-top: 0;
        padding-top: 0;
        margin-left: 0.5rem;
        padding-left: 0.5rem;
    }

    .st-sidebar-group-label {
        display: none;
    }

    .st-sidebar-item {
        white-space: nowrap;
        font-size: 0.82rem;
        padding: 0.45rem 0.7rem;
    }

    .st-sidebar-external {
        display: none;
    }

    .st-form-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Plan grid: 3-col → 1-col at 900px */
@media (max-width: 900px) {
    .st-plan-grid {
        grid-template-columns: 1fr;
        max-width: 420px;
    }
    .st-plan-summary-divider { display: none; }
    .st-plan-summary-item { padding: 0; min-width: calc(50% - 0.5rem); flex: none; }
    .st-plan-summary { gap: 0.75rem; }

    .st-invite-form {
        grid-template-columns: 1fr;
    }
    .st-member-row { flex-wrap: wrap; }
}

/* Mobile */
@media (max-width: 600px) {
    .st-page {
        padding: 1.25rem 0.75rem 3rem;
    }

    .st-shell {
        gap: 1.25rem;
    }

    .st-section {
        padding: 1.25rem 1rem;
    }

    .st-form-grid {
        grid-template-columns: 1fr;
    }

    .st-danger-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .st-plan-summary-item { min-width: 100%; }
}

/* ── Archive store modal ── */
.st-archive-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

.st-archive-modal {
    background: var(--c-surface);
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    width: 100%;
    max-width: 460px;
    padding: 1.5rem;
    font-family: var(--app-font-sans);
}

.st-archive-title {
    margin: 0 0 0.6rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: #b91c1c;
}

.st-archive-text {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--c-muted);
}

.st-archive-label {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text);
    line-height: 1.7;
}

.st-archive-name-text {
    font-weight: 700;
    color: var(--c-text);
    background: #f1f5f9;
    border-radius: 5px;
    padding: 0.1rem 0.35rem;
    word-break: break-word;
}

.st-archive-copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    border: none;
    background: transparent;
    color: var(--c-muted);
    cursor: pointer;
    padding: 0.15rem;
    border-radius: 5px;
    transition: background 0.15s, color 0.15s;
}

.st-archive-copy:hover {
    background: #e2e8f0;
    color: var(--c-accent-dark);
}

.st-archive-input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-family: var(--app-font-sans);
    color: var(--c-text);
    background: var(--c-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
}

.st-archive-input:focus {
    outline: none;
    border-color: var(--c-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.st-archive-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
}
</style>
