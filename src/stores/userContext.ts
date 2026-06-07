import { defineStore } from 'pinia';
import { getMe } from '@/api/auth';
import type { PlanTier } from '@/utils/planAccess';

export type UserProfile = {
    id: string;
    email: string;
    fullName?: string | null;
    emailVerified?: boolean;
    isSuperAdmin: boolean;
};

export const useUserContextStore = defineStore('userContext', {
    state: () => ({
        profile: null as UserProfile | null,
        subscriptionActive: null as boolean | null,
        planTier: null as PlanTier | null,
        grantedPlan: null as PlanTier | null,
        grantedUntil: null as string | null,
        isLoading: false,
        hasLoaded: false,
    }),
    getters: {
        effectivePlan: (state): PlanTier => {
            if (state.grantedPlan) {
                if (!state.grantedUntil || new Date(state.grantedUntil) > new Date()) {
                    return state.grantedPlan;
                }
            }
            return state.planTier ?? 'STARTER';
        },
    },
    actions: {
        async fetchMe(force = false) {
            if (this.isLoading) return;
            if (this.hasLoaded && !force) return;
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (!token) {
                this.$reset();
                return;
            }

            this.isLoading = true;
            try {
                const data = await getMe();
                this.profile = {
                    id: data.user.id,
                    email: data.user.email,
                    fullName: data.user.fullName,
                    emailVerified: Boolean(data.user.emailVerified),
                    isSuperAdmin: Boolean(data.user.isSuperAdmin),
                };
                this.subscriptionActive = Boolean(data.user.subscriptionActive);
                this.planTier = (data.user.planTier as PlanTier) || 'STARTER';
                this.grantedPlan = (data.user.grantedPlan as PlanTier) ?? null;
                this.grantedUntil = data.user.grantedUntil ?? null;
                this.hasLoaded = true;
            } catch (error) {
                this.profile = null;
                this.subscriptionActive = null;
                this.planTier = null;
                this.grantedPlan = null;
                this.grantedUntil = null;
                this.hasLoaded = false;
            } finally {
                this.isLoading = false;
            }
        },
        clear() {
            this.$reset();
        },
    },
});
