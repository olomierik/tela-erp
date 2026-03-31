import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

// Pages
import Dashboard from '@/pages/Dashboard';

// Finance
import Accounts        from '@/pages/finance/Accounts';
import Invoices        from '@/pages/finance/Invoices';
import Bills           from '@/pages/finance/Bills';
import Payments        from '@/pages/finance/Payments';
import FinanceReports  from '@/pages/finance/Reports';

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
import Products    from '@/pages/inventory/Products';
import Warehouses  from '@/pages/inventory/Warehouses';
import Stock       from '@/pages/inventory/Stock';
import Adjustments from '@/pages/inventory/Adjustments';

// HR & Payroll
import Employees   from '@/pages/hr/Employees';
import Payroll     from '@/pages/hr/Payroll';
import Leave       from '@/pages/hr/Leave';
import Recruitment from '@/pages/hr/Recruitment';

// Manufacturing
import MfgProducts      from '@/pages/manufacturing/Products';
import BOMs             from '@/pages/manufacturing/BOMs';
import ProductionOrders from '@/pages/manufacturing/ProductionOrders';

// Projects
import Projects    from '@/pages/projects/Projects';
import Tasks       from '@/pages/projects/Tasks';
import Timesheets  from '@/pages/projects/Timesheets';

// Assets
import AssetRegister from '@/pages/assets/AssetRegister';
import Depreciation  from '@/pages/assets/Depreciation';

// Top-level
import Reports  from '@/pages/Reports';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* Finance */}
            <Route path="/finance/accounts"  element={<Accounts />} />
            <Route path="/finance/invoices"  element={<Invoices />} />
            <Route path="/finance/bills"     element={<Bills />} />
            <Route path="/finance/payments"  element={<Payments />} />
            <Route path="/finance/reports"   element={<FinanceReports />} />

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
            <Route path="/inventory/products"    element={<Products />} />
            <Route path="/inventory/warehouses"  element={<Warehouses />} />
            <Route path="/inventory/stock"       element={<Stock />} />
            <Route path="/inventory/adjustments" element={<Adjustments />} />

            {/* HR & Payroll */}
            <Route path="/hr/employees"   element={<Employees />} />
            <Route path="/hr/payroll"     element={<Payroll />} />
            <Route path="/hr/leave"       element={<Leave />} />
            <Route path="/hr/recruitment" element={<Recruitment />} />

            {/* Manufacturing */}
            <Route path="/manufacturing/products"          element={<MfgProducts />} />
            <Route path="/manufacturing/boms"              element={<BOMs />} />
            <Route path="/manufacturing/production-orders" element={<ProductionOrders />} />

            {/* Projects */}
            <Route path="/projects/projects"   element={<Projects />} />
            <Route path="/projects/tasks"      element={<Tasks />} />
            <Route path="/projects/timesheets" element={<Timesheets />} />

            {/* Assets */}
            <Route path="/assets/register"     element={<AssetRegister />} />
            <Route path="/assets/depreciation" element={<Depreciation />} />

            {/* Top-level */}
            <Route path="/reports"  element={<Reports />} />
            <Route path="/settings" element={<Settings />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
}
