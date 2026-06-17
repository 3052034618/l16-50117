import { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Space, Tag, Modal, Popconfirm, Card, Row, Col } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
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

const AssetList = () => {
  const navigate = useNavigate();
  const { assets, categories, departments, users, deleteAsset } = useAppStore();

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
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);

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

  const handleView = (asset: Asset) => {
    setCurrentAsset(asset);
    setViewModalVisible(true);
  };

  const handleEdit = (id: string) => {
    navigate(`/assets/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    deleteAsset(id);
  };

  const handleAllocate = (id: string) => {
    navigate(`/assets/${id}/allocate`);
  };

  const handleTransfer = (id: string) => {
    navigate(`/assets/${id}/transfer`);
  };

  const handleScrap = (id: string) => {
    navigate(`/assets/${id}/scrap`);
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
      <Button key="view" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(asset)}>
        查看
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
        <Button key="allocate" type="link" size="small" icon={<UserOutlined />} onClick={() => handleAllocate(asset.id)}>
          分配
        </Button>
      );
    }

    if (asset.status === 'in-use') {
      buttons.push(
        <Button key="transfer" type="link" size="small" icon={<SwapOutlined />} onClick={() => handleTransfer(asset.id)}>
          调拨
        </Button>
      );
    }

    if (asset.status !== 'scrapped' && asset.status !== 'lost' && asset.status !== 'transferred') {
      buttons.push(
        <Button key="scrap" type="link" size="small" danger icon={<DeleteFilled />} onClick={() => handleScrap(asset.id)}>
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
        title="资产详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {currentAsset && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-gray-500 text-sm">资产编号</div>
                <div className="font-mono">{currentAsset.assetNo}</div>
              </Col>
              <Col span={12}>
                <div className="text-gray-500 text-sm">状态</div>
                <div>
                  <Tag color={ASSET_STATUS[currentAsset.status].color}>
                    {ASSET_STATUS[currentAsset.status].label}
                  </Tag>
                </div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-gray-500 text-sm">资产名称</div>
                <div>{currentAsset.name}</div>
              </Col>
              <Col span={12}>
                <div className="text-gray-500 text-sm">资产类别</div>
                <div>{getCategoryName(currentAsset.categoryId)}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-gray-500 text-sm">规格型号</div>
                <div>{currentAsset.specification || '-'}</div>
              </Col>
              <Col span={12}>
                <div className="text-gray-500 text-sm">制造厂商</div>
                <div>{currentAsset.manufacturer || '-'}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-gray-500 text-sm">购置日期</div>
                <div>{formatDate(currentAsset.purchaseDate)}</div>
              </Col>
              <Col span={12}>
                <div className="text-gray-500 text-sm">使用年限</div>
                <div>{currentAsset.usefulLife} 个月</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <div className="text-gray-500 text-sm">原值</div>
                <div>{formatCurrency(currentAsset.originalValue)}</div>
              </Col>
              <Col span={8}>
                <div className="text-gray-500 text-sm">累计折旧</div>
                <div>{formatCurrency(currentAsset.accumulatedDepreciation)}</div>
              </Col>
              <Col span={8}>
                <div className="text-gray-500 text-sm">净值</div>
                <div className="font-semibold">{formatCurrency(currentAsset.currentValue)}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-gray-500 text-sm">使用人</div>
                <div>{getUserName(currentAsset.currentUserId)}</div>
              </Col>
              <Col span={12}>
                <div className="text-gray-500 text-sm">使用部门</div>
                <div>{getDepartmentName(currentAsset.currentDepartmentId)}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <div className="text-gray-500 text-sm">存放地点</div>
                <div>{currentAsset.location || '-'}</div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssetList;
