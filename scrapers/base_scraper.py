from __future__ import annotations

import os
import json as _json
import requests
import time
import random
import logging
from typing import Optional, List, Dict
from bs4 import BeautifulSoup
from urllib.parse import urlencode, urlparse

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


class _PlaywrightResponse:
    """Minimal requests.Response-compatible wrapper around Playwright's APIResponse."""

    def __init__(self, status_code: int, body_text: str, url: str):
        self.status_code = status_code
        self.text = body_text
        self.content = body_text.encode("utf-8", errors="replace")
        self.url = url

    def json(self):
        return _json.loads(self.text)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(
                f"{self.status_code} Client Error for url: {self.url}"
            )


class PlaywrightStealthSession:
    """requests.Session drop-in backed by Playwright+stealth for anti-bot sites.

    - Launches a single headless Chromium with stealth patches applied
    - First request to a host warms the browser context (triggers CF challenge,
      collects cf_clearance cookies) before hitting the target URL
    - Subsequent requests reuse the context so API/JSON calls inherit cookies
    """

    _warmed_hosts: set

    def __init__(self, name: str = "PW"):
        from playwright.sync_api import sync_playwright
        self._stealth = None
        self._stealth_sync = None
        try:
            from playwright_stealth import Stealth
            self._stealth = Stealth()
        except ImportError:
            pass
        try:
            from playwright_stealth import stealth_sync
            self._stealth_sync = stealth_sync
        except ImportError:
            pass

        self._name = name
        self._warmed_hosts = set()
        self.headers: Dict[str, str] = {}
        self.proxies = None

        self._pw = sync_playwright().start()
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
        ]
        self._browser = self._pw.chromium.launch(headless=True, args=launch_args)
        self._context = self._browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            locale="es-CL",
            timezone_id="America/Santiago",
            viewport={"width": 1920, "height": 1080},
            extra_http_headers={
                "Accept-Language": "es-CL,es;q=0.9,en;q=0.5",
            },
        )
        # Apply stealth patches (varies by library version)
        if self._stealth is not None:
            try:
                self._stealth.apply_stealth_sync(self._context)
            except AttributeError:
                pass

        self._page = self._context.new_page()
        if self._stealth is None and self._stealth_sync is not None:
            try:
                self._stealth_sync(self._page)
            except Exception as e:
                logger.warning(f"[{self._name}] stealth_sync failed: {e}")

    def _warm_host(self, url: str):
        host = urlparse(url).netloc
        if not host or host in self._warmed_hosts:
            return
        try:
            self._page.goto(f"https://{host}/", wait_until="domcontentloaded", timeout=45000)
            # Small wait so CF JS finishes and drops cookies
            self._page.wait_for_timeout(2500)
            self._warmed_hosts.add(host)
            logger.info(f"[{self._name}] Warmed host {host}")
        except Exception as e:
            logger.warning(f"[{self._name}] Warm-up failed for {host}: {e}")

    def get(self, url: str, params: Optional[dict] = None, timeout: int = 30, **kwargs):
        if params:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}{urlencode(params)}"

        self._warm_host(url)

        # Decide between API request (JSON/XHR path) and full navigation.
        is_api = ("/wp-json/" in url) or url.endswith(".json") or "/api/" in url
        try:
            if is_api:
                # Run the request FROM the already-authenticated page context via
                # window.fetch — Cloudflare treats this as a legitimate XHR from
                # the origin and inherits cf_clearance cookies. context.request.get()
                # bypasses the page and often gets 403'd on CF-protected APIs.
                result = self._page.evaluate(
                    """async (u) => {
                        try {
                            const r = await fetch(u, {
                                credentials: 'include',
                                headers: { 'Accept': 'application/json, text/plain, */*' },
                            });
                            const text = await r.text();
                            return { status: r.status, body: text };
                        } catch (e) {
                            return { status: 599, body: String(e) };
                        }
                    }""",
                    url,
                )
                return _PlaywrightResponse(
                    int(result.get("status", 599)),
                    result.get("body", ""),
                    url,
                )
            else:
                response = self._page.goto(url, wait_until="domcontentloaded", timeout=timeout * 1000)
                # Some sites serve CF challenge first; a short extra wait lets the
                # real content render before we grab HTML.
                try:
                    self._page.wait_for_timeout(1500)
                except Exception:
                    pass
                status = response.status if response else 200
                body = self._page.content()
                return _PlaywrightResponse(status, body, url)
        except Exception as e:
            logger.error(f"[{self._name}] Playwright GET failed for {url}: {e}")
            return _PlaywrightResponse(599, "", url)

    def close(self):
        try:
            self._context.close()
        except Exception:
            pass
        try:
            self._browser.close()
        except Exception:
            pass
        try:
            self._pw.stop()
        except Exception:
            pass


class BaseScraper:
    """Base class for all supplier scrapers."""

    name = "Base"
    base_url = ""
    website_url = ""
    use_cloudscraper = False  # Set True for Cloudflare-protected sites
    use_playwright_stealth = False  # Set True to route all requests through Playwright+stealth

    def __init__(self):
        proxy = _get_proxy()

        if self.use_playwright_stealth:
            self.session = PlaywrightStealthSession(name=self.name)
        elif self.use_cloudscraper:
            import cloudscraper
            self.session = cloudscraper.create_scraper()
        else:
            self.session = requests.Session()

        # requests/cloudscraper sessions support .headers.update; PW session has a stub
        if hasattr(self.session, "headers") and hasattr(self.session.headers, "update"):
            self.session.headers.update({
                "User-Agent": random.choice(USER_AGENTS),
                "Accept-Language": "es-CL,es;q=0.9,en;q=0.5",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            })

        if proxy and not self.use_playwright_stealth:
            self.session.proxies = proxy
            logger.info(f"[{self.name}] Using proxy")

    def fetch(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a page and return parsed HTML."""
        try:
            time.sleep(random.uniform(1.5, 4.0))
            # Rotate user agent per request (requests/cloudscraper only — PW context is fixed)
            if not self.use_playwright_stealth and hasattr(self.session, "headers"):
                self.session.headers["User-Agent"] = random.choice(USER_AGENTS)
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except Exception as e:
            logger.error(f"[{self.name}] Error fetching {url}: {e}")
            return None

    def close(self):
        """Clean up resources (Playwright browser, etc.)."""
        if isinstance(self.session, PlaywrightStealthSession):
            self.session.close()

    def scrape(self) -> List[Dict]:
        """Override in subclass. Returns list of product dicts."""
        raise NotImplementedError

    def test(self) -> bool:
        """Override in subclass. Returns True if scraper selectors still work."""
        raise NotImplementedError
