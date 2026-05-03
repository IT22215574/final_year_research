import React from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FisherAdminIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = 20;
  const tileGap = 12;
  const useTwoColumns = width >= 390;
  const tileWidth = useTwoColumns
    ? (width - horizontalPadding * 2 - tileGap) / 2
    : "100%";
  const bottomNavSpacing =
    (Platform.OS === "ios" ? 96 : 104) + Math.max(insets.bottom, 12);

  const dashboardTiles = [
    {
      icon: "📈",
      title: "Boat Type Analytics",
      description: "View approved, trained, and backlog counts by boat type",
      route: "/(root)/(tabs)/fishtripcostadmin/boat-analytics",
    },
    {
      icon: "📊",
      title: "Dataset Management",
      description: "Approve or reject fisherman data for training",
      route: "/(root)/(tabs)/fishtripcostadmin/dataset",
    },
    {
      icon: "⚙️",
      title: "Model Training",
      description: "Trigger ML training pipeline",
      route: "/(root)/(tabs)/fishtripcostadmin/modeltrain",
    },
    {
      icon: "🛥️",
      title: "Boat Type Governance",
      description: "Create, edit, disable, and delete boat types",
      route: "/(root)/(tabs)/fishtripcostadmin/boattypes",
    },
    {
      icon: "🧠",
      title: "Model Registry",
      description: "Promote best model or rollback",
      route: "/(root)/(tabs)/fishtripcostadmin/modelregistry",
    },
  ] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: bottomNavSpacing },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Fisher Operations</Text>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <View style={[styles.grid, { gap: tileGap }]}>
        {dashboardTiles.map((tile) => (
          <TouchableOpacity
            key={tile.route}
            activeOpacity={0.82}
            style={[styles.card, { width: tileWidth }]}
            onPress={() => router.push(tile.route)}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{tile.icon}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {tile.title}
            </Text>
            <Text style={styles.cardText} numberOfLines={3}>
              {tile.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F766E",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0F172A",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    minHeight: 168,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    lineHeight: 21,
  },
  cardText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 18,
  },
});
