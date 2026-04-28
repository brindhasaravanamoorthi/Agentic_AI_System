// Function Calling Service - Uses FunctionGemma to resolve tool calls
// When the main agent detects intent to perform an action, we use FunctionGemma
// to get the exact function name and arguments (best option for function calling)

import { functionGemma } from '../config/llm';
import { actionTools } from '../agents/tools';
import { HumanMessage } from '@langchain/core/messages';

export type ResolvedAction = {
  actionType: string;
  payload: Record<string, unknown>;
};

/**
 * Use FunctionGemma to resolve which function to call and with what arguments.
 * Passes user intent + context to FunctionGemma; returns tool_calls.
 */
export async function resolveFunctionCall(
  userIntent: string,
  context?: string
): Promise<ResolvedAction | null> {
  if (!functionGemma.bindTools) {
    throw new Error('FunctionGemma model does not support bindTools');
  }
  const llmWithTools = functionGemma.bindTools(actionTools);

  const prompt = context
    ? `Context:\n${context}\n\nUser request:\n${userIntent}\n\nDetermine which tool to call and with what parameters.`
    : userIntent;

  const messages = [new HumanMessage({ content: prompt })];

  try {
    const response = await llmWithTools.invoke(messages);
    const msg = response as { tool_calls?: Array<{ name?: string; args?: Record<string, unknown>; arguments?: string }> };

    const toolCalls = msg.tool_calls;
    if (!toolCalls?.length) {
      return null;
    }

    const first = toolCalls[0];
    const name = first?.name ?? 'none';
    let args: Record<string, unknown> = first?.args ?? (first as any)?.arguments ?? {};

    if (typeof args === 'string') {
      try {
        args = JSON.parse(args) as Record<string, unknown>;
      } catch {
        args = {};
      }
    }

    return {
      actionType: name,
      payload: args,
    };
  } catch (error) {
    console.error('FunctionGemma resolve error:', error);
    return null;
  }
}

/**
 * Multi-turn: if FunctionGemma returns a tool call, we execute it and can optionally
 * send the result back for a final response. For our flow we just need the tool call.
 */
export async function resolveAndExecute(
  userIntent: string,
  context: string,
  executeFn: (actionType: string, payload: Record<string, unknown>) => Promise<unknown>
): Promise<{ action: ResolvedAction | null; result?: unknown }> {
  const action = await resolveFunctionCall(userIntent, context);
  if (!action || action.actionType === 'none') {
    return { action: null };
  }

  const result = await executeFn(action.actionType, action.payload);
  return { action, result };
}
