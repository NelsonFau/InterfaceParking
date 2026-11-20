import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { showApiError } from "../api/errors";
import {
  listTarifaHistorial,
  listTarifasVigentes,
  removeTarifa,
  updateTarifa,
} from "../api/tarifaApi";
import { usePermissions } from "../auth/usePermissions";
import { EstadoTarifa, TipoOcupacion, colorOf, labelOf, optionsOf } from "../constants/enums";
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
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import BotonRefrescar from "../componentes/ui/BotonRefrescar";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";

const TIPO_OPTIONS = optionsOf(TipoOcupacion);

// Chip de cada estado (D-FC4): etiqueta y color salen de `EstadoTarifa` (enums.js).
function EstadoChip({ estado }) {
  return <Chip size="small" label={labelOf(EstadoTarifa, estado)} color={colorOf(EstadoTarifa, estado)} />;
}

export default function Tarifas() {
  const { today } = useTenantDates();
  const fullScreen = useDialogFullScreen();
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
      fechaFija: false,
      valores: null,
      errors: {},
    });
  }

  // "Editar" una programada (D-FC9): el mismo PUT, con la fecha bloqueada
  // (cambiarla crearía otra tarifa en vez de editar).
  function abrirEditar(tarifa) {
    setTipoHist(tarifa.tipo);
    setResumen(null);
    setDialog({
      tipo: tarifa.tipo,
      precio: String(tarifa.precio),
      fecha: tarifa.vigenteDesde,
      fechaFija: true,
      valores: null,
      errors: {},
    });
  }

  // "Quitar" una programada (D-FC6): sin confirmación, es reversible y no afecta cobros todavía.
  const [removingId, setRemovingId] = useState(null);

  async function quitar(id) {
    try {
      setRemovingId(id);
      await removeTarifa(id);
      toast.success("Programación quitada");
      recargar();
    } catch (e) {
      const apiError = showApiError(e);
      if (shouldReloadAfter(apiError.code)) recargar();
    } finally {
      setRemovingId(null);
    }
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
      {/* No hay "Nueva tarifa": una tarifa nueva se crea con "Cambiar precio" de cada tipo (spec 03). */}
      <EncabezadoPagina titulo="Tarifas" acciones={<BotonRefrescar onClick={recargar} disabled={loading} />} />

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
          <Tarjeta titulo="Tarifas vigentes">
            <Stack divider={<Divider />} spacing={2}>
              {vigentes.map(({ tipo, vigente, proxima }) => (
                <Stack key={tipo} spacing={1.25} sx={{ pb: 0.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Typography>{labelOf(TipoOcupacion, tipo)}</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography sx={{ fontWeight: 500 }}>{formatMoney(vigente?.precio)}</Typography>
                      {canEdit ? (
                        <Button variant="pill" color="inherit" onClick={() => abrirCambiarPrecio(tipo)}>
                          Cambiar precio
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Typography color="text.secondary">
                    {vigente ? `Vigente desde ${formatDateOnly(vigente.vigenteDesde)}` : "Sin tarifa vigente"}
                  </Typography>

                  {proxima ? (
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <EstadoChip estado="programada" />
                        <Typography variant="body2">
                          {`Desde ${formatDateOnly(proxima.vigenteDesde)}: ${formatMoney(proxima.precio)}`}
                        </Typography>
                      </Stack>
                      {canEdit ? (
                        <Link
                          component="button"
                          type="button"
                          color="error"
                          underline="hover"
                          onClick={() => quitar(proxima.id)}
                          disabled={removingId !== null}
                          sx={{ color: "error.main", mr: 1.5 }}
                        >
                          Quitar
                        </Link>
                      ) : null}
                    </Stack>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Tarjeta>

          {/* HISTORIAL */}
          <Tarjeta
            titulo="Historial"
            acciones={
              <Box sx={{ width: 240 }}>
                <Campo select label="Tipo" value={tipoHist} onChange={(e) => setTipoHist(Number(e.target.value))}>
                  {TIPO_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Campo>
              </Box>
            }
          >
            {!historial.length ? (
              <Typography color="text.secondary">No hay historial para este tipo.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Precio</TableCell>
                      <TableCell>Período</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historial.map((t) => {
                      const estado = tarifaEstado(t, hoy);
                      return (
                        <TableRow key={t.id}>
                          <TableCell>{formatMoney(t.precio)}</TableCell>
                          <TableCell>
                            {`Desde ${formatDateOnly(t.vigenteDesde)}`}
                            {t.vigenteHasta ? ` hasta ${formatDateOnly(t.vigenteHasta)}` : " sin fecha de fin"}
                          </TableCell>
                          <TableCell>
                            <EstadoChip estado={estado} />
                          </TableCell>
                          <TableCell>
                            {canEdit && estado === "programada" ? (
                              <>
                                <Link component="button" type="button" underline="hover" onClick={() => abrirEditar(t)}>
                                  Editar
                                </Link>
                                {" · "}
                                <Link
                                  component="button"
                                  type="button"
                                  underline="hover"
                                  onClick={() => quitar(t.id)}
                                  disabled={removingId !== null}
                                >
                                  Quitar
                                </Link>
                              </>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Tarjeta>
        </Stack>
      )}

      {/* DIÁLOGO: cambiar precio (formulario y, después, confirmación) */}
      <Dialog open={Boolean(dialog)} onClose={cerrarDialogo} fullScreen={fullScreen} fullWidth maxWidth="sm">
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
                    helperText={
                      dialog.errors.fecha ??
                      (dialog.fechaFija
                        ? "La fecha no se puede cambiar al editar"
                        : "Vacío: rige desde hoy")
                    }
                    disabled={dialog.fechaFija}
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
                  <Button variant="contorno" onClick={() => setResumen(null)} disabled={saving}>
                    Volver
                  </Button>
                  <Button variant="marron" onClick={confirmar} disabled={saving}>
                    Confirmar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="contorno" onClick={cerrarDialogo}>Cancelar</Button>
                  <Button variant="marron" onClick={guardar}>
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
