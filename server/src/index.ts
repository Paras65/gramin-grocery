import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/security.js';
import authRoutes from './routes/auth.routes.js';
import syncRoutes from './routes/sync.routes.js';
import tenantRoutes from './routes/tenant.routes.js';

dotenv.config();

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

