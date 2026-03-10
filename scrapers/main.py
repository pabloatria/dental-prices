import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Import scrapers here as they are created
# from suppliers.dentalmarket import DentalMarketScraper

SCRAPERS = [
    # Add scraper instances here:
    # DentalMarketScraper(),
]


def main():
    supabase = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    total_products = 0
    total_errors = 0

    for scraper in SCRAPERS:
        logger.info(f"Starting scraper: {scraper.supplier_name}")

        if not scraper.test():
            logger.error(f"[{scraper.supplier_name}] Selector test FAILED - skipping")
            total_errors += 1
            continue

        try:
            products = scraper.scrape()
            logger.info(f"[{scraper.supplier_name}] Scraped {len(products)} products")

            result = supabase.table("suppliers").select("id").eq("name", scraper.supplier_name).single().execute()
            if not result.data:
                logger.error(f"[{scraper.supplier_name}] Supplier not found in database")
                total_errors += 1
                continue

            supplier_id = result.data["id"]

            for product in products:
                match = supabase.table("products").select("id").ilike("name", f"%{product['name']}%").execute()
                if match.data:
                    product_id = match.data[0]["id"]
                    supabase.table("prices").insert({
                        "product_id": product_id,
                        "supplier_id": supplier_id,
                        "price": product["price"],
                        "product_url": product["url"],
                        "in_stock": product.get("in_stock", True),
                    }).execute()
                    total_products += 1
                else:
                    logger.warning(f"[{scraper.supplier_name}] Unmatched product: {product['name']}")

        except Exception as e:
            logger.error(f"[{scraper.supplier_name}] Scraper failed: {e}")
            total_errors += 1

    logger.info(f"Done. {total_products} prices updated, {total_errors} errors.")


if __name__ == "__main__":
    main()
