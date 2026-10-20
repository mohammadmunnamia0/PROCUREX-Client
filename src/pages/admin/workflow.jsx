// Status-change dialogs shared by the Requisitions, Purchase Orders, Approvals,
// Supplier detail and Dashboard pages.
import { useState } from "react";
import Modal from "../../components/Modal";
import { Field } from "../../components/ui";
import { useConfirm } from "../../components/ConfirmProvider";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { useFormatters } from "../../hooks/useFormatters";
import { poTotal, prTotal } from "../../store/records";
import { daysBetween, formatDate, isValidDate, todayISO } from "../../utils/dates";

export function useWorkflow() {
  const { actions } = useProcurement();
  const toast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);

  const report = (result, message) => {
    if (result.ok) toast.success(message);
    else if (!result.errors) toast.error(result.error);
    return result;
  };

  const api = {
    approvePR: (pr) => setDialog({ kind: "decide", entity: "pr", record: pr, decision: "Approved" }),
    rejectPR: (pr) => setDialog({ kind: "decide", entity: "pr", record: pr, decision: "Rejected" }),
    approvePO: (po) => setDialog({ kind: "decide", entity: "po", record: po, decision: "Approved" }),
    rejectPO: (po) => setDialog({ kind: "decide", entity: "po", record: po, decision: "Rejected" }),
    markDelivered: (po) => setDialog({ kind: "deliver", record: po }),
    cancelPR: (pr) => setDialog({ kind: "cancel", entity: "pr", record: pr }),
    cancelPO: (po) => setDialog({ kind: "cancel", entity: "po", record: po }),

    async markOrdered(po) {
      const ok = await confirm({
        title: `Mark ${po.number} as ordered?`,
        message: "Confirm that this purchase order has been sent to the supplier. It will then count as awaiting delivery.",
        confirmLabel: "Mark as ordered",
      });
      if (ok) report(actions.markOrdered(po.id), `${po.number} marked as ordered.`);
    },
    async deletePO(po) {
      const ok = await confirm({
        title: `Delete ${po.number}?`,
        message: "This permanently removes the purchase order from this browser. Dashboard figures will be recalculated.",
        confirmLabel: "Delete purchase order",
        danger: true,
      });
      if (ok) return report(actions.deletePurchaseOrder(po.id), `${po.number} deleted.`).ok;
      return false;
    },
    async deletePR(pr) {
      const ok = await confirm({
        title: `Delete ${pr.number}?`,
        message: "This permanently removes the requisition from this browser.",
        confirmLabel: "Delete requisition",
        danger: true,
      });
      if (ok) return report(actions.deleteRequisition(pr.id), `${pr.number} deleted.`).ok;
      return false;
    },
  };

  let element = null;
  if (dialog?.kind === "decide") element = <DecisionDialog {...dialog} onClose={close} report={report} />;
  if (dialog?.kind === "deliver") element = <DeliveryDialog po={dialog.record} onClose={close} report={report} />;
  if (dialog?.kind === "cancel") element = <CancelDialog {...dialog} onClose={close} report={report} />;

  return { ...api, element };
}

function DecisionDialog({ entity, record, decision, onClose, report }) {
  const { data, actions } = useProcurement();
  const { money } = useFormatters();
  const today = todayISO();
  const form = useFormState({ by: data.settings.userName, date: today, note: "" });
  const isPR = entity === "pr";
  const rejecting = decision === "Rejected";

  function submit() {
    const result = isPR
      ? actions.decideRequisition(record.id, decision, form.values)
      : rejecting
        ? actions.rejectPurchaseOrder(record.id, form.values)
        : actions.approvePurchaseOrder(record.id, form.values);
    if (result.errors) return form.showErrors(result.errors);
    report(result, `${record.number} ${rejecting ? (isPR ? "rejected" : "rejected and cancelled") : "approved"}.`);
    if (result.ok) onClose();
  }

  const supplier = !isPR && data.suppliers.find((s) => s.id === record.supplierId);
  return (
    <Modal
      title={`${rejecting ? "Reject" : "Approve"} ${record.number}`}
      subtitle={isPR ? `${record.title} · ${record.requestedBy}, ${record.department}` : `${supplier?.name || "Unknown supplier"}`}
      size="sm"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className={`btn ${rejecting ? "btn-danger" : "btn-success"}`}>
            {rejecting ? "Reject" : "Approve"}
          </button>
        </>
      )}
    >
      <p className="dialog-amount">
        {isPR ? "Estimated total" : "Order total"}: <strong>{money(isPR ? prTotal(record) : poTotal(record))}</strong>
      </p>
      {!isPR && rejecting && <p className="muted">Rejecting a purchase order cancels it. The reason is recorded on the order.</p>}
      <Field label="Approver name" id={form.fieldId("by")} required error={form.errors.by}>
        <input {...form.bind("by")} autoComplete="name" />
      </Field>
      {isPR && (
        <Field label="Decision date" id={form.fieldId("date")} required error={form.errors.date}>
          <input type="date" {...form.bind("date")} max={today} min={record.requestDate} />
        </Field>
      )}
      <Field label={rejecting ? "Reason for rejection" : "Note"} id={form.fieldId("note")} required={rejecting} error={form.errors.note}>
        <textarea {...form.bind("note")} rows={3} placeholder={rejecting ? "Explain why this request is rejected" : "Optional"} />
      </Field>
    </Modal>
  );
}

function DeliveryDialog({ po, onClose, report }) {
  const { data, actions } = useProcurement();
  const today = todayISO();
  const form = useFormState({ date: today, receivedBy: data.settings.userName, note: "" });
  const supplier = data.suppliers.find((s) => s.id === po.supplierId);

  let timing = null;
  if (isValidDate(form.values.date)) {
    const late = daysBetween(po.expectedDeliveryDate, form.values.date);
    timing = late <= 0 ? <span className="tone-good">On time{late < 0 ? ` (${-late} days early)` : ""}</span> : <span className="tone-bad">{late} days late</span>;
  }

  function submit() {
    const result = actions.markDelivered(po.id, form.values);
    if (result.errors) return form.showErrors(result.errors);
    report(result, `${po.number} marked as delivered.`);
    if (result.ok) onClose();
  }

  return (
    <Modal
      title={`Receive ${po.number}`}
      subtitle={supplier?.name || "Unknown supplier"}
      size="sm"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-success">
            Mark as delivered
          </button>
        </>
      )}
    >
      <p className="muted">
        Ordered {formatDate(po.orderDate)} · expected {formatDate(po.expectedDeliveryDate)}
      </p>
      <Field label="Actual delivery date" id={form.fieldId("date")} required error={form.errors.date} hint={timing}>
        <input type="date" {...form.bind("date")} min={po.orderDate} max={today} />
      </Field>
      <Field label="Received by" id={form.fieldId("receivedBy")} error={form.errors.receivedBy}>
        <input {...form.bind("receivedBy")} placeholder="e.g. Warehouse staff name" />
      </Field>
      <Field label="Delivery notes" id={form.fieldId("note")} error={form.errors.note}>
        <textarea {...form.bind("note")} rows={2} placeholder="Optional, e.g. condition of goods" />
      </Field>
    </Modal>
  );
}

function CancelDialog({ entity, record, onClose, report }) {
  const { actions } = useProcurement();
  const [reason, setReason] = useState("");
  const label = entity === "pr" ? "requisition" : "purchase order";

  function submit() {
    const result = entity === "pr" ? actions.cancelRequisition(record.id, reason) : actions.cancelPurchaseOrder(record.id, reason);
    report(result, `${record.number} cancelled.`);
    if (result.ok) onClose();
  }

  return (
    <Modal
      title={`Cancel ${record.number}?`}
      size="sm"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Keep {label}
          </button>
          <button type="submit" className="btn btn-danger">
            Cancel {label}
          </button>
        </>
      }
    >
      <p>
        The {label} will be marked as <strong>Cancelled</strong> and kept for reference.
        {entity === "po" && record.requisitionId ? " Its linked requisition becomes available for a new order." : ""}
      </p>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label htmlFor="cancel-reason">Reason (optional)</label>
        <textarea id="cancel-reason" className="form-control" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}
