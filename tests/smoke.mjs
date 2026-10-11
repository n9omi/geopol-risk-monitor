// Loads site/index.html in a simulated browser (jsdom) with the real runtime.js, calcs.js and app.js,
// then clicks through every tab, desk, simulator preset and slider. Fails on any script error,
// on any placeholder still showing "—" outside tables, or on any element left loading.
import { JSDOM } from 'jsdom';
import * as d3 from 'd3';
import fs from 'fs';
import path from 'path';
import { SITE } from './lib.mjs';
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom, { document } = window;
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get() { return 34; } });
Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { get() { return 200; } });
window.SVGElement.prototype.getComputedTextLength = function () { return (this.textContent || '').length * 6; };
window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.document = document; globalThis.window = window; globalThis.Node = window.Node;
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
const fetchFile = async (url) => { const p = path.join(SITE, url); if (!fs.existsSync(p)) return { ok: false, status: 404, statusText: 'missing' }; const txt = fs.readFileSync(p, 'utf8'); return { ok: true, json: async () => JSON.parse(txt) }; };
const run = (file, extra = {}) => {
  const names = ['window', 'document', 'd3', 'fetch', 'history', 'location', 'Node', 'console', ...Object.keys(extra)];
  const vals = [window, document, d3, fetchFile, window.history, window.location, window.Node, console, ...Object.values(extra)];
  new Function(...names, fs.readFileSync(path.join(SITE, file), 'utf8'))(...vals);
};
run('runtime.js');
run('calcs.js', { dash: window.dash });
run('app.js', { dash: window.dash });
for (let i = 0; i < 200 && window.dash.data('combo_summary').status !== 'ok'; i++) await new Promise((r) => setTimeout(r, 25));
await new Promise((r) => setTimeout(r, 50));
const q = (s) => document.querySelector(s);
const click = (el, label) => { try { if (!el) throw new Error('missing element'); el.dispatchEvent(new window.Event('click')); } catch (e) { errors.push(label + ': ' + e.message); } };
const tabs = [...document.querySelectorAll('.gr-tab')].map((t) => t.dataset.tab);
for (const t of tabs) click(q(`.gr-tab[data-tab="${t}"]`), 'tab ' + t);
click(q('.gr-tab[data-tab="desks"]'), 'desks');
for (const b of document.querySelectorAll('#desk-nav button')) click(b, 'desk ' + b.dataset.desk);
click(q('.gr-tab[data-tab="shocks"]'), 'shocks');
for (const b of document.querySelectorAll('#sim-presets button')) click(b, 'preset ' + b.dataset.k);
for (const id of ['sim-int', 'sim-y2', 'sim-oil', 'sim-spx']) { const i = q('#' + id); i.value = i.max; i.dispatchEvent(new window.Event('input')); }
for (const b of document.querySelectorAll('#tr-seg button')) click(b, 'shock ' + b.dataset.k);
for (const b of document.querySelectorAll('#combo-table button')) click(b, 'simulate');
const dashes = [...document.querySelectorAll('[data-source][data-field]')].filter((m) => !m.closest('table') && m.textContent.trim() === '—');
const loading = [...document.querySelectorAll('.dash-skeleton')].map((e) => e.id || e.className);
console.log(`tabs visited: ${tabs.join(', ')}`);
console.log(`script errors: ${errors.length}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
console.log(`placeholders still empty: ${dashes.length}; elements still loading: ${loading.length}${loading.length ? ' (' + loading.join(', ') + ')' : ''}`);
console.log('headline:', q('#takeaway').textContent.replace(/\s+/g, ' ').trim().slice(0, 160) + '…');
process.exit(errors.length || dashes.length || loading.length ? 1 : 0);
