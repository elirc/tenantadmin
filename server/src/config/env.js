import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  SESSION_COOKIE_NAME: z.string().min(1).default('saas_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15)
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  APP_BASE_URL: process.env.APP_BASE_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  MAGIC_LINK_TTL_MINUTES: process.env.MAGIC_LINK_TTL_MINUTES
});
