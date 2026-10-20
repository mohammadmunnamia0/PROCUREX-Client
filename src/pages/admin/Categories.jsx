import { useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTag, FiTrash2 } from "react-icons/fi";
import DataTable from "../../components/DataTable";
import Modal from "../../components/Modal";
import { EmptyState, Field, PageHeader, SampleBadge } from "../../components/ui";
import { OTHER_COLOR, categoryColorMap } from "../../theme/palette";
import { useConfirm } from "../../components/ConfirmProvider";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { useFormatters } from "../../hooks/useFormatters";
import { categoryStats } from "../../store/metrics";

function CategoryForm({ category, onClose }) {
  const { actions } = useProcurement();
  const toast = useToast();
  const form = useFormState(category ? { ...category } : { name: "", description: "" });

  function submit() {
    const result = actions.saveCategory(form.values);
    if (!result.ok) {
      if (result.errors) form.showErrors(result.errors);
      toast.error(result.error);
      return;
    }
    toast.success(`Category "${result.record.name}" ${category ? "updated" : "added"}.`);
    onClose();
  }

  return (
    <Modal
      title={category ? "Edit category" : "Add category"}
      size="sm"
      onClose={onClose}
      onSubmit={submit}
      isDirty={form.isDirty}
      footer={({ requestClose }) => (
        <>
          <button type="button" className="btn btn-outline" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {category ? "Save changes" : "Add category"}
          </button>
        </>
      )}
    >
      <Field label="Name" id={form.fieldId("name")} required error={form.errors.name}>
        <input {...form.bind("name")} maxLength={60} />
      </Field>
      <Field label="Description" id={form.fieldId("description")} error={form.errors.description}>
        <textarea {...form.bind("description")} rows={2} maxLength={200} />
      </Field>
    </Modal>
  );
}

export default function Categories() {
  const { data, actions } = useProcurement();
  const { money } = useFormatters();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const stats = useMemo(() => categoryStats(data), [data]);
  const colors = useMemo(() => categoryColorMap(data.categories), [data.categories]);
  const statOf = (id) => stats.get(id);

  async function remove(category) {
    const ok = await confirm({ title: `Delete "${category.name}"?`, message: "This removes the category from this browser.", confirmLabel: "Delete category", danger: true });
    if (!ok) return;
    const result = actions.deleteCategory(category.id);
    if (result.ok) toast.success(`Category "${category.name}" deleted.`);
    else toast.error(result.error);
  }

  const columns = [
    {
      key: "name",
      header: "Category",
      render: (c) => (
        <span className="cat-chip">
          <span className="seg-dot" style={{ background: colors.get(c.id) || OTHER_COLOR }} aria-hidden="true" />
          <strong>{c.name}</strong> <SampleBadge record={c} />
        </span>
      ),
    },
    { key: "description", header: "Description", render: (c) => c.description || <span className="muted">–</span> },
    { key: "suppliers", header: "Suppliers", align: "right", sortValue: (c) => statOf(c.id).suppliers, render: (c) => statOf(c.id).suppliers },
    { key: "requisitions", header: "Requisitions", align: "right", sortValue: (c) => statOf(c.id).requisitions, render: (c) => statOf(c.id).requisitions },
    { key: "purchaseOrders", header: "POs", align: "right", sortValue: (c) => statOf(c.id).purchaseOrders, render: (c) => statOf(c.id).purchaseOrders },
    { key: "spend", header: "Committed spend", align: "right", sortValue: (c) => statOf(c.id).committedSpend, render: (c) => money(statOf(c.id).committedSpend) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: "actions-col",
      render: (c) => (
        <div className="row-actions">
          <button type="button" className="btn-icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} title="Edit">
            <FiEdit2 />
          </button>
          <button type="button" className="btn-icon danger" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} title="Delete">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Procurement Categories"
        description="Group spend for reporting. Categories in use cannot be deleted."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <FiPlus /> Add category
          </button>
        }
      />
      <div className="card">
        <DataTable
          columns={columns}
          rows={data.categories}
          initialSort={{ key: "name", dir: "asc" }}
          caption="Procurement categories"
          empty={
            <EmptyState icon={FiTag} title="No categories" message="Requisitions and purchase orders need a category.">
              <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
                <FiPlus /> Add category
              </button>
            </EmptyState>
          }
        />
      </div>
      {editing && <CategoryForm category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
