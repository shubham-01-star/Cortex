"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight, Loader2, Database } from "lucide-react";
import { useTambo } from "@tambo-ai/react";

export interface MigrationFormProps {
  tableName?: string;
  columns?: Array<{ name: string; type: string }>;
  suggestedAction?: "create" | "alter";
}

export function MigrationForm({ 
  tableName = "NewTable", 
  columns = [],
  suggestedAction = "create" 
}: MigrationFormProps) {
  const { sendThreadMessage } = useTambo();
  const [name, setName] = useState(tableName);
  const [cols, setCols] = useState(columns);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("String");

  const addColumn = () => {
    if (!newColName) return;
    setCols([...cols, { name: newColName, type: newColType }]);
    setNewColName("");
  };

  const removeColumn = (index: number) => {
    setCols(cols.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Send the confirmed schema back to the AI to execute the "real" migration tool
      // or just confirm the action.
      // In this demo, we'll simulate the AI picking up the confirmed intent.
      await sendThreadMessage(
        `CONFIRMED: Create table '${name}' with columns: ${cols.map(c => `${c.name} (${c.type})`).join(", ")}`
      );
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-zinc-900 border-zinc-800 text-zinc-100 animate-in fade-in slide-in-from-bottom-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Database className="text-indigo-400" size={20} />
          </div>
          <div>
            <CardTitle>Schema Modification Request</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {suggestedAction === "create" ? "Propose New Table Structure" : "Propose Table Alterations"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Table Name</Label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-950 border-zinc-800"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Columns</Label>
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-400">
              {cols.length} Fields
            </Badge>
          </div>
          
          <div className="rounded-md border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-950">
                <TableRow className="hover:bg-zinc-950 border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cols.map((col, i) => (
                  <TableRow key={i} className="hover:bg-zinc-800/50 border-zinc-800">
                    <TableCell className="font-medium">{col.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                        {col.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColumn(i)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cols.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                      No columns defined yet. Add one below.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2 items-end pt-2">
            <div className="space-y-2 flex-1">
              <Input 
                placeholder="Column Name (e.g., status)" 
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
              />
            </div>
            <div className="space-y-2 w-32">
              <Input 
                placeholder="Type" 
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
              />
            </div>
            <Button 
              onClick={addColumn}
              disabled={!newColName}
              variant="secondary"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t border-zinc-800 pt-6">
        <Button variant="ghost" disabled={isSubmitting}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !name}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting Proposal...
            </>
          ) : (
            <>
              Confirm Schema Change
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
