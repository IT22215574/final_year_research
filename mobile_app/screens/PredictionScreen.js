import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function PredictionScreen() {
  const [fishType, setFishType] = useState('');
  const [market, setMarket] = useState('');
  const [temp, setTemp] = useState('');
  const [rainfall, setRainfall] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [demandIndex, setDemandIndex] = useState('');
  const [predictedPrice, setPredictedPrice] = useState(null);

  const handlePredict = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fish_type: parseFloat(fishType),
          market: parseFloat(market),
          temp: parseFloat(temp),
          rainfall: parseFloat(rainfall),
          fuel_price: parseFloat(fuelPrice),
          demand_index: parseFloat(demandIndex),
        }),
      });

      const data = await response.json();
      if (data.predicted_price) {
        setPredictedPrice(data.predicted_price);
      } else {
        alert(data.error || 'Prediction failed');
      }
    } catch (error) {
      alert('Error connecting to server: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fish Price Prediction</Text>

      <TextInput placeholder="Fish Type" value={fishType} onChangeText={setFishType} style={styles.input} />
      <TextInput placeholder="Market" value={market} onChangeText={setMarket} style={styles.input} />
      <TextInput placeholder="Temperature" value={temp} onChangeText={setTemp} style={styles.input} />
      <TextInput placeholder="Rainfall" value={rainfall} onChangeText={setRainfall} style={styles.input} />
      <TextInput placeholder="Fuel Price" value={fuelPrice} onChangeText={setFuelPrice} style={styles.input} />
      <TextInput placeholder="Demand Index" value={demandIndex} onChangeText={setDemandIndex} style={styles.input} />

      <Button title="Predict Price" onPress={handlePredict} />

      {predictedPrice && (
        <Text style={styles.result}>💰 Predicted Price: Rs. {predictedPrice.toFixed(2)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f8f8f8' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
  result: { marginTop: 20, fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: 'green' },
});
