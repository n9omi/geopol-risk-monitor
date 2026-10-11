# Geopolitical Risk Monitor

A cross-asset research toolkit that turns geopolitical and policy catalysts into measurable, tradable signals. It is built the way portfolio managers and trading directors read research: the regime first, then ranked ideas with a vehicle, then the evidence behind them, and what to watch next.

**Market data to 9 Oct 2026 · research as of 11 Oct 2026 · 52 daily series · 24 datasets · 42 calculations · 9 views**

![The Brief view: regime, Fed watch, ranked trade ideas, movers and the next 30 days](docs/img/brief.png)

## Why it's useful

Most geopolitical research stops at "risk is rising". The questions a PM asks next are harder: *is it priced, where does it land in my book, what should I put on, and in what form?* This monitor answers each of those from data, and shows its working.

| The PM's question | How the monitor answers it | What it said on 9 Oct 2026 |
|---|---|---|
| Is the shock priced? | **Pricing gap**: the one-year percentile of the shock channels (Brent, 10-year yield, MOVE) minus the VIX percentile | Gap 75, wider than on 97% of days in the past year. Regime **Stressed** (composite 77, +9 in 20 days) |
| Where does it land? | **Exposure index** per asset class (catalyst risk × channel exposure) against each market's own gauge, plus a **shock × asset matrix** across all 52 series | US equities most under-priced (gap +83). Escalation lands hardest on energy (3-2-1 crack), then wheat and Treasuries |
| What do I put on? | **Ranked trade ideas** with a vehicle (options vs outright, from implied vs spot percentiles) | Long VIX calls or S&P put spreads while implied vol is cheap |
| Does the evidence back it? | **Confirmation** against the 2026 event study and 2019–25 analogs; an in-sample **backtest** of the gap | VIX rose over the next 10 days in 73% of windows when the gap was ≥ 50, vs 48% when it was < 25 |
| What could hit the book? | **Combined scenarios** (Hormuz × 28 Oct FOMC) on a 60/40, plus a stress test | Most likely: status quo + hawkish hold (27.5%), −0.11%. Worst plausible: status quo + surprise hike (9.7%), −0.45% |
| What's the Fed doing under the surface? | **Fed tracker**: rates corridor, balance sheet, plumbing monitor with thresholds and actions, Fedspeak tone, FOMC scenario tree | Tightening bias (tone +0.75). Reserves $3.03tn, ample but on watch: ON RRP ~$1bn, discount window $10bn |
| What's coming? | **Catalyst calendar**, Washington monitor, US/EU regulation tracker | 20 dated catalysts from 14 Oct 2026 to Dec 2027 |

### Who uses which part

| Audience | Start with | What they get |
|---|---|---|
| Portfolio managers, CIO, trading directors | **Brief** | Regime, top six ideas, scenario stress on a 60/40, deliverables headway, all on one screen |
| Traders and desk heads | **Signals**, **Desks**, **Fed** | Gap and vehicle per asset, a rule-based read for each of seven desks, FOMC-day betas, plumbing thresholds |
| Risk managers | **Shocks** | Six shocks × 52 series, a shock simulator, ranked hedges and exposures, combined scenarios |
| Strategists and global affairs | **Geopolitics**, **Policy**, **Calendar** | 47 sourced catalysts across six regions with risk scores, Congress, courts and agencies, US/EU regulation by sector |

## What's in it

The page has nine views. [Features and outputs](docs/03_features_and_outputs.md) walks through each one panel by panel.

| View | Question it answers | Main panels |
|---|---|---|
| **Brief** | What matters this morning? | Regime and pricing gap, Fed watch, top six trade ideas, what moved, next 30 days, desk views, backtest, scenario stress, headway, hotspots by region |
| **Signals** | Which assets are mispriced versus their geopolitical exposure? | Stress composite vs equity vol, 17-asset signal board, risk-premium gap, hedge efficacy in 2026 escalations, gap backtest, history vs 2026, event study, Hormuz scenarios, playbooks for traders, PMs and strategists |
| **Shocks** | What happens to every asset under a given shock, and how do I hedge it? | Shock × asset impact matrix, shock simulator, transmission by desk, ranked impacts, best hedges and most exposed positions, Hormuz × FOMC combined scenarios |
| **Desks** | What does each desk need to know? | Equities, Rates, Credit, Energy, Metals & Ags, FX and Volatility: charts, a rule-based read, desk signals and 2026 escalation reactions |
| **Fed** | Where is policy going, and is liquidity tightening under the surface? | Policy and plumbing reads, rates corridor, plumbing monitor, balance sheet and liquidity, decisions and dissents, hike pricing, communications tracker, 28 Oct FOMC scenarios with trader breakdown, rate-shock betas |
| **Geopolitics** | Where are the hotspots, and what is the market saying? | Catalysts against the market, highest-risk live catalysts, catalyst tracker, regional gauges, physical vs paper oil, daily GPR, prediction markets, regional indicators |
| **Policy** | What are Washington and Brussels doing that moves markets? | Congress, the Supreme Court, agencies and regulators; US vs EU regulation by sector with measure detail |
| **Calendar** | What is scheduled? | Upcoming catalysts with dates, type and source |
| **Method & roadmap** | How is it built, and what is still missing? | 26 deliverables with status, exposure matrix, method and caveats, data coverage |

| Signals | Shock × asset matrix | Fed plumbing monitor |
|---|---|---|
| ![Signal board](docs/img/signals.png) | ![Shock matrix](docs/img/shock_matrix.png) | ![Fed monitor](docs/img/fed_monitor.png) |
| **Shock simulator** | **Combined scenarios** | **Energy desk** |
| ![Shock simulator](docs/img/shock_simulator.png) | ![Combined scenarios](docs/img/combined_scenarios.png) | ![Energy desk](docs/img/desk_energy.png) |

## Outputs

One run of `run.sh` produces:

| Output | Where | What it is |
|---|---|---|
| Dashboard | `site/index.html` | The full nine-view page. It is static and self-contained, so it can be served from anywhere, including GitHub Pages |
| Morning brief | [`outputs/latest_brief.md`](outputs/latest_brief.md) | Regime, trade ideas, Fed read, scenario stress, desk reads and backtest evidence as a note you can paste into an email |
| Analysis tables | `outputs/*.csv` (14 files) | Signal board, trade ideas, shock matrix, hedges, betas, combined scenarios, Fed monitor, FOMC reactions and more, ready for Excel |
| Datasets | `site/data/*.json` + `manifest.json` | The 24 input datasets the page reads, each with title, description, rows and date coverage |
| Reference docs | `docs/calculations.md`, `docs/data_inventory.md`, `docs/sources.md` | Generated on each run, so they never drift from the code and data |

## Quickstart

```bash
git clone https://github.com/n9omi/n9omi-geopol-risk-monitor.git
cd n9omi-geopol-risk-monitor
bash run.sh                          # rebuild datasets and page, run tests, export outputs
python3 -m http.server -d site 8000  # then open http://localhost:8000
```

You need Python 3.9 or later; the pipeline uses only the standard library. The tests and exports need Node.js 18 or later, and `run.sh` installs their two dev dependencies (d3 and jsdom) on first run. Open the page through a local server rather than by double-clicking the file, because browsers block `fetch` from `file://` pages.

To publish the page, set **Settings → Pages → Source** to **GitHub Actions**. The included workflow tests the page and deploys `site/` to [n9omi.github.io/n9omi-geopol-risk-monitor](https://n9omi.github.io/n9omi-geopol-risk-monitor/) on every push to `main`.

## How it's built

```
raw/ (captured prices + research)  →  pipeline/01–07 (Python)  →  site/data/*.json  →  site/calcs.js (42 calculations)  →  site/index.html
                                                                                  └→  tests/ (invariants, page marks, browser smoke test)  →  outputs/, docs/
```

- **Raw captures** (`raw/`): price histories from Yahoo Finance, FRED, the New York Fed Markets API and the US Treasury yield curve, stored exactly as fetched, plus the researched rows (catalysts, Fed communications, regulation) with a source link on each.
- **Pipeline** (`pipeline/01–07`): seven Python steps that clean the captures into 24 datasets, generate the page and write the manifest and data docs.
- **Calculations** (`site/calcs.js`): 42 named calculations, from percentile ranks to regressions and scenario grids. They run in the browser, so the numbers on the page are computed live from the data rather than typed in.
- **Runtime** (`site/runtime.js`): a small loader that fetches the datasets, runs the calculations in dependency order and fills the page.
- **Tests** (`tests/`): every calculation is checked against invariants, each of the page's 444 data-bound numbers must resolve, and a simulated browser clicks through every tab, desk, preset and slider.

[Build steps](docs/01_build_steps.md) has the full walkthrough, including how to add a series, a catalyst or a shock.

## Data, and what is judgment

| Kind | Examples | Where it comes from |
|---|---|---|
| **Market data** | 41 daily price and yield series, 11 derived spreads and ratios, Fed corridor rates, H.4.1 balance sheet, 2019–25 event windows | Yahoo Finance, FRED, New York Fed, US Treasury. Data to 9 Oct 2026 |
| **Researched facts** | 47 catalysts, 19 Washington items, 16 regulatory measures, 8 FOMC decisions, 10 Fed communications, prediction-market odds, alternative indicators | News, official releases and legal trackers, each row linked to its source ([sources](docs/sources.md)) |
| **Analyst judgment** | Catalyst risk scores (1–5), exposure ratings, Hormuz and FOMC scenario probabilities, plumbing thresholds, Fedspeak stance scores | Labelled "analyst" on the page and in the data, so a reviewer can see and change every assumption |

[Data inputs](docs/02_data_inputs.md) lists every source, series and field, and how to refresh them.

## Documentation

| Document | Covers |
|---|---|
| [01 Build steps](docs/01_build_steps.md) | Architecture, the seven pipeline steps, the page and runtime, tests, deployment, extending the monitor |
| [02 Data inputs](docs/02_data_inputs.md) | Every source, series, dataset and field; capture method; data vs judgment; refreshing |
| [03 Features and outputs](docs/03_features_and_outputs.md) | Each view and panel: what it shows, how to read it, who it's for; every exported file |
| [04 Methodology](docs/04_methodology.md) | Signal logic, event studies, Fed tracker, shock lab and backtest, with formulas |
| [05 Limitations and roadmap](docs/05_limitations_and_roadmap.md) | What the numbers can't tell you, and what's next |
| [Calculation reference](docs/calculations.md) | All 42 calculations, generated from the code |
| [Data inventory](docs/data_inventory.md) | All 24 datasets, generated from the manifest |
| [Sources](docs/sources.md) | Every cited URL and the datasets that use it |

## Repository map

```
├── run.sh                    one command: rebuild, test, export
├── pipeline/                 Python, standard library only
│   ├── 01_build_core.py      markets, catalysts, Washington, regulation, calendar, framework …
│   ├── 02_build_desk.py      desk series and 2019–25 event windows
│   ├── 03_build_extra.py     desk metadata, analog events, roadmap
│   ├── 04_build_fed.py       Fed corridor, balance sheet, decisions, communications, scenarios
│   ├── 05_build_shocks.py    shock definitions for the shock lab
│   ├── 06_build_page.py      generates site/dashboard.html
│   ├── 07_wrap_site.py       manifest, standalone index.html, data inventory and sources
│   ├── paths.py
│   └── templates/            page sections and dataset descriptions
├── raw/                      captured inputs, exactly as fetched
├── site/                     the deployable dashboard
│   ├── index.html  dashboard.html  calcs.js  app.js  runtime.js  theme.css
│   └── data/                 24 datasets + manifest.json
├── tests/                    calculation checks, page-mark checks, browser smoke test
├── outputs/                  latest_brief.md and 14 CSV tables
└── docs/                     guides, generated references, screenshots
```

## Built with

Built by Naomi Tinga with Claude (Anthropic) as an AI research and coding assistant. Claude gathered the public data, wrote the pipeline, calculations and tests, and drafted the analyst judgments. Every judgment is labelled as such and is meant to be reviewed, not taken as given.

## Disclaimer

This is a research and portfolio project. It is not investment advice, and nothing in it is a recommendation to trade. Market data is a snapshot captured in October 2026 from free public sources and may contain errors. Signals are tested in-sample only. See [limitations](docs/05_limitations_and_roadmap.md).

## License

[MIT](LICENSE)
