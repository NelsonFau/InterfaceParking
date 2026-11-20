// Encabezado de página (guía visual 1.2): título con el subtítulo gris debajo y las acciones a la derecha, en la
// misma fila. `children` va bajo el subtítulo (por ejemplo, la línea roja de error de actualización) y `pie`, bajo
// las acciones y a la derecha (por ejemplo, "Actualizado: ...").
import { Box, Typography } from "@mui/material";

/**
 * @param {{
 *   titulo: string,
 *   subtitulo?: string,
 *   acciones?: import("react").ReactNode,
 *   pie?: import("react").ReactNode,
 *   children?: import("react").ReactNode,
 * }} props
 */
export default function EncabezadoPagina({ titulo, subtitulo, acciones, pie, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1">
            {titulo}
          </Typography>
          {subtitulo ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {subtitulo}
            </Typography>
          ) : null}
          {children}
        </Box>
        {acciones ? <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>{acciones}</Box> : null}
      </Box>
      {pie ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right", mt: 0.5 }}>
          {pie}
        </Typography>
      ) : null}
    </Box>
  );
}
