// Shell de la app (spec 13, D-FM8): menú lateral agrupado y migas en desktop; por debajo de 900 px, barra
// superior con hamburguesa y menú como drawer. Las piezas están en `shell/`. Rutas, guardas y permisos no cambian.
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppBar, Box, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { usePermissions } from "../auth/usePermissions.js";
import { menuGroups } from "../auth/routes.js";
import { buildNuevaOcupacionPath } from "../utils/ocupacionLink.js";
import CabeceraMigas from "./shell/CabeceraMigas.jsx";
import MenuLateral from "./shell/MenuLateral.jsx";
import MenuUsuario from "./shell/MenuUsuario.jsx";

// Atajo del menú, no una ruta ni un permiso nuevos (D-FM10): se ve solo con ocupaciones.crear.
const SHORTCUTS = [
  {
    path: buildNuevaOcupacionPath(),
    label: "Registrar ingreso",
    permiso: "ocupaciones.crear",
    group: "Operación",
    after: "/dashboard",
  },
];

export default function Layout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  // Por debajo de 900 px (breakpoint md) el menú es un drawer y aparece la barra superior.
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { permisos } = usePermissions();

  // Menú desde el mapa único de rutas, solo con lo que el usuario puede ver (D-FA8, D-FM9).
  const groups = menuGroups(permisos, SHORTCUTS);
  const closeDrawer = () => setMobileOpen(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {isMobile ? (
        <AppBar position="fixed">
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label="Abrir menú">
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              ParkingControl
            </Typography>
            <MenuUsuario variant="barra" />
          </Toolbar>
        </AppBar>
      ) : null}

      <MenuLateral groups={groups} pathname={pathname} mobile={isMobile} open={mobileOpen} onClose={closeDrawer} />

      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {isMobile ? <Toolbar /> : <CabeceraMigas pathname={pathname} />}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
