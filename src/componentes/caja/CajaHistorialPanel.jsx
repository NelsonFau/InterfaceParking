// Pestaña "Historial" (spec 09, D-FI9): sesiones de caja de un rango de fechas (`DateOnly` en la zona del tenant,
// por defecto los últimos 30 días), paginadas. La lista NO muestra la diferencia ni el cierre (el ítem del
// backend no los trae, PB-15): se ven en el detalle. El tope de 366 días es del backend (400 `errors.Hasta`).
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { listCajaSesiones } from "../../api/cajaApi";
import { showApiError } from "../../api/errors";
import { EstadoCajaSesion, colorOf, labelOf } from "../../constants/enums";
import { cajaFieldErrors, rangoPorDefecto, validateRango } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { usePagination } from "../../utils/usePagination";
import { useTenantDates } from "../../utils/useTenantDates";
import Campo from "../ui/Campo";
import PaginacionTexto from "../ui/PaginacionTexto";
import Tarjeta from "../ui/Tarjeta";

/**
 * @param {{ refreshKey?: number, onVerDetalle: (sesionId: number) => void }} props
 */
export default function CajaHistorialPanel({ refreshKey = 0, onVerDetalle }) {
  const { formatInstant, today } = useTenantDates();
  const pagination = usePagination();
  const { page, pageSize } = pagination;

  // `filters` es el formulario; `applied`, lo que se pidió con "Buscar".
  const [filters, setFilters] = useState(() => rangoPorDefecto(today()));
  const [applied, setApplied] = useState(filters);
  const [errors, setErrors] = useState({});
  const [reloadKey, setReloadKey] = useState(0);
  // `{ key, status: "ok" | "error", data }`: `key` es el pedido que lo trajo.
  const [result, setResult] = useState(null);
  const requestKey = `${applied.desde}|${applied.hasta}|${page}|${pageSize}|${refreshKey}|${reloadKey}`;

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listCajaSesiones({ desde: applied.desde, hasta: applied.hasta, page, pageSize });
        if (!ignore) setResult({ key: requestKey, status: "ok", data });
      } catch (e) {
        if (ignore) return;
        const err = showApiError(e);
        // Un 400 del rango (por ejemplo más de 366 días) se marca en el campo.
        const { fields } = cajaFieldErrors(err);
        if (fields.desde || fields.hasta) setErrors(fields);
        setResult({ key: requestKey, status: "error", data: null });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [applied, page, pageSize, requestKey]);

  function buscar() {
    const r = validateRango(filters);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    pagination.reset();
    setApplied({ desde: r.desde, hasta: r.hasta });
    setReloadKey((k) => k + 1);
  }

  const cargando = result === null || result.key !== requestKey;
  const data = result?.status === "ok" ? result.data : null;

  function renderCuerpo() {
    if (result === null) return <Skeleton variant="rounded" height={160} />;
    if (result.status === "error" && data === null) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)} disabled={cargando}>
              Reintentar
            </Button>
          }
        >
          No pudimos cargar el historial
        </Alert>
      );
    }
    if (data === null) return <Skeleton variant="rounded" height={160} />;
    if (data.items.length === 0) {
      return <Typography color="text.secondary">No hay sesiones de caja en ese rango</Typography>;
    }
    return (
      <Tarjeta>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Apertura</TableCell>
                <TableCell align="right">Fondo inicial</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((s) => (
                <TableRow key={s.id} hover sx={{ cursor: "pointer" }} onClick={() => onVerDetalle(s.id)}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={labelOf(EstadoCajaSesion, s.estado)}
                      color={colorOf(EstadoCajaSesion, s.estado)}
                    />
                  </TableCell>
                  <TableCell>{formatInstant(s.fechaApertura)}</TableCell>
                  <TableCell align="right">{formatMoney(s.fondoInicial)}</TableCell>
                  <TableCell align="right">
                    <Link
                      component="button"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerDetalle(s.id);
                      }}
                    >
                      Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ pt: 2 }}>
          <PaginacionTexto
            page={page}
            pageSize={pageSize}
            total={data.total}
            count={data.items.length}
            onPageChange={pagination.setPage}
          />
        </Box>
      </Tarjeta>
    );
  }

  return (
    <Stack spacing={2}>
      <Tarjeta>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
          <Campo
            label="Desde"
            type="date"
            value={filters.desde}
            onChange={(e) => {
              setFilters((f) => ({ ...f, desde: e.target.value }));
              setErrors((prev) => ({ ...prev, desde: undefined }));
            }}
            error={Boolean(errors.desde)}
            helperText={errors.desde}
          />
          <Campo
            label="Hasta"
            type="date"
            value={filters.hasta}
            onChange={(e) => {
              setFilters((f) => ({ ...f, hasta: e.target.value }));
              setErrors((prev) => ({ ...prev, hasta: undefined }));
            }}
            error={Boolean(errors.hasta)}
            helperText={errors.hasta}
          />
          <Box>
            <Button variant="arena" onClick={buscar} disabled={cargando && result !== null}>
              Buscar
            </Button>
          </Box>
        </Stack>
      </Tarjeta>

      {renderCuerpo()}
    </Stack>
  );
}
