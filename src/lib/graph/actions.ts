import { join as idJoin, isDescendant, splitParentPointer, toPath } from "@/lib/idgen";
import { type XYPosition } from "@xyflow/react";
import { type Graph } from "./layout";
import {
  getAncestor,
  getDescendant,
  highlightEdge,
  highlightNode,
  matchApply,
  toggleHidden,
  toggleToolbar,
} from "./utils";
import { generateVirtualGraph } from "./virtual";

export function toggleNodeHidden(graph: Graph, nodeId: string, handleId?: string, hide?: boolean) {
  const prefixId = handleId !== undefined ? idJoin(nodeId, handleId) : undefined;
  const { nodes: descendantNodes, edges: descendantEdges } = getDescendant(graph, nodeId, prefixId);
  const isHide = hide ?? !(descendantNodes[0]?.hidden ?? false);

  matchApply(graph.nodes, descendantNodes, (nd) => toggleHidden(nd, isHide));
  matchApply(graph.edges, descendantEdges, (ed) => toggleHidden(ed, isHide));
  return generateVirtualGraph(graph);
}

// highlight nodes and edges when click on a node
export function toggleNodeSelected(graph: Graph, id: string) {
  const node = graph.nodeMap?.[id]!;
  const { nodes: ancestorNodes, edges: ancestorEdges } = getAncestor(graph, id);
  const { nodes: descendantNodes, edges: descendantEdges } = getDescendant(graph, id);

  matchApply(
    graph.edges,
    [...ancestorEdges, ...descendantEdges],
    (ed) => highlightEdge(ed, true),
    (ed) => highlightEdge(ed, false),
  );
  matchApply(
    graph.nodes,
    [node, ...ancestorNodes, ...descendantNodes],
    (nd) => toggleToolbar(highlightNode(nd, true), node),
    (nd) => toggleToolbar(highlightNode(nd, false), node),
  );

  const jsonPath = toPath(node.id);
  return { ...generateVirtualGraph(graph), jsonPath };
}

export function clearNodeSelected(graph: Graph) {
  graph.edges.forEach((ed) => highlightEdge(ed, false));
  graph.nodes.forEach((nd) => toggleToolbar(highlightNode(nd, false), undefined));
  return generateVirtualGraph(graph);
}

export function triggerFoldSiblings(graph: Graph, nodeId: string, fold: boolean) {
  const { parent } = splitParentPointer(nodeId);

  if (parent) {
    const isSiblingOrDescendantOfSibling = (id: string) =>
      id.startsWith(parent) && !(parent === id || isDescendant(nodeId, id));

    matchApply(
      graph.edges,
      graph.edges.filter((ed) => isSiblingOrDescendantOfSibling(ed.target)),
      (ed) => toggleHidden(ed, fold),
    );
    matchApply(
      graph.nodes,
      graph.nodes.filter((nd) => isSiblingOrDescendantOfSibling(nd.id)),
      (nd) => toggleHidden(nd, fold),
    );
  }

  return generateVirtualGraph(graph);
}

export function computeRevealPosition(
  width: number,
  height: number,
  graph: Graph,
  nodeId: string,
): XYPosition & { changed: boolean } {
  // must >= toolbar's height, otherwise toolbar will not in viewport
  const gap = 25;
  const node = graph.nodeMap?.[nodeId];

  if (!node) {
    console.error("computeRevealPosition (node not found):", nodeId, graph.nodeMap);
    return { x: 0, y: 0, changed: false };
  }

  const x = node.position.x + Math.min(node.data.width / 2, width / 2 - gap);
  const y = node.position.y + Math.min(node.data.height / 2, height / 2 - gap);
  return { x, y, changed: true };
}
