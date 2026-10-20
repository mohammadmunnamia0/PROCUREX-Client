import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiCheck, FiEdit2, FiEye, FiPackage, FiPlus, FiSend, FiShoppingCart, FiSlash, FiTrash2, FiX } from "react-icons/fi";
import DataTable from "../../components/DataTable";
import RowMenu from "../../components/RowMenu";
import { EmptyState, PageHeader, SampleBadge, SearchInput, StatusBadge, StatusChips } from "../../components/ui";
import { SourceSelect } from "../../components/SampleNotice";
import { bySource } from "../../store/analytics";
import { OTHER_COLOR, categoryColorMap } from "../../theme/palette";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { PO_STATUSES } from "../../store/schema";
import { isOverdue, poTotal } from "../../store/records";
import { lookup, UNCATEGORIZED, UNKNOWN_SUPPLIER } from "../../store/metrics";
import { daysBetween, formatDate, todayISO } from "../../utils/dates";
import PurchaseOrderForm from "./PurchaseOrderForm";
import { PurchaseOrderView } from "./RecordViews";
import { useWorkflow } from "./workflow";

/** Row action buttons, shared with the supplier detail page. */
/** Row actions, shared with the supplier detail page: next workflow step + Edit + "⋯" menu. */
export function PurchaseOrderActions({ po, workflow, onView, onEdit }) {
  return (
    <div className="row-actions">
      {po.status === "Pending" && (
        <button type="button" className="btn btn-sm btn-success" onClick={() => workflow.approvePO(po)}>
          <FiCheck /> Approve
        </button>
      )}
      {po.status === "Approved" && (
        <button type="button" className="btn btn-sm btn-primary" onClick={() => workflow.markOrdered(po)}>
          <FiSend /> Mark ordered
        </button>
      )}
      {po.status === "Ordered" && (
        <button type="button" className="btn btn-sm btn-success" onClick={() => workflow.markDelivered(po)}>
          <FiPackage /> Receive
        </button>
      )}
      <button type="button" className="btn-icon" onClick={() => onEdit(po)} aria-label={`Edit ${po.number}`} title="Edit">
        <FiEdit2 />
      </button>
      <RowMenu
        label={`More actions for ${po.number}`}
        items={[
          { label: "View details", icon: FiEye, onClick: () => onView(po) },
          { label: "Reject", icon: FiX, onClick: () => workflow.rejectPO(po), hidden: po.status !== "Pending" },
          { label: "Cancel order", icon: FiSlash, onClick: () => workflow.cancelPO(po), hidden: ["Delivered", "Cancelled"].includes(po.status) },
          { label: "Delete", icon: FiTrash2, onClick: () => workflow.deletePO(po), danger: true },
        ]}
      />
    </div>
  );
}

export function ExpectedDateCell({ po, today }) {
  if (isOverdue(po, today)) {
    return (
      <span className="overdue">
        {formatDate(po.expectedDeliveryDate)}
        <span className="badge badge-overdue">{daysBetween(po.expectedDeliveryDate, today)}d overdue</span>
      </span>
    );
  }
  return formatDate(po.expectedDeliveryDate);
}

export default function PurchaseOrders() {
  const { data } = useProcurement();
  const { money } = useFormatters();
  const workflow = useWorkflow();
  const [params, setParams] = useSearchParams();
  const today = todayISO();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(PO_STATUSES.includes(params.get("status")) ? params.get("status") : "");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(params.get("overdue") === "1");
  const [source, setSource] = useState("all");
  const [editing, setEditing] = useState(() => (params.get("new") || params.get("fromPr") ? "new" : null));
  const [preset, setPreset] = useState(() => ({ requisitionId: params.get("fromPr") || "", supplierId: params.get("supplier") || "" }));
  const [viewing, setViewing] = useState(null);

  const closeForm = () => {
    setEditing(null);
    setPreset({});
    if (params.get("new") || params.get("fromPr") || params.get("supplier")) setParams({}, { replace: true });
  };

  const suppliers = useMemo(() => lookup(data.suppliers), [data.suppliers]);
  const categories = useMemo(() => lookup(data.categories), [data.categories]);
  const categoryColors = useMemo(() => categoryColorMap(data.categories), [data.categories]);
  const prs = useMemo(() => lookup(data.requisitions), [data.requisitions]);
  const counts = useMemo(() => Object.fromEntries(PO_STATUSES.map((s) => [s, data.purchaseOrders.filter((p) => p.status === s).length])), [data.purchaseOrders]);
  const overdueCount = data.purchaseOrders.filter((p) => isOverdue(p, today)).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bySource(data.purchaseOrders, source).filter((p) => {
      if (status && p.status !== status) return false;
      if (supplier && p.supplierId !== supplier) return false;
      if (category && p.categoryId !== category) return false;
      if (overdueOnly && !isOverdue(p, today)) return false;
      if (!q) return true;
      const hay = [p.number, suppliers.get(p.supplierId)?.name, prs.get(p.requisitionId)?.number, ...p.items.map((i) => i.description)];
      return hay.some((v) => v && v.toLowerCase().includes(q));
    });
  }, [data.purchaseOrders, source, search, status, supplier, category, overdueOnly, suppliers, prs, today]);

  const filtered = search || status || supplier || category || overdueOnly || source !== "all";
  const clearFilters = () => {
    setSource("all");
    setSearch("");
    setStatus("");
    setSupplier("");
    setCategory("");
    setOverdueOnly(false);
  };

  const columns = [
    {
      key: "number",
      header: "PO #",
      render: (p) => (
        <span className="nowrap">
          <strong>{p.number}</strong> <SampleBadge record={p} />
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      sortValue: (p) => suppliers.get(p.supplierId)?.name || "",
      render: (p) => {
        const s = suppliers.get(p.supplierId);
        const pr = prs.get(p.requisitionId);
        return (
          <div className="cell-main">
            {s ? <Link to={`/admin/suppliers/${s.id}`}>{s.name}</Link> : <span className="muted">{UNKNOWN_SUPPLIER}</span>}
            <span className="cell-sub">
              {p.items.length} {p.items.length === 1 ? "item" : "items"}
              {pr ? ` · ${pr.number}` : ""}
            </span>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      sortValue: (p) => categories.get(p.categoryId)?.name || "",
      render: (p) => (
        <span className="cat-chip">
          <span className="seg-dot" style={{ background: categoryColors.get(p.categoryId) || OTHER_COLOR }} aria-hidden="true" />
          {categories.get(p.categoryId)?.name || UNCATEGORIZED}
        </span>
      ),
    },
    { key: "orderDate", header: "Ordered", className: "nowrap", render: (p) => formatDate(p.orderDate) },
    { key: "expectedDeliveryDate", header: "Expected", className: "nowrap", render: (p) => <ExpectedDateCell po={p} today={today} /> },
    { key: "total", header: "Total", align: "right", sortValue: poTotal, render: (p) => money(poTotal(p)) },
    { key: "status", header: "Status", sortValue: (p) => PO_STATUSES.indexOf(p.status), render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: "actions-col",
      render: (p) => <PurchaseOrderActions po={p} workflow={workflow} onView={setViewing} onEdit={setEditing} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Orders placed with suppliers. Track them from approval to delivery."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <FiPlus /> New purchase order
          </button>
        }
      />

      {data.purchaseOrders.length > 0 && <StatusChips statuses={PO_STATUSES} counts={counts} value={status} onChange={setStatus} />}

      <div className="card">
        {data.purchaseOrders.length === 0 ? (
          <EmptyState
            icon={FiShoppingCart}
            title="No purchase orders yet"
            message={
              data.suppliers.length === 0
                ? "Add a supplier first, then raise your first purchase order."
                : "Raise a purchase order directly, or create one from an approved requisition."
            }
          >
            {data.suppliers.length === 0 ? (
              <Link to="/admin/suppliers?new=1" className="btn btn-primary">
                <FiPlus /> Add supplier
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
                <FiPlus /> New purchase order
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search PO #, supplier, PR #, item" />
              <select className="form-control" value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Filter by supplier">
                <option value="">All suppliers</option>
                {data.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <SourceSelect value={source} onChange={setSource} data={data} />
              <label className="toggle">
                <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                Overdue only ({overdueCount})
              </label>
              {filtered && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              initialSort={{ key: "number", dir: "desc" }}
              caption="Purchase orders"
              rowClassName={(p) => (isOverdue(p, today) ? "row-overdue" : undefined)}
              empty={
                <EmptyState icon={FiShoppingCart} title="No purchase orders match your filters">
                  <button type="button" className="btn btn-outline" onClick={clearFilters}>
                    Clear filters
                  </button>
                </EmptyState>
              }
            />
          </>
        )}
      </div>

      {editing && <PurchaseOrderForm po={editing === "new" ? null : editing} preset={preset} onClose={closeForm} />}
      {viewing && <PurchaseOrderView po={data.purchaseOrders.find((p) => p.id === viewing.id) || viewing} onClose={() => setViewing(null)} />}
      {workflow.element}
    </div>
  );
}
