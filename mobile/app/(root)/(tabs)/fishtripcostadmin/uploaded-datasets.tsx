import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPendingUploads,
  getApprovedUploads,
  approveUpload,
  rejectUpload,
  UploadedDatasetItem,
} from '@/services/uploadedDatasetService';

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100';
    case 'APPROVED':
      return 'bg-green-100';
    case 'TRAINED':
      return 'bg-blue-100';
    case 'REJECTED':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'text-yellow-800';
    case 'APPROVED':
      return 'text-green-800';
    case 'TRAINED':
      return 'text-blue-800';
    case 'REJECTED':
      return 'text-red-800';
    default:
      return 'text-gray-800';
  }
};

export default function UploadedDatasetsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [datasets, setDatasets] = useState<UploadedDatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<UploadedDatasetItem | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const data =
        activeTab === 'pending' ? await getPendingUploads() : await getApprovedUploads();
      setDatasets(data);
    } catch (error: any) {
      console.error('Error fetching datasets:', error);
      Alert.alert('Error', error?.message || 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDatasets();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    Alert.alert('Approve Dataset', 'Approve this dataset for training?', [
      {
        text: 'Cancel',
        onPress: () => {},
      },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setApproving(id);
            await approveUpload(id);
            Alert.alert('Success', 'Dataset approved');
            await fetchDatasets();
            setShowDetailsModal(false);
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to approve');
          } finally {
            setApproving(null);
          }
        },
      },
    ]);
  };

  const handleRejectClick = (dataset: UploadedDatasetItem) => {
    setSelectedDataset(dataset);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedDataset || !rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason');
      return;
    }

    try {
      setRejecting(selectedDataset.id);
      await rejectUpload(selectedDataset.id, rejectReason);
      Alert.alert('Success', 'Dataset rejected');
      setShowRejectModal(false);
      await fetchDatasets();
      setShowDetailsModal(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to reject');
    } finally {
      setRejecting(null);
    }
  };

  const renderDatasetItem = (item: UploadedDatasetItem) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedDataset(item);
        setShowDetailsModal(true);
      }}
      className="bg-white rounded-xl border border-slate-200 p-4 mb-3 mx-4"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">
            {item.filename}
          </Text>
          <Text className="text-xs text-slate-500 mt-1">
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded ${getStatusColor(item.status)}`}>
          <Text className={`text-xs font-semibold ${getStatusTextColor(item.status)}`}>
            {item.status}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4 mt-3">
        <View>
          <Text className="text-xs text-slate-600">Boat Type</Text>
          <Text className="text-sm font-semibold text-slate-900">{item.boatType}</Text>
        </View>
        <View>
          <Text className="text-xs text-slate-600">Total</Text>
          <Text className="text-sm font-semibold text-slate-900">{item.rowCount}</Text>
        </View>
        <View>
          <Text className="text-xs text-slate-600">Valid</Text>
          <Text className="text-sm font-semibold text-green-600">
            {item.processedCount}
          </Text>
        </View>
        <View>
          <Text className="text-xs text-slate-600">Issues</Text>
          <Text className={`text-sm font-semibold ${
            item.errorCount > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {item.errorCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      className="flex-1 bg-slate-50"
    >
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900">📊 Uploaded Datasets</Text>
        <Text className="text-sm text-slate-600 mt-1">
          Manage CSV/JSON file uploads for training
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          className={`flex-1 py-2 px-4 rounded-lg ${
            activeTab === 'pending'
              ? 'bg-yellow-100 border border-yellow-300'
              : 'bg-slate-100'
          }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === 'pending' ? 'text-yellow-800' : 'text-slate-600'
            }`}
          >
            ⏳ Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('approved')}
          className={`flex-1 py-2 px-4 rounded-lg ${
            activeTab === 'approved'
              ? 'bg-green-100 border border-green-300'
              : 'bg-slate-100'
          }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === 'approved' ? 'text-green-800' : 'text-slate-600'
            }`}
          >
            ✓ Approved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-slate-600 mt-3">Loading datasets...</Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && datasets.length === 0 && (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-4xl mb-3">📭</Text>
          <Text className="text-lg font-semibold text-slate-900">
            No {activeTab} datasets
          </Text>
          <Text className="text-slate-600 text-center mt-2">
            Upload CSV/JSON files from the admin panel to get started
          </Text>
        </View>
      )}

      {/* Dataset List */}
      {!loading && datasets.length > 0 && (
        <FlatList
          data={datasets}
          renderItem={({ item }) => renderDatasetItem(item)}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-slate-600">No datasets found</Text>
            </View>
          }
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDataset && (
        <Modal transparent animationType="slide">
          <View className="flex-1 bg-black/50">
            <View
              style={{ marginTop: insets.top }}
              className="flex-1 bg-white rounded-t-3xl mt-8"
            >
              {/* Header */}
              <View className="border-b border-slate-200 p-4 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900">Dataset Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <Text className="text-2xl text-slate-600">✕</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView className="flex-1 p-4">
                <View className="bg-slate-50 rounded-lg p-4 mb-4">
                  <Text className="font-bold text-slate-900 mb-2">
                    {selectedDataset.filename}
                  </Text>
                  <Text className="text-xs text-slate-600">
                    Uploaded: {formatDate(selectedDataset.createdAt)}
                  </Text>
                </View>

                {/* Stats */}
                <View className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
                  <View className="flex-row justify-between mb-3">
                    <View>
                      <Text className="text-xs text-slate-600">Boat Type</Text>
                      <Text className="text-base font-semibold text-slate-900">
                        {selectedDataset.boatType}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-slate-600">Status</Text>
                      <View
                        className={`px-2 py-1 rounded ${getStatusColor(selectedDataset.status)}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${getStatusTextColor(selectedDataset.status)}`}
                        >
                          {selectedDataset.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-xs text-slate-600">Total Rows</Text>
                      <Text className="text-base font-semibold text-slate-900">
                        {selectedDataset.rowCount}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-slate-600">Valid</Text>
                      <Text className="text-base font-semibold text-green-600">
                        {selectedDataset.processedCount}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-slate-600">Issues</Text>
                      <Text
                        className={`text-base font-semibold ${
                          selectedDataset.errorCount > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {selectedDataset.errorCount}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Validation Errors */}
                {selectedDataset.validationErrors.length > 0 && (
                  <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <Text className="text-yellow-800 font-semibold mb-2 text-sm">
                      ⚠️ Issues ({selectedDataset.validationErrors.length})
                    </Text>
                    {selectedDataset.validationErrors.slice(0, 5).map((error, i) => (
                      <Text key={i} className="text-yellow-700 text-xs mb-1">
                        • {error}
                      </Text>
                    ))}
                    {selectedDataset.validationErrors.length > 5 && (
                      <Text className="text-yellow-700 text-xs mt-2">
                        ... and {selectedDataset.validationErrors.length - 5} more
                      </Text>
                    )}
                  </View>
                )}

                {/* Synced Info */}
                {selectedDataset.syncedAt && (
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Text className="text-blue-800 font-semibold text-sm mb-1">
                      ✓ Synced to Training Files
                    </Text>
                    <Text className="text-blue-700 text-xs">
                      {formatDate(selectedDataset.syncedAt)}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Actions */}
              {activeTab === 'pending' && (
                <View className="border-t border-slate-200 p-4 flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleRejectClick(selectedDataset);
                    }}
                    disabled={rejecting === selectedDataset.id}
                    className="flex-1 bg-red-600 rounded-lg py-3"
                  >
                    <Text className="text-white text-center font-semibold">
                      {rejecting === selectedDataset.id ? '⏳' : '✕'} Reject
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleApprove(selectedDataset.id)}
                    disabled={approving === selectedDataset.id}
                    className="flex-1 bg-green-600 rounded-lg py-3"
                  >
                    <Text className="text-white text-center font-semibold">
                      {approving === selectedDataset.id ? '⏳' : '✓'} Approve
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDataset && (
        <Modal transparent animationType="fade">
          <View className="flex-1 bg-black/50 items-center justify-center p-4">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <Text className="text-xl font-bold text-slate-900 mb-3">
                Reject Dataset
              </Text>
              <Text className="text-slate-600 text-sm mb-4">
                {selectedDataset.filename}
              </Text>

              <TextInput
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
                className="border border-slate-300 rounded-lg p-3 mb-4 text-slate-900"
                editable={rejecting === null}
              />

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setShowRejectModal(false)}
                  disabled={rejecting !== null}
                  className="flex-1 bg-slate-200 rounded-lg py-3"
                >
                  <Text className="text-center text-slate-700 font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRejectConfirm}
                  disabled={rejecting !== null}
                  className="flex-1 bg-red-600 rounded-lg py-3"
                >
                  <Text className="text-center text-white font-semibold">
                    {rejecting ? '⏳' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
