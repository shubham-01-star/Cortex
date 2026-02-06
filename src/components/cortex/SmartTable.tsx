"use client";

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
  data: any[];
}

export function SmartTable({ title, data }: SmartTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground text-center">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Auto-generate headers from first item keys
  const headers = Object.keys(data[0]);

  return (
    <Card className="w-full">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="capitalize">{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                {headers.map((header) => (
                  <TableCell key={`${idx}-${header}`}>
                    {typeof row[header] === 'object' 
                      ? JSON.stringify(row[header]) 
                      : String(row[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
