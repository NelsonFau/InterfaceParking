// Único ThemeProvider de la app (spec 13, D-FM5): envuelve todo de BrowserRouter hacia adentro, así Splash,
// Login, Callback y AccountBlocked (que están fuera del Layout) también toman el tema.
// Incluye CssBaseline, el estado del modo (en memoria, D-FM6) y el Toaster de react-hot-toast con el estilo del tema.
import { CssBaseline, ThemeProvider, useMediaQuery, useTheme } from "@mui/material";
import { useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ColorModeContext } from "./ColorModeContext.js";
import { getTheme } from "./theme.js";

function ThemedToaster() {
  const theme = useTheme();
  const { ok, er } = theme.palette.pc.tone;
  const base = {
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.palette.pc.shadow,
    fontFamily: theme.typography.fontFamily,
  };
  return (
    <Toaster
      toastOptions={{
        style: base,
        success: { iconTheme: { primary: ok.text, secondary: theme.palette.background.paper } },
        error: { iconTheme: { primary: er.text, secondary: theme.palette.background.paper } },
      }}
    />
  );
}

export default function ThemeRoot({ children }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  // "auto" sigue al sistema; claro y oscuro lo fijan. No se guarda en ningún lado (ARQ-1).
  const [preference, setPreference] = useState("auto");
  const mode = preference === "auto" ? (prefersDark ? "dark" : "light") : preference;

  const theme = useMemo(() => getTheme(mode), [mode]);
  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <ThemedToaster />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
