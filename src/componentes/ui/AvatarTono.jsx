// Círculo teñido con un tono del tema (guía visual 2): el número de cochera en Ocupaciones y las iniciales de cada
// cliente. El color es un nombre de color de MUI (el que devuelve `colorOf`) o una clave de tono (`tone`, de
// `TONE_KEYS`). Fondo, borde y texto salen de `palette.pc.tone`.
import { Avatar } from "@mui/material";
import { COLOR_TONE } from "../../theme/theme.js";

/**
 * @param {{ color?: string, tone?: string, size?: number, children?: import("react").ReactNode }} props
 */
export default function AvatarTono({ color = "default", tone, size = 36, children, ...rest }) {
  return (
    <Avatar
      sx={(theme) => {
        const t = theme.palette.pc.tone[tone ?? COLOR_TONE[color] ?? "de"];
        return {
          width: size,
          height: size,
          fontSize: "0.9375rem",
          fontWeight: 500,
          bgcolor: t.bg,
          color: t.text,
          border: `1px solid ${t.border}`,
        };
      }}
      {...rest}
    >
      {children}
    </Avatar>
  );
}
