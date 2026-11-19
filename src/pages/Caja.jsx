// Caja con sesiones (spec 09, D-FI4): dos pestañas ("Caja actual" e "Historial") y el detalle de una sesión en un
// diálogo, que se enlaza con `/caja?sesion=N` (siempre con `buildCajaPath`). Página delgada: la lógica es de
// `src/utils/caja.js` y cada pieza vive en `src/componentes/caja/`. Cómo funciona: docs/manual/frontend/09-caja.md.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import CajaActualPanel from "../componentes/caja/CajaActualPanel";
import CajaHistorialPanel from "../componentes/caja/CajaHistorialPanel";
import SesionDetalleDialog from "../componentes/caja/SesionDetalleDialog";
import { CAJA_PATH } from "../auth/routes";
import { buildCajaPath, parseCajaSesionId } from "../utils/cajaLink";

export default function Caja() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const sesionId = parseCajaSesionId(search);

  // La pestaña activa vive en el estado de la página (nada de localStorage: ARQ-1). "Historial" se monta la
  // primera vez que se abre y después queda montada, para conservar su filtro.
  const [tab, setTab] = useState("actual");
  const [historialVisto, setHistorialVisto] = useState(false);
  // Se suben cuando una acción cambió la caja: recargan "Caja actual" y el historial.
  const [refreshKey, setRefreshKey] = useState(0);

  const cambioLaCaja = () => setRefreshKey((k) => k + 1);
  // `replace`: "atrás" no reabre el detalle (como `/ocupaciones?id=N`).
  const verDetalle = (id) => navigate(buildCajaPath(id), { replace: true });
  const cerrarDetalle = () => navigate(CAJA_PATH, { replace: true });

  function cambiarTab(_event, value) {
    setTab(value);
    if (value === "historial") setHistorialVisto(true);
  }

  return (
    <Box>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Caja
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            Abrí y cerrá la caja con arqueo, y revisá las sesiones anteriores.
          </Typography>
        </Box>

        <Tabs value={tab} onChange={cambiarTab}>
          <Tab value="actual" label="Caja actual" />
          <Tab value="historial" label="Historial" />
        </Tabs>

        <Box hidden={tab !== "actual"}>
          <CajaActualPanel refreshKey={refreshKey} onChanged={cambioLaCaja} onVerDetalle={verDetalle} />
        </Box>
        {historialVisto ? (
          <Box hidden={tab !== "historial"}>
            <CajaHistorialPanel refreshKey={refreshKey} onVerDetalle={verDetalle} />
          </Box>
        ) : null}
      </Stack>

      {sesionId !== null ? (
        <SesionDetalleDialog key={sesionId} sesionId={sesionId} onClose={cerrarDetalle} onChanged={cambioLaCaja} />
      ) : null}
    </Box>
  );
}
