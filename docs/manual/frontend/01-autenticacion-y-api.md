# Manual — 01 Autenticación con Auth0, consumo de `/api/v1` y errores por `code`

Describe **cómo funciona lo construido** por la spec [`docs/specs/frontend/01-autenticacion-y-api.md`](../../specs/frontend/01-autenticacion-y-api.md). Las decisiones y sus motivos viven en la spec; acá solo el funcionamiento. Si este manual y el código se contradicen, gana el código.

Estado: se completa paso a paso. Último paso reflejado: **2**.

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/config.js` | Lee y valida las variables `VITE_` |
| `src/constants/errorCodes.js` | Catálogo de códigos de error y su tratamiento |
| `src/api/errors.js` | `ApiError`, `normalizeError`, `describeError` y `showApiError` |
| `src/auth/permissions.js` | `can` y `canAny` sobre una lista de permisos |
| `src/auth/safeReturnTo.js` | Valida la ruta de retorno después del login |
| `src/auth/routes.js` | Mapa único de rutas privadas y su permiso |

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

## 5. Errores de la API (`src/constants/errorCodes.js`, `src/api/errors.js`)

La API devuelve todo error como Problem Details (RFC 9457) con `status`, `title`, `code`, `traceId` y, solo en los 400 de validación, `errors` (campo → mensajes). El frontend **decide por `code`** y muestra el `title` tal cual: el backend es el único dueño del texto.

**Flujo.** `normalizeError(error)` convierte cualquier error en un `ApiError` (`status`, `code`, `message`, `errors`, `traceId`, `response`):

| Situación | `code` resultante | `message` |
|---|---|---|
| Respuesta con Problem Details (objeto con `code` string) | El de la API | `title`; si no hay, el mensaje propio del código; si no, el genérico |
| Respuesta que no es Problem Details (vacía, HTML de un proxy, JSON sin `code`) | `respuesta_invalida` | Propio |
| Sin respuesta | `sin_conexion` | Propio |
| Timeout de axios (`ECONNABORTED` o `ETIMEDOUT`) | `tiempo_agotado` | Propio |
| Error que no es de axios (fallo de código) | `null` (desconocido) | Genérico |

`response` conserva la respuesta original de axios, para que las pantallas que todavía leen `e.response.data` (Ocupaciones, Caja) no se rompan.

**Tratamiento.** `errorCodes.js` asigna a cada código uno de cuatro tratamientos; un código que no está en el catálogo es un aviso (la API puede sumar códigos sin avisar):

| Tratamiento | Códigos | Quién lo resuelve |
|---|---|---|
| `sesion` | `no_autenticado` | El cliente HTTP: reintento y, si falla, sesión perdida (paso 4) |
| `cuenta_bloqueada` | `usuario_no_registrado`, `usuario_inactivo`, `tenant_inactivo` | La pantalla de cuenta bloqueada (paso 4) |
| `campos` | `datos_invalidos` con `errors` | El formulario (todavía ninguno lo usa; `describeError` lo deja disponible en `fieldErrors`) |
| `aviso` | El resto, los propios y los desconocidos | `showApiError` con un toast |

- `describeError(error)` es la parte pura: devuelve `{ treatment, message, fieldErrors, error }`. `datos_invalidos` sin `errors` baja a `aviso`.
- `showApiError(error)` es el **único lugar que arma el aviso**: toast para `aviso` y `campos` (mientras ningún formulario muestre los errores por campo, se avisa con el `title`), nada para `sesion` y `cuenta_bloqueada` (los resuelve su pantalla), y el `traceId` de `error_interno` a la consola. Devuelve el `ApiError`.

## 6. Permisos y mapa de rutas (`src/auth/`)

- `permissions.js`: `can(permisos, permiso)` y `canAny(permisos, lista)`, funciones puras sobre la lista `permisos` de `/me`. Nunca se decide por rol (ARQ-4; lo bloquea el lint).
- `routes.js`: `PRIVATE_ROUTES` es la única tabla de rutas privadas (`path`, `label`, `permiso`). `accessibleRoutes(permisos)` las filtra en el orden del mapa; `initialRoute(permisos)` devuelve la primera o `null` (sin acceso a ninguna). El permiso de cada ruta sale de la matriz rol × recurso del backend. `/operaciones` se guarda con `alertas.ver` (P-FA4).
- `safeReturnTo.js` (en la spec, `rutaDeRetornoSegura`): acepta solo rutas internas (empiezan con `/`, no con `//` ni `/\`, sin caracteres de control) y devuelve `null` si no. Evita un open redirect con un `returnTo` manipulado.

Los tests de `routes` y `permissions` usan los permisos de cada rol copiados de `RolPermisos.cs` del backend (`test/unit/auth/rolePermissions.fixture.js`); si la matriz cambia, se actualiza ese archivo.
