# 13 — Diseño: tema, shell y pantallas de "Parking Oficial"

> Frontend · **Aprobada** (tandas 1 a 4) · **tanda 5: Aprobada, bloqueada por PB-24** · `feature/specs-etapa7` (esta spec) y `feature/front-diseno` (ejecución, en el repo principal sin worktree, a crear desde `develop`) · Última actualización 20/11/2026
>
> Decimotercera spec del frontend. **Replica en el código el diseño "Parking Oficial"** (proyecto "App de gestión de garage Uruguay" de Claude Design): un tema de MUI con `createTheme` (claro y oscuro), un shell nuevo (menú lateral agrupado, migas, menú de usuario, barra superior solo en mobile) y el estilo de las 11 pantallas, las pantallas de sistema y todos los diálogos, **incluido el plano del garage** (posicional, por niveles y con editor), que tiene su propia **tanda 5** y depende de un pedido de backend nuevo (PB-24, sección 4.3): las tandas 1 a 4 no lo esperan. **Salvo la tanda 5, es solo visual**: no cambia la lógica, los permisos, los textos que vienen de la API ni los endpoints. Las excepciones de comportamiento están en la sección 4.1 (DV-FM1, DV-FM2 y DV-FM7) y las pidió el desarrollador. **Depende de la 02 a la 12**, todas ejecutadas en `develop`. La spec 14 ("aprovechar lo nuevo del backend") es la siguiente y **no se mezcla** (sección 1).
>
> **Estado de las decisiones.** La spec está **Aprobada** (20/11/2026) para las tandas 1 a 4; la **tanda 5 (plano)** queda **Aprobada, bloqueada por PB-24** y no arranca hasta que el backend lo implemente y su contrato real esté confirmado (P-FM13). Las **D-FM1 a D-FM16** que no dicen *Confirmada* son decisiones técnicas aprobadas junto con la spec. Decididos por el desarrollador el 20/11/2026 (por el Orquestador): tema, esquinas Suaves de 10 px, shell, menú agrupado con engranaje, atajo "Registrar ingreso", plano posicional, modo oscuro con selector, "Ocupada" en pizarra, "con deuda" solo en mensuales y vencidas con saldo, y fuente. Lo que **sigue abierto** está en la sección 4.2 (P-FM1, P-FM11, P-FM12 y P-FM13) y ninguna frena las tandas 1 a 4.

## 1. Objetivo y alcance

**Objetivo.** Que ParkingControl se vea como "Parking Oficial": misma paleta, tipografía, forma de tarjetas, botones, chips, diálogos y tablas, y el mismo shell, sin tocar cómo se comporta. Hoy el código usa el tema por defecto de MUI con estilos sueltos repetidos en cada página (`boxShadow: "0 6px 18px rgba(0,0,0,.06)"` en cuatro pantallas, fondos fijos `#f6f8fb` y `#0b0f17` en Login, AccountBlocked y Splash).

**Se construye.**

| Área | Qué | Decisión |
|---|---|---|
| Tema | `src/theme/theme.js` con `getTheme(mode)` (`createTheme`), paleta clara y oscura, Red Hat Display, formas y `components` | D-FM3, D-FM4 |
| Montaje | Un único `ThemeProvider` + `CssBaseline` en `main.jsx`, con el `Toaster` adentro | D-FM5 |
| Modo oscuro | Sigue `prefers-color-scheme`; un selector opcional con estado solo en memoria | D-FM6 |
| Fuente | `@fontsource/red-hat-display`, sin llamadas externas | D-FM7 |
| Shell | Menú lateral agrupado, migas, menú de usuario, barra superior y drawer por debajo de 900 px | D-FM8, D-FM9 |
| Menú | Campo `group` en `PRIVATE_ROUTES`, atajo "Registrar ingreso" | D-FM9, D-FM10 |
| Pantallas de sistema | Arranque, Login, Cargando, Cuenta bloqueada, error de `/me`, "No tenés permiso", "Sin acceso" | D-FM11 |
| Pantallas | Las 11, por tandas | D-FM12 |
| Clientes | Los `window.confirm` pasan a un `Dialog` de MUI con el mismo texto | D-FM13 |
| Plano provisorio | Pestaña "Plano" de Cocheras, en grilla por número, hasta que exista PB-24 (tanda 2) | D-FM14 |
| Plano posicional (tanda 5) | Plano por niveles como vista principal del Dashboard y pestaña de Cocheras, y el editor "Editar configuración del garage". **Depende de PB-24** | D-FM16, sección 4.3 |
| Código | Constantes y lógica pura del menú probadas con Vitest | D-FM15 |

**Queda afuera.**

| Qué | Dónde queda |
|---|---|
| Lógica, permisos, endpoints, textos de la API, fechas, `formatMoney`, `showApiError`, `can()` | No cambian. Rigen las reglas de `CLAUDE.md` |
| Guardar la disposición del plano en el navegador | No se puede (ARQ-1). Se pide al backend como PB-24 (sección 4.3) |
| Matrícula y tipo de vehículo que muestra el plano del diseño | No existen en la API. No se copian; candidato a PB-25, **sin pedir todavía** (DV-FM3) |
| Pantalla "Registrar ingreso" con matrícula, tipo y modo rápido | No existe. Solo el atajo (D-FM10) |
| Acordeones por sección del Monitor y botones Inventario/Vencimientos del Panel | Desvío, no se copian (DV-FM4) |
| **Spec 14**: total del listado, nombres de usuario, `anulableSinDueno`, precio vigente, simulación del ajuste, resumen de alertas, filtro por entidad, invitación pendiente | La **siguiente** spec. No se mezcla con esta |
| Reglas de ESLint nuevas para colores sueltos | P-FM9 |

**Estado de alcance.** Etapa 7 del frontend. No hay cliente: el desarrollador define el producto.

## 2. Fuentes

Versiones de referencia: frontend, rama `develop` con las specs 01 a 12 ejecutadas; diseño leído el 20/11/2026 por el camino A (`DesignSync`, solo lectura).

| Fuente | Qué toma esta spec | Fecha |
|---|---|---|
| Claude Design, proyecto "App de gestión de garage Uruguay" (`c81bc64d-ee26-4224-9014-a1cc27df311c`), archivo `Parking Oficial.dc.html` | La **única referencia visual**: paleta, formas, shell, componentes MUI de cada pantalla (`S.<pantalla>.mui`), hoja de decisiones | 20/11/2026 |
| Mismo proyecto, `CLAUDE.md` | "Tipografía fija: Red Hat Display. Estilo serio, menú lateral de color sólido y a todo el alto" | 20/11/2026 |
| Mismo proyecto, `parkingcontrol-theme.js` | **No se usa** (es la v7: Geist, grises, radio 6; contradice a "Parking Oficial"; decisión del desarrollador) | 20/11/2026 |
| Mismo proyecto, otras vistas (v6 a v13, "Cochera v2 a v5", "Variantes estilo plano", "Nueva ocupacion") | **Se ignoran** | — |
| Prompt `prompt-claude-design-v3.md` | Pantallas, campos, acciones y textos que el diseño tenía que mostrar; sección 10 (qué se pidió entregar) | 20/11/2026 |
| `CLAUDE.md` del repo y `docs/specs/README.md` | Reglas: sin `localStorage` (ARQ-1), sin decidir por rol (ARQ-4), `can()`, `showApiError`, fechas del tenant, `formatMoney`; formato de las specs | 20/11/2026 |
| Specs 07 y 09 | Modelo de formato | 19/11/2026 |
| Lectura de `src/main.jsx`, `src/App.jsx`, `src/componentes/Layout.jsx`, `src/auth/routes.js`, `src/auth/RequireAuth.jsx`, `src/pages/Login.jsx`, `src/pages/Splash.jsx` y la lista de `src/pages/**` y `src/componentes/**` | Estado actual (sección 2.1) | 20/11/2026 |

**Referencias externas.** Al ejecutar se consultan en su versión vigente: MUI 7 (`createTheme`, `CssBaseline`, `ThemeProvider`, `Drawer`, `Tabs`, `Dialog`, `Chip`) y `@fontsource/red-hat-display`.

### 2.1 Lo que hay hoy (estado del código, no decisión)

| Pieza | Estado actual |
|---|---|
| Tema | No existe `src/theme.js`, ni `ThemeProvider`, ni `CssBaseline`. Todo usa el tema por defecto de MUI |
| `src/main.jsx` | `BrowserRouter` > `AuthProvider` > `MeProvider` > `App` + `<Toaster />` (react-hot-toast sin opciones) |
| `src/componentes/Layout.jsx` | `AppBar` fija arriba, `Drawer` de 220 px (permanent, o temporary con `useMediaQuery("(max-width:900px)")`), ítems sin íconos, `Toolbar` espaciador, `main` con `p: 3`. El menú sale de `accessibleRoutes(permisos)` |
| `src/auth/routes.js` | `PRIVATE_ROUTES` con `path`, `label`, `permiso` (sin `group`); `accessibleRoutes`, `initialRoute` |
| Estilos | `sx` sueltos en las 11 páginas (86 apariciones en `src/pages`), `boxShadow` repetido, colores fijos en `Login`, `AccountBlocked` y `Splash` |
| Clientes | `window.confirm` en `Clientes.jsx:252` (desactivar) y `:267` (reactivar) |
| Caja y Contratos | Ya existen (specs 09 y 10): `src/pages/Caja.jsx`, `src/componentes/caja/*`, `src/componentes/ocupaciones/*` (el prompt v3 los marcaba "A IMPLEMENTAR") |
| "Cargando…" y error de `/me` | Dentro de `src/auth/RequireAuth.jsx` (`Waiting`, `Alert` con "Reintentar") |
| Fuente | Sin fuente propia: la de MUI por defecto (Roboto) |

### 2.2 Lo que trae el diseño (relevamiento del 20/11/2026)

El archivo es un prototipo HTML propio de Claude Design, no React/MUI, de una sola línea y de 151 KB, con "tweaks". Se leyó con búsquedas acotadas: las **tablas de esta sección son el contrato**; los valores finos que no estén acá (relleno, tamaños de texto de una pantalla puntual) se piden al Orquestador (P-FM1).

**Tweaks: valores por defecto declarados por el propio archivo (`data-props`).** Son los vigentes.

| Tweak | Valor | Equivale a |
|---|---|---|
| `acento` | Marrón | `#6f4e37`, segundo `#4a2f1f`, claro (texto en oscuro) `#d9b99b` |
| `esquinas` | Suaves | Radio de tarjetas y diálogos **10 px** (**confirmado por el desarrollador**); campos `max(8, round(10 × .6))` = **6 px** |
| `formaBoton` | Redondeado | Radio de botón **12 px** (valor por defecto del render; el desarrollador dijo "como está en el diseño" y **no eligió**: se confirma contra su diseño en la verificación de la tanda 1, caso 18) |
| `rellenoBoton` | Sólido | Botón primario de color liso (no degradado) |
| `tarjetas` | Contorno | Borde de 1 px, sombra mínima |
| `tamanoTarjeta` | Mediana | Tarjeta de cochera de 220 × 200 en el diseño; **en el código la altura de 150 px de la 06 no cambia** (D-FM12) |
| `estiloMenu` | Píldora sólida | Ítem activo con fondo lleno y radio 12 |
| `estiloAlerta` | Panel lateral | Tarjeta de alerta con panel de severidad a la izquierda (arriba en mobile) |
| `tema` | Claro | El oscuro existe como segunda paleta |

La hoja "Tema" del propio diseño imprime "Redondeadas · Píldora" como valores: es un texto de respaldo viejo, el render usa Suaves y Redondeado. Los otros tweaks (`vista`, `dispositivo`, `rol`, `estado`, `pantallaEspecial`, `pestana`, `drawerAbierto`) son de la herramienta de diseño y no se implementan.

**Paleta (hex del diseño).** Cada tono de estado es `[texto, fondo, borde]`.

| Token | Claro | Oscuro |
|---|---|---|
| `app` (fondo de la app) | `#F6F3EE` | `#1A1A1A` |
| `surf` (tarjetas, diálogos) | `#ffffff` | `#212121` |
| `sunk` (fondo hundido, hover) | `#f0ebe4` | `#2a2a2a` |
| `act` (ítem seleccionado) | `#e9dccf` | `#2e2e2e` |
| `border` / `strong` | `#e6dfd5` / `#cfc4b6` | `#333333` / `#444444` |
| `text` / `muted` / `faint` | `#2a2018` / `#6b5d52` / `#85766a` | `#eef0f8` / `#a6abc4` / `#8a8faa` |
| `input` (fondo de campo) | `#ffffff` | `#12141c` |
| Sombra de tarjeta / de diálogo | `0 1px 2px rgba(60,40,25,.05)` / `0 24px 48px -20px rgba(60,40,25,.35)` | `0 14px 32px -18px rgba(0,0,0,.9)` / `0 30px 60px -20px rgba(0,0,0,.85)` |
| `ok` | `#2f6b4a` · `#eaf3ed` · `#c5dccd` | `#5ee3a1` · `rgba(94,227,161,.12)` · `rgba(94,227,161,.3)` |
| `wa` | `#85561a` · `#f8efdc` · `#e6d2a6` | `#ffc36b` · `rgba(255,195,107,.12)` · `rgba(255,195,107,.3)` |
| `er` | `#a03030` · `#f8eae8` · `#e8c6c2` | `#ff7f9b` · `rgba(255,127,155,.12)` · `rgba(255,127,155,.3)` |
| `oc` (ocupada, gris pizarra) | `#3f4650` · `#e9e8e6` · `#c2bfba` | `#b4b9c0` · `rgba(180,185,192,.12)` · `rgba(180,185,192,.3)` |
| `in` | `#3b4f6b` · `#ebf0f6` · `#cfd9e5` | `#93a5ff` · `rgba(147,165,255,.13)` · `rgba(147,165,255,.32)` |
| `vi` | `#5b4a7a` · `#eeeaf5` · `#d6cde6` | `#c4a3ff` · `rgba(196,163,255,.13)` · `rgba(196,163,255,.32)` |
| `pk` | `#8a3f5c` · `#f6e9ee` · `#e5c6d2` | `#ff92d0` · `rgba(255,146,208,.12)` · (borde sin relevar) |
| `de` (neutro) | `#5f554b` · `#f1ece5` · `#ddd4c8` | **sin relevar** (P-FM1) |

**Menú lateral.** Ancho **260 px** en desktop y **284 px** en el drawer mobile. Fondo claro `#DCCFB8` y oscuro `#242424`. Texto claro `#2a2620` y oscuro `#f4efe4`; ítem activo: fondo `rgba(252,248,238,.72)` (claro) o `#E6E3DE` con texto `#242424` (oscuro); radio 12; peso 600 y 700 el activo. Cabecera de migas: fondo `#E6E3DE` (claro) o `#262626` (oscuro). Un punto de color por ítem, de la lista `#6d7cff #2fc58a #f0a935 #f2557a #a274f5 #e2589f #22b0d6 #f08a3e #7cc23f #5b8cff #e8b923`.

**Componentes de MUI por pantalla** (campo `S.<pantalla>.mui` del archivo, tal cual lo declara el diseño):

| Pantalla | Declarado en el diseño |
|---|---|
| Panel (`S.dash`) | Typography h4/body2, plano embebido como vista principal, ToggleButton, Grid (4/2 col.), Card con fondo del color del estado, Chip, LinearProgress, Skeleton |
| Monitor (`S.mon`) | Typography h4, Button outlined/contained, LinearProgress, **Accordion por sección**, Grid 12 / md 2,4, Card con fondo de color (KpiCard), Card con borde error, Chip, Alert + Button, Skeleton, Tooltip. Widget Caja: Card, Chip, Alert |
| Cocheras (`S.coch`) | Typography, Button contained, TextField size=small, Divider, Grid (2/3/4/6 col.), Card outlined clicable (borde 2 px), Chip, Skeleton ×12, Alert + Button. Detalle: Dialog `md` (fullScreen en xs) |
| Ocupaciones (`S.ocup`) | Typography, Button contained/outlined (size large en acciones de tarjeta), Card outlined, TextField select/date, Autocomplete, Chip color por fase, Alert warning (tope), Skeleton ×6. Filtros: Grid 1/2/4 col. Tarjeta: Stack `{xs: column, sm: row}` |
| Clientes (`S.cli`) | Typography, Button, TextField size=small, Card outlined (barra de paginación y filas), Chip, Dialog (confirmación y alta/edición), Skeleton ×6 |
| Tarifas (`S.tar`) | Typography h5, Button, Card (vigentes / historial), Chip, TextField select, Divider, Dialog de 2 pasos |
| Trazabilidad (`S.traz`) | Typography, Alert (enlace y rango), Card outlined con TextField date/select múltiple/Autocomplete, Table size=small + TablePagination (50), Chip, LinearProgress, Skeleton, Dialog `md` con Switch |
| Alertas (`S.alert`) | Typography, Button, Card (borde error en Crítica abierta), Chip, TextField select/date, Chip borrable, TablePagination, Tooltip sobre Button deshabilitado, Dialog `sm` |
| Caja (`S.caja`) | Typography, Tabs/Tab, Button, Chip (modo y estado), Card, Alert warning (día anterior), Table size=small + TablePagination, Dialog (fullScreen en xs), Skeleton |
| Configuración (`S.conf`) | Typography, Alert (info / warning conflicto), Paper outlined, TextField select/number con helperText, Button contained (Guardar) + text (Descartar), Dialog `sm`, Skeleton ×6; sin permiso, campos `disabled`. Ancho máximo 800 |
| Usuarios (`S.usu`) | Typography, Alert warning cerrable, Button, TextField size=small, Switch + FormControlLabel, Table size=small, IconButton MoreVert + Menu/MenuItem, Chip, Dialog `xs` |
| "No tenés permiso" / "Sin acceso" | Alert warning (máx. 520) / Typography h5 + Alert info (máx. 520), dentro del layout |

**Hoja de decisiones del diseño** (4 líneas): íconos de `@mui/icons-material` (`Menu` hamburguesa, `KeyboardArrowDown` en el select, `MoreVert` acciones, `ExpandMore` secciones) y un punto de color por ítem del menú; tablas `size="small"` con hasta 6 columnas, que en 360 px ocultan las secundarias y hacen scroll propio; en Usuarios la fila propia no lleva ⋮ y la desactivada va al 55 %; los rótulos de Caja y Contratos son provisorios. Además el diseño declara "chips tipo píldora, pestañas segmentadas, sombras suaves y color de acento en la acción primaria y el ítem activo del menú; Cobrar y Finalizar en verde".

**Qué falta y qué sobra respecto del prompt v3.** Todas las pantallas y diálogos del v3 están en el diseño (incluida la pantalla "Arranque"). Sobra o cambia: "Registrar ingreso" (atajo, D-FM10), los acordeones del Monitor y los botones del Panel (DV-FM4), matrícula y tipo de vehículo (DV-FM3) y el rótulo "Panel" (la app dice "Dashboard"). El plano posicional y su editor **se replican** (tanda 5, D-FM16), con la persistencia que pide PB-24. El diseño llega a Configuración por un engranaje del menú de usuario; la app **copia el engranaje** y además deja Configuración como ítem de Administración (D-FM8, D-FM9).

## 3. Decisiones

Prefijo **D-FM** ("frontend, modelo visual"). Estado: **Confirmada** (la tomó el desarrollador) o **Propuesta**. Código y nombres en inglés; textos visibles y comentarios en español rioplatense.

### 3.1 Forma del trabajo

**D-FM1 (20/11/2026) — Propuesta. Rama y ejecución.** La spec vive en `feature/specs-etapa7`. La ejecución va en `feature/front-diseno`, en el repo principal (`parkingcontrol-front`, **sin worktree**), creada desde `develop` (se confirma con `git branch -a` pidiéndole el comando al Orquestador), con **un commit por tanda** (4 commits) y un PR a `develop`. Al terminar **cada tanda** se corren `npm test`, `npm run lint` y `npm run build` en PowerShell. El ejecutor **no corre git**: reporta los archivos tocados y el Orquestador pide el commit. Antes del PR, `git rebase develop`.

**D-FM2 (20/11/2026) — Propuesta. Solo lo visual.** No cambian lógica, permisos, textos de la API ni endpoints. Siguen rigiendo las reglas de `CLAUDE.md`: fechas en la zona del tenant (`useTenantDates`), `formatMoney`, `can()`, `showApiError`, enums con `labelOf`/`colorOf`, y **sin `localStorage`** (ARQ-1). Los textos visibles no se tocan (se reutilizan los que ya hay). Si el diseño contradice una de esas reglas o agrega algo que no existe, **no se copia**: va a la sección 4 como desvío o pregunta. Las excepciones de comportamiento son DV-FM1, DV-FM2 y DV-FM7 (la función nueva de editar el plano, en la tanda 5).

### 3.2 Tema

**D-FM3 (20/11/2026) — Confirmada. `src/theme/theme.js` con `getTheme(mode)`.** Exporta `getTheme("light" | "dark")` (`createTheme`) y las paletas como constantes del módulo (`PALETTE`, con las tablas de 2.2). Sale de "Parking Oficial", no de `parkingcontrol-theme.js`. Contenido:

| Parte | Valor |
|---|---|
| `shape.borderRadius` | `RADIUS = 10` (constante exportada; campos 6, botones `BUTTON_RADIUS = 12`) |
| `spacing` | 8 |
| `palette.primary` | `main` `#6f4e37`, `contrastText` `#fff`; en oscuro `light` `#d9b99b` para texto y enlaces de acento |
| `palette.success / warning / error / info` | `main` = texto del tono `ok / wa / er / in`; `light` = fondo; en el tema también el borde, en `palette.pc.tone` |
| `palette.secondary` | tono `vi` (la fase Reserva usa `secondary`, v3 sección 3) |
| `palette.background` / `divider` / `text` / `action` | `default` = `app`, `paper` = `surf`, `divider` = `border`, `text.primary/secondary` = `text/muted`, `action.selected` = `act`, `action.hover` = `sunk` |
| `palette.pc` (propio) | `{ side, sideText, sideAct, sideOnAct, crumbBg, sunk, strong, faint, input, shadow, dialogShadow, tone: { ok, wa, er, oc, in, vi, pk, de } }` para lo que MUI no tiene |
| `typography` | `fontFamily` `'"Red Hat Display", system-ui, sans-serif'`; tamaño base y escala **provisorios** (P-FM1): mínimo 16 px, `h4` 600, números grandes 800 con `fontVariantNumeric: "tabular-nums"` |
| `components` | `MuiCssBaseline`, `MuiAppBar` (solo mobile), `MuiDrawer`, `MuiListItemButton`, `MuiCard` (`variant="outlined"` por defecto), `MuiPaper`, `MuiButton`, `MuiIconButton`, `MuiChip`, `MuiTextField`/`MuiOutlinedInput`, `MuiFormHelperText`, `MuiDialog`/`MuiDialogTitle`/`MuiDialogActions`, `MuiTableCell`, `MuiAlert`, `MuiTabs`/`MuiTab`, `MuiSkeleton`, `MuiTooltip`, `MuiMenu`, `MuiDivider`, `MuiSwitch` |

*Motivo:* el `parkingcontrol-theme.js` del proyecto de diseño es una versión anterior (Geist, grises) que contradice a "Parking Oficial".

**D-FM4 (20/11/2026) — Confirmada (Ocupada en `oc`) / Propuesta (resto). Estados semánticos y chips.** Los chips siguen usando `colorOf` de `enums.js`, que devuelve el nombre de un color de la paleta (`success`, `warning`, `error`, `info`, `secondary`, `default`). **Un solo cambio en `enums.js`:** `EstadoCochera.OCUPADA` pasa de `color: "warning"` a `color: "oc"` (la pizarra del diseño, decisión del desarrollador del 20/11/2026), y `oc` se registra en el tema como color propio (`palette.oc` con `main`, `light` y `contrastText`, y el `Chip` lo pinta con el tono `oc`). **Sin mapas locales en las páginas**: Cocheras, el detalle, el plano y la leyenda leen `colorOf` y nada más. Los demás valores de `enums.js` no cambian. El tema pinta cada color con el tono del diseño: `colorSuccess` = `ok`, `colorWarning` = `wa`, `colorError` = `er`, `colorInfo` = `in`, `colorSecondary` = `vi`, `colorDefault` = `de`; `variant="outlined"` queda sin fondo. Forma de píldora (`borderRadius: 999`), alto 28. El tono `pk` se usa solo donde el diseño lo usa y `colorOf` no alcanza, con `sx` que lea `theme.palette.pc.tone`. **Un test cubre el contrato** (`test/unit/constants/enums.test.js`, se crea o se amplía): `colorOf(EstadoCochera, EstadoCochera.OCUPADA)` es `"oc"`, y todo `color` que declara un enum es `"default"` o una clave de la paleta de `getTheme("light")` y de `getTheme("dark")` (así un color que el tema no conoce rompe el test y no se ve gris sin aviso). Si el `Chip` de MUI 7 no toma `oc` solo, se agrega una `variant` de `MuiChip` con `props: { color: "oc" }`. Las tablas de colores de v3 sección 3 siguen vigentes. Alert: `standard*` con el fondo y borde del tono; `Panel lateral` en las tarjetas de alerta de la pantalla Alertas (D-FM12).

**D-FM5 (20/11/2026) — Confirmada. Un único `ThemeProvider` en `main.jsx`.** Un componente `src/theme/ThemeRoot.jsx` envuelve **todo** (de `BrowserRouter` hacia adentro, incluido el `Toaster`): `ThemeProvider`, `CssBaseline` y el estado del modo. Así Splash, Login, Callback y AccountBlocked, que están fuera del `Layout`, también toman el tema. No hay otro `ThemeProvider` en el código ni `createTheme` fuera de `theme.js`. El `Toaster` de react-hot-toast **se queda** (ya aprobado): un `ThemedToaster` interno lo configura con `toastOptions` desde `useTheme()` (fondo `paper`, borde `divider`, texto `text.primary`, íconos de éxito y error con `ok` y `er`), sin tocar `showApiError` ni los ~20 `toast.*`.

**D-FM6 (20/11/2026) — Confirmada. Claro y oscuro, con selector.** El modo sale de `useMediaQuery("(prefers-color-scheme: dark)")` y **no se guarda** (ARQ-1). El diseño no trae un selector de modo para el usuario (el modo es un tweak de la herramienta de diseño), pero el desarrollador pidió uno: en el menú de usuario, "Tema: Automático / Claro / Oscuro", con **Automático por defecto** (sigue `prefers-color-scheme`), el estado **solo en memoria** (`ColorModeContext` en `src/theme/`) y el aviso "No se guarda: al recargar vuelve al del sistema". En la verificación de cada tanda se revisan las **dos paletas**.

**D-FM7 (20/11/2026) — Confirmada. Fuente.** `@fontsource/red-hat-display` (pesos 400, 500, 600, 700 y 800), importado en `main.jsx`, sin llamadas externas. La dependencia la instala **el usuario**, con el comando exacto del paso 1.2: `npm install @fontsource/red-hat-display`, corrido en `parkingcontrol-front`. El ejecutor no corre `npm install`: se lo pide al Orquestador.

### 3.3 Shell y menú

**D-FM8 (20/11/2026) — Confirmada. Shell nuevo, replica el diseño.** El diseño no tiene `AppBar` en desktop y el desarrollador pidió replicarlo. Se reescribe `Layout.jsx` en piezas de `src/componentes/shell/`:

| Pieza | Qué hace |
|---|---|
| `MenuLateral.jsx` | Menú de **260 px** a alto completo (`Drawer permanent`), de color sólido (`palette.pc.side`), con los tres grupos plegables (`ExpandMore`; el estado de plegado vive en memoria), un punto de color por ítem y el ítem activo en píldora (radio 12). En **< 900 px** es `Drawer temporary` de 284 px, que se cierra al navegar (como hoy) |
| `CabeceraMigas.jsx` | Solo desktop: "Grupo › Pantalla" arriba del contenido (`palette.pc.crumbBg`). El título de la pantalla sale del `label` de `PRIVATE_ROUTES` |
| `MenuUsuario.jsx` | Abajo en el menú lateral (arriba a la derecha en la barra mobile): avatar con iniciales, nombre y local (`useMe().me`, igual que hoy), `Menu` con "Salir" (la misma función `salir` de hoy) y el selector de tema (D-FM6). Junto al avatar, un **engranaje** (`IconButton`, ícono `Settings`, `aria-label` "Configuración") que lleva a `/configuracion` |
| `BarraSuperior` (en `Layout.jsx`) | Solo en **< 900 px**: `AppBar` con hamburguesa (`Menu`), título "ParkingControl" y `MenuUsuario` |

El `main` pierde el `Toolbar` espaciador en desktop y conserva `p: 3` (mobile: 2). **No cambian** `RequireAuth`, `RequirePermission`, rutas ni permisos. El engranaje y el ítem "Configuración" de Administración (D-FM9) son **dos entradas a la misma ruta** y se ven **solo con `can("configuracion.ver")`**; ninguna de las dos es una ruta o un permiso nuevo.
*Motivo:* es la estructura del diseño. *Descartada:* conservar la `AppBar` fija en desktop y solo estilarla (costo bajo, pero el shell deja de parecerse al diseño).

**D-FM9 (20/11/2026) — Confirmada. Menú en tres grupos.** `PRIVATE_ROUTES` suma un campo `group` y se reordena al orden del diseño; los **11 ítems, sus nombres y sus permisos no cambian** (el ítem sigue diciendo "Dashboard", no "Panel").

| Grupo | Ítems (en este orden) |
|---|---|
| Operación | Dashboard, Monitor operativo, Ocupaciones, Alertas operativas (y el atajo "Registrar ingreso" entre Dashboard y Monitor, D-FM10) |
| Gestión | Cocheras, Clientes, Tarifas, Caja |
| Administración | Usuarios, Trazabilidad, Configuración |

Además del ítem, el engranaje del menú de usuario (D-FM8) lleva a `/configuracion`; las dos entradas se ven solo con `can("configuracion.ver")`. `routes.js` exporta `MENU_GROUPS` (los tres rótulos, en orden) y la función pura `menuGroups(permisos, shortcuts)`, que devuelve `[{ label, items }]` solo con lo que el usuario puede ver y **sin grupos vacíos**. `accessibleRoutes` e `initialRoute` siguen existiendo y siguen devolviendo la primera ruta accesible; el reordenamiento no cambia la ruta inicial de ninguno de los cuatro roles (todos tienen `panel.ver`, v3 sección 8.1; DV-FM2). Test en `test/unit/auth/routes.test.js`: cada ruta tiene `group` válido, el orden, un grupo sin ítems accesibles no aparece, el atajo se oculta sin `ocupaciones.crear`.

**D-FM10 (20/11/2026) — Confirmada. Atajo "Registrar ingreso".** Un ítem del menú, **no una ruta ni un permiso nuevos**: lleva a `/ocupaciones?nueva=1` y se ve solo con `can("ocupaciones.crear")`. `Ocupaciones.jsx` lee el parámetro, abre `AltaOcupacionDialog` y **lo limpia** (`replace`) al abrirlo, para que "atrás" y recargar no lo reabran; es el patrón de `?id=N`. `src/utils/ocupacionLink.js` suma `buildNuevaOcupacionPath()` y `hasNuevaFlag(search)` (puras, con test). Nunca se arma el string a mano. El atajo no queda "seleccionado" en el menú.

### 3.4 Pantallas, clientes y plano

**D-FM11 (20/11/2026) — Propuesta. Pantallas de sistema.** Arranque (`Splash.jsx`), Login, Cargando (`Waiting` en `RequireAuth.jsx`), Cuenta bloqueada (`AccountBlocked.jsx`, tres variantes por el texto del backend), error de `/me` (en `RequireAuth.jsx`), "No tenés permiso" (`Forbidden.jsx`) y "Sin acceso" (`NoAccess.jsx`) toman colores del tema: se sacan `#f6f8fb`, `#0b0f17` y los `boxShadow` fijos a favor de `background.default`, `divider` y `palette.pc`. Los textos no cambian. El Splash conserva el logo (`src/assets/logo.jpg`) y su fondo propio, que sale de un token del tema (`palette.pc.splashBg`, un valor para cada modo, a relevar en P-FM1).

**D-FM12 (20/11/2026) — Propuesta. Pantallas, por tandas.** Qué cambia en cada una (qué componentes de MUI, con qué props) está en la sección 6, junto con su tanda. Reglas de todas: (1) `Card` y `Paper` salen del tema (`variant="outlined"` por defecto): se borran los `boxShadow`, `borderRadius` y `borderColor` sueltos de las páginas; (2) los chips de estado no se tocan (D-FM4); (3) botones: `contained` primario de color de acento, **"Registrar pago", "Finalizar" y "Desbloquear" en `success`** y los destructivos en `error` (como hoy y como en el diseño); en acciones de tarjeta de Ocupaciones, `size="large"`; (4) el alto de la tarjeta de cochera sigue siendo el de la 06 (150 px); (5) todos los diálogos usan `fullScreen` por debajo de `sm` (`useMediaQuery(theme.breakpoints.down("sm"))`) o la regla equivalente del tema; (6) tablas `size="small"`, y en 360 px se ocultan las columnas secundarias y la tabla hace scroll propio (ya lo hacen la sección Pagos y Trazabilidad: se mantiene); (7) skeletons con la forma de cada contenido, como hoy; (8) un `sx` queda solo si es de **layout** (grilla, ancho, alineación): nunca color, radio ni sombra.

**D-FM13 (20/11/2026) — Confirmada. Clientes: `window.confirm` → `Dialog`.** Un `src/componentes/ConfirmDialog.jsx` genérico (`title`, `message`, `confirmLabel`, `confirmColor`, `loading`, `onConfirm`, `onClose`) reemplaza los dos `window.confirm` de `Clientes.jsx`. **Mismo texto**: `¿Desactivar a "{nombre}"?` y `¿Reactivar a "{nombre}"?`; botones "Cancelar" y "Confirmar" (rojo en desactivar, verde en reactivar). La acción no cambia: sigue llamando a las mismas funciones y mostrando "Cliente desactivado" / "Cliente reactivado". El botón de confirmar se deshabilita mientras envía y el diálogo no se cierra con clic afuera mientras envía.

**D-FM14 (20/11/2026) — Propuesta. Plano provisorio en grilla por número (tanda 2).** El plano **posicional** del diseño necesita datos que no existen (PB-24, sección 4.3) y no puede guardarse en el navegador (ARQ-1). Hasta que PB-24 esté, la pantalla Cocheras tiene una versión **solo con datos que ya existen** (`GET /Cochera`: número, estado y ocupación activa), de modo que las tandas 1 a 4 no esperan al backend: suma `Tabs` "Tarjetas" y "Plano". "Tarjetas" es la grilla de la 06, estilada. "Plano" es un mosaico por número (`PlanoGrilla.jsx`): cada cochera es un cuadrado clicable con su número y el color del estado que devuelve `colorOf(EstadoCochera, …)` (`success` disponible, `error` bloqueada, `oc` ocupada, `info` reservada), sin mapa local, con la **misma lista ya cargada** (cero pedidos nuevos) y el mismo diálogo de detalle al hacer clic. Chips de leyenda arriba, como en el diseño. No muestra matrícula ni tipo de vehículo, ni "con deuda" (esa marca llega con la tanda 5, D-FM16). El Dashboard **conserva sus 6 tarjetas** hasta la tanda 5. Con PB-24, el plano posicional **reemplaza** a esta pestaña (D-FM16).

**D-FM16 (20/11/2026) — Confirmada (alcance) / Propuesta (forma). Plano posicional por niveles, tanda 5.** El desarrollador quiere el plano **igual que en Claude Design**: plano por niveles, pestaña "Plano" en Cocheras, plano como **vista principal del Dashboard** y el editor "Editar configuración del garage" (`cocheras.gestionar`). Es una función nueva (no solo visual: DV-FM7) y **depende de PB-24** (contrato propuesto en la sección 4.3). Piezas:

| Pieza | Qué hace |
|---|---|
| `src/api/planoApi.js` | `getPlano()` y `putPlano(body)` en el patrón D-FB14 (devuelven `data`, no capturan errores) |
| `src/utils/plano.js` (pura) | `emptyPlano()`, `validatePlano` (forma y límites, no reglas de negocio), `buildPlanoView(plano, cocheras, ocupaciones)` (por nivel: lugares con estado, cliente y marca de deuda; cocheras "sin ubicar"), operaciones del editor (`addElemento`, `moveElemento`, `resizeElemento`, `rotateElemento`, `removeElemento`, `assignCochera`, `addNivel`, `renameNivel`, `removeNivel`) |
| `src/componentes/plano/PlanoView.jsx` | Solo lectura: lienzo en CSS grid (una celda por unidad), `Tabs` si hay más de un nivel, lugares coloreados por estado con `colorOf(EstadoCochera, …)` (sin mapa local), número de cochera, cliente abreviado, marca "con deuda"; muros, columnas y portones neutros; clic en un lugar abre el detalle de la cochera |
| `src/componentes/plano/PlanoEditor.jsx` | "Editar configuración del garage": paleta (Lugar, Muro, Columna, Portón), mover, redimensionar, rotar y borrar con ajuste a la grilla; teclado equivalente (flechas mueven, `Supr` borra, `R` rota); asignar una cochera a un lugar; agregar, renombrar y quitar niveles; "Guardar" y "Descartar"; "← Volver al plano". Estado **solo en memoria** hasta guardar |
| Cocheras | La pestaña "Plano" pasa de la grilla provisoria al `PlanoView`, con el botón "Editar configuración del garage" (solo con `can("cocheras.gestionar")`). La grilla provisoria se borra |
| Dashboard | **Plano como vista principal**. Los **6 números de la API no se pierden**: quedan en una fila de tarjetas compactas arriba del plano, siempre visibles (los botones Inventario/Vencimientos del diseño que las esconden no se copian, DV-FM4). Sin plano guardado (`niveles: []`): se ve "Todavía no hay plano", las 6 tarjetas y, con `cocheras.gestionar`, el botón "Armar el plano". **Hasta que PB-24 esté, el Dashboard conserva sus 6 tarjetas como hoy** |

Reglas: (1) **sin `localStorage`** ni `sessionStorage` (ARQ-1); la persistencia es `PUT /Cochera/plano`; (2) `version` se manda tal cual vino; un **409 `plano_modificado`** muestra el `title` del backend (`showApiError`), un `Alert warning` "Otra persona guardó cambios antes que vos" y un botón "Recargar plano" que **descarta** lo editado (como `Configuracion.jsx`); (3) el backend decide las reglas (cochera repetida o inexistente, límites): los errores 400 de campo vuelven marcados en el editor; (4) los permisos se ocultan, no se deshabilitan; (5) ninguna cifra se calcula en el cliente: la marca "con deuda" compara el `saldo` que manda `GET /Ocupacion` con cero; (6) una cochera que existe y no está en ningún lugar del plano aparece en "Cocheras sin ubicar" debajo del plano, y no se pierde.

**"Con deuda".** Sale de `saldo > 0` de la ocupación activa de la cochera (`GET /Ocupacion`, la misma consulta de activas de la pantalla Ocupaciones, que ya trae `saldo`); `GET /Cochera` no lo trae. Eso suma **un pedido** al Dashboard y a la pestaña "Plano" (se unen por `ocupacionId`). Si la lista llega al tope (`isTruncated`, PB-10), la marca **no se muestra** en lugar de adivinar, con un aviso chico. **Decidido por el desarrollador (P-FM10):** en una ocupación por hora o por día **en curso** el saldo "hasta ahora" es normal, no deuda; se marca solo si la ocupación es de tipo Mes con saldo, o está **Vencida** con saldo.

### 3.5 Código

**D-FM15 (20/11/2026) — Propuesta. Lógica pura probada con Vitest.** `test/unit/theme/theme.test.js` (prueba que `getTheme("light")` y `getTheme("dark")` tienen todos los tonos, que el contraste texto/fondo de cada tono pasa un mínimo y que `RADIUS`, `BUTTON_RADIUS` y la fuente son los esperados), `test/unit/auth/routes.test.js` (D-FM9), `test/unit/utils/ocupacionLink.test.js` (D-FM10) y, en la tanda 5, `test/unit/utils/plano.test.js` y `test/unit/api/planoApi.test.js` (D-FM16). No se prueba React ni MUI (las pantallas se verifican a mano, sección 7).

## 4. Desvíos y pendientes

### 4.1 Desvíos

| Id | Fuente | Qué dice la fuente | Qué se construye | Motivo | Condición de vuelta |
|---|---|---|---|---|---|
| DV-FM1 | D-FM2 ("solo visual") | La 13 no cambia comportamiento | `Ocupaciones.jsx` abre el alta con `?nueva=1` y limpia el parámetro | Lo pidió el desarrollador: es el atajo "Registrar ingreso" (D-FM10). Es lo único de comportamiento nuevo, y no suma ruta ni permiso | — |
| DV-FM2 | `routes.js`, `initialRoute` | La ruta inicial es la primera accesible, en el orden del mapa | `PRIVATE_ROUTES` se reordena al orden de los grupos | El menú agrupado lo exige. No cambia la ruta inicial de ningún rol real (los cuatro tienen `panel.ver`) | — |
| DV-FM3 | Diseño, plano y "Registrar ingreso" | Muestran matrícula, tipo de vehículo ("Auto") y un modo rápido | No se copian. **"Con deuda" sí** (sale de `saldo > 0`, D-FM16) | Matrícula y tipo no existen en la API ni en las specs; v3 regla 1 ("no inventes"). Quedan como **candidato a PB-25** (sección 4.3), sin pedir todavía | Cuando el desarrollador pida PB-25 |
| DV-FM4 | Diseño, Monitor y Panel | Acordeones por sección en el Monitor; botones Inventario/Vencimientos que despliegan paneles en el Panel | No se copian: el Monitor sigue con sus indicadores a la vista y los 6 números del Dashboard quedan siempre visibles (tarjetas compactas arriba del plano, D-FM16) | Esconderían números urgentes (v3 sección 9, prioridad 2) y no estaban en el v3. Decisión del desarrollador | Si los pide, se suman en una spec visual aparte |
| DV-FM5 | D-FM14 y D-FM16 | El diseño tiene el plano como vista principal del Dashboard | Hasta PB-24 el Dashboard conserva sus 6 tarjetas; con el plano pasa a ser la vista principal | El plano posicional necesita backend (PB-24) | PB-24 en el backend y la tanda 5 |
| DV-FM7 | D-FM2 ("solo visual") | La 13 no agrega funciones | La tanda 5 agrega editar y guardar el plano del garage (`PUT /Cochera/plano`) y leerlo | Lo pidió el desarrollador: plano "igual que en Claude Design" | — |
| DV-FM6 | Diseño, `parkingcontrol-theme.js` | Tema v7 claro/oscuro con Geist | No se usa | Contradice a "Parking Oficial" (D-FM3) | — |

### 4.2 Pendientes

**Preguntas de la hoja de decisiones de Claude Design.** El diseño no entregó los `.md`; sus preguntas se responden acá, todas como **Propuesta**:

| Id | Pregunta | Respuesta propuesta |
|---|---|---|
| P-FM-D1 | ¿Qué íconos se usan? | `@mui/icons-material`: `Menu` (hamburguesa), `KeyboardArrowDown` (flecha del select, es el ícono por defecto de MUI), `MoreVert` (acciones), `ExpandMore` (grupos y secciones). Sin íconos por ítem de menú: un punto de color (lista de 2.2, uno por ruta, en `src/theme/navStyle.js` indexado por `path`) |
| P-FM-D2 | ¿Densidad de tablas? | `size="small"`, hasta 6 columnas; en 360 px se ocultan las secundarias y la tabla scrollea sola (D-FM12) |
| P-FM-D3 | ¿Orden visual de las acciones? | Primaria a la derecha en diálogos; en tarjetas de ocupación: "Ver" a la izquierda, después las primarias (Registrar pago, Cancelar reserva, Finalizar), como hoy |
| P-FM-D4 | ¿Rótulos de Caja y Contratos provisorios? | Se dejan como están en el código (ya ejecutados en las 09 y 10) |

**Del desarrollador o del Orquestador (no frenan el borrador).**

| Id | Pendiente | Paso |
|---|---|---|
| P-FM1 | **Valores finos del diseño sin relevar**: tono `de` en oscuro, borde de `pk` en oscuro, escala tipográfica exacta, radio de `Dialog` y color del fondo del Splash. El archivo es de una sola línea y no se pudo leer entero. **El Orquestador le pidió al usuario el export** de `Parking Oficial.dc.html` a `C:\Users\Equipo\source\repos\FrontParking\diseno\` (fuera del repo del front) para que el ejecutor lo busque con Grep. **Mientras no esté**, el ejecutor usa los valores provisorios de D-FM3 y los anota | 1 |
| P-FM2 | **Cerrado (20/11/2026).** Shell de D-FM8 confirmado por el desarrollador (se replica el diseño, con engranaje) | — |
| P-FM3 | **Cerrado (20/11/2026).** Va el selector "Automático / Claro / Oscuro" en el menú de usuario, en memoria y con el aviso "no se guarda"; Automático por defecto (D-FM6) | — |
| P-FM4 | **Cerrado (20/11/2026).** "Ocupada" toma la pizarra `oc` del diseño: `EstadoCochera.OCUPADA.color` pasa a `"oc"`, `oc` se registra en el tema y un test de `colorOf` lo cubre (D-FM4) | — |
| P-FM5 | **Cerrado (20/11/2026).** El plano sí va como vista principal del Dashboard, en la tanda 5 y con PB-24 (D-FM16) | — |
| P-FM6 | **Aprobado (20/11/2026).** La sección "Tema y estilos" de `CLAUDE.md` (el tema es `getTheme`, un único `ThemeProvider`, sin colores sueltos en las páginas) se agrega **al cerrar la tanda 4** | 4 |
| P-FM7 | **PB-24: pedido de backend del plano posicional.** El contrato propuesto está en la sección 4.3, listo para pasarle al chat del backend. Bloquea solo la tanda 5 | 5 |
| P-FM8 | Datos de prueba: con `dueno@demo.test`, `encargado@demo.test`, `operado@demo.test` y un auditor si existe (para ocultar acciones) y un mensual con saldo a favor para ver las alertas de dinero | 2 a 4 |
| P-FM9 | ¿Una regla de ESLint que prohíba `#hex` y `rgba(` en `src/` fuera de `src/theme/`? Propuesta: **no** en esta spec; se verifica con una búsqueda (sección 7) | 4 |
| P-FM10 | **Cerrado (20/11/2026).** "Con deuda" en el plano: solo mensuales con saldo y vencidas con saldo (D-FM16) | — |
| P-FM11 | **Forma del botón** (Redondeado 12 px o Píldora): el desarrollador no eligió; el valor por defecto del render es Redondeado. Se confirma contra su diseño en la verificación de la tanda 1 (caso 18). Está en una constante (`BUTTON_RADIUS`) | 1 |
| P-FM12 | Dónde van los 6 números del Dashboard cuando el plano es la vista principal: la spec los pone en una fila de tarjetas compactas **arriba** del plano, siempre visibles | 5 |
| P-FM13 | **Ids de PB-24.** Supuesto del front: manda ids temporales para niveles y elementos nuevos y el backend devuelve los definitivos en la respuesta del `PUT`. **La decisión final es del backend.** Si el contrato real difiere (por ejemplo, reemplazo total sin ids estables), la tanda 5 **frena** y se ajusta `plano.js` antes de seguir | 5 |

### 4.3 Propuesta de pedido de backend: PB-24 (plano del garage) y candidato PB-25

**Para pasar al chat del backend.** Backend: `/api/v1`; errores como Problem Details con `code` (como el resto de la API).

**PB-24 — Guardar el plano del garage.**

*Problema.* El diseño "Parking Oficial" muestra el garage como un plano por niveles (lugares, muros, columnas y portones) y trae un editor para armarlo. El backend no guarda ninguna disposición: `GET /Cochera` trae solo `id`, `numero`, `estado` y `ocupacionActiva`. El front no puede guardarla en el navegador (ARQ-1: sin `localStorage`).
*Efecto en el front.* Sin esto, el plano queda como una grilla por número (D-FM14) y no hay editor.

*Modelo (un plano por tenant).* Unidades en **celdas enteras de una grilla**, no en píxeles (sin decimales ni redondeos entre pantallas).

```
Plano    { version: base64, niveles: Nivel[] }
Nivel    { id: int, nombre: string (1..40), ancho: int (1..200), alto: int (1..200), orden: int, elementos: Elemento[] }
Elemento { id: int, tipo: "LUGAR" | "MURO" | "COLUMNA" | "PORTON",
           x: int, y: int, ancho: int, alto: int  (en celdas; x e y desde la esquina superior izquierda del nivel),
           rotacion: 0 | 90 | 180 | 270,
           cocheraId: int | null  (solo en LUGAR; id estable de la cochera, no su número) }
```

Límites propuestos: hasta 10 niveles y 500 elementos por nivel; cuerpo de hasta 256 KB.

*Endpoints.*

| Endpoint | Permiso | Cuerpo | Respuesta |
|---|---|---|---|
| `GET /Cochera/plano` | `cocheras.ver` | — | 200 `Plano`. Sin plano guardado: 200 con `niveles: []` y una `version` inicial (no 404: el front muestra "Todavía no hay plano") |
| `PUT /Cochera/plano` | `cocheras.gestionar` | `{ version*, niveles }` (el plano completo; **reemplaza** el anterior) | 200 `Plano` con la `version` nueva |

*Concurrencia.* Igual que `/Configuracion`: la `version` viaja tal cual vino, **cambia siempre** al guardar (aunque no cambie nada) y una `version` vieja da **409 `plano_modificado`** (si falta, 400). El front muestra el `title`, avisa "Otra persona guardó cambios antes que vos" y ofrece recargar (descarta lo editado).

*Validaciones (las decide el backend; el front solo valida forma y límites).* 400 `datos_invalidos` con `errors.Niveles`: tipo o rotación inválidos; un lugar fuera de los límites de su nivel; límites de cantidad y de tamaño; nombre vacío o repetido; `cocheraId` que no existe en el tenant; **una misma cochera en más de un lugar**. Solapamiento entre elementos: **no se valida** (es solo visual). Un `cocheraId` en un elemento que no es `LUGAR`: 400.

*Qué pasa con las cocheras.*
- **Renumerar** una cochera no rompe el plano: se referencia el `id`, y el plano muestra el número actual.
- **Cochera sin lugar** en el plano: permitido (el front la lista en "Cocheras sin ubicar").
- **Lugar sin cochera** (`cocheraId: null`): permitido mientras se edita; se ve gris.
- **Borrar una cochera** (hoy no hay endpoint; si se agrega): el backend deja `cocheraId: null` en su lugar, sin error, y cambia la `version` del plano para que un editor abierto reciba el 409 y recargue; el front muestra el lugar sin cochera.

*Trazabilidad.* El `PUT` debería registrarse en la línea de tiempo (Fuente Auditoría, acción Editar) con el resumen de lo cambiado.

*Fuera del pedido:* historial de versiones del plano, importar o exportar, varios planos por tenant, validar solapamientos.

**Ids (supuesto del front, P-FM13; la decisión es del backend).** El front manda ids temporales para los niveles y elementos nuevos y el backend devuelve los definitivos en la respuesta del `PUT`. Si el backend prefiere otro esquema, la tanda 5 frena hasta ajustar `plano.js`.

**Candidato a PB-25 (no se pide todavía).** Matrícula (`patente?`) y tipo de vehículo (`tipoVehiculo?`) en la ocupación (alta y listados), que hoy no existen y que el plano del diseño muestra. Se anota para que el desarrollador decida si los quiere; sin esto, el plano no los muestra.

**Sobre "con deuda" (no requiere backend nuevo).** Sale de `saldo > 0` de la ocupación activa (`GET /Ocupacion`, que ya trae `saldo`; `GET /Cochera` no lo trae). Cuesta un pedido más y se une por `ocupacionId`. Si el desarrollador quiere evitarlo, un pedido futuro sería sumar `saldo` (o `conDeuda`) a `ocupacionActiva` de `CocheraListItem`.

## 5. Inventario

Rutas relativas a la raíz del repo del frontend.

### 5.1 Se crean

| Pieza | Dónde | Decisión |
|---|---|---|
| Tema | `src/theme/theme.js` | D-FM3, D-FM4 |
| Montaje del tema, modo y `Toaster` | `src/theme/ThemeRoot.jsx`, `src/theme/ColorModeContext.js`, `src/theme/useColorMode.js` | D-FM5, D-FM6 |
| Puntos de color del menú | `src/theme/navStyle.js` | P-FM-D1 |
| Shell | `src/componentes/shell/MenuLateral.jsx`, `CabeceraMigas.jsx`, `MenuUsuario.jsx` | D-FM8 |
| Confirmación | `src/componentes/ConfirmDialog.jsx` | D-FM13 |
| Plano provisorio en grilla (tanda 2; se borra en la 5) | `src/componentes/cocheras/PlanoGrilla.jsx` | D-FM14 |
| Plano posicional (tanda 5) | `src/api/planoApi.js`, `src/utils/plano.js`, `src/componentes/plano/PlanoView.jsx`, `src/componentes/plano/PlanoEditor.jsx` y, si el detalle de cochera hoy es inline en `Cocheras.jsx`, `src/componentes/cocheras/CocheraDetalleDialog.jsx` (extraído sin cambiar comportamiento, para reutilizarlo en el plano del Dashboard) | D-FM16 |
| Tests | `test/unit/theme/theme.test.js`, `test/unit/constants/enums.test.js` (se crea o se amplía, D-FM4) y, en la tanda 5, `test/unit/utils/plano.test.js` y `test/unit/api/planoApi.test.js` | D-FM15, D-FM16 |
| Manual de esta spec | `docs/manual/frontend/13-diseno.md` | Metodología |

### 5.2 Se modifican

| Archivo | Qué cambia | Decisión |
|---|---|---|
| `package.json` y `package-lock.json` | Suman `@fontsource/red-hat-display` (lo instala el usuario) | D-FM7 |
| `src/main.jsx` | Envuelve todo en `ThemeRoot`; importa la fuente; el `Toaster` va adentro | D-FM5, D-FM7 |
| `src/componentes/Layout.jsx` | Usa las piezas de `shell/` y la barra superior mobile | D-FM8 |
| `src/constants/enums.js` | **Solo** `EstadoCochera.OCUPADA.color`: de `"warning"` a `"oc"` | D-FM4 |
| `src/auth/routes.js` y `test/unit/auth/routes.test.js` | Campo `group`, reorden, `MENU_GROUPS`, `menuGroups` | D-FM9 |
| `src/utils/ocupacionLink.js` y su test | `buildNuevaOcupacionPath`, `hasNuevaFlag` | D-FM10 |
| `src/pages/Ocupaciones.jsx` | Lee `?nueva=1`, abre el alta y limpia; estilo | D-FM10, D-FM12 |
| `src/pages/Splash.jsx`, `Login.jsx`, `AccountBlocked.jsx`, `NoAccess.jsx`, `Callback.jsx`, `src/auth/Forbidden.jsx`, `src/auth/RequireAuth.jsx` | Colores y formas del tema | D-FM11 |
| `src/pages/Dashboard.jsx`, `OperationalDashboard.jsx`, `Cocheras.jsx`, `Clientes.jsx`, `Tarifas.jsx`, `Trazabilidad.jsx`, `OperationalAlerts.jsx`, `Caja.jsx`, `Configuracion.jsx`, `Usuarios.jsx` | Estilo; `Cocheras` suma las pestañas; `Clientes` usa `ConfirmDialog` | D-FM12 a D-FM14 |
| `src/componentes/**` (diálogos de Ocupaciones, Pagos, Caja, `DetalleEventoDialog`, `ClienteAutocomplete`, `PagosSeccion`, `TotalesPorMetodo`, `CajaWidget`, etc.) | Estilo; `fullScreen` en `xs` | D-FM12 |
| `CLAUDE.md` | Una sección "Tema y estilos" (P-FM6, si el desarrollador la aprueba) | P-FM6 |
| `docs/specs/README.md` | Fila 13: estado y "Depende de" (la agrega el Orquestador al aprobar) | Metodología |

### 5.3 Se borran

Nada. (Los `boxShadow`, `borderRadius` y colores sueltos de las páginas se borran **dentro** de los archivos que se modifican.)

### 5.4 No se tocan

`src/api/**` (salvo `planoApi.js`, nuevo en la tanda 5), `src/constants/enums.js` (salvo el color de `OCUPADA`, D-FM4), `src/constants/errorCodes.js`, `src/utils/**` salvo `ocupacionLink.js`, `src/auth/permissions.js`, `RequirePermission.jsx`, `MeProvider.jsx`, `AuthProvider.jsx`, `eslint.config.js` (P-FM9), `src/pages/Callback.jsx` salvo el color, y todo `test/` salvo lo listado en 5.1 y 5.2.

## 6. Pasos

**Regla de ruteo (obligatoria).** El ejecutor **no le pregunta nada al usuario** en su chat. Las preguntas, los avisos y los comandos de git van al chat "Orquestador" por `SendMessage`, con la opción que recomienda y las alternativas con su costo, todas juntas. **No corre git.** Sí corre en PowerShell `npm test`, `npm run lint` y `npm run build` (solo al final de cada tanda). `npm install` lo corre el usuario (paso 1.2).

**Reglas de todos los pasos.**
- Una tanda por vez, **un commit por tanda** (lo hace el Orquestador), en `feature/front-diseno` (creada desde `develop`; nunca se trabaja sobre `develop`).
- Sin `Co-Authored-By` ni ninguna atribución de IA en commits ni en el PR.
- Los archivos se agregan por **ruta explícita** (nunca `git add .`).
- No se lee ni se muestra el `.env`.
- No se usa Glob sobre `FrontParking` (timeout por `node_modules`): se trabaja con rutas dentro de `src/`, `test/`, `docs/`.
- Si un paso obliga a decidir algo que la spec no prevé, **se frena, se anota en la sección 4 y se avisa al Orquestador**.
- Al terminar cada tanda: reportar **los archivos tocados**, tildar los pasos, actualizar el manual y verificar las **dos paletas** y los **360 px** (sección 7).
- Los textos visibles no cambian. Un `sx` queda solo si es de layout (D-FM12).

### Tanda 1 — Tema, shell y pantallas de sistema

**Condición de arranque:** el shell (D-FM8) ya está confirmado; conviene, si es posible, resolver P-FM1 (exportar el diseño a `diseno\`).

- [ ] **1.1** Confirmar con el Orquestador que `feature/front-diseno` existe (`git branch -a`) y que `npm test`, `npm run lint` y `npm run build` pasan **antes de cambiar nada**.
- [ ] **1.2** Pedir al usuario, por el Orquestador, el comando exacto, corrido en `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`: `npm install @fontsource/red-hat-display`. Esperar la confirmación.
- [ ] **1.3** Crear `src/theme/theme.js` (D-FM3, D-FM4) con las tablas de 2.2, `ThemeRoot.jsx`, `ColorModeContext.js`, `useColorMode.js` y `navStyle.js`. Modificar `main.jsx` (D-FM5, D-FM7). Escribir `test/unit/theme/theme.test.js`.
- [ ] **1.4** `routes.js` (D-FM9) y su test; `ocupacionLink.js` (D-FM10) y su test; `enums.js` (`EstadoCochera.OCUPADA.color = "oc"`, D-FM4) y `test/unit/constants/enums.test.js` (casos de abajo); verificar que el `Chip` toma `oc` (si no, la `variant` de `MuiChip`).
- [ ] **1.5** Shell (D-FM8): `MenuLateral`, `CabeceraMigas`, `MenuUsuario` (con el engranaje, visible solo con `configuracion.ver`), `Layout.jsx`. Atajo "Registrar ingreso" en el menú.
- [ ] **1.6** Pantallas de sistema (D-FM11): `Splash`, `Login`, `Waiting` y error de `/me` (en `RequireAuth`), `AccountBlocked`, `Forbidden`, `NoAccess`, `Callback`.

**Tabla de casos del paso 1.4** (pura, sin React):

| # | Caso | Resultado |
|---|---|---|
| 1 | `PRIVATE_ROUTES` | 11 entradas, cada una con `group` entre los tres de `MENU_GROUPS` y con los permisos de hoy |
| 2 | `menuGroups` con todos los permisos | Tres grupos en orden: Operación (con el atajo entre Dashboard y Monitor), Gestión, Administración |
| 3 | Operador (sin `usuarios.ver`, `configuracion.ver`, `auditoria.ver`) | Administración no aparece; Operación y Gestión sí |
| 4 | Auditor (sin `ocupaciones.crear`) | El atajo "Registrar ingreso" no aparece; "Ocupaciones" sí |
| 5 | Usuario sin ninguna ruta | `menuGroups` devuelve `[]`; `initialRoute` devuelve `null` |
| 6 | `initialRoute` de los cuatro roles | `/dashboard`, igual que antes del reorden |
| 7 | `buildNuevaOcupacionPath()` | `"/ocupaciones?nueva=1"` |
| 8 | `hasNuevaFlag("?nueva=1")`, `"?nueva=0"`, `"?nueva=abc"`, `""`, `"?id=3"` | `true`, `false`, `false`, `false`, `false` |

**Tabla de casos del paso 1.4, `enums.test.js`** (D-FM4):

| # | Caso | Resultado |
|---|---|---|
| 1 | `colorOf(EstadoCochera, EstadoCochera.OCUPADA)` | `"oc"` |
| 2 | `colorOf` de Disponible, Bloqueada y Reservada | `"success"`, `"error"` y `"info"` (sin cambios) |
| 3 | Todo `color` declarado en cualquier enum de `enums.js` | `"default"` o una clave de `getTheme("light").palette` y de `getTheme("dark").palette` |
| 4 | `getTheme("light").palette.oc` y `getTheme("dark").palette.oc` | Tienen `main`, `light` y `contrastText` |

**Tabla de casos del paso 1.3** (`theme.test.js`):

| # | Caso | Resultado |
|---|---|---|
| 1 | `getTheme("light")` y `getTheme("dark")` | Tienen los 8 tonos (`ok`, `wa`, `er`, `oc`, `in`, `vi`, `pk`, `de`) con texto, fondo y borde |
| 2 | `shape.borderRadius` y botón | 10 y 12 |
| 3 | `typography.fontFamily` | Empieza con "Red Hat Display" |
| 4 | Contraste texto/fondo de `ok`, `wa`, `er`, `in`, `de` en las dos paletas | Cumple el mínimo definido en el test (AA para texto normal) |
| 5 | `palette.mode` | `"light"` y `"dark"` |

*Aceptación (manual):* (1) en desktop el menú es lateral de 260 px, con tres grupos plegables, punto de color y migas; (2) por debajo de 900 px aparece la barra superior con hamburguesa y el menú pasa a drawer, que se cierra al navegar; (3) "Registrar ingreso" abre Ocupaciones con el alta abierta y la URL queda `/ocupaciones`; (4) "Salir" cierra la sesión como antes y el engranaje lleva a Configuración solo con `configuracion.ver` (igual que el ítem de Administración); (5) Splash, Login, Cargando, Cuenta bloqueada (tres textos), error de `/me`, "No tenés permiso" y "Sin acceso" se ven con el tema en claro y en oscuro; (6) los toasts toman el estilo del tema; (7) `npm test`, `npm run lint` y `npm run build` pasan.

### Tanda 2 — Ocupaciones y Cocheras

- [ ] **2.1** `Ocupaciones.jsx` y sus diálogos (`src/componentes/ocupaciones/*`): tarjeta de ocupación (`Card` outlined; `Stack direction={{ xs: "column", sm: "row" }}`; botones `size="large"`; "Registrar pago" y "Finalizar" en `success`, "Cancelar reserva" en `error`); filtros en `Grid` 1/2/4 columnas con `TextField size="small"`; `Alert warning` del tope; detalle, alta, finalizar (incluido el paso "Resolver el excedente"), cancelar reserva, registrar pago, sección Contrato mensual, ajuste de precio, programar y quitar baja, ajuste masivo (`Stepper` de 3 pasos). Pagos: `PagosSeccion`, `PagoDetalleDialog`, `AnularPagoDialog`, `DevolucionDialog`.
- [ ] **2.2** `Cocheras.jsx`: grilla (`Grid` 2/3/4/6 columnas, tarjeta clicable con borde de 2 px del color del estado, altura de 150 px de la 06), diálogos (detalle `md` y `fullScreen` en xs; agregar, editar, bloquear, desbloquear en `xs`), `Tabs` "Tarjetas" / "Plano" y `PlanoGrilla.jsx` (D-FM14).
- [ ] **2.3** Verificación de la tanda 2 (sección 7).

*Aceptación (manual):* (1) el flujo Nueva ocupación → Registrar pago → Finalizar se hace con botones grandes, también a 360 px; (2) las acciones sin permiso siguen ocultas (se prueba con `encargado@demo.test` y `operado@demo.test`); (3) el "Plano" colorea cada cochera por estado, abre el mismo detalle y no hace pedidos nuevos; (4) a 360 px la grilla de Cocheras es de 2 columnas y el detalle va a pantalla completa; (5) las dos paletas se ven bien.

### Tanda 3 — Caja, Pagos y Monitor

- [ ] **3.1** `Caja.jsx` y `src/componentes/caja/*`: `Tabs`/`Tab` ("Caja actual", "Historial"), `Card` de la sesión, `Alert warning` del día anterior, `Chip` de modo y estado, `Table size="small"` + `TablePagination`, diálogos (abrir, cerrar con arqueo previa y resultado, reabrir, detalle de sesión) con `fullScreen` en xs; la diferencia con el color del tono (`ok`/`er`).
- [ ] **3.2** `OperationalDashboard.jsx` y `CajaWidget.jsx`: indicadores (`Grid` 12 / md 2,4, `Card` que se resalta en `error` si el valor es mayor a 0), tarjeta "Alertas críticas recientes" (`Card` outlined con borde `error`), `LinearProgress` de recarga; **sin acordeones** (DV-FM4).
- [ ] **3.3** `Pagos` (`src/componentes/pagos/*`) si algo quedó de la tanda 2.
- [ ] **3.4** Verificación de la tanda 3.

*Aceptación (manual):* (1) la caja del día anterior abierta destaca con `Alert warning`; (2) el cierre muestra la diferencia con color y no la calcula en el cliente; (3) el widget del Monitor muestra su falla aislada sin afectar al resto; (4) tablas con scroll propio a 360 px; (5) las dos paletas.

### Tanda 4 — El resto

- [ ] **4.1** `Dashboard.jsx` (6 tarjetas con fondo del color de su estado y número grande; `Grid` 4/2/1), `Clientes.jsx` (con `ConfirmDialog`, D-FM13), `Tarifas.jsx` (dos pasos), `Trazabilidad.jsx` (tabla `size="small"` + `TablePagination`, `DetalleEventoDialog`), `OperationalAlerts.jsx` (**panel lateral** de severidad: `Card` con panel a la izquierda, arriba en mobile; borde `error` en Crítica abierta; `Tooltip` sobre el botón deshabilitado de alertas de dinero), `Configuracion.jsx` (`Paper` outlined, ancho máximo 800, campos deshabilitados sin permiso), `Usuarios.jsx` (`Table size="small"`, `IconButton` `MoreVert` + `Menu`, fila desactivada al 55 %).
- [ ] **4.2** Búsqueda final (sección 7, caso 14) y pasada de limpieza de `sx` sueltos.
- [ ] **4.3** `docs/manual/frontend/13-diseno.md` (qué es el tema, cómo agregar un color nuevo, cómo cambiar el radio, cómo funciona el modo, el shell, el atajo, el plano en grilla y qué queda para el plano posicional) y, con aprobación (P-FM6), la sección en `CLAUDE.md`.
- [ ] **4.4** Actualizar el estado de esta spec en `docs/specs/README.md` y en su cabecera: **En curso** al cerrar la tanda 4 y **Terminada** una vez mergeada la tanda 5 a `develop`.

*Aceptación (manual):* (1) los `window.confirm` de Clientes ya no existen y el diálogo muestra el mismo texto; (2) la alerta "de dinero" sin permiso se ve deshabilitada con tooltip; (3) Configuración sin permiso muestra el aviso y los campos deshabilitados; (4) todas las pantallas y diálogos en claro y oscuro y a 360 px; (5) `npm test`, `npm run lint` y `npm run build` pasan.

### Tanda 5 — Plano (depende de PB-24)

**Condición de arranque:** PB-24 implementado en el backend (`GET` y `PUT /Cochera/plano`) y su contrato real confirmado por el Orquestador. **Si el contrato real difiere de la sección 4.3, se frena y se actualiza la spec antes de escribir código.** Las tandas 1 a 4 no esperan esto.

- [ ] **5.0** Confirmar con el Orquestador el contrato real de PB-24 (campos, `version`, 409 `plano_modificado`, errores 400) y resolver P-FM10 y P-FM12.
- [ ] **5.1** `src/api/planoApi.js` (D-FM16) y `test/unit/api/planoApi.test.js` (`vi.mock` de `http`: ruta, método, cuerpo con `version`, que no capture errores).
- [ ] **5.2** `src/utils/plano.js` y `test/unit/utils/plano.test.js` (tabla de casos de abajo).
- [ ] **5.3** Extraer `CocheraDetalleDialog.jsx` de `Cocheras.jsx` **sin cambiar comportamiento** (si hoy es inline) y `PlanoView.jsx`. Pestaña "Plano" de Cocheras con `PlanoView`; borrar `PlanoGrilla.jsx`.
- [ ] **5.4** `PlanoEditor.jsx`: "Editar configuración del garage" (solo con `can("cocheras.gestionar")`), con guardar, descartar, volver y el manejo del 409.
- [ ] **5.5** Dashboard: el plano como vista principal, con las 6 tarjetas compactas arriba; sin plano guardado, el estado vacío y "Armar el plano". Una consulta de ocupaciones activas para "con deuda" (D-FM16).
- [ ] **5.6** Actualizar el manual, `docs/specs/README.md` y la verificación.

**Tabla de casos del paso 5.2** (`plano.js`, pura):

| # | Caso | Resultado |
|---|---|---|
| 1 | `emptyPlano()` | `{ niveles: [] }` sin `version` |
| 2 | `validatePlano` con un nivel y dos lugares válidos | Sin errores |
| 3 | `validatePlano` con ancho 0, ancho 201, nombre vacío o de 41 caracteres | Un error por campo, con su mensaje |
| 4 | `validatePlano` con 11 niveles o 501 elementos en un nivel | Error de límite |
| 5 | `buildPlanoView` con un lugar cuya cochera está Ocupada | El lugar trae estado, número y cliente de la ocupación activa |
| 6 | `buildPlanoView` con una cochera que no está en ningún lugar | Aparece en `sinUbicar` |
| 7 | `buildPlanoView` con un lugar con `cocheraId: null` | Lugar "sin cochera", sin estado |
| 8 | `buildPlanoView` con una ocupación `Mes` con `saldo > 0` | `conDeuda: true` |
| 9 | `buildPlanoView` con una ocupación `Hora` en curso con `saldo > 0` (P-FM10) | `conDeuda: false` |
| 10 | `buildPlanoView` con una ocupación `Hora` Vencida con `saldo > 0` | `conDeuda: true` |
| 11 | `buildPlanoView` con la lista de ocupaciones truncada | `conDeuda` no se calcula (`undefined`) |
| 12 | `moveElemento` fuera del nivel | Se ajusta al borde del nivel (no sale) |
| 13 | `resizeElemento` a tamaño 0 | Se ignora (mínimo 1 celda) |
| 14 | `rotateElemento` cuatro veces | Vuelve a 0 |
| 15 | `assignCochera` con una cochera ya usada en otro lugar | La mueve: queda en un solo lugar |
| 16 | `removeNivel` con elementos | Quita el nivel y sus elementos |

*Aceptación (manual):* (1) el plano se ve igual que en el diseño, en claro y oscuro y a 360 px; (2) cada lugar muestra el color del estado y abre el detalle; (3) "con deuda" se marca según P-FM10; (4) el editor guarda y, recargando la página, el plano vuelve igual (no hay `localStorage`); (5) dos pestañas editando: la segunda recibe el 409 `plano_modificado` y puede recargar; (6) con `operado@demo.test` no se ve el botón del editor; (7) el Dashboard muestra el plano y las 6 tarjetas, y sin plano muestra el estado vacío; (8) `npm test`, `npm run lint` y `npm run build` pasan.

## 7. Verificación

Con el backend en `develop` corriendo y `npm run dev` en `http://localhost:5173`. Cada fila se verifica en **claro y en oscuro** (cambiando la preferencia del sistema operativo, o el selector de tema si se aprueba) y a **1280 px y 360 px**.

| # | Verificación | Resultado esperado |
|---|---|---|
| 1 | `npm test`, `npm run lint`, `npm run build` | Sin errores, al final de **cada** tanda |
| 2 | Cabecera del `<head>` / red del navegador | La fuente se sirve desde el propio bundle (`@fontsource`); no hay pedidos a `fonts.googleapis.com` |
| 3 | Menú con `dueno@demo.test` | Tres grupos en orden, once ítems y el atajo "Registrar ingreso"; "Configuración" en Administración |
| 4 | Menú con `encargado@demo.test`, `operado@demo.test` y un auditor | Sin Administración completa donde no hay permisos; el auditor no ve "Registrar ingreso" |
| 5 | Ancho de 899 px y de 901 px | A 899 barra superior + drawer temporal; a 901 menú lateral permanente y migas |
| 6 | "Registrar ingreso" | Abre `/ocupaciones` con "Nueva ocupación" abierto; recargar o volver atrás no lo reabre |
| 7 | Splash, Login, Cargando, Cuenta bloqueada ×3, error de `/me`, "No tenés permiso", "Sin acceso" | Con el tema; los textos son los de hoy |
| 8 | Toast de éxito y de error | Estilo del tema; el texto de error es el del backend |
| 9 | Flujo Nueva ocupación → Registrar pago → Finalizar | Botones grandes, sin cambios de comportamiento |
| 10 | Alerta "de dinero" sin `alertas.resolver_dinero` | Botón deshabilitado con tooltip "Tu usuario no tiene permiso para resolver alertas de dinero." |
| 11 | Cocheras → "Plano" | Mosaico por número con color de estado; clic abre el detalle; no hay pedidos nuevos en la pestaña de red |
| 12 | Clientes → Desactivar y Reactivar | `Dialog` con `¿Desactivar a "{nombre}"?` / `¿Reactivar a "{nombre}"?`; Cancelar no cambia nada; Confirmar ejecuta la misma acción y el toast de siempre |
| 13 | Caja con una sesión de un día anterior abierta (modo DIARIA) | `Alert warning` destacado; "Cerrar caja" como acción principal |
| 14 | Búsqueda en `src/` de `#[0-9a-fA-F]{3,8}`, `rgba(`, `boxShadow:` y `window.confirm` | Solo aparecen en `src/theme/`; ninguno en `pages/` ni en `componentes/` |
| 15 | Búsqueda de `localStorage`, `sessionStorage` y `createTheme` | `createTheme` solo en `src/theme/theme.js`; ninguno de los otros dos en `src/` (salvo `legacyCleanup.js`) |
| 16 | `git diff develop -- src/api src/constants/enums.js src/utils` | Solo `src/utils/ocupacionLink.js` y, en `enums.js`, la línea de `EstadoCochera.OCUPADA` |
| 17 | Teclado y foco | Los diálogos atrapan el foco; el ítem activo del menú es legible en las dos paletas |
| 18 | **El usuario confirma la forma del botón contra su diseño** (tanda 1) | Redondeado de 12 px, o Píldora: si elige Píldora, se cambia `BUTTON_RADIUS` a 999 y se repite la verificación |
| 24 | Chip "Ocupada" en Cocheras (tarjeta, detalle y plano) y leyenda | Pizarra `oc` en las tres, en claro y oscuro, sin mapas locales en las páginas |
| 25 | Selector de tema en el menú de usuario | "Automático" por defecto; Claro y Oscuro cambian la paleta; recargar vuelve a Automático; se ve el aviso "No se guarda" |
| 19 | Engranaje del menú de usuario | Lleva a `/configuracion` solo con `configuracion.ver`; con `operado@demo.test` ni el engranaje ni el ítem aparecen |
| 20 | Tanda 5: Cocheras → "Plano" y Dashboard | Plano por niveles, colores por estado, "con deuda" según P-FM10, clic abre el detalle; el Dashboard muestra el plano y las 6 tarjetas |
| 21 | Tanda 5: editar el plano y recargar la página | El plano vuelve igual, venga del backend; en la pestaña de red hay un `PUT /Cochera/plano` y ningún acceso a `localStorage` |
| 22 | Tanda 5: dos pestañas editando | La segunda recibe 409 `plano_modificado`, el aviso y "Recargar plano" |
| 23 | Tanda 5: `git diff develop -- src/api` | Solo `planoApi.js` nuevo |

**No verificable con los usuarios demo:** el rol `AUDITOR` si no hay un usuario de prueba (lo cubren los tests de `menuGroups`).

## 8. Cómo retomar

**Estado:** Aprobada (20/11/2026) para las tandas 1 a 4. **Tanda 5: Aprobada, bloqueada por PB-24** (sección 4.3). Tema, esquinas, shell con engranaje, menú agrupado, atajo, plano posicional, modo oscuro con selector, "Ocupada" en pizarra, "con deuda" y fuente están decididos por el desarrollador. **Quedan abiertas** P-FM1 (valores finos; el usuario exporta el diseño a `diseno\`), P-FM11 (forma del botón, se confirma en la tanda 1), P-FM12 (dónde van los 6 números del Dashboard) y P-FM13 (ids de PB-24); ninguna frena las tandas 1 a 4.

**Condición de arranque:** esta spec aprobada y mergeada y las specs 02 a 12 mergeadas en `develop`; para la tanda 5, además, PB-24 en el backend. **Siguiente spec: la 14**, "aprovechar lo nuevo del backend" (total del listado, nombres de usuario, `anulableSinDueno`, precio vigente, simulación del ajuste, resumen de alertas, filtro por entidad, invitación pendiente); no se mezcla con esta.

**Ejecución en el repo principal** (`C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`, rama `feature/front-diseno` creada desde `develop`). Un chat por tanda (cuatro commits para las tandas 1 a 4 y uno más para la 5):

| Chat | Tanda | Modelo | Esfuerzo | Nota |
|---|---|---|---|---|
| A | 1 | Sonnet | medio–alto | El shell y el tema son la base de las demás. Si P-FM2 cambia la estructura o el diseño no alcanza (P-FM1), **frena** |
| B | 2 | Sonnet | medio | La más larga: Ocupaciones y todos sus diálogos |
| C | 3 | Sonnet | medio | Caja, Monitor y Pagos |
| D | 4 | Sonnet | bajo–medio | El resto, el manual y el cierre de las tandas 1 a 4 |
| E | 5 | Sonnet | medio–alto | Plano posicional y editor: el editor tiene interacción con puntero y teclado y estado propio. **Solo cuando PB-24 esté en el backend**; si el contrato real difiere de la sección 4.3, frena y se sube a Opus |

Se sube a Opus solo si aparece una decisión de arquitectura que la spec no previó (por ejemplo, cambiar el sistema de rutas o mover el montaje del tema).

**Prompt para cada chat de ejecución** (cambiar `TANDA` por 1, 2, 3, 4 o 5; la 5 solo si PB-24 ya está en el backend):

> Trabajás en el frontend de ParkingControl, en `C:\Users\Equipo\source\repos\FrontParking\parkingcontrol-front`, en la rama `feature/front-diseno` (creada desde `develop`; nunca trabajes sobre `develop`). Leé `CLAUDE.md`, `docs/specs/README.md` y `docs/specs/frontend/13-diseno.md` completa (sobre todo las secciones 2.2, 3 y 6). Ejecutá **solo la TANDA** de la spec 13, siguiendo la sección 6. **Es una spec solo visual (salvo la tanda 5, que agrega el plano y su editor): no cambies lógica, permisos, textos que vienen de la API ni endpoints; respetá fechas del tenant, `formatMoney`, `can()`, `showApiError` y no uses `localStorage`.** Un `sx` queda solo si es de layout (grilla, ancho, alineación): colores, radios y sombras salen del tema (`src/theme/theme.js`). **Regla de ruteo (obligatoria): no le preguntes nada al usuario en tu chat. Las preguntas, los avisos y los comandos de git van al chat "Orquestador" por SendMessage, con la opción que recomendás y las alternativas con su costo, todas juntas en un solo mensaje. No corras git.** Al final de la tanda corré en PowerShell `npm test`, `npm run lint` y `npm run build`, y reportá al Orquestador los **archivos tocados** y el resultado de cada comando. El `npm install @fontsource/red-hat-display` lo corre el usuario: pedí el comando al Orquestador (paso 1.2). No uses Glob sobre `FrontParking` (da timeout por `node_modules`): trabajá con rutas dentro de `src/`, `test/` y `docs/`. No leas ni muestres el `.env`. Verificá en las dos paletas (clara y oscura) y a 360 px. Si el diseño no alcanza o la spec no prevé algo, frená y avisá. Tildá los pasos y actualizá el manual. Respondé en español rioplatense.

**Modelo y esfuerzo.** Sonnet con esfuerzo medio alcanza para las tandas 2 y 3 (mucha superficie, decisiones ya tomadas); medio–alto para la 1, que fija el tema y el shell de las demás; bajo–medio para la 4. Si el shell o el tema obligan a rehacer la estructura, se frena y se sube a Opus con esfuerzo alto.
