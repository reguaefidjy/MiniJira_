import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

// TODO: implement signAccessToken, signRefreshToken, verifyAccessToken
export const signAccessToken  = (_payload: Omit<JwtPayload, 'iat' | 'exp'>): string => { throw new Error('Not implemented'); };
export const verifyAccessToken = (_token: string): JwtPayload => { throw new Error('Not implemented'); };
