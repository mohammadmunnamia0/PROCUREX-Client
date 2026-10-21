// Colour system shared by charts, badges and swatches (plain hex so pure metric
// modules can attach colours without importing CSS). All sets below were checked
// with the dataviz palette validator; colour never carries meaning alone – every
// chart also shows labels, legends, tooltips or a table.

/** Status colours. Order matters for the donut: no green↔red or green↔amber neighbours. */
export const STATUS_COLORS = {
  Delivered: "#17b26a",
  "In transit": "#0ba5ec",
  Ordered: "#0ba5ec",
  Delayed: "#f04438",
  Approved: "#6366f1",
  Pending: "#f79009",
  Cancelled: "#98a2b3",
  Rejected: "#f04438",
};

/** Display statuses used in analytics (Delayed / In transit are derived from Ordered). */
export const DISPLAY_STATUSES = ["Delivered", "In transit", "Delayed", "Approved", "Pending", "Cancelled"];

/** Categorical slots, fixed order (indigo-led; adjacent CVD ΔE ≥ 9.1, normal-vision ≥ 19.6). */
export const CATEGORY_PALETTE = ["#4f46e5", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#0ea5e9", "#e34948"];
export const OTHER_COLOR = "#98a2b3";

export const SERIES_COLORS = {
  spend: "#4f46e5",
  delivered: "#4f46e5",
  open: "#818cf8",
  onTime: "#4f46e5", // on-time vs late uses indigo/orange (CVD ΔE 31) rather than green/red
  late: "#eb6834",
  ordersDelivered: STATUS_COLORS.Delivered,
  ordersOpen: STATUS_COLORS.Approved,
  ordersDelayed: STATUS_COLORS.Delayed,
  ordersCancelled: STATUS_COLORS.Cancelled,
};

/** Supplier reliability bands by on-time delivery rate. */
export const RELIABILITY_BANDS = [
  { key: "reliable", label: "Reliable (90%+ on time)", min: 90, color: "#17b26a" },
  { key: "watch", label: "Watch (70–89%)", min: 70, color: "#f79009" },
  { key: "risk", label: "At risk (below 70%)", min: 0, color: "#f04438" },
];
export const NO_DATA_BAND = { key: "none", label: "No deliveries yet", color: "#98a2b3" };

export function reliabilityBand(onTimeRate) {
  if (onTimeRate === null || onTimeRate === undefined) return NO_DATA_BAND;
  return RELIABILITY_BANDS.find((b) => onTimeRate >= b.min) || RELIABILITY_BANDS[RELIABILITY_BANDS.length - 1];
}

/**
 * Category colour follows the category (its creation order), never its spend rank.
 * Ties (categories created in the same instant, like the defaults) keep list order –
 * never random IDs – so every browser shows the same colours.
 */
export function categoryColorMap(categories) {
  const ordered = categories
    .map((c, index) => ({ c, index }))
    .sort((a, b) => (a.c.createdAt || "").localeCompare(b.c.createdAt || "") || a.index - b.index)
    .map(({ c }) => c);
  return new Map(ordered.map((c, i) => [c.id, i < CATEGORY_PALETTE.length ? CATEGORY_PALETTE[i] : OTHER_COLOR]));
}

/** Soft, decorative avatar colours picked by a stable hash of the name. */
const AVATARS = [
  ["#eef2ff", "#4338ca"],
  ["#fff4ed", "#c4320a"],
  ["#ecfdf3", "#067647"],
  ["#fffaeb", "#b54708"],
  ["#fdf2fa", "#c11574"],
  ["#f0f9ff", "#026aa2"],
  ["#f4f3ff", "#5925dc"],
  ["#fef3f2", "#b42318"],
];

export function avatarColors(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATARS[h % AVATARS.length];
  return { background: bg, color: fg };
}
