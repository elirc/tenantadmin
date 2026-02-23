import crypto from 'crypto';
import { nanoid } from 'nanoid';

export const generateToken = (size = 48) => nanoid(size);

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
