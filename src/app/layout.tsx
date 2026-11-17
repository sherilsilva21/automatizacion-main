import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Cascaron } from "@/componentes/Cascaron";
import { SCRIPT_TEMA } from "@/componentes/tema";
import "./globals.css";

// IBM Plex autoalojada (docs/guia/diseno.md): los archivos vienen del paquete @fontsource y next/font los sirve
// desde el propio dominio, sin pedir nada a Google Fonts. Solo el subconjunto latino (incluye tildes y la ñ).
const plexSans = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--fuente-plex-sans",
  display: "swap",
});
// Mono solo para identificadores reales (NIT, CUFE, número de factura, hash).
const plexMono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--fuente-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Procesador de facturas",
  description: "Sube una carpeta de facturas, extrae los datos con OCR y descarga un Excel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de tema pone `data-theme` en <html> antes de que React hidrate.
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado ANTES de pintar: sin esto, quien eligió «Oscuro» vería un destello claro. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <Cascaron>{children}</Cascaron>
        </Suspense>
      </body>
    </html>
  );
}
