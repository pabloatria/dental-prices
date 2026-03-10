import re


def normalize_name(name: str) -> str:
    """Normalize product name for matching."""
    name = name.lower().strip()
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(r'\b(und|unid|unidad|unidades|pza|pieza|piezas|x\d+)\b', '', name)
    return name.strip()


def extract_brand(name: str) -> str | None:
    """Try to extract brand from product name."""
    known_brands = [
        "3m", "dentsply", "ivoclar", "kerr", "gc", "voco", "coltene",
        "ultradent", "maquira", "fgm", "angelus", "kulzer", "zhermack",
        "bisco", "septodont", "hu-friedy", "nsk", "woodpecker",
    ]
    name_lower = name.lower()
    for brand in known_brands:
        if brand in name_lower:
            return brand.upper()
    return None
