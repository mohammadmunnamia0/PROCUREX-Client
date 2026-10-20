import { Link, NavLink } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiBox,
  FiCheckSquare,
  FiDatabase,
  FiFileText,
  FiGrid,
  FiHome,
  FiSettings,
  FiShoppingCart,
  FiTag,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useProcurement } from "../store/ProcurementContext";
import SaveStatus from "./SaveStatus";
import { initials } from "./ui";

const NAV = [
  { section: "Overview" },
  { path: "/", icon: FiHome, label: "Dashboard", end: true },
  { path: "/reports", icon: FiBarChart2, label: "Reports" },
  { path: "/activity", icon: FiActivity, label: "Activity Log" },
  { section: "Admin Panel" },
  { path: "/admin", icon: FiGrid, label: "Admin Overview", end: true },
  { path: "/admin/requisitions", icon: FiFileText, label: "Purchase Requisitions" },
  { path: "/admin/approvals", icon: FiCheckSquare, label: "Approvals", badge: "pending" },
  { path: "/admin/purchase-orders", icon: FiShoppingCart, label: "Purchase Orders" },
  { path: "/admin/suppliers", icon: FiUsers, label: "Suppliers" },
  { path: "/admin/categories", icon: FiTag, label: "Categories" },
  { path: "/admin/data", icon: FiDatabase, label: "Data & Backup" },
];

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <FiBox />
    </span>
  );
}

export default function Sidebar({ open, onClose }) {
  const { data } = useProcurement();
  const { organizationName, userName } = data.settings;
  const pending =
    data.requisitions.filter((r) => r.status === "Pending").length + data.purchaseOrders.filter((p) => p.status === "Pending").length;

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>PROCUREX</h1>
            <p>Procurement suite</p>
          </div>
        </div>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu">
          <FiX />
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) =>
          item.section ? (
            <div className="nav-section" key={item.section}>
              {item.section}
            </div>
          ) : (
            <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={onClose}>
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge === "pending" && pending > 0 && (
                <span className="nav-badge" aria-label={`${pending} pending`}>
                  {pending}
                </span>
              )}
            </NavLink>
          )
        )}
      </nav>
      <div className="sidebar-footer">
        <SaveStatus />
        <Link to="/admin/data" className="user-card" onClick={onClose} title="Settings">
          <span className="avatar gradient" aria-hidden="true">
            {initials(userName || organizationName)}
          </span>
          <span className="user-meta">
            <strong>{userName || "Set your name"}</strong>
            <span>{organizationName}</span>
          </span>
          <FiSettings aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
