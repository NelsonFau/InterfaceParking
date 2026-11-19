// Cuerpo de la sección "Contrato mensual" del detalle de una ocupación MES (spec 10, D-FJ4): modo y fracción
// (congelados), precio de partida, fin del contrato y las acciones por permiso. No actualiza ninguna cifra a
// mano: después de cualquier escritura llama a `onChanged`, que recarga el detalle y el listado.
import { useState } from "react";
import { Button, Stack, Typography } from "@mui/material";
import { FraccionMes, ModoMes, labelOf } from "../../constants/enums";
import { accionesDeContrato } from "../../utils/contratos";
import { formatMoney } from "../../utils/formato";
import { FASE } from "../../utils/ocupaciones";
import { useTenantDates } from "../../utils/useTenantDates";
import AjustePrecioDialog from "./AjustePrecioDialog";
import ProgramarBajaDialog from "./ProgramarBajaDialog";
import QuitarBajaDialog from "./QuitarBajaDialog";

/**
 * @param {{ ocupacion: object, fase: string, can: (permiso: string) => boolean, now: Date,
 *   onChanged: () => void }} props
 */
export default function ContratoMensualSeccion({ ocupacion, fase, can, now, onChanged }) {
  const { formatInstant } = useTenantDates();
  // null | "precio" | "baja" | "quitar"
  const [dialog, setDialog] = useState(null);
  const acciones = accionesDeContrato(ocupacion, now, can);
  const hayAcciones = acciones.ajustarPrecio || acciones.programarBaja || acciones.cambiarFin || acciones.quitarBaja;
  const cerrar = () => setDialog(null);

  return (
    <Stack spacing={1}>
      <div>
        <Typography variant="body2">
          Modo de mes: {labelOf(ModoMes, ocupacion.modoMes)} · Fracción: {labelOf(FraccionMes, ocupacion.fraccionMes)}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Congelados al crear. Cada período se cobra con el precio vigente en su inicio
        </Typography>
      </div>

      <div>
        <Typography variant="body2">Precio de partida: {formatMoney(ocupacion.precioUnitarioAplicado)}</Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Los ajustes de precio rigen desde su fecha y no cambian este valor
        </Typography>
      </div>

      <Typography variant="body2">
        {ocupacion.fin ? `Fin del contrato: ${formatInstant(ocupacion.fin)}` : "Sin fin (contrato abierto)"}
      </Typography>

      {hayAcciones ? (
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          {acciones.ajustarPrecio ? (
            <Button size="small" variant="outlined" onClick={() => setDialog("precio")}>
              Ajustar precio
            </Button>
          ) : null}
          {acciones.programarBaja ? (
            <Button size="small" variant="outlined" onClick={() => setDialog("baja")}>
              Programar baja
            </Button>
          ) : null}
          {acciones.cambiarFin ? (
            <Button size="small" variant="outlined" onClick={() => setDialog("baja")}>
              Cambiar fecha de fin
            </Button>
          ) : null}
          {acciones.quitarBaja ? (
            <Button size="small" variant="outlined" color="warning" onClick={() => setDialog("quitar")}>
              Quitar baja
            </Button>
          ) : null}
        </Stack>
      ) : null}

      {dialog === "precio" && acciones.ajustarPrecio ? (
        <AjustePrecioDialog ocupacion={ocupacion} onClose={cerrar} onChanged={onChanged} />
      ) : null}
      {dialog === "baja" && (acciones.programarBaja || acciones.cambiarFin) ? (
        <ProgramarBajaDialog
          ocupacion={ocupacion}
          vencido={fase === FASE.VENCIDA}
          can={can}
          onClose={cerrar}
          onChanged={onChanged}
        />
      ) : null}
      {dialog === "quitar" && acciones.quitarBaja ? (
        <QuitarBajaDialog ocupacion={ocupacion} onClose={cerrar} onChanged={onChanged} />
      ) : null}
    </Stack>
  );
}
