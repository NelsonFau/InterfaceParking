# 14 — Pulido: motivo en los botones deshabilitados y restos de la Tanda A del backend

> Frontend · **Aprobada** (20/11/2026) · `feature/spec-front-14` (esta spec, worktree `../parkingcontrol-front-spec14`) y `feature/front-pulido` (ejecución, a crear desde `develop` **después del merge de #20, #21 y #22**) · Última actualización 20/11/2026
>
> Spec chica, sin pantallas nuevas ni endpoints nuevos. Tiene dos partes:
> - **Parte 1** (se ejecuta ya). Cierra lo que dejaron pendiente la spec 13 y la Tanda A del backend: el tooltip con el motivo en los botones deshabilitados (`docs/diseno/detalles-claude-design.md`, sección 4), el texto propio DV-FJ3 (PB-23), el 409 `anulacion_requiere_dueno` que ya no existe (PB-12) y el idioma de `index.html`.
> - **Parte 2** (no se ejecuta ahora). Usa la patente y el tipo de vehículo cuando el backend entregue la Tanda D (PB-25). Queda como esquema y se especifica cuando el contrato esté mergeado e inventariado.
>
> Prefijo de decisiones: **D-FN**.

## 1. Objetivo y alcance

**Objetivo.**
- Que ningún botón quede deshabilitado sin explicar por qué.
- Que el front deje de cubrir defectos del backend que la Tanda A ya resolvió.

**Se construye (parte 1).**

| Área | Qué | Decisión |
|---|---|---|
| Componente | `BotonConMotivo` en `src/componentes/ui/`: botón que se deshabilita con un motivo y lo muestra en un tooltip | D-FN1 |
| Regla | Qué deshabilitados llevan motivo y cuáles no | D-FN2 |
| Inventario | Los botones que cumplen la regla y su texto | D-FN3 |
| Lógica pura | Funciones `motivo…` en `src/utils/`, con Vitest | D-FN4 |
| PB-23 | Se retira el texto propio de `ocupacion_no_activa` (DV-FJ3) y se muestra el `title` del backend | D-FN5 |
| PB-12 | Se retiran las menciones al 409 `anulacion_requiere_dueno` | D-FN6 |
| `index.html` | `lang="es"` y título "ParkingControl" | D-FN7 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Patente, tipo de vehículo, búsqueda por patente y edición del vehículo | Parte 2 de esta spec, después de la Tanda D del backend (PB-25) |
| Plano posicional y ventana de la cochera del plano | Spec 13, tanda 5, después de PB-24 |
| Cliente ocasional y abono semanal | PB-26 y PB-27: primero hacen falta decisiones de negocio |
| Motivo por permiso faltante | No aplica: la app **oculta** las acciones sin permiso (`can()`); la única excepción es "Resolver alerta" (spec 05), que ya tiene su motivo |
| Cambios de lógica, permisos o endpoints | Fuera de alcance |

## 2. Dependencias

- **Spec 13 mergeada (#21 y #22).** Esta spec usa `src/componentes/ui/`, `src/pages/RegistrarIngreso.jsx`, `src/utils/registrarIngreso.js` y el patrón de tooltip de `src/pages/OperationalAlerts.jsx`. Ninguno de ellos existe en `develop` hasta ese merge.
- **#20 mergeada.** Trae el inventario de la Tanda B. Sin él, `brechas-front.md` choca al editar PB-12 y PB-23.
- **Backend: Tanda A** (PR #66 de Parking-Api), ya mergeada. Con ella:
  - El `title` de `ocupacion_no_activa` es genérico.
  - El 409 `anulacion_requiere_dueno` salió del catálogo.

## 3. Decisiones

### D-FN1 — `BotonConMotivo`

Archivo nuevo: `src/componentes/ui/BotonConMotivo.jsx`.

```jsx
<BotonConMotivo motivo={motivo} ocupado={saving} variant="marron" onClick={guardar}>
  Guardar
</BotonConMotivo>
```

- **Props:**
  - `motivo` (`string | null`): por qué no se puede usar el botón.
  - `ocupado` (`boolean`, por defecto `false`): estado transitorio de guardando o cargando.
  - El resto pasa tal cual a `Button`.
- **Cuándo se deshabilita:** `disabled = ocupado || Boolean(motivo)`. El llamador no pasa `disabled`. Si lo pasa, se ignora, y hay un comentario en el componente que lo explica.
- **Tooltip:**
  - Solo se muestra con un `motivo` y `ocupado === false`. Mientras guarda no aparece, aunque haya un motivo.
  - Un botón deshabilitado no dispara eventos. Por eso el tooltip se ancla a un `<Box component="span">` que envuelve al botón, igual que en `OperationalAlerts.jsx`. El span lleva `display: "inline-flex"` y `tabIndex={0}`, para que se pueda llegar al motivo con el teclado.
  - El texto del tooltip es el `motivo` sin cambios.
  - El estilo sale del tema (spec 13). El componente no tiene `sx` de color.
- **Accesibilidad:** el span lleva `aria-label={motivo}`. El `Tooltip` de MUI ya lo pone; hay que verificarlo y no duplicarlo.
- **Migración de "Resolver alerta"** (`OperationalAlerts.jsx`): pasa a `BotonConMotivo` con `motivo={resolve.enabled ? null : resolve.reason}`.
  - Se mantiene la línea `meta` con el motivo al lado del botón, porque el detalle de Claude Design la pide en la sección 7.
  - Ese caso es el único que muestra el motivo dos veces, con tooltip y con texto.

### D-FN2 — Regla: qué deshabilitado lleva motivo

**Lleva motivo:** un botón de acción deshabilitado por una condición que **persiste** hasta que el usuario hace algo o hasta que cambia el estado. Ejemplos: falta un dato, no hay cambios o hay que marcar una confirmación.

**No lleva motivo:**
- El deshabilitado **transitorio**, como guardando, cargando o `resolving`. Va en `ocupado`.
- Los enlaces de paginación en los extremos (`PaginacionTexto`, `Clientes`).
- Los campos de formulario deshabilitados, como la fecha fija de Tarifas o Configuración en solo lectura. Su ayuda ya explica el motivo.
- Las opciones de `Segmentado`.
- El botón de `Login`.

### D-FN3 — Inventario y textos

Este es el relevamiento del 20/11/2026 sobre `feature/front-diseno`. Al ejecutar, el ejecutor vuelve a buscar `disabled=` en `src/` y aplica D-FN2 a lo que aparezca de nuevo. Lo que agregue va a la lista del reporte final.

**Convención de los textos:** voseo, sin punto final y sin nombrar roles (ARQ-4).

| # | Pantalla y botón | Condición actual | Motivo |
|---|---|---|---|
| 1 | Registrar ingreso, "Confirmar ingreso" | `!completo` | `Falta elegir: <lista>`, con los que faltan en orden: `cliente`, `cochera`, `inicio`, separados por coma. Ejemplo: "Falta elegir: cochera, inicio" |
| 2 | Cocheras, alta, "Crear" | `!preview.ok` | Pristine: "Ingresá el número de la cochera". Si no, el mismo `preview.texto` que muestra el `Alert` |
| 3 | Cocheras, editar, "Guardar" | `!r.ok` | "Corregí los datos marcados" |
| 4 | Cocheras, "Bloquear" o "Desbloquear" | `Boolean(error)` | El mismo `error` que muestra el campo |
| 5 | Configuración, "Descartar cambios" | `!hayCambios` | "No hay cambios para descartar" |
| 6 | Configuración, "Guardar" | `!hayCambios \|\| !validation?.ok` | Sin cambios: "No hay cambios para guardar". Si no, "Corregí los campos marcados". Gana el primero |
| 7 | Usuarios, cambiar rol, "Guardar" | `!resumen.cambia` | "Elegí un rol distinto del actual" |
| 8 | Alertas, diálogo de resolver, "Resolver" | `esDeDinero && vacio` | "Las alertas de dinero requieren un comentario" |
| 9 | Ocupaciones, ajuste masivo, "Aplicar ajuste" | `lista?.status !== "ok" \|\| !entiendo` | Lista con error: "No se pudo cargar la lista; volvé al paso anterior". Lista cargando: sin motivo, va en `ocupado`. Sin confirmar: "Marcá «Entiendo que el ajuste no se puede deshacer»" |
| 10 | Alertas, "Resolver alerta" | `!resolve.enabled` | `resolve.reason`, que ya existe (D-FN1, migración) |

En los casos 1 a 9, la parte transitoria de la condición (`saving`, `resolving`, cargando) pasa a `ocupado`.

### D-FN4 — Lógica pura

Las funciones que arman el motivo devuelven `string | null` y van junto a la lógica de cada pantalla. Los casos de una sola condición (3, 4, 5, 7 y 8) se resuelven en el JSX con un ternario y no llevan función.

| Función | Archivo | Casos de test |
|---|---|---|
| `motivoConfirmarIngreso({ cliente, cocheraId, inicio })` | `src/utils/registrarIngreso.js` | Completo da `null`. Falta uno da su nombre. Faltan los tres da "Falta elegir: cliente, cochera, inicio". `cocheraId` `0` cuenta como elegido, igual que en `datosCompletos` |
| `motivoGuardarConfiguracion({ hayCambios, valido })` | `src/utils/configuracion.js` | Las cuatro combinaciones. Sin cambios gana sobre inválido |
| `motivoAplicarAjuste({ listaStatus, entiendo })` | `src/utils/contratos.js` | `ok` con `entiendo` da `null`. `failed` da el texto de la lista. `loading` da `null`. `ok` sin `entiendo` da el texto de la confirmación |
| `motivoCrearCocheras({ pristine, preview })` | `src/utils/cocheras.js` | Pristine. `preview.ok`. `preview` con texto |

`datosCompletos` se mantiene y pasa a ser `motivoConfirmarIngreso(...) === null`.

### D-FN5 — PB-23: se retira DV-FJ3

Con la Tanda A, el backend devuelve un `title` genérico para `ocupacion_no_activa`. El texto propio deja de hacer falta:
- `src/utils/contratos.js`: se borran `MSG_NO_ACTIVO` y `contratoErrorOverride`. `STALE_CODES`, `shouldReloadAfterContrato` y `shouldCloseActionAfterContrato` no cambian.
- `AjustePrecioDialog.jsx`, `ProgramarBajaDialog.jsx` y `QuitarBajaDialog.jsx`: el `catch` llama a `showApiError(err)` sin el override.
- `test/unit/utils/contratos.test.js`: sale el test del override.
- **Documentación:**
  - `docs/manual/frontend/10-contratos-mensuales.md`: la mención de DV-FJ3 pasa a "retirado en la spec 14".
  - `docs/inventario/brechas-front.md`, PB-23: "Pendiente en el front" pasa a "Resuelto en la spec 14".
  - La spec 10 no se toca, porque es histórica.
- **Prueba manual:** provocar `ocupacion_no_activa` en el ajuste de precio sobre una ocupación ya cancelada en otra pestaña. El toast tiene que mostrar el `title` genérico del backend. Si sigue diciendo "Solo se puede cancelar una ocupación ACTIVA", es una regresión del backend: se anota y no se vuelve al override.

### D-FN6 — PB-12: se retira `anulacion_requiere_dueno`

- `src/componentes/pagos/AnularPagoDialog.jsx`: el comentario de la línea 5 deja de nombrar el 409.
- `test/unit/utils/pagos.test.js`: sale `"anulacion_requiere_dueno"` de las listas de los tests 32 y 33. Los dos tests ya cubren el caso de un código desconocido.
- `docs/inventario/brechas-front.md`, PB-12: "Pendiente en el front" pasa a "Resuelto en la spec 14".
- `docs/manual/frontend/08-pagos.md`: el 409 se anota como retirado.

### D-FN7 — `index.html`

- `<html lang="en">` pasa a `<html lang="es">`.
- `<title>parkingcontrol-front</title>` pasa a `<title>ParkingControl</title>`.

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/componentes/ui/BotonConMotivo.jsx` | Nuevo (D-FN1) |
| `src/pages/RegistrarIngreso.jsx`, `Cocheras.jsx`, `Configuracion.jsx`, `Usuarios.jsx`, `OperationalAlerts.jsx` | Usan `BotonConMotivo` (D-FN3) |
| `src/componentes/ocupaciones/AjusteMasivoDialog.jsx` | Usa `BotonConMotivo` (D-FN3, caso 9) |
| `src/utils/registrarIngreso.js`, `contratos.js`, `cocheras.js`, `configuracion.js` | Funciones `motivo…` (D-FN4). En `contratos.js`, además, lo de D-FN5 |
| `AjustePrecioDialog.jsx`, `ProgramarBajaDialog.jsx`, `QuitarBajaDialog.jsx` | Sin override (D-FN5) |
| `src/componentes/pagos/AnularPagoDialog.jsx` | Comentario (D-FN6) |
| `test/unit/utils/*.test.js` | Tests de D-FN4. Se retiran los de D-FN5 y D-FN6 |
| `index.html` | D-FN7 |
| `docs/manual/frontend/08-pagos.md`, `10-contratos-mensuales.md`, `13-diseno.md` | En la 13, una línea sobre `BotonConMotivo` en "Componentes de ui" |
| `docs/inventario/brechas-front.md` | PB-12 y PB-23 |

## 5. Verificación

- `npm test`, `npm run lint` y `npm run build` en verde, solo al final.
- **Prueba manual** con `npm run dev`:
  - [ ] Registrar ingreso vacío: "Confirmar ingreso" está deshabilitado y el tooltip dice "Falta elegir: cliente, cochera, inicio". Al elegir el cliente, el texto se achica.
  - [ ] Configuración sin cambios: los dos botones tienen tooltip. Con un campo inválido, "Guardar" dice "Corregí los campos marcados".
  - [ ] Ajuste masivo: sin marcar "Entiendo", el tooltip pide marcarlo.
  - [ ] Mientras guarda, ningún botón muestra tooltip.
  - [ ] Con el teclado (Tab), el foco llega al botón deshabilitado y el tooltip se ve.
  - [ ] Alertas: "Resolver alerta" sin permiso tiene el tooltip y la línea de texto, igual que antes.
  - [ ] D-FN5: el toast de `ocupacion_no_activa` muestra el `title` del backend.
  - [ ] La pestaña del navegador dice "ParkingControl".

## 6. Parte 2 — después de la Tanda D del backend (esquema; no se ejecuta)

Se especifica cuando la Tanda D (PB-24 y PB-25) esté mergeada y `docs/inventario/backend.md` tenga su contrato. Lo previsto:

- **Patente y tipo de vehículo:**
  - Se muestran en el mosaico de cocheras, en las tarjetas y la tabla de Ocupaciones, y en el resumen de Registrar ingreso.
  - Hoy se omiten por PB-25, según la guía visual.
- **Alta:**
  - Patente y tipo de vehículo (MOTO=1, AUTO=2, CAMIONETA=3) en Registrar ingreso y en `AltaOcupacionDialog`.
  - Hay que manejar el 409 `vehiculo_no_entra`.
- **Edición:** `PUT /Ocupacion/{id}/vehiculo`, con el permiso `ocupaciones.crear`.
- **Búsqueda por patente:** busca por "contiene", desde 3 caracteres.
- **Cocheras:**
  - Alta y edición solo para el dueño (`cocheras.gestionar`).
  - `codigo` visible.
  - Una cochera inactiva (`activa:false`) se muestra sin acciones.
- El plano posicional sigue en la spec 13, tanda 5.

## 7. Ejecución

- **Cuándo:** después del merge de #20, #21 y #22.
- **Rama y worktree:**
  - Rama `feature/front-pulido` desde `develop`, en el worktree `../parkingcontrol-front-pulido`.
  - El worktree necesita su propia copia de `.env` y `npm install`.
- **Commits y PR:**
  - Un commit para la parte 1, con `git add` por ruta explícita.
  - PR a `develop`.
- **Índice:** la fila de esta spec en `docs/specs/README.md` se agrega al ejecutar, porque `develop` todavía no tiene la fila de la 13.
- **Modelo:** Sonnet, esfuerzo bajo. Es una spec ya escrita, de cambios mecánicos.
