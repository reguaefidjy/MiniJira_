import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

function requireSecret(name: string, value: string | undefined, forbidden: string[]): string {
  if (!value || forbidden.includes(value)) {
    throw new Error(`${name} env var is missing or uses an insecure default value`);
  }
  return value;
}

const ACCESS_SECRET  = requireSecret('JWT_ACCESS_SECRET',  process.env.JWT_ACCESS_SECRET,  ['change-me-access']);
const REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, ['change-me-refresh']);
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export const signAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP as jwt.SignOptions['expiresIn'], algorithm: 'HS256' });

export const signRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP as jwt.SignOptions['expiresIn'], algorithm: 'HS256' });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload;
