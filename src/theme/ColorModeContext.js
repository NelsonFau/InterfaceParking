// Contexto del modo de color (spec 13, D-FM6 y guía visual 1.1). El estado vive solo en memoria (ARQ-1): al
// recargar vuelve al modo claro, que es el de arranque. Ya no se sigue al sistema operativo.
import { createContext } from "react";

export const COLOR_MODES = ["light", "dark"];

export const ColorModeContext = createContext({
  mode: "light",
  setMode: () => {},
});
