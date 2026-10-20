import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiCheckCircle, FiEye, FiInfo, FiX } from "react-icons/fi";
import { EmptyState, PageHeader, PriorityBadge } from "../../components/ui";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { attentionItems, lookup, UNCATEGORIZED, UNKNOWN_SUPPLIER } from "../../store/metrics";
import { poTotal, prTotal } from "../../store/records";
import { formatDate, todayISO } from "../../utils/dates";
import { pluralize } from "../../utils/format";
import { PurchaseOrderView, RequisitionView } from "./RecordViews";
import { useWorkflow } from "./workflow";

const age = (days) => (days === 0 ? "today" : `${pluralize(days, "day")} ago`);

export default function Approvals() {
  const { data } = useProcurement();
  const { money } = useFormatters();
  const workflow = useWorkflow();
  const [viewing, setViewing] = useState(null);
  const today = todayISO();

  const { pendingPRs, pendingPOs } = useMemo(() => attentionItems(data, today), [data, today]);
  const categories = lookup(data.categories);
  const suppliers = lookup(data.suppliers);

  return (
    <div>
      <PageHeader title="Approvals" description="Requisitions and purchase orders waiting for a decision, oldest first." />

      <div className="alert alert-info">
        <FiInfo aria-hidden="true" />
        <span>
          Approver names are recorded for traceability. Because this app runs only in your browser, separation of duties (requester ≠ approver) is a business rule, not an enforced permission.
        </span>
      </div>

      <section className="card" aria-labelledby="pr-approvals">
        <div className="card-header">
          <h3 id="pr-approvals">Purchase requisitions ({pendingPRs.length})</h3>
          <Link to="/admin/requisitions" className="btn btn-sm btn-outline">
            All requisitions
          </Link>
        </div>
        {pendingPRs.length === 0 ? (
          <EmptyState icon={FiCheckCircle} title="No requisitions waiting" message="New requisitions appear here until they are approved or rejected." />
        ) : (
          <ul className="approval-list">
            {pendingPRs.map(({ pr, age: days }) => (
              <li key={pr.id} className="approval-item">
                <div className="approval-main">
                  <div className="approval-title">
                    <strong>{pr.number}</strong> {pr.title} <PriorityBadge priority={pr.priority} />
                  </div>
                  <p className="cell-sub">
                    {pr.requestedBy} · {pr.department} · {categories.get(pr.categoryId)?.name || UNCATEGORIZED} · requested {age(days)} · needed by {formatDate(pr.requiredDate)}
                  </p>
                </div>
                <div className="approval-amount">{money(prTotal(pr))}</div>
                <div className="row-actions">
                  <button type="button" className="btn-icon" onClick={() => setViewing({ pr })} aria-label={`View ${pr.number}`} title="View details">
                    <FiEye />
                  </button>
                  <button type="button" className="btn btn-sm btn-outline danger-text" onClick={() => workflow.rejectPR(pr)}>
                    <FiX /> Reject
                  </button>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => workflow.approvePR(pr)}>
                    <FiCheck /> Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="po-approvals">
        <div className="card-header">
          <h3 id="po-approvals">Purchase orders ({pendingPOs.length})</h3>
          <Link to="/admin/purchase-orders?status=Pending" className="btn btn-sm btn-outline">
            All purchase orders
          </Link>
        </div>
        {pendingPOs.length === 0 ? (
          <EmptyState icon={FiCheckCircle} title="No purchase orders waiting" message="Orders created without an approved requisition appear here for approval." />
        ) : (
          <ul className="approval-list">
            {pendingPOs.map(({ po, age: days }) => (
              <li key={po.id} className="approval-item">
                <div className="approval-main">
                  <div className="approval-title">
                    <strong>{po.number}</strong> {suppliers.get(po.supplierId)?.name || UNKNOWN_SUPPLIER}
                  </div>
                  <p className="cell-sub">
                    {categories.get(po.categoryId)?.name || UNCATEGORIZED} · {pluralize(po.items.length, "item")} · ordered {formatDate(po.orderDate)} ({age(days)}) · expected {formatDate(po.expectedDeliveryDate)}
                  </p>
                </div>
                <div className="approval-amount">{money(poTotal(po))}</div>
                <div className="row-actions">
                  <button type="button" className="btn-icon" onClick={() => setViewing({ po })} aria-label={`View ${po.number}`} title="View details">
                    <FiEye />
                  </button>
                  <button type="button" className="btn btn-sm btn-outline danger-text" onClick={() => workflow.rejectPO(po)}>
                    <FiX /> Reject
                  </button>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => workflow.approvePO(po)}>
                    <FiCheck /> Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewing?.pr && <RequisitionView requisition={viewing.pr} onClose={() => setViewing(null)} />}
      {viewing?.po && <PurchaseOrderView po={viewing.po} onClose={() => setViewing(null)} />}
      {workflow.element}
    </div>
  );
}
