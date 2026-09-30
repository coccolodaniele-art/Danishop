"""Esporta dal programma desktop (sp500_vertical_thermometer.py) tutto cio' che la
versione web deve usare identico: costanti, elenchi, profili di settore e i testi
esatti dei prompt per Gemini. Scrive dati_programma.json in questa cartella.

Uso:  python esporta_dati.py ["percorso\\sp500_vertical_thermometer.py"]

I prompt sono f-string costruite a runtime: per esportarli senza riscriverli a mano
si chiamano le funzioni originali con valori segnaposto (@@...@@) che la pagina web
poi sostituisce con i valori veri, formattati con le stesse regole (fmt_number).
"""
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SRC = r"C:\Users\PC\Desktop\fondamentali specifici\SP500VerticalThermometer\sp500_vertical_thermometer.py"

src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
spec = importlib.util.spec_from_file_location("termometri_desktop", src)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

# Numeri segnaposto: fmt_number li trasforma in testo riconoscibile e univoco.
PH = {"PRICE": 111111.11, "SMA": 222222.22, "LOW": 333333.33, "HIGH": 444444.44, "POC": 555555.55}


def explanation_template(with_edgar: bool) -> str:
    metric = m.Metrics(symbol="@@SYMBOL@@", label="@@LABEL@@", price=PH["PRICE"], sma200=PH["SMA"],
                       low200=PH["LOW"], high200=PH["HIGH"], poc200=PH["POC"])
    text = m.build_explanation_prompt(metric, "@@EDGAR@@" if with_edgar else None)
    for key, value in PH.items():
        formatted = m.fmt_number(value)
        assert text.count(formatted) == 1, (key, formatted)
        text = text.replace(formatted, f"@@{key}@@")
    return text


def specs(items):
    return [[s.symbol, s.label, s.edgar_symbol, s.kind] for s in items]


search_plain = m.build_search_prompt("@@QUERY@@")
search_ctx = m.build_search_prompt("@@QUERY@@", ["@@CTX@@"])
assert "- @@CTX@@" in search_ctx

data = {
    "source_file": os.path.basename(src),
    "APP_TITLE": m.APP_TITLE,
    "USER_AGENT": m.USER_AGENT,
    "PRICE_FILTER_NO_BOUND": m.PRICE_FILTER_NO_BOUND,
    "PRICE_FILTER_OPTIONS": m.PRICE_FILTER_OPTIONS,
    "VOTE_FILTER_CHOICES": m.VOTE_FILTER_CHOICES,
    "SMA_DISTANCE_THRESHOLD": m.SMA_DISTANCE_THRESHOLD,
    "SMA_THRESHOLD_OPTIONS": m.SMA_THRESHOLD_OPTIONS,
    "EDGAR_SPY_URL": m.EDGAR_SPY_URL,
    "EDGAR_TICKERS_URL": m.EDGAR_TICKERS_URL,
    "EDGAR_TICKERS_EXCHANGE_URL": m.EDGAR_TICKERS_EXCHANGE_URL,
    "EDGAR_COMPANYFACTS_URL": m.EDGAR_COMPANYFACTS_URL,
    "SP500_WIKI_URL": m.SP500_WIKI_URL,
    "CONSTITUENTS_CACHE_MAX_AGE_DAYS": m.CONSTITUENTS_CACHE_MAX_AGE_DAYS,
    "GEMINI_MODEL": m.GEMINI_MODEL,
    "GEMINI_API_URL": m.GEMINI_API_URL,
    "GEMINI_API_KEY_INFO_URL": m.GEMINI_API_KEY_INFO_URL,
    "GEMINI_SEARCH_MODELS": m.GEMINI_SEARCH_MODELS,
    "GEMINI_SEARCH_MAX": m.GEMINI_SEARCH_MAX,
    "SEARCH_MAX_RESULTS": m.SEARCH_MAX_RESULTS,
    "YAHOO_SEARCH_URL": m.YAHOO_SEARCH_URL,
    "YAHOO_SEARCH_MAX": m.YAHOO_SEARCH_MAX,
    "NASDAQ_HISTORY_URL": m.NASDAQ_HISTORY_URL,
    "NASDAQ_INDEX_SYMBOLS": m._NASDAQ_INDEX_SYMBOLS,
    "MAIN_ASSET": specs([m.MAIN_ASSET])[0],
    "COMMODITY_SECTOR": [m.COMMODITY_SECTOR[0], specs(m.COMMODITY_SECTOR[1])],
    "FALLBACK_SECTORS": [[name, specs(items)] for name, items in m.FALLBACK_SECTORS],
    "GICS_TO_ITALIAN": list(m._GICS_TO_ITALIAN.items()),
    "EDGAR_FUNDAMENTAL_TAGS": m._EDGAR_FUNDAMENTAL_TAGS,
    "DEFAULT_SECTOR_PROFILE": m._DEFAULT_SECTOR_PROFILE,
    "SECTOR_PROFILES": m.SECTOR_PROFILES,
    "YAHOO_QUOTE_TYPES": m._YAHOO_QUOTE_TYPES,
    "YAHOO_SECTOR_TO_ITALIAN": m._YAHOO_SECTOR_TO_ITALIAN,
    "QUERY_STOPWORDS": sorted(m._QUERY_STOPWORDS),
    "NAME_GENERIC_WORDS": sorted(m._NAME_GENERIC_WORDS),
    "PROMPT_EXPLANATION": explanation_template(False),
    "PROMPT_EXPLANATION_EDGAR": explanation_template(True),
    "PROMPT_SEARCH": search_plain,
    "PROMPT_SEARCH_CTX": search_ctx,
}

out = os.path.join(HERE, "dati_programma.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("Dati esportati:", out)
