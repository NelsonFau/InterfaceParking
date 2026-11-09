import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { usePermissions, useMe } from "../auth/usePermissions.js";
import { accessibleRoutes } from "../auth/routes.js";
import {
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const drawerWidth = 220;

export default function Layout() {
  const { pathname } = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  const { logout } = useAuth0();
  const { me } = useMe();
  const { permisos } = usePermissions();
  // Menú desde el mapa único de rutas, solo con lo que el usuario puede ver (D-FA8).
  const items = accessibleRoutes(permisos);

  // Cierra la sesión en Auth0 y limpia la memoria del SDK; Auth0 vuelve a /login (D-FA9).
  const salir = () => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });

  const toggleDrawer = () => setMobileOpen((v) => !v);
  const closeDrawer = () => setMobileOpen(false);

  const drawerContent = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.path}
            component={Link}
            to={it.path}
            selected={pathname === it.path}
            onClick={isMobile ? closeDrawer : undefined} // 👈 en móvil cierra al navegar
          >
            <ListItemText primary={it.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
              aria-label="open drawer"
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ParkingControl
          </Typography>

          {me ? (
            <Box sx={{ textAlign: "right", mr: 2, lineHeight: 1.2, display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {me.nombre}
              </Typography>
              <Typography variant="caption" noWrap sx={{ opacity: 0.85 }}>
                {me.tenant?.nombre}
              </Typography>
            </Box>
          ) : null}

          <Button color="inherit" onClick={salir}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile (temporary) */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }} // mejora performance en móviles
          sx={{
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Drawer desktop (permanent) */
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
