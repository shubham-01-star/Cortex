"use client";

import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface SchemaCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

interface Field {
  name: string;
  type: string;
  isId: boolean;
}

interface TableNodeData {
  label: string;
  fields: Field[];
}

// Custom Node for Tables (could be refined later)
const TableNode = ({ data }: { data: TableNodeData }) => {
  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm min-w-[200px] cursor-pointer hover:border-indigo-500/50 transition-colors group">
      <div className="border-b p-2 font-semibold bg-muted/50 text-sm group-hover:bg-indigo-500/10 transition-colors">
        {data.label}
      </div>
      <div className="p-2 space-y-1">
        {data.fields.map((f) => (
          <div key={f.name} className="flex justify-between text-xs">
            <span className={f.isId ? "font-bold text-primary" : ""}>{f.name}</span>
            <span className="text-muted-foreground">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
};

export function SchemaCanvas({ nodes: initialNodes, edges: initialEdges }: SchemaCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const tableName = node.data.label;
    const command = `Show data from table ${tableName}`;

    // Dispatch custom event that CortexChat listens to
    const event = new CustomEvent('cortexCommand', { detail: command });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="h-[500px] w-full border rounded-lg overflow-hidden bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
