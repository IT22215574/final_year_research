/**
 * Bulk Trip Import Utility
 *
 * This script helps import sample trip data into the system for testing
 * and machine learning training purposes.
 *
 * Usage:
 *   1. Ensure backend and ML service are running
 *   2. Configure boat IDs below (see CONFIGURATION section)
 *   3. Set AUTH_TOKEN: $env:AUTH_TOKEN="your-token"
 *   4. Run: npx ts-node src/trips/utils/bulk-import-trips.ts --with-actuals
 */

import axios from 'axios';
import {
  transformSampleToPayload,
  extractActualData,
} from './sample-trip-transformer';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

// ============================================================================
// CONFIGURATION - Choose one option:
// ============================================================================

// OPTION A: Use ONE boat ID for all trips (easiest for testing)
// Get a boat ID: curl http://localhost:5000/api/v1/boat -H "Authorization: Bearer YOUR_TOKEN"
const USE_SINGLE_BOAT = true;
const SINGLE_BOAT_ID = '69ad7cc8129027e9d0a885ff'; // ← Configured for shaluka@gmail.com

// OPTION B: Map each boat name to a specific boat ID (for realistic scenarios)
const BOAT_ID_MAP: Record<string, string> = {
  'Deep Sea Hunter': 'boat_id_1',
  'Chilaw Queen': 'boat_id_2',
  'Lanka Fisher 7': 'boat_id_3',
  'Sea Breeze Express': 'boat_id_4',
  'Blue Horizon 3': 'boat_id_5',
  'Pearl Diver': 'boat_id_6',
  'Tuna Master': 'boat_id_7',
  'Rapid Catch': 'boat_id_8',
  'Golden Wave 5': 'boat_id_9',
  'Southern Star': 'boat_id_10',
  'Coral Reef II': 'boat_id_11',
  'King Fisher X': 'boat_id_12',
  'Marina Pride': 'boat_id_13',
  'Sunrise Voyager': 'boat_id_14',
  'Lagoon Hunter': 'boat_id_15',
  'Deep Blue Explorer': 'boat_id_16',
  'Coastal Runner': 'boat_id_17',
  'Tropic Fish': 'boat_id_18',
  'Ocean Quest': 'boat_id_19',
  'Island Hopper': 'boat_id_20',
  'Net Master': 'boat_id_21',
  'Silver Fin': 'boat_id_22',
  'Morning Glory': 'boat_id_23',
  'Wave Rider': 'boat_id_24',
  'Pacific Dream': 'boat_id_25',
  'Harbor Light': 'boat_id_26',
  'Reef Explorer': 'boat_id_27',
  'Sea Monarch': 'boat_id_28',
  'Storm Chaser': 'boat_id_29',
  'Emerald Sea': 'boat_id_30',
  'Dawn Patrol': 'boat_id_31',
  'Lagoon Breeze': 'boat_id_32',
  'Atlantic Hope': 'boat_id_33',
  'Bay Runner': 'boat_id_34',
  'Shoreline Pro': 'boat_id_35',
  'Deep Venture': 'boat_id_36',
  'Reef Runner': 'boat_id_37',
  'Net Weaver': 'boat_id_38',
  // Add remaining boats as needed...
};

// ============================================================================

// Sample trips from your data (41 real fishing trips)
const SAMPLE_TRIPS = [
  {
    boatSpec: {
      boatName: 'Deep Sea Hunter',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 180,
      boatLength: 18.5,
      boatWidth: 4.2,
      boatValue: 6800000,
      fuelEfficiencyFactor: 0.85,
      engineDegradationFactor: 1.18,
      averageFuelPredictionError: 0.14,
      fuelTankCapacityLiters: 1200,
      maxCrewCapacity: 10,
    },
    tripParameters: {
      boatId: 'boat_004',
      distanceKm: 120.4,
      averageSpeedKmh: 9.5,
      fishingHours: 24.0,
      crewSize: 9,
      fuelPricePerLiter: 301,
      expectedFishPricePerKg: 610,
      expectedCatchKg: 420,
      predictedCatchKg: 435,
    },
    weather: {
      windSpeedKmh: 22.1,
      waveHeightMeters: 1.8,
      rainLevel: 0.6,
    },
    externalCosts: {
      iceCost: 12000,
      baitCost: 5800,
      crewFoodCost: 5200,
      portFee: 2200,
      gearMaintenanceCost: 3500,
      miscellaneousCost: 1800,
    },
  },
  {
    boatSpec: {
      boatName: 'Chilaw Queen',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 95,
      boatLength: 12.8,
      boatWidth: 3.5,
      boatValue: 3200000,
      fuelEfficiencyFactor: 0.98,
      engineDegradationFactor: 1.08,
      averageFuelPredictionError: 0.09,
      fuelTankCapacityLiters: 600,
      maxCrewCapacity: 7,
    },
    tripParameters: {
      boatId: 'boat_005',
      distanceKm: 65.2,
      averageSpeedKmh: 11.8,
      fishingHours: 14.3,
      crewSize: 5,
      fuelPricePerLiter: 289,
      expectedFishPricePerKg: 480,
      expectedCatchKg: 165,
      predictedCatchKg: 172,
    },
    weather: {
      windSpeedKmh: 12.3,
      waveHeightMeters: 0.9,
      rainLevel: 0.2,
    },
    externalCosts: {
      iceCost: 6200,
      baitCost: 3100,
      crewFoodCost: 2800,
      portFee: 1300,
      gearMaintenanceCost: 1900,
      miscellaneousCost: 900,
    },
  },
  {
    boatSpec: {
      boatName: 'Lanka Fisher 7',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 52,
      boatLength: 9.2,
      boatWidth: 2.6,
      boatValue: 1480000,
      fuelEfficiencyFactor: 1.02,
      engineDegradationFactor: 1.15,
      averageFuelPredictionError: 0.07,
      fuelTankCapacityLiters: 220,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_006',
      distanceKm: 32.1,
      averageSpeedKmh: 13.1,
      fishingHours: 7.1,
      crewSize: 3,
      fuelPricePerLiter: 284,
      expectedFishPricePerKg: 410,
      expectedCatchKg: 38,
      predictedCatchKg: 40,
    },
    weather: {
      windSpeedKmh: 9.5,
      waveHeightMeters: 0.7,
      rainLevel: 0.15,
    },
    externalCosts: {
      iceCost: 2800,
      baitCost: 2000,
      crewFoodCost: 1400,
      portFee: 900,
      gearMaintenanceCost: 1000,
      miscellaneousCost: 600,
    },
  },
  {
    boatSpec: {
      boatName: 'Sea Breeze Express',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 28,
      boatLength: 6.8,
      boatWidth: 2.0,
      boatValue: 720000,
      fuelEfficiencyFactor: 1.2,
      engineDegradationFactor: 0.92,
      averageFuelPredictionError: 0.04,
      fuelTankCapacityLiters: 120,
      maxCrewCapacity: 2,
    },
    tripParameters: {
      boatId: 'boat_007',
      distanceKm: 15.6,
      averageSpeedKmh: 10.9,
      fishingHours: 4.9,
      crewSize: 2,
      fuelPricePerLiter: 276,
      expectedFishPricePerKg: 360,
      expectedCatchKg: 30,
      predictedCatchKg: 32,
    },
    weather: {
      windSpeedKmh: 5.8,
      waveHeightMeters: 0.3,
      rainLevel: 0.05,
    },
    externalCosts: {
      iceCost: 1400,
      baitCost: 900,
      crewFoodCost: 600,
      portFee: 500,
      gearMaintenanceCost: 600,
      miscellaneousCost: 300,
    },
  },
  {
    boatSpec: {
      boatName: 'Blue Horizon 3',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 135,
      boatLength: 15.1,
      boatWidth: 4.0,
      boatValue: 5100000,
      fuelEfficiencyFactor: 0.88,
      engineDegradationFactor: 1.22,
      averageFuelPredictionError: 0.11,
      fuelTankCapacityLiters: 950,
      maxCrewCapacity: 9,
    },
    tripParameters: {
      boatId: 'boat_008',
      distanceKm: 95.8,
      averageSpeedKmh: 9.2,
      fishingHours: 20.4,
      crewSize: 7,
      fuelPricePerLiter: 297,
      expectedFishPricePerKg: 550,
      expectedCatchKg: 340,
      predictedCatchKg: 355,
    },
    weather: {
      windSpeedKmh: 18.7,
      waveHeightMeters: 1.5,
      rainLevel: 0.4,
    },
    externalCosts: {
      iceCost: 9500,
      baitCost: 4500,
      crewFoodCost: 4000,
      portFee: 1700,
      gearMaintenanceCost: 2600,
      miscellaneousCost: 1400,
    },
  },
  {
    boatSpec: {
      boatName: 'Pearl Diver',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 40,
      boatLength: 8.0,
      boatWidth: 2.3,
      boatValue: 1100000,
      fuelEfficiencyFactor: 1.1,
      engineDegradationFactor: 1.05,
      averageFuelPredictionError: 0.06,
      fuelTankCapacityLiters: 180,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_009',
      distanceKm: 22.4,
      averageSpeedKmh: 12.0,
      fishingHours: 5.5,
      crewSize: 3,
      fuelPricePerLiter: 281,
      expectedFishPricePerKg: 420,
      expectedCatchKg: 34,
      predictedCatchKg: 36,
    },
    weather: {
      windSpeedKmh: 7.9,
      waveHeightMeters: 0.5,
      rainLevel: 0.08,
    },
    externalCosts: {
      iceCost: 2200,
      baitCost: 1600,
      crewFoodCost: 1100,
      portFee: 700,
      gearMaintenanceCost: 800,
      miscellaneousCost: 450,
    },
  },
  {
    boatSpec: {
      boatName: 'Tuna Master',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 110,
      boatLength: 13.6,
      boatWidth: 3.7,
      boatValue: 3800000,
      fuelEfficiencyFactor: 0.94,
      engineDegradationFactor: 1.14,
      averageFuelPredictionError: 0.1,
      fuelTankCapacityLiters: 700,
      maxCrewCapacity: 6,
    },
    tripParameters: {
      boatId: 'boat_010',
      distanceKm: 72.6,
      averageSpeedKmh: 10.5,
      fishingHours: 16.2,
      crewSize: 5,
      fuelPricePerLiter: 295,
      expectedFishPricePerKg: 590,
      expectedCatchKg: 195,
      predictedCatchKg: 205,
    },
    weather: {
      windSpeedKmh: 14.2,
      waveHeightMeters: 1.1,
      rainLevel: 0.25,
    },
    externalCosts: {
      iceCost: 7200,
      baitCost: 3500,
      crewFoodCost: 3100,
      portFee: 1400,
      gearMaintenanceCost: 2100,
      miscellaneousCost: 1000,
    },
  },
  {
    boatSpec: {
      boatName: 'Rapid Catch',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 32,
      boatLength: 7.4,
      boatWidth: 2.2,
      boatValue: 920000,
      fuelEfficiencyFactor: 1.15,
      engineDegradationFactor: 0.98,
      averageFuelPredictionError: 0.045,
      fuelTankCapacityLiters: 140,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_011',
      distanceKm: 20.8,
      averageSpeedKmh: 11.5,
      fishingHours: 6.0,
      crewSize: 2,
      fuelPricePerLiter: 279,
      expectedFishPricePerKg: 390,
      expectedCatchKg: 32,
      predictedCatchKg: 34,
    },
    weather: {
      windSpeedKmh: 10.1,
      waveHeightMeters: 0.8,
      rainLevel: 0.12,
    },
    externalCosts: {
      iceCost: 1900,
      baitCost: 1300,
      crewFoodCost: 900,
      portFee: 650,
      gearMaintenanceCost: 750,
      miscellaneousCost: 450,
    },
  },
  {
    boatSpec: {
      boatName: 'Golden Wave 5',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 48,
      boatLength: 8.9,
      boatWidth: 2.5,
      boatValue: 1350000,
      fuelEfficiencyFactor: 1.08,
      engineDegradationFactor: 1.1,
      averageFuelPredictionError: 0.07,
      fuelTankCapacityLiters: 210,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_012',
      distanceKm: 28.5,
      averageSpeedKmh: 12.8,
      fishingHours: 6.8,
      crewSize: 3,
      fuelPricePerLiter: 287,
      expectedFishPricePerKg: 460,
      expectedCatchKg: 36,
      predictedCatchKg: 39,
    },
    weather: {
      windSpeedKmh: 11.3,
      waveHeightMeters: 0.7,
      rainLevel: 0.18,
    },
    externalCosts: {
      iceCost: 2600,
      baitCost: 1900,
      crewFoodCost: 1300,
      portFee: 850,
      gearMaintenanceCost: 950,
      miscellaneousCost: 550,
    },
  },
  {
    boatSpec: {
      boatName: 'Southern Star',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 142,
      boatLength: 15.8,
      boatWidth: 4.1,
      boatValue: 5200000,
      fuelEfficiencyFactor: 0.9,
      engineDegradationFactor: 1.2,
      averageFuelPredictionError: 0.13,
      fuelTankCapacityLiters: 1000,
      maxCrewCapacity: 9,
    },
    tripParameters: {
      boatId: 'boat_013',
      distanceKm: 102.3,
      averageSpeedKmh: 9.8,
      fishingHours: 22.1,
      crewSize: 8,
      fuelPricePerLiter: 298,
      expectedFishPricePerKg: 540,
      expectedCatchKg: 360,
      predictedCatchKg: 375,
    },
    weather: {
      windSpeedKmh: 20.5,
      waveHeightMeters: 1.6,
      rainLevel: 0.45,
    },
    externalCosts: {
      iceCost: 9800,
      baitCost: 4800,
      crewFoodCost: 4500,
      portFee: 1800,
      gearMaintenanceCost: 2800,
      miscellaneousCost: 1500,
    },
  },
  {
    boatSpec: {
      boatName: 'Coral Reef II',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 30,
      boatLength: 7.0,
      boatWidth: 2.1,
      boatValue: 780000,
      fuelEfficiencyFactor: 1.22,
      engineDegradationFactor: 0.94,
      averageFuelPredictionError: 0.04,
      fuelTankCapacityLiters: 130,
      maxCrewCapacity: 2,
    },
    tripParameters: {
      boatId: 'boat_014',
      distanceKm: 17.2,
      averageSpeedKmh: 10.7,
      fishingHours: 5.2,
      crewSize: 2,
      fuelPricePerLiter: 277,
      expectedFishPricePerKg: 370,
      expectedCatchKg: 30,
      predictedCatchKg: 32,
    },
    weather: {
      windSpeedKmh: 6.4,
      waveHeightMeters: 0.4,
      rainLevel: 0.07,
    },
    externalCosts: {
      iceCost: 1600,
      baitCost: 1100,
      crewFoodCost: 700,
      portFee: 550,
      gearMaintenanceCost: 650,
      miscellaneousCost: 350,
    },
  },
  {
    boatSpec: {
      boatName: 'King Fisher X',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 165,
      boatLength: 17.2,
      boatWidth: 4.0,
      boatValue: 6200000,
      fuelEfficiencyFactor: 0.87,
      engineDegradationFactor: 1.16,
      averageFuelPredictionError: 0.13,
      fuelTankCapacityLiters: 1100,
      maxCrewCapacity: 10,
    },
    tripParameters: {
      boatId: 'boat_015',
      distanceKm: 115.6,
      averageSpeedKmh: 9.3,
      fishingHours: 23.5,
      crewSize: 9,
      fuelPricePerLiter: 302,
      expectedFishPricePerKg: 620,
      expectedCatchKg: 410,
      predictedCatchKg: 425,
    },
    weather: {
      windSpeedKmh: 24.8,
      waveHeightMeters: 2.0,
      rainLevel: 0.65,
    },
    externalCosts: {
      iceCost: 11500,
      baitCost: 5500,
      crewFoodCost: 4800,
      portFee: 2100,
      gearMaintenanceCost: 3300,
      miscellaneousCost: 1700,
    },
  },
  {
    boatSpec: {
      boatName: 'Marina Pride',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 105,
      boatLength: 13.2,
      boatWidth: 3.6,
      boatValue: 3500000,
      fuelEfficiencyFactor: 0.96,
      engineDegradationFactor: 1.09,
      averageFuelPredictionError: 0.095,
      fuelTankCapacityLiters: 650,
      maxCrewCapacity: 7,
    },
    tripParameters: {
      boatId: 'boat_016',
      distanceKm: 68.9,
      averageSpeedKmh: 11.2,
      fishingHours: 15.1,
      crewSize: 5,
      fuelPricePerLiter: 290,
      expectedFishPricePerKg: 500,
      expectedCatchKg: 175,
      predictedCatchKg: 182,
    },
    weather: {
      windSpeedKmh: 13.7,
      waveHeightMeters: 1.0,
      rainLevel: 0.22,
    },
    externalCosts: {
      iceCost: 6500,
      baitCost: 3200,
      crewFoodCost: 2900,
      portFee: 1350,
      gearMaintenanceCost: 2000,
      miscellaneousCost: 950,
    },
  },
  {
    boatSpec: {
      boatName: 'Sunrise Voyager',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 42,
      boatLength: 8.3,
      boatWidth: 2.4,
      boatValue: 1180000,
      fuelEfficiencyFactor: 1.07,
      engineDegradationFactor: 1.11,
      averageFuelPredictionError: 0.065,
      fuelTankCapacityLiters: 190,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_017',
      distanceKm: 24.7,
      averageSpeedKmh: 12.3,
      fishingHours: 6.4,
      crewSize: 3,
      fuelPricePerLiter: 283,
      expectedFishPricePerKg: 440,
      expectedCatchKg: 35,
      predictedCatchKg: 37,
    },
    weather: {
      windSpeedKmh: 9.2,
      waveHeightMeters: 0.65,
      rainLevel: 0.11,
    },
    externalCosts: {
      iceCost: 2400,
      baitCost: 1700,
      crewFoodCost: 1200,
      portFee: 750,
      gearMaintenanceCost: 850,
      miscellaneousCost: 500,
    },
  },
  {
    boatSpec: {
      boatName: 'Lagoon Hunter',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 34,
      boatLength: 7.6,
      boatWidth: 2.3,
      boatValue: 950000,
      fuelEfficiencyFactor: 1.16,
      engineDegradationFactor: 0.97,
      averageFuelPredictionError: 0.05,
      fuelTankCapacityLiters: 155,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_018',
      distanceKm: 21.4,
      averageSpeedKmh: 11.7,
      fishingHours: 6.1,
      crewSize: 2,
      fuelPricePerLiter: 280,
      expectedFishPricePerKg: 395,
      expectedCatchKg: 33,
      predictedCatchKg: 35,
    },
    weather: {
      windSpeedKmh: 8.9,
      waveHeightMeters: 0.55,
      rainLevel: 0.09,
    },
    externalCosts: {
      iceCost: 2000,
      baitCost: 1400,
      crewFoodCost: 950,
      portFee: 650,
      gearMaintenanceCost: 800,
      miscellaneousCost: 400,
    },
  },
  {
    boatSpec: {
      boatName: 'Deep Blue Explorer',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 128,
      boatLength: 14.5,
      boatWidth: 3.9,
      boatValue: 4700000,
      fuelEfficiencyFactor: 0.91,
      engineDegradationFactor: 1.23,
      averageFuelPredictionError: 0.115,
      fuelTankCapacityLiters: 850,
      maxCrewCapacity: 8,
    },
    tripParameters: {
      boatId: 'boat_019',
      distanceKm: 88.2,
      averageSpeedKmh: 10.2,
      fishingHours: 19.3,
      crewSize: 6,
      fuelPricePerLiter: 294,
      expectedFishPricePerKg: 530,
      expectedCatchKg: 345,
      predictedCatchKg: 360,
    },
    weather: {
      windSpeedKmh: 16.8,
      waveHeightMeters: 1.3,
      rainLevel: 0.35,
    },
    externalCosts: {
      iceCost: 8800,
      baitCost: 4300,
      crewFoodCost: 3800,
      portFee: 1600,
      gearMaintenanceCost: 2500,
      miscellaneousCost: 1300,
    },
  },
  {
    boatSpec: {
      boatName: 'Coastal Runner',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 50,
      boatLength: 9.0,
      boatWidth: 2.6,
      boatValue: 1420000,
      fuelEfficiencyFactor: 1.03,
      engineDegradationFactor: 1.13,
      averageFuelPredictionError: 0.075,
      fuelTankCapacityLiters: 225,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_020',
      distanceKm: 30.1,
      averageSpeedKmh: 13.0,
      fishingHours: 7.0,
      crewSize: 3,
      fuelPricePerLiter: 286,
      expectedFishPricePerKg: 415,
      expectedCatchKg: 37,
      predictedCatchKg: 39,
    },
    weather: {
      windSpeedKmh: 10.6,
      waveHeightMeters: 0.75,
      rainLevel: 0.16,
    },
    externalCosts: {
      iceCost: 2700,
      baitCost: 1950,
      crewFoodCost: 1350,
      portFee: 900,
      gearMaintenanceCost: 1050,
      miscellaneousCost: 600,
    },
  },
  {
    boatSpec: {
      boatName: 'Tropic Fish',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 29,
      boatLength: 6.9,
      boatWidth: 2.0,
      boatValue: 740000,
      fuelEfficiencyFactor: 1.21,
      engineDegradationFactor: 0.93,
      averageFuelPredictionError: 0.035,
      fuelTankCapacityLiters: 125,
      maxCrewCapacity: 2,
    },
    tripParameters: {
      boatId: 'boat_021',
      distanceKm: 16.5,
      averageSpeedKmh: 10.8,
      fishingHours: 5.0,
      crewSize: 2,
      fuelPricePerLiter: 275,
      expectedFishPricePerKg: 365,
      expectedCatchKg: 31,
      predictedCatchKg: 33,
    },
    weather: {
      windSpeedKmh: 7.1,
      waveHeightMeters: 0.35,
      rainLevel: 0.06,
    },
    externalCosts: {
      iceCost: 1500,
      baitCost: 1000,
      crewFoodCost: 650,
      portFee: 500,
      gearMaintenanceCost: 600,
      miscellaneousCost: 300,
    },
  },
  {
    boatSpec: {
      boatName: 'Ocean Quest',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 138,
      boatLength: 15.4,
      boatWidth: 4.0,
      boatValue: 5400000,
      fuelEfficiencyFactor: 0.89,
      engineDegradationFactor: 1.21,
      averageFuelPredictionError: 0.12,
      fuelTankCapacityLiters: 920,
      maxCrewCapacity: 9,
    },
    tripParameters: {
      boatId: 'boat_022',
      distanceKm: 98.7,
      averageSpeedKmh: 9.5,
      fishingHours: 21.2,
      crewSize: 7,
      fuelPricePerLiter: 296,
      expectedFishPricePerKg: 560,
      expectedCatchKg: 355,
      predictedCatchKg: 370,
    },
    weather: {
      windSpeedKmh: 19.2,
      waveHeightMeters: 1.55,
      rainLevel: 0.42,
    },
    externalCosts: {
      iceCost: 9600,
      baitCost: 4600,
      crewFoodCost: 4200,
      portFee: 1750,
      gearMaintenanceCost: 2700,
      miscellaneousCost: 1450,
    },
  },
  {
    boatSpec: {
      boatName: 'Island Hopper',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 46,
      boatLength: 8.7,
      boatWidth: 2.5,
      boatValue: 1300000,
      fuelEfficiencyFactor: 1.06,
      engineDegradationFactor: 1.09,
      averageFuelPredictionError: 0.068,
      fuelTankCapacityLiters: 205,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_023',
      distanceKm: 26.9,
      averageSpeedKmh: 12.6,
      fishingHours: 6.5,
      crewSize: 3,
      fuelPricePerLiter: 282,
      expectedFishPricePerKg: 445,
      expectedCatchKg: 36,
      predictedCatchKg: 38,
    },
    weather: {
      windSpeedKmh: 8.5,
      waveHeightMeters: 0.6,
      rainLevel: 0.1,
    },
    externalCosts: {
      iceCost: 2550,
      baitCost: 1850,
      crewFoodCost: 1250,
      portFee: 800,
      gearMaintenanceCost: 900,
      miscellaneousCost: 525,
    },
  },
  {
    boatSpec: {
      boatName: 'Net Master',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 172,
      boatLength: 18.0,
      boatWidth: 4.3,
      boatValue: 6500000,
      fuelEfficiencyFactor: 0.86,
      engineDegradationFactor: 1.19,
      averageFuelPredictionError: 0.145,
      fuelTankCapacityLiters: 1180,
      maxCrewCapacity: 10,
    },
    tripParameters: {
      boatId: 'boat_024',
      distanceKm: 125.8,
      averageSpeedKmh: 9.4,
      fishingHours: 24.5,
      crewSize: 9,
      fuelPricePerLiter: 300,
      expectedFishPricePerKg: 605,
      expectedCatchKg: 425,
      predictedCatchKg: 440,
    },
    weather: {
      windSpeedKmh: 23.4,
      waveHeightMeters: 1.9,
      rainLevel: 0.62,
    },
    externalCosts: {
      iceCost: 12200,
      baitCost: 5900,
      crewFoodCost: 5300,
      portFee: 2250,
      gearMaintenanceCost: 3600,
      miscellaneousCost: 1850,
    },
  },
  {
    boatSpec: {
      boatName: 'Silver Fin',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 98,
      boatLength: 12.5,
      boatWidth: 3.4,
      boatValue: 3100000,
      fuelEfficiencyFactor: 0.99,
      engineDegradationFactor: 1.07,
      averageFuelPredictionError: 0.085,
      fuelTankCapacityLiters: 580,
      maxCrewCapacity: 6,
    },
    tripParameters: {
      boatId: 'boat_025',
      distanceKm: 62.4,
      averageSpeedKmh: 11.5,
      fishingHours: 13.8,
      crewSize: 5,
      fuelPricePerLiter: 288,
      expectedFishPricePerKg: 475,
      expectedCatchKg: 160,
      predictedCatchKg: 167,
    },
    weather: {
      windSpeedKmh: 11.8,
      waveHeightMeters: 0.85,
      rainLevel: 0.19,
    },
    externalCosts: {
      iceCost: 6000,
      baitCost: 3000,
      crewFoodCost: 2700,
      portFee: 1250,
      gearMaintenanceCost: 1800,
      miscellaneousCost: 850,
    },
  },
  {
    boatSpec: {
      boatName: 'Morning Glory',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 44,
      boatLength: 8.4,
      boatWidth: 2.4,
      boatValue: 1220000,
      fuelEfficiencyFactor: 1.09,
      engineDegradationFactor: 1.06,
      averageFuelPredictionError: 0.062,
      fuelTankCapacityLiters: 195,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_026',
      distanceKm: 23.8,
      averageSpeedKmh: 12.1,
      fishingHours: 6.0,
      crewSize: 3,
      fuelPricePerLiter: 284,
      expectedFishPricePerKg: 430,
      expectedCatchKg: 34,
      predictedCatchKg: 36,
    },
    weather: {
      windSpeedKmh: 7.6,
      waveHeightMeters: 0.5,
      rainLevel: 0.08,
    },
    externalCosts: {
      iceCost: 2300,
      baitCost: 1650,
      crewFoodCost: 1150,
      portFee: 720,
      gearMaintenanceCost: 820,
      miscellaneousCost: 480,
    },
  },
  {
    boatSpec: {
      boatName: 'Wave Rider',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 36,
      boatLength: 7.8,
      boatWidth: 2.3,
      boatValue: 980000,
      fuelEfficiencyFactor: 1.14,
      engineDegradationFactor: 0.96,
      averageFuelPredictionError: 0.048,
      fuelTankCapacityLiters: 160,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_027',
      distanceKm: 22.1,
      averageSpeedKmh: 11.9,
      fishingHours: 6.3,
      crewSize: 2,
      fuelPricePerLiter: 278,
      expectedFishPricePerKg: 385,
      expectedCatchKg: 33,
      predictedCatchKg: 35,
    },
    weather: {
      windSpeedKmh: 9.8,
      waveHeightMeters: 0.7,
      rainLevel: 0.14,
    },
    externalCosts: {
      iceCost: 2100,
      baitCost: 1450,
      crewFoodCost: 1000,
      portFee: 680,
      gearMaintenanceCost: 780,
      miscellaneousCost: 420,
    },
  },
  {
    boatSpec: {
      boatName: 'Pacific Dream',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 130,
      boatLength: 14.8,
      boatWidth: 3.8,
      boatValue: 4800000,
      fuelEfficiencyFactor: 0.93,
      engineDegradationFactor: 1.24,
      averageFuelPredictionError: 0.118,
      fuelTankCapacityLiters: 870,
      maxCrewCapacity: 8,
    },
    tripParameters: {
      boatId: 'boat_028',
      distanceKm: 91.5,
      averageSpeedKmh: 10.1,
      fishingHours: 19.8,
      crewSize: 6,
      fuelPricePerLiter: 293,
      expectedFishPricePerKg: 545,
      expectedCatchKg: 350,
      predictedCatchKg: 365,
    },
    weather: {
      windSpeedKmh: 17.3,
      waveHeightMeters: 1.4,
      rainLevel: 0.38,
    },
    externalCosts: {
      iceCost: 9000,
      baitCost: 4400,
      crewFoodCost: 3900,
      portFee: 1650,
      gearMaintenanceCost: 2550,
      miscellaneousCost: 1350,
    },
  },
  {
    boatSpec: {
      boatName: 'Harbor Light',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 47,
      boatLength: 8.8,
      boatWidth: 2.5,
      boatValue: 1380000,
      fuelEfficiencyFactor: 1.04,
      engineDegradationFactor: 1.14,
      averageFuelPredictionError: 0.072,
      fuelTankCapacityLiters: 215,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_029',
      distanceKm: 29.3,
      averageSpeedKmh: 12.9,
      fishingHours: 6.9,
      crewSize: 3,
      fuelPricePerLiter: 285,
      expectedFishPricePerKg: 455,
      expectedCatchKg: 37,
      predictedCatchKg: 39,
    },
    weather: {
      windSpeedKmh: 10.2,
      waveHeightMeters: 0.72,
      rainLevel: 0.17,
    },
    externalCosts: {
      iceCost: 2650,
      baitCost: 1920,
      crewFoodCost: 1320,
      portFee: 880,
      gearMaintenanceCost: 980,
      miscellaneousCost: 580,
    },
  },
  {
    boatSpec: {
      boatName: 'Reef Explorer',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 31,
      boatLength: 7.2,
      boatWidth: 2.2,
      boatValue: 820000,
      fuelEfficiencyFactor: 1.19,
      engineDegradationFactor: 0.95,
      averageFuelPredictionError: 0.042,
      fuelTankCapacityLiters: 135,
      maxCrewCapacity: 2,
    },
    tripParameters: {
      boatId: 'boat_030',
      distanceKm: 19.2,
      averageSpeedKmh: 11.3,
      fishingHours: 5.7,
      crewSize: 2,
      fuelPricePerLiter: 276,
      expectedFishPricePerKg: 375,
      expectedCatchKg: 31,
      predictedCatchKg: 33,
    },
    weather: {
      windSpeedKmh: 6.9,
      waveHeightMeters: 0.45,
      rainLevel: 0.04,
    },
    externalCosts: {
      iceCost: 1750,
      baitCost: 1200,
      crewFoodCost: 800,
      portFee: 580,
      gearMaintenanceCost: 680,
      miscellaneousCost: 380,
    },
  },
  {
    boatSpec: {
      boatName: 'Sea Monarch',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 145,
      boatLength: 16.0,
      boatWidth: 4.2,
      boatValue: 5500000,
      fuelEfficiencyFactor: 0.87,
      engineDegradationFactor: 1.22,
      averageFuelPredictionError: 0.125,
      fuelTankCapacityLiters: 980,
      maxCrewCapacity: 9,
    },
    tripParameters: {
      boatId: 'boat_031',
      distanceKm: 105.2,
      averageSpeedKmh: 9.7,
      fishingHours: 22.8,
      crewSize: 8,
      fuelPricePerLiter: 299,
      expectedFishPricePerKg: 565,
      expectedCatchKg: 370,
      predictedCatchKg: 385,
    },
    weather: {
      windSpeedKmh: 21.6,
      waveHeightMeters: 1.7,
      rainLevel: 0.48,
    },
    externalCosts: {
      iceCost: 10200,
      baitCost: 5000,
      crewFoodCost: 4600,
      portFee: 1900,
      gearMaintenanceCost: 2900,
      miscellaneousCost: 1600,
    },
  },
  {
    boatSpec: {
      boatName: 'Storm Chaser',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 175,
      boatLength: 18.2,
      boatWidth: 4.3,
      boatValue: 6600000,
      fuelEfficiencyFactor: 0.84,
      engineDegradationFactor: 1.2,
      averageFuelPredictionError: 0.14,
      fuelTankCapacityLiters: 1220,
      maxCrewCapacity: 10,
    },
    tripParameters: {
      boatId: 'boat_032',
      distanceKm: 128.5,
      averageSpeedKmh: 9.2,
      fishingHours: 25.0,
      crewSize: 9,
      fuelPricePerLiter: 303,
      expectedFishPricePerKg: 615,
      expectedCatchKg: 430,
      predictedCatchKg: 445,
    },
    weather: {
      windSpeedKmh: 25.1,
      waveHeightMeters: 2.1,
      rainLevel: 0.68,
    },
    externalCosts: {
      iceCost: 12500,
      baitCost: 6000,
      crewFoodCost: 5400,
      portFee: 2300,
      gearMaintenanceCost: 3700,
      miscellaneousCost: 1900,
    },
  },
  {
    boatSpec: {
      boatName: 'Emerald Sea',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 102,
      boatLength: 12.9,
      boatWidth: 3.5,
      boatValue: 3400000,
      fuelEfficiencyFactor: 0.97,
      engineDegradationFactor: 1.1,
      averageFuelPredictionError: 0.092,
      fuelTankCapacityLiters: 620,
      maxCrewCapacity: 7,
    },
    tripParameters: {
      boatId: 'boat_033',
      distanceKm: 64.8,
      averageSpeedKmh: 11.4,
      fishingHours: 14.2,
      crewSize: 5,
      fuelPricePerLiter: 291,
      expectedFishPricePerKg: 485,
      expectedCatchKg: 168,
      predictedCatchKg: 175,
    },
    weather: {
      windSpeedKmh: 12.9,
      waveHeightMeters: 0.95,
      rainLevel: 0.21,
    },
    externalCosts: {
      iceCost: 6100,
      baitCost: 3050,
      crewFoodCost: 2750,
      portFee: 1280,
      gearMaintenanceCost: 1850,
      miscellaneousCost: 920,
    },
  },
  {
    boatSpec: {
      boatName: 'Dawn Patrol',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 43,
      boatLength: 8.2,
      boatWidth: 2.3,
      boatValue: 1200000,
      fuelEfficiencyFactor: 1.11,
      engineDegradationFactor: 1.04,
      averageFuelPredictionError: 0.06,
      fuelTankCapacityLiters: 185,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_034',
      distanceKm: 25.6,
      averageSpeedKmh: 12.4,
      fishingHours: 6.3,
      crewSize: 3,
      fuelPricePerLiter: 280,
      expectedFishPricePerKg: 435,
      expectedCatchKg: 35,
      predictedCatchKg: 37,
    },
    weather: {
      windSpeedKmh: 8.1,
      waveHeightMeters: 0.55,
      rainLevel: 0.09,
    },
    externalCosts: {
      iceCost: 2350,
      baitCost: 1680,
      crewFoodCost: 1180,
      portFee: 740,
      gearMaintenanceCost: 830,
      miscellaneousCost: 490,
    },
  },
  {
    boatSpec: {
      boatName: 'Lagoon Breeze',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 33,
      boatLength: 7.5,
      boatWidth: 2.2,
      boatValue: 930000,
      fuelEfficiencyFactor: 1.17,
      engineDegradationFactor: 0.99,
      averageFuelPredictionError: 0.047,
      fuelTankCapacityLiters: 145,
      maxCrewCapacity: 3,
    },
    tripParameters: {
      boatId: 'boat_035',
      distanceKm: 21.0,
      averageSpeedKmh: 11.6,
      fishingHours: 6.2,
      crewSize: 2,
      fuelPricePerLiter: 279,
      expectedFishPricePerKg: 400,
      expectedCatchKg: 33,
      predictedCatchKg: 35,
    },
    weather: {
      windSpeedKmh: 9.4,
      waveHeightMeters: 0.65,
      rainLevel: 0.13,
    },
    externalCosts: {
      iceCost: 1950,
      baitCost: 1350,
      crewFoodCost: 920,
      portFee: 660,
      gearMaintenanceCost: 760,
      miscellaneousCost: 410,
    },
  },
  {
    boatSpec: {
      boatName: 'Atlantic Hope',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 132,
      boatLength: 14.7,
      boatWidth: 3.9,
      boatValue: 4900000,
      fuelEfficiencyFactor: 0.92,
      engineDegradationFactor: 1.25,
      averageFuelPredictionError: 0.12,
      fuelTankCapacityLiters: 880,
      maxCrewCapacity: 8,
    },
    tripParameters: {
      boatId: 'boat_036',
      distanceKm: 93.4,
      averageSpeedKmh: 10.0,
      fishingHours: 20.1,
      crewSize: 7,
      fuelPricePerLiter: 295,
      expectedFishPricePerKg: 535,
      expectedCatchKg: 352,
      predictedCatchKg: 367,
    },
    weather: {
      windSpeedKmh: 18.2,
      waveHeightMeters: 1.45,
      rainLevel: 0.4,
    },
    externalCosts: {
      iceCost: 9200,
      baitCost: 4450,
      crewFoodCost: 3950,
      portFee: 1680,
      gearMaintenanceCost: 2600,
      miscellaneousCost: 1380,
    },
  },
  {
    boatSpec: {
      boatName: 'Bay Runner',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 49,
      boatLength: 9.1,
      boatWidth: 2.6,
      boatValue: 1450000,
      fuelEfficiencyFactor: 1.01,
      engineDegradationFactor: 1.16,
      averageFuelPredictionError: 0.078,
      fuelTankCapacityLiters: 230,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_037',
      distanceKm: 31.2,
      averageSpeedKmh: 13.2,
      fishingHours: 7.2,
      crewSize: 3,
      fuelPricePerLiter: 288,
      expectedFishPricePerKg: 425,
      expectedCatchKg: 38,
      predictedCatchKg: 40,
    },
    weather: {
      windSpeedKmh: 11.0,
      waveHeightMeters: 0.78,
      rainLevel: 0.2,
    },
    externalCosts: {
      iceCost: 2750,
      baitCost: 1980,
      crewFoodCost: 1380,
      portFee: 920,
      gearMaintenanceCost: 1080,
      miscellaneousCost: 620,
    },
  },
  {
    boatSpec: {
      boatName: 'Shoreline Pro',
      boatType: 'Flat Bottom Boat (18-19ft)',  // ✅ Fixed
      engineHorsePower: 27,
      boatLength: 6.7,
      boatWidth: 2.0,
      boatValue: 710000,
      fuelEfficiencyFactor: 1.23,
      engineDegradationFactor: 0.91,
      averageFuelPredictionError: 0.038,
      fuelTankCapacityLiters: 118,
      maxCrewCapacity: 2,
    },
    tripParameters: {
      boatId: 'boat_038',
      distanceKm: 14.8,
      averageSpeedKmh: 10.5,
      fishingHours: 4.8,
      crewSize: 2,
      fuelPricePerLiter: 274,
      expectedFishPricePerKg: 355,
      expectedCatchKg: 30,
      predictedCatchKg: 32,
    },
    weather: {
      windSpeedKmh: 5.5,
      waveHeightMeters: 0.3,
      rainLevel: 0.03,
    },
    externalCosts: {
      iceCost: 1450,
      baitCost: 950,
      crewFoodCost: 620,
      portFee: 480,
      gearMaintenanceCost: 580,
      miscellaneousCost: 290,
    },
  },
  {
    boatSpec: {
      boatName: 'Deep Venture',
      boatType: 'Multi-day Fishing Vessel',  // ✅ Fixed
      engineHorsePower: 140,
      boatLength: 15.6,
      boatWidth: 4.1,
      boatValue: 5300000,
      fuelEfficiencyFactor: 0.88,
      engineDegradationFactor: 1.19,
      averageFuelPredictionError: 0.122,
      fuelTankCapacityLiters: 960,
      maxCrewCapacity: 9,
    },
    tripParameters: {
      boatId: 'boat_039',
      distanceKm: 99.8,
      averageSpeedKmh: 9.6,
      fishingHours: 21.5,
      crewSize: 7,
      fuelPricePerLiter: 297,
      expectedFishPricePerKg: 555,
      expectedCatchKg: 362,
      predictedCatchKg: 377,
    },
    weather: {
      windSpeedKmh: 19.8,
      waveHeightMeters: 1.6,
      rainLevel: 0.44,
    },
    externalCosts: {
      iceCost: 9700,
      baitCost: 4650,
      crewFoodCost: 4250,
      portFee: 1780,
      gearMaintenanceCost: 2750,
      miscellaneousCost: 1480,
    },
  },
  {
    boatSpec: {
      boatName: 'Reef Runner',
      boatType: 'One Day Fishing Boat (30ft)',  // ✅ Fixed
      engineHorsePower: 45,
      boatLength: 8.6,
      boatWidth: 2.5,
      boatValue: 1280000,
      fuelEfficiencyFactor: 1.05,
      engineDegradationFactor: 1.12,
      averageFuelPredictionError: 0.082,
      fuelTankCapacityLiters: 200,
      maxCrewCapacity: 4,
    },
    tripParameters: {
      boatId: 'boat_040',
      distanceKm: 27.8,
      averageSpeedKmh: 12.7,
      fishingHours: 6.7,
      crewSize: 3,
      fuelPricePerLiter: 283,
      expectedFishPricePerKg: 450,
      expectedCatchKg: 36,
      predictedCatchKg: 38,
    },
    weather: {
      windSpeedKmh: 9.7,
      waveHeightMeters: 0.68,
      rainLevel: 0.15,
    },
    externalCosts: {
      iceCost: 2580,
      baitCost: 1870,
      crewFoodCost: 1270,
      portFee: 820,
      gearMaintenanceCost: 920,
      miscellaneousCost: 540,
    },
  },
  {
    boatSpec: {
      boatName: 'Net Weaver',
      boatType: '55 Feet Long-line Fishing Trawler',  // ✅ Fixed
      engineHorsePower: 168,
      boatLength: 17.8,
      boatWidth: 4.2,
      boatValue: 6400000,
      fuelEfficiencyFactor: 0.85,
      engineDegradationFactor: 1.17,
      averageFuelPredictionError: 0.135,
      fuelTankCapacityLiters: 1150,
      maxCrewCapacity: 10,
    },
    tripParameters: {
      boatId: 'boat_041',
      distanceKm: 122.1,
      averageSpeedKmh: 9.1,
      fishingHours: 24.2,
      crewSize: 9,
      fuelPricePerLiter: 301,
      expectedFishPricePerKg: 610,
      expectedCatchKg: 420,
      predictedCatchKg: 435,
    },
    weather: {
      windSpeedKmh: 22.7,
      waveHeightMeters: 1.85,
      rainLevel: 0.6,
    },
    externalCosts: {
      iceCost: 11900,
      baitCost: 5750,
      crewFoodCost: 5150,
      portFee: 2180,
      gearMaintenanceCost: 3450,
      miscellaneousCost: 1770,
    },
  },
];

interface ImportResult {
  success: boolean;
  tripId?: string;
  error?: string;
}

/**
 * Import a single trip
 */
async function importTrip(sampleTrip: any): Promise<ImportResult> {
  try {
    // Apply boat ID configuration
    const boatName = sampleTrip.boatSpec.boatName;
    let actualBoatId: string;

    if (USE_SINGLE_BOAT) {
      actualBoatId = SINGLE_BOAT_ID;
    } else {
      actualBoatId = BOAT_ID_MAP[boatName];
      if (!actualBoatId) {
        throw new Error(
          `No boat ID mapping found for: ${boatName}. Please update BOAT_ID_MAP.`,
        );
      }
    }

    // Update the trip with the correct boat ID
    const tripWithCorrectBoatId = {
      ...sampleTrip,
      tripParameters: {
        ...sampleTrip.tripParameters,
        boatId: actualBoatId,
      },
    };

    // Transform to API format
    const payload = transformSampleToPayload(tripWithCorrectBoatId);

    // Create trip via predict-and-save
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/cost-engine/predict-and-save`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const tripId = response.data?.trip?._id || response.data?.trip?.id;

    console.log(`✅ Created trip: ${tripId} (${sampleTrip.boatSpec.boatName})`);

    return {
      success: true,
      tripId,
    };
  } catch (error: any) {
    console.error(
      `❌ Failed to import trip: ${error?.response?.data?.message || error.message}`,
    );
    return {
      success: false,
      error: error?.response?.data?.message || error.message,
    };
  }
}

/**
 * Log actual data for a trip
 */
async function logActualForTrip(
  tripId: string,
  sampleTrip: any,
): Promise<boolean> {
  try {
    const actualData = extractActualData(sampleTrip);

    await axios.post(
      `${API_BASE_URL}/api/v1/trips/${tripId}/log-actual`,
      actualData,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(`✅ Logged actuals for trip: ${tripId}`);
    return true;
  } catch (error: any) {
    console.error(
      `❌ Failed to log actuals: ${error?.response?.data?.message || error.message}`,
    );
    return false;
  }
}

/**
 * Main import function
 */
async function bulkImportTrips(
  withActuals: boolean = false,
  delayMs: number = 1000,
) {
  // Validate configuration
  console.log('\n🔍 Validating configuration...\n');

  if (!AUTH_TOKEN || AUTH_TOKEN === 'your-auth-token-here') {
    console.error('❌ ERROR: AUTH_TOKEN not set!');
    console.error('   Please set: $env:AUTH_TOKEN="your-actual-token"');
    console.error(
      '   Get token: curl -X POST http://localhost:5000/api/v1/auth/login \\',
    );
    console.error('              -H "Content-Type: application/json" \\');
    console.error(
      '              -d \'{"email":"your@email.com","password":"yourpassword"}\'',
    );
    process.exit(1);
  }

  if (USE_SINGLE_BOAT) {
    if (!SINGLE_BOAT_ID || SINGLE_BOAT_ID.length < 10) {
      console.error('❌ ERROR: SINGLE_BOAT_ID not configured!');
      console.error(
        '   Please update SINGLE_BOAT_ID in the configuration section.',
      );
      console.error(
        '   Get boat ID: curl http://localhost:5000/api/v1/boats/my \\',
      );
      console.error(
        '                -H "Authorization: Bearer ' +
          AUTH_TOKEN.substring(0, 20) +
          '..."',
      );
      process.exit(1);
    }
    console.log(`✅ Mode: Single Boat (ID: ${SINGLE_BOAT_ID})`);
  } else {
    const missingMappings = SAMPLE_TRIPS.map((t) => t.boatSpec.boatName).filter(
      (name) => !BOAT_ID_MAP[name],
    );

    if (missingMappings.length > 0) {
      console.error('❌ ERROR: Missing boat ID mappings for:');
      missingMappings.forEach((name) => console.error(`   - ${name}`));
      console.error(
        '   Please update BOAT_ID_MAP in the configuration section.',
      );
      process.exit(1);
    }
    console.log(
      `✅ Mode: Mapped Boats (${Object.keys(BOAT_ID_MAP).length} mappings)`,
    );
  }

  console.log(`\n🚀 Starting bulk import of ${SAMPLE_TRIPS.length} trips...`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`With Actuals: ${withActuals}`);
  console.log(`Delay: ${delayMs}ms`);
  console.log('');

  let successCount = 0;
  let failCount = 0;
  const tripIds: string[] = [];

  for (let i = 0; i < SAMPLE_TRIPS.length; i++) {
    const trip = SAMPLE_TRIPS[i];
    console.log(
      `\n[${i + 1}/${SAMPLE_TRIPS.length}] Processing ${trip.boatSpec.boatName}...`,
    );

    // Import trip
    const result = await importTrip(trip);

    if (result.success && result.tripId) {
      successCount++;
      tripIds.push(result.tripId);

      // Log actuals if requested
      if (withActuals) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay
        await logActualForTrip(result.tripId, trip);
      }
    } else {
      failCount++;
    }

    // Delay between requests to avoid overwhelming the server
    if (i < SAMPLE_TRIPS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📋 Total: ${SAMPLE_TRIPS.length}`);
  console.log(`\n🆔 Trip IDs:`);
  tripIds.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));
}

/**
 * Example usage
 */
if (require.main === module) {
  // Check for command line arguments
  const withActuals = process.argv.includes('--with-actuals');
  const delayMs = parseInt(
    process.argv.find((arg) => arg.startsWith('--delay='))?.split('=')[1] ||
      '1000',
  );

  bulkImportTrips(withActuals, delayMs)
    .then(() => {
      console.log('\n✅ Bulk import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Bulk import failed:', error);
      process.exit(1);
    });
}

export { bulkImportTrips, importTrip, logActualForTrip };
