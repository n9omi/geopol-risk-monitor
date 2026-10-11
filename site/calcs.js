/* ---------- Calculations (visible to readers in Sources) ---------- */
dash.calc('universe', {
  inputs: ['markets', 'desk', 'fed_daily'],
  title: 'Series universe: core markets, desk data and derived spreads',
  description: 'All daily series in one table with their desk and change convention (price = log %, rate = basis points, level = absolute), including the 2-year Treasury par yield. Derived daily: 3-2-1 crack = (2 × RBOB × 42 + ULSD × 42 − 3 × WTI) ÷ 3; diesel crack = ULSD × 42 − WTI; Brent–WTI; VIX ÷ VIX 3-month; 3m10y = 10-year − 3-month yield; 5s30s = 30-year − 5-year; CCC–BBB OAS; ITA ÷ JETS; XLE and SMH relative to the S&P 500 (×1000).',
  fn: (markets, desk, fed_daily) => {
    const MDESK = { Brent: 'Energy', 'UST 10Y': 'Rates', MOVE: 'Volatility', VIX: 'Volatility', 'HY OAS': 'Credit', 'S&P 500': 'Equities', Gold: 'Metals & Ags', DXY: 'FX', TAIEX: 'Equities', 'USD/TWD': 'FX', 'USD/KRW': 'FX', 'USD/INR': 'FX', 'USD/ZAR': 'FX', Copper: 'Metals & Ags', Cocoa: 'Metals & Ags', Bovespa: 'Equities', 'USD/BRL': 'FX', 'USD/MXN': 'FX', 'USD/COP': 'FX' };
    const rows = [];
    markets.forEach((r) => rows.push({ date: String(r.date).slice(0, 10), series: r.series, value: Number(r.value), unit: r.unit, desk: MDESK[r.series] || 'Other', kind: ['UST 10Y', 'HY OAS'].includes(r.series) ? 'rate' : 'price', ticker: r.ticker, source: r.source }));
    desk.forEach((r) => rows.push({ date: String(r.date).slice(0, 10), series: r.series, value: Number(r.value), unit: r.unit, desk: r.desk, kind: r.kind, ticker: r.ticker, source: r.source }));
    fed_daily.filter((r) => r.series === 'Treasury 2Y').forEach((r) => rows.push({ date: r.date, series: 'Treasury 2Y', value: Number(r.value), unit: '%', desk: 'Rates', kind: 'rate', ticker: 'DGS2 (par curve)', source: 'US Treasury' }));
    const by = d3.group(rows, (r) => r.series);
    const mapOf = (s) => new Map((by.get(s) || []).map((r) => [r.date, r.value]));
    const derive = (series, inputs, f, unit, deskName, kind, round) => {
      const maps = inputs.map(mapOf);
      Array.from(maps[0].keys()).filter((d) => maps.every((mm) => mm.has(d))).sort().forEach((d) => {
        rows.push({ date: d, series, value: Math.round(f(...maps.map((mm) => mm.get(d))) * round) / round, unit, desk: deskName, kind, ticker: 'Derived', source: 'Calculated from ' + inputs.join(', ') });
      });
    };
    derive('3-2-1 crack', ['RBOB', 'ULSD', 'WTI'], (rb, ho, wti) => (2 * rb * 42 + ho * 42 - 3 * wti) / 3, '$/bbl', 'Energy', 'level', 100);
    derive('Diesel crack', ['ULSD', 'WTI'], (ho, wti) => ho * 42 - wti, '$/bbl', 'Energy', 'level', 100);
    derive('Brent–WTI', ['Brent', 'WTI'], (b, w) => b - w, '$/bbl', 'Energy', 'level', 100);
    derive('VIX / VIX 3M', ['VIX', 'VIX 3M'], (a, b) => a / b, 'ratio', 'Volatility', 'level', 1000);
    derive('3m10y', ['UST 10Y', 'UST 3M'], (a, b) => a - b, '%', 'Rates', 'rate', 1000);
    derive('5s30s', ['UST 30Y', 'UST 5Y'], (a, b) => a - b, '%', 'Rates', 'rate', 1000);
    derive('CCC–BBB', ['CCC OAS', 'BBB OAS'], (a, b) => a - b, '%', 'Credit', 'rate', 100);
    derive('ITA / JETS', ['ITA', 'JETS'], (a, b) => a / b, 'ratio', 'Equities', 'price', 10000);
    derive('XLE / S&P 500', ['XLE', 'S&P 500'], (a, b) => (a / b) * 1000, 'ratio ×1000', 'Equities', 'price', 10000);
    derive('SMH / S&P 500', ['SMH', 'S&P 500'], (a, b) => (a / b) * 1000, 'ratio ×1000', 'Equities', 'price', 10000);
    return rows;
  },
});

dash.calc('latest', {
  inputs: ['universe'],
  title: 'Latest readings, changes and momentum',
  description: 'Per series: last close; changes over 5 and 21 trading days and since 27 Feb 2026 (last close before the Iran war), in log % for prices, bp for yields and spreads, absolute for levels (cracks, ratios); also simple % changes; percentile rank of the last close within its window (one year for core series, since 3 Nov 2025 for desk series); 20-day momentum z = 20-day change ÷ (daily st. dev. × √20); 5-day z likewise.',
  fn: (universe) => {
    const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
    return Array.from(d3.group(universe, (r) => r.series), ([series, rows]) => {
      const k = rows[0].kind;
      const s = rows.map((r) => ({ date: r.date, value: r.value })).sort((a, b) => (a.date < b.date ? -1 : 1));
      const n = s.length - 1, last = s[n], m1 = s[Math.max(0, n - 21)], m20 = s[Math.max(0, n - 20)], w5 = s[Math.max(0, n - 5)];
      const pre = s.filter((r) => r.date <= '2026-02-27').pop() || s[0];
      const chg = (a, b) => (k === 'rate' ? (a - b) * 100 : k === 'level' ? a - b : Math.log(a / b) * 100);
      const pc = (a, b) => (a > 0 && b > 0 ? r1((a / b - 1) * 100) : null);
      const daily = s.slice(1).map((p, i) => chg(p.value, s[i].value));
      const sd = d3.deviation(daily);
      const vals = s.map((r) => r.value);
      const below = vals.filter((v) => v < last.value).length;
      const rr = k === 'level' ? (x) => Math.round(x * 1000) / 1000 : r2;
      return {
        series, desk: rows[0].desk, kind: k, unit: rows[0].unit, ticker: rows[0].ticker, source: rows[0].source, start: s[0].date, n_obs: s.length,
        date: last.date, value: last.value,
        chg_5d: rr(chg(last.value, w5.value)), z_5d: r2(chg(last.value, w5.value) / (sd * Math.sqrt(5))),
        chg_1m: rr(chg(last.value, m1.value)), chg_prewar: rr(chg(last.value, pre.value)),
        chg_1m_pct: pc(last.value, m1.value), chg_1m_bp: Math.round((last.value - m1.value) * 100),
        prewar_value: pre.value, chg_prewar_pct: pc(last.value, pre.value), chg_prewar_bp: Math.round((last.value - pre.value) * 100),
        pct_rank: Math.round((below / (vals.length - 1)) * 100),
        mom_z20: r2(chg(last.value, m20.value) / (sd * Math.sqrt(20))),
        daily_sd: Math.round(sd * 10000) / 10000,
        low: d3.min(vals), high: d3.max(vals),
      };
    });
  },
});

dash.calc('stress', {
  inputs: ['markets'],
  title: 'Stress composite and pricing gap',
  description: 'Each day all five have a close: one-year percentile ranks (0 = year low, 100 = year high) of Brent, 10-year yield, MOVE, VIX and HY OAS. Composite = average of all five. Pricing gap = average of the shock channels (Brent, 10-year, MOVE) minus the VIX percentile (how much of the shock equity volatility prices).',
  fn: (markets) => {
    const keys = ['Brent', 'UST 10Y', 'MOVE', 'VIX', 'HY OAS'];
    const sorted = {}, byDate = {};
    keys.forEach((k) => {
      const rows = markets.filter((r) => r.series === k);
      sorted[k] = rows.map((r) => Number(r.value)).sort(d3.ascending);
      byDate[k] = new Map(rows.map((r) => [String(r.date).slice(0, 10), Number(r.value)]));
    });
    const rank = (k, v) => (d3.bisectLeft(sorted[k], v) / (sorted[k].length - 1)) * 100;
    const dates = Array.from(byDate.Brent.keys()).filter((d) => keys.every((k) => byDate[k].has(d))).sort();
    return dates.map((date) => {
      const [brent, ust10y, move, vix, hy] = keys.map((k) => rank(k, byDate[k].get(date)));
      const shock = (brent + ust10y + move) / 3, appetite = (vix + hy) / 2;
      return { date, composite: Math.round((brent + ust10y + move + vix + hy) / 5), brent: Math.round(brent), ust10y: Math.round(ust10y), move: Math.round(move), vix: Math.round(vix), hy: Math.round(hy), shock: Math.round(shock), appetite: Math.round(appetite), gap: Math.round(shock - vix) };
    });
  },
});

dash.calc('stress_latest', {
  inputs: ['stress'],
  title: 'Regime read, latest',
  description: 'Latest stress composite and pricing gap, their change over 20 trading days, the gap\'s percentile within its own history, and rule-based labels: composite ≥ 70 Stressed, ≥ 45 Elevated, else Calm; gap ≥ 40 equity vol cheap vs the shock, ≤ −10 equity vol rich, else aligned.',
  fn: (stress) => {
    const n = stress.length - 1, last = stress[n], prev = stress[Math.max(0, n - 20)];
    const gaps = stress.map((r) => r.gap).sort((a, b) => a - b);
    return {
      date: last.date, composite: last.composite, composite_chg20: last.composite - prev.composite,
      gap: last.gap, gap_chg20: last.gap - prev.gap, shock: last.shock, appetite: last.appetite,
      gap_pct: Math.round((gaps.filter((g) => g < last.gap).length / (gaps.length - 1)) * 100),
      regime: last.composite >= 70 ? 'Stressed' : last.composite >= 45 ? 'Elevated' : 'Calm',
      gap_read: last.gap >= 40 ? 'Equity vol cheap vs the shock' : last.gap <= -10 ? 'Equity vol rich vs the shock' : 'Equity vol and shock aligned',
      vix: last.vix, hy: last.hy,
    };
  },
});

dash.calc('gap_backtest', {
  inputs: ['stress', 'markets'],
  title: 'Pricing-gap backtest (in-sample)',
  description: 'For every day with a stress reading: VIX change in points and S&P 500 log % return over the next 10 trading days, grouped by the pricing gap that day (wide ≥ 50, moderate 25–49, narrow < 25). Overlapping windows within one year of data — evidence, not proof.',
  fn: (stress, markets) => {
    const mk = (s) => new Map(markets.filter((r) => r.series === s).map((r) => [String(r.date).slice(0, 10), Number(r.value)]));
    const vix = mk('VIX'), spx = mk('S&P 500');
    const S = [...stress].sort((a, b) => (a.date < b.date ? -1 : 1));
    const obs = [];
    for (let i = 0; i + 10 < S.length; i++) {
      const a = S[i].date, b = S[i + 10].date;
      if (!vix.has(a) || !vix.has(b) || !spx.has(a) || !spx.has(b)) continue;
      obs.push({ gap: S[i].gap, dv: vix.get(b) - vix.get(a), rs: Math.log(spx.get(b) / spx.get(a)) * 100 });
    }
    const B = [['Wide (≥ 50)', (g) => g >= 50, 1], ['Moderate (25–49)', (g) => g >= 25 && g < 50, 2], ['Narrow (< 25)', (g) => g < 25, 3], ['All days', () => true, 4]];
    return B.map(([bucket, f, order]) => {
      const o = obs.filter((x) => f(x.gap));
      return { bucket, order, n: o.length, vix_fwd: o.length ? Math.round(d3.mean(o, (x) => x.dv) * 100) / 100 : null, vix_up: o.length ? Math.round((o.filter((x) => x.dv > 0).length / o.length) * 100) : null, spx_fwd: o.length ? Math.round(d3.mean(o, (x) => x.rs) * 100) / 100 : null };
    });
  },
});

dash.calc('oil_beta', {
  inputs: ['universe'],
  title: 'Oil-shock beta',
  description: 'Beta and correlation of each series\' daily move (log % for prices, bp for yields and spreads, absolute for levels) to Brent\'s daily log % move, over the last 60 shared days and over the war period (from 2 Mar 2026).',
  fn: (universe) => {
    const groups = d3.group(universe, (r) => r.series);
    const ret = (series) => {
      const rows = groups.get(series), k = rows[0].kind;
      const s = rows.map((r) => [r.date, r.value]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const m = new Map();
      for (let i = 1; i < s.length; i++) m.set(s[i][0], k === 'rate' ? (s[i][1] - s[i - 1][1]) * 100 : k === 'level' ? s[i][1] - s[i - 1][1] : Math.log(s[i][1] / s[i - 1][1]) * 100);
      return m;
    };
    const b = ret('Brent');
    const stat = (pairs) => {
      const mx = d3.mean(pairs, (p) => p[0]), my = d3.mean(pairs, (p) => p[1]);
      let cov = 0, vx = 0, vy = 0;
      pairs.forEach(([x, y]) => { cov += (x - mx) * (y - my); vx += (x - mx) ** 2; vy += (y - my) ** 2; });
      return { beta: cov / vx, corr: cov / Math.sqrt(vx * vy) };
    };
    return Array.from(groups.keys()).filter((s) => s !== 'Brent').map((series) => {
      const r = ret(series);
      const pairs = Array.from(r.keys()).filter((d) => b.has(d)).sort().map((d) => [b.get(d), r.get(d), d]);
      const last60 = pairs.slice(-60), war = pairs.filter((p) => p[2] >= '2026-03-02');
      const a = stat(last60), w = stat(war);
      return { series, desk: groups.get(series)[0].desk, beta_60d: Math.round(a.beta * 100) / 100, corr_60d: Math.round(a.corr * 100) / 100, beta_war: Math.round(w.beta * 100) / 100, corr_war: Math.round(w.corr * 100) / 100, n_60d: last60.length };
    });
  },
});

dash.calc('event_moves', {
  inputs: ['universe', 'catalysts'],
  title: 'Event study: moves after 2026 Middle East events',
  description: 'For each dated 2026 Middle East escalation (+1) or de-escalation (−1) event: the move from the last close before the event to the 5th close on or after it (log % for prices, bp for yields and spreads, absolute for levels).',
  fn: (universe, catalysts) => {
    const events = catalysts.filter((c) => (c.marker === true || c.marker === 'true') && c.channel === 'hormuz' && (c.direction === 1 || c.direction === -1));
    const out = [];
    d3.group(universe, (r) => r.series).forEach((rows, series) => {
      const k = rows[0].kind;
      const s = rows.map((r) => [r.date, r.value]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      events.forEach((e) => {
        const i0 = s.findIndex((p) => p[0] >= e.date) - 1, i5 = i0 + 5;
        if (i0 < 0 || i5 >= s.length) return;
        const a = s[i0][1], b = s[i5][1];
        const move = k === 'rate' ? Math.round((b - a) * 1000) / 10 : k === 'level' ? Math.round((b - a) * 1000) / 1000 : Math.round(Math.log(b / a) * 1000) / 10;
        out.push({ key: `${e.id}|${series}`, event: e.short, event_id: e.id, date: e.date, direction: e.direction, series, desk: rows[0].desk, kind: k, move, from: s[i0][0], to: s[i5][0] });
      });
    });
    return out;
  },
});

dash.calc('event_study', {
  inputs: ['event_moves'],
  title: 'Event study: average 2026 reaction by series',
  description: 'Per series: mean 5-day move after 2026 escalation and de-escalation events, number of events, share of events in which the series rose, and sensitivity = escalation mean − de-escalation mean.',
  fn: (event_moves) => Array.from(d3.group(event_moves, (r) => r.series), ([series, rows]) => {
    const k = rows[0].kind, f = k === 'level' ? 1000 : 10;
    const esc = rows.filter((r) => r.direction === 1), de = rows.filter((r) => r.direction === -1);
    const m = (a) => (a.length ? Math.round(d3.mean(a, (r) => r.move) * f) / f : null);
    const up = (a) => (a.length ? Math.round((a.filter((r) => r.move > 0).length / a.length) * 100) : null);
    const em = m(esc), dm = m(de);
    return { series, desk: rows[0].desk, kind: k, esc_mean: em, esc_n: esc.length, esc_up: up(esc), deesc_mean: dm, deesc_n: de.length, deesc_up: up(de), sensitivity: em != null && dm != null ? Math.round((em - dm) * f) / f : null };
  }),
});

dash.calc('hist_moves', {
  inputs: ['hist', 'hist_events'],
  title: 'Historical analogs: moves after 2019–2025 events',
  description: 'Same 5-day method applied to eight earlier geopolitical shocks (Abqaiq 2019, Soleimani and the stand-down 2020, Ukraine 2022, 7 October 2023, Iran–Israel April 2024, June 2025 strikes and ceasefire) for Brent, VIX, S&P 500, gold, the 10-year yield and the dollar index.',
  fn: (hist, hist_events) => {
    const out = [];
    d3.group(hist, (r) => r.series).forEach((rows, series) => {
      const rate = series === 'UST 10Y';
      const s = rows.map((r) => [String(r.date).slice(0, 10), Number(r.value)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      hist_events.forEach((e) => {
        const i0 = s.findIndex((p) => p[0] >= e.date) - 1, i5 = i0 + 5;
        if (i0 < 0 || i5 >= s.length) return;
        const a = s[i0][1], b = s[i5][1];
        out.push({ key: `${e.id}|${series}`, event: e.short, event_id: e.id, date: e.date, direction: Number(e.direction), series, move: rate ? Math.round((b - a) * 1000) / 10 : Math.round(Math.log(b / a) * 1000) / 10, from: s[i0][0], to: s[i5][0] });
      });
    });
    return out;
  },
});

dash.calc('analogs', {
  inputs: ['hist_moves', 'event_moves'],
  title: 'History vs 2026: escalation response',
  description: 'Per series with history: average 5-day escalation move and share of rises in 2019–2025 analogs, in 2026 events, and pooled; "Agree" when both samples move the same way on average.',
  fn: (hist_moves, event_moves) => Array.from(d3.group(hist_moves, (r) => r.series), ([series, rows]) => {
    const st = (a) => ({ mean: a.length ? Math.round(d3.mean(a, (r) => r.move) * 10) / 10 : null, up: a.length ? Math.round((a.filter((r) => r.move > 0).length / a.length) * 100) : null, n: a.length });
    const he = rows.filter((r) => r.direction === 1), hd = rows.filter((r) => r.direction === -1);
    const ce = event_moves.filter((r) => r.series === series && r.direction === 1);
    const h = st(he), c = st(ce), p = st([...he, ...ce]), d = st(hd);
    return { series, hist_esc_mean: h.mean, hist_esc_up: h.up, hist_esc_n: h.n, hist_deesc_mean: d.mean, hist_deesc_n: d.n, cur_esc_mean: c.mean, cur_esc_up: c.up, cur_esc_n: c.n, pooled_esc_mean: p.mean, pooled_esc_up: p.up, pooled_esc_n: p.n, agree: h.mean != null && c.mean != null && Math.sign(h.mean) === Math.sign(c.mean) ? 'Yes' : 'No' };
  }),
});

dash.calc('hedge_rank', {
  inputs: ['event_study', 'latest'],
  title: 'Hedge efficacy in escalations',
  description: 'Per series: average 5-day move after 2026 Middle East escalations divided by its typical 5-day move (daily st. dev. × √5) — a vol-adjusted escalation z-score; positive means the series rises when the conflict escalates. Ranked from strongest riser to strongest faller.',
  fn: (event_study, latest) => event_study.filter((r) => r.esc_mean != null).map((r) => {
    const l = latest.find((x) => x.series === r.series);
    const z = r.esc_mean / (l.daily_sd * Math.sqrt(5));
    return { series: r.series, desk: r.desk, kind: r.kind, esc_mean: r.esc_mean, esc_up: r.esc_up, esc_n: r.esc_n, esc_z: Math.round(z * 100) / 100 };
  }).sort((a, b) => b.esc_z - a.esc_z),
});

dash.calc('scenario_moves', {
  inputs: ['event_study', 'scenarios'],
  title: 'Scenario-weighted expected move',
  description: 'Per series: probability-weighted 5-day move = P(escalation) × average escalation move + P(de-escalation) × average de-escalation move (status quo contributes zero). Probabilities are analyst judgments.',
  fn: (event_study, scenarios) => {
    const p = (dir) => Number((scenarios.find((s) => Number(s.direction) === dir) || {}).probability || 0);
    return event_study.filter((r) => r.esc_mean != null && r.deesc_mean != null).map((r) => {
      const f = r.kind === 'level' ? 1000 : 10;
      return { series: r.series, desk: r.desk, kind: r.kind, esc_mean: r.esc_mean, deesc_mean: r.deesc_mean, expected: Math.round((p(1) * r.esc_mean + p(-1) * r.deesc_mean) * f) / f, skew: Math.round((Math.abs(r.esc_mean) - Math.abs(r.deesc_mean)) * f) / f };
    });
  },
});

dash.calc('exposure', {
  inputs: ['framework', 'catalysts'],
  title: 'Geopolitical exposure index',
  description: 'Per asset class: sum over live catalysts of (analyst risk score 1–5 × the asset\'s exposure rating 0–3 to that catalyst\'s channel), scaled so the most exposed asset = 100. Also the channel contributing most.',
  fn: (framework, catalysts) => {
    const live = catalysts.filter((c) => !(c.marker === true || c.marker === 'true') && c.analyst_risk != null);
    const raw = framework.map((f) => {
      const by = {};
      live.forEach((c) => { by[c.channel] = (by[c.channel] || 0) + Number(c.analyst_risk) * Number(f[c.channel] || 0); });
      const score = d3.sum(Object.values(by));
      const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
      return { asset_class: f.asset_class, score, top_channel: top ? top[0] : null };
    });
    const max = d3.max(raw, (r) => r.score);
    return raw.map((r) => ({ ...r, exposure_index: Math.round((r.score / max) * 100) }));
  },
});

dash.calc('signals', {
  inputs: ['framework', 'exposure', 'latest', 'oil_beta', 'scenario_moves', 'event_study', 'analogs'],
  title: 'Signal board',
  description: 'Per asset class: priced = the gauge\'s one-year percentile (inverted where a high reading means complacency, e.g. TAIEX); gap = exposure index − priced. Confirmation: the gauge moved in its risk-priced direction on average and in at least half of 2026 escalations; where 2019–2025 history exists it must also do so there ("Mixed" if only one sample agrees). Gap ≥ +25 and confirmed = Under-priced (hedge); gap ≥ +25 otherwise = Watch; gap ≤ −25 = Rich (fade the premium); else Fair. Conviction High if |gap| ≥ 50, Medium if ≥ 25. Vehicle: where an implied-vol index exists (OVX, GVZ, MOVE), options are preferred when implied vol sits ≥ 25 percentile points below the spot gauge, outright when ≥ 25 above.',
  fn: (framework, exposure, latest, oil_beta, scenario_moves, event_study, analogs) => framework.map((f) => {
    const ex = exposure.find((e) => e.asset_class === f.asset_class);
    const l = latest.find((x) => x.series === f.series) || {};
    const ob = oil_beta.find((x) => x.series === f.series) || {};
    const sm = scenario_moves.find((x) => x.series === f.series) || {};
    const es = event_study.find((x) => x.series === f.series) || {};
    const an = analogs.find((x) => x.series === f.series);
    const sign = Number(f.sign);
    const priced = l.pct_rank == null ? null : sign > 0 ? l.pct_rank : 100 - l.pct_rank;
    const gap = priced == null ? null : ex.exposure_index - priced;
    const hit = (up) => (up == null ? null : sign > 0 ? up : 100 - up);
    const curOk = es.esc_mean != null && sign * es.esc_mean > 0 && hit(es.esc_up) >= 50;
    const histOk = an ? an.hist_esc_mean != null && sign * an.hist_esc_mean > 0 && hit(an.hist_esc_up) >= 50 : null;
    const confirmed = an ? (curOk && histOk ? 'Yes' : curOk || histOk ? 'Mixed' : 'No') : curOk ? 'Yes' : 'No';
    const signal = gap == null ? 'n/a' : gap >= 25 ? (confirmed === 'Yes' ? 'Under-priced' : 'Watch') : gap <= -25 ? 'Rich' : 'Fair';
    const lo = f.opt_series ? latest.find((x) => x.series === f.opt_series) : null;
    const optPriced = lo ? lo.pct_rank : null;
    const vehicle = optPriced == null || priced == null ? 'Outright (no options gauge yet)' : priced - optPriced >= 25 ? 'Options: implied vol cheap vs spot' : optPriced - priced >= 25 ? 'Outright: options rich' : 'Either: options and spot aligned';
    return {
      asset_class: f.asset_class, desk: f.desk, region: f.region, gauge: f.gauge, series: f.series,
      exposure_index: ex.exposure_index, top_channel: ex.top_channel, priced, gap, confirmed,
      risk_hit: an ? hit(an.pooled_esc_up) : hit(es.esc_up), evidence_n: an ? an.pooled_esc_n : es.esc_n ?? 0, evidence_basis: an ? '2026 + 2019–25' : '2026 only',
      signal, conviction: gap == null ? '—' : Math.abs(gap) >= 50 ? 'High' : Math.abs(gap) >= 25 ? 'Medium' : 'Low',
      mom_z20: l.mom_z20 ?? null, oil_beta_60d: ob.beta_60d ?? null, expected_5d: sm.expected ?? null, kind: l.kind || 'price',
      opt_series: f.opt_series || null, opt_priced: optPriced, vehicle,
      expression: signal === 'Under-priced' ? f.hedge_expression : signal === 'Watch' ? 'Not confirmed by past escalations; if hedging, keep it small: ' + f.hedge_expression.charAt(0).toLowerCase() + f.hedge_expression.slice(1) : signal === 'Rich' ? f.fade_expression : 'No geopolitical trade; monitor triggers',
      pm_tilt: f.pm_tilt,
    };
  }),
});

dash.calc('trade_ideas', {
  inputs: ['signals'],
  title: 'Trade ideas, ranked',
  description: 'Actionable signals ordered for a morning meeting: Under-priced first, then Rich, then Watch; within each by the size of the gap. Top six.',
  fn: (signals) => {
    const order = { 'Under-priced': 0, Rich: 1, Watch: 2 };
    return signals.filter((r) => r.signal in order).sort((a, b) => order[a.signal] - order[b.signal] || Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 6).map((r, i) => ({ rank: i + 1, ...r }));
  },
});

dash.calc('movers', {
  inputs: ['latest'],
  title: 'What moved this week',
  description: 'The ten largest 5-day moves across all series, ranked by size relative to each series\' normal 5-day move (5-day change ÷ (daily st. dev. × √5)).',
  fn: (latest) => [...latest].filter((r) => r.z_5d != null && isFinite(r.z_5d)).sort((a, b) => Math.abs(b.z_5d) - Math.abs(a.z_5d)).slice(0, 10)
    .map((r, i) => ({ rank: i + 1, series: r.series, desk: r.desk, kind: r.kind, unit: r.unit, value: r.value, chg_5d: r.chg_5d, z_5d: r.z_5d })),
});

dash.calc('upcoming', {
  inputs: ['calendar', 'markets'],
  title: 'Next 30 days',
  description: 'Calendar entries dated after the last market close and within 31 days of it, with days to go.',
  fn: (calendar, markets) => {
    const asof = d3.max(markets, (r) => String(r.date).slice(0, 10));
    const t0 = Date.parse(asof + 'T00:00:00Z');
    return calendar.map((r) => ({ ...r, days: Math.round((Date.parse(r.date + 'T00:00:00Z') - t0) / 864e5) })).filter((r) => r.days > 0 && r.days <= 31).sort((a, b) => a.days - b.days);
  },
});

dash.calc('desk_view', {
  inputs: ['latest', 'signals', 'desks', 'fred_latest', 'hedge_rank'],
  title: 'Desk reads',
  description: 'For each desk, a rule-based read assembled from its metrics (percentile ranks, changes since 27 Feb and over a month, implied vs spot), plus its signal count and strongest flag. Rules are written out in the Method tab.',
  fn: (latest, signals, desks, fred_latest, hedge_rank) => {
    const L = (s) => latest.find((r) => r.series === s) || {};
    const F = (s) => (fred_latest.find((r) => r.series_id === s) || {}).value;
    const H = (s) => (hedge_rank.find((r) => r.series === s) || {}).esc_z;
    const o = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    const sg = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
    const p = (v) => sg(v) + Math.abs(Math.round(v * 10) / 10) + '%';
    const bp = (v) => sg(v) + Math.abs(Math.round(v)) + ' bp';
    const read = {
      Energy: () => {
        const b = L('Brent'), c = L('3-2-1 crack'), v = L('OVX'), t = L('Frontline (FRO)');
        const veh = b.pct_rank - v.pct_rank >= 25 ? 'implied vol is cheap relative to spot, so upside is better owned through calls' : v.pct_rank - b.pct_rank >= 25 ? 'options are rich, so futures or call spreads beat outright calls' : 'options and spot are aligned';
        return `Brent sits at the ${o(b.pct_rank)} percentile and the 3-2-1 crack at the ${o(c.pct_rank)}, but OVX is only at the ${o(v.pct_rank)}: ${veh}. Tanker equity (FRO) is ${p(t.chg_prewar)} since the war began.`;
      },
      Rates: () => {
        const t = L('UST 10Y'), c = L('3m10y'), f = L('5s30s');
        const shape = t.chg_prewar > 0 ? (c.chg_prewar > 0 ? 'bear steepening — an inflation and term-premium shock' : 'bear flattening — the front end leads on Fed hikes') : (c.chg_prewar > 0 ? 'bull steepening — growth fears dominate' : 'bull flattening');
        return `The 10-year is ${bp(t.chg_prewar)} since 27 Feb with 3m10y ${bp(c.chg_prewar)} and 5s30s ${bp(f.chg_prewar)}: ${shape}. Breakevens ${F('T10YIE')}% and real yields ${F('DFII10')}% split the 10-year.`;
      },
      Credit: () => {
        const h = L('HY OAS'), q = L('CCC–BBB'), e = L('EM corp OAS');
        const dec = q.chg_1m > 25 ? 'decompression — stress is concentrated in the weakest credits' : q.chg_1m < -25 ? 'compression — the market is reaching for yield' : 'no clear decompression';
        return `High-yield spreads are at the ${o(h.pct_rank)} percentile. CCC–BBB moved ${bp(q.chg_1m)} in a month: ${dec}. EM corporate spreads ${bp(e.chg_1m)} over the same month.`;
      },
      Equities: () => {
        const v = L('VIX'), s = L('S&P 500'), ij = L('ITA / JETS'), xe = L('XLE / S&P 500');
        return `VIX is at the ${o(v.pct_rank)} percentile while the S&P 500 is ${p(s.chg_prewar)} since 27 Feb. The war shows up in sectors rather than the index: defense vs airlines ${p(ij.chg_prewar)}, energy vs the market ${p(xe.chg_prewar)}.`;
      },
      Volatility: () => {
        const r = L('VIX / VIX 3M'), cand = ['VIX', 'MOVE', 'OVX', 'GVZ'].map((s) => [s, L(s).pct_rank]).sort((a, b) => a[1] - b[1]);
        const ts = r.value < 0.95 ? 'in contango — no near-term panic premium' : r.value > 1 ? 'inverted — near-term stress is priced' : 'flat';
        return `VIX ÷ VIX 3-month is ${Math.round(r.value * 100) / 100}, ${ts}. Across assets the cheapest implied vol relative to its own year is ${cand[0][0]} (${o(cand[0][1])} percentile) and the richest ${cand[3][0]} (${o(cand[3][1])}).`;
      },
      'Metals & Ags': () => {
        const g = L('Gold'), c = L('Copper'), w = L('Wheat'), z = H('Gold');
        return `Gold is ${p(g.chg_prewar)} since the war began and has ${z < 0 ? 'fallen' : 'risen'} after 2026 escalations (vol-adjusted ${sg(z)}${Math.abs(z)}), so it is not working as a war hedge this year. Copper sits at the ${o(c.pct_rank)} percentile; wheat is ${p(w.chg_prewar)} since 27 Feb.`;
      },
      FX: () => {
        const d = L('DXY'), j = L('USD/JPY'), c = L('USD/CHF');
        const em = ['USD/KRW', 'USD/INR', 'USD/TWD', 'USD/ZAR', 'USD/BRL', 'USD/MXN', 'USD/COP'].map((s) => [s, L(s).chg_prewar]).sort((a, b) => b[1] - a[1]);
        const haven = j.chg_prewar > 0 && c.chg_prewar > 0 ? 'the dollar, not the yen or franc, is the haven' : j.chg_prewar < 0 && c.chg_prewar < 0 ? 'the yen and franc are acting as havens' : 'haven behaviour is mixed';
        return `The dollar index is at the ${o(d.pct_rank)} percentile; since 27 Feb USD/JPY is ${p(j.chg_prewar)} and USD/CHF ${p(c.chg_prewar)}: ${haven}. Weakest EM currency vs the dollar since the war began: ${em[0][0]} (${p(em[0][1])}).`;
      },
    };
    const order = { 'Under-priced': 0, Watch: 1, Rich: 2 };
    return desks.map((d) => {
      const sig = signals.filter((s) => s.desk === d.desk || (d.desk === 'Volatility' && s.series === 'VIX'));
      const flags = sig.filter((s) => s.signal in order).sort((a, b) => order[a.signal] - order[b.signal] || Math.abs(b.gap) - Math.abs(a.gap));
      return { desk: d.desk, order: d.order, question: d.question, read: read[d.desk] ? read[d.desk]() : '', n_assets: sig.length, n_flags: flags.length, top_flag: flags.length ? `${flags[0].asset_class}: ${flags[0].signal} (gap ${flags[0].gap > 0 ? '+' : '−'}${Math.abs(flags[0].gap)})` : 'No active signal', top_signal: flags.length ? flags[0].signal : 'None' };
    }).sort((a, b) => a.order - b.order);
  },
});

dash.calc('roadmap_stats', {
  inputs: ['roadmap'],
  title: 'Deliverables headway',
  description: 'Count of deliverables by status, and the share live (including proxy versions).',
  fn: (roadmap) => {
    const c = (s) => roadmap.filter((r) => r.status === s).length;
    const live = c('Live'), proxy = c('Live (proxy)');
    return { total: roadmap.length, live, proxy, in_progress: c('In progress'), vendor: c('Needs vendor data'), live_pct: Math.round(((live + proxy) / roadmap.length) * 100) };
  },
});

dash.calc('region_summary', {
  inputs: ['catalysts'],
  title: 'Live catalysts by region',
  description: 'Live (non-historical) catalysts per region: count, number escalating, highest analyst risk score and the top-ranked catalyst.',
  fn: (catalysts) => Array.from(d3.group(catalysts.filter((c) => !(c.marker === true || c.marker === 'true')), (c) => c.region), ([region, rows]) => {
    const top = [...rows].sort((a, b) => b.analyst_risk - a.analyst_risk)[0];
    return { region, live: rows.length, escalating: rows.filter((r) => r.status === 'Escalating').length, max_risk: d3.max(rows, (r) => Number(r.analyst_risk)), top: top.title };
  }).sort((a, b) => b.max_risk - a.max_risk || b.live - a.live),
});

dash.calc('fred_latest', {
  inputs: ['fred'],
  title: 'FRED latest observations',
  description: 'Per FRED series: the latest observation and its change in basis points since the first observation shown.',
  fn: (fred) => Array.from(d3.group(fred, (r) => r.series_id), ([series_id, rows]) => {
    const s = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = s[s.length - 1], first = s[0];
    return { series_id, title: last.title, date: last.date, value: Number(last.value), first_date: first.date, chg_bp: Math.round((Number(last.value) - Number(first.value)) * 100) };
  }),
});

dash.calc('premium', {
  inputs: ['fred', 'markets'],
  title: 'Dated Brent premium to futures',
  description: 'FRED dated Brent spot (DCOILBRENTEU) minus the Brent futures close on the same date.',
  fn: (fred, markets) => {
    const fut = new Map(markets.filter((r) => r.series === 'Brent').map((r) => [String(r.date).slice(0, 10), Number(r.value)]));
    return fred.filter((r) => r.series_id === 'DCOILBRENTEU' && fut.has(r.date))
      .map((r) => ({ date: r.date, dated: Number(r.value), futures: fut.get(r.date), premium: Math.round((Number(r.value) - fut.get(r.date)) * 100) / 100 }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('premium_latest', {
  inputs: ['premium'],
  title: 'Dated Brent premium, latest',
  description: 'The most recent day with both a dated Brent and a futures close.',
  fn: (premium) => premium[premium.length - 1],
});

dash.calc('brent_wti', {
  inputs: ['indicators'],
  title: 'Brent–WTI spread (physical snapshot)',
  description: 'Brent minus WTI from the same Straits brief snapshot.',
  fn: (indicators) => {
    const b = indicators.find((r) => r.id === 'brent_straits'), w = indicators.find((r) => r.id === 'wti_straits');
    return { as_of: b.as_of, brent: Number(b.value), wti: Number(w.value), spread: Math.round((Number(b.value) - Number(w.value)) * 100) / 100 };
  },
});

dash.calc('hormuz_ratio', {
  inputs: ['indicators'],
  title: 'Hormuz transits vs normal',
  description: 'Daily transits as a share of the pre-crisis baseline.',
  fn: (indicators) => {
    const t = indicators.find((r) => r.id === 'hormuz_transits');
    return { transits: Number(t.value), baseline: Number(t.baseline), pct_of_normal: Math.round((Number(t.value) / Number(t.baseline)) * 1000) / 10 };
  },
});

dash.calc('gpr_stats', {
  inputs: ['gpr'],
  title: 'Daily GPR, period average',
  description: 'Mean and maximum of the daily GPR values shown.',
  fn: (gpr) => ({ mean: Math.round(d3.mean(gpr, (r) => Number(r.gpr)) * 10) / 10, max: d3.max(gpr, (r) => Number(r.gpr)) }),
});

dash.calc('odds_shift', {
  inputs: ['predictions'],
  title: 'Midterm odds, March vs October',
  description: 'Average Democratic-control probability across Kalshi and Polymarket for House and Senate, at each snapshot date.',
  fn: (predictions) => ['House control', 'Senate control'].map((market) => {
    const rows = predictions.filter((r) => r.market === market && r.outcome === 'Democrats');
    const avg = (d) => Math.round(d3.mean(rows.filter((r) => r.as_of === d), (r) => Number(r.probability)) * 10) / 10;
    return { market, march: avg('2026-03-24'), october: avg('2026-10-10') };
  }),
});

dash.calc('analog_events', {
  inputs: ['hist_moves', 'hist_events'],
  title: 'Historical analogs by event',
  description: 'The 5-day moves from Historical analogs laid out one row per event (log % for prices, bp for the 10-year yield).',
  fn: (hist_moves, hist_events) => hist_events.map((e) => {
    const row = { event_id: e.id, date: e.date, event: e.short, title: e.title, direction: Number(e.direction) > 0 ? 'Escalation' : 'De-escalation' };
    hist_moves.filter((m) => m.event_id === e.id).forEach((m) => { row[m.series] = m.move; });
    return row;
  }),
});

/* ---------- Fed tracker ---------- */
dash.calc('fed_rates', {
  inputs: ['fed_daily'],
  title: 'Fed rates corridor, daily',
  description: 'One row per business day from 6 Nov 2025: EFFR, SOFR and their 99th percentiles, the target range, IORB (top of range − 10 bp), ON RRP take-up and the 3-month, 2-year and 10-year Treasury yields. Spreads in bp: EFFR − IORB, SOFR − IORB, SOFR 99th percentile − standing repo rate (top of range), 2-year − EFFR, 3-month − EFFR and 2s10s.',
  fn: (fed_daily) => {
    const by = d3.group(fed_daily, (r) => r.date);
    const bp = (a, b) => (a == null || b == null ? null : Math.round((a - b) * 100));
    return Array.from(by.keys()).sort().map((date) => {
      const g = new Map(by.get(date).map((r) => [r.series, Number(r.value)]));
      const v = (k) => (g.has(k) ? g.get(k) : null);
      const r = { date, effr: v('EFFR'), effr_p99: v('EFFR 99th pct'), sofr: v('SOFR'), sofr_p99: v('SOFR 99th pct'), lower: v('Target lower'), upper: v('Target upper'), iorb: v('IORB'), rrp: v('ON RRP'), t3m: v('Treasury 3M'), t2y: v('Treasury 2Y'), t10y: v('Treasury 10Y') };
      return { ...r, effr_iorb: bp(r.effr, r.iorb), sofr_iorb: bp(r.sofr, r.iorb), sofr99_srf: bp(r.sofr_p99, r.upper), t2y_effr: bp(r.t2y, r.effr), t3m_effr: bp(r.t3m, r.effr), curve_2s10s: bp(r.t10y, r.t2y) };
    }).filter((r) => r.effr != null);
  },
});

dash.calc('fed_week', {
  inputs: ['fed_weekly'],
  title: 'Fed balance sheet, weekly (H.4.1)',
  description: 'Wednesday levels in $bn: total assets, reserve balances, Treasury General Account, Treasury and MBS holdings, repo (standing repo facility) and primary credit (discount window).',
  fn: (fed_weekly) => {
    const K = { WALCL: 'total_assets', WRESBAL: 'reserves', WTREGEN: 'tga', TREAST: 'ust_held', WSHOMCB: 'mbs_held', WORAL: 'srf', WLCFLPCL: 'dw' };
    return Array.from(d3.group(fed_weekly, (r) => r.date), ([date, rows]) => {
      const o = { date };
      rows.forEach((r) => { o[K[r.series_id]] = Number(r.value); });
      return o;
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('fed_now', {
  inputs: ['fed_rates', 'fed_week', 'fed_comms', 'fed_decisions', 'fed_pricing'],
  title: 'Fed dashboard, latest',
  description: 'Latest corridor readings with 5-day averages and 20-day extremes; weekly balance-sheet levels with 4-week changes (6-week for the discount window) and the 13-week high in standing repo use; days to the next FOMC decision (28 Oct 2026); latest market-implied hike odds per meeting; Fedspeak tone = average stance score (−2 dovish to +2 hawkish) of communications in the 30 days to the last market date; the last decision and its vote.',
  fn: (fed_rates, fed_week, fed_comms, fed_decisions, fed_pricing) => {
    const R = fed_rates, n = R.length - 1, last = R[n];
    const lastN = (k, m) => R.slice(-m).map((r) => r[k]).filter((x) => x != null);
    const avg = (a) => Math.round((d3.mean(a) || 0) * 10) / 10;
    const ago = (k, m) => R[Math.max(0, n - m)][k];
    const W = fed_week, w = W.length - 1, lw = W[w];
    const back = (k, m) => W[Math.max(0, w - m)][k];
    const srf13 = W.slice(-13).reduce((a, b) => ((b.srf ?? 0) > (a.srf ?? 0) ? b : a));
    const asof = last.date, t0 = Date.parse(asof + 'T00:00:00Z');
    const within = fed_comms.filter((c) => (t0 - Date.parse(c.date + 'T00:00:00Z')) / 864e5 <= 30 && c.date <= asof);
    const tone = within.length ? Math.round(d3.mean(within, (c) => Number(c.stance)) * 100) / 100 : null;
    const patient = within.filter((c) => /Patient|timing open|not consecutive/i.test(c.timing)).length;
    const latestP = (m) => [...fed_pricing].filter((p) => p.meeting === m).sort((a, b) => (a.date < b.date ? -1 : 1)).pop() || {};
    const oct = latestP('Oct 28'), dec = latestP('Dec 9');
    const peak = d3.max(fed_pricing.filter((p) => p.meeting === 'Oct 28'), (p) => Number(p.prob_hike));
    const D = [...fed_decisions].sort((a, b) => (a.date < b.date ? -1 : 1)), ld = D[D.length - 1];
    const lastDissent = [...D].reverse().find((d) => d.hawk_dissents + d.dove_dissents > 0);
    return {
      date: asof, range: `${last.lower.toFixed(2)}–${last.upper.toFixed(2)}%`, lower: last.lower, upper: last.upper, iorb: last.iorb, srf_rate: last.upper, rrp_rate: last.lower,
      effr: last.effr, sofr: last.sofr, effr_iorb: last.effr_iorb, sofr_iorb: last.sofr_iorb, sofr_iorb_avg5: avg(lastN('sofr_iorb', 5)), sofr_iorb_max20: d3.max(lastN('sofr_iorb', 20)),
      sofr99_srf: last.sofr99_srf, sofr99_srf_avg5: avg(lastN('sofr99_srf', 5)), sofr99_srf_max20: d3.max(lastN('sofr99_srf', 20)),
      rrp_avg5: Math.round((d3.mean(lastN('rrp', 5)) || 0) * 100) / 100, rrp_max20: d3.max(lastN('rrp', 20)),
      t3m: last.t3m, t2y: last.t2y, t10y: last.t10y, t2y_effr: last.t2y_effr, t3m_effr: last.t3m_effr, curve_2s10s: last.curve_2s10s,
      t2y_chg20: last.t2y != null && ago('t2y', 20) != null ? Math.round((last.t2y - ago('t2y', 20)) * 100) : null, hikes_2y: Math.round((last.t2y_effr / 25) * 10) / 10,
      week: lw.date, total_assets_tn: Math.round(lw.total_assets / 10) / 100, reserves_tn: Math.round(lw.reserves / 10) / 100, reserves_chg4w: Math.round(lw.reserves - back('reserves', 4)),
      tga_bn: Math.round(lw.tga), tga_chg4w: Math.round(lw.tga - back('tga', 4)), ust_chg4w: Math.round(lw.ust_held - back('ust_held', 4)), mbs_chg4w: Math.round(lw.mbs_held - back('mbs_held', 4)),
      srf_latest: Math.round(lw.srf * 10) / 10, srf_max13w: Math.round(srf13.srf * 10) / 10, srf_max13w_date: srf13.date,
      dw_latest: Math.round(lw.dw * 10) / 10, dw_chg6w: Math.round((lw.dw - back('dw', 6)) * 10) / 10, dw_6w_ago: Math.round(back('dw', 6) * 10) / 10,
      next_meeting: '2026-10-28', days_to_meeting: Math.round((Date.parse('2026-10-28T00:00:00Z') - t0) / 864e5),
      oct_hike: Number(oct.prob_hike), oct_hike_date: oct.date, oct_hike_peak: peak, dec_hike: Number(dec.prob_hike), dec_hike_date: dec.date,
      tone_30d: tone, n_comms_30d: within.length, n_patient_30d: patient,
      tone_label: tone == null ? 'n/a' : tone >= 1 ? 'Hawkish' : tone >= 0.4 ? 'Leaning hawkish' : tone > -0.4 ? 'Balanced' : 'Dovish',
      last_decision: `${ld.decision}${ld.change_bp ? ' ' + (ld.change_bp > 0 ? '+' : '−') + Math.abs(ld.change_bp) + ' bp' : ''} to ${ld.range}`, last_decision_date: ld.date, last_vote: ld.vote,
      last_dissent_date: lastDissent ? lastDissent.date : null, last_dissent: lastDissent ? lastDissent.dissents : 'None',
    };
  },
});

dash.calc('fed_monitor', {
  inputs: ['fed_now', 'fed_playbook'],
  title: 'Fed plumbing monitor',
  description: 'Each micro-indicator\'s latest reading against analyst thresholds in the playbook: Stress beyond the alert level, Watch beyond the warning level, otherwise Normal (Info where no threshold applies). Readings: EFFR − IORB latest; SOFR − IORB and SOFR 99th percentile − standing repo rate as 5-day averages; ON RRP 5-day average; standing repo, reserves, discount window at the latest Wednesday; TGA and Treasury holdings as 4-week changes.',
  fn: (fed_now, fed_playbook) => {
    const f = fed_now;
    const V = {
      effr_iorb: [f.effr_iorb, `EFFR ${f.effr.toFixed(2)}% vs IORB ${f.iorb.toFixed(2)}%`],
      sofr_iorb: [f.sofr_iorb_avg5, `Latest ${f.sofr_iorb} bp; 20-day high ${f.sofr_iorb_max20 > 0 ? '+' : ''}${f.sofr_iorb_max20} bp`],
      sofr99_srf: [f.sofr99_srf_avg5, `20-day high ${f.sofr99_srf_max20 > 0 ? '+' : ''}${f.sofr99_srf_max20} bp vs the ${f.srf_rate}% repo rate`],
      srf: [f.srf_latest, `13-week high $${f.srf_max13w}bn (${f.srf_max13w_date})`],
      onrrp: [f.rrp_avg5, `20-day high $${Math.round(f.rrp_max20 * 10) / 10}bn (quarter-end)`],
      reserves: [f.reserves_tn, `${f.reserves_chg4w > 0 ? '+' : '−'}$${Math.abs(f.reserves_chg4w)}bn in 4 weeks`],
      tga: [f.tga_chg4w, `Level $${f.tga_bn}bn`],
      rmp: [f.ust_chg4w, `MBS ${f.mbs_chg4w > 0 ? '+' : '−'}$${Math.abs(f.mbs_chg4w)}bn in 4 weeks (runoff reinvested into bills)`],
      dw: [f.dw_latest, `${f.dw_chg6w > 0 ? '+' : '−'}$${Math.abs(f.dw_chg6w)}bn in 6 weeks (from $${f.dw_6w_ago}bn)`],
    };
    return fed_playbook.map((p) => {
      const [v, detail] = V[p.id] || [null, ''];
      let status = 'Info';
      if (p.direction === 'above') status = p.alert != null && v >= p.alert ? 'Stress' : p.warn != null && v >= p.warn ? 'Watch' : 'Normal';
      if (p.direction === 'below') status = p.alert != null && v <= p.alert ? 'Stress' : p.warn != null && v <= p.warn ? 'Watch' : 'Normal';
      const nf = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));
      const thr = p.direction === 'info' ? '—' : `${p.direction === 'above' ? '≥' : '≤'} ${nf(p.warn)} watch${p.alert != null ? `, ${p.direction === 'above' ? '≥' : '≤'} ${nf(p.alert)} stress` : ''}`;
      return { id: p.id, order: p.order, indicator: p.indicator, value: v, unit: p.unit, detail, status, threshold: thr, normal: p.normal, signals: p.signals, implication: p.implication, action: p.action };
    }).sort((a, b) => a.order - b.order);
  },
});

dash.calc('fed_read', {
  inputs: ['fed_now', 'fed_monitor'],
  title: 'Fed read',
  description: 'Rule-based summary: policy stance from the last decision, Fedspeak tone and market pricing; plumbing status from the monitor (Stress if any indicator is in stress, Watch if two or more are on watch, else Ample).',
  fn: (fed_now, fed_monitor) => {
    const f = fed_now;
    const nS = fed_monitor.filter((m) => m.status === 'Stress').length, nW = fed_monitor.filter((m) => m.status === 'Watch').length;
    const plumbing = nS ? 'Stress' : nW >= 2 ? 'Watch' : 'Ample';
    const watchList = fed_monitor.filter((m) => m.status !== 'Normal' && m.status !== 'Info').map((m) => m.indicator);
    const stance = f.tone_30d >= 0.4 ? 'Tightening bias' : f.tone_30d > -0.4 ? 'On hold, two-sided' : 'Easing bias';
    const timing = f.n_patient_30d >= Math.ceil(f.n_comms_30d / 2) ? 'patient on timing' : 'leaning toward acting soon';
    const sg = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
    const ld = new Date(f.last_decision_date + 'T00:00:00Z'), dd = ld.getUTCDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][ld.getUTCMonth()];
    return {
      stance, plumbing, n_stress: nS, n_watch: nW,
      policy_read: `${stance}, ${timing}: the last decision was a ${f.last_decision.toLowerCase()} on ${dd}, and Fedspeak over the past 30 days scores ${sg(f.tone_30d)} on a −2 to +2 scale (${f.n_comms_30d} statements, ${f.n_patient_30d} stressing patience). Markets price a ${f.oct_hike}% chance of a hike on 28 Oct (down from a ${f.oct_hike_peak}% peak) and about ${f.dec_hike}% for December; the 2-year sits ${f.t2y_effr} bp above EFFR.`,
      plumbing_read: `Reserves of $${f.reserves_tn}tn remain ample — EFFR is ${Math.abs(f.effr_iorb)} bp below IORB and SOFR averages ${sg(f.sofr_iorb_avg5)} bp to IORB — but ${watchList.length ? 'on watch: ' + watchList.join('; ') : 'nothing is on watch'}. With ON RRP near zero ($${f.rrp_avg5}bn), TGA swings now move reserves one for one.`,
    };
  },
});

dash.calc('fed_betas', {
  inputs: ['universe', 'fed_daily', 'fed_decisions', 'fed_comms'],
  title: 'Rate-shock betas and FOMC-day moves',
  description: 'For each asset: the beta of its daily move (log % for prices, bp for yields and spreads) to the daily change in the 2-year Treasury yield holding Brent\'s daily move constant (two-factor regression on all shared days since Oct 2025), shown per +10 bp in the 2-year. Controlling for oil strips out the war\'s inflation channel, so the beta approximates a monetary-policy shock. Cross-check: a simple beta on Fed event days only (FOMC decisions plus the dated communications in the tracker), and whether its sign agrees. Also the simple correlation with the 2-year and the average absolute move on FOMC decision days.',
  fn: (universe, fed_daily, fed_decisions, fed_comms) => {
    const series = (rows, kind) => { const s = rows.map((r) => [String(r.date).slice(0, 10), Number(r.value)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)); const m = new Map(); for (let i = 1; i < s.length; i++) m.set(s[i][0], kind === 'rate' ? (s[i][1] - s[i - 1][1]) * 100 : kind === 'level' ? s[i][1] - s[i - 1][1] : Math.log(s[i][1] / s[i - 1][1]) * 100); return m; };
    const fd = d3.group(fed_daily, (r) => r.series), ug = d3.group(universe, (r) => r.series);
    const y2 = series(fd.get('Treasury 2Y'), 'rate');
    const t10 = fd.get('Treasury 10Y'), t2 = new Map(fd.get('Treasury 2Y').map((r) => [r.date, r.value]));
    const curve = t10.filter((r) => t2.has(r.date)).map((r) => ({ date: r.date, value: r.value - t2.get(r.date) }));
    const A = [['Treasury 2Y', 'rate', fd.get('Treasury 2Y')], ['Treasury 10Y', 'rate', t10], ['2s10s curve', 'rate', curve], ['S&P 500', 'price'], ['SMH', 'price'], ['VIX', 'price'], ['DXY', 'price'], ['USD/JPY', 'price'], ['USD/MXN', 'price'], ['Gold', 'price'], ['HY OAS', 'rate'], ['Copper', 'price']];
    const br = series(ug.get('Brent'), 'price');
    const fomc = fed_decisions.map((d) => d.date);
    const events = Array.from(new Set([...fomc, ...fed_comms.map((c) => c.date)]));
    return A.map(([name, kind, rows]) => {
      const m = series(rows || ug.get(name), kind);
      const tr = Array.from(m.keys()).filter((d) => y2.has(d) && br.has(d)).map((d) => [y2.get(d), br.get(d), m.get(d)]);
      const mx = d3.mean(tr, (p) => p[0]), mz = d3.mean(tr, (p) => p[1]), my = d3.mean(tr, (p) => p[2]);
      let sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0, syy = 0;
      tr.forEach(([x, z, y]) => { x -= mx; z -= mz; y -= my; sxx += x * x; szz += z * z; sxz += x * z; sxy += x * y; szy += z * y; syy += y * y; });
      const b1 = name === 'Treasury 2Y' ? 1 : (sxy * szz - szy * sxz) / (sxx * szz - sxz * sxz);
      const fm = fomc.filter((d) => m.has(d)).map((d) => m.get(d));
      const ev = events.filter((d) => m.has(d) && y2.has(d)).map((d) => [y2.get(d), m.get(d)]);
      const ex = d3.mean(ev, (p) => p[0]), ey = d3.mean(ev, (p) => p[1]);
      let ec = 0, evx = 0; ev.forEach(([x, y]) => { ec += (x - ex) * (y - ey); evx += (x - ex) ** 2; });
      const eb = name === 'Treasury 2Y' ? 1 : ec / evx;
      return { asset: name, kind, unit: kind === 'rate' ? 'bp' : '%', beta_10bp: Math.round(b1 * 10 * 100) / 100, corr: Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100, n: tr.length, event_beta_10bp: Math.round(eb * 10 * 100) / 100, event_n: ev.length, agree: Math.sign(eb) === Math.sign(b1) ? 'Yes' : 'No', fomc_abs: fm.length ? Math.round(d3.mean(fm, (x) => Math.abs(x)) * 100) / 100 : null, fomc_n: fm.length };
    });
  },
});

dash.calc('fomc_reactions', {
  inputs: ['fed_decisions', 'universe', 'fed_daily'],
  title: 'FOMC decisions and market reaction',
  description: 'Each decision since October 2025 with its vote and dissents (hawkish = wanted tighter policy, dovish = wanted easier), and the one-day move on decision day (close to close): 2-year and 10-year Treasury yields in bp; S&P 500, dollar index, gold, VIX and USD/JPY in log %.',
  fn: (fed_decisions, universe, fed_daily) => {
    const mk = (rows) => { const s = rows.map((r) => [String(r.date).slice(0, 10), Number(r.value)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)); return s; };
    const fd = d3.group(fed_daily, (r) => r.series), ug = d3.group(universe, (r) => r.series);
    const S = { y2: [mk(fd.get('Treasury 2Y')), 'rate'], y10: [mk(fd.get('Treasury 10Y')), 'rate'], spx: [mk(ug.get('S&P 500')), 'price'], dxy: [mk(ug.get('DXY')), 'price'], gold: [mk(ug.get('Gold')), 'price'], vix: [mk(ug.get('VIX')), 'price'], jpy: [mk(ug.get('USD/JPY')), 'price'] };
    const move = ([s, k], date) => { const i = s.findIndex((p) => p[0] === date); if (i < 1) return null; const a = s[i - 1][1], b = s[i][1]; return k === 'rate' ? Math.round((b - a) * 1000) / 10 : Math.round(Math.log(b / a) * 10000) / 100; };
    return [...fed_decisions].sort((a, b) => (a.date < b.date ? 1 : -1)).map((d) => ({
      date: d.date, decision: d.decision, change_bp: d.change_bp, range: d.range, vote: d.vote, dissents: d.dissents, hawk_dissents: d.hawk_dissents, dove_dissents: d.dove_dissents, guidance: d.guidance, balance_sheet: d.balance_sheet, dots: d.dots,
      d_2y: move(S.y2, d.date), d_10y: move(S.y10, d.date), d_spx: move(S.spx, d.date), d_dxy: move(S.dxy, d.date), d_gold: move(S.gold, d.date), d_vix: move(S.vix, d.date), d_jpy: move(S.jpy, d.date),
      source_title: d.source_title, source_url: d.source_url,
    }));
  },
});

dash.calc('fed_breakdown', {
  inputs: ['fed_scenarios', 'fed_betas'],
  title: 'FOMC scenario × asset breakdown',
  description: 'For each scenario on 28 Oct: the assumed 2-year yield shock (analyst) × each asset\'s rate-shock beta = expected same-day move (bp for yields, spreads and curve; % for prices). Expected = probability-weighted across the four scenarios. Betas are one-year oil-controlled averages; "agree" shows whether Fed-event days point the same way. They will understate moves if the Fed surprises on the balance sheet or forward guidance.',
  fn: (fed_scenarios, fed_betas) => fed_betas.map((b) => {
    const row = { asset: b.asset, kind: b.kind, unit: b.unit, beta_10bp: b.beta_10bp, corr: b.corr, agree: b.agree };
    let e = 0;
    fed_scenarios.forEach((s) => { const v = (Number(s.shock_2y) / 10) * b.beta_10bp; row[s.id] = Math.round(v * 100) / 100; e += Number(s.probability) * v; });
    row.expected = Math.round(e * 100) / 100;
    return row;
  }),
});


/* ---------- Shock lab ---------- */
dash.calc('shock_betas', {
  inputs: ['universe'],
  title: 'Shock factor betas',
  description: 'For every series, sensitivities to three ordered shocks over the last 250 shared days: (1) the 2-year Treasury yield, per bp, and (2) Brent, per 1%, from a regression on both together, so a Fed shock carries its usual equity and FX reaction and an oil shock is measured with rates held constant; (3) an equity shock, the S&P 500 coefficient per 1% from adding it as a third regressor, i.e. a sell-off beyond what rates and oil explain. Also R² of the three-factor fit and the series\' daily standard deviation.',
  fn: (universe) => {
    const G = d3.group(universe, (r) => r.series);
    const chg = (rows) => { const k = rows[0].kind, s = rows.map((r) => [r.date, r.value]).sort((a, b) => (a[0] < b[0] ? -1 : 1)), m = new Map(); for (let i = 1; i < s.length; i++) m.set(s[i][0], k === 'rate' ? (s[i][1] - s[i - 1][1]) * 100 : k === 'level' ? s[i][1] - s[i - 1][1] : Math.log(s[i][1] / s[i - 1][1]) * 100); return m; };
    const Y2 = chg(G.get('Treasury 2Y')), OIL = chg(G.get('Brent')), SPX = chg(G.get('S&P 500'));
    const ols = (X, y) => { // small normal-equation solver with intercept
      const n = y.length, p = X[0].length + 1, A = Array.from({ length: p }, () => Array(p).fill(0)), v = Array(p).fill(0);
      for (let i = 0; i < n; i++) { const xi = [1, ...X[i]]; for (let a = 0; a < p; a++) { v[a] += xi[a] * y[i]; for (let b = 0; b < p; b++) A[a][b] += xi[a] * xi[b]; } }
      for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; [v[c], v[piv]] = [v[piv], v[c]]; for (let r = 0; r < p; r++) { if (r === c || !A[c][c]) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < p; k++) A[r][k] -= f * A[c][k]; v[r] -= f * v[c]; } }
      return v.map((x, i) => (A[i][i] ? x / A[i][i] : 0));
    };
    return Array.from(G.keys()).map((series) => {
      const rows = G.get(series), m = chg(rows);
      const days = Array.from(m.keys()).filter((d) => Y2.has(d) && OIL.has(d) && SPX.has(d)).sort().slice(-250);
      const y = days.map((d) => m.get(d));
      const b2 = ols(days.map((d) => [Y2.get(d), OIL.get(d)]), y);
      const b3 = ols(days.map((d) => [Y2.get(d), OIL.get(d), SPX.get(d)]), y);
      const my = d3.mean(y), sst = d3.sum(y, (v) => (v - my) ** 2);
      const sse = d3.sum(days, (d, i) => (y[i] - (b3[0] + b3[1] * Y2.get(d) + b3[2] * OIL.get(d) + b3[3] * SPX.get(d))) ** 2);
      const all = Array.from(m.values());
      const r = (x, f = 10000) => Math.round(x * f) / f;
      return { series, desk: rows[0].desk, kind: rows[0].kind, unit: rows[0].unit, b_y2: r(b2[1]), b_oil: r(b2[2]), b_spx: r(b3[3]), r2: sst ? Math.round((1 - sse / sst) * 100) / 100 : null, n: days.length, daily_sd: r(d3.deviation(all)) };
    });
  },
});

dash.calc('shock_matrix', {
  inputs: ['shocks', 'shock_betas', 'event_study', 'analogs'],
  title: 'Shock × asset impacts',
  description: 'Every series under each defined shock. Event shocks use measured average moves: 5-day moves after 2026 Hormuz escalations or de-escalations, or after the 2019–25 analogs (six series only). Factor shocks use the shock betas: move = 2-year shock × 2-year beta + Brent shock × oil beta + extra equity shock × equity beta (same-day). z = move ÷ (daily st. dev. × √horizon). Position z = the z a long holder earns: the same as z for prices, levels and FX, and reversed for yields and spreads, since a long bond or credit position gains when they fall.',
  fn: (shocks, shock_betas, event_study, analogs) => {
    const ES = new Map(event_study.map((r) => [r.series, r])), AN = new Map(analogs.map((r) => [r.series, r]));
    const out = [];
    shocks.forEach((s) => {
      const h = Number(s.horizon);
      shock_betas.forEach((b) => {
        let move = null, basis = '';
        if (s.type === 'event') {
          if (s.event_field === 'hist_esc_mean') { const a = AN.get(b.series); move = a ? a.hist_esc_mean : null; basis = a ? `${a.hist_esc_n} analogs` : ''; }
          else { const e = ES.get(b.series); move = e ? e[s.event_field] : null; basis = e ? `${s.event_field === 'esc_mean' ? e.esc_n : e.deesc_n} events` : ''; }
        } else {
          move = b.b_y2 * Number(s.y2 || 0) + b.b_oil * Number(s.oil || 0) + b.b_spx * Number(s.spx || 0);
          basis = `betas, ${b.n} days`;
        }
        if (move == null) return;
        const z = move / (b.daily_sd * Math.sqrt(h));
        const pz = b.kind === 'rate' ? -z : z;
        const f = b.kind === 'level' ? 1000 : 100;
        out.push({ key: `${s.id}|${b.series}`, shock: s.id, shock_label: s.label, series: b.series, desk: b.desk, kind: b.kind, unit: b.unit, horizon: h, move: Math.round(move * f) / f, z: Math.round(z * 100) / 100, pos_z: Math.round(pz * 100) / 100, basis });
      });
    });
    return out;
  },
});

dash.calc('shock_hedges', {
  inputs: ['shock_matrix', 'analogs'],
  title: 'Hedges and exposures by shock',
  description: 'For each shock, up to five series whose long position gains most (best hedges, position z above zero) and up to five that lose most (most exposed, position z below zero), so no series appears on both sides when a shock covers only a few series. Curve spreads and ratio series are left out because a "long" position in them is ambiguous; product cracks stay in (long crack = long products, short crude). For the geopolitical shocks, also flags series whose 2026 response disagrees with the 2019–25 analogs.',
  fn: (shock_matrix, analogs) => {
    const disagree = new Set(analogs.filter((a) => a.agree === 'No').map((a) => a.series));
    const SKIP = new Set(['3m10y', '5s30s', 'VIX / VIX 3M', 'Brent–WTI', 'CCC–BBB', 'ITA / JETS', 'XLE / S&P 500', 'SMH / S&P 500']);
    const out = [];
    d3.group(shock_matrix.filter((r) => !SKIP.has(r.series)), (r) => r.shock).forEach((rows, shock) => {
      const srt = [...rows].sort((a, b) => b.pos_z - a.pos_z);
      srt.filter((r) => r.pos_z > 0).slice(0, 5).forEach((r, i) => out.push({ key: `${shock}|H${i}`, shock, side: 'Hedge', rank: i + 1, series: r.series, desk: r.desk, kind: r.kind, unit: r.unit, move: r.move, z: r.z, pos_z: r.pos_z, flag: disagree.has(r.series) && shock !== 'oil' && shock !== 'fed' && shock !== 'riskoff' ? 'History disagrees' : '' }));
      srt.filter((r) => r.pos_z < 0).slice(-5).reverse().forEach((r, i) => out.push({ key: `${shock}|E${i}`, shock, side: 'Exposed', rank: i + 1, series: r.series, desk: r.desk, kind: r.kind, unit: r.unit, move: r.move, z: r.z, pos_z: r.pos_z, flag: disagree.has(r.series) && shock !== 'oil' && shock !== 'fed' && shock !== 'riskoff' ? 'History disagrees' : '' }));
    });
    return out;
  },
});

dash.calc('shock_transmission', {
  inputs: ['shock_matrix'],
  title: 'Transmission by desk',
  description: 'For each shock and desk: the average absolute z across the desk\'s series and the series that moves most, showing where a shock lands first.',
  fn: (shock_matrix) => {
    const out = [];
    d3.group(shock_matrix, (r) => r.shock, (r) => r.desk).forEach((byDesk, shock) => byDesk.forEach((rows, desk) => {
      const top = [...rows].sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];
      out.push({ key: `${shock}|${desk}`, shock, desk, avg_abs_z: Math.round(d3.mean(rows, (r) => Math.abs(r.z)) * 100) / 100, n: rows.length, top_series: top.series, top_z: top.z });
    }));
    return out;
  },
});

dash.calc('combo_scenarios', {
  inputs: ['scenarios', 'fed_scenarios', 'event_study', 'shock_betas'],
  title: 'Combined scenarios: Hormuz × October FOMC',
  description: 'Every pairing of the three Hormuz scenarios with the four FOMC outcomes. Probability = product of the two, assuming independence. Move = the Hormuz bundle (average 5-day escalation or de-escalation move; zero for the status quo) + the Fed outcome\'s 2-year shock × each series\' 2-year beta. 60/40 = 0.6 × S&P 500 move + 0.4 × the 10-year price change (≈ −8 × yield change in %). Expected = probability-weighted across the twelve. A stress test (twice the average escalation plus a surprise hike) is shown without a probability.',
  fn: (scenarios, fed_scenarios, event_study, shock_betas) => {
    const ES = new Map(event_study.map((r) => [r.series, r])), B = new Map(shock_betas.map((r) => [r.series, r]));
    const A = ['S&P 500', 'Treasury 2Y', 'UST 10Y', 'HY OAS', 'DXY', 'USD/JPY', 'Gold', 'Brent', 'VIX', 'SMH', 'XLE'];
    const key = (s) => s.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase();
    const geoMove = (dir, s, mult = 1) => { const e = ES.get(s); if (!e || dir === 0) return 0; return mult * (dir > 0 ? e.esc_mean : e.deesc_mean) || 0; };
    const build = (id, label, geo, geoDir, geoMult, fed, y2, prob) => {
      const row = { id, label, geo, fed, y2_shock: y2, probability: prob };
      A.forEach((s) => { const b = B.get(s); const v = geoMove(geoDir, s, geoMult) + (b ? b.b_y2 * y2 : 0); row[key(s)] = Math.round(v * 100) / 100; });
      row.p6040 = Math.round((0.6 * row[key('S&P 500')] + 0.4 * (-0.08 * row[key('UST 10Y')])) * 100) / 100;
      return row;
    };
    const geo = [...scenarios].sort((a, b) => Number(b.direction) - Number(a.direction));
    const fed = [...fed_scenarios].sort((a, b) => a.order - b.order);
    const rows = [];
    const FS = { hike: 'surprise hike', hawkish_hold: 'hawkish hold', neutral_hold: 'neutral hold', dovish_hold: 'dovish hold' };
    geo.forEach((g) => fed.forEach((f) => rows.push(build(`${g.id}_${f.id}`, `${g.scenario} + ${FS[f.id] || f.scenario}`, g.scenario, Number(g.direction), 1, FS[f.id] || f.scenario, Number(f.shock_2y), Math.round(Number(g.probability) * Number(f.probability) * 1000) / 10))));
    rows.sort((a, b) => b.probability - a.probability);
    const exp = { id: 'expected', label: 'Probability-weighted', geo: '—', fed: '—', y2_shock: Math.round(d3.sum(rows, (r) => r.probability * r.y2_shock) / 100 * 10) / 10, probability: Math.round(d3.sum(rows, (r) => r.probability) * 10) / 10 };
    [...A.map(key), 'p6040'].forEach((k) => { exp[k] = Math.round(d3.sum(rows, (r) => (r.probability / 100) * r[k]) * 100) / 100; });
    const hike = fed.find((f) => f.id === 'hike');
    const stress = build('stress', 'Stress test: double escalation + surprise hike', 'Escalation ×2', 1, 2, 'surprise hike', Number(hike.shock_2y), null);
    return [...rows, exp, stress].map((r, i) => ({ ...r, order: i + 1 }));
  },
});

dash.calc('combo_summary', {
  inputs: ['combo_scenarios'],
  title: 'Scenario stress summary',
  description: 'Across the twelve Hormuz × FOMC pairings: the worst and best 60/40 outcome among scenarios with at least 5% probability, the probability-weighted 60/40 move, and the stress-test 60/40 move.',
  fn: (combo_scenarios) => {
    const real = combo_scenarios.filter((r) => r.probability != null && r.id !== 'expected');
    const plaus = real.filter((r) => r.probability >= 5).sort((a, b) => a.p6040 - b.p6040);
    const worst = plaus[0], best = plaus[plaus.length - 1];
    const exp = combo_scenarios.find((r) => r.id === 'expected'), st = combo_scenarios.find((r) => r.id === 'stress');
    const top = [...real].sort((a, b) => b.probability - a.probability)[0];
    return { worst_label: worst.label, worst_p6040: worst.p6040, worst_prob: worst.probability, best_label: best.label, best_p6040: best.p6040, best_prob: best.probability, expected_p6040: exp.p6040, stress_p6040: st.p6040, stress_spx: st.s_p_500, stress_vix: st.vix, likely_label: top.label, likely_prob: top.probability, likely_p6040: top.p6040 };
  },
});
