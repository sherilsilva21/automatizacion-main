// Fase E3 · qué campos del formulario puede rellenar una sugerencia de IA. Puro y sin código de servidor (lo usa el
// navegador). Regla de la guía: la IA solo rellena campos VACÍOS o señalados por alguna validación; nunca pisa lo
// que la persona ya escribió y está bien.

import type { CampoIa } from "./sugerir";

// Palabras de los mensajes de validación (validador.ts y el esquema) → campos a los que apuntan.
const PISTAS: [RegExp, CampoIa[]][] = [
  [/n[uú]mero de factura|el n[uú]mero|FE-000123/i, ["numero"]],
  [/fecha/i, ["fecha"]],
  [/raz[oó]n social|proveedor/i, ["proveedor", "nitProveedor", "dvProveedor"]],
  [/cliente/i, ["clienteDocumento", "clienteDv", "clienteNombre"]],
  [/[íi]tem/i, ["items"]],
  [/antes de IVA|subtotal/i, ["subtotal"]],
  [/(?<!antes de\s)\bIVA\b/, ["iva"]], // «valor antes de IVA» es el subtotal, no el IVA
  [/impoconsumo/i, ["impoconsumo"]],
  [/\btotal\b/i, ["total"]],
];

/** Campos señalados por los mensajes de validación (motivos o problemas de formato). */
export function camposConProblema(mensajes: string[]): Set<CampoIa> {
  const campos = new Set<CampoIa>();
  for (const m of mensajes) for (const [patron, destino] of PISTAS) if (patron.test(m)) destino.forEach((c) => campos.add(c));
  return campos;
}

/**
 * Campos que la sugerencia puede rellenar: los que la IA trae Y (están vacíos O tienen un problema).
 * `vacio(campo)` lo decide el formulario (por ejemplo, un total que la persona no escribió cuenta como vacío).
 */
export function camposAplicables(sugeridos: CampoIa[], vacio: (c: CampoIa) => boolean, mensajes: string[]): CampoIa[] {
  const conProblema = camposConProblema(mensajes);
  return sugeridos.filter((c) => vacio(c) || conProblema.has(c));
}
