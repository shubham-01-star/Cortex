"use client";

import { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2, GripVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SmartTableProps {
  title?: string;
  tableName?: string;
  data: Record<string, unknown>[];
  columns?: string[];
}

export function SmartTable({ title, tableName, data, columns }: SmartTableProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Validate data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground text-center">
          No data available {tableName ? `for ${tableName}` : ""}
        </CardContent>
      </Card>
    );
  }

  // Validate first item is not null
  if (!data[0] || typeof data[0] !== 'object') {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground text-center">
          Invalid data format
        </CardContent>
      </Card>
    );
  }

  // Auto-generate headers from columns prop OR first item keys
  const headers = columns ?? Object.keys(data[0]);

  // Initialize column widths
  useEffect(() => {
    if (Object.keys(columnWidths).length === 0) {
      const initialWidths: Record<string, number> = {};
      headers.forEach(header => {
        initialWidths[header] = 150; // Default width
      });
      setColumnWidths(initialWidths);
    }
  }, [headers, columnWidths]);

  const handleMouseDown = (header: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(header);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn || !tableRef.current) return;

      const tableRect = tableRef.current.getBoundingClientRect();
      const headerIndex = headers.indexOf(resizingColumn);

      // Calculate new width based on mouse position
      const cells = tableRef.current.querySelectorAll(`th:nth-child(${headerIndex + 1})`);
      if (cells.length > 0) {
        const cellRect = cells[0].getBoundingClientRect();
        const newWidth = Math.max(80, e.clientX - cellRect.left);

        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, headers]);

  const formatCellValue = (value: unknown): string => {
    if (value === null) return "—";
    if (value === undefined) return "—";
    if (typeof value === 'object') return JSON.stringify(value);
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  return (
    <Card className={`transition-all duration-300 ${isMaximized
      ? "fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] m-0 shadow-2xl border-white/20 bg-zinc-950/95 backdrop-blur-xl flex flex-col"
      : "w-full"
      }`}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b border-white/5">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
            aria-label={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </CardHeader>
      )}
      <CardContent className={`p-0 overflow-auto ${isMaximized ? "flex-1" : ""}`} ref={tableRef}>
        <div className="relative">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10 border-b border-white/10">
              <TableRow className="hover:bg-transparent">
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className="relative capitalize font-semibold text-xs text-zinc-300 h-10 group"
                    style={{
                      width: columnWidths[header] || 150,
                      minWidth: columnWidths[header] || 150,
                      maxWidth: columnWidths[header] || 150,
                    }}
                  >
                    <div className="flex items-center justify-between pr-2">
                      <span className="truncate">{header.replace(/_/g, ' ')}</span>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 group-hover:bg-blue-500/30 transition-colors flex items-center justify-center"
                        onMouseDown={handleMouseDown(header)}
                      >
                        <GripVertical size={12} className="text-zinc-600 group-hover:text-zinc-400" />
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  {headers.map((header) => {
                    const value = row[header];
                    const displayValue = formatCellValue(value);

                    return (
                      <TableCell
                        key={`${idx}-${header}`}
                        className="text-xs text-zinc-400 py-2.5 px-3"
                        style={{
                          width: columnWidths[header] || 150,
                          minWidth: columnWidths[header] || 150,
                          maxWidth: columnWidths[header] || 150,
                        }}
                      >
                        <div className="truncate" title={displayValue}>
                          {displayValue}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
