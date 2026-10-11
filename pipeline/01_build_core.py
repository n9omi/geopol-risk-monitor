"""Step 1: core datasets — markets (Yahoo Finance + FRED HY OAS), FRED snapshot, daily GPR, alternative indicators,
prediction markets, catalysts, Washington, US/EU regulation, calendar, Hormuz scenarios, asset framework."""
import json, datetime, os

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import YAHOO as RAW, OUT

START = "2025-10-09"

def parse(fname):
    """Yahoo history text: 'Mon D, YYYY,value'. First occurrence of a date wins
    (files list the most recent fetch first); weekend rows dropped."""
    seen = {}
    for line in open(os.path.join(RAW, fname)):
        line = line.strip()
        if not line:
            continue
        parts = line.rsplit(",", 1)
        dt = datetime.datetime.strptime(parts[0].strip(), "%b %d, %Y").date()
        if dt.weekday() >= 5:
            continue
        d = dt.isoformat()
        if d < START or d in seen:
            continue
        seen[d] = float(parts[1])
    return sorted(seen.items())

def parse_iso(fname):
    rows = []
    for line in open(os.path.join(RAW, fname)):
        line = line.strip()
        if not line:
            continue
        d, v = line.split(",")
        if d >= START and datetime.date.fromisoformat(d).weekday() < 5:
            rows.append((d, float(v)))
    return sorted(rows)

series = [
    ("Brent", "brent.txt", "BZ=F", "$/bbl", "Yahoo Finance"),
    ("UST 10Y", "tnx.txt", "^TNX", "%", "Yahoo Finance"),
    ("MOVE", "move.txt", "^MOVE", "index", "Yahoo Finance"),
    ("VIX", "vix.txt", "^VIX", "index", "Yahoo Finance"),
    ("S&P 500", "spx.txt", "^GSPC", "index", "Yahoo Finance"),
    ("Gold", "gold.txt", "GC=F", "$/oz", "Yahoo Finance"),
    ("DXY", "dxy.txt", "DX-Y.NYB", "index", "Yahoo Finance"),
    ("TAIEX", "taiex.txt", "^TWII", "index", "Yahoo Finance"),
    ("USD/TWD", "twd.txt", "TWD=X", "TWD per USD", "Yahoo Finance"),
    ("USD/KRW", "krw.txt", "KRW=X", "KRW per USD", "Yahoo Finance"),
    ("USD/INR", "inr.txt", "INR=X", "INR per USD", "Yahoo Finance"),
    ("USD/ZAR", "zar.txt", "ZAR=X", "ZAR per USD", "Yahoo Finance"),
    ("Copper", "copper.txt", "HG=F", "$/lb", "Yahoo Finance"),
    ("Cocoa", "cocoa.txt", "CC=F", "$/t", "Yahoo Finance"),
    ("Bovespa", "bvsp.txt", "^BVSP", "index", "Yahoo Finance"),
    ("USD/BRL", "brl.txt", "BRL=X", "BRL per USD", "Yahoo Finance"),
    ("USD/MXN", "mxn.txt", "MXN=X", "MXN per USD", "Yahoo Finance"),
    ("USD/COP", "cop.txt", "COP=X", "COP per USD", "Yahoo Finance"),
]
markets = []
for name, f, tick, unit, srcname in series:
    for d, v in parse(f):
        markets.append({"date": d, "series": name, "value": v, "ticker": tick, "unit": unit, "source": srcname})
for d, v in parse_iso("hy.csv"):
    markets.append({"date": d, "series": "HY OAS", "value": v, "ticker": "BAMLH0A0HYM2", "unit": "%", "source": "FRED"})
json.dump(markets, open(os.path.join(OUT, "markets.json"), "w"))

# ---------- FRED latest observations (cross-check + credit) ----------
fred = []
def fr(sid, title, unit, obs):
    for d, v in obs:
        fred.append({"series_id": sid, "title": title, "unit": unit, "date": d, "value": v,
                     "url": f"https://fred.stlouisfed.org/series/{sid}"})
fr("BAMLH0A0HYM2", "ICE BofA US High Yield OAS", "%", [("2026-10-08",3.15),("2026-10-07",3.09),("2026-10-06",3.03),("2026-10-05",3.12),("2026-10-02",3.10)])
fr("BAMLC0A0CM", "ICE BofA US Corporate (IG) OAS", "%", [("2026-10-08",0.82),("2026-10-07",0.82),("2026-10-06",0.83),("2026-10-05",0.84),("2026-10-02",0.85)])
fr("DGS10", "10-Year Treasury constant maturity", "%", [("2026-10-08",5.22),("2026-10-07",5.28),("2026-10-06",5.27),("2026-10-05",5.31),("2026-10-02",5.28)])
fr("DCOILBRENTEU", "Brent crude spot (Europe, dated)", "$/bbl", [("2026-10-06",125.44),("2026-10-05",125.51),("2026-10-02",135.51),("2026-10-01",114.82),("2026-09-30",115.91)])
fr("VIXCLS", "Cboe VIX close", "index", [("2026-10-08",15.41),("2026-10-07",15.08),("2026-10-06",15.01),("2026-10-05",15.52),("2026-10-02",15.31)])
fred.sort(key=lambda r: (r["series_id"], r["date"]))
json.dump(fred, open(os.path.join(OUT, "fred.json"), "w"))

# ---------- Daily GPR ----------
gpr_raw = [("2026-10-05",141.49),("2026-10-04",145.61),("2026-10-03",160.74),("2026-10-02",264.23),("2026-10-01",176.28),
("2026-09-30",156.19),("2026-09-29",197.99),("2026-09-28",206.54),("2026-09-27",140.21),("2026-09-26",157.43),("2026-09-25",228.23),
("2026-09-24",144.02),("2026-09-23",210.99),("2026-09-22",184.03),("2026-09-21",172.28),("2026-09-20",149.14),("2026-09-19",128.18),
("2026-09-18",121.56),("2026-09-17",81.79),("2026-09-16",226.02),("2026-09-15",211.73),("2026-09-14",198.19),("2026-09-13",137.02),
("2026-09-12",107.06),("2026-09-11",208.78),("2026-09-10",189.48),("2026-09-09",220.84),("2026-09-08",100.38),("2026-09-07",143.19),("2026-09-06",109.58)]
gpr = sorted([{"date": d, "gpr": v} for d, v in gpr_raw], key=lambda r: r["date"])
json.dump(gpr, open(os.path.join(OUT, "gpr.json"), "w"))

# ---------- Sources ----------
S = {
 "straits": ("Straits daily brief, 8 Oct 2026", "https://straits.live/briefs/2026-10-08"),
 "gcaptain": ("gCaptain: five Hormuz incidents, 5 Oct 2026", "https://gcaptain.com/five-hormuz-incidents-reported-monday-as-tanker-attacks-mount/"),
 "wiki": ("Wikipedia: 2026 Iran war", "https://en.wikipedia.org/wiki/2026_Iran_war"),
 "roic_iran": ("ROIC: US sanctions vessels as Iran halts oil shipments", "https://www.roic.ai/news/us-sanctions-17-vessels-as-iran-halts-oil-shipments-10-08-2026"),
 "xtb_ttf": ("XTB: TTF hits highest since 2022, 9 Sep 2026", "https://www.xtb.com/en/market-analysis/european-ttf-gas-futures-hit-highest-level-since-2022-as-inventories-remain-low-ahead-of-winter"),
 "kip_fed": ("Kiplinger: September 2026 Fed meeting", "https://www.kiplinger.com/investing/live/fed-meeting-updates-and-commentary-september-2026"),
 "ecb": ("Lovguiden: ECB raises rates to 2.50%", "https://lovguiden.dk/en/det-offentlige/den-europaeiske-centralbank/2026-09-24-ecb-haever-renten-til-250-procent-efter-energichok-fra-mellemoesten"),
 "cpi": ("Babypips: August 2026 CPI", "https://www.babypips.com/news/headline-us-core-cpi-august-2026-results-fed-rate-hike-2026-09-11"),
 "cpi_date": ("FedRateCalc: CPI release calendar", "https://fedratecalc.com/cpi-release-date/"),
 "ust5": ("ROIC: 10-year yield tops 5%", "https://www.roic.ai/news/10-year-treasury-yield-tops-5-for-first-time-since-2023-09-23-2026"),
 "gold": ("Regards of Wall Street: gold down from record", "https://www.regardsofwallstreet.com/blog/gold-price-down-26-percent-from-record"),
 "xi": ("ROIC: Trump–Xi summit extends truce", "https://www.roic.ai/news/trump-xi-summit-buys-time-with-two-month-tariff-truce-extension-09-24-2026"),
 "cba": ("CommBank: November deadline over Trump–Xi meeting", "https://www.commbank.com.au/articles/newsroom/2026/09/trump-xi-summit-rare-earths-november-deadline.html"),
 "cr": ("Fox News: Trump signs funding bill", "https://www.foxnews.com/politics/trump-signs-government-funding-bill-avoiding-shutdown-ahead-midterms"),
 "cr2": ("Salem News: House stopgap to Dec. 11", "https://www.salemnews.net/uncategorized/2026/09/u-s-house-will-attempt-to-stave-off-government-shutdown/"),
 "odds_oct": ("DeFi Rate midterm odds snapshot, 10 Oct 2026", "https://defirate.com/odds/2026-midterms/snapshot/2026-10-08T1127/"),
 "odds_mar": ("DeFi Rate: Democrats 85% to flip House (24 Mar 2026)", "https://defirate.com/news/democrats-85-percent-to-flip-house-2026-midterms-senate-still-toss-up/"),
 "ieepa": ("A&O Shearman: SCOTUS rejects IEEPA tariffs", "https://www.aoshearman.com/en/insights/scotus-rejects-ieepa-tariffs-refund-opportunities-and-uncertainty-emerge"),
 "s301": ("UHY: Section 122 expires as Section 301 duties expand", "https://uhy-us.com/insights/news/2026/july/tariff-reset-section-122-expires-as-section-301-duties-expand"),
 "cook": ("Faegre Drinker: Supreme Court decides Trump v. Cook", "https://www.faegredrinker.com/en/insights/publications/2026/6/supreme-court-decides-trump-v-cook"),
 "ot26": ("Jenkins Law Library: October 2026 argument session", "https://www.jenkinslaw.org/news/us-supreme-court-october-argument-session"),
 "suncor": ("National Constitution Center: climate case opens term", "https://constitutioncenter.org/blog/climate-change-lawsuit-to-kick-off-supreme-courts-next-term"),
 "wpr": ("SAN: Senate approves Iran war powers resolution", "https://san.com/cc/senate-approves-iran-war-powers-resolution-after-10-attempts/"),
 "clarity": ("The Defiant: Senate blocks CLARITY Act 49–50", "https://thedefiant.io/news/regulation/senate-blocks-clarity-act-49-50-with-no-democratic-votes-to-proceed"),
 "genius": ("The Block: OCC races to finalize GENIUS rules", "https://theblock.co/news/regulation/2026-08-19-occ-races-to-finalize-genius-act-stablecoin-rules-by-november-412240"),
 "sec": ("LexBlog: updated SEC rulemaking agenda", "https://www.lexblog.com/2026/07/06/updated-sec-rulemaking-agenda-published/"),
 "basel": ("Hogan Lovells: Basel III endgame reproposal", "https://hlc.com/en/publications/federal-banking-agencies-issue-long-awaited-basel-iii-endgame-reproposal"),
 "bis_chips": ("Covington: BIS license policy for advanced chips", "https://www.cov.com/en/news-and-insights/insights/2026/01/us-commerce-department-revises-license-review-policy-for-exports-of-certain-advanced-computing-commodities-to-china-and-macau"),
 "bis_models": ("Mayer Brown: export controls on advanced AI models", "https://www.mayerbrown.com/en/insights/publications/2026/06/commerce-department-extends-export-controls-to-advanced-ai-models-authorizes-release-to-specific-trusted-partners"),
 "anthropic": ("Anthropic: Fable and Mythos access restored", "https://www.anthropic.com/news/fable-mythos-access"),
 "ai_omni": ("Addleshaw Goddard: AI Omnibus formally adopted", "https://www.addleshawgoddard.com/en/insights/insights-briefings/2026/technology/eu-ai-act-ai-omnibus-formally-adopted/"),
 "omni1": ("Covington: CSRD/CSDDD Omnibus in Official Journal", "https://www.globalpolicywatch.com/2026/02/eu-csddd-csrd-omnibus-published-in-official-journal-transposition-delegated-acts-and-guidelines-are-next/"),
 "frtb": ("CDE Almería: EU market-risk (FRTB) delay", "https://www.cde.ual.es/en/commission-proposes-one-year-delay-of-basel-iii-market-risk-rules/"),
 "eu21": ("White & Case: EU 21st Russia sanctions package", "https://www.whitecase.com/insight-alert/eu-adopts-21st-sanctions-package-against-russia"),
 "ukr": ("GlobalSecurity: Russo-Ukraine war, August 2026", "https://www.globalsecurity.org/military/world/war/russo-ukraine-2026-08.htm"),
 "qatar": ("The New Arab: Qatar says Hormuz deal key to talks", "https://www.newarab.com/news/qatar-says-hormuz-agreement-crucial-us-iran-talks-resume"),
}
def src(k):
    t, u = S[k]
    return {"source_title": t, "source_url": u}

# ---------- Alternative / macro indicators ----------
ind = []
def I(id_, group, metric, value, unit, as_of, context, k, baseline=None):
    r = {"id": id_, "group": group, "metric": metric, "value": value, "unit": unit, "as_of": as_of,
         "context": context, "baseline": baseline}
    r.update(src(k)); ind.append(r)
I("hormuz_transits", "Hormuz shipping", "Strait of Hormuz transits", 4, "per day", "2026-10-04",
  "IMF PortWatch count vs a pre-crisis baseline of 85 per day", "straits", 85)
I("vessels_holding", "Hormuz shipping", "Vessels holding position in Strait/Gulf box", 220, "vessels", "2026-10-08",
  "AIS-visible ships holding position, excluding those within 25 km of a working port", "straits")
I("redirected", "Hormuz shipping", "Vessels redirected by US blockade (cumulative)", 130, "vessels", "2026-10-05",
  "CENTCOM: blockade on Iranian ports resumed 14 Jul; 13 vessels destroyed, 3 disabled over 12 weeks", "gcaptain")
I("tanker_attacks", "Hormuz shipping", "Confirmed tanker attacks, 2–3 Oct (JMIC)", 4, "attacks", "2026-10-03",
  "Further UKMTO-reported strikes followed on 4–5 Oct", "gcaptain")
I("iran_loadings", "Sanctions & supply", "Iran crude/condensate loadings, September", 0, "kb/d", "2026-09-30",
  "Kpler; down from about 250 kb/d in August", "roic_iran", 250)
I("brent_straits", "Oil & gas prices", "Brent (Straits brief snapshot)", 103.92, "$/bbl", "2026-10-08",
  "Snapshot at 21:25 UTC", "straits")
I("wti_straits", "Oil & gas prices", "WTI (Straits brief snapshot)", 91.18, "$/bbl", "2026-10-08",
  "Snapshot at 21:25 UTC", "straits")
I("ttf", "Oil & gas prices", "TTF front-month gas", 79, "€/MWh", "2026-09-09",
  "Highest since Dec 2022; 2026 range about €26.50–79", "xtb_ttf")
I("eu_storage", "Oil & gas prices", "EU gas storage fill", 67, "%", "2026-09-09",
  "EU target is 90% by 1 Nov, with flexibility allowed", "xtb_ttf", 90)
I("qatar_lng", "Oil & gas prices", "Qatar LNG capacity offline after March strikes", 17, "bcm/yr", "2026-09-09",
  "About 17% of Qatar's LNG export capacity; IEA sees 3–5 year repairs", "xtb_ttf")
I("fed_upper", "Policy rates & inflation", "Fed funds target, upper bound", 4.00, "%", "2026-09-16",
  "25 bp hike to 3.75–4.00%, first since 2023; unanimous", "kip_fed")
I("fed_oct_hike", "Policy rates & inflation", "Market-implied odds of an October hike", 51, "%", "2026-09-16",
  "CME futures after the September meeting", "kip_fed")
I("ecb_dfr", "Policy rates & inflation", "ECB deposit facility rate", 2.50, "%", "2026-09-10",
  "25 bp hike; staff see 2026 HICP at 3.0% and energy inflation at 9.3%", "ecb")
I("cpi_headline", "Policy rates & inflation", "US CPI, headline y/y (August)", 3.4, "%", "2026-09-11",
  "Core 2.4% y/y; energy index +16.3% y/y", "cpi")
I("cpi_core", "Policy rates & inflation", "US CPI, core y/y (August)", 2.4, "%", "2026-09-11",
  "Core m/m 0.3% vs 0.2% expected", "cpi")
I("ieepa_refunds", "Trade", "IEEPA tariff revenue exposed to refund claims", 175, "$bn", "2026-02-20",
  "Estimate after the Supreme Court struck down IEEPA tariffs", "ieepa")
I("s301_coverage", "Trade", "Share of US imports under new Section 301 tariffs", 99.4, "%", "2026-07-24",
  "60 economies at 10% or 12.5%; EU and Taiwan capped near 10% combined", "s301")
I("war_cost", "Fiscal", "Estimated US cost of the Iran war", 113.3, "$bn", "2026-06-30",
  "June 2026 estimate; administration requested $1.5tn for the Pentagon next fiscal year", "wiki")
json.dump(ind, open(os.path.join(OUT, "indicators.json"), "w"))

# ---------- Prediction markets ----------
pm = []
def P(market, outcome, prob, as_of, platform, k):
    r = {"market": market, "outcome": outcome, "probability": prob, "as_of": as_of, "platform": platform, "note": None}
    r.update(src(k)); pm.append(r)
P("House control", "Democrats", 89.5, "2026-10-10", "Kalshi", "odds_oct")
P("House control", "Democrats", 90.5, "2026-10-10", "Polymarket", "odds_oct")
P("Senate control", "Democrats", 61.4, "2026-10-10", "Kalshi", "odds_oct")
P("Senate control", "Democrats", 62.5, "2026-10-10", "Polymarket", "odds_oct")
P("Both chambers", "Republicans", 10.5, "2026-10-10", "Kalshi", "odds_oct")
P("Both chambers", "Republicans", 8.5, "2026-10-10", "Polymarket", "odds_oct")
P("House control", "Democrats", 84, "2026-03-24", "Kalshi", "odds_mar")
P("House control", "Democrats", 85, "2026-03-24", "Polymarket", "odds_mar")
P("Senate control", "Democrats", 49, "2026-03-24", "Kalshi", "odds_mar")
P("Senate control", "Democrats", 47, "2026-03-24", "Polymarket", "odds_mar")
pm[-1]["note"] = pm[-2]["note"] = "100 minus the Republican price reported (Kalshi 51%, Polymarket 53%)"
P("CLARITY Act law in 2026", "Yes", 6.5, "2026-09-15", "Polymarket", "clarity")
P("CLARITY Act law in 2026", "Yes", 29.5, "2026-09-14", "Polymarket", "clarity")
for r in pm:
    r["key"] = f'{r["market"]}|{r["platform"]}|{r["as_of"]}'
json.dump(pm, open(os.path.join(OUT, "predictions.json"), "w"))

# ---------- Catalysts ----------
cat = []
def C(id_, date, theme, title, detail, status, risk, assets, k, marker=False, short=None):
    r = {"id": id_, "date": date, "theme": theme, "title": title, "detail": detail, "status": status,
         "analyst_risk": risk, "assets": assets, "marker": marker, "short": short or title}
    r.update(src(k)); cat.append(r)
# live / forward-looking catalysts
C("hormuz", "2026-10-08", "Middle East", "Hormuz closure and tanker war",
  "Transits near zero vs an 85/day baseline; IRGC threatens unauthorized routes; repeated projectile strikes on tankers 2–8 Oct.",
  "Escalating", 5, "Oil, rates, inflation breakevens, airlines, chemicals, EM importers", "straits")
C("blockade", "2026-10-05", "Middle East", "US naval blockade and Iran oil sanctions",
  "Blockade resumed 14 Jul; 130 vessels redirected; Treasury's Operation Economic Outcast; US sanctioned 22 tankers on 8 Oct.",
  "Active", 4, "Oil, tanker rates, China crude imports", "gcaptain")
C("bab", "2026-10-08", "Middle East", "Bab al-Mandab / Red Sea disruption",
  "Listed as an ongoing front of the Iran war; Houthis joined the conflict on 28 Mar.",
  "Active", 3, "Shipping, insurance, European energy", "wiki")
C("talks", "2026-08-18", "Middle East", "US–Iran diplomacy stalled",
  "Qatar says a Hormuz agreement is needed before talks resume; Iran demands blockade lifted and transit fees.",
  "Stalled", 4, "Oil (downside risk to prices if a deal lands)", "qatar")
C("fed", "2026-09-16", "Monetary & fiscal", "Fed hiking into an oil shock",
  "Fed raised to 3.75–4.00%; median dot shows one more 2026 hike; next decision 28 Oct.",
  "Active", 4, "Rates, USD, growth equities, gold", "kip_fed")
C("termprem", "2026-09-14", "Monetary & fiscal", "Term premium and fiscal supply",
  "10-year topped 5% for the first time since 2023; deficits, heavy issuance and AI-capex borrowing cited.",
  "Active", 4, "Long-duration Treasuries, mortgages, equity multiples", "ust5")
C("eugas", "2026-09-09", "Europe & Russia", "European gas shortfall into winter",
  "TTF at the highest since 2022 and storage at 67% vs a 90% target; Qatar LNG capacity damaged.",
  "Active", 4, "TTF, EU utilities and industrials, EUR, ECB path", "xtb_ttf")
C("ecb", "2026-09-10", "Monetary & fiscal", "ECB tightening on energy inflation",
  "Deposit rate raised to 2.50%; inflation seen peaking late 2026; risks to growth on the downside.",
  "Active", 3, "Bunds, EUR, European banks", "ecb")
C("midterms", "2026-11-03", "US politics", "US midterm elections",
  "Prediction markets price a Democratic House at about 90% and a Democratic Senate at about 62%.",
  "Scheduled", 3, "Sector policy (health, energy, defense), fiscal outlook, tariffs", "odds_oct")
C("cliff", "2026-12-11", "US politics", "Government funding cliff",
  "Stopgap (H.R. 6500) funds agencies to 11 Dec; 2026 already saw a 42-day full and a 76-day DHS shutdown.",
  "Scheduled", 3, "T-bills, data releases, contractors", "cr")
C("china", "2027-01-10", "Trade", "US–China truce cliff",
  "Truce extended two months at the 24 Sep summit; China behind on rare-earth and farm commitments.",
  "Scheduled", 3, "Semis, rare earths, ag, CNH", "xi")
C("tariffs", "2026-07-24", "Trade", "Post-IEEPA tariff regime",
  "Section 301 duties on 60 economies; +25% on Brazil; Section 338 +50% on specified Canadian goods; IEEPA refunds in process.",
  "Active", 3, "Importers, retailers, CAD, BRL, inflation", "s301")
C("russia", "2026-08-11", "Europe & Russia", "Russia–Ukraine war and EU sanctions",
  "No ceasefire; Ukrainian strikes on Russian refineries; EU 21st package froze the oil price cap at $44.10.",
  "Active", 2, "Diesel cracks, wheat, European defense", "ukr")
C("aicontrols", "2026-06-30", "Tech controls", "Export controls on chips and AI models",
  "H200-class chips to China moved to case-by-case review; June controls on two frontier AI models were lifted by 30 Jun.",
  "Monitoring", 2, "Semis, hyperscalers, AI software", "bis_models")
C("climate", "2026-10-05", "Courts", "Climate liability at the Supreme Court",
  "Suncor v. Boulder County argued 5 Oct; about 60 similar state and local suits hinge on preemption.",
  "Pending", 2, "Integrated oil majors, insurers", "suncor")
C("fedind", "2026-06-29", "Courts", "Fed independence",
  "Supreme Court kept Governor Cook in place at the stay stage; 'cause' for removal is reviewable.",
  "Pending", 2, "Term premium, USD, gold", "cook")
C("crypto", "2026-09-15", "US politics", "Crypto market-structure bill stalled",
  "CLARITY Act cloture failed 49–50; motion to reconsider entered; odds of law this year cut to 6.5%.",
  "Stalled", 1, "Crypto, exchanges, stablecoin issuers", "clarity")
# historical markers for event study
C("e_ieepa", "2026-02-20", "Courts", "Supreme Court strikes down IEEPA tariffs",
  "6–3 ruling; 10% Section 122 tariff imposed for 150 days from 24 Feb.", "Resolved", None, "Trade", "ieepa", True, "IEEPA ruling")
C("e_war", "2026-02-28", "Middle East", "US–Israeli strikes on Iran begin",
  "Operation Epic Fury; Supreme Leader killed; Iran retaliates across the Gulf.", "Resolved", None, "All", "wiki", True, "War begins")
C("e_lng", "2026-03-18", "Middle East", "South Pars struck; Iran hits Qatar LNG",
  "Escalation into gas infrastructure.", "Resolved", None, "Gas, oil", "wiki", True, "Gas infrastructure hit")
C("e_cease", "2026-04-08", "Middle East", "Two-week ceasefire begins",
  "Later undermined as Iran resumed its Hormuz blockade.", "Resolved", None, "Oil", "wiki", True, "Ceasefire")
C("e_block", "2026-04-13", "Middle East", "US imposes naval blockade on Iran",
  "After the Islamabad talks fail.", "Resolved", None, "Oil", "wiki", True, "US blockade")
C("e_mou", "2026-06-17", "Middle East", "US–Iran memorandum lifts dual blockade",
  "Followed by an agreement on 28 Jun to stop exchanging attacks.", "Resolved", None, "Oil", "wiki", True, "Peace memo")
C("e_collapse", "2026-07-08", "Middle East", "Ceasefire collapses",
  "Iran attacks commercial vessels in Hormuz to assert sovereignty.", "Resolved", None, "Oil", "wiki", True, "Ceasefire collapses")
C("e_301", "2026-07-24", "Trade", "Section 122 expires; Section 301 tariffs start",
  "60 economies at 10–12.5%.", "Resolved", None, "Trade", "s301", True, "Sec. 301 tariffs")
C("e_fed", "2026-09-16", "Monetary & fiscal", "Fed hikes 25 bp",
  "First hike since July 2023.", "Resolved", None, "Rates", "kip_fed", True, "Fed hike")
C("e_xi", "2026-09-24", "Trade", "Trump–Xi summit extends truce",
  "New expiry 10 Jan 2027.", "Resolved", None, "Trade", "xi", True, "Trump–Xi")
C("e_tankers", "2026-10-02", "Middle East", "Wave of tanker strikes in Hormuz",
  "JMIC confirms four attacks on 2–3 Oct; more on 4–5 Oct.", "Resolved", None, "Oil", "gcaptain", True, "Tanker strikes")
C("e_stop", "2026-06-28", "Middle East", "US and Iran agree to stop exchanging attacks",
  "Follow-on to the 17 Jun memorandum.", "Resolved", None, "Oil", "wiki", True, "Attacks halted")
C("e_outcast", "2026-08-24", "Middle East", "Treasury launches Operation Economic Outcast",
  "Sanctions push on Iran's oil network; Treasury says no Iranian crude loaded since 25 Aug.", "Resolved", None, "Oil", "roic_iran", True, "Sanctions push")

# ---- Asia & Africa ----
S.update({
 "taiwan": ("Daily Signal: PLA activity around Taiwan, Jul 2026", "https://dailysignal.com/2026/07/31/red-wave-chinese-military-activity"),
 "scs": ("China Global South: Second Thomas Shoal clash", "https://chinaglobalsouth.com/2026/07/21/china-philippines-second-thomas-shoal-clash-asean/"),
 "korea": ("Stars and Stripes: North Korea missile launch, 2 Oct 2026", "https://www.stripes.com/theaters/asia_pacific/2026-10-02/north-korea-suspected-missile-launch-23038623.html"),
 "japan": ("Jamestown: Takaichi and Japan resist Chinese pressure", "https://jamestown.org/takaichi-and-japan-resist-chinese-pressure/"),
 "indpak": ("Daily Observer: India–Pakistan barricades, Aug 2026", "https://observerbd.com/news/589160"),
 "sudan": ("Sudan Tribune (Oct 2026 headlines)", "https://sudantribune.com/?p=310263"),
 "sudan_wiki": ("Wikipedia: Sudanese civil war timeline (2026)", "https://en.wikipedia.org/wiki/Timeline_of_the_Sudanese_civil_war_(2026)"),
 "drc": ("Africanews: new fighting in Masisi, Oct 2026", "https://www.africanews.com/2026/10/08/drc-new-fighting-in-masisi-as-au-delegation-rushes-to-save-ceasefire/"),
 "mali": ("Wikipedia: Mali fuel blockade", "https://en.wikipedia.org/wiki/Mali_fuel_blockade"),
 "ethiopia": ("AllAfrica: Ethiopia and Eritrea on edge again", "https://allafrica.com/stories/202602230005.html"),
 "libya": ("ROIC: Sharara output after pipeline reopening", "https://www.roic.ai/news/libyas-sharara-oil-field-output-nears-340000-bd-after-pipeline-reopening-09-30-2026"),
})
C("taiwan", "2026-10-10", "Asia-Pacific", "Taiwan Strait: arms package and PLA pressure",
  "PLA activity was subdued in H1 2026, but analysts expect a rebound; a pending ~$14bn US arms package and the Jan 10 truce cliff raise the odds of drills.",
  "Monitoring", 3, "TAIEX, TWD, semiconductors, KRW", "taiwan")
C("korea", "2026-10-02", "Asia-Pacific", "Korean Peninsula: missile tests and DMZ mines",
  "Ballistic launches on 20 Sep and 2 Oct; mine blasts injured three ROK soldiers on 21 Sep and UN Command found an armistice violation.",
  "Escalating", 2, "KRW, Korean equities, JPY", "korea")
C("scs", "2026-07-20", "Asia-Pacific", "South China Sea: China–Philippines clashes",
  "Coast guard clash at Second Thomas Shoal injured a Filipino sailor; water-cannon use at Scarborough followed on 23 Jul.",
  "Active", 2, "Regional shipping, PHP, defense", "scs")
C("japanchina", "2026-04-28", "Asia-Pacific", "China–Japan economic coercion",
  "Seafood ban, tourism clampdown and rare-earth curbs after PM Takaichi's Taiwan remarks; Japan has cut rare-earth reliance on China to about 60%.",
  "Active", 2, "JPY, Japanese tourism and retail, rare earths", "japan")
C("indpak", "2026-08-20", "Asia-Pacific", "India–Pakistan: Kashmir tensions",
  "Diplomatic tit-for-tat continues after Operation Sindoor; outside analysts flag the risk of renewed armed conflict in 2026.",
  "Monitoring", 2, "INR, PKR, Indian equities, oil demand", "indpak")
C("sudan", "2026-10-11", "Africa", "Sudan civil war: Kordofan front and gold",
  "Fighting centred on Kordofan and Darfur; air strikes on gold mines near the Egyptian border reported 11 Oct; the EU has banned Sudanese gold purchases.",
  "Active", 2, "Gold supply chains, Red Sea shipping, South Sudan crude", "sudan")
C("drc", "2026-10-08", "Africa", "DRC–M23: ceasefire fraying",
  "New fighting in Masisi as AU facilitators visited Goma; the 2025 Doha commitment and December Washington accord are not holding on the ground.",
  "Escalating", 2, "Cobalt, copper, tin and tantalum", "drc")
C("sahel", "2026-04-28", "Africa", "Mali/Sahel: JNIM blockade of Bamako",
  "JNIM declared a full blockade of Bamako on 28 Apr after an army offensive; fuel convoys have been attacked since Sep 2025.",
  "Active", 2, "Gold miners in Mali, West African sovereigns", "mali")
C("libya", "2026-09-26", "Africa", "Libya oil outages",
  "An armed group shut the Sharara pipeline valve 21–26 Sep (about $95m lost); output back above 300 kb/d by 28 Sep.",
  "Monitoring", 2, "Brent (light-sweet Mediterranean crude)", "libya")
C("ethiopia", "2026-02-20", "Africa", "Ethiopia–Eritrea: Red Sea access dispute",
  "Ethiopia presses claims to Assab and demanded Eritrean troop withdrawal in February; Eritrea rejects the allegations.",
  "Monitoring", 1, "Red Sea shipping, Horn of Africa sovereigns", "ethiopia")

# ---- Latin America ----
S.update({
 "br_vote": ("Emirates 24|7: Flávio Bolsonaro advances to runoff", "https://www.emirates247.com/world/flavio-bolsonaro-outperforms-polls-advances-to-brazil-presidential-runoff-against-lula/6341"),
 "br_mkt": ("MercoPress: São Paulo stocks jump after first round", "https://en.mercopress.com/2026/10/05/s-o-paulo-stocks-jump-8-and-the-real-firms-after-bolsonaro-s-first-round-win"),
 "ven": ("Wikipedia: 2026 in Venezuela", "https://en.wikipedia.org/wiki/2026_in_Venezuela"),
 "ven_oil": ("Petroleum Australia: Venezuela and US finalise oil deal", "https://petroleumaustralia.com.au/news_article/venezuela-and-us-finalise-major-oil-deal/"),
 "usmca": ("IISD: US declines to renew USMCA at first joint review", "https://www.iisd.org/itn/2026/09/09/united-states-declines-to-renew-usmca-at-first-joint-review-triggering-annual-reviews/"),
 "mxn": ("Mexico News Daily: after September nosedive, is the super peso gone?", "https://mexiconewsdaily.com/business/after-september-nosedive-is-super-peso-gone-for-good/"),
 "sheinbaum": ("Bloomberg Law: Sheinbaum rejects US strikes on Mexico", "https://news.bloomberglaw.com/international-trade/mexicos-sheinbaum-touts-very-good-talk-with-donald-trump"),
 "co_cert": ("Vanguardia: Trump keeps Colombia decertified", "https://www.vanguardia.com/colombia/2026/09/16/trump-mantiene-a-colombia-en-la-lista-antidrogas-y-deja-una-puerta-abierta-a-de-la-espriella/"),
 "co_tariff": ("Medellin.co: Colombia asks Trump to pause 12.5% duty", "https://medellin.co/blog/colombia-us-tariff-suspension-request-trump-august-2026-earthquake"),
 "arg": ("Americas Quarterly: Argentina 2026 snapshot", "https://americasquarterly.org/article/argentina-a-2026-snapshot/"),
})
C("brazil", "2026-10-25", "Latin America", "Brazil presidential runoff",
  "Flávio Bolsonaro led the 4 Oct first round 47.5% to Lula's 44.7%; markets rallied on expected fiscal tightening. Runoff 25 Oct; in 2022 a similar first-round rally reversed when Lula won.",
  "Scheduled", 3, "BRL, Bovespa, Brazilian banks, Petrobras, DI rates", "br_vote")
C("mexico", "2026-09-30", "Latin America", "Mexico: USMCA non-renewal and peso carry unwind",
  "The US declined to renew USMCA on 1 Jul, triggering annual reviews; the peso fell 6.3% in September as Fed hikes narrowed the carry spread to 250 bp. US threats of strikes on cartels remain a tail risk.",
  "Active", 3, "MXN, Mexican autos and nearshoring, Mbonos", "mxn")
C("venezuela", "2026-06-13", "Latin America", "Venezuela after Maduro",
  "US forces captured Maduro on 3 Jan; the US recognized acting president Delcy Rodríguez in March, reopened its embassy and signed an oil deal of up to $2bn; private oil investment is now allowed.",
  "De-escalating", 2, "Heavy crude supply, Venezuela and PDVSA bonds, US Gulf refiners", "ven")
C("colombia", "2026-09-16", "Latin America", "Colombia: decertification and tariffs",
  "Washington kept Colombia decertified (with a waiver) on 16 Sep but praised new President De la Espriella; a 12.5% Section 301 tariff applies, and an Aug 10 earthquake killed at least 294.",
  "Monitoring", 2, "COP, Colombian sovereign spreads, cut flowers and apparel exporters", "co_cert")
C("argentina", "2026-01-20", "Latin America", "Argentina: reserves and US swap line",
  "Milei won the Oct 2025 midterms but lacks a majority; Argentina relies on a $20bn US Treasury swap and faces about $20bn of 2026 debt payments while rebuilding reserves.",
  "Monitoring", 2, "ARS, Argentine dollar bonds", "arg")
C("e_maduro", "2026-01-03", "Latin America", "US strikes Caracas and captures Maduro",
  "Acting president Delcy Rodríguez sworn in on 5 Jan.", "Resolved", None, "Oil, LatAm sovereigns", "ven", True, "Maduro captured")
C("e_brazil", "2026-10-04", "Latin America", "Brazil first round: Flávio Bolsonaro leads",
  "Bovespa up as much as 8% the next day; real stronger.", "Resolved", None, "BRL, Bovespa", "br_mkt", True, "Brazil 1st round")

REGION = {"Middle East": "Middle East", "Monetary & fiscal": "Global", "Trade": "Global", "US politics": "Americas",
          "Courts": "Americas", "Europe & Russia": "Europe", "Tech controls": "Global", "Asia-Pacific": "Asia-Pacific", "Africa": "Africa", "Latin America": "Latin America"}
CHANNEL = {"Middle East": "hormuz", "Monetary & fiscal": "fed_fiscal", "Trade": "trade", "US politics": "us_politics",
           "Courts": "us_politics", "Europe & Russia": "russia_europe", "Tech controls": "tech_controls",
           "Asia-Pacific": "asia", "Africa": "africa", "Latin America": "latam"}
DIRECTION = {"e_war": 1, "e_lng": 1, "e_block": 1, "e_collapse": 1, "e_outcast": 1, "e_tankers": 1,
             "e_cease": -1, "e_mou": -1, "e_stop": -1, "e_301": 1, "e_ieepa": -1, "e_xi": -1, "e_fed": 0}
for r in cat:
    r["region"] = REGION[r["theme"]]
    r["channel"] = CHANNEL[r["theme"]]
    r["direction"] = DIRECTION.get(r["id"]) if r["marker"] else None
json.dump(cat, open(os.path.join(OUT, "catalysts.json"), "w"))

# ---------- Washington monitor ----------
wa = []
def W(id_, branch, body, item, status, last, nxt, relevance, assets, k):
    r = {"id": id_, "branch": branch, "body": body, "item": item, "status": status, "last_action": last,
         "next_date": nxt, "relevance": relevance, "assets": assets}
    r.update(src(k)); wa.append(r)
W("w_cr", "Congress", "Appropriations", "FY2027 stopgap (H.R. 6500) through 11 Dec", "Enacted", "2026-09-02", "2026-12-11",
  "Lame-duck funding fight lands five weeks after the midterms; prior 2026 shutdowns lasted 42 and 76 days.", "T-bills, data calendar", "cr")
W("w_wpr", "Congress", "House & Senate", "Iran war powers concurrent resolution", "Passed both chambers", "2026-06-23", None,
  "House 215–208 and Senate 50–48; non-binding, but a signal of eroding support for open-ended operations.", "Oil, defense", "wpr")
W("w_clarity", "Congress", "Senate", "CLARITY Act (digital asset market structure)", "Cloture failed", "2026-09-15", None,
  "49–50 vote with no Democratic support; reconsideration motion entered; ethics provisions are the sticking point.", "Crypto, exchanges", "clarity")
W("w_s122", "Congress", "Trade authority", "Section 122 tariffs not extended", "Lapsed", "2026-07-24", None,
  "Congress let the 150-day balance-of-payments tariff expire; the administration shifted to Section 301 and 338.", "Importers", "s301")
W("w_mid", "Congress", "Elections", "Midterm elections", "Scheduled", "2026-10-10", "2026-11-03",
  "A divided government would constrain fiscal and trade agendas from January.", "Broad", "odds_oct")
W("w_ieepa", "Supreme Court", "Decided", "Learning Resources v. Trump (IEEPA tariffs)", "Decided 6–3", "2026-02-20", None,
  "IEEPA does not authorize tariffs; about $175bn of collections exposed to refund claims.", "Importers, Treasury cash", "ieepa")
W("w_cook", "Supreme Court", "Decided (stay stage)", "Trump v. Cook (Fed governor removal)", "Cook remains", "2026-06-29", None,
  "Removal 'for cause' is reviewable and needs process; merits litigation continues.", "Fed credibility, term premium", "cook")
W("w_suncor", "Supreme Court", "OT2026 argued", "Suncor Energy v. Boulder County (climate torts)", "Argued", "2026-10-05", None,
  "Whether federal law precludes state climate-damage suits; about 60 similar cases nationwide.", "Oil majors, insurers", "suncor")
W("w_intel", "Supreme Court", "OT2026 argued", "Anderson v. Intel Corp. Investment Policy Committee (ERISA)", "Argued", "2026-10-06", None,
  "Retirement-plan fiduciary case on alternative investments; relevant to private markets in 401(k)s.", "Asset managers, private markets", "ot26")
W("w_paramount", "Supreme Court", "OT2026 calendar", "Salazar v. Paramount Global (Video Privacy Protection Act)", "Set for argument", None, "2026-10-14",
  "Scope of statutory privacy liability for online video and data sharing.", "Media, ad tech", "ot26")
W("w_fed", "Agency", "Federal Reserve", "Rate hike to 3.75–4.00%", "Next meeting", "2026-09-16", "2026-10-28",
  "Chair Warsh gave no forward guidance; futures put October hike odds near 51% after the meeting.", "Rates, USD", "kip_fed")
W("w_basel", "Agency", "Fed / FDIC / OCC", "Basel III endgame reproposal and GSIB surcharge recalibration", "Comments closed", "2026-06-18", None,
  "Largest banks' CET1 requirements fall about 5% combined with surcharge and stress-buffer changes.", "Bank equities, Treasury market depth", "basel")
W("w_genius", "Agency", "OCC", "GENIUS Act stablecoin final rule", "Final rule targeted", "2026-08-19", "2026-11-30",
  "Missed the July deadline; Comptroller aims for November with the Act effective January 2027.", "Stablecoins, T-bill demand", "genius")
W("w_sec", "Agency", "SEC", "Optional semiannual reporting; climate-rule rescission; proxy and 14a-8 reform", "Proposals", "2026-07-06", "2026-10-31",
  "October slate includes shareholder-proposal, executive-pay and offering-reform proposals.", "Public issuers", "sec")
W("w_ofac", "Agency", "Treasury / OFAC", "Iran oil sanctions (Operation Economic Outcast)", "Active", "2026-10-08", None,
  "Launched 24 Aug; Treasury says Iran has loaded no crude since 25 Aug; 22 tankers sanctioned 8 Oct.", "Oil, shipping", "roic_iran")
W("w_ustr", "Agency", "USTR / White House", "Section 301 and 338 tariffs", "In force", "2026-08-19", None,
  "10–12.5% on 60 economies; +25% Brazil; +50% on specified Canadian goods from 19 Aug.", "Importers, CAD, BRL", "s301")
W("w_bis", "Agency", "Commerce / BIS", "Advanced chip and AI model export controls", "Monitoring", "2026-06-30", None,
  "Case-by-case review for H200-class chips to China; June licence requirement on two frontier models lifted 30 Jun.", "Semis, AI", "bis_models")
W("w_cbp", "Agency", "CBP", "IEEPA tariff refunds", "Processing", "2026-07-24", None,
  "Most refunds expected 60–90 days after an accepted declaration.", "Importers' cash flow", "s301")
W("w_usmca", "Agency", "USTR", "USMCA joint review: renewal declined", "Annual reviews", "2026-07-01", "2027-07-01",
  "Agreement stays in force to 2036 but faces yearly reviews; US–Mexico bilateral rounds continue, little formal engagement with Canada.", "MXN, CAD, autos",
  "usmca")
json.dump(wa, open(os.path.join(OUT, "washington.json"), "w"))

# ---------- Regulation (US & EU) ----------
rg = []
def R(id_, jur, sector, regulator, measure, stage, key_date, summary, impact, k):
    r = {"id": id_, "jurisdiction": jur, "sector": sector, "regulator": regulator, "measure": measure, "stage": stage,
         "key_date": key_date, "summary": summary, "market_impact": impact}
    r.update(src(k)); rg.append(r)
R("r_basel", "US", "Bank capital", "Fed, FDIC, OCC", "Basel III endgame reproposal (expanded risk-based approach)", "Proposed", "2026-06-18",
  "Standardized, less 'gold-plated' framework; CET1 +1.2% at holding companies, −5.1% at insured banks.",
  "Capital relief for the largest banks; supports buybacks and balance-sheet capacity for Treasuries.", "basel")
R("r_gsib", "US", "Bank capital", "Federal Reserve", "GSIB surcharge Method 2 recalibration", "Proposed", "2026-06-18",
  "About 20% cut to Method 2 coefficients, indexed to GDP growth; averages replace year-end snapshots.",
  "Lower surcharges; less year-end window dressing in funding markets.", "basel")
R("r_genius", "US", "Digital assets", "OCC, Treasury, FDIC, Fed", "GENIUS Act stablecoin implementing rules", "Final rule pending", "2026-11-30",
  "Full reserve backing; audits above $50bn; OCC capital and liquidity rules.",
  "Structural demand for T-bills; bank vs non-bank issuer competition.", "genius")
R("r_clarity", "US", "Digital assets", "Congress (SEC/CFTC split)", "CLARITY Act market structure", "Stalled", "2026-09-15",
  "Would allocate jurisdiction between SEC and CFTC; failed cloture 49–50.",
  "Regulatory overhang for exchanges and tokens persists into 2027.", "clarity")
R("r_semi", "US", "Markets & disclosure", "SEC", "Optional semiannual reporting", "Proposed", "2026-05-31",
  "Lets issuers report half-yearly instead of quarterly.",
  "Less frequent disclosure; wider information gaps around earnings.", "sec")
R("r_climate_sec", "US", "Sustainability", "SEC", "Rescission of climate disclosure rules", "Proposed", "2026-05-31",
  "Would remove the 2024 climate-related disclosure requirements.",
  "Divergence from EU reporting widens for cross-listed issuers.", "sec")
R("r_tariff", "US", "Trade & sanctions", "USTR, White House", "Section 301 / 338 tariff regime", "In force", "2026-07-24",
  "Replaced IEEPA and Section 122 tariffs after the Supreme Court ruling.",
  "Durable statutory basis, but country rates still negotiable; refunds flow to importers.", "s301")
R("r_ofac", "US", "Trade & sanctions", "Treasury / OFAC", "Iran shadow-fleet sanctions", "Active", "2026-10-08",
  "Vessels, intermediaries and ship-to-ship operators targeted.",
  "Tightens seaborne supply; raises freight and insurance costs.", "roic_iran")
R("r_chips", "US", "AI & tech", "Commerce / BIS", "Licence policy for advanced chips to China", "In force", "2026-01-15",
  "Case-by-case review for H200/MI325X-class chips with volume caps and third-party testing.",
  "Partial China revenue path for US chipmakers; Beijing restricting imports limits uptake.", "bis_chips")
R("r_models", "US", "AI & tech", "Commerce / BIS", "Export licensing of frontier AI models", "Lifted", "2026-06-30",
  "Novel use of an is-informed letter to treat model access as an export; lifted after 18 days.",
  "Precedent risk for AI-as-a-service; litigation pending.", "bis_models")
R("r_aiact", "EU", "AI & tech", "European Commission / Parliament / Council", "AI Act 'AI Omnibus' delay", "Adopted", "2027-12-02",
  "High-risk obligations moved to 2 Dec 2027 (standalone) and 2 Aug 2028 (embedded).",
  "Lower near-term compliance costs for AI deployers in Europe.", "ai_omni")
R("r_digital", "EU", "AI & tech", "European Commission", "Digital Omnibus (GDPR, NIS2, Data Act)", "Pending", None,
  "Separate package still in the legislative process; Council vote was delayed.",
  "Data-usage rules for AI training remain uncertain.", "ai_omni")
R("r_omni1", "EU", "Sustainability", "European Commission / Parliament / Council", "Omnibus I: CSRD and CSDDD simplification", "Adopted", "2027-03-19",
  "CSRD scope cut to 1,000+ employees and €450m turnover; CSDDD to 5,000+ and €1.5bn, compliance by 26 Jul 2029.",
  "Far fewer reporting entities; ESG data supply shrinks.", "omni1")
R("r_frtb", "EU", "Bank capital", "European Commission", "FRTB market-risk delay", "Delegated act", "2027-01-01",
  "Market-risk rules postponed again to 1 Jan 2027.",
  "Trading-book capital relief for EU banks; transatlantic alignment watched.", "frtb")
R("r_eu21", "EU", "Trade & sanctions", "Council of the EU", "21st Russia sanctions package", "Adopted", "2026-07-23",
  "Oil price cap frozen at $44.10; 41 shadow-fleet vessels; 33 banks; 17 crypto platforms; LNG exemptions to 2027–28.",
  "Tighter Russian export logistics; LNG phase-out timelines matter for winter balance.", "eu21")
R("r_gas", "EU", "Energy", "European Commission / IEA", "Gas storage target and AccelerateEU", "Active", "2026-11-01",
  "90% storage target applied flexibly; coordinated purchasing and demand reduction.",
  "Winter price risk if refill lags; utilities and energy-intensive industry exposed.", "xtb_ttf")
json.dump(rg, open(os.path.join(OUT, "regulation.json"), "w"))

# ---------- Calendar ----------
cal = []
def K(date, event, kind, assets, k):
    r = {"date": date, "event": event, "type": kind, "assets": assets}
    r.update(src(k)); cal.append(r)
K("2026-10-14", "US September CPI (8:30 ET)", "Data", "Rates, USD", "cpi_date")
K("2026-10-14", "Supreme Court argument: Salazar v. Paramount Global", "Courts", "Media, ad tech", "ot26")
K("2026-10-28", "FOMC decision (27–28 Oct)", "Central bank", "Rates, USD, equities", "kip_fed")
K("2026-11-01", "EU gas storage 90% target date", "EU", "TTF, utilities", "xtb_ttf")
K("2026-11-03", "US midterm elections", "Politics", "Broad", "odds_oct")
K("2026-11-10", "US October CPI", "Data", "Rates", "cpi_date")
K("2026-11-30", "OCC GENIUS Act final rule (target)", "Regulation", "Stablecoins", "genius")
K("2026-12-02", "EU AI Act: deepfake ban applies; transparency grace period ends", "EU", "AI", "ai_omni")
K("2026-12-09", "FOMC decision (8–9 Dec)", "Central bank", "Rates", "kip_fed")
K("2026-12-10", "US November CPI", "Data", "Rates", "cpi_date")
K("2026-12-11", "Government funding deadline", "Politics", "T-bills, data", "cr")
K("2027-01-01", "EU FRTB market-risk rules apply; LNG terminal ban widens", "EU", "EU banks, LNG", "frtb")
K("2027-01-10", "US–China trade truce expires", "Trade", "Semis, rare earths, ag", "xi")
K("2027-01-31", "GENIUS Act takes effect (January 2027)", "Regulation", "Stablecoins", "genius")
K("2027-03-19", "CSRD transposition deadline", "EU", "Reporting entities", "omni1")
K("2027-07-14", "EU Russian oil price-cap freeze ends", "EU", "Oil, shipping", "eu21")
K("2027-12-02", "EU AI Act high-risk obligations (standalone systems)", "EU", "AI", "ai_omni")
K("2026-10-25", "Brazil presidential runoff", "Politics", "BRL, Bovespa", "br_vote")
K("2027-07-01", "USMCA annual joint review", "Trade", "MXN, CAD, autos", "usmca")
cal.sort(key=lambda r: r["date"])
for i, r in enumerate(cal):
    r["key"] = f'{r["date"]}|{i}'
json.dump(cal, open(os.path.join(OUT, "calendar.json"), "w"))

# ---------- Asia & Africa indicators (appended) ----------
S.update({"cba_tw": ("CommBank: November deadline over Trump–Xi meeting", "https://www.commbank.com.au/articles/newsroom/2026/09/trump-xi-summit-rare-earths-november-deadline.html")})
I("pla_median", "Asia-Pacific", "PLA sorties crossing the Taiwan Strait median line (4 Jun spike)", 25, "sorties", "2026-06-04",
  "Short-lived spike on the Tiananmen anniversary; activity otherwise subdued in H1 2026", "taiwan")
I("tw_arms", "Asia-Pacific", "Pending US arms package for Taiwan", 14, "$bn", "2026-09-22",
  "Up to $14bn; expected to be discussed at the Trump–Xi summit", "cba_tw")
I("jp_re", "Asia-Pacific", "Japan's rare-earth reliance on China", 60, "%", "2026-04-28",
  "Down from about 90% after diversification (Lynas stake, deep-sea exploration)", "japan", 90)
I("sharara", "Africa", "Libya Sharara field output after reopening", 300, "kb/d", "2026-09-28",
  "Above 300 kb/d after a five-day valve shutdown; about 335 kb/d in August", "libya", 335)
I("sharara_loss", "Africa", "Revenue lost in the Sharara shutdown", 95, "$m", "2026-09-26",
  "Valve 7 on the Sharara–Zawiya pipeline closed 21–26 Sep", "libya")
I("sudan_idps", "Africa", "Internally displaced people in Sudan", 9.2, "million", "2026-02-04",
  "Mostly in Darfur", "sudan")
I("sudan_health", "Africa", "Attacks on health care in Sudan, Jan–Aug 2026", 900, "attacks", "2026-08-31",
  "WHO: over 900 attacks; 37% of facilities out of service", "sudan_wiki")
I("br_flavio", "Latin America", "Flávio Bolsonaro, first-round vote share", 47.45, "%", "2026-10-04",
  "With just over 97% counted; runoff 25 Oct", "br_vote")
I("br_lula", "Latin America", "Lula, first-round vote share", 44.66, "%", "2026-10-04",
  "With just over 97% counted", "br_vote")
I("banxico", "Latin America", "Banxico policy rate", 6.50, "%", "2026-09-24",
  "Held on 24 Sep; carry spread over the Fed narrowed to 250 bp", "mxn")
I("mx_carry", "Latin America", "Mexico–US policy rate spread", 250, "bp", "2026-09-24",
  "Narrowed after the Fed's 16 Sep hike", "mxn")
I("mxn_sept", "Latin America", "Peso depreciation in September", 6.32, "%", "2026-09-30",
  "Largest monthly drop since June 2024", "mxn")
I("co_tariff", "Latin America", "US Section 301 tariff on Colombia", 12.5, "%", "2026-07-24",
  "Coffee, bananas, crude oil and coal excluded", "co_tariff")
I("arg_swap", "Latin America", "US Treasury swap line for Argentina", 20, "$bn", "2026-01-20",
  "Argentina also faces about $20bn of 2026 debt payments", "arg")
I("ven_oil", "Latin America", "US–Venezuela crude export deal", 2, "$bn", "2026-01-06",
  "Up to $2bn of Venezuelan crude to the US", "ven_oil")
json.dump(ind, open(os.path.join(OUT, "indicators.json"), "w"))

# ---------- Scenarios (analyst probabilities) ----------
scen = [
 {"id": "esc", "scenario": "Escalation", "direction": 1, "probability": 0.30,
  "description": "Strikes spread to Gulf export infrastructure or the US blockade tightens into direct naval clashes; transits stay near zero."},
 {"id": "base", "scenario": "Status quo", "direction": 0, "probability": 0.50,
  "description": "Closure and blockade persist with sporadic tanker strikes; no new step-change."},
 {"id": "deesc", "scenario": "De-escalation", "direction": -1, "probability": 0.20,
  "description": "An Iran–Oman Hormuz arrangement and ceasefire allow talks to resume and the blockade to ease."},
]
json.dump(scen, open(os.path.join(OUT, "scenarios.json"), "w"))

# ---------- Asset-class framework ----------
fw = []
COLS = ["hormuz", "trade", "fed_fiscal", "us_politics", "russia_europe", "tech_controls", "asia", "africa", "latam"]
def F(asset, region, gauge, series, sign, transmission, ex, read, watch, hedge, fade, pm):
    r = {"asset_class": asset, "region": region, "gauge": gauge, "series": series, "sign": sign, "transmission": transmission,
         "current_read": read, "watch": watch, "hedge_expression": hedge, "fade_expression": fade, "pm_tilt": pm}
    r.update(dict(zip(COLS, ex)))
    fw.append(r)
F("Energy", "Global", "Brent futures", "Brent", 1,
  "Physical supply loss through Hormuz and the Red Sea; sanctions on Iranian barrels; Libyan outages.",
  [3,1,1,1,2,0,1,2,1], "Futures well above pre-war levels while dated physical Brent trades at a large premium: the prompt market is tighter than the curve implies.",
  "Hormuz transit counts, dated-vs-futures premium, Brent–WTI spread, tanker strike frequency.",
  "Long Brent call spreads or prompt time-spreads", "Sell upside calls or prompt spreads into a credible Hormuz deal",
  "Keep energy as the portfolio's shock hedge; cap energy-intensive cyclicals")
F("Rates", "US", "US 10-year yield", "UST 10Y", 1,
  "Energy-led inflation keeps the Fed hiking; war spending and issuance lift term premium.",
  [3,1,3,2,1,0,1,0,0], "Yields near the highest since 2023 with Treasury vol elevated: rates are the main shock absorber.",
  "CPI 14 Oct, FOMC 28 Oct, auction tails, lame-duck fiscal deal.",
  "Short duration via futures; pay 5s30s steepeners", "Receive 10-year on signs of hike exhaustion",
  "Run shorter duration; prefer breakevens over nominals")
F("Rates volatility", "US", "MOVE index", "MOVE", 1,
  "Policy uncertainty (Fed path, fiscal cliff, Fed independence) reprices option premia.",
  [2,1,3,2,0,0,1,0,0], "MOVE jumped from the 70s to above 100 in late September, a regime shift in rates uncertainty.",
  "Persistence above 100; spillover into swap and mortgage spreads.",
  "Long payer swaptions", "Sell rates straddles after event dates",
  "Raise rates-vol assumptions in risk models")
F("US equities", "US", "VIX", "VIX", 1,
  "Margins (energy inputs), discount rates, tariff costs, AI capex and export-control exposure.",
  [2,2,3,2,1,2,2,0,1], "Index at highs with VIX in the mid-teens: equities price little geopolitical tail risk.",
  "VIX term structure, energy-sensitive sectors, semis around China and export-control headlines.",
  "Long VIX calls or S&P put spreads while implied vol is cheap", "Overwrite calls; sell VIX upside",
  "Trim beta; tilt toward energy and defense, away from airlines and discretionary")
F("Credit", "US", "HY spread (OAS)", "HY OAS", 1,
  "Energy-intensive issuers, refinancing at higher yields, tariff-hit importers.",
  [2,2,2,1,1,1,1,0,0], "High-yield spreads widened sharply from late August but remain below the March peak; IG is still tight.",
  "HY OAS trend, airline and chemical names, issuance windows into year-end.",
  "Buy CDX HY protection", "Sell protection / add carry after spikes",
  "Move up in quality: IG over HY; avoid energy-intensive issuers")
F("Gold", "Global", "Gold futures", "Gold", 1,
  "Safe-haven demand vs rising real yields and a firmer dollar.",
  [2,1,3,1,1,0,1,1,0], "Gold has fallen from its January record as Fed hikes and real yields dominate the war premium.",
  "Real yields, central-bank buying, Fed independence headlines.",
  "Long gold calls as convex haven", "Short gold against rising real yields",
  "Do not rely on gold as the war hedge in a hiking cycle")
F("US dollar", "US", "US Dollar Index", "DXY", 1,
  "Rate differentials and terms of trade: US as energy exporter vs Europe and Asia as importers.",
  [2,2,3,1,1,0,1,0,1], "Dollar at a one-year high as the Fed out-hikes and energy importers' terms of trade worsen.",
  "EUR/USD vs TTF, CNH around the January truce, CAD under Section 338 tariffs.",
  "Long USD vs energy importers (EUR, INR, KRW)", "Fade USD strength on a Fed pause",
  "Keep USD hedge ratios high on foreign assets")
F("Taiwan semis", "Asia-Pacific", "TAIEX", "TAIEX", -1,
  "Concentrated AI-supply-chain exposure to cross-strait risk, US–China truce and export controls.",
  [1,3,2,1,0,3,3,0,0], "TAIEX near record highs: the market is pricing AI demand, not Strait risk.",
  "PLA activity around Taiwan arms announcements, the 10 Jan truce cliff, BIS chip rules.",
  "Buy TAIEX or TSM put spreads; long USD/TWD calls", "Sell TWD volatility",
  "Cap Taiwan semis concentration; hedge into the January cliff")
F("Korea FX", "Asia-Pacific", "USD/KRW", "USD/KRW", 1,
  "Energy-importer terms of trade, DPRK provocations, chip-export cycle.",
  [2,2,2,0,0,2,3,0,0], "Won has strengthened since July despite missile tests: provocations are not being priced.",
  "DPRK launches and DMZ incidents, Brent, Korean chip exports.",
  "Long USD/KRW", "Short USD/KRW for carry",
  "Hedge Korea FX on equity exposure")
F("India FX", "Asia-Pacific", "USD/INR", "USD/INR", 1,
  "Oil-import bill and Kashmir tensions.",
  [3,2,2,0,1,0,2,0,0], "Rupee near record lows as the oil bill rises.",
  "Brent, RBI intervention, Kashmir incidents.",
  "Long USD/INR", "Short USD/INR on oil relief",
  "Hedge India FX; favour domestic over oil-sensitive sectors")
F("Industrial metals", "Africa", "Copper futures", "Copper", 1,
  "DRC/Zambia supply risk, China demand, US tariffs on metals.",
  [1,2,1,1,0,1,1,3,1], "Copper near record levels on supply tightness.",
  "Eastern DRC fighting, cobalt export rules, China stimulus.",
  "Long copper call spreads", "Fade copper rallies on China growth scares",
  "Prefer miners with supply outside conflict zones")
F("Softs", "Africa", "Cocoa futures", "Cocoa", 1,
  "West African supply (weather, disease, regional security).",
  [0,1,0,0,0,0,0,2,0], "Cocoa has rebounded sharply since June after the early-2026 collapse.",
  "Ivorian and Ghanaian mid-crop, Sahel spillover.",
  "Long cocoa call spreads", "Fade rallies driven by non-geopolitical weather",
  "Watch confectionery margins")
F("South Africa FX", "Africa", "USD/ZAR", "USD/ZAR", 1,
  "EM-Africa risk proxy: oil import bill, global risk appetite, metals.",
  [2,1,2,1,0,0,0,2,0], "Rand has held up well, helped by strong metals prices.",
  "Brent, gold and platinum prices, global risk appetite.",
  "Long USD/ZAR", "Short USD/ZAR for carry",
  "Use ZAR as liquid proxy hedge for EM-Africa exposure")
F("Brazil equities", "Latin America", "Bovespa", "Bovespa", -1,
  "Election outcome drives fiscal credibility and rates; Section 301 tariffs on exports; commodity terms of trade.",
  [1,2,2,0,0,0,0,0,3], "Bovespa at a record after the first round: the market is pricing a Bolsonaro win and fiscal tightening.",
  "Runoff polls into 25 Oct, fiscal pledges, DI curve, Petrobras governance.",
  "Buy Bovespa (EWZ) put spreads into the runoff", "Sell Brazil downside after a decisive result",
  "Size Brazil for a binary runoff; hedge with BRL options rather than outright cuts")
F("Brazil FX", "Latin America", "USD/BRL", "USD/BRL", 1,
  "Election, fiscal risk premium, US tariffs, carry vs a hiking Fed.",
  [1,2,2,0,0,0,0,0,3], "Real near its strongest of the year after the first-round rally.",
  "Runoff polls, fiscal announcements, Selic path.",
  "Long USD/BRL calls into the runoff", "Short USD/BRL for carry after the result",
  "Keep BRL exposure optional into 25 Oct")
F("Mexico FX", "Latin America", "USD/MXN", "USD/MXN", 1,
  "USMCA annual reviews, carry spread to a hiking Fed, US security pressure on cartels.",
  [1,3,3,2,0,0,0,0,3], "Peso just had its worst month in over two years as carry narrowed.",
  "US–Mexico negotiating rounds, Banxico vs Fed spread, cartel-strike rhetoric.",
  "Long USD/MXN", "Short USD/MXN once carry stabilises",
  "Cap nearshoring exposure until USMCA terms are clearer")
F("Colombia FX", "Latin America", "USD/COP", "USD/COP", 1,
  "Oil exporter terms of trade, US decertification and tariffs, fiscal slippage.",
  [1,1,2,0,0,0,0,0,2], "Peso strengthened through the year with oil; first signs of reversal in late September.",
  "Brent, US certification decision, fiscal rule.",
  "Long USD/COP", "Short USD/COP with oil support",
  "Treat COP as an oil-linked hedge offset")
json.dump(fw, open(os.path.join(OUT, "framework.json"), "w"))

for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    print(f, os.path.getsize(p), len(json.load(open(p))))
