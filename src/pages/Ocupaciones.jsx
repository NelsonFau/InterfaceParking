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
  Skeleton,
} from "@mui/material";

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

const METODOS_PAGO = [
  { id: 1, label: "EFECTIVO" },
  { id: 2, label: "TRANSFERENCIA" },
  { id: 3, label: "TARJETA" },
  { id: 4, label: "OTRO" },
];

function money(n) {
  const x = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
    }).format(x);
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
  return <Chip size="small" label={label} variant="outlined" sx={{ fontWeight: 700 }} />;
}

function LoadingList() {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={108} />
      ))}
    </Stack>
  );
}

export default function Ocupaciones() {
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const [items, setItems] = useState([]);

  const [estado, setEstado] = useState("");
  const [cocheraId, setCocheraId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [venceEnDias, setVenceEnDias] = useState("");
  const [take, setTake] = useState(200);

  const [filtroClienteSel, setFiltroClienteSel] = useState(null);
  const [filtroClienteInput, setFiltroClienteInput] = useState("");
  const [filtroClienteOptions, setFiltroClienteOptions] = useState([]);
  const [filtroClienteLoading, setFiltroClienteLoading] = useState(false);
  const filtroClienteTimerRef = useRef(null);

  const [openCrear, setOpenCrear] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cCocheraId, setCCocheraId] = useState("");
  const [cTipo, setCTipo] = useState(TIPOS[0].id);
  const [cInicio, setCInicio] = useState("");
  const [cFin, setCFin] = useState("");

  const [crearClienteSel, setCrearClienteSel] = useState(null);
  const [crearClienteInput, setCrearClienteInput] = useState("");
  const [crearClienteOptions, setCrearClienteOptions] = useState([]);
  const [crearClienteLoading, setCrearClienteLoading] = useState(false);
  const crearClienteTimerRef = useRef(null);

  const [usarExcep, setUsarExcep] = useState(false);
  const [precioExcep, setPrecioExcep] = useState("");
  const [motivoExcep, setMotivoExcep] = useState("");

  const [openCancelar, setOpenCancelar] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState("");
  const [finRealCancel, setFinRealCancel] = useState("");

  const [openPago, setOpenPago] = useState(false);
  const [ocupacionPago, setOcupacionPago] = useState(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState(1);
  const [pagoComentario, setPagoComentario] = useState("");

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
      const arr = Array.isArray(data) ? data : data?.items ?? [];
      setItems(arr);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude cargar ocupaciones");
      setItems([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }

  async function buscarClientes(term, setOptions, setLoadingFn) {
    const q = (term || "").trim();

    if (!q) {
      setOptions([]);
      return;
    }

    try {
      setLoadingFn(true);

      const res = await http.get(
        `/Cliente?q=${encodeURIComponent(q)}&activos=true&page=1&pageSize=20`
      );

      const data = res.data;
      const arr = Array.isArray(data) ? data : data?.items ?? [];
      setOptions(arr);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude buscar clientes");
    } finally {
      setLoadingFn(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filtroClienteTimerRef.current) clearTimeout(filtroClienteTimerRef.current);

    filtroClienteTimerRef.current = setTimeout(() => {
      buscarClientes(filtroClienteInput, setFiltroClienteOptions, setFiltroClienteLoading);
    }, 300);

    return () => {
      if (filtroClienteTimerRef.current) clearTimeout(filtroClienteTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroClienteInput]);

  useEffect(() => {
    if (crearClienteTimerRef.current) clearTimeout(crearClienteTimerRef.current);

    crearClienteTimerRef.current = setTimeout(() => {
      buscarClientes(crearClienteInput, setCrearClienteOptions, setCrearClienteLoading);
    }, 300);

    return () => {
      if (crearClienteTimerRef.current) clearTimeout(crearClienteTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearClienteInput]);

  function abrirCrear() {
    setCCocheraId("");
    setCTipo(TIPOS[0].id);
    setCInicio("");
    setCFin("");
    setCrearClienteSel(null);
    setCrearClienteInput("");
    setCrearClienteOptions([]);
    setUsarExcep(false);
    setPrecioExcep("");
    setMotivoExcep("");
    setOpenCrear(true);
  }

  async function crear() {
    const coch = Number(cCocheraId);

    if (!coch) return toast.error("Falta CocheraId");
    if (!crearClienteSel?.id) return toast.error("Elegí un cliente");
    if (!cInicio) return toast.error("Falta Inicio");
    if (!cFin) return toast.error("Falta Fin");

    const inicioIso = new Date(cInicio).toISOString();
    const finIso = new Date(cFin).toISOString();

    if (new Date(finIso) <= new Date(inicioIso)) {
      return toast.error("Fin debe ser mayor que Inicio");
    }

    let payload = {
      cocheraId: coch,
      clienteId: crearClienteSel.id,
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
      finRealCancel && finRealCancel.trim()
        ? new Date(finRealCancel).toISOString()
        : null;

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

  async function finalizarOcupacion(ocupacion) {
    if (!ocupacion?.id) return;

    try {
      setSaving(true);

      await http.post(`/Ocupacion/${ocupacion.id}/finalizar`);

      toast.success("Ocupación finalizada");
      await cargar();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No se pudo finalizar");
    } finally {
      setSaving(false);
    }
  }
  
  function abrirPago(ocupacion) {
    setOcupacionPago(ocupacion);
    setPagoMonto(String(ocupacion.saldo ?? ""));
    setPagoMetodo(1);
    setPagoComentario("");
    setOpenPago(true);
  }

  async function registrarPago() {
    if (!ocupacionPago?.id) return;

    const monto = Number(pagoMonto);

    if (!monto || monto <= 0) {
      return toast.error("Monto inválido");
    }

    try {
      setSaving(true);

     await http.post("/Pagos", {
      ocupacionId: ocupacionPago.id,
      monto,
      metodo: Number(pagoMetodo),
      referencia: pagoComentario.trim() || null,
     });
      
      toast.success("Pago registrado");
      setOpenPago(false);
      setOcupacionPago(null);
      await cargar();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No pude registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Ocupaciones
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Control de ocupaciones, vencimientos y saldos.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Button variant="contained" onClick={abrirCrear} sx={{ borderRadius: 2, fontWeight: 900 }}>
          Nueva ocupación
        </Button>

        <Button
          variant="outlined"
          onClick={cargar}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 800 }}
        >
          Refrescar
        </Button>
      </Stack>

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
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography fontWeight={900}>Filtros</Typography>
            <Button
              variant="outlined"
              onClick={cargar}
              disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Aplicar
            </Button>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              alignItems: "start",
            }}
          >
            <TextField
              select
              size="small"
              label="Estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              fullWidth
            >
              {ESTADOS.map((x) => (
                <MenuItem key={String(x.id)} value={x.id}>
                  {x.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Cochera"
              value={cocheraId}
              onChange={(e) => setCocheraId(e.target.value)}
              fullWidth
            />

            <Autocomplete
              options={filtroClienteOptions}
              value={filtroClienteSel}
              inputValue={filtroClienteInput}
              onInputChange={(e, v) => setFiltroClienteInput(v)}
              onChange={(e, v) => {
                setFiltroClienteSel(v);
                setClienteId(v?.id ? String(v.id) : "");
              }}
              loading={filtroClienteLoading}
              getOptionLabel={(opt) =>
                opt
                  ? `${opt.nombreCompleto ?? opt.nombre ?? ""} · CI: ${opt.documento ?? ""}`
                  : ""
              }
              isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filtrar por cliente"
                  placeholder="Nombre o CI..."
                  fullWidth
                />
              )}
            />

            <TextField
              size="small"
              label="Vence en días"
              value={venceEnDias}
              onChange={(e) => setVenceEnDias(e.target.value)}
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

            <TextField
              size="small"
              label="Take"
              value={take}
              onChange={(e) => setTake(Number(e.target.value) || 200)}
              fullWidth
            />
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingList />
      ) : (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            Resultados: <b>{resumen.total}</b>
            {resumen.vencidas ? ` · Vencidas: ${resumen.vencidas}` : ""}
          </Typography>

          {items.map((o) => (
            <Card
              key={o.id}
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
                  spacing={1.5}
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
                      <Typography sx={{ fontWeight: 900 }} noWrap>
                        Cochera #{o.cocheraNumero ?? o.cocheraId}
                      </Typography>

                      <EstadoChip estado={o.estadoCalculado ?? o.estado} />

                      <Chip
                        size="small"
                        label={`Tipo: ${tipoLabel(o.tipo)}`}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.25 }}>
                      Cliente: <b>{o.clienteNombre ?? o.clienteId}</b> · Inicio:{" "}
                      {fmtDate(o.inicio)} · Fin: {fmtDate(o.fin)}
                    </Typography>

                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      Total: <b>{money(o.precioTotal)}</b> · Pagado:{" "}
                      <b>{money(o.pagado)}</b> · Saldo: <b>{money(o.saldo)}</b>
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => toast(`Ocupación #${o.id}`)}
                      sx={{ borderRadius: 2, fontWeight: 800 }}
                    >
                      Ver
                    </Button>

                    {Number(o.saldo ?? 0) > 0 && Number(o.estado) !== 3 ? (
                      <Button
                        color="success"
                        variant="contained"
                        onClick={() => abrirPago(o)}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                      >
                        Registrar pago
                      </Button>
                    ) : null}

                    {Number(o.estado) === 1 &&
                    new Date(o.inicio) > new Date() ? (
                      <Button
                        color="error"
                        variant="contained"
                        onClick={() => abrirCancelar(o.id)}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                      >
                        Cancelar
                      </Button>
                    ) : null}

                   {[1, 2].includes(Number(o.estadoCalculado ?? o.estado)) &&
                    new Date(o.inicio) <= new Date() ? (
                      <Button
                        color="success"
                        variant="contained"
                        onClick={() => finalizarOcupacion(o)}
                        disabled={saving}
                        sx={{ borderRadius: 2, fontWeight: 900 }}
                      >
                        Finalizar
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

      <Dialog open={openCrear} onClose={() => setOpenCrear(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Nueva ocupación</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <TextField
                label="CocheraId"
                value={cCocheraId}
                onChange={(e) => setCCocheraId(e.target.value)}
                fullWidth
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
            </Box>

            <Autocomplete
              options={crearClienteOptions}
              value={crearClienteSel}
              inputValue={crearClienteInput}
              onInputChange={(e, v) => setCrearClienteInput(v)}
              onChange={(e, v) => setCrearClienteSel(v)}
              loading={crearClienteLoading}
              getOptionLabel={(opt) =>
                opt
                  ? `${opt.nombreCompleto ?? opt.nombre ?? ""} · CI: ${opt.documento ?? ""}`
                  : ""
              }
              isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente para la ocupación"
                  placeholder="Escribí las primeras letras..."
                  fullWidth
                />
              )}
            />

            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
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
            </Box>

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Chip
                label={usarExcep ? "Tarifa excepcional" : "Tarifa base"}
                variant="outlined"
                sx={{ fontWeight: 700, width: "fit-content" }}
              />

              <Button
                variant="outlined"
                onClick={() => setUsarExcep((v) => !v)}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                {usarExcep ? "Usar tarifa base" : "Usar tarifa excepcional"}
              </Button>
            </Stack>

            {usarExcep && (
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  label="Precio unitario excepcional"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  value={precioExcep}
                  onChange={(e) => setPrecioExcep(e.target.value)}
                  fullWidth
                />

                <TextField
                  label="Motivo"
                  value={motivoExcep}
                  onChange={(e) => setMotivoExcep(e.target.value)}
                  fullWidth
                />
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCrear(false)} sx={{ fontWeight: 800 }}>
            Cancelar
          </Button>

          <Button variant="contained" onClick={crear} disabled={saving} sx={{ fontWeight: 900 }}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCancelar} onClose={() => setOpenCancelar(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Cancelar ocupación</DialogTitle>

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
          <Button onClick={() => setOpenCancelar(false)} sx={{ fontWeight: 800 }}>
            Volver
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={cancelar}
            disabled={saving}
            sx={{ fontWeight: 900 }}
          >
            Cancelar ocupación
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPago} onClose={() => setOpenPago(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Registrar pago</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography>
              Ocupación #{ocupacionPago?.id} · Saldo pendiente:{" "}
              <b>{money(ocupacionPago?.saldo)}</b>
            </Typography>

            <TextField
              label="Monto"
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              value={pagoMonto}
              onChange={(e) => setPagoMonto(e.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Método de pago"
              value={pagoMetodo}
              onChange={(e) => setPagoMetodo(Number(e.target.value))}
              fullWidth
            >
              {METODOS_PAGO.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Comentario opcional"
              value={pagoComentario}
              onChange={(e) => setPagoComentario(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPago(false)} sx={{ fontWeight: 800 }}>
            Cancelar
          </Button>

          <Button
            color="success"
            variant="contained"
            onClick={registrarPago}
            disabled={saving}
            sx={{ fontWeight: 900 }}
          >
            Registrar pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}