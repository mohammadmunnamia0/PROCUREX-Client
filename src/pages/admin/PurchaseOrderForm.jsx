import { useRef } from "react";
import { Link } from "react-router-dom";
import Modal from "../../components/Modal";
import LineItemsEditor, { emptyItem } from "../../components/LineItemsEditor";
import { Field } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { useFormatters } from "../../hooks/useFormatters";
import { PAYMENT_TERMS, PO_STATUSES } from "../../store/schema";
import { poAmounts, prTotal } from "../../store/records";
import { addDays, isValidDate, todayISO } from "../../utils/dates";
import { createId } from "../../utils/id";

const toFormItems = (items) => items.map((i) => ({ ...i, quantity: String(i.quantity), unitPrice: String(i.unitPrice) }));
const copyItems = (items) => items.map((i) => ({ ...i, id: createId(), quantity: String(i.quantity), unitPrice: String(i.unitPrice) }));

function initialValues(po, preset, data, today) {
  if (po) {
    return { ...po, items: toFormItems(po.items), taxRate: String(po.taxRate), shippingCost: String(po.shippingCost) };
  }
  const supplier = data.suppliers.find((s) => s.id === preset.supplierId && s.status === "Active");
  const pr = data.requisitions.find((r) => r.id === preset.requisitionId && r.status === "Approved");
  return {
    requisitionId: pr?.id || "",
    supplierId: supplier?.id || "",
    categoryId: pr?.categoryId || supplier?.categoryId || "",
    orderDate: today,
    expectedDeliveryDate: addDays(today, supplier ? supplier.leadTimeDays : 7),
    actualDeliveryDate: "",
    paymentTerms: supplier?.paymentTerms || "Net 30",
    items: pr ? copyItems(pr.items) : [emptyItem()],
    taxRate: "0",
    shippingCost: "0",
    status: pr ? "Approved" : "Pending",
    receivedBy: "",
    deliveryNotes: "",
    cancelReason: "",
    notes: pr ? `Raised from ${pr.number}: ${pr.title}` : "",
  };
}

export default function PurchaseOrderForm({ po, preset = {}, onClose }) {
  const { data, actions } = useProcurement();
  const { money } = useFormatters();
  const toast = useToast();
  const today = todayISO();
  const editing = Boolean(po);
  const form = useFormState(() => initialValues(po, preset, data, today));
  const { values, errors, bind, fieldId, setValues, clearError } = form;
  const expectedTouched = useRef(editing);

  const supplierOptions = data.suppliers.filter((s) => s.status === "Active" || s.id === po?.supplierId);
  const linkedElsewhere = new Set(
    data.purchaseOrders.filter((p) => p.id !== po?.id && p.requisitionId && p.status !== "Cancelled").map((p) => p.requisitionId)
  );
  const prOptions = data.requisitions.filter(
    (r) => r.id === po?.requisitionId || (r.status === "Approved" && !linkedElsewhere.has(r.id))
  );

  function update(changes) {
    setValues((prev) => ({ ...prev, ...changes }));
    Object.keys(changes).forEach(clearError);
  }

  function onSupplierChange(supplierId) {
    const s = data.suppliers.find((x) => x.id === supplierId);
    const changes = { supplierId };
    if (s && !editing) {
      changes.paymentTerms = s.paymentTerms;
      if (!values.categoryId && s.categoryId) changes.categoryId = s.categoryId;
      if (!expectedTouched.current && isValidDate(values.orderDate)) changes.expectedDeliveryDate = addDays(values.orderDate, s.leadTimeDays);
    }
    update(changes);
  }

  function onOrderDateChange(orderDate) {
    const s = data.suppliers.find((x) => x.id === values.supplierId);
    const changes = { orderDate };
    if (!expectedTouched.current && isValidDate(orderDate)) changes.expectedDeliveryDate = addDays(orderDate, s ? s.leadTimeDays : 7);
    update(changes);
  }

  function onRequisitionChange(requisitionId) {
    const pr = data.requisitions.find((r) => r.id === requisitionId);
    if (!pr || editing) return update({ requisitionId });
    update({
      requisitionId,
      categoryId: pr.categoryId,
      items: copyItems(pr.items),
      status: values.status === "Pending" ? "Approved" : values.status,
      notes: values.notes || `Raised from ${pr.number}: ${pr.title}`,
    });
  }

  function submit() {
    const result = actions.savePurchaseOrder(values);
    if (!result.ok) {
      if (result.errors) form.showErrors(result.errors);
      toast.error(result.error);
      return;
    }
    toast.success(`${result.record.number} ${editing ? "updated" : "created"}.`);
    onClose();
  }

  const amounts = poAmounts({ items: values.items, taxRate: values.taxRate, shippingCost: values.shippingCost });
  const linkedPR = data.requisitions.find((r) => r.id === values.requisitionId);

  return (
    <Modal
      title={editing ? `Edit ${po.number}` : "New purchase order"}
      subtitle={editing ? "Changes recalculate all dashboard figures immediately." : "Orders linked to an approved requisition start as Approved; others need approval."}
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <span className="footer-total">
            Total <strong>{money(amounts.total)}</strong>
          </span>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? "Save changes" : "Create purchase order"}
          </button>
        </>
      )}
    >
      {supplierOptions.length === 0 && (
        <div className="alert alert-warning">
          There are no active suppliers yet. <Link to="/admin/suppliers?new=1" onClick={onClose}>Add a supplier</Link> first.
        </div>
      )}
      <div className="form-row">
        <Field label="Supplier" id={fieldId("supplierId")} required error={errors.supplierId}>
          <select {...bind("supplierId")} onChange={(e) => onSupplierChange(e.target.value)}>
            <option value="">Select supplier</option>
            {supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}){s.status !== "Active" ? " – inactive" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Linked requisition"
          id={fieldId("requisitionId")}
          error={errors.requisitionId}
          hint={linkedPR ? `Estimated ${money(prTotal(linkedPR))} · requested by ${linkedPR.requestedBy}` : "Optional. Only approved requisitions without an order are listed."}
        >
          <select {...bind("requisitionId")} onChange={(e) => onRequisitionChange(e.target.value)}>
            <option value="">None</option>
            {prOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} – {r.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row-4">
        <Field label="Category" id={fieldId("categoryId")} required error={errors.categoryId}>
          <select {...bind("categoryId")}>
            <option value="">Select category</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order date" id={fieldId("orderDate")} required error={errors.orderDate}>
          <input type="date" {...bind("orderDate")} onChange={(e) => onOrderDateChange(e.target.value)} />
        </Field>
        <Field label="Expected delivery" id={fieldId("expectedDeliveryDate")} required error={errors.expectedDeliveryDate}>
          <input
            type="date"
            {...bind("expectedDeliveryDate")}
            min={values.orderDate || undefined}
            onChange={(e) => {
              expectedTouched.current = true;
              form.setField("expectedDeliveryDate", e.target.value);
            }}
          />
        </Field>
        <Field label="Payment terms" id={fieldId("paymentTerms")} required error={errors.paymentTerms}>
          <select {...bind("paymentTerms")}>
            {PAYMENT_TERMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="form-row-4">
        <Field label="Status" id={fieldId("status")} required error={errors.status}>
          <select {...bind("status")}>
            {PO_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {values.status === "Delivered" && (
          <>
            <Field label="Actual delivery date" id={fieldId("actualDeliveryDate")} required error={errors.actualDeliveryDate}>
              <input type="date" {...bind("actualDeliveryDate")} min={values.orderDate || undefined} max={today} />
            </Field>
            <Field label="Received by" id={fieldId("receivedBy")} error={errors.receivedBy} className="span-2">
              <input {...bind("receivedBy")} maxLength={80} />
            </Field>
          </>
        )}
        {values.status === "Cancelled" && (
          <Field label="Cancellation reason" id={fieldId("cancelReason")} error={errors.cancelReason} className="span-3">
            <input {...bind("cancelReason")} maxLength={300} />
          </Field>
        )}
      </div>

      <LineItemsEditor items={values.items} onChange={(items) => form.setField("items", items)} errors={errors} fieldId={fieldId} money={money} />

      <div className="form-row-4 totals-row">
        <Field label="Tax rate (%)" id={fieldId("taxRate")} error={errors.taxRate}>
          <input type="number" min="0" max="100" step="0.01" inputMode="decimal" {...bind("taxRate")} />
        </Field>
        <Field label="Shipping cost" id={fieldId("shippingCost")} error={errors.shippingCost}>
          <input type="number" min="0" step="0.01" inputMode="decimal" {...bind("shippingCost")} />
        </Field>
        <dl className="totals span-2" aria-label="Order totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(amounts.subtotal)}</dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{money(amounts.tax)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{money(amounts.shipping)}</dd>
          </div>
          <div className="grand">
            <dt>Total</dt>
            <dd>{money(amounts.total)}</dd>
          </div>
        </dl>
      </div>

      <Field label="Notes" id={fieldId("notes")} error={errors.notes}>
        <textarea {...bind("notes")} rows={2} maxLength={1000} />
      </Field>
    </Modal>
  );
}
