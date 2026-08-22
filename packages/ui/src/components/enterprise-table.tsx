'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface EnterpriseTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField: keyof T;
  searchPlaceholder?: string | undefined;
  searchFields?: (keyof T)[] | undefined;
  title?: string | undefined;
  renderKanbanCard?: ((item: T) => React.ReactNode) | undefined;
  onRowClick?: ((item: T) => void) | undefined;
  pageSizeOptions?: number[] | undefined;
}

export function EnterpriseTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchPlaceholder = 'Search records...',
  searchFields,
  title,
  renderKanbanCard,
  onRowClick,
  pageSizeOptions = [10, 25, 50],
}: EnterpriseTableProps<T>) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 10);
  const [selectedKeys, setSelectedKeys] = useState<Set<any>>(new Set());

  // Search filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lowerSearch = search.toLowerCase();

    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerSearch);
        });
      }
      return Object.values(item).some((val) =>
        val !== undefined && val !== null && String(val).toLowerCase().includes(lowerSearch),
      );
    });
  }, [data, search, searchFields]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === paginatedData.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(paginatedData.map((d) => d[keyField])));
    }
  };

  const toggleSelectOne = (keyVal: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedKeys);
    if (next.has(keyVal)) next.delete(keyVal);
    else next.add(keyVal);
    setSelectedKeys(next);
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = columns.map((c) => c.header).join(',');
    const rows = sortedData.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val ?? '';
        })
        .join(','),
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── CONTROLS TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center space-x-3 flex-1">
          {title && <h3 className="font-black text-sm text-foreground mr-2">{title}</h3>}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View switcher if kanban provided */}
          {renderKanbanCard && (
            <div className="flex items-center bg-surface p-0.5 rounded-xl border border-border">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'list' ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground'
                }`}
                title="List View"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'kanban' ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground'
                }`}
                title="Kanban Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center space-x-1.5 transition"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── TABLE OR KANBAN VIEW ── */}
      {viewMode === 'list' ? (
        <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedKeys.size > 0 && selectedKeys.size === paginatedData.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-primary cursor-pointer"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      className={`py-3 px-4 select-none ${col.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''}`}
                    >
                      <div
                        className={`flex items-center space-x-1 ${
                          col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                        }`}
                      >
                        <span>{col.header}</span>
                        {col.sortable !== false && (
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortKey === col.key ? 'text-primary' : 'text-muted-foreground/50'}`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground">
                      No records match the current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const keyVal = item[keyField];
                    const isSelected = selectedKeys.has(keyVal);

                    return (
                      <tr
                        key={String(keyVal)}
                        onClick={() => onRowClick?.(item)}
                        className={`hover:bg-surface/60 transition select-none ${
                          onRowClick ? 'cursor-pointer' : ''
                        } ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-3 px-4" onClick={(e) => toggleSelectOne(keyVal, e)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-primary cursor-pointer"
                          />
                        </td>
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-3 px-4 ${
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            }`}
                          >
                            {col.accessor ? col.accessor(item) : String(item[col.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION BAR ── */}
          <div className="p-3 border-t border-border bg-surface/40 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {paginatedData.length} of {sortedData.length} entries
              {selectedKeys.size > 0 && ` (${selectedKeys.size} selected)`}
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-border hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg border border-border hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── KANBAN CARDS VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedData.map((item) => (
            <div
              key={String(item[keyField])}
              onClick={() => onRowClick?.(item)}
              className="cursor-pointer"
            >
              {renderKanbanCard!(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
