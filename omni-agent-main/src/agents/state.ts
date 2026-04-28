// LangGraph State Definition for Multi-Agent System
import { Annotation } from '@langchain/langgraph';

/**
 * Shared state for the agent workflow
 * Based on latest LangGraph patterns
 */
export const AgentState = Annotation.Root({
  // User input or trigger
  input: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => '',
  }),

  // Chat session ID for per-session agent memory (optional)
  sessionId: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // Agent responses
  wardenAnalysis: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  financeApproval: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  architectData: Annotation<any>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  supportDraft: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // Decision tracking
  decision: Annotation<{
    id: string;
    type: string;
    data: any;
    votes: Array<{ agent: string; approve: boolean; reasoning: string }>;
    status: 'pending' | 'approved' | 'rejected' | 'pending_user';
    proposedAction?: { actionType: string; payload: any };
    recommendedByAgents?: 'approved' | 'rejected';
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({
      id: '',
      type: '',
      data: {},
      votes: [],
      status: 'pending' as const,
    }),
  }),

  // Conversation messages
  messages: Annotation<Array<{ role: string; content: string }>>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Activity logs
  logs: Annotation<Array<string>>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

// Export the State type
export type AgentStateType = typeof AgentState.State;
