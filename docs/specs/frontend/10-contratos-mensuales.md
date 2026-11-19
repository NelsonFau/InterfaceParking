# 10 — Contratos mensuales: ajuste de precio, baja programada y ajuste masivo

> Frontend · **Terminada** (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) · `feature/specs-etapa6` (esta spec) y `feature/front-contratos` (ejecución, en el repo principal sin worktree, a crear desde `develop`) · Última actualización 19/11/2026
>
> Décima spec del frontend. La 07 dejó en el detalle de la ocupación una sección **"Contrato mensual"** (solo para ocupaciones de tipo MES) con `modoMes` y `fraccionMes` de solo lectura. Esta spec **monta ahí las acciones sobre un contrato**: el **ajuste de precio individual** (`POST /Ocupacion/{id}/precio`) y la **baja programada** (`PUT /Ocupacion/{id}/fin`, con `null` para quitarla), y suma el **ajuste masivo** por porcentaje (`POST /Ocupacion/ajuste-precio`, con exclusiones) como un diálogo en el encabezado de Ocupaciones. Las funciones de API se **suman** a `ocupacionApi.js`, sin recrearlo. Programar una baja puede dejar saldo a favor y crear la alerta `DEVOLUCION_PENDIENTE`, que se resuelve con la devolución de la 08. **Depende de la 02** (fechas con zona del tenant, enums, `formatMoney`, patrón de módulos de API) y de la **07** (el detalle de la ocupación y su sección "Contrato mensual"); además se apoya en la **08** (la devolución) para el camino del saldo a favor. Las tres están ejecutadas en `develop`.
>
> **Estado de las decisiones.** **Todas las D-FJ (1 a 15) están Confirmadas** (19/11/2026): el desarrollador aprobó, por el Orquestador, las preguntas de producto P1 a P4 (dónde vive el ajuste masivo, cómo se excluye, la confirmación y sobre qué contratos se ofrece la baja), y las dudas de backend F1 a F6 están contestadas (sección 4.2). Los pedidos al backend PB-18 a PB-23 están aprobados y registrados en `brechas-front.md`. Ninguna decisión queda en Propuesta ni pendiente.

## 1. Objetivo y alcance

**Objetivo.** Que el personal gestione la vida de un contrato mensual sin tocar la base: cambiar el precio desde una fecha futura (de un contrato o de todos por porcentaje), programar la fecha de baja o quitarla, y enterarse cuando un cambio deja plata a favor del cliente. Cada usuario ve solo las acciones que su permiso le deja hacer, y el cliente **no valida las reglas de negocio ni los topes de configuración**: el backend es la autoridad y la pantalla muestra su `title`.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | Se suman a `src/api/ocupacionApi.js`: `adjustOcupacionPrecio`, `setOcupacionFin` y `adjustPreciosMensuales` | D-FJ2 |
| Sección "Contrato mensual" | `ContratoMensualSeccion` en el detalle de la ocupación: modo y fracción (de la 07), precio de partida, fin del contrato y las acciones | D-FJ3, D-FJ4 |
| Ajuste de precio individual | Diálogo con fecha desde la que rige, precio nuevo y motivo; muestra el precio anterior y el nuevo | D-FJ5 |
| Baja programada | Programar o cambiar la fecha de fin, y quitar la baja; aviso del saldo a favor y de la alerta | D-FJ6, D-FJ7 |
| Ajuste masivo | Diálogo de 3 pasos desde el encabezado de Ocupaciones: datos, revisar y excluir, resultado | D-FJ8 |
| Permisos y errores | Acciones ocultas por permiso; errores por `code` con la recarga que corresponde | D-FJ9, D-FJ10 |
| Formularios | Monto con 2 decimales, porcentaje de −50 a 100, motivos de hasta 250 | D-FJ11 |
| Código | Lógica pura en `src/utils/contratos.js`, probada con Vitest | D-FJ14 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Alta, finalización y cancelación de ocupaciones, registrar pagos | Spec 07 (`Ocupaciones.jsx`, sus diálogos). La 10 solo agrega una sección, un botón en el encabezado y funciones a `ocupacionApi.js` |
| Devolver el saldo a favor | Spec 08 (`DevolucionDialog` y el botón "Registrar devolución" de la sección "Cuenta"). La 10 solo avisa |
| Mostrar el precio vigente y los cambios de precio de un contrato | El backend no tiene ningún endpoint que los devuelva (F1, PB-18): se ve el precio de partida y, tras un ajuste, el `precioAnterior` y el `precioNuevo` de la respuesta |
| Simular el ajuste masivo (ver los precios nuevos antes de aplicar) | El backend no lo ofrece (F3, PB-20); la pantalla compensa con un paso de revisión y una confirmación |
| Cambiar `modoMes` y `fraccionMes` de un contrato | No se pueden: se congelan al crear el contrato. Se cambian para los contratos nuevos desde Configuración (spec 11) |
| Validar los topes de configuración | El backend es la autoridad (sección 3.4) |
| Rediseño visual | Después, con el diseño nuevo |

**Estado de alcance.** Etapa 6 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` con las specs 02 a 08, 11 y 12 ejecutadas; backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, `/Ocupacion` | `PUT /{id}/fin`, `POST /{id}/precio`, `POST /ajuste-precio`, `OcupacionDetalle` (`modoMes`, `fraccionMes`, `saldoAFavor`), cifras, permisos | 18/11/2026 |
| `docs/inventario/backend.md`, `/Configuracion`, tabla "Significado de cada campo" | `modoMes` (CALENDARIO, CORRIDO, BLOQUES_30) y `fraccionMes` (COMPLETO, PROPORCIONAL); "cada período se cobra con el precio vigente en su inicio"; las ocupaciones MES **congelan** ambos al crearse | 18/11/2026 |
| `docs/inventario/backend.md`, `/operational-alerts` y `/Pagos` | `DEVOLUCION_PENDIENTE` (se crea al programar la baja si `saldoAFavor > 0`; se resuelve sola al devolver hasta 0) | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 2 a 5 | `TipoOcupacion`, `ModoMes`, `FraccionMes` enteros; matriz de permisos (`tarifas.editar`: DUENO; `ocupaciones.finalizar`: DUENO, ENCARGADO, OPERADOR); códigos 409; instantes con zona y `DateOnly` | 18/11/2026 |
| `docs/inventario/brechas-front.md`, "Contratos entre specs" | `ocupacionApi.js` (la 10 **agrega**, no recrea), contrato 07 ↔ 10, "la 07 y la 10 **no** validan los límites de la configuración" | 18/11/2026 |
| Spec 07 (`07-ocupaciones.md`) y `src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` | La sección "Contrato mensual" y el comentario "La spec 10 agrega acá…"; `accionesDeOcupacion`, `ocupacionFase`, `FASE`, `shouldCloseActionAfter`; `isTruncated`/`mergeOcupaciones` (D-FG11) | 19/11/2026 |
| Spec 08 (`08-pagos.md`), D-FH6 | `DevolucionDialog` y el botón "Registrar devolución" en "Cuenta" cuando `saldoAFavor > 0`; la alerta se resuelve sola al llegar a 0 | 19/11/2026 |
| Spec 02 (`02-base-comun.md`) | D-FB14 (módulos de API), `useTenantDates` (`localInputToInstant`, `instantToInput`, `today`), `isDateOnly`, `addDays`, `formatMoney`, `cleanParams` | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), lógica pura con Vitest (D-FA4) | 09/11/2026 |
| Lectura de `src/api/ocupacionApi.js`, `src/utils/ocupaciones.js`, `src/pages/Ocupaciones.jsx` | Estado actual (sección 2.1) | 19/11/2026 |
| Lectura del backend (Redac 09-10): `Controllers\OcupacionController.cs`, `Service\ContratoMensualService.cs`, `Models\Dtos\Ocupacion\ContratoMensualDtos.cs`, `Errors\CodigosError.cs` | Comportamiento (sección 2.2) | 19/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Dialog`, `Stepper`, `Table`, `Checkbox`, `Alert`, `TextField`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| `src/api/ocupacionApi.js` | `listOcupaciones`, `getOcupacion`, `createOcupacion`, `cancelOcupacion` y `finalizeOcupacion`, en el patrón D-FB14, con JSDoc. El encabezado dice "La spec 10 suma acá el ajuste de precio y la baja programada". `listOcupaciones` no tiene filtro por `tipo` |
| `OcupacionDetalleDialog.jsx` | Recibe `{ id, reloadKey, now, can, onClose, onError, onLoaded, onChanged, onAction }`. Para un MES (`d.tipo === TipoOcupacion.MES`) renderiza `<Section titulo="Contrato mensual">` con "Modo de mes: … · Fracción: …" y "Congelados al crear", más un comentario "La spec 10 agrega acá el ajuste de precio y la baja programada". Tiene `changeKey` y la función `alCambiarPagos`, que vuelve a pedir el detalle y llama a `onChanged` (la página recarga el listado) |
| Detalle de ocupación | La sección "Tarifa" muestra `precioUnitarioAplicado`, que para un MES es el **precio de partida** (los ajustes no lo modifican: van a una tabla aparte); no hay ningún campo con el precio vigente ni con los cambios programados (F1) |
| `src/utils/ocupaciones.js` | `ocupacionFase(o, now)` y `FASE` (reserva, en curso, vencida, finalizada, cancelada), `accionesDeOcupacion`, `isTruncated`, `mergeOcupaciones`, `fieldErrorsFromApi` (mapa de campos propio de Ocupación: **no sirve** para los campos de contrato) y `shouldCloseActionAfter` |
| `src/pages/Ocupaciones.jsx` | Encabezado con las acciones de la pantalla y un `OcupacionDetalleDialog` con `onChanged={reloadAll}`; `reloadAll` vuelve a pedir el listado |
| `src/constants/enums.js` | Ya declara `TipoOcupacion`, `EstadoOcupacion`, `ModoMes` y `FraccionMes` |
| Ajuste de precio y baja | No existe ninguna pantalla ni función contra `/Ocupacion/{id}/precio`, `/Ocupacion/{id}/fin` ni `/Ocupacion/ajuste-precio` |

### 2.2 Lo que hace el backend (relevamiento F del código, 19/11/2026)

Abreviaturas (rutas relativas a `ParkingControl\ParkingControl\`): OC = `Controllers\OcupacionController.cs`, CMS = `Service\ContratoMensualService.cs`, DTO = `Models\Dtos\Ocupacion\ContratoMensualDtos.cs`. Leído del código, sin confirmar por tests.

| Id | Tema | Comportamiento | Afecta a |
|---|---|---|---|
| F-a | Ajuste individual (`POST /Ocupacion/{id}/precio`, `tarifas.editar`) | Cuerpo `{ vigenteDesde: DateOnly, precioUnitario, motivo }`. `vigenteDesde` tiene que ser **posterior a hoy local**, si no 400 `errors.VigenteDesde` ("La fecha desde la que rige el nuevo precio tiene que ser posterior a hoy."). `precioUnitario` con `[Dinero]` (mayor que 0, 2 decimales, hasta 10.000.000: 400 `errors.PrecioUnitario`). `motivo` `[Required][MaxLength(250)]` con `Trim` (400 `errors.Motivo`). Orden: 400 → 404 `ocupacion_no_encontrada` → 409 `ocupacion_no_mensual` → 409 `ocupacion_no_activa`. Agrega una fila **append-only** (`OcupacionesPrecio`) y una fila de auditoría `AJUSTAR_PRECIO`; **no edita** el precio de partida. Responde 200 `{ id, ocupacionId, vigenteDesde, precioAnterior, precioNuevo }`, donde `precioAnterior` es el vigente **en esa fecha** (CMS:35-72) | D-FJ5 |
| F-b | Ajuste masivo (`POST /Ocupacion/ajuste-precio`, `tarifas.editar`) | Cuerpo `{ vigenteDesde, porcentaje, motivo, excluir? }`. `porcentaje` con `[Range(-50, 100)]` y como máximo 2 decimales (400 `errors.Porcentaje`). **Alcance:** todo MES con estado guardado ACTIVA, sin fin o con fin posterior a `vigenteDesde`, menos los de `excluir` (los ids inexistentes o no mensuales se **ignoran en silencio**). Cada precio nuevo = `round(precioAnterior × (1 + porcentaje/100))` al peso entero, desde ,50 hacia arriba; si algún resultado es ≤ 0, 400 `errors.Porcentaje` ("El ajuste dejaría un contrato con precio cero."), dentro de una transacción (se lee como todo-o-nada; F6). Una fila de precio y una de auditoría por contrato. Responde `{ cantidad, contratos: [{ id (0), ocupacionId, vigenteDesde, precioAnterior, precioNuevo }] }`; sin contratos, 200 con `cantidad: 0` (CMS:76-136) | D-FJ8 |
| F-c | Baja programada (`PUT /Ocupacion/{id}/fin`, `ocupaciones.finalizar`) | Cuerpo `{ fin?: UtcInstant }`; `null` quita la baja (el contrato vuelve a ser abierto). Orden: 400 `errors.Fin` si `fin` no es posterior a ahora ("La baja tiene que ser posterior a ahora.") → 404 → 409 `ocupacion_no_mensual` → 409 `ocupacion_no_activa` (el estado **guardado** debe ser ACTIVA: incluye reservas y vencidas) → 400 `errors.Fin` si `fin` supera `inicio + 3 años` → 409 `cochera_no_disponible` si mover el fin hacia adelante (o quitarlo) choca con otra ocupación de la cochera. **No valida que `fin` sea posterior a `inicio`** (F5). Tras guardar, si lo pagado queda por encima del tope de cobro (posible con la fracción proporcional) se crea la alerta `DEVOLUCION_PENDIENTE`. Auditoría `PROGRAMAR_BAJA`. Responde 200 `{ ocupacionId, fin? }` (CMS:140-190) | D-FJ6, D-FJ7 |
| F-d | Permisos | Precio (individual y masivo): `tarifas.editar` = solo DUENO. Baja: `ocupaciones.finalizar` = DUENO, ENCARGADO y OPERADOR. El AUDITOR no hace ninguna | D-FJ9 |
| F-e | Cifras | Todo (tope de cobro, saldo, saldo a favor) lo calcula el backend con los precios vigentes en el inicio de cada período, el `modoMes` y la `fraccionMes` **congelados** en el contrato. El ajuste de precio no crea ninguna alerta, aunque deje `saldoAFavor > 0` (F4) | D-FJ4, D-FJ7 |
| F-f | Lo que **no** hay | Ningún endpoint devuelve los cambios de precio de un contrato ni su precio vigente (`OcupacionDetalle` trae solo el de partida; los cambios solo se ven en la Trazabilidad, `auditoria.ver`). No hay simulación del lote. `GET /Ocupacion` no filtra por `tipo` y `OcupacionListItem` no trae el precio | D-FJ4, D-FJ8 |
| F-g | Códigos | 400 `datos_invalidos` (con `errors.VigenteDesde`, `PrecioUnitario`, `Motivo`, `Porcentaje`, `Fin`, en PascalCase); 404 `ocupacion_no_encontrada`; 409 `ocupacion_no_mensual` ("Esta operación es solo para ocupaciones mensuales."), `ocupacion_no_activa` (su `title` dice "Solo se puede cancelar una ocupación ACTIVA.", que en estas acciones confunde; F6) y `cochera_no_disponible` | D-FJ10 |

**Consecuencias para el front.** (1) El cliente **no calcula** ningún precio ni saldo: muestra lo que el backend responde (el lote, tras aplicarlo). (2) No se puede mostrar el precio vigente: la sección rotula "Precio de partida" y la respuesta de cada ajuste se muestra completa en el momento. (3) Para elegir exclusiones hay que traer las ocupaciones activas y filtrar los MES en el cliente, con el riesgo de que el listado se trunque (D-FJ8). (4) Programar una baja puede crear la alerta de devolución pendiente; el aviso sale de leer el `saldoAFavor` nuevo (D-FJ7). (5) Que una baja sea anterior al inicio, o que un ajuste deje saldo a favor sin alerta, son huecos del backend (F4, F5), no del cliente.

## 3. Decisiones

Prefijo **D-FJ** ("frontend, contratos"). Estado: **Confirmada** (la tomó el desarrollador o la fija una fuente) o **Propuesta**. En esta spec todas están Confirmadas. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FJ1 (19/11/2026) — Confirmada. Rama y ejecución.** La spec vive en `feature/specs-etapa6`. La ejecución va en `feature/front-contratos`, en el repo principal (`parkingcontrol-front`, **sin worktree**), creada desde `develop` (se confirma con `git branch -a`), con **un commit por spec** y un PR a `develop`. La verificación (`npm test`, `npm run lint` y `npm run build`) se corre **solo al final**. Antes del PR, `git rebase develop`. Reglas generales: permisos con `can(...)`, errores con `showApiError` y decisión por `code`, fechas en la zona del tenant, enums como enteros, el cliente valida solo formato y largo, lógica pura con tests de Vitest y patrón D-FB14.

**D-FJ2 (19/11/2026) — Confirmada. Funciones nuevas en `ocupacionApi.js`.** Se **suman** al archivo existente (no se recrea ni se reordena nada), con el mismo patrón D-FB14: `async`, nombradas, devuelven `data`, JSDoc tomado del inventario, sin capturar errores y sin convertir fechas ni enums.

| Función | Endpoint | Devuelve |
|---|---|---|
| `adjustOcupacionPrecio(id, body)` | `POST /Ocupacion/{id}/precio` con `{ vigenteDesde, precioUnitario, motivo }` (`vigenteDesde` es `DateOnly`, tal cual) | `{ id, ocupacionId, vigenteDesde, precioAnterior, precioNuevo }` |
| `setOcupacionFin(id, body)` | `PUT /Ocupacion/{id}/fin` con `{ fin }` (`UtcInstant` o `null`; **siempre se manda la clave `fin`**, también con `null`) | `{ ocupacionId, fin }` |
| `adjustPreciosMensuales(body)` | `POST /Ocupacion/ajuste-precio` con `{ vigenteDesde, porcentaje, motivo, excluir? }` | `{ cantidad, contratos: [{ id, ocupacionId, vigenteDesde, precioAnterior, precioNuevo }] }` |

`adjustPreciosMensuales` verifica que la respuesta tenga `cantidad` numérico y `contratos` arreglo y, si no, lanza `ApiError` con `code: "respuesta_invalida"` (como `listOcupaciones`). Se prueba con `vi.mock` de `http` (ruta, método, cuerpo, que `fin: null` viaje en el cuerpo, que no capture errores). Se actualiza el comentario del encabezado del archivo ("La spec 10 suma acá…" pasa a decir que ya está).
*Motivo:* es lo que fija `brechas-front.md` ("la 10 **agrega** sus funciones sin recrearlo").

**D-FJ3 (19/11/2026) — Confirmada. Límite con la 07 y la 08.**

| Spec | Qué es de ella | Qué hace la 10 |
|---|---|---|
| 07 Ocupaciones | `OcupacionDetalleDialog`, la sección "Contrato mensual" con modo y fracción, `ocupacionApi.js`, `Ocupaciones.jsx` | **Reemplaza el cuerpo** de la sección "Contrato mensual" por `<ContratoMensualSeccion>` (conservando "Modo de mes", "Fracción" y "Congelados al crear") y suma un botón en el encabezado de `Ocupaciones.jsx` (D-FJ8). **No toca** `CuentaOcupacion`, `RegistrarPagoDialog`, `FinalizarOcupacionDialog`, `CancelarReservaDialog` ni la lógica del listado |
| 08 Pagos | `DevolucionDialog`, el botón "Registrar devolución" en "Cuenta", la alerta que se resuelve sola | La 10 **no** devuelve plata: avisa que quedó saldo a favor y apunta a ese botón (D-FJ7) |
| 11 Configuración | `modoMes`, `fraccionMes` y los topes del tenant | La 10 solo los muestra (los de cada contrato, congelados) y **no** valida ninguno (D-FJ13) |

La 10 **no** agrega ruta, entrada de menú ni permiso a `PRIVATE_ROUTES`.

### 3.2 Sección "Contrato mensual", precio y baja

**D-FJ4 (19/11/2026) — Confirmada. Sección "Contrato mensual".** `src/componentes/ocupaciones/ContratoMensualSeccion.jsx` recibe `{ ocupacion, fase, can, now, onChanged }` y se monta **solo** en el detalle de un MES (como hoy). Muestra, en este orden:
1. **Modo y fracción** (lo de la 07): "Modo de mes: {labelOf(ModoMes)} · Fracción: {labelOf(FraccionMes)}", "Congelados al crear" y una ayuda corta: "Cada período se cobra con el precio vigente en su inicio".
2. **Precio de partida:** `formatMoney(precioUnitarioAplicado)` con el rótulo "Precio de partida" (**no** "Precio actual": el backend no devuelve el vigente, F1) y la ayuda "Los ajustes de precio rigen desde su fecha y no cambian este valor". Si algún día el backend lo expone (PB-18), este bloque pasa a mostrar el precio vigente y los cambios programados.
3. **Fin del contrato:** `formatInstant(fin)` ("Fin del contrato: …") o "Sin fin (contrato abierto)".
4. **Acciones** (D-FJ9): "Ajustar precio", "Programar baja" (sin fin) o "Cambiar fecha de fin" (con fin) y "Quitar baja" (con fin).

Después de **cualquier** escritura exitosa llama a `onChanged()`: el detalle y el listado de la página se recargan (la sección no actualiza ninguna cifra a mano; D-FJ12). Mientras un diálogo de la sección está abierto, el resto del detalle no cambia.
*Motivo:* es lo que la 07 dejó previsto ("la 10 agrega ahí el ajuste de precio y la baja programada").

**D-FJ5 (19/11/2026) — Confirmada. Ajuste de precio individual.** `AjustePrecioDialog({ ocupacion, onClose, onChanged })`, con `tarifas.editar` (D-FJ9). Campos:

| Campo | Regla (formato y largo, D-FJ11) | Valor inicial |
|---|---|---|
| `vigenteDesde` | `<input type="date">`, `DateOnly` en la zona del tenant | **mañana** (`addDays(today(), 1)`), con `min` = mañana como pista (no bloquea lo que se escribe) |
| `precioUnitario` | `^\d+(\.\d{1,2})?$`, mayor que 0 y hasta 10.000.000 | vacío |
| `motivo` | Obligatorio con `trim`, hasta 250 | vacío |

El diálogo muestra "Precio de partida del contrato: $ X" y la nota: **"El nuevo precio rige para los períodos que empiezan desde esa fecha. No cambia lo ya devengado ni se puede borrar después: para volver atrás hay que cargar otro ajuste."** Cuerpo: `{ vigenteDesde, precioUnitario, motivo }` (`validateAjustePrecio`, pura). **El cliente no valida que `vigenteDesde` sea posterior a hoy** (regla del backend, F-a): el texto de ayuda lo dice y, si no lo es, el backend contesta 400 `errors.VigenteDesde` y se marca el campo. Éxito (200): el diálogo pasa a un **resultado** con lo que devolvió el backend: "Precio anterior (vigente en esa fecha): $ A → Precio nuevo: $ B, desde {fecha}" y el aviso "Ajuste registrado"; al cerrarlo se llama a `onChanged()`.
*Motivo:* sin una lectura de los cambios de precio (F1), la respuesta del ajuste es la única confirmación que el usuario puede ver.

**D-FJ6 (19/11/2026) — Confirmada (P4 aprobada). Baja programada y fin del contrato.** La sección ofrece, con `ocupaciones.finalizar`, sobre un MES cuyo **estado guardado es ACTIVA** (en la pantalla: fase RESERVA, EN_CURSO o VENCIDA; una FINALIZADA o CANCELADA no ofrece nada):
- **"Programar baja"** (si no hay fin) o **"Cambiar fecha de fin"** (si hay): abre `ProgramarBajaDialog`, con un `<input type="datetime-local">` (`LocalInput` en la zona del tenant; valor inicial `instantToInput(fin)` si hay fin, vacío si no). Se convierte con `localInputToInstant` y, si devuelve `{ ok: false }`, se muestra `toast.error(r.message)` y **no se envía** (hora inexistente por DST). Cuerpo: `{ fin: UtcInstant }` (`validateFin`, pura). El diálogo avisa: "El contrato deja de correr en esa fecha. Si lo ya pagado supera lo que corresponde hasta esa fecha, queda un saldo a favor para devolver."
- **"Quitar baja"** (solo con fin): un diálogo de confirmación, `QuitarBajaDialog`, con "El contrato vuelve a quedar abierto, sin fecha de fin". Cuerpo `{ fin: null }` (`buildQuitarBajaBody`, pura). Antes de hacerlo avisa que, si otra ocupación ya tomó la cochera después del fin, el backend lo rechaza con `cochera_no_disponible`.
- En un contrato **VENCIDO** (estado guardado ACTIVA con `fin` pasado) el diálogo agrega "El contrato está vencido: una fecha futura lo extiende" (el backend lo permite, F-c).
**El cliente no valida** que el fin sea posterior a ahora, que no supere `inicio + 3 años`, que sea posterior al inicio (F5) ni que no choque con otra ocupación: son reglas del backend (400 `errors.Fin`, 409 `cochera_no_disponible`). Éxito (200): "Baja programada" (o "Baja quitada") y `onChanged()`.
*Motivo:* es lo que el backend deja hacer; el estado lo decide él, no el cliente (ARQ-4).
*Descartado:* ofrecerlo solo en curso (el backend deja extender un contrato vencido y la pantalla lo impediría).

**D-FJ7 (19/11/2026) — Confirmada (P4 aprobada; F4 contestada). Saldo a favor y alerta tras programar una baja.** Programar o cambiar la baja puede dejar `saldoAFavor > 0` y crea la alerta `DEVOLUCION_PENDIENTE` (F-c). La respuesta del `PUT` solo trae `{ ocupacionId, fin }`, así que, después de un éxito, `ProgramarBajaDialog` vuelve a pedir `getOcupacion(id)` (un pedido extra, que no rompe el éxito si falla) y, con `bajaAviso(saldoAFavor)` (pura), muestra en el resultado: **"Quedó un saldo a favor de $ X por devolver (se creó una alerta de devolución pendiente). Registrá la devolución desde la sección Cuenta."** Con `can("pagos.devolver")` el botón "Registrar devolución" de la 08 aparece tras `onChanged()` (el detalle ya trae el `saldoAFavor` nuevo); sin ese permiso el aviso agrega "Avisá a un dueño". El diálogo **no** abre `DevolucionDialog` por su cuenta (no suma un contrato nuevo entre specs). Si el `saldoAFavor` es 0 no se avisa nada. Quitar la baja no avisa. Un ajuste de precio que deja saldo a favor **no** crea alerta: es un **bug del backend** (F4, PB-21) y **el front no lo compensa**; la sección "Cuenta" ya muestra el saldo a favor y no se agrega aviso propio.
*Descartado:* un botón "Devolver ahora" dentro del diálogo (acopla la 10 a las props de `DevolucionDialog`; el camino por "Cuenta" ya existe).

### 3.3 Ajuste masivo

**D-FJ8 (19/11/2026) — Confirmada (P1, P2 y P3 aprobadas; F2, F3 y F6 contestadas). El ajuste masivo vive en Ocupaciones, como un diálogo de 3 pasos.** `Ocupaciones.jsx` suma, **solo con `can("tarifas.editar")`**, un botón **"Ajustar precios mensuales"** en el encabezado, que abre `AjusteMasivoDialog({ onClose, onApplied })`; `onApplied` es `reloadAll`. Es un `Stepper` con tres pasos:

1. **Datos.** `vigenteDesde` (`DateOnly`, mañana por defecto, igual que D-FJ5), `porcentaje` (decimal con hasta 2 decimales, de −50 a 100; ayuda "Positivo sube el precio y negativo lo baja") y `motivo` (obligatorio, hasta 250). Cuerpo (`validateAjusteMasivo`, pura): `{ vigenteDesde, porcentaje: number, motivo, excluir? }`, con `excluir` omitido si no hay.
2. **Revisar y excluir.** Pide `listOcupaciones({ estado: EstadoOcupacion.ACTIVA, take: 500 })` (el máximo del backend; el filtro por `tipo` no existe, F2) y se queda con los MES (`candidatosMensuales`, pura) en una tabla con **Cochera, Cliente, Fin** (o "Sin fin") y la casilla **"Excluir"**. Muestra el resumen ("Se ajustan los mensuales activos, sin fin o con fin posterior a {vigenteDesde}, **excepto** los N que excluyas; hasta M contratos candidatos") y, **si la lista llegó a 500**, el aviso "Puede haber más contratos que los listados: los que no veas también se ajustan" (`isTruncated`, de la 07). **El alcance real lo decide el backend**: la tabla es una ayuda para excluir, no el alcance. El paso tiene una casilla obligatoria **"Entiendo que el ajuste no se puede deshacer"** y el botón "Aplicar ajuste" (deshabilitado sin la casilla y mientras envía). Si la carga de la lista falla, "No pudimos cargar los contratos" con "Reintentar"; sin la lista no se aplica (no se puede excluir lo que no se ve).
3. **Resultado.** Con lo que devolvió el backend: "Se ajustaron N contratos" (o "No había contratos para ajustar" con `cantidad` 0) y una tabla `resultadoLote` con **Ocupación #, Precio anterior, Precio nuevo, Desde**; **no se calcula ni se suma nada**. Al cerrar, `onApplied()`.

Errores: 400 con `errors.Porcentaje` (rango, decimales o "dejaría un contrato con precio cero") y `errors.VigenteDesde` y `errors.Motivo` vuelven al paso 1 con el campo marcado (un ajuste que falla **no aplica nada**: F6); el diálogo conserva lo escrito y las casillas. Una escritura **no es idempotente**: el reintento es manual.
*Motivo:* no suma ruta, menú ni permiso; reúne el permiso `tarifas.editar` con la pantalla donde están los contratos; y, como el backend no simula (F3), el paso de revisión y la casilla son la única protección contra un error que afecta a todos los contratos.
*Descartadas:* (b) pantalla propia `/contratos` (ruta y entrada de menú nuevas, más espacio para excluir; el backend igual no filtra por tipo); (c) en Tarifas (mezcla las tarifas, que valen para ocupaciones nuevas, con contratos vigentes); excluir por ids escritos a mano (errores de tipeo y el backend ignora en silencio los ids que no existen); un confirm simple en lugar de la casilla (un clic de más para un error masivo).

### 3.4 Permisos, errores y formularios

**D-FJ9 (19/11/2026) — Confirmada. Permisos: se oculta, nunca se deshabilita, y se decide por permiso.** Todo con `can(...)` (ARQ-4), nunca por rol:

| Acción | Condición |
|---|---|
| Ver la sección "Contrato mensual" | La ruta `/ocupaciones` (`ocupaciones.ver`) y el contrato es MES |
| "Ajustar precio" (individual) | `tarifas.editar` y MES con estado guardado ACTIVA (fase RESERVA, EN_CURSO o VENCIDA) |
| "Programar baja", "Cambiar fecha de fin" y "Quitar baja" | `ocupaciones.finalizar` y MES con estado guardado ACTIVA; "Quitar baja" solo con `fin` |
| "Ajustar precios mensuales" (masivo) | `tarifas.editar` |
| "Registrar devolución" (después de una baja) | La de la 08: `pagos.devolver` y `saldoAFavor > 0` |

Con la matriz del backend: el DUENO hace todo; el ENCARGADO y el OPERADOR programan y quitan bajas pero **no** tocan el precio; el AUDITOR solo mira (sin acciones). La decisión de las acciones está en `accionesDeContrato(o, now, can)` (pura); el botón del encabezado se decide con `can("tarifas.editar")` directo.

**D-FJ10 (19/11/2026) — Confirmada (con el orden de F-a a F-c). Errores por `code`, con la recarga que corresponde.** Todos los `catch` llaman a `showApiError(e)` (muestra el `title` del backend tal cual) y se decide por `code`; no se agregan entradas a `errorCodes.js`. **Única excepción (desvío DV-FJ3 de D-FA6):** con `ocupacion_no_activa` en la baja y en el ajuste (individual y masivo) el `title` del backend dice "Solo se puede cancelar una ocupación ACTIVA", que en estas acciones confunde; el `catch` pregunta primero a `contratoErrorOverride(code)` (pura) y, si devuelve un texto, hace `toast.error(texto)` con el error normalizado por `normalizeError(e)` de `src/api/errors.js` y **no** llama a `showApiError`; para cualquier otro código sigue `showApiError(e)`. El texto es **"El contrato ya no está activo; recargá para ver su estado"** y, además, recarga (tabla de abajo). Se retira cuando el backend corrija el `title` (PB-23). **`fieldErrorsFromApi` de la 07 no se reutiliza** (su mapa es de Ocupación): `contratoFieldErrors(apiError)` (pura) trae el suyo, de las claves PascalCase a los campos del formulario (`VigenteDesde` → `vigenteDesde`, `PrecioUnitario` → `precioUnitario`, `Motivo` → `motivo`, `Porcentaje` → `porcentaje`, `Fin` → `fin`), con el primer mensaje de cada uno; lo que no es un campo conocido va a `general`. Una escritura no es idempotente: el diálogo conserva lo escrito y el reintento es manual.

| `code` | Cuándo | Después del aviso |
|---|---|---|
| `datos_invalidos` | 400. Ajuste: `errors.VigenteDesde`, `PrecioUnitario`, `Motivo`. Baja: `errors.Fin`. Lote: `errors.VigenteDesde`, `Porcentaje`, `Motivo` | Marca el campo con el primer mensaje. Sin recarga. El diálogo queda abierto |
| `ocupacion_no_encontrada` | 404: la ocupación ya no existe | Cierra el diálogo y el detalle y recarga el listado |
| `ocupacion_no_mensual` | 409: no es MES (no debería pasar desde esta sección) | Cierra el diálogo y recarga el detalle y el listado |
| `ocupacion_no_activa` | 409: el contrato ya se finalizó o se canceló desde otra pestaña. **Texto propio** (no el `title`, que dice "cancelar"): "El contrato ya no está activo; recargá para ver su estado" | Cierra el diálogo y recarga el detalle y el listado |
| `cochera_no_disponible` | 409: mover el fin hacia adelante (o quitarlo) choca con otra ocupación | Solo el aviso. El diálogo queda abierto con lo escrito |
| `sin_permiso` | 403: falta el permiso | Aviso con el `title`. El diálogo queda abierto. Sin recarga |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Cualquier escritura | Aviso. Conserva lo escrito; reintento **manual**. Si el pedido llegó a escribir y la respuesta se perdió, el usuario ve el resultado al recargar |
| Código desconocido o `undefined` | — | Aviso del `title`. Sin recarga |

`shouldReloadAfterContrato(code)` y `shouldCloseActionAfterContrato(code)` (puras, en `contratos.js`): verdaderas para `ocupacion_no_encontrada`, `ocupacion_no_mensual` y `ocupacion_no_activa`; falsas para el resto. El detalle de la ocupación se cierra solo con `ocupacion_no_encontrada` (el criterio de `shouldCloseDetailAfter` de la 07).

**D-FJ11 (19/11/2026) — Confirmada. El cliente valida solo formato y largo.** No se valida en el cliente lo que es regla del backend: que `vigenteDesde` sea posterior a hoy, que el fin sea posterior a ahora o al inicio, el tope de 3 años, que no choque con otra ocupación, que el contrato sea MES o esté activo, ni que el ajuste deje un precio en cero. Sí se valida formato y largo, con los límites del DTO:

| Campo | Regla | Mensaje |
|---|---|---|
| `vigenteDesde` | Obligatorio, `DateOnly` válido (`yyyy-MM-dd`) | "Elegí la fecha" |
| `precioUnitario` | Obligatorio, `^\d+(\.\d{1,2})?$`, mayor que 0 y hasta 10.000.000 | "Ingresá un monto con hasta 2 decimales" / "El precio debe ser mayor a 0" / "El precio no puede superar $ 10.000.000" |
| `porcentaje` | Obligatorio, `^-?\d+(\.\d{1,2})?$`, de −50 a 100 (rango del DTO) | "Ingresá un porcentaje con hasta 2 decimales" / "El porcentaje va de −50 a 100" |
| `motivo` | Obligatorio con `trim`, hasta 250 | "Contanos el motivo" / "El motivo no puede superar 250 caracteres" |
| `fin` (programar baja) | Obligatorio, un `LocalInput` válido que `localInputToInstant` convierta | "Elegí la fecha y la hora de fin" / el mensaje de `localInputToInstant` |

`motivo` viaja con `trim`. Los botones quedan deshabilitados mientras envían. Las notas ("tiene que ser posterior a hoy") son **textos de ayuda**, no bloqueos.

**D-FJ12 (19/11/2026) — Confirmada. Fechas, enums y dinero.** `vigenteDesde` es `DateOnly` y viaja **sin convertir** (nunca pasa por `Date`); el "hoy" y el valor inicial salen de `today()` y `addDays`. `fin` es un instante: se convierte con `localInputToInstant` y se muestra con `formatInstant` (zona del tenant); nunca `Date`, `toISOString` ni `toLocale*`. Los enums con `labelOf` de `enums.js` (`ModoMes`, `FraccionMes`, `TipoOcupacion`, `EstadoOcupacion`); el dinero con `formatMoney` (`null` muestra "—"). Los módulos de API no convierten fechas ni enums. Después de **cualquier** escritura se recarga el detalle y el listado: las cifras (tope, saldo, saldo a favor) las calcula el backend y el cliente no las actualiza a mano.

**D-FJ13 (19/11/2026) — Confirmada. `modoMes` y `fraccionMes` congelados; sin topes de configuración.** Los dos valores se muestran **de solo lectura** y se rotulan "Congelados al crear": cambiar la configuración del tenant no afecta los contratos en curso, y ninguna acción de esta spec los modifica. El cliente **no valida** `toleranciaInicioHoras`, `topePasadoDias`, `techoFuturoMeses`, `diasGraciaMora` ni ningún otro límite de la configuración: el backend es la autoridad y el front muestra su error por `code` (contrato de `brechas-front.md`). Tampoco lee `/Configuracion` (el OPERADOR no tiene `configuracion.ver`).

### 3.5 Código

**D-FJ14 (19/11/2026) — Confirmada. Lógica pura en `src/utils/contratos.js`, probada con Vitest.** Exporta: `accionesDeContrato`, `defaultVigenteDesde`, `validateAjustePrecio`, `validateAjusteMasivo`, `validateFin`, `buildQuitarBajaBody`, `candidatosMensuales`, `resultadoLote`, `bajaAviso`, `contratoFieldErrors`, `contratoErrorOverride`, `shouldReloadAfterContrato` y `shouldCloseActionAfterContrato`. Reutiliza `ocupacionFase` y `FASE` de `ocupaciones.js` y `moneyToCents` de `pagos.js` (no los copia). Sin React ni estado; `can` y los convertidores de fecha son parámetros explícitos y ningún test depende de la hora ni de la zona del sistema. Las pantallas y los diálogos solo orquestan estado y MUI.
*Motivo:* regla D-FA4: lo que no puede romperse tiene un test, y esta pantalla cambia precios de contratos.

**D-FJ15 (19/11/2026) — Confirmada. Qué no se toca.** `src/componentes/pagos/*`, `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js`, `src/constants/enums.js` (ya trae `ModoMes` y `FraccionMes`), `src/utils/fechas.js`, `src/utils/pagos.js`, `src/utils/ocupaciones.js` (solo se importa de él), `src/auth/routes.js` y `eslint.config.js`. De `OcupacionDetalleDialog.jsx` se modifica **solo** el cuerpo de la sección "Contrato mensual" y el import; de `Ocupaciones.jsx`, solo el botón del encabezado y su diálogo.

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FJ1 | `brechas-front.md`, "Contratos entre specs" (07 ↔ 10) | La sección "Contrato mensual" "tiene `modoMes` y `fraccionMes` de solo lectura; la 10 agrega ahí el ajuste de precio y la baja programada" | Igual, y además **reemplaza el cuerpo** de la sección por un componente propio (`ContratoMensualSeccion`) en vez de seguir agregándole código a `OcupacionDetalleDialog.jsx` | El detalle ya es largo; un componente aparte lo mantiene legible y se prueba por separado | — |
| DV-FJ2 | Spec 07 (`Ocupaciones.jsx` es de la 07) | La página de Ocupaciones es de la 07 | La 10 agrega **un botón** en su encabezado, solo con `tarifas.editar` (D-FJ8) | El ajuste masivo no tiene otro lugar natural sin una ruta nueva (P1 a, aprobada) | Si algún día se hace una pantalla propia de contratos: se saca el botón y se suma una ruta |
| DV-FJ3 | Spec 01, D-FA6 | El aviso de un error es el `title` del backend, tal cual | Con `ocupacion_no_activa` en la baja y en el ajuste, un **texto propio**: "El contrato ya no está activo; recargá para ver su estado", y recarga (D-FJ10) | El `title` de ese código dice "Solo se puede cancelar una ocupación ACTIVA" y en estas acciones confunde (aprobado por el desarrollador el 19/11/2026) | PB-23: cuando el backend corrija el `title` a uno genérico, se retira `contratoErrorOverride` y se vuelve a mostrar el `title` |

### 4.2 Pendientes

| Id | Pendiente | Paso |
|---|---|---|
| P-FJ1 | **Cerrado (19/11/2026).** Preguntas de producto P1 a P4 aprobadas (opción a en las cuatro) y dudas F1 a F6 contestadas: F1, F2 y F3 son pedidos al backend (el front trabaja con lo que hay); F4 y F5 son bugs del backend y **el front no los compensa**; F6 (1) el lote es todo o nada, se comprueba a mano (verificación 24); F6 (2) texto propio para `ocupacion_no_activa` (DV-FJ3) | — |
| P-FJ2 (PB-18, Media) | Pedido al backend, **aprobado**: `precioVigente` y `cambiosDePrecio[]` (`vigenteDesde`, `precio`, `motivo`) en `OcupacionDetalle`; sin eso, la sección solo muestra el precio de partida (D-FJ4) | — |
| P-FJ3 (PB-19, Baja) | Pedido al backend: filtro `tipo` en `GET /Ocupacion` (y, si se puede, el precio en `OcupacionListItem`), para no traer 500 ocupaciones y filtrar los MES en el cliente (D-FJ8) | — |
| P-FJ4 (PB-20, Media) | Pedido al backend: simulación del ajuste masivo (`simular=true` o un endpoint equivalente) que devuelva los precios nuevos sin escribir (D-FJ8) | — |
| P-FJ5 (PB-21, Baja) | Pedido al backend, **aprobado** (es un bug): crear `DEVOLUCION_PENDIENTE` también después de un ajuste a la baja, si queda `saldoAFavor > 0` (F4). El front no lo compensa | — |
| P-FJ6 (PB-22, Media) | Pedido al backend, **aprobado** (es un bug): validar que el `fin` de `PUT /Ocupacion/{id}/fin` sea posterior al `inicio` (F5); hoy una reserva futura admite un fin anterior a su inicio. El cliente no lo valida | — |
| P-FJ7 (PB-23, Baja) | Pedido al backend, **aprobado**: un `title` genérico para `ocupacion_no_activa`, no "cancelar". Hasta entonces, el texto propio de DV-FJ3 | — |
| P-FJ8 | **Cerrado.** Los números PB-18 a PB-23 los asignó el Orquestador y están en `brechas-front.md` | — |
| P-FJ9 | **Datos de prueba** para verificar: dos o tres contratos MES activos (uno con `fin`, otro sin `fin`, uno con `fraccionMes` PROPORCIONAL y pagos que superen lo devengado hasta una baja anticipada, para generar saldo a favor), una reserva MES futura, un MES vencido y uno finalizado. Con `dueno@demo.test` se prueba todo; con `encargado@demo.test` y `operado@demo.test`, solo la baja y que no se ofrezca ajustar el precio ni el masivo | 3 y 4 |
| P-FJ10 | Moneda por tenant (P-FB3): `formatMoney` fija `UYU` | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FJ-L1 | Que existan en `develop` las piezas por nombre: `ocupacionApi.js` con sus cinco funciones, `OcupacionDetalleDialog.jsx` con la sección "Contrato mensual" y `onChanged`, `ocupacionFase`, `FASE` e `isTruncated` en `ocupaciones.js`, `useTenantDates` con `today`, `localInputToInstant` e `instantToInput`, `addDays` e `isDateOnly` en `fechas.js`, `moneyToCents` en `pagos.js`, `ModoMes` y `FraccionMes` en `enums.js` | Si falta algo, **frenar** y reportar: no se implementa nada de las otras specs |
| P-FJ-L2 | Que la forma de `POST /Ocupacion/{id}/precio`, `PUT /Ocupacion/{id}/fin` y `POST /Ocupacion/ajuste-precio` coincida con la sección 2.2 (enums y fechas: `vigenteDesde` como `DateOnly`, `fin` como instante con `Z`; la respuesta del lote con `id` en 0) | Si algo difiere (por ejemplo, la respuesta no trae `cantidad`), **frenar** |
| P-FJ-L3 | Que el cuerpo de la sección "Contrato mensual" siga siendo el que describe la sección 2.1, y que `Ocupaciones.jsx` tenga un único encabezado con acciones donde sumar el botón | Si cambió, adaptar el montaje y anotarlo; si obliga a rehacer el detalle o la página, **frenar** |
| P-FJ-L4 | Que `normalizeError` siga exportada desde `src/api/errors.js` (D-FJ10) | Si no, usar `describeError(e).error`; si tampoco existe, **frenar** |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Lógica pura | `src/utils/contratos.js` | D-FJ14 |
| Sección del detalle | `src/componentes/ocupaciones/ContratoMensualSeccion.jsx` | D-FJ4 |
| Diálogos | `src/componentes/ocupaciones/AjustePrecioDialog.jsx`, `ProgramarBajaDialog.jsx`, `QuitarBajaDialog.jsx`, `AjusteMasivoDialog.jsx` | D-FJ5 a D-FJ8 |
| Tests | `test/unit/utils/contratos.test.js` y ampliación de `test/unit/api/ocupacionApi.test.js` | D-FJ2, D-FJ14 |
| Manual de esta spec | `docs/manual/frontend/10-contratos-mensuales.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/api/ocupacionApi.js` | Suma `adjustOcupacionPrecio`, `setOcupacionFin` y `adjustPreciosMensuales` y actualiza el comentario del encabezado | D-FJ2 |
| `src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` | El cuerpo de la sección "Contrato mensual" pasa a `<ContratoMensualSeccion>`; nada más | D-FJ3, D-FJ4 |
| `src/pages/Ocupaciones.jsx` | Botón "Ajustar precios mensuales" en el encabezado (con `tarifas.editar`) y `AjusteMasivoDialog` | D-FJ8 |
| `CLAUDE.md` | Una línea corta sobre los contratos mensuales, con enlace al manual (no se tocan las demás) | D-FJ15 |
| `docs/specs/README.md` | Fila 10: estado y "Depende de" `02, 07` (lo actualiza el Orquestador; el ejecutor la pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada.

### 5.4 No se tocan

`src/componentes/pagos/*`, `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js`, `src/constants/enums.js`, `src/utils/fechas.js`, `src/utils/pagos.js`, `src/utils/ocupaciones.js`, `src/auth/routes.js`, `eslint.config.js` (D-FJ15).

## 6. Pasos

**Regla de ruteo.** El ejecutor es un subagente: **no corre git** y no le pregunta nada al usuario. Si algo de P-FJ-L1 a P-FJ-L4 no da, o aparece una decisión que la spec no prevé, **frena** y lo dice en su reporte (el Orquestador decide). Las dudas del backend no se suponen. Los comandos `npm` los corre él mismo, en PowerShell, **solo al final** (D-FJ1).

**Reglas de todos los pasos.**
- Se trabaja en `feature/front-contratos` (creada desde `develop` por el Orquestador; nunca sobre `develop`), con **un solo commit por spec**, que hace el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- No se lee ni se muestra el `.env`.
- Texto visible en español rioplatense; código y nombres en inglés.
- Cada paso se tilda en esta spec al terminarlo y el manual (`docs/manual/frontend/10-contratos-mensuales.md`) se va armando.

### Paso 0 — Precondiciones

- [x] **0.1** Resolver **P-FJ-L1** a **P-FJ-L4** (lectura y búsquedas, sin cambios). Si falta algo, frenar.

### Paso 1 — Lógica pura

- [x] **1.1** Crear `src/utils/contratos.js` (D-FJ14) y `test/unit/utils/contratos.test.js`.

  *Aceptación:* los tests cubren estos casos (`TipoOcupacion`: HORA 1, DIA 2, MES 3; `EstadoOcupacion`: ACTIVA 1, VENCIDA 2, CANCELADA 3, FINALIZADA 4; `can` es una función sobre un conjunto de permisos; fechas como `DateOnly`; `now` es un parámetro):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `accionesDeContrato` de un MES en curso sin `fin`, con `tarifas.editar` y `ocupaciones.finalizar` | `ajustarPrecio` y `programarBaja` verdaderos; `cambiarFin` y `quitarBaja` falsos |
  | 2 | Igual, con `fin` | `ajustarPrecio` verdadero; `programarBaja` falso; `cambiarFin` y `quitarBaja` verdaderos |
  | 3 | Solo con `ocupaciones.finalizar` (ENCARGADO y OPERADOR) | `ajustarPrecio` falso; las de baja verdaderas |
  | 4 | Solo con `tarifas.editar` | `ajustarPrecio` verdadero; las de baja falsas |
  | 5 | Solo con `ocupaciones.ver` (AUDITOR) | Todo falso |
  | 6 | MES RESERVA (inicio futuro) y MES VENCIDA (`estadoCalculado` 2) con todos los permisos | Las acciones se ofrecen (estado guardado ACTIVA) |
  | 7 | MES FINALIZADA (`estadoCalculado` 4) y MES CANCELADA (3) con todos los permisos | Todo falso |
  | 8 | Una ocupación HORA y una DIA con todos los permisos | Todo falso (no es mensual) |
  | 9 | `defaultVigenteDesde("2026-11-19")` y `("2026-12-31")` | `"2026-11-20"` y `"2027-01-01"` |
  | 10 | `validateAjustePrecio({ vigenteDesde: "2026-12-01", precioUnitario: "1500", motivo: " Ajuste anual " })` | `ok`; cuerpo `{ vigenteDesde: "2026-12-01", precioUnitario: 1500, motivo: "Ajuste anual" }` |
  | 11 | `precioUnitario` `"1500.5"` y `" 99.99 "` | `ok`, numérico (`1500.5` y `99.99`) |
  | 12 | `precioUnitario` `""`, `"0"`, `"-1"`, `"12.345"`, `"abc"` y `"10000000.01"` | Error de `precioUnitario` en los seis. `"10000000"` da `ok` |
  | 13 | `vigenteDesde` vacío y `"2026-13-40"` | Error de `vigenteDesde` ("Elegí la fecha") |
  | 14 | `motivo` vacío, `"   "` y de 251 caracteres; de 250 | Error "Contanos el motivo" (los dos primeros); error "El motivo no puede superar 250 caracteres"; `ok` |
  | 15 | **No valida contra el backend (D-FJ11):** `validateAjustePrecio` con `vigenteDesde` igual a hoy o anterior | `ok` (lo rechaza el backend con `errors.VigenteDesde`) |
  | 16 | `validateAjusteMasivo({ vigenteDesde: "2026-12-01", porcentaje: "10", motivo: "Inflación" })` | `ok`; cuerpo `{ vigenteDesde, porcentaje: 10, motivo }` (sin `excluir`) |
  | 17 | Igual, con `excluir: [5, 9]` y con `excluir: []` | Cuerpo con `excluir: [5, 9]`; sin `excluir` |
  | 18 | `porcentaje` `"-50"`, `"100"`, `"0"`, `"12.5"` y `"-0.01"` | `ok` en los cinco |
  | 19 | `porcentaje` `"-50.01"`, `"100.01"`, `"1.234"`, `""`, `"abc"` y `"1e2"` | Error de `porcentaje` en los seis |
  | 20 | **No valida contra el backend:** `validateAjusteMasivo` con un `porcentaje` que dejaría un precio en cero (por ejemplo `"-50"` sobre un contrato de $ 1) | `ok` (no hay precios en el cliente) |
  | 21 | `validateFin({ fin: "2027-03-31T18:00" }, { localInputToInstant })` con un convertidor falso que devuelve `{ ok: true, instant: "2027-03-31T21:00:00.000Z" }` | `ok`; cuerpo `{ fin: "2027-03-31T21:00:00.000Z" }` |
  | 22 | `validateFin` con `fin` vacío; con el convertidor devolviendo `{ ok: false, message: "…" }` | Error de `fin` ("Elegí la fecha y la hora de fin"); error de `fin` con ese mensaje |
  | 23 | **No valida contra el backend:** `validateFin` con un `fin` anterior a ahora o al inicio | `ok` (lo rechaza el backend con `errors.Fin`) |
  | 24 | `buildQuitarBajaBody()` | `{ fin: null }` (la clave está presente) |
  | 25 | `candidatosMensuales` con ocupaciones HORA, DIA y MES (ACTIVA, y una CANCELADA) mezcladas | Solo los MES con estado guardado ACTIVA, en el orden recibido; no muta el arreglo |
  | 26 | `candidatosMensuales([])`, `(undefined)` y `(null)` | `[]` en los tres |
  | 27 | `resultadoLote({ cantidad: 2, contratos: [ B (ocupacionId 9), A (ocupacionId 5) ] })` | `{ cantidad: 2, vacio: false, contratos: [A, B] }` (por `ocupacionId` ascendente; no muta) |
  | 28 | `resultadoLote({ cantidad: 0, contratos: [] })` | `vacio: true` |
  | 29 | `bajaAviso(1200)`, `(0)`, `(null)` y `(0.5)` | El aviso con "$ 1.200,00" ("Quedó un saldo a favor de … por devolver…"); `null`; `null`; el aviso con "$ 0,50" |
  | 30 | `contratoFieldErrors({ errors: { VigenteDesde: ["a"], PrecioUnitario: ["b"], Porcentaje: ["c"], Fin: ["d"], Motivo: ["e"], Otro: ["f"] } })` | `fields`: `vigenteDesde: "a"`, `precioUnitario: "b"`, `porcentaje: "c"`, `fin: "d"`, `motivo: "e"`; `general`: `["f"]` |
  | 31 | `contratoFieldErrors` con `errors` ausente, `null` o vacío | `{ fields: {}, general: [] }` |
  | 32 | `shouldReloadAfterContrato` | Verdadero para `ocupacion_no_encontrada`, `ocupacion_no_mensual` y `ocupacion_no_activa`; falso para `datos_invalidos`, `cochera_no_disponible`, `sin_permiso`, `sin_conexion`, un código desconocido y `undefined` |
  | 33 | `shouldCloseActionAfterContrato` | Verdadero para esos mismos tres; falso para `cochera_no_disponible`, `datos_invalidos`, `sin_permiso`, `servidor_ocupado` y `undefined` |
  | 34 | Búsqueda de `getHours`, `toLocale`, `toISOString` y `new Date` en `contratos.js` | Sin coincidencias |
  | 35 | `contratoErrorOverride("ocupacion_no_activa")` | `"El contrato ya no está activo; recargá para ver su estado"` |
  | 36 | `contratoErrorOverride` con `ocupacion_no_mensual`, `ocupacion_no_encontrada`, `cochera_no_disponible`, `datos_invalidos`, un código desconocido y `undefined` | `null` en todos (se muestra el `title` del backend) |

### Paso 2 — Módulo de API

- [x] **2.1** Sumar `adjustOcupacionPrecio`, `setOcupacionFin` y `adjustPreciosMensuales` a `src/api/ocupacionApi.js` (D-FJ2), sin tocar lo existente, y ampliar `test/unit/api/ocupacionApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* los tests cubren: `adjustOcupacionPrecio(7, { vigenteDesde: "2026-12-01", precioUnitario: 1500, motivo: "x" })` hace `POST /Ocupacion/7/precio` con el cuerpo sin modificarlo (el `DateOnly` sin convertir) y devuelve `data`; `setOcupacionFin(7, { fin: "2027-03-31T21:00:00.000Z" })` hace `PUT /Ocupacion/7/fin` con el cuerpo y devuelve `data`; `setOcupacionFin(7, { fin: null })` manda `{ fin: null }` (la clave presente); `adjustPreciosMensuales(body)` hace `POST /Ocupacion/ajuste-precio` con el cuerpo y devuelve `{ cantidad, contratos }`; una respuesta sin `cantidad` numérico o sin `contratos` arreglo lanza `ApiError` con `code: "respuesta_invalida"`; ninguna captura errores (un rechazo de `http` se propaga); **las cinco funciones existentes siguen igual** (los tests actuales no cambian).

### Paso 3 — Sección "Contrato mensual" y acciones individuales

- [x] **3.1** Crear `AjustePrecioDialog.jsx`, `ProgramarBajaDialog.jsx` y `QuitarBajaDialog.jsx` (D-FJ5, D-FJ6, D-FJ7, D-FJ9 a D-FJ12), con `showApiError`, `contratoFieldErrors` y los avisos de las decisiones.
- [x] **3.2** Crear `ContratoMensualSeccion.jsx` (D-FJ4) y montarlo en `OcupacionDetalleDialog.jsx` en lugar del cuerpo actual de la sección (D-FJ3), con `can`, `now`, `fase` y el `onChanged` que ya recarga el detalle y el listado.

  *Aceptación (manual, al final del paso 5):* la sección 7, casos 3 a 18.

### Paso 4 — Ajuste masivo

- [x] **4.1** Crear `AjusteMasivoDialog.jsx` (D-FJ8) con sus tres pasos y montarlo con el botón "Ajustar precios mensuales" en el encabezado de `Ocupaciones.jsx`, solo con `can("tarifas.editar")`.

  *Aceptación (manual, al final del paso 5):* la sección 7, casos 19 a 27.

### Paso 5 — Documentación y cierre

- [x] **5.1** Agregar a `CLAUDE.md` **una línea** sobre los contratos mensuales (dónde vive la sección y el ajuste masivo) con enlace al manual; no tocar nada más.
- [x] **5.2** Crear `docs/manual/frontend/10-contratos-mensuales.md`: la sección "Contrato mensual" y qué muestra (precio de partida, fin), el ajuste individual (y por qué no se ve el precio vigente), la baja programada y quitar la baja, el aviso de saldo a favor y la alerta, el ajuste masivo (pasos, exclusiones, qué hace el backend con ellas), la tabla de permisos, qué hace cada `code` de error y lo que le queda al backend (PB-18 a PB-23).
- [x] **5.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.
- [ ] **5.4** **Verificación final** (única): `npm test`, `npm run lint` y `npm run build`, en PowerShell, sin errores.

  *Aceptación:* las tres pasan; una búsqueda de `e.response.data.error`, `toLocale`, `toISOString` y `http.` en `src/componentes/ocupaciones/{ContratoMensualSeccion,AjustePrecioDialog,ProgramarBajaDialog,QuitarBajaDialog,AjusteMasivoDialog}.jsx` y `src/utils/contratos.js` no da coincidencias; `git diff develop -- src/componentes/pagos src/constants/enums.js src/auth/routes.js eslint.config.js` vacío; `git diff develop -- src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` solo toca la sección "Contrato mensual" y el import; `git diff develop -- src/pages/Ocupaciones.jsx` solo suma el botón del encabezado, su estado y el diálogo (lo verifica el Orquestador).

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`. Usuarios demo: `dueno@demo.test`, `encargado@demo.test`, `operado@demo.test`.

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Detalle de una ocupación HORA o DIA | No hay sección "Contrato mensual" |
| 3 | Detalle de un MES en curso (`dueno@demo.test`) | La sección muestra modo y fracción ("Congelados al crear"), "Precio de partida", "Fin del contrato" (o "Sin fin") y los botones "Ajustar precio" y "Programar baja" (o "Cambiar fecha de fin" y "Quitar baja") |
| 4 | "Ajustar precio" con `vigenteDesde` de mañana, precio y motivo | `POST /Ocupacion/{id}/precio` con `{ vigenteDesde, precioUnitario, motivo }` (la fecha sin convertir); resultado "Precio anterior … → Precio nuevo …, desde …"; al cerrarlo, el detalle y el listado se recargan; "Precio de partida" **no** cambia |
| 5 | Ajustar con `vigenteDesde` de hoy | El backend da 400 y se marca `vigenteDesde` con su `title` (el cliente no lo bloqueó) |
| 6 | Ajustar con precio `0`, `12.345` o `10000001`, sin motivo o con motivo de 251 caracteres | No llega a la red; se marca el campo |
| 7 | Ajustar (o programar la baja de) un contrato finalizado desde otra pestaña | El aviso propio "El contrato ya no está activo; recargá para ver su estado" (no el `title` del backend, DV-FJ3); el diálogo se cierra y se recarga |
| 8 | "Programar baja" en un contrato sin fin, con una fecha futura | `PUT /Ocupacion/{id}/fin` con `{ fin }` como instante con `Z` (zona del local); "Baja programada"; el detalle muestra "Fin del contrato: …" |
| 9 | Programar con un fin pasado | El backend da 400 y se marca `fin` con su `title` |
| 10 | "Cambiar fecha de fin" a una fecha que choca con otra ocupación de la cochera | El `title` de `cochera_no_disponible`; el diálogo queda abierto con lo escrito |
| 11 | "Quitar baja" | Confirmación; `PUT .../fin` con `{ fin: null }` (la clave presente); "Baja quitada"; el detalle muestra "Sin fin (contrato abierto)" |
| 12 | Programar una baja anticipada en un contrato con `fraccionMes` PROPORCIONAL y pagos que superan lo devengado hasta esa fecha (P-FJ9) | El resultado dice "Quedó un saldo a favor de $ X… Registrá la devolución desde la sección Cuenta"; tras recargar aparece el chip de saldo a favor y, con `dueno@demo.test`, "Registrar devolución" (08); en `/alertas-operativas` existe la alerta `DEVOLUCION_PENDIENTE` abierta |
| 13 | Devolver el saldo a favor completo desde "Registrar devolución" | La alerta se ve resuelta sola (`resolucionAutomatica`) |
| 14 | Programar una baja sin saldo a favor resultante | No aparece el aviso de saldo a favor |
| 15 | Contrato VENCIDO (estado guardado ACTIVA con fin pasado) | El diálogo agrega "El contrato está vencido: una fecha futura lo extiende"; con una fecha futura el backend lo acepta |
| 16 | Contrato FINALIZADO y CANCELADO | La sección muestra modo, fracción, precio de partida y fin, sin botones |
| 17 | `encargado@demo.test` y `operado@demo.test` | Ven "Programar baja"/"Cambiar fecha de fin"/"Quitar baja" y **no** "Ajustar precio" ni el botón del encabezado |
| 18 | Un usuario sin acciones (AUDITOR: no verificable con los demo, P-FA9; lo cubren los tests de `accionesDeContrato`) | La sección se ve sin botones |
| 19 | Encabezado de Ocupaciones con `dueno@demo.test` | Botón "Ajustar precios mensuales"; con `encargado@demo.test` y `operado@demo.test` no aparece |
| 20 | Paso 1 con `porcentaje` `100.01`, `-50.01`, `1.234` o vacío; sin motivo | No avanza; se marca el campo |
| 21 | Paso 2 | `GET /Ocupacion?estado=1&take=500`; tabla solo con contratos MES (cochera, cliente, fin), casilla "Excluir", el resumen y, si la lista llegó a 500, el aviso de "puede haber más"; "Aplicar ajuste" deshabilitado hasta tildar "Entiendo que el ajuste no se puede deshacer" |
| 22 | Aplicar con un contrato excluido | `POST /Ocupacion/ajuste-precio` con `{ vigenteDesde, porcentaje, motivo, excluir: [id] }`; el resultado lista los demás con precio anterior → nuevo (redondeado al peso) y **no** el excluido |
| 23 | Aplicar sin exclusiones | El cuerpo **no** lleva `excluir`; `cantidad` coincide con los contratos de la tabla (salvo el alcance que decida el backend) |
| 24 | **Verificación manual del todo o nada (F6):** aplicar con un porcentaje que deje un precio en cero en algún contrato (por ejemplo −50 con un contrato de precio bajo en los datos de prueba, P-FJ9) | El backend da 400 `errors.Porcentaje`; el diálogo vuelve al paso 1 con el campo marcado y **ningún** contrato cambió, ni los anteriores en el orden de `id` (se comprueba en el detalle de dos o más contratos y en la Trazabilidad: sin filas `AJUSTAR_PRECIO` nuevas) |
| 25 | Aplicar sin contratos mensuales activos | "No había contratos para ajustar" (`cantidad` 0) |
| 26 | Backend apagado en el paso 2 | "No pudimos cargar los contratos" con "Reintentar"; no se puede aplicar |
| 27 | Tras aplicar, abrir el detalle de dos contratos | "Precio de partida" **sin** cambios; la sección "Cuenta" refleja los topes nuevos cuando el período empieza desde `vigenteDesde` (calculado por el backend) |
| 28 | Búsquedas finales (paso 5.4) | Sin `toLocale` ni `toISOString` en los archivos nuevos |

**No verificable con los usuarios demo:** el rol `AUDITOR` (P-FA9; lo cubren los tests de `accionesDeContrato`), el redondeo exacto del lote en pesos con centavos (lo cubre el backend), un contrato con `fin` anterior a `inicio` (F5: es un hueco del backend) y el efecto de un ajuste a la baja sobre el saldo a favor (F4) si los datos de prueba no lo permiten (P-FJ9).

## 8. Cómo retomar

**Estado:** Aprobada (19/11/2026). **Todas las decisiones D-FJ (1 a 15) están Confirmadas.** El desarrollador aprobó las cuatro preguntas de producto (ajuste masivo en Ocupaciones con un diálogo de 3 pasos, lista de candidatos con casilla "Excluir" y aviso de truncado, casilla obligatoria "Entiendo que no se puede deshacer", baja sobre cualquier mensual ACTIVA con el aviso de vencido y el de saldo a favor) y el texto propio para `ocupacion_no_activa` (DV-FJ3); las dudas F1 a F6 están contestadas y los pedidos PB-18 a PB-23 quedaron aprobados en `brechas-front.md`. Sin pendientes que frenen la ejecución.

**Condición de arranque:** la 02, la 07 y la 08 ejecutadas y mergeadas en `develop` (ya lo están) y esta spec mergeada. El Orquestador crea `feature/front-contratos` desde `develop` (comprobando con `git branch -a`) y la deja chequeada en `parkingcontrol-front`. Se ejecuta **después de la 09** y en una rama aparte.

**Ejecución:** un solo subagente, en el repo principal, con **un commit por spec**. Modelo **Sonnet** con esfuerzo **medio**: son pocos archivos y con decisiones tomadas y tablas de casos. Si aparece una decisión de arquitectura difícil de revertir (por ejemplo, que `OcupacionDetalleDialog` no permita montar la sección sin rehacerlo, o que la respuesta del lote difiera de la sección 2.2), **frena** y avisa; se sube a Opus con esfuerzo alto solo si cambia el contrato con la 07 o con la 08.

**Prompt para el subagente ejecutor:**

> Trabajás en el frontend de ParkingControl, en `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`, en la rama `feature/front-contratos` (ya creada desde `develop` por el Orquestador; **nunca trabajes sobre `develop`**; no cambies de rama). Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/specs/frontend/07-ocupaciones.md` (solo D-FG4, D-FG8, D-FG10, D-FG11, D-FG13 y D-FG17 a D-FG19), `docs/specs/frontend/08-pagos.md` (solo D-FH6, para el botón de devolución), `docs/inventario/backend.md` (secciones `/Ocupacion`, `/Configuracion`, `/Pagos`, `/operational-alerts`, 2, 3, 4 y 5), `docs/inventario/brechas-front.md` ("Contratos entre specs") y `docs/specs/frontend/10-contratos-mensuales.md`. Implementá **la spec 10 completa**, de a un paso por vez y en orden (pasos 0 a 5), siguiendo la sección 6, y tildá cada paso en la spec al terminarlo. Resolvé P-FJ-L1 a P-FJ-L4 antes de empezar: si algo falta o no coincide, **frená y reportá**; no implementes cosas de otras specs. **No corras git** (ni `git add`, ni commit, ni rebase: lo hace el Orquestador). **No le preguntes nada al usuario**; las dudas o las decisiones que la spec no prevé van en tu reporte final, con la opción que recomendás. No supongas reglas del backend. No leas ni muestres el `.env`. No toques los archivos de la sección 5.4. **Sumá** las funciones a `ocupacionApi.js` sin recrearlo ni cambiar las existentes. Al terminar el paso 5, corré en PowerShell, desde `parkingcontrol-front`, `npm test`, `npm run lint` y `npm run build` (**solo al final**, no por paso) y corregí lo que falle. Reportá: los archivos que creaste, modificaste y borraste (rutas completas), el resultado de los tres comandos, lo que quedó sin verificar a mano y cualquier desvío o duda. Respondé en español rioplatense.

**Modelo y esfuerzo para seguir.** La ejecución: Sonnet, esfuerzo medio. El manual (paso 5.2) lo puede escribir el mismo ejecutor; si se separa, Haiku con esfuerzo bajo alcanza.
