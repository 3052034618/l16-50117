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
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAppStore from '@/store';
import { formatDate } from '@/utils/helpers';
import { TRANSFER_STATUS } from '@/utils/constants';
import type { TransferRecord, TransferStatus, Asset } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface TabItem {
  key: TransferStatus;
  label: string;
}

const TransferPage = () => {
  const {
    transfers,
    assets,
    users,
    departments,
    currentUser,
    createTransfer,
    approveTransfer,
    rejectTransfer,
    confirmTransfer,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TransferStatus>('pending');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<TransferStatus>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [currentTransfer, setCurrentTransfer] = useState<TransferRecord | null>(null);
  const [createForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const tabItems: TabItem[] = [
    { key: 'pending', label: '待审核' },
    { key: 'approved', label: '待接收' },
    { key: 'confirmed', label: '已完成' },
    { key: 'rejected', label: '已拒绝' },
  ];

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      if (searchText) {
        const asset = assets.find((a) => a.id === transfer.assetId);
        if (!asset) return false;
        const search = searchText.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(search);
        const matchNo = asset.assetNo.toLowerCase().includes(search);
        if (!matchName && !matchNo) return false;
      }
      if (filterStatus && transfer.status !== filterStatus) return false;
      return true;
    });
  }, [transfers, assets, searchText, filterStatus]);

  const tabData = useMemo(() => {
    return filteredTransfers.filter((t) => t.status === activeTab);
  }, [filteredTransfers, activeTab]);

  const inUseAssets = useMemo(() => {
    return assets.filter((a) => a.status === 'in-use' && a.currentUserId === currentUser?.id);
  }, [assets, currentUser]);

  const getAssetInfo = (assetId: string): Asset | undefined => {
    return assets.find((a) => a.id === assetId);
  };

  const getUserName = (userId: string): string => {
    return users.find((u) => u.id === userId)?.name || '-';
  };

  const getDepartmentName = (departmentId: string): string => {
    return departments.find((d) => d.id === departmentId)?.name || '-';
  };

  const getUserWithDepartment = (userId: string, departmentId: string): string => {
    const userName = getUserName(userId);
    const deptName = getDepartmentName(departmentId);
    return `${userName} / ${deptName}`;
  };

  const handleCreate = () => {
    createForm.validateFields().then((values) => {
      const { assetId, toUserId, reason } = values;
      if (!currentUser) {
        message.error('请先登录');
        return;
      }
      try {
        createTransfer(assetId, currentUser.id, toUserId, reason);
        message.success('调拨申请已提交');
        setCreateModalVisible(false);
        createForm.resetFields();
      } catch (error) {
        message.error('提交失败，请重试');
      }
    });
  };

  const handleApprove = (transferId: string) => {
    try {
      approveTransfer(transferId);
      message.success('审核通过');
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleReject = () => {
    rejectForm.validateFields().then((values) => {
      if (!currentTransfer) return;
      try {
        rejectTransfer(currentTransfer.id, values.reason);
        message.success('已拒绝');
        setRejectModalVisible(false);
        rejectForm.resetFields();
        setCurrentTransfer(null);
      } catch (error) {
        message.error('操作失败，请重试');
      }
    });
  };

  const handleConfirm = (transferId: string) => {
    try {
      confirmTransfer(transferId);
      message.success('已确认接收');
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleView = (transfer: TransferRecord) => {
    setCurrentTransfer(transfer);
    setViewModalVisible(true);
  };

  const handleOpenRejectModal = (transfer: TransferRecord) => {
    setCurrentTransfer(transfer);
    setRejectModalVisible(true);
  };

  const handleReset = () => {
    setSearchText('');
    setFilterStatus(undefined);
  };

  const getActionButtons = (record: TransferRecord) => {
    const buttons = [];

    if (record.status === 'pending') {
      buttons.push(
        <Popconfirm
          key="approve"
          title="确定要审核通过吗？"
          onConfirm={() => handleApprove(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" icon={<CheckOutlined />} className="text-green-600">
            通过
          </Button>
        </Popconfirm>
      );
      buttons.push(
        <Button
          key="reject"
          type="link"
          size="small"
          danger
          icon={<CloseOutlined />}
          onClick={() => handleOpenRejectModal(record)}
        >
          拒绝
        </Button>
      );
    }

    if (record.status === 'approved' && record.toUserId === currentUser?.id) {
      buttons.push(
        <Popconfirm
          key="confirm"
          title="确定要确认接收吗？"
          onConfirm={() => handleConfirm(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" icon={<CheckOutlined />} className="text-green-600">
            确认接收
          </Button>
        </Popconfirm>
      );
    }

    if (record.status === 'confirmed' || record.status === 'rejected') {
      buttons.push(
        <Button key="view" type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
          详情
        </Button>
      );
    }

    return buttons;
  };

  const columns: ColumnsType<TransferRecord> = [
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
      title: '调出人/部门',
      key: 'from',
      width: 180,
      render: (_, record) => getUserWithDepartment(record.fromUserId, record.fromDepartmentId),
    },
    {
      title: '调入人/部门',
      key: 'to',
      width: 180,
      render: (_, record) => getUserWithDepartment(record.toUserId, record.toDepartmentId),
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
      render: (status: TransferStatus) => {
        const statusInfo = TRANSFER_STATUS[status];
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
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
              {Object.entries(TRANSFER_STATUS).map(([key, value]) => (
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
        title="调拨管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            disabled={inUseAssets.length === 0}
          >
            发起调拨
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TransferStatus)}
          items={tabItems.map((item) => ({
            key: item.key,
            label: `${item.label} (${filteredTransfers.filter((t) => t.status === item.key).length})`,
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
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      <Modal
        title="发起调拨"
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
            rules={[{ required: true, message: '请选择要调拨的资产' }]}
          >
            <Select placeholder="请选择使用中的资产" showSearch optionFilterProp="children">
              {inUseAssets.map((asset) => (
                <Option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.assetNo})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="toUserId"
            label="接收人"
            rules={[{ required: true, message: '请选择接收人' }]}
          >
            <Select placeholder="请选择接收人" showSearch optionFilterProp="children">
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.name} - {getDepartmentName(user.departmentId)}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="调拨原因">
            <TextArea rows={3} placeholder="请填写调拨原因（可选）" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="调拨详情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setCurrentTransfer(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {currentTransfer && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="资产编号">
              {getAssetInfo(currentTransfer.assetId)?.assetNo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资产名称">
              {getAssetInfo(currentTransfer.assetId)?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="调出人">
              {getUserName(currentTransfer.fromUserId)}
            </Descriptions.Item>
            <Descriptions.Item label="调出部门">
              {getDepartmentName(currentTransfer.fromDepartmentId)}
            </Descriptions.Item>
            <Descriptions.Item label="调入人">
              {getUserName(currentTransfer.toUserId)}
            </Descriptions.Item>
            <Descriptions.Item label="调入部门">
              {getDepartmentName(currentTransfer.toDepartmentId)}
            </Descriptions.Item>
            <Descriptions.Item label="申请日期">
              {formatDate(currentTransfer.applyDate)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={TRANSFER_STATUS[currentTransfer.status].color}>
                {TRANSFER_STATUS[currentTransfer.status].label}
              </Tag>
            </Descriptions.Item>
            {currentTransfer.confirmedAt && (
              <Descriptions.Item label="确认日期">
                {formatDate(currentTransfer.confirmedAt)}
              </Descriptions.Item>
            )}
            {currentTransfer.reason && (
              <Descriptions.Item label="调拨原因">{currentTransfer.reason}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="拒绝调拨"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
          setCurrentTransfer(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setRejectModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" danger onClick={handleReject}>
            确认拒绝
          </Button>,
        ]}
        width={400}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="拒绝原因"
            rules={[{ required: true, message: '请填写拒绝原因' }]}
          >
            <TextArea rows={3} placeholder="请填写拒绝原因" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransferPage;
