import { Link } from "react-router-dom";
import { FiCheckSquare, FiDatabase, FiFileText, FiPlus, FiShoppingCart, FiTag, FiUsers } from "react-icons/fi";
import { PageHeader } from "../../components/ui";
import { useProcurement } from "../../store/ProcurementContext";
import { isOverdue } from "../../store/records";
import { todayISO } from "../../utils/dates";
import { pluralize } from "../../utils/format";

export default function AdminHome() {
  const { data } = useProcurement();
  const today = todayISO();
  const count = (list, status) => list.filter((r) => r.status === status).length;
  const pendingPRs = count(data.requisitions, "Pending");
  const pendingPOs = count(data.purchaseOrders, "Pending");
  const overdue = data.purchaseOrders.filter((p) => isOverdue(p, today)).length;
  const records = data.suppliers.length + data.requisitions.length + data.purchaseOrders.length + data.categories.length;

  const modules = [
    {
      to: "/admin/requisitions",
      tone: "blue",
      icon: FiFileText,
      title: "Purchase Requisitions",
      text: "Internal purchase requests and their approval status.",
      big: data.requisitions.length,
      stat: `${pendingPRs} pending approval`,
      add: "/admin/requisitions?new=1",
      addLabel: "New requisition",
    },
    {
      to: "/admin/approvals",
      tone: "amber",
      icon: FiCheckSquare,
      title: "Approvals",
      text: "Approve or reject pending requisitions and orders.",
      big: pendingPRs + pendingPOs,
      stat: `${pluralize(pendingPRs, "requisition")} · ${pluralize(pendingPOs, "order")}`,
      highlight: pendingPRs + pendingPOs > 0,
    },
    {
      to: "/admin/purchase-orders",
      tone: "cyan",
      icon: FiShoppingCart,
      title: "Purchase Orders",
      text: "Orders, costs, delivery dates and status.",
      big: data.purchaseOrders.length,
      stat: `${count(data.purchaseOrders, "Ordered")} awaiting delivery${overdue ? ` · ${overdue} overdue` : ""}`,
      add: "/admin/purchase-orders?new=1",
      addLabel: "New order",
    },
    {
      to: "/admin/suppliers",
      tone: "green",
      icon: FiUsers,
      title: "Suppliers",
      text: "Supplier details, terms and delivery performance.",
      big: data.suppliers.length,
      stat: `${count(data.suppliers, "Active")} active`,
      add: "/admin/suppliers?new=1",
      addLabel: "Add supplier",
    },
    {
      to: "/admin/categories",
      tone: "violet",
      icon: FiTag,
      title: "Categories",
      text: "Procurement categories used for spend analysis.",
      big: data.categories.length,
      stat: "Used to group spend",
    },
    {
      to: "/admin/data",
      tone: "gray",
      icon: FiDatabase,
      title: "Data & Backup",
      text: "Settings, export, import, restore and reset.",
      big: records,
      stat: "Records in this browser",
    },
  ];

  return (
    <div>
      <PageHeader title="Admin Panel" description="Enter and manage procurement data. Every change updates the dashboard immediately." />
      <div className="module-grid">
        {modules.map((m) => (
          <div key={m.to} className={`module-card ${m.highlight ? "highlight" : ""}`}>
            <Link to={m.to} className="module-link">
              <span className={`module-icon kpi-icon ${m.tone}`} aria-hidden="true">
                <m.icon />
              </span>
              <span className="module-title">{m.title}</span>
              <span className="module-text">{m.text}</span>
              <span className="module-stat-big">{m.big}</span>
            </Link>
            <div className="module-footer">
              <span>{m.stat}</span>
              {m.add && (
                <Link to={m.add} className="btn btn-sm btn-outline">
                  <FiPlus /> {m.addLabel}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
