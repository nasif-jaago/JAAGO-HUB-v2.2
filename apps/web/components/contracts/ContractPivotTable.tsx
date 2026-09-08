'use client';

import React, { useState, useMemo } from 'react';
import {
  Grid,
  Download,
  ArrowRightLeft,
} from 'lucide-react';
import {
  EmploymentContractVersion,
  PivotDimension,
  calculatePivotMatrix,
} from '@/lib/contracts-engine';

interface ContractPivotTableProps {
  contracts: EmploymentContractVersion[];
  asOfDate: string;
}

const DIMENSIONS: PivotDimension[] = [
  'Department',
  'Project',
  'Contract Type',
  'Working Schedule',
  'Status',
  'Entity',
];

export function ContractPivotTable({ contracts, asOfDate }: ContractPivotTableProps) {
  const [rowDim, setRowDim] = useState<PivotDimension>('Department');
  const [colDim, setColDim] = useState<PivotDimension>('Contract Type');

  const pivot = useMemo(() => {
    return calculatePivotMatrix(contracts, rowDim, colDim, asOfDate);
  }, [contracts, rowDim, colDim, asOfDate]);

  // Find max cell count for heatmap shading
  const maxCellCount = useMemo(() => {
    let max = 1;
    pivot.rowKeys.forEach((r) => {
      pivot.colKeys.forEach((c) => {
        const val = pivot.matrix[r]?.[c] || 0;
        if (val > max) max = val;
      });
    });
    return max;
  }, [pivot]);

  const swapDimensions = () => {
    const temp = rowDim;
    setRowDim(colDim);
    setColDim(temp);
  };

  const exportPivotCSV = () => {
    const headers = [`"${rowDim} \\ ${colDim}"`, ...pivot.colKeys.map((c) => `"${c}"`), '"Total"'];
    const rows = pivot.rowKeys.map((r) => {
      const cells = pivot.colKeys.map((c) => pivot.matrix[r]?.[c] || 0);
      return [`"${r}"`, ...cells, pivot.rowTotals[r] || 0].join(',');
    });
    const footer = [
      '"Total"',
      ...pivot.colKeys.map((c) => pivot.colTotals[c] || 0),
      pivot.grandTotal,
    ].join(',');

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows, footer].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `JAAGO_Contract_Pivot_${rowDim}_x_${colDim}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Pivot Controls Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Row Dimension:
            </span>
            <select
              value={rowDim}
              onChange={(e) => setRowDim(e.target.value as PivotDimension)}
              className="text-xs font-bold bg-muted/60 hover:bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
            >
              {DIMENSIONS.map((dim) => (
                <option key={dim} value={dim} disabled={dim === colDim}>
                  {dim}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swapDimensions}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-amber-500 border border-border transition shadow-xs"
            title="Swap Row and Column dimensions"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Column Dimension:
            </span>
            <select
              value={colDim}
              onChange={(e) => setColDim(e.target.value as PivotDimension)}
              className="text-xs font-bold bg-muted/60 hover:bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
            >
              {DIMENSIONS.map((dim) => (
                <option key={dim} value={dim} disabled={dim === rowDim}>
                  {dim}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Presets & Export */}
        <div className="flex items-center space-x-2">
          <div className="hidden lg:flex items-center space-x-1 bg-muted/50 p-1 rounded-xl border border-border text-[11px] font-bold">
            <button
              onClick={() => {
                setRowDim('Department');
                setColDim('Contract Type');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                rowDim === 'Department' && colDim === 'Contract Type'
                  ? 'bg-card text-amber-500 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dept × Type
            </button>
            <button
              onClick={() => {
                setRowDim('Department');
                setColDim('Status');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                rowDim === 'Department' && colDim === 'Status'
                  ? 'bg-card text-amber-500 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dept × Status
            </button>
            <button
              onClick={() => {
                setRowDim('Entity');
                setColDim('Contract Type');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${
                rowDim === 'Entity' && colDim === 'Contract Type'
                  ? 'bg-card text-amber-500 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entity × Type
            </button>
          </div>

          <button
            onClick={exportPivotCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border shadow-xs transition"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">Export Cross-Tab CSV</span>
          </button>
        </div>
      </div>

      {/* Cross-Tab Matrix Grid */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header */}
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="py-3.5 px-4 font-black uppercase tracking-wider text-muted-foreground min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <Grid className="h-4 w-4 text-amber-500" />
                    <span>{rowDim} \ {colDim}</span>
                  </div>
                </th>
                {pivot.colKeys.map((col) => (
                  <th
                    key={col}
                    className="py-3.5 px-4 font-extrabold text-foreground text-center uppercase tracking-wider min-w-[120px]"
                  >
                    {col}
                  </th>
                ))}
                <th className="py-3.5 px-4 font-black text-amber-500 text-center uppercase tracking-wider bg-amber-500/5 min-w-[100px] border-l border-border">
                  Total
                </th>
              </tr>
            </thead>

            {/* Matrix Body */}
            <tbody className="divide-y divide-border/60">
              {pivot.rowKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={pivot.colKeys.length + 2}
                    className="py-12 text-center text-muted-foreground italic"
                  >
                    No contracts found matching the active criteria.
                  </td>
                </tr>
              ) : (
                pivot.rowKeys.map((rowKey) => {
                  const rowTotal = pivot.rowTotals[rowKey] || 0;
                  return (
                    <tr key={rowKey} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground bg-muted/10">
                        {rowKey}
                      </td>
                      {pivot.colKeys.map((colKey) => {
                        const count = pivot.matrix[rowKey]?.[colKey] || 0;
                        const intensity = count > 0 ? (count / maxCellCount) * 0.25 : 0;
                        return (
                          <td
                            key={colKey}
                            style={{
                              backgroundColor:
                                count > 0 ? `rgba(245, 197, 24, ${intensity})` : undefined,
                            }}
                            className="py-3 px-4 text-center font-bold text-foreground"
                          >
                            {count > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-card/80 border border-border/80 font-mono shadow-xs">
                                {count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 font-mono font-normal">
                                0
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-black text-foreground bg-amber-500/5 border-l border-border font-mono">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary Row */}
            {pivot.rowKeys.length > 0 && (
              <tfoot>
                <tr className="bg-muted/60 border-t-2 border-border font-black text-xs">
                  <td className="py-3.5 px-4 uppercase tracking-wider text-muted-foreground">
                    Total
                  </td>
                  {pivot.colKeys.map((colKey) => (
                    <td
                      key={colKey}
                      className="py-3.5 px-4 text-center font-mono font-black text-foreground"
                    >
                      {pivot.colTotals[colKey] || 0}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-center font-mono font-black text-slate-950 bg-amber-500 border-l border-amber-600 shadow-inner text-sm">
                    {pivot.grandTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
