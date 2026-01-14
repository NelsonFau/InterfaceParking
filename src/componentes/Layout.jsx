import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
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

const items = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cocheras", label: "Cocheras" },
  { to: "/ocupaciones", label: "Ocupaciones" },
  { to: "/clientes", label: "Clientes" },
  { to: "/tarifas", label: "Tarifas" },
  { to: "/auditoria", label: "Auditoría" },
];

export default function Layout() {
  const { pathname } = useLocation();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleDrawer = () => setMobileOpen((v) => !v);
  const closeDrawer = () => setMobileOpen(false);

  const drawerContent = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.to}
            component={Link}
            to={it.to}
            selected={pathname === it.to}
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

          <Typography variant="h6" noWrap component="div">
            ParkingControl
          </Typography>
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
