import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Popconfirm,
  message,
  Tabs,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAppStore from '@/store';
import { DEPRECIATION_METHODS, USER_ROLES } from '@/utils/constants';
import type { Category, Department, User } from '@/types';

const { Option } = Select;
const { TextArea } = Input;

type TabKey = 'categories' | 'departments' | 'users';

const Settings = () => {
  const {
    categories,
    departments,
    users,
    addCategory,
    updateCategory,
    deleteCategory,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addUser,
    updateUser,
    deleteUser,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabKey>('categories');
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Category | Department | User | null>(null);
  const [form] = Form.useForm();

  const openAddModal = () => {
    setModalType('add');
    setCurrentRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: Category | Department | User) => {
    setModalType('edit');
    setCurrentRecord(record);
    const formData = { ...record };
    if (activeTab === 'categories' && 'residualRate' in formData) {
      formData.residualRate = Math.round(formData.residualRate * 100);
    }
    form.setFieldsValue(formData);
    setModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      try {
        if (activeTab === 'categories') {
          const categoryData = { ...values };
          if (categoryData.residualRate !== undefined) {
            categoryData.residualRate = categoryData.residualRate / 100;
          }
          if (modalType === 'add') {
            addCategory(categoryData);
            message.success('类别添加成功');
          } else if (currentRecord) {
            updateCategory(currentRecord.id, categoryData);
            message.success('类别更新成功');
          }
        } else if (activeTab === 'departments') {
          if (modalType === 'add') {
            addDepartment(values);
            message.success('部门添加成功');
          } else if (currentRecord) {
            updateDepartment(currentRecord.id, values);
            message.success('部门更新成功');
          }
        } else if (activeTab === 'users') {
          if (modalType === 'add') {
            addUser(values);
            message.success('用户添加成功');
          } else if (currentRecord) {
            updateUser(currentRecord.id, values);
            message.success('用户更新成功');
          }
        }
        setModalVisible(false);
        form.resetFields();
      } catch (error) {
        message.error('操作失败，请重试');
      }
    });
  };

  const handleDelete = (id: string) => {
    try {
      if (activeTab === 'categories') {
        deleteCategory(id);
      } else if (activeTab === 'departments') {
        deleteDepartment(id);
      } else if (activeTab === 'users') {
        deleteUser(id);
      }
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败，请检查是否有关联数据');
    }
  };

  const categoryColumns: ColumnsType<Category> = [
    {
      title: '类别编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '类别名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '折旧年限（月）',
      dataIndex: 'usefulLife',
      key: 'usefulLife',
      width: 140,
    },
    {
      title: '折旧方法',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      width: 160,
      render: (method) => DEPRECIATION_METHODS[method]?.label || method,
    },
    {
      title: '残值率',
      dataIndex: 'residualRate',
      key: 'residualRate',
      width: 120,
      render: (rate) => `${(rate * 100).toFixed(0)}%`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该类别吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const departmentColumns: ColumnsType<Department> = [
    {
      title: '部门编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该部门吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const roleInfo = USER_ROLES[role];
        return <Tag color="blue">{roleInfo?.label || role}</Tag>;
      },
    },
    {
      title: '所属部门',
      dataIndex: 'departmentId',
      key: 'departmentId',
      width: 150,
      render: (deptId) => departments.find((d) => d.id === deptId)?.name || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getModalTitle = () => {
    const typeText = modalType === 'add' ? '新增' : '编辑';
    if (activeTab === 'categories') return `${typeText}资产类别`;
    if (activeTab === 'departments') return `${typeText}部门`;
    return `${typeText}用户`;
  };

  const renderModalForm = () => {
    if (activeTab === 'categories') {
      return (
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="类别编码"
                rules={[{ required: true, message: '请输入类别编码' }]}
              >
                <Input placeholder="请输入类别编码" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="类别名称"
                rules={[{ required: true, message: '请输入类别名称' }]}
              >
                <Input placeholder="请输入类别名称" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="usefulLife"
                label="折旧年限（月）"
                rules={[{ required: true, message: '请输入折旧年限' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入折旧年限"
                  min={1}
                  max={360}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="depreciationMethod"
                label="折旧方法"
                rules={[{ required: true, message: '请选择折旧方法' }]}
              >
                <Select placeholder="请选择折旧方法">
                  {Object.entries(DEPRECIATION_METHODS).map(([key, value]) => (
                    <Option key={key} value={key}>
                      {value.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="residualRate"
            label="残值率"
            rules={[{ required: true, message: '请输入残值率' }]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              placeholder="请输入残值率，如5表示5%"
              min={0}
              max={100}
              step={1}
              precision={0}
              addonAfter="%"
              parser={(value) => (value ? parseFloat(value.replace('%', '')) as number : 0)}
            />
          </Form.Item>
        </Form>
      );
    }

    if (activeTab === 'departments') {
      return (
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="部门编码"
                rules={[{ required: true, message: '请输入部门编码' }]}
              >
                <Input placeholder="请输入部门编码" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="部门名称"
                rules={[{ required: true, message: '请输入部门名称' }]}
              >
                <Input placeholder="请输入部门名称" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      );
    }

    return (
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" maxLength={50} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入姓名" maxLength={50} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select placeholder="请选择角色">
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <Option key={key} value={key}>
                    {value.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="departmentId"
              label="所属部门"
              rules={[{ required: true, message: '请选择所属部门' }]}
            >
              <Select placeholder="请选择所属部门">
                {departments.map((dept) => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    );
  };

  const tabItems = [
    {
      key: 'categories',
      label: (
        <span className="flex items-center gap-2">
          <AppstoreOutlined />
          资产类别
        </span>
      ),
      children: (
        <Table
          columns={categoryColumns}
          dataSource={categories}
          rowKey="id"
          pagination={{
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
      key: 'departments',
      label: (
        <span className="flex items-center gap-2">
          <TeamOutlined />
          部门管理
        </span>
      ),
      children: (
        <Table
          columns={departmentColumns}
          dataSource={departments}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 500 }}
          size="middle"
        />
      ),
    },
    {
      key: 'users',
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          用户管理
        </span>
      ),
      children: (
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 700 }}
          size="middle"
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title="系统设置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增{activeTab === 'categories' ? '类别' : activeTab === 'departments' ? '部门' : '用户'}
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as TabKey);
            form.resetFields();
          }}
          items={tabItems}
        />
      </Card>

      <Modal
        title={getModalTitle()}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={handleModalOk}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        {renderModalForm()}
      </Modal>
    </div>
  );
};

export default Settings;
