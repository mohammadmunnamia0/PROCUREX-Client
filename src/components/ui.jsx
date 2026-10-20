// Small presentational building blocks shared by all pages.
import { cloneElement, isValidElement, useId } from "react";
import { FiArrowUpRight, FiSearch, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z]+/g, "-");

/** Status is always shown as text + colour (never colour alone). */
export function StatusBadge({ status }) {
  return <span className={`badge badge-status badge-${slug(status)}`}>{status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-priority-${slug(priority)}`}>{priority}</span>;
}

export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, children }) {
  return (
    <div className="empty-state">
      {Icon && <Icon aria-hidden="true" />}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}

/** Stat tile: icon + label, big value, sub line, optional mini visual (children). */
export function KpiCard({ icon: Icon, tone = "blue", label, value, sub, subTone, to, className = "", children }) {
  const body = (
    <>
      <div className="kpi-head">
        <span className={`kpi-icon ${tone}`} aria-hidden="true">
          <Icon />
        </span>
        <span className="kpi-label">{label}</span>
        {to && <FiArrowUpRight className="kpi-go" aria-hidden="true" />}
      </div>
      <p className="kpi-value">{value}</p>
      {sub && <p className={`kpi-sub ${subTone ? `tone-${subTone}` : ""}`}>{sub}</p>}
      {children && <div className="kpi-extra">{children}</div>}
    </>
  );
  return to ? (
    <Link to={to} className={`kpi-card kpi-link ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={`kpi-card ${className}`}>{body}</div>
  );
}

/**
 * Tiny inline chart (decorative; the numbers are always shown as text nearby).
 * variant "area" draws a line with a soft fill, "bars" draws columns with the last one emphasised.
 */
export function Sparkline({ values, variant = "area", height = 44, color = "currentColor", muted, className = "" }) {
  const gradId = `spark${useId().replace(/:/g, "")}`;
  const max = Math.max(...values, 0);
  const w = 100;
  if (variant === "bars") {
    const gap = 2.2;
    const bw = (w - gap * (values.length - 1)) / values.length;
    return (
      <svg className={`sparkline ${className}`} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
        {values.map((v, i) => {
          const h = max ? Math.max((v / max) * height, v ? 2 : 1) : 1;
          return <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={1.5} fill={i === values.length - 1 ? color : muted || color} />;
        })}
      </svg>
    );
  }
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, max ? height - 3 - (v / max) * (height - 6) : height - 3]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <svg className={`sparkline ${className}`} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || "")).toUpperCase();
}

export function Field({ label, id, required, error, hint, children, className = "" }) {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {/* The visual * is hidden from screen readers; announce "required" instead. */}
      {required && isValidElement(children) ? cloneElement(children, { "aria-required": true }) : children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label = "Search" }) {
  return (
    <div className="search-input">
      <FiSearch aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange("")} aria-label="Clear search">
          <FiX />
        </button>
      )}
    </div>
  );
}

/** Clickable status chips with counts, used as a quick filter. */
export function StatusChips({ statuses, counts, value, onChange, allLabel = "All" }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="status-chips" role="group" aria-label="Filter by status">
      <button type="button" className={`chip ${value === "" ? "active" : ""}`} aria-pressed={value === ""} onClick={() => onChange("")}>
        {allLabel} <span className="chip-count">{total}</span>
      </button>
      {statuses.map((s) => (
        <button key={s} type="button" className={`chip ${value === s ? "active" : ""}`} aria-pressed={value === s} onClick={() => onChange(value === s ? "" : s)}>
          {s} <span className="chip-count">{counts[s] || 0}</span>
        </button>
      ))}
    </div>
  );
}

/** Horizontal bars as plain HTML: label + value text, bar is decorative. */
export function HBarList({ rows, formatValue, emptyText = "No data yet", maxValue }) {
  if (!rows.length || rows.every((r) => !r.value)) return <p className="muted chart-empty">{emptyText}</p>;
  const max = maxValue ?? Math.max(...rows.map((r) => r.value), 0);
  return (
    <ul className="hbar-list">
      {rows.map((r) => (
        <li key={r.key ?? r.label} className="hbar-row" title={r.title}>
          <div className="hbar-text">
            <span className="hbar-label">{r.label}</span>
            <span className="hbar-value">
              {formatValue ? formatValue(r.value, r) : r.value}
              {r.sub && <span className="hbar-sub"> {r.sub}</span>}
            </span>
          </div>
          <div className="hbar-track" aria-hidden="true">
            <div className="hbar-fill" style={{ width: `${max ? Math.max((r.value / max) * 100, r.value ? 1.5 : 0) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Stars({ rating }) {
  const r = Number(rating) || 0;
  return (
    <span className="stars" aria-label={`${r} out of 5`} title={`${r} out of 5`}>
      <span aria-hidden="true">{"★".repeat(r)}<span className="stars-off">{"★".repeat(Math.max(0, 5 - r))}</span></span>
    </span>
  );
}

export function DetailList({ items }) {
  return (
    <dl className="detail-list">
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([label, value]) => (
          <div key={label} className="detail-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
