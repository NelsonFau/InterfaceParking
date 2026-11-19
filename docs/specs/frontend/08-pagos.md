# 08 — Pagos: lista de la ocupación, detalle, anulación y devoluciones

> Frontend · **Aprobada** (18/11/2026) · `feature/specs-etapa5` (esta spec) y `feature/front-pagos` (ejecución, en el worktree `../parkingcontrol-front-pagos`, a crear desde `develop` cuando estén mergeadas la 02, la 04, la 05 y la 07) · Última actualización 18/11/2026
>
> Octava spec del frontend. La 07 deja en el detalle de la ocupación una sección "Pagos" vacía, un `RegistrarPagoDialog` y una función `createPago` aditiva. Esta spec **llena esa sección** con la lista de pagos de la ocupación, agrega el detalle de un pago (con historial y devoluciones), la anulación y las devoluciones, y le da a la "devolución pendiente" un camino para resolverse. También **migra `pagosApi.js` al estilo de funciones** (D-FB14). **Depende de la 02** (fechas con zona del tenant, enums, `formatMoney`, patrón de módulos de API), de la **04** (`buildTrazabilidadPath`, con `pagoId`), de la **05** (alertas: el camino desde `DEVOLUCION_PENDIENTE`) y de la **07** (el detalle de la ocupación y su sección "Pagos"); no puede arrancar hasta que las cuatro estén mergeadas en `develop`.
>
> **Estado de las decisiones.** **Todas las D-FH (1 a 15) están Confirmadas** (18/11/2026): el desarrollador aprobó, por el Orquestador, las preguntas de producto 1 a 5, el export de compatibilidad de `pagosApi` y los dos avisos de D-FH6 y D-FH7; el comportamiento del backend (C1 a C9) está relevado del código (sección 2.2). Ninguna queda en Propuesta.

## 1. Objetivo y alcance

**Objetivo.** Que el personal vea qué se cobró en una ocupación, abra el detalle de un pago (quién lo registró, qué le pasó, qué se devolvió), anule un pago con motivo y registre devoluciones; y en particular que **una devolución pendiente** (un mensual finalizado con `DEVOLVER`, o una reserva cancelada con pagos) tenga un camino claro hasta quedar resuelta. Cada usuario ve solo las acciones que su permiso le deja hacer.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `src/api/pagosApi.js` migrado a funciones nombradas (`createPago` adoptada de la 07, `listPagosByOcupacion`, `getPago`, `anularPago`, `createDevolucion`) y un export de compatibilidad temporal para `CajaDiaria.jsx` | D-FH2, DV-FH1 |
| Lista de pagos | Tabla en la sección "Pagos" del detalle de la ocupación | D-FH3, D-FH4 |
| Detalle de un pago | Diálogo sobre el detalle de la ocupación, con historial y devoluciones | D-FH5 |
| Anulación | Diálogo con motivo, con la advertencia de "otra sesión de caja" | D-FH7 |
| Devolución | Diálogo que elige el pago, desde el saldo a favor de la ocupación o desde el detalle de un pago | D-FH6 |
| Permisos y errores | Acciones ocultas por permiso; errores por `code` con la recarga que corresponde | D-FH9, D-FH10 |
| Formularios | Monto con 2 decimales y rangos del backend, motivos de hasta 250 | D-FH11 |
| Código | Lógica pura en `src/utils/pagos.js`, probada con Vitest | D-FH14 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| `RegistrarPagoDialog`, `createPago` como función y el botón "Registrar pago" | Spec 07 (D-FG4, D-FG19). La 08 solo adopta `createPago` en el archivo migrado |
| Sesiones de caja, apertura y cierre, arqueo, `caja_cerrada` y `caja_dia_anterior_abierta` como pantallas | Spec 09. Si un pago, una anulación o una devolución dan esos códigos, la 08 muestra el `title` del backend y no hace nada más (D-FH10) |
| `CajaDiaria.jsx` y `pagosApi.getCajaDiaria` | Spec 09. Se conservan tal cual hasta que la 09 reemplace la pantalla (D-FH2, DV-FH1) |
| Listado general de pagos y pantalla `/pagos` | El backend no tiene `GET /Pagos` general y no se pide (D-FH8, P-FH4) |
| Mostrar de antemano si un pago es "de otra sesión" | El backend no manda `cajaSesionId` (P-FH2, PB-11) |
| Cambios en `getAlertLinks` o en `OperationalAlerts.jsx` | No hay: la alerta enlaza a la ocupación con el enlace de la 07 (D-FH6) |
| Rediseño visual | Después, con el diseño nuevo |

**Estado de alcance.** Etapa 5 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02, la 04, la 05 y la 07 ya mergeadas al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Pagos` | Endpoints, `PagoResponse`, `PagoDetalle`, `Devolucion`, permisos, "Comportamiento de `POST /Pagos`" | 18/11/2026 |
| `docs/inventario/backend.md`, `/Ocupacion`, `/Caja`, `/operational-alerts` | Cifras de la ocupación (`pagado` neto, `saldo`, `saldoAFavor`), alerta `DEVOLUCION_PENDIENTE`, `modoCaja` (DIARIA y TURNO) | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 2, 3, 4 y 5 | `MetodoPago` y `EstadoPago` enteros; matriz de permisos (`pagos.ver`: todos; `pagos.registrar`: sin AUDITOR; `pagos.anular`: DUENO y ENCARGADO; `pagos.devolver`: solo DUENO); códigos de error 409 de pagos; instantes con zona | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 2, 3 y "Contratos entre specs" | Brecha de Pagos (detalle, devoluciones, anulación entre sesiones), contrato 07 ↔ 08, enlace profundo a Trazabilidad, widget de caja | 18/11/2026 |
| Spec 07 (`07-ocupaciones.md`), D-FG4, D-FG5, D-FG13, D-FG17, D-FG18 y D-FG19 | Límite con la 08; sección "Pagos" vacía en el detalle; aviso "Quedó una devolución pendiente; registrala desde Pagos"; `RegistrarPagoDialog`; `shouldReloadAfter`; `fieldErrorsFromApi` | 18/11/2026 |
| Spec 02 (`02-base-comun.md`) | D-FB14 (módulos de API), `useTenantDates`, `labelOf`/`colorOf`/`optionsOf`, `formatMoney`, `cleanParams`, tabla 5.4 de excepciones de lint | 18/11/2026 |
| Spec 04 (`04-trazabilidad.md`), D-FD5 | `buildTrazabilidadPath({ pagoId })`, enlace solo con `auditoria.ver` | 18/11/2026 |
| Spec 05 (`05-alertas.md`), D-FE6 y D-FE10 | `/alertas-operativas?ocupacionId=N`, `getAlertLinks`; la alerta trae `ocupacionId` y no `pagoId` | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), lógica pura con Vitest (D-FA4) | 09/11/2026 |
| Lectura de `src/api/pagosApi.js`, `src/pages/CajaDiaria.jsx`, `src/pages/OperationalDashboard.jsx`, `src/pages/Ocupaciones.jsx` y `src/api/errors.js` | Estado actual (sección 2.1) | 18/11/2026 |
| Relevamiento del backend C1 a C9 (Orquestador, del código de `ParkingControl`) | Cerrado: comportamiento de anular, devolver, "otra sesión", cifras, alerta, DTOs y reglas (sección 2.2) | 18/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Dialog`, `Table`, `Chip`, `Alert`, `TextField select`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| `src/api/pagosApi.js` | Un objeto `pagosApi` con `crear(payload)` (`POST /Pagos`), `getCajaDiaria(fecha)` (`GET /Pagos/caja-diaria`, **endpoint retirado**) y `anular(pagoId, motivo)` (`PATCH /Pagos/{id}/anular`). Devuelve la respuesta de axios entera (la página lee `{ data }`). Sin `createPago` hasta que la 07 la agregue |
| Quién lo usa | `CajaDiaria.jsx:85` (`getCajaDiaria`) y `CajaDiaria.jsx:112` (`anular`); `OperationalDashboard.jsx:114` (`getCajaDiaria`, que la 05 saca del Monitor). `Ocupaciones.jsx` hace `http.post("/Pagos")` directo hasta que la 07 use `createPago` |
| Anulación actual | `CajaDiaria.jsx:112` llama `pagosApi.anular(pagoAnular.id)` **sin pasar el motivo** que le pidió al usuario: con el backend actual daría 400 (`motivo` es obligatorio). La pantalla ya está rota por el 404 de `caja-diaria`; la reemplaza la 09 |
| Errores | `CajaDiaria.jsx:123` lee `e.response.data.error` (campo que la API ya no manda) |
| Lista y detalle de pagos | No existen. El detalle de la ocupación (07) tendrá la sección "Pagos" vacía |
| Devoluciones | No hay ninguna pantalla ni función |

### 2.2 Lo que hace el backend (relevamiento C1 a C9, 18/11/2026)

Relevado por el Orquestador del código de `ParkingControl` (rutas relativas a `ParkingControl\ParkingControl\`; sin confirmar por tests). Abreviaturas: PS = `Service\PagoService.cs`, PC = `Controllers\PagosController.cs`, SC = `Service\SesionesDeCaja.cs`, ADP = `Service\AlertaDevolucionPendiente.cs`, COC = `Service\CuentaDeOcupacion.cs`.

| Id | Tema | Comportamiento | Afecta a |
|---|---|---|---|
| C1 | `PATCH /Pagos/{id}/anular`: orden | 1) policy `pagos.anular`, si no 403 (PC:46); 2) 400 `datos_invalidos` con `errors.Motivo` (`[Required][MaxLength(250)]`; solo espacios también falla); 3) **controller (PC:54-62): sin `pagos.devolver` y "otra sesión", 403 `sin_permiso`**; 4) 404 `pago_no_encontrado`; 5) 409 `pago_anulado` (PS:124); 6) 409 `pago_con_devoluciones` (PS:128); 7) caja: 409 `caja_cerrada` (TURNO sin sesión) o `caja_dia_anterior_abierta` (DIARIA; con DIARIA sin sesión abierta se abre sola); 8) 409 `anulacion_requiere_dueno` (PS:143), **solo por una carrera**. **El 403 del paso 3 corre antes del 404 y de los 409**: para un no dueño con un pago de otra sesión tapa `pago_anulado`, `pago_con_devoluciones` y, en TURNO con la caja cerrada, `caja_cerrada`. El motivo se guarda con `Trim` | D-FH7, D-FH10 |
| C2 | `POST /Pagos/{id}/devoluciones`: orden y reglas | Orden: 1) policy `pagos.devolver`; 2) 400 con `errors.Monto`, `errors.Metodo` y `errors.Motivo`; 3) 404 `pago_no_encontrado`; 4) 409 `pago_anulado`; 5) 409 `devolucion_supera_pago`; 6) caja (los mismos dos codes). `devolucion_supera_pago` compara **solo contra el pago** (`yaDevuelto + monto > pago.Monto`, PS:241), **no** contra el `saldoAFavor` de la ocupación ("La devolución supera lo que queda por devolver del pago."). Se puede devolver sobre **cualquier estado** de ocupación, con o sin saldo a favor (no hay chequeo de la ocupación). El método puede diferir del del pago (`[EnumDataType]`). `monto` con `[Dinero]` (mayor que 0, 2 decimales, máximo 1e7); `motivo` con `[Required][MaxLength(250)]` y `Trim`. Responde 201 con `Devolucion` | D-FH6, D-FH10, D-FH11 |
| C3 | "Otra sesión de caja" | Se compara la `CajaSesionId` de la fila PAGADO del historial con la **única sesión ABIERTA** del tenant; **si no hay sesión abierta, cuenta como "otra sesión"** (PS:199-221). El pago no tiene `CajaSesionId` propio: está en el historial y en la devolución. **DIARIA:** pago de ayer con la caja de ayer abierta, 409 `caja_dia_anterior_abierta` para todos; ayer cerrado y sin sesión hoy, es otra sesión (un no dueño recibe 403; para el dueño la sesión de hoy se abre sola). **Un ENCARGADO nunca puede anular un pago de un día anterior.** **TURNO:** un pago de un turno cerrado es de otra sesión, así que solo lo anula el dueño. **Devolver no depende de la sesión:** siempre exige `pagos.devolver` (en la práctica, solo el DUENO). La anulación y la devolución se registran en la sesión **actual**, no en la del pago | D-FH7 |
| C4 | Cifras tras anular y devolver (COC:98-150) | `pagadoNeto` = Σ pagos PAGADO − Σ devoluciones de esos pagos; `saldo = max(tope − pagado, 0)`; `saldoAFavor = max(pagado − tope, 0)`. Anular resta el monto entero (no queda remanente: un pago con devoluciones no se anula). **Anular un pago de una FINALIZADA con `PrecioTotal` fijo hace subir el saldo**: la ocupación queda debiendo sin reabrirse. Devolver sobre una ACTIVA sube el saldo; sobre una CANCELADA (tope 0) o una FINALIZADA con exceso baja el `saldoAFavor` | D-FH6, D-FH7 |
| C5 | Alerta `DEVOLUCION_PENDIENTE` (ADP) | Se crea al cancelar (`OcupacionService:358`), al finalizar con excedente (`:492`) y al programar la baja de un mensual (`ContratoMensualService:182`), si `saldoAFavor > 0`. Severidad ALTA; una sola abierta por ocupación; el job horario no la crea. **Se resuelve sola (ADP:47-58) al anular o al devolver, solo si `saldoAFavor` queda <= 0**; una devolución parcial no la resuelve. Al resolverse sola: `resolucionAutomatica = true`, comentario "Resuelta al quedar el saldo a favor en 0." y `resueltaPorUsuarioId` = quien operó. No se recrea; tras una devolución parcial el mensaje sigue con el monto original (PB-13). La resolución manual exige `alertas.resolver_dinero` y un comentario | D-FH6 |
| C6 | Formas de los DTOs | Siempre con `usuarioId`, **nunca con el nombre**. `historial[]`: `{ estado (PAGADO=1 sin motivo; ANULADO=2 con motivo), fecha UTC, usuarioId, motivo? }`, en orden cronológico ascendente. `devoluciones`: orden ascendente por `id`. `Devolucion`: `{ id, pagoId, monto, metodo, motivo, usuarioId, fecha }`. `PagoDetalle` suma `registradoPorUsuarioId`. El OPERADOR no tiene `usuarios.ver` (PB-14) | D-FH5 |
| C7 | Reglas | Anular exige que el pago **no tenga devoluciones** (409 `pago_con_devoluciones`: un pago con devolución parcial no se anula). Una devolución no se puede anular ni revertir (no hay endpoint). Un pago ANULADO no se puede devolver (409 `pago_anulado`). No existe "reactivar" | D-FH7, D-FH9 |
| C8 | `GET /Pagos/ocupacion/{id}` | Orden `fechaPago` descendente, sin desempate. **Incluye los ANULADOS.** Con una ocupación inexistente devuelve 200 con `[]` (no 404). No filtra por usuario ni por rol. `PagoResponse` no trae `registradoPorUsuarioId` | D-FH4 |
| C9 | DTOs sin sesión ni nombre | Ningún DTO expone `cajaSesionId` ni el nombre del usuario. `PagoResponse`: `{ id, ocupacionId, monto, montoDevuelto, metodo, estado, fechaPago, referencia? }`; `POST /Pagos` devuelve `montoDevuelto = 0`. No hay listado general de pagos. **Extra:** `GET /Caja/sesiones/{id}` trae `movimientos` con `pagoId` (tipo COBRO, ANULACION o DEVOLUCION, más `dePagoDeOtraSesion`, que solo vale en las anulaciones) → contrato 08 ↔ 09 (D-FH13) | D-FH5, D-FH7, D-FH13 |

**Consecuencias para el front.** (1) El cliente no puede saber de antemano si un pago es "de otra sesión": D-FH7 lo avisa con una nota fija y pide PB-11. (2) El 403 de anular puede **tapar** otros codes (`pago_anulado`, `pago_con_devoluciones`, `caja_cerrada`): el aviso del backend es el `title` de `sin_permiso` y no se recarga solo; se documenta en el manual y en la verificación. (3) El límite duro de una devolución lo pone el pago; el saldo a favor es solo la sugerencia. (4) Anular un pago de una finalizada y devolver sin saldo a favor dejan la ocupación debiendo: se avisa antes de confirmar, sin calcular el monto en el cliente.

**Corrección de documentación (misma fecha).** El motivo de cancelar una reserva **no** "pasa con solo espacios": `[Required]` lo rechaza. Se corrige en `docs/inventario/backend.md` y en la sección 2.2 de la 07 en este mismo PR.

## 3. Decisiones

Prefijo **D-FH** ("frontend, pagos"). Estado: **Confirmada** (la tomó el desarrollador o la fija una fuente) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva). En esta spec todas están Confirmadas. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FH1 (18/11/2026) — Confirmada. Rama, worktree y orden de merge.** La spec vive en `feature/specs-etapa5`. La ejecución va en `feature/front-pagos`, en el worktree `../parkingcontrol-front-pagos`, creada desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que estén mergeadas la 02, la 04 (por `buildTrazabilidadPath`), la 05 y la 07**. Antes del PR, `git rebase develop`.

**D-FH2 (18/11/2026) — Confirmada (estilo por D-FG4; export de compatibilidad aprobado por el desarrollador el 18/11/2026). `pagosApi.js` en estilo de funciones, con un export temporal.** El archivo pasa al patrón D-FB14: funciones `async`, nombradas, que devuelven `data`, con JSDoc de tipos tomados del inventario, sin capturar errores y sin convertir fechas ni enums:

| Función | Endpoint | Devuelve |
|---|---|---|
| `createPago(body)` | `POST /Pagos` (la adopta tal como la dejó la 07) | `PagoResponse` (201) |
| `listPagosByOcupacion(ocupacionId)` | `GET /Pagos/ocupacion/{ocupacionId}` | `PagoResponse[]` |
| `getPago(pagoId)` | `GET /Pagos/{pagoId}` | `PagoDetalle` |
| `anularPago(pagoId, body)` | `PATCH /Pagos/{pagoId}/anular` con `{ motivo }` | `undefined` (204) |
| `createDevolucion(pagoId, body)` | `POST /Pagos/{pagoId}/devoluciones` con `{ monto, metodo, motivo }` | `Devolucion` (201) |

`listPagosByOcupacion` verifica que la respuesta sea un arreglo y, si no, lanza `ApiError` con `code: "respuesta_invalida"`, igual que `listOcupaciones`. Se prueba con `vi.mock` de `http` (ruta, método, cuerpo, que no capture errores).

**Compatibilidad con `CajaDiaria.jsx` (y, si todavía lo usa, `OperationalDashboard.jsx`).** El archivo conserva, **marcado `@deprecated` y "se retira con la spec 09"**, un export `pagosApi` con solo lo que esas páginas usan hoy y con su **forma actual**, que devuelve la respuesta de axios entera:

```js
/** @deprecated Solo para CajaDiaria.jsx hasta la spec 09. No usar en código nuevo. */
export const pagosApi = {
  getCajaDiaria: (fecha) => http.get("/Pagos/caja-diaria", { params: { fecha } }),
  anular: (pagoId, motivo) => anularPago(pagoId, { motivo }),
};
```

`getCajaDiaria` la usan `CajaDiaria.jsx` **y también `OperationalDashboard.jsx:114`** (la 05 debía sacarla del Monitor): **el ejecutor lo verifica** (P-FH-L2) y conserva la función mientras alguna página la llame. `crear` se retira del objeto: no lo usa nadie después de la 07 (**el ejecutor lo verifica con una búsqueda**; si algo lo usa, se conserva). `anular` conserva su firma (`pagoId, motivo`) y **delega en `anularPago`** (`CajaDiaria.jsx` no usa lo que devuelve, y así hay un solo lugar que habla con el endpoint) para no tocar la página; **no se arregla** que esa página no le pase el motivo (DV-FH1): es de la 09 y la pantalla ya no recibe datos. La 09 retira el objeto entero. Un test fija que el objeto sigue exportando `getCajaDiaria` y `anular` y que `CajaDiaria.jsx` no cambia (`git diff develop`).
*Motivo:* la 07 dejó dicho que la 08 migra el archivo; el export temporal evita tocar páginas de otra spec y se borra solo con la 09.
*Descartados:* (a) migrar también `getCajaDiaria` y arreglar `CajaDiaria.jsx`: invade la 09; (b) dejar los dos estilos mezclados sin marca: nadie sabría qué se retira.

**D-FH3 (18/11/2026) — Confirmada. Límite con la 07 y con la 09.**

| Spec | Qué es de ella | Qué hace la 08 |
|---|---|---|
| 07 Ocupaciones | `OcupacionDetalleDialog`, la sección "Pagos" vacía, `RegistrarPagoDialog`, `createPago`, el aviso de saldo a favor y el de "devolución pendiente" | **Monta** `PagosSeccion` en esa sección y suma el botón "Registrar devolución" al aviso de saldo a favor. Es una edición del `OcupacionDetalleDialog` ya mergeado, limitada a esos dos puntos. **No toca** `RegistrarPagoDialog`, `FinalizarOcupacionDialog` ni `CancelarReservaDialog` |
| 09 Caja | Sesiones, `CajaDiaria.jsx`, `pagosApi.getCajaDiaria`, los avisos de caja cerrada | La 08 muestra el `title` si el backend contesta `caja_cerrada` o `caja_dia_anterior_abierta` y no hace nada más |
| 05 Alertas | `getAlertLinks` y `OperationalAlerts.jsx` | No se toca: la alerta `DEVOLUCION_PENDIENTE` llega a la ocupación por el enlace "Ver ocupación" de la 07 (D-FH6) |
| 04 Trazabilidad | `buildTrazabilidadPath` | La 08 lo usa con `pagoId` en el detalle del pago (D-FH5) |

**Contrato con la 07 (a confirmar por el Orquestador, P-FH-L1).** La 08 necesita que `OcupacionDetalleDialog` le pase a `PagosSeccion`: `ocupacion` (con `id`, `saldo`, `saldoAFavor` y la fase), `can` (o que la sección use `usePermissions`) y un callback `onChanged()` que recarga el detalle abierto y el listado. Si la 07 lo dejó con otra forma, el ejecutor **ajusta el uso a lo que exista y lo anota**; si la sección no se puede montar sin rehacer el diálogo, **frena** y avisa.

### 3.2 Lista, detalle y devolución pendiente

**D-FH4 (18/11/2026) — Confirmada. Lista de pagos en la sección "Pagos".** `PagosSeccion` pide `listPagosByOcupacion(ocupacion.id)` al abrir el detalle (con esqueletos; si falla, "No pudimos cargar los pagos" con "Reintentar", sin vaciar el detalle) y muestra una **tabla compacta**:

| Columna | Contenido |
|---|---|
| Fecha | `formatInstant(fechaPago)` (zona del tenant) |
| Método | `labelOf(MetodoPago, metodo)` |
| Monto | `formatMoney(monto)` |
| Devuelto | `formatMoney(montoDevuelto)` si es mayor que 0; si no, vacío |
| Estado | chip con `labelOf` y `colorOf` de `EstadoPago` (Pagado `success`, Anulado `default`) |
| Referencia | `referencia` o vacío |

Los pagos **anulados** se ven atenuados (texto secundario, monto tachado) y **no se suman a nada**: el front **no calcula totales** de la lista (el `pagado` neto, el `saldo` y el `saldoAFavor` son del backend y están en la sección "Cuenta" del detalle). Una fila con `pagos.ver` se abre al hacer clic (detalle, D-FH5). Orden: el backend ordena por `fechaPago` descendente sin desempate (C8), así que `sortPagos` (pura) agrega `id` descendente. La lista incluye los anulados y, para una ocupación inexistente, el backend devuelve `[]` (no 404). Sin pagos: "Todavía no hay pagos". En pantallas angostas la tabla se reduce a Fecha, Monto y Estado; el resto se ve en el detalle. Si el usuario no tiene `pagos.ver`, la sección no se monta (la ruta ya exige `ocupaciones.ver`, pero `pagos.ver` es otro permiso).
*Motivo:* es la forma más densa de ver cuánto entró y qué pasó con cada pago; sin totales propios no hay riesgo de que el cliente y el backend discrepen.
*Descartada:* tarjetas por pago (más legibles en celular, más alto con muchos pagos). Aprobada la tabla por el desarrollador el 18/11/2026.

**D-FH5 (18/11/2026) — Confirmada. Detalle de un pago: un diálogo sobre el detalle de la ocupación.** Un clic en una fila abre `PagoDetalleDialog`, que carga `getPago(pagoId)` (esqueletos; si falla, el mensaje con "Reintentar" y "Cerrar"; un 404 `pago_no_encontrado` recarga la lista y lo cierra). Secciones:
1. **Cabecera:** "Pago #id", chip de estado, "Ocupación #N".
2. **Importes:** Monto, "Devuelto" (`montoDevuelto`), método, fecha de pago y referencia.
3. **Registro:** quién lo registró (`registradoPorUsuarioId`; ver abajo).
4. **Historial:** lista cronológica de `historial` (estado con `labelOf(EstadoPago)`, fecha con `formatInstant`, usuario y motivo si lo hay).
5. **Devoluciones:** lista de `devoluciones` (monto, método, fecha, usuario, motivo). Sin devoluciones: "Sin devoluciones".
6. **Acciones** (D-FH9): "Anular pago" y "Devolver".
7. **Enlace:** "Ver trazabilidad" con `<Link to={buildTrazabilidadPath({ pagoId })}>` de `src/utils/trazabilidadLink.js`, **solo con `can("auditoria.ver")`**, nunca armando el texto a mano (D-FD5).

**Usuario del historial y de las devoluciones (C6).** El backend manda solo `usuarioId` (y `registradoPorUsuarioId`), nunca el nombre. Se muestra `usuarioLabel(usuarioId, meUsuarioId)` (pura): **"Vos"** si coincide con `useMe().me.usuarioId`, "Usuario #id" si no, y "—" sin id. **No se pide `GET /Usuarios` ni `/Trazabilidad`** para resolver nombres (el OPERADOR no tiene `usuarios.ver` y la Trazabilidad exige `auditoria.ver`); el pedido al backend es PB-14. El `historial` llega en orden cronológico ascendente (PAGADO sin motivo; ANULADO con motivo) y las `devoluciones` ascendentes por `id`: se muestran tal cual. Después de anular o devolver se recarga el detalle abierto, la lista y el detalle de la ocupación (`onChanged`). **El diálogo se abre con solo un `pagoId`** (contrato con la 09, D-FH13): si necesita la ocupación (avisos de anular y de devolver, precarga), la pide con `getOcupacion(pago.ocupacionId)` de la 07 si no se la pasaron.
*Motivo:* no necesita ruta, hereda el contexto y es coherente con que no hay listado general de pagos.
*Descartadas:* panel lateral (más complejo sobre un diálogo grande); ruta `/pagos/:id` (una entrada de `PRIVATE_ROUTES`, un permiso y una pantalla sin contexto; solo tiene sentido con listado general). Lo que dependa de C6 (nombre del usuario) queda sujeto a esa respuesta.

**D-FH6 (18/11/2026) — Confirmada (producto aprobado; C2, C4 y C5 relevados). La devolución pendiente: un diálogo, dos entradas más el camino desde la alerta.** El backend **no devuelve la plata**: al finalizar un mensual con `DEVOLVER` o al cancelar una reserva con pagos deja `saldoAFavor > 0` y crea la alerta `DEVOLUCION_PENDIENTE`. La devolución se registra con `POST /Pagos/{id}/devoluciones` y es **por pago**. Hay un solo componente, `DevolucionDialog`, con **dos puntos de entrada** (el saldo a favor del detalle de la ocupación y "Devolver" en el detalle de un pago); desde la alerta se llega por el "Ver ocupación" de la 07 y de ahí a la primera entrada:

| Entrada | Dónde | Condición | Qué pasa |
|---|---|---|---|
| Saldo a favor de la ocupación | En el aviso "Hay un saldo a favor pendiente de devolver; se registra desde Pagos" y junto al chip "Saldo a favor $ X" del detalle de la ocupación (07, D-FG13) | `pagos.devolver` y `saldoAFavor > 0` | Abre el diálogo **sin pago elegido**: lista los pagos devolvibles y preselecciona uno (abajo) |
| Detalle de un pago | Botón "Devolver" en `PagoDetalleDialog` | `pagos.devolver`, pago PAGADO y algo devolvible (aunque el `saldoAFavor` sea 0: el backend deja devolver sobre cualquier estado de ocupación, C2) | Abre el diálogo **con ese pago** |
| Alerta `DEVOLUCION_PENDIENTE` | El enlace "Ver ocupación" que la 07 ya agregó (`/ocupaciones?id=N`) | `alertas.ver` y `ocupaciones.ver` | Llega al detalle de la ocupación, donde está la primera entrada. **No se toca la 05 ni la 07** |

**Qué pago se devuelve.** El diálogo lista los pagos PAGADOS con algo devolvible (`devolvible = monto − montoDevuelto > 0`, `pagosDevolvibles`, pura) y **preselecciona** el más reciente cuyo devolvible cubre el `saldoAFavor` (`elegirPagoParaDevolver`, pura); si ninguno lo cubre, el más reciente. El usuario puede cambiarlo. El **monto se precarga** con el menor entre el `saldoAFavor` y lo devolvible del pago elegido (`montoInicialDevolucion`, pura; sin `saldoAFavor`, lo devolvible). **Es solo una precarga.** El límite duro lo pone el pago: el backend compara solo contra lo que queda por devolver del pago (`devolucion_supera_pago`, C2) y **no** contra el `saldoAFavor`, que es solo la sugerencia. El cliente **no bloquea**: si el monto supera lo devolvible, el backend contesta `devolucion_supera_pago` (D-FH10). Sí **avisa, sin bloquear**, antes de confirmar, con `devolucionAviso(monto, saldoAFavor)` (pura): si el `saldoAFavor` es 0 o el monto lo supera, "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo" (devolver sube el saldo de una activa o de una finalizada con precio fijo, C4; no se calcula ningún monto en el cliente). Si el diálogo se abre desde el detalle de un pago, pide la ocupación para conocer el `saldoAFavor`; si esa carga falla, no muestra aviso y precarga lo devolvible. Si el `saldoAFavor` supera lo devolvible de un pago, se registran **varias devoluciones, una por pago**: tras cada éxito el diálogo vuelve a cargar la ocupación y, si queda `saldoAFavor > 0`, se ofrece "Registrar otra devolución". El detalle de la ocupación muestra el saldo a favor nuevo.
**Campos:** Pago (selector, solo desde la ocupación), Monto, Método (`optionsOf(MetodoPago)`; **por defecto el método del pago** elegido) y Motivo (obligatorio, 250; D-FH11). Cuerpo: `{ monto, metodo, motivo }`. Éxito (201): "Devolución registrada" y recarga. **El backend resuelve solo la alerta `DEVOLUCION_PENDIENTE` únicamente cuando el `saldoAFavor` queda en 0** (C5; con `resolucionAutomatica = true`); una devolución parcial no la resuelve y su mensaje sigue mostrando el monto original (PB-13). Por eso, si tras recargar el `saldoAFavor` sigue siendo mayor que 0, el aviso agrega "Queda $ X de saldo a favor por devolver" (X, tal como lo manda el backend en la ocupación recargada) y se ofrece "Registrar otra devolución".
*Motivo:* la devolución es por pago, así que la elección del pago debe verse; los caminos cubren lo que ya existe sin otro contrato entre specs.
*Descartadas:* elegir el pago sin mostrarlo (menos clics, decide plata a ciegas); `?devolver=1` en la URL para abrir el diálogo directo desde la alerta (otro contrato 05 ↔ 08 por poco beneficio; queda como P-FH3, sin hacer).

**D-FH7 (18/11/2026) — Confirmada (pregunta 4 aprobada por el desarrollador; C1, C3, C4, C7 y C9 relevados). Anulación.** "Anular pago" se ofrece en el detalle del pago, con `pagos.anular`, el pago PAGADO y **sin devoluciones** (`montoDevuelto` en 0): el backend rechaza anular un pago con devoluciones y una devolución no se puede revertir (C7). El diálogo pide **solo el motivo** (obligatorio con `trim`, 250 como máximo), muestra el monto y el método y avisa: "Al anular, el pago deja de contar en la cuenta de la ocupación". **Si la ocupación está FINALIZADA** suma, sin bloquear: "La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro" (`anulacionAviso`, pura; C4: anular un pago de una finalizada con precio fijo hace subir el saldo sin reabrirla). No se calcula ningún monto en el cliente, para no duplicar reglas de cobro. Cuerpo: `{ motivo }` (`buildAnularBody`, pura). Éxito (204): "Pago anulado" y recarga.

**Pagos de otra sesión de caja.** Anular un pago de **otra sesión de caja** exige además `pagos.devolver` (dueño). `PagoResponse` no trae `cajaSesionId`, así que el cliente **no puede saberlo de antemano** (P-FH2). Por eso el diálogo muestra una **nota fija**: "Si el pago es de otra sesión de caja (o no hay caja abierta), solo puede anularlo un dueño". El backend decide "otra sesión" comparando la sesión del pago con la única sesión abierta, y **sin caja abierta todo pago cuenta como de otra sesión** (C3); en modo DIARIA un encargado nunca puede anular un pago de un día anterior. Además se pide PB-11 al backend (P-FH2). Si el backend contesta `sin_permiso` (403 del controller: es el caso normal) o `anulacion_requiere_dueno` (409, solo por una carrera, C1), se muestra su `title` (el backend lo redacta) y **el diálogo queda abierto** con el motivo escrito, para que el usuario lo copie o lo cierre sin perderlo; sin lógica extra ni recarga. No se oculta el botón por esto: un encargado tiene `pagos.anular` y puede anular los pagos de su sesión.
**Se oculta "Anular" cuando `montoDevuelto > 0`** (`pago_con_devoluciones`, C7) y el detalle lo explica: "Tiene devoluciones; no se puede anular". **El 403 puede tapar otros códigos** (C1, paso 3 antes del 404 y de los 409): para un no dueño con un pago de otra sesión, `sin_permiso` tapa `pago_anulado`, `pago_con_devoluciones` y, en TURNO con la caja cerrada, `caja_cerrada`; el cliente no hace nada especial (se muestra el `title` y no se recarga), y el pedido PB-12 propone que el backend lo ordene mejor. La anulación queda registrada en la sesión actual, no en la del pago (C3).
*Motivo:* es lo único que se puede decir sin inventar una regla que el backend no manda; el aviso se anticipa con texto y la regla real la sigue dando el `title`.
*Descartadas:* (B) ocultar o explicar de antemano con `cajaSesionId` o un indicador: mejor UX pero el backend no lo manda (PB-11, no frena esta spec); (C) deshabilitar el botón para quien no tiene `pagos.devolver`: bloquea al encargado en los pagos de su propia sesión.

**D-FH8 (18/11/2026) — Confirmada. Sin pantalla propia de Pagos.** Los pagos se ven desde el detalle de la ocupación. **El backend no tiene un listado general de pagos** (solo `GET /Pagos/ocupacion/{id}` y `GET /Pagos/{id}`; verificado en el inventario): una pantalla `/pagos` no se puede construir sin un pedido que **no se hace**: el desarrollador eligió no tener pantalla de Pagos (P-FH4). No se agrega entrada a `PRIVATE_ROUTES` ni al menú. El camino de una alerta o de la caja a un pago pasa por la ocupación.

### 3.3 Permisos, errores y formularios

**D-FH9 (18/11/2026) — Confirmada. Permisos: se oculta, nunca se deshabilita, y se decide por permiso.** Todo con `can(...)` (ARQ-4), nunca por rol:

| Acción | Condición |
|---|---|
| Ver la sección "Pagos" y abrir un pago | `pagos.ver` |
| "Registrar pago" (es de la 07) | `pagos.registrar`, `saldo > 0` y ocupación no cancelada |
| "Anular pago" | `pagos.anular`, pago PAGADO y sin devoluciones (`montoDevuelto` en 0; C7) |
| "Registrar devolución" desde la ocupación | `pagos.devolver` y `saldoAFavor > 0` |
| "Devolver" desde el detalle del pago | `pagos.devolver`, pago PAGADO y devolvible mayor que 0 |
| "Ver trazabilidad" | `auditoria.ver` (regla 4 de D-FD5) |

Con la matriz del backend: el DUENO ve y hace todo; el ENCARGADO ve y anula pero **no devuelve**; el OPERADOR ve y registra pagos pero no anula ni devuelve; el AUDITOR solo ve. La decisión de las acciones de un pago está en `accionesDePago(pago, can)` (pura). Extiende la tabla de D-FG8.

**D-FH10 (18/11/2026) — Confirmada (con el orden de C1 y C2). Errores por `code`, con la recarga que corresponde.** Todos los `catch` llaman a `showApiError(e)` (muestra el `title` del backend tal cual) y se decide por `code`; no se agregan entradas a `errorCodes.js`. Se reutilizan `fieldErrorsFromApi` de la 07 para los 400 con `errors` y la regla "si falla una escritura, el diálogo conserva lo escrito y el reintento es manual" (una escritura no es idempotente). **Orden del backend.** *Anular (C1):* policy `pagos.anular` (403) → 400 `errors.Motivo` → **403 `sin_permiso` si es "otra sesión" y falta `pagos.devolver`** → 404 `pago_no_encontrado` → 409 `pago_anulado` → 409 `pago_con_devoluciones` → caja (`caja_cerrada`, `caja_dia_anterior_abierta`) → 409 `anulacion_requiere_dueno` (solo por una carrera). *Devolver (C2):* policy `pagos.devolver` (403) → 400 `errors.Monto`, `errors.Metodo`, `errors.Motivo` → 404 `pago_no_encontrado` → 409 `pago_anulado` → 409 `devolucion_supera_pago` → caja. **El 403 de anular puede tapar `pago_anulado`, `pago_con_devoluciones` y `caja_cerrada`**; lo mismo vale para quien no es dueño en cualquier pago de otra sesión (PB-12 pide corregirlo). Se anota en el manual y en la verificación.

| `code` | Cuándo | Después del aviso |
|---|---|---|
| `datos_invalidos` | 400. Anular: `errors.Motivo`. Devolver: `errors.Monto`, `errors.Metodo`, `errors.Motivo` | Marca el campo con el primer mensaje. Sin recarga |
| `operacion_invalida` | Regla de negocio sin campo (400) | Aviso. Sin recarga |
| `pago_no_encontrado` | Detalle, anulación o devolución de un pago que ya no existe (404) | Cierra el diálogo de la acción y el detalle del pago y recarga la lista |
| `pago_anulado` | Anular o devolver un pago que alguien ya anuló (409) | Cierra el diálogo de la acción y recarga lista y detalle |
| `pago_con_devoluciones` | Anular un pago con devoluciones (409) | Cierra el diálogo y recarga el detalle del pago |
| `devolucion_supera_pago` | Devolver más de lo que queda por devolver del pago (409; "La devolución supera lo que queda por devolver del pago.") | Recarga el detalle del pago y de la ocupación; el diálogo **queda abierto** con el devolvible nuevo y el monto marcado |
| `sin_permiso` | 403: falta el permiso, o anular un pago de otra sesión (o sin caja abierta) sin `pagos.devolver`; puede tapar los 409 de arriba | Aviso con el `title`. El diálogo queda abierto con lo escrito. Sin recarga |
| `anulacion_requiere_dueno` | 409, solo por una carrera (C1) | Igual que `sin_permiso` |
| `caja_cerrada`, `caja_dia_anterior_abierta` | Anular o devolver con la caja en un estado que no lo permite (409): `caja_cerrada` en TURNO sin sesión; `caja_dia_anterior_abierta` en DIARIA, para todos los roles. Es de la 09 | Solo el aviso. El diálogo queda abierto |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Cualquier escritura | Aviso. El diálogo conserva lo escrito; reintento **manual** |
| Código desconocido o `undefined` | — | Aviso del `title`. Sin recarga |

`shouldReloadAfterPago(code)`, `shouldCloseActionAfterPago(code)` y `pagoErrorField(code)` son puras y están en `pagos.js` (D-FH14).
*Motivo:* el usuario ve el motivo real; en los códigos de estado viejo, recargar es lo que arregla la pantalla.
*Descartado:* mapear cada código a un texto propio: el `title` del backend es la referencia (D-FA6).

**D-FH11 (18/11/2026) — Confirmada. El cliente valida solo formato y largo.** No se valida en el cliente lo que es regla del backend (que el devolvible alcance, que el saldo a favor alcance, que el pago esté anulado, quién puede anular). Sí se valida formato y largo, con los límites del backend:

| Campo | Regla | Mensaje |
|---|---|---|
| `monto` (devolución) | `^\d+(\.\d{1,2})?$`, mayor que 0 y hasta 10.000.000 | "Ingresá un monto con hasta 2 decimales" / "El monto debe ser mayor a 0" / "El monto no puede superar $ 10.000.000" |
| `metodo` | Obligatorio, un valor de `MetodoPago` | "Elegí un método" |
| `pagoId` (devolución desde la ocupación) | Obligatorio | "Elegí el pago a devolver" |
| `motivo` (anular y devolver) | Obligatorio con `trim`, 250 como máximo | "Contanos el motivo" / "El motivo no puede superar 250 caracteres" |

Los enums viajan como enteros (`MetodoPago`, `EstadoPago`). El tope de 250 del `motivo` es del backend (`[Required][MaxLength(250)]` en anular y en devolver, C1 y C2) y el `monto` lleva `[Dinero]` (C2): es formato, no regla de negocio. Los botones quedan deshabilitados mientras envían.

**D-FH12 (18/11/2026) — Confirmada. Fechas, enums y dinero.** Todo instante se muestra con `formatInstant` de `useTenantDates` (zona del tenant); nunca `Date` para formatear ni `toLocale*`. Los enums con `labelOf`, `colorOf` y `optionsOf` de `enums.js` (`MetodoPago`, `EstadoPago`); el dinero con `formatMoney` (un valor nulo muestra "—", un cero muestra `$ 0,00`). Los módulos de API no convierten fechas ni enums. Los datos se recargan después de **cualquier** escritura (lista, detalle del pago y detalle de la ocupación con su listado): las cifras las calcula el backend y el cliente no las actualiza a mano.

**D-FH13 (18/11/2026) — Confirmada. Contrato 08 ↔ 09: `PagoDetalleDialog` se abre con solo un `pagoId`.** La 09 (Caja) muestra movimientos de sesión (`GET /Caja/sesiones/{id}`, C9) que traen `pagoId` (tipo COBRO, ANULACION o DEVOLUCION y `dePagoDeOtraSesion`, que solo vale en las anulaciones). Para que pueda abrir el detalle de ese pago sin pasar por la ocupación, `PagoDetalleDialog` recibe `{ pagoId, onClose, onChanged, ocupacion? }`: con solo `pagoId` carga `getPago(pagoId)` y, si hace falta (aviso de anular una finalizada, precarga y aviso de devolver), `getOcupacion(pago.ocupacionId)`. Decide sus acciones con `usePermissions()` y `accionesDePago`, no recibe `can`. `onChanged` es opcional. La 09 se apoya en este contrato; la 08 no toca nada de la Caja.

### 3.4 Código y retiro de copias

**D-FH14 (18/11/2026) — Confirmada. Lógica pura en `src/utils/pagos.js`, probada con Vitest.** Exporta: `moneyToCents` y `centsToMoney` (aritmética de dinero sin errores de coma flotante, solo para la precarga), `devolvible`, `pagosDevolvibles`, `elegirPagoParaDevolver`, `montoInicialDevolucion`, `sortPagos`, `accionesDePago`, `pagoFilaInfo`, `usuarioLabel`, `anulacionAviso`, `devolucionAviso`, `buildAnularBody`, `validateDevolucion`, `shouldReloadAfterPago`, `shouldCloseActionAfterPago` y `pagoErrorField`. Sin React ni estado; `can` es un parámetro explícito y ningún test depende de la hora ni de la zona del sistema. Las pantallas y los diálogos solo orquestan estado y MUI.
*Motivo:* regla D-FA4: lo que no puede romperse tiene un test, y esta pantalla anula y devuelve plata.

**D-FH15 (18/11/2026) — Confirmada. Qué no se toca.** `src/pages/CajaDiaria.jsx` y `src/pages/OperationalDashboard.jsx` quedan intactas (las reemplaza o las ajusta la 09 y la 05). `Ocupaciones.jsx`, `RegistrarPagoDialog.jsx`, `FinalizarOcupacionDialog.jsx` y `CancelarReservaDialog.jsx` no se tocan. De `OcupacionDetalleDialog.jsx` se modifican **solo** la sección "Pagos" y el aviso de saldo a favor (D-FH3). `eslint.config.js` no cambia: la 08 no retira ninguna excepción (`CajaDiaria.jsx` sigue en ellas hasta la 09). `CLAUDE.md` no se toca salvo la línea que menciona `pagosApi.js` (paso 6.1).

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FH1 | Spec 07, D-FG4 | "La 08 migra el archivo entero al estilo de funciones" | Se migra todo salvo `getCajaDiaria` y `anular`, que quedan en un export `pagosApi` `@deprecated` con su forma actual; `crear` se retira | `CajaDiaria.jsx` no se toca (es de la 09) y la 08 no puede romperla. Tampoco se arregla que esa página no mande el motivo al anular | La 09 reemplaza la pantalla y retira el export |
| DV-FH2 | Spec 07, D-FG13 y D-FG19 | La 07 muestra "se registra desde Pagos" y deja la sección "Pagos" vacía | La 08 edita ese punto de `OcupacionDetalleDialog` para sumar el botón de devolución y montar la lista | Es el contrato aprobado el 18/11/2026: la 08 llena la sección | — |

### 4.2 Pendientes

| Id | Pendiente | Paso |
|---|---|---|
| P-FH1 | **Cerrado (18/11/2026).** Preguntas de producto 1 a 5 aprobadas y dudas C1 a C9 relevadas (sección 2.2) | — |
| P-FH2 (PB-11, Media) | Pedido al backend: exponer la sesión de caja del pago (`cajaSesionId` en `PagoResponse` y `PagoDetalle`) o un indicador `anulableSinDueno`, para explicar de antemano por qué un encargado no puede anular un pago de otra sesión. La spec funciona sin él (D-FH7) | — |
| P-FH2b (PB-12, Media) | Pedido al backend: en anular, mover el chequeo de "otra sesión" (403) **después** de `pago_anulado`, `pago_con_devoluciones` y de caja, para que el 403 no los tape (D-FH10) | — |
| P-FH3 | Abrir el diálogo de devolución directo desde la alerta (`/ocupaciones?id=N&devolver=1`): un contrato 05 ↔ 07 ↔ 08. Sin pedido | — |
| P-FH4 | `GET /Pagos` general con filtros y paginado, si algún día hace falta una pantalla propia de Pagos. **No se pide**: el desarrollador eligió no hacer una pantalla de Pagos (D-FH8) | — |
| P-FH5 (PB-13, Baja) | Pedido al backend: `DEVOLUCION_PENDIENTE` no se actualiza tras una devolución parcial (el mensaje y la huella quedan con el monto original; C5) | — |
| P-FH5b (PB-14, Baja) | Pedido al backend: el nombre del usuario en `historial[]`, `devoluciones[]` y `registradoPorUsuarioId` (C6). Hasta entonces el front muestra "Vos" o "Usuario #id" (D-FH5) | — |
| P-FH6 | Después de finalizar con `DEVOLVER` o de cancelar una reserva con pagos, ofrecer "Registrar devolución" en el mismo diálogo de éxito de la 07. Hoy la 07 solo avisa; el botón vive en el detalle (D-FH6). Sin pedido | — |
| P-FH7 | **Datos de prueba** para verificar: una ocupación con saldo a favor (un mensual finalizado con `DEVOLVER` o una reserva cancelada con pagos), un pago de otra sesión de caja, un pago ya anulado y uno parcialmente devuelto. Con `dueno@demo.test` se prueba todo; con `encargado@demo.test`, anular y que no se ofrezca devolver; con `operado@demo.test`, que no se ofrezca ni anular ni devolver | 3 a 5 |
| P-FH8 | Moneda por tenant (P-FB3): `formatMoney` fija `UYU` | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FH-L1 | Que existan en `develop` la 02, la 04, la 05 y la 07 con sus piezas por nombre: `useTenantDates` (con `formatInstant`), `enums.js` (`MetodoPago`, `EstadoPago`), `formatMoney`, `buildTrazabilidadPath` (con `pagoId`), `OcupacionDetalleDialog` con la sección "Pagos" montable, el aviso de saldo a favor y un `onChanged`, `RegistrarPagoDialog` y `createPago` en `pagosApi.js`, `shouldReloadAfter` y `fieldErrorsFromApi` | Si falta algo, **frenar** y avisar al Orquestador: no se implementa nada de las otras specs desde acá. Si la forma del `OcupacionDetalleDialog` difiere del contrato de D-FH3, ajustar el uso y anotarlo; si obliga a rehacerlo, frenar |
| P-FH-L2 | Quién usa hoy `pagosApi` (búsqueda de `pagosApi` y `crear` en `src/`) | Conservar en el export temporal solo lo que algo use. Si `OperationalDashboard.jsx` aún usa `getCajaDiaria` (la 05 debía sacarlo), conservarlo y anotarlo |
| P-FH-L3 | Que `montoDevuelto` llegue como número en `PagoResponse` y `PagoDetalle`, y que `metodo` y `estado` lleguen como **enteros** | Si llegan como texto, **frenar** (cambia `enums.js`) |
| P-FH-L4 | Las respuestas C1 a C9 siguen vigentes con el backend en `develop` | Si el backend cambió desde el relevamiento, pedir uno nuevo **antes** del paso 1 |
| P-FH-L5 | Que el AUDITOR tenga `pagos.ver` y que el ENCARGADO tenga `pagos.anular` y no `pagos.devolver` en `/me.permisos` | Si difiere, usar lo que traiga `/me` y anotarlo |
| P-FH-L6 | Que `useMe().me` traiga `usuarioId` (para el "Vos" de D-FH5) | Si no existe, mostrar siempre "Usuario #id", anotarlo y avisar al Orquestador (puede ser un pedido a `/me`) |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Lógica pura de pagos | `src/utils/pagos.js` | D-FH4 a D-FH14 |
| Sección de pagos de la ocupación | `src/componentes/pagos/PagosSeccion.jsx` | D-FH4 |
| Diálogos | `src/componentes/pagos/PagoDetalleDialog.jsx`, `AnularPagoDialog.jsx`, `DevolucionDialog.jsx` | D-FH5 a D-FH7 |
| Tests | `test/unit/utils/pagos.test.js` y ampliación de `test/unit/api/pagosApi.test.js` (la crea la 07 con `createPago`) | D-FH2, D-FH14 |
| Manual de esta spec | `docs/manual/frontend/08-pagos.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/api/pagosApi.js` | Migrado a funciones; `crear` se retira; queda el export `pagosApi` `@deprecated` con `getCajaDiaria` y `anular` | D-FH2 |
| `src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` | Monta `PagosSeccion` en la sección "Pagos" y suma el botón "Registrar devolución" al aviso de saldo a favor. Nada más | D-FH3, D-FH6 |
| `docs/specs/README.md` | Fila 08: estado y "Depende de" `02, 04, 05, 07` (lo actualiza el Orquestador al aprobar; el ejecutor la pasa a "Terminada" al cerrar) | Metodología |
| `CLAUDE.md` | Solo la frase que dice que `pagosApi.js` sigue con su manejo de errores propio (paso 6.1); no la línea "Backend endpoints used" | D-FH15 |

### 5.3 Se borran

Nada. (`crear` sale del objeto `pagosApi`, pero el archivo y su ruta se conservan.)

### 5.4 No se tocan

`src/pages/CajaDiaria.jsx`, `src/pages/OperationalDashboard.jsx`, `src/pages/Ocupaciones.jsx`, `src/componentes/ocupaciones/RegistrarPagoDialog.jsx`, `FinalizarOcupacionDialog.jsx` y `CancelarReservaDialog.jsx`, `src/utils/alertas.js` y `src/pages/OperationalAlerts.jsx` (D-FH6), `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js`, `src/constants/enums.js`, `src/utils/fechas.js`, `src/auth/routes.js` (no hay ruta nueva, D-FH8), `eslint.config.js`.

## 6. Pasos

**Regla de ruteo (obligatoria).** El ejecutor **no corre comandos de terminal** y **no le pregunta nada al usuario** en su chat. Todo pasa por el chat "Orquestador" (`SendMessage`): los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, las dudas sobre el backend y las decisiones que la spec no prevé. Después espera su respuesta. Las dudas del backend las releva el Orquestador en el código: el ejecutor no supone reglas de negocio.

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-pagos` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores y `npm test` en verde (los comandos los corre el usuario, pedidos por el Orquestador), el paso tildado en esta spec, el manual al día y el commit confirmado por el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena, se anota en la sección 4 y se avisa al Orquestador**. Lo único que el ejecutor resuelve solo es P-FH-L2 con la regla que fija.
- Antes del PR: rebase sobre `develop`.

### Paso 0 — Precondiciones y worktree

- [ ] **0.1** Confirmar que la 02, la 04, la 05 y la 07 están mergeadas en `develop` y resolver **P-FH-L1**. Si no, frenar.
- [ ] **0.2** Pedir al Orquestador el comando, desde `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-pagos -b feature/front-pagos develop`. En el worktree, copiar el `.env` (no está versionado) y `npm install`. Resolver P-FH-L2, P-FH-L3 y P-FH-L5.
- [ ] **0.3** Leer la sección 2.2 con las respuestas C1 a C9 y comprobar con el Orquestador que siguen vigentes (P-FH-L4): si el backend cambió, se pide un relevamiento nuevo **antes** del paso 1.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — Lógica pura

- [ ] **1.1** Crear `src/utils/pagos.js` con las funciones de D-FH14 y `test/unit/utils/pagos.test.js`.

  *Aceptación:* `npm test` pasa con estos casos (`PAGADO = 1`, `ANULADO = 2`; `EFECTIVO = 1`, `TRANSFERENCIA = 2`; `can` es una función sobre un conjunto de permisos; un pago de ejemplo es `{ id, monto, montoDevuelto, metodo, estado, fechaPago }`; `EstadoOcupacion`: ACTIVA 1, VENCIDA 2, CANCELADA 3, FINALIZADA 4):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `moneyToCents(0.3)`, `(12.34)`, `("10.50")`, `(0.1 + 0.2)` | `30`, `1234`, `1050`, `30` (sin error de coma flotante) |
  | 2 | `centsToMoney(1050)` y `(30)` | `10.5` y `0.3` |
  | 3 | `devolvible({ monto: 1000, montoDevuelto: 0, estado: 1 })` | `1000` |
  | 4 | `devolvible({ monto: 1000, montoDevuelto: 250.5, estado: 1 })` | `749.5` |
  | 5 | `devolvible({ monto: 0.3, montoDevuelto: 0.1, estado: 1 })` | `0.2` (no `0.19999999999999998`) |
  | 6 | `devolvible` de un pago ANULADO (estado 2), aunque `montoDevuelto` sea 0 | `0` |
  | 7 | `devolvible` con `montoDevuelto` mayor que `monto` (dato inconsistente) | `0`, sin lanzar |
  | 8 | `pagosDevolvibles` con tres pagos: A (id 1, 11/11, devolvible 500), B (id 2, 15/11, anulado) y C (id 3, 15/11, devolvible 0) | Solo `[A]` |
  | 9 | `pagosDevolvibles` con A (id 1, 11/11), B (id 2, 15/11) y C (id 3, 15/11), los tres devolvibles | Orden `fechaPago` descendente y, a igual fecha, `id` descendente: `[C, B, A]` |
  | 10 | `elegirPagoParaDevolver([A (500), B (200)], 300)` con B más reciente | `A` (el más reciente que cubre 300 es A) |
  | 11 | `elegirPagoParaDevolver([A (500), B (200)], 100)` con B más reciente | `B` |
  | 12 | `elegirPagoParaDevolver([A (200), B (100)], 900)` (ninguno cubre) con B más reciente | `B` (el más reciente) |
  | 13 | `elegirPagoParaDevolver([], 100)` y `([anulado], 100)` | `null` y `null` |
  | 14 | `montoInicialDevolucion(pago con devolvible 1000, 300)` | `"300.00"` |
  | 15 | `montoInicialDevolucion(pago con devolvible 1000, 1500)` | `"1000.00"` (el menor) |
  | 16 | `montoInicialDevolucion(pago con devolvible 749.5, null)` | `"749.50"` (sin saldo a favor, lo devolvible) |
  | 17 | `sortPagos` con `fechaPago` y `id` mezclados | `fechaPago` descendente y `id` descendente; no muta el arreglo recibido |
  | 18 | `accionesDePago(PAGADO, devolvible 500)` con `pagos.anular` y `pagos.devolver` | `anular` y `devolver` verdaderos |
  | 19 | Igual, solo con `pagos.anular` (ENCARGADO) | `anular` verdadero; `devolver` falso |
  | 20 | Igual, solo con `pagos.ver` (OPERADOR y AUDITOR) | Los dos falsos |
  | 21 | Pago ANULADO con todos los permisos | Los dos falsos |
  | 22 | Pago PAGADO con `montoDevuelto === monto` (devolvible 0) con todos los permisos | `devolver` falso y `anular` falso (tiene devoluciones) |
  | 23 | Pago PAGADO con `montoDevuelto` mayor que 0 y `pagos.anular` | `anular` falso (`pago_con_devoluciones`, C7); `devolver` verdadero con `pagos.devolver` si queda devolvible |
  | 24 | `pagoFilaInfo` de un PAGADO sin devoluciones, de un PAGADO con `montoDevuelto` 100 y de un ANULADO | Estado "Pagado" `success`, sin `devuelto`; "Pagado" con `devuelto: 100`; "Anulado" `default` y `atenuado: true` |
  | 25 | `usuarioLabel(3, 3)`, `usuarioLabel(3, 8)`, `usuarioLabel(3, null)` y `usuarioLabel(null, 8)` | `"Vos"`; `"Usuario #3"`; `"Usuario #3"`; `"—"` (C6: el backend manda solo el id) |
  | 26 | `buildAnularBody(" Cobro duplicado ")`, `("")`, `("   ")` y 251 caracteres | `{ ok: true, body: { motivo: "Cobro duplicado" } }`; error "Contanos el motivo" (los dos siguientes); error "El motivo no puede superar 250 caracteres". Con 250, `ok` |
  | 27 | `validateDevolucion` con `monto: "500"`, `metodo: 1`, `motivo: " devolución del mensual "`, `pagoId: 7` | `ok`; cuerpo `{ monto: 500, metodo: 1, motivo: "devolución del mensual" }` (el `pagoId` no va en el cuerpo) |
  | 28 | `monto` `"1500.5"` y `" 99.99 "` | `ok`, `monto` numérico (`1500.5` y `99.99`) |
  | 29 | `monto` `""`, `"0"`, `"-1"`, `"12.345"`, `"abc"` y `"10000000.01"` | Error de `monto` en los seis. `"10000000"` da `ok` |
  | 30 | `metodo` ausente; `motivo` vacío o de 251 caracteres; `pagoId` ausente cuando se pide | Error de `metodo`; error de `motivo`; error de `pagoId` |
  | 31 | **No valida contra el backend (D-FH11):** `validateDevolucion` con un monto mayor al devolvible y al saldo a favor | `ok` (lo rechaza el backend con `devolucion_supera_pago`) |
  | 32 | `shouldReloadAfterPago` | Verdadero para `pago_no_encontrado`, `pago_anulado`, `pago_con_devoluciones` y `devolucion_supera_pago`; falso para `datos_invalidos`, `operacion_invalida`, `sin_permiso`, `anulacion_requiere_dueno`, `caja_cerrada`, `caja_dia_anterior_abierta`, `sin_conexion`, un código desconocido y `undefined` |
  | 33 | `shouldCloseActionAfterPago` | Verdadero para `pago_no_encontrado`, `pago_anulado` y `pago_con_devoluciones`; falso para `devolucion_supera_pago` (queda abierto), `datos_invalidos`, `anulacion_requiere_dueno`, `sin_permiso`, `caja_cerrada`, `caja_dia_anterior_abierta` y `undefined` |
  | 34 | `pagoErrorField` con `devolucion_supera_pago` y con `datos_invalidos` sin `errors` | `monto`; `null` |
  | 35 | Búsqueda de `getHours`, `toLocale` y `toISOString` en `pagos.js` | Sin coincidencias |
  | 36 | `anulacionAviso` con `estadoCalculado` 4 (FINALIZADA); con 1, 2 y 3; y sin `estadoCalculado` (usa `estado`) | "La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro"; `null` en los otros; el caso sin `estadoCalculado` con `estado` 4 da el aviso |
  | 37 | `devolucionAviso("100", 300)`, `("300", 300)`, `("100", 0)`, `("100", null)`, `("300.01", 300)` y `("abc", 300)` | `null`; `null`; el aviso "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo"; ese mismo aviso; ese mismo aviso; `null` (el monto inválido lo marca `validateDevolucion`). Compara en centavos, sin coma flotante |

  `npm run lint` y `npm run build` pasan.

### Paso 2 — Módulo de API

- [ ] **2.1** Migrar `src/api/pagosApi.js` (D-FH2): `createPago` (la de la 07, sin cambios de firma), `listPagosByOcupacion`, `getPago`, `anularPago` y `createDevolucion`; el export `pagosApi` `@deprecated` con `getCajaDiaria` y `anular` (resolver **P-FH-L2** sobre `crear`).
- [ ] **2.2** Ampliar `test/unit/api/pagosApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* `npm test` pasa con: `listPagosByOcupacion(7)` hace `GET /Pagos/ocupacion/7` y devuelve el arreglo; una respuesta que no es un arreglo lanza `ApiError` con `code: "respuesta_invalida"`; `getPago(40)` hace `GET /Pagos/40` y devuelve `data`; `anularPago(40, { motivo })` hace `PATCH /Pagos/40/anular` con `{ motivo }` y devuelve `undefined`; `createDevolucion(40, { monto, metodo, motivo })` hace `POST /Pagos/40/devoluciones` con el cuerpo sin modificarlo y devuelve `data`; `createPago(body)` sigue haciendo `POST /Pagos` y devolviendo `data`; ninguna función captura errores (un rechazo de `http` se propaga); el objeto `pagosApi` exporta `getCajaDiaria` (devuelve la respuesta de axios entera) y `anular`, que delega en `anularPago` (`anular(40, "motivo")` hace `PATCH /Pagos/40/anular` con `{ motivo: "motivo" }`). `git diff develop -- src/pages/CajaDiaria.jsx src/pages/OperationalDashboard.jsx` vacío. `npm run lint` y `npm run build` pasan.

### Paso 3 — Lista y detalle (lectura)

- [ ] **3.1** Crear `src/componentes/pagos/PagosSeccion.jsx` (D-FH4) y montarla en la sección "Pagos" de `OcupacionDetalleDialog.jsx` (D-FH3), con `pagos.ver`.
- [ ] **3.2** Crear `src/componentes/pagos/PagoDetalleDialog.jsx` (D-FH5), con el enlace "Ver trazabilidad" por `buildTrazabilidadPath({ pagoId })` y `auditoria.ver`. Las acciones quedan **sin cablear** hasta los pasos 4 y 5.

  *Aceptación (manual, con el backend de `develop`, `America/Montevideo` y `dueno@demo.test`):* (1) al abrir el detalle de una ocupación con pagos, Network muestra `GET /Pagos/ocupacion/{id}` con 200 y la tabla lista los pagos con Fecha (en la zona del local), Método, Monto, Devuelto, Estado y Referencia; (2) un pago anulado se ve atenuado con chip "Anulado" y no aparece en ningún total (la lista no suma nada); un pago con devoluciones muestra la columna "Devuelto"; (3) sin pagos dice "Todavía no hay pagos"; (4) con el backend apagado se ve "No pudimos cargar los pagos" con "Reintentar", sin vaciar el resto del detalle; (5) un clic en una fila abre el detalle del pago con `GET /Pagos/{id}`, el historial y las devoluciones, con el usuario como "Usuario #id" o el nombre si el backend lo manda; (6) "Ver trazabilidad" aparece con `dueno@demo.test` y abre `/trazabilidad?pagoId=N`, y no aparece con `encargado@demo.test` ni `operado@demo.test`; (7) con un usuario sin `pagos.ver` la sección no se monta; (8) una búsqueda de `toLocale`, `toISOString` y `http` en `src/componentes/pagos/` no da coincidencias. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 4 — Anulación

- [ ] **4.1** Crear `src/componentes/pagos/AnularPagoDialog.jsx` (D-FH7): motivo, nota de "sesión de caja anterior", `anularPago` y `buildAnularBody`.
- [ ] **4.2** Cablear "Anular pago" en `PagoDetalleDialog` con `accionesDePago` y errores por `code` (`shouldReloadAfterPago`, `shouldCloseActionAfterPago`, D-FH10), con `showApiError`.

  *Aceptación (manual, con `dueno@demo.test`, `encargado@demo.test` y `operado@demo.test`):* (1) "Anular pago" solo se ve con `pagos.anular` y en un pago PAGADO (con el DUENO y el ENCARGADO sí; con el OPERADOR y el AUDITOR no; en un pago anulado, no); (2) anular sin motivo o con 251 caracteres no llega a la red; con motivo, `PATCH /Pagos/{id}/anular` va con `{ motivo }`, el pago queda "Anulado" en la lista y el detalle, y el `pagado` y el `saldo` de la ocupación se actualizan; (3) la nota de "sesión de caja anterior" está visible antes de confirmar; (4) con el ENCARGADO, anular un pago de **otra sesión de caja** (o sin caja abierta) muestra el `title` de `sin_permiso` (403) y el diálogo queda abierto con el motivo escrito; con el DUENO se anula (en modo DIARIA, un pago de un día anterior con la caja de ese día abierta da `caja_dia_anterior_abierta` para todos) **(C1, C3, P-FH7)**; la nota fija "Si el pago es de otra sesión de caja (o no hay caja abierta), solo puede anularlo un dueño" se ve antes de confirmar; (5) anular un pago ya anulado desde dos pestañas muestra, con el DUENO, el `title` de `pago_anulado`, cierra el diálogo y recarga; **con un no dueño y un pago de otra sesión, el 403 `sin_permiso` tapa a `pago_anulado`** y no se recarga **(C1)**; en una ocupación FINALIZADA el diálogo suma el aviso de saldo pendiente de cobro y la ocupación queda con saldo después de anular **(C4)**; (6) con la caja en un estado que no lo permite se ve el `title` de `caja_cerrada` o `caja_dia_anterior_abierta` y nada más; (7) con un pago con devoluciones (`montoDevuelto > 0`), "Anular" no se ve y el detalle explica "Tiene devoluciones; no se puede anular" **(C7)**. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 5 — Devoluciones

- [ ] **5.1** Crear `src/componentes/pagos/DevolucionDialog.jsx` (D-FH6): selector de pago (solo desde la ocupación), precarga con `elegirPagoParaDevolver` y `montoInicialDevolucion`, monto, método (por defecto el del pago) y motivo, con `validateDevolucion` y `createDevolucion`.
- [ ] **5.2** Cablear las dos entradas: "Devolver" en `PagoDetalleDialog` y "Registrar devolución" junto al aviso de saldo a favor de `OcupacionDetalleDialog` (D-FH3, D-FH6), con `accionesDePago` y `pagos.devolver`.
- [ ] **5.3** Errores por `code` (D-FH10, `devolucion_supera_pago` deja el diálogo abierto con datos frescos) y "Registrar otra devolución" cuando queda saldo a favor.

  *Aceptación (manual, con `dueno@demo.test`, `encargado@demo.test` y `operado@demo.test`; hace falta una ocupación con saldo a favor, P-FH7):* (1) en una ocupación FINALIZADA o CANCELADA con `saldoAFavor > 0`, el detalle muestra el chip de saldo a favor y el botón "Registrar devolución" **solo con `pagos.devolver`** (el ENCARGADO, el OPERADOR y el AUDITOR no lo ven); (2) el diálogo lista los pagos PAGADOS con algo devolvible (sin los anulados ni los ya devueltos del todo) y preselecciona el más reciente que cubre el saldo; el monto viene precargado con el menor entre el saldo a favor y lo devolvible, y el método con el del pago; (3) devolver sin motivo, con un monto `0`, `12.345` o `10000001`, o sin método, no llega a la red; (4) con datos válidos, `POST /Pagos/{id}/devoluciones` va con `{ monto, metodo, motivo }` y devuelve 201: aparece "Devolución registrada", la lista muestra "Devuelto", el detalle del pago muestra la devolución y el saldo a favor de la ocupación baja **(C4)**; (5) un monto mayor a lo devolvible muestra el `title` de `devolucion_supera_pago`, recarga los datos y deja el diálogo abierto con el monto marcado **(C2)**; (6) si el saldo a favor supera lo devolvible de un pago, tras la primera devolución se ofrece "Registrar otra devolución" con el pago siguiente; (7) "Devolver" en el detalle de un pago PAGADO con algo devolvible abre el diálogo con ese pago elegido y sin selector; en un pago anulado o ya devuelto del todo no se ve; (8) desde una alerta `DEVOLUCION_PENDIENTE`, "Ver ocupación" abre el detalle y desde ahí se llega a la devolución; tras una devolución que deja el saldo a favor en 0, la alerta se ve resuelta sola (`resolucionAutomatica`); tras una parcial sigue abierta y el aviso dice "Queda $ X de saldo a favor por devolver" **(C5)**; (9) un pago ya anulado desde otra pestaña muestra el `title` de `pago_anulado`, cierra el diálogo y recarga **(C2)**; (10) devolver con saldo a favor 0 (desde el detalle de un pago) o con un monto mayor al saldo a favor muestra el aviso "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo" y **no bloquea el envío**; el límite lo pone el pago (`devolucion_supera_pago`) **(C2, C4)**; (11) desde el detalle de un pago se puede devolver sobre una ocupación finalizada o cancelada, con o sin saldo a favor **(C2)**. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Documentación y cierre

- [ ] **6.1** Corregir en `CLAUDE.md` **solo** la frase que dice que `pagosApi.js` sigue con su manejo de errores propio; **no** tocar la línea "Backend endpoints used".
- [ ] **6.2** Crear `docs/manual/frontend/08-pagos.md`: la lista de pagos, el detalle y su historial, anular (y qué pasa con otra sesión de caja), devolver (el flujo de la devolución pendiente y cómo se elige el pago), la tabla de permisos, qué hace cada `code` de error, el export `pagosApi` temporal y lo que le queda a la 09.
- [ ] **6.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; una búsqueda de `e.response.data.error`, `toLocale` y `http.` en `src/componentes/pagos/` no da coincidencias; `git diff develop -- src/pages/CajaDiaria.jsx src/pages/OperationalDashboard.jsx src/pages/Ocupaciones.jsx eslint.config.js` vacío; `git diff develop -- src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` solo toca la sección "Pagos" y el aviso de saldo a favor; `git diff develop -- CLAUDE.md` solo cambia la frase de `pagosApi.js`.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Abrir el detalle de una ocupación con pagos, con `dueno@demo.test` | `GET /Pagos/ocupacion/{id}` responde 200; la tabla muestra fecha (zona del local), método, monto, devuelto, estado y referencia |
| 3 | Pago anulado y pago con devoluciones | El anulado se ve atenuado con chip "Anulado"; el devuelto muestra la columna "Devuelto"; la lista no suma nada |
| 4 | Abrir un pago | `GET /Pagos/{id}` con historial y devoluciones; "Ver trazabilidad" solo con `dueno` y abre `/trazabilidad?pagoId=N` |
| 5 | Anular un pago con motivo, y sin motivo | `PATCH …/anular` con `{ motivo }`; sin motivo no llega a la red; el pago queda "Anulado" y las cifras de la ocupación se actualizan |
| 6 | Anular con `encargado@demo.test` un pago de otra sesión de caja | El `title` de `sin_permiso`, diálogo abierto con el motivo escrito (el 403 puede tapar `pago_anulado`, `pago_con_devoluciones` y `caja_cerrada`, C1); con `dueno@demo.test` se anula |
| 7 | Ocupación con saldo a favor: "Registrar devolución" con `dueno@demo.test` | Diálogo con pagos devolvibles, pago preseleccionado, monto precargado; `POST …/devoluciones` con `{ monto, metodo, motivo }`; el saldo a favor baja |
| 8 | Devolver más de lo devolvible | `title` de `devolucion_supera_pago`; recarga; el diálogo queda abierto con el monto marcado |
| 9 | Saldo a favor mayor que lo devolvible de un pago | "Registrar otra devolución" con el pago siguiente |
| 10 | `encargado@demo.test` y `operado@demo.test` | El encargado ve "Anular pago" y no "Devolver"; el operador no ve ninguno de los dos; ninguno ve "Ver trazabilidad" |
| 11 | Alerta `DEVOLUCION_PENDIENTE`, "Ver ocupación" | Abre el detalle de la ocupación, con el botón de devolución |
| 12 | Backend apagado, con el detalle abierto | "No pudimos cargar los pagos" con "Reintentar"; el resto del detalle no se vacía |
| 13 | `git diff develop -- src/pages/CajaDiaria.jsx src/pages/OperationalDashboard.jsx src/pages/Ocupaciones.jsx eslint.config.js` | Vacío |
| 14 | `CajaDiaria.jsx` compila y carga (aunque el backend le dé 404) | Sin error de importación: el export `pagosApi` temporal existe |
| 15 | Anular un pago de una ocupación FINALIZADA | Aviso "La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro"; tras anular, la ocupación muestra saldo y sigue finalizada |
| 16 | Devolver con saldo a favor 0 o con un monto mayor | Aviso "No hay saldo a favor (o el monto lo supera)…", sin bloquear; el límite es el devolvible del pago |
| 17 | Devolución parcial y devolución total sobre una alerta `DEVOLUCION_PENDIENTE` | La parcial deja la alerta abierta (con el mensaje original, PB-13) y el aviso "Queda $ X…"; la que deja el saldo a favor en 0 la resuelve sola |
| 18 | El 403 de anular tapa otros códigos | Con un no dueño y un pago de otra sesión ya anulado, se ve `sin_permiso` y no `pago_anulado` (C1, PB-12) |

**No verificable con los usuarios demo:** el rol `AUDITOR` (P-FA9; lo cubren los tests de `accionesDePago`), una anulación entre sesiones si no hay datos con un pago de otra sesión (P-FH7), y el comportamiento de la alerta `DEVOLUCION_PENDIENTE` si el backend de pruebas no la genera (C5).

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). **Todas las decisiones D-FH (1 a 15) están Confirmadas.** El desarrollador respondió las cinco preguntas de producto (tabla compacta, diálogo de detalle, un solo diálogo de devolución con dos entradas, nota fija y avisos al anular y al devolver, sin pantalla de Pagos) y aprobó el export `pagosApi` temporal; el comportamiento del backend (C1 a C9) está relevado en la sección 2.2 y los pedidos PB-11 a PB-14 quedaron aprobados. Sin pendientes que frenen la ejecución.

**Condición de arranque:** la 02, la 04, la 05 y la 07 implementadas y mergeadas en `develop`, y esta spec aprobada y mergeada. Hasta entonces no se crea el worktree.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-pagos` (rama `feature/front-pagos`), creado desde `develop`. Un chat por bloque:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 2 | Sonnet | bajo | Lógica pura y módulo de API con una tabla de casos. Si P-FH-L1 o P-FH-L3 no dan, **frena** y avisa al Orquestador: no implementa nada de las otras specs ni cambia `enums.js` |
| B | 3 | Sonnet | medio | Lista, detalle y montaje en el detalle de la ocupación. Si la forma de `OcupacionDetalleDialog` no permite montar la sección sin rehacerlo, **frena** |
| C | 4 y 5 | Sonnet | medio–alto | Anular y devolver: es plata. Si la respuesta a C1 a C7 cambia el flujo de D-FH6 o D-FH7, **frena** y se sube a Opus con esfuerzo alto |
| D | 6 | Haiku | bajo | Manual y cierre; sin decisiones |

**Prompt para cada chat de ejecución** (cambiar `PASOS` por "0 a 2", "3", "4 y 5" o "6"):

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-pagos` (rama `feature/front-pagos`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/specs/frontend/04-trazabilidad.md` (solo D-FD5), `docs/specs/frontend/07-ocupaciones.md` (solo D-FG4, D-FG5, D-FG7, D-FG13, D-FG17, D-FG18 y D-FG19), `docs/inventario/backend.md` (secciones `/Pagos`, `/Ocupacion`, `/Caja`, `/operational-alerts`, 3, 4 y 5) y `docs/specs/frontend/08-pagos.md`. Ejecutá **los pasos PASOS** de la 08, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FH-L1: si la 02, la 04, la 05 o la 07 no están implementadas en `develop`, frená; y si la spec todavía tiene decisiones en Propuesta sin confirmar, frená y avisá. **Regla de ruteo (obligatoria): no corras comandos de terminal y no le preguntes nada al usuario en tu chat. Las preguntas de producto, las dudas sobre el backend, los avisos, los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, y las decisiones que la spec no prevé van al chat "Orquestador" por SendMessage, con la opción que recomendás y las alternativas con su costo. Esperá su respuesta. Las dudas del backend las releva el Orquestador en el código: no supongas reglas de negocio.** Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md` salvo la frase del paso 6.1. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 0 a 2 y Haiku para el 6 (tablas de casos y decisiones tomadas). Sonnet con esfuerzo medio para el paso 3, y medio–alto para los 4 y 5, que anulan y devuelven plata. Se sube a Opus únicamente si aparece una decisión que la spec no previó (por ejemplo, que las respuestas C1 a C7 cambien cómo se determina "otra sesión de caja", que una devolución dependa de la sesión, o que el backend cambie contra qué compara `devolucion_supera_pago`).
