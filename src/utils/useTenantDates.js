// Fechas con la zona del tenant ya aplicada (spec 02, D-FB7).
// Las pantallas usan este hook y no tocan la zona. Las funciones que no usan zona
// (DateOnly, addDays, etc.) se importan directo de ./fechas.js.
import { useMemo } from "react";
import { useMe } from "../auth/usePermissions.js";
import {
  dateRangeToInstants,
  dayToInstantRange,
  formatInstant,
  formatInstantDate,
  formatInstantTime,
  instantToDateOnly,
  instantToInput,
  isValidTimeZone,
  localInputToInstant,
  todayInZone,
} from "./fechas.js";

/**
 * Funciones de fechas con la zona de `/me.tenant.zonaHoraria` aplicada.
 * Solo se usa con `/me` cargado (dentro de las rutas privadas). Sin una zona válida lanza,
 * en vez de caer a la zona del navegador (D-FB2); MeProvider ya la validó.
 */
export function useTenantDates() {
  const { me } = useMe();
  const timeZone = me?.tenant?.zonaHoraria;
  if (!isValidTimeZone(timeZone)) {
    throw new Error("useTenantDates se usa con /me cargado y una zona horaria válida.");
  }

  return useMemo(
    () => ({
      timeZone,
      localInputToInstant: (value) => localInputToInstant(value, timeZone),
      instantToInput: (instant) => instantToInput(instant, timeZone),
      formatInstant: (instant, options) => formatInstant(instant, timeZone, options),
      formatInstantDate: (instant) => formatInstantDate(instant, timeZone),
      formatInstantTime: (instant) => formatInstantTime(instant, timeZone),
      instantToDateOnly: (instant) => instantToDateOnly(instant, timeZone),
      // `now` es para probar; por defecto, el momento actual.
      today: (now) => todayInZone(timeZone, now),
      dayToInstantRange: (day) => dayToInstantRange(day, timeZone),
      dateRangeToInstants: (desdeDay, hastaDay, options) =>
        dateRangeToInstants(desdeDay, hastaDay, timeZone, options),
    }),
    [timeZone]
  );
}
