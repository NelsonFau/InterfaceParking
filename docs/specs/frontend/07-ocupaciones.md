# 07 — Ocupaciones: alta abierta, retroactiva y futura; detalle con saldo; finalizar y cancelar

> Frontend · **Aprobada** (18/11/2026) · `feature/specs-etapa4` (esta spec) y `feature/front-ocupaciones` (ejecución, en el worktree `../parkingcontrol-front-ocupaciones`, a crear desde `develop` cuando estén mergeadas la 02, la 04, la 05 y la 06) · Última actualización 18/11/2026
>
> Séptima spec del frontend y la pantalla central del sistema. Hoy `Ocupaciones.jsx` carga, pero obliga a cargar un `fin`, pide el id interno de la cochera a mano, muestra todas las acciones a todos los roles, finaliza sin confirmar ni resolver el excedente de un mensual, no distingue una reserva de una ocupación en curso y descarta el `title` de los errores de la API. Esta spec la reescribe sobre la API actual. **Depende de la 02** (fechas con zona del tenant, enums, `formatMoney`, patrón de `src/api/`), de la **04** (`buildTrazabilidadPath`), de la **05** (`getAlertLinks`) y de la **06** (`cocheraApi.js`); no puede arrancar hasta que las cuatro estén mergeadas en `develop`.

## 1. Objetivo y alcance

**Objetivo.** Que el personal del mostrador pueda registrar una ocupación (abierta, cerrada, futura o retroactiva, con tarifa normal o excepcional), encontrarla en un listado con filtros, ver su cuenta (total, pagado, saldo) y cerrarla (finalizar o cancelar la reserva) sin errores genéricos; y que cada usuario vea solo las acciones que su permiso le deja hacer.

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Módulos de API | `src/api/ocupacionApi.js` (`listOcupaciones`, `getOcupacion`, `createOcupacion`, `cancelOcupacion`, `finalizeOcupacion`); `src/api/clienteApi.js` con solo `listClientes`; `createPago` aditiva en `pagosApi.js` | D-FG2, D-FG3, D-FG4 |
| Fase de una ocupación | Reserva, en curso, vencida, finalizada o cancelada, derivada en una función pura | D-FG10 |
| Listado | Activas por defecto, filtros por estado, cochera (por número), cliente, rango de días, vencimiento y cantidad; aviso de resultado truncado | D-FG11, D-FG12 |
| Detalle | Diálogo con la cuenta (total, tope, pagado, saldo, saldo a favor), la tarifa, el contrato mensual y los enlaces; se abre con `/ocupaciones?id=N` | D-FG13, D-FG14, D-FG15 |
| Alta | Un diálogo con cochera elegida entre las disponibles, inicio retroactivo con motivo, tarifa excepcional con permiso, ocupación abierta | D-FG16 |
| Cancelar reserva | Solo reservas, con motivo, sin `finReal` | D-FG17 |
| Finalizar | Confirmación con la cuenta y resolución del excedente de un mensual | D-FG18 |
| Registrar pago | Se queda en la 07, como componente aparte | D-FG19 |
| Permisos y errores | Acciones ocultas por permiso; errores por `code`, con el campo marcado y la recarga que corresponda | D-FG7, D-FG8, D-FG9 |
| Fechas y enums | `useTenantDates`, enums de la 02, `formatMoney`; se retiran `fmtDate`, `ESTADOS`, `TIPOS`, `METODOS_PAGO`, `money` y la excepción de lint | D-FG6, D-FG21 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Detalle de un pago, lista de pagos de la ocupación, devoluciones y anulación | Spec 08. En el detalle queda una sección "Pagos" vacía para que la monte la 08 (D-FG5) |
| Ajuste de precio de un contrato (individual y en lote) y baja programada (`PUT /Ocupacion/{id}/fin`) | Spec 10. El detalle deja la sección "Contrato mensual" donde la 10 agrega sus acciones (D-FG13) |
| Validar en el cliente tolerancia, topes, techos y duración máxima | No se hace (D-FG9): el backend es la autoridad |
| Alta de un cliente desde el diálogo de ocupación | Sin pedido. Clientes sigue en su pantalla |
| Abrir el alta con una cochera ya elegida desde Cocheras | Sin pedido (P-FG6) |
| Enlace desde el historial de Cocheras a `/ocupaciones?id=N` | La 06 ya está aprobada y no lo trae (P-FG5) |
| Paginación del listado | El backend no pagina (máximo 500). Se avisa cuando el resultado se trunca (D-FG11) |
| Rediseño visual | Después, con el diseño nuevo |
| `CLAUDE.md`, línea "Backend endpoints used" | No se toca: la reemplaza la 02. Solo se corrige la frase sobre Ocupaciones (D-FG21) |

**Estado de alcance.** Etapa 4 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` (con la 02, la 04, la 05 y la 06 ya mergeadas al ejecutar); backend, inventario del 18/11/2026 sobre `main`. Los documentos del backend mandan sobre esta spec; si algo de acá los contradice, se corrige la spec.

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| `docs/inventario/backend.md`, sección 1, `/Ocupacion` | Endpoints, `OcupacionRequest`, `OcupacionResponse`, `OcupacionListItem`, `OcupacionDetalle`, permisos, retroactiva, tarifa excepcional, finalizar con `resolucionExcedente` | 18/11/2026 |
| `docs/inventario/backend.md`, `/Cochera` "Comportamiento" | `/Cochera/disponibles`: `hasta > desde`, `hasta` exclusivo, excluye bloqueadas y solapadas con ACTIVA; el `id` del historial de una cochera es el de la ocupación | 18/11/2026 |
| `docs/inventario/backend.md`, `/Tarifa` "Comportamiento" | `tarifa_no_configurada` (409): no hay tarifa del tipo con `vigenteDesde <=` el día local del inicio, salvo tarifa excepcional; una retroactiva toma la tarifa de ese día y una futura la que regirá | 18/11/2026 |
| `docs/inventario/backend.md`, `/Configuracion` "Significado de cada campo" | `toleranciaInicioHoras`, `topePasadoDias`, `techoFuturoMeses` (400 en el campo `Inicio`), duración máxima por tipo, `graciaHoraMinutos`, `modoMes` y `fraccionMes` (congelados al crear) | 18/11/2026 |
| `docs/inventario/backend.md`, secciones 0, 2, 3, 4 y 5 | Instantes con zona; enums enteros; matriz de permisos (OPERADOR sin `crear_retroactiva`, `tarifa_excepcional` ni `configuracion.ver`); códigos de error; semántica de rangos: en `/Ocupacion`, `desde` filtra por `Inicio`, `hasta` por `Fin`, inclusivo, y excluye las abiertas | 18/11/2026 |
| `docs/inventario/brechas-front.md`, secciones 1, 2, 5 y "Contratos entre specs" | Brechas de Ocupaciones, `cocheraApi.js` con `listCocherasDisponibles`, enlace a Trazabilidad, configuración en otras pantallas, rutas | 18/11/2026 |
| Spec 02 (`02-base-comun.md`) | D-FB10 y DV-FB2 (arreglo mínimo de fechas que esta spec reemplaza), tabla 5.4, `useTenantDates`, `dateRangeToInstants`, `localInputToInstant`, `instantToInput`, enums y `optionsOf`, `formatMoney`, `cleanParams`, patrón D-FB14 | 18/11/2026 |
| Spec 04 (`04-trazabilidad.md`), D-FD5 | `buildTrazabilidadPath`, enlace solo con `auditoria.ver`, uso de `TRAZABILIDAD_PATH` desde `routes.js` | 18/11/2026 |
| Spec 05 (`05-alertas.md`), D-FE6, D-FE10 y P-FE1 | `/alertas-operativas?ocupacionId=N` y `getAlertLinks(alerta, { canTrazabilidad })`, a la que la 07 le suma su línea | 18/11/2026 |
| Spec 06 (`06-cocheras.md`), D-FF2 | `cocheraApi.js` con `listCocheras` y `listCocherasDisponibles({ desde, hasta })` | 18/11/2026 |
| Spec 03 (`03-tarifas.md`) | Modelo de formato y de estructura | 18/11/2026 |
| Spec 01 | `ApiError`, `showApiError` (D-FA6), permisos con `can` (D-FA10), lógica pura con Vitest (D-FA4) | 09/11/2026 |
| Lectura de `src/pages/Ocupaciones.jsx`, `src/api/pagosApi.js`, `src/api/errors.js`, `src/constants/errorCodes.js` y `src/auth/routes.js` | Estado actual (sección 2.1); `ApiError.errors` solo viene con `datos_invalidos`; la ruta `/ocupaciones` ya exige `ocupaciones.ver` | 18/11/2026 |
| Rama `wip/ocupaciones-reservas` (descripción del desarrollador) | Insumo: "Cancelar reserva" para las futuras, sacar `finReal` del cancelar, `puedeCancelar` y `puedeFinalizar` | 18/11/2026 |
| Relevamiento del backend B1 a B9 (Orquestador, del código de `ParkingControl`, sección 2.2) | Retroactiva, cancelar, excedente de un mensual, cifras (`topeDeCobro`, `saldo`, `saldoAFavor`), orden y filtros del listado, solape de una abierta, motivos y topes del alta, respuesta del alta, `POST /Pagos`. El inventario se corrigió con este relevamiento en el mismo PR | 18/11/2026 |
| Respuestas del desarrollador (18/11/2026, por el Orquestador) | Límite con la 08 y la 10, listado por defecto, un solo diálogo de alta, fase en el cliente y "reaccionar al 400" al finalizar (D-FG3 a D-FG5, D-FG10 a D-FG13, D-FG16, D-FG18) | 18/11/2026 |

**Referencias externas.** No hay librerías nuevas. Al ejecutar se consultan en su versión vigente: MUI (`Dialog`, `Autocomplete`, `Chip`, `Switch`, `TextField type="date"` y `datetime-local`), `react-router-dom` 7 (`useSearchParams`, `Link`) y Vitest (`vi.mock`).

### 2.1 Lo que hay hoy (estado del código, no decisión)

Números de línea de `develop` al 18/11/2026, antes de ejecutar la 02 (el paso 7 de la 02 cambia cinco valores de fecha).

| Pieza | Estado actual |
|---|---|
| Carga | `Ocupaciones.jsx:157` arma `URLSearchParams` a mano y llama a `http.get`. Descarta respuestas viejas con `reqIdRef`. Si falla, deja la lista vacía y el aviso dice "No pude cargar ocupaciones" (el `catch` lee `e.response.data.error`, un campo que la API ya no manda) |
| Filtros | Estado (Todos, ACTIVA, VENCIDA, CANCELADA: **falta FINALIZADA**), "Cochera" como texto libre con el **id interno**, cliente por `Autocomplete`, "Vence en días", "Desde" y "Hasta" como `datetime-local` convertidos con `new Date(x).toISOString()` (l. 152–153, zona del navegador) y "Take" como texto libre |
| Tarjeta | Muestra `Fin: ` vacío si no hay fin, `money(precioTotal)` (con `null` dice `$ 0,00`, falso), `fmtDate` con `toLocaleString()`. El chip de estado usa `estadoCalculado ?? estado`. **No distingue una reserva futura de una ocupación en curso** |
| Alta | `CocheraId` como número escrito a mano. `Fin` obligatorio (l. 250): no se puede crear una ocupación abierta. Sin `motivoRetroactivo`. El switch de tarifa excepcional se ve para todos. Fechas con `new Date(x).toISOString()` (l. 252–253) |
| Cancelar | Visible si `estado === 1` y `inicio > ahora` (l. 620). El diálogo pide `finReal` con el texto "Si no ponés fin real, se usa ahora (UTC)" |
| Finalizar | Visible si `estadoCalculado` es 1 o 2 y `inicio <= ahora` (l. 632). Hace `POST /finalizar` **sin confirmar y sin cuerpo**: un mensual con excedente no se puede resolver |
| Pago | `http.post("/Pagos", …)` directo, sin pasar por `pagosApi`; el botón aparece con `saldo > 0` y `estado !== 3`. El método sale de `METODOS_PAGO` local |
| "Ver" | Muestra un `toast` con el id: no hay detalle |
| Permisos | Ninguno: todas las acciones se ven siempre |
| Errores | `toast.error(e?.response?.data?.error \|\| "No pude …")` en cada `catch` y `console.error`. No usa `showApiError` ni decide por `code` |
| Copias | `ESTADOS` (l. 23), `TIPOS` (l. 30), `METODOS_PAGO` (l. 36), `money` (l. 43), `fmtDate` (l. 55), `estadoLabel`, `tipoLabel` y `EstadoChip` locales. Excepción de lint de `toLocale*` (D-FB9) |
| Cliente | Dos copias del `Autocomplete` con sus estados y temporizadores (filtro y alta), pegadas a `http.get("/Cliente?…")` |

### 2.2 Lo que hace el backend (relevamiento B1 a B9, 18/11/2026)

Relevado por el Orquestador del código (rutas relativas a `ParkingControl\ParkingControl\`; sin confirmar por tests). No hay FluentValidation: las validaciones son DataAnnotations (400 `datos_invalidos`, y salen **antes** que el 403), `OcupacionValidator` y excepciones de dominio; `ReglaInvalidaException` da 400 `datos_invalidos` con `errors.<Campo>` en PascalCase.

| Tema | Comportamiento |
|---|---|
| **Retroactiva (B1)** | Es retroactiva si `Inicio < ahora − toleranciaInicioHoras`. Sin `ocupaciones.crear_retroactiva`, el controller da **403 `sin_permiso`** antes del servicio (`OcupacionController.cs:39-41`), incluso antes que el 400 de tope de pasado. El 409 `inicio_retroactivo_sin_permiso` solo sale por una carrera de configuración: casi inalcanzable (respaldo con el mismo tratamiento) |
| **Cancelar (B2)** | Solo para ACTIVA con `Inicio > ahora` (reservas). `ocupacion_no_encontrada` (404); `ocupacion_no_activa` (409, cancelada o finalizada); `ocupacion_ya_iniciada` (409, en curso o vencida: "Solo se pueden cancelar reservas futuras. Las ocupaciones vigentes deben finalizarse."); 400 sin motivo. **`finReal` se ignora** (`OcupacionRequest.cs:36-37`). `motivo` es `[Required]` sin `MaxLength` (un motivo de solo espacios **falla**: `[Required]` lo rechaza; corregido el 18/11/2026) y va a la auditoría. **Con pagos se puede cancelar**: queda `saldoAFavor` = todo lo pagado y se crea la alerta `DEVOLUCION_PENDIENTE` |
| **Finalizar un MES (B3)** | Hay excedente si `pagadoNeto > total`, con `total` = lo devengado hasta la salida real. Sin `resolucionExcedente`: **400 `datos_invalidos` con `errors.ResolucionExcedente`**; el monto **no** viene estructurado, solo en el `title` ("Lo pagado (X.XX) supera lo que corresponde hasta la salida (Y.YY). Elegí COBRAR_COMPLETO (con motivo) o DEVOLVER."). **El excedente no se conoce antes de finalizar**: `saldoAFavor` del detalle es `max(pagado − topeDeCobro, 0)` y, en una ACTIVA con fin, el tope es el contrato hasta `Fin`, no lo devengado hoy. `COBRAR_COMPLETO` exige `motivo` (400 `errors.Motivo`, máximo 250) y deja `PrecioTotal = pagadoNeto`. **`DEVOLVER` no crea la devolución**: deja `PrecioTotal` en lo calculado, pasa a FINALIZADA y crea la alerta `DEVOLUCION_PENDIENTE`; la devolución se hace después con `POST /Pagos/{id}/devoluciones` (08). `resolucionExcedente` sin excedente se ignora (sin 400). **HORA y DÍA con excedente: el backend fuerza `DEVOLVER` y crea la alerta**, ignorando lo enviado. Responde 204; `finReal = ahora` y `Fin` no cambia. Otros 409: `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_no_iniciada` |
| **Cifras (B4)** (`CuentaDeOcupacion.cs`, `CalculadoraDeCobro.cs`) | `topeDeCobro`: CANCELADA 0; FINALIZADA `PrecioTotal ?? 0`; ACTIVA **con fin** (incluidas vencida y reserva) el total esperado hasta `Fin` (HORA: horas iniciadas con gracia, mínimo 1; DÍA: bloques de 24 h, mínimo 1; MES: períodos con `modoMes` y `fraccionMes` congelados, el proporcional redondeado al peso); ACTIVA **sin fin**: hasta el fin de la unidad en curso, `(floor(transcurrido) + 1) × precio`, sin gracia (en MES, el período en curso entero; una reserva abierta da 1 unidad). `saldo = max(tope − pagado, 0)` y no depende de `precioTotal`. `pagado` es neto (pagos PAGADO menos devoluciones, sin anulados). Una vencida **no** incluye la demora hasta que se finaliza |
| **Listado (B5)** | Orden: `Inicio` descendente, sin desempate. **`estado=ACTIVA` no incluye las vencidas** (es ACTIVA con `Fin` nulo o `Fin > ahora`: en curso y reservas). `estado=VENCIDA` (2) filtra bien (ACTIVA con `Fin <= ahora`). `venceEnDias`: ACTIVA con `Fin` no nulo y `ahora < Fin <= ahora + N`; **excluye las vencidas y las abiertas**, se combina en AND y no valida N. `take`: 200 por defecto, el controller **recorta en silencio a 500** (sin 400) y `take <= 0` pasa a 200. `desde`: `Inicio >= desde`; `hasta`: `Fin <= hasta`, excluye las abiertas |
| **Solape de una abierta (B6)** | `Fin` nulo es `[Inicio, ∞)`: choca con cualquier ACTIVA de la cochera que sea abierta, vencida (`Fin <= ahora`: bloquea hasta que se finalice) o con `Fin > desde`, incluidas las reservas futuras (409 `cochera_no_disponible` o `cochera_bloqueada`). `/Cochera/disponibles` exige `hasta` y usa la misma condición. Como el techo futuro es de 24 meses como mucho, `inicio + 10 años` detecta todas las reservas. No hay tope de duración para las abiertas |
| **Motivos y topes del alta (B7)** | `motivoRetroactivo`: máximo 250; obligatorio solo si es retroactiva y hay permiso (400 `errors.MotivoRetroactivo`); dentro de la tolerancia se ignora y se guarda `null`. `motivoTarifaExcepcional`: obligatorio con `usarTarifaExcepcional` (400 `errors.MotivoTarifaExcepcional`); el DTO no tiene `MaxLength` pero la columna es de 250, así que de más probablemente da 500 (**PB-8**); precio faltante o `<= 0`: 400 `errors.PrecioUnitarioExcepcional`; permiso `ocupaciones.tarifa_excepcional` (403 `sin_permiso`). Duración máxima (constantes, solo con `Fin`): HORA 7 días, DÍA 90 días, MES 3 años, 400 `errors.Fin`; `Fin <= Inicio` también da `errors.Fin`. Configurables: `toleranciaInicioHoras` (0 a 168, defecto 24), `topePasadoDias` (defecto 30, 400 `errors.Inicio` para todos los roles), `techoFuturoMeses` (defecto 3, con la fecha local del tenant, 400 `errors.Inicio`). Orden de validación: `Fin > Inicio` → duración → techo → tope de pasado → retroactivo → cochera 404/409 → cliente 404/409 inactivo → disponibilidad 409 → tarifa (`tarifa_no_configurada`) |
| **Respuesta del alta (B8)** | **200** (no 201) con `OcupacionResponse`: `id, cocheraId, clienteId, tipo, inicio, fin, precioUnitarioAplicado, precioTotal` (siempre `null` en el alta), `topeDeCobro` (ya calculado) y `estado`. No trae `esTarifaExcepcional`, `modoMes`, `fraccionMes` ni `saldo` |
| **`POST /Pagos` (B9)** | 201. Orden de errores: 404 `ocupacion_no_encontrada`; 409 `ocupacion_cancelada`; 409 `pago_supera_saldo` si `pagadoNeto + monto > topeDeCobro` (una finalizada con saldo 0 siempre da 409); errores de caja 409 `caja_cerrada` (TURNO sin sesión) y `caja_dia_anterior_abierta` (DIARIA; en DIARIA sin sesión abierta se abre sola). Una reserva futura y una vencida se aceptan hasta el tope. `monto` con `[Dinero]`: mayor que 0, 2 decimales, máximo 1e7 (400 `errors.Monto`) |

**Discrepancias con `docs/inventario/backend.md`** (corregidas en `docs/inventario/backend.md` en el mismo PR de esta spec, 18/11/2026): `finReal` de cancelar se ignora; el motivo de cancelar no tiene tope; el excedente se calcula con la salida real y en HORA y DÍA se fuerza `DEVOLVER`; el monto del excedente solo viene en el `title`; `inicio_retroactivo_sin_permiso` es casi inalcanzable; los `errors.*` del alta; `take` se recorta en silencio; definición de `saldoAFavor`; `venceEnDias`; `/Cochera/disponibles` exige `hasta` y trata `Fin <= ahora` como ocupada para siempre.

## 3. Decisiones

Prefijo **D-FG** ("frontend, ocupaciones"). Estado: **Confirmada** (la tomó el desarrollador o la fija una fuente) o **Propuesta** (se aprueba junto con la spec; si se objeta, se reemplaza con una decisión nueva). Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo y módulos de API

**D-FG1 (18/11/2026) — Confirmada. Rama, worktree y orden de merge.** La spec vive en `feature/specs-etapa4`. La ejecución va en `feature/front-ocupaciones`, en el worktree `../parkingcontrol-front-ocupaciones`, creada desde `develop`, con un commit por paso y un PR a `develop`. **No arranca hasta que estén mergeadas la 02, la 04 (por `buildTrazabilidadPath`), la 05 (por `getAlertLinks`) y la 06 (por `cocheraApi.js`)**. Las excepciones de lint se sacan en orden de merge, con `git rebase develop` antes del PR.

**D-FG2 (18/11/2026) — Confirmada. `src/api/ocupacionApi.js` con el patrón D-FB14.** Funciones `async`, nombradas, que devuelven `data`, con JSDoc de tipos tomados del inventario (`OcupacionRequest`, `OcupacionResponse`, `OcupacionListItem`, `OcupacionDetalle`), sin capturar errores y sin convertir fechas ni enums (reciben `UtcInstant` y enteros ya listos):

| Función | Endpoint | Devuelve |
|---|---|---|
| `listOcupaciones(filters)` | `GET /Ocupacion`, con `params: cleanParams(filters)` | `OcupacionListItem[]` |
| `getOcupacion(id)` | `GET /Ocupacion/{id}` | `OcupacionDetalle` |
| `createOcupacion(body)` | `POST /Ocupacion` | `OcupacionResponse` (200) |
| `cancelOcupacion(id, body)` | `POST /Ocupacion/{id}/cancelar` con `{ motivo }` | `undefined` (204) |
| `finalizeOcupacion(id, body)` | `POST /Ocupacion/{id}/finalizar`; el cuerpo es opcional y, si es `undefined`, no se manda | `undefined` (204) |

`listOcupaciones` verifica que la respuesta sea un arreglo y, si no, lanza `ApiError` con `code: "respuesta_invalida"`, igual que `normalizePaged`. **No se crean** `PUT /{id}/fin`, `POST /{id}/precio` ni `POST /ajuste-precio`: son de la 10, que suma sus funciones a este mismo archivo sin recrearlo (la que se ejecute segunda usa lo que encuentre). Se prueba con `vi.mock` de `http` (ruta, `params`, cuerpo).
*Motivo:* patrón uniforme de la 02; la pantalla deja de armar URLs a mano.
*Descartado:* seguir llamando a `http` desde la página: contradice D-FB14.

**D-FG3 (18/11/2026) — Confirmada. `src/api/clienteApi.js` con solo `listClientes`.** El alta y el filtro necesitan buscar clientes y no hay módulo de Cliente ni spec de Clientes. La 07 crea `src/api/clienteApi.js` con `listClientes({ q, activos, page, pageSize })` (`GET /Cliente`, devuelve `normalizePaged(data)`), como hizo la 04 con `usuariosApi.js`. **`Clientes.jsx` no se toca** (P-FB6). Si en el futuro hay una spec de Clientes, agrega sus funciones a este archivo.
*Motivo:* D-FB14 dice que cada spec crea el módulo de su recurso y esta es la primera que necesita el de Cliente.
*Descartado:* dejar `http.get("/Cliente")` en la página: dos copias más de lo mismo y contra D-FB14.

**D-FG4 (18/11/2026) — Confirmada. "Registrar pago" se queda en la 07; `pagosApi.js` solo suma `createPago`.** El pago se registra desde la ocupación (tarjeta y detalle) con un componente aparte, `RegistrarPagoDialog` (D-FG19). La 07 **no migra** `pagosApi.js`: agrega **una** función nueva y aditiva, `createPago(body)` (`POST /Pagos`, devuelve `data`, estilo D-FB14), y deja intacto el objeto `pagosApi` (lo usan `CajaDiaria.jsx` y la anulación). La 08 migra el archivo entero al estilo de funciones, adopta `createPago` y es dueña de la lista de pagos de la ocupación, el detalle, las devoluciones y la anulación.
*Motivo:* la 08 depende de la 07. Si el cobro saliera de la 07, entre un merge y otro se perdería la posibilidad de cobrar desde la pantalla. La función aditiva evita el conflicto de archivo con la 08 y la 09 (`getCajaDiaria`).
*Descartados:* (a) mover "Registrar pago" a la 08: regresión entre las dos specs; (b) que la 07 migre `pagosApi.js` completo: invade la 08 y la 09.

**D-FG5 (18/11/2026) — Confirmada. Límites con las otras specs.**

| Spec | Qué es de ella | Qué deja la 07 |
|---|---|---|
| 08 Pagos | Lista de pagos de la ocupación (`GET /Pagos/ocupacion/{id}`), detalle de pago, devoluciones, anulación, migración de `pagosApi.js` | `RegistrarPagoDialog`, `createPago` y una sección "Pagos" del detalle sin contenido, para que la monte la 08 |
| 09 Caja | Sesiones, `caja_cerrada` y `caja_dia_anterior_abierta` | Si el cobro da esos códigos, la 07 muestra el `title` del backend y no hace nada más |
| 10 Contratos mensuales | Ajuste de precio individual y en lote, baja programada | La sección "Contrato mensual" del detalle (solo MES) con `modoMes` y `fraccionMes` de solo lectura; la 10 agrega sus botones ahí |
| 05 Alertas | `getAlertLinks` y `/alertas-operativas?ocupacionId=N` | La 07 suma su línea a `getAlertLinks` con la firma `{ canTrazabilidad, canOcupaciones }` y una línea en `OperationalAlerts.jsx` (**contrato entre specs 05 ↔ 07**, aprobado el 18/11/2026) y un enlace "Ver alertas" en el detalle (D-FG14, D-FG15) |
| 06 Cocheras | `listCocheras` y `listCocherasDisponibles` | La 07 los usa; no los recrea |
| 11 Configuración | `/Configuracion` | La 07 no la lee (D-FG9) |

### 3.2 Fechas, errores, permisos y configuración

**D-FG6 (18/11/2026) — Confirmada. Fechas con `useTenantDates`.** Todo `datetime-local` se convierte con `localInputToInstant` y toda fecha que llega se muestra con `formatInstant` (zona del tenant). Los filtros por día usan `dateRangeToInstants` (el `hasta` de `/Ocupacion` es inclusivo). Una hora inexistente por cambio de horario se muestra con el mensaje de D-FB6 y no se envía. Nunca `Date` para formatear ni `toLocale*`. **La 07 reemplaza el `fmtDate` local y resuelve DV-FB2** de la 02: desde acá la pantalla envía y muestra en la zona del local. La "hora actual" para decidir la fase y los valores por defecto sale de `Date.now()` pasado como parámetro `now` a las funciones puras.

**D-FG7 (18/11/2026) — Confirmada. Errores por `code`, con el campo marcado.** Todos los `catch` llaman a `showApiError(e)` (que muestra el `title` del backend tal cual y devuelve el `ApiError`) y se acabaron `console.error` y `e.response.data.error`. Lo que la 07 agrega es qué hace la pantalla **después** del aviso. Para los formularios (alta, cancelar, finalizar, pago), además del aviso se marca el campo: `fieldErrorsFromApi(apiError)` (pura) convierte `apiError.errors` (claves en PascalCase, solo con `datos_invalidos`) a los campos del formulario; los códigos que no traen `errors` se asignan a un campo con `altaErrorField(code, form)`.

| `code` | Cuándo | Después del aviso |
|---|---|---|
| `datos_invalidos` | Cualquier formulario (400): `Inicio` (tolerancia, tope de pasado, techo de futuro), `Fin` (duración máxima), `MotivoRetroactivo`, `PrecioUnitarioExcepcional`, `Motivo`, `Monto`, etc. | Marca el campo con el primer mensaje de `errors`. Sin recarga: no cambió nada. **Excepción:** al finalizar, `errors.ResolucionExcedente` no abre un aviso: abre el paso de resolución, que muestra el `title` (D-FG18) |
| `operacion_invalida` | Regla de negocio sin campo (400) | Aviso. Sin recarga |
| `sin_permiso` e `inicio_retroactivo_sin_permiso` | Alta con inicio retroactivo o con tarifa excepcional sin el permiso: 403 `sin_permiso`. El 409 `inicio_retroactivo_sin_permiso` solo sale por una carrera de configuración (B1) y se trata igual | Marca "Inicio" (o el interruptor de tarifa excepcional si estaba activo). El diálogo queda abierto |
| `tarifa_no_configurada` | Alta sin tarifa vigente para el día del inicio (409) | Marca "Tipo". Con `can("tarifas.ver")`, el aviso suma un enlace "Ver tarifas" |
| `cochera_no_disponible`, `cochera_bloqueada` | Alta: otro usuario ocupó o bloqueó la cochera (409) | Marca "Cochera", vuelve a pedir las disponibles. El diálogo queda abierto |
| `cliente_inactivo` | Alta con un cliente dado de baja (409) | Marca "Cliente" |
| `ocupacion_no_encontrada` | Detalle o acción sobre una ocupación que ya no existe (404) | Recarga el listado y **cierra** el detalle |
| `ocupacion_no_activa`, `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_ya_iniciada`, `ocupacion_no_iniciada` | Finalizar, cancelar o cobrar con un estado que quedó viejo (409) | Cierra el diálogo de la acción y recarga listado y detalle |
| `pago_supera_saldo` | Registrar un pago mayor al saldo (409) | Recarga listado y detalle; el diálogo queda abierto con el saldo nuevo |
| `caja_cerrada`, `caja_dia_anterior_abierta` | Cobrar (409). Es de la 09 | Solo el aviso; el diálogo queda abierto |
| `sin_permiso` (resto) | Permisos cambiados a mitad de sesión | Aviso. Sin recarga |
| `servidor_ocupado`, `tiempo_agotado`, `sin_conexion` | Cualquier escritura | Aviso. El diálogo conserva lo escrito; el reintento es **manual**, nunca automático (una escritura no es idempotente) |
| Código desconocido o `undefined` | — | Aviso del `title`. Sin recarga |

`shouldReloadAfter(code)`, `shouldCloseDetailAfter(code)` y `altaErrorField(code, form)` son puras y están en `ocupaciones.js` (D-FG20). No se agregan entradas a `errorCodes.js`: un código desconocido ya es aviso y el texto es del backend (D-FA6). Cierra la "etapa 2 pendiente" de Ocupaciones del `CLAUDE.md`.
*Motivo:* el usuario ve el motivo real y el campo a corregir; en los códigos de estado viejo, recargar es lo que arregla la pantalla.
*Descartado:* mapear cada código a un texto propio: el `title` del backend es la referencia (D-FA6).

**D-FG8 (18/11/2026) — Confirmada. Permisos: se oculta, nunca se deshabilita, y se decide por permiso.** La ruta `/ocupaciones` exige `ocupaciones.ver` (ya está en `routes.js`). Todo se decide con `can(...)` (ARQ-4):

| Acción | Condición |
|---|---|
| "Nueva ocupación" | `ocupaciones.crear` |
| Interruptor "Tarifa excepcional" del alta | `ocupaciones.tarifa_excepcional` |
| Campo "Motivo del inicio retroactivo" | `ocupaciones.crear_retroactiva` y un inicio anterior al minuto actual (D-FG16) |
| "Finalizar" | `ocupaciones.finalizar` y fase `en_curso` o `vencida` |
| "Cancelar reserva" | `ocupaciones.cancelar` y fase `reserva` |
| "Registrar pago" | `pagos.registrar`, `saldo > 0` y ocupación no cancelada |
| "Ver trazabilidad" | `auditoria.ver` (regla 4 de D-FD5) |
| "Ver alertas" | `alertas.ver` |

Un AUDITOR ve todo y no tiene ningún botón de escritura. Un OPERADOR carga, finaliza y cancela, pero no ve el switch de tarifa excepcional ni el motivo retroactivo. La decisión de las tres acciones de la tarjeta está en `accionesDeOcupacion(o, now, can)` (pura). Extiende la tabla de D-FA10.

**D-FG9 (18/11/2026) — Confirmada. El cliente no valida configuración del tenant.** La 07 no lee `/Configuracion` (el OPERADOR no tiene `configuracion.ver`) y **no** valida tolerancia de inicio, tope de pasado, techo de futuro ni duración máxima por tipo (HORA 7 días, DÍA 90 días, MES 3 años). Esos 400 llegan del backend en el campo `Inicio` o `Fin` y se muestran con el `title` y el campo marcado (D-FG7). Un test fija que un inicio de hace un año y un fin a diez años pasan la validación del cliente.
*Motivo:* una sola autoridad; copiar los topes en el cliente los dejaría desactualizados al primer cambio de configuración.

### 3.3 Fase y listado

**D-FG10 (18/11/2026) — Confirmada. La "fase" de una ocupación, derivada en el cliente.** El backend tiene `estado` (ACTIVA, CANCELADA, FINALIZADA) y `estadoCalculado` (suma VENCIDA), pero ninguno distingue una reserva de una ocupación en curso. `ocupacionFase(o, now)` (pura) devuelve:

| Fase | Condición (con `e = estadoCalculado ?? estado`) | Chip |
|---|---|---|
| `cancelada` | `e` es CANCELADA | `labelOf` y `colorOf` de `EstadoOcupacion` |
| `finalizada` | `e` es FINALIZADA | ídem |
| `vencida` | `e` es VENCIDA | ídem (`warning`) |
| `reserva` | `e` es ACTIVA y `inicio > now` | "Reserva", `secondary` (color propio: no existe en el enum del backend) |
| `en_curso` | `e` es ACTIVA y `inicio <= now` | "En curso", color de ACTIVA (`success`) |

"Reserva" usa `secondary` y no `info` porque `FINALIZADA` ya usa `info` en `enums.js` y los dos chips conviven en el mismo listado; la paleta definitiva sale del diseño nuevo. El límite es estricto (`inicio > now`). El reloj es el del navegador: una diferencia de segundos con el servidor es aceptable, porque el backend valida al finalizar (`ocupacion_no_iniciada`). La fase no se envía nunca a la API.
*Motivo:* pedido del desarrollador (distinguir una reserva de una ocupación en curso); las acciones disponibles dependen de la fase.
*Descartados:* (b) pestañas "En curso | Reservas | Historial": más claro, pero parte la lista y duplica los filtros; (c) solo texto sin chip: no se ve de un vistazo.

**D-FG11 (18/11/2026) — Confirmada. Carga y filtros del listado.**
- **Por defecto: "Activas"** (en curso, reservas y vencidas). Como en el backend `estado=ACTIVA` **no** incluye las vencidas (B5), "Activas" se resuelve con **dos pedidos en paralelo** (`estado = ACTIVA` y `estado = VENCIDA`) cuyos resultados se unen con `mergeOcupaciones` (ordena por `inicio` descendente y `id` descendente, y corta a la cantidad pedida). Es una decisión técnica; la alternativa (un pedido sin `estado` y filtrar en el cliente) trae finalizadas y canceladas y gasta el `take`. El selector "Estado" ofrece Activas, Vencidas, Finalizadas, Canceladas y Todas (hoy falta Finalizadas); "Reservas" es una opción más del selector y manda `estado = ACTIVA` y `desde = ahora` (el backend filtra `Inicio >= desde`); si además hay un "Inicio desde", se manda el más tardío de los dos. "Vencidas" manda `estado = VENCIDA` y "Todas" no manda `estado`. Con "Vence en (días)" cargado, "Activas" hace **un solo** pedido (`ACTIVA`), porque ese filtro excluye las vencidas.
- **Cochera:** un `select` con `listCocheras()` (06), rotulado "Cochera #número" y con el **id** como valor (hoy se escribe el id interno a mano). Si la lista falla, el filtro queda deshabilitado, sin aviso (la pantalla no depende de él).
- **Cliente:** `ClienteAutocomplete` (un solo componente para el filtro y el alta, con el temporizador de 300 ms y el descarte de respuestas viejas adentro).
- **Rango de días:** "Inicio desde" y "Fin hasta" como `<input type="date">` (días en la zona del tenant). Mandan `dateRangeToInstants(desde, hasta)`: `desde` filtra por `Inicio` y `hasta` por `Fin`, inclusivo (inventario, sección 5). No es un filtro de solapamiento y **con "Fin hasta" las ocupaciones abiertas (sin fin) quedan excluidas**: el campo lo dice en su texto de ayuda. Si "Inicio desde" es posterior a "Fin hasta": "La fecha 'Desde' no puede ser posterior a 'Hasta'", sin pedido.
- **"Vence en (días)":** entero de 0 o más; vacío se omite. Muestra las activas con fin entre ahora y dentro de N días: **excluye las vencidas y las abiertas** (B5), y el texto de ayuda lo dice.
- **Cantidad máxima:** `select` con 50, 100, 200 (defecto) y 500 (el tope del backend, que recorta en silencio), en vez del texto libre.
- **"Aplicar"** carga; **"Limpiar"** vuelve a los valores por defecto y carga. Los pedidos los arma `buildListQueries(filters, { timeZone, now })` (pura; devuelve uno o dos conjuntos de `params`).
- **Resultado truncado.** El backend no pagina y no devuelve el total. Si **alguno** de los pedidos trae tantas filas como la cantidad pedida, se muestra "Mostrando las primeras N. Puede haber más: refiná los filtros" (`isTruncated`). El resumen conserva "Resultados: N" y "Vencidas: M".
- **Orden:** el de la API, `Inicio` descendente (B5); solo "Activas" reordena en el cliente al unir sus dos pedidos.
- **Carga:** si falla, la pantalla muestra "No pudimos cargar las ocupaciones" con "Reintentar", no una lista vacía; las respuestas viejas se descartan (el efecto ignora lo que llega después de un pedido más nuevo). Después de **cualquier** escritura se recarga el listado (los saldos y estados los calcula el backend).
*Motivo:* "Activas" es el conjunto operativo y acotado; el rango sin paginar y sin total del backend obliga a avisar el truncado.
*Descartados:* (b) "Todas" de los últimos 30 días: crece sin tope y se trunca con orden sin confirmar; (c) solo "en curso", sin reservas: el backend no filtra "ya empezó", habría que filtrar en el cliente sobre una lista posiblemente truncada.

**D-FG12 (18/11/2026) — Confirmada. Contenido de la tarjeta.** Primera línea: "Cochera #número" (`cocheraNumero`), chip de fase (D-FG10) y chip de tipo (`labelOf(TipoOcupacion)`). Segunda: "Cliente: nombre". Fechas según la fase: **reserva** "Empieza dd/mm/yyyy HH:mm"; las demás "Inicio …" y, si hay, "Fin …" o "Sin hora de fin" (abierta); las finalizadas suman "Fin real …" si `finReal` tiene valor. Tercera, la cuenta, con `formatMoney` y los rótulos de `cuentaRotulos(o)` (pura, según B4): el tope se rotula **"Total del contrato"** si la ocupación tiene fin, **"Hasta ahora (unidad en curso)"** si es abierta, y **"Total"** si está finalizada (ahí el tope es `precioTotal`); en una cancelada no se muestra el tope. Después, "Pagado" y "Saldo". El front no calcula ninguna cifra (hoy `precioTotal` nulo se muestra `$ 0,00`, falso). Acciones, por `accionesDeOcupacion`: "Ver", "Registrar pago", "Finalizar" y "Cancelar reserva" (el "Cancelar" de hoy se renombra).

### 3.4 Detalle y enlaces

**D-FG13 (18/11/2026) — Confirmada. Detalle de la ocupación.** "Ver" abre un diálogo grande sobre el listado, que carga `getOcupacion(id)` (con esqueletos; si falla, el mensaje con "Reintentar" y "Cerrar"). Secciones:
1. **Cabecera:** "Ocupación #id", chip de fase, tipo y "Cochera #número".
2. **Cliente:** nombre, documento y teléfono (los manda el backend a quien tiene `ocupaciones.ver`).
3. **Período:** inicio (o "Empieza" si es reserva), fin o "Sin hora de fin", y fin real si lo hay.
4. **Tarifa:** `precioUnitarioAplicado` con `formatMoney`; si `esTarifaExcepcional`, chip "Tarifa excepcional" y el `motivoTarifaExcepcional`.
5. **Cuenta:** Total ("A definir al finalizar" si `precioTotal` es nulo), el tope con el rótulo de `cuentaRotulos` (D-FG12; una **vencida** suma "No incluye la demora hasta que se finalice"), Pagado (neto de devoluciones), Saldo y, si `saldoAFavor > 0`, un chip "Saldo a favor $ X". En una **finalizada o cancelada** con `saldoAFavor > 0` se muestra además el aviso "Hay un saldo a favor pendiente de devolver; se registra desde Pagos" (el backend crea la alerta `DEVOLUCION_PENDIENTE`; la acción es de la 08). En una activa, `saldoAFavor` puede ser 0 aunque después aparezca un excedente: no se usa para anticiparlo (D-FG18).
6. **Contrato mensual** (solo MES): `modoMes` y `fraccionMes` con `labelOf`, rotulados "congelados al crear". **Sin acciones**: la 10 agrega ahí el ajuste de precio y la baja programada.
7. **Pagos:** sección sin contenido; la monta la 08.
8. **Enlaces** (D-FG15) y las acciones de la fase (D-FG8): "Registrar pago", "Finalizar", "Cancelar reserva".

Después de cualquier escritura se recarga el detalle abierto. El detalle **no** guarda nada en el navegador (ARQ-1).

**D-FG14 (18/11/2026) — Confirmada. URL para abrir una ocupación desde otra pantalla y su línea en `getAlertLinks`.**
- **Contrato:** `/ocupaciones?id=N` (`N` entero positivo). Al montarse, la pantalla lee `id` con `useSearchParams` y abre el detalle de esa ocupación sobre el listado. Un `id` que no es un entero positivo se ignora. "Ver" y el cierre del detalle actualizan el query con `replace` (el cierre quita `id`): así "atrás" no reabre el detalle y el enlace sigue siendo compartible. No hay otros filtros en la URL.
- **Helper:** `buildOcupacionPath(id)` y `parseOcupacionId(search)` en `src/utils/ocupacionLink.js` (puros, con Vitest). Se enlaza siempre con el helper, nunca con un string armado a mano. `OCUPACIONES_PATH` se exporta desde `src/auth/routes.js` (como `TRAZABILIDAD_PATH` de la 04) y la entrada de `PRIVATE_ROUTES` la usa.
- **Alertas (P-FE1 de la 05):** `getAlertLinks(alerta, { canTrazabilidad, canOcupaciones })` suma una línea: si `alerta.ocupacionId` tiene valor y `canOcupaciones` (`can("ocupaciones.ver")`), agrega un enlace "Ver ocupación" a `buildOcupacionPath(alerta.ocupacionId)`. `OperationalAlerts.jsx` pasa el flag nuevo y el texto "Ocupación 12" pasa a ser ese enlace. **Esto toca una línea de la 05, ya aprobada**; aprobado el 18/11/2026 (P-FG3). La forma exacta del objeto de enlace es la que tenga `getAlertLinks` en `develop` (P-FG-L5).

**D-FG15 (18/11/2026) — Confirmada. Enlaces desde el detalle.** "Ver trazabilidad": `<Link to={buildTrazabilidadPath({ ocupacionId })}>` de `src/utils/trazabilidadLink.js`, **solo con `can("auditoria.ver")`**, nunca armando el texto a mano. "Ver alertas": un enlace a `/alertas-operativas?ocupacionId=N` (contrato de D-FE6), solo con `can("alertas.ver")`; la ruta de alertas se toma de `routes.js` y el query lo arma una función de `ocupacionLink.js` (si la 05 exporta un helper, se usa ese).

### 3.5 Escritura

**D-FG16 (18/11/2026) — Confirmada. Alta de ocupación: un diálogo, con modo derivado.** Con `ocupaciones.crear`, "Nueva ocupación" abre un diálogo con:
- **Tipo** (`optionsOf(TipoOcupacion)`).
- **Cliente** (`ClienteAutocomplete`).
- **Inicio** (`datetime-local`). Por defecto, el minuto actual en la zona del local (`instantToInput`).
- **"Sin hora de fin"** (casilla): tildada por defecto en Hora y Mes, destildada en Día. Al cambiar de tipo se aplica el valor por defecto solo si el usuario no tocó la casilla. Tildada, `fin` se **omite** del cuerpo (ocupación abierta); destildada, aparece **Fin** (`datetime-local`).
- **Cochera:** un `select` con las **disponibles**, que se vuelve a pedir (con 400 ms de espera y descartando respuestas viejas) cuando cambian inicio, fin o sin-fin, con `listCocherasDisponibles({ desde, hasta })` de la 06. El rango lo arma `disponiblesRange(form, tz)` (pura): `desde` es el inicio y `hasta` el fin, o, en una abierta, el inicio más `OPEN_HORIZON_DAYS` (3650 días). El backend lo confirma (B6): el solape de una abierta es `[inicio, ∞)` y, como el techo futuro es de 24 meses como mucho, 10 años detecta todas las reservas; el 409 del alta queda como respaldo. Si la cochera elegida deja de estar en la lista, se limpia y el diálogo lo avisa. Lista vacía: "No hay cocheras disponibles para ese horario".
- **Una etiqueta** derivada de lo cargado (`altaModo`): "Reserva: empieza el dd/mm/yyyy HH:mm" si el inicio es futuro; "Ocupación abierta desde …" si no hay fin; "Ocupación del … al …" en los demás casos.
- **Tarifa excepcional:** un interruptor, **solo con `ocupaciones.tarifa_excepcional`**. Activo, muestra "Precio unitario" y "Motivo" obligatorios.
- **Motivo del inicio retroactivo:** un campo de texto (tope 250), **solo con `ocupaciones.crear_retroactiva`** y cuando el inicio es anterior al minuto actual o cuando el backend ya marcó ese campo (`showMotivoRetroactivo`, pura). El front no sabe cuál es la tolerancia, así que su texto de ayuda dice "Obligatorio si el inicio supera la tolerancia del local" y **no se exige en el cliente**: si falta, el backend responde 400 con `errors.MotivoRetroactivo` y el campo se muestra solo (D-FG7). Dentro de la tolerancia el backend lo ignora, así que mandarlo no hace daño (B7). Un usuario sin ese permiso no lo ve; si carga un inicio retroactivo, el backend lo rechaza y el aviso con el `title` queda en "Inicio" (D-FG7).

`validateAltaForm(form, { timeZone, now, can })` (pura) valida y arma el cuerpo:

| Campo | Regla | Mensaje |
|---|---|---|
| `cocheraId` | Obligatorio | "Elegí una cochera" |
| `cliente` | Obligatorio | "Elegí un cliente" |
| `inicio` | No vacío y real (`localInputToInstant`) | "Ingresá el inicio" o el de la hora inexistente (D-FB6) |
| `fin` | Si no es abierta: obligatorio y posterior al inicio, comparando los dos instantes | "Ingresá el fin o marcá «Sin hora de fin»" / "El fin debe ser posterior al inicio" |
| Precio excepcional | `^\d+(\.\d{1,2})?$`, mayor que 0 y hasta 10.000.000 (límites del backend para este campo) | "Ingresá un precio con hasta 2 decimales" / "El precio debe ser mayor a 0" / "El precio no puede superar $ 10.000.000" |
| Motivo excepcional | Obligatorio (`trim`) cuando el interruptor está activo, y 250 como máximo (el DTO no lo limita pero la columna sí: sin tope, un texto largo da 500; PB-8) | "Contanos el motivo de la tarifa excepcional" / "El motivo no puede superar 250 caracteres" |
| Motivo retroactivo | Si hay texto: 250 como máximo | "El motivo no puede superar 250 caracteres" |

El cuerpo lleva `cocheraId`, `clienteId`, `tipo`, `inicio` y `usarTarifaExcepcional` siempre; `fin` solo si no es abierta; `precioUnitarioExcepcional` y `motivoTarifaExcepcional` solo con la excepcional activa **y** el permiso; `motivoRetroactivo` solo si hay texto y el permiso. **Nunca se valida** tolerancia, pasado, futuro ni duración (D-FG9). Éxito (200 con `OcupacionResponse`, B8): aviso "Ocupación creada", cierre y recarga; no se muestra ningún estimado antes de crear, el `topeDeCobro` ya calculado se ve en el listado. El botón "Crear" queda deshabilitado mientras envía.
*Motivo:* pedido del desarrollador (abierta, retroactiva, futura y excepcional); un solo diálogo evita tres flujos para mantener.
*Descartados:* (b) tres botones de entrada ("Ingreso ahora", "Reserva", "Carga retroactiva"): más claro, pero tres flujos para mantener; (c) un asistente por pasos: más clics para algo que se hace seguido en el mostrador; (d) pedir la configuración para mostrar el motivo solo cuando corresponde: el OPERADOR no puede leerla.

**D-FG17 (18/11/2026) — Confirmada (con B2 incorporada). Cancelar reserva.** "Cancelar reserva" (antes "Cancelar") se ofrece solo en la fase `reserva` y con `ocupaciones.cancelar`. El diálogo pide **solo el motivo** (obligatorio, con `trim`) y avisa "La cochera queda libre para ese horario". **Se retira `finReal`** del formulario y del cuerpo, que queda `{ motivo }`: el backend lo ignora (B2) y así lo hacía la rama `wip/ocupaciones-reservas`. El backend solo cancela ACTIVAS con `inicio > ahora`; una ocupación en curso o vencida **se finaliza**, no se cancela (`ocupacion_ya_iniciada`). El motivo es obligatorio (con `trim`) y de **250 caracteres como máximo en el cliente** (el backend no lo limita; PB-9). **Si la reserva tiene pagos** (`pagado > 0` de la fila o del detalle), el diálogo avisa antes de confirmar: "Tiene $ X pagados. Al cancelar queda una devolución pendiente; se registra desde Pagos" (el backend deja `saldoAFavor` y crea la alerta `DEVOLUCION_PENDIENTE`; la acción es de la 08). Éxito (204): "Reserva cancelada" (con el mismo recordatorio si había pagos). `buildCancelBody(motivo)` (pura).

**D-FG18 (18/11/2026) — Confirmada ("reaccionar al 400", aprobada el 18/11/2026). Finalizar, con la cuenta a la vista y la resolución del excedente.** "Finalizar" se ofrece en las fases `en_curso` y `vencida`, con `ocupaciones.finalizar`. El diálogo carga `getOcupacion(id)` (datos frescos, no la fila de la lista) y muestra la **cuenta** (D-FG13, sección 5).
- **Siempre se finaliza primero sin `resolucionExcedente`** (cuerpo vacío). El excedente de un mensual **no se puede conocer antes de finalizar** (B3: `saldoAFavor` del detalle es `max(pagado − tope, 0)` y, con fin, el tope es el contrato entero, no lo devengado), así que el cliente no lo anticipa.
- **Hora y Día:** confirmación simple ("Se finaliza la ocupación de la cochera #N. El total se calcula al finalizar"). Si hay excedente, el backend fuerza `DEVOLVER` y crea la alerta por su cuenta.
- **Mes:** si el backend responde **400 `datos_invalidos` con `errors.ResolucionExcedente`** (`needsResolutionError(apiError)`, pura), **no se muestra toast**: el diálogo pasa, sin cerrarse, al paso "Resolver el excedente" y muestra el **`title` del backend tal cual**, que trae los montos (lo pagado y lo que corresponde hasta la salida). **No se parsea el texto** (PB-7 pide el monto en un campo propio).
- **Paso "Resolver el excedente":** dos opciones, **ninguna preseleccionada**: "Cobrar completo" (`COBRAR_COMPLETO`: el excedente no se devuelve y queda como total; **motivo obligatorio**, 250 como máximo; el backend marca `errors.Motivo`) y "Devolver" (`DEVOLVER`; motivo opcional, 250 como máximo). El botón confirma con el texto de la opción elegida y **reenvía el finalizar** con `{ resolucionExcedente, motivo? }` (`buildFinalizarBody`, pura).
- **Éxito (204):** "Ocupación finalizada", cierre del diálogo y recarga. Si se eligió `DEVOLVER`, se agrega: "Quedó una devolución pendiente; registrala desde Pagos". `DEVOLVER` **no** crea la devolución (B3): deja la ocupación FINALIZADA y crea la alerta `DEVOLUCION_PENDIENTE`; la devolución se registra con `POST /Pagos/{id}/devoluciones`, que es de la 08. Tras recargar, el detalle muestra el chip de saldo a favor (D-FG13). Si queda saldo y hay `pagos.registrar`, ofrece "Registrar pago" (D-FG19).
- Los botones quedan deshabilitados mientras envía; no se reintenta solo.
*Motivo:* el excedente de un mensual es plata y no hay forma fiable de calcularlo antes en el cliente; intentar y leer el 400 es la única vía correcta y no duplica la regla de cobro.
*Descartados:* (b) preguntar siempre en un mensual con pagos: fricción cuando no hay excedente; (c) `DEVOLVER` por defecto: decide dinero sin que el usuario lo vea; (d) anticiparlo con `saldoAFavor`: no es lo devengado hoy.

**D-FG19 (18/11/2026) — Confirmada. Registrar pago.** Componente aparte, `RegistrarPagoDialog`, usado desde la tarjeta y el detalle. Campos: **Monto** (precargado con el saldo; `^\d+(\.\d{1,2})?$`, mayor que 0 y hasta 10.000.000, los límites del backend), **Método** (`optionsOf(MetodoPago)`, Efectivo por defecto) y **Referencia** (opcional; hoy se llama "Comentario" pero el campo de la API es `referencia`). Cuerpo: `{ ocupacionId, monto, metodo, referencia? }` (la referencia se omite si está vacía). **No se compara el monto con el saldo en el cliente**: si se pasa, el backend da `pago_supera_saldo` (D-FG7). Visible con `pagos.registrar`, `saldo > 0` y ocupación no cancelada (la regla de hoy, con los enums; B9 la confirma: una reserva y una vencida aceptan pagos hasta el tope, una cancelada da 409 `ocupacion_cancelada` y una finalizada sin saldo ya queda fuera por `saldo > 0`). Éxito (201): "Pago registrado", cierre y recarga de listado y detalle. Usa `createPago` (D-FG4).

### 3.6 Código y retiro de copias

**D-FG20 (18/11/2026) — Confirmada. Lógica pura en `src/utils/ocupaciones.js` y `src/utils/ocupacionLink.js`, probada con Vitest.** `ocupaciones.js` exporta: `ocupacionFase`, `faseChip`, `cuentaRotulos`, `accionesDeOcupacion`, `buildListQueries`, `mergeOcupaciones`, `isTruncated`, `OPEN_HORIZON_DAYS`, `defaultAltaForm`, `altaModo`, `disponiblesRange`, `showMotivoRetroactivo`, `validateAltaForm`, `buildCancelBody`, `needsResolutionError`, `buildFinalizarBody`, `validatePago`, `fieldErrorsFromApi`, `altaErrorField`, `shouldReloadAfter` y `shouldCloseDetailAfter`. Sin React ni estado; `now`, la zona y `can` son parámetros explícitos (ningún test depende de la hora ni de la zona del sistema). `ocupacionLink.js` exporta `buildOcupacionPath` y `parseOcupacionId`. Las pantallas y los diálogos solo orquestan estado y MUI.
*Motivo:* regla D-FA4 y principio de la 02: lo que no puede romperse tiene un test, y esta pantalla tiene las reglas de más plata del sistema.

**D-FG21 (18/11/2026) — Confirmada. Retiro de copias y de la excepción de lint; componentes.** `Ocupaciones.jsx` retira `ESTADOS`, `TIPOS`, `METODOS_PAGO`, `money`, `fmtDate`, `estadoLabel`, `tipoLabel`, el `EstadoChip` local, las llamadas a `http` y los `toast.error` con `e.response.data.error`. Usa `labelOf`/`colorOf`/`optionsOf` de `enums.js` (`EstadoOcupacion`, `TipoOcupacion`, `MetodoPago`, `ModoMes`, `FraccionMes`, `ResolucionExcedente`), `formatMoney`, `useTenantDates` y los módulos de API. Se saca la excepción de `Ocupaciones.jsx` de `eslint.config.js` (D-FB9, tabla 5.4 de la 02). El arreglo mínimo de D-FB10 queda reemplazado. Los diálogos y el selector de cliente van en componentes aparte (sección 5.1), de modo que `Ocupaciones.jsx` queda como orquestador del listado y del query `?id=`. **Cambios visibles:** las fechas pasan a la zona del local y con año; las etiquetas pasan de "ACTIVA / HORA / DIA" a "Activa / Hora / Día"; un total nulo muestra "—"; "Cancelar" pasa a "Cancelar reserva". En `CLAUDE.md` se corrige solo la frase que dice que `Ocupaciones.jsx` aún usa su propio manejo de errores y muestra todas las acciones (paso 7); **no** se toca la línea "Backend endpoints used".

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FG1 | Spec 02, D-FB10 y DV-FB2 | `Ocupaciones.jsx` envía en la zona del tenant pero muestra en la del navegador hasta la 07 | La 07 muestra y envía en la zona del tenant | Es la spec que reescribe la página | — |
| DV-FG2 | Spec 05, D-FE10 | `getAlertLinks(alerta, { canTrazabilidad })` | La 07 suma `canOcupaciones` y la línea de Ocupación | P-FE1 lo reserva a la 07 | — |
| DV-FG3 | Rama `wip/ocupaciones-reservas` | Cancelar sin `finReal`, `puedeCancelar` y `puedeFinalizar` | Se retoma la idea con `accionesDeOcupacion` y `buildCancelBody` (D-FG8, D-FG17) | El código de la rama no se reutiliza: se rediseña sobre `develop` | — |

### 4.2 Pendientes

**Dudas del backend B1 a B9: cerradas (18/11/2026).** El Orquestador las relevó del código y quedaron en la sección 2.2; se incorporaron en D-FG7, D-FG11 a D-FG13 y D-FG16 a D-FG19. Quedan estas consecuencias:

| Id | Pendiente | Paso |
|---|---|---|
| PB-7 (Media) | El 400 de finalizar con excedente trae el monto solo en el `title`. Pedir que lo traiga en un campo propio (extensions de `ProblemDetails`: `pagado`, `totalALaSalida`, `excedente`). El front muestra el `title` tal cual y no lo parsea (D-FG18) | — |
| PB-8 (Media) | Agregar `[MaxLength(250)]` a `motivoTarifaExcepcional` en `OcupacionRequest`: la columna es de 250 y hoy un texto más largo probablemente da 500. El front limita a 250 (D-FG16) | — |
| PB-9 (Baja) | Limpiar cancelar: sacar o usar `finReal` (se acepta, se ignora y tiene un comentario engañoso) y ponerle tope al motivo. El front no manda `finReal` y limita el motivo a 250 (D-FG17) | — |
| PB-10 (Baja) | `/Ocupacion` recorta `take` a 500 sin avisar y no tiene total ni paginación, así que el front no sabe si faltan resultados (D-FG11); y `saldoAFavor` no está en `OcupacionListItem` | — |

**Del desarrollador o de otras specs (no frenan la ejecución).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FG1 | **Cerrado (18/11/2026).** El excedente no se conoce antes de finalizar (B3): se resolvió con "reaccionar al 400" (D-FG18) y el pedido PB-7 | — |
| P-FG2 | **Sin paginación en el listado** (tope 500): si un local acumula más ocupaciones activas, pedir paginación al backend | — |
| P-FG3 | **Cerrado (18/11/2026).** Contrato entre specs 05 ↔ 07 aprobado: `getAlertLinks` con `{ canTrazabilidad, canOcupaciones }` y una línea en `OperationalAlerts.jsx` (D-FG14) | — |
| P-FG4 | **08:** aceptar `createPago` y la sección "Pagos" del detalle (D-FG4, D-FG5). **10:** aceptar la sección "Contrato mensual" y que sus funciones se sumen a `ocupacionApi.js` | — |
| P-FG5 | **06:** el historial de una cochera podría enlazar a `/ocupaciones?id=N` (el id del ítem es el de la ocupación). La 06 ya está aprobada: se decide después | — |
| P-FG6 | Abrir el alta con la cochera ya elegida desde Cocheras (`/ocupaciones?nueva=1&cocheraId=N`). Sin pedido | — |
| P-FG7 | **Datos de prueba** para verificar: una reserva futura, una ocupación vencida, un mensual con pagos mayores a lo que corresponde, una retroactiva y una con tarifa excepcional. Con `encargado@demo.test` se prueban la retroactiva y la excepcional; con `operado@demo.test`, que no se ofrecen | 3 a 6 |
| P-FG8 | Moneda por tenant (P-FB3): `formatMoney` fija `UYU` | — |

**Locales, el ejecutor los resuelve y los informa.**

| Id | Qué verificar | Qué hacer según el resultado |
|---|---|---|
| P-FG-L1 | Que existan en `develop` la 02, la 04, la 05 y la 06 con sus piezas por nombre: `useTenantDates` (con `localInputToInstant`, `instantToInput`, `formatInstant`, `dateRangeToInstants`), `cleanParams`, `normalizePaged`, `enums.js` (`EstadoOcupacion`, `TipoOcupacion`, `MetodoPago`, `ModoMes`, `FraccionMes`, `ResolucionExcedente`), `formatMoney`, `formatNumber`, `buildTrazabilidadPath`, `getAlertLinks` y `cocheraApi.js` (`listCocheras`, `listCocherasDisponibles`) | Si falta algo, **frenar** y avisar al Orquestador: no se implementa nada de las otras specs desde acá |
| P-FG-L2 | La forma real de `today` en `useTenantDates()` y la firma de `ApiError` (`{ status, code, message, errors, traceId, response }`) | Ajustar el uso a lo que exista y anotarlo |
| P-FG-L3 | Que `tipo`, `estado` y `estadoCalculado` lleguen como **enteros** en `/Ocupacion` y `/Ocupacion/{id}`, y que `OcupacionDetalle` traiga `estadoCalculado` | Si llegan como texto, **frenar** (cambia `enums.js`). Si el detalle no trae `estadoCalculado`, usar `estado` y anotarlo |
| P-FG-L4 | Que `eslint.config.js` tenga la excepción de `Ocupaciones.jsx` creada por la 02 | Si tiene otro formato, retirarla igual y anotarlo |
| P-FG-L5 | La firma y la forma del objeto de enlace de `getAlertLinks` en `develop`, y cómo `OperationalAlerts.jsx` la llama | Sumar la línea de Ocupación con esa forma y anotarlo. Si la forma obliga a rehacer la 05, **frenar** |
| P-FG-L6 | Que `GET /Cochera/disponibles` acepte el `hasta` de una abierta (`inicio + 3650 días`) sin error (B6 dice que sí) | Si da 400, **frenar** y avisar |
| P-FG-L7 | Que el 400 de finalizar sin resolución traiga `errors.ResolucionExcedente` (B3) y el de cobrar completo sin motivo, `errors.Motivo`, con el backend en `develop` | Si el campo o el `code` difieren, **frenar** y avisar: cambia `needsResolutionError` |

**Abiertos del proyecto que esta spec no toma:** P-19, P-29, P-33, P-2 y P-9 (heredados de la 01), P-FB3 (moneda por tenant).

## 5. Inventario

Rutas relativas a la raíz del repo del frontend. Los nombres de archivo son los que fija esta spec; el ejecutor no los cambia.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Módulo de API de ocupaciones | `src/api/ocupacionApi.js` | D-FG2 |
| Módulo de API de clientes (solo `listClientes`) | `src/api/clienteApi.js` | D-FG3 |
| Lógica pura de ocupaciones | `src/utils/ocupaciones.js` | D-FG7 a D-FG20 |
| Enlace a una ocupación (puro) | `src/utils/ocupacionLink.js` | D-FG14, D-FG15 |
| Selector de cliente | `src/componentes/ClienteAutocomplete.jsx` | D-FG11, D-FG16 |
| Diálogos | `src/componentes/ocupaciones/OcupacionDetalleDialog.jsx`, `AltaOcupacionDialog.jsx`, `FinalizarOcupacionDialog.jsx`, `CancelarReservaDialog.jsx`, `RegistrarPagoDialog.jsx` | D-FG13, D-FG16 a D-FG19 |
| Tests | `test/unit/utils/ocupaciones.test.js`, `test/unit/utils/ocupacionLink.test.js`, `test/unit/api/ocupacionApi.test.js`, `test/unit/api/clienteApi.test.js`, `test/unit/api/pagosApi.test.js` | D-FG2 a D-FG4, D-FG20 |
| Manual de esta spec | `docs/manual/frontend/07-ocupaciones.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `src/pages/Ocupaciones.jsx` | Reescritura: listado, filtros, tarjetas, query `?id=`, diálogos; retira las copias | D-FG6 a D-FG21 |
| `src/api/pagosApi.js` | Suma `createPago(body)`; el objeto `pagosApi` queda intacto | D-FG4 |
| `src/auth/routes.js` | Exporta `OCUPACIONES_PATH` y la entrada de `/ocupaciones` la usa | D-FG14 |
| `src/utils/alertas.js` y `test/unit/utils/alertas.test.js` | `getAlertLinks` suma `canOcupaciones` y el enlace "Ver ocupación" | D-FG14 |
| `src/pages/OperationalAlerts.jsx` | Pasa `canOcupaciones` a `getAlertLinks` y muestra el enlace | D-FG14 |
| `eslint.config.js` | Se retira la excepción de `Ocupaciones.jsx` | D-FG21 |
| `CLAUDE.md` | Solo la frase sobre Ocupaciones en "Pages…" (no la línea "Backend endpoints used") | D-FG21 |
| `docs/specs/README.md` | Fila 07: estado y "Depende de" `02, 04, 05, 06` (lo actualiza el Orquestador al aprobar; el ejecutor la pasa a "Terminada" al cerrar) | Metodología |

### 5.3 Se borran

Nada. (`Ocupaciones.jsx` queda con el mismo nombre y ruta.)

### 5.4 No se tocan

`src/api/http.js`, `src/api/errors.js`, `src/constants/errorCodes.js` (D-FG7), `src/utils/fechas.js`, `src/constants/enums.js`, `src/api/cocheraApi.js` (lo usa, no lo cambia), `src/pages/Clientes.jsx`, `src/pages/CajaDiaria.jsx` y el resto de `pagosApi.js` (08 y 09), `src/pages/Cocheras.jsx` (P-FG5), `src/pages/Tarifas.jsx`.

## 6. Pasos

**Regla de ruteo (obligatoria).** El ejecutor **no corre comandos de terminal** y **no le pregunta nada al usuario** en su chat. Todo pasa por el chat "Orquestador" (`SendMessage`): los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, las dudas sobre el backend y las decisiones que la spec no prevé. Después espera su respuesta. Las dudas del backend las releva el Orquestador en el código: el ejecutor no supone reglas de negocio.

**Reglas de todos los pasos.**
- Un paso por vez, un commit por paso, en `feature/front-ocupaciones` (creada desde `develop`; nunca se trabaja sobre `develop`). Al cerrar cada uno: `npm run lint` y `npm run build` sin errores y `npm test` en verde (los comandos los corre el usuario, pedidos por el Orquestador), el paso tildado en esta spec, el manual al día y el commit confirmado por el Orquestador.
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- Si un paso obliga a decidir algo que esta spec no prevé, **se frena, se anota en la sección 4 y se avisa al Orquestador**. Lo único que el ejecutor resuelve solo es P-FG-L2 y P-FG-L4, con la regla que cada uno fija.
- Antes del PR: rebase sobre `develop`. Un conflicto en `eslint.config.js` entre excepciones de distintas specs es trivial: se conservan las de las páginas que siguen sin migrar.

### Paso 0 — Precondiciones y worktree

- [ ] **0.1** Confirmar que la 02, la 04, la 05 y la 06 están mergeadas en `develop` y resolver **P-FG-L1**. Si no, frenar.
- [ ] **0.2** Pedir al Orquestador el comando, desde `parkingcontrol-front`: `git worktree add ../parkingcontrol-front-ocupaciones -b feature/front-ocupaciones develop`. En el worktree, copiar el `.env` (no está versionado) y `npm install`. Resolver P-FG-L2 a P-FG-L6.
- [ ] **0.3** Leer la sección 2.2 (relevamiento del backend) y comprobar con el Orquestador que sigue vigente: si el backend cambió desde el 18/11/2026, se pide un relevamiento nuevo **antes** del paso 1.

  *Aceptación:* en el worktree, `npm test`, `npm run lint` y `npm run build` pasan antes de cambiar nada.

### Paso 1 — Lógica pura

- [ ] **1.1** Crear `src/utils/ocupaciones.js` con las funciones de D-FG20 y `test/unit/utils/ocupaciones.test.js`.
- [ ] **1.2** Crear `src/utils/ocupacionLink.js` y `test/unit/utils/ocupacionLink.test.js`.

  *Aceptación:* `npm test` pasa con estos casos (`tz = America/Montevideo`, UTC−3, y `now = 2026-11-18T15:00:00.000Z`, o sea las 12:00 locales del 18/11; `can` es una función sobre un conjunto de permisos):

  | # | Caso | Resultado esperado |
  |---|---|---|
  | 1 | `ocupacionFase` con ACTIVA, `estadoCalculado` ACTIVA e `inicio` `2026-11-18T14:00:00.000Z` | `en_curso` |
  | 2 | Igual, con `inicio` `2026-11-19T13:00:00.000Z` | `reserva` |
  | 3 | `inicio` exactamente igual a `now` | `en_curso` (límite estricto) |
  | 4 | `estadoCalculado` VENCIDA | `vencida` |
  | 5 | `estado` CANCELADA, y FINALIZADA con `inicio` futuro | `cancelada` y `finalizada` |
  | 6 | Sin `estadoCalculado` (solo `estado`) | Usa `estado` |
  | 7 | `faseChip` de cada fase | `reserva` con "Reserva" y `secondary`; el resto con la etiqueta y el color de `EstadoOcupacion` |
  | 8 | `accionesDeOcupacion` en `en_curso` con `ocupaciones.finalizar` | `finalizar` verdadero; `cancelarReserva` falso |
  | 9 | En `reserva` con `ocupaciones.cancelar` y con `ocupaciones.finalizar` | `cancelarReserva` verdadero; `finalizar` falso |
  | 10 | En `vencida` con `ocupaciones.finalizar` | `finalizar` verdadero |
  | 11 | En `finalizada` y en `cancelada`, con todos los permisos | `finalizar` y `cancelarReserva` falsos |
  | 12 | `registrarPago` con `pagos.registrar` y `saldo` 100, con `saldo` 0, con `saldo` `null` y con la ocupación cancelada | Verdadero, falso, falso y falso |
  | 13 | Sin ningún permiso, en cualquier fase | Todo falso |
  | 14 | `buildListQueries` con los valores por defecto (Activas, `take` 200) | `{ ok, queries: [{ estado: 1, take: 200 }, { estado: 2, take: 200 }] }` (dos pedidos: activas y vencidas) |
  | 15 | Estado "todas", "vencidas", "finalizadas" y "canceladas" | Un solo pedido: sin `estado`; `estado: 2`; `estado: 4`; `estado: 3` |
  | 15b | "Activas" con `venceEnDias` `"7"` | Un solo pedido `{ estado: 1, venceEnDias: 7, take: 200 }` (el filtro excluye las vencidas) |
  | 15c | `mergeOcupaciones([A, B], 3)` con A = ids 1 (inicio 11/11) y 2 (inicio 15/11) y B = ids 3 (inicio 15/11) y 4 (inicio 9/11) | Ordena por `inicio` descendente y, a igual `inicio`, por `id` descendente: `[3, 2, 1]` (corta a 3) |
  | 16 | `desde: "2026-11-01"` y `hasta: "2026-11-01"` | `desde: 2026-11-01T03:00:00.000Z`, `hasta: 2026-11-02T02:59:59.999Z` (inclusivo) |
  | 17 | `desde: "2026-11-05"` y `hasta: "2026-11-01"` | `{ ok: false }` con "La fecha 'Desde' no puede ser posterior a 'Hasta'"; no devuelve `params` |
  | 18 | Estado "reservas" sin `desde`, con `desde: "2026-11-01"` y con `desde: "2026-11-25"` | Un solo pedido con `estado: 1` y `desde` = `now`; `desde` = `now` (el más tardío); `desde` = `2026-11-25T03:00:00.000Z` |
  | 19 | `venceEnDias` `"7"`, `""`, `"-1"`, `"1.5"` y `"abc"` | `7`; omitido; y los tres últimos `{ ok: false }` |
  | 20 | `cocheraId` `"12"` y `clienteId` `"9"` | Enteros `12` y `9`; vacíos se omiten |
  | 21 | `isTruncated(listas, take)` con una lista de 200 filas y `take` 200; con 199 en todas; con dos listas de 100 y 200 | Verdadero; falso; verdadero (alcanza con que **una** llegue al tope) |
  | 22 | `altaModo` con inicio `2026-11-20T09:00` y fin `2026-11-20T18:00`; con inicio `2026-11-18T12:00` sin fin; con inicio `2026-11-18T08:00` y fin `2026-11-18T10:00`; con inicio vacío | `reserva`; `abierta`; `cerrada`; `null` |
  | 23 | `disponiblesRange` con inicio `2026-11-20T09:00` y fin `2026-11-20T18:00` | `desde: 2026-11-20T12:00:00.000Z`, `hasta: 2026-11-20T21:00:00.000Z` |
  | 24 | `disponiblesRange` sin fin | `hasta` = `desde` + `OPEN_HORIZON_DAYS` días exactos |
  | 25 | `disponiblesRange` con fin igual o anterior al inicio, con inicio vacío y con una hora inexistente (zona `America/New_York`, `2026-03-08T02:30`) | `null` en los tres |
  | 26 | `showMotivoRetroactivo` con `can` y `now` = `…15:00:30Z`: inicio `2026-11-18T12:00` (el minuto actual) y `2026-11-18T11:59` | Falso; verdadero |
  | 27 | Sin `ocupaciones.crear_retroactiva`, y con un inicio futuro | Falso en los dos |
  | 28 | Con el permiso, inicio en el minuto actual y un error de servidor en `motivoRetroactivo` | Verdadero |
  | 29 | `validateAltaForm` válido, abierta (inicio `2026-11-18T12:00`, cochera 5, cliente 9, Hora) | `ok`; cuerpo `{ cocheraId: 5, clienteId: 9, tipo: 1, inicio: "2026-11-18T15:00:00.000Z", usarTarifaExcepcional: false }`, **sin** la clave `fin` |
  | 30 | Con fin `2026-11-18T18:00` | `fin: "2026-11-18T21:00:00.000Z"` |
  | 31 | Fin igual al inicio y fin anterior | Error "El fin debe ser posterior al inicio" |
  | 32 | No abierta y `fin` vacío | Error "Ingresá el fin o marcá «Sin hora de fin»" |
  | 33 | Sin cochera; sin cliente; con inicio vacío | Un error en cada campo (`cocheraId`, `cliente`, `inicio`) |
  | 34 | Inicio inexistente (`America/New_York`, `2026-03-08T02:30`) | Error de `inicio` con el mensaje de D-FB6 |
  | 35 | Tarifa excepcional con permiso, precio `"850.50"` y motivo `" cliente frecuente "` | Cuerpo con `usarTarifaExcepcional: true`, `precioUnitarioExcepcional: 850.5`, `motivoTarifaExcepcional: "cliente frecuente"` |
  | 36 | Precio excepcional `""`, `"0"`, `"12.345"`, `"10000000.01"` y motivo vacío | Error de precio (los cuatro primeros) y de motivo. `"10000000"` da `ok` |
  | 37 | Interruptor activo **sin** `ocupaciones.tarifa_excepcional` | Cuerpo con `usarTarifaExcepcional: false` y sin precio ni motivo |
  | 38 | Motivo retroactivo `" cargado de la mañana "` con el permiso, sin el permiso y de 251 caracteres | `motivoRetroactivo: "cargado de la mañana"`; la clave ausente; error de motivo |
  | 39 | **No valida configuración (D-FG9):** inicio `2025-01-01T00:00` y fin `2036-11-18T12:00` | `ok` |
  | 40 | `buildCancelBody(" Cliente avisó ")`, `("")`, `("   ")` y 251 caracteres | `{ ok: true, body: { motivo: "Cliente avisó" } }`; error "Contanos el motivo de la cancelación" (los dos siguientes); error "El motivo no puede superar 250 caracteres". Con 250, `ok` |
  | 41 | `needsResolutionError` con un `ApiError` de status 400, `code: "datos_invalidos"` y `errors: { ResolucionExcedente: ["…"] }`; con `errors: { Motivo: ["…"] }`; con `code: "operacion_invalida"`; con `null` y con `undefined` | Verdadero; falso; falso; falso; falso (no usa `saldoAFavor`) |
  | 42 | `buildFinalizarBody` sin paso de resolución | `{ ok: true, body: undefined }` |
  | 43 | Con el paso de resolución abierto y ninguna opción elegida | Error "Elegí cómo resolver el excedente" |
  | 44 | `COBRAR_COMPLETO` con motivo `""` y con `" pactado "` | Error de motivo; `{ resolucionExcedente: 1, motivo: "pactado" }` |
  | 45 | `DEVOLVER` con motivo vacío, con 250 y con 251 caracteres | `{ resolucionExcedente: 2 }` (sin `motivo`); `ok`; error |
  | 46 | `validatePago` con monto `"1500"`, `"1500.5"`, `" 99.99 "` y método válido | `ok`, `monto` numérico |
  | 47 | Monto `""`, `"0"`, `"-1"`, `"12.345"`, `"abc"`, `"10000000.01"` y método ausente | Error de `monto` (los seis primeros) y de `metodo`. `"10000000"` da `ok` |
  | 48 | Referencia `" x "` y `""` | `referencia: "x"`; la clave ausente |
  | 49 | `fieldErrorsFromApi` con `{ Inicio: ["a"], Fin: ["b", "c"], MotivoRetroactivo: ["d"], Otro: ["e"] }` | `inicio: "a"`, `fin: "b"`, `motivoRetroactivo: "d"` (el primer mensaje) y `Otro` en los generales; con `errors: null`, vacío |
  | 49b | `cuentaRotulos` de una activa con fin, de una abierta, de una finalizada y de una cancelada | Rótulo del tope "Total del contrato"; "Hasta ahora (unidad en curso)"; "Total"; sin tope (no se muestra) |
  | 50 | `altaErrorField` con `cochera_no_disponible`, `cochera_bloqueada`, `cliente_inactivo`, `inicio_retroactivo_sin_permiso` y `tarifa_no_configurada` | `cocheraId`, `cocheraId`, `cliente`, `inicio` y `tipo` |
  | 51 | `altaErrorField("sin_permiso", form)` con el interruptor activo y con el interruptor apagado | `excepcional`; `inicio` |
  | 52 | `shouldReloadAfter` | Verdadero para `ocupacion_no_encontrada`, `ocupacion_no_activa`, `ocupacion_cancelada`, `ocupacion_finalizada`, `ocupacion_ya_iniciada`, `ocupacion_no_iniciada`, `pago_supera_saldo`, `cochera_no_disponible` y `cochera_bloqueada`; falso para `datos_invalidos`, `operacion_invalida`, `sin_permiso`, `tarifa_no_configurada`, `caja_cerrada`, un código desconocido y `undefined` |
  | 53 | `shouldCloseDetailAfter` | Verdadero solo para `ocupacion_no_encontrada` |
  | 54 | `buildOcupacionPath(12)`; con `0`, `-1`, `1.5`, `"abc"` y `null` | `/ocupaciones?id=12`; `/ocupaciones` en los demás (sin lanzar) |
  | 55 | `parseOcupacionId("?id=12")`, `("?id=abc")`, `("?id=0")` y `("")` | `12`, `null`, `null`, `null` |
  | 56 | Ida y vuelta: `parseOcupacionId(buildOcupacionPath(12).split("?")[1])` con el `?` repuesto | `12` |
  | 57 | Búsqueda de `getHours`, `toLocale` y `toISOString` en los dos módulos | Sin coincidencias |

  `npm run lint` y `npm run build` pasan. Los casos 41 a 45 y 50 a 52 se ajustan si P-FG-L7 muestra que el backend responde distinto a lo relevado.

### Paso 2 — Módulos de API

- [ ] **2.1** Crear `src/api/ocupacionApi.js` (D-FG2) y `test/unit/api/ocupacionApi.test.js` con `vi.mock` de `http`.
- [ ] **2.2** Crear `src/api/clienteApi.js` (D-FG3) y su test.
- [ ] **2.3** Sumar `createPago` a `src/api/pagosApi.js` (D-FG4), sin tocar el resto, y `test/unit/api/pagosApi.test.js`.

  *Aceptación:* `npm test` pasa con: `listOcupaciones({ estado: 1, take: 200 })` hace `GET /Ocupacion` con esos `params` y **sin** claves vacías; una respuesta que no es un arreglo lanza `ApiError` con `code: "respuesta_invalida"`; `getOcupacion(7)` hace `GET /Ocupacion/7`; `createOcupacion(body)` hace `POST /Ocupacion` con el cuerpo sin modificarlo y devuelve la respuesta; `cancelOcupacion(7, { motivo })` hace `POST /Ocupacion/7/cancelar` y devuelve `undefined`; `finalizeOcupacion(7)` hace `POST /Ocupacion/7/finalizar` **sin cuerpo** y `finalizeOcupacion(7, { resolucionExcedente: 2 })` lo manda; `listClientes({ q: "ana", activos: true, page: 1, pageSize: 20 })` hace `GET /Cliente` y pasa por `normalizePaged`; `createPago(body)` hace `POST /Pagos` y devuelve `data`; el objeto `pagosApi` sigue exportando `crear`, `getCajaDiaria` y `anular`; ninguna función captura errores (un rechazo de `http` se propaga). `npm run lint` y `npm run build` pasan.

### Paso 3 — Listado y detalle (lectura)

- [ ] **3.1** Crear `src/componentes/ClienteAutocomplete.jsx` con `clienteApi` (temporizador de 300 ms y descarte de respuestas viejas).
- [ ] **3.2** En `Ocupaciones.jsx`: cargar con `ocupacionApi` (D-FG11), filtros, tarjeta con fase (D-FG10, D-FG12), aviso de truncado y estado de error de carga. Retirar `fmtDate`, `ESTADOS`, `TIPOS`, `money`, `estadoLabel`, `tipoLabel` y el `EstadoChip` local (D-FG21). Resolver **P-FG-L3**.
- [ ] **3.3** Crear `OcupacionDetalleDialog.jsx` (D-FG13) y el query `?id=` con `ocupacionLink.js` (D-FG14). Los botones de acción de la tarjeta y del detalle quedan **como están hoy** hasta los pasos 4 a 6.

  *Aceptación (manual, con el backend de `develop`, `America/Montevideo` y `dueno@demo.test`):* (1) en Network, la carga por defecto llama en paralelo a `GET /Ocupacion?estado=1&take=200` y `GET /Ocupacion?estado=2&take=200`, responden 200 y la lista unida sale ordenada por inicio descendente; (2) una reserva futura muestra el chip "Reserva" y "Empieza dd/mm/yyyy HH:mm"; una en curso, "En curso"; una vencida, "Vencida"; las horas coinciden con las de la API en la zona del local; (3) un total nulo muestra "—", no `$ 0,00`; (4) "Estado" ofrece Activas, Reservas, Vencidas, Finalizadas, Canceladas y Todas, y "Finalizadas" lista ocupaciones finalizadas; (5) el filtro de cochera es un `select` por número y manda el `cocheraId` correcto; (6) "Fin hasta" manda un instante con `Z` terminado en `…:59.999Z` y la ayuda avisa que excluye las abiertas; (7) con `take` igual a la cantidad de filas, aparece "Puede haber más"; (8) "Ver" abre el detalle y la URL pasa a `/ocupaciones?id=N`; recargar con esa URL lo abre; `?id=abc` se ignora; "atrás" no reabre el detalle cerrado; (9) el detalle muestra la cuenta, la tarifa (con el chip si es excepcional) y, en un MES, `modoMes` y `fraccionMes`; (10) con el backend apagado se ve "No pudimos cargar las ocupaciones" y no una lista vacía; (11) una búsqueda de `fmtDate`, `toLocale`, `money(`, `ESTADOS`, `TIPOS` y `http` en `Ocupaciones.jsx` no da coincidencias. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 4 — Alta

- [ ] **4.1** Crear `AltaOcupacionDialog.jsx` (D-FG16) con `listCocherasDisponibles`, `validateAltaForm` y el botón "Nueva ocupación" (solo con `ocupaciones.crear`).
- [ ] **4.2** Envío con `ocupacionApi.createOcupacion`; en error: `showApiError`, marca de campos (`fieldErrorsFromApi`, `altaErrorField`) y recarga según `shouldReloadAfter` (D-FG7). Resolver **P-FG-L6**.

  *Aceptación (manual, con `encargado@demo.test`, `dueno@demo.test` y `operado@demo.test`):* (1) en un tipo Hora, la casilla "Sin hora de fin" viene tildada y el `POST /Ocupacion` va **sin** la clave `fin`; destildada, va con `fin` como instante con `Z`; (2) el selector de cochera solo muestra las que devuelve `GET /Cochera/disponibles` con `desde` y `hasta` con `Z`, se vuelve a pedir al cambiar inicio o fin, y limpia la elegida si deja de estar disponible; (3) con un inicio futuro, la etiqueta dice "Reserva: empieza el …" y la ocupación aparece en el listado con el chip "Reserva"; (4) un inicio retroactivo con `encargado@demo.test` muestra "Motivo del inicio retroactivo" y manda `motivoRetroactivo`; con `operado@demo.test` el campo no aparece, el backend rechaza y el `title` queda marcado en "Inicio" (403 `sin_permiso`, B1); (5) el interruptor de tarifa excepcional aparece con `dueno@demo.test` y `encargado@demo.test` y no con `operado@demo.test`; activo, un precio `0`, `12.345` o `10000001` y un motivo vacío no llegan a la red; (6) un inicio de hace un año, o un fin de diez años, **sí llegan** y el backend contesta con su `title` y el campo marcado; (7) un tipo sin tarifa vigente para ese día muestra el `title` de `tarifa_no_configurada` bajo "Tipo", con el enlace "Ver tarifas"; (8) dos pestañas: ocupar la misma cochera en las dos muestra el `title` de `cochera_no_disponible` en la segunda y vuelve a pedir las disponibles; (9) un cliente dado de baja muestra el `title` de `cliente_inactivo`; (10) una hora inexistente (con la zona de un tenant con horario de verano, si hubiera) no se envía; (11) con `auditor` o un rol sin `ocupaciones.crear` no se ve "Nueva ocupación". `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 5 — Finalizar y cancelar reserva

- [ ] **5.1** Crear `CancelarReservaDialog.jsx` (D-FG17): "Cancelar reserva" solo en fase `reserva` y con `ocupaciones.cancelar`, motivo obligatorio, sin `finReal`.
- [ ] **5.2** Crear `FinalizarOcupacionDialog.jsx` (D-FG18): carga el detalle, muestra la cuenta, confirma, y resuelve el excedente de un MES por los dos caminos. "Finalizar" solo en fase `en_curso` o `vencida` y con `ocupaciones.finalizar`.
- [ ] **5.3** Errores por `code` (`shouldReloadAfter`, `shouldCloseDetailAfter`) en los dos diálogos.

  *Aceptación (manual, con `dueno@demo.test` y `operado@demo.test`):* (1) en una reserva solo se ve "Cancelar reserva" (no "Finalizar"); en una en curso o vencida solo "Finalizar"; en finalizada y cancelada, ninguno; (2) cancelar sin motivo no llega a la red; con motivo, `POST …/cancelar` va con `{ motivo }` y **sin** `finReal`, y la reserva queda cancelada; (3) finalizar una Hora o un Día muestra la confirmación con la cuenta y manda `POST …/finalizar` sin cuerpo; (4) finalizar un MES con pagos mayores a lo que corresponde manda primero `POST …/finalizar` sin cuerpo, recibe el 400 con `errors.ResolucionExcedente`, **no muestra toast** y pasa al paso "Resolver el excedente" (con el `title` del backend visible) con ninguna opción preseleccionada: "Cobrar completo" sin motivo no se deja enviar y manda `{ resolucionExcedente: 1, motivo }`; "Devolver" manda `{ resolucionExcedente: 2 }`; (5) finalizar un MES sin excedente no muestra el paso; (6) finalizar la misma ocupación desde dos pestañas: la segunda muestra el `title` de `ocupacion_finalizada` (o `ocupacion_no_activa`), cierra el diálogo y recarga; (7) finalizar una reserva forzada desde DevTools muestra el `title` de `ocupacion_no_iniciada`; (8) con un usuario sin `ocupaciones.finalizar` ni `ocupaciones.cancelar` no se ve ningún botón, y un pedido forzado muestra el `title` de `sin_permiso`; (9) tras finalizar con saldo pendiente, el detalle ofrece "Registrar pago". `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 6 — Registrar pago y enlaces

- [ ] **6.1** Crear `RegistrarPagoDialog.jsx` (D-FG19) con `createPago` y `validatePago`; reemplaza el diálogo inline de hoy. Visible con `pagos.registrar`, `saldo > 0` y no cancelada.
- [ ] **6.2** Enlaces del detalle (D-FG15): "Ver trazabilidad" (con `auditoria.ver`, por `buildTrazabilidadPath`) y "Ver alertas" (con `alertas.ver`).
- [ ] **6.3** En `src/utils/alertas.js`: la línea de Ocupación de `getAlertLinks` con `canOcupaciones` y su test; `OperationalAlerts.jsx` pasa el flag (D-FG14). Exportar `OCUPACIONES_PATH` desde `routes.js`. Resolver **P-FG-L5**.

  *Aceptación (manual):* (1) "Registrar pago" propone el saldo, valida los dos decimales y manda `POST /Pagos` con `{ ocupacionId, monto, metodo }` (con `referencia` solo si se escribió); (2) un monto mayor al saldo muestra el `title` de `pago_supera_saldo`, recarga y deja el diálogo abierto; (3) con la caja cerrada (modo TURNO) muestra el `title` de `caja_cerrada` sin más lógica; (4) tras el pago, el saldo y "Pagado" se actualizan en el listado y en el detalle; (5) con `operado@demo.test` se ve "Registrar pago" (el OPERADOR tiene `pagos.registrar`); (6) "Ver trazabilidad" aparece con `dueno@demo.test` y abre `/trazabilidad?ocupacionId=N`, y no aparece con `encargado@demo.test` ni `operado@demo.test`; (7) "Ver alertas" abre `/alertas-operativas?ocupacionId=N`; (8) en `/alertas-operativas`, una alerta con `ocupacionId` muestra "Ver ocupación" con `ocupaciones.ver` y abre `/ocupaciones?id=N` con el detalle abierto; (9) `git diff develop -- src/api/pagosApi.js` solo agrega `createPago`. `npm run lint`, `npm test` y `npm run build` pasan.

### Paso 7 — Lint, documentación y cierre

- [ ] **7.1** Retirar la excepción de `Ocupaciones.jsx` de `eslint.config.js` (P-FG-L4). Corregir en `CLAUDE.md` **solo** la frase sobre Ocupaciones; **no** tocar la línea "Backend endpoints used".
- [ ] **7.2** Crear `docs/manual/frontend/07-ocupaciones.md`: la fase de una ocupación, el listado y sus filtros (con el significado de `desde` y `hasta`), el alta (abierta, retroactiva, futura, excepcional), finalizar y el excedente, cancelar reserva, registrar pago, la tabla de permisos, qué hace cada `code` de error, el contrato `/ocupaciones?id=N` y lo que le queda a la 08 y a la 10.
- [ ] **7.3** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **Terminada** una vez mergeada a `develop`.

  *Aceptación:* `npm run lint`, `npm test` y `npm run build` pasan; `Ocupaciones.jsx` no está en las excepciones de `eslint.config.js` y el lint falla si se le agrega un `toLocaleString()`; una búsqueda de `fmtDate`, `ESTADOS`, `TIPOS`, `METODOS_PAGO`, `money(` y `e.response.data.error` en `Ocupaciones.jsx` y en `src/componentes/ocupaciones/` no da coincidencias; `git diff develop -- src/pages/CajaDiaria.jsx src/pages/Clientes.jsx src/pages/Cocheras.jsx` vacío; el `git diff develop -- CLAUDE.md` solo cambia la frase de Ocupaciones.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`:

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores |
| 2 | Entrar a `/ocupaciones` con `dueno@demo.test` | `GET /Ocupacion?estado=1&take=200` y `GET /Ocupacion?estado=2&take=200` responden 200; lista unida, tarjetas con chip de fase |
| 3 | Reserva futura, ocupación en curso y vencida | Chips "Reserva", "En curso" y "Vencida"; la reserva dice "Empieza …"; solo la reserva ofrece "Cancelar reserva" |
| 4 | Con la zona del sistema operativo cambiada, recargar | Las horas mostradas no cambian (zona del local) |
| 5 | Filtros: estado, cochera por número, cliente, rango de días, vence en, cantidad | Cada uno se manda con el valor esperado; "Fin hasta" termina en `…:59.999Z` y la ayuda avisa de las abiertas |
| 6 | Resultado con tantas filas como `take` | Aviso "Puede haber más" |
| 7 | Abrir `/ocupaciones?id=N`, y `?id=abc` | Se abre el detalle de N; el inválido se ignora; "atrás" no reabre un detalle cerrado |
| 8 | Alta abierta (Hora) | `POST /Ocupacion` sin `fin`; aparece en el listado como "En curso" |
| 9 | Alta con inicio futuro | Etiqueta "Reserva"; en el listado, chip "Reserva" |
| 10 | Alta retroactiva con `encargado@demo.test` y con `operado@demo.test` | El encargado ve el motivo y manda `motivoRetroactivo`; el operador no lo ve y recibe el `title` del backend marcado en "Inicio" |
| 11 | Alta con tarifa excepcional | El interruptor solo lo ven `dueno` y `encargado`; límites de precio validados en el cliente |
| 12 | Alta con un inicio fuera de los topes de configuración | Llega al backend; el `title` y el campo "Inicio" o "Fin" se muestran |
| 13 | Alta de un tipo sin tarifa vigente | `title` de `tarifa_no_configurada` bajo "Tipo" y enlace "Ver tarifas" |
| 14 | Dos pestañas: ocupar la misma cochera | La segunda muestra `cochera_no_disponible` y vuelve a pedir las disponibles |
| 15 | Cancelar una reserva (con y sin pagos) | `POST …/cancelar` con `{ motivo }` y sin `finReal`; la reserva queda cancelada; con pagos, el aviso de devolución pendiente antes y después |
| 16 | Finalizar una Hora y un Día | Confirmación con la cuenta; `POST …/finalizar` sin cuerpo |
| 17 | Finalizar un MES con pagos mayores a lo devengado | Primero `POST …/finalizar` sin cuerpo y 400 `errors.ResolucionExcedente`; sin toast, el diálogo muestra el `title` del backend y el paso "Resolver el excedente" sin opción preseleccionada; `COBRAR_COMPLETO` exige motivo; el reenvío va con `resolucionExcedente` 1 o 2; con "Devolver" se avisa "Quedó una devolución pendiente; registrala desde Pagos" y el detalle muestra el saldo a favor |
| 18 | Finalizar dos veces desde dos pestañas | `title` de `ocupacion_finalizada` o `ocupacion_no_activa`, el diálogo se cierra y la lista se recarga |
| 19 | Registrar un pago, y uno mayor al saldo | `POST /Pagos` 201 y saldo actualizado; el segundo muestra `pago_supera_saldo` |
| 20 | `encargado@demo.test` y `operado@demo.test` | Cada uno ve solo las acciones de la tabla de D-FG8; ninguno ve "Ver trazabilidad" |
| 21 | Enlaces de alertas | "Ver ocupación" desde una alerta abre el detalle; "Ver alertas" desde el detalle filtra por la ocupación |
| 22 | Backend apagado | "No pudimos cargar las ocupaciones" con "Reintentar" |
| 23 | Búsqueda de `fmtDate`, `toLocale`, `money(`, `ESTADOS`, `TIPOS`, `METODOS_PAGO` y `response.data.error` en `Ocupaciones.jsx` | Sin coincidencias |
| 24 | `git diff develop -- src/pages/CajaDiaria.jsx src/pages/Clientes.jsx src/pages/Cocheras.jsx` | Vacío |

**No verificable con los usuarios demo:** el rol `AUDITOR` (P-FA9; lo cubren los tests de `accionesDeOcupacion` y de enlaces), la hora inexistente (ninguna de las 12 zonas permitidas tiene horario de verano hoy; lo cubren los tests de la 02 y el caso 34 del paso 1) y la resolución del excedente si no hay un mensual con pagos de más (P-FG7).

## 8. Cómo retomar

**Estado:** Aprobada (18/11/2026). El desarrollador respondió las cuatro preguntas de producto (listado "Activas", un solo diálogo de alta, fase en el cliente y "reaccionar al 400" al finalizar) y aprobó el límite con la 08 y la 10 y el contrato 05 ↔ 07. Las dudas B1 a B9 del backend están relevadas (sección 2.2) y los pedidos PB-7 a PB-10, aprobados. **Todas las decisiones D-FG (1 a 21) quedan Confirmadas**; ninguna queda en Propuesta.

**Condición de arranque:** la 02, la 04, la 05 y la 06 implementadas y mergeadas en `develop`, y esta spec aprobada y mergeada. Hasta entonces no se crea el worktree.

**Ejecución en un worktree propio**, `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-ocupaciones` (rama `feature/front-ocupaciones`), creado desde `develop`. Un chat por bloque:

| Chat | Pasos | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 0 a 2 | Sonnet | bajo | Lógica pura y módulos de API con una tabla de casos. Si P-FG-L1 o P-FG-L3 no dan, **frena** y avisa al Orquestador: no implementa nada de las otras specs ni cambia `enums.js` |
| B | 3 y 4 | Sonnet | medio | Listado, detalle y alta: el paso con más estado (filtros, disponibilidad, errores por campo). Si B6 cambia el rango de disponibles o aparece una decisión no prevista, **frena** |
| C | 5 y 6 | Sonnet | medio–alto | Finalizar con excedente, cancelar y cobro: es plata. Si la respuesta a B3 cambia el flujo de D-FG18, **frena** y se sube a Opus con esfuerzo alto |
| D | 7 | Haiku | bajo | Lint, manual y cierre; sin decisiones |

**Prompt para cada chat de ejecución** (cambiar `PASOS` por "0 a 2", "3 y 4", "5 y 6" o "7"):

> Trabajás en el frontend de ParkingControl, en el worktree `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front-ocupaciones` (rama `feature/front-ocupaciones`; nunca trabajes sobre `develop` ni en la carpeta `parkingcontrol-front`, que usan otros chats). Si el worktree no existe, pedí el comando del paso 0.2 y esperá. Leé `CLAUDE.md`, `docs/specs/frontend/02-base-comun.md` (sobre todo las secciones 3 y 5.4), `docs/specs/frontend/04-trazabilidad.md` (solo D-FD5), `docs/specs/frontend/05-alertas.md` (solo D-FE6 y D-FE10), `docs/specs/frontend/06-cocheras.md` (solo D-FF2), `docs/inventario/backend.md` (secciones `/Ocupacion`, `/Cochera`, `/Tarifa`, `/Configuracion`, 3, 4 y 5) y `docs/specs/frontend/07-ocupaciones.md`. Ejecutá **los pasos PASOS** de la 07, de a uno, siguiendo las reglas de la sección 6. Antes de empezar, comprobá P-FG-L1: si la 02, la 04, la 05 o la 06 no están implementadas en `develop`, frená. **Regla de ruteo (obligatoria): no corras comandos de terminal y no le preguntes nada al usuario en tu chat. Las preguntas de producto, las dudas sobre el backend, los avisos, los comandos (exactos y con su carpeta), las confirmaciones de cierre de paso y de commit, y las decisiones que la spec no prevé van al chat "Orquestador" por SendMessage, con la opción que recomendás y las alternativas con su costo. Esperá su respuesta. Las dudas del backend las releva el Orquestador en el código: no supongas reglas de negocio.** Agregá archivos siempre por ruta explícita. No leas ni muestres el `.env`. No toques `CLAUDE.md` salvo la frase del paso 7.1. Al terminar cada paso: tildalo, actualizá el manual y proponé el commit (sin `Co-Authored-By` ni atribución de IA) al Orquestador. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo bajo alcanza para los pasos 0 a 2 y Haiku para el 7 (tablas de casos y decisiones tomadas). Sonnet con esfuerzo medio para los pasos 3 y 4, y medio–alto para los 5 y 6, que mueven dinero. Se sube a Opus únicamente si aparece una decisión que la spec no previó (por ejemplo, que el 400 de finalizar no traiga `errors.ResolucionExcedente` como se relevó, o que el backend cambie cómo se resuelve el excedente).
