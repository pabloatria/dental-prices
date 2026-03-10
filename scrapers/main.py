from __future__ import annotations

import os
import sys
import logging
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client

# Add the scrapers directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Import real scrapers
from suppliers.superdental import SuperDentalScraper
from suppliers.dentsolutions import DentsolutionsScraper
from suppliers.dental_macaya import DentalMacayaScraper

SCRAPERS = [
    SuperDentalScraper(),
    DentsolutionsScraper(),
    DentalMacayaScraper(),
]


def ensure_supplier(supabase, scraper) -> Optional[str]:
    """Get or create supplier in database. Returns supplier_id."""
    result = supabase.table("suppliers").select("id").eq("name", scraper.name).execute()
    if result.data:
        return result.data[0]["id"]

    # Create supplier
    result = supabase.table("suppliers").insert({
        "name": scraper.name,
        "website_url": scraper.website_url,
        "active": True,
    }).execute()

    if result.data:
        logger.info(f"Created supplier: {scraper.name}")
        return result.data[0]["id"]

    logger.error(f"Failed to create supplier: {scraper.name}")
    return None


def ensure_product(supabase, name: str, category_slug: str = None) -> Optional[str]:
    """Get or create product in database. Returns product_id."""
    # Try exact match first
    result = supabase.table("products").select("id").eq("name", name).execute()
    if result.data:
        return result.data[0]["id"]

    # Try fuzzy match
    result = supabase.table("products").select("id").ilike("name", f"%{name}%").execute()
    if result.data:
        return result.data[0]["id"]

    # Create new product
    product_data = {"name": name}

    # Try to link to a category
    if category_slug:
        cat_result = supabase.table("categories").select("id").eq("slug", category_slug).execute()
        if cat_result.data:
            product_data["category_id"] = cat_result.data[0]["id"]

    result = supabase.table("products").insert(product_data).execute()
    if result.data:
        return result.data[0]["id"]

    return None


# Map supplier category slugs to our category slugs
CATEGORY_MAP = {
    # SuperDental
    "adhesion-y-restauracion": "resinas",
    "anestesicos-y-agujas": "anestesia",
    "barnices-y-fluor": "prevencion",
    "blanqueamiento-y-barreras": "blanqueamiento",
    "desechables": "desechables",
    "desinfeccion-y-bioseguridad": "bioseguridad",
    "endodoncia": "endodoncia",
    "equipamiento": "equipamiento",
    "fresas": "instrumental",
    "higiene-oral": "prevencion",
    "impresion-y-rehabilitacion": "protesis",
    "instrumental": "instrumental",
    "laboratorio": "protesis",
    "ortodoncia": "ortodoncia",
    "periodoncia-y-cirugia": "periodoncia",
    "protesis-y-carillas": "protesis",
    "radiologia": "radiologia",
    # Dentsolutions
    "anestesia": "anestesia",
    "blanqueamiento": "blanqueamiento",
    "operatoria": "resinas",
    "prevencion": "prevencion",
}


def main():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        logger.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    supabase = create_client(url, key)

    total_prices = 0
    total_products_created = 0
    total_errors = 0

    for scraper in SCRAPERS:
        logger.info(f"=== Starting scraper: {scraper.name} ===")

        # Ensure supplier exists
        supplier_id = ensure_supplier(supabase, scraper)
        if not supplier_id:
            total_errors += 1
            continue

        # Test scraper connectivity
        if not scraper.test():
            logger.error(f"[{scraper.name}] Connection test FAILED - skipping")
            total_errors += 1
            continue

        try:
            products = scraper.scrape()
            logger.info(f"[{scraper.name}] Scraped {len(products)} products")

            for product in products:
                # Map the supplier's category to our category
                supplier_category = product.get("_category", "")
                our_category = CATEGORY_MAP.get(supplier_category)

                # Get or create product
                product_id = ensure_product(supabase, product["name"], our_category)
                if not product_id:
                    logger.warning(f"[{scraper.name}] Could not create product: {product['name']}")
                    continue

                # Insert price record
                try:
                    supabase.table("prices").insert({
                        "product_id": product_id,
                        "supplier_id": supplier_id,
                        "price": product["price"],
                        "product_url": product.get("product_url", ""),
                        "in_stock": product.get("in_stock", True),
                    }).execute()
                    total_prices += 1
                except Exception as e:
                    logger.warning(f"[{scraper.name}] Price insert failed: {e}")

        except Exception as e:
            logger.error(f"[{scraper.name}] Scraper failed: {e}")
            total_errors += 1

    logger.info(f"=== DONE ===")
    logger.info(f"  Prices inserted: {total_prices}")
    logger.info(f"  Errors: {total_errors}")


if __name__ == "__main__":
    main()
