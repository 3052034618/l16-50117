import { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Space, Tag, Modal, Popconfirm, Card, Row, Col, Form, App } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SwapOutlined,
  DeleteFilled,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import useAppStore from '@/store';
import { formatCurrency, formatDate, downloadJson } from '@/utils/helpers';
import { ASSET_STATUS } from '@/utils/constants';
import type { Asset, AssetStatus } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const AssetList = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { assets, categories, departments, users, deleteAsset, createAllocation, createTransfer, createScrap } = useAppStore();

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>();
  const [filterStatus, setFilterStatus] = useState<AssetStatus>();
  const [filterDepartment, setFilterDepartment] = useState<string>();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条记录`,
  });

  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [allocateForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [scrapForm] = Form.useForm();

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(search);
        const matchNo = asset.assetNo.toLowerCase().includes(search);
        if (!matchName && !matchNo) return false;
      }
      if (filterCategory && asset.categoryId !== filterCategory) return false;
      if (filterStatus && asset.status !== filterStatus) return false;
      if (filterDepartment && asset.currentDepartmentId !== filterDepartment) return false;
      return true;
    });
  }, [assets, searchText, filterCategory, filterStatus, filterDepartment]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

  const getUserName = (userId?: string) => {
    if (!userId) return '-';
    return users.find((u) => u.id === userId)?.name || '-';
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '-';
    return departments.find((d) => d.id === departmentId)?.name || '-';
  };

  const handleEdit = (id: string) => {
    navigate(`/assets/edit/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteAsset(id);
  };

  const handleView = (id: string) => {
    navigate(`/assets/${id}`);
  };

  const openAllocateModal = (asset: Asset) => {
    setActiveAsset(asset);
    allocateForm.resetFields();
    setAllocateModalOpen(true);
  };

  const openTransferModal = (asset: Asset) => {
    setActiveAsset(asset);
    transferForm.resetFields();
    setTransferModalOpen(true);
  };

  const openScrapModal = (asset: Asset) => {
    setActiveAsset(asset);
    scrapForm.resetFields();
    setScrapModalOpen(true);
  };

  const handleAllocateSubmit = async () => {
    try {
      const values = await allocateForm.validateFields();
      if (!activeAsset) return;
      createAllocation(activeAsset.id, values.userId, values.departmentId);
      message.success('分配成功');
      setAllocateModalOpen(false);
      allocateForm.resetFields();
      setActiveAsset(null);
    } catch {}
  };

  const handleTransferSubmit = async () => {
    try {
      const values = await transferForm.validateFields();
      if (!activeAsset) return;
      createTransfer(activeAsset.id, values.toUserId, values.reason);
      message.success('调拨申请已提交');
      setTransferModalOpen(false);
      transferForm.resetFields();
      setActiveAsset(null);
    } catch {}
  };

  const handleScrapSubmit = async () => {
    try {
      const values = await scrapForm.validateFields();
      if (!activeAsset) return;
      const { currentUser } = useAppStore.getState();
      if (!currentUser?.id) {
        message.error('请先登录');
        return;
      }
      createScrap(activeAsset.id, currentUser.id, values.reason);
      message.success('报废申请已提交');
      setScrapModalOpen(false);
      scrapForm.resetFields();
      setActiveAsset(null);
    } catch {}
  };

  const handleExport = () => {
    const exportData = filteredAssets.map((asset) => ({
      资产编号: asset.assetNo,
      名称: asset.name,
      类别: getCategoryName(asset.categoryId),
      规格型号: asset.specification || '-',
      制造厂商: asset.manufacturer || '-',
      购置日期: formatDate(asset.purchaseDate),
      原值: asset.originalValue,
      净值: asset.currentValue,
      累计折旧: asset.accumulatedDepreciation,
      状态: ASSET_STATUS[asset.status].label,
      使用人: getUserName(asset.currentUserId),
      使用部门: getDepartmentName(asset.currentDepartmentId),
      存放地点: asset.location || '-',
    }));
    downloadJson(exportData, `资产列表_${formatDate(new Date(), 'YYYYMMDD')}.json`);
  };

  const handleReset = () => {
    setSearchText('');
    setFilterCategory(undefined);
    setFilterStatus(undefined);
    setFilterDepartment(undefined);
    setPagination({ ...pagination, current: 1 });
  };

  const getActionButtons = (asset: Asset) => {
    const buttons = [];
    buttons.push(
      <Button key="view" type="link" size="small" onClick={() => handleView(asset.id)}>
        详情
      </Button>
    );

    if (asset.status !== 'scrapped' && asset.status !== 'lost') {
      buttons.push(
        <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(asset.id)}>
          编辑
        </Button>
      );
    }

    if (asset.status === 'in-stock') {
      buttons.push(
        <Button key="allocate" type="link" size="small" icon={<UserOutlined />} onClick={() => openAllocateModal(asset)}>
          分配
        </Button>
      );
    }

    if (asset.status === 'in-use') {
      buttons.push(
        <Button key="transfer" type="link" size="small" icon={<SwapOutlined />} onClick={() => openTransferModal(asset)}>
          调拨
        </Button>
      );
    }

    if (asset.status !== 'scrapped' && asset.status !== 'lost' && asset.status !== 'transferred') {
      buttons.push(
        <Button key="scrap" type="link" size="small" danger icon={<DeleteFilled />} onClick={() => openScrapModal(asset)}>
          报废
        </Button>
      );
    }

    if (asset.status !== 'transferred') {
      buttons.push(
        <Popconfirm
          key="delete"
          title="确定要删除该资产吗？"
          description="删除后将无法恢复，相关的折旧记录、分配记录等也将被删除。"
          onConfirm={() => handleDelete(asset.id)}
          okText="确定"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      );
    }

    return buttons;
  };

  const columns: ColumnsType<Asset> = [
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
      title: '净值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 120,
      align: 'right',
      render: (value) => <span className="font-semibold">{formatCurrency(value)}</span>,
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AssetStatus) => {
        const statusInfo = ASSET_STATUS[status];
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: '使用人',
      dataIndex: 'currentUserId',
      key: 'currentUserId',
      width: 100,
      render: (userId) => getUserName(userId),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
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
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
            >
              {Object.entries(ASSET_STATUS).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="选择使用部门"
              allowClear
              style={{ width: '100%' }}
              value={filterDepartment}
              onChange={(value) => setFilterDepartment(value)}
            >
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={24} lg={3}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={`资产列表 (${filteredAssets.length})`}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/assets/new')}>
              新增资产
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredAssets}
          rowKey="id"
          pagination={{
            ...pagination,
            total: filteredAssets.length,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>

      <Modal
        title="资产分配"
        open={allocateModalOpen}
        onOk={handleAllocateSubmit}
        onCancel={() => { setAllocateModalOpen(false); allocateForm.resetFields(); setActiveAsset(null); }}
        okText="确认分配"
        cancelText="取消"
      >
        {activeAsset && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <div>资产：<span className="font-medium">{activeAsset.name}</span>（{activeAsset.assetNo}）</div>
          </div>
        )}
        <Form form={allocateForm} layout="vertical">
          <Form.Item name="departmentId" label="所属部门" rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder="请选择部门">
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>{dept.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="userId" label="使用人" rules={[{ required: true, message: '请选择使用人' }]}>
            <Select placeholder="请选择使用人" showSearch optionFilterProp="children">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>{user.name} - {getDepartmentName(user.departmentId)}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资产调拨"
        open={transferModalOpen}
        onOk={handleTransferSubmit}
        onCancel={() => { setTransferModalOpen(false); transferForm.resetFields(); setActiveAsset(null); }}
        okText="提交调拨"
        cancelText="取消"
      >
        {activeAsset && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <div>资产：<span className="font-medium">{activeAsset.name}</span>（{activeAsset.assetNo}）</div>
            <div>当前使用人：<span className="font-medium">{getUserName(activeAsset.currentUserId)}</span></div>
            <div>当前部门：<span className="font-medium">{getDepartmentName(activeAsset.currentDepartmentId)}</span></div>
          </div>
        )}
        <Form form={transferForm} layout="vertical">
          <Form.Item name="toUserId" label="接收人" rules={[{ required: true, message: '请选择接收人' }]}>
            <Select placeholder="请选择接收人" showSearch optionFilterProp="children">
              {users
                .filter((u) => u.id !== activeAsset?.currentUserId)
                .map((user) => (
                  <Option key={user.id} value={user.id}>{user.name} - {getDepartmentName(user.departmentId)}</Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="调拨原因">
            <TextArea rows={3} placeholder="请输入调拨原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资产报废"
        open={scrapModalOpen}
        onOk={handleScrapSubmit}
        onCancel={() => { setScrapModalOpen(false); scrapForm.resetFields(); setActiveAsset(null); }}
        okText="提交报废"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        {activeAsset && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <div>资产：<span className="font-medium">{activeAsset.name}</span>（{activeAsset.assetNo}）</div>
            <div>当前净值：<span className="font-medium">{formatCurrency(activeAsset.currentValue)}</span></div>
          </div>
        )}
        <div className="mb-4 p-3 bg-orange-50 rounded text-orange-700 text-sm">
          报废后资产状态将变更为待审核，审核通过后资产将标记为已报废并停止计提折旧。此操作不可撤销，请谨慎操作。
        </div>
        <Form form={scrapForm} layout="vertical">
          <Form.Item name="reason" label="报废原因" rules={[{ required: true, message: '请输入报废原因' }]}>
            <TextArea rows={4} placeholder="请详细描述报废原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetList;
