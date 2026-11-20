// Cabecera de migas (spec 13, D-FM8): solo desktop, "Grupo › Pantalla" arriba del contenido.
// El título sale del `label` de PRIVATE_ROUTES; una ruta que no está en el mapa no muestra nada.
import { Box, Typography } from "@mui/material";
import { PRIVATE_ROUTES } from "../../auth/routes.js";

export default function CabeceraMigas({ pathname }) {
  const route = PRIVATE_ROUTES.find((r) => r.path === pathname);
  if (!route) return null;

  return (
    <Box
      component="nav"
      aria-label="Migas"
      sx={{ bgcolor: "pc.crumbBg", px: 3, py: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <Typography variant="body2" color="text.secondary" component="span">
        {route.group} ›{" "}
      </Typography>
      <Typography variant="body2" fontWeight={700} component="span">
        {route.label}
      </Typography>
    </Box>
  );
}
