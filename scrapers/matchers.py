"""
Product name normalization and similarity matching utilities.
Used by deduplicate.py and main.py for product deduplication.
"""
from __future__ import annotations

import re
import html
import unicodedata


def _strip_accents(text: str) -> str:
    """Remove accent marks: flúor -> fluor, etc."""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def normalize_name(name: str) -> str:
    """Normalize product name for deduplication matching."""
    name = html.unescape(name)
    name = name.lower().strip()
    # Remove TM/registered symbols
    name = re.sub(r'[™®©]', '', name)
    # Remove leftover HTML entities
    name = re.sub(r'&#\d+;', ' ', name)
    # Remove HTML <br> tags
    name = re.sub(r'<br\s*/?>', ' ', name)
    # Strip accents (flúor -> fluor)
    name = _strip_accents(name)
    # Join decimal numbers before removing punctuation: "2.1" → "21"
    name = re.sub(r'(\d+)\.(\d+)', r'\1\2', name)
    # Remove all punctuation except alphanumeric and spaces
    name = re.sub(r'[^a-z0-9\s]', ' ', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name)
    # Remove number+unit patterns: "10gr" → "10", "25mm" → "25", "100ml" → "100"
    # Unit must be directly adjacent (no space) to preserve standalone L, R, G, etc.
    name = re.sub(r'\b(\d+)(gr|grs|g|ml|mm|cc|oz|kg|mg|cm|lt|l)\b', r'\1', name)
    # Remove quantity-only suffixes (keep concentration/size numbers)
    name = re.sub(
        r'\b(und|unid|unidad|unidades|unidosis|pza|pieza|piezas|uds|ud|dosis|'
        r'unit|dose|doses|units)\b',
        '', name
    )
    # Normalize "x 100" / "x100" quantity patterns
    name = re.sub(r'\bx\s*(\d+)\b', r'\1', name)
    # Normalize common Spanish/English dental term translations
    translations = {
        'jeringa': 'syringe', 'jeringas': 'syringe',
        'tubo': 'tube', 'tubos': 'tube',
        'capsula': 'capsule', 'capsulas': 'capsule', 'capsules': 'capsule',
        'tratamiento': 'treatment',
        'blanqueamiento': 'whitening',
        'resina': 'resin', 'resinas': 'resin',
        'adhesivo': 'adhesive',
        'cemento': 'cement',
        'fluoruro': 'fluoride', 'fluor': 'fluoride',
    }
    for es, en in translations.items():
        name = re.sub(rf'\b{es}\b', en, name)
    # Remove common filler words (Spanish + English)
    name = re.sub(
        r'\b(de|del|con|para|en|por|y|the|and|for|with|of|a|la|el|las|los|un|una)\b',
        '', name
    )
    # Remove dental descriptor noise (words that describe but don't identify)
    # NOTE: "kit" is intentionally kept — it differentiates kits from single units
    name = re.sub(
        r'\b(treatment|fluoride|sodio|sodium|barniz|sabor|flavor|'
        r'recubrimiento|protector|protective|coating|intro|acc|accesorios)\b',
        '', name
    )
    # Remove flavor names (variants, not different products for pricing)
    name = re.sub(
        r'\b(menta|mint|melon|sandia|watermelon|fresa|strawberry|tutti|'
        r'frutti|chicle|bubblegum|bubble|gum)\b',
        '', name
    )
    # Remove manufacturer company names (noise alongside product sub-brands)
    name = re.sub(
        r'\b(3m|espe|solventum|dentsply|sirona)\b',
        '', name
    )
    # Collapse whitespace again
    name = re.sub(r'\s+', ' ', name)
    return name.strip()


def tokenize(name: str) -> set:
    """Get meaningful tokens from a normalized name.

    Keeps single-character tokens because they can be critical
    differentiators in dental products (e.g., Lima H vs Lima K,
    Forcep 18L vs 18R).
    """
    normalized = normalize_name(name)
    return set(normalized.split())


def extract_numbers(name: str) -> set:
    """Extract specification numbers from a normalized name.

    These are numbers that distinguish product variants:
    concentrations (35%), sizes (25mm), model numbers (#20), etc.
    """
    normalized = normalize_name(name)
    return set(re.findall(r'\d+', normalized))


def jaccard_similarity(set_a: set, set_b: set) -> float:
    """Jaccard similarity between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def containment_similarity(set_a: set, set_b: set) -> float:
    """How much of the smaller set is contained in the larger set."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    return len(intersection) / min(len(set_a), len(set_b))


def pick_canonical_name(names: list) -> str:
    """Pick the best canonical name from the group.

    Prefers names that:
    1. Contain a known brand
    2. Are shorter (more concise)
    """
    if not names:
        return ""
    if len(names) == 1:
        return names[0]

    # Prefer names with a known brand, then shortest
    with_brand = [n for n in names if extract_brand(n) is not None]
    candidates = with_brand if with_brand else names
    return sorted(candidates, key=len)[0]


KNOWN_BRANDS = [
    "3m", "solventum", "dentsply", "ivoclar", "kerr", "gc", "voco",
    "coltene", "ultradent", "maquira", "fgm", "angelus", "kulzer",
    "zhermack", "bisco", "septodont", "hu-friedy", "nsk", "woodpecker",
    "medit", "phrozen", "asiga", "scheu", "nextdent", "formlabs",
    "orbis", "peclab", "wanhao", "espe", "clinpro", "tokuyama",
    "shofu", "premier", "sdi", "densco", "bredent", "vita",
    "straumann", "nobel biocare", "osstem", "neodent", "megagen",
    "galderma", "merz", "allergan",
]


def extract_brands(name: str) -> set[str]:
    """Extract ALL matching brands from a product name."""
    name_lower = name.lower()
    found = set()
    for brand in KNOWN_BRANDS:
        if brand in name_lower:
            found.add(brand.upper())
    return found


def extract_brand(name: str) -> str | None:
    """Try to extract the primary brand from product name."""
    brands = extract_brands(name)
    if not brands:
        return None
    # Return the longest match (more specific: "NOBEL BIOCARE" over "GC")
    return max(brands, key=len)


def shared_brand(name_a: str, name_b: str) -> bool:
    """Check if two product names share any known brand."""
    brands_a = extract_brands(name_a)
    brands_b = extract_brands(name_b)
    return bool(brands_a & brands_b)


def _has_packaging_keyword(name: str) -> bool:
    """Check if a product name contains a packaging/quantity keyword."""
    lowered = normalize_name(name)
    return bool(re.search(r'\b(kit|set|pack|combo|surtido|estuche|sistema|system)\b', lowered))


def are_same_product(name_a: str, name_b: str, threshold: float = 0.70) -> bool:
    """Determine if two product names refer to the same product.

    Conservative matching that requires:
    1. High Jaccard similarity (default 0.70)
    2. Compatible specification numbers (sizes, concentrations, etc.)
    3. Compatible packaging (kit vs single unit = different product)

    Number compatibility: if both have numbers, one set must be a subset
    of the other (or equal). This allows "Product 100" to match
    "Product 2.1% 100" while still blocking "Product 35%" vs "Product 16%".
    """
    tokens_a = tokenize(name_a)
    tokens_b = tokenize(name_b)

    if not tokens_a or not tokens_b:
        return False

    # Packaging mismatch: if one is a kit/set and the other isn't, they're different
    pkg_a = _has_packaging_keyword(name_a)
    pkg_b = _has_packaging_keyword(name_b)
    if pkg_a != pkg_b:
        return False

    # Extract specification numbers
    nums_a = extract_numbers(name_a)
    nums_b = extract_numbers(name_b)

    # Number compatibility: if both have numbers, one must be a subset of the other
    if nums_a and nums_b:
        if not (nums_a <= nums_b or nums_b <= nums_a):
            return False

    sim = jaccard_similarity(tokens_a, tokens_b)
    return sim >= threshold
