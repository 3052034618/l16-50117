import { Form, Input, Button, Card, message } from 'antd';
import { User, Lock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '@/store';
import { useEffect } from 'react';

interface LoginForm {
  username: string;
  password: string;
}

const validUsernames = ['admin', 'finance1', 'finance2', 'asset1', 'emp1', 'emp2', 'emp3', 'emp4'];

export default function Login() {
  const [form] = Form.useForm<LoginForm>();
  const navigate = useNavigate();
  const { login, currentUser, initData } = useAppStore();

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = (values: LoginForm) => {
    if (!validUsernames.includes(values.username)) {
      message.error('用户名不存在，请使用以下账号：admin, finance1, finance2, asset1, emp1-emp4');
      return;
    }

    const user = login(values.username);
    if (user) {
      message.success(`欢迎回来，${user.name}！`);
      navigate('/dashboard', { replace: true });
    } else {
      message.error('登录失败，请重试');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptLTYgMGg0djFoLTR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>

      <Card className="w-full max-w-md mx-4 relative z-10 shadow-2xl border-0 rounded-2xl overflow-hidden" styles={{ body: { padding: '40px 48px' } }}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">固定资产管理系统</h1>
          <p className="text-gray-500 text-sm">企业资产管理 · 高效便捷</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ username: '', password: '' }}
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<User className="w-4 h-4 text-gray-400" />}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-gray-400" />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              className="w-full h-11 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg shadow-blue-500/30"
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center mb-2">可用测试账号</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['admin', 'finance1', 'finance2', 'asset1', 'emp1', 'emp2', 'emp3', 'emp4'].map((user) => (
              <span
                key={user}
                className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                onClick={() => form.setFieldsValue({ username: user, password: '123456' })}
              >
                {user}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">密码：任意字符</p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">© 2026 固定资产管理系统 · 安全登录</p>
        </div>
      </Card>
    </div>
  );
}
