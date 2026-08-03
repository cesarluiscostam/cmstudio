/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Client phones are stored as typed (e.g. "(11) 99999-9999", no country code) — Twilio needs E.164.
// Brazil-only assumption matches the rest of this app (pt-BR copy, R$ currency, etc).
function toE164BR(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`;
  return `+${withCountryCode}`;
}

// Never throws — a failed SMS (unconfigured Twilio, unverified trial number, etc.) must not break
// the booking flow that triggered it. Errors are logged for visibility instead.
export async function sendSms(rawPhone: string, body: string): Promise<void> {
  if (!client || !fromNumber) {
    console.warn('[sms] Twilio não configurado (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER) — SMS não enviado:', body);
    return;
  }
  try {
    await client.messages.create({ to: toE164BR(rawPhone), from: fromNumber, body });
  } catch (err) {
    console.error('[sms] Falha ao enviar SMS:', err);
  }
}
