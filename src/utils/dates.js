// Date helpers. Date-only values are stored as "YYYY-MM-DD" strings so they never
// shift with the user's timezone. All arithmetic is done in UTC on those strings.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

export function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Local calendar date of a Date object as YYYY-MM-DD (not UTC, unlike toISOString). */
export function toLocalISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toLocalISODate(new Date());

function toUTC(value) {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from, to) {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function addDays(value, days) {
  const dt = new Date(toUTC(value) + days * DAY_MS);
  return dt.toISOString().slice(0, 10);
}

export const monthKey = (value) => value.slice(0, 7);

const monthShortFormatter = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" });
const monthLongFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const dayMonthFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

/** "Oct ’26" – avoids "Oct 26", which reads like a date. */
export const monthLabel = (dt) => `${monthShortFormatter.format(dt)} ’${String(dt.getUTCFullYear()).slice(2)}`;
export const monthLongLabel = (dt) => monthLongFormatter.format(dt);
export const dayMonthLabel = (value) => dayMonthFormatter.format(new Date(toUTC(value)));

/** First day of the month `monthsBack` months before the month of `value`. */
export function firstOfMonth(value, monthsBack = 0) {
  const [y, m] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - monthsBack, 1)).toISOString().slice(0, 10);
}

export function lastOfMonth(value) {
  const [y, m] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Monday of the week containing `value`. */
export function startOfWeek(value) {
  const day = new Date(toUTC(value)).getUTCDay(); // 0 = Sunday
  return addDays(value, -((day + 6) % 7));
}

/** The last `count` calendar months ending with the month of `today`, oldest first. */
export function lastNMonths(today, count) {
  const [y, m] = today.split("-").map(Number);
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = dt.toISOString().slice(0, 7);
    months.push({ key, label: monthLabel(dt), longLabel: monthLongLabel(dt) });
  }
  return months;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export function formatDate(value) {
  if (!isValidDate(value)) return "–";
  return dateFormatter.format(new Date(toUTC(value)));
}

export function formatDateTime(iso) {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "–" : dateTimeFormatter.format(dt);
}

export function formatTime(iso) {
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "–" : timeFormatter.format(dt);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", or a date for older entries. */
export function formatRelative(iso, nowMs = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "–";
  const diff = Math.max(0, nowMs - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  return formatDateTime(iso);
}
