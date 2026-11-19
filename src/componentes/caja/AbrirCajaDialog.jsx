// Abrir caja (spec 09, D-FI6), en los dos modos. Pide el fondo (precargado con el que quedó) y una observación.
// La observación obligatoria cuando el fondo difiere es regla del backend: acá es solo un texto y NO bloquea el
// envío; el 400 `errors.Observacion` se marca en el campo. Tras un error el diálogo conserva lo escrito.
import { useState } from "react";
import toast from "react-hot-toast";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { openCaja } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { ModoCaja } from "../../constants/enums";
import { cajaFieldErrors, fondoDifiere, shouldCloseActionAfterCaja, shouldReloadAfterCaja, validateAbrir } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";

/**
 * @param {{ modo?: number, fondoPropuesto?: number | null, onClose: () => void, onChanged?: () => void }} props
 *   `onChanged` pide recargar la caja actual (después de abrir o de un error por estado viejo).
 */
export default function AbrirCajaDialog({ modo, fondoPropuesto, onClose, onChanged }) {
  const [fondo, setFondo] = useState(() => Number(fondoPropuesto ?? 0).toFixed(2));
  const [observacion, setObservacion] = useState("");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState([]);
  const [saving, setSaving] = useState(false);

  const difiere = fondoDifiere(fondo, fondoPropuesto);

  async function enviar() {
    const r = validateAbrir({ fondoInicial: fondo, observacion });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setGeneral([]);
    setSaving(true);
    try {
      await openCaja(r.body);
      toast.success("Caja abierta");
      onChanged?.();
      onClose();
    } catch (e) {
      const err = showApiError(e);
      const { fields, general: otros } = cajaFieldErrors(err);
      setErrors(fields);
      setGeneral(otros);
      if (shouldReloadAfterCaja(err.code)) onChanged?.();
      if (shouldCloseActionAfterCaja(err.code)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Abrir caja</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {modo === ModoCaja.DIARIA ? (
            <Alert severity="info">La caja también se abre sola con el primer cobro.</Alert>
          ) : null}
          {fondoPropuesto !== null && fondoPropuesto !== undefined ? (
            <Alert severity="info">Fondo que quedó del último cierre: {formatMoney(fondoPropuesto)}</Alert>
          ) : null}
          {general.map((m) => (
            <Alert key={m} severity="error">
              {m}
            </Alert>
          ))}

          <TextField
            label="Fondo inicial"
            value={fondo}
            onChange={(e) => {
              setFondo(e.target.value);
              setErrors((prev) => ({ ...prev, fondoInicial: undefined }));
            }}
            error={Boolean(errors.fondoInicial)}
            helperText={errors.fondoInicial ?? "Efectivo con el que arranca la caja"}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            autoFocus
            fullWidth
          />

          <TextField
            label={difiere ? "Observación (obligatoria: el fondo difiere del que quedó)" : "Observación (opcional)"}
            value={observacion}
            onChange={(e) => {
              setObservacion(e.target.value);
              setErrors((prev) => ({ ...prev, observacion: undefined }));
            }}
            error={Boolean(errors.observacion)}
            helperText={errors.observacion ?? (difiere ? "Se va a avisar al dueño con una alerta" : `${observacion.trim().length}/500`)}
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
        <Button variant="contained" onClick={enviar} disabled={saving} sx={{ fontWeight: 900 }}>
          Abrir caja
        </Button>
      </DialogActions>
    </Dialog>
  );
}
