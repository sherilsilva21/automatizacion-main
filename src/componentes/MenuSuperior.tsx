"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Motor } from "./Motor";
import { useRol } from "./Rol";
import { SelectorTema } from "./SelectorTema";
import { IconoMarca, IconoInfo, claseBoton } from "./ui";

const ENLACES = [
  { href: "/", texto: "Procesar facturas", activo: (p: string) => p === "/" || p.startsWith("/procesos") },
  { href: "/revision", texto: "Revisión", activo: (p: string) => p.startsWith("/revision") },
  { href: "/metricas", texto: "Métricas", activo: (p: string) => p.startsWith("/metricas") },
  { href: "/reportes", texto: "Reportes", activo: (p: string) => p.startsWith("/reportes") }, // Fase E2
];

export function MenuSuperior() {
  const router = useRouter();
  const pathname = usePathname();
  const { email, rol } = useRol(); // Fase E4: una sola consulta de la sesión para toda la interfaz

  async function salir() {
    await fetch("/api/sesion", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-linea bg-superficie/95 backdrop-blur">
      {rol === "lectura" && (
        // Fase E4: franja fija de la demo (texto + icono, no solo color) con salida directa.
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-manual/40 bg-manual-suave px-4 py-1.5 text-sm" data-testid="franja-demo">
          <span className="inline-flex items-center gap-2"><IconoInfo className="text-manual" /> <span>Estás viendo una <b>demo de solo lectura</b>: puedes recorrer todo, pero no subir, corregir ni borrar.</span></span>
          <button onClick={salir} className="min-h-8 font-medium text-acento underline underline-offset-2">Salir</button>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-[75rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight" aria-label="Procesador de facturas · inicio">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-acento text-sobre-acento"><IconoMarca className="h-5 w-5" /></span>
          <span>Procesador de facturas</span>
        </Link>
        {/* flex-wrap: con 4 pestañas el menú no cabe en una línea en el celular (375 px). */}
        <nav className="order-last flex w-full flex-wrap gap-1 md:order-none md:w-auto" aria-label="Principal">
          {ENLACES.map((e) => {
            const activo = e.activo(pathname);
            return (
              <Link
                key={e.href} href={e.href} aria-current={activo ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-control px-3 text-sm font-medium transition-colors ${
                  activo ? "bg-acento-suave text-acento" : "text-tinta-suave hover:bg-superficie-2 hover:text-tinta"
                }`}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* El Motor procesa lotes (escribe): en la demo no arranca, y mientras no se sabe el rol, tampoco. */}
          {rol === "completo" && <Motor />}
          <span className="hidden max-w-48 truncate text-sm text-tinta-suave lg:inline" title={email ?? undefined}>{email ?? ""}</span>
          <SelectorTema />
          <button onClick={salir} className={claseBoton("fantasma", "px-3")}>Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}
