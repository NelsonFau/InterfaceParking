// Shell de la app (guía visual 1.2): menú lateral agrupado y barra superior con migas y usuario; por debajo de 900 px,
// la misma barra lleva la hamburguesa y el menú pasa a drawer. El contenido ocupa todo el ancho (sin `maxWidth`).
// Las piezas están en `shell/`. Rutas, guardas y permisos no cambian.
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { usePermissions } from "../auth/usePermissions.js";
import { menuGroups } from "../auth/routes.js";
import CabeceraMigas from "./shell/CabeceraMigas.jsx";
import MenuLateral from "./shell/MenuLateral.jsx";

export default function Layout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  // Por debajo de 900 px (breakpoint md) el menú es un drawer y la barra superior lleva la hamburguesa.
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { permisos } = usePermissions();

  // Menú desde el mapa único de rutas, solo con lo que el usuario puede ver (D-FA8, D-FM9).
  const groups = menuGroups(permisos);
  const closeDrawer = () => setMobileOpen(false);

  const hamburguesa = isMobile ? (
    <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
      <MenuIcon />
    </IconButton>
  ) : null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <MenuLateral groups={groups} pathname={pathname} mobile={isMobile} open={mobileOpen} onClose={closeDrawer} />

      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <CabeceraMigas pathname={pathname} menuButton={hamburguesa} compacto={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4.5 }, pt: { xs: 2, md: 3 }, pb: { xs: 2, md: 5 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
