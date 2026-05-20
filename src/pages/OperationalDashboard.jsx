import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import { operationalAlertsApi } from "../api/operationalAlertsApi";
import { pagosApi } from "../api/pagosApi";
import {
  SEVERIDAD_ALERTA,
  TIPO_ALERTA,
} from "../constants/operationalAlerts";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function KpiCard({ title, value, subtitle, danger }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: danger ? "error.main" : "divider",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            mt: 0.5,
            color: danger ? "error.main" : "text.primary",
          }}
        >
          {value}
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

function SeverityChip({ severidad }) {
  const data = SEVERIDAD_ALERTA[Number(severidad)] ?? {
    label: "SIN SEVERIDAD",
    color: "default",
  };

  return (
    <Chip
      size="small"
      label={data.label}
      color={data.color}
      sx={{ fontWeight: 800 }}
    />
  );
}

export default function OperationalDashboard() {
  const navigate = useNavigate();

  const [alertas, setAlertas] = useState([]);
  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(false);

  async function cargarDatos() {
    try {
      setLoading(true);

      const [alertasRes, cajaRes] = await Promise.all([
        operationalAlertsApi.getAll({
          page: 1,
          pageSize: 50,
          resuelta: false,
        }),
        pagosApi.getCajaDiaria(todayISO()),
      ]);

      setAlertas(Array.isArray(alertasRes.data) ? alertasRes.data : []);
      setCaja(cajaRes.data);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar el monitor operativo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const metricas = useMemo(() => {
    const abiertas = alertas.filter((a) => !a.resuelta).length;

    const criticas = alertas.filter(
      (a) => !a.resuelta && Number(a.severidad) === 4
    ).length;

    const altas = alertas.filter(
      (a) => !a.resuelta && Number(a.severidad) === 3
    ).length;

    const pagosSospechosos = alertas.filter((a) =>
      [5, 6, 7].includes(Number(a.tipo))
    ).length;

    const ocupacionesVencidas = alertas.filter((a) =>
      [1, 2].includes(Number(a.tipo))
    ).length;

    const criticasRecientes = alertas
      .filter((a) => Number(a.severidad) === 4)
      .slice(0, 5);

    return {
      abiertas,
      criticas,
      altas,
      pagosSospechosos,
      ocupacionesVencidas,
      criticasRecientes,
    };
  }, [alertas]);

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Monitor operativo
            </Typography>

            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Centro de control para alertas, caja diaria y riesgo operativo del garage.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={cargarDatos}>
              Actualizar
            </Button>

            <Button
              variant="contained"
              onClick={() => navigate("/alertas-operativas")}
            >
              Ver alertas
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Grid item xs={12} md={2.4} key={i}>
                <Skeleton variant="rounded" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.4}>
              <KpiCard
                title="Alertas abiertas"
                value={metricas.abiertas}
                subtitle="Pendientes de revisión"
                danger={metricas.abiertas > 0}
              />
            </Grid>

            <Grid item xs={12} md={2.4}>
              <KpiCard
                title="Críticas"
                value={metricas.criticas}
                subtitle="Requieren acción inmediata"
                danger={metricas.criticas > 0}
              />
            </Grid>

            <Grid item xs={12} md={2.4}>
              <KpiCard
                title="Alta severidad"
                value={metricas.altas}
                subtitle="Riesgo operativo alto"
                danger={metricas.altas > 0}
              />
            </Grid>

            <Grid item xs={12} md={2.4}>
              <KpiCard
                title="Pagos sospechosos"
                value={metricas.pagosSospechosos}
                subtitle="Sin pago, menor o tardío"
                danger={metricas.pagosSospechosos > 0}
              />
            </Grid>

            <Grid item xs={12} md={2.4}>
              <KpiCard
                title="Ocupaciones vencidas"
                value={metricas.ocupacionesVencidas}
                subtitle="Sin cierre o sin pago"
                danger={metricas.ocupacionesVencidas > 0}
              />
            </Grid>
          </Grid>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Alertas críticas recientes
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Casos que deberían revisarse primero.
                    </Typography>
                  </Box>

                  <Button
                    size="small"
                    onClick={() => navigate("/alertas-operativas")}
                  >
                    Ver todas
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {loading ? (
                  <Stack spacing={1}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={72} />
                    ))}
                  </Stack>
                ) : metricas.criticasRecientes.length === 0 ? (
                  <Typography color="text.secondary">
                    No hay alertas críticas abiertas.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {metricas.criticasRecientes.map((a) => (
                      <Card
                        key={a.id}
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          borderColor: "error.main",
                        }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Stack spacing={1}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <SeverityChip severidad={a.severidad} />

                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {fmtDate(a.fechaCreacion)}
                              </Typography>
                            </Stack>

                            <Box>
                              <Typography sx={{ fontWeight: 800 }}>
                                {TIPO_ALERTA[Number(a.tipo)] ??
                                  "Tipo desconocido"}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.3 }}
                              >
                                {a.mensaje}
                              </Typography>
                            </Box>

                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => navigate("/alertas-operativas")}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              Revisar
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Caja diaria
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Resumen financiero del día.
                </Typography>

                <Divider sx={{ my: 2 }} />

                {loading ? (
                  <Stack spacing={1}>
                    <Skeleton variant="rounded" height={50} />
                    <Skeleton variant="rounded" height={50} />
                    <Skeleton variant="rounded" height={50} />
                  </Stack>
                ) : !caja ? (
                  <Typography color="text.secondary">
                    No se pudo cargar la caja diaria.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Total cobrado</Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {money(caja.totalCobrado ?? caja.total)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Efectivo</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {money(caja.totalEfectivo ?? caja.efectivo)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Tarjeta</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {money(caja.totalTarjeta ?? caja.tarjeta)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Transferencia</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {money(caja.totalTransferencia ?? caja.transferencia)}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Cantidad de pagos</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {caja.cantidadPagos ?? caja.pagos?.length ?? "-"}
                      </Typography>
                    </Stack>

                    <Button
                        variant="outlined"
                        onClick={() => navigate("/caja-diaria")}
                        >
                        Ver detalle de caja
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}