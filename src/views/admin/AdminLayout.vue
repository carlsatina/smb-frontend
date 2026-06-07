<template>
    <div class="adm-wrap">
        <aside class="adm-sidebar">
            <div class="adm-sidebar-header">
                <span class="adm-logo">Platform Admin</span>
            </div>
            <nav class="adm-nav">
                <RouterLink class="adm-nav-item" :to="{ name: 'admin-dashboard' }" active-class="adm-nav-item--active">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2 10a8 8 0 1116 0A8 8 0 012 10zm8-5a1 1 0 00-1 1v4a1 1 0 00.293.707l2.5 2.5a1 1 0 001.414-1.414L11 9.586V6a1 1 0 00-1-1z"/></svg>
                    Dashboard
                </RouterLink>
                <RouterLink class="adm-nav-item" :to="{ name: 'admin-users' }" active-class="adm-nav-item--active">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                    Users
                </RouterLink>
                <RouterLink class="adm-nav-item" :to="{ name: 'admin-stores' }" active-class="adm-nav-item--active">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm2 0v12h8V4H6zm2 2h4v2H8V6zm0 4h4v2H8v-2z" clip-rule="evenodd"/></svg>
                    Stores
                </RouterLink>
            </nav>
            <div class="adm-sidebar-footer">
                <RouterLink class="adm-back-link" :to="{ name: 'stores' }">
                    ← Back to app
                </RouterLink>
            </div>
        </aside>
        <main class="adm-main">
            <RouterView />
        </main>
    </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<style scoped>
.adm-wrap {
    display: flex;
    min-height: 100vh;
    background: #f8fafc;
    font-family: 'Inter', sans-serif;
}

.adm-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #0f172a;
    display: flex;
    flex-direction: column;
    color: #cbd5e1;
}

.adm-sidebar-header {
    padding: 1.5rem 1.25rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.07);
}

.adm-logo {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f1f5f9;
}

.adm-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.adm-nav-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #94a3b8;
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
}

.adm-nav-item:hover {
    background: rgba(255,255,255,0.06);
    color: #f1f5f9;
}

.adm-nav-item--active {
    background: rgba(255,255,255,0.1);
    color: #f1f5f9;
}

.adm-sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255,255,255,0.07);
}

.adm-back-link {
    font-size: 0.8rem;
    color: #64748b;
    text-decoration: none;
    transition: color 0.12s;
}

.adm-back-link:hover {
    color: #94a3b8;
}

.adm-main {
    flex: 1;
    overflow: auto;
    padding: 2rem;
}
</style>
