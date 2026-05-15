import { reactive, readonly } from 'vue';

export type ToastVariant = 'success' | 'error' | 'info';

type ToastState = {
    message: string;
    variant: ToastVariant;
    visible: boolean;
};

const state = reactive<ToastState>({
    message: '',
    variant: 'success',
    visible: false,
});

let timer: ReturnType<typeof setTimeout> | null = null;

const hideToast = () => {
    state.visible = false;
};

const showToast = (message: string, variant: ToastVariant = 'success', duration = 2800) => {
    state.message = message;
    state.variant = variant;
    state.visible = true;
    if (timer) {
        clearTimeout(timer);
    }
    timer = setTimeout(() => {
        hideToast();
    }, duration);
};

export const useToast = () => {
    return {
        state: readonly(state),
        showToast,
        hideToast,
    };
};
