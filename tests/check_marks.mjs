// Every value placeholder in the page (data-source + data-field [+ data-where]) must resolve to a real value,
// and every table's columns must exist in its data.
import fs from 'fs';
import path from 'path';
import { loadAll, SITE } from './lib.mjs';
const { data } = loadAll();
const html = fs.readFileSync(path.join(SITE, 'dashboard.html'), 'utf8');
const dec = (s) => s.replace(/&amp;/g, '&');
let n = 0, bad = 0; const unknown = new Set();
const re = /<([a-z0-9]+)([^>]*?)data-source="([^"]+)"([^>]*)>/g; let m;
while ((m = re.exec(html))) {
  const attrs = m[2] + ' ' + m[4], src = m[3];
  src.split(' ').forEach((s) => { if (!(s in data)) unknown.add(s); });
  const f = /data-field="([^"]+)"/.exec(attrs); if (!f || m[1] === 'th') continue;
  const w = /data-where="([^"]+)"/.exec(attrs); n++;
  let rows = data[src]; rows = Array.isArray(rows) ? rows : [rows];
  const where = w ? dec(w[1]) : null;
  const row = where ? rows.find((r) => where.split('&').every((p) => { const i = p.indexOf('='); return String(r[decodeURIComponent(p.slice(0, i))]) === decodeURIComponent(p.slice(i + 1)); })) : rows[0];
  if (!row || row[f[1]] === undefined || row[f[1]] === null) { bad++; console.log('NO VALUE', src, f[1], where); }
}
const tre = /<table[^>]*data-source="([^"]+)"[^>]*data-row-key="([^"]+)"[^>]*>([\s\S]*?)<\/table>/g; let t;
while ((t = tre.exec(html))) {
  const rows = data[t[1]]; if (!rows) { bad++; console.log('no data', t[1]); continue; }
  const cols = new Set(rows.flatMap((r) => Object.keys(r)));
  if (!cols.has(t[2])) { bad++; console.log('row key missing', t[1], t[2]); }
  for (const f of t[3].matchAll(/data-field="([^"]+)"/g)) if (!cols.has(dec(f[1]))) { bad++; console.log('column missing', t[1], f[1]); }
}
if (unknown.size) { bad += unknown.size; console.log('unknown sources', [...unknown]); }
console.log(`${n} value placeholders checked, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
