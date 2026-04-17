import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ModulesProvider } from "@/contexts/ModulesContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ConflictInbox from "./pages/ConflictInbox";
import Landing from "./pages/Landing";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Modules from "./pages/Modules";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import JoinInvite from "./pages/auth/JoinInvite";
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
import AppsStore from "./pages/AppsStore";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Fleet from "./pages/Fleet";
import Maintenance from "./pages/Maintenance";
import PointOfSale from "./pages/PointOfSale";
import Subscriptions from "./pages/Subscriptions";
import IndustryInsights from "./pages/IndustryInsights";
import Vouchers from "./pages/accounting/Vouchers";
import VoucherForm from "./pages/accounting/VoucherForm";
import LedgerView from "./pages/accounting/LedgerView";
import FinancialReports from "./pages/accounting/FinancialReports";
import Unsubscribe from "./pages/Unsubscribe";
import { initErrorMonitoring } from "@/lib/error-monitoring";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import ScrollButtons from "@/components/ui/ScrollButtons";
import TelemetryDashboard from "./pages/admin/TelemetryDashboard";
import { useTelemetry } from "@/lib/telemetry";
import TaxConsultant from "./pages/TaxConsultant";
import TaxCalendar from "./pages/TaxCalendar";
import TaxScenarios from "./pages/TaxScenarios";
import DeductionOptimizer from "./pages/DeductionOptimizer";
import TRAEFiling from "./pages/TRAEFiling";
import FilingAuditLog from "./pages/FilingAuditLog";
import AutomationExecutionLog from "./pages/AutomationExecutionLog";
import AnomalyAlerts from "./pages/AnomalyAlerts";

// Initialize error monitoring
initErrorMonitoring();

const queryClient = new QueryClient();

/** Placed inside BrowserRouter so useLocation is available. */
function TelemetryTracker() {
  useTelemetry();
  return null;
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <CurrencyProvider>
          <StoreProvider>
          <ModulesProvider>
          <NetworkStatusProvider>
          <SidebarProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TelemetryTracker />
            <WhatsAppButton />
            <ScrollButtons />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/modules" element={<Modules />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join/:inviteId" element={<JoinInvite />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/accounting/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
              <Route path="/accounting/vouchers/:id" element={<ProtectedRoute><VoucherForm /></ProtectedRoute>} />
              <Route path="/accounting/ledger" element={<ProtectedRoute><LedgerView /></ProtectedRoute>} />
              <Route path="/accounting/reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
              <Route path="/procurement" element={<ProtectedRoute><Procurement /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute><StockTransfers /></ProtectedRoute>} />
              <Route path="/online-store" element={<ProtectedRoute><OnlineStoreBuilder /></ProtectedRoute>} />
              <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/ai-cfo" element={<ProtectedRoute><AICFOAssistant /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><DocumentScanner /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute><FixedAssets /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute><AutomationBuilder /></ProtectedRoute>} />
              <Route path="/apps" element={<ProtectedRoute><AppsStore /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute><PointOfSale /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/industry-insights" element={<ProtectedRoute><IndustryInsights /></ProtectedRoute>} />
              <Route path="/conflicts" element={<ProtectedRoute><ConflictInbox /></ProtectedRoute>} />

              {/* Tax & Compliance routes */}
              <Route path="/tax-consultant" element={<ProtectedRoute><TaxConsultant /></ProtectedRoute>} />
              <Route path="/tax-calendar" element={<ProtectedRoute><TaxCalendar /></ProtectedRoute>} />
              <Route path="/tax-scenarios" element={<ProtectedRoute><TaxScenarios /></ProtectedRoute>} />
              <Route path="/deduction-optimizer" element={<ProtectedRoute><DeductionOptimizer /></ProtectedRoute>} />
              <Route path="/tra-filing" element={<ProtectedRoute><TRAEFiling /></ProtectedRoute>} />
              <Route path="/filing-audit-log" element={<ProtectedRoute><FilingAuditLog /></ProtectedRoute>} />

              {/* Automation routes */}
              <Route path="/automation-log" element={<ProtectedRoute><AutomationExecutionLog /></ProtectedRoute>} />
              <Route path="/anomaly-alerts" element={<ProtectedRoute><AnomalyAlerts /></ProtectedRoute>} />

              {/* Reseller-only route */}
              <Route path="/reseller" element={<ProtectedRoute requiredRole="reseller"><ResellerDashboard /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/settings/white-label" element={<ProtectedRoute><WhiteLabel /></ProtectedRoute>} />
              <Route path="/settings/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/settings/readiness" element={<ProtectedRoute><ProductionReadiness /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin/telemetry" element={<TelemetryDashboard />} />

              {/* Public storefront routes */}
              <Route path="/store/:slug" element={<StorefrontLayout />}>
                <Route index element={<StorefrontHome />} />
                <Route path="checkout" element={<StorefrontCheckout />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </SidebarProvider>
          </NetworkStatusProvider>
          </ModulesProvider>
          </StoreProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
