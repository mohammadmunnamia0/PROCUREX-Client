// Client-side file downloads (no server involved).

// Byte-order mark so Excel opens UTF-8 CSV (₹, ৳, €) correctly.
const BOM = String.fromCharCode(0xfeff);

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename, value) {
  downloadFile(filename, JSON.stringify(value, null, 2), "application/json");
}

export function downloadCsv(filename, csv) {
  downloadFile(filename, BOM + csv, "text/csv;charset=utf-8");
}
