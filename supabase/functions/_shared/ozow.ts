// Ozow API integration: hash generation/verification and REST calls.
// Field order in hashes is mandated by Ozow — do not reorder.
// Verify request/response shapes against docs/OneAPI.yaml (see plan Task 0).

const OZOW_API_BASE = 'https://api.ozow.com';

export interface OzowPaymentRequest {
  siteCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string; // "150.00" — exactly 2 decimals
  transactionReference: string;
  bankReference: string; // max 20 chars, shows on bank statement
  cancelUrl: string;
  errorUrl: string;
  successUrl: string;
  notifyUrl: string;
  isTest: boolean;
}

async function sha512LowercaseHex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-512',
    new TextEncoder().encode(input.toLowerCase()),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRequestHash(
  req: OzowPaymentRequest,
  privateKey: string,
): Promise<string> {
  const concatenated =
    req.siteCode +
    req.countryCode +
    req.currencyCode +
    req.amount +
    req.transactionReference +
    req.bankReference +
    req.cancelUrl +
    req.errorUrl +
    req.successUrl +
    req.notifyUrl +
    String(req.isTest) +
    privateKey;
  return sha512LowercaseHex(concatenated);
}

// Ozow-mandated field order for notification/response hash verification.
const NOTIFICATION_HASH_ORDER = [
  'SiteCode',
  'TransactionId',
  'TransactionReference',
  'Amount',
  'Status',
  'Optional1',
  'Optional2',
  'Optional3',
  'Optional4',
  'Optional5',
  'CurrencyCode',
  'IsTest',
  'StatusMessage',
] as const;

export async function verifyNotificationHash(
  fields: Record<string, string>,
  privateKey: string,
): Promise<boolean> {
  const concatenated =
    NOTIFICATION_HASH_ORDER.map((k) => fields[k] ?? '').join('') + privateKey;
  const expected = await sha512LowercaseHex(concatenated);
  const received = (fields['Hash'] ?? '').toLowerCase();
  return expected === received;
}

export async function requestPaymentUrl(
  req: OzowPaymentRequest,
  privateKey: string,
  apiKey: string,
): Promise<string> {
  const hashCheck = await generateRequestHash(req, privateKey);
  const res = await fetch(`${OZOW_API_BASE}/PostPaymentRequest`, {
    method: 'POST',
    headers: {
      ApiKey: apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...req, hashCheck }),
  });
  if (!res.ok) {
    throw new Error(`Ozow PostPaymentRequest failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    paymentRequestId?: string;
    url?: string;
    errorMessage?: string | null;
  };
  if (body.errorMessage || !body.url) {
    throw new Error(`Ozow rejected payment request: ${body.errorMessage ?? 'no url returned'}`);
  }
  return body.url;
}

export async function getTransaction(
  siteCode: string,
  transactionId: string,
  apiKey: string,
): Promise<{ status: string; amount: number }> {
  const params = new URLSearchParams({ siteCode, transactionId });
  const res = await fetch(`${OZOW_API_BASE}/GetTransaction?${params}`, {
    headers: { ApiKey: apiKey, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Ozow GetTransaction failed: HTTP ${res.status}`);
  }
  const tx = (await res.json()) as { status: string; amount: number };
  return { status: tx.status, amount: tx.amount };
}
