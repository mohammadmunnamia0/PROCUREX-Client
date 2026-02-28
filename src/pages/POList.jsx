import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { getPOs, deletePO, updatePO } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";

export default function POList() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchPOs = () => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    getPOs(params)
      .then((res) => setPOs(res.data))
      .catch((err) => console.error("Failed to load POs:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPOs(); }, [debouncedSearch, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this PO?")) return;
    try {
      await deletePO(id);
      fetchPOs();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updatePO(id, { status: newStatus });
      fetchPOs();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const statuses = ["Created", "Sent", "Confirmed", "Partially Received", "Fully Received", "Closed"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Purchase Orders</h2>
          <p>Manage purchase orders from approved PRs</p>
        </div>
        <Link to="/purchase-orders/new" className="btn btn-primary">
          <FiPlus /> New PO
        </Link>
      </div>

      {/* Status Flow */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="status-flow">
          {statuses.map((s, i) => (
            <span key={s}>
              <span className={`status-step ${statusFilter === s ? "current" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
                {s}
              </span>
              {i < statuses.length - 1 && <span className="status-arrow"> → </span>}
            </span>
          ))}
        </div>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search PO or PR number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : pos.length === 0 ? (
          <div className="empty-state">
            <FiSearch />
            <h3>No purchase orders found</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PO#</th>
                  <th>PR#</th>
                  <th>Vendor</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po._id}>
                    <td><strong>{po.poNumber}</strong></td>
                    <td>{po.prNumber}</td>
                    <td>{po.vendor?.name || "N/A"}</td>
                    <td>{po.items?.length || 0}</td>
                    <td>₹{po.totalAmount?.toLocaleString()}</td>
                    <td>{new Date(po.deliveryDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(po.status)}`}>{po.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {po.status === "Created" && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(po._id, "Sent")}>Mark Sent</button>
                            <button className="btn-icon" onClick={() => handleDelete(po._id)} style={{ color: "#dc2626" }}><FiTrash2 /></button>
                          </>
                        )}
                        {po.status === "Sent" && (
                          <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(po._id, "Confirmed")}>Confirm</button>
                        )}
                        {["Confirmed", "Partially Received"].includes(po.status) && (
                          <Link to={`/goods-receipts/new?poId=${po._id}`} className="btn btn-sm btn-success">Receive Goods</Link>
                        )}
                        {po.status === "Fully Received" && (
                          <button className="btn btn-sm btn-outline" onClick={() => handleStatusChange(po._id, "Closed")}>Close PO</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadge(status) {
  const map = {
    Created: "badge-blue", Sent: "badge-cyan", Confirmed: "badge-green",
    "Partially Received": "badge-yellow", "Fully Received": "badge-green", Closed: "badge-gray",
  };
  return map[status] || "badge-gray";
}
