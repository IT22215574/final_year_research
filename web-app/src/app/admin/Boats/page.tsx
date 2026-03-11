"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Trash2,
  Plus,
  Anchor,
  Activity,
  Gauge,
  Ruler,
  Image as ImageIcon,
  Brain,
  Pencil,
} from "lucide-react";
import { useBoatStore } from "@/stores/boatStore";

function getBoatInitials(name: string): string {
  const safeName = (name || "").trim();
  if (!safeName) return "BT";

  const parts = safeName.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function boatBadgeColor(type?: string): string {
  const value = (type ?? "").toLowerCase();

  if (value.includes("multi")) return "bg-violet-100 text-violet-700";
  if (value.includes("day")) return "bg-blue-100 text-blue-700";
  if (value.includes("trawl")) return "bg-emerald-100 text-emerald-700";
  if (value.includes("canoe")) return "bg-amber-100 text-amber-700";

  return "bg-gray-100 text-gray-700";
}

function avatarColor(id: string): string {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-violet-500 to-violet-600",
    "from-cyan-500 to-cyan-600",
    "from-rose-500 to-rose-600",
  ];
  const idx = id?.charCodeAt(0) ?? 0;
  return colors[idx % colors.length];
}

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function AdminBoatsPage() {
  const { boats, isLoading, error, fetchBoats, removeBoat } = useBoatStore();

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = [...boats];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (boat) =>
          boat.boatName?.toLowerCase().includes(q) ||
          boat.boatType?.toLowerCase().includes(q) ||
          String(boat.engineHorsePower ?? "").includes(q),
      );
    }

    return list;
  }, [boats, search]);

  const stats = useMemo(() => {
    const total = boats.length;
    const withImages = boats.filter((b) => !!b.boatImage).length;
    const withFactors = boats.filter(
      (b) =>
        b.fuelEfficiencyFactor !== undefined ||
        b.engineDegradationFactor !== undefined,
    ).length;

    const averageHp =
      total > 0
        ? Math.round(
            boats.reduce(
              (sum, b) => sum + (Number(b.engineHorsePower) || 0),
              0,
            ) / total,
          )
        : 0;

    return { total, withImages, withFactors, averageHp };
  }, [boats]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);

    try {
      await removeBoat(id);
    } catch (e: any) {
      setDeleteError(e?.message ?? "Failed to delete boat");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Boats
          </h1>
          <p className="mt-1 text-gray-600">
            {isLoading
              ? "Loading…"
              : `${stats.total.toLocaleString()} registered boats`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBoats()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <Link
            href="/admin/boats/add"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Boat
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Boats",
            value: stats.total,
            color: "text-blue-600",
          },
          {
            label: "Avg Engine HP",
            value: stats.averageHp,
            color: "text-emerald-600",
          },
          {
            label: "With Images",
            value: stats.withImages,
            color: "text-amber-600",
          },
          {
            label: "With ML Factors",
            value: stats.withFactors,
            color: "text-violet-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="mb-1 text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by boat name, type, or engine HP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Clear search
            </button>
          )}
        </div>

        <div className="border-b border-gray-100 bg-gray-50 px-5 py-2.5 text-xs font-medium text-gray-500">
          {isLoading
            ? "Loading boats…"
            : `Showing ${filtered.length} of ${boats.length} boats`}
        </div>

        {(error || deleteError) && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error ?? deleteError}
          </div>
        )}

        {isLoading && boats.length === 0 && (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-gray-200" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-40 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
                  </div>
                  <div className="hidden h-8 w-24 rounded bg-gray-200 sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Anchor className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700">
              No boats found
            </p>
            <p className="mt-1 max-w-sm text-sm text-gray-400">
              {search
                ? "Try adjusting your search."
                : "No boats are registered yet."}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3 p-4">
            {filtered.map((boat) => (
              <div
                key={boat._id}
                className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {boat.boatImage ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}${boat.boatImage}`}
                        alt={boat.boatName || "Boat"}
                        className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(
                          boat._id,
                        )} text-sm font-bold text-white shadow-sm`}
                      >
                        {getBoatInitials(boat.boatName || "B")}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                          {boat.boatName || "Unnamed Boat"}
                        </h2>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${boatBadgeColor(
                            boat.boatType,
                          )}`}
                        >
                          {boat.boatType || "Unknown Type"}
                        </span>

                        {boat.boatImage && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 sm:text-xs">
                            <ImageIcon className="h-3 w-3" />
                            Image
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="h-3 w-3 shrink-0" />
                          {formatValue(boat.engineHorsePower)} HP
                        </span>

                        {boat.boatLength !== undefined && (
                          <span className="inline-flex items-center gap-1">
                            <Ruler className="h-3 w-3 shrink-0" />L{" "}
                            {formatValue(boat.boatLength)}
                          </span>
                        )}

                        {boat.boatWidth !== undefined && (
                          <span className="inline-flex items-center gap-1">
                            <Ruler className="h-3 w-3 shrink-0" />W{" "}
                            {formatValue(boat.boatWidth)}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-violet-600">
                          <Activity className="h-3 w-3 shrink-0" />
                          FE {formatValue(boat.fuelEfficiencyFactor)}
                        </span>

                        <span className="text-gray-500">
                          ED {formatValue(boat.engineDegradationFactor)}
                        </span>

                        <span className="text-gray-500">
                          Error {formatValue(boat.averageFuelPredictionError)}
                        </span>

                        {boat.boatValue !== undefined && (
                          <span className="text-gray-500">
                            Value {formatValue(boat.boatValue)}
                          </span>
                        )}

                        {boat.createdAt && (
                          <span className="text-gray-400">
                            Added {formatDate(boat.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Link
                      href={`/admin/Boats/${boat._id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:text-sm"
                    >
                      <Anchor className="h-4 w-4" />
                      View
                    </Link>

                    <Link
                      href={`/admin/Boats/${boat._id}/edit`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>

                    <Link
                      href={`/admin/Boats/${boat._id}/insights`}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:text-sm"
                    >
                      <Brain className="h-4 w-4" />
                      Insights
                    </Link>

                    {confirmDeleteId === boat._id ? (
                      <div className="ml-0 flex items-center gap-2 sm:ml-1">
                        <span className="hidden text-xs text-gray-600 sm:block">
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(boat._id)}
                          disabled={deletingId === boat._id}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingId === boat._id ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmDeleteId(boat._id);
                          setDeleteError(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600 sm:text-sm"
                        title="Delete boat"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-right text-xs text-gray-400">
            {filtered.length} boat{filtered.length !== 1 ? "s" : ""} displayed
          </div>
        )}
      </div>
    </>
  );
}
