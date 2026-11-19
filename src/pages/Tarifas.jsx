import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { showApiError } from "../api/errors";
import { listTarifaHistorial, listTarifasVigentes, updateTarifa } from "../api/tarifaApi";
import { usePermissions } from "../auth/usePermissions";
import { TipoOcupacion, labelOf, optionsOf } from "../constants/enums";
import { formatDateOnly } from "../utils/fechas";
import { formatMoney } from "../utils/formato";
import {
  buildUpdateBody,
  shouldReloadAfter,
  summarizeChange,
  tarifaEstado,
  validateTarifaForm,
} from "../utils/tarifas";
import { useTenantDates } from "../utils/useTenantDates";

const TIPO_OPTIONS = optionsOf(TipoOcupacion);

// Chip de cada estado (D-FC4).
const ESTADO_CHIP = {
  vigente: { label: "Vigente", color: "success" },
  programada: { label: "Programada", color: "info" },
  finalizada: { label: "Finalizada", color: "default" },
};

function EstadoChip({ estado }) {
  const { label, color } = ESTADO_CHIP[estado];
  return <Chip size="small" label={label} color={color} />;
}

export default function Tarifas() {
  const { today } = useTenantDates();
  const hoy = today();
  const { can } = usePermissions();
  // Todo lo que escribe se oculta sin tarifas.editar (D-FC10); nunca se decide por rol.
  const canEdit = can("tarifas.editar");

  // `null` = todavía no cargado (nunca se muestra como "sin tarifa").
  const [vigentes, setVigentes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [tipoHist, setTipoHist] = useState(TIPO_OPTIONS[0].value);
  // Cada cambio de `reloadKey` recarga vigentes e historial en paralelo (D-FC12).
  const [reloadKey, setReloadKey] = useState(0);

  function recargar() {
    setLoading(true);
    setLoadError(false);
    setReloadKey((k) => k + 1);
  }

  // Diálogo "Cambiar precio" (D-FC7, D-FC8). `dialog` es null (cerrado) o el formulario;
  // `resumen` no es null en el paso de confirmación.
  const [dialog, setDialog] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [saving, setSaving] = useState(false);

  function abrirCambiarPrecio(tipo) {
    const vigente = vigentes?.find((v) => v.tipo === tipo)?.vigente;
    // El resumen necesita las programadas del tipo: se posiciona el historial en él (D-FC5).
    setTipoHist(tipo);
    setResumen(null);
    setDialog({
      tipo,
      precio: vigente ? String(vigente.precio) : "",
      fecha: "",
      valores: null,
      errors: {},
    });
  }

  function cerrarDialogo() {
    if (saving) return;
    setDialog(null);
    setResumen(null);
  }

  function cambiarCampo(campo, valor) {
    setDialog((d) => ({ ...d, [campo]: valor, errors: { ...d.errors, [campo]: undefined } }));
  }

  function guardar() {
    const r = validateTarifaForm({ precio: dialog.precio, fecha: dialog.fecha }, hoy);
    if (!r.ok) {
      setDialog((d) => ({ ...d, errors: r.errors }));
      return;
    }
    const valores = { nuevoPrecio: r.nuevoPrecio, vigenteDesde: r.vigenteDesde };
    const vigente = vigentes?.find((v) => v.tipo === dialog.tipo)?.vigente ?? null;
    setDialog((d) => ({ ...d, valores }));
    setResumen(summarizeChange({ vigente, ...valores, historial, today: hoy }));
  }

  async function confirmar() {
    try {
      setSaving(true);
      await updateTarifa(buildUpdateBody(dialog.tipo, dialog.valores));
      toast.success("Tarifa actualizada");
      setDialog(null);
      setResumen(null);
      recargar();
    } catch (e) {
      const apiError = showApiError(e);
      // El diálogo sigue abierto; si el estado quedó viejo se recarga (D-FC11). Reintento manual.
      if (shouldReloadAfter(apiError.code)) recargar();
    } finally {
      setSaving(false);
    }
  }

  // Vigentes. La bandera `ignore` descarta una respuesta que llegó tarde.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listTarifasVigentes();
        if (ignore) return;
        setVigentes(data);
        setLoadError(false);
      } catch (e) {
        if (ignore) return;
        setVigentes(null);
        setLoadError(true);
        showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Historial del tipo elegido. Si el tipo cambia mientras llega la respuesta, se descarta.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listTarifaHistorial(tipoHist);
        if (!ignore) setHistorial(data);
      } catch (e) {
        if (ignore) return;
        setHistorial([]);
        showApiError(e);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [tipoHist, reloadKey]);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Tarifas</Typography>
        <Button variant="outlined" onClick={recargar} disabled={loading}>
          Refrescar
        </Button>
      </Stack>

      {loading ? (
        <div>Cargando...</div>
      ) : loadError || !vigentes ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar las tarifas
        </Alert>
      ) : (
        <Stack spacing={2}>
          {/* TARIFAS POR TIPO: vigente y, debajo, la próxima programada */}
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Tarifas vigentes
              </Typography>

              <Stack spacing={2}>
                {vigentes.map(({ tipo, vigente, proxima }) => (
                  <Stack key={tipo} spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack>
                        <Typography fontWeight={700}>{labelOf(TipoOcupacion, tipo)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {vigente
                            ? `Vigente desde ${formatDateOnly(vigente.vigenteDesde)}`
                            : "Sin tarifa vigente"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography fontWeight={800}>{formatMoney(vigente?.precio)}</Typography>
                        {canEdit ? (
                          <Button variant="contained" onClick={() => abrirCambiarPrecio(tipo)}>
                            Cambiar precio
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>

                    {proxima ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EstadoChip estado="programada" />
                        <Typography variant="body2">
                          {`Desde ${formatDateOnly(proxima.vigenteDesde)}: ${formatMoney(proxima.precio)}`}
                        </Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* HISTORIAL */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography fontWeight={800}>Historial</Typography>

                <TextField
                  select
                  size="small"
                  label="Tipo"
                  value={tipoHist}
                  onChange={(e) => setTipoHist(Number(e.target.value))}
                  sx={{ width: 180 }}
                >
                  {TIPO_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Divider sx={{ mb: 1 }} />

              {!historial.length ? (
                <Typography color="text.secondary">No hay historial para este tipo.</Typography>
              ) : (
                <Stack spacing={1}>
                  {historial.map((t) => (
                    <Stack
                      key={t.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography>{formatMoney(t.precio)}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {`Desde ${formatDateOnly(t.vigenteDesde)}`}
                          {t.vigenteHasta
                            ? ` hasta ${formatDateOnly(t.vigenteHasta)}`
                            : " sin fecha de fin"}
                        </Typography>
                        <EstadoChip estado={tarifaEstado(t, hoy)} />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* DIÁLOGO: cambiar precio (formulario y, después, confirmación) */}
      <Dialog open={Boolean(dialog)} onClose={cerrarDialogo} fullWidth maxWidth="sm">
        {dialog ? (
          <>
            <DialogTitle>{`Cambiar precio · ${labelOf(TipoOcupacion, dialog.tipo)}`}</DialogTitle>

            {resumen ? (
              <DialogContent dividers>
                <Stack spacing={1}>
                  <Typography>
                    <strong>{labelOf(TipoOcupacion, dialog.tipo)}</strong>
                    {` · de ${formatMoney(resumen.precioActual)} a ${formatMoney(resumen.precioNuevo)} · `}
                    {resumen.fechaEfectiva === hoy
                      ? "rige desde hoy"
                      : `rige desde el ${formatDateOnly(resumen.fechaEfectiva)}`}
                  </Typography>
                  {resumen.reemplaza ? (
                    <Typography color="text.secondary">
                      {`Reemplaza la tarifa programada para esa fecha (${formatMoney(resumen.reemplaza.precio)}).`}
                    </Typography>
                  ) : null}
                </Stack>
              </DialogContent>
            ) : (
              <DialogContent dividers>
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <TextField
                    label="Nuevo precio"
                    type="number"
                    value={dialog.precio}
                    onChange={(e) => cambiarCampo("precio", e.target.value)}
                    error={Boolean(dialog.errors.precio)}
                    helperText={dialog.errors.precio}
                    inputProps={{ min: 0.01, step: 0.01 }}
                    fullWidth
                  />
                  <TextField
                    label="Vigente desde (opcional)"
                    type="date"
                    value={dialog.fecha}
                    onChange={(e) => cambiarCampo("fecha", e.target.value)}
                    error={Boolean(dialog.errors.fecha)}
                    helperText={dialog.errors.fecha ?? "Vacío: rige desde hoy"}
                    inputProps={{ min: hoy }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>
              </DialogContent>
            )}

            <DialogActions>
              {resumen ? (
                <>
                  <Button onClick={() => setResumen(null)} disabled={saving}>
                    Volver
                  </Button>
                  <Button variant="contained" onClick={confirmar} disabled={saving}>
                    Confirmar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={cerrarDialogo}>Cancelar</Button>
                  <Button variant="contained" onClick={guardar}>
                    Guardar
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
}
