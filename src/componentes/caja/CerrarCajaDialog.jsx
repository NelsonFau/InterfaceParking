// Cerrar caja con arqueo (spec 09, D-FI7). Muestra el esperado ANTES de contar (con `caja.ver_esperado`), pide
// el contado, el fondo que queda y la observación, y muestra una diferencia INFORMATIVA. El cliente no bloquea
// nada de lo que es regla del backend (fondo siguiente <= contado, observación con diferencia): el backend
// calcula el esperado con el candado de la caja al cerrar y contesta 400 con `errors.*`. Tras cerrar muestra
// el resultado tal como lo devolvió el backend; no calcula ninguna cifra.
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { closeCaja } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { usePermissions } from "../../auth/usePermissions";
import {
  cajaFieldErrors,
  difColor,
  diferenciaInfo,
  diferenciaVista,
  shouldCloseActionAfterCaja,
  shouldReloadAfterCaja,
  validateCerrar,
} from "../../utils/caja";
import { buildAlertasPath } from "../../utils/alertas";
import { formatMoney } from "../../utils/formato";
import { useDialogFullScreen } from "../useDialogFullScreen";
import DiferenciaTexto from "./DiferenciaTexto";
import TotalesPorMetodo from "./TotalesPorMetodo";
import { useCajaEsperado } from "./useCajaEsperado";

function Fila({ label, children }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: "right" }} component="div">
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * @param {{ sesion: { id: number, fondoInicial?: number }, onClose: () => void, onChanged?: () => void,
 *   onError?: (apiError: import("../../api/errors").ApiError) => void }} props
 *   `onChanged` pide recargar la caja actual (al cerrar el resultado o ante un error por estado viejo);
 *   `onError` deja que quien lo abrió cierre su detalle (404).
 */
export default function CerrarCajaDialog({ sesion, onClose, onChanged, onError }) {
  const { can } = usePermissions();
  const fullScreen = useDialogFullScreen();
  const verEsperado = can("caja.ver_esperado");
  const esperado = useCajaEsperado(sesion.id, verEsperado);

  const [contado, setContado] = useState("");
  const [siguiente, setSiguiente] = useState("");
  const [siguienteTocado, setSiguienteTocado] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cierre, setCierre] = useState(null);

  // El fondo siguiente acompaña al contado mientras el usuario no lo toque.
  const fondoSiguiente = siguienteTocado ? siguiente : contado;
  const efectivoEsperado = esperado.data?.efectivoEsperado;
  const diferencia = diferenciaVista(contado, efectivoEsperado);
  const infoDif = diferenciaInfo(diferencia);

  function cerrarResultado() {
    onChanged?.();
    onClose();
  }

  async function enviar() {
    const r = validateCerrar({ efectivoContado: contado, fondoSiguiente, observacion });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setGeneral([]);
    setSaving(true);
    try {
      const data = await closeCaja(sesion.id, r.body);
      toast.success("Caja cerrada");
      setCierre(data);
    } catch (e) {
      const err = showApiError(e);
      const { fields, general: otros } = cajaFieldErrors(err);
      setErrors(fields);
      setGeneral(otros);
      if (shouldReloadAfterCaja(err.code)) onChanged?.();
      if (shouldCloseActionAfterCaja(err.code)) onClose();
      onError?.(err);
    } finally {
      setSaving(false);
    }
  }

  if (cierre) {
    const tipoDif = diferenciaInfo(cierre.diferencia)?.tipo;
    const hayDiferencia = tipoDif === "sobra" || tipoDif === "falta";
    return (
      <Dialog open onClose={cerrarResultado} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <DialogTitle>Caja cerrada</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="success">Caja cerrada</Alert>
            {hayDiferencia ? (
              <Alert severity="warning">
                Se creó una alerta de diferencia de caja.{" "}
                {can("alertas.ver") ? (
                  <Link component={RouterLink} to={buildAlertasPath()} onClick={onClose}>
                    Ver alertas
                  </Link>
                ) : null}
              </Alert>
            ) : null}
            <Stack spacing={0.5}>
              <Fila label="Efectivo contado">{formatMoney(cierre.efectivoContado)}</Fila>
              <Fila label="Efectivo esperado">{formatMoney(cierre.efectivoEsperado)}</Fila>
              <Fila label="Diferencia">
                <DiferenciaTexto diferencia={cierre.diferencia} />
              </Fila>
              <Fila label="Fondo que queda">{formatMoney(cierre.fondoSiguiente)}</Fila>
              {cierre.observacion ? <Fila label="Observación">{cierre.observacion}</Fila> : null}
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Totales por método
              </Typography>
              <TotalesPorMetodo totales={cierre.totales} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="marron" onClick={cerrarResultado}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Cerrar caja</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {general.map((m) => (
            <Alert key={m} severity="error">
              {m}
            </Alert>
          ))}

          {verEsperado ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Antes de contar
                </Typography>
                <Button size="small" onClick={esperado.reload} disabled={esperado.status === "loading" || saving}>
                  Actualizar esperado
                </Button>
              </Stack>
              {esperado.status === "error" ? (
                <Alert severity="warning">No pudimos cargar el esperado</Alert>
              ) : esperado.data === null ? (
                <Skeleton variant="rounded" height={90} />
              ) : (
                <Stack spacing={1}>
                  <Fila label="Fondo inicial">{formatMoney(esperado.data.fondoInicial)}</Fila>
                  <TotalesPorMetodo totales={esperado.data.totales} />
                  <Fila label="Efectivo esperado">
                    <b>{formatMoney(esperado.data.efectivoEsperado)}</b>
                  </Fila>
                </Stack>
              )}
            </Box>
          ) : null}

          <TextField
            label="Efectivo contado"
            value={contado}
            onChange={(e) => {
              setContado(e.target.value);
              setErrors((prev) => ({ ...prev, efectivoContado: undefined }));
            }}
            error={Boolean(errors.efectivoContado)}
            helperText={errors.efectivoContado}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            autoFocus
            fullWidth
          />

          {infoDif ? (
            <Typography variant="body2" sx={{ color: difColor(infoDif), fontWeight: 600 }}>
              {infoDif.tipo === "cero"
                ? "Diferencia: sin diferencia"
                : `Diferencia: ${formatMoney(Math.abs(diferencia))} (${infoDif.label})`}
            </Typography>
          ) : null}

          <TextField
            label="Fondo que queda para la próxima caja"
            value={fondoSiguiente}
            onChange={(e) => {
              setSiguiente(e.target.value);
              setSiguienteTocado(true);
              setErrors((prev) => ({ ...prev, fondoSiguiente: undefined }));
            }}
            error={Boolean(errors.fondoSiguiente)}
            helperText={errors.fondoSiguiente}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
            fullWidth
          />

          <TextField
            label={
              infoDif && infoDif.tipo !== "cero"
                ? "Observación (obligatoria: hay diferencia)"
                : "Observación (opcional)"
            }
            value={observacion}
            onChange={(e) => {
              setObservacion(e.target.value);
              setErrors((prev) => ({ ...prev, observacion: undefined }));
            }}
            error={Boolean(errors.observacion)}
            helperText={errors.observacion ?? `${observacion.trim().length}/500`}
            multiline
            minRows={2}
            fullWidth
          />

          <Typography variant="caption" color="text.secondary">
            La diferencia es una vista previa: la que vale es la que calcula el servidor al cerrar.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="marron" onClick={enviar} disabled={saving}>
          Cerrar caja
        </Button>
      </DialogActions>
    </Dialog>
  );
}
