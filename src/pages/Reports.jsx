import { useState, useEffect } from "react";
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
  Legend,
} from "recharts";
import { FiBarChart2 } from "react-icons/fi";
import { getSpendByCategory, getVendorOnTimeReport, getDashboard } from "../services/api";

const COLORS = ["#1e40af", "#059669", "#dc2626", "#f59e0b", "#0891b2", "#7c3aed", "#db2777", "#ea580c"];

export default function Reports() {
  const [spendByCategory, setSpendByCategory] = useState([]);
  const [vendorPerf, setVendorPerf] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSpendByCategory(), getVendorOnTimeReport(), getDashboard()])
      .then(([catRes, perfRes, dashRes]) => {
        setSpendByCategory(catRes.data);
        setVendorPerf(perfRes.data);
        setDashboard(dashRes.data);
      })
      .catch((err) => console.error("Failed to load reports:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading reports...</div>;
  }

  const vendorChartData = vendorPerf
    .filter((v) => v.vendor)
    .map((v) => ({
      name: v.vendor.name,
      onTime: v.onTimePercentage,
      fillRate: v.orderFillRate,
      avgLead: v.averageLeadTime,
    }));

  const categoryPieData = spendByCategory.map((c) => ({
    name: c._id || "Uncategorized",
    value: c.totalSpend,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Procurement Reports</h2>
          <p>KPIs and analytics across procurement operations</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><FiBarChart2 /></div>
          <div className="stat-info">
            <h4>₹{((dashboard?.totalSpend || 0) / 1000).toFixed(1)}K</h4>
            <p>Total Spend</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FiBarChart2 /></div>
          <div className="stat-info">
            <h4>{dashboard?.counts?.totalPRs || 0}</h4>
            <p>Total PRs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><FiBarChart2 /></div>
          <div className="stat-info">
            <h4>{dashboard?.counts?.totalPOs || 0}</h4>
            <p>Total POs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><FiBarChart2 /></div>
          <div className="stat-info">
            <h4>{dashboard?.avgLeadTime || 0}d</h4>
            <p>Avg Lead Time</p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Spend by Category */}
        <div className="card">
          <div className="card-header"><h3>Spend by Category</h3></div>
          {categoryPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No category data</p></div>
          )}
        </div>

        {/* Spend by Category Table */}
        <div className="card">
          <div className="card-header"><h3>Category Breakdown</h3></div>
          {spendByCategory.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Orders</th>
                    <th>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {spendByCategory.map((c, i) => (
                    <tr key={i}>
                      <td>{c._id || "Uncategorized"}</td>
                      <td>{c.orderCount}</td>
                      <td>₹{c.totalSpend?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>No data</p></div>
          )}
        </div>
      </div>

      {/* Vendor Performance Chart */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h3>Vendor On-Time Delivery Performance</h3></div>
        {vendorChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={vendorChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="onTime" name="On-Time %" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fillRate" name="Fill Rate %" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state"><p>No vendor performance data</p></div>
        )}
      </div>

      {/* Vendor Performance Table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h3>Vendor Scorecard Summary</h3></div>
        {vendorPerf.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>On-Time %</th>
                  <th>Late</th>
                  <th>Avg Lead Time</th>
                  <th>Fill Rate</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {vendorPerf.filter((v) => v.vendor).map((v) => (
                  <tr key={v._id}>
                    <td><strong>{v.vendor.name}</strong></td>
                    <td>{v.vendor.vendorId}</td>
                    <td>
                      <span className={`badge ${v.vendor.status === "Active" ? "badge-green" : "badge-red"}`}>
                        {v.vendor.status}
                      </span>
                    </td>
                    <td>{v.totalOrders}</td>
                    <td>{v.onTimePercentage}%</td>
                    <td>{v.lateDeliveries}</td>
                    <td>{v.averageLeadTime}d</td>
                    <td>{v.orderFillRate}%</td>
                    <td>
                      <span className={`badge ${v.riskLevel === "Low" ? "badge-green" : v.riskLevel === "Moderate" ? "badge-yellow" : "badge-red"}`}>
                        {v.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><p>No vendor performance data</p></div>
        )}
      </div>
    </div>
  );
}
