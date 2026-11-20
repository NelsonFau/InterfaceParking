// Registrar una devolución (spec 08, D-FH6). Un solo diálogo con dos puntos de entrada: el saldo a favor de la
// ocupación (sin `pagoId`: se elige el pago entre los devolvibles) y "Devolver" en el detalle de un pago (con
// `pagoId`: ese pago, sin selector). La devolución es POR PAGO. El saldo a favor solo sugiere el monto: el
// límite lo pone el backend contra lo que queda por devolver del pago (`devolucion_supera_pago`), así que el
// cliente avisa pero no bloquea (D-FH11). Después de cada devolución se vuelve a pedir la ocupación: si el saldo
// a favor sigue siendo mayor que 0 se ofrece "Registrar otra devolución". Las cifras las calcula el backend.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { showApiError } from "../../api/errors";
import { getOcupacion } from "../../api/ocupacionApi";
import { createDevolucion, getPago, listPagosByOcupacion } from "../../api/pagosApi";
import { MetodoPago, labelOf, optionsOf } from "../../constants/enums";
import { formatMoney } from "../../utils/formato";
import { fieldErrorsFromApi } from "../../utils/ocupaciones";
import {
  devolucionAviso,
  devolvible,
  elegirPagoParaDevolver,
  montoInicialDevolucion,
  pagoErrorField,
  pagosDevolvibles,
  shouldCloseActionAfterPago,
  shouldReloadAfterPago,
  validateDevolucion,
} from "../../utils/pagos";
import { useTenantDates } from "../../utils/useTenantDates";

const METODO_OPTIONS = optionsOf(MetodoPago);

// Pagos y ocupación frescos. La ocupación es solo para conocer el saldo a favor (aviso y precarga): si su
// carga falla no es un error del diálogo (queda en `null`, sin aviso). Los pagos sí son imprescindibles.
async function fetchData(ocupacionId, pagoId) {
  const ocupacionPedida = getOcupacion(ocupacionId).catch(() => null);
  const pagos = pagoId != null ? [await getPago(pagoId)] : await listPagosByOcupacion(ocupacionId);
  return { pagos, ocupacion: await ocupacionPedida };
}

// Formulario con el pago propuesto (o el único) y el monto y el método precargados. Sin motivo.
function formDesde({ pagos, ocupacion }, pagoFijo) {
  const saldo = ocupacion?.saldoAFavor ?? null;
  const elegido = pagoFijo ? (pagos[0] ?? null) : elegirPagoParaDevolver(pagos, saldo);
  return {
    pagoSel: elegido ? String(elegido.id) : "",
    monto: elegido ? montoInicialDevolucion(elegido, saldo) : "",
    metodo: elegido ? elegido.metodo : MetodoPago.EFECTIVO,
    motivo: "",
  };
}

/**
 * @param {{ ocupacionId: number, pagoId?: number | null, onClose: () => void, onChanged?: () => void,
 *   onError?: (apiError: import("../../api/errors").ApiError) => void }} props
 *   Con `pagoId` se devuelve ese pago; sin él, se elige entre los de la ocupación. `onChanged` pide recargar a
 *   quien lo abrió (después de escribir, o de un error por estado viejo); `onError` le deja cerrar su detalle.
 */
export default function DevolucionDialog({ ocupacionId, pagoId = null, onClose, onChanged, onError }) {
  const fullScreen = useDialogFullScreen();
  const { formatInstant } = useTenantDates();
  const pagoFijo = pagoId != null;
  const [data, setData] = useState(null); // { pagos, ocupacion }
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [form, setForm] = useState({ pagoSel: "", monto: "", metodo: MetodoPago.EFECTIVO, motivo: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  // Tras una devolución que deja saldo a favor: `{ restante }`, hasta que se elige "Registrar otra".
  const [exito, setExito] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const d = await fetchData(ocupacionId, pagoId);
        if (ignore) return;
        setData(d);
        setForm(formDesde(d, pagoId != null));
        setLoadError(false);
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setLoadError(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [ocupacionId, pagoId, retryKey]);

  const pagos = data?.pagos ?? [];
  const saldoAFavor = data?.ocupacion ? data.ocupacion.saldoAFavor : null;
  const pagoActual = pagos.find((p) => String(p.id) === form.pagoSel) ?? null;
  const devolvibles = pagosDevolvibles(pagos);
  const opciones = pagoActual && !devolvibles.includes(pagoActual) ? [...devolvibles, pagoActual] : devolvibles;
  const hayQueDevolver = devolvibles.length > 0;
  const aviso = data?.ocupacion ? devolucionAviso(form.monto, saldoAFavor) : null;

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrors((x) => ({ ...x, [campo]: undefined }));
  }

  // Elegir otro pago vuelve a proponer monto y método (el motivo escrito se conserva).
  function elegirPago(id) {
    const p = pagos.find((x) => String(x.id) === id);
    setForm((f) => ({
      ...f,
      pagoSel: id,
      monto: p ? montoInicialDevolucion(p, saldoAFavor) : f.monto,
      metodo: p ? p.metodo : f.metodo,
    }));
    setErrors((x) => ({ ...x, pagoId: undefined, monto: undefined, metodo: undefined }));
  }

  // Vuelve a pedir los datos sin tocar lo escrito (después de `devolucion_supera_pago`).
  async function recargarSinTocarForm() {
    try {
      setData(await fetchData(ocupacionId, pagoId));
    } catch {
      // Si no se pudo, queda lo que había: el backend vuelve a decir lo que corresponda al reintentar.
    }
  }

  async function enviar() {
    const r = validateDevolucion(
      { monto: form.monto, metodo: form.metodo, motivo: form.motivo, pagoId: form.pagoSel },
      { requirePago: true },
    );
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await createDevolucion(r.pagoId, r.body);
    } catch (e) {
      const err = showApiError(e);
      const campos = fieldErrorsFromApi(err).fields;
      const metodoApi = err.errors?.Metodo;
      if (metodoApi) campos.metodo = Array.isArray(metodoApi) ? metodoApi[0] : String(metodoApi);
      const marcado = pagoErrorField(err.code);
      if (marcado && !campos[marcado]) campos[marcado] = err.message;
      setErrors(campos);
      if (shouldReloadAfterPago(err.code)) {
        onChanged?.();
        if (!shouldCloseActionAfterPago(err.code)) await recargarSinTocarForm();
      }
      if (shouldCloseActionAfterPago(err.code)) onClose();
      onError?.(err);
      setSaving(false);
      return;
    }

    toast.success("Devolución registrada");
    onChanged?.();
    // Recarga: si queda saldo a favor, se ofrece otra devolución; si no (o no se pudo saber), se cierra.
    let nuevo = null;
    try {
      nuevo = await fetchData(ocupacionId, pagoId);
    } catch {
      nuevo = null;
    }
    const restante = Number(nuevo?.ocupacion?.saldoAFavor ?? 0);
    if (nuevo && restante > 0) {
      setData(nuevo);
      setForm(formDesde(nuevo, pagoFijo));
      setExito({ restante });
      setSaving(false);
    } else {
      onClose();
    }
  }

  let cuerpo;
  if (exito) {
    cuerpo = (
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Alert severity="success">Devolución registrada.</Alert>
        <Alert severity="info">Queda {formatMoney(exito.restante)} de saldo a favor por devolver.</Alert>
        {hayQueDevolver ? null : (
          <Typography variant="body2" color="text.secondary">
            No quedan pagos con importe para devolver.
          </Typography>
        )}
      </Stack>
    );
  } else if (data) {
    cuerpo = (
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
          <Typography>Ocupación #{ocupacionId}</Typography>
          {data.ocupacion && Number(saldoAFavor) > 0 ? (
            <Chip size="small" color="warning" label={`Saldo a favor ${formatMoney(saldoAFavor)}`} />
          ) : null}
        </Stack>

        {hayQueDevolver || pagoActual ? null : <Alert severity="info">No hay pagos con importe para devolver.</Alert>}
        {pagoFijo && pagoActual && !hayQueDevolver ? (
          <Alert severity="info">Este pago no tiene nada para devolver.</Alert>
        ) : null}

        {pagoFijo ? (
          pagoActual ? (
            <Typography variant="body2">
              Pago #{pagoActual.id} · {formatInstant(pagoActual.fechaPago)} · {labelOf(MetodoPago, pagoActual.metodo)} ·{" "}
              {formatMoney(pagoActual.monto)} · Se puede devolver <b>{formatMoney(devolvible(pagoActual))}</b>
            </Typography>
          ) : null
        ) : hayQueDevolver ? (
          <TextField
            select
            label="Pago a devolver"
            value={form.pagoSel}
            onChange={(e) => elegirPago(e.target.value)}
            error={Boolean(errors.pagoId)}
            helperText={errors.pagoId}
            fullWidth
          >
            {opciones.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                #{p.id} · {formatInstant(p.fechaPago)} · {labelOf(MetodoPago, p.metodo)} · {formatMoney(p.monto)} (se puede
                devolver {formatMoney(devolvible(p))})
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {hayQueDevolver ? (
          <>
            <TextField
              label="Monto"
              value={form.monto}
              onChange={(e) => cambiar("monto", e.target.value)}
              error={Boolean(errors.monto)}
              helperText={errors.monto ?? "Hasta 2 decimales"}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
              fullWidth
            />

            <TextField
              select
              label="Método"
              value={form.metodo}
              onChange={(e) => cambiar("metodo", Number(e.target.value))}
              error={Boolean(errors.metodo)}
              helperText={errors.metodo}
              fullWidth
            >
              {METODO_OPTIONS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Motivo"
              value={form.motivo}
              onChange={(e) => cambiar("motivo", e.target.value)}
              error={Boolean(errors.motivo)}
              helperText={errors.motivo ?? `${form.motivo.trim().length}/250`}
              multiline
              minRows={2}
              fullWidth
            />

            {aviso ? <Alert severity="warning">{aviso}</Alert> : null}
          </>
        ) : null}
      </Stack>
    );
  } else if (loadError) {
    cuerpo = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => setRetryKey((k) => k + 1)}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar los pagos.
      </Alert>
    );
  } else {
    cuerpo = (
      <Stack spacing={1.5} sx={{ pt: 1 }}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
      </Stack>
    );
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Registrar devolución</DialogTitle>
      <DialogContent dividers>{cuerpo}</DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          {exito ? "Cerrar" : "Cancelar"}
        </Button>
        {exito && hayQueDevolver ? (
          <Button variant="marron" onClick={() => setExito(null)}>
            Registrar otra devolución
          </Button>
        ) : null}
        {!exito && data && hayQueDevolver ? (
          <Button color="warning" variant="contained" onClick={enviar} disabled={saving}>
            Registrar devolución
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
