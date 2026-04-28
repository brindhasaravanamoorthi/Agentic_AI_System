// LLM Configuration - Switch between Ollama and OpenRouter via .env
import { Agent } from 'undici';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const AI_PROVIDER = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Extended timeout for Ollama (fixes HeadersTimeoutError on slow models / cold starts)
// OLLAMA_REQUEST_TIMEOUT_MS: 0 = no timeout (default, recommended); or set ms e.g. 600000 = 10 min
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? 0);

function createOllamaFetch(): typeof fetch {
  const agent = new Agent({
    headersTimeout: OLLAMA_TIMEOUT_MS, // 0 disables timeout
    bodyTimeout: OLLAMA_TIMEOUT_MS,
    connectTimeout: 60000, // 60s to connect
  });
  return (url: string | URL | Request, init?: RequestInit) =>
    fetch(url, { ...init, dispatcher: agent } as RequestInit & { dispatcher: Agent });
}

const ollamaFetch = createOllamaFetch();

function createOllamaModel(): BaseChatModel {
  return new ChatOllama({
    model: process.env.OLLAMA_MODEL || 'phi4-mini:latest',
    baseUrl: OLLAMA_BASE,
    temperature: 0.7,
    verbose: false,
    fetch: ollamaFetch,
  });
}

/**
 * FunctionGemma - Specialized for function calling (Ollama v0.13.5+)
 * Use when the agent needs to invoke a tool/function.
 * https://ollama.com/library/functiongemma
 */
export function createFunctionGemmaModel(): BaseChatModel {
  return new ChatOllama({
    model: process.env.OLLAMA_FUNCTION_MODEL || 'functiongemma:latest',
    baseUrl: OLLAMA_BASE,
    temperature: 0.1, // Lower for more deterministic tool selection
    verbose: false,
    fetch: ollamaFetch,
  });
}

function createOpenRouterModel(): BaseChatModel {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('AI_PROVIDER=openrouter but OPENROUTER_API_KEY not set - falling back to Ollama');
    return createOllamaModel();
  }

  return new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL,
    temperature: 0.7,
    apiKey,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
  });
}

export function createLLM(): BaseChatModel {
  if (AI_PROVIDER === 'openrouter') {
    return createOpenRouterModel();
  }
  return createOllamaModel();
}

export const llm = createLLM();
export const functionGemma = createFunctionGemmaModel();
export const aiProvider = AI_PROVIDER;
