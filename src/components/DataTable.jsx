import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

/**
 * Sortable, paginated table.
 * columns: [{ key, header, render(row), sortValue(row), align: 'right', sortable: false, className }]
 */
export default function DataTable({ columns, rows, rowKey = "id", initialSort, pageSize = 25, empty, rowClassName, caption }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue || ((r) => r[col.key]);
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const emptyA = va === null || va === undefined || va === "";
      const emptyB = vb === null || vb === undefined || vb === "";
      if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1; // blanks last
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);

  function toggleSort(key) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(0);
  }

  if (rows.length === 0) return empty || null;

  return (
    <>
      <div className="table-container">
        <table className="data-table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${col.align === "right" ? "num" : ""} ${col.className || ""}`}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {sortable ? (
                      <button type="button" className="th-sort" onClick={() => toggleSort(col.key)}>
                        {col.header}
                        <span className={`sort-icon ${active ? "active" : ""}`} aria-hidden="true">
                          {active && sort.dir === "desc" ? <FiChevronDown /> : <FiChevronUp />}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row[rowKey]} className={rowClassName ? rowClassName(row) : undefined}>
                {columns.map((col) => (
                  <td key={col.key} className={`${col.align === "right" ? "num" : ""} ${col.className || ""}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="pagination">
          <span>
            Showing {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
          </span>
          <div className="pagination-buttons">
            <button type="button" className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button type="button" className="btn btn-sm btn-outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
