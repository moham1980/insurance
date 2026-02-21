import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '@insurance/shared';

const logger = createLogger({
  serviceName: 'api-gateway',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use(limiter);

// Correlation ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] || `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId as string);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Service discovery configuration
const services = {
  claims: { target: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3001', path: '/claims' },
  'claims-readmodel': { target: process.env.CLAIMS_READMODEL_URL || 'http://localhost:3002', path: '/rm' },
  fraud: { target: process.env.FRAUD_SERVICE_URL || 'http://localhost:3003', path: '/fraud' },
  documents: { target: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3004', path: '/documents' },
  copilot: { target: process.env.COPILOT_SERVICE_URL || 'http://localhost:3005', path: '/copilot' },
  orchestrator: { target: process.env.ORCHESTRATOR_URL || 'http://localhost:3006', path: '/orchestrations' },
  workitems: { target: process.env.ORCHESTRATOR_URL || 'http://localhost:3006', path: '/work-items' },
  regulatory: { target: process.env.REGULATORY_GATEWAY_URL || 'http://localhost:3009', path: '/reg' },
};

// Proxy middleware factory
const createServiceProxy = (serviceName: string, target: string) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path: string) => path,
    onProxyReq: (proxyReq: any, req: Request) => {
      // Forward correlation ID
      const correlationId = (req as any).correlationId;
      if (correlationId) {
        proxyReq.setHeader('X-Correlation-Id', correlationId);
      }
      logger.info(`Proxy ${serviceName}`, { path: req.path, correlationId });
    },
    onError: (err: Error, req: Request, res: Response) => {
      logger.error(`Proxy error ${serviceName}`, err, { path: req.path });
      res.status(502).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: `${serviceName} service unavailable` },
      });
    },
  });
};

// Setup routes
Object.entries(services).forEach(([name, config]) => {
  app.use(config.path, createServiceProxy(name, config.target));
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` },
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Gateway error', err, { path: req.path });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

app.listen(PORT, () => {
  logger.info('API Gateway listening', { port: PORT });
  logger.info('Services configured', { services: Object.keys(services) });
});
