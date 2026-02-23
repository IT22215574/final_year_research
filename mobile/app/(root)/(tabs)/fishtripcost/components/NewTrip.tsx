import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function NewTrip() {
  const [tripName, setTripName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    console.log({
      tripName,
      location,
      date: date.toISOString().split("T")[0], // format YYYY-MM-DD
      notes,
    });
    alert("Trip Saved!");
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // keep open for iOS
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <ScrollView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-bold text-slate-800 mb-6 text-center">
        New Trip
      </Text>

      {/* Trip Name */}
      <Text className="text-slate-700 mb-2">Trip Name</Text>
      <TextInput
        className="border border-slate-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Enter trip name"
        value={tripName}
        onChangeText={setTripName}
      />

      {/* Location */}
      <Text className="text-slate-700 mb-2">Location</Text>
      <TextInput
        className="border border-slate-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Enter location"
        value={location}
        onChangeText={setLocation}
      />

      {/* Date */}
      <Text className="text-slate-700 mb-2">Date</Text>
      <TouchableOpacity
        className="border border-slate-300 rounded-xl px-4 py-3 mb-4"
        onPress={() => setShowDatePicker(true)}
      >
        <Text className="text-slate-800">{date.toDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {/* Notes */}
      <Text className="text-slate-700 mb-2">Notes</Text>
      <TextInput
        className="border border-slate-300 rounded-xl px-4 py-3 mb-6"
        placeholder="Any notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Save Button */}
      <TouchableOpacity
        className="bg-slate-900 py-4 rounded-2xl shadow-md"
        onPress={handleSave}
      >
        <Text className="text-white text-center font-semibold text-base">
          Save Trip
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
