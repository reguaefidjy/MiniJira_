import { RequestHandler, Response } from 'express';
import { createHash, randomUUID } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../../db';
import { users, refreshTokens } from '../../db/schema';
import { exchangeCode } from '../../lib/oauth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import type { JwtPayload } from '../../types';

const IS_PROD = process.env.NODE_ENV === 'production';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'strict',
    maxAge:   15 * 60 * 1000,
    path:     '/api',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'strict',
    maxAge:   REFRESH_TTL_MS,
    path:     '/api/auth/refresh',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token',  { path: '/api' });
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
  await db.insert(refreshTokens).values({
    id:         randomUUID(),
    user_id:    userId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
  });
}

export const callback: RequestHandler = async (req, res, next) => {
  try {
    const { code } = req.body as { code?: unknown };
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'invalid_input', message: 'code is required' });
      return;
    }

    const profile = await exchangeCode(code);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email));

    if (!user) {
      res.status(403).json({ error: 'forbidden', message: 'User is not provisioned in the system' });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({ error: 'forbidden', message: 'User account is deactivated' });
      return;
    }

    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };

    const accessToken  = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    await storeRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.sub));

    if (!user || !user.is_active) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }

    res.json({
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }

    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
      return;
    }

    const now = new Date().toISOString();
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token_hash, hashToken(token)),
        gt(refreshTokens.expires_at, now),
      ));

    if (!stored) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
      return;
    }

    // Rotar: eliminar el token usado y emitir uno nuevo
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub:   payload.sub,
      email: payload.email,
      role:  payload.role,
    };

    const newAccessToken  = signAccessToken(jwtPayload);
    const newRefreshToken = signRefreshToken(jwtPayload);

    await storeRefreshToken(stored.user_id, newRefreshToken);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({});
  } catch (err) {
    next(err);
  }
};

export const devLogin: RequestHandler = async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'not_found', message: 'Not found' });
    return;
  }
  try {
    const { email } = req.body as { email?: unknown };
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'invalid_input', message: 'email is required' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !user.is_active) {
      res.status(403).json({ error: 'forbidden', message: 'User not found or inactive' });
      return;
    }

    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };

    const accessToken  = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    await storeRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      id:         user.id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (token) {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token_hash, hashToken(token)));
    }

    clearAuthCookies(res);
    res.status(200).json({});
  } catch (err) {
    next(err);
  }
};
