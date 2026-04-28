// Return/Refund API Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  draftReturnReply,
  appendConversationMessage,
} from '../services/supportReply.service';
import { executeAction } from '../services/actionExecutor.service';

const router = Router();

/**
 * POST /api/returns
 * Create a return or refund request
 * Body: { orderId, customerId, email, type: "return"|"refund", reason, reasonDetail?, notes? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { orderId, customerId, email, type, reason, reasonDetail, notes } = req.body;

    if (!orderId || !customerId || !email || !type || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'orderId, customerId, email, type, and reason are required',
        },
      });
    }

    if (!['return', 'refund'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type must be "return" or "refund"',
        },
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found or does not belong to customer',
        },
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Customer not found',
        },
      });
    }

    const refundAmount = type === 'refund' ? order.total : null;

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        customerId,
        email: email.trim().toLowerCase(),
        type,
        reason,
        reasonDetail: reasonDetail || null,
        notes: notes || null,
        refundAmount,
        status: 'pending',
      },
    });

    // Store customer message for conversation history (AI agent context)
    const customerMessage = `Requested ${type}: ${reason}${reasonDetail ? ` - ${reasonDetail}` : ''}`;
    await appendConversationMessage('return', returnRequest.id, 'customer', customerMessage);

    // AI Agent drafts a customer reply
    const draftResult = await draftReturnReply(returnRequest.id);

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully',
      data: {
        id: returnRequest.id,
        orderNumber: order.orderNumber,
        type: returnRequest.type,
        reason: returnRequest.reason,
        status: returnRequest.status,
        refundAmount: returnRequest.refundAmount,
        createdAt: returnRequest.createdAt,
        // AI-generated draft for staff to review/send
        aiDraft: draftResult.success
          ? {
              body: draftResult.draft,
              subject: draftResult.subject,
              to: draftResult.to,
            }
          : null,
        aiDraftError: draftResult.success ? undefined : draftResult.error,
      },
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit return request',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/returns/:id/draft
 * Regenerate AI draft reply for a return/refund request
 */
router.post('/:id/draft', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '');
    const rr = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!rr) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Return request not found' },
      });
    }
    const result = await draftReturnReply(id);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'DRAFT_FAILED', message: result.error },
      });
    }
    res.json({
      success: true,
      data: { body: result.draft, subject: result.subject, to: result.to },
    });
  } catch (error) {
    console.error('Draft return reply error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate draft',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/returns/:id/send-reply
 * Send email reply to customer (uses AI draft or provided body)
 * Body: { body?, subject? } - optional overrides
 */
router.post('/:id/send-reply', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '');
    const { body: bodyOverride, subject: subjectOverride } = req.body;
    const rr = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!rr) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Return request not found' },
      });
    }
    let body = bodyOverride;
    let subject = subjectOverride;
    if (!body) {
      const draftResult = await draftReturnReply(id);
      if (!draftResult.success || !draftResult.draft) {
        return res.status(500).json({
          success: false,
          error: { code: 'DRAFT_FAILED', message: draftResult.error || 'Could not generate draft' },
        });
      }
      body = draftResult.draft;
      subject = subject || draftResult.subject;
    }
    subject = subject || `Re: Your ${rr.type} request for Order ${rr.order.orderNumber}`;
    const result = await executeAction(
      'send_reply_email',
      { to: rr.email, subject, body: String(body) },
      ''
    );
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'SEND_FAILED', message: result.message },
      });
    }
    // Store assistant reply in conversation history
    await appendConversationMessage('return', id, 'assistant', String(body));
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send reply',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/returns/:customerId
 * Get customer's return/refund requests
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };

    const requests = await prisma.returnRequest.findMany({
      where: { customerId },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        orderNumber: r.order.orderNumber,
        orderTotal: r.order.total,
        orderDate: r.order.createdAt,
        email: r.email,
        type: r.type,
        reason: r.reason,
        reasonDetail: r.reasonDetail,
        status: r.status,
        refundAmount: r.refundAmount,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get return requests error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch return requests',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
