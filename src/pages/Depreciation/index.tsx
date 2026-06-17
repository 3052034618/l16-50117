import { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Tabs,
  message,
  Popconfirm,
  Tag,
  Alert,
} from 'antd';
import {
  CalculatorOutlined,
  DownloadOutlined,
  ReloadOutlined,
  RiseOutlined,
  BarChartOutlined,
  AreaChartOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { EChartsOption } from 'echarts';
import useAppStore from '@/store';
import { formatCurrency, getCurrentPeriod, getMonthList, downloadJson, formatDate } from '@/utils/helpers';
import { DEPRECIATION_METHODS } from '@/utils/constants';
import type { Asset, DepreciationMethod, DepreciationRecord, PostedPeriod } from '@/types';

const { Option } = Select;

interface DepreciationDetail extends Asset {
  monthlyDepreciation: number;
  period: string;
}

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  assetCount: number;
  originalValueTotal: number;
  monthlyDepreciationTotal: number;
  accumulatedDepreciationTotal: number;
  netValueTotal: number;
}

interface DepartmentSummary {
  departmentId: string;
  departmentName: string;
  assetCount: number;
  monthlyDepreciationTotal: number;
}

const Depreciation = () => {
  const {
    assets,
    categories,
    depreciationRecords,
    postedPeriods,
    calculateMonthlyDepreciation,
    postDepreciationPeriod,
    unpostDepreciationPeriod,
    isPeriodPosted,
    users,
    departments,
  } = useAppStore();

  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [filterCategory, setFilterCategory] = useState<string>();
  const [filterMethod, setFilterMethod] = useState<DepreciationMethod>();
  const [activeTab, setActiveTab] = useState<string>('detail');

  const currentPeriod = getCurrentPeriod();

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    return users.find(u => u.id === userId)?.name || '-';
  };

  const periodPosted = useMemo(() => {
    return isPeriodPosted(selectedPeriod);
  }, [selectedPeriod, isPeriodPosted, postedPeriods]);

  const postedPeriodInfo = useMemo((): PostedPeriod | undefined => {
    return postedPeriods.find(p => p.period === selectedPeriod);
  }, [postedPeriods, selectedPeriod]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (asset.status === 'scrapped' || asset.status === 'lost') return false;
      if (filterCategory && asset.categoryId !== filterCategory) return false;
      if (filterMethod && asset.depreciationMethod !== filterMethod) return false;
      return true;
    });
  }, [assets, filterCategory, filterMethod]);

  const periodDepreciationRecords = useMemo(() => {
    return depreciationRecords.filter((r) => r.period === selectedPeriod);
  }, [depreciationRecords, selectedPeriod]);

  const depreciationDetailData = useMemo((): DepreciationDetail[] => {
    return filteredAssets.map((asset) => {
      const record = periodDepreciationRecords.find((r) => r.assetId === asset.id);
      return {
        ...asset,
        monthlyDepreciation: record?.monthlyDepreciation || 0,
        period: selectedPeriod,
      };
    });
  }, [filteredAssets, periodDepreciationRecords, selectedPeriod]);

  const uncalculatedAssets = useMemo(() => {
    return filteredAssets.filter(
      (asset) => !periodDepreciationRecords.some((r) => r.assetId === asset.id)
    );
  }, [filteredAssets, periodDepreciationRecords]);

  const stats = useMemo(() => {
    const monthlyTotal = periodDepreciationRecords.reduce((sum, r) => sum + r.monthlyDepreciation, 0);
    const accumulatedTotal = depreciationRecords.reduce((sum, r) => sum + r.monthlyDepreciation, 0);
    const netValueTotal = filteredAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const calculatedCount = periodDepreciationRecords.filter((r) =>
      filteredAssets.some((a) => a.id === r.assetId)
    ).length;

    return {
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      accumulatedTotal: Math.round(accumulatedTotal * 100) / 100,
      netValueTotal: Math.round(netValueTotal * 100) / 100,
      calculatedCount,
      uncalculatedCount: uncalculatedAssets.length,
    };
  }, [periodDepreciationRecords, depreciationRecords, filteredAssets, uncalculatedAssets]);

  const categorySummaryData = useMemo((): CategorySummary[] => {
    const summaryMap = new Map<string, CategorySummary>();

    depreciationDetailData.forEach((item) => {
      const existing = summaryMap.get(item.categoryId);
      if (existing) {
        existing.assetCount += 1;
        existing.originalValueTotal += item.originalValue;
        existing.monthlyDepreciationTotal += item.monthlyDepreciation;
        existing.accumulatedDepreciationTotal += item.accumulatedDepreciation;
        existing.netValueTotal += item.currentValue;
      } else {
        summaryMap.set(item.categoryId, {
          categoryId: item.categoryId,
          categoryName: getCategoryName(item.categoryId),
          assetCount: 1,
          originalValueTotal: item.originalValue,
          monthlyDepreciationTotal: item.monthlyDepreciation,
          accumulatedDepreciationTotal: item.accumulatedDepreciation,
          netValueTotal: item.currentValue,
        });
      }
    });

    return Array.from(summaryMap.values()).map((item) => ({
      ...item,
      originalValueTotal: Math.round(item.originalValueTotal * 100) / 100,
      monthlyDepreciationTotal: Math.round(item.monthlyDepreciationTotal * 100) / 100,
      accumulatedDepreciationTotal: Math.round(item.accumulatedDepreciationTotal * 100) / 100,
      netValueTotal: Math.round(item.netValueTotal * 100) / 100,
    }));
  }, [depreciationDetailData]);

  const departmentSummaryData = useMemo((): DepartmentSummary[] => {
    const summaryMap = new Map<string, DepartmentSummary>();

    depreciationDetailData
      .filter((item) => item.monthlyDepreciation > 0)
      .forEach((item) => {
        const deptId = item.currentDepartmentId || 'unallocated';
        const existing = summaryMap.get(deptId);
        if (existing) {
          existing.assetCount += 1;
          existing.monthlyDepreciationTotal += item.monthlyDepreciation;
        } else {
          summaryMap.set(deptId, {
            departmentId: deptId,
            departmentName: deptId === 'unallocated' ? '未分配' : departments.find((d) => d.id === deptId)?.name || '-',
            assetCount: 1,
            monthlyDepreciationTotal: item.monthlyDepreciation,
          });
        }
      });

    return Array.from(summaryMap.values()).map((item) => ({
      ...item,
      monthlyDepreciationTotal: Math.round(item.monthlyDepreciationTotal * 100) / 100,
    }));
  }, [depreciationDetailData, departments]);

  const netValueTrendOption = useMemo((): EChartsOption => {
    const months = getMonthList(dayjs().subtract(11, 'month').format('YYYY-MM'), 12);
    const netValueData: number[] = [];
    const accumulatedData: number[] = [];

    months.forEach((month) => {
      const monthRecords = depreciationRecords.filter((r) => r.period === month);
      const monthNetValue = monthRecords.reduce((sum, r) => sum + r.bookValue, 0);
      const monthAccumulated = monthRecords.reduce((sum, r) => sum + r.monthlyDepreciation, 0);

      const prevAccumulated = accumulatedData.length > 0 ? accumulatedData[accumulatedData.length - 1] : 0;
      netValueData.push(Math.round(monthNetValue * 100) / 100);
      accumulatedData.push(Math.round((prevAccumulated + monthAccumulated) * 100) / 100);
    });

    return {
      title: {
        text: '净值趋势与累计折旧',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'normal' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string; seriesName: string; value: number }>;
          let result = `${p[0].axisValue}<br/>`;
          p.forEach((item) => {
            result += `${item.seriesName}: ${formatCurrency(item.value)}<br/>`;
          });
          return result;
        },
      },
      legend: { data: ['资产净值', '累计折旧'], bottom: 10 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: '资产净值',
          position: 'left',
          axisLabel: { formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万` },
        },
        {
          type: 'value',
          name: '累计折旧',
          position: 'right',
          axisLabel: { formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万` },
        },
      ],
      series: [
        {
          name: '资产净值',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          yAxisIndex: 0,
          lineStyle: { width: 2, color: '#52c41a' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
              ],
            },
          },
          data: netValueData,
        },
        {
          name: '累计折旧',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          yAxisIndex: 1,
          lineStyle: { width: 2, color: '#fa8c16' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(250, 140, 22, 0.3)' },
                { offset: 1, color: 'rgba(250, 140, 22, 0.05)' },
              ],
            },
          },
          data: accumulatedData,
        },
      ],
    };
  }, [depreciationRecords]);

  const handleCalculate = () => {
    if (periodPosted) {
      message.warning('该期间已结账，无法重新计提');
      return;
    }
    const newRecords = calculateMonthlyDepreciation(selectedPeriod);
    if (newRecords.length > 0) {
      message.success(`成功计提 ${newRecords.length} 条折旧记录`);
    } else {
      message.info('本期折旧已全部计提完成，无新增记录');
    }
  };

  const handlePostPeriod = () => {
    if (uncalculatedAssets.length > 0) {
      message.warning(`还有 ${uncalculatedAssets.length} 项资产未计提折旧，请先完成计提`);
      return;
    }
    if (periodDepreciationRecords.length === 0) {
      message.warning('本期无折旧记录，请先计提折旧');
      return;
    }
    postDepreciationPeriod(selectedPeriod);
    message.success(`${selectedPeriod} 期间已结账`);
  };

  const handleUnpostPeriod = () => {
    unpostDepreciationPeriod(selectedPeriod);
    message.success(`${selectedPeriod} 期间已反结账`);
  };

  const handleExport = () => {
    const exportData = depreciationDetailData.map((item) => ({
      资产编号: item.assetNo,
      名称: item.name,
      类别: getCategoryName(item.categoryId),
      折旧方法: DEPRECIATION_METHODS[item.depreciationMethod].label,
      原值: item.originalValue,
      本月折旧: item.monthlyDepreciation,
      累计折旧: item.accumulatedDepreciation,
      账面净值: item.currentValue,
      购置日期: formatDate(item.purchaseDate),
      期间: selectedPeriod,
    }));
    downloadJson(exportData, `折旧台账_${selectedPeriod}_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('导出成功');
  };

  const handleReset = () => {
    setSelectedPeriod(currentPeriod);
    setFilterCategory(undefined);
    setFilterMethod(undefined);
  };

  const handleExportVoucher = (type: 'category' | 'department') => {
    const data = type === 'category'
      ? categorySummaryData
        .filter((c) => c.monthlyDepreciationTotal > 0)
        .map((item) => ({
          汇总维度: '资产类别',
          汇总项: item.categoryName,
          资产数量: item.assetCount,
          '借方-折旧费': item.monthlyDepreciationTotal,
          '贷方-累计折旧': item.monthlyDepreciationTotal,
        }))
      : departmentSummaryData
        .filter((d) => d.monthlyDepreciationTotal > 0)
        .map((item) => ({
          汇总维度: '部门',
          汇总项: item.departmentName,
          资产数量: item.assetCount,
          '借方-折旧费': item.monthlyDepreciationTotal,
          '贷方-累计折旧': item.monthlyDepreciationTotal,
        }));

    const totalDebit = data.reduce((sum, row) => sum + row['借方-折旧费'], 0);
    data.push({
      汇总维度: '合计',
      汇总项: '',
      资产数量: data.reduce((sum, row) => sum + row.资产数量, 0),
      '借方-折旧费': Math.round(totalDebit * 100) / 100,
      '贷方-累计折旧': Math.round(totalDebit * 100) / 100,
    });

    downloadJson(data, `折旧凭证_${selectedPeriod}_${type === 'category' ? '按类别' : '按部门'}.json`);
    message.success('凭证导出成功');
  };

  const departmentVoucherColumns: ColumnsType<DepartmentSummary> = [
    { title: '摘要', key: 'desc', width: 200, render: (_, record) => `计提${selectedPeriod}折旧 - ${record.departmentName}` },
    { title: '会计科目', key: 'debit', width: 220, render: () => '借：制造费用 / 管理费用 - 折旧费' },
    { title: '借方金额', dataIndex: 'monthlyDepreciationTotal', key: 'debitAmount', width: 140, align: 'right', render: (v) => formatCurrency(v) },
    { title: '', key: 'spacer1', width: 30 },
    { title: '会计科目', key: 'credit', width: 180, render: () => '贷：累计折旧' },
    { title: '贷方金额', dataIndex: 'monthlyDepreciationTotal', key: 'creditAmount', width: 140, align: 'right', render: (v) => formatCurrency(v) },
  ];

  const detailColumns: ColumnsType<DepreciationDetail> = [
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      key: 'assetNo',
      width: 130,
      fixed: 'left',
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 100,
      render: (categoryId) => getCategoryName(categoryId),
    },
    {
      title: '使用人',
      dataIndex: 'currentUserId',
      key: 'currentUserId',
      width: 90,
      render: (userId) => getUserName(userId),
    },
    {
      title: '折旧方法',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      width: 110,
      render: (method: DepreciationMethod) => DEPRECIATION_METHODS[method].label,
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      key: 'originalValue',
      width: 110,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '本月折旧',
      dataIndex: 'monthlyDepreciation',
      key: 'monthlyDepreciation',
      width: 110,
      align: 'right',
      render: (value) => value > 0
        ? <span className="text-orange-600">{formatCurrency(value)}</span>
        : <span className="text-gray-400">未计提</span>,
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      width: 110,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '账面净值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 110,
      align: 'right',
      fixed: 'right',
      render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span>,
    },
  ];

  const periodListColumns: ColumnsType<PostedPeriod> = [
    {
      title: '期间',
      dataIndex: 'period',
      key: 'period',
      width: 120,
      render: (period) => <span className="font-mono font-medium">{period}</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: () => <Tag color="green" icon={<CheckCircleOutlined />}>已结账</Tag>,
    },
    {
      title: '结账时间',
      dataIndex: 'postedAt',
      key: 'postedAt',
      width: 180,
    },
    {
      title: '操作人',
      dataIndex: 'postedBy',
      key: 'postedBy',
      width: 100,
      render: (userId) => getUserName(userId),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="确定要反结账吗？"
          description="反结账后可重新修改该期间折旧数据"
          onConfirm={() => handleUnpostPeriod()}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" icon={<UnlockOutlined />}>
            反结账
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const summaryColumns: ColumnsType<CategorySummary> = [
    { title: '类别', dataIndex: 'categoryName', key: 'categoryName', width: 160 },
    { title: '资产数量', dataIndex: 'assetCount', key: 'assetCount', width: 100, align: 'center', render: (value) => `${value} 件` },
    { title: '原值总额', dataIndex: 'originalValueTotal', key: 'originalValueTotal', width: 140, align: 'right', render: (value) => formatCurrency(value) },
    { title: '本月折旧', dataIndex: 'monthlyDepreciationTotal', key: 'monthlyDepreciationTotal', width: 140, align: 'right', render: (value) => <span className="text-orange-600">{formatCurrency(value)}</span> },
    { title: '累计折旧', dataIndex: 'accumulatedDepreciationTotal', key: 'accumulatedDepreciationTotal', width: 140, align: 'right', render: (value) => formatCurrency(value) },
    { title: '净值总额', dataIndex: 'netValueTotal', key: 'netValueTotal', width: 140, align: 'right', render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span> },
  ];

  const categoryVoucherColumns: ColumnsType<CategorySummary> = [
    { title: '摘要', key: 'desc', width: 200, render: (_, record) => `计提${selectedPeriod}折旧 - ${record.categoryName}` },
    { title: '会计科目', key: 'debit', width: 220, render: () => '借：制造费用 / 管理费用 - 折旧费' },
    { title: '借方金额', dataIndex: 'monthlyDepreciationTotal', key: 'debitAmount', width: 140, align: 'right', render: (v) => formatCurrency(v) },
    { title: '', key: 'spacer1', width: 30 },
    { title: '会计科目', key: 'credit', width: 180, render: () => '贷：累计折旧' },
    { title: '贷方金额', dataIndex: 'monthlyDepreciationTotal', key: 'creditAmount', width: 140, align: 'right', render: (v) => formatCurrency(v) },
  ];

  const tabItems = [
    {
      key: 'detail',
      label: <span><BarChartOutlined /> 折旧明细</span>,
      children: (
        <Table
          columns={detailColumns}
          dataSource={depreciationDetailData}
          rowKey="id"
          pagination={{ current: 1, pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条记录` }}
          scroll={{ x: 1100 }}
          size="middle"
        />
      ),
    },
    {
      key: 'summary',
      label: <span><AreaChartOutlined /> 折旧汇总</span>,
      children: (
        <Table
          columns={summaryColumns}
          dataSource={categorySummaryData}
          rowKey="categoryId"
          pagination={{ current: 1, pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条记录` }}
          scroll={{ x: 800 }}
          size="middle"
        />
      ),
    },
    {
      key: 'trend',
      label: <span><RiseOutlined /> 净值趋势</span>,
      children: <Card><ReactECharts option={netValueTrendOption} style={{ height: '400px' }} /></Card>,
    },
    {
      key: 'posting',
      label: <span><LockOutlined /> 结账管理</span>,
      children: (
        <div>
          <div className="mb-4">
            <h3 className="text-base font-medium mb-3">已结账期间</h3>
            <Table
              columns={periodListColumns}
              dataSource={postedPeriods.sort((a, b) => b.period.localeCompare(a.period))}
              rowKey="period"
              pagination={false}
              size="middle"
              locale={{ emptyText: '暂无已结账期间' }}
            />
          </div>
          <div className="mt-6">
            <h3 className="text-base font-medium mb-3">当前期间结账操作</h3>
            <Card size="small">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium">{selectedPeriod}</div>
                  <div className="text-gray-500 text-sm mt-1">
                    已计提 {periodDepreciationRecords.length} 条 / 待计提 {uncalculatedAssets.length} 条
                  </div>
                  {postedPeriodInfo && (
                    <div className="text-gray-400 text-xs mt-1">
                      结账时间：{postedPeriodInfo.postedAt} | 操作人：{getUserName(postedPeriodInfo.postedBy)}
                    </div>
                  )}
                </div>
                <Space>
                  {periodPosted ? (
                    <Popconfirm
                      title="确定要反结账吗？"
                      description="反结账后可重新修改该期间折旧数据"
                      onConfirm={handleUnpostPeriod}
                    >
                      <Button icon={<UnlockOutlined />}>反结账</Button>
                    </Popconfirm>
                  ) : (
                    <Button
                      type="primary"
                      icon={<LockOutlined />}
                      onClick={handlePostPeriod}
                      disabled={uncalculatedAssets.length > 0 || periodDepreciationRecords.length === 0}
                    >
                      结账
                    </Button>
                  )}
                </Space>
              </div>
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'voucher',
      label: <span><FileTextOutlined /> 折旧凭证</span>,
      children: !periodPosted ? (
        <Alert
          type="warning"
          showIcon
          message="请先完成结账后查看折旧凭证"
          description="凭证需结账后生成，确保本期折旧计提完成且数据不再变更。"
          className="my-4"
        />
      ) : (
        <div>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <div className="flex items-center justify-between">
              <div>
                <CheckCircleOutlined className="text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  期间 {selectedPeriod} 已结账，折旧凭证已生成
                </span>
              </div>
              {postedPeriodInfo && (
                <span className="text-gray-500 text-xs">
                  制单人：{getUserName(postedPeriodInfo.postedBy)} | 制单时间：{postedPeriodInfo.postedAt}
                </span>
              )}
            </div>
          </div>
          <Tabs
            defaultActiveKey="category"
            items={[
              {
                key: 'category',
                label: <span><AppstoreOutlined /> 按资产类别</span>,
                children: (
                  <div>
                    <div className="mb-2 text-right">
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExportVoucher('category')}>
                        导出凭证
                      </Button>
                    </div>
                    <Table
                      columns={categoryVoucherColumns}
                      dataSource={categorySummaryData.filter((c) => c.monthlyDepreciationTotal > 0)}
                      rowKey="categoryId"
                      pagination={false}
                      size="middle"
                      summary={(pageData) => {
                        let totalDebit = 0;
                        let totalCount = 0;
                        pageData.forEach(({ monthlyDepreciationTotal, assetCount }) => {
                          totalDebit += monthlyDepreciationTotal;
                          totalCount += assetCount;
                        });
                        return (
                          <>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={2}>
                                <b>合计（共 {totalCount} 项资产）</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2} align="right">
                                <b>{formatCurrency(Math.round(totalDebit * 100) / 100)}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} />
                              <Table.Summary.Cell index={4} />
                              <Table.Summary.Cell index={5} align="right">
                                <b>{formatCurrency(Math.round(totalDebit * 100) / 100)}</b>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </>
                        );
                      }}
                    />
                  </div>
                ),
              },
              {
                key: 'department',
                label: <span><TeamOutlined /> 按使用部门</span>,
                children: (
                  <div>
                    <div className="mb-2 text-right">
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExportVoucher('department')}>
                        导出凭证
                      </Button>
                    </div>
                    <Table
                      columns={departmentVoucherColumns}
                      dataSource={departmentSummaryData}
                      rowKey="departmentId"
                      pagination={false}
                      size="middle"
                      summary={(pageData) => {
                        let totalDebit = 0;
                        let totalCount = 0;
                        pageData.forEach(({ monthlyDepreciationTotal, assetCount }) => {
                          totalDebit += monthlyDepreciationTotal;
                          totalCount += assetCount;
                        });
                        return (
                          <>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={2}>
                                <b>合计（共 {totalCount} 项资产）</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2} align="right">
                                <b>{formatCurrency(Math.round(totalDebit * 100) / 100)}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} />
                              <Table.Summary.Cell index={4} />
                              <Table.Summary.Cell index={5} align="right">
                                <b>{formatCurrency(Math.round(totalDebit * 100) / 100)}</b>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </>
                        );
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <div className="text-gray-500 text-sm mb-1">期间选择</div>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={dayjs(selectedPeriod)}
              onChange={(date) => date && setSelectedPeriod(date.format('YYYY-MM'))}
              placeholder="选择期间"
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <div className="text-gray-500 text-sm mb-1">资产类别</div>
            <Select
              placeholder="选择类别"
              allowClear
              style={{ width: '100%' }}
              value={filterCategory}
              onChange={(value) => setFilterCategory(value)}
            >
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <div className="text-gray-500 text-sm mb-1">折旧方法</div>
            <Select
              placeholder="选择折旧方法"
              allowClear
              style={{ width: '100%' }}
              value={filterMethod}
              onChange={(value) => setFilterMethod(value)}
            >
              {Object.entries(DEPRECIATION_METHODS).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <div className="text-gray-500 text-sm mb-1">&nbsp;</div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {periodPosted && (
        <Alert
          message={`期间 ${selectedPeriod} 已结账`}
          description={`结账时间：${postedPeriodInfo?.postedAt}，操作人：${getUserName(postedPeriodInfo?.postedBy)}。如需修改请先反结账。`}
          type="info"
          showIcon
          icon={<LockOutlined />}
          className="mb-4"
          closable={false}
        />
      )}

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月折旧总额"
              value={stats.monthlyTotal}
              precision={2}
              prefix="¥"
              formatter={(value) => formatCurrency(value as number).replace('¥', '')}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="累计折旧总额"
              value={stats.accumulatedTotal}
              precision={2}
              prefix="¥"
              formatter={(value) => formatCurrency(value as number).replace('¥', '')}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="资产净值总额"
              value={stats.netValueTotal}
              precision={2}
              prefix="¥"
              formatter={(value) => formatCurrency(value as number).replace('¥', '')}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="计提进度"
              value={stats.uncalculatedCount === 0 ? '100' : Math.round((stats.calculatedCount / (stats.calculatedCount + stats.uncalculatedCount)) * 100)}
              suffix="%"
              valueStyle={{ color: stats.uncalculatedCount === 0 ? '#52c41a' : '#fa8c16' }}
            />
            <div className="text-xs text-gray-400 mt-1">
              已计提 {stats.calculatedCount} / 待计提 {stats.uncalculatedCount}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <span>折旧台账 - {selectedPeriod}</span>
            {periodPosted && <Tag color="green" icon={<CheckCircleOutlined />}>已结账</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出折旧台账
            </Button>
            {!periodPosted && (
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={handleCalculate}
                disabled={stats.uncalculatedCount === 0}
              >
                {stats.calculatedCount > 0 ? '继续计提' : '批量计提'}
              </Button>
            )}
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default Depreciation;
