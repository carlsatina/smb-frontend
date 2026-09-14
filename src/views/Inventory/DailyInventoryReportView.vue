<template>
    <div class="daily-inv-shell">
        <!-- ── HEADER & CONTROLS ── -->
        <div class="daily-inv-header">
            <h2 class="daily-inv-heading">Daily Inventory Report</h2>

            <!-- Top Actions -->
            <div class="daily-inv-actions">
                <button
                    v-if="isOwnerOrAdmin"
                    type="button"
                    class="ghost-button button-compact"
                    @click="showAddModal = true"
                >
                    <mdicon name="plus" size="16" />
                    Add Item
                </button>
                <button
                    type="button"
                    class="ghost-button button-compact"
                    :disabled="isLoading || isSaving"
                    @click="refreshReport"
                    title="Reload this sheet and the inventory links, picking up anything saved on another device"
                >
                    <mdicon name="refresh" size="16" :class="{ 'spin-icon': isLoading }" />
                    Refresh
                </button>

                <!-- Autosave status. Replaces the old Save button: the sheet
                     writes itself, so what the user needs here is proof of it. -->
                <div class="save-state" :class="`save-state--${saveState}`" role="status" aria-live="polite">
                    <template v-if="saveState === 'saving'">
                        <span class="btn-spinner btn-spinner--dark"></span>
                        <span>Saving…</span>
                    </template>
                    <template v-else-if="saveState === 'pending'">
                        <mdicon name="pencil-outline" size="15" />
                        <span>Unsaved changes</span>
                    </template>
                    <template v-else-if="saveState === 'error'">
                        <mdicon name="alert-circle-outline" size="15" />
                        <span>{{ saveError || 'Not saved' }}</span>
                        <button type="button" class="save-state-retry" @click="retrySave">Retry</button>
                    </template>
                    <template v-else-if="saveState === 'saved'">
                        <mdicon name="check-circle-outline" size="15" />
                        <span>Saved {{ lastSavedLabel }}</span>
                    </template>
                    <template v-else>
                        <mdicon name="cloud-check-outline" size="15" />
                        <span>Autosaves as you type</span>
                    </template>
                </div>
            </div>
        </div>

        <div class="daily-inv-meta">
            <span
                class="role-indicator"
                :class="isOwnerOrAdmin ? 'role-indicator--admin' : 'role-indicator--staff'"
            >
                <mdicon :name="isOwnerOrAdmin ? 'shield-account' : 'account-tie'" size="15" />
                {{ isOwnerOrAdmin ? 'Owner / Admin Mode (Full Access)' : 'Store Staff Mode (Ending Inventory Only)' }}
            </span>
            <p class="daily-inv-sub">
                Daily tracking for {{ currentStoreName }} · Opening inventory rolls over from previous day
            </p>
        </div>

        <!-- ── CONTROLS STRIP (Template selector + Date Nav) ── -->
        <div class="controls-card">
            <!-- Template Switcher Pills -->
            <div class="template-pills" role="tablist" aria-label="Inventory Report Templates">
                <button
                    type="button"
                    role="tab"
                    class="template-pill"
                    :class="{ 'template-pill--active': selectedTemplate === 'TAKOYAKI' }"
                    :aria-selected="selectedTemplate === 'TAKOYAKI'"
                    @click="switchTemplate('TAKOYAKI')"
                >
                    <span class="template-pill-emoji">🐙</span>
                    <span class="template-pill-title">Takoyaki</span>
                    <span class="template-pill-count">{{ takoyakiCount }} items</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    class="template-pill"
                    :class="{ 'template-pill--active': selectedTemplate === 'BUKO' }"
                    :aria-selected="selectedTemplate === 'BUKO'"
                    @click="switchTemplate('BUKO')"
                >
                    <span class="template-pill-emoji">🥥</span>
                    <span class="template-pill-title">Buko</span>
                    <span class="template-pill-count">{{ bukoCount }} items</span>
                </button>
            </div>

            <!-- Date Navigation Controls -->
            <div class="date-controls">
                <button
                    type="button"
                    class="date-nav-btn"
                    title="Previous day"
                    @click="changeDate(-1)"
                >
                    <mdicon name="chevron-left" size="18" />
                </button>

                <div class="date-input-wrap">
                    <mdicon name="calendar-month" size="16" class="date-icon" />
                    <input
                        v-model="selectedDate"
                        type="date"
                        class="date-picker-input"
                        @change="onDateChanged"
                    />
                </div>

                <button
                    type="button"
                    class="date-nav-btn"
                    title="Next day"
                    @click="changeDate(1)"
                >
                    <mdicon name="chevron-right" size="18" />
                </button>

                <button
                    type="button"
                    class="today-btn"
                    :class="{ 'today-btn--active': isSelectedToday }"
                    @click="goToToday"
                >
                    Today
                </button>
            </div>
        </div>

        <!-- ── ROLLOVER / STATUS BANNER ── -->
        <div v-if="carriedOverDate" class="banner banner--info">
            <mdicon name="arrow-right-bold-circle-outline" size="18" class="banner-icon" />
            <div class="banner-content">
                <strong>Previous Day Rolled Over:</strong>
                Opening inventory was automatically loaded from <strong>{{ carriedOverDate }}</strong> ending inventory.
            </div>
            <span v-if="isOwnerOrAdmin" class="banner-sub">
                (As Owner/Admin, you may still edit opening inventory values if adjustments are needed)
            </span>
        </div>

        <div v-else-if="isNewReport" class="banner banner--neutral">
            <mdicon name="file-document-edit-outline" size="18" class="banner-icon" />
            <div class="banner-content">
                <strong>New Report:</strong>
                No previous recorded report found. Initialized with standard {{ selectedTemplate.toLowerCase() }} particulars.
            </div>
        </div>

        <div v-else class="banner banner--success">
            <mdicon name="check-circle-outline" size="18" class="banner-icon" />
            <div class="banner-content">
                <strong>Saved Report:</strong>
                Recorded for {{ selectedDate }}. Last updated at {{ formatLastSaved(reportUpdatedAt) }}.
            </div>
        </div>

        <!-- ── STATS MINI-STRIP ── -->
        <div class="inv-stats-strip">
            <div class="stat-box">
                <span class="stat-box-val">{{ items.length }}</span>
                <span class="stat-box-lbl">Total Items</span>
            </div>
            <div class="stat-box" :class="{ 'stat-box--warn': unlinkedCount > 0 }">
                <span class="stat-box-val">{{ unlinkedCount }}</span>
                <span class="stat-box-lbl">
                    {{ unlinkedCount === 1 ? 'Item' : 'Items' }} Not in Inventory
                </span>
            </div>
            <div class="stat-box">
                <span class="stat-box-val">{{ completedEndingCount }} / {{ items.length }}</span>
                <span class="stat-box-lbl">Ending Counted</span>
            </div>
            <div class="stat-box stat-box--accent">
                <span class="stat-box-val">{{ totalUsedCount }}</span>
                <span class="stat-box-lbl">Items with Usage Today</span>
            </div>
        </div>

        <!-- ── INVENTORY REPORT SPREADSHEET TABLE ── -->
        <div class="sheet-card">
            <div v-if="isLoading" class="sheet-loading">
                <div class="loading-spinner"></div>
                <p>Loading daily inventory for {{ selectedDate }}…</p>
            </div>

            <div v-else class="sheet-table-wrap">
                <table class="sheet-table" :class="`sheet-table--${selectedTemplate.toLowerCase()}`">
                    <thead>
                        <tr class="header-main-row">
                            <th class="col-particulars">PARTICULARS</th>
                            <th class="col-opening">OPENING INVENTORY</th>
                            <th class="col-unit">UNIT</th>
                            <th class="col-delivery">DELIVERY</th>
                            <th class="col-total">TOTAL</th>
                            <th class="col-ending">ENDING INVENTORY</th>
                            <th class="col-reminders">REMINDERS / NOTES</th>
                            <th class="col-unit2">UNIT</th>
                            <th class="col-used">TOTAL USED</th>
                            <th v-if="isOwnerOrAdmin" class="col-actions"></th>
                        </tr>
                    </thead>

                    <tbody>
                        <!-- Loop through sections -->
                        <template v-for="sec in groupedSections" :key="sec.name">
                            <!-- Section Header Bar (styled identically to image) -->
                            <tr v-if="sec.name && sec.name !== 'Main'" class="section-header-row" :class="sectionHeaderClass(sec.name)">
                                <td :colspan="isOwnerOrAdmin ? 10 : 9" class="section-header-cell">
                                    <span class="section-title">{{ sec.name }}</span>
                                </td>
                            </tr>

                            <!-- Section Rows -->
                            <tr
                                v-for="(item, itemIdx) in sec.items"
                                :key="item.particulars"
                                class="sheet-row"
                                :class="{
                                    'row--unlinked': !isLinked(item),
                                    'row--supplies': isSuppliesRow(item),
                                }"
                            >
                                <!-- Particulars -->
                                <td class="col-particulars">
                                    <div class="particular-cell">
                                        <span
                                            class="particular-name"
                                            :class="{ 'particular-name--unlinked': !isLinked(item) }"
                                        >
                                            {{ item.particulars }}
                                        </span>
                                        <span
                                            v-if="!isLinked(item)"
                                            class="unlinked-pill"
                                            title="This item was not found in your store's Ingredients or Products stock list."
                                        >
                                            <mdicon name="alert-circle-outline" size="12" />
                                            Not in inventory
                                            <button
                                                v-if="isOwnerOrAdmin"
                                                type="button"
                                                class="link-action-btn"
                                                title="Link to store inventory"
                                                @click.stop="openLinkModal(item)"
                                            >
                                                Link
                                            </button>
                                        </span>
                                    </div>
                                </td>

                                <!-- Opening Inventory -->
                                <td class="col-opening">
                                    <!-- Editable for Owner/Admin -->
                                    <input
                                        v-if="isOwnerOrAdmin"
                                        :value="item.openingInventory"
                                        type="number"
                                        step="any"
                                        min="0"
                                        class="cell-input cell-input--opening"
                                        @input="onNumberInput(item, 'openingInventory', $event)"
                                        @focus="selectOnFocus"
                                        @mouseup="keepSelectionOnClick"
                                    />
                                    <!-- Locked for Store Staff -->
                                    <div
                                        v-else
                                        class="cell-locked"
                                        title="Opening inventory is locked for store staff and rolls over from previous day."
                                    >
                                        <mdicon name="lock" size="13" class="lock-icon" />
                                        <span>{{ formatNumber(item.openingInventory) }}</span>
                                    </div>
                                </td>

                                <!-- Unit -->
                                <td class="col-unit">
                                    <span class="unit-text">{{ item.unit }}</span>
                                </td>

                                <!-- Delivery -->
                                <td class="col-delivery">
                                    <input
                                        :value="item.delivery"
                                        type="number"
                                        step="any"
                                        min="0"
                                        class="cell-input cell-input--delivery"
                                        @input="onNumberInput(item, 'delivery', $event)"
                                        @focus="selectOnFocus"
                                        @mouseup="keepSelectionOnClick"
                                    />
                                </td>

                                <!-- Total (Opening + Delivery) -->
                                <td class="col-total">
                                    <span class="computed-val font-bold">
                                        {{ formatNumber(computeTotal(item)) }}
                                    </span>
                                </td>

                                <!-- Ending Inventory (Editable by both staff and admin) -->
                                <td class="col-ending">
                                    <input
                                        :value="item.endingInventory"
                                        type="number"
                                        step="any"
                                        min="0"
                                        class="cell-input cell-input--ending"
                                        :class="{ 'cell-input--filled': item.endingInventory !== null && item.endingInventory !== undefined }"
                                        @input="onNumberInput(item, 'endingInventory', $event)"
                                        @focus="selectOnFocus"
                                        @mouseup="keepSelectionOnClick"
                                    />
                                </td>

                                <!-- Reminders / Notes -->
                                <td class="col-reminders">
                                    <input
                                        v-model="item.reminders"
                                        type="text"
                                        class="cell-input cell-input--notes"
                                        :class="{ 'cell-input--urgent': isUrgentNote(item.reminders) }"
                                        placeholder="Notes…"
                                        @input="onFieldInput"
                                        @focus="selectOnFocus"
                                        @mouseup="keepSelectionOnClick"
                                    />
                                </td>

                                <!-- Secondary Unit column -->
                                <td class="col-unit2">
                                    <span class="unit-text">{{ item.unit }}</span>
                                </td>

                                <!-- Total Used (Total - Ending) -->
                                <td class="col-used">
                                    <span
                                        class="computed-val font-semibold"
                                        :class="{ 'text-muted': computeTotalUsed(item) === null }"
                                    >
                                        {{ computeTotalUsed(item) !== null ? formatNumber(computeTotalUsed(item)) : '—' }}
                                    </span>
                                </td>

                                <!-- Remove row action (Owner/Admin only) -->
                                <td v-if="isOwnerOrAdmin" class="col-actions">
                                    <button
                                        type="button"
                                        class="row-del-btn"
                                        title="Remove item"
                                        @click="removeItem(itemIdx, sec.items)"
                                    >
                                        <mdicon name="close" size="14" />
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ── ADD ITEM MODAL (Owner/Admin) ── -->
        <Teleport to="body">
            <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
                <div class="modal-box" role="dialog" aria-modal="true">
                    <div class="modal-header">
                        <h3>Add Custom Item to Sheet</h3>
                        <button class="modal-close" @click="showAddModal = false" aria-label="Close">
                            <mdicon name="close" size="20" />
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="form-field">
                            <label>Particulars (Item Name) *</label>
                            <input
                                v-model="newItem.particulars"
                                type="text"
                                class="form-input"
                                placeholder="e.g. Special Mayo, Large Cup…"
                            />
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label>Unit *</label>
                                <input
                                    v-model="newItem.unit"
                                    type="text"
                                    class="form-input"
                                    placeholder="e.g. pcs, grams, kilo, gal…"
                                />
                            </div>

                            <div class="form-field">
                                <label>Section</label>
                                <select v-model="newItem.section" class="form-select">
                                    <option value="Main">Main</option>
                                    <option v-if="selectedTemplate === 'TAKOYAKI'" value="Others">Others</option>
                                    <option v-if="selectedTemplate === 'TAKOYAKI'" value="Supplies">Supplies</option>
                                    <option v-if="selectedTemplate === 'BUKO'" value="PLASTIC CUPS">PLASTIC CUPS</option>
                                    <option v-if="selectedTemplate === 'BUKO'" value="FLAT LID">FLAT LID</option>
                                    <option v-if="selectedTemplate === 'BUKO'" value="BOTTLES">BOTTLES</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-field">
                                <label>Opening Inventory</label>
                                <input
                                    v-model.number="newItem.openingInventory"
                                    type="number"
                                    step="any"
                                    min="0"
                                    class="form-input"
                                    placeholder="0"
                                />
                            </div>
                            <div class="form-field">
                                <label>Delivery</label>
                                <input
                                    v-model.number="newItem.delivery"
                                    type="number"
                                    step="any"
                                    min="0"
                                    class="form-input"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div class="form-field">
                            <label>Reminders / Notes</label>
                            <input
                                v-model="newItem.reminders"
                                type="text"
                                class="form-input"
                                placeholder="e.g. Expiry date, special instructions…"
                            />
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="ghost-button" @click="showAddModal = false">Cancel</button>
                        <button class="primary-button" :disabled="!newItem.particulars.trim() || !newItem.unit.trim()" @click="confirmAddItem">
                            Add to Sheet
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── LINK ITEM MODAL (Owner/Admin) ── -->
            <div v-if="linkModalItem" class="modal-backdrop" @click.self="linkModalItem = null">
                <div class="modal-box" role="dialog" aria-modal="true">
                    <div class="modal-header">
                        <h3>Link "{{ linkModalItem.particulars }}" to Inventory</h3>
                        <button class="modal-close" @click="linkModalItem = null" aria-label="Close">
                            <mdicon name="close" size="20" />
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="field-hint">
                            Select the matching Product or Ingredient from your store's catalog so this particular is recognized as linked:
                        </p>
                        <div class="form-field">
                            <label>Catalog Item</label>
                            <select v-model="selectedStockId" class="form-select">
                                <option value="">-- No link (unlinked) --</option>
                                <option v-for="s in storeStock" :key="`${s.itemType}-${s.itemId}`" :value="s.itemId">
                                    {{ s.name }} ({{ s.itemType === 'PRODUCT' ? 'Product' : 'Ingredient' }} · {{ s.unit }})
                                </option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ghost-button" @click="linkModalItem = null">Cancel</button>
                        <button class="primary-button" @click="confirmLinkItem">
                            Save Link
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useStoreContextStore } from '@/stores/storeContext';
import { listStock, StockItem } from '@/api/inventory';
import {
    DailyInventoryReportItem,
    DailyInventoryReportType,
    getDailyInventoryReport,
    saveDailyInventoryReport,
} from '@/api/dailyInventory';
import { useToast } from '@/composables/useToast';

const storeContext = useStoreContextStore();
const toast = useToast();

const selectedTemplate = ref<DailyInventoryReportType>('TAKOYAKI');
const selectedDate = ref<string>('');
const isLoading = ref(false);
const isDirty = ref(false);

// ── Autosave ────────────────────────────────────────────────────────────────
// The sheet saves itself as values change, so there is no Save button to miss.
// 'pending' means edited but not yet written — the one state the user must be
// able to see, because it is the only one where closing the tab loses counts.
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
const saveState = ref<SaveState>('idle');
const saveError = ref<string | null>(null);
const lastSavedAt = ref<Date | null>(null);
const isSaving = computed(() => saveState.value === 'saving');

// Long enough that typing a three-digit count is one save rather than three,
// short enough that a glance at the chip after a row tells the truth.
const AUTOSAVE_DELAY_MS = 900;

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
// Bumped on every edit. A save that completes while the sequence has moved on
// leaves the chip 'pending', because newer keystrokes are still unwritten.
let editSeq = 0;

const isNewReport = ref(true);
const carriedOverDate = ref<string | null>(null);
const reportUpdatedAt = ref<string | null>(null);

// A row as the sheet holds it. Blank is a distinct state from zero here: an
// empty Opening/Delivery is simply nothing yet (and saves as 0), while an empty
// Ending means "not counted" — which is why it must not collapse to 0, or an
// uncounted item would look like a shelf with none left.
type SheetItem = Omit<DailyInventoryReportItem, 'openingInventory' | 'delivery'> & {
    openingInventory: number | null;
    delivery: number | null;
};

const items = ref<SheetItem[]>([]);
const storeStock = ref<StockItem[]>([]);

// Modal state
const showAddModal = ref(false);
const newItem = ref({
    particulars: '',
    unit: 'pcs',
    section: 'Main',
    openingInventory: 0,
    delivery: 0,
    reminders: '',
});

// Helper for today in store's timezone
const getTodayDateStr = () => {
    const tz = storeContext.currentStore?.timezone || 'Asia/Manila';
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const p: Record<string, string> = {};
    parts.forEach((x) => {
        if (x.type !== 'literal') p[x.type] = x.value;
    });
    return `${p.year}-${p.month}-${p.day}`;
};

const currentStoreName = computed(() => storeContext.currentStore?.name || 'Store');

const isOwnerOrAdmin = computed(() =>
    ['OWNER', 'ADMIN'].includes(storeContext.currentStore?.role || '')
);

const isSelectedToday = computed(() => selectedDate.value === getTodayDateStr());

// Normalizer: strips spaces, punctuation, and converts to lowercase
const normalizeKey = (str: string): string => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// Built-in aliases mapping sheet particulars to inventory item names
const INVENTORY_ALIASES: Record<string, string[]> = {
    'best takoyaki flour': ['takoyaki flour', 'flour'],
    'best jap mayo': ['kewpie mayo', 'kewpie', 'jap mayo', 'japanese mayo'],
    'take out box': ['takeout box'],
    'takeout box': ['take out box'],
    'best takoyaki sauce': ['takoyaki sauce', 'sauce'],
    'takoyaki flour': ['best takoyaki flour'],
    'kewpie mayo': ['best jap mayo', 'jap mayo'],
    'takoyaki sauce': ['best takoyaki sauce'],
    'octobits': ['octo bits', 'octopus bits', 'octopus'],
    'crab stick': ['crabstick', 'crab sticks'],
    'bonito flakes': ['bonito', 'katsuobushi'],
    'spring onions': ['spring onion', 'green onions', 'scallions'],
    'hot sauce': ['chilli sauce', 'spicy sauce'],
    'chilli powder': ['chili powder', 'cayenne powder'],
    'buko juice': ['coconut juice', 'buko water'],
    'buko meat': ['coconut meat'],
};

// Stock mapping by lowercased name
const stockMap = computed(() => {
    const map = new Map<string, StockItem>();
    for (const s of storeStock.value) {
        if (s.name) {
            map.set(s.name.trim().toLowerCase(), s);
        }
    }
    return map;
});

// Stock mapping by normalized alphanumeric key (ignores spaces, hyphens, etc.)
const normalizedStockMap = computed(() => {
    const map = new Map<string, StockItem>();
    for (const s of storeStock.value) {
        if (s.name) {
            map.set(normalizeKey(s.name), s);
        }
    }
    return map;
});

const isLinked = (item: SheetItem): boolean => {
    if (!item) return false;

    // 1. Explicit link by itemId
    if (item.itemId && storeStock.value.some((s) => s.itemId === item.itemId)) {
        return true;
    }

    const particulars = (item.particulars || '').trim().toLowerCase();
    if (!particulars) return false;

    // 2. Direct name match (case-insensitive)
    if (stockMap.value.has(particulars)) return true;

    // 3. Normalized alphanumeric match (ignores spaces, hyphens, punctuation)
    const norm = normalizeKey(particulars);
    if (normalizedStockMap.value.has(norm)) return true;

    // 4. Known aliases match
    const aliases = INVENTORY_ALIASES[particulars] || [];
    for (const alias of aliases) {
        if (stockMap.value.has(alias.toLowerCase().trim())) return true;
        if (normalizedStockMap.value.has(normalizeKey(alias))) return true;
    }

    return false;
};

// Manual link modal state
const linkModalItem = ref<SheetItem | null>(null);
const selectedStockId = ref<string>('');

const openLinkModal = (item: SheetItem) => {
    linkModalItem.value = item;
    selectedStockId.value = item.itemId || '';
};

const confirmLinkItem = () => {
    if (!linkModalItem.value) return;
    if (!selectedStockId.value) {
        linkModalItem.value.itemId = null;
        linkModalItem.value.itemType = null;
    } else {
        const found = storeStock.value.find((s) => s.itemId === selectedStockId.value);
        if (found) {
            linkModalItem.value.itemId = found.itemId;
            linkModalItem.value.itemType = found.itemType;
        }
    }
    markChanged();
    linkModalItem.value = null;
    toast.showToast('Item link updated.', 'success');
};

// Section groupers
const groupedSections = computed(() => {
    const sections: { name: string; items: SheetItem[] }[] = [];
    const map = new Map<string, SheetItem[]>();

    for (const item of items.value) {
        const secName = item.section || 'Main';
        if (!map.has(secName)) {
            map.set(secName, []);
            sections.push({ name: secName, items: map.get(secName)! });
        }
        map.get(secName)!.push(item);
    }

    return sections;
});

const takoyakiCount = computed(() => (selectedTemplate.value === 'TAKOYAKI' ? items.value.length : 31));
const bukoCount = computed(() => (selectedTemplate.value === 'BUKO' ? items.value.length : 13));

const unlinkedCount = computed(() => {
    return items.value.filter((i) => !isLinked(i)).length;
});

const completedEndingCount = computed(() => {
    return items.value.filter((i) => i.endingInventory !== null && i.endingInventory !== undefined).length;
});

const totalUsedCount = computed(() => {
    return items.value.filter((i) => computeTotalUsed(i) !== null && computeTotalUsed(i)! > 0).length;
});

// Row calculations
const computeTotal = (item: SheetItem): number => {
    const op = Number(item.openingInventory) || 0;
    const del = Number(item.delivery) || 0;
    return op + del;
};

const computeTotalUsed = (item: SheetItem): number | null => {
    if (item.endingInventory === null || item.endingInventory === undefined || isNaN(Number(item.endingInventory))) {
        return null;
    }
    const total = computeTotal(item);
    const end = Number(item.endingInventory);
    return Math.max(0, total - end);
};

const formatNumber = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const formatLastSaved = (ts: string | null): string => {
    if (!ts) return 'recently';
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'recently';
    }
};

const isUrgentNote = (note: string | null | undefined): boolean => {
    if (!note) return false;
    const l = note.toLowerCase();
    return (
        l.includes('expiry') ||
        l.includes('defrost') ||
        l.includes('always') ||
        l.includes('opened') ||
        l.includes('only') ||
        l.includes('reminders')
    );
};

const sectionHeaderClass = (secName: string): string => {
    const s = secName.toUpperCase();
    if (s === 'OTHERS') return 'section-header--green';
    if (s === 'SUPPLIES') return 'section-header--peach';
    if (s.includes('PLASTIC') || s.includes('LID') || s.includes('BOTTLE')) return 'section-header--yellow';
    return 'section-header--neutral';
};

const isSuppliesRow = (item: SheetItem): boolean => {
    return item.section === 'Supplies';
};

// Every edit funnels through here: cell input, added row, removed row, link
// change. Nothing else may set isDirty, or it would go unsaved.
const markChanged = () => {
    isDirty.value = true;
    editSeq += 1;
    saveState.value = 'pending';
    saveError.value = null;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        autosaveTimer = null;
        void flushAutosave();
    }, AUTOSAVE_DELAY_MS);
};

const onFieldInput = () => {
    markChanged();
};

// Typed rather than bound with v-model.number, which leaves '' in the model for
// a cleared field. '' then reads as 0 through Number(), so an emptied Ending
// would silently record a count of zero instead of "not counted".
const onNumberInput = (
    item: SheetItem,
    field: 'openingInventory' | 'delivery' | 'endingInventory',
    event: Event
) => {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = raw === '' ? null : Number(raw);
    item[field] = parsed !== null && isNaN(parsed) ? null : parsed;
    markChanged();
};

// Counting a shelf means replacing numbers, not editing them, so a cell arrives
// selected and the first keystroke overwrites it.
let selectedOnFocus = false;

const selectOnFocus = (event: FocusEvent) => {
    const el = event.target as HTMLInputElement | null;
    if (!el) return;
    selectedOnFocus = true;
    el.select();
};

// A click focuses first and places the caret on release, which would drop the
// selection made above. Suppressed for that first click only, so dragging to
// select part of a value still works once the cell has focus.
const keepSelectionOnClick = (event: MouseEvent) => {
    if (!selectedOnFocus) return;
    selectedOnFocus = false;
    event.preventDefault();
};

// Writes the sheet now. Awaited before anything that swaps what `items` holds
// (date, template, reload, unmount) — the payload is built from current state,
// so a timer left to fire after a switch would write yesterday's counts onto
// today's sheet.
const flushAutosave = async (): Promise<void> => {
    if (autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
    }
    if (!isDirty.value) return;
    // One writer at a time: the API replaces the report wholesale, so overlapping
    // writes would race. Wait for the current one, then write again if still dirty.
    if (inFlight) {
        await inFlight;
        if (!isDirty.value) return;
    }
    inFlight = persistReport();
    try {
        await inFlight;
    } finally {
        inFlight = null;
    }
};

const persistReport = async (): Promise<void> => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !selectedDate.value) return;

    const seqAtStart = editSeq;
    const dateAtStart = selectedDate.value;
    const templateAtStart = selectedTemplate.value;
    saveState.value = 'saving';

    try {
        const payloadItems = items.value.map((item, idx) => ({
            id: item.id,
            section: item.section,
            particulars: item.particulars,
            unit: item.unit,
            openingInventory: Number(item.openingInventory) || 0,
            delivery: Number(item.delivery) || 0,
            endingInventory:
                item.endingInventory !== null && item.endingInventory !== undefined && !isNaN(Number(item.endingInventory))
                    ? Number(item.endingInventory)
                    : null,
            reminders: item.reminders || null,
            sortOrder: idx + 1,
            itemType: item.itemType,
            itemId: item.itemId,
        }));

        const res = await saveDailyInventoryReport(storeId, {
            reportType: templateAtStart,
            date: dateAtStart,
            items: payloadItems,
        });

        // Deliberately no reload: re-reading would replace `items` under the
        // cursor and throw away whatever is being typed right now. The response
        // carries everything needed, and the API rekeys items by particulars,
        // so the ids going stale costs nothing.
        isNewReport.value = false;
        carriedOverDate.value = null;
        reportUpdatedAt.value = res.report?.updatedAt || new Date().toISOString();
        lastSavedAt.value = new Date();
        saveError.value = null;

        if (editSeq === seqAtStart) {
            isDirty.value = false;
            saveState.value = 'saved';
        }
        // Otherwise the user kept typing: stay 'pending', the timer is already set.
    } catch (err: unknown) {
        const e = err as { message?: string; body?: { error?: { message?: string } } };
        // isDirty stays true, so the next edit or a Retry writes these counts again.
        saveError.value = e?.body?.error?.message || e?.message || 'Not saved';
        saveState.value = 'error';
    }
};

const retrySave = () => {
    void flushAutosave();
};

const lastSavedLabel = computed(() => {
    if (!lastSavedAt.value) return '';
    return lastSavedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

// Date changes
// Each of these swaps the sheet out, so pending edits are written against the
// date and template they were typed on before anything changes.
const changeDate = async (days: number) => {
    if (!selectedDate.value) return;
    await flushAutosave();
    const [y, m, d] = selectedDate.value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    selectedDate.value = date.toISOString().slice(0, 10);
    await loadReport();
};

const goToToday = async () => {
    await flushAutosave();
    selectedDate.value = getTodayDateStr();
    await loadReport();
};

// The date input has already changed `selectedDate` by the time this fires, so
// the flush is skipped when dirty — writing now would file the old day's counts
// under the new date. Those edits are saved by the debounce or on switch anyway.
const onDateChanged = async () => {
    await loadReport();
};

const switchTemplate = async (tmpl: DailyInventoryReportType) => {
    if (selectedTemplate.value === tmpl) return;
    await flushAutosave();
    selectedTemplate.value = tmpl;
    await loadReport();
};

// Pulls in what another device has saved, and clears "Not in inventory" flags
// for items linked elsewhere since this sheet was opened — which is why it
// reloads the stock list too, not just the report. Pending edits are written
// first, so refreshing can never cost a count.
const refreshReport = async () => {
    await flushAutosave();
    await Promise.all([fetchStock(), loadReport()]);
};

// Load stock from inventory API
const fetchStock = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId) return;
    try {
        const res = await listStock(storeId);
        storeStock.value = res.stock || [];
    } catch (err) {
        console.error('Failed to load store stock', err);
    }
};

// Load daily report
const loadReport = async () => {
    const storeId = storeContext.currentStoreId;
    if (!storeId || !selectedDate.value) return;

    isLoading.value = true;
    try {
        const res = await getDailyInventoryReport(storeId, selectedTemplate.value, selectedDate.value);
        const report = res.report;
        isNewReport.value = report.isNew;
        carriedOverDate.value = report.carriedOverFromDate;
        reportUpdatedAt.value = report.updatedAt || null;

        items.value = (report.items || []).map((i) => ({
            id: i.id,
            section: i.section,
            particulars: i.particulars,
            unit: i.unit,
            // Shown blank when zero. Nothing was delivered and nothing was
            // carried over reads as an empty cell on a paper count sheet; a
            // literal 0 is just something you would have to clear before typing.
            // The TOTAL column still shows the arithmetic, so nothing is hidden.
            openingInventory: Number(i.openingInventory) || null,
            delivery: Number(i.delivery) || null,
            total: Number(i.total) || 0,
            endingInventory: i.endingInventory !== null && i.endingInventory !== undefined ? Number(i.endingInventory) : null,
            reminders: i.reminders || null,
            sortOrder: i.sortOrder,
            totalUsed: i.totalUsed !== null && i.totalUsed !== undefined ? Number(i.totalUsed) : null,
            itemType: i.itemType,
            itemId: i.itemId,
        }));
        isDirty.value = false;
        editSeq += 1;
        saveState.value = 'idle';
        saveError.value = null;
    } catch (err: unknown) {
        const e = err as { message?: string };
        toast.showToast(e?.message || 'Failed to load daily inventory', 'error');
    } finally {
        isLoading.value = false;
    }
};

// Add custom item
const confirmAddItem = () => {
    if (!newItem.value.particulars.trim() || !newItem.value.unit.trim()) return;

    items.value.push({
        section: newItem.value.section,
        particulars: newItem.value.particulars.trim(),
        unit: newItem.value.unit.trim(),
        openingInventory: Number(newItem.value.openingInventory) || null,
        delivery: Number(newItem.value.delivery) || null,
        total: (Number(newItem.value.openingInventory) || 0) + (Number(newItem.value.delivery) || 0),
        endingInventory: null,
        reminders: newItem.value.reminders.trim() || null,
        sortOrder: items.value.length + 1,
        totalUsed: null,
    });

    newItem.value = {
        particulars: '',
        unit: 'pcs',
        section: selectedTemplate.value === 'TAKOYAKI' ? 'Others' : 'Main',
        openingInventory: 0,
        delivery: 0,
        reminders: '',
    };
    showAddModal.value = false;
    markChanged();
    toast.showToast('Item added to sheet', 'info');
};

const removeItem = (index: number, sectionList: SheetItem[]) => {
    const itemToRemove = sectionList[index];
    const overallIdx = items.value.indexOf(itemToRemove);
    if (overallIdx !== -1) {
        items.value.splice(overallIdx, 1);
        markChanged();
    }
};

// The debounce leaves a sub-second window where counts are typed but not yet
// written. Closing the tab in that window is the one way to lose them, so the
// browser asks first.
const warnIfUnsaved = (event: BeforeUnloadEvent) => {
    if (!isDirty.value) return;
    event.preventDefault();
    event.returnValue = '';
};

onMounted(async () => {
    window.addEventListener('beforeunload', warnIfUnsaved);
    selectedDate.value = getTodayDateStr();
    await fetchStock();
    await loadReport();
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', warnIfUnsaved);
    // Navigating away inside the app: no dialog, just write what is pending.
    void flushAutosave();
});

watch(
    () => storeContext.currentStoreId,
    async (newStoreId) => {
        if (newStoreId) {
            await flushAutosave();
            selectedDate.value = getTodayDateStr();
            await fetchStock();
            await loadReport();
        }
    }
);
</script>

<style scoped>
.daily-inv-shell {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    width: 100%;
    /* The app's sticky TopNav: 56px tall plus its 1px bottom border. The bar
       below parks directly beneath it. */
    --topnav-height: 57px;
}

/* ── HEADER ── */
/* Pinned so Save stays reachable from anywhere in a long sheet: the whole point
   of the screen is counting your way down the rows and saving at the end, and
   scrolling back up to a button is the one thing you do every single day.
   Deliberately one row tall: the role badge and subtitle sit below and scroll
   away, since they are orientation you read once, and a pinned bar costs
   viewport on every row you are trying to read. */
.daily-inv-header {
    position: sticky;
    top: var(--topnav-height);
    /* Under the TopNav's 100, above the sheet so rows pass beneath it. */
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.5rem 0;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
}

/* Role badge and store line: on screen when you arrive, gone once you start
   counting. */
.daily-inv-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.daily-inv-heading {
    font-size: 1.1rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 0;
}

.role-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
}

.role-indicator--admin {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.role-indicator--staff {
    background: #eff6ff;
    color: #1e40af;
    border: 1px solid #bfdbfe;
}

.daily-inv-sub {
    font-size: 0.78rem;
    color: #64748b;
    margin: 0;
}

.daily-inv-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
}

/* ── CONTROLS CARD ── */
.controls-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.45rem 0.65rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.template-pills {
    display: inline-flex;
    background: #f1f5f9;
    padding: 0.25rem;
    border-radius: 10px;
    gap: 0.25rem;
}

.template-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.65rem;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
}

.template-pill:hover {
    color: #0f172a;
}

.template-pill--active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.template-pill-emoji {
    font-size: 1rem;
}

.template-pill-count {
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border-radius: 9999px;
    background: #e2e8f0;
    color: #64748b;
}

.template-pill--active .template-pill-count {
    background: #f1f5f9;
    color: #334155;
}

/* Date Nav */
.date-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.date-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    border-radius: 6px;
    color: #334155;
    cursor: pointer;
    transition: background 0.15s ease;
}

.date-nav-btn:hover {
    background: #f8fafc;
}

.date-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.date-icon {
    position: absolute;
    left: 8px;
    color: #64748b;
    pointer-events: none;
}

.date-picker-input {
    padding: 0.35rem 0.5rem 0.35rem 2rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
    background: #ffffff;
}

.today-btn {
    padding: 0.35rem 0.75rem;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
}

.today-btn:hover {
    background: #f8fafc;
}

.today-btn--active {
    background: #0f172a;
    color: #ffffff;
    border-color: #0f172a;
}

/* ── BANNERS ── */
.banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.78rem;
}

.banner--info {
    background: #eff6ff;
    color: #1e3a8a;
    border: 1px solid #bfdbfe;
}

.banner--success {
    background: #f0fdf4;
    color: #14532d;
    border: 1px solid #bbf7d0;
}

.banner--neutral {
    background: #f8fafc;
    color: #334155;
    border: 1px solid #e2e8f0;
}

.banner-icon {
    flex-shrink: 0;
}

.banner-content {
    flex: 1;
}

.banner-sub {
    font-size: 0.75rem;
    color: #64748b;
    margin-left: auto;
}

/* ── STATS STRIP ── */
.inv-stats-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
    gap: 0.45rem;
}

.stat-box {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.6rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}

.stat-box-val {
    font-size: 0.98rem;
    font-weight: 800;
    color: #0f172a;
}

.stat-box-lbl {
    font-size: 0.68rem;
    color: #64748b;
    font-weight: 500;
}

.stat-box--warn {
    border-color: #fecaca;
    background: #fef2f2;
}

.stat-box--warn .stat-box-val {
    color: #dc2626;
}

.stat-box--accent {
    border-color: #bbf7d0;
    background: #f0fdf4;
}

.stat-box--accent .stat-box-val {
    color: #16a34a;
}

/* ── SHEET TABLE CARD ── */
.sheet-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.sheet-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    gap: 0.75rem;
    color: #64748b;
}

.loading-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.sheet-table-wrap {
    overflow-x: auto;
    max-width: 100%;
}

.sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
    font-family: inherit;
    text-align: left;
}

/* ── TABLE HEADERS ── */
.header-main-row th {
    padding: 0.4rem 0.55rem;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    white-space: nowrap;
}

/* Specific spreadsheet header tints matching user reference images */
.sheet-table--takoyaki .header-main-row .col-opening {
    background: #c7e5cf !important;
    color: #064e3b;
}

.sheet-table--takoyaki .header-main-row .col-ending {
    background: #c7e5cf !important;
    color: #064e3b;
}

.sheet-table--buko .header-main-row .col-ending {
    background: #facc15 !important;
    color: #000000;
}

.header-main-row .col-reminders {
    color: #dc2626;
}

/* ── SECTION HEADER BARS ── */
.section-header-row td {
    padding: 0.25rem 0.6rem;
    font-weight: 800;
    font-size: 0.72rem;
    border: 1px solid #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

/* Takoyaki Green section bar ("Others") */
.section-header--green td {
    background: #4b8543;
    color: #ffffff;
}

/* Takoyaki Supplies Warm bar */
.section-header--peach td {
    background: #65a30d;
    color: #ffffff;
}

/* Buko Yellow section bar ("PLASTIC CUPS", "FLAT LID", "BOTTLES") */
.section-header--yellow td {
    background: #ffff00;
    color: #000000;
}

.section-header--neutral td {
    background: #e2e8f0;
    color: #1e293b;
}

/* ── ROW STYLES ── */
.sheet-row td {
    padding: 0.2rem 0.4rem;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
}

.sheet-row:hover {
    background: #f8fafc;
}

/* Takoyaki supplies section rows have a subtle warm tint */
.row--supplies {
    background: #fffbf5;
}

/* ── PARTICULARS CELL ── */
.col-particulars {
    min-width: 190px;
}

.particular-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.particular-name {
    font-weight: 600;
    color: #1e293b;
}

/* RED TEXT for items NOT in inventory (as requested!) */
.particular-name--unlinked {
    color: #dc2626 !important;
    font-weight: 700 !important;
}

.unlinked-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #b91c1c;
    background: #fee2e2;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    width: fit-content;
}

.link-action-btn {
    padding: 0.05rem 0.35rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #b91c1c;
    background: #fecaca;
    border: 1px solid #f87171;
    border-radius: 3px;
    cursor: pointer;
    text-decoration: underline;
    transition: background 0.15s ease;
}

.link-action-btn:hover {
    background: #fca5a5;
    color: #991b1b;
}

/* ── INPUT CELLS ── */
.col-opening,
.col-delivery,
.col-ending {
    width: 92px;
    text-align: right;
}

/* Tinted columns matching image */
.sheet-table--takoyaki .col-opening {
    background: #e8f5ed;
}

.sheet-table--takoyaki .col-ending {
    background: #e8f5ed;
}

.sheet-table--buko .col-ending {
    background: #fefce8;
}

.cell-input {
    width: 100%;
    padding: 0.2rem 0.35rem;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    font-size: 0.78rem;
    font-family: inherit;
    color: #0f172a;
    background: #ffffff;
    text-align: right;
    transition: all 0.15s ease;
}

.cell-input:focus {
    outline: none;
    border-color: #0f172a;
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

.cell-input--ending {
    font-weight: 700;
}

.cell-input--filled {
    border-color: #86efac;
    background: #f0fdf4;
}

.cell-input--notes {
    text-align: left;
    min-width: 140px;
}

.cell-input--urgent {
    color: #dc2626;
    font-weight: 700;
}

/* Locked cell for staff */
.cell-locked {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
    padding: 0.2rem 0.35rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
}

.lock-icon {
    color: #94a3b8;
}

/* ── READONLY / COMPUTED CELLS ── */
.col-unit,
.col-unit2 {
    width: 56px;
    text-align: center;
}

.unit-text {
    font-size: 0.7rem;
    color: #475569;
    font-weight: 500;
}

.col-total,
.col-used {
    width: 88px;
    text-align: right;
    padding-right: 0.6rem !important;
}

.computed-val {
    font-variant-numeric: tabular-nums;
}

.col-reminders {
    min-width: 150px;
}

.col-actions {
    width: 36px;
    text-align: center;
}

.row-del-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: #94a3b8;
    cursor: pointer;
}

.row-del-btn:hover {
    background: #fee2e2;
    color: #dc2626;
}

/* ── BUTTON STYLES (match app tokens) ── */
.primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: #0f172a;
    color: #ffffff;
    border: none;
    border-radius: 7px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
}

.primary-button:hover:not(:disabled) {
    background: #1e293b;
}

.primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.ghost-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.85rem;
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
}

.ghost-button:hover:not(:disabled) {
    background: #f8fafc;
}

.button-compact {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
}

.btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

/* The spinner sits on the page rather than on a dark button here. */
.btn-spinner--dark {
    border-color: rgba(15, 23, 42, 0.2);
    border-top-color: #0f172a;
}

/* ── AUTOSAVE STATUS ── */
/* Sized like the buttons beside it so removing Save did not leave the bar
   lurching between widths as the state changes. */
.save-state {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 170px;
    padding: 0.3rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
}

.save-state--idle {
    color: #64748b;
}

/* Amber, not red: nothing is wrong, it just has not landed yet. */
.save-state--pending {
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
}

.save-state--saving {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #334155;
}

.save-state--saved {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #15803d;
}

.save-state--error {
    background: #fef2f2;
    border-color: #fecaca;
    color: #b91c1c;
}

.save-state-retry {
    margin-left: 0.15rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid #f87171;
    border-radius: 4px;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
}

.save-state-retry:hover {
    background: #fecaca;
}

.spin-icon {
    animation: spin 1s linear infinite;
}

/* ── MODAL ── */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
    padding: 1rem;
}

.modal-box {
    background: #ffffff;
    border-radius: 12px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}

.modal-close {
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
}

.modal-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.form-field label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
}

.form-row {
    display: flex;
    gap: 0.75rem;
}

.form-input,
.form-select {
    padding: 0.45rem 0.65rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #0f172a;
    background: #ffffff;
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: #0f172a;
}
</style>
