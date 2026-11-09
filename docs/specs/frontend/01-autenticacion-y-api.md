# 01 — Autenticación con Auth0, consumo de `/api/v1` y errores por `code`

> Frontend · **Borrador** · `feature/spec-front-auth` (esta spec) y `feature/front-auth` (ejecución, a crear desde `master`) · Última actualización 09/11/2026
>
> Primera spec del frontend. Cierra el pendiente **P-26** del backend. Hasta que se ejecute, el frontend no funciona contra la API: el login propio (`/Auth/login`) ya no existe.

## 1. Objetivo y alcance

**Objetivo.** Adaptar `FrontParking` a la API de la etapa 1 del backend: que el usuario inicie sesión con Auth0, que cada pedido a `/api/v1` lleve su token, que la UI sepa qué puede hacer el usuario por los permisos de `GET /api/v1/me`, y que los errores de la API se muestren según su `code`.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Login y logout | Auth0 con Authorization Code + PKCE (`@auth0/auth0-react`), sin secretos en el bundle. Ruta `/callback`. `/login` pasa a ser una pantalla con el botón "Ingresar" | D-FA3, D-FA9 |
| Token | Access y refresh token solo en memoria, con Refresh Token Rotation. Tras una recarga se vuelve a obtener con un redirect a Auth0 | D-FA2 |
| Cliente HTTP | Una sola instancia de axios hacia `/api/v1`, que agrega el token y normaliza los errores | D-FA5 |
| `/me` | Se carga una vez por sesión y alimenta `usePermissions()`. Nunca se persiste | D-FA7 |
| Guardas | Autenticación y permiso por ruta, con un mapa único de rutas que también arma el menú | D-FA8 |
| Errores | Manejador por `code` con el `title` de la API tal cual; pantalla completa para cuenta bloqueada | D-FA6 |
| Pantallas en alcance | Clientes, Cocheras, Tarifas, Auditoría, Dashboard, Monitor operativo y Alertas: errores por `code`, ruta correcta de la API y acciones de escritura ocultas según permiso | D-FA10, DV-FA1 |
| Calidad | Vitest para la lógica pura y dos reglas de ESLint que bloquean `localStorage` y la decisión por rol | D-FA4, D-FA11 |
| Retiro | Login propio, claves viejas de `localStorage` y `RequireAuth.jsx` sin uso | D-FA12 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Pantallas de dinero (pagos, caja) y de ocupaciones: contenido, errores y gating de sus acciones | Specs de la etapa 2 del backend y decisión de ocupaciones. Sus rutas sí quedan con guarda y menú (DV-FA2) |
| Estilos y componentes de diseño | Fuera de esta spec. Solo se agrega lo mínimo funcional: nombre y tenant en la barra y el botón "Salir" |
| Impersonación de soporte | P-19 (abierto, del desarrollador) |
| Alta y gestión de empleados | P-29 (abierto, del desarrollador) |
| P-33, P-2 y P-9 | Abiertos, del desarrollador. P-2 (hosting) y P-9 (datos personales) bloquean los tenants de Auth0 de staging y producción, que esta spec no toca |
| Tenants de Auth0 de staging y producción | ARQ-8, punto 5 |
| Pantalla de usuarios, configuración y `SUPERADMIN` | El backend los deja "Preparado" |
| Errores por campo en formularios (`errors` de `datos_invalidos`) | La spec deja listo el manejador (D-FA6); conectar cada formulario espera a que los DTOs tengan validación |
| Optimistic concurrency (`*_modificado`, 409) | Aplica con la primera spec de la etapa 2 del backend (ARQ-12) |

**Estado de alcance.** Etapa 1 del alcance mínimo para lanzar (Decisión #12 del backend). No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `master`, commit `7c8ae7c`; backend, rama `develop`, commit `e7148e9` (09/11/2026). Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| ARQ-1 (`docs/arquitectura/arquitectura_evolutiva.md` del backend) | Authorization Code + PKCE, access token corto en memoria, sin `localStorage`; `GET /api/v1/me` reemplaza el `userRole` guardado | 03/11/2026 |
| DV-1 (mismo documento) | Token en memoria en vez de cookie HttpOnly, hasta que exista dominio propio. El riesgo de XSS se reduce y no se elimina | 03/11/2026 |
| ARQ-4 y matriz rol × recurso | Autorización por permisos, nunca por rol. Qué permiso exige cada endpoint | 05/11/2026 |
| ARQ-5 | API bajo `/api/v1` | 05/11/2026 |
| ARQ-6 y ARQ-8 | Auth0; tenant `parkingcontrol-dev` con Disable Sign Ups; un usuario pertenece a un solo tenant | 05–06/11/2026 |
| ARQ-9 | Problem Details con `code`; catálogo de códigos; el cliente decide solo por `status` y `code` | 06/11/2026 |
| ARQ-12 | 503 `servidor_ocupado` (se aplica con la etapa 2) | — |
| Spec backend `01-autenticacion-y-permisos.md` | Dominio, audience y client id de la SPA de FrontParking (paso 1.2); errata sobre el acceso delegado de usuario; D-AP7 (forma de `/me`); D-AP15 (el cuerpo de error se escribe siempre) | 07/11/2026 |
| `MeResponse.cs` (backend) | Forma real de `/me`: `usuarioId`, `nombre`, `email`, `rol`, `permisos[]`, `tenant {id, nombre}` | código leído el 09/11/2026 |
| `appsettings.Development.json` (backend) | El CORS de la API acepta solo `http://localhost:5173` | código leído el 09/11/2026 |
| `CLAUDE.md` y `ai-playbook/` del frontend | Metodología, ubicación de las specs, estrategia de pruebas (Vitest para lógica pura), "mapa único de rutas" | — |

**Valores de Auth0 de desarrollo** (no son secretos; vienen de la spec backend `01`, paso 1.2): dominio `parkingcontrol-dev.us.auth0.com`; audience `https://api.parkingcontrol.dev`; client id de la SPA de FrontParking `0vqDMIvIDuPnYEbUMvzxSjiRDrkbCyXr`. Ningún client secret existe ni debe existir en el frontend: una SPA es un cliente público.

**Referencias externas.** Se consultan en su versión vigente **al ejecutar el paso que las usa**, no de memoria: `@auth0/auth0-react` y `@auth0/auth0-spa-js` (opciones `cacheLocation`, `useRefreshTokens`, `useRefreshTokensFallback`, `onRedirectCallback`, `getAccessTokenSilently` con `cacheMode`), documentación de Auth0 sobre Refresh Token Rotation y Application Access Policy, y Vitest.

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Sesión | `Login.jsx` hace `POST /Auth/login` con usuario y contraseña (con valores por defecto `dueno` / `dueno123` precargados) y guarda `token`, `userId`, `userName` y `userRole` en `localStorage` |
| Guarda de rutas | `PrivateRoute` en `App.jsx` solo mira que exista `token`. `Splash.jsx` hace lo mismo. `componentes/RequireAuth.jsx` es una copia sin uso |
| HTTP | `src/api/http.js`: axios con `baseURL = VITE_API_BASE_URL`, el token leído de `localStorage` y el header `ngrok-skip-browser-warning`. Sin interceptor de respuesta ni timeout |
| Wrappers | `pagosApi.js` y `operationalAlertsApi.js`. El resto de las pantallas llaman a `http` directo (una treintena de llamadas en 10 archivos) |
| Menú | `Layout.jsx`: 9 ítems fijos, sin filtro, sin nombre de usuario ni botón de salida |
| Errores | Cada `catch` lee `e.response.data.error` o `.message` y arma su texto; ninguno mira `code` |
| Pruebas | No hay test runner |

## 3. Decisiones

Prefijo **D-FA** ("frontend, autenticación"). Estado: **Confirmada** (la tomó el desarrollador en el chat de diseño del 09/11/2026) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva).

### 3.1 Forma del trabajo

**D-FA1 (09/11/2026) — Confirmada. `master` es la rama de integración.** Esta spec vive en `feature/spec-front-auth`, creada desde `master`, con un PR a `master`. La ejecución va en `feature/front-auth`, también desde `master`, con un commit por paso. El `CLAUDE.md` del frontend no define rama de integración y el repo solo tiene `master`.
*Motivo:* no crea ramas nuevas en el remoto, y el playbook ya aclara que sus nombres son los del proyecto de origen.
*Descartado:* crear `develop` desde `master` para alinear con el backend: es una acción hacia el remoto que nadie pidió, y se puede hacer después. Queda como P-FA6.

### 3.2 Autenticación

**D-FA2 (09/11/2026) — Confirmada. Token en memoria, con Refresh Token Rotation y redirect al recargar.** El access token y el refresh token viven solo en la memoria del SDK (`cacheLocation: "memory"`, `useRefreshTokens: true`, `useRefreshTokensFallback: false`). La aplicación de Auth0 tiene Refresh Token Rotation activa. Al recargar la página la memoria se pierde: el SDK no encuentra refresh token, la guarda de autenticación (D-FA8) dispara `loginWithRedirect`, y Auth0, que tiene su propia sesión, devuelve un código sin pedir la clave. El costo es un redirect rápido en cada recarga.
*Motivo:* cumple ARQ-1 y DV-1 (sin `localStorage`) y no depende de cookies de terceros, que Safari y Chrome bloquean entre `localhost` y `auth0.com`.
*Descartados:* (a) renovar con un iframe `prompt=none`: sin redirect visible, pero necesita cookies de terceros y falla en Safari y con Chrome restrictivo, salvo dominio propio de Auth0; (b) refresh token en `localStorage`: sobrevive a la recarga, pero contradice ARQ-1 y DV-1 y exige una ARQ nueva, que no es de esta spec.
*A verificar al ejecutar:* que, con esa configuración, el SDK no intente el iframe y la recarga pase por el redirect.

**D-FA3 (09/11/2026) — Confirmada. Librería: `@auth0/auth0-react`.** `Auth0Provider` va dentro de `BrowserRouter` (para navegar en `onRedirectCallback`) y envuelve al resto. El token lo consume `http.js`, que vive fuera de React, por un puente (D-FA5).
*Motivo:* es la librería oficial para React, maneja PKCE y el intercambio del código, y evita el doble procesamiento del callback que `React.StrictMode` provoca en desarrollo.
*Descartados:* (a) `@auth0/auth0-spa-js` directo: un cliente singleton que `http.js` llamaría sin puente, pero el contexto de React y la protección contra el doble callback serían código propio; (b) `oidc-client-ts`: neutral al proveedor, pero el logout y el `audience` de Auth0 igual requieren código específico, así que la neutralidad es parcial.

**D-FA9 (09/11/2026) — Propuesta. Flujo de pantallas.**
- `/login` es pública: botón "Ingresar" (`loginWithRedirect`) y, según el motivo, un aviso ("Tu sesión venció", cuenta bloqueada por el error de Auth0). Es adonde llega el logout y donde cae una sesión perdida.
- `/callback` es pública: muestra "Ingresando…" mientras `Auth0Provider` procesa el código. `onRedirectCallback` navega a `returnTo` del `appState` si pasa `rutaDeRetornoSegura` (solo rutas internas que empiezan con `/` y no con `//`; evita un open redirect) y a `/dashboard` si no.
- Las rutas privadas usan `RequireAuth`: si no hay sesión y no hubo un error de Auth0, dispara `loginWithRedirect` con `returnTo` igual a la ruta actual, una sola vez. Si Auth0 devolvió un error, va a `/login` con el aviso y **no** vuelve a redirigir.
- `Splash` espera `isLoading` y va a `/dashboard` o a `/login`.
- Logout: `logout` con `returnTo = origin + "/login"`; limpia la memoria del SDK y el estado de `/me`.
- Una sesión perdida (el refresh token venció o fue revocado, o el pedido sigue dando 401 con un token recién renovado) lleva a `/login` con el aviso y **no** redirige sola.
*Motivo:* una sesión perdida que redirige sola entra en bucle si el problema es de configuración (audience mal puesta, por ejemplo). El redirect automático queda solo para el caso sin error: la recarga.
*Descartado:* redirigir siempre a Auth0 y no tener `/login`: pierde el lugar donde mostrar por qué se cayó la sesión y puede entrar en bucle.

### 3.3 Cliente HTTP y errores

**D-FA5 (09/11/2026) — Propuesta. Cliente HTTP único: axios con puente al token.** Se mantiene `src/api/http.js` (axios, como dice el `CLAUDE.md`). `VITE_API_BASE_URL` pasa a incluir `/api/v1`, así que **las rutas de las pantallas no cambian**, con la excepción de DV-FA1. Un módulo `src/api/authBridge.js` guarda cuatro funciones que registra un componente hijo del `Auth0Provider`: `getToken`, `refreshToken`, `onSessionLost` y `onAccountBlocked`. Es el puente entre un módulo que no es de React y el SDK que sí lo es.
- *Interceptor de request:* `await getToken()` y agrega `Authorization: Bearer`. Si el SDK no puede dar un token (`login_required`, `missing_refresh_token`), llama a `onSessionLost` y rechaza con un `ApiError` local `no_autenticado`.
- *Interceptor de response:* convierte todo error en un `ApiError` (D-FA6). Ante un 401 `no_autenticado` reintenta **una vez** con un token nuevo (`refreshToken` fuerza la renovación, con una sola promesa compartida entre pedidos concurrentes: con rotación, dos renovaciones simultáneas con el mismo refresh token disparan la detección de reuso). Si el reintento falla, llama a `onSessionLost`. Ante un 403 con `usuario_no_registrado`, `usuario_inactivo` o `tenant_inactivo`, llama a `onAccountBlocked(code)`.
- Tiempo máximo del pedido: 20 segundos.
- El header `ngrok-skip-browser-warning` se mantiene sin cambios (P-FA5).
- El frontend **nunca manda un `TenantId`**: el tenant sale del token en el backend. El `tenant` de `/me` es solo para mostrar.
*Motivo:* un solo punto por donde pasa todo pedido; el `CLAUDE.md` ya fija axios; el puente evita meter hooks de React en un módulo de red.
*Descartados:* (a) migrar a `fetch` con un `apiFetch` propio (lo que hace el playbook de referencia): reescribe una treintena de llamadas sin que el problema lo pida; (b) que cada pantalla llame a `getAccessTokenSilently`: duplica la lógica en 10 archivos; (c) reintentar automáticamente los errores 5xx: no es seguro en operaciones que escriben, y menos cuando lleguen las de dinero.

**D-FA6 (09/11/2026) — Propuesta. Manejador de errores por `code`.**

`ApiError` tiene `status`, `code`, `message` (el `title` de la API tal cual), `errors` (diccionario campo → mensajes, solo en `datos_invalidos`), `traceId` y `response` (la respuesta original de axios, para que las pantallas que todavía no migran no se rompan). Si la respuesta no es un Problem Details (cuerpo vacío, HTML de un proxy), el código es `respuesta_invalida`. Si el pedido no llegó, `sin_conexion`; si pasaron 20 segundos, `tiempo_agotado`. Esos tres son **códigos propios del frontend**, con mensaje en español definido en `errorCodes.js`; si el backend adoptara alguno, gana el backend. **Se decide por `code`; el `status` solo sirve para distinguir lo que no trae `code`.** Un código desconocido se muestra con su `title` y no rompe nada: ARQ-9 permite que el backend agregue códigos sin avisar.

| `code` | HTTP | Tratamiento |
|---|---|---|
| `no_autenticado` | 401 | Sesión: un reintento con token nuevo; si falla, sesión perdida (D-FA9) |
| `usuario_no_registrado`, `usuario_inactivo`, `tenant_inactivo` | 403 | **Cuenta bloqueada**: pantalla completa con el `title` y el botón "Cerrar sesión". No se reintenta |
| `sin_permiso` | 403 | Aviso con el `title`. La pantalla sigue |
| `datos_invalidos` | 400 | `errors` por campo si vienen; si no, aviso con el `title` |
| `operacion_invalida` | 400 | Aviso con el `title` |
| `servidor_ocupado` | 503 | Aviso con el `title`. Reintento **manual**, nunca automático (ARQ-12; se aplica con la etapa 2) |
| `error_interno` | 500 | Aviso con el `title`. El `traceId` va a la consola, no a la pantalla |
| `sin_conexion`, `tiempo_agotado`, `respuesta_invalida` | — | Propios; aviso con su mensaje |
| `usuario_ya_registrado`, `tenant_ya_existe`, `usuario_desincronizado` | — | No llegan por HTTP (los usa solo el comando de consola del backend). Si llegaran, se tratan como desconocidos |
| desconocido | cualquiera | Aviso con el `title`, o un texto genérico propio si no hay |

El aviso es un `toast` de `react-hot-toast`, que ya usa el repo. `showApiError(error)` es el único lugar que arma ese aviso.
*Motivo:* el texto de los errores tiene un solo dueño, el backend (ARQ-9); distinguir `usuario_no_registrado` de `sin_permiso` es justo lo que el 403 sin `code` no permitía.
*Descartados:* decidir por `status` (rompe cuando dos errores comparten status, como los cuatro 403); traducir los mensajes en el frontend (dos dueños del texto).

### 3.4 Permisos y rutas

**D-FA7 (09/11/2026) — Propuesta. `/me` en un contexto, sin persistencia.** `MeProvider` va dentro de `Auth0Provider`. Cuando hay sesión, pide `GET /me` una vez y guarda `{ usuario, tenant, permisos }` en memoria. Estados: `cargando`, `listo`, `bloqueado` (con el `code`) y `error`. No se guarda nada en el navegador y no hay refresco periódico: un cambio de rol se ve en el próximo inicio de sesión, y la API manda de todas formas (el frontend solo oculta). `usePermissions()` expone `can(permiso)` y `canAny(lista)`; el `rol` solo está disponible como texto para mostrar, y **nunca para decidir** (ARQ-4).
*Motivo:* una sola llamada por sesión y sin estado viejo en el disco. La API resuelve los permisos desde la base en cada pedido, así que un permiso que cambió a mitad de sesión se rechaza con `sin_permiso` aunque la UI lo muestre.
*Descartados:* guardar `/me` en `localStorage` (un rol viejo y un dato más en disco); refrescarlo en cada navegación (pedidos de más sin un problema medido).

**D-FA8 (09/11/2026) — Propuesta. Mapa único de rutas y guarda por permiso.** `src/auth/routes.js` es la única tabla de rutas privadas: `{ path, label, permiso }`. De ahí salen las `<Route>` (envueltas en `RequirePermission`) y los ítems del menú (solo los que el usuario puede ver). La ruta inicial (`/dashboard` hoy) es la primera del mapa a la que el usuario tiene acceso; si no tiene acceso a ninguna (un `SUPERADMIN`, que solo tiene `tenants.*`), ve una pantalla "Sin acceso". Una ruta sin permiso muestra "No tenés permiso" en lugar de la pantalla; no redirige.

| Ruta | Permiso |
|---|---|
| `/dashboard` | `panel.ver` |
| `/operaciones` | `alertas.ver` (ver P-FA4) |
| `/cocheras` | `cocheras.ver` |
| `/ocupaciones` | `ocupaciones.ver` |
| `/clientes` | `clientes.ver` |
| `/tarifas` | `tarifas.ver` |
| `/auditoria` | `auditoria.ver` |
| `/alertas-operativas` | `alertas.ver` |
| `/caja-diaria` | `caja.ver` |

*Motivo:* el playbook pide un mapa único de destinos; una tabla evita que la ruta y el menú se desincronicen. La matriz del backend es la fuente de cada permiso.
*Descartados:* decidir por `rol` (contradice ARQ-4); dejar el menú fijo y que cada pantalla maneje el 403 (la UI muestra lo que el usuario no puede usar).

**D-FA10 (09/11/2026) — Propuesta. Acciones de escritura ocultas según permiso, solo en las pantallas en alcance.** Cada acción que dispara una llamada de escritura se oculta si falta su permiso. No se deshabilita: no hay nada que explicar, y la API igual rechazaría.

| Pantalla | Llamada | Permiso |
|---|---|---|
| Clientes | `POST /Cliente`, `PUT /Cliente/{id}`, `PATCH …/desactivar`, `PATCH …/reactivar` | `clientes.gestionar` |
| Cocheras | `PUT /Cochera/{id}/estado` | `cocheras.cambiar_estado` |
| Tarifas | `PUT /Tarifa` | `tarifas.editar` |
| Alertas operativas | `PATCH /operational-alerts/{id}/resolver` | `alertas.resolver` |

*Motivo:* es lo que pide ARQ-1 para la UI, con el menor cambio posible. Las pantallas de dinero y de ocupaciones quedan fuera (DV-FA2).
*Descartado:* ocultar también en Ocupaciones y Caja: sus acciones cambian con la etapa 2, y `Ocupaciones.jsx` tiene cambios sin commitear.

### 3.5 Configuración, pruebas y retiro

**D-FA4 (09/11/2026) — Confirmada. Vitest solo para lógica pura.** Se agrega Vitest como `devDependency` y un script `npm test`, con entorno `node` (sin navegador ni Auth0). Los tests viven en `test/unit/`, con la misma ruta del archivo que prueban. Se prueban: el mapeo de errores, los permisos, `rutaDeRetornoSegura` y la validación de la configuración. El flujo de login contra Auth0 se verifica a mano (sección 7).
*Descartados:* Vitest con Testing Library (más cobertura, pero suma dependencias y mocks del SDK de Auth0); sin tests (la lógica de errores y permisos quedaría sin red).

**D-FA11 (09/11/2026) — Propuesta. Configuración validada y dos reglas de ESLint.**
- `src/config.js` lee `VITE_API_BASE_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` y `VITE_AUTH0_AUDIENCE` y falla **nombrando la variable** si falta o es inválida (el dominio sin `https://`; la base de la API debe terminar en `/api/v1`). Es el equivalente de ARQ-7, punto 2. `.env.example` documenta las cuatro, sin valores secretos. Toda variable `VITE_` termina en el JavaScript del navegador: nada es secreto.
- Reglas de ESLint (`no-restricted-*`) en `src/`: prohíben `localStorage` y `sessionStorage`, y las comparaciones contra una propiedad `rol`, `role` o `userRole`. Lo que no puede romperse se bloquea con una herramienta (principio 9 del playbook).
*Motivo:* ARQ-1 dice "sin `localStorage`" y ARQ-4 dice "nunca por rol". Con una regla de lint, un cambio futuro que lo rompa falla en `npm run lint`.
*Descartado:* dejarlo solo escrito en el `CLAUDE.md`, que se puede saltear.

**D-FA12 (09/11/2026) — Propuesta. Limpieza de las claves viejas.** Un único archivo (`src/auth/legacyCleanup.js`), con la excepción de lint justificada en el propio archivo, borra `token`, `userId`, `userName` y `userRole` de `localStorage` al arrancar. Se retira con el tiempo (P-FA7).
*Motivo:* un navegador que usó la versión vieja conserva un JWT del login propio en `localStorage`, que es justo la exposición que ARQ-1 quiere eliminar.
*Descartado:* no limpiar: los valores son inertes (la API ya no los acepta), pero siguen en disco sin motivo.

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FA1 | Matriz, sección 4 y `TarifaController` | La ruta es `/api/v1/Tarifa` (singular) | `Tarifas.jsx` pasa de `/Tarifas/…` a `/Tarifa/…` y se corrige el `CLAUDE.md` del frontend | La pantalla llamaba a una ruta que la API no expone. Se detectó al leer los controllers (09/11/2026) | — |
| DV-FA2 | D-FA10, D-FA6 | Errores por `code` y acciones por permiso en todas las pantallas | `Ocupaciones.jsx`, `CajaDiaria.jsx` y `pagosApi.js` **no se tocan**: usan el cliente nuevo (reciben el token y la normalización) pero conservan sus `catch`, que leen `data.error` y caen a su texto genérico | Esperan a las specs de la etapa 2 y a la decisión de ocupaciones; `Ocupaciones.jsx` tiene cambios sin commitear | La spec que ataque esas pantallas |
| DV-FA3 | `ai-playbook/06-frontend.md` (proyecto de origen) | Sesión por cookie con `credentials: "include"`; guarda por roles; `apiFetch` y `fetch` prohibido; `fields` y `message` | Bearer en memoria; guarda por permisos; axios; `errors` y `title` | El backend manda: ARQ-1/DV-1, ARQ-4 y ARQ-9. El playbook describe otro proyecto y avisa que lo marcado como referencia se traduce | — |
| DV-FA4 | `ai-playbook/08-git-ci-entornos.md` | Rama de integración `develop` | `master` (D-FA1) | El repo no tiene `develop` | P-FA6 |

### 4.2 Pendientes

**Del desarrollador (frenan la ejecución del paso que los nombra).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FA1 | Configurar la aplicación de Auth0 de FrontParking y la API (checklist del paso 0.1). Es un paso manual | 0.1 |
| P-FA2 | **Vencimientos.** ARQ-1 pide un access token "corto" sin cifra. Hay que decidir el vencimiento del access token, del refresh token (absoluto y por inactividad) y el período de superposición de la rotación. Propuesta para desarrollo: superposición de 10 s; el resto, valores a definir. Una superposición mayor que 0 es lo que evita que dos renovaciones concurrentes revoquen la familia de tokens | 0.1 |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FA3 | Que la versión instalada de `@auth0/auth0-react` mantenga las opciones de D-FA2 con esos nombres | Si cambiaron, ajustar al nombre vigente. Si una opción ya no existe y cambia el comportamiento, frenar |
| P-FA4 | `/operaciones` (Monitor operativo) mezcla alertas (`alertas.ver`) y caja (`caja.ver`). Hoy los cuatro roles construidos tienen ambos permisos | Se guarda con `alertas.ver`. La spec de dinero revisa si exige también `caja.ver` |

**Abiertos, sin bloquear.**

| Id | Pendiente |
|---|---|
| P-FA5 | El header `ngrok-skip-browser-warning` sobrevive de cuando el backend se exponía por ngrok; el CORS del backend ya no acepta ese origen. Retirarlo cuando se confirme que no se usa |
| P-FA6 | Crear `develop` en el repo del frontend (D-FA1) |
| P-FA7 | Retirar `legacyCleanup.js` (D-FA12) cuando ningún navegador de desarrollo conserve claves viejas |
| P-FA8 | El playbook pide una guía de trabajo (`00-guia-de-trabajo.md`) y un manual de área para el frontend. No existen todavía; no entran en esta spec |
| P-FA9 | No hay usuario demo con rol `AUDITOR` en el seed del backend (es "Preparado"). La verificación de ese rol se cubre solo con el test de permisos |
| P-FA10 | `CLAUDE.md`, `ai-playbook/`, `Dockerfile` y `.dockerignore` están sin trackear en el repo. Decidir si se commitean (esta spec no los incluye) |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9. Si un paso los necesita, se frena.

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Configuración validada | `src/config.js` | D-FA11 |
| Variables de ejemplo | `.env.example` | D-FA11 |
| `ApiError`, normalización y `showApiError` | `src/api/errors.js` | D-FA6 |
| Catálogo de códigos y tratamiento | `src/constants/errorCodes.js` | D-FA6 |
| Puente al token | `src/api/authBridge.js` | D-FA5 |
| Llamada a `/me` | `src/api/meApi.js` | D-FA7 |
| Provider de Auth0 con `onRedirectCallback` | `src/auth/AuthProvider.jsx` | D-FA2, D-FA3 |
| Guarda de autenticación | `src/auth/RequireAuth.jsx` | D-FA9 |
| Guarda por permiso | `src/auth/RequirePermission.jsx` | D-FA8 |
| Contexto de `/me` y `usePermissions()` | `src/auth/MeProvider.jsx`, `src/auth/usePermissions.js` | D-FA7 |
| Lógica pura de permisos | `src/auth/permissions.js` | D-FA7 |
| Ruta de retorno segura | `src/auth/safeReturnTo.js` | D-FA9 |
| Mapa único de rutas | `src/auth/routes.js` | D-FA8 |
| Pantallas "Callback", "Cuenta bloqueada", "Sin acceso" y "No tenés permiso" | `src/pages/Callback.jsx`, `src/pages/AccountBlocked.jsx`, `src/pages/NoAccess.jsx`, `src/auth/Forbidden.jsx` | D-FA9, D-FA6, D-FA8 |
| Limpieza de claves viejas | `src/auth/legacyCleanup.js` | D-FA12 |
| Tests | `test/unit/config.test.js`, `test/unit/api/errors.test.js`, `test/unit/auth/permissions.test.js`, `test/unit/auth/safeReturnTo.test.js`, `test/unit/auth/routes.test.js`, `test/unit/api/authBridge.test.js` | D-FA4 |
| Manual de esta spec | `docs/manual/frontend/01-autenticacion-y-api.md` | `ai-playbook/01-metodologia.md`, sección 7 |
| Índice de specs | `docs/specs/README.md` | Metodología, sección 4 |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `package.json` y `package-lock.json` | Suma `@auth0/auth0-react`, `vitest` y el script `test` | D-FA3, D-FA4 |
| `eslint.config.js` | Reglas que prohíben `localStorage`, `sessionStorage` y la decisión por rol | D-FA11 |
| `src/main.jsx` | Envuelve la app con `AuthProvider` y `MeProvider`, dentro de `BrowserRouter` | D-FA3 |
| `src/App.jsx` | Rutas desde el mapa; `PrivateRoute` e `isAuthed` se reemplazan por `RequireAuth` y `RequirePermission`; rutas `/callback` y bloqueo | D-FA8, D-FA9 |
| `src/api/http.js` | Token por el puente, interceptor de respuesta, timeout | D-FA5 |
| `src/pages/Login.jsx` | Pasa de formulario a botón "Ingresar" con avisos por motivo | D-FA9 |
| `src/pages/Splash.jsx` | Espera la sesión del SDK en lugar de leer `localStorage` | D-FA9 |
| `src/componentes/Layout.jsx` | Menú desde el mapa, filtrado por permiso; nombre, tenant y "Salir" | D-FA8 |
| `src/pages/Clientes.jsx`, `Cocheras.jsx`, `Auditoria.jsx`, `Dashboard.jsx`, `OperationalDashboard.jsx`, `OperationalAlerts.jsx` | Errores con `showApiError`; acciones por permiso donde corresponde | D-FA6, D-FA10 |
| `src/pages/Tarifas.jsx` | Lo anterior, más `/Tarifas` → `/Tarifa` | D-FA6, D-FA10, DV-FA1 |
| `CLAUDE.md` | Autenticación, HTTP, endpoints (`/Tarifa`), variables y comandos al día | Metodología |

### 5.3 Se borran

| Pieza | Dónde |
|---|---|
| Guarda sin uso | `src/componentes/RequireAuth.jsx` |
| Login propio | La llamada a `/Auth/login` y el formulario en `src/pages/Login.jsx` |
| Claves de sesión en `localStorage` | `token`, `userId`, `userName`, `userRole` |

### 5.4 No se tocan

`src/pages/Ocupaciones.jsx`, `src/pages/CajaDiaria.jsx` y `src/api/pagosApi.js` (DV-FA2); `src/api/operationalAlertsApi.js`; `Dockerfile` y `.dockerignore`.

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-auth`. Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde (desde el paso 1), el paso tildado en esta spec, el manual de la spec al día y un commit confirmado por el desarrollador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Nunca se lee ni se muestra el `.env`. Los valores de Auth0 de desarrollo están en la sección 2 y los carga el desarrollador.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo es P-FA3 y P-FA4, con la regla que ya fijan.
- Los "Paso manual" los hace el desarrollador. El ejecutor da las instrucciones y espera la confirmación.
- No se usa `master` para trabajar: la rama se crea desde `master` al empezar el paso 1.

### Paso 0 — Preparación manual

- [ ] **0.1 (paso manual)** Dejar el tenant `parkingcontrol-dev` listo para FrontParking (P-FA1, P-FA2):
  1. Aplicación SPA de FrontParking: *Application Type* "Single Page Application"; **Allowed Callback URLs** `http://localhost:5173/callback`; **Allowed Logout URLs** `http://localhost:5173/login`; **Allowed Web Origins** y **Allowed Origins (CORS)** `http://localhost:5173`. Se usa `localhost`, nunca `127.0.0.1` (el CORS de la API compara el origen de forma exacta).
  2. En esa aplicación: **Refresh Token Rotation** activada, con un período de superposición mayor que 0 y los vencimientos que defina P-FA2.
  3. En la API `https://api.parkingcontrol.dev`: **Allow Offline Access** activado y el vencimiento del access token de P-FA2. La política de acceso delegado de usuario ya está en "All applications allowed" para desarrollo (errata del paso 1.2 del backend); para producción vuelve a *Per-app authorization*.

  *Aceptación:* el desarrollador confirma las tres cosas y deja anotados los valores de P-FA2 en esta spec.
- [ ] **0.2 (paso manual)** En el `.env` (sin copiarlo al chat ni al repo): `VITE_API_BASE_URL` con el sufijo `/api/v1` y las variables `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` y `VITE_AUTH0_AUDIENCE` con los valores de la sección 2.
  *Aceptación:* el desarrollador confirma que las cuatro variables existen.

### Paso 1 — Dependencias, configuración y reglas de lint

- [ ] **1.1** Crear `feature/front-auth` desde `master`. Instalar `@auth0/auth0-react` y `vitest` (esta última como `devDependency`) y agregar el script `test`. Resolver P-FA3.
- [ ] **1.2** Crear `src/config.js` (D-FA11) y `.env.example`.
- [ ] **1.3** Agregar a `eslint.config.js` las reglas que prohíben `localStorage`, `sessionStorage` y la decisión por `rol`, `role` o `userRole`.

  *Aceptación:* `npm test` pasa con `test/unit/config.test.js` (falta cada variable → el mensaje nombra esa variable; dominio con `https://` → falla; base de la API sin `/api/v1` → falla). `npm run lint` marca los usos actuales de `localStorage` en `App.jsx`, `Login.jsx`, `Splash.jsx`, `RequireAuth.jsx` y `http.js` como errores: es lo esperado, y esos archivos se corrigen en los pasos 3 y 5. Para que el commit quede en verde, las reglas se agregan con esos cinco archivos como excepciones temporales, que se retiran en los pasos 3 y 5. `npm run build` pasa.

### Paso 2 — Núcleo puro: errores, permisos y ruta de retorno

- [ ] **2.1** Crear `src/constants/errorCodes.js` y `src/api/errors.js` (`ApiError`, `normalizeError`, `showApiError`) según la tabla de D-FA6.
- [ ] **2.2** Crear `src/auth/permissions.js` (`can`, `canAny` sobre una lista de permisos) y `src/auth/safeReturnTo.js` (D-FA9).
- [ ] **2.3** Crear `src/auth/routes.js` con el mapa de D-FA8 y una función que devuelve las rutas accesibles dada una lista de permisos (la primera es la ruta inicial).

  *Aceptación:* `npm test` pasa con tests que cubren: un Problem Details por cada `code` de la tabla, con su tratamiento; cuerpo HTML y cuerpo vacío → `respuesta_invalida`; sin respuesta → `sin_conexion`; timeout → `tiempo_agotado`; un `code` desconocido se muestra con su `title`; un 403 `sin_permiso` y uno `usuario_inactivo` **no** reciben el mismo tratamiento; `rutaDeRetornoSegura` rechaza `//otro.com`, `https://otro.com`, `javascript:` y rutas sin `/` inicial, y acepta `/clientes?x=1`; `routes` devuelve para `OPERADOR` (con los permisos de la matriz) todas las rutas menos `/auditoria`, para `AUDITOR` todas las rutas con `can("clientes.gestionar")` falso, y ninguna para un usuario con solo `tenants.*`.

### Paso 3 — Login, callback, logout y guarda de autenticación

- [ ] **3.1** Crear `src/auth/AuthProvider.jsx` con la configuración de D-FA2 y D-FA3, y `onRedirectCallback` con `rutaDeRetornoSegura`. Envolver la app en `src/main.jsx`.
- [ ] **3.2** Crear `src/auth/RequireAuth.jsx` y `src/pages/Callback.jsx`. Reemplazar `PrivateRoute` e `isAuthed` en `src/App.jsx`. Borrar `src/componentes/RequireAuth.jsx`.
- [ ] **3.3** Reescribir `src/pages/Login.jsx` (botón "Ingresar", avisos por motivo, sin la llamada a `/Auth/login` ni los valores por defecto precargados) y `src/pages/Splash.jsx`.
- [ ] **3.4** Agregar el botón "Salir" a `src/componentes/Layout.jsx` (`logout` con `returnTo = origin + "/login"`).

  *Aceptación (manual, con `npm run dev` en `http://localhost:5173`):* (1) entrar a `/clientes` sin sesión redirige a Auth0; (2) con `dueno@demo.test` se vuelve a `/clientes` y no a `/dashboard` (`returnTo`); (3) recargar la página vuelve a `/clientes` pasando por Auth0 **sin pedir la clave**; (4) "Salir" lleva a `/login`, y una nueva entrada a una ruta privada pide la clave; (5) `localStorage` no tiene ninguna clave de sesión ni token (DevTools → Application); (6) un `returnTo` manipulado (`/callback?…` con `//otro.com` en el estado) no sale del sitio. `npm run lint` y `npm run build` pasan. Se retiran las excepciones temporales de lint de `App.jsx`, `Login.jsx`, `Splash.jsx` y `RequireAuth.jsx`.

### Paso 4 — Cliente HTTP único y `/me`

- [ ] **4.1** Crear `src/api/authBridge.js` y registrar sus funciones desde un componente hijo de `AuthProvider` (`getToken`, `refreshToken`, `onSessionLost` y `onAccountBlocked`). La promesa compartida de la renovación es una función pura exportada (`compartirPromesa`), para poder probarla sin el SDK.
- [ ] **4.2** Reescribir `src/api/http.js` (D-FA5): token por el puente, timeout de 20 s, interceptor de respuesta con `normalizeError`, un reintento ante 401 `no_autenticado` y llamada a `onAccountBlocked`. Retirar la excepción temporal de lint.
- [ ] **4.3** Crear `src/api/meApi.js` y `src/auth/MeProvider.jsx` (estados `cargando`, `listo`, `bloqueado`, `error`) y `src/auth/usePermissions.js`. Crear `src/pages/AccountBlocked.jsx` y mostrarla cuando `MeProvider` o el interceptor reporten una cuenta bloqueada. Mostrar el nombre del usuario y el tenant en la barra de `Layout.jsx`.

  *Aceptación (manual):* (1) con `dueno@demo.test`, en Network cada pedido a `/api/v1/...` lleva `Authorization: Bearer` y `/api/v1/me` responde 200; (2) la barra muestra el nombre y el tenant; (3) con `sinregistro@demo.test` se ve la pantalla de cuenta bloqueada con el `title` de la API (`usuario_no_registrado`) y "Cerrar sesión" funciona; (4) con `dueno2@demo.test` la barra muestra el tenant 2 y el listado de Clientes no muestra los datos del tenant 1; (5) forzar un 401 (con una modificación local y temporal del puente que devuelva un token inválido, sin commitearla) produce **un** reintento y después `/login` con el aviso "Tu sesión venció", sin bucle de redirects; (6) ningún pedido contiene un `TenantId` (búsqueda de `tenantId` en `src/` sin coincidencias que se envíen). `npm test` pasa con `test/unit/api/authBridge.test.js`: tres llamadas concurrentes a la renovación ejecutan **una sola** renovación y las tres reciben el mismo resultado; si falla, las tres fallan y la siguiente llamada vuelve a intentar. `npm run lint` y `npm run build` pasan.

### Paso 5 — Guardas por permiso, mapa de rutas y menú

- [ ] **5.1** Crear `src/auth/RequirePermission.jsx`, `src/auth/Forbidden.jsx` y `src/pages/NoAccess.jsx`.
- [ ] **5.2** Armar las `<Route>` de `src/App.jsx` desde `src/auth/routes.js`, cada una envuelta en `RequirePermission`. La ruta inicial es la primera accesible; sin ninguna, se muestra `NoAccess`.
- [ ] **5.3** Filtrar el menú de `src/componentes/Layout.jsx` con el mismo mapa.

  *Aceptación (manual):* (1) `dueno@demo.test` ve los 9 ítems del menú; (2) `encargado@demo.test` y `operado@demo.test` no ven "Auditoría", y al escribir `/auditoria` en la barra ven "No tenés permiso", sin redirect ni bucle; (3) el menú y las rutas salen del mismo mapa (un ítem agregado al mapa aparece en las dos); (4) `/ocupaciones` y `/caja-diaria` están guardadas por `ocupaciones.ver` y `caja.ver`. `npm test` pasa con los tests de `routes` del paso 2.

### Paso 6 — Pantallas en alcance

- [ ] **6.1** `Tarifas.jsx`: `/Tarifas/…` → `/Tarifa/…` (DV-FA1).
- [ ] **6.2** En `Clientes.jsx`, `Cocheras.jsx`, `Tarifas.jsx`, `Auditoria.jsx`, `Dashboard.jsx`, `OperationalDashboard.jsx` y `OperationalAlerts.jsx`, reemplazar cada `catch` que arma su propio texto por `showApiError(error)`. Los `finally`, el estado de carga y los mensajes de éxito no se tocan.
- [ ] **6.3** Ocultar las acciones de escritura de la tabla de D-FA10 con `can(permiso)`.

  *Aceptación (manual):* (1) Tarifas carga las tarifas activas y el historial; (2) con `operado@demo.test`: Clientes muestra el alta y la edición, Cocheras permite cambiar el estado, Tarifas **no** muestra el botón de actualizar, Alertas permite resolver; con `encargado@demo.test`, Tarifas tampoco; con `dueno@demo.test`, todo; (3) un 403 `sin_permiso` forzado (por ejemplo, llamando a `PUT /Tarifa` con `operado@demo.test` desde DevTools) muestra el `title` de la API en un aviso y la pantalla sigue; (4) con el backend apagado se ve "No pudimos conectarnos…" y no un mensaje de axios; (5) `Ocupaciones.jsx`, `CajaDiaria.jsx` y `pagosApi.js` no tienen diferencias en `git diff`. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 7 — Retiro del legado y documentación

- [ ] **7.1** Crear `src/auth/legacyCleanup.js` (D-FA12) y llamarlo al arrancar. Confirmar que no queda ningún uso de `localStorage` fuera de ese archivo y que no quedan excepciones temporales de lint.
- [ ] **7.2** Actualizar `CLAUDE.md` (autenticación, HTTP, endpoints, variables, comandos, `npm test`) y completar el manual `docs/manual/frontend/01-autenticacion-y-api.md`.
- [ ] **7.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `master`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; una búsqueda de `localStorage` en `src/` solo encuentra `legacyCleanup.js`; el `CLAUDE.md` ya no menciona `/Auth/login`, `userRole` ni "token presence in localStorage".

## 7. Verificación

Con el backend en `develop` corriendo en Development contra `parkingcontrol-dev` y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | Login, recarga, logout (pasos 3 y 4) | Sin pedir la clave al recargar; sin claves ni tokens en `localStorage`; "Salir" cierra la sesión |
| 2 | Cada usuario demo (`dueno`, `encargado`, `operado`) recorre el menú | Ve solo lo que su rol permite según la matriz; las acciones de escritura coinciden con la tabla de D-FA10 |
| 3 | `sinregistro@demo.test` | Pantalla de cuenta bloqueada con el mensaje de la API |
| 4 | `dueno2@demo.test` | Tenant distinto en la barra y datos distintos en Clientes |
| 5 | Cada pantalla en alcance carga contra `/api/v1` | Sin 404 (en especial Tarifas) |
| 6 | Un 401 y un 403 forzados | Un solo reintento y después `/login` con el aviso; el 403 `sin_permiso` no cierra la pantalla |
| 7 | Backend apagado | Mensaje propio de `sin_conexion` |
| 8 | Network, con las 4 llamadas más frecuentes | `Authorization: Bearer` en todas; ningún `TenantId` en cuerpo ni query |
| 9 | `npm run lint`, `npm test`, `npm run build` | Sin errores |
| 10 | `git diff master -- src/pages/Ocupaciones.jsx src/pages/CajaDiaria.jsx src/api/pagosApi.js` | Vacío (DV-FA2) |
| 11 | Búsqueda de `localStorage`, `sessionStorage` y `.rol` en `src/` | Solo `legacyCleanup.js` |
| 12 | Ningún secreto en el repo ni en el bundle | `src/` solo lee las cuatro variables `VITE_*` documentadas (`import.meta.env`), y ninguna es un secreto; `git status` no muestra el `.env` |

**No verificable con los usuarios demo:** los códigos `usuario_inactivo` y `tenant_inactivo` (requieren cambiar la base) y el rol `AUDITOR` (P-FA9). Los cubren los tests del paso 2.

## 8. Cómo retomar

**Estado:** Borrador. Esta spec está redactada y no se ejecutó ningún paso. Falta que el desarrollador la revise y la apruebe; al aprobarla, el estado pasa a **Aprobada**. Después se cierran P-FA1 y P-FA2 (paso 0).

**Modelo y esfuerzo por paso.** La ejecución es liviana: las decisiones difíciles ya están tomadas (ARQ-1, DV-1 y D-FA2). Cada paso se ejecuta en un chat nuevo.

| Paso | Modelo | Esfuerzo | Nota |
|---|---|---|---|
| 0 | — | — | Lo hace el desarrollador |
| 1 | Sonnet | bajo | |
| 2 | Sonnet | bajo | Lógica pura con tests: el criterio de aceptación es la lista de casos |
| 3 | Sonnet | bajo | La verificación es manual contra Auth0 |
| 4 | Sonnet | bajo | Es el paso más delicado (reintento y promesa compartida). Si el ejecutor duda de la concurrencia, **frena** y vuelve al modelo fuerte: no lo decide |
| 5 | Sonnet | bajo | |
| 6 | Sonnet | bajo | Mecánico: reemplazo de `catch` y ocultar acciones según una tabla |
| 7 | Haiku | bajo | Documentación y limpieza; no hay decisiones |

Si en cualquier paso aparece una decisión que la spec no previó, se anota en la sección 4 y se vuelve a un chat de planificación con el modelo más capaz y esfuerzo alto, en especial si toca dónde se guarda el token o cómo se renueva.

**Prompt para el chat de ejecución** (cambiar `N` por el paso):

> Trabajás en el frontend de ParkingControl (`C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`). Leé `CLAUDE.md` y `docs/specs/frontend/01-autenticacion-y-api.md`. Ejecutá **solo el paso N** de esa spec, en la rama `feature/front-auth` (creada desde `master`, nunca trabajes sobre `master`). Seguí las reglas de la sección 6. No leas ni muestres el `.env`. Si algo obliga a decidir lo que la spec no prevé, frená y anotalo como pendiente. Al terminar: tildá el paso, actualizá el manual y proponé el commit sin `Co-Authored-By` ni atribución de IA. Respondé en español rioplatense.
