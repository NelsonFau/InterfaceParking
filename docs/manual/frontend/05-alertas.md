# Manual — 05 Alertas operativas

> Cómo funcionan `/alertas-operativas` (listado y resolución) y `/operaciones` (Monitor). Spec: `docs/specs/frontend/05-alertas.md`. Backend: `docs/inventario/backend.md`, sección `/operational-alerts`; código: `Service/OperationalAlertService.cs`, `Controllers/OperationalAlertController.cs`.

## Resumen

Las dos pantallas siguen separadas (D-FE2). El Monitor es el resumen (indicadores y críticas recientes); Alertas es el listado paginado con filtros y resolución. Ambas exigen `alertas.ver` y se recargan solas cada 5 minutos. El widget de caja del Monitor salió (llamaba a `/Pagos/caja-diaria`, que ya no existe): lo repone la spec 09.

## Piezas

| Pieza | Dónde |
|---|---|
| API (`listAlertas`, `getAlerta`, `resolveAlerta`, `countAlertas`) | `src/api/operationalAlertsApi.js` |
| Lógica pura (query, filtros de URL, permisos de resolución, resumen, enlaces) | `src/utils/alertas.js` |
| `isStale` y hook de refresco | `src/utils/autoRefresh.js`, `src/utils/useAutoRefresh.js` |
| Pantallas | `src/pages/OperationalAlerts.jsx`, `src/pages/OperationalDashboard.jsx` |
| Tests | `test/unit/utils/alertas.test.js`, `test/unit/utils/autoRefresh.test.js` |

`resolveAlerta` devuelve la **`Alerta` resuelta** (ya no `{ message }`). `countAlertas(filters)` pide `page: 1, pageSize: 1` y devuelve `total`.

## Listado (`/alertas-operativas`)

- **Filtros**: estado (por defecto "Abiertas"), severidad, tipo y rango de días. Las opciones salen de `optionsOf(SeveridadAlerta | TipoAlertaOperativa, { allLabel })`. El rango son dos `<input type="date">`; `buildAlertQuery(filtros, timeZone)` los pasa a instantes de la zona del tenant sobre `fechaCreacion`, con `hasta` inclusivo (`2026-11-01` a `2026-11-01` en Montevideo da `2026-11-01T03:00:00.000Z` a `2026-11-02T02:59:59.999Z`). Con `desde > hasta` o una fecha inválida no se pide nada y el mensaje sale bajo "Desde".
- **Paginación**: `usePagination` (20 por página) y `TablePagination`. Cada cambio de filtro llama a `reset`; después de cada respuesta `fit(total)` baja la página si quedó más allá de la última. Encima de la lista, el `total` del filtro ("134 alertas").
- **Orden**: lo da el backend (`FechaCreacion` descendente, `Id` descendente de desempate); no se reordena en el cliente.
- **Filtros por URL** (se leen una vez al montar, la URL no se reescribe): `estado` (`true`, `false` o vacío para todas), `severidad`, `tipo`, `ocupacionId`, `cajaSesionId`. Un valor que no existe en su enum, o un id que no es entero positivo, se ignora. `ocupacionId` y `cajaSesionId` se ven como etiquetas con "×" ("Ocupación 12"). El Monitor linkea a `/alertas-operativas?severidad=4`; la 07 y la 09 pueden linkear con `?ocupacionId=` y `?cajaSesionId=`.
- **Respuestas fuera de orden**: el efecto marca el pedido viejo como descartado al limpiarse, así que cambiar filtros rápido no deja a la vista el resultado de un filtro anterior.
- **Fila**: severidad y tipo con `labelOf`/`colorOf` (un tipo desconocido se ve como su número), chip "DINERO" si `esDeDinero`, fecha con `formatInstant`, y si está resuelta "Resuelta el … por Ana" o "… automáticamente" más el comentario (`resolutionSummary`). Los ids se muestran como texto ("Ocupación 12", "Caja 7") solo si existen. El borde rojo es de las críticas abiertas (`SeveridadAlerta.CRITICA`).

## Resolución y permiso de dinero (D-FE8)

`getResolveState(alerta, can)` decide el botón, con permisos y nunca por rol:

| Caso | Botón |
|---|---|
| Alerta resuelta | No hay |
| Sin `alertas.resolver` | Oculto |
| Con `alertas.resolver`, no de dinero | Habilitado |
| Con `alertas.resolver` y `alertas.resolver_dinero`, de dinero | Habilitado |
| Con `alertas.resolver`, de dinero, sin `alertas.resolver_dinero` | Visible y **deshabilitado**, con el tooltip "Tu usuario no tiene permiso para resolver alertas de dinero." (desvío DV-FE1 de D-FA10) |

Decide `esDeDinero` de la respuesta de la API, no la marca `dinero` de `enums.js`. El backend valida igual (403 `sin_permiso`; `OperationalAlertController.cs:51-61`).

El diálogo pide un comentario de hasta 500 caracteres con contador. `buildResolveBody(alerta, comentario)` lo recorta: en una alerta de dinero vacío es error ("Resolver" queda deshabilitado), en otra el cuerpo es `{}` (no se manda `comentario: ""`). Mientras el pedido está en curso los dos botones quedan deshabilitados y **no se reintenta**: la operación no es idempotente.

- **Éxito**: la fila se reemplaza con la `Alerta` que devuelve el `PATCH` y sale "Alerta resuelta correctamente". Queda visible, ya resuelta, aunque el filtro sea "Abiertas", hasta la próxima actualización.
- **400 / 403**: `showApiError`; el diálogo sigue abierto.
- **409 `alerta_resuelta`** (la resolvió otro, o el job): `showApiError` (el `title` de la API), se cierra el diálogo, se llama a `getAlerta(id)` y la fila se reemplaza. Si ese `GET` falla, se avisa y se recarga la página actual.

## Enlaces (D-FE10)

`getAlertLinks(alerta, { canTrazabilidad })` es el único lugar que decide los enlaces de una fila. Hoy devuelve "Ver trazabilidad" (con `buildTrazabilidadPath({ ocupacionId, cajaSesionId })`, con los dos ids si están) solo con `auditoria.ver` y al menos un id.

**Le queda a otras specs (P-FE1):** la 07 cambia la firma a `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones })` y suma "Ver ocupación" con `buildOcupacionPath` (con `ocupaciones.ver`), y `OperationalAlerts.jsx` pasa el flag nuevo. La 09 suma el enlace a Caja con su URL con filtro. Hasta entonces los ids son texto.

## Monitor (`/operaciones`)

Ocho pedidos livianos en paralelo por actualización, con `Promise.allSettled`:

| Indicador | Consulta (siempre `resuelta=false`) |
|---|---|
| Alertas abiertas | `countAlertas` |
| Críticas | `listAlertas` con `severidad: CRITICA`, `pageSize: 5`: el `total` es el indicador y `items` la lista de recientes |
| Alta severidad | `countAlertas` con `severidad: ALTA` |
| Pagos sospechosos | suma de `countAlertas` por `OCUPACION_FINALIZADA_SIN_PAGO`, `PAGO_MENOR_AL_ESPERADO` y `PAGO_REGISTRADO_TARDE` |
| Ocupaciones vencidas | suma por `OCUPACION_VENCIDA_SIN_PAGO` y `OCUPACION_VENCIDA_SIN_CIERRE` |

Los grupos de tipos viven en `TIPOS_PAGOS_SOSPECHOSOS` y `TIPOS_OCUPACIONES_VENCIDAS` (`alertas.js`). `sumCounts` devuelve `null` si algún conteo del grupo falló: la tarjeta muestra "—" y no un número parcial. Los fallos de una carga manual abren **un solo** `showApiError`, con el primer error. La tarjeta de críticas, si falla, dice "No se pudieron cargar las alertas críticas" con "Reintentar". "Ver todas" y "Revisar" van a `/alertas-operativas?severidad=4`; "Ver alertas", a `/alertas-operativas`. Un resumen de alertas en el backend (PB-3) reemplazaría los 7 conteos.

## Refresco (D-FE12)

El job del servidor corre cada 5 minutos (mostrador) y cada hora (control). "Actualizar" recarga a mano; además `useAutoRefresh` revisa cada 30 s si la pestaña está visible y `isStale(ultimoIntento, ahora, ALERTS_REFRESH_MS)` (5 minutos). Al volver a una pestaña oculta hace la misma verificación en el momento. No refresca con el diálogo de resolución abierto ni con una carga en curso. Decide con el momento del **último intento** (no de la última carga correcta) para no reintentar cada 30 s tras un fallo. Un fallo automático no abre aviso: se deja la lista anterior y se ve "No se pudo actualizar. Reintentá con 'Actualizar'" junto a "Actualizado: {fecha}". Un fallo manual usa `showApiError`.

## Lo que sacó esta spec

`fmtDate`, `todayISO`, `money`, `pagosApi` (en el Monitor), la paginación fija `page: 1, pageSize: 50`, las tres tarjetas de la pantalla de Alertas (se calculaban sobre una página), los métodos `getAll` y `resolve`, y las excepciones de `toLocale*` de las dos páginas en `eslint.config.js`.

## Le queda a la 09

Volver a poner el widget de caja en el Monitor sobre `/Caja/actual` y `/Caja/sesiones/{id}/esperado` con `formatMoney`; retirar `pagosApi.getCajaDiaria`; revisar si `/operaciones` debe exigir además `caja.ver` (comentario en `src/auth/routes.js`). Coordinar el orden de merge: la 09 reagrega un bloque a `OperationalDashboard.jsx`.
