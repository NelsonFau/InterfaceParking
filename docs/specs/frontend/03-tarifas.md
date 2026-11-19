# 03 — Tarifas con vigencia

> Frontend · **Aprobada** (18/11/2026) · `feature/specs-etapa2` (esta spec, rama compartida con otros redactores) y `feature/front-tarifas` (ejecución, en el worktree `../parkingcontrol-front-tarifas`, a crear desde `develop` cuando la 02 esté implementada y mergeada) · Última actualización 18/11/2026
>
> Tercera spec del frontend. Reconecta la pantalla de Tarifas con la API de vigencia: hoy llama a `GET /Tarifa/activas`, que ya no existe, y manda `vigenteDesde` con un formato que el backend no acepta. Depende de la spec 02 (fechas con zona del tenant, enums, `formatMoney`, patrón de `src/api/`), que está aprobada pero todavía no implementada: acá se usan sus funciones por nombre.

## 1. Objetivo y alcance

**Objetivo.** Que el dueño del local pueda ver qué precio rige hoy para cada tipo de ocupación (Hora, Día, Mes), cuáles están programadas hacia adelante, cambiar un precio con fecha de vigencia y quitar una programación; y que el resto de los roles vea lo mismo sin poder tocarlo.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `src/api/tarifaApi.js` con una función por endpoint (`vigentes`, `historial`, `PUT`, `DELETE`) | D-FC2 |
| Fechas | `vigenteDesde` y `vigenteHasta` como `DateOnly`, nunca por `Date`. "Hoy" en la zona del tenant | D-FC3 |
| Lógica pura | `src/utils/tarifas.js`: estado de una tarifa, validación del formulario, cuerpo del `PUT`, resumen de confirmación, códigos que obligan a recargar | D-FC4, D-FC8, D-FC11, D-FC13 |
| Tarjetas por tipo | Tarifa vigente y, debajo, la próxima programada con "Quitar" | D-FC5, D-FC6 |
| Historial | Todas las tarifas del tipo con su estado (Vigente, Programada, Finalizada); en las programadas, "Editar" y "Quitar" | D-FC5, D-FC6, D-FC9 |
| Cambio de precio | Diálogo con precio y fecha opcional (`<input type="date">`), validación con los límites del backend y paso de confirmación | D-FC7, D-FC8 |
| Permisos y errores | `tarifas.editar` oculta toda acción de escritura; errores por `code`, con recarga cuando el estado cambió | D-FC10, D-FC11 |
| Retiro | Las copias `fmtDate`, `TIPOS` y `money` de `Tarifas.jsx` y su excepción de lint | D-FC14 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Ajuste de precio de contratos mensuales (`POST /Ocupacion/ajuste-precio` y `POST /Ocupacion/{id}/precio`) | Spec 10. Pendiente P-FC1: decide si su entrada vive en Tarifas |
| `tarifa_no_configurada` (409) | No sale de `/Tarifa`: la lanza el alta de ocupación. Es de la spec 07 |
| Errores por campo en el formulario (`errors` de `datos_invalidos`) | El cliente valida los mismos límites antes de enviar; el aviso con el `title` alcanza (D-FC11) |
| Rediseño visual | Después, con el diseño nuevo |
| Moneda por tenant | P-FB3 de la spec 02: `formatMoney` fija `UYU` |
| `CLAUDE.md`, línea "Backend endpoints used" | No se toca: la reemplaza la 02 en su paso 8 por una referencia a `docs/inventario/backend.md` (decisión del orquestador) |

**Estado de alcance.** Etapa 2 del frontend (conectar la funcionalidad del backend antes del diseño nuevo). No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02 ya mergeada al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Tarifa` y "Comportamiento" | Endpoints, forma de `Tarifa`, unicidad por `(tipo, vigenteDesde)`, varias futuras por tipo, reemplazo con fecha futura repetida, errores de `PUT` y `DELETE`, límites de `nuevoPrecio`, `vigenteHasta` calculado al leer | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 0, 2, 3 y 4 | `DateOnly` sin zona en la zona del tenant; enum `TipoOcupacion`; permisos `tarifas.ver` y `tarifas.editar` (solo DUENO); catálogo de `code` | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 1 y 5 | `/activas` retirado, `vigenteDesde` como instante (`Tarifas.jsx:139`), reparto de la 03 | 18/11/2026 |
| Spec 02 (`02-base-comun.md`), completa | `fechas.js` (D-FB5), `useTenantDates` (D-FB7), `enums.js` y `optionsOf` (D-FB11), `formatMoney` (D-FB12), patrón de `src/api/` (D-FB14), regla de lint y excepciones (D-FB9, sección 5.4) | 18/11/2026 |
| Spec 01 (`01-autenticacion-y-api.md`) | Formato de spec, `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), regla "lógica pura con Vitest" (D-FA4) | 09/11/2026 |
| Lectura de `src/pages/Tarifas.jsx`, `src/api/errors.js` y `src/constants/errorCodes.js` | Estado actual (sección 2.1); la firma de `ApiError`; que un código desconocido ya se trata como aviso | 18/11/2026 |
| Respuestas del desarrollador (18/11/2026) | Cómo se muestra la programada, borrado, fecha elegible y confirmación (D-FC5 a D-FC8) | 18/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar, se consultan en su versión vigente: MUI (`Dialog`, `Chip`, `TextField type="date"`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

Números de línea de `develop` al 18/11/2026.

| Pieza | Estado actual |
|---|---|
| Carga | `Tarifas.jsx:85` llama a `GET /Tarifa/activas` (404). El resultado se guarda en `activas` y se indexa por `tipo` |
| Historial | `GET /Tarifa/historial?tipo=N` armado con la URL a mano (l. 91); el efecto no descarta respuestas viejas si se cambia el tipo rápido |
| "Refrescar" | Recarga solo las activas, no el historial (l. 99–108) |
| Error de carga | Si la carga falla, la pantalla muestra "Sin tarifa activa" para los tres tipos, que es falso |
| Alta de tarifa | `PUT /Tarifa` con `vigenteDesde` desde un `datetime-local` convertido con `new Date(x).toISOString()` (l. 137–140): el backend espera `yyyy-MM-dd`. Manda `null` cuando está vacío |
| Validación | `!precio \|\| precio <= 0`. No valida decimales ni tope |
| Diálogo | El tipo es un `select` dentro del diálogo; al cambiarlo no se recalcula el precio sugerido |
| Copias locales | `TIPOS` (l. 28, etiquetas en mayúsculas "HORA/DIA/MES"), `money` (l. 35, sin el caso `null`), `fmtDate` (l. 47, zona del navegador) |
| Permisos | `can("tarifas.editar")` oculta "Actualizar" (D-FA10 de la 01). No hay borrado |
| Errores | `showApiError(e)` en todos los `catch` (spec 01) |

## 3. Decisiones

Prefijo **D-FC** ("frontend, tarifas"). Estado: **Confirmada** (la tomó el desarrollador, la aprobó con la spec o está fijada por una fuente). Todas están Confirmadas desde la aprobación del 18/11/2026. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FC1 (18/11/2026) — Confirmada. Rama y worktree.** Esta spec vive en `feature/specs-etapa2`. La ejecución va en `feature/front-tarifas`, en el worktree `../parkingcontrol-front-tarifas`, creada desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que la 02 esté implementada y mergeada en `develop`**: usa `fechas.js`, `useTenantDates`, `enums.js`, `formato.js` y `api/params.js`, que hoy no existen. Las specs se mergean en orden (02 → 03 → 04 → 05), con un rebase sobre `develop` antes de cada PR.

**D-FC2 (18/11/2026) — Confirmada. `src/api/tarifaApi.js` con el patrón D-FB14.** Funciones `async`, nombradas, que devuelven `data`, con JSDoc de tipos tomados del inventario, sin capturar errores y sin convertir fechas ni enums (reciben `DateOnly` y enteros ya listos):

| Función | Endpoint | Devuelve |
|---|---|---|
| `listTarifasVigentes()` | `GET /Tarifa/vigentes` | `{ tipo, vigente: Tarifa \| null, proxima: Tarifa \| null }[]` |
| `listTarifaHistorial(tipo)` | `GET /Tarifa/historial`, con `params: cleanParams({ tipo })` | `Tarifa[]` |
| `updateTarifa(body)` | `PUT /Tarifa` | `Tarifa` |
| `removeTarifa(id)` | `DELETE /Tarifa/{id}` | `undefined` (204) |

`Tarifa` = `{ id, tipo, precio, vigenteDesde: DateOnly, vigenteHasta?: DateOnly, vigente: boolean }`. Las dos funciones de lectura verifican que la respuesta sea un arreglo y, si no, lanzan `ApiError` con `code: "respuesta_invalida"`, igual que `normalizePaged` (una respuesta rara no se disfraza de "no hay tarifas"). Se prueba con `vi.mock` de `http` (ruta, `params` y cuerpo): es lógica de serialización, no requiere Testing Library.
*Motivo:* el patrón uniforme de la 02; la pantalla deja de armar URLs a mano.
*Descartados:* (a) seguir llamando a `http` desde la página: contradice D-FB14 y el pedido del desarrollador; (b) un objeto con métodos, como `pagosApi`: se descartó en D-FB14.

**D-FC3 (18/11/2026) — Confirmada. Fechas de vigencia como `DateOnly`.** `vigenteDesde` y `vigenteHasta` nunca pasan por `Date`. "Hoy" sale de `useTenantDates().today` (o de `todayInZone(timeZone)`); no se usa `new Date().toISOString().slice(0, 10)`. Para mostrar: `formatDateOnly`. Para el campo: `<input type="date">` con `dateOnlyToInput` e `inputToDateOnly`. Para comparar: la comparación de texto `yyyy-MM-dd` es válida porque ambos lados pasan antes por `isDateOnly`; se encapsula en `tarifas.js` (D-FC4).
*Motivo:* es el 400 o la fecha corrida que describe `brechas-front.md` (l. 139); un `DateOnly` pasado por `new Date("2026-11-10")` se muestra como el día anterior en Uruguay.

### 3.2 Vista

**D-FC4 (18/11/2026) — Confirmada. Estado de una tarifa, en una función pura.** `tarifaEstado(tarifa, today)` devuelve:

| Estado | Condición | Chip |
|---|---|---|
| `vigente` | `tarifa.vigente === true` | "Vigente" (`success`) |
| `programada` | `!vigente` y `vigenteDesde > today` | "Programada" (`info`) |
| `finalizada` | el resto (`vigenteDesde <= today` y no vigente) | "Finalizada" (`default`) |

Es la misma regla del backend (`vigenteDesde <= hoy` rige o rigió; `vigente` es la de mayor `vigenteDesde <= hoy`). Se usa el booleano que manda el servidor para "vigente" y la fecha solo para distinguir lo que todavía no rige.
*Aclaración sobre `finalizada` con `vigenteDesde == today`* (caso 4 de la tabla del paso 1): en la práctica no ocurre, porque una tarifa que empieza hoy es la vigente. Solo aparecería si el "hoy" del cliente y el del servidor difieren cerca de la medianoche. El caso existe para fijar el límite de la comparación (`>` estricto), **no es una regla de negocio**.
*Motivo:* no hay un campo "programada" en la API, y el chip y el botón "Quitar" dependen de esa distinción. Una función pura se prueba.
*Descartado:* decidir todo por fecha y descartar el booleano `vigente`: duplica una regla que el backend ya calcula.

**D-FC5 (18/11/2026) — Confirmada. Tarjetas y historial.**
- **Tarjeta de cada tipo** (los tres, en el orden de `/vigentes`: Hora, Día, Mes; la API siempre devuelve 3). Primera línea: etiqueta del tipo, `formatMoney(vigente.precio)` y "Vigente desde dd/mm/yyyy". Si `vigente` es `null`: "Sin tarifa vigente" y precio "—". **Debajo**, si hay `proxima`, una línea con el chip "Programada" y "Desde dd/mm/yyyy: $ X", más "Quitar" si el usuario tiene `tarifas.editar`. Si no hay, no se muestra nada.
- **Varias futuras por tipo.** El backend permite varias (unicidad por `(tipo, vigenteDesde)`) y `proxima` es solo la de menor fecha. Las demás se ven y se gestionan **en el historial**, que las incluye con su chip. Cuando se quita la próxima, la siguiente futura pasa a ser la próxima al recargar.
- **Historial.** Un selector de tipo, como hoy (etiquetas del enum). Cada fila: precio, "Desde dd/mm/yyyy" y "hasta dd/mm/yyyy" o "sin fecha de fin", y el chip de estado (D-FC4). Orden: el de la API (`vigenteDesde` descendente). En las filas `programada` y con permiso: "Editar" y "Quitar".
- Abrir el diálogo de cambio de precio desde la tarjeta de un tipo también posiciona el historial en ese tipo, para que el resumen de confirmación (D-FC8) conozca sus programadas.

*Motivo:* es lo que eligió el desarrollador para la próxima (línea debajo de la vigente); el historial ya es la vista completa y tiene el estado de cada fila, así que no hace falta otro lugar.
*Descartados:* (a) mostrar la programada solo en el historial, o en dos columnas "Vigente | Próxima": el desarrollador eligió la línea debajo; (b) cargar el historial de los tres tipos a la vez para mostrar "y N más programadas" en la tarjeta: son 2 pedidos más y estado extra por un dato que el historial ya muestra. Se revisa si en uso real hay muchas futuras (P-FC4).

**D-FC12 (18/11/2026) — Confirmada. Carga y estados de la pantalla.**
- Al entrar y en "Refrescar": `listTarifasVigentes` y `listTarifaHistorial(tipoHist)` **en paralelo**. Hoy "Refrescar" no recarga el historial.
- El efecto del historial descarta respuestas viejas (bandera `ignore` en la limpieza del efecto) si el tipo cambió mientras llegaba.
- Si `vigentes` falla, el estado queda en "no cargado" y la pantalla muestra "No pudimos cargar las tarifas" con "Reintentar", **no** "Sin tarifa vigente" (hoy un error se ve como si no hubiera tarifas). Si falla el historial, lista vacía y el aviso de `showApiError`.
- Después de **cualquier** escritura (`PUT`, `DELETE`) se recargan los dos, porque `vigenteHasta` y `proxima` se calculan al leer.
- Tras una escritura exitosa no hace falta actualizar el estado a mano: se recarga.

*Descartado:* actualizar el estado local en vez de recargar: el `vigenteHasta` de la fila anterior cambia con cada alta o baja, y duplicaría la regla del backend.

### 3.3 Escritura

**D-FC6 (18/11/2026) — Confirmada. Se puede quitar una programada desde la pantalla, sin diálogo de confirmación.** "Quitar" aparece en la próxima (tarjeta) y en cada fila `programada` del historial, solo con `tarifas.editar`. Llama a `DELETE /Tarifa/{id}`, avisa "Programación quitada" y recarga. No pide confirmación: es reversible (se vuelve a programar) y no afecta cobros hasta que la fecha llegue. El botón se deshabilita mientras la llamada está en curso.

**D-FC7 (18/11/2026) — Confirmada. Al cambiar un precio se elige la fecha.** El diálogo "Cambiar precio" tiene: tipo (**fijo**: el del botón que lo abrió, se muestra en el título, no es un `select`), precio (`type="number"`, `min` 0,01, `step` 0,01) y "Vigente desde" (`type="date"`, **opcional**, `min` = hoy, con el texto de ayuda "Vacío: rige desde hoy"). El precio sugerido es el vigente del tipo. Validación en `validateTarifaForm` (pura), con los límites del backend:

| Campo | Regla | Mensaje |
|---|---|---|
| `precio` | `^\d+(\.\d{1,2})?$` después de `trim` | "Ingresá un precio con hasta 2 decimales" |
| `precio` | mayor que 0 | "El precio debe ser mayor a 0" |
| `precio` | menor o igual a 10.000.000 | "El precio no puede superar $ 10.000.000" |
| `fecha` | vacía → se omite `vigenteDesde`; si no, `isDateOnly` | "La fecha no es válida" |
| `fecha` | no anterior a hoy | "La fecha no puede ser anterior a hoy" |

Vacío **omite** `vigenteDesde` del cuerpo (no manda `null`): el backend resuelve "hoy" en la zona del tenant. No se bloquea en el cliente una fecha igual a hoy cuando ya hay una tarifa que empieza hoy: da 409 `tarifa_ya_vigente` y el aviso lo explica (el backend es la autoridad de esa regla).
*Motivo:* el desarrollador eligió poder programar; es lo que habilita la próxima y el borrado. Fijar el tipo evita el precio sugerido desactualizado al cambiarlo (hoy pasa).
*Descartados:* (a) un selector "ahora / programar": una decisión más para el usuario sin ganar nada; (b) solo "desde hoy": sin programación no hay próxima ni borrado; (c) mandar siempre la fecha de hoy calculada en el cliente: dos fuentes de "hoy" para la misma regla.

**D-FC8 (18/11/2026) — Confirmada. Paso de confirmación dentro del mismo diálogo.** Al apretar "Guardar" y pasar la validación, el diálogo pasa a un resumen con "Volver" y "Confirmar":

> **Hora** · de $ 100,00 a $ 120,00 · rige desde hoy
> **Hora** · de $ 100,00 a $ 120,00 · rige desde el 01/12/2026
> *(si ya hay una programada para esa fecha)* Reemplaza la tarifa programada para esa fecha ($ 110,00).

`summarizeChange` (pura) calcula los datos: precio actual (la vigente, o ninguno), precio nuevo, fecha efectiva (hoy si no se eligió) y la programada que se reemplaza (la del historial con la misma `vigenteDesde`). El componente los formatea con `formatMoney`, `formatDateOnly` y el enum. Al confirmar se envía el `PUT`. No hay confirmación al quitar (D-FC6).
*Motivo:* el precio afecta cobros y un error de tipeo (1200 por 120) se detecta en el resumen; el reemplazo silencioso de una programada (comportamiento del backend) se vuelve visible.
*Descartado:* un `window.confirm`: sin el contexto del resumen y sin el estilo del resto de la app.

**D-FC9 (18/11/2026) — Confirmada. "Editar" una programada.** El backend reemplaza la tarifa si la fecha futura ya existe, así que editar es el mismo `PUT`. "Editar" en una fila `programada` abre el mismo diálogo con el tipo, el precio y la fecha de esa fila; **la fecha queda bloqueada** (cambiarla crearía otra tarifa en vez de editar). El resumen dice "Reemplaza la tarifa programada para esa fecha".
*Motivo:* costo casi nulo sobre D-FC7 y evita que el usuario tenga que adivinar que repetir la fecha reemplaza.
*Descartado:* no ofrecer "Editar" (obliga a tipear de nuevo la misma fecha para corregir un precio).

**D-FC10 (18/11/2026) — Confirmada. Permisos.** La ruta `/tarifas` exige `tarifas.ver` (todos los roles, ya está en `routes.js`). **Todo lo que escribe** (botón "Cambiar precio", "Editar", "Quitar") se oculta sin `tarifas.editar` (solo DUENO), con `can("tarifas.editar")`, nunca por rol (ARQ-4). Se oculta, no se deshabilita (D-FA10). Extiende la tabla de D-FA10: suma `DELETE /Tarifa/{id}`.

**D-FC11 (18/11/2026) — Confirmada. Errores por `code`.** Todos los `catch` llaman a `showApiError(e)`, que muestra el `title` del backend tal cual. No se agregan entradas a `errorCodes.js`: un código desconocido ya se trata como aviso y el texto es del backend (D-FA6). Lo que la 03 agrega es qué hace la pantalla **después** del aviso, en `shouldReloadAfter(code)` (pura):

| `code` | Cuándo | Aviso | Después |
|---|---|---|---|
| `tarifa_ya_vigente` | `PUT` con hoy y ya hay una que empieza hoy; `DELETE` de una que ya rige o rigió | `title` | Recarga. El diálogo, si estaba abierto, sigue abierto |
| `tarifa_no_encontrada` | `DELETE` de una tarifa que ya no existe (404) | `title` | Recarga |
| `tarifa_modificada` | Carrera con otro pedido (409; es una comprobación manual del backend, no `rowversion`) | `title` | Recarga. El reintento es **manual**, nunca automático |
| `datos_invalidos` | `PUT` con fecha pasada o precio fuera de rango (400, campos `VigenteDesde`, `NuevoPrecio`) | `title` | Sin recarga: no cambió ningún dato. El cliente ya valida los mismos límites |
| `sin_permiso` | Permisos cambiados a mitad de sesión | `title` | Sin recarga |
| `tarifa_no_configurada` | — | — | **No se mapea**: no sale de `/Tarifa` (spec 07) |

*Motivo:* en los tres códigos de arriba el estado que ve el usuario quedó viejo; recargar es lo que lo arregla. El aviso sigue teniendo un solo dueño (el backend).
*Descartado:* agregar los códigos a `errorCodes.js`: no cambian el tratamiento (siguen siendo aviso) y sumarían un lugar más que mantener.

### 3.4 Código

**D-FC13 (18/11/2026) — Confirmada. Lógica pura en `src/utils/tarifas.js`, probada con Vitest.** Exporta `MAX_PRECIO`, `tarifaEstado`, `validateTarifaForm`, `buildUpdateBody`, `summarizeChange` y `shouldReloadAfter` (D-FC4, D-FC7, D-FC8, D-FC11). Sin React ni estado, con `today` como parámetro explícito (ningún test depende de la fecha del sistema). `Tarifas.jsx` queda como orquestador de estado y diálogos.
*Motivo:* regla D-FA4 y principio de la 02: lo que no se puede romper tiene un test; la pantalla no tiene Testing Library.
*Descartado:* dejar la validación inline en la página: sin pruebas y con tres reglas nuevas (decimales, tope, fecha).

**D-FC14 (18/11/2026) — Confirmada. Retiro de las copias y de la excepción de lint.** `Tarifas.jsx` retira `fmtDate` (l. 47), `TIPOS` (l. 28) y `money` (l. 35). Usa `labelOf` / `optionsOf` de `TipoOcupacion` (`enums.js`), `formatMoney` (`formato.js`) y `formatDateOnly` (`fechas.js`). Se saca la excepción de `Tarifas.jsx` de `eslint.config.js` (D-FB9, tabla 5.4 de la 02). **Cambio visible:** las etiquetas pasan de "HORA / DIA / MES" a "Hora / Día / Mes" (las del enum). `formatMoney(null)` da "—" en vez de `$ 0,00`.

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FC1 | Spec 01, paso 6, aceptación (1) y (2) | "Tarifas carga las tarifas activas"; los roles sin `tarifas.editar` no ven "actualizar" | La pantalla carga vigentes y programadas, y "Cambiar precio", "Editar" y "Quitar" se ocultan sin `tarifas.editar` | La API cambió después de esa spec (retiró `/activas`) | — |
| DV-FC2 | Spec 02, D-FB14, regla 4 | Los módulos de API no convierten fechas ni enums | `tarifaApi.js` cumple la regla. `omitir vigenteDesde` cuando está vacío lo resuelve `buildUpdateBody` (en `tarifas.js`), no el módulo de API | Mantener la regla; el módulo manda el cuerpo tal cual | — |

### 4.2 Pendientes

**Del desarrollador o de otras specs (no frenan la ejecución).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FC1 | **Ajuste de precio de contratos mensuales** (`POST /Ocupacion/ajuste-precio`, `POST /Ocupacion/{id}/precio`; ambos con `tarifas.editar` y `vigenteDesde > hoy`). Es de la spec 10. Cuando se programa una tarifa MES, el flujo natural es "ajustar contratos": la 10 decide si esa entrada vive en la pantalla de Tarifas o en Ocupaciones. La 03 no deja ningún gancho | — |
| P-FC2 | **Cerrado (18/11/2026).** Huecos del inventario sobre `/Tarifa` (qué significan `tarifa_ya_vigente` y `tarifa_no_configurada`, qué pasa con una próxima existente, si `/historial` incluye programadas, si `/vigentes` trae siempre 3 tipos, límites de `nuevoPrecio`): relevados del backend e incorporados al inventario (sección `/Tarifa`, "Comportamiento") y a D-FC5 a D-FC11 | — |
| P-FC3 | `GET /Tarifa/historial` sin `tipo`: el backend no lo confirma. La UI siempre lo manda, no bloquea | — |
| P-FC4 | Si en uso real un tipo acumula muchas futuras, mostrar "y N más programadas" en la tarjeta (descartado en D-FC5) | — |
| P-FC5 | Cantidad de tarifas por tipo en `/historial` sin paginar: crece sin tope. Si se vuelve un problema, pedir paginación al backend | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FC-L1 | Que la 02 esté implementada tal como la spec: existen `src/utils/fechas.js`, `useTenantDates.js`, `formato.js`, `src/constants/enums.js`, `src/api/params.js`, y la entrada de `Tarifas.jsx` en la regla de lint | Si falta algo, **frenar**: no se implementa nada de la 02 desde acá |
| P-FC-L2 | La forma real de `today` en `useTenantDates()` (valor o función) y la firma de `ApiError` (`{ status, code, message, errors, traceId, response }`) | Ajustar el uso a lo que exista y anotarlo |
| P-FC-L3 | Que `tipo` llegue como **entero** en `/vigentes` y `/historial`, y que en `/historial` haya a lo sumo una fila `vigente` por tipo | Si `tipo` llega como texto, **frenar** (cambia `enums.js`). Si hay dos vigentes, frenar y avisar |
| P-FC-L4 | Que `eslint.config.js` tenga la excepción de `Tarifas.jsx` creada por el paso 8.1 de la 02 | Si tiene otro formato, retirarla igual y anotarlo |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de API de tarifas | `src/api/tarifaApi.js` | D-FC2 |
| Lógica pura de tarifas | `src/utils/tarifas.js` | D-FC4, D-FC7, D-FC8, D-FC11, D-FC13 |
| Tests | `test/unit/utils/tarifas.test.js`, `test/unit/api/tarifaApi.test.js` | D-FC2, D-FC13 |
| Manual de esta spec | `docs/manual/frontend/03-tarifas.md` | Metodología (como las 01 y 02) |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/pages/Tarifas.jsx` | Reescritura de la carga, tarjetas, historial y diálogo; usa `tarifaApi`, `tarifas.js`, enums, `formatMoney` y fechas del tenant; retira `fmtDate`, `TIPOS`, `money` | D-FC2 a D-FC14 |
| `eslint.config.js` | Se retira la excepción temporal de `Tarifas.jsx` | D-FC14 |
| `docs/specs/README.md` | Estado de la fila 03 (lo actualiza el orquestador al aprobar; el ejecutor lo pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada. (`Tarifas.jsx` queda con el mismo nombre y ruta.)

### 5.4 No se tocan

`src/auth/routes.js` (la ruta y `tarifas.ver` ya están), `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js` (D-FC11), `src/pages/Ocupaciones.jsx` (usa "tarifa excepcional", no `/Tarifa`) y **`CLAUDE.md`** (la línea de endpoints la reemplaza la 02).

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-tarifas` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde, el paso tildado en esta spec, el manual al día y el commit confirmado por el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo es P-FC-L2 y P-FC-L4, con la regla que cada uno fija.
- Antes del PR: rebase sobre `develop` (las specs se mergean en orden 02 → 03 → 04 → 05). Un conflicto en `eslint.config.js` entre excepciones de distintas specs es trivial: se conservan las de las páginas que siguen sin migrar.

### Paso 0 — Precondiciones y worktree

- [x] **0.1** Confirmar que la 02 está mergeada en `develop` y resolver **P-FC-L1** (existen los archivos y la entrada de lint). Si no, frenar.
- [x] **0.2** (Se ejecutó sin worktree: rama `feature/front-tarifas` directamente en `parkingcontrol-front`, por decisión del Orquestador.) Desde `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-tarifas -b feature/front-tarifas develop`. En el worktree, copiar el `.env` (no está versionado) y correr `npm install`. Resolver P-FC-L2.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — Lógica pura

- [x] **1.1** Crear `src/utils/tarifas.js` con las funciones de D-FC13 y `test/unit/utils/tarifas.test.js`.

  *Aceptación:* `npm test` pasa con estos casos (`today = "2026-11-18"` salvo que se indique):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `tarifaEstado` con `vigente: true` | `vigente` |
  | 2 | `vigente: false`, `vigenteDesde: "2026-12-01"` | `programada` |
  | 3 | `vigente: false`, `vigenteDesde: "2026-10-01"`, `vigenteHasta: "2026-11-17"` | `finalizada` |
  | 4 | `vigente: false`, `vigenteDesde: "2026-11-18"` (límite) | `finalizada` (solo fija el límite de la comparación; no ocurre en la práctica, ver la aclaración de D-FC4) |
  | 5 | `validateTarifaForm` con precio `"120"`, `"120.5"`, `"120.50"`, `" 120 "` | `ok`, `nuevoPrecio` numérico (120, 120.5, 120.5, 120) |
  | 6 | Precio `""`, `"0"`, `"0.00"`, `"-5"`, `"12.345"`, `"1e3"`, `"abc"`, `"120."` | Error de `precio` con el mensaje de D-FC7 que corresponda |
  | 7 | Precio `"10000000"` y `"10000000.00"` | `ok`. `"10000000.01"` da error de tope |
  | 8 | Fecha `""` | `ok`, `vigenteDesde: null` |
  | 9 | Fecha `"2026-11-18"` y `"2026-12-01"` | `ok` con esa fecha. `"2026-11-17"` da "La fecha no puede ser anterior a hoy" |
  | 10 | Fecha `"2026-02-30"` y `"18/11/2026"` | Error "La fecha no es válida" |
  | 11 | `buildUpdateBody(1, { nuevoPrecio: 120, vigenteDesde: null })` | `{ tipo: 1, nuevoPrecio: 120 }`, **sin** la clave `vigenteDesde` |
  | 12 | `buildUpdateBody(1, { nuevoPrecio: 120, vigenteDesde: "2026-12-01" })` | `{ tipo: 1, nuevoPrecio: 120, vigenteDesde: "2026-12-01" }` |
  | 13 | `summarizeChange` sin fecha, con vigente a 100 | Precio actual 100, nuevo 120, fecha efectiva = `today`, sin reemplazo |
  | 14 | `summarizeChange` con fecha futura y una programada con esa misma `vigenteDesde` en el historial | `reemplaza` = esa tarifa |
  | 15 | `summarizeChange` con fecha futura y programadas en otras fechas | Sin reemplazo |
  | 16 | `summarizeChange` con `vigente: null` | Precio actual `null` |
  | 17 | `shouldReloadAfter` | Verdadero para `tarifa_ya_vigente`, `tarifa_no_encontrada`, `tarifa_modificada`; falso para `datos_invalidos`, `sin_permiso`, `tarifa_no_configurada`, un código desconocido y `undefined` |

  `npm run lint` y `npm run build` pasan.

### Paso 2 — Módulo de API

- [x] **2.1** Crear `src/api/tarifaApi.js` (D-FC2) y `test/unit/api/tarifaApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* `npm test` pasa con: `listTarifasVigentes` hace `GET /Tarifa/vigentes`; `listTarifaHistorial(2)` hace `GET /Tarifa/historial` con `params: { tipo: 2 }`; `updateTarifa` hace `PUT /Tarifa` con el cuerpo recibido, sin modificarlo; `removeTarifa(7)` hace `DELETE /Tarifa/7` y devuelve `undefined`; una respuesta que no es un arreglo en las dos lecturas lanza un `ApiError` con `code: "respuesta_invalida"`; ninguna función captura errores (un rechazo de `http` se propaga). `npm run lint` y `npm run build` pasan.

### Paso 3 — Vista de lectura: tarjetas e historial

- [x] **3.1** En `Tarifas.jsx`: cargar con `tarifaApi` en paralelo (D-FC12), retirar `fmtDate`, `TIPOS` y `money` (D-FC14), resolver **P-FC-L3**, y dibujar las tarjetas por tipo (vigente + línea "Programada", D-FC5) y el historial con chips de estado.
- [x] **3.2** Quitar el diálogo viejo y el botón "Actualizar": se reemplazan en el paso 4. La pantalla hoy está rota (404), así que no hay regresión. "Quitar" y "Editar" tampoco aparecen todavía.
- [x] **3.3** Estado de error de carga ("No pudimos cargar las tarifas" + "Reintentar") y "Refrescar" que recarga vigentes e historial; el efecto del historial descarta respuestas viejas.

  *Aceptación (manual, con el backend de `develop` y un usuario cuyo tenant tenga `America/Montevideo`):* (1) en Network, la carga llama a `GET /Tarifa/vigentes` y a `GET /Tarifa/historial?tipo=1`, y responden 200; (2) con `dueno@demo.test`, cada tipo muestra su precio, "Vigente desde dd/mm/yyyy" y, si hay una programada, la línea con el chip "Programada"; un tipo sin tarifa muestra "Sin tarifa vigente" y "—"; (3) el historial muestra chips Vigente, Programada y Finalizada, y las fechas coinciden con las de la API (sin corrimiento de un día); (4) cambiar el tipo del historial rápido varias veces deja el último elegido; (5) con el backend apagado se ve "No pudimos cargar las tarifas" y no "Sin tarifa vigente"; (6) las etiquetas son "Hora / Día / Mes". `npm run lint` y `npm run build` pasan; una búsqueda de `fmtDate`, `money(` y `TIPOS` en `Tarifas.jsx` no da coincidencias.

### Paso 4 — Cambiar un precio

- [x] **4.1** (código incluido en el commit 3f8d03f, junto con el paso 3) Diálogo "Cambiar precio" (D-FC7): tipo fijo, precio, fecha opcional con `min` = hoy; el botón aparece solo con `can("tarifas.editar")` (D-FC10). Abrirlo posiciona el historial en ese tipo (D-FC5).
- [x] **4.2** (código incluido en el commit 3f8d03f) Paso de confirmación dentro del diálogo (D-FC8) con `summarizeChange`; "Volver" conserva lo escrito.
- [x] **4.3** (código incluido en el commit 3f8d03f) Envío con `buildUpdateBody` y `tarifaApi.updateTarifa`; en éxito: aviso "Tarifa actualizada", cierre y recarga. En error: `showApiError` y, si `shouldReloadAfter(e.code)`, recarga con el diálogo abierto (D-FC11). El botón de confirmar se deshabilita mientras envía.

  *Aceptación (manual, con `dueno@demo.test`):* (1) sin fecha, el `PUT` va con `{ tipo, nuevoPrecio }` y **sin** `vigenteDesde`; la respuesta es 200 y el precio vigente cambia; (2) con una fecha futura, el cuerpo lleva `vigenteDesde: "yyyy-MM-dd"` (nunca un instante con hora) y la tarjeta muestra la línea "Programada"; (3) repetir una fecha futura ya programada muestra en el resumen "Reemplaza la tarifa programada…" y, al confirmar, el historial tiene un precio nuevo para esa fecha y no un duplicado; (4) precio `0`, `12.345`, `10000001` y una fecha pasada no llegan a la red y muestran el mensaje de D-FC7; (5) cambiar el precio de un tipo que ya tiene una tarifa que empieza hoy muestra el aviso de `tarifa_ya_vigente` y el diálogo sigue abierto; (6) con `encargado@demo.test` y `operado@demo.test` no se ve "Cambiar precio"; (7) un `PUT` forzado con `operado@demo.test` desde DevTools muestra el `title` de `sin_permiso` y la pantalla sigue. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 5 — Quitar y editar programadas

- [ ] **5.1** "Quitar" en la línea "Programada" de la tarjeta y en las filas `programada` del historial (D-FC6), solo con `tarifas.editar`. `tarifaApi.removeTarifa`, aviso "Programación quitada" y recarga; sin diálogo de confirmación.
- [ ] **5.2** "Editar" en las filas `programada` del historial (D-FC9): abre el diálogo del paso 4 con tipo, precio y fecha de esa fila, fecha bloqueada.
- [ ] **5.3** Errores de `DELETE` por `code` (D-FC11): `tarifa_ya_vigente`, `tarifa_no_encontrada` y `tarifa_modificada` recargan después del aviso.

  *Aceptación (manual, con `dueno@demo.test`):* (1) programar dos fechas futuras para un tipo: la tarjeta muestra solo la más cercana y el historial muestra las dos como "Programada"; (2) "Quitar" en la de la tarjeta hace `DELETE /Tarifa/{id}` (204), la próxima pasa a ser la siguiente futura y el `vigenteHasta` de la fila anterior se actualiza; (3) "Quitar" en la otra fila del historial funciona igual; (4) las filas `Vigente` y `Finalizada` no tienen "Quitar" ni "Editar"; (5) "Editar" abre el diálogo con la fecha bloqueada y, al confirmar, el precio cambia sin crear una fila nueva; (6) quitar una programada que otro usuario ya quitó (segunda pestaña) muestra el `title` de `tarifa_no_encontrada` y la lista se recarga; (7) con `encargado@demo.test` no se ve ningún botón de escritura. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Lint, documentación y cierre

- [ ] **6.1** Retirar la excepción de `Tarifas.jsx` de `eslint.config.js` (P-FC-L4). **No** tocar `CLAUDE.md`.
- [ ] **6.2** Crear `docs/manual/frontend/03-tarifas.md`: cómo se calcula el estado de una tarifa, cómo se programa, se reemplaza y se quita, qué hace cada `code` de error y la tabla de permisos.
- [ ] **6.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; `Tarifas.jsx` no está en las excepciones de `eslint.config.js` y el lint falla si se le agrega un `toLocaleString()`; una búsqueda de `/activas` en `src/` no da coincidencias; `git diff develop -- CLAUDE.md` vacío.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Entrar a `/tarifas` con `dueno@demo.test` | `GET /Tarifa/vigentes` y `GET /Tarifa/historial?tipo=1` responden 200; sin 404 |
| 3 | Cambiar el precio de un tipo sin fecha | `PUT /Tarifa` sin `vigenteDesde`; rige desde hoy; el resumen decía "desde hoy" |
| 4 | Programar un precio para dentro de 10 días | `vigenteDesde` como `yyyy-MM-dd`; línea "Programada" en la tarjeta; chip en el historial |
| 5 | Programar dos fechas y quitar la próxima | La tarjeta pasa a mostrar la otra; no queda ningún `vigenteHasta` desactualizado |
| 6 | Repetir una fecha programada con otro precio | Resumen con "Reemplaza…"; un solo precio para esa fecha |
| 7 | Con la zona del sistema operativo cambiada, repetir 4 | Misma fecha enviada y mostrada (no depende de la zona del navegador) |
| 8 | `encargado@demo.test` y `operado@demo.test` | Ven vigentes, programadas e historial; ningún botón de escritura |
| 9 | Errores: precio `0`, `12.345`, `10000001`, fecha pasada | No llegan a la red; mensaje claro |
| 10 | Quitar una programada que ya no existe (dos pestañas) | Aviso con el `title` del backend y recarga |
| 11 | Backend apagado | "No pudimos cargar las tarifas" con "Reintentar" |
| 12 | Búsqueda de `fmtDate`, `money(`, `TIPOS`, `toLocale` y `/activas` en `Tarifas.jsx` y `src/` | Sin coincidencias en `Tarifas.jsx`; ninguna llamada a `/activas` |
| 13 | `git diff develop -- CLAUDE.md src/pages/Ocupaciones.jsx` | Vacío |

**No verificable en el producto:** el comportamiento ante una tarifa que empieza hoy con el cambio de día a medianoche (carrera de `tarifa_modificada`): lo cubre solo el mapeo por `code` de los tests del paso 1.

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador respondió las cuatro preguntas de producto (línea debajo de la vigente, borrado con `tarifas.editar` sin confirmación, fecha elegible y confirmación al guardar) y aprobó todas las decisiones que estaban en Propuesta (D-FC4, D-FC5 en lo de las futuras, D-FC8 en la forma del resumen, D-FC9, D-FC11 en el comportamiento, D-FC12 y D-FC13). Los huecos de `/Tarifa` los relevó el orquestador del backend (P-FC2). Todas las decisiones D-FC quedan Confirmadas. Falta implementar la 02 y mergearla para poder ejecutar.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-tarifas` (rama `feature/front-tarifas`), creado desde `develop`. **Solo puede arrancar cuando la 02 esté implementada y mergeada en `develop`** (P-FC-L1). Un chat para todos los pasos:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 6 | Sonnet | bajo–medio | Es una pantalla con lógica pura chica y decisiones ya tomadas. Frena al terminar cada paso. Si P-FC-L1 o P-FC-L3 no dan, **frena** y avisa al orquestador: no implementa nada de la 02 ni cambia `enums.js` |

**Prompt para el chat de ejecución:**

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-tarifas` (rama `feature/front-tarifas`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4) y `docs/specs/frontend/03-tarifas.md`. Ejecutá **los pasos de la 03**, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FC-L1: si la 02 no está implementada en `develop`, frená. Al terminar cada paso, pedile al Orquestador la confirmación antes de seguir. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md`. No corras comandos de terminal. Todo lo que necesites del usuario pasa por el chat "Orquestador" por SendMessage: comandos (exactos y con su carpeta), confirmaciones de cierre de paso y de commit, y decisiones que la spec no prevé. Esperá su respuesta y no le preguntes nada al usuario en tu chat. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 1 a 6 (hay una tabla de casos y decisiones tomadas). Sonnet con esfuerzo medio solo si el paso 4 (diálogo con confirmación) se complica. Se sube a Opus únicamente si aparece una decisión que la spec no previó (por ejemplo, que el backend cambie el contrato de `/vigentes`).
