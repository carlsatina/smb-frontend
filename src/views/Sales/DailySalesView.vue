<template>
    <div class="ds-page">
        <div class="ds-header">
            <div>
                <h1 class="ds-title">Daily Sales</h1>
                <p class="ds-subtitle">Review per-day totals and staff cash entries</p>
            </div>
            <div class="ds-header-actions">
                <button v-if="!isCashierRole" class="secondary-button button-compact" @click="openGoalModal">
                    <mdicon name="target" size="16" />
                    Goal: {{ goal > 0 ? formatMoney(goal) : 'Not set' }}
                </button>
                <template v-if="!isCashierRole">
                    <CsvActionsMenu
                        :can-import="true"
                        :is-importing="isImporting"
                        :is-exporting="isExporting"
                        @export="handleExport"
                        @import="triggerImport"
                        @template="downloadTemplate"
                    />
                    <input
                        ref="importFileInput"
                        type="file"
                        accept=".csv,text/csv"
                        style="display:none"
                        @change="handleImportFileSelected"
                    />
                </template>
                <button class="primary-button button-compact" :disabled="isAdding" @click="startAdding">
                    <mdicon name="plus" size="16" /> Add Entry
                </button>
            </div>
        </div>

        <div v-if="isImporting" class="ds-import-progress">
            <div class="ds-import-progress__label">Importing… {{ Math.round(importProgress) }}%</div>
            <div class="ds-import-progress__track">
                <div class="ds-import-progress__fill" :style="{ width: importProgress + '%' }"></div>
            </div>
        </div>

        <div
            v-if="importResult"
            class="ds-import-result"
            :class="importResult.failed > 0 ? 'ds-import-result--warn' : 'ds-import-result--ok'"
        >
            <div class="ds-import-result__summary">
                <span>Import complete: <strong>{{ importResult.imported }}</strong> added, <strong>{{ importResult.updated }}</strong> updated{{ importResult.failed > 0 ? `, ${importResult.failed} failed` : '' }}.</span>
                <button class="ds-import-result__close" @click="importResult = null">✕</button>
            </div>
            <ul v-if="importResult.errors.length > 0" class="ds-import-result__errors">
                <li v-for="err in importResult.errors" :key="err.row">Row {{ err.row }}: {{ err.message }}</li>
            </ul>
        </div>

        <div class="ds-controls">
            <div class="ds-month-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="prevMonth">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="ds-month-label">{{ monthLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="nextMonth">
                    <mdicon name="chevron-right" size="16" />
                </button>
            </div>
            <span class="ds-record-count">{{ rows.length }} record{{ rows.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="ds-table-wrap">
            <table class="ds-table">
                <thead>
                    <tr>
                        <th class="col-date">Date</th>
                        <template v-for="m in cashierMembers" :key="m.userId">
                            <th>COH ({{ memberName(m) }})</th>
                            <th>GCash ({{ memberName(m) }})</th>
                        </template>
                        <th>Senior</th>
                        <th>Expense</th>
                        <th>Total GCash</th>
                        <th>Total COH</th>
                        <template v-if="!isCashierRole">
                            <th class="col-highlight">Total Sales</th>
                            <th class="col-highlight">POS</th>
                            <th>Actual COH</th>
                            <th>Kulang Remit</th>
                            <th>Short if (-)</th>
                            <th>Sales Needed</th>
                        </template>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- ── Inline add row ── -->
                    <tr v-if="isAdding" class="ds-add-row">
                        <td class="col-date">
                            <input
                                type="date"
                                v-model="addForm.date"
                                class="ds-input"
                                @change="onAddDateChange"
                            />
                        </td>
                        <template v-for="m in cashierMembers" :key="m.userId">
                            <td>
                                <div class="ds-coh-cell">
                                    <span class="ds-coh-amount">{{ formatMoney(addCashierCoh(m.userId)) }}</span>
                                    <button class="btn-denom-edit" @click="openEditDenomModal(m)">Denoms</button>
                                </div>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    v-model.number="addForm.cashiers[m.userId].gcashAmount"
                                    class="ds-input ds-input--num"
                                    min="0"
                                    step="0.01"
                                />
                            </td>
                        </template>
                        <td class="ds-computed">
                            <span v-if="addForm.posLoading" class="ds-loading-dot">…</span>
                            <span v-else>{{ formatMoney(addForm.seniorTotal) }}</span>
                        </td>
                        <td>
                            <input
                                type="number"
                                v-model.number="addForm.expense"
                                class="ds-input ds-input--num"
                                min="0"
                                step="0.01"
                            />
                        </td>
                        <td class="ds-computed">{{ formatMoney(addTotalGcash) }}</td>
                        <td class="ds-computed">{{ formatMoney(addTotalCoh) }}</td>
                        <template v-if="!isCashierRole">
                            <td class="ds-computed col-highlight fw-bold">{{ formatMoney(addTotalSales) }}</td>
                            <td class="ds-computed col-highlight">
                                <span v-if="addForm.posLoading" class="ds-loading-dot">…</span>
                                <span v-else>{{ formatMoney(addForm.posTotal) }}</span>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    v-model.number="addForm.actualCoh"
                                    class="ds-input ds-input--num"
                                    min="0"
                                    step="0.01"
                                    :placeholder="formatMoney(addTotalCoh)"
                                />
                            </td>
                            <td :class="addKulangRemit > 0 ? 'text-danger' : ''">
                                {{ formatMoney(addKulangRemit) }}
                            </td>
                            <td :class="addShortIf < 0 ? 'text-danger' : 'text-success'">
                                {{ formatMoney(addShortIf) }}
                            </td>
                            <td :class="addSalesNeeded < 0 ? 'text-success' : 'text-danger'">
                                {{ formatMoney(addSalesNeeded) }}
                            </td>
                        </template>
                        <td class="col-actions">
                            <button
                                class="btn btn-sm btn-success-solid"
                                :disabled="addForm.saving || !addForm.date"
                                @click="saveAddRow"
                            >
                                {{ addForm.saving ? '…' : 'Save' }}
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" @click="cancelAdding">
                                Cancel
                            </button>
                        </td>
                    </tr>

                    <!-- ── Loading / empty ── -->
                    <tr v-if="isLoading">
                        <td :colspan="headerCount" class="ds-empty">Loading…</td>
                    </tr>
                    <tr v-else-if="rows.length === 0 && !isAdding">
                        <td :colspan="headerCount" class="ds-empty">No entries for this month.</td>
                    </tr>

                    <!-- ── Existing rows ── -->
                    <template v-else>
                        <tr v-for="row in rows" :key="row.id" :class="{ 'ds-editing-row': inlineEdit.rowId === row.id }">
                            <td class="col-date">{{ formatDate(row.date) }}</td>

                            <!-- COH / GCash — editable inputs in edit mode -->
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <td v-if="inlineEdit.rowId === row.id">
                                    <div class="ds-coh-cell">
                                        <span class="ds-coh-amount">{{ formatMoney(inlineEditCoh(m.userId)) }}</span>
                                        <button class="btn-denom-edit" @click="openInlineEditDenomModal(m)">Denoms</button>
                                    </div>
                                </td>
                                <td v-else>
                                    <button class="denom-btn" @click="openReadDenomModal(row, m)">
                                        {{ formatMoney(getCashierCoh(row, m.userId)) }}
                                    </button>
                                </td>
                                <td v-if="inlineEdit.rowId === row.id">
                                    <input
                                        type="number"
                                        v-model.number="inlineEdit.cashiers[m.userId].gcashAmount"
                                        class="ds-input ds-input--num"
                                        min="0" step="0.01"
                                    />
                                </td>
                                <td v-else>{{ formatMoney(getCashierGcash(row, m.userId)) }}</td>
                            </template>

                            <!-- Senior — always readonly -->
                            <td>{{ formatMoney(row.totalSenior) }}</td>

                            <!-- Expense — input in edit mode (owner), plain text otherwise -->
                            <td v-if="inlineEdit.rowId === row.id && !isCashierRole">
                                <input type="number" v-model.number="inlineEdit.expense" class="ds-input ds-input--num" min="0" step="0.01" />
                            </td>
                            <td v-else>{{ formatMoney(row.expense) }}</td>

                            <!-- Computed totals -->
                            <td>{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalGcash) : formatMoney(row.totalGcash) }}</td>
                            <td>{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalCoh) : formatMoney(row.totalCoh) }}</td>

                            <!-- Owner-only columns -->
                            <template v-if="!isCashierRole">
                                <td class="col-highlight fw-bold">{{ inlineEdit.rowId === row.id ? formatMoney(inlineEditTotalSales) : formatMoney(row.totalSales) }}</td>
                                <td class="col-highlight">{{ formatMoney(row.pos) }}</td>
                                <td v-if="inlineEdit.rowId === row.id">
                                    <input
                                        type="number"
                                        v-model.number="inlineEdit.actualCoh"
                                        class="ds-input ds-input--num"
                                        min="0" step="0.01"
                                        :placeholder="formatMoney(inlineEditTotalCoh)"
                                    />
                                </td>
                                <td v-else>{{ formatMoney(row.actualCoh) }}</td>
                                <td :class="(inlineEdit.rowId === row.id ? inlineEditKulangRemit : row.kulangRemit) > 0 ? 'text-danger' : ''">
                                    {{ inlineEdit.rowId === row.id ? formatMoney(inlineEditKulangRemit) : formatMoney(row.kulangRemit) }}
                                </td>
                                <td :class="row.shortIf < 0 ? 'text-danger' : 'text-success'">{{ formatMoney(row.shortIf) }}</td>
                                <td :class="row.salesNeeded < 0 ? 'text-success' : 'text-danger'">{{ formatMoney(row.salesNeeded) }}</td>
                            </template>

                            <!-- Actions — always rendered to keep column count consistent -->
                            <td class="col-actions">
                                <template v-if="inlineEdit.rowId === row.id">
                                    <button
                                        class="btn btn-sm btn-success-solid"
                                        :disabled="inlineEdit.saving"
                                        @click="saveInlineEdit"
                                    >{{ inlineEdit.saving ? '…' : 'Save' }}</button>
                                    <button class="btn btn-sm btn-outline-secondary" @click="cancelInlineEdit">Cancel</button>
                                </template>
                                <template v-else-if="!isCashierRole">
                                    <button
                                        class="btn btn-icon btn-warning-soft"
                                        title="Edit entry"
                                        @click="openInlineEdit(row)"
                                    >
                                        <mdicon name="pencil" size="14" />
                                    </button>
                                    <button
                                        class="btn btn-icon btn-danger-soft"
                                        title="Delete entry"
                                        @click="confirmDelete(row)"
                                    >
                                        <mdicon name="close" size="14" />
                                    </button>
                                </template>
                            </td>
                        </tr>

                        <!-- Totals row -->
                        <tr class="ds-total-row">
                            <td class="fw-bold">Total</td>
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <td class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'cashAmount')) }}</td>
                                <td class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'gcashAmount')) }}</td>
                            </template>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalSenior')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('expense')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalGcash')) }}</td>
                            <td class="fw-bold">{{ formatMoney(sumAll('totalCoh')) }}</td>
                            <template v-if="!isCashierRole">
                                <td class="col-highlight fw-bold">{{ formatMoney(sumAll('totalSales')) }}</td>
                                <td class="col-highlight fw-bold">{{ formatMoney(sumAll('pos')) }}</td>
                                <td class="fw-bold">{{ formatMoney(sumAll('actualCoh')) }}</td>
                                <td></td><td></td><td></td>
                            </template>
                            <td></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- ── Mobile card view (hidden on tablet+, shown on mobile) ── -->
        <div class="ds-cards">

            <!-- Add card -->
            <div v-if="isAdding" class="ds-card ds-card--add">
                <div class="ds-card-header">
                    <span class="ds-card-date">New Entry</span>
                </div>
                <div class="ds-card-body">
                    <label class="ds-card-field ds-card-field--full">
                        <span class="ds-card-label">Date</span>
                        <input type="date" v-model="addForm.date" class="ds-input" @change="onAddDateChange" />
                    </label>
                    <template v-for="m in cashierMembers" :key="m.userId">
                        <div class="ds-card-cashier-label">{{ memberName(m) }}</div>
                        <div class="ds-card-field-row">
                            <div class="ds-card-field">
                                <span class="ds-card-label">COH</span>
                                <div class="ds-coh-cell">
                                    <span class="ds-coh-amount">{{ formatMoney(addCashierCoh(m.userId)) }}</span>
                                    <button class="btn-denom-edit" @click="openEditDenomModal(m)">Denoms</button>
                                </div>
                            </div>
                            <label class="ds-card-field">
                                <span class="ds-card-label">GCash</span>
                                <input type="number" v-model.number="addForm.cashiers[m.userId].gcashAmount" class="ds-input ds-input--num" min="0" step="0.01" />
                            </label>
                        </div>
                    </template>
                    <div class="ds-card-field-row">
                        <label class="ds-card-field">
                            <span class="ds-card-label">Expense</span>
                            <input type="number" v-model.number="addForm.expense" class="ds-input ds-input--num" min="0" step="0.01" />
                        </label>
                        <label v-if="!isCashierRole" class="ds-card-field">
                            <span class="ds-card-label">Actual COH</span>
                            <input type="number" v-model.number="addForm.actualCoh" class="ds-input ds-input--num" min="0" step="0.01" :placeholder="formatMoney(addTotalCoh)" />
                        </label>
                    </div>
                    <div class="ds-card-summary">
                        <div class="ds-card-summary-row"><span>Senior</span><span><span v-if="addForm.posLoading" class="ds-loading-dot">…</span><span v-else>{{ formatMoney(addForm.seniorTotal) }}</span></span></div>
                        <div class="ds-card-summary-row"><span>Total GCash</span><span>{{ formatMoney(addTotalGcash) }}</span></div>
                        <div class="ds-card-summary-row"><span>Total COH</span><span>{{ formatMoney(addTotalCoh) }}</span></div>
                        <template v-if="!isCashierRole">
                            <div class="ds-card-summary-row ds-card-summary-row--highlight">
                                <span>Total Sales</span><span class="fw-bold">{{ formatMoney(addTotalSales) }}</span>
                            </div>
                            <div class="ds-card-summary-row"><span>POS</span><span><span v-if="addForm.posLoading" class="ds-loading-dot">…</span><span v-else>{{ formatMoney(addForm.posTotal) }}</span></span></div>
                        </template>
                    </div>
                </div>
                <div class="ds-card-actions">
                    <button class="btn btn-sm btn-success-solid" :disabled="addForm.saving || !addForm.date" @click="saveAddRow">
                        {{ addForm.saving ? '…' : 'Save' }}
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="cancelAdding">Cancel</button>
                </div>
            </div>

            <!-- Loading / empty -->
            <div v-if="isLoading" class="ds-card-empty">Loading…</div>
            <div v-else-if="rows.length === 0 && !isAdding" class="ds-card-empty">No entries for this month.</div>

            <!-- Existing row cards -->
            <template v-else>
                <div v-for="row in rows" :key="row.id" class="ds-card" :class="{ 'ds-card--editing': inlineEdit.rowId === row.id }">

                    <!-- Inline edit mode -->
                    <template v-if="inlineEdit.rowId === row.id">
                        <div class="ds-card-header">
                            <span class="ds-card-date">{{ formatDate(row.date) }}</span>
                        </div>
                        <div class="ds-card-body">
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <div class="ds-card-cashier-label">{{ memberName(m) }}</div>
                                <div class="ds-card-field-row">
                                    <div class="ds-card-field">
                                        <span class="ds-card-label">COH</span>
                                        <div class="ds-coh-cell">
                                            <span class="ds-coh-amount">{{ formatMoney(inlineEditCoh(m.userId)) }}</span>
                                            <button class="btn-denom-edit" @click="openInlineEditDenomModal(m)">Denoms</button>
                                        </div>
                                    </div>
                                    <label class="ds-card-field">
                                        <span class="ds-card-label">GCash</span>
                                        <input type="number" v-model.number="inlineEdit.cashiers[m.userId].gcashAmount" class="ds-input ds-input--num" min="0" step="0.01" />
                                    </label>
                                </div>
                            </template>
                            <div class="ds-card-field-row">
                                <label v-if="!isCashierRole" class="ds-card-field">
                                    <span class="ds-card-label">Expense</span>
                                    <input type="number" v-model.number="inlineEdit.expense" class="ds-input ds-input--num" min="0" step="0.01" />
                                </label>
                                <label v-if="!isCashierRole" class="ds-card-field">
                                    <span class="ds-card-label">Actual COH</span>
                                    <input type="number" v-model.number="inlineEdit.actualCoh" class="ds-input ds-input--num" min="0" step="0.01" :placeholder="formatMoney(inlineEditTotalCoh)" />
                                </label>
                            </div>
                            <div class="ds-card-summary">
                                <div class="ds-card-summary-row"><span>Total GCash</span><span>{{ formatMoney(inlineEditTotalGcash) }}</span></div>
                                <div class="ds-card-summary-row"><span>Total COH</span><span>{{ formatMoney(inlineEditTotalCoh) }}</span></div>
                                <template v-if="!isCashierRole">
                                    <div class="ds-card-summary-row ds-card-summary-row--highlight">
                                        <span>Total Sales</span><span class="fw-bold">{{ formatMoney(inlineEditTotalSales) }}</span>
                                    </div>
                                    <div class="ds-card-summary-row" :class="inlineEditKulangRemit > 0 ? 'text-danger' : ''">
                                        <span>Kulang Remit</span><span>{{ formatMoney(inlineEditKulangRemit) }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                        <div class="ds-card-actions">
                            <button class="btn btn-sm btn-success-solid" :disabled="inlineEdit.saving" @click="saveInlineEdit">
                                {{ inlineEdit.saving ? '…' : 'Save' }}
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" @click="cancelInlineEdit">Cancel</button>
                        </div>
                    </template>

                    <!-- Read mode -->
                    <template v-else>
                        <div class="ds-card-header">
                            <span class="ds-card-date">{{ formatDate(row.date) }}</span>
                            <div v-if="!isCashierRole" class="ds-card-header-actions">
                                <button class="btn btn-icon btn-warning-soft" @click="openInlineEdit(row)"><mdicon name="pencil" size="14" /></button>
                                <button class="btn btn-icon btn-danger-soft" @click="confirmDelete(row)"><mdicon name="close" size="14" /></button>
                            </div>
                        </div>
                        <div class="ds-card-body">
                            <template v-for="m in cashierMembers" :key="m.userId">
                                <div class="ds-card-cashier-label">{{ memberName(m) }}</div>
                                <div class="ds-card-field-row">
                                    <div class="ds-card-field">
                                        <span class="ds-card-label">COH</span>
                                        <button class="denom-btn" @click="openReadDenomModal(row, m)">{{ formatMoney(getCashierCoh(row, m.userId)) }}</button>
                                    </div>
                                    <div class="ds-card-field">
                                        <span class="ds-card-label">GCash</span>
                                        <span>{{ formatMoney(getCashierGcash(row, m.userId)) }}</span>
                                    </div>
                                </div>
                            </template>
                            <div class="ds-card-field-row">
                                <div class="ds-card-field">
                                    <span class="ds-card-label">Senior</span>
                                    <span>{{ formatMoney(row.totalSenior) }}</span>
                                </div>
                                <div class="ds-card-field">
                                    <span class="ds-card-label">Expense</span>
                                    <span>{{ formatMoney(row.expense) }}</span>
                                </div>
                            </div>
                            <div class="ds-card-summary">
                                <div class="ds-card-summary-row"><span>Total GCash</span><span>{{ formatMoney(row.totalGcash) }}</span></div>
                                <div class="ds-card-summary-row"><span>Total COH</span><span>{{ formatMoney(row.totalCoh) }}</span></div>
                                <template v-if="!isCashierRole">
                                    <div class="ds-card-summary-row ds-card-summary-row--highlight">
                                        <span>Total Sales</span><span class="fw-bold">{{ formatMoney(row.totalSales) }}</span>
                                    </div>
                                    <div class="ds-card-summary-row"><span>POS</span><span>{{ formatMoney(row.pos) }}</span></div>
                                    <div class="ds-card-summary-row"><span>Actual COH</span><span>{{ formatMoney(row.actualCoh) }}</span></div>
                                    <div class="ds-card-summary-row" :class="row.kulangRemit > 0 ? 'text-danger' : ''">
                                        <span>Kulang Remit</span><span>{{ formatMoney(row.kulangRemit) }}</span>
                                    </div>
                                    <div class="ds-card-summary-row" :class="row.shortIf < 0 ? 'text-danger' : 'text-success'">
                                        <span>Short if (-)</span><span>{{ formatMoney(row.shortIf) }}</span>
                                    </div>
                                    <div class="ds-card-summary-row" :class="row.salesNeeded < 0 ? 'text-success' : 'text-danger'">
                                        <span>Sales Needed</span><span>{{ formatMoney(row.salesNeeded) }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Monthly totals card -->
                <div class="ds-card ds-card--total">
                    <div class="ds-card-header">
                        <span class="ds-card-date fw-bold">Monthly Total</span>
                    </div>
                    <div class="ds-card-body">
                        <template v-for="m in cashierMembers" :key="m.userId">
                            <div class="ds-card-cashier-label">{{ memberName(m) }}</div>
                            <div class="ds-card-field-row">
                                <div class="ds-card-field">
                                    <span class="ds-card-label">COH</span>
                                    <span class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'cashAmount')) }}</span>
                                </div>
                                <div class="ds-card-field">
                                    <span class="ds-card-label">GCash</span>
                                    <span class="fw-bold">{{ formatMoney(sumCashierField(m.userId, 'gcashAmount')) }}</span>
                                </div>
                            </div>
                        </template>
                        <div class="ds-card-summary">
                            <div class="ds-card-summary-row"><span>Senior</span><span class="fw-bold">{{ formatMoney(sumAll('totalSenior')) }}</span></div>
                            <div class="ds-card-summary-row"><span>Expense</span><span class="fw-bold">{{ formatMoney(sumAll('expense')) }}</span></div>
                            <div class="ds-card-summary-row"><span>Total GCash</span><span class="fw-bold">{{ formatMoney(sumAll('totalGcash')) }}</span></div>
                            <div class="ds-card-summary-row"><span>Total COH</span><span class="fw-bold">{{ formatMoney(sumAll('totalCoh')) }}</span></div>
                            <template v-if="!isCashierRole">
                                <div class="ds-card-summary-row ds-card-summary-row--highlight">
                                    <span>Total Sales</span><span class="fw-bold">{{ formatMoney(sumAll('totalSales')) }}</span>
                                </div>
                                <div class="ds-card-summary-row ds-card-summary-row--highlight">
                                    <span>POS</span><span class="fw-bold">{{ formatMoney(sumAll('pos')) }}</span>
                                </div>
                                <div class="ds-card-summary-row"><span>Actual COH</span><span class="fw-bold">{{ formatMoney(sumAll('actualCoh')) }}</span></div>
                            </template>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- Denomination modal (editable for add row / inline edit, read-only for existing) -->
        <DenominationModal
            v-if="denomModal.open"
            :cashier-name="denomModal.cashierName"
            :editable="denomModal.editable"
            :model-value="denomModal.editable
                ? (denomModal.cashierUserId.startsWith('inline:')
                    ? inlineEdit.cashiers[denomModal.cashierUserId.slice(7)]
                    : addForm.cashiers[denomModal.cashierUserId])
                : undefined"
            :readonly-cashier="denomModal.editable ? undefined : denomModal.readonlyCashier"
            @update:model-value="onDenomUpdate"
            @confirm="denomModal.open = false"
            @close="denomModal.open = false"
        />

        <!-- CSV import preview / confirmation -->
        <CsvImportPreviewModal
            :show="showImportPreview"
            :file="pendingImportFile"
            title="Import Daily Sales"
            :confirming="isImporting"
            @confirm="confirmImport"
            @cancel="cancelImport"
            @update:show="showImportPreview = $event"
        />

        <!-- Delete confirm modal -->
        <ConfirmModal
            :show="deleteModal.show"
            title="Delete Entry"
            :message="`Delete the entry for ${deleteModal.row ? formatDate(deleteModal.row.date) : ''}? This cannot be undone.`"
            confirm-text="Delete"
            variant="danger"
            :loading="deleteModal.loading"
            @confirm="onDeleteConfirm"
            @cancel="deleteModal.show = false"
            @update:show="deleteModal.show = $event"
        />

        <!-- Goal modal -->
        <div v-if="goalModal.open" class="ds-modal-backdrop" @click.self="goalModal.open = false">
            <div class="ds-modal">
                <h3>Set Daily Sales Goal</h3>
                <div class="ds-form-group">
                    <label>Daily Goal (₱)</label>
                    <input type="number" v-model.number="goalModal.value" class="form-control" min="0" step="0.01" />
                </div>
                <div class="ds-form-group">
                    <label>Effective From</label>
                    <input type="date" v-model="goalModal.date" class="form-control" />
                </div>
                <div class="ds-modal-actions">
                    <button class="btn btn-secondary" @click="goalModal.open = false">Cancel</button>
                    <button class="btn btn-primary" :disabled="goalModal.saving" @click="saveGoal">
                        {{ goalModal.saving ? 'Saving…' : 'Save Goal' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useStoreContextStore } from '@/stores/storeContext';
import {
    type CashierEntry,
    type DailySalesRow,
    createDailySalesEntry,
    deleteDailySalesEntry,
    getDailySalesGoal,
    getPosForDate,
    listDailySales,
    setDailySalesGoal,
    updateDailySalesEntry,
    upsertCashierEntry,
} from '@/api/dailySales';
import { listStoreMembers, type StoreMember } from '@/api/storeMembers';
import DenominationModal from '@/components/DenominationModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import CsvActionsMenu from '@/components/CsvActionsMenu.vue';
import CsvImportPreviewModal from '@/components/CsvImportPreviewModal.vue';
import { useToast } from '@/composables/useToast';

const storeContext = useStoreContextStore();
const { showToast } = useToast();

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const rows = ref<DailySalesRow[]>([]);
const goal = ref(0);
const isLoading = ref(false);
const allMembers = ref<StoreMember[]>([]);

const storeTimezone = computed(() => storeContext.currentStore?.timezone || 'Asia/Manila');

const monthLabel = computed(() => {
    const d = new Date(Date.UTC(year.value, month.value - 1, 1));
    return d.toLocaleString('default', { timeZone: storeTimezone.value, month: 'long', year: 'numeric' });
});

const cashierMembers = computed(() => allMembers.value.filter(m => m.role === 'CASHIER'));

const isCashierRole = computed(() => storeContext.currentStore?.role === 'CASHIER');

// cashier: Date + COH/GCash pairs + Senior + Expense + Total GCash + Total COH + Actions = 1 + N*2 + 5
// owner: adds Total Sales, POS, Actual COH, Kulang Remit, Short if, Sales Needed = 1 + N*2 + 11
const headerCount = computed(() =>
    isCashierRole.value
        ? 1 + cashierMembers.value.length * 2 + 5
        : 1 + cashierMembers.value.length * 2 + 11
);

const memberName = (m: StoreMember) => m.fullName || m.email;

// ── Fetch ────────────────────────────────────────────────────
const loadData = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    isLoading.value = true;
    try {
        const [dataRes, goalRes] = await Promise.all([
            listDailySales(storeId, year.value, month.value),
            getDailySalesGoal(storeId),
        ]);
        rows.value = dataRes.rows;
        goal.value = goalRes.goal?.goal ?? 0;
    } finally {
        isLoading.value = false;
    }
};

const loadMembers = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    const res = await listStoreMembers(storeId);
    allMembers.value = res.members;
};

onMounted(async () => {
    await Promise.all([loadData(), loadMembers()]);
});

const prevMonth = () => {
    if (month.value === 1) { month.value = 12; year.value--; }
    else month.value--;
    loadData();
};
const nextMonth = () => {
    if (month.value === 12) { month.value = 1; year.value++; }
    else month.value++;
    loadData();
};

// ── Formatters ───────────────────────────────────────────────
const formatMoney = (v: number) =>
    Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDate = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const tz = storeTimezone.value;
    const datePart = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, month: '2-digit', day: '2-digit', year: 'numeric',
    }).format(date);
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short',
    }).format(date);
    return `${datePart}, ${weekday}`;
};

// ── Row helpers ──────────────────────────────────────────────
const getCashierEntry = (row: DailySalesRow, userId: string) =>
    row.cashierEntries.find((c) => c.userId === userId);

const getCashierCoh = (row: DailySalesRow, userId: string) =>
    getCashierEntry(row, userId)?.cashAmount ?? 0;

const getCashierGcash = (row: DailySalesRow, userId: string) =>
    getCashierEntry(row, userId)?.gcashAmount ?? 0;

const sumAll = (field: keyof DailySalesRow) =>
    rows.value.reduce((s, r) => s + (r[field] as number), 0);

const sumCashierField = (userId: string, field: 'cashAmount' | 'gcashAmount') =>
    rows.value.reduce((s, r) => s + (getCashierEntry(r, userId)?.[field] ?? 0), 0);

// ── Denomination modal ───────────────────────────────────────
type DenomData = {
    denom1000: number; denom500: number; denom200: number;
    denom100: number; denom50: number; denom20: number; coins: number;
};

const denomModal = reactive({
    open: false,
    editable: false,
    cashierUserId: '',
    cashierName: '',
    readonlyCashier: null as CashierEntry | null,
});

const openReadDenomModal = (row: DailySalesRow, m: StoreMember) => {
    denomModal.editable = false;
    denomModal.cashierUserId = m.userId;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = getCashierEntry(row, m.userId) ?? null;
    denomModal.open = true;
};

const openEditDenomModal = (m: StoreMember) => {
    denomModal.editable = true;
    denomModal.cashierUserId = m.userId;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = null;
    denomModal.open = true;
};

const onDenomUpdate = (v: DenomData) => {
    const key = denomModal.cashierUserId;
    if (key.startsWith('inline:')) {
        const userId = key.slice(7);
        inlineEdit.cashiers[userId] = { ...inlineEdit.cashiers[userId], ...v };
    } else {
        addForm.cashiers[key] = { ...addForm.cashiers[key], ...v };
    }
};

// ── Inline add row ───────────────────────────────────────────
type CashierDraft = DenomData & { gcashAmount: number };

const defaultDraft = (): CashierDraft => ({
    denom1000: 0, denom500: 0, denom200: 0, denom100: 0, denom50: 0, denom20: 0, coins: 0, gcashAmount: 0,
});

const isAdding = ref(false);
const addForm = reactive({
    date: '',
    expense: 0 as number,
    seniorTotal: 0,
    actualCoh: null as number | null,
    cashiers: {} as Record<string, CashierDraft>,
    posTotal: 0,
    posLoading: false,
    saving: false,
});

const todayStr = () => {
    const tz = storeTimezone.value;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const p: Record<string, string> = {};
    parts.forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
};

const startAdding = () => {
    const draft: Record<string, CashierDraft> = {};
    cashierMembers.value.forEach((m) => { draft[m.userId] = defaultDraft(); });
    addForm.date = todayStr();
    addForm.expense = 0;
    addForm.seniorTotal = 0;
    addForm.actualCoh = null;
    addForm.cashiers = draft;
    addForm.posTotal = 0;
    addForm.saving = false;
    isAdding.value = true;
    fetchPos();
};

const cancelAdding = () => { isAdding.value = false; };

let posTimer: ReturnType<typeof setTimeout> | null = null;

const onAddDateChange = () => {
    // Reset all entered values for the new date
    addForm.expense = 0;
    addForm.actualCoh = null;
    addForm.posTotal = 0;
    addForm.seniorTotal = 0;
    cashierMembers.value.forEach((m) => {
        addForm.cashiers[m.userId] = defaultDraft();
    });

    if (posTimer) clearTimeout(posTimer);
    posTimer = setTimeout(fetchPos, 600);
};

const fetchPos = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !addForm.date) return;
    addForm.posLoading = true;
    try {
        const res = await getPosForDate(storeId, addForm.date);
        addForm.posTotal = res.pos;
        addForm.seniorTotal = res.seniorDiscount ?? 0;
    } catch {
        addForm.posTotal = 0;
        addForm.seniorTotal = 0;
    } finally {
        addForm.posLoading = false;
    }
};

const denomTotal = (d: CashierDraft) =>
    d.denom1000 * 1000 + d.denom500 * 500 + d.denom200 * 200 +
    d.denom100 * 100 + d.denom50 * 50 + d.denom20 * 20 + (d.coins || 0);

const addCashierCoh = (userId: string): number => {
    const d = addForm.cashiers[userId];
    return d ? denomTotal(d) : 0;
};

const addTotalCoh = computed(() =>
    cashierMembers.value.reduce((s, m) => s + addCashierCoh(m.userId), 0)
);

const addTotalGcash = computed(() =>
    cashierMembers.value.reduce((s, m) => s + (addForm.cashiers[m.userId]?.gcashAmount || 0), 0)
);

const addTotalSales = computed(() =>
    addTotalCoh.value + addTotalGcash.value + addForm.seniorTotal + (addForm.expense || 0)
);

const addActualCohVal = computed(() =>
    addForm.actualCoh != null ? addForm.actualCoh : addTotalCoh.value
);

const addKulangRemit = computed(() => addTotalCoh.value - addActualCohVal.value);
const addShortIf = computed(() => addTotalSales.value - addForm.posTotal);
const addSalesNeeded = computed(() => {
    const prevCumulative = rows.value[0]?.salesNeeded ?? 0;
    return prevCumulative + (goal.value - addTotalSales.value);
});

const saveAddRow = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !addForm.date) return;
    addForm.saving = true;
    try {
        const result = await createDailySalesEntry(storeId, {
            date: addForm.date,
            expense: addForm.expense || 0,
            actualCoh: addForm.actualCoh,
        });
        const entryId = (result as { entry: { id: string } }).entry.id;

        const cashierSaves = cashierMembers.value
            .filter((m) => {
                const d = addForm.cashiers[m.userId];
                return d && (denomTotal(d) > 0 || d.gcashAmount > 0);
            })
            .map((m) => {
                const d = addForm.cashiers[m.userId];
                return upsertCashierEntry(storeId, entryId, m.userId, {
                    denom1000: d.denom1000,
                    denom500: d.denom500,
                    denom200: d.denom200,
                    denom100: d.denom100,
                    denom50: d.denom50,
                    denom20: d.denom20,
                    coins: d.coins,
                    gcashAmount: d.gcashAmount,
                });
            });

        await Promise.all(cashierSaves);
        isAdding.value = false;
        await loadData();
        showToast('Entry saved', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save entry', 'error');
    } finally {
        addForm.saving = false;
    }
};

// ── Inline edit (existing rows) ──────────────────────────────
const inlineEdit = reactive({
    rowId: null as string | null,
    expense: 0 as number,
    actualCoh: null as number | null,
    cashiers: {} as Record<string, CashierDraft>,
    saving: false,
});

const openInlineEdit = (row: DailySalesRow) => {
    const draft: Record<string, CashierDraft> = {};
    cashierMembers.value.forEach((m) => {
        const existing = getCashierEntry(row, m.userId);
        draft[m.userId] = existing
            ? {
                denom1000: existing.denom1000,
                denom500: existing.denom500,
                denom200: existing.denom200,
                denom100: existing.denom100,
                denom50: existing.denom50,
                denom20: existing.denom20,
                coins: existing.coins,
                gcashAmount: existing.gcashAmount,
              }
            : defaultDraft();
    });
    inlineEdit.rowId = row.id;
    inlineEdit.expense = row.expense;
    inlineEdit.actualCoh = row.actualCoh;
    inlineEdit.cashiers = draft;
    inlineEdit.saving = false;
};

const cancelInlineEdit = () => { inlineEdit.rowId = null; };

const inlineEditCoh = (userId: string): number => {
    const d = inlineEdit.cashiers[userId];
    return d ? denomTotal(d) : 0;
};

const inlineEditTotalCoh = computed(() =>
    cashierMembers.value.reduce((s, m) => s + inlineEditCoh(m.userId), 0)
);

const inlineEditTotalGcash = computed(() =>
    cashierMembers.value.reduce((s, m) => s + (inlineEdit.cashiers[m.userId]?.gcashAmount || 0), 0)
);

const inlineEditActualCohVal = computed(() =>
    inlineEdit.actualCoh != null ? inlineEdit.actualCoh : inlineEditTotalCoh.value
);

const inlineEditKulangRemit = computed(() => inlineEditTotalCoh.value - inlineEditActualCohVal.value);

const inlineEditTotalSales = computed(() => {
    const row = rows.value.find(r => r.id === inlineEdit.rowId);
    return inlineEditTotalCoh.value + inlineEditTotalGcash.value + (row?.totalSenior ?? 0) + (inlineEdit.expense || 0);
});

const openInlineEditDenomModal = (m: StoreMember) => {
    denomModal.editable = true;
    denomModal.cashierUserId = `inline:${m.userId}`;
    denomModal.cashierName = memberName(m);
    denomModal.readonlyCashier = null;
    denomModal.open = true;
};

const saveInlineEdit = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !inlineEdit.rowId) return;
    inlineEdit.saving = true;
    const entryId = inlineEdit.rowId;
    try {
        await updateDailySalesEntry(storeId, entryId, {
            expense: inlineEdit.expense || 0,
            actualCoh: inlineEdit.actualCoh,
        });
        const cashierSaves = cashierMembers.value.map((m) => {
            const d = inlineEdit.cashiers[m.userId];
            return upsertCashierEntry(storeId, entryId, m.userId, {
                denom1000: d.denom1000,
                denom500: d.denom500,
                denom200: d.denom200,
                denom100: d.denom100,
                denom50: d.denom50,
                denom20: d.denom20,
                coins: d.coins,
                gcashAmount: d.gcashAmount,
            });
        });
        await Promise.all(cashierSaves);
        inlineEdit.rowId = null;
        await loadData();
        showToast('Entry updated', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save', 'error');
    } finally {
        inlineEdit.saving = false;
    }
};

// ── Delete ───────────────────────────────────────────────────
const deleteModal = reactive({
    show: false,
    row: null as DailySalesRow | null,
    loading: false,
});

const confirmDelete = (row: DailySalesRow) => {
    deleteModal.row = row;
    deleteModal.show = true;
};

const onDeleteConfirm = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !deleteModal.row) return;
    deleteModal.loading = true;
    try {
        await deleteDailySalesEntry(storeId, deleteModal.row.id);
        deleteModal.show = false;
        deleteModal.row = null;
        await loadData();
        showToast('Entry deleted', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to delete', 'error');
    } finally {
        deleteModal.loading = false;
    }
};

// ── CSV import / export ──────────────────────────────────────
// CSV layout (matches exported daily-sales spreadsheets):
//   Date, COH (cashier…), GCash (cashier…), Senior, Expense,
//   Total GCash, Total COH, Total Sales, POS, Actual COH,
//   Kulang Remit, Short if (-), Sales Needed
type ImportResult = {
    imported: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
};

const isExporting = ref(false);
const isImporting = ref(false);
const importProgress = ref(0);
const importResult = ref<ImportResult | null>(null);
const importFileInput = ref<HTMLInputElement | null>(null);

// Quote a CSV cell only when it contains a comma, quote or newline.
const csvCell = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// "5/31/2026 (Sun)" — the spreadsheet's date format, in the store timezone.
const csvDate = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const tz = storeTimezone.value;
    const md = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, month: 'numeric', day: 'numeric', year: 'numeric',
    }).format(date);
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
    return `${md} (${wd})`;
};

// YYYY-MM-DD in the store timezone — used both as the API date and as a dedupe key.
const isoDateKey = (d: string | Date) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: storeTimezone.value, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}`;
};

const handleExport = () => {
    isExporting.value = true;
    try {
        const cashiers = cashierMembers.value;
        const header = [
            'Date',
            ...cashiers.map((m) => `COH (${memberName(m)})`),
            ...cashiers.map((m) => `GCash (${memberName(m)})`),
            'Senior', 'Expense', 'Total GCash', 'Total COH', 'Total Sales',
            'POS', 'Actual COH', 'Kulang Remit', 'Short if (-)', 'Sales Needed',
        ];
        const lines = [header.map(csvCell).join(',')];
        for (const row of rows.value) {
            lines.push([
                csvDate(row.date),
                ...cashiers.map((m) => getCashierCoh(row, m.userId)),
                ...cashiers.map((m) => getCashierGcash(row, m.userId)),
                row.totalSenior, row.expense, row.totalGcash, row.totalCoh, row.totalSales,
                row.pos, row.actualCoh, row.kulangRemit, row.shortIf, row.salesNeeded,
            ].map(csvCell).join(','));
        }
        // Trailing totals row, to match the source spreadsheets.
        lines.push([
            'Total',
            ...cashiers.map((m) => sumCashierField(m.userId, 'cashAmount')),
            ...cashiers.map((m) => sumCashierField(m.userId, 'gcashAmount')),
            sumAll('totalSenior'), sumAll('expense'), sumAll('totalGcash'),
            sumAll('totalCoh'), sumAll('totalSales'), sumAll('pos'), sumAll('actualCoh'),
            '', '', '',
        ].map(csvCell).join(','));

        const blob = new Blob(['﻿' + lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-sales-${year.value}-${String(month.value).padStart(2, '0')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        showToast('Unable to export daily sales.', 'error');
    } finally {
        isExporting.value = false;
    }
};

const triggerImport = () => {
    importResult.value = null;
    importFileInput.value?.click();
};

const downloadTemplate = () => {
    const cashiers = cashierMembers.value;
    const header = [
        'Date',
        ...cashiers.map((m) => `COH (${memberName(m)})`),
        ...cashiers.map((m) => `GCash (${memberName(m)})`),
        'Senior', 'Expense', 'Total GCash', 'Total COH', 'Total Sales',
        'POS', 'Actual COH', 'Kulang Remit', 'Short if (-)', 'Sales Needed',
    ];
    // Only Date, the per-cashier COH/GCash columns, Expense and Actual COH are
    // imported; the remaining columns are computed and ignored on import.
    const example = [
        csvDate(new Date()),
        ...cashiers.map(() => 0),
        ...cashiers.map(() => 0),
        0, 0, 0, 0, 0, 0, 0, '', '', '',
    ];
    const csv = `${header.map(csvCell).join(',')}\n${example.map(csvCell).join(',')}\n`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily-sales-template.csv';
    a.click();
    URL.revokeObjectURL(url);
};

// Minimal RFC-4180 line splitter (handles quoted fields with embedded commas).
const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else quoted = false;
            } else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
};

const toNum = (v: string | undefined): number => {
    if (!v) return 0;
    const n = Number(v.replace(/[₱,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

// Parse "5/31/2026 (Sun)" / "5/31/2026" / "2026-05-31" → YYYY-MM-DD (or null).
const parseCsvDate = (raw: string): string | null => {
    const token = raw.replace(/\(.*?\)/, '').trim();
    if (!token) return null;
    let y: number, mo: number, d: number;
    const iso = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const mdy = token.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (iso) { y = +iso[1]; mo = +iso[2]; d = +iso[3]; }
    else if (mdy) { mo = +mdy[1]; d = +mdy[2]; y = +mdy[3]; }
    else return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// Spread a flat COH total across bill denominations (largest first), so the
// imported cash total round-trips even without a real denomination breakdown.
const decomposeCash = (amount: number) => {
    let rem = Math.floor(Math.max(0, amount));
    const take = (unit: number) => { const c = Math.floor(rem / unit); rem -= c * unit; return c; };
    const denom1000 = take(1000);
    const denom500 = take(500);
    const denom200 = take(200);
    const denom100 = take(100);
    const denom50 = take(50);
    const denom20 = take(20);
    const coins = Math.max(0, amount) - Math.floor(Math.max(0, amount)) + rem;
    return { denom1000, denom500, denom200, denom100, denom50, denom20, coins };
};

const pendingImportFile = ref<File | null>(null);
const showImportPreview = ref(false);

const handleImportFileSelected = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !storeContext.currentStoreId) return;
    input.value = '';
    importResult.value = null;
    pendingImportFile.value = file;
    showImportPreview.value = true;
};

const cancelImport = () => {
    showImportPreview.value = false;
    pendingImportFile.value = null;
};

const confirmImport = async () => {
    const file = pendingImportFile.value;
    const storeId = storeContext.currentStoreId;
    if (!file || !storeId) return;

    isImporting.value = true;
    importProgress.value = 0;
    importResult.value = null;

    const result: ImportResult = { imported: 0, updated: 0, failed: 0, errors: [] };
    try {
        const text = (await file.text()).replace(/^﻿/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
            throw new Error('File has no data rows.');
        }

        const header = parseCsvLine(lines[0]);
        const findCol = (label: string) =>
            header.findIndex((h) => h.toLowerCase() === label.toLowerCase());
        const dateCol = findCol('Date');
        const expenseCol = findCol('Expense');
        const actualCohCol = findCol('Actual COH');
        if (dateCol < 0) throw new Error('Missing "Date" column.');

        // Map each cashier member to its COH / GCash column by header name.
        const cashierCols = cashierMembers.value.map((m) => {
            const name = memberName(m).toLowerCase();
            return {
                userId: m.userId,
                cohCol: header.findIndex((h) => h.toLowerCase() === `coh (${name})`),
                gcashCol: header.findIndex((h) => h.toLowerCase() === `gcash (${name})`),
            };
        });

        // Existing entries for the currently-loaded month → update instead of create.
        const existingByDate: Record<string, string> = {};
        rows.value.forEach((r) => { existingByDate[isoDateKey(r.date)] = r.id; });

        const dataRows = lines.slice(1);
        for (let i = 0; i < dataRows.length; i++) {
            const cells = parseCsvLine(dataRows[i]);
            const rowNum = i + 2; // 1-based incl. header
            const first = cells[dateCol] ?? '';
            if (first.toLowerCase().startsWith('total')) continue; // trailing totals row

            const date = parseCsvDate(first);
            if (!date) {
                result.failed++;
                result.errors.push({ row: rowNum, message: `Unrecognized date "${first}".` });
                importProgress.value = Math.round(((i + 1) / dataRows.length) * 100);
                continue;
            }

            const expense = expenseCol >= 0 ? toNum(cells[expenseCol]) : 0;
            const actualCohRaw = actualCohCol >= 0 ? cells[actualCohCol] : '';
            const actualCoh = actualCohRaw && actualCohRaw.trim() !== '' ? toNum(actualCohRaw) : null;

            try {
                const existingId = existingByDate[date];
                let entryId: string;
                if (existingId) {
                    await updateDailySalesEntry(storeId, existingId, { expense, actualCoh });
                    entryId = existingId;
                    result.updated++;
                } else {
                    const created = await createDailySalesEntry(storeId, { date, expense, actualCoh });
                    entryId = (created as { entry: { id: string } }).entry.id;
                    existingByDate[date] = entryId;
                    result.imported++;
                }

                for (const c of cashierCols) {
                    if (c.cohCol < 0 && c.gcashCol < 0) continue;
                    const coh = c.cohCol >= 0 ? toNum(cells[c.cohCol]) : 0;
                    const gcashAmount = c.gcashCol >= 0 ? toNum(cells[c.gcashCol]) : 0;
                    if (coh <= 0 && gcashAmount <= 0) continue;
                    await upsertCashierEntry(storeId, entryId, c.userId, {
                        ...decomposeCash(coh),
                        gcashAmount,
                    });
                }
            } catch (e: any) {
                result.failed++;
                result.errors.push({ row: rowNum, message: e?.message ?? 'Failed to save row.' });
            }
            importProgress.value = Math.round(((i + 1) / dataRows.length) * 100);
        }

        importResult.value = result;
        if (result.imported > 0 || result.updated > 0) await loadData();
    } catch (e: any) {
        importResult.value = {
            imported: 0, updated: 0, failed: 1,
            errors: [{ row: 0, message: e?.message ?? 'Import failed. Check the file and try again.' }],
        };
    } finally {
        isImporting.value = false;
        importProgress.value = 0;
        showImportPreview.value = false;
        pendingImportFile.value = null;
    }
};

// ── Goal modal ───────────────────────────────────────────────
const goalModal = reactive({ open: false, value: 0, date: todayStr(), saving: false });

const openGoalModal = () => {
    goalModal.value = goal.value;
    goalModal.date = todayStr();
    goalModal.open = true;
};

const saveGoal = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    goalModal.saving = true;
    try {
        await setDailySalesGoal(storeId, goalModal.value, goalModal.date);
        goal.value = goalModal.value;
        goalModal.open = false;
        await loadData();
        showToast('Goal updated', 'success');
    } catch (e: any) {
        showToast(e?.message ?? 'Failed to save goal', 'error');
    } finally {
        goalModal.saving = false;
    }
};
</script>

<style scoped>
.ds-page { padding: 1.5rem; max-width: 100%; font-family: var(--app-font-sans); }
.ds-page input, .ds-page select, .ds-page button { font-family: inherit; }
.ds-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; gap: 1rem; flex-wrap: nowrap; }
.ds-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
.ds-subtitle { font-size: 0.82rem; color: #6b7280; margin: 0.2rem 0 0; }
.ds-header-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; white-space: nowrap; }

/* CSV import progress / result */
.ds-import-progress { margin-bottom: 0.75rem; }
.ds-import-progress__label { font-size: 0.78rem; color: #6b7280; margin-bottom: 0.25rem; }
.ds-import-progress__track { height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.ds-import-progress__fill { height: 100%; background: #0d9488; transition: width 0.2s ease; }

.ds-import-result { margin-bottom: 0.75rem; border-radius: 8px; padding: 0.6rem 0.85rem; font-size: 0.82rem; }
.ds-import-result--ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.ds-import-result--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.ds-import-result__summary { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.ds-import-result__close { background: none; border: none; cursor: pointer; color: inherit; font-size: 0.9rem; line-height: 1; }
.ds-import-result__errors { margin: 0.4rem 0 0; padding-left: 1.1rem; max-height: 140px; overflow-y: auto; }
.ds-import-result__errors li { margin: 0.1rem 0; }

.ds-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.ds-month-nav { display: flex; align-items: center; gap: 0.5rem; }
.ds-month-label { font-weight: 600; min-width: 120px; text-align: center; }
.ds-record-count { font-size: 0.82rem; color: #6b7280; }

.ds-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e5e7eb; border-radius: 8px; }
.ds-table { width: 100%; min-width: 860px; border-collapse: collapse; font-size: 0.8rem; }
.ds-table th { background: #f0fdfa; border-bottom: 2px solid #99f6e4; padding: 0.5rem 0.4rem; text-align: left; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e; word-break: break-word; line-height: 1.3; }
.ds-table td { padding: 0.35rem 0.4rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; white-space: nowrap; }
.ds-table tbody tr:hover { background: #f9fafb; }
.col-date { min-width: 90px; white-space: normal; }
.col-highlight { background: #f0fdf4; }
.col-actions { display: flex; gap: 0.25rem; align-items: center; }
.ds-empty { text-align: center; color: #9ca3af; padding: 2rem; }
.ds-total-row td { background: #f9fafb; border-top: 2px solid #e5e7eb; }
.fw-bold { font-weight: 700; }
.text-danger { color: #dc2626; }
.text-success { color: #16a34a; }

/* Add row / inline edit row */
.ds-add-row td { background: #eff6ff; }
.ds-add-row td:hover { background: #eff6ff; }
.ds-editing-row td { background: #fefce8; }
.ds-editing-row td:hover { background: #fefce8; }
.ds-input { border: 1px solid #93c5fd; border-radius: 5px; padding: 0.25rem 0.35rem; font-size: 0.8rem; background: white; outline: none; }
.ds-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.ds-input--num { width: 65px; }
.ds-computed { color: #374151; font-weight: 500; }
.ds-loading-dot { color: #9ca3af; }
.ds-coh-cell { display: flex; flex-direction: row; align-items: center; gap: 0.35rem; white-space: nowrap; }
.ds-coh-amount { font-size: 0.8rem; font-weight: 500; }

.btn-denom-edit {
    padding: 0.2rem 0.5rem;
    font-size: 0.72rem;
    background: #dbeafe;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
}
.btn-denom-edit:hover { background: #bfdbfe; }

.btn-success-solid { background: #16a34a; color: white; border: none; padding: 0.3rem 0.75rem; border-radius: 5px; cursor: pointer; font-size: 0.82rem; }
.btn-success-solid:hover:not(:disabled) { background: #15803d; }
.btn-success-solid:disabled { opacity: 0.6; cursor: not-allowed; }

/* Existing row interactions */
.denom-btn { background: none; border: none; cursor: pointer; color: inherit; text-decoration: underline dotted #9ca3af; padding: 0; font-size: inherit; }
.denom-btn:hover { color: #2563eb; }
.cell-edit { background: none; border: none; cursor: pointer; color: inherit; padding: 0; font-size: inherit; width: 100%; text-align: left; }
.cell-edit:hover { color: #2563eb; text-decoration: underline; }

.btn-icon { padding: 0.25rem 0.4rem; border-radius: 4px; border: none; cursor: pointer; display: flex; align-items: center; }
.btn-warning-soft { background: #fef3c7; color: #92400e; }
.btn-warning-soft:hover { background: #fde68a; }
.btn-danger-soft { background: #fee2e2; color: #991b1b; }
.btn-danger-soft:hover { background: #fecaca; }

/* Modals */
.ds-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.ds-modal { background: white; border-radius: 10px; padding: 1.5rem; min-width: 320px; max-width: 480px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.ds-modal--wide { max-width: 600px; }
.ds-modal h3 { margin: 0 0 1.25rem; font-size: 1rem; font-weight: 700; }
.ds-form-group { margin-bottom: 0.75rem; }
.ds-form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.3rem; }
.ds-modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }

/* Cashier edit modal */
.ds-cashier-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; }
.ds-cashier-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem; }
.ds-cashier-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; }
.ds-cashier-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }

/* ── Tablet: sticky date column ── */
@media (max-width: 1100px) {
    .ds-table th.col-date,
    .ds-table td.col-date {
        position: sticky;
        left: 0;
        z-index: 2;
        /* shadow to hint scrollability */
        box-shadow: 2px 0 4px rgba(0,0,0,0.06);
    }
    .ds-table th.col-date { background: #f0fdfa; }
    .ds-table td.col-date { background: #ffffff; }
    .ds-add-row td.col-date { background: #eff6ff !important; }
    .ds-editing-row td.col-date { background: #fefce8 !important; }
    .ds-total-row td.col-date { background: #f9fafb !important; }
}

/* ── Mobile: hide table, show cards ── */
.ds-cards { display: none; }

@media (max-width: 640px) {
    .ds-page { padding: 0.75rem 0.75rem 2rem; }
    .ds-header { flex-wrap: wrap; }
    .ds-table-wrap { display: none; }
    .ds-cards { display: flex; flex-direction: column; gap: 0.65rem; }
}

/* ── Card styles ── */
.ds-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #ffffff; }
.ds-card--add { border-color: #93c5fd; }
.ds-card--editing { border-color: #fde68a; }
.ds-card--total { background: #f9fafb; }

.ds-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.85rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.ds-card--add .ds-card-header { background: #dbeafe; border-color: #93c5fd; }
.ds-card--editing .ds-card-header { background: #fef9c3; border-color: #fde68a; }
.ds-card--total .ds-card-header { background: #f1f5f9; border-color: #e5e7eb; }

.ds-card-date { font-weight: 600; font-size: 0.875rem; color: #111827; }
.ds-card-header-actions { display: flex; gap: 0.35rem; }

.ds-card-body { padding: 0.75rem 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }

.ds-card-cashier-label {
    font-size: 0.67rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #0f766e;
    padding-top: 0.4rem;
    border-top: 1px solid #f3f4f6;
    margin-top: 0.1rem;
}

.ds-card-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.ds-card-field { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; }
.ds-card-field--full { grid-column: 1 / -1; }
.ds-card-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }

.ds-card-summary {
    margin-top: 0.15rem;
    border-top: 1px solid #e5e7eb;
    padding-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}
.ds-card-summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    color: #374151;
    padding: 0.1rem 0;
}
.ds-card-summary-row--highlight {
    background: #f0fdf4;
    padding: 0.25rem 0.4rem;
    border-radius: 5px;
    color: #15803d;
    font-weight: 500;
    margin: 0.1rem 0;
}

.ds-card-actions {
    padding: 0.55rem 0.85rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    background: #fafafa;
}
.ds-card--add .ds-card-actions { background: #eff6ff; border-color: #93c5fd; }
.ds-card--editing .ds-card-actions { background: #fefce8; border-color: #fde68a; }

.ds-card-empty {
    text-align: center;
    color: #9ca3af;
    padding: 2rem;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
}
</style>
