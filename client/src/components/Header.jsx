import { useAuth } from "@/context/AuthContext.jsx";
import { useLocation } from "react-router-dom";
import { FiMenu } from "react-icons/fi";

const pageTitles = {
  "/": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/customers": "Customers",
  "/orders": "Orders",
  "/fulfillment": "Fulfillment",
  "/reconciliation": "Stock Reconciliation",
  "/stock-movements": "Stock Movements",
  "/users": "User Management",
};

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const getTitle = () => {
    if (location.pathname.startsWith("/orders/")) return "Order Details";
    return pageTitles[location.pathname] || "ORDERFLOW";
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          <FiMenu size={20} />
        </button>
        <h1 className="header-title">{getTitle()}</h1>
      </div>
      <div className="header-right">
        <div className="header-meta">
          <span className="local-badge">Local Mode</span>
          <span className="header-date">{todayLabel}</span>
        </div>
        <div className="header-user">
          <span>{user?.name}</span>
          <span className="role-badge">{user?.role}</span>
        </div>
        <button className="btn-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
