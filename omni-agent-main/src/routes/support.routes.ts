// Support/Contact API Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import {
  draftSupportTicketReply,
  appendConversationMessage,
} from '../services/supportReply.service';
import { executeAction } from '../services/actionExecutor.service';

const router = Router();

/**
 * POST /api/support
 * Submit a support/contact form
 * Body: { name, email, subject?, message }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, email, and message are required',
        },
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        name,
        email,
        subject: subject || 'General Inquiry',
        message,
        status: 'open',
      },
    });

    // Store customer message for conversation history (AI agent context)
    await appendConversationMessage('support', ticket.id, 'customer', message);

    // AI Agent drafts a customer reply
    const draftResult = await draftSupportTicketReply(ticket.id);

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out. We will get back to you shortly.',
      data: {
        id: ticket.id,
        status: ticket.status,
        createdAt: ticket.createdAt,
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
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit support request',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/support/:id/draft
 * Regenerate AI draft reply for a support ticket
 */
router.post('/:id/draft', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '');
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Support ticket not found' },
      });
    }
    const result = await draftSupportTicketReply(id);
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
    console.error('Draft support reply error:', error);
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
 * POST /api/support/:id/send-reply
 * Send email reply to customer (uses AI draft or provided body)
 * Body: { body?, subject? } - optional overrides
 */
router.post('/:id/send-reply', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '');
    const { body: bodyOverride, subject: subjectOverride } = req.body;
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Support ticket not found' },
      });
    }
    let body = bodyOverride;
    let subject = subjectOverride;
    if (!body) {
      const draftResult = await draftSupportTicketReply(id);
      if (!draftResult.success || !draftResult.draft) {
        return res.status(500).json({
          success: false,
          error: { code: 'DRAFT_FAILED', message: draftResult.error || 'Could not generate draft' },
        });
      }
      body = draftResult.draft;
      subject = subject || draftResult.subject;
    }
    subject = subject || `Re: ${ticket.subject || 'Your support request'}`;
    const result = await executeAction(
      'send_reply_email',
      { to: ticket.email, subject, body: String(body) },
      ''
    );
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'SEND_FAILED', message: result.message },
      });
    }
    // Store assistant reply in conversation history
    await appendConversationMessage('support', id, 'assistant', String(body));
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

export default router;
