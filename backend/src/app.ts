import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { globalErrorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found-handler';
import { requestLogger } from './common/middleware/request-logger';
import { env } from './config/env';
import { apiRouter } from './routes';

const app = express();

if (env.trustProxy) {
  app.set('trust proxy', 1);
}

const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOptions = {
  origin: env.frontendOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Type'],
};

app.use(requestLogger);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(helmet());
if (env.isProduction) {
  app.use(limiter);
}
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.get(`${env.apiPrefix}/health`, (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'meditracker-backend',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

app.use(env.apiPrefix, apiRouter);

app.use(notFoundHandler);

app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(error, req, res, next);
});

export { app };
