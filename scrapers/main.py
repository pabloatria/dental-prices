from __future__ import annotations

import os
import sys
import logging
from collections import defaultdict
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client

# Add the scrapers directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from matchers import tokenize, are_same_product

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

# Additional WC Store API scrapers
from suppliers.gipfel import GipfelScraper

# Aesthetic suppliers (Shopify)
from suppliers.bamssupplies import BamsSuppliesScraper
from suppliers.dispolab import DispolabScraper
from suppliers.naturabel import NaturabelScraper

# Aesthetic suppliers (WooCommerce)
from suppliers.flamamed import FlamamedScraper

# Catalog-only suppliers (no prices, contact for pricing)
from suppliers.torregal import TorregalScraper

# Additional dental suppliers
from suppliers.tresdental import TresDentalScraper
from suppliers.orbisdental import OrbisDentalScraper

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

    # Additional suppliers
    GipfelScraper(),                # WC Store API
    BamsSuppliesScraper(),          # Shopify JSON API (aesthetic supplies)
    DispolabScraper(),              # Shopify JSON API (aesthetic supplies)
    NaturabelScraper(),             # Shopify JSON API (aesthetic supplies)
    FlamamedScraper(),              # WC Store API (aesthetic supplies)

    # Catalog-only (no prices)
    TorregalScraper(),               # WP REST API (aesthetic equipment, catalog-only)

    # Additional dental suppliers
    TresDentalScraper(),             # WC Store API (3D printers, resins, scanners)
    OrbisDentalScraper(),            # Shopify JSON API (orthodontics, mini-implants)
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


class ProductCache:
    """In-memory product cache with inverted token index for fast fuzzy lookup.

    Preloads all products at startup so ensure_product() can do in-memory
    fuzzy matching instead of hitting the database for every candidate.
    """

    def __init__(self):
        self.products: list[dict] = []       # [{id, name, image_url, brand}]
        self.name_to_idx: dict[str, int] = {}  # exact name → index
        self.token_index: dict[str, set[int]] = defaultdict(set)

    def load(self, supabase):
        """Load all products from the database into memory."""
        all_products = []
        page_size = 1000
        offset = 0

        while True:
            result = supabase.table("products") \
                .select("id, name, image_url, brand") \
                .range(offset, offset + page_size - 1) \
                .execute()

            if not result.data:
                break
            all_products.extend(result.data)
            if len(result.data) < page_size:
                break
            offset += page_size

        self.products = all_products
        self._rebuild_indexes()
        logger.info(f"ProductCache loaded {len(self.products)} products")

    def _rebuild_indexes(self):
        """Rebuild exact-name and token indexes from self.products."""
        self.name_to_idx.clear()
        self.token_index.clear()
        for i, p in enumerate(self.products):
            self.name_to_idx[p["name"]] = i
            for token in tokenize(p["name"]):
                self.token_index[token].add(i)

    def exact_match(self, name: str) -> Optional[dict]:
        """Find product by exact name. Returns product dict or None."""
        idx = self.name_to_idx.get(name)
        if idx is not None:
            return self.products[idx]
        return None

    def fuzzy_match(self, name: str) -> Optional[dict]:
        """Find a product that fuzzy-matches this name.

        Uses the inverted token index to find candidates quickly,
        then checks with are_same_product() for confirmation.
        Only candidates sharing at least 2 tokens are checked.
        """
        tokens = tokenize(name)
        if not tokens:
            return None

        # Count how many tokens each candidate shares
        candidate_counts: dict[int, int] = defaultdict(int)
        for token in tokens:
            for idx in self.token_index.get(token, set()):
                candidate_counts[idx] += 1

        # Check candidates with at least 2 shared tokens, best first
        for idx, shared in sorted(candidate_counts.items(),
                                   key=lambda x: x[1], reverse=True):
            if shared < 2:
                break
            if are_same_product(name, self.products[idx]["name"]):
                return self.products[idx]

        return None

    def add(self, product: dict):
        """Add a newly created product to the cache."""
        idx = len(self.products)
        self.products.append(product)
        self.name_to_idx[product["name"]] = idx
        for token in tokenize(product["name"]):
            self.token_index[token].add(idx)


# Global product cache (initialized in main)
_product_cache: Optional[ProductCache] = None


def ensure_product(supabase, name: str, category_slug: str = None,
                    image_url: str = None, brand: str = None) -> Optional[str]:
    """Get or create product in database. Returns product_id.

    Uses a three-tier lookup:
    1. Exact name match (in-memory cache)
    2. Fuzzy name match via are_same_product() (in-memory cache)
    3. Create new product (database INSERT + cache update)

    Updates image_url and brand if provided and currently missing.
    """
    global _product_cache

    # --- Tier 1: Exact match (in-memory) ---
    cached = _product_cache.exact_match(name) if _product_cache else None
    if cached:
        product_id = cached["id"]
        updates = {}
        if image_url and not cached.get("image_url"):
            updates["image_url"] = image_url
        if brand and not cached.get("brand"):
            updates["brand"] = brand
        if updates:
            try:
                supabase.table("products").update(updates).eq("id", product_id).execute()
                cached.update(updates)  # keep cache in sync
            except Exception as e:
                logger.warning(f"Failed to update product metadata: {e}")
        return product_id

    # --- Tier 2: Fuzzy match (in-memory) ---
    if _product_cache:
        fuzzy = _product_cache.fuzzy_match(name)
        if fuzzy:
            logger.debug(f"Fuzzy match: '{name}' → '{fuzzy['name']}'")
            product_id = fuzzy["id"]
            updates = {}
            if image_url and not fuzzy.get("image_url"):
                updates["image_url"] = image_url
            if brand and not fuzzy.get("brand"):
                updates["brand"] = brand
            if updates:
                try:
                    supabase.table("products").update(updates).eq("id", product_id).execute()
                    fuzzy.update(updates)
                except Exception as e:
                    logger.warning(f"Failed to update product metadata: {e}")
            return product_id

    # --- Tier 3: Create new product ---
    product_data = {"name": name}

    if image_url:
        product_data["image_url"] = image_url
    if brand:
        product_data["brand"] = brand

    # Try to link to a category
    if category_slug:
        cat_result = supabase.table("categories").select("id").eq("slug", category_slug).execute()
        if cat_result.data:
            product_data["category_id"] = cat_result.data[0]["id"]

    result = supabase.table("products").insert(product_data).execute()
    if result.data:
        new_product = result.data[0]
        # Add to cache so subsequent items in this run can match it
        if _product_cache:
            _product_cache.add({
                "id": new_product["id"],
                "name": name,
                "image_url": image_url,
                "brand": brand,
            })
        return new_product["id"]

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

    # Gipfel (WC Store API)
    "cirugia": "periodoncia",
    "dental": None,  # too generic, skip
    "todos": None,   # too generic, skip

    # BAMS Supplies (Shopify - aesthetic supplies)
    "ácido hialurónico": "estetica",
    "bioestimulador": "estetica",
    "regeneradores celulares": "estetica",
    "hilos de bioestimulación": "estetica",
    "hilos de tracción": "estetica",
    "hilos de relleno": "estetica",
    "toxina botulínica": "estetica",
    "mesoterapia y peeling": "estetica",
    "lipolíticos": "estetica",
    "cánulas": "estetica",
    "micro agujas": "estetica",
    "otros": None,  # too generic, skip

    # Dispolab (Shopify - aesthetic supplies)
    "inyectable": "estetica",
    "hilo estimulante": "estetica",
    "dispositivo medico": "estetica",
    "serum": None,          # skincare, not dental
    "crema": None,          # skincare
    "crema antiedad": None, # skincare
    "shampoo": None,        # haircare
    "shampoo acondicionador": None,
    "solucion micelar": None,
    "antitranspirante": None,
    "lamina silicona": None,  # scar treatment
    "gel silicona": None,
    "barra silicona": None,

    # Naturabel (Shopify - aesthetic supplies)
    "meline": "estetica",

    # Flamamed (WC Store API - aesthetic supplies)
    "acido-hialuronico": "estetica",
    "profhilo": "estetica",
    "exosomas": "estetica",
    "hilos-mesotrax": "estetica",
    "bcn-cocktails": "estetica",
    "bcn-peels": "estetica",
    "bcn-classics": "estetica",
    "bcn-advance": "estetica",
    "bcn-prebiotics": "estetica",
    "cebelia": "estetica",
    "agujas-mesoterapia": "estetica",
    "agujas": "estetica",
    "agujas-hipodermicas": "estetica",
    "canulas": "estetica",
    "canulas-agujas-y-canulas": "estetica",
    "insumos": None,  # too generic

    # Torregal (WP REST API - aesthetic equipment, catalog-only)
    "estetica-equipos": "estetica",

    # 3Dental (WC Store API - 3D printers, resins, scanners)
    "impresoras-3d-odontologicas": "equipamiento",
    "impresoras-3d": "equipamiento",
    "resinas-dentales": "resinas",
    "termoformadoras": "equipamiento",
    "termoformadoras-laminas": "equipamiento",
    "scanners": "equipamiento",
    "scanners-intraoral": "equipamiento",
    "scanners-de-mesa": "equipamiento",
    "pre-y-pos-proceso": "equipamiento",
    "insumos-de-laboratorio": "protesis",
    "filamento-para-impresion-3d": "equipamiento",
    "higiene-protesica": "prevencion",
    "ofertas": None,         # generic, skip
    "ofertas-cyber": None,   # generic, skip
    "sin-categorizar": None, # uncategorized, skip
    "scheu": "equipamiento",
    "asiga": "equipamiento",

    # Orbis Dental (Shopify - orthodontics, mini-implants)
    "productos ortodoncia": "ortodoncia",
    "kits": "ortodoncia",
    "disyuntores": "ortodoncia",
    "mini implantes marpe": "ortodoncia",
    "mini implantes extra alveolares": "ortodoncia",
    "mini implantes interradiculares": "ortodoncia",
}


def check_and_record_restock(supabase, product_id, supplier_id, new_in_stock):
    """If product went from out-of-stock to in-stock, record a restock event."""
    if not new_in_stock:
        return  # Only care about items coming back in stock

    # Get the most recent previous price for this product+supplier
    result = supabase.table("prices") \
        .select("in_stock") \
        .eq("product_id", product_id) \
        .eq("supplier_id", supplier_id) \
        .order("scraped_at", desc=True) \
        .limit(1) \
        .execute()

    if not result.data:
        return  # First time seeing this product at this supplier — not a restock

    prev_in_stock = result.data[0]["in_stock"]
    if prev_in_stock:
        return  # Was already in stock — no change

    # Restock detected! Record the event
    logger.info(f"RESTOCK DETECTED: product={product_id} supplier={supplier_id}")
    try:
        supabase.table("restock_events").insert({
            "product_id": product_id,
            "supplier_id": supplier_id,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to record restock event: {e}")


def main():
    global _product_cache

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        logger.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    supabase = create_client(url, key)

    # Preload product cache for fuzzy matching
    _product_cache = ProductCache()
    _product_cache.load(supabase)

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

                # Get or create product (with image and brand if available)
                product_id = ensure_product(
                    supabase,
                    product["name"],
                    our_category,
                    image_url=product.get("image_url"),
                    brand=product.get("brand"),
                )
                if not product_id:
                    logger.warning(f"[{scraper.name}] Could not create product: {product['name']}")
                    continue

                # Check for restock event before inserting new price
                check_and_record_restock(
                    supabase, product_id, supplier_id,
                    product.get("in_stock", True),
                )

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
