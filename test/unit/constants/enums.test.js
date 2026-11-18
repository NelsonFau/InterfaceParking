import { describe, expect, it } from "vitest";
import {
  EstadoCajaSesion,
  EstadoCochera,
  EstadoOcupacion,
  EstadoPago,
  FraccionMes,
  MetodoPago,
  ModoCaja,
  ModoMes,
  ResolucionExcedente,
  RolUsuario,
  SeveridadAlerta,
  TipoAlertaOperativa,
  TipoEventoCaja,
  TipoMovimientoCaja,
  TipoOcupacion,
  defineEnum,
  entriesOf,
  colorOf,
  labelOf,
  labelOfKey,
  optionsOf,
} from "../../../src/constants/enums.js";

// Tabla de docs/inventario/backend.md, sección 2 (valores vigentes, sin los retirados).
const ESPERADO = [
  ["TipoOcupacion", TipoOcupacion, { HORA: 1, DIA: 2, MES: 3 }],
  ["EstadoOcupacion", EstadoOcupacion, { ACTIVA: 1, VENCIDA: 2, CANCELADA: 3, FINALIZADA: 4 }],
  ["EstadoCochera", EstadoCochera, { DISPONIBLE: 1, BLOQUEADA: 2, OCUPADA: 3, RESERVADA: 4 }],
  ["MetodoPago", MetodoPago, { EFECTIVO: 1, TRANSFERENCIA: 2, TARJETA: 3, OTRO: 4 }],
  ["EstadoPago", EstadoPago, { PAGADO: 1, ANULADO: 2 }],
  ["RolUsuario", RolUsuario, { DUENO: 1, ENCARGADO: 3, OPERADOR: 4, AUDITOR: 5, SUPERADMIN: 6 }],
  ["ModoCaja", ModoCaja, { DIARIA: 1, TURNO: 2 }],
  ["ModoMes", ModoMes, { CALENDARIO: 1, CORRIDO: 2, BLOQUES_30: 3 }],
  ["FraccionMes", FraccionMes, { COMPLETO: 1, PROPORCIONAL: 2 }],
  ["ResolucionExcedente", ResolucionExcedente, { COBRAR_COMPLETO: 1, DEVOLVER: 2 }],
  ["EstadoCajaSesion", EstadoCajaSesion, { ABIERTA: 1, CERRADA: 2 }],
  ["TipoEventoCaja", TipoEventoCaja, { APERTURA: 1, CIERRE: 2, REAPERTURA: 3 }],
  ["TipoMovimientoCaja", TipoMovimientoCaja, { COBRO: 1, ANULACION: 2, DEVOLUCION: 3 }],
  ["SeveridadAlerta", SeveridadAlerta, { BAJA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 }],
  [
    "TipoAlertaOperativa",
    TipoAlertaOperativa,
    {
      OCUPACION_VENCIDA_SIN_PAGO: 1,
      OCUPACION_VENCIDA_SIN_CIERRE: 2,
      TARIFA_EXCEPCIONAL: 3,
      OCUPACION_FINALIZADA_SIN_PAGO: 5,
      PAGO_MENOR_AL_ESPERADO: 6,
      PAGO_REGISTRADO_TARDE: 7,
      DEVOLUCION_PENDIENTE: 8,
      DIFERENCIA_DE_CAJA: 9,
      CAJA_SIN_CERRAR: 10,
      FONDO_DISTINTO: 11,
      MENSUAL_IMPAGO: 12,
    },
  ],
];

describe("enums del inventario", () => {
  it("son 15", () => {
    expect(ESPERADO).toHaveLength(15);
  });

  it.each(ESPERADO)("%s tiene exactamente los valores del inventario, sin duplicados", (_n, E, esperado) => {
    expect({ ...E }).toEqual(esperado);
    const valores = entriesOf(E).map((e) => e.value);
    expect(new Set(valores).size).toBe(valores.length);
    expect(valores).toHaveLength(Object.keys(esperado).length);
  });

  it("todas las entradas tienen etiqueta", () => {
    for (const [, E] of ESPERADO) {
      for (const e of entriesOf(E)) expect(e.label).toBeTruthy();
    }
  });

  it("RolUsuario no tiene el 2 y TipoAlertaOperativa no tiene el 4", () => {
    expect(Object.values(RolUsuario)).not.toContain(2);
    expect(Object.values(TipoAlertaOperativa)).not.toContain(4);
  });

  it("las alertas de dinero son exactamente 5, 6, 7, 8, 9, 11 y 12", () => {
    const dinero = entriesOf(TipoAlertaOperativa)
      .filter((e) => e.dinero)
      .map((e) => e.value);
    expect(dinero).toEqual([5, 6, 7, 8, 9, 11, 12]);
  });

  it("calculados: Vencida, Ocupada y Reservada", () => {
    const calc = (E) => entriesOf(E).filter((e) => e.calculado).map((e) => e.key);
    expect(calc(EstadoOcupacion)).toEqual(["VENCIDA"]);
    expect(calc(EstadoCochera)).toEqual(["OCUPADA", "RESERVADA"]);
  });

  it("las constantes no se pueden modificar", () => {
    expect(Object.isFrozen(TipoOcupacion)).toBe(true);
  });
});

describe("labelOf", () => {
  it("devuelve la etiqueta", () => {
    expect(labelOf(TipoOcupacion, 1)).toBe("Hora");
    expect(labelOf(TipoAlertaOperativa, 5)).toBe("Ocupación finalizada sin pago");
    expect(labelOf(TipoAlertaOperativa, 1)).toBe("Ocupación vencida sin pago");
  });

  it("valor desconocido o retirado devuelve String(value)", () => {
    expect(labelOf(TipoAlertaOperativa, 4)).toBe("4");
    expect(labelOf(RolUsuario, 2)).toBe("2");
    expect(labelOf(TipoOcupacion, 99)).toBe("99");
  });

  it("null y undefined devuelven vacío", () => {
    expect(labelOf(TipoOcupacion, null)).toBe("");
    expect(labelOf(TipoOcupacion, undefined)).toBe("");
  });

  it("no mezcla un texto numérico con el entero", () => {
    expect(labelOf(TipoOcupacion, "1")).toBe("1");
  });
});

describe("colorOf", () => {
  it("devuelve el color de MUI", () => {
    expect(colorOf(EstadoCochera, 1)).toBe("success");
    expect(colorOf(SeveridadAlerta, 4)).toBe("error");
  });

  it("sin color o desconocido devuelve default", () => {
    expect(colorOf(TipoOcupacion, 1)).toBe("default");
    expect(colorOf(EstadoCochera, 99)).toBe("default");
    expect(colorOf(EstadoCochera, null)).toBe("default");
  });
});

describe("labelOfKey", () => {
  it("etiqueta desde el nombre en texto", () => {
    expect(labelOfKey(RolUsuario, "DUENO")).toBe("Dueño");
  });

  it("clave desconocida devuelve el texto; null devuelve vacío", () => {
    expect(labelOfKey(RolUsuario, "OTRO_ROL")).toBe("OTRO_ROL");
    expect(labelOfKey(RolUsuario, null)).toBe("");
  });
});

describe("optionsOf", () => {
  it("lista todas las entradas como { value, label }", () => {
    expect(optionsOf(TipoOcupacion)).toEqual([
      { value: 1, label: "Hora" },
      { value: 2, label: "Día" },
      { value: 3, label: "Mes" },
    ]);
  });

  it("only deja solo esas claves", () => {
    const o = optionsOf(EstadoCochera, { only: ["DISPONIBLE", "BLOQUEADA"] });
    expect(o.map((x) => x.value)).toEqual([1, 2]);
  });

  it("exclude saca esas claves", () => {
    const o = optionsOf(EstadoCochera, { exclude: ["BLOQUEADA"] });
    expect(o.map((x) => x.value)).toEqual([1, 3, 4]);
  });

  it("excludeCalculated no trae VENCIDA", () => {
    const o = optionsOf(EstadoOcupacion, { excludeCalculated: true });
    expect(o.map((x) => x.value)).toEqual([1, 3, 4]);
  });

  it("allLabel agrega la opción vacía al principio", () => {
    const o = optionsOf(TipoOcupacion, { allLabel: "Todos" });
    expect(o[0]).toEqual({ value: "", label: "Todos" });
    expect(o).toHaveLength(4);
  });
});

describe("defineEnum", () => {
  it("acepta valores de texto (enums de string de la spec 04)", () => {
    const Fuente = defineEnum("Fuente", {
      PAGO: { value: "PAGO", label: "Pago" },
      CAJA: { value: "CAJA", label: "Caja", color: "info" },
    });
    expect(Fuente.PAGO).toBe("PAGO");
    expect(labelOf(Fuente, "CAJA")).toBe("Caja");
    expect(colorOf(Fuente, "CAJA")).toBe("info");
    expect(labelOf(Fuente, "XX")).toBe("XX");
  });

  it("rechaza valores duplicados", () => {
    expect(() =>
      defineEnum("X", { A: { value: 1, label: "A" }, B: { value: 1, label: "B" } }),
    ).toThrow(RangeError);
  });

  it("rechaza un value inválido o una entrada sin label", () => {
    expect(() => defineEnum("X", { A: { value: null, label: "A" } })).toThrow(TypeError);
    expect(() => defineEnum("X", { A: { value: NaN, label: "A" } })).toThrow(TypeError);
    expect(() => defineEnum("X", { A: { value: 1 } })).toThrow(TypeError);
  });
});
