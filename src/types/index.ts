export type DepreciationMethod = 'straight' | 'double-declining';
export type AssetStatus = 'in-stock' | 'in-use' | 'transferred' | 'scrapped' | 'lost';
export type UserRole = 'admin' | 'finance' | 'asset-manager' | 'employee';
export type AllocationStatus = 'pending' | 'confirmed' | 'returned';
export type AllocationType = 'allocate' | 'return';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'confirmed';
export type ScrapStatus = 'pending' | 'approved' | 'rejected';
export type InventoryStatus = 'draft' | 'in-progress' | 'completed';
export type CheckResult = 'matched' | 'mismatched' | 'lost' | 'pending';
export type VoucherStatus = 'draft' | 'posted' | 'revoked';
export type VoucherType = 'depreciation' | 'scrap';

export interface Category {
  id: string;
  name: string;
  code: string;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  residualRate: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  departmentId: string;
}

export interface Asset {
  id: string;
  assetNo: string;
  name: string;
  categoryId: string;
  purchaseDate: string;
  originalValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  residualValue: number;
  currentValue: number;
  accumulatedDepreciation: number;
  status: AssetStatus;
  location?: string;
  currentUserId?: string;
  currentDepartmentId?: string;
  qrCode?: string;
  specification?: string;
  manufacturer?: string;
  scrapDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepreciationRecord {
  id: string;
  assetId: string;
  period: string;
  depreciationMethod: DepreciationMethod;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  createdAt: string;
}

export interface AllocationRecord {
  id: string;
  assetId: string;
  userId: string;
  departmentId: string;
  allocationDate: string;
  confirmedAt?: string;
  returnedAt?: string;
  status: AllocationStatus;
  type: AllocationType;
}

export interface TransferRecord {
  id: string;
  assetId: string;
  fromUserId: string;
  toUserId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  applyDate: string;
  confirmedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectReason?: string;
  status: TransferStatus;
  reason?: string;
}

export interface ScrapRecord {
  id: string;
  assetId: string;
  applyUserId: string;
  applyDate: string;
  reason: string;
  approvedAt?: string;
  approvedBy?: string;
  status: ScrapStatus;
  residualIncome?: number;
}

export interface InventoryPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: InventoryStatus;
  createdBy: string;
  createdAt: string;
  scopeDepartmentId?: string;
  scopeLocation?: string;
}

export interface InventoryDetail {
  id: string;
  planId: string;
  assetId: string;
  systemStatus: string;
  checkedAt?: string;
  checkResult: CheckResult;
  remark?: string;
  actualLocation?: string;
  actualUserId?: string;
}

export interface PostedPeriod {
  period: string;
  postedAt: string;
  postedBy: string;
}

export interface DashboardStats {
  totalAssets: number;
  totalValue: number;
  monthlyDepreciation: number;
  inStockCount: number;
  inUseCount: number;
  scrappedCount: number;
  pendingTransfers: number;
  pendingScraps: number;
}

export interface VoucherEntry {
  summary: string;
  accountCode: string;
  accountName: string;
  direction: 'debit' | 'credit';
  amount: number;
  dimension?: string;
}

export interface DepreciationVoucher {
  id: string;
  voucherNo: string;
  period: string;
  type: 'depreciation';
  summaryDimension: 'category' | 'department';
  status: VoucherStatus;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  assetCount: number;
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface ScrapVoucher {
  id: string;
  voucherNo: string;
  period: string;
  type: 'scrap';
  status: VoucherStatus;
  assetId: string;
  assetNo: string;
  assetName: string;
  scrapRecordId: string;
  originalValue: number;
  accumulatedDepreciation: number;
  netValue: number;
  residualIncome: number;
  gainLoss: number;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export type FinanceVoucher = DepreciationVoucher | ScrapVoucher;
