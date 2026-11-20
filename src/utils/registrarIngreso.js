// Lógica pura de la pantalla "Registrar ingreso" (guía visual 2). No duplica reglas: arma el formulario que ya valida
// `validateAltaForm` de utils/ocupaciones.js y deja que el backend decida lo demás (D-FG9). Sin React.
import { TipoOcupacion } from "../constants/enums.js";

/** Tipo de registro: "Ingreso rápido" (hora o día) o "Abono" (mensual). */
export const REGISTRO = Object.freeze({ RAPIDO: "rapido", ABONO: "abono" });

/**
 * Tipo de ocupación que corresponde al registro: el abono es Mes; el ingreso rápido, Hora o Día.
 * @param {string} registro
 * @param {number} tipoRapido TipoOcupacion.HORA o TipoOcupacion.DIA
 * @returns {number}
 */
export function tipoDeRegistro(registro, tipoRapido) {
  if (registro === REGISTRO.ABONO) return TipoOcupacion.MES;
  return tipoRapido === TipoOcupacion.DIA ? TipoOcupacion.DIA : TipoOcupacion.HORA;
}

/** Regla de cobro que se muestra en el resumen. */
export function reglaDeCobro(registro) {
  return registro === REGISTRO.ABONO ? "se cobra por adelantado" : "se cobra al salir";
}

/** `yyyy-MM-dd` + `HH:mm` → valor de `datetime-local`; con algo vacío, `""`. */
export function joinFechaHora(fecha, hora) {
  return fecha && hora ? `${fecha}T${hora}` : "";
}

/** Valor de `datetime-local` → `{ fecha, hora }` para los dos campos de la pantalla. */
export function splitInicio(inicio) {
  const v = String(inicio ?? "");
  return { fecha: v.slice(0, 10), hora: v.slice(11, 16) };
}

/**
 * Formulario en la forma que espera `validateAltaForm` / `disponiblesRange`. La ocupación se abre sin hora de fin
 * (sin tarifa excepcional ni motivo retroactivo: eso se hace desde "Nueva ocupación").
 * @param {{ registro: string, tipoRapido: number, cliente: object | null, cocheraId: string, inicio: string }} datos
 */
export function buildFormRegistro({ registro, tipoRapido, cliente, cocheraId, inicio }) {
  return {
    tipo: tipoDeRegistro(registro, tipoRapido),
    cliente,
    inicio,
    sinFin: true,
    fin: "",
    cocheraId,
    excepcional: false,
    precio: "",
    motivoExcepcional: "",
    motivoRetroactivo: "",
  };
}

/**
 * Motivo por el que "Confirmar ingreso" no se puede usar, o `null` si están los datos obligatorios.
 * Lista lo que falta en orden: cliente, cochera, inicio. `cocheraId` 0 cuenta como elegido.
 * @returns {string | null}
 */
export function motivoConfirmarIngreso({ cliente, cocheraId, inicio }) {
  const faltan = [];
  if (!cliente?.id) faltan.push("cliente");
  if (String(cocheraId ?? "") === "") faltan.push("cochera");
  if (String(inicio ?? "") === "") faltan.push("inicio");
  return faltan.length === 0 ? null : `Falta elegir: ${faltan.join(", ")}`;
}

/** ¿Están todos los datos obligatorios para habilitar "Confirmar ingreso"? */
export function datosCompletos(datos) {
  return motivoConfirmarIngreso(datos) === null;
}
