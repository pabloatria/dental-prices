"""
Scraper for Schudent (schudent.cl)
Platform: WooCommerce — HTML scraping (Store API has $1 placeholders)
Products: SprintRay 3D printers, CAD/CAM blocks, resins, instruments
Prices: CLP (IVA included), publicly visible on product pages
Notable: Official SprintRay distributor in Chile, Aidite CAD blocks
"""
from __future__ import annotations

from suppliers.woo_generic import WooGenericScraper


class SchudentScraper(WooGenericScraper):
    name = "Schudent"
    base_url = "https://schudent.cl"
    website_url = "https://schudent.cl"

    # Use paginated shop page — categories use nested slugs which are complex
    categories = ["tienda"]
    category_url_pattern = "/{category}/"

    # Standard WooCommerce selectors work
    product_selector = "li.product"
    link_selector = "a"
    title_selector = "h2.woocommerce-loop-product__title"

    def __init__(self):
        super().__init__()
        # Override Accept-Encoding: schudent.cl returns raw brotli
        # that BeautifulSoup can't decode
        self.session.headers["Accept-Encoding"] = "gzip, deflate"
