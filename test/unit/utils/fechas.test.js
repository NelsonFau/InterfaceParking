import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addDays,
  dateOnlyToInput,
  dateRangeToInstants,
  dayToInstantRange,
  formatDateOnly,
  formatInstant,
  formatInstantDate,
  inputToDateOnly,
  instantToDateOnly,
  instantToInput,
  isDateOnly,
  isValidTimeZone,
  localInputToInstant,
  MSG_HORA_INEXISTENTE,
  todayInZone,
} from "../../../src/utils/fechas.js";

// Ningún test depende de la zona del sistema: la zona va siempre explícita.
const MVD = "America/Montevideo";
const NY = "America/New_York";
const MADRID = "Europe/Madrid";
const SANTIAGO = "America/Santiago";

const instant = (value, tz) => localInputToInstant(value, tz).instant;

describe("localInputToInstant", () => {
  it("1: Montevideo 22:30 del 10/11 es 01:30Z del día siguiente", () => {
    expect(localInputToInstant("2026-11-10T22:30", MVD)).toEqual({
      ok: true,
      instant: "2026-11-11T01:30:00.000Z",
    });
  });

  it("4: Nueva York respeta el horario de verano (verano 14:00Z, invierno 15:00Z)", () => {
    expect(instant("2026-07-15T10:00", NY)).toBe("2026-07-15T14:00:00.000Z");
    expect(instant("2026-12-10T10:00", NY)).toBe("2026-12-10T15:00:00.000Z");
  });

  it("5: hora inexistente en Nueva York es error; los bordes existen", () => {
    expect(localInputToInstant("2026-03-08T02:30", NY)).toEqual({
      ok: false,
      code: "hora_inexistente",
      message: MSG_HORA_INEXISTENTE,
    });
    expect(MSG_HORA_INEXISTENTE).toBe(
      "Esa hora no existe en la zona del local por el cambio de horario. Elegí otra.",
    );
    expect(instant("2026-03-08T01:59", NY)).toBe("2026-03-08T06:59:00.000Z");
    expect(instant("2026-03-08T03:00", NY)).toBe("2026-03-08T07:00:00.000Z");
  });

  it("6: hora repetida en Nueva York toma la primera", () => {
    expect(instant("2026-11-01T01:30", NY)).toBe("2026-11-01T05:30:00.000Z");
    expect(instant("2026-11-01T00:59", NY)).toBe("2026-11-01T04:59:00.000Z");
    expect(instant("2026-11-01T02:00", NY)).toBe("2026-11-01T07:00:00.000Z");
  });

  it("7: Madrid, hora inexistente, hora repetida y borde", () => {
    expect(localInputToInstant("2026-03-29T02:30", MADRID)).toMatchObject({
      ok: false,
      code: "hora_inexistente",
    });
    expect(instant("2026-10-25T02:30", MADRID)).toBe("2026-10-25T00:30:00.000Z");
    expect(instant("2026-03-29T03:00", MADRID)).toBe("2026-03-29T01:00:00.000Z");
  });

  it("10: entradas inválidas, vacías y con segundos", () => {
    for (const bad of ["2026-02-30T10:00", "2026-11-10", "10/11/2026 22:30"]) {
      expect(localInputToInstant(bad, MVD)).toMatchObject({ ok: false, code: "formato_invalido" });
    }
    expect(localInputToInstant("", MVD)).toEqual({ ok: true, instant: null });
    expect(localInputToInstant("   ", MVD)).toEqual({ ok: true, instant: null });
    expect(localInputToInstant("2026-11-10T22:30:15", MVD)).toEqual({
      ok: true,
      instant: "2026-11-11T01:30:15.000Z",
    });
  });

  it("rechaza horas y minutos fuera de rango", () => {
    expect(localInputToInstant("2026-11-10T24:00", MVD)).toMatchObject({ code: "formato_invalido" });
    expect(localInputToInstant("2026-11-10T10:60", MVD)).toMatchObject({ code: "formato_invalido" });
  });

  it("una zona inválida lanza en vez de caer a la del sistema", () => {
    expect(() => localInputToInstant("2026-11-10T22:30", "Mars/Olympus")).toThrow(RangeError);
    expect(() => localInputToInstant("2026-11-10T22:30", undefined)).toThrow(RangeError);
  });
});

describe("todayInZone", () => {
  it("2: a las 22:30 en Uruguay hoy es el 10, aunque en UTC ya sea el 11", () => {
    expect(todayInZone(MVD, new Date("2026-11-11T01:30:00.000Z"))).toBe("2026-11-10");
  });

  it("3: el límite es las 00:00 locales", () => {
    expect(todayInZone(MVD, new Date("2026-11-11T02:59:59.999Z"))).toBe("2026-11-10");
    expect(todayInZone(MVD, new Date("2026-11-11T03:00:00.000Z"))).toBe("2026-11-11");
  });
});

describe("instantToInput", () => {
  it("8: no es inyectiva en la hora repetida, y un instante común vuelve a su original", () => {
    expect(instantToInput("2026-11-01T05:30:00.000Z", NY)).toBe("2026-11-01T01:30");
    expect(instantToInput("2026-11-01T06:30:00.000Z", NY)).toBe("2026-11-01T01:30");
    const original = "2026-07-15T10:00";
    expect(instantToInput(instant(original, NY), NY)).toBe(original);
    expect(instantToInput(instant("2026-11-10T22:30", MVD), MVD)).toBe("2026-11-10T22:30");
  });

  it("nulo, vacío o inválido da vacío", () => {
    expect(instantToInput(null, MVD)).toBe("");
    expect(instantToInput("", MVD)).toBe("");
    expect(instantToInput("basura", MVD)).toBe("");
  });

  it("un instante sin zona no se interpreta en la zona del sistema", () => {
    expect(instantToInput("2026-11-11T01:30:00", MVD)).toBe("");
  });

  it("medianoche local no sale como 24:00", () => {
    expect(instantToInput("2026-11-11T03:00:00.000Z", MVD)).toBe("2026-11-11T00:00");
  });
});

describe("formatInstant", () => {
  it("9: formato dd/MM/yyyy HH:mm, con segundos opcionales", () => {
    expect(formatInstant("2026-11-11T01:30:00.000Z", MVD)).toBe("10/11/2026 22:30");
    expect(formatInstant("2026-11-11T01:30:00.000Z", MVD, { seconds: true })).toBe(
      "10/11/2026 22:30:00",
    );
  });

  it("nulo o vacío da vacío; inválido devuelve el texto tal cual", () => {
    expect(formatInstant(null, MVD)).toBe("");
    expect(formatInstant("", MVD)).toBe("");
    expect(formatInstant("raro", MVD)).toBe("raro");
  });

  it("acepta fracciones de 7 dígitos como las de .NET", () => {
    expect(formatInstant("2026-11-11T01:30:00.1234567Z", MVD)).toBe("10/11/2026 22:30");
  });
});

describe("formatInstantDate e instantToDateOnly", () => {
  it("dan el día de calendario en la zona", () => {
    expect(formatInstantDate("2026-11-11T01:30:00.000Z", MVD)).toBe("10/11/2026");
    expect(instantToDateOnly("2026-11-11T01:30:00.000Z", MVD)).toBe("2026-11-10");
    expect(instantToDateOnly("2026-11-11T03:00:00.000Z", MVD)).toBe("2026-11-11");
    expect(instantToDateOnly("basura", MVD)).toBe("");
  });
});

describe("DateOnly", () => {
  it("11: validación, formato y aritmética sobre texto", () => {
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-11-10")).toBe(true);
    expect(isDateOnly("2028-02-29")).toBe(true);
    expect(isDateOnly("2026-2-3")).toBe(false);
    expect(formatDateOnly("2026-11-10")).toBe("10/11/2026");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formatDateOnly: vacío da vacío e inválido devuelve el texto", () => {
    expect(formatDateOnly(null)).toBe("");
    expect(formatDateOnly("")).toBe("");
    expect(formatDateOnly("2026-02-30")).toBe("2026-02-30");
  });

  it("addDays lanza con un DateOnly inválido", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow(RangeError);
  });

  it("conversiones desde y hacia <input type=date>", () => {
    expect(dateOnlyToInput("2026-11-10")).toBe("2026-11-10");
    expect(dateOnlyToInput("x")).toBe("");
    expect(dateOnlyToInput(null)).toBe("");
    expect(inputToDateOnly("2026-11-10")).toBe("2026-11-10");
    expect(inputToDateOnly("")).toBeNull();
    expect(inputToDateOnly("2026-02-30")).toBeNull();
  });
});

describe("dayToInstantRange", () => {
  it("12: Montevideo, día común", () => {
    expect(dayToInstantRange("2026-11-10", MVD)).toEqual({
      desde: "2026-11-10T03:00:00.000Z",
      hasta: "2026-11-11T03:00:00.000Z",
    });
  });

  it("12: Nueva York, día de 25 h y día de 23 h", () => {
    expect(dayToInstantRange("2026-11-01", NY)).toEqual({
      desde: "2026-11-01T04:00:00.000Z",
      hasta: "2026-11-02T05:00:00.000Z",
    });
    expect(dayToInstantRange("2026-03-08", NY)).toEqual({
      desde: "2026-03-08T05:00:00.000Z",
      hasta: "2026-03-09T04:00:00.000Z",
    });
  });

  it("13: medianoche inexistente en Santiago, desde es el primer instante válido (01:00 locales)", () => {
    const { desde, hasta } = dayToInstantRange("2026-09-06", SANTIAGO);
    expect(instantToInput(desde, SANTIAGO)).toBe("2026-09-06T01:00");
    expect(desde).toBe("2026-09-06T04:00:00.000Z");
    expect(hasta).toBe("2026-09-07T03:00:00.000Z");
  });

  it("un DateOnly inválido lanza", () => {
    expect(() => dayToInstantRange("2026-02-30", MVD)).toThrow(RangeError);
  });
});

describe("dateRangeToInstants", () => {
  it("16: un solo día, con hasta inclusivo y exclusivo", () => {
    expect(dateRangeToInstants("2026-11-01", "2026-11-01", MVD)).toEqual({
      desde: "2026-11-01T03:00:00.000Z",
      hasta: "2026-11-02T02:59:59.999Z",
    });
    expect(dateRangeToInstants("2026-11-01", "2026-11-01", MVD, { inclusiveEnd: false })).toEqual({
      desde: "2026-11-01T03:00:00.000Z",
      hasta: "2026-11-02T03:00:00.000Z",
    });
  });

  it("17: 31 días de calendario miden 31 días menos 1 ms; los extremos vacíos dan null", () => {
    const { desde, hasta } = dateRangeToInstants("2026-10-01", "2026-10-31", MVD);
    expect(Date.parse(hasta) - Date.parse(desde)).toBe(31 * 24 * 60 * 60 * 1000 - 1);
    expect(dateRangeToInstants(null, "2026-10-31", MVD).desde).toBeNull();
    expect(dateRangeToInstants("2026-10-01", "", MVD).hasta).toBeNull();
    expect(dateRangeToInstants(undefined, undefined, MVD)).toEqual({ desde: null, hasta: null });
  });
});

describe("isValidTimeZone", () => {
  it("14: acepta IANA y rechaza inválidas y vacías", () => {
    expect(isValidTimeZone("America/Montevideo")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });
});

describe("fechas.js no lee la zona del sistema", () => {
  it("15: sin getHours, getDate, getTimezoneOffset ni toLocale", () => {
    const source = readFileSync(new URL("../../../src/utils/fechas.js", import.meta.url), "utf8");
    expect(source).not.toMatch(/getHours|getDate|getTimezoneOffset|toLocale/);
  });
});
