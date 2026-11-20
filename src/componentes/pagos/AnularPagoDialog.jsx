// Anular un pago (spec 08, D-FH7). Pide solo el motivo, muestra el pago y avisa lo que el cliente puede decir
// sin inventar reglas: el pago deja de contar en la cuenta, una ocupación finalizada va a quedar con saldo
// y, como el cliente no sabe si el pago es de otra sesión de caja (el backend no lo manda), una nota fija.
// Después de un error el diálogo conserva el motivo escrito y el reintento es manual (una escritura no es
// idempotente). `sin_permiso` (403) y `anulacion_requiere_dueno` solo muestran el `title` y quedan abiertos.
import { useState } from "react";
import toast from "react-hot-toast";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { showApiError } from "../../api/errors";
import { anularPago } from "../../api/pagosApi";
import { MetodoPago, labelOf } from "../../constants/enums";
import { formatMoney } from "../../utils/formato";
import { fieldErrorsFromApi } from "../../utils/ocupaciones";
import {
  NOTA_OTRA_SESION,
  anulacionAviso,
  buildAnularBody,
  shouldCloseActionAfterPago,
  shouldReloadAfterPago,
} from "../../utils/pagos";

/**
 * @param {{ pago: import("../../api/pagosApi").PagoResponse, ocupacion?: object | null,
 *   onClose: () => void, onChanged?: () => void,
 *   onError?: (apiError: import("../../api/errors").ApiError) => void }} props
 *   `ocupacion` es opcional: sin ella no hay aviso de ocupación finalizada. `onChanged` pide recargar
 *   (lista, detalle del pago y de la ocupación); `onError` deja que quien lo abrió cierre su detalle.
 */
export default function AnularPagoDialog({ pago, ocupacion, onClose, onChanged, onError }) {
  const fullScreen = useDialogFullScreen();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const aviso = anulacionAviso(ocupacion);

  async function enviar() {
    const r = buildAnularBody(motivo);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await anularPago(pago.id, r.body);
      toast.success("Pago anulado");
      onChanged?.();
      onClose();
    } catch (e) {
      const err = showApiError(e);
      const campo = fieldErrorsFromApi(err).fields.motivo;
      if (campo) setError(campo);
      if (shouldReloadAfterPago(err.code)) onChanged?.();
      if (shouldCloseActionAfterPago(err.code)) onClose();
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>Anular pago</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Pago #{pago.id} · <b>{formatMoney(pago.monto)}</b> · {labelOf(MetodoPago, pago.metodo)}
          </Typography>

          <Alert severity="warning">Al anular, el pago deja de contar en la cuenta de la ocupación.</Alert>
          {aviso ? <Alert severity="warning">{aviso}</Alert> : null}
          <Alert severity="info">{NOTA_OTRA_SESION}</Alert>

          <TextField
            label="Motivo"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? `${motivo.trim().length}/250`}
            multiline
            minRows={2}
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button color="error" variant="contained" onClick={enviar} disabled={saving}>
          Anular pago
        </Button>
      </DialogActions>
    </Dialog>
  );
}
