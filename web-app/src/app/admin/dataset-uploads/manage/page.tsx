'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ApiError } from '@/lib/api';

interface Dataset {
  id: string;
  filename: string;
  boatType: string;
  uploadSource: 'csv' | 'json';
  status: string;
  rowCount: number;
  processedCount: number;
  errorCount: number;
  validationErrors: string[];
  createdAt: string;
  reviewedAt?: string;
}

interface PendingResponse {
  count: number;
  datasets: Dataset[];
}

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

interface TrainingCandidate {
  _id: string;
  sourceTripId: string;
  boatId: string;
  boatType: string;
  featuresSnapshot?: Record<string, unknown>;
  labelSnapshot?: Record<string, unknown>;
  status: string;
  createdAt?: string;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function snapshotValue(
  snapshot: Record<string, unknown> | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return '-';
}

export default function DatasetManagementPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tripCandidates, setTripCandidates] = useState<TrainingCandidate[]>([]);
  const [boatwiseStats, setBoatwiseStats] = useState<BoatwiseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripCandidatesLoading, setTripCandidatesLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [candidateProcessingId, setCandidateProcessingId] = useState<string | null>(null);
  const [candidateErrorMessage, setCandidateErrorMessage] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<TrainingCandidate | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCandidateDetails, setShowCandidateDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as ApiError).message === 'string'
    ) {
      return (error as ApiError).message;
    }
    return error instanceof Error ? error.message : fallback;
  }, []);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const endpoint =
        activeTab === 'pending'
          ? 'training-uploads/pending'
          : 'training-uploads/approved';

      const data = await apiFetch<PendingResponse>(endpoint);
      setDatasets(data.datasets || []);
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown error loading datasets');
      console.error('Error loading datasets:', message);
      setErrorMessage(message);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getErrorMessage]);

  const loadTripCandidates = useCallback(async () => {
    setTripCandidatesLoading(true);
    setCandidateErrorMessage(null);
    try {
      const data = await apiFetch<TrainingCandidate[]>('training-candidates/pending');
      setTripCandidates(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown error loading trip-based records');
      console.error('Error loading trip-based records:', message);
      setCandidateErrorMessage(message);
      setTripCandidates([]);
    } finally {
      setTripCandidatesLoading(false);
    }
  }, [getErrorMessage]);

  const loadBoatwiseStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiFetch<BoatwiseStats[]>('training-candidates/datasets/stats/boatwise');
      setBoatwiseStats(data || []);
    } catch (error) {
      const message = getErrorMessage(error, 'Unknown error loading boat-wise statistics');
      console.warn('Error loading boat-wise statistics:', message);
      setBoatwiseStats([]);
    } finally {
      setStatsLoading(false);
    }
  }, [getErrorMessage]);

  useEffect(() => {
    loadDatasets();
    loadTripCandidates();
    loadBoatwiseStats();
  }, [loadDatasets, loadTripCandidates, loadBoatwiseStats]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this dataset for training?')) return;

    setApproving(id);
    try {
      await apiFetch(`training-uploads/${id}/approve`, {
        method: 'POST',
      });

      // Reload datasets and stats
      await loadDatasets();
      await loadBoatwiseStats();
      setShowDetails(false);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to approve dataset');
      console.error('Error approving dataset:', message);
      alert(message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reject reason:');
    if (!reason) return;

    setRejecting(id);
    try {
      await apiFetch(`training-uploads/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      // Reload datasets and stats
      await loadDatasets();
      await loadBoatwiseStats();
      setShowDetails(false);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reject dataset');
      console.error('Error rejecting dataset:', message);
      alert(message);
    } finally {
      setRejecting(null);
    }
  };

  const handleApproveTripCandidate = async (id: string) => {
    if (!confirm('Approve this trip record for model training?')) return;

    setCandidateProcessingId(id);
    try {
      await apiFetch(`training-candidates/${id}/approve`, {
        method: 'POST',
      });

      await loadTripCandidates();
      await loadBoatwiseStats();
      setShowCandidateDetails(false);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to approve trip record');
      console.error('Error approving trip record:', message);
      alert(message);
    } finally {
      setCandidateProcessingId(null);
    }
  };

  const handleRejectTripCandidate = async (id: string) => {
    const reason = prompt('Reject reason:');
    if (!reason) return;

    setCandidateProcessingId(id);
    try {
      await apiFetch(`training-candidates/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      await loadTripCandidates();
      await loadBoatwiseStats();
      setShowCandidateDetails(false);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to reject trip record');
      console.error('Error rejecting trip record:', message);
      alert(message);
    } finally {
      setCandidateProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      TRAINED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            📊 Dataset Management
          </h1>
          <p className="text-slate-600">
            Review and approve uploaded training datasets
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>ℹ️ Note:</strong> This section shows datasets uploaded via CSV/JSON files. 
              Manual trip entries (entered through the app) are stored separately and are merged automatically 
              when generating training files for each boat type.
            </p>
          </div>
        </div>

        {/* Trip-based Pending Records */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Trip-Based Pending Records</h2>
              <p className="text-slate-600 text-sm mt-1">
                Review app-logged actual fuel and cost records before they enter model training.
              </p>
            </div>
            <button
              onClick={loadTripCandidates}
              disabled={tripCandidatesLoading || !!candidateProcessingId}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {tripCandidatesLoading ? 'Refreshing...' : 'Refresh Trip Records'}
            </button>
          </div>

          {candidateErrorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">Error loading trip records</p>
              <p className="text-red-700 text-sm mt-2">{candidateErrorMessage}</p>
            </div>
          )}

          {tripCandidatesLoading ? (
            <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
              <div className="inline-block">
                <div className="animate-spin w-6 h-6 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="text-slate-600 mt-2">Loading trip records...</p>
            </div>
          ) : tripCandidates.length === 0 && !candidateErrorMessage ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-600 font-medium">No pending trip-based records</p>
              <p className="text-slate-500 text-sm mt-2">
                New records appear here after fishermen log actual trip fuel and cost.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tripCandidates.map((candidate) => {
                const distance = snapshotValue(candidate.featuresSnapshot, 'distanceKm', 'distance');
                const fuel = snapshotValue(candidate.labelSnapshot, 'actualFuelLiters', 'fuelUsedLiters');
                const cost = snapshotValue(candidate.labelSnapshot, 'actualCost', 'totalCost');
                const isProcessing = candidateProcessingId === candidate._id;

                return (
                  <div
                    key={candidate._id}
                    className="bg-white rounded-xl shadow border border-slate-200 p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {candidate.boatType || 'Unknown boat type'}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(candidate.status)}`}>
                            {candidate.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-slate-600 text-xs">Distance</p>
                            <p className="font-semibold text-slate-900">{formatValue(distance)} km</p>
                          </div>
                          <div>
                            <p className="text-slate-600 text-xs">Actual Fuel</p>
                            <p className="font-semibold text-slate-900">{formatValue(fuel)} L</p>
                          </div>
                          <div>
                            <p className="text-slate-600 text-xs">Actual Cost</p>
                            <p className="font-semibold text-slate-900">Rs. {formatValue(cost)}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 text-xs">Logged</p>
                            <p className="font-semibold text-slate-900">
                              {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
                          <p className="truncate">Source trip: {candidate.sourceTripId || '-'}</p>
                          <p className="truncate">Boat ID: {candidate.boatId || '-'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row xl:flex-col gap-2 xl:min-w-40">
                        <button
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setShowCandidateDetails(true);
                          }}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleApproveTripCandidate(candidate._id)}
                          disabled={!!candidateProcessingId}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectTripCandidate(candidate._id)}
                          disabled={!!candidateProcessingId}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Boat-wise Dataset Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">🚤 Training Data by Boat Type</h2>
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="animate-spin w-6 h-6 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="text-slate-600 mt-2">Loading statistics...</p>
            </div>
          ) : boatwiseStats.length === 0 ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 text-center">
              <p className="text-slate-600">No boat types with training data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boatwiseStats.map((stat) => (
                <div
                  key={stat.boatTypeSlug}
                  className={`rounded-xl shadow border p-5 transition-all ${
                    stat.readyForTraining
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {stat.boatType}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {stat.csvFile}
                      </p>
                    </div>
                    {stat.readyForTraining && (
                      <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Rows</span>
                      <span className="font-semibold text-lg text-slate-900">
                        {stat.totalRows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-600">
                        📱 Manual Trips
                      </span>
                      <span className="font-semibold text-blue-600">
                        {stat.manualTripRows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">
                        📤 Uploaded Rows
                      </span>
                      <span className="font-semibold text-purple-600">
                        {stat.uploadedDatasetRows}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <span>File Size</span>
                      <span>{formatFileSize(stat.csvSize)}</span>
                    </div>
                    {stat.csvUpdatedAt && (
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Updated</span>
                        <span>
                          {new Date(stat.csvUpdatedAt).toLocaleDateString()} at{' '}
                          {new Date(stat.csvUpdatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/admin/dataset-data?boatType=${stat.boatType}`}
                    className="mt-4 block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                  >
                    📊 View Data Table
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⏳ Pending ({datasets.filter((d) => d.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'approved'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✓ Approved ({datasets.filter((d) => d.status === 'APPROVED').length})
          </button>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">⚠️ Error Loading Datasets</p>
            <p className="text-red-700 text-sm mt-2">{errorMessage}</p>
            <button
              onClick={loadDatasets}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
            </div>
            <p className="text-slate-600 mt-3">Loading datasets...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && datasets.length === 0 && !errorMessage && (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-600 font-medium">No datasets {activeTab}</p>
            <p className="text-slate-500 text-sm mt-2">
              {activeTab === 'pending' 
                ? 'Upload CSV/JSON files to see them here'
                : 'No approved datasets yet'}
            </p>
          </div>
        )}

        {/* Dataset List */}
        {!loading && datasets.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="bg-white rounded-xl shadow border border-slate-200 p-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {dataset.filename}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getStatusBadge(dataset.status)}`}
                      >
                        {dataset.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600 text-xs">Boat Type</p>
                        <p className="font-semibold text-slate-900">
                          {dataset.boatType}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Format</p>
                        <p className="font-semibold text-slate-900 uppercase">
                          {dataset.uploadSource}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Total Rows</p>
                        <p className="font-semibold text-slate-900">
                          {dataset.rowCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Valid</p>
                        <p className="font-semibold text-green-600">
                          {dataset.processedCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Issues</p>
                        <p
                          className={`font-semibold ${
                            dataset.errorCount > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {dataset.errorCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setSelectedDataset(dataset);
                        setShowDetails(true);
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
                    >
                      👁️ View Details
                    </button>

                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(dataset.id)}
                          disabled={approving === dataset.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {approving === dataset.id ? '⏳' : '✓'} Approve
                        </button>
                        <button
                          onClick={() => handleReject(dataset.id)}
                          disabled={rejecting === dataset.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          {rejecting === dataset.id ? '⏳' : '✕'} Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedDataset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedDataset.filename}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-slate-600 text-sm mb-1">Boat Type</p>
                <p className="font-semibold">{selectedDataset.boatType}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Status</p>
                <p className="font-semibold">{selectedDataset.status}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Format</p>
                <p className="font-semibold">{selectedDataset.uploadSource}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Total Rows</p>
                <p className="font-semibold">{selectedDataset.rowCount}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Valid Rows</p>
                <p className="font-semibold text-green-600">
                  {selectedDataset.processedCount}
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Invalid Rows</p>
                <p className="font-semibold text-red-600">
                  {selectedDataset.errorCount}
                </p>
              </div>
            </div>

            {/* Validation Errors */}
            {selectedDataset.validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-semibold mb-3">
                  ⚠️ Validation Issues ({selectedDataset.validationErrors.length})
                </p>
                <ul className="text-yellow-700 text-sm space-y-1 max-h-32 overflow-y-auto">
                  {selectedDataset.validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
              >
                Close
              </button>
              {activeTab === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedDataset.id)}
                    disabled={rejecting === selectedDataset.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedDataset.id)}
                    disabled={approving === selectedDataset.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trip Candidate Details Modal */}
      {showCandidateDetails && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Trip Training Record
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedCandidate.boatType} • {selectedCandidate.sourceTripId}
                </p>
              </div>
              <button
                onClick={() => setShowCandidateDetails(false)}
                className="text-slate-500 hover:text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-slate-600 text-sm mb-1">Boat Type</p>
                <p className="font-semibold">{selectedCandidate.boatType}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Status</p>
                <p className="font-semibold">{selectedCandidate.status}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Boat ID</p>
                <p className="font-semibold break-all">{selectedCandidate.boatId}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Source Trip</p>
                <p className="font-semibold break-all">{selectedCandidate.sourceTripId}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm mb-1">Created</p>
                <p className="font-semibold">
                  {selectedCandidate.createdAt
                    ? new Date(selectedCandidate.createdAt).toLocaleString()
                    : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 mb-3">Feature Snapshot</h3>
                {Object.entries(selectedCandidate.featuresSnapshot || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">No feature data available.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(selectedCandidate.featuresSnapshot || {}).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-500">{key}</p>
                        <p className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                          {formatValue(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 mb-3">Label Snapshot</h3>
                {Object.entries(selectedCandidate.labelSnapshot || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">No label data available.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(selectedCandidate.labelSnapshot || {}).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-500">{key}</p>
                        <p className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                          {formatValue(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCandidateDetails(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => handleRejectTripCandidate(selectedCandidate._id)}
                disabled={!!candidateProcessingId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleApproveTripCandidate(selectedCandidate._id)}
                disabled={!!candidateProcessingId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

