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
  Tag,
  Popconfirm,
  message,
  Tabs,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  QrcodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAppStore from '@/store';
import { formatDate } from '@/utils/helpers';
import { ALLOCATION_STATUS } from '@/utils/constants';
import type { AllocationRecord, AllocationStatus, Asset, User, Department } from '@/types';

const { Option } = Select;

type TabKey = 'pending' | 'completed';

interface AllocationListItem extends AllocationRecord {
  asset: Asset;
  user: User;
  department: Department;
}

const Allocation = () => {
  const {
    allocations,
    assets,
    users,
    departments,
    createAllocation,
    confirmAllocation,
    updateAsset,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [filterStatus, setFilterStatus] = useState<AllocationStatus>();
  const [filterDepartment, setFilterDepartment] = useState<string>();
  const [modalVisible, setModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [scanForm] = Form.useForm();

  const inStockAssets = useMemo(() => {
    return assets.filter((a) => a.status === 'in-stock');
  }, [assets]);

  const allocationList = useMemo((): AllocationListItem[] => {
    return allocations
      .map((allocation) => {
        const asset = assets.find((a) => a.id === allocation.assetId);
        const user = users.find((u) => u.id === allocation.userId);
        const department = departments.find((d) => d.id === allocation.departmentId);
        if (!asset || !user || !department) return null;
        return {
          ...allocation,
          asset,
          user,
          department,
        };
      })
      .filter((item): item is AllocationListItem => item !== null);
  }, [allocations, assets, users, departments]);

  const pendingList = useMemo(() => {
    return allocationList.filter((item) => item.status === 'pending');
  }, [allocationList]);

  const completedList = useMemo(() => {
    return allocationList.filter((item) => item.status === 'confirmed' || item.status === 'returned');
  }, [allocationList]);

  const filteredPendingList = useMemo(() => {
    return pendingList.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterDepartment && item.departmentId !== filterDepartment) return false;
      return true;
    });
  }, [pendingList, filterStatus, filterDepartment]);

  const filteredCompletedList = useMemo(() => {
    return completedList.filter((item) => {
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterDepartment && item.departmentId !== filterDepartment) return false;
      return true;
    });
  }, [completedList, filterStatus, filterDepartment]);

  const handleConfirm = (allocationId: string) => {
    confirmAllocation(allocationId);
    message.success('确认领用成功');
  };

  const handleCancelAllocation = (record: AllocationListItem) => {
    updateAsset(record.assetId, {
      status: 'in-stock',
      currentUserId: undefined,
      currentDepartmentId: undefined,
    });
    useAppStore.setState((state) => ({
      allocations: state.allocations.filter((a) => a.id !== record.id),
    }));
    message.success('取消分配成功');
  };

  const handleCreate = () => {
    form.validateFields().then((values) => {
      const { assetId, userId, departmentId } = values;
      createAllocation(assetId, userId, departmentId);
      message.success('分配创建成功');
      setModalVisible(false);
      form.resetFields();
    });
  };

  const handleScanConfirm = () => {
    scanForm.validateFields().then((values) => {
      const { assetNo } = values;
      const asset = assets.find((a) => a.assetNo === assetNo);
      if (!asset) {
        message.error('未找到该资产');
        return;
      }

      const pendingAllocation = allocationList.find(
        (a) => a.assetId === asset.id && a.status === 'pending'
      );

      if (!pendingAllocation) {
        message.error('该资产没有待确认的分配记录');
        return;
      }

      confirmAllocation(pendingAllocation.id);
      message.success('扫码确认成功');
      setScanModalVisible(false);
      scanForm.resetFields();
    });
  };

  const handleReset = () => {
    setFilterStatus(undefined);
    setFilterDepartment(undefined);
  };

  const pendingColumns: ColumnsType<AllocationListItem> = [
    {
      title: '资产编号',
      dataIndex: ['asset', 'assetNo'],
      key: 'assetNo',
      width: 140,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: ['asset', 'name'],
      key: 'assetName',
      width: 180,
    },
    {
      title: '使用人',
      dataIndex: ['user', 'name'],
      key: 'userName',
      width: 100,
    },
    {
      title: '所属部门',
      dataIndex: ['department', 'name'],
      key: 'departmentName',
      width: 140,
    },
    {
      title: '分配日期',
      dataIndex: 'allocationDate',
      key: 'allocationDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap size={0}>
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleConfirm(record.id)}
          >
            确认领用
          </Button>
          <Popconfirm
            title="确定要取消该分配吗？"
            description="取消后资产状态将恢复为在库，分配记录将被删除。"
            onConfirm={() => handleCancelAllocation(record)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<CloseOutlined />}>
              取消分配
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const completedColumns: ColumnsType<AllocationListItem> = [
    {
      title: '资产编号',
      dataIndex: ['asset', 'assetNo'],
      key: 'assetNo',
      width: 140,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '名称',
      dataIndex: ['asset', 'name'],
      key: 'assetName',
      width: 180,
    },
    {
      title: '使用人',
      dataIndex: ['user', 'name'],
      key: 'userName',
      width: 100,
    },
    {
      title: '所属部门',
      dataIndex: ['department', 'name'],
      key: 'departmentName',
      width: 140,
    },
    {
      title: '分配日期',
      dataIndex: 'allocationDate',
      key: 'allocationDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '确认日期',
      dataIndex: 'confirmedAt',
      key: 'confirmedAt',
      width: 120,
      render: (date) => (date ? formatDate(date) : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AllocationStatus) => {
        const statusInfo = ALLOCATION_STATUS[status];
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: `待确认分配 (${filteredPendingList.length})`,
      children: (
        <Table
          columns={pendingColumns}
          dataSource={filteredPendingList}
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
      ),
    },
    {
      key: 'completed',
      label: `已完成分配 (${filteredCompletedList.length})`,
      children: (
        <Table
          columns={completedColumns}
          dataSource={filteredCompletedList}
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
  ];

  return (
    <div className="p-6">
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择分配状态"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
            >
              {Object.entries(ALLOCATION_STATUS).map(([key, value]) => (
                <Option key={key} value={key}>
                  {value.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="选择部门"
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
          <Col xs={24} sm={24} md={8} lg={12}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title="资产分配管理"
        extra={
          <Space>
            <Button icon={<QrcodeOutlined />} onClick={() => setScanModalVisible(true)}>
              扫码确认
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              新增分配
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={tabItems}
        />
      </Card>

      <Modal
        title="新增资产分配"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={handleCreate}
        okText="确认"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="assetId"
            label="选择资产"
            rules={[{ required: true, message: '请选择资产' }]}
          >
            <Select placeholder="请选择在库资产" showSearch optionFilterProp="children">
              {inStockAssets.map((asset) => (
                <Option key={asset.id} value={asset.id}>
                  [{asset.assetNo}] {asset.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="userId"
            label="选择使用人"
            rules={[{ required: true, message: '请选择使用人' }]}
          >
            <Select placeholder="请选择使用人" showSearch optionFilterProp="children">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="departmentId"
            label="选择部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select placeholder="请选择部门">
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="扫码确认分配"
        open={scanModalVisible}
        onCancel={() => {
          setScanModalVisible(false);
          scanForm.resetFields();
        }}
        onOk={handleScanConfirm}
        okText="确认"
        cancelText="取消"
        width={400}
      >
        <Form form={scanForm} layout="vertical">
          <Form.Item
            name="assetNo"
            label="扫描资产编号"
            rules={[{ required: true, message: '请输入或扫描资产编号' }]}
          >
            <Input placeholder="请扫描二维码或手动输入资产编号" size="large" />
          </Form.Item>
          <div className="text-center text-gray-500 text-sm">
            请使用扫描枪扫描资产二维码，或手动输入资产编号进行确认
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Allocation;
