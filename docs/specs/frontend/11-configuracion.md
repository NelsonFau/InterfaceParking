# 11 — Configuración del tenant

> Frontend · **Terminada** (19/11/2026; se vuelve verdadera al mergear el PR a `develop`; aprobada el 18/11/2026) · `feature/specs-etapa3` (esta spec, rama compartida con otros redactores) y `feature/front-configuracion` (ejecución, en el worktree `../parkingcontrol-front-configuracion`, a crear desde `develop` cuando la 02 esté implementada y mergeada) · Última actualización 18/11/2026
>
> Undécima spec del frontend. Pantalla **nueva**: lee y edita la configuración del local (`/Configuracion`): zona horaria, modo de caja y los parámetros de ocupaciones mensuales, retroactivas y mora. Depende de la spec 02 (fechas con zona del tenant, enums, patrón de `src/api/`). Como la zona horaria que se edita acá es la que usa todo el front, agrega a `MeProvider` una función aditiva para refrescar `/me` (D-FK2).

> **Semántica de los campos.** Los textos de ayuda (D-FK11) y los avisos de los diálogos (D-FK8) salen de la tabla "Significado de cada campo" de `docs/inventario/backend.md`, sección `/Configuracion` (relevada del código del backend el 18/11/2026). Si esa tabla cambia, cambian los textos. La spec no inventa ningún significado.

## 1. Objetivo y alcance

**Objetivo.** Que el dueño del local pueda ver y cambiar la configuración del tenant con control de concurrencia (no pisar lo que otro dueño guardó) y con aviso antes de los dos cambios de mayor impacto (zona horaria y modo de caja); que el encargado y el auditor vean los mismos valores en solo lectura; y que un cambio de zona se refleje en todo el front sin recargar la pestaña.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Ruta y menú | `/configuracion`, permiso `configuracion.ver`, última entrada del menú | D-FK5 |
| Módulo de API | `src/api/configuracionApi.js`: `getConfiguracion`, `updateConfiguracion` | D-FK3 |
| Zonas horarias | `src/constants/zonasHorarias.js`: las 12 zonas permitidas, con etiqueta y test contra el inventario | D-FK4 |
| Lógica pura | `src/utils/configuracion.js`: rangos, validación, cuerpo del `PUT`, detección de cambios, códigos de error | D-FK6, D-FK9, D-FK10 |
| Pantalla | `src/pages/Configuracion.jsx`: formulario con ayuda por campo, solo lectura sin `configuracion.editar` | D-FK5, D-FK6, D-FK11 |
| Concurrencia | `version` tal cual vino; en 409 `configuracion_modificada`, aviso y "Recargar valores" | D-FK7 |
| Confirmaciones | Diálogo al cambiar la zona y al cambiar el modo de caja | D-FK8 |
| `/me` | `refreshMe()` en `MeProvider` y su uso tras cambiar la zona | D-FK2 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Que `modoCaja` cambie cómo se abre y cierra la caja | Spec 09. La 09 lee `modoCaja` de `GET /Caja/actual`, **no** de `/Configuracion` (el OPERADOR no tiene `configuracion.ver`) |
| Que los límites de configuración (`toleranciaInicioHoras`, `topePasadoDias`, `techoFuturoMeses`, `modoMes`, `fraccionMes`, `graciaHoraMinutos`) condicionen las validaciones de ocupaciones y contratos | Specs 07 y 10. **No** validan esos límites en el cliente: el backend es la autoridad y el front muestra su error por `code` |
| Editar `ventanaAlertasDias` | Es de solo lectura en el backend. Se muestra como dato informativo, sin campo (D-FK6) |
| Moneda por tenant | P-FB3 de la spec 02: la API no la expone |
| Avisar a otros usuarios conectados del mismo tenant que la zona cambió | Cada sesión recarga `/me` al iniciar (D-FK2). Sin polling ni push |
| Bloquear la navegación con cambios sin guardar | No se pide (P-FK6) |
| Rediseño visual | Después, con el diseño nuevo |
| `CLAUDE.md`, línea "Backend endpoints used" | No se toca: la reemplaza la 02 en su paso 8 por una referencia a `docs/inventario/backend.md` |

**Estado de alcance.** Etapa 3 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02 ya mergeada al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Configuracion`: "Comportamiento" y "Significado de cada campo" | Campos, rangos, `version` base64 (cambia siempre en un `PUT`), `PUT` con 200 y la configuración completa, obligatoriedad en el `PUT`, errores `configuracion_modificada`, `caja_abierta` y 400; qué hace cada campo (textos de ayuda); los contratos mensuales congelan `modoMes` y `fraccionMes` | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 0, 2, 3 y 4 | Enums `ModoCaja`, `ModoMes` y `FraccionMes`; permisos `configuracion.ver` (DUENO, ENCARGADO, AUDITOR) y `configuracion.editar` (solo DUENO); catálogo de `code` | 18/11/2026 |
| `docs/inventario/backend.md`, sección 5 | Lista cerrada de 12 zonas, comparación exacta | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 3 y 5 y "Contratos entre specs" | La configuración no tiene pantalla; `refreshMe()`; la 09 lee `modoCaja` de `/Caja/actual`; la 07 y la 10 no validan límites | 18/11/2026 |
| Spec 02 (`02-base-comun.md`), completa | `useTenantDates` (D-FB7), validación de la zona en `MeProvider` (D-FB7), `enums.js` con `ModoCaja`, `ModoMes` y `FraccionMes` y sus helpers (D-FB11), `formato.js` (D-FB12), patrón de `src/api/` (D-FB14), lista de 12 zonas (P-FB2) | 18/11/2026 |
| Spec 03 (`03-tarifas.md`) | Formato de spec, patrón de pantalla con lógica pura, permisos y errores por `code` | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), "lógica pura con Vitest" (D-FA4) | 09/11/2026 |
| Lectura de `src/auth/MeProvider.jsx`, `src/auth/usePermissions.js`, `src/auth/routes.js`, `src/App.jsx` y `test/unit/auth/routes.test.js` | Estado actual (sección 2.1) | 18/11/2026 |
| Respuestas del Orquestador y del usuario (18/11/2026) | `refreshMe` aprobado; D1 a D4 aprobadas (D-FK7, D-FK8, D-FK5); E1 a E4 aprobadas; extensión del diálogo a `modoMes` y `fraccionMes` aprobada, con la que se aprueban todas las demás decisiones | 18/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`TextField select`, `Dialog`, `Alert`, `FormHelperText`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Pantalla | No existe. `/Configuracion` no se llama desde ningún lugar del front |
| `MeProvider` | Carga `GET /me` una vez por sesión en un efecto. El contexto expone `{ status, me, error, reload }`. `reload` hace `setState(initialState)` (vuelve a `cargando`, desmonta lo que dependa del estado `listo`). La 02 le suma la validación de zona (paso 2 de la 02) |
| Zona | `useTenantDates` (02) lee `useMe().me.tenant.zonaHoraria`. Hoy no hay forma de refrescarla dentro de la sesión |
| Rutas | `PRIVATE_ROUTES` tiene 9 entradas. `test/unit/auth/routes.test.js` **compara el mapa completo** y afirma que el OPERADOR accede a todas menos `/auditoria`: agregar `/configuracion` lo rompe (el OPERADOR no tiene `configuracion.ver`). Hay que actualizarlo (paso 4) |
| Menú | Sale de `PRIVATE_ROUTES` (`Layout.jsx`) |
| Errores | `showApiError(e)` en cada `catch`; un código desconocido se trata como aviso con el `title` del backend |
| Enums | Los de configuración (`ModoCaja`, `ModoMes`, `FraccionMes`) los crea la 02 en `enums.js` |

## 3. Decisiones

Prefijo **D-FK** ("frontend, configuración"). Estado: **Confirmada** (la tomó el desarrollador, la aprobó el usuario o el Orquestador, o está fijada por una fuente). Todas están Confirmadas desde la aprobación del 18/11/2026. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y `MeProvider`

**D-FK1 (18/11/2026) — Confirmada. Rama y worktree.** Esta spec vive en `feature/specs-etapa3`. La ejecución va en `feature/front-configuracion`, en el worktree `../parkingcontrol-front-configuracion`, creada desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que la 02 esté implementada y mergeada**: usa `enums.js`, `useTenantDates`, `params.js` y la validación de zona de `MeProvider`. Es independiente de las demás specs de la etapa 3 (03 a 06 y 12), salvo conflictos triviales en `routes.js`, `routes.test.js` y `App.jsx` (se resuelven conservando todas las entradas; sección 6).

**D-FK2 (18/11/2026) — Confirmada (Orquestador). `refreshMe()` en `MeProvider`.** La 11 agrega en su paso 1 una función **aditiva** `refreshMe()` al valor del contexto (`{ status, me, error, reload, refreshMe }`). No cambia nada de lo que hace la 02 en `MeProvider` ni el comportamiento de `reload`.

| Aspecto | Comportamiento |
|---|---|
| Qué hace | Vuelve a pedir `GET /me` **sin** pasar por `cargando`. El estado se mantiene `listo` y la pantalla no se desmonta |
| Éxito | Reemplaza `me`, con la misma validación de zona que la carga inicial (D-FB7). Si la zona nueva es inválida, **conserva el `me` anterior** y devuelve el error |
| Fallo | Conserva el `me` anterior y **no** cambia el estado a `error`. Devuelve el error para que la pantalla llame a `showApiError(e)`. Una cuenta bloqueada (403 `usuario_inactivo`, etc.) sigue pasando a `bloqueado`: el interceptor de `http.js` ya lo hace |
| Valor devuelto | `Promise<me>`, que resuelve con el `me` nuevo o rechaza con `ApiError` |
| Carreras | Si hay un `refreshMe` en curso y se llama de nuevo, gana la última respuesta; una respuesta vieja no pisa una nueva (contador de intento, igual que el efecto inicial) |
| Quién la usa | La 11, después de un `PUT` que cambió la zona. Cualquier otra spec que cambie datos de `/me` la puede usar (`brechas-front.md`, "Contratos entre specs") |

Después de `refreshMe`, `useTenantDates` devuelve la zona nueva en el siguiente render y las pantallas que ya estén montadas la usan; los datos ya cargados se ven en la zona vieja hasta que cada pantalla vuelva a cargar (al navegar, o con su botón de refrescar). Se documenta en el manual. Los otros usuarios conectados del mismo tenant siguen con la zona vieja hasta recargar `/me` (cada sesión lo carga una vez); no hay polling ni push (queda afuera).

*Motivo:* la zona del tenant es la única zona del front (D-FB2) y el único punto donde cambia es esta pantalla; sin refresco, el dueño seguiría viendo y enviando fechas en la zona vieja hasta recargar la pestaña, que es justo el bug de fechas que corrige la 02.
*Descartados:* (a) `reload()`: parpadea a pantalla de carga y pierde lo que el usuario tenga abierto; (b) parchear `me.tenant.zonaHoraria` con la respuesta del `PUT`: ahorra un pedido pero deja dos fuentes de la zona (`/me` y `/Configuracion`) que pueden divergir; (c) pedir recargar la pestaña a mano: se olvida y deja fechas en la zona vieja; (d) que lo agregue la 02: la 02 ya está en ejecución y commiteada en ese archivo; el cambio es aditivo y no la modifica.

### 3.2 Módulo de API y zonas

**D-FK3 (18/11/2026) — Confirmada (D-FB14). `src/api/configuracionApi.js`.** Funciones `async`, nombradas, que devuelven `data`, con JSDoc de tipos tomados del inventario, sin capturar errores y sin convertir enums (reciben y devuelven enteros):

| Función | Endpoint | Devuelve |
|---|---|---|
| `getConfiguracion()` | `GET /Configuracion` | `Configuracion` |
| `updateConfiguracion(body)` | `PUT /Configuracion` | `Configuracion` completa con la `version` nueva (200; inventario, P-FK1 cerrado) |

`Configuracion` = `{ zonaHoraria, modoCaja, toleranciaInicioHoras, topePasadoDias, techoFuturoMeses, modoMes, fraccionMes, graciaHoraMinutos, diasGraciaMora, ventanaAlertasDias, version }`. Las dos funciones verifican que la respuesta sea un objeto con `zonaHoraria` (string), `modoCaja` (número) y `version` (string) y, si no, lanzan `ApiError` con `code: "respuesta_invalida"` (una respuesta rara no se disfraza de "sin configuración" ni se toma como la nueva `version`). Se prueba con `vi.mock` de `http` (ruta y cuerpo, sin modificarlo).
*Motivo:* patrón uniforme de la 02.

**D-FK4 (18/11/2026) — Confirmada. Lista de zonas en `src/constants/zonasHorarias.js`.**
- Exporta `ZONAS_HORARIAS`: arreglo de `{ value, label }` con las 12 zonas del inventario (sección 5), **en el orden del inventario**, y `labelOfZona(value)`.
- `value` es el nombre IANA **exacto** (el backend compara exacto).
- Etiquetas (propuestas): "Montevideo (Uruguay)", "Buenos Aires (Argentina)", "Córdoba (Argentina)", "Mendoza (Argentina)", "São Paulo (Brasil)", "Bahía (Brasil)", "Fortaleza (Brasil)", "Belém (Brasil)", "Manaos (Brasil)", "Cuiabá (Brasil)", "Campo Grande (Brasil)", "Rio Branco (Brasil)".
- `labelOfZona(value)`: la etiqueta si está en la lista; si no, el IANA recibido tal cual (no esconde un dato raro).
- **Zona fuera de la lista** (el backend devuelve una que no es de las 12, por un dato viejo: el `GET` devuelve la zona guardada tal cual, confirmado en el inventario): el selector la muestra como una opción extra **"`<IANA>` (fuera de la lista)"** para no inventar un valor ni dejar el campo vacío. La pantalla no se bloquea ni pasa a error (`MeProvider` ya verifica que sea una zona IANA válida, D-FB7). Si el usuario **no** toca la zona, se manda tal cual y el backend decide. Si la cambia, solo puede elegir una de las 12 (la extra deja de ofrecerse una vez cambiada).
- Un test compara la lista contra la tabla del inventario (sección 5): 12 entradas, sin repetidas, cada `value` una zona IANA válida para `isValidTimeZone`, y que `America/Montevideo` esté.
*Motivo:* no hay endpoint que devuelva la lista; una sola fuente la comparten esta pantalla y quien más la necesite (por ejemplo, una futura pantalla de alta de tenant).
*Descartados:* (a) campo de texto libre: el backend rechaza lo que no esté en la lista, y obliga a conocer el IANA; (b) generar la lista con `Intl.supportedValuesOf("timeZone")`: trae cientos de zonas que el backend rechaza; (c) mostrar solo el IANA sin etiqueta: poco claro para el usuario.

### 3.3 Pantalla, permisos y ruta

**D-FK5 (18/11/2026) — Confirmada. Ruta, menú y permisos.**
- Ruta `/configuracion`, etiqueta "Configuración", permiso `configuracion.ver` (DUENO, ENCARGADO y AUDITOR; el OPERADOR no ve la entrada ni entra: `RequirePermission` muestra "No tenés permiso"). Es la **última** entrada de `PRIVATE_ROUTES`. Componente `src/pages/Configuracion.jsx`, agregado a `PAGES` de `App.jsx` (CLAUDE.md, "Adding a private page").
- Quien tiene `configuracion.ver` pero **no** `configuracion.editar` ve **la pantalla completa en solo lectura**: los campos deshabilitados con su valor, sin botón "Guardar", y un aviso fijo "Solo el dueño puede modificar la configuración". Se resuelve con `can("configuracion.editar")`, nunca por rol (ARQ-4).
- Se **deshabilita** en vez de ocultar (distinto de la 03): acá los valores son información que el encargado y el auditor sí deben ver.
- Un `PUT` forzado sin permiso da 403 `sin_permiso`: `showApiError` muestra el `title`.
*Motivo:* matriz de permisos del inventario (sección 3); decisión del usuario (D2).
*Descartados:* ocultar campos según el rol: el permiso ya lo resuelve y duplicaría la regla.

**D-FK6 (18/11/2026) — Confirmada. Formulario y validación.** Una sola tarjeta con los campos agrupados, en este orden:

| Grupo | Campo | Control | Rango / valores |
|---|---|---|---|
| Local | `zonaHoraria` | `select` con `ZONAS_HORARIAS` (D-FK4) | Obligatorio |
| Caja | `modoCaja` | `select` con `optionsOf(ModoCaja)` | Obligatorio: "Diaria", "Por turno" |
| Ocupaciones | `toleranciaInicioHoras` | `number` entero | 0 a 168 |
| Ocupaciones | `topePasadoDias` | `number` entero | 1 a 3650 |
| Ocupaciones | `techoFuturoMeses` | `number` entero | 1 a 24 |
| Ocupaciones | `graciaHoraMinutos` | `number` entero | 0 a 59 |
| Contratos mensuales | `modoMes` | `select` con `optionsOf(ModoMes)` | "Calendario", "Corrido", "Bloques de 30 días" |
| Contratos mensuales | `fraccionMes` | `select` con `optionsOf(FraccionMes)` | "Completo", "Proporcional" |
| Contratos mensuales | `diasGraciaMora` | `number` entero | 0 a 60 |
| Alertas | `ventanaAlertasDias` | **texto, no editable**, con el valor y "días" | 7 a 90 (solo lectura en el backend) |

*(El agrupamiento y los nombres de los grupos son propuesta. `modoMes`, `fraccionMes` y `diasGraciaMora` son de contratos mensuales; `toleranciaInicioHoras`, `topePasadoDias` y `techoFuturoMeses` limitan el **inicio** de una ocupación; `graciaHoraMinutos` es de ocupaciones por hora: el agrupamiento sigue la tabla del inventario.)*

Validación en `validateConfiguracionForm` (pura): cada número debe ser un **entero** (`^\d+$` después de `trim`; no se aceptan decimales, signos ni notación científica) dentro de su rango; `zonaHoraria` y `modoCaja` obligatorios. Mensajes: "Ingresá un número entero", "Tiene que estar entre X y Y". Los rangos viven en una constante `CONFIG_LIMITS` en `configuracion.js` y el test la compara con el inventario. Los mismos límites los valida el backend; el cliente los valida primero para no mandar un pedido seguro de fallar. **Esta validación es de la pantalla de Configuración**: las specs 07 y 10 no validan esos límites en el cliente.

`buildUpdateBody(original, form)` (pura): arma el cuerpo del `PUT` con `zonaHoraria`, `modoCaja` y `version` **siempre** (obligatorios; `version` **tal cual vino**, sin decodificar ni modificar) y, de los opcionales, **solo los que cambiaron** respecto del original. Los enteros se mandan como número. Nunca manda `ventanaAlertasDias`. Si no cambió nada, "Guardar" está **deshabilitado**: el backend cambia `version` en **todo** `PUT`, aunque no cambie ningún valor (inventario), así que un guardado vacío haría fallar a otro dueño que tenga la pantalla abierta sin motivo.
*Motivo:* el backend conserva el valor actual de un opcional sin valor, así que mandar solo lo cambiado deja el cuerpo mínimo y evita reescribir un campo con un valor viejo. `version` es la protección contra la sobreescritura (D-FK7).
*Descartado:* mandar todos los campos siempre: reescribe campos que el usuario no tocó con el valor que cargó la pantalla.

**D-FK10 (18/11/2026) — Confirmada. Carga, estados y qué hace la pantalla después de cada resultado.**
- Al entrar: `getConfiguracion()`. Estados: cargando (indicador), listo (formulario) y error de carga ("No pudimos cargar la configuración" con "Reintentar"; **no** un formulario vacío ni con valores por defecto).
- El formulario guarda **el original** (lo último que vino del servidor, incluida `version`) y **el borrador** (lo que se edita). "Descartar cambios" vuelve el borrador al original, sin pedido.
- Después de un `PUT` **exitoso** (200 con la configuración completa y la `version` nueva): aviso "Configuración guardada"; el **original y el borrador pasan a ser la respuesta** (con la `version` nueva). **No** se hace un `GET` aparte. Si la zona cambió, se llama a `refreshMe()` (D-FK2).
- Si falla `refreshMe` tras un guardado exitoso: el guardado **ya está hecho**; se muestra el aviso de `showApiError` y un texto "La configuración se guardó, pero no pudimos actualizar la zona horaria en esta sesión. Recargá la página." (no se revierte nada).
- Errores del `PUT` por `code`: ver D-FK9.

### 3.4 Concurrencia, confirmaciones y errores

**D-FK7 (18/11/2026) — Confirmada (D1). Concurrencia optimista con `version`.**
- `version` es un token opaco (base64): el front no lo interpreta, no lo muestra y lo devuelve tal cual.
- **409 `configuracion_modificada`** (otro guardó antes): `showApiError` muestra el `title` del backend y la pantalla ofrece **"Recargar valores"**: trae la configuración vigente con su `version` nueva y **descarta lo editado** (el formulario es chico y se vuelve a tipear). **Sin reintento automático** ni recarga automática sin que el usuario lo decida. El formulario queda tal cual hasta que el usuario apriete "Recargar valores".
*Motivo:* decisión del usuario; es la opción más simple y no pierde lo editado sin explicación (el borrador queda hasta que el usuario decide).
*Descartados:* (a) mostrar los dos valores por campo y dejar elegir: más trabajo (diff y mezcla), valioso solo si varios dueños editan a la vez; (b) recargar solo, sin aviso: pierde lo editado sin explicación.

**D-FK8 (18/11/2026) — Confirmada. Confirmación antes de guardar zona, modo de caja, modo del mes o fracción del mes.** Al apretar "Guardar" y pasar la validación, si **cambió `zonaHoraria`, `modoCaja`, `modoMes` o `fraccionMes`** (uno o varios), se abre un diálogo con "Cancelar" y "Confirmar" **antes** de enviar, con un párrafo por cada cambio. Si no cambió ninguno de los cuatro, se guarda directo.

| Qué cambió | Texto del párrafo |
|---|---|
| Zona | "Vas a cambiar la zona horaria de **X** a **Y**. Cambia cómo se interpretan y se muestran todas las fechas y horas del local. No se puede cambiar con una caja abierta." |
| Modo de caja | "Vas a cambiar el modo de caja de **X** a **Y**. **[Diaria → Por turno]** La caja ya no se abre sola: hay que abrirla a mano, y sin caja abierta no se puede cobrar, anular ni devolver. **[Por turno → Diaria]** La caja se abre sola con el primer movimiento del día y hay que cerrarla antes de que termine el día. No se puede cambiar con una caja abierta." |
| Modo del mes | "Vas a cambiar cómo se arman los períodos de los contratos mensuales de **X** a **Y**. Afecta solo a los contratos nuevos; los que están en curso no cambian." |
| Fracción del mes | "Vas a cambiar cómo se cobra un período incompleto de **X** a **Y**. Afecta solo a los contratos nuevos; los que están en curso no cambian." |

Las etiquetas salen de `labelOfZona` y de `labelOf` de cada enum. La frase "no se puede cambiar con una caja abierta" es fiel al backend: `caja_abierta` salta si cambia la zona o el modo de caja y hay **cualquier** sesión abierta del tenant, de cualquier día (inventario). Si dos o más cambios coinciden, van los párrafos correspondientes en el mismo diálogo. `summarizeChanges(original, form)` (pura) devuelve `{ zona?, modoCaja?, modoMes?, fraccionMes? }`, cada uno `{ de, a }`.
*Motivo:* el usuario aprobó el aviso para zona y modo de caja (D3, D4): son los cambios que afectan a toda la operación y que el backend condiciona a una caja cerrada. Aprobó después (18/11/2026) extender el diálogo a `modoMes` y `fraccionMes`, con la aclaración "afecta solo a los contratos nuevos; los que están en curso no cambian" (los contratos en curso congelan los dos valores al crearse, inventario).
*Descartado:* confirmar cualquier cambio: demasiados diálogos para un `topePasadoDias` o una gracia.

**D-FK9 (18/11/2026) — Confirmada. Errores por `code`.** Todos los `catch` llaman a `showApiError(e)` (el `title` del backend tal cual, D-FA6). No se agregan entradas a `errorCodes.js`. Lo que la 11 define es qué hace la pantalla **después** del aviso, en `afterSaveError(code)` (pura):

| `code` | Cuándo | Después |
|---|---|---|
| `configuracion_modificada` | 409: otro guardó antes | Aviso y "Recargar valores" (D-FK7). El borrador queda |
| `caja_abierta` | 409: cambiar zona o modo de caja con una caja abierta | Aviso con el `title`. El diálogo se cierra, el borrador queda **y no se recarga** (no cambió ningún dato). El usuario puede cerrar la caja y reintentar o deshacer el cambio |
| `datos_invalidos` | 400: zona fuera de la lista (`errors.ZonaHoraria`) o valor fuera de rango (clave en PascalCase, sin confirmar) | Aviso con el `title`. Sin recarga. **No se depende del nombre de la clave de `errors`**: el cliente ya valida los mismos rangos, y la zona solo puede elegirse de la lista, así que solo aparece si el backend cambió un límite |
| `sin_permiso` | 403: permisos cambiados a mitad de sesión | Aviso con el `title`. Sin recarga |
| Otros o desconocido | | Aviso con el `title`. Sin recarga. Un error no-HTTP (`sin_conexion`, `tiempo_agotado`) conserva el borrador para reintentar |

El botón "Guardar" se deshabilita mientras la llamada está en curso. Ningún error descarta el borrador salvo que el usuario apriete "Recargar valores".
*Motivo:* en `configuracion_modificada` el usuario decide qué hacer con lo editado; en `caja_abierta` nada cambió y recargar sería perder lo tipeado sin motivo.

### 3.5 Textos de ayuda

**D-FK11 (18/11/2026) — Confirmada. Ayuda de cada campo.** Cada campo muestra bajo el control una línea de ayuda (`FormHelperText`) con qué hace, su unidad y el rango permitido. Los textos viven en una constante `CONFIG_AYUDA` en `src/utils/configuracion.js`, revisable de un vistazo, y un test compara los rangos que mencionan contra `CONFIG_LIMITS`. Fuente: la tabla "Significado de cada campo" del inventario.

| Campo | Texto de ayuda |
|---|---|
| `zonaHoraria` | "Zona horaria del local. Con ella se calculan los días del local (por ejemplo, el día de una caja) y se muestran todas las fechas y horas. No se puede cambiar con una caja abierta." |
| `modoCaja` | "Diaria: una caja por día, que se abre sola con el primer movimiento. Por turno: la caja se abre y se cierra a mano, y sin caja abierta no se puede cobrar, anular ni devolver. No se puede cambiar con una caja abierta." |
| `toleranciaInicioHoras` | "Horas hacia atrás desde ahora en las que se puede registrar el inicio de una ocupación sin permiso especial. Un inicio más viejo es retroactivo y exige permiso y motivo. De 0 a 168." |
| `topePasadoDias` | "Máximo de días hacia atrás para el inicio de una ocupación, para todos los roles. De 1 a 3650." |
| `techoFuturoMeses` | "Máximo de meses hacia adelante para el inicio de una ocupación. No limita el fin ni las tarifas. De 1 a 24." |
| `graciaHoraMinutos` | "Solo en ocupaciones por hora: minutos de tolerancia sobre la última fracción antes de cobrar otra hora. Con 10, 1 h 05 paga 1 hora y 1 h 15 paga 2. De 0 a 59." |
| `modoMes` | "Cómo se arman los períodos de un contrato mensual. Calendario: del 1 al fin de cada mes. Corrido: el mismo día y hora de cada mes. Bloques de 30 días: cada 30 días desde el inicio. Afecta solo a los contratos nuevos." |
| `fraccionMes` | "Cómo se cobra un período incompleto. Completo: el período entero. Proporcional: los días cubiertos sobre los días del período, redondeado al peso entero. Aplica al primer período si el contrato empieza a mitad y al último si hay baja anticipada. Afecta solo a los contratos nuevos." |
| `diasGraciaMora` | "Días desde el inicio de un período impago de un contrato mensual activo antes de considerarlo en mora y generar la alerta. No afecta nada más. De 0 a 60." |
| `ventanaAlertasDias` | "Cuántos días hacia atrás revisa el proceso horario de alertas. No se puede cambiar desde acá: lo configura la plataforma. Entre 7 y 90 días." |

Los ejemplos numéricos y los rangos son los del inventario. "Por defecto" no se muestra (el valor lo da el backend y puede cambiar).
*Motivo:* varios campos tienen nombres técnicos que el dueño no puede interpretar sin una explicación en pantalla; los textos se redactan solo con el significado confirmado en el backend.
*Descartado:* mostrar el valor por defecto de cada campo: es un dato del backend que no viaja en la respuesta y se desactualizaría.

### 3.6 Código

**D-FK12 (18/11/2026) — Confirmada. Lógica pura en `src/utils/configuracion.js`, probada con Vitest.** Exporta `CONFIG_LIMITS`, `validateConfiguracionForm`, `buildUpdateBody`, `diffConfiguracion`, `summarizeChanges` y `afterSaveError` (D-FK6 a D-FK9). Sin React ni estado. `Configuracion.jsx` queda como orquestador de estado y diálogos. Regla D-FA4 y principio de la 02: lo que no se puede romper tiene un test; la pantalla no tiene Testing Library.
*Descartado:* validación inline en la página: sin pruebas y con diez campos con rangos distintos.

## 4. Desvíos y pendientes

### 4.1 Desvíos

Ninguno. La 11 cumple las fuentes. Una nota sobre `MeProvider`: la spec 01 definía `reload` como único refresco y la 02 solo sumó validación; `refreshMe` es una **extensión** aditiva aprobada por el Orquestador, no un desvío.

### 4.2 Pendientes

**Del backend: cerrados el 18/11/2026** (relevados del código por el Orquestador e incorporados al inventario, sección `/Configuracion`).

| Id | Pendiente | Resolución |
|---|---|---|
| P-FK1 | Qué devuelve `PUT /Configuracion` | **Cerrado.** 200 con la configuración completa y la `version` nueva; la `version` cambia siempre, aunque no cambie nada. La pantalla usa la respuesta, sin `GET` (D-FK3, D-FK10), y no guarda sin cambios (D-FK6) |
| P-FK2 | Semántica de los 9 campos | **Cerrado.** Tabla "Significado de cada campo" del inventario; llena D-FK11 y D-FK8 |
| P-FK3 | Forma del 400 | **Cerrado en lo necesario.** Zona fuera de la lista: `errors.ZonaHoraria`; opcional fuera de rango: validación del DTO, clave en PascalCase sin confirmar. El front no depende del nombre (D-FK9) |
| P-FK4 | `GET` con una zona fuera de la lista | **Cerrado.** Devuelve la zona guardada tal cual (D-FK4) |
| P-FK5 | Alcance de `caja_abierta` | **Cerrado.** Solo si cambian `zonaHoraria` o `modoCaja` y hay **cualquier** sesión abierta del tenant, de cualquier día. Cambiar topes o campos de mensuales no lo dispara (D-FK8, D-FK9) |

**De producto (no frenan).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FK6 | Aviso de "hay cambios sin guardar" al navegar a otra pantalla: no se pide ahora. Si en uso real se pierde lo editado por navegar, se agrega (el borrador vive en el componente) | — |
| P-FK7 | Mostrar quién y cuándo guardó la última vez: el backend no devuelve esos datos en `GET /Configuracion` (la Trazabilidad, spec 04, es donde se vería) | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FK-L1 | Que la 02 esté implementada tal como la spec: existen `src/utils/fechas.js`, `useTenantDates.js`, `src/constants/enums.js` (con `ModoCaja`, `ModoMes`, `FraccionMes` y `optionsOf`), `src/api/params.js`, y que `MeProvider` ya valide la zona de `/me` | Si falta algo, **frenar**: no se implementa nada de la 02 desde acá |
| P-FK-L2 | La forma real del contexto de `MeProvider` tras la 02 (`reload`, validación de zona) y de `ApiError` | Ajustar el uso a lo que exista y anotarlo. Si la 02 cambió la forma del contexto, **frenar** |
| P-FK-L3 | Que `routes.test.js` y su fixture hayan cambiado por otras specs (04 renombra Auditoría, 09 reemplaza Caja diaria, 12 suma Usuarios) | Conservar todas las entradas de las otras specs y sumar `/configuracion` al final; actualizar las expectativas del test |
| P-FK-L4 | Que `GET /Configuracion` devuelva `modoCaja`, `modoMes` y `fraccionMes` como **enteros** | Si llegan como texto, **frenar** (cambia `enums.js`) |

**Resueltos al ejecutar (19/11/2026).** P-FK-L1 a L4 dieron bien: la 02 está implementada; `GET /Configuracion` serializa los enums como enteros (el backend no registra `JsonStringEnumConverter`; `ConfiguracionDtos.cs:11,23,26`); `routes.test.js` conserva las entradas de las otras specs y suma `/configuracion` antes de `/usuarios`. **P-FK-L5** (contradicción menor en la tabla del paso 3): el caso 3 pide que `-1` dé "Tiene que estar entre X y Y" y el caso 4 que `-3` dé "Ingresá un número entero". Se siguió D-FK6 y el caso 4 (no se aceptan signos): todo negativo da "Ingresá un número entero", y el test del límite inferior usa `min - 1` solo donde `min > 0`. Además, `modoMes` y `fraccionMes` vacíos dan error de campo obligatorio (el formulario siempre los tiene cargados).

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de API de configuración | `src/api/configuracionApi.js` | D-FK3 |
| Zonas horarias permitidas | `src/constants/zonasHorarias.js` | D-FK4 |
| Lógica pura de configuración | `src/utils/configuracion.js` | D-FK6, D-FK8, D-FK9, D-FK11, D-FK12 |
| Pantalla | `src/pages/Configuracion.jsx` | D-FK5, D-FK6, D-FK7, D-FK8, D-FK10 |
| Tests | `test/unit/constants/zonasHorarias.test.js`, `test/unit/utils/configuracion.test.js`, `test/unit/api/configuracionApi.test.js` | D-FA4 |
| Manual de esta spec | `docs/manual/frontend/11-configuracion.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/auth/MeProvider.jsx` | Suma `refreshMe()` al valor del contexto (aditivo: no cambia la carga inicial, la validación de zona ni `reload`) | D-FK2 |
| `src/auth/usePermissions.js` | Solo el comentario del valor del contexto (`{ status, me, error, reload, refreshMe }`) | D-FK2 |
| `src/auth/routes.js` | Suma `{ path: "/configuracion", label: "Configuración", permiso: "configuracion.ver" }` al final | D-FK5 |
| `src/App.jsx` | Importa `Configuracion` y lo suma a `PAGES` | D-FK5 |
| `test/unit/auth/routes.test.js` | Actualiza la lista de rutas y la expectativa del OPERADOR (no accede a `/configuracion`; AUDITOR sí) | D-FK5 |
| `docs/specs/README.md` | Estado de la fila 11 (lo actualiza el Orquestador al aprobar; el ejecutor la pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada.

### 5.4 No se tocan

`src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js` (D-FK9), `src/constants/enums.js` (los enums de configuración los crea la 02), `src/utils/fechas.js`, `src/utils/useTenantDates.js`, las demás páginas, `eslint.config.js` (la página nueva no usa `toLocale*`) y **`CLAUDE.md`** (la línea de endpoints la reemplaza la 02).

## 6. Pasos

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-configuracion` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada paso: `npm run lint` y `npm run build` sin errores, `npm test` en verde, el paso tildado en esta spec, el manual al día y el commit confirmado por el **Orquestador**.
- **Regla de ruteo (obligatoria).** El ejecutor **no corre comandos de terminal** y **no le pregunta nada al usuario** en su chat. Todo lo que necesite del usuario pasa por el chat "Orquestador" por `SendMessage`: los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, las dudas del backend, las preguntas de producto y los avisos. Cada consulta lleva la opción recomendada y las alternativas. Espera la respuesta antes de seguir. **No supone** el significado de un campo: pregunta.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena y se anota en la sección 4**. Lo único que el ejecutor resuelve solo es P-FK-L2 y P-FK-L3, con la regla que cada uno fija.
- Antes del PR: rebase sobre `develop`. Un conflicto en `routes.js`, `routes.test.js` o `App.jsx` con otras specs es trivial y está regulado en `docs/inventario/brechas-front.md`, "Contratos entre specs", **"Rutas"**: se conservan **todas** las entradas de las otras specs, cada spec actualiza el test para su ruta (el test compara el mapa completo y qué rol accede a qué) y `/configuracion` va al final del menú, junto con `/usuarios`.
- Cada función nueva de `configuracion.js` se prueba sin depender de la fecha ni de la zona del sistema.

### Paso 0 — Precondiciones y worktree

- [x] **0.1** Confirmar que la 02 está mergeada en `develop` y resolver **P-FK-L1**. Si no, frenar.
- [x] **0.2** Desde `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-configuracion -b feature/front-configuracion develop` (el ejecutor le **pide** el comando al Orquestador). En el worktree, copiar el `.env` (no está versionado) y correr `npm install`. Resolver P-FK-L2.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — `refreshMe()` en `MeProvider`

- [x] **1.1** En `src/auth/MeProvider.jsx`, agregar `refreshMe()` según D-FK2 (sin pasar por `cargando`, con la validación de zona, conservando el `me` anterior si falla, última respuesta gana) y exponerla en el valor del contexto. Actualizar el comentario de `usePermissions.js`. **No** cambiar la carga inicial, la validación de zona ni `reload`.

  *Aceptación (manual, con el backend de `develop`):* (1) `useMe().refreshMe` existe y devuelve una promesa; (2) llamarla desde la consola de React o con una página de prueba temporal (sin commitear) vuelve a pedir `GET /me` y la pantalla no pasa por "cargando"; (3) con el backend apagado, rechaza con `ApiError`, el `me` anterior se conserva y la app no pasa a la pantalla de error de `/me`; (4) `reload` sigue funcionando como antes (parpadea a "cargando"). `git diff develop -- src/auth/MeProvider.jsx` solo agrega lo de `refreshMe`. `npm run lint` y `npm run build` pasan.

### Paso 2 — Zonas y módulo de API

- [x] **2.1** Crear `src/constants/zonasHorarias.js` (D-FK4) y `test/unit/constants/zonasHorarias.test.js`.
- [x] **2.2** Crear `src/api/configuracionApi.js` (D-FK3) y `test/unit/api/configuracionApi.test.js` con `vi.mock` de `http`.

  *Aceptación:* `npm test` pasa con: la lista tiene 12 zonas, sin repetidas, con los IANA exactos de la sección 5 del inventario y en su orden; cada una pasa `isValidTimeZone`; `labelOfZona("America/Montevideo")` da "Montevideo (Uruguay)" y `labelOfZona("Europe/Madrid")` da `Europe/Madrid`; `getConfiguracion` hace `GET /Configuracion` y devuelve el objeto; una respuesta que no es un objeto con `zonaHoraria`, `modoCaja` y `version` lanza `ApiError` con `code: "respuesta_invalida"`; `updateConfiguracion` hace `PUT /Configuracion` con el cuerpo recibido, sin modificarlo; ninguna función captura errores (un rechazo de `http` se propaga). `npm run lint` y `npm run build` pasan.

### Paso 3 — Lógica pura

- [x] **3.1** Crear `src/utils/configuracion.js` con las funciones de D-FK12 y `test/unit/utils/configuracion.test.js`.

  *Aceptación:* `npm test` pasa con estos casos (`original` = `{ zonaHoraria: "America/Montevideo", modoCaja: 1, toleranciaInicioHoras: 2, topePasadoDias: 30, techoFuturoMeses: 6, modoMes: 1, fraccionMes: 1, graciaHoraMinutos: 10, diasGraciaMora: 5, ventanaAlertasDias: 30, version: "AAAAAAAB=" }`):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `CONFIG_LIMITS` | Coincide con el inventario: 0..168, 1..3650, 1..24, 0..59, 0..60 (y 7..90 para `ventanaAlertasDias`, solo informativo) |
  | 2 | `validateConfiguracionForm` con cada número en su mínimo y máximo | `ok` |
  | 3 | Cada número un valor por debajo del mínimo y por encima del máximo (ej. `toleranciaInicioHoras` `-1` y `169`; `topePasadoDias` `0` y `3651`) | Error de ese campo con "Tiene que estar entre X y Y" |
  | 4 | Valores `""`, `"1.5"`, `"1e2"`, `"abc"`, `"-3"`, `" 5 "` | Los cuatro primeros y `"-3"` dan "Ingresá un número entero"; `" 5 "` es `ok` con 5 |
  | 5 | `zonaHoraria` o `modoCaja` vacíos | Error de campo obligatorio |
  | 6 | `diffConfiguracion` sin cambios | `{}` y "Guardar" deshabilitado |
  | 7 | `buildUpdateBody` con solo `topePasadoDias` cambiado a 60 | `{ zonaHoraria: "America/Montevideo", modoCaja: 1, version: "AAAAAAAB=", topePasadoDias: 60 }`, **sin** las demás claves opcionales |
  | 8 | `buildUpdateBody` con la zona cambiada | Lleva la zona nueva; `version` idéntica al original; nunca lleva `ventanaAlertasDias` |
  | 9 | `buildUpdateBody` con un entero pasado como texto (`"60"`) | `60` numérico |
  | 10 | `summarizeChanges` con zona, modo de caja, modo del mes y fracción cambiados | `{ zona, modoCaja, modoMes, fraccionMes }`, cada uno `{ de, a }`; con solo `topePasadoDias` o `graciaHoraMinutos` cambiado, `{}` (no abre diálogo) |
  | 11 | `afterSaveError` | `configuracion_modificada` devuelve `ofrecerRecargar: true`; `caja_abierta`, `datos_invalidos`, `sin_permiso`, un código desconocido y `undefined` devuelven `false`. Ninguno recarga solo |
  | 12 | `CONFIG_AYUDA` | Tiene una entrada por cada campo del formulario (los 9 editables y `ventanaAlertasDias`) y cada rango mencionado coincide con `CONFIG_LIMITS` |

  `npm run lint` y `npm run build` pasan.

### Paso 4 — Pantalla de lectura, ruta y menú

- [x] **4.1** Crear `src/pages/Configuracion.jsx` con la carga (D-FK10), el formulario con ayuda (D-FK6, D-FK11) y el modo solo lectura (D-FK5). Resolver **P-FK-L4**.
- [x] **4.2** Agregar la ruta a `src/auth/routes.js` y `src/App.jsx`, y actualizar `test/unit/auth/routes.test.js` (P-FK-L3).

  *Aceptación (manual, con el backend de `develop` y un usuario cuyo tenant tenga `America/Montevideo`):* (1) con `dueno@demo.test`, `GET /Configuracion` responde 200 y el formulario muestra los valores con sus etiquetas ("Diaria"/"Por turno", "Calendario"/"Corrido"/"Bloques de 30 días", "Completo"/"Proporcional"); (2) con `encargado@demo.test` y con un AUDITOR, la pantalla se ve completa, con campos deshabilitados, sin "Guardar" y con "Solo el dueño puede modificar la configuración"; (3) con `operado@demo.test`, "Configuración" no aparece en el menú y entrar a `/configuracion` por URL muestra "No tenés permiso"; (4) con el backend apagado se ve "No pudimos cargar la configuración" con "Reintentar" y no un formulario vacío; (5) `ventanaAlertasDias` se ve como dato, sin campo editable; (6) si el tenant tuviera una zona fuera de la lista, el selector muestra "`<IANA>` (fuera de la lista)". `npm test`, `npm run lint` y `npm run build` pasan.

### Paso 5 — Edición, guardado, confirmaciones y errores

- [x] **5.1** Edición con `validateConfiguracionForm` y "Descartar cambios"; "Guardar" deshabilitado sin cambios o con errores.
- [x] **5.2** Guardado con `buildUpdateBody` y `updateConfiguracion`; en éxito, aviso "Configuración guardada" y recarga (D-FK10); si cambió la zona, `refreshMe()` y su error aparte.
- [x] **5.3** Diálogo de confirmación de zona y de modo de caja (D-FK8) con `summarizeChanges`.
- [x] **5.4** Errores por `code` (D-FK9): `configuracion_modificada` con "Recargar valores" (D-FK7), `caja_abierta`, `datos_invalidos` y `sin_permiso`.

  *Aceptación (manual, con `dueno@demo.test`):* (1) cambiar solo `topePasadoDias` guarda sin diálogo, el `PUT` lleva los tres obligatorios y solo ese campo, con `version` idéntica a la que vino, y el formulario toma la respuesta del `PUT` (con la `version` nueva) **sin** un `GET /Configuracion` aparte; (2) un valor fuera de rango o decimal no llega a la red y muestra el mensaje; (3) cambiar la zona abre el diálogo con el texto de D-FK8; "Cancelar" no envía nada; "Confirmar" guarda, y después `GET /me` devuelve la zona nueva y `useTenantDates` la usa **sin recargar la pestaña** (verificable mostrando una fecha en otra pantalla); (4) cambiar el modo de caja, el modo del mes o la fracción del mes abre el diálogo con el texto de D-FK8 (los dos últimos dicen "Afecta solo a los contratos nuevos"); (5) con una caja abierta, cambiar la zona o el modo de caja muestra el `title` de `caja_abierta`, el borrador queda y no se recarga; (6) con dos pestañas, guardar en la primera y luego en la segunda muestra el `title` de `configuracion_modificada` y el botón "Recargar valores", que trae los valores nuevos y descarta lo editado; no hay reintento automático; (7) con el backend apagado en el `PUT`, el borrador se conserva; (8) con `encargado@demo.test` y un AUDITOR, un `PUT` forzado desde DevTools muestra el `title` de `sin_permiso`; (9) si `refreshMe` falla después de guardar la zona, se ve "La configuración se guardó, pero no pudimos actualizar la zona horaria en esta sesión" y no se pierde el guardado. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Documentación y cierre

- [x] **6.1** Crear `docs/manual/frontend/11-configuracion.md`: qué hace cada campo (con los textos de D-FK11), cómo funciona la concurrencia con `version`, qué hace `refreshMe` y su límite (otras sesiones y datos ya cargados), la tabla de permisos y de errores por `code`.
- [x] **6.2** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`. **No** tocar `CLAUDE.md`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; `git diff develop -- CLAUDE.md src/api/http.js src/utils/fechas.js` vacío.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Entrar a `/configuracion` con `dueno@demo.test` | `GET /Configuracion` responde 200; formulario con los valores y su ayuda |
| 3 | Entrar con `encargado@demo.test` y un AUDITOR | Pantalla en solo lectura con el aviso; sin "Guardar" |
| 4 | Entrar con `operado@demo.test` | Sin entrada en el menú; por URL, "No tenés permiso" |
| 5 | Cambiar un parámetro numérico y guardar | `PUT` con obligatorios más ese campo; sin diálogo; valores recargados |
| 6 | Valor fuera de rango o decimal | No llega a la red; mensaje claro |
| 7 | Cambiar la zona y confirmar | `GET /me` trae la zona nueva; las fechas de otra pantalla se muestran en ella sin recargar |
| 8 | Cambiar zona o modo de caja con una caja abierta | `title` de `caja_abierta`; el borrador queda |
| 9 | Guardar desde dos pestañas | `configuracion_modificada` con "Recargar valores"; sin reintento automático |
| 10 | Cambiar el modo de caja, el modo del mes o la fracción del mes | Diálogo de confirmación (los dos últimos: "Afecta solo a los contratos nuevos") |
| 11 | Backend apagado al cargar y al guardar | "No pudimos cargar la configuración" con "Reintentar"; al guardar, el borrador se conserva |
| 12 | `git diff develop -- CLAUDE.md` | Vacío |

**No verificable en el producto:** que otros usuarios conectados del mismo tenant vean la zona nueva sin recargar (no se hace, D-FK2) y el caso de una zona fuera de la lista (depende de un dato viejo; lo cubren el test de `labelOfZona` y la revisión manual del paso 4).

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El Orquestador aprobó `refreshMe` (D-FK2); el usuario aprobó D1 a D4 (D-FK5, D-FK7, D-FK8), la extensión del diálogo a `modoMes` y `fraccionMes` y, con ella, el resto de las decisiones. Todas las D-FK quedan Confirmadas. El relevamiento del backend (P-FK1 a P-FK5) está cerrado y los textos de ayuda salen del inventario. Falta implementar la 02 y mergearla para poder ejecutar.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-configuracion` (rama `feature/front-configuracion`), creado desde `develop`. **Solo puede arrancar cuando la 02 esté implementada y mergeada en `develop`** (P-FK-L1). Un chat para todos los pasos:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 6 | Sonnet | bajo–medio | Pantalla con lógica pura chica y decisiones tomadas. El paso 1 toca `MeProvider` (de la 01 y la 02): es aditivo y solo agrega `refreshMe`. Frena al terminar cada paso. Si P-FK-L1, P-FK-L2 o P-FK-L4 no dan, **frena** y avisa al Orquestador: no implementa nada de la 02 ni cambia `enums.js` |

**Prompt para el chat de ejecución:**

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-configuracion` (rama `feature/front-configuracion`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/inventario/backend.md` (`/Configuracion`, secciones 3, 4 y 5) y `docs/specs/frontend/11-configuracion.md`. Ejecutá **los pasos de la 11**, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FK-L1: si la 02 no está implementada en `develop`, frená. **Regla de ruteo (obligatoria):** no corras comandos de terminal y no le preguntes NADA al usuario en tu chat. Todo lo que necesites del usuario pasa por el chat "Orquestador" por `SendMessage`: comandos (exactos y con su carpeta), confirmaciones de cierre de paso y de commit, dudas del backend, preguntas de producto y avisos, siempre con la opción recomendada y las alternativas. Esperá su respuesta. No supongas el significado de un campo de configuración: preguntá. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador, y esperá su confirmación antes de seguir. Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md`. El paso 1 agrega `refreshMe()` a `MeProvider` sin cambiar nada de lo que ya hace. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 2 a 6 (tabla de casos y decisiones tomadas). Sonnet con esfuerzo medio para el paso 1 (`MeProvider`, carreras de respuestas) y el 5 (diálogos y errores). Se sube a Opus solo si aparece una decisión que la spec no previó (por ejemplo, que el backend cambie el contrato del `PUT` o la forma de `version`).
