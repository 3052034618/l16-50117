import { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Select,
  DatePicker,
  Button,
  Space,
  Modal,
  Row,
  Col,
  Tag,
  Popconfirm,
  message,
  Descriptions,
  Input,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import useAppStore from '@/store';
import { formatCurrency, formatDate, getCurrentPeriod } from '@/utils/helpers';
import type {
  FinanceVoucher,
  VoucherStatus,
  VoucherType,
  DepreciationVoucher,
  ScrapVoucher,
} from '@/types';

const { Search } = Input;
const { Option } = Select;

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

const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  depreciation: '折旧凭证',
  scrap: '报废凭证',
};

const VOUCHER_TYPE_COLORS: Record<VoucherType, string> = {
  depreciation: 'purple',
  scrap: 'red',
};

const FinanceVoucherPage = () => {
  const {
    users,
    depreciationVouchers,
    scrapVouchers,
    getAllVouchers,
    confirmVoucher,
    revokeVoucher,
  } = useAppStore();

  const [searchText, setSearchText] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>();
  const [filterType, setFilterType] = useState<VoucherType>();
  const [filterStatus, setFilterStatus] = useState<VoucherStatus>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinanceVoucher | null>(null);
  const [, setRefreshKey] = useState(0);

  const currentPeriod = getCurrentPeriod();

  const getUserName = (userId?: string): string => {
    if (!userId) return '-';
    return users.find((u) => u.id === userId)?.name || '-';
  };

  const filteredVouchers = useMemo(() => {
    const all = getAllVouchers();
    return all.filter((voucher) => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchNo = voucher.voucherNo.toLowerCase().includes(search);
        let matchAsset = false;
        if (voucher.type === 'scrap') {
          matchAsset =
            voucher.assetName.toLowerCase().includes(search) ||
            voucher.assetNo.toLowerCase().includes(search);
        }
        if (!matchNo && !matchAsset) return false;
      }
      if (filterPeriod && voucher.period !== filterPeriod) return false;
      if (filterType && voucher.type !== filterType) return false;
      if (filterStatus && voucher.status !== filterStatus) return false;
      return true;
    });
  }, [getAllVouchers, searchText, filterPeriod, filterType, filterStatus]);

  const periodOptions = useMemo(() => {
    const all = [...depreciationVouchers, ...scrapVouchers];
    const periods = new Set(all.map((v) => v.period));
    return Array.from(periods).sort((a, b) => b.localeCompare(a));
  }, [depreciationVouchers, scrapVouchers]);

  const handleViewDetail = (voucher: FinanceVoucher) => {
    setCurrentVoucher(voucher);
    setDetailModalVisible(true);
  };

  const handleConfirmVoucher = () => {
    if (!currentVoucher) return;
    Modal.confirm({
      title: '确认入账',
      content: `确定要将凭证 ${currentVoucher.voucherNo} 确认入账吗？入账后可撤回。`,
      onOk: () => {
        confirmVoucher(currentVoucher.id, currentVoucher.type);
        setRefreshKey((k) => k + 1);
        const store = useAppStore.getState();
        let updated: FinanceVoucher | undefined;
        if (currentVoucher.type === 'depreciation') {
          updated = store.depreciationVouchers.find(
            (v: DepreciationVoucher) => v.id === currentVoucher.id
          );
        } else {
          updated = store.scrapVouchers.find(
            (v: ScrapVoucher) => v.id === currentVoucher.id
          );
        }
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
        revokeVoucher(currentVoucher.id, currentVoucher.type);
        setRefreshKey((k) => k + 1);
        const store = useAppStore.getState();
        let updated: FinanceVoucher | undefined;
        if (currentVoucher.type === 'depreciation') {
          updated = store.depreciationVouchers.find(
            (v: DepreciationVoucher) => v.id === currentVoucher.id
          );
        } else {
          updated = store.scrapVouchers.find(
            (v: ScrapVoucher) => v.id === currentVoucher.id
          );
        }
        setCurrentVoucher(updated || null);
        message.success('凭证已撤回');
      },
    });
  };

  const handleReset = () => {
    setSearchText('');
    setFilterPeriod(undefined);
    setFilterType(undefined);
    setFilterStatus(undefined);
  };

  const getDetailFooter = () => {
    if (!currentVoucher) return null;
    const buttons = [];
    buttons.push(
      <Button key="close" onClick={() => setDetailModalVisible(false)}>
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

  const columns: ColumnsType<FinanceVoucher> = [
    {
      title: '凭证编号',
      dataIndex: 'voucherNo',
      key: 'voucherNo',
      width: 220,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '期间',
      dataIndex: 'period',
      key: 'period',
      width: 110,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '凭证类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: VoucherType) => (
        <Tag color={VOUCHER_TYPE_COLORS[type]} icon={<FileTextOutlined />}>
          {VOUCHER_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: '关联信息',
      key: 'related',
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        if (record.type === 'depreciation') {
          return (
            <Space direction="vertical" size={0}>
              <span className="text-xs text-gray-500">
                维度：{record.summaryDimension === 'category' ? '按资产类别' : '按使用部门'}
              </span>
              <span>共 {record.assetCount} 项资产</span>
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            <span className="font-mono text-xs">{record.assetNo}</span>
            <span>{record.assetName}</span>
          </Space>
        );
      },
    },
    {
      title: '借方合计',
      dataIndex: 'totalDebit',
      key: 'totalDebit',
      width: 140,
      align: 'right',
      render: (value) => <span className="text-orange-600 font-medium">{formatCurrency(value)}</span>,
    },
    {
      title: '贷方合计',
      dataIndex: 'totalCredit',
      key: 'totalCredit',
      width: 140,
      align: 'right',
      render: (value) => <span className="text-green-600 font-medium">{formatCurrency(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: VoucherStatus) => (
        <Tag color={VOUCHER_STATUS_COLORS[status]}>
          {VOUCHER_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
      render: (userId) => getUserName(userId),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="搜索凭证号/资产名称"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <div className="text-gray-500 text-sm mb-1">期间选择</div>
            <DatePicker.MonthPicker
              style={{ width: '100%' }}
              value={filterPeriod ? dayjs(filterPeriod) : null}
              onChange={(date) => setFilterPeriod(date ? date.format('YYYY-MM') : undefined)}
              placeholder="选择期间"
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Select
              placeholder="凭证类型"
              allowClear
              style={{ width: '100%' }}
              value={filterType}
              onChange={(value) => setFilterType(value)}
            >
              <Option value="depreciation">折旧凭证</Option>
              <Option value="scrap">报废凭证</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Select
              placeholder="凭证状态"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
            >
              <Option value="draft">草稿</Option>
              <Option value="posted">已入账</Option>
              <Option value="revoked">已撤回</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10} lg={5}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <span>财务凭证管理</span>
            <Tag color="blue">共 {filteredVouchers.length} 条</Tag>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredVouchers}
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
        title="凭证详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setCurrentVoucher(null);
        }}
        footer={getDetailFooter()}
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
              <Descriptions.Item label="凭证类型">
                <Tag color={VOUCHER_TYPE_COLORS[currentVoucher.type]}>
                  {VOUCHER_TYPE_LABELS[currentVoucher.type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="期间">{currentVoucher.period}</Descriptions.Item>
              <Descriptions.Item label="借方合计">
                <span className="text-orange-600 font-medium">{formatCurrency(currentVoucher.totalDebit)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="贷方合计">
                <span className="text-green-600 font-medium">{formatCurrency(currentVoucher.totalCredit)}</span>
              </Descriptions.Item>
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

            {currentVoucher.type === 'scrap' && (
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
            )}

            {currentVoucher.type === 'depreciation' && (
              <Descriptions title="折旧汇总信息" column={2} bordered size="small" className="mb-4">
                <Descriptions.Item label="汇总维度">
                  {currentVoucher.summaryDimension === 'category' ? '按资产类别' : '按使用部门'}
                </Descriptions.Item>
                <Descriptions.Item label="资产数量">{currentVoucher.assetCount} 项</Descriptions.Item>
              </Descriptions>
            )}

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

export default FinanceVoucherPage;
