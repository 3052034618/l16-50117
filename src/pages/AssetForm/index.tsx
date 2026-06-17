import { useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, message, App } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import useAppStore from '@/store';
import { DEPRECIATION_METHODS } from '@/utils/constants';
import { formatCurrency } from '@/utils/helpers';
import type { DepreciationMethod } from '@/types';

interface FormValues {
  name: string;
  categoryId: string;
  specification?: string;
  manufacturer?: string;
  purchaseDate: Dayjs;
  originalValue: number;
  usefulLife: number;
  depreciationMethod: DepreciationMethod;
  residualRate: number;
  location?: string;
}

const AssetForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message: msg } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const { categories, addAsset, updateAsset, getAssetById } = useAppStore();

  const isEdit = !!id;

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ label: cat.name, value: cat.id })),
    [categories]
  );

  const depreciationOptions = useMemo(
    () => Object.values(DEPRECIATION_METHODS).map((m) => ({ label: m.label, value: m.value })),
    []
  );

  const originalValue = Form.useWatch('originalValue', form);
  const residualRate = Form.useWatch('residualRate', form);
  const categoryId = Form.useWatch('categoryId', form);

  const residualValue = useMemo(() => {
    if (originalValue && residualRate !== undefined) {
      return originalValue * residualRate;
    }
    return 0;
  }, [originalValue, residualRate]);

  useEffect(() => {
    if (categoryId) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        form.setFieldsValue({
          usefulLife: category.usefulLife,
          depreciationMethod: category.depreciationMethod,
          residualRate: category.residualRate,
        });
      }
    }
  }, [categoryId, categories, form]);

  useEffect(() => {
    if (isEdit && id) {
      const asset = getAssetById(id);
      if (asset) {
        form.setFieldsValue({
          name: asset.name,
          categoryId: asset.categoryId,
          specification: asset.specification,
          manufacturer: asset.manufacturer,
          purchaseDate: dayjs(asset.purchaseDate),
          originalValue: asset.originalValue,
          usefulLife: asset.usefulLife,
          depreciationMethod: asset.depreciationMethod,
          residualRate: asset.residualValue / asset.originalValue,
          location: asset.location,
        });
      } else {
        msg.error('资产不存在');
        navigate('/assets');
      }
    }
  }, [isEdit, id, getAssetById, form, msg, navigate]);

  const handleSubmit = async (values: FormValues) => {
    try {
      const assetData = {
        name: values.name,
        categoryId: values.categoryId,
        specification: values.specification,
        manufacturer: values.manufacturer,
        purchaseDate: values.purchaseDate.format('YYYY-MM-DD'),
        originalValue: values.originalValue,
        usefulLife: values.usefulLife,
        depreciationMethod: values.depreciationMethod,
        residualValue: values.originalValue * values.residualRate,
        status: 'in-stock' as const,
        location: values.location,
      };

      if (isEdit && id) {
        updateAsset(id, assetData);
        msg.success('资产更新成功');
        navigate(`/assets/${id}`);
      } else {
        const newAsset = addAsset(assetData);
        msg.success('资产创建成功');
        navigate(`/assets/${newAsset.id}`);
      }
    } catch (error) {
      msg.error((error as Error).message || '保存失败');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-3">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} type="text">
              返回
            </Button>
            <span>{isEdit ? '编辑资产' : '新增资产'}</span>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            residualRate: 0.05,
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="资产名称"
                rules={[{ required: true, message: '请输入资产名称' }]}
              >
                <Input placeholder="请输入资产名称" maxLength={100} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="categoryId"
                label="资产类别"
                rules={[{ required: true, message: '请选择资产类别' }]}
              >
                <Select placeholder="请选择资产类别" options={categoryOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item name="specification" label="规格型号">
                <Input placeholder="请输入规格型号" maxLength={100} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="manufacturer" label="生产厂家">
                <Input placeholder="请输入生产厂家" maxLength={100} showCount />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="purchaseDate"
                label="购置日期"
                rules={[{ required: true, message: '请选择购置日期' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="originalValue"
                label="原值（元）"
                rules={[
                  { required: true, message: '请输入原值' },
                  { type: 'number', min: 0.01, message: '原值必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入原值"
                  min={0.01}
                  precision={2}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="usefulLife"
                label="使用年限（月）"
                rules={[
                  { required: true, message: '请输入使用年限' },
                  { type: 'number', min: 1, message: '使用年限必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入使用年限"
                  min={1}
                  precision={0}
                  addonAfter="月"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="depreciationMethod"
                label="折旧方法"
                rules={[{ required: true, message: '请选择折旧方法' }]}
              >
                <Select placeholder="请选择折旧方法" options={depreciationOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="residualRate"
                label="残值率"
                rules={[
                  { required: true, message: '请输入残值率' },
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === null) {
                        return Promise.resolve();
                      }
                      const num = Number(value);
                      if (isNaN(num) || num < 0 || num > 1) {
                        return Promise.reject(new Error('残值率必须在0-1之间'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber<number>
                  style={{ width: '100%' }}
                  placeholder="请输入残值率"
                  step={0.01}
                  precision={4}
                  addonAfter="%"
                  formatter={(value) => (value !== undefined ? `${value * 100}` : '')}
                  parser={(value) => (value ? parseFloat(value) / 100 : 0)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="预计残值">
                <Input
                  readOnly
                  prefix={<CalculatorOutlined />}
                  value={formatCurrency(residualValue)}
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item name="location" label="存放位置">
                <Input placeholder="请输入存放位置" maxLength={200} showCount />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24} className="mt-6">
            <Col span={24}>
              <div className="flex justify-end gap-4">
                <Button size="large" onClick={handleBack}>
                  取消
                </Button>
                <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />}>
                  {isEdit ? '更新' : '保存'}
                </Button>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default AssetForm;
