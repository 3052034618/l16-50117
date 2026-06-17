import { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Tag,
  Popconfirm,
  message,
  Tabs,
  Progress,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
  ExportOutlined,
  ReloadOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import useAppStore from '@/store';
import { formatDate, downloadJson } from '@/utils/helpers';
import { CHECK_RESULT, INVENTORY_STATUS, ASSET_STATUS } from '@/utils/constants';
import type { InventoryPlan, InventoryDetail, InventoryStatus, CheckResult, Asset } from '@/types';

const { Option } = Select;
const { RangePicker } = DatePicker;

type TabKey = 'all' | 'pending' | 'mismatched' | 'lost';

interface InventoryDetailItem extends InventoryDetail {
  asset?: Asset;
}

const Inventory = () => {
  const {
    inventoryPlans,
    assets,
    departments,
    users,
    currentUser,
    createInventoryPlan,
    startInventory,
    completeInventory,
    checkAsset,
    getInventoryDetails,
    getInventorySummary,
  } = useAppStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InventoryStatus>();
  const [detailTab, setDetailTab] = useState<TabKey>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [checkModalVisible, setCheckModalVisible] = useState(false);
  const [checkingAsset, setCheckingAsset] = useState<{ assetId: string; assetNo: string } | null>(null);
  const [createForm] = Form.useForm();
  const [checkForm] = Form.useForm();

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    assets.forEach(a => { if (a.location) locations.add(a.location); });
    return Array.from(locations);
  }, [assets]);

  const selectedPlan = useMemo(() => {
    return inventoryPlans.find((p) => p.id === selectedPlanId) || null;
  }, [inventoryPlans, selectedPlanId]);

  const filteredPlans = useMemo(() => {
    if (!filterStatus) return inventoryPlans;
    return inventoryPlans.filter((p) => p.status === filterStatus);
  }, [inventoryPlans, filterStatus]);

  const inventoryDetails = useMemo((): InventoryDetailItem[] => {
    if (!selectedPlanId) return [];
    return getInventoryDetails(selectedPlanId);
  }, [selectedPlanId, getInventoryDetails]);

  const inventorySummary = useMemo(() => {
    if (!selectedPlanId) return { total: 0, checked: 0, matched: 0, mismatched: 0, lost: 0 };
    return getInventorySummary(selectedPlanId);
  }, [selectedPlanId, getInventorySummary]);

  const filteredDetails = useMemo(() => {
    switch (detailTab) {
      case 'pending':
        return inventoryDetails.filter((d) => d.checkResult === 'pending');
      case 'mismatched':
        return inventoryDetails.filter((d) => d.checkResult === 'mismatched');
      case 'lost':
        return inventoryDetails.filter((d) => d.checkResult === 'lost');
      default:
        return inventoryDetails;
    }
  }, [inventoryDetails, detailTab]);

  const progress = useMemo(() => {
    if (inventorySummary.total === 0) return 0;
    return Math.round((inventorySummary.checked / inventorySummary.total) * 100);
  }, [inventorySummary]);

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    return users.find(u => u.id === userId)?.name || '-';
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '-';
    return departments.find(d => d.id === departmentId)?.name || '-';
  };

  const handleCreatePlan = () => {
    createForm.validateFields().then((values) => {
      const { name, dateRange, scopeDepartmentId, scopeLocation } = values;
      const startDate = formatDate(dateRange[0].toDate());
      const endDate = formatDate(dateRange[1].toDate());
      createInventoryPlan(name, startDate, endDate, currentUser?.id || '', scopeDepartmentId, scopeLocation);
      message.success('盘点计划创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
    });
  };

  const handleStartInventory = (planId: string) => {
    startInventory(planId);
    message.success('盘点已开始');
  };

  const handleCompleteInventory = (planId: string) => {
    completeInventory(planId);
    message.success('盘点已完成');
  };

  const handleScanCheck = () => {
    checkForm.validateFields().then((values) => {
      const { assetNo } = values;
      const asset = assets.find((a) => a.assetNo === assetNo);
      if (!asset) {
        message.error('未找到该资产');
        return;
      }
      const detail = inventoryDetails.find((d) => d.assetId === asset.id);
      if (!detail) {
        message.error('该资产不在当前盘点计划中');
        return;
      }
      if (!selectedPlanId) {
        message.error('请先选择盘点计划');
        return;
      }
      setCheckingAsset({ assetId: asset.id, assetNo: asset.assetNo });
      checkForm.resetFields();
      setCheckModalVisible(true);
    });
  };

  const handleCheckConfirm = () => {
    if (!selectedPlanId || !checkingAsset) return;
    checkForm.validateFields().then((values) => {
      const { result, remark, actualLocation, actualUserId } = values;
      checkAsset(selectedPlanId, checkingAsset.assetId, result, remark, actualLocation, actualUserId);
      message.success('盘点结果已记录');
      setCheckModalVisible(false);
      setCheckingAsset(null);
      checkForm.resetFields();
    });
  };

  const handleQuickCheck = (assetId: string, result: 'matched' | 'mismatched' | 'lost') => {
    if (!selectedPlanId) return;
    checkAsset(selectedPlanId, assetId, result);
    message.success('盘点结果已记录');
  };

  const handleExportDiff = () => {
    if (!selectedPlan) return;
    const diffDetails = inventoryDetails.filter(
      (d) => d.checkResult === 'mismatched' || d.checkResult === 'lost'
    );
    const report = {
      planName: selectedPlan.name,
      exportDate: formatDate(new Date()),
      summary: inventorySummary,
      details: diffDetails.map((d) => ({
        assetNo: d.asset?.assetNo,
        assetName: d.asset?.name,
        systemStatus: ASSET_STATUS[d.systemStatus as keyof typeof ASSET_STATUS]?.label || d.systemStatus,
        systemUser: getUserName(d.asset?.currentUserId),
        systemDepartment: getDepartmentName(d.asset?.currentDepartmentId),
        systemLocation: d.asset?.location || '-',
        checkResult: CHECK_RESULT[d.checkResult].label,
        actualUser: d.actualUserId ? getUserName(d.actualUserId) : '-',
        actualLocation: d.actualLocation || '-',
        remark: d.remark,
        checkedAt: d.checkedAt,
      })),
    };
    downloadJson(report, `盘点差异报告_${selectedPlan.name}_${formatDate(new Date(), 'YYYYMMDD')}.json`);
    message.success('差异报告导出成功');
  };

  const handleResetFilter = () => {
    setFilterStatus(undefined);
  };

  const planColumns: ColumnsType<InventoryPlan> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    {
      title: '盘点范围',
      key: 'scope',
      width: 160,
      render: (_, record) => {
        const parts: string[] = [];
        if (record.scopeDepartmentId) parts.push(getDepartmentName(record.scopeDepartmentId));
        if (record.scopeLocation) parts.push(record.scopeLocation);
        return parts.length > 0 ? parts.join(' / ') : <span className="text-gray-400">全部资产</span>;
      },
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (date) => formatDate(date),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (date) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: InventoryStatus) => {
        const statusInfo = INVENTORY_STATUS[status];
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap size={0}>
          <Button
            type="link"
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => setSelectedPlanId(record.id)}
          >
            查看详情
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartInventory(record.id)}
            >
              开始盘点
            </Button>
          )}
          {record.status === 'in-progress' && (
            <Popconfirm
              title="确定要完成盘点吗？"
              description="完成后将无法继续修改盘点结果。"
              onConfirm={() => handleCompleteInventory(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                完成盘点
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const detailColumns: ColumnsType<InventoryDetailItem> = [
    {
      title: '资产编号',
      dataIndex: ['asset', 'assetNo'],
      key: 'assetNo',
      width: 130,
      render: (text) => text && <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: ['asset', 'name'],
      key: 'assetName',
      width: 150,
    },
    {
      title: '系统使用人',
      key: 'systemUser',
      width: 100,
      render: (_, record) => getUserName(record.asset?.currentUserId),
    },
    {
      title: '系统位置',
      key: 'systemLocation',
      width: 120,
      render: (_, record) => record.asset?.location || '-',
    },
    {
      title: '盘点结果',
      dataIndex: 'checkResult',
      key: 'checkResult',
      width: 90,
      render: (result: CheckResult) => {
        const resultInfo = CHECK_RESULT[result];
        return <Tag color={resultInfo.color}>{resultInfo.label}</Tag>;
      },
    },
    {
      title: '实际使用人',
      dataIndex: 'actualUserId',
      key: 'actualUserId',
      width: 100,
      render: (userId) => userId ? getUserName(userId) : '-',
    },
    {
      title: '实际位置',
      dataIndex: 'actualLocation',
      key: 'actualLocation',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 120,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap size={0}>
          {selectedPlan?.status === 'in-progress' && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => handleQuickCheck(record.assetId, 'matched')}
              >
                相符
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setCheckingAsset({ assetId: record.assetId, assetNo: record.asset?.assetNo || '' });
                  setCheckModalVisible(true);
                }}
              >
                不符
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleQuickCheck(record.assetId, 'lost')}
              >
                盘亏
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const detailTabItems = [
    {
      key: 'all',
      label: `全部 (${inventoryDetails.length})`,
    },
    {
      key: 'pending',
      label: `待盘点 (${inventoryDetails.filter((d) => d.checkResult === 'pending').length})`,
    },
    {
      key: 'mismatched',
      label: `不符 (${inventoryDetails.filter((d) => d.checkResult === 'mismatched').length})`,
    },
    {
      key: 'lost',
      label: `盘亏 (${inventoryDetails.filter((d) => d.checkResult === 'lost').length})`,
    },
  ];

  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={selectedPlanId ? 10 : 24}>
          <Card
            title="盘点计划列表"
            extra={
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                  创建计划
                </Button>
              </Space>
            }
          >
            <Card className="mb-4" size="small">
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={10}>
                  <Select
                    placeholder="选择计划状态"
                    allowClear
                    style={{ width: '100%' }}
                    value={filterStatus}
                    onChange={(value) => setFilterStatus(value)}
                  >
                    {Object.entries(INVENTORY_STATUS).map(([key, value]) => (
                      <Option key={key} value={key}>
                        {value.label}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={14}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={handleResetFilter}>
                      重置
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
            <Table
              columns={planColumns}
              dataSource={filteredPlans}
              rowKey="id"
              pagination={{
                current: 1,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 800 }}
              size="middle"
              rowClassName={(record) =>
                record.id === selectedPlanId ? 'bg-blue-50' : ''
              }
            />
          </Card>
        </Col>

        {selectedPlanId && selectedPlan && (
          <Col xs={24} lg={14}>
            <Card
              title={`盘点详情 - ${selectedPlan.name}`}
              extra={
                <Space>
                  {selectedPlan.status === 'in-progress' && (
                    <Button icon={<QrcodeOutlined />} onClick={() => {
                      setCheckingAsset(null);
                      checkForm.resetFields();
                      Modal.confirm({
                        title: '扫码盘点',
                        content: (
                          <Form form={checkForm} layout="vertical">
                            <Form.Item
                              name="assetNo"
                              label="扫描资产编号"
                              rules={[{ required: true, message: '请输入或扫描资产编号' }]}
                            >
                              <Input placeholder="请扫描二维码或手动输入资产编号" size="large" />
                            </Form.Item>
                          </Form>
                        ),
                        onOk: handleScanCheck,
                        okText: '下一步',
                        cancelText: '取消',
                        width: 400,
                      });
                    }}>
                      扫码盘点
                    </Button>
                  )}
                  {(selectedPlan.status === 'in-progress' || selectedPlan.status === 'completed') && (
                    <Button icon={<ExportOutlined />} onClick={handleExportDiff}>
                      导出差异报告
                    </Button>
                  )}
                </Space>
              }
            >
              <Row gutter={[16, 16]} className="mb-4">
                <Col xs={12} sm={8}>
                  <Card size="small">
                    <Statistic
                      title="应盘数量"
                      value={inventorySummary.total}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8}>
                  <Card size="small">
                    <Statistic
                      title="已盘数量"
                      value={inventorySummary.checked}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
                <Col xs={8} sm={8}>
                  <Card size="small">
                    <Statistic
                      title="相符数量"
                      value={inventorySummary.matched}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={8} sm={8}>
                  <Card size="small">
                    <Statistic
                      title="不符数量"
                      value={inventorySummary.mismatched}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col xs={8} sm={8}>
                  <Card size="small">
                    <Statistic
                      title="盘亏数量"
                      value={inventorySummary.lost}
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card className="mb-4" size="small">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">盘点进度</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress
                  percent={progress}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </Card>

              <Tabs
                activeKey={detailTab}
                onChange={(key) => setDetailTab(key as TabKey)}
                items={detailTabItems}
              />

              <Table
                columns={detailColumns}
                dataSource={filteredDetails}
                rowKey="id"
                pagination={{
                  current: 1,
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
                scroll={{ x: 1100 }}
                size="middle"
              />
            </Card>
          </Col>
        )}
      </Row>

      <Modal
        title="创建盘点计划"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={handleCreatePlan}
        okText="确认"
        cancelText="取消"
        width={550}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="请输入盘点计划名称" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="盘点周期"
            rules={[{ required: true, message: '请选择盘点周期' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item name="scopeDepartmentId" label="盘点范围 - 部门">
            <Select placeholder="不选则盘点全部部门" allowClear>
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scopeLocation" label="盘点范围 - 存放位置">
            <Select placeholder="不选则盘点全部位置" allowClear>
              {uniqueLocations.map((loc) => (
                <Option key={loc} value={loc}>{loc}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="登记盘点结果"
        open={checkModalVisible}
        onCancel={() => {
          setCheckModalVisible(false);
          setCheckingAsset(null);
          checkForm.resetFields();
        }}
        onOk={handleCheckConfirm}
        okText="确认"
        cancelText="取消"
        width={500}
      >
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-gray-600">
            资产编号：<span className="font-mono font-medium">{checkingAsset?.assetNo}</span>
          </div>
        </div>
        <Form form={checkForm} layout="vertical">
          <Form.Item
            name="result"
            label="盘点结果"
            rules={[{ required: true, message: '请选择盘点结果' }]}
          >
            <Select placeholder="请选择盘点结果">
              <Option value="matched">
                <Tag color="green">账实相符</Tag>
              </Option>
              <Option value="mismatched">
                <Tag color="orange">账实不符</Tag>
              </Option>
              <Option value="lost">
                <Tag color="red">盘亏</Tag>
              </Option>
            </Select>
          </Form.Item>
          <Form.Item name="actualLocation" label="实际存放位置">
            <Input placeholder="请记录资产实际存放位置" />
          </Form.Item>
          <Form.Item name="actualUserId" label="实际使用人">
            <Select placeholder="请选择资产实际使用人" allowClear showSearch optionFilterProp="children">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>{user.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注信息（选填）" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
