// Tabla de cobros, anulaciones y devoluciones por método de pago (spec 09, D-FI7, D-FI10). Muestra lo que manda
// el backend (en vivo o el snapshot de un cierre): solo trae los métodos con movimientos y no se suma nada acá.
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { MetodoPago, labelOf } from "../../constants/enums";
import { formatMoney } from "../../utils/formato";

/**
 * @param {{ totales: import("../../api/cajaApi").CajaTotalMetodo[] | null | undefined }} props
 */
export default function TotalesPorMetodo({ totales }) {
  if (!Array.isArray(totales) || totales.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Todavía no hubo movimientos.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Método</TableCell>
          <TableCell align="right">Cobros</TableCell>
          <TableCell align="right">Anulaciones</TableCell>
          <TableCell align="right">Devoluciones</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {totales.map((t) => (
          <TableRow key={t.metodo}>
            <TableCell>{labelOf(MetodoPago, t.metodo)}</TableCell>
            <TableCell align="right">{formatMoney(t.cobros)}</TableCell>
            <TableCell align="right">{formatMoney(t.anulaciones)}</TableCell>
            <TableCell align="right">{formatMoney(t.devoluciones)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
