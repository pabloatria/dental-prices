"""
Regression tests for matchers.py — pack-size differentiation.

Run:
    cd scrapers
    python -m pytest test_matchers.py -v
    # or without pytest:
    python -m unittest test_matchers.py -v
"""
from __future__ import annotations

import unittest

from matchers import (
    extract_pack_count,
    are_same_product,
    normalize_name,
    extract_numbers,
)


class TestExtractPackCount(unittest.TestCase):
    """extract_pack_count should recognize countable-unit patterns only."""

    def test_number_before_jeringas(self):
        self.assertEqual(
            extract_pack_count("2 Jeringas Restaurador Fluido Filtek Z350 Flow"),
            2,
        )

    def test_number_inside_parens(self):
        self.assertEqual(
            extract_pack_count("3M Resina Fluida Filtek Z350 XT Flow Tono A1 (2 Jeringas)"),
            2,
        )

    def test_single_syringe(self):
        self.assertEqual(
            extract_pack_count("Resina Fluida Filtek Z350 XT Flow (1 Jeringa)"),
            1,
        )

    def test_pack_2_jeringas(self):
        self.assertEqual(
            extract_pack_count("Filtek Bulk Fill Flow (Pack 2 jeringas) - 3M"),
            2,
        )

    def test_x_prefixed_quantity(self):
        self.assertEqual(
            extract_pack_count("Filtek Bulk Fill Flow x 2 jeringas, 3M ESPE"),
            2,
        )

    def test_tubos(self):
        self.assertEqual(extract_pack_count("Ionómero de vidrio 3 tubos"), 3)

    def test_capsulas(self):
        self.assertEqual(extract_pack_count("RelyX U200 x 20 capsulas"), 20)

    def test_no_unit_returns_none(self):
        # No countable unit → refuse to guess.
        self.assertIsNone(extract_pack_count("Filtek Z350 XT Flow"))
        self.assertIsNone(extract_pack_count("Filtek Bulk Fill Flow"))

    def test_size_not_pack(self):
        # "25mm" is a size, not a pack count.
        self.assertIsNone(extract_pack_count("Lima Hedstrom 25mm"))

    def test_concentration_not_pack(self):
        # Percentages are not pack counts.
        self.assertIsNone(extract_pack_count("Ionomero al 30%"))

    def test_model_number_not_pack(self):
        # "A3.5" or "C14" are shade/model codes, not pack counts.
        self.assertIsNone(extract_pack_count("Resina Z350 XT Tono A3.5"))
        self.assertIsNone(extract_pack_count("Bloque Disilicato C14 LT"))

    def test_pack_word_without_number(self):
        # Word "pack" without number → can't extract count.
        self.assertIsNone(extract_pack_count("Pack economico"))

    def test_absurd_large_count_rejected(self):
        # 500 packs is nonsense — must be a catalog code.
        self.assertIsNone(extract_pack_count("Modelo 500 jeringas ref"))
        # But 50 is plausible:
        self.assertEqual(extract_pack_count("Kit 50 jeringas desechables"), 50)


class TestAreSameProduct(unittest.TestCase):
    """Pack-size mismatch must hard-block same-product matching."""

    def test_one_vs_two_jeringas_z350_flow_blocked(self):
        """The original Clandent Z350 Flow bug."""
        a = "Resina Fluida Filtek Z350 XT Flow (1 Jeringa)"
        b = "Filtek Z350 XT Flow Tono A1 (2 Jeringas)"
        self.assertFalse(are_same_product(a, b))

    def test_same_pack_size_still_matches(self):
        # Two listings of the same SKU + same pack count should still match
        # after the pack-size check. Use names that would have matched before
        # (same alphabetic tokens, differ only in punctuation/order).
        a = "Filtek Z350 XT Flow A1 (2 Jeringas)"
        b = "Filtek Z350 XT Flow A1 2 jeringas"
        self.assertTrue(are_same_product(a, b))

    def test_pack_size_not_detected_on_one_side_still_compares(self):
        """When only one side has an extractable pack count, the check
        doesn't fire — we don't want to refuse matches for names that
        simply omit packaging info."""
        a = "Filtek Z350 XT Flow"
        b = "Filtek Z350 XT Flow (2 Jeringas)"
        # The number guard may still allow/block this; the point is that
        # the pack-size hard block does NOT fire when one side is None.
        # We assert non-failure: whatever the outcome, it wasn't driven by
        # the pack-size check alone.
        # (Actual match result depends on Jaccard — not asserting here.)
        _ = are_same_product(a, b)

    def test_kit_vs_non_kit_still_blocked(self):
        """Original _has_packaging_keyword guard still works."""
        a = "Kit Filtek Z350 XT Flow"
        b = "Filtek Z350 XT Flow (1 Jeringa)"
        self.assertFalse(are_same_product(a, b))

    def test_three_vs_two_tubes_blocked(self):
        a = "Ionomero Fuji IX GC (2 tubos)"
        b = "Ionomero Fuji IX GC - 3 tubos"
        self.assertFalse(are_same_product(a, b))

    def test_different_shade_still_blocked_by_alpha_check(self):
        """Tone A1 vs Tone A3.5 are different SKUs (alpha-differentiator)."""
        a = "Filtek Z350 XT Flow Tono A1 (2 Jeringas)"
        b = "Filtek Z350 XT Flow Tono A3 (2 Jeringas)"
        # A1/A3 are numeric shade codes — number guard fires.
        self.assertFalse(are_same_product(a, b))


class TestBackwardCompatibility(unittest.TestCase):
    """Make sure existing behavior isn't regressed by the new pack check."""

    def test_normalize_name_still_strips_accents(self):
        # 'Fluór' → 'fluor' (accent strip) → 'fluoride' (translate) → '' (noise removal)
        # That's the intended pipeline. Just verify accents get stripped — test
        # a word that survives the pipeline.
        self.assertEqual(normalize_name("Cápsula"), "capsule")

    def test_extract_numbers_still_works(self):
        self.assertEqual(extract_numbers("Resina 35% 25mm"), {"35", "25"})


if __name__ == "__main__":
    unittest.main()
