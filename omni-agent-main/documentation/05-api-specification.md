# API Specification

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Project:** OmniAgent Clothing Store

---

## Overview

This document provides complete API specifications for all REST endpoints and WebSocket events in the OmniAgent system. The API follows RESTful principles and uses JSON for request/response payloads.

**Base URL:** `http://localhost:8000/api`  
**Authentication:** JWT Bearer tokens (where applicable)  
**Content-Type:** `application/json`

---

## API Categories

1. [Shop API](#shop-api) - E-commerce operations
2. [Agent API](#agent-api) - Agent chat and management
3. [Simulation API](#simulation-api) - Data manipulation and testing
4. [Admin API](#admin-api) - System configuration
5. [WebSocket Events](#websocket-events) - Real-time communication

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Shop API

### Products

#### GET /api/products
Get list of products with filtering and pagination.

**Query Parameters:**
```typescript
{
  category?: string;        // Category slug
  brand?: string;          // Brand name
  size?: string;           // Size filter
  color?: string;          // Color filter
  minPrice?: number;       // Minimum price
  maxPrice?: number;       // Maximum price
  search?: string;         // Search in name/description
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, Max: 100
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Classic Cotton Tee",
      "description": "Comfortable everyday t-shirt",
      "brand": "BasicWear",
      "category": {
        "id": "uuid",
        "name": "T-Shirts",
        "slug": "tshirts"
      },
      "priceRange": {
        "min": 19.99,
        "max": 24.99
      },
      "variants": [
        {
          "id": "uuid",
          "sku": "CLT-M-BLK",
          "size": "M",
          "color": "Black",
          "price": 19.99,
          "inStock": true,
          "images": ["url1", "url2"]
        }
      ],
      "thumbnail": "image_url",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

---

#### GET /api/products/:id
Get detailed product information.

**Path Parameters:**
- `id` - Product UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Classic Cotton Tee",
    "description": "Comfortable everyday t-shirt made from 100% organic cotton",
    "brand": "BasicWear",
    "category": {
      "id": "uuid",
      "name": "T-Shirts",
      "slug": "tshirts",
      "parent": {
        "id": "uuid",
        "name": "Tops",
        "slug": "tops"
      }
    },
    "variants": [
      {
        "id": "variant-uuid-1",
        "sku": "CLT-S-BLK",
        "size": "S",
        "color": "Black",
        "price": 19.99,
        "costPrice": 8.00,
        "images": ["url1", "url2", "url3"],
        "weight": 0.2,
        "inventory": {
          "quantity": 50,
          "status": "in_stock" // "in_stock", "low_stock", "out_of_stock"
        }
      },
      {
        "id": "variant-uuid-2",
        "sku": "CLT-M-BLK",
        "size": "M",
        "color": "Black",
        "price": 19.99,
        "inventory": {
          "quantity": 5,
          "status": "low_stock"
        }
      }
    ],
    "metadata": {
      "material": "100% Cotton",
      "careInstructions": "Machine wash cold"
    },
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

---

#### GET /api/categories
Get category tree.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tops",
      "slug": "tops",
      "productCount": 45,
      "children": [
        {
          "id": "uuid",
          "name": "T-Shirts",
          "slug": "tshirts",
          "productCount": 25
        },
        {
          "id": "uuid",
          "name": "Shirts",
          "slug": "shirts",
          "productCount": 20
        }
      ]
    }
  ]
}
```

---

### Cart

#### POST /api/cart/items
Add item to cart.

**Request Body:**
```json
{
  "variantId": "uuid",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "uuid",
    "items": [
      {
        "id": "cart-item-uuid",
        "variant": {
          "id": "uuid",
          "sku": "CLT-M-BLK",
          "product": {
            "name": "Classic Cotton Tee",
            "brand": "BasicWear"
          },
          "size": "M",
          "color": "Black",
          "price": 19.99,
          "images": ["url"]
        },
        "quantity": 2,
        "subtotal": 39.98
      }
    ],
    "subtotal": 39.98,
    "itemCount": 2
  }
}
```

---

#### GET /api/cart
Get current cart.

**Response:** Same structure as POST /api/cart/items response.

---

#### PUT /api/cart/items/:id
Update cart item quantity.

**Path Parameters:**
- `id` - Cart item UUID

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:** Updated cart object.

---

#### DELETE /api/cart/items/:id
Remove item from cart.

**Path Parameters:**
- `id` - Cart item UUID

**Response:** Updated cart object.

---

### Orders

#### POST /api/orders
Create new order.

**Request Body:**
```json
{
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "+1234567890"
  },
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  },
  "items": [
    {
      "variantId": "uuid",
      "quantity": 2
    }
  ],
  "promoCode": "SAVE10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260212-001",
    "status": "pending",
    "customer": {
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "items": [
      {
        "variant": { /* variant details */ },
        "quantity": 2,
        "priceAtPurchase": 19.99,
        "subtotal": 39.98
      }
    ],
    "subtotal": 39.98,
    "tax": 3.60,
    "shipping": 5.00,
    "discount": 3.99,
    "total": 44.59,
    "createdAt": "2026-02-12T14:30:00Z"
  }
}
```

---

#### GET /api/orders/:id
Get order details.

**Path Parameters:**
- `id` - Order UUID or order number

**Response:** Full order object (same structure as POST response).

---

## Agent API

### Chat

#### POST /api/chat/message
Send message to agents.

**Request Body:**
```json
{
  "message": "What are my top selling products this week?",
  "context": {
    "includeThoughtTrace": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "uuid",
    "userMessage": "What are my top selling products this week?",
    "responses": [
      {
        "agentId": "architect",
        "agentName": "Architect Agent",
        "message": "I analyzed your sales data for this week. Here are your top 5 products...",
        "thoughtTrace": {
          "steps": [
            {
              "action": "query_database",
              "query": "SELECT p.name, SUM(oi.quantity) as sold...",
              "result": "Found 47 orders"
            },
            {
              "action": "analyze_data",
              "finding": "Classic Cotton Tee in Black, Size M is #1"
            }
          ]
        },
        "data": {
          "topProducts": [
            {
              "name": "Classic Cotton Tee",
              "variant": "M / Black",
              "unitsSold": 28,
              "revenue": 559.72
            }
          ]
        },
        "timestamp": "2026-02-12T14:35:22Z"
      }
    ],
    "timestamp": "2026-02-12T14:35:22Z"
  }
}
```

---

#### GET /api/chat/history
Get chat message history.

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  startDate?: string; // ISO date
  endDate?: string;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userMessage": "What are my top selling products?",
      "responses": [ /* agent responses */ ],
      "timestamp": "2026-02-12T14:35:22Z"
    }
  ],
  "pagination": { /* pagination info */ }
}
```

---

### Agent Management

#### GET /api/agents/status
Get status of all agents.

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "warden",
        "name": "Warden Agent",
        "role": "Monitoring and Detection",
        "status": "active", // "active", "idle", "error"
        "lastActivity": "2026-02-12T14:30:00Z",
        "metrics": {
          "queriesProcessed": 145,
          "alertsGenerated": 8,
          "decisionsProposed": 3,
          "avgResponseTime": 2.3
        }
      },
      {
        "id": "finance",
        "name": "Finance Agent",
        "role": "Financial Analysis",
        "status": "idle",
        "lastActivity": "2026-02-12T13:45:00Z",
        "metrics": {
          "votescast": 12,
          "vetosExercised": 2,
          "budgetAnalyses": 8
        }
      }
    ],
    "systemHealth": {
      "overallStatus": "healthy",
      "llmResponseTime": 1.2,
      "databaseLatency": 45,
      "errorRate": 0.02
    }
  }
}
```

---

### Decisions

#### GET /api/decisions
Get pending and recent decisions.

**Query Parameters:**
```typescript
{
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  page?: number;
  limit?: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "decisionType": "restock",
      "proposedBy": "warden",
      "status": "pending",
      "decisionData": {
        "variants": [
          {
            "sku": "CLT-M-WHT",
            "productName": "Classic Cotton Tee",
            "currentStock": 5,
            "recommendedOrderQty": 100,
            "estimatedCost": 800
          }
        ],
        "totalCost": 800,
        "urgency": "high"
      },
      "reasoning": "Stock level critical, sales velocity 3.5 units/day, will stockout in 1.4 days",
      "votes": [
        {
          "agentId": "finance",
          "approve": true,
          "reasoning": "Budget available, ROI positive within 14 days",
          "timestamp": "2026-02-12T14:32:00Z"
        }
      ],
      "createdAt": "2026-02-12T14:30:00Z",
      "expiresAt": "2026-02-12T15:30:00Z"
    }
  ],
  "pagination": { /* pagination info */ }
}
```

---

#### POST /api/decisions/:id/approve
Approve a decision (typically called by Executive Agent after Telegram approval).

**Path Parameters:**
- `id` - Decision UUID

**Request Body:**
```json
{
  "modifiedData": { /* Optional: modified decision parameters */ },
  "note": "Approved with reduced quantity"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "decisionId": "uuid",
    "status": "approved",
    "executedActions": [
      {
        "action": "inventory_update",
        "variantId": "uuid",
        "oldQuantity": 5,
        "newQuantity": 105,
        "timestamp": "2026-02-12T14:35:00Z"
      }
    ],
    "message": "Restock order executed successfully"
  }
}
```

---

#### POST /api/decisions/:id/reject
Reject a decision.

**Request Body:**
```json
{
  "reason": "Budget constraints this week"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "decisionId": "uuid",
    "status": "rejected",
    "message": "Decision rejected and logged"
  }
}
```

---

### Logs

#### GET /api/logs
Get agent activity logs.

**Query Parameters:**
```typescript
{
  agentId?: string;          // Filter by agent
  eventType?: string;        // "query", "alert", "decision", "action", "error"
  severity?: string;         // "info", "warning", "error", "critical"
  startDate?: string;        // ISO date
  endDate?: string;
  page?: number;
  limit?: number;
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "agentId": "warden",
      "agentName": "Warden Agent",
      "eventType": "alert",
      "severity": "warning",
      "message": "Low stock detected: Classic Cotton Tee (M/White) - 5 units remaining",
      "metadata": {
        "variantId": "uuid",
        "sku": "CLT-M-WHT",
        "currentStock": 5,
        "threshold": 20,
        "daysUntilStockout": 1.4
      },
      "createdAt": "2026-02-12T14:30:15Z"
    }
  ],
  "pagination": { /* pagination info */ }
}
```

---

## Simulation API

### Scenario Management

#### GET /api/simulation/scenarios
Get available simulation scenarios.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Inventory Crisis",
      "description": "Simulates multiple products hitting low stock simultaneously",
      "duration": "5 minutes",
      "expectedAgents": ["warden", "finance", "executive"],
      "isActive": false
    },
    {
      "id": "uuid",
      "name": "Viral Product Trend",
      "description": "Simulates a product going viral with 10x sales spike",
      "duration": "10 minutes",
      "expectedAgents": ["warden", "finance", "executive"],
      "isActive": false
    }
  ]
}
```

---

#### POST /api/simulation/scenarios/:id/run
Run a simulation scenario.

**Path Parameters:**
- `id` - Scenario UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "scenarioId": "uuid",
    "status": "running",
    "startedAt": "2026-02-12T14:40:00Z",
    "estimatedDuration": 300,
    "message": "Scenario 'Inventory Crisis' started. Watch the Super Log for agent activity."
  }
}
```

---

### Data Manipulation

#### POST /api/simulation/inventory/adjust
Manually adjust inventory levels.

**Request Body:**
```json
{
  "variantId": "uuid",
  "quantity": 5,
  "reason": "Testing low stock alert"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "variantId": "uuid",
    "sku": "CLT-M-WHT",
    "oldQuantity": 50,
    "newQuantity": 5,
    "message": "Inventory adjusted. Warden will check on next scheduled run."
  }
}
```

---

#### POST /api/simulation/orders/generate
Generate simulated orders.

**Request Body:**
```json
{
  "variantId": "uuid",
  "count": 20,
  "spread": "1h", // "instant", "1h", "24h"
  "reason": "Simulating sales spike"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ordersCreated": 20,
    "totalRevenue": 399.80,
    "newInventoryLevel": 30,
    "message": "20 orders created over 1 hour"
  }
}
```

---

#### POST /api/simulation/carts/abandon
Create abandoned carts.

**Request Body:**
```json
{
  "count": 5,
  "minValue": 50,
  "hoursAgo": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartsCreated": 5,
    "totalValue": 347.45,
    "averageValue": 69.49,
    "message": "5 abandoned carts created (abandoned 2 hours ago)"
  }
}
```

---

#### POST /api/simulation/triggers/force
Force trigger an agent check immediately.

**Request Body:**
```json
{
  "agentId": "warden",
  "checkType": "inventory" // "inventory", "sales_trends", "abandoned_carts"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentId": "warden",
    "checkType": "inventory",
    "executionTime": 1.23,
    "results": {
      "alertsGenerated": 3,
      "decisionsProposed": 1
    }
  }
}
```

---

#### POST /api/simulation/reset
Reset simulation data to initial state.

**Request Body:**
```json
{
  "confirmReset": true,
  "preserveLogs": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Simulation data reset to initial state",
    "stats": {
      "ordersDeleted": 145,
      "inventoryReset": 247,
      "logsDeleted": 892
    }
  }
}
```

---

## Admin API

### Analytics

#### GET /api/analytics/inventory
Get inventory health metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVariants": 247,
    "inStock": 198,
    "lowStock": 35,
    "outOfStock": 14,
    "totalValue": 45823.50,
    "criticalItems": [
      {
        "sku": "CLT-M-WHT",
        "productName": "Classic Cotton Tee",
        "quantity": 5,
        "daysUntilStockout": 1.4
      }
    ]
  }
}
```

---

#### GET /api/analytics/sales
Get sales metrics.

**Query Parameters:**
```typescript
{
  period?: '7d' | '30d' | '90d';
  groupBy?: 'day' | 'week' | 'month';
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "totalOrders": 89,
    "totalRevenue": 3456.78,
    "totalProfit": 1234.56,
    "avgOrderValue": 38.84,
    "topProducts": [ /* top 10 */ ],
    "dailyBreakdown": [
      {
        "date": "2026-02-12",
        "orders": 15,
        "revenue": 623.45,
        "profit": 234.12
      }
    ]
  }
}
```

---

### Monitoring Rules

#### GET /api/monitoring/rules
Get all monitoring rules.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ruleType": "inventory_threshold",
      "agentResponsible": "warden",
      "thresholdConfig": {
        "quantity": 20,
        "daysUntilStockout": 7
      },
      "enabled": true,
      "lastTriggered": "2026-02-12T14:30:00Z"
    },
    {
      "id": "uuid",
      "ruleType": "sales_velocity",
      "agentResponsible": "warden",
      "thresholdConfig": {
        "multiplier": 3,
        "timeWindow": "24h"
      },
      "enabled": true
    }
  ]
}
```

---

#### PUT /api/monitoring/rules/:id
Update monitoring rule configuration.

**Request Body:**
```json
{
  "thresholdConfig": {
    "quantity": 15,
    "daysUntilStockout": 5
  },
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Monitoring rule updated"
  }
}
```

---

## WebSocket Events

**Connection URL:** `ws://localhost:8000`

### Client → Server Events

#### subscribe:logs
Subscribe to real-time agent logs.

**Payload:**
```json
{
  "filters": {
    "agentId": "warden", // Optional
    "severity": "warning" // Optional
  }
}
```

---

#### subscribe:decisions
Subscribe to real-time decision updates.

---

#### unsubscribe:logs
Unsubscribe from logs.

---

#### chat:message
Send chat message (alternative to REST API).

**Payload:**
```json
{
  "message": "What's my inventory status?",
  "context": {}
}
```

---

### Server → Client Events

#### log
Real-time agent log event.

**Payload:**
```json
{
  "id": "uuid",
  "agentId": "warden",
  "agentName": "Warden Agent",
  "eventType": "alert",
  "severity": "warning",
  "message": "Low stock detected",
  "metadata": { /* details */ },
  "timestamp": "2026-02-12T14:30:15Z"
}
```

---

#### decision:new
New decision proposed by agents.

**Payload:**
```json
{
  "id": "uuid",
  "decisionType": "restock",
  "proposedBy": "warden",
  "decisionData": { /* details */ },
  "status": "pending",
  "expiresAt": "2026-02-12T15:30:00Z"
}
```

---

#### decision:updated
Decision status changed (approved/rejected).

**Payload:**
```json
{
  "id": "uuid",
  "status": "approved",
  "updatedBy": "user",
  "executedActions": [ /* actions */ ],
  "timestamp": "2026-02-12T14:35:00Z"
}
```

---

#### agent:status
Agent status change.

**Payload:**
```json
{
  "agentId": "warden",
  "status": "active",
  "activity": "Running inventory check",
  "timestamp": "2026-02-12T14:30:00Z"
}
```

---

#### chat:response
Agent response to user message.

**Payload:**
```json
{
  "messageId": "uuid",
  "agentId": "architect",
  "agentName": "Architect Agent",
  "message": "Your inventory status shows...",
  "thoughtTrace": { /* optional */ },
  "data": { /* structured data */ },
  "timestamp": "2026-02-12T14:35:22Z"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate SKU) |
| `OUT_OF_STOCK` | 422 | Variant not available |
| `AGENT_ERROR` | 500 | Agent processing error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `LLM_ERROR` | 503 | LLM service unavailable |

---

## Rate Limiting

- **Standard Endpoints:** 100 requests per minute per IP
- **Chat Endpoints:** 20 requests per minute per user
- **Simulation Endpoints:** 50 requests per minute per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1707753600
```

---

## Document Cross-References

- **System Overview**: [`01-system-overview.md`](./01-system-overview.md)
- **Feature Documentation**: [`02-feature-driven-doc.md`](./02-feature-driven-doc.md)
- **Technical Design**: [`03-technical-design.md`](./03-technical-design.md)
- **Data Models**: [`04-data-model.md`](./04-data-model.md)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | System | Initial API specification with Node.js backend |

---

*This API specification is implemented using Express.js with TypeScript. All endpoints include input validation using Zod schemas.*
