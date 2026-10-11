// Shared test helpers: load datasets from site/data and run every calculation in calcs.js, as the page runtime does.
import * as d3 from 'd3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = path.join(ROOT, 'site');
export function loadAll() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'manifest.json'), 'utf8'));
  const data = {};
  for (const d of manifest.datasets) data[d.id] = JSON.parse(fs.readFileSync(path.join(SITE, 'data', d.file), 'utf8'));
  const calcs = {}, order = [];
  const dash = { calc: (id, o) => { calcs[id] = o; order.push(id); } };
  new Function('dash', 'd3', fs.readFileSync(path.join(SITE, 'calcs.js'), 'utf8'))(dash, d3);
  const timings = {};
  const pending = [...order]; let guard = 0;
  while (pending.length && guard++ < 5000) {
    const id = pending.shift(), c = calcs[id];
    if (!c.inputs.every((i) => i in data)) { pending.push(id); continue; }
    const t = Date.now(); data[id] = c.fn(...c.inputs.map((i) => data[i])); timings[id] = Date.now() - t;
  }
  if (pending.length) throw new Error('Unresolved calculations: ' + pending.join(', '));
  return { manifest, data, calcs, order, timings };
}
