import { defineStore } from 'pinia';
import { getMe } from '@/api/auth';
import type { PlanTier } from '@/utils/planAccess';

export type UserProfile = {
    id: string;
    email: string;
    fullName?: string | null;
    emailVerified?: boolean;
};

export const useUserContextStore = defineStore('userContext', {
    state: () => ({
        profile: null as UserProfile | null,
        subscriptionActive: null as boolean | null,
        planTier: null as PlanTier | null,
        isLoading: false,
        hasLoaded: false,
    }),
    actions: {
        async fetchMe(force = false) {
            if (this.isLoading) return;
            if (this.hasLoaded && !force) return;
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (!token) {
                this.profile = null;
                this.subscriptionActive = null;
                this.planTier = null;
                this.isLoading = false;
                this.hasLoaded = false;
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
                };
                this.subscriptionActive = Boolean(data.user.subscriptionActive);
                this.planTier = (data.user.planTier as PlanTier) || 'STARTER';
                this.hasLoaded = true;
            } catch (error) {
                this.profile = null;
                this.subscriptionActive = null;
                this.planTier = null;
                this.hasLoaded = false;
            } finally {
                this.isLoading = false;
            }
        },
        clear() {
            this.profile = null;
            this.subscriptionActive = null;
            this.planTier = null;
            this.isLoading = false;
            this.hasLoaded = false;
        },
    },
});
