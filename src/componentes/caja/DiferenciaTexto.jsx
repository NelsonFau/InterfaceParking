// Diferencia de arqueo con el color del tono del tema (spec 13, tanda 3): "sin diferencia" en `ok`, "falta" en
// `er` y "sobra" en `wa`. Solo presentación: el monto y el signo los manda el backend, acá no se calcula nada.
import { Box } from "@mui/material";
import { diferenciaInfo, difColor } from "../../utils/caja";
import { formatMoney } from "../../utils/formato";

/**
 * @param {{ diferencia: number | string | null | undefined }} props
 */
export default function DiferenciaTexto({ diferencia }) {
  const info = diferenciaInfo(diferencia);
  if (!info) return "—";
  return (
    <Box component="span" sx={{ color: difColor(info), fontWeight: 800 }}>
      {info.tipo === "cero" ? info.label : `${formatMoney(Math.abs(diferencia))} (${info.label})`}
    </Box>
  );
}
