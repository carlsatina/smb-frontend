<template>
    <div ref="rootRef" class="csv-menu">
        <button
            type="button"
            class="csv-menu__trigger"
            :class="{ 'csv-menu__trigger--open': open }"
            @click="toggle"
        >
            <mdicon name="swap-vertical" size="16" />
            <span>Import / Export</span>
            <mdicon :name="open ? 'chevron-up' : 'chevron-down'" size="14" class="csv-menu__chev" />
        </button>

        <Transition name="csv-menu-fade">
            <div v-if="open" class="csv-menu__panel">
                <button type="button" class="csv-menu__item" :disabled="isExporting" @click="select('export')">
                    <mdicon name="download" size="16" />
                    <span>{{ isExporting ? 'Exporting…' : 'Export CSV' }}</span>
                </button>
                <template v-if="canImport">
                    <button type="button" class="csv-menu__item" :disabled="isImporting" @click="select('import')">
                        <mdicon name="upload" size="16" />
                        <span>{{ isImporting ? 'Importing…' : 'Import CSV' }}</span>
                    </button>
                    <div class="csv-menu__divider"></div>
                    <button type="button" class="csv-menu__item csv-menu__item--subtle" @click="select('template')">
                        <mdicon name="file-document-outline" size="16" />
                        <span>Download template</span>
                    </button>
                </template>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

withDefaults(
    defineProps<{
        canImport?: boolean;
        isImporting?: boolean;
        isExporting?: boolean;
    }>(),
    { canImport: false, isImporting: false, isExporting: false }
);

const emit = defineEmits<{
    (e: 'export'): void;
    (e: 'import'): void;
    (e: 'template'): void;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const toggle = () => {
    open.value = !open.value;
};

const select = (action: 'export' | 'import' | 'template') => {
    open.value = false;
    if (action === 'export') emit('export');
    else if (action === 'import') emit('import');
    else emit('template');
};

const onDocClick = (event: MouseEvent) => {
    if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
        open.value = false;
    }
};

onMounted(() => document.addEventListener('mousedown', onDocClick, true));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick, true));
</script>

<style scoped>
.csv-menu {
    position: relative;
    display: inline-block;
}

.csv-menu__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}

.csv-menu__trigger:hover,
.csv-menu__trigger--open {
    border-color: #0d9488;
    color: #0f766e;
    background: rgba(13, 148, 136, 0.05);
}

.csv-menu__chev {
    color: #64748b;
    flex-shrink: 0;
}

.csv-menu__panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 100;
    min-width: 200px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.csv-menu__item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #0f172a;
    font-size: 0.84rem;
    font-weight: 500;
    font-family: 'Inter', -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    text-align: left;
}

.csv-menu__item:hover:not(:disabled) {
    background: #f1f5f9;
    color: #0f766e;
}

.csv-menu__item:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.csv-menu__item--subtle {
    color: #64748b;
}

.csv-menu__divider {
    height: 1px;
    background: #e2e8f0;
    margin: 0.25rem 0.15rem;
}

.csv-menu-fade-enter-active,
.csv-menu-fade-leave-active {
    transition: opacity 0.12s ease, transform 0.12s ease;
}

.csv-menu-fade-enter-from,
.csv-menu-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
