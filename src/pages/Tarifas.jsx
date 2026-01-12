import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/*
  IMPORTANTE
  Ajustá los IDs si tu enum en C# es distinto.
  Ej:
  enum TipoOcupacion { HORA = 1, DIA = 2, MES = 3 }
*/
const TIPOS = [
  { id: 1, label: "HORA" },
  { id: 2, label: "DIA" },
  { id: 3, label: "MES" },
];


function money(n) {
  try {
    return new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
      maximumFractionDigits: 2,
    }).format(n ?? 0);
  } catch {
    return `$ ${n}`;
  }
}

function fmtDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

export default function Tarifas() {
  const [loading, setLoading] = useState(true);

  const [activas, setActivas] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [tipoHist, setTipoHist] = useState(TIPOS[0].id);

  // dialog actualizar
  const [open, setOpen] = useState(false);
  const [tipoUpd, setTipoUpd] = useState(TIPOS[0].id);
  const [precioUpd, setPrecioUpd] = useState("");
  const [vigenteDesdeUpd, setVigenteDesdeUpd] = useState("");
  const [saving, setSaving] = useState(false);

  // ======================
  // MAPA DE TARIFAS ACTIVAS
  // ======================
  const activaPorTipo = useMemo(() => {
    const map = new Map();
    activas.forEach((t) => map.set(t.tipo, t));
    return map;
  }, [activas]);

  // ======================
  // CARGAS
  // ======================
  async function cargarActivas() {
    const res = await http.get("/Tarifas/activas");
    setActivas(Array.isArray(res.data) ? res.data : []);
  }

  async function cargarHistorial(tipoEnum) {
    try {
      const res = await http.get(`/Tarifas/historial?tipo=${tipoEnum}`);
      setHistorial(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setHistorial([]);
      toast.error(e?.response?.data?.error || "No pude cargar historial");
    }
  }

  async function cargarInicial() {
    try {
      setLoading(true);
      await cargarActivas();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude cargar tarifas");
    } finally {
      setLoading(false);
    }
  }

  // SOLO UNA VEZ
  useEffect(() => {
    cargarInicial();
  }, []);

  // HISTORIAL DEPENDE SOLO DEL TIPO
  useEffect(() => {
    cargarHistorial(tipoHist);
  }, [tipoHist]);

  // ======================
  // ACTUALIZAR TARIFA
  // ======================
  function abrirActualizar(tipoEnum) {
    setTipoUpd(tipoEnum);
    const actual = activaPorTipo.get(tipoEnum);
    setPrecioUpd(actual ? String(actual.precio) : "");
    setVigenteDesdeUpd("");
    setOpen(true);
  }

  async function guardarNuevaTarifa() {
    const precio = Number(precioUpd);
    if (!precio || precio <= 0) {
      return toast.error("El precio debe ser mayor a 0");
    }

    const vigenteDesde =
      vigenteDesdeUpd && vigenteDesdeUpd.trim()
        ? new Date(vigenteDesdeUpd).toISOString()
        : null;

    try {
      setSaving(true);

      await http.put("/Tarifas", {
        tipo: tipoUpd,
        nuevoPrecio: precio,
        vigenteDesde,
      });

      toast.success("Tarifa actualizada");
      setOpen(false);

      await cargarActivas();
      await cargarHistorial(tipoHist);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude actualizar tarifa");
    } finally {
      setSaving(false);
    }
  }

  // ======================
  // RENDER
  // ======================
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Tarifas</Typography>
        <Button variant="outlined" onClick={cargarInicial} disabled={loading}>
          Refrescar
        </Button>
      </Stack>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <Stack spacing={2}>
          {/* TARIFAS ACTIVAS */}
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Tarifas activas
              </Typography>

              <Stack spacing={1}>
                {TIPOS.map((tipo) => {
                  const t = activaPorTipo.get(tipo.id);
                  return (
                    <Stack
                      key={tipo.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack>
                        <Typography fontWeight={700}>{tipo.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t
                            ? `Vigente desde: ${fmtDate(t.vigenteDesde)}`
                            : "Sin tarifa activa"}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography fontWeight={800}>
                          {t ? money(t.precio) : "-"}
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => abrirActualizar(tipo.id)}
                        >
                          Actualizar
                        </Button>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* HISTORIAL */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography fontWeight={800}>Historial</Typography>

                <TextField
                  select
                  size="small"
                  label="Tipo"
                  value={tipoHist}
                  onChange={(e) => setTipoHist(Number(e.target.value))}
                  sx={{ width: 180 }}
                >
                  {TIPOS.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Divider sx={{ mb: 1 }} />

              {!historial.length ? (
                <Typography color="text.secondary">
                  No hay historial para este tipo.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {historial.map((t) => (
                    <Stack
                      key={t.id}
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography>{money(t.precio)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(t.vigenteDesde)}
                        {t.vigenteHasta
                          ? ` → ${fmtDate(t.vigenteHasta)}`
                          : " → (vigente)"}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Actualizar tarifa</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              label="Tipo"
              value={tipoUpd}
              onChange={(e) => setTipoUpd(Number(e.target.value))}
              fullWidth
            >
              {TIPOS.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Nuevo precio"
              value={precioUpd}
              onChange={(e) => setPrecioUpd(e.target.value)}
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />

            <TextField
              label="Vigente desde (opcional)"
              type="datetime-local"
              value={vigenteDesdeUpd}
              onChange={(e) => setVigenteDesdeUpd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarNuevaTarifa} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
