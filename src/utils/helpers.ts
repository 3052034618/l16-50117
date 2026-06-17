import dayjs from 'dayjs';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateAssetNo(categoryCode: string, sequence: number): string {
  const year = dayjs().format('YYYY');
  const seq = sequence.toString().padStart(4, '0');
  return `${categoryCode}${year}${seq}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

export function getCurrentPeriod(): string {
  return dayjs().format('YYYY-MM');
}

export function getMonthList(startDate: string, months: number): string[] {
  const list: string[] = [];
  const start = dayjs(startDate);
  for (let i = 0; i < months; i++) {
    list.push(start.add(i, 'month').format('YYYY-MM'));
  }
  return list;
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateQRCodeData(assetId: string, assetNo: string): string {
  return JSON.stringify({ assetId, assetNo, timestamp: Date.now() });
}

export function parseQRCodeData(data: string): { assetId: string; assetNo: string } | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getMonthsDiff(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'month');
}
