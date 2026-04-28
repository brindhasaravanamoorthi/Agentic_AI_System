// Product Cards - Format product/variant data for chat display

import { prisma } from '../config/database';

export interface ProductCard {
  id: string;
  name: string;
  description?: string;
  price: number;
  size: string;
  stock: number;
  image?: string;
  sku?: string;
  variantId?: string;
}

/**
 * Fetch product card data for a product by ID
 */
export async function getProductCardByProductId(productId: string): Promise<ProductCard | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        include: { inventory: true },
        take: 1,
      },
    },
  });
  if (!product || !product.variants[0]) return null;
  const v = product.variants[0];
  const images = v.images ? JSON.parse(v.images) : [];
  const img = Array.isArray(images) ? images[0] : null;
  const isUrl = typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'));
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,
    price: v.price,
    size: v.size ?? 'N/A',
    stock: v.inventory ? v.inventory.quantity - v.inventory.reservedQuantity : 0,
    image: isUrl ? img : undefined,
    sku: v.sku,
    variantId: v.id,
  };
}

/**
 * Fetch product card data for a variant by ID
 */
export async function getProductCardByVariantId(variantId: string): Promise<ProductCard | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true, inventory: true },
  });
  if (!variant) return null;
  const images = variant.images ? JSON.parse(variant.images) : [];
  const img = Array.isArray(images) ? images[0] : null;
  const isUrl = typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'));
  return {
    id: variant.product.id,
    name: variant.product.name,
    description: variant.product.description ?? undefined,
    price: variant.price,
    size: variant.size ?? 'N/A',
    stock: variant.inventory ? variant.inventory.quantity - variant.inventory.reservedQuantity : 0,
    image: isUrl ? img : undefined,
    sku: variant.sku,
    variantId: variant.id,
  };
}

/**
 * Fetch product card by product name (for alter_product when only name is provided)
 */
export async function getProductCardByProductName(productName: string): Promise<ProductCard | null> {
  const product = await prisma.product.findFirst({
    where: { name: { contains: productName } },
    include: {
      variants: {
        include: { inventory: true },
        take: 1,
      },
    },
  });
  if (!product || !product.variants[0]) return null;
  const v = product.variants[0];
  const images = v.images ? JSON.parse(v.images) : [];
  const img = Array.isArray(images) ? images[0] : null;
  const isUrl = typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'));
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,
    price: v.price,
    size: v.size ?? 'N/A',
    stock: v.inventory ? v.inventory.quantity - v.inventory.reservedQuantity : 0,
    image: isUrl ? img : undefined,
    sku: v.sku,
    variantId: v.id,
  };
}

/**
 * Fetch low-stock product cards for chat display
 */
export async function getLowStockProductCards(limit = 10): Promise<ProductCard[]> {
  const items = await prisma.inventory.findMany({
    where: { quantity: { lte: 20 } },
    include: {
      variant: {
        include: { product: true },
      },
    },
    take: limit,
    orderBy: { quantity: 'asc' },
  });

  return items.map((inv) => {
    const v = inv.variant;
    const images = v.images ? JSON.parse(v.images) : [];
    const img = Array.isArray(images) ? images[0] : null;
    const isUrl = typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'));
    return {
      id: v.product.id,
      name: v.product.name,
      description: v.product.description ?? undefined,
      price: v.price,
      size: v.size ?? 'N/A',
      stock: inv.quantity - inv.reservedQuantity,
      image: isUrl ? img : undefined,
      sku: v.sku,
      variantId: v.id,
    };
  });
}

/**
 * Fetch top-selling product cards (by order quantity)
 */
export async function getTopSellingProductCards(limit = 6): Promise<ProductCard[]> {
  const topVariants = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const cards: ProductCard[] = [];
  for (const row of topVariants) {
    const card = await getProductCardByVariantId(row.variantId);
    if (card) cards.push(card);
  }
  return cards;
}
