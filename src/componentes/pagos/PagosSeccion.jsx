// Sección "Pagos" del detalle de una ocupación (spec 08, D-FH4): tabla compacta de los pagos, con los anulados
// atenuados. NO calcula ningún total (el pagado neto, el saldo y el saldo a favor son del backend y están en la
// sección "Cuenta"). Un clic en una fila abre el detalle del pago. Si falla la carga se ve "No pudimos cargar
// los pagos" con "Reintentar", sin vaciar el resto del detalle.
import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { showApiError } from "../../api/errors";
import { listPagosByOcupacion } from "../../api/pagosApi";
import { MetodoPago, labelOf } from "../../constants/enums";
import { formatMoney } from "../../utils/formato";
import { pagoFilaInfo, sortPagos } from "../../utils/pagos";
import { useTenantDates } from "../../utils/useTenantDates";
import PagoDetalleDialog from "./PagoDetalleDialog";

// Columnas que se ocultan en pantallas angostas: quedan Fecha, Monto y Estado (el resto está en el detalle).
const SOLO_ANCHAS = { display: { xs: "none", sm: "table-cell" } };

/**
 * @param {{ ocupacion: { id: number }, reloadKey?: string | number, onChanged?: () => void }} props
 *   `reloadKey` cambia cada vez que hay que volver a pedir la lista (después de una escritura). `onChanged`
 *   le pide a quien la monta que recargue el detalle de la ocupación y el listado. Se monta solo con `pagos.ver`.
 */
export default function PagosSeccion({ ocupacion, reloadKey = 0, onChanged }) {
  const { formatInstant } = useTenantDates();
  const ocupacionId = ocupacion.id;
  // `{ key, status: "ok" | "error", data }`: `key` es el pedido que lo trajo. Mientras no coincida con el
  // actual se muestran los datos viejos (si hay), para no parpadear al recargar.
  const [result, setResult] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [pagoAbierto, setPagoAbierto] = useState(null);
  const requestKey = `${ocupacionId}|${reloadKey}|${retryKey}`;

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const data = await listPagosByOcupacion(ocupacionId);
        if (!ignore) setResult({ key: requestKey, status: "ok", data });
      } catch (e) {
        if (ignore) return;
        showApiError(e);
        setResult({ key: requestKey, status: "error", data: null });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [ocupacionId, requestKey]);

  const pagos = result?.status === "ok" ? sortPagos(result.data) : null;
  const failed = result?.key === requestKey && result.status === "error";

  let cuerpo;
  if (failed) {
    cuerpo = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => setRetryKey((k) => k + 1)}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar los pagos
      </Alert>
    );
  } else if (!pagos) {
    cuerpo = <Skeleton variant="rounded" height={90} />;
  } else if (pagos.length === 0) {
    cuerpo = (
      <Typography variant="body2" color="text.secondary">
        Todavía no hay pagos
      </Typography>
    );
  } else {
    cuerpo = (
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell sx={SOLO_ANCHAS}>Método</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell align="right" sx={SOLO_ANCHAS}>
                Devuelto
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell sx={SOLO_ANCHAS}>Referencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.map((p) => {
              const info = pagoFilaInfo(p);
              const atenuado = info.atenuado ? { color: "text.secondary" } : null;
              return (
                <TableRow key={p.id} hover onClick={() => setPagoAbierto(p.id)} sx={{ cursor: "pointer" }}>
                  <TableCell sx={atenuado}>{formatInstant(p.fechaPago)}</TableCell>
                  <TableCell sx={{ ...SOLO_ANCHAS, ...atenuado }}>{labelOf(MetodoPago, p.metodo)}</TableCell>
                  <TableCell align="right" sx={{ ...atenuado, textDecoration: info.atenuado ? "line-through" : "none" }}>
                    {formatMoney(p.monto)}
                  </TableCell>
                  <TableCell align="right" sx={{ ...SOLO_ANCHAS, ...atenuado }}>
                    {info.devuelto !== null ? formatMoney(info.devuelto) : ""}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={info.label} color={info.color} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ ...SOLO_ANCHAS, ...atenuado }}>{p.referencia ?? ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      {cuerpo}
      {pagoAbierto !== null ? (
        <PagoDetalleDialog
          key={pagoAbierto}
          pagoId={pagoAbierto}
          ocupacion={ocupacion}
          onClose={() => setPagoAbierto(null)}
          onChanged={onChanged}
        />
      ) : null}
    </Stack>
  );
}
