import type { DepreciationMethod, AssetStatus, UserRole, AllocationStatus, TransferStatus, ScrapStatus, InventoryStatus, CheckResult } from '@/types';

export const DEPRECIATION_METHODS: Record<DepreciationMethod, { label: string; value: DepreciationMethod }> = {
  'straight': { label: '直线法', value: 'straight' },
  'double-declining': { label: '双倍余额递减法', value: 'double-declining' },
};

export const ASSET_STATUS: Record<AssetStatus, { label: string; value: AssetStatus; color: string }> = {
  'in-stock': { label: '在库', value: 'in-stock', color: 'default' },
  'in-use': { label: '使用中', value: 'in-use', color: 'green' },
  'transferred': { label: '调拨中', value: 'transferred', color: 'orange' },
  'scrapped': { label: '已报废', value: 'scrapped', color: 'red' },
  'lost': { label: '已遗失', value: 'lost', color: 'red' },
};

export const USER_ROLES: Record<UserRole, { label: string; value: UserRole }> = {
  'admin': { label: '系统管理员', value: 'admin' },
  'finance': { label: '财务人员', value: 'finance' },
  'asset-manager': { label: '资产管理员', value: 'asset-manager' },
  'employee': { label: '普通员工', value: 'employee' },
};

export const ALLOCATION_STATUS: Record<AllocationStatus, { label: string; value: AllocationStatus; color: string }> = {
  'pending': { label: '待确认', value: 'pending', color: 'orange' },
  'confirmed': { label: '已确认', value: 'confirmed', color: 'green' },
  'returned': { label: '已归还', value: 'returned', color: 'default' },
};

export const TRANSFER_STATUS: Record<TransferStatus, { label: string; value: TransferStatus; color: string }> = {
  'pending': { label: '待审核', value: 'pending', color: 'orange' },
  'approved': { label: '待接收', value: 'approved', color: 'blue' },
  'rejected': { label: '已拒绝', value: 'rejected', color: 'red' },
  'confirmed': { label: '已完成', value: 'confirmed', color: 'green' },
};

export const SCRAP_STATUS: Record<ScrapStatus, { label: string; value: ScrapStatus; color: string }> = {
  'pending': { label: '待审核', value: 'pending', color: 'orange' },
  'approved': { label: '已批准', value: 'approved', color: 'green' },
  'rejected': { label: '已拒绝', value: 'rejected', color: 'red' },
};

export const INVENTORY_STATUS: Record<InventoryStatus, { label: string; value: InventoryStatus; color: string }> = {
  'draft': { label: '草稿', value: 'draft', color: 'default' },
  'in-progress': { label: '进行中', value: 'in-progress', color: 'blue' },
  'completed': { label: '已完成', value: 'completed', color: 'green' },
};

export const CHECK_RESULT: Record<CheckResult, { label: string; value: CheckResult; color: string }> = {
  'pending': { label: '待盘点', value: 'pending', color: 'default' },
  'matched': { label: '账实相符', value: 'matched', color: 'green' },
  'mismatched': { label: '账实不符', value: 'mismatched', color: 'orange' },
  'lost': { label: '盘亏', value: 'lost', color: 'red' },
};

export const STORAGE_KEYS = {
  CATEGORIES: 'asset_categories',
  DEPARTMENTS: 'asset_departments',
  USERS: 'asset_users',
  ASSETS: 'asset_list',
  DEPRECIATION_RECORDS: 'depreciation_records',
  ALLOCATION_RECORDS: 'allocation_records',
  TRANSFER_RECORDS: 'transfer_records',
  SCRAP_RECORDS: 'scrap_records',
  INVENTORY_PLANS: 'inventory_plans',
  INVENTORY_DETAILS: 'inventory_details',
  CURRENT_USER: 'current_user',
};
