import { env } from '../config/env.js';

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/'
};

export const setSessionCookie = (res, token) => {
  const maxAge = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    ...baseOptions,
    maxAge
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(env.SESSION_COOKIE_NAME, baseOptions);
};
