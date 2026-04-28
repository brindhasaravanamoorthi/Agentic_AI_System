// Order API Routes - Customer order history
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/orders/:customerId
 * Get customer's order history
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orders.map((order) => {
      const items = order.items.map((item: { id: string; variant: { product: { name: string }; images: string | null; size: string | null; color: string | null }; quantity: number; priceAtPurchase: number }) => {
        const images = item.variant.images ? JSON.parse(item.variant.images) : [];
        return {
          id: item.id,
          productName: item.variant.product.name,
          variant: {
            size: item.variant.size,
            color: item.variant.color,
            images,
          },
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          subtotal: item.priceAtPurchase * item.quantity,
        };
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        items,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/orders/:customerId/:orderNumber
 * Get single order by order number
 */
router.get('/:customerId/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { customerId, orderNumber } = req.params as { customerId: string; orderNumber: string };

    const order = await prisma.order.findFirst({
      where: { customerId, orderNumber },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    const items = order.items.map((item: { id: string; variant: { id: string; product: { id: string; name: string }; images: string | null; size: string | null; color: string | null }; quantity: number; priceAtPurchase: number }) => {
      const images = item.variant.images ? JSON.parse(item.variant.images) : [];
      return {
        id: item.id,
        productName: item.variant.product.name,
        productId: item.variant.product.id,
        variant: {
          id: item.variant.id,
          size: item.variant.size,
          color: item.variant.color,
          images,
        },
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        subtotal: item.priceAtPurchase * item.quantity,
      };
    });

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        items,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch order',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
