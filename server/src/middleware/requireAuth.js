import { HttpError } from '../utils/httpError.js';

export const requireAuth = (req, _res, next) => {
  if (!req.auth) {
    return next(new HttpError(401, 'Authentication required'));
  }

  return next();
};
