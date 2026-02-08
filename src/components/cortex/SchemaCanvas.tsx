"use client";

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCortexStore } from '@/lib/store';

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

// Custom Node for Tables
const TableNode = ({ data }: { data: TableNodeData }) => {
  const ghostHighlight = useCortexStore((state) => state.ghostHighlight);
  const isHighlighted = ghostHighlight === data.label;

  return (
    <div className={`rounded-md border bg-card text-card-foreground shadow-sm min-w-[200px] cursor-pointer transition-all duration-500 group ${isHighlighted
      ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110 z-50 ring-2 ring-red-500 ring-offset-2 ring-offset-background"
      : "hover:border-indigo-500/50"
      } ${isHighlighted ? "animate-shake" : ""}`}>

      {/* Handles for connecting edges */}
      <Handle type="target" position={Position.Top} className="!bg-zinc-500 !w-2 !h-2" />

      <div className={`border-b p-2 font-semibold text-sm transition-colors ${isHighlighted
        ? "bg-red-500/20 text-red-500"
        : "bg-muted/50 group-hover:bg-indigo-500/10"
        }`}>
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

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500 !w-2 !h-2" />
    </div>
  );
};

export function SchemaCanvas({ nodes: initialNodes, edges: initialEdges }: SchemaCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? []);

  // Use useMemo for nodeTypes to silence "new object created" warning reliably
  const nodeTypes = useMemo(() => ({
    tableNode: TableNode,
  }), []);

  // Sync props to state with strict validation (Fix for "Crash on partial streaming")
  useEffect(() => {
    // Basic validation to prevent crashing ReactFlow if data is partial/malformed
    const validNodes = (initialNodes || []).filter(n => n && n.id && n.position && n.data);
    const validEdges = (initialEdges || []).filter(e => e && e.id && e.source && e.target);

    // Only update if we have meaningful data changes
    setNodes((currentNodes) => {
      if (JSON.stringify(validNodes) !== JSON.stringify(currentNodes)) {
        return validNodes;
      }
      return currentNodes;
    });

    setEdges((currentEdges) => {
      if (JSON.stringify(validEdges) !== JSON.stringify(currentEdges)) {
        return validEdges;
      }
      return currentEdges;
    });
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const tableName = node.data.label;
    const command = `Show data from table ${tableName}`;

    // Dispatch custom event that CortexChat listens to
    const event = new CustomEvent('cortexCommand', { detail: command });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="h-[500px] w-full border rounded-lg overflow-hidden bg-zinc-950 relative group">
      <div className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur-md p-1 rounded-lg border border-white/10 hidden group-hover:block transition-all">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium px-2">Schema Canvas</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-950 text-zinc-100"
      >
        <Background gap={16} size={1} color="#333" />
        <Controls className="bg-zinc-900 border-white/10 fill-white text-white [&>button]:border-white/10 [&>button:hover]:bg-white/10" />
        <MiniMap
          className="bg-zinc-900 border-white/10"
          nodeColor="#3f3f46"
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
