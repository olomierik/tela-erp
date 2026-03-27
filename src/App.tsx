import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { StoreProvider } from "@/contexts/StoreContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Production from "./pages/Production";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Marketing from "./pages/Marketing";
import Accounting from "./pages/Accounting";
import Procurement from "./pages/Procurement";
import Stores from "./pages/Stores";
import OnlineStoreBuilder from "./pages/OnlineStoreBuilder";
import StorefrontLayout from "./pages/storefront/StorefrontLayout";
import StorefrontHome from "./pages/storefront/StorefrontHome";
import StorefrontCheckout from "./pages/storefront/StorefrontCheckout";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import StockTransfers from "./pages/StockTransfers";
import ResellerDashboard from "./pages/ResellerDashboard";
import WhiteLabel from "./pages/WhiteLabel";
import Team from "./pages/Team";
import SettingsPage from "./pages/Settings";
import ProductionReadiness from "./pages/ProductionReadiness";
import NotFound from "./pages/NotFound";
import Billing from "./pages/Billing";
import HR from "./pages/HR";
import CRM from "./pages/CRM";
import Invoices from "./pages/Invoices";
import Projects from "./pages/Projects";
import AICFOAssistant from "./pages/AICFOAssistant";
import DocumentScanner from "./pages/DocumentScanner";
import FixedAssets from "./pages/FixedAssets";
import Expenses from "./pages/Expenses";
import Budgets from "./pages/Budgets";
import AutomationBuilder from "./pages/AutomationBuilder";
import Profile from "./pages/Profile";
import { initErrorMonitoring } from "@/lib/error-monitoring";

// Initialize error monitoring
initErrorMonitoring();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <CurrencyProvider>
          <StoreProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/procurement" element={<ProtectedRoute><Procurement /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute><StockTransfers /></ProtectedRoute>} />
              <Route path="/online-store" element={<ProtectedRoute><OnlineStoreBuilder /></ProtectedRoute>} />
              <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

              {/* New module routes */}
              <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />

              {/* Enterprise & AI routes */}
              <Route path="/ai-cfo" element={<ProtectedRoute><AICFOAssistant /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><DocumentScanner /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute><FixedAssets /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute><AutomationBuilder /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Reseller-only route */}
              <Route path="/reseller" element={<ProtectedRoute requiredRole="reseller"><ResellerDashboard /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/settings/white-label" element={<ProtectedRoute><WhiteLabel /></ProtectedRoute>} />
              <Route path="/settings/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/settings/readiness" element={<ProtectedRoute><ProductionReadiness /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Public storefront routes */}
              <Route path="/store/:slug" element={<StorefrontLayout />}>
                <Route index element={<StorefrontHome />} />
                <Route path="checkout" element={<StorefrontCheckout />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </StoreProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
