/*
 * Minimal stand-in for the dashboard runtime the page was written against.
 * It loads every dataset listed in data/manifest.json, runs the calculations registered by calcs.js
 * (dash.calc) in dependency order, and notifies the page (dash.onData). The page reads results with
 * dash.data(id) -> { status: 'ok' | 'loading' | 'error' | 'missing', data }.
 */
(function () {
  const calcs = {}, order = [], state = {}, listeners = [];
  let ready = false;
  window.dash = {
    calc(id, def) { calcs[id] = def; order.push(id); state[id] = { status: 'loading' }; },
    data(id) { return state[id] || { status: 'missing' }; },
    onData(cb) { listeners.push(cb); if (ready) cb(); },
    setLink(hash) { try { history.replaceState(null, '', '#' + hash); } catch (e) { /* file:// or sandboxed */ } },
    colors: ['#3a6fd8', '#d9822b', '#8b5cf6', '#14a37f', '#d14f8a', '#9a8a00', '#2aa3c7', '#b55d3a'],
  };
  const notify = () => listeners.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  async function boot() {
    let manifest;
    try { manifest = await fetch('data/manifest.json').then((r) => r.json()); }
    catch (e) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">Could not load data/manifest.json. Serve this folder over HTTP (python3 -m http.server -d site) rather than opening the file directly.</p>'); return; }
    await Promise.all(manifest.datasets.map(async (d) => {
      state[d.id] = { status: 'loading' };
      try {
        const r = await fetch('data/' + d.file);
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        state[d.id] = { status: 'ok', data: await r.json() };
      } catch (e) { state[d.id] = { status: 'error', error: String(e) }; }
    }));
    const pending = [...order];
    let guard = 0;
    while (pending.length && guard++ < 5000) {
      const id = pending.shift(), c = calcs[id];
      const ins = c.inputs.map((i) => state[i] || { status: 'missing' });
      if (ins.some((s) => s.status === 'loading')) { pending.push(id); continue; }
      if (ins.some((s) => s.status !== 'ok')) { state[id] = { status: 'error', error: 'input unavailable' }; continue; }
      try { state[id] = { status: 'ok', data: c.fn(...ins.map((s) => s.data)) }; }
      catch (e) { console.error('calc ' + id, e); state[id] = { status: 'error', error: String(e) }; }
    }
    ready = true;
    notify();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(notify, 200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
