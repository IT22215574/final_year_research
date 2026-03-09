import { create } from 'zustand';
import { FishPrice, PricePrediction } from '../types';

interface PriceStore {
  currentPrices: FishPrice[];
  predictions: PricePrediction[];
  selectedPort: string;
  selectedFishId: number | null;
  loading: boolean;
  error: string | null;

  setCurrentPrices: (prices: FishPrice[]) => void;
  setPredictions: (predictions: PricePrediction[]) => void;
  setSelectedPort: (port: string) => void;
  setSelectedFishId: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const usePriceStore = create<PriceStore>((set) => ({
  currentPrices: [],
  predictions: [],
  selectedPort: 'Colombo',
  selectedFishId: null,
  loading: false,
  error: null,

  setCurrentPrices: (prices) => set({ currentPrices: prices }),
  setPredictions: (predictions) => set({ predictions }),
  setSelectedPort: (port) => set({ selectedPort: port }),
  setSelectedFishId: (id) => set({ selectedFishId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      currentPrices: [],
      predictions: [],
      selectedFishId: null,
      error: null,
    }),
}));

export default usePriceStore;
