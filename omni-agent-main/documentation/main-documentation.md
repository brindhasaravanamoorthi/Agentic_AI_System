## 1. Project Overview: The "Digital Boardroom"

The project, code-named **[Name you wish ?] or "OmniAgent SQL,"** is a multi-agent orchestration system that allows a business owner to manage their entire operation via a single chat interface. Unlike traditional dashboards that require you to look for problems, these agents **hunt for problems** and bring the solution to you.

### Why It’s Better:

- **Proactive vs. Reactive:** Traditional BI waits for you to check the graph. OmniAgent pings you when the graph looks "wrong."
- **Local & Private:** Using **Ollama** ensures that sensitive SQL data (revenue, customer names) never leaves the local server.
- **Action-Oriented:** It doesn't just say "Sales are down"; it drafts a customer apology email and calculates the discount budget.

---

## 2. User Storyboard: "The Monday Morning Rescue"

- **Scene 1:** It's 8:00 AM. The **Warden Agent** detects that "Product A" is selling 3x faster than usual due to a viral social post.
- **Scene 2:** The **Warden** pings the **Finance Agent** internally to check if there is enough cash to double the order. The **Finance Agent** confirms but warns that it will tighten the budget for next week.
- **Scene 3:** The user receives a **Telegram notification**: _"Urgent: Product A is trending. I've prepared a restock order for 500 units. Cost: ₹25,000. Approve?"_
- **Scene 4:** The user taps **"Approve"** on their phone while having coffee.
- **Scene 5:** The **Executive Agent** updates the SQL database and sends a confirmation: _"Order placed. Warehouse notified."_

---

## 3. System Flowchart

The flowchart below describes the **Human-in-the-Loop (HITL)** logic.

---

## 4. The Interfaces: Telegram & Web Chat

### **A. Telegram Interface (The "Mobile Commander")**

Telegram acts as the **Alert & Approval** hub.

- **How it works:** You use the `python-telegram-bot` library. When the agents reach a "Consensus," the Executive Agent sends a message with **Inline Action Buttons** (e.g., [Approve] [Edit] [Reject]).
- **Why Telegram?** It has the best API for "Bot Buttons" and doesn't require a complex mobile app build.

### **B. Web Chat (The "Deep Dive Dashboard")**

The Web interface (built with **Streamlit** or **Chainlit**) is for detailed analysis.

- **How it works:** It displays the **"Internal Thought Trace."** The user can see the actual SQL queries the Architect Agent ran and the "debate" between the Finance and Warden agents.
- **Why Web?** It provides space for tables, graphs, and long-form reports that are hard to read on a phone.

---

## 5. Integration Roadmap (V1 to V2)

### **V1: The SQL Core (Current)**

- **Connection:** The user provides a Database URI (e.g., `postgresql://user:pass@localhost:5432/biz_db`).
- **Agent Capability:** Agents use **SQLAlchemy** to read schemas and perform "Text-to-SQL" queries safely.

### **V2: E-commerce Connectors**

- **Shopify/WooCommerce:** Instead of raw SQL, agents will use **REST APIs**.
- **Mechanism:** A new "Connector Tool" is added to the **Warden Agent**. Instead of `SELECT * FROM stock`, it calls `GET /admin/api/inventory`.

---

## 6. Technical Implementation Snippet (The "Handover")

To make the agents talk internally before hitting Telegram, use a **Shared State Object**:
