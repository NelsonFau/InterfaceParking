// Monitor operativo: indicadores de alertas y críticas recientes (spec 05, D-FE3, D-FE11, D-FE12) y, debajo de
// los indicadores, el widget de caja (spec 09, D-FI12), que es autónomo y se refresca con `reloadKey`.
// Cada indicador sale del `total` de una consulta liviana y se carga por separado: si una falla,
// esa tarjeta muestra "—" y las demás siguen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, LinearProgress, Paper, Skeleton, Stack, Typography } from "@mui/material";

import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import CajaWidget from "../componentes/caja/CajaWidget";
import BotonRefrescar from "../componentes/ui/BotonRefrescar";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";
import { countAlertas, listAlertas } from "../api/operationalAlertsApi";
import { SeveridadAlerta, TipoAlertaOperativa, labelOf } from "../constants/enums";
import {
  ALERTAS_PATH,
  ALERTS_REFRESH_MS,
  TIPOS_OCUPACIONES_VENCIDAS,
  TIPOS_PAGOS_SOSPECHOSOS,
  buildAlertasPath,
  sumCounts,
} from "../utils/alertas";
import { formatNumber } from "../utils/formato";
import { useAutoRefresh } from "../utils/useAutoRefresh";
import { useTenantDates } from "../utils/useTenantDates";

const CRITICAS_RECIENTES = 5;
const ABIERTAS = { resuelta: false };

// 8 pedidos livianos en paralelo (los de conteo traen una sola fila). Devuelve los resultados sueltos.
function fetchAll() {
  return Promise.allSettled([
    countAlertas(ABIERTAS),
    listAlertas({ ...ABIERTAS, severidad: SeveridadAlerta.CRITICA, page: 1, pageSize: CRITICAS_RECIENTES }),
    countAlertas({ ...ABIERTAS, severidad: SeveridadAlerta.ALTA }),
    ...TIPOS_PAGOS_SOSPECHOSOS.map((tipo) => countAlertas({ ...ABIERTAS, tipo })),
    ...TIPOS_OCUPACIONES_VENCIDAS.map((tipo) => countAlertas({ ...ABIERTAS, tipo })),
  ]);
}

// Pasa los resultados a lo que muestra la pantalla; lo que falló queda en `null`.
function toView(settled) {
  const [abiertas, criticas, altas, ...resto] = settled;
  const pagos = resto.slice(0, TIPOS_PAGOS_SOSPECHOSOS.length);
  const vencidas = resto.slice(TIPOS_PAGOS_SOSPECHOSOS.length);
  return {
    abiertas: sumCounts([abiertas]),
    criticas: criticas.status === "fulfilled" ? criticas.value.total : null,
    criticasRecientes: criticas.status === "fulfilled" ? criticas.value.items : null,
    altas: sumCounts([altas]),
    pagosSospechosos: sumCounts(pagos),
    ocupacionesVencidas: sumCounts(vencidas),
  };
}

// Mosaico de indicador (guía visual 2, Monitor): fondo hundido, etiqueta, número grande y texto chico gris.
function KpiCard({ title, value, subtitle }) {
  return (
    <Paper variant="tile" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="kpiSm" component="div" sx={{ my: 0.5 }}>
        {formatNumber(value)}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Paper>
  );
}

export default function OperationalDashboard() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { formatInstant } = useTenantDates();

  const [reloadKey, setReloadKey] = useState(0);
  // `{ key, view, failed }` del último pedido que terminó; `null` hasta la primera carga.
  const [result, setResult] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [lastAttemptAt, setLastAttemptAt] = useState(null);
  // Un fallo de una actualización automática no abre un aviso (D-FE12); lo demás sí.
  const modeRef = useRef("manual");
  const inFlightRef = useRef(false);

  useEffect(() => {
    const manual = modeRef.current !== "auto";
    modeRef.current = "manual";
    inFlightRef.current = true;
    let ignore = false;
    (async () => {
      const settled = await fetchAll();
      if (ignore) return;
      const rechazos = settled.filter((s) => s.status === "rejected");
      // Un solo aviso con el primer error, para no apilar ocho si el servidor no responde.
      if (rechazos.length > 0 && manual) showApiError(rechazos[0].reason);
      setResult((prev) => ({
        key: reloadKey,
        // Si todo falló se conserva lo que ya se veía.
        view: rechazos.length === settled.length && prev ? prev.view : toView(settled),
        failed: rechazos.length > 0,
      }));
      if (rechazos.length < settled.length) setLastLoadedAt(Date.now());
      setLastAttemptAt(Date.now());
      inFlightRef.current = false;
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const refreshAuto = useCallback(() => {
    if (inFlightRef.current) return;
    modeRef.current = "auto";
    reload();
  }, [reload]);
  useAutoRefresh({ lastAttemptAt, onRefresh: refreshAuto, intervalMs: ALERTS_REFRESH_MS });

  const firstLoad = result === null;
  const loading = result?.key !== reloadKey;
  const view = result?.view;
  const criticasPath = buildAlertasPath({ severidad: SeveridadAlerta.CRITICA });

  function renderCriticas() {
    if (firstLoad) {
      return (
        <Stack spacing={1}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      );
    }
    if (view.criticasRecientes === null) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload} disabled={loading}>
              Reintentar
            </Button>
          }
        >
          No se pudieron cargar las alertas críticas
        </Alert>
      );
    }
    if (view.criticasRecientes.length === 0) {
      return <Typography color="text.secondary">No hay alertas críticas abiertas.</Typography>;
    }
    return (
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
        {view.criticasRecientes.map((a) => (
          <Paper key={a.id} variant="tile" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {labelOf(SeveridadAlerta, a.severidad)} · {formatInstant(a.fechaCreacion)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 500 }}>
              {labelOf(TipoAlertaOperativa, a.tipo)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {a.mensaje}
            </Typography>
          </Paper>
        ))}
      </Box>
    );
  }

  const kpis = [
    { title: "Alertas abiertas", key: "abiertas", subtitle: "Pendientes de revisión" },
    { title: "Críticas", key: "criticas", subtitle: "Requieren acción inmediata" },
    { title: "Alta severidad", key: "altas", subtitle: "Riesgo operativo alto" },
    { title: "Pagos sospechosos", key: "pagosSospechosos", subtitle: "Sin pago, menor o tardío" },
    { title: "Ocupaciones vencidas", key: "ocupacionesVencidas", subtitle: "Sin cierre o sin pago" },
  ];

  return (
    <Box>
      <EncabezadoPagina
        titulo="Monitor operativo"
        subtitulo="Centro de control de alertas y riesgo operativo del garage."
        acciones={
          <>
            <BotonRefrescar onClick={reload} disabled={loading} />
            <Button variant="arena" onClick={() => navigate(ALERTAS_PATH)}>
              Ver alertas
            </Button>
          </>
        }
        pie={lastLoadedAt !== null ? `Actualizado: ${formatInstant(new Date(lastLoadedAt).toISOString())}` : null}
      >
        {!firstLoad && !loading && result.failed && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            No se pudo actualizar. Reintentá con 'Actualizar'
          </Typography>
        )}
      </EncabezadoPagina>

      <Stack spacing={1.5}>
        {!firstLoad && loading && <LinearProgress />}

        <Tarjeta titulo="Indicadores" subtitulo="Alertas y riesgo operativo">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            {kpis.map(({ title, key, subtitle }) =>
              firstLoad ? (
                <Skeleton key={key} variant="rounded" height={110} />
              ) : (
                <KpiCard key={key} title={title} value={view[key]} subtitle={subtitle} />
              ),
            )}
          </Box>
        </Tarjeta>

        <Tarjeta titulo="Alertas críticas recientes" subtitulo="Casos que deberían revisarse primero.">
          {renderCriticas()}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button variant="pill" onClick={() => navigate(criticasPath)}>
              Ver todas
            </Button>
          </Box>
        </Tarjeta>

        {can("caja.ver") ? <CajaWidget reloadKey={reloadKey} /> : null}
      </Stack>
    </Box>
  );
}
