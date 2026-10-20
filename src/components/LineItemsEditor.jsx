import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createId } from "../utils/id";
import { lineTotal } from "../store/records";

export const emptyItem = () => ({ id: createId(), description: "", quantity: "1", unit: "pcs", unitPrice: "" });

/** Line items for requisitions and purchase orders. Errors use keys like "items.0.quantity". */
export default function LineItemsEditor({ items, onChange, errors, fieldId, money, priceLabel = "Unit price" }) {
  const update = (index, field, value) => onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, emptyItem()]);

  const input = (index, field, props = {}) => {
    const key = `items.${index}.${field}`;
    const id = fieldId(key);
    return (
      <input
        id={id}
        className={`form-control${errors[key] ? " is-invalid" : ""}`}
        value={items[index][field]}
        onChange={(e) => update(index, field, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${fieldId(`items.${index}`)}-error` : undefined}
        {...props}
      />
    );
  };

  return (
    <fieldset className="items-editor">
      <legend>
        Line items <span className="req" aria-hidden="true">*</span>
      </legend>
      {errors.items && <p className="field-error" id={`${fieldId("items")}-error`}>{errors.items}</p>}
      <div className="items-head" aria-hidden="true">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit</span>
        <span>{priceLabel}</span>
        <span className="num">Line total</span>
        <span />
      </div>
      {items.map((item, index) => {
        const rowErrors = ["description", "quantity", "unit", "unitPrice"].map((f) => errors[`items.${index}.${f}`]).filter(Boolean);
        return (
          <div className="items-row" key={item.id}>
            <label className="items-cell items-desc">
              <span className="items-label">Description</span>
              {input(index, "description", { placeholder: "Item or service", "aria-label": `Item ${index + 1} description` })}
            </label>
            <label className="items-cell">
              <span className="items-label">Qty</span>
              {input(index, "quantity", { type: "number", min: "0", step: "any", inputMode: "decimal", "aria-label": `Item ${index + 1} quantity` })}
            </label>
            <label className="items-cell">
              <span className="items-label">Unit</span>
              {input(index, "unit", { placeholder: "pcs", "aria-label": `Item ${index + 1} unit` })}
            </label>
            <label className="items-cell">
              <span className="items-label">{priceLabel}</span>
              {input(index, "unitPrice", { type: "number", min: "0", step: "0.01", inputMode: "decimal", placeholder: "0.00", "aria-label": `Item ${index + 1} ${priceLabel.toLowerCase()}` })}
            </label>
            <div className="items-cell items-total num">
              <span className="items-label">Line total</span>
              {money(lineTotal(item))}
            </div>
            <div className="items-cell items-remove">
              <button type="button" className="btn-icon danger" onClick={() => remove(index)} disabled={items.length === 1} aria-label={`Remove item ${index + 1}`} title="Remove item">
                <FiTrash2 />
              </button>
            </div>
            {rowErrors.length > 0 && (
              <p className="field-error items-errors" id={`${fieldId(`items.${index}`)}-error`}>
                {rowErrors.join(" ")}
              </p>
            )}
          </div>
        );
      })}
      <button type="button" className="btn btn-sm btn-outline" onClick={add}>
        <FiPlus /> Add item
      </button>
    </fieldset>
  );
}
