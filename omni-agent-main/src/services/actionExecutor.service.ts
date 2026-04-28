// Action Executor - Executes approved decisions (add product, alter product, send email, architect research)

import { prisma } from '../config/database';
import { tavilySearch } from './tavily.service';
import { searchPexelsImages } from './pexels.service';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ''),
  },
});

export async function executeAction(
  actionType: string,
  payload: any,
  input: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const p = typeof payload === 'string' ? JSON.parse(payload || '{}') : (payload || {});

  switch (actionType) {
    case 'add_product':
      return executeAddProduct(p);
    case 'alter_product':
      return executeAlterProduct(p);
    case 'send_reply_email':
      return executeSendReplyEmail(p);
    case 'architect_research':
    case 'tavily_research':
      return executeArchitectResearch(p, input);
    case 'restock_inventory':
      return executeRestockInventory(p);
    default:
      return { success: false, message: `Unknown action type: ${actionType}` };
  }
}

async function executeAddProduct(p: any): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const { name, description, categorySlug, brand, price, size, stock } = p;
    if (!name) {
      return { success: false, message: 'Missing product name' };
    }

    const slug = (categorySlug && String(categorySlug).trim()) || 'clothing';
    let category = await prisma.category.findFirst({
      where: { slug },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Clothing', slug: 'clothing', displayOrder: 0 },
      });
    }

    const costPrice = typeof price === 'number' ? price * 0.6 : 0;
    const priceNum = typeof price === 'number' ? price : 99.99;
    const sizeStr = size ? String(size) : 'M';
    const stockQty = typeof stock === 'number' ? Math.max(0, stock) : 10;

    const imageQuery = [name, description].filter(Boolean).join(' ');
    const imageUrls = await searchPexelsImages(imageQuery, 3);
    const imagesJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : '[]';

    const product = await prisma.product.create({
      data: {
        name: String(name),
        description: String(description || ''),
        brand: brand ? String(brand) : null,
        categoryId: category.id,
        metadata: null,
        isSimulated: false,
        variants: {
          create: {
            sku: `SKU-${Date.now()}`,
            size: sizeStr,
            color: null,
            price: priceNum,
            costPrice,
            images: imagesJson,
          },
        },
      },
      include: {
        variants: true,
      },
    });

    await prisma.inventory.create({
      data: {
        variantId: product.variants[0].id,
        quantity: stockQty,
        reservedQuantity: 0,
        reorderThreshold: 5,
      },
    });

    return {
      success: true,
      message: `Product "${product.name}" added successfully`,
      data: { productId: product.id, name: product.name },
    };
  } catch (error) {
    console.error('Add product error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add product',
    };
  }
}

async function executeAlterProduct(p: any): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const { productId, productName, updates } = p;
    if (!updates || !productId && !productName) {
      return { success: false, message: 'Missing productId/productName or updates' };
    }

    let product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : await prisma.product.findFirst({ where: { name: { contains: productName } } });

    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    const data: any = {};
    if (updates.name) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;

    await prisma.product.update({
      where: { id: product.id },
      data,
    });

    if (updates.price) {
      await prisma.productVariant.updateMany({
        where: { productId: product!.id },
        data: { price: updates.price },
      });
    }

    return { success: true, message: `Product "${product.name}" updated`, data: { productId: product.id } };
  } catch (error) {
    console.error('Alter product error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to alter product',
    };
  }
}

async function executeSendReplyEmail(p: any): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const { to, subject, body } = p;
    if (!to || !subject || !body) {
      return { success: false, message: 'Missing to, subject, or body' };
    }

    const email = process.env.GMAIL_EMAIL;
    if (!email || !process.env.GMAIL_APP_PASSWORD) {
      return { success: false, message: 'Gmail not configured' };
    }

    await transporter.sendMail({
      from: email,
      to: String(to),
      subject: String(subject),
      text: String(body),
    });

    return { success: true, message: `Email sent to ${to}` };
  } catch (error) {
    console.error('Send email error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

async function executeRestockInventory(p: any): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    let variantId = p.variantId;
    const quantity = p.quantity ?? 50;

    if (!variantId && p.sku) {
      const variant = await prisma.productVariant.findUnique({
        where: { sku: p.sku },
        include: { inventory: true },
      });
      if (variant) variantId = variant.id;
    }

    if (!variantId && (p.productName || p.product)) {
      const name = (p.productName || p.product || '').trim();
      const product = await prisma.product.findFirst({
        where: { name: { contains: name } },
        include: {
          variants: {
            include: { inventory: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (product?.variants?.length) {
        const withInv = product.variants.find((v) => v.inventory);
        variantId = (withInv || product.variants[0]).id;
      }
    }

    if (!variantId) {
      const lowStock = await prisma.inventory.findMany({
        where: { quantity: { lte: 10 } },
        include: { variant: true },
        orderBy: { quantity: 'asc' },
        take: 1,
      });
      if (lowStock.length === 0) return { success: true, message: 'No low-stock items to restock' };
      variantId = lowStock[0].variantId;
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true, inventory: true },
    });

    if (!variant?.inventory) return { success: false, message: 'Variant or inventory not found' };

    const prevQty = variant.inventory.quantity;
    const newQty = prevQty + quantity;

    await prisma.inventory.update({
      where: { id: variant.inventory.id },
      data: { quantity: newQty, lastRestockedAt: new Date() },
    });

    return {
      success: true,
      message: `Restocked ${quantity} units of ${variant.product.name} (${variant.sku}). Stock: ${prevQty} → ${newQty}`,
      data: { variantId, sku: variant.sku, previousStock: prevQty, newStock: newQty },
    };
  } catch (error) {
    console.error('Restock error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Restock failed',
    };
  }
}

async function executeArchitectResearch(
  p: any,
  input: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const query = p.query || input || 'trending clothing products 2024';
    const results = await tavilySearch(query, 5);

    if (results.length === 0) {
      return { success: true, message: 'No research results found' };
    }

    const summary = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.content.substring(0, 100)}...\n   ${r.url}`)
      .join('\n\n');

    return {
      success: true,
      message: `Research completed for: ${query}`,
      data: { query, results: results.map((r) => ({ title: r.title, url: r.url })), summary },
    };
  } catch (error) {
    console.error('Architect research error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Research failed',
    };
  }
}
