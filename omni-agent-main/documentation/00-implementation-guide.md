# Quick Implementation Guide

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Project:** OmniAgent Clothing Store

---

## Getting Started

This guide provides a quick start for implementing the OmniAgent system with **LangGraph.js** and **Ollama**.

---

## Prerequisites

1. **Node.js 20.x LTS** installed
2. **Ollama** installed with **phi4-mini:latest** model

**Optional (for advanced features):**
3. **Redis 7.x** - For job queues and caching

**Note:** We're using **SQLite** (file-based database) - no database server needed!

### Install Ollama & Model

```bash
# Install Ollama (if not installed)
# Visit: https://ollama.ai/download

# Pull the phi4-mini model
ollama pull phi4-mini:latest

# Verify it's running
ollama run phi4-mini:latest "Hello, test message"
```

---

## Project Setup

### 1. Initialize Project

```bash
mkdir omniagent && cd omniagent
npm init -y

# Install dependencies
npm install express @langchain/langgraph @langchain/ollama prisma @prisma/client zod ioredis bull socket.io
npm install -D typescript @types/node @types/express ts-node nodemon

# Initialize TypeScript
npx tsc --init
```

### 2. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. Initialize Prisma

```bash
npx prisma init

# Copy schema from 04-data-model.md into prisma/schema.prisma

# Run migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### 4. Environment Variables

Create `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/omniagent"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Ollama
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi4-mini:latest"

# Telegram (optional for now)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Server
PORT=8000
NODE_ENV=development
```

---

## Build the Agent Graph

### 1. Create State Schema

`src/agents/state.ts`:

```typescript
import { Annotation } from '@langchain/langgraph';

export const AgentState = Annotation.Root({
  input: Annotation<string>,
  wardenAnalysis: Annotation<string>,
  financeApproval: Annotation<string>,
  decision: Annotation<{
    id: string;
    type: string;
    approved: boolean;
    votes: any[];
  }>,
  logs: Annotation<Array<string>>
});
```

### 2. Create Agent Nodes

`src/agents/nodes.ts`:

```typescript
import { ChatOllama } from '@langchain/ollama';
import { AgentState } from './state';

const llm = new ChatOllama({
  model: process.env.OLLAMA_MODEL || 'phi4-mini:latest',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

export async function wardenNode(state: typeof AgentState.State) {
  const response = await llm.invoke([
    { 
      role: 'system', 
      content: 'You are a Warden Agent. Monitor inventory and detect issues.' 
    },
    { role: 'user', content: state.input }
  ]);
  
  return {
    wardenAnalysis: response.content,
    logs: [...state.logs, `Warden: ${response.content}`]
  };
}

export async function financeNode(state: typeof AgentState.State) {
  const response = await llm.invoke([
    { 
      role: 'system', 
      content: 'You are a Finance Agent. Approve or reject based on budget.' 
    },
    { 
      role: 'user', 
      content: `Review: ${state.wardenAnalysis}` 
    }
  ]);
  
  const approved = response.content.toLowerCase().includes('approve');
  
  return {
    financeApproval: response.content,
    decision: {
      ...state.decision,
      approved,
      votes: [
        ...state.decision.votes,
        { agent: 'finance', approved, reasoning: response.content }
      ]
    },
    logs: [...state.logs, `Finance: ${response.content}`]
  };
}
```

### 3. Build the Graph

`src/agents/graph.ts`:

```typescript
import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state';
import { wardenNode, financeNode } from './nodes';

export function createAgentGraph() {
  const workflow = new StateGraph(AgentState);
  
  // Add nodes
  workflow.addNode('warden', wardenNode);
  workflow.addNode('finance', financeNode);
  
  // Define flow
  workflow.setEntryPoint('warden');
  workflow.addEdge('warden', 'finance');
  workflow.addEdge('finance', END);
  
  return workflow.compile();
}
```

### 4. Use in API

`src/server.ts`:

```typescript
import express from 'express';
import { createAgentGraph } from './agents/graph';

const app = express();
app.use(express.json());

const agentGraph = createAgentGraph();

app.post('/api/chat/message', async (req, res) => {
  const { message } = req.body;
  
  const result = await agentGraph.invoke({
    input: message,
    logs: [],
    decision: {
      id: `decision_${Date.now()}`,
      type: 'user_query',
      approved: false,
      votes: []
    }
  });
  
  res.json({
    success: true,
    data: {
      response: result.logs.join('\n'),
      decision: result.decision
    }
  });
});

app.listen(8000, () => {
  console.log('🚀 Server running on http://localhost:8000');
});
```

---

## Test the System

### 1. Start Services

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start PostgreSQL
# (Already running if installed as service)

# Terminal 4: Start the app
npm run dev
```

### 2. Test with cURL

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Check inventory levels"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "response": "Warden: Analyzing inventory...\nFinance: Budget approved for restock",
    "decision": {
      "id": "decision_1707753600000",
      "type": "user_query",
      "approved": true,
      "votes": [...]
    }
  }
}
```

---

## Next Steps

1. **Add Tools:** Implement SQL query tools for agents
2. **Build Frontend:** Create React UI for chat and logs
3. **Seed Data:** Run Prisma seed script with sample products
4. **Add Telegram:** Integrate Telegram Bot API
5. **Implement Consensus:** Add multi-agent voting logic

---

## Folder Structure

```
omniagent/
├── src/
│   ├── agents/
│   │   ├── state.ts          # LangGraph state definition
│   │   ├── nodes.ts          # Agent node functions
│   │   ├── graph.ts          # Compiled graph
│   │   └── prompts.ts        # System prompts
│   ├── tools/
│   │   ├── sql-query.tool.ts
│   │   └── analytics.tool.ts
│   ├── routes/
│   │   ├── products.routes.ts
│   │   ├── chat.routes.ts
│   │   └── simulation.routes.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── redis.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## Helpful Commands

```bash
# Development
npm run dev                   # Start with nodemon

# Database
npx prisma studio            # Open Prisma GUI
npx prisma migrate dev       # Run migrations
npx prisma db seed           # Seed database

# Production
npm run build                # Compile TypeScript
npm start                    # Start production server

# Testing
npm test                     # Run Jest tests
```

---

## Resources

- **LangGraph Docs:** https://js.langchain.com/docs/langgraph
- **Ollama API:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **Prisma Docs:** https://www.prisma.io/docs
- **Technical Design:** See [`03-technical-design.md`](./03-technical-design.md)
- **Agent Architecture:** See [`06-agent-architecture.md`](./06-agent-architecture.md)

---

*This guide gets you started quickly. Refer to other documentation for detailed specifications.*
