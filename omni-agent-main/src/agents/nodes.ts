// Agent Node Implementations for LangGraph
// Following latest LangGraph.js patterns from Context7

import { llm } from '../config/llm';
import { AgentStateType } from './state';
import {
  WARDEN_SYSTEM_PROMPT,
  FINANCE_SYSTEM_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  SUPPORT_SYSTEM_PROMPT,
  EXECUTIVE_SYSTEM_PROMPT,
  PROPOSAL_SYSTEM_PROMPT,
} from './prompts';
import {
  getAgentMemory,
  appendAgentMemory,
} from '../services/agentMemory.service';
import { resolveFunctionCall } from '../services/functionCalling.service';

/**
 * Warden Node - Monitoring and Detection
 * Analyzes inventory, trends, and business metrics
 * Uses per-agent memory for context continuity
 */
export async function wardenNode(state: AgentStateType) {
  const memory = await getAgentMemory('warden', state.sessionId);
  const contextWithMemory = memory
    ? `[Your previous context]\n${memory}\n\n[Current task]\n${state.input}`
    : state.input;

  const response = await llm.invoke([
    { role: 'system', content: WARDEN_SYSTEM_PROMPT },
    { role: 'user', content: contextWithMemory },
  ]);

  const content = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content);

  await appendAgentMemory('warden', `Analysis: ${content.substring(0, 500)}`, state.sessionId);

  const preview = content.length > 120 ? content.substring(0, 120) + '...' : content;
  return {
    wardenAnalysis: content,
    logs: [`[Warden] ${preview}`],
  };
}

/**
 * Finance Node - Budget Analysis and Approval
 * Evaluates financial viability of proposals
 * Uses per-agent memory for context continuity
 */
export async function financeNode(state: AgentStateType) {
  const memory = await getAgentMemory('finance', state.sessionId);
  const context = memory
    ? `[Your previous context]\n${memory}\n\nWarden's analysis: ${state.wardenAnalysis}`
    : `Warden's analysis: ${state.wardenAnalysis}`;
  
  const response = await llm.invoke([
    { role: 'system', content: FINANCE_SYSTEM_PROMPT },
    { role: 'user', content: context },
  ]);

  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);

  await appendAgentMemory('finance', `Vote: ${content.substring(0, 300)}`, state.sessionId);

  // Simple approval detection
  const approved = content.toLowerCase().includes('approve') && 
                   !content.toLowerCase().includes('reject');

  return {
    financeApproval: content,
    decision: {
      votes: [
        ...state.decision.votes,
        {
          agent: 'finance',
          approve: approved,
          reasoning: content,
        },
      ],
    },
    logs: [`[Finance] ${approved ? '✓ APPROVED' : '✗ REJECTED'} - ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`],
  };
}

/**
 * Architect Node - Data Analysis
 * Queries database and provides insights
 * Uses per-agent memory for context continuity
 */
export async function architectNode(state: AgentStateType) {
  const memory = await getAgentMemory('architect', state.sessionId);
  const contextWithMemory = memory
    ? `[Your previous context]\n${memory}\n\n[Current task]\n${state.input}`
    : state.input;

  const response = await llm.invoke([
    { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
    { role: 'user', content: contextWithMemory },
  ]);

  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);

  await appendAgentMemory('architect', `Analysis: ${content.substring(0, 300)}`, state.sessionId);

  return {
    architectData: content,
    logs: [`[Architect] Data analysis provided`],
  };
}

/**
 * Support Node - Customer Communication
 * Drafts empathetic customer messages
 * Uses per-agent memory for context continuity
 */
export async function supportNode(state: AgentStateType) {
  const memory = await getAgentMemory('warden', state.sessionId); // Support shares context with warden
  const contextWithMemory = memory
    ? `[Context]\n${memory}\n\n[Current task]\n${state.input}`
    : state.input;

  const response = await llm.invoke([
    { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
    { role: 'user', content: contextWithMemory },
  ]);

  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);

  return {
    supportDraft: content,
    logs: [`[Support] Message drafted`],
  };
}

/**
 * Executive Node - Decision Coordination
 * Aggregates votes and prepares user notification
 */
export async function executiveNode(state: AgentStateType) {
  const summary = `
Decision Summary:
- Warden: ${state.wardenAnalysis?.substring(0, 100)}
- Finance: ${state.financeApproval?.substring(0, 100)}
- Status: ${state.decision.status}
`;

  return {
    logs: [`[Executive] Decision coordinated - ${state.decision.status}`],
    messages: [{ role: 'assistant', content: summary }],
  };
}

/**
 * Consensus Node - Vote Evaluation
 * Always outputs pending_user so human can approve via Yes/No
 * Uses per-agent memory for context continuity
 */
export async function consensusNode(state: AgentStateType) {
  const votes = state.decision.votes;
  const approvals = votes.filter((v) => v.approve).length;
  const rejections = votes.filter((v) => !v.approve).length;

  // Finance veto power (recommendation only - user has final say)
  const financeVeto = votes.some(
    (v) => v.agent === 'finance' && !v.approve
  );

  const recommendation = financeVeto ? 'rejected' : (approvals > rejections ? 'approved' : 'rejected');

  await appendAgentMemory('consensus', `Votes: ${approvals} approve, ${rejections} reject → ${recommendation}`, state.sessionId);

  return {
    decision: {
      status: 'pending_user' as const,
      recommendedByAgents: recommendation,
    },
    logs: [`[Consensus] Awaiting user decision - agents recommend: ${recommendation.toUpperCase()} (${approvals} approve, ${rejections} reject)`],
  };
}

/**
 * Proposal Node - Infer proposed action from context
 * Uses FunctionGemma for function calling when the agent needs to perform actions
 * (Claude-like: perform tasks on behalf of user to improve website)
 */
export async function proposalNode(state: AgentStateType) {
  const context = `
User request: ${state.input}
Warden analysis: ${state.wardenAnalysis || 'N/A'}
Finance analysis: ${state.financeApproval || 'N/A'}
Agent votes: ${JSON.stringify(state.decision.votes)}
`;

  type ActionType = 'add_product' | 'alter_product' | 'send_reply_email' | 'restock_inventory' | 'architect_research' | 'none';
  let proposedAction: { actionType: ActionType; payload: Record<string, unknown> } = { actionType: 'none', payload: {} };

  try {
    // 1. Try FunctionGemma first - best for function calling (Ollama)
    const functionGemmaResult = await resolveFunctionCall(state.input, context);
    if (functionGemmaResult && functionGemmaResult.actionType !== 'none') {
      proposedAction = {
        actionType: functionGemmaResult.actionType as ActionType,
        payload: functionGemmaResult.payload,
      };
    } else {
      // 2. Fallback: default LLM for JSON proposal (when FunctionGemma returns nothing)
      const response = await llm.invoke([
        { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          proposedAction = {
            actionType: (parsed.actionType || 'none') as ActionType,
            payload: parsed.payload || {},
          };
        } catch {
          // keep default
        }
      }
    }

    await appendAgentMemory('proposal', `Proposed: ${proposedAction.actionType}`, state.sessionId);

    return {
      decision: {
        proposedAction,
      },
      logs: [`[Proposal] Action: ${proposedAction.actionType}${proposedAction.actionType !== 'none' ? ` (${JSON.stringify(proposedAction.payload).slice(0, 60)}...)` : ''}`],
    };
  } catch (error) {
    return {
      decision: {
        proposedAction: { actionType: 'none' as const, payload: {} },
      },
      logs: [`[Proposal] Error - defaulting to none`],
    };
  }
}
