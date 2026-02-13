import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const FishtripCost = () => {
  return (
    <SafeAreaView style={styles.container}>
     {/*  <View style={styles.header}>
        <Text style={styles.title}>Fishtrip Cost</Text>
      </View>*/}
      
      <View style={styles.content}>
        <Text>Content for Fishtrip Cost details goes here.</Text>
      </View>
    </SafeAreaView>
  );
};

export default FishtripCost;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  content: {
    padding: 20,
  },
});