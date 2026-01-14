import { useEffect, useMemo, useRef, useState } from "react";
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const ACCION = {
  1: { label: "CREAR", color: "success" },
  2: { label: "EDITAR", color: "info" },
  3: { label: "CANCELAR", color: "warning" },
  4: { label: "ANULAR PAGO", color: "error" },
};

function accionChip(accion) {
  const n = typeof accion === "number" ? accion : Number(accion);
  return ACCION[n] ?? { label: String(accion), color: "default" };
}

function fmtDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function safePrettyJson(str) {
  if (!str) return null;
  try {
    const obj = typeof str === "string" ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    // si no es JSON válido, devolvemos texto original
    return String(str);
  }
}

function LoadingList() {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={102} />
      ))}
    </Stack>
  );
}

export default function Auditoria() {
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const [items, setItems] = useState([]);

  // filtros
  const [entidad, setEntidad] = useState("");
  const [entidadId, setEntidadId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [take, setTake] = useState(200);

  // dialog detalle
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);

  const resumen = useMemo(() => {
    const total = items.length;
    const porAccion = items.reduce((acc, it) => {
      const key = accionChip(it.accion).label;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, porAccion };
  }, [items]);

  async function cargar() {
    const myReqId = ++reqIdRef.current;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (entidad.trim()) params.set("entidad", entidad.trim());

      const eid = Number(entidadId);
      if (entidadId.trim() && !Number.isNaN(eid)) params.set("entidadId", String(eid));

      const uid = Number(usuarioId);
      if (usuarioId.trim() && !Number.isNaN(uid)) params.set("usuarioId", String(uid));

      // backend espera DateTime?; mandamos ISO para evitar problemas
      if (desde) params.set("desde", new Date(desde).toISOString());
      if (hasta) params.set("hasta", new Date(hasta).toISOString());

      const tk = Number(take) || 200;
      params.set("take", String(tk));

      const res = await http.get(`/Auditoria?${params.toString()}`);
      if (myReqId !== reqIdRef.current) return;

      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude cargar auditoría");
      setItems([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirDetalle(it) {
    setSel(it);
    setOpen(true);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Auditoría
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Registro de acciones realizadas por usuarios (crear/editar/cancelar/anular pago).
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
          variant="outlined"
          onClick={cargar}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 800 }}
        >
          Refrescar
        </Button>

        <Button
          variant="contained"
          onClick={cargar}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 900 }}
        >
          Aplicar filtros
        </Button>
      </Stack>

      {/* Filtros */}
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          borderRadius: 3,
          borderColor: "divider",
          boxShadow: "0 6px 18px rgba(0,0,0,.06)",
        }}
      >
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 1 }}>
            Filtros
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
            }}
          >
            <TextField
              size="small"
              label="Entidad (ej: Cliente, Cochera, Ocupacion)"
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="EntidadId"
              value={entidadId}
              onChange={(e) => setEntidadId(e.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="UsuarioId"
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="Take"
              value={take}
              onChange={(e) => setTake(Number(e.target.value) || 200)}
              fullWidth
            />

            <TextField
              size="small"
              label="Desde"
              type="datetime-local"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              size="small"
              label="Hasta"
              type="datetime-local"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Button
              variant="outlined"
              onClick={() => {
                setEntidad("");
                setEntidadId("");
                setUsuarioId("");
                setDesde("");
                setHasta("");
                setTake(200);
              }}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Limpiar
            </Button>

            <Box sx={{ display: { xs: "none", md: "block" } }} />
          </Box>
        </CardContent>
      </Card>

      {/* Resumen */}
      {!loading && (
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            borderRadius: 3,
            borderColor: "divider",
            boxShadow: "0 6px 18px rgba(0,0,0,.06)",
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Resultados: <b>{resumen.total}</b>
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {Object.entries(resumen.porAccion).map(([k, v]) => (
                  <Chip key={k} size="small" label={`${k}: ${v}`} variant="outlined" />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Listado */}
      {loading ? (
        <LoadingList />
      ) : (
        <Stack spacing={1.25}>
          {items.map((it) => {
            const chip = accionChip(it.accion);

            return (
              <Card
                key={it.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: "divider",
                  boxShadow: "0 6px 18px rgba(0,0,0,.06)",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flexWrap: "wrap", mb: 0.5 }}
                      >
                        <Typography sx={{ fontWeight: 900 }}>
                          #{it.id}
                        </Typography>

                        <Chip
                          size="small"
                          label={chip.label}
                          color={chip.color}
                          variant="filled"
                          sx={{ fontWeight: 800 }}
                        />

                        <Chip
                          size="small"
                          label={`${it.entidad} · ${it.entidadId}`}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                        Usuario: <b>{it.usuarioNombre}</b> (ID {it.usuarioId}) · Fecha: {fmtDate(it.fecha)}
                      </Typography>

                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        {it.datosAntesJson ? "Tiene datos ANTES" : "Sin ANTES"} ·{" "}
                        {it.datosDespuesJson ? "Tiene datos DESPUÉS" : "Sin DESPUÉS"}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={() => abrirDetalle(it)}
                        sx={{ borderRadius: 2, fontWeight: 800 }}
                      >
                        Ver detalle
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}

          {!items.length && (
            <Typography color="text.secondary">
              No hay eventos de auditoría para mostrar.
            </Typography>
          )}
        </Stack>
      )}

      {/* Dialog detalle */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Detalle de auditoría</DialogTitle>

        <DialogContent dividers>
          {!sel ? (
            <div>Cargando...</div>
          ) : (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 900 }}>
                    #{sel.id} · {sel.entidad} {sel.entidadId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usuario: <b>{sel.usuarioNombre}</b> (ID {sel.usuarioId}) · Fecha: {fmtDate(sel.fecha)}
                  </Typography>
                </Stack>

                <Chip
                  size="small"
                  label={accionChip(sel.accion).label}
                  color={accionChip(sel.accion).color}
                  variant="filled"
                  sx={{ fontWeight: 900, width: "fit-content" }}
                />
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>Antes</Typography>
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,.04)",
                        overflow: "auto",
                        maxHeight: 340,
                        fontSize: 12.5,
                        lineHeight: 1.35,
                      }}
                    >
                      {safePrettyJson(sel.datosAntesJson) ?? "—"}
                    </Box>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>Después</Typography>
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,.04)",
                        overflow: "auto",
                        maxHeight: 340,
                        fontSize: 12.5,
                        lineHeight: 1.35,
                      }}
                    >
                      {safePrettyJson(sel.datosDespuesJson) ?? "—"}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
