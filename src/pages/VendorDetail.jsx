import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiStar, FiTruck, FiAlertTriangle } from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { getVendor, getVendorPerformance } from "../services/api";

export default function VendorDetail() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getVendor(id), getVendorPerformance(id)])
      .then(([vRes, pRes]) => {
        setVendor(vRes.data);
        setPerf(pRes.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load vendor details");
        // Still try to load vendor alone if perf fails
        getVendor(id).then((res) => setVendor(res.data)).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading vendor...</div>;
  }

  if (!vendor) {
    return <div className="alert alert-danger">Vendor not found</div>;
  }

  const deliveryData = perf?.deliveryHistory?.map((d, i) => ({
    order: `#${i + 1}`,
    delay: d.delayDays,
    onTime: d.onTime ? 1 : 0,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/vendors" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primary)", textDecoration: "none", marginBottom: 8 }}>
            <FiArrowLeft /> Back to Vendors
          </Link>
          <h2>{vendor.name}</h2>
          <p>{vendor.vendorId} · {vendor.category}</p>
        </div>
        <span className={`badge ${vendor.status === "Active" ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.85rem", padding: "6px 16px" }}>
          {vendor.status}
        </span>
      </div>

      {/* Vendor Info */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>Vendor Information</h3></div>
          <table>
            <tbody>
              <tr><td><strong>Email</strong></td><td>{vendor.email}</td></tr>
              <tr><td><strong>Phone</strong></td><td>{vendor.phone}</td></tr>
              <tr><td><strong>Tax ID</strong></td><td>{vendor.taxId}</td></tr>
              <tr><td><strong>Payment Terms</strong></td><td>{vendor.paymentTerms}</td></tr>
              <tr><td><strong>Lead Time</strong></td><td>{vendor.leadTimeDays} days</td></tr>
              <tr><td><strong>Rating</strong></td><td><FiStar style={{ color: "#f59e0b" }} /> {vendor.rating}/5</td></tr>
              <tr><td><strong>Address</strong></td><td>{[vendor.address?.street, vendor.address?.city, vendor.address?.state, vendor.address?.country].filter(Boolean).join(", ")}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Performance Scorecard */}
        <div className="card">
          <div className="card-header"><h3>Performance Scorecard</h3></div>
          {perf ? (
            <div className="scorecard">
              <div className="scorecard-item">
                <h4>{perf.onTimePercentage}%</h4>
                <p>On-Time Delivery</p>
              </div>
              <div className="scorecard-item">
                <h4>{perf.totalOrders}</h4>
                <p>Total Orders</p>
              </div>
              <div className="scorecard-item">
                <h4>{perf.lateDeliveries}</h4>
                <p>Late Deliveries</p>
              </div>
              <div className="scorecard-item">
                <h4>{perf.averageLeadTime}d</h4>
                <p>Avg Lead Time</p>
              </div>
              <div className="scorecard-item">
                <h4>{perf.orderFillRate}%</h4>
                <p>Fill Rate</p>
              </div>
              <div className="scorecard-item">
                <h4>
                  <span className={`badge ${perf.riskLevel === "Low" ? "badge-green" : perf.riskLevel === "Moderate" ? "badge-yellow" : "badge-red"}`}>
                    {perf.riskLevel}
                  </span>
                </h4>
                <p>Risk Level</p>
              </div>
            </div>
          ) : (
            <div className="empty-state"><p>No performance data</p></div>
          )}
        </div>
      </div>

      {/* Delivery History Chart */}
      {deliveryData.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><h3>Delivery History – Delay Days</h3></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="order" />
              <YAxis label={{ value: "Delay (days)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Bar dataKey="delay" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
