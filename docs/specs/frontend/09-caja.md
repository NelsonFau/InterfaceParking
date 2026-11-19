# 09 — Caja con sesiones: abrir, cerrar con arqueo, reabrir, historial y widget del Monitor

> Frontend · **Aprobada** (19/11/2026) · `feature/specs-etapa6` (esta spec) y `feature/front-caja` (ejecución, en el repo principal sin worktree, a crear desde `develop`) · Última actualización 19/11/2026
>
> Novena spec del frontend. **Reemplaza `CajaDiaria.jsx`**, que hoy da 404 porque `GET /Pagos/caja-diaria` ya no existe, por una pantalla de **Caja con sesiones** sobre `/Caja`: la sesión actual (abrir y cerrar con arqueo), el historial paginado, el detalle de una sesión con sus eventos y movimientos, y la reapertura. **Repone el widget de caja en el Monitor operativo**, que la 05 sacó para que el 404 no lo tirara abajo, y **retira** el export `@deprecated` `pagosApi` y las excepciones de lint de `CajaDiaria.jsx`. **Depende de la 02** (fechas con zona del tenant, enums, `formatMoney`, paginación, patrón de módulos de API), de la **04** (`buildTrazabilidadPath` con `cajaSesionId`), de la **05** (el Monitor sin caja y `getAlertLinks`) y de la **08** (`PagoDetalleDialog` con solo un `pagoId`, `usuarioLabel`, `moneyToCents`); todas ya están ejecutadas en `develop`.
>
> **Estado de las decisiones.** Las **D-FI1 a D-FI20 están Confirmadas**: las preguntas de producto P1 a P7 las aprobó el desarrollador el 19/11/2026 (por el Orquestador), el comportamiento del backend está relevado del código (sección 2.2) y las dudas E1 y E2 están contestadas. Nada queda en Propuesta. Lo que sigue **pendiente de confirmación** está marcado en la sección 4.2.

## 1. Objetivo y alcance

**Objetivo.** Que el personal opere la caja por sesiones: ver si hay una caja abierta y con cuánto efectivo se espera, abrirla (declarando el fondo), cerrarla con arqueo (contado contra esperado, con la diferencia a la vista), revisar sesiones pasadas con sus eventos y movimientos, y que el dueño pueda reabrir la última cerrada. Los dos modos del tenant, **DIARIA** y **TURNO**, se comportan distinto y la pantalla lo explica sin que el usuario tenga que conocer la configuración. Cada usuario ve solo lo que su permiso le deja hacer.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulo de API | `src/api/cajaApi.js`: `getCajaActual`, `listCajaSesiones`, `getCajaSesion`, `getCajaEsperado`, `openCaja`, `closeCaja`, `reopenCaja` | D-FI2 |
| Pantalla | `src/pages/Caja.jsx` en `/caja` (menú "Caja"), dos pestañas: "Caja actual" e "Historial". `/caja-diaria` redirige | D-FI3, D-FI4 |
| Caja actual | Estado por modo (DIARIA y TURNO), esperado en vivo por método, abrir y cerrar | D-FI5, D-FI6, D-FI7 |
| Cierre con arqueo | Contado, fondo siguiente, observación; diferencia informativa; resultado del cierre | D-FI7 |
| Historial | Filtro `desde`/`hasta` (`DateOnly`), tabla paginada | D-FI9 |
| Detalle de sesión | Diálogo con resumen, eventos y movimientos; `/caja?sesion=N` | D-FI10 |
| Reabrir | Solo el dueño, sobre una sesión cerrada | D-FI8 |
| Contrato 08 ↔ 09 | El `pagoId` de un movimiento abre `PagoDetalleDialog` | D-FI11 |
| Widget del Monitor | Tarjeta "Caja" en `OperationalDashboard.jsx` | D-FI12 |
| Contrato 05 ↔ 09 | "Ver caja" en `getAlertLinks` | D-FI13 |
| Permisos y errores | Acciones ocultas por permiso; errores por `code` | D-FI14, D-FI15 |
| Retiro de lo viejo | `CajaDiaria.jsx`, export `pagosApi`, excepciones de lint | D-FI17 |
| Código | Lógica pura en `src/utils/caja.js` y `src/utils/cajaLink.js`, probada con Vitest | D-FI19 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Registrar, anular y devolver pagos | Specs 07 y 08. Si un cobro da `caja_cerrada` o `caja_dia_anterior_abierta`, esas pantallas muestran el `title`; la 09 es donde se arregla (abrir o cerrar la caja) |
| Cambiar `modoCaja` | Spec 11 (`/configuracion`). La 09 solo lo **lee** de `GET /Caja/actual` |
| Resolver las alertas de caja (`DIFERENCIA_DE_CAJA`, `FONDO_DISTINTO`, `CAJA_SIN_CERRAR`) | Spec 05. La 09 solo agrega el enlace "Ver caja" |
| Mostrar en el historial la diferencia o la fecha de cierre sin abrir el detalle | El ítem de `GET /Caja/sesiones` no las trae (PB-15, sección 4.2) |
| Paginar o filtrar los movimientos de una sesión | El backend los manda completos (PB-16); se muestran en una tabla con scroll |
| Nombre del usuario en eventos y movimientos | El backend manda solo `usuarioId` (PB-17); se muestra "Vos" o "Usuario #id" |
| Reporte contable, exportación | Sin pedido |
| Rediseño visual | Después, con el diseño nuevo |

**Estado de alcance.** Etapa 6 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` con las specs 02 a 08, 11 y 12 ejecutadas; backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, `/Caja` | Endpoints, DTOs, permisos, cuerpo de cada acción | 18/11/2026 |
| `docs/inventario/backend.md`, `/Configuracion`, tabla "Significado de cada campo" | `modoCaja` DIARIA y TURNO | 18/11/2026 |
| `docs/inventario/backend.md`, `/Pagos`, `/operational-alerts`, secciones 2 a 5 | `caja_cerrada` y `caja_dia_anterior_abierta` en pagos; alertas de caja; `ModoCaja`, `EstadoCajaSesion`, `TipoEventoCaja`, `TipoMovimientoCaja`; matriz de permisos (`caja.*`); códigos 409; rango de `Caja/sesiones` (`DateOnly`, ≤ 366 días, el día `hasta` entra entero) | 18/11/2026 |
| `docs/inventario/brechas-front.md`, "Contratos entre specs" y "Widget de caja del Monitor operativo" | 08 ↔ 09 (`PagoDetalleDialog` con `pagoId`), widget del Monitor, `modoCaja` desde `/Caja/actual`, retiro de `getCajaDiaria`, P-FA4 | 18/11/2026 |
| Spec 08 (`08-pagos.md`), D-FH2, D-FH5, D-FH13, C3 | Export `pagosApi` temporal, `usuarioLabel`, `PagoDetalleDialog({ pagoId, onClose, onChanged, ocupacion? })`, "otra sesión de caja" | 19/11/2026 |
| Spec 05 (`05-alertas.md`) y `src/utils/alertas.js` | Monitor sin caja (`allSettled`), `getAlertLinks` con el comentario "la 09 suma acá el suyo (P-FE1)" | 19/11/2026 |
| Spec 04 (`04-trazabilidad.md`), D-FD5 | `buildTrazabilidadPath({ cajaSesionId })`, enlace solo con `auditoria.ver` | 19/11/2026 |
| Spec 02 (`02-base-comun.md`) | D-FB14 (módulos de API), `useTenantDates`, `formatMoney`, `normalizePaged`, `usePagination`, `cleanParams`, tabla 5.4 de excepciones de lint | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), lógica pura con Vitest (D-FA4) | 09/11/2026 |
| Lectura de `src/pages/CajaDiaria.jsx`, `src/pages/OperationalDashboard.jsx`, `src/api/pagosApi.js`, `src/auth/routes.js`, `src/App.jsx`, `src/utils/alertas.js`, `eslint.config.js`, `test/unit/api/pagosApi.test.js` y `test/unit/auth/routes.test.js` | Estado actual (sección 2.1) | 19/11/2026 |
| Lectura del backend (Redac 09-10): `CajaController.cs`, `CajaService.cs`, `CajaConsultas.cs`, `SesionesDeCaja.cs`, `CuentaDeCaja.cs`, `Models\Dtos\Caja\CajaDtos.cs`, `Errors\CodigosError.cs`, `Errors\ExcepcionDeDominio.cs` | Comportamiento (sección 2.2) | 19/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Tabs`, `Dialog`, `Table`, `Chip`, `Alert`, `TextField`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| `src/pages/CajaDiaria.jsx` | Pide `pagosApi.getCajaDiaria(fecha)` (endpoint retirado, 404), lee `e.response.data.error` (campo que la API ya no manda), anula sin pasar el motivo, usa `toLocaleString`, `new Date().toISOString().slice(0, 10)` y copias locales de `money`, `fmtDate` y `METODOS_PAGO`. Tiene dos excepciones de lint en `eslint.config.js` (`sinToLocale` y `no-unused-vars`) |
| `src/api/pagosApi.js` | Funciones nombradas desde la 08 y, al final, el export `pagosApi` `@deprecated` (`getCajaDiaria`, `anular`) que solo usa `CajaDiaria.jsx` |
| `test/unit/api/pagosApi.test.js` | El bloque `describe("pagosApi (export de compatibilidad @deprecated…)")` (desde la línea 111) y el import de `pagosApi` |
| `src/auth/routes.js` | `{ path: "/caja-diaria", label: "Caja diaria", permiso: "caja.ver" }` y un comentario de P-FA4 que apunta a la 09. `/operaciones` exige `alertas.ver` |
| `src/App.jsx` | `PAGES["/caja-diaria"] = CajaDiaria`; la redirección de `/auditoria` es el modelo para una ruta vieja |
| `src/pages/OperationalDashboard.jsx` | Sin caja desde la 05: cinco tarjetas de alertas y las críticas recientes, con `Promise.allSettled` y `reloadKey` |
| `src/utils/alertas.js` | `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones })`; el comentario del JSDoc dice que la 09 suma el suyo (P-FE1). Ya recibe `cajaSesionId` en la alerta |
| `src/constants/enums.js` | Ya declara `ModoCaja`, `EstadoCajaSesion`, `TipoEventoCaja` y `TipoMovimientoCaja` (con etiquetas y colores) |
| `src/componentes/pagos/PagoDetalleDialog.jsx` | Se abre con `{ pagoId, onClose, onChanged, ocupacion? }`, usa `usePermissions()` y `getOcupacion` si hace falta |
| `src/utils/pagos.js` | `moneyToCents`, `centsToMoney` y `usuarioLabel(usuarioId, meUsuarioId)`; la 09 los **reutiliza** |
| `src/utils/ocupaciones.js` | `fieldErrorsFromApi` usa un mapa de campos propio de Ocupación (`API_FIELDS`): **no sirve** para los campos de caja (iría todo a `general`); la 09 trae su mapa (D-FI15) |
| Caja con sesiones | No existe ninguna pantalla ni función contra `/Caja` |

### 2.2 Lo que hace el backend (relevamiento E del código, 19/11/2026)

Abreviaturas (rutas relativas a `ParkingControl\ParkingControl\`): CC = `Controllers\CajaController.cs`, CS = `Service\CajaService.cs`, CQ = `Service\CajaConsultas.cs`, SDC = `Service\SesionesDeCaja.cs`, CDC = `Service\CuentaDeCaja.cs`, DTO = `Models\Dtos\Caja\CajaDtos.cs`. Leído del código, sin confirmar por tests.

| Id | Tema | Comportamiento | Afecta a |
|---|---|---|---|
| E-a | Modos | **DIARIA:** sin sesión abierta, el primer movimiento (cobro, anulación o devolución) abre una sola, con `Automatica = true`, fondo = el que quedó y sin observación (SDC:37-66). Si la abierta es de un día local anterior a hoy, todo movimiento da 409 `caja_dia_anterior_abierta` (SDC:68-72). **TURNO:** sin sesión abierta, 409 `caja_cerrada`; una sesión puede cruzar la medianoche y no se rechaza (SDC:39-40, 20). A lo sumo **una sesión ABIERTA por tenant** | D-FI5 |
| E-b | Abrir (`POST /Caja/abrir`, `caja.abrir`) | Sirve en **los dos modos** (CS no mira el modo). 409 `caja_ya_abierta` si ya hay una abierta. `fondoInicial` con `[Dinero(PermiteCero = true)]` (≥ 0, 2 decimales, hasta 10.000.000). Si `fondoInicial` ≠ el fondo que quedó, la `observacion` es obligatoria (400 `errors.Observacion`: "El fondo difiere del que quedó en el último cierre: explicá el motivo en la observación.") y se crea la alerta `FONDO_DISTINTO` (ALTA). `observacion` ≤ 500, con `Trim`. 201 con `CajaSesion` (CS:46-105) | D-FI6 |
| E-c | Cerrar (`POST /Caja/sesiones/{id}/cerrar`, `caja.cerrar`) | Orden: 404 `caja_sesion_no_encontrada` → 409 `caja_cerrada` (la sesión no está abierta) → 400 `errors.FondoSiguiente` ("El fondo que queda no puede superar el efectivo contado.") → 400 `errors.Observacion` si contado ≠ esperado ("El efectivo contado difiere del esperado: explicá el motivo en la observación."). El esperado lo calcula el backend **con el candado de la caja**, así que incluye todo lo confirmado antes. `efectivoContado` y `fondoSiguiente` con `[Dinero(PermiteCero = true)]`. Con diferencia ≠ 0 crea `DIFERENCIA_DE_CAJA` (ALTA); resuelve sola `CAJA_SIN_CERRAR` de la sesión. 200 con `CierreCaja` (CS:107-206) | D-FI7 |
| E-d | Reabrir (`POST /Caja/sesiones/{id}/reabrir`, `caja.reabrir`) | Solo **DUENO**. Orden: 400 `errors.Motivo` (obligatorio, ≤ 250, con `Trim`; solo espacios falla) → 404 → 409 `caja_ya_abierta` (hay otra abierta) → 409 `caja_no_es_la_ultima` ("Solo se puede reabrir la última sesión cerrada."). No mira el modo ni el día: **en DIARIA, reabrir una sesión de un día anterior bloquea todo movimiento hasta cerrarla** (`caja_dia_anterior_abierta`). **Intencional** (respuesta del Orquestador a E1). Registra un evento REAPERTURA; al volver a cerrar se agrega un CIERRE nuevo al historial (CS:208-253) | D-FI8 |
| E-e | `GET /Caja/actual` (`caja.ver`) | `{ modo, sesion?, fondoPropuesto? }`. `modo` sale de la configuración (o el defecto) y **no exige `configuracion.ver`**. `fondoPropuesto` solo viene sin sesión abierta (el `fondoSiguiente` del último cierre, o 0). Nunca trae esperados (CQ:36-56) | D-FI5, D-FI6 |
| E-f | `GET /Caja/sesiones` (`caja.ver`) | `desde` y `hasta` **obligatorios** (400 `errors.Desde` / `errors.Hasta`); `hasta` anterior a `desde` o rango > 366 días (`hasta.DayNumber − desde.DayNumber > 366`) dan 400 `errors.Hasta`. El día `hasta` entra **entero**; orden `fechaApertura` descendente con `id` descendente; `page` desde 1, `pageSize` por defecto 20 y **máximo 200**. Ítem = `CajaSesion` (`id, estado, fechaApertura, fondoInicial`): **sin fecha de cierre ni diferencia** (CQ:58-100) | D-FI9 |
| E-g | `GET /Caja/sesiones/{id}` (`caja.ver`) | `{ sesion, historial[], movimientos? }`. `historial` en orden de `id` (cronológico ascendente), cada fila con `tipo`, `fecha`, `usuarioId`, `automatica`, `motivo?`, `observacion?` y, según el tipo: APERTURA (`fondoDeclarado`, `fondoQueQuedo`), CIERRE (`efectivoContado`, `efectivoEsperado`, `diferencia`, `fondoSiguiente`, `totales[]` = snapshot por método). **`movimientos` es `null` con la sesión ABIERTA** y completo (sin paginar ni tope) con la CERRADA, ordenado por fecha y tipo; cada uno trae `pagoId`, `monto`, `metodo`, `usuarioId` y `dePagoDeOtraSesion` (solo vale en las ANULACION). Un id de otro tenant da 404 (CQ:102-119, 146-194) | D-FI10, D-FI11 |
| E-h | `GET /Caja/sesiones/{id}/esperado` (`caja.ver_esperado`) | `{ sesionId, estado, fondoInicial, totales[], efectivoEsperado }` en vivo. `totales` trae **solo los métodos con movimientos**. `efectivoEsperado = fondoInicial + cobros − anulaciones − devoluciones`, **solo en EFECTIVO**; la anulación y la devolución caen en la sesión **actual**, no en la del pago (CDC:62-67; CQ:121-140). `caja.ver_esperado` lo tienen los cuatro roles | D-FI6, D-FI7 |
| E-i | Permisos (matriz, sección 3) | `caja.ver`: todos. `caja.ver_esperado`: todos. `caja.abrir` y `caja.cerrar`: DUENO, ENCARGADO y OPERADOR. `caja.reabrir`: solo DUENO. El AUDITOR solo ve. Todo el que tiene `alertas.ver` tiene `caja.ver` | D-FI14 |
| E-j | Errores | 404 `caja_sesion_no_encontrada` (`NoEncontradoException` = 404; el inventario lo tenía "a confirmar"). 409: `caja_ya_abierta`, `caja_cerrada`, `caja_no_es_la_ultima`, `caja_dia_anterior_abierta`. 400 `datos_invalidos` con `errors.Observacion`, `FondoInicial`, `EfectivoContado`, `FondoSiguiente`, `Motivo`, `Desde`, `Hasta` (PascalCase). `caja_abierta` es de `/Configuracion` (cambiar zona o modo con una caja abierta), no de `/Caja` | D-FI15 |
| E-k | DTOs sin nombre | `historial[]` y `movimientos[]` traen solo `usuarioId` (ninguno trae el nombre; el OPERADOR no tiene `usuarios.ver`). Enums como enteros: `modo` (1 DIARIA, 2 TURNO), `estado` (1 ABIERTA, 2 CERRADA), `tipo` de evento (1 APERTURA, 2 CIERRE, 3 REAPERTURA), `tipo` de movimiento (1 COBRO, 2 ANULACION, 3 DEVOLUCION), `metodo` | D-FI10 |

**Consecuencias para el front.** (1) El cliente **no calcula** el esperado ni la diferencia que vale: los muestra del backend; la diferencia de la vista previa del cierre es informativa. (2) La observación obligatoria (fondo distinto, diferencia) la decide el backend: el cliente la marca como "obligatoria si…" y **no bloquea** (D-FI16). (3) Que una sesión sea "la última cerrada" la decide el backend (`caja_no_es_la_ultima`): el cliente solo oculta "Reabrir" si ya hay una caja abierta, dato que ya tiene. (4) Los movimientos no se suman ni se ordenan en el cliente. (5) La lista del historial no puede mostrar la diferencia ni el cierre: eso se ve en el detalle (PB-15).

## 3. Decisiones

Prefijo **D-FI** ("frontend, caja"). Estado: **Confirmada** (la tomó el desarrollador o la fija una fuente) o **Propuesta**. En esta spec todas están Confirmadas. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulo de API

**D-FI1 (19/11/2026) — Confirmada. Rama y ejecución.** La spec vive en `feature/specs-etapa6`. La ejecución va en `feature/front-caja`, en el repo principal (`parkingcontrol-front`, **sin worktree**), creada desde `develop` (se confirma con `git branch -a`), con **un commit por spec** y un PR a `develop`. La verificación (`npm test`, `npm run lint` y `npm run build`) se corre **solo al final**, no por paso. Antes del PR, `git rebase develop`. Las reglas generales siguen: permisos con `can(...)`, errores con `showApiError` y decisión por `code`, fechas en la zona del tenant, enums como enteros, el cliente valida solo formato y largo, lógica pura con tests de Vitest y patrón D-FB14 en los módulos de API.

**D-FI2 (19/11/2026) — Confirmada. `src/api/cajaApi.js`.** Un módulo nuevo, en el patrón D-FB14: funciones `async` nombradas que devuelven `data`, con JSDoc tomado del inventario, sin capturar errores y sin convertir fechas ni enums.

| Función | Endpoint | Devuelve |
|---|---|---|
| `getCajaActual()` | `GET /Caja/actual` | `{ modo, sesion?, fondoPropuesto? }` |
| `listCajaSesiones({ desde, hasta, page, pageSize })` | `GET /Caja/sesiones` (`desde` y `hasta` son `DateOnly`, tal cual; `params` con `cleanParams`) | `normalizePaged(data)` de `CajaSesion` |
| `getCajaSesion(id)` | `GET /Caja/sesiones/{id}` | `{ sesion, historial, movimientos }` |
| `getCajaEsperado(id)` | `GET /Caja/sesiones/{id}/esperado` | `{ sesionId, estado, fondoInicial, totales, efectivoEsperado }` |
| `openCaja(body)` | `POST /Caja/abrir` con `{ fondoInicial, observacion? }` | `CajaSesion` (201) |
| `closeCaja(id, body)` | `POST /Caja/sesiones/{id}/cerrar` con `{ efectivoContado, fondoSiguiente, observacion? }` | `CierreCaja` |
| `reopenCaja(id, body)` | `POST /Caja/sesiones/{id}/reabrir` con `{ motivo }` | `CajaSesion` |

`getCajaActual` y `getCajaSesion` verifican la forma mínima (un objeto con `modo`; un objeto con `sesion` e `historial` arreglo) y, si no, lanzan `ApiError` con `code: "respuesta_invalida"`, como `listOcupaciones`; `movimientos` se acepta `null` o arreglo. Se prueba con `vi.mock` de `http` (ruta, método, cuerpo, parámetros, que no capture errores).
*Motivo:* un módulo por controller (`Caja` → `cajaApi`), como fija la D-FB14.

**D-FI3 (19/11/2026) — Confirmada (P1 aprobada). Ruta `/caja` y menú "Caja".** `PRIVATE_ROUTES` pasa de `{ path: "/caja-diaria", label: "Caja diaria", permiso: "caja.ver" }` a `{ path: CAJA_PATH, label: "Caja", permiso: "caja.ver" }`, con `CAJA_PATH = "/caja"` exportada desde `src/auth/routes.js` (una constante para el mapa y para el contrato de enlace, como `OCUPACIONES_PATH`). En `App.jsx`, `PAGES["/caja"] = Caja` y una redirección `/caja-diaria` → `/caja` (`<Navigate replace>`, fuera del mapa, como `/auditoria`, para no duplicar el ítem de menú; sin query). Se actualiza el comentario de P-FA4 de `routes.js` (D-FI12). `test/unit/auth/routes.test.js` cambia la fila `["/caja-diaria", "caja.ver"]` por `["/caja", "caja.ver"]`.
*Motivo:* "Caja diaria" miente en modo TURNO.
*Descartada:* conservar `/caja-diaria` con la etiqueta "Caja" (URL engañosa; ahorra solo la redirección).

**D-FI4 (19/11/2026) — Confirmada (P2 aprobada). Una pantalla con dos pestañas y el detalle en un diálogo.** `src/pages/Caja.jsx` es una página delgada: título, `Tabs` ("Caja actual" e "Historial") y los paneles `CajaActualPanel` y `CajaHistorialPanel`. La pestaña activa y los filtros viven en el estado de la página (nada de `localStorage`, ARQ-1). El **detalle de una sesión** es `SesionDetalleDialog`, un diálogo sobre la pantalla, y se enlaza con **`/caja?sesion=N`** (la misma idea que `/ocupaciones?id=N`): el parámetro `sesion` abre el diálogo sobre la pestaña activa y cerrarlo lo quita (`replace`). Se enlaza siempre con `buildCajaPath(sesionId)` de `src/utils/cajaLink.js`, nunca con un string armado a mano; `parseCajaSesionId(search)` (pura) valida el parámetro y devuelve `null` si no es un entero positivo (entonces la pantalla se abre normal). Una sesión que da 404 `caja_sesion_no_encontrada` cierra el diálogo y quita el parámetro.
*Motivo:* no necesita otra ruta ni otro permiso y hereda el contexto.
*Descartadas:* rutas separadas `/caja` y `/caja/sesiones/:id` (otra entrada en `PRIVATE_ROUTES` para una pantalla sin contexto); una sola vista con scroll (pantalla larga, el arqueo se pisa con la lista).

### 3.2 Caja actual, abrir, cerrar y reabrir

**D-FI5 (19/11/2026) — Confirmada. Caja actual: el estado según el modo.** `CajaActualPanel` pide `getCajaActual()` al montar (esqueletos; si falla, "No pudimos cargar la caja" con "Reintentar", sin vaciar la pestaña "Historial") y tiene un botón "Actualizar". Si hay sesión y el usuario tiene `caja.ver_esperado`, pide además `getCajaEsperado(sesion.id)`; si ese segundo pedido falla, la tarjeta de la sesión se ve sin el esperado y con un aviso chico "No pudimos cargar el esperado" (la caja sigue operable). `modoCaja` sale **solo de `/Caja/actual`** (no de `/Configuracion`: el OPERADOR no tiene `configuracion.ver`) y se muestra como chip con `labelOf(ModoCaja, modo)`.

`cajaVista(actual, { hoy, aperturaDia })` (pura) decide qué se muestra. `hoy` y `aperturaDia` son `DateOnly` que calcula la pantalla con `useTenantDates` (`today()` e `instantToDateOnly(sesion.fechaApertura)`); la función no usa `Date`:

| Modo | Estado | Lo que ve el usuario |
|---|---|---|
| DIARIA | Sin sesión | "Todavía no hay caja hoy. Se abre sola con el primer cobro; abrila a mano si querés declarar el fondo." Botón "Abrir caja" (D-FI6). Fondo propuesto |
| DIARIA | Abierta, `aperturaDia` ≥ `hoy` | Tarjeta de la sesión: "Abierta desde …", fondo inicial, esperado y totales por método; botón "Cerrar caja" |
| DIARIA | Abierta con `aperturaDia` < `hoy` | Igual, con un aviso destacado: "La caja del día D sigue abierta. Hasta que la cierres no se puede cobrar, anular ni devolver" y "Cerrar caja" como acción principal |
| TURNO | Sin sesión | "No hay un turno abierto. Abrí la caja para poder cobrar." Botón "Abrir caja". Fondo propuesto |
| TURNO | Abierta | La tarjeta de la sesión (puede cruzar la medianoche: **no** hay aviso de día anterior); "Cerrar caja" |

El aviso de "día anterior" es **solo de lectura**: el backend es la autoridad (`caja_dia_anterior_abierta`) y el cliente no bloquea nada por esto. Un enlace "Ver detalle" en la tarjeta abre `SesionDetalleDialog` de esa sesión.
*Motivo:* los dos modos se comportan distinto (E-a) y el usuario no debería tener que consultar la configuración para entender por qué no puede cobrar.

**D-FI6 (19/11/2026) — Confirmada (P5 aprobada). Abrir caja, en los dos modos.** "Abrir caja" se ofrece con `caja.abrir` y sin sesión abierta, en **DIARIA y en TURNO** (el backend las deja abrir en ambos, E-b). `AbrirCajaDialog` pide:

| Campo | Regla | Mensaje |
|---|---|---|
| `fondoInicial` | Obligatorio; `^\d+(\.\d{1,2})?$`; **0 permitido**; hasta 10.000.000. Precargado con `fondoPropuesto` (`"0.00"` si es `null`) | "Ingresá un monto con hasta 2 decimales" / "El monto no puede superar $ 10.000.000" |
| `observacion` | Opcional en el cliente; hasta 500 | "La observación no puede superar 500 caracteres" |

Cuerpo: `{ fondoInicial, observacion? }` (`validateAbrir`, pura; `observacion` se omite si está vacía, con `trim`). **Observación obligatoria si el fondo difiere del que quedó**: `fondoDifiere(fondo, propuesto)` (pura, compara en centavos con `moneyToCents`) hace que el campo se rotule "Observación (obligatoria: el fondo difiere del que quedó)" y muestre "Se va a avisar al dueño con una alerta", **pero no bloquea el envío**: la regla es del backend (E-b), que contesta 400 `errors.Observacion` y se marca el campo. Éxito (201): "Caja abierta" y recarga de la caja actual. En DIARIA el diálogo agrega "La caja también se abre sola con el primer cobro".

**D-FI7 (19/11/2026) — Confirmada (P4 aprobada). Cerrar con arqueo.** "Cerrar caja" se ofrece con `caja.cerrar` sobre una sesión ABIERTA, desde la caja actual y desde el detalle de la sesión. `CerrarCajaDialog` carga `getCajaEsperado(sesion.id)` al abrirse (con `caja.ver_esperado`) y muestra **antes de contar**: el fondo inicial, la tabla de totales por método (Cobros, Anulaciones, Devoluciones, solo los métodos que el backend manda) y el **efectivo esperado**. Un botón "Actualizar esperado" lo vuelve a pedir (si mientras tanto hubo movimientos). Campos:

| Campo | Regla | Mensaje |
|---|---|---|
| `efectivoContado` | Obligatorio; `^\d+(\.\d{1,2})?$`; 0 permitido; hasta 10.000.000 | "Ingresá un monto con hasta 2 decimales" / "El monto no puede superar $ 10.000.000" |
| `fondoSiguiente` | Igual. **Precargado con el contado** mientras el usuario no lo toque | idem |
| `observacion` | Opcional en el cliente; hasta 500 | "La observación no puede superar 500 caracteres" |

Con el contado escrito y el esperado cargado se muestra la **diferencia informativa** (`diferenciaVista(contado, esperado)`, pura, en centavos, `contado − esperado`; `null` si falta alguno o no es válido) con el texto "Diferencia: $ X" (positiva "sobra", negativa "falta", cero "sin diferencia"), y la observación se rotula "obligatoria: hay diferencia". **El cliente no bloquea**: no valida que el fondo siguiente no supere lo contado ni que haya observación cuando hay diferencia (reglas del backend, E-c: 400 `errors.FondoSiguiente` y `errors.Observacion`, que se marcan en el campo). La vista previa es la del momento de carga; **la que vale es la del backend**, que calcula el esperado con el candado al cerrar. Cuerpo: `{ efectivoContado, fondoSiguiente, observacion? }` (`validateCerrar`, pura). 

Éxito (200, `CierreCaja`): el diálogo pasa a un **resultado** con lo que devolvió el backend (`efectivoContado`, `efectivoEsperado`, `diferencia` con color, `fondoSiguiente`, observación y los totales por método) y el aviso "Caja cerrada". Si hubo diferencia: "Se creó una alerta de diferencia de caja" con un enlace a las alertas (`can("alertas.ver")`) con `buildAlertasPath`. Al cerrar el resultado se recarga la caja actual. **No** se calcula ninguna cifra del cierre en el cliente: se muestra la respuesta.
*Motivo:* el dueño necesita ver el esperado para contar con criterio; el backend ya rechaza lo que no cierra.
*Descartado:* arqueo ciego (cierra sin información y deja sin uso un permiso que los cuatro roles tienen).

**D-FI8 (19/11/2026) — Confirmada (P6 aprobada; E1 contestada). Reabrir.** "Reabrir" se ofrece en el **detalle de una sesión CERRADA**, con `caja.reabrir` (solo DUENO) y **sin sesión abierta** (el dato sale de `/Caja/actual`, que el detalle ya tiene o pide; si no se pudo cargar, se ofrece igual y decide el backend). `ReabrirCajaDialog` pide el `motivo` (obligatorio con `trim`, 250 como máximo; "Contanos el motivo" / "El motivo no puede superar 250 caracteres"); cuerpo `{ motivo }` (`buildReabrirBody`, pura). El diálogo avisa antes de confirmar: **"En modo diario, mientras esta caja de un día anterior esté abierta no se puede cobrar; cerrala cuando termines"** (en TURNO el texto es "La caja vuelve a quedar abierta y hay que cerrarla de nuevo"). El cliente **no** decide si la sesión es "la última cerrada" ni oculta el botón por el modo o por el día: si no lo es, el backend contesta 409 `caja_no_es_la_ultima` y se muestra su `title`. Éxito: "Caja reabierta", se cierra el diálogo y se recarga el detalle y la caja actual.
*Descartado:* limitar "Reabrir" a la primera fila del historial (depende de la página y del filtro; puede ocultar la última real).

### 3.3 Historial, detalle y enlaces

**D-FI9 (19/11/2026) — Confirmada. Historial de sesiones.** `CajaHistorialPanel` tiene un filtro `desde` y `hasta` (`<input type="date">`, `DateOnly` en la zona del tenant) con un botón "Buscar", y por defecto **los últimos 30 días**: `rangoPorDefecto(hoy)` (pura) devuelve `{ desde: addDays(hoy, -29), hasta: hoy }` con `hoy = today()` de `useTenantDates`. El backend recibe los `DateOnly` **tal cual** (no se convierten a instantes: el día `hasta` entra entero, sección 5 del inventario). `validateRango({ desde, hasta })` (pura) exige los dos con formato `yyyy-MM-dd` válido y `desde` no posterior a `hasta` ("La fecha 'Desde' no puede ser posterior a 'Hasta'", el mismo mensaje de Ocupaciones); **no valida el tope de 366 días**: es del backend (E-f) y su 400 `errors.Hasta` se marca en el campo `hasta`. Tabla paginada con `usePagination` (`reset` al buscar), `normalizePaged` y `toTablePaginationProps`; tamaños `PAGE_SIZE_OPTIONS` (hasta 100, aunque el backend admite 200). Columnas: **#** (id), **Estado** (chip con `labelOf` y `colorOf` de `EstadoCajaSesion`), **Apertura** (`formatInstant(fechaApertura)`) y **Fondo inicial** (`formatMoney`). Un clic en una fila (o el botón "Ver") abre `SesionDetalleDialog` y agrega `?sesion=N`. Sin resultados: "No hay sesiones de caja en ese rango". Si falla, "No pudimos cargar el historial" con "Reintentar". La lista **no muestra la diferencia ni el cierre** (el ítem no los trae; PB-15): se ven en el detalle.
*Motivo:* mostrar solo lo que el backend manda evita un N+1 de detalles; el dueño que busca una diferencia la encuentra en la alerta o en el detalle.

**D-FI10 (19/11/2026) — Confirmada. Detalle de una sesión.** `SesionDetalleDialog({ sesionId, onClose, onChanged })` carga `getCajaSesion(sesionId)` y, si la sesión está ABIERTA y el usuario tiene `caja.ver_esperado`, `getCajaEsperado(sesionId)`. Esqueletos; si falla, el mensaje con "Reintentar" y "Cerrar"; un 404 `caja_sesion_no_encontrada` cierra el diálogo y quita `?sesion`. Secciones:
1. **Cabecera:** "Caja #id", chip de estado, `formatInstant(fechaApertura)` y `fondoInicial`.
2. **Resumen.** *Abierta:* el esperado en vivo y los totales por método (de `getCajaEsperado`), con el aviso "Los movimientos se ven cuando la caja se cierra". *Cerrada:* los datos del **último CIERRE** del historial (`cierreVigente(historial)`, pura: la última fila de tipo CIERRE en el orden recibido, o `null`): contado, esperado, diferencia (con color), fondo siguiente, observación y la tabla de totales por método (snapshot de ese cierre) con su fecha. Si la sesión se reabrió y todavía no se cerró de nuevo, está ABIERTA y se ve como tal.
3. **Eventos:** el `historial` tal cual (ya viene cronológico ascendente), uno por fila: tipo (`labelOf(TipoEventoCaja)`), fecha, usuario (`usuarioLabel(usuarioId, me.usuarioId)` de `src/utils/pagos.js`: "Vos", "Usuario #id" o "—"), un chip "Automática" si corresponde, y los campos de su tipo según `eventoCampos(h)` (pura): APERTURA (fondo declarado, fondo que quedó; con un aviso "Distinto del que quedó" si difieren, en centavos) y la observación; CIERRE (contado, esperado, diferencia, fondo siguiente) y la observación; REAPERTURA (motivo).
4. **Movimientos** (solo sesión CERRADA; con ABIERTA, `movimientos` es `null`): tabla con scroll con Fecha, Tipo (chip con `labelOf` y `colorOf` de `TipoMovimientoCaja`), Método, Monto, Usuario y Pago. En una ANULACION con `dePagoDeOtraSesion`, un chip "Pago de otra sesión". Se muestran **todos, sin paginar** (el backend no pone tope; PB-16), en el orden recibido y **sin sumar nada**: las cifras son las del snapshot. Sin movimientos: "No hubo movimientos".
5. **Acciones:** "Cerrar caja" (sesión ABIERTA, `caja.cerrar`; abre `CerrarCajaDialog`), "Reabrir" (D-FI8), "Ver trazabilidad" con `<Link to={buildTrazabilidadPath({ cajaSesionId })}>` de `src/utils/trazabilidadLink.js` **solo con `can("auditoria.ver")`** (D-FD5), nunca armando el texto a mano.
La decisión de las acciones está en `accionesDeSesion(sesion, { hayAbierta }, can)` (pura).

**D-FI11 (19/11/2026) — Confirmada. Contrato 08 ↔ 09: el movimiento abre el detalle del pago.** En la tabla de movimientos, la celda **Pago** muestra "#pagoId" como enlace con `pagos.ver` (sin ese permiso, texto plano). Un clic abre `<PagoDetalleDialog pagoId={m.pagoId} onClose onChanged />` de la 08, sobre el diálogo de la sesión (MUI apila los diálogos). Como la anulación y la devolución se registran en la sesión **actual**, no en la del pago (08, C3), `onChanged` **no recarga el detalle de la sesión cerrada** (no cambia): recarga la caja actual y su esperado, y avisa a la pantalla (`onChanged` del diálogo de sesión) para que actualice la pestaña "Caja actual". La 09 **no modifica** `PagoDetalleDialog`; si no se abre con solo un `pagoId` como dice D-FH13, el ejecutor **frena**.

**D-FI12 (19/11/2026) — Confirmada (P7 aprobada). Widget de caja del Monitor.** `src/componentes/caja/CajaWidget.jsx` se monta en `OperationalDashboard.jsx` **debajo de los indicadores** y solo con `can("caja.ver")`. Es una tarjeta autónoma que recibe `reloadKey` del Monitor (así "Actualizar" y la actualización automática de la 05 la refrescan) y muestra: el modo (chip), el estado ("Caja abierta desde …" con `formatInstant` y el fondo inicial, o "Sin caja abierta"), el **efectivo esperado** (solo con sesión abierta y `can("caja.ver_esperado")`, de `getCajaEsperado`) y un botón "Ir a Caja" (`navigate(CAJA_PATH)`). En DIARIA, con una sesión de un día anterior, usa el mismo aviso de `cajaVista` ("La caja del día D sigue abierta"). **Falla aislada:** si algún pedido falla, la tarjeta muestra "No se pudo cargar la caja" con "Reintentar" y el Monitor sigue funcionando; no abre un toast propio (no pisa la regla de D-FE12 de no avisar en actualizaciones automáticas). `OperationalDashboard.jsx` solo suma el import, el montaje y el paso de `reloadKey`.
**P-FA4, cerrado:** `/operaciones` **sigue exigiendo `alertas.ver`**. Todo rol con `alertas.ver` tiene `caja.ver` (matriz de permisos, E-i), así que exigir además `caja.ver` no cambia a nadie; el widget se oculta con `can("caja.ver")` por si la matriz cambia. Se reemplaza el comentario de `routes.js` por uno que lo dice.

**D-FI13 (19/11/2026) — Confirmada (P3 aprobada). Contrato 05 ↔ 09: "Ver caja" en `getAlertLinks`.** `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones, canCaja })` suma, con `canCaja` (`can("caja.ver")`) y `isPositiveId(alerta.cajaSesionId)`, el enlace `{ key: "caja", label: "Ver caja", to: buildCajaPath(cajaSesionId) }`, **después** de "Ver ocupación" y **antes** de "Ver trazabilidad". `OperationalAlerts.jsx` pasa el flag `canCaja` nuevo (una línea). El comentario de `alertas.js` ("la 09 suma acá el suyo (P-FE1)") se actualiza. Con esto se **cierra P-FE1 en lo que toca a Caja**. Cubre `CAJA_SIN_CERRAR`, `DIFERENCIA_DE_CAJA` y `FONDO_DISTINTO`, que traen `cajaSesionId`. Se amplían los tests de `getAlertLinks`.

### 3.4 Permisos, errores y formularios

**D-FI14 (19/11/2026) — Confirmada. Permisos: se oculta, nunca se deshabilita, y se decide por permiso.** Todo con `can(...)` (ARQ-4), nunca por rol:

| Acción | Condición |
|---|---|
| Entrar a `/caja`, ver la sesión actual, el historial, el detalle y los movimientos | `caja.ver` (la ruta) |
| Ver el esperado en vivo y los totales por método de una sesión abierta | `caja.ver_esperado` |
| "Abrir caja" | `caja.abrir` y sin sesión abierta |
| "Cerrar caja" | `caja.cerrar` y sesión ABIERTA |
| "Reabrir" | `caja.reabrir`, sesión CERRADA y sin sesión abierta |
| Abrir un pago desde un movimiento | `pagos.ver` |
| "Ver trazabilidad" | `auditoria.ver` |
| "Ver caja" en una alerta | `caja.ver` |
| Widget del Monitor | `caja.ver` (el esperado, además `caja.ver_esperado`) |

Con la matriz del backend: el DUENO hace todo; el ENCARGADO y el OPERADOR abren y cierran pero no reabren; el AUDITOR solo mira (no ve "Abrir" ni "Cerrar" y ve el esperado). La decisión está en `accionesDeCaja(vista, can)` y `accionesDeSesion(...)` (puras).

**D-FI15 (19/11/2026) — Confirmada. Errores por `code`, con la recarga que corresponde.** Todos los `catch` llaman a `showApiError(e)` (muestra el `title` del backend tal cual) y se decide por `code`; no se agregan entradas a `errorCodes.js`. Una escritura **no es idempotente**: el diálogo conserva lo escrito y el reintento es manual. **`fieldErrorsFromApi` de la 07 no se reutiliza** (su mapa es de Ocupación): `cajaFieldErrors(apiError)` (pura) trae el suyo, de las claves PascalCase del backend a los campos del formulario (`FondoInicial` → `fondoInicial`, `EfectivoContado` → `efectivoContado`, `FondoSiguiente` → `fondoSiguiente`, `Observacion` → `observacion`, `Motivo` → `motivo`, `Desde` → `desde`, `Hasta` → `hasta`), con el primer mensaje de cada uno; lo que no es un campo conocido va a `general`.

| `code` | Cuándo | Después del aviso |
|---|---|---|
| `datos_invalidos` | 400. Abrir: `errors.FondoInicial`, `Observacion`. Cerrar: `EfectivoContado`, `FondoSiguiente`, `Observacion`. Reabrir: `Motivo`. Historial: `Desde`, `Hasta` (incluye el rango > 366 días) | Marca el campo con el primer mensaje. Sin recarga. El diálogo queda abierto |
| `caja_ya_abierta` | Abrir o reabrir con otra sesión abierta (409) | Cierra el diálogo y recarga la caja actual (y el detalle, si estaba abierto) |
| `caja_cerrada` | Cerrar una sesión que ya no está abierta (409; otro usuario la cerró) | Cierra el diálogo y recarga la caja actual y el detalle |
| `caja_no_es_la_ultima` | Reabrir una sesión que no es la última cerrada (409) | Cierra el diálogo y recarga el detalle |
| `caja_sesion_no_encontrada` | Detalle, esperado, cerrar o reabrir una sesión que no existe (404) | Cierra el diálogo de la acción y el detalle, quita `?sesion` y recarga la caja actual y el historial |
| `caja_dia_anterior_abierta` | No sale de las acciones de la 09 (es de cobrar, anular y devolver); si apareciera, solo el aviso | Sin recarga |
| `sin_permiso` | 403 en cualquier acción | Aviso con el `title`. El diálogo queda abierto con lo escrito. Sin recarga |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Cualquier pedido | Aviso. Conserva lo escrito; reintento **manual** |
| Código desconocido o `undefined` | — | Aviso del `title`. Sin recarga |

`shouldReloadAfterCaja(code)`, `shouldCloseActionAfterCaja(code)` y `cajaFieldErrors(apiError)` son puras y están en `caja.js`.

**D-FI16 (19/11/2026) — Confirmada. El cliente valida solo formato y largo.** No se valida en el cliente lo que es regla del backend: que el fondo siguiente no supere lo contado, que haya observación cuando hay diferencia o el fondo cambió, que la sesión sea la última cerrada, que el rango no pase de 366 días, quién puede reabrir. Sí se valida formato y largo, con los límites del backend:

| Campo | Regla | Mensaje |
|---|---|---|
| `fondoInicial`, `efectivoContado`, `fondoSiguiente` | Obligatorio, `^\d+(\.\d{1,2})?$`, **0 permitido**, hasta 10.000.000 | "Ingresá un monto con hasta 2 decimales" / "El monto no puede superar $ 10.000.000" |
| `observacion` (abrir y cerrar) | Opcional, hasta 500 | "La observación no puede superar 500 caracteres" |
| `motivo` (reabrir) | Obligatorio con `trim`, hasta 250 | "Contanos el motivo" / "El motivo no puede superar 250 caracteres" |
| `desde`, `hasta` | Obligatorios, `yyyy-MM-dd`; `desde` no posterior a `hasta` | "Elegí la fecha" / "La fecha 'Desde' no puede ser posterior a 'Hasta'" |

`observacion` y `motivo` viajan con `trim`; una `observacion` vacía **no se manda**. Los botones quedan deshabilitados mientras envían. Las advertencias "obligatoria si…" de D-FI6 y D-FI7 son **textos**, no bloqueos.

**D-FI17 (19/11/2026) — Confirmada. Fechas, enums y dinero.** Todo instante se muestra con `formatInstant` de `useTenantDates` (zona del tenant); el "hoy", los días de apertura y el rango por defecto salen de `today()`, `instantToDateOnly` y `addDays`; nunca `Date`, `toISOString` ni `toLocale*`. Los enums con `labelOf`, `colorOf` y `optionsOf` de `enums.js` (`ModoCaja`, `EstadoCajaSesion`, `TipoEventoCaja`, `TipoMovimientoCaja`, `MetodoPago`); el dinero con `formatMoney` (`null` muestra "—", un cero muestra `$ 0,00`). Los módulos de API no convierten fechas ni enums. Después de **cualquier** escritura se recarga lo que corresponde (la caja actual, su esperado, el detalle abierto y el historial): las cifras las calcula el backend y el cliente no las actualiza a mano.

### 3.5 Retiro de lo viejo y código

**D-FI18 (19/11/2026) — Confirmada. Se retira `CajaDiaria.jsx`, el export `pagosApi` y las excepciones de lint.**
- Se **borra** `src/pages/CajaDiaria.jsx` y su import y entrada en `App.jsx`.
- En `src/api/pagosApi.js` se **borra el export `pagosApi`** (`getCajaDiaria` y `anular`) y su JSDoc `@deprecated`. Quedan las funciones de la 08. Se verifica con una búsqueda que nada más lo importa (en `src/` solo lo usaba `CajaDiaria.jsx`).
- En `test/unit/api/pagosApi.test.js` se **borra** el bloque `describe("pagosApi (export de compatibilidad @deprecated…)")` y el import de `pagosApi`.
- En `eslint.config.js` se **retiran las dos excepciones** de `CajaDiaria.jsx` (`sinToLocale(['src/pages/CajaDiaria.jsx'])` y el bloque de `no-unused-vars`) y sus comentarios. Cierra la tabla 5.4 de la 02 y P-FA12.
- En `CLAUDE.md` se corrigen **solo** las frases que dicen que `CajaDiaria.jsx` sigue con su manejo de errores propio y que `pagosApi.js` conserva un export `@deprecated` (líneas "Pages" y "API module pattern"), y se agrega una línea corta sobre la Caja con enlace al manual.
- Se **suma** `getCajaDiaria` al conjunto de lo que no existe: ninguna pantalla vuelve a llamar a `/Pagos/caja-diaria`.

**D-FI19 (19/11/2026) — Confirmada. Lógica pura en `src/utils/caja.js` y `src/utils/cajaLink.js`, probada con Vitest.** `caja.js` exporta: `cajaVista`, `accionesDeCaja`, `accionesDeSesion`, `fondoDifiere`, `diferenciaVista`, `validateAbrir`, `validateCerrar`, `buildReabrirBody`, `rangoPorDefecto`, `validateRango`, `cierreVigente`, `eventoCampos`, `cajaFieldErrors`, `shouldReloadAfterCaja` y `shouldCloseActionAfterCaja`. Reutiliza `moneyToCents` y `usuarioLabel` de `pagos.js` (no los copia). `cajaLink.js` exporta `buildCajaPath` y `parseCajaSesionId` (y re-exporta `CAJA_PATH`). Sin React ni estado; `can` es un parámetro explícito y ningún test depende de la hora ni de la zona del sistema. Las pantallas y los diálogos solo orquestan estado y MUI.
*Motivo:* regla D-FA4: lo que no puede romperse tiene un test, y esta pantalla cierra el dinero del día.

**D-FI20 (19/11/2026) — Confirmada. Qué no se toca.** `src/componentes/pagos/*` (incluido `PagoDetalleDialog.jsx`), `src/pages/Ocupaciones.jsx`, `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js`, `src/constants/enums.js` (ya trae los enums de caja), `src/utils/fechas.js`, `src/utils/pagos.js` (solo se importa de él), `src/utils/trazabilidadLink.js`. De `OperationalAlerts.jsx` se modifica solo la línea que pasa `canCaja`; de `OperationalDashboard.jsx`, solo el montaje del widget (D-FI12).

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FI1 | `brechas-front.md`, "Widget de caja del Monitor operativo" | El widget se repone "sobre `/Caja` (`/Caja/actual` y `/Caja/sesiones/{id}/esperado`)" | Igual, y con `reloadKey` del Monitor para que se refresque con él; el widget hace sus propios pedidos y no se suma al `allSettled` del Monitor | Un widget autónomo no obliga a rehacer `fetchAll`/`toView` de la 05 y aísla sus fallas | — |
| DV-FI2 | Spec 05, P-FA4 | "Si la 09 repone un widget de caja, revisa si la ruta debe exigir además `caja.ver`" | No se exige: `/operaciones` sigue con `alertas.ver` | Todo rol con `alertas.ver` tiene `caja.ver`; el widget se oculta con `can("caja.ver")` | Si la matriz del backend separa los dos permisos |
| DV-FI3 | Spec 08, D-FH15 y 5.4 | `CajaDiaria.jsx` y `OperationalDashboard.jsx` "no se tocan" | La 09 borra la primera y suma el widget a la segunda | Es el reparto que la 08 dejó dicho: la 09 las reemplaza y ajusta | — |

### 4.2 Pendientes

| Id | Pendiente | Paso |
|---|---|---|
| P-FI1 | **Cerrado (19/11/2026).** Preguntas de producto P1 a P7 aprobadas; dudas E1 y E2 contestadas (E1 intencional, E2 sin tope) | — |
| P-FI2 (PB-15, Baja) | Pedido al backend: el ítem de `GET /Caja/sesiones` no trae `fechaCierre` ni `diferencia`; la lista no puede mostrar "cerró con diferencia" sin abrir el detalle (D-FI9). Aprobado, a anotar en `brechas-front.md` | — |
| P-FI3 (PB-16, Baja) | Pedido al backend: `GET /Caja/sesiones/{id}` devuelve los movimientos sin paginar ni tope (D-FI10). Aprobado | — |
| P-FI4 (PB-17, Baja) | Pedido al backend: el nombre del usuario en `historial[]` y `movimientos[]` de caja, como PB-14. Hasta entonces, "Vos" o "Usuario #id" (D-FI10). Aprobado | — |
| P-FI5 | Cuando una sesión de DIARIA de un día anterior queda abierta, la 09 solo avisa; no hay un "cerrar y seguir" en un paso. Sin pedido | — |
| P-FI6 | **Datos de prueba** para verificar: un tenant con `modoCaja` DIARIA y otro con TURNO (cambiarlo exige no tener caja abierta: `caja_abierta` en `/Configuracion`); una sesión cerrada con diferencia, una cerrada sin movimientos y una reabierta y vuelta a cerrar; un movimiento de anulación de un pago de otra sesión; una sesión DIARIA de un día anterior abierta (fecha de la base). Con `dueno@demo.test` se prueba todo; con `encargado@demo.test` y `operado@demo.test`, abrir y cerrar y que no se ofrezca reabrir; el AUDITOR no es verificable con los demo (P-FA9) y lo cubren los tests | 3 a 7 |
| P-FI7 | Moneda por tenant (P-FB3): `formatMoney` fija `UYU` | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FI-L1 | Que existan en `develop` las piezas por nombre: `PagoDetalleDialog` con `{ pagoId, onClose, onChanged, ocupacion? }`, `usuarioLabel` y `moneyToCents` en `src/utils/pagos.js`, `buildTrazabilidadPath` con `cajaSesionId`, `getAlertLinks` con `isPositiveId`, `ModoCaja`/`EstadoCajaSesion`/`TipoEventoCaja`/`TipoMovimientoCaja` en `enums.js`, `useTenantDates` con `today`, `instantToDateOnly` y `formatInstant`, `addDays` en `fechas.js`, `normalizePaged` y `usePagination` | Si falta algo, **frenar** y avisar en el reporte: no se implementa nada de las otras specs |
| P-FI-L2 | Quién usa hoy `pagosApi`, `getCajaDiaria` y `CajaDiaria` (búsqueda en `src/` y `test/`) | Debe dar solo `App.jsx`, `routes.js` (la ruta), `pagosApi.js`, `CajaDiaria.jsx` y el test de `pagosApi`/`routes`. Si algo más lo usa, **frenar** |
| P-FI-L3 | Que la forma de `GET /Caja/actual`, `/sesiones`, `/sesiones/{id}` y `/esperado` coincida con la sección 2.2 (enteros para `modo`, `estado`, `tipo` y `metodo`; `movimientos` `null` con la sesión abierta; `fondoPropuesto` solo sin sesión) | Si los enums llegan como texto, **frenar** (cambia `enums.js`) |
| P-FI-L4 | Que el comentario de `routes.js` y el de `alertas.js` sigan diciendo lo que la sección 2.1 transcribe | Si cambiaron, ajustar el texto y anotarlo |
| P-FI-L5 | Que `OperationalDashboard.jsx` conserve `reloadKey` y que `OperationalAlerts.jsx` llame a `getAlertLinks` en un solo lugar | Si no, adaptar el montaje y anotarlo; si obliga a rehacer la pantalla, **frenar** |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de API | `src/api/cajaApi.js` | D-FI2 |
| Lógica pura | `src/utils/caja.js`, `src/utils/cajaLink.js` | D-FI4, D-FI5 a D-FI19 |
| Pantalla | `src/pages/Caja.jsx` | D-FI4 |
| Paneles | `src/componentes/caja/CajaActualPanel.jsx`, `CajaHistorialPanel.jsx` | D-FI5, D-FI9 |
| Diálogos | `src/componentes/caja/AbrirCajaDialog.jsx`, `CerrarCajaDialog.jsx`, `ReabrirCajaDialog.jsx`, `SesionDetalleDialog.jsx` | D-FI6 a D-FI10 |
| Piezas compartidas | `src/componentes/caja/TotalesPorMetodo.jsx` (tabla de cobros, anulaciones y devoluciones), `CajaWidget.jsx` | D-FI7, D-FI10, D-FI12 |
| Tests | `test/unit/utils/caja.test.js`, `test/unit/utils/cajaLink.test.js`, `test/unit/api/cajaApi.test.js` | D-FI2, D-FI19 |
| Manual de esta spec | `docs/manual/frontend/09-caja.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/auth/routes.js` | `CAJA_PATH`, la entrada `/caja` "Caja", el comentario de P-FA4 | D-FI3, D-FI12 |
| `src/App.jsx` | `PAGES["/caja"]`, la redirección `/caja-diaria` → `/caja`, se quita el import de `CajaDiaria` | D-FI3, D-FI18 |
| `test/unit/auth/routes.test.js` | La fila de la ruta pasa a `/caja` | D-FI3 |
| `src/pages/OperationalDashboard.jsx` | Monta `CajaWidget` con `reloadKey` | D-FI12 |
| `src/utils/alertas.js`, `src/pages/OperationalAlerts.jsx` y el test de `getAlertLinks` | Enlace "Ver caja" y el flag `canCaja` | D-FI13 |
| `src/api/pagosApi.js` y `test/unit/api/pagosApi.test.js` | Se retira el export `pagosApi` y su bloque de tests | D-FI18 |
| `eslint.config.js` | Se retiran las dos excepciones de `CajaDiaria.jsx` | D-FI18 |
| `CLAUDE.md` | Solo las frases de `CajaDiaria.jsx` y del export `@deprecated`; una línea sobre la Caja | D-FI18 |
| `docs/specs/README.md` | Fila 09: estado y "Depende de" `02, 04, 05, 08` (lo actualiza el Orquestador; el ejecutor la pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

`src/pages/CajaDiaria.jsx`.

### 5.4 No se tocan

`src/componentes/pagos/*`, `src/pages/Ocupaciones.jsx`, `src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js`, `src/constants/enums.js`, `src/utils/fechas.js`, `src/utils/pagos.js`, `src/utils/trazabilidadLink.js`, `src/utils/paginacion.js` (D-FI20).

## 6. Pasos

**Regla de ruteo.** El ejecutor es un subagente: **no corre git** y no le pregunta nada al usuario. Si algo de P-FI-L1 a P-FI-L5 no da, o aparece una decisión que la spec no prevé, **frena** y lo dice en su reporte (el Orquestador decide). Las dudas del backend no se suponen. Los comandos `npm` los corre él mismo, en PowerShell, **solo al final** (D-FI1).

**Reglas de todos los pasos.**
- Se trabaja en `feature/front-caja` (creada desde `develop` por el Orquestador; nunca sobre `develop`), con **un solo commit por spec**, que hace el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- No se lee ni se muestra el `.env`.
- Texto visible en español rioplatense; código y nombres en inglés.
- Cada paso se tilda en esta spec al terminarlo y el manual (`docs/manual/frontend/09-caja.md`) se va armando.

### Paso 0 — Precondiciones

- [ ] **0.1** Resolver **P-FI-L1** a **P-FI-L5** (lectura y búsquedas, sin cambios). Si falta algo, frenar.

### Paso 1 — Lógica pura

- [ ] **1.1** Crear `src/utils/caja.js` y `src/utils/cajaLink.js` (D-FI19) y sus tests `test/unit/utils/caja.test.js` y `cajaLink.test.js`.

  *Aceptación:* los tests cubren estos casos (`ABIERTA = 1`, `CERRADA = 2`; `APERTURA = 1`, `CIERRE = 2`, `REAPERTURA = 3`; `DIARIA = 1`, `TURNO = 2`; fechas como `DateOnly`; `can` es una función sobre un conjunto de permisos):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `cajaVista({ modo: 1, sesion: null, fondoPropuesto: 500 }, …)` | Estado `SIN_CAJA`, modo DIARIA, `fondoPropuesto` 500 |
  | 2 | `cajaVista({ modo: 2, sesion: null, … })` | `SIN_CAJA`, modo TURNO |
  | 3 | DIARIA con sesión abierta, `aperturaDia` igual a `hoy` | `ABIERTA` |
  | 4 | DIARIA con sesión abierta, `aperturaDia` anterior a `hoy` (`"2026-11-17"` contra `"2026-11-19"`) | `ABIERTA_DIA_ANTERIOR`, con ese día |
  | 5 | TURNO con sesión abierta de un día anterior | `ABIERTA` (sin aviso: el turno cruza la medianoche) |
  | 6 | `cajaVista(null, …)` y un objeto sin `modo` | `null` en los dos, sin lanzar (la pantalla ya muestra el error de carga) |
  | 7 | `accionesDeCaja(SIN_CAJA, can con caja.abrir)` | `abrir` verdadero; `cerrar` falso |
  | 8 | `accionesDeCaja(ABIERTA, can con caja.cerrar y ver_esperado)` | `cerrar` y `verEsperado` verdaderos; `abrir` falso |
  | 9 | `accionesDeCaja` con solo `caja.ver` (AUDITOR) en los dos estados | Todo falso salvo `verEsperado` si tiene `caja.ver_esperado` |
  | 10 | `accionesDeSesion(CERRADA, { hayAbierta: false }, can con caja.reabrir)` | `reabrir` verdadero; `cerrar` falso |
  | 11 | `accionesDeSesion(CERRADA, { hayAbierta: true }, …)` con todos los permisos | `reabrir` falso (ya hay una abierta) |
  | 12 | `accionesDeSesion(ABIERTA, …)` con `caja.cerrar` | `cerrar` verdadero; `reabrir` falso |
  | 13 | `accionesDeSesion(CERRADA, …)` sin `caja.reabrir` (ENCARGADO y OPERADOR) | `reabrir` falso |
  | 14 | `fondoDifiere("500.00", 500)`, `("500", 500)`, `("500.50", 500)`, `("0", null)`, `("abc", 500)` | `false`; `false`; `true`; `false` (propuesto `null` = 0); `false` (inválido: lo marca `validateAbrir`) |
  | 15 | `diferenciaVista("1050.50", 1000)`, `("990", 1000)`, `("1000", 1000)`, `("0.3", 0.1 + 0.2)` | `50.5`; `-10`; `0`; `0` (centavos, sin coma flotante) |
  | 16 | `diferenciaVista("", 1000)`, `("abc", 1000)`, `("100", null)` | `null` en los tres |
  | 17 | `validateAbrir({ fondoInicial: "500", observacion: " cambié el fondo " })` | `ok`; cuerpo `{ fondoInicial: 500, observacion: "cambié el fondo" }` |
  | 18 | `validateAbrir` con `fondoInicial: "0"` y `observacion: ""` | `ok`; cuerpo `{ fondoInicial: 0 }` (sin `observacion`; el 0 es válido) |
  | 19 | `fondoInicial` `""`, `"-1"`, `"12.345"`, `"abc"` y `"10000000.01"` | Error de `fondoInicial` en los cinco. `"10000000"` da `ok` |
  | 20 | `observacion` de 501 caracteres; de 500 | Error de `observacion`; `ok` |
  | 21 | **No valida contra el backend (D-FI16):** `validateAbrir` con un fondo distinto del propuesto y sin observación | `ok` (lo rechaza el backend con `errors.Observacion`) |
  | 22 | `validateCerrar({ efectivoContado: "1050.50", fondoSiguiente: "500", observacion: "" })` | `ok`; cuerpo `{ efectivoContado: 1050.5, fondoSiguiente: 500 }` |
  | 23 | `validateCerrar` con `efectivoContado` y `fondoSiguiente` inválidos (`""`, `"-1"`, `"1.234"`) | Error en cada campo que corresponda |
  | 24 | **No valida contra el backend:** `validateCerrar` con `fondoSiguiente` mayor que `efectivoContado` y sin observación | `ok` (lo rechazan `errors.FondoSiguiente` y `errors.Observacion`) |
  | 25 | `buildReabrirBody(" Error de conteo ")`, `("")`, `("   ")` y 251 caracteres | `{ ok: true, body: { motivo: "Error de conteo" } }`; error "Contanos el motivo" (los dos siguientes); error "El motivo no puede superar 250 caracteres". Con 250, `ok` |
  | 26 | `rangoPorDefecto("2026-11-19")` | `{ desde: "2026-10-21", hasta: "2026-11-19" }` (30 días incluido hoy) |
  | 27 | `validateRango({ desde: "2026-11-01", hasta: "2026-11-19" })`, y con los dos iguales | `ok` con `{ desde, hasta }` tal cual |
  | 28 | `validateRango` con `desde` posterior a `hasta`; con uno vacío; con `"2026-13-40"` | Error con "La fecha 'Desde' no puede ser posterior a 'Hasta'"; error de `desde`/`hasta` ("Elegí la fecha"); error de formato |
  | 29 | **No valida el tope (D-FI16):** `validateRango` con 400 días de rango | `ok` (lo rechaza el backend con `errors.Hasta`) |
  | 30 | `cierreVigente` con un historial `[APERTURA, CIERRE(contado 100), REAPERTURA, CIERRE(contado 120)]` | El último CIERRE (contado 120) |
  | 31 | `cierreVigente` sin ningún CIERRE (`[APERTURA]`) y con `[]`/`undefined` | `null` en los tres |
  | 32 | `eventoCampos` de una APERTURA con `fondoDeclarado` 600 y `fondoQueQuedo` 500 | Campos de fondo declarado y fondo que quedó, con `distinto: true` |
  | 33 | `eventoCampos` de una APERTURA con los dos fondos en 500; de una automática | `distinto: false`; sin aviso |
  | 34 | `eventoCampos` de un CIERRE con contado, esperado, diferencia y fondo siguiente; de una REAPERTURA con `motivo` | Los cuatro campos de cierre; el campo "Motivo" |
  | 35 | `cajaFieldErrors({ errors: { Observacion: ["a"], FondoSiguiente: ["b"], Hasta: ["c"], Otro: ["d"] } })` | `fields`: `observacion: "a"`, `fondoSiguiente: "b"`, `hasta: "c"`; `general`: `["d"]` |
  | 36 | `cajaFieldErrors` con `errors` ausente, `null` o vacío | `{ fields: {}, general: [] }` |
  | 37 | `shouldReloadAfterCaja` | Verdadero para `caja_ya_abierta`, `caja_cerrada`, `caja_no_es_la_ultima` y `caja_sesion_no_encontrada`; falso para `datos_invalidos`, `sin_permiso`, `caja_dia_anterior_abierta`, `sin_conexion`, un código desconocido y `undefined` |
  | 38 | `shouldCloseActionAfterCaja` | Verdadero para esos mismos cuatro; falso para `datos_invalidos`, `sin_permiso`, `servidor_ocupado`, `caja_dia_anterior_abierta` y `undefined` |
  | 39 | `buildCajaPath(12)` y con un valor inválido (`0`, `"x"`, `null`) | `"/caja?sesion=12"`; `"/caja"` |
  | 40 | `parseCajaSesionId("?sesion=12")`, `("?sesion=0")`, `("?sesion=abc")`, `("?sesion=12.5")`, `("")` | `12`; `null`; `null`; `null`; `null` |
  | 41 | Búsqueda de `getHours`, `toLocale`, `toISOString` y `new Date` en `caja.js` y `cajaLink.js` | Sin coincidencias |

### Paso 2 — Módulo de API y retiro de lo viejo del módulo de pagos

- [ ] **2.1** Crear `src/api/cajaApi.js` (D-FI2) y `test/unit/api/cajaApi.test.js` con `vi.mock` de `http`.
- [ ] **2.2** Retirar el export `pagosApi` de `src/api/pagosApi.js` y su bloque de tests en `test/unit/api/pagosApi.test.js` (D-FI18). **No** borrar todavía `CajaDiaria.jsx` (se hace en el paso 7, junto con su import).

  *Aceptación:* los tests cubren: `getCajaActual()` hace `GET /Caja/actual` y devuelve `data`; una respuesta sin `modo` lanza `ApiError` con `code: "respuesta_invalida"`; `listCajaSesiones({ desde: "2026-11-01", hasta: "2026-11-19", page: 1, pageSize: 20 })` hace `GET /Caja/sesiones` con esos `params` (los `DateOnly` sin convertir), filtra `""`/`undefined` con `cleanParams` y devuelve `{ items, total, page, pageSize }`; una respuesta que no es paginada lanza `respuesta_invalida`; `getCajaSesion(12)` hace `GET /Caja/sesiones/12` y acepta `movimientos: null`; una respuesta sin `historial` arreglo lanza `respuesta_invalida`; `getCajaEsperado(12)` hace `GET /Caja/sesiones/12/esperado`; `openCaja(body)` hace `POST /Caja/abrir` con el cuerpo sin modificarlo; `closeCaja(12, body)` hace `POST /Caja/sesiones/12/cerrar`; `reopenCaja(12, { motivo })` hace `POST /Caja/sesiones/12/reabrir`; ninguna función captura errores (un rechazo de `http` se propaga). `pagosApi.test.js` ya no importa `pagosApi` y sigue verde con las funciones de la 08.

### Paso 3 — Caja actual: abrir y cerrar

- [ ] **3.1** Crear `src/componentes/caja/TotalesPorMetodo.jsx`, `AbrirCajaDialog.jsx`, `CerrarCajaDialog.jsx` y `CajaActualPanel.jsx` (D-FI5, D-FI6, D-FI7, D-FI14 a D-FI17), con `showApiError`, `cajaFieldErrors` y los avisos de las decisiones.
- [ ] **3.2** Crear `src/pages/Caja.jsx` con las dos pestañas; la de "Historial" queda con un marcador hasta el paso 4.

  *Aceptación (manual, al final del paso 7):* la sección 7 de esta spec, casos 3 a 11.

### Paso 4 — Historial, detalle y reabrir

- [ ] **4.1** Crear `CajaHistorialPanel.jsx` (D-FI9) con el filtro, la tabla paginada y la apertura del detalle.
- [ ] **4.2** Crear `SesionDetalleDialog.jsx` (D-FI10, D-FI11) y `ReabrirCajaDialog.jsx` (D-FI8), con el enlace "Ver trazabilidad" y el `PagoDetalleDialog` de la 08.
- [ ] **4.3** Cablear en `Caja.jsx` el parámetro `?sesion=N` (`parseCajaSesionId`, `buildCajaPath`) y el `onChanged` que recarga la caja actual.

  *Aceptación (manual, al final del paso 7):* la sección 7, casos 12 a 22.

### Paso 5 — Ruta, menú, redirección y enlace desde alertas

- [ ] **5.1** `src/auth/routes.js` (`CAJA_PATH`, entrada "Caja", comentario de P-FA4), `src/App.jsx` (`PAGES["/caja"]` y la redirección de `/caja-diaria`) y `test/unit/auth/routes.test.js` (D-FI3, D-FI12).
- [ ] **5.2** `getAlertLinks` con "Ver caja" (`canCaja`), el cambio de una línea en `OperationalAlerts.jsx` y la ampliación del test de `getAlertLinks` (D-FI13).

  *Aceptación:* el test de rutas compara el mapa completo con `/caja` en lugar de `/caja-diaria`; el test de `getAlertLinks` cubre: con `canCaja` y `cajaSesionId` positivo aparece `Ver caja` con `to` `"/caja?sesion=N"` (después de "Ver ocupación" y antes de "Ver trazabilidad"); sin `canCaja` no aparece; con `cajaSesionId` ausente, `0` o `null` no aparece; los enlaces de ocupación y trazabilidad no cambian.

### Paso 6 — Widget del Monitor

- [ ] **6.1** Crear `src/componentes/caja/CajaWidget.jsx` y montarlo en `OperationalDashboard.jsx` con `can("caja.ver")` y `reloadKey` (D-FI12).

  *Aceptación (manual):* la sección 7, casos 23 a 26.

### Paso 7 — Retiro, documentación y cierre

- [ ] **7.1** Borrar `src/pages/CajaDiaria.jsx` y su import en `App.jsx`; retirar las dos excepciones de `CajaDiaria.jsx` de `eslint.config.js` (D-FI18).
- [ ] **7.2** Corregir en `CLAUDE.md` **solo** las frases de D-FI18 y agregar la línea de la Caja.
- [ ] **7.3** Crear `docs/manual/frontend/09-caja.md`: los dos modos y qué ve el usuario en cada estado, abrir, cerrar con arqueo (esperado, diferencia informativa, qué rechaza el backend), reabrir (y el aviso de DIARIA), el historial y el detalle, el enlace `/caja?sesion=N`, el contrato con `PagoDetalleDialog`, el widget, la tabla de permisos, qué hace cada `code` de error y lo que le queda al backend (PB-15 a PB-17).
- [ ] **7.4** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.
- [ ] **7.5** **Verificación final** (única): `npm test`, `npm run lint` y `npm run build`, en PowerShell, sin errores.

  *Aceptación:* las tres pasan; una búsqueda de `e.response.data.error`, `toLocale`, `toISOString` y `http.` en `src/componentes/caja/`, `src/pages/Caja.jsx`, `src/utils/caja.js` y `src/utils/cajaLink.js` no da coincidencias; una búsqueda de `pagosApi`, `getCajaDiaria` y `CajaDiaria` en `src/`, `test/` y `eslint.config.js` no da coincidencias (salvo el nombre del archivo del manual); `git diff develop -- src/componentes/pagos src/pages/Ocupaciones.jsx src/constants/enums.js src/utils/pagos.js` vacío (lo verifica el Orquestador).

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`. Usuarios demo: `dueno@demo.test`, `encargado@demo.test`, `operado@demo.test`. El modo se cambia en `/configuracion` (con la caja cerrada).

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Menú y rutas | El menú dice "Caja"; `/caja-diaria` redirige a `/caja`; ningún pedido a `/Pagos/caja-diaria` |
| 3 | Modo DIARIA, sin sesión (`dueno@demo.test`) | Chip "Diaria"; "Todavía no hay caja hoy. Se abre sola con el primer cobro…"; "Abrir caja"; el fondo propuesto del último cierre |
| 4 | Abrir con fondo igual al propuesto, sin observación | `POST /Caja/abrir` con `{ fondoInicial }`; "Caja abierta"; la tarjeta muestra la sesión |
| 5 | Abrir con un fondo distinto del propuesto y sin observación | El campo se rotula como obligatorio; el envío **no** se bloquea; el backend da 400 y se marca `observacion` con su mensaje. Con observación se abre y se crea la alerta `FONDO_DISTINTO` |
| 6 | Abrir con una caja ya abierta (desde otra pestaña) | El `title` de `caja_ya_abierta`; el diálogo se cierra y la pantalla se recarga |
| 7 | Cobrar un pago en efectivo desde Ocupaciones y volver a Caja ("Actualizar") | El esperado sube con el cobro (`GET .../esperado`); los totales por método muestran el cobro |
| 8 | Cerrar con el contado igual al esperado | `POST .../cerrar` con `{ efectivoContado, fondoSiguiente }`; resultado con contado, esperado, diferencia 0, fondo que queda y totales por método; "Caja cerrada" |
| 9 | Cerrar con el contado distinto y sin observación | Se ve la diferencia informativa; el envío **no** se bloquea; el backend da 400 y se marca `observacion`. Con observación se cierra, aparece "Se creó una alerta de diferencia de caja" y la alerta `DIFERENCIA_DE_CAJA` en `/alertas-operativas` |
| 10 | Cerrar con `fondoSiguiente` mayor que el contado | El backend da 400 y se marca `fondoSiguiente` con su mensaje ("El fondo que queda no puede superar el efectivo contado.") |
| 11 | Modo TURNO, sin sesión; intentar cobrar | Chip "Por turno"; "No hay un turno abierto…"; el cobro da `caja_cerrada`; tras abrir desde Caja, el cobro entra; un turno abierto de un día anterior **no** muestra el aviso de día anterior |
| 12 | Modo DIARIA con una sesión de un día anterior abierta (P-FI6) | Aviso destacado "La caja del día D sigue abierta…"; "Cerrar caja" como acción principal; un cobro da `caja_dia_anterior_abierta` |
| 13 | Historial, sin tocar el filtro | `GET /Caja/sesiones?desde=…&hasta=…` con los últimos 30 días como `DateOnly`; tabla con #, Estado, Apertura (zona del local) y Fondo inicial; sin Diferencia ni Cierre |
| 14 | Rango con `desde` posterior a `hasta`; y un rango de más de 366 días | El primero no llega a la red y marca el campo; el segundo llega al backend y se marca `hasta` con su `title` |
| 15 | Paginar y cambiar el tamaño de página | `page` y `pageSize` van al backend; "Buscar" vuelve a la página 1 |
| 16 | Abrir una sesión cerrada | `GET /Caja/sesiones/{id}`; resumen del último cierre; eventos (apertura, cierre) con "Vos" o "Usuario #id"; movimientos con tipo, método, monto y usuario; la URL tiene `?sesion=N` |
| 17 | Una anulación de un pago de otra sesión | El movimiento tiene el chip "Pago de otra sesión" |
| 18 | Clic en "#pagoId" de un movimiento (con `pagos.ver`) | Se abre `PagoDetalleDialog` de la 08 sobre el detalle de la sesión; al anular o devolver desde ahí, se actualiza la caja actual (no el detalle de la sesión cerrada) |
| 19 | Abrir `/caja?sesion=N` pegado a mano, con `N` inválido y con `N` inexistente | Con `N` válido abre el detalle; con `N` inválido la pantalla se abre normal; con uno inexistente, el `title` de `caja_sesion_no_encontrada`, el diálogo se cierra y se quita el parámetro |
| 20 | "Reabrir" con `dueno@demo.test` sobre la última cerrada, sin otra abierta | Diálogo con el motivo y el aviso de DIARIA ("En modo diario, mientras esta caja de un día anterior esté abierta no se puede cobrar; cerrala cuando termines"); `POST .../reabrir` con `{ motivo }`; "Caja reabierta"; la sesión pasa a ABIERTA y los movimientos desaparecen ("Los movimientos se ven cuando la caja se cierra"); un nuevo cierre agrega un segundo CIERRE al historial y el resumen muestra el último |
| 21 | "Reabrir" sobre una cerrada que no es la última, y con otra caja abierta | `caja_no_es_la_ultima` (cierra el diálogo y recarga el detalle) y `caja_ya_abierta`; con otra abierta el botón ya no se ve |
| 22 | `encargado@demo.test` y `operado@demo.test` | Ven "Abrir caja" y "Cerrar caja" y el esperado; **no** ven "Reabrir" ni "Ver trazabilidad" |
| 23 | Monitor (`/operaciones`) con una sesión abierta | La tarjeta "Caja" con el modo, "Caja abierta desde …", el fondo y el efectivo esperado; "Ir a Caja" navega a `/caja` |
| 24 | Monitor sin sesión; y en DIARIA con una sesión de un día anterior | "Sin caja abierta"; el aviso de día anterior |
| 25 | Monitor con el pedido de caja fallando (por ejemplo, un `caja.ver` revocado o el backend apagado solo para `/Caja`) | La tarjeta muestra "No se pudo cargar la caja" con "Reintentar"; las demás tarjetas y las críticas siguen; "Actualizar" del Monitor refresca también la caja |
| 26 | Alertas `CAJA_SIN_CERRAR`, `DIFERENCIA_DE_CAJA` y `FONDO_DISTINTO` | La fila trae "Ver caja" (con `caja.ver`) que abre `/caja?sesion=N`; "Ver trazabilidad" sigue ahí con `auditoria.ver` |
| 27 | Backend apagado, en las dos pestañas | "No pudimos cargar la caja" y "No pudimos cargar el historial" con "Reintentar"; la otra pestaña no se vacía |
| 28 | Búsquedas finales (paso 7.5) | Sin `CajaDiaria`, `getCajaDiaria` ni `pagosApi` en `src/`, `test/` y `eslint.config.js`; sin `toLocale` ni `toISOString` en `src/componentes/caja/` |

**No verificable con los usuarios demo:** el rol `AUDITOR` (P-FA9; lo cubren los tests de `accionesDeCaja` y `accionesDeSesion`), los dos modos en un mismo tenant (hay que cambiarlo en `/configuracion`, con la caja cerrada) y una sesión de DIARIA de un día anterior si no hay datos con esa fecha (P-FI6).

## 8. Cómo retomar

**Estado:** Aprobada (19/11/2026). **Todas las decisiones D-FI (1 a 20) están Confirmadas**: el desarrollador aprobó las siete preguntas de producto (ruta `/caja`, dos pestañas con el detalle en diálogo, "Ver caja" en las alertas, esperado visible con diferencia informativa y sin bloqueo, "Abrir caja" en los dos modos, "Reabrir" en el detalle de una sesión cerrada y el widget del Monitor) y el Orquestador contestó E1 (intencional) y E2 (sin tope); los pedidos PB-15 a PB-17 quedaron aprobados. El Orquestador la revisó y la aprobó el 19/11/2026 (widget autónomo, `/operaciones` con `alertas.ver`, `cajaFieldErrors` propio y sin validar el tope de 366 días en el cliente).

**Condición de arranque:** la 02, la 04, la 05 y la 08 ejecutadas y mergeadas en `develop` (ya lo están) y esta spec aprobada y mergeada. El Orquestador crea `feature/front-caja` desde `develop` (comprobando con `git branch -a`) y la deja chequeada en `parkingcontrol-front`.

**Ejecución:** un solo subagente, en el repo principal, con **un commit por spec**. Modelo **Sonnet** con esfuerzo **medio**: son muchas piezas, pero con decisiones tomadas y tablas de casos. Si aparece una decisión de arquitectura difícil de revertir (por ejemplo, que `PagoDetalleDialog` no se pueda abrir con solo un `pagoId`, que los enums lleguen como texto o que la forma de `GET /Caja/*` difiera de la sección 2.2), **frena** y avisa; se sube a Opus con esfuerzo alto solo si cambia el contrato con la 08 o el modelo de sesiones.

**Prompt para el subagente ejecutor:**

> Trabajás en el frontend de ParkingControl, en `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`, en la rama `feature/front-caja` (ya creada desde `develop` por el Orquestador; **nunca trabajes sobre `develop`**; no cambies de rama). Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/specs/frontend/08-pagos.md` (solo D-FH2, D-FH5, D-FH13 y C3), `docs/inventario/backend.md` (secciones `/Caja`, `/Configuracion`, `/Pagos`, `/operational-alerts`, 2, 3, 4 y 5), `docs/inventario/brechas-front.md` ("Contratos entre specs") y `docs/specs/frontend/09-caja.md`. Implementá **la spec 09 completa**, de a un paso por vez y en orden (pasos 0 a 7), siguiendo la sección 6, y tildá cada paso en la spec al terminarlo. Resolvé P-FI-L1 a P-FI-L5 antes de empezar: si algo falta o no coincide, **frená y reportá**, no implementes cosas de otras specs. **No corras git** (ni `git add`, ni commit, ni rebase: lo hace el Orquestador). **No le preguntes nada al usuario**; las dudas o las decisiones que la spec no prevé van en tu reporte final, con la opción que recomendás. No supongas reglas del backend. No leas ni muestres el `.env`. No toques los archivos de la sección 5.4. Al terminar el paso 7, corré en PowerShell, desde `parkingcontrol-front`, `npm test`, `npm run lint` y `npm run build` (**solo al final**, no por paso) y corregí lo que falle. Reportá: los archivos que creaste, modificaste y borraste (rutas completas), el resultado de los tres comandos, lo que quedó sin verificar a mano y cualquier desvío o duda. Respondé en español rioplatense.

**Modelo y esfuerzo para seguir.** Si el Orquestador revisa y corrige el borrador: Sonnet con esfuerzo bajo a medio. La ejecución: Sonnet, esfuerzo medio. El manual (paso 7.3) lo puede escribir el mismo ejecutor; si se separa, Haiku con esfuerzo bajo alcanza.
