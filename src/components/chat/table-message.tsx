"use client";

import { useState, useMemo } from "react";
import { Expand, Download, Table2, ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TableConfig } from "./visualization-types";

interface TableMessageProps {
  config: TableConfig;
  onExpand?: () => void;
}

export function TableMessage({ config, onExpand }: TableMessageProps) {
  const {
    title,
    description,
    columns,
    data,
    pagination = true,
    pageSize = 10,
    searchable = true,
    exportable = true,
  } = config;

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col) => col.key))
  );

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const parts = String(text).split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!search) return data;
    const lower = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val?.toString().toLowerCase().includes(lower);
      })
    );
  }, [data, search, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = pagination
    ? sortedData.slice(page * pageSize, (page + 1) * pageSize)
    : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return "—";

    switch (type) {
      case "bytes":
        const bytes = Number(value);
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

      case "date":
        return new Date(value).toLocaleDateString();

      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(value));

      case "status":
        const statusColors: Record<string, string> = {
          COMPLETED: "bg-emerald-500/20 text-emerald-400",
          FAILED: "bg-red-500/20 text-red-400",
          PENDING: "bg-amber-500/20 text-amber-400",
          UPLOADING: "bg-blue-500/20 text-blue-400",
          CANCELLED: "bg-zinc-500/20 text-zinc-400",
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[value] || "bg-zinc-700"}`}>
            {value}
          </span>
        );

      case "number":
        return Number(value).toLocaleString();

      default:
        return String(value);
    }
  };

  const handleExportCSV = () => {
    const visibleCols = columns.filter((col) => visibleColumns.has(col.key));
    const headers = visibleCols.map((c) => c.label).join(",");
    const rows = sortedData
      .map((row) => visibleCols.map((c) => `"${row[c.key] ?? ""}"`).join(","))
      .join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "table-data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel (lazy load XLSX from CDN)
  const handleExportExcel = async () => {
    try {
      // Load XLSX from CDN if not already loaded
      if (!(window as any).XLSX) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load XLSX"));
          document.head.appendChild(script);
        });
      }

      const XLSX = (window as any).XLSX;
      const visibleCols = columns.filter((col) => visibleColumns.has(col.key));
      
      const excelData = [
        visibleCols.map((col) => col.label),
        ...sortedData.map((row) => visibleCols.map((col) => row[col.key] ?? "")),
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${title || "table-data"}.xlsx`);
    } catch (error) {
      console.error("Excel export failed, falling back to CSV:", error);
      handleExportCSV();
    }
  };

  const toggleColumn = (key: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(key)) {
      if (newVisible.size > 1) newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleColumns(newVisible);
  };

  const visibleColumnsArray = columns.filter((col) => visibleColumns.has(col.key));

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-foreground">{title || "Data Table"}</span>
          <span className="text-xs text-muted-foreground">({sortedData.length} rows)</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Column visibility dropdown */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1"
              title="Toggle columns"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px] hidden group-hover:block z-10">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-zinc-600"
                  />
                  <span className="text-zinc-300">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* JSON view */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowJson(!showJson)}
            title="View JSON"
          >
            <Code2 className="w-3.5 h-3.5" />
          </Button>

          {/* Export dropdown */}
          {exportable && (
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1"
                title="Export"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[100px] hidden group-hover:block z-10">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 w-full text-left text-xs text-zinc-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 w-full text-left text-xs text-zinc-300"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
            </div>
          )}

          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={onExpand}
              title="Expand"
            >
              <Expand className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="px-4 py-2 text-sm text-muted-foreground border-b border-zinc-800">
          {description}
        </p>
      )}

      {/* JSON View */}
      {showJson && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <pre className="text-xs text-zinc-400 overflow-auto max-h-48 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}

      {/* Search */}
      {searchable && (
        <div className="px-4 py-2 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search across all columns..."
              className="pl-9 h-8 bg-zinc-800/50 border-zinc-700 text-sm"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800/50">
              {visibleColumnsArray.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-${col.align || "left"} ${
                    col.sortable !== false ? "cursor-pointer hover:text-foreground" : ""
                  }`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnsArray.length} className="px-4 py-8 text-center text-muted-foreground">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                  {visibleColumnsArray.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-sm text-foreground/80 text-${col.align || "left"}`}
                    >
                      {col.type === "status" ? (
                        formatValue(row[col.key], col.type)
                      ) : search ? (
                        highlightText(String(formatValue(row[col.key], col.type)), search)
                      ) : (
                        formatValue(row[col.key], col.type)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length} rows
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
