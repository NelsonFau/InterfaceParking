// Spec 13 (D-FM12): los diálogos van a pantalla completa por debajo de `sm` (600 px). Un solo criterio para todos.
import { useMediaQuery, useTheme } from "@mui/material";

/** `true` por debajo de `sm`: se pasa a `<Dialog fullScreen={...}>`. */
export function useDialogFullScreen() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"));
}
