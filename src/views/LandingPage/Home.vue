<template>
    <div class="page">

        <!-- HEADER -->
        <header class="site-header" :class="{ 'site-header--hidden': isHeaderHidden }">
            <div class="wrap">
                <div class="header-inner">
                    <div class="header-brand">
                        <img :src="brandLogo" alt="SmB-PoS" class="brand-logo" />
                    </div>
                    <nav class="main-nav">
                        <a href="#features">Features</a>
                        <a href="#workflow">How it works</a>
                        <a href="#pricing">Pricing</a>
                    </nav>
                    <div class="header-actions">
                        <router-link to="/login" class="nav-login">Log in</router-link>
                        <router-link to="/register" class="btn btn-primary">Get started free</router-link>
                    </div>
                </div>
            </div>
        </header>

        <main>

            <!-- HERO -->
            <section class="hero">
                <div class="wrap">
                    <div class="hero-grid">
                        <div class="hero-text">
                            <div class="eyebrow">POS + Inventory · Built for the Philippines</div>
                            <h1>Run your shop.<br />Own your numbers.</h1>
                            <p class="hero-desc">
                                The all-in-one sales and inventory platform for small stores, cafes,
                                and food businesses. Manage products, staff, and stock — all from one
                                place.
                            </p>
                            <div class="hero-ctas">
                                <router-link to="/register" class="btn btn-primary btn-lg">Start free — no card needed</router-link>
                                <a href="#pricing" class="btn btn-ghost btn-lg">View pricing</a>
                            </div>
                            <div class="trust-line">
                                <span>✓ Setup in minutes</span>
                                <span>✓ Cancel anytime</span>
                                <span>✓ PHP-denominated pricing</span>
                            </div>
                        </div>
                        <div class="hero-visual">
                            <div class="mock-card">
                                <div class="mock-header">
                                    <div>
                                        <span class="mock-date">Today, Apr 5</span>
                                        <span class="mock-store">Main Store</span>
                                    </div>
                                    <span class="live-pill">
                                        <span class="live-dot"></span>Live
                                    </span>
                                </div>
                                <div class="mock-stats">
                                    <div class="mock-stat">
                                        <span class="ms-label">Sales today</span>
                                        <span class="ms-value">PHP 12,450</span>
                                    </div>
                                    <div class="mock-stat">
                                        <span class="ms-label">Low stock</span>
                                        <span class="ms-value ms-alert">6 items</span>
                                    </div>
                                    <div class="mock-stat">
                                        <span class="ms-label">Top seller</span>
                                        <span class="ms-value">Iced coffee</span>
                                    </div>
                                </div>
                                <div class="mock-divider"></div>
                                <div class="mock-orders-title">Recent orders</div>
                                <div class="mock-orders">
                                    <div class="mock-order">
                                        <span>Order #1024 · 2 items</span>
                                        <span class="order-done">Done</span>
                                    </div>
                                    <div class="mock-order">
                                        <span>Order #1025 · 3 items</span>
                                        <span class="order-pending">In progress</span>
                                    </div>
                                    <div class="mock-order">
                                        <span>Order #1026 · 1 item</span>
                                        <span class="order-done">Done</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- STATS STRIP -->
            <div class="stats-strip">
                <div class="wrap">
                    <div class="stats-inner">
                        <div class="stat-block">
                            <span class="stat-num">500+</span>
                            <span class="stat-lbl">Active stores</span>
                        </div>
                        <span class="stat-sep"></span>
                        <div class="stat-block">
                            <span class="stat-num">PHP 50M+</span>
                            <span class="stat-lbl">Sales processed</span>
                        </div>
                        <span class="stat-sep"></span>
                        <div class="stat-block">
                            <span class="stat-num">99.9%</span>
                            <span class="stat-lbl">Uptime guaranteed</span>
                        </div>
                        <span class="stat-sep"></span>
                        <div class="stat-block">
                            <span class="stat-num">24/7</span>
                            <span class="stat-lbl">Email support</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FEATURES -->
            <section id="features" class="section">
                <div class="wrap">
                    <div class="section-intro">
                        <div class="eyebrow">Capabilities</div>
                        <h2>Everything your shop needs to thrive.</h2>
                        <p class="section-desc">
                            From sari-sari stores to specialty cafes — SmB-PoS has the tools to keep
                            you organized and profitable.
                        </p>
                    </div>
                    <div class="feat-grid">
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <h3>Multi-store ready</h3>
                            <p>Manage multiple locations under one account. Each store has its own data, staff, and inventory.</p>
                        </div>
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                            </div>
                            <h3>Point of sale</h3>
                            <p>Fast, intuitive POS for cashiers. Ring up sales, apply discounts, and complete orders in seconds.</p>
                        </div>
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                </svg>
                            </div>
                            <h3>Real-time inventory</h3>
                            <p>Every sale and restock updates your ledger instantly. Always know what's in stock and what's running low.</p>
                        </div>
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                </svg>
                            </div>
                            <h3>Recipe costing</h3>
                            <p>Link ingredients to products. When a recipe item sells, ingredients auto-deduct so your margins stay accurate.</p>
                        </div>
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                            </div>
                            <h3>Actionable reports</h3>
                            <p>Daily sales summaries, top products, and stock alerts — surfaced automatically so you're always in the know.</p>
                        </div>
                        <div class="feat-card">
                            <div class="feat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <h3>Role-based access</h3>
                            <p>Assign Owner, Admin, Cashier, or Inventory Manager roles. Each staff member sees only what they need.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- HOW IT WORKS -->
            <section id="workflow" class="section section-alt">
                <div class="wrap">
                    <div class="section-intro">
                        <div class="eyebrow">How it works</div>
                        <h2>From signup to first sale in minutes.</h2>
                    </div>
                    <div class="steps-layout">
                        <div class="step">
                            <div class="step-num">01</div>
                            <h3>Create your store</h3>
                            <p>Register an account, name your store, configure currency and tax settings, and invite your team.</p>
                        </div>
                        <div class="step-connector">
                            <svg viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 12 H40 M34 5 L44 12 L34 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </div>
                        <div class="step">
                            <div class="step-num">02</div>
                            <h3>Build your catalog</h3>
                            <p>Add products, set prices, define ingredient recipes, and load your starting stock quantities.</p>
                        </div>
                        <div class="step-connector">
                            <svg viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 12 H40 M34 5 L44 12 L34 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </div>
                        <div class="step">
                            <div class="step-num">03</div>
                            <h3>Sell and grow</h3>
                            <p>Use the POS to process sales, receive purchase orders to restock, and monitor everything in real time.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PRICING -->
            <section id="pricing" class="section">
                <div class="wrap">
                    <div class="section-intro center-intro">
                        <div class="eyebrow">Pricing</div>
                        <h2>Simple, honest pricing.</h2>
                        <p class="section-desc">Start small. Scale when you're ready. No hidden fees, no annual lock-in.</p>
                    </div>
                    <div class="pricing-grid">
                        <div class="price-card">
                            <div class="pc-tier">Starter</div>
                            <div class="pc-price">Free<span class="pc-period"> forever</span></div>
                            <p class="pc-desc">For kiosks and single-staff shops getting started.</p>
                            <router-link to="/register" class="btn btn-outline w-full">Start for free</router-link>
                            <ul class="pc-list">
                                <li><span class="check">✓</span>1 store, up to 2 users</li>
                                <li><span class="check">✓</span>Products + inventory ledger</li>
                                <li><span class="check">✓</span>Basic sales &amp; POS</li>
                                <li><span class="check">✓</span>Sales reports &amp; stock alerts</li>
                                <li><span class="check">✓</span>Email support</li>
                            </ul>
                        </div>
                        <div class="price-card price-card-featured">
                            <div class="pc-badge">Most popular</div>
                            <div class="pc-tier">Standard</div>
                            <div class="pc-price">PHP 899<span class="pc-period">/month</span></div>
                            <p class="pc-desc">For cafes, restaurants, and food stalls with recipes.</p>
                            <router-link to="/register" class="btn btn-primary w-full">Get started</router-link>
                            <ul class="pc-list">
                                <li><span class="check">✓</span>1 store, up to 5 users</li>
                                <li><span class="check">✓</span>Ingredients + recipes</li>
                                <li><span class="check">✓</span>Purchase orders + receiving</li>
                                <li><span class="check">✓</span>Full inventory ledger</li>
                                <li><span class="check">✓</span>Export to CSV</li>
                                <li><span class="check">✓</span>Priority email support</li>
                            </ul>
                        </div>
                        <div class="price-card">
                            <div class="pc-tier">Growth</div>
                            <div class="pc-price">PHP 1,499<span class="pc-period">/month</span></div>
                            <p class="pc-desc">For multi-location businesses with more staff and volume.</p>
                            <router-link to="/register" class="btn btn-outline w-full">Get started</router-link>
                            <ul class="pc-list">
                                <li><span class="check">✓</span>Up to 3 stores, 10 users each</li>
                                <li><span class="check">✓</span>Everything in Standard</li>
                                <li><span class="check">✓</span>Multi-store operations</li>
                                <li><span class="check">✓</span>Higher catalog capacity</li>
                                <li><span class="check">✓</span>Dedicated support</li>
                            </ul>
                        </div>
                    </div>
                    <p class="pricing-note">Starter is free forever. Standard and Growth include a 14-day free trial. Upgrade or downgrade anytime from Store Settings.</p>
                </div>
            </section>

            <!-- BOTTOM CTA BAND -->
            <section class="cta-band">
                <div class="wrap">
                    <div class="cta-inner">
                        <h2>Ready to take control of your store?</h2>
                        <p>Join hundreds of Filipino shop owners already using SmB-PoS to run their business.</p>
                        <div class="cta-btns">
                            <router-link to="/register" class="btn btn-white btn-lg">Create free account</router-link>
                            <a href="mailto:support@smb-pos.app" class="btn btn-ghost-white btn-lg">Talk to us</a>
                        </div>
                    </div>
                </div>
            </section>

        </main>

        <!-- FOOTER -->
        <footer class="site-footer">
            <div class="wrap">
                <div class="footer-top">
                    <div class="footer-brand">
                        <img :src="brandLogo" alt="SmB-PoS" class="brand-logo footer-logo" />
                        <p>POS, inventory, and recipe control for small stores and food businesses in the Philippines.</p>
                        <div class="footer-contact">
                            <span>support@smb-pos.app</span>
                            <span>+63 900 123 4567</span>
                        </div>
                    </div>
                    <div class="footer-cols">
                        <div class="footer-col">
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#workflow">How it works</a>
                            <a href="#pricing">Pricing</a>
                            <router-link to="/login">Log in</router-link>
                            <router-link to="/register">Sign up</router-link>
                        </div>
                        <div class="footer-col">
                            <h4>Company</h4>
                            <a href="#">About</a>
                            <a href="mailto:support@smb-pos.app">Support</a>
                            <a href="mailto:support@smb-pos.app">Contact sales</a>
                        </div>
                        <div class="footer-col">
                            <h4>Legal</h4>
                            <a href="#">Privacy policy</a>
                            <a href="#">Terms of service</a>
                            <a href="#">Security</a>
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <span>&copy; 2025 SmB-PoS. All rights reserved.</span>
                    <div class="footer-bottom-links">
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Status</a>
                    </div>
                </div>
            </div>
        </footer>

    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import brandLogo from '@/assets/SmB-PoS.png';

const isHeaderHidden = ref(false);
let lastScrollY = 0;
let ticking = false;

const handleScroll = () => {
    const currentY = window.scrollY || 0;
    const delta = currentY - lastScrollY;
    if (currentY < 60) {
        isHeaderHidden.value = false;
    } else if (delta > 8) {
        isHeaderHidden.value = true;
    } else if (delta < -8) {
        isHeaderHidden.value = false;
    }
    lastScrollY = currentY;
    ticking = false;
};

const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(handleScroll);
};

onMounted(() => {
    lastScrollY = window.scrollY || 0;
    window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ============================================================
   DESIGN TOKENS
============================================================ */
.page {
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-accent: #0d9488;
    --c-accent-dark: #0f766e;
    --c-accent-soft: rgba(13, 148, 136, 0.1);
    --c-border: #e2e8f0;
    --c-surface: #ffffff;
    --c-alt: #f8fafc;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06);
    --r: 12px;
    --r-lg: 20px;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--c-text);
    background: var(--c-surface);
}

/* ============================================================
   CONTAINER
============================================================ */
.wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
}

/* ============================================================
   BUTTONS
============================================================ */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    cursor: pointer;
    border: 1.5px solid transparent;
    padding: 0.55rem 1.2rem;
    white-space: nowrap;
    line-height: 1;
}

.btn-primary {
    background: var(--c-accent);
    color: white;
    border-color: var(--c-accent);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
}

.btn-primary:hover {
    background: var(--c-accent-dark);
    border-color: var(--c-accent-dark);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.38);
    transform: translateY(-1px);
}

.btn-outline {
    background: transparent;
    color: var(--c-accent-dark);
    border-color: var(--c-accent);
}

.btn-outline:hover {
    background: var(--c-accent-soft);
}

.btn-ghost {
    background: transparent;
    color: var(--c-text);
    border-color: var(--c-border);
}

.btn-ghost:hover {
    border-color: var(--c-accent);
    color: var(--c-accent-dark);
}

.btn-white {
    background: white;
    color: var(--c-accent-dark);
    border-color: white;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
}

.btn-white:hover {
    background: #f0fdfa;
    transform: translateY(-1px);
}

.btn-ghost-white {
    background: transparent;
    color: white;
    border-color: rgba(255, 255, 255, 0.45);
}

.btn-ghost-white:hover {
    border-color: white;
    background: rgba(255, 255, 255, 0.1);
}

.btn-lg {
    padding: 0.8rem 1.8rem;
    font-size: 1rem;
    border-radius: 10px;
}

.w-full {
    width: 100%;
}

/* ============================================================
   HEADER
============================================================ */
.site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--c-border);
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.site-header--hidden {
    transform: translateY(-100%);
    opacity: 0;
}

.header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    gap: 2rem;
}

.header-brand .brand-logo {
    height: 36px;
    width: auto;
    display: block;
}

.main-nav {
    display: flex;
    gap: 0.25rem;
    flex: 1;
    justify-content: center;
}

.main-nav a {
    text-decoration: none;
    color: var(--c-muted);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
}

.main-nav a:hover {
    color: var(--c-text);
    background: var(--c-alt);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.nav-login {
    text-decoration: none;
    color: var(--c-muted);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    transition: color 0.15s;
}

.nav-login:hover {
    color: var(--c-text);
}

/* ============================================================
   HERO
============================================================ */
.hero {
    padding: 5rem 0 4.5rem;
    background:
        radial-gradient(ellipse 80% 60% at 70% -10%, rgba(13, 148, 136, 0.07) 0%, transparent 65%),
        linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    border-bottom: 1px solid var(--c-border);
}

.hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
}

.eyebrow {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-accent);
    background: var(--c-accent-soft);
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    margin-bottom: 1.25rem;
}

.hero-text h1 {
    font-size: clamp(2.6rem, 4vw, 3.8rem);
    font-weight: 800;
    line-height: 1.06;
    letter-spacing: -0.03em;
    margin: 0 0 1.25rem;
    color: var(--c-text);
}

.hero-desc {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--c-muted);
    max-width: 490px;
    margin: 0 0 2rem;
}

.hero-ctas {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.trust-line {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    font-size: 0.82rem;
    color: var(--c-muted);
}

/* Mock dashboard */
.hero-visual {
    display: flex;
    justify-content: center;
}

.mock-card {
    background: white;
    border-radius: var(--r-lg);
    padding: 1.75rem;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--c-border);
    width: min(100%, 420px);
}

.mock-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
}

.mock-date {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
    display: block;
}

.mock-store {
    font-size: 1.15rem;
    font-weight: 700;
    display: block;
    margin-top: 0.2rem;
}

.live-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.live-dot {
    width: 6px;
    height: 6px;
    background: #16a34a;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
}

.mock-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.mock-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.ms-label {
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
}

.ms-value {
    font-size: 0.97rem;
    font-weight: 700;
    color: var(--c-text);
}

.ms-alert {
    color: #ef4444;
}

.mock-divider {
    height: 1px;
    background: var(--c-border);
    margin-bottom: 1rem;
}

.mock-orders-title {
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted);
    margin-bottom: 0.6rem;
}

.mock-orders {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.mock-order {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.84rem;
    padding: 0.55rem 0.75rem;
    background: var(--c-alt);
    border-radius: 8px;
}

.order-done {
    font-size: 0.7rem;
    font-weight: 700;
    color: #16a34a;
    background: rgba(34, 197, 94, 0.1);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
}

.order-pending {
    font-size: 0.7rem;
    font-weight: 700;
    color: #d97706;
    background: rgba(245, 158, 11, 0.1);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
}

/* ============================================================
   STATS STRIP
============================================================ */
.stats-strip {
    background: var(--c-alt);
    border-bottom: 1px solid var(--c-border);
    padding: 2.25rem 0;
}

.stats-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3rem;
    flex-wrap: wrap;
}

.stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
}

.stat-num {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--c-text);
    letter-spacing: -0.03em;
}

.stat-lbl {
    font-size: 0.8rem;
    color: var(--c-muted);
}

.stat-sep {
    width: 1px;
    height: 44px;
    background: var(--c-border);
    flex-shrink: 0;
}

/* ============================================================
   SECTIONS
============================================================ */
.section {
    padding: 5.5rem 0;
}

.section-alt {
    background: var(--c-alt);
}

.section-intro {
    margin-bottom: 3rem;
    max-width: 580px;
}

.center-intro {
    max-width: 100%;
    text-align: center;
}

.center-intro h2,
.center-intro .section-desc {
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
}

.section-intro h2 {
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin: 0.5rem 0 0.75rem;
    color: var(--c-text);
}

.section-desc {
    font-size: 1rem;
    line-height: 1.65;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   FEATURES
============================================================ */
.feat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
}

.feat-card {
    background: white;
    border-radius: var(--r);
    border: 1px solid var(--c-border);
    padding: 1.75rem;
    transition: box-shadow 0.2s, transform 0.2s;
}

.feat-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.feat-icon {
    width: 44px;
    height: 44px;
    background: var(--c-accent-soft);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    color: var(--c-accent);
}

.feat-icon svg {
    width: 20px;
    height: 20px;
}

.feat-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: var(--c-text);
}

.feat-card p {
    font-size: 0.875rem;
    line-height: 1.65;
    color: var(--c-muted);
    margin: 0;
}

/* ============================================================
   HOW IT WORKS
============================================================ */
.steps-layout {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.step {
    flex: 1;
    background: white;
    border-radius: var(--r);
    border: 1px solid var(--c-border);
    padding: 2rem;
    box-shadow: var(--shadow-sm);
}

.step-num {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--c-accent);
    background: var(--c-accent-soft);
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    letter-spacing: 0.06em;
}

.step h3 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: var(--c-text);
}

.step p {
    font-size: 0.875rem;
    line-height: 1.65;
    color: var(--c-muted);
    margin: 0;
}

.step-connector {
    display: flex;
    align-items: center;
    padding-top: 2rem;
    color: var(--c-border);
    flex-shrink: 0;
}

.step-connector svg {
    width: 48px;
    height: 24px;
}

/* ============================================================
   PRICING
============================================================ */
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    align-items: start;
}

.price-card {
    background: white;
    border-radius: var(--r-lg);
    border: 1px solid var(--c-border);
    padding: 2rem;
    position: relative;
}

.price-card-featured {
    border: 2px solid var(--c-accent);
    box-shadow: 0 8px 32px rgba(13, 148, 136, 0.14);
}

.pc-badge {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-accent-dark);
    background: var(--c-accent-soft);
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    margin-bottom: 0.75rem;
}

.pc-tier {
    font-size: 1rem;
    font-weight: 700;
    color: var(--c-text);
    margin-bottom: 0.5rem;
}

.pc-price {
    font-size: 2.1rem;
    font-weight: 800;
    color: var(--c-text);
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
    line-height: 1;
}

.pc-period {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--c-muted);
    letter-spacing: 0;
}

.pc-desc {
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--c-muted);
    margin: 0 0 1.5rem;
}

.pc-list {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0 0;
    display: grid;
    gap: 0.65rem;
}

.pc-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--c-muted);
    line-height: 1.4;
}

.check {
    color: var(--c-accent);
    font-weight: 700;
    flex-shrink: 0;
}

.pricing-note {
    text-align: center;
    font-size: 0.84rem;
    color: var(--c-muted);
    margin-top: 2rem;
}

/* ============================================================
   CTA BAND
============================================================ */
.cta-band {
    background: linear-gradient(135deg, var(--c-accent-dark) 0%, #0d9488 60%, #0891b2 100%);
    padding: 5.5rem 0;
}

.cta-inner {
    text-align: center;
    max-width: 580px;
    margin: 0 auto;
}

.cta-inner h2 {
    font-size: clamp(1.8rem, 3vw, 2.4rem);
    font-weight: 800;
    color: white;
    letter-spacing: -0.03em;
    margin: 0 0 0.75rem;
    line-height: 1.15;
}

.cta-inner p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 0 2.25rem;
    line-height: 1.65;
}

.cta-btns {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
}

/* ============================================================
   FOOTER
============================================================ */
.site-footer {
    background: #0f172a;
    color: rgba(255, 255, 255, 0.6);
    padding: 4rem 0 2rem;
}

.footer-top {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 3rem;
    padding-bottom: 2.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 1.5rem;
}

.footer-brand p {
    font-size: 0.875rem;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.45);
    margin: 1rem 0 1rem;
    max-width: 300px;
}

.footer-logo {
    height: 32px;
    width: auto;
    filter: brightness(0) invert(1);
    opacity: 0.85;
}

.footer-contact {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.4);
}

.footer-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
}

.footer-col h4 {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 1rem;
}

.footer-col a {
    display: block;
    text-decoration: none;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 0.6rem;
    transition: color 0.15s;
}

.footer-col a:hover {
    color: rgba(255, 255, 255, 0.9);
}

.footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.3);
}

.footer-bottom-links {
    display: flex;
    gap: 1.25rem;
}

.footer-bottom-links a {
    text-decoration: none;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.8rem;
    transition: color 0.15s;
}

.footer-bottom-links a:hover {
    color: rgba(255, 255, 255, 0.7);
}

/* ============================================================
   RESPONSIVE
============================================================ */
@media (max-width: 1024px) {
    .hero-grid {
        gap: 3rem;
    }

    .feat-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .main-nav {
        display: none;
    }

    .hero {
        padding: 3rem 0 2.5rem;
    }

    .hero-grid {
        grid-template-columns: 1fr;
        gap: 2.5rem;
    }

    .hero-text h1 {
        font-size: 2.4rem;
    }

    .hero-ctas {
        flex-direction: column;
    }

    .hero-ctas .btn {
        width: 100%;
        justify-content: center;
    }

    .stat-sep {
        display: none;
    }

    .stats-inner {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
    }

    .feat-grid {
        grid-template-columns: 1fr;
    }

    .steps-layout {
        flex-direction: column;
        gap: 0;
    }

    .step-connector {
        transform: rotate(90deg);
        padding: 0.25rem 0;
        align-self: center;
    }

    .pricing-grid {
        grid-template-columns: 1fr;
    }

    .footer-top {
        grid-template-columns: 1fr;
        gap: 2rem;
    }

    .footer-cols {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .section {
        padding: 3.5rem 0;
    }

    .hero-text h1 {
        font-size: 2rem;
    }

    .mock-stats {
        grid-template-columns: 1fr 1fr;
    }

    .footer-cols {
        grid-template-columns: 1fr;
    }

    .footer-bottom {
        flex-direction: column;
        text-align: center;
    }

    .cta-band {
        padding: 3.5rem 0;
    }
}

/* ============================================================
   ANIMATIONS
============================================================ */
@media (prefers-reduced-motion: no-preference) {
    .hero-text {
        animation: fade-up 0.5s ease forwards;
    }

    .hero-visual {
        animation: fade-up 0.55s 0.08s ease both;
    }

    .feat-card:nth-child(1) { animation: fade-up 0.5s 0.0s ease both; }
    .feat-card:nth-child(2) { animation: fade-up 0.5s 0.07s ease both; }
    .feat-card:nth-child(3) { animation: fade-up 0.5s 0.14s ease both; }
    .feat-card:nth-child(4) { animation: fade-up 0.5s 0.21s ease both; }
    .feat-card:nth-child(5) { animation: fade-up 0.5s 0.28s ease both; }
    .feat-card:nth-child(6) { animation: fade-up 0.5s 0.35s ease both; }
}

@keyframes fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
