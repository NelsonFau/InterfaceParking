import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../api/http";
import toast from "react-hot-toast";
import Autocomplete from "@mui/material/Autocomplete";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// enums C# (numéricos)
const ESTADOS = [
  { id: "", label: "Todos" },
  { id: 1, label: "ACTIVA" },
  { id: 2, label: "VENCIDA" },
  { id: 3, label: "CANCELADA" },
];

const TIPOS = [
  { id: 1, label: "HORA" },
  { id: 2, label: "DIA" },
  { id: 3, label: "MES" },
];

function money(n) {
  const x = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(x);
  } catch {
    return `$ ${x}`;
  }
}

function fmtDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function estadoLabel(v) {
  const n = typeof v === "number" ? v : Number(v);
  return ESTADOS.find((x) => x.id !== "" && Number(x.id) === n)?.label ?? String(v);
}

function tipoLabel(v) {
  const n = typeof v === "number" ? v : Number(v);
  return TIPOS.find((x) => x.id === n)?.label ?? String(v);
}

function EstadoChip({ estado }) {
  const label = estadoLabel(estado);
  return <Chip size="small" label={label} variant="outlined" />;
}

export default function Ocupaciones() {
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const [items, setItems] = useState([]);

  // filtros
  const [estado, setEstado] = useState(""); // "" => todos
  const [cocheraId, setCocheraId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [venceEnDias, setVenceEnDias] = useState("");
  const [take, setTake] = useState(200);

  // dialog crear
  const [openCrear, setOpenCrear] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cCocheraId, setCCocheraId] = useState("");
  const [cTipo, setCTipo] = useState(TIPOS[0].id);
  const [cInicio, setCInicio] = useState("");
  const [cFin, setCFin] = useState("");

  const [usarExcep, setUsarExcep] = useState(false);
  const [precioExcep, setPrecioExcep] = useState("");
  const [motivoExcep, setMotivoExcep] = useState("");

  // cliente autocomplete
  const [clienteSel, setClienteSel] = useState(null);
  const [clienteInput, setClienteInput] = useState("");
  const [clienteOptions, setClienteOptions] = useState([]);
  const [clienteLoading, setClienteLoading] = useState(false);
  const clienteTimerRef = useRef(null);

  // dialog cancelar
  const [openCancelar, setOpenCancelar] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [finRealCancel, setFinRealCancel] = useState("");

  const resumen = useMemo(() => {
    const total = items.length;
    const vencidas = items.filter((x) => Number(x.estadoCalculado ?? x.estado) === 2).length;
    return { total, vencidas };
  }, [items]);

  async function cargar() {
    const myReqId = ++reqIdRef.current;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (estado !== "") params.set("estado", String(estado));
      if (cocheraId.trim()) params.set("cocheraId", cocheraId.trim());
      if (clienteId.trim()) params.set("clienteId", clienteId.trim());
      if (desde) params.set("desde", new Date(desde).toISOString());
      if (hasta) params.set("hasta", new Date(hasta).toISOString());
      if (venceEnDias.trim()) params.set("venceEnDias", venceEnDias.trim());
      params.set("take", String(take || 200));

      const res = await http.get(`/Ocupacion?${params.toString()}`);

      if (myReqId !== reqIdRef.current) return;

      const data = res.data;
      const arr = Array.isArray(data) ? data : (data?.items ?? []);
      setItems(arr);

      // DEBUG útil (si querés dejarlo unos minutos)
      console.log("OCUPACIONES:", arr.length, arr[0]);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude cargar ocupaciones");
      setItems([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }

  async function buscarClientes(term) {
    const q = (term || "").trim();
    if (!q) {
      setClienteOptions([]);
      return;
    }

    try {
      setClienteLoading(true);
      const res = await http.get(
        `/Cliente?q=${encodeURIComponent(q)}&activos=true&page=1&pageSize=20`
      );
      const data = res.data;
      const arr = Array.isArray(data) ? data : (data?.items ?? []);
      setClienteOptions(arr);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude buscar clientes");
    } finally {
      setClienteLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (clienteTimerRef.current) clearTimeout(clienteTimerRef.current);

    clienteTimerRef.current = setTimeout(() => {
      buscarClientes(clienteInput);
    }, 300);

    return () => {
      if (clienteTimerRef.current) clearTimeout(clienteTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteInput]);

  function abrirCrear() {
    setCCocheraId("");
    setCTipo(TIPOS[0].id);
    setCInicio("");
    setCFin("");
    setUsarExcep(false);
    setPrecioExcep("");
    setMotivoExcep("");
    setClienteSel(null);
    setClienteInput("");
    setClienteOptions([]);
    setOpenCrear(true);
  }

  async function crear() {
    const coch = Number(cCocheraId);
    if (!coch) return toast.error("Falta CocheraId");
    if (!clienteSel?.id) return toast.error("Elegí un cliente");
    if (!cInicio) return toast.error("Falta Inicio");
    if (!cFin) return toast.error("Falta Fin");

    const inicioIso = new Date(cInicio).toISOString();
    const finIso = new Date(cFin).toISOString();
    if (new Date(finIso) <= new Date(inicioIso)) return toast.error("Fin debe ser mayor que Inicio");

    let payload = {
      cocheraId: coch,
      clienteId: clienteSel.id,
      tipo: Number(cTipo),
      inicio: inicioIso,
      fin: finIso,
      usarTarifaExcepcional: usarExcep,
      precioUnitarioExcepcional: null,
      motivoTarifaExcepcional: null,
    };

    if (usarExcep) {
      const pe = Number(precioExcep);
      if (!pe || pe <= 0) return toast.error("Precio excepcional inválido");
      if (!motivoExcep.trim()) return toast.error("Falta motivo excepcional");

      payload = {
        ...payload,
        precioUnitarioExcepcional: pe,
        motivoTarifaExcepcional: motivoExcep.trim(),
      };
    }

    try {
      setSaving(true);
      await http.post("/Ocupacion", payload);
      toast.success("Ocupación creada");
      setOpenCrear(false);
      await cargar();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude crear ocupación");
    } finally {
      setSaving(false);
    }
  }

  function abrirCancelar(id) {
    setCancelId(id);
    setMotivoCancel("");
    setFinRealCancel("");
    setOpenCancelar(true);
  }

  async function cancelar() {
    if (!cancelId) return;
    if (!motivoCancel.trim()) return toast.error("Falta motivo");

    const finReal =
      finRealCancel && finRealCancel.trim() ? new Date(finRealCancel).toISOString() : null;

    try {
      setSaving(true);
      await http.post(`/Ocupacion/${cancelId}/cancelar`, {
        motivo: motivoCancel.trim(),
        finReal,
      });

      toast.success("Ocupación cancelada");
      setOpenCancelar(false);
      await cargar();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude cancelar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5">Ocupaciones</Typography>

        <Button variant="contained" onClick={abrirCrear}>
          Nueva ocupación
        </Button>

        <Button variant="outlined" onClick={cargar} disabled={loading}>
          Refrescar
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={800} sx={{ mb: 1 }}>
            Filtros
          </Typography>

          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label="Estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              sx={{ width: 180 }}
            >
              {ESTADOS.map((x) => (
                <MenuItem key={String(x.id)} value={x.id}>
                  {x.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="CocheraId"
              value={cocheraId}
              onChange={(e) => setCocheraId(e.target.value)}
              sx={{ width: 140 }}
            />

            <TextField
              size="small"
              label="ClienteId"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              sx={{ width: 140 }}
            />

            <TextField
              size="small"
              label="Desde"
              type="datetime-local"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 220 }}
            />

            <TextField
              size="small"
              label="Hasta"
              type="datetime-local"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 220 }}
            />

            <TextField
              size="small"
              label="Vence en días"
              value={venceEnDias}
              onChange={(e) => setVenceEnDias(e.target.value)}
              sx={{ width: 140 }}
            />

            <TextField
              size="small"
              label="Take"
              value={take}
              onChange={(e) => setTake(Number(e.target.value) || 200)}
              sx={{ width: 120 }}
            />

            <Button variant="outlined" onClick={cargar} disabled={loading}>
              Aplicar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <Stack spacing={1.2}>
          <Typography variant="body2" color="text.secondary">
            Resultados: {resumen.total}
            {resumen.vencidas ? ` · Vencidas: ${resumen.vencidas}` : ""}
          </Typography>

          {items.map((o) => (
            <Card key={o.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ gap: 2, flexWrap: "wrap" }}
                >
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={800}>
                        Cochera #{o.cocheraNumero ?? o.cocheraId}
                      </Typography>

                      <EstadoChip estado={o.estadoCalculado ?? o.estado} />
                      <Chip size="small" label={`Tipo: ${tipoLabel(o.tipo)}`} variant="outlined" />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Cliente: {o.clienteNombre ?? o.clienteId} · Inicio: {fmtDate(o.inicio)} · Fin:{" "}
                      {fmtDate(o.fin)}
                    </Typography>

                    <Typography variant="body2">
                      Total: <b>{money(o.precioTotal)}</b> · Pagado: <b>{money(o.pagado)}</b> · Saldo:{" "}
                      <b>{money(o.saldo)}</b>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => toast(`Ocupación #${o.id}`)}>
                      Ver
                    </Button>

                    {Number(o.estado) === 1 ? (
                      <Button color="error" variant="contained" onClick={() => abrirCancelar(o.id)}>
                        Cancelar
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!items.length && (
            <Typography color="text.secondary">No hay ocupaciones para mostrar.</Typography>
          )}
        </Stack>
      )}

      {/* Dialog Crear */}
      <Dialog open={openCrear} onClose={() => setOpenCrear(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva ocupación</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="CocheraId"
              value={cCocheraId}
              onChange={(e) => setCCocheraId(e.target.value)}
              fullWidth
            />

            <Autocomplete
              options={clienteOptions}
              value={clienteSel}
              inputValue={clienteInput}
              onInputChange={(e, v) => setClienteInput(v)}
              onChange={(e, v) => setClienteSel(v)}
              loading={clienteLoading}
              getOptionLabel={(opt) =>
                opt ? `${opt.nombreCompleto ?? opt.nombre ?? ""} · CI: ${opt.documento ?? ""}` : ""
              }
              isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente (nombre o CI)"
                  placeholder="Escribí las primeras letras..."
                  fullWidth
                />
              )}
            />

            <TextField
              select
              label="Tipo"
              value={cTipo}
              onChange={(e) => setCTipo(Number(e.target.value))}
              fullWidth
            >
              {TIPOS.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Inicio"
                type="datetime-local"
                value={cInicio}
                onChange={(e) => setCInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Fin"
                type="datetime-local"
                value={cFin}
                onChange={(e) => setCFin(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            <Divider />

            <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap" }}>
              <Chip label={usarExcep ? "Tarifa excepcional" : "Tarifa base"} variant="outlined" />
              <Button variant="outlined" onClick={() => setUsarExcep((v) => !v)}>
                {usarExcep ? "Usar tarifa base" : "Usar tarifa excepcional"}
              </Button>
            </Stack>

            {usarExcep && (
              <>
                <TextField
                  label="Precio unitario excepcional"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  value={precioExcep}
                  onChange={(e) => setPrecioExcep(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Motivo tarifa excepcional"
                  value={motivoExcep}
                  onChange={(e) => setMotivoExcep(e.target.value)}
                  fullWidth
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCrear(false)}>Cancelar</Button>
          <Button variant="contained" onClick={crear} disabled={saving}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cancelar */}
      <Dialog open={openCancelar} onClose={() => setOpenCancelar(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cancelar ocupación</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Motivo"
              value={motivoCancel}
              onChange={(e) => setMotivoCancel(e.target.value)}
              fullWidth
            />
            <TextField
              label="Fin real (opcional)"
              type="datetime-local"
              value={finRealCancel}
              onChange={(e) => setFinRealCancel(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Typography variant="body2" color="text.secondary">
              Si no ponés fin real, se usa “ahora (UTC)”.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelar(false)}>Volver</Button>
          <Button color="error" variant="contained" onClick={cancelar} disabled={saving}>
            Cancelar ocupación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
