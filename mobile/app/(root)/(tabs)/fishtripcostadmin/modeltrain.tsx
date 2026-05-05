import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import {
  triggerModelTraining,
  getTrainingHistory,
} from "@/services/trainingCandidateService";
import { getAdminBoatTypes } from "@/services/boatService";

type TrainingJob = {
  _id?: string;
  status?: string;
  scope?: "GLOBAL" | "BOAT_TYPE" | string;
  boatType?: string;
  recordsProcessed?: number;
  startedBy?: string;
  createdAt?: string;
};

export default function ModelTrainScreen() {
  const [history, setHistory] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [scope, setScope] = useState<"GLOBAL" | "BOAT_TYPE">("GLOBAL");
  const [boatTypeOptions, setBoatTypeOptions] = useState<string[]>([]);
  const [selectedBoatType, setSelectedBoatType] = useState<string>("");
  const [boatModalVisible, setBoatModalVisible] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getTrainingHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchBoatTypeOptions();
  }, []);

  const fetchBoatTypeOptions = async () => {
    try {
      const adminBoatTypes = await getAdminBoatTypes();
      const activeBoatTypes = Array.from(
        new Set(
          (Array.isArray(adminBoatTypes) ? adminBoatTypes : [])
            .filter((item: any) => item?.active !== false)
            .map((item: any) => String(item?.name || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));

      setBoatTypeOptions(activeBoatTypes);
      if (!selectedBoatType && activeBoatTypes.length > 0) {
        setSelectedBoatType(activeBoatTypes[0]);
      } else if (
        selectedBoatType &&
        !activeBoatTypes.includes(selectedBoatType) &&
        activeBoatTypes.length > 0
      ) {
        setSelectedBoatType(activeBoatTypes[0]);
      }
    } catch (error) {
      console.error("Error fetching boat type options:", error);
      setBoatTypeOptions([]);
    }
  };

  const handleTriggerTraining = async () => {
    if (scope === "BOAT_TYPE" && !selectedBoatType) {
      Alert.alert(
        "Boat type required",
        "Please choose a boat type before starting boat-type training.",
      );
      return;
    }

    const scopeText =
      scope === "GLOBAL"
        ? "GLOBAL training"
        : `BOAT_TYPE training for ${selectedBoatType}`;
    Alert.alert(
      "Trigger Training",
      `This will start ${scopeText} using APPROVED datasets. It may take some time. Proceed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Train Models",
          onPress: async () => {
            try {
              setTraining(true);
              await triggerModelTraining(
                scope === "GLOBAL"
                  ? { scope: "GLOBAL" }
                  : { scope: "BOAT_TYPE", boatType: selectedBoatType },
              );
              Alert.alert(
                "Success",
                "Training job triggered and completed successfully!",
              );
              fetchHistory();
              fetchBoatTypeOptions();
            } catch (error: any) {
              Alert.alert(
                "Training Failed",
                error.message || "Something went wrong.",
              );
            } finally {
              setTraining(false);
            }
          },
        },
      ],
    );
  };

  const renderStatusColor = (status?: string) => {
    const normalized = String(status || "").toUpperCase();
    if (
      normalized === "SUCCESS" ||
      normalized === "COMPLETE" ||
      normalized === "COMPLETED"
    )
      return "green";
    if (normalized === "FAILED" || normalized === "ERROR") return "red";
    return "orange";
  };

  const renderItem = ({ item }: { item: TrainingJob }) => {
    const status = String(item.status || "PENDING").toUpperCase();
    const shortId = item._id
      ? item._id.substring(Math.max(0, item._id.length - 6)).toUpperCase()
      : "N/A";
    const startedBy = item.startedBy
      ? `${item.startedBy.substring(0, 6)}...`
      : "unknown";
    const createdAt = item.createdAt
      ? new Date(item.createdAt).toLocaleString()
      : "N/A";

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Job ID: <Text style={{ fontWeight: "normal" }}>{shortId}</Text>
        </Text>
        <Text>
          Status:{" "}
          <Text
            style={{ fontWeight: "bold", color: renderStatusColor(status) }}
          >
            {status}
          </Text>
        </Text>
        <Text>Scope: {item.scope || "GLOBAL"}</Text>
        {item.scope === "BOAT_TYPE" ? (
          <Text>Boat Type: {item.boatType || "-"}</Text>
        ) : null}
        <Text>Records Processed: {item.recordsProcessed ?? 0}</Text>
        <Text>Started By: {startedBy}</Text>
        <Text style={styles.dateText}>{createdAt}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Model Training Hub</Text>
      <Text style={styles.subtitle}>
        Send approved fisherman data to the Python AI engine to continuously
        improve cost predictions.
      </Text>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchHistory}
        disabled={loading || training}
      >
        <Text style={styles.refreshText}>
          {loading ? "Refreshing..." : "Refresh History"}
        </Text>
      </TouchableOpacity>

      <View style={styles.scopeContainer}>
        <Text style={styles.scopeTitle}>Training Scope</Text>
        <View style={styles.scopeButtonsRow}>
          <TouchableOpacity
            style={[
              styles.scopeButton,
              scope === "GLOBAL" && styles.scopeButtonActive,
            ]}
            disabled={training}
            onPress={() => setScope("GLOBAL")}
          >
            <Text
              style={[
                styles.scopeButtonText,
                scope === "GLOBAL" && styles.scopeButtonTextActive,
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scopeButton,
              scope === "BOAT_TYPE" && styles.scopeButtonActive,
            ]}
            disabled={training}
            onPress={() => setScope("BOAT_TYPE")}
          >
            <Text
              style={[
                styles.scopeButtonText,
                scope === "BOAT_TYPE" && styles.scopeButtonTextActive,
              ]}
            >
              Per Boat Type
            </Text>
          </TouchableOpacity>
        </View>

        {scope === "BOAT_TYPE" && (
          <TouchableOpacity
            style={styles.boatTypeSelector}
            disabled={training || boatTypeOptions.length === 0}
            onPress={() => setBoatModalVisible(true)}
          >
            <Text style={styles.boatTypeLabel}>Boat Type:</Text>
            <Text style={styles.boatTypeValue}>
              {boatTypeOptions.length === 0
                ? "No active boat types configured"
                : selectedBoatType || "Select boat type"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, training && styles.buttonDisabled]}
        onPress={handleTriggerTraining}
        disabled={training}
      >
        {training ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color="white" />
            <Text style={styles.buttonText}> Training Models...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>🚀 Trigger ML Pipeline</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.historyTitle}>Recent Training Jobs</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#005CFF"
          style={{ marginTop: 50 }}
        />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>
          No training jobs have been executed yet.
        </Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item._id || `job-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={boatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBoatModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Boat Type</Text>
            {boatTypeOptions.length === 0 ? (
              <Text style={styles.modalEmpty}>
                No active boat types available. Configure boat types first.
              </Text>
            ) : (
              <FlatList
                data={boatTypeOptions}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => {
                  const active = item === selectedBoatType;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        active && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setSelectedBoatType(item);
                        setBoatModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          active && styles.modalItemTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setBoatModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  refreshButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  refreshText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  scopeContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  scopeTitle: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 8,
  },
  scopeButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  scopeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  scopeButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  scopeButtonText: {
    color: "#334155",
    fontWeight: "600",
  },
  scopeButtonTextActive: {
    color: "#1d4ed8",
  },
  boatTypeSelector: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  boatTypeLabel: {
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 2,
  },
  boatTypeValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#005CFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: "#8ab4f8",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 5 },
  dateText: { fontSize: 12, color: "#888", marginTop: 5, textAlign: "right" },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontStyle: "italic",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    maxHeight: "75%",
    padding: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  modalItemActive: {
    backgroundColor: "#dbeafe",
  },
  modalItemText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  modalItemTextActive: {
    color: "#1d4ed8",
  },
  modalEmpty: {
    color: "#6b7280",
    marginVertical: 12,
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  modalCloseBtnText: {
    color: "#111827",
    fontWeight: "700",
  },
});
