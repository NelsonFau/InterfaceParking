// Barra superior del contenido (guía visual 1.2): banda a todo el ancho de ~64 px con las migas "Grupo / Pantalla" a
// la izquierda y el usuario a la derecha. El título sale del `label` de PRIVATE_ROUTES; una ruta que no está en el
// mapa no muestra migas. En mobile (`menuButton`) lleva la hamburguesa a la izquierda.
import { Box, Typography } from "@mui/material";
import { PRIVATE_ROUTES } from "../../auth/routes.js";
import MenuUsuario from "./MenuUsuario.jsx";

/** @param {{ pathname: string, menuButton?: import("react").ReactNode, compacto?: boolean }} props */
export default function CabeceraMigas({ pathname, menuButton = null, compacto = false }) {
  const route = PRIVATE_ROUTES.find((r) => r.path === pathname);

  return (
    <Box
      component="header"
      sx={{
        bgcolor: "pc.crumbBg",
        minHeight: 64,
        px: { xs: 1, md: 4.5 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {menuButton}
        {route ? (
          <Box component="nav" aria-label="Migas" sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" component="span">
              {route.group}
            </Typography>
            <Typography variant="body2" color="text.secondary" component="span">
              {" / "}
            </Typography>
            <Typography variant="body2" component="span">
              {route.label}
            </Typography>
          </Box>
        ) : null}
      </Box>
      <MenuUsuario compacto={compacto} />
    </Box>
  );
}
