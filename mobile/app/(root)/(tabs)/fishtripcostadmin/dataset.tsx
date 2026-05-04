import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  getPendingCandidates,
  approveCandidate,
  rejectCandidate,
  TrainingCandidate,
  DatasetCsvFileInfo,
  getDatasetCsvFiles,
  refreshDatasetCsvFiles,
  getDatasetCsvContent,
} from "@/services/trainingCandidateService";
import { getAdminBoatTypes } from "@/services/boatService";

const LARGE_QUEUE_THRESHOLD = 20;
const ALL_DATASET_FILES = "__ALL_DATASET_FILES__";

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const flattenCandidate = (item: TrainingCandidate) => {
  const flattened: Record<string, unknown> = {
    _id: item._id,
    sourceTripId: item.sourceTripId,
    boatId: item.boatId,
    boatType: item.boatType,
    status: item.status,
    createdAt: item.createdAt,
  };

  Object.entries(item.featuresSnapshot || {}).forEach(([key, value]) => {
    flattened[`feature_${key}`] = value;
  });

  Object.entries(item.labelSnapshot || {}).forEach(([key, value]) => {
    flattened[`label_${key}`] = value;
  });

  return flattened;
};

const buildCandidateCsv = (items: TrainingCandidate[]) => {
  const flattenedRows = items.map(flattenCandidate);
  const fields = Array.from(
    flattenedRows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const header = fields.join(",");
  const lines = flattenedRows.map((row) =>
    fields.map((field) => csvEscape(row[field])).join(","),
  );

  return [header, ...lines].join("\n");
};

export default function DatasetScreen() {
  const insets = useSafeAreaInsets();
  const [candidates, setCandidates] = useState<TrainingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingCandidate, setViewingCandidate] =
    useState<TrainingCandidate | null>(null);
  const [exporting, setExporting] = useState(false);
  const [datasetFiles, setDatasetFiles] = useState<DatasetCsvFileInfo[]>([]);
  const [datasetFilesLoading, setDatasetFilesLoading] = useState(true);
  const [refreshingDatasetFiles, setRefreshingDatasetFiles] = useState(false);
  const [boatTypeOptions, setBoatTypeOptions] = useState<string[]>([]);
  const [selectedBoatType, setSelectedBoatType] = useState("");
  const [selectedDatasetBoatType, setSelectedDatasetBoatType] =
    useState(ALL_DATASET_FILES);
  const [viewingDatasetFile, setViewingDatasetFile] = useState<string | null>(
    null,
  );
  const [viewingDatasetContent, setViewingDatasetContent] = useState("");
  const [datasetContentLoading, setDatasetContentLoading] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPendingCandidates();
      setCandidates(data);
    } catch (error: any) {
      console.error(error);
      setCandidates([]);
      setErrorMessage(error?.message || "Failed to fetch pending datasets.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetFiles = async () => {
    setDatasetFilesLoading(true);
    try {
      const files = await getDatasetCsvFiles();
      setDatasetFiles(files);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Dataset files",
        error?.message || "Failed to fetch dataset CSV files.",
      );
    } finally {
      setDatasetFilesLoading(false);
    }
  };

  const fetchBoatTypeOptions = async () => {
    try {
      const boatTypes = await getAdminBoatTypes();
      const activeNames = boatTypes
        .filter((item) => item.active)
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setBoatTypeOptions(activeNames);
      if (!selectedBoatType && activeNames.length > 0) {
        setSelectedBoatType(activeNames[0]);
      }
      if (
        selectedDatasetBoatType !== ALL_DATASET_FILES &&
        !activeNames.some(
          (boatType) =>
            boatType.trim().toLowerCase() ===
            selectedDatasetBoatType.trim().toLowerCase(),
        )
      ) {
        setSelectedDatasetBoatType(ALL_DATASET_FILES);
      }
    } catch (error) {
      console.error("Failed to load boat types", error);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchDatasetFiles();
    fetchBoatTypeOptions();
  }, []);

  const handleRefreshAllDatasetFiles = async () => {
    try {
      setRefreshingDatasetFiles(true);
      await refreshDatasetCsvFiles();
      await fetchDatasetFiles();
      Alert.alert("Success", "All dataset CSV files were refreshed.");
    } catch (error: any) {
      Alert.alert(
        "Refresh failed",
        error?.message || "Could not refresh dataset files.",
      );
    } finally {
      setRefreshingDatasetFiles(false);
    }
  };

  const handleRefreshBoatDatasetFile = async () => {
    if (!selectedBoatType.trim()) {
      Alert.alert("Boat type required", "Select or enter a boat type first.");
      return;
    }

    try {
      setRefreshingDatasetFiles(true);
      await refreshDatasetCsvFiles(selectedBoatType.trim());
      await fetchDatasetFiles();
      Alert.alert(
        "Success",
        `Boat dataset refreshed for ${selectedBoatType.trim()}.`,
      );
    } catch (error: any) {
      Alert.alert(
        "Refresh failed",
        error?.message || "Could not refresh this boat dataset.",
      );
    } finally {
      setRefreshingDatasetFiles(false);
    }
  };

  const handleViewDatasetFile = async (filename: string) => {
    try {
      setViewingDatasetFile(filename);
      setDatasetContentLoading(true);
      const response = await getDatasetCsvContent(filename);
      const csvText = response?.data?.content ?? response?.content ?? "";
      setViewingDatasetContent(String(csvText));
    } catch (error: any) {
      setViewingDatasetFile(null);
      Alert.alert(
        "View failed",
        error?.message || "Could not load dataset CSV content.",
      );
    } finally {
      setDatasetContentLoading(false);
    }
  };

  const selectedDatasetSlug = useMemo(() => {
    if (selectedDatasetBoatType === ALL_DATASET_FILES) {
      return null;
    }

    return selectedDatasetBoatType
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }, [selectedDatasetBoatType]);

  const visibleDatasetFiles = useMemo(() => {
    if (!selectedDatasetSlug) {
      return datasetFiles;
    }

    return datasetFiles.filter(
      (file) => file.boatTypeSlug === selectedDatasetSlug,
    );
  }, [datasetFiles, selectedDatasetSlug]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await approveCandidate(id);
      await fetchCandidates();
    } catch (error: any) {
      console.error("Failed to approve", error);
      Alert.alert(
        "Approve failed",
        error?.message || "Could not approve this record.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const closeRejectModal = () => {
    if (processingId) return;
    setRejectingId(null);
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;

    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert(
        "Reason required",
        "Please provide a reason before rejecting this dataset.",
      );
      return;
    }

    try {
      setProcessingId(rejectingId);
      await rejectCandidate(rejectingId, reason);
      closeRejectModal();
      await fetchCandidates();
    } catch (error: any) {
      console.error("Failed to reject", error);
      Alert.alert(
        "Reject failed",
        error?.message || "Could not reject this record.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCountLabel = useMemo(
    () =>
      `${candidates.length} pending dataset${candidates.length === 1 ? "" : "s"}`,
    [candidates.length],
  );

  const exportHint = useMemo(
    () =>
      candidates.length >= LARGE_QUEUE_THRESHOLD
        ? "Large queue detected. Export to CSV for easier review in Excel or Sheets."
        : "Use View to inspect full trip details before approving.",
    [candidates.length],
  );

  const handleExportCsv = async () => {
    if (candidates.length === 0) {
      Alert.alert("No data", "There are no pending datasets to export.");
      return;
    }

    try {
      setExporting(true);
      const csvContent = buildCandidateCsv(candidates);
      const fileName = `dataset_review_${Date.now()}.csv`;
      const file = new File(Paths.cache, fileName);
      file.write(csvContent);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "Your device cannot open the share sheet. The CSV file was created in the app cache, but the OS does not allow sharing from this environment.",
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Export Dataset Review CSV",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error: any) {
      Alert.alert(
        "Export failed",
        error?.message || "Could not export the review dataset.",
      );
    } finally {
      setExporting(false);
    }
  };

  const renderDetailRow = (label: string, value: unknown) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
        {formatValue(value)}
      </Text>
    </View>
  );

  const renderSnapshotSection = (
    title: string,
    data: Record<string, unknown> | undefined,
  ) => {
    const entries = Object.entries(data || {});

    return (
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
          {title}
        </Text>
        {entries.length === 0 ? (
          <Text style={{ color: "#6b7280" }}>No details available.</Text>
        ) : (
          entries.map(([key, value]) => renderDetailRow(key, value))
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <FlatList
        style={{ flex: 1 }}
        data={candidates}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 120,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
              Dataset Review
            </Text>
            <Text style={{ color: "#4b5563", marginBottom: 6 }}>
              Review fisherman trip data, inspect all model features, and
              approve or reject each record.
            </Text>
            <Text style={{ color: "#6b7280", marginBottom: 14 }}>
              {pendingCountLabel}
            </Text>

            <View
              style={{
                backgroundColor: "#eff6ff",
                borderColor: "#bfdbfe",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Text
                style={{ color: "#1d4ed8", fontWeight: "700", marginBottom: 4 }}
              >
                Admin review tip
              </Text>
              <Text style={{ color: "#1e3a8a", lineHeight: 20 }}>
                {exportHint}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#f8fafc",
                borderColor: "#dbeafe",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}
              >
                Training Dataset CSV Files
              </Text>
              <Text style={{ color: "#334155", marginBottom: 10 }}>
                Refresh all or boat-wise dataset files. Boat files use a single
                canonical name, so new updates do not create duplicates.
              </Text>

              <Text
                style={{ color: "#475569", fontWeight: "600", marginBottom: 6 }}
              >
                Dataset filter boat type
              </Text>
              <TextInput
                value={
                  selectedDatasetBoatType === ALL_DATASET_FILES
                    ? ""
                    : selectedDatasetBoatType
                }
                onChangeText={setSelectedDatasetBoatType}
                placeholder="All dataset files"
                style={{
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: "white",
                  marginBottom: 8,
                }}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedDatasetBoatType(ALL_DATASET_FILES)
                    }
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor:
                        selectedDatasetBoatType === ALL_DATASET_FILES
                          ? "#2563eb"
                          : "#e2e8f0",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDatasetBoatType === ALL_DATASET_FILES
                            ? "white"
                            : "#0f172a",
                        fontWeight: "600",
                      }}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {boatTypeOptions.map((boatType) => {
                    const active =
                      selectedDatasetBoatType.trim().toLowerCase() ===
                      boatType.trim().toLowerCase();
                    return (
                      <TouchableOpacity
                        key={boatType}
                        onPress={() => setSelectedDatasetBoatType(boatType)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          backgroundColor: active ? "#2563eb" : "#e2e8f0",
                        }}
                      >
                        <Text
                          style={{
                            color: active ? "white" : "#0f172a",
                            fontWeight: "600",
                          }}
                        >
                          {boatType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text
                style={{ color: "#475569", fontWeight: "600", marginBottom: 6 }}
              >
                Boat type for refresh
              </Text>
              <TextInput
                value={selectedBoatType}
                onChangeText={setSelectedBoatType}
                placeholder="Fiber Boat (medium)"
                style={{
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: "white",
                  marginBottom: 8,
                }}
              />

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: refreshingDatasetFiles
                      ? "#94a3b8"
                      : "#0f766e",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  disabled={refreshingDatasetFiles}
                  onPress={handleRefreshAllDatasetFiles}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {refreshingDatasetFiles
                      ? "Refreshing..."
                      : "Refresh All Datasets"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: refreshingDatasetFiles
                      ? "#94a3b8"
                      : "#1d4ed8",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  disabled={refreshingDatasetFiles}
                  onPress={handleRefreshBoatDatasetFile}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Refresh Selected Boat
                  </Text>
                </TouchableOpacity>
              </View>

              {datasetFilesLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : visibleDatasetFiles.length === 0 ? (
                <Text style={{ color: "#64748b" }}>
                  {selectedDatasetSlug
                    ? `No dataset CSV files found for ${selectedDatasetBoatType}.`
                    : "No training CSV files found yet."}
                </Text>
              ) : (
                visibleDatasetFiles.map((file) => (
                  <View
                    key={file.filename}
                    style={{
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: "#0f172a", fontWeight: "700" }}>
                      {file.filename}
                    </Text>
                    <Text style={{ color: "#475569", marginTop: 4 }}>
                      Scope: {file.scope} | Boat: {file.boatTypeSlug || "all"} |
                      Rows: {file.rowCount} | Size: {file.sizeBytes} bytes
                    </Text>
                    <Text style={{ color: "#64748b", marginTop: 2 }}>
                      Updated: {new Date(file.updatedAt).toLocaleString()}
                    </Text>

                    <TouchableOpacity
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: "#334155",
                        alignItems: "center",
                      }}
                      onPress={() => handleViewDatasetFile(file.filename)}
                    >
                      <Text style={{ color: "white", fontWeight: "700" }}>
                        View CSV
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#2563eb",
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={fetchCandidates}
                disabled={loading || exporting}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Refresh
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: exporting ? "#94a3b8" : "#0f766e",
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={handleExportCsv}
                disabled={loading || exporting}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {exporting ? "Exporting..." : "Export CSV"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#111827",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ flex: 1, color: "white", fontWeight: "700" }}>
                Boat
              </Text>
              <Text style={{ flex: 1, color: "white", fontWeight: "700" }}>
                Distance
              </Text>
              <Text style={{ flex: 1, color: "white", fontWeight: "700" }}>
                Fuel
              </Text>
              <Text style={{ flex: 1, color: "white", fontWeight: "700" }}>
                Cost
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : errorMessage ? (
            <Text
              style={{ textAlign: "center", color: "#dc2626", marginTop: 50 }}
            >
              {errorMessage}
            </Text>
          ) : (
            <Text style={{ textAlign: "center", color: "#666", marginTop: 50 }}>
              No pending datasets right now. Waiting for fishermen to log actual
              trips.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const distance =
            item.featuresSnapshot?.distanceKm ??
            item.featuresSnapshot?.distance ??
            "-";
          const fuel =
            item.labelSnapshot?.actualFuelLiters ??
            item.labelSnapshot?.fuelUsedLiters ??
            "-";
          const cost =
            item.labelSnapshot?.actualCost ??
            item.labelSnapshot?.totalCost ??
            "-";

          return (
            <View
              style={{
                backgroundColor: "white",
                padding: 14,
                borderRadius: 14,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                <Text style={{ flex: 1, fontWeight: "700", color: "#111827" }}>
                  {item.boatType || "Unknown boat"}
                </Text>
                <Text style={{ flex: 1, color: "#374151" }}>{distance} km</Text>
                <Text style={{ flex: 1, color: "#374151" }}>{fuel} L</Text>
                <Text style={{ flex: 1, color: "#374151" }}>Rs. {cost}</Text>
              </View>

              <Text style={{ color: "#4b5563", marginBottom: 6 }}>
                Source Trip: {item.sourceTripId}
              </Text>
              <Text style={{ color: "#4b5563", marginBottom: 6 }}>
                Boat ID: {item.boatId}
              </Text>
              <Text style={{ color: "#4b5563", marginBottom: 12 }}>
                Logged:{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "-"}
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#334155",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => setViewingCandidate(item)}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor:
                      processingId === item._id ? "#86efac" : "#22c55e",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  disabled={!!processingId}
                  onPress={() => handleApprove(item._id)}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {processingId === item._id ? "Processing..." : "Approve"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor:
                      processingId === item._id ? "#fca5a5" : "#ef4444",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  disabled={!!processingId}
                  onPress={() => openRejectModal(item._id)}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={!!viewingCandidate}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingCandidate(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 18,
              maxHeight: "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={{ fontSize: 20, fontWeight: "800", marginBottom: 8 }}
              >
                Dataset Details
              </Text>
              {renderDetailRow("Boat type", viewingCandidate?.boatType)}
              {renderDetailRow("Boat ID", viewingCandidate?.boatId)}
              {renderDetailRow("Source trip", viewingCandidate?.sourceTripId)}
              {renderDetailRow("Status", viewingCandidate?.status)}
              {renderDetailRow("Created at", viewingCandidate?.createdAt)}
              {renderSnapshotSection(
                "Feature snapshot",
                viewingCandidate?.featuresSnapshot,
              )}
              {renderSnapshotSection(
                "Label snapshot",
                viewingCandidate?.labelSnapshot,
              )}

              <TouchableOpacity
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#111827",
                  alignItems: "center",
                }}
                onPress={() => setViewingCandidate(null)}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!rejectingId}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{ backgroundColor: "white", borderRadius: 12, padding: 16 }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
              Reject Dataset
            </Text>
            <Text style={{ color: "#4b5563", marginBottom: 10 }}>
              Enter a short reason. This helps maintain training data quality.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              editable={!processingId}
              multiline
              numberOfLines={4}
              placeholder="Example: values look inconsistent with trip conditions"
              style={{
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 8,
                padding: 10,
                minHeight: 90,
                textAlignVertical: "top",
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: "#e5e7eb",
                }}
                disabled={!!processingId}
                onPress={closeRejectModal}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: processingId ? "#fca5a5" : "#ef4444",
                }}
                disabled={!!processingId}
                onPress={handleRejectConfirm}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  {processingId ? "Rejecting..." : "Confirm Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!viewingDatasetFile}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingDatasetFile(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              padding: 14,
              maxHeight: "90%",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
              {viewingDatasetFile}
            </Text>

            {datasetContentLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <ScrollView
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 10,
                  maxHeight: 420,
                }}
                showsVerticalScrollIndicator
              >
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#111827",
                    lineHeight: 18,
                  }}
                >
                  {viewingDatasetContent || "(empty file)"}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                backgroundColor: "#111827",
                alignItems: "center",
              }}
              onPress={() => {
                setViewingDatasetFile(null);
                setViewingDatasetContent("");
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
