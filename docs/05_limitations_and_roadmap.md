# 05 · Limitations and roadmap

This page covers what the numbers cannot tell you and what comes next. It is written so a reviewer knows how much weight each output can bear.

## Limitations

### Data

| Limitation | Effect | Mitigation today |
|---|---|---|
| **Snapshot, not live.** Market data runs to 9 Oct 2026 and research to 11 Oct | Readings age from the day of capture | As-of dates on every panel and in the manifest; [refresh steps](02_data_inputs.md#refreshing-the-data) |
| **One year of daily data** (desk series from 3 Nov 2025) | Percentiles describe a war year; "high" is relative to an already stressed window | Comparison with 2019–25 analogs for the six core series |
| **Free sources** (Yahoo Finance, FRED, NY Fed, Treasury) | Continuous futures have roll jumps; Treasury yields are CBOE indices, not benchmarks; occasional gaps and holidays | Series aligned on shared dates; raw captures kept for audit |
| **Proxies for vendor data**: tanker equity for freight, OVX/GVZ/MOVE for options surfaces, weekly WORAL for daily standing repo results, five-print breakevens, dated hike-odds snapshots instead of futures | The vehicle check ignores skew and term structure. Freight moves include equity beta. Hike pricing has no daily history | Proxies labelled *Live (proxy)* on the roadmap |

### Method

| Limitation | Effect |
|---|---|
| **Small event samples**: six 2026 escalations, three de-escalations, eight historical shocks | A single event can swing an average. Hit rates like "67% of 12" carry wide error bars |
| **Full-window percentiles** (look-ahead) | The backtest and historical gap readings use information not available on the day |
| **In-sample, overlapping backtest** | 10-day windows overlap, so the effective sample is far smaller than *n*. No transaction costs. The 73% vs 48% result is evidence, not proof |
| **Heuristic thresholds** (±25, ±50, the plumbing levels) | Not optimised. A different cut-off would change some labels |
| **Linear, same-day factor betas** | The shock lab understates convexity, regime shifts and multi-day dynamics. Betas from a war year may not hold after it |
| **Independent scenario probabilities** | An escalation should raise hike odds through oil, so the combined grid understates the joint tail |
| **60/40 proxy** | S&P 500 plus a duration-8 Treasury sleeve. Not a real portfolio, with no credit, FX or rebalancing |
| **Analyst judgments**: risk scores, exposure ratings, scenario probabilities, stance scores, thresholds | They drive the exposure index, signals and scenarios. They were drafted with AI assistance and need human review before use |

### What it is not

- It is not a trading system. It gives no position sizing, no risk limits and no execution.
- It is not investment advice. Signals are research hypotheses for discussion.
- It does not forecast events. It measures whether markets are pricing the events that are already known and scored.

## Roadmap

The page's **Method & roadmap** view tracks 26 deliverables. Of these, 14 are live, 5 are live on proxy data, 3 are in progress and 4 need vendor data: 73% are live including proxies. The next steps fall into four groups.

### 1. Make it live

| Item | Status | Next step |
|---|---|---|
| Automated daily data refresh | In progress | Schedule the pipeline against market-data APIs: `yfinance`, FRED API, NY Fed Markets API, Treasury CSV. Publish via the Pages workflow |
| Daily standing repo operation results | Live (proxy) | Pull daily results from the NY Fed operations API instead of weekly H.4.1 |
| Prediction-market odds history | Live (proxy) | Store daily snapshots to chart odds over time |
| Automatic Fedspeak scoring | Live (analyst scores) | Score stance from transcripts, keeping the analyst score as an override |

### 2. Make it more rigorous

| Item | Status | Next step |
|---|---|---|
| Walk-forward backtest with costs | In progress | Extend data to 2015, use rolling (not full-window) percentiles, add bid–ask and roll costs, use non-overlapping windows |
| Rolling percentiles for the stress composite | Planned | Remove look-ahead from the regime read |
| Correlated joint scenario probabilities | In progress | Condition FOMC odds on oil, using the Fed's reaction to past energy shocks |
| Extend history to every desk series | Planned | Confirm desk-level signals out of sample, not just the six core series |
| Position sizing | Planned | Size ideas by volatility and correlation to the existing book |

### 3. Widen coverage

| Item | Status | Next step |
|---|---|---|
| Dollar and credit-spread shock factors | Planned | Add to the shock lab and simulator |
| Brent time spreads, energy-sector credit, regional (Gulf, Israel) equity, skew indices | Planned | New desk series |
| FX risk reversals and carry | Needs vendor data | Bloomberg or Refinitiv |
| Sovereign CDS for exposed countries | Needs vendor data | Markit or Bloomberg |
| Ship-tracking transit feed | Needs vendor data | AIS vendor (Kpler, Vortexa, MarineTraffic) |
| Fed funds futures and OIS meeting-by-meeting pricing | Needs vendor data | CME or Bloomberg for daily implied paths |

### 4. Make it easier to use

| Item | Next step |
|---|---|
| PM overrides | Let users change scenario probabilities and risk scores on the page and see signals update |
| Calendar export | Outlook and ICS export of the catalyst calendar |
| Alerts | Bill-text and docket alerts for the Washington and regulation trackers; notify when a plumbing indicator changes status |
| Desk-owned watchlists | Let each desk choose its series and thresholds |
