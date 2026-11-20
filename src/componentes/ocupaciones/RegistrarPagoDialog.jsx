// Registrar pago de una ocupación (spec 07, D-FG19). Se usa desde la tarjeta y desde el detalle.
// No compara el monto con el saldo: si se pasa, el backend responde `pago_supera_saldo` y la pantalla
// recarga y deja este diálogo abierto con el saldo nuevo (D-FG7). Los errores de caja son de la spec 09.
import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { showApiError } from "../../api/errors";
import { createPago } from "../../api/pagosApi";
import { MetodoPago, optionsOf } from "../../constants/enums";
import { formatMoney } from "../../utils/formato";
import { fieldErrorsFromApi, validatePago } from "../../utils/ocupaciones";

const METODO_OPTIONS = optionsOf(MetodoPago);

/**
 * @param {{ ocupacion: { id: number, saldo: number, cocheraNumero?: number },
 *   onClose: () => void, onDone: (mensaje: string) => void, onError: (apiError: import("../../api/errors").ApiError) => void }} props
 */
export default function RegistrarPagoDialog({ ocupacion, onClose, onDone, onError }) {
  const fullScreen = useDialogFullScreen();
  const saldo = ocupacion.saldo;
  const [monto, setMonto] = useState(String(saldo ?? ""));
  const [metodo, setMetodo] = useState(MetodoPago.EFECTIVO);
  const [referencia, setReferencia] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Si el saldo cambia con el diálogo abierto (después de un `pago_supera_saldo`), el monto propuesto
  // vuelve a ser el saldo nuevo.
  const [saldoVisto, setSaldoVisto] = useState(saldo);
  if (saldo !== saldoVisto) {
    setSaldoVisto(saldo);
    setMonto(String(saldo ?? ""));
  }

  async function enviar() {
    const r = validatePago({ ocupacionId: ocupacion.id, monto, metodo, referencia });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await createPago(r.body);
      onDone("Pago registrado");
    } catch (e) {
      const err = showApiError(e);
      setErrors(fieldErrorsFromApi(err).fields);
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>Registrar pago</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Ocupación #{ocupacion.id}
            {ocupacion.cocheraNumero != null ? ` · Cochera #${ocupacion.cocheraNumero}` : ""} · Saldo pendiente:{" "}
            <b>{formatMoney(saldo)}</b>
          </Typography>

          <TextField
            label="Monto"
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setErrors((x) => ({ ...x, monto: undefined }));
            }}
            error={Boolean(errors.monto)}
            helperText={errors.monto ?? "Hasta 2 decimales"}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            autoFocus
            fullWidth
          />

          <TextField
            select
            label="Método de pago"
            value={metodo}
            onChange={(e) => {
              setMetodo(Number(e.target.value));
              setErrors((x) => ({ ...x, metodo: undefined }));
            }}
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
            label="Referencia (opcional)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button color="success" variant="contained" onClick={enviar} disabled={saving}>
          Registrar pago
        </Button>
      </DialogActions>
    </Dialog>
  );
}
