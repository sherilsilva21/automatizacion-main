import { describe, expect, it } from "vitest";
import { nombrePeriodo, partesPeriodo, periodoDe, periodosDelAnio } from "./periodos";

describe("periodoDe (bimestres)", () => {
  it("agrupa los meses de dos en dos", () => {
    expect(periodoDe("2026-01-01")).toBe("2026-B1");
    expect(periodoDe("2026-02-15")).toBe("2026-B1");
    expect(periodoDe("2026-03-01")).toBe("2026-B2");
    expect(periodoDe("2026-05-15")).toBe("2026-B3");
    expect(periodoDe("2026-12-31")).toBe("2026-B6");
  });

  it("el 1 de marzo es del bimestre mar–abr (no se corre al anterior por la zona horaria)", () => {
    // Con new Date("2026-03-01") en Colombia (UTC−5) sería 28 de febrero → B1. Se trabaja con el texto.
    expect(periodoDe("2026-03-01")).toBe("2026-B2");
  });

  it("28 de febrero siempre vale; 29 solo en año bisiesto", () => {
    expect(periodoDe("2026-02-28")).toBe("2026-B1");
    expect(periodoDe("2028-02-29")).toBe("2028-B1");
    expect(periodoDe("2026-02-29")).toBeNull();
    expect(periodoDe("1900-02-29")).toBeNull(); // divisible por 100 y no por 400: no es bisiesto
    expect(periodoDe("2000-02-29")).toBe("2000-B1"); // divisible por 400: sí lo es
  });

  it("fechas inválidas o ausentes → null", () => {
    for (const f of ["2026-13-01", "2026-00-10", "2026-04-31", "2026-01-00", "15/03/2026", "2026-3-1", "", null, undefined]) {
      expect(periodoDe(f)).toBeNull();
    }
  });

  it("con cuatrimestres (4 meses) cambian los cortes y la letra", () => {
    expect(periodoDe("2026-04-30", 4)).toBe("2026-C1");
    expect(periodoDe("2026-05-01", 4)).toBe("2026-C2");
    expect(periodoDe("2026-12-31", 4)).toBe("2026-C3");
  });
});

describe("nombres y listas de periodos", () => {
  it("nombrePeriodo da el rango de meses con el año", () => {
    expect(nombrePeriodo("2026-B3")).toBe("Mayo – junio 2026");
    expect(nombrePeriodo("2026-B1")).toBe("Enero – febrero 2026");
    expect(nombrePeriodo("2026-B6")).toBe("Noviembre – diciembre 2026");
    expect(nombrePeriodo("2026-C2", 4)).toBe("Mayo – agosto 2026");
  });

  it("una clave que no es de periodo se devuelve tal cual", () => {
    expect(nombrePeriodo("otra-cosa")).toBe("otra-cosa");
    expect(partesPeriodo("otra-cosa")).toBeNull();
  });

  it("periodosDelAnio lista los 6 bimestres en orden", () => {
    expect(periodosDelAnio(2026)).toEqual(["2026-B1", "2026-B2", "2026-B3", "2026-B4", "2026-B5", "2026-B6"]);
    expect(periodosDelAnio(2026, 4)).toEqual(["2026-C1", "2026-C2", "2026-C3"]);
  });
});
