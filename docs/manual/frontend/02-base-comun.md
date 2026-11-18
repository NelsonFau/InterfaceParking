# Manual 02 — Base común

Cómo funciona y cómo se usa la base común del frontend (spec `docs/specs/frontend/02-base-comun.md`). Se completa paso a paso; hoy cubre el paso 1 (fechas).

## 1. Fechas con la zona del tenant

Módulo: `src/utils/fechas.js` (puro, sin React). Depende solo de `tzOffset` de `@date-fns/tz` 1.5.0 y de `Intl.DateTimeFormat`.

### Regla
La zona del tenant (`/me.tenant.zonaHoraria`, IANA) es la única zona. Lo que el usuario escribe se interpreta en ella y lo que se muestra se convierte a ella. Nunca se usa la del navegador ni la del sistema. Cada función recibe la zona como último parámetro explícito.

### Tres tipos de fecha

| Tipo | Forma | Ejemplo | Quién lo produce |
|---|---|---|---|
| `UtcInstant` | ISO 8601 con zona | `2026-11-11T01:30:00.000Z` | Lo que se envía y todo lo que llega |
| `LocalInput` | `yyyy-MM-ddTHH:mm` (`:ss` opcional) | `2026-11-10T22:30` | `<input type="datetime-local">` |
| `DateOnly` | `yyyy-MM-dd` | `2026-11-10` | Fechas de calendario, `<input type="date">` |

Un `DateOnly` nunca se pasa por `Date`: `new Date("2026-11-10")` es medianoche UTC y en Uruguay se vería como el día anterior. El módulo lo trata como texto.

### Funciones

| Función | Qué hace |
|---|---|
| `localInputToInstant(value, tz)` | `LocalInput` → `{ ok: true, instant }` o `{ ok: false, code, message }`. Vacío → `instant: null`. Códigos: `formato_invalido`, `hora_inexistente` |
| `instantToInput(instant, tz)` | `UtcInstant` → `LocalInput`. Nulo o inválido → `""` |
| `formatInstant(instant, tz, { seconds })` | → `dd/MM/yyyy HH:mm`. Inválido → el texto recibido |
| `formatInstantDate(instant, tz)` | → `dd/MM/yyyy` |
| `instantToDateOnly(instant, tz)` | Día de calendario del instante en la zona |
| `todayInZone(tz, now)` | Hoy en la zona (`now` es para probar) |
| `isDateOnly`, `dateOnlyToInput`, `inputToDateOnly`, `formatDateOnly`, `addDays` | `DateOnly` como texto |
| `dayToInstantRange(d, tz)` | `{ desde, hasta }` = `[inicio del día, inicio del siguiente)` |
| `dateRangeToInstants(A, B, tz, { inclusiveEnd })` | Rango de un filtro por días. `hasta` = inicio de B+1 menos 1 ms (por defecto) o el inicio de B+1. Extremo vacío → `null` |
| `isValidTimeZone(tz)` | `boolean` |

Qué manda cada filtro del backend: `/Ocupacion`, `/operational-alerts` y `/Trazabilidad` tienen `hasta` inclusivo → `dateRangeToInstants` o `localInputToInstant`. `/Caja/sesiones` recibe `DateOnly` tal cual. `/Cochera/disponibles` tiene `hasta` exclusivo → `localInputToInstant`.

### Cómo convierte hora de pared a instante
1. Valida el patrón y que los componentes formen una fecha real.
2. Toma los componentes como si fueran UTC (`pared`).
3. Candidatos de desplazamiento: `tzOffset` en `pared − 24 h` y `pared + 24 h` (los cambios de horario son de 1 h o menos, así que ±24 h ve ambos lados).
4. Para cada desplazamiento `o`, el candidato es `pared − o`; es válido si `tzOffset` en ese instante vuelve a dar `o`.
5. Ninguno válido → `hora_inexistente`. Uno → ese. Dos → el más temprano.

`tzOffset` devuelve **minutos con el signo de la zona** (−180 para Montevideo), al revés de `getTimezoneOffset`. El módulo lo pasa a ms.

### Horario de verano
- **Hora inexistente** (el reloj salta, por ejemplo de 02:00 a 03:00): error `hora_inexistente`, el formulario no envía.
- **Hora repetida** (el reloj se atrasa): se toma la primera, la del horario anterior al cambio.
- **Medianoche inexistente** (Santiago, 06/09/2026): `dayToInstantRange` devuelve como `desde` el primer instante válido del día (01:00 locales), no un error.
- `instantToInput` **no es inyectiva dentro de la hora repetida**: los dos instantes de esa hora dan el mismo `LocalInput`, y volver a convertirlo da el primero. Pasa una hora al año y solo en zonas con horario de verano; se acepta.

Uruguay no tiene horario de verano: esto solo lo cubren los tests, con Nueva York, Madrid y Santiago.

### Comportamiento ante entradas raras (DV-FB3)
- Zona inválida: lanza `RangeError`. No cae a la zona del navegador. `MeProvider` la valida antes de que una pantalla use el módulo (paso 2).
- `DateOnly` inválido en `addDays`, `dayToInstantRange` y `dateRangeToInstants`: lanza `RangeError`.
- Instante sin `Z` ni desplazamiento: se trata como inválido, porque `Date` lo leería en la zona del sistema.
- Las fracciones de segundo de cualquier largo (por ejemplo, las de 7 dígitos de .NET) se aceptan.

### Pruebas
`test/unit/utils/fechas.test.js` cubre los casos 1 a 17 del paso 1. Todas las pruebas pasan la zona de forma explícita: ninguna depende de la zona del sistema. Un test lee el código fuente y falla si aparecen `getHours`, `getDate`, `getTimezoneOffset` o `toLocale`.

## 2. Hook `useTenantDates()` y validación de la zona

### Uso
Las pantallas no tocan la zona: llaman al hook y usan sus funciones.

```js
const { localInputToInstant, formatInstant, today, dateRangeToInstants } = useTenantDates();
const r = localInputToInstant(form.inicio);
if (!r.ok) return toast.error(r.message);
await createOcupacion({ inicio: r.instant /* UtcInstant con Z */ });
```

`src/utils/useTenantDates.js` lee `useMe().me.tenant.zonaHoraria` y devuelve, memoizado por zona: `timeZone`, `localInputToInstant`, `instantToInput`, `formatInstant`, `formatInstantDate`, `instantToDateOnly`, `today`, `dayToInstantRange` y `dateRangeToInstants`, con la zona ya aplicada (sin el parámetro `timeZone`). `today(now)` devuelve el `DateOnly` de hoy en la zona. Las funciones sin zona (`DateOnly`, `addDays`) se importan directo de `fechas.js`.

Solo se usa dentro de las rutas privadas, con `/me` cargado. Si no hay una zona válida, el hook lanza un `Error`: no hay valor por defecto ni vuelta a la zona del navegador (D-FB2).

### Validación en `MeProvider`
Al recibir `/me`, `MeProvider` valida `me.tenant.zonaHoraria` con `isValidTimeZone`. Si falta o es inválida, pasa al estado `error` con el mensaje "No pudimos leer la zona horaria del local". `RequireMe` (en `RequireAuth.jsx`) lo muestra con el botón "Reintentar", que vuelve a pedir `/me`. Un bloqueo de cuenta previo no se pisa (`unlessBlocked`).

El `ApiError` de ese estado lleva el código `respuesta_invalida` con el mensaje explícito (DV-FB4).

### Cómo probarlo a mano
Poné en `MeProvider.jsx`, sin commitear, `isValidTimeZone(...)` forzado a falso (por ejemplo `!isValidTimeZone("Mars/Olympus")` en la condición). Se ve la pantalla de error con "Reintentar". Revertí el cambio antes de commitear.
