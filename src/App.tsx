import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import Depreciation from './pages/Depreciation';
import Allocation from './pages/Allocation';
import Transfer from './pages/Transfer';
import Scrap from './pages/Scrap';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import FinanceVoucher from './pages/FinanceVoucher';
import Settings from './pages/Settings';
import Login from './pages/Login';
import useAppStore from './store';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppStore();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1e3a8a',
          colorSuccess: '#15803d',
          colorWarning: '#f97316',
          colorError: '#dc2626',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="assets" element={<AssetList />} />
              <Route path="assets/new" element={<AssetForm />} />
              <Route path="assets/:id" element={<AssetDetail />} />
              <Route path="assets/edit/:id" element={<AssetForm />} />
              <Route path="depreciation" element={<Depreciation />} />
              <Route path="allocation" element={<Allocation />} />
              <Route path="transfer" element={<Transfer />} />
              <Route path="scrap" element={<Scrap />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="finance-voucher" element={<FinanceVoucher />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
