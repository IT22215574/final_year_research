"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Anchor,
  BarChart3,
  Brain,
  Database,
  Gauge,
  RefreshCw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { getAllBoatsForAdmin } from "@/lib/boatApi";
import type { Boat } from "@/lib/boatApi";
import { env } from "@/lib/env";
import { isFisherAdminRole } from "@/lib/authRoles";
import { useAuthStore } from "@/stores/authStore";

type Trip = {
  _id: string;
  boatType?: string;
  predictedFuelLiters?: number;
  actualFuelLiters?: number;
  predictedTotalCost?: number;
  actualTotalCost?: number;
  fuelErrorPercent?: number;
  costErrorPercent?: number;
  riskCategory?: string;
};

type BoatTypeAnalyticsRow = {
  boatType: string;
  displayName: string;
  totalCandidates: number;
  approvedCandidates: number;
  trainedCandidates: number;
  trainingJobs: number;
  successfulJobs: number;
  failedJobs: number;
  recordsProcessed: number;
  backlog: number;
  coveragePercent: number;
  jobSuccessRate: number;
  lastTrainingAt: string | null;
};

type BoatTypeAnalyticsResponse = {
  summary: {
    totalBoatTypes: number;
    trainedCandidates: number;
    trainingJobs: number;
    coveragePercent: number;
    jobSuccessRate: number;
    lastTrainingAt: string | null;
  };
  boatTypes: BoatTypeAnalyticsRow[];
};

type BoatwiseDatasetStats = {
  boatType: string;
  manualTripRows: number;
  uploadedDatasetRows: number;
  totalRows: number;
};

type ModelArtifact = {
  scope: "GLOBAL" | "BOAT_TYPE";
  boatType: string | null;
  modelExists: boolean;
  selectedModel: string | null;
  rowsUsed: number;
  metrics: {
    mape: number | null;
    mae: number | null;
    rmse: number | null;
    r2: number | null;
  };
  updatedAt: string | null;
};

type ModelArtifactSummary = {
  artifacts: ModelArtifact[];
};

type ModelMetrics = {
  mape?: number;
  MAPE?: number;
  mae?: number;
  MAE?: number;
  rmse?: number;
  RMSE?: number;
  r2?: number;
  R2?: number;
  accuracy?: number;
  averagePredictionError?: number;
};

type ModelVersion = {
  _id: string;
  algorithmType: string;
  scope: "GLOBAL" | "BOAT_TYPE";
  boatType?: string;
  metrics?: ModelMetrics;
  selectionScore?: number;
  selectionRank?: number;
  quality?: string;
  status?: string;
  createdAt?: string;
};

type BoatTypeView = {
  boatType: string;
  displayName: string;
  imageUrl: string | null;
  boatCount: number;
  tripCount: number;
  actualTripCount: number;
  trainingRows: number;
  manualTrainingRows: number;
  uploadedTrainingRows: number;
  artifactRowsUsed: number;
  modelAccuracy: number;
  mape: number;
  mae: number;
  rmse: number;
  r2: number;
  coveragePercent: number;
  jobSuccessRate: number;
  trainingJobs: number;
  recordsProcessed: number;
  backlog: number;
  lastTrainingAt: string | null;
  highRiskTrips: number;
  algorithm: string;
  modelStatus: string;
  modelSource: string;
};

const colors = ["#2563eb", "#059669", "#d97706", "#0891b2", "#7c3aed", "#dc2626"];

function normalizeBoatType(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function metricValue(metrics: ModelMetrics | undefined, ...keys: Array<keyof ModelMetrics>) {
  for (const key of keys) {
    const value = Number(metrics?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function modelAccuracy(model?: ModelVersion) {
  const explicit = metricValue(model?.metrics, "accuracy");
  if (explicit > 0) return explicit > 1 ? explicit : explicit * 100;

  const mape =
    metricValue(model?.metrics, "mape", "MAPE", "averagePredictionError") ||
    Number(model?.selectionScore || 0);
  if (!mape) return 0;
  return Math.max(0, Math.min(100, 100 - mape));
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-LK", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not trained";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not trained" : date.toLocaleDateString();
}

function imageUrl(path?: string) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin =
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN || env.apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${origin.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function FishTripAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [analytics, setAnalytics] = useState<BoatTypeAnalyticsResponse | null>(null);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [datasetStats, setDatasetStats] = useState<BoatwiseDatasetStats[]>([]);
  const [modelArtifacts, setModelArtifacts] = useState<ModelArtifact[]>([]);
  const [selectedBoatType, setSelectedBoatType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageFishTrips = isFisherAdminRole(user?.role);

  async function loadAnalytics() {
    setError(null);
    setIsLoading(true);
    try {
      const datasetStatsRequest = apiFetch<BoatwiseDatasetStats[]>(
        "/training-candidates/datasets/stats/boatwise",
      ).catch((e) => {
        console.warn("Training dataset stats unavailable:", (e as ApiError).message);
        return [];
      });
      const artifactSummaryRequest = apiFetch<ModelArtifactSummary>(
        "/model-registry/artifacts/summary",
      ).catch((e) => {
        console.warn("Model artifact metadata unavailable:", (e as ApiError).message);
        return { artifacts: [] };
      });
      const [analyticsData, modelData, tripData, boatData, datasetData, artifactData] = await Promise.all([
        apiFetch<BoatTypeAnalyticsResponse>("/training-jobs/analytics/boat-types"),
        apiFetch<ModelVersion[]>("/model-registry/versions"),
        apiFetch<Trip[]>("/trips"),
        getAllBoatsForAdmin(),
        datasetStatsRequest,
        artifactSummaryRequest,
      ]);

      setAnalytics(analyticsData);
      setModels(Array.isArray(modelData) ? modelData : []);
      setTrips(Array.isArray(tripData) ? tripData : []);
      setBoats(Array.isArray(boatData) ? boatData : []);
      setDatasetStats(Array.isArray(datasetData) ? datasetData : []);
      setModelArtifacts(Array.isArray(artifactData?.artifacts) ? artifactData.artifacts : []);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message ?? "Failed to load trip analytics");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canManageFishTrips) {
      void loadAnalytics();
    } else {
      setIsLoading(false);
    }
  }, [canManageFishTrips]);

  const rows = useMemo<BoatTypeView[]>(() => {
    const keys = new Set<string>();
    analytics?.boatTypes.forEach((row) => keys.add(normalizeBoatType(row.boatType)));
    trips.forEach((trip) => keys.add(normalizeBoatType(trip.boatType)));
    boats.forEach((boat) => keys.add(normalizeBoatType(boat.boatType)));
    datasetStats.forEach((stat) => keys.add(normalizeBoatType(stat.boatType)));
    modelArtifacts.forEach((artifact) => {
      if (artifact.scope === "BOAT_TYPE") {
        keys.add(normalizeBoatType(artifact.boatType || ""));
      }
    });

    return Array.from(keys)
      .filter(Boolean)
      .map((key) => {
        const analyticsRow = analytics?.boatTypes.find(
          (row) => normalizeBoatType(row.boatType) === key,
        );
        const boatTypeTrips = trips.filter((trip) => normalizeBoatType(trip.boatType) === key);
        const boatTypeBoats = boats.filter((boat) => normalizeBoatType(boat.boatType) === key);
        const datasetRow = datasetStats.find((stat) => normalizeBoatType(stat.boatType) === key);
        const artifactRow = modelArtifacts.find(
          (artifact) =>
            artifact.scope === "BOAT_TYPE" &&
            normalizeBoatType(artifact.boatType || "") === key,
        );
        const bestModel = models
          .filter((model) => model.scope === "BOAT_TYPE" && normalizeBoatType(model.boatType) === key)
          .sort((a, b) => {
            if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
            if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
            return Number(a.selectionRank || 99) - Number(b.selectionRank || 99);
          })[0];
        const artifactAccuracy =
          artifactRow?.metrics.mape != null
            ? Math.max(0, Math.min(100, 100 - artifactRow.metrics.mape))
            : 0;
        const registryAccuracy = modelAccuracy(bestModel);

        return {
          boatType: key,
          displayName: analyticsRow?.displayName || datasetRow?.boatType || boatTypeBoats[0]?.boatType || key,
          imageUrl: imageUrl(boatTypeBoats.find((boat) => boat.boatImage)?.boatImage),
          boatCount: boatTypeBoats.length,
          tripCount: boatTypeTrips.length,
          actualTripCount: boatTypeTrips.filter((trip) => Number(trip.actualFuelLiters || 0) > 0).length,
          trainingRows: datasetRow?.totalRows || 0,
          manualTrainingRows: datasetRow?.manualTripRows || 0,
          uploadedTrainingRows: datasetRow?.uploadedDatasetRows || 0,
          artifactRowsUsed: artifactRow?.rowsUsed || 0,
          modelAccuracy: artifactAccuracy || registryAccuracy,
          mape: artifactRow?.metrics.mape || metricValue(bestModel?.metrics, "mape", "MAPE", "averagePredictionError") || 0,
          mae: artifactRow?.metrics.mae || metricValue(bestModel?.metrics, "mae", "MAE") || 0,
          rmse: artifactRow?.metrics.rmse || metricValue(bestModel?.metrics, "rmse", "RMSE") || 0,
          r2: artifactRow?.metrics.r2 || metricValue(bestModel?.metrics, "r2", "R2") || 0,
          coveragePercent: analyticsRow?.coveragePercent || 0,
          jobSuccessRate: analyticsRow?.jobSuccessRate || 0,
          trainingJobs: analyticsRow?.trainingJobs || 0,
          recordsProcessed: analyticsRow?.recordsProcessed || 0,
          backlog: analyticsRow?.backlog || 0,
          lastTrainingAt: artifactRow?.updatedAt || analyticsRow?.lastTrainingAt || null,
          highRiskTrips: boatTypeTrips.filter((trip) => trip.riskCategory === "high").length,
          algorithm: artifactRow?.selectedModel || bestModel?.algorithmType || "No model",
          modelStatus: artifactRow?.modelExists ? "ARTIFACT" : bestModel?.status || "NONE",
          modelSource: artifactRow?.modelExists ? "Colab artifact" : bestModel ? "Registry" : "None",
        };
      })
      .sort(
        (a, b) =>
          b.trainingRows - a.trainingRows ||
          b.tripCount - a.tripCount ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [analytics, boats, datasetStats, modelArtifacts, models, trips]);

  const visibleRows = selectedBoatType === "all"
    ? rows
    : rows.filter((row) => row.boatType === selectedBoatType);

  const totals = useMemo(
    () => ({
      boatTypes: visibleRows.length,
      trips: visibleRows.reduce((sum, row) => sum + row.tripCount, 0),
      trainingRows: visibleRows.reduce((sum, row) => sum + row.trainingRows, 0),
      avgAccuracy:
        visibleRows.length > 0
          ? visibleRows.reduce((sum, row) => sum + row.modelAccuracy, 0) / visibleRows.length
          : 0,
    }),
    [visibleRows],
  );

  if (!canManageFishTrips) {
    return (
      <section className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fish Trip analytics access required</h1>
            <p className="text-gray-600 mt-1">This page is only shown for fisher admin accounts.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Trip Analytics</h1>
          <p className="text-gray-600 mt-1">
            Boat-type model accuracy, training coverage, and trip performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedBoatType}
            onChange={(e) => setSelectedBoatType(e.target.value)}
            className="min-w-56 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All boat types</option>
            {rows.map((row) => (
              <option key={row.boatType} value={row.boatType}>
                {row.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Anchor} label="Boat types" value={totals.boatTypes.toLocaleString()} />
        <MetricCard icon={Database} label="App trips" value={totals.trips.toLocaleString()} />
        <MetricCard icon={Brain} label="Training rows" value={totals.trainingRows.toLocaleString()} />
        <MetricCard icon={Gauge} label="Avg model accuracy" value={formatPercent(totals.avgAccuracy)} />
      </section>

      <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel title="Model accuracy by boat type">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={visibleRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="boatType" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Bar dataKey="modelAccuracy" radius={[6, 6, 0, 0]}>
                {visibleRows.map((_, index) => (
                  <Cell key={`accuracy-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Trips and training coverage">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={visibleRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="boatType" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="tripCount" stroke="#2563eb" strokeWidth={3} name="App trips" />
              <Line type="monotone" dataKey="trainingRows" stroke="#d97706" strokeWidth={3} name="Training rows" />
              <Line
                type="monotone"
                dataKey="coveragePercent"
                stroke="#059669"
                strokeWidth={3}
                name="Coverage %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="mt-6 space-y-4">
        {visibleRows.map((row) => (
          <article key={row.boatType} className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
              <div
                className="min-h-52 bg-gray-100 bg-cover bg-center"
                style={{
                  backgroundImage: row.imageUrl
                    ? `url("${row.imageUrl}")`
                    : "linear-gradient(135deg, #dbeafe, #ccfbf1)",
                }}
              >
                <div className="h-full min-h-52 p-4 flex items-end bg-gradient-to-t from-black/40 to-transparent">
                  <div className="text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide">{row.boatType}</div>
                    <div className="text-lg font-bold">{row.displayName}</div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{row.displayName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {row.algorithm} • {row.modelStatus} • {row.modelSource} • Last training {formatDate(row.lastTrainingAt)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-sm text-gray-500">Model accuracy</div>
                    <div className="text-3xl font-bold text-blue-700">{formatPercent(row.modelAccuracy)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <MiniStat label="Boats" value={row.boatCount.toLocaleString()} />
                  <MiniStat label="App trips" value={row.tripCount.toLocaleString()} />
                  <MiniStat label="Actual logs" value={row.actualTripCount.toLocaleString()} />
                  <MiniStat label="High risk" value={row.highRiskTrips.toLocaleString()} />
                  <MiniStat label="Training rows" value={row.trainingRows.toLocaleString()} />
                  <MiniStat label="Uploaded rows" value={row.uploadedTrainingRows.toLocaleString()} />
                  <MiniStat label="Manual rows" value={row.manualTrainingRows.toLocaleString()} />
                  <MiniStat label="Rows used" value={row.artifactRowsUsed.toLocaleString()} />
                  <MiniStat label="MAPE" value={formatPercent(row.mape)} />
                  <MiniStat label="MAE" value={formatNumber(row.mae)} />
                  <MiniStat label="RMSE" value={formatNumber(row.rmse)} />
                  <MiniStat label="R2" value={formatNumber(row.r2)} />
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Progress label="Training coverage" value={row.coveragePercent} color="bg-emerald-600" />
                  <Progress label="Job success" value={row.jobSuccessRate} color="bg-blue-600" />
                  <Progress label="Backlog" value={row.backlog > 0 ? Math.min(100, row.backlog * 10) : 0} color="bg-amber-600" />
                </div>
              </div>
            </div>
          </article>
        ))}

        {!isLoading && visibleRows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center text-gray-500">
            No boat-type analytics found yet.
          </div>
        ) : null}
      </section>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{formatPercent(value)}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
