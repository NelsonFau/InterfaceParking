# Manual — 03 Tarifas con vigencia

> Se completa paso a paso; la versión final se cierra en el paso 6 de la spec (`docs/specs/frontend/03-tarifas.md`).

## Módulo de API (`src/api/tarifaApi.js`)

Patrón de la 02 (D-FB14): funciones `async` que devuelven `data`, sin capturar errores (la pantalla llama a `showApiError`) y sin convertir fechas ni enums.

| Función | Endpoint | Devuelve |
|---|---|---|
| `listTarifasVigentes()` | `GET /Tarifa/vigentes` | `{ tipo, vigente, proxima }[]` (siempre 3) |
| `listTarifaHistorial(tipo)` | `GET /Tarifa/historial` con `params: { tipo }` | `Tarifa[]` |
| `updateTarifa(body)` | `PUT /Tarifa` | `Tarifa` |
| `removeTarifa(id)` | `DELETE /Tarifa/{id}` | `undefined` (204) |

Las dos lecturas lanzan `ApiError` con `code: "respuesta_invalida"` si la respuesta no es un arreglo: una respuesta rara no se disfraza de "no hay tarifas".

## Pantalla de lectura (`src/pages/Tarifas.jsx`)

- **Carga.** Al entrar y en "Refrescar"/"Reintentar" se piden `listTarifasVigentes` y `listTarifaHistorial(tipo)` en paralelo. Un contador `reloadKey` dispara las dos cargas; cualquier escritura futura lo incrementa para recargar (`vigenteHasta` y `proxima` se calculan al leer, así que no se actualiza el estado a mano). Cada efecto lleva una bandera `ignore` que descarta la respuesta si llegó tarde (cambio rápido de tipo).
- **Error de carga.** Si falla `/vigentes`, el estado queda en "no cargado" y se ve "No pudimos cargar las tarifas" con "Reintentar"; nunca "Sin tarifa vigente". Si falla el historial, lista vacía y el aviso de `showApiError`.
- **Tarjetas.** Una por tipo, en el orden de la API (Hora, Día, Mes): etiqueta del enum, `formatMoney(precio)` (`—` si no hay) y "Vigente desde dd/mm/yyyy", o "Sin tarifa vigente". Si hay `proxima`, debajo va el chip "Programada" y "Desde dd/mm/yyyy: $ X". Las demás futuras de un tipo solo se ven en el historial.
- **Historial.** Selector de tipo, filas en el orden de la API (`vigenteDesde` descendente) con precio, "Desde … hasta …" o "sin fecha de fin" y el chip de estado de `tarifaEstado(t, today)`. "Hoy" sale de `useTenantDates().today()` (zona del tenant).
- **Fechas y dinero.** `DateOnly` se muestra con `formatDateOnly` (nunca por `Date`); el dinero con `formatMoney`. Las etiquetas de tipo son las del enum ("Hora / Día / Mes"), no las de las copias locales retiradas.

## Lógica pura (`src/utils/tarifas.js`)

Sin React ni estado. "Hoy" entra siempre como parámetro (un `DateOnly` en la zona del tenant); ningún test depende de la fecha del sistema.

### Estado de una tarifa: `tarifaEstado(tarifa, today)`

| Estado | Condición |
|---|---|
| `vigente` | `tarifa.vigente === true` (lo calcula el backend) |
| `programada` | no vigente y `vigenteDesde > today` (comparación de texto `yyyy-MM-dd`, estricta) |
| `finalizada` | el resto |

El caso `vigenteDesde == today` sin `vigente` da `finalizada`: solo fija el límite de la comparación, no es una regla de negocio.

### Validación del formulario: `validateTarifaForm({ precio, fecha }, today)`

Devuelve `{ ok: true, nuevoPrecio, vigenteDesde }` o `{ ok: false, errors: { precio?, fecha? } }`.

- Precio: tras `trim`, `^\d+(\.\d{1,2})?$`; mayor que 0; menor o igual a `MAX_PRECIO` (10.000.000, inclusivo).
- Fecha: vacía = rige desde hoy (`vigenteDesde: null`); si no, `isDateOnly` y no anterior a hoy.

### Cuerpo del `PUT`: `buildUpdateBody(tipo, { nuevoPrecio, vigenteDesde })`

Sin fecha **omite** la clave `vigenteDesde` (no manda `null`): el backend resuelve "hoy" en la zona del tenant.

### Resumen de confirmación: `summarizeChange(...)`

Devuelve `{ precioActual, precioNuevo, fechaEfectiva, reemplaza }`. `reemplaza` es la tarifa **programada** del historial con la misma `vigenteDesde`; con fecha efectiva igual a hoy nunca hay reemplazo (el backend responde `tarifa_ya_vigente`).

### Recarga tras un error: `shouldReloadAfter(code)`

Verdadero para `tarifa_ya_vigente`, `tarifa_no_encontrada` y `tarifa_modificada` (el estado que ve el usuario quedó viejo). Falso para el resto.
