// Parcourt toutes les pages de chaque numéro sous WebKit : erreurs JavaScript et fichiers manquants.
// node verifier-parcours.mjs http://localhost:8000 numero1 numero2
import { webkit } from 'playwright';
const [base, ...numeros] = process.argv.slice(2);
if (!base || !numeros.length) { console.error('usage : node verifier-parcours.mjs URL numero [numero…]'); process.exit(2); }
const b = await webkit.launch(); const c = await b.newContext({ viewport: { width: 1024, height: 768 } });
let problemes = 0;
for (const n of numeros) {
  const p = await c.newPage(); const err = new Set(), manque = new Set();
  p.on('pageerror', e => err.add(e.message.slice(0, 90)));
  p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) manque.add(decodeURI(r.url()).slice(-60)); });
  await p.goto(`${base}/${n}/index.html`); await p.waitForTimeout(800);
  const pages = await p.evaluate(async () => (await (await fetch('data.json')).json()).articles.map(a => a.pages.length));
  let total = 0;
  for (let a = 0; a < pages.length; a++) for (let q = 0; q < pages[a]; q++) { total++; await p.evaluate(([a, q]) => __zave.aller(a, q), [a, q]); await p.waitForTimeout(250); }
  problemes += err.size + manque.size;
  console.log(n, total, 'pages | erreurs', [...err], '| manquants', [...manque]);
  await p.close();
}
await b.close(); process.exit(problemes ? 1 : 0);
