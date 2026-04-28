// LangGraph Agent Workflow
// Based on latest Context7 patterns for StateGraph

import { StateGraph, END, START } from '@langchain/langgraph';
import { AgentState } from './state';
import {
  wardenNode,
  financeNode,
  consensusNode,
  proposalNode,
} from './nodes';

const AGENT_ORDER = ['warden', 'finance', 'consensus', 'proposal'] as const;

/**
 * Creates the multi-agent workflow graph
 * Flow: Warden → Finance → Consensus → Proposal → END
 * User approves via Yes/No in frontend, then POST /api/chat/decision executes
 * @param agentIds - Optional. If provided, only run agents up to and including the last selected.
 *   E.g. ['finance'] runs warden→finance. ['warden','proposal'] runs full chain.
 */
export function createAgentGraph(agentIds?: string[] | null) {
  const nodesToRun = resolveAgentsToRun(agentIds);

  const workflow = new StateGraph(AgentState);

  if (nodesToRun.includes('warden')) workflow.addNode('warden', wardenNode);
  if (nodesToRun.includes('finance')) workflow.addNode('finance', financeNode);
  if (nodesToRun.includes('consensus')) workflow.addNode('consensus', consensusNode);
  if (nodesToRun.includes('proposal')) workflow.addNode('proposal', proposalNode);

  const first = nodesToRun[0];
  const last = nodesToRun[nodesToRun.length - 1];
  workflow.addEdge(START, first as any);
  for (let i = 0; i < nodesToRun.length - 1; i++) {
    workflow.addEdge(nodesToRun[i] as any, nodesToRun[i + 1] as any);
  }
  workflow.addEdge(last as any, END);

  return workflow.compile();
}

function resolveAgentsToRun(agentIds?: string[] | null): string[] {
  if (!agentIds?.length) return [...AGENT_ORDER];
  const valid = agentIds.filter((id) => (AGENT_ORDER as readonly string[]).includes(id));
  if (valid.length === 0) return [...AGENT_ORDER];
  const lastIdx = Math.max(...valid.map((id) => AGENT_ORDER.indexOf(id as any)));
  return AGENT_ORDER.slice(0, lastIdx + 1);
}

// Export singleton instance (full graph)
export const agentGraph = createAgentGraph();
