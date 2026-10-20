// Read-only detail dialogs for requisitions and purchase orders.
import { Link } from "react-router-dom";
import Modal from "../../components/Modal";
import { DetailList, PriorityBadge, StatusBadge } from "../../components/ui";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { isOverdue, lineTotal, poAmounts, prTotal } from "../../store/records";
import { UNCATEGORIZED, UNKNOWN_SUPPLIER } from "../../store/metrics";
import { daysBetween, formatDate, formatDateTime, isValidDate, todayISO } from "../../utils/dates";
import { formatNumber } from "../../utils/format";

function ItemsTable({ items, money, footer }) {
  return (
    <div className="table-container">
      <table className="data-table compact">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col" className="num">Qty</th>
            <th scope="col" className="num">Unit price</th>
            <th scope="col" className="num">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.description}</td>
              <td className="num">
                {formatNumber(i.quantity)} {i.unit}
              </td>
              <td className="num">{money(i.unitPrice)}</td>
              <td className="num">{money(lineTotal(i))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>{footer}</tfoot>
      </table>
    </div>
  );
}

export function RequisitionView({ requisition: pr, onClose }) {
  const { data } = useProcurement();
  const { money } = useFormatters();
  const category = data.categories.find((c) => c.id === pr.categoryId);
  const pos = data.purchaseOrders.filter((p) => p.requisitionId === pr.id);

  return (
    <Modal title={`${pr.number} · ${pr.title}`} subtitle={<StatusBadge status={pr.status} />} size="lg" onClose={onClose} footer={<button type="button" className="btn btn-outline" onClick={onClose}>Close</button>}>
      <div className="grid-2 tight">
        <DetailList
          items={[
            ["Requested by", `${pr.requestedBy} (${pr.department})`],
            ["Category", category?.name || UNCATEGORIZED],
            ["Priority", <PriorityBadge key="p" priority={pr.priority} />],
            ["Request date", formatDate(pr.requestDate)],
            ["Required by", formatDate(pr.requiredDate)],
          ]}
        />
        <DetailList
          items={[
            [pr.status === "Rejected" ? "Rejected by" : "Approved by", pr.decisionBy],
            ["Decision date", pr.decisionDate ? formatDate(pr.decisionDate) : ""],
            ["Decision note", pr.decisionNote],
            ["Cancel reason", pr.cancelReason],
            ["Purchase orders", pos.length ? pos.map((p) => `${p.number} (${p.status})`).join(", ") : ""],
            ["Last updated", formatDateTime(pr.updatedAt)],
          ]}
        />
      </div>
      <h4 className="section-title">Items</h4>
      <ItemsTable
        items={pr.items}
        money={money}
        footer={
          <tr>
            <th scope="row" colSpan={3} className="num">Estimated total</th>
            <td className="num strong">{money(prTotal(pr))}</td>
          </tr>
        }
      />
      {(pr.justification || pr.notes) && (
        <DetailList items={[["Justification", pr.justification], ["Notes", pr.notes]]} />
      )}
    </Modal>
  );
}

export function PurchaseOrderView({ po, onClose }) {
  const { data } = useProcurement();
  const { money } = useFormatters();
  const today = todayISO();
  const supplier = data.suppliers.find((s) => s.id === po.supplierId);
  const category = data.categories.find((c) => c.id === po.categoryId);
  const pr = data.requisitions.find((r) => r.id === po.requisitionId);
  const a = poAmounts(po);

  let delivery = "";
  if (po.status === "Delivered" && isValidDate(po.actualDeliveryDate)) {
    const late = daysBetween(po.expectedDeliveryDate, po.actualDeliveryDate);
    delivery = `${formatDate(po.actualDeliveryDate)} · ${late <= 0 ? "on time" : `${late} days late`} · lead time ${daysBetween(po.orderDate, po.actualDeliveryDate)} days`;
  } else if (isOverdue(po, today)) {
    delivery = `Overdue by ${daysBetween(po.expectedDeliveryDate, today)} days`;
  }

  return (
    <Modal title={`${po.number} · ${supplier?.name || UNKNOWN_SUPPLIER}`} subtitle={<StatusBadge status={po.status} />} size="lg" onClose={onClose} footer={<button type="button" className="btn btn-outline" onClick={onClose}>Close</button>}>
      <div className="grid-2 tight">
        <DetailList
          items={[
            ["Supplier", supplier ? <Link key="s" to={`/admin/suppliers/${supplier.id}`} onClick={onClose}>{supplier.name}</Link> : UNKNOWN_SUPPLIER],
            ["Category", category?.name || UNCATEGORIZED],
            ["Requisition", pr ? `${pr.number} – ${pr.title}` : ""],
            ["Payment terms", po.paymentTerms],
            ["Approved by", po.approvedBy],
          ]}
        />
        <DetailList
          items={[
            ["Order date", formatDate(po.orderDate)],
            ["Expected delivery", formatDate(po.expectedDeliveryDate)],
            ["Delivery", delivery],
            ["Received by", po.receivedBy],
            ["Delivery notes", po.deliveryNotes],
            ["Cancel reason", po.cancelReason],
          ]}
        />
      </div>
      <h4 className="section-title">Items</h4>
      <ItemsTable
        items={po.items}
        money={money}
        footer={
          <>
            <tr>
              <th scope="row" colSpan={3} className="num">Subtotal</th>
              <td className="num">{money(a.subtotal)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3} className="num">Tax ({formatNumber(po.taxRate)}%)</th>
              <td className="num">{money(a.tax)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3} className="num">Shipping</th>
              <td className="num">{money(a.shipping)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3} className="num">Total</th>
              <td className="num strong">{money(a.total)}</td>
            </tr>
          </>
        }
      />
      {po.notes && <DetailList items={[["Notes", po.notes]]} />}
    </Modal>
  );
}
