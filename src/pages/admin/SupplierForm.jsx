import Modal from "../../components/Modal";
import { Field } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { PAYMENT_TERMS, SUPPLIER_STATUSES } from "../../store/schema";

const EMPTY = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  categoryId: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  paymentTerms: "Net 30",
  leadTimeDays: "7",
  rating: "3",
  status: "Active",
  notes: "",
};

export default function SupplierForm({ supplier, onClose, onSaved }) {
  const { data, actions } = useProcurement();
  const toast = useToast();
  const editing = Boolean(supplier);
  const form = useFormState(
    editing ? { ...EMPTY, ...supplier, leadTimeDays: String(supplier.leadTimeDays), rating: String(supplier.rating) } : EMPTY
  );
  const { errors, bind, fieldId } = form;

  function submit() {
    const result = actions.saveSupplier(form.values);
    if (!result.ok) {
      if (result.errors) form.showErrors(result.errors);
      toast.error(result.error);
      return;
    }
    toast.success(`${result.record.name} ${editing ? "updated" : `added as ${result.record.code}`}.`);
    onSaved?.(result.record);
    onClose();
  }

  return (
    <Modal
      title={editing ? `Edit ${supplier.name}` : "Add supplier"}
      subtitle={editing ? supplier.code : "The supplier code is assigned automatically."}
      size="lg"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? "Save changes" : "Add supplier"}
          </button>
        </>
      )}
    >
      <div className="form-row">
        <Field label="Supplier name" id={fieldId("name")} required error={errors.name}>
          <input {...bind("name")} maxLength={100} autoComplete="organization" />
        </Field>
        <Field label="Contact person" id={fieldId("contactPerson")} error={errors.contactPerson}>
          <input {...bind("contactPerson")} maxLength={100} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Email" id={fieldId("email")} required error={errors.email}>
          <input type="email" {...bind("email")} maxLength={120} autoComplete="email" placeholder="sales@supplier.com" />
        </Field>
        <Field label="Phone" id={fieldId("phone")} required error={errors.phone}>
          <input type="tel" {...bind("phone")} maxLength={20} autoComplete="tel" placeholder="+91 98765 43210" />
        </Field>
      </div>
      <div className="form-row-4">
        <Field label="Primary category" id={fieldId("categoryId")} error={errors.categoryId}>
          <select {...bind("categoryId")}>
            <option value="">None</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment terms" id={fieldId("paymentTerms")} required error={errors.paymentTerms}>
          <select {...bind("paymentTerms")}>
            {PAYMENT_TERMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Lead time (days)" id={fieldId("leadTimeDays")} required error={errors.leadTimeDays} hint="Used to suggest delivery dates">
          <input type="number" min="0" max="365" step="1" inputMode="numeric" {...bind("leadTimeDays")} />
        </Field>
        <Field label="Rating (1–5)" id={fieldId("rating")} required error={errors.rating}>
          <select {...bind("rating")}>
            {["5", "4", "3", "2", "1"].map((r) => (
              <option key={r} value={r}>
                {"★".repeat(Number(r))} ({r})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row-3">
        <Field label="Address" id={fieldId("address")} error={errors.address}>
          <input {...bind("address")} maxLength={200} autoComplete="street-address" />
        </Field>
        <Field label="City" id={fieldId("city")} error={errors.city}>
          <input {...bind("city")} maxLength={60} />
        </Field>
        <Field label="Country" id={fieldId("country")} error={errors.country}>
          <input {...bind("country")} maxLength={60} autoComplete="country-name" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Tax ID" id={fieldId("taxId")} error={errors.taxId}>
          <input {...bind("taxId")} maxLength={40} placeholder="GSTIN / BIN / VAT number" />
        </Field>
        <Field label="Status" id={fieldId("status")} required error={errors.status} hint="Inactive suppliers cannot receive new orders">
          <select {...bind("status")}>
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes" id={fieldId("notes")} error={errors.notes}>
        <textarea {...bind("notes")} rows={2} maxLength={500} />
      </Field>
    </Modal>
  );
}
