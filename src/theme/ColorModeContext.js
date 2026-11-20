// Contexto del modo de color (spec 13, D-FM6). El estado vive solo en memoria (ARQ-1): al recargar vuelve al
// del sistema. `preference` es lo que eligió el usuario ("auto" | "light" | "dark"); `mode` es el modo efectivo.
import { createContext } from "react";

export const COLOR_PREFERENCES = ["auto", "light", "dark"];

export const ColorModeContext = createContext({
  preference: "auto",
  mode: "light",
  setPreference: () => {},
});
