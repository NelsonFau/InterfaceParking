// Menú lateral (spec 13, D-FM8): 260 px a alto completo en desktop (Drawer permanent) y drawer temporal de
// 284 px por debajo de 900 px. Tres grupos plegables (el plegado vive en memoria), un punto de color por ítem y
// el ítem activo en píldora. Recibe los grupos ya filtrados por permiso (`menuGroups` de routes.js).
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, ButtonBase, Collapse, Drawer, List, ListItemButton, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE, dotColor } from "../../theme/navStyle.js";
import MenuUsuario from "./MenuUsuario.jsx";

function Contenido({ groups, pathname, mobile, onNavigate }) {
  const [plegados, setPlegados] = useState({});
  const toggle = (label) => setPlegados((p) => ({ ...p, [label]: !p[label] }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Typography variant="h6" component="div" noWrap>
          ParkingControl
        </Typography>
      </Box>

      <Box component="nav" aria-label="Menú principal" sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 1 }}>
        {groups.map((g) => {
          const abierto = !plegados[g.label];
          return (
            <Box key={g.label} sx={{ mb: 1 }}>
              <ButtonBase
                onClick={() => toggle(g.label)}
                aria-expanded={abierto}
                sx={{ width: "100%", display: "flex", justifyContent: "space-between", px: 1.5, py: 0.75, borderRadius: 2 }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.75 }}>
                  {g.label}
                </Typography>
                <ExpandMoreIcon fontSize="small" sx={{ opacity: 0.75, transition: "transform .15s", transform: abierto ? "none" : "rotate(-90deg)" }} />
              </ButtonBase>
              <Collapse in={abierto} unmountOnExit={false}>
                <List disablePadding sx={{ display: "grid", gap: 0.25 }}>
                  {g.items.map((it) => (
                    <ListItemButton
                      key={it.path}
                      component={Link}
                      to={it.path}
                      // El atajo "Registrar ingreso" no queda seleccionado (D-FM10).
                      selected={!it.shortcut && pathname === it.path}
                      onClick={mobile ? onNavigate : undefined}
                      sx={{ gap: 1.5, py: 0.9 }}
                    >
                      <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: dotColor(it.path) }} />
                      <Box component="span" sx={{ minWidth: 0 }}>
                        {it.label}
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {mobile ? null : (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
          <MenuUsuario variant="lateral" />
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {{
 *   groups: { label: string, items: { path: string, label: string, shortcut?: boolean }[] }[],
 *   pathname: string,
 *   mobile: boolean,
 *   open?: boolean,
 *   onClose?: () => void,
 * }} props
 */
export default function MenuLateral({ groups, pathname, mobile, open = false, onClose }) {
  const contenido = <Contenido groups={groups} pathname={pathname} mobile={mobile} onNavigate={onClose} />;

  if (mobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }} // mejora el rendimiento en celulares
        sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH_MOBILE, maxWidth: "85vw", boxSizing: "border-box" } }}
      >
        {contenido}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" } }}
    >
      {contenido}
    </Drawer>
  );
}
