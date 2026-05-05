"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface FishZone {
  lat: number;
  lon: number;
  sst: number;
  chlor_a: number;
  water_u: number;
  water_v: number;
  fish_zone: number;
  fish_probability: number;
}

interface FishZoneResponse {
  data: FishZone[];
  metadata: {
    total: number;
    fishZones: number;
    highProbabilityZones: number;
    date: string;
  };
}

// Helper function to get color based on probability
function getMarkerColor(probability: number): string {
  if (probability >= 0.8) return "#DC2626"; // red-600
  if (probability >= 0.6) return "#EA580C"; // orange-600
  if (probability >= 0.4) return "#F59E0B"; // amber-500
  return "#10B981"; // green-500
}

function getProbabilityLabel(probability: number): string {
  if (probability >= 0.8) return "Very High";
  if (probability >= 0.6) return "High";
  if (probability >= 0.4) return "Medium";
  return "Low";
}

// Map bounds updater component
function MapBounds({ fishZones }: { fishZones: FishZone[] }) {
  const map = useMap();

  useEffect(() => {
    if (fishZones.length > 0) {
      const bounds: LatLngBoundsExpression = fishZones.map((zone) => [
        zone.lat,
        zone.lon,
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fishZones, map]);

  return null;
}

export default function FishZoneMapView() {
  const [fishZones, setFishZones] = useState<FishZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FishZoneResponse["metadata"] | null>(
    null
  );
  const [minProbability, setMinProbability] = useState(0.5);

  // Center of Sri Lanka's EEZ (lat midpoint of 2-14°N, lon midpoint of 74-86°E)
  const SRI_LANKA_CENTER: LatLngExpression = [8.0, 80.0];

  useEffect(() => {
    fetchFishZones();
  }, [minProbability]);

  const fetchFishZones = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/fish-zones/latest?minProbability=${minProbability}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch fish zones");
      }

      const data: FishZoneResponse = await response.json();
      setFishZones(data.data);
      setMetadata(data.metadata);
    } catch (err) {
      console.error("Error fetching fish zones:", err);
      setError("Could not load fish zone predictions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Fish Zone Predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFishZones}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fish Zone Predictions
            </h1>
            {metadata && (
              <p className="text-sm text-gray-600">
                Updated: {metadata.date} • {metadata.fishZones} zones found
              </p>
            )}
          </div>
          <button
            onClick={fetchFishZones}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="absolute top-24 left-6 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Minimum Probability Filter
        </h3>
        <div className="flex gap-2">
          {[0, 0.3, 0.5, 0.7].map((value) => (
            <button
              key={value}
              onClick={() => setMinProbability(value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                minProbability === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {value === 0 ? "All" : `${(value * 100).toFixed(0)}%`}
            </button>
          ))}
        </div>

        {metadata && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Total Points</p>
                <p className="font-semibold text-gray-900">{metadata.total}</p>
              </div>
              <div>
                <p className="text-gray-600">High Probability</p>
                <p className="font-semibold text-gray-900">
                  {metadata.highProbabilityZones}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Fish Probability
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-700">Very High (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm text-gray-700">High (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-700">Medium (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Low (&lt;40%)</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={SRI_LANKA_CENTER}
        zoom={6}
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {fishZones.map((zone, index) => (
          <CircleMarker
            key={`zone-${index}`}
            center={[zone.lat, zone.lon]}
            radius={8 + zone.fish_probability * 12} // Dynamic size based on probability
            fillColor={getMarkerColor(zone.fish_probability)}
            color={getMarkerColor(zone.fish_probability)}
            fillOpacity={0.6}
            weight={2}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-bold text-lg mb-2 pb-2 border-b">
                  Fish Zone Details
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">
                      {zone.lat.toFixed(3)}°N, {zone.lon.toFixed(3)}°E
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Probability:</span>
                    <span
                      className="font-bold"
                      style={{ color: getMarkerColor(zone.fish_probability) }}
                    >
                      {(zone.fish_probability * 100).toFixed(1)}% -{" "}
                      {getProbabilityLabel(zone.fish_probability)}
                    </span>
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <p className="font-semibold mb-2">
                      Environmental Conditions
                    </p>

                    <div className="flex justify-between">
                      <span className="text-gray-600">SST:</span>
                      <span className="font-medium">
                        {zone.sst.toFixed(2)}°C
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Chlorophyll:</span>
                      <span className="font-medium">
                        {zone.chlor_a.toFixed(4)} mg/m³
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Current (E/W):</span>
                      <span className="font-medium">
                        {zone.water_u.toFixed(3)} m/s
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Current (N/S):</span>
                      <span className="font-medium">
                        {zone.water_v.toFixed(3)} m/s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        <MapBounds fishZones={fishZones} />
      </MapContainer>
    </div>
  );
}
