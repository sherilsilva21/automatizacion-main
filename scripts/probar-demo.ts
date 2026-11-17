// Fase E4 · prueba del modo demo de solo lectura (por HTTP, contra un servidor local o la URL desplegada).
// 1) Recorre el código: TODA ruta de src/app/api que exporte POST/PUT/PATCH/DELETE debe estar en ESCRITURA (o en
//    SESION_PUBLICA). Así, agregar una ruta nueva sin decidir si la demo puede usarla hace fallar la prueba.
// 2) Entra como demo («Ver demo») y exige 403 en cada ruta de escritura y 200 en las de lectura; un lote inexistente da 404.
// Cada petición de escritura es INOFENSIVA aunque la protección fallara (sin cuerpo, datos inválidos, factura ya
// aceptada…): la prueba nunca borra datos ni gasta IA. No crea nada en la nube.
//   npx tsx scripts/probar-demo.ts <urlBase>
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

try { process.loadEnvFile(".env"); } catch { /* sin .env */ }

type Ruta = { metodo: string; plantilla: string; cuerpo?: unknown };

/** Rutas que escriben o gastan recursos: la demo debe recibir 403 en TODAS. */
const ESCRITURA: Ruta[] = [
  { metodo: "POST", plantilla: "/api/procesos", cuerpo: { carpeta: "intento-desde-la-demo" } },
  { metodo: "POST", plantilla: "/api/procesos/[id]/imagenes?indice=1&nombre=x.png" },
  { metodo: "POST", plantilla: "/api/procesos/[id]/iniciar" },
  { metodo: "POST", plantilla: "/api/procesos/[id]/lote" },
  { metodo: "POST", plantilla: "/api/procesos/[id]/finalizar" },
  { metodo: "POST", plantilla: "/api/procesos/[id]/regenerar-excel" },
  { metodo: "PUT", plantilla: "/api/facturas/[hash]", cuerpo: { datos: {}, confirmado: false } },
  { metodo: "POST", plantilla: "/api/facturas/[aceptada]/sugerir" }, // factura ya aceptada: ni siquiera sin protección llamaría a la IA
  { metodo: "POST", plantilla: "/api/datos/borrar", cuerpo: {} }, // sin el texto «BORRAR»: no borraría aunque fallara la protección
];
/** Métodos de escritura que son públicos a propósito (iniciar y cerrar sesión, pedir el token de la demo). */
const SESION_PUBLICA = ["POST /api/sesion", "DELETE /api/sesion", "POST /api/sesion/demo"];
/** Rutas de lectura: la demo debe poder usarlas (200). */
const LECTURA: Ruta[] = [
  { metodo: "GET", plantilla: "/api/sesion" },
  { metodo: "GET", plantilla: "/api/metricas" },
  { metodo: "GET", plantilla: "/api/procesos" },
  { metodo: "GET", plantilla: "/api/procesos/[id]" },
  { metodo: "GET", plantilla: "/api/procesos/[id]/facturas" },
  { metodo: "GET", plantilla: "/api/procesos/[id]/excel" },
  { metodo: "GET", plantilla: "/api/facturas" },
  { metodo: "GET", plantilla: "/api/facturas/[hash]" },
  { metodo: "GET", plantilla: "/api/facturas/[hash]/imagen" },
  { metodo: "GET", plantilla: "/api/reportes/iva?anio=2026" },
];

let fallos = 0;
const chequear = (titulo: string, ok: boolean, detalle = "") => { console.log(`  ${ok ? "✓" : "✗"} ${titulo}${ok || !detalle ? "" : ` — ${detalle}`}`); if (!ok) fallos++; };

/** Métodos de escritura exportados en src/app/api, como «POST /api/procesos/[id]/lote». */
function escriturasEnElCodigo(dir = "src/app/api"): string[] {
  const r: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) r.push(...escriturasEnElCodigo(ruta));
    else if (nombre === "route.ts") {
      const url = "/" + path.relative("src/app", path.dirname(ruta)).split(path.sep).join("/");
      for (const m of readFileSync(ruta, "utf8").matchAll(/export async function (POST|PUT|PATCH|DELETE)\b/g)) r.push(`${m[1]} ${url}`);
    }
  }
  return r.sort();
}

async function main(): Promise<void> {
  const base = process.argv[2];
  if (!base) throw new Error("Uso: probar-demo.ts <urlBase>");

  console.log("1. Toda ruta de escritura del código está en la lista de la prueba");
  const declaradas = new Set([...ESCRITURA.map((x) => `${x.metodo} ${x.plantilla.split("?")[0].replace("[aceptada]", "[hash]")}`), ...SESION_PUBLICA]);
  const enCodigo = escriturasEnElCodigo();
  const sinDecidir = enCodigo.filter((x) => !declaradas.has(x));
  chequear(`${enCodigo.length} métodos de escritura en src/app/api; todos clasificados`, sinDecidir.length === 0, `sin clasificar: ${sinDecidir.join(", ")}`);

  console.log("\n2. Entrar como demo (sin contraseña: token personalizado del servidor)");
  const t = await fetch(`${base}/api/sesion/demo`, { method: "POST" });
  const { token } = (await t.json()) as { token?: string };
  chequear(`POST /api/sesion/demo → ${t.status} con token`, t.ok && Boolean(token));
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, returnSecureToken: true }) });
  const { idToken } = (await r.json()) as { idToken: string };
  const s = await fetch(`${base}/api/sesion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  const setCookie = s.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  const maxAge = Number(/Max-Age=(\d+)/i.exec(setCookie)?.[1] ?? 0);
  chequear(`POST /api/sesion (demo) → ${s.status}; sesión de ${Math.round(maxAge / 3600)} h (se esperan 2)`, s.ok && maxAge === 7200);
  const yo = (await (await fetch(`${base}/api/sesion`, { headers: { cookie } })).json()) as { rol?: string };
  chequear(`GET /api/sesion → rol «${yo.rol}»`, yo.rol === "lectura");

  // Identificadores reales de los datos que muestra la demo (solo lectura).
  const j = async (u: string) => (await fetch(`${base}${u}`, { headers: { cookie } })).json();
  const lotes = ((await j("/api/metricas")) as { lotes: { id: string; tieneExcel: boolean }[] }).lotes;
  const lote = lotes.find((l) => l.tieneExcel) ?? lotes[0];
  if (!lote) throw new Error("La demo no ve ningún lote: revisa DEMO_UID_DATOS");
  const facturas = ((await j(`/api/procesos/${lote.id}/facturas`)) as { facturas: { hash: string; estado: string }[] }).facturas;
  const hash = facturas[0]?.hash;
  const aceptada = facturas.find((f) => f.estado === "aceptada")?.hash ?? hash;
  const url = (p: string) => p.replace("[id]", lote.id).replace("[hash]", hash).replace("[aceptada]", aceptada);

  console.log(`\n3. Escritura: todas deben responder 403 (lote ${lote.id})`);
  for (const x of ESCRITURA) {
    const res = await fetch(`${base}${url(x.plantilla)}`, {
      method: x.metodo, headers: { cookie, ...(x.cuerpo ? { "content-type": "application/json" } : {}) }, body: x.cuerpo ? JSON.stringify(x.cuerpo) : undefined,
    });
    const cuerpo = (await res.json().catch(() => ({}))) as { error?: string };
    chequear(`${x.metodo.padEnd(4)} ${x.plantilla.padEnd(52)} → ${res.status}`, res.status === 403 && /solo lectura/.test(cuerpo.error ?? ""), cuerpo.error ?? "");
  }

  console.log("\n4. Lectura: todas deben responder 200");
  for (const x of LECTURA) {
    const res = await fetch(`${base}${url(x.plantilla)}`, { headers: { cookie } });
    await res.arrayBuffer();
    chequear(`${x.metodo.padEnd(4)} ${x.plantilla.padEnd(52)} → ${res.status}`, res.status === 200);
  }
  const ajeno = await fetch(`${base}/api/procesos/LoteQueNoEsDeLaDemo123`, { headers: { cookie } });
  chequear(`un lote que no es de DEMO_UID_DATOS → ${ajeno.status}`, ajeno.status === 404);
  const iaVisible = ((await j(`/api/facturas/${hash}`)) as { iaDisponible?: boolean }).iaDisponible;
  chequear("el formulario no ofrece «Sugerir con IA» a la demo (iaDisponible = false)", iaVisible === false);

  await fetch(`${base}/api/sesion`, { method: "DELETE", headers: { cookie } });
  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} comprobación(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
