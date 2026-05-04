"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Anchor,
  Upload,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useBoatStore } from "@/stores/boatStore";

export default function AddBoatPage() {
  const router = useRouter();

  const {
    boatTypes,
    fetchBoatTypes,
    addBoat,
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
    mode: "manual",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoatTypes();
  }, [fetchBoatTypes]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.boatName || !form.boatType || !form.engineHorsePower) {
      setError("Boat name, type and engine horsepower are required.");
      return;
    }

    setSubmitting(true);

    try {
      await addBoat({
        ...form,
        boatImage: imageFile,
      });

      router.push("/admin/boats");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create boat");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/boats"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Anchor className="w-5 h-5" />
            Add Boat
          </h1>
          <p className="text-gray-500 text-sm">
            Register a new fishing boat
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5"
      >

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Boat Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boat Name
          </label>
          <input
            name="boatName"
            value={form.boatName}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            placeholder="Example: Sea Dragon"
          />
        </div>

        {/* Boat Type */}
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

        {/* Engine HP */}
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
            placeholder="Example: 85"
          />
        </div>

        {/* Dimensions */}
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

        {/* Boat Value */}
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

        {/* ML Factors */}
        <div className="grid grid-cols-3 gap-4">

          <div>
            <label className="text-sm text-gray-600">
              Fuel Efficiency Factor
            </label>
            <input
              name="fuelEfficiencyFactor"
              type="number"
              value={form.fuelEfficiencyFactor}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">
              Engine Degradation
            </label>
            <input
              name="engineDegradationFactor"
              type="number"
              value={form.engineDegradationFactor}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">
              Prediction Error
            </label>
            <input
              name="averageFuelPredictionError"
              type="number"
              value={form.averageFuelPredictionError}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

        </div>

        {/* Image Upload */}
        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Boat Image
          </label>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:bg-gray-50 transition">
            <Upload className="w-6 h-6 text-gray-400 mb-2" />

            <span className="text-sm text-gray-500">
              Click to upload image
            </span>

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

        {/* Submit */}
        <div className="pt-4 flex justify-end">

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Boat
              </>
            )}
          </button>

        </div>

      </form>
    </div>
  );
}