#!/usr/bin/env python3
from supabase import create_client
sb = create_client('https://vbtxcjasooepbtxtognc.supabase.co', 'sb_secret_k95g0WQrExcyAydMAuDMEw_r-HWD0xI')

cats = sb.table('categories').select('id, name').is_('parent_id', 'null').order('name').execute()

print(f"{'Category':<40s} {'Count':>6s}")
print('-' * 48)
total = 0
for c in cats.data:
    r = sb.table('products').select('id', count='exact').eq('category_id', c['id']).execute()
    count = r.count if r.count else len(r.data)
    total += count
    if count > 0:
        print(f"{c['name']:<40s} {count:>6d}")

print('-' * 48)
print(f"{'TOTAL':<40s} {total:>6d}")

uncategorized = sb.table('products').select('id', count='exact').is_('category_id', 'null').execute()
unc_count = uncategorized.count if uncategorized.count else len(uncategorized.data)
print(f"{'Uncategorized':<40s} {unc_count:>6d}")
