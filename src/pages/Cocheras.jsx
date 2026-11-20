import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createCocheras, getCochera, setEstadoCochera, updateCochera } from "../api/cocheraApi";
import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import CocheraMosaico from "../componentes/cocheras/CocheraMosaico";
import { useCocherasMosaico } from "../componentes/cocheras/useCocherasMosaico";
import BotonConMotivo from "../componentes/ui/BotonConMotivo";
import BotonRefrescar from "../componentes/ui/BotonRefrescar";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import { EstadoCochera, EstadoOcupacion, TipoOcupacion, colorOf, labelOf } from "../constants/enums";
import {
  MAX_NOTA,
  MSG_NOTA_LARGA,
  accionesDeEstado,
  buildCreateBody,
  buildEstadoBody,
  buildUpdateBody,
  motivoCrearCocheras,
  previewRango,
  shouldCloseDetailAfter,
  shouldReloadAfter,
  tarjetaInfo,
  validateBloqueo,
  validateEditCochera,
  vencimientoTexto,
} from "../utils/cocheras";
import { parseCocheraId } from "../utils/cocheraLink";
import { formatMoney } from "../utils/formato";
import { buildTrazabilidadPath } from "../utils/trazabilidadLink";
import { useTenantDates } from "../utils/useTenantDates";

const ESTADOS_CON_OCUPACION = [EstadoCochera.OCUPADA, EstadoCochera.RESERVADA];
const AVISO_EDICION =
  "Esta cochera tiene una ocupación o reserva. Si cambiás el número, cambia en todas las pantallas.";
// Un único mapa de color de MUI a color del tema (D-FF4). `tono` es "light" (tarjeta) o "main" (historial).
function borderOf(color, tono) {
  return ["success", "warning", "error", "info", "oc"].includes(color) ? `${color}.${tono}` : "divider";
}

const GRID_COLUMNS = {
  xs: "repeat(2, 1fr)",
  sm: "repeat(3, 1fr)",
  md: "repeat(4, 1fr)",
  lg: "repeat(6, 1fr)",
};

// Diálogo "Agregar cocheras" (D-FF7): la vista previa es la confirmación.
function AltaDialog({ numeros, onClose, onDone, onError }) {
  const fullScreen = useDialogFullScreen();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => previewRango(desde, hasta, numeros), [desde, hasta, numeros]);
  const pristine = desde.trim() === "" && hasta.trim() === "";

  async function crear() {
    if (!preview.ok) return;
    try {
      setSaving(true);
      const creadas = await createCocheras(buildCreateBody(preview.desde, preview.hasta));
      const n = Array.isArray(creadas) ? creadas.length : preview.cantidad;
      onDone(n === 1 ? "Se creó 1 cochera" : `Se crearon ${n} cocheras`);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>Agregar cocheras</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Desde"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            inputProps={{ inputMode: "numeric" }}
            autoFocus
            fullWidth
          />
          <TextField
            label="Hasta (opcional)"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            inputProps={{ inputMode: "numeric" }}
            helperText="Vacío: se crea solo la cochera del “Desde”"
            fullWidth
          />
          {pristine ? null : (
            <Alert severity={preview.ok ? "info" : preview.error ? "error" : "warning"}>{preview.texto}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <BotonConMotivo variant="marron" onClick={crear} ocupado={saving} motivo={motivoCrearCocheras({ pristine, preview })}>
          Crear
        </BotonConMotivo>
      </DialogActions>
    </Dialog>
  );
}

// Diálogo "Editar" (D-FF8): número y nota. La nota llega precargada porque este PUT la reemplaza.
function EditDialog({ detalle, numeros, onClose, onDone, onError }) {
  const fullScreen = useDialogFullScreen();
  const [numero, setNumero] = useState(String(detalle.numero));
  const [nota, setNota] = useState(detalle.nota ?? "");
  const [saving, setSaving] = useState(false);

  const r = validateEditCochera({ numero, nota }, { actual: detalle.numero, existentes: numeros });
  const errors = r.ok ? {} : r.errors;

  async function guardar() {
    if (!r.ok) return;
    try {
      setSaving(true);
      await updateCochera(detalle.id, buildUpdateBody(r.numero, r.nota));
      onDone("Cochera actualizada");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>{`Editar cochera #${detalle.numero}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {ESTADOS_CON_OCUPACION.includes(detalle.estado) ? <Alert severity="warning">{AVISO_EDICION}</Alert> : null}
          <TextField
            label="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            error={Boolean(errors.numero)}
            helperText={errors.numero}
            inputProps={{ inputMode: "numeric" }}
            fullWidth
          />
          <TextField
            label="Nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            error={Boolean(errors.nota)}
            helperText={errors.nota ?? `Vacío: se borra la nota · ${nota.length}/${MAX_NOTA}`}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <BotonConMotivo
          variant="marron"
          onClick={guardar}
          ocupado={saving}
          motivo={r.ok ? null : "Corregí los datos marcados"}
        >
          Guardar
        </BotonConMotivo>
      </DialogActions>
    </Dialog>
  );
}

// Diálogo de Bloquear (motivo obligatorio) y Desbloquear (nota opcional, precargada) (D-FF9).
function EstadoDialog({ bloquear, detalle, onClose, onDone, onError }) {
  const fullScreen = useDialogFullScreen();
  const [nota, setNota] = useState(bloquear ? "" : (detalle.nota ?? ""));
  const [saving, setSaving] = useState(false);

  let error = null;
  let notaFinal = null;
  if (bloquear) {
    const v = validateBloqueo(nota);
    if (v.ok) notaFinal = v.nota;
    else error = v.error;
  } else if (nota.trim().length > MAX_NOTA) {
    error = MSG_NOTA_LARGA;
  } else {
    notaFinal = nota;
  }
  // Un motivo vacío en el bloqueo no se marca como error hasta que el usuario escriba algo.
  const mostrarError = Boolean(error) && (!bloquear || nota !== "");

  async function enviar() {
    if (error) return;
    try {
      setSaving(true);
      await setEstadoCochera(
        detalle.id,
        buildEstadoBody(bloquear ? EstadoCochera.BLOQUEADA : EstadoCochera.DISPONIBLE, notaFinal)
      );
      onDone(bloquear ? "Cochera bloqueada" : "Cochera desbloqueada");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>{`${bloquear ? "Bloquear" : "Desbloquear"} cochera #${detalle.numero}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={bloquear ? "Motivo" : "Nota (opcional)"}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            error={mostrarError}
            helperText={
              mostrarError
                ? error
                : `${
                    bloquear
                      ? "Ej: en reparación"
                      : "Se conserva el motivo. Si lo borrás, se elimina la nota"
                  } · ${nota.length}/${MAX_NOTA}`
            }
            multiline
            minRows={2}
            autoFocus
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <BotonConMotivo
          variant="contained"
          color={bloquear ? "error" : "success"}
          onClick={enviar}
          ocupado={saving}
          motivo={error}
        >
          {bloquear ? "Bloquear" : "Desbloquear"}
        </BotonConMotivo>
      </DialogActions>
    </Dialog>
  );
}

export default function Cocheras() {
  const { can } = usePermissions();
  // Todo lo que escribe se oculta por permiso (D-FF10); nunca se decide por rol.
  const canChangeState = can("cocheras.cambiar_estado");
  const canManage = can("cocheras.gestionar");
  const canTrazabilidad = can("auditoria.ver");
  const { formatInstant } = useTenantDates();
  const fullScreen = useDialogFullScreen();
  const [searchParams, setSearchParams] = useSearchParams();

  // Lista de cocheras con su situación (mosaico): `items` null = todavía no cargado (D-FF12).
  const { items, deudaIds, loading, error: loadError, now, reload: recargarLista } = useCocherasMosaico();
  const [q, setQ] = useState("");

  // Detalle: `detalleId` null = cerrado; cada cambio de `detalleKey` lo vuelve a pedir.
  const [detalleId, setDetalleId] = useState(() => parseCocheraId(searchParams));
  const [detalleKey, setDetalleKey] = useState(0);
  const [detalle, setDetalle] = useState(null);

  // Diálogo abierto: null | "alta" | "editar" | "bloquear" | "desbloquear".
  const [dialog, setDialog] = useState(null);

  // La lista y el detalle se recargan después de cualquier escritura: el estado es calculado (D-FF12).
  const recargarTodo = useCallback(() => {
    recargarLista();
    setDetalleKey((k) => k + 1);
  }, [recargarLista]);

  function cerrarDetalle() {
    setDetalleId(null);
    setDetalle(null);
    setDialog((d) => (d === "alta" ? d : null));
  }

  function abrirDetalle(id) {
    setDetalle(null);
    setDetalleId(id);
  }

  // Enlace `/cocheras?cochera=N` (el mosaico del Panel): el detalle ya arrancó abierto (estado inicial) y acá solo
  // se limpia el query con replace, así "atrás" y recargar no lo reabren.
  const hayEnlace = parseCocheraId(searchParams) !== null;
  useEffect(() => {
    if (!hayEnlace) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("cochera");
        return next;
      },
      { replace: true },
    );
  }, [hayEnlace, setSearchParams]);

  // Detalle. Dos clics seguidos dejan el detalle del último: el efecto anterior se descarta (D-FF12).
  useEffect(() => {
    if (detalleId === null) return undefined;
    let ignore = false;
    (async () => {
      try {
        const data = await getCochera(detalleId, { historialTake: 20 });
        if (ignore) return;
        setDetalle(data);
      } catch (e) {
        if (ignore) return;
        const err = showApiError(e);
        if (shouldReloadAfter(err.code)) recargarLista();
        // Si el detalle no se pudo traer, se cierra (no queda un "Cargando…" eterno).
        setDetalleId(null);
        setDetalle(null);
        setDialog((d) => (d === "alta" ? d : null));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [detalleId, detalleKey, recargarLista]);

  const numeros = useMemo(() => (items ?? []).map((c) => c.numero), [items]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!items) return [];
    if (!t) return items;
    return items.filter((c) => String(c.numero).includes(t));
  }, [items, q]);

  // Errores de una escritura (D-FF11): aviso con el `title`, y recarga si el estado quedó viejo.
  // El diálogo sigue abierto, salvo que la cochera ya no exista.
  function manejarError(e) {
    const err = showApiError(e);
    if (shouldReloadAfter(err.code)) recargarTodo();
    if (shouldCloseDetailAfter(err.code)) cerrarDetalle();
  }

  function terminarEscritura(mensaje) {
    toast.success(mensaje);
    setDialog(null);
    recargarTodo();
  }

  const acciones = detalle ? accionesDeEstado(detalle.estado) : { bloquear: false, desbloquear: false };
  const info = detalle ? tarjetaInfo(detalle, now) : null;
  const ocupa = detalle?.ocupacionActiva ?? null;

  const botonAgregar = canManage ? (
    <Button variant="arena" onClick={() => setDialog("alta")}>
      Agregar cocheras
    </Button>
  ) : null;

  let grilla;
  if (loading) {
    grilla = (
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={104} />
        ))}
      </Box>
    );
  } else if (loadError || !items) {
    grilla = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={recargarLista}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar las cocheras
      </Alert>
    );
  } else if (items.length === 0) {
    grilla = (
      <Stack spacing={2} alignItems="flex-start">
        <Typography color="text.secondary">Todavía no hay cocheras</Typography>
        {botonAgregar}
      </Stack>
    );
  } else if (filtered.length === 0) {
    grilla = <Typography color="text.secondary">No hay cocheras con ese número.</Typography>;
  } else {
    grilla = (
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
        {filtered.map((c) => (
          <CocheraMosaico key={c.id} cochera={c} now={now} deudaIds={deudaIds} onClick={abrirDetalle} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <EncabezadoPagina titulo="Cocheras" subtitulo="Visualización rápida del estado de cada cochera." />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-end" }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pb: { sm: 0 } }}>
          <BotonRefrescar onClick={recargarLista} disabled={loading} />
          {/* Con la lista vacía el botón se ofrece en el estado vacío, para no repetirlo. */}
          {items && items.length > 0 ? botonAgregar : null}
        </Stack>
        <Campo label="Buscar por número" placeholder="Escribí para buscar" value={q} onChange={(e) => setQ(e.target.value)} />
      </Stack>

      {items && items.length > 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Total: {items.length} {items.length === 1 ? "cochera" : "cocheras"}
        </Typography>
      ) : null}

      {grilla}

      {/* DETALLE */}
      <Dialog open={detalleId !== null} onClose={cerrarDetalle} fullWidth maxWidth="md" fullScreen={fullScreen}>
        <DialogTitle>Detalle cochera</DialogTitle>
        <DialogContent dividers>
          {!detalle ? (
            <div>Cargando detalle...</div>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h6">Cochera #{detalle.numero}</Typography>
                  <Chip
                    size="small"
                    label={labelOf(EstadoCochera, detalle.estado)}
                    color={colorOf(EstadoCochera, detalle.estado)}
                  />
                </Stack>
                {canManage ? (
                  <Button size="small" onClick={() => setDialog("editar")}>
                    Editar
                  </Button>
                ) : null}
              </Stack>

              {detalle.nota ? (
                <Box>
                  <Typography variant="subtitle2">Nota</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {detalle.nota}
                  </Typography>
                </Box>
              ) : null}

              {canChangeState && (acciones.bloquear || acciones.desbloquear) ? (
                <Stack direction="row" spacing={1}>
                  {acciones.bloquear ? (
                    <Button variant="contained" color="error" onClick={() => setDialog("bloquear")}>
                      Bloquear
                    </Button>
                  ) : null}
                  {acciones.desbloquear ? (
                    <Button variant="contained" color="success" onClick={() => setDialog("desbloquear")}>
                      Desbloquear
                    </Button>
                  ) : null}
                </Stack>
              ) : null}

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {info.modo === "reservada" ? "Reserva" : "Ocupación activa"}
                </Typography>

                {ocupa ? (
                  <Card>
                    <CardContent>
                      <Typography fontWeight={600}>{ocupa.clienteNombre}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tipo: {labelOf(TipoOcupacion, ocupa.tipo)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Inicio: {formatInstant(ocupa.inicio)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ocupa.fin
                          ? `Fin: ${formatInstant(ocupa.fin)} (${vencimientoTexto(ocupa.fin, now)})`
                          : "Sin hora de fin"}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Total: {formatMoney(ocupa.precioTotal)}
                      </Typography>
                      {canTrazabilidad ? (
                        <Button
                          size="small"
                          component={RouterLink}
                          to={buildTrazabilidadPath({ ocupacionId: ocupa.ocupacionId })}
                          sx={{ mt: 1 }}
                        >
                          Ver trazabilidad
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay ocupación activa.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Historial (últimas 20)
                </Typography>

                {detalle.historial?.length ? (
                  <Stack spacing={1}>
                    {detalle.historial.map((h) => {
                      const color = colorOf(EstadoOcupacion, h.estado);
                      return (
                        <Card key={h.id} sx={{ borderWidth: 2, borderColor: borderOf(color, "main") }}>
                          <CardContent sx={{ py: 1.2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                              <Typography
                                fontWeight={600}
                                noWrap
                                title={`${h.id} · ${h.clienteNombre}`}
                                sx={{ minWidth: 0 }}
                              >
                                #{h.id} · {h.clienteNombre}
                              </Typography>
                              <Chip
                                size="small"
                                label={labelOf(EstadoOcupacion, h.estado)}
                                color={color}
                                variant="filled"
                              />
                            </Stack>

                            <Typography variant="caption" color="text.secondary" noWrap>
                              {formatInstant(h.inicio)} → {h.fin ? formatInstant(h.fin) : "sin fin"}
                            </Typography>

                            <Typography variant="body2">Total: {formatMoney(h.precioTotal)}</Typography>

                            {canTrazabilidad ? (
                              <Button
                                size="small"
                                component={RouterLink}
                                to={buildTrazabilidadPath({ ocupacionId: h.id })}
                              >
                                Ver trazabilidad
                              </Button>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin historial.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contorno" onClick={cerrarDetalle}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGOS DE ESCRITURA. Se montan al abrirse: el formulario arranca limpio cada vez. */}
      {dialog === "alta" && canManage ? (
        <AltaDialog
          numeros={numeros}
          onClose={() => setDialog(null)}
          onDone={(m) => {
            toast.success(m);
            setDialog(null);
            recargarLista();
          }}
          onError={(e) => {
            const err = showApiError(e);
            if (shouldReloadAfter(err.code)) recargarLista();
          }}
        />
      ) : null}

      {dialog === "editar" && canManage && detalle ? (
        <EditDialog
          detalle={detalle}
          numeros={numeros}
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={manejarError}
        />
      ) : null}

      {(dialog === "bloquear" || dialog === "desbloquear") && canChangeState && detalle ? (
        <EstadoDialog
          bloquear={dialog === "bloquear"}
          detalle={detalle}
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={manejarError}
        />
      ) : null}
    </Box>
  );
}
