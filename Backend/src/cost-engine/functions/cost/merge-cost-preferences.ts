type PreferenceItem = {
  name: string;
  category: string;
  amount: number;
  description?: string;
  isActive?: boolean;
  autoApply?: boolean;
};

type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: 'manual' | 'preference';
  description?: string;
};

export function mergeCostPreferences(
  preferences: PreferenceItem[] = [],
  manualExternalCosts: ExternalCostItem[] = [],
): ExternalCostItem[] {
  const preferenceCosts: ExternalCostItem[] = preferences
    .filter((item) => item.isActive !== false && item.autoApply !== false)
    .map((item) => ({
      name: item.name,
      category: item.category,
      amount: Number(item.amount || 0),
      source: 'preference',
      description: item.description || '',
    }));

  const manualCosts: ExternalCostItem[] = (manualExternalCosts || []).map(
    (item) => ({
      name: item.name,
      category: item.category,
      amount: Number(item.amount || 0),
      source: 'manual',
      description: item.description || '',
    }),
  );

  return [...preferenceCosts, ...manualCosts];
}