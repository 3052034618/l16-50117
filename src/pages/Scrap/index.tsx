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
  FileTextOutlined,
  CheckCircleOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAppStore from '@/store';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { SCRAP_STATUS, ASSET_STATUS } from '@/utils/constants';
import type { ScrapRecord, ScrapStatus, Asset, ScrapVoucher, VoucherStatus } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface TabItem {
  key: ScrapStatus;
  label: string;
}

const VOUCHER_STATUS_COLORS: Record<VoucherStatus, string> = {
  draft: 'blue',
  posted: 'green',
  revoked: 'default',
};

const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  draft: '草稿',
  posted: '已入账',
  revoked: '已撤回',
};

const ScrapPage = () => {
  const {
    scraps,
    assets,
    users,
    currentUser,
    createScrap,
    approveScrap,
    rejectScrap,
    scrapVouchers,
    confirmVoucher,
    revokeVoucher,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<ScrapStatus>('pending');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<ScrapStatus>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [currentScrap, setCurrentScrap] = useState<ScrapRecord | null>(null);
  const [currentVoucher, setCurrentVoucher] = useState<ScrapVoucher | null>(null);
  const [, setRefreshKey] = useState(0);
  const [createForm] = Form.useForm();
  const [approveForm] = Form.useForm();

  const tabItems: TabItem[] = [
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '已批准' },
    { key: 'rejected', label: '已拒绝' },
  ];

  const getScrapVoucher = (scrapRecordId: string): ScrapVoucher | undefined => {
    return scrapVouchers.find((v) => v.scrapRecordId === scrapRecordId);
  };

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
        const voucher = approveScrap(currentScrap.id, values.residualIncome);
        message.success('审核通过');
        setApproveModalVisible(false);
        approveForm.resetFields();
        setCurrentScrap(null);
        setRefreshKey((k) => k + 1);
        if (voucher) {
          setCurrentVoucher(voucher);
          setVoucherModalVisible(true);
        }
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

  const handleViewVoucher = (voucher: ScrapVoucher) => {
    setCurrentVoucher(voucher);
    setVoucherModalVisible(true);
  };

  const handleConfirmVoucher = () => {
    if (!currentVoucher) return;
    Modal.confirm({
      title: '确认入账',
      content: `确定要将凭证 ${currentVoucher.voucherNo} 确认入账吗？入账后可撤回。`,
      onOk: () => {
        confirmVoucher(currentVoucher.id, 'scrap');
        setRefreshKey((k) => k + 1);
        const store = useAppStore.getState();
        const updated = store.scrapVouchers.find((v: ScrapVoucher) => v.id === currentVoucher.id);
        setCurrentVoucher(updated || null);
        message.success('凭证已确认入账');
      },
    });
  };

  const handleRevokeVoucher = () => {
    if (!currentVoucher) return;
    Modal.confirm({
      title: '撤回凭证',
      content: `确定要撤回凭证 ${currentVoucher.voucherNo} 吗？撤回后可重新确认入账。`,
      onOk: () => {
        revokeVoucher(currentVoucher.id, 'scrap');
        setRefreshKey((k) => k + 1);
        const store = useAppStore.getState();
        const updated = store.scrapVouchers.find((v: ScrapVoucher) => v.id === currentVoucher.id);
        setCurrentVoucher(updated || null);
        message.success('凭证已撤回');
      },
    });
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

    if (record.status === 'approved') {
      const voucher = getScrapVoucher(record.id);
      if (voucher) {
        buttons.push(
          <Button
            key="voucher"
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewVoucher(voucher)}
          >
            查看凭证
          </Button>
        );
      }
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
      title: '凭证状态',
      key: 'voucherStatus',
      width: 100,
      render: (_, record) => {
        if (record.status !== 'approved') return '-';
        const voucher = getScrapVoucher(record.id);
        if (!voucher) return <Tag color="orange">未生成</Tag>;
        return (
          <Tag color={VOUCHER_STATUS_COLORS[voucher.status]}>
            {VOUCHER_STATUS_LABELS[voucher.status]}
          </Tag>
        );
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
      width: 240,
      fixed: 'right',
      render: (_, record) => <Space wrap size={0}>{getActionButtons(record)}</Space>,
    },
  ];

  const getVoucherFooter = () => {
    if (!currentVoucher) return null;
    const buttons = [];
    buttons.push(
      <Button key="close" onClick={() => setVoucherModalVisible(false)}>
        关闭
      </Button>
    );
    if (currentVoucher.status === 'draft') {
      buttons.push(
        <Button key="confirm" type="primary" icon={<CheckCircleOutlined />} onClick={handleConfirmVoucher}>
          确认入账
        </Button>
      );
    }
    if (currentVoucher.status === 'posted') {
      buttons.push(
        <Popconfirm
          key="revoke"
          title="确定要撤回此凭证吗？"
          description="撤回后将变为草稿状态，可重新修改入账"
          onConfirm={handleRevokeVoucher}
        >
          <Button icon={<UnlockOutlined />}>撤回凭证</Button>
        </Popconfirm>
      );
    }
    return buttons;
  };

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
          scroll={{ x: 1500 }}
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
                  <Descriptions.Item label="凭证">
                    {(() => {
                      const voucher = getScrapVoucher(currentScrap.id);
                      if (!voucher) return <Tag color="orange">未生成</Tag>;
                      return (
                        <Space>
                          <span className="font-mono">{voucher.voucherNo}</span>
                          <Tag color={VOUCHER_STATUS_COLORS[voucher.status]}>
                            {VOUCHER_STATUS_LABELS[voucher.status]}
                          </Tag>
                          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewVoucher(voucher)}>
                            查看
                          </Button>
                        </Space>
                      );
                    })()}
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

      <Modal
        title="报废凭证详情"
        open={voucherModalVisible}
        onCancel={() => {
          setVoucherModalVisible(false);
          setCurrentVoucher(null);
        }}
        footer={getVoucherFooter()}
        width={850}
        destroyOnClose
      >
        {currentVoucher && (
          <>
            <Descriptions column={2} bordered size="small" className="mb-4">
              <Descriptions.Item label="凭证编号">
                <span className="font-mono">{currentVoucher.voucherNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="凭证状态">
                <Tag color={VOUCHER_STATUS_COLORS[currentVoucher.status]}>
                  {VOUCHER_STATUS_LABELS[currentVoucher.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="凭证类型">报废凭证</Descriptions.Item>
              <Descriptions.Item label="期间">{currentVoucher.period}</Descriptions.Item>
              <Descriptions.Item label="创建人">{getUserName(currentVoucher.createdBy)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentVoucher.createdAt}</Descriptions.Item>
              {currentVoucher.postedAt && (
                <>
                  <Descriptions.Item label="入账人">{getUserName(currentVoucher.postedBy)}</Descriptions.Item>
                  <Descriptions.Item label="入账时间">{currentVoucher.postedAt}</Descriptions.Item>
                </>
              )}
              {currentVoucher.revokedAt && (
                <>
                  <Descriptions.Item label="撤回人">{getUserName(currentVoucher.revokedBy)}</Descriptions.Item>
                  <Descriptions.Item label="撤回时间">{currentVoucher.revokedAt}</Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Descriptions title="报废资产信息" column={2} bordered size="small" className="mb-4">
              <Descriptions.Item label="资产编号">
                <span className="font-mono">{currentVoucher.assetNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="资产名称">{currentVoucher.assetName}</Descriptions.Item>
              <Descriptions.Item label="原值">
                <span className="text-blue-600 font-medium">{formatCurrency(currentVoucher.originalValue)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="累计折旧">
                <span className="text-purple-600 font-medium">{formatCurrency(currentVoucher.accumulatedDepreciation)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="净值">
                <span className="text-green-600 font-medium">{formatCurrency(currentVoucher.netValue)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="残值收入">
                <span className="text-orange-600 font-medium">{formatCurrency(currentVoucher.residualIncome)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="报废损益" span={2}>
                <span className={currentVoucher.gainLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {currentVoucher.gainLoss >= 0 ? '收益' : '损失'}: {formatCurrency(Math.abs(currentVoucher.gainLoss))}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <div className="mb-2 font-medium text-gray-700">借贷明细</div>
            <Table
              size="small"
              dataSource={currentVoucher.entries}
              pagination={false}
              rowKey={(r, i) => `${r.accountCode}-${r.direction}-${i}`}
              columns={[
                { title: '摘要', dataIndex: 'summary', key: 'summary', width: 280, ellipsis: true },
                {
                  title: '借方',
                  key: 'debit',
                  width: 260,
                  render: (_, record) => record.direction === 'debit' ? (
                    <div>
                      <div className="text-xs text-gray-500">{record.accountCode} {record.accountName}</div>
                      <div className="font-medium text-orange-600">{formatCurrency(record.amount)}</div>
                    </div>
                  ) : <span className="text-gray-300">-</span>,
                },
                {
                  title: '贷方',
                  key: 'credit',
                  width: 260,
                  render: (_, record) => record.direction === 'credit' ? (
                    <div>
                      <div className="text-xs text-gray-500">{record.accountCode} {record.accountName}</div>
                      <div className="font-medium text-green-600">{formatCurrency(record.amount)}</div>
                    </div>
                  ) : <span className="text-gray-300">-</span>,
                },
              ]}
              summary={() => {
                const debit = currentVoucher.entries.filter(e => e.direction === 'debit').reduce((s, e) => s + e.amount, 0);
                const credit = currentVoucher.entries.filter(e => e.direction === 'credit').reduce((s, e) => s + e.amount, 0);
                return (
                  <>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} align="right"><b>合计：</b></Table.Summary.Cell>
                      <Table.Summary.Cell index={1}><b className="text-orange-600">{formatCurrency(Math.round(debit * 100) / 100)}</b></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}><b className="text-green-600">{formatCurrency(Math.round(credit * 100) / 100)}</b></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                );
              }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default ScrapPage;
