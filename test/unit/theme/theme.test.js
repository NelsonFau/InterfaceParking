import { describe, expect, it } from "vitest";
import {
  BUTTON_RADIUS,
  FONT_FAMILY,
  PALETTE,
  RADIUS,
  TONE_KEYS,
  getTheme,
} from "../../../src/theme/theme.js";

// Contraste WCAG entre dos colores (hex o rgba). Un color con alfa se compone sobre `over`.
function parse(color) {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
  return { r, g, b, a };
}
function flatten(color, over) {
  const c = parse(color);
  const o = parse(over);
  return {
    r: c.r * c.a + o.r * (1 - c.a),
    g: c.g * c.a + o.g * (1 - c.a),
    b: c.b * c.a + o.b * (1 - c.a),
  };
}
function luminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

describe("getTheme", () => {
  it("1: los dos modos tienen los 8 tonos con texto, fondo y borde", () => {
    for (const mode of ["light", "dark"]) {
      const tones = getTheme(mode).palette.pc.tone;
      expect(Object.keys(tones).sort()).toEqual([...TONE_KEYS].sort());
      for (const key of TONE_KEYS) {
        expect(tones[key].text).toBeTruthy();
        expect(tones[key].bg).toBeTruthy();
        expect(tones[key].border).toBeTruthy();
      }
    }
  });

  it("2: radio de tarjetas 10 y de botón 12", () => {
    expect(getTheme("light").shape.borderRadius).toBe(10);
    expect(RADIUS).toBe(10);
    expect(BUTTON_RADIUS).toBe(12);
  });

  it("3: la fuente empieza con Red Hat Display", () => {
    expect(getTheme("light").typography.fontFamily.startsWith('"Red Hat Display"')).toBe(true);
    expect(FONT_FAMILY.startsWith('"Red Hat Display"')).toBe(true);
  });

  it("4: el texto de ok, wa, er, in y de pasa AA (4.5) sobre su fondo en las dos paletas", () => {
    for (const mode of ["light", "dark"]) {
      const { surf, tone } = PALETTE[mode];
      for (const key of ["ok", "wa", "er", "in", "de"]) {
        const bg = flatten(tone[key].bg, surf);
        const fg = flatten(tone[key].text, surf);
        expect(contrast(fg, bg), `${mode}/${key}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("5: palette.mode", () => {
    expect(getTheme("light").palette.mode).toBe("light");
    expect(getTheme("dark").palette.mode).toBe("dark");
  });

  it("el menú lateral y la paleta base salen de la tabla del diseño", () => {
    const light = getTheme("light").palette;
    const dark = getTheme("dark").palette;
    expect(light.pc.side).toBe("#DCCFB8");
    expect(dark.pc.side).toBe("#242424");
    expect(light.background.default).toBe("#F6F3EE");
    expect(dark.background.default).toBe("#1A1A1A");
    expect(light.primary.main).toBe("#6f4e37");
    expect(dark.primary.light).toBe("#d9b99b");
  });
});
