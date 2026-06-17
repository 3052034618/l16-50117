import type { Category, Department, User, Asset, DepreciationRecord, TransferRecord, ScrapRecord, InventoryPlan, InventoryDetail, AllocationRecord } from '@/types';
import { generateId, generateAssetNo, getCurrentPeriod } from '@/utils/helpers';
import { generateDepreciationSchedule } from '@/utils/depreciation';
import dayjs from 'dayjs';

export const mockCategories: Category[] = [
  { id: 'cat-1', name: '电子设备', code: 'IT', usefulLife: 36, depreciationMethod: 'straight', residualRate: 0.05 },
  { id: 'cat-2', name: '办公家具', code: 'OF', usefulLife: 60, depreciationMethod: 'straight', residualRate: 0.05 },
  { id: 'cat-3', name: '运输设备', code: 'VE', usefulLife: 48, depreciationMethod: 'double-declining', residualRate: 0.1 },
  { id: 'cat-4', name: '机械设备', code: 'ME', usefulLife: 120, depreciationMethod: 'double-declining', residualRate: 0.05 },
  { id: 'cat-5', name: '房屋建筑', code: 'BD', usefulLife: 240, depreciationMethod: 'straight', residualRate: 0.05 },
];

export const mockDepartments: Department[] = [
  { id: 'dept-1', name: '总裁办', code: 'CEO' },
  { id: 'dept-2', name: '财务部', code: 'FIN' },
  { id: 'dept-3', name: '技术部', code: 'TECH' },
  { id: 'dept-4', name: '市场部', code: 'MKT' },
  { id: 'dept-5', name: '人力资源部', code: 'HR' },
  { id: 'dept-6', name: '行政部', code: 'ADM' },
  { id: 'dept-7', name: '销售部', code: 'SALES' },
];

export const mockUsers: User[] = [
  { id: 'user-1', username: 'admin', name: '系统管理员', role: 'admin', departmentId: 'dept-1' },
  { id: 'user-2', username: 'finance1', name: '张会计', role: 'finance', departmentId: 'dept-2' },
  { id: 'user-3', username: 'finance2', name: '李出纳', role: 'finance', departmentId: 'dept-2' },
  { id: 'user-4', username: 'asset1', name: '王管理员', role: 'asset-manager', departmentId: 'dept-6' },
  { id: 'user-5', username: 'emp1', name: '赵工程师', role: 'employee', departmentId: 'dept-3' },
  { id: 'user-6', username: 'emp2', name: '钱经理', role: 'employee', departmentId: 'dept-4' },
  { id: 'user-7', username: 'emp3', name: '孙专员', role: 'employee', departmentId: 'dept-7' },
  { id: 'user-8', username: 'emp4', name: '周主管', role: 'employee', departmentId: 'dept-5' },
];

export function generateMockAssets(): Asset[] {
  const assets: Asset[] = [];
  const now = dayjs();

  const assetData = [
    { name: '联想ThinkPad笔记本电脑', categoryId: 'cat-1', value: 8500, monthsAgo: 12, userId: 'user-5', status: 'in-use' as const },
    { name: 'Dell台式工作站', categoryId: 'cat-1', value: 12000, monthsAgo: 6, userId: 'user-5', status: 'in-use' as const },
    { name: 'MacBook Pro', categoryId: 'cat-1', value: 15800, monthsAgo: 18, userId: 'user-6', status: 'in-use' as const },
    { name: 'HP激光打印机', categoryId: 'cat-1', value: 3200, monthsAgo: 24, userId: undefined, status: 'in-stock' as const },
    { name: '办公桌椅套装', categoryId: 'cat-2', value: 2800, monthsAgo: 36, userId: 'user-5', status: 'in-use' as const },
    { name: '文件柜', categoryId: 'cat-2', value: 1500, monthsAgo: 48, userId: 'user-6', status: 'in-use' as const },
    { name: '会议桌', categoryId: 'cat-2', value: 8500, monthsAgo: 60, userId: undefined, status: 'in-use' as const },
    { name: '大众帕萨特', categoryId: 'cat-3', value: 220000, monthsAgo: 30, userId: 'user-6', status: 'in-use' as const },
    { name: '别克GL8', categoryId: 'cat-3', value: 350000, monthsAgo: 12, userId: 'user-7', status: 'in-use' as const },
    { name: '数控车床', categoryId: 'cat-4', value: 150000, monthsAgo: 60, userId: undefined, status: 'in-stock' as const },
    { name: '工业机器人', categoryId: 'cat-4', value: 450000, monthsAgo: 24, userId: undefined, status: 'in-use' as const },
    { name: '投影仪', categoryId: 'cat-1', value: 8500, monthsAgo: 3, userId: undefined, status: 'in-stock' as const },
    { name: '空调机组', categoryId: 'cat-4', value: 85000, monthsAgo: 80, userId: undefined, status: 'in-use' as const },
    { name: '服务器机柜', categoryId: 'cat-1', value: 25000, monthsAgo: 10, userId: undefined, status: 'in-use' as const },
    { name: '碎纸机', categoryId: 'cat-1', value: 1800, monthsAgo: 36, userId: undefined, status: 'scrapped' as const },
  ];

  assetData.forEach((item, index) => {
    const category = mockCategories.find(c => c.id === item.categoryId)!;
    const purchaseDate = now.subtract(item.monthsAgo, 'month').format('YYYY-MM-DD');
    const residualValue = Math.round(item.value * category.residualRate * 100) / 100;
    const usefulLife = category.usefulLife;
    
    const asset: Asset = {
      id: `asset-${index + 1}`,
      assetNo: generateAssetNo(category.code, index + 1),
      name: item.name,
      categoryId: item.categoryId,
      purchaseDate,
      originalValue: item.value,
      usefulLife,
      depreciationMethod: category.depreciationMethod,
      residualValue,
      currentValue: item.value,
      accumulatedDepreciation: 0,
      status: item.status,
      location: '总部办公区',
      currentUserId: item.userId,
      currentDepartmentId: item.userId ? mockUsers.find(u => u.id === item.userId)?.departmentId : undefined,
      qrCode: generateId(),
      specification: '标准配置',
      manufacturer: '知名品牌',
      createdAt: purchaseDate,
      updatedAt: purchaseDate,
    };
    
    const monthsDepreciated = Math.min(item.monthsAgo, usefulLife);
    const schedule = generateDepreciationSchedule(asset);
    if (monthsDepreciated > 0 && schedule[monthsDepreciated - 1]) {
      asset.accumulatedDepreciation = schedule[monthsDepreciated - 1].accumulatedDepreciation;
      asset.currentValue = schedule[monthsDepreciated - 1].bookValue;
    }
    
    assets.push(asset);
  });

  return assets;
}

export function generateMockDepreciationRecords(assets: Asset[]): DepreciationRecord[] {
  const records: DepreciationRecord[] = [];
  const currentPeriod = getCurrentPeriod();
  
  assets.forEach(asset => {
    if (asset.status === 'scrapped' || asset.status === 'lost') return;
    
    const schedule = generateDepreciationSchedule(asset);
    const currentPeriodIndex = schedule.findIndex(r => r.period === currentPeriod);
    
    if (currentPeriodIndex >= 0) {
      for (let i = 0; i <= currentPeriodIndex; i++) {
        records.push(schedule[i]);
      }
    }
  });
  
  return records;
}

export const mockAllocations: AllocationRecord[] = [
  {
    id: 'alloc-1',
    assetId: 'asset-1',
    userId: 'user-5',
    departmentId: 'dept-3',
    allocationDate: dayjs().subtract(12, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(12, 'month').add(1, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
  },
  {
    id: 'alloc-2',
    assetId: 'asset-2',
    userId: 'user-5',
    departmentId: 'dept-3',
    allocationDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(6, 'month').add(1, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
  },
  {
    id: 'alloc-3',
    assetId: 'asset-3',
    userId: 'user-6',
    departmentId: 'dept-4',
    allocationDate: dayjs().subtract(18, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(18, 'month').add(1, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
  },
  {
    id: 'alloc-4',
    assetId: 'asset-5',
    userId: 'user-5',
    departmentId: 'dept-3',
    allocationDate: dayjs().subtract(36, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(36, 'month').add(1, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
  },
  {
    id: 'alloc-5',
    assetId: 'asset-8',
    userId: 'user-6',
    departmentId: 'dept-4',
    allocationDate: dayjs().subtract(30, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(30, 'month').add(1, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
  },
  {
    id: 'alloc-6',
    assetId: 'asset-9',
    userId: 'user-7',
    departmentId: 'dept-7',
    allocationDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    status: 'pending',
  },
];

export const mockTransfers: TransferRecord[] = [
  {
    id: 'trans-1',
    assetId: 'asset-3',
    fromUserId: 'user-5',
    toUserId: 'user-6',
    fromDepartmentId: 'dept-3',
    toDepartmentId: 'dept-4',
    applyDate: dayjs().subtract(15, 'month').format('YYYY-MM-DD'),
    confirmedAt: dayjs().subtract(15, 'month').add(2, 'day').format('YYYY-MM-DD'),
    status: 'confirmed',
    reason: '部门调整',
  },
  {
    id: 'trans-2',
    assetId: 'asset-8',
    fromUserId: 'user-7',
    toUserId: 'user-6',
    fromDepartmentId: 'dept-7',
    toDepartmentId: 'dept-4',
    applyDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    status: 'pending',
    reason: '市场部接待客户需要',
  },
];

export const mockScraps: ScrapRecord[] = [
  {
    id: 'scrap-1',
    assetId: 'asset-15',
    applyUserId: 'user-4',
    applyDate: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
    reason: '设备老化，无法正常使用，维修成本过高',
    status: 'pending',
  },
];

export const mockInventoryPlans: InventoryPlan[] = [
  {
    id: 'plan-1',
    name: '2026年Q2固定资产盘点',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    status: 'in-progress',
    createdBy: 'user-4',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
  },
  {
    id: 'plan-2',
    name: '2026年Q1固定资产盘点',
    startDate: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
    endDate: dayjs().subtract(3, 'month').add(7, 'day').format('YYYY-MM-DD'),
    status: 'completed',
    createdBy: 'user-4',
    createdAt: dayjs().subtract(3, 'month').subtract(1, 'day').format('YYYY-MM-DD'),
  },
];

export function generateMockInventoryDetails(plans: InventoryPlan[], assets: Asset[]): InventoryDetail[] {
  const details: InventoryDetail[] = [];
  
  plans.forEach(plan => {
    assets.forEach(asset => {
      if (asset.status === 'scrapped' || asset.status === 'lost') return;
      
      let checkResult: 'matched' | 'mismatched' | 'lost' | 'pending' = 'matched';
      let remark = '';
      
      if (plan.status === 'completed') {
        if (asset.id === 'asset-10') {
          checkResult = 'mismatched';
          remark = '存放位置与记录不符';
        } else if (asset.id === 'asset-12') {
          checkResult = 'pending';
        }
      } else {
        checkResult = 'pending';
        if (['asset-1', 'asset-2', 'asset-3', 'asset-5'].includes(asset.id)) {
          checkResult = 'matched';
        }
      }
      
      details.push({
        id: `detail-${plan.id}-${asset.id}`,
        planId: plan.id,
        assetId: asset.id,
        systemStatus: asset.status,
        checkedAt: checkResult !== 'pending' ? plan.startDate : undefined,
        checkResult,
        remark,
      });
    });
  });
  
  return details;
}
