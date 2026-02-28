import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createPO, getPR, getVendors, getPRs } from "../services/api";

export default function POForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prIdParam = searchParams.get("prId");

  const [vendors, setVendors] = useState([]);
  const [approvedPRs, setApprovedPRs] = useState([]);
  const [prData, setPRData] = useState(null);
  const [form, setForm] = useState({
    prId: prIdParam || "",
    vendor: "",
    deliveryDate: "",
    paymentTerms: "Net 30",
    notes: "",
    items: [{ itemName: "", quantity: 1, agreedPrice: 0 }],
  });

  useEffect(() => {
    getVendors({ status: "Active" })
      .then((res) => setVendors(res.data))
      .catch((err) => console.error("Failed to load vendors:", err.message));
    getPRs({ status: "Approved" })
      .then((res) => setApprovedPRs(res.data))
      .catch((err) => console.error("Failed to load approved PRs:", err.message));
    if (prIdParam) {
      loadPRData(prIdParam);
    }
  }, [prIdParam]);

  const loadPRData = (prId) => {
    getPR(prId).then((res) => {
      const pr = res.data;
      setPRData(pr);
      setForm((prev) => ({
        ...prev,
        prId: pr._id,
        items: pr.items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          agreedPrice: i.estimatedUnitPrice,
        })),
      }));
    }).catch((err) => console.error("Failed to load PR:", err.message));
  };

  const handlePRChange = (prId) => {
    setForm((prev) => ({ ...prev, prId }));
    if (prId) {
      loadPRData(prId);
    } else {
      setPRData(null);
    }
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { itemName: "", quantity: 1, agreedPrice: 0 }],
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
    (sum, item) => sum + item.quantity * item.agreedPrice,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.prId) return alert("Please enter a PR ID");
    if (!form.vendor) return alert("Please select a vendor");
    try {
      await createPO(form);
      navigate("/purchase-orders");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Create Purchase Order</h2>
      </div>

      {prData && (
        <div className="alert alert-info">
          Creating PO from <strong>{prData.prNumber}</strong> – {prData.requestedBy} ({prData.department}) – Total: ₹{prData.totalAmount?.toLocaleString()}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Purchase Requisition *</label>
              <select className="form-control" required value={form.prId} onChange={(e) => handlePRChange(e.target.value)}>
                <option value="">Select Approved PR</option>
                {approvedPRs.map((pr) => (
                  <option key={pr._id} value={pr._id}>
                    {pr.prNumber} - {pr.requestedBy} ({pr.department}) - ₹{pr.totalAmount?.toLocaleString()}
                  </option>
                ))}
                {prIdParam && !approvedPRs.find((p) => p._id === prIdParam) && prData && (
                  <option value={prIdParam}>{prData.prNumber} - {prData.requestedBy}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Vendor *</label>
              <select className="form-control" required value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.name} ({v.vendorId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Delivery Date *</label>
              <input className="form-control" type="date" required value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Payment Terms</label>
              <select className="form-control" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
                <option>Immediate</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="items-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4>Order Items</h4>
              <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
                <FiPlus /> Add Item
              </button>
            </div>

            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Agreed Price (₹)</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input className="form-control" required value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} />
                    </td>
                    <td>
                      <input className="form-control" type="number" min="1" required value={item.quantity} onChange={(e) => updateItem(idx, "quantity", +e.target.value)} />
                    </td>
                    <td>
                      <input className="form-control" type="number" min="0" required value={item.agreedPrice} onChange={(e) => updateItem(idx, "agreedPrice", +e.target.value)} />
                    </td>
                    <td>₹{(item.quantity * item.agreedPrice).toLocaleString()}</td>
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
            <button type="button" className="btn btn-outline" onClick={() => navigate("/purchase-orders")}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create PO</button>
          </div>
        </form>
      </div>
    </div>
  );
}
