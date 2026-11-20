import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  Divider,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  createCocheras,
  getCochera,
  listCocheras,
  setEstadoCochera,
  updateCochera,
} from "../api/cocheraApi";
import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import PlanoGrilla from "../componentes/cocheras/PlanoGrilla";
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import { EstadoCochera, EstadoOcupacion, TipoOcupacion, colorOf, labelOf } from "../constants/enums";
import {
  MAX_NOTA,
  MSG_NOTA_LARGA,
  accionesDeEstado,
  buildCreateBody,
  buildEstadoBody,
  buildUpdateBody,
  previewRango,
  shouldCloseDetailAfter,
  shouldReloadAfter,
  tarjetaInfo,
  validateBloqueo,
  validateEditCochera,
  vencimientoTexto,
} from "../utils/cocheras";
import { formatMoney } from "../utils/formato";
import { buildTrazabilidadPath } from "../utils/trazabilidadLink";
import { useTenantDates } from "../utils/useTenantDates";

const ESTADOS_CON_OCUPACION = [EstadoCochera.OCUPADA, EstadoCochera.RESERVADA];
const AVISO_EDICION =
  "Esta cochera tiene una ocupación o reserva. Si cambiás el número, cambia en todas las pantallas.";
// Cada cuánto se refresca el "vence en…" de las tarjetas, sin pedir nada al servidor.
const TICK_MS = 60_000;

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

function CocheraCard({ c, now, formatInstant, onClick }) {
  const info = tarjetaInfo(c, now);
  const color = colorOf(EstadoCochera, c.estado);
  const ninguno = info.modo === "ninguno";

  // Segunda línea (D-FF5): una BLOQUEADA con ocupación explica de qué se trata.
  let segunda = "";
  if (!ninguno) {
    if (info.bloqueada) {
      segunda =
        info.modo === "ocupada"
          ? `ocupada por ${info.cliente}`
          : `reservada desde ${formatInstant(info.inicio)}`;
    } else {
      segunda = info.modo === "ocupada" ? info.vence : `Desde ${formatInstant(info.inicio)}`;
    }
  }
  const pie = !ninguno && info.fin ? `Hasta ${formatInstant(info.fin)}` : " ";

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        borderWidth: 2,
        borderColor: borderOf(color, "light"),
        height: 150, // altura fija
        display: "flex",
        transition: "transform .08s ease",
        "&:active": { transform: "scale(0.99)" },
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 1.75,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 1,
          "&:last-child": { pb: 1.75 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography variant="subtitle1">
            #{c.numero}
          </Typography>
          <Chip
            size="small"
            label={labelOf(EstadoCochera, c.estado)}
            color={color}
            variant="filled"
          />
        </Stack>

        {ninguno ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            —
          </Typography>
        ) : (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.15 }} noWrap title={info.cliente}>
              {info.cliente}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap title={segunda}>
              {segunda}
            </Typography>
          </Box>
        )}

        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
          {pie}
        </Typography>
      </CardContent>
    </Card>
  );
}

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
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={crear} disabled={saving || !preview.ok}>
          Crear
        </Button>
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
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={guardar} disabled={saving || !r.ok}>
          Guardar
        </Button>
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
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={bloquear ? "error" : "success"}
          onClick={enviar}
          disabled={saving || Boolean(error)}
        >
          {bloquear ? "Bloquear" : "Desbloquear"}
        </Button>
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
  // Pestaña activa: "tarjetas" (grilla de la 06) o "plano" (mosaico por número, D-FM14). Solo en memoria.
  const [vista, setVista] = useState("tarjetas");

  // `null` = todavía no cargado: nunca se muestra como "no hay cocheras" (D-FF12).
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [q, setQ] = useState("");

  // El reloj de la pantalla: entra como parámetro a la lógica pura y se refresca solo.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Detalle: `detalleId` null = cerrado; cada cambio de `detalleKey` lo vuelve a pedir.
  const [detalleId, setDetalleId] = useState(null);
  const [detalleKey, setDetalleKey] = useState(0);
  const [detalle, setDetalle] = useState(null);

  // Diálogo abierto: null | "alta" | "editar" | "bloquear" | "desbloquear".
  const [dialog, setDialog] = useState(null);

  const recargarLista = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setListKey((k) => k + 1);
  }, []);

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

  // Lista. La bandera `ignore` descarta una respuesta que llegó tarde.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listCocheras();
        if (ignore) return;
        setItems(data);
        setNow(new Date());
      } catch (e) {
        if (ignore) return;
        setItems(null);
        setLoadError(true);
        showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [listKey]);

  // Detalle. Dos clics seguidos dejan el detalle del último: el efecto anterior se descarta (D-FF12).
  useEffect(() => {
    if (detalleId === null) return undefined;
    let ignore = false;
    (async () => {
      try {
        const data = await getCochera(detalleId, { historialTake: 20 });
        if (ignore) return;
        setDetalle(data);
        setNow(new Date());
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
    <Button variant="contained" onClick={() => setDialog("alta")}>
      Agregar cocheras
    </Button>
  ) : null;

  let grilla;
  if (loading) {
    grilla = (
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={150} />
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
  } else if (vista === "plano") {
    // Misma lista ya cargada (y filtrada por número); el clic abre el mismo detalle.
    grilla = <PlanoGrilla items={filtered} onSelect={abrirDetalle} />;
  } else {
    grilla = (
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_COLUMNS }}>
        {filtered.map((c) => (
          <CocheraCard key={c.id} c={c} now={now} formatInstant={formatInstant} onClick={() => abrirDetalle(c.id)} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5">
          Cocheras
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Visualización rápida del estado de cada cochera.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Button variant="contained" onClick={recargarLista} disabled={loading}>
          Refrescar
        </Button>

        {/* Con la lista vacía el botón se ofrece en el estado vacío, para no repetirlo. */}
        {items && items.length > 0 ? botonAgregar : null}

        <TextField
          size="small"
          label="Buscar por número"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: { xs: "100%", sm: 260 } }}
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Tabs
        value={vista}
        onChange={(_, v) => setVista(v)}
        aria-label="Vista de cocheras"
        sx={{ mb: 2, width: "fit-content", maxWidth: "100%" }}
      >
        <Tab value="tarjetas" label="Tarjetas" />
        <Tab value="plano" label="Plano" />
      </Tabs>

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
                      <Typography fontWeight={900}>{ocupa.clienteNombre}</Typography>
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
                                fontWeight={800}
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
          <Button onClick={cerrarDetalle}>Cerrar</Button>
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
