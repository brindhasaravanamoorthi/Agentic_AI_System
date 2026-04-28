// Product API Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/products
 * Get all products with variants and inventory
 * Query params:
 *   - category: Filter by category slug
 *   - search: Search in product name or description
 *   - limit: Max results (default: 50)
 *   - offset: Pagination offset (default: 0)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build where clause
    const where: any = {};

    if (category) {
      const categoryData = await prisma.category.findUnique({
        where: { slug: category as string },
      });

      if (categoryData) {
        where.categoryId = categoryData.id;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { brand: { contains: search as string } },
      ];
    }

    // Get products
    const products = await prisma.product.findMany({
      where,
      take: limitNum,
      skip: offsetNum,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          include: {
            inventory: {
              select: {
                quantity: true,
                reservedQuantity: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total count
    const total = await prisma.product.count({ where });

    res.json({
      success: true,
      data: {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          brand: product.brand,
          category: product.category,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            price: variant.price,
            images: variant.images ? JSON.parse(variant.images) : [],
            inStock: variant.inventory
              ? variant.inventory.quantity - variant.inventory.reservedQuantity > 0
              : false,
            availableQuantity: variant.inventory
              ? Math.max(0, variant.inventory.quantity - variant.inventory.reservedQuantity)
              : 0,
          })),
          createdAt: product.createdAt,
        })),
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch products',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/products/category
 * Get all categories (must be before /:id)
 */
router.get('/category', async (req: Request, res: Response) => {
  try {
    const categories: any = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    res.json({
      success: true,
      data: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        displayOrder: cat.displayOrder,
        productCount: cat._count.products,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/products/category/:slug
 * Get specific category by slug
 */
router.get('/category/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        displayOrder: category.displayOrder,
        productCount: category._count.products,
      },
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch category',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product details with all variants
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        category: product.category,
        metadata: product.metadata ? JSON.parse(product.metadata) : null,
        variants: product.variants.map((variant) => {
          const availableQty = variant.inventory
            ? Math.max(0, variant.inventory.quantity - variant.inventory.reservedQuantity)
            : 0;
          return {
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            price: variant.price,
            images: variant.images ? JSON.parse(variant.images) : [],
            weight: variant.weight,
            inStock: availableQty > 0,
            availableQuantity: availableQty,
            inventory: variant.inventory
              ? {
                  quantity: variant.inventory.quantity,
                  reservedQuantity: variant.inventory.reservedQuantity,
                  availableQuantity: availableQty,
                  warehouseLocation: variant.inventory.warehouseLocation,
                  reorderThreshold: variant.inventory.reorderThreshold,
                  lowStock: variant.inventory.quantity <= variant.inventory.reorderThreshold,
                }
              : null,
          };
        }),
        createdAt: product.createdAt,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch product',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * GET /api/products/variant/:sku
 * Get product variant details by SKU
 */
router.get('/variant/:sku', async (req: Request, res: Response) => {
  try {
    const { sku } = req.params as { sku: string };

    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        inventory: true,
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

    const variantData: any = variant;
    res.json({
      success: true,
      data: {
        id: variantData.id,
        sku: variantData.sku,
        size: variantData.size,
        color: variantData.color,
        price: variantData.price,
        images: variantData.images ? JSON.parse(variantData.images) : [],
        weight: variantData.weight,
        product: {
          id: variantData.product.id,
          name: variantData.product.name,
          description: variantData.product.description,
          brand: variantData.product.brand,
          category: variantData.product.category,
        },
        inventory: variantData.inventory
          ? {
              quantity: variantData.inventory.quantity,
              reservedQuantity: variantData.inventory.reservedQuantity,
              availableQuantity: Math.max(
                0,
                variantData.inventory.quantity - variantData.inventory.reservedQuantity
              ),
              warehouseLocation: variantData.inventory.warehouseLocation,
              lowStock: variantData.inventory.quantity <= variantData.inventory.reorderThreshold,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get variant error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch variant',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

export default router;
