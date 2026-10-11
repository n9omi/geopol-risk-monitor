"""Step 2: desk-level daily series (sector ETFs, vol indices, Treasury tenors, energy futures, tanker equity, wheat, FX, ICE BofA credit OAS)
and historical event-window prices (Brent, VIX, S&P 500, gold, 10-year, dollar index) for the 2019–25 analogs."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import OUT, YAHOO, CAPTURES, CAPTURES_RAW, SITE, TEMPLATES
import json, datetime as dt
F = json.load(open(CAPTURES))
Y = 'https://finance.yahoo.com/quote/%s/history/?period1=%s&period2=1791590400'
def rows_for(url):
    return F[url]
def wk(d): return dt.date.fromisoformat(d).weekday() < 5
START, END = '2025-11-03', '2026-10-09'
# (series, url key, ticker, unit, desk, kind, source)
D = [
 ('XLE', Y % ('XLE', 1760054400), 'XLE', '$', 'Equities', 'price', 'Yahoo Finance'),
 ('ITA', Y % ('ITA', 1760054400), 'ITA', '$', 'Equities', 'price', 'Yahoo Finance'),
 ('JETS', Y % ('JETS', 1760054400), 'JETS', '$', 'Equities', 'price', 'Yahoo Finance'),
 ('SMH', Y % ('SMH', 1761955200), 'SMH', '$', 'Equities', 'price', 'Yahoo Finance'),
 ('VIX 9D', Y % ('%5EVIX9D', 1761955200), '^VIX9D', 'pts', 'Volatility', 'price', 'Yahoo Finance'),
 ('VIX 3M', Y % ('%5EVIX3M', 1761955200), '^VIX3M', 'pts', 'Volatility', 'price', 'Yahoo Finance'),
 ('OVX', Y % ('%5EOVX', 1761955200), '^OVX', 'pts', 'Volatility', 'price', 'Yahoo Finance'),
 ('GVZ', Y % ('%5EGVZ', 1761955200), '^GVZ', 'pts', 'Volatility', 'price', 'Yahoo Finance'),
 ('UST 3M', Y % ('%5EIRX', 1761955200), '^IRX', '%', 'Rates', 'rate', 'Yahoo Finance'),
 ('UST 5Y', Y % ('%5EFVX', 1761955200), '^FVX', '%', 'Rates', 'rate', 'Yahoo Finance'),
 ('UST 30Y', Y % ('%5ETYX', 1761955200), '^TYX', '%', 'Rates', 'rate', 'Yahoo Finance'),
 ('WTI', Y % ('CL%3DF', 1761955200), 'CL=F', '$/bbl', 'Energy', 'price', 'Yahoo Finance'),
 ('RBOB', Y % ('RB%3DF', 1761955200), 'RB=F', '$/gal', 'Energy', 'price', 'Yahoo Finance'),
 ('ULSD', Y % ('HO%3DF', 1761955200), 'HO=F', '$/gal', 'Energy', 'price', 'Yahoo Finance'),
 ('Frontline (FRO)', Y % ('FRO', 1761955200), 'FRO', '$', 'Energy', 'price', 'Yahoo Finance'),
 ('Wheat', Y % ('ZW%3DF', 1761955200), 'ZW=F', '¢/bu', 'Metals & Ags', 'price', 'Yahoo Finance'),
 ('USD/JPY', Y % ('JPY%3DX', 1761955200), 'JPY=X', 'rate', 'FX', 'price', 'Yahoo Finance'),
 ('USD/CHF', Y % ('CHF%3DX', 1761955200), 'CHF=X', 'rate', 'FX', 'price', 'Yahoo Finance'),
 ('USD/CNY', Y % ('CNY%3DX', 1761955200), 'CNY=X', 'rate', 'FX', 'price', 'Yahoo Finance'),
 ('EM corp OAS', 'https://fred.stlouisfed.org/data/BAMLEMCBPIOAS.txt', 'BAMLEMCBPIOAS', '%', 'Credit', 'rate', 'FRED (ICE BofA)'),
 ('CCC OAS', 'https://fred.stlouisfed.org/data/BAMLH0A3HYC.txt', 'BAMLH0A3HYC', '%', 'Credit', 'rate', 'FRED (ICE BofA)'),
 ('BBB OAS', 'https://fred.stlouisfed.org/data/BAMLC0A4CBBB.txt', 'BAMLC0A4CBBB', '%', 'Credit', 'rate', 'FRED (ICE BofA)'),
]
out = []
for name, url, tic, unit, desk, kind, src in D:
    seen = {}
    for d, v in rows_for(url):
        if d < START or d > END or not wk(d) or d in seen: continue
        seen[d] = float(v)
    for d in sorted(seen):
        out.append({'date': d, 'series': name, 'value': seen[d], 'ticker': tic, 'unit': unit, 'desk': desk, 'kind': kind, 'source': src})
    print(name, len(seen), min(seen), max(seen))
json.dump(out, open(OUT + 'desk.json', 'w'))

# ---- historical event windows ----
H = {'Brent': 'BZ%3DF', 'VIX': '%5EVIX', 'S&P 500': '%5EGSPC', 'Gold': 'GC%3DF', 'UST 10Y': '%5ETNX', 'DXY': 'DX-Y.NYB'}
TIC = {'Brent': 'BZ=F', 'VIX': '^VIX', 'S&P 500': '^GSPC', 'Gold': 'GC=F', 'UST 10Y': '^TNX', 'DXY': 'DX-Y.NYB'}
W = [(1567296000, 1580515200), (1643673600, 1647302400), (1695600000, 1714521600), (1748736000, 1752105600)]
hist = []
for s, code in H.items():
    seen = {}
    for p1, p2 in W:
        u = 'https://finance.yahoo.com/quote/%s/history/?period1=%d&period2=%d' % (code, p1, p2)
        for d, v in F[u]:
            if wk(d) and d not in seen: seen[d] = float(v)
    for d in sorted(seen): hist.append({'date': d, 'series': s, 'value': seen[d], 'ticker': TIC[s]})
    print('hist', s, len(seen))
json.dump(hist, open(OUT + 'hist.json', 'w'))
