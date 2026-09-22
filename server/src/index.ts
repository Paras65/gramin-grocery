import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/security.js';
import authRoutes from './routes/auth.routes.js';
import syncRoutes from './routes/sync.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import adminRoutes from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../dist');

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Trust reverse proxy (Render, Cloudflare, Heroku) for accurate IP resolution in rate limiters
app.set('trust proxy', 1);

// SOC 2 / OWASP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// SOC 2 CC6.1 Bounded CORS Policy (No wildcard origin reflection in production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile PWA apps, Postman/curl) or during non-production
      if (!origin || !isProd) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error('CORS Policy: Request origin is not authorized.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(apiLimiter);

// Service Worker fresh updates: Never cache sw.js on the server
app.use('/sw.js', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Gramin Kirana Multi-Tenant Cloud Engine',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/admin', adminRoutes);

// Bounded API 404 handler - Prevents HTML fallthrough on missing API endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Production Static Frontend Serving (Unified Deployment on Render)
app.use(express.static(clientDistPath));

app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // If API route or health, do not serve index.html
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Gramin Kirana Multi-Tenant Server active on http://localhost:${PORT}`);
    console.log(`🔒 Zero-Trust Multi-Tenancy & Compound Indexing Enabled`);
  });
}

startServer();

