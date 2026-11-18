# 02 — Base común: fechas con zona del tenant, enums, paginación y módulos de API

> Frontend · **Aprobada** (18/11/2026) · `feature/spec-front-base` (esta spec) y `feature/front-base` (ejecución, en un worktree aparte, a crear desde `develop` una vez mergeada esta spec) · Última actualización 18/11/2026
>
> Segunda spec del frontend. Es la base que usan las specs 03 a 12: define cómo se manejan las fechas, dónde viven los enums, cómo se pagina y cómo se escribe un módulo de `src/api/`. Arregla además el 400 por fechas sin zona que hoy rompe el alta y los filtros de Ocupaciones.

## 1. Objetivo y alcance

**Objetivo.** Dejar en un solo lugar cuatro cosas que hoy están copiadas en cada pantalla, para que las specs siguientes las referencien en vez de reinventarlas: (1) la conversión de fechas entre lo que escribe el usuario, lo que habla la API y lo que se muestra, siempre en la zona del tenant; (2) los enums del backend con su etiqueta y color; (3) la paginación de `PagedResponse`; (4) el patrón de un módulo de API por recurso.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Fechas | Módulo puro `src/utils/fechas.js` con la zona del tenant como única zona, y su hook `useTenantDates()` | D-FB2 a D-FB7 |
| Horario de verano | Hora inexistente = error de validación; hora repetida = la primera. Probado con Vitest | D-FB6 |
| Formato | `formatMoney` en `src/utils/formato.js` | D-FB12 |
| Enums | Un solo módulo `src/constants/enums.js` con los 15 enums del inventario (sección 2) | D-FB11 |
| Paginación | Funciones puras y un hook para `PagedResponse` y la paginación de MUI | D-FB13 |
| Módulos de API | Patrón por recurso, serialización de parámetros y `cleanParams` | D-FB14, D-FB15 |
| Calidad | Regla de ESLint que bloquea `toLocale*Date/String` fuera del módulo, con excepciones temporales por página | D-FB9 |
| Arreglo mínimo | `Ocupaciones.jsx` manda sus 5 valores de fecha como instante UTC calculado en la zona del tenant | D-FB10 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Reemplazar las copias locales de `fmtDate`, `formatDateTime`, `money`, `ESTADOS`, `TIPOS`, etc. en las páginas | Cada spec retira las de su página (tabla de la sección 5.4) |
| Contenido, errores y permisos de Ocupaciones; alta abierta o retroactiva | Spec 07 |
| Crear los módulos de API de cada recurso | Cada spec crea el de su recurso (D-FB14) |
| Enums de tipo string (`fuente` y `accion` de Trazabilidad, `/me.rol`) | Spec 04 los suma al mismo módulo con la misma forma. `/me.rol` se muestra con `labelOfKey` |
| Rediseño visual | Después, con el diseño de Claude Design |
| Cambios sin commitear que había en `Ocupaciones.jsx` | Quedaron en la rama `wip/ocupaciones-reservas`. La 02 parte de `develop` y no los usa. La 07 los toma como insumo |
| Migrar `Clientes.jsx` a los helpers de paginación | Sin spec asignada (P-FB6). Funciona hoy |

**Estado de alcance.** Etapa 2 del frontend (conectar la funcionalidad del backend antes del diseño nuevo). No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop`; backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 0 | Contrato de fechas: instante con zona al entrar y UTC con `Z` al salir; `DateOnly` sin zona, interpretado en la zona del tenant | 18/11/2026 |
| `docs/inventario/backend.md`, sección 2 | Los 15 enums enteros, con sus valores retirados y calculados | 18/11/2026 |
| `docs/inventario/backend.md`, sección 1 | Qué endpoint recibe y devuelve instantes o `DateOnly`; los límites de `pageSize` por recurso | 18/11/2026 |
| `docs/inventario/backend.md`, sección 5 | Si `hasta` es inclusivo o exclusivo en cada filtro, el límite de 31 días de Trazabilidad y la lista cerrada de 12 zonas (cierra P-FB1 y P-FB2) | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 1 y 5 | El 400 por fechas, los hallazgos de zona del navegador y de "hoy" en UTC, y el reparto de la 02 | 18/11/2026 |
| Spec 01 (`01-autenticacion-y-api.md`) | Formato de spec, `ApiError`, `showApiError`, `useMe`, regla "lógica pura con Vitest" (D-FA4), ESLint como barrera (D-FA11) | 09/11/2026 |
| Lectura de `src/` en `develop` | Las copias de fechas, `money` y enums por página; `meApi.js`, `operationalAlertsApi.js`, `pagosApi.js` | 18/11/2026 |
| npm: `@date-fns/tz` 1.5.0 (publicada el 21/05/2026) y su README y CHANGELOG | TZDate, `tzOffset`, tamaño, historial de correcciones de horario de verano | 18/11/2026 |
| npm: `date-fns-tz` 3.2.0 y su README | `fromZonedTime`, `toZonedTime`, `formatInTimeZone`; peer `date-fns ^3 \|\| ^4` | 18/11/2026 |
| web.dev, InfoQ y otras fuentes sobre Temporal | Soporte de navegadores | 18/11/2026 |

**Referencias externas.** Se consultan en su versión vigente **al ejecutar el paso que las usa**, no de memoria: `@date-fns/tz` (nombre, firma y signo de `tzOffset`; si exige o no `date-fns` como peer), `Intl.DateTimeFormat` (`formatToParts`, `hourCycle`), axios (`paramsSerializer`) y MUI `TablePagination`.

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Formato de fecha | 7 funciones copiadas: `fmtDate` en Auditoría, CajaDiaria, Ocupaciones, OperationalAlerts, OperationalDashboard y Tarifas, y `formatDateTime` en Cocheras. Todas usan `toLocaleString()` con la zona **del navegador**. Una octava, `parseFechaLocal`, existía solo en los cambios sin commitear de Ocupaciones |
| "Hoy" | `CajaDiaria.jsx` y `OperationalDashboard.jsx` calculan `new Date().toISOString().slice(0, 10)`, que es el día **en UTC**. En Uruguay (UTC−3, sin horario de verano), entre las 21:00 y las 24:00 da el día siguiente |
| Envío de instantes | `Ocupaciones.jsx` (en `develop`) y `Auditoria.jsx` mandan `new Date(valor).toISOString()`: lleva `Z`, pero interpreta lo que escribió el usuario en la zona del navegador, no en la del tenant. El 400 sin zona que describe el inventario lo producían los cambios sin commitear de Ocupaciones (ahora en `wip/ocupaciones-reservas`) |
| `DateOnly` | `Tarifas.jsx:139` manda `vigenteDesde` como instante ISO; el backend espera `yyyy-MM-dd` |
| Moneda | `money` repetida en CajaDiaria, Ocupaciones, OperationalDashboard y Tarifas (`es-UY`, `UYU`), con variantes |
| Enums | `src/constants/operationalAlerts.js` (`SEVERIDAD_ALERTA`, `TIPO_ALERTA`); `ESTADO_COCHERA` en Cocheras; `ESTADOS`, `TIPOS`, `METODOS_PAGO` en Ocupaciones; `TIPOS` en Tarifas; `METODOS_PAGO` en CajaDiaria; `ACCION` en Auditoría. `TIPO_ALERTA` está **mal**: tiene 4 valores y no coincide con el backend (el front dice 1 = "Ocupación finalizada sin pago"; el backend dice 1 = `OCUPACION_VENCIDA_SIN_PAGO`) |
| Paginación | Solo `Clientes.jsx` pagina, con botones propios y `page` de 1 en 1. Alertas manda `page: 1, pageSize: 50` fijo |
| Módulos de API | `meApi.js` exporta una función que devuelve `data`. `operationalAlertsApi.js` y `pagosApi.js` exportan un objeto cuyos métodos devuelven la respuesta de axios. Las demás pantallas llaman a `http` directo |
| Pruebas | `test/unit/` con Vitest en entorno `node`, sin Testing Library (D-FA4) |

## 3. Decisiones

Prefijo **D-FB** ("frontend, base"). Estado: **Confirmada** (la tomó el desarrollador o está fijada por una fuente) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva). Código y nombres en inglés; textos visibles y comentarios en español rioplatense, como en la 01. Los nombres de archivo `fechas.js` y `formato.js` son los que pidió el desarrollador.

### 3.1 Forma del trabajo y contrato de fechas

**D-FB1 (18/11/2026) — Confirmada. Ramas desde `develop`.** Esta spec vive en `feature/spec-front-base`, creada desde `develop`. La ejecución va en `feature/front-base`, también desde `develop`, con un commit por paso y un PR a `develop`. Reemplaza a D-FA1 (`master`).

**D-FB2 (18/11/2026) — Confirmada. La zona del tenant es la única zona.** Lo que el usuario escribe en un `datetime-local` se interpreta en `/me.tenant.zonaHoraria` (IANA), y lo que se muestra se convierte a esa zona. Nunca se usa la zona del navegador ni la del sistema. Una zona ausente o inválida **no cae a la del navegador**: eso es justo el bug que se corrige (D-FB7).
*Motivo:* el local opera en una zona; un operador con la computadora mal configurada o de viaje no debe cambiar a qué hora cae un cobro.

**D-FB3 (18/11/2026) — Confirmada (inventario). Tres tipos de fecha.**

| Tipo | Forma | Ejemplo | Quién lo produce |
|---|---|---|---|
| `UtcInstant` | ISO 8601 con `Z` | `2026-11-11T01:30:00.000Z` | Lo que se **envía** (el backend exige zona) y todo lo que **llega** |
| `LocalInput` | `yyyy-MM-ddTHH:mm` (con `:ss` opcional) | `2026-11-10T22:30` | Valor de un `<input type="datetime-local">` |
| `DateOnly` | `yyyy-MM-dd`, sin zona | `2026-11-10` | Fechas de calendario. Valor de un `<input type="date">` |

Campos de cada contrato (referencia para las specs 03 a 12; fuente: inventario, sección 1):

| Dirección | Tipo | Campos |
|---|---|---|
| Se envía | `UtcInstant` | Ocupación: `inicio`, `fin?` (alta), `finReal?` (cancelar), `fin?` (`PUT /fin`). Query: `desde`/`hasta` en `/Cochera/disponibles`, `/Ocupacion`, `/operational-alerts`, `/Trazabilidad` |
| Se envía | `DateOnly` | `vigenteDesde` en `PUT /Tarifa`, `POST /Ocupacion/{id}/precio` y `POST /Ocupacion/ajuste-precio`; `desde`/`hasta` en `/Caja/sesiones` |
| Llega | `UtcInstant` | `fechaCreacion`, `fechaResolucion`, `fechaPago`, `fechaApertura`, `fecha`, `inicio`, `fin`, `finReal` |
| Llega | `DateOnly` | `vigenteDesde` y `vigenteHasta` de `Tarifa`; `vigenteDesde` de las respuestas de precio de contrato |

**Trampa conocida:** `new Date("2026-11-10")` interpreta un `DateOnly` como medianoche **UTC**; en Uruguay se muestra como el día anterior. Un `DateOnly` nunca se pasa por `Date`: el módulo lo trata como texto.

### 3.2 Librería de zonas horarias

**D-FB4 (18/11/2026) — Confirmada. `@date-fns/tz`, usando solo `tzOffset`.** El módulo calcula el desplazamiento de la zona con `tzOffset` de `@date-fns/tz` y formatea con `Intl.DateTimeFormat` (`formatToParts`, `hourCycle: "h23"`), armando el texto `dd/MM/yyyy HH:mm` a mano para no depender de variaciones de ICU. No se agrega `date-fns`: la aritmética de `DateOnly` (`addDays`) se hace sobre el texto. La conversión de hora local a instante y la detección de hora inexistente o repetida **las hace el módulo** (D-FB5), no la librería.

| | `date-fns-tz` 3.2.0 | `@date-fns/tz` 1.5.0 |
|---|---|---|
| Mantenimiento | Última publicación el 30/09/2024 (fecha inferida del registro de npm). 68 issues abiertos | Publicada el 21/05/2026 (1.4.1 el 12/08/2025). El repo pasó al monorepo de `date-fns` |
| Dependencias | `date-fns` como peer (`^3 \|\| ^4`); el README dice "v3" en un lugar y "v2" en otro | No se vio peer en el registro (a verificar, P-FB-L1) |
| Modelo | `fromZonedTime` y `toZonedTime` devuelven un `Date` "corrido": sus campos locales muestran la hora del tenant, pero **no es un instante real**. Fuente clásica de bugs | `TZDate` es un `Date` real con semántica de zona, y `tzOffset(zona, fecha)` da el desplazamiento sin crear objetos corridos |
| Horario de verano | El README no documenta la resolución de hora inexistente ni repetida | Tampoco. El CHANGELOG registra correcciones del caso (1.1.0 "DST bug in the transition hour", 1.1.1 "reworked DST handling") |
| Tamaño | No relevado | `TZDateMini` 916 B, `TZDate` 1,2 kB |

*Motivo:* es la que se mantiene, evita el `Date` corrido y se usa por su parte más chica. Como **ninguna** documenta qué hace con una hora inexistente o repetida, la spec no delega ese comportamiento: lo implementa el módulo con desplazamientos y lo prueba (D-FB5, D-FB6).
*Descartados:* (a) `date-fns-tz`: sin publicaciones desde 2024, README inconsistente y el modelo del `Date` corrido; (b) **Temporal**: ya está en Chrome 144 (enero de 2026) y Firefox 139, pero Safari no tiene versión estable con Temporal según las fuentes que encontré (algunas se contradicen), así que exigiría un polyfill hoy. Se revisa más adelante (P-FB5); (c) `Intl` solo, sin dependencia: es viable (el desplazamiento sale de `formatToParts`, unas 15 líneas más) y es la alternativa si se objeta sumar una dependencia por una sola función. Se descarta porque el desarrollador pidió una librería de zonas.
*A verificar al ejecutar:* P-FB-L1.

**D-FB5 (18/11/2026) — Confirmada. API de `src/utils/fechas.js`.** Módulo **puro** (sin React ni estado), con la zona como último parámetro explícito de cada función que la necesita. No lee la zona del sistema: no usa `getHours`, `getDate`, `getTimezoneOffset` ni `toLocale*`.

| Función | Entrada → salida |
|---|---|
| `localInputToInstant(value, timeZone)` | `LocalInput` → `{ ok: true, instant }` o `{ ok: false, code, message }`. Vacío o solo espacios → `{ ok: true, instant: null }` (que sea obligatorio lo valida el formulario). `code`: `formato_invalido` (no cumple el patrón o no es una fecha real, como `2026-02-30`) o `hora_inexistente` (D-FB6) |
| `instantToInput(instant, timeZone)` | `UtcInstant` → `LocalInput` en la zona. `null`, vacío o inválido → `""` |
| `formatInstant(instant, timeZone, { seconds })` | `UtcInstant` → `dd/MM/yyyy HH:mm` (con `:ss` si `seconds`). `null` o vacío → `""`. Inválido → el texto recibido tal cual (no esconde un dato raro del backend) |
| `formatInstantDate(instant, timeZone)` | `UtcInstant` → `dd/MM/yyyy` del día en la zona |
| `instantToDateOnly(instant, timeZone)` | `UtcInstant` → `DateOnly`: el día de calendario que ese instante tiene en la zona |
| `todayInZone(timeZone, now = new Date())` | → `DateOnly` de hoy en la zona. `now` es para probar |
| `dateOnlyToInput(d)` | `DateOnly` → valor de `<input type="date">` (el mismo texto si es válido; si no, `""`) |
| `inputToDateOnly(value)` | Valor de `<input type="date">` → `DateOnly`, o `null` si está vacío o es inválido |
| `isDateOnly(value)` | `boolean`: cumple `yyyy-MM-dd` y es una fecha real |
| `formatDateOnly(d)` | `DateOnly` → `dd/MM/yyyy`, sin pasar por `Date` |
| `addDays(d, n)` | `DateOnly` → `DateOnly`, con `n` positivo o negativo |
| `dayToInstantRange(d, timeZone)` | `DateOnly` → `{ desde, hasta }`: el inicio de ese día y el inicio del siguiente, como `UtcInstant`, en la zona (intervalo `[desde, hasta)`). Si la medianoche no existe en la zona, `desde` es el primer instante válido del día |
| `dateRangeToInstants(desdeDay, hastaDay, timeZone, { inclusiveEnd = true })` | Rango de un filtro "del día A al día B" → `{ desde, hasta }` como `UtcInstant`. `desde` = inicio de A. `hasta` = inicio de B+1 **menos 1 ms** con `inclusiveEnd: true` (filtros con `hasta` inclusivo), o inicio de B+1 con `inclusiveEnd: false`. Un día vacío o `null` da `null` en su extremo, así que se puede filtrar solo desde o solo hasta |
| `isValidTimeZone(timeZone)` | `boolean` |

**Qué usa cada filtro** (inventario, sección 5):

| Filtro | `hasta` en el backend | Qué manda el front |
|---|---|---|
| `/Ocupacion`, `/operational-alerts`, `/Trazabilidad` | inclusivo (`<=`) | `dateRangeToInstants(A, B, tz)` (con `inclusiveEnd: true`, el valor por defecto) si el filtro es por días; `localInputToInstant` si es por fecha y hora |
| `/Caja/sesiones` | `DateOnly`; el día B entra entero | Los `DateOnly` tal cual, sin convertir |
| `/Cochera/disponibles` | exclusivo (`[desde, hasta)`) | Instantes de `localInputToInstant` (es un rango de uso, no de días) |

Con `inclusiveEnd: true`, un rango de 31 días de calendario (por ejemplo, del 1 al 31 de octubre) mide 31 días menos 1 ms y entra en el límite de Trazabilidad (31 días exactos pasan; inventario, sección 5). En `/Ocupacion`, `desde` filtra por `Inicio` y `hasta` por `Fin` (no por solapamiento), y con `hasta` se excluyen las ocupaciones abiertas. Es un dato para la 07, que decide cómo presentarlo; la 02 no lo cambia.

Algoritmo de `localInputToInstant` (la parte delicada):
1. Validar el patrón `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$` y que los componentes formen una fecha real.
2. `pared` = los componentes tomados como si fueran UTC (`Date.UTC(...)`).
3. Candidatos de desplazamiento = `{ tzOffset(zona, pared − 24 h), tzOffset(zona, pared + 24 h) }` (sin repetidos). Los cambios de horario mueven el reloj 1 hora o menos, así que ±24 h alcanza para ver ambos lados.
4. Para cada desplazamiento `o`, el instante candidato es `pared − o`. Es **válido** si `tzOffset(zona, candidato) === o`, es decir, si ese instante vuelve a mostrar la misma hora de pared.
5. Cero válidos → `hora_inexistente`. Uno → ese. Dos → el **más temprano** (D-FB6).

Notas: en una zona sin horario de verano, los dos candidatos coinciden y hay un solo válido. `instantToInput` **no es inyectiva dentro de la hora repetida**: los dos instantes de esa hora dan el mismo `LocalInput`, y volver a convertirlo da el primero. Se acepta (ocurre una hora al año, solo en zonas con horario de verano) y queda documentado en el manual.
*Motivo:* una función por caso de uso pedido, todas puras y con la misma convención de zona explícita; el resultado como objeto evita `try/catch` en cada handler.
*Descartado:* lanzar una excepción en la hora inexistente: obliga a un `try/catch` en cada formulario y se olvida fácil.

**D-FB6 (18/11/2026) — Confirmada. Horario de verano.**
- **Hora inexistente** (el reloj salta, por ejemplo de 02:00 a 03:00): `{ ok: false, code: "hora_inexistente" }` con el mensaje "Esa hora no existe en la zona del local por el cambio de horario. Elegí otra." El formulario no envía nada.
- **Hora repetida** (el reloj se atrasa y una hora pasa dos veces): se toma la **primera**, la del horario anterior al cambio.
*Motivo:* el usuario nunca registra una hora distinta de la que eligió (no hay corrimiento silencioso) y nunca queda bloqueado una hora entera.
*Descartados:* (a) corrimiento "compatible" de Temporal (00:30 pasaría a 01:30 sin avisar); (b) rechazar también la hora repetida (no se podría cargar nada durante esa hora).

**D-FB7 (18/11/2026) — Confirmada. Hook `useTenantDates()` y validación de la zona en `MeProvider`.**
- `src/utils/useTenantDates.js` lee `useMe().me.tenant.zonaHoraria` y devuelve, memoizado, `{ timeZone, localInputToInstant, instantToInput, formatInstant, formatInstantDate, instantToDateOnly, today, dayToInstantRange, dateRangeToInstants }` con la zona ya aplicada. Las funciones que no usan zona (`DateOnly`, `addDays`) se importan directo de `fechas.js`. Las pantallas llaman al hook y no tocan la zona.
- `MeProvider` valida con `isValidTimeZone` la zona que trae `/me`. Si falta o es inválida, pasa al estado `error` con el mensaje "No pudimos leer la zona horaria del local" y se muestra la pantalla de error de `/me` con "Reintentar" (P-FA13 de la 01). Sin esa validación, el hook fallaría con una pantalla en blanco.
*Motivo:* una sola fuente de la zona, y el fallo es visible en vez de volver silenciosamente a la zona del navegador (D-FB2).
*Descartados:* (a) cada pantalla lee `me.tenant.zonaHoraria` y la pasa a mano: 10 lugares donde olvidarla; (b) un valor por defecto `America/Montevideo`: oculta datos incompletos y es falso para otro país.

### 3.3 Qué pasa con las copias y las páginas

**D-FB8 (18/11/2026) — Confirmada. La 02 deja el módulo listo y no reemplaza las copias.** Las copias de `fmtDate`, `formatDateTime`, `todayISO`, `money` y los enums locales de cada página las retira la spec que reescribe esa página, según la tabla de la sección 5.4. Las excepciones son las dos de abajo (D-FB10 y la migración de alertas de D-FB11).
*Motivo:* esas 7 páginas se reescriben en las specs 03 a 09; tocarlas dos veces genera conflictos y revisiones dobles, y `CajaDiaria.jsx` quedó sin tocar a propósito en la 01 (DV-FA2).
*Descartados:* reemplazar solo las de mostrar en las 7 páginas, o mostrar y enviar en todas: cada una se mete en la lógica de pantallas que se rehacen enseguida.

**D-FB9 (18/11/2026) — Confirmada. Regla de ESLint con excepciones temporales.** En `src/`, `no-restricted-properties` prohíbe `toLocaleString`, `toLocaleDateString` y `toLocaleTimeString` (en cualquier objeto), con el mensaje "Las fechas se muestran con `formatInstant` de `src/utils/fechas.js` (zona del tenant); los números y la moneda, con `formatNumber` y `formatMoney` de `src/utils/formato.js`". Que alcance también a `Number#toLocaleString` es **intencional**: así el locale queda fijo en un solo lugar para números y fechas. Se excluyen `src/utils/fechas.js` y `src/utils/formato.js`. Las páginas que hoy los usan (Auditoría, CajaDiaria, Cocheras, Ocupaciones, OperationalAlerts, OperationalDashboard, Tarifas) quedan como **excepciones temporales** en `eslint.config.js`, cada una marcada con la spec que la retira (sección 5.4), igual que se hizo con `CajaDiaria.jsx` en P-FA12.
*Motivo:* lo que no puede romperse se bloquea con una herramienta (principio 9 del playbook): sin la regla, la siguiente pantalla vuelve a copiar `toLocaleString()`.
*Descartado:* solo documentarlo en `CLAUDE.md`, que se puede saltear.
*Límite:* la regla no detecta `new Date().toISOString().slice(0, 10)` ni `new Date("yyyy-MM-dd")`. Eso queda en la revisión y en el manual.

**D-FB10 (18/11/2026) — Confirmada. Arreglo mínimo de fechas en `Ocupaciones.jsx`.** El paso 7 cambia **solo** los 5 valores que hoy se mandan con `new Date(valor).toISOString()`, para que usen `localInputToInstant` con la zona del tenant:

| Valor | Dónde |
|---|---|
| `desde`, `hasta` | Filtros del listado (`GET /Ocupacion`) |
| `inicio`, `fin` | Alta de ocupación (`POST /Ocupacion`) |
| `finReal` | Cancelar (`POST /Ocupacion/{id}/cancelar`) |

Una hora inexistente se muestra con `toast.error(resultado.message)` y no se envía. La validación "Fin debe ser mayor que Inicio" compara los dos instantes ya convertidos. **No cambia** la UI, los textos, los errores, los permisos ni el resto del archivo; el formato de pantalla sigue siendo `fmtDate` (la 07 lo reemplaza). El paso parte de la versión de `develop`, y se hace sobre un archivo **sin cambios locales**: los cambios que había en el árbol de trabajo quedaron en `wip/ocupaciones-reservas` y no se usan.
*Motivo:* la pantalla manda la hora en la zona del navegador y no la del tenant, y la tabla de brechas le asigna a la 02 el problema de fechas. Esperar a la 07 deja un error silencioso (cobros con hora corrida si el navegador está en otra zona) hasta que se ejecute esa spec.
*Descartado:* dejarlo para la 07. Tampoco se cambia el alta a "sin `fin`" (ocupación abierta): es decisión de producto de la 07.

### 3.4 Formato, enums y paginación

**D-FB11 (18/11/2026) — Confirmada. `src/constants/enums.js`: un módulo con los 15 enums del inventario.**

*Forma.* Cada enum se declara con `defineEnum(nombre, entradas)`. La constante expone sus claves como valores (`TipoOcupacion.HORA === 1`) y guarda por entrada: `value` (entero), `label` (español), `color` (color de MUI, si aplica) y marcas opcionales `calculado` (lo calcula el backend; no se envía) y `dinero` (alerta de dinero). Helpers puros exportados:

| Helper | Qué hace |
|---|---|
| `labelOf(E, value)` | Etiqueta. Valor desconocido (por ejemplo uno retirado) → `String(value)`. `null` o `undefined` → `""` |
| `colorOf(E, value)` | Color de MUI. Sin color o desconocido → `"default"` |
| `labelOfKey(E, key)` | Etiqueta desde el nombre en texto, como el `rol` de `/me` (`"DUENO"` → "Dueño"). Solo para mostrar, nunca para decidir (ARQ-4) |
| `optionsOf(E, { only, exclude, excludeCalculated, allLabel })` | Lista `{ value, label }` para un `<TextField select>`. `allLabel` agrega la opción "Todos" con valor `""` |

Los valores retirados del backend **no** se declaran: `RolUsuario` sin el 2, `TipoAlertaOperativa` sin el 4.

*Enums, etiquetas y colores* (los colores de `EstadoCochera` y `SeveridadAlerta` son los que ya usa el código):

| Enum | Entradas (valor · etiqueta · color) |
|---|---|
| `TipoOcupacion` | HORA 1 Hora · DIA 2 Día · MES 3 Mes |
| `EstadoOcupacion` | ACTIVA 1 Activa `success` · VENCIDA 2 Vencida `warning` *(calculado)* · CANCELADA 3 Cancelada `default` · FINALIZADA 4 Finalizada `info` |
| `EstadoCochera` | DISPONIBLE 1 Disponible `success` · BLOQUEADA 2 Bloqueada `error` · OCUPADA 3 Ocupada `warning` *(calculado)* · RESERVADA 4 Reservada `info` *(calculado)* |
| `MetodoPago` | EFECTIVO 1 Efectivo · TRANSFERENCIA 2 Transferencia · TARJETA 3 Tarjeta · OTRO 4 Otro |
| `EstadoPago` | PAGADO 1 Pagado `success` · ANULADO 2 Anulado `default` |
| `RolUsuario` | DUENO 1 Dueño · ENCARGADO 3 Encargado · OPERADOR 4 Operador · AUDITOR 5 Auditor · SUPERADMIN 6 Superadmin |
| `ModoCaja` | DIARIA 1 Diaria · TURNO 2 Por turno |
| `ModoMes` | CALENDARIO 1 Calendario · CORRIDO 2 Corrido · BLOQUES_30 3 Bloques de 30 días |
| `FraccionMes` | COMPLETO 1 Completo · PROPORCIONAL 2 Proporcional |
| `ResolucionExcedente` | COBRAR_COMPLETO 1 Cobrar completo · DEVOLVER 2 Devolver |
| `EstadoCajaSesion` | ABIERTA 1 Abierta `success` · CERRADA 2 Cerrada `default` |
| `TipoEventoCaja` | APERTURA 1 Apertura · CIERRE 2 Cierre · REAPERTURA 3 Reapertura |
| `TipoMovimientoCaja` | COBRO 1 Cobro `success` · ANULACION 2 Anulación `default` · DEVOLUCION 3 Devolución `warning` |
| `SeveridadAlerta` | BAJA 1 Baja `info` · MEDIA 2 Media `warning` · ALTA 3 Alta `error` · CRITICA 4 Crítica `error` |
| `TipoAlertaOperativa` | OCUPACION_VENCIDA_SIN_PAGO 1 Ocupación vencida sin pago · OCUPACION_VENCIDA_SIN_CIERRE 2 Ocupación vencida sin cierre · TARIFA_EXCEPCIONAL 3 Tarifa excepcional · OCUPACION_FINALIZADA_SIN_PAGO 5 · PAGO_MENOR_AL_ESPERADO 6 · PAGO_REGISTRADO_TARDE 7 · DEVOLUCION_PENDIENTE 8 · DIFERENCIA_DE_CAJA 9 · CAJA_SIN_CERRAR 10 Caja sin cerrar · FONDO_DISTINTO 11 · MENSUAL_IMPAGO 12 |

Etiquetas de `TipoAlertaOperativa` 5 a 12: "Ocupación finalizada sin pago", "Pago menor al esperado", "Pago registrado tarde", "Devolución pendiente", "Diferencia de caja", "Caja sin cerrar", "Fondo distinto", "Mensual impago". Llevan la marca `dinero` los valores 5, 6, 7, 8, 9, 11 y 12, que son las 7 alertas de dinero del inventario.

*Migración incluida en la 02.* `src/constants/operationalAlerts.js` se **borra**, y `OperationalAlerts.jsx` y `OperationalDashboard.jsx` pasan a importar de `enums.js` (cambio mecánico de import y de uso: `TIPO_ALERTA[n]` pasa a `labelOf(TipoAlertaOperativa, n)` y `SEVERIDAD_ALERTA[n]` a `labelOf` y `colorOf` de `SeveridadAlerta`). Es la única migración de enums de la 02: el archivo está equivocado (muestra mal los tipos 1 a 4 y no conoce el 5 al 12), así que dejarlo hasta la 05 deja etiquetas incorrectas en producción. Las constantes locales del resto de las páginas las retira cada spec (sección 5.4).
*Motivo:* el inventario es la única fuente de valores, y un test compara cada enum contra la tabla.
*Descartados:* (a) constantes sueltas sin helpers: cada pantalla reescribe el `find` por valor, como hoy; (b) generar los enums desde el backend: no hay endpoint para eso; (c) migrar también los enums de las páginas en la 02: contradice D-FB8; (d) dejar `operationalAlerts.js` hasta la 05: mantiene un archivo con valores incorrectos.
*Descartado también:* dejar el archivo viejo como reexport temporal de `enums.js` hasta la 05. El desarrollador eligió migrar las dos páginas en la 02.

**D-FB12 (18/11/2026) — Confirmada. `src/utils/formato.js` con `formatMoney` y `formatNumber`.** Fija en un solo lugar el locale `es-UY` y la moneda `UYU`. `formatMoney(value)` devuelve el texto con `Intl.NumberFormat`; si `Intl` falla, `$ <número>`. `formatNumber(value)` formatea un número sin moneda con el mismo locale (separador de miles), para conteos y porcentajes: lo exige D-FB9, que bloquea `toLocaleString` también en números. En los dos, un valor `null`, `undefined`, `""` o no numérico devuelve `"—"` y no `$ 0,00` ni `0`: `precioTotal` es `null` hasta finalizar la ocupación (inventario) y mostrar cero sería falso. La moneda por tenant queda pendiente (P-FB3): `/me` no la trae.
*Motivo:* `money` está copiada en 4 páginas con variantes (una con `maximumFractionDigits`, otra con `Number(n ?? 0)`).
*Descartado:* mantener `money` en cada página hasta que se rehaga. Hay que cambiar el caso `null` (la brecha de `precioTotal`) y conviene hacerlo una sola vez.

**D-FB13 (18/11/2026) — Confirmada. Paginación: funciones puras, un reductor y un hook delgado.** En `src/utils/paginacion.js` (puro) y `src/utils/usePagination.js` (hook):

| Pieza | Qué hace |
|---|---|
| `DEFAULT_PAGE_SIZE = 20`, `PAGE_SIZE_OPTIONS = [10, 20, 50, 100]` | 20 es el valor por defecto del backend; 100 es el tope de Cliente, alertas y Trazabilidad (Caja/sesiones admite 200, pero 100 sirve para todos) |
| `normalizePaged(data)` | Valida que la respuesta sea `{ items: [], total, page, pageSize }` y la devuelve. Si no lo es (por ejemplo, un arreglo), lanza un `ApiError` con el código `respuesta_invalida` de la 01 |
| `lastPage(total, pageSize)` | Última página (mínimo 1) |
| `paginationReducer(state, action)` | Reductor puro de `{ page, pageSize }`. Acciones: `setPage`, `setPageSize` (vuelve a la página 1), `reset` (página 1, para cuando cambian los filtros) y `fit` (si `page` quedó más allá de `lastPage(total)`, baja a la última: pasa al borrar el último elemento de la última página) |
| `toTablePaginationProps({ page, pageSize, total }, { onPageChange, onPageSizeChange, pageSizeOptions })` | Props de MUI `TablePagination`. El backend usa `page` de 1 en 1 y MUI de 0 en 0: convierte y recorta al rango válido. Trae las etiquetas en español ("Filas por página", "1–20 de 134") |
| `usePagination({ pageSize })` | Envuelve el reductor con `useReducer` y devuelve `{ page, pageSize, setPage, setPageSize, reset, fit }` |

El hook **no pide datos**: la pantalla sigue llamando a su módulo de API y pasa el resultado por `normalizePaged`. Se prueba el reductor y las funciones puras; el hook es una línea sobre el reductor y no se prueba (sin Testing Library, D-FA4).
*Motivo:* es lo que las specs 04, 05 y 09 necesitan igual (alertas, Trazabilidad y sesiones de caja usan `PagedResponse`), y la conversión 1 ↔ 0 es la fuente de errores de uno.
*Descartado:* un hook `usePagedQuery(fetcher)` que además cargue: cambia el patrón de carga de pantallas que se rehacen enseguida, y obliga a probar con React. Se puede sumar encima de estas piezas si hace falta.

### 3.5 Módulos de API

**D-FB14 (18/11/2026) — Confirmada. Un módulo por recurso, con funciones nombradas.** Reglas del patrón:
1. Archivo `src/api/<recurso>Api.js`, con el nombre del controller del backend en camelCase: `clienteApi`, `cocheraApi`, `ocupacionApi`, `pagosApi` (ya existe), `tarifaApi`, `cajaApi`, `configuracionApi`, `usuariosApi`, `panelApi`, `trazabilidadApi`, `operationalAlertsApi` (ya existe) y `meApi` (ya existe). Los nombres existentes no se cambian.
2. **Funciones nombradas**, una por endpoint, `async`, que devuelven `data` y no la respuesta de axios: `listClientes`, `getCliente`, `createCliente`, `deactivateCliente`. Es el estilo de `meApi.js`. Los verbos son `list`, `get`, `create`, `update`, `remove` y el nombre de la acción para el resto (`finalizeOcupacion`, `cancelOcupacion`).
3. Los listados paginados pasan por `normalizePaged`. Los `204` devuelven `undefined`.
4. Usan siempre la instancia `http` (la 01). **No** capturan errores: la pantalla llama a `showApiError(e)` (D-FA6). **No** convierten fechas ni enums: reciben valores ya listos (`UtcInstant`, `DateOnly`, enteros). La conversión es de la pantalla, con `useTenantDates`.
5. Los parámetros de query van por `params` de axios, filtrados con `cleanParams` (D-FB15). No se arma la URL a mano.
6. Cada archivo documenta con JSDoc los tipos de entrada y salida, tomados del inventario. Sin TypeScript.
7. Cada spec posterior crea el módulo de **su** recurso. La 02 no crea ninguno. Los módulos existentes con estilo de objeto (`operationalAlertsApi`, `pagosApi`) se migran al estilo de funciones en la spec que los toca (05 y 08).

Ejemplo del patrón (referencia, no se crea en la 02):

```js
// src/api/clienteApi.js — /api/v1/Cliente
import { http } from "./http.js";
import { cleanParams } from "./params.js";
import { normalizePaged } from "../utils/paginacion.js";

/** @param {{ q?: string, activos?: boolean, page?: number, pageSize?: number }} filters */
export async function listClientes(filters = {}) {
  const { data } = await http.get("/Cliente", { params: cleanParams(filters) });
  return normalizePaged(data);
}

export async function createCliente(body) {
  const { data } = await http.post("/Cliente", body);
  return data;
}

export async function deactivateCliente(id) {
  await http.patch(`/Cliente/${id}/desactivar`);
}
```

*Motivo:* un patrón uniforme que se puede revisar de un vistazo y que mantiene la lógica de red fuera de las pantallas, sin reescribir hoy las pantallas que funcionan.
*Descartados:* (a) que la 02 cree todos los módulos de una vez: son ~10 archivos sin pantalla que los use ni pruebas reales, y cada spec conoce mejor sus necesidades; (b) objeto con métodos, como `operationalAlertsApi`: se tiene que importar entero y devuelve la respuesta de axios, así que cada pantalla repite `res.data`; (c) una regla de ESLint que prohíba importar `http` desde `src/pages`: rompería las páginas que todavía no migran. Queda pendiente (P-FB4).

**D-FB15 (18/11/2026) — Confirmada. Serialización de parámetros.**
- `src/api/params.js` exporta `cleanParams(obj)`: quita las claves con `undefined`, `null` o `""`, para no mandar `q=` ni `hasta=`. Los booleanos y el `0` se conservan.
- `src/api/http.js` configura `paramsSerializer: { indexes: null }` en la instancia, para que un arreglo salga como `fuente=PAGO&fuente=CAJA`. El valor por defecto de axios lo manda como `fuente[]=PAGO&fuente[]=CAJA`, y el backend (Trazabilidad, `fuente` repetible) no lo enlaza.
*Motivo:* es un error que aparecería recién en la spec 04 y es más barato dejarlo resuelto y probado acá.
*A verificar al ejecutar:* P-FB-L2.

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FB1 | `brechas-front.md`, sección 1 | El 400 por fechas sin zona está "roto hoy" en `Ocupaciones.jsx` | La spec lo describe como causado por los cambios sin commitear, no por `develop`; el arreglo mínimo (D-FB10) igual se hace, porque `develop` interpreta la hora en la zona del navegador | El código de `develop` manda `Z` (zona del navegador), y el 400 lo causaba el árbol de trabajo sin commitear, hoy en `wip/ocupaciones-reservas` | — |
| DV-FB2 | D-FB2 (una sola zona) | Lo que se envía y lo que se muestra usan la zona del tenant | Entre la 02 y la 07, `Ocupaciones.jsx` **envía** en la zona del tenant (D-FB10) pero **muestra** con su `fmtDate` local, en la zona del navegador | El arreglo mínimo no toca la UI (D-FB8). Con el navegador en la misma zona que el tenant, que es el caso normal, no se nota | La 07 reemplaza `fmtDate` por `formatInstant` |
| DV-FB3 | D-FB5 (no define estos casos) | Una zona inválida, un `DateOnly` inválido en `addDays`/`dayToInstantRange` y un instante sin zona no tienen comportamiento definido | `fechas.js` lanza `RangeError` con zona inválida (nunca cae a la del sistema) y con `DateOnly` inválido en `addDays`, `dayToInstantRange` y `dateRangeToInstants`. Un instante sin `Z` ni desplazamiento se trata como inválido (`""` en `instantToInput`, texto tal cual en `formatInstant`), porque `Date` lo leería en la zona del sistema | Aclaración de implementación, coherente con D-FB2 y D-FB7 (`MeProvider` valida la zona antes de que una pantalla use el módulo) | — |
| DV-FB4 | D-FB7 (estado `error` de `MeProvider`) | Pide el estado `error` con el mensaje "No pudimos leer la zona horaria del local", sin decir con qué `code` | El `ApiError` lleva `code: "respuesta_invalida"` (ya existente) y ese mensaje explícito. No se agrega un código nuevo a `errorCodes.js`. `useTenantDates()` lanza un `Error` si se usa sin `/me` cargado o sin zona válida | `/me` respondió con un contenido incompleto, que es lo que describe `respuesta_invalida`; un código nuevo sería una decisión que la spec no prevé | — |

### 4.2 Pendientes

**Del desarrollador o del backend (no frenan la ejecución, salvo que se indique).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FB1 | **Cerrado (18/11/2026).** Semántica de `hasta` relevada del código del backend (inventario, sección 5): inclusivo en `/Ocupacion`, `/operational-alerts` y `/Trazabilidad`; día entero en `/Caja/sesiones`; exclusivo en `/Cochera/disponibles`. Resuelto con `dateRangeToInstants` (D-FB5) | 1 |
| P-FB2 | **Cerrado (18/11/2026).** La lista cerrada tiene 12 zonas: Montevideo, 3 de Argentina y 8 de Brasil (inventario, sección 5). Hoy ninguna aplica horario de verano. Los tests de D-FB6 se mantienen con Nueva York, Madrid y Santiago, porque la tzdata puede cambiar | — |
| P-FB3 | **Moneda por tenant.** `/me` no trae moneda; `formatMoney` fija `UYU`. Si el producto sale de Uruguay, hay que pedirla al backend | — |
| P-FB4 | Regla de ESLint que prohíba importar `http` directo desde `src/pages` cuando ya no queden páginas que lo hagan | — |
| P-FB5 | Revisar Temporal cuando Safari tenga una versión estable con soporte: reemplazaría a `@date-fns/tz` sin polyfill | — |
| P-FB6 | `Clientes.jsx` tiene su paginación propia y ninguna spec 03 a 12 la toca. Migrarla a los helpers cuando se la modifique | — |
| P-FB7 | `CLAUDE.md` está sin trackear (P-FA10). El paso 8 lo actualiza; el desarrollador decide si ese archivo se commitea en este PR | 8 |
| P-FB8 | `OperationalDashboard.jsx` mezcla alertas y cajas (P-FA4). Su copia de fechas y `todayISO` se retira en la 05 si queda como panel de alertas, o en la 09 si la parte de caja se mueve allí | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FB-L1 | Que `@date-fns/tz` exporte `tzOffset` con esa firma `(zona, fecha)`, qué signo y qué unidad devuelve (el README avisa que el signo es el opuesto al de `Date.prototype.getTimezoneOffset`), y si exige `date-fns` como peer | Ajustar el cálculo al signo real y cubrirlo con un test. Si exige `date-fns`, **frenar** y volver a la decisión D-FB4 (la alternativa es `Intl` solo) |
| P-FB-L2 | Que la versión instalada de axios acepte `paramsSerializer: { indexes: null }` y produzca `fuente=a&fuente=b` | Verificarlo con `http.getUri({ url, params })` en un test. Si cambió el nombre de la opción, usar el vigente; si no hay forma, serializar a mano y anotarlo |
| P-FB-L3 | Que las fechas de los casos de horario de verano (cambios de 2026 en Nueva York, Madrid y Santiago) coincidan con la tzdata del Node instalado | El caso es el criterio, no la fecha: si difiere, tomar la fecha del cambio real y anotarla |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01). Si un paso los necesita, se frena.

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de fechas (puro) | `src/utils/fechas.js` | D-FB2 a D-FB6 |
| Hook de fechas del tenant | `src/utils/useTenantDates.js` | D-FB7 |
| Formato de moneda y números | `src/utils/formato.js` | D-FB12 |
| Enums | `src/constants/enums.js` | D-FB11 |
| Paginación pura y hook | `src/utils/paginacion.js`, `src/utils/usePagination.js` | D-FB13 |
| `cleanParams` | `src/api/params.js` | D-FB15 |
| Tests | `test/unit/utils/fechas.test.js`, `test/unit/utils/formato.test.js`, `test/unit/constants/enums.test.js`, `test/unit/utils/paginacion.test.js`, `test/unit/api/params.test.js` | D-FA4 |
| Manual de esta spec | `docs/manual/frontend/02-base-comun.md` | Metodología (como el manual de la 01) |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `package.json` y `package-lock.json` | Suma `@date-fns/tz` | D-FB4 |
| `src/auth/MeProvider.jsx` | Valida la zona horaria de `/me` | D-FB7 |
| `src/api/http.js` | `paramsSerializer: { indexes: null }` | D-FB15 |
| `eslint.config.js` | Regla de `toLocale*` con excepciones temporales por página | D-FB9 |
| `src/pages/Ocupaciones.jsx` | Solo los 5 valores de fecha de la tabla de D-FB10 | D-FB10 |
| `src/pages/OperationalAlerts.jsx`, `src/pages/OperationalDashboard.jsx` | Importan los enums de alertas de `enums.js` | D-FB11 |
| `CLAUDE.md` | Sección de fechas, enums, paginación y patrón de API; actualizar la mención de `operationalAlerts.js` | P-FB7 |
| `docs/specs/README.md` | Fila 02 a "Borrador" y, al cerrar, "Terminada" | Metodología |

### 5.3 Se borran

| Pieza | Dónde |
|---|---|
| Enums de alertas (reemplazados por `enums.js`) | `src/constants/operationalAlerts.js` |

### 5.4 No se tocan, y quién retira sus copias

La 02 no modifica estas páginas (salvo Ocupaciones, D-FB10, y las dos de alertas, D-FB11). Cada spec retira lo suyo y **saca la excepción de ESLint** de su página (D-FB9). Los números de línea son de `develop` al 18/11/2026.

| Página | Copias que quedan | Spec que las retira |
|---|---|---|
| `Tarifas.jsx` | `fmtDate` (l. 47), `TIPOS` (l. 28), `money` (l. 35); `vigenteDesde` mandado como instante (l. 139) en vez de `DateOnly` | 03 |
| `Auditoria.jsx` | `fmtDate` (l. 32), `new Date(x).toISOString()` en `desde`/`hasta` (l. 104–105), `ACCION` | 04 (reemplaza la pantalla por Trazabilidad) |
| `OperationalAlerts.jsx`, `OperationalDashboard.jsx` | `fmtDate` (l. 29 y l. 38), `todayISO` (l. 25 del dashboard), `money`, paginación fija `page: 1, pageSize: 50` | 05 (ver P-FB8) |
| `Cocheras.jsx` | `formatDateTime` (l. 47), `toLocaleDateString` suelto (l. 159), `ESTADO_COCHERA` (l. 26) | 06 |
| `Ocupaciones.jsx` | `fmtDate`, `ESTADOS`, `TIPOS`, `METODOS_PAGO`, `money` | 07 |
| `CajaDiaria.jsx` | `fmtDate` (l. 43), `todayISO` (l. 29), `METODOS_PAGO` (l. 22), `money` | 09 (reemplaza la pantalla) |
| `Dashboard.jsx`, `Clientes.jsx` | Sin copias de fechas. `Clientes.jsx` tiene paginación propia | — (P-FB6) |

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-base` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores, `npm test` en verde, el paso tildado en esta spec, el manual al día y un commit confirmado por el desarrollador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`): en el árbol de trabajo hay archivos ajenos a esta spec sin commitear (`.dockerignore`, `Dockerfile`, `ai-playbook/`).
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo es P-FB-L1, P-FB-L2 y P-FB-L3, con la regla que cada uno fija.
- Cada función nueva de `fechas.js` se prueba con la zona pasada de forma explícita: ningún test depende de la zona del sistema.

### Paso 1 — Módulo de fechas y su dependencia

- [x] **1.1** Con esta spec ya mergeada en `develop`, crear el worktree de ejecución: `git worktree add ../parkingcontrol-front-base -b feature/front-base develop` (desde `parkingcontrol-front`). En el worktree, copiar el `.env` (no está versionado) y correr `npm install`. Instalar `@date-fns/tz`. Resolver P-FB-L1.
- [x] **1.2** Crear `src/utils/fechas.js` con las funciones de D-FB5.
- [x] **1.3** Crear `test/unit/utils/fechas.test.js`.

  *Aceptación:* `npm test` pasa con estos casos (las fechas de los cambios de horario se confirman con P-FB-L3):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `America/Montevideo`, `2026-11-10T22:30` | `2026-11-11T01:30:00.000Z` |
  | 2 | `todayInZone("America/Montevideo", now)` con `now` = `2026-11-11T01:30:00.000Z` (22:30 en Uruguay) | `2026-11-10` (no `2026-11-11`: es la franja de las 21:00 a las 24:00) |
  | 3 | Lo mismo con `now` = `2026-11-11T02:59:59.999Z` y con `now` = `2026-11-11T03:00:00.000Z` | `2026-11-10` y `2026-11-11` (el límite es las 00:00 locales) |
  | 4 | `America/New_York`, `2026-07-15T10:00` y `2026-12-10T10:00` | `14:00Z` y `15:00Z` |
  | 5 | NY, hora inexistente `2026-03-08T02:30` | `{ ok: false, code: "hora_inexistente" }` con el mensaje de D-FB6. `01:59` da `06:59Z` y `03:00` da `07:00Z` |
  | 6 | NY, hora repetida `2026-11-01T01:30` | La primera: `2026-11-01T05:30:00.000Z`. `00:59` da `04:59Z` y `02:00` da `07:00Z` |
  | 7 | `Europe/Madrid`, `2026-03-29T02:30` y `2026-10-25T02:30` | `hora_inexistente`, y la primera: `2026-10-25T00:30:00.000Z`. `2026-03-29T03:00` da `01:00Z` |
  | 8 | `instantToInput` de `2026-11-01T05:30:00.000Z` y de `2026-11-01T06:30:00.000Z` en NY | Los dos dan `2026-11-01T01:30` (no inyectiva, documentado); un instante común vuelve a su `LocalInput` original |
  | 9 | `formatInstant("2026-11-11T01:30:00.000Z", "America/Montevideo")` | `10/11/2026 22:30`. Con `seconds: true`, `10/11/2026 22:30:00` |
  | 10 | Entradas inválidas: `2026-02-30T10:00`, `2026-11-10`, `10/11/2026 22:30` | `formato_invalido`. `""` y `"   "` dan `{ ok: true, instant: null }`. `2026-11-10T22:30:15` se acepta |
  | 11 | `DateOnly`: `isDateOnly("2026-02-30")` es falso; `formatDateOnly("2026-11-10")` da `10/11/2026`; `addDays("2026-12-31", 1)` da `2027-01-01` y `addDays("2026-03-01", -1)` da `2026-02-28` | |
  | 12 | `dayToInstantRange("2026-11-10", Montevideo)` | `{ desde: 2026-11-10T03:00:00.000Z, hasta: 2026-11-11T03:00:00.000Z }`. En NY, el `2026-11-01` (25 h) da `04:00Z` a `2026-11-02T05:00Z`, y el `2026-03-08` (23 h) da `05:00Z` a `2026-03-09T04:00Z` |
  | 13 | Medianoche inexistente: `America/Santiago`, `dayToInstantRange("2026-09-06", …)` (a confirmar con P-FB-L3) | `desde` es el primer instante válido del día (01:00 locales), no un error |
  | 14 | `isValidTimeZone("America/Montevideo")` es verdadero; `("Mars/Olympus")` y `("")` son falsos | |
  | 15 | Una búsqueda de `getHours`, `getDate`, `getTimezoneOffset`, `toLocale` en `src/utils/fechas.js` | Sin coincidencias (el módulo no lee la zona del sistema) |
  | 16 | `dateRangeToInstants("2026-11-01", "2026-11-01", Montevideo)` | `{ desde: 2026-11-01T03:00:00.000Z, hasta: 2026-11-02T02:59:59.999Z }`. Con `{ inclusiveEnd: false }`, `hasta` es `2026-11-02T03:00:00.000Z` |
  | 17 | `dateRangeToInstants("2026-10-01", "2026-10-31", Montevideo)` | `hasta − desde` = 31 días − 1 ms (entra en el límite de Trazabilidad). `dateRangeToInstants(null, "2026-10-31", …)` da `desde: null` y `dateRangeToInstants("2026-10-01", "", …)` da `hasta: null` |

  `npm run lint` y `npm run build` pasan.

### Paso 2 — Hook y validación de la zona

- [x] **2.1** Crear `src/utils/useTenantDates.js` (D-FB7).
- [x] **2.2** En `src/auth/MeProvider.jsx`, validar la zona de `/me` con `isValidTimeZone`; si es inválida o falta, estado `error` con el mensaje de D-FB7.

  *Aceptación (manual):* con el backend levantado, `useTenantDates()` devuelve la zona de `/me` (se ve al usarlo en el paso 7). Con una modificación temporal de `MeProvider` que ponga una zona inválida (sin commitear) se ve la pantalla de error de `/me` con "Reintentar". `npm run lint` y `npm run build` pasan.

  *Verificación manual pendiente (decidido con el chat orquestador):* ambas pruebas de arriba (la zona que devuelve `useTenantDates()` y la pantalla de error con la zona inválida) se hacen junto con la prueba manual del paso 7, para levantar el backend una sola vez. Hasta entonces el paso 2 está verificado solo por `npm test`, `npm run lint` y `npm run build`.

### Paso 3 — Formato de moneda

- [x] **3.1** Crear `src/utils/formato.js` (D-FB12) y `test/unit/utils/formato.test.js`.

  *Aceptación:* `npm test` pasa con: `formatMoney(1234.5)` contiene `1.234,50` (los espacios, incluidos los no cortables, se normalizan antes de comparar); `null`, `undefined`, `""` y `"abc"` dan `—`; `0` da un importe de cero, no `—`. `formatNumber(1234)` da `1.234`, `formatNumber(0)` da `0` y `formatNumber(null)` da `—`. `npm run lint` y `npm run build` pasan.

### Paso 4 — Enums

- [x] **4.1** Crear `src/constants/enums.js` con `defineEnum`, los helpers y los 15 enums de D-FB11, y `test/unit/constants/enums.test.js`.
- [x] **4.2** Borrar `src/constants/operationalAlerts.js` y pasar `OperationalAlerts.jsx` y `OperationalDashboard.jsx` a `enums.js`.

  *Aceptación:* `npm test` pasa con: cada enum tiene exactamente los valores del inventario (sección 2), sin duplicados; `RolUsuario` no tiene el 2 y `TipoAlertaOperativa` no tiene el 4; `labelOf` devuelve `String(value)` para un valor desconocido y `""` para `null`; `colorOf` devuelve `"default"` sin color; `optionsOf(EstadoCochera, { only: ["DISPONIBLE", "BLOQUEADA"] })` tiene solo esas dos y `optionsOf(EstadoOcupacion, { excludeCalculated: true })` no trae `VENCIDA`; `optionsOf(…, { allLabel: "Todos" })` empieza con `{ value: "", label: "Todos" }`; `labelOfKey(RolUsuario, "DUENO")` da "Dueño"; las alertas con `dinero` son exactamente 5, 6, 7, 8, 9, 11 y 12. `npm run lint` y `npm run build` pasan. A mano: `/alertas-operativas` muestra bien el tipo y la severidad de cada alerta.

### Paso 5 — Paginación

- [x] **5.1** Crear `src/utils/paginacion.js` y `src/utils/usePagination.js` (D-FB13) y `test/unit/utils/paginacion.test.js`.

  *Aceptación:* `npm test` pasa con: `normalizePaged` acepta `{ items, total, page, pageSize }` y rechaza un arreglo, `null` y un objeto sin `items` con `respuesta_invalida`; `lastPage(0, 20)` es 1 y `lastPage(41, 20)` es 3; `toTablePaginationProps` convierte `page: 1` en `page: 0` y recorta una página fuera de rango; `paginationReducer`: `setPageSize` vuelve a la página 1, `reset` también, y `fit` con `total: 20`, `pageSize: 20` y `page: 2` baja a la 1. `npm run lint` y `npm run build` pasan.

### Paso 6 — Parámetros de API

- [x] **6.1** Crear `src/api/params.js` (`cleanParams`) y configurar `paramsSerializer` en `src/api/http.js` (D-FB15). Resolver P-FB-L2. Crear `test/unit/api/params.test.js`.

  *Aceptación:* `npm test` pasa con: `cleanParams` quita `undefined`, `null` y `""`, y conserva `false` y `0`; `http.getUri({ url: "/Trazabilidad", params: { fuente: ["PAGO", "CAJA"] } })` contiene `fuente=PAGO&fuente=CAJA` y no `fuente[]`. `npm run lint` y `npm run build` pasan. A mano: la pantalla de Clientes sigue cargando, filtrando y paginando como antes.

### Paso 7 — Arreglo mínimo de Ocupaciones

- [x] **7.1** Confirmar que `src/pages/Ocupaciones.jsx` no tiene cambios locales (`git status`). En `Ocupaciones.jsx`, reemplazar los 5 valores de D-FB10 por `localInputToInstant` de `useTenantDates()`. Una hora inexistente muestra el mensaje con `toast.error` y no envía.

  *Aceptación (manual, con un usuario cuyo tenant tenga `America/Montevideo`):* (1) en Network, el alta con inicio `22:30` del 10/11 manda `inicio: "2026-11-11T01:30:00.000Z"`; (2) filtrar por `desde` y `hasta` manda instantes con `Z` y la API responde 200; (3) cancelar con `finReal` manda un instante con `Z`; (4) con la zona del navegador cambiada, el valor enviado es el mismo; (5) un `git diff develop -- src/pages/Ocupaciones.jsx` muestra cambios solo en esos 5 valores, en la validación `Fin > Inicio` que usa los instantes convertidos, y en el hook y los imports que hagan falta. `npm run lint` y `npm run build` pasan.

### Paso 8 — Lint, documentación y cierre

- [ ] **8.1** Agregar la regla de D-FB9 a `eslint.config.js`, con las 7 excepciones temporales y su comentario "se retira con la spec NN".
- [ ] **8.2** Crear `docs/manual/frontend/02-base-comun.md` (cómo usar fechas, enums, paginación y el patrón de API; el caso de la hora repetida; la tabla de contrato de D-FB3) y actualizar `CLAUDE.md` (P-FB7).
- [ ] **8.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; el lint falla si se agrega un `toLocaleString()` a una página que no esté en la lista de excepciones; `CLAUDE.md` ya no menciona `operationalAlerts.js` como fuente de enums.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Alta de ocupación a las 22:30 (zona de Uruguay) | El pedido lleva `inicio` con `Z` y el instante correcto (`01:30Z` del día siguiente); la API responde 200 |
| 3 | Filtros `desde` y `hasta` de Ocupaciones | La API responde 200 con instantes con `Z` |
| 4 | Cambiar la zona del sistema operativo y repetir el punto 2 | El valor enviado es el mismo |
| 5 | `/alertas-operativas` y el Monitor operativo | Tipos y severidades con etiqueta correcta; los tipos 5 a 12 ya no salen como "Tipo desconocido" |
| 6 | Clientes (listado, filtro, paginación) | Sin cambios de comportamiento |
| 7 | Búsqueda de `operationalAlerts` en `src/constants` | El archivo ya no existe |
| 8 | Búsqueda de `getHours`, `getTimezoneOffset`, `toLocale` en `src/utils/fechas.js` | Sin coincidencias |
| 9 | Agregar un `toLocaleString()` a una página fuera de la lista de excepciones | `npm run lint` falla (no se commitea) |
| 10 | `git diff develop` sobre las páginas "no se tocan" (sección 5.4), salvo Ocupaciones y las dos de alertas | Vacío |
| 11 | Ningún secreto nuevo ni lectura de `.env` | El módulo de fechas no usa variables de entorno |

**No verificable en el producto:** el horario de verano. Uruguay no lo tiene (P-FB2), así que lo cubren solo los tests del paso 1 con zonas que sí lo tienen.

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador aprobó todas las decisiones. La revisión del chat orquestador agregó `dateRangeToInstants` (D-FB5), cerró P-FB1 y P-FB2, sumó `formatNumber` (D-FB9 y D-FB12) y el desvío DV-FB2.

**Ejecución en dos chats**, los dos en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-base` (rama `feature/front-base`), uno después del otro:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 1 y 2 | Sonnet | medio | El algoritmo de hora inexistente y repetida es lo más delicado de la spec. Si un caso de la tabla del paso 1 no da el resultado esperado, **frena** y vuelve al chat orquestador: no ajusta el criterio |
| B | 3 a 8 | Sonnet | bajo | Frena al terminar cada paso y espera la confirmación del desarrollador. Si P-FB-L2 no tiene salida, o si el paso 7 obliga a tocar algo más que los 5 valores, frena |

**Prompt para cada chat de ejecución** (cambiar `PASOS` por "1 y 2" o "3 a 8"):

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-base` (rama `feature/front-base`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Leé `CLAUDE.md` y `docs/specs/frontend/02-base-comun.md`. Ejecutá **los pasos PASOS** de esa spec, de a uno, siguiendo las reglas de la sección 6. Al terminar cada paso, frená y esperá mi confirmación antes de seguir. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. Si algo obliga a decidir lo que la spec no prevé, frená y avisá al chat orquestador (`frontparking-5f`) por SendMessage. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit sin `Co-Authored-By` ni atribución de IA. Respondé en español rioplatense.
