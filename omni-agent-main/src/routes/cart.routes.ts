// Cart API Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/cart/:customerId
 * Get customer's active cart with all items
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };

    // Find or create cart for customer
    let cart = await prisma.cart.findFirst({
      where: {
        customerId,
        abandonedAt: null,
      },
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
                inventory: {
                  select: {
                    quantity: true,
                    reservedQuantity: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Ensure customer exists (create demo customer if needed)
      let customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            id: customerId,
            email: `${customerId}@demo.local`,
            name: 'Demo Customer',
          },
        });
      }

      // Create new empty cart
      cart = await prisma.cart.create({
        data: {
          customerId,
        },
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
                  inventory: {
                    select: {
                      quantity: true,
                      reservedQuantity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Calculate totals
    const items = cart.items.map((item: any) => {
      const availableQty = item.variant.inventory
        ? item.variant.inventory.quantity - item.variant.inventory.reservedQuantity
        : 0;

      return {
        id: item.id,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          size: item.variant.size,
          color: item.variant.color,
          price: item.variant.price,
          images: item.variant.images ? JSON.parse(item.variant.images) : [],
          product: item.variant.product,
          inStock: availableQty > 0,
          availableQuantity: availableQty,
        },
        quantity: item.quantity,
        subtotal: item.variant.price * item.quantity,
        addedAt: item.addedAt,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.09; // 9% tax
    const shipping = subtotal > 0 ? 5.99 : 0;
    const total = subtotal + tax + shipping;

    res.json({
      success: true,
      data: {
        id: cart.id,
        customerId: cart.customerId,
        items,
        summary: {
          itemCount: items.length,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cart',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/cart/add
 * Add item to cart
 * Body: { customerId, variantId, quantity }
 */
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { customerId, variantId, quantity = 1 } = req.body;

    if (!customerId || !variantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'customerId and variantId are required',
        },
      });
    }

    if (quantity < 1 || quantity > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be between 1 and 10',
        },
      });
    }

    // Check variant exists and has stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product variant not found',
        },
      });
    }

    const availableQty = variant.inventory
      ? variant.inventory.quantity - variant.inventory.reservedQuantity
      : 0;

    if (availableQty < quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: `Only ${availableQty} units available`,
          data: {
            requestedQuantity: quantity,
            availableQuantity: availableQty,
          },
        },
      });
    }

    // Find or create cart (ensure customer exists first)
    let customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          id: customerId,
          email: `${customerId}@demo.local`,
          name: 'Demo Customer',
        },
      });
    }

    let cart = await prisma.cart.findFirst({
      where: {
        customerId,
        abandonedAt: null,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customerId,
        },
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (availableQty < newQuantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: `Cannot add ${quantity} more. Only ${availableQty - existingItem.quantity} more available`,
            data: {
              currentInCart: existingItem.quantity,
              requestedQuantity: quantity,
              availableQuantity: availableQty,
            },
          },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
        });
        if (variant.inventory) {
          await tx.inventory.update({
            where: { id: variant.inventory.id },
            data: { reservedQuantity: { increment: quantity } },
          });
        }
      });
    } else {
      // Add new item and reserve inventory
      await prisma.$transaction(async (tx) => {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            variantId,
            quantity,
          },
        });
        if (variant.inventory) {
          await tx.inventory.update({
            where: { id: variant.inventory.id },
            data: { reservedQuantity: { increment: quantity } },
          });
        }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: true,
      },
    });

    res.json({
      success: true,
      message: `Added ${quantity}x ${variant.product.name} (Size: ${variant.size}) to cart`,
      data: {
        cartId: cart.id,
        itemCount: updatedCart?.items.length || 0,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add item to cart',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * POST /api/cart/checkout
 * Convert cart to order. Body: { customerId, email? }
 * Email is used for order confirmation and support agent contact.
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { customerId, email } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'customerId is required',
        },
      });
    }

    const cart = await prisma.cart.findFirst({
      where: {
        customerId,
        abandonedAt: null,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Cart is empty. Add items before checkout.',
        },
      });
    }

    // Update customer email if provided (for support agent to contact)
    if (email && typeof email === 'string' && email.trim()) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { email: email.trim().toLowerCase() },
      }).catch(() => {
        // Ignore if customer not found or update fails
      });
    }

    // Ensure customer has shipping address (create demo address if needed)
    let address = await prisma.address.findFirst({
      where: { customerId },
    });

    if (!address) {
      address = await prisma.address.create({
        data: {
          customerId,
          type: 'shipping',
          street: '123 Demo Street',
          city: 'Demo City',
          state: 'DC',
          zip: '12345',
          country: 'US',
          isDefault: true,
        },
      });
    }

    // Verify stock and calculate totals
    const subtotal = cart.items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
    const tax = subtotal * 0.09;
    const shipping = subtotal > 0 ? 5.99 : 0;
    const total = subtotal + tax + shipping;

    for (const item of cart.items) {
      const available = item.variant.inventory
        ? item.variant.inventory.quantity - item.variant.inventory.reservedQuantity
        : 0;
      if (available < item.quantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: `${item.variant.product.name} (Size: ${item.variant.size}) - only ${available} in stock`,
          },
        });
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: 'pending',
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          shippingAddressId: address!.id,
          isSimulated: true,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              priceAtPurchase: item.variant.price,
              costAtPurchase: item.variant.costPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
      });

      // Decrement inventory and release reservation
      for (const item of cart.items) {
        if (item.variant.inventory) {
          await tx.inventory.update({
            where: { id: item.variant.inventory.id },
            data: {
              quantity: { decrement: item.quantity },
              reservedQuantity: { decrement: item.quantity },
            },
          });
        }
      }

      // Mark cart as abandoned (fulfilled)
      await tx.cart.update({
        where: { id: cart.id },
        data: { abandonedAt: new Date() },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: newOrder.total,
          method: 'demo',
          status: 'completed',
          transactionId: `TXN-${orderNumber}`,
        },
      });

      return newOrder;
    });

    res.json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        itemCount: order.items.length,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process checkout',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * PUT /api/cart/item/:itemId
 * Update cart item quantity
 * Body: { quantity }
 */
router.put('/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params as { itemId: string };
    const { quantity } = req.body;

    if (!quantity || quantity < 1 || quantity > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be between 1 and 10',
        },
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        variant: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cart item not found',
        },
      });
    }

    const availableQty = item.variant.inventory
      ? item.variant.inventory.quantity - item.variant.inventory.reservedQuantity
      : 0;

    if (availableQty < quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: `Only ${availableQty} units available`,
        },
      });
    }

    const qtyDelta = quantity - item.quantity;

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
      if (item.variant.inventory && qtyDelta !== 0) {
        await tx.inventory.update({
          where: { id: item.variant.inventory.id },
          data: {
            reservedQuantity: qtyDelta > 0 ? { increment: qtyDelta } : { decrement: -qtyDelta },
          },
        });
      }
    });

    res.json({
      success: true,
      message: 'Cart item updated',
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update cart item',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * DELETE /api/cart/item/:itemId
 * Remove item from cart
 */
router.delete('/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params as { itemId: string };

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        variant: {
          include: { inventory: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cart item not found',
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({
        where: { id: itemId },
      });
      if (item.variant.inventory && item.quantity > 0) {
        await tx.inventory.update({
          where: { id: item.variant.inventory.id },
          data: { reservedQuantity: { decrement: item.quantity } },
        });
      }
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove cart item',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * DELETE /api/cart/:cartId
 * Clear entire cart
 */
router.delete('/:cartId', async (req: Request, res: Response) => {
  try {
    const { cartId } = req.params as { cartId: string };

    const items = await prisma.cartItem.findMany({
      where: { cartId },
      include: { variant: { include: { inventory: true } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId } });
      for (const item of items) {
        if (item.variant.inventory && item.quantity > 0) {
          await tx.inventory.update({
            where: { id: item.variant.inventory.id },
            data: { reservedQuantity: { decrement: item.quantity } },
          });
        }
      }
    });

    res.json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear cart',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
