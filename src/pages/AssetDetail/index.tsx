import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Timeline,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  Row,
  Col,
  App,
} from 'antd';
import {
  EditOutlined,
  UserOutlined,
  SwapOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
  InboxOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import useAppStore from '@/store';
import { formatCurrency, formatDate, generateQRCodeData } from '@/utils/helpers';
import {
  ASSET_STATUS,
  DEPRECIATION_METHODS,
  ALLOCATION_STATUS,
  TRANSFER_STATUS,
  SCRAP_STATUS,
} from '@/utils/constants';
import type { ColumnsType } from 'antd/es/table';
import type { DepreciationRecord } from '@/types';

const { TextArea } = Input;
const { Option } = Select;

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [allocateForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [scrapForm] = Form.useForm();

  const {
    getAssetById,
    getAssetDepreciationRecords,
    categories,
    departments,
    users,
    allocations,
    transfers,
    scraps,
    currentUser,
    createAllocation,
    createTransfer,
    createScrap,
  } = useAppStore();

  const asset = getAssetById(id!);
  const depreciationRecords = getAssetDepreciationRecords(id!);

  const category = useMemo(
    () => categories.find((c) => c.id === asset?.categoryId),
    [categories, asset]
  );

  const currentUserInfo = useMemo(
    () => users.find((u) => u.id === asset?.currentUserId),
    [users, asset]
  );

  const currentDepartment = useMemo(
    () => departments.find((d) => d.id === asset?.currentDepartmentId),
    [departments, asset]
  );

  const lifecycleEvents = useMemo(() => {
    const events: Array<{
      key: string;
      time: string;
      title: string;
      description: string;
      color: string;
      icon: React.ReactNode;
    }> = [];

    if (asset) {
      events.push({
        key: 'create',
        time: asset.createdAt,
        title: '资产入库',
        description: `资产编号：${asset.assetNo}，${asset.name} 已入库`,
        color: 'green',
        icon: <InboxOutlined />,
      });
    }

    allocations
      .filter((a) => a.assetId === id)
      .forEach((alloc) => {
        const user = users.find((u) => u.id === alloc.userId);
        const dept = departments.find((d) => d.id === alloc.departmentId);
        events.push({
          key: `alloc-${alloc.id}`,
          time: alloc.allocationDate,
          title: '资产分配',
          description: `分配给 ${dept?.name} - ${user?.name}，状态：${ALLOCATION_STATUS[alloc.status].label}`,
          color: ALLOCATION_STATUS[alloc.status].color,
          icon: <SendOutlined />,
        });
      });

    transfers
      .filter((t) => t.assetId === id)
      .forEach((transfer) => {
        const fromUser = users.find((u) => u.id === transfer.fromUserId);
        const toUser = users.find((u) => u.id === transfer.toUserId);
        events.push({
          key: `transfer-${transfer.id}`,
          time: transfer.applyDate,
          title: '资产调拨',
          description: `${fromUser?.name} → ${toUser?.name}，原因：${transfer.reason || '无'}，状态：${TRANSFER_STATUS[transfer.status].label}`,
          color: TRANSFER_STATUS[transfer.status].color,
          icon: <SwapOutlined />,
        });
      });

    scraps
      .filter((s) => s.assetId === id)
      .forEach((scrap) => {
        const applyUser = users.find((u) => u.id === scrap.applyUserId);
        events.push({
          key: `scrap-${scrap.id}`,
          time: scrap.applyDate,
          title: '资产报废',
          description: `申请人：${applyUser?.name}，原因：${scrap.reason}，状态：${SCRAP_STATUS[scrap.status].label}`,
          color: SCRAP_STATUS[scrap.status].color,
          icon: <StopOutlined />,
        });
      });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [id, asset, allocations, transfers, scraps, users, departments]);

  const depreciationColumns: ColumnsType<DepreciationRecord> = [
    {
      title: '期间',
      dataIndex: 'period',
      key: 'period',
      width: 120,
    },
    {
      title: '折旧方法',
      dataIndex: 'depreciationMethod',
      key: 'depreciationMethod',
      width: 140,
      render: (method) => DEPRECIATION_METHODS[method].label,
    },
    {
      title: '本月折旧',
      dataIndex: 'monthlyDepreciation',
      key: 'monthlyDepreciation',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '累计折旧',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '账面净值',
      dataIndex: 'bookValue',
      key: 'bookValue',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
  ];

  const handleDownloadQRCode = () => {
    if (!qrCodeRef.current || !asset) return;
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 256;
      canvas.height = 256;
      ctx!.fillStyle = 'white';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0, 256, 256);
      const link = document.createElement('a');
      link.download = `QRCode_${asset.assetNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('二维码下载成功');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrintQRCode = () => {
    if (!qrCodeRef.current || !asset) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    printWindow.document.write(`
      <html>
        <head>
          <title>${asset.assetNo} - 二维码</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; font-family: sans-serif; }
            .asset-info { text-align: center; margin-bottom: 20px; }
            .asset-no { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
            .asset-name { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="asset-info">
            <div class="asset-no">${asset.assetNo}</div>
            <div class="asset-name">${asset.name}</div>
          </div>
          ${svgData}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAllocateSubmit = async () => {
    try {
      const values = await allocateForm.validateFields();
      createAllocation(id!, values.userId, values.departmentId);
      message.success('分配成功');
      setAllocateModalOpen(false);
      allocateForm.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  const handleTransferSubmit = async () => {
    try {
      const values = await transferForm.validateFields();
      if (!currentUser?.id) {
        message.error('请先登录');
        return;
      }
      createTransfer(id!, currentUser.id, values.toUserId, values.reason);
      message.success('调拨申请已提交');
      setTransferModalOpen(false);
      transferForm.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  const handleScrapSubmit = async () => {
    try {
      const values = await scrapForm.validateFields();
      if (!currentUser?.id) {
        message.error('请先登录');
        return;
      }
      createScrap(id!, currentUser.id, values.reason);
      message.success('报废申请已提交');
      setScrapModalOpen(false);
      scrapForm.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  if (!asset) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12 text-gray-500">资产不存在或已被删除</div>
          <div className="text-center mt-4">
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const qrCodeValue = generateQRCodeData(asset.id, asset.assetNo);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')}>
            返回
          </Button>
          <h1 className="text-2xl font-bold m-0 inline-block">{asset.name}</h1>
          <Tag color={ASSET_STATUS[asset.status].color}>{ASSET_STATUS[asset.status].label}</Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card title="基本信息" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="资产编号">{asset.assetNo}</Descriptions.Item>
              <Descriptions.Item label="资产名称">{asset.name}</Descriptions.Item>
              <Descriptions.Item label="资产类别">{category?.name}</Descriptions.Item>
              <Descriptions.Item label="规格型号">{asset.specification || '-'}</Descriptions.Item>
              <Descriptions.Item label="生产厂家">{asset.manufacturer || '-'}</Descriptions.Item>
              <Descriptions.Item label="购置日期">{formatDate(asset.purchaseDate)}</Descriptions.Item>
              <Descriptions.Item label="存放位置">{asset.location || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="二维码" size="small" extra={
            <Space>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadQRCode}>
                下载
              </Button>
              <Button size="small" icon={<PrinterOutlined />} onClick={handlePrintQRCode}>
                打印
              </Button>
            </Space>
          }>
            <div className="flex flex-col items-center justify-center py-4" ref={qrCodeRef}>
              <QRCodeSVG value={qrCodeValue} size={160} level="M" includeMargin />
              <div className="mt-4 text-sm text-gray-600 font-medium">{asset.assetNo}</div>
              <div className="text-xs text-gray-400">{asset.name}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="财务信息" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="资产原值">{formatCurrency(asset.originalValue)}</Descriptions.Item>
              <Descriptions.Item label="预计残值">{formatCurrency(asset.residualValue)}</Descriptions.Item>
              <Descriptions.Item label="折旧方法">{DEPRECIATION_METHODS[asset.depreciationMethod].label}</Descriptions.Item>
              <Descriptions.Item label="使用年限">{asset.usefulLife} 个月</Descriptions.Item>
              <Descriptions.Item label="累计折旧">{formatCurrency(asset.accumulatedDepreciation)}</Descriptions.Item>
              <Descriptions.Item label="当前净值">{formatCurrency(asset.currentValue)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="使用信息" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="当前状态">
                <Tag color={ASSET_STATUS[asset.status].color}>
                  {ASSET_STATUS[asset.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="使用人">{currentUserInfo?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="所属部门">{currentDepartment?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(asset.createdAt)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Card
            size="small"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/assets/edit/${asset.id}`)}
                >
                  编辑
                </Button>
                <Button
                  icon={<UserOutlined />}
                  onClick={() => setAllocateModalOpen(true)}
                  disabled={asset.status === 'scrapped' || asset.status === 'lost'}
                >
                  分配
                </Button>
                <Button
                  icon={<SwapOutlined />}
                  onClick={() => setTransferModalOpen(true)}
                  disabled={asset.status === 'scrapped' || asset.status === 'lost' || asset.status === 'in-stock'}
                >
                  调拨
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setScrapModalOpen(true)}
                  disabled={asset.status === 'scrapped' || asset.status === 'lost'}
                >
                  报废
                </Button>
              </Space>
            }
          >
            <span className="font-medium">操作</span>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="生命周期" size="small">
            <Timeline
              mode="left"
              items={lifecycleEvents.map((event) => ({
                key: event.key,
                color: event.color,
                dot: event.icon,
                children: (
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500">{event.description}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(event.time)}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="折旧明细" size="small">
            <Table
              size="small"
              columns={depreciationColumns}
              dataSource={depreciationRecords}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
              }}
              scroll={{ y: 400 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="资产分配"
        open={allocateModalOpen}
        onOk={handleAllocateSubmit}
        onCancel={() => {
          setAllocateModalOpen(false);
          allocateForm.resetFields();
        }}
        okText="确认分配"
        cancelText="取消"
      >
        <Form form={allocateForm} layout="vertical">
          <Form.Item
            name="departmentId"
            label="所属部门"
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
          <Form.Item
            name="userId"
            label="使用人"
            rules={[{ required: true, message: '请选择使用人' }]}
          >
            <Select placeholder="请选择使用人">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资产调拨"
        open={transferModalOpen}
        onOk={handleTransferSubmit}
        onCancel={() => {
          setTransferModalOpen(false);
          transferForm.resetFields();
        }}
        okText="提交调拨"
        cancelText="取消"
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item
            name="toUserId"
            label="接收人"
            rules={[{ required: true, message: '请选择接收人' }]}
          >
            <Select placeholder="请选择接收人">
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.name}
                  </Option>
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
        onCancel={() => {
          setScrapModalOpen(false);
          scrapForm.resetFields();
        }}
        okText="提交报废"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <div className="mb-4 p-3 bg-orange-50 rounded text-orange-700 text-sm">
          报废后资产状态将变更为待审核，审核通过后资产将标记为已报废。此操作不可撤销，请谨慎操作。
        </div>
        <Form form={scrapForm} layout="vertical">
          <Form.Item
            name="reason"
            label="报废原因"
            rules={[{ required: true, message: '请输入报废原因' }]}
          >
            <TextArea rows={4} placeholder="请详细描述报废原因，如设备老化、损坏、维修成本过高等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetDetail;
