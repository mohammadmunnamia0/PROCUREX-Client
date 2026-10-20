import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiEdit2, FiEye, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";
import DataTable from "../../components/DataTable";
import { Avatar, EmptyState, PageHeader, SampleBadge, SearchInput, Stars, StatusBadge } from "../../components/ui";
import { SourceSelect } from "../../components/SampleNotice";
import { bySource } from "../../store/analytics";
import { useConfirm } from "../../components/ConfirmProvider";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { SUPPLIER_STATUSES } from "../../store/schema";
import { EMPTY_SUPPLIER_STATS, lookup, supplierStats } from "../../store/metrics";
import { formatPercent } from "../../utils/format";
import SupplierForm from "./SupplierForm";

export default function Suppliers() {
  const { data, actions } = useProcurement();
  const { money } = useFormatters();
  const confirm = useConfirm();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("all");
  const [editing, setEditing] = useState(params.get("new") ? "new" : null);

  const closeForm = () => {
    setEditing(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  const categories = useMemo(() => lookup(data.categories), [data.categories]);
  const stats = useMemo(() => supplierStats(data.purchaseOrders), [data.purchaseOrders]);
  const statOf = (id) => stats.get(id) || EMPTY_SUPPLIER_STATS;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bySource(data.suppliers, source).filter(
      (s) =>
        (!status || s.status === status) &&
        (!category || s.categoryId === category) &&
        (!q || [s.code, s.name, s.contactPerson, s.email, s.phone, s.city, s.country].some((v) => v && v.toLowerCase().includes(q)))
    );
  }, [data.suppliers, source, search, status, category]);

  async function remove(supplier) {
    const ok = await confirm({
      title: `Delete ${supplier.name}?`,
      message: "This permanently removes the supplier from this browser.",
      confirmLabel: "Delete supplier",
      danger: true,
    });
    if (!ok) return;
    const result = actions.deleteSupplier(supplier.id);
    if (result.ok) toast.success(`${supplier.name} deleted.`);
    else toast.error(result.error);
  }

  const filtered = search || status || category || source !== "all";
  const clearFilters = () => {
    setSource("all");
    setSearch("");
    setStatus("");
    setCategory("");
  };

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (s) => (
        <span className="nowrap">
          <strong>{s.code}</strong> <SampleBadge record={s} />
        </span>
      ),
    },
    {
      key: "name",
      header: "Supplier",
      render: (s) => (
        <div className="cell-with-avatar">
          <Avatar name={s.name} />
          <div className="cell-main">
            <Link to={`/admin/suppliers/${s.id}`}>{s.name}</Link>
            <span className="cell-sub">{[s.contactPerson, s.email].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (s) => categories.get(s.categoryId)?.name || "", render: (s) => categories.get(s.categoryId)?.name || <span className="muted">–</span> },
    { key: "leadTimeDays", header: "Lead time", align: "right", render: (s) => `${s.leadTimeDays} d` },
    { key: "rating", header: "Rating", render: (s) => <Stars rating={s.rating} /> },
    { key: "pos", header: "POs", align: "right", sortValue: (s) => statOf(s.id).poCount, render: (s) => statOf(s.id).poCount },
    { key: "spend", header: "Spend", align: "right", sortValue: (s) => statOf(s.id).committedSpend, render: (s) => money(statOf(s.id).committedSpend) },
    { key: "onTime", header: "On-time", align: "right", sortValue: (s) => statOf(s.id).onTimeRate, render: (s) => formatPercent(statOf(s.id).onTimeRate) },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: "actions-col",
      render: (s) => (
        <div className="row-actions">
          <Link to={`/admin/suppliers/${s.id}`} className="btn-icon" aria-label={`View ${s.name}`} title="View details">
            <FiEye />
          </Link>
          <button type="button" className="btn-icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`} title="Edit">
            <FiEdit2 />
          </button>
          <button type="button" className="btn-icon danger" onClick={() => remove(s)} aria-label={`Delete ${s.name}`} title="Delete">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Supplier master data and delivery performance."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <FiPlus /> Add supplier
          </button>
        }
      />
      <div className="card">
        {data.suppliers.length === 0 ? (
          <EmptyState icon={FiUsers} title="No suppliers yet" message="Add your first supplier to start raising purchase orders.">
            <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
              <FiPlus /> Add supplier
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, code, contact, email, city" />
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {SUPPLIER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
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
              {filtered && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              initialSort={{ key: "name", dir: "asc" }}
              caption="Suppliers"
              empty={
                <EmptyState icon={FiUsers} title="No suppliers match your filters">
                  <button type="button" className="btn btn-outline" onClick={clearFilters}>
                    Clear filters
                  </button>
                </EmptyState>
              }
            />
          </>
        )}
      </div>
      {editing && <SupplierForm supplier={editing === "new" ? null : editing} onClose={closeForm} />}
    </div>
  );
}
