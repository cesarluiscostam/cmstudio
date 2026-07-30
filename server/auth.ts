/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina-o no arquivo .env.');
}

export interface AuthPayload {
  userId: string;
  companyId: string;
  role: User['role'];
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Strips the password hash before a User object is ever sent to a client.
export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...rest } = user;
  return rest;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Verifies the bearer token and attaches the trusted tenant/user identity to the request.
// Downstream handlers must read req.auth instead of client-supplied headers.
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  try {
    req.auth = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

export function requireRole(...roles: User['role'][]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado.' });
    }
    next();
  };
}
