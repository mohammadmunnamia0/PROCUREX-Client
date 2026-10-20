// Number / currency formatting with cached Intl formatters.

const cache = new Map();

function formatter(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

export function formatCurrency(value, currency = "INR") {
  const n = Number(value) || 0;
  try {
    return formatter(`cur:${currency}`, () =>
      new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Short form for KPI cards and axis ticks, e.g. ₹12.4K. */
export function formatCurrencyCompact(value, currency = "INR") {
  const n = Number(value) || 0;
  if (Math.abs(n) < 1000) {
    try {
      return formatter(`cur0:${currency}`, () =>
        new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 })
      ).format(n);
    } catch {
      return `${currency} ${Math.round(n)}`;
    }
  }
  const digits = Math.abs(n) >= 1e6 ? 2 : 1; // ₹2.03M, ₹846.6K
  try {
    return formatter(`curc:${currency}:${digits}`, () =>
      new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", maximumFractionDigits: digits })
    ).format(n);
  } catch {
    return `${currency} ${(n / 1000).toFixed(1)}K`;
  }
}

export function formatNumber(value, maximumFractionDigits = 2) {
  const n = Number(value) || 0;
  return formatter(`num:${maximumFractionDigits}`, () => new Intl.NumberFormat(undefined, { maximumFractionDigits })).format(n);
}

/** `rate` is 0–100 or null when there is nothing to measure. */
export function formatPercent(rate) {
  return rate === null || rate === undefined || Number.isNaN(rate) ? "–" : `${Math.round(rate)}%`;
}

export function formatDays(days) {
  if (days === null || days === undefined || Number.isNaN(days)) return "–";
  const rounded = Math.round(days * 10) / 10;
  return `${formatNumber(rounded, 1)} ${rounded === 1 ? "day" : "days"}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
