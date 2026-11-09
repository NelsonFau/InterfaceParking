# Manual — 01 Autenticación con Auth0, consumo de `/api/v1` y errores por `code`

Describe **cómo funciona lo construido** por la spec [`docs/specs/frontend/01-autenticacion-y-api.md`](../../specs/frontend/01-autenticacion-y-api.md). Las decisiones y sus motivos viven en la spec; acá solo el funcionamiento. Si este manual y el código se contradicen, gana el código.

Estado: se completa paso a paso. Último paso reflejado: **5**.

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/config.js` | Lee y valida las variables `VITE_` |
| `src/constants/errorCodes.js` | Catálogo de códigos de error y su tratamiento |
| `src/api/errors.js` | `ApiError`, `normalizeError`, `describeError` y `showApiError` |
| `src/auth/permissions.js` | `can` y `canAny` sobre una lista de permisos |
| `src/auth/safeReturnTo.js` | Valida la ruta de retorno después del login |
| `src/auth/routes.js` | Mapa único de rutas privadas y su permiso |
| `src/auth/AuthProvider.jsx` | Configura `Auth0Provider` y la vuelta del login |
| `src/auth/RequireAuth.jsx` | Guarda de autenticación de las rutas privadas |
| `src/pages/Callback.jsx` | Ruta `/callback`: "Ingresando…" o error de Auth0 |
| `src/pages/Login.jsx` | Botón "Ingresar" y aviso según el motivo |
| `src/api/authBridge.js` | Puente entre `http.js` y el SDK; `sharePromise` |
| `src/api/http.js` | Cliente axios único: token, timeout, reintento ante 401 y errores normalizados |
| `src/api/meApi.js` | `GET /me` |
| `src/auth/MeProvider.jsx` | Carga `/me` una vez por sesión y registra el puente |
| `src/auth/usePermissions.js` | Contexto de `/me`, `useMe()` y `usePermissions()` |
| `src/pages/AccountBlocked.jsx` | Pantalla completa de cuenta bloqueada |
| `src/auth/RequirePermission.jsx` | Guarda por permiso de cada ruta privada |
| `src/auth/Forbidden.jsx` | "No tenés permiso" |
| `src/pages/NoAccess.jsx` | "Sin acceso" (ninguna ruta permitida) |

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
- Las de `App.jsx`, `Login.jsx`, `Splash.jsx` y `componentes/RequireAuth.jsx` se retiraron en el paso 3, y la de `api/http.js` en el paso 4: ya no queda ninguna por `localStorage`.
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

## 7. Inicio y cierre de sesión con Auth0 (`src/auth/`, `src/pages/`)

**Librería.** `@auth0/auth0-react` (Authorization Code + PKCE; la SPA es un cliente público, sin secretos). `main.jsx` arma el árbol `StrictMode > BrowserRouter > AuthProvider > App`: `AuthProvider` va dentro del router para poder navegar al volver de Auth0.

**Dónde vive el token.** `AuthProvider.jsx` configura el SDK con `cacheLocation="memory"`, `useRefreshTokens` y `useRefreshTokensFallback={false}`: access y refresh token solo en la memoria del SDK, renovación con refresh token rotativo y **sin iframe** (que dependería de cookies de terceros). El SDK sí guarda una cookie propia, `auth0.<clientId>.is.authenticated`, que solo indica que hubo sesión y no contiene tokens. Nada se escribe en `localStorage`.

**Recorrido de un login.**
1. El usuario entra a una ruta privada. `RequireAuth` espera a que el SDK termine de inicializar (`isLoading`).
2. Sin sesión y sin error, llama **una sola vez** (un `ref` lo garantiza, también con el doble montaje de StrictMode) a `loginWithRedirect({ appState: { returnTo } })`, con la ruta actual completa (path, query y hash).
3. Auth0 autentica y vuelve a `/callback?code=…&state=…` (`redirect_uri` = `origin + "/callback"`).
4. `Auth0Provider` detecta el código, lo canjea (una sola vez) y llama a `onRedirectCallback(appState)`, que navega a `safeReturnTo(appState.returnTo)` o a `/dashboard` si la ruta no es interna. Mientras tanto `Callback.jsx` muestra "Ingresando…".

**Recarga.** La memoria se pierde: el SDK no tiene refresh token, falla con `missing_refresh_token` sin probar el iframe y queda sin sesión. `RequireAuth` vuelve a redirigir a Auth0, que tiene su propia sesión y devuelve un código sin pedir la clave. Se ve como un redirect rápido.

**Errores de Auth0.** Si Auth0 vuelve con `?error=…` (por ejemplo, usuario bloqueado), el SDK no llama a `onRedirectCallback` y deja el error en `useAuth0().error`. `Callback` y `RequireAuth` navegan a `/login` con `state = { reason: "auth0_error", message }` y **no** vuelven a redirigir: así una configuración rota no entra en bucle.

**`/login`.** Pantalla pública con el botón "Ingresar" (`loginWithRedirect` sin `returnTo`: vuelve a `/dashboard`). El aviso sale del `state` de la navegación (`LOGIN_REASON` en `errorCodes.js`): `sesion_vencida` → "Tu sesión venció"; `auth0_error` → el mensaje de Auth0. Si ya hay sesión y no hay motivo, redirige a `/dashboard`.

**Splash (`/`).** Muestra el logo al menos 1,8 s y, cuando el SDK terminó de inicializar, va a `/dashboard` o a `/login`.

**Logout.** El botón "Salir" de la barra (`Layout.jsx`) llama a `logout({ logoutParams: { returnTo: origin + "/login" } })`: el SDK limpia su memoria, Auth0 cierra su sesión y vuelve a `/login`. La siguiente entrada a una ruta privada pide la clave.

## 8. Cliente HTTP y puente al token (`src/api/http.js`, `src/api/authBridge.js`)

**Un solo cliente.** Toda llamada a la API pasa por la instancia `http` (axios) con `baseURL` = `VITE_API_BASE_URL` (termina en `/api/v1`, así que las pantallas usan rutas como `/Cliente`), timeout de 20 s y el header `ngrok-skip-browser-warning` (P-FA5). El frontend nunca manda un `TenantId`: el backend lo saca del token.

**Puente.** `http.js` no es React y no puede usar `useAuth0()`. `authBridge.js` guarda cuatro funciones que registra `MeProvider` (hijo de `AuthProvider`) al montarse:

| Función | Qué hace |
|---|---|
| `getToken` | `getAccessTokenSilently()`: el token de la caché en memoria o uno renovado si venció |
| `refreshToken` | `getAccessTokenSilently({ cacheMode: "off" })`: fuerza la renovación con el refresh token |
| `onSessionLost` | Navega a `/login` con el aviso "Tu sesión venció", sin redirigir sola a Auth0 |
| `onAccountBlocked` | Pone el estado de `/me` en `bloqueado` con el `ApiError` |

**Interceptor de request.** Pide el token al puente y agrega `Authorization: Bearer`. Si el SDK no puede darlo (falla o no devuelve nada), llama a `onSessionLost` y rechaza con un `ApiError` local `no_autenticado`, sin mandar el pedido.

**Interceptor de response.** Todo error sale como `ApiError` (`normalizeError`).
- `no_autenticado` (401): si el pedido no se reintentó, pide un token nuevo a `refreshToken` y repite el pedido **una vez** con ese token (marcas `_authRetried` y `_retryToken` en la config del pedido). Si la renovación falla o el reintento vuelve a dar 401, llama a `onSessionLost`.
- `usuario_no_registrado`, `usuario_inactivo`, `tenant_inactivo` (403): llama a `onAccountBlocked`.
- El resto se rechaza tal cual; la pantalla decide con `showApiError`.

**Renovación compartida (`sharePromise`, en la spec `compartirPromesa`).** Con Refresh Token Rotation, dos renovaciones simultáneas con el mismo refresh token harían que Auth0 detecte un reuso y revoque la sesión. `refreshToken` está envuelta en `sharePromise`: mientras hay una renovación en curso, todo pedido que reciba un 401 espera **esa misma** promesa; cuando termina (bien o mal), la próxima llamada renueva de nuevo. Es una función pura, probada en `test/unit/api/authBridge.test.js`. El SDK además serializa sus renovaciones con un lock y deduplica llamadas concurrentes con el mismo `cacheMode`, pero el cliente no depende de ese detalle interno.

## 9. `/me` y permisos (`src/auth/MeProvider.jsx`, `src/auth/usePermissions.js`)

- `MeProvider` va dentro de `AuthProvider` y envuelve la app. Cuando hay sesión, pide `GET /me` **una vez** y guarda `{ status, me, error }` solo en memoria. Estados: `cargando`, `listo`, `bloqueado` (con el `ApiError`) y `error`. Un bloqueo no se pisa con un resultado posterior.
- `useMe()` devuelve ese estado y `reload()` (reintento manual). `usePermissions()` devuelve `can(permiso)`, `canAny(lista)`, `permisos` y `rol`; el `rol` es solo texto para mostrar.
- `RequireAuth`, con sesión, espera a `/me`: `bloqueado` → `AccountBlocked` (pantalla completa con el `title` de la API y "Cerrar sesión"); `cargando` → "Cargando tu cuenta…"; `error` → aviso con "Reintentar" (P-FA13); `listo` → la app.
- La barra (`Layout.jsx`) muestra `me.nombre` y `me.tenant.nombre`.
- Un cambio de rol se ve en el próximo inicio de sesión; mientras tanto la API rechaza con `sin_permiso` lo que ya no corresponde.

## 10. Rutas, guardas y menú desde un solo mapa (`src/auth/routes.js`, `src/App.jsx`, `src/componentes/Layout.jsx`)

**Un solo mapa.** `PRIVATE_ROUTES` (`path`, `label`, `permiso`) es la fuente de las rutas privadas y del menú:
- `App.jsx` recorre el mapa y arma una `<Route>` por entrada, envuelta en `RequirePermission` con su permiso. La pantalla de cada ruta sale de `PAGES` (path → componente), que vive en `App.jsx` porque `routes.js` es lógica pura y se prueba sin React.
- `Layout.jsx` arma el menú con `accessibleRoutes(permisos)`: solo los ítems que el usuario puede ver, en el orden del mapa.

**Para agregar una pantalla privada:** crear el componente en `src/pages/`, agregar la entrada en `PRIVATE_ROUTES` (con el permiso de la matriz del backend) y el componente en `PAGES` de `App.jsx`. La ruta, la guarda y el ítem del menú salen solos.

**Guardas en cadena.** `RequireAuth` (sesión) → `RequireMe` (cuenta cargada, no bloqueada) → `Layout` → `RequirePermission` (permiso de la ruta):
- sin ninguna ruta accesible (por ejemplo, un `SUPERADMIN`, que solo tiene `tenants.*`) → `NoAccess` ("Sin acceso");
- sin el permiso de esa ruta → `Forbidden` ("No tenés permiso"), dentro del layout, **sin redirigir** (no puede entrar en bucle);
- con permiso → la pantalla.

**Ruta inicial.** El destino por defecto después del login es `/dashboard` (D-FA9), que con la matriz actual es la primera ruta accesible para los cuatro roles de negocio. Ver P-FA14 en la spec.
