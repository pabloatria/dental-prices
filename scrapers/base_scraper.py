from __future__ import annotations

import os
import requests
import time
import random
import logging
from typing import Optional, List, Dict
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]


def _get_proxy() -> Optional[dict]:
    """Get proxy config from SCRAPER_PROXY env var if set.
    Supports HTTP/HTTPS/SOCKS5 proxies.
    Example: socks5://user:pass@host:port or http://host:port
    """
    proxy_url = os.environ.get("SCRAPER_PROXY")
    if not proxy_url:
        return None
    return {"http": proxy_url, "https": proxy_url}


class BaseScraper:
    """Base class for all supplier scrapers."""

    name = "Base"
    base_url = ""
    website_url = ""
    use_cloudscraper = False  # Set True for Cloudflare-protected sites

    def __init__(self):
        proxy = _get_proxy()

        if self.use_cloudscraper:
            import cloudscraper
            self.session = cloudscraper.create_scraper()
        else:
            self.session = requests.Session()

        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.5",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })

        if proxy:
            self.session.proxies = proxy
            logger.info(f"[{self.name}] Using proxy")

    def fetch(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a page and return parsed HTML."""
        try:
            time.sleep(random.uniform(1.5, 4.0))
            # Rotate user agent per request
            self.session.headers["User-Agent"] = random.choice(USER_AGENTS)
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except Exception as e:
            logger.error(f"[{self.name}] Error fetching {url}: {e}")
            return None

    def scrape(self) -> List[Dict]:
        """Override in subclass. Returns list of product dicts."""
        raise NotImplementedError

    def test(self) -> bool:
        """Override in subclass. Returns True if scraper selectors still work."""
        raise NotImplementedError
