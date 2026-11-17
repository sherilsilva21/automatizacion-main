// Revisión de la INTERFAZ según docs/guia/diseno.md, con un navegador real (Playwright + axe-core). SOLO LEE: no sube,
// no guarda, no borra. Recorre login, procesar, métricas, detalle de un lote, revisión (lista y factura) y reportes en
// modo claro y oscuro, a 375 px y 1280 px; guarda capturas y FALLA si hay:
//   · desborde horizontal (la página se puede desplazar de lado),
//   · errores de consola o de página,
//   · violaciones de accesibilidad serias o críticas (axe, WCAG 2.1 A/AA).
// También comprueba el selector de tema (data-theme se guarda y sobrevive a una recarga).
//
// La sesión se abre sin la contraseña de nadie: el Admin SDK emite un token personalizado para el usuario dueño de
// los lotes (o el de USUARIO_UID=...), se cambia por un ID token y la app lo convierte en su cookie de sesión.
//   npx tsx scripts/revisar-ui.ts <urlBase> <carpetaCapturas>        [USUARIO_UID=... para elegir el usuario]
import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";

try { process.loadEnvFile(".env"); } catch { /* sin .env */ }

import { autenticacion, firestore } from "../src/lib/firebase/admin";

const ESQUEMAS = [["light", 375], ["light", 1280], ["dark", 375], ["dark", 1280]] as const;
let fallos = 0;
const chequear = (titulo: string, ok: boolean, detalle = "") => { console.log(`    ${ok ? "✓" : "✗"} ${titulo}${ok || !detalle ? "" : ` — ${detalle}`}`); if (!ok) fallos++; };

/** El usuario con más lotes (el de las pruebas), salvo que se indique UID. */
async function usuarioDeLasPruebas(): Promise<string> {
  if (process.env.USUARIO_UID) return process.env.USUARIO_UID;
  const cuenta = new Map<string, number>();
  for (const d of (await firestore().collection("procesos").select("uid").get()).docs) {
    const uid = d.get("uid") as string;
    cuenta.set(uid, (cuenta.get(uid) ?? 0) + 1);
  }
  const [uid] = [...cuenta].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!uid) throw new Error("No hay lotes: procesa alguno antes de revisar la interfaz");
  return uid;
}

async function cookieDeSesion(base: string, uid: string): Promise<string> {
  const token = await autenticacion().createCustomToken(uid);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, returnSecureToken: true }),
  });
  const { idToken } = (await r.json()) as { idToken?: string };
  if (!idToken) throw new Error("Firebase no devolvió un ID token");
  const s = await fetch(`${base}/api/sesion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
  if (!s.ok) throw new Error(`POST /api/sesion → ${s.status}`);
  return (s.headers.get("set-cookie") ?? "").split(";")[0].split("=").slice(1).join("=");
}

async function revisar(p: Page, nombre: string, capturas: string, errores: string[]): Promise<void> {
  await p.waitForTimeout(500); // fuentes y datos asentados
  const desborde = (await p.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")) as number;
  chequear(`${nombre}: sin desborde horizontal`, desborde <= 0, `${desborde} px de más`);
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  chequear(`${nombre}: accesibilidad sin violaciones serias/críticas`, graves.length === 0,
    graves.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`).join(" | "));
  chequear(`${nombre}: sin errores de consola`, errores.length === 0, errores.join(" | "));
  errores.length = 0;
  await p.screenshot({ path: `${capturas}/${nombre}.png`, fullPage: true });
}

async function main(): Promise<void> {
  const [base, capturas] = process.argv.slice(2);
  if (!base || !capturas) throw new Error("Uso: npx tsx scripts/revisar-ui.ts <urlBase> <carpetaCapturas>");
  mkdirSync(capturas, { recursive: true });
  const valor = await cookieDeSesion(base, await usuarioDeLasPruebas());

  const nav = await chromium.launch({ channel: process.env.CANAL ?? "chrome" });
  for (const [esquema, ancho] of ESQUEMAS) {
    const etiqueta = `${esquema}-${ancho}`;
    console.log(`\n### ${esquema} · ${ancho} px`);
    const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 }, colorScheme: esquema });
    const p = await ctx.newPage();
    const errores: string[] = [];
    p.on("pageerror", (e) => errores.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });

    // Login (sin sesión todavía)
    await p.goto(`${base}/login`);
    await p.waitForSelector("text=Iniciar sesión");
    await revisar(p, `login-${etiqueta}`, capturas, errores);

    await ctx.addCookies([{ name: "sesion", value: valor, url: base }]);
    await p.goto(`${base}/`);
    await p.waitForSelector("text=Elegir carpeta");
    await p.waitForSelector("text=Lotes anteriores");
    await revisar(p, `procesar-${etiqueta}`, capturas, errores);

    await p.goto(`${base}/metricas`);
    await p.waitForSelector("text=Calidad de la lectura");
    await revisar(p, `metricas-${etiqueta}`, capturas, errores);

    await p.locator('[data-testid="tabla-lotes"] >> text=Detalle').first().click();
    await p.waitForSelector("text=Facturas (", { timeout: 30000 });
    await revisar(p, `detalle-${etiqueta}`, capturas, errores);
    // Una factura cualquiera del lote para la pantalla de revisión (el formulario sirve también para las aceptadas).
    const aRevisar = p.locator('a[href^="/revision/"]');
    const hash = (await aRevisar.count()) > 0
      ? await aRevisar.first().getAttribute("href")
      : await p.locator('a[href^="/api/facturas/"]').first().getAttribute("href").then((h) => h && `/revision/${h.split("/")[3]}`);

    await p.goto(`${base}/revision`);
    await p.locator('[data-testid="tabla-revision"]').or(p.getByText("No hay facturas pendientes")).first().waitFor();
    await revisar(p, `revision-lista-${etiqueta}`, capturas, errores);

    if (hash) {
      await p.goto(`${base}${hash}`);
      await p.waitForSelector('[data-testid="f-numero"]');
      await p.waitForSelector('[data-testid="sello"]');
      await revisar(p, `revision-factura-${etiqueta}`, capturas, errores);
    }

    await p.goto(`${base}/reportes`);
    await p.waitForSelector('[data-testid="tabla-iva"], [data-testid="reporte-vacio"]');
    await revisar(p, `reportes-${etiqueta}`, capturas, errores);

    // Selector de tema: forzar el contrario al del sistema, recargar y comprobar que se mantiene; luego volver a «Sistema».
    const opuesto = esquema === "light" ? "Oscuro" : "Claro";
    await p.getByRole("radio", { name: opuesto }).click();
    await p.reload();
    await p.waitForSelector('[data-testid="tabla-iva"], [data-testid="reporte-vacio"]');
    const tema = await p.evaluate(() => document.documentElement.dataset.theme ?? "sistema");
    chequear(`tema «${opuesto}» se guarda y sobrevive a la recarga`, tema === (esquema === "light" ? "dark" : "light"), `data-theme=${tema}`);
    await p.getByRole("radio", { name: "Sistema" }).click();
    chequear("«Sistema» quita la preferencia", (await p.evaluate(() => document.documentElement.dataset.theme ?? "sistema")) === "sistema");
    await ctx.close();
  }
  await nav.close();
  console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLO(S)`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
