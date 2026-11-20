// Plano provisorio de Cocheras (spec 13, D-FM14): un mosaico por número con el color del estado.
// Usa la MISMA lista ya cargada por la pantalla (cero pedidos nuevos) y el mismo detalle al hacer clic.
// El color sale de `colorOf(EstadoCochera, …)` y del tono del tema, sin mapa local. No muestra matrícula,
// tipo de vehículo ni "con deuda": eso llega con el plano posicional (tanda 5, D-FM16), que reemplaza a este.
import { useMemo } from "react";
import { Box, Card, CardActionArea, Chip, Stack, Typography } from "@mui/material";
import { EstadoCochera, colorOf, labelOf, optionsOf } from "../../constants/enums";
import { COLOR_TONE } from "../../theme/theme";

const ESTADOS = optionsOf(EstadoCochera);

// Tono del tema (`palette.pc.tone`) para el nombre de color que devuelve `colorOf`.
function toneOf(theme, color) {
  return theme.palette.pc.tone[COLOR_TONE[color] ?? "de"];
}

/**
 * @param {{ items: Array<{ id: number, numero: number, estado: number }>,
 *   onSelect: (id: number) => void }} props
 */
export default function PlanoGrilla({ items, onSelect }) {
  const ordenadas = useMemo(() => [...items].sort((a, b) => a.numero - b.numero), [items]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} aria-label="Leyenda de estados">
        {ESTADOS.map((e) => (
          <Chip key={e.value} size="small" label={e.label} color={colorOf(EstadoCochera, e.value)} />
        ))}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
        }}
      >
        {ordenadas.map((c) => {
          const color = colorOf(EstadoCochera, c.estado);
          return (
            <Card
              key={c.id}
              sx={(theme) => {
                const t = toneOf(theme, color);
                return { aspectRatio: "1 / 1", bgcolor: t.bg, color: t.text, borderColor: t.border };
              }}
            >
              <CardActionArea
                onClick={() => onSelect(c.id)}
                aria-label={`Cochera #${c.numero}, ${labelOf(EstadoCochera, c.estado)}`}
                sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Typography variant="h6" component="span">
                  {c.numero}
                </Typography>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
