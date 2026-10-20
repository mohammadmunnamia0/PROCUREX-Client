import { useState } from "react";
import { Link } from "react-router-dom";
import { FiLayers, FiX } from "react-icons/fi";
import { useProcurement } from "../store/ProcurementContext";
import { countSampleRecords } from "../store/sampleData";
import { SOURCES } from "../store/analytics";
import { daysBetween, formatDate, todayISO } from "../utils/dates";

const hideKey = (loadedAt) => `procurex:ui:hideSampleNotice:${loadedAt || ""}`;

function readHidden(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked: just show the notice
  }
}

/** Tells the viewer that demo records are present and how to manage them. */
export default function SampleNotice() {
  const { data } = useProcurement();
  const [, rerender] = useState(0);
  const counts = countSampleRecords(data);
  const loadedAt = data.settings.sampleLoadedAt;
  const key = hideKey(loadedAt);
  if (counts.purchaseOrders === 0 || readHidden(key)) return null;
  const stale = loadedAt && daysBetween(loadedAt.slice(0, 10), todayISO()) > 30;

  return (
    <div className="sample-notice" role="note">
      <span className="sample-notice-icon" aria-hidden="true">
        <FiLayers />
      </span>
      <p className="sample-notice-text">
        <strong>Sample data is loaded.</strong> {counts.purchaseOrders} demo purchase orders and {counts.requisitions} requisitions from the last 12 months are marked{" "}
        <span className="badge badge-sample">Sample</span> and kept separate from your own records.
        {stale && ` They were generated on ${formatDate(loadedAt.slice(0, 10))}; reload them to bring the dates up to date.`}
      </p>
      <Link to="/admin/data?section=sample" className="btn btn-sm btn-outline">
        Manage sample data
      </Link>
      <button
        type="button"
        className="btn-icon"
        aria-label="Hide this message"
        onClick={() => {
          try {
            localStorage.setItem(key, "1");
          } catch {
            // ignore – the notice simply stays visible
          }
          rerender((n) => n + 1);
        }}
      >
        <FiX />
      </button>
    </div>
  );
}

/** "All records / My records / Sample data" filter, shown only when sample data exists. */
export function SourceSelect({ value, onChange, data }) {
  if (countSampleRecords(data).total === 0 && value === "all") return null;
  return (
    <select className="form-control" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by data source">
      {SOURCES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
