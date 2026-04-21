import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { toast } from "react-toastify";
import { FiBox } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { label: "Admin", email: "admin@orderflow.com" },
    { label: "Sales", email: "sales@orderflow.com" },
    { label: "Warehouse", email: "warehouse@orderflow.com" },
    { label: "Viewer", email: "viewer@orderflow.com" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <FiBox className="auth-logo" />
        </div>
        <h1>ORDERFLOW</h1>
        <p className="subtitle">Inventory & Order Management System</p>

        <div className="demo-credentials">
          <p>Quick demo sign-in (password: <strong>password123</strong>)</p>
          <div className="demo-grid">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="demo-chip"
                onClick={() => setForm({ email: account.email, password: "password123" })}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
