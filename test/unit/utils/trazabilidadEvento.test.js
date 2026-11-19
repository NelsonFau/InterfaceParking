import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditoriaDetalle,
  canonicalKey,
  detallePares,
  diffAntesDespues,
  formatValor,
  humanizeKey,
  resumenDeEvento,
} from "../../../src/utils/trazabilidadEvento.js";

const TZ = "America/Montevideo";
// Los espacios no cortables de formatMoney se normalizan al comparar.
const sinNbsp = (s) => s.replaceAll(" ", " ");

describe("canonicalKey", () => {
  it("17: normaliza mayúsculas y espacios", () => {
    expect(canonicalKey("Finalizar")).toBe("FINALIZAR");
    expect(canonicalKey(" pago ")).toBe("PAGO");
    expect(canonicalKey(null)).toBe("");
  });
});

describe("diffAntesDespues", () => {
  it("18: cambiado, igual y agregado, en el orden de despues", () => {
    expect(diffAntesDespues({ a: 1, b: "x" }, { a: 2, b: "x", c: true })).toEqual([
      { campo: "a", antes: 1, despues: 2, estado: "cambiado" },
      { campo: "b", antes: "x", despues: "x", estado: "igual" },
      { campo: "c", antes: null, despues: true, estado: "agregado" },
    ]);
  });

  it("las claves que solo estaban en antes van al final como quitadas", () => {
    const filas = diffAntesDespues({ a: 1, z: 9 }, { a: 1 });
    expect(filas.map((f) => [f.campo, f.estado])).toEqual([
      ["a", "igual"],
      ["z", "quitado"],
    ]);
  });

  it("19: antes nulo -> todas agregadas; despues nulo -> todas quitadas; los dos nulos -> sin filas", () => {
    expect(diffAntesDespues(null, { a: 1, b: 2 }).map((f) => f.estado)).toEqual(["agregado", "agregado"]);
    expect(diffAntesDespues({ a: 1, b: 2 }, null).map((f) => f.estado)).toEqual(["quitado", "quitado"]);
    expect(diffAntesDespues(null, null)).toEqual([]);
  });

  it("compara valores anidados enteros, sin depender del orden de sus claves", () => {
    const igual = diffAntesDespues({ o: { x: 1, y: 2 } }, { o: { y: 2, x: 1 } });
    expect(igual[0].estado).toBe("igual");
    const cambiado = diffAntesDespues({ o: [1, 2] }, { o: [1, 3] });
    expect(cambiado[0].estado).toBe("cambiado");
  });
});

describe("auditoriaDetalle", () => {
  it("19: con los dos JSON sin parsear muestra los dos textos tal cual, sin filas", () => {
    const r = auditoriaDetalle({ antes: null, despues: null, antesTexto: "{roto", despuesTexto: "otro" });
    expect(r).toEqual({ modo: "texto", antes: "{roto", despues: "otro" });
  });

  it("sin textos usa las diferencias", () => {
    const r = auditoriaDetalle({ antes: null, despues: { a: 1 } });
    expect(r.modo).toBe("diff");
    expect(r.filas).toHaveLength(1);
  });
});

describe("formatValor", () => {
  it("20: null, booleano, instante con Z en la zona y objeto", () => {
    expect(formatValor(null, TZ)).toBe("—");
    expect(formatValor(true, TZ)).toBe("Sí");
    expect(formatValor(false, TZ)).toBe("No");
    expect(formatValor("2026-11-11T01:30:00.000Z", TZ)).toBe("10/11/2026 22:30:00");
    expect(formatValor({ a: 1, b: [2] }, TZ)).toBe('{"a":1,"b":[2]}');
  });

  it("un instante sin zona y un número se muestran tal cual", () => {
    expect(formatValor("2026-11-11T01:30:00", TZ)).toBe("2026-11-11T01:30:00");
    expect(formatValor(1, TZ)).toBe("1");
    expect(formatValor("hola", TZ)).toBe("hola");
  });
});

describe("humanizeKey", () => {
  it("usa las etiquetas de las claves conocidas y separa el resto", () => {
    expect(humanizeKey("fondoQueQuedo")).toBe("Fondo que quedó");
    expect(humanizeKey("observacion")).toBe("Observación");
    expect(humanizeKey("PrecioTotal")).toBe("Precio total");
    expect(humanizeKey("TopeDeCobro")).toBe("Tope de cobro");
    expect(humanizeKey("EsTarifaExcepcional")).toBe("Es tarifa excepcional");
    expect(humanizeKey("")).toBe("");
  });
});

describe("resumenDeEvento", () => {
  it("21: PAGO sin motivo y con motivo", () => {
    const base = { fuente: "PAGO", detalle: { monto: 1200, metodo: "EFECTIVO", motivo: null } };
    expect(sinNbsp(resumenDeEvento(base))).toBe("$ 1.200,00 · Efectivo");
    const conMotivo = { fuente: "PAGO", detalle: { monto: 1200, metodo: "EFECTIVO", motivo: "Error de cobro" } };
    expect(sinNbsp(resumenDeEvento(conMotivo))).toBe("$ 1.200,00 · Efectivo · Error de cobro");
  });

  it("DEVOLUCION usa el mismo formato", () => {
    const ev = { fuente: "DEVOLUCION", detalle: { monto: 50, metodo: "TRANSFERENCIA", motivo: "Saldo a favor" } };
    expect(sinNbsp(resumenDeEvento(ev))).toBe("$ 50,00 · Transferencia · Saldo a favor");
  });

  it("22: ALERTA con tipo y comentario", () => {
    const ev = { fuente: "ALERTA", detalle: { tipo: "CAJA_SIN_CERRAR", comentario: "ok" } };
    expect(resumenDeEvento(ev)).toBe("Caja sin cerrar · ok");
  });

  it("CAJA: pares con etiqueta; el dinero con formatMoney y el texto tal cual", () => {
    const ev = { fuente: "CAJA", detalle: { fondoDeclarado: 1000, efectivoContado: 1500.5, observacion: "Todo bien", motivo: null } };
    expect(sinNbsp(resumenDeEvento(ev))).toBe(
      "Fondo declarado: $ 1.000,00 · Efectivo contado: $ 1.500,50 · Observación: Todo bien",
    );
  });

  it("23: AUDITORIA con antes nulo es Alta y con despues nulo es Baja", () => {
    expect(resumenDeEvento({ fuente: "AUDITORIA", detalle: { antes: null, despues: { a: 1 } } })).toBe("Alta");
    expect(resumenDeEvento({ fuente: "AUDITORIA", detalle: { antes: { a: 1 }, despues: null } })).toBe("Baja");
  });

  it("AUDITORIA: cuenta los campos modificados", () => {
    const uno = { fuente: "AUDITORIA", detalle: { antes: { a: 1, b: 2 }, despues: { a: 1, b: 3 } } };
    expect(resumenDeEvento(uno)).toBe("1 campo modificado");
    const dos = { fuente: "AUDITORIA", detalle: { antes: { a: 1, b: 2 }, despues: { a: 2, b: 3 } } };
    expect(resumenDeEvento(dos)).toBe("2 campos modificados");
    const ninguno = { fuente: "AUDITORIA", detalle: { antes: { a: 1 }, despues: { a: 1 } } };
    expect(resumenDeEvento(ninguno)).toBe("Sin cambios");
  });

  it("una fuente en minúscula y un detalle que no es objeto no rompen", () => {
    expect(resumenDeEvento({ fuente: "alerta", detalle: { tipo: "CAJA_SIN_CERRAR" } })).toBe("Caja sin cerrar");
    expect(resumenDeEvento({ fuente: "PAGO", detalle: null })).toBe("");
    expect(resumenDeEvento({ fuente: "AUDITORIA", detalle: "x" })).toBe("Sin datos");
  });
});

describe("detallePares", () => {
  it("PAGO: monto, método y motivo con su formato", () => {
    const pares = detallePares({ fuente: "PAGO", detalle: { monto: 99, metodo: "TARJETA", motivo: "x" } }, TZ);
    expect(pares.map((p) => [p.etiqueta, sinNbsp(p.valor)])).toEqual([
      ["Monto", "$ 99,00"],
      ["Método", "Tarjeta"],
      ["Motivo", "x"],
    ]);
  });

  it("un tipo o un método desconocidos se muestran tal cual", () => {
    expect(detallePares({ fuente: "ALERTA", detalle: { tipo: "NUEVO" } }, TZ)[0].valor).toBe("NUEVO");
    expect(detallePares({ fuente: "PAGO", detalle: { metodo: "CHEQUE" } }, TZ)[0].valor).toBe("CHEQUE");
  });
});

describe("24: sin zona del sistema", () => {
  it.each(["trazabilidadLink", "trazabilidadFiltros", "trazabilidadEvento"])("%s no usa getHours, toLocale ni toISOString", (nombre) => {
    const src = readFileSync(new URL(`../../../src/utils/${nombre}.js`, import.meta.url), "utf8");
    expect(src).not.toMatch(/getHours|toLocale|toISOString/);
  });
});
