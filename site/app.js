(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const parse = d3.utcParse('%Y-%m-%d');
  const fDate = d3.utcFormat('%b %-d, %Y');
  const fShort = d3.utcFormat('%b %-d');
  const fMonth = d3.utcFormat('%b');
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const sign = (v, s) => (v > 0 ? '+' : v < 0 ? '−' : '') + s;
  const abs = Math.abs;
  const FMT = {
    usd2: (v) => '$' + d3.format(',.2f')(v),
    usd3: (v) => '$' + d3.format(',.3f')(v),
    susd2: (v) => sign(v, '$' + d3.format(',.2f')(abs(v))),
    num4: (v) => d3.format(',.4f')(v),
    num3: (v) => d3.format(',.3f')(v),
    num2: (v) => d3.format(',.2f')(v),
    num1: (v) => d3.format(',.1f')(v),
    pct2: (v) => d3.format('.2f')(v) + '%',
    pct1: (v) => d3.format('.1f')(v) + '%',
    pctint: (v) => d3.format('d')(Math.round(v)) + '%',
    spct1: (v) => sign(v, d3.format('.1f')(abs(v)) + '%'),
    spct2: (v) => sign(v, d3.format('.2f')(abs(v)) + '%'),
    sbp: (v) => sign(v, d3.format('d')(abs(Math.round(v))) + ' bp'),
    sbp1: (v) => sign(v, d3.format('.1f')(abs(v)) + ' bp'),
    bpv: (v) => d3.format(',d')(Math.round(v * 100)) + ' bp',
    sint: (v) => sign(v, d3.format('d')(abs(v))),
    sz: (v) => sign(v, d3.format('.2f')(abs(v))),
    s2: (v) => sign(v, d3.format('.2f')(abs(v))),
    spts: (v) => sign(v, d3.format('.2f')(abs(v)) + ' pts'),
    int: (v) => d3.format(',')(Math.round(v)),
    ord: (v) => ord(Math.round(v)) + ' percentile',
    bn: (v) => '$' + d3.format(',.1f')(v).replace(/\.0$/, '') + 'bn',
    frac: (v) => d3.format('.0%')(v),
    tn2: (v) => '$' + d3.format('.2f')(v) + 'tn',
    bn0: (v) => '$' + d3.format(',d')(Math.round(v)) + 'bn',
    bn1: (v) => '$' + d3.format(',.1f')(v) + 'bn',
    sbn: (v) => sign(v, '$' + d3.format(',d')(abs(Math.round(v))) + 'bn'),
    sbn1: (v) => sign(v, '$' + d3.format(',.1f')(abs(v)) + 'bn'),
    days: (v) => d3.format('d')(v) + ' days',
    date: (v) => fDate(parse(String(v).slice(0, 10))),
    dshort: (v) => fShort(parse(String(v).slice(0, 10))),
    text: (v) => String(v),
  };
  const rowsOf = (id) => { const d = dash.data(id); return d.status === 'ok' ? (Array.isArray(d.data) ? d.data : [d.data]) : null; };
  const failed = (...ids) => ids.some((id) => ['error', 'missing'].includes(dash.data(id).status));
  const matchWhere = (row, where) => where.split('&').every((p) => { const i = p.indexOf('='); const k = decodeURIComponent(p.slice(0, i)), v = decodeURIComponent(p.slice(i + 1)); return String(row[k]) === v; });
  const showFail = (el) => { el.classList.remove('dash-skeleton'); const tip = el.querySelector('.gr-tip'); el.replaceChildren(...(tip ? [tip] : [])); const f = document.createElement('div'); f.className = 'gr-fail'; f.textContent = 'Failed to load'; el.appendChild(f); };
  const clearChart = (el) => { const tip = el.querySelector('.gr-tip'); el.replaceChildren(...(tip ? [tip] : [])); };
  const pillClass = (s) => {
    s = String(s || '');
    if (/Escalating|Cloture failed|Under-priced|Stressed|Needs vendor|^Stress$/.test(s)) return 'bad';
    if (/Active|In force|Enacted|Adopted|Decided|Passed|Processing|Cook remains|Watch|Elevated|Mixed|proxy|Tightening/.test(s)) return 'warn';
    if (/Rich|^Live$|^Ample$|^Normal$|Easing bias/.test(s)) return 'ok';
    return '';
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const link = (row) => { const a = document.createElement('a'); a.href = row.source_url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = row.source_title; return a; };
  const svgFor = (box, H) => {
    clearChart(box);
    const svg = d3.create('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${box.clientWidth} ${H}`).style('font-family', 'var(--font-anthropic-sans)');
    box.appendChild(svg.node());
    return svg;
  };
  const textW = (svg, strs) => { const t = svg.append('text').style('font-size', 'var(--cds-font-size-caption)'); let w = 0; strs.forEach((s) => { t.text(s); w = Math.max(w, t.node().getComputedTextLength()); }); t.remove(); return Math.ceil(w); };
  const tipAt = (tip, box, x, y, lines) => {
    tip.replaceChildren(...lines.map((l, i) => el('div', i === 0 ? 't-date' : null, l)));
    tip.style.opacity = 1;
    const tw = tip.offsetWidth, W = box.clientWidth;
    let left = x + 12; if (left + tw > W) left = x - tw - 12;
    tip.style.left = Math.max(0, left) + 'px'; tip.style.top = Math.max(0, y) + 'px';
  };
  const color = (i) => dash.colors[i % dash.colors.length];

  /* series metadata (kind, unit) for formatting moves */
  let META = new Map();
  function refreshMeta() { const Lt = rowsOf('latest'); if (Lt) META = new Map(Lt.map((r) => [r.series, r])); }
  const moveOf = (series, v, kind, unit) => {
    if (v == null || !isFinite(v)) return '—';
    const m = META.get(series) || {};
    const k = kind || m.kind || (series === 'UST 10Y' || series === 'HY OAS' ? 'rate' : 'price');
    const u = unit || m.unit || '';
    if (k === 'rate') return FMT.sbp1(v);
    if (k === 'level') return u === '$/bbl' ? FMT.susd2(v) : sign(v, d3.format('.3f')(abs(v)));
    return FMT.spct1(v);
  };

  /* universe by series (cached per data object) */
  let uniRef = null, UNI = new Map();
  function uni() {
    const d = dash.data('universe');
    if (d.status !== 'ok') return null;
    if (d.data !== uniRef) { uniRef = d.data; UNI = d3.group(d.data, (r) => r.series); }
    return UNI;
  }

  /* ---- text marks ---- */
  function fillMarks() {
    $$('#dash-root [data-source][data-field]').forEach((m) => {
      if (m.closest('table')) return;
      const d = dash.data(m.dataset.source);
      if (d.status !== 'ok') { if (['error', 'missing'].includes(d.status)) { m.classList.remove('dash-skeleton'); m.textContent = '—'; } return; }
      const rows = Array.isArray(d.data) ? d.data : [d.data];
      const row = m.dataset.where ? rows.find((r) => matchWhere(r, m.dataset.where)) : rows[0];
      const v = row ? row[m.dataset.field] : null;
      m.classList.remove('dash-skeleton', 'tone-bad', 'tone-warn', 'tone-ok');
      if (v === null || v === undefined || v === '') { m.textContent = '—'; return; }
      m.textContent = (FMT[m.dataset.fmt] || FMT.text)(v);
      const tone = m.dataset.tone;
      if (tone === 'up-bad') { if (+v > 0) m.classList.add('tone-warn'); else if (+v < 0) m.classList.add('tone-ok'); }
      if (tone === 'up-good') { if (+v > 0) m.classList.add('tone-ok'); else if (+v < 0) m.classList.add('tone-warn'); }
      if (m.classList.contains('gr-pill')) { m.classList.remove('bad', 'warn', 'ok'); const c = pillClass(v); if (c) m.classList.add(c); }
    });
    const ind = rowsOf('indicators');
    if (ind && $('#m-transits')) {
      const t = ind.find((r) => r.id === 'hormuz_transits'), s = ind.find((r) => r.id === 'eu_storage');
      $('#m-transits').style.width = Math.min(100, (t.value / t.baseline) * 100) + '%';
      $('#m-storage').style.width = Math.min(100, s.value) + '%';
    }
    const S = rowsOf('signals'), T = rowsOf('trade_ideas');
    if (S && T) {
      const top = T.length ? T[0].asset_class : null;
      const names = (sig) => S.filter((r) => r.signal === sig && r.asset_class !== top).sort((a, b) => abs(b.gap) - abs(a.gap)).map((r) => r.asset_class);
      const parts = [];
      const u = names('Under-priced'), w = names('Watch'), r = names('Rich');
      if (u.length) parts.push('also under-priced — ' + u.join(', '));
      if (w.length) parts.push('exposed but unconfirmed — ' + w.join(', '));
      if (r.length) parts.push('rich vs geopolitical exposure — ' + r.join(', '));
      $('#take-signals').textContent = parts.length ? parts.join('; ') : 'none at current thresholds';
    }
    const Lt = rowsOf('latest'); const ns = $('#n-series');
    if (Lt && ns) { ns.classList.remove('dash-skeleton'); ns.textContent = String(Lt.length); }
  }

  /* ---- sparklines ---- */
  function drawSparks(scope) {
    const U = uni();
    $$('[data-spark]', scope).forEach((box) => {
      if (failed('markets', 'desk')) return showFail(box);
      if (!U) return;
      const s = (U.get(box.dataset.spark) || []).map((r) => ({ d: parse(r.date), v: +r.value })).sort((a, b) => a.d - b.d);
      const w = box.clientWidth, h = box.clientHeight || 34;
      if (!w || !s.length) return;
      const x = d3.scaleUtc(d3.extent(s, (p) => p.d), [1, w - 3]);
      const y = d3.scaleLinear(d3.extent(s, (p) => p.v), [h - 3, 3]);
      const pre = s.filter((p) => p.d <= parse('2026-02-27')).pop();
      const svg = d3.create('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`).attr('preserveAspectRatio', 'none');
      if (pre) svg.append('line').attr('x1', x(pre.d)).attr('x2', x(pre.d)).attr('y1', 0).attr('y2', h).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '2 2');
      svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p.v))(s)).style('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 1.5).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      const last = s[s.length - 1];
      svg.append('circle').attr('cx', x(last.d)).attr('cy', y(last.v)).attr('r', 2.5).style('fill', dash.colors[0]);
      box.replaceChildren(svg.node());
    });
  }

  /* ---- shared table helpers ---- */
  function cell(tr, content, cls) { const td = el('td', cls); if (content instanceof Node) td.appendChild(content); else td.textContent = content; tr.appendChild(td); return td; }
  const pill = (text, cls) => el('span', 'gr-pill ' + (cls ?? pillClass(text)), text);
  const dOrDash = (v) => (v ? fShort(parse(String(v).slice(0, 10))) + (String(v).slice(0, 4) !== '2026' ? ' ' + String(v).slice(0, 4) : '') : '—');
  const riskCell = (v) => { const rk = el('span', 'gr-risk'); if (v != null) { const bar = el('i', +v < 3 ? 'lo' : null); bar.style.width = (+v * 8) + 'px'; rk.append(bar, el('span', null, String(v))); } else rk.textContent = '—'; return rk; };
  const segButtons = (seg, keys, labelOf, onPick) => { if (seg.childElementCount) return; keys.forEach((k) => { const b = el('button', null, labelOf ? labelOf(k) : k); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => onPick(k)); seg.appendChild(b); }); };
  const pressSeg = (seg, cur) => $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === cur));
  const evidence = (r) => (r.risk_hit == null ? '—' : `${r.risk_hit}% of ${r.evidence_n}`);

  /* ================= BRIEF ================= */
  function drawIdeas() {
    const T = rowsOf('trade_ideas'); if (!T) return;
    $('#ideas-table tbody').replaceChildren(...T.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.asset_class;
      cell(tr, String(r.rank), 'rank'); cell(tr, r.asset_class, 'strong'); cell(tr, pill(r.signal)); cell(tr, r.conviction, 'nowrap gr-hide-narrow');
      const g = cell(tr, FMT.sint(r.gap), 'num r'); g.classList.add(r.gap >= 25 ? 'tone-bad' : 'tone-ok');
      cell(tr, evidence(r), 'num r gr-hide-narrow'); cell(tr, moveOf(r.series, r.expected_5d), 'num r gr-hide-narrow');
      cell(tr, r.expression, 'wide'); cell(tr, r.vehicle, 'gr-hide-narrow'); cell(tr, r.pm_tilt, 'wide gr-hide-narrow');
      return tr;
    }));
  }
  function drawMovers() {
    const M = rowsOf('movers'); if (!M) return;
    $('#movers-table tbody').replaceChildren(...M.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.series;
      cell(tr, r.series, 'strong'); cell(tr, r.desk, 'nowrap gr-hide-narrow'); cell(tr, moveOf(r.series, r.chg_5d, r.kind, r.unit), 'num r');
      const z = cell(tr, FMT.sz(r.z_5d) + 'σ', 'num r'); if (abs(r.z_5d) >= 2) z.classList.add('tone-warn');
      return tr;
    }));
  }
  function drawUpcoming() {
    const U = rowsOf('upcoming'); if (!U) return;
    $('#upcoming-table tbody').replaceChildren(...U.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.key;
      cell(tr, FMT.dshort(r.date), 'num'); cell(tr, r.days + 'd', 'num r'); cell(tr, r.event, 'strong'); cell(tr, r.assets, 'gr-hide-narrow');
      return tr;
    }));
  }
  function drawDeskCards() {
    const box = $('#desk-cards'); if (failed('markets', 'desk')) return showFail(box);
    const D = rowsOf('desk_view'); if (!D) return;
    box.replaceChildren(...D.map((r) => {
      const c = el('div', 'gr-card gr-deskcard');
      const h = el('div', 'dh'); h.append(el('span', 'dn', r.desk), pill(r.top_signal === 'None' ? 'No signal' : r.top_signal));
      const b = el('button', 'gr-link', `Open ${r.desk} desk →`); b.type = 'button';
      b.addEventListener('click', () => { pickDesk(slugOf(r.desk)); show('desks', true); document.getElementById('top').scrollIntoView(); });
      c.append(h, el('p', 'dr', r.top_flag), el('p', 'dr', r.read), b);
      return c;
    }));
  }
  const STATUS = [['Live', 'var(--color-ok)'], ['Live (proxy)', 'var(--color-warn)'], ['In progress', 'var(--cds-chart-muted)'], ['Needs vendor data', 'var(--color-bad)']];
  function drawHeadway() {
    const R = rowsOf('roadmap'); if (!R) return;
    const bar = $('#headway-bar'), keys = $('#headway-keys');
    bar.replaceChildren(...STATUS.map(([s, c]) => { const n = R.filter((r) => r.status === s).length; const sp = el('span'); sp.style.width = (n / R.length) * 100 + '%'; sp.style.background = c; sp.title = `${s}: ${n}`; return sp; }));
    keys.replaceChildren(...STATUS.map(([s, c]) => { const k = el('span'); const i = el('i'); i.style.background = c; k.append(i, document.createTextNode(`${s} ${R.filter((r) => r.status === s).length}`)); return k; }));
    $('#headway-next').replaceChildren(...R.filter((r) => r.status === 'In progress' || r.status === 'Needs vendor data').map((r) => el('li', null, `${r.deliverable} — ${r.status.toLowerCase()}: ${r.next_step}`)));
  }
  function drawRegionTable() {
    const R = rowsOf('region_summary'); if (!R) return;
    $('#region-table tbody').replaceChildren(...R.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.region;
      cell(tr, r.region, 'strong'); cell(tr, String(r.live), 'num r'); cell(tr, String(r.escalating), 'num r'); cell(tr, riskCell(r.max_risk), 'num r'); cell(tr, r.top, 'wide');
      return tr;
    }));
  }

  /* ================= SIGNALS ================= */
  function drawGapChart() {
    const box = $('#gap-chart'), tip = $('#gap-tip');
    if (failed('markets')) return showFail(box);
    const S = rowsOf('stress'); if (!S || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, H = 260;
    const pts = S.map((r) => ({ d: parse(r.date), shock: +r.shock, vix: +r.vix, gap: +r.gap }));
    const svg = svgFor(box, H);
    const y = d3.scaleLinear([0, 100], [H - 24, 14]);
    const ml = textW(svg, ['100']) + 10, mr = textW(svg, ['Shock channels']) + 14;
    const x = d3.scaleUtc(d3.extent(pts, (p) => p.d), [ml, W - mr]);
    [0, 25, 50, 75, 100].forEach((t) => {
      svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', ml - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(t);
    });
    svg.selectAll('text.x').data(x.ticks(W < 520 ? 4 : 8)).join('text').attr('x', x).attr('y', H - 6).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((t) => (t.getUTCMonth() === 0 ? d3.utcFormat('%b %Y')(t) : fMonth(t)));
    svg.append('path').attr('d', d3.area((p) => x(p.d), (p) => y(p.vix), (p) => y(p.shock))(pts)).style('fill', 'var(--cds-chart-status-critical)').attr('opacity', 0.12);
    const line = (k, c, w) => svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p[k]))(pts)).style('fill', 'none').style('stroke', c).attr('stroke-width', w).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    line('shock', dash.colors[0], 2); line('vix', dash.colors[1], 2);
    const last = pts[pts.length - 1];
    let ys = y(last.shock), yv = y(last.vix); if (abs(ys - yv) < 14) { if (ys < yv) { ys -= 7; yv += 7; } else { ys += 7; yv -= 7; } }
    svg.append('text').attr('x', W - mr + 6).attr('y', ys).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', dash.colors[0]).text('Shock channels');
    svg.append('text').attr('x', W - mr + 6).attr('y', yv).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', dash.colors[1]).text('VIX');
    const rule = svg.append('line').attr('y1', 14).attr('y2', H - 24).style('stroke', 'var(--cds-chart-axis)').attr('opacity', 0);
    const bis = d3.bisector((p) => p.d).center;
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (event) => { const [mx] = d3.pointer(event); const p = pts[bis(pts, x.invert(mx))]; rule.attr('x1', x(p.d)).attr('x2', x(p.d)).attr('opacity', .6); tipAt(tip, box, x(p.d), 16, [fDate(p.d), `Shock channels: ${p.shock}`, `VIX percentile: ${p.vix}`, `Gap: ${FMT.sint(p.gap)}`]); })
      .on('pointerleave', () => { tip.style.opacity = 0; rule.attr('opacity', 0); });
  }

  let sigSort = { k: 'gap', dir: -1 };
  $$('#sig-table th button').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; sigSort = { k, dir: sigSort.k === k ? -sigSort.dir : -1 }; drawSigTable(); }));
  function drawSigTable() {
    const S = rowsOf('signals'); if (!S) return;
    const { k, dir } = sigSort;
    const rows = [...S].sort((a, b) => { const va = a[k] ?? -999, vb = b[k] ?? -999; return (va < vb ? -1 : va > vb ? 1 : 0) * dir; });
    $$('#sig-table th').forEach((th) => { const b = th.querySelector('button'); th.setAttribute('aria-sort', b && b.dataset.sort === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'); });
    $('#sig-table tbody').replaceChildren(...rows.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.asset_class;
      cell(tr, r.asset_class, 'strong'); cell(tr, r.desk, 'nowrap gr-hide-narrow'); cell(tr, r.gauge, 'nowrap gr-hide-narrow');
      cell(tr, String(r.exposure_index), 'num r'); cell(tr, r.priced == null ? '—' : String(r.priced), 'num r');
      const g = cell(tr, r.gap == null ? '—' : FMT.sint(r.gap), 'num r'); if (r.gap >= 25) g.classList.add('tone-bad'); if (r.gap <= -25) g.classList.add('tone-ok');
      cell(tr, pill(r.confirmed, r.confirmed === 'Mixed' ? 'warn' : '')); cell(tr, evidence(r), 'num r gr-hide-narrow');
      cell(tr, pill(r.signal)); cell(tr, r.conviction, 'nowrap gr-hide-narrow'); cell(tr, r.vehicle, 'gr-hide-narrow');
      cell(tr, r.mom_z20 == null ? '—' : FMT.sz(r.mom_z20), 'num r gr-hide-narrow');
      cell(tr, r.oil_beta_60d == null ? '—' : FMT.s2(r.oil_beta_60d), 'num r gr-hide-narrow');
      cell(tr, moveOf(r.series, r.expected_5d), 'num r gr-hide-narrow');
      cell(tr, r.expression, 'wide');
      return tr;
    }));
  }

  function divergingBars(box, tip, data, opts) {
    if (!box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, bh = 18, gap = 6, H = data.length * (bh + gap) + 30;
    const svg = svgFor(box, H);
    const ml = textW(svg, data.map((d) => d.label)) + 10, mr = textW(svg, data.map((d) => opts.fmt(d.v))) + 10;
    const ext = Math.max(opts.min || 0, d3.max(data, (d) => abs(d.v)));
    const x = d3.scaleLinear([-ext, ext], [ml + mr, W - mr]).nice();
    const y = (i) => 6 + i * (bh + gap) + (opts.breakAt != null && i >= opts.breakAt ? 0 : 0);
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', H - 22).style('stroke', 'var(--cds-chart-axis)');
    (opts.refs || []).forEach((r) => { if (x(r) > ml + mr && x(r) < W - mr) svg.append('line').attr('x1', x(r)).attr('x2', x(r)).attr('y1', 0).attr('y2', H - 22).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '3 3'); });
    x.ticks(5).forEach((t) => svg.append('text').attr('x', x(t)).attr('y', H - 6).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(opts.axis(t)));
    data.forEach((d, i) => {
      const x0 = x(Math.min(0, d.v)), w = abs(x(d.v) - x(0));
      svg.append('text').attr('x', ml - 4).attr('y', y(i) + bh / 2).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(d.label);
      svg.append('rect').attr('x', x0).attr('y', y(i)).attr('width', Math.max(1, w)).attr('height', bh).attr('rx', 4).style('fill', d.color);
      svg.append('text').attr('x', d.v >= 0 ? x(d.v) + 4 : x(d.v) - 4).attr('y', y(i) + bh / 2).attr('dy', '0.32em').attr('text-anchor', d.v >= 0 ? 'start' : 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(opts.fmt(d.v));
      svg.append('rect').attr('x', 0).attr('y', y(i) - gap / 2).attr('width', W).attr('height', bh + gap).style('fill', 'transparent')
        .on('pointermove', (event) => { const [mx] = d3.pointer(event); tipAt(tip, box, mx, y(i) + bh, d.tip); })
        .on('pointerleave', () => { tip.style.opacity = 0; });
    });
  }
  function drawGapBars() {
    const box = $('#gapbars'); if (failed('framework', 'catalysts', 'markets')) return showFail(box);
    const S = rowsOf('signals'); if (!S) return;
    const col = { 'Under-priced': 'var(--cds-chart-status-critical)', Watch: dash.colors[2], Rich: dash.colors[1], Fair: 'var(--cds-chart-muted)' };
    const data = S.filter((r) => r.gap != null).sort((a, b) => b.gap - a.gap).map((r) => ({ label: r.asset_class, v: r.gap, color: col[r.signal] || 'var(--cds-chart-muted)', tip: [r.asset_class, `Exposure ${r.exposure_index} − priced ${r.priced} = ${FMT.sint(r.gap)}`, `${r.signal} · confirmed: ${r.confirmed} · evidence ${evidence(r)}`] }));
    divergingBars(box, $('#gapbars-tip'), data, { fmt: FMT.sint, axis: (t) => d3.format('d')(t), refs: [-25, 25], min: 60 });
  }
  function drawHedgeBars() {
    const box = $('#hedgebars'); if (failed('markets', 'catalysts', 'desk')) return showFail(box);
    const R = rowsOf('hedge_rank'); if (!R) return;
    const pick = [...R.slice(0, 10), ...R.slice(-6)];
    const data = pick.map((r) => ({ label: r.series, v: r.esc_z, color: r.esc_z > 0 ? dash.colors[0] : 'var(--cds-chart-muted)', tip: [`${r.series} · ${r.desk}`, `Avg 5-day move after escalations: ${moveOf(r.series, r.esc_mean, r.kind)}`, `Rose in ${r.esc_up}% of ${r.esc_n} events`, `Vol-adjusted: ${FMT.sz(r.esc_z)}`] }));
    divergingBars(box, $('#hedge-tip'), data, { fmt: FMT.sz, axis: (t) => d3.format('.1f')(t), min: 0.5 });
  }
  function drawBacktest() {
    const B = rowsOf('gap_backtest'); if (!B) return;
    $('#bt-table tbody').replaceChildren(...[...B].sort((a, b) => a.order - b.order).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.bucket;
      cell(tr, r.bucket, 'strong'); cell(tr, String(r.n), 'num r'); cell(tr, r.vix_up == null ? '—' : r.vix_up + '%', 'num r');
      cell(tr, r.vix_fwd == null ? '—' : FMT.spts(r.vix_fwd), 'num r'); cell(tr, r.spx_fwd == null ? '—' : FMT.spct2(r.spx_fwd), 'num r');
      return tr;
    }));
  }
  function drawAnalogs() {
    const A = rowsOf('analogs'); if (!A) return;
    $('#an-table tbody').replaceChildren(...A.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.series;
      cell(tr, r.series, 'strong'); cell(tr, moveOf(r.series, r.hist_esc_mean), 'num r'); cell(tr, r.hist_esc_up + '%', 'num r');
      cell(tr, moveOf(r.series, r.cur_esc_mean), 'num r'); cell(tr, r.cur_esc_up + '%', 'num r'); cell(tr, pill(r.agree, r.agree === 'No' ? 'warn' : ''));
      return tr;
    }));
  }
  function drawAnalogEvents() {
    const A = rowsOf('analog_events'); if (!A) return;
    const cols = ['Brent', 'VIX', 'S&P 500', 'Gold', 'UST 10Y', 'DXY'];
    $('#ae-table tbody').replaceChildren(...A.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.event_id;
      cell(tr, dOrDash(r.date), 'num nowrap'); const t = cell(tr, r.event, 'strong'); t.title = r.title;
      cell(tr, pill(r.direction, r.direction === 'Escalation' ? 'bad' : ''), 'gr-hide-narrow');
      cols.forEach((c) => cell(tr, moveOf(c, r[c], c === 'UST 10Y' ? 'rate' : 'price'), 'num r'));
      return tr;
    }));
  }
  let esDesk = 'All';
  function drawEventTable() {
    const E = rowsOf('event_study'); if (!E) return;
    const seg = $('#es-seg');
    segButtons(seg, ['All', 'Equities', 'Rates', 'Credit', 'Energy', 'Metals & Ags', 'FX', 'Volatility'], null, (k) => { esDesk = k; drawEventTable(); });
    pressSeg(seg, esDesk);
    const rows = E.filter((r) => esDesk === 'All' || r.desk === esDesk).sort((a, b) => (b.sensitivity ?? -1e9) - (a.sensitivity ?? -1e9));
    $('#es-table tbody').replaceChildren(...rows.map((r) => esRow(r, true)));
    const hr = rowsOf('hedge_rank');
    if (hr) $('#play-hedges').textContent = hr.filter((r) => r.esc_z > 0).slice(0, 5).map((r) => `${r.series} (${FMT.sz(r.esc_z)})`).join(', ');
  }
  function esRow(r, withDesk) {
    const tr = el('tr'); tr.dataset.key = r.series;
    cell(tr, r.series, 'strong'); if (withDesk) cell(tr, r.desk, 'nowrap gr-hide-narrow');
    cell(tr, moveOf(r.series, r.esc_mean, r.kind), 'num r'); cell(tr, r.esc_up == null ? '—' : r.esc_up + '%', 'num r');
    cell(tr, moveOf(r.series, r.deesc_mean, r.kind), 'num r'); if (withDesk) cell(tr, r.deesc_up == null ? '—' : r.deesc_up + '%', 'num r');
    cell(tr, moveOf(r.series, r.sensitivity, r.kind), 'num r');
    return tr;
  }
  function drawScenarios() {
    const Sc = rowsOf('scenarios'), Sm = rowsOf('scenario_moves');
    if (Sc) $('#scen-table tbody').replaceChildren(...Sc.map((r) => { const tr = el('tr'); tr.dataset.key = r.id; cell(tr, r.scenario, 'strong'); cell(tr, FMT.frac(r.probability), 'num r'); cell(tr, r.description, 'wide'); return tr; }));
    if (Sm) $('#sm-table tbody').replaceChildren(...[...Sm].sort((a, b) => abs(b.expected / ((META.get(b.series) || {}).daily_sd || 1)) - abs(a.expected / ((META.get(a.series) || {}).daily_sd || 1))).slice(0, 20).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.series;
      cell(tr, r.series, 'strong'); cell(tr, moveOf(r.series, r.esc_mean, r.kind), 'num r'); cell(tr, moveOf(r.series, r.deesc_mean, r.kind), 'num r'); cell(tr, moveOf(r.series, r.expected, r.kind), 'num r'); cell(tr, moveOf(r.series, r.skew, r.kind), 'num r');
      return tr;
    }));
  }
  function drawPlay() {
    const S = rowsOf('signals'); if (!S) return;
    const fmtList = (sig) => { const l = S.filter((r) => r.signal === sig); return l.length ? l.map((r) => `${r.asset_class} (gap ${FMT.sint(r.gap)}: ${r.expression.charAt(0).toLowerCase() + r.expression.slice(1)})`).join('; ') : 'none at current thresholds'; };
    $('#play-under').textContent = fmtList('Under-priced');
    $('#play-watch').textContent = S.filter((r) => r.signal === 'Watch').map((r) => `${r.asset_class} (gap ${FMT.sint(r.gap)})`).join(', ') || 'none';
    $('#play-rich').textContent = fmtList('Rich');
  }

  /* ================= SHOCKS ================= */
  const MX_COLS = [['Equities', ['S&P 500', 'SMH', 'XLE', 'JETS', 'TAIEX', 'Bovespa']], ['Rates & credit', ['Treasury 2Y', 'UST 10Y', 'HY OAS', 'CCC–BBB']], ['FX', ['DXY', 'USD/JPY', 'USD/INR', 'USD/MXN']], ['Commodities', ['Brent', '3-2-1 crack', 'Gold', 'Copper', 'Wheat']], ['Volatility', ['VIX', 'MOVE', 'OVX']]];
  const LBL = { 'Treasury 2Y': '2Y', 'UST 10Y': '10Y', 'HY OAS': 'HY OAS', '3-2-1 crack': '3-2-1', 'USD/JPY': 'JPY', 'USD/INR': 'INR', 'USD/MXN': 'MXN', 'CCC–BBB': 'CCC–BBB' };
  const heat = (pz) => { const pct = Math.round(6 + Math.min(1, Math.abs(pz) / 2) * 50); return `color-mix(in srgb, var(${pz >= 0 ? '--color-ok' : '--color-bad'}) ${pct}%, var(--color-panel))`; };
  const compact = (r) => { const v = r.move; if (v == null) return '—'; if (r.kind === 'rate') return (v > 0 ? '+' : v < 0 ? '−' : '') + d3.format(Math.abs(v) < 10 ? '.1f' : '.0f')(Math.abs(v)); if (r.kind === 'level') return (v > 0 ? '+' : v < 0 ? '−' : '') + (r.unit === '$/bbl' ? '$' + d3.format('.1f')(Math.abs(v)) : d3.format('.2f')(Math.abs(v))); return (v > 0 ? '+' : v < 0 ? '−' : '') + d3.format('.1f')(Math.abs(v)); };
  const gainTone = (pz) => (pz >= 0.25 ? 'tone-gain' : pz <= -0.25 ? 'tone-loss' : '');
  let mxMode = 'move';
  function drawMatrix() {
    const box = $('#mx-grid'), tip = $('#mx-tip');
    if (failed('markets', 'desk', 'catalysts')) return showFail(box);
    const M = rowsOf('shock_matrix'), S = rowsOf('shocks'); if (!M || !S) return;
    const seg = $('#mx-seg');
    segButtons(seg, ['move', 'z'], (k) => (k === 'move' ? 'Moves' : 'z-scores'), (k) => { mxMode = k; drawMatrix(); });
    pressSeg(seg, mxMode);
    $('#mx-keys').replaceChildren(...[['Long holder gains', 'var(--color-ok)'], ['Long holder loses', 'var(--color-bad)'], ['Darker = larger vs normal move', 'var(--cds-chart-muted)']].map(([t, c]) => { const k = el('span'); const i = el('i'); i.style.background = c; k.append(i, document.createTextNode(t)); return k; }));
    box.classList.remove('dash-skeleton');
    const by = new Map(M.map((r) => [r.key, r]));
    const cols = MX_COLS.flatMap(([g, ss]) => ss.map((s) => ({ g, s })));
    box.style.gridTemplateColumns = `minmax(9.5rem, 1.6fr) repeat(${cols.length}, minmax(2.5rem, 1fr))`;
    const kids = [el('div', 'sc sg', '')];
    MX_COLS.forEach(([g, ss]) => { const c = el('div', 'sc sg', g); c.style.gridColumn = `span ${ss.length}`; kids.push(c); });
    kids.push(el('div', 'sc sh', ''));
    cols.forEach(({ s }) => kids.push(el('div', 'sc sh', LBL[s] || s)));
    [...S].sort((a, b) => a.order - b.order).forEach((sh) => {
      const lab = el('div', 'sc sr', sh.label); lab.title = sh.description; kids.push(lab);
      cols.forEach(({ s }) => {
        const r = by.get(`${sh.id}|${s}`);
        const c = el('div', 'sc', r ? (mxMode === 'move' ? compact(r) : FMT.sz(r.z)) : '—');
        if (r) {
          c.style.background = heat(r.pos_z);
          c.addEventListener('pointerenter', () => { const pr = box.getBoundingClientRect(), cr = c.getBoundingClientRect(); tipAt(tip, box, cr.left - pr.left, cr.bottom - pr.top + 4, [`${sh.label} → ${s}`, `Move: ${moveOf(s, r.move, r.kind, r.unit)} (${r.horizon === 5 ? '5-day' : 'same day'})`, `z ${FMT.sz(r.z)} · long holder ${FMT.sz(r.pos_z)}`, `Basis: ${r.basis}`]); });
          c.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
        } else c.style.color = 'var(--color-fg-muted)';
        kids.push(c);
      });
    });
    box.replaceChildren(tip, ...kids);
    const SD = rowsOf('shocks');
    $('#shockdef-table tbody').replaceChildren(...[...SD].sort((a, b) => a.order - b.order).map((r) => { const tr = el('tr'); tr.dataset.key = r.id; cell(tr, r.label, 'strong'); cell(tr, r.type === 'event' ? 'Measured event' : 'Factor model', 'nowrap'); cell(tr, String(r.horizon), 'num r'); cell(tr, r.description, 'wide'); return tr; }));
  }

  /* simulator */
  const sim = { geo: 'none', int: 1, y2: 0, oil: 0, spx: 0, desk: 'All' };
  const GEO = [['none', 'None'], ['esc', 'Escalation'], ['deesc', 'De-escalation'], ['hist', '2019–25 analog']];
  const PRESETS = [
    ['Hormuz escalation', { geo: 'esc', int: 1, y2: 0, oil: 0, spx: 0 }], ['Peace deal', { geo: 'deesc', int: 1, y2: 0, oil: 0, spx: 0 }],
    ['Surprise hike', { geo: 'none', int: 1, y2: 12, oil: 0, spx: 0 }], ['Escalation + hike', { geo: 'esc', int: 1, y2: 12, oil: 0, spx: 0 }],
    ['Stagflation: oil +20%, hike', { geo: 'none', int: 1, y2: 15, oil: 20, spx: -2 }], ['Equity crash, Fed eases', { geo: 'none', int: 1, y2: -20, oil: -5, spx: -7 }],
    ['Reset', { geo: 'none', int: 1, y2: 0, oil: 0, spx: 0 }],
  ];
  const SLIDERS = [['int', (v) => d3.format('.1f')(v) + '×'], ['y2', (v) => (v > 0 ? '+' : '') + v + ' bp'], ['oil', (v) => (v > 0 ? '+' : '') + v + '%'], ['spx', (v) => (v > 0 ? '+' : '') + v + '%']];
  function applySim(p) { Object.assign(sim, p); SLIDERS.forEach(([k]) => { $('#sim-' + k).value = sim[k]; }); drawSim(); }
  SLIDERS.forEach(([k]) => $('#sim-' + k).addEventListener('input', (e) => { sim[k] = Number(e.target.value); drawSim(); }));
  function simRows() {
    const B = rowsOf('shock_betas'), E = rowsOf('event_study'), A = rowsOf('analogs'); if (!B || !E || !A) return null;
    const ES = new Map(E.map((r) => [r.series, r])), AN = new Map(A.map((r) => [r.series, r]));
    const h = sim.geo === 'none' ? 1 : 5;
    return B.map((b) => {
      let g = 0, partial = false;
      if (sim.geo === 'esc' || sim.geo === 'deesc') { const e = ES.get(b.series); if (e) g = (sim.geo === 'esc' ? e.esc_mean : e.deesc_mean) || 0; else partial = true; }
      if (sim.geo === 'hist') { const a = AN.get(b.series); if (a) g = a.hist_esc_mean || 0; else partial = true; }
      const move = sim.int * g + b.b_y2 * sim.y2 + b.b_oil * sim.oil + b.b_spx * sim.spx;
      const z = move / (b.daily_sd * Math.sqrt(h));
      return { series: b.series, desk: b.desk, kind: b.kind, unit: b.unit, move, z, pos_z: b.kind === 'rate' ? -z : z, partial };
    });
  }
  function drawSim() {
    const card = $('#sim-card');
    SLIDERS.forEach(([k, f]) => { $(`#sim-${k}-v`).textContent = f(sim[k]); });
    const gseg = $('#sim-geo'); segButtons(gseg, GEO.map((g) => g[0]), (k) => GEO.find((g) => g[0] === k)[1], (k) => { sim.geo = k; drawSim(); }); pressSeg(gseg, sim.geo);
    const pseg = $('#sim-presets'); segButtons(pseg, PRESETS.map((p) => p[0]), null, (k) => applySim(PRESETS.find((p) => p[0] === k)[1]));
    if (failed('markets', 'desk')) return showFail($('#sim-bars'));
    const R = simRows(); if (!R) return;
    const get = (s) => R.find((r) => r.series === s) || { move: 0, z: 0, pos_z: 0, kind: 'price' };
    const spx = get('S&P 500'), t10 = get('UST 10Y'), p6040 = 0.6 * spx.move + 0.4 * (-0.08 * t10.move);
    const tiles = [['60/40 portfolio', FMT.spct2(p6040), p6040 >= 0 ? 1 : -1, 'S&P 60% · 10-year 40%']];
    ['S&P 500', 'UST 10Y', 'Treasury 2Y', 'HY OAS', 'DXY', 'Gold', 'Brent', 'VIX'].forEach((s) => { const r = get(s); tiles.push([s, moveOf(s, r.move, r.kind, r.unit), r.pos_z, `z ${FMT.sz(r.z)}`]); });
    $('#sim-kpis').replaceChildren(...tiles.map(([l, v, pz, sub]) => { const d = el('div'); const vv = el('span', 'v ' + gainTone(pz), v); d.append(el('span', 'lab', l), vv, el('span', 'zz', sub)); return d; }));
    const h = sim.geo === 'none' ? 'same-day' : '5-day';
    const parts = [];
    if (sim.geo !== 'none') parts.push(`${GEO.find((g) => g[0] === sim.geo)[1]} bundle ×${sim.int}`);
    if (sim.y2) parts.push(`2-year ${sim.y2 > 0 ? '+' : ''}${sim.y2} bp`);
    if (sim.oil) parts.push(`extra Brent ${sim.oil > 0 ? '+' : ''}${sim.oil}%`);
    if (sim.spx) parts.push(`extra S&P ${sim.spx > 0 ? '+' : ''}${sim.spx}%`);
    $('#sim-note').textContent = (parts.length ? 'Shock: ' + parts.join(' + ') + `. z measured over a ${h} horizon.` : 'No shock set: pick a preset or move a slider.') + (sim.geo === 'hist' ? ' The 2019–25 analogs cover six series; others show factor shocks only.' : '');
    const box = $('#sim-bars');
    const top = [...R].filter((r) => Math.abs(r.z) > 0.001).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 14).sort((a, b) => b.z - a.z);
    if (top.length) divergingBars(box, $('#sim-tip'), top.map((r) => ({ label: r.series, v: Math.round(r.z * 100) / 100, color: r.pos_z >= 0 ? 'var(--color-ok)' : 'var(--color-bad)', tip: [`${r.series} · ${r.desk}`, `Move ${moveOf(r.series, r.move, r.kind, r.unit)}`, `z ${FMT.sz(r.z)} · long holder ${FMT.sz(r.pos_z)}`] })), { fmt: FMT.sz, axis: (t) => d3.format('.1f')(t), min: 1 });
    else { clearChart(box); box.appendChild(el('div', 'gr-fail', 'Set a shock to see impacts')); }
    const dseg = $('#sim-desk'); segButtons(dseg, ['All', 'Equities', 'Rates', 'Credit', 'Energy', 'Metals & Ags', 'FX', 'Volatility'], null, (k) => { sim.desk = k; drawSim(); }); pressSeg(dseg, sim.desk);
    $('#sim-table tbody').replaceChildren(...R.filter((r) => sim.desk === 'All' || r.desk === sim.desk).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).map((r) => {
      const tr = el('tr'); cell(tr, r.series + (r.partial ? ' *' : ''), 'strong'); cell(tr, r.desk, 'nowrap gr-hide-narrow');
      cell(tr, moveOf(r.series, r.move, r.kind, r.unit), 'num r'); cell(tr, FMT.sz(r.z), 'num r'); cell(tr, FMT.sz(r.pos_z), 'num r ' + gainTone(r.pos_z)); return tr;
    }));
    card.classList.remove('dash-skeleton');
  }

  /* transmission & hedges */
  let trShock = 'esc';
  function drawTrShock() {
    const S = rowsOf('shocks'); if (!S) return;
    const seg = $('#tr-seg');
    segButtons(seg, [...S].sort((a, b) => a.order - b.order).map((s) => s.id), (k) => S.find((s) => s.id === k).label, (k) => { trShock = k; drawTrShock(); });
    pressSeg(seg, trShock);
    const T = rowsOf('shock_transmission'), M = rowsOf('shock_matrix'), H = rowsOf('shock_hedges');
    const box = $('#trans-chart'), tip = $('#trans-tip');
    if (failed('markets', 'desk')) { showFail(box); showFail($('#rank-chart')); return; }
    if (T && box.clientWidth) {
      box.classList.remove('dash-skeleton');
      const rows = T.filter((r) => r.shock === trShock).sort((a, b) => b.avg_abs_z - a.avg_abs_z);
      const W = box.clientWidth, bh = 18, gp = 6, H2 = rows.length * (bh + gp) + 8;
      const svg = svgFor(box, H2);
      const ml = textW(svg, rows.map((r) => r.desk)) + 10, labs = rows.map((r) => `${d3.format('.2f')(r.avg_abs_z)} · ${r.top_series} ${FMT.sz(r.top_z)}`), mr = Math.min(W * 0.55, textW(svg, labs) + 10);
      const x = d3.scaleLinear([0, d3.max(rows, (r) => r.avg_abs_z) || 1], [ml, W - mr]);
      rows.forEach((r, i) => {
        const y = 4 + i * (bh + gp);
        svg.append('text').attr('x', ml - 6).attr('y', y + bh / 2).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(r.desk);
        svg.append('rect').attr('x', ml).attr('y', y).attr('width', Math.max(1, x(r.avg_abs_z) - ml)).attr('height', bh).attr('rx', 4).style('fill', i === 0 ? dash.colors[0] : 'var(--cds-chart-muted)');
        svg.append('text').attr('x', x(r.avg_abs_z) + 6).attr('y', y + bh / 2).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(labs[i]);
      });
    }
    if (M) {
      const rows = M.filter((r) => r.shock === trShock).sort((a, b) => b.z - a.z);
      const pick = rows.length > 16 ? [...rows.slice(0, 8), ...rows.slice(-8)] : rows;
      divergingBars($('#rank-chart'), $('#rank-tip'), pick.map((r) => ({ label: r.series, v: r.z, color: r.pos_z >= 0 ? 'var(--color-ok)' : 'var(--color-bad)', tip: [`${r.series} · ${r.desk}`, `Move ${moveOf(r.series, r.move, r.kind, r.unit)} (${r.horizon === 5 ? '5-day' : 'same day'})`, `z ${FMT.sz(r.z)} · long holder ${FMT.sz(r.pos_z)}`, r.basis] })), { fmt: FMT.sz, axis: (t) => d3.format('.1f')(t), min: 1 });
    }
    if (H) $('#hedge-table tbody').replaceChildren(...H.filter((r) => r.shock === trShock).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.key;
      cell(tr, pill(r.side, r.side === 'Hedge' ? 'ok' : 'bad')); cell(tr, String(r.rank), 'num r'); cell(tr, r.series, 'strong'); cell(tr, r.desk, 'nowrap gr-hide-narrow');
      cell(tr, moveOf(r.series, r.move, r.kind, r.unit), 'num r'); cell(tr, FMT.sz(r.pos_z), 'num r ' + gainTone(r.pos_z)); cell(tr, r.flag ? pill(r.flag, 'warn') : '');
      return tr;
    }));
  }

  /* combined scenarios */
  const GEOC = { Escalation: 'var(--cds-chart-status-critical)', 'Status quo': 'var(--cds-chart-muted)', 'De-escalation': dash.colors[0] };
  function drawCombo() {
    const C = rowsOf('combo_scenarios'); if (!C) return;
    const box = $('#combo-chart'), tip = $('#combo-tip');
    if (failed('markets', 'scenarios', 'fed_scenarios')) showFail(box);
    else if (box.clientWidth) {
      box.classList.remove('dash-skeleton');
      const pts = C.filter((r) => r.probability != null && r.id !== 'expected');
      const exp = C.find((r) => r.id === 'expected');
      const W = box.clientWidth, H = 260, svg = svgFor(box, H);
      const y = d3.scaleLinear(d3.extent([...pts.map((p) => p.p6040), 0]), [H - 26, 14]).nice(5);
      const ml = textW(svg, y.ticks(5).map((t) => d3.format('+.1f')(t) + '%')) + 10, mr = 12;
      const x = d3.scaleLinear([0, d3.max(pts, (p) => p.probability) * 1.1], [ml, W - mr]).nice(5);
      y.ticks(5).forEach((t) => { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', t === 0 ? 'var(--cds-chart-axis)' : 'var(--cds-chart-grid)'); svg.append('text').attr('x', ml - 6).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(d3.format('+.1f')(t) + '%'); });
      x.ticks(5).forEach((t) => svg.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(t + '%'));
      svg.append('text').attr('x', W - mr).attr('y', H - 8 - 14).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('probability →');
      if (exp) { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(exp.p6040)).attr('y2', y(exp.p6040)).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3'); svg.append('text').attr('x', W - mr).attr('y', y(exp.p6040) - 4).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('expected ' + FMT.spct2(exp.p6040)); }
      pts.forEach((p) => {
        const cx = x(p.probability), cy = y(p.p6040);
        svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 6).style('fill', GEOC[p.geo] || dash.colors[1]).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5)
          .on('pointermove', () => tipAt(tip, box, cx, cy + 8, [p.label, `Probability ${FMT.pct1(p.probability)}`, `60/40 ${FMT.spct2(p.p6040)} · S&P ${FMT.spct2(p.s_p_500)} · 10Y ${FMT.sbp1(p.ust_10y)}`]))
          .on('pointerleave', () => { tip.style.opacity = 0; });
        if (p.probability >= 9) svg.append('text').attr('x', cx + 9).attr('y', cy).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(p.label.replace('Escalation', 'Esc.').replace('De-escalation', 'De-esc.'));
      });
      let lx = ml + 4; Object.entries(GEOC).forEach(([k, c]) => { svg.append('circle').attr('cx', lx + 5).attr('cy', 6).attr('r', 5).style('fill', c); const t = svg.append('text').attr('x', lx + 14).attr('y', 6).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(k); lx += 24 + t.node().getComputedTextLength(); });
    }
    const bp = (v) => FMT.sbp1(v), pc = (v) => FMT.spct2(v);
    $('#combo-table tbody').replaceChildren(...[...C].sort((a, b) => a.order - b.order).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      const t = cell(tr, r.label, 'strong'); if (r.id === 'expected' || r.id === 'stress') t.style.fontStyle = 'italic';
      cell(tr, r.probability == null ? 'stress' : FMT.pct1(r.probability), 'num r'); cell(tr, FMT.sbp(r.y2_shock), 'num r gr-hide-narrow');
      cell(tr, pc(r.p6040), 'num r ' + gainTone(r.p6040 * 4)); cell(tr, pc(r.s_p_500), 'num r'); cell(tr, bp(r.ust_10y), 'num r'); cell(tr, bp(r.treasury_2y), 'num r gr-hide-narrow');
      cell(tr, bp(r.hy_oas), 'num r gr-hide-narrow'); cell(tr, pc(r.dxy), 'num r gr-hide-narrow'); cell(tr, pc(r.gold), 'num r'); cell(tr, pc(r.brent), 'num r gr-hide-narrow'); cell(tr, pc(r.vix), 'num r');
      if (r.id === 'expected') cell(tr, '');
      else {
        const b = el('button', 'gr-link', 'Simulate'); b.type = 'button';
        b.addEventListener('click', () => { const g = r.id === 'stress' ? 'esc' : r.id.split('_')[0]; applySim({ geo: g === 'base' ? 'none' : g, int: r.id === 'stress' ? 2 : 1, y2: r.y2_shock, oil: 0, spx: 0 }); $('#sim-card').scrollIntoView(); });
        cell(tr, b);
      }
      return tr;
    }));
  }

  /* ================= DESKS ================= */
  const DESKS = { equities: 'Equities', rates: 'Rates', credit: 'Credit', energy: 'Energy', metals: 'Metals & Ags', fx: 'FX', vol: 'Volatility' };
  const slugOf = (name) => Object.keys(DESKS).find((k) => DESKS[k] === name) || 'equities';
  const CHART = {
    equities: { mode: 'rebase', series: ['S&P 500', 'XLE', 'ITA', 'JETS', 'SMH', 'TAIEX', 'Bovespa'] },
    rates: { mode: 'level', series: ['UST 3M', 'UST 5Y', 'UST 10Y', 'UST 30Y'], axis: (v) => d3.format('.1f')(v) + '%', fmt: FMT.pct2 },
    credit: { mode: 'level', series: ['BBB OAS', 'EM corp OAS', 'HY OAS'], axis: (v) => d3.format('d')(v * 100), fmt: FMT.bpv },
    energy: { mode: 'rebase', series: ['Brent', 'WTI', 'RBOB', 'ULSD', 'Frontline (FRO)'] },
    metals: { mode: 'rebase', series: ['Gold', 'Copper', 'Wheat', 'Cocoa'] },
    fx: { mode: 'rebase', series: ['DXY', 'USD/JPY', 'USD/CHF', 'USD/CNY', 'USD/INR', 'USD/ZAR', 'USD/BRL', 'USD/MXN'] },
    vol: { mode: 'level', series: ['VIX 9D', 'VIX', 'VIX 3M', 'OVX', 'GVZ'], axis: (v) => d3.format('d')(v), fmt: FMT.num2 },
  };
  const hidden = {};
  let curDesk = 'equities';
  const deskNav = $('#desk-nav');
  $$('button', deskNav).forEach((b) => b.addEventListener('click', () => { pickDesk(b.dataset.desk); dash.setLink('desk-' + b.dataset.desk); render(); }));
  function pickDesk(slug) {
    curDesk = DESKS[slug] ? slug : 'equities';
    $$('button', deskNav).forEach((b) => b.setAttribute('aria-pressed', b.dataset.desk === curDesk));
    $$('.gr-desk').forEach((d) => { d.hidden = d.id !== 'desk-' + curDesk; });
  }
  function drawDesk() {
    const slug = curDesk, name = DESKS[slug], panel = $('#desk-' + slug);
    drawSparks(panel);
    drawDeskChart(slug);
    const S = rowsOf('signals');
    if (S) sigList($('#dsig-' + slug), S.filter((r) => r.desk === name || (name === 'Volatility' && r.series === 'VIX')), true);
    const E = rowsOf('event_study');
    if (E) $(`#des-${slug} tbody`).replaceChildren(...E.filter((r) => r.desk === name).sort((a, b) => (b.sensitivity ?? -1e9) - (a.sensitivity ?? -1e9)).map((r) => esRow(r, false)));
  }
  function drawDeskChart(slug) {
    const box = $('#dchart-' + slug), tip = $('#dtip-' + slug), seg = $('#dseg-' + slug);
    if (failed('markets', 'desk')) return showFail(box);
    const U = uni(); if (!U || !box.clientWidth) return;
    const cfg = CHART[slug];
    hidden[slug] = hidden[slug] || new Set();
    if (!seg.childElementCount) {
      seg.classList.add('lines');
      cfg.series.forEach((s, i) => {
        const b = el('button'); b.type = 'button'; b.dataset.k = s;
        const dot = el('i'); dot.style.background = color(i); b.append(dot, document.createTextNode(s));
        b.addEventListener('click', () => { const h = hidden[slug]; if (h.has(s)) h.delete(s); else if (h.size < cfg.series.length - 1) h.add(s); drawDeskChart(slug); });
        seg.appendChild(b);
      });
    }
    $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', !hidden[slug].has(b.dataset.k)));
    box.classList.remove('dash-skeleton');
    const lines = cfg.series.map((s, i) => {
      const raw = (U.get(s) || []).filter((r) => r.date >= '2025-11-03').map((r) => ({ d: parse(r.date), v: +r.value, date: r.date })).sort((a, b) => a.d - b.d);
      let pts = raw;
      if (cfg.mode === 'rebase') { const base = (raw.filter((p) => p.date <= '2026-02-27').pop() || raw[0]).v; pts = raw.map((p) => ({ ...p, raw: p.v, v: (p.v / base) * 100 })); }
      return { s, c: color(i), pts, on: !hidden[slug].has(s) };
    }).filter((l) => l.pts.length);
    const vis = lines.filter((l) => l.on);
    const W = box.clientWidth, H = 280;
    const svg = svgFor(box, H);
    const all = vis.flatMap((l) => l.pts);
    const y = d3.scaleLinear(d3.extent(all, (p) => p.v), [H - 24, 12]).nice(5);
    const axis = cfg.axis || ((v) => d3.format('d')(v));
    const ml = textW(svg, y.ticks(5).map(axis)) + 10, mr = 12;
    const x = d3.scaleUtc(d3.extent(all, (p) => p.d), [ml, W - mr]);
    y.ticks(5).forEach((t) => {
      svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', cfg.mode === 'rebase' && t === 100 ? 'var(--cds-chart-reference)' : 'var(--cds-chart-grid)').attr('stroke-dasharray', cfg.mode === 'rebase' && t === 100 ? '3 3' : null);
      svg.append('text').attr('x', ml - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(axis(t));
    });
    svg.selectAll('text.x').data(x.ticks(W < 520 ? 4 : 8)).join('text').attr('x', x).attr('y', H - 6).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((t) => (t.getUTCMonth() === 0 ? d3.utcFormat('%b %Y')(t) : fMonth(t)));
    const war = parse('2026-02-27');
    svg.append('line').attr('x1', x(war)).attr('x2', x(war)).attr('y1', 12).attr('y2', H - 24).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '3 3');
    svg.append('text').attr('x', x(war) + 4).attr('y', 20).style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('War begins');
    vis.forEach((l) => svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p.v))(l.pts)).style('fill', 'none').style('stroke', l.c).attr('stroke-width', 1.75).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round'));
    const rule = svg.append('line').attr('y1', 12).attr('y2', H - 24).style('stroke', 'var(--cds-chart-axis)').attr('opacity', 0);
    const bis = d3.bisector((p) => p.d).center;
    const fmtV = (l, p) => (cfg.mode === 'rebase' ? `${d3.format('.1f')(p.v)} (${FMT.num2(p.raw)})` : (cfg.fmt || FMT.num2)(p.v));
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (event) => {
        const [mx] = d3.pointer(event); const t = x.invert(mx);
        const rows = vis.map((l) => ({ l, p: l.pts[bis(l.pts, t)] })).filter((r) => r.p).sort((a, b) => b.p.v - a.p.v);
        if (!rows.length) return;
        rule.attr('x1', x(rows[0].p.d)).attr('x2', x(rows[0].p.d)).attr('opacity', .6);
        tipAt(tip, box, x(rows[0].p.d), 12, [fDate(rows[0].p.d), ...rows.map((r) => `${r.l.s}: ${fmtV(r.l, r.p)}`)]);
      })
      .on('pointerleave', () => { tip.style.opacity = 0; rule.attr('opacity', 0); });
  }
  function sigList(box, rows, showAll) {
    const order = { 'Under-priced': 0, Watch: 1, Rich: 2, Fair: 3, 'n/a': 4 };
    const list = (showAll ? rows : rows.filter((r) => r.signal !== 'Fair' && r.signal !== 'n/a')).sort((a, b) => order[a.signal] - order[b.signal] || abs(b.gap) - abs(a.gap));
    if (!list.length) { box.replaceChildren(el('div', 'gr-note', 'No asset class on this desk is in the signal framework yet.')); return; }
    box.replaceChildren(...list.map((r) => {
      const row = el('div', 'row');
      row.append(pill(r.signal), el('span', 'who', `${r.asset_class} (${r.gauge})`), el('span', 'why', `gap ${r.gap == null ? '—' : FMT.sint(r.gap)} · confirmed ${r.confirmed} · ${r.expression}`));
      return row;
    }));
  }

  /* ================= FED ================= */
  const stanceLabel = (v) => ({ 2: 'Hawkish', 1: 'Leaning hawkish', 0: 'Neutral', '-1': 'Leaning dovish', '-2': 'Dovish' })[String(v)] || String(v);
  const stancePill = (v) => pill(stanceLabel(v), v >= 2 ? 'bad' : v >= 1 ? 'warn' : v < 0 ? 'ok' : '');
  const fedVal = (r) => {
    if (r.value == null) return '—';
    if (r.unit === 'bp') return FMT.sbp1(r.value);
    if (r.unit === '$tn') return FMT.tn2(r.value);
    if (r.id === 'tga' || r.id === 'rmp') return FMT.sbn(r.value);
    return FMT.bn1(r.value);
  };
  function drawCorridor() {
    const box = $('#corridor-chart'), tip = $('#corridor-tip');
    if (failed('fed_daily')) return showFail(box);
    const R = rowsOf('fed_rates'); if (!R || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const pts = R.map((r) => ({ ...r, d: parse(r.date) }));
    const L = [['IORB', 'iorb', 'var(--cds-chart-reference)', '4 3', 1.5], ['EFFR', 'effr', dash.colors[0], null, 2], ['SOFR', 'sofr', dash.colors[1], null, 1.75], ['SOFR 99th pct', 'sofr_p99', dash.colors[1], '2 3', 1.25], ['3-month bill', 't3m', dash.colors[2], '6 3', 1.75]];
    $('#corridor-keys').replaceChildren(...[['Target range', 'color-mix(in srgb, var(--cds-chart-muted) 45%, transparent)'], ...L.map((l) => [l[0], l[2]])].map(([t, c]) => { const k = el('span'); const i = el('i'); i.style.background = c; k.append(i, document.createTextNode(t)); return k; }));
    const W = box.clientWidth, H = 300;
    const vals = pts.flatMap((p) => [p.lower, p.upper, p.sofr_p99, p.t3m, p.sofr].filter((v) => v != null));
    const y = d3.scaleLinear([d3.min(vals) - 0.03, d3.max(vals) + 0.03], [H - 24, 10]).nice();
    const svg = svgFor(box, H);
    const ticks = y.ticks(6), ml = textW(svg, ticks.map((t) => d3.format('.2f')(t) + '%')) + 10, mr = 10;
    const x = d3.scaleUtc(d3.extent(pts, (p) => p.d), [ml, W - mr]);
    ticks.forEach((t) => { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)'); svg.append('text').attr('x', ml - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(d3.format('.2f')(t) + '%'); });
    svg.selectAll('text.x').data(x.ticks(W < 520 ? 4 : 8)).join('text').attr('x', x).attr('y', H - 6).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((t) => (t.getUTCMonth() === 0 ? d3.utcFormat('%b %Y')(t) : fMonth(t)));
    svg.append('path').attr('d', d3.area().x((p) => x(p.d)).y0((p) => y(p.lower)).y1((p) => y(p.upper)).curve(d3.curveStepAfter)(pts)).style('fill', 'color-mix(in srgb, var(--cds-chart-muted) 30%, transparent)');
    L.forEach(([, k, c, dashA, w]) => { const s = pts.filter((p) => p[k] != null); svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p[k]))(s)).style('fill', 'none').style('stroke', c).attr('stroke-width', w).attr('stroke-dasharray', dashA).attr('stroke-linejoin', 'round'); });
    const D = rowsOf('fed_decisions') || [];
    D.forEach((dd) => { const dx = x(parse(dd.date)); if (dx < ml || dx > W - mr) return; svg.append('text').attr('x', dx).attr('y', 20).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', dd.decision === 'Hold' ? 'var(--color-fg-muted)' : 'var(--color-fg)').text(dd.decision === 'Hike' ? '▲' : dd.decision === 'Cut' ? '▼' : '•'); });
    const rule = svg.append('line').attr('y1', 10).attr('y2', H - 24).style('stroke', 'var(--cds-chart-axis)').attr('opacity', 0);
    const bis = d3.bisector((p) => p.d).center;
    const f2 = (v) => (v == null ? '—' : d3.format('.2f')(v) + '%');
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (event) => { const [mx] = d3.pointer(event); const p = pts[bis(pts, x.invert(mx))]; rule.attr('x1', x(p.d)).attr('x2', x(p.d)).attr('opacity', .6); tipAt(tip, box, x(p.d), 12, [fDate(p.d), `Range ${f2(p.lower)}–${f2(p.upper)} · IORB ${f2(p.iorb)}`, `EFFR ${f2(p.effr)} (${FMT.sbp(p.effr_iorb)} vs IORB)`, `SOFR ${f2(p.sofr)} (${FMT.sbp(p.sofr_iorb)}), 99th pct ${f2(p.sofr_p99)}`, `3-month bill ${f2(p.t3m)} · 2-year ${f2(p.t2y)}`]); })
      .on('pointerleave', () => { tip.style.opacity = 0; rule.attr('opacity', 0); });
  }
  function miniChart(id, pts, fmt, axisFmt, color) {
    const box = $('#mini-' + id), tip = $('#tip-' + id);
    if (!box || !box.clientWidth || !pts.length) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, H = 170;
    const svg = svgFor(box, H);
    const y = d3.scaleLinear([Math.min(0, d3.min(pts, (p) => p.v)) === 0 && d3.min(pts, (p) => p.v) > d3.max(pts, (p) => p.v) * 0.5 ? d3.min(pts, (p) => p.v) * 0.98 : Math.min(0, d3.min(pts, (p) => p.v)), d3.max(pts, (p) => p.v) * 1.02], [H - 22, 18]).nice(4);
    const ticks = y.ticks(4), ml = textW(svg, ticks.map(axisFmt)) + 8, mr = 8;
    const x = d3.scaleUtc(d3.extent(pts, (p) => p.d), [ml, W - mr]);
    ticks.forEach((t) => { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)'); svg.append('text').attr('x', ml - 6).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(axisFmt(t)); });
    svg.selectAll('text.x').data(x.ticks(3)).join('text').attr('x', x).attr('y', H - 5).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((t) => (t.getUTCMonth() === 0 ? d3.utcFormat('%b %Y')(t) : fMonth(t)));
    svg.append('path').attr('d', d3.area((p) => x(p.d), y(y.domain()[0]), (p) => y(p.v))(pts)).style('fill', color).attr('opacity', 0.12);
    svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p.v))(pts)).style('fill', 'none').style('stroke', color).attr('stroke-width', 1.75).attr('stroke-linejoin', 'round');
    const last = pts[pts.length - 1];
    svg.append('circle').attr('cx', x(last.d)).attr('cy', y(last.v)).attr('r', 3).style('fill', color);
    svg.append('text').attr('x', W - mr).attr('y', 10).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(`${fmt(last.v)} · ${fShort(last.d)}`);
    const bis = d3.bisector((p) => p.d).center;
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (event) => { const [mx] = d3.pointer(event); const p = pts[bis(pts, x.invert(mx))]; tipAt(tip, box, x(p.d), 18, [fDate(p.d), fmt(p.v)]); })
      .on('pointerleave', () => { tip.style.opacity = 0; });
  }
  function drawFedMinis() {
    if (failed('fed_weekly', 'fed_daily')) return $$('#fed-minis .gr-chartbox').forEach(showFail);
    const Wk = rowsOf('fed_week'), R = rowsOf('fed_rates'); if (!Wk || !R) return;
    const wk = (k, f = (v) => v) => Wk.filter((r) => r[k] != null).map((r) => ({ d: parse(r.date), v: f(r[k]) }));
    miniChart('reserves', wk('reserves', (v) => v / 1000), FMT.tn2, (v) => '$' + d3.format('.1f')(v) + 'tn', dash.colors[0]);
    miniChart('tga', wk('tga'), FMT.bn0, (v) => '$' + d3.format(',d')(v), dash.colors[1]);
    miniChart('ust', wk('ust_held', (v) => v / 1000), FMT.tn2, (v) => '$' + d3.format('.2f')(v) + 'tn', dash.colors[2]);
    miniChart('rrp', R.filter((r) => r.rrp != null).map((r) => ({ d: parse(r.date), v: r.rrp })), FMT.bn1, (v) => '$' + d3.format(',d')(v), dash.colors[0]);
    miniChart('srf', wk('srf'), FMT.bn1, (v) => '$' + d3.format(',d')(v), 'var(--cds-chart-status-critical)');
    miniChart('dw', wk('dw'), FMT.bn1, (v) => '$' + d3.format(',d')(v), 'var(--cds-chart-status-critical)');
  }
  function drawFedMonitor() {
    const M = rowsOf('fed_monitor'); if (!M) return;
    $('#fedmon-table tbody').replaceChildren(...M.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      cell(tr, r.indicator, 'strong'); cell(tr, fedVal(r), 'num r'); cell(tr, pill(r.status)); cell(tr, r.detail, 'gr-hide-narrow');
      cell(tr, r.threshold + (r.normal ? ' · normal: ' + r.normal : ''), 'gr-hide-narrow'); cell(tr, r.signals, 'wide gr-hide-narrow'); cell(tr, r.implication, 'wide'); cell(tr, r.action, 'wide');
      return tr;
    }));
  }
  function drawFomc() {
    const F = rowsOf('fomc_reactions'); if (!F) return;
    const bp = (v) => (v == null ? '—' : FMT.sbp(v)), pc = (v) => (v == null ? '—' : FMT.spct2(v));
    $('#fomc-table tbody').replaceChildren(...F.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.date;
      cell(tr, dOrDash(r.date), 'num nowrap'); cell(tr, pill(r.decision + (r.change_bp ? ` ${r.change_bp > 0 ? '+' : '−'}${Math.abs(r.change_bp)}` : ''), r.decision === 'Hike' ? 'bad' : r.decision === 'Cut' ? 'ok' : ''));
      cell(tr, r.range, 'nowrap gr-hide-narrow'); cell(tr, r.vote, 'num'); cell(tr, r.dissents, 'gr-hide-narrow');
      cell(tr, [r.guidance, r.dots, r.balance_sheet].filter(Boolean).join(' · '), 'wide gr-hide-narrow');
      cell(tr, bp(r.d_2y), 'num r'); cell(tr, bp(r.d_10y), 'num r'); cell(tr, pc(r.d_spx), 'num r'); cell(tr, pc(r.d_dxy), 'num r gr-hide-narrow'); cell(tr, pc(r.d_gold), 'num r gr-hide-narrow'); cell(tr, pc(r.d_vix), 'num r gr-hide-narrow');
      cell(tr, link(r), 'gr-hide-narrow');
      return tr;
    }));
  }
  function drawDissent() {
    const box = $('#dissent-chart'), tip = $('#dissent-tip');
    if (failed('fed_decisions')) return showFail(box);
    const F = rowsOf('fomc_reactions'); if (!F || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const rows = [...F].sort((a, b) => (a.date < b.date ? -1 : 1));
    const W = box.clientWidth, H = 240, ml = 28, mr = 8;
    const svg = svgFor(box, H);
    const y = d3.scaleLinear([-3, 3], [H - 30, 14]);
    const x = d3.scaleBand(rows.map((r) => r.date), [ml, W - mr]).padding(0.35);
    [-3, -2, -1, 0, 1, 2, 3].forEach((t) => { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', t === 0 ? 'var(--cds-chart-axis)' : 'var(--cds-chart-grid)'); svg.append('text').attr('x', ml - 6).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(Math.abs(t)); });
    svg.append('text').attr('x', ml + 4).attr('y', 10).style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('Hawkish dissents ↑');
    svg.append('text').attr('x', ml + 4).attr('y', H - 34).style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('Dovish dissents ↓');
    rows.forEach((r) => {
      const bx = x(r.date), bw = x.bandwidth();
      if (r.hawk_dissents) svg.append('rect').attr('x', bx).attr('width', bw).attr('y', y(r.hawk_dissents)).attr('height', y(0) - y(r.hawk_dissents)).attr('rx', 3).style('fill', 'var(--cds-chart-status-critical)');
      if (r.dove_dissents) svg.append('rect').attr('x', bx).attr('width', bw).attr('y', y(0)).attr('height', y(-r.dove_dissents) - y(0)).attr('rx', 3).style('fill', dash.colors[0]);
      svg.append('text').attr('x', bx + bw / 2).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(d3.utcFormat(W < 480 ? '%b' : "%b '%y")(parse(r.date)));
      svg.append('rect').attr('x', bx - 4).attr('width', bw + 8).attr('y', 0).attr('height', H).style('fill', 'transparent')
        .on('pointermove', () => tipAt(tip, box, bx + bw, 20, [`${FMT.date(r.date)} · ${r.decision} · ${r.vote}`, r.dissents]))
        .on('pointerleave', () => { tip.style.opacity = 0; });
    });
  }
  function drawFedPricing() {
    const P = rowsOf('fed_pricing'); if (!P) return;
    $('#fedp-table tbody').replaceChildren(...[...P].sort((a, b) => (a.date < b.date ? 1 : -1) || a.meeting.localeCompare(b.meeting)).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.key;
      cell(tr, FMT.dshort(r.date), 'num'); cell(tr, r.meeting, 'nowrap'); cell(tr, FMT.pct1(r.prob_hike), 'num r'); cell(tr, r.platform); cell(tr, link(r), 'gr-hide-narrow');
      return tr;
    }));
  }
  function drawTone() {
    const box = $('#tone-chart'), tip = $('#tone-tip');
    if (failed('fed_comms')) return showFail(box);
    const C = rowsOf('fed_comms'); if (!C || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, H = 180, ml = 92, mr = 12;
    const svg = svgFor(box, H);
    const pts = C.map((c) => ({ ...c, d: parse(c.date) })).sort((a, b) => a.d - b.d);
    const x = d3.scaleUtc([d3.utcDay.offset(pts[0].d, -5), d3.utcDay.offset(pts[pts.length - 1].d, 5)], [ml, W - mr]);
    const y = d3.scaleLinear([-2.5, 2.5], [H - 22, 8]);
    [-2, -1, 0, 1, 2].forEach((t) => { svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', t === 0 ? 'var(--cds-chart-axis)' : 'var(--cds-chart-grid)'); svg.append('text').attr('x', ml - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(stanceLabel(t)); });
    svg.selectAll('text.x').data(x.ticks(W < 520 ? 3 : 5)).join('text').attr('x', x).attr('y', H - 4).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fShort);
    const seen = {};
    pts.forEach((p) => {
      const k = p.date + '|' + p.stance; seen[k] = (seen[k] || 0) + 1;
      const cx = x(p.d) + (seen[k] - 1) * 9, cy = y(p.stance);
      const c = p.stance >= 2 ? 'var(--cds-chart-status-critical)' : p.stance >= 1 ? dash.colors[2] : p.stance < 0 ? dash.colors[0] : 'var(--cds-chart-muted)';
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 6).style('fill', c).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5)
        .on('pointermove', () => tipAt(tip, box, cx, cy + 8, [`${FMT.date(p.date)} · ${p.speaker} (${p.role})`, `${stanceLabel(p.stance)} · ${p.timing}`, p.summary]))
        .on('pointerleave', () => { tip.style.opacity = 0; });
    });
  }
  function drawComms() {
    const C = rowsOf('fed_comms'); if (!C) return;
    $('#comms-table tbody').replaceChildren(...[...C].sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.key;
      cell(tr, FMT.dshort(r.date), 'num'); cell(tr, r.speaker, 'strong'); cell(tr, r.role, 'nowrap gr-hide-narrow'); cell(tr, stancePill(r.stance)); cell(tr, r.timing, 'nowrap');
      cell(tr, r.summary, 'wide gr-hide-narrow'); cell(tr, link(r), 'gr-hide-narrow');
      return tr;
    }));
  }
  function drawFedScen() {
    const S = rowsOf('fed_scenarios'); if (!S) return;
    $('#fedscen-table tbody').replaceChildren(...[...S].sort((a, b) => a.order - b.order).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      const t = cell(tr, r.scenario, 'strong'); t.title = r.basis; cell(tr, FMT.pctint(r.probability * 100), 'num r'); cell(tr, FMT.sbp(r.shock_2y), 'num r');
      cell(tr, r.signals, 'wide'); cell(tr, r.trade, 'wide');
      return tr;
    }));
  }
  function drawFedBreakdown() {
    const B = rowsOf('fed_breakdown'); if (!B) return;
    const mv = (r, v) => (v == null ? '—' : r.unit === 'bp' ? FMT.sbp1(v) : FMT.spct2(v));
    $('#fedbd-table tbody').replaceChildren(...B.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.asset;
      cell(tr, r.asset, 'strong'); cell(tr, mv(r, r.beta_10bp), 'num r gr-hide-narrow');
      ['hike', 'hawkish_hold', 'neutral_hold', 'dovish_hold'].forEach((k) => cell(tr, mv(r, r[k]), 'num r'));
      const e = cell(tr, mv(r, r.expected), 'num r'); e.style.fontWeight = '500';
      cell(tr, pill(r.agree, r.agree === 'No' ? 'warn' : ''), 'gr-hide-narrow');
      return tr;
    }));
  }
  function drawFedBetas() {
    const B = rowsOf('fed_betas'); if (!B) return;
    const mv = (r, v) => (v == null ? '—' : r.unit === 'bp' ? FMT.sbp1(v) : FMT.spct2(v));
    $('#fedbeta-table tbody').replaceChildren(...B.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.asset;
      cell(tr, r.asset, 'strong'); cell(tr, mv(r, r.beta_10bp), 'num r'); cell(tr, mv(r, r.event_beta_10bp) + ` (n=${r.event_n})`, 'num r');
      cell(tr, pill(r.agree, r.agree === 'No' ? 'warn' : '')); cell(tr, FMT.s2(r.corr), 'num r gr-hide-narrow');
      cell(tr, r.fomc_abs == null ? '—' : (r.unit === 'bp' ? d3.format('.1f')(r.fomc_abs) + ' bp' : d3.format('.2f')(r.fomc_abs) + '%'), 'num r');
      return tr;
    }));
  }

  /* ================= GEOPOLITICS ================= */
  const SER = {
    Composite: { label: 'Stress composite', fmt: (v) => d3.format('d')(v), axis: (v) => d3.format('d')(v) },
    Brent: { label: 'Brent', fmt: FMT.usd2, axis: (v) => '$' + d3.format('d')(v) },
    'UST 10Y': { label: '10Y yield', fmt: FMT.pct2, axis: (v) => d3.format('.1f')(v) + '%' },
    MOVE: { label: 'MOVE', fmt: FMT.num2, axis: (v) => d3.format('d')(v) },
    VIX: { label: 'VIX', fmt: FMT.num2, axis: (v) => d3.format('d')(v) },
    'HY OAS': { label: 'HY spread', fmt: FMT.pct2, axis: (v) => d3.format('.1f')(v) + '%' },
    'S&P 500': { label: 'S&P 500', fmt: FMT.num2, axis: (v) => d3.format(',')(v) },
    Gold: { label: 'Gold', fmt: FMT.usd2, axis: (v) => '$' + d3.format(',')(v) },
    DXY: { label: 'Dollar index', fmt: FMT.num2, axis: (v) => d3.format('d')(v) },
    TAIEX: { label: 'TAIEX', fmt: FMT.num2, axis: (v) => d3.format(',')(v) },
    Bovespa: { label: 'Bovespa', fmt: FMT.int, axis: (v) => d3.format('.2s')(v) },
    'USD/MXN': { label: 'USD/MXN', fmt: FMT.num3, axis: (v) => d3.format('.1f')(v) },
  };
  let evSeries = 'Composite';
  const evSeg = $('#ev-seg');
  Object.keys(SER).forEach((k) => { const b = el('button', null, SER[k].label); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => { evSeries = k; drawEvent(); }); evSeg.appendChild(b); });
  function drawEvent() {
    pressSeg(evSeg, evSeries);
    const box = $('#ev-chart'), tip = $('#ev-tip'), list = $('#ev-list');
    if (failed('markets', 'catalysts')) return showFail(box);
    const M = rowsOf('markets'), S = rowsOf('stress'), C = rowsOf('catalysts');
    if (!M || !S || !C || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const pts = (evSeries === 'Composite' ? S.map((r) => ({ d: parse(r.date), v: +r.composite }))
      : M.filter((r) => r.series === evSeries).map((r) => ({ d: parse(String(r.date).slice(0, 10)), v: +r.value }))).sort((a, b) => a.d - b.d);
    const events = C.filter((r) => r.marker === true || r.marker === 'true').map((r) => ({ ...r, d: parse(r.date) })).sort((a, b) => a.d - b.d);
    const W = box.clientWidth, H = 300;
    const y = d3.scaleLinear(evSeries === 'Composite' ? [0, 100] : d3.extent(pts, (p) => p.v), [H - 24, 30]).nice(5);
    const ticks = y.ticks(5);
    const svg = svgFor(box, H);
    const m = { l: textW(svg, ticks.map(SER[evSeries].axis)) + 10, r: 12 };
    const x = d3.scaleUtc(d3.extent(pts, (p) => p.d), [m.l, W - m.r]);
    svg.selectAll('line.g').data(ticks).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.selectAll('text.y').data(ticks).join('text').attr('x', m.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(SER[evSeries].axis);
    svg.selectAll('text.x').data(x.ticks(W < 520 ? 4 : 8)).join('text').attr('x', x).attr('y', H - 6).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((t) => (t.getUTCMonth() === 0 ? d3.utcFormat('%b %Y')(t) : fMonth(t)));
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', H - 24).attr('y2', H - 24).style('stroke', 'var(--cds-chart-axis)');
    events.forEach((e, i) => {
      const ex = x(e.d); if (ex < m.l || ex > W - m.r) return;
      const ring = e.direction === 1 ? 'var(--cds-chart-status-critical)' : 'var(--cds-chart-reference)';
      svg.append('line').attr('x1', ex).attr('x2', ex).attr('y1', 22).attr('y2', H - 24).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '3 3');
      const yy = i % 2 ? 10 : 20;
      svg.append('circle').attr('cx', ex).attr('cy', yy).attr('r', 7).style('fill', 'var(--color-panel)').style('stroke', ring);
      svg.append('text').attr('x', ex).attr('y', yy).attr('dy', '0.34em').attr('text-anchor', 'middle').style('font-size', '9px').style('fill', 'var(--color-fg)').text(i + 1);
    });
    const lg = svg.append('defs').append('linearGradient').attr('id', 'evgrad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    [[0, .26], [.25, .16], [.5, .08], [.75, .03], [1, 0]].forEach(([o, a]) => lg.append('stop').attr('offset', o).attr('style', `stop-color:${dash.colors[0]};stop-opacity:${a}`));
    svg.append('path').attr('d', d3.area((p) => x(p.d), H - 24, (p) => y(p.v))(pts)).style('fill', 'url(#evgrad)');
    svg.append('path').attr('d', d3.line((p) => x(p.d), (p) => y(p.v))(pts)).style('fill', 'none').style('stroke', dash.colors[0]).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    const last = pts[pts.length - 1];
    svg.append('circle').attr('cx', x(last.d)).attr('cy', y(last.v)).attr('r', 3).style('fill', dash.colors[0]);
    const dot = svg.append('circle').attr('r', 4).style('fill', dash.colors[0]).attr('opacity', 0);
    const rule = svg.append('line').attr('y1', 26).attr('y2', H - 24).style('stroke', 'var(--cds-chart-axis)').attr('opacity', 0);
    const bis = d3.bisector((p) => p.d).center;
    svg.append('rect').attr('x', m.l).attr('y', 0).attr('width', W - m.l - m.r).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (event) => {
        const [mx] = d3.pointer(event); const p = pts[bis(pts, x.invert(mx))];
        dot.attr('cx', x(p.d)).attr('cy', y(p.v)).attr('opacity', 1); rule.attr('x1', x(p.d)).attr('x2', x(p.d)).attr('opacity', .6);
        const near = events.filter((e) => abs(e.d - p.d) <= 2 * 864e5).map((e) => '● ' + e.title);
        tipAt(tip, box, x(p.d), 30, [fDate(p.d), `${SER[evSeries].label}: ${SER[evSeries].fmt(p.v)}`, ...near]);
      })
      .on('pointerleave', () => { tip.style.opacity = 0; dot.attr('opacity', 0); rule.attr('opacity', 0); });
    list.replaceChildren(...events.map((e, i) => {
      const li = el('li'); const n = el('span', 'num' + (e.direction === 1 ? ' esc' : ''), String(i + 1));
      li.append(n, el('span', null, `${e.short} · ${fShort(e.d)}`)); return li;
    }));
  }
  function drawTop() {
    const box = $('#top-list');
    if (failed('catalysts')) return showFail(box);
    const C = rowsOf('catalysts'); if (!C) return;
    const top = C.filter((r) => !r.marker && +r.analyst_risk >= 4).sort((a, b) => b.analyst_risk - a.analyst_risk || (a.date < b.date ? 1 : -1));
    box.replaceChildren(...top.map((r) => {
      const d = el('div', 'gr-topitem' + (+r.analyst_risk < 5 ? ' lvl4' : ''));
      d.append(el('div', 'tt', r.title), el('div', 'dd', `${r.region} · ${r.status} · risk ${r.analyst_risk}/5 · ${fShort(parse(r.date))}`), el('div', 'dd', r.detail));
      return d;
    }));
  }
  let catRegion = 'All', catLog = false, catQ = '', catSort = { k: 'analyst_risk', dir: -1 };
  const catSeg = $('#cat-seg');
  $('#cat-search').addEventListener('input', (e) => { catQ = e.target.value.toLowerCase(); drawCatTable(); });
  $$('#cat-table th button').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.sort; catSort = { k, dir: catSort.k === k ? -catSort.dir : (k === 'analyst_risk' ? -1 : 1) }; drawCatTable(); }));
  function drawCatTable() {
    const C = rowsOf('catalysts'); if (!C) return;
    if (!catSeg.childElementCount) {
      ['All', ...Array.from(new Set(C.map((r) => r.region)))].forEach((t) => { const b = el('button', null, t); b.type = 'button'; b.dataset.k = t; b.addEventListener('click', () => { catRegion = t; drawCatTable(); }); catSeg.appendChild(b); });
      const lb = el('button', null, 'Event log'); lb.type = 'button'; lb.dataset.k = '__log'; lb.addEventListener('click', () => { catLog = !catLog; drawCatTable(); }); catSeg.appendChild(lb);
    }
    $$('button', catSeg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === '__log' ? catLog : b.dataset.k === catRegion));
    let rows = C.filter((r) => !!r.marker === catLog && (catRegion === 'All' || r.region === catRegion));
    if (catQ) rows = rows.filter((r) => [r.title, r.detail, r.assets, r.region, r.status].join(' ').toLowerCase().includes(catQ));
    const { k, dir } = catSort;
    rows.sort((a, b) => { const va = a[k] ?? -1, vb = b[k] ?? -1; return (va < vb ? -1 : va > vb ? 1 : 0) * dir || (a.date < b.date ? 1 : -1); });
    $$('#cat-table th').forEach((th) => { const b = th.querySelector('button'); th.setAttribute('aria-sort', b && b.dataset.sort === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'); });
    $('#cat-table tbody').replaceChildren(...rows.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      cell(tr, dOrDash(r.date), 'num'); cell(tr, r.title, 'strong'); cell(tr, r.region, 'nowrap gr-hide-narrow');
      cell(tr, pill(r.status)); cell(tr, riskCell(r.analyst_risk), 'num');
      cell(tr, r.detail, 'wide gr-hide-narrow'); cell(tr, r.assets, 'gr-hide-narrow'); cell(tr, link(r));
      return tr;
    }));
  }
  function drawPremium() {
    const P = rowsOf('premium'); if (!P) return;
    $('#prem-table tbody').replaceChildren(...[...P].reverse().map((r) => {
      const tr = el('tr'); tr.dataset.key = r.date;
      cell(tr, FMT.dshort(r.date), 'num'); cell(tr, FMT.usd2(r.dated), 'num r'); cell(tr, FMT.usd2(r.futures), 'num r'); cell(tr, FMT.usd2(r.premium), 'num r tone-warn');
      return tr;
    }));
  }
  function drawGpr() {
    const box = $('#gpr-chart'), tip = $('#gpr-tip');
    if (failed('gpr')) return showFail(box);
    const G = rowsOf('gpr'), st = rowsOf('gpr_stats'); if (!G || !st || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, H = 180;
    const s = G.map((r) => ({ d: parse(String(r.date).slice(0, 10)), v: +r.gpr })).sort((a, b) => a.d - b.d);
    const mean = st[0].mean;
    const svg = svgFor(box, H);
    const y = d3.scaleLinear([0, d3.max(s, (p) => p.v)], [H - 22, 8]).nice(4);
    const ml = textW(svg, y.ticks(4).map(d3.format('d'))) + 8;
    const x = d3.scaleBand(s.map((p) => +p.d), [ml, W - 4]).padding(0.25);
    svg.selectAll('line.g').data(y.ticks(4)).join('line').attr('x1', ml).attr('x2', W - 4).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.selectAll('text.y').data(y.ticks(4)).join('text').attr('x', ml - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text(d3.format('d'));
    svg.append('line').attr('x1', ml).attr('x2', W - 4).attr('y1', y(mean)).attr('y2', y(mean)).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
    svg.selectAll('rect.b').data(s).join('rect').attr('x', (p) => x(+p.d)).attr('width', x.bandwidth()).attr('y', (p) => y(p.v)).attr('height', (p) => y(0) - y(p.v)).attr('rx', Math.min(3, x.bandwidth() / 2))
      .style('fill', (p) => (p.v > mean ? dash.colors[0] : 'var(--cds-chart-muted)'))
      .on('pointermove', (event, p) => tipAt(tip, box, x(+p.d) + x.bandwidth(), 8, [fDate(p.d), 'GPR ' + d3.format('.1f')(p.v)]))
      .on('pointerleave', () => { tip.style.opacity = 0; });
    const ft = s.filter((p, i) => i % (W < 420 ? 10 : 5) === 0);
    svg.selectAll('text.x').data(ft).join('text').attr('x', (p) => x(+p.d) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text((p) => fShort(p.d));
  }
  function drawOdds() {
    const box = $('#odds-chart'), tip = $('#odds-tip');
    if (failed('predictions')) return showFail(box);
    const O = rowsOf('odds_shift'); if (!O || !box.clientWidth) return;
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth, H = 150, ml = 64, mr = 16;
    const svg = svgFor(box, H);
    const x = d3.scaleLinear([0, 100], [ml, W - mr]);
    const y = d3.scaleBand(O.map((r) => r.market), [22, H - 26]).padding(0.4);
    svg.selectAll('line.g').data([0, 25, 50, 75, 100]).join('line').attr('x1', x).attr('x2', x).attr('y1', 16).attr('y2', H - 22).style('stroke', (t) => (t === 50 ? 'var(--cds-chart-reference)' : 'var(--cds-chart-grid)')).attr('stroke-dasharray', (t) => (t === 50 ? '3 3' : null));
    svg.selectAll('text.x').data([0, 25, 50, 75, 100]).join('text').attr('x', x).attr('y', H - 6).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text((t) => t + '%');
    O.forEach((r) => {
      const cy = y(r.market) + y.bandwidth() / 2;
      svg.append('text').attr('x', 0).attr('y', cy).attr('dy', '0.32em').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(r.market.replace(' control', ''));
      svg.append('line').attr('x1', x(r.march)).attr('x2', x(r.october)).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 3).attr('stroke-linecap', 'round');
      svg.append('circle').attr('cx', x(r.march)).attr('cy', cy).attr('r', 5).style('fill', 'var(--color-panel)').style('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 2);
      svg.append('circle').attr('cx', x(r.october)).attr('cy', cy).attr('r', 6).style('fill', dash.colors[0]);
      svg.append('text').attr('x', x(r.october)).attr('y', cy - 12).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg)').text(d3.format('.1f')(r.october) + '%');
      svg.append('rect').attr('x', ml).attr('y', y(r.market)).attr('width', W - ml - mr).attr('height', y.bandwidth()).style('fill', 'transparent')
        .on('pointermove', (event) => { const [mx] = d3.pointer(event); tipAt(tip, box, mx, y(r.market) + y.bandwidth(), [r.market + ', Democrats', `24 Mar: ${d3.format('.1f')(r.march)}%`, `10 Oct: ${d3.format('.1f')(r.october)}%`]); })
        .on('pointerleave', () => { tip.style.opacity = 0; });
    });
    svg.append('text').attr('x', W - mr).attr('y', 10).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').style('fill', 'var(--color-fg-muted)').text('○ March  ● October');
  }

  /* ================= POLICY ================= */
  function drawWashington() {
    const Wd = rowsOf('washington'); if (!Wd) return;
    $$('#policy table[data-branch]').forEach((t) => {
      const br = t.dataset.branch;
      const rows = Wd.filter((r) => r.branch === br).sort((a, b) => String(b.last_action || b.next_date).localeCompare(String(a.last_action || a.next_date)));
      t.querySelector('tbody').replaceChildren(...rows.map((r) => {
        const tr = el('tr'); tr.dataset.key = r.id;
        if (br === 'Agency') cell(tr, r.body, 'nowrap');
        cell(tr, r.item, 'strong'); cell(tr, pill(r.status)); cell(tr, dOrDash(r.last_action), 'num'); cell(tr, dOrDash(r.next_date), 'num');
        cell(tr, r.relevance, 'wide gr-hide-narrow');
        if (br !== 'Agency') cell(tr, r.assets, 'gr-hide-narrow');
        cell(tr, link(r));
        return tr;
      }));
    });
  }
  let regJ = 'All';
  const regSeg = $('#reg-seg');
  ['All', 'US', 'EU'].forEach((k) => { const b = el('button', null, k === 'All' ? 'US + EU' : k); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => { regJ = k; drawReg(); }); regSeg.appendChild(b); });
  const stagePill = (s) => el('span', 'gr-pill ' + (/Adopted|In force|Active|Delegated/.test(s) ? 'warn' : /Stalled|Lifted/.test(s) ? '' : 'ok'), s);
  function drawReg() {
    const R = rowsOf('regulation'); if (!R) return;
    pressSeg(regSeg, regJ);
    const kids = [el('div', 'mh', 'Sector'), el('div', 'mh', 'United States'), el('div', 'mh', 'European Union')];
    Array.from(new Set(R.map((r) => r.sector))).forEach((s) => {
      kids.push(el('div', 'ms', s));
      ['US', 'EU'].forEach((j) => {
        const c = el('div');
        const items = R.filter((r) => r.sector === s && r.jurisdiction === j);
        if (!items.length) { const e = el('div', 'mi', '—'); e.style.color = 'var(--color-fg-muted)'; c.appendChild(e); }
        items.forEach((r) => { const i = el('div', 'mi'); i.append(stagePill(r.stage), document.createTextNode(r.measure)); c.appendChild(i); });
        kids.push(c);
      });
    });
    $('#reg-matrix').replaceChildren(...kids);
    const rows = R.filter((r) => regJ === 'All' || r.jurisdiction === regJ).sort((a, b) => a.sector.localeCompare(b.sector) || a.jurisdiction.localeCompare(b.jurisdiction));
    $('#reg-table tbody').replaceChildren(...rows.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      cell(tr, r.jurisdiction, 'nowrap'); cell(tr, r.sector, 'nowrap'); cell(tr, r.measure, 'strong'); cell(tr, stagePill(r.stage)); cell(tr, dOrDash(r.key_date), 'num');
      cell(tr, r.summary, 'wide gr-hide-narrow'); cell(tr, r.market_impact, 'wide gr-hide-narrow'); cell(tr, link(r));
      return tr;
    }));
  }

  /* ================= CALENDAR ================= */
  let calType = 'All';
  const calSeg = $('#cal-seg');
  function drawCal() {
    const K = rowsOf('calendar'); if (!K) return;
    segButtons(calSeg, ['All', ...Array.from(new Set(K.map((r) => r.type)))], null, (t) => { calType = t; drawCal(); });
    pressSeg(calSeg, calType);
    const rows = K.filter((r) => calType === 'All' || r.type === calType).sort((a, b) => a.date.localeCompare(b.date));
    $('#cal-table tbody').replaceChildren(...rows.map((r) => {
      const tr = el('tr'); tr.dataset.key = r.key;
      cell(tr, FMT.date(r.date), 'num'); cell(tr, r.event, 'strong'); cell(tr, pill(r.type)); cell(tr, r.assets, 'gr-hide-narrow'); cell(tr, link(r));
      return tr;
    }));
  }

  /* ================= METHOD & ROADMAP ================= */
  let rmStatus = 'All';
  function drawRoadmap() {
    const R = rowsOf('roadmap'); if (!R) return;
    const seg = $('#rm-seg');
    segButtons(seg, ['All', ...STATUS.map((s) => s[0])], null, (k) => { rmStatus = k; drawRoadmap(); });
    pressSeg(seg, rmStatus);
    $('#rm-table tbody').replaceChildren(...R.filter((r) => rmStatus === 'All' || r.status === rmStatus).sort((a, b) => a.order - b.order).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.id;
      cell(tr, r.deliverable, 'strong'); cell(tr, pill(r.status)); cell(tr, r.audience, 'nowrap gr-hide-narrow'); cell(tr, r.desk, 'nowrap gr-hide-narrow');
      cell(tr, r.detail, 'wide gr-hide-narrow'); cell(tr, r.next_step, 'wide');
      return tr;
    }));
  }
  let covDesk = 'All';
  function drawCoverage() {
    const Lt = rowsOf('latest'); if (!Lt) return;
    const seg = $('#cov-seg');
    segButtons(seg, ['All', 'Equities', 'Rates', 'Credit', 'Energy', 'Metals & Ags', 'FX', 'Volatility'], null, (k) => { covDesk = k; drawCoverage(); });
    pressSeg(seg, covDesk);
    $('#cov-table tbody').replaceChildren(...Lt.filter((r) => covDesk === 'All' || r.desk === covDesk).sort((a, b) => a.desk.localeCompare(b.desk) || a.series.localeCompare(b.series)).map((r) => {
      const tr = el('tr'); tr.dataset.key = r.series;
      cell(tr, r.series, 'strong'); cell(tr, r.desk, 'nowrap'); cell(tr, r.ticker, 'nowrap gr-hide-narrow'); cell(tr, r.source, 'gr-hide-narrow');
      cell(tr, dOrDash(r.start), 'num gr-hide-narrow'); cell(tr, dOrDash(r.date), 'num'); cell(tr, String(r.n_obs), 'num r gr-hide-narrow');
      return tr;
    }));
  }
  const HCOLS = [['hormuz', 'Hormuz / Iran'], ['trade', 'Trade'], ['fed_fiscal', 'Fed & fiscal'], ['us_politics', 'US politics'], ['russia_europe', 'Russia & EU'], ['tech_controls', 'Tech controls'], ['asia', 'Asia flashpoints'], ['africa', 'Africa supply'], ['latam', 'Latin America']];
  function drawHeat() {
    const box = $('#heat'), tip = $('#heat-tip');
    if (failed('framework')) return showFail(box);
    const F = rowsOf('framework'); if (!F) return;
    const kids = [el('div', 'hc hh', '')];
    HCOLS.forEach(([, l]) => kids.push(el('div', 'hc hh', l)));
    F.forEach((r) => {
      kids.push(el('div', 'hc hr', r.asset_class));
      HCOLS.forEach(([k, l]) => {
        const v = +r[k];
        const c = el('div', 'hc hv', String(v));
        c.style.background = `color-mix(in srgb, var(--cds-chart-status-critical) ${[4, 22, 45, 75][v]}%, var(--color-panel))`;
        if (v === 3) c.style.color = 'var(--color-bg)';
        c.addEventListener('pointerenter', () => { const pr = box.getBoundingClientRect(), cr = c.getBoundingClientRect(); tipAt(tip, box, cr.left - pr.left, cr.bottom - pr.top + 4, [`${r.asset_class} × ${l}: ${v}/3`, r.transmission]); });
        c.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
        kids.push(c);
      });
    });
    box.replaceChildren(tip, ...kids);
  }

  /* ================= TABS ================= */
  const tabs = $$('.gr-tab'), pages = $$('.gr-page');
  let current = 'brief';
  function show(id, setLink) {
    current = id;
    pages.forEach((p) => { p.hidden = p.id !== id; });
    tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === id));
    if (setLink) dash.setLink(id === 'desks' ? 'desk-' + curDesk : id);
    render();
  }
  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab, true)));
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => { show(b.dataset.goto, true); document.getElementById('top').scrollIntoView(); }));
  pickDesk('equities');

  function render() {
    refreshMeta();
    fillMarks();
    const page = document.getElementById(current);
    if (current === 'brief') { drawSparks(page); drawIdeas(); drawMovers(); drawUpcoming(); drawDeskCards(); drawHeadway(); drawRegionTable(); }
    if (current === 'signals') { drawGapChart(); drawSigTable(); drawGapBars(); drawHedgeBars(); drawBacktest(); drawAnalogs(); drawAnalogEvents(); drawEventTable(); drawScenarios(); drawPlay(); }
    if (current === 'shocks') { drawMatrix(); drawSim(); drawTrShock(); drawCombo(); }
    if (current === 'desks') drawDesk();
    if (current === 'fed') { drawCorridor(); drawFedMonitor(); drawFedMinis(); drawFomc(); drawDissent(); drawFedPricing(); drawTone(); drawComms(); drawFedScen(); drawFedBreakdown(); drawFedBetas(); }
    if (current === 'geo') { drawEvent(); drawTop(); drawCatTable(); drawSparks(page); drawPremium(); drawGpr(); drawOdds(); }
    if (current === 'policy') { drawWashington(); drawReg(); }
    if (current === 'calendar') drawCal();
    if (current === 'method') { drawRoadmap(); drawHeat(); drawCoverage(); }
  }

  let linked = false;
  dash.onData(() => {
    if (!linked) {
      linked = true;
      const named = location.hash.slice(1);
      if (named.startsWith('desk-')) { pickDesk(named.slice(5)); show('desks', false); return; }
      if (pages.some((p) => p.id === named)) { show(named, false); return; }
    }
    render();
  });
})();
