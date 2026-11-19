# 05 — Alertas operativas paginadas y alertas de dinero

> Frontend · **Terminada** (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) · Spec en `feature/specs-etapa2`; ejecución en `feature/front-alertas` (sin worktree: la rama salió de `feature/front-trazabilidad`, con la 04 ya implementada) · Última actualización 19/11/2026
>
> Conecta las dos pantallas de alertas con el backend nuevo: listado paginado con filtros, resolución con comentario obligatorio en las alertas de dinero y permisos por acción. Saca del Monitor operativo el widget de caja, que llamaba a un endpoint que ya no existe.
>
> **Depende de la 02 y de la 04.** La 02 aporta fechas, enums, paginación y el patrón de módulos de API. La 04 aporta `buildTrazabilidadPath` (enlace a Trazabilidad). La ejecución **no puede arrancar** hasta que las dos estén implementadas y mergeadas en `develop`.

## 1. Objetivo y alcance

**Objetivo.** Que `/alertas-operativas` y `/operaciones` funcionen contra `/api/v1/operational-alerts` tal como quedó en el backend: respuesta paginada, filtros nuevos, resolución que devuelve la alerta, alertas de dinero con permiso propio, y tipos 5 a 12.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `operationalAlertsApi.js` pasa al estilo de funciones de la 02: `listAlertas`, `getAlerta`, `resolveAlerta`, `countAlertas` | D-FE4 |
| Listado de alertas | Paginado (20 por página por defecto), filtros de estado, severidad, tipo y rango de días; filtros por `ocupacionId` y `cajaSesionId` que llegan por URL | D-FE5, D-FE6 |
| Resolución | Comentario obligatorio en alertas de dinero, botón según permiso, 409 `alerta_resuelta` refresca la fila con lo que devuelve la API | D-FE7, D-FE8 |
| Datos de la alerta | Quién y cuándo la resolvió (o "automática"), comentario, marca "Dinero", severidad y tipo desde los enums de la 02 | D-FE9 |
| Enlaces | A Trazabilidad por `ocupacionId` o `cajaSesionId`, solo con `auditoria.ver` | D-FE10 |
| Monitor operativo | Sin el widget de caja; indicadores exactos por `total` y cargas independientes que no se tiran abajo entre sí | D-FE3, D-FE11 |
| Actualización | Manual, y automática cada 5 minutos con la pestaña visible | D-FE12 |
| Limpieza | Se retiran `fmtDate`, `todayISO`, `money` y la paginación fija `page: 1, pageSize: 50`; se sacan las dos excepciones de lint | D-FE13 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Widget de caja del Monitor | Lo repone la 09 sobre `/Caja` (D-FE3) |
| Enlaces desde una alerta a Ocupaciones y a Caja | Los agregan la 07 y la 09, que definen su URL con filtro (D-FE10) |
| Pantalla de detalle de una alerta | No hay: la fila del listado ya trae todos los campos. `GET /{id}` se usa solo para refrescar una fila (D-FE8) |
| Unificar el Monitor y las Alertas en una pantalla | Descartado por el desarrollador (D-FE2) |
| Endpoint de resumen de alertas en el backend | Pendiente del backend (P-FE2) |
| Rediseño visual | Después, con el diseño de Claude Design |
| `pagosApi.js` y `CajaDiaria.jsx` | No se tocan: la 08 y la 09 |

**Estado de alcance.** Etapa 2 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con las specs 02 y 04 ya mergeadas al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección `/operational-alerts` | Endpoints, filtros, `Alerta`, permisos, 409 `alerta_resuelta` | 18/11/2026 |
| `docs/inventario/backend.md`, sección 0 | `PagedResponse`, instantes con zona, Problem Details | 18/11/2026 |
| `docs/inventario/backend.md`, sección 3 (matriz) y 4 (errores) | `alertas.ver` (los 4 roles), `alertas.resolver` (DUENO, ENCARGADO, OPERADOR), `alertas.resolver_dinero` (DUENO); `alerta_no_encontrada`, `sin_permiso`, `datos_invalidos` | 18/11/2026 |
| `docs/inventario/backend.md`, sección 5 | `desde`/`hasta` de alertas sobre `fechaCreacion`, `hasta` inclusivo | 18/11/2026 |
| `docs/inventario/backend.md`, sección `/Caja` | `/Caja/actual` devuelve `{ modo, sesion?, fondoPropuesto? }` y `sesion` no trae totales (D-FE3) | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 1 a 5 y "Contratos entre specs" | Qué está roto, reparto de la 02, contrato de enlace a Trazabilidad, nota del widget de caja | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError`, `usePermissions`, D-FA10 (ocultar acciones por permiso), P-FA4 | 09/11/2026 |
| Spec 02 (aprobada, no implementada) | `useTenantDates`, `dateRangeToInstants`, `usePagination`, `normalizePaged`, `toTablePaginationProps`, `cleanParams`, enums y helpers, `formatNumber`, patrón D-FB14, D-FB9 (excepciones de lint) | 18/11/2026 |
| Spec 04 (en redacción) | `buildTrazabilidadPath` en `src/utils/trazabilidadLink.js`, ruta `/trazabilidad`, enlace solo con `auditoria.ver` | 18/11/2026 |
| Lectura de `src/` en `develop` | `OperationalAlerts.jsx`, `OperationalDashboard.jsx`, `operationalAlertsApi.js`, `pagosApi.js`, `routes.js` | 18/11/2026 |

**Referencias externas.** Se consultan en su versión vigente al ejecutar el paso que las usa: MUI (`TablePagination`, `Tooltip`, `Dialog`), `react-router-dom` 7 (`useSearchParams`, `Link`) y la API `document.visibilityState` / evento `visibilitychange`.

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| `operationalAlertsApi.js` | Objeto con `getAll(params)` y `resolve(id, comentario)`; devuelven la respuesta de axios. Solo lo usan las dos pantallas de alertas |
| `OperationalAlerts.jsx` | Pide `page: 1, pageSize: 50` y espera un **arreglo** (`Array.isArray(data) ? data : []`): con el backend paginado, `data` es un objeto y la lista queda siempre vacía. Los tres indicadores (abiertas, críticas, altas) se calculan sobre la página recibida. Filtro de estado por defecto "Abiertas". Resolver manda `{ comentario }` sin validar nada. `fmtDate` local (l. 29), `Number(a.severidad) === 4` literal, `Ocupación: {id}` como texto |
| `OperationalDashboard.jsx` | `Promise.all` entre `getAll` (primeras 50 abiertas) y `pagosApi.getCajaDiaria(todayISO())` (l. 114). El segundo da 404, así que **hoy todo el Monitor falla**, no solo la caja. Los cinco indicadores salen de esas 50 alertas. `todayISO` (l. 24), `money` (l. 28) y `fmtDate` (l. 38) locales. Sin refresco automático |
| `routes.js` | `/operaciones` y `/alertas-operativas` guardadas con `alertas.ver`; comentario P-FA4 sobre la mezcla con caja |
| Permisos | El botón "Resolver alerta" se oculta sin `alertas.resolver` (D-FA10). No existe nada para `alertas.resolver_dinero` |

## 3. Decisiones

Prefijo **D-FE** ("frontend, alertas"). Estado: **Confirmada** (la tomó el desarrollador o la fija una fuente) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva). Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y alcance

**D-FE1 (18/11/2026) — Confirmada. Rama y worktree.** La ejecución va en `feature/front-alertas`, en el worktree `../parkingcontrol-front-alertas` creado desde `develop`, con un commit por paso y un PR a `develop`. Solo arranca cuando la 02 y la 04 estén implementadas y mergeadas: la 02 por las funciones que usa y la 04 por `buildTrazabilidadPath`. Las excepciones de lint de las dos páginas se sacan con un rebase sobre `develop` antes del PR (orden de merge por número de spec).
*Motivo:* el worktree propio evita que un cambio de rama en un chat cambie los archivos de otro (CLAUDE.md).

**D-FE2 (18/11/2026) — Confirmada. El Monitor y las Alertas siguen siendo dos pantallas.** `/operaciones` es el resumen (indicadores y críticas recientes) y `/alertas-operativas` es el listado paginado con resolución. No cambian rutas ni menú.
*Descartado:* unificarlas en una pantalla con indicadores arriba y listado abajo: toca `routes.js`, `App.jsx` y el menú sin un problema que lo pida.

**D-FE3 (18/11/2026) — Confirmada. El widget de caja sale del Monitor, y lo repone la 09.** La 05 quita el widget "Caja diaria" (la columna derecha, `md=5`), el botón "Ver detalle de caja", el import de `pagosApi`, `todayISO` y `money`. La tarjeta de críticas recientes pasa a ocupar el ancho completo. El subtítulo deja de decir "caja diaria": "Centro de control de alertas y riesgo operativo del garage". Con esto se cierra **P-FB8** de la 02 (el Monitor queda como panel de alertas) y **P-FA4** de la 01 (`/operaciones` ya no mezcla caja, así que `alertas.ver` alcanza).
*Motivo:* `/Caja/actual` solo trae `{ modo, sesion?, fondoPropuesto? }` y `sesion` es `{ id, estado, fechaApertura, fondoInicial }`, sin totales. Los totales por método salen de `/Caja/sesiones/{id}/esperado` (permiso `caja.ver_esperado`) y dependen del modelo de caja (`modo` diaria o por turno) que define la 09. Armar acá un resumen parcial es diseñar caja dos veces.
*Descartados:* (b) cambiarlo por `GET /Caja/actual` con lo mínimo (estado, apertura, fondo): sin el total cobrado no reemplaza lo que había, y adelanta decisiones de la 09; (c) dejarlo roto hasta la 09: el 404 sigue tirando el Monitor entero y la 09 depende de la 08.
*Para la 09:* (1) volver a poner el widget en el Monitor sobre `/Caja/actual` y `/Caja/sesiones/{id}/esperado`, con `formatMoney`; (2) retirar `pagosApi.getCajaDiaria`, que también usa `CajaDiaria.jsx`; (3) revisar si `/operaciones` debe exigir `caja.ver`. La 09 reagrega un bloque al archivo que acá queda sin él: coordinar el orden de merge.

### 3.2 Módulo de API

**D-FE4 (18/11/2026) — Confirmada. `operationalAlertsApi.js` al estilo de la 02 (D-FB14).** Se reescribe con funciones nombradas que devuelven `data`, usan `http`, no capturan errores, no convierten fechas ni enums, y filtran con `cleanParams`. El nombre del archivo no cambia.

| Función | Endpoint | Devuelve |
|---|---|---|
| `listAlertas(filters)` | `GET /operational-alerts` | `normalizePaged(data)`: `{ items, total, page, pageSize }` |
| `getAlerta(id)` | `GET /operational-alerts/{id}` | `Alerta` |
| `resolveAlerta(id, body)` | `PATCH /operational-alerts/{id}/resolver` con `body = { comentario? }` | **`Alerta`** resuelta (ya no `{ message }`) |
| `countAlertas(filters)` | `listAlertas({ ...filters, page: 1, pageSize: 1 })` | `total` (entero). Derivada de `listAlertas`: sirve para los indicadores sin traer filas |

`filters` son valores ya listos: `resuelta` (boolean), `tipo` y `severidad` (enteros), `ocupacionId`, `cajaSesionId`, `desde` y `hasta` (`UtcInstant`), `page`, `pageSize`. JSDoc con el `typedef` de `Alerta` del inventario: `id, tipo, severidad, mensaje, ocupacionId?, cajaSesionId?, esDeDinero, resuelta, fechaCreacion, fechaResolucion?, resolucionAutomatica, resueltaPorUsuarioId?, resueltaPorNombre?, comentarioResolucion?`. Los métodos viejos `getAll` y `resolve` se eliminan: solo los usan las dos pantallas, que se reescriben en esta spec.

### 3.3 Listado de alertas

**D-FE5 (18/11/2026) — Confirmada. Filtros y paginación.**
- **Estado** por defecto **"Abiertas"** (`resuelta=false`), con "Todas" y "Resueltas" (Confirmada).
- **Severidad** y **Tipo**: selects con `optionsOf(SeveridadAlerta, { allLabel: "Todas" })` y `optionsOf(TipoAlertaOperativa, { allLabel: "Todos" })`. Sin números literales ni listas escritas a mano.
- **Rango de días**: dos `<input type="date">` ("Desde" y "Hasta"). `inputToDateOnly` y, con `useTenantDates().dateRangeToInstants(desde, hasta, tz)`, se mandan como instantes sobre `fechaCreacion` con `hasta` inclusivo (inventario, sección 5). Se puede filtrar solo desde o solo hasta. Si `desde > hasta`, no se pide nada y se muestra "La fecha 'Desde' no puede ser posterior a 'Hasta'" bajo el campo.
- **Paginación** con `usePagination({ pageSize: DEFAULT_PAGE_SIZE })` (20, el default del backend) y `TablePagination` con `toTablePaginationProps` y `PAGE_SIZE_OPTIONS`. Cualquier cambio de filtro llama a `reset`; `normalizePaged` valida la respuesta y `fit` baja la página si quedó más allá de la última.
- **Contador**: sobre la lista se muestra el `total` del filtro ("134 alertas").
- La construcción del query (conversión de días a instantes, estado a boolean, enteros, omitir vacíos) vive en una función **pura** (`buildAlertQuery`, sección 5) para probarla con Vitest sin la zona del sistema.
- Respuestas fuera de orden: la pantalla descarta la respuesta de una carga anterior si ya hay una más nueva (contador en un `useRef`). Sin esto, cambiar filtros rápido puede dejar a la vista el resultado del filtro viejo.
*Motivo:* es todo lo que el backend filtra (inventario) y lo que hoy pedía la pantalla, sin la paginación fija a 50.
*Descartado:* un filtro "Solo de dinero": el backend no lo ofrece, y filtrar en el cliente sobre una página rompe `total`.

**D-FE6 (18/11/2026) — Confirmada. Filtros iniciales por URL.** La pantalla lee una vez, al montarse, `estado`, `severidad`, `tipo`, `ocupacionId` y `cajaSesionId` de `useSearchParams` (`/alertas-operativas?severidad=4`, `?ocupacionId=12`). Un valor que no existe en su enum o no es un entero positivo se ignora. `ocupacionId` y `cajaSesionId` se muestran como etiquetas con "×" para quitarlas ("Ocupación 12 ×"). La URL **no** se vuelve a escribir cuando el usuario cambia un filtro.
Sirve para dos cosas: (1) el Monitor linkea "Ver todas" y "Revisar" a `?severidad=4`; (2) la 07 y la 09 pueden linkear "ver alertas de esta ocupación / sesión" sin tocar esta pantalla.
*Motivo:* es la forma más barata de conectar pantallas, y no usa `localStorage` (ARQ-1).
*Descartado:* sincronizar filtros con la URL en las dos direcciones: más código (historial del navegador, valores intermedios) para un beneficio que hoy nadie pidió.

**D-FE7 (18/11/2026) — Confirmada. Indicadores en la pantalla de Alertas.** Se retiran las tres tarjetas (abiertas, críticas, altas) de `/alertas-operativas`: con paginación se calculaban sobre una página y mostrarían números falsos. Esa información vive en el Monitor (D-FE11), que la calcula con `total`. En su lugar queda el contador del filtro (D-FE5).
*Motivo:* un indicador que muestra "20 abiertas" cuando hay 134 es peor que no tenerlo.
*Descartados:* (a) mantener las tarjetas con `countAlertas` (3 pedidos extra por carga, y duplican al Monitor); (b) calcularlas sobre la página, como hoy: números falsos.

### 3.4 Resolución

**D-FE8 (18/11/2026) — Confirmada. UI de resolución.**

*Permiso por acción.* La regla se decide con permisos, nunca por rol (ARQ-4), en una función pura `getResolveState(alerta, can)` que devuelve `{ visible, enabled, reason }`:

| Caso | Botón "Resolver alerta" |
|---|---|
| Alerta resuelta | No hay botón: se muestra quién la resolvió (D-FE9) |
| Sin `alertas.resolver` | **Oculto** (D-FA10: no hay nada que explicar) |
| Con `alertas.resolver`, alerta **no** de dinero | Visible y habilitado |
| Con `alertas.resolver`, alerta de dinero (`esDeDinero`), con `alertas.resolver_dinero` | Visible y habilitado |
| Con `alertas.resolver`, alerta de dinero, **sin** `alertas.resolver_dinero` | **Visible y deshabilitado**, con `Tooltip`: "Tu usuario no tiene permiso para resolver alertas de dinero." |

Esto **se aparta de D-FA10** en un caso (DV-FE1): acá el usuario sí ve la alerta y puede resolver las otras, así que un botón que desaparece solo en algunas filas parece un error; explicar el motivo evita la consulta. El que decide es `esDeDinero` de la respuesta de la API, **no** la marca `dinero` de `enums.js`: si las dos difirieran, manda la API, que es la que luego valida (403 `sin_permiso`).

*Diálogo.*
- Muestra el tipo, el `mensaje` de la alerta y el campo "Comentario de resolución" (multilínea, tope de 500 caracteres con contador "n/500").
- **Alerta de dinero:** el comentario es obligatorio. "Resolver" queda deshabilitado mientras el texto recortado (`trim`) esté vacío, con el texto de ayuda "Obligatorio en alertas de dinero". **No dinero:** opcional; "Resolver" queda habilitado.
- El cuerpo lo arma una función pura `buildResolveBody(alerta, comentario)`: recorta el comentario; si queda vacío en una alerta de dinero devuelve error y no se envía; si queda vacío en otra, el cuerpo es `{}` (no se manda `comentario: ""`); si pasa de 500 devuelve error.
- Mientras el pedido está en curso, los dos botones quedan deshabilitados (`resolving`). **No se reintenta automáticamente**: la operación no es idempotente (un segundo envío da 409) y D-FA5 ya descarta reintentar escrituras.
- Éxito: el `PATCH` devuelve la `Alerta` resuelta; se reemplaza **esa fila** en la lista con lo que devuelve la API y se muestra "Alerta resuelta correctamente". La fila queda visible, ya como resuelta, hasta la próxima actualización (aunque el filtro sea "Abiertas"), para que el usuario vea el resultado.
- `400 datos_invalidos` (la validación del cliente ya lo evita) y `403 sin_permiso` (el permiso cambió a mitad de sesión): `showApiError(e)`; el diálogo queda abierto.

*409 `alerta_resuelta`.* Alguien la resolvió antes, o el job la resolvió automáticamente (`resolucionAutomatica`). Se hace `showApiError(e)` (muestra el `title` de la API tal cual), se cierra el diálogo, se llama a `getAlerta(id)` y se reemplaza la fila con lo que devuelve: queda "Resuelta por X el …" o "Resuelta automáticamente". Si ese `GET` falla (por ejemplo `alerta_no_encontrada`), se muestra con `showApiError` y se recarga la página actual.
*Motivo:* el usuario no necesita adivinar qué pasó; la fila le dice quién y cuándo, y no pierde el contexto de la lista.
*Descartados:* (a) ocultar siempre lo que no se puede resolver: deja al usuario sin explicación para alertas que ve; (b) recargar el listado entero tras cada resolución: la fila desaparece y se pierde la confirmación visual, y puede cambiar de página; (c) bloquear el 409 con un mensaje propio: el `title` de la API es el texto de referencia (D-FA6).

### 3.5 Datos de la alerta y enlaces

**D-FE9 (18/11/2026) — Confirmada. Qué muestra cada fila.**
- Severidad con `labelOf` y `colorOf` de `SeveridadAlerta`; tipo con `labelOf(TipoAlertaOperativa, tipo)` (un valor desconocido se ve como su número, no como "Tipo desconocido"). El borde rojo de las críticas abiertas usa `SeveridadAlerta.CRITICA`, no el literal `4`.
- Chip "DINERO" si `esDeDinero`.
- Fecha de creación con `formatInstant(fechaCreacion)`.
- Si está resuelta: "Resuelta el {fecha}" y, según el caso, "por {resueltaPorNombre}" o "automáticamente" (`resolucionAutomatica`); si hay `comentarioResolucion`, se muestra debajo. Esto lo arma una función pura `resolutionSummary(alerta)`.
- `ocupacionId` y `cajaSesionId` se muestran como texto ("Ocupación 12", "Caja 7") cuando existen; no se muestra "Ocupación: -" si falta.
*Nota:* `Alerta` no trae montos: no se muestra ningún importe y esta spec no usa `formatMoney` (el `money` de la pantalla se va con el widget de caja).

**D-FE10 (18/11/2026) — Confirmada. Enlaces desde una alerta.** Una función pura `getAlertLinks(alerta, { canTrazabilidad })` devuelve la lista de enlaces de la fila, y es el **único** lugar que los decide.
- **Trazabilidad** (contrato de la 04, en "Contratos entre specs" de `brechas-front.md`; no se copia acá): se arma **siempre** con `buildTrazabilidadPath` de `src/utils/trazabilidadLink.js`, nunca con un string a mano. Una alerta no tiene filtro propio: se linkea por su `ocupacionId` y/o su `cajaSesionId`, pasando los dos si están ("Ver trazabilidad"). El enlace solo se muestra si `usePermissions().can("auditoria.ver")`. Sin ninguno de los dos ids, no hay enlace.
- **Ocupaciones y Caja**: `ocupacionId` va a Ocupaciones (07) y `cajaSesionId` a Caja (09), pero esas dos specs todavía definen su URL con filtro. Hasta entonces los ids se muestran como texto (D-FE9). La 07 y la 09 agregan su enlace con **una línea cada una en `getAlertLinks`** (P-FE1).
*Motivo:* una sola función evita que la lógica de enlaces y permisos se disperse por el JSX, y se prueba sin React.
*Descartado:* linkear ya a `/ocupaciones` y `/caja-diaria` sin parámetro: abre la pantalla sin llevar al registro, y `/caja-diaria` desaparece con la 09.

### 3.6 Monitor operativo

**D-FE11 (18/11/2026) — Confirmada. Indicadores exactos y cargas independientes.** Hoy los cinco indicadores se calculan sobre las primeras 50 alertas abiertas; el backend ahora pagina (máximo 100), así que con más de una página el resultado sería falso. El Monitor usa `total`:

| Indicador | Consulta (`resuelta=false` en todas) | Pedidos |
|---|---|---|
| Alertas abiertas | `countAlertas({ resuelta: false })` | 1 |
| Críticas | `listAlertas({ resuelta: false, severidad: CRITICA, page: 1, pageSize: 5 })`; el `total` es el indicador y `items` la lista de "Críticas recientes" | 1 |
| Alta severidad | `countAlertas({ resuelta: false, severidad: ALTA })` | 1 |
| Pagos sospechosos | suma de `countAlertas` para `OCUPACION_FINALIZADA_SIN_PAGO`, `PAGO_MENOR_AL_ESPERADO` y `PAGO_REGISTRADO_TARDE` (el backend filtra un solo `tipo`) | 3 |
| Ocupaciones vencidas | suma de `countAlertas` para `OCUPACION_VENCIDA_SIN_PAGO` y `OCUPACION_VENCIDA_SIN_CIERRE` | 2 |

Son **8 pedidos livianos** por actualización (los siete de conteo traen una sola fila), en paralelo. Los grupos de tipos se escriben con las constantes de `TipoAlertaOperativa`, no con `[5, 6, 7]` ni `[1, 2]`. Los textos de las tarjetas no cambian.

*Cargas independientes.* Se usa `Promise.allSettled`: cada indicador y la lista de críticas se cargan por separado. Si uno falla muestra "—" (con `formatNumber(null)`) y no afecta a los demás; la pantalla nunca queda en blanco por un 404 o un 403 parcial. Los fallos se avisan con **un solo** `showApiError`, con el primer error, para no apilar ocho avisos si, por ejemplo, el servidor no responde. En la tarjeta de críticas, si falla, se ve el mensaje "No se pudieron cargar las alertas críticas" y un botón "Reintentar".
*Navegación.* "Ver todas" y "Revisar" van a `/alertas-operativas?severidad=<CRITICA>` (D-FE6). "Ver alertas" va a `/alertas-operativas`.
*Motivo:* un indicador exacto vale más que uno rápido; y la falla parcial es justo lo que rompió el Monitor hoy.
*Descartados:* (a) un solo pedido de 100 alertas abiertas y contar en el cliente: un pedido, pero inexacto pasadas las 100 (habría que escribir "100+"); es la alternativa si se objeta el costo; (b) quitar los dos indicadores derivados (pagos sospechosos y vencidas): menos pedidos, pero es una decisión de producto que no pidió nadie. Los 7 pedidos de conteo desaparecen si el backend ofrece un resumen (P-FE2).

### 3.7 Actualización

**D-FE12 (18/11/2026) — Confirmada. Refresco manual y automático cada 5 minutos.** El job del servidor genera alertas cada 5 minutos (mostrador) y cada hora (control): refrescar más seguido no trae datos nuevos.
- El botón **"Actualizar"** se mantiene en las dos pantallas, y debajo se muestra "Actualizado: {fecha y hora}" con `formatInstant`.
- Además, cada **5 minutos** (`ALERTS_REFRESH_MS = 300000`) se recarga sola, **solo si la pestaña está visible** (`document.visibilityState`). Al volver a una pestaña oculta, si pasaron 5 minutos o más desde la última carga, recarga en el momento. No refresca mientras el diálogo de resolución está abierto ni mientras hay una carga en curso.
- Un fallo de una actualización **automática** no abre un aviso cada 5 minutos: se deja la lista anterior y se muestra "No se pudo actualizar. Reintentá con 'Actualizar'" junto a la hora de la última carga correcta. Un fallo manual usa `showApiError`.
- La lógica de "toca refrescar" es una función pura `isStale(lastLoadedAt, now, intervalMs)`; el efecto es un hook delgado `useAutoRefresh` (como `usePagination`, sin pruebas de React: D-FA4).
*Motivo:* un operador con la pantalla abierta no tiene por qué enterarse tarde de una alerta crítica, y el intervalo coincide con la frecuencia real del job.
*Descartados:* (a) solo manual (como hoy): las alertas quedan viejas sin que se note; (b) cada 30 o 60 segundos: más carga sobre el backend y no hay datos nuevos entre corridas del job; (c) tiempo real (SSE o WebSocket): el backend no lo ofrece.

### 3.8 Limpieza

**D-FE13 (18/11/2026) — Confirmada. Se retira lo de la tabla 5.4 de la 02 y se sacan las excepciones de lint.** En las dos páginas desaparecen `fmtDate`, `todayISO`, `money` y la paginación fija `page: 1, pageSize: 50`. Las fechas se muestran con `useTenantDates` (`formatInstant`), los enteros con `formatNumber`, y se **sacan de `eslint.config.js`** las excepciones temporales de `OperationalAlerts.jsx` y `OperationalDashboard.jsx` (D-FB9), con un rebase sobre `develop` antes del PR. Los enums salen de `enums.js` (la 02 ya borró `operationalAlerts.js`).

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FE1 | D-FA10 (spec 01) | Las acciones sin permiso se **ocultan**, no se deshabilitan | El botón "Resolver" de una alerta de dinero se **deshabilita con explicación** cuando el usuario tiene `alertas.resolver` pero no `alertas.resolver_dinero`. Sin `alertas.resolver` sigue oculto | El usuario ve la alerta en su lista y puede resolver las demás: un botón que falta solo en algunas filas parece un error | — (aprobado el 18/11/2026) |
| DV-FE2 | Tabla 5.4 de la 02 | El Monitor retira su copia de `money` y `todayISO`, "ver P-FB8" | Se retiran porque el widget de caja que los usaba sale del Monitor (D-FE3), no porque se migren a `formatMoney` y `todayInZone` | Cierra P-FB8: el Monitor queda como panel de alertas | La 09 usa `formatMoney` y `useTenantDates` al reponer el widget |

### 4.2 Pendientes

**Del desarrollador o del backend (no frenan la ejecución, salvo que se indique).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FE1 | **Enlaces a Ocupaciones y a Caja.** La 07 y la 09 definen su URL con filtro y suman su enlace en `getAlertLinks` (`src/utils/alertas.js`). Hasta entonces los ids son texto | — |
| P-FE2 | **Resumen de alertas en el backend.** Un endpoint con conteos por severidad y tipo reemplazaría los 7 pedidos de conteo del Monitor (D-FE11). Registrado como **PB-3** en "Pedidos al backend" de `docs/inventario/brechas-front.md`; no frena nada | — |
| P-FE3 | **Cerrado (18/11/2026).** Orden del listado: `FechaCreacion` descendente, con `Id` descendente como desempate (`OperationalAlertService.cs:72-75`, relevado por el Orquestador e incorporado a `docs/inventario/backend.md`). "Más nuevas primero" está garantizado; no se reordena en el cliente | — |
| P-FE4 | **Cerrado (18/11/2026).** `ventanaAlertasDias` **no** limita el listado: es la ventana hacia atrás del job de control para elegir candidatas (`DetectorDeAlertas.cs:158-164`). Sin `desde`/`hasta` no hay filtro implícito de fecha. Si algún día se muestra ese dato, es de la spec 11 (Configuración) | — |
| P-FE5 | **Datos de prueba de dinero.** El desarrollador necesita al menos una alerta de dinero abierta en la base de desarrollo para la verificación 7 (por ejemplo, finalizando una ocupación sin pago y esperando la corrida del job de 5 minutos) | 2 |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FE-L1 | Que existan en `develop` las piezas de la 02 y la 04 con los nombres de esta spec: `useTenantDates` (con `dateRangeToInstants` y `formatInstant`), `usePagination`, `normalizePaged`, `toTablePaginationProps`, `cleanParams`, `optionsOf`/`labelOf`/`colorOf`, `SeveridadAlerta`, `TipoAlertaOperativa`, `formatNumber` y `buildTrazabilidadPath` | Si falta algo o cambió el nombre, usar el nombre real y anotarlo. Si falta una función (no un nombre), **frenar** |
| P-FE-L2 | Que `buildTrazabilidadPath({ ocupacionId, cajaSesionId })` acepte los dos ids y devuelva una ruta con ambos | Si solo acepta uno, linkear por `ocupacionId` y anotarlo |
| P-FE-L3 | Que `eslint.config.js` tenga las excepciones de D-FB9 para las dos páginas | Si no las tiene, no hay nada que sacar: anotarlo |

**Resultado de la ejecución (19/11/2026).**

| Id | Resultado |
|---|---|
| P-FE-L1 | Resuelto: existen con esos nombres `useTenantDates` (`dateRangeToInstants`, `formatInstant`), `usePagination`, `normalizePaged`, `toTablePaginationProps`, `cleanParams`, `optionsOf`/`labelOf`/`colorOf`, `SeveridadAlerta`, `TipoAlertaOperativa`, `formatNumber` y `buildTrazabilidadPath` |
| P-FE-L2 | Resuelto: `buildTrazabilidadPath` acepta `ocupacionId` y `cajaSesionId` juntos (`/trazabilidad?ocupacionId=12&cajaSesionId=7`) |
| P-FE-L3 | Resuelto: las excepciones de `OperationalAlerts.jsx` y `OperationalDashboard.jsx` estaban en `eslint.config.js` y se sacaron |
| P-FE5 | **Sigue abierto** (datos de prueba de dinero): lo resuelve el desarrollador. Las aceptaciones manuales del paso 2 y 3 y la verificación 7 los corre él |
| 4.3 | Queda para el desarrollador: el rebase sobre `develop` y el control final de `git diff develop` |

Decisiones de implementación que la spec no detalla (no cambian ninguna decisión): (a) el refresco automático decide con el momento del **último intento** y no el de la última carga correcta, para no reintentar cada 30 s después de un fallo; el "Actualizado:" muestra la última carga correcta; (b) las respuestas fuera de orden se descartan con el flag `ignore` de la limpieza del efecto (equivale al contador en un `useRef` que pide D-FE5 y es el patrón de Trazabilidad); (c) `?estado=` de la URL acepta `true`, `false` o vacío (todas); (d) `Grid` pasa a la API `size` de MUI 7 (el `item xs md` anterior no tenía efecto); (e) se suma `sumCounts` y los grupos de tipos del Monitor en `src/utils/alertas.js` para probarlos sin React.

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01). Si un paso los necesita, se frena.

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Lógica pura de alertas: `buildAlertQuery`, `parseAlertFiltersFromSearch`, `getResolveState`, `buildResolveBody`, `resolutionSummary`, `getAlertLinks`, `ALERTS_REFRESH_MS` | `src/utils/alertas.js` | D-FE5 a D-FE10, D-FE12 |
| Lógica de refresco (`isStale`) y hook | `src/utils/autoRefresh.js`, `src/utils/useAutoRefresh.js` | D-FE12 |
| Tests | `test/unit/utils/alertas.test.js`, `test/unit/utils/autoRefresh.test.js` | D-FA4 |
| Manual de esta spec | `docs/manual/frontend/05-alertas.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/api/operationalAlertsApi.js` | Reescrito: `listAlertas`, `getAlerta`, `resolveAlerta`, `countAlertas` | D-FE4 |
| `src/pages/OperationalAlerts.jsx` | Listado paginado, filtros, resolución, enlaces, refresco, fechas del tenant | D-FE5 a D-FE10, D-FE12, D-FE13 |
| `src/pages/OperationalDashboard.jsx` | Sin widget de caja, indicadores por `total`, `allSettled`, refresco | D-FE3, D-FE11, D-FE12, D-FE13 |
| `eslint.config.js` | Se sacan las excepciones de `OperationalAlerts.jsx` y `OperationalDashboard.jsx` | D-FE13 |
| `src/auth/routes.js` | Solo el comentario P-FA4 de `/operaciones` (ya no mezcla caja) | D-FE3 |
| `docs/specs/README.md` | Fila 05: estado, "Depende de" `02, 04` y rama | Metodología |
| `CLAUDE.md` | Solo si queda falsa una frase sobre `operationalAlertsApi.js` o las pantallas de alertas. **No se toca** la línea "Backend endpoints used" (la reemplaza la 02) | Metodología |

### 5.3 Se borran

Nada se borra. Los métodos `getAll` y `resolve` de `operationalAlertsApi.js` se reemplazan (D-FE4).

### 5.4 No se tocan

`src/api/pagosApi.js` y `src/pages/CajaDiaria.jsx` (08 y 09), `src/constants/enums.js`, `src/utils/fechas.js`, `src/utils/trazabilidadLink.js` y el resto de las páginas.

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-alertas` (creada desde `develop`; nunca se trabaja sobre `develop`), en el worktree `../parkingcontrol-front-alertas`. Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde, el paso tildado en esta spec, el manual al día y un commit confirmado por el chat Orquestador.
- **Ruteo de consultas.** El ejecutor **no corre comandos de terminal** y **no le pregunta nada al usuario en su chat**. Todo va por `SendMessage` al chat `Orquestador`: (1) los comandos a correr, con el comando exacto y su carpeta; (2) la confirmación de cada paso y de cada commit (la da el Orquestador); (3) cualquier decisión imprevista. Después espera la respuesta.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena, se anota en la sección 4 y se consulta al Orquestador**. Lo único que el ejecutor resuelve solo es P-FE-L1, P-FE-L2 y P-FE-L3.
- No se leen ni se muestran el `.env` ni secretos. No se toca el backend.
- Ningún test depende de la zona del sistema: la zona se pasa explícita.

### Paso 0 — Preparación (manual)

Los comandos de este paso los ejecuta el desarrollador; el ejecutor se los pide **a través del Orquestador** (regla de ruteo de la sección 6), con el comando exacto y la carpeta.

- [x] **0.1 (paso manual)** Confirmar que la 02 y la 04 están **mergeadas en `develop`** y que esta spec también. Comandos, en la carpeta `parkingcontrol-front`: `git branch -a` y `git log --oneline develop -5`.
- [x] **0.2 (paso manual)** Crear el worktree, en la carpeta `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-alertas -b feature/front-alertas develop`. En el worktree: copiar el `.env` (no está versionado) y correr `npm install`.
- [x] **0.3** Resolver P-FE-L1: confirmar en el worktree que existen las piezas de la 02 y la 04 que usa esta spec, con sus nombres.

  *Aceptación:* el Orquestador confirma 0.1 y 0.2; el ejecutor informa el resultado de P-FE-L1. Si 02 o 04 no están en `develop`, **no se sigue**.

### Paso 1 — Módulo de API y lógica pura

- [x] **1.1** Reescribir `src/api/operationalAlertsApi.js` (D-FE4), con el `typedef` de `Alerta`.
- [x] **1.2** Crear `src/utils/alertas.js` (`buildAlertQuery`, `parseAlertFiltersFromSearch`, `getResolveState`, `buildResolveBody`, `resolutionSummary`, `getAlertLinks`, `ALERTS_REFRESH_MS`) y `src/utils/autoRefresh.js` (`isStale`), con `test/unit/utils/alertas.test.js` y `test/unit/utils/autoRefresh.test.js`. Resolver P-FE-L2.

  *Aceptación:* `npm test` pasa con estos casos (zona `America/Montevideo` explícita):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `buildAlertQuery` con el estado por defecto | `resuelta: false`. Con estado `""` no hay `resuelta`; con `"true"`, `resuelta: true` |
  | 2 | `severidad: "4"` y `tipo: "10"` | Enteros `4` y `10`. Vacíos se omiten |
  | 3 | `desde: "2026-11-01"`, `hasta: "2026-11-01"` | `desde: 2026-11-01T03:00:00.000Z`, `hasta: 2026-11-02T02:59:59.999Z` (inclusivo). Solo `desde` o solo `hasta` también funcionan |
  | 4 | `desde: "2026-11-05"`, `hasta: "2026-11-01"` | `{ ok: false }` con el mensaje de rango; no devuelve params |
  | 5 | `page` y `pageSize` | Se pasan tal cual; `ocupacionId` y `cajaSesionId` se pasan como enteros |
  | 6 | `parseAlertFiltersFromSearch("?severidad=4&ocupacionId=12&tipo=4")` | `severidad: 4`, `ocupacionId: 12`; el `tipo=4` (retirado) se ignora. `?ocupacionId=abc` y `?ocupacionId=-1` se ignoran |
  | 7 | `getResolveState` con la alerta resuelta | `visible: false` |
  | 8 | Sin `alertas.resolver` (alerta de dinero o no) | `visible: false` |
  | 9 | Con `alertas.resolver`, alerta no de dinero, sin `alertas.resolver_dinero` | `visible: true, enabled: true` |
  | 10 | Con `alertas.resolver`, `esDeDinero: true`, sin `alertas.resolver_dinero` | `visible: true, enabled: false` y un `reason` no vacío |
  | 11 | Con `alertas.resolver` y `alertas.resolver_dinero`, `esDeDinero: true` | `visible: true, enabled: true` |
  | 12 | `buildResolveBody` de dinero con `""` y con `"   "` | `{ ok: false }`. Con `" ok "` da `{ ok: true, body: { comentario: "ok" } }` |
  | 13 | `buildResolveBody` no dinero con `""` | `{ ok: true, body: {} }` (sin `comentario`). Con 501 caracteres, `{ ok: false }`; con 500, ok |
  | 14 | `resolutionSummary` de una alerta resuelta por una persona, de una `resolucionAutomatica: true`, con y sin `comentarioResolucion`, y de una abierta | Texto con el nombre; texto "automáticamente" (sin nombre); el comentario solo si existe; `null` para la abierta |
  | 15 | `getAlertLinks` con `ocupacionId: 12`, `cajaSesionId: 7` y `canTrazabilidad: true` | Un enlace a Trazabilidad cuya ruta sale de `buildTrazabilidadPath` con los dos ids. Con `canTrazabilidad: false` no hay enlace. Sin ids no hay enlace |
  | 16 | `isStale(null, now, 300000)`, `isStale(now − 299999, …)` y `isStale(now − 300000, …)` | `true`, `false`, `true` |

  `npm run lint` y `npm run build` pasan (las dos pantallas siguen usando la API vieja hasta el paso 2: para que el commit quede en verde, este paso no elimina nada que ellas usen; si el build se rompe por `getAll`/`resolve`, se hacen 1.1 y los pasos 2 y 3 en el mismo commit y se anota).

### Paso 2 — Pantalla de Alertas

- [x] **2.1** Reescribir `src/pages/OperationalAlerts.jsx`: filtros (D-FE5, D-FE6), paginación, contador, sin tarjetas (D-FE7), filas (D-FE9), enlaces (D-FE10), diálogo de resolución y 409 (D-FE8), refresco (D-FE12) con `src/utils/useAutoRefresh.js`.
- [x] **2.2** Sacar la excepción de lint de la página (D-FE13) y resolver P-FE5 (alerta de dinero de prueba).

  *Aceptación (manual, backend en `develop` y `npm run dev`):* (1) la lista carga y muestra `total`; (2) cambiar el tamaño de página y avanzar de página llama a la API con `page` y `pageSize` correctos (Network); (3) cada filtro se manda con el valor esperado y el filtro de días manda instantes con `Z` y `hasta` en `…:59.999Z`; (4) `/alertas-operativas?severidad=4&ocupacionId=1` abre con esos filtros; (5) resolver una alerta no de dinero sin comentario funciona; (6) una de dinero no se deja enviar sin comentario y manda `comentario` recortado; (7) la fila resuelta se reemplaza con la respuesta y muestra quién y cuándo; (8) resolver en dos pestañas la misma alerta: la segunda muestra el `title` del 409 y la fila queda "Resuelta por …"; (9) con `operado@demo.test` una alerta de dinero muestra el botón deshabilitado con el aviso, y con `dueno@demo.test` se puede resolver; (10) "Ver trazabilidad" aparece con `dueno@demo.test` y no con `encargado@demo.test` ni `operado@demo.test`; (11) hay un solo pedido por carga y no se duplican por el refresco; (12) `git diff develop` no deja `fmtDate`, `toLocale`, `page: 1, pageSize: 50` ni números de severidad o tipo literales en la página. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 3 — Monitor operativo

- [x] **3.1** Reescribir `src/pages/OperationalDashboard.jsx` (D-FE3, D-FE11, D-FE12, D-FE13): sin caja, indicadores por `total`, `Promise.allSettled`, un único aviso de error, tarjeta de críticas a ancho completo, navegación con `?severidad=`.
- [x] **3.2** Sacar la excepción de lint de la página y actualizar el comentario P-FA4 de `src/auth/routes.js`.

  *Aceptación (manual):* (1) el Monitor carga sin llamar a `/Pagos/caja-diaria` (Network); (2) los cinco indicadores coinciden con los `total` de las consultas de la tabla de D-FE11; (3) con el backend devolviendo error en una consulta (por ejemplo bloqueando una URL en DevTools), el resto de las tarjetas carga y la que falló muestra "—", con **un solo** aviso; (4) la lista de críticas con error muestra "Reintentar"; (5) "Revisar" y "Ver todas" abren Alertas con severidad crítica ya aplicada; (6) la pantalla se actualiza sola a los 5 minutos con la pestaña visible, y no lo hace con la pestaña oculta; (7) no quedan `fmtDate`, `todayISO`, `money` ni `pagosApi` en la página. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 4 — Documentación y cierre

- [x] **4.1** Crear `docs/manual/frontend/05-alertas.md` (cómo funcionan el listado, la resolución con comentario, el permiso de dinero, el refresco, y la lista de lo que le queda a la 07 y a la 09).
- [x] **4.2** Revisar `CLAUDE.md` (solo frases falsas sobre alertas; **no** la línea "Backend endpoints used") y actualizar `docs/specs/README.md`: fila 05 en "Terminada" **una vez mergeada a `develop`**, con "Depende de" `02, 04`.
- [ ] **4.3** Rebase sobre `develop` y revisar que no queden excepciones de lint de las dos páginas.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; el manual existe; el `git diff develop` solo toca los archivos de las secciones 5.1 y 5.2.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | `/alertas-operativas` con más de 20 alertas | Pagina de a 20; el contador muestra el `total`; el cambio de página y de tamaño llega bien a la API |
| 3 | Filtros: estado, severidad, tipo, rango de días | Cada uno se envía y filtra; el rango usa la zona del tenant con `hasta` inclusivo |
| 4 | Tipos 5 a 12 | Aparecen con su etiqueta, nunca como número ni "Tipo desconocido" |
| 5 | Resolver una alerta no de dinero | 200; la fila queda resuelta con la respuesta de la API; el comentario es opcional |
| 6 | Resolver una alerta de dinero sin comentario | No se envía; con comentario se resuelve |
| 7 | `operado@demo.test` ante una alerta de dinero | Botón deshabilitado con explicación; con `dueno@demo.test`, habilitado (requiere P-FE5) |
| 8 | Resolver la misma alerta desde dos pestañas | La segunda recibe el 409 `alerta_resuelta`, muestra su `title` y refresca la fila |
| 9 | Enlace a Trazabilidad | Solo con `auditoria.ver`; la URL sale de `buildTrazabilidadPath`; con `ocupacionId` y `cajaSesionId` van los dos |
| 10 | Monitor operativo | Sin widget de caja y sin llamada a `/Pagos/caja-diaria`; indicadores exactos; con una consulta caída, las demás cargan |
| 11 | Refresco | Cada 5 minutos con pestaña visible; ninguno con pestaña oculta; un fallo automático no apila avisos |
| 12 | Búsqueda de `fmtDate`, `todayISO`, `money`, `toLocale` y `getAll` en las dos páginas y en la API | Sin coincidencias |
| 13 | `git diff develop` sobre `pagosApi.js` y `CajaDiaria.jsx` | Vacío |

**No verificable con los usuarios demo:** el rol `AUDITOR` (P-FA9; lo cubren los tests de `getResolveState` y `getAlertLinks`) y, sin P-FE5, las alertas de dinero reales (las cubren los tests de los casos 7 a 13 del paso 1).

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador aprobó todas las decisiones (D-FE1 a D-FE13, incluidos DV-FE1 y DV-FE2); no queda ninguna en Propuesta. Pendientes cerrados: P-FE3 y P-FE4. Quedan abiertos, sin frenar: P-FE1 (enlaces de la 07 y la 09), P-FE2 (PB-3 del backend) y P-FE5 (alerta de dinero de prueba).

**Condición de arranque:** la 02 y la 04 implementadas y mergeadas en `develop`, y esta spec aprobada y mergeada. Hasta entonces no se crea el worktree.

**Ejecución:** un chat por bloque, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-alertas` (rama `feature/front-alertas`).

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 y 1 | Sonnet | bajo | Lógica pura con tests: el criterio de aceptación es la tabla de casos. Si `buildTrazabilidadPath` no se comporta como pide P-FE-L2, anota y avisa |
| B | 2 | Sonnet | medio | Es el paso con más estado (filtros, respuestas fuera de orden, resolución, 409). Si algo obliga a una decisión no prevista, **frena** y consulta al chat Orquestador |
| C | 3 y 4 | Sonnet | bajo | Mecánico sobre lo ya decidido. Frena al terminar cada paso y espera la confirmación del desarrollador |

**Prompt para cada chat de ejecución** (cambiar `PASOS` por "0 y 1", "2" o "3 y 4"):

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-alertas` (rama `feature/front-alertas`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Leé `CLAUDE.md` y `docs/specs/frontend/05-alertas.md`, y las specs 02 y 04 ya implementadas. Ejecutá **los pasos PASOS** de esa spec, de a uno, siguiendo las reglas de la sección 6. Al terminar cada paso, frená y esperá la confirmación del chat `Orquestador` antes de seguir. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No corras comandos de terminal y no le preguntes nada al usuario en tu chat: todo (comandos con su carpeta exacta, confirmaciones de paso y de commit, decisiones que la spec no prevé) va por SendMessage al chat `Orquestador`, y después esperás su respuesta. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit al Orquestador, sin `Co-Authored-By` ni atribución de IA. Respondé en español rioplatense.
