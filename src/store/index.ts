import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Category, Department, User, Asset, DepreciationRecord,
  AllocationRecord, TransferRecord, ScrapRecord,
  InventoryPlan, InventoryDetail, DashboardStats, PostedPeriod,
  DepreciationVoucher, ScrapVoucher, FinanceVoucher, VoucherEntry,
} from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { generateId, generateAssetNo, getCurrentPeriod, generateQRCodeData } from '@/utils/helpers';
import { calculateDepreciation, calculateMonthlyDepreciationForPeriod, generateDepreciationSchedule } from '@/utils/depreciation';
import {
  mockCategories, mockDepartments, mockUsers, generateMockAssets,
  generateMockDepreciationRecords, mockAllocations, mockTransfers,
  mockScraps, mockInventoryPlans, generateMockInventoryDetails,
} from '@/services/mockData';
import dayjs from 'dayjs';

interface AppState {
  categories: Category[];
  departments: Department[];
  users: User[];
  assets: Asset[];
  depreciationRecords: DepreciationRecord[];
  postedPeriods: PostedPeriod[];
  allocations: AllocationRecord[];
  transfers: TransferRecord[];
  scraps: ScrapRecord[];
  inventoryPlans: InventoryPlan[];
  inventoryDetails: InventoryDetail[];
  depreciationVouchers: DepreciationVoucher[];
  scrapVouchers: ScrapVoucher[];
  currentUser: User | null;
  initialized: boolean;

  initData: () => void;
  getDashboardStats: () => DashboardStats;

  addAsset: (asset: Omit<Asset, 'id' | 'assetNo' | 'qrCode' | 'currentValue' | 'accumulatedDepreciation' | 'createdAt' | 'updatedAt'>) => Asset;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  getAssetById: (id: string) => Asset | undefined;

  calculateMonthlyDepreciation: (period?: string) => DepreciationRecord[];
  getAssetDepreciationRecords: (assetId: string) => DepreciationRecord[];
  postDepreciationPeriod: (period: string) => void;
  unpostDepreciationPeriod: (period: string) => void;
  isPeriodPosted: (period: string) => boolean;

  createAllocation: (assetId: string, userId: string, departmentId: string) => AllocationRecord;
  confirmAllocation: (allocationId: string) => void;
  returnAllocation: (allocationId: string) => void;

  createTransfer: (assetId: string, toUserId: string, reason?: string) => TransferRecord;
  approveTransfer: (transferId: string, approverId?: string) => void;
  rejectTransfer: (transferId: string, reason?: string, rejectorId?: string) => void;
  confirmTransfer: (transferId: string) => void;

  createScrap: (assetId: string, applyUserId: string, reason: string) => ScrapRecord;
  approveScrap: (scrapId: string, residualIncome: number) => ScrapVoucher | undefined;
  rejectScrap: (scrapId: string, reason?: string) => void;

  createInventoryPlan: (name: string, startDate: string, endDate: string, createdBy: string, scopeDepartmentId?: string, scopeLocation?: string) => InventoryPlan;
  startInventory: (planId: string) => void;
  completeInventory: (planId: string) => void;
  checkAsset: (planId: string, assetId: string, result: 'matched' | 'mismatched' | 'lost', remark?: string, actualLocation?: string, actualUserId?: string) => void;
  getInventoryDetails: (planId: string) => (InventoryDetail & { asset?: Asset })[];
  getInventorySummary: (planId: string) => { total: number; checked: number; matched: number; mismatched: number; lost: number };

  createDepreciationVoucher: (period: string, dimension: 'category' | 'department') => DepreciationVoucher;
  getDepreciationVoucherByPeriod: (period: string) => DepreciationVoucher | undefined;
  createScrapVoucherFromScrap: (scrapId: string) => ScrapVoucher | undefined;
  confirmVoucher: (voucherId: string, voucherType: 'depreciation' | 'scrap', confirmerId?: string) => void;
  revokeVoucher: (voucherId: string, voucherType: 'depreciation' | 'scrap', revokerId?: string) => void;
  getAllVouchers: () => FinanceVoucher[];

  addCategory: (category: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addDepartment: (department: Omit<Department, 'id'>) => Department;
  updateDepartment: (id: string, department: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  login: (username: string) => User | null;
  logout: () => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: [],
      departments: [],
      users: [],
      assets: [],
      depreciationRecords: [],
      postedPeriods: [],
      allocations: [],
      transfers: [],
      scraps: [],
      inventoryPlans: [],
      inventoryDetails: [],
      depreciationVouchers: [],
      scrapVouchers: [],
      currentUser: null,
      initialized: false,

      initData: () => {
        const { initialized } = get();
        if (initialized) return;

        const mockAssets = generateMockAssets();
        const mockDepreciationRecords = generateMockDepreciationRecords(mockAssets);
        const mockInventoryDetails = generateMockInventoryDetails(mockInventoryPlans, mockAssets);

        set({
          categories: mockCategories,
          departments: mockDepartments,
          users: mockUsers,
          assets: mockAssets,
          depreciationRecords: mockDepreciationRecords,
          allocations: mockAllocations.map(a => ({ ...a, type: 'allocate' as const })),
          transfers: mockTransfers,
          scraps: mockScraps,
          inventoryPlans: mockInventoryPlans,
          inventoryDetails: mockInventoryDetails,
          depreciationVouchers: [],
          scrapVouchers: [],
          currentUser: mockUsers[0],
          initialized: true,
        });
      },

      getDashboardStats: () => {
        const { assets, transfers, scraps, depreciationRecords } = get();
        const currentPeriod = getCurrentPeriod();
        
        const inStockCount = assets.filter(a => a.status === 'in-stock').length;
        const inUseCount = assets.filter(a => a.status === 'in-use').length;
        const scrappedCount = assets.filter(a => a.status === 'scrapped').length;
        const totalValue = assets.filter(a => a.status !== 'scrapped').reduce((sum, a) => sum + a.currentValue, 0);
        const monthlyDepreciation = calculateMonthlyDepreciationForPeriod(
          assets.filter(a => a.status !== 'scrapped' && a.status !== 'lost'),
          currentPeriod
        );
        const pendingTransfers = transfers.filter(t => t.status === 'pending' || t.status === 'approved').length;
        const pendingScraps = scraps.filter(s => s.status === 'pending').length;

        return {
          totalAssets: assets.length,
          totalValue: Math.round(totalValue * 100) / 100,
          monthlyDepreciation,
          inStockCount,
          inUseCount,
          scrappedCount,
          pendingTransfers,
          pendingScraps,
        };
      },

      addAsset: (assetData) => {
        const { assets, categories } = get();
        const category = categories.find(c => c.id === assetData.categoryId);
        if (!category) throw new Error('资产类别不存在');

        const count = assets.filter(a => a.categoryId === assetData.categoryId).length + 1;
        const assetNo = generateAssetNo(category.code, count);
        const id = generateId();
        const qrCode = generateQRCodeData(id, assetNo);
        const now = dayjs().format('YYYY-MM-DD');

        const newAsset: Asset = {
          ...assetData,
          id,
          assetNo,
          qrCode,
          currentValue: assetData.originalValue,
          accumulatedDepreciation: 0,
          createdAt: now,
          updatedAt: now,
        };

        set({ assets: [...assets, newAsset] });
        return newAsset;
      },

      updateAsset: (id, assetData) => {
        const { assets } = get();
        set({
          assets: assets.map(a => a.id === id ? { ...a, ...assetData, updatedAt: dayjs().format('YYYY-MM-DD') } : a),
        });
      },

      deleteAsset: (id) => {
        const { assets, depreciationRecords, allocations, transfers, scraps, inventoryDetails } = get();
        set({
          assets: assets.filter(a => a.id !== id),
          depreciationRecords: depreciationRecords.filter(r => r.assetId !== id),
          allocations: allocations.filter(a => a.assetId !== id),
          transfers: transfers.filter(t => t.assetId !== id),
          scraps: scraps.filter(s => s.assetId !== id),
          inventoryDetails: inventoryDetails.filter(d => d.assetId !== id),
        });
      },

      getAssetById: (id) => {
        return get().assets.find(a => a.id === id);
      },

      calculateMonthlyDepreciation: (period) => {
        const targetPeriod = period || getCurrentPeriod();
        const { assets, depreciationRecords, postedPeriods } = get();

        if (postedPeriods.some(p => p.period === targetPeriod)) return [];

        const newRecords: DepreciationRecord[] = [];

        assets.forEach(asset => {
          if (asset.status === 'scrapped' || asset.status === 'lost') return;

          if (asset.scrapDate) {
            const scrapMonth = dayjs(asset.scrapDate).format('YYYY-MM');
            if (targetPeriod >= scrapMonth) return;
          }

          const existingRecord = depreciationRecords.find(r => r.assetId === asset.id && r.period === targetPeriod);
          if (existingRecord) return;

          const monthsDepreciated = depreciationRecords.filter(r => r.assetId === asset.id).length;
          if (monthsDepreciated >= asset.usefulLife) return;

          const purchaseMonth = dayjs(asset.purchaseDate).format('YYYY-MM');
          if (targetPeriod < purchaseMonth) return;

          const calc = calculateDepreciation(asset, monthsDepreciated);

          const record: DepreciationRecord = {
            id: generateId(),
            assetId: asset.id,
            period: targetPeriod,
            depreciationMethod: asset.depreciationMethod,
            monthlyDepreciation: calc.monthlyDepreciation,
            accumulatedDepreciation: calc.accumulatedDepreciation,
            bookValue: calc.bookValue,
            createdAt: dayjs().format('YYYY-MM-DD'),
          };

          newRecords.push(record);

          get().updateAsset(asset.id, {
            currentValue: calc.bookValue,
            accumulatedDepreciation: calc.accumulatedDepreciation,
          });
        });

        if (newRecords.length > 0) {
          set({ depreciationRecords: [...depreciationRecords, ...newRecords] });
        }

        return newRecords;
      },

      getAssetDepreciationRecords: (assetId) => {
        return get().depreciationRecords
          .filter(r => r.assetId === assetId)
          .sort((a, b) => a.period.localeCompare(b.period));
      },

      postDepreciationPeriod: (period) => {
        const { postedPeriods, currentUser } = get();
        if (postedPeriods.some(p => p.period === period)) return;
        set({
          postedPeriods: [...postedPeriods, {
            period,
            postedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            postedBy: currentUser?.id || '',
          }],
        });
      },

      unpostDepreciationPeriod: (period) => {
        const { postedPeriods } = get();
        set({ postedPeriods: postedPeriods.filter(p => p.period !== period) });
      },

      isPeriodPosted: (period) => {
        return get().postedPeriods.some(p => p.period === period);
      },

      createAllocation: (assetId, userId, departmentId) => {
        const { allocations, assets } = get();
        const user = get().users.find(u => u.id === userId);
        if (!user) throw new Error('用户不存在');

        const allocation: AllocationRecord = {
          id: generateId(),
          assetId,
          userId,
          departmentId,
          allocationDate: dayjs().format('YYYY-MM-DD'),
          status: 'pending',
          type: 'allocate',
        };

        get().updateAsset(assetId, {
          status: 'in-use',
          currentUserId: userId,
          currentDepartmentId: departmentId,
        });

        set({ allocations: [...allocations, allocation] });
        return allocation;
      },

      confirmAllocation: (allocationId) => {
        const { allocations } = get();
        const allocation = allocations.find(a => a.id === allocationId);
        if (!allocation) return;

        set({
          allocations: allocations.map(a =>
            a.id === allocationId
              ? { ...a, status: 'confirmed', confirmedAt: dayjs().format('YYYY-MM-DD') }
              : a
          ),
        });
      },

      returnAllocation: (allocationId) => {
        const { allocations } = get();
        const allocation = allocations.find(a => a.id === allocationId);
        if (!allocation) return;

        get().updateAsset(allocation.assetId, {
          status: 'in-stock',
          currentUserId: undefined,
          currentDepartmentId: undefined,
        });

        set({
          allocations: allocations.map(a =>
            a.id === allocationId
              ? { ...a, status: 'returned', type: 'return' as const, returnedAt: dayjs().format('YYYY-MM-DD') }
              : a
          ),
        });
      },

      createTransfer: (assetId, toUserId, reason) => {
        const { transfers, assets, users } = get();
        const asset = assets.find(a => a.id === assetId);
        const toUser = users.find(u => u.id === toUserId);
        if (!asset || !toUser) throw new Error('资产或用户不存在');

        const fromUserId = asset.currentUserId || '';
        const fromDepartmentId = asset.currentDepartmentId || '';

        const transfer: TransferRecord = {
          id: generateId(),
          assetId,
          fromUserId,
          toUserId,
          fromDepartmentId,
          toDepartmentId: toUser.departmentId,
          applyDate: dayjs().format('YYYY-MM-DD'),
          status: 'pending',
          reason,
        };

        get().updateAsset(assetId, { status: 'transferred' });
        set({ transfers: [...transfers, transfer] });
        return transfer;
      },

      approveTransfer: (transferId, approverId) => {
        const { transfers, currentUser } = get();
        set({
          transfers: transfers.map(t =>
            t.id === transferId ? {
              ...t,
              status: 'approved',
              approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              approvedBy: approverId || currentUser?.id,
            } : t
          ),
        });
      },

      rejectTransfer: (transferId, reason, rejectorId) => {
        const { transfers, currentUser } = get();
        const transfer = transfers.find(t => t.id === transferId);
        if (transfer) {
          get().updateAsset(transfer.assetId, { status: 'in-use' });
        }
        set({
          transfers: transfers.map(t =>
            t.id === transferId ? {
              ...t,
              status: 'rejected',
              rejectReason: reason,
              approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              approvedBy: rejectorId || currentUser?.id,
            } : t
          ),
        });
      },

      confirmTransfer: (transferId) => {
        const { transfers } = get();
        const transfer = transfers.find(t => t.id === transferId);
        if (!transfer) return;

        get().updateAsset(transfer.assetId, {
          status: 'in-use',
          currentUserId: transfer.toUserId,
          currentDepartmentId: transfer.toDepartmentId,
        });

        set({
          transfers: transfers.map(t =>
            t.id === transferId
              ? { ...t, status: 'confirmed', confirmedAt: dayjs().format('YYYY-MM-DD') }
              : t
          ),
        });
      },

      createScrap: (assetId, applyUserId, reason) => {
        const { scraps } = get();
        const scrap: ScrapRecord = {
          id: generateId(),
          assetId,
          applyUserId,
          applyDate: dayjs().format('YYYY-MM-DD'),
          reason,
          status: 'pending',
        };
        set({ scraps: [...scraps, scrap] });
        return scrap;
      },

      approveScrap: (scrapId, residualIncome) => {
        const { scraps, currentUser } = get();
        const scrap = scraps.find(s => s.id === scrapId);
        if (!scrap) return undefined;

        const scrapDate = dayjs().format('YYYY-MM-DD');
        get().updateAsset(scrap.assetId, { status: 'scrapped', scrapDate });
        set({
          scraps: scraps.map(s =>
            s.id === scrapId
              ? {
                  ...s,
                  status: 'approved',
                  approvedAt: scrapDate,
                  approvedBy: currentUser?.id,
                  residualIncome,
                }
              : s
          ),
        });
        return get().createScrapVoucherFromScrap(scrapId);
      },

      rejectScrap: (scrapId) => {
        const { scraps } = get();
        set({
          scraps: scraps.map(s =>
            s.id === scrapId ? { ...s, status: 'rejected' } : s
          ),
        });
      },

      createDepreciationVoucher: (period, dimension) => {
        const { depreciationVouchers, depreciationRecords, assets, categories, departments, currentUser } = get();
        const existing = depreciationVouchers.find(v => v.period === period && v.summaryDimension === dimension);
        if (existing) return existing;

        const periodRecords = depreciationRecords.filter(r => r.period === period);
        const entries: VoucherEntry[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        if (dimension === 'category') {
          const categoryMap = new Map<string, { categoryId: string; amount: number; count: number }>();
          periodRecords.forEach(record => {
            const asset = assets.find(a => a.id === record.assetId);
            if (!asset) return;
            const key = asset.categoryId;
            const cur = categoryMap.get(key);
            if (cur) {
              cur.amount += record.monthlyDepreciation;
              cur.count += 1;
            } else {
              categoryMap.set(key, { categoryId: key, amount: record.monthlyDepreciation, count: 1 });
            }
          });
          categoryMap.forEach(({ categoryId, amount }) => {
            const rounded = Math.round(amount * 100) / 100;
            const cat = categories.find(c => c.id === categoryId);
            entries.push({
              summary: `计提${period}折旧 - ${cat?.name || categoryId}`,
              accountCode: '6602',
              accountName: '管理费用/制造费用-折旧费',
              direction: 'debit',
              amount: rounded,
              dimension: cat?.name,
            });
            entries.push({
              summary: `计提${period}折旧 - ${cat?.name || categoryId}`,
              accountCode: '1602',
              accountName: '累计折旧',
              direction: 'credit',
              amount: rounded,
              dimension: cat?.name,
            });
            totalDebit += rounded;
            totalCredit += rounded;
          });
        } else {
          const deptMap = new Map<string, { deptId: string; amount: number; count: number }>();
          periodRecords.forEach(record => {
            const asset = assets.find(a => a.id === record.assetId);
            if (!asset) return;
            const key = asset.currentDepartmentId || 'unallocated';
            const cur = deptMap.get(key);
            if (cur) {
              cur.amount += record.monthlyDepreciation;
              cur.count += 1;
            } else {
              deptMap.set(key, { deptId: key, amount: record.monthlyDepreciation, count: 1 });
            }
          });
          deptMap.forEach(({ deptId, amount }) => {
            const rounded = Math.round(amount * 100) / 100;
            const deptName = deptId === 'unallocated' ? '未分配' : departments.find(d => d.id === deptId)?.name || deptId;
            entries.push({
              summary: `计提${period}折旧 - ${deptName}`,
              accountCode: '6602',
              accountName: '管理费用/制造费用-折旧费',
              direction: 'debit',
              amount: rounded,
              dimension: deptName,
            });
            entries.push({
              summary: `计提${period}折旧 - ${deptName}`,
              accountCode: '1602',
              accountName: '累计折旧',
              direction: 'credit',
              amount: rounded,
              dimension: deptName,
            });
            totalDebit += rounded;
            totalCredit += rounded;
          });
        }

        const voucher: DepreciationVoucher = {
          id: generateId(),
          voucherNo: `DPR-${period}-${dimension === 'category' ? 'C' : 'D'}-${String(depreciationVouchers.length + 1).padStart(4, '0')}`,
          period,
          type: 'depreciation',
          summaryDimension: dimension,
          status: 'draft',
          entries,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          assetCount: periodRecords.length,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: currentUser?.id || '',
        };
        set({ depreciationVouchers: [...depreciationVouchers, voucher] });
        return voucher;
      },

      getDepreciationVoucherByPeriod: (period) => {
        return get().depreciationVouchers.find(v => v.period === period);
      },

      createScrapVoucherFromScrap: (scrapId) => {
        const { scrapVouchers, scraps, assets, currentUser } = get();
        const scrap = scraps.find(s => s.id === scrapId);
        if (!scrap) return undefined;

        const existing = scrapVouchers.find(v => v.scrapRecordId === scrapId);
        if (existing) return existing;

        const asset = assets.find(a => a.id === scrap.assetId);
        if (!asset) return undefined;

        const originalValue = asset.originalValue;
        const accumulatedDep = asset.accumulatedDepreciation;
        const netValue = Math.round((originalValue - accumulatedDep) * 100) / 100;
        const residualIncome = scrap.residualIncome || 0;
        const gainLoss = Math.round((residualIncome - netValue) * 100) / 100;

        const entries: VoucherEntry[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        entries.push({
          summary: `结转${asset.assetNo} ${asset.name} 报废 - 累计折旧冲销`,
          accountCode: '1602',
          accountName: '累计折旧',
          direction: 'debit',
          amount: accumulatedDep,
        });
        totalDebit += accumulatedDep;

        entries.push({
          summary: `结转${asset.assetNo} ${asset.name} 报废 - 资产原值转出`,
          accountCode: '1601',
          accountName: '固定资产',
          direction: 'credit',
          amount: originalValue,
        });
        totalCredit += originalValue;

        if (residualIncome > 0) {
          entries.push({
            summary: `${asset.assetNo} ${asset.name} 报废残值收入`,
            accountCode: '1001',
            accountName: '银行存款/库存现金',
            direction: 'debit',
            amount: residualIncome,
          });
          totalDebit += residualIncome;
        }

        if (gainLoss >= 0) {
          entries.push({
            summary: `${asset.assetNo} ${asset.name} 报废收益`,
            accountCode: '6301',
            accountName: '营业外收入',
            direction: 'credit',
            amount: gainLoss,
          });
          totalCredit += gainLoss;
        } else {
          entries.push({
            summary: `${asset.assetNo} ${asset.name} 报废损失`,
            accountCode: '6711',
            accountName: '营业外支出',
            direction: 'debit',
            amount: Math.abs(gainLoss),
          });
          totalDebit += Math.abs(gainLoss);
        }

        const period = dayjs(scrap.approvedAt || scrap.applyDate).format('YYYY-MM');

        const voucher: ScrapVoucher = {
          id: generateId(),
          voucherNo: `SCR-${period}-${String(scrapVouchers.length + 1).padStart(4, '0')}`,
          period,
          type: 'scrap',
          status: 'draft',
          assetId: asset.id,
          assetNo: asset.assetNo,
          assetName: asset.name,
          scrapRecordId: scrap.id,
          originalValue,
          accumulatedDepreciation: accumulatedDep,
          netValue,
          residualIncome,
          gainLoss,
          entries,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: currentUser?.id || '',
        };

        set({ scrapVouchers: [...scrapVouchers, voucher] });
        return voucher;
      },

      confirmVoucher: (voucherId, voucherType, confirmerId) => {
        const { depreciationVouchers, scrapVouchers, currentUser } = get();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const confirmer = confirmerId || currentUser?.id || '';

        if (voucherType === 'depreciation') {
          set({
            depreciationVouchers: depreciationVouchers.map(v =>
              v.id === voucherId ? { ...v, status: 'posted', postedAt: now, postedBy: confirmer } : v
            ),
          });
        } else {
          set({
            scrapVouchers: scrapVouchers.map(v =>
              v.id === voucherId ? { ...v, status: 'posted', postedAt: now, postedBy: confirmer } : v
            ),
          });
        }
      },

      revokeVoucher: (voucherId, voucherType, revokerId) => {
        const { depreciationVouchers, scrapVouchers, currentUser } = get();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const revoker = revokerId || currentUser?.id || '';

        if (voucherType === 'depreciation') {
          set({
            depreciationVouchers: depreciationVouchers.map(v =>
              v.id === voucherId ? { ...v, status: 'revoked', revokedAt: now, revokedBy: revoker } : v
            ),
          });
        } else {
          set({
            scrapVouchers: scrapVouchers.map(v =>
              v.id === voucherId ? { ...v, status: 'revoked', revokedAt: now, revokedBy: revoker } : v
            ),
          });
        }
      },

      getAllVouchers: () => {
        const { depreciationVouchers, scrapVouchers } = get();
        const all: FinanceVoucher[] = [
          ...depreciationVouchers,
          ...scrapVouchers,
        ];
        return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },

      createInventoryPlan: (name, startDate, endDate, createdBy, scopeDepartmentId, scopeLocation) => {
        const { inventoryPlans, inventoryDetails, assets } = get();
        const plan: InventoryPlan = {
          id: generateId(),
          name,
          startDate,
          endDate,
          status: 'draft',
          createdBy,
          createdAt: dayjs().format('YYYY-MM-DD'),
          scopeDepartmentId,
          scopeLocation,
        };

        let scopedAssets = assets.filter(a => a.status !== 'scrapped' && a.status !== 'lost');
        if (scopeDepartmentId) {
          scopedAssets = scopedAssets.filter(a => a.currentDepartmentId === scopeDepartmentId);
        }
        if (scopeLocation) {
          scopedAssets = scopedAssets.filter(a => a.location === scopeLocation);
        }

        const newDetails: InventoryDetail[] = scopedAssets.map(a => ({
          id: generateId(),
          planId: plan.id,
          assetId: a.id,
          systemStatus: a.status,
          checkResult: 'pending' as const,
        }));

        set({
          inventoryPlans: [...inventoryPlans, plan],
          inventoryDetails: [...inventoryDetails, ...newDetails],
        });

        return plan;
      },

      startInventory: (planId) => {
        const { inventoryPlans } = get();
        set({
          inventoryPlans: inventoryPlans.map(p =>
            p.id === planId ? { ...p, status: 'in-progress' } : p
          ),
        });
      },

      completeInventory: (planId) => {
        const { inventoryPlans } = get();
        set({
          inventoryPlans: inventoryPlans.map(p =>
            p.id === planId ? { ...p, status: 'completed' } : p
          ),
        });
      },

      checkAsset: (planId, assetId, result, remark, actualLocation, actualUserId) => {
        const { inventoryDetails } = get();
        set({
          inventoryDetails: inventoryDetails.map(d =>
            d.planId === planId && d.assetId === assetId
              ? { ...d, checkResult: result, checkedAt: dayjs().format('YYYY-MM-DD'), remark, actualLocation, actualUserId }
              : d
          ),
        });
      },

      getInventoryDetails: (planId) => {
        const { inventoryDetails, assets } = get();
        return inventoryDetails
          .filter(d => d.planId === planId)
          .map(d => ({ ...d, asset: assets.find(a => a.id === d.assetId) }));
      },

      getInventorySummary: (planId) => {
        const details = get().getInventoryDetails(planId);
        const total = details.length;
        const checked = details.filter(d => d.checkResult !== 'pending').length;
        const matched = details.filter(d => d.checkResult === 'matched').length;
        const mismatched = details.filter(d => d.checkResult === 'mismatched').length;
        const lost = details.filter(d => d.checkResult === 'lost').length;
        return { total, checked, matched, mismatched, lost };
      },

      addCategory: (category) => {
        const { categories } = get();
        const newCategory: Category = { ...category, id: generateId() };
        set({ categories: [...categories, newCategory] });
        return newCategory;
      },

      updateCategory: (id, categoryData) => {
        const { categories } = get();
        set({ categories: categories.map(c => c.id === id ? { ...c, ...categoryData } : c) });
      },

      deleteCategory: (id) => {
        const { categories } = get();
        set({ categories: categories.filter(c => c.id !== id) });
      },

      addDepartment: (department) => {
        const { departments } = get();
        const newDept: Department = { ...department, id: generateId() };
        set({ departments: [...departments, newDept] });
        return newDept;
      },

      updateDepartment: (id, deptData) => {
        const { departments } = get();
        set({ departments: departments.map(d => d.id === id ? { ...d, ...deptData } : d) });
      },

      deleteDepartment: (id) => {
        const { departments } = get();
        set({ departments: departments.filter(d => d.id !== id) });
      },

      addUser: (user) => {
        const { users } = get();
        const newUser: User = { ...user, id: generateId() };
        set({ users: [...users, newUser] });
        return newUser;
      },

      updateUser: (id, userData) => {
        const { users } = get();
        set({ users: users.map(u => u.id === id ? { ...u, ...userData } : u) });
      },

      deleteUser: (id) => {
        const { users } = get();
        set({ users: users.filter(u => u.id !== id) });
      },

      login: (username) => {
        const user = get().users.find(u => u.username === username);
        if (user) {
          set({ currentUser: user });
          return user;
        }
        return null;
      },

      logout: () => {
        set({ currentUser: null });
      },
    }),
    {
      name: 'asset-management-storage',
      partialize: (state) => ({
        categories: state.categories,
        departments: state.departments,
        users: state.users,
        assets: state.assets,
        depreciationRecords: state.depreciationRecords,
        postedPeriods: state.postedPeriods,
        allocations: state.allocations,
        transfers: state.transfers,
        scraps: state.scraps,
        inventoryPlans: state.inventoryPlans,
        inventoryDetails: state.inventoryDetails,
        currentUser: state.currentUser,
        initialized: state.initialized,
      }),
    }
  )
);

export default useAppStore;
