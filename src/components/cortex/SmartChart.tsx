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

import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export function SmartChart({
  title,
  data,
  type = "bar",
  xAxisKey,
  dataKey,
  color = "#8884d8",
  description,
}: SmartChartProps) {
  const [isMaximized, setIsMaximized] = useState(false);

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
    <Card className={`transition-all duration-300 bg-zinc-900 border-zinc-800 text-zinc-100 animate-in fade-in slide-in-from-bottom-4 ${isMaximized
      ? "fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] m-0 shadow-2xl border-white/20 bg-zinc-950/95 backdrop-blur-xl flex flex-col max-w-none"
      : "w-full max-w-3xl mx-auto"
      }`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span>{title}</span>
            {description && (
              <span className="text-sm font-normal text-muted-foreground">
                {description}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className={isMaximized ? "flex-1 min-h-0" : ""}>
        <div className={isMaximized ? "h-full w-full" : "h-[350px] w-full"}>
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
