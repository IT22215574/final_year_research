import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { boatTypes } from '@/constants';

const { width } = Dimensions.get('window');

interface BoatSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBoat: (boatId: number, boatName: string, defaultEngineHP: number, customEngineHP?: string) => void;
  selectedBoatId?: number;
}

const BoatSelectionModal: React.FC<BoatSelectionModalProps> = ({
  visible,
  onClose,
  onSelectBoat,
  selectedBoatId,
}) => {
  const [currentBoatIndex, setCurrentBoatIndex] = useState(0);
  const [customEngineHP, setCustomEngineHP] = useState('');
  const [useCustomHP, setUseCustomHP] = useState(false);

  const handleSelectBoat = () => {
    const selectedBoat = boatTypes[currentBoatIndex];
    onSelectBoat(
      selectedBoat.id,
      selectedBoat.name,
      selectedBoat.defaultEngineHP,
      useCustomHP && customEngineHP ? customEngineHP : undefined
    );
    setCustomEngineHP('');
    setUseCustomHP(false);
    onClose();
  };

  const handleNext = () => {
    if (currentBoatIndex < boatTypes.length - 1) {
      setCurrentBoatIndex(currentBoatIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentBoatIndex > 0) {
      setCurrentBoatIndex(currentBoatIndex - 1);
    }
  };

  const currentBoat = boatTypes[currentBoatIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-slate-200">
            <Text className="text-xl font-bold text-slate-800">Select Boat Type</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full"
            >
              <Text className="text-slate-600 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Boat Image Carousel */}
            <View className="relative">
              <View className="items-center justify-center bg-slate-50 p-6">
                <Image
                  source={currentBoat.image}
                  className="w-64 h-48"
                  resizeMode="contain"
                />
              </View>

              {/* Navigation Arrows */}
              <View className="absolute inset-0 flex-row justify-between items-center px-4">
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={currentBoatIndex === 0}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    currentBoatIndex === 0 ? 'bg-slate-200' : 'bg-blue-500'
                  }`}
                >
                  <Text className={currentBoatIndex === 0 ? 'text-slate-400' : 'text-white'}>
                    ‹
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={currentBoatIndex === boatTypes.length - 1}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    currentBoatIndex === boatTypes.length - 1 ? 'bg-slate-200' : 'bg-blue-500'
                  }`}
                >
                  <Text
                    className={
                      currentBoatIndex === boatTypes.length - 1 ? 'text-slate-400' : 'text-white'
                    }
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pagination Dots */}
              <View className="flex-row justify-center items-center py-3 gap-2">
                {boatTypes.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentBoatIndex(index)}
                    className={`h-2 rounded-full ${
                      index === currentBoatIndex
                        ? 'bg-blue-500 w-8'
                        : 'bg-slate-300 w-2'
                    }`}
                  />
                ))}
              </View>
            </View>

            {/* Boat Details */}
            <View className="px-4 pb-6">
              {/* Boat Name & Description */}
              <View className="mb-4">
                <Text className="text-2xl font-bold text-slate-800 mb-1">
                  {currentBoat.name}
                </Text>
                <Text className="text-sm font-medium text-blue-600 mb-2">
                  {currentBoat.engineModel}
                </Text>
                <Text className="text-slate-600 text-base">
                  {currentBoat.description}
                </Text>
              </View>

              {/* Specifications Card */}
              <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200">
                <Text className="text-xs font-bold text-blue-800 mb-3 tracking-wider">
                  SPECIFICATIONS
                </Text>
                <View className="space-y-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">📏</Text>
                      <Text className="text-sm text-slate-600">Length</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-800">
                      {currentBoat.specifications.length}
                    </Text>
                  </View>
                  <View className="h-px bg-blue-200" />
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">⚙️</Text>
                      <Text className="text-sm text-slate-600">Engine</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-800">
                      {currentBoat.specifications.engine}
                    </Text>
                  </View>
                  <View className="h-px bg-blue-200" />
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">⚡</Text>
                      <Text className="text-sm text-slate-600">Power</Text>
                    </View>
                    <Text className="text-sm font-bold text-blue-700">
                      {currentBoat.specifications.power}
                    </Text>
                  </View>
                  <View className="h-px bg-blue-200" />
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Text className="text-lg mr-2">⛽</Text>
                      <Text className="text-sm text-slate-600">Fuel Type</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-800">
                      {currentBoat.specifications.fuel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Stats */}
              <View className="flex-row justify-between mb-4">
                <View className="flex-1 bg-blue-50 rounded-xl p-3 mr-2">
                  <Text className="text-xs text-blue-600 mb-1">Capacity</Text>
                  <Text className="text-sm font-bold text-blue-800">
                    {currentBoat.capacity}
                  </Text>
                </View>
                <View className="flex-1 bg-emerald-50 rounded-xl p-3 mr-2">
                  <Text className="text-xs text-emerald-600 mb-1">Fuel Efficiency</Text>
                  <Text className="text-sm font-bold text-emerald-800">
                    {currentBoat.fuelEfficiency}
                  </Text>
                </View>
                <View className="flex-1 bg-amber-50 rounded-xl p-3">
                  <Text className="text-xs text-amber-600 mb-1">Default HP</Text>
                  <Text className="text-sm font-bold text-amber-800">
                    {currentBoat.defaultEngineHP}
                  </Text>
                </View>
              </View>

              {/* Characteristics */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Characteristics
                </Text>
                <View className="space-y-2">
                  {currentBoat.characteristics.map((char, index) => (
                    <View key={index} className="flex-row items-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                      <Text className="text-slate-600 text-sm">{char}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Ideal For */}
              <View className="bg-slate-50 rounded-xl p-4 mb-4">
                <Text className="text-xs font-semibold text-slate-500 mb-1">
                  IDEAL FOR
                </Text>
                <Text className="text-slate-700 text-sm">{currentBoat.idealFor}</Text>
              </View>

              {/* Available Engine HP Options */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Available Engine HP Options
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {currentBoat.engineHPOptions.map((hp, index) => (
                    <View
                      key={index}
                      className={`px-3 py-2 rounded-lg ${
                        hp === currentBoat.defaultEngineHP
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          hp === currentBoat.defaultEngineHP
                            ? 'text-blue-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {hp} HP
                        {hp === currentBoat.defaultEngineHP && ' ⭐'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Custom Engine HP Input */}
              <View className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Text className="text-lg mr-2">✏️</Text>
                    <Text className="text-sm font-semibold text-amber-900">
                      Custom Engine HP
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setUseCustomHP(!useCustomHP);
                      if (useCustomHP) setCustomEngineHP('');
                    }}
                    className={`px-3 py-1.5 rounded-full ${
                      useCustomHP ? 'bg-amber-500' : 'bg-amber-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        useCustomHP ? 'text-white' : 'text-amber-700'
                      }`}
                    >
                      {useCustomHP ? 'Enabled' : 'Disabled'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {useCustomHP && (
                  <View>
                    <Text className="text-xs text-amber-700 mb-2">
                      Enter your boat's actual engine horsepower
                    </Text>
                    <TextInput
                      placeholder="e.g., 175"
                      keyboardType="numeric"
                      value={customEngineHP}
                      onChangeText={setCustomEngineHP}
                      className="bg-white border border-amber-300 rounded-lg p-3 text-slate-800"
                      placeholderTextColor="#92400e"
                    />
                  </View>
                )}
                
                {!useCustomHP && (
                  <Text className="text-xs text-amber-700">
                    Enable to enter a custom engine HP value not listed above
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="p-4 border-t border-slate-200 flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-slate-100 rounded-xl py-4 items-center"
            >
              <Text className="text-slate-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSelectBoat}
              className="flex-[2] bg-blue-500 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-semibold">
                Select {currentBoat.name}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BoatSelectionModal;
