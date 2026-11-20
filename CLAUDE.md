# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`parkingcontrol-front` is the React 19 + Vite 7 SPA for a parking-lot management system (UI text is in Spanish). It uses MUI 7 for components, `react-router-dom` 7 for routing, axios for HTTP, `react-hot-toast` for notifications and `@auth0/auth0-react` for login. It is plain JavaScript/JSX (no TypeScript). The backend is a separate .NET API under `/api/v1` (default `https://localhost:7076/api/v1`).

## Git: which repo, which branch

- The frontend git repo is rooted at this folder (`parkingcontrol-front/.git`). **Run git and npm only from here (or from a worktree of this repo), never from the parent `FrontParking/`**: `FrontParking/` lives inside another, unrelated git repo rooted at `C:\Users\Equipo\source\repos` (the "Portafolio" repo, which also has a `develop` branch), so git commands run there silently act on the wrong repo. `FrontParking/` itself only holds a stray `package.json` with `react-router-dom`; do not run `npm install` there.
- Integration branch: `develop` (created from `feature/front-auth`, which holds spec 01). Every spec branch starts from `develop` and returns with a PR to `develop`. `master` holds the pre-spec-01 state and is not touched until a release.
- Several Claude chats may work at the same time. Spec-writing chats use this folder; execution chats use their own `git worktree` (for example `../parkingcontrol-front-base` for spec 02) so a branch switch in one chat never changes another chat's files. A new worktree needs its own `.env` copy and `npm install`.
- Before creating a branch or worktree, confirm the base exists with `git branch -a` instead of assuming it.

Specs live in `docs/specs/` (index in `docs/specs/README.md`) and the per-spec technical manuals in `docs/manual/`. The auth/API design is spec `docs/specs/frontend/01-autenticacion-y-api.md`; how it works is in `docs/manual/frontend/01-autenticacion-y-api.md`.

## Commands

Run from this directory:

- `npm run dev` — Vite dev server (port 5173; use `http://localhost:5173`, not `127.0.0.1`: Auth0 and the API CORS only accept `localhost`)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm test` — Vitest, single run, `node` environment. Tests live in `test/unit/`, mirroring the `src/` path. Only pure logic is tested (errors, permissions, routes, return-path validation, config, the shared refresh promise); the Auth0 flow is verified by hand.
- `npm run preview` — serve the built bundle
- Docker: the `Dockerfile` runs the dev server (`npm run dev -- --host 0.0.0.0`) on port 5173; it is not a production image.

## Configuration

Four variables in `.env` (not versioned; template in `.env.example`), validated by [src/config.js](src/config.js), which fails naming the missing or invalid variable:

- `VITE_API_BASE_URL` — API base, must end in `/api/v1`
- `VITE_AUTH0_DOMAIN` — Auth0 tenant domain, without `https://`
- `VITE_AUTH0_CLIENT_ID` — SPA client id
- `VITE_AUTH0_AUDIENCE` — API identifier in Auth0

Every `VITE_` variable ends up in the browser bundle: none is secret, and the SPA has no client secret.

## Architecture

- **Auth** ([src/auth/](src/auth/)): Auth0 Authorization Code + PKCE. `AuthProvider` (inside `BrowserRouter`) configures the SDK with tokens **only in memory** (`cacheLocation="memory"`, rotating refresh tokens, no iframe fallback). A page reload loses the tokens, so `RequireAuth` redirects to Auth0 again (no password prompt while the Auth0 session lives). `/callback` handles the return; `onRedirectCallback` goes to `safeReturnTo(appState.returnTo)` or `/dashboard`. `/login` is a public page with an "Ingresar" button and a notice (`LOGIN_REASON`: expired session or Auth0 error); it never redirects to Auth0 by itself. Logout: `logout({ logoutParams: { returnTo: origin + "/login" } })`.
- **Never use `localStorage`/`sessionStorage`** (ARQ-1) and **never decide by role** (ARQ-4): both are ESLint errors in `src/`. The only exception is [src/auth/legacyCleanup.js](src/auth/legacyCleanup.js), which deletes the old login keys at startup.
- **`/me` and permissions**: `MeProvider` loads `GET /me` once per session (memory only; states `cargando`, `listo`, `bloqueado`, `error`). Use `usePermissions().can("recurso.accion")` / `canAny([...])` to show or hide actions; `useMe().me` has `nombre`, `email`, `rol` (display only), `permisos` and `tenant`. The frontend never sends a `TenantId`.
- **Routes and menu** come from one map, `PRIVATE_ROUTES` in [src/auth/routes.js](src/auth/routes.js) (`path`, `label`, `permiso`). Guard chain: `RequireAuth` → account loaded/not blocked → `Layout` → `RequirePermission` ("No tenés permiso" without redirect; "Sin acceso" if the user has no route at all). **Adding a private page**: create it in `src/pages/`, add an entry to `PRIVATE_ROUTES` with the permission from the backend role × resource matrix, and add the component to `PAGES` in [src/App.jsx](src/App.jsx); route, guard and menu item follow.
- **HTTP layer** ([src/api/http.js](src/api/http.js)): the single axios instance (`baseURL` from config, 20 s timeout, `ngrok-skip-browser-warning` header). The request interceptor gets the token through [src/api/authBridge.js](src/api/authBridge.js) (functions registered by `MeProvider`, so a non-React module can reach the Auth0 SDK). The response interceptor turns every error into an `ApiError`, retries a 401 `no_autenticado` **once** with a forcibly refreshed token (one shared refresh promise for concurrent requests, required by refresh token rotation), and reports blocked accounts (403 `usuario_no_registrado`, `usuario_inactivo`, `tenant_inactivo`) to show the full-screen `AccountBlocked` page.
- **Errors** ([src/api/errors.js](src/api/errors.js), [src/constants/errorCodes.js](src/constants/errorCodes.js)): the API returns Problem Details with a `code`; decide by `code`, show the API `title` as is. In a `catch`, call `showApiError(e)` (the only place that builds the toast). Frontend-only codes: `sin_conexion`, `tiempo_agotado`, `respuesta_invalida`.
- **API access**: `pagosApi.js`, `operationalAlertsApi.js` and `meApi.js` are wrapper modules, but most pages import `http` and call endpoints directly. New endpoints go in a wrapper module (see "API module pattern" below); when editing an older file, follow its existing style.
- **Pages** are large, self-contained components (state, fetching, filters and dialogs all inline). Backend enums are sent and received as integers and live in [src/constants/enums.js](src/constants/enums.js) (see "Dates, enums, pagination and API modules"). `pagosApi.js` is in function style since spec 08 and its temporary `@deprecated` `pagosApi` export was removed by spec 09 together with `CajaDiaria.jsx` (no screen calls `/Pagos/caja-diaria` any more). `Caja.jsx` (spec 09) replaces Caja diaria: sessions with open, close with count, reopen, history and the Monitor widget (route `/caja`, `/caja-diaria` redirects; pure logic in `src/utils/caja.js` and `cajaLink.js`, components in `src/componentes/caja/`; how it works: `docs/manual/frontend/09-caja.md`). `Ocupaciones.jsx` was rewritten by spec 07: it uses `showApiError` and the API modules and hides each action by permission (pure logic in `src/utils/ocupaciones.js`, dialogs in `src/componentes/ocupaciones/`; how it works: `docs/manual/frontend/07-ocupaciones.md`).
- **Monthly contracts** (spec 10): the "Contrato mensual" section of the occupation detail (`ContratoMensualSeccion`) offers price adjustment and scheduled termination by permission, and `Ocupaciones.jsx` has the bulk price adjustment dialog (`tarifas.editar`); pure logic in `src/utils/contratos.js`, how it works: `docs/manual/frontend/10-contratos-mensuales.md`.
- **Backend endpoints**: the single source is [docs/inventario/backend.md](docs/inventario/backend.md) (all under `/api/v1`). Do not copy the endpoint list here.

## Dates, enums, pagination and API modules

Common base from spec 02 (`docs/specs/frontend/02-base-comun.md`; how it works: `docs/manual/frontend/02-base-comun.md`). New screens use it instead of copying code.

- **Dates** ([src/utils/fechas.js](src/utils/fechas.js), pure; hook [src/utils/useTenantDates.js](src/utils/useTenantDates.js)). The tenant's time zone (`/me.tenant.zonaHoraria`) is the only zone: never the browser's or the system's. In a page, call `useTenantDates()` and use `localInputToInstant`, `formatInstant`, `today`, `dateRangeToInstants`, etc. Three date types: `UtcInstant` (ISO with `Z`; what is sent and received), `LocalInput` (`<input type="datetime-local">` value) and `DateOnly` (`yyyy-MM-dd`, `<input type="date">`). A `DateOnly` is never passed through `Date` (`new Date("2026-11-10")` is UTC midnight). `localInputToInstant` returns `{ ok, instant }` or `{ ok: false, code, message }`: show `toast.error(r.message)` and do not send. A nonexistent DST hour is an error; a repeated hour takes the first one. `MeProvider` rejects a missing or invalid zone (error state with "Reintentar"). `new Date().toISOString().slice(0, 10)` is "today in UTC": use `today()`.
- **Numbers and money** ([src/utils/formato.js](src/utils/formato.js)): `formatMoney` and `formatNumber` (`es-UY`, `UYU`); `null`, empty or non-numeric give `—`, never `$ 0,00`.
- **ESLint blocks `toLocaleString`, `toLocaleDateString` and `toLocaleTimeString` in `src/`** (also on numbers), except in `fechas.js`, `formato.js` and the pages listed in `eslint.config.js` as temporary exceptions, each with the spec that removes it. When a spec rewrites one of those pages, it removes that exception.
- **Enums** ([src/constants/enums.js](src/constants/enums.js)): the 15 backend enums plus the 2 string enums of Trazabilidad (`Fuente`, `AccionTrazabilidad`) with `defineEnum` (numeric or string values). Use `labelOf`, `colorOf`, `labelOfKey` (display only, never to decide: ARQ-4) and `optionsOf(E, { only, exclude, excludeCalculated, allLabel })` for selects. Retired backend values are not declared. Do not add local label maps in pages.
- **Pagination** ([src/utils/paginacion.js](src/utils/paginacion.js), [src/utils/usePagination.js](src/utils/usePagination.js)): the backend `page` starts at 1, MUI `TablePagination` at 0. Use `normalizePaged` on the response, `usePagination` for the state (`reset` when filters change, `fit(total)` after deleting) and `toTablePaginationProps` for the component. `Clientes.jsx` keeps its own pagination.
- **API module pattern** (`src/api/<resource>Api.js`, named after the backend controller): named `async` functions, one per endpoint, that return `data` (not the axios response); paged lists go through `normalizePaged`; use the `http` instance and do not catch errors (the page calls `showApiError`); they do not convert dates or enums (they receive `UtcInstant`, `DateOnly` and integers); query parameters go in `params` filtered with `cleanParams` from [src/api/params.js](src/api/params.js) (drops `undefined`, `null` and `""`, keeps `false` and `0`). `http` serializes arrays as `fuente=A&fuente=B` (`PARAMS_SERIALIZER`). JSDoc types come from `docs/inventario/backend.md`. `pagosApi.js` follows this pattern since spec 08 and `cajaApi.js` since spec 09; neither keeps a legacy export.

## Trazabilidad (spec 04)

`/trazabilidad` (menu "Trazabilidad", permission `auditoria.ver`) replaces Auditoría; `/auditoria` redirects to it. How it works: `docs/manual/frontend/04-trazabilidad.md`.

- **Deep-link contract.** Other screens link to it with `buildTrazabilidadPath({ ocupacionId, pagoId, cajaSesionId, usuarioId, fuente, desde, hasta })` from [src/utils/trazabilidadLink.js](src/utils/trazabilidadLink.js) (never a hand-built string), e.g. `/trazabilidad?ocupacionId=12`. Show the link only if `can("auditoria.ver")`. `desde`/`hasta` are `DateOnly` in the tenant zone and go together; with an id the screen opens without a range, otherwise with the last 7 days. The applied filters live in the URL.
- Pure logic in `src/utils/trazabilidad{Link,Filtros,Evento}.js`; API in `src/api/trazabilidadApi.js` and `src/api/usuariosApi.js` (`listUsuarios` only; spec 12 adds the rest to the same file). Always normalize backend `fuente`/`accion` with `canonicalKey` before `labelOf`/`colorOf` (the backend sends `Finalizar`).

## Tema y estilos (spec 13)

How it works: `docs/manual/frontend/13-diseno.md`.

- The theme is `getTheme(mode)` in [src/theme/theme.js](src/theme/theme.js) (`createTheme`, light and dark): palette, `palette.pc` (what MUI lacks: side menu, shadows, status `tone`s), radii (`RADIUS`, `FIELD_RADIUS`, `BUTTON_RADIUS`) and `components` overrides. `createTheme` lives only there.
- There is **one** `ThemeProvider`, in `main.jsx` through `ThemeRoot` (it also holds the color mode, in memory only, and the `Toaster`). Do not add another.
- **No loose colors, radii or shadows in pages or components**: no `#hex`, `rgba(`, `boxShadow` or `borderRadius` outside `src/theme/`. An `sx` stays only for layout (grid, width, alignment); colors come from the theme (`palette`, `palette.pc.tone`). To add a color, see the manual.
- Chips take their color from `colorOf` (enums) and the theme paints it; no local color maps in pages. Dialogs use `useDialogFullScreen` (`fullScreen` below `sm`); confirmations use `ConfirmDialog`, never `window.confirm`.
