// Cuenta de una ocupación (spec 07, D-FG13): total, tope, pagado, saldo y saldo a favor. Todas las cifras
// las calcula el backend; el front solo las rotula y las formatea.
import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { FASE, cuentaRotulos } from "../../utils/ocupaciones";
import { formatMoney } from "../../utils/formato";

function Row({ label, children, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 800 : 500, textAlign: "right" }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * @param {{ ocupacion: object, fase: string }} props `ocupacion` es el detalle (`GET /Ocupacion/{id}`)
 */
export default function CuentaOcupacion({ ocupacion, fase }) {
  const rotulos = cuentaRotulos(ocupacion);
  const finalizada = fase === FASE.FINALIZADA;
  const cancelada = fase === FASE.CANCELADA;
  const saldoAFavor = Number(ocupacion.saldoAFavor ?? 0);

  return (
    <Stack spacing={0.75}>
      {cancelada ? null : (
        <Row label="Total">
          {ocupacion.precioTotal == null ? "A definir al finalizar" : formatMoney(ocupacion.precioTotal)}
        </Row>
      )}
      {rotulos.tope !== null && !finalizada ? (
        <Box>
          <Row label={rotulos.tope}>{formatMoney(ocupacion.topeDeCobro)}</Row>
          {fase === FASE.VENCIDA ? (
            <Typography variant="caption" color="text.secondary">
              No incluye la demora hasta que se finalice
            </Typography>
          ) : null}
        </Box>
      ) : null}
      <Row label={rotulos.pagado}>{formatMoney(ocupacion.pagado)}</Row>
      <Row label={rotulos.saldo} strong>
        {formatMoney(ocupacion.saldo)}
      </Row>
      {saldoAFavor > 0 ? (
        <Box>
          <Chip size="small" color="warning" label={`Saldo a favor ${formatMoney(saldoAFavor)}`} />
        </Box>
      ) : null}
      {saldoAFavor > 0 && (finalizada || cancelada) ? (
        <Alert severity="info">Hay un saldo a favor pendiente de devolver; se registra desde Pagos.</Alert>
      ) : null}
    </Stack>
  );
}
