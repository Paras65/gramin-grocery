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

// Security & Body Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: true, // Allow frontend from localhost or local Wi-Fi IP
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(apiLimiter);

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

