import { NextResponse, type NextRequest } from "next/server";
import { autenticacion } from "@/lib/firebase/admin";
import {
  correoPermitido,
  DURACION_SESION_DEMO_MS,
  DURACION_SESION_MS,
  esCorreoDemo,
  NOMBRE_COOKIE,
  respuesta401,
  usuarioDeSesion,
} from "@/lib/auth/sesion";

/** Quién soy (la interfaz lo usa para mostrar el correo y, desde la Fase E4, el rol: «lectura» = modo demo). */
export async function GET(request: NextRequest) {
  const usuario = await usuarioDeSesion(request);
  return usuario ? Response.json({ email: usuario.email, rol: usuario.rol }) : respuesta401();
}

/** Intercambia el ID token de Firebase por una cookie de sesión. */
export async function POST(request: NextRequest) {
  const cuerpo = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof cuerpo?.idToken !== "string") {
    return Response.json({ error: "Falta idToken" }, { status: 400 });
  }
  try {
    const decodificado = await autenticacion().verifyIdToken(cuerpo.idToken);
    // Fase E4: el usuario demo no está en USUARIOS_PERMITIDOS; entra con una sesión corta (2 h) y de solo lectura.
    const demo = esCorreoDemo(decodificado.email);
    if (!demo && !correoPermitido(decodificado.email)) {
      return Response.json({ error: "Este correo no está autorizado" }, { status: 403 });
    }
    const duracion = demo ? DURACION_SESION_DEMO_MS : DURACION_SESION_MS;
    const cookie = await autenticacion().createSessionCookie(cuerpo.idToken, {
      expiresIn: duracion,
    });
    const respuesta = NextResponse.json({ email: decodificado.email });
    respuesta.cookies.set(NOMBRE_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: duracion / 1000,
    });
    return respuesta;
  } catch {
    return respuesta401();
  }
}

/** Cerrar sesión: borra la cookie. */
export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete(NOMBRE_COOKIE);
  return respuesta;
}
