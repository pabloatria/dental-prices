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

# ──────────────────────────────────────────────────────────────
# Import all scrapers
# ──────────────────────────────────────────────────────────────

# Existing scrapers
from suppliers.dentsolutions import DentsolutionsScraper
from suppliers.dental_macaya import DentalMacayaScraper

# WooCommerce scrapers (generic)
from suppliers.techdent import TechdentScraper
from suppliers.clandent import ClandentScraper
from suppliers.dentalamerica import DentalamericaScraper
from suppliers.afchilespa import AfchilespaScraper

# Shopify scrapers (JSON API)
from suppliers.eksadental import EksaDentalScraper
from suppliers.spdental import SpDentalScraper

# Specialty platform scrapers
from suppliers.orthomedical import OrthomedicalScraper
from suppliers.dipromed import DipromedScraper
from suppliers.biotechchile import BiotechChileScraper

# Previously Cloudflare-blocked sites (now using cloudscraper)
from suppliers.superdental_cf import SuperDentalCFScraper
from suppliers.mayordent import MayordentScraper
from suppliers.dentobal import DentobalScraper
from suppliers.siromax import SiromaxScraper

# ──────────────────────────────────────────────────────────────
# Scraper registry
# ──────────────────────────────────────────────────────────────

SCRAPERS = [
    # Working scrapers (can fetch via HTTP)
    DentsolutionsScraper(),        # Jumpseller
    DentalMacayaScraper(),         # WooCommerce
    TechdentScraper(),             # WooCommerce + Astra
    ClandentScraper(),             # WooCommerce
    DentalamericaScraper(),        # WooCommerce
    AfchilespaScraper(),           # WooCommerce
    EksaDentalScraper(),           # Shopify JSON API
    SpDentalScraper(),             # Shopify JSON API
    OrthomedicalScraper(),         # WC Store API
    DipromedScraper(),             # PrestaShop
    BiotechChileScraper(),         # Odoo 18

    # Previously blocked (now using cloudscraper)
    SuperDentalCFScraper(),         # WC Store API + cloudscraper
    MayordentScraper(),             # WC Store API + cloudscraper
    DentobalScraper(),              # Shopify JSON API + cloudscraper
    SiromaxScraper(),               # WC Store API + cloudscraper
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

    # Create new product (skip fuzzy match - too slow and unreliable)
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


# ──────────────────────────────────────────────────────────────
# Category mapping: supplier category → our category slug
# ──────────────────────────────────────────────────────────────

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

    # Dentsolutions (Jumpseller)
    "anestesia": "anestesia",
    "blanqueamiento": "blanqueamiento",
    "operatoria": "resinas",
    "prevencion": "prevencion",

    # Techdent
    "accesorios-para-clinica-dental": "equipamiento",
    "insumos-dentales/desechables-para-dentistas": "desechables",
    "insumos-dentales/insumos-instrumental-dental": "instrumental",
    "insumos-dentales/fresas-dentales": "instrumental",
    "equipamiento-dental/equipamiento-cirugia-dental": "equipamiento",
    "equipamiento-dental/compresores-y-bombas-de-succion": "equipamiento",
    "equipamiento-dental/esterilizacion-y-desinfeccion": "bioseguridad",
    "equipamiento-dental/imagen-digital": "radiologia",
    "equipamiento-dental/mobiliario-clinico-dental": "equipamiento",
    "equipamiento-dental/sillones-dentales": "equipamiento",
    "equipamiento-dental/repuestos-y-mantenimiento-de-equipos-dentales": "equipamiento",
    "laboratorio/equipos-para-laboratorio": "protesis",

    # Dipromed (PrestaShop)
    "10-instrumentos-medicos": "instrumental",
    "59-guantes": "desechables",
    "109-conos": "desechables",
    "125-rehabilitacion": "protesis",
    "151-esterilizacion": "bioseguridad",

    # Shopify product types (from eksadental, spdental)
    "repuestos": "equipamiento",
    "turbinas": "equipamiento",
    "implantologia": "protesis",
    "resinas": "resinas",
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
    total_skipped = 0

    for scraper in SCRAPERS:
        logger.info(f"=== Starting scraper: {scraper.name} ===")

        # Ensure supplier exists
        supplier_id = ensure_supplier(supabase, scraper)
        if not supplier_id:
            total_errors += 1
            continue

        # Test scraper connectivity
        if not scraper.test():
            logger.warning(f"[{scraper.name}] Connection test FAILED - skipping")
            total_skipped += 1
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
    logger.info(f"  Skipped (blocked): {total_skipped}")
    logger.info(f"  Errors: {total_errors}")


if __name__ == "__main__":
    main()
