"""Repo-relative paths shared by every pipeline step."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw')
YAHOO = os.path.join(RAW, 'yahoo')            # core market captures (Yahoo Finance history text, FRED HY OAS)
CAPTURES = os.path.join(RAW, 'captures.json')          # source URL -> [[date, value], ...]
CAPTURES_RAW = os.path.join(RAW, 'captures_raw.json')  # source URL -> raw text (multi-column sources)
OUT = os.path.join(ROOT, 'site', 'data') + os.sep     # datasets the page loads
SITE = os.path.join(ROOT, 'site')
TEMPLATES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
os.makedirs(OUT, exist_ok=True)
