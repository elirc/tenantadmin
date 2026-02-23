import { HttpError } from '../utils/httpError.js';

export const requirePermission = (permissionKey) => {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(new HttpError(401, 'Authentication required'));
    }

    if (!req.auth.permissions.has(permissionKey)) {
      return next(new HttpError(403, `Missing permission: ${permissionKey}`));
    }

    return next();
  };
};
