# 04 — Trazabilidad: línea de tiempo de eventos (reemplaza a Auditoría)

> Frontend · **Terminada** (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) · `feature/specs-etapa2` (esta spec; la comparten otros redactores) y `feature/front-trazabilidad` (ejecución, en el worktree `../parkingcontrol-front-trazabilidad`, a crear desde `develop` cuando estén mergeadas la 02 y esta spec) · Última actualización 19/11/2026
>
> Cuarta spec del frontend. `GET /Auditoria` ya no existe en el backend (404): la pantalla de Auditoría no carga nada hoy. Esta spec la reemplaza por Trazabilidad, que une en una sola línea de tiempo los eventos de auditoría, pagos, devoluciones, caja y alertas. **Depende de la 02** (fechas con zona del tenant, enums, paginación, patrón de módulos de API): usa sus funciones por nombre y no puede arrancar hasta que esté implementada y mergeada.

## 1. Objetivo y alcance

**Objetivo.** Que un usuario con `auditoria.ver` (DUENO y AUDITOR) vea qué pasó, quién lo hizo y cuándo, filtrando por un objeto (ocupación, pago, sesión de caja), por usuario, por fuente y por rango de días; y que las demás pantallas puedan **abrir esa vista ya filtrada** con un enlace (D-FD5).

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Pantalla | `Trazabilidad.jsx`: filtros, listado paginado de eventos, estado de carga claro y detalle por evento | D-FD7, D-FD9 |
| Enlace profundo | Contrato `/trazabilidad?ocupacionId=12` y función `buildTrazabilidadPath`; los filtros viven en la URL | D-FD5 |
| Validación previa | Las reglas de rango del backend se validan antes de llamar a la API | D-FD6 |
| Filtro por usuario | Selector alimentado por `GET /Usuarios` | D-FD8 |
| Antes y después | Diferencias campo por campo, con JSON como alternativa | D-FD10 |
| Enums de string | `Fuente` y `AccionTrazabilidad` en `enums.js`, tolerantes a la mayúscula | D-FD4 |
| Módulo de API | `src/api/trazabilidadApi.js` con el patrón D-FB14 | D-FD12 |
| Ruta y menú | `/trazabilidad`, "Trazabilidad"; `/auditoria` redirige | D-FD3 |
| Retiro | `Auditoria.jsx` completo (con `fmtDate`, `ACCION`, los `toISOString` y su excepción de lint) | D-FD13 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Poner los enlaces a Trazabilidad en Alertas, Ocupaciones, Pagos y Caja | Specs 05, 07, 08 y 09, usando el contrato de D-FD5. Solo pueden hacerlo cuando esta spec esté mergeada |
| Filtro por `entidad` + `entidadId` (ver la historia de un Cliente o una Cochera) | No existe en `/Trazabilidad`; es una pérdida respecto de `/Auditoria` (P-FD5) |
| Exportar a CSV o imprimir | Sin pedido |
| Enlaces desde un evento hacia la pantalla del objeto (ir a la ocupación, al pago) | Las pantallas de destino se rehacen en las specs 07 a 09. Acá un evento solo filtra la misma pantalla (D-FD9) |
| Rediseño visual | Después, con el diseño de Claude Design |
| Corregir el rendimiento del backend (P-TR2) | Backend. El frontend solo muestra la espera (D-FD7) |

**Estado de alcance.** Etapa 2 del frontend (conectar la funcionalidad del backend antes del diseño nuevo). No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop`; backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1 (`/Trazabilidad`) | Filtros, reglas de 400, forma de `Evento`, valores de `fuente` y `accion`, forma de `detalle` por fuente | 18/11/2026 |
| `docs/inventario/backend.md`, sección 0 | `fuente`, `accion` y `detalle` son strings; instantes con `Z`; errores con `errors` en minúscula para `fuente` y `ocupacionId` | 18/11/2026 |
| `docs/inventario/backend.md`, sección 5 | `hasta` inclusivo en Trazabilidad; límite de 31 días (31 exactos pasan), que solo rige sin `ocupacionId`, `pagoId` ni `cajaSesionId` | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 1 (`/Usuarios`) y 3 | `GET /Usuarios` devuelve `Usuario[]` (no paginado) con `usuarios.ver`; `auditoria.ver` y `usuarios.ver` | 18/11/2026 |
| `docs/inventario/brechas-front.md` | `GET /Auditoria` retirado; reparto de la 02 | 18/11/2026 |
| Spec 02 (`02-base-comun.md`, **Aprobada, todavía sin implementar**) | `dateRangeToInstants`, `useTenantDates`, `usePagination`, `normalizePaged`, `toTablePaginationProps`, `cleanParams`, `paramsSerializer` (`fuente=A&fuente=B`), `enums.js` (`defineEnum`, `labelOf`, `colorOf`, `labelOfKey`, `optionsOf`), `formatMoney`, patrón D-FB14, tabla 5.4 | 18/11/2026 |
| Spec 01 | `showApiError`, `ApiError`, `usePermissions().can`, mapa `PRIVATE_ROUTES`, `RequirePermission`, Vitest solo para lógica pura (D-FA4) | 09/11/2026 |
| Lectura de `src/pages/Auditoria.jsx`, `src/auth/routes.js`, `src/App.jsx`, `src/auth/RequireAuth.jsx`, `test/unit/auth/routes.test.js` | Qué se retira y qué se toca (sección 5). `RequireAuth` ya conserva `location.search` en `returnTo` | 18/11/2026 |

**Nombres de la 02.** Como la 02 todavía no está implementada, los nombres de sus funciones salen de su spec. El ejecutor los confirma contra `docs/manual/frontend/02-base-comun.md` y el código mergeado (P-FD-L3).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Llamada | `Auditoria.jsx:110` hace `GET /Auditoria?...` con `entidad`, `entidadId`, `usuarioId`, `desde`, `hasta` y `take` (hasta 200). Responde 404 |
| Fechas | `fmtDate` con `toLocaleString()` (l. 32) y `new Date(desde).toISOString()` en l. 104–105: zona del navegador |
| Acciones | `ACCION` mapea enteros 1 a 4 (CREAR, EDITAR, CANCELAR, ANULAR PAGO). La fuente nueva manda strings |
| Pantalla | Filtros por texto libre (entidad, id, usuario), lista de tarjetas, un resumen contando por acción **solo de la página cargada**, y un diálogo con `datosAntesJson` y `datosDespuesJson` en JSON |
| Sin paginación | Un solo pedido con `take` |
| Ruta y permiso | `/auditoria` con `auditoria.ver` en `src/auth/routes.js`; `PAGES` de `App.jsx` la importa. El test `test/unit/auth/routes.test.js` nombra `/auditoria` (l. 17, 23 y 24) |

## 3. Decisiones

Prefijo **D-FD** ("frontend, trazabilidad"). Estado: **Confirmada** (la tomó el desarrollador o está fijada por una fuente) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva). **Al aprobarse la spec (18/11/2026), todas las decisiones pasaron a Confirmada**; las respuestas del desarrollador a las tres preguntas quedaron anotadas en D-FD3, D-FD6 y D-FD9. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y base

**D-FD1 (18/11/2026) — Confirmada. Ramas y ejecución.** Esta spec vive en `feature/specs-etapa2`. La ejecución va en `feature/front-trazabilidad`, en el worktree `../parkingcontrol-front-trazabilidad` creado desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que la 02 esté implementada y mergeada en `develop`**: sin `fechas.js`, `enums.js`, `paginacion.js` y `params.js`, esta spec no compila.
*Motivo:* es el mecanismo de la 01 y la 02 (un worktree por ejecución, para que un cambio de rama en un chat no mueva los archivos de otro).

**D-FD2 (18/11/2026) — Confirmada. Se reemplaza la pantalla.** `GET /Trazabilidad` con el permiso `auditoria.ver` (DUENO y AUDITOR) sustituye a `GET /Auditoria`, que da 404. Se crea `Trazabilidad.jsx` y se **borra** `Auditoria.jsx`; no se mantiene ninguna compatibilidad con el endpoint viejo. El permiso del mapa de rutas no cambia.
*Motivo:* el backend retiró el endpoint y su forma de datos (enteros, `datosAntesJson`); reutilizar el archivo sería reescribirlo entero igual.

**D-FD3 (18/11/2026) — Confirmada (opción A). Ruta `/trazabilidad`, menú "Trazabilidad", y `/auditoria` redirige.** La entrada de `PRIVATE_ROUTES` pasa a `{ path: "/trazabilidad", label: "Trazabilidad", permiso: "auditoria.ver" }`. `App.jsx` suma una ruta `/auditoria` que hace `<Navigate to="/trazabilidad" replace />`, fuera del mapa (así no genera un segundo ítem de menú) y sin conservar el query (la ruta vieja no tenía parámetros útiles). `PAGES` cambia su clave. Se actualiza `test/unit/auth/routes.test.js` (l. 17, 23 y 24).
Opciones y costos:

| Opción | A favor | En contra |
|---|---|---|
| **A. `/trazabilidad`, "Trazabilidad", redirect de `/auditoria`** (propuesta) | La URL, el menú y el contrato de enlace dicen lo mismo que el backend; los marcadores viejos siguen funcionando | Una ruta más en `App.jsx` |
| B. Mantener `/auditoria` y "Auditoría" | Cero cambios en rutas y tests | El nombre ya no describe la pantalla (muestra pagos, caja y alertas, no solo auditoría) y los enlaces de las otras specs dirían `/auditoria?ocupacionId=12` |
| C. `/trazabilidad` con menú "Auditoría y trazabilidad" | Conserva el término que el usuario ya conoce | Etiqueta larga en el menú; dos nombres para una pantalla |

*Respuesta del desarrollador (18/11/2026):* opción A, ruta `/trazabilidad`, menú "Trazabilidad" y `/auditoria` redirige. El contrato de D-FD5 depende de la ruta solo por una constante (`TRAZABILIDAD_PATH`).

**D-FD4 (18/11/2026) — Confirmada. Enums de string en `enums.js`.** Según la 02 (alcance: "Enums de tipo string"), esta spec suma al mismo módulo, con la misma forma, dos enums:

| Enum | Entradas (valor · etiqueta · color) |
|---|---|
| `Fuente` | `AUDITORIA` Auditoría `info` · `PAGO` Pago `success` · `DEVOLUCION` Devolución `warning` · `CAJA` Caja `secondary` · `ALERTA` Alerta `error` |
| `AccionTrazabilidad` (20) | De AUDITORIA: `CREAR` Crear `success` · `EDITAR` Editar `info` · `CANCELAR` Cancelar `warning` · `FINALIZAR` Finalizar `info` · `INVITAR` Invitar usuario · `CAMBIAR_ROL` Cambio de rol · `DESACTIVAR` Desactivar `warning` · `REACTIVAR` Reactivar `success` · `REENVIAR_INVITACION` Reenvío de invitación · `BORRAR` Borrar `error` · `AJUSTAR_PRECIO` Ajuste de precio `warning` · `PROGRAMAR_BAJA` Baja programada `warning`. De PAGO: `PAGADO` Pago registrado `success` · `ANULADO` Pago anulado `error`. De DEVOLUCION: `DEVOLUCION` Devolución `warning`. De CAJA: `APERTURA` Apertura de caja · `CIERRE` Cierre de caja · `REAPERTURA` Reapertura de caja. De ALERTA: `RESOLUCION` Alerta resuelta `success` · `RESOLUCION_AUTOMATICA` Alerta resuelta automáticamente |

- **El `value` de cada entrada es el string canónico en mayúsculas.** El backend manda la acción de AUDITORIA `Finalizar` (F mayúscula, resto minúscula; inventario). La pantalla nunca busca el valor crudo: pasa siempre por `canonicalKey(s)` (`String(s).trim().toUpperCase()`, de `trazabilidadEvento.js`) antes de `labelOf` y `colorOf`. Así `Finalizar` muestra "Finalizar" y, si el backend corrige la mayúscula (P-FD4), no hay que tocar el front. Lo mismo para `fuente`.
- Un valor desconocido (el backend agrega acciones sin avisar) se muestra tal cual con `labelOf` y color `default`; no rompe nada.
- Las colisiones de nombre entre enums (`DEVOLUCION` es una fuente y también una acción) no importan: son enums distintos.
- El enum de acciones es uno solo, no uno por fuente: los 20 valores son únicos entre fuentes. El filtro de la pantalla es por **fuente**; el backend no filtra por acción.
- Un test compara los dos enums contra la tabla de la sección 1 del inventario, como los demás enums (D-FB11).
- *A verificar al ejecutar:* P-FD-L1 (que `defineEnum` de la 02 admita `value` de tipo string).

*Motivo:* la 02 lo deja a cargo de esta spec; el backend mezcla mayúsculas y la normalización en un solo lugar evita un `switch` por pantalla.
*Descartados:* (a) un enum de acciones por fuente (duplica entradas y obliga a saber la fuente para etiquetar); (b) comparar contra el string crudo (rompe con `Finalizar` y con cualquier corrección del backend); (c) enteros propios del front para mapear (inventa un contrato que el backend no tiene).

### 3.2 Contrato de enlace profundo y filtros

**D-FD5 (18/11/2026) — Confirmada. Contrato de enlace profundo y filtros en la URL.** Es la decisión que usan las specs 05, 07, 08 y 09; el contrato se comunicó al chat orquestador el 18/11/2026 apenas se definió.

*Ruta:* `/trazabilidad` (D-FD3).

*Parámetros* (los nombres son los de la API):

| Parámetro | Valor | Notas |
|---|---|---|
| `ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId` | Entero positivo | Si vienen varios, se aplican todos |
| `fuente` | `AUDITORIA`, `PAGO`, `DEVOLUCION`, `CAJA` o `ALERTA`; **repetible** (`fuente=PAGO&fuente=CAJA`) | Sin mayúsculas obligatorias al leer; se normaliza y se quitan repetidos |
| `desde`, `hasta` | `DateOnly` `yyyy-MM-dd`, en la zona del tenant | **No** son instantes: la pantalla trabaja por días y los convierte con `dateRangeToInstants` (D-FD6). Van juntos |
| `page`, `pageSize` | No van en la URL | La página y el tamaño son estado local |

*Ejemplos:* `/trazabilidad?ocupacionId=12` · `/trazabilidad?pagoId=40&fuente=PAGO&fuente=DEVOLUCION` · `/trazabilidad?cajaSesionId=7` · `/trazabilidad?usuarioId=3&desde=2026-11-01&hasta=2026-11-15`.

*Reglas del contrato:*
1. **Se enlaza con `buildTrazabilidadPath(filtros)`** (de `src/utils/trazabilidadLink.js`), nunca armando el texto a mano: así un cambio de ruta o de formato lo absorbe un solo archivo. Devuelve la ruta con el query en orden fijo (`ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId`, `fuente`, `desde`, `hasta`); omite lo vacío y lo inválido, y no lanza.
2. **Con `ocupacionId`, `pagoId` o `cajaSesionId`** la pantalla abre **sin rango** y busca sola (el backend no lo exige, D-FD6). **Sin ninguno de los tres y sin rango**, abre con el rango por defecto (D-FD6).
3. **Un parámetro inválido** (id que no es entero positivo, `fuente` desconocida, fecha mal formada, `desde` sin `hasta` o `desde` mayor que `hasta`) **se ignora** y la pantalla muestra un aviso "Ignoramos filtros del enlace que no eran válidos: …". Nunca rompe ni queda en blanco. Lo que sí se valida con error visible es el límite de 31 días (D-FD6): no se recorta en silencio.
4. **Permiso.** La ruta exige `auditoria.ver`. Quien enlace **debe mostrar el enlace solo si `usePermissions().can("auditoria.ver")`**: un ENCARGADO u OPERADOR no lo ve; no debe ver un enlace que termine en "No tenés permiso".
5. **Los filtros aplicados viven en la URL** (`useSearchParams` de `react-router-dom`). **Al entrar sin ningún parámetro, la pantalla escribe el rango por defecto en la URL con `replace: true`** (`/trazabilidad` pasa a `/trazabilidad?desde=2026-11-04&hasta=2026-11-10`), así la URL es siempre la fuente de verdad y "atrás" no vuelve a una URL sin filtros. Lo mismo hace "Limpiar" (vuelve al rango por defecto con `replace`). Consecuencia: un marcador o un enlace compartido conserva esas fechas y no "los últimos 7 días" del día en que se abra; es lo esperado en un enlace explícito. "Buscar" actualiza la URL con un `push` normal; recargar, usar "atrás" o compartir el enlace conserva el filtro. `RequireAuth` ya conserva `location.search` en `returnTo`, así que un enlace profundo sobrevive al redirect de Auth0 (a confirmar a mano, verificación 8).
6. No hay filtro por `alertaId` (el backend no lo ofrece). Para una alerta se enlaza por su `ocupacionId` o su `cajaSesionId`.
7. Solo se envían ids de objetos por la URL, nunca nombres ni datos personales.

*Piezas puras* (en `src/utils/trazabilidadLink.js`, con Vitest): `TRAZABILIDAD_PATH` (importada de `src/auth/routes.js`, donde la define el mapa de rutas), `buildTrazabilidadPath(filtros)` y `parseTrazabilidadQuery(search)` → `{ filtros, ignorados }`, simétricas (leer lo que se escribe devuelve lo mismo).
*Motivo:* un contrato único, con los nombres de la API, que otras cuatro specs pueden usar sin leer esta; con la URL como fuente de verdad, el enlace y el botón "Buscar" siguen el mismo camino y no hay dos formas de filtrar.
*Descartados:* (a) estado de navegación (`location.state`): se pierde al recargar y no se puede compartir; (b) `desde` y `hasta` como instantes en la URL: obliga a quien enlaza a conocer la zona del tenant y deja valores ilegibles; (c) un parámetro `q` genérico o `objeto=ocupacion:12`: inventa un formato que no coincide con la API; (d) que cada spec arme su string: cuatro copias del contrato.

**D-FD6 (18/11/2026) — Confirmada. Validación previa y rango por defecto.** Un módulo puro `src/utils/trazabilidadFiltros.js` (con Vitest) valida **antes** de llamar a la API las reglas que hoy el backend responde con 400 `datos_invalidos`, y arma los parámetros.

| Regla (backend) | Qué hace la UI | Código de error propio |
|---|---|---|
| `desde` y `hasta` van juntos | Si falta uno, error en el campo que falta | `rango_incompleto` |
| `desde <= hasta` | Error en `hasta` | `rango_invertido` |
| Sin `ocupacionId`, `pagoId` ni `cajaSesionId`: rango obligatorio | Error "Elegí un rango de fechas, o una ocupación, un pago o una sesión de caja" | `rango_obligatorio` |
| Sin ninguno de los tres: `hasta − desde` de **31 días como máximo** (31 exactos pasan) | Se mide **en instantes**, como el backend: `hasta − desde > 31 días` es error (con `dateRangeToInstants` y `inclusiveEnd`, 1 al 31 de octubre mide 31 días menos 1 ms y pasa; del 1 de octubre al 1 de noviembre son 32 días calendario y no pasa) | `rango_excede` |
| Con alguno de los tres: el límite de 31 días **no rige** | Un rango más largo es válido | — |
| Ids | Entero positivo | `id_invalido` |

Cuando el rango pasa por un cambio de horario, medirlo en instantes puede dar 31 días y 1 hora aunque sean 31 días de calendario. Hoy ninguna de las 12 zonas permitidas tiene horario de verano (inventario, sección 5), así que no ocurre; medir como el backend evita un 400 inesperado si cambia la tzdata. El mensaje del error dice "El rango máximo es de 31 días".
`toApiParams(filtros, timeZone)` devuelve el objeto para `trazabilidadApi.js`: ids como números, `fuente` como arreglo, `desde` y `hasta` como instantes de `dateRangeToInstants(desde, hasta, timeZone)` (inclusivo por defecto). La paginación (`page`, `pageSize`) la agrega la pantalla.

**Rango por defecto** (cuando se entra sin ningún id ni rango en la URL): **los últimos 7 días de calendario, incluido hoy**: `hasta = todayInZone(tz)` y `desde = addDays(hasta, -6)`. Se muestra en los campos y la pantalla busca sola al entrar, como hace hoy Auditoría. `defaultFiltros(timeZone, now)` es puro.
*Respuesta del desarrollador (18/11/2026):* últimos 7 días, incluido hoy. Alternativas descartadas: solo hoy (más rápido, ~una fracción de los 2,5 s del peor caso), o 31 días (el máximo, el más lento).
*Motivo:* el backend rechaza la consulta sin rango; si la UI deja llegar el 400, el usuario ve un error por una regla que podía evitarse. Un rango corto por defecto hace la primera carga rápida.
*Descartados:* (a) no validar y mostrar el `title` del 400 (el mensaje del backend no dice cómo corregirlo y se pierde un pedido de hasta 2,5 s); (b) recortar el rango en silencio a 31 días (el usuario creería que ve todo); (c) abrir vacío y esperar "Buscar" (un paso más para el caso más común); (d) el rango de 31 días por defecto (la carga más lenta para el caso de uso más común).

### 3.3 Carga, usuarios y detalle

**D-FD7 (18/11/2026) — Confirmada. Estado de carga y rendimiento.** El backend tarda unos 2,5 s con un rango de 31 días y mucho volumen (P-TR2, no lo arregla esta spec). La pantalla:
- Mientras carga muestra una barra de progreso indeterminada (`LinearProgress`) **y** esqueletos de filas (como `LoadingList` en la pantalla vieja), y el botón "Buscar" queda deshabilitado, para no disparar pedidos paralelos.
- Si pasan más de 1,5 s, suma el texto "Buscando eventos… un rango largo puede tardar unos segundos."
- Descarta respuestas viejas con el contador de pedido que ya usa `Auditoria.jsx` (`reqIdRef`): cuando llega una respuesta de un pedido que ya no es el último, se ignora y no toca el estado.
- Ante un error llama a `showApiError(e)` y muestra, en lugar de la lista, un aviso con el botón "Reintentar" (manual, nunca automático: un 503 `servidor_ocupado` es reintento manual en la 01).
- Con `servidor_ocupado` o `tiempo_agotado` (20 s de la 01) no se vacían los filtros.
- Cambiar los filtros vuelve a la página 1 (`reset` de `usePagination`); cambiar de página o de tamaño no pierde los filtros. Tamaño por defecto **50** (el del backend; el máximo es 100): `usePagination({ pageSize: 50 })`, con `PAGE_SIZE_OPTIONS` de la 02 (10, 20, 50 y 100).
- El total de resultados sale de `total` de la respuesta. **Se elimina** el "resumen por acción" de la pantalla vieja: contaba solo la página cargada y, con paginación, daría un número engañoso.
*Motivo:* una espera de segundos sin indicación parece un cuelgue y el usuario vuelve a apretar el botón.
*Descartados:* (a) cancelar el pedido con `AbortController`: depende de cómo `normalizeError` de la 01 trata una cancelación (podría mostrar un toast por un pedido que el usuario mismo cambió) y el contador de pedido logra lo mismo sin tocar la 01; (b) reintento automático (no es seguro y la 01 lo descarta); (c) mantener los resultados anteriores atenuados mientras carga (mostraría datos que ya no corresponden a los filtros).

**D-FD8 (18/11/2026) — Confirmada. Filtro por usuario con selector, y quién crea `usuariosApi.js`.** `GET /Usuarios` exige `usuarios.ver`, que tienen DUENO y AUDITOR (y ENCARGADO), o sea que quien tiene `auditoria.ver` puede llamarlo. El filtro es un `Autocomplete` de MUI con `nombre` (y `email` en gris) y devuelve el `usuarioId`. Los usuarios inactivos aparecen con la marca "(inactivo)": la trazabilidad de alguien que ya no trabaja es justo lo que se busca. Reglas:
- La lista se pide **una vez** al entrar (`GET /Usuarios` no es paginado: `Usuario[]`) y solo si `can("usuarios.ver")`.
- Si el usuario no tiene `usuarios.ver`, o la llamada falla, el filtro cae a un campo numérico "ID de usuario", sin bloquear la pantalla. El error de esa llamada **no** abre un toast: la pantalla funciona sin el selector.
- Un `usuarioId` que viene de la URL y no está en la lista (o la lista no cargó) se muestra como "Usuario #3" y se aplica igual.
- **Coordinación con la spec 12.** `usuariosApi.js` es del recurso de la 12 (D-FB14, regla 7). Propuesta: **esta spec crea `src/api/usuariosApi.js` con una sola función, `listUsuarios()`** (devuelve `Usuario[]`, sin `normalizePaged`), y la 12 **agrega** las demás funciones al mismo archivo sin recrearlo. Quien ejecute segundo usa lo que encuentre. Si la 12 se mergea antes, esta spec solo importa `listUsuarios` y salta ese paso. **Confirmado por el chat orquestador el 18/11/2026 (P-FD1 cerrado)**; quedó anotado en `docs/inventario/brechas-front.md` ("Contratos entre specs").
Opciones:

| Opción | A favor | En contra |
|---|---|---|
| **A. Selector + esta spec crea `listUsuarios` en `usuariosApi.js`** (propuesta) | Buena experiencia; el módulo nace con una función real que usa una pantalla | Coordinación de propiedad del archivo con la 12 |
| B. Selector, pero esta spec espera a la 12 | Sin conflicto de archivo | Ata la 04 a la 12 y rompe el "independientes después de la 02" de las brechas |
| C. Solo campo numérico de ID | Cero dependencias | El usuario no sabe el ID de nadie; el filtro por usuario queda casi inutilizable |

*Motivo:* un filtro por usuario que pide un número que nadie conoce no sirve. Con el fallback, la pantalla no depende de que el selector funcione.

**D-FD9 (18/11/2026) — Confirmada (opción A). Cuánto detalle por evento.** El listado es una tabla simple (sin rediseño visual) con una fila por evento y estas columnas:

| Columna | Contenido |
|---|---|
| Fecha | `formatInstant(fecha, timeZone, { seconds: true })` (a un evento de auditoría le importa el segundo) |
| Fuente | Chip con `labelOf` y `colorOf` de `Fuente` |
| Acción | Chip con `labelOf` y `colorOf` de `AccionTrazabilidad` (vía `canonicalKey`) |
| Quién | `usuarioNombre`, o el chip "Automática" si `automatica` es verdadero (y no hay usuario) |
| Objeto | Chips de lo que traiga: `Ocupación #12`, `Pago #40`, `Caja #7`, `Alerta #5` y, si hay, `entidad · entidadId`. **Un clic en un chip** filtra la pantalla por ese objeto (actualiza la URL con `ocupacionId`, `pagoId` o `cajaSesionId`; el de alerta y el de entidad no filtran porque el backend no lo permite) |
| Resumen | Una línea armada por `resumenDeEvento` (abajo) |
| (acción) | Botón "Ver detalle" que abre un diálogo |

*Resumen de una línea* (`resumenDeEvento(evento)`, puro, con Vitest):
- PAGO y DEVOLUCION: `formatMoney(monto) · <método> · <motivo>` (el método con `labelOfKey(MetodoPago, metodo)`; sin motivo, se omite).
- ALERTA: `<tipo> · <comentario>` (el tipo con `labelOfKey(TipoAlertaOperativa, tipo)`).
- CAJA: los pares clave y valor del `detalle` que tengan valor, con los números en `formatMoney` (todos son dinero: fondos, efectivo y diferencias) y la clave legible (`humanizeKey`).
- AUDITORIA: `N campo(s) modificado(s)` (de las diferencias de D-FD10); sin `antes`, "Alta"; sin `despues`, "Baja".

*Diálogo de detalle* (accionado por "Ver detalle"): encabezado con fecha, fuente, acción y quién; los ids relacionados; y el contenido de `detalle` según la fuente: PAGO, DEVOLUCION, CAJA y ALERTA, como pares campo y valor (los mismos formatos de arriba, con `motivo` y `comentario` completos); AUDITORIA, con la tabla de diferencias de D-FD10.
Opciones:

| Opción | A favor | En contra |
|---|---|---|
| **A. Resumen de una línea en la tabla + diálogo con todo** (propuesta) | La lista se lee de un vistazo con 50 filas; el detalle completo está a un clic | Un clic más para ver el antes y después |
| B. Todo expandido en cada fila | Sin clics | Una página de 50 eventos de auditoría con tablas de diferencias es ilegible |
| C. Solo la tabla, sin detalle | Lo más simple | No se puede ver el motivo de una devolución ni qué se cambió, que es la razón de la pantalla |

*Respuesta del desarrollador (18/11/2026):* opción A, resumen de una línea en la tabla y diálogo "Ver detalle".

**D-FD10 (18/11/2026) — Confirmada. Antes y después: diferencias campo por campo, con el JSON como alternativa.** En el detalle de un evento de AUDITORIA se muestra una tabla `Campo | Antes | Después` con **todos** los campos del `antes` y del `despues`, **resaltando los que cambiaron** (los iguales se pueden ocultar con un interruptor "Solo los cambiados", activado por defecto). Un botón "Ver JSON" muestra los dos objetos crudos como hoy (`<pre>` con `JSON.stringify(obj, null, 2)`).

Reglas de `diffAntesDespues(antes, despues)` (puro, con Vitest):
- Compara el primer nivel de claves (unión de las de los dos objetos, en el orden del `despues` y después las que solo estaban en `antes`). Un valor anidado (objeto o arreglo) se compara y se muestra como JSON compacto, sin bajar de nivel.
- `antes` nulo (CREAR, INVITAR): todas las filas figuran como "agregado". `despues` nulo (BORRAR): todas como "quitado".
- Si el backend no pudo parsear (`antes` y `despues` en `null`, con el texto en `antesTexto` y `despuesTexto`), se muestran los dos textos tal cual, en bloques de texto, sin diferencias.
- Valores: `null` → "—", booleano → "Sí" o "No", texto que parece un instante UTC con `Z` (`yyyy-MM-ddTHH:mm:ss[.fff]Z`) → `formatInstant` con segundos en la zona del tenant, lo demás tal cual. **No se adivina** el significado de un número (un `1` en un campo de enum se muestra como `1`): la estructura de `antes` y `despues` no está documentada en el inventario (P-FD2).

*Datos personales (P-9 del backend).* El `antes` y el `despues` guardan el estado de una entidad completa, y las de Cliente y Usuario incluyen datos personales (nombre, email, documento, teléfono, según qué guarde el backend). El backend tiene el pendiente P-9 sobre el tratamiento de esos datos y todavía no lo resolvió. Hasta entonces, el frontend:
- los muestra **solo a quien tiene `auditoria.ver`** (DUENO y AUDITOR: la ruta ya está guardada);
- **no los guarda** en el navegador (no hay `localStorage`: lo prohíbe ESLint, D-FA11) **ni los manda a la consola** ni a la URL;
- **no los enmascara ni los oculta por su cuenta**: muestra lo que el backend manda, porque enmascarar sin saber qué campos son personales es adivinar. El JSON crudo queda detrás de "Ver JSON" para no mostrarlo por defecto;
- si P-9 se resuelve en el backend, el front muestra lo que llegue; si pide enmascarar en el cliente, es una decisión nueva con su spec.

Opciones:

| Opción | A favor | En contra |
|---|---|---|
| **A. Tabla de diferencias + "Ver JSON"** (propuesta) | Lo que cambió se ve sin leer dos JSON; el JSON queda para el caso raro | Más código que mostrar dos `<pre>` (una función pura probada) |
| B. Solo JSON antes y después, como hoy | Cero lógica | Hay que comparar a ojo dos objetos con 15 campos para ver que cambió uno |
| C. Diferencias profundas (campos anidados) | Más exacto | La estructura es desconocida (P-FD2); la complejidad no está justificada todavía |

*Descartados además:* una librería de diff de JSON (una dependencia para un caso de un nivel).

### 3.4 Módulo de API y retiro

**D-FD12 (18/11/2026) — Confirmada. `src/api/trazabilidadApi.js` con el patrón D-FB14.** Una función nombrada, `async`, que devuelve `data`:

```js
// src/api/trazabilidadApi.js — /api/v1/Trazabilidad
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { normalizePaged } from "../utils/paginacion.js";

/**
 * @typedef {{ fecha: string, fuente: string, accion: string, usuarioId?: number,
 *   usuarioNombre?: string, automatica: boolean, ocupacionId?: number, pagoId?: number,
 *   cajaSesionId?: number, alertaId?: number, entidad?: string, entidadId?: number,
 *   detalle: object }} EventoTrazabilidad
 * @param {{ ocupacionId?: number, pagoId?: number, cajaSesionId?: number, usuarioId?: number,
 *   fuente?: string[], desde?: string, hasta?: string, page?: number, pageSize?: number }} filters
 *   `desde` y `hasta` son instantes con Z (ya convertidos por la pantalla). Devuelve PagedResponse<EventoTrazabilidad>.
 */
export async function listTrazabilidad(filters = {}) {
  const { data } = await http.get("/Trazabilidad", { params: cleanParams(filters) });
  return normalizePaged(data);
}
```

El módulo no convierte fechas ni valida (D-FB14, regla 4): recibe los parámetros listos de `toApiParams`. `fuente` sale como `fuente=PAGO&fuente=CAJA` por el `paramsSerializer` de la 02 (D-FB15). `cleanParams` quita el arreglo vacío si la 02 lo contempla; si no, la pantalla no manda `fuente` cuando no hay ninguna elegida (`toApiParams` lo garantiza).
*Motivo:* un módulo por recurso, igual que el resto (D-FB14).

**D-FD13 (18/11/2026) — Confirmada. Retiro de `Auditoria.jsx` y de su excepción de lint.** Se borra `src/pages/Auditoria.jsx` entero. Con él se van las tres piezas que la tabla 5.4 de la 02 le asigna a esta spec: `fmtDate` (l. 32), los `new Date(x).toISOString()` de `desde` y `hasta` (l. 104–105) y `ACCION`. Se quita su entrada de las excepciones temporales de `eslint.config.js` (regla de `toLocale*`, D-FB9). Se actualizan `App.jsx` (el import y la clave de `PAGES`), `src/auth/routes.js` y `test/unit/auth/routes.test.js`.
*Motivo:* es lo que la 02 acordó. La pantalla nueva no usa `toLocale*`, así que no necesita excepción.

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FD1 | Inventario, sección 1 | La acción de AUDITORIA llega como `Finalizar` (con "sic") | El front normaliza con `canonicalKey` y declara `FINALIZAR` en el enum | El valor del backend es inconsistente con los demás (mayúsculas); la normalización lo absorbe sin pedir un cambio | Si el backend lo corrige (P-FD4), la normalización sigue valiendo y no hay que tocar nada |

### 4.2 Pendientes

**Del desarrollador o de otras specs (no frenan la ejecución salvo que se indique).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FD1 | **Cerrado (18/11/2026).** Quién crea `usuariosApi.js`: esta spec, con solo `listUsuarios()`; la 12 agrega sus funciones al mismo archivo sin recrearlo (confirmado por el chat orquestador, opción A de D-FD8) | — |
| P-FD2 | **Estructura de `antes` y `despues`, de `detalle` de CAJA y valores de `entidad`: no están en el inventario.** El paso 1.2 las relevan con una respuesta real de cada fuente (nombres de las claves, si los enums vienen como enteros y cómo vienen los instantes). Si difieren mucho de lo supuesto, se frena y se anota. Mientras tanto la pantalla muestra claves y valores crudos (D-FD10) | 1 |
| P-FD3 | **P-9 del backend (datos personales en `antes` y `despues`).** Abierto, no es de esta spec. Si se resuelve en el backend con un cambio de contrato, se revisa D-FD10 | — |
| P-FD4 | **Pedir al backend** que `Finalizar` salga como `FINALIZAR`. No bloquea (DV-FD1). Registrado como **PB-2** en `docs/inventario/brechas-front.md`, "Pedidos al backend" | — |
| P-FD5 | **Pérdida de función respecto de `/Auditoria`:** `/Trazabilidad` no filtra por `entidad` ni `entidadId`. No se puede ver la historia de un Cliente, una Cochera o una Tarifa; solo la de una ocupación, un pago o una sesión de caja. **El desarrollador aceptó (18/11/2026) salir sin ese filtro** y pedirlo al backend: registrado como **PB-1** en `docs/inventario/brechas-front.md`, "Pedidos al backend" | — |
| P-FD6 | **Orden con las specs 05, 07, 08 y 09:** sus enlaces a Trazabilidad solo se pueden poner cuando esta spec esté mergeada. Mientras tanto, esas specs dejan el enlace como paso pendiente o lo ejecutan después de la 04 | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FD-L1 | Que `defineEnum` de la 02 acepte `value` de tipo string | Si exige enteros, ampliar `defineEnum` y su test en `enums.js` para que admita strings, sin cambiar la forma de los enums existentes, y anotarlo en el manual |
| P-FD-L2 | La estructura real de `detalle` por fuente (P-FD2) con el backend en `develop` | Ajustar solo las etiquetas y el `humanizeKey`; si la estructura cambia el diseño (por ejemplo, `detalle` no es un objeto), **frenar** y anotar en la sección 4 |
| P-FD-L3 | Que los nombres de la 02 (`dateRangeToInstants`, `useTenantDates`, `usePagination`, `toTablePaginationProps`, `normalizePaged`, `cleanParams`, `labelOf`, `colorOf`, `labelOfKey`, `optionsOf`, `formatMoney`, `addDays`, `todayInZone`) existan con esa firma en `develop`, según `docs/manual/frontend/02-base-comun.md` | Si difieren, usar los nombres reales y anotarlo; si falta una función que esta spec necesita, **frenar** |

**Resueltos o abiertos durante la ejecución (19/11/2026).**

| Id | Qué pasó | Estado |
|---|---|---|
| P-FD-L1 | `defineEnum` ya admitía `value` de texto: no hizo falta ampliarlo | Resuelto |
| P-FD-L2 / P-FD2 | La estructura de `detalle` se relevó **leyendo el código del backend** (`ConsultaDeTrazabilidad.cs:258-320`, `AuditWriter.cs`), no con respuestas reales. Contradicción menor con D-FD9: en CAJA solo seis claves son dinero; `observacion` y `motivo` son texto y no pasan por `formatMoney`. Ajustado en `trazabilidadEvento.js`. La estructura de `antes`/`despues` es la de cada tipo anónimo del servicio (claves PascalCase, enums como entero salvo los que usan `ToString()`); se muestra cruda (D-FD10) | Resuelto; conviene confirmarlo con una respuesta real en la verificación manual |
| P-FD-L3 | Los nombres de la 02 existen con esa firma (`dateRangeToInstants`, `useTenantDates`, `usePagination`, `toTablePaginationProps`, `normalizePaged`, `cleanParams`, `labelOf`, `colorOf`, `labelOfKey`, `optionsOf`, `formatMoney`, `addDays`, `todayInZone`) | Resuelto |
| P-FD7 | **Instantes dentro de `antes`/`despues`**: el backend serializa `DateTime` con `System.Text.Json` por defecto; los que se leyeron de la base salen **sin `Z`** (Kind sin especificar) y los asignados desde el pedido, con `Z`. `formatValor` (D-FD10) solo convierte los que traen `Z`; los demás se muestran tal cual, en UTC aunque no lo diga. Pedirle al backend que serialice siempre con `Z`, o decidir si el front los trata como UTC | Abierto (decisión de producto, no bloquea) |
| DV-FD2 | `4.4`: por lectura, `RequireAuth` conserva `location.search` en `returnTo` y `safeReturnTo` acepta rutas con query; no hizo falta tocar `RequireAuth`, `safeReturnTo` ni `AuthProvider`. La verificación 8 de punta a punta (con Auth0) queda manual | Sin desvío; verificación manual pendiente |
| P-FD8 | Los pasos 1.1 (worktree, `.env`) y 0.1 los cubre la rama `feature/front-trazabilidad` creada por el orquestador; no se usó worktree. El paso 1.2 se resolvió con lectura del código, no con el backend en ejecución | Informativo |
| P-FD9 | Las verificaciones 2 a 19 de la sección 7 son manuales (navegador, Auth0 y backend) y **no se corrieron** en esta ejecución; sí `npm test`, `npm run lint` y `npm run build` | Pendiente del desarrollador |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01). Si un paso los necesita, se frena.

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Pantalla | `src/pages/Trazabilidad.jsx` | D-FD7, D-FD9 |
| Diálogo de detalle | `src/componentes/DetalleEventoDialog.jsx` | D-FD9, D-FD10 |
| Contrato de enlace (puro) | `src/utils/trazabilidadLink.js` | D-FD5 |
| Filtros, validación y rango por defecto (puro) | `src/utils/trazabilidadFiltros.js` | D-FD6 |
| Evento: normalización, resumen y diferencias (puro) | `src/utils/trazabilidadEvento.js` | D-FD4, D-FD9, D-FD10 |
| Módulo de API | `src/api/trazabilidadApi.js` | D-FD12 |
| Módulo de API de usuarios (solo `listUsuarios`; la 12 lo completa) | `src/api/usuariosApi.js` | D-FD8 |
| Tests | `test/unit/utils/trazabilidadLink.test.js`, `test/unit/utils/trazabilidadFiltros.test.js`, `test/unit/utils/trazabilidadEvento.test.js` | D-FA4 |
| Manual de esta spec | `docs/manual/frontend/04-trazabilidad.md` | Metodología (como las specs 01 y 02) |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/constants/enums.js` y `test/unit/constants/enums.test.js` | Suma `Fuente` y `AccionTrazabilidad` (y, si hace falta, admite `value` string: P-FD-L1) | D-FD4 |
| `src/auth/routes.js` | Entrada `/trazabilidad`; exporta `TRAZABILIDAD_PATH` | D-FD3, D-FD5 |
| `src/App.jsx` | Import y clave de `PAGES`; ruta `/auditoria` que redirige | D-FD3, D-FD13 |
| `test/unit/auth/routes.test.js` | `/auditoria` → `/trazabilidad` (l. 17, 23 y 24) | D-FD13 |
| `eslint.config.js` | Quita la excepción temporal de `Auditoria.jsx` | D-FD13 |
| `CLAUDE.md` | El contrato de enlace y los módulos nuevos. **No se toca** la línea "Backend endpoints used": la reemplaza la 02 por una referencia al inventario | Metodología |
| `docs/specs/README.md` | Fila 04: "Borrador" → "Aprobada" al aprobar; "Terminada" al cerrar | Metodología |

### 5.3 Se borran

| Pieza | Dónde |
|---|---|
| Pantalla vieja (con `fmtDate`, `ACCION` y los `toISOString`) | `src/pages/Auditoria.jsx` |

### 5.4 No se tocan

`Layout.jsx` (el menú sale del mapa), `src/api/http.js`, `src/api/params.js`, `src/utils/fechas.js`, `src/utils/paginacion.js` (los usa, no los cambia), y todas las demás páginas. **No se tocan** los enlaces de las otras pantallas: los agregan sus specs (P-FD6).

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-trazabilidad` (creada desde `develop` en un worktree propio; nunca se trabaja sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde, el paso tildado en esta spec, el manual al día y un commit confirmado por el desarrollador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- Nunca se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo es P-FD-L1, P-FD-L2 y P-FD-L3, con la regla que cada uno fija.
- Cada función pura nueva se prueba con la zona pasada de forma explícita: ningún test depende de la zona del sistema.

### Paso 0 — Condiciones previas (manual)

- [x] **0.1** La spec 02 está implementada y mergeada en `develop` (sus 8 pasos, `npm test` en verde). Esta spec está aprobada y mergeada.
- [x] **0.2** El desarrollador respondió las tres preguntas (D-FD3, D-FD6, D-FD9) el 18/11/2026; quedaron anotadas en esas decisiones.

  *Aceptación:* el desarrollador confirma y las respuestas quedan anotadas en las decisiones.

### Paso 1 — Worktree, enums y relevamiento de datos reales

- [x] **1.1** Crear el worktree desde `develop` (desde la carpeta `parkingcontrol-front`): `git worktree add ../parkingcontrol-front-trazabilidad -b feature/front-trazabilidad develop`. En el worktree, copiar el `.env` (no está versionado) y correr `npm install`. Resolver P-FD-L3.
- [x] **1.2** Con el backend en `develop` y un usuario con `auditoria.ver`, pedir `GET /Trazabilidad` de cada fuente (con un rango corto de datos demo) y anotar en el manual la estructura real de `detalle` (claves de CAJA, de `antes` y `despues`, valores de `entidad`, formato de los instantes dentro de `antes` y `despues`). Resuelve P-FD2 y P-FD-L2.
- [x] **1.3** Sumar `Fuente` y `AccionTrazabilidad` a `src/constants/enums.js` (D-FD4) y sus casos a `test/unit/constants/enums.test.js`. Resolver P-FD-L1.

  *Aceptación:* `npm test` pasa con: `Fuente` tiene exactamente las 5 fuentes del inventario; `AccionTrazabilidad` tiene exactamente las 20 acciones, sin duplicados; `labelOf(AccionTrazabilidad, "FINALIZAR")` da "Finalizar"; `labelOf` de un valor desconocido da el string recibido y `colorOf` da `"default"`; `optionsOf(Fuente, { allLabel: "Todas" })` empieza con `{ value: "", label: "Todas" }`. `npm run lint` y `npm run build` pasan.

### Paso 2 — Lógica pura: enlace, filtros y evento

- [x] **2.1** Crear `src/utils/trazabilidadLink.js` y su test (D-FD5). Exportar `TRAZABILIDAD_PATH` desde `src/auth/routes.js` y usarla.
- [x] **2.2** Crear `src/utils/trazabilidadFiltros.js` y su test (D-FD6).
- [x] **2.3** Crear `src/utils/trazabilidadEvento.js` y su test (D-FD4, D-FD9, D-FD10).

  *Aceptación:* `npm test` pasa con estos casos (zona `America/Montevideo`):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `buildTrazabilidadPath({ ocupacionId: 12 })` y `buildTrazabilidadPath({})` | `/trazabilidad?ocupacionId=12` y `/trazabilidad` |
  | 2 | `buildTrazabilidadPath({ pagoId: 40, fuente: ["PAGO", "DEVOLUCION"] })` | `/trazabilidad?pagoId=40&fuente=PAGO&fuente=DEVOLUCION` (orden fijo; valores vacíos, `null`, `undefined` y ids inválidos se omiten sin lanzar) |
  | 3 | `parseTrazabilidadQuery("?fuente=pago&fuente=CAJA&fuente=PAGO")` | `fuente: ["PAGO", "CAJA"]` (normaliza y quita repetidos); `ignorados` vacío |
  | 4 | `parseTrazabilidadQuery("?ocupacionId=abc&fuente=XYZ&desde=2026-02-30&hasta=2026-03-01")` | Filtros vacíos y `ignorados` con `ocupacionId`, `fuente` y el par `desde`/`hasta` |
  | 5 | Solo `desde` (sin `hasta`), y `desde` mayor que `hasta` | Los dos extremos se ignoran y se informan |
  | 6 | Ida y vuelta: `parseTrazabilidadQuery(buildTrazabilidadPath(f))` para un filtro con todos los campos | Los mismos filtros |
  | 7 | `validateFiltros` sin ids ni rango | Error `rango_obligatorio` |
  | 8 | `desde` sin `hasta`, y al revés | `rango_incompleto` en el campo faltante |
  | 9 | `desde` `2026-11-10` y `hasta` `2026-11-09` | `rango_invertido` |
  | 10 | 1 al 31 de octubre de 2026, sin ids | Válido (31 días menos 1 ms) |
  | 11 | 1 de octubre al 1 de noviembre de 2026, sin ids | `rango_excede` |
  | 12 | `ocupacionId: 12` y un rango de 90 días | Válido (el límite no rige con un id) |
  | 13 | `pagoId: 40` sin rango | Válido; `toApiParams` no trae `desde` ni `hasta` |
  | 14 | `ocupacionId` de `0`, `-1`, `1.5` y `"abc"` | `id_invalido` |
  | 15 | `toApiParams({ ocupacionId: 12, fuente: ["PAGO"], desde: "2026-10-01", hasta: "2026-10-31" }, tz)` | `{ ocupacionId: 12, fuente: ["PAGO"], desde: "2026-10-01T03:00:00.000Z", hasta: "2026-11-01T02:59:59.999Z" }`; sin fuentes, no trae la clave `fuente` |
  | 16 | `defaultFiltros("America/Montevideo", now)` con `now` = `2026-11-11T01:30:00.000Z` (22:30 del 10/11 en Uruguay) | `hasta: "2026-11-10"`, `desde: "2026-11-04"` (7 días incluido hoy; no el día de UTC) |
  | 17 | `canonicalKey("Finalizar")`, `canonicalKey(" pago ")` | `"FINALIZAR"` y `"PAGO"` |
  | 18 | `diffAntesDespues({ a: 1, b: "x" }, { a: 2, b: "x", c: true })` | Filas: `a` cambiado (1 → 2), `b` igual, `c` agregado |
  | 19 | `antes` nulo, `despues` nulo, y los dos nulos con `antesTexto` y `despuesTexto` | Todas "agregadas"; todas "quitadas"; los dos textos tal cual, sin filas |
  | 20 | `formatValor` de `null`, `true`, `"2026-11-11T01:30:00.000Z"` (con la zona) y un objeto | `"—"`, `"Sí"`, `"10/11/2026 22:30:00"` y su JSON compacto |
  | 21 | `resumenDeEvento` de un PAGO `{ monto: 1200, metodo: "EFECTIVO", motivo: null }` y de uno con `motivo: "Error de cobro"` | `$ 1.200,00 · Efectivo` y el mismo con ` · Error de cobro` (los espacios no cortables se normalizan al comparar) |
  | 22 | `resumenDeEvento` de una ALERTA `{ tipo: "CAJA_SIN_CERRAR", comentario: "ok" }` | `Caja sin cerrar · ok` |
  | 23 | `resumenDeEvento` de AUDITORIA con `antes` nulo y con `despues` nulo | `Alta` y `Baja` |
  | 24 | Búsqueda de `getHours`, `toLocale` y `toISOString` en los tres módulos | Sin coincidencias |

  *(Los casos 21 y 22 se ajustan a las claves reales relevadas en el paso 1.2.)* `npm run lint` y `npm run build` pasan.

### Paso 3 — Módulos de API

- [x] **3.1** Crear `src/api/trazabilidadApi.js` (D-FD12).
- [x] **3.2** Crear `src/api/usuariosApi.js` con `listUsuarios()` (D-FD8), **solo si** el archivo no existe en `develop`. Si la 12 ya lo creó, importar de ahí y tildar el paso.

  *Aceptación:* `npm run lint` y `npm run build` pasan. A mano, con un componente temporal o la consola del navegador no hace falta: se verifica en el paso 4 (Network muestra `GET /api/v1/Trazabilidad` con `fuente=PAGO&fuente=CAJA` y `GET /api/v1/Usuarios`).

### Paso 4 — Pantalla, diálogo, ruta y retiro de Auditoría

- [x] **4.1** Crear `src/pages/Trazabilidad.jsx` y `src/componentes/DetalleEventoDialog.jsx` (D-FD5 a D-FD10): filtros desde la URL, validación previa, carga con aviso de espera, tabla, paginación, selector de usuario con fallback, y detalle.
- [x] **4.2** Actualizar `src/auth/routes.js`, `src/App.jsx` (incluida la redirección de `/auditoria`) y `test/unit/auth/routes.test.js` (D-FD3, D-FD13).
- [x] **4.3** Borrar `src/pages/Auditoria.jsx` y quitar su excepción de `eslint.config.js` (D-FD13). Las excepciones de lint se sacan en orden de merge (02, 03, 04, 05): antes del PR, `git rebase develop` y resolver el conflicto de `eslint.config.js` quitando solo la línea de `Auditoria.jsx`.
- [x] **4.4** **Verificar que `RequireAuth` conserve el query string en `returnTo`** tras el redirect a Auth0 (el contrato de D-FD5 lo necesita). Por lectura, `src/auth/RequireAuth.jsx` ya arma `returnTo` con `location.pathname + location.search + location.hash`, pero hay que confirmarlo de punta a punta: abrir `/trazabilidad?ocupacionId=12` sin sesión, loguearse y comprobar que vuelve con el filtro (verificación 8). Si **no** lo conserva (por ejemplo, `safeReturnTo` o `onRedirectCallback` descartan el query), se anota como desvío DV-FD2 en la sección 4 y se arregla dentro de esta spec, tocando solo `RequireAuth.jsx`, `safeReturnTo.js` o `AuthProvider.jsx` y sumando el caso a `test/unit/auth/safeReturnTo.test.js`.

  *Aceptación (manual, con `dueno@demo.test` y el backend levantado):* ver la sección 7. `npm test`, `npm run lint` y `npm run build` pasan, y una búsqueda de `Auditoria.jsx`, `fmtDate` y `ACCION` en `src/` no encuentra nada de esta pantalla.

### Paso 5 — Documentación y cierre

- [x] **5.1** Crear `docs/manual/frontend/04-trazabilidad.md` (cómo funciona la pantalla, el contrato de enlace con ejemplos y la estructura real de `detalle` relevada en 1.2) y actualizar `CLAUDE.md`.
- [x] **5.2** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* el manual lista los parámetros del contrato; `CLAUDE.md` menciona el contrato de enlace y no se modificó su línea de endpoints.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Entrar a `/trazabilidad` con `dueno@demo.test` | Carga con el rango por defecto, barra de progreso y esqueletos mientras espera; los campos muestran las fechas y la URL pasa a `?desde=…&hasta=…` (con `replace`: "atrás" no vuelve a `/trazabilidad` sin filtros) |
| 3 | En Network, el pedido | `GET /api/v1/Trazabilidad`, `desde` y `hasta` con `Z`, `pageSize=50`, sin `fuente[]` |
| 4 | Filtrar por dos fuentes | El pedido lleva `fuente=PAGO&fuente=CAJA`; la lista solo trae eventos de esas fuentes |
| 5 | Sin ids ni rango, y con un rango de 32 días | Mensaje en pantalla **sin** pedido en Network (no hay llamada a la API) |
| 6 | Rango de 31 días con mucho volumen | La espera se ve (barra, esqueletos y, a los 1,5 s, el texto); el botón "Buscar" queda deshabilitado; no hay doble pedido |
| 7 | Abrir `/trazabilidad?ocupacionId=12` | Abre sin rango y busca sola; Network con `ocupacionId=12` y sin `desde` ni `hasta` |
| 8 | Abrir `/trazabilidad?ocupacionId=12` **sin sesión** | Redirige a Auth0 y, tras el login, vuelve a `/trazabilidad?ocupacionId=12` con el filtro |
| 9 | Abrir `/trazabilidad?ocupacionId=abc&fuente=XYZ` | Aviso "Ignoramos filtros del enlace…" y la pantalla abre con el rango por defecto |
| 10 | Clic en un chip "Ocupación #N" de una fila | La URL pasa a `?ocupacionId=N` y la lista se filtra; "atrás" vuelve al filtro anterior |
| 11 | Detalle de un evento de AUDITORIA | Tabla `Campo / Antes / Después` con lo cambiado resaltado; "Ver JSON" muestra los objetos crudos |
| 12 | Detalle de un PAGO, una DEVOLUCION, una CAJA y una ALERTA | Monto con `formatMoney`, método y tipo con su etiqueta, motivo y comentario completos |
| 13 | Una acción `Finalizar` de AUDITORIA | Se muestra con la etiqueta "Finalizar" y el color del enum |
| 14 | Filtrar por usuario | El selector muestra nombres (los inactivos con "(inactivo)"); el pedido lleva `usuarioId`. Con un usuario sin `usuarios.ver` (si existe en el demo) cae al campo numérico |
| 15 | `operado@demo.test` y `encargado@demo.test` | No ven "Trazabilidad" en el menú; `/trazabilidad` muestra "No tenés permiso" |
| 16 | `/auditoria` | Redirige a `/trazabilidad` |
| 17 | Hora de un evento a las 22:30 de Uruguay con la zona del navegador cambiada | La hora mostrada es la del tenant |
| 18 | Búsqueda de `Auditoria.jsx`, `fmtDate`, `toLocale` y `ACCION` en las rutas del paso 4 | Sin coincidencias de la pantalla vieja |
| 19 | `git diff develop` sobre las páginas "no se tocan" (sección 5.4) | Vacío |

**No verificable en el producto:** el rol AUDITOR (no hay usuario demo, P-FA9; lo cubre el test de permisos) y los límites de 31 días con cambio de horario (lo cubren los tests de la 02).

## 8. Cómo retomar

**Estado:** Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`). Historia: aprobada el 18/11/2026. El desarrollador aprobó todas las decisiones: ruta `/trazabilidad` con menú "Trazabilidad" (D-FD3), rango por defecto de 7 días escrito en la URL con `replace` (D-FD5, D-FD6), resumen más diálogo (D-FD9), y salir sin filtro por entidad (P-FD5 → PB-1). P-FD1 quedó cerrado (usuariosApi.js, opción A). Falta: que la 02 esté implementada y mergeada, y los pasos 0.1 y 1 a 5. El contrato de enlace (D-FD5) ya se comunicó al chat orquestador para que lo usen las specs 05, 07, 08 y 09.

**Cuándo arrancar la ejecución:** solo con la spec 02 implementada y mergeada en `develop` y esta spec aprobada (paso 0).

**Ejecución en un chat**, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-trazabilidad` (rama `feature/front-trazabilidad`):

| Paso | Modelo | Esfuerzo | Nota |
|---|---|---|---|
| 0 | — | — | Lo hace el desarrollador |
| 1 | Sonnet | bajo | Crear el worktree, relevar datos reales y sumar dos enums. Si P-FD-L2 muestra una estructura que cambia el diseño, **frena** |
| 2 | Sonnet | medio | Lógica pura con tests: el criterio es la lista de casos. La medición del rango de 31 días en instantes es la parte delicada: si un caso no da lo esperado, **frena** y vuelve al chat orquestador |
| 3 | Sonnet | bajo | Mecánico |
| 4 | Sonnet | medio | La pantalla (URL como fuente de verdad, carga y estados). Si el paso obliga a tocar otra página, **frena** |
| 5 | Haiku | bajo | Documentación; sin decisiones |

Si en cualquier paso aparece una decisión que la spec no previó, se anota en la sección 4 y se vuelve a un chat con el modelo más capaz y esfuerzo alto, en especial si toca la validación o el contrato de enlace (lo usan otras specs).

**Prompt para el chat de ejecución** (cambiar `N` por el paso):

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-trazabilidad` (rama `feature/front-trazabilidad`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedime que corra el comando del paso 1.1. Leé `CLAUDE.md`, `docs/specs/frontend/04-trazabilidad.md` y el manual `docs/manual/frontend/02-base-comun.md`. Ejecutá **solo el paso N** de esa spec, siguiendo las reglas de la sección 6. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No corras comandos de terminal. **Todo lo que necesites del usuario pasa por el chat "Orquestador" por SendMessage**: comandos (exactos y con su carpeta), confirmaciones de cierre de paso y de commit, y decisiones que la spec no prevé. Esperá su respuesta y no le preguntes nada al usuario en tu chat. Al terminar el paso: tildalo, actualizá el manual y proponé el commit sin `Co-Authored-By` ni atribución de IA. Respondé en español rioplatense.
