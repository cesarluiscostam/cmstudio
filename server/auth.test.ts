/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword, signToken } from './auth';

describe('password hashing', () => {
  it('verifies a matching plaintext password against its hash', async () => {
    const hash = await hashPassword('admin123');
    expect(await verifyPassword('admin123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('admin123');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('never stores the password in plaintext', async () => {
    const hash = await hashPassword('admin123');
    expect(hash).not.toBe('admin123');
  });
});

describe('signToken', () => {
  it('produces a token that carries the tenant/role claims and is verifiable with JWT_SECRET', () => {
    const token = signToken({ userId: 'user-1', companyId: 'comp-1', role: 'manager' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    expect(decoded.userId).toBe('user-1');
    expect(decoded.companyId).toBe('comp-1');
    expect(decoded.role).toBe('manager');
  });

  it('rejects tokens signed with a different secret', () => {
    const token = signToken({ userId: 'user-1', companyId: 'comp-1', role: 'manager' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});
