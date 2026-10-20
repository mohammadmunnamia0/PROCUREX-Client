// Interactive analytics charts (Recharts). Every chart has hover tooltips with exact
// values, a legend for 2+ series, an empty state, and a text/table equivalent
// elsewhere on the page. Colours come from src/theme/palette.js.
import { useId, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiBarChart2 } from "react-icons/fi";
import { SERIES_COLORS } from "../theme/palette";
import { formatNumber, formatPercent, formatDays, pluralize } from "../utils/format";

const AXIS_TICK = { fontSize: 11, fill: "#667085" };
const GRID = "#eaecf0";
const SURFACE = "#ffffff";

/** Respect the OS "reduce motion" setting for chart animations. */
function subscribeMotion(cb) {
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  mq?.addEventListener?.("change", cb);
  return () => mq?.removeEventListener?.("change", cb);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches), () => false);
}

/** True on phone-sized screens (charts shorten axis labels). */
function subscribeNarrow(cb) {
  const mq = window.matchMedia?.("(max-width: 640px)");
  mq?.addEventListener?.("change", cb);
  return () => mq?.removeEventListener?.("change", cb);
}
export function useIsNarrow() {
  return useSyncExternalStore(subscribeNarrow, () => Boolean(window.matchMedia?.("(max-width: 640px)").matches), () => false);
}

export function ChartLegend({ items }) {
  return (
    <ul className="chart-legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className="swatch" style={{ background: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ message = "No data for this period." }) {
  return (
    <div className="chart-empty-state">
      <FiBarChart2 aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function TooltipBox({ title, total, rows, foot }) {
  return (
    <div className="chart-tooltip">
      {title && <p className="chart-tooltip-title">{title}</p>}
      {total !== undefined && <p className="chart-tooltip-total">{total}</p>}
      {rows?.map((r) => (
        <p key={r.label}>
          {r.color && <span className="key-line" style={{ background: r.color }} />}
          <strong>{r.value}</strong> <span className="muted">{r.label}</span>
        </p>
      ))}
      {foot && <p className="muted">{foot}</p>}
    </div>
  );
}

/** Rounds only the top-most non-empty segment of a stacked bar. */
function stackedShape(order) {
  return function StackedBar(props) {
    const { payload, seriesKey } = props;
    const idx = order.indexOf(seriesKey);
    const isTop = order.slice(idx + 1).every((k) => !payload?.[k]);
    return <Rectangle {...props} radius={isTop ? [4, 4, 0, 0] : [0, 0, 0, 0]} />;
  };
}

/** Recharts passes the hovered index in different shapes across versions. */
function pickBucket(series, state) {
  if (!state) return null;
  const idx = state.activeTooltipIndex ?? state.activeIndex;
  if (idx !== undefined && idx !== null && series[Number(idx)]) return series[Number(idx)];
  return series.find((s) => s.label === state.activeLabel) || null;
}

const chartBox = (height) => ({ width: "100%", height });

// ---------------------------------------------------------------------------
// 1. Monthly procurement expenditure (area)
// ---------------------------------------------------------------------------
export function ExpenditureChart({ series, money, moneyCompact, onSelect, height = 300 }) {
  const reduced = useReducedMotion();
  const gid = `spend${useId().replace(/:/g, "")}`;
  if (!series.some((s) => s.spend > 0)) return <ChartEmpty message="No approved, ordered or delivered purchase orders in this period." />;
  const color = SERIES_COLORS.spend;
  const showDots = series.length <= 16;
  return (
    <div style={chartBox(height)} className={onSelect ? "chart-clickable" : ""}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height }}>
        <AreaChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} onClick={onSelect ? (state) => { const b = pickBucket(series, state); if (b) onSelect(b); } : undefined}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d0d5dd" }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tickFormatter={moneyCompact} tickLine={false} axisLine={false} tick={AXIS_TICK} width={64} />
          <Tooltip
            cursor={{ stroke: "#a5b4fc", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload;
              return (
                <TooltipBox
                  title={b.longLabel}
                  total={money(b.spend)}
                  rows={[
                    { label: "delivered", value: money(b.deliveredSpend), color },
                    { label: b.orders === 1 ? "order placed" : "orders placed", value: formatNumber(b.orders, 0) },
                  ]}
                  foot={b.orders === 0 ? "No orders in this period" : onSelect ? "Click to explore this period" : undefined}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="spend"
            name="Committed spend"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gid})`}
            dot={showDots ? { r: 3, fill: color, stroke: SURFACE, strokeWidth: 2 } : false}
            activeDot={{ r: 6, fill: color, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={!reduced}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Purchase order trends (stacked columns by outcome)
// ---------------------------------------------------------------------------
const ORDER_SERIES = [
  { key: "ordersDelivered", label: "Delivered", color: SERIES_COLORS.ordersDelivered },
  { key: "ordersOpen", label: "Open (pending, approved, in transit)", color: SERIES_COLORS.ordersOpen },
  { key: "ordersDelayed", label: "Delayed", color: SERIES_COLORS.ordersDelayed },
  { key: "ordersCancelled", label: "Cancelled", color: SERIES_COLORS.ordersCancelled },
];

const OrderShape = stackedShape(ORDER_SERIES.map((s) => s.key));

export function OrderTrendsChart({ series, onSelect, height = 280 }) {
  const reduced = useReducedMotion();
  if (!series.some((s) => s.orders > 0)) return <ChartEmpty message="No purchase orders were placed in this period." />;
  return (
    <>
      <ChartLegend items={ORDER_SERIES.map((s) => ({ label: s.label.replace(/ \(.*\)$/, ""), color: s.color }))} />
      <div style={chartBox(height)} className={onSelect ? "chart-clickable" : ""}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height }}>
          <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="24%" onClick={onSelect ? (state) => { const b = pickBucket(series, state); if (b) onSelect(b); } : undefined}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d0d5dd" }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={14} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
            <Tooltip
              cursor={{ fill: "rgba(79,70,229,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const b = payload[0].payload;
                return (
                  <TooltipBox
                    title={b.longLabel}
                    total={pluralize(b.orders, "order")}
                    rows={ORDER_SERIES.filter((s) => b[s.key] > 0).map((s) => ({ label: s.label.replace(/ \(.*\)$/, "").toLowerCase(), value: b[s.key], color: s.color }))}
                    foot={b.orders === 0 ? "No orders in this period" : undefined}
                  />
                );
              }}
            />
            {ORDER_SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="orders" fill={s.color} stroke={SURFACE} strokeWidth={1} maxBarSize={28} isAnimationActive={!reduced} animationDuration={500} shape={(p) => <OrderShape {...p} seriesKey={s.key} />} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. Status distribution (doughnut)
// ---------------------------------------------------------------------------
export function StatusDonut({ statuses, money, size = 200, center = "orders", onSelect }) {
  const reduced = useReducedMotion();
  const total = statuses.reduce((s, x) => s + x.count, 0);
  if (!total) return <ChartEmpty message="No purchase orders in this period." />;
  const slices = statuses.filter((s) => s.count > 0);
  return (
    <div className="donut-layout">
      <div className="donut-wrap" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: size, height: size }}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="66%"
              outerRadius="96%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={!reduced}
              animationDuration={600}
              onClick={onSelect ? (d) => onSelect(d?.payload?.key ?? d?.key) : undefined}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} className={onSelect ? "chart-clickable" : undefined} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const s = payload[0].payload;
                return <TooltipBox title={s.label} total={pluralize(s.count, "order")} rows={[{ label: "of orders", value: formatPercent(s.share), color: s.color }, ...(money ? [{ label: "order value", value: money(s.value) }] : [])]} />;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-hidden="true">
          <strong>{formatNumber(total, 0)}</strong>
          <span>{center}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {statuses.map((s) => (
          <li key={s.key}>
            <span className="seg-dot" style={{ background: s.color }} aria-hidden="true" />
            <span className="donut-label">{s.label}</span>
            <span className="donut-count">{s.count}</span>
            <span className="donut-share">{formatPercent(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4/5. Horizontal ranked bars (category spend, supplier spend)
// ---------------------------------------------------------------------------
function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function RankedBarChart({ rows, valueKey = "value", nameKey = "name", labelKey = "labelText", colorKey = "color", tooltip, nameWidth = 150, maxChars = 22, rightPad = 96, emptyText }) {
  const reduced = useReducedMotion();
  if (!rows.length || rows.every((r) => !r[valueKey])) return <ChartEmpty message={emptyText} />;
  const height = rows.length * 34 + 12;
  return (
    <div style={chartBox(height)}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height }}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: rightPad, left: 0, bottom: 4 }} barCategoryGap={9}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey={nameKey} width={nameWidth} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#344054" }} tickFormatter={(v) => truncate(String(v), maxChars)} />
          <Tooltip cursor={{ fill: "rgba(79,70,229,0.05)" }} content={({ active, payload }) => (active && payload?.length ? tooltip(payload[0].payload) : null)} />
          <Bar dataKey={valueKey} barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={!reduced} animationDuration={500}>
            {rows.map((r) => (
              <Cell key={r.id ?? r[nameKey]} fill={r[colorKey]} />
            ))}
            <LabelList dataKey={labelKey} position="right" offset={8} style={{ fontSize: 11.5, fill: "#344054", fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function categoryTooltip(money) {
  return function CategoryTip(c) {
    return <TooltipBox title={c.name} total={money(c.value)} rows={[{ label: "of committed spend", value: formatPercent(c.share), color: c.color }, { label: c.count === 1 ? "order" : "orders", value: c.count }]} />;
  };
}

export function supplierTooltip(money) {
  return function SupplierTip(s) {
    return (
      <TooltipBox
        title={s.name}
        total={money(s.committedSpend)}
        rows={[
          { label: "on-time deliveries", value: formatPercent(s.onTimeRate), color: s.band.color },
          { label: s.poCount === 1 ? "order" : "orders", value: s.poCount },
          { label: "avg lead time", value: formatDays(s.avgLeadTime) },
        ]}
        foot={s.band.label}
      />
    );
  };
}

// ---------------------------------------------------------------------------
// 6. Delivery performance (on time vs late, by delivery date)
// ---------------------------------------------------------------------------
const DELIVERY_SERIES = [
  { key: "onTime", label: "On time", color: SERIES_COLORS.onTime },
  { key: "late", label: "Late", color: SERIES_COLORS.late },
];

const DeliveryShape = stackedShape(DELIVERY_SERIES.map((s) => s.key));

export function DeliveryPerformanceChart({ series, onSelect, height = 280 }) {
  const reduced = useReducedMotion();
  if (!series.some((s) => s.deliveries > 0)) return <ChartEmpty message="No deliveries were received in this period." />;
  return (
    <>
      <ChartLegend items={DELIVERY_SERIES} />
      <div style={chartBox(height)} className={onSelect ? "chart-clickable" : ""}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height }}>
          <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="24%" onClick={onSelect ? (state) => { const b = pickBucket(series, state); if (b) onSelect(b); } : undefined}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d0d5dd" }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={14} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
            <Tooltip
              cursor={{ fill: "rgba(79,70,229,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const b = payload[0].payload;
                return (
                  <TooltipBox
                    title={b.longLabel}
                    total={b.deliveries ? `${formatPercent(b.onTimeRate)} on time` : "No deliveries"}
                    rows={b.deliveries ? [{ label: "on time", value: b.onTime, color: SERIES_COLORS.onTime }, { label: "late", value: b.late, color: SERIES_COLORS.late }] : []}
                    foot={b.deliveries ? `Avg lead time ${formatDays(b.avgLeadTime)}` : undefined}
                  />
                );
              }}
            />
            {DELIVERY_SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} stackId="delivery" fill={s.color} stroke={SURFACE} strokeWidth={1} maxBarSize={28} isAnimationActive={!reduced} animationDuration={500} shape={(p) => <DeliveryShape {...p} seriesKey={s.key} />} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
