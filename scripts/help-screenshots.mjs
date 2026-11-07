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
    await json('**/api/v1/stores/s1/sales**', { sales: [], total: 0, page: 1, pageSize: 20 });
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
