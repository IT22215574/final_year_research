import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { 
  LineChart, 
  BarChart
} from 'react-native-chart-kit';

const Market = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('Today');
  const [marketData, setMarketData] = useState({
    predictions: [],
    dailyPrices: [],
    topSelling: [],
    marketTrends: {
      labels: [],
      datasets: []
    },
    alerts: [],
    weather: {}
  });

  // FIXED: Proper dummy data structure for charts
  const dummyData = {
    predictions: [
      { id: 1, fishType: 'Salmon', predictedPrice: 12.50, confidence: 85, trend: 'up' },
      { id: 2, fishType: 'Tuna', predictedPrice: 18.75, confidence: 72, trend: 'up' },
      { id: 3, fishType: 'Cod', predictedPrice: 8.90, confidence: 65, trend: 'down' },
      { id: 4, fishType: 'Mackerel', predictedPrice: 6.45, confidence: 78, trend: 'up' },
      { id: 5, fishType: 'Sardines', predictedPrice: 4.20, confidence: 92, trend: 'stable' },
    ],
    dailyPrices: [
      { id: 1, fishType: 'Salmon', currentPrice: 12.00, change: '+2.5%', volume: '2.5T' },
      { id: 2, fishType: 'Tuna', currentPrice: 18.00, change: '+1.8%', volume: '1.8T' },
      { id: 3, fishType: 'Cod', currentPrice: 9.20, change: '-0.5%', volume: '3.2T' },
      { id: 4, fishType: 'Mackerel', currentPrice: 6.20, change: '+3.2%', volume: '4.1T' },
      { id: 5, fishType: 'Sardines', currentPrice: 4.10, change: '+0.8%', volume: '5.5T' },
    ],
    topSelling: [
      { id: 1, fishType: 'Mackerel', sales: 4500, color: '#FF6B6B' },
      { id: 2, fishType: 'Sardines', sales: 3800, color: '#4ECDC4' },
      { id: 3, fishType: 'Herring', sales: 3200, color: '#45B7D1' },
      { id: 4, fishType: 'Cod', sales: 2800, color: '#96CEB4' },
      { id: 5, fishType: 'Salmon', sales: 2500, color: '#FFEAA7' },
    ],
    // FIXED: Correct chart data structure
    marketTrends: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [12, 14, 13, 15, 17, 16],
          color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Average Price ($/kg)"]
    },
    barChartData: {
      labels: ['Mack', 'Sard', 'Herr', 'Cod', 'Salm'],
      datasets: [
        {
          data: [4.5, 3.8, 3.2, 2.8, 2.5]
        }
      ],
      legend: ["Sales (Tons)"]
    },
    alerts: [
      { id: 1, type: 'warning', message: 'High demand for Mackerel expected tomorrow', time: '2 hours ago' },
      { id: 2, type: 'success', message: 'Cod prices stabilizing', time: '4 hours ago' },
      { id: 3, type: 'info', message: 'New fishing zone opened in North region', time: '1 day ago' },
    ],
    weather: {
      temperature: 22,
      condition: 'Sunny',
      windSpeed: '12 km/h',
      waveHeight: '1.2m',
      fishingCondition: 'Excellent'
    }
  };

  // FIXED: Proper chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#1a73e8'
    }
  };

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setMarketData(dummyData);
      setLoading(false);
    }, 1000);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadMarketData();
      setRefreshing(false);
    }, 1500);
  }, []);

  const renderPriceTile = (item) => (
    <View key={item.id} style={styles.priceTile}>
      <View style={styles.priceHeader}>
        <Text style={styles.fishType}>{item.fishType}</Text>
        <View style={[
          styles.trendIndicator, 
          { backgroundColor: item.change.includes('+') ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.trendText}>{item.change}</Text>
        </View>
      </View>
      <Text style={styles.price}>${item.currentPrice.toFixed(2)}/kg</Text>
      <Text style={styles.volume}>Volume: {item.volume}</Text>
    </View>
  );

  const renderPredictionTile = (item) => (
    <View key={item.id} style={styles.predictionTile}>
      <View style={styles.predictionHeader}>
        <Text style={styles.predictionFishType}>{item.fishType}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{item.confidence}%</Text>
        </View>
      </View>
      <Text style={styles.predictedPrice}>Predicted: ${item.predictedPrice.toFixed(2)}</Text>
      <View style={styles.trendContainer}>
        <Text style={[
          styles.trendArrow,
          item.trend === 'up' ? styles.trendUp : 
          item.trend === 'down' ? styles.trendDown : 
          styles.trendStable
        ]}>
          {item.trend === 'up' ? '↗' : item.trend === 'down' ? '↘' : '→'}
        </Text>
        <Text style={styles.trendLabel}>
          {item.trend === 'up' ? 'Rising' : item.trend === 'down' ? 'Falling' : 'Stable'}
        </Text>
      </View>
    </View>
  );

  const renderAlertTile = (alert) => (
    <View key={alert.id} style={styles.alertTile}>
      <View style={[
        styles.alertIcon,
        { backgroundColor: 
          alert.type === 'warning' ? '#FFA726' :
          alert.type === 'success' ? '#4CAF50' : '#2196F3'
        }
      ]}>
        <Text style={styles.alertIconText}>
          {alert.type === 'warning' ? '⚠' : alert.type === 'success' ? '✓' : 'i'}
        </Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{alert.time}</Text>
      </View>
    </View>
  );

  // Show loading indicator
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading Market Data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1a73e8']}
            tintColor="#1a73e8"
          />
        }
      >
 

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {['Today', 'Week', 'Month', 'Quarter', 'Year'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Market Predictions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Predictions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {marketData.predictions.map(renderPredictionTile)}
          </ScrollView>
        </View>

        {/* Daily Prices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Fish Prices</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {marketData.dailyPrices.map(renderPriceTile)}
          </ScrollView>
        </View>

        {/* Market Trends Chart - FIXED: Proper data structure */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Market Trends</Text>
          {marketData.marketTrends.labels.length > 0 ? (
            <LineChart
              data={marketData.marketTrends}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={true}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={false}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text>No trend data available</Text>
            </View>
          )}
        </View>

        {/* Top Selling Fish Chart - FIXED: Proper data structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Fish (Tons)</Text>
          {marketData.barChartData?.labels?.length > 0 ? (
            <BarChart
              data={marketData.barChartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero={true}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text>No sales data available</Text>
            </View>
          )}
        </View>

        {/* Weather & Fishing Conditions */}
        <View style={styles.weatherCard}>
          <Text style={styles.sectionTitle}>Fishing Conditions</Text>
          <View style={styles.weatherContent}>
            <View style={styles.weatherInfo}>
              <Text style={styles.temperature}>{marketData.weather?.temperature || '--'}°C</Text>
              <Text style={styles.condition}>{marketData.weather?.condition || '--'}</Text>
              <View style={styles.weatherDetails}>
                <Text style={styles.weatherDetail}>Wind: {marketData.weather?.windSpeed || '--'}</Text>
                <Text style={styles.weatherDetail}>Waves: {marketData.weather?.waveHeight || '--'}</Text>
              </View>
            </View>
            <View style={styles.fishingCondition}>
              <Text style={styles.conditionLabel}>Fishing Condition:</Text>
              <Text style={styles.conditionValue}>{marketData.weather?.fishingCondition || '--'}</Text>
            </View>
          </View>
        </View>

        {/* Market Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {marketData.alerts.map(renderAlertTile)}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📊 Add Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📈 Analyze Trends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🔔 Set Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a73e8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e8f0fe',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#1a73e8',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#1a73e8',
    fontSize: 14,
  },
  horizontalScrollContent: {
    paddingRight: 10,
  },
  priceTile: {
    width: 150,
    padding: 15,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fishType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 5,
  },
  volume: {
    fontSize: 12,
    color: '#666',
  },
  predictionTile: {
    width: 180,
    padding: 15,
    marginRight: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1e3ff',
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  predictionFishType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    backgroundColor: '#34a853',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  predictedPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendArrow: {
    fontSize: 18,
    marginRight: 5,
  },
  trendUp: {
    color: '#34a853',
  },
  trendDown: {
    color: '#ea4335',
  },
  trendStable: {
    color: '#fbbc04',
  },
  trendLabel: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 10,
  },
  chartPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  weatherCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherInfo: {
    flex: 1,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  condition: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  weatherDetails: {
    flexDirection: 'row',
  },
  weatherDetail: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  fishingCondition: {
    backgroundColor: '#e8f0fe',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  alertTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  actionsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 10,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Market;