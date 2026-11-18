# Specs del frontend

Índice de las specs de implementación. Ruta: `docs/specs/<área>/NN-<tema>.md`. Estados: Sin crear → Borrador → Aprobada → En curso → Terminada.

Rama de integración: `develop` (desde el 18/11/2026; reemplaza a `master` de D-FA1). Cada spec sale de `develop` y vuelve con un PR. Contexto común para todas: [inventario de la API](../inventario/backend.md) y [brechas front ↔ API](../inventario/brechas-front.md).

| Spec | Área | Estado | Depende de | Rama |
|---|---|---|---|---|
| [01 — Autenticación con Auth0, consumo de `/api/v1` y errores por `code`](frontend/01-autenticacion-y-api.md) | Frontend | Terminada | — | `feature/spec-front-auth` (spec), `feature/front-auth` (ejecución) |
| [02 — Base común: fechas con zona del tenant, enums, paginación, módulos de API](frontend/02-base-comun.md) | Frontend | Borrador | — | `feature/spec-front-base` (spec), `feature/front-base` (ejecución) |
| 03 — Tarifas con vigencia | Frontend | Sin crear | 02 | |
| 04 — Trazabilidad (reemplaza Auditoría) | Frontend | Sin crear | 02 | |
| 05 — Alertas operativas paginadas y alertas de dinero | Frontend | Sin crear | 02 | |
| 06 — Cocheras: alta por rango, edición, estados calculados | Frontend | Sin crear | 02 | |
| 07 — Ocupaciones: alta abierta/retroactiva, saldo, finalizar con excedente, errores y permisos | Frontend | Sin crear | 02 | |
| 08 — Pagos: detalle, devoluciones, anulación entre sesiones | Frontend | Sin crear | 07 | |
| 09 — Caja con sesiones (reemplaza Caja diaria) | Frontend | Sin crear | 02, 08 | |
| 10 — Contratos mensuales: ajuste de precio y baja programada | Frontend | Sin crear | 07 | |
| 11 — Configuración del tenant | Frontend | Sin crear | 02 | |
| 12 — Usuarios | Frontend | Sin crear | 02 | |
