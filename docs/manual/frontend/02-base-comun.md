# Manual 02 — Base común

Cómo funciona y cómo se usa la base común del frontend (spec `docs/specs/frontend/02-base-comun.md`). Se completa paso a paso; hoy cubre los pasos 1 y 2 (fechas) 3 (formato), 4 (enums), 5 (paginación) y 6 (parámetros de API).

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

## 3. Formato de moneda y números

Módulo: `src/utils/formato.js`. Fija en un solo lugar el locale `es-UY` y la moneda `UYU` (la moneda por tenant es el pendiente P-FB3: `/me` no la trae).

| Función | Qué hace |
|---|---|
| `formatMoney(value)` | Importe con `Intl.NumberFormat` (`$ 1.234,50`; los espacios son no cortables). Si `Intl` falla, `$ <número>` |
| `formatNumber(value)` | Número sin moneda, con separador de miles (`1.234`), para conteos y porcentajes |

Un valor `null`, `undefined`, `""`, solo espacios, no numérico o no finito devuelve `—`, no `$ 0,00` ni `0`: `precioTotal` es `null` hasta finalizar la ocupación y mostrar cero sería falso. El `0` sí es un valor y se formatea. Se aceptan números y textos numéricos (`"1234.5"`).

`toLocaleString` queda prohibido fuera de `fechas.js` y `formato.js` (regla de ESLint del paso 8), también para números.

## 4. Enums

Módulo: `src/constants/enums.js`. Los 15 enums del inventario (`docs/inventario/backend.md`, sección 2), que es la única fuente de valores. Un test compara cada enum contra esa tabla.

### Forma
Cada enum se declara con `defineEnum(nombre, entradas)`. La constante expone sus claves como valores (`TipoOcupacion.HORA === 1`) y guarda por entrada `{ key, value, label, color?, calculado?, dinero? }`. `value` puede ser **número o texto** (no se asume entero), para que la spec 04 sume `Fuente` y `AccionTrazabilidad` con la misma forma. `defineEnum` lanza si hay un valor duplicado, un `value` inválido o falta la etiqueta. Los valores retirados del backend no se declaran (`RolUsuario` sin el 2, `TipoAlertaOperativa` sin el 4).

| Helper | Qué hace |
|---|---|
| `labelOf(E, value)` | Etiqueta. Desconocido o retirado → `String(value)`. `null`/`undefined` → `""`. La comparación es estricta: `"1"` no es `1` |
| `colorOf(E, value)` | Color de MUI; sin color o desconocido → `"default"` |
| `labelOfKey(E, key)` | Etiqueta desde el nombre en texto (`"DUENO"` → "Dueño"). Solo para mostrar, nunca para decidir (ARQ-4) |
| `optionsOf(E, { only, exclude, excludeCalculated, allLabel })` | `{ value, label }[]` para un `<TextField select>`. `only` y `exclude` son listas de claves; `allLabel` agrega `{ value: "", label }` al principio |
| `entriesOf(E)` | Las entradas completas, para quien necesite `calculado` o `dinero` |

```jsx
<Chip label={labelOf(EstadoCochera, c.estado)} color={colorOf(EstadoCochera, c.estado)} />
<TextField select value={tipo}>
  {optionsOf(TipoAlertaOperativa, { allLabel: "Todos" }).map((o) => (
    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
  ))}
</TextField>
```

Marcas: `calculado` (VENCIDA, OCUPADA, RESERVADA: las calcula el backend y no se envían; `excludeCalculated` las saca de un selector) y `dinero` (las 7 alertas de dinero: 5, 6, 7, 8, 9, 11 y 12).

### Migración de alertas
`src/constants/operationalAlerts.js` se borró (tenía los tipos 1 a 4 mal y no conocía el 5 al 12). `OperationalAlerts.jsx` y `OperationalDashboard.jsx` usan `labelOf`/`colorOf` de `SeveridadAlerta` y `labelOf` de `TipoAlertaOperativa`. Un tipo desconocido muestra ahora el número en vez de "Tipo desconocido"; la severidad desconocida sigue mostrando "SIN SEVERIDAD". El filtro de tipo de alertas se arma con `optionsOf`. Las constantes locales del resto de las páginas las retira cada spec (spec 02, sección 5.4).

## 5. Paginación

Módulos: `src/utils/paginacion.js` (puro) y `src/utils/usePagination.js` (hook). El backend pagina con `page` de 1 en 1 y MUI `TablePagination` de 0 en 0; la conversión vive solo acá.

| Pieza | Qué hace |
|---|---|
| `DEFAULT_PAGE_SIZE = 20`, `PAGE_SIZE_OPTIONS = [10, 20, 50, 100]` | 20 es el valor por defecto del backend; 100 es el tope de Cliente, alertas y Trazabilidad |
| `normalizePaged(data)` | Valida `{ items: [], total, page, pageSize }` y la devuelve. Si no, lanza `ApiError` con `respuesta_invalida` |
| `lastPage(total, pageSize)` | Última página, mínimo 1 |
| `paginationReducer(state, action)` | Reductor de `{ page, pageSize }`: `setPage`, `setPageSize` (vuelve a la 1), `reset` (a la 1; al cambiar filtros) y `fit` (con `total`: si la página quedó más allá de la última, baja a la última; pasa al borrar el último elemento de la última página) |
| `toTablePaginationProps(estado, { onPageChange, onPageSizeChange, pageSizeOptions })` | Props de `TablePagination`: pasa `page` a base 0, recorta al rango válido, trae "Filas por página" y "1–20 de 134". Los callbacks reciben la página de 1 en 1 y el tamaño como número. Si el tamaño actual no está en las opciones, lo suma (MUI avisa por consola si falta) |
| `usePagination({ pageSize })` | `useReducer` sobre el reductor: `{ page, pageSize, setPage, setPageSize, reset, fit }` |

El hook **no pide datos**: la pantalla llama a su módulo de API y pasa el resultado por `normalizePaged`.

```jsx
const pg = usePagination();
// al cargar: const r = normalizePaged(await listAlertas({ page: pg.page, pageSize: pg.pageSize, ...filtros }));
// al borrar el último elemento de la última página: pg.fit(r.total)
// al cambiar un filtro: pg.reset()
<TablePagination component="div" {...toTablePaginationProps(
  { page: pg.page, pageSize: pg.pageSize, total },
  { onPageChange: pg.setPage, onPageSizeChange: pg.setPageSize },
)} />
```

Se prueban el reductor y las funciones puras. El hook es una línea sobre el reductor y no se prueba (sin Testing Library, D-FA4). `Clientes.jsx` conserva su paginación propia (P-FB6).

## 6. Parámetros de query

- `src/api/params.js` exporta `cleanParams(obj)`: quita las claves con `undefined`, `null` o `""` (para no mandar `q=` ni `hasta=`) y conserva `false` y `0`. No modifica el objeto recibido. Se usa en cada módulo de API: `http.get("/Cliente", { params: cleanParams(filters) })`.
- `src/api/http.js` configura `paramsSerializer: { indexes: null }`: un arreglo sale como `fuente=PAGO&fuente=CAJA`. El valor por defecto de axios lo manda como `fuente[]=PAGO&fuente[]=CAJA`, y el backend (Trazabilidad, `fuente` repetible) no lo enlaza.
- P-FB-L2 resuelto: axios 1.13.2 acepta `indexes: null` en `paramsSerializer`. Lo verifica `test/unit/api/params.test.js` con `http.getUri`. El test fija las variables `VITE_` con `vi.stubEnv` (no lee el `.env`).
- Los parámetros no se arman en la URL a mano: van por `params`.
