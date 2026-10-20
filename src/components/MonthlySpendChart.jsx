import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Ordinal pair from one indigo hue (validated): open commitments light, delivered dark.
const COLOR_DELIVERED = "#4f46e5";
const COLOR_OPEN = "#818cf8";
const SURFACE = "#ffffff";

function ChartTooltip({ active, payload, money }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{m.longLabel}</p>
      <p className="chart-tooltip-total">{money(m.total)}</p>
      <p>
        <span className="key-line" style={{ background: COLOR_DELIVERED }} /> {money(m.delivered)} <span className="muted">delivered</span>
      </p>
      <p>
        <span className="key-line" style={{ background: COLOR_OPEN }} /> {money(m.open)} <span className="muted">open (approved / ordered)</span>
      </p>
      <p className="muted">{m.count} {m.count === 1 ? "order" : "orders"}</p>
    </div>
  );
}

/** Committed spend per month, stacked delivered + open, with a table view twin. */
export default function MonthlySpendChart({ months, money, moneyCompact }) {
  const [view, setView] = useState("chart");
  const hasData = months.some((m) => m.total > 0);

  return (
    <div className="monthly-chart">
      <div className="chart-controls">
        <div className="legend" aria-hidden={view === "table"}>
          <span className="legend-item">
            <span className="swatch" style={{ background: COLOR_DELIVERED }} /> Delivered
          </span>
          <span className="legend-item">
            <span className="swatch" style={{ background: COLOR_OPEN }} /> Open commitments
          </span>
        </div>
        <div className="segmented" role="group" aria-label="Display as">
          <button type="button" className={view === "chart" ? "active" : ""} aria-pressed={view === "chart"} onClick={() => setView("chart")}>
            Chart
          </button>
          <button type="button" className={view === "table" ? "active" : ""} aria-pressed={view === "table"} onClick={() => setView("table")}>
            Table
          </button>
        </div>
      </div>

      {!hasData ? (
        <p className="muted chart-empty">No approved, ordered or delivered purchase orders in the last 12 months.</p>
      ) : view === "chart" ? (
        <div className="chart-box" role="img" aria-label="Monthly committed procurement spend for the last 12 months. Use the Table view for exact values.">
          {/* initialDimension avoids a zero-size first render before the box is measured */}
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
            <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#eaecf0" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d0d5dd" }} tick={{ fontSize: 11, fill: "#667085" }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tickFormatter={moneyCompact} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#667085" }} width={64} />
              <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
              <Bar dataKey="delivered" stackId="spend" fill={COLOR_DELIVERED} stroke={SURFACE} strokeWidth={1} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="open" stackId="spend" fill={COLOR_OPEN} stroke={SURFACE} strokeWidth={1} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="table-container chart-table">
          <table className="data-table compact">
            <caption className="sr-only">Monthly committed spend</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="num">Orders</th>
                <th scope="col" className="num">Delivered</th>
                <th scope="col" className="num">Open</th>
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.key}>
                  <td>{m.longLabel}</td>
                  <td className="num">{m.count}</td>
                  <td className="num">{money(m.delivered)}</td>
                  <td className="num">{money(m.open)}</td>
                  <td className="num strong">{money(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
