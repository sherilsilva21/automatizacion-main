// Periodos de declaración de IVA (Fase E2). Funciones PURAS que trabajan con el TEXTO `yyyy-mm-dd`:
// `new Date("2026-03-01")` se interpreta en UTC y en Colombia (UTC−5) cae el 28 de febrero, es decir, en el
// periodo anterior. Por eso aquí nunca se construye un Date a partir de la fecha de la factura.

import { MESES_POR_PERIODO_IVA } from "@/lib/ocr/constantes";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Letra del tipo de periodo en la clave: B = bimestre, C = cuatrimestre, P = otro. */
const letra = (meses: number) => (meses === 2 ? "B" : meses === 4 ? "C" : "P");

const esBisiesto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasDelMes = (a: number, m: number) => [31, esBisiesto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/**
 * Clave del periodo de una fecha de emisión `yyyy-mm-dd`: `"2026-B3"` (mayo–junio con bimestres).
 * `null` si la fecha no es una fecha real (formato, mes 13, 29 de febrero de un año no bisiesto…):
 * una factura sin fecha legible no suma a ningún periodo.
 */
export function periodoDe(fecha: string | null | undefined, meses: number = MESES_POR_PERIODO_IVA): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? "");
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (anio < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) return null;
  return `${anio}-${letra(meses)}${Math.floor((mes - 1) / meses) + 1}`;
}

/** Año y número del periodo a partir de su clave (`"2026-B3"` → { anio: 2026, n: 3 }), o null si no es válida. */
export function partesPeriodo(clave: string): { anio: number; n: number } | null {
  const m = /^(\d{4})-[A-Z](\d{1,2})$/.exec(clave);
  return m ? { anio: Number(m[1]), n: Number(m[2]) } : null;
}

/** Nombre legible: `"2026-B3"` → «Mayo – junio 2026». */
export function nombrePeriodo(clave: string, meses: number = MESES_POR_PERIODO_IVA): string {
  const p = partesPeriodo(clave);
  if (!p) return clave;
  const primero = (p.n - 1) * meses;
  const nombre = `${MESES[primero]} – ${MESES[primero + meses - 1]}`;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${p.anio}`;
}

/** Todas las claves de un año, en orden (6 bimestres o 3 cuatrimestres): el reporte las muestra aunque estén en 0. */
export function periodosDelAnio(anio: number, meses: number = MESES_POR_PERIODO_IVA): string[] {
  return Array.from({ length: 12 / meses }, (_, i) => `${anio}-${letra(meses)}${i + 1}`);
}
