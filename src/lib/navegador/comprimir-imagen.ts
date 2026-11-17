// Compresión de fotos del celular EN EL NAVEGADOR, antes de subirlas (Fase E1).
// Una foto de celular pesa entre 3 y 12 MB: el servidor rechaza lo que pase de 4 MB (Fase 3) y Vercel corta
// cualquier cuerpo de más de 4,5 MB. Reducirla aquí ahorra datos móviles y almacenamiento en Blob SIN tocar la
// API, que sigue validando tamaño, tipo real por bytes y que la imagen se pueda decodificar.

/** Lado mayor máximo: 2000 px conserva legible el texto de una factura para el OCR y deja la foto en ~300–800 KB. */
export const LADO_MAXIMO = 2000;
/** Calidad JPEG: por debajo de ~0,8 aparecen artefactos alrededor de las letras, que confunden al OCR. */
export const CALIDAD_JPEG = 0.85;

export const MENSAJE_FORMATO_NO_LEGIBLE =
  "Este formato no se puede leer; cambia la cámara a «Más compatible» (JPEG) y vuelve a tomar la foto.";

/** El navegador no pudo decodificar la imagen (típico: HEIC de iPhone en un navegador sin soporte). */
export class FormatoNoLegible extends Error {}

/**
 * Medidas nuevas con el lado mayor en `ladoMax` como máximo, conservando la proporción.
 * Nunca amplía: una imagen ya pequeña se deja igual (ampliar no añade detalle y sí peso).
 */
export function medidasDestino(ancho: number, alto: number, ladoMax: number = LADO_MAXIMO): { ancho: number; alto: number } {
  if (!(ancho > 0) || !(alto > 0) || !(ladoMax > 0)) throw new RangeError("Las medidas deben ser números positivos");
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMax) return { ancho: Math.round(ancho), alto: Math.round(alto) };
  const escala = ladoMax / mayor;
  // Math.max(1, …): una imagen muy alargada no puede quedar con un lado de 0 px.
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

/** `foto_AAAAMMDD_HHmmss_N.jpg` con la hora local del teléfono (la de quien toma la foto). */
export function nombreFoto(fecha: Date, n: number): string {
  const dos = (v: number) => String(v).padStart(2, "0");
  const dia = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
  return `foto_${dia}_${hora}_${n}.jpg`;
}

/**
 * Solo navegador. Decodifica la foto respetando su orientación EXIF (si no, las fotos tomadas en vertical
 * llegarían de lado), la reduce con `medidasDestino` y la exporta a JPEG.
 * Lanza `FormatoNoLegible` si el navegador no puede decodificarla, para avisar ANTES de subirla y recibir un 415.
 */
export async function comprimirFoto(archivo: File, n: number, fecha: Date = new Date()): Promise<File> {
  let mapa: ImageBitmap;
  try {
    mapa = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new FormatoNoLegible(MENSAJE_FORMATO_NO_LEGIBLE);
  }
  try {
    const { ancho, alto } = medidasDestino(mapa.width, mapa.height);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite procesar la imagen");
    // JPEG no tiene transparencia: sin un fondo, las zonas transparentes de una PNG quedarían negras.
    // (Es el color del papel, no un color de la interfaz: por eso no usa los tokens de globals.css).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(mapa, 0, 0, ancho, alto);
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG));
    if (!blob) throw new Error("No se pudo comprimir la foto");
    return new File([blob], nombreFoto(fecha, n), { type: "image/jpeg", lastModified: fecha.getTime() });
  } finally {
    mapa.close(); // libera la memoria de la imagen decodificada (en un celular, ~48 MB por foto de 12 Mpx)
  }
}
