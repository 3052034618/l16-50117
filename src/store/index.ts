import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Category, Department, User, Asset, DepreciationRecord,
  AllocationRecord, TransferRecord, ScrapRecord,
  InventoryPlan, InventoryDetail, DashboardStats,
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
  allocations: AllocationRecord[];
  transfers: TransferRecord[];
  scraps: ScrapRecord[];
  inventoryPlans: InventoryPlan[];
  inventoryDetails: InventoryDetail[];
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

  createAllocation: (assetId: string, userId: string, departmentId: string) => AllocationRecord;
  confirmAllocation: (allocationId: string) => void;

  createTransfer: (assetId: string, fromUserId: string, toUserId: string, reason?: string) => TransferRecord;
  approveTransfer: (transferId: string) => void;
  rejectTransfer: (transferId: string, reason?: string) => void;
  confirmTransfer: (transferId: string) => void;

  createScrap: (assetId: string, applyUserId: string, reason: string) => ScrapRecord;
  approveScrap: (scrapId: string, residualIncome: number) => void;
  rejectScrap: (scrapId: string, reason?: string) => void;

  createInventoryPlan: (name: string, startDate: string, endDate: string, createdBy: string) => InventoryPlan;
  startInventory: (planId: string) => void;
  completeInventory: (planId: string) => void;
  checkAsset: (planId: string, assetId: string, result: 'matched' | 'mismatched' | 'lost', remark?: string) => void;
  getInventoryDetails: (planId: string) => (InventoryDetail & { asset?: Asset })[];
  getInventorySummary: (planId: string) => { total: number; checked: number; matched: number; mismatched: number; lost: number };

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
      allocations: [],
      transfers: [],
      scraps: [],
      inventoryPlans: [],
      inventoryDetails: [],
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
          allocations: mockAllocations,
          transfers: mockTransfers,
          scraps: mockScraps,
          inventoryPlans: mockInventoryPlans,
          inventoryDetails: mockInventoryDetails,
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
        const { assets, depreciationRecords } = get();
        const newRecords: DepreciationRecord[] = [];

        assets.forEach(asset => {
          if (asset.status === 'scrapped' || asset.status === 'lost') return;
          
          const existingRecord = depreciationRecords.find(r => r.assetId === asset.id && r.period === targetPeriod);
          if (existingRecord) return;

          const monthsDepreciated = depreciationRecords.filter(r => r.assetId === asset.id).length;
          if (monthsDepreciated >= asset.usefulLife) return;

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

      createTransfer: (assetId, fromUserId, toUserId, reason) => {
        const { transfers, assets, users } = get();
        const asset = assets.find(a => a.id === assetId);
        const toUser = users.find(u => u.id === toUserId);
        if (!asset || !toUser) throw new Error('资产或用户不存在');

        const transfer: TransferRecord = {
          id: generateId(),
          assetId,
          fromUserId,
          toUserId,
          fromDepartmentId: asset.currentDepartmentId!,
          toDepartmentId: toUser.departmentId,
          applyDate: dayjs().format('YYYY-MM-DD'),
          status: 'pending',
          reason,
        };

        get().updateAsset(assetId, { status: 'transferred' });
        set({ transfers: [...transfers, transfer] });
        return transfer;
      },

      approveTransfer: (transferId) => {
        const { transfers } = get();
        set({
          transfers: transfers.map(t =>
            t.id === transferId ? { ...t, status: 'approved' } : t
          ),
        });
      },

      rejectTransfer: (transferId) => {
        const { transfers } = get();
        const transfer = transfers.find(t => t.id === transferId);
        if (transfer) {
          get().updateAsset(transfer.assetId, { status: 'in-use' });
        }
        set({
          transfers: transfers.map(t =>
            t.id === transferId ? { ...t, status: 'rejected' } : t
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
        if (!scrap) return;

        get().updateAsset(scrap.assetId, { status: 'scrapped' });
        set({
          scraps: scraps.map(s =>
            s.id === scrapId
              ? {
                  ...s,
                  status: 'approved',
                  approvedAt: dayjs().format('YYYY-MM-DD'),
                  approvedBy: currentUser?.id,
                  residualIncome,
                }
              : s
          ),
        });
      },

      rejectScrap: (scrapId) => {
        const { scraps } = get();
        set({
          scraps: scraps.map(s =>
            s.id === scrapId ? { ...s, status: 'rejected' } : s
          ),
        });
      },

      createInventoryPlan: (name, startDate, endDate, createdBy) => {
        const { inventoryPlans, inventoryDetails, assets } = get();
        const plan: InventoryPlan = {
          id: generateId(),
          name,
          startDate,
          endDate,
          status: 'draft',
          createdBy,
          createdAt: dayjs().format('YYYY-MM-DD'),
        };

        const newDetails: InventoryDetail[] = assets
          .filter(a => a.status !== 'scrapped' && a.status !== 'lost')
          .map(a => ({
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

      checkAsset: (planId, assetId, result, remark) => {
        const { inventoryDetails } = get();
        set({
          inventoryDetails: inventoryDetails.map(d =>
            d.planId === planId && d.assetId === assetId
              ? { ...d, checkResult: result, checkedAt: dayjs().format('YYYY-MM-DD'), remark }
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
