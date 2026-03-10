/**
 * Flexible Batch Import from JSON File
 *
 * This script imports trips from a JSON file for easy bulk data loading.
 *
 * Usage:
 *   1. Generate data using AI (see DATA_GENERATION_PROMPT.md)
 *   2. Save JSON to: new-batch-trips.json
 *   3. Set AUTH_TOKEN: $env:AUTH_TOKEN="your-token"
 *   4. Run: npx ts-node import-from-json.ts --file=new-batch-trips.json --with-actuals
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  transformSampleToPayload,
  extractActualData,
} from './sample-trip-transformer';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Get boat ID from environment or use default
const BOAT_ID = process.env.BOAT_ID || '69ad7cc8129027e9d0a885ff';

interface ImportResult {
  success: boolean;
  tripId?: string;
  error?: string;
}

/**
 * Load trips from JSON file
 */
function loadTripsFromFile(filename: string): any[] {
  const filePath = path.resolve(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const trips = JSON.parse(fileContent);

  if (!Array.isArray(trips)) {
    throw new Error('JSON file must contain an array of trips');
  }

  return trips;
}

/**
 * Import a single trip
 */
async function importTrip(
  sampleTrip: any,
  boatId: string,
): Promise<ImportResult> {
  try {
    // Update boat ID
    const tripWithBoatId = {
      ...sampleTrip,
      tripParameters: {
        ...sampleTrip.tripParameters,
        boatId: boatId,
      },
    };

    // Transform to API format
    const payload = transformSampleToPayload(tripWithBoatId);

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

    return {
      success: true,
      tripId,
    };
  } catch (error: any) {
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
): Promise<void> {
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
  } catch (error: any) {
    console.error(
      `❌ Failed to log actuals: ${error?.response?.data?.message || error.message}`,
    );
  }
}

/**
 * Validate trip data
 */
function validateTrip(trip: any, index: number): string[] {
  const errors: string[] = [];

  if (!trip.boatSpec) {
    errors.push(`Trip ${index}: Missing boatSpec`);
  }
  if (!trip.tripParameters) {
    errors.push(`Trip ${index}: Missing tripParameters`);
  }
  if (!trip.weather) {
    errors.push(`Trip ${index}: Missing weather`);
  }

  if (trip.tripParameters?.crewSize > trip.boatSpec?.maxCrewCapacity) {
    errors.push(
      `Trip ${index}: crewSize (${trip.tripParameters.crewSize}) exceeds maxCrewCapacity (${trip.boatSpec.maxCrewCapacity})`,
    );
  }

  return errors;
}

/**
 * Main import function
 */
async function importFromJSON(
  filename: string,
  withActuals: boolean = false,
  delayMs: number = 1000,
) {
  console.log('\n🔍 Validating configuration...\n');

  // Validate auth token
  if (!AUTH_TOKEN || AUTH_TOKEN.length < 20) {
    console.error('❌ ERROR: AUTH_TOKEN not set or invalid!');
    console.error('   Set it: $env:AUTH_TOKEN="your-token"');
    process.exit(1);
  }

  // Validate boat ID
  if (!BOAT_ID || BOAT_ID.length < 10) {
    console.error('❌ ERROR: BOAT_ID not set or invalid!');
    console.error('   Set it: $env:BOAT_ID="your-boat-id"');
    process.exit(1);
  }

  console.log(`✅ Using Boat ID: ${BOAT_ID}`);
  console.log(`✅ Auth Token: ${AUTH_TOKEN.substring(0, 30)}...`);

  // Load trips from file
  console.log(`\n📂 Loading trips from: ${filename}\n`);
  let trips: any[];

  try {
    trips = loadTripsFromFile(filename);
    console.log(`✅ Loaded ${trips.length} trips from file`);
  } catch (error: any) {
    console.error(`❌ Failed to load file: ${error.message}`);
    process.exit(1);
  }

  // Validate all trips
  console.log('\n🔍 Validating trip data...\n');
  const allErrors: string[] = [];
  trips.forEach((trip, index) => {
    const errors = validateTrip(trip, index + 1);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error('❌ Validation errors found:\n');
    allErrors.forEach((error) => console.error(`   ${error}`));
    console.error('\nPlease fix the data and try again.');
    process.exit(1);
  }

  console.log('✅ All trips validated successfully\n');

  // Start import
  console.log(`🚀 Starting import of ${trips.length} trips...`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`With Actuals: ${withActuals}`);
  console.log(`Delay: ${delayMs}ms\n`);

  let successCount = 0;
  let failCount = 0;
  const tripIds: string[] = [];

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    const boatName = trip.boatSpec?.boatName || `Trip ${i + 1}`;

    console.log(`[${i + 1}/${trips.length}] Processing ${boatName}...`);

    // Import trip
    const result = await importTrip(trip, BOAT_ID);

    if (result.success && result.tripId) {
      successCount++;
      tripIds.push(result.tripId);
      console.log(`✅ Created trip: ${result.tripId}`);

      // Log actuals if requested
      if (withActuals) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await logActualForTrip(result.tripId, trip);
      }
    } else {
      failCount++;
      console.error(`❌ Failed: ${result.error}`);
    }

    // Delay between requests
    if (i < trips.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📋 Total: ${trips.length}`);
  console.log(`\n🆔 Trip IDs:`);
  tripIds.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));

  // Batch training suggestion
  if (successCount > 0 && withActuals) {
    console.log('\n💡 Next step: Run batch training to update ML models');
    console.log('   Command:');
    console.log(
      `   $tripIds = @(${tripIds.map((id) => `"${id}"`).join(',')})`.substring(
        0,
        150,
      ) + '...)',
    );
    console.log(
      '   $body = @{tripIds = $tripIds; boatId = $env:BOAT_ID} | ConvertTo-Json',
    );
    console.log(
      '   Invoke-RestMethod -Uri "http://localhost:5000/api/v1/trips/batch-train" -Method Post -Headers @{Authorization="Bearer $env:AUTH_TOKEN"; "Content-Type"="application/json"} -Body $body',
    );
  }

  return { successCount, failCount, tripIds };
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse arguments
  const fileArg = args.find((arg) => arg.startsWith('--file='));
  const filename = fileArg ? fileArg.split('=')[1] : 'new-batch-trips.json';

  const withActuals = args.includes('--with-actuals');
  const delayArg = args.find((arg) => arg.startsWith('--delay='));
  const delayMs = delayArg ? parseInt(delayArg.split('=')[1]) : 1000;

  importFromJSON(filename, withActuals, delayMs)
    .then(() => {
      console.log('\n✅ Import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

export { importFromJSON, loadTripsFromFile, validateTrip };
