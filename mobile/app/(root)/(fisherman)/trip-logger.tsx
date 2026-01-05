import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuthStore from "@/stores/authStore";

export default function TripLogger() {
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tripDate: "",
    departureTime: "",
    returnTime: "",
    destination: "",
    distance: "",
    fuelUsed: "",
    fuelCost: "",
    crewSize: "",
    catchWeight: "",
    catchValue: "",
    notes: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.tripDate ||
      !formData.departureTime ||
      !formData.returnTime ||
      !formData.destination
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      // TODO: Send data to backend API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert("Success", "Trip logged successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setFormData({
              tripDate: "",
              departureTime: "",
              returnTime: "",
              destination: "",
              distance: "",
              fuelUsed: "",
              fuelCost: "",
              crewSize: "",
              catchWeight: "",
              catchValue: "",
              notes: "",
            });
            // Navigate to My Trips
            router.push("/(root)/(fisherman)/my-trips");
          },
        },
      ]);
    } catch (error) {
      console.error("Error logging trip:", error);
      Alert.alert("Error", "Failed to log trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header Card */}
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <Ionicons name="boat" size={40} color="#ffffff" />
            <Text style={styles.headerTitle}>Log Your Fishing Trip</Text>
            <Text style={styles.headerSubtitle}>
              Record trip details for tracking and analysis
            </Text>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Trip Date & Time */}
            <Text style={styles.sectionTitle}>Trip Date & Time</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Trip Date <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.tripDate}
                onChangeText={(value) => handleInputChange("tripDate", value)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Departure Time <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.departureTime}
                  onChangeText={(value) =>
                    handleInputChange("departureTime", value)
                  }
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Return Time <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.returnTime}
                  onChangeText={(value) =>
                    handleInputChange("returnTime", value)
                  }
                />
              </View>
            </View>

            {/* Location & Distance */}
            <Text style={styles.sectionTitle}>Location & Distance</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Destination <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Fishing location"
                value={formData.destination}
                onChangeText={(value) =>
                  handleInputChange("destination", value)
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="Total distance traveled"
                keyboardType="numeric"
                value={formData.distance}
                onChangeText={(value) => handleInputChange("distance", value)}
              />
            </View>

            {/* Fuel & Costs */}
            <Text style={styles.sectionTitle}>Fuel & Costs</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Fuel Used (L)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Liters"
                  keyboardType="numeric"
                  value={formData.fuelUsed}
                  onChangeText={(value) =>
                    handleInputChange("fuelUsed", value)
                  }
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Fuel Cost (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={formData.fuelCost}
                  onChangeText={(value) =>
                    handleInputChange("fuelCost", value)
                  }
                />
              </View>
            </View>

            {/* Crew & Catch */}
            <Text style={styles.sectionTitle}>Crew & Catch</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Crew Size</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of crew members"
                keyboardType="numeric"
                value={formData.crewSize}
                onChangeText={(value) => handleInputChange("crewSize", value)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Catch Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Total kg"
                  keyboardType="numeric"
                  value={formData.catchWeight}
                  onChangeText={(value) =>
                    handleInputChange("catchWeight", value)
                  }
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Catch Value (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={formData.catchValue}
                  onChangeText={(value) =>
                    handleInputChange("catchValue", value)
                  }
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionTitle}>Additional Notes</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional information about the trip..."
                multiline
                numberOfLines={4}
                value={formData.notes}
                onChangeText={(value) => handleInputChange("notes", value)}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ["#9ca3af", "#6b7280"] : ["#3b82f6", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <Ionicons
                  name={loading ? "hourglass-outline" : "checkmark-circle"}
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.submitButtonText}>
                  {loading ? "Logging Trip..." : "Log Trip"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#dbeafe",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
});
