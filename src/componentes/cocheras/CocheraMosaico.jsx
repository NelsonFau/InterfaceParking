// Mosaico de una cochera (guía visual 2, Cocheras y Panel): tarjeta con fondo y borde teñidos por la situación,
// "#12" en el color del tono con el chip de situación a la derecha, el cliente o "—" y la hora de inicio (o inicio y
// fin en una reserva). La patente del diseño se omite (PB-25). El tono sale de `SituacionCochera` y del tema.
import { alpha } from "@mui/material/styles";
import { Box, Card, CardActionArea, Chip, Typography } from "@mui/material";
import { SituacionCochera, colorOf, labelOf } from "../../constants/enums";
import { COLOR_TONE } from "../../theme/theme";
import { claveCochera, lineaHorario, situacionCochera, tarjetaInfo } from "../../utils/cocheras";
import { useTenantDates } from "../../utils/useTenantDates";

/**
 * @param {{
 *   cochera: import("../../api/cocheraApi").CocheraListItem,
 *   now: Date,
 *   deudaIds: Set<number> | null,
 *   onClick: (id: number) => void,
 *   resalte?: "resaltado" | "atenuado",
 * }} props
 */
export default function CocheraMosaico({ cochera, now, deudaIds, onClick, resalte }) {
  const { formatInstantTime } = useTenantDates();
  const info = tarjetaInfo(cochera, now);
  const situacion = situacionCochera(cochera, now, deudaIds);
  const tone = COLOR_TONE[colorOf(SituacionCochera, situacion)] ?? "de";
  const horario = lineaHorario(info, formatInstantTime);

  return (
    <Card
      sx={(theme) => {
        const color = theme.palette.pc.cochera[claveCochera(situacion)];
        return {
          position: "relative",
          bgcolor: theme.palette.pc.tone[tone].bg,
          borderColor: theme.palette.pc.tone[tone].border,
          // Leyenda-filtro (detalles 6.3): el estado elegido en tono suave y los demás con el velo encima.
          ...(resalte && {
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              pointerEvents: "none",
              ...(resalte === "resaltado"
                ? { backgroundColor: alpha(color, 0.32), border: `1.5px solid ${alpha(color, 0.7)}` }
                : { backgroundColor: theme.palette.pc.veil }),
            },
          }),
        };
      }}
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
