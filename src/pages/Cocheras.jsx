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
  Stack,
  TextField,
  Typography,
  Divider,
  Skeleton,
} from "@mui/material";

// =========================
// Estados cocheras (FRONT)
// =========================
const ESTADO_COCHERA = {
  1: { label: "Disponible", color: "success" },
  2: { label: "Bloqueada", color: "error" },
  3: { label: "Ocupada", color: "warning" },
  4: { label: "Reservada", color: "info" },
};

function estadoChip(estado) {
  let n = null;
  if (typeof estado === "number") n = estado;
  else {
    const s = String(estado).trim().toUpperCase();
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

function CocheraCard({ c, onClick }) {
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
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: "pointer",
        borderRadius: 3,
        borderWidth: 2,
        borderColor,
        height: 150, // ✅ altura fija
        display: "flex",
        boxShadow: "0 6px 18px rgba(0,0,0,.06)",
        transition: "transform .08s ease, box-shadow .08s ease",
        "&:active": { transform: "scale(0.99)" },
        "&:hover": { boxShadow: "0 10px 22px rgba(0,0,0,.08)" },
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 1.75,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 1,
          "&:last-child": { pb: 1.75 },
        }}
      >
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: -0.2 }}>
            #{c.numero}
          </Typography>

          <Chip
            size="small"
            label={chip.label}
            color={chip.color}
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {/* Body */}
        {ocupa ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{ fontWeight: 800, lineHeight: 1.15 }}
              noWrap
              title={ocupa.clienteNombre}
            >
              {ocupa.clienteNombre}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
              {chip.label === "Ocupada" || chip.label === "Reservada"
                ? diffHuman(ocupa.fin)
                : ""}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
            noWrap
          >
            —
          </Typography>
        )}

        {/* Footer */}
        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
          {ocupa?.fin ? `Fin: ${new Date(ocupa.fin).toLocaleDateString()}` : " "}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Cocheras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // detalle
  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  // filtro
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
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Cocheras
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Visualización rápida del estado de cada cochera.
        </Typography>
      </Stack>

      {/* Actions */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Button
          variant="contained"
          onClick={cargar}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 800 }}
        >
          Refrescar
        </Button>

        <TextField
          size="small"
          label="Buscar por número"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: { xs: "100%", sm: 260 } }}
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Grid */}
      {loading ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(6, 1fr)",
            },
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={150} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(6, 1fr)",
            },
          }}
        >
          {filtered.map((c) => (
            <CocheraCard key={c.id} c={c} onClick={() => abrirDetalle(c.id)} />
          ))}
        </Box>
      )}

      {/* Dialog detalle (tuyo, casi igual) */}
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
                  onClick={() => setEstado(detalle.id, 2, nota)}
                >
                  Bloquear
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  disabled={saving}
                  onClick={() => setEstado(detalle.id, 1, nota)}
                >
                  Desbloquear
                </Button>
              </Stack>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Ocupación activa
                </Typography>

                {detalle.ocupacionActiva ? (
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Typography fontWeight={900}>
                        {detalle.ocupacionActiva.clienteNombre}
                      </Typography>
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
                        <Card key={h.id} variant="outlined" sx={{ borderWidth: 2, borderColor, borderRadius: 3 }}>
                          <CardContent sx={{ py: 1.2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                              <Typography fontWeight={800} noWrap title={`${h.id} · ${h.clienteNombre}`} sx={{ minWidth: 0 }}>
                                #{h.id} · {h.clienteNombre}
                              </Typography>

                              <Chip size="small" label={chipH.label} color={chipH.color} variant="filled" />
                            </Stack>

                            <Typography variant="caption" color="text.secondary" noWrap>
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
