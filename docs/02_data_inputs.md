# 02 · Data inputs

This guide lists every input to the monitor: where it comes from, how it was captured, what it covers and which parts of the page use it. It also separates the three kinds of input (market data, researched facts and analyst judgment) and explains how to refresh them.

- [At a glance](#at-a-glance)
- [Market data](#market-data)
- [Researched datasets](#researched-datasets)
- [Analyst judgments](#analyst-judgments)
- [How the data was captured](#how-the-data-was-captured)
- [Conventions](#conventions)
- [Refreshing the data](#refreshing-the-data)
- [Known data issues](#known-data-issues)

The generated [data inventory](data_inventory.md) lists all 24 datasets with row counts, dates and sizes. [Sources](sources.md) lists every URL cited in the data.

## At a glance

| Source | What it provides | How it was captured | Coverage | Used for |
|---|---|---|---|---|
| **Yahoo Finance** history pages | 37 daily closes: commodities, equity indices and ETFs, Treasury yields, vol indices, FX | Daily history tables fetched page by page and stored as text | 9 Oct 2025 – 9 Oct 2026 (desk series from 3 Nov 2025); event windows 2019–25 | Stress composite, signals, desks, event study, shock lab |
| **FRED** (St. Louis Fed) | ICE BofA credit spreads (HY, IG, CCC, BBB, EM corporate), breakevens and real yields, H.4.1 balance sheet | Series data files and series pages | Daily spreads Oct 2025 – Oct 2026; H.4.1 weekly from Sep 2025 | Credit desk, stress composite, Fed balance sheet |
| **New York Fed** Markets API | EFFR, SOFR (rate, 99th percentile, volume), target range, ON RRP take-up | JSON from `markets.newyorkfed.org/api` | Oct 2025 – 9 Oct 2026 | Fed rates corridor, plumbing monitor |
| **US Treasury** par yield curve | 3-month, 2-year and 10-year par yields | Daily CSV | Oct 2025 – 9 Oct 2026 | Fed corridor, 2-year factor in the shock lab and Fed betas |
| **Caldara–Iacoviello** daily GPR | Daily geopolitical risk index | Latest 30 days from the index site | 6 Sep – 5 Oct 2026 | Geopolitics view |
| **Prediction markets** (Kalshi, Polymarket) | Midterm control, CLARITY Act odds; Fed hike odds (with CME FedWatch) | Reported odds with date and source | Mar – Oct 2026 | Policy and Fed views |
| **News, official releases and legal trackers** | Catalysts, Washington items, regulation, calendar, FOMC decisions, Fed communications, regional indicators | Researched and summarised, one source link per row | Jan 2026 – Dec 2027 (forward dates) | Geopolitics, Policy, Calendar, Fed views; exposure index; event study |

## Market data

### Core series: 19 series in `markets.json`

One year of daily closes, from 9 Oct 2025. These feed the stress composite, the 17-asset signal board and the regional gauges.

| Series | Ticker | Unit | Desk | Source |
|---|---|---|---|---|
| Brent | BZ=F | $/bbl | Energy | Yahoo Finance |
| UST 10Y | ^TNX | % | Rates | Yahoo Finance |
| MOVE | ^MOVE | index | Volatility | Yahoo Finance |
| VIX | ^VIX | index | Volatility | Yahoo Finance |
| S&P 500 | ^GSPC | index | Equities | Yahoo Finance |
| Gold | GC=F | $/oz | Metals & Ags | Yahoo Finance |
| DXY | DX-Y.NYB | index | FX | Yahoo Finance |
| TAIEX | ^TWII | index | Equities | Yahoo Finance |
| USD/TWD, USD/KRW, USD/INR | TWD=X, KRW=X, INR=X | local per USD | FX | Yahoo Finance |
| USD/ZAR | ZAR=X | ZAR per USD | FX | Yahoo Finance |
| Copper | HG=F | $/lb | Metals & Ags | Yahoo Finance |
| Cocoa | CC=F | $/t | Metals & Ags | Yahoo Finance |
| Bovespa | ^BVSP | index | Equities | Yahoo Finance |
| USD/BRL, USD/MXN, USD/COP | BRL=X, MXN=X, COP=X | local per USD | FX | Yahoo Finance |
| HY OAS | BAMLH0A0HYM2 | % | Credit | FRED (ICE BofA) |

### Desk series: 22 series in `desk.json`

Daily from 3 Nov 2025. These give each desk the instruments it actually trades.

| Desk | Series (ticker) |
|---|---|
| Equities | Energy XLE, Defense ITA, Airlines JETS, Semiconductors SMH |
| Volatility | VIX 9-day ^VIX9D, VIX 3-month ^VIX3M, crude oil vol ^OVX, gold vol ^GVZ |
| Rates | UST 3M ^IRX, UST 5Y ^FVX, UST 30Y ^TYX |
| Energy | WTI CL=F, RBOB gasoline RB=F, ULSD diesel HO=F, Frontline FRO (tanker equity, a freight proxy) |
| Metals & Ags | Wheat ZW=F |
| FX | USD/JPY, USD/CHF, USD/CNY |
| Credit | EM corporate OAS (BAMLEMCBPIOAS), CCC OAS (BAMLH0A3HYC), BBB OAS (BAMLC0A4CBBB), from FRED |

### Derived series: 11 calculated in `site/calcs.js`

| Series | Formula | Desk |
|---|---|---|
| Treasury 2Y | US Treasury par yield (from `fed_daily`) | Rates |
| 3-2-1 crack | (2 × RBOB × 42 + ULSD × 42 − 3 × WTI) ÷ 3, $/bbl | Energy |
| Diesel crack | ULSD × 42 − WTI, $/bbl | Energy |
| Brent–WTI | Brent − WTI | Energy |
| VIX / VIX 3M | VIX ÷ VIX 3-month (above 1 = inverted, near-term panic) | Volatility |
| 3m10y | 10-year − 3-month yield | Rates |
| 5s30s | 30-year − 5-year yield | Rates |
| CCC–BBB | CCC OAS − BBB OAS (credit decompression) | Credit |
| ITA / JETS | Defense ÷ airlines | Equities |
| XLE / S&P 500, SMH / S&P 500 | Sector relative to the market (×1000) | Equities |

Together these make the **52-series universe** the event study, shock betas and shock matrix run on.

### Fed data: `fed_daily.json` and `fed_weekly.json`

| Series | Frequency | Source | Notes |
|---|---|---|---|
| EFFR, EFFR 99th percentile | Daily | NY Fed | Effective fed funds rate and its tail |
| SOFR, SOFR 99th percentile, SOFR volume | Daily | NY Fed | Secured overnight rate; the tail shows repo pressure |
| Target range (lower, upper) | Daily | NY Fed | IORB is derived as upper − 10 bp; the standing repo rate is the top of the range |
| ON RRP take-up | Daily | NY Fed | Overnight reverse repo, $bn |
| Treasury 3M, 2Y, 10Y | Daily | US Treasury | Par yield curve |
| Total assets (WALCL) | Weekly (Wed) | FRED, Fed H.4.1 | $bn |
| Reserve balances (WRESBAL) | Weekly | FRED, Fed H.4.1 | $bn |
| Treasury General Account (WTREGEN) | Weekly | FRED, Fed H.4.1 | $bn |
| Treasury securities held (TREAST), MBS held (WSHOMCB) | Weekly | FRED, Fed H.4.1 | $bn |
| Repo, standing repo facility (WORAL) | Weekly | FRED, Fed H.4.1 | Proxy for daily operation results |
| Primary credit, discount window (WLCFLPCL) | Weekly | FRED, Fed H.4.1 | $bn |

### Historical event windows: `hist.json` and `hist_events.json`

Daily prices for Brent, VIX, S&P 500, gold, the 10-year yield and the dollar index around eight earlier geopolitical shocks:

- the Abqaiq attack (Sep 2019);
- the Soleimani strike and the stand-down (Jan 2020);
- the invasion of Ukraine (Feb 2022);
- 7 October (Oct 2023);
- Iran–Israel (Apr 2024);
- the June 2025 strikes and the ceasefire.

These windows provide the out-of-sample confirmation for the 2026 event study.

### Snapshots

- **`fred.json`**: the last five observations of IG and HY OAS, dated Brent, the 10-year, VIX, the 10-year breakeven and the 10-year real yield.
- **`gpr.json`**: 30 days of the daily geopolitical risk index.

## Researched datasets

Each row carries a `source_title` and `source_url`. [Sources](sources.md) lists all of them.

| Dataset | Rows | What it holds | Key fields |
|---|---:|---|---|
| `catalysts` | 47 | Geopolitical and policy catalysts across the Middle East (13), Global (9), Latin America (7), Americas (6), Asia-Pacific (5), Africa (5) and Europe (2). 32 are live and 15 are dated past markers | `region`, `channel` (hormuz, trade, asia, latam, africa, us_politics, fed_fiscal, russia_europe, tech_controls), `status`, `analyst_risk`, `assets`, `marker`, `direction` |
| `washington` | 19 | Congress (5), Supreme Court (5) and agencies and regulators (9) | `status`, `last_action`, `next_date`, `relevance`, `assets` |
| `regulation` | 16 | US (10) and EU (6) measures across bank capital, digital assets, markets and disclosure, sustainability, trade and sanctions, AI and tech, and energy | `jurisdiction`, `sector`, `regulator`, `stage`, `key_date`, `market_impact` |
| `calendar` | 20 | Dated catalysts from 14 Oct 2026 to Dec 2027: data releases, central banks, elections, courts, trade and EU dates | `date`, `event`, `type`, `assets` |
| `indicators` | 33 | Regional and alternative indicators: Hormuz transits and attacks, Iran loadings, TTF and EU storage, policy rates and CPI, tariff exposure, Taiwan Strait sorties, Libya output, Sudan, Brazil polls, Banxico | `group`, `metric`, `value`, `baseline`, `context` |
| `predictions` | 12 | Kalshi and Polymarket odds for House, Senate and both chambers (March vs October) and the CLARITY Act | `platform`, `probability`, `as_of` |
| `fed_decisions` | 8 | FOMC decisions since Oct 2025: change, range, vote, hawkish and dovish dissents, guidance, balance sheet, dots | `change_bp`, `hawk_dissents`, `dove_dissents` |
| `fed_comms` | 10 | Fedspeak and minutes, Jun – Oct 2026 | `speaker`, `voter`, `stance` (−2 to +2), `timing`, `summary` |
| `fed_pricing` | 7 | Market-implied hike odds for 28 Oct and 9 Dec (CME FedWatch, Polymarket, press reports) | `meeting`, `prob_hike`, `platform`, `date` |

## Analyst judgments

These inputs are opinions, not measurements. They are labelled "analyst" on the page and kept in their own fields, so they can be reviewed and changed. They were drafted with AI assistance and should be checked by the person presenting them.

| Judgment | Where | Scale | Drives |
|---|---|---|---|
| Catalyst risk score | `catalysts.analyst_risk` | 1–5 | Exposure index, highest-risk catalysts, region summary |
| Asset exposure to each channel | `framework` columns `hormuz`, `trade`, `asia`, `latam`, `africa`, `us_politics`, `fed_fiscal`, `russia_europe`, `tech_controls` | 0–3 | Exposure index → pricing gap → signals |
| Signal direction per asset | `framework.sign` | +1 / −1 | Whether a high or low gauge reading means risk is priced |
| Hormuz scenario probabilities | `scenarios.probability` | 30% escalation / 50% status quo / 20% de-escalation | Scenario-weighted moves, combined scenarios |
| FOMC scenario probabilities and 2-year shocks | `fed_scenarios` | 19.4% hike (market-implied), 55% hawkish hold, 18% data-dependent, 7.6% extended pause; +12, +3, −5, −15 bp | Fed breakdown, combined scenarios |
| Fedspeak stance | `fed_comms.stance` | −2 (dovish) to +2 (hawkish) | Fedspeak tone |
| Plumbing thresholds | `fed_playbook.warn`, `.alert` | per indicator | Fed monitor statuses |
| Shock sizes | `shocks` | Brent +10%, 2-year +15 bp, S&P −3% | Shock matrix, simulator presets |
| Hedge and fade expressions, PM tilt | `framework` | text | Trade idea expressions |

## How the data was captured

All inputs were captured in October 2026 from free public pages (market data to 9 Oct, research to 11 Oct). It is stored in `raw/` so the build is reproducible and offline.

| File | Format | Contents |
|---|---|---|
| `raw/yahoo/*.txt` | `Mon D, YYYY,value` per line, most recent first | 18 core Yahoo histories (Brent, VIX, S&P 500 …) |
| `raw/yahoo/hy.csv` | `YYYY-MM-DD,value` | FRED HY OAS |
| `raw/captures.json` | `{url: [[date, value], …]}` | 65 parsed captures: desk series, 2019–25 windows, FRED, NY Fed and Treasury series |
| `raw/captures_raw.json` | `{url: text}` | 202 raw page captures, including the research pages behind catalysts, Fed communications and indicators |

Parsing rules (in steps 1, 2 and 4):

- weekend rows are dropped;
- where captures overlap, the first occurrence of a date wins, because files list the most recent fetch first;
- each series is trimmed to its window start (9 Oct 2025 for core series, 3 Nov 2025 for desk series).

## Conventions

| Convention | Rule |
|---|---|
| Moves | Prices in log %, yields and spreads in basis points, levels (cracks, ratios) in absolute units. Set by each series' `kind` |
| War anchor | 27 Feb 2026, the last close before the US–Israeli strikes on Iran began. "Since the war" changes are measured from it |
| Percentiles | Rank of the latest close within the full window (one year for core series, since 3 Nov 2025 for desk series) |
| As-of dates | Market data to 9 Oct 2026; the stress composite is dated 8 Oct, the last day every input has a close. Research as of 11 Oct 2026 |
| Days | Business days. Event windows run from the last close before an event to the fifth close on or after it |

## Refreshing the data

The monitor is a snapshot today; a scheduled live refresh is on the roadmap. To update it by hand:

1. **Prices.** Append new closes to `raw/yahoo/*.txt` (newest first) or add new captures to `raw/captures.json` under the same URL key. Free routes that work: the `yfinance` Python package for Yahoo tickers; FRED's API (free key) for ICE BofA spreads and H.4.1 series; `https://markets.newyorkfed.org/api/rates/unsecured/effr/last/30.json` and the equivalent SOFR and reverse-repo endpoints; and the Treasury's daily par yield curve CSV.
2. **Research.** Edit the rows in `01_build_core.py` (catalysts, Washington, regulation, calendar, indicators, predictions) and `04_build_fed.py` (decisions, communications, pricing). Keep a source link on every row.
3. **Judgments.** Revisit the risk scores, scenario probabilities and thresholds above.
4. **Dates.** Update `data_as_of` and `research_as_of` in `07_wrap_site.py` and the window constants in steps 1 and 2.
5. **Rebuild.** Run `bash run.sh`. The tests fail if a placeholder no longer resolves or an invariant breaks.

## Known data issues

- **FRED data files are truncated** at about 50 KB, which left some long daily series stale. SOFR, EFFR and ON RRP were taken from the NY Fed API instead, and the 2-year and 3-month yields from the Treasury CSV.
- **Daily standing repo results** were not available from the NY Fed operations endpoint at capture time. The weekly H.4.1 repo line (WORAL) is used as a proxy.
- **TAIEX ends on 6 Oct 2026** and VIX, DXY and HY OAS on 8 Oct, because of local holidays and publication lags. Calculations align series on shared dates.
- **Yahoo Finance** is a free aggregator. Futures are front-month continuous contracts with roll jumps, and the Treasury yields (^IRX, ^FVX, ^TNX, ^TYX) are CBOE yield indices, not on-the-run benchmarks.
- **Proxies**:
  - Frontline equity stands in for tanker freight;
  - OVX, GVZ and MOVE stand in for full options surfaces;
  - five-print breakevens stand in for a full history.

  [Limitations](05_limitations_and_roadmap.md) covers what each proxy misses.
