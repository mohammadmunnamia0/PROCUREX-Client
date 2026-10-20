import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiCheck, FiEdit2, FiEye, FiFileText, FiPlus, FiSlash, FiTrash2, FiX } from "react-icons/fi";
import DataTable from "../../components/DataTable";
import RowMenu from "../../components/RowMenu";
import { EmptyState, PageHeader, PriorityBadge, SearchInput, StatusBadge, StatusChips } from "../../components/ui";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { EDITABLE_PR_STATUSES, PRIORITIES, PR_STATUSES } from "../../store/schema";
import { prTotal } from "../../store/records";
import { lookup, UNCATEGORIZED } from "../../store/metrics";
import { formatDate, todayISO } from "../../utils/dates";
import RequisitionForm from "./RequisitionForm";
import { RequisitionView } from "./RecordViews";
import { useWorkflow } from "./workflow";

export default function Requisitions() {
  const { data } = useProcurement();
  const { money } = useFormatters();
  const navigate = useNavigate();
  const workflow = useWorkflow();
  const [params, setParams] = useSearchParams();
  const today = todayISO();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(PR_STATUSES.includes(params.get("status")) ? params.get("status") : "");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState(params.get("new") ? "new" : null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => {
    setEditing(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  const categories = useMemo(() => lookup(data.categories), [data.categories]);
  const counts = useMemo(() => Object.fromEntries(PR_STATUSES.map((s) => [s, data.requisitions.filter((r) => r.status === s).length])), [data.requisitions]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.requisitions.filter(
      (r) =>
        (!status || r.status === status) &&
        (!category || r.categoryId === category) &&
        (!priority || r.priority === priority) &&
        (!q || [r.number, r.title, r.requestedBy, r.department].some((v) => v.toLowerCase().includes(q)))
    );
  }, [data.requisitions, search, status, category, priority]);

  const filtered = search || status || category || priority;
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPriority("");
  };

  const columns = [
    { key: "number", header: "PR #", render: (r) => <strong>{r.number}</strong> },
    {
      key: "title",
      header: "Title",
      render: (r) => (
        <div className="cell-main">
          <span>{r.title}</span>
          <span className="cell-sub">
            {r.requestedBy} · {r.department}
          </span>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (r) => categories.get(r.categoryId)?.name || "", render: (r) => categories.get(r.categoryId)?.name || UNCATEGORIZED },
    {
      key: "requiredDate",
      header: "Required by",
      className: "nowrap",
      render: (r) => (
        <span className={["Pending", "Approved"].includes(r.status) && r.requiredDate < today ? "tone-bad" : ""}>{formatDate(r.requiredDate)}</span>
      ),
    },
    { key: "priority", header: "Priority", sortValue: (r) => PRIORITIES.indexOf(r.priority), render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: "total", header: "Est. total", align: "right", sortValue: prTotal, render: (r) => money(prTotal(r)) },
    { key: "status", header: "Status", sortValue: (r) => PR_STATUSES.indexOf(r.status), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: "actions-col",
      render: (r) => (
        <div className="row-actions">
          {r.status === "Pending" && (
            <button type="button" className="btn btn-sm btn-success" onClick={() => workflow.approvePR(r)}>
              <FiCheck /> Approve
            </button>
          )}
          {r.status === "Approved" && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/purchase-orders?fromPr=${r.id}`)}>
              Create PO
            </button>
          )}
          {EDITABLE_PR_STATUSES.includes(r.status) && (
            <button type="button" className="btn-icon" onClick={() => setEditing(r)} aria-label={`Edit ${r.number}`} title={r.status === "Rejected" ? "Edit & resubmit" : "Edit"}>
              <FiEdit2 />
            </button>
          )}
          <RowMenu
            label={`More actions for ${r.number}`}
            items={[
              { label: "View details", icon: FiEye, onClick: () => setViewing(r) },
              { label: "Reject", icon: FiX, onClick: () => workflow.rejectPR(r), hidden: r.status !== "Pending" },
              { label: "Cancel requisition", icon: FiSlash, onClick: () => workflow.cancelPR(r), hidden: !["Pending", "Approved"].includes(r.status) },
              { label: "Delete", icon: FiTrash2, onClick: () => workflow.deletePR(r), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Requisitions"
        description="Internal requests to buy goods or services. New requisitions wait for approval before a purchase order is raised."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <FiPlus /> New requisition
          </button>
        }
      />

      {data.requisitions.length > 0 && <StatusChips statuses={PR_STATUSES} counts={counts} value={status} onChange={setStatus} />}

      <div className="card">
        {data.requisitions.length === 0 ? (
          <EmptyState icon={FiFileText} title="No requisitions yet" message="Create the first purchase requisition. It will appear in the approval queue and on the dashboard.">
            <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
              <FiPlus /> New requisition
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search PR #, title, requester, department" />
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
                <option value="">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
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
              caption="Purchase requisitions"
              empty={
                <EmptyState icon={FiFileText} title="No requisitions match your filters">
                  <button type="button" className="btn btn-outline" onClick={clearFilters}>
                    Clear filters
                  </button>
                </EmptyState>
              }
            />
          </>
        )}
      </div>

      {editing && <RequisitionForm requisition={editing === "new" ? null : editing} onClose={closeForm} />}
      {viewing && <RequisitionView requisition={data.requisitions.find((r) => r.id === viewing.id) || viewing} onClose={() => setViewing(null)} />}
      {workflow.element}
    </div>
  );
}
