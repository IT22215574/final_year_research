/* eslint-disable prettier/prettier */
import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  time?: number;
  price?: string;
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Ride {
  origin_address: string;
  destination_address: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  ride_time: number;
  fare_price: number;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: {
    first_name: string;
    last_name: string;
    car_seats: number;
  };
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
}

declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: number | null;
  setSelectedDriver: (driverId: number) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: number;
  setSelected: () => void;
}

// ========================================
// Trip Cost Types  start
// ========================================

declare interface Trip {
  _id: string;
  userId: string;
  boatId?: string;
  status?: "planned" | "in-progress" | "completed" | "cancelled";
  
  // Trip Duration
  departureTime?: string | Date;
  returnTime?: string | Date;
  tripDurationHours?: number;
  
  // Travel & Engine
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  distanceKm?: number;
  engineHorsePower?: number;
  engineHP?: number;
  boatType?: string;
  speed?: number;
  averageSpeed?: number;
  crewCount?: number;
  fishingHours?: number;
  numberOfDays?: number;
  mode?: "island" | "international";
  
  // Weather Factors
  windSpeed?: number;
  waveHeight?: number;
  rainMmPerHour?: number;
  weatherCondition?: string;
  
  // Fuel
  fuelUsedLiters?: number;
  fuelPricePerLiter?: number;
  fuelCost?: number;
  
  // Operational Costs
  iceCost?: number;
  crewCost?: number;
  foodCost?: number;
  maintenanceCost?: number;
  otherCost?: number;
  totalCost?: number;

  // DATCIE predicted values
  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedFuelCost?: number;
  predictedCrewCost?: number;
  predictedOperationalCost?: number;
  predictedExternalCostTotal?: number;
  predictedDistanceKm?: number;
  weatherSeverityIndex?: number;
  economicStressIndex?: number;
  profitabilityProbability?: number;
  riskCategory?: string;
  carbonEmissionKg?: number;
  carbonPerKgCatch?: number;
  optimizationRecommendations?: string[];

  // DATCIE actual values
  actualFuelLiters?: number;
  actualCatchKg?: number;
  actualFuelCost?: number;
  actualOperationalCost?: number;
  actualExternalCostTotal?: number;
  actualTotalCost?: number;
  actualRevenue?: number;
  actualProfit?: number;
  actualNotes?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

declare interface CreateTripDto {
  departureTime: string;
  returnTime: string;
  distanceKm?: number;
  engineHorsePower?: number;
  boatType?: string;
  windSpeed?: number;
  waveHeight?: number;
  rainMmPerHour?: number;
  weatherCondition?: string;
  fuelUsedLiters?: number;
  fuelPricePerLiter?: number;
  iceCost?: number;
  crewCost?: number;
  foodCost?: number;
  maintenanceCost?: number;
  otherCost?: number;
}

declare interface TripStats {
  totalTrips: number;
  totalCost?: number;
  averageCost?: number;
  completedTrips?: number;
  predictionsWithActuals?: number;
  fuelAccuracyRate?: number;
  costAccuracyRate?: number;
  averagePredictedCost?: number;
  averageActualCost?: number;
  averageFuelErrorPercent?: number;
  averageCostErrorPercent?: number;
  totalPredictedFuel?: number;
  totalActualFuel?: number;
  totalFuelVariance?: number;
  totalPredictedCost?: number;
  totalActualCost?: number;
  totalCostVariance?: number;
  totalFuelUsed: number;
  totalDistance: number;
}

declare interface MLPrediction {
  predictedFuelLiters?: number;
  predictedCost?: number;
  recommendations?: string[];
  riskScore?: string;
}

// ========================================
// Trip Cost Types  end
// ========================================
