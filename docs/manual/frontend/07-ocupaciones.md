# Manual — 07 Ocupaciones

> Cómo funciona la pantalla de Ocupaciones: listado, detalle, alta, finalizar, cancelar reserva y registrar pago. Spec: `docs/specs/frontend/07-ocupaciones.md`. Backend: `docs/inventario/backend.md`, sección `/Ocupacion` y `/Pagos`; código: `Service/OcupacionService.cs`, `Service/CuentaDeOcupacion.cs`, `Service/CalculadoraDeCobro.cs`, `Controllers/OcupacionController.cs`.

## Resumen

`/ocupaciones` lista las ocupaciones con filtros y tarjetas (fase, cliente, fechas en la zona del local, cuenta). "Ver" abre un detalle sobre el listado (`/ocupaciones?id=N`). Con permiso se puede crear una ocupación (abierta, cerrada, futura, retroactiva o con tarifa excepcional), finalizarla (con resolución del excedente de un mensual), cancelar una reserva y registrar un pago. Todo lo que escribe se **oculta** (nunca se deshabilita) por permiso, y todos los errores se muestran con el `title` del backend (`showApiError`). El front **no calcula ninguna cifra de dinero**: total, tope, pagado, saldo y saldo a favor son del backend.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/ocupacionApi.js` | `listOcupaciones`, `getOcupacion`, `createOcupacion`, `cancelOcupacion`, `finalizeOcupacion` (con JSDoc de los tipos). La spec 10 suma acá el ajuste de precio y la baja programada |
| `src/api/clienteApi.js` | Solo `listClientes` (paginado, pasa por `normalizePaged`). `Clientes.jsx` no lo usa |
| `src/api/pagosApi.js` | Se sumó `createPago(body)` (`POST /Pagos`). El objeto `pagosApi` quedó intacto (lo usan `CajaDiaria.jsx` y la anulación); la spec 08 migra el archivo |
| `src/utils/ocupaciones.js` | Toda la lógica pura (ver abajo) |
| `src/utils/ocupacionLink.js` | `buildOcupacionPath`, `parseOcupacionId`, `buildAlertasDeOcupacionPath` |
| `src/auth/routes.js` | `OCUPACIONES_PATH` y `ALERTAS_PATH` (la ruta de alertas la reexporta `alertas.js`) |
| `src/componentes/ClienteAutocomplete.jsx` | Selector de cliente para el filtro y el alta: 300 ms de espera, descarta respuestas viejas, solo activos |
| `src/componentes/ocupaciones/` | `OcupacionDetalleDialog`, `AltaOcupacionDialog`, `FinalizarOcupacionDialog`, `CancelarReservaDialog`, `RegistrarPagoDialog` y `CuentaOcupacion` (la cuenta, que comparten el detalle y finalizar) |
| `src/pages/Ocupaciones.jsx` | Orquestador: filtros, carga, tarjetas, query `?id=`, qué hacer después de cada error |

`ocupaciones.js` no tiene React ni estado: `now`, la zona del tenant y `can` son parámetros. Los tests (`test/unit/utils/ocupaciones.test.js`) fijan `America/Montevideo` y `now = 2026-11-18T15:00:00.000Z`.

## La fase de una ocupación

El backend tiene `estado` (ACTIVA, CANCELADA, FINALIZADA) y `estadoCalculado` (suma VENCIDA), pero ninguno distingue una reserva de una ocupación en curso. `ocupacionFase(o, now)` usa `e = estadoCalculado ?? estado`:

| Fase | Condición | Chip |
|---|---|---|
| `cancelada`, `finalizada`, `vencida` | `e` es CANCELADA, FINALIZADA, VENCIDA | etiqueta y color de `EstadoOcupacion` |
| `reserva` | `e` es ACTIVA e `inicio > now` (estricto) | "Reserva", `secondary` |
| `en_curso` | `e` es ACTIVA e `inicio <= now` | "En curso", color de ACTIVA |

El reloj es el del navegador (se refresca cada minuto); el backend valida al finalizar (`ocupacion_no_iniciada`). La fase no se envía nunca.

## Listado y filtros

Por defecto "Activas" (en curso, reservas y vencidas). Como `estado=ACTIVA` **no** incluye las vencidas, "Activas" hace **dos pedidos en paralelo** (`estado=1` y `estado=2`) y los une con `mergeOcupaciones` (`inicio` descendente, `id` descendente, sin repetidos, cortado a `take`). Con "Vence en (días)" hace uno solo.

| Filtro | Qué manda |
|---|---|
| Estado | Activas (1 y 2), Reservas (`estado=1` y `desde = ahora`, o el más tardío si hay "Inicio desde"), Vencidas (2), Finalizadas (4), Canceladas (3), Todas (sin `estado`) |
| Cochera | `select` con `listCocheras()`, valor = id, rótulo "Cochera #número". Si la lista falla, queda deshabilitado sin aviso |
| Cliente | `ClienteAutocomplete`; manda `clienteId` |
| Vence en (días) | Entero de 0 o más. Activas con `Fin` entre ahora y ahora + N: **excluye vencidas y abiertas** |
| Inicio desde / Fin hasta | Días (`<input type="date">`) en la zona del tenant, con `dateRangeToInstants` (el `hasta` es inclusivo: termina en `…:59.999Z`). `desde` filtra por **`Inicio`** y `hasta` por **`Fin`**; **no es un filtro de solapamiento y con "Fin hasta" las abiertas quedan fuera** |
| Cantidad máxima | 50, 100, 200 (defecto) o 500. El backend recorta a 500 en silencio |

"Aplicar" valida (`buildListQueries`) y carga; "Limpiar" vuelve a los valores por defecto. Si algún pedido trae tantas filas como `take`, se avisa "Mostrando las primeras N. Puede haber más: refiná los filtros" (el backend no pagina ni da el total). Si la carga falla se ve "No pudimos cargar las ocupaciones" con "Reintentar", nunca una lista vacía. Las respuestas viejas se descartan (`ignore` en el efecto). Después de cualquier escritura se recarga el listado y el detalle abierto.

### La tarjeta

Línea 1: "Cochera #número", chip de fase, chip de tipo. Línea 2: cliente y fechas (reserva: "Empieza …"; si no "Inicio …"; "Fin …" o "Sin hora de fin"; finalizadas: "Fin real …"). Línea 3: la cuenta con `cuentaRotulos`: el tope se rotula **"Total del contrato"** (con fin), **"Hasta ahora (unidad en curso)"** (abierta) o **"Total"** (finalizada, con `precioTotal`); en una cancelada no se muestra. Después "Pagado" y "Saldo". Un total nulo se ve "—", nunca `$ 0,00`.

## El detalle (`/ocupaciones?id=N`)

`id` es un entero positivo; otro valor se ignora. "Ver" y el cierre usan `replace` (el cierre quita `id`): "atrás" no reabre el detalle y el enlace es compartible. Secciones: cabecera (fase, tipo, cochera), cliente, período, tarifa (chip "Tarifa excepcional" y motivo), **cuenta** (Total o "A definir al finalizar", el tope con su rótulo, Pagado, Saldo, chip "Saldo a favor $ X"; una vencida suma "No incluye la demora hasta que se finalice"; una finalizada o cancelada con saldo a favor suma "Hay un saldo a favor pendiente de devolver; se registra desde Pagos"), **contrato mensual** (solo MES: `modoMes` y `fraccionMes`, "congelados al crear"; **sin acciones**, la spec 10 agrega ahí el ajuste y la baja), **pagos** (vacía: el punto de montaje de `PagosSeccion` de la spec 08, con `ocupacion`, `can` y la recarga que expone la página) y enlaces.

Enlaces: "Ver trazabilidad" con `auditoria.ver` (`buildTrazabilidadPath({ ocupacionId })`) y "Ver alertas" con `alertas.ver` (`/alertas-operativas?ocupacionId=N`). Desde Alertas, "Ocupación N" pasa a ser un enlace a `/ocupaciones?id=N` si el usuario tiene `ocupaciones.ver` (`getAlertLinks(alerta, { canTrazabilidad, canOcupaciones })`).

## Alta

"Nueva ocupación" (con `ocupaciones.crear`) abre un diálogo único. El modo se deriva de lo cargado (`altaModo`): **Reserva** (inicio futuro), **abierta** (sin fin) o **cerrada**; una etiqueta lo dice.

- **Inicio**: por defecto el minuto actual del local. **"Sin hora de fin"**: tildada por defecto en Hora y Mes, destildada en Día (cambiar el tipo la reajusta solo si el usuario no la tocó). Tildada, `fin` **no se manda** (ocupación abierta).
- **Cochera**: `select` con las **disponibles** (`GET /Cochera/disponibles?desde&hasta`), que se vuelve a pedir con 400 ms de espera al cambiar inicio, fin o "sin fin". `hasta` es el fin o, en una abierta, el inicio + 3650 días (el solape de una abierta es `[inicio, ∞)`, B6). Si la elegida deja de estar disponible, se limpia y se avisa.
- **Tarifa excepcional** (`ocupaciones.tarifa_excepcional`): interruptor con precio (`^\d+(\.\d{1,2})?$`, mayor que 0, hasta 10.000.000) y motivo obligatorio (máximo 250). Sin el permiso el interruptor no se ve.
- **Motivo del inicio retroactivo** (`ocupaciones.crear_retroactiva`): se ve si el inicio es anterior al minuto actual, o si el backend ya marcó ese campo. El front **no conoce la tolerancia**, así que no lo exige: si falta, el backend contesta 400 con `errors.MotivoRetroactivo` y el campo aparece marcado.
- **No se valida configuración (D-FG9)**: ni tolerancia, ni tope de pasado, ni techo de futuro, ni duración máxima (HORA 7 días, DÍA 90, MES 3 años). Un inicio de hace un año o un fin a diez años llegan al backend, que responde con su `title` y marca "Inicio" o "Fin".
- Un OPERADOR (sin `crear_retroactiva`) con un inicio retroactivo recibe 403 `sin_permiso` **antes** que cualquier 400 (`OcupacionController.cs:39-41`): el aviso queda marcado en "Inicio".

Éxito (200, no 201): "Ocupación creada", cierre y recarga.

## Finalizar y el excedente de un mensual

"Finalizar" (fases `en_curso` y `vencida`, con `ocupaciones.finalizar`) abre un diálogo que pide `GET /Ocupacion/{id}` (datos frescos) y muestra la cuenta. **Siempre se finaliza primero sin cuerpo**: el excedente de un mensual (lo pagado neto supera lo devengado hasta la salida real) **no se puede conocer antes** de finalizar (`saldoAFavor` del detalle es `max(pagado − tope, 0)` y, con fin, el tope es el contrato entero).

- **Hora y Día**: confirmación simple. Con excedente el backend fuerza `DEVOLVER` y crea la alerta `DEVOLUCION_PENDIENTE` por su cuenta.
- **Mes con excedente**: el backend responde 400 `datos_invalidos` con `errors.ResolucionExcedente`. **No hay toast**: el diálogo pasa, sin cerrarse, al paso "Resolver el excedente", con el texto del backend (que trae los montos; no se parsea) y **ninguna opción preseleccionada**: "Cobrar completo" (`COBRAR_COMPLETO` = 1; **motivo obligatorio**, máximo 250; el excedente queda como total) o "Devolver" (`DEVOLVER` = 2; motivo opcional). Se reenvía el finalizar con `{ resolucionExcedente, motivo? }`.
- El texto con los montos está en **`errors.ResolucionExcedente[0]`**, no en el `title` (el `title` de un 400 de campo es el genérico "Hay datos inválidos en el pedido."; `ExceptionMiddleware.cs:84-96`). `resolutionMessage` lo toma de ahí (DV-FG4).
- `DEVOLVER` **no crea la devolución**: deja la ocupación FINALIZADA y crea la alerta; la devolución se hace después desde Pagos (spec 08). Se avisa "Quedó una devolución pendiente; registrala desde Pagos".
- Éxito (204): "Ocupación finalizada", cierre y recarga. Si queda saldo y hay `pagos.registrar`, la tarjeta y el detalle ofrecen "Registrar pago".

## Cancelar reserva

Solo en fase `reserva` y con `ocupaciones.cancelar`. El diálogo pide solo el **motivo** (obligatorio, `trim`, máximo 250) y avisa que la cochera queda libre. El cuerpo es `{ motivo }`: **no se manda `finReal`** (el backend lo ignora). Una ocupación en curso o vencida se finaliza, no se cancela (`ocupacion_ya_iniciada`). Si la reserva tiene pagos, avisa antes de confirmar "Tiene $ X pagados. Al cancelar queda una devolución pendiente; se registra desde Pagos" (el backend deja el saldo a favor y crea la alerta). Éxito (204): "Reserva cancelada" (con el mismo recordatorio si había pagos).

## Registrar pago

Con `pagos.registrar`, `saldo > 0` y ocupación no cancelada (una reserva y una vencida aceptan pagos hasta el tope). Campos: monto (precargado con el saldo, hasta 2 decimales, mayor que 0, hasta 10.000.000), método (Efectivo por defecto) y referencia (opcional; se omite si está vacía). Cuerpo `{ ocupacionId, monto, metodo, referencia? }`. **No se compara con el saldo**: si se pasa, el backend da `pago_supera_saldo`, la pantalla recarga y el diálogo queda abierto con el saldo nuevo. Éxito (201): "Pago registrado", cierre y recarga. Los códigos de caja (`caja_cerrada`, `caja_dia_anterior_abierta`) son de la spec 09: solo se muestra el `title`.

## Permisos

| Acción | Condición (`can`) |
|---|---|
| "Nueva ocupación" | `ocupaciones.crear` |
| Interruptor "Tarifa excepcional" | `ocupaciones.tarifa_excepcional` |
| "Motivo del inicio retroactivo" | `ocupaciones.crear_retroactiva` y un inicio anterior al minuto actual (o error del backend en el campo) |
| "Finalizar" | `ocupaciones.finalizar` y fase `en_curso` o `vencida` |
| "Cancelar reserva" | `ocupaciones.cancelar` y fase `reserva` |
| "Registrar pago" | `pagos.registrar`, `saldo > 0` y no cancelada |
| "Ver trazabilidad" | `auditoria.ver` |
| "Ver alertas" | `alertas.ver` |

La decisión de las tres acciones de la tarjeta y del detalle está en `accionesDeOcupacion(o, now, can)`. Un AUDITOR ve todo y ningún botón de escritura; un OPERADOR carga, finaliza, cancela y cobra, pero no ve el interruptor excepcional ni el motivo retroactivo.

## Qué hace cada `code` de error

El aviso lo muestra siempre `showApiError` (el `title` del backend). Después:

| `code` | Después del aviso |
|---|---|
| `datos_invalidos` | Marca el campo con el primer mensaje de `errors` (`fieldErrorsFromApi`). Sin recarga. En finalizar, `errors.ResolucionExcedente` no abre aviso: abre el paso de resolución |
| `sin_permiso`, `inicio_retroactivo_sin_permiso` | Marca "Inicio" (o el interruptor excepcional si estaba activo); el diálogo queda abierto |
| `tarifa_no_configurada` | Marca "Tipo"; con `tarifas.ver` suma el enlace "Ver tarifas" |
| `cochera_no_disponible`, `cochera_bloqueada` | Marca "Cochera", recarga las disponibles y el listado; el diálogo queda abierto |
| `cliente_inactivo` | Marca "Cliente" |
| `ocupacion_no_encontrada` | Recarga el listado y cierra el detalle y el diálogo |
| `ocupacion_no_activa`, `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_ya_iniciada`, `ocupacion_no_iniciada` | Cierra el diálogo de la acción y recarga listado y detalle |
| `pago_supera_saldo` | Recarga; el diálogo de pago queda abierto con el saldo nuevo |
| `caja_cerrada`, `caja_dia_anterior_abierta` | Solo el aviso (spec 09) |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Solo el aviso. El diálogo conserva lo escrito; el reintento es **manual** (una escritura no es idempotente) |

`shouldReloadAfter`, `shouldCloseDetailAfter` y `shouldCloseActionAfter` son puras. No se agregaron entradas a `errorCodes.js`.

## Lo que queda para otras specs

- **08 Pagos**: la sección "Pagos" del detalle (punto de montaje en `OcupacionDetalleDialog.jsx`), detalle de pago, devoluciones, anulación y migración de `pagosApi.js` (adopta `createPago`).
- **09 Caja**: sesiones y los códigos de caja.
- **10 Contratos mensuales**: ajuste de precio y baja programada; sus funciones se suman a `ocupacionApi.js` y sus botones a la sección "Contrato mensual".

## Verificación manual pendiente

Con el backend en marcha: que `GET /Cochera/disponibles` acepte `hasta = inicio + 3650 días` sin error (P-FG-L6) y que el 400 de finalizar sin resolución traiga `errors.ResolucionExcedente` y el de cobrar completo sin motivo `errors.Motivo` (P-FG-L7). Ambos se leyeron en el código del backend. Datos de prueba que hacen falta (P-FG7): una reserva futura, una vencida, un mensual con pagos mayores a lo devengado, una retroactiva y una con tarifa excepcional.
