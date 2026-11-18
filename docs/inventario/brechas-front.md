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
| 07 | Ocupaciones: alta abierta o retroactiva, detalle con saldo, finalizar con excedente, errores por `code` y permisos | 02 | Etapa 2 pendiente |
| 08 | Pagos: detalle, devoluciones, anulación entre sesiones | 07 | Etapa 2 pendiente |
| 09 | Caja con sesiones (reemplaza Caja diaria) | 02, 08 | `/caja-diaria` retirado |
| 10 | Contratos mensuales: ajuste de precio y baja programada | 07 | — |
| 11 | Configuración del tenant | 02 | — |
| 12 | Usuarios | 02 | — |

Las specs 03 a 06, 11 y 12 son independientes entre sí después de la 02 y se pueden ejecutar en paralelo.

### Reparto acordado durante la redacción de la 02 (18/11/2026)

- La **02** crea `src/utils/fechas.js` y `src/utils/formato.js` (`formatMoney`, es-UY/UYU) y hace un **arreglo mínimo** de fechas en `Ocupaciones.jsx` (alta y filtros a instante UTC), sin tocar UI, errores ni permisos. La 07 ya no tiene que arreglar ese 400.
- Las copias locales de `fmtDate`/`parseFechaLocal`/`formatDateTime`/`money` las retira la spec que reescribe cada página: 03 Tarifas, 04 Auditoría, 05 OperationalAlerts y OperationalDashboard, 06 Cocheras, 07 Ocupaciones, 09 CajaDiaria. La tabla está en la spec 02.
