// Control segmentado (guía visual 1.8): cápsula con la opción elegida en marrón lleno. Reemplaza a las `Tabs` de MUI.
// `variante="menu"` es la versión clara del menú lateral ("Claro | Oscuro"). Los colores salen del tema.
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

/**
 * @param {{
 *   value: string | number,
 *   onChange: (value: string | number) => void,
 *   options: { value: string | number, label: string, disabled?: boolean }[],
 *   variante?: "marron" | "menu",
 *   ariaLabel?: string,
 *   fullWidth?: boolean,
 * }} props
 */
export default function Segmentado({ value, onChange, options, variante = "marron", ariaLabel, fullWidth = false }) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      color={variante === "menu" ? "standard" : "primary"}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
      onChange={(_event, next) => {
        if (next !== null && next !== undefined) onChange(next);
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
