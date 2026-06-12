import { defineStore } from 'pinia';
import { getAdminMe } from '@/api/auth';
import { getAdminAccessToken } from '@/api/client';

export type AdminProfile = {
    id: string;
    email: string;
    fullName?: string | null;
    isSuperAdmin: boolean;
};

export const useAdminContextStore = defineStore('adminContext', {
    state: () => ({
        profile: null as AdminProfile | null,
        isLoading: false,
        hasLoaded: false,
    }),
    actions: {
        async fetchMe(force = false) {
            if (this.isLoading) return;
            if (this.hasLoaded && !force) return;
            if (!getAdminAccessToken()) {
                this.$reset();
                return;
            }

            this.isLoading = true;
            try {
                const data = await getAdminMe();
                this.profile = {
                    id: data.user.id,
                    email: data.user.email,
                    fullName: data.user.fullName,
                    isSuperAdmin: Boolean(data.user.isSuperAdmin),
                };
                this.hasLoaded = true;
            } catch (error) {
                this.profile = null;
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
