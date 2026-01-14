import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// =========================
// Estados cocheras (FRONT)
// 1 Disponible
// 2 Bloqueada
// 3 Ocupada
// 4 Reservada (nuevo)
// =========================
const ESTADO_COCHERA = {
  1: { label: "Disponible", color: "success" },
  2: { label: "Bloqueada", color: "error" },
  3: { label: "Ocupada", color: "warning" },
  4: { label: "Reservada", color: "info" },
};

function estadoChip(estado) {
  // normalizamos estado a número
  let n = null;

  if (typeof estado === "number") {
    n = estado;
  } else {
    const s = String(estado).trim().toUpperCase();

    // por si el backend algún día devuelve strings
    if (s === "DISPONIBLE") n = 1;
    else if (s === "BLOQUEADA") n = 2;
    else if (s === "OCUPADA") n = 3;
    else if (s === "RESERVADA") n = 4;
    else if (["1", "2", "3", "4"].includes(s)) n = Number(s);
  }

  return ESTADO_COCHERA[n] ?? { label: String(estado), color: "default" };
}

function formatDateTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString();
}

function diffHuman(fin) {
  if (!fin) return "";
  const ms = new Date(fin).getTime() - Date.now();
  const abs = Math.abs(ms);

  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  const restH = hrs % 24;
  const restM = mins % 60;

  const txt =
    days > 0 ? `${days}d ${restH}h` : hrs > 0 ? `${hrs}h ${restM}m` : `${mins}m`;

  return ms >= 0 ? `vence en ${txt}` : `venció hace ${txt}`;
}

export default function Cocheras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // detalle
  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  // filtro rápido (opcional)
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return items;
    return items.filter((c) => String(c.numero).includes(t));
  }, [items, q]);

  async function cargar() {
    try {
      setLoading(true);
      const res = await http.get("/Cochera");
      setItems(Array.isArray(res.data) ? res.data : []);
      console.log("RESPUESTA AXIOS =", r);
      console.log("DATA =", r.data);
    } catch (e) {
      console.error(e);
      toast.error("No pude cargar cocheras");
    } finally {
      setLoading(false);
    }
  }

  async function abrirDetalle(cocheraId) {
    try {
      const res = await http.get(`/Cochera/${cocheraId}`);
      setDetalle(res.data);
      setNota(res.data?.nota ?? "");
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("No pude cargar detalle");
    }
  }

  async function setEstado(cocheraId, estado, notaValue) {
    try {
      setSaving(true);
      await http.put(`/Cochera/${cocheraId}/estado`, {
        estado,
        nota: notaValue ?? null,
      });
      toast.success("Estado actualizado");
      await cargar();
      await abrirDetalle(cocheraId);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude actualizar estado";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Cocheras</Typography>
        <Button variant="outlined" onClick={cargar} disabled={loading}>
          Refrescar
        </Button>

        <TextField
          size="small"
          label="Buscar por número"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: 220 }}
        />
      </Stack>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <Grid container spacing={1.5}>
          {filtered.map((c) => {
            const chip = estadoChip(c.estado);
            const ocupa = c.ocupacionActiva;

            const borderColor =
              chip.color === "success"
                ? "success.light"
                : chip.color === "warning"
                ? "warning.light"
                : chip.color === "error"
                ? "error.light"
                : chip.color === "info"
                ? "info.light"
                : "divider";

            return (
              <Grid key={c.id} item xs={6} sm={4} md={3} lg={2}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: "pointer",
                    height: "100%",
                    borderWidth: 2,
                    borderColor,
                  }}
                  onClick={() => abrirDetalle(c.id)}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        #{c.numero}
                      </Typography>
                      <Chip size="small" label={chip.label} color={chip.color} variant="filled" />
                    </Stack>

                    {ocupa ? (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {ocupa.clienteNombre}
                        </Typography>

                        {/* Si estás en OCUPADA: sentido mostrar vencimiento */}
                        {/* Si estás en RESERVADA: podés querer mostrar "empieza en..." (depende de tu DTO) */}
                        <Typography variant="caption" color="text.secondary">
                          {diffHuman(ocupa.fin)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        —
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog detalle */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Detalle cochera</DialogTitle>
        <DialogContent dividers>
          {!detalle ? (
            <div>Cargando detalle...</div>
          ) : (
            <Stack spacing={2}>
              {(() => {
                const chip = estadoChip(detalle.estado);
                return (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Cochera #{detalle.numero}</Typography>
                    <Chip size="small" label={chip.label} color={chip.color} />
                  </Stack>
                );
              })()}

              <TextField
                label="Nota (ej: en reparación)"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                fullWidth
              />

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="error"
                  disabled={saving}
                  onClick={() => setEstado(detalle.id, 2, nota)} // BLOQUEADA = 2
                >
                  Bloquear
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  disabled={saving}
                  onClick={() => setEstado(detalle.id, 1, nota)} // DISPONIBLE = 1
                >
                  Desbloquear
                </Button>
              </Stack>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Ocupación activa
                </Typography>

                {detalle.ocupacionActiva ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography fontWeight={700}>{detalle.ocupacionActiva.clienteNombre}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Inicio: {formatDateTime(detalle.ocupacionActiva.inicio)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Fin: {formatDateTime(detalle.ocupacionActiva.fin)} ({diffHuman(detalle.ocupacionActiva.fin)})
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Total: ${detalle.ocupacionActiva.precioTotal}
                      </Typography>
                    </CardContent>
                  </Card>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay ocupación activa.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Historial (últimas 10)
                </Typography>

                {detalle.historial?.length ? (
                  <Stack spacing={1}>
                    {detalle.historial.map((h) => {
                      const chipH = estadoChip(h.estado);

                      const borderColor =
                        chipH.color === "success"
                          ? "success.main"
                          : chipH.color === "warning"
                          ? "warning.main"
                          : chipH.color === "error"
                          ? "error.main"
                          : chipH.color === "info"
                          ? "info.main"
                          : "divider";

                      return (
                        <Card key={h.id} variant="outlined" sx={{ borderWidth: 2, borderColor }}>
                          <CardContent sx={{ py: 1.2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography fontWeight={700}>
                                #{h.id} · {h.clienteNombre}
                              </Typography>

                              <Chip size="small" label={chipH.label} color={chipH.color} variant="filled" />
                            </Stack>

                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(h.inicio)} → {formatDateTime(h.fin)}
                            </Typography>

                            <Typography variant="body2">Total: ${h.precioTotal}</Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin historial.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
