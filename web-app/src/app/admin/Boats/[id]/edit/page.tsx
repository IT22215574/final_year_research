"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Anchor,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { useBoatStore } from "@/stores/boatStore";

export default function EditBoatPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const {
    selectedBoat,
    boatTypes,
    isLoading,
    error,
    fetchBoatById,
    fetchBoatTypes,
    editBoat,
    clearSelectedBoat,
  } = useBoatStore();

  const [form, setForm] = useState({
    boatName: "",
    boatType: "",
    engineHorsePower: "",
    boatLength: "",
    boatWidth: "",
    boatValue: "",
    fuelEfficiencyFactor: "",
    engineDegradationFactor: "",
    averageFuelPredictionError: "",
    mode: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBoatById(id);
    fetchBoatTypes();

    return () => {
      clearSelectedBoat();
    };
  }, [id, fetchBoatById, fetchBoatTypes, clearSelectedBoat]);

  useEffect(() => {
    if (!selectedBoat) return;

    setForm({
      boatName: selectedBoat.boatName ?? "",
      boatType: selectedBoat.boatType ?? "",
      engineHorsePower: String(selectedBoat.engineHorsePower ?? ""),
      boatLength: selectedBoat.boatLength != null ? String(selectedBoat.boatLength) : "",
      boatWidth: selectedBoat.boatWidth != null ? String(selectedBoat.boatWidth) : "",
      boatValue: selectedBoat.boatValue != null ? String(selectedBoat.boatValue) : "",
      fuelEfficiencyFactor:
        selectedBoat.fuelEfficiencyFactor != null
          ? String(selectedBoat.fuelEfficiencyFactor)
          : "",
      engineDegradationFactor:
        selectedBoat.engineDegradationFactor != null
          ? String(selectedBoat.engineDegradationFactor)
          : "",
      averageFuelPredictionError:
        selectedBoat.averageFuelPredictionError != null
          ? String(selectedBoat.averageFuelPredictionError)
          : "",
      mode: selectedBoat.mode ?? "",
    });

    if (selectedBoat.boatImage) {
      setPreview(`${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}${selectedBoat.boatImage}`);
    }
  }, [selectedBoat]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!form.boatName || !form.boatType || !form.engineHorsePower) {
      setSubmitError("Boat name, type and engine horsepower are required.");
      return;
    }

    setSubmitting(true);

    try {
      await editBoat(id, {
        ...form,
        boatImage: imageFile,
      });

      router.push(`/admin/boats/${id}`);
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to update boat");
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/boats/${id}`}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Anchor className="w-5 h-5" />
            Edit Boat
          </h1>
          <p className="text-gray-500 text-sm">Update boat information</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
      >
        {(submitError || error) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {submitError ?? error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boat Name
          </label>
          <input
            name="boatName"
            value={form.boatName}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boat Type
          </label>
          <select
            name="boatType"
            value={form.boatType}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select boat type</option>
            {boatTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engine Horsepower
          </label>
          <input
            name="engineHorsePower"
            type="number"
            value={form.engineHorsePower}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boat Length
            </label>
            <input
              name="boatLength"
              type="number"
              value={form.boatLength}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boat Width
            </label>
            <input
              name="boatWidth"
              type="number"
              value={form.boatWidth}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boat Value
          </label>
          <input
            name="boatValue"
            type="number"
            value={form.boatValue}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Fuel Efficiency Factor</label>
            <input
              name="fuelEfficiencyFactor"
              type="number"
              value={form.fuelEfficiencyFactor}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Engine Degradation</label>
            <input
              name="engineDegradationFactor"
              type="number"
              value={form.engineDegradationFactor}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Prediction Error</label>
            <input
              name="averageFuelPredictionError"
              type="number"
              value={form.averageFuelPredictionError}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mode
          </label>
          <input
            name="mode"
            value={form.mode}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Boat Image
          </label>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:bg-gray-50 transition">
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Click to change image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          {preview && (
            <img
              src={preview}
              alt="preview"
              className="mt-3 w-40 rounded-lg border"
            />
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}