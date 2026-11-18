# Specs del frontend

Índice de las specs de implementación. Ruta: `docs/specs/<área>/NN-<tema>.md`. Estados: Sin crear → Borrador → Aprobada → En curso → Terminada.

Rama de integración: `develop` (desde el 18/11/2026; reemplaza a `master` de D-FA1). Cada spec sale de `develop` y vuelve con un PR. Contexto común para todas: [inventario de la API](../inventario/backend.md) y [brechas front ↔ API](../inventario/brechas-front.md).

| Spec | Área | Estado | Depende de | Rama |
|---|---|---|---|---|
| [01 — Autenticación con Auth0, consumo de `/api/v1` y errores por `code`](frontend/01-autenticacion-y-api.md) | Frontend | Terminada | — | `feature/spec-front-auth` (spec), `feature/front-auth` (ejecución) |
| [02 — Base común: fechas con zona del tenant, enums, paginación, módulos de API](frontend/02-base-comun.md) | Frontend | Aprobada | — | `feature/spec-front-base` (spec), `feature/front-base` (ejecución, worktree `../parkingcontrol-front-base`) |
| [03 — Tarifas con vigencia](frontend/03-tarifas.md) | Frontend | Aprobada | 02 | `feature/specs-etapa2` (spec), `feature/front-tarifas` (ejecución, worktree `../parkingcontrol-front-tarifas`) |
| [04 — Trazabilidad (reemplaza Auditoría)](frontend/04-trazabilidad.md) | Frontend | Aprobada | 02 | `feature/specs-etapa2` (spec), `feature/front-trazabilidad` (ejecución, worktree `../parkingcontrol-front-trazabilidad`) |
| [05 — Alertas operativas paginadas y alertas de dinero](frontend/05-alertas.md) | Frontend | Aprobada | 02, 04 | `feature/specs-etapa2` (spec), `feature/front-alertas` (ejecución, worktree `../parkingcontrol-front-alertas`) |
| [06 — Cocheras: alta por rango, edición, estados calculados](frontend/06-cocheras.md) | Frontend | Aprobada | 02, 04 | `feature/specs-etapa3` (spec), `feature/front-cocheras` (ejecución, worktree `../parkingcontrol-front-cocheras`) |
| [07 — Ocupaciones: alta abierta/retroactiva/futura, saldo, finalizar con excedente, errores y permisos](frontend/07-ocupaciones.md) | Frontend | Aprobada | 02, 04, 05, 06 | `feature/specs-etapa4` (spec), `feature/front-ocupaciones` (ejecución, worktree `../parkingcontrol-front-ocupaciones`) |
| 08 — Pagos: detalle, devoluciones, anulación entre sesiones | Frontend | Sin crear | 07 | |
| 09 — Caja con sesiones (reemplaza Caja diaria) | Frontend | Sin crear | 02, 08 | |
| 10 — Contratos mensuales: ajuste de precio y baja programada | Frontend | Sin crear | 07 | |
| [11 — Configuración del tenant](frontend/11-configuracion.md) | Frontend | Aprobada | 02 | `feature/specs-etapa3` (spec), `feature/front-configuracion` (ejecución, worktree `../parkingcontrol-front-configuracion`) |
| [12 — Usuarios](frontend/12-usuarios.md) | Frontend | Aprobada | 02, 04 | `feature/specs-etapa3` (spec), `feature/front-usuarios` (ejecución, worktree `../parkingcontrol-front-usuarios`) |
