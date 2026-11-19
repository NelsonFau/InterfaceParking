# Specs del frontend

Índice de las specs de implementación. Ruta: `docs/specs/<área>/NN-<tema>.md`. Estados: Sin crear → Borrador → Aprobada → En curso → Terminada.

Rama de integración: `develop` (desde el 18/11/2026; reemplaza a `master` de D-FA1). Cada spec sale de `develop` y vuelve con un PR. Contexto común para todas: [inventario de la API](../inventario/backend.md) y [brechas front ↔ API](../inventario/brechas-front.md).

| Spec | Área | Estado | Depende de | Rama |
|---|---|---|---|---|
| [01 — Autenticación con Auth0, consumo de `/api/v1` y errores por `code`](frontend/01-autenticacion-y-api.md) | Frontend | Terminada | — | `feature/spec-front-auth` (spec), `feature/front-auth` (ejecución) |
| [02 — Base común: fechas con zona del tenant, enums, paginación, módulos de API](frontend/02-base-comun.md) | Frontend | Terminada | — | `feature/spec-front-base` (spec), `feature/front-base` (ejecución, worktree `../parkingcontrol-front-base`) |
| [03 — Tarifas con vigencia](frontend/03-tarifas.md) | Frontend | Terminada | 02 | `feature/specs-etapa2` (spec), `feature/front-tarifas` (ejecución) |
| [04 — Trazabilidad (reemplaza Auditoría)](frontend/04-trazabilidad.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02 | `feature/specs-etapa2` (spec), `feature/front-trazabilidad` (ejecución, worktree `../parkingcontrol-front-trazabilidad`) |
| [05 — Alertas operativas paginadas y alertas de dinero](frontend/05-alertas.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02, 04 | `feature/specs-etapa2` (spec), `feature/front-alertas` (ejecución, worktree `../parkingcontrol-front-alertas`) |
| [06 — Cocheras: alta por rango, edición, estados calculados](frontend/06-cocheras.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02, 04 | `feature/specs-etapa3` (spec), `feature/front-cocheras` (ejecución) |
| [07 — Ocupaciones: alta abierta/retroactiva/futura, saldo, finalizar con excedente, errores y permisos](frontend/07-ocupaciones.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02, 04, 05, 06 | `feature/specs-etapa4` (spec), `feature/front-ocupaciones` (ejecución, worktree `../parkingcontrol-front-ocupaciones`) |
| [08 — Pagos: lista de la ocupación, detalle, anulación y devoluciones](frontend/08-pagos.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02, 04, 05, 07 | `feature/specs-etapa5` (spec), `feature/front-pagos` (ejecución, worktree `../parkingcontrol-front-pagos`) |
| [09 — Caja con sesiones (reemplaza Caja diaria)](frontend/09-caja.md) | Frontend | Aprobada (19/11/2026) | 02, 04, 05, 08 | `feature/specs-etapa6` (spec), `feature/front-caja` (ejecución) |
| [10 — Contratos mensuales: ajuste de precio, baja programada y ajuste masivo](frontend/10-contratos-mensuales.md) | Frontend | Aprobada (19/11/2026) | 02, 07, 08 | `feature/specs-etapa6` (spec), `feature/front-contratos` (ejecución) |
| [11 — Configuración del tenant](frontend/11-configuracion.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02 | `feature/specs-etapa3` (spec), `feature/front-configuracion` (ejecución, worktree `../parkingcontrol-front-configuracion`) |
| [12 — Usuarios](frontend/12-usuarios.md) | Frontend | Terminada (19/11/2026; se vuelve verdadera al mergear el PR a `develop`) | 02, 04 | `feature/specs-etapa3` (spec), `feature/front-usuarios` (ejecución, worktree `../parkingcontrol-front-usuarios`) |
