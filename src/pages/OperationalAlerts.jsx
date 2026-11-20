// Alertas operativas: listado paginado con filtros, resolución con comentario y enlaces (spec 05).
// La lógica de decisión (query, permisos de resolución, enlaces) vive en src/utils/alertas.js.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { alpha } from "@mui/material/styles";
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
  LinearProgress,
  Link,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { showApiError } from "../api/errors";
import { getAlerta, listAlertas, resolveAlerta } from "../api/operationalAlertsApi";
import { usePermissions } from "../auth/usePermissions";
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import BotonRefrescar from "../componentes/ui/BotonRefrescar";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import PaginacionTexto from "../componentes/ui/PaginacionTexto";
import Tarjeta from "../componentes/ui/Tarjeta";
import { SeveridadAlerta, TipoAlertaOperativa, colorOf, labelOf, optionsOf } from "../constants/enums";
import { COLOR_TONE, DOT_RADIUS, RADIUS } from "../theme/theme";
import {
  ALERTS_REFRESH_MS,
  DEFAULT_ALERT_FILTERS,
  MAX_COMENTARIO,
  MSG_COMENTARIO_OBLIGATORIO,
  buildAlertQuery,
  buildResolveBody,
  getAlertLinks,
  getResolveState,
  parseAlertFiltersFromSearch,
  resolutionSummary,
} from "../utils/alertas";
import { formatNumber } from "../utils/formato";
import { usePagination } from "../utils/usePagination";
import { useAutoRefresh } from "../utils/useAutoRefresh";
import { useTenantDates } from "../utils/useTenantDates";

const SEVERIDAD_OPTIONS = optionsOf(SeveridadAlerta, { allLabel: "Todas" });
const TIPO_OPTIONS = optionsOf(TipoAlertaOperativa, { allLabel: "Todos" });
const ESTADO_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "false", label: "Abiertas" },
  { value: "true", label: "Resueltas" },
];

// Código de la API cuando alguien (o el job) ya resolvió la alerta.
const ALERTA_RESUELTA = "alerta_resuelta";

function AlertRow({ alerta, formatInstant, can, onResolve }) {
  const resolve = getResolveState(alerta, can);
  const links = getAlertLinks(alerta, {
    canTrazabilidad: can("auditoria.ver"),
    canOcupaciones: can("ocupaciones.ver"),
    canCaja: can("caja.ver"),
  });
  const ocupacionLink = links.find((l) => l.key === "ocupacion");
  const otherLinks = links.filter((l) => l.key !== "ocupacion");
  const resolucion = resolutionSummary(alerta, formatInstant);
  const critica = !alerta.resuelta && alerta.severidad === SeveridadAlerta.CRITICA;
  // Tono de la franja lateral: el de la severidad (Baja en gris, `gr`).
  const tono = COLOR_TONE[colorOf(SeveridadAlerta, alerta.severidad)] ?? "de";

  const resolveButton = (
    <Button variant="contained" color="error" disabled={!resolve.enabled} onClick={() => onResolve(alerta)}>
      Resolver alerta
    </Button>
  );

  return (
    <Tarjeta
      relleno={false}
      sx={(theme) => ({
        bgcolor: "background.paper",
        borderRadius: `${RADIUS}px`,
        overflow: "hidden",
        boxShadow: theme.palette.pc.alertShadow,
        borderColor: critica ? alpha(theme.palette.pc.tone.er.text, 0.55) : "divider",
        opacity: alerta.resuelta ? 0.92 : 1,
      })}
    >
      <Stack direction={{ xs: "column", md: "row" }}>
        {/* Franja lateral de severidad: a la izquierda en desktop y arriba, en fila, en mobile */}
        <Stack
          direction={{ xs: "row", md: "column" }}
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ xs: "center", md: "flex-start" }}
          sx={(t) => {
            const tone = t.palette.pc.tone[tono];
            return {
              p: 2.25,
              flexShrink: 0,
              width: { md: 150 },
              bgcolor: tone.bg,
              borderBottom: { xs: `1px solid ${tone.border}`, md: "none" },
              borderRight: { md: `1px solid ${tone.border}` },
            };
          }}
        >
          <Typography sx={(t) => ({ color: t.palette.pc.tone[tono].text, fontSize: "1.25rem", fontWeight: 800 })}>
            {labelOf(SeveridadAlerta, alerta.severidad)}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap>
            <Box
              component="span"
              aria-hidden
              sx={(t) => {
                const color = alerta.resuelta ? t.palette.pc.tone.ok.text : t.palette.pc.tone[tono].text;
                return {
                  width: 9,
                  height: 9,
                  flexShrink: 0,
                  borderRadius: DOT_RADIUS,
                  bgcolor: color,
                  ...(!alerta.resuelta && {
                    boxShadow: `0 0 0 4px ${alpha(color, 0.18)}`,
                    animation: critica ? "pcBlink 1s ease-in-out infinite" : "pcBlink 1.8s ease-in-out infinite",
                  }),
                };
              }}
            />
            <Typography variant="body2" component="span">
              {alerta.resuelta ? "Resuelta" : "Abierta"}
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minWidth: 0, py: 2, px: 2.75 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6">{labelOf(TipoAlertaOperativa, alerta.tipo)}</Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {alerta.mensaje}
                </Typography>
                <Typography variant="meta" color="text.secondary" sx={{ mt: 0.5 }}>
                  {alerta.ocupacionId != null ? `Ocupación #${alerta.ocupacionId} · ` : ""}
                  {alerta.cajaSesionId != null ? `Caja #${alerta.cajaSesionId} · ` : ""}
                  Creada {formatInstant(alerta.fechaCreacion)}
                </Typography>
                {alerta.esDeDinero && <Chip size="small" variant="outlined" label="Dinero" sx={{ mt: 1 }} />}
              </Box>
            </Stack>

            {resolucion && (
              <Alert severity="success" icon={false} sx={{ py: 0 }}>
                {resolucion.text}
                {resolucion.comentario ? ` · ${resolucion.comentario}` : ""}
              </Alert>
            )}

            <Divider />

            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
                {ocupacionLink && (
                  <Button variant="neutro" component={RouterLink} to={ocupacionLink.to}>
                    {ocupacionLink.label}
                  </Button>
                )}
                {otherLinks.map((l) => (
                  <Link key={l.key} component={RouterLink} to={l.to}>
                    {l.label}
                  </Link>
                ))}
              </Stack>

              {resolve.visible && (
                <Stack direction="row" spacing={1.5} useFlexGap alignItems="center" flexWrap="wrap">
                  {resolve.enabled ? (
                    resolveButton
                  ) : (
                    <>
                      <Tooltip title={resolve.reason}>
                        {/* El botón deshabilitado no dispara eventos: el Tooltip se ancla al contenedor. */}
                        <Box component="span">{resolveButton}</Box>
                      </Tooltip>
                      <Typography variant="meta" color="text.secondary">
                        {resolve.reason}
                      </Typography>
                    </>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Tarjeta>
  );
}

function ResolveDialog({ alerta, comentario, onChange, resolving, onCancel, onConfirm }) {
  const esDeDinero = Boolean(alerta?.esDeDinero);
  const vacio = comentario.trim() === "";
  const fullScreen = useDialogFullScreen();
  return (
    <Dialog open={Boolean(alerta)} onClose={resolving ? undefined : onCancel} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>Resolver alerta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{alerta ? labelOf(TipoAlertaOperativa, alerta.tipo) : ""}</Typography>
            <Typography variant="body2" color="text.secondary">
              {alerta?.mensaje}
            </Typography>
          </Box>

          <TextField
            label="Comentario de resolución"
            value={comentario}
            onChange={(e) => onChange(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            required={esDeDinero}
            placeholder="Ej: Validado manualmente por administración."
            helperText={`${esDeDinero ? MSG_COMENTARIO_OBLIGATORIO : "Opcional"} · ${comentario.length}/${MAX_COMENTARIO}`}
            slotProps={{ htmlInput: { maxLength: MAX_COMENTARIO } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contorno" onClick={onCancel} disabled={resolving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={resolving || (esDeDinero && vacio)}
        >
          Resolver
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OperationalAlerts() {
  const { can } = usePermissions();
  const { timeZone, formatInstant } = useTenantDates();
  const [searchParams] = useSearchParams();

  // Los filtros iniciales se leen una vez de la URL (D-FE6); después la URL no se reescribe.
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_ALERT_FILTERS,
    ...parseAlertFiltersFromSearch(searchParams),
  }));
  const pagination = usePagination();
  const { page, pageSize, reset, fit } = pagination;

  const query = useMemo(
    () => buildAlertQuery({ ...filters, page, pageSize }, timeZone),
    [filters, page, pageSize, timeZone],
  );
  const queryKey = query.ok ? JSON.stringify(query.params) : null;

  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${queryKey}|${reloadKey}`;
  // Datos de la última respuesta (`key` es el query que los pidió) y cómo terminó el último pedido.
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [lastAttemptAt, setLastAttemptAt] = useState(null);
  // Un fallo de una actualización automática no abre un aviso (D-FE12); lo demás sí.
  const modeRef = useRef("manual");
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!query.ok) {
      inFlightRef.current = false;
      return undefined;
    }
    const manual = modeRef.current !== "auto";
    modeRef.current = "manual";
    inFlightRef.current = true;
    // Una respuesta de un pedido que ya no es el último se descarta: al cambiar filtros o recargar,
    // la limpieza marca el pedido viejo como descartado.
    let ignore = false;
    (async () => {
      try {
        const res = await listAlertas(query.params);
        if (ignore) return;
        setData({ key: queryKey, items: res.items, total: res.total });
        setLastLoadedAt(Date.now());
        setOutcome({ key: requestKey, failed: false });
        fit(res.total);
      } catch (e) {
        if (ignore) return;
        if (manual) showApiError(e);
        setOutcome({ key: requestKey, failed: true });
      } finally {
        if (!ignore) {
          inFlightRef.current = false;
          setLastAttemptAt(Date.now());
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [query, queryKey, requestKey, fit]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Resolver con el diálogo abierto no se mezcla con un refresco (D-FE12).
  const [selected, setSelected] = useState(null);
  const [comentario, setComentario] = useState("");
  const [resolving, setResolving] = useState(false);

  const refreshAuto = useCallback(() => {
    if (inFlightRef.current) return;
    modeRef.current = "auto";
    reload();
  }, [reload]);
  useAutoRefresh({
    lastAttemptAt,
    onRefresh: refreshAuto,
    intervalMs: ALERTS_REFRESH_MS,
    enabled: !selected,
  });

  const loading = query.ok && outcome?.key !== requestKey;
  const failed = query.ok && outcome?.key === requestKey && outcome.failed;
  const current = data && data.key === queryKey ? data : null;

  function setFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value }));
    reset();
  }

  function replaceRow(alerta) {
    setData((d) => (d ? { ...d, items: d.items.map((a) => (a.id === alerta.id ? alerta : a)) } : d));
  }

  function openResolve(alerta) {
    setSelected(alerta);
    setComentario("");
  }

  function closeResolve() {
    setSelected(null);
    setComentario("");
  }

  async function confirmResolve() {
    if (!selected) return;
    const body = buildResolveBody(selected, comentario);
    if (!body.ok) {
      toast.error(body.message);
      return;
    }

    const id = selected.id;
    setResolving(true);
    // No se reintenta solo: resolver no es idempotente (un segundo envío da 409).
    try {
      const resuelta = await resolveAlerta(id, body.body);
      replaceRow(resuelta);
      toast.success("Alerta resuelta correctamente");
      closeResolve();
    } catch (e) {
      showApiError(e);
      if (e?.code === ALERTA_RESUELTA) {
        // Alguien la resolvió antes: se cierra el diálogo y la fila se refresca con lo que dice la API.
        closeResolve();
        try {
          replaceRow(await getAlerta(id));
        } catch (e2) {
          showApiError(e2);
          reload();
        }
      }
    } finally {
      setResolving(false);
    }
  }

  const total = current?.total ?? 0;

  function renderBody() {
    if (!query.ok) return <Alert severity="warning">{query.message}</Alert>;
    if (!current) {
      if (failed) {
        return (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={reload}>
                Reintentar
              </Button>
            }
          >
            No pudimos cargar las alertas.
          </Alert>
        );
      }
      return (
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </Stack>
      );
    }

    return (
      <Stack spacing={1.5}>
        {loading && <LinearProgress />}
        {current.items.length === 0 ? (
          <Tarjeta>
            <Typography sx={{ color: "text.secondary" }}>No hay alertas para los filtros seleccionados.</Typography>
          </Tarjeta>
        ) : (
          current.items.map((a) => (
            <AlertRow key={a.id} alerta={a} formatInstant={formatInstant} can={can} onResolve={openResolve} />
          ))
        )}
        <PaginacionTexto
          page={page}
          pageSize={pageSize}
          total={total}
          count={current.items.length}
          onPageChange={pagination.setPage}
        />
      </Stack>
    );
  }

  const rangeError = (field) => (!query.ok && query.field === field ? query.message : undefined);

  return (
    <Box>
      <EncabezadoPagina
        titulo="Alertas operativas"
        subtitulo="Monitoreo de inconsistencias, pagos sospechosos y ocupaciones con riesgo operativo."
        acciones={<BotonRefrescar onClick={reload} disabled={loading} />}
        pie={lastLoadedAt !== null ? `Actualizado: ${formatInstant(new Date(lastLoadedAt).toISOString())}` : null}
      >
        {failed && current && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            No se pudo actualizar. Reintentá con 'Actualizar'
          </Typography>
        )}
      </EncabezadoPagina>

      <Stack spacing={2}>
        <Tarjeta>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "1fr 1fr 1.5fr 1.5fr 1.5fr" },
              alignItems: "start",
            }}
          >
            <Campo select label="Estado" value={filters.estado} onChange={(e) => setFilter("estado", e.target.value)}>
              {ESTADO_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Campo>

            <Campo select label="Severidad" value={filters.severidad} onChange={(e) => setFilter("severidad", e.target.value)}>
              {SEVERIDAD_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Campo>

            <Campo select label="Tipo" value={filters.tipo} onChange={(e) => setFilter("tipo", e.target.value)}>
              {TIPO_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Campo>

            <Campo
              label="Desde"
              type="date"
              value={filters.desde}
              onChange={(e) => setFilter("desde", e.target.value)}
              error={Boolean(rangeError("desde"))}
              helperText={rangeError("desde")}
            />

            <Campo
              label="Hasta"
              type="date"
              value={filters.hasta}
              onChange={(e) => setFilter("hasta", e.target.value)}
              error={Boolean(rangeError("hasta"))}
              helperText={rangeError("hasta")}
            />
          </Box>

          {(filters.ocupacionId !== null || filters.cajaSesionId !== null) && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {filters.ocupacionId !== null && (
                <Chip
                  variant="outlined"
                  label={`Ocupación ${filters.ocupacionId}`}
                  onDelete={() => setFilter("ocupacionId", null)}
                />
              )}
              {filters.cajaSesionId !== null && (
                <Chip variant="outlined" label={`Caja ${filters.cajaSesionId}`} onDelete={() => setFilter("cajaSesionId", null)} />
              )}
            </Stack>
          )}
        </Tarjeta>

        {query.ok && current && (
          <Typography variant="body2" color="text.secondary">
            {formatNumber(total)} {total === 1 ? "alerta" : "alertas"}
          </Typography>
        )}

        {renderBody()}
      </Stack>

      <ResolveDialog
        alerta={selected}
        comentario={comentario}
        onChange={setComentario}
        resolving={resolving}
        onCancel={closeResolve}
        onConfirm={confirmResolve}
      />
    </Box>
  );
}
