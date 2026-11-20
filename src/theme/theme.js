// Tema de ParkingControl (spec 13, D-FM3 y D-FM4). Replica el diseño "Parking Oficial".
// ÚNICO lugar donde se crea un tema de MUI y donde viven colores, radios y sombras: las páginas leen el tema
// (`palette`, `palette.pc`, `shape`) y un `sx` de página queda solo para layout (grilla, ancho, alineación).
// Cómo agregar un color o cambiar un radio: docs/manual/frontend/13-diseno.md.
import { createTheme } from "@mui/material/styles";

/** Radio de tarjetas, diálogos y menús (confirmado por el desarrollador). */
export const RADIUS = 10;
/** Radio de los campos de texto: max(8, round(10 × .6)) = 6. */
export const FIELD_RADIUS = 6;
/** Radio de los botones "arena", "marrón" y del ítem activo del menú (guía visual 1.3: ~10 px). */
export const BUTTON_RADIUS = 10;
/** Radio de los botones de contorno (guía visual 1.3: ~8 px). */
export const OUTLINE_RADIUS = 8;
/** Radio de las acciones en píldora. */
export const PILL_RADIUS = 999;
/** Radio de los chips de estado (guía visual 1.5: rectangulares, ~4 px). */
export const CHIP_RADIUS = 4;

export const FONT_FAMILY = '"Red Hat Display", system-ui, sans-serif';

// Cada tono de estado es [texto, fondo, borde] (tabla de la sección 2.2 de la spec).
const tone = ([text, bg, border]) => ({ text, bg, border });

/**
 * Paletas del diseño. Valores marcados PROVISORIO: no estaban en el relevamiento (P-FM1) y hay que
 * confirmarlos contra el export del diseño.
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
    tile: "#f3efe9",
    shadow: "0 2px 6px rgba(60,40,25,.08)",
    dialogShadow: "0 24px 48px -20px rgba(60,40,25,.35)",
    side: "#DCCFB8",
    sideText: "#2a2620",
    sideAct: "#F6F1E8",
    sideOnAct: "#2a2620",
    sideDivider: "#C9BA9F",
    // Botón "arena" (guía visual 1.3) y control segmentado (1.8).
    sand: { bg: "#E8D9C3", border: "#B9A68C", text: "#2a2018", hover: "#E0CFB6" },
    seg: "#EFE6DA",
    segMenu: "#CDBFA5",
    brown: "#6f4e37",
    onBrown: "#ffffff",
    disabledBg: "#d9d4cc",
    disabledText: "#8f877d",
    crumbBg: "#E6E3DE",
    splashBg: "#F6F3EE", // PROVISORIO
    primaryLight: "#6f4e37",
    tone: {
      ok: tone(["#2f6b4a", "#eaf3ed", "#c5dccd"]),
      wa: tone(["#85561a", "#f8efdc", "#e6d2a6"]),
      er: tone(["#a03030", "#f8eae8", "#e8c6c2"]),
      oc: tone(["#3f4650", "#e9e8e6", "#c2bfba"]),
      in: tone(["#3b4f6b", "#ebf0f6", "#cfd9e5"]),
      vi: tone(["#5b4a7a", "#eeeaf5", "#d6cde6"]),
      pk: tone(["#8a3f5c", "#f6e9ee", "#e5c6d2"]),
      de: tone(["#5f554b", "#f1ece5", "#ddd4c8"]),
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
    tile: "#262626",
    shadow: "0 2px 6px rgba(0,0,0,.45)",
    dialogShadow: "0 30px 60px -20px rgba(0,0,0,.85)",
    side: "#242424",
    sideText: "#f4efe4",
    sideAct: "#E6E3DE",
    sideOnAct: "#242424",
    sideDivider: "#3a3a3a",
    sand: { bg: "#4a3d30", border: "#7a6650", text: "#f4efe4", hover: "#57483a" },
    seg: "#2e2e2e",
    segMenu: "#1a1a1a",
    brown: "#8a6347",
    onBrown: "#ffffff",
    disabledBg: "#333333",
    disabledText: "#777777",
    crumbBg: "#262626",
    splashBg: "#1A1A1A", // PROVISORIO
    primaryLight: "#d9b99b",
    tone: {
      ok: tone(["#5ee3a1", "rgba(94,227,161,.12)", "rgba(94,227,161,.3)"]),
      wa: tone(["#ffc36b", "rgba(255,195,107,.12)", "rgba(255,195,107,.3)"]),
      er: tone(["#ff7f9b", "rgba(255,127,155,.12)", "rgba(255,127,155,.3)"]),
      oc: tone(["#b4b9c0", "rgba(180,185,192,.12)", "rgba(180,185,192,.3)"]),
      in: tone(["#93a5ff", "rgba(147,165,255,.13)", "rgba(147,165,255,.32)"]),
      vi: tone(["#c4a3ff", "rgba(196,163,255,.13)", "rgba(196,163,255,.32)"]),
      // El borde de pk en oscuro no se relevó: PROVISORIO, mismo criterio que los otros tonos (alfa .3).
      pk: tone(["#ff92d0", "rgba(255,146,208,.12)", "rgba(255,146,208,.3)"]),
      // El tono de en oscuro no se relevó: PROVISORIO, un gris cálido con el mismo criterio de alfa.
      de: tone(["#b8b0a6", "rgba(184,176,166,.12)", "rgba(184,176,166,.3)"]),
    },
  },
};

/** Los 8 tonos de estado del diseño. */
export const TONE_KEYS = ["ok", "wa", "er", "oc", "in", "vi", "pk", "de"];

// Nombre de color de MUI (el que devuelve `colorOf` de enums.js) → tono del diseño (D-FM4).
export const COLOR_TONE = {
  success: "ok",
  warning: "wa",
  error: "er",
  info: "in",
  secondary: "vi",
  oc: "oc",
  default: "de",
};

// Un color de MUI a partir de un tono: `main` = texto, `light` = fondo; el borde queda en `palette.pc.tone`.
const toneColor = (t, mode) => ({
  main: t.text,
  light: t.bg,
  dark: t.text,
  contrastText: mode === "dark" ? "#1a1a1a" : "#ffffff",
});

/**
 * Tema de MUI para el modo pedido.
 * @param {"light" | "dark"} mode
 */
export function getTheme(mode = "light") {
  const m = mode === "dark" ? "dark" : "light";
  const P = PALETTE[m];
  const T = P.tone;
  // Color de acento para texto y enlaces: el marrón en claro, el marrón claro en oscuro.
  const accent = P.primaryLight;

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
      background: { default: P.app, paper: P.surf },
      divider: P.border,
      text: { primary: P.text, secondary: P.muted },
      action: { selected: P.act, hover: P.sunk },
      pc: {
        side: P.side,
        sideText: P.sideText,
        sideAct: P.sideAct,
        sideOnAct: P.sideOnAct,
        crumbBg: P.crumbBg,
        sideDivider: P.sideDivider,
        tile: P.tile,
        sand: P.sand,
        seg: P.seg,
        segMenu: P.segMenu,
        brown: P.brown,
        onBrown: P.onBrown,
        sunk: P.sunk,
        strong: P.strong,
        faint: P.faint,
        input: P.input,
        shadow: P.shadow,
        dialogShadow: P.dialogShadow,
        splashBg: P.splashBg,
        accent,
        tone: T,
      },
    },
    typography: {
      fontFamily: FONT_FAMILY,
      htmlFontSize: 16,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      // Escala de la guía visual 1.1: pesos livianos (400 cuerpo, 500 títulos y números, 600 como máximo).
      body1: { fontSize: "1rem" },
      body2: { fontSize: "0.9375rem" },
      caption: { fontSize: "0.8125rem" },
      h4: { fontWeight: 500, fontSize: "2rem", lineHeight: 1.2 },
      h5: { fontWeight: 500, fontSize: "1.5rem", lineHeight: 1.25 },
      h6: { fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.3 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      button: { textTransform: "none", fontWeight: 500 },
      // Números grandes (peso 500): `kpi` ~34 px (Panel), `kpiSm` ~26 px (Monitor), `precio` ~32 px.
      kpi: { fontWeight: 500, fontSize: "2.125rem", lineHeight: 1.15 },
      kpiSm: { fontWeight: 500, fontSize: "1.625rem", lineHeight: 1.15 },
      precio: { fontWeight: 500, fontSize: "2rem", lineHeight: 1.15 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: m },
          body: { fontVariantNumeric: "tabular-nums" },
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
          paper: { backgroundColor: P.side, color: P.sideText, border: "none", boxShadow: "none", backgroundImage: "none" },
        },
      },
      // Ítems del menú lateral y del menú de usuario (guía visual 1.2): texto plano, el activo en píldora clara.
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: BUTTON_RADIUS,
            fontWeight: 400,
            "&.Mui-selected": {
              backgroundColor: P.sideAct,
              color: P.sideOnAct,
              fontWeight: 500,
              "&:hover": { backgroundColor: P.sideAct },
            },
          },
        },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: { root: { boxShadow: P.shadow, backgroundImage: "none" } },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: P.border },
        },
        variants: [
          // Mosaico de indicador (Panel y Monitor): fondo hundido, borde fino y radio 8.
          { props: { variant: "tile" }, style: { backgroundColor: P.tile, border: `1px solid ${P.border}`, borderRadius: OUTLINE_RADIUS } },
          // Recuadro hundido (área del plano del Panel): radio 10.
          { props: { variant: "hundido" }, style: { backgroundColor: P.tile, border: `1px solid ${P.border}`, borderRadius: RADIUS } },
        ],
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: BUTTON_RADIUS, textTransform: "none", fontWeight: 500 },
          sizeLarge: { paddingTop: 10, paddingBottom: 10 },
          // En oscuro el marrón de acento no se lee sobre el fondo: se usa su versión clara.
          outlinedPrimary: { color: accent, borderColor: P.strong, "&:hover": { borderColor: accent, backgroundColor: P.sunk } },
          textPrimary: { color: accent, "&:hover": { backgroundColor: P.sunk } },
        },
        // Las cuatro familias de la guía visual 1.3 (`variant`), más el botón circular de refrescar.
        variants: [
          {
            // Principal "arena": Nueva ocupación, Aplicar, Buscar, Limpiar de Trazabilidad...
            props: { variant: "arena" },
            style: {
              backgroundColor: P.sand.bg,
              color: P.sand.text,
              border: `1px solid ${P.sand.border}`,
              borderRadius: BUTTON_RADIUS,
              "&:hover": { backgroundColor: P.sand.hover },
              "&.Mui-disabled": { color: P.disabledText, borderColor: P.border, backgroundColor: P.disabledBg },
            },
          },
          {
            // Contorno: Limpiar (Ocupaciones), Cancelar.
            props: { variant: "contorno" },
            style: {
              backgroundColor: P.surf,
              color: P.text,
              border: `1px solid ${P.strong}`,
              borderRadius: OUTLINE_RADIUS,
              "&:hover": { backgroundColor: P.sunk },
              "&.Mui-disabled": { color: P.disabledText, borderColor: P.border },
            },
          },
          {
            // Marrón lleno: botón final de un formulario.
            props: { variant: "marron" },
            style: {
              backgroundColor: P.brown,
              color: P.onBrown,
              border: `1px solid ${P.brown}`,
              borderRadius: BUTTON_RADIUS,
              "&:hover": { backgroundColor: P.brown, filter: "brightness(1.12)" },
              "&.Mui-disabled": { color: P.disabledText, backgroundColor: P.disabledBg, borderColor: P.disabledBg },
            },
          },
          {
            // Acción en píldora. Sin `color` (o "inherit") es la neutra; el resto se tiñe con el tono de la acción.
            props: { variant: "pill" },
            style: {
              borderRadius: PILL_RADIUS,
              backgroundColor: P.surf,
              color: P.text,
              border: `1px solid ${P.text}`,
              "&:hover": { backgroundColor: P.sunk },
              "&.Mui-disabled": { color: P.disabledText, borderColor: P.strong, borderStyle: "dashed", backgroundColor: "transparent" },
            },
          },
          ...[
            ["primary", null],
            ["success", T.ok],
            ["info", T.in],
            ["error", T.er],
            ["warning", T.wa],
          ].map(([color, t]) => ({
            props: { variant: "pill", color },
            style: t
              ? { backgroundColor: t.bg, color: P.text, borderColor: t.border, "&:hover": { backgroundColor: t.bg, filter: "brightness(0.96)" } }
              : { backgroundColor: P.sand.bg, color: P.sand.text, borderColor: P.sand.border, "&:hover": { backgroundColor: P.sand.hover } },
          })),
          {
            // Refrescar: círculo arena de 40 px con el ícono de refrescar.
            props: { variant: "refrescar" },
            style: {
              width: 40,
              height: 40,
              minWidth: 40,
              padding: 0,
              borderRadius: "50%",
              backgroundColor: P.sand.bg,
              color: P.sand.text,
              border: `1px solid ${P.sand.border}`,
              "&:hover": { backgroundColor: P.sand.hover },
            },
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: BUTTON_RADIUS } },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const t = T[COLOR_TONE[ownerState.color ?? "default"] ?? "de"];
            const outlined = ownerState.variant === "outlined";
            const fg = outlined ? P.text : t.text;
            const border = outlined ? P.strong : t.border;
            return {
              height: 24,
              borderRadius: CHIP_RADIUS,
              fontSize: "0.8125rem",
              fontWeight: 500,
              border: `1px solid ${border}`,
              color: fg,
              backgroundColor: outlined ? P.surf : t.bg,
              "& .MuiChip-label": { paddingLeft: 8, paddingRight: 8 },
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: P.input,
            borderRadius: FIELD_RADIUS,
            fontSize: "0.9375rem",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: P.strong, top: 0 },
            // La etiqueta va arriba del campo (guía visual 1.4): no hay muesca en el borde.
            "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: P.faint },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: accent },
            "&.Mui-disabled": { backgroundColor: P.sunk },
          },
          input: { "&::placeholder": { color: P.faint, opacity: 1 } },
        },
      },
      // La etiqueta va ARRIBA del campo, estática (guía visual 1.4), no flotante dentro del borde.
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            "&.MuiInputLabel-root": {
              position: "static",
              transform: "none",
              maxWidth: "100%",
              marginBottom: 6,
              fontSize: "0.9375rem",
              fontWeight: 500,
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
        styleOverrides: { root: { fontSize: "0.8125rem", marginLeft: 0, marginRight: 0, color: P.muted, "&.Mui-error": { color: T.er.text } } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: RADIUS, boxShadow: P.dialogShadow, backgroundImage: "none" },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: "1.25rem", fontWeight: 600 } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: "12px 24px 20px", gap: 8 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: P.border },
          head: { fontWeight: 400, fontSize: "0.9375rem", color: P.muted, backgroundColor: P.sunk },
        },
      },
      MuiAlert: {
        defaultProps: { variant: "standard" },
        styleOverrides: {
          root: ({ ownerState }) => {
            const key = { success: "ok", warning: "wa", error: "er", info: "in" }[ownerState.severity ?? "info"] ?? "in";
            const t = T[key];
            return {
              borderRadius: RADIUS,
              ...(ownerState.variant === "standard" && {
                color: t.text,
                backgroundColor: t.bg,
                border: `1px solid ${t.border}`,
                "& .MuiAlert-icon": { color: t.text },
              }),
            };
          },
        },
      },
      // Control segmentado (guía visual 1.8): cápsula arena, la opción elegida en marrón lleno. Con
      // `color="standard"` es la variante clara del menú lateral ("Claro | Oscuro").
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const menu = ownerState.color === "standard";
            return {
              backgroundColor: menu ? P.segMenu : P.seg,
              borderRadius: 999,
              padding: 4,
              gap: 4,
              "& .MuiToggleButtonGroup-grouped": { border: 0, borderRadius: 999, margin: 0 },
              "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": { borderRadius: 999, marginLeft: 0 },
              "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": { borderRadius: 999 },
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
              fontWeight: 500,
              fontSize: "0.9375rem",
              lineHeight: 1.3,
              padding: "6px 16px",
              color: P.text,
              border: 0,
              "&:hover": { backgroundColor: "transparent", filter: "brightness(0.96)" },
              "&.Mui-selected, &.Mui-selected:hover": menu
                ? { backgroundColor: P.sideAct, color: P.sideOnAct }
                : { backgroundColor: P.brown, color: P.onBrown },
              "&.Mui-disabled": { color: P.disabledText },
            };
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: { root: { backgroundColor: P.sunk } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: P.text, color: P.app, fontSize: "0.8125rem", borderRadius: FIELD_RADIUS },
          arrow: { color: P.text },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${P.border}`, boxShadow: P.dialogShadow },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: P.border } },
      },
      MuiLink: {
        styleOverrides: { root: { color: P.text, textDecorationColor: P.strong } },
      },
      // En oscuro el marrón de acento no se ve sobre el fondo: indicadores de progreso con su versión clara.
      MuiCircularProgress: {
        styleOverrides: { colorPrimary: { color: accent } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          colorPrimary: { backgroundColor: P.sunk },
          barColorPrimary: { backgroundColor: accent },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": { color: P.brown },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: P.brown, opacity: 0.9 },
          },
        },
      },
    },
  });
}
