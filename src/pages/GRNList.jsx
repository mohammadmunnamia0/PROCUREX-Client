import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch } from "react-icons/fi";
import { getGRNs } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";

export default function GRNList() {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchGRNs = () => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    getGRNs(params)
      .then((res) => setGRNs(res.data))
      .catch((err) => console.error("Failed to load GRNs:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGRNs(); }, [debouncedSearch, statusFilter]);

  const statuses = ["Pending Inspection", "Accepted", "Partially Accepted", "Rejected"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Goods Receipt Notes (GRN)</h2>
          <p>Track received goods against purchase orders</p>
        </div>
        <Link to="/goods-receipts/new" className="btn btn-primary">
          <FiPlus /> New GRN
        </Link>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search GRN or PO number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : grns.length === 0 ? (
          <div className="empty-state">
            <FiSearch />
            <h3>No goods receipts found</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>GRN#</th>
                  <th>PO#</th>
                  <th>Vendor</th>
                  <th>Received Date</th>
                  <th>Items</th>
                  <th>Received By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => (
                  <tr key={grn._id}>
                    <td><strong>{grn.grnNumber}</strong></td>
                    <td>{grn.poNumber}</td>
                    <td>{grn.vendor?.name || "N/A"}</td>
                    <td>{new Date(grn.receivedDate).toLocaleDateString()}</td>
                    <td>{grn.items?.length || 0}</td>
                    <td>{grn.receivedBy}</td>
                    <td>
                      <span className={`badge ${
                        grn.status === "Accepted" ? "badge-green" :
                        grn.status === "Rejected" ? "badge-red" :
                        grn.status === "Partially Accepted" ? "badge-yellow" : "badge-blue"
                      }`}>
                        {grn.status}
                      </span>
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
