import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateOzowRequestHash,
  verifyOzowNotificationHash,
} from './ozow';

describe('Ozow hashing functions', () => {
  describe('generateOzowRequestHash', () => {
    it('produces valid SHA-512 hash for typical request fields', async () => {
      const fields = [
        'ONSERVE001',     // siteCode
        'ZA',             // countryCode
        'ZAR',            // currencyCode
        '502.43',         // amount
        'ONSERVE-abc1234', // transactionReference
        'OS-abc12345678', // bankReference
        'booking-123',    // optional1
        'payment-456',    // optional2
        'provider-789',   // optional3
        'customer-012',   // optional4
        '',               // optional5
        'http://localhost/cancel',
        'http://localhost/error',
        'http://localhost/success',
        'http://localhost/notify',
        'true',           // isTest
      ];
      const privateKey = 'test-private-key-12345';

      const hash = await generateOzowRequestHash(fields, privateKey);

      // SHA-512 produces 128-character hex string
      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('produces consistent hash for identical inputs', async () => {
      const fields = ['field1', 'field2', 'field3'];
      const privateKey = 'secret-key';

      const hash1 = await generateOzowRequestHash(fields, privateKey);
      const hash2 = await generateOzowRequestHash(fields, privateKey);

      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different field values', async () => {
      const fieldsA = ['fieldA', 'field2', 'field3'];
      const fieldsB = ['fieldB', 'field2', 'field3'];
      const privateKey = 'secret-key';

      const hashA = await generateOzowRequestHash(fieldsA, privateKey);
      const hashB = await generateOzowRequestHash(fieldsB, privateKey);

      expect(hashA).not.toBe(hashB);
    });

    it('produces different hash for different private keys', async () => {
      const fields = ['field1', 'field2', 'field3'];
      const keyA = 'secret-key-a';
      const keyB = 'secret-key-b';

      const hashA = await generateOzowRequestHash(fields, keyA);
      const hashB = await generateOzowRequestHash(fields, keyB);

      expect(hashA).not.toBe(hashB);
    });

    it('is case-insensitive (lowercases input)', async () => {
      const fieldsLower = ['field1', 'field2', 'field3'];
      const fieldsUpper = ['FIELD1', 'FIELD2', 'FIELD3'];
      const privateKey = 'SECRET-KEY';

      const hashLower = await generateOzowRequestHash(fieldsLower, privateKey);
      const hashUpper = await generateOzowRequestHash(fieldsUpper, privateKey);

      // Both should produce the same hash since they're lowercased
      expect(hashLower).toBe(hashUpper);
    });

    it('handles empty field arrays', async () => {
      const fields: string[] = [];
      const privateKey = 'secret-key';

      const hash = await generateOzowRequestHash(fields, privateKey);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('handles special characters in fields', async () => {
      const fields = [
        'field@with#special$chars',
        'field-with-dashes',
        'field_with_underscores',
        'field.with.dots',
        'field/with/slashes',
      ];
      const privateKey = 'secret!@#$%key';

      const hash = await generateOzowRequestHash(fields, privateKey);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });

    it('handles very long field values', async () => {
      const longString = 'a'.repeat(10000);
      const fields = ['field1', longString, 'field3'];
      const privateKey = 'secret-key';

      const hash = await generateOzowRequestHash(fields, privateKey);

      expect(hash).toMatch(/^[0-9a-f]{128}$/);
    });
  });

  describe('verifyOzowNotificationHash', () => {
    const privateKey = 'test-private-key-12345';

    it('validates correct hash', async () => {
      // Create a valid notification and hash
      const notification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      // Generate the correct hash
      const fields = [
        notification.SiteCode,
        notification.TransactionId,
        notification.TransactionReference,
        notification.Amount,
        notification.Status,
        notification.Optional1 ?? '',
        notification.Optional2 ?? '',
        notification.Optional3 ?? '',
        notification.Optional4 ?? '',
        notification.Optional5 ?? '',
        notification.CurrencyCode,
        notification.IsTest,
        notification.StatusMessage,
      ];
      const correctHash = await generateOzowRequestHash(fields, privateKey);

      const notificationWithHash = {
        ...notification,
        Hash: correctHash,
      };

      const result = await verifyOzowNotificationHash(notificationWithHash, privateKey);

      expect(result).toBe(true);
    });

    it('rejects tampered hash', async () => {
      const notification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
        Hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
              'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // 128 a's and b's
      };

      const result = await verifyOzowNotificationHash(notification, privateKey);

      expect(result).toBe(false);
    });

    it('rejects notification with field modified after hash', async () => {
      // Create initial notification and hash
      const baseNotification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      const fields = [
        baseNotification.SiteCode,
        baseNotification.TransactionId,
        baseNotification.TransactionReference,
        baseNotification.Amount,
        baseNotification.Status,
        baseNotification.Optional1 ?? '',
        baseNotification.Optional2 ?? '',
        baseNotification.Optional3 ?? '',
        baseNotification.Optional4 ?? '',
        baseNotification.Optional5 ?? '',
        baseNotification.CurrencyCode,
        baseNotification.IsTest,
        baseNotification.StatusMessage,
      ];
      const hash = await generateOzowRequestHash(fields, privateKey);

      // Now tamper with amount
      const tamperedNotification = {
        ...baseNotification,
        Amount: '1000.00', // Changed!
        Hash: hash,
      };

      const result = await verifyOzowNotificationHash(tamperedNotification, privateKey);

      expect(result).toBe(false);
    });

    it('rejects notification with status modified after hash', async () => {
      const baseNotification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      const fields = [
        baseNotification.SiteCode,
        baseNotification.TransactionId,
        baseNotification.TransactionReference,
        baseNotification.Amount,
        baseNotification.Status,
        baseNotification.Optional1 ?? '',
        baseNotification.Optional2 ?? '',
        baseNotification.Optional3 ?? '',
        baseNotification.Optional4 ?? '',
        baseNotification.Optional5 ?? '',
        baseNotification.CurrencyCode,
        baseNotification.IsTest,
        baseNotification.StatusMessage,
      ];
      const hash = await generateOzowRequestHash(fields, privateKey);

      const tamperedNotification = {
        ...baseNotification,
        Status: 'Error', // Changed!
        Hash: hash,
      };

      const result = await verifyOzowNotificationHash(tamperedNotification, privateKey);

      expect(result).toBe(false);
    });

    it('handles missing optional fields gracefully', async () => {
      const notification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        // Missing Optional1-5
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      const fields = [
        notification.SiteCode,
        notification.TransactionId,
        notification.TransactionReference,
        notification.Amount,
        notification.Status,
        '', // Optional1
        '', // Optional2
        '', // Optional3
        '', // Optional4
        '', // Optional5
        notification.CurrencyCode,
        notification.IsTest,
        notification.StatusMessage,
      ];
      const hash = await generateOzowRequestHash(fields, privateKey);

      const notificationWithHash = {
        ...notification,
        Hash: hash,
      };

      const result = await verifyOzowNotificationHash(notificationWithHash, privateKey);

      expect(result).toBe(true);
    });

    it('is case-insensitive for hash comparison', async () => {
      const notification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      const fields = [
        notification.SiteCode,
        notification.TransactionId,
        notification.TransactionReference,
        notification.Amount,
        notification.Status,
        notification.Optional1 ?? '',
        notification.Optional2 ?? '',
        notification.Optional3 ?? '',
        notification.Optional4 ?? '',
        notification.Optional5 ?? '',
        notification.CurrencyCode,
        notification.IsTest,
        notification.StatusMessage,
      ];
      const correctHash = await generateOzowRequestHash(fields, privateKey);

      // Test with uppercase hash
      const notificationWithUpperHash = {
        ...notification,
        Hash: correctHash.toUpperCase(),
      };

      const resultUpper = await verifyOzowNotificationHash(notificationWithUpperHash, privateKey);

      // Test with lowercase hash
      const notificationWithLowerHash = {
        ...notification,
        Hash: correctHash.toLowerCase(),
      };

      const resultLower = await verifyOzowNotificationHash(notificationWithLowerHash, privateKey);

      expect(resultUpper).toBe(true);
      expect(resultLower).toBe(true);
    });

    it('handles leading-zero edge case in hash', async () => {
      // This tests that hashes starting with zeros are handled correctly
      const notification = {
        SiteCode: 'TEST0001', // Designed to potentially produce leading zeros
        TransactionId: '0txn-000',
        TransactionReference: '000REF',
        Amount: '001.00',
        Status: 'Complete',
        Optional1: '',
        Optional2: '',
        Optional3: '',
        Optional4: '',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: '',
      };

      const fields = [
        notification.SiteCode,
        notification.TransactionId,
        notification.TransactionReference,
        notification.Amount,
        notification.Status,
        notification.Optional1 ?? '',
        notification.Optional2 ?? '',
        notification.Optional3 ?? '',
        notification.Optional4 ?? '',
        notification.Optional5 ?? '',
        notification.CurrencyCode,
        notification.IsTest,
        notification.StatusMessage,
      ];
      const hash = await generateOzowRequestHash(fields, privateKey);

      const notificationWithHash = {
        ...notification,
        Hash: hash,
      };

      const result = await verifyOzowNotificationHash(notificationWithHash, privateKey);

      expect(result).toBe(true);
    });

    it('rejects with wrong private key', async () => {
      const notification = {
        SiteCode: 'ONSERVE001',
        TransactionId: 'txn-123',
        TransactionReference: 'ONSERVE-abc1234',
        Amount: '502.43',
        Status: 'Complete',
        Optional1: 'booking-123',
        Optional2: 'payment-456',
        Optional3: 'provider-789',
        Optional4: 'customer-012',
        Optional5: '',
        CurrencyCode: 'ZAR',
        IsTest: 'true',
        StatusMessage: 'Payment completed successfully',
      };

      const fields = [
        notification.SiteCode,
        notification.TransactionId,
        notification.TransactionReference,
        notification.Amount,
        notification.Status,
        notification.Optional1 ?? '',
        notification.Optional2 ?? '',
        notification.Optional3 ?? '',
        notification.Optional4 ?? '',
        notification.Optional5 ?? '',
        notification.CurrencyCode,
        notification.IsTest,
        notification.StatusMessage,
      ];
      // Hash with original key
      const hash = await generateOzowRequestHash(fields, privateKey);

      const notificationWithHash = {
        ...notification,
        Hash: hash,
      };

      // Verify with wrong key
      const result = await verifyOzowNotificationHash(notificationWithHash, 'wrong-key');

      expect(result).toBe(false);
    });

    it('handles all Ozow status values', async () => {
      const statuses = ['Pending', 'Complete', 'Error', 'Cancelled', 'Abandoned'];

      for (const status of statuses) {
        const notification = {
          SiteCode: 'ONSERVE001',
          TransactionId: 'txn-123',
          TransactionReference: 'ONSERVE-abc1234',
          Amount: '502.43',
          Status: status,
          Optional1: 'booking-123',
          Optional2: 'payment-456',
          Optional3: 'provider-789',
          Optional4: 'customer-012',
          Optional5: '',
          CurrencyCode: 'ZAR',
          IsTest: 'true',
          StatusMessage: `Status: ${status}`,
        };

        const fields = [
          notification.SiteCode,
          notification.TransactionId,
          notification.TransactionReference,
          notification.Amount,
          notification.Status,
          notification.Optional1 ?? '',
          notification.Optional2 ?? '',
          notification.Optional3 ?? '',
          notification.Optional4 ?? '',
          notification.Optional5 ?? '',
          notification.CurrencyCode,
          notification.IsTest,
          notification.StatusMessage,
        ];
        const hash = await generateOzowRequestHash(fields, privateKey);

        const notificationWithHash = {
          ...notification,
          Hash: hash,
        };

        const result = await verifyOzowNotificationHash(notificationWithHash, privateKey);

        expect(result).toBe(true);
      }
    });
  });
});
