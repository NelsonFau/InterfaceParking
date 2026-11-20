// Programar o cambiar la baja de un contrato mensual (spec 10, D-FJ6, D-FJ7). `fin` es un `LocalInput` en la
// zona del tenant que se convierte con `localInputToInstant`. El cliente no valida que el fin sea posterior a
// ahora, al inicio, ni el tope de 3 años ni los choques: son reglas del backend. Después de un éxito pide el
// detalle de nuevo para avisar si quedó saldo a favor (la respuesta del PUT no lo trae).
import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import toast from "react-hot-toast";
import { normalizeError, showApiError } from "../../api/errors";
import { getOcupacion, setOcupacionFin } from "../../api/ocupacionApi";
import {
  bajaAviso,
  contratoFieldErrors,
  shouldCloseActionAfterContrato,
  validateFin,
} from "../../utils/contratos";
import { useTenantDates } from "../../utils/useTenantDates";

/**
 * @param {{ ocupacion: { id: number, fin?: string | null }, vencido: boolean,
 *   can: (permiso: string) => boolean, onClose: () => void, onChanged: () => void }} props
 */
export default function ProgramarBajaDialog({ ocupacion, vencido, can, onClose, onChanged }) {
  const fullScreen = useDialogFullScreen();
  const { localInputToInstant, instantToInput, formatInstant } = useTenantDates();
  const conFin = Boolean(ocupacion.fin);
  const [fin, setFin] = useState(() => (ocupacion.fin ? instantToInput(ocupacion.fin) : ""));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(null);

  function cerrar() {
    if (resultado) onChanged();
    onClose();
  }

  async function enviar() {
    const r = validateFin({ fin }, { localInputToInstant });
    if (!r.ok) {
      // Hora inexistente por DST u otro error de conversión: se avisa y no se envía.
      if (fin.trim() !== "") toast.error(r.errors.fin);
      setError(r.errors.fin);
      return;
    }
    setError(null);
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      const resp = await setOcupacionFin(ocupacion.id, r.body);
      let aviso = null;
      try {
        // Un pedido extra que no rompe el éxito si falla.
        const detalle = await getOcupacion(ocupacion.id);
        aviso = bajaAviso(detalle?.saldoAFavor);
        if (aviso && !can("pagos.devolver")) aviso += " Avisá a un dueño.";
      } catch {
        aviso = null;
      }
      setResultado({ fin: resp?.fin ?? r.body.fin, aviso });
    } catch (e) {
      const err = normalizeError(e);
      showApiError(err);
      setError(contratoFieldErrors(err).fields.fin ?? null);
      if (shouldCloseActionAfterContrato(err.code)) {
        onChanged();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  if (resultado) {
    return (
      <Dialog open onClose={cerrar} fullWidth maxWidth="xs" fullScreen={fullScreen}>
        <DialogTitle>{conFin ? "Cambiar fecha de fin" : "Programar baja"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Alert severity="success">Baja programada</Alert>
            <Typography>Fin del contrato: {formatInstant(resultado.fin)}</Typography>
            {resultado.aviso ? <Alert severity="warning">{resultado.aviso}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="marron" onClick={cerrar}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>{conFin ? "Cambiar fecha de fin" : "Programar baja"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            El contrato deja de correr en esa fecha. Si lo ya pagado supera lo que corresponde hasta esa fecha, queda
            un saldo a favor para devolver.
          </Typography>
          {vencido ? <Alert severity="info">El contrato está vencido: una fecha futura lo extiende</Alert> : null}
          <TextField
            label="Fin del contrato"
            type="datetime-local"
            value={fin}
            onChange={(e) => {
              setFin(e.target.value);
              setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? "Fecha y hora en la zona del local"}
            slotProps={{ inputLabel: { shrink: true } }}
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Volver
        </Button>
        <Button variant="marron" onClick={enviar} disabled={saving}>
          {conFin ? "Guardar fecha" : "Programar baja"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
