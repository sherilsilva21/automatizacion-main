import { describe, expect, it } from "vitest";
import { camposAplicables, camposConProblema } from "./campos";

describe("camposConProblema (mensajes de validación reales → campos)", () => {
  it("relaciona cada motivo con su campo", () => {
    expect([...camposConProblema(["Falta el documento del cliente"])].sort()).toEqual(["clienteDocumento", "clienteDv", "clienteNombre"]);
    expect([...camposConProblema(["Falta el total"])]).toEqual(["total"]);
    expect([...camposConProblema(["El IVA 1552870 no es el 19 % de 6173000"])]).toEqual(["iva"]);
    expect([...camposConProblema(['Ítem "Licencia": 6 × 694000 ≠ 64000'])]).toEqual(["items"]);
    expect([...camposConProblema(["La fecha no existe"])]).toEqual(["fecha"]);
    expect([...camposConProblema(["El número debe verse como FE-000123"])]).toEqual(["numero"]);
  });
  it("«Los ítems suman X y el valor antes de IVA es Y» señala ítems y subtotal (no el IVA)", () => {
    expect([...camposConProblema(["Los ítems suman 2064900 y el valor antes de IVA es 6173000"])].sort()).toEqual(["items", "subtotal"]);
  });
  it("sin mensajes no hay campos con problema", () => {
    expect(camposConProblema([]).size).toBe(0);
  });
});

describe("camposAplicables", () => {
  const vacios = new Set(["clienteNombre"]);
  const vacio = (c: string) => vacios.has(c);

  it("rellena los vacíos y los que tienen problema; NO pisa lo que la persona ya escribió y está bien", () => {
    const r = camposAplicables(["clienteNombre", "total", "proveedor", "numero"], vacio, ["Falta el total"]);
    expect(r.sort()).toEqual(["clienteNombre", "total"]);
  });
  it("si la IA no sugiere un campo, no se toca aunque esté vacío", () => {
    expect(camposAplicables(["total"], vacio, [])).toEqual([]);
  });
});
