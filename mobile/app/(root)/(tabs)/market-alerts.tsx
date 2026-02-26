import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MarketAlertsScreen() {
  const router = useRouter();

  const alerts = [
    {
      id: 1,
      title: 'High demand for Mackerel expected tomorrow',
      date: '2026-02-22',
      time: '2 hours ago',
      type: 'warning',
      icon: 'warning',
      color: '#f59e0b'
    },
    {
      id: 2,
      title: 'Cod prices stabilizing',
      date: '2026-02-22',
      time: '4 hours ago',
      type: 'success',
      icon: 'checkmark',
      color: '#10b981'
    },
    {
      id: 3,
      title: 'New fishing zone opened in North region',
      date: '2026-02-21',
      time: '1 day ago',
      type: 'info',
      icon: 'information',
      color: '#3b82f6'
    },
    {
      id: 4,
      title: 'Rough sea warning: Expect lower supply of deep sea fish',
      date: '2026-02-20',
      time: '2 days ago',
      type: 'warning',
      icon: 'warning',
      color: '#f59e0b'
    },
    {
      id: 5,
      title: 'Poya day approaching: Demand expected to drop',
      date: '2026-02-18',
      time: '4 days ago',
      type: 'info',
      icon: 'information',
      color: '#3b82f6'
    }
  ];

  // Group alerts by date
  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.date]) {
      acc[alert.date] = [];
    }
    acc[alert.date].push(alert);
    return acc;
  }, {} as Record<string, typeof alerts>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Alerts</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedAlerts).map(([date, dateAlerts]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            <View style={styles.alertsContainer}>
              {dateAlerts.map(alert => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={[styles.iconContainer, { backgroundColor: alert.color }]}>
                    <Ionicons name={alert.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backIcon: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
    marginLeft: 4,
  },
  alertsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconContainer: {
    padding: 10,
    borderRadius: 24,
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 13,
    color: '#6b7280',
  },
});