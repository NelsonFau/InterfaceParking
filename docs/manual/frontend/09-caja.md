# Manual — 09 Caja con sesiones

> Cómo funciona la pantalla de Caja: abrir, cerrar con arqueo, reabrir, historial, detalle de una sesión y el widget del Monitor. Spec: `docs/specs/frontend/09-caja.md`. Backend: `docs/inventario/backend.md`, sección `/Caja`.

## Resumen

`/caja` (menú "Caja", permiso `caja.ver`) reemplaza a Caja diaria, que daba 404 porque `GET /Pagos/caja-diaria` ya no existe. `/caja-diaria` redirige a `/caja` (fuera del mapa de rutas, para no duplicar el ítem de menú). La pantalla tiene dos pestañas, "Caja actual" e "Historial", y el detalle de una sesión es un diálogo que se enlaza con `/caja?sesion=N`.

El cliente **no calcula dinero**: el esperado, la diferencia que vale y los totales los manda el backend. La diferencia que se ve al escribir el contado es solo una vista previa.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/cajaApi.js` | `getCajaActual`, `listCajaSesiones`, `getCajaSesion`, `getCajaEsperado`, `openCaja`, `closeCaja`, `reopenCaja` (JSDoc con los tipos). `getCajaActual` y `getCajaSesion` lanzan `respuesta_invalida` si la forma no es la esperada |
| `src/utils/caja.js` | Lógica pura: vista según el modo, acciones por permiso, validaciones, rango del historial, campos de eventos, errores por `code` |
| `src/utils/cajaLink.js` | `buildCajaPath(id)` y `parseCajaSesionId(search)`; re-exporta `CAJA_PATH` |
| `src/pages/Caja.jsx` | Página delgada: título, pestañas y el diálogo de detalle según `?sesion=N` |
| `src/componentes/caja/CajaActualPanel.jsx` | Pestaña "Caja actual" |
| `src/componentes/caja/CajaHistorialPanel.jsx` | Pestaña "Historial" |
| `src/componentes/caja/AbrirCajaDialog.jsx`, `CerrarCajaDialog.jsx`, `ReabrirCajaDialog.jsx` | Las tres escrituras |
| `src/componentes/caja/SesionDetalleDialog.jsx` | Detalle: resumen, eventos, movimientos, acciones |
| `src/componentes/caja/TotalesPorMetodo.jsx` | Tabla de cobros, anulaciones y devoluciones por método |
| `src/componentes/caja/CajaWidget.jsx` | Tarjeta "Caja" del Monitor operativo |
| `src/componentes/caja/useCajaEsperado.js` | Hook que pide el esperado en vivo (lo comparten el panel, el cierre y el detalle) |

`caja.js` y `cajaLink.js` no tienen React ni estado: `can` es un parámetro y el "hoy" entra como `DateOnly`. Los tests (`test/unit/utils/caja.test.js`, `cajaLink.test.js`, `test/unit/api/cajaApi.test.js`) siguen la tabla de casos de la spec (1 a 41).

## Los dos modos y qué ve el usuario

`modoCaja` sale **solo de `GET /Caja/actual`** (el OPERADOR no tiene `configuracion.ver`) y se muestra como chip ("Diaria" o "Por turno"). `cajaVista(actual, { hoy, aperturaDia })` decide el estado:

| Modo | Estado | Qué se ve |
|---|---|---|
| DIARIA | Sin sesión | "Todavía no hay caja hoy. Se abre sola con el primer cobro; abrila a mano si querés declarar el fondo." Botón "Abrir caja" y el fondo propuesto |
| DIARIA | Abierta hoy | La tarjeta de la sesión: desde cuándo, fondo inicial, esperado y totales por método, "Cerrar caja" |
| DIARIA | Abierta de un día anterior | Lo mismo, con un aviso: "La caja del día D sigue abierta. Hasta que la cierres no se puede cobrar, anular ni devolver" |
| TURNO | Sin sesión | "No hay un turno abierto. Abrí la caja para poder cobrar." |
| TURNO | Abierta | La tarjeta; el turno puede cruzar la medianoche, **sin** aviso de día anterior |

El aviso de día anterior es de solo lectura: el backend es la autoridad (`caja_dia_anterior_abierta`). El esperado se pide aparte (`caja.ver_esperado`); si falla, la tarjeta se ve igual con "No pudimos cargar el esperado". Si falla la caja, "No pudimos cargar la caja" con "Reintentar" (la otra pestaña no se vacía).

## Abrir

"Abrir caja" (con `caja.abrir` y sin sesión abierta) sirve en **los dos modos**. Pide `fondoInicial` (precargado con el fondo propuesto; 0 permitido, hasta 10.000.000, 2 decimales) y una observación (hasta 500). Si el fondo difiere del que quedó, el campo se rotula "obligatoria" y avisa que se alerta al dueño, **pero no bloquea**: la regla es del backend, que contesta 400 `errors.Observacion` y se marca el campo (y crea la alerta `FONDO_DISTINTO`).

## Cerrar con arqueo

"Cerrar caja" (con `caja.cerrar`, sesión ABIERTA; desde la caja actual y desde el detalle). El diálogo carga el esperado **antes de contar** (fondo inicial, totales por método, efectivo esperado) y tiene "Actualizar esperado". Se escribe el contado, el fondo que queda (acompaña al contado mientras no se toque) y la observación. Con contado y esperado, muestra la **diferencia informativa** (`diferenciaVista`, en centavos; "sobra", "falta" o "sin diferencia").

El cliente no valida lo que es del backend: que el fondo siguiente no supere lo contado (400 `errors.FondoSiguiente`) ni que haya observación si hay diferencia (400 `errors.Observacion`). El backend calcula el esperado con el candado de la caja, así que incluye todo lo confirmado antes del cierre. Éxito: el diálogo pasa a un resultado con lo que devolvió el backend (contado, esperado, diferencia, fondo que queda, observación, totales); con diferencia avisa "Se creó una alerta de diferencia de caja" y, con `alertas.ver`, enlaza a las alertas. Al cerrar el resultado se recarga la caja actual.

## Reabrir

En el detalle de una sesión CERRADA, con `caja.reabrir` (solo DUENO) y **sin otra sesión abierta**. Pide el motivo (obligatorio, hasta 250). Avisa: en DIARIA, "mientras esta caja de un día anterior esté abierta no se puede cobrar; cerrala cuando termines"; en TURNO, que hay que cerrarla de nuevo. El cliente no decide si es "la última cerrada": el backend contesta 409 `caja_no_es_la_ultima`. Al volver a cerrar se agrega otro CIERRE al historial y el resumen muestra el último (`cierreVigente`).

## Historial

Filtro `desde`/`hasta` (`DateOnly` en la zona del tenant), por defecto los últimos 30 días (`rangoPorDefecto`). Los `DateOnly` van al backend tal cual; el día `hasta` entra entero. `validateRango` exige los dos y `desde <= hasta`; **no** valida el tope de 366 días (el 400 `errors.Hasta` del backend se marca en el campo). Tabla paginada (`usePagination`) con #, Estado, Apertura y Fondo inicial; un clic abre el detalle. "Buscar" vuelve a la página 1.

## Detalle de una sesión y `/caja?sesion=N`

`SesionDetalleDialog` carga `GET /Caja/sesiones/{id}` (y la caja actual, solo para saber si hay otra abierta y el modo). Secciones: cabecera; **resumen** (abierta: esperado en vivo y totales; cerrada: el último CIERRE con contado, esperado, diferencia, fondo siguiente, observación y el snapshot por método); **eventos** (el historial tal cual, con tipo, fecha, usuario, "Automática", campos del tipo y "Distinto del que quedó" en una apertura con fondo distinto); **movimientos** (solo con la sesión cerrada: `movimientos` es `null` si está abierta). Los movimientos se muestran completos, sin paginar, en el orden recibido y sin sumar nada; una anulación de un pago de otra sesión lleva el chip "Pago de otra sesión". El usuario se muestra "Vos" o "Usuario #id" (el backend no manda el nombre).

Se enlaza siempre con `buildCajaPath(id)` (`/caja?sesion=N`) y se lee con `parseCajaSesionId`; un valor que no es un entero positivo se ignora y la pantalla se abre normal. Abrir y cerrar el diálogo usa `replace` (como `/ocupaciones?id=N`). Un 404 `caja_sesion_no_encontrada` cierra el diálogo y quita el parámetro.

## Contrato con `PagoDetalleDialog` (spec 08)

En la tabla de movimientos, "#pagoId" es un enlace con `pagos.ver` (sin ese permiso, texto). Abre `PagoDetalleDialog` con **solo** `pagoId` sobre el detalle de la sesión. La anulación y la devolución caen en la sesión **actual**, no en la del pago, así que su `onChanged` **no recarga** el detalle de la sesión cerrada: solo avisa a la pantalla para que recargue la caja actual y el historial.

## Widget del Monitor

`CajaWidget` se monta en `OperationalDashboard.jsx` debajo de los indicadores, solo con `can("caja.ver")`, y recibe el `reloadKey` del Monitor. Muestra el modo, "Sin caja abierta" o "Caja abierta desde … · Fondo inicial …", el efectivo esperado (con `caja.ver_esperado`), el aviso de día anterior en DIARIA, y "Ir a Caja". Es autónomo: si falla, "No se pudo cargar la caja" con "Reintentar", sin toast, y el resto del Monitor sigue. `/operaciones` sigue exigiendo `alertas.ver` (todo rol con `alertas.ver` tiene `caja.ver`; P-FA4 cerrado).

## Enlace desde alertas

`getAlertLinks(alerta, { canTrazabilidad, canOcupaciones, canCaja })` suma "Ver caja" (`/caja?sesion=N`) con `caja.ver` y `cajaSesionId` positivo, después de "Ver ocupación" y antes de "Ver trazabilidad". Cubre `CAJA_SIN_CERRAR`, `DIFERENCIA_DE_CAJA` y `FONDO_DISTINTO`.

## Permisos

Se oculta, nunca se deshabilita, y se decide por permiso (nunca por rol).

| Acción | Condición |
|---|---|
| Entrar a `/caja`, ver sesión actual, historial, detalle y movimientos | `caja.ver` |
| Esperado en vivo y totales de una sesión abierta | `caja.ver_esperado` |
| "Abrir caja" | `caja.abrir` y sin sesión abierta |
| "Cerrar caja" | `caja.cerrar` y sesión ABIERTA |
| "Reabrir" | `caja.reabrir`, sesión CERRADA y sin sesión abierta |
| Abrir un pago desde un movimiento | `pagos.ver` |
| "Ver trazabilidad" (`buildTrazabilidadPath({ cajaSesionId })`) | `auditoria.ver` |
| "Ver caja" en una alerta; widget del Monitor | `caja.ver` |

El DUENO hace todo; el ENCARGADO y el OPERADOR abren y cierran pero no reabren; el AUDITOR solo mira.

## Errores por `code`

Todos los `catch` llaman a `showApiError` (el `title` del backend tal cual). Una escritura no es idempotente: el diálogo conserva lo escrito y el reintento es manual. `cajaFieldErrors` mapea las claves PascalCase (`FondoInicial`, `EfectivoContado`, `FondoSiguiente`, `Observacion`, `Motivo`, `Desde`, `Hasta`) a los campos.

| `code` | Qué hace la pantalla |
|---|---|
| `datos_invalidos` | Marca el campo con el primer mensaje; el diálogo queda abierto |
| `caja_ya_abierta`, `caja_cerrada`, `caja_no_es_la_ultima` | Cierra el diálogo de la acción y recarga (caja actual y detalle) |
| `caja_sesion_no_encontrada` | Cierra la acción y el detalle, quita `?sesion` y recarga |
| `caja_dia_anterior_abierta` | No sale de estas acciones (es de cobrar, anular y devolver): solo el aviso |
| `sin_permiso`, `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Aviso; conserva lo escrito |

`shouldReloadAfterCaja` y `shouldCloseActionAfterCaja` (los cuatro códigos de estado viejo) y `shouldCloseDetailAfterCaja` (404) son puras.

## Lo que le queda al backend

- **PB-15:** el ítem de `GET /Caja/sesiones` no trae `fechaCierre` ni `diferencia`; la lista no puede mostrar "cerró con diferencia" sin abrir el detalle.
- **PB-16:** `GET /Caja/sesiones/{id}` devuelve los movimientos sin paginar ni tope.
- **PB-17:** el nombre del usuario en `historial[]` y `movimientos[]`.

## Verificación manual

Pendiente con el backend en marcha: sección 7 de la spec (casos 2 a 27). Hacen falta datos de prueba (P-FI6): un tenant DIARIA y otro TURNO, una sesión cerrada con diferencia, una reabierta y vuelta a cerrar, una anulación de un pago de otra sesión y una sesión DIARIA de un día anterior abierta.
