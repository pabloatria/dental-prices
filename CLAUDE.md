# DentalPrecios — Project Conventions

Project-specific rules that override or extend my global `~/.claude/CLAUDE.md`.

## Writing style — hard rules

**No em dashes (—) in user-facing content.** Pablo flagged this Apr 23, 2026: em dashes read as AI-generated. Avoid them in:

- Meta titles and meta descriptions
- H1, H2, H3 on any rendered page
- Blog posts (body, titles, captions)
- JSON-LD schema text (FAQ answers, descriptions)
- Instagram captions, card text, email copy
- Product page editorial blocks
- Category intros and editorial sections
- Anywhere a human dentist will read it

**Replacements:**
- Em dash as a parenthetical → use a comma, parentheses, or a period
- Em dash as a colon substitute → use a colon
- Em dash as a list separator → use " - " (hyphen with spaces), a line break, or restructure

**OK in code comments.** Em dashes in TypeScript/Python comments are fine — Pablo doesn't read those. The rule is about reader-facing text only.

**En dashes (–)** are fine in number ranges: "$10.000–$80.000", "5–10 mm", "2026–2027". That's typographically correct and not an AI tell.

### Do this sweep before any publish

Before committing any blog post, metadata update, or social copy:

```bash
grep -n '—' <file>   # em dash
```

If it fires in user-facing text, replace. If it's only in code comments, leave it.

## Other Pablo preferences (from global CLAUDE.md, reinforced here)

- Chilean Spanish register for CL-facing content. No Argentinian voseo (tenés, pensá, filtrá, decidí…). Use `tú` form: tienes, piensa, filtra, decide.
- Avoid populist/conspiratorial framing ("lo que tu proveedor no quiere que veas"). Keep tone: clinical, confident, dentist-to-dentist.
- Numbers in Spanish use dot thousands separator: `$41.700 CLP`, not `$41,700`. Already handled by `formatCLP()` in `web/src/lib/queries/products.ts`.
