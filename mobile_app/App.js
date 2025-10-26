import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function App() {
  const [data, setData] = useState(null);

  // API call function
  const fetchData = async () => {
    try {
      const response = await fetch("http://10.61.42.200:5000/predict");
      const json = await response.json();
      setData(json);  // data state එක update කරනවා
      console.log(json);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // component mount වෙලා තත්වයේ API call
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Flask API Data:</Text>
      {data ? (
        <Text>{JSON.stringify(data)}</Text>
      ) : (
        <Text>Loading...</Text>
      )}
      <Button title="Refresh Data" onPress={fetchData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
