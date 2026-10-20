import Modal from "../../components/Modal";
import LineItemsEditor, { emptyItem } from "../../components/LineItemsEditor";
import { Field } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { useFormatters } from "../../hooks/useFormatters";
import { PRIORITIES } from "../../store/schema";
import { itemsSubtotal } from "../../store/records";
import { addDays, todayISO } from "../../utils/dates";

const toFormItems = (items) => items.map((i) => ({ ...i, quantity: String(i.quantity), unitPrice: String(i.unitPrice) }));

export default function RequisitionForm({ requisition, onClose, onSaved }) {
  const { data, actions } = useProcurement();
  const { money } = useFormatters();
  const toast = useToast();
  const today = todayISO();
  const editing = Boolean(requisition);

  const form = useFormState(
    editing
      ? { ...requisition, items: toFormItems(requisition.items) }
      : {
          title: "",
          requestedBy: data.settings.userName,
          department: "",
          categoryId: "",
          priority: "Medium",
          requestDate: today,
          requiredDate: addDays(today, 14),
          items: [emptyItem()],
          justification: "",
          notes: "",
        }
  );
  const { values, errors, bind, fieldId } = form;

  function submit() {
    const result = actions.saveRequisition(values);
    if (!result.ok) {
      if (result.errors) form.showErrors(result.errors);
      toast.error(result.error);
      return;
    }
    toast.success(
      result.resubmitted
        ? `${result.record.number} updated and resubmitted for approval.`
        : `${result.record.number} ${editing ? "updated" : "created and sent for approval"}.`
    );
    onSaved?.(result.record);
    onClose();
  }

  return (
    <Modal
      title={editing ? `Edit ${requisition.number}` : "New purchase requisition"}
      subtitle={editing && requisition.status === "Rejected" ? "Saving will resubmit this requisition for approval." : "New requisitions start as Pending approval."}
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <span className="footer-total">
            Estimated total <strong>{money(itemsSubtotal(values.items))}</strong>
          </span>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? (requisition.status === "Rejected" ? "Save & resubmit" : "Save changes") : "Create requisition"}
          </button>
        </>
      )}
    >
      <Field label="Title" id={fieldId("title")} required error={errors.title}>
        <input {...bind("title")} placeholder="e.g. Laptops for new hires" maxLength={120} />
      </Field>
      <div className="form-row">
        <Field label="Requested by" id={fieldId("requestedBy")} required error={errors.requestedBy}>
          <input {...bind("requestedBy")} autoComplete="name" maxLength={80} />
        </Field>
        <Field label="Department" id={fieldId("department")} required error={errors.department}>
          <input {...bind("department")} placeholder="e.g. Production" maxLength={80} list="department-options" />
          <datalist id="department-options">
            {[...new Set(data.requisitions.map((r) => r.department))].map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
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
        <Field label="Priority" id={fieldId("priority")} required error={errors.priority}>
          <select {...bind("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Request date" id={fieldId("requestDate")} required error={errors.requestDate}>
          <input type="date" {...bind("requestDate")} />
        </Field>
        <Field label="Required by" id={fieldId("requiredDate")} required error={errors.requiredDate}>
          <input type="date" {...bind("requiredDate")} min={values.requestDate || undefined} />
        </Field>
      </div>

      <LineItemsEditor items={values.items} onChange={(items) => form.setField("items", items)} errors={errors} fieldId={fieldId} money={money} priceLabel="Est. unit price" />

      <div className="form-row">
        <Field label="Justification" id={fieldId("justification")} error={errors.justification}>
          <textarea {...bind("justification")} rows={2} placeholder="Why is this purchase needed?" maxLength={1000} />
        </Field>
        <Field label="Notes" id={fieldId("notes")} error={errors.notes}>
          <textarea {...bind("notes")} rows={2} maxLength={1000} />
        </Field>
      </div>
    </Modal>
  );
}
