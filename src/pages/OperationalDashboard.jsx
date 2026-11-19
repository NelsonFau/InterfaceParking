// Monitor operativo: indicadores de alertas y críticas recientes (spec 05, D-FE3, D-FE11, D-FE12) y, debajo de
// los indicadores, el widget de caja (spec 09, D-FI12), que es autónomo y se refresca con `reloadKey`.
// Cada indicador sale del `total` de una consulta liviana y se carga por separado: si una falla,
// esa tarjeta muestra "—" y las demás siguen.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, LinearProgress, Skeleton, Stack, Typography } from "@mui/material";

import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import CajaWidget from "../componentes/caja/CajaWidget";
import { countAlertas, listAlertas } from "../api/operationalAlertsApi";
import { SeveridadAlerta, TipoAlertaOperativa, colorOf, labelOf } from "../constants/enums";
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

function KpiCard({ title, value, subtitle, danger }) {
  const active = danger && typeof value === "number" && value > 0;
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: active ? "error.main" : "divider",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: active ? "error.main" : "text.primary" }}>
          {formatNumber(value)}
        </Typography>

        {subtitle && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
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
          {Array.from({ length: 4 }).map((_, i) => (
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
      <Stack spacing={1.5}>
        {view.criticasRecientes.map((a) => (
          <Card key={a.id} variant="outlined" sx={{ borderRadius: 2, borderColor: "error.main" }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Chip
                    size="small"
                    label={labelOf(SeveridadAlerta, a.severidad)}
                    color={colorOf(SeveridadAlerta, a.severidad)}
                    sx={{ fontWeight: 800 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatInstant(a.fechaCreacion)}
                  </Typography>
                </Stack>

                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{labelOf(TipoAlertaOperativa, a.tipo)}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                    {a.mensaje}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => navigate(criticasPath)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Revisar
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
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
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Monitor operativo
            </Typography>

            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Centro de control de alertas y riesgo operativo del garage.
            </Typography>
          </Box>

          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={reload} disabled={loading}>
                Actualizar
              </Button>

              <Button variant="contained" onClick={() => navigate(ALERTAS_PATH)}>
                Ver alertas
              </Button>
            </Stack>
            {lastLoadedAt !== null && (
              <Typography variant="caption" color="text.secondary">
                Actualizado: {formatInstant(new Date(lastLoadedAt).toISOString())}
              </Typography>
            )}
            {!firstLoad && !loading && result.failed && (
              <Typography variant="caption" color="error">
                No se pudo actualizar. Reintentá con 'Actualizar'
              </Typography>
            )}
          </Stack>
        </Stack>

        {!firstLoad && loading && <LinearProgress />}

        <Grid container spacing={2}>
          {kpis.map(({ title, key, subtitle }) => (
            <Grid size={{ xs: 12, md: 2.4 }} key={key}>
              {firstLoad ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <KpiCard title={title} value={view[key]} subtitle={subtitle} danger />
              )}
            </Grid>
          ))}
        </Grid>

        {can("caja.ver") ? <CajaWidget reloadKey={reloadKey} /> : null}

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Alertas críticas recientes
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Casos que deberían revisarse primero.
                </Typography>
              </Box>

              <Button size="small" onClick={() => navigate(criticasPath)}>
                Ver todas
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {renderCriticas()}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
