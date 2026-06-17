import dayjs from 'dayjs';
import type { Asset, DepreciationRecord, DepreciationMethod } from '@/types';

export interface DepreciationCalculation {
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export function calculateStraightLine(
  originalValue: number,
  residualValue: number,
  usefulLifeMonths: number,
  accumulatedDepreciation: number = 0
): DepreciationCalculation {
  const depreciableBase = originalValue - residualValue;
  const monthlyDepreciation = depreciableBase / usefulLifeMonths;
  const newAccumulated = accumulatedDepreciation + monthlyDepreciation;
  const bookValue = originalValue - newAccumulated;

  return {
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    accumulatedDepreciation: Math.round(newAccumulated * 100) / 100,
    bookValue: Math.max(0, Math.round(bookValue * 100) / 100),
  };
}

export function calculateDoubleDeclining(
  originalValue: number,
  residualValue: number,
  usefulLifeMonths: number,
  currentBookValue: number,
  accumulatedDepreciation: number = 0,
  monthsDepreciated: number = 0
): DepreciationCalculation {
  const remainingMonths = usefulLifeMonths - monthsDepreciated;
  const lastTwoYears = remainingMonths <= 24;

  let monthlyDepreciation: number;

  if (lastTwoYears) {
    const depreciableBase = currentBookValue - residualValue;
    monthlyDepreciation = depreciableBase / remainingMonths;
  } else {
    const monthlyRate = 2 / usefulLifeMonths;
    monthlyDepreciation = currentBookValue * monthlyRate;
  }

  const newAccumulated = accumulatedDepreciation + monthlyDepreciation;
  const bookValue = originalValue - newAccumulated;

  return {
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    accumulatedDepreciation: Math.round(newAccumulated * 100) / 100,
    bookValue: Math.max(residualValue, Math.round(bookValue * 100) / 100),
  };
}

export function calculateDepreciation(
  asset: Asset,
  monthsDepreciated: number = 0
): DepreciationCalculation {
  const {
    depreciationMethod,
    originalValue,
    residualValue,
    usefulLife,
    currentValue,
    accumulatedDepreciation,
  } = asset;

  if (depreciationMethod === 'straight') {
    return calculateStraightLine(
      originalValue,
      residualValue,
      usefulLife,
      accumulatedDepreciation
    );
  } else {
    return calculateDoubleDeclining(
      originalValue,
      residualValue,
      usefulLife,
      currentValue,
      accumulatedDepreciation,
      monthsDepreciated
    );
  }
}

export function getMonthsDepreciated(purchaseDate: string, currentPeriod: string): number {
  const purchase = dayjs(purchaseDate);
  const current = dayjs(currentPeriod + '-01');
  return current.diff(purchase, 'month');
}

export function generateDepreciationSchedule(asset: Asset): DepreciationRecord[] {
  const records: DepreciationRecord[] = [];
  const { usefulLife, purchaseDate, id, depreciationMethod, originalValue } = asset;
  let currentValue = originalValue;
  let accumulatedDepreciation = 0;

  for (let i = 0; i < usefulLife; i++) {
    const periodDate = dayjs(purchaseDate).add(i, 'month');
    const period = periodDate.format('YYYY-MM');

    let calc: DepreciationCalculation;
    if (depreciationMethod === 'straight') {
      calc = calculateStraightLine(
        originalValue,
        asset.residualValue,
        usefulLife,
        accumulatedDepreciation
      );
    } else {
      calc = calculateDoubleDeclining(
        originalValue,
        asset.residualValue,
        usefulLife,
        currentValue,
        accumulatedDepreciation,
        i
      );
    }

    records.push({
      id: `${id}-${period}`,
      assetId: id,
      period,
      depreciationMethod,
      monthlyDepreciation: calc.monthlyDepreciation,
      accumulatedDepreciation: calc.accumulatedDepreciation,
      bookValue: calc.bookValue,
      createdAt: periodDate.format('YYYY-MM-DD'),
    });

    currentValue = calc.bookValue;
    accumulatedDepreciation = calc.accumulatedDepreciation;
  }

  return records;
}

export function calculateMonthlyDepreciationForPeriod(
  assets: Asset[],
  period: string
): number {
  let total = 0;
  for (const asset of assets) {
    if (asset.status === 'scrapped' || asset.status === 'lost') continue;
    const monthsDepreciated = getMonthsDepreciated(asset.purchaseDate, period);
    if (monthsDepreciated >= 0 && monthsDepreciated < asset.usefulLife) {
      const calc = calculateDepreciation(asset, monthsDepreciated);
      total += calc.monthlyDepreciation;
    }
  }
  return Math.round(total * 100) / 100;
}
