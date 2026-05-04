'use client';

import { useState } from 'react';
import { useDatasetUpload } from '@/hooks/useDatasetUpload';

const BOAT_TYPES = ['IDAT', 'IMUI', 'MTRP', 'OFRP'] as const;

// Required fields for each boat type
const REQUIRED_FIELDS = {
  'IDAT': [
    { field: 'boat_type', example: 'IDAT', required: true, note: 'Boat type classification' },
    { field: 'boat_id', example: '69e901ce33e21724b91f200e', required: true, note: 'Unique boat identifier (you provide)' },
    { field: 'speed', example: '7.7', required: true, note: 'Boat speed (knots or km/h)' },
    { field: 'weatherSeverityIndex', example: '0.407', required: true, note: 'Weather severity (0-1 scale)' },
    { field: 'distanceKm', example: '101.85', required: true, note: 'Distance traveled in km' },
    { field: 'engineHP', example: '68', required: true, note: 'Engine horsepower' },
    { field: 'fishingHours', example: '23', required: true, note: 'Hours spent fishing' },
    { field: 'numberOfDays', example: '1', required: true, note: 'Number of days for trip' },
    { field: 'predictedFuelLiters', example: '205.89', required: true, note: 'Predicted fuel consumption' },
    { field: 'actualFuelLiters', example: '231.4', required: false, note: 'Actual fuel used (LABEL)' },
    { field: 'actualCost', example: '92690', required: false, note: 'Actual trip cost (LABEL)' },
  ],
  'IMUI': [
    { field: 'boat_type', example: 'IMUI', required: true, note: 'Boat type classification' },
    { field: 'boat_id', example: '69ea477f932ab2eec9ec1ef9', required: true, note: 'Unique boat identifier (you provide)' },
    { field: 'speed', example: '6.3', required: true, note: 'Boat speed range or single value' },
    { field: 'weatherSeverityIndex', example: '0.486', required: true, note: 'Weather severity (0-1 scale)' },
    { field: 'distanceKm', example: '277.30', required: true, note: 'Distance in km' },
    { field: 'engineHP', example: '125.5', required: true, note: 'Engine horsepower' },
    { field: 'fishingHours', example: '9', required: true, note: 'Fishing hours' },
    { field: 'numberOfDays', example: '2', required: true, note: 'Number of days' },
    { field: 'predictedFuelLiters', example: '247.62', required: true, note: 'Predicted fuel' },
    { field: 'actualFuelLiters', example: '841.2', required: false, note: 'Actual fuel (LABEL)' },
    { field: 'actualCost', example: '326120', required: false, note: 'Actual cost (LABEL)' },
  ],
  'MTRP': [
    { field: 'boat_type', example: 'MTRP', required: true, note: 'Boat type classification' },
    { field: 'boat_id', example: '69eb1234567890abc', required: true, note: 'Unique boat identifier (you provide)' },
    { field: 'speed', example: '8.5', required: true, note: 'Boat speed' },
    { field: 'weatherSeverityIndex', example: '0.35', required: true, note: 'Weather severity' },
    { field: 'distanceKm', example: '120.5', required: true, note: 'Distance in km' },
    { field: 'engineHP', example: '95', required: true, note: 'Engine horsepower' },
    { field: 'fishingHours', example: '18', required: true, note: 'Fishing hours' },
    { field: 'numberOfDays', example: '1', required: true, note: 'Number of days' },
    { field: 'predictedFuelLiters', example: '280.5', required: true, note: 'Predicted fuel' },
    { field: 'actualFuelLiters', example: '320', required: false, note: 'Actual fuel (LABEL)' },
    { field: 'actualCost', example: '125000', required: false, note: 'Actual cost (LABEL)' },
  ],
  'OFRP': [
    { field: 'boat_type', example: 'OFRP', required: true, note: 'Boat type classification' },
    { field: 'boat_id', example: '69ec1234567890abc', required: true, note: 'Unique boat identifier (you provide)' },
    { field: 'speed', example: '12.3', required: true, note: 'Boat speed' },
    { field: 'weatherSeverityIndex', example: '0.25', required: true, note: 'Weather severity' },
    { field: 'distanceKm', example: '185.2', required: true, note: 'Distance in km' },
    { field: 'engineHP', example: '150', required: true, note: 'Engine horsepower' },
    { field: 'fishingHours', example: '20', required: true, note: 'Fishing hours' },
    { field: 'numberOfDays', example: '2', required: true, note: 'Number of days' },
    { field: 'predictedFuelLiters', example: '350.8', required: true, note: 'Predicted fuel' },
    { field: 'actualFuelLiters', example: '420', required: false, note: 'Actual fuel (LABEL)' },
    { field: 'actualCost', example: '165000', required: false, note: 'Actual cost (LABEL)' },
  ],
};

// Sample CSV data for each boat type
const SAMPLE_CSV = {
  'IDAT': `boat_type,boat_id,speed,weatherSeverityIndex,distanceKm,engineHP,fishingHours,numberOfDays,predictedFuelLiters,actualFuelLiters,actualCost
IDAT,69e901ce33e21724b91f200e,7.7,0.407,101.85,68,23,1,205.89,231.4,92690
IDAT,69e901cf33e21724b91f2010,8.2,0.450,95.50,68,20,1,198.50,220.0,88000`,
  
  'IMUI': `boat_type,boat_id,speed,weatherSeverityIndex,distanceKm,engineHP,fishingHours,numberOfDays,predictedFuelLiters,actualFuelLiters,actualCost
IMUI,69ea477f932ab2eec9ec1ef9,6.3,0.486,277.30,125.5,9,2,247.62,841.2,326120
IMUI,69ea477f932ab2eec9ec1ef9,10.0,0.273,78.75,125.5,24,2,508.7,1168,450500`,
  
  'MTRP': `boat_type,boat_id,speed,weatherSeverityIndex,distanceKm,engineHP,fishingHours,numberOfDays,predictedFuelLiters,actualFuelLiters,actualCost
MTRP,69eb1234567890abcdef1234,8.5,0.350,120.50,95,18,1,280.5,320,125000
MTRP,69eb1234567890abcdef1235,9.0,0.400,115.00,95,16,1,275.0,310,120000`,
  
  'OFRP': `boat_type,boat_id,speed,weatherSeverityIndex,distanceKm,engineHP,fishingHours,numberOfDays,predictedFuelLiters,actualFuelLiters,actualCost
OFRP,69ec1234567890abcdef1234,12.3,0.250,185.20,150,20,2,350.8,420,165000
OFRP,69ec1234567890abcdef1235,11.8,0.300,175.50,150,19,2,345.0,410,160000`,
};

const downloadSampleCSV = (boatType: string) => {
  const csv = SAMPLE_CSV[boatType as keyof typeof SAMPLE_CSV];
  const element = document.createElement('a');
  const file = new Blob([csv], { type: 'text/csv' });
  element.href = URL.createObjectURL(file);
  element.download = `sample_${boatType.toLowerCase()}_dataset.csv`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export default function DatasetUploadPage() {
  const [boatType, setBoatType] = useState<string>('IDAT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const { uploading, error, success, uploadDataset } = useDatasetUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Show file size
      setFilePreview(
        `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      );
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !boatType) {
      alert('Please select a file and boat type');
      return;
    }

    const result = await uploadDataset(selectedFile, boatType);

    if (result) {
      // Reset form on success
      setSelectedFile(null);
      setFilePreview('');
      setBoatType('IDAT');
      
      // Clear file input
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            📤 Dataset Upload
          </h1>
          <p className="text-slate-600">
            Upload CSV or JSON training data for model improvement
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          {/* Boat Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              🚤 Boat Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BOAT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setBoatType(type)}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    boatType === type
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              📁 Upload File (CSV or JSON) *
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer block"
              >
                <div className="text-4xl mb-2">📄</div>
                <p className="text-slate-600 font-medium mb-2">
                  Click to select or drag & drop
                </p>
                <p className="text-xs text-slate-500">
                  CSV or JSON • Max 50MB
                </p>
                {filePreview && (
                  <p className="text-sm text-blue-600 font-semibold mt-3">
                    ✓ {filePreview}
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">⚠️ Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">✓ Upload Successful</p>
              <div className="text-green-700 text-sm mt-3 space-y-1">
                <p>
                  <strong>File:</strong> {success.dataset.filename}
                </p>
                <p>
                  <strong>Boat Type:</strong> {success.dataset.boatType}
                </p>
                <p>
                  <strong>Format:</strong> {success.dataset.uploadSource.toUpperCase()}
                </p>
                <p>
                  <strong>Rows:</strong> {success.dataset.rowCount}
                </p>
                <p>
                  <strong>Valid:</strong> {success.dataset.processedCount}
                </p>
                {success.dataset.errorCount > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 font-semibold text-xs mb-2">
                      ⚠️ {success.dataset.errorCount} Rows with Issues:
                    </p>
                    <ul className="text-yellow-700 text-xs space-y-1">
                      {success.dataset.validationErrors.slice(0, 3).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {success.dataset.validationErrors.length > 3 && (
                        <li>• ... and {success.dataset.validationErrors.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !boatType}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                uploading || !selectedFile || !boatType
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
              }`}
            >
              {uploading ? '⏳ Uploading...' : '🚀 Upload Dataset'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 font-semibold text-sm mb-2">
              💡 Required CSV Columns
            </p>
            <p className="text-blue-800 text-sm space-y-1">
              Your file should include:<br/>
              • <strong>boat_id</strong> (required)<br/>
              • Feature columns: speed, distanceKm, engineHP, etc.<br/>
              • Label columns: actualFuelLiters, actualCost<br/>
              <br/>
              Column names are flexible - we'll match similar names automatically.
            </p>
          </div>
        </div>

        {/* Field Requirements Template */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            📋 Field Requirements for {boatType}
          </h2>

          <div className="mb-6 flex gap-3">
            <button
              onClick={() => downloadSampleCSV(boatType)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
            >
              📥 Download Sample CSV
            </button>
            <button
              onClick={() => {
                const csv = SAMPLE_CSV[boatType as keyof typeof SAMPLE_CSV];
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(csv).then(() => {
                    alert('✓ Sample data copied to clipboard!');
                  }).catch(() => {
                    alert('Could not copy to clipboard. Download CSV instead.');
                  });
                } else {
                  alert('Clipboard not available. Please download the CSV file instead.');
                }
              }}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
            >
              📋 Copy Sample Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <th className="border border-slate-300 px-4 py-3 text-left font-semibold">Field Name</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-semibold">Status</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-semibold">Example</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {REQUIRED_FIELDS[boatType as keyof typeof REQUIRED_FIELDS].map((field, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      {field.field}
                    </td>
                    <td className="border border-slate-300 px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded font-semibold text-xs ${
                        field.required 
                          ? 'bg-red-200 text-red-900' 
                          : 'bg-yellow-200 text-yellow-900'
                      }`}>
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-4 py-3">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-800">
                        {field.example}
                      </code>
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-slate-700">
                      {field.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-900 font-semibold text-sm mb-2">
              ℹ️ What You Provide vs What System Auto-Generates
            </p>
            <div className="text-amber-800 text-sm space-y-3">
              <div>
                <strong className="text-amber-900">You MUST provide in CSV:</strong><br/>
                ✓ boat_id (unique identifier for the boat)<br/>
                ✓ All feature columns (speed, distance, engineHP, etc.)<br/>
                ✓ Label columns (actualFuelLiters, actualCost if available)
              </div>
              <div>
                <strong className="text-amber-900">System AUTO-GENERATES:</strong><br/>
                ✓ boat_type (set to "{boatType}" based on your selection)<br/>
                ✓ source_trip_id (set to null for uploaded data; manual trips have IDs)
              </div>
              <div className="bg-white p-3 rounded border border-amber-300">
                <strong className="text-blue-900">Example:</strong><br/>
                Your CSV has: boat_id, speed, weather, ..., actualFuelLiters<br/>
                System adds: boat_type = "{boatType}", source_trip_id = null<br/>
                Final record: boat_type, source_trip_id, boat_id, features..., labels
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-900 font-semibold text-sm mb-2">
              ✅ Column Name Flexibility
            </p>
            <p className="text-green-800 text-sm">
              The system automatically matches similar column names:
            </p>
            <div className="mt-3 bg-white p-3 rounded font-mono text-xs text-slate-700 space-y-1">
              <div>speed = boat_speed = Speed = SPEED</div>
              <div>distanceKm = distance = Distance_KM = trip_distance</div>
              <div>actualFuelLiters = fuel = FuelUsed = actual_fuel = totalFuel</div>
              <div>actualCost = cost = tripCost = total_cost = finalCost</div>
              <div>weatherSeverityIndex = weather = severity = weatherIndex</div>
            </div>
          </div>

          {/* Sample Data Preview */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">📊 Sample Data Preview</h3>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono text-xs">
              <pre>{SAMPLE_CSV[boatType as keyof typeof SAMPLE_CSV]}</pre>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-blue-900 font-bold text-lg mb-3">
            ✅ File Upload Data Flow
          </p>
          <div className="space-y-3 text-blue-900">
            <div className="flex gap-3">
              <div className="font-bold text-blue-600 w-8 flex-shrink-0">1️⃣</div>
              <div>
                <strong>You Upload CSV</strong><br/>
                Provide: boat_id, speed, weather, distance, engineHP, fishingHours, numberOfDays, predictedFuelLiters, actualFuelLiters, actualCost
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-blue-600 w-8 flex-shrink-0">2️⃣</div>
              <div>
                <strong>System Processes</strong><br/>
                Validates data, converts types, adds boat_type = "{boatType}" and source_trip_id = null
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-blue-600 w-8 flex-shrink-0">3️⃣</div>
              <div>
                <strong>Admin Reviews</strong><br/>
                Check validation results and data quality in "Manage Uploads"
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-blue-600 w-8 flex-shrink-0">4️⃣</div>
              <div>
                <strong>Admin Approves</strong><br/>
                Approved data automatically merges with manual trips into training_data_{boatType}.csv
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-blue-600 w-8 flex-shrink-0">5️⃣</div>
              <div>
                <strong>Ready for Colab</strong><br/>
                Combined dataset (manual + uploaded) is ready for model training in Colab
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
