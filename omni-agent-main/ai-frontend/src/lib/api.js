// API Client for OmniAgent backend
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Products
export const getProducts = (params) => api.get("/products", { params });

export const getProduct = (id) => api.get(`/products/${id}`);

export const getCategories = () => api.get("/products/category");

// Cart
export const getCart = (customerId) => api.get(`/cart/${customerId}`);

export const addToCart = (data) => api.post("/cart/add", data);

export const updateCartItem = (itemId, quantity) =>
  api.put(`/cart/item/${itemId}`, { quantity });

export const removeCartItem = (itemId) => api.delete(`/cart/item/${itemId}`);

export const checkout = (customerId) =>
  api.post("/cart/checkout", { customerId });

// Chat (non-streaming, with chat memory)
export const sendChatMessage = (message, sessionId = null) =>
  api.post("/chat/message", { message, sessionId: sessionId || undefined });

// Chat (streaming - content, analysis, decision appear progressively)
// Options: { signal?: AbortSignal, timeoutMs?: number, agentIds?: string[] }
export async function* sendChatMessageStream(message, sessionId = null, options = {}) {
  const { signal: externalSignal, timeoutMs = 120000, agentIds } = options;
  const base = api.defaults.baseURL || "/api";
  const path = base.startsWith("http")
    ? `${base}/chat/message/stream`
    : `${API_BASE_URL}/chat/message/stream`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (externalSignal?.aborted) {
    clearTimeout(timeoutId);
    throw new DOMException("Aborted", "AbortError");
  }
  externalSignal?.addEventListener?.("abort", () => {
    clearTimeout(timeoutId);
    controller.abort();
  });

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      sessionId: sessionId || undefined,
      agentIds: Array.isArray(agentIds) && agentIds.length > 0 ? agentIds : undefined,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `Request failed (${res.status})`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta" && data.content)
              yield { type: "delta", content: data.content };
            else if (data.type === "decision" && data.decision)
              yield { type: "decision", decision: data.decision };
            else if (data.type === "analysis" && data.analysis)
              yield { type: "analysis", analysis: data.analysis };
            else if (data.type === "sessionId" && data.sessionId)
              yield { type: "sessionId", sessionId: data.sessionId };
            else if (data.type === "productCards" && data.productCards)
              yield { type: "productCards", productCards: data.productCards };
            else if (data.type === "agent_started" && data.agent)
              yield { type: "agent_started", agent: data.agent };
            else if (data.type === "done") yield { type: "done" };
          } catch {
            // skip parse errors for malformed lines
          }
        }
      }
    }
    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.type === "sessionId" && data.sessionId)
          yield { type: "sessionId", sessionId: data.sessionId };
        else if (data.type === "agent_started" && data.agent)
          yield { type: "agent_started", agent: data.agent };
      } catch {
        // skip
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}

export const getChatSessions = (userId = "default") =>
  api.get("/chat/sessions", { params: { userId } });

export const getChatSession = (id, userId = "default") =>
  api.get(`/chat/sessions/${id}`, { params: { userId } });

export const createChatSession = (title, userId = "default") =>
  api.post("/chat/sessions", { title: title || "New Chat", userId });

export const deleteChatSession = (id, userId = "default") =>
  api.delete(`/chat/sessions/${id}`, { params: { userId } });

export const submitDecision = (decisionId, approved) =>
  api.post("/chat/decision", { decisionId, approved });

// Simulation
export const getSimulationStatus = () => api.get("/simulation/status");

export const getSimulationAnalytics = () => api.get("/simulation/analytics");

export const spikeSales = (data) =>
  api.post("/simulation/spike-sales", data || {});

export const lowInventory = (data) =>
  api.post("/simulation/low-inventory", data || {});

export default api;
