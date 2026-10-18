import path from 'node:path';
import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { pool } from './db/pool';
import authRoutes from './routes/auth';
import shopRoutes from './routes/shops';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import moduleRoutes from './routes/modules';
import employeeRoutes from './routes/employees';
import auditRoutes from './routes/auditLogs';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import { errorHandler } from './middleware/errorHandler';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());

const allowedOrigins = env.CORS_ORIGIN.split(',').map((x) => x.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));

// Health check handler with DB connectivity check
const healthHandler = async (_req: express.Request, res: express.Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'API is healthy',
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service degraded: Database unavailable',
      data: {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

app.get(['/docs/openapi.json', '/api/v1/docs/openapi.json'], (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../openapi.json'));
});

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Build the REST v1 router
const v1Router = Router();
v1Router.use('/auth', authLimiter, authRoutes);
v1Router.use('/shops', shopRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/roles', roleRoutes);
v1Router.use('/permissions', permissionRoutes);
v1Router.use('/modules', moduleRoutes);
v1Router.use('/employees', employeeRoutes);
v1Router.use('/audit-logs', auditRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/categories', categoryRoutes);

// Mount under standard /api/v1 and alias to /api for existing frontend compatibility
app.use('/api/v1', v1Router);
app.use('/api', v1Router);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);