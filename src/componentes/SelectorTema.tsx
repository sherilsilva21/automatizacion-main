"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema, leerTema, type Tema } from "./tema";

// El tema elegido vive en localStorage; useSyncExternalStore lo lee sin setState en un efecto (regla de React 19)
// y sin error de hidratación (en el servidor vale «sistema»). El evento propio avisa a otros selectores abiertos.
const EVENTO = "tema-cambiado";
function suscribir(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => { window.removeEventListener(EVENTO, aviso); window.removeEventListener("storage", aviso); };
}

const OPCIONES: { valor: Tema; texto: string; icono: React.ReactNode }[] = [
  { valor: "light", texto: "Claro", icono: <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M5 5l1 1M14 14l1 1M5 15l1-1M14 6l1-1M10 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" /> },
  { valor: "dark", texto: "Oscuro", icono: <path d="M15.8 12.3A6.5 6.5 0 0 1 7.7 4.2a6.5 6.5 0 1 0 8.1 8.1z" /> },
  { valor: "sistema", texto: "Sistema", icono: <path d="M3 4.5h14v9H3zM7.5 16.5h5M10 13.5v3" /> },
];

export function SelectorTema() {
  const tema = useSyncExternalStore(suscribir, leerTema, () => "sistema" as Tema);
  return (
    <div role="radiogroup" aria-label="Tema de color" className="inline-flex rounded-control border border-linea bg-superficie p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.valor} type="button" role="radio" aria-checked={tema === o.valor} title={o.texto} aria-label={o.texto}
          onClick={() => { aplicarTema(o.valor); window.dispatchEvent(new Event(EVENTO)); }}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-[4px] ${tema === o.valor ? "bg-acento-suave text-acento" : "text-tinta-suave hover:bg-superficie-2 hover:text-tinta"}`}
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{o.icono}</svg>
        </button>
      ))}
    </div>
  );
}
