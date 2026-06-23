<template>
    <div ref="rootRef" class="searchable-select" :class="{ 'is-disabled': disabled, 'is-open': isOpen }">
        <button
            v-if="!isOpen"
            type="button"
            class="ss-control"
            :class="{ 'ss-control--placeholder': !selectedLabel }"
            :disabled="disabled"
            @click="open"
        >
            <span class="ss-value">{{ selectedLabel || placeholder }}</span>
            <span class="ss-caret" aria-hidden="true">▾</span>
        </button>

        <div v-else class="ss-open">
            <input
                ref="searchRef"
                v-model="search"
                type="text"
                class="ss-search"
                :placeholder="searchPlaceholder"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.enter.prevent="selectHighlighted"
                @keydown.esc.prevent="close"
            />
            <Teleport to="body">
                <ul
                    ref="menuRef"
                    class="ss-menu"
                    role="listbox"
                    :style="menuStyle"
                >
                    <li v-if="filtered.length === 0" class="ss-empty">No matches.</li>
                    <li
                        v-for="(option, index) in filtered"
                        :key="option.value"
                        class="ss-option"
                        :class="{
                            'is-active': option.value === modelValue,
                            'is-highlighted': index === highlightedIndex,
                        }"
                        role="option"
                        :aria-selected="option.value === modelValue"
                        @mouseenter="highlightedIndex = index"
                        @mousedown.prevent="select(option.value)"
                    >
                        {{ option.label }}
                    </li>
                </ul>
            </Teleport>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type Option = { value: string; label: string };

const props = withDefaults(
    defineProps<{
        modelValue: string;
        options: Option[];
        placeholder?: string;
        searchPlaceholder?: string;
        disabled?: boolean;
    }>(),
    {
        placeholder: 'Select…',
        searchPlaceholder: 'Search…',
        disabled: false,
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const search = ref('');
const highlightedIndex = ref(0);

// The menu is teleported to <body> so it can never be clipped by an ancestor's
// overflow (e.g. a scrollable table). We position it manually under the control.
const menuStyle = ref<Record<string, string>>({});
const updateMenuPosition = () => {
    const anchor = searchRef.value ?? rootRef.value;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    menuStyle.value = {
        position: 'fixed',
        top: `${r.bottom + 4}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        right: 'auto',
        margin: '0',
    };
};

const selectedLabel = computed(
    () => props.options.find((option) => option.value === props.modelValue)?.label ?? ''
);

const filtered = computed(() => {
    const query = search.value.trim().toLowerCase();
    if (!query) return props.options;
    return props.options.filter((option) => option.label.toLowerCase().includes(query));
});

watch(filtered, () => {
    highlightedIndex.value = 0;
});

const open = () => {
    if (props.disabled) return;
    isOpen.value = true;
    search.value = '';
    highlightedIndex.value = 0;
    nextTick(() => {
        searchRef.value?.focus();
        updateMenuPosition();
    });
};

const close = () => {
    isOpen.value = false;
    search.value = '';
};

const select = (value: string) => {
    emit('update:modelValue', value);
    close();
};

const selectHighlighted = () => {
    const option = filtered.value[highlightedIndex.value];
    if (option) select(option.value);
};

const move = (delta: number) => {
    if (filtered.value.length === 0) return;
    const next = highlightedIndex.value + delta;
    highlightedIndex.value = (next + filtered.value.length) % filtered.value.length;
};

const handleClickOutside = (event: MouseEvent) => {
    if (!isOpen.value) return;
    const target = event.target as Node;
    const inRoot = rootRef.value?.contains(target);
    const inMenu = menuRef.value?.contains(target);
    if (!inRoot && !inMenu) {
        close();
    }
};

// Keep the teleported menu glued to the control while the page scrolls/resizes.
const handleReposition = () => {
    if (isOpen.value) updateMenuPosition();
};

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
});
onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    window.removeEventListener('scroll', handleReposition, true);
    window.removeEventListener('resize', handleReposition);
});

defineExpose({ open });
</script>

<style scoped>
.searchable-select {
    position: relative;
    width: 100%;
}

.ss-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1.5px solid var(--c-border);
    border-radius: 6px;
    background: var(--c-surface, #fff);
    color: var(--c-text);
    font-size: 0.85rem;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.ss-control:hover:not(:disabled) {
    border-color: var(--c-accent);
}

.ss-control:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.ss-control--placeholder .ss-value {
    color: var(--c-text-muted, #94a3b8);
}

.ss-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ss-caret {
    flex-shrink: 0;
    font-size: 0.7rem;
    color: var(--c-text-muted, #94a3b8);
}

.ss-search {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1.5px solid var(--c-accent);
    border-radius: 6px;
    background: var(--c-surface, #fff);
    color: var(--c-text);
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
}

.ss-menu {
    /* Positioned via inline styles (teleported to body); z-index keeps it above
       page content, the sticky nav, and modals it may be rendered inside. */
    position: fixed;
    z-index: 2000;
    padding: 0.25rem;
    list-style: none;
    max-height: 220px;
    overflow-y: auto;
    background: var(--c-surface, #fff);
    border: 1.5px solid var(--c-border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.ss-option {
    padding: 0.45rem 0.55rem;
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--c-text);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ss-option.is-highlighted {
    background: var(--c-surface-muted, #f1f5f9);
}

.ss-option.is-active {
    color: var(--c-accent-dark);
    font-weight: 600;
}

.ss-empty {
    padding: 0.5rem 0.55rem;
    font-size: 0.82rem;
    color: var(--c-text-muted, #94a3b8);
}
</style>
