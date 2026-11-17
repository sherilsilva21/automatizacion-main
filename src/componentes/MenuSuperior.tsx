"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Motor } from "./Motor";
import { useRol } from "./Rol";
import { botonSecundario } from "./ui";

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
    <header className="sticky top-0 z-10 border-b border-borde bg-superficie/95 backdrop-blur">
      {rol === "lectura" && (
        // Fase E4: franja fija de la demo (texto, no solo color) con salida directa.
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-manual bg-manual-suave px-4 py-1.5 text-sm" data-testid="franja-demo">
          <span>Estás viendo una <b>demo de solo lectura</b>: puedes recorrer todo, pero no subir, corregir ni borrar.</span>
          <button onClick={salir} className="font-medium underline">Salir</button>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold tracking-tight">Procesador de facturas</span>
        {/* flex-wrap: con 4 pestañas el menú no cabe en una línea en el celular (375 px). */}
        <nav className="flex flex-wrap gap-1" aria-label="Principal">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={e.activo(pathname) ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${e.activo(pathname) ? "bg-acento text-acento-texto" : "hover:bg-pista"}`}
            >
              {e.texto}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* El Motor procesa lotes (escribe): en la demo no arranca, y mientras no se sabe el rol, tampoco. */}
          {rol === "completo" && <Motor />}
          <span className="hidden text-sm text-texto2 sm:inline">{email ?? ""}</span>
          <button onClick={salir} className={botonSecundario}>Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}
