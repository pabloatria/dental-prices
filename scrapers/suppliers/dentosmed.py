"""
Scraper for Dentosmed (dentosmed.cl)
Platform: WooCommerce + Flatsome theme
Products: Dental supplies, instruments, equipment
Prices: CLP, publicly visible
"""
from __future__ import annotations

from typing import List, Dict
from suppliers.woo_generic import WooGenericScraper


class DentosmedScraper(WooGenericScraper):
    name = "Dentosmed"
    base_url = "https://www.dentosmed.cl"
    website_url = "https://www.dentosmed.cl"

    # Non-standard category URL pattern
    category_url_pattern = "/categoria/{category}/"

    categories = [
        "1-dental/22-cirugia-2",
        "1-dental/23-desechables-2",
        "1-dental/24-esterilizacion-2",
        "1-dental/33-periodoncia-2",
        "1-dental/25-radiologia-2",
        "1-dental/26-ortodoncia-2",
        "1-dental/21-restauracion-2",
        "1-dental/27-endodoncia-2",
        "1-dental/15-implantes-2",
        "1-dental/34-laboratorio",
        "1-dental/32-impresion-2",
        "1-dental/37-instrumental-2",
        "1-dental/28-rotatorios-2",
        "1-dental/6-accesorios-2",
        "1-dental/31-higiene-bucal-2",
        "1-dental/29-aire-y-succion-2",
        "1-dental/41-ortopedia",
    ]

    pagination_style = "path"

    # Flatsome theme uses div.product-small instead of li.product
    product_selector = "div.product-small"
    title_selectors = [
        "p.woocommerce-loop-product__title",
        "h2.woocommerce-loop-product__title",
        "h3.woocommerce-loop-product__title",
    ]
