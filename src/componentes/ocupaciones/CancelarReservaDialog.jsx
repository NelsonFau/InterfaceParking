// Cancelar una reserva (spec 07, D-FG17). Solo el motivo, obligatorio: `finReal` no se manda (el backend
// lo ignora). Si la reserva tiene pagos, avisa antes de confirmar que queda una devolución pendiente.
import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { showApiError } from "../../api/errors";
import { cancelOcupacion } from "../../api/ocupacionApi";
import { formatMoney } from "../../utils/formato";
import { MAX_MOTIVO, buildCancelBody, fieldErrorsFromApi } from "../../utils/ocupaciones";

const RECORDATORIO = "Quedó una devolución pendiente; registrala desde Pagos";

/**
 * @param {{ ocupacion: { id: number, cocheraNumero?: number, pagado?: number },
 *   onClose: () => void, onDone: (mensaje: string) => void, onError: (apiError: import("../../api/errors").ApiError) => void }} props
 */
export default function CancelarReservaDialog({ ocupacion, onClose, onDone, onError }) {
  const fullScreen = useDialogFullScreen();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const pagado = Number(ocupacion.pagado ?? 0);
  const conPagos = pagado > 0;

  async function enviar() {
    const r = buildCancelBody(motivo);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await cancelOcupacion(ocupacion.id, r.body);
      onDone(conPagos ? `Reserva cancelada. ${RECORDATORIO}` : "Reserva cancelada");
    } catch (e) {
      const err = showApiError(e);
      setError(fieldErrorsFromApi(err).fields.motivo ?? null);
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>Cancelar reserva</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Reserva #{ocupacion.id}
            {ocupacion.cocheraNumero != null ? ` · Cochera #${ocupacion.cocheraNumero}` : ""}. La cochera queda libre
            para ese horario.
          </Typography>

          {conPagos ? (
            <Alert severity="warning">
              Tiene {formatMoney(pagado)} pagados. Al cancelar queda una devolución pendiente; se registra desde Pagos.
            </Alert>
          ) : null}

          <TextField
            label="Motivo"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? `${motivo.length}/${MAX_MOTIVO}`}
            multiline
            minRows={2}
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Volver
        </Button>
        <Button color="error" variant="contained" onClick={enviar} disabled={saving}>
          Cancelar reserva
        </Button>
      </DialogActions>
    </Dialog>
  );
}
