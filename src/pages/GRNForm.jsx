import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { createGRN, getPO, getPOs } from "../services/api";

export default function GRNForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poIdParam = searchParams.get("poId");

  const [availablePOs, setAvailablePOs] = useState([]);
  const [poData, setPOData] = useState(null);
  const [form, setForm] = useState({
    poId: poIdParam || "",
    receivedBy: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  });

  useEffect(() => {
    getPOs({ status: "Confirmed" })
      .then((res) => {
        const confirmed = res.data;
        getPOs({ status: "Partially Received" }).then((res2) => {
          setAvailablePOs([...confirmed, ...res2.data]);
        });
      })
      .catch((err) => console.error("Failed to load POs:", err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    if (form.poId) {
      getPO(form.poId).then((res) => {
        const po = res.data;
        setPOData(po);
        setForm((prev) => ({
          ...prev,
          items: po.items.map((i) => ({
            itemName: i.itemName,
            orderedQuantity: i.quantity,
            receivedQuantity: 0,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            remarks: "",
            maxReceivable: i.quantity - (i.receivedQuantity || 0),
          })),
        }));
      }).catch((err) => {
        console.error("Failed to load PO:", err.response?.data?.message || err.message);
        setPOData(null);
      });
    }
  }, [form.poId]);

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poId) return alert("Please select a PO");

    // Validate quantities
    for (const item of form.items) {
      if (item.receivedQuantity > item.maxReceivable) {
        return alert(`Received qty for ${item.itemName} exceeds remaining PO qty (${item.maxReceivable})`);
      }
    }

    try {
      const payload = {
        poId: form.poId,
        receivedBy: form.receivedBy,
        receivedDate: form.receivedDate,
        notes: form.notes,
        items: form.items.map(({ maxReceivable, ...rest }) => rest),
      };
      await createGRN(payload);
      navigate("/goods-receipts");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Create Goods Receipt Note</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Purchase Order *</label>
              <select className="form-control" required value={form.poId} onChange={(e) => setForm({ ...form, poId: e.target.value })}>
                <option value="">Select PO</option>
                {availablePOs.map((po) => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber} - {po.vendor?.name} ({po.status})
                  </option>
                ))}
                {poIdParam && !availablePOs.find((p) => p._id === poIdParam) && (
                  <option value={poIdParam}>{poIdParam}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Received By *</label>
              <input className="form-control" required value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} placeholder="Warehouse staff name" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Received Date</label>
              <input className="form-control" type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
            </div>
          </div>

          {poData && (
            <div className="alert alert-info">
              PO: <strong>{poData.poNumber}</strong> · Vendor: {poData.vendor?.name} · Delivery Date: {new Date(poData.deliveryDate).toLocaleDateString()}
            </div>
          )}

          {/* Items Section */}
          {form.items.length > 0 && (
            <div className="items-section">
              <h4>Receive Items</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Ordered Qty</th>
                      <th>Remaining</th>
                      <th>Received Qty</th>
                      <th>Accepted Qty</th>
                      <th>Rejected Qty</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.itemName}</strong></td>
                        <td>{item.orderedQuantity}</td>
                        <td>{item.maxReceivable}</td>
                        <td>
                          <input className="form-control" type="number" min="0" max={item.maxReceivable} value={item.receivedQuantity} onChange={(e) => updateItem(idx, "receivedQuantity", +e.target.value)} style={{ width: 80 }} />
                        </td>
                        <td>
                          <input className="form-control" type="number" min="0" max={item.receivedQuantity} value={item.acceptedQuantity} onChange={(e) => updateItem(idx, "acceptedQuantity", +e.target.value)} style={{ width: 80 }} />
                        </td>
                        <td>
                          <input className="form-control" type="number" min="0" value={item.rejectedQuantity} onChange={(e) => updateItem(idx, "rejectedQuantity", +e.target.value)} style={{ width: 80 }} />
                        </td>
                        <td>
                          <input className="form-control" value={item.remarks} onChange={(e) => updateItem(idx, "remarks", e.target.value)} placeholder="Optional" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate("/goods-receipts")}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create GRN</button>
          </div>
        </form>
      </div>
    </div>
  );
}
