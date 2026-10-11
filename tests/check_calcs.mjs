// Runs every calculation, checks invariants, and exports the key outputs to outputs/ (CSV + a markdown brief).
import * as d3 from 'd3';
import fs from 'fs';
import path from 'path';
import { loadAll, ROOT } from './lib.mjs';
const { data, calcs, order, timings } = loadAll();
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } };
check(data.signals.length === data.framework.length, 'one signal per asset class');
check(data.trade_ideas.length > 0 && data.trade_ideas.length <= 6, 'trade ideas 1-6');
check(Math.abs(d3.sum(data.scenarios, (s) => s.probability) - 1) < 1e-9, 'Hormuz scenario probabilities sum to 1');
check(Math.abs(d3.sum(data.fed_scenarios, (s) => s.probability) - 1) < 0.001, 'FOMC scenario probabilities sum to 1');
const combos = data.combo_scenarios.filter((r) => r.probability != null && r.id !== 'expected');
check(combos.length === data.scenarios.length * data.fed_scenarios.length, 'combined grid is complete');
check(Math.abs(d3.sum(combos, (r) => r.probability) - 100) < 0.5, 'combined probabilities sum to ~100%');
check(data.shock_matrix.length > 0 && data.shock_betas.every((b) => isFinite(b.b_y2) && isFinite(b.b_oil) && isFinite(b.b_spx)), 'shock betas finite');
const self = (s, k) => data.shock_betas.find((b) => b.series === s)[k];
check(Math.abs(self('Treasury 2Y', 'b_y2') - 1) < 1e-6 && Math.abs(self('Brent', 'b_oil') - 1) < 1e-6 && Math.abs(self('S&P 500', 'b_spx') - 1) < 1e-6, 'factor self-betas equal 1');
check(data.fed_monitor.every((m) => ['Normal', 'Watch', 'Stress', 'Info'].includes(m.status)), 'Fed monitor statuses valid');
check(data.latest.every((r) => r.pct_rank >= 0 && r.pct_rank <= 100), 'percentile ranks in [0, 100]');
// signal and regime labels follow their stated rules (gaps and composite are rounded, so boundaries are inclusive)
check(data.signals.every((s) => s.signal !== 'Rich' || s.gap <= -25), 'Rich only when gap ≤ −25');
check(data.signals.every((s) => !['Under-priced', 'Watch'].includes(s.signal) || s.gap >= 25), 'Under-priced / Watch only when gap ≥ +25');
check(data.signals.every((s) => s.signal !== 'Fair' || Math.abs(s.gap) <= 25), 'Fair only when |gap| ≤ 25');
check(data.signals.every((s) => s.signal !== 'Under-priced' || s.confirmed === 'Yes'), 'Under-priced requires confirmation');
check(data.signals.every((s) => s.conviction !== 'High' || Math.abs(s.gap) >= 50), 'High conviction only when |gap| ≥ 50');
const sl = data.stress_latest;
check({ Stressed: sl.composite >= 70, Elevated: sl.composite >= 45 && sl.composite <= 70, Calm: sl.composite <= 45 }[sl.regime] === true, 'regime label matches composite thresholds');
check(data.shock_hedges.every((h) => h.side !== 'Hedge' || data.shock_hedges.every((x) => x.shock !== h.shock || x.side !== 'Exposed' || h.pos_z >= x.pos_z)), 'every hedge ranks above every exposure for its shock');
console.log(`calculations: ${order.length} run; slowest: ${Object.entries(timings).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v} ms`).join(', ')}`);

// ---- export outputs ----
const OUTD = path.join(ROOT, 'outputs');
fs.mkdirSync(OUTD, { recursive: true });
const csv = (name, rows, cols) => fs.writeFileSync(path.join(OUTD, name + '.csv'), d3.csvFormat(rows, cols) + '\n');
csv('signal_board', data.signals, ['asset_class', 'desk', 'gauge', 'exposure_index', 'priced', 'gap', 'confirmed', 'risk_hit', 'evidence_n', 'signal', 'conviction', 'vehicle', 'mom_z20', 'oil_beta_60d', 'expected_5d', 'expression', 'pm_tilt']);
csv('trade_ideas', data.trade_ideas, ['rank', 'asset_class', 'signal', 'conviction', 'gap', 'risk_hit', 'evidence_n', 'expected_5d', 'vehicle', 'expression', 'pm_tilt']);
csv('latest_readings', data.latest, ['series', 'desk', 'kind', 'unit', 'ticker', 'source', 'start', 'date', 'value', 'chg_5d', 'chg_1m', 'chg_prewar', 'pct_rank', 'mom_z20', 'z_5d']);
csv('event_study_2026', data.event_study, ['series', 'desk', 'kind', 'esc_mean', 'esc_up', 'esc_n', 'deesc_mean', 'deesc_up', 'deesc_n', 'sensitivity']);
csv('history_vs_2026', data.analogs);
csv('gap_backtest', data.gap_backtest);
csv('desk_reads', data.desk_view, ['desk', 'question', 'read', 'n_flags', 'top_flag']);
csv('shock_matrix', data.shock_matrix, ['shock', 'shock_label', 'series', 'desk', 'kind', 'unit', 'horizon', 'move', 'z', 'pos_z', 'basis']);
csv('shock_hedges', data.shock_hedges, ['shock', 'side', 'rank', 'series', 'desk', 'move', 'pos_z', 'flag']);
csv('shock_betas', data.shock_betas);
csv('combined_scenarios', data.combo_scenarios);
csv('fed_monitor', data.fed_monitor, ['indicator', 'value', 'unit', 'status', 'detail', 'threshold', 'signals', 'implication', 'action']);
csv('fomc_reactions', data.fomc_reactions);
csv('fed_scenario_breakdown', data.fed_breakdown);

const s = data.stress_latest, f = data.fed_read, n = data.fed_now, c = data.combo_summary, t = data.trade_ideas;
const sg = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
const ord = (v) => { const k = Math.round(v), t = k % 100; return k + (t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[k % 10] || 'th'); };
const md = [
  '# Latest brief', '', `_Generated by \`tests/check_calcs.mjs\` from the datasets in \`site/data/\` (stress composite as of ${s.date}, the last day every input series has a close). Research signals, not investment advice._`, '',
  '## Regime', '',
  `- **${s.regime}**: stress composite ${s.composite}/100 (${sg(s.composite_chg20, 0)} in 20 days).`,
  `- Pricing gap ${s.gap} (shock channels at the ${ord(s.shock)} percentile vs VIX at the ${ord(s.vix)}), wider than on ${s.gap_pct}% of days in the past year.`, '',
  '## Trade ideas', '', '| # | Asset | Signal | Gap | Evidence | Expression |', '|---|---|---|---:|---|---|',
  ...t.map((r) => `| ${r.rank} | ${r.asset_class} | ${r.signal} (${r.conviction}) | ${sg(r.gap, 0)} | ${r.risk_hit}% of ${r.evidence_n} | ${r.expression} |`), '',
  '## Fed', '', `- ${f.policy_read}`, `- ${f.plumbing_read}`, '',
  '## Scenario stress test (Hormuz × 28 Oct FOMC, 60/40 portfolio)', '',
  `- Most likely: ${c.likely_label} (${c.likely_prob}%): ${sg(c.likely_p6040, 2)}%.`,
  `- Worst with at least 5% odds: ${c.worst_label} (${c.worst_prob}%): ${sg(c.worst_p6040, 2)}%.`,
  `- Probability-weighted: ${sg(c.expected_p6040, 2)}%. Stress test (double escalation + surprise hike): ${sg(c.stress_p6040, 2)}%, VIX ${sg(c.stress_vix)}%.`, '',
  '## Desk reads', '', ...data.desk_view.map((d) => `- **${d.desk}** — ${d.read}`), '',
  '## Evidence for the pricing-gap signal (in-sample)', '',
  ...data.gap_backtest.map((b) => `- ${b.bucket}: n = ${b.n}, VIX rose over the next 10 days in ${b.vix_up}% of windows (avg ${sg(b.vix_fwd, 2)} pts); S&P 500 ${sg(b.spx_fwd, 2)}%.`), '',
];
fs.writeFileSync(path.join(OUTD, 'latest_brief.md'), md.join('\n'));

// ---- calculation reference ----
const ref = ['# Calculation reference', '', '_Generated by `tests/check_calcs.mjs` from the titles and descriptions in `site/calcs.js`, in execution order._', ''];
order.forEach((id) => { const c = calcs[id]; ref.push(`## \`${id}\` — ${c.title}`, '', `Inputs: ${c.inputs.map((i) => '`' + i + '`').join(', ')}`, '', c.description, ''); });
fs.writeFileSync(path.join(ROOT, 'docs', 'calculations.md'), ref.join('\n'));
console.log(fails ? `${fails} check(s) failed` : 'all calculation checks passed');
process.exit(fails ? 1 : 0);
