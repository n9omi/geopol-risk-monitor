"""Step 3: desk-level metadata: hist_events, desks, roadmap; extends framework and fred. Run after steps 1 and 2."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import OUT, YAHOO, CAPTURES, CAPTURES_RAW, SITE, TEMPLATES
import json
O = OUT
def load(n): return json.load(open(O + n + '.json'))
def dump(n, d): json.dump(d, open(O + n + '.json', 'w'), ensure_ascii=False)
YH = 'https://finance.yahoo.com/quote/BZ%3DF/history/?period1={}&period2={}'
W1, W2, W3, W4 = YH.format(1567296000, 1580515200), YH.format(1643673600, 1647302400), YH.format(1695600000, 1714521600), YH.format(1748736000, 1752105600)
hist_events = [
  dict(id='h_abqaiq', date='2019-09-16', direction=1, short='Abqaiq strikes', title='Drone and missile strikes knock out Abqaiq and Khurais (14 Sep 2019)', region='Middle East', channel='hormuz', source_url=W1),
  dict(id='h_soleimani', date='2020-01-03', direction=1, short='Soleimani killed', title='US strike kills IRGC commander Qasem Soleimani', region='Middle East', channel='hormuz', source_url=W1),
  dict(id='h_standdown', date='2020-01-08', direction=-1, short='US–Iran stand down', title='Iran strikes US bases in Iraq; both sides signal de-escalation', region='Middle East', channel='hormuz', source_url=W1),
  dict(id='h_ukraine', date='2022-02-24', direction=1, short='Russia invades Ukraine', title='Russia launches full-scale invasion of Ukraine', region='Europe', channel='russia_europe', source_url=W2),
  dict(id='h_oct7', date='2023-10-09', direction=1, short='7 Oct attack', title='Hamas attack on Israel (7 Oct 2023); first trading day after', region='Middle East', channel='hormuz', source_url=W3),
  dict(id='h_apr24', date='2024-04-15', direction=1, short='Iran strikes Israel', title='Iran launches first direct drone and missile strike on Israel (13 Apr 2024)', region='Middle East', channel='hormuz', source_url=W3),
  dict(id='h_jun25', date='2025-06-13', direction=1, short='Israel strikes Iran', title='Israel strikes Iranian nuclear and military sites (13 Jun 2025)', region='Middle East', channel='hormuz', source_url=W4),
  dict(id='h_cease25', date='2025-06-24', direction=-1, short='Israel–Iran ceasefire', title='Israel–Iran ceasefire takes hold (24 Jun 2025)', region='Middle East', channel='hormuz', source_url=W4),
]
for e in hist_events: e['source_title'] = 'Yahoo Finance price history'
dump('hist_events', hist_events)

desks = [
 dict(desk='Equities', order=1, question='Which sectors and regions carry the war and election risk — and is it in the price?',
      watch='Energy vs airlines on tanker-strike headlines; semis vs the index on export-control and Taiwan news; Bovespa into the 25 Oct runoff.',
      augment='Sector pairs (defense/airlines, energy/market, semis/market) isolate the geopolitical factor better than the index alone.',
      gaps='Single-stock options skew, earnings-revision breadth, positioning data (CFTC, prime brokerage).'),
 dict(desk='Rates', order=2, question='Is the war an inflation shock (bear steepening) or a growth scare (bull flattening)?',
      watch='September CPI (14 Oct), FOMC (28 Oct), oil pass-through into breakevens, long-end supply.',
      augment='Curve shape (3m10y, 5s30s) and the breakeven / real-yield split show whether oil is feeding inflation expectations.',
      gaps='Swaption skew, term-premium model, auction tails, swap spreads.'),
 dict(desk='Credit', order=3, question='Is stress spreading from the weakest borrowers into the core?',
      watch='CCC–BBB decompression, EM corporate spreads vs US high yield, energy-sector defaults if oil reverses.',
      augment='Quality curve (CCC–BBB) and EM vs US separate default risk from broad risk-off.',
      gaps='Sovereign and single-name CDS (Gulf, Israel, Turkey, South Africa, Brazil), loan prices, fund flows.'),
 dict(desk='Energy', order=4, question='How much of the Hormuz disruption is in prompt barrels, products and freight?',
      watch='Daily Hormuz transits, dated-vs-futures premium, product cracks, tanker strikes and blockade enforcement.',
      augment='Product cracks and a tanker-equity freight proxy capture refining and shipping stress that crude alone misses; OVX shows whether options price the tail.',
      gaps='Tanker day-rates, war-risk insurance premia, an AIS transit feed, futures time spreads.'),
 dict(desk='Metals & Ags', order=5, question='Which commodities carry supply risk from conflict zones, and is gold still a hedge?',
      watch='Gold vs real yields, copper on DRC/Zambia supply and China demand, wheat and fertilizer on Black Sea and Gulf disruption, cocoa on West Africa.',
      augment='Wheat adds the food and fertilizer channel; GVZ shows whether gold\'s haven role is priced in options.',
      gaps='Fertilizer prices (urea, ammonia), LME spreads, physical premiums.'),
 dict(desk='FX', order=6, question='Who funds the shock and who is the haven?',
      watch='Dollar vs yen and franc as haven test; oil importers (INR, KRW, TWD) vs exporters (BRL, COP, MXN); CNY fixing.',
      augment='Haven test (JPY, CHF) and an importer/exporter split for EM currencies.',
      gaps='25-delta risk reversals, forward points / carry, CFTC positioning.'),
 dict(desk='Volatility', order=7, question='Is the market paying for the tail, and in which asset is protection cheapest?',
      watch='VIX term structure inversion, MOVE vs VIX, OVX and GVZ vs spot moves.',
      augment='Term structure (9-day, 30-day, 3-month) shows whether stress is front-loaded; cross-asset vol shows where hedges are cheapest.',
      gaps='Full vol surfaces and skew, variance-swap levels, dealer gamma.'),
]
dump('desks', desks)

roadmap = [
 ('stress', 'Daily stress composite and regime label', 'Directors', 'Cross-asset', 'Live', 'Five-gauge percentile composite with Calm / Elevated / Stressed regimes.', 'Add rolling (not full-window) percentiles.'),
 ('board', 'Signal board: 17 asset classes', 'PMs', 'Cross-asset', 'Live', 'Exposure vs pricing gap with confirmation, conviction and expression.', 'Add position sizing by vol and correlation.'),
 ('confirm', 'Event-study confirmation, 2026 plus 2019–2025 history', 'PMs, traders', 'Cross-asset', 'Live', 'Seven 2026 Middle East events plus eight historical analogs for six core gauges.', 'Extend history to every desk series.'),
 ('scen', 'Scenario-weighted expected moves', 'Strategists', 'Cross-asset', 'Live', 'Analyst probabilities × event-study averages.', 'Let PMs override probabilities in the page.'),
 ('vehicle', 'Options vs outright vehicle check', 'Traders', 'Energy, Metals, Rates', 'Live (proxy)', 'Compares spot percentile with implied-vol percentile (OVX, GVZ, MOVE).', 'Replace index vol with surface and skew data.'),
 ('desks', 'Desk views for seven desks', 'Desk heads', 'All desks', 'Live', 'Rule-based read, desk metrics, signals and event sensitivity per desk.', 'Desk-owned watchlists.'),
 ('cracks', 'Product cracks (3-2-1, diesel) and Brent–WTI', 'Energy', 'Energy', 'Live', 'From NYMEX RBOB, ULSD and WTI futures.', 'Add Brent time spreads.'),
 ('freight', 'Tanker freight and war-risk premia', 'Energy', 'Energy', 'Live (proxy)', 'Frontline equity as a freight proxy.', 'Needs a Baltic tanker-rate and war-risk insurance feed.'),
 ('qcurve', 'Credit quality curve (CCC–BBB) and EM spreads', 'Credit', 'Credit', 'Live', 'ICE BofA OAS from FRED.', 'Add sector (energy) spreads.'),
 ('curve', 'Curve shape and breakeven / real split', 'Rates', 'Rates', 'Live (proxy)', '3m10y and 5s30s daily; breakeven and real yield from latest FRED prints only.', 'Load full breakeven history.'),
 ('pairs', 'Sector pairs: defense/airlines, energy/market, semis/market', 'Equities', 'Equities', 'Live', 'ETF ratios as geopolitical factors.', 'Add regional (Gulf, Israel) equity indices.'),
 ('vterm', 'Volatility term structure and cross-asset vol', 'Volatility', 'Volatility', 'Live', 'VIX 9-day / 30-day / 3-month, MOVE, OVX, GVZ.', 'Add skew indices.'),
 ('rr', 'FX risk reversals and carry', 'FX', 'FX', 'Needs vendor data', 'Not available from free sources.', 'Bloomberg or Refinitiv feed.'),
 ('cds', 'Sovereign CDS for exposed countries', 'Credit', 'Credit', 'Needs vendor data', 'Israel, Saudi Arabia, Turkey, South Africa, Brazil, Taiwan.', 'Markit or Bloomberg feed.'),
 ('ais', 'Ship-tracking transit feed', 'Energy', 'Energy', 'Needs vendor data', 'Transits are analyst snapshots from news reports today.', 'AIS vendor (Kpler, Vortexa, MarineTraffic).'),
 ('bt_in', 'In-sample backtest of the pricing gap', 'Strategists', 'Volatility', 'Live', 'Forward 10-day VIX change when the gap is wide vs narrow.', 'Walk-forward version below.'),
 ('bt_oos', 'Walk-forward backtest with costs', 'Strategists', 'Cross-asset', 'In progress', 'Needs rolling percentiles and more history.', 'Extend data to 2015 and re-run.'),
 ('refresh', 'Automated daily data refresh', 'All', 'Cross-asset', 'In progress', 'Data is a snapshot to 9 Oct 2026.', 'Scheduled pipeline from market-data APIs.'),
 ('policy', 'Washington and US/EU regulatory tracker', 'Global Affairs', 'Policy', 'Live', 'Congress, Supreme Court, agencies, EU measures with next dates.', 'Add bill-text and docket alerts.'),
 ('cal', 'Catalyst calendar with 30-day view', 'All', 'Cross-asset', 'Live', 'Data, central-bank, political, court and regulatory dates.', 'Calendar export to Outlook.'),
 ('odds', 'Prediction-market odds tracker', 'Strategists', 'Policy', 'Live (proxy)', 'Two snapshots (March, October) from Kalshi and Polymarket.', 'Daily odds history.'),
]
dump('roadmap', [dict(id=a, deliverable=b, audience=c, desk=d, status=e, detail=f, next_step=g, order=i + 1) for i, (a, b, c, d, e, f, g) in enumerate(roadmap)])

fw = load('framework')
DESK = {'Energy': 'Energy', 'Rates': 'Rates', 'Rates volatility': 'Volatility', 'US equities': 'Equities', 'Credit': 'Credit', 'Gold': 'Metals & Ags',
        'US dollar': 'FX', 'Taiwan semis': 'Equities', 'Korea FX': 'FX', 'India FX': 'FX', 'Industrial metals': 'Metals & Ags', 'Softs': 'Metals & Ags',
        'South Africa FX': 'FX', 'Brazil equities': 'Equities', 'Brazil FX': 'FX', 'Mexico FX': 'FX', 'Colombia FX': 'FX'}
OPT = {'Energy': 'OVX', 'Gold': 'GVZ', 'Rates': 'MOVE'}
for f in fw:
    f['desk'] = DESK[f['asset_class']]
    f['opt_series'] = OPT.get(f['asset_class'])
dump('framework', fw)

fred = load('fred')
fred = [r for r in fred if r['series_id'] not in ('T10YIE', 'DFII10')]
for sid, title, rows in [
  ('T10YIE', '10-year breakeven inflation rate', [('2026-10-05', 2.36), ('2026-10-06', 2.36), ('2026-10-07', 2.36), ('2026-10-08', 2.35), ('2026-10-09', 2.33)]),
  ('DFII10', '10-year TIPS real yield', [('2026-10-02', 2.92), ('2026-10-05', 2.95), ('2026-10-06', 2.91), ('2026-10-07', 2.92), ('2026-10-08', 2.87)])]:
    for d, v in rows: fred.append(dict(series_id=sid, title=title, unit='%', date=d, value=v, url='https://fred.stlouisfed.org/series/' + sid))
dump('fred', fred)
print('ok', len(hist_events), len(desks), len(roadmap), len(fw), len(fred))
