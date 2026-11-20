// Tema de ParkingControl (spec 13, D-FM3 y D-FM4). Replica el diseño "Parking Oficial".
// ÚNICO lugar donde se crea un tema de MUI y donde viven colores, radios y sombras: las páginas leen el tema
// (`palette`, `palette.pc`, `shape`) y un `sx` de página queda solo para layout (grilla, ancho, alineación).
// Valores exactos: docs/diseno/detalles-claude-design.md (manda sobre la guía visual y sobre lo PROVISORIO).
// Cómo agregar un color o cambiar un radio: docs/manual/frontend/13-diseno.md.
import { createTheme } from "@mui/material/styles";

/** Radio de tarjetas, mosaicos de indicador y banners (detalles 4). */
export const RADIUS = 10;
/** Radio de los campos de texto (detalles 4, Inputs: 8 px). */
export const FIELD_RADIUS = 8;
/** Radio de los botones y del ítem activo del menú (detalles 4, Botones: 12 px). */
export const BUTTON_RADIUS = 12;
/** Radio de los botones de contorno. */
export const OUTLINE_RADIUS = 8;
/** Radio de las acciones en píldora y del botón redondo de refrescar. */
export const PILL_RADIUS = 999;
/** Radio de los chips de estado (detalles 4, Chips: 6 px). */
export const CHIP_RADIUS = 6;
/** Radio de los diálogos (detalles 4, Diálogo genérico: 14 px). */
export const DIALOG_RADIUS = 14;
/** Radio del chip de la leyenda-filtro del plano (detalles 6.3: 8 px). */
export const LEGEND_RADIUS = 8;
/** Radio de los puntos de estado (círculo). */
export const DOT_RADIUS = "50%";
/** Radio del cuadradito de color de la leyenda (detalles 6.3: 3 px). */
export const SWATCH_RADIUS = 3;

export const FONT_FAMILY = '"Red Hat Display", system-ui, sans-serif';

// Cada tono de estado es [texto, fondo, borde].
const tone = ([text, bg, border]) => ({ text, bg, border });
// Botón: fondo, texto, borde y ancho del borde.
const btn = (bg, text, border, bw = 1, hover) => ({ bg, text, border, bw, hover });

/**
 * Paletas del diseño (detalles 2). Lo que el detalle de Claude Design no trae queda marcado PROVISORIO.
 */
export const PALETTE = {
  light: {
    app: "#F6F3EE",
    surf: "#ffffff",
    sunk: "#f0ebe4",
    act: "#e9dccf",
    border: "#e6dfd5",
    strong: "#cfc4b6",
    text: "#2a2018",
    muted: "#6b5d52",
    faint: "#85766a",
    input: "#ffffff",
    // Mosaico de indicador: fondo app con borde suave (detalles 4, Tile de KPI).
    tile: "#F6F3EE",
    shadow: "0 2px 4px rgba(40,25,10,.10), 0 16px 32px -12px rgba(40,25,10,.30)",
    alertShadow: "0 2px 4px rgba(40,25,10,.08), 0 16px 32px -14px rgba(40,25,10,.26)",
    dialogShadow: "0 24px 48px -20px rgba(60,40,25,.35)",
    drawerShadow: "0 30px 60px -10px rgba(0,0,0,.5)",
    accentSoft: "rgba(111,78,55,.09)",
    accentLine: "rgba(111,78,55,.19)",
    side: "#DCCFB8",
    sideText: "#2a2620",
    sideAct: "rgba(252,248,238,.72)",
    sideOnAct: "#2A2620",
    sideHover: "rgba(42,38,32,.07)",
    sideDivider: "rgba(42,38,32,.12)",
    // Botones (detalles 4). `sand` es el "Primario" (antes "arena").
    sand: { bg: "#E9DCCF", border: "#6F4E37", text: "#4A2F1F", hover: "#E0CFBF" },
    btn: {
      primario: btn("#E9DCCF", "#4A2F1F", "#6F4E37", 1, "#E0CFBF"),
      secundario: btn("#F1E6DA", "#4A2F1F", "#CDB39A", 1, "#E9DCCF"),
      verde: btn("#C9D6CC", "#1F3326", "#4F6B58", 1.5),
      finalizar: btn("#D9D2BF", "#3A3216", "#8A7B4E", 1.5),
      rojo: btn("#D8C4C0", "#431E1A", "#7E4A44", 1.5),
      neutro: btn("#DCCFB3", "#3A2A1C", "#A8956F", 1.5, "#CFC0A0"),
      icono: btn("#DDD0B4", "#000000", "#9A8A6A", 1, "#D2C4A6"),
      // Píldoras de las tarjetas de ocupación.
      pillVer: btn("transparent", "#3A2A1C", "#8A7B5E", 1.5),
      pillPago: btn("#DCE6DF", "#2C4636", "#A9BFAF"),
      pillFinalizar: btn("#DDE2EA", "#2E3A4E", "#AAB4C4"),
      pillCancelar: btn("#EADDDC", "#5A2E2A", "#C7A9A6"),
    },
    seg: "#EFE6DA",
    segMenu: "#CDBFA5",
    brown: "#6f4e37",
    onBrown: "#ffffff",
    crumbBg: "#E6E3DE",
    splashBg: "#F6F3EE", // PROVISORIO: el detalle no trae el fondo del arranque.
    primaryLight: "#6f4e37",
    // Colores de estado de cochera del plano y su leyenda (detalles 6.1).
    cochera: {
      libre: "#5F8A72",
      porMes: "#516D90",
      porHora: "#A17C4B",
      reservado: "#776D94",
      deuda: "#A0564E",
      bloqueado: "#7A746C",
    },
    // Velo que atenúa las cocheras de otros estados cuando la leyenda filtra (detalles 6.3).
    veil: "rgba(239,237,232,.72)",
    tone: {
      ok: tone(["#2f6b4a", "#eaf3ed", "#c5dccd"]),
      wa: tone(["#85561a", "#f8efdc", "#e6d2a6"]),
      er: tone(["#a03030", "#f8eae8", "#e8c6c2"]),
      oc: tone(["#3f4650", "#e9e8e6", "#c2bfba"]),
      in: tone(["#3b4f6b", "#ebf0f6", "#cfd9e5"]),
      vi: tone(["#5b4a7a", "#eeeaf5", "#d6cde6"]),
      pk: tone(["#8a3f5c", "#f6e9ee", "#e5c6d2"]),
      de: tone(["#5f554b", "#f1ece5", "#ddd4c8"]),
      // Severidad Baja de las alertas (detalles 7): el texto es del diseño; fondo y borde PROVISORIO.
      gr: tone(["#8D969C", "#eef0f1", "#d1d6d9"]),
    },
  },
  dark: {
    app: "#1A1A1A",
    surf: "#212121",
    sunk: "#2a2a2a",
    act: "#2e2e2e",
    border: "#333333",
    strong: "#444444",
    text: "#eef0f8",
    muted: "#a6abc4",
    faint: "#8a8faa",
    input: "#12141c",
    tile: "#1A1A1A",
    shadow: "0 2px 6px rgba(0,0,0,.45)",
    alertShadow: "0 2px 6px rgba(0,0,0,.45)",
    dialogShadow: "0 30px 60px -20px rgba(0,0,0,.85)",
    drawerShadow: "0 30px 60px -10px rgba(0,0,0,.5)",
    accentSoft: "rgba(217,185,155,.09)", // PROVISORIO: mismo criterio que en claro, sobre el acento oscuro.
    accentLine: "rgba(217,185,155,.19)", // PROVISORIO
    side: "#242424",
    sideText: "#f4efe4",
    sideAct: "#E6E3DE",
    sideOnAct: "#242424",
    sideHover: "rgba(244,239,228,.08)",
    sideDivider: "rgba(244,239,228,.14)",
    sand: { bg: "#4a3d30", border: "#d9b99b", text: "#f4efe4", hover: "#57483a" },
    // PROVISORIO: el detalle no trae los botones en oscuro; se derivan de los tonos de estado.
    btn: {
      primario: btn("#4a3d30", "#f4efe4", "#d9b99b", 1, "#57483a"),
      secundario: btn("#3a3129", "#f4efe4", "#7a6650", 1, "#453a30"),
      verde: btn("rgba(94,227,161,.12)", "#5ee3a1", "rgba(94,227,161,.45)", 1.5),
      finalizar: btn("rgba(255,195,107,.10)", "#ffc36b", "rgba(255,195,107,.4)", 1.5),
      rojo: btn("rgba(255,127,155,.12)", "#ff7f9b", "rgba(255,127,155,.45)", 1.5),
      neutro: btn("#3a3129", "#f4efe4", "#7a6650", 1.5, "#453a30"),
      icono: btn("#3a3129", "#f4efe4", "#7a6650", 1, "#453a30"),
      pillVer: btn("transparent", "#eef0f8", "#7a6650", 1.5),
      pillPago: btn("rgba(94,227,161,.12)", "#5ee3a1", "rgba(94,227,161,.3)"),
      pillFinalizar: btn("rgba(147,165,255,.12)", "#93a5ff", "rgba(147,165,255,.3)"),
      pillCancelar: btn("rgba(255,127,155,.12)", "#ff7f9b", "rgba(255,127,155,.3)"),
    },
    seg: "#2e2e2e",
    segMenu: "#1a1a1a",
    brown: "#8a6347",
    onBrown: "#ffffff",
    crumbBg: "#262626",
    splashBg: "#1A1A1A", // PROVISORIO
    primaryLight: "#d9b99b",
    // El detalle no trae los colores de cochera en oscuro: los mismos que en claro (PROVISORIO).
    cochera: {
      libre: "#5F8A72",
      porMes: "#516D90",
      porHora: "#A17C4B",
      reservado: "#776D94",
      deuda: "#A0564E",
      bloqueado: "#7A746C",
    },
    veil: "rgba(26,26,26,.72)", // PROVISORIO
    // En oscuro, el fondo de cada estado es su color al 12% y el borde al 30% (detalles 2).
    tone: {
      ok: tone(["#5ee3a1", "rgba(94,227,161,.12)", "rgba(94,227,161,.3)"]),
      wa: tone(["#ffc36b", "rgba(255,195,107,.12)", "rgba(255,195,107,.3)"]),
      er: tone(["#ff7f9b", "rgba(255,127,155,.12)", "rgba(255,127,155,.3)"]),
      oc: tone(["#b4b9c0", "rgba(180,185,192,.12)", "rgba(180,185,192,.3)"]),
      in: tone(["#93a5ff", "rgba(147,165,255,.12)", "rgba(147,165,255,.3)"]),
      vi: tone(["#c4a3ff", "rgba(196,163,255,.12)", "rgba(196,163,255,.3)"]),
      pk: tone(["#ff92d0", "rgba(255,146,208,.12)", "rgba(255,146,208,.3)"]),
      // El texto de `de` en oscuro no está en el detalle: PROVISORIO (fondo y borde siguen la regla 12%/30%).
      de: tone(["#b8b0a6", "rgba(184,176,166,.12)", "rgba(184,176,166,.3)"]),
      // Severidad Baja en oscuro: PROVISORIO (el detalle solo trae el color en claro).
      gr: tone(["#b7bec3", "rgba(183,190,195,.12)", "rgba(183,190,195,.3)"]),
    },
  },
};

/** Los tonos de estado del diseño (`gr` es la severidad Baja de las alertas). */
export const TONE_KEYS = ["ok", "wa", "er", "oc", "in", "vi", "pk", "de", "gr"];

// Nombre de color de MUI (el que devuelve `colorOf` de enums.js) → tono del diseño (D-FM4).
export const COLOR_TONE = {
  success: "ok",
  warning: "wa",
  error: "er",
  info: "in",
  secondary: "vi",
  oc: "oc",
  gr: "gr",
  default: "de",
};

// Un color de MUI a partir de un tono: `main` = texto, `light` = fondo; el borde queda en `palette.pc.tone`.
const toneColor = (t, mode) => ({
  main: t.text,
  light: t.bg,
  dark: t.text,
  contrastText: mode === "dark" ? "#1a1a1a" : "#ffffff",
});

// Estilo de un botón a partir de su entrada de `btn`.
const btnStyle = (b) => ({
  backgroundColor: b.bg,
  color: b.text,
  border: `${b.bw}px solid ${b.border}`,
  "&:hover": b.hover ? { backgroundColor: b.hover } : { backgroundColor: b.bg, filter: "brightness(0.96)" },
});

/**
 * Tema de MUI para el modo pedido.
 * @param {"light" | "dark"} mode
 */
export function getTheme(mode = "light") {
  const m = mode === "dark" ? "dark" : "light";
  const P = PALETTE[m];
  const T = P.tone;
  const B = P.btn;
  // Color de acento para texto y enlaces: el marrón en claro, el marrón claro en oscuro (detalles 2).
  const accent = P.primaryLight;
  // Deshabilitado (detalles 4, Botones): fondo hundido, texto muted, borde punteado.
  const disabled = {
    backgroundColor: P.sunk,
    color: P.muted,
    border: `1px dashed ${P.strong}`,
    cursor: "not-allowed",
    pointerEvents: "auto",
  };

  return createTheme({
    spacing: 8,
    shape: { borderRadius: RADIUS },
    palette: {
      mode: m,
      primary: { main: "#6f4e37", dark: "#4a2f1f", light: "#d9b99b", contrastText: "#ffffff" },
      secondary: toneColor(T.vi, m),
      success: toneColor(T.ok, m),
      warning: toneColor(T.wa, m),
      error: toneColor(T.er, m),
      info: toneColor(T.in, m),
      // Color propio de la cochera "Ocupada" (pizarra, D-FM4).
      oc: toneColor(T.oc, m),
      // Severidad Baja de las alertas (detalles 7).
      gr: toneColor(T.gr, m),
      background: { default: P.app, paper: P.surf },
      divider: P.border,
      text: { primary: P.text, secondary: P.muted },
      action: { selected: P.act, hover: P.sunk },
      pc: {
        side: P.side,
        sideText: P.sideText,
        sideAct: P.sideAct,
        sideOnAct: P.sideOnAct,
        sideHover: P.sideHover,
        crumbBg: P.crumbBg,
        sideDivider: P.sideDivider,
        tile: P.tile,
        sand: P.sand,
        btn: B,
        seg: P.seg,
        segMenu: P.segMenu,
        brown: P.brown,
        onBrown: P.onBrown,
        sunk: P.sunk,
        strong: P.strong,
        faint: P.faint,
        input: P.input,
        shadow: P.shadow,
        alertShadow: P.alertShadow,
        dialogShadow: P.dialogShadow,
        splashBg: P.splashBg,
        accentSoft: P.accentSoft,
        accentLine: P.accentLine,
        cochera: P.cochera,
        veil: P.veil,
        accent,
        tone: T,
      },
    },
    typography: {
      fontFamily: FONT_FAMILY,
      htmlFontSize: 16,
      fontSize: 16,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      // Escala de detalles 1. Ningún texto baja de 16 px.
      // h4 = H1 título de pantalla; h5 = H2 (y título de diálogo); h6 = H3 título de tarjeta.
      h4: { fontWeight: 700, fontSize: "1.875rem", letterSpacing: "-0.02em", lineHeight: 1.15 },
      h5: { fontWeight: 700, fontSize: "1.375rem", letterSpacing: "-0.015em", lineHeight: 1.2 },
      h6: { fontWeight: 700, fontSize: "1.1875rem", letterSpacing: "-0.01em", lineHeight: 1.3 },
      // Cuerpo 16/500; secundario 16/400 (el color muted lo pone quien lo usa); cuerpo fuerte 16/600.
      body1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.5 },
      body2: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
      subtitle1: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
      subtitle2: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
      caption: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
      button: { textTransform: "none", fontWeight: 600, fontSize: "1rem" },
      // Etiqueta y número de KPI (Panel y Monitor).
      kpiLabel: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
      kpi: { fontWeight: 700, fontSize: "2.25rem", letterSpacing: "-0.025em", lineHeight: 1.05 },
      kpiSm: { fontWeight: 700, fontSize: "2.25rem", letterSpacing: "-0.025em", lineHeight: 1.05 },
      // Dinero 19/700; precio grande del resumen de Registrar ingreso.
      dinero: { fontWeight: 700, fontSize: "1.1875rem", lineHeight: 1.3 },
      precio: { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.02em", lineHeight: 1.15 },
      // Meta de las alertas (detalles 7): 15 px, la única excepción a los 16 px.
      meta: { fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.5 },
      // Logo del menú lateral.
      logo: { fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", lineHeight: 1.2 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: m },
          body: { fontVariantNumeric: "tabular-nums" },
          "button, input, select, textarea": { fontFamily: "inherit" },
          // Titileo del punto de estado de las alertas (detalles 7) y pulso del skeleton (detalles 4).
          "@keyframes pcBlink": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.25, transform: "scale(.8)" },
          },
          "@keyframes pcPulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.5 },
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": { animationDuration: "0s !important" },
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          variantMapping: { kpiLabel: "div", kpi: "div", kpiSm: "div", dinero: "span", precio: "div", logo: "div", meta: "div" },
        },
      },
      // Barra superior mobile.
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: {
          root: { backgroundColor: P.crumbBg, color: P.text, boxShadow: "none", borderBottom: `1px solid ${P.border}` },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          root: { "&.MuiDrawer-modal .MuiDrawer-paper": { boxShadow: P.drawerShadow } },
          paper: { backgroundColor: P.side, color: P.sideText, border: "none", boxShadow: "none", backgroundImage: "none" },
        },
      },
      // Ítems del menú lateral (detalles 3): 44 px, padding 0 16, gap 12, 16/600; el activo en píldora sólida.
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: BUTTON_RADIUS,
            minHeight: 44,
            padding: "0 16px",
            gap: 12,
            fontSize: "1rem",
            fontWeight: 600,
            "&:hover": { backgroundColor: P.sideHover },
            "&.Mui-selected": {
              backgroundColor: P.sideAct,
              color: P.sideOnAct,
              fontWeight: 700,
              "&:hover": { backgroundColor: P.sideAct },
            },
          },
        },
      },
      // Tarjeta (detalles 4): borde 1 px `strong`, radio 10 y la sombra doble.
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: { root: { boxShadow: P.shadow, backgroundImage: "none", borderColor: P.strong } },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: P.border },
        },
        variants: [
          // Tile de KPI (detalles 4): fondo app, borde suave, radio 10, padding 14/16 y gap 6.
          {
            props: { variant: "tile" },
            style: {
              backgroundColor: P.tile,
              border: `1px solid ${P.border}`,
              borderRadius: RADIUS,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            },
          },
          // Tile compacto (padding 10/12).
          {
            props: { variant: "tileCompacto" },
            style: {
              backgroundColor: P.tile,
              border: `1px solid ${P.border}`,
              borderRadius: RADIUS,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            },
          },
          // Recuadro hundido (área del plano del Panel): radio 10.
          { props: { variant: "hundido" }, style: { backgroundColor: P.tile, border: `1px solid ${P.border}`, borderRadius: RADIUS } },
        ],
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          // Base (detalles 4): 42 px (46 en mobile y grande), padding 0 18, radio 12, 16/600, gap 8, sin salto.
          root: {
            minHeight: 42,
            padding: "0 18px",
            borderRadius: BUTTON_RADIUS,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            gap: 8,
            whiteSpace: "nowrap",
            "@media (max-width:899.95px)": { minHeight: 46 },
            "& .MuiButton-startIcon, & .MuiButton-endIcon": { margin: 0 },
            "&.Mui-disabled": disabled,
          },
          sizeLarge: { minHeight: 46 },
          sizeSmall: { minHeight: 36, padding: "0 14px" },
          // En oscuro el marrón de acento no se lee sobre el fondo: se usa su versión clara.
          outlinedPrimary: { color: accent, borderColor: P.strong, "&:hover": { borderColor: accent, backgroundColor: P.sunk } },
          textPrimary: { color: accent, "&:hover": { backgroundColor: P.sunk } },
        },
        variants: [
          // `contained` con su color (detalles 4): Primario, Secundario, Verde (Registrar pago), Finalizar (info),
          // Rojo (Cancelar, Anular, Desactivar) y Neutro (warning).
          { props: { variant: "contained" }, style: btnStyle(B.primario) },
          { props: { variant: "contained", color: "primary" }, style: btnStyle(B.primario) },
          { props: { variant: "contained", color: "secondary" }, style: btnStyle(B.secundario) },
          { props: { variant: "contained", color: "success" }, style: btnStyle(B.verde) },
          { props: { variant: "contained", color: "info" }, style: btnStyle(B.finalizar) },
          { props: { variant: "contained", color: "error" }, style: btnStyle(B.rojo) },
          { props: { variant: "contained", color: "warning" }, style: btnStyle(B.neutro) },
          // "Arena" = Primario de los detalles: Nueva ocupación, Aplicar, Buscar...
          { props: { variant: "arena" }, style: btnStyle(B.primario) },
          // Secundario y Neutro como variantes propias.
          { props: { variant: "secundario" }, style: btnStyle(B.secundario) },
          { props: { variant: "neutro" }, style: btnStyle(B.neutro) },
          {
            // Contorno: Limpiar (Ocupaciones), Cancelar.
            props: { variant: "contorno" },
            style: {
              backgroundColor: P.surf,
              color: P.text,
              border: `1px solid ${P.strong}`,
              borderRadius: OUTLINE_RADIUS,
              "&:hover": { backgroundColor: P.sunk },
            },
          },
          {
            // Marrón lleno: botón final de un formulario.
            props: { variant: "marron" },
            style: {
              backgroundColor: P.brown,
              color: P.onBrown,
              border: `1px solid ${P.brown}`,
              "&:hover": { backgroundColor: P.brown, filter: "brightness(1.12)" },
            },
          },
          {
            // Acción en píldora (tarjetas de ocupación). Sin `color` (o "inherit") es "Ver".
            props: { variant: "pill" },
            style: { borderRadius: PILL_RADIUS, ...btnStyle(B.pillVer), "&:hover": { backgroundColor: P.sunk } },
          },
          { props: { variant: "pill", color: "primary" }, style: btnStyle(B.primario) },
          { props: { variant: "pill", color: "success" }, style: btnStyle(B.pillPago) },
          { props: { variant: "pill", color: "info" }, style: btnStyle(B.pillFinalizar) },
          { props: { variant: "pill", color: "error" }, style: btnStyle(B.pillCancelar) },
          {
            props: { variant: "pill", color: "warning" },
            style: { backgroundColor: T.wa.bg, color: T.wa.text, border: `1px solid ${T.wa.border}`, "&:hover": { backgroundColor: T.wa.bg, filter: "brightness(0.96)" } },
          },
          {
            // Ícono redondo de refrescar (detalles 4): 42 px, radio completo.
            props: { variant: "refrescar" },
            style: {
              width: 42,
              height: 42,
              minWidth: 42,
              minHeight: 42,
              padding: 0,
              borderRadius: PILL_RADIUS,
              ...btnStyle(B.icono),
              "@media (max-width:899.95px)": { minHeight: 42 },
            },
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: BUTTON_RADIUS } },
      },
      // Chips de estado (detalles 4): 28 px, padding 0 10, radio 6, 16/600, borde 1 px del tono.
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const t = T[COLOR_TONE[ownerState.color ?? "default"] ?? "de"];
            const outlined = ownerState.variant === "outlined";
            const fg = outlined ? P.text : t.text;
            const border = outlined ? P.strong : t.border;
            return {
              height: 28,
              borderRadius: CHIP_RADIUS,
              fontSize: "1rem",
              fontWeight: 600,
              border: `1px solid ${border}`,
              color: fg,
              backgroundColor: outlined ? "transparent" : t.bg,
              "& .MuiChip-label": { paddingLeft: 10, paddingRight: 10 },
              "&.MuiChip-clickable:hover, &.MuiChip-deletable:hover": {
                backgroundColor: outlined ? P.sunk : t.bg,
                filter: "brightness(0.97)",
              },
              "& .MuiChip-deleteIcon": { color: fg, opacity: 0.7, "&:hover": { color: fg, opacity: 1 } },
              "& .MuiChip-icon": { color: fg },
            };
          },
        },
      },
      MuiTextField: { defaultProps: { size: "small" } },
      // Inputs (detalles 4): 42 px, padding 0 14, radio 8, 16 px; textarea mínimo 88 px con padding 12.
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: P.input,
            borderRadius: FIELD_RADIUS,
            fontSize: "1rem",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: P.strong, top: 0 },
            // La etiqueta va arriba del campo: no hay muesca en el borde.
            "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: P.faint },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: accent },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: T.er.text },
            "&.Mui-disabled": { backgroundColor: P.sunk },
            "&.MuiInputBase-multiline": { padding: 12, minHeight: 88, alignItems: "flex-start" },
          },
          input: {
            height: 42,
            padding: "0 14px",
            boxSizing: "border-box",
            "&::placeholder": { color: P.faint, opacity: 1 },
          },
          inputMultiline: { height: "auto", padding: 0 },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: { display: "flex", alignItems: "center", minHeight: 0 },
          icon: { fontSize: 16, right: 14 },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": { paddingTop: 0, paddingBottom: 0, paddingLeft: 0 },
            "& .MuiOutlinedInput-root .MuiAutocomplete-input": { padding: "0 14px" },
          },
        },
      },
      // La etiqueta va ARRIBA del campo, estática (16/600, margen 6), no flotante dentro del borde.
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            "&.MuiInputLabel-root": {
              position: "static",
              transform: "none",
              maxWidth: "100%",
              marginBottom: 6,
              fontSize: "1rem",
              fontWeight: 600,
              lineHeight: 1.4,
              color: P.text,
              "&.Mui-focused": { color: P.text },
              "&.Mui-error": { color: T.er.text },
              "&.Mui-disabled": { color: P.muted },
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: { fontSize: "1rem", marginTop: 6, marginLeft: 0, marginRight: 0, color: P.muted, "&.Mui-error": { color: T.er.text } },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: { label: { fontSize: "1rem" } },
      },
      // Checkbox 20×20 (detalles 4).
      MuiCheckbox: {
        styleOverrides: { root: { "& .MuiSvgIcon-root": { fontSize: 20 } } },
      },
      // Switch 42×24 (detalles 4).
      MuiSwitch: {
        styleOverrides: {
          root: { width: 42, height: 24, padding: 0, margin: 8, overflow: "visible" },
          switchBase: {
            padding: 2,
            "&.Mui-checked": { transform: "translateX(18px)", color: "#ffffff" },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: P.brown, opacity: 1 },
          },
          thumb: { width: 20, height: 20, boxShadow: "none" },
          track: { borderRadius: 12, backgroundColor: P.strong, opacity: 1 },
        },
      },
      // Diálogo genérico (detalles 4): borde 1 px, radio 14, padding 26, gap 14, título 22/700.
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: DIALOG_RADIUS,
            border: `1px solid ${P.border}`,
            boxShadow: P.dialogShadow,
            backgroundImage: "none",
          },
          paperFullScreen: { borderRadius: 0, border: 0 },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2, padding: "26px 26px 14px" },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: "0 26px 14px" } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: "14px 26px 26px", gap: 8, justifyContent: "flex-end" } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: P.border, fontSize: "1rem" },
          head: { fontWeight: 400, fontSize: "1rem", color: P.muted, backgroundColor: P.sunk },
        },
      },
      // Banner de alerta (detalles 4): flex, gap 12, padding 12/16, radio 10 y un punto de 10×10 a la izquierda
      // en lugar del ícono.
      MuiAlert: {
        defaultProps: { variant: "standard" },
        styleOverrides: {
          root: ({ ownerState }) => {
            const key = { success: "ok", warning: "wa", error: "er", info: "in" }[ownerState.severity ?? "info"] ?? "in";
            const t = T[key];
            return {
              borderRadius: RADIUS,
              padding: "12px 16px",
              gap: 12,
              alignItems: "center",
              fontSize: "1rem",
              ...(ownerState.variant === "standard" && {
                color: t.text,
                backgroundColor: t.bg,
                border: `1px solid ${t.border}`,
                "&::before": {
                  content: '""',
                  flex: "none",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: t.text,
                },
                "& .MuiAlert-icon": { display: "none" },
              }),
            };
          },
          message: { padding: 0 },
          action: { padding: 0, marginRight: 0 },
        },
      },
      // Control segmentado: cápsula arena, la opción elegida en marrón lleno. Con `color="standard"` es la
      // variante clara del menú lateral ("Claro | Oscuro").
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const menu = ownerState.color === "standard";
            return {
              backgroundColor: menu ? P.segMenu : P.seg,
              borderRadius: PILL_RADIUS,
              padding: 4,
              gap: 4,
              "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: PILL_RADIUS, margin: 0 },
              "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": { borderRadius: PILL_RADIUS, marginLeft: 0 },
              "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": { borderRadius: PILL_RADIUS },
            };
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const menu = ownerState.color === "standard";
            return {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "1rem",
              lineHeight: 1.3,
              padding: "6px 16px",
              color: P.text,
              border: 0,
              "&:hover": { backgroundColor: "transparent", filter: "brightness(0.96)" },
              "&.Mui-selected, &.Mui-selected:hover": menu
                ? { backgroundColor: P.sideAct, color: P.sideOnAct }
                : { backgroundColor: P.brown, color: P.onBrown },
              "&.Mui-disabled": { color: P.muted },
            };
          },
        },
      },
      // Skeleton (detalles 4): fondo hundido y pulso de opacidad 1 → 0.5 → 1 en 1.4 s.
      MuiSkeleton: {
        defaultProps: { animation: "pulse" },
        styleOverrides: {
          root: { backgroundColor: P.sunk },
          pulse: { animation: "pcPulse 1.4s ease-in-out infinite" },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: P.text, color: P.app, fontSize: "1rem", borderRadius: FIELD_RADIUS },
          arrow: { color: P.text },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${P.border}`, boxShadow: P.dialogShadow },
        },
      },
      MuiMenuItem: {
        styleOverrides: { root: { fontSize: "1rem" } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: P.border } },
      },
      // Link secundario (detalles 4): color de acento, subrayado con offset de 3 px.
      MuiLink: {
        defaultProps: { underline: "always" },
        styleOverrides: { root: { color: accent, textDecorationColor: "currentColor", textUnderlineOffset: 3 } },
      },
      // Spinner (detalles 4): 40 px, trazo de ~4 px en el acento, giro de 0.9 s.
      MuiCircularProgress: {
        defaultProps: { size: 40, thickness: 4 },
        styleOverrides: {
          colorPrimary: { color: accent },
          indeterminate: { animationDuration: "0.9s" },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          colorPrimary: { backgroundColor: P.accentSoft },
          barColorPrimary: { backgroundColor: accent },
        },
      },
    },
  });
}
