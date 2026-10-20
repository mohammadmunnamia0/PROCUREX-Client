import { useMemo, useState } from "react";
import { FiActivity } from "react-icons/fi";
import DataTable from "../components/DataTable";
import { EmptyState, PageHeader, SearchInput } from "../components/ui";
import { useProcurement } from "../store/ProcurementContext";
import { formatDateTime } from "../utils/dates";
import { MAX_ACTIVITY } from "../store/schema";

export default function ActivityLog() {
  const { data } = useProcurement();
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const entities = useMemo(() => [...new Set(data.activity.map((a) => a.entity))].sort(), [data.activity]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.activity.filter((a) => (!entity || a.entity === entity) && (!q || [a.message, a.ref, a.action].some((v) => v.toLowerCase().includes(q))));
  }, [data.activity, search, entity]);

  const columns = [
    { key: "at", header: "Time", render: (a) => <time dateTime={a.at} className="nowrap">{formatDateTime(a.at)}</time> },
    { key: "entity", header: "Record type" },
    { key: "action", header: "Action", render: (a) => <span className={`badge badge-action action-${a.action.toLowerCase().replace(/\s+/g, "-")}`}>{a.action}</span> },
    { key: "ref", header: "Reference", render: (a) => a.ref || <span className="muted">–</span> },
    { key: "message", header: "Details", sortable: false },
  ];

  return (
    <div>
      <PageHeader title="Activity Log" description={`Every change made in this browser, newest first (latest ${MAX_ACTIVITY} entries are kept).`} />
      <div className="card">
        {data.activity.length === 0 ? (
          <EmptyState icon={FiActivity} title="No activity yet" message="Changes you make in the Admin Panel are recorded here." />
        ) : (
          <>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search activity" />
              <select className="form-control" value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Filter by record type">
                <option value="">All record types</option>
                {entities.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              initialSort={{ key: "at", dir: "desc" }}
              pageSize={50}
              caption="Activity log"
              empty={<EmptyState icon={FiActivity} title="No activity matches your filters" />}
            />
          </>
        )}
      </div>
    </div>
  );
}
