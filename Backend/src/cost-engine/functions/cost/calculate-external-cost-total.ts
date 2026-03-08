type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: 'manual' | 'preference';
  description?: string;
};

export function calculateExternalCostTotal(
  externalCosts: ExternalCostItem[] = [],
): number {
  return externalCosts.reduce((total, item) => {
    const amount = Number(item?.amount || 0);
    return total + (Number.isNaN(amount) ? 0 : amount);
  }, 0);
}