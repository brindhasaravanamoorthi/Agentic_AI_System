// Agent Service - High-level interface for agent operations

import { createAgentGraph, agentGraph } from '../agents/graph';
import { getStoreContext } from './contextEnrichment.service';
import { aiProvider } from '../config/llm';

export type StreamChunk = {
  type: 'delta' | 'decision' | 'analysis' | 'agent_started' | 'done';
  content?: string;
  agent?: string;
  decision?: {
    status: string;
    votes?: Array<{ agent: string; approve: boolean; reasoning: string }>;
    proposedAction?: { actionType: string; payload: any };
    recommendedByAgents?: 'approved' | 'rejected';
    decisionId?: string;
  };
  analysis?: { warden?: string; finance?: string };
};

export class AgentService {
  /**
   * Process user query through the agent system (streaming)
   */
  async *processUserQueryStream(
    input: string,
    history?: Array<{ role: string; content: string }>,
    sessionId?: string | null,
    agentIds?: string[] | null
  ): AsyncGenerator<StreamChunk> {
    try {
      const storeContext = await getStoreContext(input);
      const contextWithHistory = history?.length
        ? this.formatHistoryForContext(history) + `[Current request]\nUser: ${input}`
        : input;
      const enrichedInput = contextWithHistory + storeContext;

      const initialState = {
        input: enrichedInput,
        sessionId: sessionId ?? null,
        wardenAnalysis: null,
        financeApproval: null,
        architectData: null,
        supportDraft: null,
        messages: [],
        logs: [] as string[],
        decision: {
          id: `decision_${Date.now()}`,
          type: 'user_query',
          data: {},
          votes: [] as Array<{ agent: string; approve: boolean; reasoning: string }>,
          status: 'pending' as const,
        },
      };

      const graph = createAgentGraph(agentIds);
      const stream = await graph.stream(initialState, {
        streamMode: 'updates',
      });

      let finalDecision: any = null;
      const finalAnalysis: { warden?: string; finance?: string } = {};

      const AGENT_DISPLAY_NAMES: Record<string, string> = {
        warden: 'Warden',
        finance: 'Finance',
        consensus: 'Consensus',
        proposal: 'Proposal',
      };

      for await (const chunk of stream) {
        const nodeName = Object.keys(chunk)[0];
        const nodeOutput = (chunk as any)[nodeName];

        yield { type: 'agent_started', agent: AGENT_DISPLAY_NAMES[nodeName] ?? nodeName };

        if (nodeOutput?.logs) {
          const newLogs = Array.isArray(nodeOutput.logs) ? nodeOutput.logs : [nodeOutput.logs];
          for (const log of newLogs) {
            yield { type: 'delta', content: log };
          }
        }

        if (nodeOutput?.wardenAnalysis) {
          finalAnalysis.warden = nodeOutput.wardenAnalysis;
          yield { type: 'analysis', analysis: { ...finalAnalysis } };
        }
        if (nodeOutput?.financeApproval) {
          finalAnalysis.finance = nodeOutput.financeApproval;
          yield { type: 'analysis', analysis: { ...finalAnalysis } };
        }
        if (nodeOutput?.decision) {
          finalDecision = { ...initialState.decision, ...nodeOutput.decision };
          yield { type: 'decision', decision: { ...finalDecision } };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      console.error('Agent stream error:', error);
      const err = error as { status?: number; code?: number | string; cause?: Error };
      let msg = error instanceof Error ? error.message : String(error);
      // Only use custom messages for OpenRouter API errors (429/402)
      if (aiProvider === 'openrouter') {
        if (err.status === 429 || err.code === 429) {
          msg = 'AI provider is rate-limited. Please try again in a moment, or switch to Ollama (AI_PROVIDER=ollama) for local use.';
        } else if (err.status === 402 || err.code === 402) {
          msg = 'AI API spend limit exceeded. Add credits at openrouter.ai or switch to Ollama (AI_PROVIDER=ollama) for local use.';
        }
      } else if (aiProvider === 'ollama') {
        // For Ollama: show actual error (e.g. ECONNREFUSED = Ollama not running)
        if (msg.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
          msg = 'Cannot connect to Ollama. Make sure Ollama is running (ollama serve) and the model is pulled (e.g. ollama run phi4-mini).';
        }
      }
      yield {
        type: 'delta',
        content: `Error: ${msg}`,
      };
      yield { type: 'done' };
    }
  }

  /**
   * Format conversation history for agent context (chat memory)
   */
  formatHistoryForContext(messages: Array<{ role: string; content: string }>): string {
    if (!messages?.length) return '';
    const lines = messages
      .filter((m) => m.role && m.content)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.content || '').slice(0, 500)}`)
      .slice(-20); // Last 20 messages for context
    return lines.length ? `[Conversation history - use this for context]\n${lines.join('\n')}\n\n` : '';
  }

  /**
   * Process user query through the agent system (with optional chat memory)
   */
  async processUserQuery(
    input: string,
    history?: Array<{ role: string; content: string }>,
    sessionId?: string | null
  ) {
    const storeContext = await getStoreContext(input);
    const contextWithHistory = history?.length
      ? this.formatHistoryForContext(history) + `[Current request]\nUser: ${input}`
      : input;
    const enrichedInput = contextWithHistory + storeContext;

    const initialState = {
      input: enrichedInput,
      sessionId: sessionId ?? null,
      wardenAnalysis: null,
      financeApproval: null,
      architectData: null,
      supportDraft: null,
      messages: [],
      logs: [],
      decision: {
        id: `decision_${Date.now()}`,
        type: 'user_query',
        data: {},
        votes: [],
        status: 'pending' as const,
      },
    };

    try {
      const result = await agentGraph.invoke(initialState);

      return {
        success: true,
        data: {
          response: result.logs.join('\n'),
          decision: result.decision,
          analysis: {
            warden: result.wardenAnalysis,
            finance: result.financeApproval,
            architect: result.architectData,
          },
        },
      };
    } catch (error) {
      console.error('Agent processing error:', error);
      return {
        success: false,
        error: {
          message: 'Agent processing failed',
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check inventory levels (scheduled task)
   */
  async checkInventory(sessionId?: string | null) {
    const initialState = {
      input: 'Check inventory levels and identify items that need restocking',
      sessionId: sessionId ?? null,
      wardenAnalysis: null,
      financeApproval: null,
      architectData: null,
      supportDraft: null,
      messages: [],
      logs: [],
      decision: {
        id: `inventory_${Date.now()}`,
        type: 'inventory_check',
        data: {},
        votes: [],
        status: 'pending' as const,
      },
    };

    try {
      const result = await agentGraph.invoke(initialState);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Inventory check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test Ollama connection
   */
  async testConnection() {
    try {
      const result = await this.processUserQuery('Hello, are you working?');
      return {
        success: true,
        message: 'Ollama connection successful',
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Ollama connection failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const agentService = new AgentService();
