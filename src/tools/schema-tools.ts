import { Prisma } from "@prisma/client";
import { z } from "zod";

export const visualizeSchemaTool = {
  name: "visualize_schema",
  description: "Visualizes the database schema structure (tables and relationships). Use this when the user asks to see the database, schema, or ER diagram.",
  inputSchema: z.object({
    focusTables: z.array(z.string()).optional().describe("Optional list of table names to focus on"),
  }),
  execute: async ({ focusTables }: { focusTables?: string[] }) => {
    // @ts-ignore - DMMF is available at runtime but hidden in types
    const dmmf = Prisma.dmmf.datamodel;
    
    // 1. Generate Nodes (Tables)
    const nodes = dmmf.models.map((model: any, index: number) => ({
      id: model.name,
      type: "tableNode", // Custom node type we will create
      position: { x: 250 * (index % 3), y: 100 * Math.floor(index / 3) },
      data: { 
        label: model.name,
        fields: model.fields.map((f: any) => ({ name: f.name, type: f.type, isId: f.isId }))
      },
    }));

    // 2. Generate Edges (Relations)
    const edges: any[] = [];
    dmmf.models.forEach((model: any) => {
      model.fields.forEach((field: any) => {
        if (field.kind === "object" && field.relationName) {
           // Basic edge logic
           edges.push({
             id: `${model.name}-${field.name}-${field.type}`,
             source: model.name,
             target: field.type,
             label: field.relationName,
             animated: true,
           });
        }
      });
    });

    // Filter if needed
    if (focusTables && focusTables.length > 0) {
      // (Implementation detail: filter nodes/edges)
      // For now, return all
    }

    return { nodes, edges };
  }
};
