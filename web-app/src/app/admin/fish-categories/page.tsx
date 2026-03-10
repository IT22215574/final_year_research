"use client";

import { useCallback, useEffect, useState } from "react";
import { Fish, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useFishCategoryStore } from "@/stores/fishCategoryStore";

export default function FishCategoriesPage() {
  const { categories, isLoading, error, fetchCategories, addCategory, editCategory, removeCategory } =
    useFishCategoryStore();

  const [search, setSearch] = useState("");
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = useCallback(async () => {
    const name = addName.trim();
    if (!name) { setAddError("Name is required"); return; }
    setAddError("");
    setAdding(true);
    try {
      await addCategory(name);
      setAddName("");
    } catch (e: any) {
      setAddError(e?.message ?? "Failed to add category");
    } finally {
      setAdding(false);
    }
  }, [addName, addCategory]);

  const startEdit = (id: string, name: string) => {
    setEditId(id);
    setEditName(name);
    setEditError("");
  };

  const handleEdit = useCallback(async () => {
    const name = editName.trim();
    if (!name) { setEditError("Name is required"); return; }
    if (!editId) return;
    setEditError("");
    setEditSaving(true);
    try {
      await editCategory(editId, name);
      setEditId(null);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update category");
    } finally {
      setEditSaving(false);
    }
  }, [editId, editName, editCategory]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await removeCategory(deleteId);
      setDeleteId(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }, [deleteId, removeCategory]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Fish className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fish Categories</h1>
            <p className="text-sm text-gray-500">{categories.length} categories</p>
          </div>
        </div>
        <button
          onClick={() => fetchCategories()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add New Category</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Category name (e.g. Tuna, Salmon)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
      </div>

      {/* Search + list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? "No categories match your search." : "No categories yet. Add one above."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((cat) => (
              <li key={cat._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                {editId === cat._id ? (
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditId(null); }}
                      className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editError && <span className="text-xs text-red-600">{editError}</span>}
                    <button
                      onClick={handleEdit}
                      disabled={editSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat._id, cat.name)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(cat._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete{" "}
              <strong>{categories.find((c) => c._id === deleteId)?.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
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
