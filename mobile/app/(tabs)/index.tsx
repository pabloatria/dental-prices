import { useState, useCallback } from 'react';
import { StyleSheet, TextInput, FlatList, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { searchProducts } from '@/lib/api';
import { formatCLP } from '@/lib/format';
import { ProductWithPrices } from '@/lib/types';
import AdBanner from '@/components/AdBanner';

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchProducts(query.trim());
      setResults(data.products || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    }
    setLoading(false);
  }, [query]);

  const renderProduct = ({ item }: { item: ProductWithPrices }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={styles.productIcon}>
        <Text style={styles.productIconText}>🦷</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
        <View style={styles.priceRow}>
          {item.lowest_price > 0 ? (
            <>
              <Text style={styles.productPrice}>{formatCLP(item.lowest_price)}</Text>
              <Text style={styles.storeCount}>
                en {item.store_count} {item.store_count === 1 ? 'tienda' : 'tiendas'}
              </Text>
            </>
          ) : (
            <Text style={styles.storeCount}>Sin precio disponible</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DentalPrecios</Text>
      <Text style={styles.subtitle}>Compara precios de productos dentales en Chile</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos dentales..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : searched && results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No se encontraron productos</Text>
          <Text style={styles.emptySubtext}>Intenta con otro término</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingBottom: 100 },
  productCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6',
  },
  productIcon: {
    width: 56, height: 56, backgroundColor: '#f3f4f6', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  productIconText: { fontSize: 24 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  productBrand: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#16a34a' },
  storeCount: { fontSize: 12, color: '#9ca3af' },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#9ca3af' },
  emptySubtext: { fontSize: 14, color: '#d1d5db', marginTop: 4 },
});
