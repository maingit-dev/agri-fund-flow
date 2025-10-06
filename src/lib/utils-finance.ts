export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const calculateExpectedReturn = (
  principal: number,
  interestRate: number,
  months: number
): number => {
  const monthlyRate = interestRate / 100 / 12;
  return principal * monthlyRate * months;
};
