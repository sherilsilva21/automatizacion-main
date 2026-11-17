"use client";

// Fase E4 · rol de la sesión para la INTERFAZ (ocultar lo que la demo no puede usar). La seguridad real está en el
// servidor (`exigirEscritura` responde 403); esto es solo comodidad para no mostrar botones que fallarían.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Rol } from "@/lib/auth/sesion";

interface DatosRol {
  /** null mientras se consulta: lo que escribe se oculta hasta saber el rol (así no parpadea un botón prohibido). */
  rol: Rol | null;
  email: string | null;
}

const ContextoRol = createContext<DatosRol>({ rol: null, email: null });

export function ProveedorRol({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<DatosRol>({ rol: null, email: null });
  useEffect(() => {
    let vivo = true;
    // Una sola consulta para el menú y todas las páginas (antes el menú pedía /api/sesion por su cuenta).
    fetch("/api/sesion", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email?: string; rol?: Rol } | null) => { if (vivo) setDatos({ rol: d?.rol ?? null, email: d?.email ?? null }); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  return <ContextoRol.Provider value={datos}>{children}</ContextoRol.Provider>;
}

export const useRol = () => useContext(ContextoRol);

/** Muestra `children` solo a un usuario con rol completo; a la demo le muestra `enDemo` (si se da). */
export function SoloEscritura({ children, enDemo = null }: { children: ReactNode; enDemo?: ReactNode }) {
  const { rol } = useRol();
  if (rol === "completo") return <>{children}</>;
  return rol === "lectura" ? <>{enDemo}</> : null;
}
