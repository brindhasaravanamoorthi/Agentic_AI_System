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

// Checkout
export const checkout = (customerId, email) =>
  api.post("/cart/checkout", { customerId, email });

// Reviews (backend may not have - returns empty on error)
export const getReviews = (productId) =>
  api.get(`/products/${productId}/reviews`).catch(() => ({ data: { data: [] } }));
export const addReview = (productId, data) =>
  api.post(`/products/${productId}/reviews`, data);

// Orders
export const getOrders = (customerId) => api.get(`/orders/${customerId}`);
export const getOrder = (customerId, orderNumber) =>
  api.get(`/orders/${customerId}/${orderNumber}`);

// Returns / Refunds
export const createReturnRequest = (data) => api.post("/returns", data);
export const getReturnRequests = (customerId) => api.get(`/returns/${customerId}`);

// Support
export const submitSupportTicket = (data) => api.post("/support", data);

export default api;
