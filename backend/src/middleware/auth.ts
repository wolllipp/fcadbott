import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface SessionUser {
  kind: 'coordinator' | 'student';
  id: number;
  role?: string;
  telegramUsername?: string;
  exp: number;
}

declare global {
  namespace Express { interface Request { authUser?: SessionUser } }
}

const COOKIE = 'fkp_session';
const maxAge = 7 * 24 * 60 * 60;

function secret() { return process.env.SESSION_SECRET || process.env.BOT_TOKEN || ''; }

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function setSession(res: Response, user: Omit<SessionUser, 'exp'>) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + maxAge })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
}

function parseCookie(header?: string) {
  const value = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !secret()) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser;
    return user.exp > Math.floor(Date.now() / 1000) ? user : null;
  } catch { return null; }
}

export function requireApiAuth(req: Request, res: Response, next: NextFunction) {
  const publicRequest = req.path === '/events' && req.method === 'GET'
    || req.path.startsWith('/auth/')
    || req.path.startsWith('/auth/avatar/')
    || req.path === '/bot-webhook';

  const user = parseCookie(req.headers.cookie);
  if (user) req.authUser = user;

  if (publicRequest) return next();
  if (!user) return res.status(401).json({ error: 'Требуется авторизация через Telegram' });

  const claimedIds = [req.body?.coordinatorId, req.body?.creatorId, req.body?.authorId, req.body?.userId, req.query.coordinatorId]
    .filter((value) => value !== undefined && value !== null)
    .map(Number);
  if (claimedIds.some((id) => id !== user.id)) return res.status(403).json({ error: 'Идентификатор пользователя не совпадает с сессией' });

  if (req.body && user.kind === 'coordinator') req.body.role = user.role;
  if (req.query && user.kind === 'coordinator') req.query.role = user.role as string;
  next();
}
