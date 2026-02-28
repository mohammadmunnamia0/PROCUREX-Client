import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createPR, getPR, updatePR } from "../services/api";

export default function PRForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    requestedBy: "",
    department: "",
    requiredDate: "",
    budgetCode: "",
    justification: "",
    priority: "Medium",
    notes: "",
    items: [{ itemName: "", quantity: 1, estimatedUnitPrice: 0 }],
  });

  useEffect(() => {
    if (isEdit) {
      getPR(id).then((res) => {
        const pr = res.data;
        setForm({
          requestedBy: pr.requestedBy,
          department: pr.department,
          requiredDate: pr.requiredDate?.split("T")[0] || "",
          budgetCode: pr.budgetCode,
          justification: pr.justification,
          priority: pr.priority,
          notes: pr.notes || "",
          items: pr.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            estimatedUnitPrice: i.estimatedUnitPrice,
          })),
        });
      });
    }
  }, [id]);

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { itemName: "", quantity: 1, estimatedUnitPrice: 0 }],
    });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const totalAmount = form.items.reduce(
    (sum, item) => sum + item.quantity * item.estimatedUnitPrice,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updatePR(id, form);
      } else {
        await createPR(form);
      }
      navigate("/purchase-requisitions");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? "Edit" : "New"} Purchase Requisition</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Requested By *</label>
              <input className="form-control" required value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <input className="form-control" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label>Required Date *</label>
              <input className="form-control" type="date" required value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Budget Code *</label>
              <input className="form-control" required value={form.budgetCode} onChange={(e) => setForm({ ...form, budgetCode: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-control" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Justification *</label>
            <textarea className="form-control" required value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
          </div>

          {/* Items Section */}
          <div className="items-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4>Items</h4>
              <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
                <FiPlus /> Add Item
              </button>
            </div>

            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit Price (₹)</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input className="form-control" required value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} placeholder="Item name" />
                    </td>
                    <td>
                      <input className="form-control" type="number" min="1" required value={item.quantity} onChange={(e) => updateItem(idx, "quantity", +e.target.value)} />
                    </td>
                    <td>
                      <input className="form-control" type="number" min="0" required value={item.estimatedUnitPrice} onChange={(e) => updateItem(idx, "estimatedUnitPrice", +e.target.value)} />
                    </td>
                    <td>₹{(item.quantity * item.estimatedUnitPrice).toLocaleString()}</td>
                    <td>
                      <button type="button" className="btn-icon" onClick={() => removeItem(idx)} style={{ color: "#dc2626" }}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: "right", marginTop: 12, fontWeight: 700, fontSize: "1.1rem" }}>
              Total: ₹{totalAmount.toLocaleString()}
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate("/purchase-requisitions")}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEdit ? "Update" : "Create"} PR</button>
          </div>
        </form>
      </div>
    </div>
  );
}
