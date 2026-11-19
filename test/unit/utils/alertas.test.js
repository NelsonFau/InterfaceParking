import { describe, expect, it } from "vitest";
import {
  ALERTS_REFRESH_MS,
  MAX_COMENTARIO,
  TIPOS_OCUPACIONES_VENCIDAS,
  TIPOS_PAGOS_SOSPECHOSOS,
  buildAlertasPath,
  buildAlertQuery,
  buildResolveBody,
  getAlertLinks,
  getResolveState,
  parseAlertFiltersFromSearch,
  resolutionSummary,
  sumCounts,
} from "../../../src/utils/alertas.js";
import { buildTrazabilidadPath } from "../../../src/utils/trazabilidadLink.js";

const TZ = "America/Montevideo";

describe("buildAlertQuery", () => {
  it("1: estado por defecto, vacío y true", () => {
    expect(buildAlertQuery({}, TZ)).toEqual({ ok: true, params: { resuelta: false } });
    expect(buildAlertQuery({ estado: "" }, TZ)).toEqual({ ok: true, params: {} });
    expect(buildAlertQuery({ estado: "true" }, TZ)).toEqual({ ok: true, params: { resuelta: true } });
  });

  it("2: severidad y tipo como enteros; los vacíos se omiten", () => {
    const r = buildAlertQuery({ estado: "", severidad: "4", tipo: "10" }, TZ);
    expect(r.params).toEqual({ severidad: 4, tipo: 10 });
    expect(buildAlertQuery({ estado: "", severidad: "", tipo: "" }, TZ).params).toEqual({});
  });

  it("3: rango de días en instantes de la zona, con hasta inclusivo", () => {
    const r = buildAlertQuery({ estado: "", desde: "2026-11-01", hasta: "2026-11-01" }, TZ);
    expect(r.params.desde).toBe("2026-11-01T03:00:00.000Z");
    expect(r.params.hasta).toBe("2026-11-02T02:59:59.999Z");
    expect(buildAlertQuery({ estado: "", desde: "2026-11-01" }, TZ).params).toEqual({
      desde: "2026-11-01T03:00:00.000Z",
    });
    expect(buildAlertQuery({ estado: "", hasta: "2026-11-01" }, TZ).params).toEqual({
      hasta: "2026-11-02T02:59:59.999Z",
    });
  });

  it("4: desde posterior a hasta no devuelve parámetros", () => {
    const r = buildAlertQuery({ desde: "2026-11-05", hasta: "2026-11-01" }, TZ);
    expect(r.ok).toBe(false);
    expect(r.message).toBe("La fecha 'Desde' no puede ser posterior a 'Hasta'");
    expect(r.params).toBeUndefined();
  });

  it("una fecha mal formada es un error, no se manda", () => {
    expect(buildAlertQuery({ desde: "2026-13-45" }, TZ).ok).toBe(false);
    expect(buildAlertQuery({ hasta: "ayer" }, TZ).ok).toBe(false);
  });

  it("5: page, pageSize, ocupacionId y cajaSesionId", () => {
    const r = buildAlertQuery({ estado: "", page: 3, pageSize: 50, ocupacionId: 12, cajaSesionId: 7 }, TZ);
    expect(r.params).toEqual({ page: 3, pageSize: 50, ocupacionId: 12, cajaSesionId: 7 });
    expect(buildAlertQuery({ estado: "", ocupacionId: null, cajaSesionId: null }, TZ).params).toEqual({});
  });
});

describe("parseAlertFiltersFromSearch", () => {
  it("6: lee los válidos e ignora el tipo retirado y los ids inválidos", () => {
    expect(parseAlertFiltersFromSearch("?severidad=4&ocupacionId=12&tipo=4")).toEqual({
      severidad: 4,
      ocupacionId: 12,
    });
    expect(parseAlertFiltersFromSearch("?ocupacionId=abc")).toEqual({});
    expect(parseAlertFiltersFromSearch("?ocupacionId=-1&cajaSesionId=0")).toEqual({});
  });

  it("lee tipo, cajaSesionId y estado; acepta URLSearchParams", () => {
    expect(parseAlertFiltersFromSearch(new URLSearchParams("tipo=10&cajaSesionId=7&estado=true"))).toEqual({
      tipo: 10,
      cajaSesionId: 7,
      estado: "true",
    });
    expect(parseAlertFiltersFromSearch("?estado=")).toEqual({ estado: "" });
    expect(parseAlertFiltersFromSearch("?estado=otra&severidad=9")).toEqual({});
    expect(parseAlertFiltersFromSearch("")).toEqual({});
  });
});

describe("getResolveState", () => {
  const can = (...permisos) => (p) => permisos.includes(p);

  it("7: alerta resuelta, sin botón", () => {
    expect(getResolveState({ resuelta: true }, can("alertas.resolver", "alertas.resolver_dinero")).visible).toBe(false);
  });

  it("8: sin alertas.resolver, oculto (de dinero o no)", () => {
    expect(getResolveState({ esDeDinero: false }, can()).visible).toBe(false);
    expect(getResolveState({ esDeDinero: true }, can("alertas.resolver_dinero")).visible).toBe(false);
  });

  it("9: no es de dinero, habilitado sin alertas.resolver_dinero", () => {
    expect(getResolveState({ esDeDinero: false }, can("alertas.resolver"))).toMatchObject({
      visible: true,
      enabled: true,
    });
  });

  it("10: de dinero sin alertas.resolver_dinero, visible y deshabilitado con motivo", () => {
    const s = getResolveState({ esDeDinero: true }, can("alertas.resolver"));
    expect(s.visible).toBe(true);
    expect(s.enabled).toBe(false);
    expect(s.reason).not.toBe("");
  });

  it("11: de dinero con los dos permisos, habilitado", () => {
    expect(getResolveState({ esDeDinero: true }, can("alertas.resolver", "alertas.resolver_dinero"))).toMatchObject({
      visible: true,
      enabled: true,
    });
  });
});

describe("buildResolveBody", () => {
  it("12: de dinero, el comentario vacío o en blanco es error; con texto se recorta", () => {
    expect(buildResolveBody({ esDeDinero: true }, "").ok).toBe(false);
    expect(buildResolveBody({ esDeDinero: true }, "   ").ok).toBe(false);
    expect(buildResolveBody({ esDeDinero: true }, " ok ")).toEqual({ ok: true, body: { comentario: "ok" } });
  });

  it("13: no de dinero, vacío da {} y el tope es 500", () => {
    const r = buildResolveBody({ esDeDinero: false }, "");
    expect(r).toEqual({ ok: true, body: {} });
    expect("comentario" in r.body).toBe(false);
    expect(buildResolveBody({ esDeDinero: false }, "a".repeat(MAX_COMENTARIO + 1)).ok).toBe(false);
    expect(buildResolveBody({ esDeDinero: false }, "a".repeat(MAX_COMENTARIO)).ok).toBe(true);
  });
});

describe("resolutionSummary", () => {
  const fmt = (i) => `<${i}>`;

  it("14: por una persona, automática, con y sin comentario, y abierta", () => {
    const persona = resolutionSummary(
      { resuelta: true, fechaResolucion: "F", resueltaPorNombre: "Ana", comentarioResolucion: "Listo" },
      fmt,
    );
    expect(persona).toEqual({ text: "Resuelta el <F> por Ana", comentario: "Listo" });

    const auto = resolutionSummary({ resuelta: true, fechaResolucion: "F", resolucionAutomatica: true }, fmt);
    expect(auto).toEqual({ text: "Resuelta el <F> automáticamente", comentario: null });
    expect(auto.text).not.toContain("por");

    expect(resolutionSummary({ resuelta: true, fechaResolucion: "F", resueltaPorNombre: "Ana" }, fmt).comentario).toBe(
      null,
    );
    expect(resolutionSummary({ resuelta: false }, fmt)).toBeNull();
  });
});

describe("getAlertLinks", () => {
  it("15: enlace a Trazabilidad con los dos ids, solo con permiso", () => {
    const alerta = { ocupacionId: 12, cajaSesionId: 7 };
    const links = getAlertLinks(alerta, { canTrazabilidad: true });
    expect(links).toHaveLength(1);
    expect(links[0].to).toBe(buildTrazabilidadPath({ ocupacionId: 12, cajaSesionId: 7 }));
    expect(links[0].to).toBe("/trazabilidad?ocupacionId=12&cajaSesionId=7");
    expect(getAlertLinks(alerta, { canTrazabilidad: false })).toEqual([]);
    expect(getAlertLinks(alerta)).toEqual([]);
  });

  it("sin ids no hay enlace; con uno solo, va ese", () => {
    expect(getAlertLinks({}, { canTrazabilidad: true })).toEqual([]);
    expect(getAlertLinks({ ocupacionId: null, cajaSesionId: null }, { canTrazabilidad: true })).toEqual([]);
    expect(getAlertLinks({ cajaSesionId: 7 }, { canTrazabilidad: true })[0].to).toBe("/trazabilidad?cajaSesionId=7");
  });
});

describe("sumCounts", () => {
  const ok = (value) => ({ status: "fulfilled", value });
  it("suma los conteos; si alguno falló, null", () => {
    expect(sumCounts([ok(2), ok(0), ok(5)])).toBe(7);
    expect(sumCounts([ok(2), { status: "rejected", reason: new Error("x") }])).toBeNull();
    expect(sumCounts([])).toBe(0);
  });
});

describe("constantes", () => {
  it("intervalo, grupos de tipos y ruta con severidad", () => {
    expect(ALERTS_REFRESH_MS).toBe(300000);
    expect(TIPOS_PAGOS_SOSPECHOSOS).toEqual([5, 6, 7]);
    expect(TIPOS_OCUPACIONES_VENCIDAS).toEqual([1, 2]);
    expect(buildAlertasPath({ severidad: 4 })).toBe("/alertas-operativas?severidad=4");
    expect(buildAlertasPath()).toBe("/alertas-operativas");
  });
});
