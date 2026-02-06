"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SmartChartProps {
  title: string;
  data: Record<string, unknown>[];
  type?: "bar" | "line";
  xAxisKey: string;
  dataKey: string;
  color?: string;
  description?: string;
}

export function SmartChart({
  title,
  data,
  type = "bar",
  xAxisKey,
  dataKey,
  color = "#8884d8",
  description,
}: SmartChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available to visualize.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto bg-zinc-900 border-zinc-800 text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          {description && (
            <span className="text-sm font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey={xAxisKey} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#f4f4f5" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey={xAxisKey} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#f4f4f5" }}
                  cursor={{ fill: "#ffffff10" }}
                />
                <Legend />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
