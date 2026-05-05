import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import {
  getAdminBoatTypes,
  createAdminBoatType,
  updateAdminBoatType,
  deleteAdminBoatType,
  type AdminBoatType,
} from "@/services/boatService";

const SUPPORTED_MODEL_BOAT_TYPES = [
  {
    code: "IMUI",
    name: "Indigenous Multi-Day Ultra Light",
    description: "Small motorized boats for day and multi-day fishing",
    fuelPerKm: 2.25,
  },
  {
    code: "IDAT",
    name: "Indigenous Day Boats",
    description: "Traditional day fishing vessels",
    fuelPerKm: 2.0,
  },
  {
    code: "OFRP",
    name: "Offshore Fishing Vessel",
    description: "Large offshore fishing trawlers",
    fuelPerKm: 0.62,
  },
  {
    code: "MTRP",
    name: "Multi-day Trawler/Boat",
    description: "Multi-day fishing vessels",
    fuelPerKm: 0.43,
  },
] as const;

type FormState = {
  id?: string;
  supportedCode: string;
  name: string;
  description: string;
  fuelPerKm: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  supportedCode: SUPPORTED_MODEL_BOAT_TYPES[0].code,
  name: "",
  description: "",
  fuelPerKm: "",
  active: true,
};

const getPresetByCode = (code: string) =>
  SUPPORTED_MODEL_BOAT_TYPES.find((item) => item.code === code);

const getPresetByName = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return SUPPORTED_MODEL_BOAT_TYPES.find(
    (item) =>
      item.code.toLowerCase() === normalized ||
      item.name.toLowerCase() === normalized,
  );
};

const createPresetFormState = (code?: string): FormState => {
  const preset =
    getPresetByCode(code || SUPPORTED_MODEL_BOAT_TYPES[0].code) ||
    SUPPORTED_MODEL_BOAT_TYPES[0];

  return {
    id: undefined,
    supportedCode: preset.code,
    name: preset.name,
    description: preset.description,
    fuelPerKm: String(preset.fuelPerKm),
    active: true,
  };
};

export default function BoatTypesAdminScreen() {
  const [items, setItems] = useState<AdminBoatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fetchBoatTypes = async () => {
    try {
      setLoading(true);
      const data = await getAdminBoatTypes();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load boat types");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoatTypes();
  }, []);

  const activeCount = useMemo(
    () => items.filter((x) => x.active).length,
    [items],
  );

  const openCreate = () => {
    setForm(createPresetFormState());
    setModalVisible(true);
  };

  const openEdit = (item: AdminBoatType) => {
    const preset = getPresetByName(item.name);
    setForm({
      id: item._id,
      supportedCode: preset?.code || "",
      name: item.name || "",
      description: item.description || "",
      fuelPerKm:
        typeof item.fuelPerKm === "number" ? String(item.fuelPerKm) : "",
      active: !!item.active,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setForm(EMPTY_FORM);
  };

  const applyPreset = (code: string) => {
    const preset = getPresetByCode(code);
    if (!preset) return;

    setForm((prev) => ({
      ...prev,
      supportedCode: preset.code,
      name: preset.code,
      description: preset.description,
      fuelPerKm: String(preset.fuelPerKm),
    }));
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Validation", "Boat type name is required");
      return;
    }

    const preset = getPresetByName(name);
    if (!preset) {
      Alert.alert(
        "Validation",
        "Select one of the supported model boat types: IMUI, IDAT, OFRP, or MTRP.",
      );
      return;
    }

    const payload: any = {
      name: preset.code,
      description: form.description.trim() || preset.description,
      active: form.active,
    };

    const fuelPerKmRaw = form.fuelPerKm.trim();
    if (fuelPerKmRaw) {
      const value = Number(fuelPerKmRaw);
      if (!Number.isFinite(value) || value <= 0) {
        Alert.alert("Validation", "Fuel per km must be a positive number");
        return;
      }
      payload.fuelPerKm = value;
    } else if (preset.fuelPerKm) {
      payload.fuelPerKm = preset.fuelPerKm;
    }

    try {
      setSaving(true);
      if (form.id) {
        await updateAdminBoatType(form.id, payload);
      } else {
        await createAdminBoatType(payload);
      }
      closeModal();
      await fetchBoatTypes();
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save boat type");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: AdminBoatType) => {
    Alert.alert(
      "Delete Boat Type",
      `Delete ${item.name}? This will fail if boats are already using it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAdminBoatType(item._id);
              await fetchBoatTypes();
            } catch (error: any) {
              Alert.alert(
                "Delete failed",
                error?.message || "Could not delete boat type",
              );
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: AdminBoatType }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.typeName}>{item.name}</Text>
        <Text
          style={[
            styles.badge,
            item.active ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          {item.active ? "ACTIVE" : "INACTIVE"}
        </Text>
      </View>

      {!!item.description && (
        <Text style={styles.detail}>{item.description}</Text>
      )}
      <Text style={styles.detail}>
        Fuel baseline:{" "}
        {typeof item.fuelPerKm === "number" ? `${item.fuelPerKm} L/km` : "N/A"}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Boat Type Governance</Text>
      <Text style={styles.subtitle}>
        Fish admin controls the only boat types fishermen can use.
      </Text>
      <Text style={styles.meta}>
        Total: {items.length} • Active: {activeCount}
      </Text>

      <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
        <Text style={styles.createBtnText}>+ Add Boat Type</Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        Supported model types: IMUI, IDAT, OFRP, MTRP
      </Text>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchBoatTypes}>
        <Text style={styles.refreshText}>
          {loading ? "Refreshing..." : "Refresh"}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#005CFF"
          style={{ marginTop: 50 }}
        />
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>No boat types configured yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {form.id ? "Edit Boat Type" : "Add Boat Type"}
            </Text>

            <Text style={styles.inputLabel}>Model supported presets</Text>
            <View style={styles.presetWrap}>
              {SUPPORTED_MODEL_BOAT_TYPES.map((preset) => {
                const selected = form.supportedCode === preset.code;
                return (
                  <TouchableOpacity
                    key={preset.code}
                    style={[
                      styles.presetChip,
                      selected && styles.presetChipSelected,
                    ]}
                    onPress={() => applyPreset(preset.code)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.presetCode,
                        selected && styles.presetCodeSelected,
                      ]}
                    >
                      {preset.code}
                    </Text>
                    <Text
                      style={[
                        styles.presetName,
                        selected && styles.presetNameSelected,
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Select a supported model type"
              style={styles.input}
              autoCapitalize="characters"
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Boat category description"
              style={[
                styles.input,
                { minHeight: 70, textAlignVertical: "top" },
              ]}
              multiline
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Fuel per km (optional)</Text>
            <TextInput
              value={form.fuelPerKm}
              onChangeText={(v) => setForm((p) => ({ ...p, fuelPerKm: v }))}
              placeholder="e.g., 1.25"
              style={styles.input}
              keyboardType="decimal-pad"
              editable={!saving}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.inputLabel}>Active</Text>
              <Switch
                value={form.active}
                onValueChange={(v) => setForm((p) => ({ ...p, active: v }))}
                disabled={saving}
              />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 6 },
  meta: { fontSize: 13, color: "#374151", marginBottom: 12 },
  createBtn: {
    backgroundColor: "#005CFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  createBtnText: { color: "white", fontWeight: "700" },
  refreshBtn: { alignSelf: "flex-end", marginBottom: 10 },
  refreshText: { color: "#2563eb", fontWeight: "600" },
  helperText: {
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  emptyText: { textAlign: "center", color: "#888", marginTop: 50 },
  card: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  badge: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: { backgroundColor: "#16a34a" },
  badgeInactive: { backgroundColor: "#9ca3af" },
  detail: { marginTop: 6, color: "#4b5563" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  editBtn: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  actionText: { color: "white", fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    padding: 10,
  },
  presetChipSelected: {
    borderColor: "#005CFF",
    backgroundColor: "#eaf1ff",
  },
  presetCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  presetCodeSelected: {
    color: "#005CFF",
  },
  presetName: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
  presetNameSelected: {
    color: "#1d4ed8",
  },
  inputLabel: {
    color: "#374151",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: { color: "#111827", fontWeight: "700" },
  saveText: { color: "white", fontWeight: "700" },
});
