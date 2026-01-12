import { Outlet, Link, useLocation } from "react-router-dom";
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from "@mui/material";

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

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            ParkingControl
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: 220, [`& .MuiDrawer-paper`]: { width: 220, boxSizing: "border-box" } }}>
        <Toolbar />
        <List>
          {items.map((it) => (
            <ListItemButton key={it.to} component={Link} to={it.to} selected={pathname === it.to}>
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
