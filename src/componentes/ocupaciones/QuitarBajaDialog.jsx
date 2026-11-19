// Quitar la baja programada de un contrato mensual (spec 10, D-FJ6): `PUT .../fin` con `{ fin: null }`.
// Si otra ocupación ya tomó la cochera después del fin, el backend lo rechaza con `cochera_no_disponible`.
import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import toast from "react-hot-toast";
import { normalizeError, showApiError } from "../../api/errors";
import { setOcupacionFin } from "../../api/ocupacionApi";
import { buildQuitarBajaBody, contratoErrorOverride, shouldCloseActionAfterContrato } from "../../utils/contratos";

/**
 * @param {{ ocupacion: { id: number }, onClose: () => void, onChanged: () => void }} props
 */
export default function QuitarBajaDialog({ ocupacion, onClose, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [hecho, setHecho] = useState(false);

  function cerrar() {
    if (hecho) onChanged();
    onClose();
  }

  async function confirmar() {
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await setOcupacionFin(ocupacion.id, buildQuitarBajaBody());
      setHecho(true);
    } catch (e) {
      const err = normalizeError(e);
      const override = contratoErrorOverride(err.code);
      if (override) toast.error(override);
      else showApiError(err);
      if (shouldCloseActionAfterContrato(err.code)) {
        onChanged();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Quitar baja</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {hecho ? (
            <Alert severity="success">Baja quitada</Alert>
          ) : (
            <>
              <Typography>El contrato vuelve a quedar abierto, sin fecha de fin.</Typography>
              <Typography variant="body2" color="text.secondary">
                Si otra ocupación ya tomó la cochera después del fin, el sistema lo va a rechazar.
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {hecho ? (
          <Button variant="contained" onClick={cerrar}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>
              Volver
            </Button>
            <Button variant="contained" onClick={confirmar} disabled={saving} sx={{ fontWeight: 900 }}>
              Quitar baja
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
