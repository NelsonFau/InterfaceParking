# 13 — Diseño: tema, shell y pantallas de "Parking Oficial" (manual, tandas 1 a 4)

> Cómo funciona lo que hicieron las tandas 1 a 4 de la spec `docs/specs/frontend/13-diseno.md`. La tanda 5 (plano
> posicional, bloqueada por PB-24) amplía este manual cuando se ejecute.

## 1. El tema

`src/theme/theme.js` es el **único** lugar donde se crea un tema de MUI (`createTheme`) y donde viven colores,
radios y sombras. Exporta:

| Export | Qué es |
|---|---|
| `getTheme("light" \| "dark")` | El tema de MUI de cada modo |
| `PALETTE` | Las dos paletas del diseño "Parking Oficial" (tabla de la sección 2.2 de la spec) |
| `RADIUS` (10), `FIELD_RADIUS` (6), `BUTTON_RADIUS` (12) | Radios de tarjetas/diálogos, campos y botones |
| `FONT_FAMILY`, `TONE_KEYS`, `COLOR_TONE` | Fuente (Red Hat Display), los 8 tonos y la equivalencia nombre de color de MUI → tono |

**Lo que MUI no tiene** está en `theme.palette.pc`: `side`, `sideText`, `sideAct`, `sideOnAct`, `crumbBg`, `sunk`,
`strong`, `faint`, `input`, `shadow`, `dialogShadow`, `splashBg`, `accent` y `tone` (`ok`, `wa`, `er`, `oc`, `in`,
`vi`, `pk`, `de`, cada uno `{ text, bg, border }`). En una página se usa con `sx` como string (`bgcolor: "pc.crumbBg"`)
o como función (`sx={(t) => ({ boxShadow: t.palette.pc.dialogShadow })}`).

**Reglas.** Una página no escribe `#hex`, `rgba(...)`, `borderRadius` ni `boxShadow` sueltos: un `sx` queda solo si es de
layout (grilla, ancho, alineación). `Card` es `variant="outlined"` por defecto y toma borde y sombra del tema.

### Cómo agregar un color nuevo

1. Agregá el tono `[texto, fondo, borde]` en las dos paletas de `PALETTE` (clara y oscura) y su clave en `TONE_KEYS`.
2. Si lo va a devolver `colorOf` de `enums.js`, sumá su nombre a `COLOR_TONE` y registralo en `palette` dentro de
   `getTheme` con `toneColor(...)` (como `oc`). El `Chip` y el `Alert` lo pintan solos desde `COLOR_TONE`.
3. `test/unit/constants/enums.test.js` falla si un enum declara un color que el tema no conoce.

### Cómo cambiar el radio

`RADIUS` para tarjetas y diálogos, `FIELD_RADIUS` para campos y `BUTTON_RADIUS` para botones y el ítem activo del menú.
La forma "Píldora" del botón (P-FM11) es `BUTTON_RADIUS = 999`; se confirma contra el diseño del desarrollador. Para cambiar
el radio de todo el sistema alcanza con tocar esas tres constantes: ninguna página escribe un radio propio. Los valores
marcados `PROVISORIO` en `theme.js` (tono `de` en oscuro, borde de `pk` en oscuro, fondo del Splash, escala tipográfica,
P-FM1) se confirman contra el export del diseño.

### Chips y "Ocupada"

Los chips siguen usando `colorOf`. `EstadoCochera.OCUPADA.color` es `"oc"` (pizarra, D-FM4): el tema registra
`palette.oc` y `MuiChip` pinta cada color con el tono del diseño (borde de 1 px, píldora de 28 px de alto).

## 2. Montaje y modo claro/oscuro

`src/main.jsx` envuelve todo de `BrowserRouter` hacia adentro en `ThemeRoot` (`src/theme/ThemeRoot.jsx`): `ThemeProvider`,
`CssBaseline` y el `Toaster` de react-hot-toast con el estilo del tema (fondo `paper`, borde `divider`, íconos `ok`/`er`).
Por eso Splash, Login, Callback y AccountBlocked, que están fuera del `Layout`, también toman el tema.

El modo sale de `prefers-color-scheme` (**Automático**) y el usuario puede forzar **Claro** u **Oscuro** desde el menú de
usuario. La preferencia vive solo en memoria (`ColorModeContext`, hook `useColorMode`): no se guarda (ARQ-1) y al recargar
vuelve al del sistema. La fuente se carga con `@fontsource/red-hat-display` (pesos 400 a 800), sin llamadas externas.

## 3. Shell

`src/componentes/Layout.jsx` compone las piezas de `src/componentes/shell/`:

| Pieza | Qué hace |
|---|---|
| `MenuLateral.jsx` | 260 px a alto completo (`Drawer permanent`); por debajo de 900 px, `Drawer temporary` de 284 px que se cierra al navegar. Tres grupos plegables (estado en memoria), un punto de color por ítem (`src/theme/navStyle.js`) y el ítem activo en píldora |
| `CabeceraMigas.jsx` | Solo desktop: "Grupo › Pantalla", con el `label` y el `group` de `PRIVATE_ROUTES` |
| `MenuUsuario.jsx` | Avatar con iniciales, nombre y local, selector de tema, "Salir" y el engranaje a `/configuracion` (solo con `configuracion.ver`) |
| Barra superior (en `Layout.jsx`) | Solo por debajo de 900 px: hamburguesa, "ParkingControl" y `MenuUsuario` |

El corte es `theme.breakpoints.down("md")` (menos de 900 px). El `main` usa `p: 3` en desktop y `p: 2` en mobile, con
`minWidth: 0` para que nada fuerce scroll horizontal a 360 px.

### Menú agrupado

`PRIVATE_ROUTES` (`src/auth/routes.js`) tiene un campo `group` y está en el orden del menú; `MENU_GROUPS` son los tres
rótulos (Operación, Gestión, Administración). `menuGroups(permisos, shortcuts)` devuelve `[{ label, items }]` solo con lo
que el usuario puede ver, sin grupos vacíos. `accessibleRoutes` e `initialRoute` no cambian de contrato: la ruta inicial
sigue siendo `/dashboard` para los cuatro roles.

### Atajo "Registrar ingreso"

No es una ruta ni un permiso: es un ítem que `Layout.jsx` pasa a `menuGroups` (se ve con `ocupaciones.crear`, va después de
Dashboard y no queda seleccionado). Lleva a `buildNuevaOcupacionPath()` (`/ocupaciones?nueva=1`, `src/utils/ocupacionLink.js`).
`Ocupaciones.jsx` lee el parámetro con `hasNuevaFlag`, abre `AltaOcupacionDialog` y lo limpia con `replace`, igual que `?id=N`
(DV-FM1). Sin `ocupaciones.crear` el parámetro solo se limpia.

## 4. Pantallas de sistema

Splash, Login y Cuenta bloqueada sacaron los fondos y sombras fijos: usan `background.default`, el `Card` outlined del tema
y, en el Splash, `palette.pc.splashBg` y `dialogShadow`. "Cargando…", el error de `/me`, "No tenés permiso" y "Sin acceso" ya
no tenían colores propios y toman el tema por `CssBaseline`, `Alert` y `CircularProgress`. Los textos no cambian.

## 5. Pruebas

`test/unit/theme/theme.test.js` (8 tonos en las dos paletas, radios, fuente, contraste AA del texto de `ok`, `wa`, `er`,
`in` y `de`, modo), `test/unit/auth/routes.test.js` (grupos y atajo), `test/unit/utils/ocupacionLink.test.js` y
`test/unit/constants/enums.test.js` (color de `OCUPADA` y colores de enums contra el tema). Lo visual se verifica a mano
(spec 13, sección 7).

## 6. Ocupaciones y Cocheras (tanda 2)

**Diálogos a pantalla completa.** `src/componentes/useDialogFullScreen.js` devuelve `true` por debajo de `sm` (600 px). Cada
diálogo lo llama una vez al principio del componente y pasa `fullScreen={fullScreen}` al `Dialog`; un componente con dos
`Dialog` (por ejemplo el paso de éxito de `AjustePrecioDialog`) comparte la misma variable. Los diálogos nuevos hacen lo mismo.

**Botones.** El color lo decide la acción, no la página: "Registrar pago", "Finalizar" y "Desbloquear" van en `success`;
"Cancelar reserva", "Bloquear" y "Anular" en `error`. Las acciones de la tarjeta de ocupación usan `size="large"`. Ningún botón
lleva `borderRadius` ni `fontWeight` en `sx`: salen de `MuiButton` en el tema.

**Tarjetas.** `Card` es `outlined` por defecto y toma borde y sombra del tema: la tarjeta de ocupación y el panel de filtros ya
no tienen `sx` de estilo. La tarjeta de cochera conserva solo lo que es de layout o semántico: altura de 150 px, `borderWidth: 2`
y el `borderColor` del estado (`borderOf`, que lee `colorOf` y apunta a un color del tema, sin hex).

**Cocheras: pestañas "Tarjetas" y "Plano".** El estado de la pestaña (`vista`) vive en memoria. "Plano" es
`src/componentes/cocheras/PlanoGrilla.jsx` (D-FM14): un mosaico por número ordenado, con la **misma lista ya cargada y filtrada**
por la búsqueda (no hace pedidos), que al hacer clic abre el mismo detalle (`abrirDetalle`). Cada mosaico es un `Card` con el tono
del estado (`palette.pc.tone` según `COLOR_TONE[colorOf(EstadoCochera, estado)]`) y arriba van los chips de leyenda, uno por valor
de `EstadoCochera`. No muestra matrícula, tipo de vehículo ni "con deuda". Se borra cuando el plano posicional (tanda 5) lo
reemplace.

## 7. Caja, Monitor y Pagos (tanda 3)

**Caja** (`src/pages/Caja.jsx` y `src/componentes/caja/*`). `Tabs`/`Tab` ("Caja actual" e "Historial") segmentadas por el tema; la
sesión es una `Card` outlined sin `sx` de estilo; el `Alert warning` del día anterior y los `Chip` de modo y estado salen del
tema; el historial es `Table size="small"` + `TablePagination` dentro de un `Paper` outlined, con `TableContainer` (scroll propio
a 360 px). Los cuatro diálogos (abrir, cerrar con arqueo previa y resultado, reabrir y detalle de sesión) usan
`useDialogFullScreen` y van a pantalla completa por debajo de `sm`; en `CerrarCajaDialog` el hook está arriba del `return`
temprano del resultado, porque los dos `Dialog` comparten la variable. `TotalesPorMetodo` quedó dentro de un `TableContainer`.
Los botones principales ya no llevan `fontWeight` en `sx` (sale de `MuiButton`).

**Diferencia del cierre.** `src/componentes/caja/DiferenciaTexto.jsx` (nuevo) reemplaza las dos copias locales (`DiferenciaTexto`
de `CerrarCajaDialog` y `Dif` de `SesionDetalleDialog`). Pinta con el color del tema según el tipo que ya clasifica
`diferenciaInfo`: "sin diferencia" en `success.main` (tono `ok`), "falta" en `error.main` (`er`) y "sobra" en `warning.main`
(`wa`, igual que antes). No calcula nada: el monto es el que manda el backend. `difColor(info)` se reutiliza en la vista previa
del formulario de cierre. `src/utils/caja.js` no se tocó (sigue devolviendo `text.primary` para "cero").

**Monitor** (`OperationalDashboard.jsx`, `CajaWidget.jsx`). Los indicadores siguen en `Grid` 12 / md 2,4; `KpiCard` es una `Card`
outlined que solo suma `borderColor: "error.main"` (borde de estado en runtime) y el número en `error.main` cuando el valor es
mayor a 0. "Alertas críticas recientes" es una `Card` con borde `error`; cada alerta, una `Card` outlined con borde `error`. El
`LinearProgress` de recarga y el widget Caja (con su falla aislada y "Reintentar") no cambian. No hay acordeones (DV-FM4). Los
`borderRadius` de las `Card` se borraron: salen del tema.

**Pagos** (`src/componentes/pagos/*`). No quedaba nada de la tanda 2: los cuatro archivos ya usan `useDialogFullScreen` y no
tienen `boxShadow`, `borderRadius`, `borderColor` ni colores sueltos.

## 8. Resto de las pantallas (tanda 4)

**Dashboard.** Las 6 tarjetas siguen siendo las mismas, en la misma grilla (1 / 2 / 4 columnas). Cada `StatCard` es un `Card`
que toma el tono de su estado de `palette.pc.tone`: Total `de`, Disponibles `ok`, Ocupadas `oc`, Bloqueadas `er`, Vencen hoy
`wa` y Vencen en 7 días `in`. El número es `h3` en 800.

**Clientes y `ConfirmDialog`.** `src/componentes/ConfirmDialog.jsx` (`open`, `title`, `message`, `confirmLabel`,
`confirmColor`, `loading`, `onConfirm`, `onClose`) reemplaza a los dos `window.confirm`. `Clientes.jsx` guarda
`confirmar = { tipo, c }` y llama a las mismas funciones `desactivar` / `reactivar` (mismos toasts); el texto es
`¿Desactivar a "{nombre}"?` / `¿Reactivar a "{nombre}"?`, con "Cancelar" y "Confirmar" (rojo al desactivar, verde al
reactivar). Mientras envía se deshabilitan los botones y no se cierra con clic afuera ni con Esc. Es genérico: sirve para
cualquier confirmación nueva.

**Tarifas, Trazabilidad, Configuración y Usuarios.** Ya tenían la estructura del diseño (dos pasos, tablas `size="small"`
con `TablePagination`, `Paper` outlined de ancho máximo 800 con campos deshabilitados sin permiso, `Table` + `IconButton`
`MoreVert` + `Menu`, fila desactivada al 55 %): la tanda sacó los `sx` de estilo (`fontWeight`, `borderRadius`) y sumó
`fullScreen` por debajo de `sm` a todos sus diálogos con `useDialogFullScreen`. Las tablas de Trazabilidad y Usuarios van en un
`Paper` outlined con `TableContainer` (scroll propio a 360 px).

**`DetalleEventoDialog`.** El resaltado de cada fila de la tabla Antes / Después usa el fondo del tono del tema (`cambiado`
`wa`, `agregado` `ok`, `quitado` `er`) y los bloques de JSON crudo son un `Paper` outlined.

**Alertas operativas.** Cada alerta es un `Card` con un **panel lateral de severidad**: un `Stack` con los chips de severidad,
estado y "DINERO" sobre el fondo del tono de la severidad (`COLOR_TONE[colorOf(SeveridadAlerta, …)]`). A la izquierda (180 px)
en desktop y arriba en mobile. La alerta Crítica abierta lleva borde `error.main`. El botón "Resolver alerta" deshabilitado
sigue envuelto en un `Tooltip` (con un `span`, porque un botón deshabilitado no dispara eventos).

## 9. Búsqueda de estilos sueltos

Para comprobar que nada se coló fuera del tema, buscar en `src/` `#[0-9a-fA-F]{3,8}`, `rgba(`, `boxShadow:` y
`window.confirm`: solo deben aparecer en `src/theme/`. `createTheme` solo en `src/theme/theme.js` y `localStorage` /
`sessionStorage` solo en `src/auth/legacyCleanup.js`. Se borraron `src/App.css` y `src/index.css`, restos de la plantilla de
Vite que nadie importaba.

## 10. Qué queda para el plano posicional (tanda 5, PB-24)

La pestaña "Plano" de Cocheras es el **mosaico provisorio por número** (`PlanoGrilla.jsx`, sección 6): usa la lista ya cargada
y no pide nada nuevo. El Dashboard sigue con sus 6 tarjetas. Cuando el backend implemente PB-24 (`GET` y `PUT /Cochera/plano`)
la tanda 5 agrega `planoApi.js`, `utils/plano.js`, `PlanoView` y `PlanoEditor`, reemplaza el mosaico (se borra
`PlanoGrilla.jsx`), pone el plano como vista principal del Dashboard con las 6 tarjetas compactas arriba, y suma la marca
"con deuda". Hasta entonces no hay editor del garage. Si el contrato real de PB-24 difiere de la sección 4.3 de la spec, se
frena y se ajusta antes de escribir código.
