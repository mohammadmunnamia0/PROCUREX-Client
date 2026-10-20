import { HashRouter, Link, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { ProcurementProvider } from "./store/ProcurementContext";
import Layout from "./components/Layout";
import { EmptyState } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ActivityLog from "./pages/ActivityLog";
import AdminHome from "./pages/admin/AdminHome";
import Requisitions from "./pages/admin/Requisitions";
import Approvals from "./pages/admin/Approvals";
import PurchaseOrders from "./pages/admin/PurchaseOrders";
import Suppliers from "./pages/admin/Suppliers";
import SupplierDetail from "./pages/admin/SupplierDetail";
import Categories from "./pages/admin/Categories";
import DataManagement from "./pages/admin/DataManagement";
import { FiCompass } from "react-icons/fi";

// HashRouter: refreshing any page works on every static host (SRS §0.4).
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <ProcurementProvider>
            <HashRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="activity" element={<ActivityLog />} />
                  <Route path="admin" element={<AdminHome />} />
                  <Route path="admin/requisitions" element={<Requisitions />} />
                  <Route path="admin/approvals" element={<Approvals />} />
                  <Route path="admin/purchase-orders" element={<PurchaseOrders />} />
                  <Route path="admin/suppliers" element={<Suppliers />} />
                  <Route path="admin/suppliers/:id" element={<SupplierDetail />} />
                  <Route path="admin/categories" element={<Categories />} />
                  <Route path="admin/data" element={<DataManagement />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </HashRouter>
          </ProcurementProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div className="card">
      <EmptyState icon={FiCompass} title="Page not found" message="The page you are looking for does not exist.">
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </EmptyState>
    </div>
  );
}
