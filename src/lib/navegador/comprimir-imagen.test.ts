import { describe, expect, it } from "vitest";
import { LADO_MAXIMO, medidasDestino, nombreFoto } from "./comprimir-imagen";

describe("medidasDestino", () => {
  it("reduce una foto horizontal de 12 Mpx a 2000 px de lado mayor, conservando la proporción", () => {
    expect(medidasDestino(4000, 3000)).toEqual({ ancho: 2000, alto: 1500 });
  });

  it("reduce una foto vertical (la factura de pie) por su alto", () => {
    expect(medidasDestino(3024, 4032)).toEqual({ ancho: 1500, alto: 2000 });
  });

  it("no amplía una imagen que ya es pequeña", () => {
    expect(medidasDestino(1200, 800)).toEqual({ ancho: 1200, alto: 800 });
  });

  it("deja igual una imagen con el lado mayor exactamente en el límite", () => {
    expect(medidasDestino(2000, 1000)).toEqual({ ancho: 2000, alto: 1000 });
  });

  it("redondea a píxeles enteros y el lado mayor queda exactamente en el límite", () => {
    const r = medidasDestino(4001, 3001);
    expect(Number.isInteger(r.ancho) && Number.isInteger(r.alto)).toBe(true);
    expect(r.ancho).toBe(LADO_MAXIMO);
    expect(r.alto).toBe(1500);
  });

  it("una imagen muy alargada no queda con un lado de 0 px", () => {
    expect(medidasDestino(10000, 1)).toEqual({ ancho: 2000, alto: 1 });
  });

  it("acepta otro lado máximo", () => {
    expect(medidasDestino(1000, 500, 500)).toEqual({ ancho: 500, alto: 250 });
  });

  it("rechaza medidas que no son positivas", () => {
    expect(() => medidasDestino(0, 100)).toThrow(RangeError);
    expect(() => medidasDestino(100, -1)).toThrow(RangeError);
    expect(() => medidasDestino(Number.NaN, 100)).toThrow(RangeError);
  });
});

describe("nombreFoto", () => {
  it("usa el formato foto_AAAAMMDD_HHmmss_N.jpg con ceros a la izquierda", () => {
    // new Date(año, mes0, …) es hora LOCAL, igual que nombreFoto: la prueba no depende de la zona horaria.
    expect(nombreFoto(new Date(2026, 2, 5, 7, 8, 9), 3)).toBe("foto_20260305_070809_3.jpg");
  });

  it("el número distingue fotos tomadas en el mismo segundo", () => {
    const f = new Date(2026, 10, 17, 23, 59, 59);
    expect(nombreFoto(f, 1)).not.toBe(nombreFoto(f, 2));
  });
});
