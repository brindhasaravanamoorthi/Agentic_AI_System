// Agent Memory Service - Per-agent memory for context continuity
// Each agent (warden, finance, architect, etc.) has its own memory

import { prisma } from '../config/database';

const AGENT_IDS = ['warden', 'finance', 'architect', 'consensus', 'proposal'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const GLOBAL_SESSION = 'global';

/**
 * Get memory for an agent (optionally scoped to a chat session)
 */
export async function getAgentMemory(
  agentId: AgentId,
  sessionId?: string | null
): Promise<string> {
  const scope = sessionId || GLOBAL_SESSION;
  const mem = await prisma.agentMemory.findUnique({
    where: {
      agentId_sessionId: { agentId, sessionId: scope },
    },
  });
  return mem?.content ?? '';
}

/**
 * Update/save memory for an agent
 */
export async function saveAgentMemory(
  agentId: AgentId,
  content: string,
  sessionId?: string | null
): Promise<void> {
  const scope = sessionId || GLOBAL_SESSION;
  await prisma.agentMemory.upsert({
    where: {
      agentId_sessionId: { agentId, sessionId: scope },
    },
    create: { agentId, sessionId: scope, content },
    update: { content },
  });
}

/**
 * Append to agent memory (keeps last N items, summarized)
 */
export async function appendAgentMemory(
  agentId: AgentId,
  newContent: string,
  sessionId?: string | null,
  maxLength = 2000
): Promise<void> {
  const existing = await getAgentMemory(agentId, sessionId);
  const combined = existing
    ? `${existing}\n---\n${newContent}`
    : newContent;
  const trimmed =
    combined.length > maxLength
      ? combined.slice(-maxLength)
      : combined;
  await saveAgentMemory(agentId, trimmed, sessionId);
}
