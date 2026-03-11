"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Anchor,
  Brain,
  Pencil,
  Gauge,
  Ruler,
  Image as ImageIcon,
  Calendar,
  BadgeDollarSign,
} from "lucide-react";
import { useBoatStore } from "@/stores/boatStore";

export default function AdminBoatDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    selectedBoat,
    isLoading,
    error,
    fetchBoatById,
    clearSelectedBoat,
  } = useBoatStore();

  useEffect(() => {
    fetchBoatById(id);

    return () => {
      clearSelectedBoat();
    };
  }, [id, fetchBoatById, clearSelectedBoat]);

  if (isLoading && !selectedBoat) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading boat...</p>
      </div>
    );
  }

  if (error && !selectedBoat) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-900">Error Loading Boat</h2>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  if (!selectedBoat) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-yellow-900">Boat not found</h2>
      </div>
    );
  }

  const boat = selectedBoat;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/boats"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {boat.boatName}
            </h1>
            <p className="text-gray-600 mt-1">{boat.boatType}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/boats/${boat._id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>

          <Link
            href={`/admin/boats/${boat._id}/insights`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Brain className="w-4 h-4" />
            Insights
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {boat.boatImage ? (
              <img
                src={`${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}${boat.boatImage}`}
                alt={boat.boatName}
                className="w-full h-72 object-cover"
              />
            ) : (
              <div className="h-72 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <ImageIcon className="w-10 h-10 mb-2" />
                <p className="text-sm">No image uploaded</p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Boat Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard icon={<Anchor className="w-4 h-4" />} label="Boat Name" value={boat.boatName} />
              <InfoCard icon={<Anchor className="w-4 h-4" />} label="Boat Type" value={boat.boatType} />
              <InfoCard icon={<Gauge className="w-4 h-4" />} label="Engine Horsepower" value={`${boat.engineHorsePower} HP`} />
              <InfoCard icon={<Ruler className="w-4 h-4" />} label="Boat Length" value={boat.boatLength ?? "-"} />
              <InfoCard icon={<Ruler className="w-4 h-4" />} label="Boat Width" value={boat.boatWidth ?? "-"} />
              <InfoCard icon={<BadgeDollarSign className="w-4 h-4" />} label="Boat Value" value={boat.boatValue ?? "-"} />
              <InfoCard icon={<Gauge className="w-4 h-4" />} label="Fuel Efficiency Factor" value={boat.fuelEfficiencyFactor ?? "-"} />
              <InfoCard icon={<Gauge className="w-4 h-4" />} label="Engine Degradation Factor" value={boat.engineDegradationFactor ?? "-"} />
              <InfoCard icon={<Gauge className="w-4 h-4" />} label="Average Prediction Error" value={boat.averageFuelPredictionError ?? "-"} />
              <InfoCard icon={<Anchor className="w-4 h-4" />} label="Mode" value={boat.mode ?? "-"} />
              <InfoCard
                icon={<Calendar className="w-4 h-4" />}
                label="Created At"
                value={
                  boat.createdAt
                    ? new Date(boat.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"
                }
              />
              <InfoCard
                icon={<Calendar className="w-4 h-4" />}
                label="Updated At"
                value={
                  boat.updatedAt
                    ? new Date(boat.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}