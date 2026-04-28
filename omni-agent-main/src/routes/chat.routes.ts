// Chat API Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { agentService } from '../services/agent.service';
import { chatSessionService } from '../services/chatSession.service';
import { executeAction } from '../services/actionExecutor.service';
import { runMonitorCheck } from '../services/agentMonitor.service';
import {
  getProductCardByProductId,
  getProductCardByProductName,
  getProductCardByVariantId,
  getLowStockProductCards,
  getTopSellingProductCards,
} from '../services/productCards.service';

const router = Router();

/**
 * POST /api/chat/monitor-check
 * Manually trigger agent monitor check (e.g. after simulation)
 */
router.post('/monitor-check', async (req: Request, res: Response) => {
  try {
    runMonitorCheck();
    res.json({ success: true, message: 'Monitor check triggered' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Monitor check failed' },
    });
  }
});

/**
 * GET /api/chat/sessions
 * List chat sessions for the user
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const sessions = await chatSessionService.listSessions(userId);
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list sessions',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get a session with all messages
 */
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = [req.params.id].flat().filter(Boolean)[0] ?? '';
    const rawUserId = req.query.userId;
    const userId: string = typeof rawUserId === 'string' ? rawUserId : (Array.isArray(rawUserId) && typeof rawUserId[0] === 'string' ? rawUserId[0] : 'default');
    const session = await chatSessionService.getSession(id, userId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get session',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const userId = (req.body.userId as string) || 'default';
    const session = await chatSessionService.createSession(userId, title || 'New Chat');
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create session',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete a chat session
 */
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = [req.params.id].flat().filter(Boolean)[0] ?? '';
    const rawUserId = req.query.userId;
    const userId: string = typeof rawUserId === 'string' ? rawUserId : (Array.isArray(rawUserId) && typeof rawUserId[0] === 'string' ? rawUserId[0] : 'default');
    const ok = await chatSessionService.deleteSession(id, userId);
    if (!ok) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete session',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/chat/decision
 * User approves or rejects a pending decision (Yes/No from frontend)
 */
router.post('/decision', async (req: Request, res: Response) => {
  try {
    const { decisionId, approved } = req.body;

    if (!decisionId || typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'decisionId and approved (boolean) are required',
        },
      });
    }

    const pending = await prisma.pendingDecision.findUnique({
      where: { id: decisionId },
    });

    if (!pending) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Decision not found' },
      });
    }

    if (pending.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_RESOLVED', message: 'Decision already resolved' },
      });
    }

    await prisma.pendingDecision.update({
      where: { id: decisionId },
      data: { status: approved ? 'approved' : 'rejected', resolvedAt: new Date() },
    });

    let result: { success: boolean; message: string; data?: any } | null = null;

    if (approved) {
      result = await executeAction(pending.actionType, pending.payload, pending.input);
      await prisma.pendingDecision.update({
        where: { id: decisionId },
        data: { result: JSON.stringify(result) },
      });
    }

    let productCards: any[] = [];
    if (approved && result) {
      await prisma.agentLog.create({
        data: {
          agentId: 'executive',
          eventType: 'decision_executed',
          severity: 'info',
          message: `User approved: ${pending.actionType} - ${result.message}`,
          metadata: JSON.stringify({ decisionId, actionType: pending.actionType, result: result.data }),
        },
      });
      const data = result.data;
      if (pending.actionType === 'add_product' && data?.productId) {
        const card = await getProductCardByProductId(data.productId);
        if (card) productCards = [card];
      } else if (pending.actionType === 'alter_product' && (data?.productId || data?.productName)) {
        if (data.productId) {
          const card = await getProductCardByProductId(data.productId);
          if (card) productCards = [card];
        } else if (data.productName) {
          const card = await getProductCardByProductName(data.productName);
          if (card) productCards = [card];
        }
      } else if (pending.actionType === 'restock_inventory' && (data?.variantId || data?.sku)) {
        const variantId = data.variantId;
        if (variantId) {
          const card = await getProductCardByVariantId(variantId);
          if (card) productCards = [card];
        }
      }

      if (productCards.length > 0) {
        const lastMsg = await prisma.chatMessage.findFirst({
          where: {
            sessionId: pending.sessionId,
            decisionMeta: { contains: pending.id },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (lastMsg?.decisionMeta) {
          const parsed = JSON.parse(lastMsg.decisionMeta);
          await prisma.chatMessage.update({
            where: { id: lastMsg.id },
            data: { decisionMeta: JSON.stringify({ ...parsed, productCards }) },
          });
        }
      }
    }

    if (!approved) {
      await prisma.agentLog.create({
        data: {
          agentId: 'executive',
          eventType: 'decision_rejected',
          severity: 'info',
          message: `User rejected: ${pending.actionType}`,
          metadata: JSON.stringify({ decisionId, actionType: pending.actionType }),
        },
      });
    }

    res.json({
      success: true,
      data: {
        decisionId,
        approved,
        result: result || { success: true, message: 'Rejected by user' },
        productCards: productCards.length > 0 ? productCards : undefined,
      },
    });
  } catch (error) {
    console.error('Decision endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process decision',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/chat/message/stream
 * Send a message and stream agent response (SSE). Persists to session.
 */
router.post('/message/stream', async (req: Request, res: Response) => {
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  try {
    const { message, sessionId: existingSessionId, agentIds } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a string',
        },
      });
    }

    let sessionId = existingSessionId;
    if (!sessionId) {
      const session = await chatSessionService.createSession('default', 'New Chat');
      sessionId = session.id;
    }

    await chatSessionService.addMessage(
      sessionId,
      { role: 'user', content: message },
      { updateTitle: true }
    );

    const session = await chatSessionService.getSession(sessionId, 'default');
    const history =
      session?.messages
        ?.filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(0, -1) ?? [];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      (res as any).flush?.();
    };

    sendEvent({ type: 'sessionId', sessionId });
    sendEvent({ type: 'agent_started', agent: 'Warden' });

    keepaliveInterval = setInterval(() => {
      res.write(': keepalive\n\n');
      (res as any).flush?.();
    }, 15000);

    let fullContent = '';
    let decision: any = null;
    let analysis: any = null;

    console.log(`\n[Chat] User: ${message}`);

    for await (const chunk of agentService.processUserQueryStream(message, history, sessionId, agentIds)) {
      if (chunk.type === 'delta' && chunk.content) {
        fullContent += (fullContent ? '\n\n' : '') + chunk.content;
        console.log(`[AI] ${chunk.content}`);
      } else if (chunk.type === 'agent_started' && chunk.agent) {
        console.log(`[AI] Agent: ${chunk.agent} processing...`);
      } else if (chunk.type === 'decision' && chunk.decision) {
        decision = chunk.decision;
      } else if (chunk.type === 'analysis' && chunk.analysis) {
        analysis = chunk.analysis;
      }
      sendEvent(chunk);
    }

    if (fullContent) {
      console.log(`[AI] Full response:\n${fullContent}\n`);
    }

    if (keepaliveInterval) clearInterval(keepaliveInterval);

    let decisionId: string | undefined;
    const action = decision?.proposedAction;
    if (action && action.actionType && action.actionType !== 'none') {
      const pending = await prisma.pendingDecision.create({
        data: {
          sessionId,
          actionType: action.actionType,
          payload: JSON.stringify(action.payload || {}),
          input: message,
          status: 'pending',
        },
      });
      decisionId = pending.id;
      decision = { ...decision, decisionId };
      sendEvent({ type: 'decision', decision });
    }

    let productCards: any[] = [];
    const msgLower = message.toLowerCase();
    const invKeywords = ['inventory', 'stock', 'restock', 'low stock', 'reorder', 'out of stock', 'check stock'];
    const salesKeywords = ['high selling', 'best selling', 'top products', 'sales', 'trending', 'popular'];
    if (invKeywords.some((k) => msgLower.includes(k))) {
      productCards = await getLowStockProductCards(6);
    } else if (salesKeywords.some((k) => msgLower.includes(k))) {
      productCards = await getTopSellingProductCards(6);
    } else if (action?.actionType === 'alter_product' && action.payload) {
      let p: Record<string, unknown> = {};
      try {
        p = typeof action.payload === 'string' ? JSON.parse(action.payload || '{}') : (action.payload as Record<string, unknown>);
      } catch {
        p = {};
      }
      if (p.productId) {
        const card = await getProductCardByProductId(p.productId as string);
        if (card) productCards = [card];
      } else if (p.productName) {
        const card = await getProductCardByProductName(p.productName as string);
        if (card) productCards = [card];
      }
    }
    if (productCards.length > 0) {
      sendEvent({ type: 'productCards', productCards });
    }

    await chatSessionService.addMessage(sessionId, {
      role: 'assistant',
      content: fullContent || '(No response generated)',
      decision,
      analysis,
      productCards: productCards.length > 0 ? productCards : undefined,
    });

    res.end();
  } catch (error) {
    if (keepaliveInterval) clearInterval(keepaliveInterval);
    console.error('Chat stream endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to stream message',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'delta', content: 'Stream error occurred' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat/message
 * Send a message to the agent system (non-streaming, with chat memory)
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, sessionId: existingSessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a string',
        },
      });
    }

    let sessionId = existingSessionId;
    if (!sessionId) {
      const session = await chatSessionService.createSession('default', 'New Chat');
      sessionId = session.id;
    }

    await chatSessionService.addMessage(
      sessionId,
      { role: 'user', content: message },
      { updateTitle: true }
    );

    const session = await chatSessionService.getSession(sessionId, 'default');
    const history = session?.messages
      ?.filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(0, -1) ?? []; // Exclude the message we just added

    const result = await agentService.processUserQuery(message, history, sessionId);

    if (!result.success) {
      await chatSessionService.addMessage(sessionId, {
        role: 'system',
        content: `Error: ${(result as any).error?.message || 'Agent failed'}`,
      });
      return res.json(result);
    }

    const data = (result as { success: true; data: { response: string; decision: any; analysis: any } }).data;
    const { response, decision, analysis } = data;
    let decisionWithId = decision;

    const action = decision?.proposedAction;
    if (action && action.actionType && action.actionType !== 'none') {
      const pending = await prisma.pendingDecision.create({
        data: {
          sessionId,
          actionType: action.actionType,
          payload: JSON.stringify(action.payload || {}),
          input: message,
          status: 'pending',
        },
      });
      decisionWithId = { ...decision, decisionId: pending.id };
    }

    let productCards: any[] = [];
    const msgLower = message.toLowerCase();
    const invKeywords = ['inventory', 'stock', 'restock', 'low stock', 'reorder', 'out of stock', 'check stock'];
    const salesKeywords = ['high selling', 'best selling', 'top products', 'sales', 'trending', 'popular'];
    if (invKeywords.some((k) => msgLower.includes(k))) {
      productCards = await getLowStockProductCards(6);
    } else if (salesKeywords.some((k) => msgLower.includes(k))) {
      productCards = await getTopSellingProductCards(6);
    } else if (action?.actionType === 'alter_product' && action.payload) {
      let p: Record<string, unknown> = {};
      try {
        p = typeof action.payload === 'string' ? JSON.parse(action.payload || '{}') : (action.payload as Record<string, unknown>);
      } catch {
        p = {};
      }
      if (p.productId) {
        const card = await getProductCardByProductId(p.productId as string);
        if (card) productCards = [card];
      } else if (p.productName) {
        const card = await getProductCardByProductName(p.productName as string);
        if (card) productCards = [card];
      }
    }

    await chatSessionService.addMessage(sessionId, {
      role: 'assistant',
      content: response || '(No response generated)',
      decision: decisionWithId,
      analysis,
      productCards: productCards.length > 0 ? productCards : undefined,
    });

    res.json({
      success: true,
      data: {
        sessionId,
        response,
        decision: decisionWithId,
        analysis,
        productCards: productCards.length > 0 ? productCards : undefined,
      },
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process message',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/chat/test
 * Test the agent system connection
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const result = await agentService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
