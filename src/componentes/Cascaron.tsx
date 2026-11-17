"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MenuSuperior } from "./MenuSuperior";
import { ProveedorRol } from "./Rol";

/** Menú superior y motor de procesamiento en todas las páginas con sesión (no en /login). */
export function Cascaron({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return <>{children}</>;
  // ProveedorRol (Fase E4): el menú y las páginas saben si la sesión es de demo (solo lectura).
  return (
    <ProveedorRol>
      <MenuSuperior />
      {children}
    </ProveedorRol>
  );
}
