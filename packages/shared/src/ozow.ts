/**
 * Generate Ozow SHA-512 hash.
 *
 * Algorithm (from hub.ozow.com):
 * 1. Concatenate fields in exact parameter-table order
 * 2. Append private key
 * 3. Lowercase the entire string
 * 4. SHA-512 hash (hex)
 *
 * Returns a Promise for Deno Edge Function compatibility.
 */
export async function generateOzowRequestHash(
  fields: string[],
  privateKey: string,
): Promise<string> {
  const raw = fields.join('') + privateKey;
  const lower = raw.toLowerCase();
  return sha512Hex(lower);
}

/**
 * Verify an incoming Ozow notification hash.
 *
 * Concatenation order (from hub.ozow.com):
 * SiteCode + TransactionId + TransactionReference + Amount +
 * Status + Optional1-5 + CurrencyCode + IsTest + StatusMessage
 * + PrivateKey → lowercase → SHA-512
 */
export async function verifyOzowNotificationHash(
  notification: Record<string, string>,
  privateKey: string,
): Promise<boolean> {
  const fields: string[] = [
    notification.SiteCode ?? '',
    notification.TransactionId ?? '',
    notification.TransactionReference ?? '',
    notification.Amount ?? '',
    notification.Status ?? '',
    notification.Optional1 ?? '',
    notification.Optional2 ?? '',
    notification.Optional3 ?? '',
    notification.Optional4 ?? '',
    notification.Optional5 ?? '',
    notification.CurrencyCode ?? '',
    notification.IsTest ?? '',
    notification.StatusMessage ?? '',
  ];

  const expectedHash = await generateOzowRequestHash(fields, privateKey);
  const receivedHash = (notification.Hash ?? '').toLowerCase();

  // Trim leading zeros — some SHA-512 implementations drop them
  return expectedHash.replace(/^0+/, '') === receivedHash.replace(/^0+/, '');
}

/** SHA-512 hex digest using Web Crypto API (Deno-compatible) */
async function sha512Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
