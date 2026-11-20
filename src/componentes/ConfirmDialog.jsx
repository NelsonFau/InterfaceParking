// Confirmación genérica (spec 13, D-FM13): reemplaza a la confirmación nativa del navegador. No decide nada: el llamador ejecuta la acción.
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useDialogFullScreen } from "./useDialogFullScreen";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.title]
 * @param {string} props.message
 * @param {string} [props.confirmLabel]
 * @param {"primary"|"error"|"success"|"warning"|"info"} [props.confirmColor]
 * @param {boolean} [props.loading] mientras envía: deshabilita los botones y no cierra con clic afuera ni con Esc
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  confirmColor = "primary",
  loading = false,
  onConfirm,
  onClose,
}) {
  const fullScreen = useDialogFullScreen();

  function handleClose(_event, reason) {
    if (loading && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
    onClose?.();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} fullWidth maxWidth="xs">
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent>
        <DialogContentText sx={{ color: "text.primary" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose?.()} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
