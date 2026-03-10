"""
Scraper for Dentsolutions (dentsolutions.cl)
Platform: Jumpseller
Products: Endodontics, orthodontics, composites, instruments, etc.
Prices: CLP, publicly visible
Location: Temuco, Chile
"""

import re
from base_scraper import BaseScraper


class DentsolutionsScraper(BaseScraper):
    name = "Dentsolutions"
    base_url = "https://dentsolutions.cl"
    website_url = "https://dentsolutions.cl"

    # Jumpseller category slugs
    categories = [
        "anestesia",
        "blanqueamiento",
        "desechables",
        "endodoncia",
        "instrumental",
        "ortodoncia",
        "prevencion",
        "operatoria",
    ]

    def scrape(self) -> list[dict]:
        """Scrape all products from Dentsolutions."""
        all_products = []

        for category in self.categories:
            page = 1
            while True:
                url = f"{self.base_url}/{category}"
                if page > 1:
                    url = f"{self.base_url}/{category}?page={page}"

                soup = self.fetch(url)
                if not soup:
                    break

                # Jumpseller product grid items
                products = soup.select(
                    ".product-block, .product-item, "
                    "[class*='product-card'], .product"
                )

                if not products:
                    break

                found_on_page = 0
                for product_el in products:
                    try:
                        item = self._parse_product(product_el, category)
                        if item:
                            all_products.append(item)
                            found_on_page += 1
                    except Exception as e:
                        print(f"  Error parsing product: {e}")
                        continue

                if found_on_page == 0:
                    break

                # Check for next page link
                next_link = soup.select_one(
                    "a.next, a[rel='next'], .pagination .next, "
                    "[class*='pagination'] a:last-child"
                )
                if not next_link or not next_link.get("href"):
                    break

                page += 1

            print(f"  [{category}] Found {len([p for p in all_products if p.get('_category') == category])} products")

        return all_products

    def _parse_product(self, el, category: str) -> dict | None:
        """Parse a single product element from Jumpseller."""
        # Product name
        name_el = (
            el.select_one("h3 a, h2 a, .product-name a, .product-title a")
            or el.select_one("[class*='name'] a, [class*='title'] a")
            or el.select_one("a[class*='product']")
        )
        if not name_el:
            # Try just a text heading
            name_el = el.select_one("h3, h2, .product-name, .product-title")
        if not name_el:
            return None

        name = name_el.get_text(strip=True)
        if not name:
            return None

        # Product URL
        link = name_el.get("href") or ""
        if link and not link.startswith("http"):
            link = f"{self.base_url}{link}"

        # Find a better link if the name element isn't a link
        if not link:
            link_el = el.select_one("a[href]")
            if link_el:
                link = link_el["href"]
                if not link.startswith("http"):
                    link = f"{self.base_url}{link}"

        # Price
        price = 0
        # Look for sale/current price first
        sale_price_el = el.select_one(
            ".product-price-sale, .sale-price, "
            "[class*='price-sale'], [class*='current-price']"
        )
        if sale_price_el:
            price = self._parse_clp(sale_price_el.get_text())
        else:
            price_el = el.select_one(
                ".product-price, .price, "
                "[class*='price']:not([class*='compare']):not([class*='original'])"
            )
            if price_el:
                price = self._parse_clp(price_el.get_text())

        if price <= 0:
            return None

        # Stock
        in_stock = True
        sold_out = el.select_one(
            ".sold-out, .out-of-stock, [class*='soldout'], "
            "[class*='agotado']"
        )
        if sold_out:
            in_stock = False

        return {
            "name": name,
            "price": price,
            "product_url": link,
            "in_stock": in_stock,
            "_category": category,
        }

    def _parse_clp(self, text: str) -> int:
        """Parse CLP price string to integer."""
        if not text:
            return 0
        cleaned = re.sub(r'[^\d]', '', text)
        try:
            return int(cleaned)
        except ValueError:
            return 0

    def test(self) -> bool:
        """Test the scraper can find products."""
        soup = self.fetch(f"{self.base_url}/endodoncia")
        if not soup:
            print("ERROR: Could not fetch Dentsolutions")
            return False

        products = soup.select(
            ".product-block, .product-item, "
            "[class*='product-card'], .product"
        )
        print(f"OK: Found {len(products)} product elements on endodoncia page")
        return len(products) > 0
