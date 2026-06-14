# Frontend — Sales & Inventory

Vue 3 + Vite single-page app for the Sales & Inventory platform. Talks to the
Express/Prisma backend (see `../backend`). Requires **Node.js >= 22**.

For the project overview and full-stack setup, see the [root README](../README.md).

## Setup

```bash
npm install
cp .env.example .env   # configure the backend URL (see below)
```

## Commands

```bash
npm run dev        # Vite dev server with hot reload (default http://localhost:5173)
npm run build      # production build
npm run preview    # preview the production build
npm run test       # unit tests (Vitest)
npm run test:watch # tests in watch mode

vitest run tests/app.test.ts   # run a single test file
```

## Environment variables

Defined in `.env` (see `.env.example`):

| Variable | Description |
| --- | --- |
| `VITE_BACKEND_API` | Base URL of the backend API, e.g. `http://localhost:9000/api/v1`. |
| `VITE_CSRF_COOKIE_NAME` | Name of the CSRF cookie, must match the backend's `CSRF_COOKIE_NAME`. |

## Project structure

```
src/
├── api/        Typed fetch wrappers (client.ts handles auth & token refresh)
├── stores/     Pinia state (storeContext, userContext, …)
├── views/      Page components grouped by feature
│               (Products, Inventory, Sales, PurchaseOrders, Reports, Stores, Account, admin, …)
├── components/ Shared components (modals, CSV menus, etc.)
├── composables/  Reusable composition functions (e.g. useToast)
├── router/     Route definitions with role-based guards
└── utils/      Helpers (roleAccess, planAccess, …)
```

## Conventions

- 4-space indentation, single quotes for imports.
- Vue components: `PascalCase`; helper functions: `camelCase`.
- Access control is checked via `utils/roleAccess` (roles) and `utils/planAccess` (plan features).

## Configuration reference

See the [Vite Configuration Reference](https://vite.dev/config/).
