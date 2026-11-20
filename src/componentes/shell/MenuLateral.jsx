// Menú lateral (guía visual 1.2): 260 px a alto completo en desktop (Drawer permanent, sin sombra) y drawer temporal
// por debajo de 900 px. Arriba, "ParkingControl" y el nombre del local; tres grupos plegables (el plegado vive en
// memoria) con ítems de texto plano, el activo en píldora clara; abajo, el selector "Claro | Oscuro".
// Recibe los grupos ya filtrados por permiso (`menuGroups` de routes.js).
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, Divider, Drawer, ListItemButton, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../../auth/usePermissions.js";
import { useColorMode } from "../../theme/useColorMode.js";
import Segmentado from "../ui/Segmentado.jsx";
import { NAV_ICONS } from "./navIcons.js";

/** Ancho del menú en desktop. */
export const SIDEBAR_WIDTH = 260;
/** Ancho del menú como drawer en mobile. */
export const SIDEBAR_WIDTH_MOBILE = 284;

const MODOS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function Contenido({ groups, pathname, mobile, onNavigate }) {
  const { me } = useMe();
  const { mode, setMode } = useColorMode();
  const [plegados, setPlegados] = useState({});
  const toggle = (label) => setPlegados((p) => ({ ...p, [label]: !p[label] }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Encabezado (detalles de Claude Design 3): padding 26/12/20/24, margen 0 12 y línea inferior. */}
      <Box sx={{ pt: "26px", pr: "12px", pb: "20px", pl: "24px", mx: 1.5, borderBottom: 1, borderColor: "pc.sideDivider" }}>
        <Typography variant="logo" noWrap>
          ParkingControl
        </Typography>
        <Typography component="div" noWrap variant="body1" sx={{ mt: 0.5 }}>
          {me?.tenant?.nombre}
        </Typography>
      </Box>

      <Box component="nav" aria-label="Menú principal" sx={{ flex: 1, overflowY: "auto", px: 1.5, pt: 1, pb: 1 }}>
        {groups.map((g) => {
          const abierto = !plegados[g.label];
          return (
            <Box key={g.label} sx={{ mb: 1.5 }}>
              <ListItemButton
                onClick={() => toggle(g.label)}
                aria-expanded={abierto}
                sx={{ display: "flex", justifyContent: "space-between", px: 0.5 }}
              >
                <Typography component="span" sx={{ fontSize: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  {g.label}
                </Typography>
                <ExpandMoreIcon fontSize="small" sx={{ transition: "transform .15s", transform: abierto ? "none" : "rotate(-90deg)" }} />
              </ListItemButton>
              <Divider sx={{ borderColor: "pc.sideDivider" }} />
              <Collapse in={abierto} unmountOnExit={false}>
                <Box sx={{ display: "grid", gap: 0.25, pt: 0.75 }}>
                  {g.items.map((it) => {
                    const activo = pathname === it.path;
                    const Icono = NAV_ICONS[it.path];
                    return (
                      <ListItemButton
                        key={it.path}
                        component={Link}
                        to={it.path}
                        selected={activo}
                        aria-current={activo ? "page" : undefined}
                        onClick={mobile ? onNavigate : undefined}
                        sx={{ color: activo ? "pc.sideOnAct" : "inherit" }}
                      >
                        {Icono ? <Icono sx={{ fontSize: 20, flex: "none" }} /> : null}
                        {it.label}
                      </ListItemButton>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: "pc.sideDivider" }} />
      <Box sx={{ p: 1.5 }}>
        <Segmentado variante="menu" value={mode} onChange={setMode} options={MODOS} ariaLabel="Tema" fullWidth />
      </Box>
    </Box>
  );
}

/**
 * @param {{
 *   groups: { label: string, items: { path: string, label: string }[] }[],
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
