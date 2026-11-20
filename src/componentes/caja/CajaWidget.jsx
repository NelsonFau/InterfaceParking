// Tarjeta "Caja" del Monitor operativo (spec 09, D-FI12; estilo de la guía visual 2). Es autónoma: hace sus propios
// pedidos (`/Caja/actual` y, con sesión abierta y `caja.ver_esperado`, `/esperado`) y se refresca con el `reloadKey`
// del Monitor. Si algo falla muestra "Caja" con el error en gris y "Reintentar" y NO abre un aviso propio (no pisa
// D-FE12): el resto del Monitor sigue funcionando. La monta quien ya comprobó `can("caja.ver")`.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Chip, Link, Skeleton, Stack, Typography } from "@mui/material";
import { getCajaActual, getCajaEsperado } from "../../api/cajaApi";
import { usePermissions } from "../../auth/usePermissions";
import { CAJA_PATH } from "../../auth/routes";
import { EstadoCajaSesion, ModoCaja, labelOf } from "../../constants/enums";
import { CAJA_ESTADO, avisoDiaAnterior, cajaVista } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";
import { useTenantDates } from "../../utils/useTenantDates";
import Tarjeta from "../ui/Tarjeta";

/**
 * @param {{ reloadKey?: number }} props `reloadKey` es el del Monitor: al cambiar, la tarjeta se vuelve a pedir.
 */
export default function CajaWidget({ reloadKey = 0 }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { formatInstant, instantToDateOnly, today } = useTenantDates();
  const [retryKey, setRetryKey] = useState(0);
  // `{ key, status: "ok" | "error", actual, esperado }`: `key` es el pedido que lo trajo.
  const [result, setResult] = useState(null);
  const requestKey = `${reloadKey}|${retryKey}`;
  const verEsperado = can("caja.ver_esperado");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const actual = await getCajaActual();
        const esperado = actual.sesion && verEsperado ? await getCajaEsperado(actual.sesion.id) : null;
        if (!ignore) setResult({ key: requestKey, status: "ok", actual, esperado });
      } catch {
        if (!ignore) setResult({ key: requestKey, status: "error", actual: null, esperado: null });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [requestKey, verEsperado]);

  const cargando = result === null || result.key !== requestKey;
  const reintentar = (
    <Link component="button" type="button" onClick={() => setRetryKey((k) => k + 1)} disabled={cargando}>
      Reintentar
    </Link>
  );

  if (result === null) {
    return (
      <Tarjeta titulo="Caja">
        <Skeleton variant="rounded" height={70} />
      </Tarjeta>
    );
  }

  if (result.status === "error") {
    return (
      <Tarjeta titulo="Caja">
        <Typography variant="body2" color="text.secondary">
          No se pudo cargar la caja. {reintentar}
        </Typography>
      </Tarjeta>
    );
  }

  const sesion = result.actual.sesion ?? null;
  const vista = cajaVista(result.actual, {
    hoy: today(),
    aperturaDia: sesion ? instantToDateOnly(sesion.fechaApertura) : undefined,
  });
  if (vista === null) {
    return (
      <Tarjeta titulo="Caja">
        <Typography variant="body2" color="text.secondary">
          No se pudo cargar la caja. {reintentar}
        </Typography>
      </Tarjeta>
    );
  }

  const sinCaja = vista.estado === CAJA_ESTADO.SIN_CAJA;

  return (
    <Tarjeta
      titulo={
        <Stack direction="row" spacing={1.5} alignItems="center">
          <span>Caja</span>
          <Chip size="small" variant="outlined" label={labelOf(ModoCaja, vista.modo)} />
        </Stack>
      }
      acciones={<Chip size="small" color={sinCaja ? "default" : "success"} label={sinCaja ? "Sin sesión" : labelOf(EstadoCajaSesion, EstadoCajaSesion.ABIERTA)} />}
    >
      <Stack spacing={1.25}>
        {sinCaja ? (
          <Typography>Sin caja abierta</Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Sesión actual
            </Typography>
            {vista.estado === CAJA_ESTADO.ABIERTA_DIA_ANTERIOR ? (
              <Alert severity="warning">{avisoDiaAnterior(vista.diaAnterior)}</Alert>
            ) : null}
            <Typography variant="body2">
              Caja abierta desde {formatInstant(vista.sesion.fechaApertura)} · Fondo inicial{" "}
              {formatMoney(vista.sesion.fondoInicial)}
            </Typography>
            {result.esperado ? (
              <Typography variant="body2" color="text.secondary">
                Efectivo esperado{" "}
                <Typography component="span" color="text.primary" sx={{ ml: 1, fontWeight: 600 }}>
                  {formatMoney(result.esperado.efectivoEsperado)}
                </Typography>
              </Typography>
            ) : null}
          </>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
          <Button variant="pill" onClick={() => navigate(CAJA_PATH)}>
            Ir a Caja
          </Button>
        </Box>
      </Stack>
    </Tarjeta>
  );
}
