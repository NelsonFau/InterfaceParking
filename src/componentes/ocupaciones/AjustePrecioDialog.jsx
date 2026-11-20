// Ajuste de precio de un contrato mensual (spec 10, D-FJ5). Fecha desde la que rige, precio nuevo y motivo.
// El cliente valida solo formato y largo (D-FJ11): que la fecha sea posterior a hoy lo decide el backend
// (400 `errors.VigenteDesde`). El resultado muestra lo que devolvió el backend; no se calcula nada.
import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useDialogFullScreen } from "../useDialogFullScreen";
import { normalizeError, showApiError } from "../../api/errors";
import { adjustOcupacionPrecio } from "../../api/ocupacionApi";
import {
  MAX_MOTIVO_CONTRATO,
  contratoFieldErrors,
  defaultVigenteDesde,
  shouldCloseActionAfterContrato,
  validateAjustePrecio,
} from "../../utils/contratos";
import { formatDateOnly } from "../../utils/fechas";
import { formatMoney } from "../../utils/formato";
import { useTenantDates } from "../../utils/useTenantDates";

/**
 * @param {{ ocupacion: { id: number, precioUnitarioAplicado?: number }, onClose: () => void,
 *   onChanged: () => void }} props `onChanged` recarga el detalle y el listado de la página.
 */
export default function AjustePrecioDialog({ ocupacion, onClose, onChanged }) {
  const fullScreen = useDialogFullScreen();
  const { today } = useTenantDates();
  const [manana] = useState(() => defaultVigenteDesde(today()));
  const [form, setForm] = useState({ vigenteDesde: manana, precioUnitario: "", motivo: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function cerrar() {
    if (resultado) onChanged();
    onClose();
  }

  async function enviar() {
    const r = validateAjustePrecio(form);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      setResultado(await adjustOcupacionPrecio(ocupacion.id, r.body));
    } catch (e) {
      const err = normalizeError(e);
      showApiError(err);
      setErrors(contratoFieldErrors(err).fields);
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
        <DialogTitle>Ajustar precio</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Alert severity="success">Ajuste registrado</Alert>
            <Typography>
              Precio anterior (vigente en esa fecha): {formatMoney(resultado.precioAnterior)} → Precio nuevo:{" "}
              {formatMoney(resultado.precioNuevo)}, desde {formatDateOnly(resultado.vigenteDesde)}
            </Typography>
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
      <DialogTitle>Ajustar precio</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">Precio de partida del contrato: {formatMoney(ocupacion.precioUnitarioAplicado)}</Typography>
          <Alert severity="info">
            El nuevo precio rige para los períodos que empiezan desde esa fecha. No cambia lo ya devengado ni se puede
            borrar después: para volver atrás hay que cargar otro ajuste.
          </Alert>

          <TextField
            label="Rige desde"
            type="date"
            value={form.vigenteDesde}
            onChange={(e) => set("vigenteDesde", e.target.value)}
            error={Boolean(errors.vigenteDesde)}
            helperText={errors.vigenteDesde ?? "Tiene que ser posterior a hoy"}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: manana } }}
            fullWidth
          />
          <TextField
            label="Precio nuevo"
            value={form.precioUnitario}
            onChange={(e) => set("precioUnitario", e.target.value)}
            error={Boolean(errors.precioUnitario)}
            helperText={errors.precioUnitario ?? "Hasta 2 decimales"}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            autoFocus
            fullWidth
          />
          <TextField
            label="Motivo"
            value={form.motivo}
            onChange={(e) => set("motivo", e.target.value)}
            error={Boolean(errors.motivo)}
            helperText={errors.motivo ?? `${form.motivo.length}/${MAX_MOTIVO_CONTRATO}`}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Volver
        </Button>
        <Button variant="marron" onClick={enviar} disabled={saving}>
          Ajustar precio
        </Button>
      </DialogActions>
    </Dialog>
  );
}
