import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import App from '@/App.vue';

vi.mock('vue-router', () => ({
    useRoute: () => ({ path: '/' }),
    useRouter: () => ({ push: () => undefined }),
}));

describe('App shell', () => {
    it('renders top nav and router view', () => {
        const wrapper = mount(App, {
            global: {
                stubs: {
                    RouterView: { template: '<div data-test="router-view" />' },
                    TopNav: { template: '<div data-test="top-nav" />' },
                },
            },
        });

        expect(wrapper.find('[data-test="top-nav"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true);
    });
});
