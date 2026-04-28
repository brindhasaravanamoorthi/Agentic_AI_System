// Simulation Control API Routes
// Allows manipulation of e-commerce data to test agent reactions

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { runMonitorCheck } from '../services/agentMonitor.service';

const router = Router();

/**
 * GET /api/simulation/scenarios
 * Get all available simulation scenarios
 */
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const scenarios = await prisma.simulationScenario.findMany({
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        initialState: JSON.parse(scenario.initialState),
        triggers: JSON.parse(scenario.triggers),
        isActive: scenario.isActive,
        eventCount: scenario._count.events,
        createdAt: scenario.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch scenarios',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/simulation/spike-sales
 * Simulate a sales spike for specific product (or random if variantId omitted)
 * Body: { variantId?, multiplier, durationHours }
 */
router.post('/spike-sales', async (req: Request, res: Response) => {
  try {
    const { variantId, multiplier = 3, durationHours = 2 } = req.body;

    let variant;
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: { select: { name: true } },
          inventory: true,
        },
      });
    } else {
      // Pick a random variant with inventory
      const variantsWithStock = await prisma.productVariant.findMany({
        where: {
          inventory: {
            quantity: { gt: 0 },
          },
        },
        include: {
          product: { select: { name: true } },
          inventory: true,
        },
      });
      if (variantsWithStock.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_VARIANTS',
            message: 'No variants with stock available for simulation',
          },
        });
      }
      const randomIndex = Math.floor(Math.random() * variantsWithStock.length);
      variant = variantsWithStock[randomIndex];
    }

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product variant not found',
        },
      });
    }

    if (!variant.inventory) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_INVENTORY',
          message: 'Variant has no inventory record',
        },
      });
    }

    // Calculate how much to reduce
    const currentStock = variant.inventory.quantity;
    const avgSalesPerHour = 2; // Assumed baseline
    const spikeSales = Math.floor(avgSalesPerHour * multiplier * durationHours);
    const newStock = Math.max(0, currentStock - spikeSales);

    // Update inventory
    await prisma.inventory.update({
      where: { id: variant.inventory.id },
      data: {
        quantity: newStock,
      },
    });

    // Log the simulation
    await prisma.agentLog.create({
      data: {
        agentId: 'warden',
        eventType: 'simulation_triggered',
        severity: 'info',
        message: `Sales spike simulation: ${variant.product.name} (${variant.sku})`,
        metadata: JSON.stringify({
          type: 'sales_spike',
          multiplier,
          durationHours,
          previousStock: currentStock,
          newStock,
          unitsSold: spikeSales,
        }),
      },
    });

    runMonitorCheck().catch(() => {});

    res.json({
      success: true,
      message: `Sales spike simulated for ${variant.product.name}`,
      data: {
        sku: variant.sku,
        previousStock: currentStock,
        newStock,
        unitsSold: spikeSales,
        multiplier,
        lowStockAlert: newStock <= variant.inventory.reorderThreshold,
      },
    });
  } catch (error) {
    console.error('Spike sales error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to simulate sales spike',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/simulation/low-inventory
 * Simulate low inventory situation (or random variant if variantId omitted)
 * Body: { variantId?, targetQuantity }
 */
router.post('/low-inventory', async (req: Request, res: Response) => {
  try {
    const { variantId, targetQuantity = 5 } = req.body;

    let variant;
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: { select: { name: true } },
          inventory: true,
        },
      });
    } else {
      // Pick a random variant with inventory
      const variantsWithStock = await prisma.productVariant.findMany({
        where: {
          inventory: { isNot: null },
        },
        include: {
          product: { select: { name: true } },
          inventory: true,
        },
      });
      if (variantsWithStock.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_VARIANTS',
            message: 'No variants with inventory available for simulation',
          },
        });
      }
      const randomIndex = Math.floor(Math.random() * variantsWithStock.length);
      variant = variantsWithStock[randomIndex];
    }

    if (!variant || !variant.inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product variant or inventory not found',
        },
      });
    }

    const previousStock = variant.inventory.quantity;

    // Update inventory to low level
    await prisma.inventory.update({
      where: { id: variant.inventory.id },
      data: {
        quantity: targetQuantity,
      },
    });

    // Log the simulation
    await prisma.agentLog.create({
      data: {
        agentId: 'warden',
        eventType: 'simulation_triggered',
        severity: 'warning',
        message: `Low inventory simulation: ${variant.product.name} (${variant.sku})`,
        metadata: JSON.stringify({
          type: 'low_inventory',
          previousStock,
          newStock: targetQuantity,
          threshold: variant.inventory.reorderThreshold,
        }),
      },
    });

    runMonitorCheck().catch(() => {});

    res.json({
      success: true,
      message: `Low inventory simulated for ${variant.product.name}`,
      data: {
        sku: variant.sku,
        previousStock,
        newStock: targetQuantity,
        threshold: variant.inventory.reorderThreshold,
        belowThreshold: targetQuantity <= variant.inventory.reorderThreshold,
      },
    });
  } catch (error) {
    console.error('Low inventory error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to simulate low inventory',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/simulation/restock
 * Simulate restocking
 * Body: { variantId, quantity }
 */
router.post('/restock', async (req: Request, res: Response) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId || !quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'variantId and quantity are required',
        },
      });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { name: true } },
        inventory: true,
      },
    });

    if (!variant || !variant.inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product variant or inventory not found',
        },
      });
    }

    const previousStock = variant.inventory.quantity;
    const newStock = previousStock + quantity;

    await prisma.inventory.update({
      where: { id: variant.inventory.id },
      data: {
        quantity: newStock,
        lastRestockedAt: new Date(),
      },
    });

    // Log the restock
    await prisma.agentLog.create({
      data: {
        agentId: 'executive',
        eventType: 'restock_completed',
        severity: 'info',
        message: `Restock completed: ${variant.product.name} (${variant.sku})`,
        metadata: JSON.stringify({
          type: 'restock',
          previousStock,
          newStock,
          quantityAdded: quantity,
        }),
      },
    });

    res.json({
      success: true,
      message: `Restocked ${quantity} units of ${variant.product.name}`,
      data: {
        sku: variant.sku,
        previousStock,
        newStock,
        quantityAdded: quantity,
      },
    });
  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to simulate restock',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/simulation/abandon-cart
 * Create an abandoned cart for testing
 * Body: { customerId, variantIds[] }
 */
router.post('/abandon-cart', async (req: Request, res: Response) => {
  try {
    const { customerId, variantIds = [] } = req.body;

    if (!customerId || !Array.isArray(variantIds) || variantIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'customerId and variantIds array are required',
        },
      });
    }

    // Create cart
    const cart = await prisma.cart.create({
      data: {
        customerId,
        abandonedAt: new Date(),
        items: {
          create: variantIds.map((variantId) => ({
            variantId,
            quantity: 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const totalValue = cart.items.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );

    // Log the event
    await prisma.agentLog.create({
      data: {
        agentId: 'warden',
        eventType: 'simulation_triggered',
        severity: 'info',
        message: `Abandoned cart simulation created`,
        metadata: JSON.stringify({
          type: 'abandoned_cart',
          cartId: cart.id,
          customerId,
          itemCount: cart.items.length,
          totalValue,
        }),
      },
    });

    runMonitorCheck().catch(() => {});

    res.json({
      success: true,
      message: 'Abandoned cart created',
      data: {
        cartId: cart.id,
        customerId,
        itemCount: cart.items.length,
        totalValue: parseFloat(totalValue.toFixed(2)),
        abandonedAt: cart.abandonedAt,
      },
    });
  } catch (error) {
    console.error('Abandon cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create abandoned cart',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/simulation/analytics
 * Get analytics data for business dashboard charts and insights
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Activity by day (last 7 days)
    const recentLogs = await prisma.agentLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const dayBuckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = 0;
    }
    recentLogs.forEach((log) => {
      const key = new Date(log.createdAt).toISOString().slice(0, 10);
      if (dayBuckets[key] !== undefined) dayBuckets[key]++;
    });

    const activityByDay = Object.entries(dayBuckets).map(([date, count]) => ({
      date,
      count,
      label: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    }));

    // Activity by agent
    const activityByAgent = await prisma.agentLog.groupBy({
      by: ['agentId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    // Activity by severity
    const activityBySeverity = await prisma.agentLog.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    // Order stats
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: { items: true },
    });
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Inventory overview
    const inventory = await prisma.inventory.findMany({
      include: {
        variant: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    const inventoryByStatus = {
      critical: inventory.filter((i) => i.quantity <= 5).length,
      low: inventory.filter((i) => i.quantity > 5 && i.quantity <= i.reorderThreshold).length,
      healthy: inventory.filter((i) => i.quantity > i.reorderThreshold).length,
    };

    const lowStockItems = inventory.filter((i) => i.quantity <= i.reorderThreshold);
    const totalAbandonedValue = await prisma.cart
      .findMany({
        where: { abandonedAt: { not: null } },
        include: {
          items: { include: { variant: true } },
        },
      })
      .then((carts) =>
        carts.reduce(
          (sum, c) =>
            sum +
            c.items.reduce((s, i) => s + i.variant.price * i.quantity, 0),
          0
        )
      );

    res.json({
      success: true,
      data: {
        activityByDay,
        activityByAgent: activityByAgent.map((a) => ({
          agent: a.agentId,
          count: a._count,
        })),
        activityBySeverity: activityBySeverity.map((s) => ({
          severity: s.severity,
          count: s._count,
        })),
        orderStats: {
          totalOrders: orders.length,
          totalRevenue,
          avgOrderValue,
        },
        inventoryByStatus,
        lowStockCount: lowStockItems.length,
        totalAbandonedValue,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/simulation/status
 * Get current system status for monitoring
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get low stock items
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.reorderThreshold,
        },
      },
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      take: 10,
    });

    // Get abandoned carts (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        abandonedAt: {
          gte: yesterday,
        },
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Recent agent activity
    const recentLogs = await prisma.agentLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        lowStockItems: lowStockItems.map((inv) => ({
          sku: inv.variant.sku,
          productName: inv.variant.product.name,
          size: inv.variant.size,
          color: inv.variant.color,
          currentStock: inv.quantity,
          threshold: inv.reorderThreshold,
          deficit: inv.reorderThreshold - inv.quantity,
        })),
        abandonedCarts: abandonedCarts.map((cart) => ({
          id: cart.id,
          customer: cart.customer,
          itemCount: cart.items.length,
          totalValue: cart.items.reduce(
            (sum, item) => sum + item.variant.price * item.quantity,
            0
          ),
          hoursAbandoned: Math.floor(
            (Date.now() - (cart.abandonedAt?.getTime() || Date.now())) / (1000 * 60 * 60)
          ),
        })),
        recentActivity: recentLogs.map((log) => ({
          agentId: log.agentId,
          eventType: log.eventType,
          severity: log.severity,
          message: log.message,
          createdAt: log.createdAt,
        })),
        summary: {
          lowStockCount: lowStockItems.length,
          abandonedCartsCount: abandonedCarts.length,
          criticalAlerts: lowStockItems.filter((inv) => inv.quantity <= 5).length,
        },
      },
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch status',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/simulation/reset
 * Reset simulation data to initial state
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // This would re-run the seed script or reset specific tables
    res.json({
      success: true,
      message: 'Reset requested. Run `npm run prisma:seed` to reset data',
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset simulation',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
