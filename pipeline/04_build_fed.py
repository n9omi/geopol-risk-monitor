"""Step 4: Fed tracker datasets. Run after steps 1–3.
Sources: NY Fed Markets API (EFFR, SOFR, ON RRP), US Treasury par yield curve, FRED H.4.1 weekly series,
plus researched FOMC decisions, communications, market pricing and analyst scenarios."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import OUT, YAHOO, CAPTURES, CAPTURES_RAW, SITE, TEMPLATES
import json, re, datetime as dt
O = OUT
RAW = json.load(open(CAPTURES_RAW))
def dump(n, d): json.dump(d, open(O + n + '.json', 'w'), ensure_ascii=False)
def load(n): return json.load(open(O + n + '.json'))
def rows(url): return [l.strip() for l in RAW[url].splitlines() if re.match(r'^\d{4}-\d{2}-\d{2},', l.strip())]
wk = lambda d: dt.date.fromisoformat(d).weekday() < 5
NY = 'https://markets.newyorkfed.org/api/'
U_SOFR = NY + 'rates/secured/sofr/search.json?startDate=2025-10-01&endDate=2026-10-09'
U_EFFR = NY + 'rates/unsecured/effr/search.json?startDate=2025-10-01&endDate=2026-10-09'
U_RRP = NY + 'rp/reverserepo/propositions/search.json?startDate=2025-10-01&endDate=2026-10-09'
TS = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={y}&page&_format=csv'
SRC = {'sofr': ('New York Fed', 'https://www.newyorkfed.org/markets/reference-rates/sofr'),
       'effr': ('New York Fed', 'https://www.newyorkfed.org/markets/reference-rates/effr'),
       'rrp': ('New York Fed', 'https://www.newyorkfed.org/markets/desk-operations/reverse-repo'),
       'ust': ('US Treasury', 'https://home.treasury.gov/interest-rates-data-csv-archive')}
START = '2025-11-06'  # first day with all daily rates
daily = []
def add(d, s, v, unit, src):
    daily.append({'date': d, 'series': s, 'value': v, 'unit': unit, 'source': SRC[src][0]})
for l in rows(U_SOFR):
    d, r, p99, vol = l.split(',')[:4]
    if d >= START: add(d, 'SOFR', float(r), '%', 'sofr'); add(d, 'SOFR 99th pct', float(p99), '%', 'sofr'); add(d, 'SOFR volume', float(vol), '$bn', 'sofr')
seen = set()
for l in rows(U_EFFR):
    d, r, p99, lo, hi, vol = l.split(',')[:6]
    if d < START or d in seen: continue
    seen.add(d)
    add(d, 'EFFR', float(r), '%', 'effr'); add(d, 'EFFR 99th pct', float(p99), '%', 'effr')
    add(d, 'Target lower', float(lo), '%', 'effr'); add(d, 'Target upper', float(hi), '%', 'effr')
    add(d, 'IORB', round(float(hi) - 0.10, 2), '%', 'effr')
rrp = {}
for l in rows(U_RRP):
    d, v = l.split(',')[:2]
    rrp[d] = rrp.get(d, 0) + float(v)  # two operations on a day are summed
for d, v in sorted(rrp.items()):
    if d >= START and wk(d): add(d, 'ON RRP', round(v, 3), '$bn', 'rrp')
ts = {}
for y in (2025, 2026):
    for l in rows(TS.format(y=y)):
        d, m3, y2, y10 = l.split(',')[:4]
        ts[d] = (float(m3), float(y2), float(y10))
for d in sorted(ts):
    if d >= '2025-10-01':
        m3, y2, y10 = ts[d]
        add(d, 'Treasury 3M', m3, '%', 'ust'); add(d, 'Treasury 2Y', y2, '%', 'ust'); add(d, 'Treasury 10Y', y10, '%', 'ust')
dump('fed_daily', daily)

FRED = 'https://fred.stlouisfed.org/data/{}.txt'
WK = [('WALCL', 'Total assets'), ('WRESBAL', 'Reserve balances'), ('WTREGEN', 'Treasury General Account'), ('TREAST', 'Treasury securities held'),
      ('WSHOMCB', 'MBS held'), ('WORAL', 'Repo (standing repo facility)'), ('WLCFLPCL', 'Discount window (primary credit)')]
weekly = []
for sid, name in WK:
    for l in rows(FRED.format(sid)):
        d, v = l.split(',')[:2]
        if d >= '2025-09-01': weekly.append({'date': d, 'series': name, 'series_id': sid, 'value': round(float(v) / 1000, 3), 'unit': '$bn', 'source': 'FRED (Fed H.4.1)'})
dump('fed_weekly', weekly)

S = {
 'prim': ('PrimeRates: FOMC dissent watch', 'https://primerates.com/fomc-dissent-watch-miran-waller/'),
 'kitco_rmp': ('Kitco/Reuters: Fed to start reserve management bill buying, 10 Dec 2025', 'https://www.kitco.com/news/off-the-wire/2025-12-10/fed-says-will-start-reserve-management-treasury-bill-buying'),
 'gotrade': ('Gotrade: Warsh\'s first FOMC minutes and the dissent map', 'https://www.heygotrade.com/en/blog/warsh-fomc-minutes-may-20-dissent-map/'),
 'june': ('Poor Coffee: the dot plot flipped at Warsh\'s first meeting', 'https://poorcoffee.beehiiv.com/p/the-dot-plot-flipped-digging-into-warsh-s-first-fed-meeting'),
 'xtb_jul': ('XTB: Fed keeps rates unchanged amid regional dissents, 29 Jul 2026', 'https://www.xtb.com/ae-en/market-analysis/news-and-research/breaking-fed-keeps-rates-unchanged-amid-regional-dissents-and-warsh-s-pause'),
 'minutes': ('Federal Reserve: FOMC minutes, 15–16 Sep 2026', 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm'),
 'rows': ('Regards of Wall Street: September 2026 Fed meeting', 'https://www.regardsofwallstreet.com/news/september-2026-fed-meeting-dates-hike-odds'),
 'gv': ('GV Wire: hike expectations rise on Warsh Jackson Hole speech', 'https://gvwire.com/2026/08/28/rate-hike-expectations-rise-on-warsh-speech-at-jackson-hole/'),
 'macro': ('MacroOdds: Fed hike odds October 2026', 'https://macroodds.com/blog/fed-rate-hike-odds-october-2026'),
 'hammack': ('investingLive: Hammack says inflation risks tilted to the upside', 'https://investinglive.com/central-banks/fed-s-hammack-says-inflation-risks-are-tilted-to-the-upside/'),
 'w247': ('24/7 Wall St.: October hike odds fell from 51% to 19%', 'https://247wallst.com/investing/2026/10/07/october-rate-hike-odds-just-fell-from-51-to-19-in-one-week/'),
 'kash': ('Kitco/Reuters: Kashkari expects more hikes, unsure on October', 'https://www.kitco.com/news/off-the-wire/2026-10-01/feds-kashkari-expects-more-rate-hikes-unsure-need-act-month'),
 'jeff': ('crypto.news: Jefferson signals patience on October hike', 'https://crypto.news/feds-jefferson-signals-patience-october-rate-hike-fall/'),
 'waller': ('Daily Sabah: more hikes needed, says Waller', 'https://www.dailysabah.com/business/finance/more-hikes-needed-to-lower-inflation-to-2-target-feds-waller'),
 'fedmin': ('Federal Reserve: minutes press release, 7 Oct 2026', 'https://federalreserve.gov/newsevents/pressreleases/monetary20261007a.htm'),
 'wolf': ('Wolf Street: SRF drops to zero from $75bn after year-end', 'https://wolfstreet.com/2026/01/05/feds-standing-repo-facility-srf-drops-to-zero-from-75-billion-on-the-last-balance-sheet-as-yearend-liquidity-turmoil-dissolves/'),
 'cb_rmp': ('Crypto Briefing: reserve management purchases wind down', 'https://cryptobriefing.com/fed-treasury-bill-purchase-reserve-management/'),
 'fedcal': ('FedRateCalc: October 2026 FOMC', 'https://fedratecalc.com/fomc-meeting-schedule/october-2026/'),
 'minsched': ('FedRateCalc: FOMC minutes release schedule', 'https://fedratecalc.com/fomc-minutes-release-schedule/'),
}
def src(k): return {'source_title': S[k][0], 'source_url': S[k][1]}

def D(date, decision, change, lo, hi, vote, hawk, dove, dissent, guidance, balance, dots, k):
    return dict(date=date, decision=decision, change_bp=change, range=f'{lo:.2f}–{hi:.2f}%', lower=lo, upper=hi, vote=vote, hawk_dissents=hawk, dove_dissents=dove, dissents=dissent, guidance=guidance, balance_sheet=balance, dots=dots, **src(k))
decisions = [
 D('2025-10-29', 'Cut', -25, 3.75, 4.00, '10–2', 1, 1, 'Miran (wanted −50 bp); Schmid (wanted no cut)', 'Easing continues, data-dependent', 'Balance-sheet runoff to end 1 Dec', None, 'prim'),
 D('2025-12-10', 'Cut', -25, 3.50, 3.75, '9–3', 2, 1, 'Miran (−50 bp); Goolsbee and Schmid (no cut)', 'Third cut of 2025; signalled a wait', 'Reserve management bill purchases start 12 Dec, about $40bn in the first round', None, 'kitco_rmp'),
 D('2026-01-28', 'Hold', 0, 3.50, 3.75, '10–2', 0, 2, 'Miran and Waller (wanted −25 bp)', 'Wait and see', 'Bill purchases continue', None, 'prim'),
 D('2026-03-18', 'Hold', 0, 3.50, 3.75, '11–1', 0, 1, 'Miran (wanted −25 bp)', 'Easing bias kept; Waller drops his dissent after the war\'s energy-price spike', 'Bill purchases continue', '2026 median 3.4% (one cut)', 'prim'),
 D('2026-04-29', 'Hold', 0, 3.50, 3.75, '8–4', 3, 1, 'Miran (−25 bp); Hammack, Kashkari, Logan (against the easing bias)', 'Powell\'s last meeting as chair', 'Bill purchases slowing', None, 'gotrade'),
 D('2026-06-17', 'Hold', 0, 3.50, 3.75, '12–0', 0, 0, 'None', 'Easing bias removed; Warsh\'s first meeting', 'No change', '2026 median 3.8% (one hike); 9 of 18 see a 2026 hike', 'june'),
 D('2026-07-29', 'Hold', 0, 3.50, 3.75, '9–3', 3, 0, 'Hammack, Kashkari, Logan (wanted +25 bp)', 'Statement virtually unchanged', 'Maintain ample reserves', None, 'xtb_jul'),
 D('2026-09-16', 'Hike', 25, 3.75, 4.00, '12–0', 0, 0, 'None', '"The Committee will deliver price stability"; most expect another hike by year-end', 'Bill purchases paused; IORB 3.90%', '2026 median 4.1%, 2027 4.1%, 2028 3.9%', 'minutes'),
]
dump('fed_decisions', decisions)

def C(date, speaker, role, voter, stance, timing, summary, k):
    return dict(key=f'{date}|{speaker}', date=date, speaker=speaker, role=role, voter=voter, stance=stance, timing=timing, summary=summary, **src(k))
comms = [
 C('2026-06-17', 'Warsh', 'Chair', 'Yes', 2, 'Tightening bias', '"We\'ve missed on inflation for five years, and we\'re going to fix that." Easing bias dropped; 2026 dot median moves to a hike.', 'june'),
 C('2026-08-28', 'Warsh', 'Chair', 'Yes', 2, 'Hike soon', 'Jackson Hole speech; September hike odds roughly doubled within a week.', 'gv'),
 C('2026-09-16', 'Warsh', 'Chair', 'Yes', 2, 'Hike delivered', 'Inflation "too high for too long"; financial conditions accommodative rather than restrictive.', 'macro'),
 C('2026-09-24', 'Hammack', 'Cleveland Fed', 'Yes', 2, 'Hike soon', 'Inflation risks "tilted toward upside"; "the longer inflation remains high, the harder it is to bring it back."', 'hammack'),
 C('2026-09-29', 'Williams', 'New York Fed', 'Yes', 0, 'Patient', '"There is no need for urgency, and we have time to gather more information."', 'w247'),
 C('2026-10-01', 'Bowman', 'Vice Chair for Supervision', 'Yes', -1, 'Patient', 'Does not "currently see an urgent need for further action."', 'w247'),
 C('2026-10-01', 'Kashkari', 'Minneapolis Fed', 'Yes', 1, 'More hikes, timing open', 'Sees one more hike in 2026 and another in 2027; "I don\'t have a strong view" on October; policy "probably not particularly restrictive."', 'kash'),
 C('2026-10-01', 'Jefferson', 'Vice Chair', 'Yes', 0, 'Patient', 'Wants more data before the next move; inflation risks still tilted up as yields rise across maturities.', 'jeff'),
 C('2026-10-07', 'FOMC minutes', 'Committee', 'Yes', 1, 'Hike by year-end', 'Most participants see another increase as likely appropriate by year-end; open mind on timing.', 'minutes'),
 C('2026-10-08', 'Waller', 'Governor', 'Yes', 1, 'More hikes, not consecutive', '"I anticipate additional hikes"; "the hikes do not need to come at consecutive meetings." Not worried tighter policy causes a damaging slowdown.', 'waller'),
]
dump('fed_comms', comms)

def P(date, meeting, prob, platform, k):
    return dict(key=f'{date}|{meeting}|{platform}', date=date, meeting=meeting, prob_hike=prob, platform=platform, **src(k))
pricing = [
 P('2026-09-17', 'Oct 28', 55.1, 'CME FedWatch', 'macro'),
 P('2026-09-18', 'Oct 28', 56.5, 'Polymarket', 'macro'),
 P('2026-09-18', 'Dec 9', 67.5, 'Polymarket', 'macro'),
 P('2026-09-24', 'Oct 28', 77.5, 'Market-implied (peak)', 'w247'),
 P('2026-10-01', 'Oct 28', 23.0, 'Polymarket', 'jeff'),
 P('2026-10-07', 'Oct 28', 19.4, 'Market-implied', 'w247'),
 P('2026-10-07', 'Dec 9', 70.0, 'Market-implied', 'w247'),
]
dump('fed_pricing', pricing)

scen = [
 dict(id='hike', order=1, scenario='Hike 25 bp (surprise)', probability=0.194, decision='3.75–4.00% → 4.00–4.25%', shock_2y=12,
      signals='The committee is front-loading against sticky inflation and the energy shock; Warsh puts credibility ahead of the weak payrolls print.',
      trade='Pay the front end (sell 2-year futures); long USD vs JPY and EM; underweight long-duration equities (semis); fade gold.', basis='Market-implied probability (7 Oct)'),
 dict(id='hawkish_hold', order=2, scenario='Hold, December hike signalled', probability=0.55, decision='Hold at 3.75–4.00%', shock_2y=3,
      signals='Skip, not stop: the statement or press conference keeps a December hike as the base case, in line with the minutes and Waller.',
      trade='Front end range-bound; carry trades stay on; buy cheap December-hike protection if odds dip after a soft CPI.', basis='Analyst split of the 80.6% hold probability'),
 dict(id='neutral_hold', order=3, scenario='Hold, fully data-dependent', probability=0.18, decision='Hold at 3.75–4.00%', shock_2y=-5,
      signals='Williams, Bowman and Jefferson carry the meeting: no forward guidance, December depends on CPI and payrolls.',
      trade='Mild bull steepener (receive 2-year vs 10-year); dollar softer; gold bid.', basis='Analyst split of the 80.6% hold probability'),
 dict(id='dovish_hold', order=4, scenario='Hold, extended pause signalled', probability=0.076, decision='Hold at 3.75–4.00%', shock_2y=-15,
      signals='The labour-market slowdown dominates; the committee signals it is done for now despite the September dots.',
      trade='Strong bull steepener; weaker USD; equities and EM FX rally; HY spreads tighten.', basis='Analyst split of the 80.6% hold probability'),
]
dump('fed_scenarios', scen)

pb = [
 dict(id='effr_iorb', order=1, indicator='EFFR − IORB', unit='bp', direction='above', warn=-1, alert=0, normal='About −2 bp all year',
      signals='Reserves becoming less than ample: banks bid up fed funds toward (or above) the rate the Fed pays on reserves.',
      implication='Front-end funding premia widen; the Fed restarts or speeds up bill purchases; supportive for bills vs OIS, negative for leveraged basis trades.',
      action='If ≥ IORB for 3+ days: position for an RMP restart (long bills vs SOFR futures); trim funding-sensitive carry.'),
 dict(id='sofr_iorb', order=2, indicator='SOFR − IORB', unit='bp', direction='above', warn=0, alert=5, normal='−3 to 0 bp; above 0 at quarter-ends',
      signals='Repo pressure: collateral-heavy dealers pay up for cash. Persistent prints above IORB mean the balance sheet is too small for Treasury supply.',
      implication='Wider swap spreads, cheaper Treasuries vs swaps, firmer SOFR fixings; SRF usage likely.',
      action='Watch month- and quarter-ends; sustained > +5 bp outside them is a signal to pay SOFR futures spreads and expect Fed liquidity action.'),
 dict(id='sofr99_srf', order=3, indicator='SOFR 99th pct − SRF rate', unit='bp', direction='above', warn=-3, alert=0, normal='−5 to −8 bp',
      signals='Tail of the repo market trading at or above the Fed\'s standing repo rate (the ceiling).',
      implication='The ceiling is being tested; SRF take-up should rise. If usage stays low while tails exceed it, stigma is blunting the backstop.',
      action='Treat as an early warning of quarter-end dislocations; reduce leverage into those dates.'),
 dict(id='srf', order=4, indicator='Standing repo usage (Wednesday)', unit='$bn', direction='above', warn=5, alert=25, normal='Near zero; $75bn at end-2025',
      signals='Dealers borrowing from the Fed\'s backstop rather than the market.',
      implication='Sizeable use outside calendar dates = funding stress; the Fed is likely to respond with bill purchases.',
      action='Spikes outside quarter-end: de-risk funding-sensitive trades; expect dovish balance-sheet action.'),
 dict(id='onrrp', order=5, indicator='ON RRP take-up (5-day avg)', unit='$bn', direction='below', warn=50, alert=None, normal='Near zero since late 2025',
      signals='The liquidity buffer is gone: money funds have moved cash into bills and repo.',
      implication='Any further drain (TGA rebuild, QT) now comes straight out of bank reserves.',
      action='With the buffer empty, treat TGA rebuilds and Treasury issuance surges as direct reserve drains.'),
 dict(id='reserves', order=6, indicator='Reserve balances', unit='$tn', direction='below', warn=2.9, alert=2.8, normal='About $2.9–3.1tn this year',
      signals='How close the system is to the Fed\'s "ample" floor.',
      implication='Below roughly $2.9tn, money-market rates have drifted up (October 2025).',
      action='Falling toward $2.9tn into a TGA rebuild: expect firmer repo and a Fed response.'),
 dict(id='tga', order=7, indicator='TGA, 4-week change', unit='$bn', direction='above', warn=100, alert=200, normal='±$100bn around tax dates',
      signals='Treasury\'s cash account rising drains reserves one-for-one when ON RRP is empty.',
      implication='Large rebuilds tighten liquidity; drawdowns (e.g. before a debt-limit or funding deadline) add it.',
      action='Map against the 11 Dec government funding deadline: a drawdown adds liquidity, a rebuild afterwards removes it.'),
 dict(id='rmp', order=8, indicator='Fed Treasury holdings, 4-week change', unit='$bn', direction='info', warn=None, alert=None, normal='+$40bn/month at the start; paused in September',
      signals='The pace of reserve management purchases and reinvestment.',
      implication='Purchases add reserves and bills demand; a pause during hikes keeps liquidity tighter.',
      action='A restart while hiking would signal plumbing stress, not easing.'),
 dict(id='dw', order=9, indicator='Discount window (primary credit)', unit='$bn', direction='above', warn=8, alert=20, normal='$4–6bn for most of 2026',
      signals='Banks borrowing directly from the Fed.',
      implication='A steady climb means some banks are paying up for liquidity; watch regional bank equities and funding costs.',
      action='Rising alongside wider HY and CCC spreads: underweight regional banks, overweight quality credit.'),
]
dump('fed_playbook', pb)

# --- patch shared datasets ---
ind = load('indicators')
for r in ind:
    if r['id'] == 'fed_oct_hike':
        r.update(value=19.4, as_of='2026-10-07', context='Market-implied odds of a second straight hike, after the 29k September payrolls print (from 50.9% a week earlier)', source_title=S['w247'][0], source_url=S['w247'][1])
dump('indicators', ind)
cal = [r for r in load('calendar') if not r['event'].startswith('FOMC minutes')]
cal.append(dict(date='2026-11-18', event='FOMC minutes (27–28 Oct meeting)', type='Central bank', assets='Rates, USD', source_title=S['minsched'][0], source_url=S['minsched'][1]))
cal.sort(key=lambda r: (r['date'], r['event']))
for i, r in enumerate(cal): r['key'] = f"{r['date']}|{i}"
dump('calendar', cal)
rm = [r for r in load('roadmap') if r['id'] not in ('fed', 'ois', 'srfd')]
n = max(r['order'] for r in rm)
rm += [
 dict(id='fed', deliverable='Fed tracker: plumbing monitor, communications, FOMC scenarios', audience='PMs, rates traders', desk='Rates', status='Live', detail='Daily corridor (EFFR, SOFR, IORB, ON RRP), weekly H.4.1, decisions, Fedspeak and a scenario × asset breakdown.', next_step='Score Fedspeak automatically from transcripts.', order=n + 1),
 dict(id='ois', deliverable='Fed funds futures / OIS meeting-by-meeting pricing', audience='Rates traders', desk='Rates', status='Needs vendor data', detail='Hike odds are dated snapshots from FedWatch, Polymarket and press reports.', next_step='CME or Bloomberg feed for daily implied paths.', order=n + 2),
 dict(id='srfd', deliverable='Daily standing repo operation results', audience='Rates traders', desk='Rates', status='Live (proxy)', detail='Weekly Wednesday repo level from H.4.1 stands in for daily operation results.', next_step='Pull daily operation results from the New York Fed.', order=n + 3),
]
dump('roadmap', rm)
print('daily', len(daily), 'weekly', len(weekly), 'decisions', len(decisions), 'comms', len(comms), 'cal', len(cal), 'roadmap', len(rm))
