<template>
    <div class="sc-page">
        <PullToRefresh :on-refresh="reload" :disabled="isLoading" />

        <div class="sc-header">
            <div>
                <h1 class="sc-title">Schedule</h1>
                <p class="sc-subtitle">
                    {{ canEdit ? 'Set weekly shifts, rest days and payout for your staff' : 'Your store’s published weekly schedule' }}
                </p>
            </div>
            <div class="sc-header-actions">
                <template v-if="canEdit && activeTab === 'week'">
                    <button class="secondary-button button-compact" @click="showPresets = true">
                        <mdicon name="clock-outline" size="16" /> Shifts
                    </button>
                    <button class="secondary-button button-compact" @click="guard(openRates)">
                        <mdicon name="cash-multiple" size="16" /> Rates
                    </button>
                    <button class="secondary-button button-compact" :disabled="isPublished" @click="guard(copyLastWeek)">
                        <mdicon name="content-copy" size="16" /> Copy last week
                    </button>
                    <button
                        v-if="!isPublished"
                        class="primary-button button-compact"
                        :disabled="isSaving || !hasRows"
                        @click="guard(save)"
                    >
                        <mdicon name="content-save" size="16" /> {{ isSaving ? 'Saving…' : 'Save draft' }}
                    </button>
                    <button
                        v-if="week?.id && !isPublished"
                        class="secondary-button button-compact"
                        :disabled="isSaving"
                        title="Delete this week's schedule"
                        @click="guard(deleteWeek)"
                    >
                        <mdicon name="trash-can-outline" size="16" /> Delete week
                    </button>
                    <button
                        class="primary-button button-compact"
                        :class="{ 'primary-button--danger': isPublished }"
                        :disabled="isSaving || !week?.id"
                        @click="guard(togglePublish)"
                    >
                        <mdicon :name="isPublished ? 'lock-open-variant' : 'send-check'" size="16" />
                        {{ isPublished ? 'Unpublish' : 'Publish' }}
                    </button>
                </template>
            </div>
        </div>

        <div class="sc-tabs" role="tablist">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                class="sc-tab"
                :class="{ 'is-active': activeTab === tab.key }"
                role="tab"
                :aria-selected="activeTab === tab.key"
                @click="activeTab = tab.key"
            >
                <mdicon :name="tab.icon" size="15" />
                {{ tab.label }}
            </button>
        </div>

        <ScheduleStackedWeeks
            v-if="activeTab === 'stacked'"
            :store-id="storeId"
            :currency="currency"
            @edit-week="jumpToWeek"
        />

        <ScheduleMonthSummary
            v-else-if="activeTab === 'month'"
            :store-id="storeId"
            :currency="currency"
        />

        <ScheduleMemberCalendar
            v-else-if="activeTab === 'calendar'"
            :store-id="storeId"
            :members="calendarMembers"
            :own-member-id="ownMemberId"
            :can-pick-member="canEdit"
        />

        <template v-else>
        <div class="sc-controls">
            <div class="sc-week-nav">
                <button class="btn btn-outline-secondary btn-sm" @click="goWeek(-1)">
                    <mdicon name="chevron-left" size="16" />
                </button>
                <span class="sc-week-label">{{ weekLabel }}</span>
                <button class="btn btn-outline-secondary btn-sm" @click="goWeek(1)">
                    <mdicon name="chevron-right" size="16" />
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="goToday">This week</button>
            </div>
            <div class="sc-status">
                <span class="sc-badge" :class="isPublished ? 'sc-badge--published' : 'sc-badge--draft'">
                    {{ isPublished ? 'Published' : 'Draft' }}
                </span>
                <span v-if="canEdit && !isPublished" class="sc-status-hint">
                    Staff can’t see this week until you publish it.
                </span>
                <span v-if="isDirty && !isPublished" class="sc-status-hint sc-status-hint--warn">
                    Unsaved changes
                </span>
            </div>
        </div>

        <SkeletonLoader v-if="isLoading" :rows="4" label="Loading schedule…" />

        <!-- Staff view of a week the owner hasn’t published yet -->
        <div v-else-if="!canEdit && !isPublished" class="sc-empty">
            <mdicon name="calendar-clock" size="32" />
            <p>This week hasn’t been published yet. Check back once your manager finalises it.</p>
        </div>

        <div v-else-if="!hasRows && !canEdit" class="sc-empty">
            <mdicon name="calendar-blank" size="32" />
            <p>No schedule for this week.</p>
        </div>

        <template v-else>
        <div class="sc-table-wrap">
            <table class="sc-table">
                <thead>
                    <tr>
                        <th class="sc-col-staff">Staff</th>
                        <th v-for="(date, i) in weekDates" :key="date" class="sc-col-day" :class="{ 'sc-col-first-day': i === 0 }">
                            <div class="sc-day-name" :class="{ 'sc-day-name--weekend': i === 0 || i === 6 }">
                                {{ dayLabel(i) }}
                            </div>
                            <div class="sc-day-date">{{ shortDate(date) }}</div>
                        </th>
                        <th class="sc-col-num sc-col-seam">Days</th>
                        <th class="sc-col-num sc-col-ot">OT</th>
                        <th class="sc-col-num">less CA</th>
                        <th class="sc-col-num sc-col-payout">Payout</th>
                        <th class="sc-col-remarks">Remarks</th>
                        <th v-if="canEdit" class="sc-col-actions"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in rows" :key="row.storeMemberId" :class="{ 'sc-row--self': row.isSelf }">
                        <td class="sc-col-staff">
                            <span class="sc-staff-name">{{ row.name }}</span>
                            <span v-if="row.isSelf" class="sc-you">you</span>
                        </td>

                        <td
                            v-for="(date, i) in weekDates"
                            :key="date"
                            class="sc-col-day"
                            :class="{ 'sc-col-first-day': i === 0 }"
                        >
                            <button
                                v-if="canEdit"
                                class="sc-cell sc-cell--editable"
                                :class="{ 'sc-cell--rd': shiftFor(row, date)?.isRestDay, 'sc-cell--empty': !shiftFor(row, date) }"
                                :disabled="isPublished"
                                :title="shiftTitle(row, date)"
                                @click="openShiftEditor(row, date)"
                            >
                                <mdicon
                                    v-for="glyph in shiftGlyphs(row, date)"
                                    :key="glyph.name"
                                    :name="glyph.name"
                                    :style="{ color: glyph.color }"
                                    size="13"
                                    class="sc-cell-icon"
                                    aria-hidden="true"
                                />
                                <span>{{ cellLabel(row, date) }}</span>
                            </button>
                            <span
                                v-else
                                class="sc-cell"
                                :class="{ 'sc-cell--rd': shiftFor(row, date)?.isRestDay }"
                                :title="shiftTitle(row, date)"
                            >
                                <mdicon
                                    v-for="glyph in shiftGlyphs(row, date)"
                                    :key="glyph.name"
                                    :name="glyph.name"
                                    :style="{ color: glyph.color }"
                                    size="13"
                                    class="sc-cell-icon"
                                    aria-hidden="true"
                                />
                                <span>{{ cellLabel(row, date) }}</span>
                            </span>
                        </td>

                        <!-- Pay columns. `pay` is null when the backend withheld
                             them for this row; there is nothing to hide client-side. -->
                        <template v-if="row.pay">
                            <td class="sc-col-num sc-col-seam">{{ row.pay.daysWorked }}</td>
                            <td class="sc-col-num sc-col-ot">
                                <div v-if="canEdit && !isPublished" class="sc-ot-cell">
                                    <input
                                        type="number"
                                        class="sc-input sc-input--num"
                                        :class="{ 'sc-input--auto': row.pay.otAuto }"
                                        min="0"
                                        step="0.5"
                                        :value="row.pay.otHours"
                                        :title="otTitle(row)"
                                        @input="onOtInput(row, $event)"
                                    />
                                    <button
                                        v-if="!row.pay.otAuto"
                                        class="sc-ot-reset"
                                        :title="`Back to the roster figure (${formatNumber(row.pay.computedOtHours)}h)`"
                                        @click="resetOt(row)"
                                    >auto</button>
                                </div>
                                <span v-else>{{ formatNumber(row.pay.otHours) }}</span>
                            </td>
                            <td class="sc-col-num">
                                <button
                                    v-if="canEdit && !isPublished"
                                    class="sc-linkish"
                                    :disabled="!row.id"
                                    @click="openDeductions(row)"
                                >{{ formatMoney(row.pay.lessCa) }}</button>
                                <span v-else>{{ formatMoney(row.pay.lessCa) }}</span>
                            </td>
                            <td class="sc-col-num sc-col-payout">{{ formatMoney(row.pay.payout) }}</td>
                            <td class="sc-col-remarks">
                                <input
                                    v-if="canEdit && !isPublished"
                                    type="text"
                                    class="sc-input"
                                    :value="row.pay.remarks ?? ''"
                                    placeholder="—"
                                    @input="onRemarksInput(row, $event)"
                                />
                                <span v-else class="sc-remarks-text">{{ row.pay.remarks || '—' }}</span>
                                <div v-if="row.pay.caBalance > 0" class="sc-ca-balance">
                                    ca bal: {{ formatMoney(row.pay.caBalance) }}
                                </div>
                            </td>
                        </template>
                        <template v-else>
                            <td class="sc-col-num sc-col-seam sc-hidden" colspan="4" title="Only managers and the staff member can see pay">
                                <mdicon name="lock-outline" size="14" />
                            </td>
                            <td class="sc-col-remarks sc-hidden"></td>
                        </template>

                        <td v-if="canEdit" class="sc-col-actions">
                            <button
                                class="sc-icon-button"
                                :disabled="isPublished"
                                title="Remove from this week"
                                @click="removeRow(row)"
                            >
                                <mdicon name="close" size="16" />
                            </button>
                        </td>
                    </tr>

                    <tr v-if="rows.length === 0">
                        <td :colspan="totalColumns" class="sc-empty-row">
                            No staff on this week’s schedule yet.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Under 640px the 7-column grid cannot fit, so each staff member
             becomes a card of seven day rows. Same data, same handlers. -->
        <div class="sc-mobile">
            <div
                v-for="row in rows"
                :key="row.storeMemberId"
                class="sc-mcard"
                :class="{ 'sc-mcard--self': row.isSelf }"
            >
                <div class="sc-mcard-head">
                    <span class="sc-staff-name">{{ row.name }}</span>
                    <span v-if="row.isSelf" class="sc-you">you</span>
                    <button
                        v-if="canEdit"
                        class="sc-icon-button sc-mcard-remove"
                        :disabled="isPublished"
                        title="Remove from this week"
                        @click="removeRow(row)"
                    >
                        <mdicon name="close" size="16" />
                    </button>
                </div>

                <button
                    v-for="(date, i) in weekDates"
                    :key="date"
                    class="sc-mday"
                    :class="{ 'sc-mday--rd': shiftFor(row, date)?.isRestDay }"
                    :disabled="!canEdit || isPublished"
                    @click="openShiftEditor(row, date)"
                >
                    <span class="sc-mday-label" :class="{ 'sc-mday-label--weekend': i === 0 || i === 6 }">
                        {{ dayLabel(i).slice(0, 3) }} {{ shortDate(date) }}
                    </span>
                    <span class="sc-mday-value">
                        <mdicon
                            v-for="glyph in shiftGlyphs(row, date)"
                            :key="glyph.name"
                            :name="glyph.name"
                            :style="{ color: glyph.color }"
                            size="14"
                            aria-hidden="true"
                        />
                        {{ cellLabel(row, date) }}
                    </span>
                </button>

                <div v-if="row.pay" class="sc-mpay">
                    <div class="sc-mpay-grid">
                        <div class="sc-mstat">
                            <span class="sc-mstat-label">Days</span>
                            <span class="sc-mstat-value">{{ row.pay.daysWorked }}</span>
                        </div>
                        <div class="sc-mstat">
                            <span class="sc-mstat-label">OT</span>
                            <input
                                v-if="canEdit && !isPublished"
                                type="number"
                                class="sc-input sc-input--num"
                                min="0"
                                step="0.5"
                                :value="row.pay.otHours"
                                @input="onOtInput(row, $event)"
                            />
                            <span v-else class="sc-mstat-value">{{ formatNumber(row.pay.otHours) }}</span>
                        </div>
                        <div class="sc-mstat">
                            <span class="sc-mstat-label">less CA</span>
                            <button
                                v-if="canEdit && !isPublished"
                                class="sc-linkish"
                                :disabled="!row.id"
                                @click="openDeductions(row)"
                            >{{ formatMoney(row.pay.lessCa) }}</button>
                            <span v-else class="sc-mstat-value">{{ formatMoney(row.pay.lessCa) }}</span>
                        </div>
                        <div class="sc-mstat sc-mstat--payout">
                            <span class="sc-mstat-label">Payout</span>
                            <span class="sc-mstat-value">{{ formatMoney(row.pay.payout) }}</span>
                        </div>
                    </div>
                    <input
                        v-if="canEdit && !isPublished"
                        type="text"
                        class="sc-input sc-mremarks"
                        :value="row.pay.remarks ?? ''"
                        placeholder="Remarks"
                        @input="onRemarksInput(row, $event)"
                    />
                    <div v-else-if="row.pay.remarks" class="sc-mremarks-text">{{ row.pay.remarks }}</div>
                    <div v-if="row.pay.caBalance > 0" class="sc-ca-balance">
                        ca bal: {{ formatMoney(row.pay.caBalance) }}
                    </div>
                </div>

                <div v-else class="sc-mpay sc-mpay--hidden">
                    <mdicon name="lock-outline" size="14" /> Pay is private to this staff member
                </div>
            </div>

            <div v-if="rows.length === 0" class="sc-empty-row">
                No staff on this week's schedule yet.
            </div>
        </div>
        </template>


        <div v-if="canEdit && !isPublished && availableMembers.length > 0" class="sc-add-staff">
            <select v-model="memberToAdd" class="sc-input sc-select">
                <option value="">Add staff to this week…</option>
                <option v-for="m in availableMembers" :key="m.storeMemberId" :value="m.storeMemberId">
                    {{ m.name }} ({{ m.role }})
                </option>
            </select>
            <button class="secondary-button button-compact" :disabled="!memberToAdd" @click="addRow">
                <mdicon name="plus" size="16" /> Add
            </button>
        </div>

        </template>

        <!-- ── Shift editor ── -->
        <Modal v-if="shiftEditor" @close="shiftEditor = null">
            <div class="sc-modal">
                <h2 class="sc-modal-title">{{ shiftEditor.rowName }} — {{ shortDate(shiftEditor.date) }}</h2>

                <div class="sc-preset-grid">
                    <button class="sc-preset sc-preset--rd" @click="applyRestDay">RD (rest day)</button>
                    <button
                        v-for="preset in presets"
                        :key="preset.id"
                        class="sc-preset"
                        @click="applyPreset(preset)"
                    >
                        <span class="sc-preset-label">
                            <mdicon
                                v-for="glyph in glyphsFor(preset.icon)"
                                :key="glyph.name"
                                :name="glyph.name"
                                :style="{ color: glyph.color }"
                                size="14"
                                class="sc-cell-icon"
                                aria-hidden="true"
                            />
                            {{ preset.label }}
                        </span>
                        <span class="sc-preset-time">{{ formatShiftRange(preset.startMinute, preset.endMinute) }}</span>
                    </button>
                </div>

                <div class="sc-custom">
                    <span class="sc-custom-label">Custom</span>
                    <input type="time" v-model="shiftEditor.start" class="sc-input" />
                    <span>→</span>
                    <input type="time" v-model="shiftEditor.end" class="sc-input" />
                    <label class="sc-overnight">
                        <input type="checkbox" v-model="shiftEditor.overnight" />
                        ends next day
                    </label>
                </div>

                <div class="sc-modal-actions">
                    <button class="ghost-button" @click="clearShift">Clear</button>
                    <button class="ghost-button" @click="shiftEditor = null">Cancel</button>
                    <button class="primary-button" @click="applyCustom">Apply</button>
                </div>
            </div>
        </Modal>

        <!-- ── Shift presets manager ── -->
        <Modal v-if="showPresets" @close="showPresets = false">
            <div class="sc-modal">
                <h2 class="sc-modal-title">Shift presets</h2>
                <p class="sc-modal-sub">Named shifts so filling the grid is one click.</p>

                <table class="sc-mini-table">
                    <tbody>
                        <tr v-for="preset in presets" :key="preset.id">
                            <td>
                                <mdicon
                                    v-for="glyph in glyphsFor(preset.icon)"
                                    :key="glyph.name"
                                    :name="glyph.name"
                                    :style="{ color: glyph.color }"
                                    size="15"
                                    class="sc-cell-icon"
                                    aria-hidden="true"
                                />
                                {{ preset.label }}
                            </td>
                            <td class="sc-muted">{{ formatShiftRange(preset.startMinute, preset.endMinute) }}</td>
                            <td>
                                <button class="sc-icon-button" @click="guard(() => removePreset(preset))">
                                    <mdicon name="delete-outline" size="16" />
                                </button>
                            </td>
                        </tr>
                        <tr v-if="presets.length === 0">
                            <td colspan="3" class="sc-muted">No presets yet.</td>
                        </tr>
                    </tbody>
                </table>

                <div class="sc-inline-form">
                    <span class="sc-inline-form-label">New preset</span>
                    <input type="text" v-model="newPreset.label" class="sc-input sc-input--grow" placeholder="Label (e.g. Opening)" />
                    <input type="time" v-model="newPreset.start" class="sc-input" />
                    <span class="sc-muted">→</span>
                    <input type="time" v-model="newPreset.end" class="sc-input" @change="autoSuggestIcon" />
                    <label class="sc-overnight">
                        <input type="checkbox" v-model="newPreset.overnight" />
                        ends next day
                    </label>
                    <button class="secondary-button button-compact" @click="guard(addPreset)">
                        <mdicon name="plus" size="16" /> Add
                    </button>
                </div>

                <div class="sc-icon-picker">
                    <span class="sc-inline-form-label">Icon</span>
                    <button
                        v-for="option in SHIFT_ICON_OPTIONS"
                        :key="option.token"
                        type="button"
                        class="sc-icon-option"
                        :class="{ 'is-active': newPreset.icon === option.token }"
                        :title="option.label"
                        @click="newPreset.icon = option.token"
                    >
                        <template v-if="option.glyphs.length">
                            <mdicon
                                v-for="glyph in option.glyphs"
                                :key="glyph.name"
                                :name="glyph.name"
                                :style="{ color: glyph.color }"
                                size="16"
                            />
                        </template>
                        <span v-else class="sc-icon-none">—</span>
                    </button>
                </div>

                <div class="sc-modal-actions">
                    <button class="primary-button" @click="showPresets = false">Done</button>
                </div>
            </div>
        </Modal>

        <!-- ── Pay rates ── -->
        <Modal v-if="showRates" width="54rem" @close="showRates = false">
            <div class="sc-modal">
                <h2 class="sc-modal-title">Pay rates</h2>
                <p class="sc-modal-sub">
                    Rates are effective-dated — changing one opens a new record and leaves published weeks untouched.
                    <strong>Each row must be saved individually</strong>; a week can't be published until everyone on it has a rate.
                    <em>Break</em> is unpaid minutes per worked day, deducted before overtime is calculated — a 9AM–6PM shift with a
                    60-minute break is exactly one 8-hour day and generates no OT.
                </p>

                <div class="sc-table-scroll">
                <table class="sc-mini-table">
                    <thead>
                        <tr>
                            <th>Staff</th>
                            <th>Daily rate</th>
                            <th>Hrs/day</th>
                            <th>Break</th>
                            <th>OT ×</th>
                            <th>OT /hr</th>
                            <th>Effective</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="rate in rateDrafts" :key="rate.storeMemberId">
                            <td>
                                {{ rate.name }}
                                <span v-if="!rate.saved" class="sc-rate-flag">Not set</span>
                                <span v-else-if="rate.dirty" class="sc-rate-flag sc-rate-flag--dirty">Unsaved</span>
                            </td>
                            <td><input type="number" min="0" step="0.01" v-model.number="rate.dailyRate" class="sc-input sc-input--num" @input="rate.dirty = true" /></td>
                            <td><input type="number" min="1" max="24" step="0.5" v-model.number="rate.hoursPerDay" class="sc-input sc-input--num" @input="rate.dirty = true" /></td>
                            <td>
                                <input
                                    type="number"
                                    min="0"
                                    max="480"
                                    step="15"
                                    v-model.number="rate.breakMinutes"
                                    class="sc-input sc-input--num"
                                    title="Unpaid break per worked day, deducted before OT is calculated"
                                    @input="rate.dirty = true"
                                />
                            </td>
                            <td><input type="number" min="0" max="5" step="0.05" v-model.number="rate.otMultiplier" class="sc-input sc-input--num" @input="rate.dirty = true" /></td>
                            <td class="sc-muted">{{ formatMoney(previewOtRate(rate)) }}</td>
                            <td><input type="date" v-model="rate.effectiveFrom" class="sc-input" @input="rate.dirty = true" /></td>
                            <td>
                                <button
                                    class="secondary-button button-compact"
                                    :class="{ 'sc-rate-save--needed': !rate.saved || rate.dirty }"
                                    @click="guard(() => saveRate(rate))"
                                >Save</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                </div>

                <div class="sc-modal-actions">
                    <button class="primary-button" @click="showRates = false">Done</button>
                </div>
            </div>
        </Modal>

        <!-- ── Cash advances / deductions ── -->
        <Modal v-if="deductionEditor" width="50rem" @close="deductionEditor = null">
            <div class="sc-modal">
                <h2 class="sc-modal-title">Cash advances — {{ deductionEditor.rowName }}</h2>
                <p class="sc-modal-sub">
                    Deduct against a specific advance. The running balance is derived, so it can’t drift.
                </p>

                <div class="sc-table-scroll">
                <table class="sc-mini-table">
                    <thead>
                        <tr>
                            <th>Taken</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Deduct this week</th>
                            <th>Skip</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="entry in deductionEditor.entries" :key="entry.advance.id">
                            <td>{{ shortDate(entry.advance.takenOn) }}</td>
                            <td>{{ formatMoney(entry.advance.amount) }}</td>
                            <td :class="{ 'sc-muted': entry.advance.balance === 0 }">{{ formatMoney(entry.advance.balance) }}</td>
                            <td>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    class="sc-input sc-input--num"
                                    v-model.number="entry.amount"
                                    :disabled="entry.skipped"
                                />
                            </td>
                            <td><input type="checkbox" v-model="entry.skipped" /></td>
                            <td class="sc-advance-actions">
                                <button class="secondary-button button-compact" @click="guard(() => saveDeduction(entry))">Save</button>
                                <button
                                    class="sc-icon-button"
                                    :disabled="entry.advance.deducted > 0"
                                    :title="entry.advance.deducted > 0
                                        ? 'This advance already has deductions against it'
                                        : 'Delete this advance'"
                                    @click="guard(() => removeAdvance(entry))"
                                >
                                    <mdicon name="delete-outline" size="16" />
                                </button>
                            </td>
                        </tr>
                        <tr v-if="deductionEditor.entries.length === 0">
                            <td colspan="6" class="sc-muted">No cash advances on record.</td>
                        </tr>
                    </tbody>
                </table>
                </div>

                <div class="sc-inline-form">
                    <span class="sc-inline-form-label">New advance</span>
                    <input type="number" min="0" step="0.01" v-model.number="newAdvance.amount" class="sc-input sc-input--num" placeholder="Amount" />
                    <input type="date" v-model="newAdvance.takenOn" class="sc-input" />
                    <input type="text" v-model="newAdvance.note" class="sc-input sc-input--grow" placeholder="Note (optional)" />
                    <button class="secondary-button button-compact" @click="guard(addAdvance)">
                        <mdicon name="plus" size="16" /> Add
                    </button>
                </div>

                <div class="sc-modal-actions">
                    <button class="primary-button" @click="guard(closeDeductions)">Done</button>
                </div>
            </div>
        </Modal>

        <ConfirmModal
            :show="confirm.show"
            :title="confirm.title"
            :message="confirm.message"
            :confirm-text="confirm.confirmText"
            variant="danger"
            @confirm="guard(confirm.onConfirm)"
            @cancel="confirm.show = false"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useStoreContextStore } from '@/stores/storeContext';
import {
    type CashAdvance,
    type ScheduleMember,
    type ScheduleRow,
    type ScheduleWeek,
    type ShiftPreset,
    copyScheduleWeek,
    deleteScheduleWeek,
    createCashAdvance,
    createShiftPreset,
    deleteCashAdvance,
    deleteShiftPreset,
    getScheduleWeek,
    listCashAdvances,
    listScheduleMembers,
    listShiftPresets,
    listStaffRates,
    publishScheduleWeek,
    saveScheduleWeek,
    setRowDeduction,
    setStaffRate,
} from '@/api/schedule';
import ScheduleStackedWeeks from './ScheduleStackedWeeks.vue';
import ScheduleMonthSummary from './ScheduleMonthSummary.vue';
import ScheduleMemberCalendar from './ScheduleMemberCalendar.vue';
import Modal from '@/components/Modal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import { useToast } from '@/composables/useToast';
import { SHIFT_ICON_OPTIONS, glyphsFor, iconLabelFor, suggestIcon } from '@/utils/shiftIcons';
import {
    addDays,
    currentWeekStart,
    dayLabel,
    formatShiftRange,
    MINUTES_IN_DAY,
    parseTimeInput,
    shortDate,
    toTimeInput,
    formatWeekRange,
} from '@/utils/shiftTime';

const storeContext = useStoreContextStore();
const { showToast } = useToast();

// The API rejects with { status, body: { code, message } }. Without this the
// rejection escapes as an unhandled promise error and the actionable message —
// e.g. "Set a daily rate before publishing" — never reaches the user.
const errorMessage = (err: unknown) => {
    const body = (err as { body?: { message?: string } } | null)?.body;
    return body?.message || 'Something went wrong. Please try again.';
};

const guard = async (fn: () => unknown | Promise<unknown>) => {
    try {
        await fn();
    } catch (err) {
        showToast(errorMessage(err), 'error');
    }
};

const weekStart = ref(currentWeekStart());
const week = ref<ScheduleWeek | null>(null);
const members = ref<ScheduleMember[]>([]);
const presets = ref<ShiftPreset[]>([]);
const advances = ref<CashAdvance[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDirty = ref(false);
const memberToAdd = ref('');

type TabKey = 'week' | 'stacked' | 'month' | 'calendar';

const activeTab = ref<TabKey>('week');
const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'week', label: 'Week', icon: 'view-week-outline' },
    { key: 'stacked', label: 'Month grid', icon: 'table-large' },
    { key: 'month', label: 'Month totals', icon: 'cash-multiple' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar-month-outline' },
];

const storeId = computed(() => storeContext.currentStoreId ?? '');
const rows = computed(() => week.value?.rows ?? []);
const hasRows = computed(() => rows.value.length > 0);
const canEdit = computed(() => week.value?.canEdit ?? false);
const isPublished = computed(() => week.value?.status === 'PUBLISHED');
const weekDates = computed(() => week.value?.dates ?? []);
const weekLabel = computed(() => formatWeekRange(weekStart.value));
const totalColumns = computed(() => 1 + 7 + 5 + (canEdit.value ? 1 : 0));

const currency = computed(() => storeContext.currentStore?.currency || 'PHP');

const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency.value, minimumFractionDigits: 2 }).format(value ?? 0);

const formatNumber = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

// Comes from the week payload rather than the grid rows: a staff member looking
// at an unpublished week has no rows, but still has a calendar of their own.
const ownMemberId = computed(() => week.value?.viewerMemberId ?? null);

const calendarMembers = computed(() => {
    if (members.value.length > 0) return members.value;
    const self = rows.value.find((r) => r.isSelf);
    if (self) {
        return [{ storeMemberId: self.storeMemberId, userId: self.userId, name: self.name, role: self.role }];
    }
    return ownMemberId.value
        ? [{ storeMemberId: ownMemberId.value, userId: '', name: 'My schedule', role: '' }]
        : [];
});

const availableMembers = computed(() => {
    const taken = new Set(rows.value.map((r) => r.storeMemberId));
    return members.value.filter((m) => !taken.has(m.storeMemberId));
});

const shiftFor = (row: ScheduleRow, date: string) => row.shifts.find((s) => s.date === date) ?? null;

// The icon travels on the shift, resolved server-side. A custom one-off shift
// has no preset and stays bare, which makes deviations from the usual pattern
// stand out.
const shiftGlyphs = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    if (!shift || shift.isRestDay) return [];
    return glyphsFor(shift.icon);
};

const shiftTitle = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    if (!shift) return '';
    if (shift.isRestDay) return 'Rest day';
    if (!shift.presetLabel) return 'Custom shift';
    const iconLabel = iconLabelFor(shift.icon);
    return iconLabel && shift.icon !== 'none' ? `${shift.presetLabel} — ${iconLabel}` : shift.presetLabel;
};

const cellLabel = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    if (!shift) return canEdit.value ? '+' : '—';
    if (shift.isRestDay) return 'RD';
    return formatShiftRange(shift.startMinute, shift.endMinute);
};

// ── Loading ──────────────────────────────────────────────────────────────────

const loadWeek = async () => {
    if (!storeId.value) return;
    isLoading.value = true;
    try {
        const { week: loaded } = await getScheduleWeek(storeId.value, weekStart.value);
        week.value = loaded;
        isDirty.value = false;
    } finally {
        isLoading.value = false;
    }
};

// Presets resolve the shift icons, so they are loaded independently of the
// other supporting data: bundling them in one Promise.all meant a failing
// cash-advance request discarded a perfectly good preset response and the grid
// rendered with no icons.
const loadPresets = async () => {
    if (!storeId.value) return;
    presets.value = (await listShiftPresets(storeId.value)).presets;
};

const loadAdvances = async () => {
    if (!storeId.value) return;
    advances.value = (await listCashAdvances(storeId.value)).advances;
};

const loadMembers = async () => {
    if (!storeId.value || !week.value?.canEdit) return;
    members.value = (await listScheduleMembers(storeId.value)).members;
};

const reload = async () => {
    // Settled, not all: one failed request must not strip data the others
    // fetched successfully. Presets go in parallel with the week so the icons
    // are present on first paint rather than popping in afterwards.
    const results = await Promise.allSettled([loadWeek(), loadPresets(), loadAdvances()]);
    if (results[0].status === 'rejected') {
        showToast(errorMessage(results[0].reason), 'error');
    } else if (results[1].status === 'rejected') {
        showToast('Could not load shift presets — shift icons may be missing', 'error');
    } else if (results[2].status === 'rejected') {
        // Silence here would show "No cash advances on record" for someone who
        // actually has an outstanding balance.
        showToast('Could not load cash advances — balances may be out of date', 'error');
    }
    await guard(loadMembers);
};

onMounted(reload);

// Reloading replaces the grid, so anything unsaved is gone. Ask first rather
// than silently discarding edits the "Unsaved changes" badge is advertising.
const confirmDiscard = () =>
    !isDirty.value ||
    window.confirm('You have unsaved changes to this week. Discard them?');

watch(weekStart, (next, previous) => {
    if (suppressWeekWatch) {
        suppressWeekWatch = false;
        return;
    }
    if (!confirmDiscard()) {
        // Put the picker back without re-triggering this watcher.
        suppressWeekWatch = true;
        weekStart.value = previous;
        return;
    }
    guard(loadWeek);
});
// reload() already fetches members; this only covers a canEdit flip on a week
// change, and is guarded so a failure surfaces instead of escaping.
watch(
    () => week.value?.canEdit,
    (canEditNow, before) => {
        if (canEditNow && !before) guard(loadMembers);
    }
);

// Switching stores changes only the route param, so this component is reused
// and onMounted never fires again. Reset the previous store's data and reload,
// otherwise the grid keeps stale rows and loses its icons.
watch(storeId, async () => {
    week.value = null;
    presets.value = [];
    advances.value = [];
    members.value = [];
    await reload();
});

// ── Week navigation ──────────────────────────────────────────────────────────

let suppressWeekWatch = false;

const goWeek = (delta: number) => {
    weekStart.value = addDays(weekStart.value, delta * 7);
};

const goToday = () => {
    weekStart.value = currentWeekStart();
};

// The stacked view is read-only; Edit hands the week off to the Week tab, where
// publish, rates and CA deductions all live.
const jumpToWeek = (target: string) => {
    weekStart.value = target;
    activeTab.value = 'week';
};

// ── Grid editing (local until "Save draft") ──────────────────────────────────

const emptyPay = () => ({
    daysWorked: 0,
    otHours: 0,
    dailyRate: 0,
    otHourlyRate: 0,
    lessCa: 0,
    payout: 0,
    otAuto: true,
    computedOtHours: 0,
    hoursPerDay: 8,
    breakMinutes: 0,
    remarks: null,
    caBalance: 0,
    deductions: [],
});

const addRow = () => {
    const member = members.value.find((m) => m.storeMemberId === memberToAdd.value);
    if (!member || !week.value) return;
    week.value.rows.push({
        id: '',
        storeMemberId: member.storeMemberId,
        userId: member.userId,
        name: member.name,
        role: member.role,
        sortOrder: week.value.rows.length,
        isSelf: false,
        shifts: [],
        pay: emptyPay(),
    });
    memberToAdd.value = '';
    isDirty.value = true;
};

const removeRow = (row: ScheduleRow) => {
    if (!week.value) return;
    const shiftCount = row.shifts.length;
    askConfirm(
        `Remove ${row.name} from this week?`,
        shiftCount > 0
            ? `Their ${shiftCount} shift${shiftCount === 1 ? '' : ''} for this week will be cleared. Nothing is saved until you save the week.`
            : 'Nothing is saved until you save the week.',
        'Remove',
        async () => {
            if (!week.value) return;
            week.value.rows = week.value.rows.filter((r) => r.storeMemberId !== row.storeMemberId);
            isDirty.value = true;
        }
    );
};

// Typing an OT figure is what makes a row manual — there is no separate toggle
// to forget. `auto` puts it back on the roster.
const onOtInput = (row: ScheduleRow, event: Event) => {
    if (!row.pay) return;
    row.pay.otHours = Number((event.target as HTMLInputElement).value) || 0;
    row.pay.otAuto = false;
    recalcRow(row);
    isDirty.value = true;
};

const resetOt = (row: ScheduleRow) => {
    if (!row.pay) return;
    row.pay.otAuto = true;
    recalcRow(row);
    isDirty.value = true;
};

const otTitle = (row: ScheduleRow) => {
    if (!row.pay) return '';
    return row.pay.otAuto
        ? `Calculated from the roster (${row.pay.hoursPerDay}h day, ${row.pay.breakMinutes}min unpaid break). Type to override.`
        : `Manual override. The roster works out to ${formatNumber(row.pay.computedOtHours)}h.`;
};

const onRemarksInput = (row: ScheduleRow, event: Event) => {
    if (!row.pay) return;
    row.pay.remarks = (event.target as HTMLInputElement).value || null;
    isDirty.value = true;
};

// Mirrors the backend formula so the grid updates as the owner edits. The
// server recomputes and is the authority — this is presentation only.
const recalcRow = (row: ScheduleRow) => {
    if (!row.pay) return;
    const worked = row.shifts.filter((s) => !s.isRestDay && s.startMinute !== null);
    const daysWorked = worked.length;

    const scheduledMinutes = worked.reduce(
        (total, s) => total + ((s.endMinute ?? 0) - (s.startMinute ?? 0)),
        0
    );
    const paidMinutes = scheduledMinutes - daysWorked * Math.max(0, row.pay.breakMinutes);
    const overMinutes = paidMinutes - daysWorked * (row.pay.hoursPerDay || 8) * 60;
    row.pay.computedOtHours = overMinutes > 0 ? Math.round((overMinutes / 60) * 100) / 100 : 0;

    row.pay.daysWorked = daysWorked;
    if (row.pay.otAuto) row.pay.otHours = row.pay.computedOtHours;
    row.pay.payout =
        daysWorked * row.pay.dailyRate + row.pay.otHours * row.pay.otHourlyRate - row.pay.lessCa;
};

// ── Shift editor ─────────────────────────────────────────────────────────────

type ShiftEditor = {
    storeMemberId: string;
    rowName: string;
    date: string;
    start: string;
    end: string;
    overnight: boolean;
};

const shiftEditor = ref<ShiftEditor | null>(null);

const openShiftEditor = (row: ScheduleRow, date: string) => {
    const shift = shiftFor(row, date);
    const overnight = (shift?.endMinute ?? 0) >= MINUTES_IN_DAY;
    shiftEditor.value = {
        storeMemberId: row.storeMemberId,
        rowName: row.name,
        date,
        start: toTimeInput(shift?.startMinute ?? null),
        end: toTimeInput(shift?.endMinute ?? null),
        overnight,
    };
};

const setShift = (
    storeMemberId: string,
    date: string,
    patch: { isRestDay: boolean; startMinute: number | null; endMinute: number | null; presetId: string | null } | null
) => {
    const row = rows.value.find((r) => r.storeMemberId === storeMemberId);
    if (!row) return;
    row.shifts = row.shifts.filter((s) => s.date !== date);
    if (patch) row.shifts.push({ date, ...patch });
    row.shifts.sort((a, b) => a.date.localeCompare(b.date));
    recalcRow(row);
    isDirty.value = true;
    shiftEditor.value = null;
};

const applyRestDay = () => {
    if (!shiftEditor.value) return;
    setShift(shiftEditor.value.storeMemberId, shiftEditor.value.date, {
        isRestDay: true,
        startMinute: null,
        endMinute: null,
        presetId: null,
    });
};

const applyPreset = (preset: ShiftPreset) => {
    if (!shiftEditor.value) return;
    setShift(shiftEditor.value.storeMemberId, shiftEditor.value.date, {
        isRestDay: false,
        startMinute: preset.startMinute,
        endMinute: preset.endMinute,
        presetId: preset.id,
    });
};

const applyCustom = () => {
    if (!shiftEditor.value) return;
    const start = parseTimeInput(shiftEditor.value.start);
    const rawEnd = parseTimeInput(shiftEditor.value.end);
    if (start === null || rawEnd === null) {
        showToast('Enter both a start and end time', 'error');
        return;
    }
    const end = shiftEditor.value.overnight ? rawEnd + MINUTES_IN_DAY : rawEnd;
    if (end <= start) {
        showToast('End time must be after start time — tick “ends next day” for overnight shifts', 'error');
        return;
    }
    setShift(shiftEditor.value.storeMemberId, shiftEditor.value.date, {
        isRestDay: false,
        startMinute: start,
        endMinute: end,
        presetId: null,
    });
};

const clearShift = () => {
    if (!shiftEditor.value) return;
    setShift(shiftEditor.value.storeMemberId, shiftEditor.value.date, null);
};

// ── Save / publish / copy ────────────────────────────────────────────────────

const save = async () => {
    if (!storeId.value) return;
    isSaving.value = true;
    try {
        const { week: saved } = await saveScheduleWeek(storeId.value, {
            weekStart: weekStart.value,
            rows: rows.value.map((row, index) => ({
                storeMemberId: row.storeMemberId,
                otHours: row.pay?.otHours ?? 0,
                otAuto: row.pay?.otAuto ?? true,
                remarks: row.pay?.remarks ?? null,
                sortOrder: index,
                shifts: row.shifts.map((s) => ({
                    date: s.date,
                    isRestDay: s.isRestDay,
                    startMinute: s.startMinute,
                    endMinute: s.endMinute,
                    presetId: s.presetId,
                })),
            })),
        });
        week.value = saved;
        isDirty.value = false;
        showToast('Schedule saved', 'success');
    } finally {
        isSaving.value = false;
    }
};

const confirm = reactive({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
});

const askConfirm = (title: string, message: string, confirmText: string, action: () => Promise<void>) => {
    confirm.title = title;
    confirm.message = message;
    confirm.confirmText = confirmText;
    confirm.onConfirm = async () => {
        confirm.show = false;
        await action();
    };
    confirm.show = true;
};

const togglePublish = async () => {
    if (!storeId.value) return;
    const publish = !isPublished.value;

    const run = async () => {
        isSaving.value = true;
        try {
            // save() clears isSaving in its own finally, which would re-enable
            // the buttons for the whole publish request and allow a second
            // click to fire a duplicate publish.
            if (publish && isDirty.value) await save();
            isSaving.value = true;
            const { week: updated } = await publishScheduleWeek(storeId.value, weekStart.value, publish);
            week.value = updated;
            showToast(publish ? 'Week published — staff can see it now' : 'Week reopened for editing', 'success');
        } finally {
            isSaving.value = false;
        }
    };

    if (publish) {
        await run();
    } else {
        askConfirm(
            'Unpublish this week?',
            'Staff will stop seeing it, and the frozen pay rates on each row will be cleared and recalculated from current rates.',
            'Unpublish',
            run
        );
    }
};

// Published weeks are refused by the backend — their payout is settled history
// that the month totals report against.
const deleteWeek = async () => {
    if (!storeId.value || !week.value?.id) return;
    const staffCount = rows.value.length;
    askConfirm(
        `Delete the schedule for ${weekLabel.value}?`,
        staffCount > 0
            ? `This removes ${staffCount} staff row${staffCount === 1 ? '' : 's'} and every shift in this week. It cannot be undone.`
            : 'This removes the week. It cannot be undone.',
        'Delete week',
        async () => {
            await deleteScheduleWeek(storeId.value, weekStart.value);
            isDirty.value = false;
            await loadWeek();
            showToast('Week deleted', 'success');
        }
    );
};

const copyLastWeek = async () => {
    if (!storeId.value) return;
    const from = addDays(weekStart.value, -7);

    const run = async (overwrite: boolean) => {
        const { week: copied } = await copyScheduleWeek(storeId.value, from, weekStart.value, overwrite);
        week.value = copied;
        isDirty.value = false;
        showToast('Copied last week’s shifts — OT, cash advances and remarks start fresh', 'success');
    };

    if (hasRows.value) {
        askConfirm(
            'Replace this week?',
            'This week already has a schedule. Copying will replace its shifts with last week’s.',
            'Replace',
            () => run(true)
        );
    } else {
        await run(false);
    }
};

// ── Presets ──────────────────────────────────────────────────────────────────

const showPresets = ref(false);
const newPreset = reactive({ label: '', start: '', end: '', icon: 'none' as string, overnight: false });

// Pre-selects a sensible glyph once both times are set; the owner can override.
const autoSuggestIcon = () => {
    const start = parseTimeInput(newPreset.start);
    const rawEnd = parseTimeInput(newPreset.end);
    if (start === null || rawEnd === null || newPreset.icon !== 'none') return;
    newPreset.icon = suggestIcon(start, newPreset.overnight ? rawEnd + MINUTES_IN_DAY : rawEnd);
};

const addPreset = async () => {
    if (!storeId.value) return;
    const start = parseTimeInput(newPreset.start);
    const rawEnd = parseTimeInput(newPreset.end);
    if (!newPreset.label.trim() || start === null || rawEnd === null) {
        showToast('Enter a label and both times', 'error');
        return;
    }
    // Matches the shift editor: an overnight close is stored as minutes past
    // 1440, which the model and formatter already support.
    const end = newPreset.overnight ? rawEnd + MINUTES_IN_DAY : rawEnd;
    if (end <= start) {
        showToast('End time must be after start time — tick "ends next day" for overnight shifts', 'error');
        return;
    }
    await createShiftPreset(storeId.value, {
        label: newPreset.label.trim(),
        icon: newPreset.icon,
        startMinute: start,
        endMinute: end,
        sortOrder: presets.value.length,
    });
    newPreset.label = '';
    newPreset.start = '';
    newPreset.end = '';
    newPreset.icon = 'none';
    newPreset.overnight = false;
    presets.value = (await listShiftPresets(storeId.value)).presets;
};

const removePreset = (preset: ShiftPreset) => {
    if (!storeId.value) return;
    askConfirm(
        `Delete the "${preset.label}" shift?`,
        'It stops being offered when filling the grid. Weeks already using it keep their times and icon.',
        'Delete',
        async () => {
            if (!storeId.value) return;
            await deleteShiftPreset(storeId.value, preset.id);
            presets.value = (await listShiftPresets(storeId.value)).presets;
            showToast(`"${preset.label}" deleted`, 'success');
        }
    );
};

// ── Rates ────────────────────────────────────────────────────────────────────

const showRates = ref(false);
type RateDraft = {
    storeMemberId: string;
    name: string;
    dailyRate: number;
    hoursPerDay: number;
    breakMinutes: number;
    otMultiplier: number;
    effectiveFrom: string;
    // `saved` distinguishes "no rate on record" from "rate of 0" — publish
    // blocks on the former, and the two used to look identical in the form.
    saved: boolean;
    dirty: boolean;
};

const rateDrafts = ref<RateDraft[]>([]);

const openRates = async () => {
    if (!storeId.value) return;
    const { rates: loaded } = await listStaffRates(storeId.value);
    rateDrafts.value = loaded.map((rate) => ({
        storeMemberId: rate.storeMemberId,
        name: rate.name,
        dailyRate: rate.current?.dailyRate ?? 0,
        hoursPerDay: rate.current?.hoursPerDay ?? 8,
        breakMinutes: rate.current?.breakMinutes ?? 0,
        otMultiplier: rate.current?.otMultiplier ?? 1,
        effectiveFrom: rate.current?.effectiveFrom ?? weekStart.value,
        saved: rate.current !== null,
        dirty: false,
    }));
    showRates.value = true;
};

const previewOtRate = (rate: { dailyRate: number; hoursPerDay: number; otMultiplier: number }) =>
    (rate.dailyRate / (rate.hoursPerDay || 8)) * rate.otMultiplier;

const saveRate = async (rate: RateDraft) => {
    if (!storeId.value) return;
    await setStaffRate(storeId.value, rate.storeMemberId, {
        dailyRate: rate.dailyRate,
        hoursPerDay: rate.hoursPerDay,
        breakMinutes: rate.breakMinutes,
        otMultiplier: rate.otMultiplier,
        effectiveFrom: rate.effectiveFrom,
    });
    rate.saved = true;
    rate.dirty = false;
    showToast(`Rate saved for ${rate.name}`, 'success');
    // Only refresh the grid when there is nothing pending to lose — a new rate
    // changes computed payouts, but not at the cost of the owner's edits.
    if (!isDirty.value) await loadWeek();
};

// ── Cash advances ────────────────────────────────────────────────────────────

type DeductionEntry = { advance: CashAdvance; amount: number; skipped: boolean };
type DeductionEditor = { rowId: string; storeMemberId: string; rowName: string; entries: DeductionEntry[] };

const deductionEditor = ref<DeductionEditor | null>(null);
const newAdvance = reactive({ amount: null as number | null, takenOn: '', note: '' });

const buildEntries = (row: ScheduleRow): DeductionEntry[] =>
    advances.value
        .filter((a) => a.storeMemberId === row.storeMemberId)
        .map((advance) => {
            const existing = row.pay?.deductions.find((d) => d.cashAdvanceId === advance.id);
            return {
                advance,
                amount: existing?.amount ?? 0,
                skipped: existing?.skipped ?? false,
            };
        });

// The row's "ca bal" is the member's outstanding total across every advance.
// Recomputed from the freshly loaded list rather than adjusted by hand.
const syncCaBalance = (row: ScheduleRow | undefined) => {
    if (!row?.pay) return;
    row.pay.caBalance = advances.value
        .filter((a) => a.storeMemberId === row.storeMemberId)
        .reduce((sum, a) => sum + a.balance, 0);
};

const openDeductions = (row: ScheduleRow) => {
    if (!row.id) {
        showToast('Save the draft first, then record deductions', 'info');
        return;
    }
    newAdvance.amount = null;
    newAdvance.takenOn = weekStart.value;
    newAdvance.note = '';
    deductionEditor.value = {
        rowId: row.id,
        storeMemberId: row.storeMemberId,
        rowName: row.name,
        entries: buildEntries(row),
    };
};

const saveDeduction = async (entry: DeductionEntry) => {
    if (!storeId.value || !deductionEditor.value) return;
    // v-model.number hands back the raw string when parseFloat gives NaN, so an
    // emptied field would post amount: "" and trip backend validation.
    const amount = Number(entry.amount) || 0;
    const applied = entry.skipped ? 0 : amount;
    const { deduction } = await setRowDeduction(storeId.value, deductionEditor.value.rowId, {
        cashAdvanceId: entry.advance.id,
        amount: applied,
        skipped: entry.skipped,
    });

    // Fold the saved deduction into the grid row. `closeDeductions` reloads the
    // week only when there is nothing unsaved to lose, so without this the
    // less CA and Payout columns sit stale behind the modal.
    const row = rows.value.find((r) => r.storeMemberId === deductionEditor.value?.storeMemberId);
    if (row?.pay) {
        const existing = row.pay.deductions.find((d) => d.cashAdvanceId === deduction.cashAdvanceId);
        if (existing) Object.assign(existing, deduction);
        else row.pay.deductions.push(deduction);
        row.pay.lessCa = row.pay.deductions.reduce((sum, d) => sum + d.amount, 0);
        recalcRow(row);
    }

    // Advance balances are derived from every week's deductions, so the
    // modal's Balance column and the row's "ca bal" need the server's figures.
    advances.value = (await listCashAdvances(storeId.value)).advances;
    syncCaBalance(row);
    if (row) deductionEditor.value.entries = buildEntries(row);

    showToast('Deduction saved', 'success');
};

const addAdvance = async () => {
    if (!storeId.value || !deductionEditor.value) return;
    const amount = newAdvance.amount;
    if (!amount || amount <= 0) {
        showToast('Enter an advance amount', 'error');
        return;
    }
    await createCashAdvance(storeId.value, {
        storeMemberId: deductionEditor.value.storeMemberId,
        amount,
        takenOn: newAdvance.takenOn || weekStart.value,
        note: newAdvance.note || null,
    });
    advances.value = (await listCashAdvances(storeId.value)).advances;
    const row = rows.value.find((r) => r.storeMemberId === deductionEditor.value?.storeMemberId);
    syncCaBalance(row);
    if (row) deductionEditor.value.entries = buildEntries(row);
    newAdvance.amount = null;
    newAdvance.note = '';
    showToast('Cash advance recorded', 'success');
};

const removeAdvance = async (entry: DeductionEntry) => {
    if (!storeId.value) return;
    askConfirm(
        `Delete the ${formatMoney(entry.advance.amount)} advance?`,
        `Taken ${shortDate(entry.advance.takenOn)}. This cannot be undone.`,
        'Delete',
        async () => {
            if (!storeId.value || !deductionEditor.value) return;
            await deleteCashAdvance(storeId.value, entry.advance.id);
            advances.value = (await listCashAdvances(storeId.value)).advances;
            const row = rows.value.find((r) => r.storeMemberId === deductionEditor.value?.storeMemberId);
            syncCaBalance(row);
            if (row) deductionEditor.value.entries = buildEntries(row);
            showToast('Cash advance deleted', 'success');
        }
    );
};

const closeDeductions = async () => {
    deductionEditor.value = null;
    if (!isDirty.value) await reload();
    else await guard(loadAdvances);
};
</script>

<style lang="scss" scoped>
.sc-page {
    padding: 1rem 1.25rem 3rem;
}

.sc-header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.sc-title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
}

.sc-subtitle {
    margin: 0.15rem 0 0;
    color: var(--text-muted, #6b7280);
    font-size: 0.875rem;
}

.sc-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.sc-tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    margin-bottom: 0.9rem;
    // Scroll rather than wrap: wrapped tabs cost two lines of vertical space
    // and read as two rows of controls.
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
}

.sc-tab {
    display: inline-flex;
    flex: 0 0 auto;
    white-space: nowrap;
    align-items: center;
    gap: 0.3rem;
    border: none;
    background: none;
    padding: 0.45rem 0.7rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted, #6b7280);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;

    &:hover {
        color: inherit;
    }

    &.is-active {
        color: #1d4ed8;
        border-bottom-color: #1d4ed8;
    }
}

.sc-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.sc-week-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sc-week-label {
    font-weight: 600;
    min-width: 12rem;
    text-align: center;
}

.sc-status {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.sc-badge {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
}

.sc-badge--draft {
    background: #fef3c7;
    color: #92400e;
}

.sc-badge--published {
    background: #d1fae5;
    color: #065f46;
}

.sc-status-hint {
    font-size: 0.78rem;
    color: var(--text-muted, #6b7280);
}

.sc-status-hint--warn {
    color: #b45309;
    font-weight: 600;
}

.sc-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
}

.sc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    white-space: nowrap;

    th,
    td {
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        padding: 0.4rem 0.5rem;
        text-align: center;
        vertical-align: middle;
    }

    thead th {
        background: var(--surface-alt, #f9fafb);
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        position: sticky;
        top: 0;
        z-index: 1;
    }
}

// Light rules between days: seven columns of near-identical times are easy to
// mis-read across a row. Kept faint so they separate without turning the grid
// into spreadsheet chrome, and so they don't compete with the red RD cells.
.sc-col-day + .sc-col-day,
.sc-col-first-day {
    border-left: 1px solid rgba(0, 0, 0, 0.07);
}

// The seam between the schedule and the payroll block is a stronger boundary
// than any day-to-day one, so it gets a heavier rule.
.sc-col-seam {
    border-left: 2px solid var(--border-color, #e5e7eb);
}

.sc-col-staff {
    text-align: left !important;
    font-weight: 600;
    position: sticky;
    left: 0;
    background: var(--surface, #fff);
    z-index: 2;
}

thead .sc-col-staff {
    z-index: 3;
}

.sc-day-name {
    font-size: 0.7rem;
}

.sc-day-name--weekend {
    color: #b91c1c;
}

.sc-day-date {
    font-weight: 500;
    font-size: 0.7rem;
    color: var(--text-muted, #6b7280);
    background: #eaf5ea;
    border-radius: 0.2rem;
    margin-top: 0.15rem;
}

.sc-col-num {
    text-align: right !important;
    min-width: 4.5rem;
}

.sc-col-ot {
    min-width: 6.5rem;
}

.sc-col-payout {
    font-weight: 700;
    background: rgba(16, 185, 129, 0.06);
}

.sc-col-remarks {
    text-align: left !important;
    min-width: 12rem;
    white-space: normal;
}

.sc-col-actions {
    width: 2.5rem;
}

.sc-row--self {
    background: rgba(59, 130, 246, 0.04);
}

.sc-staff-name {
    text-transform: uppercase;
}

.sc-you {
    margin-left: 0.35rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #1d4ed8;
    background: #dbeafe;
    border-radius: 999px;
    padding: 0.05rem 0.35rem;
}

.sc-cell {
    // inline-flex, not inline-block: mdicon renders a block-level wrapper, which
    // would otherwise push the time onto its own line beneath the glyph.
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: 100%;
    white-space: nowrap;
    padding: 0.2rem 0.3rem;
    border: none;
    background: transparent;
    border-radius: 0.25rem;
    font-size: 0.8rem;
    color: inherit;
}

.sc-cell--editable {
    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.1);
    }

    &:disabled {
        cursor: default;
    }
}

.sc-cell--rd {
    color: #dc2626;
    font-weight: 700;
}

.sc-cell--empty {
    color: var(--text-muted, #9ca3af);
}

.sc-hidden {
    color: var(--text-muted, #9ca3af);
    background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 6px,
        rgba(0, 0, 0, 0.025) 6px,
        rgba(0, 0, 0, 0.025) 12px
    );
}

.sc-ca-balance {
    font-size: 0.7rem;
    color: var(--text-muted, #6b7280);
}

.sc-input {
    width: 100%;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.25rem;
    padding: 0.15rem 0.35rem;
    font-size: 0.8rem;
    background: var(--surface, #fff);
    color: inherit;
}

.sc-input--num {
    text-align: right;
    max-width: 5.5rem;
    // The spinner is wider than the value at these cell sizes — it was hiding
    // the OT figure entirely. Type the number instead.
    appearance: textfield;
    -moz-appearance: textfield;
}

.sc-input--num::-webkit-outer-spin-button,
.sc-input--num::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.sc-select {
    max-width: 18rem;
}

.sc-linkish {
    border: none;
    background: none;
    color: #1d4ed8;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0;
}

.sc-icon-button {
    border: none;
    background: none;
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    padding: 0.15rem;

    &:hover:not(:disabled) {
        color: #dc2626;
    }
}

.sc-empty,
.sc-empty-row {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-muted, #6b7280);
}

.sc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    border: 1px dashed var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
}

.sc-add-staff {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.75rem;
}

.sc-mobile {
    display: none;
}

@media (max-width: 640px) {
    .sc-table-wrap {
        display: none;
    }

    .sc-mobile {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .sc-page {
        padding: 0.75rem 0.75rem 4rem;
    }

    .sc-week-label {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 0.9rem;
    }

    .sc-week-nav {
        width: 100%;
    }

    .sc-week-nav .btn {
        white-space: nowrap;
        flex: 0 0 auto;
    }

    .sc-header-actions {
        width: 100%;
    }

    .sc-header-actions > * {
        flex: 1 1 auto;
        justify-content: center;
    }

    .sc-add-staff {
        flex-wrap: wrap;
    }

    .sc-select {
        max-width: none;
        flex: 1 1 100%;
    }
}

.sc-mcard {
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--surface, #fff);
}

.sc-mcard--self {
    border-color: #bfdbfe;
}

.sc-mcard-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.65rem;
    background: var(--surface-alt, #f9fafb);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    font-weight: 700;
    font-size: 0.85rem;
}

.sc-mcard-remove {
    margin-left: auto;
}

.sc-mday {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    border: none;
    background: none;
    color: inherit;
    text-align: left;
    padding: 0.45rem 0.65rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 0.85rem;
    // Comfortable tap target on a phone.
    min-height: 2.6rem;

    &:disabled {
        cursor: default;
    }

    &:not(:disabled):active {
        background: rgba(59, 130, 246, 0.08);
    }
}

.sc-mday-label {
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-muted, #6b7280);
    text-transform: uppercase;
    flex: 0 0 auto;
}

.sc-mday-label--weekend {
    color: #b91c1c;
}

.sc-mday-value {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
}

.sc-mday--rd .sc-mday-value {
    color: #dc2626;
    font-weight: 700;
}

.sc-mpay {
    padding: 0.55rem 0.65rem;
    background: rgba(16, 185, 129, 0.04);
    border-top: 2px solid var(--border-color, #e5e7eb);
}

.sc-mpay--hidden {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: none;
    color: var(--text-muted, #9ca3af);
    font-size: 0.78rem;
}

.sc-mpay-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
}

.sc-mstat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}

.sc-mstat-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted, #6b7280);
}

.sc-mstat-value {
    font-size: 0.85rem;
    font-weight: 600;
}

.sc-mstat--payout .sc-mstat-value {
    font-weight: 800;
}

.sc-mremarks {
    margin-top: 0.45rem;
}

.sc-mremarks-text {
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-muted, #6b7280);
}

.sc-modal {
    // Width comes from the Modal container (its `width` prop), which is already
    // clamped to the viewport. Forcing a min-width here would overflow it.
    width: 100%;
}

// Wide tables scroll within the modal rather than spilling past its edge.
.sc-table-scroll {
    overflow-x: auto;
    margin: 0 -0.25rem;
    padding: 0 0.25rem;
}

.sc-modal-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
}

.sc-modal-sub {
    margin: 0 0 0.85rem;
    font-size: 0.82rem;
    color: var(--text-muted, #6b7280);
}

.sc-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
}

.sc-preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.sc-preset {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.4rem;
    background: var(--surface, #fff);
    cursor: pointer;
    color: inherit;

    &:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.06);
    }
}

.sc-preset--rd {
    color: #dc2626;
    font-weight: 700;
    justify-content: center;
    align-items: center;
}

.sc-preset-label {
    font-weight: 600;
    font-size: 0.82rem;
}

.sc-preset-time {
    font-size: 0.72rem;
    color: var(--text-muted, #6b7280);
}

.sc-custom {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, #e5e7eb);
}

.sc-custom-label {
    font-size: 0.8rem;
    font-weight: 600;
}

.sc-overnight {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    color: var(--text-muted, #6b7280);
}

.sc-mini-table {
    width: 100%;
    min-width: 34rem;
    border-collapse: collapse;
    font-size: 0.82rem;
    white-space: nowrap;

    th,
    td {
        padding: 0.35rem 0.4rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        text-align: left;
    }

    th {
        font-size: 0.7rem;
        text-transform: uppercase;
        color: var(--text-muted, #6b7280);
    }
}

.sc-muted {
    color: var(--text-muted, #6b7280);
}

.sc-inline-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--border-color, #e5e7eb);

    // .sc-input is width:100% for table cells; inside an inline form the
    // fields size to their content instead, so the row stays on one line.
    .sc-input {
        width: auto;
        flex: 0 0 auto;
    }

    .sc-input--grow {
        flex: 1 1 9rem;
        min-width: 7rem;
    }

    .sc-input--num {
        width: 6.5rem;
    }
}

.sc-advance-actions {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    white-space: nowrap;
}

.sc-ot-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
}

.sc-ot-cell .sc-input--num {
    flex: 0 0 3.2rem;
    width: 3.2rem;
    min-width: 0;
    max-width: none;
}

// A derived value looks different from one that was typed in.
.sc-input--auto {
    background: rgba(59, 130, 246, 0.05);
    border-style: dashed;
}

.sc-ot-reset {
    border: none;
    background: none;
    padding: 0;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #1d4ed8;
    cursor: pointer;
    text-decoration: underline;
}

.sc-rate-flag {
    margin-left: 0.4rem;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 0.05rem 0.35rem;
    background: #fee2e2;
    color: #991b1b;
}

.sc-rate-flag--dirty {
    background: #fef3c7;
    color: #92400e;
}

.sc-rate-save--needed {
    border-color: #1d4ed8 !important;
    color: #1d4ed8 !important;
    font-weight: 700;
}

.sc-cell-icon {
    // No opacity here — the colours were validated at full strength against the
    // light surface, and fading them would drop the amber below that.
    display: inline-flex;
    flex: 0 0 auto;
    line-height: 0;
}

.sc-icon-picker {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
}

.sc-icon-option {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    min-width: 2.1rem;
    height: 1.9rem;
    justify-content: center;
    padding: 0 0.35rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.35rem;
    background: var(--surface, #fff);
    color: inherit;
    cursor: pointer;

    &:hover {
        border-color: #3b82f6;
    }

    &.is-active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.12);
        box-shadow: inset 0 0 0 1px #3b82f6;
    }
}

.sc-icon-none {
    color: var(--text-muted, #9ca3af);
    font-size: 0.8rem;
}

.sc-inline-form-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted, #6b7280);
}
</style>
