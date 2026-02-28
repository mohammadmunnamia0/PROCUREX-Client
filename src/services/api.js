import axios from "axios";

const API = axios.create({ baseURL: "/api" });

// Response interceptor for global error logging
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "Network error";
    console.error(`API Error [${error.response?.status || "NETWORK"}]: ${message}`);
    return Promise.reject(error);
  }
);

// ===== Vendors =====
export const getVendors = (params) => API.get("/vendors", { params });
export const getVendor = (id) => API.get(`/vendors/${id}`);
export const createVendor = (data) => API.post("/vendors", data);
export const updateVendor = (id, data) => API.put(`/vendors/${id}`, data);
export const deleteVendor = (id) => API.delete(`/vendors/${id}`);
export const getVendorPerformance = (id) => API.get(`/vendors/${id}/performance`);

// ===== Purchase Requisitions =====
export const getPRs = (params) => API.get("/purchase-requisitions", { params });
export const getPR = (id) => API.get(`/purchase-requisitions/${id}`);
export const createPR = (data) => API.post("/purchase-requisitions", data);
export const updatePR = (id, data) => API.put(`/purchase-requisitions/${id}`, data);
export const submitPR = (id, data) => API.post(`/purchase-requisitions/${id}/submit`, data);
export const deletePR = (id) => API.delete(`/purchase-requisitions/${id}`);

// ===== Approvals =====
export const getApprovals = (params) => API.get("/approvals", { params });
export const getApproval = (id) => API.get(`/approvals/${id}`);
export const getApprovalByPR = (prId) => API.get(`/approvals/pr/${prId}`);
export const processApprovalStep = (id, data) => API.put(`/approvals/${id}/process`, data);

// ===== Purchase Orders =====
export const getPOs = (params) => API.get("/purchase-orders", { params });
export const getPO = (id) => API.get(`/purchase-orders/${id}`);
export const createPO = (data) => API.post("/purchase-orders", data);
export const updatePO = (id, data) => API.put(`/purchase-orders/${id}`, data);
export const deletePO = (id) => API.delete(`/purchase-orders/${id}`);

// ===== Goods Receipts =====
export const getGRNs = (params) => API.get("/goods-receipts", { params });
export const getGRN = (id) => API.get(`/goods-receipts/${id}`);
export const createGRN = (data) => API.post("/goods-receipts", data);
export const updateGRN = (id, data) => API.put(`/goods-receipts/${id}`, data);

// ===== Reports =====
export const getDashboard = () => API.get("/reports/dashboard");
export const getSpendByCategory = () => API.get("/reports/spend-by-category");
export const getVendorOnTimeReport = () => API.get("/reports/vendor-ontime");
export const getAuditLogs = (params) => API.get("/reports/audit-logs", { params });

export default API;
