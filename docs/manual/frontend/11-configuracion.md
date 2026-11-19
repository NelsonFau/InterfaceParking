# Manual — 11 Configuración del tenant

> Cómo funciona la pantalla de Configuración: ver y editar los parámetros del local, con control de concurrencia y aviso antes de los cambios de mayor impacto. Spec: `docs/specs/frontend/11-configuracion.md`. Backend: `docs/inventario/backend.md`, `/Configuracion` (incluido "Significado de cada campo"); código: `Service/ConfiguracionService.cs`.

## Resumen

`/configuracion` (menú "Configuración", al final, antes de "Usuarios") muestra la configuración del tenant en una tarjeta con los campos agrupados. El DUENO la edita; el ENCARGADO y el AUDITOR ven los mismos valores con los campos deshabilitados, sin "Guardar" y con el aviso "Solo el dueño puede modificar la configuración". El OPERADOR no ve el ítem de menú y por URL ve "No tenés permiso".

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/configuracionApi.js` | `getConfiguracion`, `updateConfiguracion`. Verifican la forma de la respuesta (`respuesta_invalida`) y no capturan errores |
| `src/constants/zonasHorarias.js` | Las 12 zonas que acepta el backend, con etiqueta, y `labelOfZona` |
| `src/utils/configuracion.js` | Lógica pura: `CONFIG_LIMITS`, `CONFIG_AYUDA`, `toForm`, `validateConfiguracionForm`, `diffConfiguracion`, `buildUpdateBody`, `summarizeChanges`, `afterSaveError` |
| `src/pages/Configuracion.jsx` | Orquestador de estado y diálogo de confirmación |
| `src/auth/MeProvider.jsx` | `refreshMe()` (aditiva) |

## Qué hace cada campo

| Campo | Qué hace |
|---|---|
| Zona horaria | Zona horaria del local. Con ella se calculan los días del local (por ejemplo, el día de una caja) y se muestran todas las fechas y horas. No se puede cambiar con una caja abierta |
| Modo de caja | Diaria: una caja por día, que se abre sola con el primer movimiento. Por turno: la caja se abre y se cierra a mano, y sin caja abierta no se puede cobrar, anular ni devolver. No se puede cambiar con una caja abierta |
| Tolerancia de inicio (0 a 168 h) | Horas hacia atrás desde ahora en las que se puede registrar el inicio de una ocupación sin permiso especial. Un inicio más viejo es retroactivo y exige permiso y motivo |
| Tope hacia atrás (1 a 3650 días) | Máximo de días hacia atrás para el inicio de una ocupación, para todos los roles |
| Techo hacia adelante (1 a 24 meses) | Máximo de meses hacia adelante para el inicio de una ocupación. No limita el fin ni las tarifas |
| Gracia por hora (0 a 59 min) | Solo en ocupaciones por hora: tolerancia sobre la última fracción antes de cobrar otra hora. Con 10, 1 h 05 paga 1 hora y 1 h 15 paga 2 |
| Modo del mes | Cómo se arman los períodos de un contrato mensual: Calendario (del 1 al fin de cada mes), Corrido (mismo día y hora de cada mes), Bloques de 30 días. Afecta solo a los contratos nuevos |
| Fracción del mes | Cómo se cobra un período incompleto: Completo, o Proporcional (días cubiertos sobre días del período, redondeado al peso entero). Afecta solo a los contratos nuevos |
| Días de gracia de mora (0 a 60) | Días desde el inicio de un período impago de un contrato mensual activo antes de considerarlo en mora y generar la alerta |
| Ventana de alertas (7 a 90 días) | Solo lectura: la fija la plataforma. Se muestra como dato, sin campo |

Los rangos los valida el cliente (enteros, sin decimales ni signos) y también el backend. Las pantallas de Ocupaciones y Contratos **no** validan estos límites en el cliente: el backend es la autoridad.

## Cómo guarda

- El formulario guarda el **original** (lo último que vino del servidor, con su `version`) y el **borrador**. "Descartar cambios" vuelve el borrador al original sin pedido.
- "Guardar" está deshabilitado sin cambios (el backend cambia la `version` en todo `PUT`, aunque no cambie nada), con errores de validación o mientras hay una llamada en curso.
- El `PUT` lleva siempre `zonaHoraria`, `modoCaja` y `version` (tal cual vino) y, de los demás, solo los que cambiaron. Nunca `ventanaAlertasDias`.
- Si cambió la zona, el modo de caja, el modo del mes o la fracción del mes, se abre antes un diálogo "Confirmar cambios" con un párrafo por cada cambio. Un cambio de otros campos guarda directo.
- En éxito: "Configuración guardada" y el formulario toma la respuesta del `PUT` (con la `version` nueva), sin un `GET` aparte.
- Una zona guardada fuera de la lista se muestra como "`<IANA>` (fuera de la lista)" hasta que el usuario la cambie.

## Concurrencia con `version`

`version` es un token opaco (base64) que el front no interpreta ni muestra. Si otra persona guardó antes, el `PUT` da 409 `configuracion_modificada`: se muestra el `title`, el borrador queda tal cual y aparece "Recargar valores", que trae la configuración vigente y descarta lo editado. No hay reintento ni recarga automáticos.

## Qué hace `refreshMe()`

`useMe().refreshMe()` vuelve a pedir `GET /me` sin pasar por "cargando" (no desmonta la pantalla). Valida la zona igual que la carga inicial; si falla o la zona es inválida, conserva el `me` anterior y rechaza con `ApiError`. Si hay varias en curso, gana la última respuesta. La pantalla la llama después de guardar un cambio de zona.

Límites: las pantallas que ya estaban cargadas muestran sus datos en la zona vieja hasta que vuelvan a cargar (al navegar o con su botón de refrescar), y los otros usuarios del mismo tenant siguen con la zona vieja hasta recargar `/me`: no hay polling ni push. Si `refreshMe` falla tras guardar, el guardado ya está hecho: se ve "La configuración se guardó, pero no pudimos actualizar la zona horaria en esta sesión. Recargá la página."

## Permisos

| Qué | Permiso | Quién |
|---|---|---|
| Entrar y ver | `configuracion.ver` | DUENO, ENCARGADO, AUDITOR |
| Editar y guardar | `configuracion.editar` | DUENO |

Todo se resuelve con `can`, nunca por rol. Un `PUT` forzado sin permiso da 403 `sin_permiso`.

## Errores por `code`

Todos pasan por `showApiError` (el `title` del backend tal cual). Lo que hace la pantalla después (`afterSaveError`):

| `code` | Cuándo | Después |
|---|---|---|
| `configuracion_modificada` | 409: otro guardó antes | Aviso y "Recargar valores". El borrador queda |
| `caja_abierta` | 409: cambiar zona o modo de caja con cualquier caja abierta del tenant | Aviso. El diálogo se cierra, el borrador queda, no se recarga |
| `datos_invalidos` | 400: zona fuera de la lista o valor fuera de rango | Aviso. Sin recarga |
| `sin_permiso` | 403 | Aviso. Sin recarga |
| Otros (`sin_conexion`, `tiempo_agotado`, etc.) | | Aviso. El borrador se conserva para reintentar |
