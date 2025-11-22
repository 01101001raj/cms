import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import BackendStatusIndicator from './components/common/BackendStatusIndicator';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { Loader2 } from 'lucide-react';

// Statically import all page components
import LoginPage from './components/LoginPage';
import UpdatePasswordPage from './components/UpdatePasswordPage';
import PortalSelectionPage from './components/PortalSelectionPage';
import Invoice from './components/Invoice';
import DispatchNote from './components/DispatchNote';
import Dashboard from './components/Dashboard';
import DistributorOnboarding from './components/DistributorOnboarding';
import DistributorDetailsPage from './components/DistributorDetailsPage';
import PlaceOrder from './components/PlaceOrder';
import OrderHistory from './components/OrderHistory';
import CentralWalletPage from './components/CentralWalletPage';
import RechargeWallet from './components/RechargeWallet';
import ConfirmReturnsPage from './components/ConfirmReturnsPage';
import SalesPage from './components/SalesPage';
import CEOInsightsPage from './components/CEOInsightsPage';
import DistributorScorecardPage from './components/DistributorScorecardPage';
import CentralStockPage from './components/CentralStockPage';
import StoreStockPage from './components/StoreStockPage';
import ManageSKUs from './components/ManageSKUs';
import ManageSchemes from './components/ManageSchemes';
import ManagePriceTiers from './components/ManagePriceTiers';
import UserManagementPage from './components/UserManagement';
import StoreManagementPage from './components/StoreManagementPage';
import NotificationsPage from './components/NotificationsPage';
import SettingsPage from './components/SettingsPage';
import SchemeHistoryPage from './components/SchemeHistoryPage';
import SpecialAssignmentsPage from './components/SpecialAssignmentsPage';
import EWayBillPage from './components/EWayBillPage';
import CustomerStatementPage from './components/CustomerStatementPage';
import DebugPermissions from './components/DebugPermissions';

const LoadingFallback = () => (
    <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-contentSecondary">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p>Loading Page...</p>
        </div>
    </div>
);

// This component handles the initial redirection logic. It waits for the auth state
// to be resolved and then redirects the user to the appropriate page.
const RootRedirector = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  return currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
    <Routes>
      {/* Public routes that load instantly without any auth checks */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      {/* A special route to handle the root path ("/") */}
      <Route path="/" element={<RootRedirector />} />
      
      {/* All other routes are protected and require a user to be logged in */}
      <Route element={<ProtectedRoute />}>
        {/* Standalone protected routes (don't use the main Layout) */}
        <Route path="/select-portal" element={<PortalSelectionPage />} />
        <Route path="/invoice/:orderId" element={<Invoice />} />
        <Route path="/dispatch-note/:transferId" element={<DispatchNote />} />
        <Route path="/ewaybill/:orderId" element={<EWayBillPage />} />
        
        {/* Protected routes that render inside the main application Layout */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="distributors/new" element={<DistributorOnboarding />} />
          <Route path="distributors/:distributorId" element={<DistributorDetailsPage />} />
          <Route path="place-order" element={<PlaceOrder />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="wallet/central" element={<CentralWalletPage />} />
          <Route path="recharge-wallet" element={<RechargeWallet />} />
          <Route path="confirm-returns" element={<ConfirmReturnsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="ceo-insights" element={<CEOInsightsPage />} />
          <Route path="distributor-scorecard" element={<DistributorScorecardPage />} />
          <Route path="customer-statement" element={<CustomerStatementPage />} />
          <Route path="debug-permissions" element={<DebugPermissions />} />
          <Route path="stock/central" element={<CentralStockPage />} />
          <Route path="stock/store/:storeId?" element={<StoreStockPage />} />
          <Route path="products/manage" element={<ManageSKUs />} />
          <Route path="schemes/manage" element={<ManageSchemes />} />
          <Route path="schemes/history" element={<SchemeHistoryPage />} />
          <Route path="price-tiers/manage" element={<ManagePriceTiers />} />
          <Route path="special-assignments" element={<SpecialAssignmentsPage />} />
          <Route path="users/manage" element={<UserManagementPage />} />
          <Route path="stores/manage" element={<StoreManagementPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      
      {/* A final fallback to redirect any unknown paths to the root handler */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
);

const App: React.FC = () => {
  // Initialize session manager for automatic logout on inactivity
  useSessionManager();

  return (
    <div className="flex flex-col min-h-screen bg-background text-content font-sans">
      <BackendStatusIndicator />
      <AppRoutes />
    </div>
  );
};

export default App;