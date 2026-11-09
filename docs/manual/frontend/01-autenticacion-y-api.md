# Manual — 01 Autenticación con Auth0, consumo de `/api/v1` y errores por `code`

Describe **cómo funciona lo construido** por la spec [`docs/specs/frontend/01-autenticacion-y-api.md`](../../specs/frontend/01-autenticacion-y-api.md). Las decisiones y sus motivos viven en la spec; acá solo el funcionamiento. Si este manual y el código se contradicen, gana el código.

Estado: se completa paso a paso. Último paso reflejado: **1**.

## 1. Configuración (`src/config.js`)

El frontend lee cuatro variables `VITE_` del `.env` (plantilla en `.env.example`):

| Variable | Qué es | Validación |
|---|---|---|
| `VITE_API_BASE_URL` | Base de la API | Obligatoria; debe terminar en `/api/v1` (una barra final se ignora) |
| `VITE_AUTH0_DOMAIN` | Dominio del tenant de Auth0 | Obligatoria; solo el dominio, sin `https://` ni rutas |
| `VITE_AUTH0_CLIENT_ID` | Client id de la SPA en Auth0 | Obligatoria |
| `VITE_AUTH0_AUDIENCE` | Identificador de la API en Auth0 | Obligatoria |

- `validateConfig(env)` es una función pura: recibe el objeto de variables y devuelve `{ apiBaseUrl, auth0: { domain, clientId, audience } }`, o lanza un `Error` cuyo mensaje **nombra la variable** que falta o es inválida. Se prueba en `test/unit/config.test.js` sin depender del `.env` local.
- `getConfig()` valida `import.meta.env` la primera vez que se la llama y guarda el resultado. Los módulos que necesitan configuración llaman a `getConfig()` en lugar de leer `import.meta.env` directamente, así la validación ocurre en un solo lugar.
- Toda variable `VITE_` queda en el bundle del navegador: ninguna es secreta. La SPA es un cliente público de Auth0 y no tiene client secret.

## 2. Pruebas (Vitest)

- `npm test` corre `vitest run` (una pasada, sin modo watch) con entorno `node`: sin navegador, sin DOM y sin Auth0.
- Los tests viven en `test/unit/`, con la misma ruta relativa que el archivo de `src/` que prueban (`src/config.js` → `test/unit/config.test.js`).
- Solo se prueba lógica pura. El flujo de login contra Auth0 se verifica a mano (sección 7 de la spec).

## 3. Reglas de ESLint (`eslint.config.js`)

Dos garantías de arquitectura se bloquean con lint, no solo con documentación. Aplican a `src/**`:

| Regla | Qué prohíbe | Por qué |
|---|---|---|
| `no-restricted-globals` y `no-restricted-properties` | `localStorage`, `sessionStorage`, `window.localStorage`, `window.sessionStorage` | ARQ-1: la sesión vive solo en memoria |
| `no-restricted-syntax` | Comparar con `==`/`===`/`!=`/`!==` una propiedad o variable `rol`, `role` o `userRole`, o usarla como discriminante de un `switch` | ARQ-4: la UI decide por permisos, nunca por rol |

Excepciones temporales (bloques finales de `eslint.config.js`):
- `App.jsx`, `Login.jsx`, `Splash.jsx`, `componentes/RequireAuth.jsx` y `api/http.js` todavía usan `localStorage`. Se retiran al reescribirlos (pasos 3 y 4).
- `pages/CajaDiaria.jsx` tiene `no-unused-vars` apagado por un error previo que esta spec no toca (P-FA12). Se retira con la spec de dinero.

## 4. Variables de entorno y git

El `.env` no se versiona (está en `.gitignore`); la plantilla versionada es `.env.example`. Cada desarrollador copia la plantilla y completa los valores.
