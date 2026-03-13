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
    # Strip accents (flúor -> fluor)
    name = _strip_accents(name)
    # Remove all punctuation except alphanumeric and spaces
    name = re.sub(r'[^a-z0-9\s]', ' ', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name)
    # Remove quantity-only suffixes (keep concentration/size numbers)
    name = re.sub(
        r'\b(und|unid|unidad|unidades|unidosis|pza|pieza|piezas|uds|dosis|'
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


def are_same_product(name_a: str, name_b: str, threshold: float = 0.70) -> bool:
    """Determine if two product names refer to the same product.

    Conservative matching that requires:
    1. High Jaccard similarity (default 0.70)
    2. Compatible specification numbers (sizes, concentrations, etc.)

    Products that differ in specification numbers (e.g., 35% vs 16%,
    25mm vs 31mm, #20 vs #25) are never considered the same.
    """
    tokens_a = tokenize(name_a)
    tokens_b = tokenize(name_b)

    if not tokens_a or not tokens_b:
        return False

    # Extract specification numbers
    nums_a = extract_numbers(name_a)
    nums_b = extract_numbers(name_b)

    # Number compatibility: if both have numbers, they must match exactly
    if nums_a and nums_b and nums_a != nums_b:
        return False

    sim = jaccard_similarity(tokens_a, tokens_b)
    return sim >= threshold
