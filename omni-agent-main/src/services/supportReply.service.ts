// Support Reply Service - AI Agent drafts customer emails for refunds & support
// Invokes the Support Agent to generate empathetic, context-aware replies

import { prisma } from '../config/database';
import { llm } from '../config/llm';
import { SUPPORT_SYSTEM_PROMPT } from '../agents/prompts';
import { getStoreContext } from './contextEnrichment.service';

export type SupportDraftResult = {
  success: boolean;
  draft?: string;
  subject?: string;
  to?: string;
  error?: string;
};

/**
 * Build context for return/refund request for the Support Agent
 */
async function buildReturnContext(returnRequestId: string): Promise<string> {
  const rr = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: {
      order: {
        include: {
          items: {
            include: {
              variant: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
      },
      customer: true,
    },
  });

  if (!rr) return '';

  const itemsList = rr.order.items
    .map(
      (i) =>
        `  - ${i.variant.product.name}: qty ${i.quantity}, $${i.priceAtPurchase?.toFixed(2) ?? '?'} each`
    )
    .join('\n');

  return `
[RETURN/REFUND REQUEST - Draft a reply to this customer]

Customer: ${rr.customer.name}
Email: ${rr.email}
Order: ${rr.order.orderNumber}
Type: ${rr.type}
Reason: ${rr.reason}
${rr.reasonDetail ? `Details: ${rr.reasonDetail}` : ''}
${rr.refundAmount ? `Refund amount: $${rr.refundAmount.toFixed(2)}` : ''}
Status: ${rr.status}

Order items:
${itemsList}

Order total: $${rr.order.total.toFixed(2)}
Order date: ${rr.order.createdAt.toISOString().split('T')[0]}

Draft a professional, empathetic email reply to this customer. Acknowledge their request, confirm we're processing it, and set expectations for next steps.`;
}

/**
 * Build context for support ticket for the Support Agent
 */
async function buildSupportTicketContext(ticketId: string): Promise<string> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return '';

  return `
[SUPPORT TICKET - Draft a reply to this customer]

Customer: ${ticket.name}
Email: ${ticket.email}
Subject: ${ticket.subject || 'General Inquiry'}
Message: ${ticket.message}
Status: ${ticket.status}

Draft a professional, empathetic email reply. Acknowledge their message, address their concern, and offer helpful next steps or solutions.`;
}

/**
 * Get conversation history for a return/support case (for follow-up replies)
 */
export async function getConversationHistory(
  referenceType: 'return' | 'support',
  referenceId: string
): Promise<Array<{ role: string; content: string }>> {
  const messages = await prisma.supportConversation.findMany({
    where: { referenceType, referenceId },
    orderBy: { createdAt: 'asc' },
  });
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Append a message to the conversation history
 */
export async function appendConversationMessage(
  referenceType: 'return' | 'support',
  referenceId: string,
  role: 'customer' | 'assistant',
  content: string
): Promise<void> {
  await prisma.supportConversation.create({
    data: { referenceType, referenceId, role, content },
  });
}

/**
 * Draft a customer reply using the AI Support Agent (for return/refund)
 */
export async function draftReturnReply(returnRequestId: string): Promise<SupportDraftResult> {
  try {
    const context = await buildReturnContext(returnRequestId);
    if (!context.trim()) {
      return { success: false, error: 'Return request not found' };
    }

    const rr = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { order: true, customer: true },
    });
    if (!rr) return { success: false, error: 'Return request not found' };

    const storeContext = await getStoreContext();
    const history = await getConversationHistory('return', returnRequestId);
    const historyStr =
      history.length > 0
        ? `[Previous conversation with this customer]\n${history
            .map((m) => `${m.role === 'customer' ? 'Customer' : 'You'}: ${m.content}`)
            .join('\n')}\n\n`
        : '';

    const input = historyStr + context + storeContext;

    const response = await llm.invoke([
      { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ]);

    const draft =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const subject = `Re: Your ${rr.type} request for Order ${rr.order.orderNumber}`;

    return {
      success: true,
      draft: draft.trim(),
      subject,
      to: rr.email,
    };
  } catch (error) {
    console.error('Draft return reply error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to draft reply',
    };
  }
}

/**
 * Draft a customer reply using the AI Support Agent (for support ticket)
 */
export async function draftSupportTicketReply(ticketId: string): Promise<SupportDraftResult> {
  try {
    const context = await buildSupportTicketContext(ticketId);
    if (!context.trim()) {
      return { success: false, error: 'Support ticket not found' };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) return { success: false, error: 'Support ticket not found' };

    const storeContext = await getStoreContext();
    const history = await getConversationHistory('support', ticketId);
    const historyStr =
      history.length > 0
        ? `[Previous conversation with this customer]\n${history
            .map((m) => `${m.role === 'customer' ? 'Customer' : 'You'}: ${m.content}`)
            .join('\n')}\n\n`
        : '';

    const input = historyStr + context + storeContext;

    const response = await llm.invoke([
      { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ]);

    const draft =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const subject = `Re: ${ticket.subject || 'Your support request'}`;

    return {
      success: true,
      draft: draft.trim(),
      subject,
      to: ticket.email,
    };
  } catch (error) {
    console.error('Draft support reply error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to draft reply',
    };
  }
}
