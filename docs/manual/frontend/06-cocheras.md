# Manual — 06 Cocheras

> Cómo funciona la pantalla de Cocheras: alta por rango, edición, bloqueo y estados calculados. Spec: `docs/specs/frontend/06-cocheras.md`. Backend: `docs/inventario/backend.md`, sección `/Cochera` (incluido "Comportamiento"); código: `Service/CocheraService.cs`, `Service/EstadoDeCocheras.cs`.

## Resumen

`/cocheras` muestra una tarjeta por cochera (cliente y horario según el estado), un detalle con nota, ocupación o reserva e historial de 20, y, según el permiso, diálogos para agregar cocheras por rango, editar número y nota, y bloquear o desbloquear. Las horas salen en la zona del local (`useTenantDates().formatInstant`), nunca en la del navegador.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/cocheraApi.js` | `listCocheras`, `getCochera(id, { historialTake })`, `createCocheras`, `updateCochera`, `setEstadoCochera` y `listCocherasDisponibles({ desde, hasta })` (esta última la usa la spec 07; `desde` y `hasta` son `UtcInstant`, `hasta` exclusivo). Las dos listas verifican que la respuesta sea un arreglo (`respuesta_invalida` si no) |
| `src/utils/cocheras.js` | Lógica pura: rango, vista previa, validaciones, cuerpos, texto de vencimiento, acciones por estado, `tarjetaInfo`, códigos que recargan |
| `src/pages/Cocheras.jsx` | Orquestador de estado, diálogos y MUI |

## Estados calculados y qué se puede enviar

`estado` es **entero** y lo **calcula el backend** con prioridad `BLOQUEADA` > `OCUPADA` > `RESERVADA` > `DISPONIBLE`. Solo `DISPONIBLE` (1) y `BLOQUEADA` (2) se envían: con 3 o 4 el backend responde 400 `datos_invalidos` ("Solo se permite DISPONIBLE o BLOQUEADA."). El front usa `EstadoCochera.BLOQUEADA` / `DISPONIBLE` y no tiene ningún `select` de estado.

`ocupacionActiva` **no implica** `OCUPADA`: es la ocupación en curso o, si no hay, la próxima reserva, y una `BLOQUEADA` también puede traerla. `tarjetaInfo(cochera, now)` decide por `estado`; solo en una `BLOQUEADA` con `ocupacionActiva` decide por el `inicio` (`inicio <= now`: ocupada; si no, reservada).

| Estado | Línea principal | Segunda línea | Pie |
|---|---|---|---|
| `DISPONIBLE`, o `BLOQUEADA` sin ocupación | "—" | | |
| `OCUPADA` | cliente | "vence en 2h 30m" / "venció hace 45m" / "Sin hora de fin" | "Hasta dd/mm/yyyy HH:mm" |
| `RESERVADA` | cliente | "Desde dd/mm/yyyy HH:mm" | "Hasta …" |
| `BLOQUEADA` con ocupación | cliente | "ocupada por X" o "reservada desde …" | "Hasta …" |

Una `OCUPADA` o `RESERVADA` sin `ocupacionActiva` se muestra con "—" y el chip del estado. `precioTotal` suele ser `null`: se ve "—" (`formatMoney`).

## Alta por rango (`cocheras.gestionar`)

"Agregar cocheras" abre un diálogo con "Desde" y "Hasta" (opcional). La vista previa (`previewRango`) es la confirmación; "Crear" queda deshabilitado con error o choque.

| Regla | Mensaje |
|---|---|
| "Desde" vacío o no entero | "Ingresá el número de la primera cochera" |
| Fuera de 1 a 999 | "Los números van del 1 al 999" |
| "Hasta" menor que "Desde" | "El \"Hasta\" no puede ser menor que el \"Desde\"" |
| Más de `MAX_ALTA_RANGO` (100) | "Podés crear hasta 100 cocheras por vez" |
| Número ya cargado | "Ya existen las cocheras: 12, 13 …" (hasta 10 y "y N más") |

Los números son solo dígitos (`^\d+$`): `1e2`, `10.5` y `-3` son error. Con "Hasta" vacío o igual a "Desde", `buildCreateBody` manda solo `{ desde }`. El backend hace el alta **todo o nada**, con tope de 100 (`CocheraService.cs:253`, `:267`); un número existente da 409 `cochera_numero_repetido` (el mensaje lista hasta 10, `:254`, `:378-387`); `hasta < desde` da 400 `datos_invalidos` (`:263`). El choque se calcula contra la lista cargada, que puede estar vieja: si otra pestaña creó el número, el backend responde 409, se muestra su `title` y la lista se recarga con el diálogo abierto. Éxito (201, sin `Location`): aviso con la cantidad del arreglo devuelto, cierre y recarga.

## Edición (`cocheras.gestionar`)

"Editar" está en el detalle (el listado no trae `nota`). Número (1 a 999, no repetido contra las **otras** cocheras; el propio no choca) y nota (hasta 300, con contador). Si la cochera está `OCUPADA` o `RESERVADA` se avisa, no se bloquea: el backend no chequea el estado (`CocheraService.cs:322-366`). La nota llega **precargada** porque el `PUT` la reemplaza; `buildUpdateBody` manda la nota recortada o `null` si queda vacía (nunca `""`: `null` borra la nota en el backend y `""` se guarda como cadena vacía).

## Bloquear y desbloquear (`cocheras.cambiar_estado`)

`accionesDeEstado(estado)`: "Bloquear" **solo** desde `DISPONIBLE`; "Desbloquear" solo desde `BLOQUEADA`. En `OCUPADA` el backend responde 409 `cochera_con_ocupacion_activa` (`CocheraService.cs:217-221`); en `RESERVADA` el backend sí permitiría bloquear, pero el front no lo ofrece (DV-FF1: quedaría una cochera bloqueada con una reserva vigente que no se podría usar).

- **Bloquear**: motivo obligatorio (`validateBloqueo`, 1 a 300). Va `{ estado: 2, nota }`. El front valida el largo porque el backend no lo valida en este `PUT`.
- **Desbloquear**: nota opcional **precargada con la actual**; sin tocarla se conserva el motivo. Si se borra a propósito va `nota: null`. Pasar a `DISPONIBLE` solo quita el bloqueo: el estado se recalcula y la cochera puede quedar `OCUPADA` o `RESERVADA`. El aviso dice "Cochera desbloqueada" y la grilla muestra el estado real tras la recarga.

`nota: null` **borra** la nota en el backend (`CocheraService.cs:232`): por eso la precarga.

## Errores por `code`

Todos los `catch` llaman a `showApiError(e)` (muestra el `title` del backend). Después, `shouldReloadAfter(code)` y `shouldCloseDetailAfter(code)`:

| `code` | Después |
|---|---|
| `cochera_no_encontrada` | Recarga la lista y **cierra** el detalle |
| `cochera_numero_repetido`, `cochera_bloqueada`, `cochera_con_ocupacion_activa`, `cochera_no_disponible` | Recarga lista y detalle; el diálogo queda abierto |
| `datos_invalidos`, `operacion_invalida`, `sin_permiso`, otros | Sin recarga |

## Permisos

Se **ocultan** (no se deshabilitan) con `can(...)`, nunca por rol.

| Acción | Permiso | Quién |
|---|---|---|
| Ver grilla, detalle e historial | `cocheras.ver` | DUENO, ENCARGADO, OPERADOR, AUDITOR |
| Bloquear y Desbloquear | `cocheras.cambiar_estado` | DUENO, ENCARGADO, OPERADOR |
| Agregar cocheras y Editar | `cocheras.gestionar` | DUENO, ENCARGADO |
| "Ver trazabilidad" | `auditoria.ver` | DUENO, AUDITOR |

El enlace va en la ocupación o reserva (`ocupacionId`) y en cada fila del historial (el `id` del ítem **es** el id de la ocupación), siempre con `buildTrazabilidadPath({ ocupacionId })`. No hay filtro por cochera (PB-1). El enlace del historial a `/ocupaciones?id=N` no existe (P-FG5, pendiente).

## Carga

La lista y el detalle se piden en `useEffect` con bandera `ignore`: una respuesta vieja se descarta (dos clics seguidos dejan el detalle del último). El detalle pide `historialTake: 20`. Si la lista falla se ve "No pudimos cargar las cocheras" con "Reintentar" (no una grilla vacía). Tras cualquier escritura se recargan lista y detalle. El "vence en…" se refresca cada 60 s con un reloj local.

## PB-4: `DateTime.Now` contra `DateTime.UtcNow` (backend, pendiente)

`CocheraService` calcula el estado del listado y del detalle con `DateTime.Now` por defecto (`CocheraService.cs:31`, `:112`) y `PUT /estado` con `DateTime.UtcNow` (`:209`); `DisponibilidadService.cs:43` y `:71` también usan `UtcNow`. Si el servidor no corre en UTC, el estado que ve la pantalla puede no coincidir con el que valida el backend al bloquear, y una reserva podría verse como ocupada. El front no lo corrige: decide por `estado` y el servidor manda.

## Tests

`test/unit/utils/cocheras.test.js` (tabla de casos de la spec, con `now = 2026-11-18T15:00:00.000Z`) y `test/unit/api/cocheraApi.test.js` (`vi.mock` de `http`: ruta, `params`, cuerpo, `respuesta_invalida`, errores que se propagan). La pantalla y los diálogos se verifican a mano (la spec, sección 7).
