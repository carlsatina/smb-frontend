import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

// Tracks an element's rendered height (border box), following it as it wraps or
// resizes. Used to size a scroll area to whatever space a pinned bar leaves.
export function useElementHeight(el: Ref<HTMLElement | null>) {
    const height = ref(0);
    let observer: ResizeObserver | null = null;

    const stop = () => {
        observer?.disconnect();
        observer = null;
    };

    watch(
        el,
        (node) => {
            stop();
            if (!node || typeof ResizeObserver === 'undefined') return;
            height.value = node.getBoundingClientRect().height;
            observer = new ResizeObserver(() => {
                height.value = node.getBoundingClientRect().height;
            });
            observer.observe(node);
        },
        { immediate: true, flush: 'post' }
    );

    onBeforeUnmount(stop);

    return height;
}
