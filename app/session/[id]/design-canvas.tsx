"use client";

import { useCallback, useRef, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const PALETTE = [
  { kind: "client", label: "Client" },
  { kind: "load-balancer", label: "Load Balancer" },
  { kind: "service", label: "API Service" },
  { kind: "cache", label: "Cache" },
  { kind: "database", label: "Database" },
  { kind: "queue", label: "Queue" },
  { kind: "worker", label: "Worker" },
  { kind: "cdn", label: "CDN" },
  { kind: "blob-store", label: "Blob Store" },
  { kind: "search", label: "Search Index" },
];

const KIND_COLOR: Record<string, string> = {
  client: "#38bdf8",
  "load-balancer": "#a78bfa",
  service: "#34d399",
  cache: "#fbbf24",
  database: "#f472b6",
  queue: "#fb923c",
  worker: "#22d3ee",
  cdn: "#c084fc",
  "blob-store": "#94a3b8",
  search: "#4ade80",
};

function styleFor(kind: string) {
  const color = KIND_COLOR[kind] ?? "#71717a";
  return {
    background: "#18181b",
    border: `1px solid ${color}`,
    borderRadius: 8,
    color: "#e4e4e7",
    fontSize: 12,
    padding: "8px 12px",
    width: 150,
  };
}

export interface DesignState {
  nodes: { id: string; label: string; kind?: string }[];
  edges: { source: string; target: string; label?: string }[];
}

export default function DesignCanvas({
  initial,
  onChange,
}: {
  initial: DesignState;
  onChange: (state: DesignState) => void;
}) {
  const idRef = useRef(
    initial.nodes.reduce((max, n) => {
      const num = Number(n.id.replace(/\D/g, ""));
      return Number.isFinite(num) && num > max ? num : max;
    }, 0)
  );

  const [nodes, setNodes] = useState<Node[]>(() =>
    initial.nodes.map((n, i) => ({
      id: n.id,
      position: { x: 60 + (i % 4) * 190, y: 60 + Math.floor(i / 4) * 110 },
      data: { label: n.label, kind: n.kind },
      style: styleFor(n.kind ?? ""),
    }))
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    initial.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      style: { stroke: "#52525b" },
      labelStyle: { fill: "#a1a1aa", fontSize: 11 },
    }))
  );

  const publish = useCallback(
    (ns: Node[], es: Edge[]) => {
      onChange({
        nodes: ns.map((n) => ({
          id: n.id,
          label: String(n.data?.label ?? ""),
          kind: n.data?.kind as string | undefined,
        })),
        edges: es.map((e) => ({
          source: e.source,
          target: e.target,
          label: typeof e.label === "string" ? e.label : undefined,
        })),
      });
    },
    [onChange]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((ns) => {
        const next = applyNodeChanges(changes, ns);
        // Only structural changes matter to the interviewer, not dragging.
        if (changes.some((c) => c.type === "remove")) {
          setEdges((es) => {
            const kept = es.filter(
              (e) => next.some((n) => n.id === e.source) && next.some((n) => n.id === e.target)
            );
            publish(next, kept);
            return kept;
          });
        }
        return next;
      }),
    [publish]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((es) => {
        const next = applyEdgeChanges(changes, es);
        publish(nodes, next);
        return next;
      }),
    [nodes, publish]
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((es) => {
        const next = addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#52525b" },
            labelStyle: { fill: "#a1a1aa", fontSize: 11 },
          },
          es
        );
        publish(nodes, next);
        return next;
      }),
    [nodes, publish]
  );

  function addNode(kind: string, label: string) {
    idRef.current += 1;
    const id = `n${idRef.current}`;
    const node: Node = {
      id,
      position: {
        x: 80 + ((idRef.current * 70) % 420),
        y: 70 + ((idRef.current * 55) % 300),
      },
      data: { label, kind },
      style: styleFor(kind),
    };
    setNodes((ns) => {
      const next = [...ns, node];
      publish(next, edges);
      return next;
    });
  }

  function renameSelected() {
    const selected = nodes.find((n) => n.selected);
    if (!selected) return;
    const name = window.prompt(
      "Rename component",
      String(selected.data?.label ?? "")
    );
    if (!name) return;
    setNodes((ns) => {
      const next = ns.map((n) =>
        n.id === selected.id ? { ...n, data: { ...n.data, label: name } } : n
      );
      publish(next, edges);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
        {PALETTE.map((p) => (
          <button
            key={p.kind}
            onClick={() => addNode(p.kind, p.label)}
            className="rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            style={{ borderLeftColor: KIND_COLOR[p.kind], borderLeftWidth: 3 }}
          >
            + {p.label}
          </button>
        ))}
        <button
          onClick={renameSelected}
          className="ml-auto rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Rename selected
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background color="#27272a" gap={18} />
          <Controls className="!bg-zinc-900 !border-zinc-800" />
        </ReactFlow>
      </div>
    </div>
  );
}
