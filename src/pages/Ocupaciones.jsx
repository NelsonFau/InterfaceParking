// Ocupaciones (spec 07): listado con filtros, tarjetas con fase y cuenta, detalle (`/ocupaciones?id=N`) y
// las acciones de escritura (alta, finalizar, cancelar reserva, registrar pago), todas por permiso.
// Esta página solo orquesta estado y MUI: las reglas viven en src/utils/ocupaciones.js y los diálogos en
// src/componentes/ocupaciones/. Después de CUALQUIER escritura se recarga el listado y el detalle abierto
// (los saldos y los estados los calcula el backend).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { listCocheras } from "../api/cocheraApi";
import { showApiError } from "../api/errors";
import { listOcupaciones } from "../api/ocupacionApi";
import { usePermissions } from "../auth/usePermissions";
import ClienteAutocomplete from "../componentes/ClienteAutocomplete";
import AjusteMasivoDialog from "../componentes/ocupaciones/AjusteMasivoDialog";
import AltaOcupacionDialog from "../componentes/ocupaciones/AltaOcupacionDialog";
import CancelarReservaDialog from "../componentes/ocupaciones/CancelarReservaDialog";
import FinalizarOcupacionDialog from "../componentes/ocupaciones/FinalizarOcupacionDialog";
import OcupacionDetalleDialog from "../componentes/ocupaciones/OcupacionDetalleDialog";
import RegistrarPagoDialog from "../componentes/ocupaciones/RegistrarPagoDialog";
import { EstadoOcupacion, TipoOcupacion, labelOf } from "../constants/enums";
import { formatMoney, formatNumber } from "../utils/formato";
import {
  DEFAULT_OCUPACION_FILTERS,
  ESTADO_FILTRO_OPTIONS,
  FASE,
  TAKE_OPTIONS,
  accionesDeOcupacion,
  buildListQueries,
  cuentaRotulos,
  faseChip,
  isTruncated,
  mergeOcupaciones,
  ocupacionFase,
  shouldCloseActionAfter,
  shouldCloseDetailAfter,
  shouldReloadAfter,
  takeOf,
} from "../utils/ocupaciones";
import { parseOcupacionId } from "../utils/ocupacionLink";
import { useTenantDates } from "../utils/useTenantDates";

// Cada cuánto se refresca el reloj de la pantalla (fase y botones), sin pedir nada al servidor.
const TICK_MS = 60_000;

function OcupacionCard({ o, now, can, formatInstant, onVer, onAction }) {
  const fase = ocupacionFase(o, now);
  const chip = faseChip(fase);
  const acciones = accionesDeOcupacion(o, now, can);
  const rotulos = cuentaRotulos(o);
  const topeValor = fase === FASE.FINALIZADA ? (o.precioTotal ?? o.topeDeCobro) : o.topeDeCobro;

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, borderColor: "divider", boxShadow: "0 6px 18px rgba(0,0,0,.06)" }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", mb: 0.5 }} useFlexGap>
              <Typography sx={{ fontWeight: 900 }} noWrap>
                Cochera #{o.cocheraNumero ?? o.cocheraId}
              </Typography>
              <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 700 }} />
              <Chip size="small" variant="outlined" label={labelOf(TipoOcupacion, o.tipo)} sx={{ fontWeight: 700 }} />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.35 }}>
              Cliente: <b>{o.clienteNombre ?? o.clienteId}</b>
              {" · "}
              {fase === FASE.RESERVA ? `Empieza ${formatInstant(o.inicio)}` : `Inicio ${formatInstant(o.inicio)}`}
              {" · "}
              {o.fin ? `Fin ${formatInstant(o.fin)}` : "Sin hora de fin"}
              {fase === FASE.FINALIZADA && o.finReal ? ` · Fin real ${formatInstant(o.finReal)}` : ""}
            </Typography>

            <Typography variant="body2" sx={{ mt: 0.75 }}>
              {rotulos.tope !== null ? (
                <>
                  {rotulos.tope}: <b>{formatMoney(topeValor)}</b> ·{" "}
                </>
              ) : null}
              {rotulos.pagado}: <b>{formatMoney(o.pagado)}</b> · {rotulos.saldo}: <b>{formatMoney(o.saldo)}</b>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => onVer(o.id)} sx={{ borderRadius: 2, fontWeight: 800 }}>
              Ver
            </Button>
            {acciones.registrarPago ? (
              <Button
                color="success"
                variant="contained"
                onClick={() => onAction("pago", o)}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                Registrar pago
              </Button>
            ) : null}
            {acciones.cancelarReserva ? (
              <Button
                color="error"
                variant="contained"
                onClick={() => onAction("cancelar", o)}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                Cancelar reserva
              </Button>
            ) : null}
            {acciones.finalizar ? (
              <Button
                color="success"
                variant="contained"
                onClick={() => onAction("finalizar", o)}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                Finalizar
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Ocupaciones() {
  const { can } = usePermissions();
  const { timeZone, formatInstant } = useTenantDates();
  const [searchParams, setSearchParams] = useSearchParams();

  // El reloj de la pantalla: entra como parámetro a la lógica pura y se refresca solo.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // --- Filtros -----------------------------------------------------------------------------------
  // `filters` es el formulario; `applied`, lo que se pidió con "Aplicar" (el listado no se recarga por tipear).
  const [filters, setFilters] = useState(DEFAULT_OCUPACION_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_OCUPACION_FILTERS);
  const [filterCliente, setFilterCliente] = useState(null);
  const [clienteKey, setClienteKey] = useState(0);
  const [filterError, setFilterError] = useState(null);
  const [cocheras, setCocheras] = useState(null);

  // --- Listado -----------------------------------------------------------------------------------
  // `items` null = todavía no cargado o falló: nunca se muestra como "no hay ocupaciones".
  const [items, setItems] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [detailKey, setDetailKey] = useState(0);

  // Diálogo de escritura abierto: null | { type: "alta" } | { type: "pago" | "cancelar" | "finalizar", id }.
  const [dialog, setDialog] = useState(null);
  // Ocupación que mostraba el diálogo de pago al abrirlo: sirve si la fila ya no está en el listado.
  const [pagoSnapshot, setPagoSnapshot] = useState(null);
  // Detalle abierto, para que el diálogo de pago desde el detalle use sus cifras frescas.
  const [openDetail, setOpenDetail] = useState(null);
  // Spec 10 (D-FJ8): ajuste masivo de precios de los contratos mensuales.
  const [ajusteMasivo, setAjusteMasivo] = useState(false);

  const detailId = parseOcupacionId(searchParams);

  const reloadList = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    setListKey((k) => k + 1);
  }, []);

  const reloadAll = useCallback(() => {
    reloadList();
    setDetailKey((k) => k + 1);
  }, [reloadList]);

  // Cocheras para el filtro: si falla, el filtro queda deshabilitado, sin aviso (la pantalla no depende de él).
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listCocheras();
        if (!ignore) setCocheras(data);
      } catch {
        if (!ignore) setCocheras(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Carga. "Activas" son dos pedidos en paralelo (el backend no incluye las vencidas en `estado=ACTIVA`).
  // Una respuesta de un pedido que ya no es el último se descarta con `ignore`.
  useEffect(() => {
    const queries = buildListQueries(applied, { timeZone, now: new Date() });
    if (!queries.ok) return undefined;
    const take = takeOf(applied.take);
    let ignore = false;
    (async () => {
      try {
        const lists = await Promise.all(queries.queries.map((q) => listOcupaciones(q)));
        if (ignore) return;
        setItems(lists.length > 1 ? mergeOcupaciones(lists, take) : lists[0]);
        setTruncated(isTruncated(lists, take));
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
  }, [applied, listKey, timeZone]);

  const resumen = useMemo(() => {
    const lista = items ?? [];
    const vencidas = lista.filter((x) => (x.estadoCalculado ?? x.estado) === EstadoOcupacion.VENCIDA).length;
    return { total: lista.length, vencidas };
  }, [items]);

  function setFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value }));
    if (filterError?.field === name) setFilterError(null);
  }

  function aplicar() {
    const r = buildListQueries(filters, { timeZone, now: new Date() });
    if (!r.ok) {
      setFilterError({ field: r.field, message: r.message });
      return;
    }
    setFilterError(null);
    setApplied(filters);
    reloadList();
  }

  function limpiar() {
    setFilters(DEFAULT_OCUPACION_FILTERS);
    setFilterCliente(null);
    setClienteKey((k) => k + 1);
    setFilterError(null);
    setApplied(DEFAULT_OCUPACION_FILTERS);
    reloadList();
  }

  // --- Detalle (query `?id=N`, con replace: "atrás" no lo reabre) ------------------------------------
  function verDetalle(id) {
    setSearchParams({ id: String(id) }, { replace: true });
  }

  const cerrarDetalle = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("id");
        return next;
      },
      { replace: true },
    );
    setOpenDetail(null);
  }, [setSearchParams]);

  // --- Acciones y errores ------------------------------------------------------------------------
  function abrirAccion(type, o) {
    if (type === "pago") setPagoSnapshot(o);
    setDialog({ type, id: o.id });
  }

  // Qué hace la pantalla DESPUÉS del aviso de un error de escritura (D-FG7): el aviso ya lo mostró el diálogo.
  function manejarError(err) {
    if (shouldReloadAfter(err.code)) reloadAll();
    if (shouldCloseActionAfter(err.code)) setDialog(null);
    if (shouldCloseDetailAfter(err.code)) cerrarDetalle();
  }

  function terminarEscritura(mensaje) {
    toast.success(mensaje);
    setDialog(null);
    reloadAll();
  }

  // Un error al pedir el detalle: si la ocupación ya no existe, se recarga el listado y se cierra.
  function errorDeDetalle(err) {
    if (shouldReloadAfter(err.code)) reloadList();
    if (shouldCloseDetailAfter(err.code)) cerrarDetalle();
  }

  // La ocupación del diálogo de pago, con las cifras más frescas: detalle abierto, fila del listado o la de apertura.
  const pagoOcupacion = useMemo(() => {
    if (dialog?.type !== "pago") return null;
    if (openDetail?.id === dialog.id) return openDetail;
    return (items ?? []).find((x) => x.id === dialog.id) ?? pagoSnapshot;
  }, [dialog, openDetail, items, pagoSnapshot]);
  const pagoPermitido = pagoOcupacion ? accionesDeOcupacion(pagoOcupacion, now, can).registrarPago : false;

  const cancelOcupacionData = useMemo(() => {
    if (dialog?.type !== "cancelar") return null;
    if (openDetail?.id === dialog.id) return openDetail;
    return (items ?? []).find((x) => x.id === dialog.id) ?? null;
  }, [dialog, openDetail, items]);

  // --- Render ------------------------------------------------------------------------------------
  let cuerpo;
  if (loading) {
    cuerpo = (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={108} />
        ))}
      </Stack>
    );
  } else if (loadError || !items) {
    cuerpo = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reloadList}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar las ocupaciones
      </Alert>
    );
  } else {
    cuerpo = (
      <Stack spacing={1.25}>
        <Typography variant="body2" color="text.secondary">
          Resultados: <b>{formatNumber(resumen.total)}</b>
          {resumen.vencidas ? ` · Vencidas: ${formatNumber(resumen.vencidas)}` : ""}
        </Typography>

        {truncated ? (
          <Alert severity="warning">
            Mostrando las primeras {formatNumber(takeOf(applied.take))}. Puede haber más: refiná los filtros.
          </Alert>
        ) : null}

        {items.map((o) => (
          <OcupacionCard
            key={o.id}
            o={o}
            now={now}
            can={can}
            formatInstant={formatInstant}
            onVer={verDetalle}
            onAction={abrirAccion}
          />
        ))}

        {items.length === 0 ? (
          <Typography color="text.secondary">No hay ocupaciones para mostrar.</Typography>
        ) : null}
      </Stack>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Ocupaciones
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Control de ocupaciones, reservas, vencimientos y saldos.
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        {can("ocupaciones.crear") ? (
          <Button
            variant="contained"
            onClick={() => setDialog({ type: "alta" })}
            sx={{ borderRadius: 2, fontWeight: 900 }}
          >
            Nueva ocupación
          </Button>
        ) : null}

        {can("tarifas.editar") ? (
          <Button variant="outlined" onClick={() => setAjusteMasivo(true)} sx={{ borderRadius: 2, fontWeight: 800 }}>
            Ajustar precios mensuales
          </Button>
        ) : null}

        <Button variant="outlined" onClick={reloadList} disabled={loading} sx={{ borderRadius: 2, fontWeight: 800 }}>
          Refrescar
        </Button>
      </Stack>

      <Card
        variant="outlined"
        sx={{ mb: 2, borderRadius: 3, borderColor: "divider", boxShadow: "0 6px 18px rgba(0,0,0,.06)" }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} gap={1}>
            <Typography fontWeight={900}>Filtros</Typography>
            <Stack direction="row" gap={1}>
              <Button onClick={limpiar} disabled={loading} sx={{ borderRadius: 2, fontWeight: 800 }}>
                Limpiar
              </Button>
              <Button variant="outlined" onClick={aplicar} disabled={loading} sx={{ borderRadius: 2, fontWeight: 800 }}>
                Aplicar
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              alignItems: "start",
            }}
          >
            <TextField
              select
              size="small"
              label="Estado"
              value={filters.estado}
              onChange={(e) => setFilter("estado", e.target.value)}
              fullWidth
            >
              {ESTADO_FILTRO_OPTIONS.map((x) => (
                <MenuItem key={x.value} value={x.value}>
                  {x.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Cochera"
              value={filters.cocheraId}
              onChange={(e) => setFilter("cocheraId", e.target.value)}
              disabled={cocheras === null}
              fullWidth
            >
              <MenuItem value="">Todas</MenuItem>
              {(cocheras ?? []).map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  Cochera #{c.numero}
                </MenuItem>
              ))}
            </TextField>

            <ClienteAutocomplete
              key={clienteKey}
              size="small"
              label="Filtrar por cliente"
              value={filterCliente}
              onChange={(c) => {
                setFilterCliente(c);
                setFilter("clienteId", c?.id ? String(c.id) : "");
              }}
            />

            <TextField
              size="small"
              label="Vence en (días)"
              value={filters.venceEnDias}
              onChange={(e) => setFilter("venceEnDias", e.target.value)}
              error={filterError?.field === "venceEnDias"}
              helperText={
                filterError?.field === "venceEnDias"
                  ? filterError.message
                  : "Activas con fin dentro de ese plazo. No incluye vencidas ni abiertas"
              }
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              fullWidth
            />

            <TextField
              size="small"
              label="Inicio desde"
              type="date"
              value={filters.desde}
              onChange={(e) => setFilter("desde", e.target.value)}
              error={filterError?.field === "desde"}
              helperText={filterError?.field === "desde" ? filterError.message : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              size="small"
              label="Fin hasta"
              type="date"
              value={filters.hasta}
              onChange={(e) => setFilter("hasta", e.target.value)}
              error={filterError?.field === "hasta"}
              helperText={
                filterError?.field === "hasta"
                  ? filterError.message
                  : "Con este filtro no aparecen las ocupaciones abiertas (sin hora de fin)"
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              select
              size="small"
              label="Cantidad máxima"
              value={takeOf(filters.take)}
              onChange={(e) => setFilter("take", Number(e.target.value))}
              fullWidth
            >
              {TAKE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {cuerpo}

      {/* DETALLE: se abre con `?id=N` (también desde otras pantallas). */}
      {detailId !== null ? (
        <OcupacionDetalleDialog
          key={detailId}
          id={detailId}
          reloadKey={detailKey}
          now={now}
          can={can}
          onClose={cerrarDetalle}
          onError={errorDeDetalle}
          onLoaded={setOpenDetail}
          onChanged={reloadAll}
          onAction={abrirAccion}
        />
      ) : null}

      {/* DIÁLOGOS DE ESCRITURA. Se montan al abrirse: el formulario arranca limpio cada vez. */}
      {dialog?.type === "alta" && can("ocupaciones.crear") ? (
        <AltaOcupacionDialog
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={(err) => {
            if (shouldReloadAfter(err.code)) reloadList();
          }}
        />
      ) : null}

      {dialog?.type === "cancelar" && can("ocupaciones.cancelar") && cancelOcupacionData ? (
        <CancelarReservaDialog
          ocupacion={cancelOcupacionData}
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={manejarError}
        />
      ) : null}

      {dialog?.type === "finalizar" && can("ocupaciones.finalizar") ? (
        <FinalizarOcupacionDialog
          ocupacionId={dialog.id}
          now={now}
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={manejarError}
        />
      ) : null}

      {ajusteMasivo && can("tarifas.editar") ? (
        <AjusteMasivoDialog onClose={() => setAjusteMasivo(false)} onApplied={reloadAll} />
      ) : null}

      {dialog?.type === "pago" && pagoOcupacion && pagoPermitido ? (
        <RegistrarPagoDialog
          ocupacion={pagoOcupacion}
          onClose={() => setDialog(null)}
          onDone={terminarEscritura}
          onError={manejarError}
        />
      ) : null}
    </Box>
  );
}
