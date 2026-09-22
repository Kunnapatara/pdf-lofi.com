/**
 * Full-Stack Server Entry Point
 * Host: 0.0.0.0, Port: 3000
 * Serves API routes first, then mounts Vite in dev or static files in production.
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './src/server/routes/authRoutes';
import { billingRouter } from './src/server/routes/billingRoutes';
import { verifyWebhookSignature, processLemonSqueezyWebhook } from './src/server/lemonSqueezy/webhooks';
import { getLemonSqueezyConfig } from './src/server/lemonSqueezy/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Capture raw body for webhook HMAC signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'PDF-LoFi SaaS Server',
      timestamp: Date.now(),
      lemonSqueezy: getLemonSqueezyConfig().mode,
    });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api', billingRouter); // allows /api/plans, /api/subscription, /api/entitlements, etc.

  // Lemon Squeezy Webhook endpoint
  app.post('/api/webhooks/lemonsqueezy', async (req: any, res) => {
    const signature = req.headers['x-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    const verification = verifyWebhookSignature(rawBody, signature);
    if (!verification.valid) {
      console.warn('Lemon Squeezy Webhook rejected:', verification.reason);
      return res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: verification.reason,
      });
    }

    const eventId =
      (req.headers['x-event-id'] as string) ||
      req.body?.meta?.webhook_id ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const result = await processLemonSqueezyWebhook(req.body, eventId);
    return res.json(result);
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PDF-LoFi] Server running at http://localhost:${PORT}`);
  });
}

startServer();
