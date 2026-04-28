// Chat Session Service - Persist chat history and agent conversations

import { prisma } from '../config/database';

const DEFAULT_USER_ID = 'default';

function safeParseJson(val: string | null | undefined, fallback: object = {}): object {
  if (!val || typeof val !== 'string' || val.trim() === '') return fallback;
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === 'object' && parsed !== null ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export type ChatMessageInput = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  decision?: Record<string, unknown>;
  analysis?: { warden?: string; finance?: string; architect?: string };
  productCards?: Array<Record<string, unknown>>;
};

export class ChatSessionService {
  /**
   * List chat sessions for a user (most recent first)
   */
  async listSessions(userId: string = DEFAULT_USER_ID, limit = 50) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  /**
   * Get a session with all messages
   */
  async getSession(sessionId: string, userId: string = DEFAULT_USER_ID) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!session) return null;
    return {
      ...session,
      messages: session.messages.map((m) => {
        const parsed = safeParseJson(m.decisionMeta, {}) as Record<string, unknown>;
        const analysis = safeParseJson(m.analysisMeta, {}) as { warden?: string; finance?: string; architect?: string };
        return {
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          decision: Object.keys(parsed).length ? parsed : undefined,
          analysis: Object.keys(analysis).length ? analysis : undefined,
          productCards: parsed.productCards,
        };
      }),
    };
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string = DEFAULT_USER_ID, title = 'New Chat') {
    return prisma.chatSession.create({
      data: { userId, title },
    });
  }

  /**
   * Add a message to a session
   */
  async addMessage(
    sessionId: string,
    msg: ChatMessageInput,
    options?: { updateTitle?: boolean }
  ) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
    if (!session) return null;

    const decisionPayload = msg.decision
      ? { ...msg.decision, ...(msg.productCards?.length && { productCards: msg.productCards }) }
      : msg.productCards?.length
        ? { productCards: msg.productCards }
        : null;

    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: msg.role,
        content: msg.content,
        decisionMeta: decisionPayload ? JSON.stringify(decisionPayload) : null,
        analysisMeta: msg.analysis ? JSON.stringify(msg.analysis) : null,
      },
    });

    // Auto-update title from first user message
    if (options?.updateTitle && msg.role === 'user' && session.title === 'New Chat') {
      const title = msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '');
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    return message;
  }

  /**
   * Update an assistant message (e.g. after streaming completes)
   */
  async updateMessage(
    sessionId: string,
    messageId: string,
    updates: { content?: string; decision?: object; analysis?: object }
  ) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId },
      include: { messages: true },
    });
    if (!session) return null;

    const existing = session.messages.find((m) => m.id === messageId);
    if (!existing) return null;

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.decision !== undefined && {
          decisionMeta: JSON.stringify(updates.decision),
        }),
        ...(updates.analysis !== undefined && {
          analysisMeta: JSON.stringify(updates.analysis),
        }),
      },
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string, userId: string = DEFAULT_USER_ID) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return false;
    await prisma.chatSession.delete({ where: { id: sessionId } });
    return true;
  }
}

export const chatSessionService = new ChatSessionService();
