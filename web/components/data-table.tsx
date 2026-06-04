"use client";

import { useState } from "react";

type ColumnDef = { key: string; label: string; render?: (row: Record<string, any>) => React.ReactNode } | string;

type Props = {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  pageSize?: number;
};

function colKey(c: ColumnDef): string { return typeof c === "string" ? c : c.key; }
function colLabel(c: ColumnDef): string { return typeof c === "string" ? c : c.label; }

export function DataTable({ columns, rows, pageSize = 15 }: Props) {
  const [page,    setPage]    = useState(0);
  const [search,  setSearch]  = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = rows.filter((row) =>
    Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const visible    = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
    setPage(0);
  }

  const getBadgeStyle = (value: string) => {
    const v = value.toUpperCase();
    if (["CONFIRMED","SUCCESS","PAID","APPROVED","ACTIVE","PRESENT","PUBLISHED"].includes(v))
      return { background: "rgba(5,150,105,0.1)", color: "#059669", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 };
    if (["PENDING","PROCESSING"].includes(v))
      return { background: "rgba(245,158,11,0.1)", color: "#b45309", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 };
    if (["FAILED","REJECTED","ABSENT","CANCELLED"].includes(v))
      return { background: "rgba(220,38,38,0.08)", color: "#dc2626", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 };
    return null;
  };

  return (
    <div className="data-table" style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      {/* Toolbar */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="🔍 Search records..."
          style={{ padding: "8px 14px", border: "1.5px solid var(--line)", borderRadius: 10, fontSize: 13, width: 240, outline: "none", background: "white", transition: "border-color 0.2s" }}
        />
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ borderRadius: 0 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={colKey(col)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => handleSort(colKey(col))}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {colLabel(col)}
                    {sortKey === colKey(col) && <span style={{ fontSize: 11, opacity: 0.7 }}>{sortAsc ? "↑" : "↓"}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>No records found</div>
                  {search && <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search query</div>}
                </td>
              </tr>
            ) : (
              visible.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => {
                    if (typeof col !== "string" && col.render) {
                      return (
                        <td key={colKey(col)}>
                          {col.render(row)}
                        </td>
                      );
                    }
                    const rawVal = row[colKey(col)];
                    const val = String(rawVal ?? "—");
                    const badgeStyle = getBadgeStyle(val);
                    return (
                      <td key={colKey(col)}>
                        {badgeStyle ? <span style={badgeStyle}>{val}</span> : val}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--line)", background: "#f8fafc", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn-ghost" onClick={() => setPage(0)} disabled={page === 0} style={{ padding: "6px 10px", fontSize: 12 }}>«</button>
            <button type="button" className="btn-ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "6px 12px", fontSize: 13 }}>‹ Prev</button>
            <span style={{ padding: "6px 12px", fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{page + 1} / {totalPages}</span>
            <button type="button" className="btn-ghost" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ padding: "6px 12px", fontSize: 13 }}>Next ›</button>
            <button type="button" className="btn-ghost" onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} style={{ padding: "6px 10px", fontSize: 12 }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
