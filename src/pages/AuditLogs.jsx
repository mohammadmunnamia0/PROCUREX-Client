import { useState, useEffect } from "react";
import { FiClipboard } from "react-icons/fi";
import { getAuditLogs } from "../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (moduleFilter) params.module = moduleFilter;
    if (actionFilter) params.action = actionFilter;
    getAuditLogs(params)
      .then((res) => setLogs(res.data))
      .catch((err) => console.error("Failed to load audit logs:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [moduleFilter, actionFilter]);

  const modules = ["Vendor", "PR", "Approval", "PO", "GRN", "Performance"];
  const actions = ["CREATE", "UPDATE", "DELETE", "SUBMIT", "APPROVAL_STEP", "AUTO_BLOCK"];

  const getActionBadge = (action) => {
    const map = {
      CREATE: "badge-green",
      UPDATE: "badge-blue",
      DELETE: "badge-red",
      SUBMIT: "badge-cyan",
      APPROVAL_STEP: "badge-purple",
      AUTO_BLOCK: "badge-red",
    };
    return map[action] || "badge-gray";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Audit Logs</h2>
          <p>Complete traceability of all procurement actions</p>
        </div>
      </div>

      <div className="search-bar">
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">All Modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <FiClipboard />
            <h3>No audit logs found</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-blue">{log.module}</span>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.description}</td>
                    <td>{log.performedBy}</td>
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
