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
    | { type: 'list'; items: string[] };

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
        ],
    },
    {
        id: 'inventory',
        title: 'Inventory',
        icon: 'warehouse',
        articles: [
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
                        { name: 'Discount', text: 'Tick to apply the Senior/PWD discount percentage set in the store settings.' },
                        { name: 'Tax', text: 'Calculated from the store\'s tax rate.' },
                        { name: 'Walk-in / channel', text: 'Channel tickets use the channel prices. Reports show channel sales and markup separately.' },
                        { name: 'Dine-in / Takeout', text: 'Takeout also deducts each product\'s takeout packaging.' },
                        { name: 'Manual sale date (owners only)', text: 'Records a sale with an earlier date and time, e.g. when entering sales from a paper log.' },
                    ] },
                    { type: 'tip', text: 'Use the **Cards** and **Table List** views to switch layouts. The table view is faster for very large catalogs. In the cards view you can drag cards to reorder them.' },
                    { type: 'p', text: 'Past sales are under **Sales history**, where users with the right permission can edit or void them.' },
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
                        { name: 'Shared', text: 'Store settings (read-only), ingredients, products with channel prices, and recipes.' },
                        { name: 'Never shared', text: 'Sales and payments, team members and invites, stock levels, expenses, reports, your AI API key, and billing.' },
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
                        { name: 'Read & write', text: 'The AI can also add and edit ingredients, products and recipes. Changes go live in the POS immediately and are recorded in the **Audit Log** with the token\'s name and the old and new values. Store settings stay read-only either way.' },
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
