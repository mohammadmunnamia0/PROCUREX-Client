import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiClock, FiDollarSign, FiEdit2, FiPlus, FiShoppingCart, FiTruck, FiUserX } from "react-icons/fi";
import DataTable from "../../components/DataTable";
import { DetailList, EmptyState, KpiCard, PageHeader, SampleBadge, Stars, StatusBadge } from "../../components/ui";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormatters } from "../../hooks/useFormatters";
import { PO_STATUSES } from "../../store/schema";
import { EMPTY_SUPPLIER_STATS, lookup, supplierStats, UNCATEGORIZED } from "../../store/metrics";
import { isOverdue, poTotal } from "../../store/records";
import { formatDate, todayISO } from "../../utils/dates";
import { formatDays, formatPercent } from "../../utils/format";
import SupplierForm from "./SupplierForm";
import PurchaseOrderForm from "./PurchaseOrderForm";
import { PurchaseOrderView } from "./RecordViews";
import { ExpectedDateCell, PurchaseOrderActions } from "./PurchaseOrders";
import { useWorkflow } from "./workflow";

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useProcurement();
  const { money, moneyCompact } = useFormatters();
  const workflow = useWorkflow();
  const today = todayISO();
  const [editingSupplier, setEditingSupplier] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [viewing, setViewing] = useState(null);

  const supplier = data.suppliers.find((s) => s.id === id);
  const pos = useMemo(() => data.purchaseOrders.filter((p) => p.supplierId === id), [data.purchaseOrders, id]);
  const stats = useMemo(() => supplierStats(pos).get(id) || EMPTY_SUPPLIER_STATS, [pos, id]);
  const categories = lookup(data.categories);

  if (!supplier) {
    return (
      <div className="card">
        <EmptyState icon={FiUserX} title="Supplier not found" message="It may have been deleted.">
          <Link to="/admin/suppliers" className="btn btn-primary">
            Back to suppliers
          </Link>
        </EmptyState>
      </div>
    );
  }

  const columns = [
    {
      key: "number",
      header: "PO #",
      render: (p) => (
        <span className="nowrap">
          <strong>{p.number}</strong> <SampleBadge record={p} />
        </span>
      ),
    },
    { key: "category", header: "Category", sortValue: (p) => categories.get(p.categoryId)?.name || "", render: (p) => categories.get(p.categoryId)?.name || UNCATEGORIZED },
    { key: "orderDate", header: "Ordered", className: "nowrap", render: (p) => formatDate(p.orderDate) },
    { key: "expectedDeliveryDate", header: "Expected", className: "nowrap", render: (p) => <ExpectedDateCell po={p} today={today} /> },
    { key: "actualDeliveryDate", header: "Delivered", className: "nowrap", render: (p) => (p.actualDeliveryDate ? formatDate(p.actualDeliveryDate) : "–") },
    { key: "total", header: "Total", align: "right", sortValue: poTotal, render: (p) => money(poTotal(p)) },
    { key: "status", header: "Status", sortValue: (p) => PO_STATUSES.indexOf(p.status), render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: "actions-col",
      render: (p) => <PurchaseOrderActions po={p} workflow={workflow} onView={setViewing} onEdit={setEditingPO} />,
    },
  ];

  return (
    <div>
      <PageHeader
        back={
          <Link to="/admin/suppliers" className="back-link">
            <FiArrowLeft aria-hidden="true" /> Suppliers
          </Link>
        }
        title={supplier.name}
        description={`${supplier.code} · ${categories.get(supplier.categoryId)?.name || "No primary category"}`}
        actions={
          <>
            <SampleBadge record={supplier} />
            <StatusBadge status={supplier.status} />
            <button type="button" className="btn btn-outline" onClick={() => setEditingSupplier(true)}>
              <FiEdit2 /> Edit
            </button>
            {supplier.status === "Active" && (
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/purchase-orders?new=1&supplier=${supplier.id}`)}>
                <FiPlus /> New order
              </button>
            )}
          </>
        }
      />

      <div className="kpi-grid kpi-grid-4">
        <KpiCard icon={FiShoppingCart} label="Purchase orders" value={stats.poCount} sub={`${stats.openOrders} open`} />
        <KpiCard icon={FiDollarSign} tone="green" label="Committed spend" value={moneyCompact(stats.committedSpend)} sub={money(stats.committedSpend)} />
        <KpiCard
          icon={FiTruck}
          tone="cyan"
          label="On-time delivery"
          value={formatPercent(stats.onTimeRate)}
          sub={`${stats.deliveredCount} delivered${pos.some((p) => isOverdue(p, today)) ? " · has overdue orders" : ""}`}
          subTone={pos.some((p) => isOverdue(p, today)) ? "bad" : undefined}
        />
        <KpiCard icon={FiClock} tone="amber" label="Avg lead time" value={formatDays(stats.avgLeadTime)} sub={`Quoted: ${supplier.leadTimeDays} days`} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Contact</h3>
          </div>
          <DetailList
            items={[
              ["Contact person", supplier.contactPerson],
              ["Email", <a key="e" href={`mailto:${supplier.email}`}>{supplier.email}</a>],
              ["Phone", <a key="p" href={`tel:${supplier.phone.replace(/\s/g, "")}`}>{supplier.phone}</a>],
              ["Address", [supplier.address, supplier.city, supplier.country].filter(Boolean).join(", ")],
            ]}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Commercial terms</h3>
          </div>
          <DetailList
            items={[
              ["Payment terms", supplier.paymentTerms],
              ["Quoted lead time", `${supplier.leadTimeDays} days`],
              ["Rating", <Stars key="r" rating={supplier.rating} />],
              ["Tax ID", supplier.taxId],
              ["Last order", stats.lastOrderDate ? formatDate(stats.lastOrderDate) : ""],
              ["Notes", supplier.notes],
            ]}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Purchase order history</h3>
        </div>
        <DataTable
          columns={columns}
          rows={pos}
          initialSort={{ key: "orderDate", dir: "desc" }}
          caption={`Purchase orders for ${supplier.name}`}
          rowClassName={(p) => (isOverdue(p, today) ? "row-overdue" : undefined)}
          empty={<EmptyState icon={FiShoppingCart} title="No purchase orders with this supplier yet" />}
        />
      </div>

      {editingSupplier && <SupplierForm supplier={supplier} onClose={() => setEditingSupplier(false)} />}
      {editingPO && <PurchaseOrderForm po={editingPO} onClose={() => setEditingPO(null)} />}
      {viewing && <PurchaseOrderView po={data.purchaseOrders.find((p) => p.id === viewing.id) || viewing} onClose={() => setViewing(null)} />}
      {workflow.element}
    </div>
  );
}
