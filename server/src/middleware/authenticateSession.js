import { env } from '../config/env.js';
import { clearSessionCookie } from '../utils/authCookie.js';
import { buildSessionContext } from '../services/authService.js';

export const authenticateSession = async (req, res, next) => {
  const sessionToken = req.cookies?.[env.SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return next();
  }

  const context = await buildSessionContext(sessionToken);

  if (!context) {
    clearSessionCookie(res);
    return next();
  }

  req.auth = context;
  req.sessionToken = sessionToken;
  return next();
};
