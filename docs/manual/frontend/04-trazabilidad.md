# Manual — 04 Trazabilidad

> Cómo funciona la pantalla de Trazabilidad, que reemplaza a Auditoría. Spec: `docs/specs/frontend/04-trazabilidad.md`. Backend: `docs/inventario/backend.md`, sección `/Trazabilidad`; código: `Service/ConsultaDeTrazabilidad.cs`, `Service/FiltroDeTrazabilidad.cs`.

## Resumen

`GET /Auditoria` ya no existe (404). `/trazabilidad` une en una sola línea de tiempo los eventos de auditoría, pagos, devoluciones, caja y alertas, ordenados por fecha descendente, y se filtra por ocupación, pago, sesión de caja, usuario, fuente y rango de días. Exige `auditoria.ver` (Dueño y Auditor). `/auditoria` redirige a `/trazabilidad` (sin conservar el query y fuera del mapa de rutas, para no duplicar el ítem de menú).

## Contrato de enlace profundo (D-FD5)

Lo usan las specs 05, 07, 08 y 09. **Se enlaza siempre con `buildTrazabilidadPath(filtros)`** (`src/utils/trazabilidadLink.js`), nunca armando el texto a mano, y **solo si `usePermissions().can("auditoria.ver")`**.

| Parámetro | Valor | Notas |
|---|---|---|
| `ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId` | Entero positivo | Si vienen varios, se aplican todos |
| `fuente` | `AUDITORIA`, `PAGO`, `DEVOLUCION`, `CAJA` o `ALERTA`; repetible | Se normaliza a mayúsculas y se quitan repetidos |
| `desde`, `hasta` | `DateOnly` `yyyy-MM-dd` en la zona del tenant | No son instantes. Van juntos y `desde <= hasta` |
| `page`, `pageSize` | No van en la URL | Estado local de la pantalla |

Ejemplos: `/trazabilidad?ocupacionId=12` · `/trazabilidad?pagoId=40&fuente=PAGO&fuente=DEVOLUCION` · `/trazabilidad?cajaSesionId=7` · `/trazabilidad?usuarioId=3&desde=2026-11-01&hasta=2026-11-15`.

Reglas:

- El query sale en orden fijo (`ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId`, `fuente`, `desde`, `hasta`); lo vacío y lo inválido se omite y la función no lanza.
- Con `ocupacionId`, `pagoId` o `cajaSesionId` la pantalla abre **sin rango** y busca sola. Sin ninguno de los tres y sin rango, abre con el rango por defecto (últimos 7 días, incluido hoy).
- Un parámetro inválido (id que no es entero positivo, fuente desconocida, fecha mal formada, `desde` sin `hasta` o invertido) **se ignora** y la pantalla muestra "Ignoramos filtros del enlace que no eran válidos: …". Nunca queda en blanco.
- **La URL es la fuente de verdad.** Al entrar sin parámetros válidos, la pantalla escribe el rango por defecto en la URL con `replace` ("atrás" no vuelve a una URL sin filtros). "Buscar", los chips de objeto y "atrás" cambian la URL; "Limpiar" vuelve al rango por defecto con `replace`. Recargar o compartir el enlace conserva el filtro.
- No hay filtro por `alertaId` ni por `entidad` + `entidadId` (el backend no los ofrece; PB-1 en `docs/inventario/brechas-front.md`).
- Solo viajan ids por la URL, nunca nombres ni datos personales.
- `RequireAuth` ya arma `returnTo` con `pathname + search + hash` y `safeReturnTo` acepta rutas con query, así que un enlace profundo debería sobrevivir al login de Auth0 (por lectura del código; la verificación 8 de la spec, de punta a punta, es manual).

`parseTrazabilidadQuery(search)` devuelve `{ filtros, ignorados }` y es simétrica con `buildTrazabilidadPath`.

## Validación previa y rango por defecto (D-FD6, `src/utils/trazabilidadFiltros.js`)

Antes de llamar a la API se validan las reglas que el backend responde con 400 `datos_invalidos`; si falla alguna, **no hay pedido**.

| Código | Cuándo | Campo |
|---|---|---|
| `rango_incompleto` | Hay `desde` sin `hasta`, o al revés | el que falta |
| `rango_invertido` | `desde > hasta` | `hasta` |
| `rango_obligatorio` | Sin ocupación, pago ni sesión y sin rango | `rango` |
| `rango_excede` | Sin los tres ids, `hasta − desde > 31 días` medido **en instantes** (con `dateRangeToInstants`; 1 al 31 de octubre pasa, del 1 de octubre al 1 de noviembre no) | `hasta` |
| `id_invalido` | Un id que no es entero positivo | el id |
| `fecha_invalida` | Una fecha que no es `yyyy-MM-dd` real | `desde` o `hasta` |

Con alguno de los tres ids el límite de 31 días no rige. `toApiParams(filtros, tz)` arma los parámetros: ids como números, `fuente` como arreglo (sin la clave si no hay ninguna), `desde` y `hasta` como instantes con Z (inclusivo). `defaultFiltros(tz, now)` da `hasta = hoy en la zona` y `desde = hasta − 6 días`.

## Pantalla (`src/pages/Trazabilidad.jsx`)

- **Estructura.** `Trazabilidad` lee la URL, calcula los filtros aplicados y reescribe la URL si falta algo (con `replace`). Un `Panel` con `key` = ruta aplicada (filtros + resultados) se remonta cuando cambian los filtros: la página vuelve a 1 y no queda estado de la búsqueda anterior (equivale al `reset` de `usePagination`). Cambiar de página o de tamaño no pierde los filtros. Tamaño por defecto 50.
- **Filtros.** Desde y hasta (`type="date"`), ocupación, pago y sesión de caja (IDs), usuario y fuente (múltiple). "Buscar" valida el borrador; si hay errores se ven bajo cada campo y no se navega ni se pide nada. Con los mismos filtros ya aplicados, "Buscar" vuelve a pedir.
- **Usuario (D-FD8).** `Autocomplete` con nombre y email; los inactivos llevan "(inactivo)". La lista (`GET /Usuarios`, no paginado) se pide una vez y solo con `can("usuarios.ver")`. Sin ese permiso, o si la llamada falla, cae a un campo "ID de usuario", sin toast. Un `usuarioId` de la URL que no está en la lista se ve como "Usuario #3" y se aplica igual.
- **Carga (D-FD7).** `LinearProgress` + esqueletos; a los 1,5 s, "Buscando eventos… un rango largo puede tardar unos segundos."; "Buscar" y "Limpiar" quedan deshabilitados. Una respuesta vieja se descarta con una bandera `ignore` por efecto (equivale al `reqIdRef` de la pantalla vieja: la limpieza del efecto marca el pedido anterior como descartado). Ante un error: `showApiError` y un aviso con "Reintentar" manual; los filtros no se vacían. Se muestran los resultados de la página pedida, nunca los de la anterior mientras carga.
- **Tabla (D-FD9).** Fecha (con segundos, zona del tenant), Fuente y Acción (chips con `labelOf`/`colorOf`, vía `canonicalKey`), Quién (`usuarioNombre`, o el chip "Automática" si no hay usuario y `automatica`), Objeto (chips `Ocupación #12`, `Pago #40`, `Caja #7`: un clic filtra por ese objeto; `Alerta #5` y `entidad · id` no filtran), Resumen de una línea y "Ver detalle". La entidad "Ocupacion" no repite el chip de la ocupación. Se eliminó el "resumen por acción" de la pantalla vieja (contaba solo la página cargada).
- **Detalle (`src/componentes/DetalleEventoDialog.jsx`).** Encabezado con fecha, fuente, acción, quién e ids; PAGO, DEVOLUCION, CAJA y ALERTA como pares campo y valor; AUDITORIA como tabla `Campo | Antes | Después` con lo cambiado resaltado, interruptor "Solo los cambiados" (activado) y "Ver JSON" (los objetos crudos).
- **Datos personales (P-9 del backend).** El `antes`/`despues` de Cliente y Usuario puede incluir nombre, documento, teléfono y email. La pantalla los muestra tal cual solo a quien tiene `auditoria.ver`, no los guarda en el navegador, no los manda a la consola ni a la URL, y no los enmascara por su cuenta. El JSON crudo queda detrás de "Ver JSON".

## Módulos de API

| Función | Endpoint | Devuelve |
|---|---|---|
| `listTrazabilidad(filters)` (`src/api/trazabilidadApi.js`) | `GET /Trazabilidad` (`fuente=A&fuente=B`) | `PagedResponse<EventoTrazabilidad>` (`normalizePaged`) |
| `listUsuarios()` (`src/api/usuariosApi.js`) | `GET /Usuarios` | `Usuario[]` (lanza `respuesta_invalida` si no es un arreglo) |

`usuariosApi.js` nace con una sola función; la spec 12 agrega las demás al mismo archivo sin recrearlo.

## Enums de string (D-FD4)

`Fuente` (5) y `AccionTrazabilidad` (20) en `src/constants/enums.js`, con el texto en mayúsculas como `value`. `defineEnum` ya admitía valores de texto (P-FD-L1: no hizo falta ampliarlo). El backend manda la acción de AUDITORIA `Finalizar` (F mayúscula, resto minúscula; DV-FD1): la pantalla pasa siempre por `canonicalKey` (`String(s).trim().toUpperCase()`) antes de `labelOf` y `colorOf`, así que `Finalizar` se ve como "Finalizar" y no hay que tocar nada si el backend lo corrige (PB-2). Un valor desconocido se muestra tal cual, con color `default`.

## Estructura real de `detalle` (relevada del backend, P-FD2 y P-FD-L2)

Relevado de `ConsultaDeTrazabilidad.cs` (método `Armar`), `AuditWriter.cs` y los servicios que auditan; no con respuestas reales del backend en ejecución.

| Fuente | `accion` | Claves de `detalle` |
|---|---|---|
| PAGO | `PAGADO`, `ANULADO` (nombre de `EstadoPago`) | `monto`, `metodo` (nombre de `MetodoPago`), `motivo` |
| DEVOLUCION | `DEVOLUCION` | `monto`, `metodo`, `motivo` |
| CAJA | `APERTURA`, `CIERRE`, `REAPERTURA` (nombre de `TipoEventoCaja`) | Solo las que tengan valor: `fondoDeclarado`, `fondoQueQuedo`, `efectivoContado`, `efectivoEsperado`, `diferencia`, `fondoSiguiente` (dinero), `observacion` y `motivo` (**texto**, no dinero) |
| ALERTA | `RESOLUCION`, `RESOLUCION_AUTOMATICA` | `tipo` (nombre de `TipoAlertaOperativa`), `comentario` |
| AUDITORIA | `CREAR`, `EDITAR`, `CANCELAR`, `Finalizar`, `INVITAR`, `CAMBIAR_ROL`, `DESACTIVAR`, `REACTIVAR`, `REENVIAR_INVITACION`, `BORRAR`, `AJUSTAR_PRECIO`, `PROGRAMAR_BAJA` | `antes`, `despues` (objetos, o `null`); si no se pudo parsear, `null` y el texto en `antesTexto` / `despuesTexto` |

- **`entidad` (AUDITORIA):** `Ocupacion` (también para contratos mensuales), `Cliente`, `Cochera`, `Tarifa` y `Usuario`. Cuando la entidad es `Ocupacion`, el evento trae además `ocupacionId`.
- **`antes`/`despues`:** el backend los guarda con `JsonSerializer.Serialize` por defecto: las claves son **PascalCase** (`PrecioTotal`, `Rol`) o las propiedades de cada tipo, los enums salen como **enteros** salvo los que el código convierte con `ToString()` (por ejemplo `Rol` en Usuario), y los instantes salen como `DateTime`: con `Z` si el valor era UTC al serializar y **sin zona** si venía de la base (Kind sin especificar). La pantalla convierte solo los que traen `Z` y deja los demás tal cual (P-FD7).
- Los eventos de CAJA no traen `ocupacionId` ni `pagoId`; los de ALERTA no traen `pagoId`; los de AUDITORIA no traen `pagoId` ni `cajaSesionId`. Un filtro por `pagoId` excluye a AUDITORIA, CAJA y ALERTA; uno por `ocupacionId`, a CAJA.

## Lógica pura (`src/utils/trazabilidad*.js`)

Sin React; la zona entra siempre como parámetro. Ninguna usa `Date#getHours`, `toLocale*` ni `toISOString` (lo verifica un test).

- `trazabilidadLink.js`: `TRAZABILIDAD_PATH` (definida en `src/auth/routes.js`), `buildTrazabilidadPath`, `parseTrazabilidadQuery`, `isPositiveId`, `ID_KEYS`.
- `trazabilidadFiltros.js`: `validateFiltros`, `toApiParams`, `defaultFiltros`, `emptyFiltros`, `hasObjeto`.
- `trazabilidadEvento.js`: `canonicalKey`, `diffAntesDespues` (primer nivel; claves en el orden de `despues` y luego las solo de `antes`; `agregado` si `antes` es nulo, `quitado` si `despues` es nulo), `auditoriaDetalle` (modo `texto` o `diff`), `formatValor` (`null` → "—", booleano → "Sí"/"No", instante con Z → fecha y hora con segundos en la zona del tenant, objeto → JSON compacto; un número no se interpreta), `humanizeKey`, `detallePares` y `resumenDeEvento` (PAGO/DEVOLUCION: `$ 1.200,00 · Efectivo · motivo`; ALERTA: `Caja sin cerrar · comentario`; CAJA: `Fondo declarado: $ 1.000,00 · …`; AUDITORIA: "N campo(s) modificado(s)", "Alta" o "Baja").

## Retiro de Auditoría (D-FD13)

Se borró `src/pages/Auditoria.jsx` con `fmtDate`, `ACCION` y los `toISOString`, y su excepción de `toLocale*` en `eslint.config.js`. La ruta es `/trazabilidad` (menú "Trazabilidad") y `/auditoria` redirige.
