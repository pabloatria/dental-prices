import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/format';
import AdBanner from '@/components/AdBanner';

interface PriceWithSupplier {
  id: string;
  price: number;
  product_url: string;
  in_stock: boolean;
  supplier: { name: string };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [prices, setPrices] = useState<PriceWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      setProduct(prod);

      const { data: allPrices } = await supabase
        .from('prices')
        .select('*, supplier:suppliers(name)')
        .eq('product_id', id)
        .order('scraped_at', { ascending: false });

      // Keep only latest per supplier
      const latest = new Map<string, any>();
      for (const p of allPrices || []) {
        if (!latest.has(p.supplier_id)) {
          latest.set(p.supplier_id, p);
        }
      }
      const sorted = Array.from(latest.values()).sort((a, b) => a.price - b.price);
      setPrices(sorted);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loader}>
        <Text>Producto no encontrado</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>🦷</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          </View>
        </View>

        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}

        <Text style={styles.sectionTitle}>Comparar precios</Text>

        {prices.map((price, i) => (
          <View
            key={price.id}
            style={[styles.priceRow, i === 0 && styles.bestPrice]}
          >
            <View style={styles.priceInfo}>
              <Text style={styles.supplierName}>{price.supplier.name}</Text>
              <Text style={[styles.priceText, i === 0 && styles.bestPriceText]}>
                {formatCLP(price.price)}
              </Text>
              <Text style={price.in_stock ? styles.inStock : styles.outStock}>
                {price.in_stock ? 'Disponible' : 'Agotado'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => Linking.openURL(price.product_url)}
            >
              <Text style={styles.buyButtonText}>Ir a comprar</Text>
            </TouchableOpacity>
          </View>
        ))}

        {prices.length === 0 && (
          <Text style={styles.emptyText}>No hay precios disponibles</Text>
        )}
      </ScrollView>
      <AdBanner />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 100 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  iconBox: {
    width: 80, height: 80, backgroundColor: '#f3f4f6', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: { fontSize: 36 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  brand: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  description: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  bestPrice: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  priceInfo: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  priceText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  bestPriceText: { color: '#16a34a' },
  inStock: { fontSize: 12, color: '#16a34a', marginTop: 2 },
  outStock: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  buyButton: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  buyButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
});
