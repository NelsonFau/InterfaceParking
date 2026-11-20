// Tarjeta blanca de la guía visual (radio, borde y sombra salen del tema). Con `titulo` lleva un encabezado con el
// subtítulo gris y las acciones a la derecha; sin él, solo el contenido con padding.
import { Box, Card, Typography } from "@mui/material";

/**
 * @param {{
 *   titulo?: import("react").ReactNode,
 *   subtitulo?: import("react").ReactNode,
 *   acciones?: import("react").ReactNode,
 *   relleno?: boolean,
 *   sx?: object,
 *   children?: import("react").ReactNode,
 * }} props
 */
export default function Tarjeta({ titulo, subtitulo, acciones, relleno = true, sx, children, ...rest }) {
  return (
    <Card sx={sx} {...rest}>
      <Box sx={relleno ? { p: { xs: 2.5, sm: 3 } } : undefined}>
        {titulo || acciones ? (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              {titulo ? (
                <Typography variant="h6" component="h2">
                  {titulo}
                </Typography>
              ) : null}
              {subtitulo ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitulo}
                </Typography>
              ) : null}
            </Box>
            {acciones ? <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>{acciones}</Box> : null}
          </Box>
        ) : null}
        {children}
      </Box>
    </Card>
  );
}
