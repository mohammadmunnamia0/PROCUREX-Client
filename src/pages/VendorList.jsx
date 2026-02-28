import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiStar } from "react-icons/fi";
import { getVendors, createVendor, updateVendor, deleteVendor } from "../services/api";
import { useDebounce } from "../hooks/useDebounce";

export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return {
      name: "", email: "", phone: "", taxId: "",
      category: "General", status: "Active", rating: 3,
      leadTimeDays: 7, paymentTerms: "Net 30", notes: "",
      address: { street: "", city: "", state: "", country: "", zip: "" },
      bankInfo: { bankName: "", accountNumber: "", ifscCode: "" },
    };
  }

  const fetchVendors = () => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    getVendors(params)
      .then((res) => setVendors(res.data))
      .catch((err) => console.error("Failed to load vendors:", err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchVendors(); }, [debouncedSearch, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateVendor(editing, form);
      } else {
        await createVendor(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm(getEmptyForm());
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleEdit = (vendor) => {
    setEditing(vendor._id);
    setForm({
      name: vendor.name, email: vendor.email, phone: vendor.phone,
      taxId: vendor.taxId, category: vendor.category, status: vendor.status,
      rating: vendor.rating, leadTimeDays: vendor.leadTimeDays,
      paymentTerms: vendor.paymentTerms, notes: vendor.notes || "",
      address: vendor.address || {},
      bankInfo: vendor.bankInfo || {},
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await deleteVendor(id);
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vendor Management</h2>
          <p>Manage your vendor database</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(getEmptyForm()); setShowModal(true); }}>
          <FiPlus /> Add Vendor
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : vendors.length === 0 ? (
          <div className="empty-state">
            <FiSearch />
            <h3>No vendors found</h3>
            <p>Add your first vendor to get started</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Lead Time</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v._id}>
                    <td><strong>{v.vendorId}</strong></td>
                    <td>{v.name}</td>
                    <td>{v.email}</td>
                    <td>{v.category}</td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <FiStar style={{ color: "#f59e0b" }} /> {v.rating}
                      </span>
                    </td>
                    <td>{v.leadTimeDays} days</td>
                    <td>{v.paymentTerms}</td>
                    <td>
                      <span className={`badge ${v.status === "Active" ? "badge-green" : "badge-red"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Link to={`/vendors/${v._id}`} className="btn-icon"><FiEye /></Link>
                        <button className="btn-icon" onClick={() => handleEdit(v)}><FiEdit2 /></button>
                        <button className="btn-icon" onClick={() => handleDelete(v._id)} style={{ color: "#dc2626" }}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? "Edit Vendor" : "Add New Vendor"}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input className="form-control" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input className="form-control" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tax ID *</label>
                  <input className="form-control" required value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Category</label>
                  <input className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Rating (0-5)</label>
                  <input className="form-control" type="number" min="0" max="5" step="0.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Lead Time (days)</label>
                  <input className="form-control" type="number" min="1" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: +e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Terms</label>
                  <select className="form-control" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                    <option>Immediate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Active</option>
                    <option>Blocked</option>
                  </select>
                </div>
              </div>

              <h4 style={{ margin: "16px 0 8px", fontSize: "0.9rem" }}>Address</h4>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Street</label>
                  <input className="form-control" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input className="form-control" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input className="form-control" value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Country</label>
                  <input className="form-control" value={form.address.country} onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>ZIP</label>
                  <input className="form-control" value={form.address.zip} onChange={(e) => setForm({ ...form, address: { ...form.address, zip: e.target.value } })} />
                </div>
              </div>

              <h4 style={{ margin: "16px 0 8px", fontSize: "0.9rem" }}>Bank Information</h4>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input className="form-control" value={form.bankInfo.bankName} onChange={(e) => setForm({ ...form, bankInfo: { ...form.bankInfo, bankName: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input className="form-control" value={form.bankInfo.accountNumber} onChange={(e) => setForm({ ...form, bankInfo: { ...form.bankInfo, accountNumber: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input className="form-control" value={form.bankInfo.ifscCode} onChange={(e) => setForm({ ...form, bankInfo: { ...form.bankInfo, ifscCode: e.target.value } })} />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? "Update" : "Create"} Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
