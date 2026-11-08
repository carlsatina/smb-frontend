<template>
    <div class="mcp">
        <!-- What the AI can reach -->
        <div class="mcp-scope">
            <div class="mcp-scope-col">
                <span class="mcp-scope-title mcp-scope-title--yes">
                    <mdicon name="check-circle-outline" size="16" /> AI apps can access
                </span>
                <ul>
                    <li>Store settings <em>(read-only)</em></li>
                    <li>Ingredients</li>
                    <li>Products &amp; channel prices</li>
                    <li>Recipes</li>
                </ul>
            </div>
            <div class="mcp-scope-col">
                <span class="mcp-scope-title mcp-scope-title--no">
                    <mdicon name="close-circle-outline" size="16" /> Never shared
                </span>
                <ul>
                    <li>Sales &amp; payments</li>
                    <li>Team members &amp; invites</li>
                    <li>Stock levels, expenses &amp; reports</li>
                    <li>Your AI API key and billing</li>
                </ul>
            </div>
        </div>

        <!-- Server URL -->
        <div class="mcp-url">
            <span class="mcp-label">Server URL</span>
            <div class="mcp-copy-row">
                <code>{{ serverUrl }}</code>
                <button type="button" class="st-btn-ghost" @click="copy(serverUrl, 'Server URL copied.')">Copy</button>
            </div>
        </div>

        <!-- New token, shown once -->
        <div v-if="newSecret" class="mcp-secret">
            <div class="mcp-secret-head">
                <mdicon name="key-alert-outline" size="18" />
                <div>
                    <strong>Copy your token now.</strong>
                    You won't be able to see it again. Treat it like a password.
                </div>
            </div>
            <div class="mcp-copy-row">
                <code class="mcp-secret-value">{{ newSecret }}</code>
                <button type="button" class="st-btn-primary" @click="copy(newSecret, 'Token copied.')">Copy token</button>
            </div>
        </div>

        <!-- Setup snippets -->
        <div class="mcp-setup">
            <span class="mcp-label">Connect an AI app</span>
            <div class="mcp-tabs" role="tablist">
                <button
                    v-for="client in clients"
                    :key="client.key"
                    type="button"
                    role="tab"
                    class="mcp-tab"
                    :class="{ 'is-active': activeClient === client.key }"
                    :aria-selected="activeClient === client.key"
                    @click="activeClient = client.key"
                >{{ client.label }}</button>
            </div>
            <p class="mcp-setup-hint">{{ currentClient.hint }}</p>
            <div class="mcp-snippet">
                <div class="mcp-snippet-bar">
                    <span class="mcp-snippet-file">
                        <mdicon :name="currentClient.icon" size="14" />
                        {{ currentClient.file }}
                    </span>
                    <button type="button" class="mcp-snippet-copy" :class="{ 'is-copied': copiedKey === currentClient.key }" @click="copySnippet">
                        <mdicon :name="copiedKey === currentClient.key ? 'check' : 'content-copy'" size="14" />
                        {{ copiedKey === currentClient.key ? 'Copied' : 'Copy' }}
                    </button>
                </div>
                <pre><code>{{ currentClient.snippet }}</code></pre>
            </div>
            <p v-if="!newSecret" class="mcp-setup-hint">Replace <code>YOUR_TOKEN</code> with a token you created below.</p>
        </div>

        <!-- Create -->
        <form class="mcp-create" @submit.prevent="create">
            <span class="mcp-label">Create a token</span>
            <div class="mcp-create-grid">
                <label class="st-field">
                    Name
                    <input v-model.trim="form.name" type="text" maxlength="60" placeholder="e.g. Claude on my laptop" required />
                </label>
                <div class="st-field">
                    Access
                    <div class="mcp-access">
                        <label class="mcp-access-option" :class="{ 'is-active': form.access === 'READ_ONLY' }">
                            <input v-model="form.access" type="radio" value="READ_ONLY" />
                            <span>
                                <strong>Read-only</strong>
                                <small>Look up and analyze. Can't change anything.</small>
                            </span>
                        </label>
                        <label class="mcp-access-option" :class="{ 'is-active': form.access === 'READ_WRITE' }">
                            <input v-model="form.access" type="radio" value="READ_WRITE" />
                            <span>
                                <strong>Read &amp; write</strong>
                                <small>Can also add and edit ingredients, products and recipes.</small>
                            </span>
                        </label>
                    </div>
                </div>
            </div>
            <div v-if="ownedStores.length > 1" class="st-field mcp-stores-field">
                Stores
                <div class="mcp-stores">
                    <label
                        v-for="store in ownedStores"
                        :key="store.id"
                        class="mcp-store-option"
                        :class="{ 'is-active': form.storeIds.includes(store.id) }"
                    >
                        <input v-model="form.storeIds" type="checkbox" :value="store.id" />
                        <span>{{ store.name }}</span>
                        <small v-if="store.storeType === 'WAREHOUSE'">Warehouse</small>
                    </label>
                </div>
                <span class="mcp-stores-hint">
                    One connection covers every store you tick. Only stores you own are listed.
                    <button type="button" class="mcp-link" @click="toggleAllStores">
                        {{ form.storeIds.length === ownedStores.length ? 'Only this store' : 'Select all' }}
                    </button>
                </span>
            </div>
            <p v-else class="mcp-stores-hint">This token will cover <strong>{{ ownedStores[0]?.name }}</strong>.</p>
            <p v-if="form.access === 'READ_WRITE'" class="mcp-warn">
                <mdicon name="alert-outline" size="15" />
                Changes made by the AI go live in the POS immediately (for example a new price). Each one is recorded in the Audit Log.
            </p>
            <div class="mcp-create-actions">
                <button type="submit" class="st-btn-primary" :disabled="isCreating || !form.name || form.storeIds.length === 0">
                    {{ isCreating ? 'Creating…' : 'Create token' }}
                </button>
            </div>
        </form>

        <!-- Existing tokens -->
        <div class="mcp-list">
            <span class="mcp-label">Your tokens</span>
            <div v-if="isLoading" class="mcp-empty">Loading…</div>
            <div v-else-if="tokens.length === 0" class="mcp-empty">No tokens yet. AI apps can't connect until you create one.</div>
            <div v-for="token in tokens" v-else :key="token.id" class="mcp-token">
                <div class="mcp-token-main">
                    <div class="mcp-token-name">
                        {{ token.name }}
                        <span class="mcp-badge" :class="token.access === 'READ_WRITE' ? 'mcp-badge--write' : 'mcp-badge--read'">
                            {{ token.access === 'READ_WRITE' ? 'Read & write' : 'Read-only' }}
                        </span>
                    </div>
                    <div class="mcp-token-stores">
                        <span v-for="store in token.stores" :key="store.id" class="mcp-store-chip">
                            <mdicon name="store-outline" size="12" /> {{ store.name }}
                        </span>
                        <span v-if="token.stores.length === 0" class="mcp-store-chip mcp-store-chip--none">No stores left</span>
                    </div>
                    <div class="mcp-token-meta">
                        <code>{{ token.tokenPrefix }}…</code>
                        · Created {{ formatDate(token.createdAt) }}
                        · {{ token.lastUsedAt ? `Last used ${formatDate(token.lastUsedAt)}` : 'Never used' }}
                    </div>
                </div>
                <button type="button" class="st-btn-ghost mcp-revoke" :disabled="revokingId === token.id" @click="askRevoke(token)">
                    {{ revokingId === token.id ? 'Revoking…' : 'Revoke' }}
                </button>
            </div>
        </div>

        <ConfirmModal
            :show="Boolean(pendingRevoke)"
            title="Revoke token"
            :message="`AI apps using “${pendingRevoke?.name}” will lose access to ${pendingRevoke?.stores.length === 1 ? pendingRevoke?.stores[0].name : `${pendingRevoke?.stores.length} stores`} immediately. This can't be undone.`"
            confirm-text="Revoke"
            variant="danger"
            :loading="Boolean(revokingId)"
            @confirm="confirmRevoke"
            @cancel="pendingRevoke = null"
            @update:show="(v: boolean) => { if (!v) pendingRevoke = null; }"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { useToast } from '@/composables/useToast';
import { useStoreContextStore } from '@/stores/storeContext';
import {
    createMcpToken,
    listMcpTokens,
    mcpServerUrl,
    revokeMcpToken,
    type McpToken,
    type McpTokenAccess,
} from '@/api/mcpTokens';

// storeId is the store whose settings are open; it's pre-ticked on new tokens.
const props = defineProps<{ storeId: string }>();
const { showToast } = useToast();
const storeContext = useStoreContextStore();

const ownedStores = computed(() => storeContext.stores.filter((store) => store.role === 'OWNER'));

const serverUrl = mcpServerUrl();
const tokens = ref<McpToken[]>([]);
const isLoading = ref(false);
const isCreating = ref(false);
const revokingId = ref<string | null>(null);
const pendingRevoke = ref<McpToken | null>(null);
const newSecret = ref<string | null>(null);
const form = reactive({ name: '', access: 'READ_ONLY' as McpTokenAccess, storeIds: [props.storeId] as string[] });
const copiedKey = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const toggleAllStores = () => {
    form.storeIds = form.storeIds.length === ownedStores.value.length ? [props.storeId] : ownedStores.value.map((s) => s.id);
};

type ClientKey = 'claude-code' | 'claude-desktop' | 'cursor' | 'other';
const activeClient = ref<ClientKey>('claude-desktop');

const errorMessage = (error: unknown, fallback: string) =>
    (error as { body?: { error?: { message?: string } } })?.body?.error?.message || fallback;

const clients = computed(() => {
    const token = newSecret.value || 'YOUR_TOKEN';
    const json = (value: unknown) => JSON.stringify(value, null, 2);
    return [
        {
            key: 'claude-desktop' as const,
            label: 'Claude Desktop',
            file: 'claude_desktop_config.json',
            icon: 'code-json',
            hint: 'Settings → Developer → Edit Config, add this to claude_desktop_config.json, then restart Claude. Requires Node.js.',
            snippet: json({
                mcpServers: {
                    'smb-pos': {
                        command: 'npx',
                        args: ['-y', 'mcp-remote', serverUrl, '--header', 'Authorization:${AUTH_HEADER}'],
                        env: { AUTH_HEADER: `Bearer ${token}` },
                    },
                },
            }),
        },
        {
            key: 'claude-code' as const,
            label: 'Claude Code',
            file: 'Terminal',
            icon: 'console',
            hint: 'Run this in your terminal.',
            snippet: `claude mcp add --transport http smb-pos ${serverUrl} --header "Authorization: Bearer ${token}"`,
        },
        {
            key: 'cursor' as const,
            label: 'Cursor',
            file: '~/.cursor/mcp.json',
            icon: 'code-json',
            hint: 'Add this to ~/.cursor/mcp.json (or Settings → MCP → Add new server).',
            snippet: json({
                mcpServers: {
                    'smb-pos': { url: serverUrl, headers: { Authorization: `Bearer ${token}` } },
                },
            }),
        },
        {
            key: 'other' as const,
            label: 'Other apps',
            file: 'Connection details',
            icon: 'link-variant',
            hint: 'Any MCP client that supports Streamable HTTP with a custom header. ChatGPT and claude.ai web connectors need OAuth sign-in and are not supported yet.',
            snippet: `URL:    ${serverUrl}\nHeader: Authorization: Bearer ${token}`,
        },
    ];
});
const currentClient = computed(() => clients.value.find((c) => c.key === activeClient.value) ?? clients.value[0]);

const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const copy = async (text: string, message: string) => {
    try {
        await navigator.clipboard.writeText(text);
        showToast(message, 'success');
    } catch {
        showToast('Copy failed. Select the text and copy it manually.', 'error');
    }
};

const copySnippet = async () => {
    const { key, snippet } = currentClient.value;
    try {
        await navigator.clipboard.writeText(snippet);
        copiedKey.value = key;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => (copiedKey.value = null), 2000);
    } catch {
        showToast('Copy failed. Select the text and copy it manually.', 'error');
    }
};

const load = async () => {
    isLoading.value = true;
    try {
        tokens.value = (await listMcpTokens()).tokens;
    } catch (error) {
        showToast(errorMessage(error, 'Could not load tokens.'), 'error');
    } finally {
        isLoading.value = false;
    }
};

const create = async () => {
    if (!form.name) return;
    isCreating.value = true;
    try {
        const { token, secret } = await createMcpToken({ name: form.name, access: form.access, storeIds: form.storeIds });
        tokens.value = [token, ...tokens.value];
        newSecret.value = secret;
        form.name = '';
        form.access = 'READ_ONLY';
        form.storeIds = [props.storeId];
    } catch (error) {
        showToast(errorMessage(error, 'Could not create the token.'), 'error');
    } finally {
        isCreating.value = false;
    }
};

const askRevoke = (token: McpToken) => {
    pendingRevoke.value = token;
};

const confirmRevoke = async () => {
    const token = pendingRevoke.value;
    if (!token) return;
    revokingId.value = token.id;
    try {
        await revokeMcpToken(token.id);
        tokens.value = tokens.value.filter((t) => t.id !== token.id);
        showToast(`“${token.name}” revoked.`, 'success');
        pendingRevoke.value = null;
    } catch (error) {
        showToast(errorMessage(error, 'Could not revoke the token.'), 'error');
    } finally {
        revokingId.value = null;
    }
};

// Tokens are per account, so switching stores only resets the form.
watch(
    () => props.storeId,
    (storeId) => {
        newSecret.value = null;
        form.storeIds = [storeId];
    },
);
onMounted(load);
</script>

<style scoped>
.mcp {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.mcp-label {
    display: block;
    margin-bottom: 0.45rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.mcp-scope {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--c-border);
    border-radius: 10px;
    background: #f8fafc;
}

.mcp-scope ul {
    margin: 0.4rem 0 0;
    padding-left: 1.4rem;
    font-size: 0.85rem;
    color: #334155;
    line-height: 1.6;
}

.mcp-scope em {
    color: var(--c-muted);
    font-style: normal;
}

.mcp-scope-title {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
}

.mcp-scope-title--yes { color: #0f766e; }
.mcp-scope-title--no { color: #b91c1c; }

.mcp-copy-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.mcp-copy-row code {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    background: #fff;
    font-size: 0.82rem;
    overflow-x: auto;
    white-space: nowrap;
}

.mcp-secret {
    padding: 0.9rem 1rem;
    border: 1px solid #fcd34d;
    border-radius: 10px;
    background: #fffbeb;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}

.mcp-secret-head {
    display: flex;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #92400e;
}

.mcp-secret-value {
    font-weight: 600;
}

.mcp-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
}

.mcp-tab {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--c-border);
    border-radius: 999px;
    background: #fff;
    font-size: 0.8rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
}

.mcp-tab.is-active {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.08);
    color: var(--c-accent-dark);
    font-weight: 600;
}

.mcp-setup-hint {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--c-muted);
}

.mcp-snippet {
    margin-bottom: 0.5rem;
    border-radius: 10px;
    overflow: hidden;
    background: #0f172a;
}

.mcp-snippet-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.4rem 0.5rem 0.4rem 0.9rem;
    background: #1e293b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mcp-snippet-file {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mcp-snippet-copy {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
    padding: 0.25rem 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: transparent;
    font-size: 0.75rem;
    font-weight: 600;
    color: #e2e8f0;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.mcp-snippet-copy:hover {
    background: rgba(255, 255, 255, 0.08);
}

.mcp-snippet-copy.is-copied {
    border-color: rgba(45, 212, 191, 0.5);
    color: #5eead4;
}

.mcp-snippet pre {
    margin: 0;
    padding: 0.85rem 0.9rem;
    color: #e2e8f0;
    font-size: 0.78rem;
    line-height: 1.6;
    /* Wrap long one-line commands so the whole token stays visible. */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.mcp-snippet pre code {
    color: inherit;
    background: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.mcp-create {
    padding-top: 1.1rem;
    border-top: 1px solid var(--c-border);
}

.mcp-create-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 1rem;
}

.mcp-access {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    text-transform: none;
    letter-spacing: 0;
}

.mcp-access-option {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    cursor: pointer;
    background: #fff;
}

.mcp-access-option.is-active {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.06);
}

.mcp-access-option input {
    margin-top: 0.2rem;
}

.mcp-access-option strong {
    display: block;
    font-size: 0.85rem;
    color: var(--c-text);
}

.mcp-access-option small {
    display: block;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--c-muted);
}

.mcp-stores-field {
    margin-top: 1rem;
}

.mcp-stores {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    text-transform: none;
    letter-spacing: 0;
}

.mcp-store-option {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    background: #fff;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--c-text);
    cursor: pointer;
}

.mcp-store-option.is-active {
    border-color: var(--c-accent);
    background: rgba(13, 148, 136, 0.06);
}

.mcp-store-option small {
    font-size: 0.7rem;
    color: var(--c-muted);
}

.mcp-stores-hint {
    display: block;
    margin: 0.45rem 0 0;
    font-size: 0.78rem;
    font-weight: 400;
    color: var(--c-muted);
    text-transform: none;
    letter-spacing: 0;
}

.mcp-link {
    margin-left: 0.25rem;
    padding: 0;
    border: none;
    background: none;
    font-size: inherit;
    font-weight: 600;
    color: var(--c-accent-dark);
    cursor: pointer;
}

.mcp-token-stores {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.3rem;
}

.mcp-store-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1rem 0.5rem;
    border-radius: 6px;
    background: #f1f5f9;
    font-size: 0.75rem;
    color: #334155;
}

.mcp-store-chip--none {
    background: #fef2f2;
    color: #b91c1c;
}

.mcp-warn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    color: #b45309;
}

.mcp-create-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
}

.mcp-list {
    padding-top: 1.1rem;
    border-top: 1px solid var(--c-border);
}

.mcp-empty {
    padding: 0.9rem;
    border: 1px dashed var(--c-border);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--c-muted);
    text-align: center;
}

.mcp-token {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.7rem 0;
}

.mcp-token + .mcp-token {
    border-top: 1px solid var(--c-border);
}

.mcp-token-main {
    min-width: 0;
}

.mcp-token-name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--c-text);
}

.mcp-token-meta {
    margin-top: 0.15rem;
    font-size: 0.78rem;
    color: var(--c-muted);
}

.mcp-badge {
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
}

.mcp-badge--read { background: #e0f2fe; color: #075985; }
.mcp-badge--write { background: #fef3c7; color: #92400e; }

.mcp-revoke {
    color: #b91c1c;
}

@media (max-width: 760px) {
    .mcp-scope,
    .mcp-create-grid,
    .mcp-access {
        grid-template-columns: 1fr;
    }

    .mcp-token {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
