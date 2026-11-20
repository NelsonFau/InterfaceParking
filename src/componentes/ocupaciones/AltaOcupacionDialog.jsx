// Alta de ocupación (spec 07, D-FG16): un solo diálogo para la ocupación abierta, la cerrada, la futura
// (reserva), la retroactiva y la de tarifa excepcional. El modo se deriva de lo cargado. La cochera se
// elige entre las DISPONIBLES para el horario (se vuelve a pedir con 400 ms de espera cuando cambian
// inicio, fin o "sin hora de fin"). El cliente NO valida tolerancia, tope de pasado, techo de futuro ni
// duración máxima (D-FG9): el backend contesta con su `title` y el campo marcado.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { listCocherasDisponibles } from "../../api/cocheraApi";
import { showApiError } from "../../api/errors";
import { createOcupacion } from "../../api/ocupacionApi";
import { usePermissions } from "../../auth/usePermissions";
import { TipoOcupacion, optionsOf } from "../../constants/enums";
import {
  MAX_MOTIVO,
  altaErrorField,
  altaModo,
  defaultAltaForm,
  defaultSinFin,
  disponiblesRange,
  fieldErrorsFromApi,
  showMotivoRetroactivo,
  validateAltaForm,
} from "../../utils/ocupaciones";
import { useTenantDates } from "../../utils/useTenantDates";
import ClienteAutocomplete from "../ClienteAutocomplete";
import { useDialogFullScreen } from "../useDialogFullScreen";

const TIPO_OPTIONS = optionsOf(TipoOcupacion);
const DISPONIBLES_DEBOUNCE_MS = 400;
const TICK_MS = 30_000;

/**
 * @param {{ onClose: () => void, onDone: (mensaje: string) => void,
 *   onError: (apiError: import("../../api/errors").ApiError) => void }} props
 */
export default function AltaOcupacionDialog({ onClose, onDone, onError }) {
  const { can } = usePermissions();
  const { timeZone, localInputToInstant, formatInstant } = useTenantDates();
  const fullScreen = useDialogFullScreen();

  // El reloj del diálogo: decide si el inicio es futuro o retroactivo. Entra como parámetro a la lógica pura.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [form, setForm] = useState(() => defaultAltaForm({ timeZone, now: new Date() }));
  // Errores por campo: del cliente (validateAltaForm) o del backend (errors + código).
  const [errors, setErrors] = useState({});
  const [lastCode, setLastCode] = useState(null);
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function changeTipo(tipo) {
    setForm((f) => ({ ...f, tipo, sinFin: f.sinFinTocado ? f.sinFin : defaultSinFin(tipo) }));
    setErrors((e) => ({ ...e, tipo: undefined, fin: undefined }));
  }

  function changeSinFin(sinFin) {
    setForm((f) => ({ ...f, sinFin, sinFinTocado: true }));
    setErrors((e) => ({ ...e, fin: undefined }));
  }

  // --- Cocheras disponibles -------------------------------------------------------------------
  const range = useMemo(
    () => disponiblesRange({ inicio: form.inicio, fin: form.fin, sinFin: form.sinFin }, timeZone),
    [form.inicio, form.fin, form.sinFin, timeZone],
  );
  const desde = range?.desde ?? null;
  const hasta = range?.hasta ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = desde ? `${desde}|${hasta}|${reloadKey}` : null;
  // Última respuesta: `{ key, items, failed }`.
  const [disponibles, setDisponibles] = useState({ key: null, items: [], failed: false });
  const [cocheraNotice, setCocheraNotice] = useState("");
  const cocheraRef = useRef(form.cocheraId);
  useEffect(() => {
    cocheraRef.current = form.cocheraId;
  }, [form.cocheraId]);

  useEffect(() => {
    if (!requestKey) return undefined;
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const items = await listCocherasDisponibles({ desde, hasta });
        if (ignore) return;
        setDisponibles({ key: requestKey, items, failed: false });
        // Si la elegida dejó de estar disponible, se limpia y se avisa.
        const elegida = cocheraRef.current;
        if (elegida !== "" && !items.some((c) => String(c.id) === String(elegida))) {
          setForm((f) => ({ ...f, cocheraId: "" }));
          setCocheraNotice("La cochera elegida ya no está disponible para ese horario. Elegí otra.");
        }
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setDisponibles({ key: requestKey, items: [], failed: true });
      }
    }, DISPONIBLES_DEBOUNCE_MS);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [requestKey, desde, hasta]);

  const loadingDisponibles = requestKey !== null && disponibles.key !== requestKey;
  const sinCocheras = requestKey !== null && !loadingDisponibles && !disponibles.failed && disponibles.items.length === 0;

  // --- Derivados de lo cargado ----------------------------------------------------------------
  const modo = altaModo(form, { timeZone, now });
  const inicioInstant = localInputToInstant(form.inicio);
  const finInstant = localInputToInstant(form.fin);
  const inicioTxt = inicioInstant.ok && inicioInstant.instant ? formatInstant(inicioInstant.instant) : "";
  const finTxt = finInstant.ok && finInstant.instant ? formatInstant(finInstant.instant) : "";
  let etiqueta = "";
  if (modo === "reserva") etiqueta = `Reserva: empieza el ${inicioTxt}`;
  else if (modo === "abierta") etiqueta = `Ocupación abierta desde ${inicioTxt}`;
  else if (modo === "cerrada") etiqueta = finTxt ? `Ocupación del ${inicioTxt} al ${finTxt}` : "";

  const puedeExcepcional = can("ocupaciones.tarifa_excepcional");
  const mostrarRetroactivo = showMotivoRetroactivo(form, { timeZone, now, can, fieldErrors: errors });

  async function enviar() {
    const v = validateAltaForm(form, { timeZone, can });
    if (!v.ok) {
      setErrors(v.errors);
      setLastCode(null);
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await createOcupacion(v.body);
      onDone("Ocupación creada");
    } catch (e) {
      const err = showApiError(e);
      const next = { ...fieldErrorsFromApi(err).fields };
      const marcado = altaErrorField(err.code, form);
      if (marcado) next[marcado] = err.message;
      setErrors(next);
      setLastCode(err.code ?? null);
      // Otro usuario ocupó o bloqueó la cochera: se vuelve a pedir la lista de disponibles.
      if (err.code === "cochera_no_disponible" || err.code === "cochera_bloqueada") {
        setReloadKey((k) => k + 1);
        setForm((f) => ({ ...f, cocheraId: "" }));
      }
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  const tipoAyuda = errors.tipo ? (
    <>
      {errors.tipo}
      {lastCode === "tarifa_no_configurada" && can("tarifas.ver") ? (
        <>
          {" "}
          <RouterLink to="/tarifas">Ver tarifas</RouterLink>
        </>
      ) : null}
    </>
  ) : undefined;

  let cocheraAyuda = errors.cocheraId ?? cocheraNotice;
  if (!cocheraAyuda) {
    if (requestKey === null) cocheraAyuda = "Completá el inicio y el fin para ver las cocheras disponibles";
    else if (loadingDisponibles) cocheraAyuda = "Buscando cocheras disponibles...";
    else if (disponibles.failed) cocheraAyuda = "No pudimos cargar las cocheras disponibles";
    else if (sinCocheras) cocheraAyuda = "No hay cocheras disponibles para ese horario";
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Nueva ocupación</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              select
              label="Tipo"
              value={form.tipo}
              onChange={(e) => changeTipo(Number(e.target.value))}
              error={Boolean(errors.tipo)}
              helperText={tipoAyuda}
              fullWidth
            >
              {TIPO_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

            <ClienteAutocomplete
              label="Cliente"
              placeholder="Escribí las primeras letras..."
              value={form.cliente}
              onChange={(c) => setField("cliente", c)}
              error={Boolean(errors.cliente)}
              helperText={errors.cliente}
            />
          </Box>

          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              label="Inicio"
              type="datetime-local"
              value={form.inicio}
              onChange={(e) => setField("inicio", e.target.value)}
              error={Boolean(errors.inicio)}
              helperText={errors.inicio}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            {form.sinFin ? null : (
              <TextField
                label="Fin"
                type="datetime-local"
                value={form.fin}
                onChange={(e) => setField("fin", e.target.value)}
                error={Boolean(errors.fin)}
                helperText={errors.fin}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            )}
          </Box>

          <FormControlLabel
            control={<Checkbox checked={form.sinFin} onChange={(e) => changeSinFin(e.target.checked)} />}
            label="Sin hora de fin"
          />

          {etiqueta ? <Alert severity="info">{etiqueta}</Alert> : null}

          {mostrarRetroactivo ? (
            <TextField
              label="Motivo del inicio retroactivo"
              value={form.motivoRetroactivo}
              onChange={(e) => setField("motivoRetroactivo", e.target.value)}
              error={Boolean(errors.motivoRetroactivo)}
              helperText={
                errors.motivoRetroactivo ??
                `Obligatorio si el inicio supera la tolerancia del local · ${form.motivoRetroactivo.length}/${MAX_MOTIVO}`
              }
              multiline
              minRows={2}
              fullWidth
            />
          ) : null}

          <TextField
            select
            label="Cochera"
            value={form.cocheraId}
            onChange={(e) => {
              setField("cocheraId", e.target.value);
              setCocheraNotice("");
            }}
            disabled={requestKey === null || sinCocheras}
            error={Boolean(errors.cocheraId)}
            helperText={cocheraAyuda}
            fullWidth
          >
            {disponibles.items.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                Cochera #{c.numero}
              </MenuItem>
            ))}
          </TextField>

          {puedeExcepcional ? (
            <Box>
              <FormControlLabel
                control={
                  <Switch checked={form.excepcional} onChange={(e) => setField("excepcional", e.target.checked)} />
                }
                label="Tarifa excepcional"
              />
              {errors.excepcional ? <FormHelperText error>{errors.excepcional}</FormHelperText> : null}
            </Box>
          ) : null}

          {puedeExcepcional && form.excepcional ? (
            <Stack spacing={1.5}>
              <TextField
                label="Precio unitario"
                value={form.precio}
                onChange={(e) => setField("precio", e.target.value)}
                error={Boolean(errors.precio)}
                helperText={errors.precio ?? "Hasta 2 decimales"}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
                fullWidth
              />
              <TextField
                label="Motivo de la tarifa excepcional"
                value={form.motivoExcepcional}
                onChange={(e) => setField("motivoExcepcional", e.target.value)}
                error={Boolean(errors.motivoExcepcional)}
                helperText={errors.motivoExcepcional ?? `${form.motivoExcepcional.length}/${MAX_MOTIVO}`}
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          ) : null}

          <Typography variant="caption" color="text.secondary">
            El total se calcula al finalizar; el tope de cobro lo calcula el sistema.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={enviar} disabled={saving}>
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
