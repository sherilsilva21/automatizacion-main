"use client";

import { signInWithCustomToken, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authCliente } from "@/lib/firebase/cliente";

/** Cambia el ID token de Firebase por la cookie de sesión del servidor (el mismo paso para el login normal y la demo). */
async function abrirSesion(idToken: string): Promise<void> {
  const r = await fetch("/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) {
    const datos = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(datos.error ?? "No se pudo iniciar sesión");
  }
}

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<"" | "normal" | "demo">("");
  const [hayDemo, setHayDemo] = useState(false);

  // Fase E4: «Ver demo» solo aparece si el servidor tiene la demo configurada (DEMO_CORREO y DEMO_UID_DATOS).
  useEffect(() => {
    let vivo = true;
    fetch("/api/sesion/demo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { disponible: false }))
      .then((d: { disponible?: boolean }) => { if (vivo) setHayDemo(Boolean(d.disponible)); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, []);

  function terminar() {
    router.replace("/");
    router.refresh();
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando("normal");
    const auth = authCliente();
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo, clave);
      await abrirSesion(await credencial.user.getIdToken());
      terminar();
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith("Firebase") ? "Correo o contraseña incorrectos" : (err as Error).message);
    } finally {
      // La sesión real vive en la cookie del servidor; la de Firebase en el navegador sobra.
      await signOut(auth).catch(() => undefined);
      setCargando("");
    }
  }

  /** Demo de solo lectura: el servidor da un token personalizado del usuario demo (su contraseña nunca se usa). */
  async function verDemo() {
    setError(null);
    setCargando("demo");
    const auth = authCliente();
    try {
      const r = await fetch("/api/sesion/demo", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!r.ok || !d.token) throw new Error(d.error ?? "La demo no está disponible");
      const credencial = await signInWithCustomToken(auth, d.token);
      await abrirSesion(await credencial.user.getIdToken());
      terminar();
    } catch (err) {
      setError(err instanceof Error && !err.message.startsWith("Firebase") ? err.message : "No se pudo abrir la demo");
    } finally {
      await signOut(auth).catch(() => undefined);
      setCargando("");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="rounded border border-borde bg-superficie px-3 py-2"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="rounded border border-borde bg-superficie px-3 py-2"
        />
        <button
          type="submit"
          disabled={cargando !== ""}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {cargando === "normal" ? "Entrando…" : "Entrar"}
        </button>
        {error && <p role="alert" className="text-sm text-malo">{error}</p>}
      </form>
      {hayDemo && (
        <div className="flex flex-col gap-2 border-t border-borde pt-4 text-sm">
          <p className="text-texto2">¿Solo quieres ver cómo funciona? Recorre la aplicación con datos ya procesados, sin poder cambiar nada.</p>
          <button
            type="button" onClick={() => void verDemo()} disabled={cargando !== ""} data-testid="ver-demo"
            className="rounded border border-borde bg-superficie px-3 py-2 font-medium hover:bg-pista disabled:opacity-50"
          >
            {cargando === "demo" ? "Abriendo la demo…" : "Ver demo (solo lectura)"}
          </button>
        </div>
      )}
    </main>
  );
}
