
# 🚀 OmniAgent - Multi-Agent E-commerce Intelligence System

![OmniAgent Logo](./assets/logo.png)

AI-powered multi-agent orchestration for intelligent e-commerce business operations  
Built with LangGraph.js and Ollama  

![License](https://img.shields.io/badge/license-MIT-blue)
![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen)
![Node](https://img.shields.io/badge/node-20%2B-green)

---

## 🎯 Overview

OmniAgent is a local-first, privacy-focused AI system that transforms how small business owners manage e-commerce operations.

Instead of reactive dashboards, OmniAgent proactively hunts for business problems and presents intelligent, actionable solutions through a familiar chat interface.

---

## 🏆 Why OmniAgent?

- 🏠 **Fully Local**: Runs entirely on your machine using Ollama—no cloud APIs  
- 🤖 **Multi-Agent Collaboration**: 5 specialized agents that debate decisions  
- 📊 **Proactive Intelligence**: Continuous monitoring with automatic alerts  
- ⚡ **Action-Oriented**: Proposes solutions with financial impact analysis  
- 🔐 **Privacy First**: Sensitive business data stays protected locally  
- 📱 **Modern UX**: Web dashboard + Telegram notifications  

---

## 💡 Real-World Example

**8:00 AM** – Warden Agent detects Product A selling 3x faster  

**8:02 AM** – Finance Agent calculates restocking budget  

**8:03 AM** – Notification:

> Trending opportunity! Restock 500 units (₹25,000)? [Approve] [Edit] [Reject]

**8:04 AM** – You approve  

**8:05 AM** – Executive Agent updates inventory  

---

## ✨ Key Features

### 🕵️ Intelligent Monitoring

- Inventory Tracking: Alerts for low stock, overstock, slow movers  
- Sales Analytics: Detect trends and anomalies  
- Customer Insights: Cart abandonment, returns, sentiment  
- Financial Health: Cash flow and profitability tracking  

---

### 🤖 Multi-Agent System

| Agent      | Specialty               | Capabilities |
|------------|------------------------|-------------|
| Warden     | Monitoring & Detection | Inventory, trends, alerts |
| Finance    | Budget & Approvals     | ROI, cost analysis |
| Architect  | Data Analysis          | SQL queries, reports |
| Support    | Customer Care          | Email automation, sentiment |
| Executive  | Coordination           | Decision execution |

---

## 💬 Multi-Interface Access

- 🌐 Web Dashboard  
- 📱 Telegram Bot  
- 🔌 REST API  

---

## 🔄 Human-in-the-Loop Workflow

Agents propose → You decide → System executes  

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x  
- Ollama  
- npm or yarn  

---

### 1️⃣ Clone & Install

```bash
git clone https://github.com/AMV0027/omni-agent
cd omni-agent
npm install
````

---

### 2️⃣ Configure Ollama

```bash
ollama serve
ollama pull qwen3:0.6b
```

Optional:

```bash
ollama pull functiongemma:latest
```

---

### 3️⃣ Setup Environment

```bash
cp .env.example .env
nano .env
```

---

### 4️⃣ Initialize Database

```bash
npm run db:setup
```

---

### 5️⃣ Start Development

```bash
npm run dev
```

Optional:

```bash
npm run dev:ai-frontend
npm run dev:ecom-frontend
npm run dev:all
```

👉 API: [http://localhost:8000](http://localhost:8000)

---

## 📡 API Reference

### Health Check

```
GET /api/health
```

### Chat with Agents

```
POST /api/chat/message
```

```json
{
  "message": "Check inventory levels",
  "sessionId": "optional-session-id"
}
```

More endpoints → See API documentation

---

## 📚 Documentation

* System Overview
* Technical Design
* Agent Architecture
* API Specification
* Data Model
* Implementation Guide

---

## 🗂️ Project Structure

```
omniagent/
├── src/
│   ├── agents/
│   ├── routes/
│   ├── services/
│   ├── config/
│   └── server.ts
├── prisma/
├── ai-frontend/
├── ecom-frontend/
├── documentation/
└── .env.example
```

---

## 🛠️ Development

```bash
npm run dev
npm run build
npm run start
```

### Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run db:setup
```

---

## 🔧 Configuration

### AI Providers

**Ollama (Recommended)**

* Runs locally
* No API key needed
* Privacy-first

**OpenRouter (Optional)**

* Paid API
* Requires API key

---

### Optional Features

| Feature         | Provider | Setup        |
| --------------- | -------- | ------------ |
| Telegram Alerts | Telegram | BotFather    |
| Email Support   | Gmail    | App Password |
| Product Images  | Pexels   | API Key      |
| Web Search      | Tavily   | API Key      |

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
npm run build
git commit -m "feat: add feature"
git push
```

---

## 📋 Roadmap

* v1.1 – Agent personality system
* v1.2 – Shopify/WooCommerce integration
* v1.3 – Automation rules
* v2.0 – Multi-language support

---

## 🔒 Security & Privacy

* Local processing
* No tracking
* Full data ownership

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

* LangChain
* LangGraph
* Ollama
* Prisma

---

## 🧪 Testing

```bash
ollama serve
```

```bash
curl -X POST http://localhost:8000/api/chat/message \
-H "Content-Type: application/json" \
-d '{"message": "What is the status of inventory?"}'
```

---

## ⚙️ Environment Example

```env
DATABASE_URL="file:./dev.db"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi4-mini:latest"
PORT=8000
NODE_ENV=development
```

---

> Built with ❤️ using LangGraph.js, Ollama, and TypeScript

```

---

## ✅ Now do this

1. Open `README.md`  
2. Replace everything  
3. Commit  

---

## 💡 One important note

Your original had:
```

License: ISC

```
but earlier you selected **MIT**

👉 Keep it consistent → use **MIT everywhere**

---

If you want next upgrade:
- 🔥 Add animated demo (huge impact)
- 🧠 Add agent architecture diagram
- 🎨 Improve logo/banner

Just tell me 👍
```
