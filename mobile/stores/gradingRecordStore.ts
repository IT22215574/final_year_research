// stores/gradingRecordStore.ts
import { create } from 'zustand';
import type { GradingRecord, SaveGradingPayload } from '@/services/gradingRecordService';
import {
  saveGradingRecord,
  fetchGradingHistory,
  fetchGradingRecord,
  deleteGradingRecord,
} from '@/services/gradingRecordService';

type GradingRecordState = {
  history: GradingRecord[];
  historyLoading: boolean;
  historyError: string | null;
  savingRecord: boolean;
  saveError: string | null;

  loadHistory: (limit?: number, skip?: number) => Promise<void>;
  save: (payload: SaveGradingPayload) => Promise<GradingRecord>;
  remove: (id: string) => Promise<void>;
  getOne: (id: string) => Promise<GradingRecord>;
};

export const useGradingRecordStore = create<GradingRecordState>((set) => ({
  history: [],
  historyLoading: false,
  historyError: null,
  savingRecord: false,
  saveError: null,

  loadHistory: async (limit = 20, skip = 0) => {
    set({ historyLoading: true, historyError: null });
    try {
      const records = await fetchGradingHistory(limit, skip);
      set({ history: Array.isArray(records) ? records : [] });
    } catch (e: any) {
      set({ historyError: e?.message ?? 'Failed to load history' });
    } finally {
      set({ historyLoading: false });
    }
  },

  save: async (payload) => {
    set({ savingRecord: true, saveError: null });
    try {
      const record = await saveGradingRecord(payload);
      set((s) => ({ history: [record, ...s.history] }));
      return record;
    } catch (e: any) {
      set({ saveError: e?.message ?? 'Failed to save grading result' });
      throw e;
    } finally {
      set({ savingRecord: false });
    }
  },

  remove: async (id) => {
    await deleteGradingRecord(id);
    set((s) => ({ history: s.history.filter((r) => r._id !== id) }));
  },

  getOne: async (id) => {
    return fetchGradingRecord(id);
  },
}));
