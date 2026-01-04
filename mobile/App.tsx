import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import PredictionsScreen from './src/screens/PredictionsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }: any) => ({
          tabBarIcon: ({ focused, color, size }: any) => {
            let iconName: any = 'home';
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Predictions') {
              iconName = focused ? 'chart-line' : 'chart-line';
            } else if (route.name === 'History') {
              iconName = focused ? 'history' : 'history';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'cog' : 'cog-outline';
            }
            return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2E86AB',
          tabBarInactiveTintColor: '#999',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2E86AB',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'මුල් පිටුව' }}
        />
        <Tab.Screen
          name="Predictions"
          component={PredictionsScreen}
          options={{ title: 'පුරෝකථන' }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'ඉතිහාසය' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'සැකසුම්' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;
