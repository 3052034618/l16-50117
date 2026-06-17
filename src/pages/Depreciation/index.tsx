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
} from 'antd';
import {
  CalculatorOutlined,
  DownloadOutlined,
  ReloadOutlined,
  RiseOutlined,
  BarChartOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { EChartsOption } from 'echarts';
import useAppStore from '@/store';
import { formatCurrency, getCurrentPeriod, getMonthList, downloadJson, formatDate } from '@/utils/helpers';
import { DEPRECIATION_METHODS } from '@/utils/constants';
import type { Asset, DepreciationMethod, DepreciationRecord } from '@/types';

const { Option } = Select;
const { RangePicker } = DatePicker;

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

const Depreciation = () => {
  const { assets, categories, depreciationRecords, calculateMonthlyDepreciation } = useAppStore();

  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentPeriod());
  const [filterCategory, setFilterCategory] = useState<string>();
  const [filterMethod, setFilterMethod] = useState<DepreciationMethod>();
  const [activeTab, setActiveTab] = useState<string>('detail');

  const currentPeriod = getCurrentPeriod();

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

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
    };
  }, [periodDepreciationRecords, depreciationRecords, filteredAssets]);

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
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: unknown) => {
          const p = params as Array<{ axisValue: string; seriesName: string; value: number }>;
          let result = `${p[0].axisValue}<br/>`;
          p.forEach((item) => {
            result += `${item.seriesName}: ${formatCurrency(item.value)}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['资产净值', '累计折旧'],
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '资产净值',
          position: 'left',
          axisLabel: {
            formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
          },
        },
        {
          type: 'value',
          name: '累计折旧',
          position: 'right',
          axisLabel: {
            formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
          },
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
          lineStyle: {
            width: 2,
            color: '#52c41a',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
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
          lineStyle: {
            width: 2,
            color: '#fa8c16',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
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
    const newRecords = calculateMonthlyDepreciation(selectedPeriod);
    if (newRecords.length > 0) {
      message.success(`成功计算 ${newRecords.length} 条折旧记录`);
    } else {
      message.info('本期折旧已全部计算完成');
    }
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

  const detailColumns: ColumnsType<DepreciationDetail> = [
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
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 120,
      render: (categoryId) => getCategoryName(categoryId),
    },
    {
      title: '折旧方法',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      width: 120,
      render: (method: DepreciationMethod) => DEPRECIATION_METHODS[method].label,
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
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 120,
      align: 'right',
      fixed: 'right',
      render: (value) => <span className="font-semibold text-green-600">{formatCurrency(value)}</span>,
    },
  ];

  const summaryColumns: ColumnsType<CategorySummary> = [
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
      title: '本月折旧',
      dataIndex: 'monthlyDepreciationTotal',
      key: 'monthlyDepreciationTotal',
      width: 140,
      align: 'right',
      render: (value) => <span className="text-orange-600">{formatCurrency(value)}</span>,
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
  ];

  const tabItems = [
    {
      key: 'detail',
      label: (
        <span>
          <BarChartOutlined />
          折旧明细
        </span>
      ),
      children: (
        <Table
          columns={detailColumns}
          dataSource={depreciationDetailData}
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
        />
      ),
    },
    {
      key: 'summary',
      label: (
        <span>
          <AreaChartOutlined />
          折旧汇总
        </span>
      ),
      children: (
        <Table
          columns={summaryColumns}
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
      ),
    },
    {
      key: 'trend',
      label: (
        <span>
          <RiseOutlined />
          净值趋势
        </span>
      ),
      children: (
        <Card>
          <ReactECharts option={netValueTrendOption} style={{ height: '400px' }} />
        </Card>
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
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
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
                <Option key={key} value={key}>
                  {value.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <div className="text-gray-500 text-sm mb-1">&nbsp;</div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

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
              title="本月已计提资产数"
              value={stats.calculatedCount}
              suffix="件"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={`折旧台账 - ${selectedPeriod}`}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出折旧台账
            </Button>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleCalculate}
              disabled={selectedPeriod > currentPeriod}
            >
              计算本月折旧
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default Depreciation;
