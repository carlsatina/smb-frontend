<template>
    <teleport to="body">
        <transition name="csv-preview-fade" appear>
            <div v-if="show" class="csv-preview-overlay" tabindex="0" @keyup.esc="onCancel">
                <div class="csv-preview-modal" ref="modalRef">
                    <div class="csv-preview-header">
                        <div>
                            <h3>{{ title }}</h3>
                            <p v-if="fileName" class="csv-preview-filename">
                                <mdicon name="file-delimited-outline" size="15" />
                                {{ fileName }}
                            </p>
                        </div>
                        <button class="csv-preview-x" :disabled="confirming" @click="onCancel">✕</button>
                    </div>

                    <div class="csv-preview-body">
                        <div v-if="isReading" class="csv-preview-state">Reading file…</div>

                        <template v-else>
                            <!-- Validation messages -->
                            <div v-if="errors.length" class="csv-preview-alert csv-preview-alert--error">
                                <strong>This file can't be imported:</strong>
                                <ul>
                                    <li v-for="(e, i) in errors" :key="'e' + i">{{ e }}</li>
                                </ul>
                            </div>
                            <div v-else-if="warnings.length" class="csv-preview-alert csv-preview-alert--warn">
                                <ul>
                                    <li v-for="(w, i) in warnings" :key="'w' + i">{{ w }}</li>
                                </ul>
                            </div>
                            <div v-else class="csv-preview-alert csv-preview-alert--ok">
                                File looks valid — review the preview below before importing.
                            </div>

                            <!-- Summary -->
                            <div v-if="!errors.length" class="csv-preview-meta">
                                <span><strong>{{ dataRows.length }}</strong> data row{{ dataRows.length === 1 ? '' : 's' }}</span>
                                <span><strong>{{ headers.length }}</strong> column{{ headers.length === 1 ? '' : 's' }}</span>
                                <span v-if="dataRows.length > maxPreviewRows">Showing first {{ maxPreviewRows }}</span>
                            </div>

                            <!-- Preview table -->
                            <div v-if="headers.length" class="csv-preview-table-wrap">
                                <table class="csv-preview-table">
                                    <thead>
                                        <tr>
                                            <th class="csv-preview-rownum">#</th>
                                            <th v-for="(h, i) in headers" :key="i">{{ h }}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(r, ri) in previewRows" :key="ri">
                                            <td class="csv-preview-rownum">{{ ri + 1 }}</td>
                                            <td v-for="(c, ci) in headers" :key="ci">{{ r[ci] ?? '' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </template>
                    </div>

                    <div class="csv-preview-footer">
                        <button class="csv-preview-btn csv-preview-btn--ghost" :disabled="confirming" @click="onCancel">
                            Cancel
                        </button>
                        <button
                            class="csv-preview-btn csv-preview-btn--primary"
                            :disabled="confirming || isReading || errors.length > 0"
                            @click="onConfirm"
                        >
                            {{ confirming ? 'Importing…' : 'Continue' }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';

const props = withDefaults(
    defineProps<{
        show: boolean;
        file: File | null;
        title?: string;
        confirming?: boolean;
        maxPreviewRows?: number;
    }>(),
    {
        title: 'Import CSV',
        confirming: false,
        maxPreviewRows: 50,
    }
);

const emit = defineEmits<{
    (e: 'confirm'): void;
    (e: 'cancel'): void;
    (e: 'update:show', value: boolean): void;
}>();

const modalRef = ref<HTMLElement | null>(null);
const isReading = ref(false);
const fileName = ref('');
const headers = ref<string[]>([]);
const dataRows = ref<string[][]>([]);
const errors = ref<string[]>([]);
const warnings = ref<string[]>([]);
const previewRows = ref<string[][]>([]);

// Full CSV parser: handles quoted fields, escaped quotes ("") and newlines
// inside quotes. Returns an array of records (each an array of cells).
const parseCsv = (text: string): string[][] => {
    const records: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; }
                else quoted = false;
            } else cell += ch;
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            row.push(cell); cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            records.push(row); row = [];
        } else {
            cell += ch;
        }
    }
    // flush trailing cell/row if the file doesn't end with a newline
    if (cell.length > 0 || row.length > 0) { row.push(cell); records.push(row); }
    return records;
};

const isBlankRow = (r: string[]) => r.every((c) => c.trim() === '');

const loadFile = async (file: File) => {
    isReading.value = true;
    fileName.value = file.name;
    headers.value = [];
    dataRows.value = [];
    previewRows.value = [];
    errors.value = [];
    warnings.value = [];
    try {
        const text = (await file.text()).replace(/^﻿/, '');
        if (!text.trim()) {
            errors.value.push('The file is empty.');
            return;
        }
        const records = parseCsv(text).filter((r) => !isBlankRow(r));
        if (records.length === 0) {
            errors.value.push('The file has no rows.');
            return;
        }
        headers.value = records[0].map((h) => h.trim());
        dataRows.value = records.slice(1);

        if (dataRows.value.length === 0) {
            errors.value.push('The file has a header but no data rows.');
            return;
        }

        const ragged = dataRows.value.filter((r) => r.length !== headers.value.length).length;
        if (ragged > 0) {
            warnings.value.push(
                `${ragged} row${ragged === 1 ? '' : 's'} have a different number of columns than the header.`
            );
        }

        previewRows.value = dataRows.value.slice(0, props.maxPreviewRows);
    } catch {
        errors.value.push('Could not read the file. Make sure it is a valid CSV.');
    } finally {
        isReading.value = false;
    }
};

onClickOutside(modalRef, () => {
    if (!props.confirming) onCancel();
});

const onConfirm = () => emit('confirm');

const onCancel = () => {
    emit('cancel');
    emit('update:show', false);
};

watch(
    () => [props.show, props.file] as const,
    ([isVisible, file]) => {
        document.body.style.overflow = isVisible ? 'hidden' : '';
        if (isVisible && file) loadFile(file);
    },
    { immediate: true }
);
</script>

<style scoped>
.csv-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    padding: 1rem;
}

.csv-preview-modal {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    width: 100%;
    max-width: 860px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Inter', -apple-system, sans-serif;
}

.csv-preview-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.4rem 0.9rem;
    border-bottom: 1px solid #e2e8f0;
}

.csv-preview-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #0f172a;
}

.csv-preview-filename {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.3rem 0 0;
    font-size: 0.82rem;
    color: #64748b;
}

.csv-preview-x {
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    font-size: 1rem;
    line-height: 1;
    padding: 0.2rem;
}
.csv-preview-x:hover:not(:disabled) { color: #0f172a; }
.csv-preview-x:disabled { opacity: 0.5; cursor: not-allowed; }

.csv-preview-body {
    padding: 1rem 1.4rem;
    overflow-y: auto;
}

.csv-preview-state {
    text-align: center;
    color: #94a3b8;
    padding: 2rem;
}

.csv-preview-alert {
    border-radius: 8px;
    padding: 0.6rem 0.85rem;
    font-size: 0.82rem;
    margin-bottom: 0.85rem;
}
.csv-preview-alert ul { margin: 0.35rem 0 0; padding-left: 1.1rem; }
.csv-preview-alert li { margin: 0.1rem 0; }
.csv-preview-alert--error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.csv-preview-alert--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.csv-preview-alert--ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

.csv-preview-meta {
    display: flex;
    gap: 1.1rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: #475569;
    margin-bottom: 0.65rem;
}
.csv-preview-meta strong { color: #0f172a; }

.csv-preview-table-wrap {
    overflow: auto;
    max-height: 48vh;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
}

.csv-preview-table {
    border-collapse: collapse;
    font-size: 0.78rem;
    width: max-content;
    min-width: 100%;
}
.csv-preview-table th,
.csv-preview-table td {
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    text-align: left;
    white-space: nowrap;
    color: #1e293b;
}
.csv-preview-table thead th {
    position: sticky;
    top: 0;
    background: #f0fdfa;
    color: #0f766e;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    z-index: 1;
}
.csv-preview-table tbody tr:hover { background: #f8fafc; }
.csv-preview-rownum { color: #94a3b8; font-variant-numeric: tabular-nums; text-align: right; }

.csv-preview-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0.9rem 1.4rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}

.csv-preview-btn {
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
}
.csv-preview-btn--ghost { border: 1px solid #e2e8f0; background: #fff; color: #64748b; }
.csv-preview-btn--ghost:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.csv-preview-btn--primary { border: none; background: #0f766e; color: #fff; }
.csv-preview-btn--primary:hover:not(:disabled) { background: #0d6d66; }
.csv-preview-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.csv-preview-fade-enter-active,
.csv-preview-fade-leave-active { transition: opacity 0.2s ease; }
.csv-preview-fade-enter-active .csv-preview-modal,
.csv-preview-fade-leave-active .csv-preview-modal { transition: transform 0.2s ease; }
.csv-preview-fade-enter-from,
.csv-preview-fade-leave-to { opacity: 0; }
.csv-preview-fade-enter-from .csv-preview-modal,
.csv-preview-fade-leave-to .csv-preview-modal { transform: scale(0.97); }
</style>
