import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiSend } from "react-icons/fi";
import { getPRs, deletePR, submitPR } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";

export default function PRList() {
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchPRs = () => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    getPRs(params)
      .then((res) => setPRs(res.data))
      .catch((err) => console.error("Failed to load PRs:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPRs(); }, [debouncedSearch, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this PR?")) return;
    try {
      await deletePR(id);
      fetchPRs();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm("Submit this PR for approval?")) return;
    try {
      await submitPR(id, {});
      fetchPRs();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const statuses = ["Draft", "Submitted", "Approved", "Rejected", "Converted to PO", "Closed"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Purchase Requisitions</h2>
          <p>Create and manage purchase requests</p>
        </div>
        <Link to="/purchase-requisitions/new" className="btn btn-primary">
          <FiPlus /> New PR
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
        <input type="text" placeholder="Search PR number or requester..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : prs.length === 0 ? (
          <div className="empty-state">
            <FiSearch />
            <h3>No purchase requisitions found</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PR#</th>
                  <th>Requested By</th>
                  <th>Department</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Required Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <tr key={pr._id}>
                    <td><strong>{pr.prNumber}</strong></td>
                    <td>{pr.requestedBy}</td>
                    <td>{pr.department}</td>
                    <td>{pr.items?.length || 0}</td>
                    <td>₹{pr.totalAmount?.toLocaleString()}</td>
                    <td>{new Date(pr.requiredDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${pr.priority === "Critical" ? "badge-red" : pr.priority === "High" ? "badge-yellow" : "badge-gray"}`}>
                        {pr.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(pr.status)}`}>{pr.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {pr.status === "Draft" && (
                          <>
                            <Link to={`/purchase-requisitions/${pr._id}/edit`} className="btn-icon"><FiEdit2 /></Link>
                            <button className="btn-icon" onClick={() => handleSubmit(pr._id)} style={{ color: "var(--primary)" }} title="Submit for approval"><FiSend /></button>
                            <button className="btn-icon" onClick={() => handleDelete(pr._id)} style={{ color: "#dc2626" }}><FiTrash2 /></button>
                          </>
                        )}
                        {pr.status === "Approved" && (
                          <Link to={`/purchase-orders/new?prId=${pr._id}`} className="btn btn-sm btn-success">Create PO</Link>
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
    Draft: "badge-gray", Submitted: "badge-blue", Approved: "badge-green",
    Rejected: "badge-red", "Converted to PO": "badge-purple", Closed: "badge-gray",
  };
  return map[status] || "badge-gray";
}
