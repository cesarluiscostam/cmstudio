/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL não configurada. Defina-a no arquivo .env (ex: postgresql://user:pass@host/db?sslmode=require).'
  );
}

// Neon and most hosted Postgres providers terminate TLS with certs not in Node's default trust store.
const needsSsl = /sslmode=require|neon\.tech|supabase\.co/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
