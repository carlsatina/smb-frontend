import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref, watch } from 'vue';
import ConfirmModal from '@/components/ConfirmModal.vue';

// Reproduces ProductForm's recipe→ready-made confirmation mechanism in isolation:
// a select bound with v-model, a watcher that reverts the type and opens a modal,
// and a guard flag preventing the programmatic revert from re-triggering.
const Harness = defineComponent({
    components: { ConfirmModal },
    setup() {
        const type = ref<'READY_MADE' | 'RECIPE'>('RECIPE');
        const recipeLines = ref([{ id: 'a' }]);
        const showModal = ref(false);
        let guard = false;

        watch(type, (next, prev) => {
            if (guard) {
                guard = false;
                return;
            }
            if (next === 'READY_MADE' && prev === 'RECIPE' && recipeLines.value.length > 0) {
                guard = true;
                type.value = 'RECIPE';
                showModal.value = true;
            }
        });

        const confirm = () => {
            showModal.value = false;
            recipeLines.value = [];
            guard = true;
            type.value = 'READY_MADE';
        };
        const cancel = () => {
            showModal.value = false;
        };

        return { type, recipeLines, showModal, confirm, cancel };
    },
    render() {
        return h('div', [
            h(
                'select',
                {
                    value: this.type,
                    'onUpdate:modelValue': (v: string) => (this.type = v as 'READY_MADE' | 'RECIPE'),
                },
                []
            ),
            h(ConfirmModal, {
                show: this.showModal,
                title: 'Switch to Ready-made?',
                'onUpdate:show': (v: boolean) => (this.showModal = v),
                onConfirm: this.confirm,
                onCancel: this.cancel,
            }),
        ]);
    },
});

describe('recipe → ready-made confirmation', () => {
    it('opens the modal and reverts type when switching away from a recipe', async () => {
        const wrapper = mount(Harness, { attachTo: document.body });
        const vm = wrapper.vm as unknown as { type: string; showModal: boolean };

        vm.type = 'READY_MADE';
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(vm.showModal).toBe(true);
        expect(vm.type).toBe('RECIPE'); // reverted until confirmed
        expect(document.body.querySelector('.confirm-modal')).not.toBeNull();
    });

    it('commits the switch and clears lines on confirm', async () => {
        const wrapper = mount(Harness, { attachTo: document.body });
        const vm = wrapper.vm as unknown as {
            type: string;
            showModal: boolean;
            recipeLines: unknown[];
            confirm: () => void;
        };

        vm.type = 'READY_MADE';
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        vm.confirm();
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(vm.type).toBe('READY_MADE');
        expect(vm.showModal).toBe(false);
        expect(vm.recipeLines.length).toBe(0);
    });
});
