# Manual — 08 Pagos

> Cómo funcionan la lista de pagos de una ocupación, el detalle de un pago, la anulación y las devoluciones. Spec: `docs/specs/frontend/08-pagos.md`. Backend: `docs/inventario/backend.md`, secciones `/Pagos`, `/Ocupacion`, `/Caja` y `/operational-alerts`; código: `Controllers/PagosController.cs`, `Service/PagoService.cs`, `Service/CuentaDeOcupacion.cs`, `Service/AlertaDevolucionPendiente.cs`.

## Resumen

No hay pantalla de Pagos (el backend no tiene un listado general: D-FH8). Los pagos se ven y se operan desde el **detalle de la ocupación** (`/ocupaciones?id=N`): una tabla con los pagos, un diálogo con el detalle de cada uno, y desde ahí se anula o se devuelve. Todo lo que escribe se **oculta** (nunca se deshabilita) por permiso y todos los errores se muestran con el `title` del backend (`showApiError`). El front **no calcula ninguna cifra de dinero**: el pagado neto, el saldo y el saldo a favor son del backend y se recargan después de cualquier escritura. La única aritmética del cliente (`moneyToCents`) sirve para precargar y comparar sin errores de coma flotante.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/pagosApi.js` | `createPago`, `listPagosByOcupacion`, `getPago`, `anularPago`, `createDevolucion` (con JSDoc de los tipos) (el export `pagosApi` `@deprecated` lo retiró la spec 09) |
| `src/utils/pagos.js` | Toda la lógica pura (ver abajo) |
| `src/componentes/pagos/PagosSeccion.jsx` | Tabla de pagos de la ocupación; abre el detalle con un clic |
| `src/componentes/pagos/PagoDetalleDialog.jsx` | Detalle de un pago, con las acciones y el enlace a Trazabilidad. Se abre con solo un `pagoId` |
| `src/componentes/pagos/AnularPagoDialog.jsx` | Motivo, avisos y `anularPago` |
| `src/componentes/pagos/DevolucionDialog.jsx` | Una sola pieza con dos entradas; elige el pago, precarga y registra |
| `src/componentes/ocupaciones/OcupacionDetalleDialog.jsx` | Monta `PagosSeccion` (con `pagos.ver`) y el botón "Registrar devolución" (con `pagos.devolver` y saldo a favor); solo esos dos puntos |

`pagos.js` no tiene React ni estado: `can` es un parámetro. Los tests (`test/unit/utils/pagos.test.js`) siguen la tabla de casos de la spec (1 a 37) y no dependen de la hora ni de la zona.

## La lista de pagos

`PagosSeccion` pide `GET /Pagos/ocupacion/{id}` al abrir el detalle (con esqueleto). Columnas: Fecha (`formatInstant`, zona del tenant), Método, Monto, Devuelto (solo si es mayor que 0), Estado (chip `Pagado` o `Anulado`) y Referencia; en pantallas angostas quedan Fecha, Monto y Estado. Los **anulados** se ven atenuados y con el monto tachado. **La lista no suma nada.** El backend ordena por `fechaPago` descendente sin desempate (C8) y `sortPagos` agrega `id` descendente. Incluye los anulados; una ocupación inexistente da `[]`. Sin pagos: "Todavía no hay pagos". Si falla: "No pudimos cargar los pagos" con "Reintentar", sin vaciar el detalle. Un clic en una fila abre el detalle del pago. Sin `pagos.ver` la sección no se monta.

## El detalle de un pago

`PagoDetalleDialog` (`{ pagoId, onClose, onChanged?, ocupacion? }`) carga `GET /Pagos/{id}` y muestra: cabecera (estado y "Ocupación #N"), importes, quién lo registró, **historial** (cronológico: `PAGADO` sin motivo, `ANULADO` con motivo) y **devoluciones** (ascendentes por `id`, con monto, método, fecha, usuario y motivo; sin ellas, "Sin devoluciones"). Los dos se muestran en el orden en que llegan. Decide sus acciones con `usePermissions()` y `accionesDePago`; no recibe `can`.

- **Usuarios.** El backend manda solo `usuarioId` (y `registradoPorUsuarioId`), nunca el nombre (C6). `usuarioLabel(usuarioId, me.usuarioId)` muestra "Vos" si es el de la sesión, "Usuario #id" si no, y "—" sin id. No se pide `/Usuarios` ni `/Trazabilidad` (el OPERADOR no tiene `usuarios.ver`). Pedido al backend: PB-14.
- **"Ver trazabilidad"**: solo con `auditoria.ver`, con `buildTrazabilidadPath({ pagoId })`.
- **Contrato con la spec 09**: se abre con solo `{ pagoId }`. Si necesita la ocupación (aviso de anular una finalizada) la pide con `getOcupacion(pago.ocupacionId)`; si se la pasan, la usa. `onChanged` es opcional. Un 404 `pago_no_encontrado` al cargar avisa, pide recargar y se cierra.
- Después de anular o devolver se recarga el pago, la lista y el detalle de la ocupación (y, por `onChanged`, el listado de `/ocupaciones`).

## Anular un pago

Botón "Anular pago" con `pagos.anular`, pago PAGADO y **sin devoluciones** (`montoDevuelto` en 0). Con devoluciones el botón no está y el detalle dice "Tiene devoluciones; no se puede anular" (`pago_con_devoluciones`, C7: una devolución no se puede revertir). El diálogo pide solo el **motivo** (obligatorio con `trim`, 250 como máximo; `buildAnularBody`), muestra monto y método y avisa:

- "Al anular, el pago deja de contar en la cuenta de la ocupación".
- Si la ocupación está FINALIZADA (`anulacionAviso`): "La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro" (C4: sube el saldo sin reabrirla). No se calcula ningún monto.
- **Nota fija**: "Si el pago es de otra sesión de caja (o no hay caja abierta), solo puede anularlo un dueño".

**Otra sesión de caja (C3).** El backend compara la sesión del pago con la única sesión abierta; sin sesión abierta todo pago cuenta como "de otra sesión". `PagoResponse` no trae `cajaSesionId`, así que el cliente no puede saberlo de antemano (PB-11) y por eso la nota. Un ENCARGADO tiene `pagos.anular` pero no `pagos.devolver`: puede anular los pagos de su sesión; en otra sesión recibe 403 `sin_permiso` (en modo DIARIA nunca puede anular un pago de un día anterior). Con el 403 (o con `anulacion_requiere_dueno`, solo por una carrera) se muestra el `title` y **el diálogo queda abierto con el motivo escrito**, sin recarga. La anulación se registra en la sesión **actual**, no en la del pago.

**Ojo: el 403 puede tapar otros códigos (C1).** El controller evalúa "otra sesión" antes del 404 y de los 409, así que para un no dueño con un pago de otra sesión `sin_permiso` tapa `pago_anulado`, `pago_con_devoluciones` y, en TURNO con la caja cerrada, `caja_cerrada`. El cliente no hace nada especial (muestra el `title`, no recarga); el pedido PB-12 propone ordenarlo mejor.

## Devolver: la devolución pendiente

El backend **no devuelve la plata** por su cuenta: al finalizar un mensual con `DEVOLVER`, o al cancelar una reserva con pagos, deja `saldoAFavor > 0` y crea la alerta `DEVOLUCION_PENDIENTE`. La devolución se registra con `POST /Pagos/{id}/devoluciones` y es **por pago**. `DevolucionDialog` tiene dos entradas:

| Entrada | Dónde | Condición | Pago |
|---|---|---|---|
| Saldo a favor | Botón "Registrar devolución" debajo de la "Cuenta" del detalle de la ocupación | `pagos.devolver` y `saldoAFavor > 0` | Se elige: lista los PAGADOS con algo devolvible (`pagosDevolvibles`) y preselecciona el más reciente que cubre el saldo a favor (`elegirPagoParaDevolver`), o el más reciente |
| Detalle de un pago | Botón "Devolver" | `pagos.devolver`, PAGADO y algo devolvible (aunque el saldo a favor sea 0) | Ese pago, sin selector |

Desde una alerta `DEVOLUCION_PENDIENTE` se llega por "Ver ocupación" (spec 07) al detalle, donde está la primera entrada.

**Campos.** Monto (precargado con el menor entre el saldo a favor y lo devolvible del pago, `montoInicialDevolucion`; hasta 2 decimales, mayor que 0, hasta 10.000.000), Método (por defecto el del pago; puede diferir) y Motivo (obligatorio, 250). Cuerpo `{ monto, metodo, motivo }`. Elegir otro pago vuelve a proponer monto y método.

**El límite lo pone el pago, no el saldo a favor (C2).** `devolucion_supera_pago` compara solo contra lo que queda por devolver del pago y el backend deja devolver sobre cualquier estado de ocupación. Por eso el cliente **no bloquea**: avisa (`devolucionAviso`) "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo" (devolver sube el saldo de una activa o de una finalizada con precio fijo, C4) y deja enviar. Si el diálogo se abre desde un pago y no se puede cargar la ocupación, no hay aviso y se precarga lo devolvible.

**Varias devoluciones.** Después de cada éxito se muestra "Devolución registrada" y se vuelve a pedir la ocupación: si el saldo a favor sigue siendo mayor que 0 aparece "Queda $ X de saldo a favor por devolver" (X, tal como lo manda el backend) y "Registrar otra devolución" con el pago siguiente; si no, el diálogo se cierra. **La alerta `DEVOLUCION_PENDIENTE` se resuelve sola solo cuando el saldo a favor queda en 0** (`resolucionAutomatica = true`; C5): una devolución parcial no la resuelve y su mensaje sigue con el monto original (PB-13).

## Permisos

| Acción | Condición (`can`) |
|---|---|
| Ver la sección "Pagos" y abrir un pago | `pagos.ver` |
| "Anular pago" | `pagos.anular`, pago PAGADO y sin devoluciones |
| "Registrar devolución" (ocupación) | `pagos.devolver` y `saldoAFavor > 0` |
| "Devolver" (pago) | `pagos.devolver`, PAGADO y devolvible mayor que 0 |
| "Ver trazabilidad" | `auditoria.ver` |

Con la matriz del backend: el DUENO hace todo; el ENCARGADO ve y anula, no devuelve; el OPERADOR ve y registra pagos (spec 07) pero no anula ni devuelve; el AUDITOR solo ve. La decisión por pago está en `accionesDePago(pago, can)`.

## Qué hace cada `code` de error

El aviso lo muestra siempre `showApiError` (el `title` del backend). Después:

| `code` | Después del aviso |
|---|---|
| `datos_invalidos` | Marca el campo con el primer mensaje de `errors` (`Motivo`; `Monto`, `Metodo` y `Motivo` al devolver). Sin recarga |
| `operacion_invalida` | Solo el aviso |
| `pago_no_encontrado` | Cierra la acción y el detalle del pago, y recarga la lista |
| `pago_anulado` | Cierra la acción y recarga lista y detalle |
| `pago_con_devoluciones` | Cierra la acción y recarga el detalle del pago |
| `devolucion_supera_pago` | Recarga el pago y la ocupación; el diálogo **queda abierto** con lo devolvible nuevo y el monto marcado con el `title` |
| `sin_permiso`, `anulacion_requiere_dueno` | Solo el aviso; el diálogo queda abierto con lo escrito, sin recarga |
| `caja_cerrada`, `caja_dia_anterior_abierta` | Solo el aviso (spec 09); el diálogo queda abierto |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Solo el aviso. El diálogo conserva lo escrito; el reintento es **manual** (una escritura no es idempotente) |
| Desconocido o `undefined` | Solo el aviso |

`shouldReloadAfterPago`, `shouldCloseActionAfterPago`, `shouldCloseDetailAfterPago` y `pagoErrorField` son puras. No se agregaron entradas a `errorCodes.js`. Orden del backend en anular (C1): policy → 400 `Motivo` → 403 "otra sesión" → 404 → `pago_anulado` → `pago_con_devoluciones` → caja → `anulacion_requiere_dueno`. En devolver (C2): policy → 400 → 404 → `pago_anulado` → `devolucion_supera_pago` → caja.

## `pagosApi.js` y la compatibilidad temporal

El archivo está en el estilo de funciones (D-FB14): devuelven `data`, no capturan errores y no convierten fechas ni enums. `listPagosByOcupacion` lanza `ApiError` con `respuesta_invalida` si la respuesta no es un arreglo. El export `pagosApi` `@deprecated` (`getCajaDiaria`, `anular`) que la 08 dejó para `CajaDiaria.jsx` **se retiró con la spec 09**, que reemplazó esa pantalla (ver `docs/manual/frontend/09-caja.md`).

## Lo que queda para otras specs

- **09 Caja**: sesiones, `CajaDiaria.jsx`, `getCajaDiaria`, los avisos de caja cerrada; abre `PagoDetalleDialog` con solo `pagoId` desde los movimientos de una sesión.
- **Pedidos al backend** (no frenan): PB-11 (exponer la sesión del pago), PB-12 (ordenar el 403 de anular), PB-13 (actualizar `DEVOLUCION_PENDIENTE` tras una devolución parcial), PB-14 (nombre del usuario en historial y devoluciones).

## Verificación manual pendiente

Con el backend en marcha y los usuarios `dueno@`, `encargado@` y `operado@demo.test` (spec, sección 7): que la lista, el detalle, anular, devolver y "Registrar otra devolución" funcionen como se describe; el 403 de un encargado sobre un pago de otra sesión; el aviso de una ocupación finalizada; `devolucion_supera_pago` con el diálogo abierto; y la alerta `DEVOLUCION_PENDIENTE` (resuelta sola con la devolución total, abierta con la parcial). Hace falta carga de datos de prueba (P-FH7): una ocupación con saldo a favor, un pago de otra sesión, uno anulado y uno parcialmente devuelto. Verificado en código del backend (no en marcha): que `metodo` y `estado` salgan como enteros y `montoDevuelto` como número (no hay conversor de enums a texto en `Program.cs`).
