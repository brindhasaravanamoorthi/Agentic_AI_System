// Agent Tools - Function definitions for FunctionGemma (Ollama function calling)
// https://ollama.com/library/functiongemma
// These tools enable Claude-like autonomous task execution on behalf of the user

import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import { tavilySearch } from '../services/tavily.service';
import { getFullStoreSnapshot } from '../services/contextEnrichment.service';

/**
 * Read tool - returns live store data. Use when agent needs fresh ecom data.
 */
export const getStoreSnapshotTool = tool(
  async () => {
    return await getFullStoreSnapshot();
  },
  {
    name: 'get_store_snapshot',
    description: 'Get current store data: products, inventory, orders, abandoned carts, categories. Use when you need to look up or verify store information.',
    schema: z.object({}),
  }
);

/**
 * Action tool definitions - for add/alter/restock/email/research.
 */
export const addProductTool = tool(
  async (_) => 'Executed by actionExecutor',
  {
    name: 'add_product',
    description: 'Add a new product to the store catalog. Use when user wants to add a product.',
    schema: z.object({
      name: z.string().describe('Product name'),
      description: z.string().optional().describe('Product description'),
      categorySlug: z.string().optional().describe('Category slug, defaults to clothing'),
      brand: z.string().optional().describe('Brand name'),
      price: z.number().optional().describe('Price in dollars'),
      size: z.string().optional().describe('Size, defaults to M'),
      stock: z.number().optional().describe('Initial stock quantity'),
    }),
  }
);

export const alterProductTool = tool(
  async (_) => 'Executed by actionExecutor',
  {
    name: 'alter_product',
    description: 'Update an existing product. Use when user wants to change name, price, or description.',
    schema: z.object({
      productId: z.string().optional().describe('Product ID if known'),
      productName: z.string().optional().describe('Product name to search for'),
      updates: z.object({
        name: z.string().optional(),
        price: z.number().optional(),
        description: z.string().optional(),
      }).describe('Fields to update'),
    }),
  }
);

export const sendReplyEmailTool = tool(
  async (_) => 'Executed by actionExecutor',
  {
    name: 'send_reply_email',
    description: 'Send an email reply to a customer (bad review, complaint, etc.).',
    schema: z.object({
      to: z.string().describe('Recipient email'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body content'),
      replyTo: z.string().optional().describe('Reply-to address'),
    }),
  }
);

export const restockInventoryTool = tool(
  async (_) => 'Executed by actionExecutor',
  {
    name: 'restock_inventory',
    description: 'Restock low-inventory items. Use when Warden/Finance mention low stock or user asks to restock.',
    schema: z.object({
      productName: z.string().optional().describe('Product name to restock'),
      variantId: z.string().optional().describe('Variant ID if known'),
      sku: z.string().optional().describe('SKU if known'),
      quantity: z.number().optional().describe('Units to add, defaults to 50'),
    }),
  }
);

export const architectResearchTool = tool(
  async (_) => 'Executed by actionExecutor',
  {
    name: 'architect_research',
    description: 'Research products or trends using web search. Use when user wants product research.',
    schema: z.object({
      query: z.string().describe('Search query for research'),
    }),
  }
);

/**
 * Tavily Research Tool - Executes web search via Tavily API.
 * Use when the agent needs to research products, trends, or market info.
 */
export const tavilyResearchTool = tool(
  async ({ query, maxResults }) => {
    const results = await tavilySearch(query, maxResults ?? 5);
    if (results.length === 0) {
      return JSON.stringify({ query, results: [], summary: 'No results found.' });
    }
    const summary = results
      .map((r, i) => {
        const snippet = (r.content ?? '').substring(0, 200);
        return `${i + 1}. ${r.title}\n   ${snippet}${(r.content?.length ?? 0) > 200 ? '...' : ''}\n   ${r.url}`;
      })
      .join('\n\n');
    return JSON.stringify({
      query,
      results: results.map((r) => ({ title: r.title, url: r.url })),
      summary,
    });
  },
  {
    name: 'tavily_research',
    description: 'Search the web for product research, market trends, or general information using Tavily API.',
    schema: z.object({
      query: z.string().describe('Search query (e.g. "trending clothing 2024", "best selling sneakers")'),
      maxResults: z.number().optional().describe('Max results to return, default 5'),
    }),
  }
);

/** All tools - read + actions */
export const agentTools = [
  getStoreSnapshotTool,
  addProductTool,
  alterProductTool,
  sendReplyEmailTool,
  restockInventoryTool,
  architectResearchTool,
  tavilyResearchTool,
];

/** Action-only tools (for Proposal - no read tools) */
export const actionTools = [
  addProductTool,
  alterProductTool,
  sendReplyEmailTool,
  restockInventoryTool,
  architectResearchTool,
  tavilyResearchTool,
];
