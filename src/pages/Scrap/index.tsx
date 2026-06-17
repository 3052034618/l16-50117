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
  InputNumber,
  Tag,
  Popconfirm,
  message,
  Tabs,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAppStore from '@/store';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { SCRAP_STATUS, ASSET_STATUS } from '@/utils/constants';
import type { ScrapRecord, ScrapStatus, Asset } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface TabItem {
  key: ScrapStatus;
  label: string;
}

const ScrapPage = () => {
  const {
    scraps,
    assets,
    users,
    currentUser,
    createScrap,
    approveScrap,
    rejectScrap,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ScrapStatus>('pending');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<ScrapStatus>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [currentScrap, setCurrentScrap] = useState<ScrapRecord | null>(null);
  const [createForm] = Form.useForm();
  const [approveForm] = Form.useForm();

  const tabItems: TabItem[] = [
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已批准' },
    { key: 'rejected', label: '已拒绝' },
  ];

  const filteredScraps = useMemo(() => {
    return scraps.filter((scrap) => {
      if (searchText) {
        const asset = assets.find((a) => a.id === scrap.assetId);
        if (!asset) return false;
        const search = searchText.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(search);
        const matchNo = asset.assetNo.toLowerCase().includes(search);
        if (!matchName && !matchNo) return false;
      }
      if (filterStatus && scrap.status !== filterStatus) return false;
      return true;
    });
  }, [scraps, assets, searchText, filterStatus]);

  const tabData = useMemo(() => {
    return filteredScraps.filter((s) => s.status === activeTab);
  }, [filteredScraps, activeTab]);

  const availableAssets = useMemo(() => {
    return assets.filter((a) => a.status === 'in-use' || a.status === 'in-stock');
  }, [assets]);

  const getAssetInfo = (assetId: string): Asset | undefined => {
    return assets.find((a) => a.id === assetId);
  };

  const getUserName = (userId: string): string => {
    return users.find((u) => u.id === userId)?.name || '-';
  };

  const handleCreate = () => {
    createForm.validateFields().then((values) => {
      const { assetId, reason } = values;
      if (!currentUser) {
        message.error('请先登录');
        return;
      }
      try {
        createScrap(assetId, currentUser.id, reason);
        message.success('报废申请已提交');
        setCreateModalVisible(false);
        createForm.resetFields();
      } catch (error) {
        message.error('提交失败，请重试');
      }
    });
  };

  const handleApprove = () => {
    approveForm.validateFields().then((values) => {
      if (!currentScrap) return;
      try {
        approveScrap(currentScrap.id, values.residualIncome);
        message.success('审核通过');
        setApproveModalVisible(false);
        approveForm.resetFields();
        setCurrentScrap(null);
      } catch (error) {
        message.error('操作失败，请重试');
      }
    });
  };

  const handleReject = (scrapId: string) => {
    try {
      rejectScrap(scrapId);
      message.success('已拒绝');
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleView = (scrap: ScrapRecord) => {
    setCurrentScrap(scrap);
    setViewModalVisible(true);
  };

  const handleOpenApproveModal = (scrap: ScrapRecord) => {
    setCurrentScrap(scrap);
    approveForm.setFieldsValue({ residualIncome: 0 });
    setApproveModalVisible(true);
  };

  const handleReset = () => {
    setSearchText('');
    setFilterStatus(undefined);
  };

  const getActionButtons = (record: ScrapRecord) => {
    const buttons = [];

    if (record.status === 'pending') {
      buttons.push(
        <Button
          key="approve"
          type="link"
          size="small"
          icon={<CheckOutlined />}
          className="text-green-600"
          onClick={() => handleOpenApproveModal(record)}
        >
          审核批准
        </Button>
      );
      buttons.push(
        <Popconfirm
          key="reject"
          title="确定要拒绝该报废申请吗？"
          onConfirm={() => handleReject(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<CloseOutlined />}>
            审核拒绝
          </Button>
        </Popconfirm>
      );
    }

    buttons.push(
      <Button key="view" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
        详情
      </Button>
    );

    return buttons;
  };

  const columns: ColumnsType<ScrapRecord> = [
    {
      title: '资产编号',
      dataIndex: 'assetId',
      key: 'assetNo',
      width: 140,
      render: (assetId) => {
        const asset = getAssetInfo(assetId);
        return <span className="font-mono">{asset?.assetNo || '-'}</span>;
      },
    },
    {
      title: '名称',
      dataIndex: 'assetId',
      key: 'assetName',
      width: 160,
      ellipsis: true,
      render: (assetId) => {
        const asset = getAssetInfo(assetId);
        return asset?.name || '-';
      },
    },
    {
      title: '原值',
      dataIndex: 'assetId',
      key: 'originalValue',
      width: 120,
      render: (assetId) => {
        const asset = getAssetInfo(assetId);
        return asset ? formatCurrency(asset.originalValue) : '-';
      },
    },
    {
      title: '净值',
      dataIndex: 'assetId',
      key: 'currentValue',
      width: 120,
      render: (assetId) => {
        const asset = getAssetInfo(assetId);
        return asset ? formatCurrency(asset.currentValue) : '-';
      },
    },
    {
      title: '申请人',
      dataIndex: 'applyUserId',
      key: 'applyUser',
      width: 100,
      render: (userId) => getUserName(userId),
    },
    {
      title: '申请日期',
      dataIndex: 'applyDate',
      key: 'applyDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ScrapStatus) => {
        const statusInfo = SCRAP_STATUS[status];
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: '残值收入',
      dataIndex: 'residualIncome',
      key: 'residualIncome',
      width: 120,
      render: (value, record) => {
        if (record.status !== 'approved') return '-';
        return value !== undefined ? formatCurrency(value) : '-';
      },
    },
    {
      title: '批准人',
      dataIndex: 'approvedBy',
      key: 'approvedBy',
      width: 100,
      render: (userId, record) => {
        if (record.status !== 'approved') return '-';
        return userId ? getUserName(userId) : '-';
      },
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 180,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => <Space wrap size={0}>{getActionButtons(record)}</Space>,
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="搜索资产名称/编号"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
            >
              {Object.entries(SCRAP_STATUS).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10} lg={13}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title="报废管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            disabled={availableAssets.length === 0}
          >
            申请报废
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ScrapStatus)}
          items={tabItems.map((item) => ({
            key: item.key,
            label: `${item.label} (${filteredScraps.filter((t) => t.status === item.key).length})`,
          }))}
        />
        <Table
          columns={columns}
          dataSource={tabData}
          rowKey="id"
          pagination={{
            current: 1,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>

      <Modal
        title="申请报废"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleCreate}>
            提交
          </Button>,
        ]}
        width={500}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="assetId"
            label="选择资产"
            rules={[{ required: true, message: '请选择要报废的资产' }]}
          >
            <Select placeholder="请选择使用中或在库的资产" showSearch optionFilterProp="children">
              {availableAssets.map((asset) => (
                <Option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.assetNo}) - {ASSET_STATUS[asset.status].label} - 净值：{formatCurrency(asset.currentValue)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="报废原因"
            rules={[{ required: true, message: '请填写报废原因' }]}
          >
            <TextArea rows={3} placeholder="请填写报废原因" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="报废详情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setCurrentScrap(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {currentScrap && (
          <>
            <Descriptions title="报废信息" column={1} bordered size="small" className="mb-4">
              <Descriptions.Item label="申请人">
                {getUserName(currentScrap.applyUserId)}
              </Descriptions.Item>
              <Descriptions.Item label="申请日期">
                {formatDate(currentScrap.applyDate)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SCRAP_STATUS[currentScrap.status].color}>
                  {SCRAP_STATUS[currentScrap.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报废原因">{currentScrap.reason}</Descriptions.Item>
              {currentScrap.status === 'approved' && (
                <>
                  <Descriptions.Item label="批准日期">
                    {currentScrap.approvedAt ? formatDate(currentScrap.approvedAt) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="批准人">
                    {currentScrap.approvedBy ? getUserName(currentScrap.approvedBy) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="残值收入">
                    {currentScrap.residualIncome !== undefined ? formatCurrency(currentScrap.residualIncome) : '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            <Descriptions title="资产信息" column={1} bordered size="small">
              <Descriptions.Item label="资产编号">
                {getAssetInfo(currentScrap.assetId)?.assetNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="资产名称">
                {getAssetInfo(currentScrap.assetId)?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="资产状态">
                {getAssetInfo(currentScrap.assetId) ? (
                  <Tag color={ASSET_STATUS[getAssetInfo(currentScrap.assetId)!.status].color}>
                    {ASSET_STATUS[getAssetInfo(currentScrap.assetId)!.status].label}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="原值">
                {getAssetInfo(currentScrap.assetId) ? formatCurrency(getAssetInfo(currentScrap.assetId)!.originalValue) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="净值">
                {getAssetInfo(currentScrap.assetId) ? formatCurrency(getAssetInfo(currentScrap.assetId)!.currentValue) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="累计折旧">
                {getAssetInfo(currentScrap.assetId) ? formatCurrency(getAssetInfo(currentScrap.assetId)!.accumulatedDepreciation) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="规格型号">
                {getAssetInfo(currentScrap.assetId)?.specification || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="制造厂家">
                {getAssetInfo(currentScrap.assetId)?.manufacturer || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="购置日期">
                {getAssetInfo(currentScrap.assetId)?.purchaseDate ? formatDate(getAssetInfo(currentScrap.assetId)!.purchaseDate) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      <Modal
        title="审核批准"
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
          setCurrentScrap(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setApproveModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleApprove}>
            确认批准
          </Button>,
        ]}
        width={400}
      >
        {currentScrap && (
          <Form form={approveForm} layout="vertical">
            <Descriptions column={1} bordered size="small" className="mb-4">
              <Descriptions.Item label="资产名称">
                {getAssetInfo(currentScrap.assetId)?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="资产编号">
                {getAssetInfo(currentScrap.assetId)?.assetNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="净值">
                {getAssetInfo(currentScrap.assetId) ? formatCurrency(getAssetInfo(currentScrap.assetId)!.currentValue) : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Form.Item
              name="residualIncome"
              label="残值收入金额"
              rules={[{ required: true, message: '请填写残值收入金额' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入残值收入金额"
                min={0}
                precision={2}
                prefix="¥"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ScrapPage;
