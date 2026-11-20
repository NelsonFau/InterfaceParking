// Tema de ParkingControl (spec 13, D-FM3 y D-FM4). Replica el diseño "Parking Oficial".
// ÚNICO lugar donde se crea un tema de MUI y donde viven colores, radios y sombras: las páginas leen el tema
// (`palette`, `palette.pc`, `shape`) y un `sx` de página queda solo para layout (grilla, ancho, alineación).
// Cómo agregar un color o cambiar un radio: docs/manual/frontend/13-diseno.md.
import { createTheme } from "@mui/material/styles";

/** Radio de tarjetas, diálogos y menús (confirmado por el desarrollador). */
export const RADIUS = 10;
/** Radio de los campos de texto: max(8, round(10 × .6)) = 6. */
export const FIELD_RADIUS = 6;
/** Radio de los botones y del ítem activo del menú. P-FM11: "Redondeado" 12 px; "Píldora" sería 999. */
export const BUTTON_RADIUS = 12;

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
    shadow: "0 1px 2px rgba(60,40,25,.05)",
    dialogShadow: "0 24px 48px -20px rgba(60,40,25,.35)",
    side: "#DCCFB8",
    sideText: "#2a2620",
    sideAct: "rgba(252,248,238,.72)",
    sideOnAct: "#2a2620",
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
    shadow: "0 14px 32px -18px rgba(0,0,0,.9)",
    dialogShadow: "0 30px 60px -20px rgba(0,0,0,.85)",
    side: "#242424",
    sideText: "#f4efe4",
    sideAct: "#E6E3DE",
    sideOnAct: "#242424",
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
      // Escala PROVISORIA (P-FM1): cuerpo de 16 px, números grandes en 800 con cifras tabulares.
      body1: { fontSize: "1rem" },
      body2: { fontSize: "0.9375rem" },
      caption: { fontSize: "0.8125rem" },
      h4: { fontWeight: 600, fontSize: "2rem", lineHeight: 1.2 },
      h5: { fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.25 },
      h6: { fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.3 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: m },
          body: { fontVariantNumeric: "tabular-nums" },
        },
      },
      // Barra superior: solo existe en mobile (D-FM8).
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: {
          root: { backgroundColor: P.side, color: P.sideText, boxShadow: "none", borderBottom: `1px solid ${P.border}` },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: P.side, color: P.sideText, border: "none", backgroundImage: "none" },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: BUTTON_RADIUS,
            fontWeight: 600,
            "&.Mui-selected": {
              backgroundColor: P.sideAct,
              color: P.sideOnAct,
              fontWeight: 700,
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
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: BUTTON_RADIUS, textTransform: "none", fontWeight: 700 },
          sizeLarge: { paddingTop: 10, paddingBottom: 10 },
          // En oscuro el marrón de acento no se lee sobre el fondo: se usa su versión clara.
          outlinedPrimary: { color: accent, borderColor: P.strong, "&:hover": { borderColor: accent, backgroundColor: P.sunk } },
          textPrimary: { color: accent, "&:hover": { backgroundColor: P.sunk } },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: BUTTON_RADIUS } },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const t = T[COLOR_TONE[ownerState.color ?? "default"] ?? "de"];
            const outlined = ownerState.variant === "outlined";
            return {
              height: 28,
              borderRadius: 999,
              fontWeight: 600,
              border: `1px solid ${t.border}`,
              color: t.text,
              backgroundColor: outlined ? "transparent" : t.bg,
              "&.MuiChip-clickable:hover, &.MuiChip-deletable:hover": {
                backgroundColor: outlined ? P.sunk : t.bg,
                filter: "brightness(0.97)",
              },
              "& .MuiChip-deleteIcon": { color: t.text, opacity: 0.7, "&:hover": { color: t.text, opacity: 1 } },
              "& .MuiChip-icon": { color: t.text },
            };
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: P.input,
            borderRadius: FIELD_RADIUS,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: P.strong },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: P.faint },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: accent },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { "&.Mui-focused": { color: accent } } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontSize: "0.8125rem", marginLeft: 2, marginRight: 2 } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: RADIUS, boxShadow: P.dialogShadow, backgroundImage: "none" },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: "1.25rem", fontWeight: 700 } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: "12px 24px 20px", gap: 8 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: P.border },
          head: { fontWeight: 700, color: P.muted, backgroundColor: P.sunk },
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
      // Pestañas segmentadas (diseño): fondo hundido, la activa va sobre una "pastilla" de superficie.
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44, padding: 4, backgroundColor: P.sunk, borderRadius: BUTTON_RADIUS },
          indicator: { display: "none" },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 36,
            borderRadius: RADIUS,
            textTransform: "none",
            fontWeight: 600,
            "&.Mui-selected": { backgroundColor: P.surf, color: P.text, boxShadow: P.shadow },
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
            "&.Mui-checked": { color: accent },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: accent, opacity: 0.6 },
          },
        },
      },
    },
  });
}
