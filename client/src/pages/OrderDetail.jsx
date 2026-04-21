import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "@/services/api.js";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await API.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      toast.error("Failed to load order");
      navigate("/orders");
    }
    setLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!order) return null;

  const statusSteps = ["Draft", "Confirmed", "Packed", "Shipped", "Delivered"];
  const currentIdx = statusSteps.indexOf(order.status);
  const isCancelled = order.status === "Cancelled";

  return (
    <div>
      <button className="btn btn-outline order-back-btn" onClick={() => navigate("/orders")}>
        <FiArrowLeft /> Back to Orders
      </button>

      <div className="card order-detail-card">
        <div className="card-header card-header-inline">
          <span>Order {order.orderNumber}</span>
          <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
        </div>
        <div className="card-body">
          {/* Status Timeline */}
          {!isCancelled && (
            <div className="order-timeline">
              {statusSteps.map((step, i) => (
                <div
                  key={step}
                  className={`order-step${i <= currentIdx ? " done" : ""}${i === currentIdx ? " current" : ""}`}
                >
                  {step}
                </div>
              ))}
            </div>
          )}
          {isCancelled && <div className="alert alert-danger order-cancelled-alert">This order has been cancelled.</div>}

          <div className="order-detail-grid">
            <div>
              <h4 className="order-section-title">Customer</h4>
              <p><strong>{order.customer?.name}</strong></p>
              <p>{order.customer?.email}</p>
              <p>{order.customer?.phone}</p>
              <p>{order.customer?.address}, {order.customer?.city}</p>
            </div>
            <div>
              <h4 className="order-section-title">Order Info</h4>
              <p><strong>Warehouse:</strong> {order.warehouse}</p>
              <p><strong>Created By:</strong> {order.createdBy?.name}</p>
              <p><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              {order.confirmedAt && <p><strong>Confirmed:</strong> {new Date(order.confirmedAt).toLocaleString()}</p>}
              {order.shippedAt && <p><strong>Shipped:</strong> {new Date(order.shippedAt).toLocaleString()}</p>}
              {order.deliveredAt && <p><strong>Delivered:</strong> {new Date(order.deliveredAt).toLocaleString()}</p>}
              {order.trackingNumber && <p><strong>Tracking:</strong> {order.carrierName} — {order.trackingNumber}</p>}
              {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Order Items</div>
        <div className="card-body table-container">
          <table>
            <thead>
              <tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td><strong>{item.sku}</strong></td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td><strong>${item.total.toFixed(2)}</strong></td>
                </tr>
              ))}
              <tr className="order-total-row">
                <td colSpan={4} className="order-total-label">Total Amount</td>
                <td><strong className="order-total-value">${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
