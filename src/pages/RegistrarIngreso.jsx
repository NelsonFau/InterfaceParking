// Registrar ingreso (`/registrar-ingreso`, guía visual 2): flujo rápido de alta de ocupaciones. Usa `createOcupacion`
// y las mismas validaciones que el alta de Ocupaciones (`validateAltaForm`, `disponiblesRange`...). Se omiten el
// vehículo (PB-25), el cliente ocasional (PB-26), el abono semanal (PB-27) y las zonas (PB-28). Reservas,
// retroactivas y tarifa excepcional se siguen haciendo desde "Nueva ocupación".
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Avatar, Box, Button, Card, CardActionArea, Chip, Divider, Stack, Typography } from "@mui/material";
import { listCocherasDisponibles } from "../api/cocheraApi";
import { showApiError } from "../api/errors";
import { createOcupacion } from "../api/ocupacionApi";
import { listTarifasVigentes } from "../api/tarifaApi";
import { usePermissions } from "../auth/usePermissions";
import { OCUPACIONES_PATH } from "../auth/routes";
import ClienteAutocomplete from "../componentes/ClienteAutocomplete";
import BotonConMotivo from "../componentes/ui/BotonConMotivo";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Segmentado from "../componentes/ui/Segmentado";
import Tarjeta from "../componentes/ui/Tarjeta";
import { TipoOcupacion, labelOf } from "../constants/enums";
import { formatMoney } from "../utils/formato";
import { defaultAltaForm, disponiblesRange, fieldErrorsFromApi, validateAltaForm } from "../utils/ocupaciones";
import {
  REGISTRO,
  buildFormRegistro,
  joinFechaHora,
  motivoConfirmarIngreso,
  reglaDeCobro,
  splitInicio,
} from "../utils/registrarIngreso";
import { useTenantDates } from "../utils/useTenantDates";

const DEBOUNCE_MS = 400;
const TIPOS_RAPIDO = [
  { value: TipoOcupacion.HORA, label: "Hora" },
  { value: TipoOcupacion.DIA, label: "Día" },
];

// Número de paso: círculo marrón (colores del tema).
function Paso({ n, titulo, subtitulo, children, sx }) {
  return (
    <Tarjeta sx={sx}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Avatar sx={{ width: 32, height: 32, fontSize: "1rem", bgcolor: "pc.brown", color: "pc.onBrown" }}>{n}</Avatar>
        <Box>
          <Typography variant="h6" component="h2">
            {titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitulo}
          </Typography>
        </Box>
      </Stack>
      {children}
    </Tarjeta>
  );
}

function OpcionRegistro({ titulo, texto, activo, onClick }) {
  return (
    <Card sx={activo ? { bgcolor: "pc.sand.bg", borderColor: "pc.brown" } : undefined}>
      <CardActionArea onClick={onClick} aria-pressed={activo} sx={{ p: 2 }}>
        <Typography variant="subtitle1">{titulo}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {texto}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

function Fila({ clave, valor }) {
  return (
    <>
      <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
        <Typography variant="body2" color="text.secondary">
          {clave}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "right" }}>
          {valor || "—"}
        </Typography>
      </Stack>
      <Divider />
    </>
  );
}

export default function RegistrarIngreso() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { timeZone, localInputToInstant, formatInstant } = useTenantDates();

  const [registro, setRegistro] = useState(REGISTRO.RAPIDO);
  const [tipoRapido, setTipoRapido] = useState(TipoOcupacion.HORA);
  const [cliente, setCliente] = useState(null);
  const [cocheraId, setCocheraId] = useState("");
  // El valor por defecto de "Fecha y hora de ingreso" es "ahora" en la zona del tenant.
  const [inicio, setInicio] = useState(() => defaultAltaForm({ timeZone, now: new Date() }).inicio);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const form = useMemo(
    () => buildFormRegistro({ registro, tipoRapido, cliente, cocheraId, inicio }),
    [registro, tipoRapido, cliente, cocheraId, inicio],
  );
  const tipo = form.tipo;

  // --- Tarifa vigente del tipo (precio por unidad) -------------------------------------------------
  const [tarifas, setTarifas] = useState(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listTarifasVigentes();
        if (!ignore) setTarifas(data);
      } catch (e) {
        if (!ignore) {
          setTarifas([]);
          showApiError(e);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);
  const precio = tarifas?.find((t) => t.tipo === tipo)?.vigente?.precio ?? null;

  // --- Cocheras disponibles para el horario (mismo pedido que el alta) ------------------------------
  const range = useMemo(() => disponiblesRange(form, timeZone), [form, timeZone]);
  const desde = range?.desde ?? null;
  const hasta = range?.hasta ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = desde ? `${desde}|${hasta}|${reloadKey}` : null;
  const [disponibles, setDisponibles] = useState({ key: null, items: [], failed: false });

  useEffect(() => {
    if (!requestKey) return undefined;
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const items = await listCocherasDisponibles({ desde, hasta });
        if (ignore) return;
        setDisponibles({ key: requestKey, items, failed: false });
        setCocheraId((actual) => (actual !== "" && !items.some((c) => String(c.id) === String(actual)) ? "" : actual));
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setDisponibles({ key: requestKey, items: [], failed: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [requestKey, desde, hasta]);

  const cargandoCocheras = requestKey !== null && disponibles.key !== requestKey;
  const libres = disponibles.items;
  const cocheraElegida = libres.find((c) => String(c.id) === String(cocheraId));

  const { fecha, hora } = splitInicio(inicio);
  const inicioInstant = localInputToInstant(inicio);
  const inicioTxt = inicioInstant.ok && inicioInstant.instant ? formatInstant(inicioInstant.instant) : "";
  const motivoConfirmar = motivoConfirmarIngreso({ cliente, cocheraId, inicio });

  async function confirmar() {
    const v = validateAltaForm(form, { timeZone, can });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await createOcupacion(v.body);
      toast.success("Ocupación creada");
      navigate(OCUPACIONES_PATH);
    } catch (e) {
      const err = showApiError(e);
      setErrors({ ...fieldErrorsFromApi(err).fields });
      if (err.code === "cochera_no_disponible" || err.code === "cochera_bloqueada") {
        setReloadKey((k) => k + 1);
        setCocheraId("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <EncabezadoPagina titulo="Registrar ingreso" subtitulo="Ingreso rápido por hora o por día, o abono mensual." />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, alignItems: "start" }}>
        <Paso n={1} titulo="Tipo de registro" subtitulo="Elegí cómo ingresa el vehículo. Cambia los datos que se piden.">
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
            <OpcionRegistro
              titulo="Ingreso rápido"
              texto="Por hora o por día. Se cobra al salir."
              activo={registro === REGISTRO.RAPIDO}
              onClick={() => setRegistro(REGISTRO.RAPIDO)}
            />
            <OpcionRegistro
              titulo="Abono"
              texto="Mensual. Requiere un cliente registrado. Se cobra por adelantado."
              activo={registro === REGISTRO.ABONO}
              onClick={() => setRegistro(REGISTRO.ABONO)}
            />
          </Box>
        </Paso>

        <Paso n={2} titulo="Cliente" subtitulo="Elegí un cliente habitual.">
          <ClienteAutocomplete
            label="Cliente habitual"
            placeholder="Escribí las primeras letras..."
            value={cliente}
            onChange={setCliente}
            error={Boolean(errors.cliente)}
            helperText={errors.cliente}
          />
        </Paso>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" }, alignItems: "start", mt: 2 }}>
        <Paso
          n={3}
          titulo="Espacio"
          subtitulo={cargandoCocheras ? "Buscando cocheras..." : `${libres.length} ${libres.length === 1 ? "libre" : "libres"}`}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Cocheras
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          {requestKey === null ? (
            <Typography variant="body2" color="text.secondary">
              Completá la fecha y la hora de ingreso para ver las cocheras libres.
            </Typography>
          ) : disponibles.failed ? (
            <Typography variant="body2" color="text.secondary">
              No pudimos cargar las cocheras disponibles.
            </Typography>
          ) : libres.length === 0 && !cargandoCocheras ? (
            <Typography variant="body2" color="text.secondary">
              No hay cocheras disponibles para ese horario.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {libres.map((c) => {
                const elegida = String(c.id) === String(cocheraId);
                return (
                  <Chip
                    key={c.id}
                    color="success"
                    clickable
                    label={`#${c.numero}`}
                    aria-pressed={elegida}
                    onClick={() => setCocheraId(String(c.id))}
                    sx={elegida ? { bgcolor: "success.main", color: "success.contrastText" } : undefined}
                  />
                );
              })}
            </Stack>
          )}
          {errors.cocheraId ? (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {errors.cocheraId}
            </Typography>
          ) : null}
        </Paso>

        <Paso n={4} titulo="Tarifa y horario" subtitulo={`${reglaDeCobro(registro).replace(/^./, (c) => c.toUpperCase())}.`}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "auto 1fr 1fr" }, alignItems: "end" }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 500 }}>
                Tarifa
              </Typography>
              {registro === REGISTRO.RAPIDO ? (
                <Segmentado value={tipoRapido} onChange={setTipoRapido} options={TIPOS_RAPIDO} ariaLabel="Tarifa" />
              ) : (
                <Typography>{labelOf(TipoOcupacion, TipoOcupacion.MES)}</Typography>
              )}
            </Box>
            <Campo
              label="Fecha de ingreso"
              type="date"
              value={fecha}
              onChange={(e) => setInicio(joinFechaHora(e.target.value, hora))}
              error={Boolean(errors.inicio)}
              helperText={errors.inicio}
            />
            <Campo
              label="Hora de ingreso"
              type="time"
              value={hora}
              onChange={(e) => setInicio(joinFechaHora(fecha, e.target.value))}
            />
          </Box>
        </Paso>
      </Box>

      <Tarjeta titulo="Resumen" sx={{ mt: 2 }}>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Box sx={{ bgcolor: "pc.sand.bg", border: 1, borderColor: "divider", p: 2.5 }}>
            <Typography variant="body2">Precio por unidad</Typography>
            <Typography variant="precio" component="div" sx={{ my: 0.5 }}>
              {tarifas === null ? "…" : formatMoney(precio)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reglaDeCobro(registro)}
            </Typography>
          </Box>

          <Box>
            <Fila clave="Registro" valor={registro === REGISTRO.ABONO ? "Abono" : "Ingreso rápido"} />
            <Fila clave="Cliente" valor={cliente?.nombreCompleto ?? cliente?.nombre} />
            <Fila clave="Espacio" valor={cocheraElegida ? `Cochera #${cocheraElegida.numero}` : ""} />
            <Fila clave="Tarifa" valor={labelOf(TipoOcupacion, tipo)} />
            <Fila clave="Ingreso" valor={inicioTxt} />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button variant="contorno" onClick={() => navigate(-1)} disabled={saving}>
            Cancelar
          </Button>
          <BotonConMotivo variant="marron" onClick={confirmar} ocupado={saving} motivo={motivoConfirmar}>
            Confirmar ingreso
          </BotonConMotivo>
        </Stack>
      </Tarjeta>
    </Box>
  );
}
