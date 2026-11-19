# Brechas entre el front y la API (18/11/2026)

Cruce de [backend.md](backend.md) con el código de `src/`. Prioridad acordada: primero conectar la funcionalidad del backend, después aplicar el diseño nuevo.

## 1. Roto hoy (el front llama a algo que ya no existe o manda algo que el backend rechaza)

| Problema | Dónde | Efecto |
|---|---|---|
| Instantes en la zona del navegador, no en la del tenant: `new Date(x).toISOString()` | `Ocupaciones.jsx` (filtros, alta y `finReal` del cancelar: l. 152, 153, 252, 253 y 310 en `develop`), `Auditoria.jsx` | No falla (lleva `Z`), pero la hora se corre si la PC tiene otra zona. En Ocupaciones lo arregla de forma mínima la spec 02 (D-FB10). El 400 por instantes sin zona lo producían cambios sin commitear, hoy en `wip/ocupaciones-reservas` (DV-FB1 de la spec 02) |
| "Hoy" calculado en UTC: `new Date().toISOString().slice(0,10)` | `CajaDiaria.jsx:30`, `OperationalDashboard.jsx:25` | Entre las 21:00 y las 24:00 de Uruguay da el día siguiente |
| `vigenteDesde` enviado como instante ISO; el backend espera `DateOnly` (`yyyy-MM-dd`) | `Tarifas.jsx:139` | 400 o fecha mal interpretada |
| `TIPO_ALERTA` 1–4 no coincide con el enum del backend (ej.: el front dice 1 = "Ocupación finalizada sin pago", el backend 1 = `OCUPACION_VENCIDA_SIN_PAGO`) | `src/constants/operationalAlerts.js` | Etiquetas de alerta equivocadas; además faltan los tipos 5–12 |
| `GET /Pagos/caja-diaria` retirado | `pagosApi.js`, `CajaDiaria.jsx` | Pantalla de caja sin datos (404) |
| `GET /Tarifa/activas` retirado, `TarifaResponse` sin `activa` | `Tarifas.jsx` | Pantalla de tarifas sin datos (404) |
| `GET /Auditoria` retirado | `Auditoria.jsx` | Pantalla de auditoría sin datos (404) |
| `GET /operational-alerts` ahora paginado | `operationalAlertsApi.js`, `OperationalAlerts.jsx`, `OperationalDashboard.jsx` | Listado vacío si se espera un array |
| Alta de ocupación exige `fin` en el front; el backend lo permite opcional | `Ocupaciones.jsx:305` | No se pueden crear ocupaciones abiertas |

## 2. Cambiado (funciona a medias)

- **Ocupaciones**: faltan `finReal`, `topeDeCobro`, `pagado`, `saldo`, `estadoCalculado`, `saldoAFavor`; `precioTotal` puede ser `null`; falta `motivoRetroactivo` y el control de permisos `crear_retroactiva`/`tarifa_excepcional`; finalizar con `resolucionExcedente`. Además maneja errores a mano y muestra todas las acciones (pendiente de etapa 2).
- **Pagos**: `PagoResponse` trae `montoDevuelto`; anular requiere `pagos.devolver` si el pago es de otra sesión. `pagosApi.js` sigue con manejo de errores propio.
- **Alertas**: `esDeDinero`, comentario obligatorio y permiso `alertas.resolver_dinero`; el PATCH devuelve la alerta; tipos 5–12 nuevos y 4 retirado en `src/constants/operationalAlerts.js`; filtros nuevos.
- **Cocheras**: `estado` puede ser `OCUPADA`/`RESERVADA`; faltan alta por rango y editar número/nota.

## 3. Nuevo en el backend, sin pantalla en el front

- **Caja con sesiones** (`/Caja`): abrir, cerrar con arqueo, reabrir, sesión actual, historial de sesiones, esperado por método.
- **Pagos**: detalle con historial y **devoluciones**.
- **Contratos mensuales**: ajuste de precio individual y en lote, baja programada (`PUT /Ocupacion/{id}/fin`).
- **Configuración del tenant** (`/Configuracion`).
- **Usuarios** (`/Usuarios`): invitar, reenviar invitación, cambiar rol, desactivar y reactivar.
- **Cocheras disponibles** por rango (`/Cochera/disponibles`) para el alta de ocupación.

## 4. Sin cambios

`/me`, `/Cliente` (paginado, ya lo usa así), `/Panel/resumen`.

## 5. Specs propuestas (pendiente de aprobación)

Una spec por bloque, cada una en `docs/specs/frontend/NN-tema.md` y con rama propia. El orden respeta las dependencias.

| # | Spec | Depende de | Arregla |
|---|---|---|---|
| 02 | **Base común**: fechas (instante con zona / `DateOnly` / zona del tenant), mapas de todos los enums, helper de `PagedResponse`, módulos `src/api/` por recurso | — | El 400 por fechas en todo el front |
| 03 | Tarifas con vigencia | 02 | `/activas` retirado |
| 04 | Trazabilidad (reemplaza Auditoría) | 02 | `/Auditoria` retirado |
| 05 | Alertas operativas paginadas y alertas de dinero | 02 | Listado paginado, resolución |
| 06 | Cocheras: alta por rango, edición, estados calculados | 02 | — |
| 07 | Ocupaciones: alta abierta o retroactiva, detalle con saldo, finalizar con excedente, errores por `code` y permisos | 02, 04, 05, 06 | Etapa 2 pendiente |
| 08 | Pagos: lista de la ocupación, detalle, anulación y devoluciones | 02, 04, 05, 07 | Etapa 2 pendiente |
| 09 | Caja con sesiones (reemplaza Caja diaria) | 02, 08 | `/caja-diaria` retirado |
| 10 | Contratos mensuales: ajuste de precio y baja programada | 07 | — |
| 11 | Configuración del tenant | 02 | — |
| 12 | Usuarios | 02 | — |

Las specs 03 a 06, 11 y 12 son independientes entre sí después de la 02 y se pueden ejecutar en paralelo.

### Pedidos al backend

Hallados durante la redacción de las specs del front. Ninguno bloquea al front.

| Id | Pedido | Origen | Prioridad |
|---|---|---|---|
| PB-1 | `/Trazabilidad`: filtrar por `entidad` + `entidadId`, para recuperar la historia de un Cliente, una Cochera o una Tarifa que daba `/Auditoria`. El usuario lo aprobó el 18/11/2026: el front sale sin ese filtro y lo suma en una spec futura | Spec 04, P-FD5 | Media |
| PB-2 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `/Trazabilidad`: que la acción `Finalizar` salga como `FINALIZAR`, como las demás. El front ya la normaliza | Spec 04, P-FD4 | Baja |
| PB-4 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** **Posible bug**: `CocheraService` calcula el estado con `DateTime.Now` en el listado y el detalle (`GetAllAsync` y `GetByIdAsync`), pero con `DateTime.UtcNow` en el cambio de estado y en las disponibles. Si el servidor no corre en UTC, el estado del listado puede no coincidir con el del PUT | Spec 06 (relevamiento) | Alta |
| PB-5 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `PUT /Cochera/{id}/estado`: validar la longitud de `nota` (≤300, como en `PUT /Cochera/{id}`), normalizar `""` a `null` y poner un tope a `historialTake` | Spec 06 (relevamiento) | Baja |
| PB-6 | `/Usuarios`: exponer si la invitación está pendiente (no aceptada), para ofrecer "Reenviar invitación" solo donde sirve. Hoy reenviar a quien ya aceptó manda el mail igual | Spec 12 (relevamiento) | Baja |
| PB-3 | `/operational-alerts`: un endpoint de resumen que devuelva los conteos de alertas abiertas por severidad y por tipo. Hoy el Monitor hace 8 pedidos de conteo cada 5 minutos | Spec 05, P-FE2 | Baja |
| PB-7 | `POST /Ocupacion/{id}/finalizar`: **problema:** el 400 `datos_invalidos` con `errors.ResolucionExcedente` trae los montos (lo pagado y lo que corresponde hasta la salida) solo dentro del texto del `title`. **Efecto en el front:** no se puede mostrar el excedente con formato ni usarlo; el front muestra el `title` tal cual y no lo parsea. **Propuesta:** que el 400 traiga el monto en un campo propio (extensions de `ProblemDetails`: `pagado`, `totalALaSalida`, `excedente`) | Spec 07, D-FG18 | Media |
| PB-8 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `OcupacionRequest.MotivoTarifaExcepcional`: **problema:** el DTO no tiene límite de largo pero la columna es de 250, así que un texto más largo probablemente da 500. **Efecto en el front:** limita a 250 en el cliente. **Propuesta:** agregar `[MaxLength(250)]` | Spec 07, D-FG16 | Media |
| PB-9 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `POST /Ocupacion/{id}/cancelar`: **problema:** `finReal` se acepta, se ignora y tiene un comentario engañoso en el código; el `motivo` es `[Required]` sin tope (con solo espacios falla: `[Required]` lo rechaza). **Efecto en el front:** no manda `finReal` y limita el motivo a 250. **Propuesta:** sacar `finReal` del contrato (o usarlo) y poner un tope y un `trim` al motivo | Spec 07, D-FG17 | Baja |
| PB-10 | `GET /Ocupacion`: **problema:** `take` se recorta a 500 sin avisar, no hay total ni paginación, y `saldoAFavor` no está en `OcupacionListItem`. **Efecto en el front:** no sabe si faltan resultados (avisa "Puede haber más" cuando llega al `take`) y solo ve el saldo a favor en el detalle. **Propuesta:** devolver el total (o paginar) y sumar `saldoAFavor` al ítem del listado | Spec 07, D-FG11, D-FG13 | Baja |

| PB-11 | `PagoResponse` y `PagoDetalle`: **problema:** ningún DTO expone la sesión de caja del pago (`cajaSesionId`) y el backend exige `pagos.devolver` para anular un pago "de otra sesión" (o con la caja sin abrir). **Efecto en el front:** no puede explicar de antemano por qué un encargado no puede anular un pago; muestra una nota fija y el `title` del 403. **Propuesta:** exponer `cajaSesionId` o un indicador `anulableSinDueno` | Spec 08, D-FH7 | Media |
| PB-12 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `PATCH /Pagos/{id}/anular`: **problema:** el 403 `sin_permiso` por "otra sesión" corre antes del 404 y de los 409, así que para un no dueño tapa `pago_anulado`, `pago_con_devoluciones` y `caja_cerrada`. **Efecto en el front:** el usuario ve "sin permiso" aunque el pago ya estaba anulado y la pantalla no se recarga. **Propuesta:** mover ese chequeo después de `pago_anulado`, `pago_con_devoluciones` y de caja. **Pendiente en el front:** el manejo del 409 `anulacion_requiere_dueno` queda sin uso (el backend lo retiró) y se puede quitar | Spec 08, D-FH10 | Media |
| PB-13 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** Alerta `DEVOLUCION_PENDIENTE`: **problema:** no se actualiza después de una devolución parcial (el mensaje y la huella siguen con el monto original; solo se resuelve sola al quedar `saldoAFavor` en 0). **Efecto en el front:** la alerta muestra un monto desactualizado. **Propuesta:** actualizar el monto del mensaje en cada devolución parcial | Spec 08, D-FH6 | Baja |
| PB-14 | `PagoDetalle.historial[]`, `PagoDetalle.devoluciones[]` y `registradoPorUsuarioId`: **problema:** traen solo `usuarioId`, sin nombre, y el OPERADOR no tiene `usuarios.ver`. **Efecto en el front:** muestra "Vos" o "Usuario #id". **Propuesta:** sumar el nombre del usuario a esos tres | Spec 08, D-FH5 | Baja |
| PB-15 | `GET /Caja/sesiones`: **problema:** el ítem (`CajaSesion`) no trae `fechaCierre` ni `diferencia`. **Efecto en el front:** el historial no puede mostrar "cerró con diferencia" sin abrir cada detalle; muestra #, estado, apertura y fondo inicial. **Propuesta:** sumar `fechaCierre?` y `diferencia?` al ítem del listado | Spec 09, D-FI9 | Baja |
| PB-16 | `GET /Caja/sesiones/{id}`: **problema:** `movimientos` viene completo, sin paginar ni tope. **Efecto en el front:** una sesión con miles de movimientos se muestra en una sola tabla con scroll. **Propuesta:** paginar o poner un tope a `movimientos` | Spec 09, D-FI10 | Baja |
| PB-17 | `CajaHistorial` y `CajaMovimiento`: **problema:** traen solo `usuarioId`, sin nombre, y el OPERADOR no tiene `usuarios.ver`. **Efecto en el front:** muestra "Vos" o "Usuario #id". **Propuesta:** sumar el nombre del usuario (como PB-14) | Spec 09, D-FI10 | Baja |
| PB-18 | `OcupacionDetalle`: **problema:** ningún endpoint devuelve el precio vigente ni los cambios de precio de un contrato mensual (`precioUnitarioAplicado` es el de partida; los ajustes van a `OcupacionesPrecio` y solo se leen en la Trazabilidad). **Efecto en el front:** la sección "Contrato mensual" rotula "Precio de partida" y, tras un ajuste, solo muestra el `precioAnterior` → `precioNuevo` de la respuesta. **Propuesta:** sumar `precioVigente` y `cambiosDePrecio[]` (`vigenteDesde`, `precio`, `motivo`) | Spec 10, D-FJ4 | Media |
| PB-19 | `GET /Ocupacion`: **problema:** no filtra por `tipo` y `OcupacionListItem` no trae el precio. **Efecto en el front:** el ajuste masivo trae hasta 500 ocupaciones activas y filtra los MES en el cliente, con riesgo de truncado. **Propuesta:** filtro `tipo` (y, si se puede, el precio en el ítem) | Spec 10, D-FJ8 | Baja |
| PB-20 | `POST /Ocupacion/ajuste-precio`: **problema:** no hay simulación; el lote es irreversible (la tabla de precios es append-only). **Efecto en el front:** no puede mostrar los precios nuevos antes de aplicar; compensa con un paso de revisión y una casilla obligatoria. **Propuesta:** `simular=true` (o un endpoint equivalente) que devuelva el mismo resultado sin escribir | Spec 10, D-FJ8 | Media |
| PB-21 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `POST /Ocupacion/{id}/precio` y `/ajuste-precio`: **problema (bug):** un ajuste a la baja puede dejar `saldoAFavor > 0` sin crear la alerta `DEVOLUCION_PENDIENTE` (solo la crean cancelar, finalizar con excedente y la baja programada). **Efecto en el front:** ninguno; el front no lo compensa. **Propuesta:** crear la alerta también después de un ajuste que deje saldo a favor | Spec 10, D-FJ7 | Baja |
| PB-22 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `PUT /Ocupacion/{id}/fin`: **problema (bug):** no valida que `fin` sea posterior a `inicio`; en una reserva futura se puede guardar un fin entre ahora e inicio. **Efecto en el front:** ninguno; el cliente no lo valida (es regla del backend). **Propuesta:** `fin > inicio` (400 `errors.Fin`) | Spec 10, D-FJ6 | Media |
| PB-23 | **Resuelto en la Tanda A del backend (PR #66 de Parking-Api, 19/11/2026).** `ocupacion_no_activa`: **problema:** el `title` dice "Solo se puede cancelar una ocupación ACTIVA" aunque lo dé la baja programada o el ajuste de precio. **Efecto en el front:** muestra un texto propio ("El contrato ya no está activo; recargá para ver su estado"), desvío de D-FA6 (DV-FJ3). **Propuesta:** un `title` genérico ("La ocupación no está activa."). **Pendiente en el front:** retirar el texto propio de DV-FJ3 y usar el `title` del backend | Spec 10, D-FJ10 | Baja |

### Contratos entre specs

**Enlace profundo a Trazabilidad** (lo define la 04, D-FD, en Propuesta). Lo usan la 05, la 07, la 08 y la 09.
- Se linkea siempre con `buildTrazabilidadPath(filtros)` de `src/utils/trazabilidadLink.js`, que crea la 04. Nunca se arma el string a mano.
- Ruta `/trazabilidad`, a confirmar por el usuario.
- Query params con los mismos nombres de la API: `ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId`, `fuente` (repetible por nombre) y `desde`/`hasta` como **`DateOnly`** en la zona del tenant. `page` y `pageSize` no van en la URL.
- Con `ocupacionId`, `pagoId` o `cajaSesionId`, la pantalla abre sin rango y busca sola. No hay filtro por `alertaId`: para una alerta se linkea por su `ocupacionId` o su `cajaSesionId`.
- El enlace se muestra **solo si `can("auditoria.ver")`** (DUENO y AUDITOR).
- Por ese helper, la 05, la 07, la 08 y la 09 se mergean después de la 04.

**`src/api/usuariosApi.js`** (confirmado por el orquestador, P-FD1 de la 04): la 04 lo crea **solo** con `listUsuarios()` (`GET /Usuarios`, devuelve `Usuario[]`, sin paginar). La 12 **agrega** sus funciones al mismo archivo y no lo recrea. La que se ejecute segunda usa lo que encuentre.

**`src/api/cocheraApi.js`** (lo propone la 06 y lo confirmó el orquestador): la 06 lo crea completo, con `listCocheras`, `getCochera`, `createCocheras`, `updateCochera`, `setEstadoCochera` y `listCocherasDisponibles({ desde, hasta })`. Esta última recibe los instantes ya convertidos y devuelve `{ id, numero }[]`, y es la que usa el alta de ocupación de la 07. La 07 **no** recrea el archivo. Si la 07 se ejecuta antes que la 06, usa lo que encuentre.

**Contratos de la 07** (aprobados el 18/11/2026; detalle en `docs/specs/frontend/07-ocupaciones.md`).
- **05 ↔ 07 (`getAlertLinks`)**: la 07 cambia la firma a `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones })` y suma un enlace "Ver ocupación" a `buildOcupacionPath(alerta.ocupacionId)` (con `can("ocupaciones.ver")`). `OperationalAlerts.jsx` pasa el flag nuevo. Cierra P-FE1 en lo que toca a Ocupaciones; lo de Caja sigue siendo de la 09.
- **URL de una ocupación**: `/ocupaciones?id=N` abre el detalle sobre el listado. Se enlaza siempre con `buildOcupacionPath(id)` de `src/utils/ocupacionLink.js`, nunca con un string armado a mano. `OCUPACIONES_PATH` se exporta desde `src/auth/routes.js`.
- **07 ↔ 08 (`pagosApi.js`)**: "Registrar pago" se queda en la 07 (`RegistrarPagoDialog`). La 07 solo **suma** `createPago(body)` a `pagosApi.js` y deja intacto el objeto `pagosApi` (lo usan `CajaDiaria.jsx` y la anulación). La 08 migra el archivo al estilo D-FB14, adopta `createPago` y es dueña de la lista de pagos de la ocupación, el detalle de pago, las devoluciones y la anulación; el detalle de la ocupación deja una sección "Pagos" vacía para que la monte. Al finalizar con `DEVOLVER` o cancelar una reserva con pagos, el backend crea la alerta `DEVOLUCION_PENDIENTE` y la devolución se registra en la 08.
- **07 ↔ 08 (`PagosSeccion` en el detalle de la ocupación)**: la 08 monta `PagosSeccion` en la sección "Pagos" de `OcupacionDetalleDialog` con las props `ocupacion` (con `id`, `saldo`, `saldoAFavor` y la fase), `can` y `onChanged()` (recarga el detalle abierto y el listado), y suma el botón "Registrar devolución" al aviso de saldo a favor. Solo edita esos dos puntos; no toca `RegistrarPagoDialog`, `FinalizarOcupacionDialog` ni `CancelarReservaDialog`. Si la 07 deja otra forma, el ejecutor de la 08 se adapta y lo anota (P-FH-L1).
- **08 ↔ 09 (`PagoDetalleDialog` con un `pagoId`)**: `PagoDetalleDialog` se abre con solo un `pagoId` (`{ pagoId, onClose, onChanged, ocupacion? }`; carga `getPago` y, si hace falta, `getOcupacion`). La 09 lo usa desde los movimientos de una sesión (`GET /Caja/sesiones/{id}` trae `pagoId` y, en las anulaciones, `dePagoDeOtraSesion`). La 08 no toca la Caja y deja `pagosApi` con `getCajaDiaria` y `anular` `@deprecated` hasta que la 09 los retire.
- **`src/api/clienteApi.js`**: lo crea la 07 con solo `listClientes`. `Clientes.jsx` no se toca (P-FB6). Una spec de Clientes futura agrega sus funciones al mismo archivo.
- **`src/api/ocupacionApi.js`**: lo crea la 07 (`listOcupaciones`, `getOcupacion`, `createOcupacion`, `cancelOcupacion`, `finalizeOcupacion`). La 10 **agrega** sus funciones (`PUT /fin`, `/precio`, `/ajuste-precio`) sin recrearlo.
- **07 ↔ 10**: el detalle de la ocupación tiene una sección "Contrato mensual" (solo MES) con `modoMes` y `fraccionMes` de solo lectura; la 10 agrega ahí el ajuste de precio y la baja programada.
- **06**: el historial de una cochera podría enlazar a `/ocupaciones?id=N` (el `id` de cada ítem es el de la ocupación). La 06 ya está aprobada y no lo trae: queda pendiente.

**`refreshMe()` en `MeProvider`** (la propone la 11 y la aprobó el orquestador): la 11 agrega en su paso 1 una función **aditiva** `refreshMe()`. Vuelve a pedir `GET /me` **sin** pasar por LOADING, así que no desmonta la app ni pierde formularios, y aplica la validación de zona de D-FB7. Si falla, conserva el `me` anterior. La usa la 11 después de cambiar la zona; cualquier spec que cambie datos de `/me` la puede usar.

**Configuración del tenant en otras pantallas** (dato de la 11): el OPERADOR **no** tiene `configuracion.ver`.
- La 09 lee `modoCaja` de `GET /Caja/actual`, no de `/Configuracion`.
- La 07 y la 10 **no** validan en el cliente los límites de la configuración (`toleranciaInicioHoras`, `topePasadoDias`, `techoFuturoMeses`, etc.): el backend es la autoridad y el front muestra su error por `code`.

**Widget de caja del Monitor operativo** (decidido por el usuario el 18/11/2026: opción (a)). El Monitor (`/operaciones`) y Alertas (`/alertas-operativas`) siguen como dos pantallas separadas.
- Hoy `OperationalDashboard.jsx` (l. 114) llama a `GET /Pagos/caja-diaria`, que ya no existe. Esa llamada está dentro de un `Promise.all` con las alertas, así que el 404 tira abajo **todo** el Monitor.
- Opción elegida (a): la 05 saca el widget y el botón "Ver detalle de caja", y pasa el Monitor a `Promise.allSettled`, así una llamada que falla no tira abajo toda la pantalla.
- La 09 entonces:
  1. vuelve a poner el widget en el Monitor sobre `/Caja` (`/Caja/actual` y `/Caja/sesiones/{id}/esperado`, que exige `caja.ver_esperado`);
  2. retira `pagosApi.getCajaDiaria`, que también usa `CajaDiaria.jsx`;
  3. revisa si `/operaciones` tiene que exigir `caja.ver` (P-FA4).

**Contratos de la 09** (definidos el 19/11/2026; detalle en `docs/specs/frontend/09-caja.md`).
- **05 ↔ 09 (`getAlertLinks`, "Ver caja")**: `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones, canCaja })` suma "Ver caja" a `buildCajaPath(alerta.cajaSesionId)` (`/caja?sesion=N`, de `src/utils/cajaLink.js`) con `can("caja.ver")`, después de "Ver ocupación" y antes de "Ver trazabilidad". `OperationalAlerts.jsx` pasa `canCaja`. **Cierra P-FE1 en lo que toca a Caja.**
- **08 ↔ 09 (`PagoDetalleDialog` con `pagoId`)**: la 09 abre `PagoDetalleDialog({ pagoId, onClose, onChanged })` desde el `pagoId` de un movimiento de sesión, sin modificarlo. `onChanged` recarga la caja **actual** (la anulación y la devolución caen en la sesión actual, no en la del pago). La 09 **retira** el export `@deprecated` `pagosApi` (`getCajaDiaria`, `anular`).
- **URL de una sesión de caja**: `/caja?sesion=N` abre el detalle sobre la pantalla. Se enlaza siempre con `buildCajaPath(id)`; `CAJA_PATH` se exporta desde `src/auth/routes.js`. `/caja-diaria` redirige a `/caja`.
- **Widget de caja del Monitor ya repuesto por la 09**: tarjeta autónoma `CajaWidget` en `OperationalDashboard.jsx` con `can("caja.ver")` (el esperado, además con `caja.ver_esperado`), refrescada con el `reloadKey` del Monitor, con falla aislada. `/operaciones` sigue exigiendo `alertas.ver` (P-FA4 cerrado: todo rol con `alertas.ver` tiene `caja.ver`).

**Contratos de la 10** (definidos el 19/11/2026; detalle en `docs/specs/frontend/10-contratos-mensuales.md`).
- **07 ↔ 10 (sección "Contrato mensual")**: la 10 reemplaza el cuerpo de esa sección del `OcupacionDetalleDialog` por `ContratoMensualSeccion` (conserva "Modo de mes", "Fracción" y "Congelados al crear") y suma ahí "Ajustar precio" (`tarifas.editar`), "Programar baja"/"Cambiar fecha de fin" y "Quitar baja" (`ocupaciones.finalizar`). Usa el `onChanged` que ya recarga el detalle y el listado. No toca `CuentaOcupacion` ni los diálogos de la 07.
- **07 ↔ 10 (`Ocupaciones.jsx`)**: la 10 agrega **un botón** "Ajustar precios mensuales" en el encabezado (solo con `tarifas.editar`) que abre el diálogo del ajuste masivo y recarga el listado al aplicar.
- **`src/api/ocupacionApi.js`**: la 10 **suma** `adjustOcupacionPrecio`, `setOcupacionFin` (siempre manda la clave `fin`, también `null`) y `adjustPreciosMensuales`, sin recrear el archivo.
- **08 ↔ 10 (devolución)**: programar una baja puede dejar saldo a favor y crear `DEVOLUCION_PENDIENTE`; la 10 solo avisa y apunta al botón "Registrar devolución" de la sección "Cuenta" (08). No abre `DevolucionDialog` por su cuenta.

**Rutas** (`src/auth/routes.js`, `src/App.jsx`, `test/unit/auth/routes.test.js`): las tocan la 04 (`/trazabilidad`), la 09 (caja), la 11 (`/configuracion`) y la 12 (`/usuarios`). Al hacer rebase se conservan **todas** las entradas de las otras specs. Cada spec que suma una ruta actualiza el test para la suya, que compara el mapa completo y qué rol accede a qué. El orden del menú: `/configuracion` y `/usuarios` al final.

**Mantenimiento de archivos compartidos.**
- La línea "Backend endpoints used" de `CLAUDE.md` la reemplaza la 02 (paso 8) por una referencia a `docs/inventario/backend.md`. Las specs siguientes no la tocan.
- Las excepciones de lint de `eslint.config.js` las saca cada spec. Para evitar conflictos, se mergea en orden de número, con rebase sobre `develop` antes de cada PR.

### Reparto acordado durante la redacción de la 02 (18/11/2026)

- La **02** crea `src/utils/fechas.js` y `src/utils/formato.js` (`formatMoney`, es-UY/UYU) y hace un **arreglo mínimo** de fechas en `Ocupaciones.jsx` (alta y filtros a instante UTC), sin tocar UI, errores ni permisos. La 07 ya no tiene que arreglar ese 400.
- Las copias locales de `fmtDate`/`parseFechaLocal`/`formatDateTime`/`money` las retira la spec que reescribe cada página: 03 Tarifas, 04 Auditoría, 05 OperationalAlerts y OperationalDashboard, 06 Cocheras, 07 Ocupaciones, 09 CajaDiaria. La tabla está en la spec 02.
