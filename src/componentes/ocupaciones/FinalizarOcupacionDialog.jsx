// Finalizar una ocupación (spec 07, D-FG18). Carga el detalle (datos frescos), muestra la cuenta y confirma.
//
// SIEMPRE se finaliza primero SIN `resolucionExcedente`: el excedente de un mensual no se conoce antes de
// finalizar (el backend lo calcula con la salida real), así que el cliente no lo anticipa. Si el backend
// responde 400 `datos_invalidos` con `errors.ResolucionExcedente`, NO se muestra aviso: el diálogo pasa,
// sin cerrarse, al paso "Resolver el excedente" y muestra el texto del backend (trae los montos; no se
// parsea). Ahí se elige "Cobrar completo" (con motivo) o "Devolver" y se reenvía el finalizar.
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { normalizeError, showApiError } from "../../api/errors";
import { finalizeOcupacion, getOcupacion } from "../../api/ocupacionApi";
import { ResolucionExcedente, labelOf } from "../../constants/enums";
import {
  MAX_MOTIVO,
  buildFinalizarBody,
  fieldErrorsFromApi,
  needsResolutionError,
  ocupacionFase,
  resolutionMessage,
} from "../../utils/ocupaciones";
import CuentaOcupacion from "./CuentaOcupacion";

const AVISO_DEVOLVER = "Quedó una devolución pendiente; registrala desde Pagos";

/**
 * @param {{ ocupacionId: number, now: Date, onClose: () => void, onDone: (mensaje: string) => void,
 *   onError: (apiError: import("../../api/errors").ApiError) => void }} props
 */
export default function FinalizarOcupacionDialog({ ocupacionId, now, onClose, onDone, onError }) {
  // Detalle fresco: `{ status: "loading" | "ready" | "error", data }`.
  const [detalle, setDetalle] = useState({ status: "loading", data: null });
  const [loadKey, setLoadKey] = useState(0);

  const [resolviendo, setResolviendo] = useState(false);
  const [mensajeBackend, setMensajeBackend] = useState("");
  const [resolucion, setResolucion] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await getOcupacion(ocupacionId);
        if (!ignore) setDetalle({ status: "ready", data });
      } catch (e) {
        if (ignore) return;
        const err = showApiError(e);
        setDetalle({ status: "error", data: null });
        onError(err);
      }
    })();
    return () => {
      ignore = true;
    };
    // `onError` cambia en cada render de la página: el detalle se pide por id o al reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupacionId, loadKey]);

  function reintentar() {
    setDetalle({ status: "loading", data: null });
    setLoadKey((k) => k + 1);
  }

  async function confirmar() {
    const r = buildFinalizarBody({ resolviendo, resolucion, motivo });
    if (!r.ok) {
      setErrors({ [r.field]: r.message });
      return;
    }
    setErrors({});
    setSaving(true);
    // No se reintenta solo: una escritura no es idempotente.
    try {
      await finalizeOcupacion(ocupacionId, r.body);
      const devolver = r.body?.resolucionExcedente === ResolucionExcedente.DEVOLVER;
      onDone(devolver ? `Ocupación finalizada. ${AVISO_DEVOLVER}` : "Ocupación finalizada");
    } catch (e) {
      const err = normalizeError(e);
      if (!resolviendo && needsResolutionError(err)) {
        // Sin aviso: es el camino normal de un mensual con excedente.
        setMensajeBackend(resolutionMessage(err));
        setResolviendo(true);
        return;
      }
      showApiError(err);
      setErrors(fieldErrorsFromApi(err).fields);
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  const data = detalle.data;
  const fase = data ? ocupacionFase(data, now) : null;
  const textoBoton = resolviendo
    ? resolucion
      ? `${labelOf(ResolucionExcedente, resolucion)} y finalizar`
      : "Finalizar"
    : "Finalizar";

  let contenido;
  if (detalle.status === "loading") {
    contenido = (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={24} />
        <Skeleton variant="rounded" height={90} />
      </Stack>
    );
  } else if (detalle.status === "error") {
    contenido = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reintentar}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar la ocupación.
      </Alert>
    );
  } else {
    contenido = (
      <Stack spacing={2}>
        <Typography>
          Se finaliza la ocupación de la cochera #{data.cocheraNumero}. El total se calcula al finalizar.
        </Typography>
        <CuentaOcupacion ocupacion={data} fase={fase} />

        {resolviendo ? (
          <Stack spacing={1.5}>
            <Alert severity="warning" sx={{ whiteSpace: "pre-wrap" }}>
              {mensajeBackend}
            </Alert>
            <FormControl error={Boolean(errors.resolucion)}>
              <FormLabel>Resolver el excedente</FormLabel>
              {/* Ninguna opción viene preseleccionada: decide dinero. */}
              <RadioGroup
                value={resolucion === null ? "" : String(resolucion)}
                onChange={(e) => {
                  setResolucion(Number(e.target.value));
                  setErrors({});
                }}
              >
                <FormControlLabel
                  value={String(ResolucionExcedente.COBRAR_COMPLETO)}
                  control={<Radio />}
                  label="Cobrar completo: el excedente no se devuelve y queda como total (pide motivo)"
                />
                <FormControlLabel
                  value={String(ResolucionExcedente.DEVOLVER)}
                  control={<Radio />}
                  label="Devolver: queda una devolución pendiente, se registra desde Pagos"
                />
              </RadioGroup>
              {errors.resolucion ? <FormHelperText>{errors.resolucion}</FormHelperText> : null}
            </FormControl>
            <TextField
              label={resolucion === ResolucionExcedente.COBRAR_COMPLETO ? "Motivo" : "Motivo (opcional)"}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrors((x) => ({ ...x, motivo: undefined }));
              }}
              error={Boolean(errors.motivo)}
              helperText={errors.motivo ?? `${motivo.length}/${MAX_MOTIVO}`}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        ) : null}
      </Stack>
    );
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Finalizar ocupación</DialogTitle>
      <DialogContent dividers>{contenido}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Volver
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={confirmar}
          disabled={saving || detalle.status !== "ready"}
          sx={{ fontWeight: 900 }}
        >
          {textoBoton}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
