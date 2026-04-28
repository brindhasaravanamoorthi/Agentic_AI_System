# OmniAgent - Multi-Agent E-commerce System

AI-powered multi-agent orchestration system for clothing e-commerce management using LangGraph.js and Ollama.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 20.x** - [Download](https://nodejs.org/)
2. **Ollama** with **phi4-mini:latest** - [Download Ollama](https://ollama.ai/)

### Install Ollama Model

```bash
ollama pull phi4-mini:latest
ollama run phi4-mini:latest "test message"
```

### Setup Project

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

The server will start at **http://localhost:8000**

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:8000/api/health
```

### Chat with Agents
```bash
POST http://localhost:8000/api/chat/message
Content-Type: application/json

{
  "message": "Check inventory levels"
}
```

### Test Connection
```bash
GET http://localhost:8000/api/chat/test
```

## 🤖 Agents

- **Warden** - Monitoring & detection (inventory, trends, carts)
- **Finance** - Budget analysis & approval with veto power
- **Architect** - Data analysis & SQL queries
- **Support** - Customer communication drafting
- **Executive** - Decision coordination & notifications

## 🗂️ Project Structure

```
omniagent/
├── src/
│   ├── agents/
│   │   ├── state.ts          # LangGraph state definition
│   │   ├── nodes.ts          # Agent implementations
│   │   ├── graph.ts          # Workflow graph
│   │   └── prompts.ts        # System prompts
│   ├── config/
│   │   ├── database.ts       # Prisma client
│   │   └── ollama.ts         # LLM configuration
│   ├── routes/
│   │   ├── chat.routes.ts    # Chat API
│   │   └── health.routes.ts  # Health check
│   ├── services/
│   │   └── agent.service.ts  # Agent orchestration
│   └── server.ts             # Express server
├── prisma/
│   └── schema.prisma         # Database schema (SQLite)
├── documentation/            # Technical documentation
└── .env                      # Environment variables
```

## 🛠️ Development

```bash
# Run development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## 📚 Documentation

See the [`documentation/`](./documentation/) folder for comprehensive technical docs:

- `00-implementation-guide.md` - Quick start guide
- `01-system-overview.md` - System architecture
- `02-feature-driven-doc.md` - Feature specifications
- `03-technical-design.md` - Technical design
- `04-data-model.md` - Database schema
- `05-api-specification.md` - API documentation
- `06-agent-architecture.md` - Agent system details

## 🧪 Testing the System

### 1. Start Ollama
```bash
ollama serve
```

### 2. Test with cURL
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the status of inventory?"}'
```

### 3. Expected Response
```json
{
  "success": true,
  "data": {
    "response": "[Warden] Analyzing inventory...\n[Finance] Budget analysis...",
    "decision": {
      "status": "approved",
      "votes": [...]
    }
  }
}
```

## 🔧 Configuration

Edit `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# Ollama
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi4-mini:latest"

# Server
PORT=8000
NODE_ENV=development
```

## 📝 License

ISC

---

Built with ❤️ using LangGraph.js, Ollama, and TypeScript
