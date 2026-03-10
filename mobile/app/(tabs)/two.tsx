import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AdBanner from '@/components/AdBanner';

const categories = [
  { name: 'Resinas', slug: 'resinas', icon: '🦷' },
  { name: 'Instrumental', slug: 'instrumental', icon: '🔧' },
  { name: 'Endodoncia', slug: 'endodoncia', icon: '📌' },
  { name: 'Ortodoncia', slug: 'ortodoncia', icon: '😁' },
  { name: 'Cirugía', slug: 'cirugia', icon: '✂️' },
  { name: 'Anestesia', slug: 'anestesia', icon: '💉' },
  { name: 'Bioseguridad', slug: 'bioseguridad', icon: '🧤' },
  { name: 'Equipamiento', slug: 'equipamiento', icon: '🏥' },
  { name: 'Periodoncia', slug: 'periodoncia', icon: '🪥' },
  { name: 'Prótesis', slug: 'protesis', icon: '🦿' },
  { name: 'Implantología', slug: 'implantologia', icon: '🔩' },
  { name: 'Blanqueamiento', slug: 'blanqueamiento', icon: '✨' },
  { name: 'Cementos', slug: 'cementos', icon: '🧱' },
  { name: 'Desechables', slug: 'desechables', icon: '🗑️' },
  { name: 'Radiología', slug: 'radiologia', icon: '📷' },
  { name: 'Prevención', slug: 'prevencion', icon: '🛡️' },
];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Categorías</Text>
        <View style={styles.grid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.slug}
              style={styles.card}
              onPress={() => {
                router.push(`/(tabs)?category=${cat.slug}`);
              }}
            >
              <Text style={styles.icon}>{cat.icon}</Text>
              <Text style={styles.cardText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6',
  },
  icon: { fontSize: 28, marginBottom: 8 },
  cardText: { fontSize: 14, fontWeight: '500', color: '#374151' },
});
