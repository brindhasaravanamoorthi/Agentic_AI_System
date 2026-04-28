// Health Check Routes
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        aiProvider: process.env.AI_PROVIDER || 'ollama',
        ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
