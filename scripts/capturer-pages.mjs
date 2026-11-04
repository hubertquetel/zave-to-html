// Capture chaque page d'un numéro dans zc<numero>/, pour comparer-apercus.py.
// node capturer-pages.mjs http://localhost:8000 numero
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
const [base, n] = process.argv.slice(2);
if (!base || !n) { console.error('usage : node capturer-pages.mjs URL numero'); process.exit(2); }
mkdirSync(`zc${n}`, { recursive: true });
const b = await webkit.launch(); const p = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
await p.goto(`${base}/${n}/index.html`); await p.waitForTimeout(1500);
await p.addStyleTag({ content: '.nav,#son{display:none!important}' });
const pages = await p.evaluate(async () => (await (await fetch('data.json')).json()).articles.map(a => a.pages.length));
let k = 0;
for (let a = 0; a < pages.length; a++) for (let q = 0; q < pages[a]; q++) {
  k++; await p.evaluate(([a, q]) => __zave.aller(a, q), [a, q]); await p.waitForTimeout(1700);
  await p.screenshot({ path: `zc${n}/${String(k).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 85 });
}
console.log(n, k, 'pages capturées'); await b.close();
