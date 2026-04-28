// Agent Monitor - Auto-activates agents on data changes (low stock, abandoned carts, spikes)

import { prisma } from '../config/database';
import { agentService } from './agent.service';
import { chatSessionService } from './chatSession.service';

const ALERTS_SESSION_TITLE = 'System Alerts';
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCheckTime: Date | null = null;
let alertsSessionId: string | null = null;

async function getOrCreateAlertsSession(): Promise<string> {
  if (alertsSessionId) return alertsSessionId;
  const sessions = await chatSessionService.listSessions('default', 100);
  const existing = sessions.find((s: any) => s.title === ALERTS_SESSION_TITLE);
  if (existing) {
    alertsSessionId = existing.id;
    return alertsSessionId;
  }
  const session = await chatSessionService.createSession('default', ALERTS_SESSION_TITLE);
  alertsSessionId = session.id;
  return alertsSessionId;
}

async function postAlertToChat(content: string, trigger: string) {
  try {
    const sessionId = await getOrCreateAlertsSession();
    await chatSessionService.addMessage(sessionId, {
      role: 'assistant',
      content: `**[${trigger}]**\n\n${content}`,
    });
    console.log(`[AgentMonitor] Posted alert to chat: ${trigger}`);
  } catch (error) {
    console.error('[AgentMonitor] Failed to post alert:', error);
  }
}

export async function runMonitorCheck() {
  const now = new Date();
  if (lastCheckTime && now.getTime() - lastCheckTime.getTime() < CHECK_INTERVAL_MS) {
    return;
  }
  lastCheckTime = now;

  try {
    const lowStock = await prisma.inventory.findMany({
      where: { quantity: { lte: 10 } },
      include: { variant: { include: { product: true } } },
    });

    const abandonedCarts = await prisma.cart.findMany({
      where: { abandonedAt: { not: null } },
      include: { items: { include: { variant: { include: { product: true } } } } },
      take: 5,
    });

    let triggered = false;
    let triggerInput = '';

    if (lowStock.length > 0) {
      const items = lowStock
        .map((i) => `${i.variant.product.name} (${i.variant.sku}): ${i.quantity} units`)
        .join('\n');
      triggerInput += `LOW INVENTORY ALERT:\n${items}\n\n`;
      triggered = true;
    }

    if (abandonedCarts.length > 0) {
      const carts = abandonedCarts
        .map((c) => {
          const total = c.items.reduce((s, i) => s + i.variant.price * i.quantity, 0);
          return `Cart with ${c.items.length} items, value $${total.toFixed(2)}`;
        })
        .join('\n');
      triggerInput += `ABANDONED CARTS:\n${carts}\n\n`;
      triggered = true;
    }

    if (triggered) {
      const fullInput = `Automatic check detected the following. Please analyze and provide recommendations:\n\n${triggerInput}`;
      const result = await agentService.processUserQuery(fullInput);

      if (result.success && result.data) {
        const response = (result as any).data.response;
        const trigger = lowStock.length > 0 && abandonedCarts.length > 0
          ? 'Inventory & Abandoned Carts'
          : lowStock.length > 0
          ? 'Low Inventory'
          : 'Abandoned Carts';
        await postAlertToChat(response, trigger);
      }
    }
  } catch (error) {
    console.error('[AgentMonitor] Check failed:', error);
  }
}

export function startAgentMonitor() {
  setInterval(runMonitorCheck, CHECK_INTERVAL_MS);
  console.log('[AgentMonitor] Started - checking every 60s');
  runMonitorCheck();
}
