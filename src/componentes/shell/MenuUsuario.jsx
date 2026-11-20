// Menú de usuario del shell (spec 13, D-FM8 y D-FM6): avatar con iniciales, nombre y local, menú con el selector
// de tema y "Salir", y el engranaje que lleva a Configuración (solo con configuracion.ver).
// Abajo del menú lateral en desktop (`lateral`); arriba a la derecha de la barra en mobile (`barra`).
import { useAuth0 } from "@auth0/auth0-react";
import SettingsIcon from "@mui/icons-material/Settings";
import { Avatar, Box, ButtonBase, IconButton, ListSubheader, Menu, MenuItem, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe, usePermissions } from "../../auth/usePermissions.js";
import { useColorMode } from "../../theme/useColorMode.js";

const THEME_OPTIONS = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

// "Ana Pérez" → "AP"; un solo nombre → su inicial; sin nombre → "?".
function initials(nombre) {
  const parts = String(nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** @param {{ variant?: "lateral" | "barra" }} props */
export default function MenuUsuario({ variant = "lateral" }) {
  const { logout } = useAuth0();
  const { me } = useMe();
  const { can } = usePermissions();
  const { preference, setPreference } = useColorMode();
  const [anchor, setAnchor] = useState(null);
  const lateral = variant === "lateral";

  // Cierra la sesión en Auth0 y limpia la memoria del SDK; Auth0 vuelve a /login (D-FA9).
  const salir = () => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });

  const avatar = (
    <Avatar sx={{ width: 36, height: 36, fontSize: "0.875rem", fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>
      {initials(me?.nombre)}
    </Avatar>
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Menú de usuario"
        aria-haspopup="menu"
        sx={{ display: "flex", alignItems: "center", gap: 1.25, flex: lateral ? 1 : "none", minWidth: 0, textAlign: "left", p: 0.5, borderRadius: 3 }}
      >
        {avatar}
        {lateral ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {me?.nombre}
            </Typography>
            <Typography variant="caption" noWrap component="div" sx={{ opacity: 0.8 }}>
              {me?.tenant?.nombre}
            </Typography>
          </Box>
        ) : null}
      </ButtonBase>

      {can("configuracion.ver") ? (
        <IconButton component={Link} to="/configuracion" color="inherit" aria-label="Configuración">
          <SettingsIcon />
        </IconButton>
      ) : null}

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: lateral ? "top" : "bottom", horizontal: lateral ? "left" : "right" }}
        transformOrigin={{ vertical: lateral ? "bottom" : "top", horizontal: lateral ? "left" : "right" }}
      >
        <ListSubheader sx={{ lineHeight: 2, bgcolor: "transparent" }}>Tema</ListSubheader>
        {THEME_OPTIONS.map((o) => (
          <MenuItem key={o.value} selected={preference === o.value} onClick={() => setPreference(o.value)}>
            {o.label}
          </MenuItem>
        ))}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ px: 2, py: 0.5, maxWidth: 240 }}>
          No se guarda: al recargar vuelve al del sistema
        </Typography>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            salir();
          }}
        >
          Salir
        </MenuItem>
      </Menu>
    </Box>
  );
}
