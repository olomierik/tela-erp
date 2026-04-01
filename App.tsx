import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import DashboardPage    from "@/pages/dashboard/DashboardPage";
import AIPage           from "@/pages/ai/AIPage";
import InvoicesPage     from "@/pages/invoices/InvoicesPage";
import CRMPipelinePage  from "@/pages/crm/CRMPipelinePage";
import InventoryPage    from "@/pages/inventory/InventoryPage";
import PayrollPage      from "@/pages/payroll/PayrollPage";

// Placeholder pages for modules not yet built
function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-bold mb-2">{name}</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        This module is being built. Check back soon — or ask Tela AI for a sneak peek!
      </p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Default redirect */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Core modules */}
              <Route path="dashboard"   element={<DashboardPage />} />
              <Route path="ai"          element={<AIPage />} />
              <Route path="invoices"    element={<InvoicesPage />} />

              {/* Accounting */}
              <Route path="accounting"              element={<ComingSoon name="Accounting" />} />
              <Route path="accounting/accounts"     element={<ComingSoon name="Chart of Accounts" />} />
              <Route path="accounting/journals"     element={<ComingSoon name="Journal Entries" />} />
              <Route path="accounting/bank"         element={<ComingSoon name="Bank Reconciliation" />} />
              <Route path="accounting/reports"      element={<ComingSoon name="Financial Reports" />} />

              {/* Inventory */}
              <Route path="inventory"              element={<InventoryPage />} />
              <Route path="inventory/products"     element={<InventoryPage />} />
              <Route path="inventory/moves"        element={<ComingSoon name="Stock Moves" />} />
              <Route path="inventory/warehouses"   element={<ComingSoon name="Warehouses" />} />

              {/* Purchasing */}
              <Route path="purchasing" element={<ComingSoon name="Purchasing" />} />

              {/* CRM */}
              <Route path="crm"          element={<CRMPipelinePage />} />
              <Route path="crm/pipeline" element={<CRMPipelinePage />} />
              <Route path="crm/contacts" element={<ComingSoon name="Contacts" />} />
              <Route path="crm/leads"    element={<ComingSoon name="Leads" />} />

              {/* HR & Payroll */}
              <Route path="payroll"            element={<PayrollPage />} />
              <Route path="payroll/employees"  element={<ComingSoon name="Employees" />} />
              <Route path="payroll/runs"       element={<PayrollPage />} />
              <Route path="payroll/calculator" element={<PayrollPage />} />

              {/* Other modules */}
              <Route path="projects"  element={<ComingSoon name="Projects" />} />
              <Route path="helpdesk"  element={<ComingSoon name="Helpdesk" />} />
              <Route path="analytics" element={<ComingSoon name="Analytics" />} />
              <Route path="settings"  element={<ComingSoon name="Settings" />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
