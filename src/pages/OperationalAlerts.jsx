import { useEffect, useMemo, useState } from "react";
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
  Divider,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { operationalAlertsApi } from "../api/operationalAlertsApi";
import {
  SEVERIDAD_ALERTA,
  TIPO_ALERTA,
} from "../constants/operationalAlerts";

function fmtDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function AlertChip({ severidad }) {
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

export default function OperationalAlerts() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [resuelta, setResuelta] = useState("false");
  const [severidad, setSeveridad] = useState("");
  const [tipo, setTipo] = useState("");

  const [selected, setSelected] = useState(null);
  const [comentario, setComentario] = useState("");
  const [resolving, setResolving] = useState(false);

  async function cargarAlertas() {
    try {
      setLoading(true);

      const params = {
        page: 1,
        pageSize: 50,
      };

      if (resuelta !== "") params.resuelta = resuelta === "true";
      if (severidad !== "") params.severidad = Number(severidad);
      if (tipo !== "") params.tipo = Number(tipo);

      const { data } = await operationalAlertsApi.getAll(params);
      setAlertas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las alertas operativas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarAlertas();
  }, [resuelta, severidad, tipo]);

  const resumen = useMemo(() => {
    const abiertas = alertas.filter((a) => !a.resuelta).length;
    const criticas = alertas.filter(
      (a) => !a.resuelta && Number(a.severidad) === 4
    ).length;
    const altas = alertas.filter(
      (a) => !a.resuelta && Number(a.severidad) === 3
    ).length;

    return { abiertas, criticas, altas };
  }, [alertas]);

  function abrirResolver(alerta) {
    setSelected(alerta);
    setComentario("");
  }

  function cerrarResolver() {
    setSelected(null);
    setComentario("");
  }

  async function resolverAlerta() {
    if (!selected) return;

    try {
      setResolving(true);

      await operationalAlertsApi.resolve(selected.id, comentario);

      toast.success("Alerta resuelta correctamente");
      cerrarResolver();
      await cargarAlertas();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo resolver la alerta");
    } finally {
      setResolving(false);
    }
  }

  return (
    <Box>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Alertas operativas
          </Typography>

          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            Monitoreo de inconsistencias, pagos sospechosos y ocupaciones con riesgo operativo.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Card sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary">Alertas abiertas</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {resumen.abiertas}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary">Críticas</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {resumen.criticas}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary">Alta severidad</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {resumen.altas}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label="Estado"
                value={resuelta}
                onChange={(e) => setResuelta(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="false">Abiertas</MenuItem>
                <MenuItem value="true">Resueltas</MenuItem>
              </TextField>

              <TextField
                select
                label="Severidad"
                value={severidad}
                onChange={(e) => setSeveridad(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="1">Baja</MenuItem>
                <MenuItem value="2">Media</MenuItem>
                <MenuItem value="3">Alta</MenuItem>
                <MenuItem value="4">Crítica</MenuItem>
              </TextField>

              <TextField
                select
                label="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(TIPO_ALERTA).map(([id, label]) => (
                  <MenuItem key={id} value={id}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <Button variant="outlined" onClick={cargarAlertas}>
                Actualizar
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Stack>
        ) : alertas.length === 0 ? (
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: "text.secondary" }}>
                No hay alertas para los filtros seleccionados.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {alertas.map((a) => (
              <Card
                key={a.id}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor:
                    !a.resuelta && Number(a.severidad) === 4
                      ? "error.main"
                      : "divider",
                }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AlertChip severidad={a.severidad} />

                        <Chip
                          size="small"
                          label={a.resuelta ? "RESUELTA" : "ABIERTA"}
                          color={a.resuelta ? "success" : "warning"}
                          variant={a.resuelta ? "filled" : "outlined"}
                          sx={{ fontWeight: 800 }}
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Creada: {fmtDate(a.fechaCreacion)}
                      </Typography>
                    </Stack>

                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {TIPO_ALERTA[Number(a.tipo)] ?? "Tipo desconocido"}
                      </Typography>

                      <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
                        {a.mensaje}
                      </Typography>
                    </Box>

                    <Divider />

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Ocupación: {a.ocupacionId ?? "-"}
                      </Typography>

                      {a.resuelta ? (
                        <Typography variant="body2" color="text.secondary">
                          Resuelta: {fmtDate(a.fechaResolucion)}
                        </Typography>
                      ) : (
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => abrirResolver(a)}
                        >
                          Resolver alerta
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog open={!!selected} onClose={cerrarResolver} fullWidth maxWidth="sm">
        <DialogTitle>Resolver alerta</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>
              {selected
                ? TIPO_ALERTA[Number(selected.tipo)] ?? "Tipo desconocido"
                : ""}
            </Typography>

            <TextField
              label="Comentario de resolución"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              multiline
              minRows={3}
              placeholder="Ej: Validado manualmente por administración."
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={cerrarResolver} disabled={resolving}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={resolverAlerta}
            disabled={resolving}
          >
            Resolver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}