import { useMemo } from 'react';
import { Card, Row, Col, Statistic, List, Button, Tag, Space } from 'antd';
import {
  PlusOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  DeleteOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import useAppStore from '@/store';
import { formatCurrency, getMonthList } from '@/utils/helpers';
import { ASSET_STATUS, TRANSFER_STATUS, SCRAP_STATUS, ALLOCATION_STATUS } from '@/utils/constants';
import type { EChartsOption } from 'echarts';

const Dashboard = () => {
  const {
    getDashboardStats,
    assets,
    categories,
    depreciationRecords,
    transfers,
    scraps,
    allocations,
  } = useAppStore();

  const stats = getDashboardStats();

  const pendingAllocations = useMemo(() => {
    return allocations.filter((a) => a.status === 'pending').map((alloc) => ({
      id: alloc.id,
      type: 'allocation' as const,
      title: '待确认分配',
      assetName: assets.find((a) => a.id === alloc.assetId)?.name,
      userName: useAppStore.getState().users.find((u) => u.id === alloc.userId)?.name,
      date: alloc.allocationDate,
      status: ALLOCATION_STATUS[alloc.status],
    }));
  }, [allocations, assets]);

  const pendingTransfers = useMemo(() => {
    return transfers
      .filter((t) => t.status === 'pending' || t.status === 'approved')
      .map((transfer) => ({
        id: transfer.id,
        type: 'transfer' as const,
        title: transfer.status === 'pending' ? '待审核调拨' : '待确认接收',
        assetName: assets.find((a) => a.id === transfer.assetId)?.name,
        fromUserName: useAppStore.getState().users.find((u) => u.id === transfer.fromUserId)?.name,
        toUserName: useAppStore.getState().users.find((u) => u.id === transfer.toUserId)?.name,
        date: transfer.applyDate,
        status: TRANSFER_STATUS[transfer.status],
      }));
  }, [transfers, assets]);

  const pendingScraps = useMemo(() => {
    return scraps.filter((s) => s.status === 'pending').map((scrap) => ({
      id: scrap.id,
      type: 'scrap' as const,
      title: '待审核报废',
      assetName: assets.find((a) => a.id === scrap.assetId)?.name,
      applyUserName: useAppStore.getState().users.find((u) => u.id === scrap.applyUserId)?.name,
      date: scrap.applyDate,
      reason: scrap.reason,
      status: SCRAP_STATUS[scrap.status],
    }));
  }, [scraps, assets]);

  const todoItems = useMemo(() => {
    return [...pendingTransfers, ...pendingScraps, ...pendingAllocations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [pendingTransfers, pendingScraps, pendingAllocations]);

  const statusPieOption = useMemo((): EChartsOption => {
    const statusCounts = {
      'in-stock': assets.filter((a) => a.status === 'in-stock').length,
      'in-use': assets.filter((a) => a.status === 'in-use').length,
      transferred: assets.filter((a) => a.status === 'transferred').length,
      scrapped: assets.filter((a) => a.status === 'scrapped').length,
      lost: assets.filter((a) => a.status === 'lost').length,
    };

    return {
      title: {
        text: '资产状态分布',
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
        data: Object.keys(statusCounts)
          .filter((key) => statusCounts[key as keyof typeof statusCounts] > 0)
          .map((key) => ASSET_STATUS[key as keyof typeof ASSET_STATUS].label),
      },
      color: ['#13c2c2', '#52c41a', '#faad14', '#f5222d', '#a0a0a0'],
      series: [
        {
          name: '资产状态',
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
          data: Object.entries(statusCounts)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({
              value,
              name: ASSET_STATUS[key as keyof typeof ASSET_STATUS].label,
            })),
        },
      ],
    };
  }, [assets]);

  const depreciationTrendOption = useMemo((): EChartsOption => {
    const months = getMonthList('2025-01', 18);
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
        boundaryGap: false,
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
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: '#1890ff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
              ],
            },
          },
          data: monthlyData,
        },
      ],
    };
  }, [depreciationRecords]);

  const categoryValueOption = useMemo((): EChartsOption => {
    const categoryValues = categories.map((cat) => {
      const totalValue = assets
        .filter((a) => a.categoryId === cat.id && a.status !== 'scrapped' && a.status !== 'lost')
        .reduce((sum, a) => sum + a.currentValue, 0);
      return {
        name: cat.name,
        value: Math.round(totalValue * 100) / 100,
      };
    });

    return {
      title: {
        text: '分类价值分布',
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
          return `${p[0].axisValue}<br/>总净值: ${formatCurrency(p[0].value)}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categoryValues.map((c) => c.name),
        axisLabel: {
          interval: 0,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
        },
      },
      series: [
        {
          name: '总净值',
          type: 'bar',
          barWidth: '50%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#722ed1' },
                { offset: 1, color: '#13c2c2' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          data: categoryValues.map((c) => c.value),
        },
      ],
    };
  }, [assets, categories]);

  const quickActions = [
    { title: '新增资产', icon: <PlusOutlined />, color: '#1890ff' },
    { title: '折旧计算', icon: <CalculatorOutlined />, color: '#52c41a' },
    { title: '盘点计划', icon: <CheckCircleOutlined />, color: '#722ed1' },
  ];

  return (
    <div className="p-6">
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="资产总数"
              value={stats.totalAssets}
              prefix={<WarningOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总净值"
              value={stats.totalValue}
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
              title="本月折旧"
              value={stats.monthlyDepreciation}
              precision={2}
              prefix="¥"
              formatter={(value) => formatCurrency(value as number).replace('¥', '')}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待办事项"
              value={stats.pendingTransfers + stats.pendingScraps + pendingAllocations.length}
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="在库"
              value={stats.inStockCount}
              valueStyle={{ color: ASSET_STATUS['in-stock'].color }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="在用"
              value={stats.inUseCount}
              valueStyle={{ color: ASSET_STATUS['in-use'].color }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="已报废"
              value={stats.scrappedCount}
              valueStyle={{ color: ASSET_STATUS['scrapped'].color }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={8}>
          <Card>
            <ReactECharts option={statusPieOption} style={{ height: '320px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card>
            <ReactECharts option={depreciationTrendOption} style={{ height: '320px' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card>
            <ReactECharts option={categoryValueOption} style={{ height: '320px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="快捷操作">
            <Space direction="vertical" className="w-full" size={12}>
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  type="primary"
                  block
                  size="large"
                  icon={action.icon}
                  style={{ backgroundColor: action.color, borderColor: action.color }}
                >
                  {action.title}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="待办事项">
            <List
              dataSource={todoItems}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="primary" size="small">
                      处理
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      item.type === 'transfer' ? (
                        <SwapOutlined className="text-blue-500 text-xl" />
                      ) : item.type === 'scrap' ? (
                        <DeleteOutlined className="text-orange-500 text-xl" />
                      ) : (
                        <UserOutlined className="text-purple-500 text-xl" />
                      )
                    }
                    title={
                      <Space>
                        <span>{item.title}</span>
                        <Tag color={item.status.color}>{item.status.label}</Tag>
                      </Space>
                    }
                    description={
                      <div className="text-gray-500">
                        <div>
                          <span className="font-medium">资产：</span>
                          {item.assetName}
                        </div>
                        {'fromUserName' in item && 'toUserName' in item && (
                          <div>
                            <span className="font-medium">调拨：</span>
                            {item.fromUserName} → {item.toUserName}
                          </div>
                        )}
                        {'applyUserName' in item && (
                          <div>
                            <span className="font-medium">申请人：</span>
                            {item.applyUserName}
                          </div>
                        )}
                        {'userName' in item && (
                          <div>
                            <span className="font-medium">分配给：</span>
                            {item.userName}
                          </div>
                        )}
                        {'reason' in item && item.reason && (
                          <div>
                            <span className="font-medium">原因：</span>
                            {item.reason}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">日期：</span>
                          {item.date}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无待办事项' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
