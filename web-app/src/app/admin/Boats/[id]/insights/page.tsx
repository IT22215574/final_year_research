"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  RefreshCw,
  Gauge,
  Anchor,
  History,
} from "lucide-react";
import { useBoatStore } from "@/stores/boatStore";

export default function BoatInsightsPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    learningInsights,
    predictionHistory,
    isLoading,
    error,
    fetchLearningInsights,
    fetchPredictionHistory,
    clearBoatExtras,
  } = useBoatStore();

  useEffect(() => {
    fetchLearningInsights(id);
    fetchPredictionHistory(id);

    return () => {
      clearBoatExtras();
    };
  }, [id, fetchLearningInsights, fetchPredictionHistory, clearBoatExtras]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/boats/${id}`}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              Boat Insights
            </h1>
            <p className="text-gray-600 mt-1">
              Learning insights and prediction history
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchLearningInsights(id);
            fetchPredictionHistory(id);
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-600" />
            Boat Info
          </h2>

          {learningInsights?.boatInfo ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-gray-500 text-xs mb-1">Boat Name</p>
                <p className="font-semibold text-gray-900">
                  {learningInsights.boatInfo.boatName}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-gray-500 text-xs mb-1">Boat Type</p>
                <p className="font-semibold text-gray-900">
                  {learningInsights.boatInfo.boatType}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-gray-500 text-xs mb-1">Engine HP</p>
                <p className="font-semibold text-gray-900">
                  {learningInsights.boatInfo.engineHorsePower}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No boat insight data available.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-violet-600" />
            Current Coefficients
          </h2>

          {learningInsights?.currentCoefficients ? (
            <div className="grid grid-cols-1 gap-3">
              <MetricCard
                label="Fuel Efficiency Factor"
                value={learningInsights.currentCoefficients.fuelEfficiencyFactor ?? "-"}
              />
              <MetricCard
                label="Engine Degradation Factor"
                value={learningInsights.currentCoefficients.engineDegradationFactor ?? "-"}
              />
              <MetricCard
                label="Average Fuel Prediction Error"
                value={learningInsights.currentCoefficients.averageFuelPredictionError ?? "-"}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No coefficient data available.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Learning Insights Data</h2>

          <pre className="text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-auto text-gray-700">
            {JSON.stringify(learningInsights?.learningInsights ?? {}, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Prediction History
          </h2>

          {predictionHistory?.history?.length ? (
            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {predictionHistory.history.map((item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-xl bg-gray-50 border border-gray-100 p-4"
                >
                  <pre className="text-xs overflow-auto text-gray-700">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {predictionHistory?.message ?? "No prediction history available."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}