import { connection } from "next/server";
import { configDemo } from "@/lib/auth/sesion";
import { autenticacion } from "@/lib/firebase/admin";

/** ¿Está configurada la demo? La página de login lo usa para mostrar u ocultar «Ver demo». */
export async function GET() {
  await connection(); // se evalúa en cada petición (las variables pueden cambiar con un Redeploy)
  return Response.json({ disponible: configDemo() !== null });
}

/**
 * Fase E4 · entrar a la demo SIN contraseña: el servidor crea un token personalizado del usuario demo; el navegador
 * lo cambia por un ID token (signInWithCustomToken) y sigue el flujo normal de POST /api/sesion, que da una sesión
 * de 2 horas y de solo lectura. La contraseña del usuario demo no se usa ni se publica en ningún lado.
 * Es público a propósito (la demo es para cualquiera); lo que protege es que esa sesión no puede escribir (403).
 */
export async function POST() {
  const demo = configDemo();
  if (!demo) return Response.json({ error: "La demo no está configurada" }, { status: 404 });
  try {
    const usuarioDemo = await autenticacion().getUserByEmail(demo.correo);
    return Response.json({ token: await autenticacion().createCustomToken(usuarioDemo.uid) });
  } catch {
    return Response.json({ error: "No se pudo preparar la demo" }, { status: 503 });
  }
}
