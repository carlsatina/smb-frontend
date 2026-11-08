// Regenerates the Help & Support screenshots in public/help.
// Needs the Vite dev server on :8080; every API call is mocked, so no login or DB is used.
// Usage: npm i --no-save playwright-core && node scripts/help-screenshots.mjs public/help [name,name]
// Set CHROME_PATH if Chromium is not at the default Playwright cache path.

import { chromium } from 'playwright-core';

const OUT = process.argv[2] || 'public/help';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const exe = process.env.CHROME_PATH || process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const APP = 'http://localhost:8080';

const grab = { key: 'GRAB', name: 'Grab', markupPercent: 25, rounding: 'NEAREST_1', alwaysTakeout: true, active: true };
const store = {
    id: 's1', name: 'Kape Kanto Café', storeType: 'RETAIL', timezone: 'Asia/Manila', currency: 'PHP',
    allowNegativeStock: false, lowStockThreshold: 5,
    unitOptions: ['pc', 'cup', 'bottle', 'g', 'ml', 'kg', 'L'],
    categoryOptions: ['Coffee', 'Non-coffee', 'Pastries', 'Drinks'],
    subcategoryOptions: { Coffee: ['Hot', 'Iced'] },
    salesChannels: [grab],
    expenseCategoryOptions: ['Rent', 'Utilities', 'Supplies', 'Salaries'],
    defaultTaxRate: 0, defaultDiscount: 20, cashierSalesHistoryLimit: 50,
    paymentMethods: ['CASH', 'GCASH', 'MAYA', 'CARD'],
    aiProvider: null, aiModel: null, aiApiKeySet: false, aiApiKeyLast4: null,
    role: 'OWNER', permissions: [], billingSuspended: false, billingOverdue: [],
    createdAt: '2026-01-05T00:00:00.000Z',
};
const store2 = { ...store, id: 's2', name: 'Kape Kanto Warehouse', storeType: 'WAREHOUSE', salesChannels: [] };

const ingredients = [
    { id: 'i1', name: 'Espresso beans', unit: 'g', category: 'RAW_MATERIAL', costPerUnit: 1.2, active: true, purchaseUnit: 'kg', purchaseUnitSize: 1000 },
    { id: 'i2', name: 'Fresh milk', unit: 'ml', category: 'RAW_MATERIAL', costPerUnit: 0.11, active: true, purchaseUnit: 'L', purchaseUnitSize: 1000 },
    { id: 'i3', name: 'Condensed milk', unit: 'ml', category: 'RAW_MATERIAL', costPerUnit: 0.18, active: true, purchaseUnit: null, purchaseUnitSize: null },
    { id: 'i4', name: 'Ice', unit: 'g', category: 'RAW_MATERIAL', costPerUnit: 0.01, active: true },
    { id: 'i5', name: 'Brown sugar syrup', unit: 'ml', category: 'RAW_MATERIAL', costPerUnit: 0.25, active: true },
    { id: 'i6', name: '16oz cup', unit: 'pc', category: 'PACKAGING', costPerUnit: 4.5, active: true, purchaseUnit: 'Box', purchaseUnitSize: 50 },
    { id: 'i7', name: 'Dome lid', unit: 'pc', category: 'PACKAGING', costPerUnit: 1.8, active: true },
    { id: 'i8', name: 'Paper straw', unit: 'pc', category: 'PACKAGING', costPerUnit: 0.9, active: true },
];
const products = [
    { id: 'p1', name: 'Iced Spanish Latte', type: 'RECIPE', price: 140, cost: null, unit: 'cup', category: 'Coffee', subcategory: 'Iced', active: true, recipeLineCount: 4, lowStockThreshold: null, channelPrices: {}, unavailableChannels: [] },
    { id: 'p2', name: 'Hot Americano', type: 'RECIPE', price: 110, unit: 'cup', category: 'Coffee', subcategory: 'Hot', active: true, recipeLineCount: 2 },
    { id: 'p3', name: 'Caramel Macchiato', type: 'RECIPE', price: 155, unit: 'cup', category: 'Coffee', subcategory: 'Iced', active: true, recipeLineCount: 4 },
    { id: 'p4', name: 'Iced Matcha Latte', type: 'RECIPE', price: 150, unit: 'cup', category: 'Non-coffee', active: true, recipeLineCount: 3 },
    { id: 'p5', name: 'Ensaymada', type: 'READY_MADE', price: 65, cost: 32, unit: 'pc', category: 'Pastries', active: true },
    { id: 'p6', name: 'Banana Bread', type: 'READY_MADE', price: 85, cost: 40, unit: 'pc', category: 'Pastries', active: true },
    { id: 'p7', name: 'Bottled Water', type: 'READY_MADE', price: 25, cost: 12, unit: 'bottle', category: 'Drinks', active: true },
    { id: 'p8', name: 'Chocolate Chip Cookie', type: 'READY_MADE', price: 55, cost: 22, unit: 'pc', category: 'Pastries', active: true },
];
const stock = [
    ...ingredients.map((i, n) => ({ itemType: 'INGREDIENT', itemId: i.id, name: i.name, unit: i.unit, category: null, currentQty: [2400, 8200, 1500, 9000, 640, 180, 210, 4][n], lowStockThreshold: 5, active: true, subType: i.category })),
    ...products.filter((p) => p.type === 'READY_MADE').map((p, n) => ({ itemType: 'PRODUCT', itemId: p.id, name: p.name, unit: p.unit, category: p.category, currentQty: [18, 12, 48, 30][n], lowStockThreshold: 5, active: true, subType: 'READY_MADE' })),
];
const ing = (id) => { const i = ingredients.find((x) => x.id === id); return { id: i.id, name: i.name, unit: i.unit, costPerUnit: i.costPerUnit, active: true }; };
const recipeLines = [
    { id: 'r1', ingredientId: 'i1', qtyPerProductUnit: 18, ingredient: ing('i1') },
    { id: 'r2', ingredientId: 'i2', qtyPerProductUnit: 180, ingredient: ing('i2') },
    { id: 'r3', ingredientId: 'i3', qtyPerProductUnit: 30, ingredient: ing('i3') },
    { id: 'r4', ingredientId: 'i4', qtyPerProductUnit: 150, ingredient: ing('i4') },
];
const packagingLines = [
    { id: 'k1', ingredientId: 'i6', qtyPerProductUnit: 1, ingredient: ing('i6') },
    { id: 'k2', ingredientId: 'i7', qtyPerProductUnit: 1, ingredient: ing('i7') },
];
const members = [
    { id: 'm1', userId: 'u1', fullName: 'Ana Cruz', email: 'ana@kapekanto.ph', role: 'OWNER', createdAt: '2026-01-05', customPermissionCount: 0 },
    { id: 'm2', userId: 'u2', fullName: 'Rey Santos', email: 'rey@kapekanto.ph', role: 'ADMIN', createdAt: '2026-01-06', customPermissionCount: 0 },
    { id: 'm3', userId: 'u3', fullName: 'Maria Reyes', email: 'maria@kapekanto.ph', role: 'CASHIER', createdAt: '2026-02-01', customPermissionCount: 0 },
];


// ── Data for the sales, purchasing, reports, schedule and audit shots ──
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const H = 3600e3, D = 24 * H;
const cashier = (id, name) => ({ id, fullName: name, email: `${name.split(' ')[0].toLowerCase()}@kapekanto.ph` });
const maria = cashier('u3', 'Maria Reyes'), rey = cashier('u2', 'Rey Santos');
const sales = [
    { id: 'sa1', receiptNumber: 1048, status: 'FINALIZED', subtotal: 345, discount: 0, tax: 0, total: 345, paymentMethod: 'GCASH', orderType: 'TAKEOUT', channel: null, createdAt: iso(0.4 * H), finalizedAt: iso(0.4 * H), voidedAt: null, itemCount: 3, cashier: maria, items: [{ id: 'i1', name: 'Iced Spanish Latte', qty: 2 }, { id: 'i2', name: 'Ensaymada', qty: 1 }] },
    { id: 'sa2', receiptNumber: 1047, status: 'FINALIZED', subtotal: 300, discount: 0, tax: 0, total: 300, paymentMethod: 'GCASH', orderType: 'TAKEOUT', channel: 'GRAB', createdAt: iso(1.1 * H), finalizedAt: iso(1.1 * H), voidedAt: null, itemCount: 2, cashier: maria, items: [{ id: 'i3', name: 'Caramel Macchiato', qty: 2 }] },
    { id: 'sa3', receiptNumber: 1046, status: 'VOIDED', subtotal: 110, discount: 0, tax: 0, total: 110, paymentMethod: 'CASH', orderType: 'DINE_IN', channel: null, createdAt: iso(1.6 * H), finalizedAt: iso(1.6 * H), voidedAt: iso(1.5 * H), itemCount: 1, cashier: rey, items: [{ id: 'i4', name: 'Hot Americano', qty: 1 }] },
    { id: 'sa4', receiptNumber: 1045, status: 'FINALIZED', subtotal: 290, discount: 58, tax: 0, total: 232, paymentMethod: 'CASH', orderType: 'DINE_IN', channel: null, createdAt: iso(2.3 * H), finalizedAt: iso(2.3 * H), voidedAt: null, editedAt: iso(2 * H), itemCount: 2, cashier: rey, items: [{ id: 'i5', name: 'Iced Matcha Latte', qty: 1 }, { id: 'i6', name: 'Banana Bread', qty: 1 }, { id: 'i7', name: 'Bottled Water', qty: 2 }] },
    { id: 'sa5', receiptNumber: 1044, status: 'FINALIZED', subtotal: 165, discount: 0, tax: 0, total: 165, paymentMethod: 'MAYA', orderType: 'TAKEOUT', channel: null, createdAt: iso(3.2 * H), finalizedAt: iso(3.2 * H), voidedAt: null, itemCount: 2, cashier: maria, items: [{ id: 'i8', name: 'Hot Americano', qty: 1 }, { id: 'i9', name: 'Chocolate Chip Cookie', qty: 1 }] },
];
const saleDetail = { ...sales[0], items: [
    { id: 'i1', productId: 'p1', name: 'Iced Spanish Latte', qty: 2, unitPrice: 140, discount: 0, tax: 0, total: 280 },
    { id: 'i2', productId: 'p5', name: 'Ensaymada', qty: 1, unitPrice: 65, discount: 0, tax: 0, total: 65 },
] };
const suppliers = [
    { id: 'sup1', name: 'Bean Bros Coffee Roasters', email: 'orders@beanbros.ph', phone: '+63 917 555 0101', createdAt: iso(60 * D), updatedAt: iso(9 * D) },
    { id: 'sup2', name: 'Dairy Fresh Distributors', email: 'sales@dairyfresh.ph', phone: '+63 918 555 0144', createdAt: iso(55 * D), updatedAt: iso(3 * D) },
    { id: 'sup3', name: 'PackRight Supplies', email: null, phone: '+63 919 555 0188', createdAt: iso(40 * D), updatedAt: iso(20 * D) },
];
const purchaseOrder = {
    id: 'po1', supplierName: 'Dairy Fresh Distributors', supplierId: 'sup2', status: 'SENT',
    expectedDate: new Date(now + D).toISOString(), createdAt: iso(2 * D), updatedAt: iso(1 * D), receipts: [],
    items: [
        { id: 'pi1', itemType: 'INGREDIENT', itemId: 'i2', ingredient: { id: 'i2', name: 'Fresh milk', unit: 'ml' }, qtyOrdered: 24000, qtyReceived: 0, qtyRemaining: 24000, unitCost: 0.11 },
        { id: 'pi2', itemType: 'INGREDIENT', itemId: 'i3', ingredient: { id: 'i3', name: 'Condensed milk', unit: 'ml' }, qtyOrdered: 6000, qtyReceived: 0, qtyRemaining: 6000, unitCost: 0.18 },
        { id: 'pi3', itemType: 'PRODUCT', itemId: 'p7', product: { id: 'p7', name: 'Bottled Water', unit: 'bottle', type: 'READY_MADE' }, qtyOrdered: 48, qtyReceived: 0, qtyRemaining: 48, unitCost: 12 },
    ],
};
const movements = [
    { id: 'mv1', itemType: 'INGREDIENT', itemId: 'i2', itemName: 'Fresh milk', itemUnit: 'ml', qtyDelta: -360, type: 'SALE', referenceType: 'SALE', referenceId: 'sa1', createdAt: iso(0.4 * H), createdBy: maria },
    { id: 'mv2', itemType: 'PRODUCT', itemId: 'p5', itemName: 'Ensaymada', itemUnit: 'pc', itemCategory: 'Pastries', qtyDelta: -1, type: 'SALE', referenceType: 'SALE', referenceId: 'sa1', createdAt: iso(0.4 * H), createdBy: maria },
    { id: 'mv3', itemType: 'INGREDIENT', itemId: 'i5', itemName: 'Brown sugar syrup', itemUnit: 'ml', qtyDelta: -120, type: 'WASTE', note: 'Spilled bottle', createdAt: iso(5 * H), createdBy: rey },
    { id: 'mv4', itemType: 'INGREDIENT', itemId: 'i2', itemName: 'Fresh milk', itemUnit: 'ml', qtyDelta: 4000, type: 'ADJUSTMENT', note: 'Opening count', createdAt: iso(1 * D), createdBy: cashier('u1', 'Ana Cruz') },
    { id: 'mv5', itemType: 'INGREDIENT', itemId: 'i6', itemName: '16oz cup', itemUnit: 'pc', qtyDelta: 200, type: 'TRANSFER_IN', counterpartStoreName: 'Kape Kanto Warehouse', counterpartStoreType: 'WAREHOUSE', createdAt: iso(1.2 * D), createdBy: rey },
    { id: 'mv6', itemType: 'PRODUCT', itemId: 'p7', itemName: 'Bottled Water', itemUnit: 'bottle', itemCategory: 'Drinks', qtyDelta: 48, type: 'PURCHASE_RECEIPT', referenceType: 'PURCHASE_RECEIPT', referenceId: 'rc1', createdAt: iso(2 * D), createdBy: rey },
];
const expenses = [
    ['Rent', 18000, 'November rent', 7], ['Utilities', 4250, 'Meralco', 5], ['Supplies', 680, 'Ice and tissue', 2], ['Utilities', 1499, 'Internet', 4], ['Salaries', 3500, 'Part-timer weekend', 1],
].map(([category, amount, note, daysAgo], i) => ({ id: `ex${i}`, date: iso(daysAgo * D).slice(0, 10), amount, category, note, source: 'MANUAL', createdAt: iso(daysAgo * D), updatedAt: iso(daysAgo * D), createdBy: cashier('u1', 'Ana Cruz') }));
const auditLogs = [
    { id: 'al1', action: 'MCP_PRODUCT_UPDATED', entityType: 'Product', entityId: 'p1', meta: { via: 'MCP', tokenName: 'Claude on my laptop', name: 'Iced Spanish Latte', changes: { price: 145 }, previous: { price: 140 } }, createdAt: iso(0.3 * H), actor: cashier('u1', 'Ana Cruz') },
    { id: 'al2', action: 'SALE_EDITED', entityType: 'Sale', entityId: 'sa4', meta: { receiptNumber: 1045 }, createdAt: iso(2 * H), actor: rey },
    { id: 'al3', action: 'INVENTORY_ADJUSTMENT', entityType: 'InventoryMovement', entityId: 'mv4', meta: { itemName: 'Fresh milk', qtyDelta: 4000, note: 'Opening count' }, createdAt: iso(1 * D), actor: cashier('u1', 'Ana Cruz') },
    { id: 'al4', action: 'PURCHASE_RECEIPT', entityType: 'PurchaseReceipt', entityId: 'rc1', meta: { invoiceNumber: 'INV-20931', items: [{ itemName: 'Bottled Water', qtyReceived: 48, unitCost: 12 }] }, createdAt: iso(2 * D), actor: rey },
    { id: 'al5', action: 'SUPPLIER_UPDATED', entityType: 'Supplier', entityId: 'sup2', meta: { name: 'Dairy Fresh Distributors', changes: { phone: '+63 918 555 0144' } }, createdAt: iso(3 * D), actor: cashier('u1', 'Ana Cruz') },
];
const dayList = (from, to) => {
    const out = [];
    for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d = new Date(d.getTime() + D)) out.push(d.toISOString().slice(0, 10));
    return out;
};
const minutes = (h, m = 0) => h * 60 + m;
const weekOf = (weekStart) => dayList(weekStart, new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + 6 * D).toISOString().slice(0, 10));
const scheduleRow = (id, name, role, pattern, pay) => ({ id, storeMemberId: `sm-${id}`, userId: id, name, role, sortOrder: 0, isSelf: false, pattern, pay });
const staffRows = [
    scheduleRow('r1', 'Maria Reyes', 'CASHIER', ['RD', 'O', 'O', 'O', 'O', 'O', 'C'], { daysWorked: 6, otHours: 2, dailyRate: 500, otHourlyRate: 62.5, lessCa: 500, payout: 2625 }),
    scheduleRow('r2', 'Rey Santos', 'ADMIN', ['C', 'C', 'RD', 'C', 'C', 'C', 'O'], { daysWorked: 6, otHours: 0, dailyRate: 600, otHourlyRate: 75, lessCa: 0, payout: 3600 }),
    scheduleRow('r3', 'Jun Dela Cruz', 'CASHIER', ['O', 'RD', 'C', 'C', 'O', 'O', 'O'], { daysWorked: 6, otHours: 4, dailyRate: 500, otHourlyRate: 62.5, lessCa: 0, payout: 3250 }),
];
const presetFor = { O: { label: 'Opening', start: minutes(7), end: minutes(16), icon: 'sun' }, C: { label: 'Closing', start: minutes(13), end: minutes(22), icon: 'moon' } };
const shiftsFor = (pattern, dates) => dates.map((date, i) => pattern[i] === 'RD'
    ? { date, isRestDay: true, startMinute: null, endMinute: null, presetId: null }
    : { date, isRestDay: false, startMinute: presetFor[pattern[i]].start, endMinute: presetFor[pattern[i]].end, presetId: pattern[i], presetLabel: presetFor[pattern[i]].label, icon: presetFor[pattern[i]].icon });
const fullPay = (p) => ({ ...p, otAuto: false, computedOtHours: p.otHours, hoursPerDay: 8, breakMinutes: 60, remarks: null, caBalance: p.lessCa ? 1500 : 0, actualDaysWorked: p.daysWorked, actualHours: p.daysWorked * 8, actualOtHours: p.otHours, hasAttendance: true, deductions: [] });

const browser = await chromium.launch({ executablePath: exe });

const newPage = async (viewport = { width: 1280, height: 820 }) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1.5 });
    await page.addInitScript(() => {
        localStorage.setItem('accessToken', 'x');
        localStorage.setItem('currentStoreId', 's1');
    });
    await page.route('**/api/v1/**', (r) => r.fulfill({ json: {} }));
    const json = (pattern, body) => page.route(pattern, (r) => r.fulfill({ json: body }));
    await json('**/api/v1/auth/me', { user: { id: 'u1', email: 'ana@kapekanto.ph', fullName: 'Ana Cruz', emailVerified: true } });
    await json('**/api/v1/stores', { stores: [store, store2] });
    await json('**/api/v1/stores/s1/ingredients', { ingredients });
    await json('**/api/v1/stores/s1/products', { products });
    await json('**/api/v1/stores/s1/products/p1', { product: products[0] });
    await json('**/api/v1/stores/s1/products/p1/recipe-lines', { lines: recipeLines });
    await json('**/api/v1/stores/s1/products/p1/packaging', { lines: packagingLines });
    await json('**/api/v1/stores/s1/inventory/stock**', { stock });
    await json('**/api/v1/stores/s1/inventory/movements**', { movements: [], total: 0, page: 1, pageSize: 10 });
    await json('**/api/v1/stores/s1/members', { members });
    await json('**/api/v1/stores/s1/invites', { invites: [] });
    await json('**/api/v1/stores/s1/sales**', { sales, total: sales.length, page: 1, pageSize: 20 });
    await json('**/api/v1/stores/s1/sales/sa1', { sale: saleDetail });
    await json('**/api/v1/stores/s1/suppliers', { suppliers });
    await json('**/api/v1/stores/s1/purchase-orders**', { purchaseOrders: [], total: 0, page: 1, pageSize: 20 });
    await json('**/api/v1/stores/s1/purchase-orders/po1', { purchaseOrder });
    await json('**/api/v1/stores/s1/inventory/movements**', { movements, total: movements.length, page: 1, pageSize: 20 });
    await json('**/api/v1/stores/s1/expenses**', { expenses });
    await json('**/api/v1/stores/s1/audit-logs**', { logs: auditLogs, total: auditLogs.length, page: 1, pageSize: 20 });
    await json('**/api/v1/stores/s1/schedule/presets', { presets: Object.entries(presetFor).map(([id, p], i) => ({ id, label: p.label, icon: p.icon, startMinute: p.start, endMinute: p.end, sortOrder: i })) });
    await json('**/api/v1/stores/s1/schedule/members', { members: staffRows.map((r) => ({ storeMemberId: r.storeMemberId, userId: r.userId, name: r.name, role: r.role })) });
    await json('**/api/v1/stores/s1/schedule/attendance/me', { attendance: { storeMemberId: 'sm-r1', timeZone: 'Asia/Manila', workDate: new Date().toISOString().slice(0, 10), serverTime: new Date().toISOString(), openEntry: null, missedTimeOuts: 0, shift: { isRestDay: false, startMinute: minutes(7), endMinute: minutes(16), icon: 'sun', presetLabel: 'Opening', isDraft: false }, entries: [], reconciliation: { scheduledMinutes: 540, actualMinutes: 0, lateMinutes: 0, earlyOutMinutes: 0, overtimeMinutes: 0, varianceMinutes: 0, isOpen: false, hasMissingOut: false, status: 'SCHEDULED' } } });
    await page.route('**/api/v1/stores/s1/schedule/week?**', (r) => {
        const weekStart = new URL(r.request().url()).searchParams.get('weekStart');
        const dates = weekOf(weekStart);
        r.fulfill({ json: { week: { id: 'w1', weekStart, dates, status: 'PUBLISHED', publishedAt: iso(2 * D), canEdit: true, viewerMemberId: null,
            rows: staffRows.map(({ pattern, pay, ...row }) => ({ ...row, shifts: shiftsFor(pattern, dates), pay: fullPay(pay) })) } } });
    });
    await page.route('**/api/v1/stores/s1/schedule/attendance?**', (r) => {
        const url = new URL(r.request().url());
        const dates = dayList(url.searchParams.get('from'), url.searchParams.get('to'));
        const late = { 'r1': [2, 12], 'r3': [4, 25] };
        r.fulfill({ json: { attendance: { from: dates[0], to: dates[dates.length - 1], timeZone: 'Asia/Manila', canEdit: true, viewerMemberId: null,
            rows: staffRows.map((row) => {
                const shifts = shiftsFor(row.pattern, dates);
                let lateTotal = 0, sched = 0, actual = 0;
                const days = shifts.map((sh, i) => {
                    if (sh.isRestDay) return { date: sh.date, shift: { ...sh, icon: 'none', presetLabel: null }, scheduleHidden: false, entries: [], scheduledMinutes: 0, actualMinutes: 0, lateMinutes: 0, earlyOutMinutes: 0, overtimeMinutes: 0, varianceMinutes: 0, isOpen: false, hasMissingOut: false, status: 'REST_DAY' };
                    const lateBy = late[row.id]?.[0] === i ? late[row.id][1] : 0;
                    const inM = sh.startMinute + lateBy, outM = sh.endMinute;
                    lateTotal += lateBy; sched += 480; actual += outM - inM - 60;
                    return { date: sh.date, shift: { isRestDay: false, startMinute: sh.startMinute, endMinute: sh.endMinute, icon: sh.icon, presetLabel: sh.presetLabel }, scheduleHidden: false,
                        entries: [{ id: `te-${row.id}-${i}`, storeMemberId: row.storeMemberId, workDate: sh.date, clockInAt: `${sh.date}T00:00:00Z`, clockOutAt: `${sh.date}T09:00:00Z`, inMinute: inM, outMinute: outM, source: 'SELF', note: null, editedBy: null, editedAt: null }],
                        scheduledMinutes: 480, actualMinutes: outM - inM - 60, lateMinutes: lateBy, earlyOutMinutes: 0, overtimeMinutes: 0, varianceMinutes: -lateBy, isOpen: false, hasMissingOut: false, status: lateBy ? 'LATE' : 'ON_TIME' };
                });
                return { storeMemberId: row.storeMemberId, userId: row.userId, name: row.name, role: row.role, isSelf: false, days,
                    totals: { scheduledMinutes: sched, actualMinutes: actual, lateMinutes: lateTotal, varianceMinutes: actual - sched, daysWorked: 6, daysAbsent: 0, openDays: 0, missingOutDays: 0, scheduledHours: sched / 60, actualHours: actual / 60, varianceHours: (actual - sched) / 60 } };
            }) } } });
    });
    // Reports: every endpoint answers for whatever range was asked.
    await page.route('**/api/v1/stores/s1/reports/**', (r) => {
        const url = new URL(r.request().url());
        const kind = url.pathname.split('/reports/')[1];
        const from = url.searchParams.get('from'), to = url.searchParams.get('to');
        const range = { from, to };
        const isPrev = to && to < new Date(now - 2 * D).toISOString().slice(0, 10);
        const k = isPrev ? 0.86 : 1;
        const days = from && to ? dayList(from.slice(0, 10), to.slice(0, 10)) : [];
        const pattern = [6200, 5400, 5900, 6800, 8900, 11200, 9800];
        const body = {
            'sales-summary': { range, totals: { grossSales: 56400 * k, discounts: 1520 * k, tax: 0, netSales: 54880 * k, orderCount: Math.round(372 * k), avgOrder: 147.5, voidedSales: 420, voidCount: 3 } },
            'sales-by-day': { range, totals: { totalSales: 54880 * k, orderCount: 372, avgOrder: 147.5 }, days: days.map((date, i) => ({ date, totalSales: pattern[i % 7] * k, orderCount: Math.round(pattern[i % 7] / 148) })) },
            'sales-by-hour': { range, hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour, i) => ({ hour, totalSales: [420, 980, 760, 540, 610, 880, 720, 450, 690, 820, 560, 380, 210][i], orderCount: 4 })) },
            'products-sold': { range, summary: { totalQty: 512, productCount: 8, shown: 8, limited: false }, products: products.map((p, i) => ({ productId: p.id, name: p.name, unit: p.unit, qtySold: [118, 52, 74, 61, 66, 38, 59, 44][i], orderCount: [96, 48, 63, 55, 51, 33, 41, 39][i], totalSales: [16520, 5720, 11470, 9150, 4290, 3230, 1475, 2420][i] })) },
            'product-margins': { range, summary: { costedItems: 7, totalItems: 8 }, items: products.map((p, i) => { const revenue = [16520, 5720, 11470, 9150, 4290, 3230, 1475, 2420][i]; const cost = i === 6 ? null : Math.round(revenue * [0.34, 0.28, 0.36, 0.4, 0.49, 0.47, 0.48, 0.4][i]); return { productId: p.id, name: p.name, unit: p.unit, qtySold: 10, revenue, cost, profit: cost === null ? null : revenue - cost, marginPct: cost === null ? null : Math.round((1 - cost / revenue) * 100), costKnown: cost !== null }; }) },
            'low-stock': { items: [{ itemType: 'INGREDIENT', itemId: 'i8', name: 'Paper straw', unit: 'pc', currentQty: 4, lowStockThreshold: 50, shortfall: 46 }, { itemType: 'INGREDIENT', itemId: 'i5', name: 'Brown sugar syrup', unit: 'ml', currentQty: 640, lowStockThreshold: 1000, shortfall: 360 }] },
            'ingredient-usage': { ingredients: [{ ingredientId: 'i2', name: 'Fresh milk', unit: 'ml', qtyUsed: 48200 }, { ingredientId: 'i1', name: 'Espresso beans', unit: 'g', qtyUsed: 5260 }] },
            'purchase-spend': { summary: { totalSpend: 18640, totalReceipts: 4, avgReceipt: 4660 }, suppliers: [{ supplierId: 'sup2', supplierName: 'Dairy Fresh Distributors', totalSpend: 10560, receiptCount: 2 }, { supplierId: 'sup1', supplierName: 'Bean Bros Coffee Roasters', totalSpend: 8080, receiptCount: 2 }] },
            'employee-sales': { range, employees: [{ cashierId: 'u3', name: 'Maria Reyes', email: 'maria@kapekanto.ph', role: 'CASHIER', totalSales: 31240, orderCount: 214, methods: [{ method: 'CASH', total: 13900, orderCount: 98 }, { method: 'GCASH', total: 17340, orderCount: 116 }] }] },
            'profit-summary': { range, summary: { totalRevenue: 54880 * k, totalCost: 21950 * k, totalProfit: 32930 * k, marginPct: 60, itemsWithCost: 8, totalItems: 8 } },
            'expense-summary': { range, total: 27929 * (isPrev ? 0.95 : 1), byCategory: [{ category: 'Rent', total: 18000 }] },
            'payment-methods': { range, grandTotal: 54880, methods: [['CASH', 24150, 171], ['GCASH', 19210, 128], ['GRAB', 7140, 44], ['MAYA', 4380, 29]].map(([method, total, orderCount]) => ({ method, total, orderCount, sharePct: Math.round(total / 548.8) })) },
            'sales-by-channel': { range, grandTotal: 54880, channels: [{ channel: null, name: 'Walk-in', total: 47740, orderCount: 328, markup: 0, sharePct: 87 }, { channel: 'GRAB', name: 'Grab', total: 7140, orderCount: 44, markup: 1428, sharePct: 13 }] },
            'top-products': { range, products: [['p1', 'Iced Spanish Latte', 118, 16520], ['p3', 'Caramel Macchiato', 74, 11470], ['p4', 'Iced Matcha Latte', 61, 9150], ['p2', 'Hot Americano', 52, 5720], ['p5', 'Ensaymada', 66, 4290]].map(([productId, name, qtySold, totalSales]) => ({ productId, name, qtySold, totalSales, unit: 'cup' })) },
        }[kind];
        r.fulfill({ json: body ?? {} });
    });
    page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
    return page;
};

// Outline the control a step tells the reader to click.
const highlight = async (page, selector) => {
    await page.locator(selector).first().evaluate((el) => {
        el.style.outline = '3px solid #f97316';
        el.style.outlineOffset = '3px';
        el.style.boxShadow = '0 0 0 8px rgba(249, 115, 22, 0.18)';
    });
};
const settle = async (page) => {
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => { if (el.scrollTop) el.scrollTop = 0; });
        document.activeElement?.blur?.();
    });
    await page.waitForTimeout(150);
};
const shotBox = async (page, name, box) => {
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: box });
    console.log('saved', name);
};
const shotEl = async (page, name, selector, pad = 0) => {
    const b = await page.locator(selector).first().boundingBox();
    if (!b) throw new Error(`no box for ${selector}`);
    await shotBox(page, name, { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.width + pad * 2, height: b.height + pad * 2 });
};

const shots = {
    async 'nav-overview'() {
        const page = await newPage();
        await page.goto(`${APP}/stores/s1/products`);
        await page.waitForSelector('text=Iced Spanish Latte');
        await settle(page);
        await page.click('.topnav__profile-btn');
        await page.waitForSelector('.topnav__profile-dropdown');
        await page.waitForTimeout(300);
        await highlight(page, '.topnav__profile-btn');
        await shotBox(page, 'nav-overview', { x: 0, y: 0, width: 1280, height: 400 });
        await page.close();
    },
    async 'store-list'() {
        const page = await newPage();
        await page.goto(`${APP}/stores`);
        await page.waitForSelector('text=Kape Kanto Warehouse');
        await settle(page);
        await highlight(page, '.store-header .primary-button');
        await shotBox(page, 'store-list', { x: 0, y: 0, width: 1280, height: 560 });
        await page.close();
    },
    async 'store-create'() {
        const page = await newPage();
        await page.goto(`${APP}/stores`);
        await page.waitForSelector('text=Kape Kanto Warehouse');
        await page.click('.store-header .primary-button');
        await page.fill('input[placeholder="Cafe Downtown"]', 'Kape Kanto – Makati');
        await page.locator('input[placeholder="0"]').first().fill('5');
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.waitForTimeout(400);
        await shotEl(page, 'store-create', '.st-modal', 12);
        await page.close();
    },
    async 'ingredients-list'() {
        const page = await newPage();
        await page.goto(`${APP}/stores/s1/ingredients`);
        await page.waitForSelector('text=Espresso beans');
        await settle(page);
        await highlight(page, 'button:has-text("New ingredient")');
        await shotBox(page, 'ingredients-list', { x: 0, y: 0, width: 1280, height: 700 });
        await page.close();
    },
    async 'ingredient-modal'() {
        const page = await newPage();
        await page.goto(`${APP}/stores/s1/ingredients`);
        await page.waitForSelector('text=Espresso beans');
        await page.click('button:has-text("New ingredient")');
        await page.waitForSelector('.ingr-panel');
        await page.fill('.ingr-panel input[type=text]', 'Fresh milk');
        await page.locator('.ingr-panel select').first().selectOption('ml');
        await page.locator('.ingr-panel input[type=number]').first().fill('0.11');
        await page.fill('.ingr-panel input[placeholder^="e.g. Gallon"]', 'L');
        await page.locator('.ingr-panel input[type=number]').nth(1).fill('1000');
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.waitForTimeout(300);
        await shotEl(page, 'ingredient-modal', '.ingr-panel', 12);
        await page.close();
    },
    async 'product-ready-made'() {
        const page = await newPage({ width: 1280, height: 1100 });
        await page.goto(`${APP}/stores/s1/products/new`);
        await page.waitForSelector('text=Pricing');
        await page.fill('input[placeholder="e.g. Spanish Latte"]', 'Bottled Water');
        await page.click('button:has-text("Ready-made")');
        const selects = page.locator('.product-form select');
        await selects.nth(0).selectOption('Drinks');
        await page.waitForTimeout(200);
        await page.locator('.product-form select').filter({ has: page.locator('option[value="bottle"]') }).first().selectOption('bottle');
        const pricing = page.locator('.form-card', { hasText: 'Selling price' });
        await pricing.locator('input[type=number]').nth(0).fill('25');
        await pricing.locator('input[type=number]').nth(1).fill('12');
        await page.evaluate(() => document.activeElement?.blur?.());
        await settle(page);
        await shotEl(page, 'product-ready-made', '.product-form-column', 10);
        await page.close();
    },
    async 'product-recipe'() {
        const page = await newPage({ width: 1280, height: 1200 });
        await page.goto(`${APP}/stores/s1/products/p1/edit`);
        await page.waitForSelector('text=Condensed milk');
        await settle(page);
        await shotEl(page, 'product-recipe', '.form-card:has(h2:text-is("Recipe"))', 10);
        await page.close();
    },
    async 'stock-adjustment'() {
        const page = await newPage();
        await page.goto(`${APP}/stores/s1/inventory/adjustments`);
        await page.waitForSelector('text=Item type');
        await page.click('button:text-is("Ingredient")');
        const search = page.locator('.search-select input').first();
        await search.click();
        await search.fill('Fresh');
        await page.locator('.search-select__name', { hasText: 'Fresh milk' }).first().click();
        await page.click('button:text-is("Adjust by")');
        await page.locator('.form-card input[type=number]').first().fill('4000');
        await page.fill('textarea', 'Delivery from supplier, 4 L');
        await page.evaluate(() => document.activeElement?.blur?.());
        await settle(page);
        await shotBox(page, 'stock-adjustment', { x: 0, y: 0, width: 1280, height: 760 });
        await page.close();
    },
    async 'pos'() {
        const page = await newPage();
        await page.goto(`${APP}/stores/s1/pos`);
        await page.waitForSelector('text=Iced Spanish Latte');
        await page.waitForTimeout(500);
        const add = async (name) => page.locator(`[title="${name}"]`).first().click();
        await add('Iced Spanish Latte');
        await add('Iced Spanish Latte');
        await add('Ensaymada');
        await page.click('button:text-is("Takeout")').catch(() => {});
        await settle(page);
        await highlight(page, 'button:has-text("Finalize sale")');
        await shotBox(page, 'pos', { x: 0, y: 0, width: 1280, height: 820 });
        await page.close();
    },
    async 'settings'() {
        const sections = [
            ['settings-profile', 'profile'],
            ['settings-payment', 'payment'],
            ['settings-channels', 'channels'],
            ['settings-catalog', 'catalog'],
        ];
        const page = await newPage({ width: 1280, height: 900 });
        for (const [name, section] of sections) {
            await page.goto(`${APP}/stores/s1/settings?section=${section}`);
            await page.waitForSelector('.st-section');
            await settle(page);
            const b = await page.locator('.st-body').boundingBox();
            await shotBox(page, name, { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: Math.min(b.height + 16, 820) });
        }
        await page.goto(`${APP}/stores/s1/settings?section=team`);
        await page.waitForSelector('text=Maria Reyes');
        await page.click('.st-team-tab:has-text("Invites")');
        await page.fill('input[placeholder="teammate@shop.com"]', 'jun@kapekanto.ph');
        await page.locator('.st-invite-form select').selectOption('CASHIER');
        await page.evaluate(() => document.activeElement?.blur?.());
        await settle(page);
        await highlight(page, 'button:has-text("Create invite")');
        const b = await page.locator('.st-body').boundingBox();
        await shotBox(page, 'settings-team', { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: Math.min(b.height + 16, 640) });
        await page.close();
    },
    async 'sales-history'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/sales`);
        await page.waitForSelector('text=#1048');
        await settle(page);
        await shotBox(page, 'sales-history', { x: 0, y: 0, width: 1280, height: 860 });
        await page.close();
    },
    async 'edit-sale'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/sales`);
        await page.waitForSelector('text=#1048');
        await page.locator('button:text-is("Edit")').first().click();
        await page.waitForSelector('text=Save changes');
        await page.waitForTimeout(400);
        const qty = page.locator('.edit-sale input[type=number]').first();
        await qty.fill('3').catch(() => {});
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.waitForTimeout(300);
        const dialog = page.locator('[role=dialog], .edit-sale, .modal-panel').first();
        await shotEl(page, 'edit-sale', '[role=dialog]', 8);
        await page.close();
    },
    async 'reports-overview'() {
        const page = await newPage({ width: 1280, height: 1000 });
        await page.goto(`${APP}/stores/s1/reports`);
        await page.waitForSelector('text=Net sales');
        // Seven days gives the daily chart something to show.
        await page.locator('button:has-text("Today")').first().click().catch(() => {});
        await page.locator('button:text-is("Last 7 days")').first().click().catch(() => {});
        await page.waitForTimeout(1500);
        await settle(page);
        await shotBox(page, 'reports-overview', { x: 0, y: 0, width: 1280, height: 960 });
        await page.close();
    },
    async 'purchase-order-form'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/purchase-orders/new`);
        await page.waitForSelector('text=Supplier & delivery');
        await page.waitForTimeout(500);
        // Supplier picker is the first searchable select on the page.
        await page.locator('.ss-control').first().click();
        await page.locator('.ss-option', { hasText: 'Dairy Fresh Distributors' }).first().click();
        const addItem = page.locator('button:has-text("+ Add item")').first();
        for (const [name, qty] of [['Fresh milk', '24'], ['Condensed milk', '6000']]) {
            await addItem.click();
            // A new row opens its item search straight away.
            const row = page.locator('table tbody tr').last();
            await row.locator('select.line-select').selectOption('INGREDIENT');
            if (!(await row.locator('.ss-search').count())) await row.locator('.ss-control').click();
            await row.locator('.ss-search').fill(name);
            await page.locator('.ss-option', { hasText: name }).first().click();
            await row.locator('input[type=number]').first().fill(qty);
        }
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.activeElement?.blur?.());
        await settle(page);
        await shotBox(page, 'purchase-order-form', { x: 0, y: 0, width: 1280, height: 640 });
        await page.close();
    },
    async 'po-receive'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/purchase-orders/po1`);
        await page.waitForSelector('text=Receive items');
        await page.click('button:has-text("Receive items")');
        await page.waitForSelector('text=Record receipt');
        await page.fill('input[placeholder="INV-2024-001"]', 'INV-20931');
        await page.waitForTimeout(300);
        await shotEl(page, 'po-receive', '[role=dialog]', 8);
        await page.close();
    },
    async 'inventory-overview'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/inventory`);
        await page.waitForSelector('text=Fresh milk');
        await settle(page);
        await shotBox(page, 'inventory-overview', { x: 0, y: 0, width: 1280, height: 820 });
        await page.close();
    },
    async 'movements'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/inventory/movements`);
        await page.waitForSelector('text=Spilled bottle');
        await settle(page);
        await shotBox(page, 'movements', { x: 0, y: 0, width: 1280, height: 760 });
        await page.close();
    },
    async 'transfer-stock'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/inventory`);
        await page.waitForSelector('text=Fresh milk');
        await page.click('button:has-text("Transfer")');
        await page.waitForSelector('text=Transfer stock');
        await page.locator('select').filter({ has: page.locator('option:has-text("Warehouse")') }).first().selectOption({ label: 'Kape Kanto Warehouse (Warehouse)' }).catch(() => {});
        const search = page.locator('input[placeholder="Search items to add…"]');
        await search.click();
        await search.fill('16oz');
        await page.locator('.dropdown-item', { hasText: '16oz cup' }).first().click();
        await page.locator('[role=dialog] input[type=number]').first().fill('100');
        await page.fill('textarea[placeholder="Reason or reference…"]', 'Cups for the weekend rush');
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.waitForTimeout(400);
        await shotEl(page, 'transfer-stock', '[role=dialog]', 8);
        await page.close();
    },
    async 'expenses'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/expenses`);
        await page.waitForSelector('text=November rent');
        await settle(page);
        await shotBox(page, 'expenses', { x: 0, y: 0, width: 1280, height: 720 });
        await page.close();
    },
    async 'schedule-week'() {
        const page = await newPage({ width: 1400, height: 900 });
        await page.goto(`${APP}/stores/s1/schedule`);
        await page.waitForSelector('text=Jun Dela Cruz');
        await settle(page);
        await shotBox(page, 'schedule-week', { x: 0, y: 0, width: 1400, height: 640 });
        await page.close();
    },
    async 'attendance'() {
        const page = await newPage({ width: 1400, height: 900 });
        await page.goto(`${APP}/stores/s1/schedule`);
        await page.waitForSelector('text=Jun Dela Cruz');
        await page.click('button:has-text("Attendance")');
        await page.waitForSelector('text=Actual time in/out');
        await page.waitForTimeout(500);
        await settle(page);
        await shotBox(page, 'attendance', { x: 0, y: 0, width: 1400, height: 640 });
        await page.close();
    },
    async 'audit-log'() {
        const page = await newPage({ width: 1280, height: 900 });
        await page.goto(`${APP}/stores/s1/audit-logs`);
        await page.waitForSelector('text=Iced Spanish Latte');
        await page.locator('text=Iced Spanish Latte').first().click().catch(() => {});
        await settle(page);
        await shotBox(page, 'audit-log', { x: 0, y: 0, width: 1280, height: 760 });
        await page.close();
    },
    async 'time-clock'() {
        // A cashier sees the clock; owners aren't rostered.
        const page = await newPage();
        await page.route('**/api/v1/stores', (r) => r.fulfill({ json: { stores: [{ ...store, role: 'CASHIER', permissions: ['pos.use', 'expenses.manage'] }] } }));
        await page.goto(`${APP}/stores/s1/pos`);
        await page.waitForSelector('text=Time In');
        await page.waitForTimeout(400);
        await settle(page);
        await highlight(page, 'button:has-text("Time In")');
        await shotBox(page, 'time-clock', { x: 640, y: 0, width: 640, height: 90 });
        await page.close();
    },
};

for (const [name, fn] of Object.entries(shots)) {
    if (ONLY && !ONLY.includes(name)) continue;
    try {
        await fn();
    } catch (err) {
        console.log('FAILED', name, err.message.split('\n')[0]);
    }
}
await browser.close();
