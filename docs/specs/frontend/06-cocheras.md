# 06 — Cocheras: alta por rango, edición y estados calculados

> Frontend · **Aprobada** (18/11/2026) · `feature/specs-etapa3` (esta spec, rama compartida con otros redactores) y `feature/front-cocheras` (ejecución, en el worktree `../parkingcontrol-front-cocheras`, a crear desde `develop` cuando la 02 esté mergeada) · Última actualización 18/11/2026
>
> Sexta spec del frontend. La pantalla de Cocheras ya funciona contra la API, pero no sabe dar de alta ni editar, trata `OCUPADA` y `RESERVADA` como si fueran estados que se eligen, muestra las fechas en la zona del navegador y no distingue permisos de edición de permisos de cambio de estado. Depende de la spec 02 (aprobada, todavía no implementada: acá se usan sus funciones por nombre) y, por el enlace a Trazabilidad, se mergea **después** de la 04.

## 1. Objetivo y alcance

**Objetivo.** Que quien tiene `cocheras.gestionar` (DUENO y ENCARGADO) pueda dar de alta cocheras por rango y corregir el número y la nota de una existente; que quien tiene `cocheras.cambiar_estado` (también el OPERADOR) pueda bloquear (con motivo) y desbloquear; y que todos vean con claridad quién ocupa o reserva cada cochera y hasta cuándo, con las horas en la zona del local.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `src/api/cocheraApi.js` completo: lista, detalle, alta por rango, edición, estado y disponibles (esta última para la 07) | D-FF2 |
| Lógica pura | `src/utils/cocheras.js`: rango, vista previa, validaciones, cuerpos, texto de vencimiento, acciones por estado, códigos que obligan a recargar | D-FF3, D-FF7 a D-FF9, D-FF11, D-FF13 |
| Estados | `EstadoCochera` de `enums.js`; solo `DISPONIBLE` y `BLOQUEADA` se envían | D-FF4, D-FF9 |
| Tarjeta | Cliente y horario según el estado, con fechas del tenant | D-FF5 |
| Detalle | Nota, ocupación activa completa, historial con enlace a Trazabilidad | D-FF6, D-FF15 |
| Alta por rango | Diálogo con "Desde" / "Hasta", vista previa y bloqueos | D-FF7 |
| Edición | Número y nota, con aviso si la cochera está ocupada o reservada | D-FF8 |
| Cambio de estado | Bloquear (nota obligatoria) y Desbloquear (nota opcional) | D-FF9 |
| Permisos y errores | Ocultar por permiso; errores por `code` con recarga | D-FF10, D-FF11 |
| Carga | Error de carga visible, respuestas viejas descartadas | D-FF12 |
| Retiro | `formatDateTime` (l. 47), `toLocaleDateString` suelto (l. 159), `ESTADO_COCHERA` (l. 26), `estadoChip` y la excepción de lint | D-FF14 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Baja o borrado de una cochera | El backend no tiene `DELETE /Cochera`. Sin pedido |
| Quién bloqueó una cochera y cuándo (historia de la cochera) | No existe filtro por cochera en Trazabilidad: PB-1 de `brechas-front.md`. Hoy el enlace es por ocupación, no por cochera |
| Elegir cochera al crear una ocupación | Spec 07, que usa `listCocherasDisponibles` de esta spec |
| Paginación o virtualización de la grilla | `GET /Cochera` no pagina. Con el tamaño esperado de un local no hace falta (P-FF2) |
| Filtro por estado en la grilla | Sin pedido. Se conserva solo la búsqueda por número |
| Rediseño visual | Después, con el diseño nuevo |
| `CLAUDE.md`, línea "Backend endpoints used" | No se toca: la reemplaza la 02 en su paso 8 |

**Estado de alcance.** Etapa 3 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02 mergeada al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Cochera`, incluido "Comportamiento" | Endpoints, `CocheraListItem`, `CocheraDetalle`, cuerpo de `POST` y `PUT`, `estado` calculado y su prioridad, qué rechaza cada endpoint, tope de 100 por alta, `nota: null` borra (relevado del código el 18/11/2026, sin confirmar por tests) | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 0, 3, 4 y 5 | Contrato de instantes; `cocheras.ver`, `cocheras.cambiar_estado`, `cocheras.gestionar`; los `code` de cochera; `/disponibles` con `hasta` exclusivo | 18/11/2026 |
| `docs/inventario/backend.md`, sección 6 y `brechas-front.md` (PB-4) | La duda de `PUT /estado` quedó cerrada por "Comportamiento". PB-4: posible bug de `DateTime.Now` vs `UtcNow` en el backend (P-FF5) | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 1, 5, "Pedidos al backend" (PB-1) y "Contratos entre specs" | Reparto de la 06, enlace a Trazabilidad, `cocheraApi.js` completo con `listCocherasDisponibles` | 18/11/2026 |
| Spec 02 (`02-base-comun.md`), completa | `useTenantDates`, `formatInstant`, `enums.js` (`EstadoCochera`, `TipoOcupacion`, `labelOf`, `colorOf`, `optionsOf`), `formatMoney`, patrón D-FB14, regla de lint y tabla 5.4 | 18/11/2026 |
| Spec 03 (`03-tarifas.md`) | Modelo de formato y de estructura | 18/11/2026 |
| Spec 04 (`04-trazabilidad.md`), solo D-FD5 | `buildTrazabilidadPath`, permiso `auditoria.ver`, reglas del enlace | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), regla "lógica pura con Vitest" (D-FA4) | 09/11/2026 |
| Lectura de `src/pages/Cocheras.jsx` | Estado actual (sección 2.1) | 18/11/2026 |
| Respuestas del desarrollador (18/11/2026, por el Orquestador) | Alta con vista previa, edición con aviso, nota obligatoria al bloquear, forma de OCUPADA y RESERVADA (D-FF5 a D-FF10) | 18/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Dialog`, `Chip`, `TextField`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

Números de línea de `develop` al 18/11/2026.

| Pieza | Estado actual |
|---|---|
| Carga | `http.get("/Cochera")` directo (l. 190). Si falla, `showApiError` y la grilla queda vacía, sin distinguirlo de "no hay cocheras" |
| Estados | `ESTADO_COCHERA` (l. 26) y `estadoChip` (l. 33), que además acepta el estado como texto (`"DISPONIBLE"`) o como dígito en string. El inventario dice que llega como entero |
| Fechas | `formatDateTime` (l. 47, `toLocaleString()` en la zona del navegador), `toLocaleDateString()` en el pie de la tarjeta (l. 159), `diffHuman` (l. 52, usa `Date.now()` dentro) |
| Tarjeta | Altura fija 150. Muestra `clienteNombre` y, si el chip es "Ocupada" o "Reservada", `diffHuman(fin)`. Para una `RESERVADA` la ocupación empieza en el futuro y "vence en…" no dice nada útil |
| Detalle | `GET /Cochera/{id}` sin `historialTake` (el backend usa 20 por defecto) pero el título dice "Historial (últimas 10)". Muestra `Total: ${precioTotal}` (da "$null" si es nulo) |
| Cambio de estado | Un campo "Nota" y dos botones, "Bloquear" (estado 2) y "Desbloquear" (estado 1), visibles siempre que `can("cocheras.cambiar_estado")`, en cualquier estado. La nota es opcional |
| Alta y edición | No existen |
| Carrera | `abrirDetalle` no descarta respuestas viejas: dos clics seguidos pueden mostrar el detalle del primero |
| Permisos | Solo `cocheras.cambiar_estado` (D-FA10). No se usa `cocheras.gestionar` |
| Errores | `showApiError(e)` en todos los `catch` |

## 3. Decisiones

Prefijo **D-FF** ("frontend, cocheras"). Estado: **Confirmada** (la tomó el desarrollador, la aprobó con la spec o está fijada por una fuente). Todas están Confirmadas desde la aprobación del 18/11/2026. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FF1 (18/11/2026) — Confirmada. Rama y worktree.** La spec vive en `feature/specs-etapa3`. La ejecución va en `feature/front-cocheras`, en el worktree `../parkingcontrol-front-cocheras`, creada desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que la 02 esté implementada y mergeada** y, por el enlace de D-FF15, **se mergea después de la 04**. Las excepciones de lint se sacan en orden de merge, con `git rebase develop` antes del PR.

**D-FF2 (18/11/2026) — Confirmada. `src/api/cocheraApi.js` completo, con el patrón D-FB14.** Funciones `async`, nombradas, que devuelven `data`, con JSDoc de tipos tomados del inventario, sin capturar errores y sin convertir fechas ni enums:

| Función | Endpoint | Devuelve |
|---|---|---|
| `listCocheras()` | `GET /Cochera` | `CocheraListItem[]` |
| `getCochera(id, { historialTake } = {})` | `GET /Cochera/{id}`, con `params: cleanParams({ historialTake })` | `CocheraDetalle` |
| `createCocheras(body)` | `POST /Cochera` | `{ id, numero, estado, nota? }[]` (201) |
| `updateCochera(id, body)` | `PUT /Cochera/{id}` | `undefined` (204) |
| `setEstadoCochera(id, body)` | `PUT /Cochera/{id}/estado` | `undefined` (204) |
| `listCocherasDisponibles({ desde, hasta })` | `GET /Cochera/disponibles` | `{ id, numero }[]` |

`listCocherasDisponibles` recibe `desde` y `hasta` como `UtcInstant` **ya convertidos** (la pantalla los arma con `localInputToInstant`) y los manda en `params`; el `hasta` es exclusivo (inventario, sección 5). **La 06 la crea y no la usa**: es para el alta de ocupación de la 07, que **no** recrea el archivo (contrato registrado en `brechas-front.md`; si la 07 se ejecuta antes que la 06, usa lo que encuentre). Las lecturas que devuelven lista (`listCocheras`, `listCocherasDisponibles`) verifican que la respuesta sea un arreglo y, si no, lanzan `ApiError` con `code: "respuesta_invalida"`, igual que `normalizePaged`. Se prueba con `vi.mock` de `http` (ruta, `params`, cuerpo).
*Motivo:* patrón uniforme de la 02; cierra el contrato con la 07 sin que las dos specs toquen el mismo archivo.
*Descartados:* (a) dejar `listCocherasDisponibles` para la 07: dos specs editando `cocheraApi.js` y conflicto de merge; (b) que la 06 no valide el arreglo: una respuesta rara se vería como "no hay cocheras".

### 3.2 Estados y vista

**D-FF3 (18/11/2026) — Confirmada. Dónde vive la lógica.** Todo lo que se puede probar sin React va en `src/utils/cocheras.js` (D-FF13). `Cocheras.jsx` queda como orquestador de estado, diálogos y MUI. Las funciones que dependen del reloj reciben `now` como parámetro (ningún test depende de la hora del sistema).

**D-FF4 (18/11/2026) — Confirmada. Estados con `EstadoCochera`.** La pantalla retira `ESTADO_COCHERA` y `estadoChip` y usa `labelOf(EstadoCochera, estado)` y `colorOf(EstadoCochera, estado)` (02, D-FB11). El `estado` es **entero**; la tolerancia a texto de `estadoChip` se elimina (si llegara un texto, `labelOf` lo muestra tal cual y con color `default`; P-FF-L3). El color del borde de la tarjeta y del historial se deriva de `colorOf` con un único mapa de color de MUI a color del tema (hoy hay dos copias del mismo `chip.color === ...`).
- `estado` es **calculado** por el backend, con prioridad `BLOQUEADA` > `OCUPADA` > `RESERVADA` > `DISPONIBLE`. `OCUPADA` y `RESERVADA` nunca se envían: el backend responde 400 `datos_invalidos` ("Solo se permite DISPONIBLE o BLOQUEADA.") (D-FF9).
- **`ocupacionActiva` no implica `OCUPADA`:** es la ocupación en curso o, si no hay, la próxima reserva, y una cochera `BLOQUEADA` puede traerla. La pantalla decide por `estado` y, solo en una `BLOQUEADA` con `ocupacionActiva`, por el `inicio` (D-FF5).
- Un valor desconocido no rompe la pantalla.

**D-FF5 (18/11/2026) — Confirmada. Contenido de la tarjeta según el estado.** Altura fija como hoy. Fechas con `useTenantDates().formatInstant` (zona del tenant); nunca `Date` ni `toLocale*`.

| Estado | Línea principal | Segunda línea | Pie |
|---|---|---|---|
| `DISPONIBLE` | "—" | — | — |
| `BLOQUEADA` sin `ocupacionActiva` | "—" | — | — |
| `BLOQUEADA` con `ocupacionActiva` | `clienteNombre` | Chip "Bloqueada" y debajo: "ocupada por {cliente}" si `inicio <= now`, o "reservada desde dd/mm" si `inicio > now` | Como `OCUPADA` o `RESERVADA` según el caso |
| `OCUPADA` | `clienteNombre` | `vencimientoTexto(fin, now)`: "vence en 2h 30m" / "venció hace 45m"; sin `fin` (ocupación abierta): "Sin hora de fin" | "Hasta dd/mm/yyyy HH:mm", o vacío sin `fin` |
| `RESERVADA` | `clienteNombre` | "Desde dd/mm/yyyy HH:mm" (el `inicio`) | "Hasta dd/mm/yyyy HH:mm", o vacío sin `fin` |

La decisión por estado sale de `tarjetaInfo(cochera, now)` (pura, D-FF13), que devuelve `{ cliente, modo, inicio, fin, vence }` con `modo` en `"ocupada" | "reservada" | "ninguno"`; el componente solo formatea. Una `OCUPADA` o `RESERVADA` sin `ocupacionActiva` (no debería pasar) se muestra como `modo: "ninguno"` con el chip del estado. `precioTotal` suele ser `null` (el total se muestra "—"). Los instantes vienen de un listado que el backend calcula con la hora del servidor (P-FF5). El pie retira el `toLocaleDateString` suelto y pasa a mostrar fecha y hora.
*Motivo:* pedido del desarrollador. Para una reservada el dato útil es cuándo empieza, no "vence en".
*Descartado:* solo chip y cliente: el operador tendría que abrir el detalle para saber cuándo se libera.

**D-FF6 (18/11/2026) — Confirmada. Detalle de la cochera.** Al tocar una tarjeta se abre el detalle (`getCochera(id, { historialTake: 20 })`, explícito, no por defecto). Orden:
1. Cabecera: "Cochera #número" y chip de estado. Con `cocheras.gestionar`, el botón "Editar" (D-FF8).
2. **Nota** de la cochera (`detalle.nota`), si existe. Es el único lugar donde se ve: el listado no la trae (confirmado en el inventario).
3. Acciones de estado (D-FF9), si corresponde.
4. **Ocupación activa**, completa: cliente, tipo (`labelOf(TipoOcupacion)`), inicio, fin (con `vencimientoTexto`) y total (`formatMoney`: nulo muestra "—", no "$null"). Si el `modo` de `tarjetaInfo` es `reservada`, el título dice "Reserva" en vez de "Ocupación activa". Con `can("auditoria.ver")`, el enlace "Ver trazabilidad" (D-FF15).
5. **Historial** (el backend manda las últimas 20, por `inicio` descendente, con activas, futuras, finalizadas y canceladas; el título dice "20", no "10"): por ocupación, cliente, chip de estado de la ocupación con `labelOf(EstadoOcupacion)` y `colorOf` (la 07 no define aún el chip propio; se usa el enum de la 02), rango "inicio → fin" con `formatInstant`, total con `formatMoney` y, con `can("auditoria.ver")`, el enlace a Trazabilidad por ocupación.
6. Cerrar.

El detalle usa **una sola** petición de carga y descarta respuestas viejas (D-FF12).
*Motivo:* el detalle ya existe; se corrigen el total nulo, el título del historial y las fechas, y se suman la nota y el enlace.
*Descartado:* mostrar la nota también en la tarjeta: el listado no la trae y pedir el detalle de cada cochera son N pedidos.

### 3.3 Escritura

**D-FF7 (18/11/2026) — Confirmada. Alta por rango con vista previa y tope de 100 (el del backend).** Con `cocheras.gestionar`, el botón "Agregar cocheras" abre un diálogo con dos campos numéricos: **"Desde"** (obligatorio) y **"Hasta"** (opcional). Debajo, en vivo, la vista previa que calcula `previewRango` (pura):
- Válido: "Se van a crear **N** cocheras: del X al Y" (con un solo número: "Se va a crear la cochera #X").
- Con choque: "Ya existen las cochera(s): 12, 13 (y N más)". Se listan hasta 10.
- Con error: el mensaje de la tabla.
El botón "Crear" queda **deshabilitado** mientras haya error o choque. No hay paso de confirmación aparte: la vista previa **es** la confirmación.

| Regla | Mensaje |
|---|---|
| "Desde" vacío o no entero | "Ingresá el número de la primera cochera" |
| Número (desde o hasta) fuera de 1 a 999 | "Los números van del 1 al 999" |
| "Hasta" menor que "Desde" | "El \"Hasta\" no puede ser menor que el \"Desde\"" |
| Cantidad mayor que `MAX_ALTA_RANGO` (**100**, el tope del backend) | "Podés crear hasta 100 cocheras por vez" |
| Algún número del rango ya está en la lista cargada | Choque (ver arriba). Se informa, no se oculta |

- "Hasta" vacío **o igual a "Desde"** → `buildCreateBody` manda solo `{ desde }` (sin `hasta`): sin `hasta` el backend crea una, y así no se depende de cómo trate un rango de un número.
- **Backend** (inventario, "Comportamiento"): el alta es **todo o nada**; un número existente da 409 `cochera_numero_repetido` (el mensaje lista hasta 10); `hasta < desde` da 400 `datos_invalidos`; más de 100 por pedido da 400 `operacion_invalida`. La vista previa evita los tres casos, pero el backend manda: si llegan, el `title` se muestra tal cual y no se creó nada.
- Los números se leen con `trim` y deben ser enteros (`^\d+$`): `"1e2"`, `"10.5"` y `"-3"` son errores.
- El choque se calcula contra la lista cargada, que puede estar vieja: si otro usuario creó cocheras, el backend responde `cochera_numero_repetido` (D-FF11) y la pantalla recarga.
- Éxito (201, sin `Location`, cuerpo ordenado por número): aviso "Se crearon N cocheras" (N del arreglo devuelto, no el calculado), cierre y recarga de la lista.
- Mientras envía, el botón se deshabilita.

*Motivo:* pedido del desarrollador. El tope de 100 coincide con el del backend y evita, además, un número mal tipeado que cree cientos de cocheras sin baja posible.
*Descartados:* (a) un solo número por alta: 50 cocheras serían 50 altas aunque el backend soporta rango; (b) rango sin vista previa: un error de tipeo no tiene vuelta atrás.

**D-FF8 (18/11/2026) — Confirmada. Edición de número y nota.** Con `cocheras.gestionar`, "Editar" en el detalle abre un diálogo con **número** (1 a 999) y **nota** (hasta 300 caracteres, con contador). Se abre desde el detalle porque el listado no trae la nota. Reglas en `validateEditCochera` (pura): número entero de 1 a 999; no repetido contra las **demás** cocheras de la lista (el mismo número de la cochera editada es válido: solo cambia la nota); nota de 300 o menos.
- **Aviso, no bloqueo,** si la cochera está `OCUPADA` o `RESERVADA`: "Esta cochera tiene una ocupación o reserva. Si cambiás el número, cambia en todas las pantallas." El backend **no** chequea el estado: se puede editar con la cochera ocupada o reservada. El mismo número propio da 204; el de otra cochera, 409 `cochera_numero_repetido`.
- Nota vacía: `buildUpdateBody` manda `nota` recortada, o **`null`** si queda vacía, nunca `""`: el backend borra la nota con `null` y guarda `""` como cadena vacía. El campo nota se **precarga con la nota actual**, porque este `PUT` reemplaza la nota: dejarlo vacío la borra. El texto de ayuda del campo lo dice ("Vacío: se borra la nota").
- Éxito (204): aviso "Cochera actualizada", cierre del diálogo, y recarga de la lista **y** del detalle abierto.
- Mientras envía, el botón se deshabilita.

*Motivo:* pedido del desarrollador (editar el número de una ocupada se permite, con aviso).
*Descartados:* (a) bloquear el número si no está disponible: no se puede corregir un error de tipeo hasta que termine la ocupación; (b) permitir sin aviso: confusión en el mostrador.

**D-FF9 (18/11/2026) — Confirmada. Bloquear y Desbloquear.** Con `cocheras.cambiar_estado`:
- **Bloquear**: abre un diálogo con la **nota obligatoria** ("Motivo", hasta 300; ej. "en reparación"). Envía `{ estado: EstadoCochera.BLOQUEADA, nota }`. `validateBloqueo` (pura): `trim` no vacío, 300 o menos. Mensajes: "Contanos el motivo del bloqueo" y "El motivo no puede superar 300 caracteres". El front valida el largo porque el backend **no** lo valida en este `PUT`.
- **Desbloquear**: diálogo con la nota **opcional**, **precargada con la nota actual** (`detalle.nota`). Envía `{ estado: EstadoCochera.DISPONIBLE, nota }` con esa nota **tal cual (conserva el motivo)**, salvo que el usuario la edite; si la borra a propósito, `nota` va en **`null`** (nunca `""`). Esto importa porque **`nota: null` borra la nota** en el backend: sin la precarga, desbloquear con el campo vacío borraría el motivo sin que nadie lo pidiera. El texto de ayuda del campo dice "Se conserva el motivo. Si lo borrás, se elimina la nota". Pasar a `DISPONIBLE` solo quita el bloqueo: el estado se recalcula, así que una cochera con ocupación en curso o reserva pasa a `OCUPADA` o `RESERVADA`, no a `DISPONIBLE`; el aviso de éxito dice "Cochera desbloqueada" y la grilla muestra el estado real tras la recarga.
- **Qué botón se ofrece** lo decide `accionesDeEstado(estado)` (pura): "Bloquear" **solo** si `DISPONIBLE`; "Desbloquear" solo si `BLOQUEADA`. En `OCUPADA` no se ofrece "Bloquear" porque el backend responde 409 `cochera_con_ocupacion_activa`; en `RESERVADA` tampoco (decisión del desarrollador, opción (a)): el backend sí lo permitiría, pero quedaría una cochera bloqueada con una reserva vigente que no se podría usar, así que para bloquearla hay primero que resolver la reserva (spec 07).
- **El front nunca envía `OCUPADA` ni `RESERVADA`** (el backend responde 400 `datos_invalidos`: "Solo se permite DISPONIBLE o BLOQUEADA."): usa constantes de `EstadoCochera`, no un `select` (`optionsOf(EstadoCochera, { only: ["DISPONIBLE", "BLOQUEADA"] })` es la única lista posible).
- Éxito (204): aviso "Cochera bloqueada" / "Cochera desbloqueada", recarga de la lista y del detalle.
- Mientras envía, los botones se deshabilitan.

*Elegido (18/11/2026):* "Bloquear" solo en `DISPONIBLE`. *Descartada:* ofrecerlo también en `RESERVADA` con el aviso "Tiene una reserva desde dd/mm HH:mm; la reserva sigue vigente". Su costo era dejar una cochera `BLOQUEADA` con una reserva vigente que no se podría usar; el costo de lo elegido es que el encargado debe resolver la reserva antes de bloquear por una avería. Si más adelante se quiere (b), es un cambio de `accionesDeEstado` más un aviso en el diálogo.

Hoy se muestran los dos botones siempre y la nota es un campo compartido; sin esto el operador puede intentar bloquear una cochera ocupada y recibir un 409.
*Motivo:* pedido del desarrollador (nota obligatoria al bloquear); `OCUPADA` y `RESERVADA` se calculan, no se eligen.
*Descartados:* (a) nota siempre opcional: cocheras bloqueadas sin motivo; (b) ofrecer "Bloquear" en una `OCUPADA` y dejar que el backend responda: hoy pasa y confunde (409).

**D-FF10 (18/11/2026) — Confirmada. Permisos.** La ruta `/cocheras` exige `cocheras.ver` (todos los roles, ya está en `routes.js`). Todo se **oculta** (no se deshabilita, D-FA10), con `can(...)` y nunca por rol (ARQ-4):

| Acción | Permiso | Quién |
|---|---|---|
| Ver grilla, detalle e historial | `cocheras.ver` | DUENO, ENCARGADO, OPERADOR, AUDITOR |
| "Bloquear" y "Desbloquear" | `cocheras.cambiar_estado` | DUENO, ENCARGADO, OPERADOR |
| "Agregar cocheras" y "Editar" | `cocheras.gestionar` | DUENO, ENCARGADO |
| Enlace a Trazabilidad | `auditoria.ver` | DUENO, AUDITOR |

Un AUDITOR ve todo y no tiene ningún botón de escritura. Un OPERADOR puede bloquear pero no editar ni agregar. Extiende la tabla de D-FA10.

**D-FF11 (18/11/2026) — Confirmada. Errores por `code`.** Todos los `catch` llaman a `showApiError(e)`, que muestra el `title` del backend tal cual (D-FA6). No se agregan entradas a `errorCodes.js`. Lo que la 06 agrega es qué hace la pantalla **después** del aviso, en `shouldReloadAfter(code)` y `shouldCloseDetailAfter(code)` (puras):

| `code` | Cuándo | Después |
|---|---|---|
| `cochera_no_encontrada` | La cochera ya no existe (404) | Recarga la lista y **cierra** el detalle |
| `cochera_numero_repetido` | Alta o edición con un número que ya existe (409) | Recarga la lista; el diálogo queda abierto |
| `cochera_bloqueada` | Código del catálogo (409); el inventario no lo asocia a ningún endpoint de `/Cochera` (lo usa el alta de ocupación, spec 07) | Recarga lista y detalle |
| `cochera_con_ocupacion_activa` | `PUT /estado` para **bloquear** con una ocupación **en curso** (409). El estado que veía el usuario quedó viejo (otro usuario ocupó la cochera) | Recarga lista y detalle |
| `cochera_no_disponible` | La cochera no está disponible para la operación (409) | Recarga lista y detalle |
| `datos_invalidos` | Cuerpo fuera de rango (400, campos `Desde`, `Hasta`, `Numero`, `Nota`), `hasta < desde`, o `estado` distinto de `DISPONIBLE`/`BLOQUEADA` | Sin recarga: no cambió ningún dato. El cliente valida los mismos límites y no envía 3 o 4 |
| `operacion_invalida` | Alta de más de 100 cocheras (400) | Sin recarga: no se creó nada. El cliente valida el tope |
| `sin_permiso` | Permisos cambiados a mitad de sesión | Sin recarga |
| Código desconocido o `undefined` | — | Sin recarga |

El inventario no asocia `cochera_bloqueada` ni `cochera_no_disponible` a ningún endpoint de `/Cochera` (los lanza el alta de ocupación, spec 07). Se dejan en el mapeo por si llegaran: el tratamiento es el mismo (aviso con el `title` y recarga).
*Motivo:* en estos códigos el estado que ve el usuario quedó viejo; recargar lo arregla. El aviso sigue teniendo un solo dueño (el backend).
*Descartado:* agregar los códigos a `errorCodes.js`: no cambian el tratamiento y sumarían un lugar más que mantener.

### 3.4 Carga, código y retiro de copias

**D-FF12 (18/11/2026) — Confirmada. Carga y estados de la pantalla.**
- Al entrar y en "Refrescar": `listCocheras`. Después de **cualquier** escritura se recarga la lista, y también el detalle si está abierto (el estado es calculado: no se actualiza a mano).
- Si la lista falla, el estado queda en "no cargado" y se muestra "No pudimos cargar las cocheras" con "Reintentar" (hoy queda una grilla vacía que parece "no hay cocheras"). Sin cocheras (lista vacía y carga exitosa): "Todavía no hay cocheras" y, con `cocheras.gestionar`, el botón "Agregar cocheras".
- `abrirDetalle` descarta respuestas viejas (bandera de "última petición" o identificador por llamada): dos clics seguidos muestran el detalle del último.
- La búsqueda por número (`includes`) se conserva como está.

**D-FF13 (18/11/2026) — Confirmada. Lógica pura en `src/utils/cocheras.js`, probada con Vitest.** Exporta `buildEstadoBody` (cuerpo de `PUT /estado`, con `nota: null` si queda vacía), `MIN_NUMERO` (1), `MAX_NUMERO` (999), `MAX_NOTA` (300), `MAX_ALTA_RANGO`, `parseRango`, `previewRango`, `buildCreateBody`, `validateEditCochera`, `buildUpdateBody`, `validateBloqueo`, `accionesDeEstado`, `tarjetaInfo`, `vencimientoTexto`, `shouldReloadAfter` y `shouldCloseDetailAfter`. Sin React ni estado; `now` y la lista de números existentes son parámetros explícitos.
*Motivo:* regla D-FA4 y principio de la 02: lo que no puede romperse tiene un test; la pantalla no tiene Testing Library.
*Descartado:* la validación inline en el diálogo: sin pruebas y con reglas nuevas (rango, tope, choque).

**D-FF14 (18/11/2026) — Confirmada. Retiro de las copias y de la excepción de lint.** `Cocheras.jsx` retira `formatDateTime` (l. 47), el `toLocaleDateString` suelto (l. 159), `ESTADO_COCHERA` (l. 26), `estadoChip` (l. 33) y `diffHuman` (l. 52, reemplazada por `vencimientoTexto`, que recibe `now`). Usa `formatInstant` (por `useTenantDates`), `labelOf`/`colorOf` de `EstadoCochera`, `TipoOcupacion` y `EstadoOcupacion`, y `formatMoney`. Se saca la excepción de `Cocheras.jsx` de `eslint.config.js` (D-FB9, tabla 5.4 de la 02). **Cambio visible:** las fechas pasan a mostrarse en la zona del local (antes, la del navegador) y con año; `Total` nulo muestra "—".

**D-FF15 (18/11/2026) — Confirmada. Enlace a Trazabilidad desde la ocupación.** En el detalle, la ocupación activa o reservada y cada fila del historial muestran "Ver trazabilidad" **solo si `can("auditoria.ver")`**, con `<Link to={buildTrazabilidadPath({ ocupacionId })}>` de `src/utils/trazabilidadLink.js` (D-FD5, spec 04). Nunca se arma el texto a mano. El id es el `ocupacionId` de `ocupacionActiva`; en las filas del historial es el `id` del ítem, que **es el id de la ocupación** (inventario, "Comportamiento"; la fila no tiene `ocupacionId`). No hay filtro por cochera en Trazabilidad (PB-1): el enlace es por ocupación, no por cochera. Por usar `buildTrazabilidadPath`, **esta spec se mergea después de la 04** (D-FF1).
*Motivo:* pedido del desarrollador y contrato de `brechas-front.md`.
*Descartado:* enlace sin comprobar el permiso: un ENCARGADO u OPERADOR terminaría en "No tenés permiso" (regla 4 de D-FD5).

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FF1 | Inventario, `PUT /Cochera/{id}/estado` | El backend **permite** bloquear una cochera `RESERVADA` (reserva futura) sin error | El front no ofrece "Bloquear" en `RESERVADA` (D-FF9, decisión del desarrollador del 18/11/2026) | Evitar una cochera bloqueada con una reserva vigente que no se podría usar | Si se decide ofrecerlo, con aviso de la reserva |

### 4.2 Pendientes

**Del backend: cerrados (18/11/2026).** P-FF-B1 a P-FF-B7 los relevó el Orquestador del código y quedaron en `docs/inventario/backend.md`, sección `/Cochera`, "Comportamiento" (sin confirmar por tests). Se incorporaron en D-FF5 a D-FF11 y D-FF15 y en los casos del paso 1. Resumen: B1 `PUT /estado` con 3 o 4 da 400 `datos_invalidos`, bloquear con ocupación en curso da 409 `cochera_con_ocupacion_activa`, con reserva futura se permite, y `nota: null` borra (D-FF9); B2 todo o nada, tope de 100 (D-FF7); B3 se edita con la cochera ocupada, `null` borra y `""` no (D-FF8); B4 el listado no trae `nota` (D-FF6); B5 `ocupacionActiva` no implica `OCUPADA`, puede venir en una `BLOQUEADA`, `precioTotal` suele ser `null` (D-FF5); B6 el `id` del historial es el de la ocupación (D-FF15); B7 `/disponibles` con `hasta <= desde` da 400 `datos_invalidos` (informa a la 07).

**Del desarrollador o de otras specs (no frenan la ejecución).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FF1 | Historia de una cochera (quién la bloqueó y cuándo): depende de PB-1 (`/Trazabilidad` filtrada por `entidad` y `entidadId`). Hasta entonces, solo el enlace por ocupación | — |
| P-FF2 | `GET /Cochera` no pagina y la grilla dibuja todas. Si un local pasara de unos cientos de cocheras, virtualizar o pedir paginación | — |
| P-FF3 | **Cerrado (18/11/2026).** `MAX_ALTA_RANGO = 100` coincide con el tope del backend (inventario, "Comportamiento") | — |
| P-FF4 | La 07 puede querer mostrar el estado de la cochera elegida en el alta de ocupación; la 06 no deja ningún gancho más que `listCocherasDisponibles` | — |
| P-FF5 | **PB-4 (backend, posible bug, prioridad alta):** `CocheraService` calcula el estado con `DateTime.Now` en el listado y el detalle, y con `DateTime.UtcNow` en `PUT /estado` y en `/disponibles`. Si el servidor no corre en UTC, el `estado` (y `OCUPADA`/`RESERVADA`) que ve la pantalla puede no coincidir con el que valida el backend al bloquear, y `tarjetaInfo` puede mostrar una reserva como ocupada. El front no lo corrige: decide por `estado` y el servidor manda. Se verifica en el paso 3 con el servidor real | 3 |
| P-FF6 | **Cerrado (18/11/2026).** El desarrollador eligió: (1) "Bloquear" solo en `DISPONIBLE`; (2) desbloquear **conserva** el motivo (precarga la nota actual); (3) la tarjeta de una `BLOQUEADA` con `ocupacionActiva` muestra "Bloqueada" y "ocupada por X" o "reservada desde dd/mm" | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FF-L1 | La 02 y la 04 están mergeadas en `develop`: existen `fechas.js`, `useTenantDates.js`, `formato.js`, `enums.js`, `api/params.js` y `src/utils/trazabilidadLink.js` (con `buildTrazabilidadPath`); y la excepción de `Cocheras.jsx` en `eslint.config.js` | Si falta algo, **frenar** y avisar al Orquestador: no se implementa nada de la 02 ni de la 04 desde acá |
| P-FF-L2 | La forma real de `today`/`formatInstant` en `useTenantDates()` y la firma de `ApiError` | Ajustar el uso a lo que exista y anotarlo |
| P-FF-L3 | Que `estado` llegue como **entero** en `/Cochera` y `/Cochera/{id}`, y `tipo` de ocupación también | Si llega como texto, **frenar** y avisar (cambia `enums.js`) |
| P-FF-L4 | Que `eslint.config.js` tenga la excepción de `Cocheras.jsx` creada por la 02 | Si tiene otro formato, retirarla igual y anotarlo |
| P-FF-L5 | Que `EstadoOcupacion` y `TipoOcupacion` tengan etiqueta y color en `enums.js` | Si falta algo, frenar |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de API de cocheras | `src/api/cocheraApi.js` | D-FF2 |
| Lógica pura de cocheras | `src/utils/cocheras.js` | D-FF3, D-FF5, D-FF7 a D-FF9, D-FF11, D-FF13 |
| Tests | `test/unit/utils/cocheras.test.js`, `test/unit/api/cocheraApi.test.js` | D-FF2, D-FF13 |
| Manual de esta spec | `docs/manual/frontend/06-cocheras.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/pages/Cocheras.jsx` | Usa `cocheraApi`, `cocheras.js`, enums, fechas del tenant y `formatMoney`; agrega diálogos de alta, edición y bloqueo, y el enlace; retira las copias | D-FF2 a D-FF15 |
| `eslint.config.js` | Se retira la excepción temporal de `Cocheras.jsx` | D-FF14 |
| `docs/specs/README.md` | Estado de la fila 06 (lo actualiza el Orquestador al aprobar; el ejecutor lo pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada. (`Cocheras.jsx` queda con el mismo nombre y ruta.)

### 5.4 No se tocan

`src/auth/routes.js` (la ruta y `cocheras.ver` ya están), `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js` (D-FF11), `src/pages/Ocupaciones.jsx` (la 07 usará `listCocherasDisponibles`) y **`CLAUDE.md`** (la línea de endpoints la reemplaza la 02).

## 6. Pasos

**Regla de ruteo (obligatoria).** El ejecutor **no corre comandos de terminal** y **no le pregunta nada al usuario** en su chat. Todo pasa por el chat "Orquestador" (`SendMessage`): los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, y las decisiones que la spec no prevé. Espera su respuesta.

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-cocheras` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores y `npm test` en verde (los comandos los corre el usuario, pedidos por el Orquestador), el paso tildado en esta spec, el manual al día y el commit confirmado por el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**, y se avisa al Orquestador. Lo único que el ejecutor resuelve solo es P-FF-L2 y P-FF-L4, con la regla que cada uno fija.
- Antes del PR: rebase sobre `develop`. Un conflicto en `eslint.config.js` entre excepciones de distintas specs es trivial: se conservan las de las páginas que siguen sin migrar.

### Paso 0 — Precondiciones y worktree

- [ ] **0.1** Confirmar que la 02 y la 04 están mergeadas en `develop` y resolver **P-FF-L1** (existen los archivos y la entrada de lint). Si no, frenar.
- [ ] **0.2** Pedir al Orquestador el comando, desde `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-cocheras -b feature/front-cocheras develop`. En el worktree, copiar el `.env` (no está versionado) y `npm install`. Resolver P-FF-L2, P-FF-L3 y P-FF-L5.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — Lógica pura

- [ ] **1.1** Crear `src/utils/cocheras.js` con las funciones de D-FF13 y `test/unit/utils/cocheras.test.js`. `MAX_ALTA_RANGO` es 100 (P-FF3, cerrado).

  *Aceptación:* `npm test` pasa con estos casos (`now = 2026-11-18T15:00:00.000Z`; `existentes = [12, 13, 40]` salvo que se indique):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `parseRango("10", "25")` | `ok`, `desde: 10`, `hasta: 25`, `cantidad: 16` |
  | 2 | `parseRango(" 7 ", "")` y `parseRango("7", "7")` | `ok`, `cantidad: 1` |
  | 3 | `parseRango("", "")` y `parseRango("abc", "")` | Error "Ingresá el número de la primera cochera" |
  | 4 | `parseRango("0", "5")`, `parseRango("1000", "")`, `parseRango("5", "1000")` | Error "Los números van del 1 al 999" |
  | 5 | `parseRango("1.5", "")`, `parseRango("1e2", "")`, `parseRango("-3", "")` | Error de número |
  | 6 | `parseRango("5", "3")` | Error "El \"Hasta\" no puede ser menor que el \"Desde\"" |
  | 7 | `parseRango("1", "100")` y `parseRango("1", "101")` (con `MAX_ALTA_RANGO = 100`) | `ok` (cantidad 100) y error "Podés crear hasta 100 cocheras por vez" |
  | 8 | `previewRango("10", "15", existentes)` | `choques: [12, 13]`, no creable |
  | 9 | `previewRango("10", "11", existentes)` | `ok`, `texto` con "2 cocheras" y "del 10 al 11", sin choques |
  | 10 | `previewRango("1", "30", [1..30])` | `choques` con los 30 pero el texto lista a lo sumo 10 y dice "y 20 más" |
  | 11 | `buildCreateBody` con (10, 25), (10, 10) y (10, sin hasta) | `{ desde: 10, hasta: 25 }`, `{ desde: 10 }` y `{ desde: 10 }` (sin la clave `hasta` en los dos últimos) |
  | 12 | `validateEditCochera({ numero: "12", nota: "x" }, { actual: 12, existentes })` | `ok` (el mismo número no es choque) |
  | 13 | `validateEditCochera({ numero: "13", nota: "" }, { actual: 12, existentes })` | Error de número repetido |
  | 14 | `validateEditCochera` con número `""`, `"0"`, `"1000"` y nota de 301 caracteres | Error de número y error de nota, cada uno en su campo |
  | 15 | `buildUpdateBody(12, " reparada ")` y `buildUpdateBody(12, "   ")` | `{ numero: 12, nota: "reparada" }` y `{ numero: 12, nota: null }` |
  | 16 | `validateBloqueo("")`, `("   ")` y 301 caracteres | Errores "Contanos el motivo del bloqueo" (los dos primeros) y "El motivo no puede superar 300 caracteres" |
  | 17 | `validateBloqueo(" en reparación ")` | `ok`, nota `"en reparación"` |
  | 18 | `accionesDeEstado` con DISPONIBLE, BLOQUEADA, OCUPADA, RESERVADA y 99 | `{ bloquear: true, desbloquear: false }`, `{ false, true }`, y `{ false, false }` para OCUPADA, RESERVADA y 99 |
  | 18d | `buildEstadoBody(BLOQUEADA, " en reparación ")`, `buildEstadoBody(DISPONIBLE, "en reparación")` (nota precargada y sin editar), `buildEstadoBody(DISPONIBLE, "")` y `buildEstadoBody(DISPONIBLE, "  ")` | `{ estado: 2, nota: "en reparación" }`, `{ estado: 1, nota: "en reparación" }` (conserva el motivo), `{ estado: 1, nota: null }` y `{ estado: 1, nota: null }` (el usuario la borró; nunca `""`) |
  | 19 | `vencimientoTexto("2026-11-18T17:30:00.000Z", now)` | "vence en 2h 30m" |
  | 20 | `vencimientoTexto("2026-11-18T14:15:00.000Z", now)` | "venció hace 45m" |
  | 21 | `vencimientoTexto("2026-11-19T18:00:00.000Z", now)` y `("2026-11-18T15:20:00.000Z", now)` | "vence en 1d 3h" y "vence en 20m" |
  | 22 | `vencimientoTexto(null, now)` | `""` |
  | 23 | `tarjetaInfo` con estado OCUPADA y `ocupacionActiva` con `fin` | `modo: "ocupada"`, con `cliente`, `fin` y `vence` |
  | 24 | `tarjetaInfo` con estado RESERVADA | `modo: "reservada"`, con `inicio`; `vence` vacío |
  | 25 | `tarjetaInfo` con estado DISPONIBLE, BLOQUEADA sin `ocupacionActiva`, y OCUPADA sin `ocupacionActiva` | `modo: "ninguno"` |
  | 25b | `tarjetaInfo` con BLOQUEADA y `ocupacionActiva.inicio` anterior a `now`; y posterior a `now` | `modo: "ocupada"`; y `modo: "reservada"` |
  | 26 | `tarjetaInfo` con OCUPADA y `fin: null` | `modo: "ocupada"`, `fin: null`, texto "Sin hora de fin" |
  | 27 | `shouldReloadAfter` | Verdadero para `cochera_no_encontrada`, `cochera_numero_repetido`, `cochera_bloqueada`, `cochera_con_ocupacion_activa`, `cochera_no_disponible`; falso para `datos_invalidos`, `sin_permiso`, un código desconocido y `undefined` |
  | 28 | `shouldCloseDetailAfter` | Verdadero solo para `cochera_no_encontrada` |

  `npm run lint` y `npm run build` pasan.

### Paso 2 — Módulo de API

- [ ] **2.1** Crear `src/api/cocheraApi.js` (D-FF2) y `test/unit/api/cocheraApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* `npm test` pasa con: `listCocheras` hace `GET /Cochera`; `getCochera(5, { historialTake: 20 })` hace `GET /Cochera/5` con `params: { historialTake: 20 }` y `getCochera(5)` sin `params` vacíos con claves; `createCocheras({ desde: 1, hasta: 3 })` hace `POST /Cochera` con el cuerpo sin modificarlo y devuelve el arreglo; `updateCochera(5, body)` hace `PUT /Cochera/5` y devuelve `undefined`; `setEstadoCochera(5, body)` hace `PUT /Cochera/5/estado` y devuelve `undefined`; `listCocherasDisponibles({ desde, hasta })` hace `GET /Cochera/disponibles` con esos dos `params`; una respuesta que no es un arreglo en `listCocheras` y `listCocherasDisponibles` lanza `ApiError` con `code: "respuesta_invalida"`; ninguna función captura errores (un rechazo de `http` se propaga). `npm run lint` y `npm run build` pasan.

### Paso 3 — Vista de lectura: grilla, tarjeta y detalle

- [ ] **3.1** En `Cocheras.jsx`: cargar con `cocheraApi` (D-FF12), usar `EstadoCochera` (D-FF4), `tarjetaInfo` y las fechas del tenant (D-FF5), y retirar `formatDateTime`, `toLocaleDateString`, `ESTADO_COCHERA`, `estadoChip` y `diffHuman` (D-FF14). Estado de error de carga y vacío.
- [ ] **3.2** Detalle (D-FF6): nota, ocupación o reserva completa, historial de 20 con `formatMoney`, enlace a Trazabilidad con `can("auditoria.ver")` (D-FF15). Descarte de respuestas viejas.
- [ ] **3.3** Los botones de estado actuales quedan por ahora; se reemplazan en el paso 6.

  *Aceptación (manual, con el backend de `develop`, `America/Montevideo`):* (1) en Network, la carga llama a `GET /Cochera` y el detalle a `GET /Cochera/{id}?historialTake=20`; (2) una cochera `OCUPADA` muestra cliente, "vence en…" o "venció hace…" y "Hasta dd/mm/yyyy HH:mm"; una `RESERVADA` muestra "Desde …"; las horas coinciden con las de la API en la zona del local; (3) un total nulo muestra "—", no "$null"; (4) con `dueno@demo.test` y `auditor@demo.test` el detalle muestra "Ver trazabilidad" y abre `/trazabilidad?ocupacionId=N`; con `encargado@demo.test` y `operado@demo.test` no se ve; (5) dos clics rápidos en tarjetas distintas dejan el detalle de la última; (6) con el backend apagado se ve "No pudimos cargar las cocheras" y no una grilla vacía; (7) una búsqueda de `formatDateTime`, `toLocale`, `ESTADO_COCHERA` y `estadoChip` en `Cocheras.jsx` no da coincidencias. `npm run lint` y `npm run build` pasan.

### Paso 4 — Alta por rango

- [ ] **4.1** Botón "Agregar cocheras" (solo con `cocheras.gestionar`) y diálogo con "Desde", "Hasta" y la vista previa de `previewRango` (D-FF7).
- [ ] **4.2** Envío con `buildCreateBody` y `cocheraApi.createCocheras`; en éxito: aviso con la cantidad devuelta, cierre y recarga. En error: `showApiError` y, si `shouldReloadAfter(e.code)`, recarga con el diálogo abierto (D-FF11).

  *Aceptación (manual, con `dueno@demo.test`):* (1) "Desde" `1000`, `0` y `abc`, y "Hasta" menor que "Desde", muestran el mensaje y dejan "Crear" deshabilitado, sin ir a la red; (2) con cocheras existentes, un rango que las incluye muestra "Ya existen las cocheras: …" y bloquea; (3) un rango libre de 3 números manda `POST /Cochera` con `{ desde, hasta }`, responde 201 y aparecen 3 cocheras `DISPONIBLE`; (4) un solo número manda `{ desde }` sin `hasta`; (5) más de `MAX_ALTA_RANGO` se bloquea; (6) un alta con un número creado por otra pestaña (segunda pestaña) muestra el `title` de `cochera_numero_repetido` y la lista se recarga; (7) con `operado@demo.test` y `auditor@demo.test` no se ve el botón. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 5 — Edición

- [ ] **5.1** Botón "Editar" en el detalle (solo con `cocheras.gestionar`) y diálogo con número y nota, contador y aviso para `OCUPADA`/`RESERVADA` (D-FF8).
- [ ] **5.2** Envío con `buildUpdateBody` y `cocheraApi.updateCochera`; en éxito: aviso, cierre y recarga de lista y detalle. En error: `showApiError` y recarga según `shouldReloadAfter`; `cochera_no_encontrada` cierra el detalle (`shouldCloseDetailAfter`).

  *Aceptación (manual, con `dueno@demo.test`):* (1) cambiar solo la nota (mismo número) responde 204 y el detalle muestra la nota nueva; (2) cambiar el número a uno libre actualiza la grilla; (3) un número que ya tiene otra cochera se bloquea en el diálogo; (4) editar una cochera `OCUPADA` muestra el aviso y envía, y el backend responde 204 (no chequea el estado); (5) una nota de 301 caracteres no llega a la red; (6) editar una cochera que otro usuario dejó inexistente muestra el `title` de `cochera_no_encontrada`, cierra el detalle y recarga; (7) con `operado@demo.test` no se ve "Editar". `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Bloquear y desbloquear

- [ ] **6.1** Reemplazar el campo de nota y los dos botones del detalle por las acciones de `accionesDeEstado` (D-FF9): "Bloquear" abre un diálogo con motivo obligatorio; "Desbloquear" con nota opcional. Solo con `cocheras.cambiar_estado`.
- [ ] **6.2** Envío con `cocheraApi.setEstadoCochera` usando `EstadoCochera.BLOQUEADA` y `EstadoCochera.DISPONIBLE`; recarga de lista y detalle; errores por `code` (D-FF11).

  *Aceptación (manual, con `dueno@demo.test` y `operado@demo.test`):* (1) en una `DISPONIBLE` solo aparece "Bloquear"; en una `BLOQUEADA`, solo "Desbloquear"; en `OCUPADA` y en `RESERVADA`, ninguno; (2) "Bloquear" sin motivo, o con 301 caracteres, no llega a la red; (3) con motivo, el `PUT /Cochera/{id}/estado` va con `{ estado: 2, nota }` y la cochera queda `BLOQUEADA` con la nota visible en el detalle; (4) "Desbloquear" abre el diálogo con la nota actual precargada y, sin tocarla, va con `{ estado: 1, nota }` con ese mismo texto (conserva el motivo); si se borra a propósito va con `nota: null` (nunca `""`); la cochera queda `DISPONIBLE`, o `OCUPADA`/`RESERVADA` si tiene una ocupación en curso o una reserva (el estado se recalcula); (4b) forzar un bloqueo de una `OCUPADA` desde DevTools muestra el `title` de `cochera_con_ocupacion_activa` y recarga; (5) ninguna petición lleva `estado` 3 o 4; (6) con `auditor@demo.test` no se ve ninguna acción de estado; con `operado@demo.test` se ven y no se ven "Agregar cocheras" ni "Editar"; (7) un `PUT /estado` forzado desde DevTools con `auditor@demo.test` muestra el `title` de `sin_permiso` y la pantalla sigue. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 7 — Lint, documentación y cierre

- [ ] **7.1** Retirar la excepción de `Cocheras.jsx` de `eslint.config.js` (P-FF-L4). **No** tocar `CLAUDE.md`.
- [ ] **7.2** Crear `docs/manual/frontend/06-cocheras.md`: estados calculados y qué se puede enviar, alta por rango (vista previa y tope), edición, bloqueo, errores por `code`, tabla de permisos, el comportamiento del backend relevado (`nota: null` borra, prioridad de estados, tope de 100) y PB-4.
- [ ] **7.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; `Cocheras.jsx` no está en las excepciones de `eslint.config.js` y el lint falla si se le agrega un `toLocaleString()`; `git diff develop -- CLAUDE.md src/pages/Ocupaciones.jsx` vacío.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Entrar a `/cocheras` con `dueno@demo.test` | `GET /Cochera` responde 200; tarjetas con cliente y horario según el estado |
| 3 | Cambiar la zona del sistema operativo y recargar | Las horas mostradas no cambian (zona del local) |
| 4 | Alta de 3 cocheras libres con vista previa | `POST /Cochera` con `{ desde, hasta }`; 201; aparecen como disponibles |
| 5 | Alta de un rango que choca con existentes | "Crear" bloqueado y números en choque listados |
| 6 | Alta con una sola cochera | Cuerpo sin `hasta` |
| 7 | Editar nota y número de una cochera | 204; el detalle y la grilla se actualizan |
| 8 | Editar el número de una `OCUPADA` | Aviso; el backend lo permite (204) |
| 9 | Bloquear sin motivo | No llega a la red; mensaje |
| 10 | Bloquear con motivo y desbloquear sin tocar la nota precargada | `estado` 2 y 1; nota visible tras bloquear; al desbloquear el `PUT` lleva la misma nota y el motivo se conserva; nunca 3 o 4 |
| 10b | Desbloquear borrando la nota a propósito | `PUT` con `nota: null`; el motivo se elimina |
| 10c | Cochera `RESERVADA` y `OCUPADA` | Sin "Bloquear" |
| 10d | Cochera `BLOQUEADA` con ocupación o reserva | Chip "Bloqueada" y "ocupada por X" o "reservada desde dd/mm" |
| 11 | `auditor@demo.test`, `operado@demo.test`, `encargado@demo.test` | Cada uno ve solo las acciones de la tabla de D-FF10 |
| 12 | Con `dueno@demo.test` y `auditor@demo.test`, enlace del detalle | Abre `/trazabilidad?ocupacionId=N` |
| 13 | Dos pestañas: crear el mismo número en las dos | La segunda muestra el `title` de `cochera_numero_repetido` y recarga |
| 14 | Backend apagado | "No pudimos cargar las cocheras" con "Reintentar" |
| 15 | Búsqueda de `formatDateTime`, `toLocale`, `ESTADO_COCHERA`, `estadoChip` y `diffHuman` en `Cocheras.jsx` | Sin coincidencias |
| 16 | `git diff develop -- CLAUDE.md src/pages/Ocupaciones.jsx` | Vacío |

**No verificable en el producto:** que el estado del listado coincida siempre con el que valida `PUT /estado` si el servidor no corre en UTC (PB-4, P-FF5): se anota qué se vio en el servidor real. El rechazo de `PUT /estado` con 3 o 4 solo se ve forzando el pedido desde DevTools.

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador respondió las preguntas de producto (alta con vista previa, edición de ocupada con aviso, nota obligatoria al bloquear, forma de OCUPADA y RESERVADA), eligió "Bloquear" solo en `DISPONIBLE`, que desbloquear **conserve** el motivo (precarga la nota actual) y la forma de una `BLOQUEADA` con `ocupacionActiva` en la tarjeta, y aprobó el resto. Todas las decisiones D-FF quedan Confirmadas. Los huecos del backend (B1 a B7) quedaron relevados en el inventario ("Comportamiento") y están incorporados. Pendiente de backend sin bloqueo: PB-4 (`DateTime.Now` vs `UtcNow`, P-FF5). Falta que la 02 y la 04 estén mergeadas para ejecutar.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-cocheras` (rama `feature/front-cocheras`), creado desde `develop`. **Solo puede arrancar con la 02 y la 04 mergeadas en `develop`** (P-FF-L1). Un chat para todos los pasos:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 7 | Sonnet | bajo–medio | Pantalla con lógica pura chica y decisiones tomadas. Frena al terminar cada paso. Si P-FF-L1 o P-FF-L3 no dan, **frena** y avisa al Orquestador: no implementa nada de la 02 ni de la 04 |

**Prompt para el chat de ejecución:**

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-cocheras` (rama `feature/front-cocheras`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/specs/frontend/04-trazabilidad.md` (solo D-FD5) y `docs/specs/frontend/06-cocheras.md`. Ejecutá **los pasos de la 06**, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FF-L1: si la 02 o la 04 no están implementadas en `develop`, frená. Al terminar cada paso, pedile al Orquestador la confirmación antes de seguir. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md`. No corras comandos de terminal. Todo lo que necesites del usuario pasa por el chat "Orquestador" por SendMessage: comandos (exactos y con su carpeta), confirmaciones de cierre de paso y de commit, y decisiones que la spec no prevé. Esperá su respuesta y no le preguntes nada al usuario en tu chat. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 1, 2 y 7 (hay una tabla de casos y decisiones tomadas). Sonnet con esfuerzo medio para los pasos 3 a 6 (pantalla y diálogos). Se sube a Opus únicamente si aparece una decisión que la spec no previó (por ejemplo, que PB-4 resulte en una discrepancia real de estados que obligue a cambiar cómo se decide la tarjeta).
