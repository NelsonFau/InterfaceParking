// Menú de usuario del shell (guía visual 1.2): círculo blanco con las iniciales, el nombre con el rol debajo y un
// chevron que abre un menú con "Configuración" (solo con configuracion.ver) y "Salir". Va a la derecha de la barra
// superior, en desktop y en mobile. El selector de tema vive abajo del menú lateral.
import { useAuth0 } from "@auth0/auth0-react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Avatar, Box, Divider, ListItemButton, Menu, MenuItem, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe, usePermissions } from "../../auth/usePermissions.js";
import { RolUsuario, labelOfKey } from "../../constants/enums.js";
import { iniciales } from "../../utils/iniciales.js";

/** @param {{ compacto?: boolean }} props `compacto` oculta el nombre y el rol (mobile angosto). */
export default function MenuUsuario({ compacto = false }) {
  const { logout } = useAuth0();
  const { me } = useMe();
  const { can } = usePermissions();
  const [anchor, setAnchor] = useState(null);

  // Cierra la sesión en Auth0 y limpia la memoria del SDK; Auth0 vuelve a /login (D-FA9).
  const salir = () => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });

  return (
    <>
      <ListItemButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Menú de usuario"
        aria-haspopup="menu"
        sx={{ flexGrow: 0, gap: 1.25, p: 0.5, minWidth: 0 }}
      >
        <Avatar sx={{ width: 36, height: 36, fontSize: "1rem", fontWeight: 600, bgcolor: "background.paper", color: "text.primary" }}>
          {iniciales(me?.nombre)}
        </Avatar>
        {compacto ? null : (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ lineHeight: 1.25 }}>
              {me?.nombre}
            </Typography>
            <Typography variant="body2" noWrap color="text.secondary" sx={{ lineHeight: 1.25 }}>
              {labelOfKey(RolUsuario, me?.rol)}
            </Typography>
          </Box>
        )}
        <ExpandMoreIcon fontSize="small" />
      </ListItemButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {can("configuracion.ver") ? (
          <MenuItem component={Link} to="/configuracion" onClick={() => setAnchor(null)}>
            Configuración
          </MenuItem>
        ) : null}
        {can("configuracion.ver") ? <Divider /> : null}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            salir();
          }}
        >
          Salir
        </MenuItem>
      </Menu>
    </>
  );
}
