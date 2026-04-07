import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ModulesProvider } from '@/contexts/ModulesContext';

// Auth pages (no layout)
import Login          from '@/pages/auth/Login';
import Register       from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Pages
import Dashboard from '@/pages/Dashboard';

// Finance
import Accounts         from '@/pages/finance/Accounts';
import Invoices         from '@/pages/finance/Invoices';
import InvoiceForm      from '@/pages/finance/InvoiceForm';
import Bills            from '@/pages/finance/Bills';
import BillForm         from '@/pages/finance/BillForm';
import Payments         from '@/pages/finance/Payments';
import FinanceReports   from '@/pages/finance/Reports';
import AgingReport      from '@/pages/finance/AgingReport';
import Budgets          from '@/pages/finance/Budgets';
import TaxRates         from '@/pages/finance/TaxRates';
import JournalEntries   from '@/pages/finance/JournalEntries';
import JournalEntryForm from '@/pages/finance/JournalEntryForm';

// Sales & CRM
import Leads     from '@/pages/sales/Leads';
import Customers from '@/pages/sales/Customers';
import Quotes    from '@/pages/sales/Quotes';
import Orders    from '@/pages/sales/Orders';

// Procurement
import Vendors        from '@/pages/procurement/Vendors';
import PurchaseOrders from '@/pages/procurement/PurchaseOrders';
import GoodsReceipt   from '@/pages/procurement/GoodsReceipt';

// Inventory
import Products     from '@/pages/inventory/Products';
import Warehouses   from '@/pages/inventory/Warehouses';
import Stock        from '@/pages/inventory/Stock';
import Adjustments  from '@/pages/inventory/Adjustments';
import Transfers    from '@/pages/inventory/Transfers';
import ReorderRules from '@/pages/inventory/ReorderRules';

// HR & Payroll
import Employees   from '@/pages/hr/Employees';
import Payroll     from '@/pages/hr/Payroll';
import Leave       from '@/pages/hr/Leave';
import Recruitment from '@/pages/hr/Recruitment';
import Attendance  from '@/pages/hr/Attendance';
import Contracts   from '@/pages/hr/Contracts';

// Manufacturing
import MfgProducts      from '@/pages/manufacturing/Products';
import BOMs             from '@/pages/manufacturing/BOMs';
import ProductionOrders from '@/pages/manufacturing/ProductionOrders';
import WorkCenters      from '@/pages/manufacturing/WorkCenters';
import QualityChecks    from '@/pages/manufacturing/QualityChecks';

// Projects
import Projects   from '@/pages/projects/Projects';
import Tasks      from '@/pages/projects/Tasks';
import Timesheets from '@/pages/projects/Timesheets';

// Assets
import AssetRegister from '@/pages/assets/AssetRegister';
import Depreciation  from '@/pages/assets/Depreciation';

// Expenses
import Expenses from '@/pages/expenses/Expenses';

// Helpdesk
import Tickets from '@/pages/helpdesk/Tickets';

// Fleet
import Vehicles        from '@/pages/fleet/Vehicles';
import VehicleServices from '@/pages/fleet/VehicleServices';
import FuelLogs        from '@/pages/fleet/FuelLogs';

// Maintenance
import Equipment           from '@/pages/maintenance/Equipment';
import MaintenanceRequests from '@/pages/maintenance/Requests';

// Email Marketing
import MailingLists from '@/pages/marketing/MailingLists';
import Campaigns    from '@/pages/marketing/Campaigns';

// Subscriptions
import Plans         from '@/pages/subscriptions/Plans';
import Subscriptions from '@/pages/subscriptions/Subscriptions';

// Point of Sale
import PosSessions from '@/pages/pos/Sessions';
import PosOrders   from '@/pages/pos/Orders';

// Onboarding
import Onboarding from '@/pages/onboarding/Onboarding';

// Top-level
import Reports        from '@/pages/Reports';
import Settings       from '@/pages/Settings';
import ComponentsDemo from '@/pages/ComponentsDemo';

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        {/* Finance */}
        <Route path="/finance/accounts"                 element={<Accounts />} />
        <Route path="/finance/invoices"                 element={<Invoices />} />
        <Route path="/finance/invoices/new"             element={<InvoiceForm />} />
        <Route path="/finance/invoices/:id"             element={<InvoiceForm />} />
        <Route path="/finance/bills"                    element={<Bills />} />
        <Route path="/finance/bills/new"                element={<BillForm />} />
        <Route path="/finance/bills/:id"                element={<BillForm />} />
        <Route path="/finance/payments"                 element={<Payments />} />
        <Route path="/finance/reports"                  element={<FinanceReports />} />
        <Route path="/finance/reports/aging"            element={<AgingReport />} />
        <Route path="/finance/budgets"                  element={<Budgets />} />
        <Route path="/finance/tax-rates"                element={<TaxRates />} />
        <Route path="/finance/journal-entries"          element={<JournalEntries />} />
        <Route path="/finance/journal-entries/new"      element={<JournalEntryForm />} />
        <Route path="/finance/journal-entries/:id"      element={<JournalEntryForm />} />

        {/* Sales & CRM */}
        <Route path="/sales/leads"     element={<Leads />} />
        <Route path="/sales/customers" element={<Customers />} />
        <Route path="/sales/quotes"    element={<Quotes />} />
        <Route path="/sales/orders"    element={<Orders />} />

        {/* Procurement */}
        <Route path="/procurement/vendors"         element={<Vendors />} />
        <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/procurement/goods-receipt"   element={<GoodsReceipt />} />

        {/* Inventory */}
        <Route path="/inventory/products"      element={<Products />} />
        <Route path="/inventory/warehouses"    element={<Warehouses />} />
        <Route path="/inventory/stock"         element={<Stock />} />
        <Route path="/inventory/adjustments"   element={<Adjustments />} />
        <Route path="/inventory/transfers"     element={<Transfers />} />
        <Route path="/inventory/reorder-rules" element={<ReorderRules />} />

        {/* HR & Payroll */}
        <Route path="/hr/employees"   element={<Employees />} />
        <Route path="/hr/payroll"     element={<Payroll />} />
        <Route path="/hr/leave"       element={<Leave />} />
        <Route path="/hr/recruitment" element={<Recruitment />} />
        <Route path="/hr/attendance"  element={<Attendance />} />
        <Route path="/hr/contracts"   element={<Contracts />} />

        {/* Manufacturing */}
        <Route path="/manufacturing/products"          element={<MfgProducts />} />
        <Route path="/manufacturing/boms"              element={<BOMs />} />
        <Route path="/manufacturing/production-orders" element={<ProductionOrders />} />
        <Route path="/manufacturing/work-centers"      element={<WorkCenters />} />
        <Route path="/manufacturing/quality"           element={<QualityChecks />} />

        {/* Projects */}
        <Route path="/projects/projects"   element={<Projects />} />
        <Route path="/projects/tasks"      element={<Tasks />} />
        <Route path="/projects/timesheets" element={<Timesheets />} />

        {/* Assets */}
        <Route path="/assets/register"     element={<AssetRegister />} />
        <Route path="/assets/depreciation" element={<Depreciation />} />

        {/* Expenses */}
        <Route path="/expenses" element={<Expenses />} />

        {/* Helpdesk */}
        <Route path="/helpdesk" element={<Tickets />} />

        {/* Fleet */}
        <Route path="/fleet/vehicles"         element={<Vehicles />} />
        <Route path="/fleet/services"         element={<VehicleServices />} />
        <Route path="/fleet/fuel-logs"        element={<FuelLogs />} />

        {/* Maintenance */}
        <Route path="/maintenance/equipment" element={<Equipment />} />
        <Route path="/maintenance/requests"  element={<MaintenanceRequests />} />

        {/* Email Marketing */}
        <Route path="/marketing/mailing-lists" element={<MailingLists />} />
        <Route path="/marketing/campaigns"     element={<Campaigns />} />

        {/* Subscriptions */}
        <Route path="/subscriptions/plans"         element={<Plans />} />
        <Route path="/subscriptions/subscriptions" element={<Subscriptions />} />

        {/* Point of Sale */}
        <Route path="/pos/sessions" element={<PosSessions />} />
        <Route path="/pos/orders"   element={<PosOrders />} />

        {/* Top-level */}
        <Route path="/reports"         element={<Reports />} />
        <Route path="/settings"        element={<Settings />} />
        <Route path="/components/demo" element={<ComponentsDemo />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModulesProvider>
          <SidebarProvider>
            <BrowserRouter>
              <Toaster richColors position="top-right" />
              <Routes>
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/*"               element={<ProtectedApp />} />
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </ModulesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
