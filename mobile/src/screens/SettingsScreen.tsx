import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'කසුවක ඉවත් කරන්න',
      'ඔබ සිටින ස්ථානයෙන් කසුවක ඉවත් කිරීමට අවශ්‍යද?',
      [
        { text: 'අවලංගු කරන්න', onPress: () => {}, style: 'cancel' },
        {
          text: 'ඉවත් කරන්න',
          onPress: () => {
            Alert.alert('සාර්ථකව', 'කසුවක ඉවත් කරන ලදී');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>සිංහල</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="bell" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>දැනුම්දීම් සක්‍රිය කරන්න</Text>
              <Text style={styles.settingDescription}>
                වැදගත් යාවත්කාලීන සඳහා දැනුම්දීම් ලබන්න
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="refresh" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>ස්වයංක්‍රිය යාවත්කාලීන</Text>
              <Text style={styles.settingDescription}>
                ස්වයංක්‍රියව දත්ත නිතිපතා යාවත්කාල කරන්න
              </Text>
            </View>
          </View>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={autoRefresh ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>තිමිර මාතෘකා</Text>
              <Text style={styles.settingDescription}>
                අඳුරු අවකාශයේ වැඩ කරන්න
              </Text>
            </View>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#ccc', true: '#81C784' }}
            thumbColor={darkMode ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ගිණුම</Text>

        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="server" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>සර්වරය සකසන්න</Text>
              <Text style={styles.settingDescription}>
                Backend API URL සකසන්න
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="key" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>API බանալ</Text>
              <Text style={styles.settingDescription}>
                ඔබගේ API අක්ষර කුරුඩු කරන්න
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingButton}
          onPress={handleClearCache}
        >
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="delete-outline" size={24} color="#E74C3C" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>කසුවක ඉවත් කරන්න</Text>
              <Text style={styles.settingDescription}>
                සෙස්තුරු දත්ත මකා දෙන්න
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ගැයුම්</Text>

        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="information" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>අපි ගැයුම්</Text>
              <Text style={styles.settingDescription}>
                ර්යුකතියක් සහ නීතිපතිමිතිකරණ
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingContent}>
            <MaterialCommunityIcons name="file-document" size={24} color="#2E86AB" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>ගිණුම්පත්</Text>
              <Text style={styles.settingDescription}>
                අක්ෂරයෝ සහ කිසිවු කොන්දේසි
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>පිළිබඳ</Text>

        <View style={styles.infoBox}>
          <Text style={styles.appVersion}>ඉතිරි අගය Prediction App</Text>
          <Text style={styles.version}>අනුවාදය 1.0.0</Text>
          <Text style={styles.developer}>
            ගවේෂණ කණ්ඩායම විසින් සඳහා බිම් කරන ලද
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginLeft: 16,
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingButton: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  developer: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default SettingsScreen;
