"""Currency exchange rate helper using AwesomeAPI."""

import time
from datetime import datetime, timezone

import httpx

# In-memory cache
_cache: dict = {
    "rate": None,
    "source": None,
    "updated_at": None,
    "fetched_at": 0.0,
}

CACHE_TTL_SECONDS = 3600  # 1 hour
FALLBACK_RATE = 5.70
AWESOME_API_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL"


def get_usd_brl_rate() -> dict:
    """Fetch current USD/BRL exchange rate with 1-hour cache.

    Returns a dict with:
      - rate (float): the exchange rate
      - source (str): "AwesomeAPI" or "fallback"
      - updated_at (str): ISO timestamp of the rate
    """
    now = time.time()

    # Return cached value if still fresh
    if _cache["rate"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return {
            "rate": _cache["rate"],
            "source": _cache["source"],
            "updated_at": _cache["updated_at"],
        }

    # Try fetching from AwesomeAPI
    try:
        resp = httpx.get(AWESOME_API_URL, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()
        usd_brl = data.get("USDBRL", {})
        rate = float(usd_brl.get("bid", FALLBACK_RATE))
        source = "AwesomeAPI"
        updated_at = datetime.now(timezone.utc).isoformat()

        _cache["rate"] = rate
        _cache["source"] = source
        _cache["updated_at"] = updated_at
        _cache["fetched_at"] = now

        return {"rate": rate, "source": source, "updated_at": updated_at}
    except Exception:
        # Use fallback
        if _cache["rate"] is not None:
            # Return stale cache rather than fallback
            return {
                "rate": _cache["rate"],
                "source": _cache["source"],
                "updated_at": _cache["updated_at"],
            }

        return {
            "rate": FALLBACK_RATE,
            "source": "fallback",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
