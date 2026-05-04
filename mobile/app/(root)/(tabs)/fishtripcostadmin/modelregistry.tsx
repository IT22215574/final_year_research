import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  getModelVersions,
  promoteModel,
  rollbackModel,
} from "@/services/trainingCandidateService";

export default function ModelRegistryScreen() {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const data = await getModelVersions();
      setVersions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handlePromote = async (id: string) => {
    const target = versions.find((item) => item?._id === id);
    const scope = String(target?.scope || "GLOBAL").toUpperCase();
    const boatType = target?.boatType ? ` (${target.boatType})` : "";
    Alert.alert(
      "Promote Model",
      `This will make this ${scope}${boatType} model ACTIVE for matching predictions. Proceed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Promote",
          onPress: async () => {
            try {
              setProcessingId(id);
              await promoteModel(id);
              Alert.alert("Success", "Model promoted to ACTIVE!");
              fetchVersions();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const handleRollback = async () => {
    Alert.alert(
      "Rollback",
      "This will revert to the previously active model. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rollback",
          style: "destructive",
          onPress: async () => {
            try {
              setRollingBack(true);
              await rollbackModel();
              Alert.alert("Success", "Rolled back to previous model!");
              fetchVersions();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setRollingBack(false);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    if (status === "ACTIVE") return "#22c55e";
    if (status === "RETIRED") return "#888";
    if (status === "FAILED") return "#ef4444";
    return "#f59e0b";
  };

  const renderItem = ({ item }: { item: any }) => {
    const id = item?._id || "";
    const status = String(item?.status || "CANDIDATE").toUpperCase();
    const quality = String(item?.quality || "UNKNOWN").toUpperCase();
    const algorithmType = item?.algorithmType || "Unknown Algorithm";
    const scope = String(item?.scope || "GLOBAL").toUpperCase();
    const boatType = item?.boatType || null;
    const selectionRank = item?.selectionRank ?? "-";
    const selectionScore =
      typeof item?.selectionScore === "number"
        ? item.selectionScore.toFixed(2)
        : "N/A";
    const createdAt = item?.createdAt
      ? new Date(item.createdAt).toLocaleString()
      : "N/A";

    return (
      <View style={[styles.card, status === "ACTIVE" && styles.activeCard]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.algo}>{algorithmType}</Text>
          <Text
            style={[styles.badge, { backgroundColor: getStatusColor(status) }]}
          >
            {status}
          </Text>
        </View>
        <Text style={styles.detail}>
          Rank: {selectionRank} • Quality:{" "}
          <Text style={{ color: quality === "GOOD" ? "green" : "red" }}>
            {quality}
          </Text>
        </Text>
        <Text style={styles.detail}>
          Scope: {scope}
          {boatType ? ` • Boat Type: ${boatType}` : ""}
        </Text>
        <Text style={styles.detail}>MAPE Score: {selectionScore}</Text>
        <Text style={styles.date}>{createdAt}</Text>
        {quality === "GOOD" && status === "CANDIDATE" && (
          <TouchableOpacity
            style={[
              styles.promoteBtn,
              processingId === id && { backgroundColor: "#93c5fd" },
            ]}
            disabled={!!processingId || rollingBack || !id}
            onPress={() => handlePromote(id)}
          >
            <Text style={styles.promoteBtnText}>
              {processingId === id ? "Promoting..." : "⬆ Promote to Active"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Model Registry</Text>
      <Text style={styles.subtitle}>
        View trained models, promote the best one, or rollback if needed.
      </Text>
      <TouchableOpacity
        style={[
          styles.rollbackBtn,
          rollingBack && { backgroundColor: "#fca5a5" },
        ]}
        onPress={handleRollback}
        disabled={rollingBack || !!processingId}
      >
        <Text style={styles.rollbackBtnText}>
          {rollingBack ? "Rolling back..." : "⏪ Rollback to Previous Model"}
        </Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#005CFF"
          style={{ marginTop: 50 }}
        />
      ) : versions.length === 0 ? (
        <Text style={styles.emptyText}>
          No model versions yet. Train some models first!
        </Text>
      ) : (
        <FlatList
          data={versions}
          keyExtractor={(item, index) => item?._id || `version-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 15 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  activeCard: { borderLeftWidth: 4, borderLeftColor: "#22c55e" },
  algo: { fontSize: 18, fontWeight: "bold", color: "#111" },
  badge: {
    color: "white",
    fontWeight: "bold",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  detail: { fontSize: 14, color: "#555", marginTop: 4 },
  date: { fontSize: 12, color: "#aaa", marginTop: 6, textAlign: "right" },
  promoteBtn: {
    backgroundColor: "#005CFF",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  promoteBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  rollbackBtn: {
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  rollbackBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontStyle: "italic",
  },
});
