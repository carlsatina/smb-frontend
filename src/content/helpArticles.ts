// Help & Support guide content. The Help page renders these blocks as-is, so
// adding an article is a data change only. Inline text supports **bold**.
// Screenshots live in /public/help and are regenerated with
// scripts/help-screenshots.mjs.

export type HelpBlock =
    | { type: 'p'; text: string }
    | { type: 'heading'; text: string }
    | { type: 'steps'; items: Array<{ text: string; image?: string; caption?: string }> }
    | { type: 'fields'; title?: string; items: Array<{ name: string; text: string }> }
    | { type: 'image'; src: string; caption?: string }
    | { type: 'tip'; text: string }
    | { type: 'note'; text: string }
    | { type: 'list'; items: string[] }
    // Renders the contact options from src/config/support.ts.
    | { type: 'contact' };

export interface HelpArticle {
    id: string;
    title: string;
    summary: string;
    blocks: HelpBlock[];
}

export interface HelpSection {
    id: string;
    title: string;
    icon: string;
    articles: HelpArticle[];
}

const img = (name: string) => `/help/${name}.png`;

export const helpSections: HelpSection[] = [
    {
        id: 'getting-started',
        title: 'Getting started',
        icon: 'rocket-launch-outline',
        articles: [
            {
                id: 'welcome',
                title: 'Welcome to SmB-PoS',
                summary: 'What the app does and how to find your way around.',
                blocks: [
                    { type: 'p', text: 'SmB-PoS runs the day-to-day of your store: you ring up sales at the **POS**, and every sale deducts stock from your **Inventory** automatically, down to the ingredients in each recipe. **Reports** then show your sales, costs and margins.' },
                    { type: 'heading', text: 'Recommended setup order' },
                    { type: 'list', items: [
                        '**Create your store** and check its settings (currency, tax, payment methods).',
                        '**Add ingredients** if you make products from recipes (coffee beans, milk, cups…).',
                        '**Create products**: ready-made items you resell, or recipe items you make.',
                        '**Record opening stock** with a stock adjustment so counts start correct.',
                        '**Invite your team** and give each person the right role.',
                        '**Start selling** at the POS.',
                    ] },
                    { type: 'heading', text: 'Getting around' },
                    { type: 'p', text: 'The top bar shows the pages you use most for your role, and every other page is under **More**. Click your name in the top-right corner to switch stores, manage stores, edit your profile, open this Help page, or sign out.' },
                    { type: 'image', src: img('nav-overview'), caption: 'The top navigation bar.' },
                    { type: 'tip', text: 'What you see depends on your role. If a page is missing, ask your store owner to check your permissions.' },
                ],
            },
            {
                id: 'create-store',
                title: 'Create a store',
                summary: 'Set up a new store or warehouse.',
                blocks: [
                    { type: 'p', text: 'Each store has its own products, stock, sales and team. You need a verified email before you can create a store.' },
                    { type: 'steps', items: [
                        { text: 'Click your name in the top-right corner and choose **Manage Stores**.' },
                        { text: 'Click **Create store**.', image: img('store-list'), caption: 'The Stores page.' },
                        { text: 'Fill in the store name, timezone, currency and low stock threshold, then click **Create store**.', image: img('store-create'), caption: 'The Create new store form.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Store name', text: 'Shown in the top bar, the store switcher and reports.' },
                        { name: 'Timezone', text: 'Decides which day a sale belongs to in reports. Pick the timezone the store is physically in.' },
                        { name: 'Currency', text: 'Used for every price and amount in this store.' },
                        { name: 'Low stock threshold', text: 'Items at or below this quantity are flagged as low stock. Products can override it.' },
                        { name: 'Allow negative stock', text: 'When off, a sale or adjustment that would take stock below zero is blocked. Turn it on if you sometimes sell before recording deliveries.' },
                    ] },
                    { type: 'note', text: 'Each store is billed monthly. See **Billing** for pricing.' },
                ],
            },
            {
                id: 'cashier-quick-start',
                title: 'Quick start for cashiers',
                summary: 'Everything a cashier needs on day one.',
                blocks: [
                    { type: 'p', text: 'New on the team? These are the things you will do every shift. Your owner decides what you can see, so some pages mentioned in other articles may not appear for you.' },
                    { type: 'steps', items: [
                        { text: '**Time in** when your shift starts: click **Time In** in the top bar, next to your name. It shows the shift you\'re rostered for today.', image: img('time-clock'), caption: 'The time clock in the top bar.' },
                        { text: '**Ring up sales** on the **POS** page. Click products to add them, pick Dine-in or Takeout and the payment method, then click **Finalize sale**. See **Make a sale at the POS**.' },
                        { text: '**Record expenses** you paid from the till (ice, delivery fees…) on the **Expenses** page so the owner\'s cash count adds up.' },
                        { text: '**Check your schedule** under **Schedule**. You see everyone\'s shifts but only your own pay.' },
                        { text: '**Time out** before you leave: click the timer in the top bar and confirm. A missed time out shows a **!** on the button, and that day pays nothing until a manager corrects it.' },
                    ] },
                    { type: 'tip', text: 'Made a mistake on a sale? Don\'t ring it up again. Ask a manager to edit or void it in **Sales history**.' },
                ],
            },
        ],
    },
    {
        id: 'catalog',
        title: 'Products & ingredients',
        icon: 'package-variant',
        articles: [
            {
                id: 'create-ingredient',
                title: 'Add an ingredient',
                summary: 'Raw materials and packaging that recipes use up.',
                blocks: [
                    { type: 'p', text: 'Ingredients are what your recipe products are made from, such as milk, coffee beans or syrup, plus packaging like cups and lids. Each time a recipe product is sold, its ingredients are deducted from stock.' },
                    { type: 'steps', items: [
                        { text: 'Open **Ingredients** (in the top bar or under **More**).' },
                        { text: 'Click **New ingredient**.', image: img('ingredients-list'), caption: 'The Ingredients page.' },
                        { text: 'Enter the name, choose the unit and category, and enter the cost per unit.', image: img('ingredient-modal'), caption: 'The Add ingredient form.' },
                        { text: 'If you buy it in a bigger unit than you use, fill in the **Purchase unit** section (see below).' },
                        { text: 'Click **Create ingredient**.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Name', text: 'What the ingredient is called, e.g. "Fresh milk" or "16oz cup".' },
                        { name: 'Unit', text: 'The unit you measure it in for recipes (g, ml, pc…). The list comes from **Settings → Catalog defaults**.' },
                        { name: 'Category', text: '**Raw material** for things that go into the product. **Packaging** for cups, lids, bags and straws; only packaging can be used as takeout packaging on a product.' },
                        { name: 'Cost per unit', text: 'What one unit costs you. Recipe costs and margins are calculated from this.' },
                        { name: 'Purchase unit (optional)', text: 'The unit you buy it in, e.g. "Gallon" or "Box".' },
                        { name: 'Units per purchase unit', text: 'How many recipe units are in one purchase unit, e.g. 3.785 L per Gallon. Purchase orders can then be entered in gallons while stock is tracked in litres.' },
                    ] },
                    { type: 'tip', text: 'New ingredients start with zero stock. Record what you have on hand with a **stock adjustment**.' },
                    { type: 'p', text: 'Have many ingredients? Owners and admins can bulk-add them from a CSV file: on the Ingredients page, open **Import / Export** and choose **Download template**, fill it in, then choose **Import CSV**.' },
                ],
            },
            {
                id: 'create-product',
                title: 'Create a ready-made product',
                summary: 'Items you buy or prepare and sell as-is.',
                blocks: [
                    { type: 'p', text: 'A **ready-made** product is stocked and sold as a whole unit, such as bottled water, a pastry from a supplier or a pack of chips. Selling one deducts one from that product\'s own stock.' },
                    { type: 'steps', items: [
                        { text: 'Open **Products** (in the top bar or under **More**) and click **New product**.' },
                        { text: 'Enter a name and choose **Ready-made** as the type.' },
                        { text: 'Pick a category and unit. Use **Add category** or **Add unit** if the one you need isn\'t listed.', image: img('product-ready-made'), caption: 'The New product form for a ready-made item.' },
                        { text: 'Enter the selling price and, optionally, your cost. The margin preview updates as you type.' },
                        { text: 'Leave **Active** on so the product shows in the POS, then click **Create product**.' },
                    ] },
                    { type: 'fields', title: 'Details', items: [
                        { name: 'Name', text: 'Shown on the POS card, receipts and reports.' },
                        { name: 'Type', text: '**Ready-made** (sold as-is) or **Recipe** (made from ingredients). See the next article for recipes.' },
                        { name: 'Category', text: 'Groups products into the POS category filters and reports.' },
                        { name: 'Subcategory (optional)', text: 'A second level inside a category, shown as an extra filter row in the POS.' },
                        { name: 'Unit', text: 'How the product is counted (pc, bottle, pack…).' },
                        { name: 'SKU / Barcode (optional)', text: 'Your own item code and the barcode. Scanning the barcode in the POS search box adds the product to the ticket.' },
                    ] },
                    { type: 'fields', title: 'Pricing', items: [
                        { name: 'Selling price', text: 'The walk-in price.' },
                        { name: 'Cost (optional)', text: 'What one unit costs you. Used for the margin preview and profit reports.' },
                        { name: 'Sell on [channel] / [channel] price', text: 'Appears when you have sales channels such as Grab. Untick to hide the product on that channel, or enter a specific price. Leave the price blank to use the channel\'s markup.' },
                    ] },
                    { type: 'fields', title: 'Availability', items: [
                        { name: 'Active', text: 'Only active products appear in the POS. Turn it off to stop selling an item without deleting its history.' },
                        { name: 'Low stock threshold', text: 'Overrides the store\'s default threshold for this product.' },
                    ] },
                    { type: 'tip', text: 'A margin below 30% is highlighted so you can review the price.' },
                ],
            },
            {
                id: 'create-recipe-product',
                title: 'Create a recipe product',
                summary: 'Drinks and dishes made from ingredients.',
                blocks: [
                    { type: 'p', text: 'A **recipe** product, such as a latte, has no stock of its own. Each sale deducts the ingredients in its recipe instead, so your milk and coffee counts stay accurate. Add the ingredients first (see **Add an ingredient**).' },
                    { type: 'steps', items: [
                        { text: 'Open **Products** and click **New product**.' },
                        { text: 'Enter a name and choose **Recipe** as the type.' },
                        { text: 'Under **Recipe**, click **+ Add ingredient**, choose an ingredient and enter how much one serving uses. Repeat for every ingredient.', image: img('product-recipe'), caption: 'Recipe lines with the cost per serving.' },
                        { text: 'Check the recipe cost and margin, set the selling price, and click **Create product**.' },
                        { text: 'For takeout packaging, open the product again after saving, add the cups, lids or straws under **Takeout packaging**, and click **Save packaging**.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Recipe lines', text: 'Each line is one ingredient and the quantity used per unit sold, in the ingredient\'s unit. The cost of each line and the total per serving are shown on the right.' },
                        { name: 'Takeout packaging', text: 'Deducted only when the product is sold as **Takeout** (or on a channel set to always takeout). Only ingredients in the **Packaging** category can be picked.' },
                        { name: 'Active', text: 'A recipe product can\'t be activated until it has at least one recipe line.' },
                    ] },
                    { type: 'tip', text: 'Ingredient not listed? Click **Create new ingredient** below the recipe lines to add it without leaving the form.' },
                ],
            },
            {
                id: 'import-products',
                title: 'Import products from a spreadsheet',
                summary: 'Add or update many products at once with CSV.',
                blocks: [
                    { type: 'p', text: 'Owners and admins with **Manage products & stock** can add or update the whole catalog from a CSV file instead of one product at a time. Ingredients work the same way from the Ingredients page.' },
                    { type: 'steps', items: [
                        { text: 'On the **Products** page, open **Import / Export** and choose **Download template** (or **Export CSV** to start from your current catalog).' },
                        { text: 'Fill in one product per row in Excel or Google Sheets, then save it as CSV.' },
                        { text: 'Choose **Import / Export → Import CSV**, pick the file, check the preview, and confirm.' },
                    ] },
                    { type: 'fields', title: 'Columns', items: [
                        { name: 'Name, Price', text: 'Required. A row whose name matches an existing product (ignoring capitals) **updates** that product; any other name **creates** a new one.' },
                        { name: 'Type', text: '**READY_MADE** (default) or **RECIPE**.' },
                        { name: 'Cost, Unit, Category, Subcategory', text: 'Optional. Unit defaults to pcs. Subcategories must already exist under the category in **Settings → Catalog defaults**.' },
                        { name: 'SKU, Barcode', text: 'Optional item codes.' },
                        { name: 'Active', text: 'true or false. Recipe products need a recipe before they can be active.' },
                        { name: 'Low Stock Threshold', text: 'Optional per-product override.' },
                        { name: 'Recipe', text: 'For RECIPE products: ingredients and amounts per unit sold, written as **Ingredient name:qty**, separated by **|**. For example: **Espresso beans:18 | Fresh milk:180**. Add the ingredients first; unknown names are rejected.' },
                    ] },
                    { type: 'note', text: 'After the import you\'ll see how many rows were added, updated and failed, with the reason for each failed row. Fix those rows and import the file again; rows that already worked will just update.' },
                ],
            },
        ],
    },
    {
        id: 'inventory',
        title: 'Inventory',
        icon: 'warehouse',
        articles: [
            {
                id: 'inventory-overview',
                title: 'Check stock levels & history',
                summary: 'What you have, what\'s low, and every change.',
                blocks: [
                    { type: 'p', text: 'The **Inventory** page lists the current stock of every ready-made product and ingredient. Recipe products don\'t appear because their stock is their ingredients.' },
                    { type: 'image', src: img('inventory-overview'), caption: 'Inventory → Stock overview.' },
                    { type: 'fields', items: [
                        { name: 'Tracked items / Low stock / Out of stock', text: 'The counters at the top double as filters. Click one to show only those items.' },
                        { name: 'Status', text: '**Healthy**, **Low** (at or below its low stock threshold) or **Out of stock** (zero or less).' },
                        { name: 'All / Products / Ingredients', text: 'Narrow the list by item type, or search by name, SKU or category.' },
                    ] },
                    { type: 'heading', text: 'Movement history' },
                    { type: 'p', text: 'Click **History** to see every stock change: sales, adjustments, purchase receipts, voids, waste and transfers. Each row shows when, who, the quantity change and where it came from (for example a receipt number). Filter by movement type or date and use **Export CSV** to download it.' },
                    { type: 'image', src: img('movements'), caption: 'Inventory → History shows every change in stock.' },
                    { type: 'tip', text: 'Stock looks wrong? Search the item in **History** to see exactly which sale, receipt or adjustment changed it.' },
                ],
            },
            {
                id: 'adjust-stock',
                title: 'Record opening stock & adjustments',
                summary: 'Set starting counts and correct stock after a count.',
                blocks: [
                    { type: 'p', text: 'Sales and purchase receipts update stock automatically. Use a **stock adjustment** to record what you already have when you start, or to correct the count after spoilage, breakage or a physical count.' },
                    { type: 'steps', items: [
                        { text: 'Open **Inventory** and click **Stock adjustment**.' },
                        { text: 'Choose whether you are adjusting an **Ingredient** or a **Product**, then search for the item.' },
                        { text: 'Pick a mode: **Adjust by** adds or subtracts an amount; **Set stock to** replaces the count with what you counted.', image: img('stock-adjustment'), caption: 'The panel on the right previews the stock after saving.' },
                        { text: 'Optionally enter the unit cost and a note explaining why, then click **Save adjustment**.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Adjustment amount (+/−)', text: 'Positive to add stock, negative to remove it, e.g. -2 for two broken bottles.' },
                        { name: 'Target stock', text: 'The quantity you physically counted. **Use current** fills in the current figure so you can edit it.' },
                        { name: 'Unit cost (optional)', text: 'What each unit cost, for valuing the stock you add.' },
                        { name: 'Note (optional)', text: 'Why you made the change. It appears in the movement history and audit log.' },
                    ] },
                    { type: 'note', text: 'If **Allow negative stock** is off in the store settings, an adjustment that would drop stock below zero is blocked.' },
                ],
            },
            {
                id: 'transfer-stock',
                title: 'Transfer stock between stores',
                summary: 'Move items to another store or warehouse.',
                blocks: [
                    { type: 'p', text: 'If you manage more than one store (for example a warehouse that supplies your branches), you can move stock from one to another. The **Transfer** button appears on the Inventory page when you belong to another store.' },
                    { type: 'steps', items: [
                        { text: 'Open **Inventory** in the store the stock is leaving, and click **Transfer**.' },
                        { text: 'Choose the **Destination store**. Change the **Transfer date** only if you\'re recording a transfer that already happened.', image: img('transfer-stock'), caption: 'The Transfer stock window.' },
                        { text: 'Add the items and quantities you\'re sending, add an optional note, and confirm.' },
                    ] },
                    { type: 'p', text: 'Stock goes down in this store and up in the destination at the same time. Both stores record it in their movement history as **Transfer out** and **Transfer in**.' },
                    { type: 'note', text: 'Items are matched by name in the destination store. If the destination doesn\'t have the item yet, it\'s created there automatically. Recipe products can\'t be transferred. Move their ingredients instead.' },
                ],
            },
        ],
    },
    {
        id: 'purchasing',
        title: 'Purchasing & expenses',
        icon: 'truck-delivery-outline',
        articles: [
            {
                id: 'purchase-orders',
                title: 'Order stock with a purchase order',
                summary: 'Plan what you\'re buying from a supplier.',
                blocks: [
                    { type: 'p', text: 'A purchase order (PO) lists what you\'re buying from a supplier. Creating one doesn\'t change stock. Stock only goes up when you **receive** the delivery (next article).' },
                    { type: 'steps', items: [
                        { text: 'Open **Purchases** and click **New purchase order**.' },
                        { text: 'Pick the **Supplier** (or click **New** to add one) and the **Expected delivery date**.' },
                        { text: 'Click **+ Add item** for each product or ingredient, and enter the quantity and cost per unit. Costs fill in from your records, so check they\'re still right.', image: img('purchase-order-form'), caption: 'A new purchase order.' },
                        { text: 'Click **Create purchase order**. Use **Mark sent** once you\'ve sent it to the supplier.' },
                    ] },
                    { type: 'fields', title: 'Order status', items: [
                        { name: 'Draft', text: 'Created, not yet sent. Supplier and expected date can still change.' },
                        { name: 'Sent', text: 'Sent to the supplier and waiting for delivery.' },
                        { name: 'Partially received', text: 'Some items arrived; the rest are still expected.' },
                        { name: 'Received', text: 'Everything arrived.' },
                        { name: 'Cancelled', text: 'Won\'t be delivered; it can no longer be received.' },
                    ] },
                    { type: 'tip', text: 'If an ingredient has a purchase unit (e.g. bought by the Gallon), enter the quantity in that unit. The order shows the equivalent in the recipe unit (e.g. litres).' },
                ],
            },
            {
                id: 'receive-delivery',
                title: 'Receive a delivery',
                summary: 'Add delivered stock and record the invoice.',
                blocks: [
                    { type: 'steps', items: [
                        { text: 'Open the purchase order under **Purchases** and click **Receive items**.' },
                        { text: 'Enter the supplier\'s **Invoice number** and the **Received date**.' },
                        { text: 'The remaining quantities are filled in for you. Change any line that arrived short, or set it to 0 if it didn\'t come.', image: img('po-receive'), caption: 'Recording a delivery.' },
                        { text: 'Click **Record receipt**.' },
                    ] },
                    { type: 'p', text: 'The received quantities are added to stock right away and appear in Inventory history as purchases. If only part of the order arrived, it becomes **Partially received**, and you can receive the rest later the same way.' },
                    { type: 'p', text: 'All recorded deliveries are listed under **Purchases → Receipts**. Purchase spend by supplier appears in **Reports → Inventory**.' },
                ],
            },
            {
                id: 'suppliers',
                title: 'Manage suppliers',
                summary: 'Keep supplier contacts in one place.',
                blocks: [
                    { type: 'p', text: 'Open **Suppliers** to add, edit or remove suppliers. Each has a name and optional email and phone number. You can also add a supplier on the spot while creating a purchase order.' },
                    { type: 'p', text: 'Open a supplier to see its purchase orders and how much you\'ve spent with them.' },
                ],
            },
            {
                id: 'expenses',
                title: 'Record expenses',
                summary: 'Rent, utilities, supplies and other costs.',
                blocks: [
                    { type: 'p', text: 'Expenses are costs that aren\'t stock purchases, such as rent, electricity, wages or ice bought from the till. They\'re subtracted from profit in **Reports** (**Net after expenses**).' },
                    { type: 'steps', items: [
                        { text: 'Open **Expenses** and click **Add expense**.' },
                        { text: 'Choose the date and category, enter the amount and an optional note, and click **Add expense**.', image: img('expenses'), caption: 'The Expenses page for one month.' },
                    ] },
                    { type: 'p', text: 'Use the arrows to move between months and the category filter to see one kind of cost. The total at the top is for the month shown.' },
                    { type: 'note', text: 'Categories come from **Settings → Catalog defaults → Expense categories**. If the list is empty, ask the owner to add some.' },
                ],
            },
        ],
    },
    {
        id: 'selling',
        title: 'Selling',
        icon: 'point-of-sale',
        articles: [
            {
                id: 'make-sale',
                title: 'Make a sale at the POS',
                summary: 'Ring up a ticket and finalize it.',
                blocks: [
                    { type: 'steps', items: [
                        { text: 'Open **POS** (in the top bar or under **More**).' },
                        { text: 'Click a product card to add it to the ticket. You can also type in the search box or scan a barcode and press **Enter** to add the top match.', image: img('pos'), caption: 'The POS with a ticket in progress.' },
                        { text: 'Use **−** and **+** on the ticket to change quantities.' },
                        { text: 'Choose **Dine-in** or **Takeout**. If you have sales channels, choose **Walk-in** or the channel, e.g. Grab, first.' },
                        { text: 'Select the **Payment method**, then click **Finalize sale**.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Discount', text: 'Tick to apply the Senior/PWD discount. The VAT is removed first, then the store\'s discount percentage is taken off the VAT-exclusive price (e.g. ₱90 ÷ 1.12 = ₱80.36, less 20% = ₱64.29, rounded to ₱64). The total is rounded to the nearest peso and the ticket is recorded with no tax.' },
                        { name: 'Tax', text: 'Calculated from the store\'s tax rate.' },
                        { name: 'Walk-in / channel', text: 'Channel tickets use the channel prices. Reports show channel sales and markup separately.' },
                        { name: 'Dine-in / Takeout', text: 'Takeout also deducts each product\'s takeout packaging.' },
                        { name: 'Manual sale date (owners only)', text: 'Records a sale with an earlier date and time, e.g. when entering sales from a paper log.' },
                    ] },
                    { type: 'tip', text: 'Use the **Cards** and **Table List** views to switch layouts. The table view is faster for very large catalogs. In the cards view you can drag cards to reorder them.' },
                    { type: 'p', text: 'Past sales are under **Sales history**, where users with the right permission can edit or void them.' },
                ],
            },
            {
                id: 'sales-history',
                title: 'Find, edit or void a sale',
                summary: 'Look up past sales and fix mistakes.',
                blocks: [
                    { type: 'p', text: 'Open **Sales history** (or click **Sales history** on the POS) to see finalized sales. Pick a date range at the top and filter by cashier, payment method, channel or item.' },
                    { type: 'image', src: img('sales-history'), caption: 'Sales history with filters and actions.' },
                    { type: 'fields', title: 'Actions on a sale', items: [
                        { name: 'Print', text: 'Prints the receipt again.' },
                        { name: 'Edit', text: 'Change items, quantities, payment method, order type or discount. Stock is adjusted only for the difference, and the original is kept in the Audit Log. Owners and admins can do this by default; others need the **Edit & import sales** permission.' },
                        { name: 'Void', text: 'Cancels the sale: the stock it used goes back to inventory, and it\'s excluded from net sales. It stays in the list marked **Voided** so there\'s a record. Owners and admins can do this by default; others need the **Void sales** permission.' },
                        { name: 'Delete (bin icon, owners only)', text: 'Removes a sale entirely, e.g. a test or duplicate ticket. It disappears from history, reports and daily totals, its stock is returned, and a copy is kept in the Audit Log. This can\'t be undone in the app.' },
                    ] },
                    { type: 'image', src: img('edit-sale'), caption: 'Editing a sale. The total shows the difference from the original.' },
                    { type: 'tip', text: 'Prefer **Void** over **Delete** for real sales that were cancelled. Voids stay visible, which keeps your cash count and audit trail honest.' },
                    { type: 'note', text: 'Cashiers only see their most recent sales, up to the **Cashier sales history limit** in Settings.' },
                ],
            },
            {
                id: 'daily-sales',
                title: 'Daily Sales & cash remittance',
                summary: 'Count the cash and catch shortages each day.',
                blocks: [
                    { type: 'p', text: '**Daily Sales** is an optional page for reconciling the cash drawer each day. If you don\'t see it, it isn\'t switched on for your account; see **Contact support** to have it enabled. Open it from **Daily Sales** and use the **Sales & Cash Remittance** tab.' },
                    { type: 'steps', items: [
                        { text: 'Click **Add Entry** for the day.' },
                        { text: 'For each cashier, enter the cash on hand (click **Denoms** to count it by bill and coin) and their GCash total.' },
                        { text: 'Enter the senior/PWD discounts and expenses paid from the till, then the **Actual COH** you physically counted, and click **Save**.' },
                    ] },
                    { type: 'fields', title: 'What the columns mean', items: [
                        { name: 'Total COH / Total GCash', text: 'Cash and GCash added up across cashiers.' },
                        { name: 'Total Sales', text: 'Total COH + Total GCash + Senior discounts + Expense.' },
                        { name: 'POS', text: 'What the POS recorded as sold that day.' },
                        { name: 'Kulang Remit', text: 'Total COH − Actual COH. Cash that should be there but isn\'t.' },
                        { name: 'Short if (-)', text: 'Total Sales − POS. Negative means less money than the POS says was sold.' },
                        { name: 'Sales Needed', text: 'How far you are from the month\'s goal so far: the daily goal minus actual sales, added up from the 1st. Owners set it with the **Goal** button at the top of the page.' },
                    ] },
                ],
            },
        ],
    },
    {
        id: 'insights',
        title: 'Reports & insights',
        icon: 'chart-line',
        articles: [
            {
                id: 'reports',
                title: 'Understand your reports',
                summary: 'What each number on the Reports page means.',
                blocks: [
                    { type: 'p', text: 'Open **Reports** and choose a range: **Today**, **Last 7 days**, **Last 30 days**, **This month** or a custom range. Each figure is compared with the previous period of the same length. Days follow your store\'s timezone.' },
                    { type: 'image', src: img('reports-overview'), caption: 'Reports → Overview.' },
                    { type: 'fields', title: 'Headline numbers', items: [
                        { name: 'Net sales', text: 'What customers paid for finalized sales: after discounts, including tax. Voided sales are not counted.' },
                        { name: 'Orders / Avg order', text: 'Number of finalized sales, and net sales divided by that number.' },
                        { name: 'Gross profit', text: 'Sales minus the cost of what was sold. Costs come from product costs, or ingredient costs for recipes. "8/10 costed" means 2 items sold have no cost yet, so profit is overstated until you add them.' },
                        { name: 'Expenses', text: 'The total from the Expenses page for the range.' },
                        { name: 'Net after expenses', text: 'Gross profit minus expenses. Roughly what the business earned.' },
                    ] },
                    { type: 'fields', title: 'Tabs', items: [
                        { name: 'Overview', text: 'Sales by day (or by hour for a single day), payment mix, sales channels with their markup, daypart mix (breakfast, lunch, afternoon, dinner, late), best sellers, and the breakdown from gross sales to net.' },
                        { name: 'Products', text: 'Units sold per product and item margins (revenue, cost, profit, margin %).' },
                        { name: 'Inventory', text: 'Low stock watch, ingredients used by recipe sales, and purchasing spend by supplier.' },
                        { name: 'Team', text: 'Orders and takings per cashier, split by payment method.' },
                    ] },
                    { type: 'tip', text: '**Gross sales** in the breakdown is before discounts. The gap between gross and net is your discounts (and tax).' },
                ],
            },
            {
                id: 'ai-insights',
                title: 'AI Insights',
                summary: 'Daily summaries, questions and reorder suggestions.',
                blocks: [
                    { type: 'p', text: 'AI Insights uses your store\'s AI provider (set up in **Settings → AI integration**) to explain your numbers in plain language.' },
                    { type: 'fields', items: [
                        { name: 'AI daily summary', text: 'Click **Generate summary** for a short recap of your last complete day.' },
                        { name: 'Ask your data', text: 'Ask questions about sales, products, margins, payments or stock, e.g. "How many iced lattes did I sell last month?"' },
                        { name: 'Reorder suggestions', text: 'Click **Generate plan** to see what\'s running low and how much to order, based on the last 30 days of usage: stock on hand, usage per day, days left and a suggested order.' },
                    ] },
                    { type: 'note', text: 'If it says **AI isn\'t set up yet**, the owner needs to add a provider and API key first. AI usage is billed by your AI provider, not by SMB-PoS.' },
                ],
            },
            {
                id: 'audit-log',
                title: 'Audit Log',
                summary: 'Who changed what, and when.',
                blocks: [
                    { type: 'p', text: 'Open **Audit Log** (under **More**) to see important changes: stock adjustments, purchase receipts, order status changes, supplier edits, sale edits and deletions, permission changes, and anything changed by an AI app.' },
                    { type: 'image', src: img('audit-log'), caption: 'The Audit Log. Click an event to see its details.' },
                    { type: 'p', text: 'Filter by type or date range, search by person or item, and click an event to see exactly what changed. Use **Export** to download the list.' },
                ],
            },
        ],
    },
    {
        id: 'team',
        title: 'Staff schedule & pay',
        icon: 'calendar-account',
        articles: [
            {
                id: 'schedule',
                title: 'Plan the weekly schedule',
                summary: 'Shifts, rest days, publishing and payout.',
                blocks: [
                    { type: 'p', text: 'The **Schedule** page replaces a payroll spreadsheet. Weeks run Sunday to Saturday. Staff see everyone\'s shifts, so they can arrange swaps, but only their own pay.' },
                    { type: 'steps', items: [
                        { text: 'First, set each person\'s pay under the **Rates** tab: daily rate, hours per day, overtime multiplier and unpaid break minutes. A week can\'t be published until everyone on it has a rate.' },
                        { text: 'On the **Week** tab, add staff to the week, then click a day to give them a shift or **RD** (rest day). Save shifts you use often as **Shift presets** so it\'s one click. **Copy last week** starts from the previous roster.', image: img('schedule-week'), caption: 'The weekly shift grid with payout.' },
                        { text: 'Click **Save draft** while you work. Staff can\'t see the week until you click **Publish**.' },
                    ] },
                    { type: 'fields', title: 'Payout columns', items: [
                        { name: 'Days', text: 'Days worked that week.' },
                        { name: 'OT', text: 'Overtime hours. You enter these; the time clock suggests a figure.' },
                        { name: 'less CA', text: 'Cash advance deducted this week. Record advances and choose how much to deduct per week; the oldest advance is paid off first.' },
                        { name: 'Payout', text: 'Days × daily rate + OT hours × OT rate − cash advance. The OT rate is daily rate ÷ hours per day × OT multiplier.' },
                    ] },
                    { type: 'p', text: '**Month totals** adds up the published weeks of a month for payroll. Draft weeks aren\'t counted until you publish them.' },
                    { type: 'note', text: 'Rates are saved with a start date, so a raise only affects weeks from then on and never changes weeks you already published.' },
                ],
            },
            {
                id: 'time-clock',
                title: 'Time clock & attendance',
                summary: 'Clock in and out, and correct missed punches.',
                blocks: [
                    { type: 'p', text: 'Staff clock in and out with the **Time In** button in the top bar, on any page. The button shows today\'s rostered shift; timing in on a rest day is allowed but flagged as unscheduled. Owners don\'t clock in.' },
                    { type: 'image', src: img('time-clock'), caption: 'The time clock in the top bar.' },
                    { type: 'p', text: 'Managers check punches under **Schedule → Attendance**: each day shows the rostered shift next to the actual time in and out, with lateness and the difference in hours. Click a day to correct a punch or add a missing one.' },
                    { type: 'image', src: img('attendance'), caption: 'Schedule → Attendance.' },
                    { type: 'note', text: 'A day with a time in but no time out pays nothing until it\'s corrected, and the staff member sees a **!** on their clock button. Lateness is counted to the minute; there\'s no grace period.' },
                ],
            },
        ],
    },
    {
        id: 'settings',
        title: 'Store settings',
        icon: 'cog-outline',
        articles: [
            {
                id: 'settings-profile',
                title: 'Store profile',
                summary: 'Name, type, locale, tax and stock rules.',
                blocks: [
                    { type: 'p', text: 'Open **Settings** (under **More**). Only the owner and members with the **Manage store & team** permission can change settings; everyone else sees them read-only.' },
                    { type: 'image', src: img('settings-profile'), caption: 'Settings → Store profile.' },
                    { type: 'fields', items: [
                        { name: 'Store name', text: 'The name shown across the app.' },
                        { name: 'Store type', text: '**Retail** stores sell through the POS. **Warehouse** stores only hold and transfer stock, so they have no POS or sales history.' },
                        { name: 'Timezone', text: 'Decides which day sales and reports fall on.' },
                        { name: 'Currency', text: 'Used for every amount in this store.' },
                        { name: 'Low stock threshold', text: 'Default level at which an item is flagged as low stock.' },
                        { name: 'Tax rate (%)', text: 'Added to every POS ticket. Use 0 if your prices already include tax.' },
                        { name: 'Senior/PWD Discount (%)', text: 'The percentage applied when the cashier ticks **Discount** on a ticket.' },
                        { name: 'Cashier sales history limit', text: 'How many recent sales a cashier can see in Sales history. Leave blank for no limit.' },
                        { name: 'Allow negative stock', text: 'When off, sales and adjustments that would take stock below zero are blocked.' },
                    ] },
                    { type: 'p', text: 'Click **Save changes** when you\'re done, or **Reset changes** to discard them.' },
                ],
            },
            {
                id: 'settings-payment',
                title: 'Payment methods',
                summary: 'Choose what the POS accepts.',
                blocks: [
                    { type: 'p', text: 'Tick the payment methods your store accepts: Cash, Card, GCash, Maya, Bank Transfer and Other. Only ticked methods appear in the POS **Payment method** dropdown, and reports break sales down by method.' },
                    { type: 'image', src: img('settings-payment'), caption: 'Settings → Payment methods.' },
                ],
            },
            {
                id: 'settings-channels',
                title: 'Sales channels',
                summary: 'Delivery apps like Grab with their own prices.',
                blocks: [
                    { type: 'p', text: 'Sales channels are for delivery apps that sell above your store prices. Cashiers pick the channel on the POS ticket, and its prices are applied automatically.' },
                    { type: 'steps', items: [
                        { text: 'Open **Settings → Sales channels**.' },
                        { text: 'Click **Add Grab (+25%)** for a ready-made Grab channel, or **Add another channel** for any other app.', image: img('settings-channels'), caption: 'A Grab channel with a 25% markup.' },
                        { text: 'Adjust the markup and rounding, then click **Save channels**.' },
                    ] },
                    { type: 'fields', items: [
                        { name: 'Channel name', text: 'Shown on the POS toggle and in reports.' },
                        { name: 'On in POS', text: 'Turn off to hide the channel from the POS without deleting it.' },
                        { name: 'Markup (%)', text: 'How much above the store price channel prices are, e.g. 25% turns ₱100 into ₱125.' },
                        { name: 'Rounding', text: 'How marked-up prices are rounded: nearest whole peso, nearest 5, up to the next 5, nearest 10, or no rounding.' },
                        { name: 'Always takeout', text: 'Channel orders are always treated as takeout, so cups, lids and other packaging are deducted.' },
                    ] },
                    { type: 'tip', text: 'To give one product a different channel price, set it in that product\'s **Pricing** section.' },
                    { type: 'note', text: 'A channel that has been used on a sale can be turned off but not removed, so past sales keep their channel.' },
                ],
            },
            {
                id: 'settings-catalog',
                title: 'Catalog defaults',
                summary: 'Units, categories, subcategories and expense categories.',
                blocks: [
                    { type: 'p', text: 'Catalog defaults are the dropdown lists used when you create products, ingredients and expenses. Type a value and click **Add**; click **×** on a tag to remove it. Changes save automatically.' },
                    { type: 'image', src: img('settings-catalog'), caption: 'Settings → Catalog defaults.' },
                    { type: 'fields', items: [
                        { name: 'Units', text: 'Units for products and ingredients, e.g. pc, g, ml, bottle.' },
                        { name: 'Categories', text: 'Product categories. They also become the category filters in the POS.' },
                        { name: 'Subcategories', text: 'Optional groups inside each category, shown as a second filter row in the POS. Use the arrows to change their order.' },
                        { name: 'Expense categories', text: 'Categories for recording expenses, such as Rent, Utilities or Supplies.' },
                    ] },
                ],
            },
            {
                id: 'settings-team',
                title: 'Team & invites',
                summary: 'Invite staff and manage members.',
                blocks: [
                    { type: 'steps', items: [
                        { text: 'Open **Settings → Team** and switch to the **Invites** tab.' },
                        { text: 'Enter the person\'s email, choose a role, and set how many days the invite is valid (1–30).', image: img('settings-team'), caption: 'Creating an invite.' },
                        { text: 'Click **Create invite**, then **Copy** the invite link and send it to them. They sign up or log in through the link to join the store.' },
                    ] },
                    { type: 'heading', text: 'Roles' },
                    { type: 'fields', items: [
                        { name: 'Owner', text: 'Full access, including billing, archiving the store and changing permissions.' },
                        { name: 'Admin', text: 'Runs the store: POS, sales edits and voids, inventory, reports, schedule and settings.' },
                        { name: 'Inventory manager', text: 'Manages products, ingredients and stock; can view reports and record expenses.' },
                        { name: 'Cashier', text: 'Uses the POS and records expenses.' },
                        { name: 'Viewer', text: 'Read-only access to inventory and reports.' },
                    ] },
                    { type: 'p', text: 'On the **Members** tab you can change a member\'s role, give them individual permission exceptions with **Permissions**, **Suspend** their access temporarily, or **Remove** them from the store.' },
                ],
            },
            {
                id: 'settings-permissions',
                title: 'Roles & permissions',
                summary: 'Fine-tune what each role can do.',
                blocks: [
                    { type: 'p', text: 'Each role comes with a sensible set of permissions. In **Settings → Roles & permissions** the owner can turn individual permissions on or off for a role, for example allowing cashiers to void sales. Changes apply to everyone with that role.' },
                    { type: 'p', text: 'To make an exception for one person only, use the **Permissions** button next to them on the **Team → Members** tab.' },
                ],
            },
            {
                id: 'settings-ai',
                title: 'AI integration',
                summary: 'Connect OpenAI or Claude for AI Insights.',
                blocks: [
                    { type: 'p', text: 'AI Insights can answer questions about your sales and stock using your own AI provider account.' },
                    { type: 'fields', items: [
                        { name: 'Provider', text: 'OpenAI or Anthropic (Claude). Choose **None** to turn AI off.' },
                        { name: 'Model', text: 'Which model to use. Leave it on **Provider default** if unsure. Once a key is saved, the list loads the models available to your account.' },
                        { name: 'API key', text: 'Your provider\'s API key. It is encrypted and never shown again; only the last 4 characters are displayed. Leave blank to keep the saved key.' },
                        { name: 'Test connection', text: 'Checks the saved key with the provider without using any tokens.' },
                    ] },
                ],
            },
            {
                id: 'settings-mcp',
                title: 'Connect an AI app (MCP)',
                summary: 'Let Claude or Cursor work with your catalog.',
                blocks: [
                    { type: 'p', text: 'The MCP server lets AI apps such as Claude Desktop, Claude Code and Cursor read and manage your catalog. You can then ask things like "Which products have a margin under 30%?" or "Add these 20 ingredients from my supplier\'s price list."' },
                    { type: 'fields', title: 'What AI apps can access', items: [
                        { name: 'Shared', text: 'Store settings (read-only), ingredients, products with channel prices, recipes, and expenses.' },
                        { name: 'Never shared', text: 'Sales and payments, team members and invites, stock levels, reports, your AI API key, and billing.' },
                    ] },
                    { type: 'steps', items: [
                        { text: 'Open **Settings → MCP server**. Only store owners see this section.' },
                        { text: 'Under **Create a token**, give the token a name you\'ll recognize (e.g. "Claude on my laptop") and choose **Read-only** or **Read & write**.' },
                        { text: 'If you own more than one store, tick the stores this token may use. The store you\'re in is ticked already. One connection covers all the stores you tick, so you can ask things like "Copy the Spanish Latte recipe to my Makati store."' },
                        { text: 'Choose when the token expires (90 days by default), enter your password to confirm it\'s you, then click **Create token** and **copy it right away**. It is shown only once.' },
                        { text: 'Pick your app under **Connect an AI app**, copy the setup (your token is already filled in), and add it to the app as described.' },
                    ] },
                    { type: 'fields', title: 'Access levels', items: [
                        { name: 'Read-only', text: 'The AI can look things up and analyze them but can\'t change anything. Start here.' },
                        { name: 'Read & write', text: 'The AI can also add and edit ingredients, products, recipes and expenses. Changes go live in the POS immediately and are recorded in the **Audit Log** with the token\'s name and the old and new values. Store settings stay read-only either way.' },
                    ] },
                    { type: 'tip', text: 'Create a separate token for each app or device. If a laptop is lost, revoke just that token and the others keep working.' },
                    { type: 'note', text: 'A token stops working when it expires, when you click **Revoke**, or when you change or reset your password (reconnect your AI apps with a new token afterwards). If you stop owning one of its stores, or a store is archived, that store drops off the token and the others keep working. While an account is read-only for non-payment, AI apps can still read but not make changes. ChatGPT and claude.ai web connectors are not supported yet.' },
                ],
            },
            {
                id: 'settings-danger',
                title: 'Archive a store',
                summary: 'Close a store permanently.',
                blocks: [
                    { type: 'p', text: 'In **Settings → Danger zone**, the owner can archive a store. Archiving hides it from all members and stops new activity. The data is kept, but you can\'t undo this yourself. To confirm, you\'ll be asked to type the store\'s name.' },
                    { type: 'note', text: 'Only the store owner can archive a store.' },
                ],
            },
        ],
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting & support',
        icon: 'lifebuoy',
        articles: [
            {
                id: 'contact-support',
                title: 'Contact support',
                summary: 'Get help from the SMB-PoS team.',
                blocks: [
                    { type: 'p', text: 'Can\'t find the answer in this guide? Get in touch and we\'ll help.' },
                    { type: 'contact' },
                    { type: 'heading', text: 'Help us help you faster' },
                    { type: 'list', items: [
                        'Your **store name** and the **email you log in with**.',
                        'Which page you were on and what you were trying to do.',
                        'The exact error message, or a screenshot of it.',
                        'For a sale, the **receipt number** (e.g. #1048).',
                    ] },
                    { type: 'note', text: 'We will never ask for your password. Don\'t send it, or your MCP tokens or AI API keys, to anyone, including us.' },
                ],
            },
            {
                id: 'faq',
                title: 'Common problems',
                summary: 'Quick fixes for the questions we hear most.',
                blocks: [
                    { type: 'heading', text: 'A product doesn\'t show in the POS' },
                    { type: 'list', items: [
                        'The product is turned off: open it and switch on **Active**.',
                        'It\'s a recipe product with no recipe lines. Recipe products can\'t be active until they have at least one ingredient.',
                        'You\'re on a sales channel (e.g. Grab) and the product has **Sell on Grab** unticked.',
                        'A category or subcategory filter is selected in the POS. Click **All**.',
                    ] },
                    { type: 'heading', text: '"Stock would go negative for this sale"' },
                    { type: 'p', text: 'The store doesn\'t allow negative stock, and there isn\'t enough of the product or one of its ingredients. Record the delivery or a **stock adjustment** first, or ask the owner to turn on **Allow negative stock** in Settings.' },
                    { type: 'heading', text: 'The store says it\'s read-only' },
                    { type: 'p', text: 'The account has an unpaid bill, so nothing can be changed until it\'s paid. You can still view and export everything. The owner sees a banner with the details; access comes back automatically once payment is recorded.' },
                    { type: 'heading', text: 'I can\'t see a page or a button' },
                    { type: 'p', text: 'Pages and actions depend on your role and permissions in that store. Ask the owner to check **Settings → Roles & permissions** or the **Permissions** button next to your name in **Team**. A **View-only access** label means you can look but not change. Warehouse stores have no POS or sales history.' },
                    { type: 'heading', text: '"Your access to this store has been suspended"' },
                    { type: 'p', text: 'An owner or admin has suspended your membership. Ask them to reinstate you in **Settings → Team**.' },
                    { type: 'heading', text: 'The invite link doesn\'t work' },
                    { type: 'p', text: 'Invites expire after the number of days chosen when they were created (7 by default), and each can be used once. Ask the owner to create a new one. Sign up or log in with the **same email** the invite was sent to.' },
                    { type: 'heading', text: 'I didn\'t get the verification or password reset email' },
                    { type: 'p', text: 'Check your spam or promotions folder, and that you typed the email correctly. Use **Resend verification email** on the Stores page; reset links expire after 1 hour, so request a new one if it\'s old.' },
                    { type: 'heading', text: 'Report numbers look wrong' },
                    { type: 'list', items: [
                        'Check the date range at the top. Days follow the store\'s timezone, not your phone\'s.',
                        'Voided sales aren\'t counted in net sales; deleted sales are removed completely.',
                        'Gross profit needs costs. Look for "costed" under Gross profit and add missing product or ingredient costs.',
                    ] },
                    { type: 'heading', text: 'An AI app stopped connecting' },
                    { type: 'p', text: 'MCP tokens stop working when they expire, are revoked, or when you change or reset your password. Create a new token in **Settings → MCP server**.' },
                ],
            },
        ],
    },
    {
        id: 'account',
        title: 'Account & billing',
        icon: 'account-circle-outline',
        articles: [
            {
                id: 'profile',
                title: 'Your profile & password',
                summary: 'Change your name or password.',
                blocks: [
                    { type: 'p', text: 'Click your name in the top-right corner and choose **My Profile**. You can change your display name and password there. Changing your password signs you out on your other devices and disconnects any AI apps (MCP tokens). Your email can\'t be changed.' },
                ],
            },
            {
                id: 'billing',
                title: 'Billing',
                summary: 'How stores are priced and paid.',
                blocks: [
                    { type: 'p', text: 'Every store gets every feature with unlimited team members. Owners pay a monthly fee for each store, based on the order the stores were created in:' },
                    { type: 'fields', items: [
                        { name: '1st store', text: '₱500 per month' },
                        { name: '2nd store', text: '₱400 per month' },
                        { name: '3rd store onward', text: '₱300 per month each' },
                    ] },
                    { type: 'p', text: 'Warehouses count as stores. A statement is sent each month, and owners and admins see a banner in the app when a bill is overdue.' },
                    { type: 'note', text: 'If an account stays unpaid, its stores may be made **read-only**: everyone can still view data, but no new sales or changes can be saved until the bill is paid. Access returns automatically once payment is recorded.' },
                ],
            },
        ],
    },
];

export const helpArticles: HelpArticle[] = helpSections.flatMap((section) => section.articles);
