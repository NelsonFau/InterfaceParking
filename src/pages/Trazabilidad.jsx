// Trazabilidad: línea de tiempo de eventos de auditoría, pagos, devoluciones, caja y alertas
// (spec 04; reemplaza a Auditoría). Los filtros aplicados viven en la URL (D-FD5): "Buscar", los chips
// de objeto, "Limpiar", "atrás" y los enlaces de otras pantallas siguen todos el mismo camino.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  LinearProgress,
  Link,
  MenuItem,
  Skeleton,
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
import { showApiError } from "../api/errors";
import { listTrazabilidad } from "../api/trazabilidadApi";
import { listUsuarios } from "../api/usuariosApi";
import { usePermissions } from "../auth/usePermissions";
import DetalleEventoDialog from "../componentes/DetalleEventoDialog";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import PaginacionTexto from "../componentes/ui/PaginacionTexto";
import Tarjeta from "../componentes/ui/Tarjeta";
import { AccionTrazabilidad, Fuente, colorOf, labelOf, optionsOf } from "../constants/enums";
import { formatNumber } from "../utils/formato";
import { canonicalKey, resumenDeEvento } from "../utils/trazabilidadEvento";
import { defaultFiltros, hasObjeto, toApiParams, validateFiltros } from "../utils/trazabilidadFiltros";
import { buildTrazabilidadPath, parseTrazabilidadQuery } from "../utils/trazabilidadLink";
import { usePagination } from "../utils/usePagination";
import { useTenantDates } from "../utils/useTenantDates";

const FUENTE_OPTIONS = optionsOf(Fuente);
const PAGE_SIZE = 50;
// Tras este tiempo de espera se avisa que un rango largo puede tardar (D-FD7).
const SLOW_HINT_MS = 1500;

// Nombre de cada parámetro ignorado tal como se le muestra al usuario.
const IGNORADO_TEXTO = {
  ocupacionId: "ocupación",
  pagoId: "pago",
  cajaSesionId: "sesión de caja",
  usuarioId: "usuario",
  fuente: "fuente",
  desde: "rango de fechas",
  hasta: "rango de fechas",
};

function ignoradosTexto(ignorados) {
  return [...new Set(ignorados.map((k) => IGNORADO_TEXTO[k] ?? k))].join(", ");
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

const draftFrom = (applied) => ({
  ocupacionId: applied.ocupacionId ? String(applied.ocupacionId) : "",
  pagoId: applied.pagoId ? String(applied.pagoId) : "",
  cajaSesionId: applied.cajaSesionId ? String(applied.cajaSesionId) : "",
  usuarioId: applied.usuarioId ? String(applied.usuarioId) : "",
  fuente: applied.fuente ?? [],
  desde: applied.desde ?? "",
  hasta: applied.hasta ?? "",
});

const optionLabel = (u) => `${u.nombre}${u.activo === false ? " (inactivo)" : ""}`;

function UsuarioFilter({ value, onChange, error, usuarios, selector }) {
  const id = value === "" ? null : Number(value);
  if (!selector) {
    // Sin `usuarios.ver`, o si la lista no cargó: la pantalla sigue funcionando con el ID a mano.
    return (
      <Campo
        label="ID de usuario"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(error)}
        helperText={error}
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
      />
    );
  }
  const lista = usuarios ?? [];
  const actual = id === null ? null : (lista.find((u) => u.id === id) ?? { id, nombre: `Usuario #${id}`, email: "" });
  const opciones = actual && !lista.some((u) => u.id === actual.id) ? [actual, ...lista] : lista;
  return (
    <Autocomplete
      size="small"
      options={opciones}
      loading={usuarios === null}
      value={actual}
      onChange={(_e, option) => onChange(option ? String(option.id) : "")}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={optionLabel}
      noOptionsText="Sin usuarios"
      loadingText="Cargando usuarios…"
      renderOption={(props, u) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}>
            <Stack direction="row" spacing={1} alignItems="baseline">
              <Typography variant="body2">{optionLabel(u)}</Typography>
              {u.email && (
                <Typography variant="caption" color="text.secondary">
                  {u.email}
                </Typography>
              )}
            </Stack>
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} label="Usuario" error={Boolean(error)} helperText={error} />}
    />
  );
}

// Se remonta (por `key`) cuando cambian los filtros aplicados, así el borrador siempre parte de la URL.
function Filtros({ applied, loading, onSearch, onClear, usuarios, usuariosSelector }) {
  const [draft, setDraft] = useState(() => draftFrom(applied));
  const [errors, setErrors] = useState({});
  const { timeZone } = useTenantDates();

  const set = (campo, valor) => {
    setDraft((d) => ({ ...d, [campo]: valor }));
    setErrors((e) => ({ ...e, [campo]: undefined, rango: undefined }));
  };

  function submit(e) {
    e.preventDefault();
    // Se valida antes de llamar a la API (D-FD6): un error de regla no gasta un pedido.
    const r = validateFiltros(draft, timeZone);
    setErrors(r.errors);
    if (r.ok) onSearch(draft);
  }

  const idField = (campo, label) => (
    <Campo
      label={label}
      value={draft[campo]}
      onChange={(e) => set(campo, e.target.value)}
      error={Boolean(errors[campo])}
      helperText={errors[campo]?.message}
      slotProps={{ htmlInput: { inputMode: "numeric" } }}
    />
  );

  return (
    <Tarjeta>
      <Box component="form" onSubmit={submit} noValidate>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(7, minmax(0, 1fr)) auto auto",
            },
            alignItems: "end",
          }}
        >
          <Campo
            label="Desde"
            type="date"
            value={draft.desde}
            onChange={(e) => set("desde", e.target.value)}
            error={Boolean(errors.desde)}
            helperText={errors.desde?.message}
          />
          <Campo
            label="Hasta"
            type="date"
            value={draft.hasta}
            onChange={(e) => set("hasta", e.target.value)}
            error={Boolean(errors.hasta)}
            helperText={errors.hasta?.message}
          />
          {idField("ocupacionId", "Ocupación (ID)")}
          {idField("pagoId", "Pago (ID)")}
          {idField("cajaSesionId", "Sesión de caja (ID)")}
          <UsuarioFilter
            value={draft.usuarioId}
            onChange={(v) => set("usuarioId", v)}
            error={errors.usuarioId?.message}
            usuarios={usuarios}
            selector={usuariosSelector}
          />
          <Campo
            select
            label="Fuente"
            value={draft.fuente}
            onChange={(e) => set("fuente", e.target.value)}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (sel) => (sel.length === 0 ? "Todas" : sel.map((v) => labelOf(Fuente, v)).join(", ")),
              },
            }}
          >
            {FUENTE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Campo>
          <Button type="submit" variant="arena" disabled={loading}>
            Buscar
          </Button>
          <Button type="button" variant="arena" onClick={onClear} disabled={loading}>
            Limpiar
          </Button>
        </Box>
        {errors.rango && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {errors.rango.message}
          </Alert>
        )}
      </Box>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

// Aviso de espera larga: se monta solo mientras carga, así el temporizador arranca con cada búsqueda.
function SlowHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), SLOW_HINT_MS);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <Typography variant="body2" color="text.secondary">
      Buscando eventos… un rango largo puede tardar unos segundos.
    </Typography>
  );
}

function LoadingRows() {
  return (
    <Stack spacing={1}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={44} />
      ))}
    </Stack>
  );
}

function QuienCell({ evento }) {
  if (evento.usuarioNombre) return evento.usuarioNombre;
  if (evento.automatica) return <Chip size="small" label="Automática" />;
  if (evento.usuarioId != null) return `Usuario #${evento.usuarioId}`;
  return "—";
}

function ObjetoChips({ evento, onFilter }) {
  const chips = [];
  const filtrable = (key, texto, id) => chips.push({ key: `${key}-${id}`, texto, onClick: () => onFilter(key, id) });
  if (evento.ocupacionId != null) filtrable("ocupacionId", `Ocupación #${evento.ocupacionId}`, evento.ocupacionId);
  if (evento.pagoId != null) filtrable("pagoId", `Pago #${evento.pagoId}`, evento.pagoId);
  if (evento.cajaSesionId != null) filtrable("cajaSesionId", `Caja #${evento.cajaSesionId}`, evento.cajaSesionId);
  // El backend no filtra por alerta ni por entidad: esos chips no son clicables (D-FD9).
  if (evento.alertaId != null) chips.push({ key: `alerta-${evento.alertaId}`, texto: `Alerta #${evento.alertaId}` });
  // La entidad "Ocupacion" repite el chip de la ocupación.
  if (evento.entidad && evento.entidadId != null && !(evento.entidad === "Ocupacion" && evento.ocupacionId != null)) {
    chips.push({
      key: `entidad-${evento.entidad}-${evento.entidadId}`,
      texto: `${evento.entidad} · ${evento.entidadId}`,
    });
  }
  if (chips.length === 0) return "—";
  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {chips.map((c) => (
        <Chip key={c.key} size="small" variant="outlined" label={c.texto} onClick={c.onClick} />
      ))}
    </Stack>
  );
}

// Se remonta (por `key`) con cada conjunto de filtros: la página vuelve a 1 y no queda estado de la búsqueda anterior.
function Panel({ applied, path, onNavigate, usuarios, usuariosSelector }) {
  const { timeZone, formatInstant } = useTenantDates();
  const pagination = usePagination({ pageSize: PAGE_SIZE });
  const { page, pageSize } = pagination;
  const [reloadKey, setReloadKey] = useState(0);
  // `{ key, data }` o `{ key, error: true }` del último pedido que terminó.
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);

  const validation = useMemo(() => validateFiltros(applied, timeZone), [applied, timeZone]);
  const key = `${page}|${pageSize}|${reloadKey}`;

  useEffect(() => {
    if (!validation.ok) return undefined;
    // Una respuesta de un pedido que ya no es el último se descarta (D-FD7): al cambiar la página o
    // el reintento, la limpieza marca el pedido viejo como descartado.
    let ignore = false;
    (async () => {
      try {
        const data = await listTrazabilidad({ ...toApiParams(applied, timeZone), page, pageSize });
        if (!ignore) setResult({ key, data });
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setResult({ key, error: true });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [validation.ok, applied, timeZone, page, pageSize, key]);

  // Sin validación no hay pedido; con un resultado de otra página o de otro intento, se espera el nuevo.
  const loading = validation.ok && result?.key !== key;

  const onSearch = (draft) => {
    const next = buildTrazabilidadPath(draft);
    // Los mismos filtros que ya están aplicados: "Buscar" vuelve a pedir en vez de no hacer nada.
    if (next === path) setReloadKey((k) => k + 1);
    else onNavigate(next);
  };
  const onClear = () => onNavigate(buildTrazabilidadPath(defaultFiltros(timeZone)), { replace: true });
  const onFilterObject = (campo, id) => onNavigate(buildTrazabilidadPath({ [campo]: id }));

  function renderBody() {
    if (!validation.ok) {
      return (
        <Alert severity="warning">
          {Object.values(validation.errors)
            .map((e) => e.message)
            .join(" ")}
        </Alert>
      );
    }

    if (loading) {
      return (
        <Stack spacing={1.5}>
          <LinearProgress />
          <SlowHint />
          <LoadingRows />
        </Stack>
      );
    }

    if (result.error) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar los eventos.
        </Alert>
      );
    }

    const { items, total } = result.data;

    return (
      <Stack spacing={1}>
        <Typography variant="body2">
          {total === 0 ? "Sin resultados" : `${formatNumber(total)} ${total === 1 ? "evento" : "eventos"}`}
        </Typography>
        {items.length === 0 ? (
          <Alert severity="info">No hay eventos para estos filtros.</Alert>
        ) : (
          <Tarjeta>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Fuente</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Quién</TableCell>
                  <TableCell>Objeto</TableCell>
                  <TableCell>Resumen</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((ev, i) => {
                  const fuente = canonicalKey(ev.fuente);
                  const accion = canonicalKey(ev.accion);
                  return (
                    <TableRow key={`${ev.fecha}-${fuente}-${accion}-${i}`} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatInstant(ev.fecha, { seconds: true })}</TableCell>
                      <TableCell>
                        <Chip size="small" label={labelOf(Fuente, fuente)} color={colorOf(Fuente, fuente)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={labelOf(AccionTrazabilidad, accion)}
                          color={colorOf(AccionTrazabilidad, accion)}
                        />
                      </TableCell>
                      <TableCell>
                        <QuienCell evento={ev} />
                      </TableCell>
                      <TableCell>
                        <ObjetoChips evento={ev} onFilter={onFilterObject} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320, wordBreak: "break-word" }}>{resumenDeEvento(ev)}</TableCell>
                      <TableCell>
                        <Link component="button" type="button" underline="hover" onClick={() => setSelected({ ev, i })}>
                          Ver detalle
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ pt: 2 }}>
            <PaginacionTexto
              page={page}
              pageSize={pageSize}
              total={total}
              count={items.length}
              onPageChange={pagination.setPage}
            />
          </Box>
          </Tarjeta>
        )}
        <DetalleEventoDialog
          key={selected?.i ?? "cerrado"}
          evento={selected?.ev ?? null}
          onClose={() => setSelected(null)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Filtros
        applied={applied}
        loading={loading}
        usuarios={usuarios}
        usuariosSelector={usuariosSelector}
        onSearch={onSearch}
        onClear={onClear}
      />
      {renderBody()}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export default function Trazabilidad() {
  const { timeZone } = useTenantDates();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const parsed = useMemo(() => parseTrazabilidadQuery(searchParams), [searchParams]);
  // Lo que se ignoró del enlace se avisa aunque después la URL se reescriba limpia.
  const [ignorados, setIgnorados] = useState(() => parsed.ignorados);

  // Sin ningún objeto ni rango válidos, se aplica el rango por defecto (D-FD5 regla 2 y D-FD6).
  const needsDefault = !hasObjeto(parsed.filtros) && !(parsed.filtros.desde && parsed.filtros.hasta);
  const { desde: defDesde, hasta: defHasta } = defaultFiltros(timeZone);
  const normalized = needsDefault ? { ...parsed.filtros, desde: defDesde, hasta: defHasta } : parsed.filtros;
  const appliedPath = buildTrazabilidadPath(normalized);
  // Identidad estable mientras no cambien los filtros: sirve de dependencia del pedido.
  const applied = useMemo(() => parseTrazabilidadQuery(appliedPath.split("?")[1] ?? "").filtros, [appliedPath]);

  // La URL es la fuente de verdad: si trae algo faltante o inválido, se reescribe normalizada, con replace.
  const dirty = needsDefault || parsed.ignorados.length > 0;
  useEffect(() => {
    if (dirty) navigate(appliedPath, { replace: true });
  }, [dirty, appliedPath, navigate]);

  const canListUsuarios = can("usuarios.ver");
  const [usuarios, setUsuarios] = useState(null);
  const [usuariosFailed, setUsuariosFailed] = useState(false);
  useEffect(() => {
    if (!canListUsuarios) return undefined;
    let ignore = false;
    (async () => {
      try {
        const data = await listUsuarios();
        if (!ignore) setUsuarios(data);
      } catch {
        // Sin toast: la pantalla funciona sin el selector (D-FD8).
        if (!ignore) setUsuariosFailed(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [canListUsuarios]);

  const goTo = (path, options) => {
    setIgnorados([]);
    navigate(path, options);
  };

  return (
    <Box>
      <EncabezadoPagina
        titulo="Trazabilidad"
        subtitulo="Qué pasó, quién lo hizo y cuándo: auditoría, pagos, devoluciones, caja y alertas en una sola línea de tiempo."
      />

      {ignorados.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setIgnorados([])}>
          Ignoramos filtros del enlace que no eran válidos: {ignoradosTexto(ignorados)}.
        </Alert>
      )}

      <Panel
        key={appliedPath}
        applied={applied}
        path={appliedPath}
        usuarios={usuarios}
        usuariosSelector={canListUsuarios && !usuariosFailed}
        onNavigate={goTo}
      />
    </Box>
  );
}
