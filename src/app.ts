import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Router } from 'express';
import { env } from './config/env.js';
import apiRoutes from './interface/http/routes.js';
import { requireAuth } from './api/auth.middleware.js';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const protectedApiRouter = Router();
protectedApiRouter.use(requireAuth);    

protectedApiRouter.use('/', apiRoutes); 

app.use('/api', protectedApiRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error Crítico:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;