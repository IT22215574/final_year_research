import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏠 Welcome Home</Text>
        <Text style={styles.headerSubtitle}>Temporary Placeholder</Text>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Fish Market App</Text>
        <Text style={styles.description}>
          This is a temporary home page. The main functionality has been moved to the "Price Predict" tab.
        </Text>
      </View>

      {/* Navigation Card */}
      <View style={styles.card}>
        <Text style={styles.title}>📊 Price Prediction</Text>
        <Text style={styles.description}>
          Get real-time fish price predictions using our ML model.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(tabs)/predictions')}>
          <Text style={styles.buttonText}>Go to Price Predict</Text>
        </TouchableOpacity>
      </View>

      {/* Features Card */}
      <View style={styles.card}>
        <Text style={styles.title}>✨ Features</Text>
        <Text style={styles.description}>
          • Real-time price predictions{'\n'}
          • Market trend analysis{'\n'}
          • Multi-species support{'\n'}
          • Date-based forecasting
        </Text>
      </View>

      {/* Info about this page */}
      <View style={[styles.card, styles.infoCard]}>
        <Text style={styles.infoTitle}>ℹ️ About This Page</Text>
        <Text style={styles.infoText}>
          This is a temporary placeholder home page. When another team member pushes their home page to main, you can pull it without affecting the Price Predict functionality.
        </Text>
        <Text style={styles.infoText}>
          The Price Predict feature is located in the "Price Predict" tab in the navigation bar.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#1e40af',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
    marginBottom: 8,
  },
});
