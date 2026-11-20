// Mosaico de una cochera (guía visual 2, Cocheras y Panel): tarjeta con fondo y borde teñidos por la situación,
// "#12" en el color del tono con el chip de situación a la derecha, el cliente o "—" y la hora de inicio (o inicio y
// fin en una reserva). La patente del diseño se omite (PB-25). El tono sale de `SituacionCochera` y del tema.
import { Box, Card, CardActionArea, Chip, Typography } from "@mui/material";
import { SituacionCochera, colorOf, labelOf } from "../../constants/enums";
import { COLOR_TONE } from "../../theme/theme";
import { lineaHorario, situacionCochera, tarjetaInfo } from "../../utils/cocheras";
import { useTenantDates } from "../../utils/useTenantDates";

/**
 * @param {{
 *   cochera: import("../../api/cocheraApi").CocheraListItem,
 *   now: Date,
 *   deudaIds: Set<number> | null,
 *   onClick: (id: number) => void,
 * }} props
 */
export default function CocheraMosaico({ cochera, now, deudaIds, onClick }) {
  const { formatInstantTime } = useTenantDates();
  const info = tarjetaInfo(cochera, now);
  const situacion = situacionCochera(cochera, now, deudaIds);
  const tone = COLOR_TONE[colorOf(SituacionCochera, situacion)] ?? "de";
  const horario = lineaHorario(info, formatInstantTime);

  return (
    <Card
      sx={(theme) => ({
        bgcolor: theme.palette.pc.tone[tone].bg,
        borderColor: theme.palette.pc.tone[tone].border,
      })}
    >
      <CardActionArea
        onClick={() => onClick(cochera.id)}
        aria-label={`Cochera #${cochera.numero}, ${labelOf(SituacionCochera, situacion)}`}
        sx={{ p: 1.75, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.75 }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Typography component="span" sx={(theme) => ({ color: theme.palette.pc.tone[tone].text, fontSize: "1.25rem", fontWeight: 500 })}>
            #{cochera.numero}
          </Typography>
          <Chip size="small" variant="outlined" label={labelOf(SituacionCochera, situacion)} />
        </Box>
        <Typography variant="body1" noWrap title={info.cliente || undefined}>
          {info.cliente || "—"}
        </Typography>
        <Typography variant="body1" color="text.secondary" noWrap>
          {horario ?? "—"}
        </Typography>
      </CardActionArea>
    </Card>
  );
}
