import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import VendorList from "./pages/VendorList";
import VendorDetail from "./pages/VendorDetail";
import PRList from "./pages/PRList";
import PRForm from "./pages/PRForm";
import ApprovalList from "./pages/ApprovalList";
import POList from "./pages/POList";
import POForm from "./pages/POForm";
import GRNList from "./pages/GRNList";
import GRNForm from "./pages/GRNForm";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vendors" element={<VendorList />} />
                <Route path="/vendors/:id" element={<VendorDetail />} />
                <Route path="/purchase-requisitions" element={<PRList />} />
                <Route path="/purchase-requisitions/new" element={<PRForm />} />
                <Route path="/purchase-requisitions/:id/edit" element={<PRForm />} />
                <Route path="/approvals" element={<ApprovalList />} />
                <Route path="/purchase-orders" element={<POList />} />
                <Route path="/purchase-orders/new" element={<POForm />} />
                <Route path="/goods-receipts" element={<GRNList />} />
                <Route path="/goods-receipts/new" element={<GRNForm />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
