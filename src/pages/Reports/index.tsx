import { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Tabs,
  Row,
  Col,
  DatePicker,
  Statistic,
  Tag,
  message,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  TableOutlined,
  BarChartOutlined,
  PieChartOutlined,
  FileTextOutlined,
  FundOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { EChartsOption } from 'echarts';
import useAppStore from '@/store';
import { formatCurrency, formatDate, downloadJson, getMonthList } from '@/utils/helpers';
import { ASSET_STATUS, CHECK_RESULT, DEPRECIATION_METHODS } from '@/utils/constants';
import type { Asset, DepreciationRecord, InventoryDetail, CheckResult as CheckResultType } from '@/types';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface AssetLedger extends Asset {
  categoryName: string;
}

interface DepreciationDetail extends DepreciationRecord {
  assetNo: string;
  assetName: string;
  categoryName: string;
}

interface InventoryDiff extends InventoryDetail {
  planName: string;
  assetNo: string;
  assetName: string;
  systemUser: string;
  systemLocation: string;
  actualUser: string;
}

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  assetCount: number;
  originalValueTotal: number;
  accumulatedDepreciationTotal: number;
  netValueTotal: number;
  percentage: number;
}

const Reports = () => {
  const {
    assets,
    categories,
    depreciationRecords,
    inventoryPlans,
    inventoryDetails,
    users,
    departments,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<string>('asset-ledger');

  const [assetFilterCategory, setAssetFilterCategory] = useState<string>();
  const [assetFilterStatus, setAssetFilterStatus] = useState<string>();
  const [assetFilterPeriod, setAssetFilterPeriod] = useState<[dayjs.Dayjs, dayjs.Dayjs]>();

  const [depreciationFilterPeriod, setDepreciationFilterPeriod] = useState<string>();
  const [depreciationFilterCategory, setDepreciationFilterCategory] = useState<string>();

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

  const getStatusTag = (status: string) => {
    const statusConfig = ASSET_STATUS[status as keyof typeof ASSET_STATUS];
    return statusConfig ? (
      <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
    ) : (
      <Tag>{status}</Tag>
    );
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    return users.find(u => u.id === userId)?.name || '-';
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '-';
    return departments.find(d => d.id === departmentId)?.name || '-';
  };

  const getCheckResultTag = (result: CheckResultType) => {
    const resultConfig = CHECK_RESULT[result];
    return resultConfig ? (
      <Tag color={resultConfig.color}>{resultConfig.label}</Tag>
    ) : (
      <Tag>{result}</Tag>
    );
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (assetFilterCategory && asset.categoryId !== assetFilterCategory) return false;
      if (assetFilterStatus && asset.status !== assetFilterStatus) return false;
      if (assetFilterPeriod) {
        const purchaseDate = dayjs(asset.purchaseDate);
        if (purchaseDate.isBefore(assetFilterPeriod[0]) || purchaseDate.isAfter(assetFilterPeriod[1])) {
          return false;
        }
      }
      return true;
    });
  }, [assets, assetFilterCategory, assetFilterStatus, assetFilterPeriod]);

  const assetLedgerData = useMemo((): AssetLedger[] => {
    return filteredAssets.map((asset) => ({
      ...asset,
      categoryName: getCategoryName(asset.categoryId),
    }));
  }, [filteredAssets]);

  const assetStats = useMemo(() => {
    const totalCount = filteredAssets.length;
    const originalValueTotal = filteredAssets.reduce((sum, a) => sum + a.originalValue, 0);
    const accumulatedDepreciationTotal = filteredAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
    const netValueTotal = filteredAssets.reduce((sum, a) => sum + a.currentValue, 0);

    return {
      totalCount,
      originalValueTotal: Math.round(originalValueTotal * 100) / 100,
      accumulatedDepreciationTotal: Math.round(accumulatedDepreciationTotal * 100) / 100,
      netValueTotal: Math.round(netValueTotal * 100) / 100,
    };
  }, [filteredAssets]);

  const filteredDepreciationRecords = useMemo(() => {
    return depreciationRecords.filter((record) => {
      if (depreciationFilterPeriod && record.period !== depreciationFilterPeriod) return false;
      const asset = assets.find((a) => a.id === record.assetId);
      if (depreciationFilterCategory && asset?.categoryId !== depreciationFilterCategory) return false;
      return true;
    });
  }, [depreciationRecords, depreciationFilterPeriod, depreciationFilterCategory, assets]);

  const depreciationDetailData = useMemo((): DepreciationDetail[] => {
    return filteredDepreciationRecords.map((record) => {
      const asset = assets.find((a) => a.id === record.assetId);
      return {
        ...record,
        assetNo: asset?.assetNo || '-',
        assetName: asset?.name || '-',
        categoryName: asset ? getCategoryName(asset.categoryId) : '-',
      } as DepreciationDetail;
    }).sort((a, b) => b.period.localeCompare(a.period));
  }, [filteredDepreciationRecords, assets]);

  const monthlyDepreciationTrendOption = useMemo((): EChartsOption => {
    const months = getMonthList(dayjs().subtract(11, 'month').format('YYYY-MM'), 12);
    const monthlyData = months.map((month) => {
      const total = depreciationRecords
        .filter((r) => r.period === month)
        .reduce((sum, r) => sum + r.monthlyDepreciation, 0);
      return Math.round(total * 100) / 100;
    });

    return {
      title: {
        text: '月度折旧趋势',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'normal' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string; value: number }>;
          return `${p[0].axisValue}<br/>月折旧额: ${formatCurrency(p[0].value)}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `¥${(value / 1000).toFixed(0)}k`,
        },
      },
      series: [
        {
          name: '月折旧额',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#096dd9' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          data: monthlyData,
        },
      ],
    };
  }, [depreciationRecords]);

  const inventoryDiffData = useMemo((): InventoryDiff[] => {
    return inventoryDetails
      .filter((d) => d.checkResult === 'mismatched' || d.checkResult === 'lost')
      .map((detail) => {
        const plan = inventoryPlans.find((p) => p.id === detail.planId);
        const asset = assets.find((a) => a.id === detail.assetId);
        return {
          ...detail,
          planName: plan?.name || '-',
          assetNo: asset?.assetNo || '-',
          assetName: asset?.name || '-',
          systemUser: getUserName(asset?.currentUserId),
          systemLocation: asset?.location || '-',
          actualUser: detail.actualUserId ? getUserName(detail.actualUserId) : '-',
        } as InventoryDiff;
      });
  }, [inventoryDetails, inventoryPlans, assets, users, departments]);

  const checkResultPieOption = useMemo((): EChartsOption => {
    const resultCounts = {
      matched: inventoryDetails.filter((d) => d.checkResult === 'matched').length,
      mismatched: inventoryDetails.filter((d) => d.checkResult === 'mismatched').length,
      lost: inventoryDetails.filter((d) => d.checkResult === 'lost').length,
      pending: inventoryDetails.filter((d) => d.checkResult === 'pending').length,
    };

    return {
      title: {
        text: '盘点结果分布',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'normal' },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        data: Object.keys(resultCounts)
          .filter((key) => resultCounts[key as keyof typeof resultCounts] > 0)
          .map((key) => CHECK_RESULT[key as keyof typeof CHECK_RESULT].label),
      },
      color: ['#52c41a', '#faad14', '#f5222d', '#d9d9d9'],
      series: [
        {
          name: '盘点结果',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: Object.entries(resultCounts)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({
              value,
              name: CHECK_RESULT[key as keyof typeof CHECK_RESULT].label,
            })),
        },
      ],
    };
  }, [inventoryDetails]);

  const categorySummaryData = useMemo((): CategorySummary[] => {
    const summaryMap = new Map<string, CategorySummary>();
    const totalNetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

    assets.forEach((asset) => {
      const existing = summaryMap.get(asset.categoryId);
      if (existing) {
        existing.assetCount += 1;
        existing.originalValueTotal += asset.originalValue;
        existing.accumulatedDepreciationTotal += asset.accumulatedDepreciation;
        existing.netValueTotal += asset.currentValue;
      } else {
        summaryMap.set(asset.categoryId, {
          categoryId: asset.categoryId,
          categoryName: getCategoryName(asset.categoryId),
          assetCount: 1,
          originalValueTotal: asset.originalValue,
          accumulatedDepreciationTotal: asset.accumulatedDepreciation,
          netValueTotal: asset.currentValue,
          percentage: 0,
        });
      }
    });

    return Array.from(summaryMap.values()).map((item) => ({
      ...item,
      originalValueTotal: Math.round(item.originalValueTotal * 100) / 100,
      accumulatedDepreciationTotal: Math.round(item.accumulatedDepreciationTotal * 100) / 100,
      netValueTotal: Math.round(item.netValueTotal * 100) / 100,
      percentage: totalNetValue > 0 ? Math.round((item.netValueTotal / totalNetValue) * 10000) / 100 : 0,
    })).sort((a, b) => b.netValueTotal - a.netValueTotal);
  }, [assets]);

  const categoryValuePieOption = useMemo((): EChartsOption => {
    const totalValue = categorySummaryData.reduce((sum, c) => sum + c.netValueTotal, 0);

    return {
      title: {
        text: '各类别价值占比',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'normal' },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>净值: ${formatCurrency(p.value)}<br/>占比: ${p.percent}%`;
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        data: categorySummaryData.map((c) => c.categoryName),
      },
      color: ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16', '#a0d911'],
      series: [
        {
          name: '类别价值',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: categorySummaryData.map((c) => ({
            value: c.netValueTotal,
            name: c.categoryName,
          })),
        },
      ],
    };
  }, [categorySummaryData]);

  const handleExportAssetLedger = () => {
    const exportData = assetLedgerData.map((item) => ({
      资产编号: item.assetNo,
      名称: item.name,
      类别: item.categoryName,
      购置日期: formatDate(item.purchaseDate),
      原值: item.originalValue,
      使用年限: `${item.usefulLife} 个月`,
      折旧方法: DEPRECIATION_METHODS[item.depreciationMethod].label,
      累计折旧: item.accumulatedDepreciation,
      净值: item.currentValue,
      状态: ASSET_STATUS[item.status].label,
    }));
    downloadJson(exportData, `资产台账_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('导出成功');
  };

  const handleExportDepreciation = () => {
    const exportData = depreciationDetailData.map((item) => ({
      期间: item.period,
      资产编号: item.assetNo,
      名称: item.assetName,
      类别: item.categoryName,
      本月折旧: item.monthlyDepreciation,
      累计折旧: item.accumulatedDepreciation,
      账面净值: item.bookValue,
    }));
    downloadJson(exportData, `折旧明细表_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('导出成功');
  };

  const handleExportInventoryDiff = () => {
    const exportData = inventoryDiffData.map((item) => ({
      盘点计划: item.planName,
      资产编号: item.assetNo,
      名称: item.assetName,
      系统状态: ASSET_STATUS[item.systemStatus as keyof typeof ASSET_STATUS]?.label || item.systemStatus,
      系统使用人: item.systemUser,
      实际使用人: item.actualUser,
      系统位置: item.systemLocation,
      实际位置: item.actualLocation || '-',
      盘点结果: CHECK_RESULT[item.checkResult].label,
      差异说明: item.remark || '-',
    }));
    downloadJson(exportData, `盘点差异表_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('导出成功');
  };

  const handleExportCategorySummary = () => {
    const exportData = categorySummaryData.map((item) => ({
      类别: item.categoryName,
      资产数量: `${item.assetCount} 件`,
      原值总额: item.originalValueTotal,
      累计折旧: item.accumulatedDepreciationTotal,
      净值总额: item.netValueTotal,
      占比: `${item.percentage}%`,
    }));
    downloadJson(exportData, `分类汇总表_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('导出成功');
  };

  const handleResetAssetFilters = () => {
    setAssetFilterCategory(undefined);
    setAssetFilterStatus(undefined);
    setAssetFilterPeriod(undefined);
  };

  const handleResetDepreciationFilters = () => {
    setDepreciationFilterPeriod(undefined);
    setDepreciationFilterCategory(undefined);
  };

  const assetLedgerColumns: ColumnsType<AssetLedger> = [
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      key: 'assetNo',
      width: 140,
      fixed: 'left',
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
    },
    {
      title: '购置日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      key: 'originalValue',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '使用年限',
      dataIndex: 'usefulLife',
      key: 'usefulLife',
      width: 100,
      align: 'center',
      render: (value) => `${value} 个月`,
    },
    {
      title: '折旧方法',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      width: 120,
      render: (method) => DEPRECIATION_METHODS[method].label,
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '净值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 120,
      align: 'right',
      render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'right',
      render: (status) => getStatusTag(status),
    },
  ];

  const depreciationDetailColumns: ColumnsType<DepreciationDetail> = [
    {
      title: '期间',
      dataIndex: 'period',
      key: 'period',
      width: 100,
      fixed: 'left',
    },
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      key: 'assetNo',
      width: 140,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: 'assetName',
      key: 'assetName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
    },
    {
      title: '本月折旧',
      dataIndex: 'monthlyDepreciation',
      key: 'monthlyDepreciation',
      width: 120,
      align: 'right',
      render: (value) => <span className="text-orange-600">{formatCurrency(value)}</span>,
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '账面净值',
      dataIndex: 'bookValue',
      key: 'bookValue',
      width: 120,
      align: 'right',
      fixed: 'right',
      render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span>,
    },
  ];

  const inventoryDiffColumns: ColumnsType<InventoryDiff> = [
    {
      title: '盘点计划',
      dataIndex: 'planName',
      key: 'planName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '资产编号',
      dataIndex: 'assetNo',
      key: 'assetNo',
      width: 140,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: 'assetName',
      key: 'assetName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '系统状态',
      dataIndex: 'systemStatus',
      key: 'systemStatus',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '系统使用人',
      dataIndex: 'systemUser',
      key: 'systemUser',
      width: 120,
    },
    {
      title: '实际使用人',
      dataIndex: 'actualUser',
      key: 'actualUser',
      width: 120,
      render: (text, record) => {
        const diff = record.systemUser !== text;
        return <span className={diff ? 'text-red-600 font-medium' : ''}>{text}</span>;
      },
    },
    {
      title: '系统位置',
      dataIndex: 'systemLocation',
      key: 'systemLocation',
      width: 140,
      ellipsis: true,
    },
    {
      title: '实际位置',
      dataIndex: 'actualLocation',
      key: 'actualLocation',
      width: 140,
      ellipsis: true,
      render: (text, record) => {
        const diff = record.systemLocation !== (text || '-');
        return <span className={diff ? 'text-red-600 font-medium' : ''}>{text || '-'}</span>;
      },
    },
    {
      title: '盘点结果',
      dataIndex: 'checkResult',
      key: 'checkResult',
      width: 100,
      render: (result) => getCheckResultTag(result),
    },
    {
      title: '差异说明',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (text) => text || '-',
    },
  ];

  const categorySummaryColumns: ColumnsType<CategorySummary> = [
    {
      title: '类别',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 160,
    },
    {
      title: '资产数量',
      dataIndex: 'assetCount',
      key: 'assetCount',
      width: 100,
      align: 'center',
      render: (value) => `${value} 件`,
    },
    {
      title: '原值总额',
      dataIndex: 'originalValueTotal',
      key: 'originalValueTotal',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciationTotal',
      key: 'accumulatedDepreciationTotal',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '净值总额',
      dataIndex: 'netValueTotal',
      key: 'netValueTotal',
      width: 140,
      align: 'right',
      render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span>,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
      align: 'center',
      render: (value) => `${value}%`,
    },
  ];

  const tabItems = [
    {
      key: 'asset-ledger',
      label: (
        <span>
          <TableOutlined />
          资产台账
        </span>
      ),
      children: (
        <>
          <Card className="mb-4">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6} lg={5}>
                <div className="text-gray-500 text-sm mb-1">资产类别</div>
                <Select
                  placeholder="选择类别"
                  allowClear
                  style={{ width: '100%' }}
                  value={assetFilterCategory}
                  onChange={(value) => setAssetFilterCategory(value)}
                >
                  {categories.map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6} lg={5}>
                <div className="text-gray-500 text-sm mb-1">资产状态</div>
                <Select
                  placeholder="选择状态"
                  allowClear
                  style={{ width: '100%' }}
                  value={assetFilterStatus}
                  onChange={(value) => setAssetFilterStatus(value)}
                >
                  {Object.entries(ASSET_STATUS).map(([key, value]) => (
                    <Option key={key} value={key}>
                      {value.label}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8} lg={7}>
                <div className="text-gray-500 text-sm mb-1">购置期间</div>
                <RangePicker
                  style={{ width: '100%' }}
                  value={assetFilterPeriod}
                  onChange={(dates) => setAssetFilterPeriod(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                  placeholder={['开始日期', '结束日期']}
                />
              </Col>
              <Col xs={24} sm={12} md={4} lg={3}>
                <div className="text-gray-500 text-sm mb-1">&nbsp;</div>
                <Button icon={<ReloadOutlined />} onClick={handleResetAssetFilters}>
                  重置
                </Button>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="资产总数"
                  value={assetStats.totalCount}
                  suffix="件"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="原值总额"
                  value={assetStats.originalValueTotal}
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
                  title="累计折旧总额"
                  value={assetStats.accumulatedDepreciationTotal}
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
                  title="净值总额"
                  value={assetStats.netValueTotal}
                  precision={2}
                  prefix="¥"
                  formatter={(value) => formatCurrency(value as number).replace('¥', '')}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="资产台账"
            extra={
              <Button icon={<DownloadOutlined />} onClick={handleExportAssetLedger}>
                导出
              </Button>
            }
          >
            <Table
              columns={assetLedgerColumns}
              dataSource={assetLedgerData}
              rowKey="id"
              pagination={{
                current: 1,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1200 }}
              size="middle"
            />
          </Card>
        </>
      ),
    },
    {
      key: 'depreciation-detail',
      label: (
        <span>
          <BarChartOutlined />
          折旧明细表
        </span>
      ),
      children: (
        <>
          <Card className="mb-4">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={6} lg={5}>
                <div className="text-gray-500 text-sm mb-1">期间选择</div>
                <DatePicker.MonthPicker
                  style={{ width: '100%' }}
                  value={depreciationFilterPeriod ? dayjs(depreciationFilterPeriod) : undefined}
                  onChange={(date) => setDepreciationFilterPeriod(date ? date.format('YYYY-MM') : undefined)}
                  placeholder="选择期间"
                />
              </Col>
              <Col xs={24} sm={12} md={6} lg={5}>
                <div className="text-gray-500 text-sm mb-1">资产类别</div>
                <Select
                  placeholder="选择类别"
                  allowClear
                  style={{ width: '100%' }}
                  value={depreciationFilterCategory}
                  onChange={(value) => setDepreciationFilterCategory(value)}
                >
                  {categories.map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6} lg={5}>
                <div className="text-gray-500 text-sm mb-1">&nbsp;</div>
                <Button icon={<ReloadOutlined />} onClick={handleResetDepreciationFilters}>
                  重置
                </Button>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} lg={16}>
              <Card>
                <ReactECharts option={monthlyDepreciationTrendOption} style={{ height: '350px' }} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="折旧记录总数"
                  value={depreciationDetailData.length}
                  suffix="条"
                  valueStyle={{ color: '#1890ff' }}
                  className="mb-4"
                />
                <Statistic
                  title="本月折旧总额"
                  value={depreciationDetailData
                    .filter((d) => d.period === dayjs().format('YYYY-MM'))
                    .reduce((sum, d) => sum + d.monthlyDepreciation, 0)}
                  precision={2}
                  prefix="¥"
                  formatter={(value) => formatCurrency(value as number).replace('¥', '')}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="折旧明细表"
            extra={
              <Button icon={<DownloadOutlined />} onClick={handleExportDepreciation}>
                导出
              </Button>
            }
          >
            <Table
              columns={depreciationDetailColumns}
              dataSource={depreciationDetailData}
              rowKey="id"
              pagination={{
                current: 1,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 900 }}
              size="middle"
            />
          </Card>
        </>
      ),
    },
    {
      key: 'inventory-diff',
      label: (
        <span>
          <PieChartOutlined />
          盘点差异表
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} lg={16}>
              <Card>
                <ReactECharts option={checkResultPieOption} style={{ height: '350px' }} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="差异记录总数"
                  value={inventoryDiffData.length}
                  suffix="条"
                  valueStyle={{ color: '#f5222d' }}
                  className="mb-4"
                />
                <Statistic
                  title="账实不符"
                  value={inventoryDiffData.filter((d) => d.checkResult === 'mismatched').length}
                  suffix="条"
                  valueStyle={{ color: '#faad14' }}
                  className="mb-4"
                />
                <Statistic
                  title="盘亏"
                  value={inventoryDiffData.filter((d) => d.checkResult === 'lost').length}
                  suffix="条"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="盘点差异表"
            extra={
              <Button icon={<DownloadOutlined />} onClick={handleExportInventoryDiff}>
                导出
              </Button>
            }
          >
            <Table
              columns={inventoryDiffColumns}
              dataSource={inventoryDiffData}
              rowKey="id"
              pagination={{
                current: 1,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1000 }}
              size="middle"
              locale={{ emptyText: '暂无差异记录' }}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'category-summary',
      label: (
        <span>
          <FundOutlined />
          分类汇总表
        </span>
      ),
      children: (
        <>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} lg={16}>
              <Card>
                <ReactECharts option={categoryValuePieOption} style={{ height: '350px' }} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="资产类别数"
                  value={categorySummaryData.length}
                  suffix="类"
                  valueStyle={{ color: '#722ed1' }}
                  className="mb-4"
                />
                <Statistic
                  title="资产总数"
                  value={categorySummaryData.reduce((sum, c) => sum + c.assetCount, 0)}
                  suffix="件"
                  valueStyle={{ color: '#1890ff' }}
                  className="mb-4"
                />
                <Statistic
                  title="净值总额"
                  value={categorySummaryData.reduce((sum, c) => sum + c.netValueTotal, 0)}
                  precision={2}
                  prefix="¥"
                  formatter={(value) => formatCurrency(value as number).replace('¥', '')}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="分类汇总表"
            extra={
              <Button icon={<DownloadOutlined />} onClick={handleExportCategorySummary}>
                导出
              </Button>
            }
          >
            <Table
              columns={categorySummaryColumns}
              dataSource={categorySummaryData}
              rowKey="categoryId"
              pagination={{
                current: 1,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 800 }}
              size="middle"
            />
          </Card>
        </>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>财务报表</span>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default Reports;
