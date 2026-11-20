import { useContext } from "react";
import { ColorModeContext } from "./ColorModeContext.js";

/** `{ mode, setMode }` del modo de color: "light" (por defecto) o "dark". */
export function useColorMode() {
  return useContext(ColorModeContext);
}
