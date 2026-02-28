import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiCheckSquare,
  FiShoppingCart,
  FiPackage,
  FiBarChart2,
  FiClipboard,
} from "react-icons/fi";

const navItems = [
  { section: "Main" },
  { path: "/", icon: <FiHome />, label: "Dashboard" },
  { section: "Procurement" },
  { path: "/vendors", icon: <FiUsers />, label: "Vendors" },
  { path: "/purchase-requisitions", icon: <FiFileText />, label: "Purchase Requisitions" },
  { path: "/approvals", icon: <FiCheckSquare />, label: "Approvals" },
  { path: "/purchase-orders", icon: <FiShoppingCart />, label: "Purchase Orders" },
  { path: "/goods-receipts", icon: <FiPackage />, label: "Goods Receipts" },
  { section: "Analytics" },
  { path: "/reports", icon: <FiBarChart2 />, label: "Reports" },
  { path: "/audit-logs", icon: <FiClipboard />, label: "Audit Logs" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>PROCUREX</h1>
        <p>Procurement & Vendor Tracking</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item, i) =>
          item.section ? (
            <div className="nav-section" key={i}>
              {item.section}
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
