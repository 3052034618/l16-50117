import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Button, Space } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  CalculatorOutlined,
  UserSwitchOutlined,
  SwapOutlined,
  DeleteOutlined,
  BarcodeOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import useAppStore from '@/store';
import { USER_ROLES } from '@/utils/constants';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { key: '/dashboard', label: '首页仪表盘', icon: <DashboardOutlined /> },
  { key: '/assets', label: '资产管理', icon: <AppstoreOutlined /> },
  { key: '/depreciation', label: '折旧台账', icon: <CalculatorOutlined />, roles: ['admin', 'finance'] },
  { key: '/finance-voucher', label: '财务凭证', icon: <FileTextOutlined />, roles: ['admin', 'finance'] },
  { key: '/allocation', label: '资产分配', icon: <UserSwitchOutlined />, roles: ['admin', 'asset-manager'] },
  { key: '/transfer', label: '调拨管理', icon: <SwapOutlined /> },
  { key: '/scrap', label: '报废管理', icon: <DeleteOutlined /> },
  { key: '/inventory', label: '盘点管理', icon: <BarcodeOutlined />, roles: ['admin', 'asset-manager'] },
  { key: '/reports', label: '财务报表', icon: <BarcodeOutlined />, roles: ['admin', 'finance'] },
  { key: '/settings', label: '系统设置', icon: <SettingOutlined />, roles: ['admin'] },
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, initData } = useAppStore();

  useEffect(() => {
    initData();
  }, [initData]);

  const filteredMenuItems = menuItems.filter(
    item => !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <div className="flex items-center gap-2">
          <UserOutlined />
          <span>个人信息</span>
        </div>
      ),
    },
    {
      key: 'logout',
      label: (
        <div className="flex items-center gap-2">
          <LogoutOutlined />
          <span>退出登录</span>
        </div>
      ),
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} className="bg-slate-900">
        <div className="flex items-center justify-center h-16 border-b border-slate-700">
          <h1 className={`text-white font-bold transition-all ${collapsed ? 'text-lg' : 'text-xl'}`}>
            {collapsed ? 'FA' : '固定资产管理'}
          </h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredMenuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key),
          }))}
          className="border-r-0 mt-2"
        />
      </Sider>
      <Layout>
        <Header className="flex items-center justify-between px-6" style={{ background: colorBgContainer }}>
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!text-lg !w-10 !h-10"
            />
            <div className="text-lg font-semibold text-slate-700">
              企业固定资产全生命周期管理系统
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{currentUser.name}</span>
                    <span className="text-xs text-slate-500">
                      {USER_ROLES[currentUser.role]?.label}
                    </span>
                  </div>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content className="mx-6 my-6">
          <div
            className="min-h-full"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
