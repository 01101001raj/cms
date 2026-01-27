import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useSessionManager } from './hooks/useSessionManager';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

// Protected Route Wrapper
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load all page components
const Layout = lazy(() => import('./components/Layout'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const UpdatePasswordPage = lazy(() => import('./components/UpdatePasswordPage'));
const PortalSelectionPage = lazy(() => import('./components/PortalSelectionPage'));
const Invoice = lazy(() => import('./components/Invoice'));
const DispatchNote = lazy(() => import('./components/DispatchNote'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const DistributorOnboarding = lazy(() => import('./components/DistributorOnboarding'));
const DistributorDetailsPage = lazy(() => import('./components/DistributorDetailsPage'));
const PlaceOrder = lazy(() => import('./components/PlaceOrder'));
const OrderHistory = lazy(() => import('./components/OrderHistory'));
const CentralWalletPage = lazy(() => import('./components/CentralWalletPage'));
const RechargeWallet = lazy(() => import('./components/RechargeWallet'));
const ConfirmReturnsPage = lazy(() => import('./components/ConfirmReturnsPage'));
const SalesPage = lazy(() => import('./components/SalesPage'));
const CEOInsightsPage = lazy(() => import('./components/CEOInsightsPage'));
const DistributorScorecardPage = lazy(() => import('./components/DistributorScorecardPage'));
const DistributorLeaderboard = lazy(() => import('./components/DistributorLeaderboard'));
const CentralStockPage = lazy(() => import('./components/CentralStockPage'));
const StoreStockPage = lazy(() => import('./components/StoreStockPage'));
const ProductManagement = lazy(() => import('./components/ProductManagement'));
const ManageSchemes = lazy(() => import('./components/ManageSchemes'));
const ManagePriceTiers = lazy(() => import('./components/ManagePriceTiers'));
const UserManagementPage = lazy(() => import('./components/UserManagement'));
const StoreManagementPage = lazy(() => import('./components/StoreManagementPage'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SchemeHistoryPage = lazy(() => import('./components/SchemeHistoryPage'));
const SpecialAssignmentsPage = lazy(() => import('./components/SpecialAssignmentsPage'));
const EWayBillPage = lazy(() => import('./components/EWayBillPage'));
const CustomerStatementPage = lazy(() => import('./components/CustomerStatementPage'));
const DistributorsPage = lazy(() => import('./components/DistributorsPage'));
const AuditLogPage = lazy(() => import('./components/AuditLogPage'));
const ReturnsPage = lazy(() => import('./components/ReturnsPage'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4 text-contentSecondary">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p>Loading...</p>
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
  <Suspense fallback={<LoadingFallback />}>
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/distributors" element={<DistributorsPage />} />
          <Route path="/distributors/new" element={<DistributorOnboarding />} />
          <Route path="/distributors/:distributorId" element={<DistributorDetailsPage />} />
          <Route path="/place-order" element={<PlaceOrder />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/wallet/central" element={<CentralWalletPage />} />
          <Route path="/recharge-wallet" element={<RechargeWallet />} />
          <Route path="/confirm-returns" element={<ConfirmReturnsPage />} />
          <Route path="/customer-statement" element={<CustomerStatementPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/ceo-insights" element={<CEOInsightsPage />} />
          <Route path="/distributor-scorecard" element={<DistributorScorecardPage />} />
          <Route path="/distributor-leaderboard" element={<DistributorLeaderboard />} />
          <Route path="/stock/central" element={<CentralStockPage />} />
          <Route path="/stock/store/:storeId?" element={<StoreStockPage />} />
          <Route path="/products/manage" element={<ProductManagement />} />
          <Route path="/schemes/manage" element={<ManageSchemes />} />
          <Route path="/schemes/history" element={<SchemeHistoryPage />} />
          <Route path="/price-tiers/manage" element={<ManagePriceTiers />} />
          <Route path="/special-assignments" element={<SpecialAssignmentsPage />} />
          <Route path="/users/manage" element={<UserManagementPage />} />
          <Route path="/stores/manage" element={<StoreManagementPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
        </Route>
      </Route>

      {/* A final fallback to redirect any unknown paths to the root handler */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

// Create a global client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 15 * 60 * 1000, // Keep unused data for 15 minutes (renamed from cacheTime in v5)
      refetchOnWindowFocus: false, // Don't refetch on tab switch (saves data)
    },
  },
});

const App: React.FC = () => {
  // Initialize session manager for session persistence and beforeunload warning
  useSessionManager();

  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <div className="flex flex-col min-h-screen bg-background text-content font-sans">
            <AppRoutes />
          </div>
          <Toaster />
        </QueryClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;