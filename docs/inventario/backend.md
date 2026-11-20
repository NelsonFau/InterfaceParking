# Inventario de la API ParkingControl

Relevado el 18/11/2026 sobre `ParkingControl` rama `main` (lectura del código; donde docs y código difieren, manda el código). Todas las rutas son relativas a `/api/v1` y requieren Bearer salvo `GET /health` (fuera de `/api/v1`, anónimo). El routing no distingue mayúsculas.

Specs del backend: 01–18 todas **Terminadas**. El pendiente que agrupa la adaptación del front en el backend es **P-26** (`docs/pendientes-generales.md` del repo backend).

## 0. Contratos transversales

- **JSON** camelCase. **Enums como entero** en request y response (no hay `JsonStringEnumConverter`). En query string se acepta nombre o número. Excepciones string: `/me.rol`, `fuente`/`accion` y el contenido de `detalle` en Trazabilidad, y los `code` de error.
- **Instantes** (`DateTime`): salen siempre UTC con `Z`. Al entrar (body, query o ruta) **exigen zona** (`Z` o `±hh:mm`); sin zona → 400 `datos_invalidos`.
- **Fechas de calendario** (`DateOnly`): `yyyy-MM-dd`, sin zona, interpretadas en la zona del tenant (`/me.tenant.zonaHoraria`, IANA).
- **Paginación** `PagedResponse<T>`: `{ items, total, page, pageSize }`. Solo la usan Cliente, Caja/sesiones, operational-alerts y Trazabilidad.
- **Errores**: Problem Details (`application/problem+json`) con `status`, `title` (mostrable tal cual), `code`, `traceId`. Los 400 de validación agregan `errors: { Campo: [mensajes] }` con el campo en **PascalCase** (excepciones en minúscula: `fuente`, `ocupacionId` en Trazabilidad). 503 trae `Retry-After: 2`.
- **Tenant**: el front nunca envía `TenantId`; lo resuelve el backend desde el usuario. Un id de otro tenant da 404.
- **Auth**: JWT Auth0 RS256. El backend ignora roles/permisos del token: los arma desde la base en cada request (`ResolucionUsuarioMiddleware`).

## 1. Endpoints

### `/me`
| Verbo y ruta | Permiso | Respuesta |
|---|---|---|
| GET `/me` | cualquier usuario resuelto | `{ usuarioId, nombre, email, rol: "DUENO"\|"ENCARGADO"\|"OPERADOR"\|"AUDITOR"\|"SUPERADMIN", permisos: string[], tenant: { id, nombre, zonaHoraria } }` |

### `/Cliente`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| POST `/Cliente` | `clientes.gestionar` | `{ nombreCompleto*, documento*, telefono*, email? }` | 200 `ClienteResponse` |
| GET `/Cliente` | `clientes.ver` | `q?`, `activos?` (default true), `page=1`, `pageSize=20` (máx 100) | `PagedResponse<ClienteResponse>` |
| GET `/Cliente/{id}` | `clientes.ver` | | `ClienteResponse` |
| PUT `/Cliente/{id}` | `clientes.gestionar` | alta + `activo` | `ClienteResponse` |
| DELETE `/Cliente/{id}` | `clientes.gestionar` | | 204 (baja lógica) |
| PATCH `/Cliente/{id}/reactivar` · `/desactivar` | `clientes.gestionar` | | 204 |

`ClienteResponse`: `id, nombreCompleto, documento, telefono, email?, activo, fechaCreacion`.

### `/Cochera`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| GET `/Cochera` | `cocheras.ver` | | `CocheraListItem[]` (no paginada) |
| GET `/Cochera/{id}` | `cocheras.ver` | `historialTake=20` (se recorta a 1..100) | `CocheraDetalle` |
| GET `/Cochera/disponibles` | `cocheras.ver` | `desde`, `hasta` (instantes con zona) | `{ id, numero }[]` |
| POST `/Cochera` | `cocheras.gestionar` | `{ desde: 1..999, hasta?: 1..999 }` (rango; sin `hasta` crea una) | **201** `{ id, numero, estado, nota? }[]` |
| PUT `/Cochera/{id}` | `cocheras.gestionar` | `{ numero: 1..999, nota? (≤300) }` | 204 |
| PUT `/Cochera/{id}/estado` | `cocheras.cambiar_estado` | `{ estado, nota? (≤300) }` (pensado para DISPONIBLE/BLOQUEADA) | 204 |

- `CocheraListItem`: `id, numero, estado, ocupacionActiva?: { ocupacionId, clienteId, clienteNombre, tipo, inicio, fin?, precioTotal? }`.
- `CocheraDetalle`: `id, numero, estado, nota?, ocupacionActiva?, historial: { id, clienteId, clienteNombre, tipo, inicio, fin?, estado, precioTotal? }[]`.
- `estado` es calculado: puede venir `OCUPADA` o `RESERVADA`.

Comportamiento (relevado de `Service\CocheraService.cs`, `EstadoDeCocheras.cs` y `DisponibilidadService.cs` el 18/11/2026; sin confirmar por tests):
- **Reloj (PB-4, resuelto en la Tanda A del backend, PR #66, 19/11/2026):** el listado y el detalle calculan el estado con UTC, igual que el cambio de estado y las disponibles.
- **Estado calculado**, con prioridad BLOQUEADA > OCUPADA > RESERVADA > DISPONIBLE. Es RESERVADA si no hay ocupación en curso pero sí una ACTIVA con `inicio > ahora`. `ocupacionActiva` es la ocupación en curso o, si no hay, la próxima reserva, así que su presencia **no** implica OCUPADA. Una cochera BLOQUEADA puede traer `ocupacionActiva`. `precioTotal` suele ser `null`.
- **GET `/Cochera`**: ordenado por `numero` ascendente. **No trae `nota`**: solo el detalle la trae.
- **GET `/Cochera/{id}`**: el `id` de cada ítem del historial es el **id de la ocupación**. El historial viene por `inicio` descendente e incluye todas (activa, futuras, finalizadas y canceladas). `historialTake` se recorta en silencio a [1, 100] (PB-5); el valor por defecto sigue en 20.
- **POST `/Cochera`**: **todo o nada**. Si algún número del rango existe → 409 `cochera_numero_repetido`, y el mensaje lista hasta 10. `hasta < desde` → 400 `datos_invalidos` (campo `Hasta`). **Tope de 100 cocheras por pedido** → 400 `operacion_invalida`. El 201 **no** trae `Location` y el cuerpo viene ordenado por número.
- **PUT `/Cochera/{id}`**: se puede editar aunque esté ocupada o reservada. El mismo número propio da 204; el número de otra cochera, 409 `cochera_numero_repetido`. `nota: null` **borra** la nota; `""` se guarda como cadena vacía.
- **PUT `/Cochera/{id}/estado`**: OCUPADA o RESERVADA → 400 `datos_invalidos` ("Solo se permite DISPONIBLE o BLOQUEADA."). Bloquear con una ocupación **en curso** → 409 `cochera_con_ocupacion_activa`. Bloquear con una reserva **futura** se permite sin error. Pasar a DISPONIBLE solo quita el bloqueo, porque el estado se recalcula. `nota: null` **borra** la nota. Desde la Tanda A (PB-5): `nota` de más de 300 → 400 `errors.Nota`, y `""` o solo espacios se guarda como `null`.
- **GET `/Cochera/disponibles`**: `hasta` es **obligatorio** (`DateTime` no nulo) y `hasta <= desde` → 400 `datos_invalidos` (campo `Hasta`). Excluye las bloqueadas y las que se solapan con ocupaciones ACTIVA; una ocupación con `Fin <= ahora` (vencida, sin finalizar) cuenta como ocupada para siempre. Para una ocupación abierta, el front pasa `inicio` más un horizonte largo (el techo futuro es de 24 meses como mucho). Viene ordenado por número.

### `/Ocupacion`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| POST `/Ocupacion` | `ocupaciones.crear` (+ ver abajo) | `OcupacionRequest` | 200 `OcupacionResponse` |
| GET `/Ocupacion` | `ocupaciones.ver` | `estado?, tipo?, cocheraId?, clienteId?, desde?, hasta?` (instantes con zona), `venceEnDias?`, `take=200` (máx 500) | `OcupacionListItem[]` (sin paginar) + header `X-Total-Count` |
| GET `/Ocupacion/{id}` | `ocupaciones.ver` | | `OcupacionDetalle` |
| POST `/Ocupacion/{id}/cancelar` | `ocupaciones.cancelar` | `{ motivo* (≤250) }` (`finReal` ya no es parte del contrato; si llega, se ignora) | 204 |
| POST `/Ocupacion/{id}/finalizar` | `ocupaciones.finalizar` | body opcional `{ resolucionExcedente?, motivo? (≤250) }` | 204 |
| PUT `/Ocupacion/{id}/fin` | `ocupaciones.finalizar` | `{ fin? }` (`null` quita la baja programada) | `{ ocupacionId, fin? }` |
| POST `/Ocupacion/{id}/precio` | `tarifas.editar` | `{ vigenteDesde: DateOnly (> hoy), precioUnitario, motivo* (≤250) }` | `{ id, ocupacionId, vigenteDesde, precioAnterior, precioNuevo }` |
| POST `/Ocupacion/ajuste-precio` | `tarifas.editar` | `{ vigenteDesde, porcentaje: -50..100, motivo*, excluir?: int[] }` | `{ cantidad, contratos: AjustePrecio[] }` |

- **Alta** `OcupacionRequest`: `cocheraId, clienteId, tipo, inicio` (con zona), `fin?` (sin fin = ocupación abierta), `usarTarifaExcepcional, precioUnitarioExcepcional?` (2 dec, ≤10.000.000), `motivoTarifaExcepcional?` (≤250), `motivoRetroactivo?` (≤250, obligatorio si el inicio es retroactivo).
  - Inicio antes de la tolerancia del tenant → requiere `ocupaciones.crear_retroactiva`; si no, 403 `sin_permiso` (lo da el controller). El 409 `inicio_retroactivo_sin_permiso` solo sale por una carrera de configuración y es casi inalcanzable.
  - `usarTarifaExcepcional=true` → requiere `ocupaciones.tarifa_excepcional`; si no, 403 `sin_permiso`.
- **Finalizar**: `resolucionExcedente` obligatorio solo si lo pagado de un mensual supera lo que corresponde **hasta la salida real**; `motivo` obligatorio con `COBRAR_COMPLETO`. Detalle en "Comportamiento".
- `OcupacionResponse`: `id, cocheraId, clienteId, tipo, inicio, fin?, precioUnitarioAplicado, precioTotal?, topeDeCobro, estado`.
- `OcupacionListItem`: `id, cocheraId, cocheraNumero, clienteId, clienteNombre, tipo, inicio, fin?, finReal?, estado, estadoCalculado, precioTotal?, topeDeCobro, pagado, saldo, saldoAFavor, precioVigente`. `saldoAFavor` (PB-10) y `precioVigente` (PB-19: el precio de hoy, con los cambios ya vigentes de un mensual; no el de una fecha futura) los sumó la Tanda B del backend (PR #67 de Parking-Api, 20/11/2026). `precioUnitarioAplicado` sigue sin estar en el ítem.
- **Total y filtro por tipo (Tanda B):** el header `X-Total-Count` trae cuántas ocupaciones cumplen los filtros **antes** de `take` (entero; CORS lo expone); si supera el largo del array, el listado quedó truncado. `tipo` es opcional (entero del enum `TipoOcupacion`; fuera de rango → 400 `errors.tipo`).
- `OcupacionDetalle`: lo anterior + `clienteDocumento, clienteTelefono, precioUnitarioAplicado, esTarifaExcepcional, motivoTarifaExcepcional?, modoMes?, fraccionMes?, saldoAFavor, precioVigente, cambiosDePrecio[]`. `pagado` es neto de devoluciones. `precioTotal` es `null` hasta finalizar. `VENCIDA` solo aparece en `estadoCalculado`. Desde la Tanda B (PB-18): `precioUnitarioAplicado` sigue siendo el de partida, `precioVigente` es el de hoy y `cambiosDePrecio` es `{ vigenteDesde (UTC con Z), precio, motivo }[]` por `vigenteDesde` ascendente, incluidos los futuros (vacío si no hay cambios o si no es MES).

Comportamiento (relevado del código del backend el 18/11/2026: `OcupacionController.cs`, `OcupacionRequest.cs`, `CuentaDeOcupacion.cs`, `CalculadoraDeCobro.cs` y el servicio de ocupaciones; sin confirmar por tests). No hay FluentValidation: las validaciones son DataAnnotations (400 `datos_invalidos`, que salen **antes** que el 403), `OcupacionValidator` y excepciones de dominio; `ReglaInvalidaException` da 400 `datos_invalidos` con `errors.<Campo>` en PascalCase.
- **Alta (200)**: el cuerpo es `OcupacionResponse` con `precioTotal` siempre `null` y `topeDeCobro` ya calculado; no trae `esTarifaExcepcional`, `modoMes`, `fraccionMes` ni `saldo`. Orden de validación: `Fin > Inicio` → duración máxima → techo futuro → tope de pasado → retroactiva (403) → cochera 404/409 → cliente 404/409 → disponibilidad 409 → tarifa (`tarifa_no_configurada`).
  - **Errores por campo**: `errors.Inicio` (tope de pasado: "El inicio no puede ser anterior a N días."; techo futuro: "La reserva supera el máximo de N meses hacia adelante."), `errors.Fin` (`Fin <= Inicio` o duración máxima), `errors.MotivoRetroactivo` (falta, siendo retroactiva y con permiso), `errors.MotivoTarifaExcepcional` (falta con la excepcional), `errors.PrecioUnitarioExcepcional` (falta o `<= 0`).
  - **Duración máxima** (constantes del código, solo con `fin`): HORA 7 días, DÍA 90, MES 3 años. Las abiertas no tienen tope. `toleranciaInicioHoras`, `topePasadoDias` y `techoFuturoMeses` son configurables.
  - `motivoRetroactivo` dentro de la tolerancia se ignora (se guarda `null`). `motivoTarifaExcepcional` de más de 250 → 400 `errors.MotivoTarifaExcepcional` (PB-8, Tanda A; antes daba 500).
  - **Solape de una abierta**: `Fin` nulo es `[Inicio, ∞)` y choca con cualquier ocupación ACTIVA de la cochera que sea abierta, vencida (`Fin <= ahora`: bloquea hasta que se finalice) o con `Fin > desde`, incluidas las reservas futuras (409 `cochera_no_disponible` o `cochera_bloqueada`).
- **Listado**: orden `Inicio` descendente, sin desempate por `Id`. `estado=ACTIVA` **no incluye las vencidas** (es ACTIVA con `Fin` nulo o `Fin > ahora`: en curso y reservas); `estado=VENCIDA` filtra ACTIVA con `Fin <= ahora` (no se persiste). `venceEnDias`: ACTIVA con `Fin` no nulo y `ahora < Fin <= ahora + N`; excluye las vencidas y las abiertas, se combina en AND y no valida `N`. `take`: 200 por defecto; el controller **recorta en silencio a 500** (sin 400) y `take <= 0` pasa a 200. No hay total ni paginación.
- **Cifras** (`CuentaDeOcupacion.cs`): `topeDeCobro` es 0 en una CANCELADA, `PrecioTotal ?? 0` en una FINALIZADA, el total esperado hasta `Fin` en una ACTIVA con fin (incluidas vencida y reserva; HORA: horas iniciadas con gracia y mínimo 1; DÍA: bloques de 24 h, mínimo 1; MES: períodos con `modoMes` y `fraccionMes` congelados, el proporcional redondeado al peso) y, en una ACTIVA sin fin, hasta el fin de la unidad en curso (`(floor(transcurrido) + 1) × precio`, sin gracia; en MES, el período en curso entero). `saldo = max(tope − pagado, 0)` y no depende de `precioTotal`. `saldoAFavor = max(pagado − topeDeCobro, 0)`; en una ACTIVA con fin el tope es el contrato hasta `Fin`, no lo devengado hoy. Una vencida no incluye la demora hasta que se finaliza.
- **Cancelar**: solo para ACTIVA con `Inicio > ahora` (reservas). 404 `ocupacion_no_encontrada`; 409 `ocupacion_no_activa` (cancelada o finalizada); 409 `ocupacion_ya_iniciada` (en curso o vencida: "Solo se pueden cancelar reservas futuras. Las ocupaciones vigentes deben finalizarse."); 400 sin `motivo`. Desde la Tanda A (PB-9): `finReal` se retiró del contrato (si llega, se ignora); `motivo` es `[Required]` con máximo 250 (400 `errors.Motivo`), un motivo de solo espacios **falla** y se audita recortado. Con pagos se puede cancelar: queda `saldoAFavor` igual a lo pagado y se crea la alerta `DEVOLUCION_PENDIENTE` (PB-9).
- **Finalizar**: responde 204 sin cuerpo; `FinReal = ahora` y `Fin` no cambia. Un mensual tiene excedente si `pagadoNeto > total`, con `total` = lo devengado hasta la salida real. Sin `resolucionExcedente`, 400 `datos_invalidos` con `errors.ResolucionExcedente`; el monto aparece en el texto de `errors.ResolucionExcedente[0]` ("Lo pagado (X.XX) supera lo que corresponde hasta la salida (Y.YY). Elegí COBRAR_COMPLETO (con motivo) o DEVOLVER.") y, desde la Tanda B del backend (PB-7), también como números en las propiedades `pagado`, `totalALaSalida` y `excedente` del Problem Details. El excedente no se conoce antes de finalizar. `COBRAR_COMPLETO` exige `motivo` (400 `errors.Motivo`, máximo 250) y deja `PrecioTotal = pagadoNeto`. **`DEVOLVER` no crea la devolución**: deja `PrecioTotal` en lo calculado, pasa a FINALIZADA y crea la alerta `DEVOLUCION_PENDIENTE`; la devolución se hace después con `POST /Pagos/{id}/devoluciones`. `resolucionExcedente` sin excedente se ignora. **HORA y DÍA con excedente**: se fuerza `DEVOLVER` y la alerta, ignorando lo enviado. Otros 409: `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_no_iniciada`.
- **Contratos mensuales** (relevado de `ContratoMensualService.cs`, `ContratoMensualDtos.cs` y `OcupacionController.cs` el 19/11/2026; sin confirmar por tests). *Ajuste individual* (`POST /{id}/precio`): `vigenteDesde` (`DateOnly`) debe ser posterior a hoy local (400 `errors.VigenteDesde`); `precioUnitario` con `[Dinero]` (400 `errors.PrecioUnitario`); `motivo` obligatorio ≤ 250 con `Trim` (400 `errors.Motivo`). Orden: 400 → 404 `ocupacion_no_encontrada` → 409 `ocupacion_no_mensual` → 409 `ocupacion_no_activa` (estado guardado ACTIVA: incluye reservas y vencidas). Agrega una fila append-only en `OcupacionesPrecio` y una de auditoría `AJUSTAR_PRECIO`; **no edita** el precio de partida. `precioAnterior` es el vigente en esa fecha. *Ajuste masivo* (`POST /ajuste-precio`): `porcentaje` con `[Range(-50, 100)]` y 2 decimales (400 `errors.Porcentaje`); alcance = todo MES ACTIVA sin fin o con fin posterior a `vigenteDesde`, menos `excluir` (ids inexistentes o no mensuales se ignoran en silencio); precio nuevo = `round(anterior × (1 + %/100))` al peso entero, desde ,50 hacia arriba; un resultado ≤ 0 da 400 `errors.Porcentaje` y, por la transacción, no se aplica ningún contrato (a comprobar en marcha). Responde `{ cantidad, contratos[] }` con `id = 0` en cada contrato; sin contratos, 200 con `cantidad: 0`. *Baja programada* (`PUT /{id}/fin`, `ocupaciones.finalizar`): `fin` en `null` la quita. Orden: 400 `errors.Fin` si `fin` no es posterior a ahora → 404 → 409 `ocupacion_no_mensual` → 409 `ocupacion_no_activa` → 400 `errors.Fin` si `fin` supera `inicio + 3 años` → 409 `cochera_no_disponible` si el nuevo fin choca con otra ocupación de la cochera. Desde la Tanda A (PB-22): `fin <= inicio` → 400 `errors.Fin` ("La baja tiene que ser posterior al inicio del contrato."). Si lo pagado queda por encima del tope se crea `DEVOLUCION_PENDIENTE`; desde la Tanda A (PB-21) también la crean el ajuste individual y el masivo cuando un ajuste a la baja deja saldo a favor (en un mensual sin `fin`, el saldo a favor aparece recién en la fecha de vigencia y ese día no se crea la alerta: hallazgo anotado en la spec 19 del backend). `GET /Ocupacion/{id}` no devuelve el precio vigente ni los cambios de precio (PB-18) y `GET /Ocupacion` no filtra por `tipo` (PB-19). El `title` de `ocupacion_no_activa` es "La ocupación no está activa." en todas las acciones (PB-23, Tanda A).

### `/Pagos`
| Verbo y ruta | Permiso | Body | Respuesta |
|---|---|---|---|
| POST `/Pagos` | `pagos.registrar` | `{ ocupacionId, monto (>0, 2 dec), metodo, referencia? }` | **201** `PagoResponse` |
| GET `/Pagos/ocupacion/{ocupacionId}` | `pagos.ver` | | `PagoResponse[]` |
| GET `/Pagos/{pagoId}` | `pagos.ver` | | `PagoDetalle` |
| PATCH `/Pagos/{pagoId}/anular` | `pagos.anular` (+ `pagos.devolver` si el pago es de otra sesión de caja) | `{ motivo* (≤250) }` | 204 |
| POST `/Pagos/{pagoId}/devoluciones` | `pagos.devolver` | `{ monto, metodo, motivo* (≤250) }` | **201** `Devolucion` |

- `PagoResponse`: `id, ocupacionId, monto, montoDevuelto, metodo, estado, fechaPago, referencia?, cajaSesionId, anulableSinDueno`.
- `PagoDetalle`: lo anterior + `registradoPorUsuarioId, registradoPorUsuarioNombre, historial: { estado, fecha, usuarioId, usuarioNombre, motivo? }[], devoluciones: Devolucion[]`.
- `Devolucion`: `id, pagoId, monto, metodo, motivo, usuarioId, usuarioNombre, fecha`.
- **Tanda B del backend (PR #67, 20/11/2026):** `cajaSesionId` es la sesión en que se cobró y `anulableSinDueno` es `true` si el pago está PAGADO, sin devoluciones y cobrado en la sesión abierta ahora (sin sesión abierta, `false`): es la misma regla con la que el servidor decide el 403 al anular sin `pagos.devolver` (PB-11). Los `usuarioNombre` (solo el nombre, incluidos usuarios desactivados) los ve cualquiera con `pagos.ver`, el OPERADOR incluido (PB-14); el POST de devolución también lo trae.
- Anular un pago de otra sesión sin `pagos.devolver` → 403 `sin_permiso`, después de los 404 y 409 (PB-12, Tanda A). El 409 `anulacion_requiere_dueno` se retiró del catálogo.

Comportamiento de `POST /Pagos` (relevado del código del backend el 18/11/2026; sin confirmar por tests). Responde **201** con `pagos.registrar`. Orden de errores:
- 404 `ocupacion_no_encontrada`.
- 409 `ocupacion_cancelada`.
- 409 `pago_supera_saldo` si `pagadoNeto + monto > topeDeCobro` (una finalizada con saldo 0 siempre da 409).
- Errores de caja: 409 `caja_cerrada` (modo TURNO sin sesión abierta) y 409 `caja_dia_anterior_abierta` (modo DIARIA con una caja abierta de un día anterior). En modo DIARIA, sin sesión abierta del día, la sesión **se abre sola**.
- Una reserva futura y una vencida **se aceptan** hasta el tope; la demora de una vencida no se cobra hasta finalizar.
- `monto` con `[Dinero]`: mayor que 0, 2 decimales como máximo y tope de 10.000.000 (400 `datos_invalidos` con `errors.Monto`).

Comportamiento de anular, devolver y `GET /Pagos/ocupacion/{id}` (relevado del código del backend el 18/11/2026; sin confirmar por tests; `PS` = `Service\PagoService.cs`, `PC` = `Controllers\PagosController.cs`):
- **Anular (`PATCH /Pagos/{id}/anular`). Orden:** 1) policy `pagos.anular` (403, PC:46); 2) 400 `datos_invalidos` con `errors.Motivo` (`[Required][MaxLength(250)]`; un motivo de solo espacios también falla); 3) 404 `pago_no_encontrado`; 4) 409 `pago_anulado`; 5) 409 `pago_con_devoluciones`; 6) caja: 409 `caja_cerrada` (TURNO sin sesión) o `caja_dia_anterior_abierta` (DIARIA; con DIARIA sin sesión abierta se abre sola); 7) **sin `pagos.devolver` y "otra sesión", 403 `sin_permiso`** (en el servicio, dentro de la transacción: hace rollback y no deja una sesión DIARIA abierta de rebote). Orden corregido por PB-12 en la Tanda A del backend (PR #66, 19/11/2026); antes el 403 corría en el controller antes del 404 y de los 409, y existía el 409 `anulacion_requiere_dueno`, hoy retirado. El motivo se guarda con `Trim`.
- **"Otra sesión de caja"** (PS:199-221): se compara la `CajaSesionId` de la fila PAGADO del historial con la **única sesión ABIERTA** del tenant; **sin sesión abierta, todo pago cuenta como de otra sesión**. El pago no tiene `CajaSesionId` propio: está en el historial y en la devolución, y no se expone en ningún DTO. En DIARIA, un pago de ayer con la caja de ayer abierta da 409 `caja_dia_anterior_abierta` para todos, y con ayer cerrado y sin sesión hoy es otra sesión (un no dueño recibe 403; para el dueño la sesión de hoy se abre sola): un ENCARGADO nunca puede anular un pago de un día anterior. En TURNO, un pago de un turno cerrado es de otra sesión (solo el dueño). **La anulación y la devolución se registran en la sesión actual**, no en la del pago.
- **Anular exige que el pago no tenga devoluciones** (409 `pago_con_devoluciones`; un pago con devolución parcial no se anula). Una devolución no se puede anular ni revertir (no hay endpoint). No existe "reactivar".
- **Devolver (`POST /Pagos/{id}/devoluciones`). Orden:** 1) policy `pagos.devolver`; 2) 400 con `errors.Monto`, `errors.Metodo` y `errors.Motivo`; 3) 404 `pago_no_encontrado`; 4) 409 `pago_anulado`; 5) 409 `devolucion_supera_pago`; 6) caja (los mismos dos codes). `devolucion_supera_pago` compara **solo contra el pago** (`yaDevuelto + monto > pago.Monto`, PS:241), no contra el `saldoAFavor` de la ocupación ("La devolución supera lo que queda por devolver del pago."). Se puede devolver sobre **cualquier estado** de ocupación, con o sin saldo a favor (no hay chequeo de la ocupación). El método puede diferir del del pago (`[EnumDataType]`). `monto` con `[Dinero]` (mayor que 0, 2 decimales, máximo 1e7); `motivo` con `[Required][MaxLength(250)]` y `Trim`. Devolver **no depende de la sesión**: siempre exige `pagos.devolver` (DUENO).
- **Cifras tras anular y devolver** (`CuentaDeOcupacion.cs`, líneas 98-150): `pagado` neto = Σ pagos PAGADO − Σ devoluciones de esos pagos. Anular resta el monto entero. Anular un pago de una FINALIZADA con `PrecioTotal` fijo hace **subir el saldo** (queda debiendo, sin reabrirse). Devolver sobre una ACTIVA sube el saldo; sobre una CANCELADA (tope 0) o una FINALIZADA con exceso baja el `saldoAFavor`.
- **`GET /Pagos/ocupacion/{id}`:** orden `fechaPago` descendente, sin desempate; **incluye los ANULADOS**; con una ocupación inexistente devuelve 200 con `[]` (no 404); no filtra por usuario ni por rol. `PagoResponse` no trae `registradoPorUsuarioId`.
- **DTOs:** `historial[]` en orden cronológico ascendente con `estado` PAGADO=1 (sin motivo) o ANULADO=2 (con motivo), `fecha` UTC y `usuarioId`; `devoluciones` ascendentes por `id`. **Ningún DTO trae el nombre del usuario ni `cajaSesionId`.** `POST /Pagos` devuelve `montoDevuelto = 0`. No hay un listado general de pagos. `GET /Caja/sesiones/{id}` trae `movimientos` con `pagoId` (tipo COBRO, ANULACION o DEVOLUCION y `dePagoDeOtraSesion`, que solo vale en las anulaciones).

### `/Tarifa`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| GET `/Tarifa/vigentes` | `tarifas.ver` | | `{ tipo, vigente?: Tarifa, proxima?: Tarifa }[]` |
| GET `/Tarifa/historial` | `tarifas.ver` | `tipo` (nombre o número) | `Tarifa[]` |
| PUT `/Tarifa` | `tarifas.editar` | `{ tipo, nuevoPrecio, vigenteDesde?: DateOnly }` (sin valor = hoy en zona del tenant) | `Tarifa` |
| DELETE `/Tarifa/{id}` | `tarifas.editar` | | 204 (solo tarifas que aún no rigen) |

`Tarifa`: `id, tipo, precio, vigenteDesde: DateOnly, vigenteHasta?: DateOnly, vigente: bool`.

Comportamiento (relevado de `Service\TarifaService.cs` y `TarifaResolver.cs` el 18/11/2026; sin confirmar por tests):
- **Unicidad** por `(tipo, vigenteDesde)`. Puede haber **varias tarifas futuras** por tipo con fechas distintas.
- **`vigenteHasta`** no se guarda: se calcula al leer como el `vigenteDesde` de la siguiente menos 1 día.
- **PUT `/Tarifa`**:
  - `vigenteDesde` anterior a hoy → 400 `datos_invalidos` (campo `VigenteDesde`).
  - Con fecha futura: si ya hay una tarifa en esa misma fecha la **reemplaza** (auditoría EDITAR); si no, inserta (CREAR).
  - Con hoy (o sin `vigenteDesde`): si ya hay una tarifa que empieza hoy → 409 `tarifa_ya_vigente`; si no, inserta y rige desde hoy.
  - Carrera con otro pedido → 409 `tarifa_modificada`. No es `rowversion`: `CodigosModificado` solo registra la configuración.
- **DELETE `/Tarifa/{id}`**: inexistente → 404 `tarifa_no_encontrada`; si ya rige o rigió (`vigenteDesde <= hoy`) → 409 `tarifa_ya_vigente`; si es futura la borra (204, auditoría BORRAR); carrera → 409 `tarifa_modificada`.
- **GET `/vigentes`**: siempre 3 elementos (HORA, DIA, MES, en ese orden). Un tipo sin tarifa trae `vigente` y `proxima` en `null`. `vigente` es la de mayor `vigenteDesde <= hoy`; `proxima`, la de **menor** `vigenteDesde > hoy`. Las futuras siguientes solo se ven en el historial.
- **GET `/historial?tipo=`**: todas las tarifas del tipo, **incluidas las programadas**, ordenadas por `vigenteDesde` descendente. Sin confirmar qué pasa con un `tipo` ausente.
- **`nuevoPrecio`**: > 0 (**no admite 0**), 2 decimales como máximo, tope 10.000.000 (inclusivo). Si no cumple → 400 `datos_invalidos` (campo `NuevoPrecio`).
- **`tarifa_no_configurada`** (409) lo lanza el **alta de ocupación** (no `/Tarifa`) cuando no hay tarifa del tipo con `vigenteDesde <=` el día local del **inicio** de la ocupación, salvo con tarifa excepcional. Una ocupación retroactiva toma la tarifa de ese día; una futura, la que regirá ese día (incluida una programada). Es un dato para la 07.

### `/Caja`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| GET `/Caja/actual` | `caja.ver` | | `{ modo, sesion?, fondoPropuesto? }` |
| GET `/Caja/sesiones` | `caja.ver` | `desde?, hasta?` (DateOnly, rango ≤366 días), `page=1, pageSize=20` (máx 200) | `PagedResponse<CajaSesionListItem>` |
| GET `/Caja/sesiones/{id}` | `caja.ver` | | `{ sesion, historial: CajaHistorial[], movimientos?: CajaMovimiento[] }` (`movimientos` es `null` con la sesión abierta) |
| GET `/Caja/sesiones/{id}/esperado` | `caja.ver_esperado` | | `{ sesionId, estado, fondoInicial, totales, efectivoEsperado }` |
| POST `/Caja/abrir` | `caja.abrir` | `{ fondoInicial (≥0), observacion? (≤500, obligatoria si el fondo difiere del que quedó) }` | **201** `CajaSesion` |
| POST `/Caja/sesiones/{id}/cerrar` | `caja.cerrar` | `{ efectivoContado, fondoSiguiente (≤ contado), observacion? (obligatoria si contado ≠ esperado) }` | `CierreCaja` |
| POST `/Caja/sesiones/{id}/reabrir` | `caja.reabrir` | `{ motivo* (≤250) }` | `CajaSesion` |

- `CajaSesion`: `id, estado, fechaApertura, fondoInicial`.
- `CajaSesionListItem` (solo `GET /Caja/sesiones`, Tanda B, PB-15): `CajaSesion` + `fechaCierre?` (UTC con Z) y `diferencia?` (contado − esperado), del último cierre y solo con la sesión CERRADA; una abierta o reabierta trae `null`.
- `totales` (`CajaTotalMetodo[]`): `{ metodo, cobros, anulaciones, devoluciones }`.
- `CierreCaja`: `sesion, efectivoContado, efectivoEsperado, diferencia (contado − esperado), fondoSiguiente, observacion?, totales`.
- `CajaHistorial`: `tipo, fecha, usuarioId, usuarioNombre, automatica, motivo?, observacion?, fondoDeclarado?, fondoQueQuedo?, efectivoContado?, efectivoEsperado?, diferencia?, fondoSiguiente?, totales?`.
- `CajaMovimiento`: `tipo, pagoId, monto, metodo, fecha, usuarioId, usuarioNombre, dePagoDeOtraSesion`. Los `usuarioNombre` de historial y movimientos los sumó la Tanda B (PB-17): solo el nombre, visible con `caja.ver`.

Comportamiento (relevado del código del backend el 19/11/2026: `CajaController.cs`, `CajaService.cs`, `CajaConsultas.cs`, `SesionesDeCaja.cs`, `CuentaDeCaja.cs`, `CajaDtos.cs`; sin confirmar por tests):
- **Una sola sesión ABIERTA por tenant.** **DIARIA:** sin sesión abierta, el primer cobro, anulación o devolución abre una sola (apertura automática, fondo = el que quedó); si la abierta es de un día local anterior, todo movimiento da 409 `caja_dia_anterior_abierta`. **TURNO:** sin sesión abierta, 409 `caja_cerrada`; una sesión puede cruzar la medianoche. `GET /Caja/actual` trae el `modo` sin exigir `configuracion.ver`.
- **Abrir** sirve en los dos modos. 409 `caja_ya_abierta` si ya hay una. `fondoInicial` ≥ 0 (el 0 se permite), 2 decimales, hasta 10.000.000. Si difiere del fondo que quedó, `observacion` es obligatoria (400 `errors.Observacion`) y se crea la alerta `FONDO_DISTINTO`.
- **Cerrar.** Orden: 404 `caja_sesion_no_encontrada` → 409 `caja_cerrada` (no estaba abierta) → 400 `errors.FondoSiguiente` (supera lo contado) → 400 `errors.Observacion` (contado ≠ esperado). El esperado se calcula con el candado de la caja. Con diferencia crea `DIFERENCIA_DE_CAJA`; resuelve sola `CAJA_SIN_CERRAR`.
- **Efectivo esperado = fondo inicial + cobros − anulaciones − devoluciones, solo en EFECTIVO.** La anulación y la devolución caen en la sesión **actual**, no en la del pago. `totales` trae solo los métodos con movimientos. `caja.ver_esperado` lo tienen los cuatro roles.
- **Reabrir** (solo DUENO). Orden: 400 `errors.Motivo` (≤ 250, solo espacios falla) → 404 → 409 `caja_ya_abierta` → 409 `caja_no_es_la_ultima` (solo la última cerrada). No mira el modo ni el día: en DIARIA, reabrir una sesión de un día anterior bloquea todo movimiento hasta cerrarla (intencional). Agrega un evento REAPERTURA; al cerrar de nuevo se suma otro CIERRE al historial.
- **`GET /Caja/sesiones`**: `desde` y `hasta` obligatorios (400 `errors.Desde`/`errors.Hasta`), `hasta` no anterior a `desde`, rango ≤ 366 días; el día `hasta` entra entero; orden `fechaApertura` descendente, `id` descendente; `pageSize` máximo 200. El ítem no trae `fechaCierre` ni `diferencia` (PB-15).
- **`GET /Caja/sesiones/{id}`**: `historial` cronológico ascendente (el CIERRE trae el snapshot `totales`); `movimientos` es `null` con la sesión abierta y completo, sin paginar ni tope, con la cerrada (PB-16). Ningún DTO de caja trae el nombre del usuario (PB-17).
- **404** `caja_sesion_no_encontrada` (`NoEncontradoException`; también para un id de otro tenant). 400 `datos_invalidos` con `errors` en PascalCase: `FondoInicial`, `EfectivoContado`, `FondoSiguiente`, `Observacion`, `Motivo`, `Desde`, `Hasta`.

### `/Configuracion`
| Verbo y ruta | Permiso | Body / respuesta |
|---|---|---|
| GET `/Configuracion` | `configuracion.ver` | `{ zonaHoraria, modoCaja, toleranciaInicioHoras (0..168), topePasadoDias (1..3650), techoFuturoMeses (1..24), modoMes, fraccionMes, graciaHoraMinutos (0..59), diasGraciaMora (0..60), ventanaAlertasDias (7..90, solo lectura), version: base64 }` |
| PUT `/Configuracion` | `configuracion.editar` | `{ zonaHoraria*, modoCaja*, version*` (tal cual vino), y opcionales del resto (sin valor conservan el actual) `}` |

Errores: 409 `configuracion_modificada` (cambió `version`), 409 `caja_abierta` (cambiar zona o modo de caja con una caja abierta). `zonaHoraria` sale de una lista cerrada del backend.

Comportamiento (relevado de `ConfiguracionService.cs` el 18/11/2026):
- **PUT → 200 con la configuración completa** y la `version` nueva. La `version` **cambia siempre**, aunque no cambie ningún valor. Si la `version` es vieja → 409 `configuracion_modificada`; si falta → 400.
- Una zona fuera de la lista → 400 `datos_invalidos` con `errors.ZonaHoraria`. Un opcional fuera de rango → 400 de validación del DTO (clave en PascalCase, sin confirmar).
- **GET devuelve la zona guardada tal cual**, aunque esté fuera de la lista. Sin fila, devuelve los valores por defecto.
- **`caja_abierta`** salta solo si cambian `zonaHoraria` o `modoCaja` y hay **cualquier** sesión de caja ABIERTA del tenant. Cambiar topes o campos de mensuales no lo dispara.

**Significado de cada campo** (para los textos de ayuda y para las specs 07, 09 y 10):

| Campo | Qué hace | Defecto |
|---|---|---|
| `modoCaja` | **DIARIA**: una caja por día local; se abre sola con el primer movimiento (fondo = el que quedó, apertura automática). Si queda abierta de un día anterior, los movimientos dan 409 `caja_dia_anterior_abierta` y aparece la alerta CAJA_SIN_CERRAR. **TURNO**: se abre y se cierra a mano; sin sesión abierta, cobrar, anular o devolver da 409 `caja_cerrada`; puede cruzar la medianoche y nunca genera CAJA_SIN_CERRAR | — |
| `modoMes` | Períodos de una ocupación MES, en la zona del tenant. **CALENDARIO**: períodos del 1 al fin de mes (el primero es el mes del inicio). **CORRIDO**: el mismo día y hora de cada mes (31/1 → 28/2 → 31/3). **BLOQUES_30**: cada 30 días desde el inicio. Cada período se cobra con el precio vigente en su inicio | CORRIDO |
| `fraccionMes` | **COMPLETO**: cada período se cobra entero. **PROPORCIONAL**: días cubiertos sobre días del período, redondeado al peso entero (de ,50 para arriba). Aplica al primer período si se entra a mitad y al último si hay baja o finalización anticipada | — |
| `graciaHoraMinutos` | Solo en ocupaciones por HORA: minutos de tolerancia sobre la **fracción final** antes de cobrar otra hora (con gracia 10, 1 h 05 paga 1 h y 1 h 15 paga 2). El mínimo es 1 hora | 0 |
| `diasGraciaMora` | Días locales desde el inicio de un período de un MES activo impago antes de considerarlo en mora y generar MENSUAL_IMPAGO (una sola alerta por contrato). No afecta nada más | 10 |
| `toleranciaInicioHoras` | Ventana **solo hacia atrás**: un inicio más viejo que `ahora − N horas` es **retroactivo**, exige `ocupaciones.crear_retroactiva` y `motivoRetroactivo`. Dentro de la ventana no hace falta permiso | 24 |
| `topePasadoDias` | Máximo de días hacia atrás para el inicio, para **todos** los roles (400 en el campo `Inicio`). Se evalúa antes que la tolerancia | 30 |
| `techoFuturoMeses` | Máximo hacia adelante del **inicio** de una ocupación (día local ≤ hoy + N meses; 400 en el campo `Inicio`), para todos los roles. **No** limita el fin (hay topes de duración por tipo: HORA 7 días, DÍA 90 días, MES 3 años) ni las tarifas ni los ajustes de precio | 3 |
| `ventanaAlertasDias` | Solo lectura en la API: la fija la plataforma con el comando Admin `configurar-tenant --ventana-alertas-dias`. Es cuántos días hacia atrás mira el job horario de alertas | 30 |

- Las ocupaciones MES **congelan** `modoMes` y `fraccionMes` al crearse: cambiar la configuración no afecta los contratos en curso.

### `/Usuarios`
| Verbo y ruta | Permiso | Body | Respuesta |
|---|---|---|---|
| GET `/Usuarios` | `usuarios.ver` | | `Usuario[]` |
| POST `/Usuarios` | `usuarios.gestionar` | `{ nombre* (≤120), email* (≤200), rol: int }` | **201** `{ usuario, invitacionEnviada }` |
| POST `/Usuarios/{id}/reenviar-invitacion` | `usuarios.gestionar` | | 204 |
| PUT `/Usuarios/{id}/rol` | `usuarios.gestionar` | `{ rol: int }` | `Usuario` |
| POST `/Usuarios/{id}/desactivar` · `/reactivar` | `usuarios.gestionar` | | `Usuario` |

`Usuario`: `id, nombre, email, rol: int, activo, fechaCreacion`.

Comportamiento (relevado de `Service\UsuarioService.cs`, `MeService.cs` y `Data\Candados.cs` el 18/11/2026):
- **Email único GLOBAL**: una persona pertenece a un solo tenant. Al invitar con un email que ya existe en el mismo tenant → 409 `usuario_ya_existe`; en otro tenant → 409 `usuario_ya_registrado`. Los dos códigos **solo** salen al invitar.
- **`identidad_sin_vinculo`** (409, solo al invitar): Auth0 ya tenía una identidad con ese email sin `Usuario` vinculado. El dueño no lo puede resolver: el mensaje manda a soporte.
- **`ultimo_dueno`** (409): lo dan PUT `/rol` (al bajar al último DUENO activo) y `/desactivar`. Cuenta solo los DUENO **activos**.
- **Orden de validación**: 404 → `operacion_sobre_uno_mismo` → estado (`usuario_ya_desactivado`/`usuario_ya_activo`) → `ultimo_dueno` → 403. Si el último dueño es uno mismo, sale `operacion_sobre_uno_mismo`.
- **Status**: todos los `usuario_*` y `operacion_sobre_uno_mismo` son 409; `usuario_no_encontrado` es 404 (también para un id de otro tenant); `proveedor_identidad_no_disponible` es 503 con `Retry-After` (al invitar y al reenviar).
- **Invitación**: si falla solo el envío del mail, la respuesta es 201 con `invitacionEnviada: false` (no es un error). **Reenviar** a un desactivado → 409 `usuario_ya_desactivado`; a uno que ya aceptó **no** da error: manda el mail igual (204). **No existe ningún dato de "invitación pendiente"**.
- **Desactivar** es solo local: no toca Auth0, y el middleware corta el pedido siguiente con 403 `usuario_inactivo`. **Reactivar** solo pone `activo = true` y el usuario conserva su acceso, sin reenviar la invitación.
- **`/me.usuarioId` == `Usuario.id`**. GET `/Usuarios` viene ordenado por `nombre` y después por `id`. Roles invitables: DUENO, ENCARGADO, OPERADOR, AUDITOR (SUPERADMIN y 2 → 400). Errores propios: `usuario_ya_existe`, `usuario_ya_registrado`, `usuario_ya_desactivado`, `usuario_ya_activo`, `operacion_sobre_uno_mismo`, `ultimo_dueno`, `proveedor_identidad_no_disponible` (503).

### `/Panel`
| GET `/Panel/resumen` | `panel.ver` | `{ totalCocheras, bloqueadas, ocupadasAhora, disponiblesAhora, vencenHoy, vencenEn7Dias }` |
|---|---|---|

### `/operational-alerts`
| Verbo y ruta | Permiso | Query / body | Respuesta |
|---|---|---|---|
| GET `/operational-alerts` | `alertas.ver` | `resuelta?, tipo?, severidad?, ocupacionId?, cajaSesionId?, desde?, hasta?` (instantes con zona, sobre `fechaCreacion`), `page=1, pageSize=20` (máx 100) | `PagedResponse<Alerta>` |
| GET `/operational-alerts/{id}` | `alertas.ver` | | `Alerta` |
| PATCH `/operational-alerts/{id}/resolver` | `alertas.resolver` (+ `alertas.resolver_dinero` si `esDeDinero`) | `{ comentario? (≤500; obligatorio en alertas de dinero) }` | **200** `Alerta` |

`Alerta`: `id, tipo, severidad, mensaje, ocupacionId?, cajaSesionId?, esDeDinero, resuelta, fechaCreacion, fechaResolucion?, resolucionAutomatica, resueltaPorUsuarioId?, resueltaPorNombre?, comentarioResolucion?`. Resolver una ya resuelta → 409 `alerta_resuelta`.

- **Orden del listado**: `FechaCreacion` descendente, con `Id` descendente como desempate (`OperationalAlertService.cs:72-75`). Sin `desde`/`hasta` no hay ningún filtro de fecha implícito, y las resueltas viejas siguen apareciendo salvo que se filtre por `resuelta`.
- **`ventanaAlertasDias`** (configuración, 7..90, 30 por defecto) **no limita el listado**: es la ventana hacia atrás que mira el job de control (cada hora) para elegir candidatas a alerta (`DetectorDeAlertas.cs:158-164`, `AlertasControlJob.cs:8`).

**`DEVOLUCION_PENDIENTE`** (relevado del código el 18/11/2026; `Service\AlertaDevolucionPendiente.cs` = ADP). Se crea al cancelar una reserva (`OcupacionService:358`), al finalizar con excedente (`:492`), al programar la baja de un mensual (`ContratoMensualService:182`) y, desde la Tanda A del backend (PB-21), al ajustar a la baja el precio de un mensual (individual o masivo), siempre que `saldoAFavor > 0`. Severidad ALTA; hay una sola abierta por ocupación; el job horario no la crea. **Se resuelve sola (ADP:47-58) al anular un pago o al devolver, solo si el `saldoAFavor` queda <= 0**: una devolución parcial no la resuelve. Al resolverse sola queda con `resolucionAutomatica = true`, comentario "Resuelta al quedar el saldo a favor en 0." y `resueltaPorUsuarioId` = quien operó. **Devolución parcial (PB-13, Tanda A del backend, PR #66, 19/11/2026):** si deja saldo > 0, la alerta abierta se resuelve sola con el comentario "Monto actualizado: quedan X por devolver." y se abre **una nueva** con el monto y la huella actualizados (otro `id` y otra `fechaCreacion`), porque el trigger de la tabla no permite editar el mensaje de una alerta abierta. Cada devolución parcial suma un evento `RESOLUCION_AUTOMATICA` en Trazabilidad. Si el dueño ya había resuelto a mano una alerta con la misma huella, no se abre otra. La resolución manual exige `alertas.resolver_dinero` y un comentario.

Alertas de dinero: `DEVOLUCION_PENDIENTE`, `DIFERENCIA_DE_CAJA`, `FONDO_DISTINTO`, `MENSUAL_IMPAGO`, `OCUPACION_FINALIZADA_SIN_PAGO`, `PAGO_MENOR_AL_ESPERADO`, `PAGO_REGISTRADO_TARDE`.

### `/Trazabilidad` (reemplaza a `/Auditoria`)
| GET `/Trazabilidad` | `auditoria.ver` |
|---|---|

- Query: `ocupacionId?, pagoId?, cajaSesionId?, usuarioId?`, `fuente?` repetible por **nombre** (`fuente=PAGO&fuente=CAJA`), `desde?`, `hasta?` (instantes con zona), `page=1, pageSize=50` (máx 100).
- Reglas (400 `datos_invalidos`): `desde` y `hasta` van juntos; `desde ≤ hasta`; sin `ocupacionId`/`pagoId`/`cajaSesionId` el rango es obligatorio y de máx 31 días.
- Respuesta `PagedResponse<Evento>`: `fecha, fuente, accion, usuarioId?, usuarioNombre?, automatica, ocupacionId?, pagoId?, cajaSesionId?, alertaId?, entidad?, entidadId?, detalle: object`.
- `fuente` (string): `AUDITORIA, PAGO, DEVOLUCION, CAJA, ALERTA`.
- `accion` (string) por fuente:
  - AUDITORIA: `CREAR, EDITAR, CANCELAR, FINALIZAR` (hasta la Tanda A del backend salía `Finalizar`; PB-2 lo corrigió sin migración, y el front sigue normalizando las dos formas), `INVITAR, CAMBIAR_ROL, DESACTIVAR, REACTIVAR, REENVIAR_INVITACION, BORRAR, AJUSTAR_PRECIO, PROGRAMAR_BAJA`.
  - PAGO: `PAGADO, ANULADO`. DEVOLUCION: `DEVOLUCION`. CAJA: `APERTURA, CIERRE, REAPERTURA`. ALERTA: `RESOLUCION, RESOLUCION_AUTOMATICA`.
- `detalle` por fuente:
  - AUDITORIA: `antes`, `despues` (objetos; si no parsearon, `null` y el texto en `antesTexto`/`despuesTexto`).
  - PAGO y DEVOLUCION: `monto, metodo` (nombre), `motivo`.
  - CAJA: los campos de fondo, efectivo y diferencia que tengan valor.
  - ALERTA: `tipo` (nombre), `comentario`.

## 2. Enums (enteros)

| Enum | Valores |
|---|---|
| TipoOcupacion | HORA=1, DIA=2, MES=3 |
| EstadoOcupacion | ACTIVA=1, VENCIDA=2 (solo calculado), CANCELADA=3, FINALIZADA=4 |
| EstadoCochera | DISPONIBLE=1, BLOQUEADA=2, OCUPADA=3, RESERVADA=4 (calculado) |
| MetodoPago | EFECTIVO=1, TRANSFERENCIA=2, TARJETA=3, OTRO=4 |
| EstadoPago | PAGADO=1, ANULADO=2 |
| RolUsuario | DUENO=1, (2 retirado), ENCARGADO=3, OPERADOR=4, AUDITOR=5, SUPERADMIN=6 |
| ModoCaja | DIARIA=1, TURNO=2 |
| ModoMes | CALENDARIO=1, CORRIDO=2, BLOQUES_30=3 |
| FraccionMes | COMPLETO=1, PROPORCIONAL=2 |
| ResolucionExcedente | COBRAR_COMPLETO=1, DEVOLVER=2 |
| EstadoCajaSesion | ABIERTA=1, CERRADA=2 |
| TipoEventoCaja | APERTURA=1, CIERRE=2, REAPERTURA=3 |
| TipoMovimientoCaja | COBRO=1, ANULACION=2, DEVOLUCION=3 |
| SeveridadAlerta | BAJA=1, MEDIA=2, ALTA=3, CRITICA=4 |
| TipoAlertaOperativa | OCUPACION_VENCIDA_SIN_PAGO=1, OCUPACION_VENCIDA_SIN_CIERRE=2, TARIFA_EXCEPCIONAL=3, (4 retirado), OCUPACION_FINALIZADA_SIN_PAGO=5, PAGO_MENOR_AL_ESPERADO=6, PAGO_REGISTRADO_TARDE=7, DEVOLUCION_PENDIENTE=8, DIFERENCIA_DE_CAJA=9, CAJA_SIN_CERRAR=10, FONDO_DISTINTO=11, MENSUAL_IMPAGO=12 |

## 3. Matriz de permisos (rol × permiso)

Fuente: `Authorization/RolPermisos.cs` del backend. SUPERADMIN solo tiene `tenants.*` (sin endpoints HTTP).

| Permiso | DUENO | ENCARGADO | OPERADOR | AUDITOR |
|---|:-:|:-:|:-:|:-:|
| clientes.ver | X | X | X | X |
| clientes.gestionar | X | X | X | |
| cocheras.ver | X | X | X | X |
| cocheras.cambiar_estado | X | X | X | |
| cocheras.gestionar | X | X | | |
| ocupaciones.ver | X | X | X | X |
| ocupaciones.crear | X | X | X | |
| ocupaciones.finalizar | X | X | X | |
| ocupaciones.cancelar | X | X | X | |
| ocupaciones.crear_retroactiva | X | X | | |
| ocupaciones.tarifa_excepcional | X | X | | |
| tarifas.ver | X | X | X | X |
| tarifas.editar | X | | | |
| pagos.ver | X | X | X | X |
| pagos.registrar | X | X | X | |
| pagos.anular | X | X | | |
| pagos.devolver | X | | | |
| caja.ver | X | X | X | X |
| caja.ver_esperado | X | X | X | X |
| caja.abrir | X | X | X | |
| caja.cerrar | X | X | X | |
| caja.reabrir | X | | | |
| alertas.ver | X | X | X | X |
| alertas.resolver | X | X | X | |
| alertas.resolver_dinero | X | | | |
| auditoria.ver | X | | | X |
| panel.ver | X | X | X | X |
| configuracion.ver | X | X | | X |
| configuracion.editar | X | | | |
| usuarios.ver | X | X | | X |
| usuarios.gestionar | X | | | |

El front decide por permiso (`can(...)`), nunca por rol (ARQ-4). La matriz sirve para elegir el permiso de cada ruta y acción.

## 4. Códigos de error

| Status | Códigos |
|---|---|
| 400 | `datos_invalidos`, `operacion_invalida` (título = mensaje de la excepción) |
| 401 | `no_autenticado` |
| 403 | `usuario_no_registrado`, `usuario_inactivo`, `tenant_inactivo`, `sin_permiso` |
| 404 | `cliente_no_encontrado`, `cochera_no_encontrada`, `ocupacion_no_encontrada`, `pago_no_encontrado`, `alerta_no_encontrada`, `tarifa_no_encontrada`, `usuario_no_encontrado`, `caja_sesion_no_encontrada` (status a confirmar) |
| 409 | `cochera_bloqueada`, `cochera_con_ocupacion_activa`, `cochera_no_disponible`, `cochera_numero_repetido`, `cliente_inactivo`, `ocupacion_no_activa`, `ocupacion_ya_iniciada`, `ocupacion_no_iniciada`, `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_no_mensual`, `inicio_retroactivo_sin_permiso`, `pago_supera_saldo`, `pago_anulado`, `pago_con_devoluciones`, `devolucion_supera_pago`, `configuracion_modificada`, `caja_cerrada`, `caja_dia_anterior_abierta`, `caja_ya_abierta`, `caja_no_es_la_ultima`, `caja_abierta`, `alerta_resuelta`, `tarifa_no_configurada`, `tarifa_ya_vigente`, `tarifa_modificada`, `usuario_ya_existe`, `usuario_ya_registrado`, `usuario_ya_desactivado`, `usuario_ya_activo`, `operacion_sobre_uno_mismo`, `ultimo_dueno`, `identidad_sin_vinculo` |
| 500 | `error_interno` |
| 503 | `servidor_ocupado` (reintentar), `proveedor_identidad_no_disponible` |

El status lo da el tipo de excepción de dominio, no el catálogo; los agrupamientos salen de `Errors/CodigosError.cs`.

## 5. Semántica de rangos de fechas y zonas permitidas

Relevado del código de `Service\` del backend el 18/11/2026.

| Endpoint | `desde` | `hasta` | Campo | Cita |
|---|---|---|---|---|
| `GET /Ocupacion` | `Inicio >= desde` | `Fin <= hasta` (**inclusivo**). Con `hasta`, las ocupaciones sin `Fin` quedan **excluidas**. No es un filtro de solapamiento | `Inicio` y `Fin` por separado | `OcupacionService.cs:209,213` |
| `GET /operational-alerts` | `>=` | `<=` (**inclusivo**) | `FechaCreacion` | `OperationalAlertService.cs:64,67` |
| `GET /Trazabilidad` | `>=` | `<=` (**inclusivo**) | `Fecha` en cuatro fuentes; `FechaResolucion` en alertas | `ConsultaDeTrazabilidad.cs:91-92` y siguientes |
| `GET /Caja/sesiones` (`DateOnly`) | inicio del día `desde` | el día `hasta` entra **entero**: el backend compara `< inicio del día siguiente` | `FechaApertura` | `CajaConsultas.cs:77-82` |
| `GET /Cochera/disponibles` | — | **exclusivo**: hay solapamiento si `Inicio < hasta` y `Fin > desde` (`Fin` nulo cuenta como abierta). Exige `hasta > desde` | ocupaciones `ACTIVA` | `DisponibilidadService.cs:68,81-82` |

- **Rango de Trazabilidad**: `hasta − desde > 31 días` → 400. 31 días exactos **pasan**. Solo aplica sin `ocupacionId`/`pagoId`/`cajaSesionId` (`FiltroDeTrazabilidad.cs:13,52`).
- **Rango de Caja/sesiones**: obligatorio; `hasta.DayNumber − desde.DayNumber > 366` → 400 (`CajaConsultas.cs:22,69`). El backend convierte el día a instante con la zona del tenant; si la medianoche no existe, usa la primera hora válida (`ZonasHorarias.cs:44-52`).
- **Consecuencia para el front**: con un `hasta` inclusivo (Ocupación, alertas, Trazabilidad), un "hasta el día D" se manda como el último instante del día D (inicio del día siguiente − 1 ms) o como el inicio del día siguiente, aceptando el borde. Caja/sesiones recibe los `DateOnly` tal cual.

**Zonas permitidas** (`ZonasHorarias.cs:14-28`, comparación exacta): `America/Montevideo`, `America/Argentina/Buenos_Aires`, `America/Argentina/Cordoba`, `America/Argentina/Mendoza`, `America/Sao_Paulo`, `America/Bahia`, `America/Fortaleza`, `America/Belem`, `America/Manaus`, `America/Cuiaba`, `America/Campo_Grande`, `America/Rio_Branco`. Hoy ninguna aplica horario de verano (Uruguay desde 2015, Argentina desde 2009 y Brasil desde 2019), pero la tzdata puede cambiar.

## 6. Sin confirmar

- Status real de `caja_sesion_no_encontrada` (está en el bloque 409 del catálogo pero el nombre sugiere 404).
- Si `PUT /Cochera/{id}/estado` rechaza `OCUPADA`/`RESERVADA`.
- Cuerpo exacto del 403 por policy (`ProblemDetailsAuthorizationResultHandler`); se asume `sin_permiso`.
- Contenido de `CodigosModificado` (qué entidades dan 409 por concurrencia; candidatos `configuracion_modificada`, `tarifa_modificada`).
- Valores de CORS y audience (vienen por configuración, no están en el repo).
