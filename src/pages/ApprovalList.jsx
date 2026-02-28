import { useState, useEffect } from "react";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import { getApprovals, processApprovalStep } from "../services/api";

export default function ApprovalList() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchApprovals = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.overallStatus = statusFilter;
    getApprovals(params)
      .then((res) => setApprovals(res.data))
      .catch((err) => console.error("Failed to load approvals:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApprovals(); }, [statusFilter]);

  const handleApprove = async (approvalId, stepLevel) => {
    const comments = window.prompt("Approval comments (optional):");
    try {
      await processApprovalStep(approvalId, { stepLevel, status: "Approved", comments: comments || "" });
      fetchApprovals();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleReject = async (approvalId, stepLevel) => {
    const comments = window.prompt("Rejection reason:");
    if (!comments) return alert("Rejection reason is required");
    try {
      await processApprovalStep(approvalId, { stepLevel, status: "Rejected", comments });
      fetchApprovals();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Approval Workflow</h2>
          <p>Multi-level PR approval queue</p>
        </div>
      </div>

      <div className="search-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: "12px 20px" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          <strong>Approval Rules:</strong> PR Amount ≤ ₹50,000 → Manager Only | PR Amount &gt; ₹50,000 → Manager + Director
        </p>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : approvals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FiCheckCircle />
            <h3>No approvals found</h3>
          </div>
        </div>
      ) : (
        approvals.map((approval) => (
          <div className="card" key={approval._id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: "1rem" }}>{approval.prNumber}</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {approval.prId?.requestedBy} · {approval.prId?.department} · Amount: ₹{approval.totalAmount?.toLocaleString()}
                </p>
              </div>
              <span className={`badge ${approval.overallStatus === "Approved" ? "badge-green" : approval.overallStatus === "Rejected" ? "badge-red" : "badge-yellow"}`}>
                {approval.overallStatus}
              </span>
            </div>

            <div className="approval-steps">
              {approval.steps.map((step) => (
                <div className={`approval-step ${step.status.toLowerCase()}`} key={step._id}>
                  <div style={{ flex: 1 }}>
                    <strong>Level {step.level}: {step.approverRole}</strong>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {step.approverName}
                      {step.actionDate && ` · ${new Date(step.actionDate).toLocaleDateString()}`}
                      {step.comments && ` · "${step.comments}"`}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {step.status === "Approved" && <span className="badge badge-green"><FiCheckCircle /> Approved</span>}
                    {step.status === "Rejected" && <span className="badge badge-red"><FiXCircle /> Rejected</span>}
                    {step.status === "Pending" && approval.overallStatus === "Pending" && (
                      <>
                        <span className="badge badge-yellow"><FiClock /> Pending</span>
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(approval._id, step.level)}>
                          Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(approval._id, step.level)}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
