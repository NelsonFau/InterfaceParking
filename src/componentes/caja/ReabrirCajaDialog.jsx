// Reabrir una sesión cerrada (spec 09, D-FI8). Pide solo el motivo. El cliente NO decide si la sesión es "la
// última cerrada" (`caja_no_es_la_ultima`) ni oculta nada por el modo o el día: lo decide el backend. Avisa antes
// de confirmar lo que pasa en DIARIA con una caja de un día anterior.
import { useState } from "react";
import toast from "react-hot-toast";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { reopenCaja } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { ModoCaja } from "../../constants/enums";
import { buildReabrirBody, cajaFieldErrors, shouldCloseActionAfterCaja, shouldReloadAfterCaja } from "../../utils/caja";

const AVISO_REABRIR_DIARIA =
  "En modo diario, mientras esta caja de un día anterior esté abierta no se puede cobrar; cerrala cuando termines";
const AVISO_REABRIR_TURNO = "La caja vuelve a quedar abierta y hay que cerrarla de nuevo";

/**
 * @param {{ sesion: { id: number }, modo?: number, onClose: () => void, onChanged?: () => void,
 *   onError?: (apiError: import("../../api/errors").ApiError) => void }} props
 *   `modo` solo elige el texto del aviso. `onChanged` pide recargar (detalle y caja actual); `onError` deja
 *   que quien lo abrió cierre su detalle (404).
 */
export default function ReabrirCajaDialog({ sesion, modo, onClose, onChanged, onError }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function enviar() {
    const r = buildReabrirBody(motivo);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await reopenCaja(sesion.id, r.body);
      toast.success("Caja reabierta");
      onChanged?.();
      onClose();
    } catch (e) {
      const err = showApiError(e);
      const campo = cajaFieldErrors(err).fields.motivo;
      if (campo) setError(campo);
      if (shouldReloadAfterCaja(err.code)) onChanged?.();
      if (shouldCloseActionAfterCaja(err.code)) onClose();
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reabrir caja</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>Caja #{sesion.id}</Typography>
          <Alert severity="warning">{modo === ModoCaja.DIARIA ? AVISO_REABRIR_DIARIA : AVISO_REABRIR_TURNO}</Alert>
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
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button color="warning" variant="contained" onClick={enviar} disabled={saving} sx={{ fontWeight: 900 }}>
          Reabrir caja
        </Button>
      </DialogActions>
    </Dialog>
  );
}
