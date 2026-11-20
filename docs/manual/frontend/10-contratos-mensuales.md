# Manual — 10 Contratos mensuales

> Cómo funcionan las acciones sobre un contrato mensual: ajuste de precio individual, baja programada (y quitarla) y ajuste masivo por porcentaje. Spec: `docs/specs/frontend/10-contratos-mensuales.md`. Backend: `docs/inventario/backend.md`, sección `/Ocupacion`.

## Resumen

La spec 07 dejó en el detalle de la ocupación una sección "Contrato mensual" (solo para MES). La 10 reemplaza su cuerpo por `ContratoMensualSeccion` y suma, en el encabezado de Ocupaciones, el botón "Ajustar precios mensuales". El cliente **no calcula ningún precio ni saldo** y no valida reglas de negocio ni topes de configuración: valida formato y largo, y el backend decide. Después de cualquier escritura se recarga el detalle y el listado.

## Piezas

| Archivo | Qué es |
|---|---|
| `src/api/ocupacionApi.js` | Suma `adjustOcupacionPrecio`, `setOcupacionFin` y `adjustPreciosMensuales` (esta lanza `respuesta_invalida` si falta `cantidad` o `contratos`) |
| `src/utils/contratos.js` | Lógica pura: acciones por permiso, validaciones, candidatos, resultado del lote, aviso de saldo, errores por `code` |
| `src/componentes/ocupaciones/ContratoMensualSeccion.jsx` | La sección del detalle y sus botones |
| `AjustePrecioDialog.jsx`, `ProgramarBajaDialog.jsx`, `QuitarBajaDialog.jsx` | Las tres acciones sobre un contrato |
| `AjusteMasivoDialog.jsx` | Diálogo de 3 pasos, montado desde `Ocupaciones.jsx` |

## La sección "Contrato mensual"

Muestra el modo de mes y la fracción ("Congelados al crear": no cambian con la configuración del tenant), el **precio de partida**, el fin del contrato (o "Sin fin (contrato abierto)") y las acciones. Se rotula "Precio de partida" y no "Precio actual" porque el backend no devuelve el precio vigente ni los cambios de precio (PB-18): los ajustes se guardan aparte y no modifican `precioUnitarioAplicado`.

## Ajuste de precio individual

`POST /Ocupacion/{id}/precio` con `{ vigenteDesde, precioUnitario, motivo }`. `vigenteDesde` es un `DateOnly` que viaja sin convertir; por defecto es mañana. Que sea posterior a hoy lo valida el backend (400 `errors.VigenteDesde`, se marca el campo). Al éxito, el diálogo muestra el precio anterior (vigente en esa fecha) y el nuevo que devolvió el backend. El ajuste es append-only: para volver atrás se carga otro.

## Baja programada y quitar la baja

`PUT /Ocupacion/{id}/fin`. "Programar baja" / "Cambiar fecha de fin" usa un `datetime-local` en la zona del tenant, convertido con `localInputToInstant` (una hora inexistente por DST da un aviso y no se envía). "Quitar baja" confirma y manda `{ fin: null }` (la clave siempre va). Se ofrece sobre un MES con estado guardado ACTIVA (reserva, en curso o vencida); un contrato vencido se puede extender con una fecha futura. Reglas del backend (no se validan acá): fin posterior a ahora, tope de 3 años, choque con otra ocupación (`cochera_no_disponible`).

## Saldo a favor y alerta

Programar una baja puede dejar saldo a favor y crea la alerta `DEVOLUCION_PENDIENTE`. La respuesta del PUT no trae el saldo, así que el diálogo pide el detalle otra vez y, si `saldoAFavor > 0`, avisa (con "Avisá a un dueño" si el usuario no tiene `pagos.devolver`). La devolución se hace desde "Cuenta" (spec 08), que ofrece "Registrar devolución"; al devolver todo, la alerta se resuelve sola. Un ajuste de precio que deja saldo a favor no crea alerta (bug del backend, PB-21): el front no lo compensa.

## Ajuste masivo

Botón "Ajustar precios mensuales" en Ocupaciones, con `tarifas.editar`. Tres pasos:

1. **Datos:** `vigenteDesde`, `porcentaje` (−50 a 100, hasta 2 decimales) y `motivo`.
2. **Revisar y excluir:** pide `GET /Ocupacion?estado=1&take=500` y se queda con los MES; tabla Cochera, Cliente, Fin y casilla "Excluir". El backend no filtra por tipo ni simula, así que esta tabla es solo una ayuda: **el alcance lo decide el backend** (todo MES activo sin fin o con fin posterior a `vigenteDesde`, menos los excluidos; los ids que no existen se ignoran en silencio). Si llegaron 500 se avisa que puede haber más. "Aplicar ajuste" exige tildar "Entiendo que el ajuste no se puede deshacer". Sin la lista (falla la carga) no se aplica.
3. **Resultado:** lo que devolvió el backend, por ocupación ascendente (los precios nuevos se redondean al peso en el backend). Sin contratos: "No había contratos para ajustar".

El lote es todo o nada: si algún precio quedaría en cero, el backend da 400 `errors.Porcentaje` y no cambia nada; el diálogo vuelve al paso 1 con lo escrito y las casillas.

## Permisos

| Acción | Permiso |
|---|---|
| Ajustar precio (individual) | `tarifas.editar` y MES con estado guardado ACTIVA |
| Programar baja, cambiar fin, quitar baja | `ocupaciones.finalizar` y MES con estado guardado ACTIVA (quitar solo con fin) |
| Ajuste masivo | `tarifas.editar` |
| Registrar devolución | `pagos.devolver` y `saldoAFavor > 0` (spec 08) |

Se ocultan, nunca se deshabilitan. El DUENO hace todo; ENCARGADO y OPERADOR solo la baja; el AUDITOR solo mira.

## Errores por `code`

El aviso es siempre el `title` del backend (`showApiError`). El texto propio de `ocupacion_no_activa` (desvío DV-FJ3, `contratoErrorOverride`) se retiró en la spec 14 (PB-23): la Tanda A del backend devuelve un `title` genérico.

| `code` | Qué pasa |
|---|---|
| `datos_invalidos` | Marca el campo con el primer mensaje (`contratoFieldErrors`); el diálogo queda abierto. En el lote vuelve al paso 1 |
| `ocupacion_no_encontrada`, `ocupacion_no_mensual`, `ocupacion_no_activa` | Cierra el diálogo y recarga detalle y listado (con el 404, el detalle se cierra solo al recargar) |
| `cochera_no_disponible`, `sin_permiso`, de red | Solo el aviso; el diálogo conserva lo escrito y el reintento es manual |

## Lo que le queda al backend

PB-18 (precio vigente y cambios de precio en el detalle), PB-19 (filtro `tipo` en el listado), PB-20 (simulación del lote), PB-21 (alerta tras un ajuste a la baja), PB-22 (validar fin posterior al inicio) y PB-23 (`title` genérico de `ocupacion_no_activa`). Ver `docs/inventario/brechas-front.md`.
