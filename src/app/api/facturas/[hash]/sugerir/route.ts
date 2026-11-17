import { get } from "@vercel/blob";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import { exigirEscritura } from "@/lib/auth/sesion";
import { firestore } from "@/lib/firebase/admin";
import { claveIa, ErrorIa, liberarSugerencia, reservarSugerencia, sugerirDatos } from "@/lib/ia/sugerir";
import { COLECCIONES, type Factura } from "@/lib/modelo/tipos";
import { leerFactura } from "@/lib/ocr/leer-factura";

/** OCR (hasta ~3 lecturas) + IA (tope de 30 s): 60 s de margen. */
export const maxDuration = 60;

const HASH = /^[a-f0-9]{64}$/;
const ROTACIONES = new Set([90, 180, 270]);

/**
 * Fase E3 · «Sugerir con IA». Vuelve a leer la imagen con OCR y envía SOLO ese texto al modelo (nunca la imagen ni
 * datos de otras facturas). Devuelve sugerencias ya validadas con el esquema de la revisión; NO guarda nada: guardar
 * sigue siendo PUT /api/facturas/[hash], que decide la persona. Si la IA falla, 502 con un mensaje para seguir a mano.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/facturas/[hash]/sugerir">) {
  const usuario = await exigirEscritura(request);
  if (usuario instanceof Response) return usuario;
  const clave = claveIa();
  if (!clave) return Response.json({ error: "El asistente de IA no está configurado" }, { status: 503 });
  const { hash } = await ctx.params;
  if (!HASH.test(hash)) return Response.json({ error: "Identificador no válido" }, { status: 400 });
  const snap = await firestore().collection(COLECCIONES.facturas).doc(hash).get();
  if (!snap.exists || (snap.data() as Factura).uid !== usuario.uid) return Response.json({ error: "No encontrada" }, { status: 404 });
  const f = snap.data() as Factura;
  if (f.estado !== "revision") return Response.json({ error: "Esta factura no está en revisión" }, { status: 409 });
  const rotar = Number(request.nextUrl.searchParams.get("rotar") ?? 0);
  if (rotar !== 0 && !ROTACIONES.has(rotar)) return Response.json({ error: "rotar debe ser 0, 90, 180 o 270" }, { status: 400 });

  const reserva = reservarSugerencia(usuario.uid, Date.now());
  if (!reserva.ok) return Response.json({ error: reserva.error }, { status: 429 });
  try {
    const blob = await get(f.blobPathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return Response.json({ error: "Imagen no encontrada" }, { status: 404 });
    let imagen = Buffer.from(await new Response(blob.stream).arrayBuffer());
    // Factura fotografiada de lado: se endereza ANTES del OCR (el original en Blob no se toca).
    if (rotar !== 0) imagen = await sharp(imagen).rotate(rotar, { background: "#ffffff" }).toBuffer();
    const t0 = Date.now();
    const lectura = await leerFactura(imagen);
    const msOcr = Date.now() - t0;
    const r = await sugerirDatos(lectura.texto, clave);
    return Response.json({ sugerencias: r.sugerencias, descartados: r.descartados, msIa: r.ms, msOcr });
  } catch (e) {
    // Nunca se reenvía el error crudo del proveedor (podría traer detalles de la cuenta); la revisión sigue a mano.
    const detalle = e instanceof ErrorIa ? e.message : "error inesperado";
    return Response.json({ error: "La IA no respondió; completa los campos a mano", detalle }, { status: 502 });
  } finally {
    liberarSugerencia(usuario.uid);
  }
}
