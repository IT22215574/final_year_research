"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Compass, Database, RefreshCw, Ship, TrendingUp } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { isFisherAdminRole } from "@/lib/authRoles";
import { useAuthStore } from "@/stores/authStore";

type Trip = {
  _id: string;
  userId?: string;
  boatId?: string;
  boatType?: string;
  status?: string;
  tripDate?: string;
  departureTime?: string;
  returnTime?: string;
  distanceKm?: number;
  predictedDistanceKm?: number;
  predictedFuelLiters?: number;
  actualFuelLiters?: number;
  predictedTotalCost?: number;
  actualTotalCost?: number;
  riskCategory?: string;
  comparisonEligible?: boolean;
  createdAt?: string;
};

type LearningSummary = {
  totalTrips?: number;
  completedTrips?: number;
  predictionsWithActuals?: number;
  fuelAccuracyRate?: number;
  costAccuracyRate?: number;
};

const numberFmt = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 1 });
const moneyFmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function formatNumber(value?: number) {
  return Number.isFinite(value) ? numberFmt.format(value as number) : "-";
}

function formatMoney(value?: number) {
  return Number.isFinite(value) ? moneyFmt.format(value as number) : "-";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export default function AdminFishTripPage() {
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [selectedBoatType, setSelectedBoatType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageFishTrips = isFisherAdminRole(user?.role);

  async function loadFishTripData() {
    setError(null);
    setIsLoading(true);
    try {
      const [tripData, summaryData] = await Promise.all([
        apiFetch<Trip[]>("/trips"),
        apiFetch<LearningSummary>("/trips/learning/summary"),
      ]);
      setTrips(Array.isArray(tripData) ? tripData : []);
      setSummary(summaryData);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message ?? "Failed to load fish trip data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canManageFishTrips) {
      void loadFishTripData();
    } else {
      setIsLoading(false);
    }
  }, [canManageFishTrips]);

  const boatTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          trips
            .map((trip) => String(trip.boatType || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [trips],
  );

  const filteredTrips = useMemo(() => {
    if (selectedBoatType === "all") return trips;
    return trips.filter((trip) => String(trip.boatType || "").trim() === selectedBoatType);
  }, [selectedBoatType, trips]);

  const stats = useMemo(() => {
    const actualLogged = filteredTrips.filter(
      (trip) => Number(trip.actualFuelLiters || 0) > 0 || Number(trip.actualTotalCost || 0) > 0,
    ).length;
    const totalPredictedCost = filteredTrips.reduce(
      (sum, trip) => sum + Number(trip.predictedTotalCost || 0),
      0,
    );
    const highRisk = filteredTrips.filter((trip) => trip.riskCategory === "high").length;

    return {
      totalTrips: filteredTrips.length,
      actualLogged,
      totalPredictedCost,
      highRisk,
    };
  }, [filteredTrips]);

  if (!canManageFishTrips) {
    return (
      <section className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fish Trip access required</h1>
            <p className="text-gray-600 mt-1">This page is only shown for fisher admin accounts.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fish Trip</h1>
          <p className="text-gray-600 mt-1">
            Trip predictions, actual logs, and training readiness
            {summary?.fuelAccuracyRate !== undefined
              ? ` • Fuel accuracy ${formatNumber(summary.fuelAccuracyRate)}%`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={loadFishTripData}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrips.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Compass className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Actual logs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.actualLogged.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Predicted cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(stats.totalPredictedCost)}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">High risk</p>
              <p className="text-2xl font-bold text-gray-900">{stats.highRisk.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Ship className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 bg-white rounded-2xl shadow-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent trips</h2>
            <p className="text-xs text-gray-500 mt-1">
              {isLoading
                ? "Loading..."
                : `${filteredTrips.length} of ${trips.length} records`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="boat-type-filter" className="text-sm font-semibold text-gray-700">
              Boat type
            </label>
            <select
              id="boat-type-filter"
              value={selectedBoatType}
              onChange={(e) => setSelectedBoatType(e.target.value)}
              className="min-w-56 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All boat types</option>
              {boatTypeOptions.map((boatType) => (
                <option key={boatType} value={boatType}>
                  {boatType}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-3 pr-4 font-semibold">Date</th>
                <th className="py-3 pr-4 font-semibold">Boat type</th>
                <th className="py-3 pr-4 font-semibold">Distance</th>
                <th className="py-3 pr-4 font-semibold">Predicted fuel</th>
                <th className="py-3 pr-4 font-semibold">Actual fuel</th>
                <th className="py-3 pr-4 font-semibold">Predicted cost</th>
                <th className="py-3 pr-4 font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip._id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4 text-gray-700">{formatDate(trip.tripDate || trip.createdAt)}</td>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{trip.boatType || "-"}</td>
                  <td className="py-3 pr-4 text-gray-700">
                    {formatNumber(trip.distanceKm ?? trip.predictedDistanceKm)} km
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{formatNumber(trip.predictedFuelLiters)} L</td>
                  <td className="py-3 pr-4 text-gray-700">{formatNumber(trip.actualFuelLiters)} L</td>
                  <td className="py-3 pr-4 text-gray-700">{formatMoney(trip.predictedTotalCost)}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700 capitalize">
                      {trip.riskCategory || "unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredTrips.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {trips.length === 0
              ? "No fish trip records found."
              : "No trips found for the selected boat type."}
          </p>
        ) : null}
      </section>
    </>
  );
}
