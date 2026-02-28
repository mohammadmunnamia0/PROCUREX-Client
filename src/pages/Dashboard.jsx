import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiUsers,
  FiFileText,
  FiShoppingCart,
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiTrendingUp,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { getDashboard } from "../services/api";

const COLORS = ["#1e40af", "#059669", "#dc2626", "#f59e0b", "#0891b2", "#7c3aed", "#db2777"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return <div className="alert alert-danger">Failed to load dashboard data</div>;
  }

  const { counts, totalSpend, avgLeadTime, avgApprovalDays, spendByVendor, recentPRs, recentPOs, delayedVendors } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Procurement Dashboard</h2>
          <p>Real-time overview of procurement operations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FiUsers /></div>
          <div className="stat-info">
            <h4>{counts.activeVendors}</h4>
            <p>Active Vendors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiFileText /></div>
          <div className="stat-info">
            <h4>{counts.openPRs}</h4>
            <p>Open PRs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><FiShoppingCart /></div>
          <div className="stat-info">
            <h4>{counts.openPOs}</h4>
            <p>Open POs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><FiClock /></div>
          <div className="stat-info">
            <h4>{counts.pendingApprovals}</h4>
            <p>Pending Approvals</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiDollarSign /></div>
          <div className="stat-info">
            <h4>₹{(totalSpend / 1000).toFixed(1)}K</h4>
            <p>Total Spend</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FiTrendingUp /></div>
          <div className="stat-info">
            <h4>{avgLeadTime}d</h4>
            <p>Avg Lead Time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><FiCheckCircle /></div>
          <div className="stat-info">
            <h4>{avgApprovalDays}d</h4>
            <p>Avg Approval Time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FiAlertTriangle /></div>
          <div className="stat-info">
            <h4>{counts.blockedVendors}</h4>
            <p>Blocked Vendors</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        {/* Spend by Vendor */}
        <div className="card">
          <div className="card-header">
            <h3>Spend by Vendor</h3>
          </div>
          {spendByVendor.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendByVendor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vendorName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                <Bar dataKey="totalSpend" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No spend data yet</p></div>
          )}
        </div>

        {/* Vendor Delay Alerts */}
        <div className="card">
          <div className="card-header">
            <h3>Vendor Delay Alerts</h3>
          </div>
          {delayedVendors.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>On-Time %</th>
                    <th>Late Orders</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedVendors.map((v) => (
                    <tr key={v._id}>
                      <td>
                        <Link to={`/vendors/${v.vendor?._id}`}>
                          {v.vendor?.name}
                        </Link>
                      </td>
                      <td>{v.onTimePercentage}%</td>
                      <td>{v.lateDeliveries}</td>
                      <td>
                        <span className={`badge ${v.riskLevel === "High" ? "badge-red" : "badge-yellow"}`}>
                          {v.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FiCheckCircle />
              <p>No vendor delays</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* Recent PRs */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Purchase Requisitions</h3>
            <Link to="/purchase-requisitions" className="btn btn-sm btn-outline">
              View All
            </Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PR#</th>
                  <th>Requester</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPRs.map((pr) => (
                  <tr key={pr._id}>
                    <td>{pr.prNumber}</td>
                    <td>{pr.requestedBy}</td>
                    <td>₹{pr.totalAmount?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(pr.status)}`}>
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent POs */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Purchase Orders</h3>
            <Link to="/purchase-orders" className="btn btn-sm btn-outline">
              View All
            </Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PO#</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr key={po._id}>
                    <td>{po.poNumber}</td>
                    <td>{po.vendor?.name || "N/A"}</td>
                    <td>₹{po.totalAmount?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status) {
  const map = {
    Draft: "badge-gray",
    Submitted: "badge-blue",
    Approved: "badge-green",
    Rejected: "badge-red",
    "Converted to PO": "badge-purple",
    Closed: "badge-gray",
    Created: "badge-blue",
    Sent: "badge-cyan",
    Confirmed: "badge-green",
    "Partially Received": "badge-yellow",
    "Fully Received": "badge-green",
    Pending: "badge-yellow",
  };
  return map[status] || "badge-gray";
}
