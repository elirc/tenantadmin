import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';
import { env } from './config/env.js';
import { authenticateSession } from './middleware/authenticateSession.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(authenticateSession);

app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

app.use(errorHandler);
