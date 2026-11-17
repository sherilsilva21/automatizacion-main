"use client";

import { signInWithCustomToken, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authCliente } from "@/lib/firebase/cliente";
import { SelectorTema } from "@/componentes/SelectorTema";
import { Aviso, Boton, IconoDescarga, IconoMarca, IconoOk, IconoPluma } from "@/componentes/ui";

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

// Lo que hace la app, en tres pasos (columna de presentación del login).
const PASOS = [
  { icono: <IconoMarca className="h-5 w-5" />, titulo: "Lee las facturas", texto: "Sube una carpeta de imágenes: la app las lee con OCR, incluso mil a la vez." },
  { icono: <IconoOk className="h-5 w-5" />, titulo: "Valida cada cifra", texto: "IVA del 19 %, impoconsumo, sumas y dígito de verificación del NIT." },
  { icono: <IconoPluma className="h-5 w-5" />, titulo: "Una persona revisa lo dudoso", texto: "Lo que no cuadra pasa a revisión con la imagen al lado." },
  { icono: <IconoDescarga className="h-5 w-5" />, titulo: "Descarga el Excel", texto: "Un Excel por lote, métricas y el IVA por bimestre." },
];

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
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
      setError(err instanceof Error && err.message.startsWith("Firebase") ? "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo." : (err as Error).message);
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
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── Presentación (en el celular se reduce a la marca y una frase) ── */}
      <section className="flex flex-col justify-between gap-8 bg-marca px-6 py-8 text-sobre-marca sm:px-10 lg:px-14 lg:py-14">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-sobre-marca/35"><IconoMarca className="h-6 w-6" /></span>
          <span className="text-lg font-semibold tracking-tight">Procesador de facturas</span>
        </div>
        <div className="flex flex-col gap-6">
          <h1 className="max-w-md text-2xl font-semibold leading-tight tracking-tight sm:text-[2.25rem]">
            Facturas electrónicas leídas, validadas y en Excel.
          </h1>
          <ul className="hidden max-w-md flex-col gap-5 lg:flex">
            {PASOS.map((p) => (
              <li key={p.titulo} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-sobre-marca/12">{p.icono}</span>
                <span>
                  <span className="block font-semibold">{p.titulo}</span>
                  <span className="block text-sm opacity-85">{p.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm opacity-75 lg:block">Proyecto de la clase Tendencias en desarrollo de software · automatización</p>
      </section>

      {/* ── Formulario ── */}
      <section className="relative flex items-center justify-center px-4 pb-10 pt-20 sm:px-8 lg:py-10">
        <div className="absolute right-4 top-4"><SelectorTema /></div>
        <div className="w-full max-w-sm">
          <div className="rounded-panel border border-linea bg-superficie p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-tinta-suave">Entra con el correo y la contraseña de tu cuenta.</p>

            <form onSubmit={entrar} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Correo
                <input
                  type="email" required autoComplete="email" inputMode="email" placeholder="nombre@empresa.com"
                  value={correo} onChange={(e) => setCorreo(e.target.value)} className="campo font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Contraseña
                <span className="relative">
                  <input
                    type={verClave ? "text" : "password"} required autoComplete="current-password"
                    value={clave} onChange={(e) => setClave(e.target.value)} className="campo pr-20 font-normal"
                  />
                  <button
                    type="button" onClick={() => setVerClave((v) => !v)} aria-pressed={verClave}
                    className="absolute inset-y-0 right-1 my-1 rounded-[4px] px-2 text-xs font-medium text-acento hover:bg-superficie-2"
                  >
                    {verClave ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>
              {error && <Aviso tono="error">{error}</Aviso>}
              <Boton type="submit" variante="principal" cargando={cargando === "normal"} textoCargando="Entrando…" disabled={cargando !== ""} className="w-full">
                Entrar
              </Boton>
            </form>

            {hayDemo && (
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-xs text-tinta-suave" aria-hidden>
                  <span className="h-px flex-1 bg-linea" /> o <span className="h-px flex-1 bg-linea" />
                </div>
                <Boton
                  onClick={() => void verDemo()} disabled={cargando !== ""} cargando={cargando === "demo"} textoCargando="Abriendo la demo…"
                  data-testid="ver-demo" className="w-full"
                >
                  Ver demo (solo lectura)
                </Boton>
                <p className="text-xs text-tinta-suave">Recorre la aplicación con datos ya procesados, sin poder cambiar nada.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
