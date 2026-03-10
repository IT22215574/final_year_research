"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { env } from "@/lib/env";
import { useFishCategoryStore } from "@/stores/fishCategoryStore";
import { useFishMarketStore } from "@/stores/fishMarketStore";
import type {
  FishMarketEntry,
  CreateFishMarketPayload,
  FishMarketCategory,
} from "@/lib/fishMarketApi";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const serverBase = env.apiBaseUrl.replace(/\/api\/v1\/?$/, "");
const imgSrc = (p: string) =>
  p.startsWith("http") ? p : `${serverBase}/${p.replace(/^\//, "")}`;

function toLocalDate(iso: string) {
  // ISO UTC midnight → local YYYY-MM-DD string
  return iso.slice(0, 10);
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const GRADES = ["Premium", "Grade A", "Grade B", "Grade C", "Reject"];

function categoryName(entry: FishMarketEntry) {
  return typeof entry.categoryId === "object" && entry.categoryId !== null
    ? (entry.categoryId as FishMarketCategory).name
    : String(entry.categoryId);
}

/* ─── Empty form state ───────────────────────────────────────────────────── */

type FormState = {
  categoryId: string;
  grade: string;
  wholesalePrice: string;
  price: string;
  numberOfKilos: string;
  catchingAreaName: string;
  marketDate: string;
  imageFiles: File[];
};

function emptyForm(date: string): FormState {
  return {
    categoryId: "",
    grade: "Grade A",
    wholesalePrice: "",
    price: "",
    numberOfKilos: "",
    catchingAreaName: "",
    marketDate: date,
    imageFiles: [],
  };
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function FishMarketPage() {
  const { categories, fetchCategories } = useFishCategoryStore();
  const {
    entries,
    availableDates,
    isLoading,
    error,
    fetchEntries,
    fetchDates,
    addEntry,
    editEntry,
    removeEntry,
  } = useFishMarketStore();

  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FishMarketEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FishMarketEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm(todayLocal()));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [replaceImages, setReplaceImages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    fetchCategories();
    fetchDates();
  }, [fetchCategories, fetchDates]);

  // Fetch entries when date changes
  useEffect(() => {
    fetchEntries({ date: selectedDate });
  }, [selectedDate, fetchEntries]);

  // Clean up preview URLs
  useEffect(() => {
    return () => previewUrls.forEach(URL.revokeObjectURL);
  }, [previewUrls]);

  /* ── Date navigation ── */
  const goDate = (d: string) => {
    setSelectedDate(d);
  };

  /* ── Open Add modal ── */
  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm(selectedDate));
    setPreviewUrls([]);
    setReplaceImages(false);
    setFormError("");
    setShowModal(true);
  };

  /* ── Open Edit modal ── */
  const openEdit = (entry: FishMarketEntry) => {
    setEditTarget(entry);
    const catId =
      typeof entry.categoryId === "object"
        ? entry.categoryId._id
        : entry.categoryId;
    setForm({
      categoryId: catId,
      grade: entry.grade,
      wholesalePrice: String(entry.wholesalePrice),
      price: String(entry.price),
      numberOfKilos: String(entry.numberOfKilos),
      catchingAreaName: entry.catchingAreaName,
      marketDate: toLocalDate(entry.marketDate),
      imageFiles: [],
    });
    setPreviewUrls([]);
    setReplaceImages(false);
    setFormError("");
    setShowModal(true);
  };

  /* ── File picker ── */
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setForm((f) => ({ ...f, imageFiles: files }));
    previewUrls.forEach(URL.revokeObjectURL);
    setPreviewUrls(files.map(URL.createObjectURL));
  };

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!form.categoryId) { setFormError("Select a fish category"); return; }
    if (!form.grade) { setFormError("Grade is required"); return; }
    if (!form.wholesalePrice || isNaN(+form.wholesalePrice)) { setFormError("Valid wholesale price required"); return; }
    if (!form.price || isNaN(+form.price)) { setFormError("Valid retail price required"); return; }
    if (!form.numberOfKilos || isNaN(+form.numberOfKilos)) { setFormError("Valid quantity required"); return; }
    if (!form.catchingAreaName.trim()) { setFormError("Catching area is required"); return; }

    setFormError("");
    setSaving(true);
    try {
      const payload: CreateFishMarketPayload = {
        categoryId: form.categoryId,
        grade: form.grade,
        wholesalePrice: +form.wholesalePrice,
        price: +form.price,
        numberOfKilos: +form.numberOfKilos,
        catchingAreaName: form.catchingAreaName.trim(),
        marketDate: form.marketDate,
        imageFiles: form.imageFiles,
      };

      if (editTarget) {
        await editEntry(editTarget._id, { ...payload, replaceImages });
      } else {
        await addEntry(payload);
      }

      // Refresh dates list after adding
      fetchDates();
      setShowModal(false);
    } catch (e: any) {
      setFormError(e?.message ?? "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }, [form, replaceImages, editTarget, addEntry, editEntry, fetchDates]);

  /* ── Delete ── */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeEntry(deleteTarget._id);
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, removeEntry]);

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Store className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Fish Market</h1>
            <p className="text-sm text-gray-500">{entries.length} entries for {formatDisplayDate(selectedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchEntries({ date: selectedDate }); fetchDates(); }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Date navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goDate(addDays(selectedDate, -1))}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && goDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => goDate(addDays(selectedDate, 1))}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => goDate(todayLocal())}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-200"
          >
            Today
          </button>
        </div>

        {/* Quick date chips from available dates */}
        {availableDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableDates.slice(0, 10).map((d) => {
              const label = d.slice(0, 10);
              return (
                <button
                  key={d}
                  onClick={() => goDate(label)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedDate === label
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entries grid */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Store className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 text-sm">No market entries for this date.</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Add First Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => setDeleteTarget(entry)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <EntryModal
          form={form}
          setForm={setForm}
          categories={categories}
          previewUrls={previewUrls}
          fileRef={fileRef}
          onFileChange={onFileChange}
          formError={formError}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          isEdit={!!editTarget}
          existingImages={editTarget?.images ?? []}
          replaceImages={replaceImages}
          setReplaceImages={setReplaceImages}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Entry?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Delete <strong>{categoryName(deleteTarget)}</strong> — {deleteTarget.grade} —{" "}
              {deleteTarget.numberOfKilos} kg? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Entry Card ─────────────────────────────────────────────────────────── */

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: FishMarketEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const first = entry.images?.[0];
  const grade = entry.grade;
  const gradeColor =
    grade === "Premium"
      ? "bg-purple-100 text-purple-700"
      : grade === "Grade A"
      ? "bg-green-100 text-green-700"
      : grade === "Grade B"
      ? "bg-blue-100 text-blue-700"
      : grade === "Grade C"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-600";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Image */}
      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {first ? (
          <img
            src={imgSrc(first)}
            alt={categoryName(entry)}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-10 h-10 text-gray-300" />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {categoryName(entry)}
            </h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${gradeColor}`}>
              {grade}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">Wholesale</span>
            <div className="font-semibold text-gray-800">Rs {entry.wholesalePrice.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-400">Retail</span>
            <div className="font-semibold text-gray-800">Rs {entry.price.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-400">Quantity</span>
            <div className="font-semibold text-gray-800">{entry.numberOfKilos} kg</div>
          </div>
          <div className="truncate">
            <span className="text-gray-400">Area</span>
            <div className="font-semibold text-gray-800 truncate">{entry.catchingAreaName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Entry Modal ────────────────────────────────────────────────────────── */

type ModalProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  categories: { _id: string; name: string }[];
  previewUrls: string[];
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formError: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
  existingImages: string[];
  replaceImages: boolean;
  setReplaceImages: (v: boolean) => void;
};

function EntryModal({
  form,
  setForm,
  categories,
  previewUrls,
  fileRef,
  onFileChange,
  formError,
  saving,
  onSave,
  onClose,
  isEdit,
  existingImages,
  replaceImages,
  setReplaceImages,
}: ModalProps) {
  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Entry" : "Add Market Entry"}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fish Category *</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— Select category —</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Grade *</label>
            <select
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Prices row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Wholesale Price (Rs) *</label>
              <input
                type="number"
                min={0}
                value={form.wholesalePrice}
                onChange={(e) => set("wholesalePrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Retail Price (Rs) *</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Kilos + Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity (kg) *</label>
              <input
                type="number"
                min={0}
                value={form.numberOfKilos}
                onChange={(e) => set("numberOfKilos", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Market Date *</label>
              <input
                type="date"
                value={form.marketDate}
                onChange={(e) => set("marketDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catching Area *</label>
            <input
              type="text"
              value={form.catchingAreaName}
              onChange={(e) => set("catchingAreaName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Negombo Lagoon"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Images (optional)</label>

            {/* Existing images when editing */}
            {isEdit && existingImages.length > 0 && (
              <div className="mb-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((img, i) => (
                    <img
                      key={i}
                      src={imgSrc(img)}
                      alt="existing"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceImages}
                    onChange={(e) => setReplaceImages(e.target.checked)}
                    className="rounded"
                  />
                  Replace existing images with new uploads
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full justify-center"
            >
              <Upload className="w-4 h-4" />
              {form.imageFiles.length > 0
                ? `${form.imageFiles.length} file(s) selected`
                : "Click to upload images"}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />

            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {previewUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {formError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
