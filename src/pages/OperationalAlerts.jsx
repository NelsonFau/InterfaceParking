// Alertas operativas: listado paginado con filtros, resolución con comentario y enlaces (spec 05).
// La lógica de decisión (query, permisos de resolución, enlaces) vive en src/utils/alertas.js.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Divider,
  LinearProgress,
  MenuItem,
  Skeleton,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { showApiError } from "../api/errors";
import { getAlerta, listAlertas, resolveAlerta } from "../api/operationalAlertsApi";
import { usePermissions } from "../auth/usePermissions";
import { SeveridadAlerta, TipoAlertaOperativa, colorOf, labelOf, optionsOf } from "../constants/enums";
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
import { toTablePaginationProps } from "../utils/paginacion";
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
  const links = getAlertLinks(alerta, { canTrazabilidad: can("auditoria.ver") });
  const resolucion = resolutionSummary(alerta, formatInstant);
  const critica = !alerta.resuelta && alerta.severidad === SeveridadAlerta.CRITICA;

  const resolveButton = (
    <Button variant="contained" color="error" disabled={!resolve.enabled} onClick={() => onResolve(alerta)}>
      Resolver alerta
    </Button>
  );

  return (
    <Card sx={{ borderRadius: 3, border: "1px solid", borderColor: critica ? "error.main" : "divider" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                label={labelOf(SeveridadAlerta, alerta.severidad)}
                color={colorOf(SeveridadAlerta, alerta.severidad)}
                sx={{ fontWeight: 800 }}
              />
              <Chip
                size="small"
                label={alerta.resuelta ? "RESUELTA" : "ABIERTA"}
                color={alerta.resuelta ? "success" : "warning"}
                variant={alerta.resuelta ? "filled" : "outlined"}
                sx={{ fontWeight: 800 }}
              />
              {alerta.esDeDinero && <Chip size="small" label="DINERO" color="secondary" sx={{ fontWeight: 800 }} />}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Creada: {formatInstant(alerta.fechaCreacion)}
            </Typography>
          </Stack>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {labelOf(TipoAlertaOperativa, alerta.tipo)}
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{alerta.mensaje}</Typography>
          </Box>

          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
                {alerta.ocupacionId != null && (
                  <Typography variant="body2" color="text.secondary">
                    Ocupación {alerta.ocupacionId}
                  </Typography>
                )}
                {alerta.cajaSesionId != null && (
                  <Typography variant="body2" color="text.secondary">
                    Caja {alerta.cajaSesionId}
                  </Typography>
                )}
                {links.map((l) => (
                  <Button key={l.key} size="small" component={RouterLink} to={l.to}>
                    {l.label}
                  </Button>
                ))}
              </Stack>

              {resolucion && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {resolucion.text}
                  </Typography>
                  {resolucion.comentario && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {resolucion.comentario}
                    </Typography>
                  )}
                </>
              )}
            </Stack>

            {resolve.visible &&
              (resolve.enabled ? (
                resolveButton
              ) : (
                <Tooltip title={resolve.reason}>
                  {/* El botón deshabilitado no dispara eventos: el Tooltip se ancla al contenedor. */}
                  <Box component="span" sx={{ alignSelf: { xs: "stretch", md: "flex-start" } }}>
                    {resolveButton}
                  </Box>
                </Tooltip>
              ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ResolveDialog({ alerta, comentario, onChange, resolving, onCancel, onConfirm }) {
  const esDeDinero = Boolean(alerta?.esDeDinero);
  const vacio = comentario.trim() === "";
  return (
    <Dialog open={Boolean(alerta)} onClose={resolving ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Resolver alerta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{alerta ? labelOf(TipoAlertaOperativa, alerta.tipo) : ""}</Typography>
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
        <Button onClick={onCancel} disabled={resolving}>
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
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography sx={{ color: "text.secondary" }}>No hay alertas para los filtros seleccionados.</Typography>
            </CardContent>
          </Card>
        ) : (
          current.items.map((a) => (
            <AlertRow key={a.id} alerta={a} formatInstant={formatInstant} can={can} onResolve={openResolve} />
          ))
        )}
        <TablePagination
          component="div"
          {...toTablePaginationProps(
            { page, pageSize, total },
            { onPageChange: pagination.setPage, onPageSizeChange: pagination.setPageSize },
          )}
        />
      </Stack>
    );
  }

  const rangeError = (field) => (!query.ok && query.field === field ? query.message : undefined);

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Alertas operativas
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Monitoreo de inconsistencias, pagos sospechosos y ocupaciones con riesgo operativo.
            </Typography>
          </Box>

          <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.5}>
            <Button variant="outlined" onClick={reload} disabled={loading}>
              Actualizar
            </Button>
            {lastLoadedAt !== null && (
              <Typography variant="caption" color="text.secondary">
                Actualizado: {formatInstant(new Date(lastLoadedAt).toISOString())}
              </Typography>
            )}
            {failed && current && (
              <Typography variant="caption" color="error">
                No se pudo actualizar. Reintentá con 'Actualizar'
              </Typography>
            )}
          </Stack>
        </Stack>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap" alignItems="flex-start">
              <TextField
                select
                label="Estado"
                value={filters.estado}
                onChange={(e) => setFilter("estado", e.target.value)}
                sx={{ minWidth: 180 }}
              >
                {ESTADO_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Severidad"
                value={filters.severidad}
                onChange={(e) => setFilter("severidad", e.target.value)}
                sx={{ minWidth: 180 }}
              >
                {SEVERIDAD_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Tipo"
                value={filters.tipo}
                onChange={(e) => setFilter("tipo", e.target.value)}
                sx={{ minWidth: 260 }}
              >
                {TIPO_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Desde"
                type="date"
                value={filters.desde}
                onChange={(e) => setFilter("desde", e.target.value)}
                error={Boolean(rangeError("desde"))}
                helperText={rangeError("desde")}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Hasta"
                type="date"
                value={filters.hasta}
                onChange={(e) => setFilter("hasta", e.target.value)}
                error={Boolean(rangeError("hasta"))}
                helperText={rangeError("hasta")}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            {(filters.ocupacionId !== null || filters.cajaSesionId !== null) && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {filters.ocupacionId !== null && (
                  <Chip
                    label={`Ocupación ${filters.ocupacionId}`}
                    onDelete={() => setFilter("ocupacionId", null)}
                  />
                )}
                {filters.cajaSesionId !== null && (
                  <Chip
                    label={`Caja ${filters.cajaSesionId}`}
                    onDelete={() => setFilter("cajaSesionId", null)}
                  />
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

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
