import { useContext } from "react";
import { ColorModeContext } from "./ColorModeContext.js";

/** `{ preference, mode, setPreference }` del modo de color (D-FM6). */
export function useColorMode() {
  return useContext(ColorModeContext);
}
