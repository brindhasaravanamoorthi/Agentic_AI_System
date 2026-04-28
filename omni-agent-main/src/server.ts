// OmniAgent Server - Express.js + TypeScript
import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { prisma } from './config/database';
import { startAgentMonitor } from './services/agentMonitor.service';
import chatRoutes from './routes/chat.routes';
import healthRoutes from './routes/health.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import returnRoutes from './routes/return.routes';
import supportRoutes from './routes/support.routes';
import simulationRoutes from './routes/simulation.routes';

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Middleware - allow AI frontend, ecom frontend, and custom FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',  // ai-frontend (Vite default)
  'http://localhost:5174',  // ecom-frontend (Vite when both run)
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/simulation', simulationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OmniAgent API',
    version: '1.0.0',
    description: 'Multi-agent orchestration system for e-commerce management',
    status: 'running',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat/message',
      products: '/api/products',
      cart: '/api/cart/:customerId',
      simulation: '/api/simulation',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected (SQLite)');

    startAgentMonitor();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║           🤖 OmniAgent Server Running             ║
╠════════════════════════════════════════════════════╣
║  Port:      ${PORT}                                    ║
║  Database:  SQLite (dev.db)                       ║
║  AI:        ${process.env.AI_PROVIDER || 'ollama'}                                    ║
╠════════════════════════════════════════════════════╣
║  Endpoints:                                       ║
║  • GET  http://localhost:${PORT}/                   ║
║  • GET  http://localhost:${PORT}/api/health         ║
║  • POST http://localhost:${PORT}/api/chat/message   ║
║  • GET  http://localhost:${PORT}/api/chat/test      ║
╚════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();
