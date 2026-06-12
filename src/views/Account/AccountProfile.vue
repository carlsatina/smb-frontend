<template>
    <section class="apf-page">
        <div class="apf-shell">

            <header class="apf-header">
                <div class="apf-header-left">
                    <span class="apf-eyebrow">Account</span>
                    <h1 class="apf-title">My Profile</h1>
                    <p class="apf-subtitle">Update your name and password.</p>
                </div>
                <div class="apf-header-right">
                    <button class="apf-btn-ghost" @click="goBack">Back to stores</button>
                </div>
            </header>

            <!-- Profile details -->
            <section class="apf-panel">
                <div class="apf-panel-head">
                    <h2 class="apf-panel-title">Profile</h2>
                    <p class="apf-panel-desc">Your display name appears across the app.</p>
                </div>

                <form class="apf-form" @submit.prevent="saveProfile">
                    <label class="apf-field">
                        <span class="apf-label">Full name</span>
                        <input
                            v-model.trim="fullName"
                            type="text"
                            class="apf-input"
                            maxlength="120"
                            placeholder="Your name"
                            autocomplete="name"
                        />
                    </label>

                    <label class="apf-field">
                        <span class="apf-label">Email</span>
                        <input :value="userContext.profile?.email" type="email" class="apf-input" disabled />
                        <span class="apf-hint">Email can't be changed here.</span>
                    </label>

                    <div class="apf-actions">
                        <button type="submit" class="apf-btn-primary" :disabled="!canSaveProfile">
                            {{ savingProfile ? 'Saving…' : 'Save changes' }}
                        </button>
                    </div>
                </form>
            </section>

            <!-- Change password -->
            <section class="apf-panel">
                <div class="apf-panel-head">
                    <h2 class="apf-panel-title">Change password</h2>
                    <p class="apf-panel-desc">Changing your password signs out your other devices.</p>
                </div>

                <form class="apf-form" @submit.prevent="savePassword">
                    <label class="apf-field">
                        <span class="apf-label">Current password</span>
                        <input
                            v-model="currentPassword"
                            type="password"
                            class="apf-input"
                            autocomplete="current-password"
                        />
                    </label>

                    <label class="apf-field">
                        <span class="apf-label">New password</span>
                        <input
                            v-model="newPassword"
                            type="password"
                            class="apf-input"
                            autocomplete="new-password"
                        />
                        <span class="apf-hint">At least 8 characters.</span>
                    </label>

                    <label class="apf-field">
                        <span class="apf-label">Confirm new password</span>
                        <input
                            v-model="confirmPassword"
                            type="password"
                            class="apf-input"
                            autocomplete="new-password"
                        />
                        <span v-if="confirmPassword && !passwordsMatch" class="apf-error">
                            Passwords don't match.
                        </span>
                    </label>

                    <div class="apf-actions">
                        <button type="submit" class="apf-btn-primary" :disabled="!canSavePassword">
                            {{ savingPassword ? 'Updating…' : 'Update password' }}
                        </button>
                    </div>
                </form>
            </section>

        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserContextStore } from '@/stores/userContext';
import { useToast } from '@/composables/useToast';
import { changePassword, updateProfile } from '@/api/auth';

const router = useRouter();
const userContext = useUserContextStore();
const { showToast } = useToast();

const fullName = ref('');
const savingProfile = ref(false);

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingPassword = ref(false);

onMounted(async () => {
    if (!userContext.hasLoaded) {
        await userContext.fetchMe();
    }
    fullName.value = userContext.profile?.fullName ?? '';
});

const canSaveProfile = computed(() => {
    const trimmed = fullName.value.trim();
    return (
        !savingProfile.value &&
        trimmed.length > 0 &&
        trimmed !== (userContext.profile?.fullName ?? '')
    );
});

const passwordsMatch = computed(() => newPassword.value === confirmPassword.value);
const canSavePassword = computed(
    () =>
        !savingPassword.value &&
        currentPassword.value.length > 0 &&
        newPassword.value.length >= 8 &&
        passwordsMatch.value
);

const errorMessage = (error: any, fallback: string) =>
    error?.body?.error?.message || fallback;

const saveProfile = async () => {
    if (!canSaveProfile.value) return;
    savingProfile.value = true;
    try {
        const { user } = await updateProfile(fullName.value.trim());
        userContext.setFullName(user.fullName ?? fullName.value.trim());
        showToast('Profile updated.', 'success');
    } catch (error) {
        showToast(errorMessage(error, 'Could not update profile.'), 'error');
    } finally {
        savingProfile.value = false;
    }
};

const savePassword = async () => {
    if (!canSavePassword.value) return;
    savingPassword.value = true;
    try {
        await changePassword(currentPassword.value, newPassword.value);
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        showToast('Password updated.', 'success');
    } catch (error) {
        showToast(errorMessage(error, 'Could not update password.'), 'error');
    } finally {
        savingPassword.value = false;
    }
};

const goBack = () => {
    router.push('/stores');
};
</script>

<style scoped>
.apf-page {
    min-height: 100%;
    padding: 32px 16px 64px;
    background: #f6f7f9;
}

.apf-shell {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.apf-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.apf-eyebrow {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
}

.apf-title {
    margin: 4px 0 2px;
    font-size: 24px;
    font-weight: 700;
    color: #111827;
}

.apf-subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
}

.apf-btn-ghost {
    border: 1px solid #d1d5db;
    background: #fff;
    color: #374151;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
}

.apf-btn-ghost:hover {
    background: #f3f4f6;
}

.apf-panel {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
}

.apf-panel-head {
    margin-bottom: 16px;
}

.apf-panel-title {
    margin: 0 0 2px;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.apf-panel-desc {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
}

.apf-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.apf-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.apf-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
}

.apf-input {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
    color: #111827;
    background: #fff;
}

.apf-input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.apf-input:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
}

.apf-hint {
    font-size: 12px;
    color: #9ca3af;
}

.apf-error {
    font-size: 12px;
    color: #dc2626;
}

.apf-actions {
    display: flex;
    justify-content: flex-end;
}

.apf-btn-primary {
    background: #4f46e5;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.apf-btn-primary:hover:not(:disabled) {
    background: #4338ca;
}

.apf-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@media (max-width: 540px) {
    .apf-header {
        flex-direction: column;
    }
}
</style>
