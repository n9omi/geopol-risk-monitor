"""Step 5: shock lab definitions (shocks.json) and roadmap rows. Run after step 4."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import OUT, YAHOO, CAPTURES, CAPTURES_RAW, SITE, TEMPLATES
import json
O = OUT
shocks = [
 dict(id='esc', order=1, label='Hormuz escalation', type='event', event_field='esc_mean', horizon=5, y2=0, oil=0, spx=0, description='Average 5-day move after the six 2026 Middle East escalation events.'),
 dict(id='deesc', order=2, label='Hormuz de-escalation', type='event', event_field='deesc_mean', horizon=5, y2=0, oil=0, spx=0, description='Average 5-day move after the three 2026 de-escalation events (ceasefire, peace memo, attacks halted).'),
 dict(id='hist', order=3, label='Geopolitical shock, 2019–25', type='event', event_field='hist_esc_mean', horizon=5, y2=0, oil=0, spx=0, description='Average 5-day move after six earlier escalations (Abqaiq, Soleimani, Ukraine, 7 October, Iran 2024, June 2025); six core series only.'),
 dict(id='oil', order=4, label='Oil spike: Brent +10%', type='factor', event_field=None, horizon=1, y2=0, oil=10, spx=0, description='A 10% same-day rise in Brent with the 2-year yield held constant.'),
 dict(id='fed', order=5, label='Hawkish Fed: 2-year +15 bp', type='factor', event_field=None, horizon=1, y2=15, oil=0, spx=0, description='A 15 bp same-day rise in the 2-year yield (a surprise hike with hawkish guidance) with Brent held constant.'),
 dict(id='riskoff', order=6, label='Equity sell-off: S&P −3%', type='factor', event_field=None, horizon=1, y2=0, oil=0, spx=-3, description='A 3% S&P 500 fall beyond what rates and oil explain (growth or positioning shock).'),
]
json.dump(shocks, open(O + 'shocks.json', 'w'), ensure_ascii=False)
rm = [r for r in json.load(open(O + 'roadmap.json')) if r['id'] not in ('shocklab', 'jointprob')]
n = max(r['order'] for r in rm)
rm += [dict(id='shocklab', deliverable='Cross-asset shock lab: impact matrix, simulator, hedges, combined scenarios', audience='PMs, directors, traders', desk='Cross-asset', status='Live', detail='Six defined shocks across 52 series; three-factor betas (2-year, Brent, equity) let shocks be stacked; Hormuz × FOMC scenario grid with 60/40 impact.', next_step='Add a dollar and a credit-spread factor.', order=n + 1),
       dict(id='jointprob', deliverable='Correlated joint scenario probabilities', audience='Strategists', desk='Cross-asset', status='In progress', detail='Combined scenarios assume Hormuz and the Fed are independent; an escalation should raise hike odds.', next_step='Condition FOMC odds on oil using the Fed reaction to past energy shocks.', order=n + 2)]
json.dump(rm, open(O + 'roadmap.json', 'w'), ensure_ascii=False)
print('shocks', len(shocks), 'roadmap', len(rm))
