import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export const SettingsScreen = () => {
  const [language, setLanguage] = React.useState<'en' | 'si'>('en');
  const [selectedPort, setSelectedPort] = React.useState('Colombo');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingItem}>
          <Text style={styles.label}>Language</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, language === 'en' && styles.buttonActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={language === 'en' ? styles.buttonTextActive : styles.buttonText}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, language === 'si' && styles.buttonActive]}
              onPress={() => setLanguage('si')}
            >
              <Text style={language === 'si' ? styles.buttonTextActive : styles.buttonText}>
                සිංහල
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>Default Port</Text>
          <Text style={styles.value}>{selectedPort}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.label}>Developer</Text>
          <Text style={styles.value}>Research Project</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 16,
    backgroundColor: '#10b981',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  aboutItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  value: {
    fontSize: 14,
    color: '#6b7280',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  buttonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
