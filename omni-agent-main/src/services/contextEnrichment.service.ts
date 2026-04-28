// Context Enrichment - Injects full ecom store data for agent decisions
// Agents always receive comprehensive store data to make informed decisions

import { prisma } from '../config/database';

/**
 * Get full store snapshot - products, inventory, orders, carts, categories.
 * Always included so agents can use ecom data fully.
 */
export async function getFullStoreSnapshot(): Promise<string> {
  const [categories, products, lowStock, recentOrders, abandonedCarts, supportOpen, pendingReturns] = await Promise.all([
    prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          include: { inventory: true },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.inventory.findMany({
      where: { quantity: { lte: 15 } },
      include: {
        variant: {
          include: { product: { select: { name: true } } },
        },
      },
      orderBy: { quantity: 'asc' },
      take: 15,
    }),
    prisma.order.findMany({
      where: { status: { not: 'cancelled' } },
      include: {
        items: { include: { variant: { include: { product: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.cart.findMany({
      where: { abandonedAt: { not: null } },
      include: {
        items: { include: { variant: { include: { product: { select: { name: true } } } } } },
        customer: { select: { name: true, email: true } },
      },
      orderBy: { abandonedAt: 'desc' },
      take: 5,
    }),
    prisma.$queryRawUnsafe<[{ c: number }]>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'").then(
      (r) => (r?.[0]?.c ?? 0)
    ).catch(() => 0),
    prisma.returnRequest.findMany({
      where: { status: 'pending' },
      include: {
        order: { select: { orderNumber: true, total: true } },
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const sections: string[] = [];

  // Categories
  if (categories.length > 0) {
    sections.push(
      `[CATEGORIES]\n${categories.map((c) => `  - ${c.name} (${c.slug}): ${(c as any)._count?.products ?? 0} products`).join('\n')}`
    );
  }

  // Products with stock
  if (products.length > 0) {
    const lines = products.map((p) => {
      const v = p.variants[0];
      const stock = v?.inventory?.quantity ?? 0;
      const cat = (p as any).category?.name ?? '?';
      return `  - ${p.name} | $${v?.price?.toFixed(2) ?? '?'} | stock: ${stock} | ${cat}`;
    });
    sections.push(`[PRODUCTS]\n${lines.join('\n')}`);
  }

  // Low stock
  if (lowStock.length > 0) {
    const lines = lowStock.map(
      (i) =>
        `  - ${i.variant.product.name} (${i.variant.sku}): ${i.quantity} units, reorder at ${i.reorderThreshold}`
    );
    sections.push(`[LOW STOCK - needs attention]\n${lines.join('\n')}`);
  }

  // Recent orders
  if (recentOrders.length > 0) {
    const totalRev = recentOrders.reduce((s, o) => s + o.total, 0);
    const lines = recentOrders.slice(0, 5).map(
      (o) =>
        `  - ${o.orderNumber}: $${o.total.toFixed(2)}, ${o.status}, ${o.items.length} items`
    );
    sections.push(`[RECENT ORDERS]\nTotal revenue (sample): $${totalRev.toFixed(2)}\n${lines.join('\n')}`);
  }

  // Abandoned carts
  if (abandonedCarts.length > 0) {
    const lines = abandonedCarts.map((c) => {
      const total = c.items.reduce((s, i) => s + i.variant.price * i.quantity, 0);
      const hrs = c.abandonedAt
        ? Math.floor((Date.now() - c.abandonedAt.getTime()) / (1000 * 60 * 60))
        : 0;
      return `  - ${(c as any).customer?.name || 'Guest'}: $${total.toFixed(2)}, ${c.items.length} items, ${hrs}h ago`;
    });
    sections.push(`[ABANDONED CARTS]\n${lines.join('\n')}`);
  }

  // Support
  if (typeof supportOpen === 'number' && supportOpen > 0) {
    sections.push(`[SUPPORT] ${supportOpen} open ticket(s)`);
  }

  // Pending returns/refunds
  if (pendingReturns.length > 0) {
    const lines = pendingReturns.map(
      (r) =>
        `  - ${r.order.orderNumber}: ${r.type} | ${r.reason} | ${r.customer.name} | ${r.email}`
    );
    sections.push(`[PENDING RETURNS/REFUNDS - need customer reply]\n${lines.join('\n')}`);
  }

  if (sections.length === 0) return '';
  return `\n\n[LIVE STORE DATA - use for accurate analysis]\n${sections.join('\n\n')}\n`;
}

/**
 * Get store context for agent input. Always includes full snapshot.
 */
export async function getStoreContext(_userInput?: string): Promise<string> {
  return getFullStoreSnapshot();
}
