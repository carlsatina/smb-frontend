<template>
    <section ref="pageRef" class="hc-page">
        <div class="hc-shell">
            <header class="hc-header">
                <div class="hc-header-left">
                    <span class="hc-eyebrow">Help &amp; Support</span>
                    <h1 class="hc-title">How can we help?</h1>
                    <p class="hc-subtitle">Step-by-step guides for setting up your store and using every page.</p>
                </div>
            </header>

            <div class="hc-body">
                <!-- Table of contents -->
                <nav class="hc-toc" aria-label="Help topics">
                    <label class="hc-search">
                        <mdicon name="magnify" size="16" />
                        <input
                            v-model.trim="query"
                            type="search"
                            placeholder="Search help…"
                            aria-label="Search help"
                        />
                    </label>

                    <!-- Mobile: compact picker instead of the full list -->
                    <select
                        class="hc-toc-select"
                        :value="activeArticle.id"
                        aria-label="Choose a help topic"
                        @change="openArticle(($event.target as HTMLSelectElement).value)"
                    >
                        <optgroup v-for="section in filteredSections" :key="section.id" :label="section.title">
                            <option v-for="article in section.articles" :key="article.id" :value="article.id">
                                {{ article.title }}
                            </option>
                        </optgroup>
                    </select>

                    <div class="hc-toc-list">
                        <div v-for="section in filteredSections" :key="section.id" class="hc-toc-group">
                            <span class="hc-toc-group-label">
                                <mdicon :name="section.icon" size="14" />
                                {{ section.title }}
                            </span>
                            <RouterLink
                                v-for="article in section.articles"
                                :key="article.id"
                                :to="{ name: 'help', params: { articleId: article.id } }"
                                class="hc-toc-item"
                                :class="{ 'is-active': article.id === activeArticle.id }"
                            >
                                {{ article.title }}
                            </RouterLink>
                        </div>
                        <p v-if="filteredSections.length === 0" class="hc-toc-empty">
                            No topics match “{{ query }}”.
                        </p>
                    </div>
                </nav>

                <!-- Article -->
                <article class="hc-article">
                    <p class="hc-breadcrumb">{{ activeSection.title }}</p>
                    <h2 class="hc-article-title">{{ activeArticle.title }}</h2>
                    <p class="hc-article-summary">{{ activeArticle.summary }}</p>

                    <template v-for="(block, index) in activeArticle.blocks" :key="`${activeArticle.id}-${index}`">
                        <p v-if="block.type === 'p'" class="hc-p" v-html="formatInline(block.text)"></p>

                        <h3 v-else-if="block.type === 'heading'" class="hc-h3">{{ block.text }}</h3>

                        <ul v-else-if="block.type === 'list'" class="hc-list">
                            <li v-for="(item, i) in block.items" :key="i" v-html="formatInline(item)"></li>
                        </ul>

                        <ol v-else-if="block.type === 'steps'" class="hc-steps">
                            <li v-for="(step, i) in block.items" :key="i" class="hc-step">
                                <span class="hc-step-num">{{ i + 1 }}</span>
                                <div class="hc-step-body">
                                    <p class="hc-step-text" v-html="formatInline(step.text)"></p>
                                    <figure v-if="step.image" class="hc-figure">
                                        <button type="button" class="hc-figure-btn" @click="zoom(step.image, step.caption)">
                                            <img :src="step.image" :alt="step.caption || step.text" loading="lazy" />
                                        </button>
                                        <figcaption v-if="step.caption">{{ step.caption }}</figcaption>
                                    </figure>
                                </div>
                            </li>
                        </ol>

                        <div v-else-if="block.type === 'fields'" class="hc-fields">
                            <p v-if="block.title" class="hc-fields-title">{{ block.title }}</p>
                            <dl>
                                <div v-for="field in block.items" :key="field.name" class="hc-field">
                                    <dt>{{ field.name }}</dt>
                                    <dd v-html="formatInline(field.text)"></dd>
                                </div>
                            </dl>
                        </div>

                        <figure v-else-if="block.type === 'image'" class="hc-figure">
                            <button type="button" class="hc-figure-btn" @click="zoom(block.src, block.caption)">
                                <img :src="block.src" :alt="block.caption || activeArticle.title" loading="lazy" />
                            </button>
                            <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
                        </figure>

                        <div v-else-if="block.type === 'tip'" class="hc-callout hc-callout--tip">
                            <mdicon name="lightbulb-on-outline" size="18" />
                            <p v-html="formatInline(block.text)"></p>
                        </div>

                        <div v-else-if="block.type === 'note'" class="hc-callout hc-callout--note">
                            <mdicon name="information-outline" size="18" />
                            <p v-html="formatInline(block.text)"></p>
                        </div>
                    </template>

                    <footer class="hc-pager">
                        <RouterLink
                            v-if="prevArticle"
                            :to="{ name: 'help', params: { articleId: prevArticle.id } }"
                            class="hc-pager-link"
                        >
                            <span class="hc-pager-dir"><mdicon name="arrow-left" size="14" /> Previous</span>
                            <span class="hc-pager-title">{{ prevArticle.title }}</span>
                        </RouterLink>
                        <span v-else></span>
                        <RouterLink
                            v-if="nextArticle"
                            :to="{ name: 'help', params: { articleId: nextArticle.id } }"
                            class="hc-pager-link hc-pager-link--next"
                        >
                            <span class="hc-pager-dir">Next <mdicon name="arrow-right" size="14" /></span>
                            <span class="hc-pager-title">{{ nextArticle.title }}</span>
                        </RouterLink>
                    </footer>
                </article>
            </div>
        </div>

        <!-- Screenshot zoom -->
        <Teleport to="body">
            <div v-if="zoomed" class="hc-zoom" role="dialog" aria-modal="true" @click="zoomed = null">
                <img :src="zoomed.src" :alt="zoomed.caption || ''" />
                <p v-if="zoomed.caption">{{ zoomed.caption }}</p>
            </div>
        </Teleport>
    </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { helpArticles, helpSections, type HelpSection } from '@/content/helpArticles';
import { useStoreContextStore } from '@/stores/storeContext';

const route = useRoute();
const router = useRouter();
const storeContext = useStoreContextStore();
const pageRef = ref<HTMLElement | null>(null);
const query = ref('');
const zoomed = ref<{ src: string; caption?: string } | null>(null);

const activeArticle = computed(
    () => helpArticles.find((article) => article.id === route.params.articleId) ?? helpArticles[0],
);
const activeSection = computed(
    () => helpSections.find((section) => section.articles.some((a) => a.id === activeArticle.value.id)) ?? helpSections[0],
);

const activeIndex = computed(() => helpArticles.findIndex((a) => a.id === activeArticle.value.id));
const prevArticle = computed(() => helpArticles[activeIndex.value - 1] ?? null);
const nextArticle = computed(() => helpArticles[activeIndex.value + 1] ?? null);

// Searches titles, summaries and body text so "barcode" finds the product article.
const articleText = (article: (typeof helpArticles)[number]) =>
    [article.title, article.summary, ...article.blocks.map((block) => JSON.stringify(block))].join(' ').toLowerCase();

const filteredSections = computed<HelpSection[]>(() => {
    const q = query.value.toLowerCase();
    if (!q) return helpSections;
    return helpSections
        .map((section) => ({
            ...section,
            articles: section.title.toLowerCase().includes(q)
                ? section.articles
                : section.articles.filter((a) => articleText(a).includes(q)),
        }))
        .filter((section) => section.articles.length > 0);
});

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Content is static and escaped first, so the only markup that reaches v-html is <strong>.
const formatInline = (text: string) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const openArticle = (articleId: string) => {
    router.push({ name: 'help', params: { articleId } });
};

const zoom = (src: string, caption?: string) => {
    zoomed.value = { src, caption };
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') zoomed.value = null;
};

watch(
    () => activeArticle.value.id,
    async () => {
        await nextTick();
        pageRef.value?.scrollIntoView({ block: 'start' });
    },
);

onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
    // /help isn't store-scoped, so on a direct visit load stores to keep the
    // top nav's page links available while following a guide.
    if (storeContext.stores.length === 0) storeContext.fetchStores().catch(() => {});
});
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<style scoped>
.hc-page {
    --hc-text: #0f172a;
    --hc-muted: #64748b;
    --hc-accent: #0d9488;
    --hc-accent-dark: #0f766e;
    --hc-border: #e2e8f0;
    --hc-surface: #ffffff;
    --hc-bg: #f6f8f9;

    min-height: 100vh;
    background: var(--hc-bg);
    padding: 1rem 1.5rem 3rem;
    font-family: var(--app-font-sans);
    color: var(--hc-text);
}

.hc-shell {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.hc-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.hc-eyebrow {
    display: inline-flex;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(13, 148, 136, 0.1);
    color: var(--hc-accent);
    width: fit-content;
}

.hc-title {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.025em;
}

.hc-subtitle {
    margin: 0;
    color: var(--hc-muted);
    font-size: 0.82rem;
}

.hc-body {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
}

/* ── Table of contents ── */
.hc-toc {
    position: sticky;
    top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--hc-surface);
    border: 1px solid var(--hc-border);
    border-radius: 14px;
    padding: 0.75rem 0.5rem;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
}

.hc-search {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0.25rem 0.25rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--hc-border);
    border-radius: 8px;
    color: var(--hc-muted);
}

.hc-search:focus-within {
    border-color: var(--hc-accent);
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.hc-search input {
    border: none;
    outline: none;
    flex: 1;
    min-width: 0;
    font-size: 0.85rem;
    background: transparent;
    color: var(--hc-text);
}

.hc-toc-select {
    display: none;
}

.hc-toc-group {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.25rem 0;
}

.hc-toc-group + .hc-toc-group {
    border-top: 1px solid var(--hc-border);
    padding-top: 0.5rem;
}

.hc-toc-group-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    padding: 0.2rem 0.75rem 0.35rem;
}

.hc-toc-item {
    display: block;
    padding: 0.42rem 0.75rem;
    border-radius: 8px;
    font-size: 0.86rem;
    font-weight: 500;
    color: #475569;
    text-decoration: none;
}

.hc-toc-item:hover {
    background: #f1f5f9;
    color: var(--hc-text);
}

.hc-toc-item.is-active {
    background: rgba(13, 148, 136, 0.08);
    color: var(--hc-accent-dark);
    font-weight: 600;
}

.hc-toc-empty {
    margin: 0.5rem 0.75rem;
    font-size: 0.82rem;
    color: var(--hc-muted);
}

/* ── Article ── */
.hc-article {
    background: var(--hc-surface);
    border: 1px solid var(--hc-border);
    border-radius: 14px;
    padding: 1.75rem 2rem 1.5rem;
    min-width: 0;
    line-height: 1.6;
    font-size: 0.92rem;
    color: #334155;
}

.hc-breadcrumb {
    margin: 0 0 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--hc-accent);
}

.hc-article-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--hc-text);
}

.hc-article-summary {
    margin: 0.25rem 0 1.25rem;
    color: var(--hc-muted);
}

.hc-p {
    margin: 0 0 1rem;
}

.hc-h3 {
    margin: 1.5rem 0 0.6rem;
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--hc-text);
}

.hc-list {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
}

.hc-list li + li {
    margin-top: 0.3rem;
}

.hc-article :deep(strong) {
    color: var(--hc-text);
    font-weight: 600;
}

/* Steps */
.hc-steps {
    list-style: none;
    margin: 0 0 1.25rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
}

.hc-step {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 0.75rem;
}

.hc-step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--hc-accent);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.hc-step-text {
    margin: 0.15rem 0 0;
}

/* Screenshots */
.hc-figure {
    margin: 0.75rem 0 1rem;
}

.hc-figure-btn {
    display: block;
    width: 100%;
    padding: 0;
    border: 1px solid var(--hc-border);
    border-radius: 10px;
    overflow: hidden;
    background: #f8fafc;
    cursor: zoom-in;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.hc-figure-btn img {
    display: block;
    width: 100%;
    height: auto;
}

.hc-figure figcaption {
    margin-top: 0.4rem;
    font-size: 0.78rem;
    color: var(--hc-muted);
    text-align: center;
}

/* Field reference */
.hc-fields {
    margin: 0 0 1.25rem;
    border: 1px solid var(--hc-border);
    border-radius: 10px;
    overflow: hidden;
}

.hc-fields-title {
    margin: 0;
    padding: 0.55rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--hc-border);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--hc-muted);
}

.hc-fields dl {
    margin: 0;
}

.hc-field {
    display: grid;
    grid-template-columns: minmax(140px, 32%) minmax(0, 1fr);
    gap: 1rem;
    padding: 0.65rem 1rem;
}

.hc-field + .hc-field {
    border-top: 1px solid var(--hc-border);
}

.hc-field dt {
    font-weight: 600;
    color: var(--hc-text);
}

.hc-field dd {
    margin: 0;
}

/* Callouts */
.hc-callout {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
}

.hc-callout p {
    margin: 0;
}

.hc-callout--tip {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    color: #115e59;
}

.hc-callout--note {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e40af;
}

.hc-callout :deep(svg) {
    flex-shrink: 0;
    margin-top: 2px;
}

/* Prev / next */
.hc-pager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--hc-border);
}

.hc-pager-link {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--hc-border);
    border-radius: 10px;
    text-decoration: none;
}

.hc-pager-link:hover {
    border-color: var(--hc-accent);
}

.hc-pager-link--next {
    text-align: right;
    align-items: flex-end;
}

.hc-pager-dir {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    color: var(--hc-muted);
}

.hc-pager-title {
    font-weight: 600;
    color: var(--hc-accent-dark);
}

/* Zoomed screenshot */
.hc-zoom {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(15, 23, 42, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    cursor: zoom-out;
}

.hc-zoom img {
    max-width: 100%;
    max-height: calc(100vh - 6rem);
    border-radius: 8px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.hc-zoom p {
    margin: 0;
    color: #e2e8f0;
    font-size: 0.85rem;
}

@media (max-width: 900px) {
    .hc-body {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .hc-toc {
        position: static;
        max-height: none;
        padding: 0.6rem;
    }

    .hc-toc-list {
        display: none;
    }

    .hc-toc-select {
        display: block;
        width: 100%;
        padding: 0.55rem 0.6rem;
        border: 1px solid var(--hc-border);
        border-radius: 8px;
        font-size: 0.9rem;
        background: #fff;
        color: var(--hc-text);
    }

    .hc-search {
        margin: 0;
    }
}

@media (max-width: 600px) {
    .hc-page {
        padding: 0.75rem 1rem 6rem;
    }

    .hc-article {
        padding: 1.25rem 1rem;
    }

    .hc-field {
        grid-template-columns: 1fr;
        gap: 0.15rem;
    }

    .hc-pager {
        grid-template-columns: 1fr;
    }
}
</style>
