# 04 · Methodology

This guide sets out how every signal, score and scenario is calculated, and why it is built that way. The [calculation reference](calculations.md) has the exact definition of all 42 calculations, generated from `site/calcs.js`.

- [Conventions](#conventions)
- [Regime: stress composite and pricing gap](#regime-stress-composite-and-pricing-gap)
- [Signal engine](#signal-engine)
- [Event studies and confirmation](#event-studies-and-confirmation)
- [Desk reads, movers and momentum](#desk-reads-movers-and-momentum)
- [Fed tracker](#fed-tracker)
- [Shock lab](#shock-lab)
- [Combined scenarios](#combined-scenarios)
- [Backtest](#backtest)
- [Design choices](#design-choices)

## Conventions

| Item | Definition |
|---|---|
| Move | `price`: 100 × ln(Pₜ / Pₛ) in %. `rate`: 100 × (yₜ − yₛ) in bp. `level`: Lₜ − Lₛ in native units |
| Daily standard deviation σ | Standard deviation of daily moves over the series' window |
| z-score over h days | move ÷ (σ × √h) |
| Percentile rank | 100 × (number of closes in the window below the latest) ÷ (window length − 1), so 0 = window low and 100 = window high |
| War anchor | 27 Feb 2026, the last close before the strikes on Iran began |
| Event window | From the last close before the event to the 5th close on or after it |

## Regime: stress composite and pricing gap

Five gauges, each ranked against its own one-year history:

```
p(x)        = one-year percentile rank of x  (0 = year low, 100 = year high)
composite   = mean( p(Brent), p(10Y), p(MOVE), p(VIX), p(HY OAS) )
shock       = mean( p(Brent), p(10Y), p(MOVE) )          the channels a geopolitical shock travels through
pricing gap = shock − p(VIX)                              how much of the shock equity volatility charges for
```

| Rule | Label |
|---|---|
| composite ≥ 70 | Stressed |
| composite ≥ 45 | Elevated |
| otherwise | Calm |
| gap ≥ 40 | Equity vol cheap vs the shock |
| gap ≤ −10 | Equity vol rich |

**Why:** a geopolitical shock that lifts oil, yields and rate volatility while VIX sits low is a shock the equity market has not paid for. That is when hedges are cheapest relative to the risk. On 8 Oct 2026 the shock channels were at the 92nd percentile and VIX at the 17th, a gap of 75.

## Signal engine

The engine turns a qualitative risk ranking into a signal in four steps, for each of 17 asset classes.

**1. Exposure: how much geopolitical risk the asset should carry**

```
exposure_raw(a)   = Σ over live catalysts c of  risk(c) × rating(a, channel(c))
exposure_index(a) = 100 × exposure_raw(a) ÷ max over assets of exposure_raw
```

- `risk(c)` is the analyst risk score, 1–5.
- `rating(a, channel)` is the analyst exposure of asset *a* to that channel, 0 (none) to 3 (primary). The channels are Hormuz, trade, Asia, Latin America, Africa, US politics, Fed and fiscal, Russia–Europe, and tech controls.
- The index measures how much risk an asset should carry, not its direction.

**2. Priced: how much the market already charges**

```
priced(a) = p(gauge)            if a high reading means risk is priced (yields, spreads, vol, USD crosses)
          = 100 − p(gauge)      if a high reading means complacency (TAIEX, Bovespa)
```

**3. Gap**

```
gap(a) = exposure_index(a) − priced(a)
```

**4. Signal**

| Condition | Signal | Meaning |
|---|---|---|
| gap ≥ +25 and confirmed | **Under-priced** | Hedge: the risk is real and the market is not charging for it |
| gap ≥ +25, not confirmed | **Watch** | A gap, but past escalations don't back the hedge |
| gap ≤ −25 | **Rich** | Fade the premium |
| otherwise | **Fair** | No trade |

Conviction is **High** if |gap| ≥ 50 and **Medium** if |gap| ≥ 25. The ±25 and ±50 thresholds are heuristics, not optimised, which avoids fitting them to one year of data.

**Vehicle.** Three asset classes have an implied-vol index: OVX for oil, GVZ for gold and MOVE for rates. For these, the implied-vol percentile is compared with the spot percentile. Options are preferred when implied vol is at least 25 percentile points cheaper than spot, and outright when it is at least 25 points richer. Otherwise either works. On 9 Oct, oil implied vol (OVX, 39th percentile) was cheap against spot Brent (87th), so oil upside was better owned through calls.

**Trade ideas** are the actionable signals: Under-priced first, then Rich, then Watch, each ordered by the size of the gap. The top six are shown.

**Scenario-weighted move** per series:

```
E[5-day move] = P(escalation) × mean escalation move + P(de-escalation) × mean de-escalation move
```

The status quo contributes zero. The probabilities are analyst judgments: 30% escalation, 50% status quo, 20% de-escalation.

## Event studies and confirmation

**2026 event study.** Nine dated 2026 Middle East events carry a direction. Six are escalations (+1): the strikes begin, South Pars, the naval blockade, the ceasefire collapse, the Treasury's sanctions operation and the tanker strikes. Three are de-escalations (−1): the ceasefire, the memorandum and the halt to attacks. For every one of the 52 series it records:

- the mean 5-day move after escalations and after de-escalations;
- the share of events in which the series rose;
- the sensitivity, defined as the escalation mean minus the de-escalation mean.

**Historical analogs.** The same 5-day method is applied to eight 2019–25 shocks: Abqaiq, Soleimani and the stand-down, Ukraine, 7 October, Iran–Israel April 2024, and the June 2025 strikes and ceasefire. It covers the six series with long histories: Brent, VIX, S&P 500, gold, the 10-year and the dollar index.

**Confirmation.** A positive gap becomes *Under-priced* only if:

1. the gauge moved in its risk-priced direction on average after 2026 escalations;
2. it did so in at least half of them; and
3. for the six series with history, the 2019–25 analogs agree.

If only one sample agrees, the result is *Mixed*, which shows as Watch. This stops the engine recommending hedges that have not worked this year (gold, −3.2% on average after 2026 escalations and up in only 17%) or whose behaviour has flipped (the 10-year yield fell in past shocks but rose in 2026).

**Hedge efficacy:**

```
escalation z = mean 5-day escalation move ÷ (σ × √5)
```

Positive means the series rises when the conflict escalates. The escalation z is ranked across all series.

## Desk reads, movers and momentum

**Desk reads** are rule-based sentences built from each desk's metrics, for example:

- **Rates**: the curve is labelled from the 10-year and 3m10y changes since 27 Feb. Both up is *bear steepening* (inflation and term premium). 10-year up with 3m10y down is *bear flattening* (Fed-led). 10-year down with 3m10y up is *bull steepening* (growth fears). Both down is *bull flattening*.
- **Credit**: *decompression* when CCC–BBB has widened more than 25 bp in a month.
- **Volatility**: *contango* when VIX ÷ VIX 3M is below 0.95 and *inverted* above 1.
- **Energy**: compares the OVX percentile with Brent's and the 3-2-1 crack's to say whether upside is better owned through options.
- **FX**: *the dollar is the haven* when USD/JPY and USD/CHF have both risen since the war began. *The yen and franc are havens* when both have fallen. Otherwise behaviour is mixed.

**Movers.** The ten largest 5-day moves, ranked by 5-day z rather than raw size, so a 1% move in a quiet FX pair can outrank a 3% move in cocoa.

**Momentum:**

```
20-day z = 20-day change ÷ (σ × √20)
```

**Oil beta.** The slope of each series' daily move on Brent's daily log % move, over the last 60 shared days and over the war period.

## Fed tracker

**Corridor (daily).**

- IORB = top of the target range − 10 bp.
- The standing repo rate is the top of the range, and the ON RRP rate is the bottom.
- Spreads tracked, in bp: EFFR − IORB, SOFR − IORB, SOFR 99th percentile − standing repo rate, 2-year − EFFR, 3-month − EFFR and 2s10s.

**Balance sheet (weekly H.4.1).** Levels and 4-week changes of total assets, reserves, the TGA, Treasury and MBS holdings, the standing repo facility and the discount window. The discount window uses a 6-week change, and standing repo shows its 13-week high.

**Plumbing monitor.** Each micro-indicator is compared with written thresholds in `fed_playbook.json`:

| Indicator | Reading | Watch | Stress | What a breach signals |
|---|---|---|---|---|
| EFFR − IORB | latest, bp | ≥ −1 | ≥ 0 | Reserves becoming less than ample: banks bid fed funds toward IORB |
| SOFR − IORB | 5-day avg, bp | ≥ 0 | ≥ 5 | Repo pressure: dealers pay up for cash, so the balance sheet is too small for Treasury supply |
| SOFR 99th pct − SRF rate | 5-day avg, bp | ≥ −3 | ≥ 0 | Tail of repo trading through the Fed's ceiling |
| Standing repo usage | Wednesday, $bn | ≥ 5 | ≥ 25 | Dealers borrowing from the Fed's backstop rather than the market |
| ON RRP take-up | 5-day avg, $bn | ≤ 50 | — | The liquidity buffer is gone: money funds have moved cash into bills and repo |
| Reserve balances | latest, $tn | ≤ 2.9 | ≤ 2.8 | Distance to the Fed's "ample" floor |
| TGA, 4-week change | $bn | ≥ 100 | ≥ 200 | A rising Treasury cash account drains reserves one for one when ON RRP is empty |
| Discount window | latest, $bn | ≥ 8 | ≥ 20 | Banks borrowing directly from the Fed |
| Fed Treasury holdings, 4-week change | $bn | — | — | Pace of reserve-management purchases and reinvestment (shown as Info) |

The overall plumbing status is *Stress* if any indicator is in stress, *Watch* if two or more are on watch, and *Ample* otherwise. Each row also carries the market implication and the trader action.

**Fedspeak tone.** The mean of analyst stance scores (−2 dovish to +2 hawkish) over communications in the 30 days to the last market date. It also counts the statements that stress patience on timing.

**Rate-shock betas.** For each asset, a two-factor regression of its daily move on the daily change in the 2-year yield and Brent's daily move, over all shared days since Oct 2025:

```
move = α + β₂ʏ × Δ2Y + βₒᵢₗ × ΔBrent + ε          shown as β₂ʏ per +10 bp
```

Holding oil constant strips out the war's inflation channel, so β₂ʏ approximates a monetary-policy shock. As a cross-check, a simple beta is estimated on Fed event days only (FOMC decisions and the dated communications). *Agree* means its sign matches the full-sample beta.

**FOMC scenario breakdown:**

```
move(asset, outcome) = 2-year shock(outcome) × β₂ʏ(asset)
expected(asset)      = Σ P(outcome) × move(asset, outcome)
```

The four outcomes are a surprise hike (+12 bp), a hawkish hold (+3), a data-dependent hold (−5) and an extended pause (−15). The betas will understate moves when the Fed surprises through the balance sheet or forward guidance rather than the rate.

## Shock lab

**Three-factor betas (ordered).** Estimated over the last 250 shared days:

1. Regress each series on Δ2Y and ΔBrent together → **b_y2** (per bp) and **b_oil** (per 1%).
2. Add the S&P 500 as a third regressor → **b_spx** (per 1%).

The order matters:

- A Fed shock carries its usual equity and FX reaction, because the S&P is not held constant in step 1.
- The equity shock is a sell-off *beyond* what rates and oil explain.
- By construction, the 2-year's own b_y2, Brent's b_oil and the S&P's b_spx equal 1, which the tests check.

**Shock moves.**

```
event shock:   move = mean 5-day move after the defined events     (h = 5)
factor shock:  move = Δ2Y × b_y2 + ΔBrent × b_oil + ΔSPX × b_spx    (h = 1)
z              = move ÷ (σ × √h)
position z     = z for prices, levels and FX;  −z for yields and spreads
```

Position z is what a long holder earns: a long bond or credit position gains when yields or spreads fall.

**Hedges and exposures.** For each shock:

- the best hedges are up to five series with the highest positive position z;
- the most exposed are up to five with the most negative.

Curve spreads and ratios are excluded because "long 5s30s" is ambiguous. Product cracks stay in (long crack = long products, short crude). For the geopolitical shocks, a *History disagrees* flag marks series whose 2026 response contradicts the 2019–25 analogs.

**Transmission.** For each shock and desk: the mean |z| across the desk's series and the single largest mover. This shows where a shock lands first.

**Simulator.** Uses the same factor formula with user-set Δ2Y, ΔBrent and ΔSPX, so shocks can be stacked (a hawkish Fed *and* an oil spike).

## Combined scenarios

All twelve pairings of the three Hormuz scenarios with the four FOMC outcomes:

```
P(pair)       = P(Hormuz scenario) × P(FOMC outcome)                    assumes independence
move(series)  = Hormuz bundle(series) + 2-year shock × b_y2(series)
Hormuz bundle = mean 5-day escalation move (escalation), mean de-escalation move (de-escalation), 0 (status quo)
60/40         = 0.6 × S&P 500 move  +  0.4 × (−8 × Δ10Y in %)            ≈ duration 8 on the bond sleeve
expected      = Σ P(pair) × move
stress test   = 2 × escalation bundle + surprise-hike shock              (no probability attached)
```

The summary reports the most likely pairing, the worst and best among pairings with at least 5% probability, the expected move and the stress test.

**Known simplification:** an escalation should raise hike odds through oil, so independence understates the joint tail. Conditioning FOMC odds on oil is on the roadmap.

## Backtest

For every day with a stress reading, the gap is bucketed as wide (≥ 50), moderate (25–49) or narrow (< 25). Over the next 10 trading days the backtest records the VIX change in points, the share of windows in which VIX rose, and the S&P 500 log % return.

| Bucket | n | VIX rose | Avg VIX change | S&P 500 |
|---|---:|---:|---:|---:|
| Wide (≥ 50) | 22 | 73% | +0.41 pts | −0.15% |
| Moderate (25–49) | 32 | 50% | +0.55 pts | −0.09% |
| Narrow (< 25) | 184 | 48% | −0.37 pts | +0.82% |
| All days | 238 | 50% | −0.17 pts | +0.61% |

This is **in-sample** evidence, not proof. The windows overlap, so the effective sample is much smaller than *n*. The percentiles use the full year (look-ahead), and there are no transaction costs. A walk-forward version with costs is on the roadmap.

## Design choices

| Choice | Why |
|---|---|
| Percentiles, not levels | Makes oil, yields, spreads and vol comparable on one 0–100 scale |
| Fixed heuristic thresholds (±25, ±50) | One year of data cannot support optimised thresholds without overfitting |
| Confirmation from two samples | 2026 alone is a handful of events. History guards against regime-specific flukes, and disagreement is shown rather than averaged away |
| Vol-adjusted z for every comparison | A 2% move means different things in cocoa and the dollar |
| Ordered factors in the shock lab | Matches how desks think: a Fed shock moves equities; an equity shock is what is left over |
| Judgments in their own fields | Reviewers can challenge assumptions without reading code |
| Calculations in the browser | The page cannot show a number the data does not support, and every figure is reproducible |
