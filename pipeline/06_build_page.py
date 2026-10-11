"""Step 6: generates site/dashboard.html, the page fragment. Reuses sections from templates/v2_sections.html (the earlier
version of the page) and adds the Brief, Shocks, Desks, Fed and Method & roadmap views."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import OUT, YAHOO, CAPTURES, CAPTURES_RAW, SITE, TEMPLATES
import html
SRC = os.path.join(TEMPLATES, 'v2_sections.html')
OLD = open(SRC).read().split('\n')
def lines(a, b):  # 1-indexed inclusive
    return '\n'.join(OLD[a - 1:b])

def enc(s):  # value for data-where
    return html.escape(s.replace('&', '%26'), quote=True)
def esc(s):
    return html.escape(s, quote=True)

def m(src, field, where=None, fmt=None, tag='span', cls=None, tone=None, text='—'):
    a = [f'data-source="{src}"', f'data-field="{field}"']
    if where: a.append(f'data-where="{where}"')
    if fmt: a.append(f'data-fmt="{fmt}"')
    if tone: a.append(f'data-tone="{tone}"')
    c = f' class="{cls}"' if cls else ''
    return f'<{tag}{c} {" ".join(a)}>{text}</{tag}>'

def L(series, field, fmt=None, tag='span', cls=None, tone=None):
    return m('latest', field, 'series=' + enc(series), fmt, tag, cls, tone)

def tile(label, series, vfmt, delta, spark=True, note=None):
    sp = f'<div class="spark" data-source="universe" data-spark="{esc(series)}"></div>' if spark else ''
    nt = f'<span class="gr-note">{note}</span>' if note else ''
    return (f'<div class="gr-card gr-kpi"><span class="lab">{label}</span>'
            f'{L(series, "value", vfmt, cls="val dash-skeleton")}'
            f'<span class="delta">{delta}</span>{nt}{sp}</div>')

PCT = lambda s: f'{L(s, "pct_rank", "ord")}'
def d_pw_pct(s, tone=None): return f'<b {attrs(s, "chg_prewar_pct", "spct1", tone)}>—</b> since 27 Feb · {PCT(s)}'
def d_1m_pct(s, tone=None): return f'<b {attrs(s, "chg_1m_pct", "spct1", tone)}>—</b> in a month · {PCT(s)}'
def d_pw_bp(s, tone=None): return f'<b {attrs(s, "chg_prewar_bp", "sbp", tone)}>—</b> since 27 Feb · {PCT(s)}'
def d_1m_bp(s, tone=None): return f'<b {attrs(s, "chg_1m_bp", "sbp", tone)}>—</b> in a month · {PCT(s)}'
def d_pw_abs(s, fmt, tone=None): return f'<b {attrs(s, "chg_prewar", fmt, tone)}>—</b> since 27 Feb · {PCT(s)}'
def d_1m_abs(s, fmt, tone=None): return f'<b {attrs(s, "chg_1m", fmt, tone)}>—</b> in a month · {PCT(s)}'
def d_rank(s): return f'{PCT(s)} · <span {attrs(s, "date", "dshort")}>—</span>'
def attrs(s, field, fmt, tone=None):
    t = f' data-tone="{tone}"' if tone else ''
    return f'data-source="latest" data-field="{field}" data-where="series={enc(s)}" data-fmt="{fmt}"{t}'

# ---------------- DESKS ----------------
DESKS = [
 ('equities', 'Equities', [
   tile('S&amp;P 500', 'S&P 500', 'num2', d_pw_pct('S&P 500', 'up-good')),
   tile('VIX', 'VIX', 'num2', d_rank('VIX')),
   tile('Defense ÷ airlines (ITA ÷ JETS)', 'ITA / JETS', 'num2', d_pw_pct('ITA / JETS')),
   tile('Energy vs market (XLE ÷ S&amp;P ×1000)', 'XLE / S&P 500', 'num2', d_pw_pct('XLE / S&P 500')),
   tile('Semis vs market (SMH ÷ S&amp;P ×1000)', 'SMH / S&P 500', 'num2', d_pw_pct('SMH / S&P 500')),
   tile('TAIEX (Taiwan)', 'TAIEX', 'num2', d_pw_pct('TAIEX', 'up-good')),
   tile('Bovespa (Brazil)', 'Bovespa', 'int', d_1m_pct('Bovespa', 'up-good')),
  ], 'Index and sector ETFs, rebased to 100 on 27 Feb 2026'),
 ('rates', 'Rates', [
   tile('US 3-month bill', 'UST 3M', 'pct2', d_pw_bp('UST 3M', 'up-bad')),
   tile('US 5-year', 'UST 5Y', 'pct2', d_pw_bp('UST 5Y', 'up-bad')),
   tile('US 10-year', 'UST 10Y', 'pct2', d_pw_bp('UST 10Y', 'up-bad')),
   tile('US 30-year', 'UST 30Y', 'pct2', d_pw_bp('UST 30Y', 'up-bad')),
   tile('3m10y curve', '3m10y', 'bpv', d_pw_bp('3m10y')),
   tile('5s30s curve', '5s30s', 'bpv', d_pw_bp('5s30s')),
   ('<div class="gr-card gr-kpi"><span class="lab">10-year split: breakeven + real</span>'
    f'<span class="val">{m("fred_latest", "value", "series_id=T10YIE", "pct2", cls="dash-skeleton")} + {m("fred_latest", "value", "series_id=DFII10", "pct2", cls="dash-skeleton")}</span>'
    f'<span class="delta">Breakeven {m("fred_latest", "chg_bp", "series_id=T10YIE", "sbp")} and real {m("fred_latest", "chg_bp", "series_id=DFII10", "sbp")} over the last five prints · FRED</span></div>'),
   tile('MOVE (Treasury implied vol)', 'MOVE', 'num2', d_rank('MOVE')),
  ], 'Treasury yields, %'),
 ('credit', 'Credit', [
   tile('High-yield OAS', 'HY OAS', 'bpv', d_1m_bp('HY OAS', 'up-bad')),
   tile('BBB OAS', 'BBB OAS', 'bpv', d_1m_bp('BBB OAS', 'up-bad')),
   tile('CCC OAS', 'CCC OAS', 'bpv', d_1m_bp('CCC OAS', 'up-bad')),
   tile('Quality curve: CCC − BBB', 'CCC–BBB', 'bpv', d_1m_bp('CCC–BBB', 'up-bad')),
   tile('EM corporate OAS', 'EM corp OAS', 'bpv', d_1m_bp('EM corp OAS', 'up-bad')),
   ('<div class="gr-card gr-kpi"><span class="lab">US investment-grade OAS</span>'
    f'{m("fred_latest", "value", "series_id=BAMLC0A0CM", "bpv", cls="val dash-skeleton")}'
    f'<span class="delta">{m("fred_latest", "chg_bp", "series_id=BAMLC0A0CM", "sbp", tone="up-bad")} over the last five prints · {m("fred_latest", "date", "series_id=BAMLC0A0CM", "dshort")}</span></div>'),
  ], 'Option-adjusted spreads, %'),
 ('energy', 'Energy', [
   tile('Brent futures, $/bbl', 'Brent', 'usd2', d_pw_pct('Brent', 'up-bad')),
   tile('WTI futures, $/bbl', 'WTI', 'usd2', d_pw_pct('WTI', 'up-bad')),
   tile('Brent − WTI, $/bbl', 'Brent–WTI', 'usd2', d_pw_abs('Brent–WTI', 'susd2')),
   tile('3-2-1 crack, $/bbl', '3-2-1 crack', 'usd2', d_pw_abs('3-2-1 crack', 'susd2', 'up-bad')),
   tile('Diesel crack, $/bbl', 'Diesel crack', 'usd2', d_pw_abs('Diesel crack', 'susd2', 'up-bad')),
   tile('Tanker equity: Frontline (FRO)', 'Frontline (FRO)', 'usd2', d_pw_pct('Frontline (FRO)')),
   tile('OVX (oil implied vol)', 'OVX', 'num2', d_rank('OVX')),
   ('<div class="gr-card gr-kpi"><span class="lab">Hormuz transits per day</span>'
    f'{m("indicators", "value", "id=hormuz_transits", "int", cls="val dash-skeleton")}'
    f'<span class="delta">{m("hormuz_ratio", "pct_of_normal", None, "pct1")} of normal · dated Brent premium {m("premium_latest", "premium", None, "usd2")}</span></div>'),
  ], 'Crude, products and tanker equity, rebased to 100 on 27 Feb 2026'),
 ('metals', 'Metals & Ags', [
   tile('Gold futures, $/oz', 'Gold', 'usd2', d_pw_pct('Gold')),
   tile('GVZ (gold implied vol)', 'GVZ', 'num2', d_rank('GVZ')),
   tile('Copper futures, $/lb', 'Copper', 'usd3', d_pw_pct('Copper')),
   tile('Wheat futures, ¢/bu', 'Wheat', 'num2', d_pw_pct('Wheat', 'up-bad')),
   tile('Cocoa futures, $/t', 'Cocoa', 'int', d_pw_pct('Cocoa')),
  ], 'Commodities, rebased to 100 on 27 Feb 2026'),
 ('fx', 'FX', [
   tile('Dollar index (DXY)', 'DXY', 'num2', d_pw_pct('DXY')),
   tile('USD/JPY', 'USD/JPY', 'num2', d_pw_pct('USD/JPY')),
   tile('USD/CHF', 'USD/CHF', 'num4', d_pw_pct('USD/CHF')),
   tile('USD/CNY', 'USD/CNY', 'num4', d_pw_pct('USD/CNY')),
   tile('USD/INR (oil importer)', 'USD/INR', 'num2', d_pw_pct('USD/INR', 'up-bad')),
   tile('USD/KRW (oil importer)', 'USD/KRW', 'num2', d_pw_pct('USD/KRW', 'up-bad')),
   tile('USD/ZAR', 'USD/ZAR', 'num3', d_pw_pct('USD/ZAR', 'up-bad')),
   tile('USD/BRL (oil exporter)', 'USD/BRL', 'num3', d_pw_pct('USD/BRL', 'up-bad')),
  ], 'Dollar crosses, rebased to 100 on 27 Feb 2026 (up = dollar stronger)'),
 ('vol', 'Volatility', [
   tile('VIX 9-day', 'VIX 9D', 'num2', d_rank('VIX 9D')),
   tile('VIX (30-day)', 'VIX', 'num2', d_rank('VIX')),
   tile('VIX 3-month', 'VIX 3M', 'num2', d_rank('VIX 3M')),
   tile('VIX ÷ VIX 3-month', 'VIX / VIX 3M', 'num2', d_1m_abs('VIX / VIX 3M', 's2')),
   tile('MOVE (rates)', 'MOVE', 'num2', d_rank('MOVE')),
   tile('OVX (oil)', 'OVX', 'num2', d_rank('OVX')),
   tile('GVZ (gold)', 'GVZ', 'num2', d_rank('GVZ')),
  ], 'Implied volatility indices, points'),
]

def desk_panel(slug, name, tiles, chart_title):
    w = 'desk=' + enc(name)
    return f'''
    <div class="gr-desk" id="desk-{slug}" data-desk="{esc(name)}" hidden>
      <div class="gr-card gr-deskhead">
        <div class="gr-cardhead"><h3>{esc(name)} desk</h3>{m("desk_view", "top_flag", w, cls="gr-pill")}</div>
        {m("desk_view", "question", w, tag="p", cls="gr-q")}
        {m("desk_view", "read", w, tag="p", cls="gr-read dash-skeleton")}
      </div>
      <div class="gr-kpis">
        {chr(10).join("        " + t for t in tiles)}
      </div>
      <div class="gr-card">
        <div class="gr-cardhead"><h3>{esc(chart_title)}</h3><span class="gr-note">Click a series to hide or show it</span></div>
        <div class="gr-seg" id="dseg-{slug}" role="group" aria-label="Series"></div>
        <div class="gr-chartbox mid dash-skeleton" id="dchart-{slug}" data-source="universe"><div class="gr-tip" id="dtip-{slug}"></div></div>
      </div>
      <div class="gr-grid">
        <div class="gr-card">
          <h3>Desk signals</h3>
          <p class="gr-note">From the signal board, filtered to this desk.</p>
          <div class="gr-signal-list" id="dsig-{slug}" data-source="signals"></div>
        </div>
        <div class="gr-card">
          <h3>How this desk's series reacted to 2026 escalations</h3>
          <p class="gr-note">Average 5-day move after Middle East escalations and de-escalations; z = move ÷ normal 5-day move.</p>
          <div class="gr-tablewrap">
            <table class="gr-table" id="des-{slug}" data-source="event_study" data-row-key="series">
              <thead><tr><th data-field="series">Series</th><th data-field="esc_mean" class="r">Escalation</th><th data-field="esc_up" class="r">Rose in</th><th data-field="deesc_mean" class="r">De-escalation</th><th data-field="sensitivity" class="r">Sensitivity</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="gr-card">
        <dl class="gr-deskmeta">
          <dt>What we watch</dt>{m("desks", "watch", w, tag="dd")}
          <dt>How the monitor was augmented</dt>{m("desks", "augment", w, tag="dd")}
          <dt>Data still needed</dt>{m("desks", "gaps", w, tag="dd")}
        </dl>
      </div>
    </div>'''

CSS_EXTRA = '''
.gr-bottom { border-left: 3px solid var(--cds-chart-status-critical); padding: var(--cds-pad-xs) 0 var(--cds-pad-xs) var(--cds-pad-md); }
.gr-desknav { display: flex; flex-wrap: wrap; gap: var(--cds-gap-xs); }
.gr-desk { display: flex; flex-direction: column; gap: var(--cds-gap-lg); }
.gr-desk[hidden] { display: none; }
.gr-q { font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); margin: 0; }
.gr-read { margin: 0; line-height: 1.55; max-width: 92ch; }
.gr-deskmeta { display: grid; grid-template-columns: minmax(8rem, 13rem) 1fr; gap: var(--cds-gap-xs) var(--cds-gap-md); margin: 0; font-size: var(--cds-font-size-caption); line-height: 1.5; }
.gr-deskmeta dt { color: var(--color-fg-muted); }
.gr-deskmeta dd { margin: 0; }
.gr-deskcards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); gap: var(--cds-gap-md); }
.gr-deskcard .dh { display: flex; justify-content: space-between; align-items: baseline; gap: var(--cds-gap-sm); flex-wrap: wrap; }
.gr-deskcard .dn { font-weight: 500; }
.gr-deskcard .dr { font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); line-height: 1.5; margin: 0; }
.gr-deskcard .gr-link { margin-top: auto; }
.gr-progress { height: 10px; border-radius: 5px; background: var(--cds-chart-grid); overflow: hidden; display: flex; margin: var(--cds-gap-xs) 0; }
.gr-progress span { height: 100%; }
.gr-keys { display: flex; flex-wrap: wrap; gap: var(--cds-gap-xs) var(--cds-gap-md); font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); }
.gr-keys i { display: inline-block; width: .6rem; height: .6rem; border-radius: 2px; margin-right: .35rem; }
.gr-seg button i { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; margin-right: .35rem; }
.gr-seg button[aria-pressed="false"] i { opacity: .3; }
.gr-seg.lines button[aria-pressed="true"] { background: transparent; color: var(--color-fg); border-color: var(--color-fg-muted); }
.gr-ev { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: var(--cds-gap-md); }
.gr-ev .val { font-family: var(--font-anthropic-serif); font-size: var(--cds-font-size-title); font-variant-numeric: tabular-nums; line-height: 1.15; }
.gr-list { margin: 0; padding-left: 1.1rem; font-size: var(--cds-font-size-caption); line-height: 1.55; display: flex; flex-direction: column; gap: var(--cds-gap-xs); }
.gr-table td.rank { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; width: 1.5rem; }
.gr-scroll { overflow-x: auto; max-width: 100%; }
.gr-sgrid { display: grid; gap: 2px; font-size: var(--cds-font-size-caption); position: relative; min-width: 56rem; }
.gr-sgrid .sc { padding: var(--cds-pad-xs); display: flex; align-items: center; justify-content: center; border-radius: 3px; font-variant-numeric: tabular-nums; min-height: 2.2rem; text-align: center; color: var(--color-fg); }
.gr-sgrid .sh { color: var(--color-fg-muted); align-items: flex-end; line-height: 1.15; font-size: 11px; }
.gr-sgrid .sg { color: var(--color-fg-muted); justify-content: flex-start; border-bottom: 1px solid var(--color-border-line); border-radius: 0; min-height: 1.4rem; }
.gr-sgrid .sr { justify-content: flex-start; text-align: left; font-weight: 500; }
.gr-sim { display: grid; grid-template-columns: minmax(min(100%, 17rem), 20rem) 1fr; gap: var(--cds-gap-md); align-items: start; }
@media (max-width: 760px) { .gr-sim { grid-template-columns: 1fr; } }
.gr-ctrl { display: flex; flex-direction: column; gap: var(--cds-gap-sm); }
.gr-ctrl label { display: flex; justify-content: space-between; font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); gap: var(--cds-gap-sm); }
.gr-ctrl label b { color: var(--color-fg); font-variant-numeric: tabular-nums; }
.gr-ctrl input[type=range] { width: 100%; accent-color: var(--color-fg); }
.gr-simk { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr)); gap: var(--cds-gap-sm); }
.gr-simk > div { border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: var(--cds-pad-sm); display: flex; flex-direction: column; gap: 2px; }
.gr-simk .lab { font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); }
.gr-simk .v { font-family: var(--font-anthropic-serif); font-size: var(--cds-font-size-heading); font-variant-numeric: tabular-nums; }
.gr-simk .zz { font-size: var(--cds-font-size-caption); color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
.tone-gain { color: var(--color-ok); }
.tone-loss { color: var(--color-bad); }
</style>'''

css = lines(1, 106) + CSS_EXTRA

HEADER = f'''
<div class="gr">
  <header class="gr-head">
    <h1 class="gr-title" id="top">Geopolitical risk monitor</h1>
    <p class="gr-take gr-bottom" id="takeaway">
      <b>Bottom line.</b> Regime {m("stress_latest", "regime", tag="b", cls="dash-skeleton")}: stress composite {m("stress_latest", "composite", fmt="int", tag="b", cls="dash-skeleton")}/100 ({m("stress_latest", "composite_chg20", fmt="sint")} in 20 days).
      The Hormuz shock is priced in oil, rates and credit — shock channels at the {m("stress_latest", "shock", fmt="ord")}, high-yield spreads at the {m("stress_latest", "hy", fmt="ord")} — but not in equity volatility (VIX at the {m("stress_latest", "vix", fmt="ord")}), a gap wider than on {m("stress_latest", "gap_pct", fmt="pctint")} of days this year.
      Top idea: {m("trade_ideas", "asset_class", "rank=1", tag="b", cls="dash-skeleton")} — {m("trade_ideas", "signal", "rank=1")}, gap {m("trade_ideas", "gap", "rank=1", "sint")}: {m("trade_ideas", "expression", "rank=1")}.
      Other flags: <span id="take-signals" data-source="signals">—</span>.
    </p>
    <p class="gr-meta">Market closes through {m("latest", "date", "series=S%26P 500", "date", cls="dash-skeleton")}. Event, policy and regulatory entries are researched from linked sources; risk scores, exposure ratings and scenario probabilities are analyst judgments. Research signals, not investment advice.</p>
  </header>

  <nav class="gr-tabs" role="tablist" aria-label="Sections">
    <button class="gr-tab" role="tab" data-tab="brief" aria-selected="true">Brief</button>
    <button class="gr-tab" role="tab" data-tab="signals" aria-selected="false">Signals</button>
    <button class="gr-tab" role="tab" data-tab="shocks" aria-selected="false">Shocks</button>
    <button class="gr-tab" role="tab" data-tab="desks" aria-selected="false">Desks</button>
    <button class="gr-tab" role="tab" data-tab="fed" aria-selected="false">Fed</button>
    <button class="gr-tab" role="tab" data-tab="geo" aria-selected="false">Geopolitics</button>
    <button class="gr-tab" role="tab" data-tab="policy" aria-selected="false">Policy</button>
    <button class="gr-tab" role="tab" data-tab="calendar" aria-selected="false">Calendar</button>
    <button class="gr-tab" role="tab" data-tab="method" aria-selected="false">Method &amp; roadmap</button>
  </nav>
'''

def kpi(label, val, delta, spark=None):
    sp = f'<div class="spark" data-source="universe" data-spark="{esc(spark)}"></div>' if spark else ''
    return f'<div class="gr-card gr-kpi"><span class="lab">{label}</span>{val}<span class="delta">{delta}</span>{sp}</div>'

BRIEF = f'''
  <!-- ================= BRIEF ================= -->
  <section class="gr-page" id="brief">
    <div class="gr-section">
      <p class="gr-group-label">Cross-asset dashboard</p>
      <div class="gr-kpis">
        {kpi("Stress composite (0–100)", m("stress_latest", "composite", fmt="int", cls="val dash-skeleton"), f'{m("stress_latest", "regime", tag="b")} · {m("stress_latest", "composite_chg20", fmt="sint", tone="up-bad")} in 20 days')}
        {kpi("Pricing gap: shock vs equity vol", m("stress_latest", "gap", fmt="sint", cls="val dash-skeleton"), f'{m("stress_latest", "gap_pct", fmt="ord")} of its history')}
        {kpi("Brent futures, $/bbl", L("Brent", "value", "usd2", cls="val dash-skeleton"), d_pw_pct("Brent", "up-bad"), "Brent")}
        {kpi("US 10-year yield", L("UST 10Y", "value", "pct2", cls="val dash-skeleton"), d_pw_bp("UST 10Y", "up-bad"), "UST 10Y")}
        {kpi("High-yield spread", L("HY OAS", "value", "bpv", cls="val dash-skeleton"), d_1m_bp("HY OAS", "up-bad"), "HY OAS")}
        {kpi("VIX", L("VIX", "value", "num2", cls="val dash-skeleton"), d_rank("VIX"), "VIX")}
        {kpi("Dollar index", L("DXY", "value", "num2", cls="val dash-skeleton"), d_pw_pct("DXY"), "DXY")}
        {kpi("Hormuz transits per day", m("indicators", "value", "id=hormuz_transits", "int", cls="val dash-skeleton"), f'{m("hormuz_ratio", "pct_of_normal", fmt="pct1")} of normal · {m("indicators", "as_of", "id=hormuz_transits", "dshort")}')}
      </div>
    </div>

    <div class="gr-grid" id="fed-brief">
      <div class="gr-card">
        <div class="gr-cardhead"><h3>Fed watch</h3>{m("fed_read", "stance", cls="gr-pill")}</div>
        <p class="gr-note">Next decision 28 Oct, in <b>{m("fed_now", "days_to_meeting", fmt="int")}</b> days · hike odds {m("fed_now", "oct_hike", fmt="pct1", tag="b")} for October, {m("fed_now", "dec_hike", fmt="pct1", tag="b")} for December · 2-year {m("fed_now", "t2y_effr", fmt="sint")} bp over EFFR</p>
        {m("fed_read", "policy_read", tag="p", cls="gr-read dash-skeleton")}
        <button class="gr-link" type="button" data-goto="fed">Fed tracker →</button>
      </div>
      <div class="gr-card">
        <div class="gr-cardhead"><h3>Fed plumbing</h3>{m("fed_read", "plumbing", cls="gr-pill")}</div>
        <p class="gr-note">Reserves {m("fed_now", "reserves_tn", fmt="tn2", tag="b")} · EFFR − IORB {m("fed_now", "effr_iorb", fmt="sbp", tag="b")} · discount window {m("fed_now", "dw_latest", fmt="bn1", tag="b")}</p>
        {m("fed_read", "plumbing_read", tag="p", cls="gr-read dash-skeleton")}
      </div>
    </div>

    <div class="gr-card" id="ideas-card">
      <div class="gr-cardhead"><h3>Trade ideas for the week</h3><button class="gr-link" type="button" data-goto="signals">Full signal board →</button></div>
      <p class="gr-note">Ranked: under-priced and confirmed first, then rich premia to fade, then exposures to watch. Evidence = share of past escalations in which the gauge moved the risk-priced way. Expected move = scenario-weighted 5 days.</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="ideas-table" data-source="trade_ideas" data-row-key="asset_class">
          <thead><tr>
            <th data-field="rank">#</th><th data-field="asset_class">Asset</th><th data-field="signal">Signal</th><th data-field="conviction" class="gr-hide-narrow">Conviction</th>
            <th data-field="gap" class="r">Gap</th><th data-field="risk_hit" class="r gr-hide-narrow">Evidence</th><th data-field="expected_5d" class="r gr-hide-narrow">Exp. 5d</th>
            <th data-field="expression">Trade expression</th><th data-field="vehicle" class="gr-hide-narrow">Vehicle</th><th data-field="pm_tilt" class="gr-hide-narrow">PM tilt</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="gr-grid">
      <div class="gr-card" id="movers-card">
        <h3>What moved this week</h3>
        <p class="gr-note">Largest 5-day moves across every tracked series, ranked by size against each series' normal week.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="movers-table" data-source="movers" data-row-key="series">
            <thead><tr><th data-field="series">Series</th><th data-field="desk" class="gr-hide-narrow">Desk</th><th data-field="chg_5d" class="r">5-day move</th><th data-field="z_5d" class="r">vs normal</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="gr-card" id="upcoming-card">
        <div class="gr-cardhead"><h3>Next 30 days</h3><button class="gr-link" type="button" data-goto="calendar">Full calendar →</button></div>
        <div class="gr-tablewrap">
          <table class="gr-table" id="upcoming-table" data-source="upcoming" data-row-key="key">
            <thead><tr><th data-field="date">Date</th><th data-field="days" class="r">In</th><th data-field="event">Event</th><th data-field="assets" class="gr-hide-narrow">Assets</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">Desk views</h2>
      <p class="gr-sub">One rule-based read per desk, built from its own metrics; open a desk for charts, signals and event sensitivity.</p>
      <div class="gr-deskcards" id="desk-cards" data-source="desk_view"></div>
    </div>

    <div class="gr-grid">
      <div class="gr-card" id="evidence-card">
        <h3>Does the pricing-gap signal work?</h3>
        <p class="gr-note">In-sample, one year of daily data: what VIX did over the next 10 trading days, by the width of the gap.</p>
        <div class="gr-ev">
          <div><span class="gr-note">Gap ≥ 50 (n = {m("gap_backtest", "n", "order=1", "int")})</span>{m("gap_backtest", "vix_up", "order=1", "pctint", tag="div", cls="val dash-skeleton")}<span class="gr-note">of windows VIX rose · avg {m("gap_backtest", "vix_fwd", "order=1", "spts")}</span></div>
          <div><span class="gr-note">Gap &lt; 25 (n = {m("gap_backtest", "n", "order=3", "int")})</span>{m("gap_backtest", "vix_up", "order=3", "pctint", tag="div", cls="val dash-skeleton")}<span class="gr-note">of windows VIX rose · avg {m("gap_backtest", "vix_fwd", "order=3", "spts")}</span></div>
        </div>
        <p class="gr-note">S&amp;P 500 over the same windows: {m("gap_backtest", "spx_fwd", "order=1", "spct2")} after a wide gap vs {m("gap_backtest", "spx_fwd", "order=3", "spct2")} after a narrow one. Overlapping windows; walk-forward test is on the roadmap.</p>
      </div>
      <div class="gr-card" id="stress-card">
        <div class="gr-cardhead"><h3>Scenario stress test</h3><button class="gr-link" type="button" data-goto="shocks">Shock lab →</button></div>
        <p class="gr-note">Hormuz scenarios × the 28 Oct FOMC outcome, measured on a 60/40 S&amp;P / 10-year portfolio.</p>
        <div class="gr-ev">
          <div><span class="gr-note">Most likely ({m("combo_summary", "likely_prob", fmt="pct1")})</span>{m("combo_summary", "likely_p6040", fmt="spct2", tag="div", cls="val dash-skeleton")}<span class="gr-note">{m("combo_summary", "likely_label")}</span></div>
          <div><span class="gr-note">Worst with ≥ 5% odds ({m("combo_summary", "worst_prob", fmt="pct1")})</span>{m("combo_summary", "worst_p6040", fmt="spct2", tag="div", cls="val dash-skeleton")}<span class="gr-note">{m("combo_summary", "worst_label")}</span></div>
        </div>
        <p class="gr-note">Probability-weighted {m("combo_summary", "expected_p6040", fmt="spct2", tag="b")}. Stress test (double escalation + surprise hike): 60/40 {m("combo_summary", "stress_p6040", fmt="spct2", tag="b")}, VIX {m("combo_summary", "stress_vix", fmt="spct1", tag="b")}.</p>
      </div>
      <div class="gr-card" id="headway-card">
        <div class="gr-cardhead"><h3>Headway on deliverables</h3><button class="gr-link" type="button" data-goto="method">Roadmap →</button></div>
        <p class="gr-note"><b>{m("roadmap_stats", "live_pct", fmt="pctint", text="—")}</b> of {m("roadmap_stats", "total", fmt="int")} deliverables are live ({m("roadmap_stats", "live", fmt="int")} full, {m("roadmap_stats", "proxy", fmt="int")} on proxy data); {m("roadmap_stats", "in_progress", fmt="int")} in progress; {m("roadmap_stats", "vendor", fmt="int")} need vendor data.</p>
        <div class="gr-progress" id="headway-bar" data-source="roadmap_stats"></div>
        <div class="gr-keys" id="headway-keys"></div>
        <ul class="gr-list" id="headway-next" data-source="roadmap"></ul>
      </div>
    </div>

    <div class="gr-card" id="hotspots">
      <div class="gr-cardhead"><h3>Global hotspots by region</h3><button class="gr-link" type="button" data-goto="geo">Geopolitics →</button></div>
      <div class="gr-tablewrap">
        <table class="gr-table" id="region-table" data-source="region_summary" data-row-key="region">
          <thead><tr><th data-field="region">Region</th><th data-field="live" class="r">Live</th><th data-field="escalating" class="r">Escalating</th><th data-field="max_risk" class="r">Max risk</th><th data-field="top">Top catalyst</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </section>
'''

SIGNALS = f'''
  <!-- ================= SIGNALS ================= -->
  <section class="gr-page" id="signals" hidden>
{lines(236, 270)}

{lines(272, 276)}

    <div class="gr-card" id="signal-board">
      <div class="gr-cardhead"><h3>Signal board</h3><span class="gr-note">Sort by any column</span></div>
      <p class="gr-note">Under-priced = gap ≥ +25 and confirmed in 2026 events and, where available, 2019–2025 analogs · Watch = gap ≥ +25 otherwise · Rich = gap ≤ −25 · Fair otherwise. Evidence = share of escalations in which the gauge moved the risk-priced way (n events). Moves in % (bp for yields and spreads).</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="sig-table" data-source="signals" data-row-key="asset_class">
          <thead><tr>
            <th data-field="asset_class"><button data-sort="asset_class">Asset</button></th>
            <th data-field="desk" class="gr-hide-narrow"><button data-sort="desk">Desk</button></th>
            <th data-field="gauge" class="gr-hide-narrow">Gauge</th>
            <th data-field="exposure_index" class="r"><button data-sort="exposure_index">Exposure</button></th>
            <th data-field="priced" class="r"><button data-sort="priced">Priced</button></th>
            <th data-field="gap" class="r"><button data-sort="gap">Gap</button></th>
            <th data-field="confirmed"><button data-sort="confirmed">Confirmed</button></th>
            <th data-field="risk_hit" class="r gr-hide-narrow"><button data-sort="risk_hit">Evidence</button></th>
            <th data-field="signal"><button data-sort="signal">Signal</button></th>
            <th data-field="conviction" class="gr-hide-narrow">Conviction</th>
            <th data-field="vehicle" class="gr-hide-narrow">Vehicle</th>
            <th data-field="mom_z20" class="r gr-hide-narrow"><button data-sort="mom_z20">20d z</button></th>
            <th data-field="oil_beta_60d" class="r gr-hide-narrow"><button data-sort="oil_beta_60d">Oil β</button></th>
            <th data-field="expected_5d" class="r gr-hide-narrow"><button data-sort="expected_5d">Exp. 5d</button></th>
            <th data-field="expression">Expression</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="gr-grid">
      <div class="gr-card" id="gap-bars-card">
        <h3>Risk-premium gap by asset</h3>
        <p class="gr-note">Exposure index minus market pricing. Bars beyond the dashed ±25 lines trigger a signal.</p>
        <div class="gr-chartbox mid dash-skeleton" id="gapbars" data-source="signals"><div class="gr-tip" id="gapbars-tip"></div></div>
      </div>
      <div class="gr-card" id="hedge-card">
        <h3>Which instruments actually hedged 2026 escalations?</h3>
        <p class="gr-note">Average 5-day move after escalations ÷ normal 5-day move, across every tracked series: the ten best hedges and the six worst.</p>
        <div class="gr-chartbox mid dash-skeleton" id="hedgebars" data-source="hedge_rank"><div class="gr-tip" id="hedge-tip"></div></div>
      </div>
    </div>

    <div class="gr-grid">
      <div class="gr-card" id="backtest-card">
        <h3>Backtest: pricing gap vs forward volatility</h3>
        <p class="gr-note">VIX change (points) and S&amp;P 500 return over the next 10 trading days, by the gap on the day. In-sample with overlapping windows.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="bt-table" data-source="gap_backtest" data-row-key="bucket">
            <thead><tr><th data-field="bucket">Gap</th><th data-field="n" class="r">Days</th><th data-field="vix_up" class="r">VIX rose</th><th data-field="vix_fwd" class="r">VIX 10d</th><th data-field="spx_fwd" class="r">S&amp;P 10d</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="gr-card" id="analogs-card">
        <h3>History vs 2026: does this year behave like past shocks?</h3>
        <p class="gr-note">Average 5-day move after escalations in eight 2019–2025 analogs vs seven 2026 events. "No" means the regime has changed the asset's response.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="an-table" data-source="analogs" data-row-key="series">
            <thead><tr><th data-field="series">Series</th><th data-field="hist_esc_mean" class="r">2019–25</th><th data-field="hist_esc_up" class="r">Rose in</th><th data-field="cur_esc_mean" class="r">2026</th><th data-field="cur_esc_up" class="r">Rose in</th><th data-field="agree">Agree</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="gr-card" id="analog-events-card">
      <h3>Historical analogs, event by event</h3>
      <p class="gr-note">5-day moves from the last close before each event (% for prices, bp for the 10-year).</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="ae-table" data-source="analog_events" data-row-key="event_id">
          <thead><tr><th data-field="date">Date</th><th data-field="event">Event</th><th data-field="direction" class="gr-hide-narrow">Type</th><th data-field="Brent" class="r">Brent</th><th data-field="VIX" class="r">VIX</th><th data-field="S&amp;P 500" class="r">S&amp;P 500</th><th data-field="Gold" class="r">Gold</th><th data-field="UST 10Y" class="r">10Y</th><th data-field="DXY" class="r">DXY</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="gr-card" id="event-table-card">
      <div class="gr-cardhead"><h3>2026 event study, every tracked series</h3><div class="gr-seg" id="es-seg" role="group" aria-label="Desk"></div></div>
      <p class="gr-note">From the last close before each event to the fifth close after it. Escalations: {m("event_study", "esc_n", "series=Brent", "int")} events; de-escalations: {m("event_study", "deesc_n", "series=Brent", "int")}. Small samples — directional evidence, not estimates.</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="es-table" data-source="event_study" data-row-key="series">
          <thead><tr>
            <th data-field="series">Series</th><th data-field="desk" class="gr-hide-narrow">Desk</th>
            <th data-field="esc_mean" class="r">Escalation avg</th><th data-field="esc_up" class="r">Rose in</th>
            <th data-field="deesc_mean" class="r">De-escalation avg</th><th data-field="deesc_up" class="r">Rose in</th>
            <th data-field="sensitivity" class="r">Sensitivity</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

{lines(333, 354)}

    <div class="gr-section" id="playbooks">
      <h2 class="gr-h2">Playbooks by audience</h2>
      <div class="gr-grid3">
        <div class="gr-card gr-play" id="play-traders">
          <h3>Traders</h3>
          <span class="aud">Event-driven, 1–5 day horizon</span>
          <ul>
            <li>On a Hormuz escalation Brent has moved {m("analogs", "cur_esc_mean", "series=Brent", "spct1", tag="b")} over 5 days in 2026 and {m("analogs", "hist_esc_mean", "series=Brent", "spct1", tag="b")} in 2019–2025 analogs; on de-escalation {m("event_study", "deesc_mean", "series=Brent", "spct1", tag="b")}.</li>
            <li>Best escalation hedges by vol-adjusted response: <span id="play-hedges" data-source="hedge_rank">—</span>. Product cracks have out-hedged crude.</li>
            <li>Gold has not hedged this year ({m("analogs", "cur_esc_mean", "series=Gold", "spct1", tag="b")}, up in {m("analogs", "cur_esc_up", "series=Gold", "pctint")}) although it did in past shocks ({m("analogs", "hist_esc_mean", "series=Gold", "spct1")}, up in {m("analogs", "hist_esc_up", "series=Gold", "pctint")}): a hiking Fed and strong dollar override the haven reflex.</li>
            <li>Front-end equity vol is the cheapest tail: VIX 9-day at the {L("VIX 9D", "pct_rank", "ord", tag="b")} and VIX ÷ VIX 3-month at {L("VIX / VIX 3M", "value", "num2", tag="b")}.</li>
            <li>Momentum filter: avoid adding where the 20-day z-score exceeds ±2 — Bovespa is at {L("Bovespa", "mom_z20", "sz", tag="b")}, the dollar at {L("DXY", "mom_z20", "sz", tag="b")}.</li>
          </ul>
        </div>
        <div class="gr-card gr-play" id="play-pms">
          <h3>Portfolio managers</h3>
          <span class="aud">Positioning and hedge budget, weeks</span>
          <ul>
            <li>Spend hedge budget where the gap is wide and confirmed: <span id="play-under" data-source="signals">—</span>.</li>
            <li>Exposed but unconfirmed (size small or hedge indirectly): <span id="play-watch" data-source="signals">—</span>.</li>
            <li>Premia to monetize: <span id="play-rich" data-source="signals">—</span>.</li>
            <li>Duration is not a hedge in this regime: the 10-year moved {m("analogs", "cur_esc_mean", "series=UST 10Y", "sbp1", tag="b")} after 2026 escalations vs {m("analogs", "hist_esc_mean", "series=UST 10Y", "sbp1", tag="b")} in past shocks, and {m("oil_beta", "beta_60d", "series=UST 10Y", "s2")} bp per 1% move in Brent.</li>
            <li>Book oil-shock sensitivity: S&amp;P 500 daily correlation with Brent is {m("oil_beta", "corr_60d", "series=S%26P 500", "s2", tag="b")} over 60 days; airlines (JETS) {m("oil_beta", "corr_60d", "series=JETS", "s2")}; energy (XLE) {m("oil_beta", "corr_60d", "series=XLE", "s2")}.</li>
          </ul>
        </div>
        <div class="gr-card gr-play" id="play-strategists">
          <h3>Investment strategists</h3>
          <span class="aud">Regime and narrative, months</span>
          <ul>
            <li>Regime is {m("stress_latest", "regime", tag="b")}: composite {m("stress_latest", "composite", fmt="int")}/100, with shock channels at the {m("stress_latest", "shock", fmt="ord")} and equity vol at the {m("stress_latest", "vix", fmt="ord")}.</li>
            <li>Evidence for the gap: when it was ≥ 50, VIX rose over the next 10 days in {m("gap_backtest", "vix_up", "order=1", "pctint", tag="b")} of cases vs {m("gap_backtest", "vix_up", "order=3", "pctint", tag="b")} when narrow.</li>
            <li>Scenario skew: escalation {m("scenarios", "probability", "id=esc", "frac", tag="b")} vs de-escalation {m("scenarios", "probability", "id=deesc", "frac", tag="b")} gives Brent an expected 5-day move of {m("scenario_moves", "expected", "series=Brent", "spct1", tag="b")} and the 10-year {m("scenario_moves", "expected", "series=UST 10Y", "sbp1", tag="b")}.</li>
            <li>The war is an inflation shock more than a growth shock: the curve is bear-steepening (3m10y {L("3m10y", "chg_prewar_bp", "sbp")} since 27 Feb), the dollar is at the {L("DXY", "pct_rank", "ord")} and gold is {L("Gold", "chg_prewar_pct", "spct1")} since the war began.</li>
            <li>Next regime breaks: CPI (14 Oct), Brazil runoff (25 Oct), FOMC (28 Oct), US midterms (3 Nov), funding cliff (11 Dec), US–China truce cliff (10 Jan).</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
'''

DESK_NAV = '\n'.join(f'      <button type="button" data-desk="{slug}">{esc(name)}</button>' for slug, name, _, _ in DESKS)

SHOCKS = f'''
  <!-- ================= SHOCKS ================= -->
  <section class="gr-page" id="shocks" hidden>
    <div class="gr-section">
      <h2 class="gr-h2">Cross-asset shock lab</h2>
      <p class="gr-sub">Six defined shocks applied to every tracked series. Geopolitical shocks use measured 5-day moves after real events; oil, Fed and equity shocks use same-day sensitivities from a three-factor model (2-year yield, Brent, S&amp;P 500) on one year of daily data, so they can be stacked without double counting. Colour shows what a long holder of each asset gains or loses, relative to that asset's normal move.</p>
    </div>

    <div class="gr-card" id="matrix-card">
      <div class="gr-cardhead"><h3>Shock × asset impact matrix</h3><div class="gr-seg" id="mx-seg" role="group" aria-label="Display"></div></div>
      <div class="gr-keys" id="mx-keys"></div>
      <div class="gr-scroll"><div class="gr-sgrid dash-skeleton" id="mx-grid" data-source="shock_matrix"><div class="gr-tip" id="mx-tip"></div></div></div>
      <p class="gr-note">Moves in % for prices, bp for yields and spreads, $ for cracks. Event rows are 5-day; factor rows are same-day. A dash means no history for that series (the 2019–25 analogs cover six core series).</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="shockdef-table" data-source="shocks" data-row-key="id">
          <thead><tr><th data-field="label">Shock</th><th data-field="type">Type</th><th data-field="horizon" class="r">Days</th><th data-field="description">Definition</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="gr-card" id="sim-card" data-source="shock_betas event_study analogs">
      <div class="gr-cardhead"><h3>Shock simulator</h3><span class="gr-note">Build a shock; every series reprices instantly</span></div>
      <div class="gr-seg" id="sim-presets" role="group" aria-label="Presets"></div>
      <div class="gr-sim">
        <div class="gr-ctrl">
          <span class="gr-note">Geopolitical event (measured 5-day bundle)</span>
          <div class="gr-seg" id="sim-geo" role="group" aria-label="Geopolitical event"></div>
          <label for="sim-int">Event intensity <b id="sim-int-v">1.0×</b></label><input type="range" id="sim-int" min="0.5" max="3" step="0.5" value="1">
          <label for="sim-y2">Fed: 2-year yield shock <b id="sim-y2-v">0 bp</b></label><input type="range" id="sim-y2" min="-30" max="30" step="1" value="0">
          <label for="sim-oil">Extra oil shock (Brent) <b id="sim-oil-v">0%</b></label><input type="range" id="sim-oil" min="-20" max="30" step="1" value="0">
          <label for="sim-spx">Extra equity shock (S&amp;P) <b id="sim-spx-v">0%</b></label><input type="range" id="sim-spx" min="-10" max="5" step="0.5" value="0">
          <p class="gr-note" id="sim-note"></p>
        </div>
        <div class="gr-section">
          <div class="gr-simk" id="sim-kpis"></div>
          <div class="gr-chartbox mid" id="sim-bars"><div class="gr-tip" id="sim-tip"></div></div>
        </div>
      </div>
      <div class="gr-cardhead"><span class="gr-note">All series, largest impact first (z = move ÷ normal move over the horizon)</span><div class="gr-seg" id="sim-desk" role="group" aria-label="Desk"></div></div>
      <div class="gr-tablewrap"><table class="gr-table" id="sim-table"><thead><tr><th>Series</th><th class="gr-hide-narrow">Desk</th><th class="r">Move</th><th class="r">z</th><th class="r">Long holder</th></tr></thead><tbody></tbody></table></div>
    </div>

    <div class="gr-section">
      <div class="gr-cardhead"><h2 class="gr-h2">Transmission and hedges by shock</h2><div class="gr-seg" id="tr-seg" role="group" aria-label="Shock"></div></div>
      <div class="gr-grid">
        <div class="gr-card" id="trans-card">
          <h3>Where the shock lands</h3>
          <p class="gr-note">Average size of the move by desk, in units of each series' normal move; the label names the desk's biggest mover.</p>
          <div class="gr-chartbox small dash-skeleton" id="trans-chart" data-source="shock_transmission"><div class="gr-tip" id="trans-tip"></div></div>
        </div>
        <div class="gr-card" id="rank-card">
          <h3>Ranked impacts</h3>
          <p class="gr-note">The eight biggest rises and falls (z). Bar colour: a long holder gains (green) or loses (red).</p>
          <div class="gr-chartbox mid dash-skeleton" id="rank-chart" data-source="shock_matrix"><div class="gr-tip" id="rank-tip"></div></div>
        </div>
      </div>
      <div class="gr-card" id="hedge-table-card">
        <h3>Best hedges and most exposed positions</h3>
        <p class="gr-note">Ranked by what a long holder earns relative to the asset's normal move. "History disagrees" = the 2019–25 analogs moved the other way, so the hedge is regime-dependent.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="hedge-table" data-source="shock_hedges" data-row-key="key">
            <thead><tr><th data-field="side">Role</th><th data-field="rank" class="r">#</th><th data-field="series">Series</th><th data-field="desk" class="gr-hide-narrow">Desk</th><th data-field="move" class="r">Move</th><th data-field="pos_z" class="r">Long holder z</th><th data-field="flag">Note</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">Combined scenarios: Hormuz × 28 October FOMC</h2>
      <p class="gr-sub">The three Hormuz scenarios crossed with the four FOMC outcomes. Probabilities multiply, assuming the two are independent (in reality an escalation raises hike odds). Each move adds the 5-day Hormuz bundle to the Fed's same-day reaction, so horizons are mixed: read magnitudes as orders of size.</p>
      <div class="gr-grid">
        <div class="gr-card" id="combo-map-card">
          <h3>Scenario map: probability vs 60/40 impact</h3>
          <p class="gr-note">60/40 = 0.6 × S&amp;P 500 + 0.4 × 10-year Treasury price (duration 8). Dashed line = probability-weighted outcome.</p>
          <div class="gr-chartbox mid dash-skeleton" id="combo-chart" data-source="combo_scenarios"><div class="gr-tip" id="combo-tip"></div></div>
        </div>
        <div class="gr-card" id="combo-sum-card">
          <h3>What the grid says</h3>
          <ul class="gr-list">
            <li>Most likely: <b>{m("combo_summary", "likely_label")}</b> ({m("combo_summary", "likely_prob", fmt="pct1")}), 60/40 {m("combo_summary", "likely_p6040", fmt="spct2")}.</li>
            <li>Worst plausible (≥ 5% odds): <b>{m("combo_summary", "worst_label")}</b> ({m("combo_summary", "worst_prob", fmt="pct1")}), 60/40 {m("combo_summary", "worst_p6040", fmt="spct2")}.</li>
            <li>Best plausible: <b>{m("combo_summary", "best_label")}</b> ({m("combo_summary", "best_prob", fmt="pct1")}), 60/40 {m("combo_summary", "best_p6040", fmt="spct2")}.</li>
            <li>Probability-weighted 60/40: <b>{m("combo_summary", "expected_p6040", fmt="spct2")}</b>. Stress test: 60/40 {m("combo_summary", "stress_p6040", fmt="spct2")}, S&amp;P {m("combo_summary", "stress_spx", fmt="spct2")}, VIX {m("combo_summary", "stress_vix", fmt="spct1")}.</li>
            <li>Bonds and equities fall together in the hawkish cases: in this regime, duration does not offset equity risk.</li>
          </ul>
        </div>
      </div>
      <div class="gr-card" id="combo-table-card">
        <div class="gr-tablewrap">
          <table class="gr-table" id="combo-table" data-source="combo_scenarios" data-row-key="id">
            <thead><tr><th data-field="label">Scenario</th><th data-field="probability" class="r">Prob.</th><th data-field="y2_shock" class="r gr-hide-narrow">Fed 2Y shock</th><th data-field="p6040" class="r">60/40</th><th data-field="s_p_500" class="r">S&amp;P</th><th data-field="ust_10y" class="r">10Y</th><th data-field="treasury_2y" class="r gr-hide-narrow">2Y</th><th data-field="hy_oas" class="r gr-hide-narrow">HY OAS</th><th data-field="dxy" class="r gr-hide-narrow">DXY</th><th data-field="gold" class="r">Gold</th><th data-field="brent" class="r gr-hide-narrow">Brent</th><th data-field="vix" class="r">VIX</th><th></th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
'''

DESKS_HTML = f'''
  <!-- ================= DESKS ================= -->
  <section class="gr-page" id="desks" hidden>
    <div class="gr-section">
      <p class="gr-sub">Each desk gets the same structure: the question it answers, a rule-based read, its metrics with history, the signals that touch it, how its instruments behaved in 2026 escalations, and what data would sharpen it.</p>
      <div class="gr-seg gr-desknav" id="desk-nav" role="group" aria-label="Desk">
{DESK_NAV}
      </div>
    </div>
{''.join(desk_panel(*d) for d in DESKS)}
  </section>
'''

GEO = f'''
  <!-- ================= GEOPOLITICS ================= -->
  <section class="gr-page" id="geo" hidden>
{lines(216, 225)}

{lines(227, 228)}
      <p class="gr-note">Analyst risk score 4–5 of 5.</p>
      <div class="gr-top" id="top-list" data-source="catalysts"></div>
    </div>

{lines(409, 431)}

    <h2 class="gr-h2">Regional market gauges</h2>
{lines(509, 596)}

{lines(433, 470)}

{lines(612, 626)}

{lines(472, 504).replace('Oct FOMC hike (CME, after Sep meeting)', 'Oct FOMC hike, market-implied (7 Oct)')}
  </section>
'''

POLICY = f'''
  <!-- ================= POLICY ================= -->
  <section class="gr-page" id="policy" hidden>
{lines(656, 665)}

    <div class="gr-section">
      <h2 class="gr-h2">Washington monitor</h2>
{lines(670, 673)}
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">US and EU regulation</h2>
{lines(678, 691)}
    </div>
  </section>
'''

CAL = f'''
  <!-- ================= CALENDAR ================= -->
  <section class="gr-page" id="calendar" hidden>
{lines(696, 706)}
  </section>
'''


FED = f'''
  <!-- ================= FED ================= -->
  <section class="gr-page" id="fed" hidden>
    <div class="gr-section">
      <p class="gr-group-label">Policy and plumbing at a glance · corridor data to {m("fed_now", "date", fmt="dshort")}, balance sheet to {m("fed_now", "week", fmt="dshort")}</p>
      <div class="gr-kpis">
        {kpi("Fed funds target range", m("fed_now", "range", cls="val dash-skeleton"), f'IORB {m("fed_now", "iorb", fmt="pct2")} · standing repo {m("fed_now", "srf_rate", fmt="pct2")} · ON RRP {m("fed_now", "rrp_rate", fmt="pct2")}')}
        {kpi("Next FOMC: 28 Oct", m("fed_now", "days_to_meeting", fmt="days", cls="val dash-skeleton"), f'Hike odds {m("fed_now", "oct_hike", fmt="pct1", tag="b")} ({m("fed_now", "oct_hike_date", fmt="dshort")}), peak {m("fed_now", "oct_hike_peak", fmt="pct1")}')}
        {kpi("December hike odds", m("fed_now", "dec_hike", fmt="pct1", cls="val dash-skeleton"), f'Market-implied, {m("fed_now", "dec_hike_date", fmt="dshort")} · decision 9 Dec with new dots')}
        {kpi("2-year minus EFFR", m("fed_now", "t2y_effr", fmt="sbp", cls="val dash-skeleton"), f'≈ {m("fed_now", "hikes_2y", fmt="num1")} hikes of 25 bp priced · 2-year {m("fed_now", "t2y_chg20", fmt="sbp", tone="up-bad")} in 20 days')}
        {kpi("EFFR − IORB", m("fed_now", "effr_iorb", fmt="sbp", cls="val dash-skeleton"), 'Rising toward 0 = reserves getting scarce')}
        {kpi("SOFR − IORB, 5-day avg", m("fed_now", "sofr_iorb_avg5", fmt="sbp1", cls="val dash-skeleton"), f'20-day high {m("fed_now", "sofr_iorb_max20", fmt="sbp")} (quarter-end)')}
        {kpi("Bank reserves", m("fed_now", "reserves_tn", fmt="tn2", cls="val dash-skeleton"), f'{m("fed_now", "reserves_chg4w", fmt="sbn")} in 4 weeks · TGA {m("fed_now", "tga_bn", fmt="bn0")}')}
        {kpi("Discount window", m("fed_now", "dw_latest", fmt="bn1", cls="val dash-skeleton"), f'{m("fed_now", "dw_chg6w", fmt="sbn1", tone="up-bad")} in 6 weeks · standing repo {m("fed_now", "srf_latest", fmt="bn1")}')}
      </div>
    </div>

    <div class="gr-grid">
      <div class="gr-card">
        <div class="gr-cardhead"><h3>Policy read</h3>{m("fed_read", "stance", cls="gr-pill")}</div>
        {m("fed_read", "policy_read", tag="p", cls="gr-read dash-skeleton")}
        <p class="gr-note">Fedspeak tone, last 30 days: {m("fed_now", "tone_30d", fmt="s2", tag="b")} ({m("fed_now", "tone_label")}) · last decision {m("fed_now", "last_decision")} on {m("fed_now", "last_decision_date", fmt="dshort")}, vote {m("fed_now", "last_vote")}</p>
      </div>
      <div class="gr-card">
        <div class="gr-cardhead"><h3>Plumbing read</h3>{m("fed_read", "plumbing", cls="gr-pill")}</div>
        {m("fed_read", "plumbing_read", tag="p", cls="gr-read dash-skeleton")}
        <p class="gr-note">{m("fed_read", "n_watch", fmt="int")} indicators on watch, {m("fed_read", "n_stress", fmt="int")} in stress. Thresholds and trader actions are in the monitor below.</p>
      </div>
    </div>

    <div class="gr-card" id="corridor-card">
      <div class="gr-cardhead"><h3>The rates corridor: where overnight money trades inside the Fed's range</h3><div class="gr-keys" id="corridor-keys"></div></div>
      <p class="gr-note">Shaded band = target range. IORB is the rate paid on reserves; the top of the range is the standing repo rate (ceiling). EFFR drifting up toward IORB, or SOFR's 99th percentile touching the ceiling, are the earliest signs that reserves are getting scarce. The 3-month bill shows where the market expects the range to go.</p>
      <div class="gr-chartbox dash-skeleton" id="corridor-chart" data-source="fed_rates"><div class="gr-tip" id="corridor-tip"></div></div>
    </div>

    <div class="gr-card" id="monitor-card">
      <h3>Plumbing monitor: what each micro-signal means and what to do</h3>
      <p class="gr-note">Readings against analyst thresholds. Normal = no action; Watch = position for it; Stress = act.</p>
      <div class="gr-tablewrap">
        <table class="gr-table" id="fedmon-table" data-source="fed_monitor" data-row-key="id">
          <thead><tr><th data-field="indicator">Indicator</th><th data-field="value" class="r">Latest</th><th data-field="status">Status</th><th data-field="detail" class="gr-hide-narrow">Context</th><th data-field="threshold" class="gr-hide-narrow">Threshold</th><th data-field="signals" class="gr-hide-narrow">What it signals</th><th data-field="implication">Market implication</th><th data-field="action">Trader action</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">Balance sheet and liquidity</h2>
      <p class="gr-sub">Weekly H.4.1 levels (Wednesdays) and daily ON RRP. Runoff ended on 1 Dec 2025; bill purchases ran from 12 Dec and were paused in September.</p>
      <div class="gr-grid3" id="fed-minis">
        <div class="gr-card"><h3>Bank reserves</h3><div class="gr-chartbox small dash-skeleton" id="mini-reserves" data-source="fed_week"><div class="gr-tip" id="tip-reserves"></div></div></div>
        <div class="gr-card"><h3>Treasury General Account</h3><div class="gr-chartbox small dash-skeleton" id="mini-tga" data-source="fed_week"><div class="gr-tip" id="tip-tga"></div></div></div>
        <div class="gr-card"><h3>Fed Treasury holdings</h3><div class="gr-chartbox small dash-skeleton" id="mini-ust" data-source="fed_week"><div class="gr-tip" id="tip-ust"></div></div></div>
        <div class="gr-card"><h3>ON RRP take-up (daily)</h3><div class="gr-chartbox small dash-skeleton" id="mini-rrp" data-source="fed_rates"><div class="gr-tip" id="tip-rrp"></div></div></div>
        <div class="gr-card"><h3>Standing repo facility (Wednesday)</h3><div class="gr-chartbox small dash-skeleton" id="mini-srf" data-source="fed_week"><div class="gr-tip" id="tip-srf"></div></div></div>
        <div class="gr-card"><h3>Discount window (primary credit)</h3><div class="gr-chartbox small dash-skeleton" id="mini-dw" data-source="fed_week"><div class="gr-tip" id="tip-dw"></div></div></div>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">Policy path: decisions, dissents and market reaction</h2>
      <div class="gr-card" id="fomc-card">
        <p class="gr-note">Decision-day moves, close to close: yields in bp, others in %. Hawkish dissent = wanted tighter policy; dovish = wanted easier.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="fomc-table" data-source="fomc_reactions" data-row-key="date">
            <thead><tr><th data-field="date">Date</th><th data-field="decision">Decision</th><th data-field="range" class="gr-hide-narrow">Range</th><th data-field="vote">Vote</th><th data-field="dissents" class="gr-hide-narrow">Dissents</th><th data-field="guidance" class="gr-hide-narrow">Guidance and dots</th><th data-field="d_2y" class="r">2Y</th><th data-field="d_10y" class="r">10Y</th><th data-field="d_spx" class="r">S&amp;P</th><th data-field="d_dxy" class="r gr-hide-narrow">DXY</th><th data-field="d_gold" class="r gr-hide-narrow">Gold</th><th data-field="d_vix" class="r gr-hide-narrow">VIX</th><th data-field="source_title" class="gr-hide-narrow">Source</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="gr-grid">
        <div class="gr-card" id="dissent-card">
          <h3>Dissent drift: from doves to hawks</h3>
          <p class="gr-note">Dissents per meeting. Above the line = wanted tighter policy; below = wanted easier. The committee's pressure flipped in April.</p>
          <div class="gr-chartbox mid dash-skeleton" id="dissent-chart" data-source="fomc_reactions"><div class="gr-tip" id="dissent-tip"></div></div>
        </div>
        <div class="gr-card" id="pricing-card">
          <h3>Market pricing of the next hikes</h3>
          <p class="gr-note">Dated snapshots; no live futures feed yet (on the roadmap).</p>
          <div class="gr-tablewrap">
            <table class="gr-table" id="fedp-table" data-source="fed_pricing" data-row-key="key">
              <thead><tr><th data-field="date">Date</th><th data-field="meeting">Meeting</th><th data-field="prob_hike" class="r">Hike odds</th><th data-field="platform">Source type</th><th data-field="source_title" class="gr-hide-narrow">Source</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">Communications tracker</h2>
      <p class="gr-sub">Every dated Fed communication with an analyst stance score: +2 favours hiking now, +1 expects more hikes without urgency, 0 data-dependent, −1 leans against further hikes, −2 favours cuts.</p>
      <div class="gr-card" id="tone-card">
        <div class="gr-chartbox small dash-skeleton" id="tone-chart" data-source="fed_comms"><div class="gr-tip" id="tone-tip"></div></div>
        <div class="gr-tablewrap">
          <table class="gr-table" id="comms-table" data-source="fed_comms" data-row-key="key">
            <thead><tr><th data-field="date">Date</th><th data-field="speaker">Who</th><th data-field="role" class="gr-hide-narrow">Role</th><th data-field="stance">Stance</th><th data-field="timing">Timing signal</th><th data-field="summary" class="gr-hide-narrow">What they said</th><th data-field="source_title" class="gr-hide-narrow">Source</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="gr-section">
      <h2 class="gr-h2">27–28 October FOMC: outcomes, what they signal, trader breakdown</h2>
      <div class="gr-card" id="fedscen-card">
        <p class="gr-note">The hike probability is market-implied; the split of the hold outcomes is an analyst judgment informed by the minutes and Fedspeak. Each scenario carries an assumed 2-year shock.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="fedscen-table" data-source="fed_scenarios" data-row-key="id">
            <thead><tr><th data-field="scenario">Outcome</th><th data-field="probability" class="r">Probability</th><th data-field="shock_2y" class="r">2Y shock</th><th data-field="signals">What it signals</th><th data-field="trade">Trader playbook</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="gr-card" id="fedbd-card">
        <h3>Signal breakdown by asset</h3>
        <p class="gr-note">Expected same-day move = scenario's 2-year shock × the asset's rate-shock beta (oil held constant). Expected = probability-weighted. "Agree" = Fed-event days point the same way.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="fedbd-table" data-source="fed_breakdown" data-row-key="asset">
            <thead><tr><th data-field="asset">Asset</th><th data-field="beta_10bp" class="r gr-hide-narrow">Per +10 bp 2Y</th><th data-field="hike" class="r">Hike</th><th data-field="hawkish_hold" class="r">Hawkish hold</th><th data-field="neutral_hold" class="r">Neutral hold</th><th data-field="dovish_hold" class="r">Dovish hold</th><th data-field="expected" class="r">Expected</th><th data-field="agree" class="gr-hide-narrow">Agree</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="gr-card" id="fedbeta-card">
        <h3>Rate-shock betas and FOMC-day sensitivity</h3>
        <p class="gr-note">One year of daily data. Hawkish Fed days have tightened high-yield spreads this year: the market has rewarded inflation-fighting credibility rather than punishing tighter policy.</p>
        <div class="gr-tablewrap">
          <table class="gr-table" id="fedbeta-table" data-source="fed_betas" data-row-key="asset">
            <thead><tr><th data-field="asset">Asset</th><th data-field="beta_10bp" class="r">Beta, oil held constant</th><th data-field="event_beta_10bp" class="r">Fed-event days</th><th data-field="agree">Agree</th><th data-field="corr" class="r gr-hide-narrow">Correlation</th><th data-field="fomc_abs" class="r">Avg FOMC-day move</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
'''

METHOD = f'''
  <!-- ================= METHOD & ROADMAP ================= -->
  <section class="gr-page" id="method" hidden>
    <div class="gr-section">
      <h2 class="gr-h2">Deliverables and headway</h2>
      <p class="gr-sub">What the toolkit delivers today, to whom, on what data — and what is next. Status: Live, Live on proxy data, In progress, or Needs vendor data.</p>
      <div class="gr-kpis">
        {kpi("Live share", m("roadmap_stats", "live_pct", fmt="pctint", cls="val dash-skeleton"), f'{m("roadmap_stats", "live", fmt="int")} live + {m("roadmap_stats", "proxy", fmt="int")} on proxy data, of {m("roadmap_stats", "total", fmt="int")}')}
        {kpi("In progress", m("roadmap_stats", "in_progress", fmt="int", cls="val dash-skeleton"), "Being built now")}
        {kpi("Needs vendor data", m("roadmap_stats", "vendor", fmt="int", cls="val dash-skeleton"), "Blocked on paid feeds")}
        {kpi("Series tracked", '<span class="val dash-skeleton" id="n-series" data-source="latest">—</span>', 'Core markets, desk data and derived spreads')}
      </div>
      <div class="gr-card" id="roadmap-card">
        <div class="gr-seg" id="rm-seg" role="group" aria-label="Status"></div>
        <div class="gr-tablewrap">
          <table class="gr-table" id="rm-table" data-source="roadmap" data-row-key="id">
            <thead><tr><th data-field="deliverable">Deliverable</th><th data-field="status">Status</th><th data-field="audience" class="gr-hide-narrow">For</th><th data-field="desk" class="gr-hide-narrow">Desk</th><th data-field="detail" class="gr-hide-narrow">What it is</th><th data-field="next_step">Next step</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

{lines(637, 641).replace("on the Quant signals tab", "on the Signals tab")}

    <div class="gr-card gr-method" id="signal-method">
      <h3>Method and caveats</h3>
      <ol>
        <li><b>Exposure index.</b> For each asset class, the sum over live catalysts of (analyst risk score 1–5 × exposure rating 0–3 to the catalyst's channel), scaled so the most exposed asset = 100. It measures how much geopolitical risk an asset should carry, not its direction.</li>
        <li><b>Pricing.</b> The asset's gauge as a percentile of its one-year range, inverted where a high reading means complacency (TAIEX, Bovespa). For yields, spreads, volatility and USD crosses, high = risk priced.</li>
        <li><b>Gap and thresholds.</b> Gap = exposure − pricing; ±25 triggers a signal, ±50 is high conviction. Thresholds are heuristics, not optimized.</li>
        <li><b>Confirmation.</b> A positive gap becomes "Under-priced" only if the gauge moved in its risk-priced direction on average and in at least half of the 2026 escalations and, for the six series with history, also in the 2019–2025 analogs. One sample agreeing = "Mixed" (Watch). This keeps the engine from recommending hedges that have not worked (gold this year) or whose behaviour has flipped (the 10-year).</li>
        <li><b>Vehicle.</b> Where an implied-vol index exists (OVX for oil, GVZ for gold, MOVE for rates), the spot percentile is compared with the implied-vol percentile: options are preferred when implied vol is ≥ 25 points cheaper, outright when ≥ 25 richer.</li>
        <li><b>Desk reads.</b> Rule-based sentences built from each desk's metrics — e.g. Rates labels the curve bear-steepening when the 10-year and 3m10y have both risen since 27 Feb; Credit flags decompression when CCC–BBB widened more than 25 bp in a month; Volatility calls the VIX curve in contango below 0.95 and inverted above 1.</li>
        <li><b>Momentum, oil beta, scenarios.</b> 20-day change ÷ (daily vol × √20); 60-day beta to Brent's daily move; scenario-weighted 5-day move from 2026 event-study averages and analyst probabilities.</li>
        <li><b>Evidence.</b> In-sample: VIX rose over the following 10 days in {m("gap_backtest", "vix_up", "order=1", "pctint")} of windows when the gap was ≥ 50 vs {m("gap_backtest", "vix_up", "order=3", "pctint")} when it was below 25.</li>
        <li><b>Fed tracker.</b> Plumbing statuses compare each micro-indicator with written thresholds (see the monitor). Fedspeak tone is the average analyst stance score (−2 to +2) of dated communications over 30 days. Scenario moves = assumed 2-year shock × each asset's beta to the 2-year with Brent held constant (two-factor regression on one year of daily data), cross-checked against Fed-event days only.</li>
        <li><b>Shock lab.</b> Event shocks are measured average 5-day moves (2026 events or 2019–25 analogs). Factor shocks use ordered sensitivities: the 2-year and Brent enter one regression together (so a Fed shock carries its usual equity reaction), and the S&amp;P 500 is added third, so the equity shock is a sell-off beyond what rates and oil explain. Combined scenarios multiply probabilities as if independent and add a 5-day geopolitical bundle to a same-day Fed reaction.</li>
        <li><b>Caveats.</b> One year of daily data (desk series from 3 Nov 2025) and small event samples; percentiles use the full window (look-ahead); overlapping backtest windows; no transaction costs; tanker equity, index-level implied vol and five-print breakevens are proxies for vendor data.</li>
      </ol>
    </div>

    <div class="gr-card" id="coverage-card">
      <h3>Data coverage</h3>
      <p class="gr-note">Every series in the monitor, its desk, source and window. Derived series are calculated in the page from the inputs named.</p>
      <div class="gr-seg" id="cov-seg" role="group" aria-label="Desk"></div>
      <div class="gr-tablewrap">
        <table class="gr-table" id="cov-table" data-source="latest" data-row-key="series">
          <thead><tr><th data-field="series">Series</th><th data-field="desk">Desk</th><th data-field="ticker" class="gr-hide-narrow">Ticker</th><th data-field="source" class="gr-hide-narrow">Source</th><th data-field="start" class="gr-hide-narrow">From</th><th data-field="date">Last</th><th data-field="n_obs" class="r gr-hide-narrow">Obs.</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </section>
</div>

<script src="calcs.js"></script>
<script src="app.js"></script>
'''

out = css + '\n' + HEADER + BRIEF + SIGNALS + SHOCKS + DESKS_HTML + FED + GEO + POLICY + CAL + METHOD
open(os.path.join(SITE, 'dashboard.html'), 'w').write(out)
print(len(out))
