import { assertEquals } from 'jsr:@std/assert';
import { generateRequestHash, verifyNotificationHash } from './ozow.ts';

// Ozow public test credentials
const PRIVATE_KEY = '215114531AFF7134A94C88CEEA48E';

Deno.test('generateRequestHash concatenates fields in order, lowercases, sha512s', async () => {
  const hash = await generateRequestHash(
    {
      siteCode: 'TSTSTE0001',
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: '25.01',
      transactionReference: 'ONS-TESTREF',
      bankReference: 'OnServe',
      cancelUrl: 'https://example.com/cancel',
      errorUrl: 'https://example.com/error',
      successUrl: 'https://example.com/success',
      notifyUrl: 'https://example.com/notify',
      isTest: true,
    },
    PRIVATE_KEY,
  );
  // Precomputed: sha512(lowercase("TSTSTE0001ZAZAR25.01ONS-TESTREFOnServe
  // https://example.com/cancel…https://example.com/notifytrue" + PRIVATE_KEY))
  assertEquals(
    hash,
    'aab3dedeb1d6e14b0c3343913972490c37056ec607d1343e11748b87e7ecd63d7bdb609c3cd05a2bc5f8dc138d9911205dc4986f7e446e2db0492c36870217f4',
  );
});

Deno.test('verifyNotificationHash accepts a valid notification', async () => {
  const fields = {
    SiteCode: 'TSTSTE0001',
    TransactionId: '1cd47b26-9d24-4b1d-a1b0-6b7c9e1a2f3b',
    TransactionReference: 'ONS-TESTREF',
    Amount: '25.01',
    Status: 'Complete',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: 'Test transaction completed',
    Hash: 'beea3fcf3790e12e9889e3bf5b6988c38609f6214dffd20ea16143e870256e1d8283445f21a1d5ab92677bcb5e0cde52ff48836f2c76b49833241d98e9f5074a',
  };
  assertEquals(await verifyNotificationHash(fields, PRIVATE_KEY), true);
});

Deno.test('verifyNotificationHash rejects a tampered amount', async () => {
  const fields = {
    SiteCode: 'TSTSTE0001',
    TransactionId: '1cd47b26-9d24-4b1d-a1b0-6b7c9e1a2f3b',
    TransactionReference: 'ONS-TESTREF',
    Amount: '9999.99',
    Status: 'Complete',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: 'Test transaction completed',
    Hash: 'beea3fcf3790e12e9889e3bf5b6988c38609f6214dffd20ea16143e870256e1d8283445f21a1d5ab92677bcb5e0cde52ff48836f2c76b49833241d98e9f5074a',
  };
  assertEquals(await verifyNotificationHash(fields, PRIVATE_KEY), false);
});
