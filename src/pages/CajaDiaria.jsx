import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  TextField,
    Typography,
  Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    } from "@mui/material";

import { pagosApi } from "../api/pagosApi";

const METODOS_PAGO = {
  1: "EFECTIVO",
  2: "TRANSFERENCIA",
  3: "TARJETA",
  4: "OTRO",
};

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

function KpiCard({ title, value, subtitle }) {
  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {title}
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
          {value}
        </Typography>

        {subtitle ? (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function CajaDiaria() {
    const [fecha, setFecha] = useState(todayISO());
    const [caja, setCaja] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openAnular, setOpenAnular] = useState(false);
    const [pagoAnular, setPagoAnular] = useState(null);
    const [motivoAnulacion, setMotivoAnulacion] = useState("");
    const [saving, setSaving] = useState(false);
    
    async function cargarCaja() {
    try {
      setLoading(true);

      const { data } = await pagosApi.getCajaDiaria(fecha);
      setCaja(data);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la caja diaria");
      setCaja(null);
    } finally {
      setLoading(false);
    }
  }

    function abrirAnular(pago) {
    setPagoAnular(pago);
    setMotivoAnulacion("");
    setOpenAnular(true);
    }

    async function confirmarAnulacion() {
    if (!pagoAnular?.id) return;

    if (!motivoAnulacion.trim()) {
        return toast.error("Ingresá un motivo");
    }

    try {
        setSaving(true);

       await pagosApi.anular(pagoAnular.id);

        toast.success("Pago anulado correctamente");

        setOpenAnular(false);
        setPagoAnular(null);

        await cargarCaja();
    } catch (e) {
        console.error(e);

        toast.error(
        e?.response?.data?.error ||
            "No se pudo anular el pago"
        );
    } finally {
        setSaving(false);
    }
    }
  useEffect(() => {
    cargarCaja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pagos = useMemo(() => {
    if (!caja) return [];
    return caja.pagos ?? caja.detalle ?? caja.items ?? [];
  }, [caja]);

  const totalCobrado =
    caja?.totalCobrado ??
    caja?.total ??
    pagos.reduce((acc, p) => acc + Number(p.monto ?? 0), 0);

  const efectivo =
    caja?.totalEfectivo ??
    caja?.efectivo ??
    pagos
      .filter((p) => Number(p.metodo) === 1)
      .reduce((acc, p) => acc + Number(p.monto ?? 0), 0);

  const transferencia =
    caja?.totalTransferencia ??
    caja?.transferencia ??
    pagos
      .filter((p) => Number(p.metodo) === 2)
      .reduce((acc, p) => acc + Number(p.monto ?? 0), 0);

  const tarjeta =
    caja?.totalTarjeta ??
    caja?.tarjeta ??
    pagos
      .filter((p) => Number(p.metodo) === 3)
      .reduce((acc, p) => acc + Number(p.monto ?? 0), 0);

  const otros =
    caja?.totalOtros ??
    caja?.otros ??
    pagos
      .filter((p) => Number(p.metodo) === 4)
      .reduce((acc, p) => acc + Number(p.monto ?? 0), 0);

  const cantidadPagos = caja?.cantidadPagos ?? pagos.length;

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
              Caja diaria
            </Typography>

            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Resumen de cobros por fecha y método de pago.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />

            <Button variant="contained" onClick={cargarCaja} disabled={loading}>
              Consultar
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} sx={{ flex: 1 }} />
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(5, 1fr)",
              },
            }}
          >
            <KpiCard title="Total cobrado" value={money(totalCobrado)} subtitle="Suma del día" />
            <KpiCard title="Efectivo" value={money(efectivo)} subtitle="Cobros en efectivo" />
            <KpiCard title="Transferencia" value={money(transferencia)} subtitle="Cobros transferidos" />
            <KpiCard title="Tarjeta" value={money(tarjeta)} subtitle="Cobros con tarjeta" />
            <KpiCard title="Pagos" value={cantidadPagos} subtitle="Cantidad registrada" />
          </Box>
        )}

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Detalle de pagos
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Pagos registrados para la fecha seleccionada.
                </Typography>
              </Box>

              <Chip
                label={`Total: ${money(totalCobrado)}`}
                color="success"
                sx={{ fontWeight: 900, width: "fit-content" }}
              />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {loading ? (
              <Stack spacing={1}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={72} />
                ))}
              </Stack>
            ) : pagos.length === 0 ? (
              <Typography color="text.secondary">
                No hay pagos registrados para esta fecha.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {pagos.map((p) => (
                  <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>
                            Pago #{p.id} · Ocupación #{p.ocupacionId}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            Pago: {fmtDate(p.fechaPago)}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            Registrado: {fmtDate(p.fechaRegistro)}
                          </Typography>
                        </Box>

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="flex-end"
                            >
                            <Chip
                                size="small"
                                label={
                                METODOS_PAGO[Number(p.metodo)] ??
                                "Método desconocido"
                                }
                                variant="outlined"
                                sx={{ fontWeight: 800 }}
                            />

                            <Typography sx={{ fontWeight: 900 }}>
                                {money(p.monto)}
                            </Typography>

                            {Number(p.estado) !== 2 ? (
                                <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => abrirAnular(p)}
                                sx={{ fontWeight: 800 }}
                                >
                                Anular
                                </Button>
                            ) : (
                                <Chip
                                size="small"
                                label="ANULADO"
                                color="error"
                                sx={{ fontWeight: 900 }}
                                />
                            )}
                        </Stack>
                      </Stack>

                      {p.referencia ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Referencia: {p.referencia}
                        </Typography>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
          </Stack>
          
          <Dialog
            open={openAnular}
            onClose={() => setOpenAnular(false)}
            fullWidth
            maxWidth="sm"
            >
            <DialogTitle sx={{ fontWeight: 900 }}>
                Anular pago
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                <Typography>
                    Pago #{pagoAnular?.id}
                </Typography>

                <Typography>
                    Monto: <b>{money(pagoAnular?.monto)}</b>
                </Typography>

                <TextField
                    label="Motivo de anulación"
                    value={motivoAnulacion}
                    onChange={(e) =>
                    setMotivoAnulacion(e.target.value)
                    }
                    multiline
                    minRows={3}
                    fullWidth
                />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                onClick={() => setOpenAnular(false)}
                sx={{ fontWeight: 800 }}
                >
                Cancelar
                </Button>

                <Button
                color="error"
                variant="contained"
                onClick={confirmarAnulacion}
                disabled={saving}
                sx={{ fontWeight: 900 }}
                >
                Confirmar anulación
                </Button>
            </DialogActions>
          </Dialog>
          
    </Box>
  );
}