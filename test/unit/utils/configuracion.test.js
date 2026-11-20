import { describe, expect, it } from "vitest";
import {
  CONFIG_AYUDA,
  CONFIG_LIMITS,
  NUMERIC_FIELDS,
  afterSaveError,
  buildUpdateBody,
  diffConfiguracion,
  motivoGuardarConfiguracion,
  summarizeChanges,
  toForm,
  validateConfiguracionForm,
} from "../../../src/utils/configuracion.js";

const original = {
  zonaHoraria: "America/Montevideo",
  modoCaja: 1,
  toleranciaInicioHoras: 2,
  topePasadoDias: 30,
  techoFuturoMeses: 6,
  modoMes: 1,
  fraccionMes: 1,
  graciaHoraMinutos: 10,
  diasGraciaMora: 5,
  ventanaAlertasDias: 30,
  version: "AAAAAAAB=",
};

const formWith = (cambios = {}) => ({ ...toForm(original), ...cambios });

describe("CONFIG_LIMITS", () => {
  it("coincide con el inventario", () => {
    expect(CONFIG_LIMITS).toEqual({
      toleranciaInicioHoras: { min: 0, max: 168 },
      topePasadoDias: { min: 1, max: 3650 },
      techoFuturoMeses: { min: 1, max: 24 },
      graciaHoraMinutos: { min: 0, max: 59 },
      diasGraciaMora: { min: 0, max: 60 },
      ventanaAlertasDias: { min: 7, max: 90 },
    });
  });
});

describe("validateConfiguracionForm", () => {
  it("acepta el formulario original", () => {
    expect(validateConfiguracionForm(formWith()).ok).toBe(true);
  });

  it("acepta cada número en su mínimo y su máximo", () => {
    for (const f of NUMERIC_FIELDS) {
      const { min, max } = CONFIG_LIMITS[f];
      for (const n of [min, max]) {
        const r = validateConfiguracionForm(formWith({ [f]: String(n) }));
        expect(r.ok).toBe(true);
        expect(r.values[f]).toBe(n);
      }
    }
  });

  it("rechaza un valor por debajo del mínimo y por encima del máximo", () => {
    for (const f of NUMERIC_FIELDS) {
      const { min, max } = CONFIG_LIMITS[f];
      const casos = [max + 1];
      if (min > 0) casos.push(min - 1);
      for (const n of casos) {
        const r = validateConfiguracionForm(formWith({ [f]: String(n) }));
        expect(r.ok).toBe(false);
        expect(r.errors[f]).toBe(`Tiene que estar entre ${min} y ${max}`);
      }
    }
  });

  it.each(["", "1.5", "1e2", "abc", "-3", "-1"])("%j da 'Ingresá un número entero'", (valor) => {
    const r = validateConfiguracionForm(formWith({ topePasadoDias: valor }));
    expect(r.ok).toBe(false);
    expect(r.errors.topePasadoDias).toBe("Ingresá un número entero");
  });

  it("un valor con espacios se recorta", () => {
    const r = validateConfiguracionForm(formWith({ topePasadoDias: " 5 " }));
    expect(r.ok).toBe(true);
    expect(r.values.topePasadoDias).toBe(5);
  });

  it("zona y modo de caja son obligatorios", () => {
    const r = validateConfiguracionForm(formWith({ zonaHoraria: "", modoCaja: "" }));
    expect(r.ok).toBe(false);
    expect(r.errors.zonaHoraria).toBeTruthy();
    expect(r.errors.modoCaja).toBeTruthy();
  });
});

describe("diffConfiguracion", () => {
  it("sin cambios da {}", () => {
    expect(diffConfiguracion(original, formWith())).toEqual({});
  });

  it("un número escrito igual (con espacios) no cuenta como cambio", () => {
    expect(diffConfiguracion(original, formWith({ topePasadoDias: " 30 " }))).toEqual({});
  });

  it("detecta los campos cambiados", () => {
    expect(diffConfiguracion(original, formWith({ topePasadoDias: "60", modoCaja: 2 }))).toEqual({
      topePasadoDias: 60,
      modoCaja: 2,
    });
  });
});

describe("buildUpdateBody", () => {
  it("con solo topePasadoDias cambiado, lleva los obligatorios y ese campo", () => {
    expect(buildUpdateBody(original, formWith({ topePasadoDias: "60" }))).toEqual({
      zonaHoraria: "America/Montevideo",
      modoCaja: 1,
      version: "AAAAAAAB=",
      topePasadoDias: 60,
    });
  });

  it("con la zona cambiada lleva la nueva, la version idéntica y nunca ventanaAlertasDias", () => {
    const body = buildUpdateBody(original, formWith({ zonaHoraria: "America/Sao_Paulo" }));
    expect(body.zonaHoraria).toBe("America/Sao_Paulo");
    expect(body.version).toBe(original.version);
    expect(body).not.toHaveProperty("ventanaAlertasDias");
  });

  it("un entero pasado como texto va como número", () => {
    expect(buildUpdateBody(original, formWith({ topePasadoDias: "60" })).topePasadoDias).toBe(60);
  });

  it("manda el cambio de modoMes como entero", () => {
    expect(buildUpdateBody(original, formWith({ modoMes: 3 })).modoMes).toBe(3);
  });
});

describe("summarizeChanges", () => {
  it("resume zona, modo de caja, modo del mes y fracción del mes", () => {
    const r = summarizeChanges(
      original,
      formWith({ zonaHoraria: "America/Bahia", modoCaja: 2, modoMes: 3, fraccionMes: 2 })
    );
    expect(r).toEqual({
      zona: { de: "America/Montevideo", a: "America/Bahia" },
      modoCaja: { de: 1, a: 2 },
      modoMes: { de: 1, a: 3 },
      fraccionMes: { de: 1, a: 2 },
    });
  });

  it("un cambio de topePasadoDias o graciaHoraMinutos no pide confirmación", () => {
    expect(summarizeChanges(original, formWith({ topePasadoDias: "60", graciaHoraMinutos: "5" }))).toEqual({});
  });
});

describe("afterSaveError", () => {
  it("solo configuracion_modificada ofrece recargar", () => {
    expect(afterSaveError("configuracion_modificada").ofrecerRecargar).toBe(true);
    for (const code of ["caja_abierta", "datos_invalidos", "sin_permiso", "otro_codigo", undefined]) {
      expect(afterSaveError(code).ofrecerRecargar).toBe(false);
    }
  });
});

describe("CONFIG_AYUDA", () => {
  it("tiene una entrada por campo", () => {
    expect(Object.keys(CONFIG_AYUDA).sort()).toEqual(
      [
        "zonaHoraria",
        "modoCaja",
        "toleranciaInicioHoras",
        "topePasadoDias",
        "techoFuturoMeses",
        "graciaHoraMinutos",
        "modoMes",
        "fraccionMes",
        "diasGraciaMora",
        "ventanaAlertasDias",
      ].sort()
    );
  });

  it("los rangos que menciona coinciden con CONFIG_LIMITS", () => {
    for (const f of [...NUMERIC_FIELDS, "ventanaAlertasDias"]) {
      const { min, max } = CONFIG_LIMITS[f];
      const m = CONFIG_AYUDA[f].match(/(?:De|Entre) (\d+) (?:a|y) (\d+)/);
      expect(m, f).not.toBeNull();
      expect([Number(m[1]), Number(m[2])], f).toEqual([min, max]);
    }
  });
});

describe("motivoGuardarConfiguracion", () => {
  it("con cambios válidos da null", () => {
    expect(motivoGuardarConfiguracion({ hayCambios: true, valido: true })).toBeNull();
  });
  it("con cambios inválidos pide corregir", () => {
    expect(motivoGuardarConfiguracion({ hayCambios: true, valido: false })).toBe("Corregí los campos marcados");
  });
  it("sin cambios dice que no hay cambios, sea válido o no", () => {
    expect(motivoGuardarConfiguracion({ hayCambios: false, valido: true })).toBe("No hay cambios para guardar");
    expect(motivoGuardarConfiguracion({ hayCambios: false, valido: false })).toBe("No hay cambios para guardar");
  });
});
