'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, type ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface BoatwiseStats {
  boatType: string;
  boatTypeSlug: string;
  csvFile: string;
  csvSize: number;
  csvRowCount: number;
  csvUpdatedAt: string | null;
  manualTripRows: number;
  uploadedDatasetRows: number;
  totalRows: number;
  readyForTraining: boolean;
}

interface CsvRow {
  __rowKey: string;
  __sourceType: 'manual' | 'upload';
  [key: string]: string | number | null;
}

interface DatasetTableResponse {
  columns: string[];
  rows: CsvRow[];
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message || fallback)
    : error instanceof Error
      ? error.message
      : fallback;

const getApiErrorStatus = (error: unknown) =>
  error && typeof error === 'object' && 'status' in error
    ? (error as ApiError).status
    : undefined;

const logApiError = (label: string, error: unknown) => {
  const message = getErrorMessage(error, 'Unknown request error');
  const status = getApiErrorStatus(error);
  const url =
    error && typeof error === 'object' && 'url' in error
      ? (error as ApiError).url
      : undefined;

  console.warn(label, { message, status, url });
};

export default function DatasetDataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBoatType = searchParams.get('boatType');
  const clearAuth = useAuthStore((s) => s.clear);

  const [boatwiseStats, setBoatwiseStats] = useState<BoatwiseStats[]>([]);
  const [selectedStat, setSelectedStat] = useState<BoatwiseStats | null>(null);
  const [tableData, setTableData] = useState<CsvRow[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [draftRow, setDraftRow] = useState<CsvRow | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const loadBoatwiseStats = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<BoatwiseStats[]>('training-candidates/datasets/stats/boatwise');
      setBoatwiseStats(data || []);
      setSelectedStat((current) => {
        if (!current) return current;
        return (data || []).find((stat) => stat.boatType === current.boatType) || null;
      });
    } catch (error) {
      logApiError('Error loading boat-wise statistics:', error);
      if (getApiErrorStatus(error) === 401) {
        clearAuth();
        router.replace('/sign-in');
        return;
      }
      setLoadError(getErrorMessage(error, 'Could not load boat-wise statistics.'));
      setBoatwiseStats([]);
    } finally {
      setLoading(false);
    }
  }, [clearAuth, router]);

  const loadTableData = useCallback(async (filename: string, boatTypeOverride?: string) => {
    setTableLoading(true);
    setRowError(null);
    setEditingRowKey(null);
    setDraftRow(null);
    try {
      const boatType =
        boatTypeOverride ||
        selectedBoatType ||
        filename.replace(/^training_data_|\.csv$/g, '').toUpperCase();
      const data = await apiFetch<DatasetTableResponse>(
        `training-candidates/datasets/table/${encodeURIComponent(boatType)}`,
      );
      setTableColumns(data.columns || []);
      setTableData(data.rows || []);
    } catch (error) {
      logApiError('Error loading table data:', error);
      if (getApiErrorStatus(error) === 401) {
        clearAuth();
        router.replace('/sign-in');
        return;
      }
      setTableColumns([]);
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  }, [clearAuth, router, selectedBoatType]);

  useEffect(() => {
    loadBoatwiseStats();
  }, [loadBoatwiseStats]);

  useEffect(() => {
    if (selectedBoatType && boatwiseStats.length > 0) {
      const stat = boatwiseStats.find(s => s.boatType === selectedBoatType);
      if (stat) {
        setSelectedStat(stat);
        loadTableData(stat.csvFile, stat.boatType);
      }
    }
  }, [selectedBoatType, boatwiseStats, loadTableData]);

  // Filter and sort data
  const filteredData = tableData
    .filter((row) => {
      // Search across all columns
      if (searchTerm) {
        return tableColumns.some((col) =>
          String(row[col]).toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    })
    .filter((row) => {
      // Filter by specific column
      if (filterColumn && filterValue) {
        return String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = String(a[sortColumn]).toLowerCase();
      const bVal = String(b[sortColumn]).toLowerCase();
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (col: string) => {
    if (sortColumn === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortOrder('asc');
    }
  };

  const isEditableColumn = (col: string) =>
    col === 'boat_id' || col.startsWith('feature_') || col.startsWith('label_');

  const startEdit = (row: CsvRow) => {
    setRowError(null);
    setEditingRowKey(row.__rowKey);
    setDraftRow({ ...row });
  };

  const cancelEdit = () => {
    setEditingRowKey(null);
    setDraftRow(null);
    setRowError(null);
  };

  const updateDraftValue = (col: string, value: string) => {
    setDraftRow((current) => current ? { ...current, [col]: value } : current);
  };

  const saveRow = async () => {
    if (!draftRow || !selectedStat) return;

    setSavingRowKey(draftRow.__rowKey);
    setRowError(null);

    try {
      const values = tableColumns
        .filter(isEditableColumn)
        .reduce<Record<string, string | number | null>>((acc, col) => {
          acc[col] = draftRow[col] ?? '';
          return acc;
        }, {});

      await apiFetch(`training-candidates/datasets/rows/${encodeURIComponent(draftRow.__rowKey)}`, {
        method: 'PUT',
        body: JSON.stringify({ values }),
      });

      await loadTableData(selectedStat.csvFile, selectedStat.boatType);
      await loadBoatwiseStats();
    } catch (error: unknown) {
      setRowError(getErrorMessage(error, 'Could not save dataset row.'));
    } finally {
      setSavingRowKey(null);
    }
  };

  const deleteRow = async (row: CsvRow) => {
    if (!selectedStat) return;

    const confirmed = window.confirm('Delete this dataset row? This will also refresh the training CSV files.');
    if (!confirmed) return;

    setSavingRowKey(row.__rowKey);
    setRowError(null);

    try {
      await apiFetch(`training-candidates/datasets/rows/${encodeURIComponent(row.__rowKey)}`, {
        method: 'DELETE',
      });

      await loadTableData(selectedStat.csvFile, selectedStat.boatType);
      await loadBoatwiseStats();
    } catch (error: unknown) {
      setRowError(getErrorMessage(error, 'Could not delete dataset row.'));
    } finally {
      setSavingRowKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-semibold transition-all"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold">📊 Dataset Viewer</h1>
          <p className="text-blue-100 mt-2">
            View and filter training data by boat type
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Boat Type Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Select Boat Type</h2>
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">Could not load boat types</p>
              <p className="mt-1 text-sm text-red-700">{loadError}</p>
              <button
                onClick={loadBoatwiseStats}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-6">
              <div className="animate-spin w-6 h-6 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading boat types...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {boatwiseStats.map((stat) => (
                <button
                  key={stat.boatTypeSlug}
                  onClick={() => {
                    setSelectedStat(stat);
                    loadTableData(stat.csvFile, stat.boatType);
                    window.history.pushState({}, '', `?boatType=${stat.boatType}`);
                  }}
                  className={`p-4 rounded-lg font-semibold transition-all text-left ${
                    selectedStat?.boatType === stat.boatType
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                      : 'bg-white text-slate-900 border border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="font-bold">{stat.boatType}</div>
                  <div className={`text-xs mt-1 ${selectedStat?.boatType === stat.boatType ? 'text-blue-100' : 'text-slate-500'}`}>
                    {stat.totalRows} rows ({stat.manualTripRows} manual, {stat.uploadedDatasetRows} uploaded)
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters and Search */}
        {selectedStat && !tableLoading && (
          <div className="mb-8 bg-white rounded-xl shadow border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">🔍 Filters & Search</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search across all columns */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🔎 Search All Columns
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter by column */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  📋 Column to Filter
                </label>
                <select
                  value={filterColumn}
                  onChange={(e) => {
                    setFilterColumn(e.target.value);
                    setFilterValue('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select column...</option>
                  {tableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter value */}
              {filterColumn && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Filter Value
                  </label>
                  <input
                    type="text"
                    placeholder={`Filter ${filterColumn}...`}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Clear filters */}
            {(searchTerm || filterValue || sortColumn) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterColumn('');
                  setFilterValue('');
                  setSortColumn('');
                }}
                className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-all"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Data Statistics */}
        {selectedStat && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <p className="text-slate-600 text-sm">Total Rows</p>
              <p className="text-3xl font-bold text-slate-900">{selectedStat.totalRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <p className="text-slate-600 text-sm">📱 Manual Trips</p>
              <p className="text-3xl font-bold text-blue-600">{selectedStat.manualTripRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <p className="text-slate-600 text-sm">📤 Uploaded</p>
              <p className="text-3xl font-bold text-purple-600">{selectedStat.uploadedDatasetRows}</p>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <p className="text-slate-600 text-sm">Filtered Results</p>
              <p className="text-3xl font-bold text-slate-900">{filteredData.length}</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {selectedStat && (
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            {rowError && (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {rowError}
              </div>
            )}
            {tableLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto"></div>
                  <p className="text-slate-600 mt-3">Loading data...</p>
                </div>
              </div>
            ) : tableColumns.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-600">No data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900 bg-slate-100 sticky left-0 z-10 w-12">
                        #
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">
                        Actions
                      </th>
                      {tableColumns.map((col) => (
                        <th
                          key={col}
                          onClick={() => toggleSort(col)}
                          className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            {col}
                            {sortColumn === col && (
                              <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={tableColumns.length + 2} className="px-4 py-8 text-center text-slate-500">
                          No matching data found
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-200 hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-600 bg-white sticky left-0 z-10 w-12">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingRowKey === row.__rowKey ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={saveRow}
                                  disabled={savingRowKey === row.__rowKey}
                                  className="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:bg-slate-300"
                                >
                                  {savingRowKey === row.__rowKey ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={savingRowKey === row.__rowKey}
                                  className="px-3 py-1 rounded bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEdit(row)}
                                  disabled={!!savingRowKey}
                                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-300"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteRow(row)}
                                  disabled={!!savingRowKey}
                                  className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:bg-slate-300"
                                >
                                  {savingRowKey === row.__rowKey ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            )}
                          </td>
                          {tableColumns.map((col) => (
                            <td
                              key={`${idx}-${col}`}
                              className="px-4 py-3 text-slate-900 whitespace-nowrap"
                            >
                              {editingRowKey === row.__rowKey && draftRow && isEditableColumn(col) ? (
                                <input
                                  value={String(draftRow[col] ?? '')}
                                  onChange={(e) => updateDraftValue(col, e.target.value)}
                                  className="w-36 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <div className="max-w-xs overflow-hidden text-ellipsis" title={String(row[col] ?? '')}>
                                  {row[col]}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedStat && !loading && !loadError && (
          <div className="text-center py-12 bg-white rounded-xl shadow border border-slate-200">
            <p className="text-slate-600 text-lg">Select a boat type to view data</p>
          </div>
        )}
      </div>
    </div>
  );
}
